// teste_v1_65_0_pantano_sombrio.js
const fs = require('fs');
const assert = require('assert');

console.log('=== TESTE DE VALIDAÇÃO: v1.65.0 - PÂNTANO SOMBRIO ===');

// 1. Registro em mapas-registry.js
const registry = require('./mapas-registry.js');
assert(registry, 'registry deve existir');
assert(registry.pantano_sombrio, 'pantano_sombrio deve estar registrado');
const regPant = registry.pantano_sombrio;
assert.strictEqual(regPant.id, 'pantano_sombrio');
assert.strictEqual(regPant.x0, 117200);
assert.strictEqual(regPant.w, 9600);
assert.strictEqual(regPant.h, 5400);
console.log('✓ Registro em mapas-registry.js OK: [117200, 126800) x [0, 5400)');

// 2. Sem sobreposição de faixas X entre os mapas
const ids = Object.keys(registry);
for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
        const m1 = registry[ids[i]];
        const m2 = registry[ids[j]];
        // Pula mapas especiais como testevisual se houver
        const overlapX = (m1.x0 < m2.x0 + m2.w) && (m2.x0 < m1.x0 + m1.w);
        if (overlapX && m1.id !== 'testevisual' && m2.id !== 'testevisual') {
            assert.fail(`Sobreposição detectada entre ${m1.id} e ${m2.id}!`);
        }
    }
}
console.log('✓ Nenhuma sobreposição de coordenadas X entre os mapas principais');

// 3. Módulo mapas/mapa_pantano_sombrio.js
const mapa = require('./mapas/mapa_pantano_sombrio.js');
assert(mapa, 'Módulo mapa_pantano_sombrio deve carregar com sucesso');
assert.strictEqual(mapa.COLS, 240);
assert.strictEqual(mapa.ROWS, 135);
assert.strictEqual(mapa.PANT_X0, 117200);
assert.strictEqual(mapa.PANT_X1, 126800);
assert.strictEqual(mapa.PANT_SPAWN.x, 121200);
assert.strictEqual(mapa.PANT_SPAWN.y, 2720);

// 4. Verificação de colisão do Spawn e Portal
assert.strictEqual(mapa.colidePantanoSombrio(mapa.PANT_SPAWN.x, mapa.PANT_SPAWN.y, 12), false, 'Spawn central deve ser livre de colisões');
assert.strictEqual(mapa.colidePantanoSombrio(117400, 2720, 12), false, 'Área do Portal deve ser navegável');
const distPortalSpawn = Math.hypot(mapa.PANT_SPAWN.x - 117400, mapa.PANT_SPAWN.y - 2720);
assert(distPortalSpawn > 3500, `Distância portal-spawn deve ser segura (>3500px): atual = ${distPortalSpawn}`);
console.log(`✓ Spawn e Portal testados: livres de colisão, distância segura = ${distPortalSpawn.toFixed(0)}px`);

// 5. Testes de Projéteis
assert.strictEqual(mapa.colideProjetilPantanoSombrio(mapa.PANT_SPAWN.x, mapa.PANT_SPAWN.y), false, 'Projétil em área aberta não deve colidir');
assert.strictEqual(mapa.colideProjetilPantanoSombrio(mapa.PANT_X0 + 10, mapa.PANT_SPAWN.y), true, 'Borda do mapa bloqueia projétil');
console.log('✓ Colisões de projéteis OK');

// 6. Verificações em index.html
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(indexHtml.includes('v1.65.0'), 'index.html deve conter v1.65.0');
assert(indexHtml.includes('const GAME_VERSION = \'v1.65.0\';'), 'GAME_VERSION deve ser v1.65.0');
assert(indexHtml.includes('const WORLD_WIDTH = 126800;'), 'WORLD_WIDTH deve ser 126800');
assert(indexHtml.includes('data-mapa="pantano_sombrio"'), 'Botão do portal de viagem para pantano_sombrio deve existir');
assert(indexHtml.includes('🐊 Pântano Sombrio'), 'Nome legível do portal deve existir');
assert(indexHtml.includes('desenharCenarioPantanoSombrio'), 'Renderizador desenharCenarioPantanoSombrio deve estar integrado no loop principal');
assert(indexHtml.includes('coletarPantanoSombrioSortables'), 'coletarPantanoSombrioSortables deve estar integrado no sortables');
assert(indexHtml.includes('pantano_sombrio: "#0e180d"'), 'Cor de fundo do mapa deve estar integrada');
assert(!indexHtml.includes('canvas-pixi-visual'), 'canvas-pixi-visual NÃO deve existir no index.html');
console.log('✓ index.html 100% verificado e livre do canvas Pixi');

// 7. Verificações em server.js
const serverJs = fs.readFileSync('server.js', 'utf8');
assert(serverJs.includes('mapas/mapa_pantano_sombrio.js'), 'server.js deve requerer mapa_pantano_sombrio.js');
assert(serverJs.includes('LARGURA_PANTANO_SOMBRIO'), 'server.js deve definir LARGURA_PANTANO_SOMBRIO');
assert(serverJs.includes('colidePantanoSombrio'), 'server.js deve chamar colidePantanoSombrio em colideMapaJogador');
assert(serverJs.includes('colideProjetilPantanoSombrio'), 'server.js deve verificar colideProjetilPantanoSombrio em projéteis');
assert(serverJs.includes('pantano_sombrio: { x: 121200, y: 2700 }'), 'PONTOS_TELEPORTE deve ter pantano_sombrio');
assert(serverJs.includes("destino === 'pantano_sombrio'"), 'jogadorPodeUsarPortalMapa deve aceitar pantano_sombrio');
console.log('✓ server.js 100% integrado com física e permissão de teleporte no portal de Davahl');

// 8. Verificações em CHANGELOG.md, INFO_PROJETO.md, REGRAS_IA.md
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const infoProjeto = fs.readFileSync('INFO_PROJETO.md', 'utf8');
const regrasIa = fs.readFileSync('REGRAS_IA.md', 'utf8');

assert(changelog.includes('v1.65.0'), 'CHANGELOG.md deve conter v1.65.0');
assert(infoProjeto.includes('v1.65.0'), 'INFO_PROJETO.md deve conter v1.65.0');
assert(regrasIa.includes('v1.65.0'), 'REGRAS_IA.md deve conter v1.65.0');
console.log('✓ Documentação sincronizada em CHANGELOG.md, INFO_PROJETO.md e REGRAS_IA.md com v1.65.0');

console.log('\n=== TODOS OS 8 TESTES FORAM APROVADOS COM SUCESSO! ===');
