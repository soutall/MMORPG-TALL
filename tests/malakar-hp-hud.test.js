'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Malakar petrified HP retains its proportional width and has animated stone detail', () => {
    const start = html.indexOf('if (i === 0 && malakarPetrifiedRatio > 0)');
    const end = html.indexOf('ctx.restore();', start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);

    const section = html.slice(start, end);
    assert.match(section, /var petrifiedWidth = Math\.min\(bw, Math\.max\(1, bw \* malakarPetrifiedRatio\)\)/);
    assert.match(section, /stonePulse = \(Math\.sin\(animacaoAgora \/ 260\) \+ 1\) \/ 2/);
    assert.match(section, /stoneShineX/);
    assert.match(section, /stone\.addColorStop\(0, '#e1e5e7'\)/);
    assert.match(section, /Facetas e veios dão relevo de pedra/);
    assert.match(section, /rgba\(224, 244, 250, '/);
});
