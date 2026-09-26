// ============================================================================
// TESTE: ATIVAÇÃO AUTOMÁTICA DAS LÂMPADAS E EFEITOS DE LUZ NO CICLO DIA/NOITE (v1.52.1)
// ============================================================================
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DE LÂMPADAS E EFEITOS DE LUZ DIA/NOITE (v1.52.1) ===\n');

// 1. Simular ambiente de navegador
const window = {
    currentMap: 'cidade',
    meuX: 60400,
    meuY: 500,
    tempoMundo: null,
    vfxMapa: [],
    mapaObjetos: [],
    document: {
        getElementById: () => null,
        addEventListener: () => {},
        body: { appendChild: () => {} },
        createElement: () => ({
            appendChild: () => {},
            classList: { toggle: () => {}, remove: () => {}, add: () => {}, contains: () => false },
            getContext: () => ({
                clearRect: () => {},
                fillRect: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                createRadialGradient: () => ({ addColorStop: () => {} }),
                save: () => {},
                restore: () => {},
                translate: () => {},
                stroke: () => {}
            })
        })
    }
};
global.window = window;
global.document = window.document;

// 2. Carregar o módulo sistema_dia_noite_cliente.js
const clienteCode = fs.readFileSync(path.join(__dirname, 'sistema_dia_noite_cliente.js'), 'utf8');
const clientFn = new Function('global', 'window', 'document', clienteCode);
clientFn(window, window, window.document);

// Carregar map-vfx-admin.js para testar desenhar e filtragem
const vfxCode = fs.readFileSync(path.join(__dirname, 'map-vfx-admin.js'), 'utf8');
const vfxFn = new Function('window', 'document', vfxCode);
vfxFn(window, window.document);

console.log('[1] Testando regras de horário para efeitos de luz (19:00 às 06:00 aceso, 06:00 às 19:00 apagado)');

// Meio-dia (12:00) -> Devem estar apagadas
assert.strictEqual(window.isLuzMapaAtiva({ horaDecimal: 12.0 }), false, '12:00h deve estar apagada');
assert.strictEqual(window.obterFatorLuzDiaNoite({ horaDecimal: 12.0 }), 0.0, '12:00h fator de luz deve ser 0.0');

// Tarde (17:30) -> Apagadas
assert.strictEqual(window.isLuzMapaAtiva({ horaDecimal: 17.5 }), false, '17:30h deve estar apagada');
assert.strictEqual(window.obterFatorLuzDiaNoite({ horaDecimal: 17.5 }), 0.0, '17:30h fator de luz deve ser 0.0');

// 18:00 (Início do entardecer) -> Apagadas
assert.strictEqual(window.isLuzMapaAtiva({ horaDecimal: 18.0 }), false, '18:00h deve estar apagada');

// 19:00 (Início da noite oficial) -> ACENDEM SOZINHAS!
assert.strictEqual(window.isLuzMapaAtiva({ horaDecimal: 19.0 }), true, '19:00h deve estar acesa');
assert.strictEqual(window.obterFatorLuzDiaNoite({ horaDecimal: 19.0 }), 1.0, '19:00h fator de luz deve ser 1.0');

// 22:00 (Noite plena) -> Acesas!
assert.strictEqual(window.isLuzMapaAtiva({ horaDecimal: 22.0 }), true, '22:00h deve estar acesa');
assert.strictEqual(window.obterFatorLuzDiaNoite({ horaDecimal: 22.0 }), 1.0, '22:00h fator de luz deve ser 1.0');

// 00:00 (Início da madrugada) -> Acesas no breu total!
assert.strictEqual(window.isLuzMapaAtiva({ horaDecimal: 0.0 }), true, '00:00h deve estar acesa');
assert.strictEqual(window.obterFatorLuzDiaNoite({ horaDecimal: 0.0 }), 1.0, '00:00h fator de luz deve ser 1.0');

// 03:00 (Madrugada profunda) -> Acesas!
assert.strictEqual(window.isLuzMapaAtiva({ horaDecimal: 3.0 }), true, '03:00h deve estar acesa');
assert.strictEqual(window.obterFatorLuzDiaNoite({ horaDecimal: 3.0 }), 1.0, '03:00h fator de luz deve ser 1.0');

// 05:30 (Amanhecer) -> Continuam acesas até as 06:00!
assert.strictEqual(window.isLuzMapaAtiva({ horaDecimal: 5.5 }), true, '05:30h deve continuar acesa');
assert.strictEqual(window.obterFatorLuzDiaNoite({ horaDecimal: 5.5 }), 1.0, '05:30h fator de luz deve ser 1.0');

// 06:00 (Amanhecer completo / Pleno dia) -> VOLTAM A APAGAR!
assert.strictEqual(window.isLuzMapaAtiva({ horaDecimal: 6.0 }), false, '06:00h deve apagar');
console.log('  OK: Regras de horário validadas com 100% de precisão (19:00 às 06:00 acesas, 06:00 às 19:00 apagadas)!');

console.log('\n[2] Testando identificação de efeitos com LUZ');
const tiposLuz = ['lampada', 'holofote', 'tocha', 'fogo', 'fogueira', 'brasa', 'lamparina', 'poste', 'estaca_flamejante'];
tiposLuz.forEach(tipo => {
    assert.strictEqual(window.isEfeitoLuz(tipo), true, `Tipo "${tipo}" deve ser reconhecido como luz`);
});

const tiposSemLuz = ['chuva', 'neve', 'folhas', 'grama', 'arvore', 'agua', 'ondas', 'cinzas'];
tiposSemLuz.forEach(tipo => {
    assert.strictEqual(window.isEfeitoLuz(tipo), false, `Tipo "${tipo}" NÃO deve ser reconhecido como luz`);
});
console.log('  OK: Todos os 9 tipos de luz e 8 tipos sem luz classificados corretamente!');

console.log('\n[3] Testando permanência no mesmo mapa e transição dinâmica (18:59 -> 19:00)');
// Simular jogador parado no mesmo mapa às 18:55
window.tempoMundo = { horaFormatada: '18:55', horaDecimal: 18.916, fase: 'entardecer', escuridao: 0.60 };
let fatorPre = window.obterFatorLuzDiaNoite();
assert.ok(fatorPre > 0 && fatorPre < 1.0, 'Às 18:55 está na rampa suave de acendimento');

// O relógio do servidor avança para 19:00 (mesmo mapa, sem reload)
window.tempoMundo = { horaFormatada: '19:00', horaDecimal: 19.0, fase: 'noite', escuridao: 0.70 };
let fator19h = window.obterFatorLuzDiaNoite();
assert.strictEqual(fator19h, 1.0, 'Às 19:00 as lâmpadas acendem totalmente sem trocar de mapa!');
assert.strictEqual(window.isLuzMapaAtiva(), true, 'isLuzMapaAtiva() retorna true às 19:00!');

// O relógio do servidor avança para 06:00 da manhã seguinte
window.tempoMundo = { horaFormatada: '06:00', horaDecimal: 6.0, fase: 'dia', escuridao: 0.0 };
let fator06h = window.obterFatorLuzDiaNoite();
assert.strictEqual(window.isLuzMapaAtiva(), false, 'Às 06:00 as lâmpadas apagam!');
console.log('  OK: Transição 18:55 -> 19:00h (acender sozinho) e -> 06:00h (apagar) no mesmo mapa aprovada!');

console.log('\n[4] Testando renderizador de VFX de mapa com lâmpadas reais de map_vfx.json');
const mapVfxReal = JSON.parse(fs.readFileSync(path.join(__dirname, 'map_vfx.json'), 'utf8'));
const soLampadas = mapVfxReal.filter(v => v.tipo === 'lampada');
window.vfxMapa = soLampadas;
window.currentMap = 'cidade';

let chamadasDesenho = 0;
let desenhouLampada = false;
window.ctx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    beginPath: () => {},
    arc: () => { chamadasDesenho++; desenhouLampada = true; },
    fill: () => {},
    stroke: () => {}
};
assert.ok(soLampadas.length >= 18, 'Deve haver pelo menos 18 lâmpadas em map_vfx.json');

// De dia (12:00): desenharVfxMapa não deve desenhar lâmpadas se editor fechado
window.tempoMundo = { horaFormatada: '12:00', horaDecimal: 12.0, fase: 'dia', escuridao: 0.0 };
chamadasDesenho = 0;
desenhouLampada = false;
window.desenharVfxMapa();
assert.strictEqual(desenhouLampada, false, 'De dia (12:00) as lâmpadas não devem desenhar efeitos na tela');

// De noite (20:00): desenharVfxMapa DEVE desenhar as 18 lâmpadas de Davahl!
window.tempoMundo = { horaFormatada: '20:00', horaDecimal: 20.0, fase: 'noite', escuridao: 0.70 };
chamadasDesenho = 0;
desenhouLampada = false;
window.desenharVfxMapa();
assert.strictEqual(desenhouLampada, true, 'À noite (20:00) as lâmpadas acesas desenham glow na tela');
assert.ok(chamadasDesenho > 0, 'As lâmpadas foram renderizadas com sucesso');
console.log(`  OK: De dia lâmpadas ficam 100% apagadas; à noite as 18 lâmpadas acendem (${chamadasDesenho} arcos desenhados)!`);

console.log('\nTODOS OS TESTES DE ATIVAÇÃO DE LÂMPADAS DIA/NOITE PASSARAM COM 100% DE SUCESSO! 💡☀️🌙');
