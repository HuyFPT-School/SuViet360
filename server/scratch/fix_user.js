const mongoose = require('mongoose');
require('../src/models/User');
require('../src/models/Subscription');
require('../src/models/SubscriptionTier');

mongoose.connect('mongodb+srv://huylmnse181744_db_user:HvqaBt0DKPNwl2Ac@milkshop.zkxc7w1.mongodb.net/SuViet360?appName=SuViet360').then(async () => {
  const userId = '6a34f49e512c3d0cd2e4183c';
  const tierId = '6a477c3aa3ac385d69cf838d';
  
  // Calculate end date
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  // Expire existing subscriptions
  await mongoose.model('Subscription').updateMany(
    { userId, status: 'Active' },
    { status: 'Expired' }
  );

  // Create new active subscription
  const sub = await mongoose.model('Subscription').create({
    userId,
    tierId,
    status: 'Active',
    startDate: now,
    endDate,
    billingCycle: 'monthly',
  });
  console.log('Subscription created:', sub);

  // Update user model
  const user = await mongoose.model('User').findByIdAndUpdate(userId, {
    subscriptionTier: 'Student Plus',
    subscriptionExpiry: endDate,
  }, { new: true });
  console.log('User updated:', user);

  mongoose.disconnect();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
