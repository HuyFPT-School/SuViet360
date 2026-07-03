const { expireSubscriptions, sendExpirationReminders } = require("../services/subscriptionService");

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const runSubscriptionJobs = async () => {
  try {
    const expiredCount = await expireSubscriptions();
    if (expiredCount > 0) {
      console.log(`[SubscriptionCron] Expired ${expiredCount} subscriptions`);
    }

    await sendExpirationReminders();
  } catch (err) {
    console.error("[SubscriptionCron] Error:", err.message);
  }
};

// Run immediately on startup, then every hour
runSubscriptionJobs();
setInterval(runSubscriptionJobs, INTERVAL_MS);

console.log("[SubscriptionCron] Subscription cron job started (runs every 1 hour)");

module.exports = { runSubscriptionJobs };
