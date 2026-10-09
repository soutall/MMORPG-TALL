'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const npcSchedule = require('../sistemas/npc_schedule.js');

test('NPC sleep schedules follow Brasília time regardless of host timezone', () => {
    const zeniaSleep = { inicio: '22:00', fim: '08:00' };
    assert.equal(npcSchedule.isActive(zeniaSleep, Date.parse('2026-10-09T23:38:00Z')), false);
    assert.equal(npcSchedule.isActive(zeniaSleep, Date.parse('2026-10-10T01:00:00Z')), true);
    assert.equal(npcSchedule.isActive(zeniaSleep, Date.parse('2026-10-10T11:00:00Z')), false);
});

test('overnight NPC routes use the correct Brasília start date and timestamp', () => {
    const route = { inicio: '22:00', fim: '02:00' };
    const start = npcSchedule.activeWindowStart(route, Date.parse('2026-10-10T02:00:00Z'));
    assert.deepEqual(start, {
        startMs: Date.parse('2026-10-10T01:00:00Z'),
        dataKey: '2026-10-09'
    });
});
