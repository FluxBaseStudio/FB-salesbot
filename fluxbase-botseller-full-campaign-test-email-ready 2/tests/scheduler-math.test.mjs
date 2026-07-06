import assert from 'node:assert/strict';

function calculate(input) {
  const start = Number(input.workdayStartHour);
  const end = Number(input.workdayEndHour);
  const dailyLimit = Number(input.dailyLimit);
  const activeItems = Number(input.activeSchedulerItems);
  const cronTickSeconds = Number(input.cronTickSeconds || 60);
  if (end <= start) throw new Error('Godzina końca musi być większa od startu i w zakresie 1-24.');
  const workWindowMinutes = (end - start) * 60;
  const intervalSeconds = Math.floor((workWindowMinutes * 60) / dailyLimit);
  const maxStableCampaigns = Math.max(Math.floor(intervalSeconds / cronTickSeconds), 1);
  const staggerSeconds = Math.floor(intervalSeconds / activeItems);
  return { workWindowMinutes, intervalMinutes: Math.round(intervalSeconds / 60), intervalSeconds, staggerSeconds, maxStableCampaigns, stable: staggerSeconds >= cronTickSeconds };
}

assert.deepEqual(calculate({ workdayStartHour: 6, workdayEndHour: 16, dailyLimit: 50, activeSchedulerItems: 1 }).intervalMinutes, 12);
assert.deepEqual(calculate({ workdayStartHour: 6, workdayEndHour: 16, dailyLimit: 40, activeSchedulerItems: 1 }).intervalMinutes, 15);
assert.equal(calculate({ workdayStartHour: 6, workdayEndHour: 16, dailyLimit: 50, activeSchedulerItems: 12 }).stable, true);
assert.equal(calculate({ workdayStartHour: 6, workdayEndHour: 16, dailyLimit: 50, activeSchedulerItems: 13 }).stable, false);
assert.equal(calculate({ workdayStartHour: 6, workdayEndHour: 16, dailyLimit: 50, activeSchedulerItems: 13 }).maxStableCampaigns, 12);
assert.throws(() => calculate({ workdayStartHour: 16, workdayEndHour: 6, dailyLimit: 50, activeSchedulerItems: 1 }), /Godzina końca/);
console.log('scheduler-math tests passed');
