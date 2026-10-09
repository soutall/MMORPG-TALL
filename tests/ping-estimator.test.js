'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const estimator = require('../ping-estimator.js');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('ping estimate waits for three RTT samples and suppresses a transient outlier', () => {
    const ping = estimator.criarEstimadorPing(5, 3);

    assert.equal(ping.adicionar(300), null);
    assert.equal(ping.adicionar(12), null);
    assert.equal(ping.adicionar(10), 12);
    assert.equal(ping.adicionar(11), 11.5);
    assert.equal(ping.adicionar(9), 11);
});

test('ping estimate follows sustained latency and can be reset on reconnect', () => {
    const ping = estimator.criarEstimadorPing(5, 3);

    ping.adicionar(10);
    ping.adicionar(11);
    ping.adicionar(10);
    assert.equal(ping.adicionar(180), 10.5);
    assert.equal(ping.adicionar(175), 11);
    assert.equal(ping.adicionar(190), 175);

    ping.resetar();
    assert.equal(ping.adicionar(20), null);
});

test('invalid and negative RTT samples do not affect the estimate', () => {
    const ping = estimator.criarEstimadorPing(3, 2);

    assert.equal(ping.adicionar(-1), null);
    assert.equal(ping.adicionar(Number.NaN), null);
    assert.equal(ping.adicionar(8), null);
    assert.equal(ping.adicionar(10), 9);
});

test('the game waits until initialization settles and permits only one outstanding ping', () => {
    assert.match(indexHtml, /ping-estimator\.js\?v=1/);
    assert.match(indexHtml, /new Date\(\)|performance\.now\(\)/);
    assert.match(indexHtml, /pingInicialTimeout = setTimeout\(function/);
    assert.match(indexHtml, /pingPendenteEm === null/);
    assert.match(indexHtml, /timestampPing === pingPendenteEm/);
    assert.match(indexHtml, /pingAtual = estimadorPing\.adicionar/);
    assert.match(indexHtml, /clearTimeout\(pingInicialTimeout\)/);
});
