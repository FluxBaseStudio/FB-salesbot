import assert from 'node:assert/strict';

function globalLimitDecision(snapshot) {
  if (snapshot.limits.maxFailedQueue && snapshot.failedQueue >= snapshot.limits.maxFailedQueue) return 'APP_MAX_FAILED_QUEUE';
  if (snapshot.limits.maxPendingQueue && snapshot.pendingQueue > snapshot.limits.maxPendingQueue) return 'APP_MAX_PENDING_QUEUE';
  if (snapshot.limits.maxDailyEmails && snapshot.sentToday >= snapshot.limits.maxDailyEmails) return 'APP_MAX_DAILY_EMAILS';
  if (snapshot.limits.maxMonthlyEmails && snapshot.sentThisMonth >= snapshot.limits.maxMonthlyEmails) return 'APP_MAX_MONTHLY_EMAILS';
  return null;
}

function reputationDecision(snapshot, thresholds = { minSample: 20, maxBounceRate: 8, maxSpamRate: 1, maxFailedRate: 25 }) {
  if (snapshot.sent < thresholds.minSample) return null;
  const problems = [];
  if (snapshot.bounceRate >= thresholds.maxBounceRate) problems.push('bounce');
  if (snapshot.spamRate >= thresholds.maxSpamRate) problems.push('spam');
  if (snapshot.failedRate >= thresholds.maxFailedRate) problems.push('failed');
  return problems.length ? problems : null;
}

assert.equal(globalLimitDecision({ sentToday: 100, sentThisMonth: 100, pendingQueue: 1, failedQueue: 0, limits: { maxDailyEmails: 100 } }), 'APP_MAX_DAILY_EMAILS');
assert.equal(globalLimitDecision({ sentToday: 10, sentThisMonth: 1000, pendingQueue: 1, failedQueue: 0, limits: { maxMonthlyEmails: 1000 } }), 'APP_MAX_MONTHLY_EMAILS');
assert.equal(globalLimitDecision({ sentToday: 10, sentThisMonth: 10, pendingQueue: 101, failedQueue: 0, limits: { maxPendingQueue: 100 } }), 'APP_MAX_PENDING_QUEUE');
assert.equal(globalLimitDecision({ sentToday: 10, sentThisMonth: 10, pendingQueue: 1, failedQueue: 5, limits: { maxFailedQueue: 5 } }), 'APP_MAX_FAILED_QUEUE');
assert.equal(globalLimitDecision({ sentToday: 10, sentThisMonth: 10, pendingQueue: 1, failedQueue: 0, limits: { maxDailyEmails: 100 } }), null);

assert.equal(reputationDecision({ sent: 5, bounceRate: 50, spamRate: 50, failedRate: 50 }), null);
assert.deepEqual(reputationDecision({ sent: 100, bounceRate: 9, spamRate: 0, failedRate: 0 }), ['bounce']);
assert.deepEqual(reputationDecision({ sent: 100, bounceRate: 1, spamRate: 2, failedRate: 30 }), ['spam', 'failed']);
assert.equal(reputationDecision({ sent: 100, bounceRate: 1, spamRate: 0, failedRate: 5 }), null);

console.log('production-guards tests passed');
