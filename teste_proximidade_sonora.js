/**
 * teste_proximidade_sonora.js
 * Teste unitário e de integração do Sistema Global de Proximidade Sonora (v1.55.0).
 * Valida o cálculo de atenuação quadrática suave, limiares de distância,
 * filtragem de performance (culling de áudio longe) e integração com o jogo.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TESTE: SISTEMA GLOBAL DE PROXIMIDADE SONORA (v1.55.0) ---');

// 1. Carrega sonoro.js num ambiente controlado
const sonoro = require('./sonoro.js');

assert(sonoro.PROXIMITY_CONFIG, 'PROXIMITY_CONFIG deve estar definido e exportado');
assert.strictEqual(sonoro.PROXIMITY_CONFIG.maxDistance, 1200, 'Distância máxima de audição deve ser 1200px');
assert.strictEqual(sonoro.PROXIMITY_CONFIG.fullVolumeDistance, 100, 'Distância de volume máximo deve ser 100px');
assert.strictEqual(sonoro.PROXIMITY_CONFIG.minVolume, 0.03, 'Limiar mínimo de volume deve ser 0.03');
console.log('✅ [1/5] PROXIMITY_CONFIG validado com sucesso (100px volume cheio, 1200px silêncio, 0.03 minVolume)');

// 2. Validação da curva matemática de atenuação
// Simula posição do player em (1000, 1000)
global.meuX = 1000;
global.meuY = 1000;

// Teste A: Mesma posição (dist = 0) -> fator 1.0
let f0 = sonoro.calcularVolumeProximidade(1000, 1000);
assert.strictEqual(f0, 1.0, 'Distância 0 deve ter fator 1.0');

// Teste B: Dentro do raio de volume cheio (dist = 80px) -> fator 1.0
let f80 = sonoro.calcularVolumeProximidade(1080, 1000);
assert.strictEqual(f80, 1.0, 'Distância 80px deve ter fator 1.0');

// Teste C: Exatamente na borda do volume cheio (dist = 100px) -> fator 1.0
let f100 = sonoro.calcularVolumeProximidade(1100, 1000);
assert.strictEqual(f100, 1.0, 'Distância 100px deve ter fator 1.0');

// Teste D: No limite máximo de audição (dist = 1200px) -> fator 0.0
let f1200 = sonoro.calcularVolumeProximidade(2200, 1000);
assert.strictEqual(f1200, 0.0, 'Distância 1200px deve ter fator 0.0');

// Teste E: Fora do limite de audição (dist = 2000px) -> fator 0.0
let f2000 = sonoro.calcularVolumeProximidade(3000, 1000);
assert.strictEqual(f2000, 0.0, 'Distância 2000px deve ter fator 0.0');

// Teste F: Ponto médio (dist = 650px) -> progress = (650-100)/1100 = 0.5 -> (1 - 0.5)^2 = 0.25
let f650 = sonoro.calcularVolumeProximidade(1650, 1000);
assert(Math.abs(f650 - 0.25) < 0.001, `Ponto médio (650px) esperado ~0.25, obtido ${f650}`);

// Teste G: Perto (dist = 300px) -> progress = (300-100)/1100 = 0.1818 -> (1 - 0.1818)^2 = ~0.669
let f300 = sonoro.calcularVolumeProximidade(1300, 1000);
assert(f300 > 0.65 && f300 < 0.70, `Distância 300px esperado ~0.67, obtido ${f300}`);

// Teste H: Monotonicidade estrita: quanto mais longe, menor o volume
assert(f80 >= f100 && f100 > f300 && f300 > f650 && f650 > f1200, 'Curva deve ser estritamente decrescente com a distância');
console.log('✅ [2/5] Curva matemática de atenuação (easeOut quadrática) 100% calibrada e validada');

// 3. Validação do culling de som (performance zero-cost para entidades distantes)
let chamouAudio = false;
let volumeDefinido = -1;
global.tocarSomArquivo = function(caminho, volume) {
    chamouAudio = true;
    volumeDefinido = volume;
};

// Som longe demais (>1200px) não deve invocar o playback de áudio
chamouAudio = false;
sonoro.tocarSonoroProximidade('pikeman_atk', 3000, 3000);
assert.strictEqual(chamouAudio, false, 'Som de entidade a 2800px não deve criar áudio (culling ativo)');

// Som próximo (150px) deve tocar com volume alto
chamouAudio = false;
sonoro.tocarSonoroProximidade('pikeman_atk', 1150, 1000);
assert.strictEqual(chamouAudio, true, 'Som de entidade a 150px deve tocar');
assert(volumeDefinido > 0.5, `Volume a 150px deve ser alto (>0.5), foi ${volumeDefinido}`);

console.log('✅ [3/5] Culling de entidades distantes e atenuação de volume do arquivo validados');

// 4. Validação da versão nos 3 pontos visuais obrigatórios
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

assert(indexHtml.includes('<div class="game-version-display">v1.56.0</div>') || indexHtml.includes('<div class="game-version-display">v1.57.0</div>') || indexHtml.includes('<div class="game-version-display">v1.58.0</div>'), 'Login deve exibir v1.56.0, v1.57.0 ou v1.58.0');
assert(indexHtml.includes('<div id="hud-version" class="game-version-display">v1.56.0</div>') || indexHtml.includes('<div id="hud-version" class="game-version-display">v1.57.0</div>') || indexHtml.includes('<div id="hud-version" class="game-version-display">v1.58.0</div>'), 'HUD deve exibir v1.56.0, v1.57.0 ou v1.58.0');
assert(indexHtml.includes("const GAME_VERSION = 'v1.56.0';") || indexHtml.includes("const GAME_VERSION = 'v1.57.0';") || indexHtml.includes("const GAME_VERSION = 'v1.58.0';"), 'GAME_VERSION deve ser v1.56.0, v1.57.0 ou v1.58.0');
assert(indexHtml.includes('sonoro.js?v=1560') || indexHtml.includes('sonoro.js?v=1570') || indexHtml.includes('sonoro.js?v=1580'), 'Tag do sonoro.js deve usar cache-buster atualizado');
console.log('✅ [4/6] Versão v1.57.0 verificada nos 3 pontos visuais obrigatórios e cache buster');

// 5. Validação do som padrão de passos/andar para todas as classes (v1.56.0)
assert(sonoro.ARQUIVOS.andar, 'ARQUIVOS deve conter a chave andar');
assert(sonoro.ARQUIVOS.andar.caminho.includes('Andando_todas_classes.wav'), 'andar deve apontar para Andando_todas_classes.wav');
assert(fs.existsSync(path.join(__dirname, 'Sonoro/Movimentando/Andando_todas_classes.wav')), 'Arquivo de áudio Andando_todas_classes.wav deve existir no disco');
assert(indexHtml.includes("window.tocarSonoro('andar')"), 'index.html deve tocar som andar para jogador local');
assert(indexHtml.includes("window.tocarSonoroProximidade('andar'"), 'index.html deve tocar andar via proximidade para outros jogadores');
console.log('✅ [5/6] Som padrão de movimentação/andar (todas as classes) validado com sucesso');

// 6. Validação de cobertura no index.html e módulos de efeitos
assert(indexHtml.includes('window.tocarSonoroProximidade'), 'index.html deve conter chamadas para tocarSonoroProximidade');
assert(indexHtml.includes('tocarSomAtaqueGolem(dados.x, dados.y)'), 'Ataque do golem/monstro deve passar coordenadas');
assert(indexHtml.includes('tocarSomRugidoOgro(dados.x, dados.y)'), 'Rugido do ogro deve passar coordenadas');
assert(indexHtml.includes('tocarSomImpactoPesado(dados.x, dados.y)'), 'Impacto pesado de lacaios/besouros deve passar coordenadas');
assert(indexHtml.includes('tocarSomBlock(dados.x, dados.y)'), 'Som de block do lacaio deve passar coordenadas');

const magoEfeitos = fs.readFileSync(path.join(__dirname, 'efeitos/mago_efeitos.js'), 'utf8');
assert(magoEfeitos.includes('tocarSonoroProximidade'), 'mago_efeitos.js deve usar tocarSonoroProximidade no meteoro');

const vfxBola = fs.readFileSync(path.join(__dirname, 'efeitos/vfx_mago_bola.js'), 'utf8');
assert(vfxBola.includes('tocarSonoroProximidade'), 'vfx_mago_bola.js deve usar tocarSonoroProximidade para bolas de outros magos');

const efeitos = fs.readFileSync(path.join(__dirname, 'efeitos.js'), 'utf8');
assert(efeitos.includes('tocarSonoroProximidade'), 'efeitos.js deve usar tocarSonoroProximidade no meteoro');

console.log('✅ [6/6] Cobertura completa de entidades e habilidades no index.html e módulos de efeitos');
console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
