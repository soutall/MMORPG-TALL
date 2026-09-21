/* _test_intro.js — smoke test do intro.js com DOM falso (não requer navegador).
   Roda o timeline inteiro da intro e valida o ciclo de vida (cria → toca som →
   barra 0→100% → fade → remove do DOM). */
'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// ---------- Mocks ----------
function makeClassList() {
    const set = new Set();
    return {
        add(c) { set.add(c); },
        remove(c) { set.delete(c); },
        contains(c) { return set.has(c); }
    };
}

function makeNode(tag) {
    const el = {
        tag, style: {}, id: '', innerHTML: '',
        parentNode: null, firstChild: null, children: [],
        classList: makeClassList(),
        addEventListener() {}, removeEventListener() {},
        querySelector() {
            if (!el.__q) el.__q = {
                classList: makeClassList(),
                style: { transform: '', textContent: '0%' },
                textContent: '0%'
            };
            return el.__q;
        },
        appendChild(child) { child.parentNode = el; el.children.push(child); if (!el.firstChild) el.firstChild = child; },
        insertBefore(child, ref) { child.parentNode = el; el.children.push(child); if (!ref) el.firstChild = child; },
        removeChild(child) { el.children = el.children.filter(c => c !== child); if (el.firstChild === child) el.firstChild = null; child.parentNode = null; }
    };
    return el;
}

let agora = 0;
const rafQueue = [];
let audioPausado = false;
const audioElFake = {
    volume: 0.8,
    play() { return Promise.resolve(); },
    pause() { audioPausado = true; },
    addEventListener() {}, removeEventListener() {},
    set src(v) {}
};

const body = makeNode('body');
const htmlEl = makeNode('html');
// Simula o bootstrap inline do index.html (a classe é adicionada ANTES do intro.js rodar)
body.classList.add('intro-ativa');
htmlEl.classList.add('intro-ativa');

function makeWindowMock(doc, perf, rafQ) {
    return {
        addEventListener() {}, removeEventListener() {},
        volumeGeral: 0.8,
        document: doc,
        performance: perf,
        requestAnimationFrame: rafQ ? (cb) => { rafQ.push(cb); return rafQ.length; } : () => 0,
        cancelAnimationFrame() {},
        setTimeout: () => 0,
        clearTimeout: () => {},
        console,
        AudioManager: {
            CATEGORY: { IMPORTANT: 'important', SKILL: 'skill' },
            playGlobalSound(id, options) {
                assert.ok(id === 'intro_logotall', 'id do som');
                assert.ok(/logotall\.ogg/.test(options.src), 'src do ogg');
                return { element: audioElFake };
            },
            unlock() {}
        }
    };
}

const sandbox = makeWindowMock(
    {
        readyState: 'complete',
        documentElement: htmlEl,
        body,
        createElement() { return makeNode('div'); },
        addEventListener() {}
    },
    { now() { return agora; } },
    rafQueue
);
sandbox.window = sandbox;

const code = fs.readFileSync(__dirname + '\\intro.js', 'utf8');
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

// ---------- Validações do boot ----------
assert.ok(sandbox.INTRO_API, 'IIFE deveria ter exposto INTRO_API');
const api = sandbox.INTRO_API;
assert.strictEqual(api.nomeEstudio, 'Tall Games Production');
assert.strictEqual(body.children.length, 1, 'overlay deve ser o único filho do body');
const overlay = body.children[0];
assert.strictEqual(overlay.id, 'intro-overlay');
assert.strictEqual(overlay.tag, 'div');
assert.ok(body.classList.contains('intro-ativa'), 'bootstrap simulou intro-ativa no body');
console.log('OK 1/5 boot: overlay criado imediatamente, nome do estúdio =', api.nomeEstudio);

// ---------- Drive o timeline ----------
let frames = 0;
const T = api.duracaoTotal;
while (rafQueue.length) {
    const cb = rafQueue.shift();
    if (!cb) continue;
    agora += 16; // quadros de ~16ms
    frames++;
    cb(agora);
    if (agora > T + 500) break; // salvaguarda de teste
}
console.log('OK 2/5 timeline dirigido em', frames, 'quadros até t=', agora, 'ms (total previsto', T, 'ms)');

// ---------- Estado final ----------
assert.strictEqual(body.children.length, 0, 'overlay removido do DOM');
assert.ok(!body.classList.contains('intro-ativa'), 'body sem intro-ativa');
assert.strictEqual(rafQueue.length, 0, 'nenhum rAF pendente');
assert.ok(audioPausado, 'áudio pausado no destroy');
console.log('OK 3/5 cleanup: DOM limpo, sem rAF pendente, áudio pausado');

// ---------- Verifica a barra (re-inicia e inspeciona os quadros) ----------
// Re-executa em sandbox limpo para inspecionar o fill no meio do loading
const sandbox2 = (function () {
    let a2 = 0; const q2 = [];
    const s2 = makeWindowMock(
        { readyState: 'complete', documentElement: makeNode('html'), body: makeNode('body'),
            createElement() { return makeNode('div'); }, addEventListener() {} },
        { now() { return a2; } },
        q2
    );
    s2.window = s2;
    return { ref: s2, agoraFake() { return a2; }, avanca(ms) { a2 += ms; }, fila: q2 };
})();
vm.createContext(sandbox2.ref);
vm.runInContext(code, sandbox2.ref);

const framesSeen = [];
while (sandbox2.fila.length) {
    const cb = sandbox2.fila.shift(); if (!cb) continue;
    sandbox2.avanca(16); cb(sandbox2.agoraFake());
    const fill = sandbox2.ref.document.body.children[0] && sandbox2.ref.document.body.children[0];
    // captura transform do preenchimento
    const fillEl = fill && fill.querySelector && fill.querySelector('.intro-barra-preenchimento');
    if (fillEl && fillEl.style.transform) framesSeen.push(parseFloat(fillEl.style.transform.replace('scaleX(', '').replace(')', '')));
    if (sandbox2.agoraFake() > 8000) break;
}
const vals = framesSeen;
assert.ok(vals.length > 10, 'muitos quadros com barra');
assert.ok(vals[0] < 0.05, 'barra começa ~0% (início do loading): ' + vals[0]);
const mid = vals[Math.floor(vals.length / 2)];
assert.ok(mid > 0.2 && mid < 0.95, 'meia-barrada ~entre 20% e 95%: ' + mid);
const last = vals[vals.length - 1];
assert.strictEqual(last, 1, 'barra chega a 100% no fim: ' + last);
console.log('OK 4/5 barra: começa', vals[0].toFixed(2), '→ meio', mid.toFixed(2), '→ fim', last);

// ---------- Integração no index.html ----------
const html = fs.readFileSync(__dirname + '\\index.html', 'utf8');
assert.ok(/intro\.css\?v=1/.test(html), 'intro.css linkado no head');
assert.ok(/intro\.js\?v=1/.test(html), 'intro.js carregado');
const bootIdx = html.indexOf("classList.add('intro-ativa')");
assert.ok(bootIdx > 0 && bootIdx < html.indexOf('<div id="login-screen">'), 'bootstrap antes do login-screen');
assert.ok(html.indexOf('intro.js?v=1') > html.indexOf('audio-manager.js'), 'intro.js depois do audio-manager');
console.log('OK 5/5 index.html: link CSS, bootstrap antes do login, script depois do AudioManager');

console.log('\n[SUCESSO] todos os testes da intro passaram.');