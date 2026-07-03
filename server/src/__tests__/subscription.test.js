const supertest = require("supertest");
const mongoose = require("mongoose");
const User = require("../models/User");
const SubscriptionTier = require("../models/SubscriptionTier");
const Subscription = require("../models/Subscription");
const Transaction = require("../models/Transaction");
const GiftCode = require("../models/GiftCode");
const Coupon = require("../models/Coupon");
const env = require("../config/env");

const app = require("../app");
const request = supertest(app);

const mergeCookies = (...parts) => {
  const map = new Map();
  for (const part of parts) {
    if (!part) continue;
    for (const pair of part.split(";")) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const name = trimmed.slice(0, eqIdx);
      map.set(name, trimmed);
    }
  }
  return Array.from(map.values()).join("; ");
};

describe("Subscription & Payment API", () => {
  let user;
  let teacher;
  let csrfToken;
  let cookieString;
  let plusTier;
  let proTier;

  const getCsrf = async () => {
    const res = await request.get("/api/csrf-token");
    const csrf = res.body.data.csrfToken;
    const cookies = res.headers["set-cookie"] || [];
    const cookieStr = cookies.map((c) => c.split(";")[0]).join("; ");
    return { csrfToken: csrf, cookieStr };
  };

  beforeEach(async () => {
    // Clear DB
    await User.deleteMany({});
    await SubscriptionTier.deleteMany({});
    await Subscription.deleteMany({});
    await Transaction.deleteMany({});
    await GiftCode.deleteMany({});
    await Coupon.deleteMany({});

    // Seed tiers
    plusTier = await SubscriptionTier.create({
      name: "Student Plus",
      slug: "student-plus",
      priceMonthly: 49000,
      priceYearly: 490000,
      features: {
        dailyAIQueries: 20,
        premiumLessons: true,
        customLessonRequest: false,
        bonusXPMultiplier: 1.5,
      },
      isActive: true,
      displayOrder: 1,
    });

    proTier = await SubscriptionTier.create({
      name: "Student Pro",
      slug: "student-pro",
      priceMonthly: 99000,
      priceYearly: 990000,
      features: {
        dailyAIQueries: -1,
        premiumLessons: true,
        customLessonRequest: true,
        bonusXPMultiplier: 2.0,
      },
      isActive: true,
      displayOrder: 2,
    });

    // Create user & teacher
    user = await User.create({
      name: "Student User",
      email: "student@example.com",
      password: "Password@123",
      role: "student",
      isEmailVerified: true,
    });

    teacher = await User.create({
      name: "Teacher User",
      email: "teacher@example.com",
      password: "Password@123",
      role: "teacher",
      isEmailVerified: true,
    });

    // Login user
    const csrf = await getCsrf();
    csrfToken = csrf.csrfToken;
    const loginRes = await request
      .post("/api/auth/login")
      .set("x-csrf-token", csrf.csrfToken)
      .set("Cookie", csrf.cookieStr)
      .send({ email: "student@example.com", password: "Password@123" });

    const authCookies = loginRes.headers["set-cookie"] || [];
    const authCookieStr = authCookies.map((c) => c.split(";")[0]).join("; ");
    
    // Merge CSRF cookies with auth cookies
    cookieString = mergeCookies(csrf.cookieStr, authCookieStr);
  });

  describe("GET /api/subscriptions/tiers", () => {
    it("should return all active subscription tiers", async () => {
      const res = await request.get("/api/subscriptions/tiers");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].slug).toBe("student-plus");
    });
  });

  describe("POST /api/subscriptions/purchase", () => {
    it("should create a transaction in Pending status for SePay payment method", async () => {
      const res = await request
        .post("/api/subscriptions/purchase")
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookieString)
        .send({
          tierId: plusTier._id,
          billingCycle: "monthly",
          paymentMethod: "sepay",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.status).toBe("Pending");

      const tx = await Transaction.findOne({ transactionId: res.body.data.transaction.transactionId });
      expect(tx).toBeDefined();
      expect(tx.status).toBe("Pending");
    });

    it("should support purchasing using tier slug instead of ObjectId", async () => {
      const res = await request
        .post("/api/subscriptions/purchase")
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookieString)
        .send({
          tierId: "student-plus",
          billingCycle: "monthly",
          paymentMethod: "sepay",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.status).toBe("Pending");
      expect(res.body.data.transaction.tierId.toString()).toBe(plusTier._id.toString());
    });

    it("should complete transaction immediately for demo payment method", async () => {
      const res = await request
        .post("/api/subscriptions/purchase")
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookieString)
        .send({
          tierId: plusTier._id,
          billingCycle: "monthly",
          paymentMethod: "demo",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.status).toBe("Completed");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.subscriptionTier).toBe("Student Plus");
      expect(updatedUser.subscriptionExpiry).toBeDefined();
    });
  });

  describe("POST /api/subscriptions/sepay-webhook", () => {
    it("should successfully activate subscription when webhook matches transaction", async () => {
      const tx = await Transaction.create({
        buyerId: user._id,
        recipientId: user._id,
        tierId: plusTier._id,
        amount: 49000,
        originalAmount: 49000,
        billingCycle: "monthly",
        paymentMethod: "sepay",
        status: "Pending",
      });

      const payload = {
        gateway: "MBBank",
        transactionDate: "2026-07-03 20:32:00",
        accountNumber: "0002052943605",
        content: `BankAPINotify ${tx.transactionId}`,
        transferType: "in",
        transferAmount: 49000,
        referenceCode: "FT26184104814495",
        id: 66347535,
      };

      const res = await request
        .post("/api/subscriptions/sepay-webhook")
        .set("Authorization", `Bearer ${env.sepayWebhookToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbTx = await Transaction.findById(tx._id);
      expect(dbTx.status).toBe("Completed");

      const dbUser = await User.findById(user._id);
      expect(dbUser.subscriptionTier).toBe("Student Plus");
    });

    it("should atomically prevent double activation when webhook is delivered concurrently", async () => {
      const tx = await Transaction.create({
        buyerId: user._id,
        recipientId: user._id,
        tierId: plusTier._id,
        amount: 49000,
        originalAmount: 49000,
        billingCycle: "monthly",
        paymentMethod: "sepay",
        status: "Pending",
      });

      const payload = {
        gateway: "MBBank",
        transactionDate: "2026-07-03 20:32:00",
        accountNumber: "0002052943605",
        content: `BankAPINotify ${tx.transactionId}`,
        transferType: "in",
        transferAmount: 49000,
        referenceCode: "FT26184104814495",
        id: 66347535,
      };

      // Send 2 requests concurrently
      const [res1, res2] = await Promise.all([
        request
          .post("/api/subscriptions/sepay-webhook")
          .set("Authorization", `Bearer ${env.sepayWebhookToken}`)
          .send(payload),
        request
          .post("/api/subscriptions/sepay-webhook")
          .set("Authorization", `Bearer ${env.sepayWebhookToken}`)
          .send(payload),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // One should return Completed success, and the other should return already processed
      const messages = [res1.body.message, res2.body.message];
      expect(messages).toContain("Processed successfully");
      expect(messages).toContain("Transaction already processed or state modified");

      // Verify DB transaction is Completed
      const dbTx = await Transaction.findById(tx._id);
      expect(dbTx.status).toBe("Completed");

      // Verify only 1 Subscription was created
      const subscriptions = await Subscription.find({ userId: user._id });
      expect(subscriptions.length).toBe(1);
    });
  });
});
