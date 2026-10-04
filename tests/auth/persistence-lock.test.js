const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { adquirirLock, liberarLock } = require('../../persistence-lock');

function pastaTemporaria(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmorpg-lock-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return path.join(dir, 'db.lock');
}

test('lock exclusivo impede gravações simultâneas e é liberado pelo proprietário', t => {
    const file = pastaTemporaria(t);
    const lock = adquirirLock(file);
    assert.throws(() => adquirirLock(file), /ocupado/);
    liberarLock(lock);
    const seguinte = adquirirLock(file);
    liberarLock(seguinte);
    assert.equal(fs.existsSync(file), false);
});

test('recupera lock cujo PID proprietário não existe mais', t => {
    const file = pastaTemporaria(t);
    fs.writeFileSync(file, JSON.stringify({ pid: 2147483647, createdAt: Date.now(), token: 'crashed-process' }));
    const lock = adquirirLock(file);
    const owner = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(owner.pid, process.pid);
    assert.notEqual(owner.token, 'crashed-process');
    liberarLock(lock);
});

test('não remove lock pertencente ao processo atual', t => {
    const file = pastaTemporaria(t);
    const lock = adquirirLock(file);
    assert.throws(() => adquirirLock(file), /ocupado/);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).token, lock.token);
    liberarLock(lock);
});
