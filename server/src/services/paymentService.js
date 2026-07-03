/**
 * Payment Service — Adapter pattern for payment gateways.
 * Currently uses Demo mode (instant success).
 * Replace DemoPaymentAdapter with PayOS/VNPay adapter when ready.
 */
const crypto = require("crypto");

class DemoPaymentAdapter {
  async createPayment(amount, description, returnUrl, metadata = {}) {
    const ref = `DEMO-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    return {
      success: true,
      paymentUrl: `${returnUrl}?status=success&ref=${ref}`,
      ref,
      method: "demo",
    };
  }

  async verifyPayment(ref) {
    // Demo mode always returns success
    return { verified: true, ref };
  }
}

// Future: class PayOSPaymentAdapter { ... }
// Future: class VNPayPaymentAdapter { ... }

const getPaymentAdapter = () => {
  // When payment gateway keys are configured, switch adapter here
  // const env = require("../config/env");
  // if (env.payosClientId) return new PayOSPaymentAdapter();
  return new DemoPaymentAdapter();
};

module.exports = { getPaymentAdapter };
