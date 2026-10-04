// teste_summoner_debuffs_e_vfx.js
const assert = require('assert');

console.log('=== TESTE: Summoner VFX, Debuffs e Upgrades v1.71.0 ===');

// 1. Mock do ambiente Canvas 2D
global.window = global;
global.document = { getElementById: () => null, createElement: () => ({ appendChild: () => {}, className: '' }) };
global.performance = { now: () => Date.now() };
global.ctx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    rect: () => {},
    roundRect: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    setLineDash: () => {}
};

// 2. Carrega classes/comum.js
require('./classes/comum.js');
assert.strictEqual(typeof window.desenharBarraHp, 'function', 'desenharBarraHp deve existir em window');

// Testa desenharBarraHp com múltiplos debuffs
const slimeTeste = {
    id: 999,
    hp: 80,
    maxHp: 100,
    stunTimer: 30,
    slowTimer: 40,
    isPreso: Date.now() + 700,
    reducaoDefTimer: 80,
    fraturaDefensivaExpires: Date.now() + 4000,
    marcaPresaExpires: Date.now() + 5000,
    queimaduraExpires: Date.now() + 3000,
    reducaoAtkTimer: 60
};
window.desenharBarraHp(100, 100, slimeTeste.hp, slimeTeste.maxHp, slimeTeste.stunTimer, slimeTeste.slowTimer, 30, slimeTeste);
console.log('✔ classes/comum.js desenharBarraHp executado com sucesso com todos os 8 debuffs!');

// 3. Carrega efeitos/vfx_summoner_upgrades.js
require('./efeitos/vfx_summoner_upgrades.js');
assert.strictEqual(typeof window.criarVfxSummonerPrisaoPlacas, 'function', 'criarVfxSummonerPrisaoPlacas deve existir');
assert.strictEqual(typeof window.criarVfxSummonerMarteloColossoReady, 'function', 'criarVfxSummonerMarteloColossoReady deve existir');
assert.strictEqual(typeof window.criarVfxSummonerMarteloColossoHit, 'function', 'criarVfxSummonerMarteloColossoHit deve existir');
assert.strictEqual(typeof window.criarVfxSummonerColapsoTerritorial, 'function', 'criarVfxSummonerColapsoTerritorial deve existir');

// Testa criação dos novos efeitos
window.criarVfxSummonerPrisaoPlacas(200, 200, 90, 700);
assert.strictEqual(window.vfxSummonerPrisaoPlacas.length, 1, 'Prisão de Placas deve estar no array');

window.criarVfxSummonerMarteloColossoReady('player1', 200, 200);
assert.strictEqual(window.golemMarteloColossoAtivo['player1'], true, 'Martelo do Colosso deve estar ativo');

window.criarVfxSummonerMarteloColossoHit(210, 210, 120, 'player1');
assert.strictEqual(window.vfxSummonerMartelosColosso.length, 1, 'Martelo Hit deve estar no array');
assert.strictEqual(window.golemMarteloColossoAtivo['player1'], undefined, 'Martelo do Colosso deve ser consumido após o hit');

window.criarVfxSummonerColapsoTerritorial(200, 200, 110, 3000);
assert.strictEqual(window.vfxSummonerColapsosTerritoriais.length, 1, 'Colapso Territorial deve estar no array');

// Renderiza frame
window.desenharEfeitosSummonerUpgrades();
console.log('✔ efeitos/vfx_summoner_upgrades.js renderizou perfeitamente os novos efeitos de Prisão de Placas e Martelo do Colosso!');

// 4. Carrega skills.js
require('./skills.js');
const sismicoSkill = SKILLS_INFO.summoner.find(s => s.id === 'sismico');
assert.ok(sismicoSkill, 'Skill sismico deve existir em SKILLS_INFO.summoner');
assert.strictEqual(sismicoSkill.icon, '⛰️', 'Ícone da skill sismico deve ser ⛰️');
console.log('✔ skills.js: Golem Sísmico validado com ícone ⛰️ e categoria unificada!');

// 5. Carrega skill_upgrade_tree.js
const SkillUpgradeTree = require('./skill_upgrade_tree.js');
const participantes = SkillUpgradeTree.obterSkillsParticipantes('summoner');
assert.deepStrictEqual(participantes, ['esmagamento', 'salto', 'colossal', 'sismico'], 'Todas as 4 skills do Summoner devem participar da árvore de upgrades');
console.log('✔ skill_upgrade_tree.js: Árvore das 4 skills do Summoner validada com sucesso!');

console.log('\nTODOS OS TESTES PASSARAM COM 100% DE SUCESSO! 🎉');
