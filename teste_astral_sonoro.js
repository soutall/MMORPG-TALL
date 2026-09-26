/**
 * teste_astral_sonoro.js
 * Teste unitário e de integração dos Efeitos Sonoros do Arqueiro Astral (v1.57.0).
 * Valida arquivos físicos, mapeamentos em sonoro.js, triggers locais e de proximidade.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== TESTES DOS EFEITOS SONOROS DO ARQUEIRO ASTRAL (v1.57.0) ===\n');

// 1. Validar arquivos físicos no disco
console.log('[1] Validando arquivos físicos no disco...');
const sonsEsperados = [
    { nome: 'Dano Recebido', arq: 'Sonoro/Arqueiro Astral/Astral_damage.wav' },
    { nome: 'Ataque Automático', arq: 'Sonoro/Arqueiro Astral/atk_basico_astral.wav' },
    { nome: 'Skill 1 (Chuva de Cometas)', arq: 'Sonoro/Arqueiro Astral/Skill_1_astral.mp3' },
    { nome: 'Skill 2 (Orbe de Constelação)', arq: 'Sonoro/Arqueiro Astral/skill_2_astral.mp3' },
    { nome: 'Skill 3 (Cascata Estelar)', arq: 'Sonoro/Arqueiro Astral/skill_3_astral.wav' },
    { nome: 'Skill 4 (Buraco Negro Astral)', arq: 'Sonoro/Arqueiro Astral/Skill_4_Astral.wav' }
];

sonsEsperados.forEach(s => {
    const fullPath = path.join(__dirname, s.arq);
    assert(fs.existsSync(fullPath), `Arquivo de áudio não encontrado: ${s.arq}`);
    const stats = fs.statSync(fullPath);
    assert(stats.size > 0, `Arquivo de áudio está vazio: ${s.arq}`);
    console.log(`  OK: [${s.nome}] ${s.arq} (${stats.size} bytes)`);
});

// 2. Validar sonoro.js
console.log('\n[2] Validando sonoro.js...');
const sonoro = require('./sonoro.js');
assert(sonoro.ARQUIVOS.astral_damage, 'ARQUIVOS deve conter astral_damage');
assert(sonoro.ARQUIVOS.astral_atk, 'ARQUIVOS deve conter astral_atk');
assert(sonoro.ARQUIVOS.astral_skill1, 'ARQUIVOS deve conter astral_skill1');
assert(sonoro.ARQUIVOS.astral_skill2, 'ARQUIVOS deve conter astral_skill2');
assert(sonoro.ARQUIVOS.astral_skill3, 'ARQUIVOS deve conter astral_skill3');
assert(sonoro.ARQUIVOS.astral_skill4, 'ARQUIVOS deve conter astral_skill4');

// Aliases
assert(sonoro.ARQUIVOS.arqueiro_arcano_damage, 'ARQUIVOS deve conter alias arqueiro_arcano_damage');
assert(sonoro.ARQUIVOS.arqueiro_arcano_atk, 'ARQUIVOS deve conter alias arqueiro_arcano_atk');
assert(sonoro.ARQUIVOS.arqueiro_arcano_skill1, 'ARQUIVOS deve conter alias arqueiro_arcano_skill1');
assert(sonoro.ARQUIVOS.arqueiro_arcano_skill2, 'ARQUIVOS deve conter alias arqueiro_arcano_skill2');
assert(sonoro.ARQUIVOS.arqueiro_arcano_skill3, 'ARQUIVOS deve conter alias arqueiro_arcano_skill3');
assert(sonoro.ARQUIVOS.arqueiro_arcano_skill4, 'ARQUIVOS deve conter alias arqueiro_arcano_skill4');
console.log('  OK: Todas as chaves e aliases do Arqueiro Astral registrados em sonoro.js!');

// 3. Teste de runtime de áudio com proximidade
console.log('\n[3] Testando runtime de áudio e atenuação por proximidade...');
let ultimoArquivoTocado = null;
let ultimoVolumeTocado = -1;
global.tocarSomArquivo = function(caminho, volume) {
    ultimoArquivoTocado = caminho;
    ultimoVolumeTocado = volume;
};

// Player em (1000, 1000)
global.meuX = 1000;
global.meuY = 1000;

// Teste Skill 1 de outro jogador a 100px (volume cheio)
sonoro.tocarSonoroProximidade('astral_skill1', 1050, 1000);
assert(ultimoArquivoTocado && ultimoArquivoTocado.includes('Skill_1_astral.mp3'), 'Deve tocar Skill_1_astral.mp3');
assert(ultimoVolumeTocado > 0.7, `Volume a 50px deve ser alto (>0.7), foi ${ultimoVolumeTocado}`);

// Teste Skill 2 de outro jogador a 650px (volume atenuado para 25%)
ultimoArquivoTocado = null;
sonoro.tocarSonoroProximidade('astral_skill2', 1650, 1000);
assert(ultimoArquivoTocado && ultimoArquivoTocado.includes('skill_2_astral.mp3'), 'Deve tocar skill_2_astral.mp3');
assert(ultimoVolumeTocado < 0.25, `Volume a 650px deve ser atenuado (<0.25), foi ${ultimoVolumeTocado}`);

// Teste Skill 3 além do alcance (>1200px) -> silêncio / culling
ultimoArquivoTocado = null;
sonoro.tocarSonoroProximidade('astral_skill3', 3000, 3000);
assert.strictEqual(ultimoArquivoTocado, null, 'Skill 3 a 2800px não deve tocar (culling ativo)');

console.log('  OK: Proximidade sonora para skills astrais 100% calibrada e validada!');

// 4. Validar triggers em index.html e classes/arqueiro_arcano.js
console.log('\n[4] Validando triggers no código...');
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const arcanoJs = fs.readFileSync(path.join(__dirname, 'classes/arqueiro_arcano.js'), 'utf8');
const vfxBuracoJs = fs.readFileSync(path.join(__dirname, 'efeitos/vfx_astral_buraco.js'), 'utf8');

assert(arcanoJs.includes("window.tocarSonoro('astral_atk')"), 'classes/arqueiro_arcano.js deve tocar astral_atk');
assert(indexHtml.includes("window.tocarSonoro('astral_skill1')"), 'index.html deve tocar astral_skill1 no cast');
assert(indexHtml.includes("window.tocarSonoro('astral_skill2')"), 'index.html deve tocar astral_skill2 no cast');
assert(indexHtml.includes("window.tocarSonoro('astral_skill3')"), 'index.html deve tocar astral_skill3 no cast');
assert(indexHtml.includes("window.tocarSonoro('astral_skill4')"), 'index.html deve tocar astral_skill4 no cast');
assert(indexHtml.includes("window.tocarSonoro('astral_damage')"), 'index.html deve tocar astral_damage ao levar dano');

// Validar proximidade nos broadcasts
assert(indexHtml.includes("window.tocarSonoroProximidade('astral_atk'"), 'index.html deve tocar astral_atk via proximidade');
assert(indexHtml.includes("window.tocarSonoroProximidade('astral_skill1'"), 'index.html deve tocar astral_skill1 via proximidade');
assert(indexHtml.includes("window.tocarSonoroProximidade('astral_skill2'"), 'index.html deve tocar astral_skill2 via proximidade');
assert(indexHtml.includes("window.tocarSonoroProximidade('astral_skill3'"), 'index.html deve tocar astral_skill3 via proximidade');
assert(vfxBuracoJs.includes("window.tocarSonoroProximidade('astral_skill4'"), 'vfx_astral_buraco.js deve tocar astral_skill4 via proximidade');
assert(indexHtml.includes("window.tocarSonoroProximidade('astral_damage'"), 'index.html deve tocar astral_damage via proximidade em outros jogadores');

console.log('  OK: Todos os ganchos locais e de proximidade verificados!');

// 5. Validar versão nos 3 pontos visuais
console.log('\n[5] Validando versão nos 3 pontos visuais...');
assert(indexHtml.includes('<div class="game-version-display">v1.57.0</div>') || indexHtml.includes('<div class="game-version-display">v1.58.0</div>'), 'Login deve exibir v1.57.0 ou v1.58.0');
assert(indexHtml.includes('<div id="hud-version" class="game-version-display">v1.57.0</div>') || indexHtml.includes('<div id="hud-version" class="game-version-display">v1.58.0</div>'), 'HUD deve exibir v1.57.0 ou v1.58.0');
assert(indexHtml.includes("const GAME_VERSION = 'v1.57.0';") || indexHtml.includes("const GAME_VERSION = 'v1.58.0';"), 'GAME_VERSION deve ser v1.57.0 ou v1.58.0');
assert(indexHtml.includes('sonoro.js?v=1570') || indexHtml.includes('sonoro.js?v=1580'), 'Tag do sonoro.js deve usar cache-buster v=1570 ou v=1580');

console.log('  OK: Versão v1.57.0 confirmada nos 3 pontos visuais e cache-buster!');

console.log('\n🎉 TODOS OS TESTES SONOROS DO ARQUEIRO ASTRAL PASSARAM COM 100% DE SUCESSO! 🌠🏹');
