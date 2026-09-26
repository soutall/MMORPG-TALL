const assert = require('assert');

// Mock DOM
class MockElement {
    constructor(id) {
        this.id = id;
        this.innerText = '';
        this.title = '';
        this.classList = {
            classes: new Set(),
            add: (c) => this.classList.classes.add(c),
            remove: (...cs) => cs.forEach(c => this.classList.classes.delete(c)),
            contains: (c) => this.classList.classes.has(c)
        };
    }
}

const elements = {
    'relogio-texto': new MockElement('relogio-texto'),
    'relogio-icone': new MockElement('relogio-icone'),
    'minimap-relogio': new MockElement('minimap-relogio')
};

global.document = {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                width: 800,
                height: 600,
                getContext: () => ({
                    clearRect: () => {},
                    fillRect: () => {},
                    createRadialGradient: () => ({ addColorStop: () => {} }),
                    beginPath: () => {},
                    arc: () => {},
                    fill: () => {},
                    globalCompositeOperation: 'source-over',
                    fillStyle: ''
                })
            };
        }
        return new MockElement(tag);
    }
};

global.window = global;
global.floatingTexts = [];

// Carregar módulo cliente
const cliente = require('./sistema_dia_noite_cliente.js');

console.log('=== TESTES SISTEMA DIA/NOITE - CLIENTE (v1.52.0) ===\n');

// 1. Teste de atualização da UI do minimapa
console.log('[1] Atualização da UI do Relógio do Minimapa');

// Fase Dia
cliente.atualizarRelogioMinimapa({
    hora: 12,
    minuto: 0,
    horaFormatada: '12:00',
    fase: 'dia',
    icone: '☀️',
    escuridao: 0.0
});
assert.strictEqual(elements['relogio-texto'].innerText, '12:00');
assert.strictEqual(elements['relogio-icone'].innerText, '☀️');
assert.strictEqual(elements['minimap-relogio'].classList.contains('clock-dia'), true);
console.log('  OK: Fase Dia atualizou texto (12:00), ícone (☀️) e classe (clock-dia)');

// Fase Entardecer
cliente.atualizarRelogioMinimapa({
    hora: 18,
    minuto: 15,
    horaFormatada: '18:15',
    fase: 'entardecer',
    icone: '🌆',
    escuridao: 0.175
});
assert.strictEqual(elements['relogio-texto'].innerText, '18:15');
assert.strictEqual(elements['relogio-icone'].innerText, '🌆');
assert.strictEqual(elements['minimap-relogio'].classList.contains('clock-entardecer'), true);
assert.strictEqual(elements['minimap-relogio'].classList.contains('clock-dia'), false);
console.log('  OK: Fase Entardecer atualizou texto (18:15), ícone (🌆) e classe (clock-entardecer)');

// Fase Noite
cliente.atualizarRelogioMinimapa({
    hora: 22,
    minuto: 30,
    horaFormatada: '22:30',
    fase: 'noite',
    icone: '🌙',
    escuridao: 0.70
});
assert.strictEqual(elements['relogio-texto'].innerText, '22:30');
assert.strictEqual(elements['relogio-icone'].innerText, '🌙');
assert.strictEqual(elements['minimap-relogio'].classList.contains('clock-noite'), true);
assert.strictEqual(elements['minimap-relogio'].classList.contains('clock-entardecer'), false);
console.log('  OK: Fase Noite atualizou texto (22:30), ícone (🌙) e classe (clock-noite)');

// Fase Madrugada (00:00 às 04:00 - Breu 100%)
cliente.atualizarRelogioMinimapa({
    hora: 2,
    minuto: 15,
    horaFormatada: '02:15',
    fase: 'madrugada',
    icone: '🌑',
    escuridao: 1.00
});
assert.strictEqual(elements['relogio-texto'].innerText, '02:15');
assert.strictEqual(elements['relogio-icone'].innerText, '🌑');
assert.strictEqual(elements['minimap-relogio'].classList.contains('clock-madrugada'), true);
assert.strictEqual(elements['minimap-relogio'].classList.contains('clock-noite'), false);
console.log('  OK: Fase Madrugada atualizou texto (02:15), ícone (🌑) e classe (clock-madrugada)');

// Fase Amanhecer
cliente.atualizarRelogioMinimapa({
    hora: 5,
    minuto: 45,
    horaFormatada: '05:45',
    fase: 'amanhecer',
    icone: '🌅',
    escuridao: 0.175
});
assert.strictEqual(elements['relogio-texto'].innerText, '05:45');
assert.strictEqual(elements['relogio-icone'].innerText, '🌅');
assert.strictEqual(elements['minimap-relogio'].classList.contains('clock-amanhecer'), true);
console.log('  OK: Fase Amanhecer atualizou texto (05:45), ícone (🌅) e classe (clock-amanhecer)');

// 2. Teste do clique / notificação
console.log('\n[2] Interação ao clicar no relógio');
global.meuX = 1000;
global.meuY = 800;
global.tempoMundo = {
    horaFormatada: '23:00',
    fase: 'noite',
    icone: '🌙',
    escuridao: 0.70
};
cliente.notificarCicloDiaNoite();
assert.strictEqual(global.floatingTexts.length > 0, true);
assert.strictEqual(global.floatingTexts[0].text.includes('23:00'), true);
console.log('  OK: Notificação flutuante gerada: "' + global.floatingTexts[0].text + '"');

// 3. Teste do Renderizador (renderizarCicloDiaNoite)
console.log('\n[3] Renderização de Iluminação Dinâmica e Otimização');

let mockCtx = {
    canvas: { width: 1280, height: 720 },
    drawImage: () => { mockCtx.drawImageChamado = true; },
    save: () => {},
    restore: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    drawImageChamado: false
};

// 3a. Pleno dia -> Não deve desenhar nada (0ms overhead)
global.tempoMundo = { escuridao: 0.0, fase: 'dia' };
mockCtx.drawImageChamado = false;
cliente.renderizarCicloDiaNoite(mockCtx, 1000, 800, 0, 0, 1.0);
assert.strictEqual(mockCtx.drawImageChamado, false, 'Deveria ter pulado renderização durante o dia!');
console.log('  OK: Pleno dia (escuridão 0.0) encerra imediatamente sem chamadas de desenho');

// 3b. Noite -> Deve desenhar a camada de escuridão com recortes
global.tempoMundo = { escuridao: 0.70, fase: 'noite', horaDecimal: 22.0 };
global.ACAMPAMENTOS_MAPA = [{ fogueira: { x: 1800, y: 1100 } }];
global.currentMap = 'green';
mockCtx.drawImageChamado = false;
cliente.renderizarCicloDiaNoite(mockCtx, 1000, 800, 0, 0, 1.0);
assert.strictEqual(mockCtx.drawImageChamado, true, 'Deveria ter desenhado a camada de escuridão na noite!');
console.log('  OK: Noite (escuridão 0.70) gerou máscara com recortes de luz e desenhou na tela');

console.log('\nTODOS OS TESTES CLIENTE PASSARAM COM SUCESSO! ☀️🌙');
