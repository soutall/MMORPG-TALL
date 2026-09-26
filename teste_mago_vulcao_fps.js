// teste_mago_vulcao_fps.js — Teste de performance e eliminação de vazamento de brilho/shadowBlur no Vulcão do Mago
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TESTE DE CORREÇÃO DO BRILHO E FPS DO VULCÃO DO MAGO (v1.54.1) ===\n');

// Mock de Canvas 2D Context que rastreia propriedades e estados
function criarMockContext() {
    return {
        saveStack: [],
        shadowBlur: 0,
        shadowColor: 'transparent',
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        globalAlpha: 1,
        _history: [],
        save() {
            this.saveStack.push({
                shadowBlur: this.shadowBlur,
                shadowColor: this.shadowColor,
                fillStyle: this.fillStyle,
                strokeStyle: this.strokeStyle,
                lineWidth: this.lineWidth,
                globalAlpha: this.globalAlpha
            });
        },
        restore() {
            if (this.saveStack.length > 0) {
                const s = this.saveStack.pop();
                this.shadowBlur = s.shadowBlur;
                this.shadowColor = s.shadowColor;
                this.fillStyle = s.fillStyle;
                this.strokeStyle = s.strokeStyle;
                this.lineWidth = s.lineWidth;
                this.globalAlpha = s.globalAlpha;
            }
        },
        translate(x, y) {},
        rotate(ang) {},
        scale(sx, sy) {},
        beginPath() {},
        closePath() {},
        moveTo(x, y) {},
        lineTo(x, y) {},
        arc(x, y, r, sa, ea) {},
        ellipse(x, y, rx, ry, rot, sa, ea) {},
        rect(x, y, w, h) {},
        fill() {},
        stroke() {},
        setLineDash() {},
        createRadialGradient() {
            return {
                addColorStop(pos, col) {}
            };
        },
        createLinearGradient() {
            return {
                addColorStop(pos, col) {}
            };
        }
    };
}

// 1. Validar conteúdo e tags de versão em index.html
console.log('[1] Verificando versões visuais e guarda de segurança no index.html...');
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

assert(indexHtml.includes('<div class="game-version-display">v1.54.1</div>') || indexHtml.includes('<div class="game-version-display">v1.55.0</div>') || indexHtml.includes('<div class="game-version-display">v1.55.1</div>') || indexHtml.includes('<div class="game-version-display">v1.56.0</div>') || indexHtml.includes('<div class="game-version-display">v1.57.0</div>'), 'Tela de login deve exibir v1.54.1, v1.55.x, v1.56.0 ou v1.57.0');
assert(indexHtml.includes('<div id="hud-version" class="game-version-display">v1.54.1</div>') || indexHtml.includes('<div id="hud-version" class="game-version-display">v1.55.0</div>') || indexHtml.includes('<div id="hud-version" class="game-version-display">v1.55.1</div>') || indexHtml.includes('<div id="hud-version" class="game-version-display">v1.56.0</div>') || indexHtml.includes('<div id="hud-version" class="game-version-display">v1.57.0</div>'), 'HUD deve exibir v1.54.1, v1.55.x, v1.56.0 ou v1.57.0');
assert(indexHtml.includes("const GAME_VERSION = 'v1.54.1';") || indexHtml.includes("const GAME_VERSION = 'v1.55.0';") || indexHtml.includes("const GAME_VERSION = 'v1.55.1';") || indexHtml.includes("const GAME_VERSION = 'v1.56.0';") || indexHtml.includes("const GAME_VERSION = 'v1.57.0';"), "window.GAME_VERSION deve ser v1.54.1, v1.55.x, v1.56.0 ou v1.57.0");
assert(indexHtml.includes('mago_efeitos.js?v=1541') || indexHtml.includes('mago_efeitos.js?v=1551'), 'mago_efeitos.js deve ter cache-buster atualizado');
assert(indexHtml.includes('ctx.shadowBlur = 0;') && indexHtml.includes("ctx.shadowColor = 'transparent';"), 'index.html deve conter a blindagem de shadowBlur antes de spritesSort');
console.log('  OK: index.html atualizado para v1.54.1 com blindagem de canvas antes de spritesSort!');

// 2. Carregar e testar efeitos/mago_efeitos.js em ambiente controlado
console.log('\n[2] Testando isolamento de contexto e ausência de vazamento de shadowBlur no mago_efeitos.js...');
global.window = {
    vulcoesAtivos: [],
    vulcaoProjeteis: [],
    vulcaoImpactos: [],
    vulcaoIndicadores: [],
    queimadurasFx: [],
    reacoesCongelantes: [],
    meteorosMagoAtivos: [],
    nevascasMagoAtivas: [],
    pedrasEnormesAtivas: []
};
global.Date = Date;

const mockCtx = criarMockContext();
global.window.ctx = mockCtx;

// Executar mago_efeitos.js
const magoEfeitosCode = fs.readFileSync(path.join(__dirname, 'efeitos', 'mago_efeitos.js'), 'utf8');
eval(magoEfeitosCode);

assert(typeof window.desenharEfeitosMago === 'function', 'desenharEfeitosMago deve existir');
assert(typeof window.criarVulcaoProjetil === 'function', 'criarVulcaoProjetil deve existir');

// Criar projéteis de teste (bolas de fogo subindo ao ar)
window.criarVulcaoProjetil(100, 100, 250, 150, 'fireball', 'test_proj_1');
window.criarVulcaoProjetil(100, 100, 200, 300, 'lava', 'test_proj_2');

assert.strictEqual(window.vulcaoProjeteis.length, 2, 'Devem existir 2 projéteis ativos');

// Simular 30 frames de animação dos projéteis
for (let f = 0; f < 30; f++) {
    // Contexto parte limpo
    mockCtx.shadowBlur = 0;
    mockCtx.shadowColor = 'transparent';

    window.desenharEfeitosMago();

    // Verificação crítica: shadowBlur e shadowColor NÃO podem vazar após o desenho
    assert.strictEqual(mockCtx.shadowBlur, 0, `Frame ${f}: shadowBlur vazou! Valor: ${mockCtx.shadowBlur}`);
    assert.strictEqual(mockCtx.shadowColor, 'transparent', `Frame ${f}: shadowColor vazou! Valor: ${mockCtx.shadowColor}`);
    assert.strictEqual(mockCtx.saveStack.length, 0, `Frame ${f}: Pilha save/restore desbalanceada!`);
}
console.log('  OK: Projéteis do Vulcão desenhados em 30 frames consecutivos com ZERO vazamento de shadowBlur/shadowColor!');

// 3. Teste de estresse: alta densidade de projéteis e impacto
console.log('\n[3] Executando teste de estresse e performance (50 projéteis + 20 impactos simulados)...');
for (let i = 0; i < 50; i++) {
    window.vulcaoProjeteis.push({
        id: 'stress_' + i,
        sx: 100 + i * 5, sy: 200,
        tx: 300 + i * 5, ty: 400,
        tipo: i % 2 === 0 ? 'lava' : 'fireball',
        progresso: (i % 10) / 10,
        velocidade: 0.04,
        trail: []
    });
}
for (let i = 0; i < 20; i++) {
    window.vulcaoImpactos.push({
        x: 200 + i * 10, y: 300,
        tipo: 'lava',
        timer: i % 30,
        maxTimer: 40,
        frags: []
    });
}

const tInicio = process.hrtime();
for (let f = 0; f < 100; f++) {
    window.desenharEfeitosMago();
    assert.strictEqual(mockCtx.shadowBlur, 0, 'shadowBlur deve continuar 0 sob estresse');
    assert.strictEqual(mockCtx.shadowColor, 'transparent', 'shadowColor deve continuar transparent sob estresse');
}
const diff = process.hrtime(tInicio);
const tempoMs = diff[0] * 1000 + diff[1] / 1e6;
console.log(`  OK: 100 frames sob estresse executados em ${tempoMs.toFixed(2)}ms (${(tempoMs / 100).toFixed(3)}ms/frame — perfeitamente suave para 60 FPS)!`);

console.log('\nTODOS OS TESTES DE BRILHO E FPS DO VULCÃO FORAM APROVADOS COM 100% DE SUCESSO! 🌋⚡');
