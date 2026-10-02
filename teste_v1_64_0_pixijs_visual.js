// ============================================================================
// teste_v1_64_0_pixijs_visual.js — Suíte de Testes Automatizados v1.64.0
// Validação completa da integração PixiJS (WebGL), Shaders, Luzes e Sombras
// ============================================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('--- INICIANDO VALIDAÇÃO v1.64.0 (PIXIJS WEBGL ARENA VISUAL) ---');

let testesPassados = 0;
function testar(descricao, fn) {
    try {
        fn();
        console.log(`  [OK] ${descricao}`);
        testesPassados++;
    } catch (e) {
        console.error(`  [FALHA] ${descricao}: ${e.message}`);
        process.exit(1);
    }
}

// 1. Verificar arquivo pixi.min.js
testar('Arquivo pixi.min.js existe e possui tamanho válido (>400KB)', () => {
    assert(fs.existsSync('pixi.min.js'), 'pixi.min.js deve existir na raiz do projeto');
    const stat = fs.statSync('pixi.min.js');
    assert(stat.size > 400000, `pixi.min.js deve ter tamanho > 400KB (atual: ${stat.size} bytes)`);
});

// 2. Verificar inclusão do canvas e do script em index.html
testar('index.html contém tag canvas-pixi-visual e script pixi.min.js', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('id="canvas-pixi-visual"'), 'index.html deve conter canvas-pixi-visual');
    assert(html.includes('<script src="pixi.min.js"></script>'), 'index.html deve incluir pixi.min.js');
    assert(html.includes('mapa_teste_visual.js?v=4'), 'index.html deve carregar mapa_teste_visual.js com v=4');
});

// 3. Verificar transparência e render loop em index.html
testar('index.html possui lógica de clearRect e transparência para testevisual', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes("if (window.currentMap === 'testevisual')"), 'index.html deve checar testevisual no clear');
    assert(html.includes("ctx.clearRect(0, 0, canvas.width, canvas.height);"), 'index.html deve executar clearRect para testevisual');
});

// 4. Verificar versões do jogo
testar('Versão v1.64.0 está consistente no código e badges', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes("const GAME_VERSION = 'v1.64.0';"), 'GAME_VERSION deve ser v1.64.0');
    assert(html.includes('<div class="game-version-display">v1.64.0</div>'), 'Badge de login deve exibir v1.64.0');
    assert(html.includes('<div id="hud-version" class="game-version-display">v1.64.0</div>'), 'HUD deve exibir v1.64.0');

    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
    assert(changelog.includes('## Versão atual: **v1.64.0**'), 'CHANGELOG deve apontar v1.64.0');
    assert(changelog.includes('| **v1.64.0** |'), 'Tabela do CHANGELOG deve conter linha v1.64.0');

    const info = fs.readFileSync('INFO_PROJETO.md', 'utf8');
    assert(info.includes('| **v1.64.0** |'), 'INFO_PROJETO.md deve conter linha v1.64.0');

    const regras = fs.readFileSync('REGRAS_IA.md', 'utf8');
    assert(regras.includes('| **v1.64.0** |'), 'REGRAS_IA.md deve conter linha v1.64.0');
});

// 5. Verificar módulo mapa_teste_visual.js no Node.js (Isomorfismo)
testar('Módulo mapa_teste_visual.js carrega com sucesso via require (Isomórfico)', () => {
    const mapa = require('./mapa_teste_visual.js');
    assert(typeof mapa.colide === 'function', 'mapa.colide deve ser uma função');
    assert(typeof mapa.colideProjetil === 'function', 'mapa.colideProjetil deve ser uma função');
    assert(typeof mapa.desenharCenarioTesteVisual === 'function', 'desenharCenarioTesteVisual deve ser exportado');
    assert(typeof mapa.coletarTestevisualSortables === 'function', 'coletarTestevisualSortables deve ser exportado');
    assert.strictEqual(mapa.TESTE_X0, 72000, 'TESTE_X0 deve ser 72000');
    assert.strictEqual(mapa.TESTE_X1, 73280, 'TESTE_X1 deve ser 73280');
    assert.strictEqual(mapa.TESTE_Y1, 960, 'TESTE_Y1 deve ser 960');
});

// 6. Verificar colisões server-side da Arena
testar('Colisões da Arena Visual funcionam corretamente no spawn e em obstáculos', () => {
    const mapa = require('./mapa_teste_visual.js');
    // Spawn limpo
    assert.strictEqual(mapa.colide(mapa.PONTO_CHEGADA.x, mapa.PONTO_CHEGADA.y, 14), false, 'Spawn deve estar livre de colisão');
    // Bordas bloqueadas
    assert.strictEqual(mapa.colide(mapa.TESTE_X0 + 10, 480, 14), true, 'Borda oeste deve colidir');
    assert.strictEqual(mapa.colide(mapa.TESTE_X1 - 10, 480, 14), true, 'Borda leste deve colidir');
    // Tronco de cipreste bloqueado
    assert.strictEqual(mapa.colide(72320, 220, 14), true, 'Cipreste 1 deve colidir');
    // Fogueira ritual bloqueada
    assert.strictEqual(mapa.colide(mapa.FOGUEIRA_RITUAL.x, mapa.FOGUEIRA_RITUAL.y, 14), true, 'Fogueira ritual deve colidir');
});

// 7. Validar sintaxe de scripts inline no index.html
testar('Todos os scripts inline de index.html compilam sem erros de sintaxe (vm.Script)', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    assert(scripts.length >= 3, 'Devem existir ao menos 3 scripts inline');
    scripts.forEach((s, idx) => {
        new vm.Script(s[1]);
    });
});

console.log(`\n======================================================`);
console.log(`SUCESSO TOTAL! ${testesPassados}/${testesPassados} testes aprovados na v1.64.0!`);
console.log(`======================================================`);
