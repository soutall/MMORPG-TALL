// Auditoria v1.60.1 — testes de UNIDADE: extrai as funções REAIS do server.js
// e as executa num sandbox (vm) com stubs. Determinístico (sem aleatoriedade).
//   1) Fúria Crescente (Bárbaro) nos 4 patamares de HP
//   2) Imunidade do Salto+Chuva vale em PvE
//   3) Imunidade do Salto+Chuva NÃO vale em PvP
// Uso: node _auditoria_unidade.js
const fs = require('fs');
const vm = require('vm');

let pass = 0, fail = 0;
function r(n, ok, msg) {
    if (ok) { pass++; console.log('PASS ' + n + (msg ? ' · ' + msg : '')); }
    else { fail++; console.log('FAIL ' + n + ' — ' + msg); }
}

// ---------- extração de função com brace-matching (ignora comentários/strings) ----------
function extrairFuncao(src, nome) {
    const marca = 'function ' + nome + '(';
    const i = src.indexOf(marca);
    if (i < 0) throw new Error('função não encontrada: ' + nome);
    const ini = src.indexOf('{', i);
    let prof = 0, modo = 0; // 0 code, 1 //, 2 /*, 3 ', 4 ", 5 `
    for (let k = ini; k < src.length; k++) {
        const c = src[k], n = src[k + 1];
        if (modo === 0) {
            if (c === '/' && n === '/') { modo = 1; k++; continue; }
            if (c === '/' && n === '*') { modo = 2; k++; continue; }
            if (c === "'") { modo = 3; continue; }
            if (c === '"') { modo = 4; continue; }
            if (c === '`') { modo = 5; continue; }
            if (c === '{') prof++;
            else if (c === '}') { prof--; if (prof === 0) return src.slice(i, k + 1); }
        } else if (modo === 1) { if (c === '\n') modo = 0; }
        else if (modo === 2) { if (c === '*' && n === '/') { modo = 0; k++; } }
        else { if (c === '\\') { k++; continue; } if ((modo === 3 && c === "'") || (modo === 4 && c === '"') || (modo === 5 && c === '`')) modo = 0; }
    }
    throw new Error('não fechou: ' + nome);
}

// ---------- sandbox ----------
const src = fs.readFileSync('server.js', 'utf8');
const codigos = ['calcularDanoJogador', 'aplicarDanoJogador', 'aplicarDanoPvP'].map(n => extrairFuncao(src, n));

function stub() { return undefined; }
function stubAuto() {
    const f = function () { return undefined; };
    return new Proxy(f, {
        get: (t, k) => (typeof k === 'symbol' ? t[k] : (k in t ? t[k] : stubAuto())),
        apply: () => undefined
    });
}

const base = {
    // Math com random fixo => crítico NUNCA dispara (0.999 nunca < chance)
    Math: Object.assign(Object.create(Math), { random: function () { return 0.999; } }),
    Date, Number, String, Boolean, Array, Object, JSON, console, isNaN, parseInt, parseFloat, Symbol,
    players: {}, slimes: [], bosses: [], playerSockets: {},
    efeitos: { temEfeito: () => false, removerEfeito: () => false, aplicarEfeito: () => {}, exporEfeitos: () => [] },
    aliadoNaAura: () => false,
    wss: { clients: [] },
    WebSocket: { OPEN: 1 },
    sincronizarEfeitos: () => {},
    solariMarcaMorte: () => {},
    tentarRessurreicaoAutomatica: () => false,
    broadcastDanoFlut: () => {},
    broadcastCritico: () => {},
    finalizarInvisibilidadeLadino: () => {},
    getAtr: (p, a) => (p && p.atributos && p.atributos[a]) || 1
};

const proxy = new Proxy(base, {
    has: () => true,
    get: (t, k) => {
        if (typeof k === 'symbol') return t[k];
        if (k in t) return t[k];
        return stubAuto();
    },
    set: (t, k, v) => { t[k] = v; return true; }
});

const fns = vm.runInNewContext(
    'with (__g) { ' + codigos.join('\n') + '\n; ({ calcularDanoJogador: calcularDanoJogador, aplicarDanoJogador: aplicarDanoJogador, aplicarDanoPvP: aplicarDanoPvP }) }',
    { __g: proxy },
    { filename: 'server_extraido.js' }
);
r('extracao', typeof fns.calcularDanoJogador === 'function' && typeof fns.aplicarDanoJogador === 'function' && typeof fns.aplicarDanoPvP === 'function', '3 funções reais extraídas do server.js');

// ==================== 1. FÚRIA CRESCENTE (Bárbaro) ====================
console.log('\n--- 7. FURIA CRESCENTE (Bárbaro) ---');
function barbaro(hpPct, maxHp) {
    maxHp = maxHp || 1000;
    return {
        classe: 'barbaro', hp: Math.round(maxHp * hpPct), maxHp: maxHp, x: 0, y: 0, angulo: 0, estamina: 100,
        atributos: { forca: 1, inteligencia: 1, agilidade: 1, destreza: 1, vida: 1, profanidade: 1, divindade: 1, afinidade: 1 }
    };
}
function danoBarbaro(hpPct, quantidade) {
    const p = barbaro(hpPct);
    base.players['fur'] = p;
    const res = fns.calcularDanoJogador('fur', quantidade, 'player', null);
    delete base.players['fur'];
    return res.dano;
}
const BASE = 1000;
r('furia_hp100_sem_bonus', danoBarbaro(1.00, BASE) === BASE, `100% HP => ${danoBarbaro(1.00, BASE)} (esperado ${BASE})`);
r('furia_hp61_sem_bonus', danoBarbaro(0.61, BASE) === BASE, `61% HP => ${danoBarbaro(0.61, BASE)} (esperado ${BASE})`);
r('furia_hp60_5pct', danoBarbaro(0.60, BASE) === 1050, `60% HP => ${danoBarbaro(0.60, BASE)} (esperado 1050 = +5%)`);
r('furia_hp40_10pct', danoBarbaro(0.40, BASE) === 1100, `40% HP => ${danoBarbaro(0.40, BASE)} (esperado 1100 = +10%)`);
r('furia_hp20_15pct', danoBarbaro(0.20, BASE) === 1150, `20% HP => ${danoBarbaro(0.20, BASE)} (esperado 1150 = +15%)`);
r('furia_hp0_bonus_zerado', danoBarbaro(0.00, BASE) === BASE, `0% HP (morto) => ${danoBarbaro(0.00, BASE)} (esperado ${BASE}, sem bônus)`);
// Atualização dinâmica: mesmo objeto, HP muda entre chamadas
(function () {
    const p = barbaro(1.0, 1000);
    base.players['din'] = p;
    const a = fns.calcularDanoJogador('din', BASE, 'player', null).dano;
    p.hp = 600; const b = fns.calcularDanoJogador('din', BASE, 'player', null).dano;
    p.hp = 400; const c = fns.calcularDanoJogador('din', BASE, 'player', null).dano;
    p.hp = 200; const d = fns.calcularDanoJogador('din', BASE, 'player', null).dano;
    delete base.players['din'];
    r('furia_dinamico', a === 1000 && b === 1050 && c === 1100 && d === 1150, `mesmo objeto, HP alterado no meio: ${a}/${b}/${c}/${d}`);
})();
// Não vaza para outras classes
(function () {
    base.players['mag'] = { classe: 'mago', hp: 200, maxHp: 1000, x: 0, y: 0, angulo: 0, atributos: { forca: 1, inteligencia: 1, agilidade: 1, destreza: 1, vida: 1, profanidade: 1, divindade: 1, afinidade: 1 } };
    const d = fns.calcularDanoJogador('mag', BASE, 'player', null).dano;
    delete base.players['mag'];
    r('furia_so_barbaro', d === BASE, `mago a 20% HP => ${d} (esperado ${BASE}, sem bônus)`);
})();
// Não altera dano base: o bônus é multiplicativo sobre o resultado, 1 skill não muda de valor base
(function () {
    const p = barbaro(0.20, 1000);
    base.players['bas'] = p;
    const d1 = fns.calcularDanoJogador('bas', 55, 'player', null).dano;
    delete base.players['bas'];
    r('furia_55_base', d1 === 63, `base 55 a 20% HP => ${d1} (esperado 63 = round(55*1.15))`);
})();

// ==================== 2/3. IMUNIDADE (PvE x PvP) ====================
console.log('\n--- 8/9. IMUNIDADE PvE x PvP ---');
function alvoImune(imune) {
    return {
        classe: 'arqueiro', hp: 100, maxHp: 100, x: 10, y: 10, angulo: 0, estamina: 100,
        imune: imune, pvpAtivo: true
    };
}
// PvE com imunidade => nada acontece
(function () {
    base.players['pve1'] = alvoImune(true);
    const ret = fns.aplicarDanoJogador('pve1', 0, 0, 50);
    const hp = base.players['pve1'].hp;
    delete base.players['pve1'];
    r('pve_imune_sem_dano', ret === true && hp === 100, `imune=true => hp ${hp}/100 (esperado 100), retorno ${ret}`);
})();
// PvE controle: sem imunidade => dano aplicado
(function () {
    base.players['pve2'] = alvoImune(false);
    fns.aplicarDanoJogador('pve2', 0, 0, 50);
    const hp = base.players['pve2'].hp;
    delete base.players['pve2'];
    r('pve_sem_imune_leva_dano', hp === 50, `imune=false => hp ${hp}/100 (esperado 50)`);
})();
// PvP COM imunidade => dano APLICA (imunidade é só PvE)
(function () {
    base.players['atk'] = { classe: 'guerreiro', hp: 100, maxHp: 100, x: 0, y: 0, pvpAtivo: true };
    base.players['def'] = alvoImune(true);
    fns.aplicarDanoPvP('atk', 'def', 50);
    const hp = base.players['def'].hp;
    delete base.players['atk']; delete base.players['def'];
    r('pvp_imune_nao_protege', hp === 50, `PvP com imune=true => hp ${hp}/100 (esperado 50: dano passou)`);
})();
// PvP controle: sem imunidade => mesmo resultado (prova que .imune é ignorado, não anulado)
(function () {
    base.players['atk'] = { classe: 'guerreiro', hp: 100, maxHp: 100, x: 0, y: 0, pvpAtivo: true };
    base.players['def'] = alvoImune(false);
    fns.aplicarDanoPvP('atk', 'def', 50);
    const hp = base.players['def'].hp;
    delete base.players['atk']; delete base.players['def'];
    r('pvp_controle', hp === 50, `PvP sem imune => hp ${hp}/100 (esperado 50)`);
})();

console.log('\n=== UNIDADE: ' + pass + ' PASS / ' + fail + ' FAIL ===');
process.exit(fail ? 1 : 0);
