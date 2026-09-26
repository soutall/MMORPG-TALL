const assert = require('assert');
const { calcularTempoMundo, CONFIG_PADRAO } = require('./sistema_dia_noite.js');

console.log('=== TESTES SISTEMA DIA E NOITE (v1.52.0 - COM MADRUGADA 100% BREU) ===\n');

// 1. Proporções do Ciclo
console.log('[1] Proporções: Dia deve ser mais duradouro que a Noite');
assert.strictEqual(CONFIG_PADRAO.cicloDiaSegundos > CONFIG_PADRAO.cicloNoiteSegundos, true);
console.log('  OK: Dia (' + CONFIG_PADRAO.cicloDiaSegundos + 's) > Noite (' + CONFIG_PADRAO.cicloNoiteSegundos + 's)');

// Teste em t = 0 (06:00 -> Pleno Dia)
let t0 = calcularTempoMundo(0);
assert.strictEqual(t0.hora, 6);
assert.strictEqual(t0.minuto, 0);
assert.strictEqual(t0.fase, 'dia');
assert.strictEqual(t0.escuridao, 0.0);
console.log('  OK: t=0 -> 06:00 (Pleno Dia, ☀️, escuridão 0.0)');

// Teste em meio-dia (metade do dia real = 60s)
let tMeioDia = calcularTempoMundo(60 * 1000);
assert.strictEqual(tMeioDia.hora, 12);
assert.strictEqual(tMeioDia.minuto, 0);
assert.strictEqual(tMeioDia.icone, '☀️');
assert.strictEqual(tMeioDia.escuridao, 0.0);
console.log('  OK: t=60s -> 12:00 (Meio-dia, ☀️, escuridão 0.0)');

// Teste às 18:00 (Início do Entardecer = 120s)
let t1800 = calcularTempoMundo(120 * 1000);
assert.strictEqual(t1800.hora, 18);
assert.strictEqual(t1800.minuto, 0);
assert.strictEqual(t1800.fase, 'entardecer');
assert.strictEqual(t1800.escuridao, 0.0);
console.log('  OK: t=120s -> 18:00 (Início do Entardecer ' + t1800.icone + ', escuridão 0.0)');

// Teste às 18:30 (Entardecer aprofundando = 122.5s)
let t1830 = calcularTempoMundo(122500);
assert.strictEqual(t1830.hora, 18);
assert.strictEqual(t1830.minuto, 30);
assert.strictEqual(t1830.fase, 'entardecer');
assert.strictEqual(Math.abs(t1830.escuridao - 0.35) < 0.01, true);
console.log('  OK: t=122.5s -> 18:30 (Entardecer ' + t1830.icone + ', escuridão ' + t1830.escuridao + ')');

// Teste às 19:00 (Início da Noite Normal = 125s)
let t1900 = calcularTempoMundo(125 * 1000);
assert.strictEqual(t1900.hora, 19);
assert.strictEqual(t1900.minuto, 0);
assert.strictEqual(t1900.fase, 'noite');
assert.strictEqual(t1900.escuridao, 0.70);
assert.strictEqual(t1900.icone, '🌙');
console.log('  OK: t=125s -> 19:00 (Noite Normal 🌙, escuridão 0.70)');

// Teste às 23:00 (Início da transição para a madrugada = 145s)
let t2300 = calcularTempoMundo(145 * 1000);
assert.strictEqual(t2300.hora, 23);
assert.strictEqual(t2300.minuto, 0);
assert.strictEqual(t2300.escuridao, 0.70);
console.log('  OK: t=145s -> 23:00 (Noite pré-madrugada 🌙, escuridão 0.70)');

// Teste à Meia-Noite (00:00 = 150s: 100% Breu Total!)
let tMeiaNoite = calcularTempoMundo(150 * 1000);
assert.strictEqual(tMeiaNoite.hora, 0);
assert.strictEqual(tMeiaNoite.minuto, 0);
assert.strictEqual(tMeiaNoite.fase, 'madrugada');
assert.strictEqual(tMeiaNoite.escuridao, 1.00);
assert.strictEqual(tMeiaNoite.icone, '🌑');
console.log('  OK: t=150s -> 00:00 (Início da Madrugada 🌑, ESCURIDÃO 100% 1.00 - Breu Total!)');

// Teste às 02:00 (Madrugada Profunda = 160s)
let t0200 = calcularTempoMundo(160 * 1000);
assert.strictEqual(t0200.hora, 2);
assert.strictEqual(t0200.minuto, 0);
assert.strictEqual(t0200.fase, 'madrugada');
assert.strictEqual(t0200.escuridao, 1.00);
assert.strictEqual(t0200.icone, '🌑');
console.log('  OK: t=160s -> 02:00 (Madrugada 🌑, mantendo 100% 1.00 de breu!)');

// Teste às 04:00 (Término da Madrugada 100% = 170s)
let t0400 = calcularTempoMundo(170 * 1000);
assert.strictEqual(t0400.hora, 4);
assert.strictEqual(t0400.minuto, 0);
assert.strictEqual(t0400.escuridao, 1.00);
console.log('  OK: t=170s -> 04:00 (Término da Madrugada, iniciando saída suave)');

// Teste às 04:30 (Retornando suavemente a 0.85 = 172.5s)
let t0430 = calcularTempoMundo(172500);
assert.strictEqual(t0430.hora, 4);
assert.strictEqual(t0430.minuto, 30);
assert.strictEqual(Math.abs(t0430.escuridao - 0.85) < 0.01, true);
console.log('  OK: t=172.5s -> 04:30 (Saindo da madrugada, escuridão ' + t0430.escuridao + ')');

// Teste às 05:00 (Início do Amanhecer = 175s)
let t0500 = calcularTempoMundo(175 * 1000);
assert.strictEqual(t0500.hora, 5);
assert.strictEqual(t0500.minuto, 0);
assert.strictEqual(t0500.fase, 'amanhecer');
assert.strictEqual(t0500.escuridao, 0.70);
console.log('  OK: t=175s -> 05:00 (Início do Amanhecer ' + t0500.icone + ', escuridão 0.70)');

// Teste às 05:30 (Amanhecer clareando a 50% = 177.5s)
let t0530 = calcularTempoMundo(177500);
assert.strictEqual(t0530.hora, 5);
assert.strictEqual(t0530.minuto, 30);
assert.strictEqual(t0530.fase, 'amanhecer');
assert.strictEqual(Math.abs(t0530.escuridao - 0.35) < 0.01, true);
console.log('  OK: 05:30 -> Clareando a meio caminho (escuridão ' + t0530.escuridao + ')');

// 2. Limite Máximo de Escuridão
console.log('\n[2] Limites: Escuridão nunca passa de 1.00 nem fica negativa');
for (let s = 0; s < 180; s += 1) {
    let t = calcularTempoMundo(s * 1000);
    assert.strictEqual(t.escuridao <= 1.0001, true, 'Escuridão excedeu 1.00 em s=' + s);
    assert.strictEqual(t.escuridao >= 0.0, true, 'Escuridão negativa em s=' + s);
}
console.log('  OK: 100% dos momentos respeitam 0.0 <= escuridao <= 1.00');

// 3. Continuidade e Ausência de Saltos Bruscos
console.log('\n[3] Continuidade: Sem saltos bruscos a cada 100ms (diff < 0.02)');
let prev = calcularTempoMundo(0);
for (let ms = 100; ms <= 180000; ms += 100) {
    let curr = calcularTempoMundo(ms);
    let diff = Math.abs(curr.escuridao - prev.escuridao);
    assert.strictEqual(diff < 0.02, true, 'Salto brusco detectado em ms=' + ms + ': diff=' + diff);
    prev = curr;
}
console.log('  OK: Transições perfeitamente contínuas e suaves');

// 4. Determinismo e Sincronização Server-Authoritative
console.log('\n[4] Autoridade do Servidor: Mesmo timestamp retorna exatamente o mesmo estado');
let agoraFixo = Date.now();
let playerA = calcularTempoMundo(agoraFixo);
let playerB = calcularTempoMundo(agoraFixo);
assert.deepStrictEqual(playerA, playerB);
console.log('  OK: Jogadores diferentes no mesmo instante têm horário idêntico: ' + playerA.horaFormatada + ' ' + playerA.icone);

console.log('\nTODOS OS TESTES DE DIA/NOITE COM MADRUGADA 100% PASSARAM COM SUCESSO! ☀️🌙🌑');
