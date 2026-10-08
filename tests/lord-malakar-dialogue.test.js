'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

function extractFunction(name) {
    const start = serverSource.indexOf('function ' + name + '(');
    assert.notEqual(start, -1, 'production function ' + name + ' should exist');
    const braceStart = serverSource.indexOf('{', start);
    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let i = braceStart; i < serverSource.length; i++) {
        const char = serverSource[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = null;
            continue;
        }
        if (char === "'" || char === '"' || char === '`') quote = char;
        else if (char === '{') depth++;
        else if (char === '}' && --depth === 0) return serverSource.slice(start, i + 1);
    }
    assert.fail('could not extract production function ' + name);
}

function dialogueHarness(targetList) {
    const context = vm.createContext({
        Math,
        bosses: [],
        slimes: targetList,
        PLAYER_OFFSET_X: 12,
        PLAYER_OFFSET_Y: 16,
        mapaPorCoordenada: () => 'mundo',
        instanciaCompativel: () => true
    });
    vm.runInContext(extractFunction('alvoComandadoLordMalakarAtivo'), context);
    vm.runInContext(extractFunction('atualizarDialogoLordMalakar'), context);
    return context;
}

function fiveSkulls() {
    return [
        { id: 'warrior-1', type: 'skull_warrior' },
        { id: 'warrior-2', type: 'skull_warrior' },
        { id: 'archer-1', type: 'skull_archer' },
        { id: 'archer-2', type: 'skull_archer' },
        { id: 'mage-1', type: 'skull_mage' }
    ];
}

test('stale saved target no longer blocks Malakar summons from resuming banter', () => {
    const context = dialogueHarness([]);
    const owner = {
        hp: 1000,
        x: 100,
        y: 100,
        lordMalakarTarget: { tipo: 'slime', id: 'already-gone' }
    };
    const state = { skulls: fiveSkulls(), dialogue: null, nextDialogueAt: 0 };

    context.atualizarDialogoLordMalakar('owner', owner, state, 10000);

    assert.ok(state.dialogue);
    assert.ok(state.dialogue.lines.length >= 2);
    assert.equal(state.dialogue.nextAt, 10000);
});

test('live commanded enemy in range still pauses summon banter', () => {
    const target = { id: 'slime-1', hp: 100, x: 212, y: 216, targetId: null };
    const context = dialogueHarness([target]);
    const owner = {
        hp: 1000,
        x: 100,
        y: 100,
        lordMalakarTarget: { tipo: 'slime', id: 'slime-1' }
    };
    const state = { skulls: fiveSkulls(), dialogue: null, nextDialogueAt: 0 };

    context.atualizarDialogoLordMalakar('owner', owner, state, 10000);

    assert.equal(state.dialogue, null);
    assert.equal(state.nextDialogueAt, 20000);
});
