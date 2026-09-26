// teste_mago_sonoro.js
// Teste automatizado para validar o sistema sonoro completo do Mago (v1.54.0)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== TESTES DOS EFEITOS SONOROS DO MAGO (v1.54.0) ===\n');

// 1. Validar existência física de todos os arquivos
const arquivosEsperados = [
    { nome: 'Auto atk', arq: 'Sonoro/Mago/atk-alto-mago.wav' },
    { nome: 'Dano', arq: 'Sonoro/Mago/damage_mago.wav' },
    { nome: 'Skill 1 (Caindo)', arq: 'Sonoro/Mago/meteo 1.wav' },
    { nome: 'Skill 1 (Impacto)', arq: 'Sonoro/Mago/meteo 2.wav' },
    { nome: 'Skill 3 (Fervendo)', arq: 'Sonoro/Mago/mago_lava_fervendo.ogg' },
    { nome: 'Skill 3 (Impacto .wav)', arq: 'Sonoro/Mago/mago_lava_Impacto.wav' },
    { nome: 'Skill 4 (Percorrer)', arq: 'Sonoro/Mago/mago_skill-4.wav' },
    { nome: 'Skill 4 (Impacto)', arq: 'Sonoro/Mago/mago_skill-4-impacto.wav' }
];

console.log('[1] Validando arquivos físicos no disco...');
for (const item of arquivosEsperados) {
    assert(fs.existsSync(item.arq), `Arquivo obrigatório não encontrado: ${item.arq}`);
    const st = fs.statSync(item.arq);
    assert(st.size > 0, `Arquivo está vazio: ${item.arq}`);
    console.log(`  OK: [${item.nome}] ${item.arq} (${st.size} bytes)`);
}

// 2. Validar sonoro.js
console.log('\n[2] Validando sonoro.js...');
const sonoroCode = fs.readFileSync('sonoro.js', 'utf8');

assert(sonoroCode.includes("mago_atk:              { caminho: 'Sonoro/Mago/atk-alto-mago.wav'"), 'sonoro.js deve mapear mago_atk');
assert(sonoroCode.includes("mago_damage:           { caminho: 'Sonoro/Mago/damage_mago.wav'"), 'sonoro.js deve mapear mago_damage');
assert(sonoroCode.includes("mago_meteoro_queda:    { caminho: 'Sonoro/Mago/meteo%201.wav'"), 'sonoro.js deve mapear mago_meteoro_queda');
assert(sonoroCode.includes("mago_meteoro_impacto:  { caminho: 'Sonoro/Mago/meteo%202.wav'"), 'sonoro.js deve mapear mago_meteoro_impacto');
assert(sonoroCode.includes("mago_lava_fervendo:    { caminho: 'Sonoro/Mago/mago_lava_fervendo.ogg'"), 'sonoro.js deve manter mago_lava_fervendo');
assert(sonoroCode.includes("mago_lava_impacto:     { caminho: 'Sonoro/Mago/mago_lava_Impacto.wav'"), 'sonoro.js deve trocar mago_lava_impacto para .wav');
assert(sonoroCode.includes("mago_skill4:           { caminho: 'Sonoro/Mago/mago_skill-4.wav'"), 'sonoro.js deve mapear mago_skill4');
assert(sonoroCode.includes("mago_skill4_impacto:   { caminho: 'Sonoro/Mago/mago_skill-4-impacto.wav'"), 'sonoro.js deve mapear mago_skill4_impacto');
assert(sonoroCode.includes("pararSomMagoSkill4"), 'sonoro.js deve implementar pararSomMagoSkill4');

console.log('  OK: Todos os mapeamentos e funções de controle validados em sonoro.js!');

// 3. Simulação de runtime de sonoro.js
console.log('\n[3] Testando runtime de áudio com sonoro.js...');
let playedSounds = [];
let audioInstances = [];

class MockAudio {
    constructor(src) {
        this.src = src;
        this.paused = true;
        this.volume = 1;
        this.currentTime = 0;
        audioInstances.push(this);
    }
    play() {
        this.paused = false;
        playedSounds.push({ action: 'play', src: this.src });
        return Promise.resolve();
    }
    pause() {
        this.paused = true;
        playedSounds.push({ action: 'pause', src: this.src });
    }
}

global.Audio = MockAudio;
global.window = global;

eval(sonoroCode);

// Testar disparo de mago_atk
global.tocarSonoro('mago_atk');
// Testar disparo de dano
global.tocarSonoro('mago_damage');
// Testar meteoro queda e impacto
global.tocarSonoro('mago_meteoro_queda');
global.tocarSonoro('mago_meteoro_impacto');
// Testar lava impacto
global.tocarSonoro('mago_lava_impacto');
// Testar skill 4 percorrer e colidir
global.tocarSonoro('mago_skill4');
const audioSkill4 = audioInstances.find(a => a.src.includes('mago_skill-4.wav'));
assert(audioSkill4, 'Instância de áudio da skill 4 deve ter sido criada');
assert.strictEqual(audioSkill4.paused, false, 'Skill 4 deve estar tocando enquanto a bola percorre');

// Testar colisão com monstro (impacto para o som de percorrer)
global.tocarSonoro('mago_skill4_impacto');
assert.strictEqual(audioSkill4.paused, true, 'Ao colidir/impactar, o som de rolamento deve parar');

console.log('  OK: Runtime de áudio e parada na colisão validados com sucesso!');

// 4. Validar index.html
console.log('\n[4] Validando triggers no index.html...');
const indexHtml = fs.readFileSync('index.html', 'utf8');

assert(indexHtml.includes("window.tocarSonoro('mago_atk')"), 'index.html deve tocar mago_atk');
assert(indexHtml.includes("window.tocarSonoro('mago_damage')"), 'index.html deve tocar mago_damage');
assert(indexHtml.includes("window.tocarSonoro('mago_meteoro_queda')"), 'index.html deve tocar mago_meteoro_queda');
assert(indexHtml.includes("window.tocarSonoro('mago_meteoro_impacto')"), 'index.html deve tocar mago_meteoro_impacto');
assert(indexHtml.includes("window.tocarSonoro('mago_lava_impacto')"), 'index.html deve tocar mago_lava_impacto');
assert(indexHtml.includes("window.tocarSonoro('mago_skill4')"), 'index.html deve tocar mago_skill4');
assert(indexHtml.includes("v1.54.") || indexHtml.includes("v1.55.") || indexHtml.includes("v1.56."), 'index.html deve estar na versão v1.54.x, v1.55.x ou v1.56.x');

console.log('  OK: Todos os triggers no index.html validados!');

// 5. Validar efeitos/vfx_mago_bola.js
console.log('\n[5] Validando efeitos/vfx_mago_bola.js...');
const vfxBolaCode = fs.readFileSync('efeitos/vfx_mago_bola.js', 'utf8');
assert(vfxBolaCode.includes("window.tocarSonoro('mago_skill4')"), 'vfx_mago_bola.js deve tocar mago_skill4 ao lançar');
assert(vfxBolaCode.includes("window.tocarSonoro('mago_skill4_impacto')"), 'vfx_mago_bola.js deve tocar mago_skill4_impacto ao colidir');
assert(vfxBolaCode.includes("window.pararSomMagoSkill4()"), 'vfx_mago_bola.js deve chamar pararSomMagoSkill4');

console.log('  OK: VFX da bola elemental perfeitamente sincronizado com áudios!');

// 6. Validar efeitos.js e mago_efeitos.js
console.log('\n[6] Validando efeitos.js e mago_efeitos.js...');
const efeitosCode = fs.readFileSync('efeitos.js', 'utf8');
const magoEfeitosCode = fs.readFileSync('efeitos/mago_efeitos.js', 'utf8');

assert(efeitosCode.includes("window.tocarSonoro('mago_meteoro_queda')"), 'efeitos.js deve disparar meteoro queda');
assert(efeitosCode.includes("window.tocarSonoro('mago_meteoro_impacto')"), 'efeitos.js deve disparar meteoro impacto');
assert(magoEfeitosCode.includes("window.tocarSonoro('mago_meteoro_queda')"), 'mago_efeitos.js deve disparar meteoro queda');
assert(magoEfeitosCode.includes("window.tocarSonoro('mago_meteoro_impacto')"), 'mago_efeitos.js deve disparar meteoro impacto');

console.log('  OK: Efeitos de queda e impacto do meteoro validados!');

console.log('\nTODOS OS TESTES DOS EFEITOS SONOROS DO MAGO PASSARAM COM 100% DE SUCESSO! 🔮⚡');
