// Teste rápido da lógica pura do upgrade (sem servidor)
'use strict';
const up = require('./upgrade.js');

let falhas = 0;
function check(rotulo, cond, detalhe) {
    if (cond) console.log('  OK  ' + rotulo);
    else { console.log('  ERRO ' + rotulo + (detalhe ? ' — ' + detalhe : '')); falhas++; }
}

console.log('== Chances ==');
check('chance +0→+1 = 100%', up.chanceParaNivel(0) === 1.0);
check('chance +4→+5 = 100%', up.chanceParaNivel(4) === 1.0);
check('chance +5→+6 = 80%', up.chanceParaNivel(5) === 0.8);
check('chance +9→+10 = 30%', up.chanceParaNivel(9) === 0.3);
check('chance +14→+15 = 5%', up.chanceParaNivel(14) === 0.05);
check('chance +19→+20 = 0.2%', up.chanceParaNivel(19) === 0.002);
check('chance +20 (máx) = 0', up.chanceParaNivel(20) === 0);

console.log('== Pedras ==');
check('alvo 1 → FADEO', up.pedraParaNivel(1).pedra === 'FADEO');
check('alvo 5 → FADEO', up.pedraParaNivel(5).pedra === 'FADEO');
check('alvo 6 → MURK', up.pedraParaNivel(6).pedra === 'MURK');
check('alvo 10 → MURK', up.pedraParaNivel(10).pedra === 'MURK');
check('alvo 11 → DIVINE', up.pedraParaNivel(11).pedra === 'DIVINE');
check('alvo 15 → DIVINE', up.pedraParaNivel(15).pedra === 'DIVINE');
check('alvo 16 → STONE_GOD', up.pedraParaNivel(16).pedra === 'STONE_GOD');
check('alvo 20 → STONE_GOD', up.pedraParaNivel(20).pedra === 'STONE_GOD');

console.log('== Aplicar upgrade ==');
let item = {
    id: 'drop_1_1', uid: 'abc',
    tipo: 'equipamento', slot: 'arma', raridade: 'epico',
    nome: 'Espada Lendária', icon: '🗡️', classe: 'guerreiro', armaChave: 'espada_pedra',
    status: { forca: 8, destreza: 3, vida: 2 }
};
let info = up.aplicarUpgrade(item, 1);
check('+1: força 8→9 (status principal)', item.status.forca === 9 && info.principalChave === 'forca');
check('+1: sem extras', info.extras.length === 0 && !info.reforco);

// Fluxo real: aplica +1 a +5 SEQUENCIALMENTE (como o servidor faz)
let itemSeq = { tipo: 'equipamento', slot: 'arma', status: { forca: 8, destreza: 3, vida: 2 } };
for (let n = 1; n <= 5; n++) up.aplicarUpgrade(itemSeq, n);
check('+5 sequencial: força 8+5=13', itemSeq.status.forca === 13);
let item5 = { tipo: 'equipamento', slot: 'arma', status: { forca: 8, destreza: 3, vida: 2 } };
for (let n = 1; n <= 5; n++) up.aplicarUpgrade(item5, n);
check('+5: ganhou 1 status aleatório registrado', item5.upgradeExtras.length === 1);
check('+5: extra está no status', item5.status[item5.upgradeExtras[0].chave] > 0);

let item20 = { uid: 'xyz', tipo: 'equipamento', slot: 'peitoral', status: { vida: 10, forca: 4 } };
let info20 = up.aplicarUpgrade(item20, 20);
// principal (vida) ganha +4 (faixa 16-20), depois reforço ×1.1 ceil: (10+4)*1.1=15.4 → 16
check('+20: reforço aplicado', info20.reforco === true);
check('+20: vida 10 → principal +4 = 14 → ×1.1 ceil = 16', item20.status.vida === 16);
check('+20: forca 4 → ×1.1 = 4.4 ceil = 5', item20.status.forca === 5);

console.log('== Principal ==');
check('statusPrincipal pega maior valor', up.statusPrincipal({ status: { vida: 2, forca: 8 } }) === 'forca');
check('statusPrincipal primeiro em empate', up.statusPrincipal({ status: { forca: 5, vida: 5 } }) === 'forca');
check('statusPrincipal vazio → null', up.statusPrincipal({ status: {} }) === null);

console.log('== Pedra item ==');
let pedra = up.novoItemPedra('MURK', 3);
check('pedra criada', !!pedra && pedra.tipo === 'pedra' && pedra.pedra === 'MURK' && pedra.quantidade === 3);

console.log(falhas === 0 ? 'TODOS OS TESTES PASSARAM' : ('FALHAS: ' + falhas));
process.exit(falhas === 0 ? 0 : 1);