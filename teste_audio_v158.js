// teste_audio_v158.js - Verificação da atualização v1.58.0 de áudio, VFX e HUD
const fs = require('fs');
const path = require('path');

let falhas = 0;
function assert(cond, msg) {
    if (!cond) {
        console.error('❌ FALHA: ' + msg);
        falhas++;
    } else {
        console.log('✅ OK: ' + msg);
    }
}

console.log('--- 1. VERIFICAÇÃO DE ARQUIVOS DE ÁUDIO NO DISCO ---');
const arquivosNecessarios = [
    'Sonoro/DroneMaster/Protocolo_Titan.wav',
    'Sonoro/DroneMaster/modo assalto.wav',
    'Sonoro/DroneMaster/modo assalto_Impacto.wav',
    'Sonoro/Guerreiro/Guerreiro_damage.wav',
    'Sonoro/Guerreiro/Guerreiro_skill_4.wav',
    'Sonoro/Roqueiro/Roqueiro_damage.wav',
    'Sonoro/Roqueiro/Roqueiro_skill_4.mp3',
    'Sonoro/Sniper/Sniper_damage.wav',
    'Sonoro/Summoner/Summoner_damage.wav',
    'Sonoro/Summoner/Summoner_skill4_1 (1).wav',
    'Sonoro/Summoner/Summoner_skill4_1 (2).wav',
    'Sonoro/Summoner/Summoner_Skill4_3.wav'
];

for (const rel of arquivosNecessarios) {
    const full = path.join(__dirname, rel);
    assert(fs.existsSync(full), 'Arquivo de som encontrado: ' + rel);
}

console.log('\n--- 2. VERIFICAÇÃO DO REGISTRO EM SONORO.JS ---');
const sonoroCode = fs.readFileSync(path.join(__dirname, 'sonoro.js'), 'utf8');

assert(sonoroCode.includes("guerreiro_damage:") && sonoroCode.includes("'Sonoro/Guerreiro/Guerreiro_damage.wav'"), 'guerreiro_damage mapeado');
assert(sonoroCode.includes("guerreiro_skill4:") && sonoroCode.includes("'Sonoro/Guerreiro/Guerreiro_skill_4.wav'"), 'guerreiro_skill4 mapeado');
assert(sonoroCode.includes("dronemaster_tita:") && sonoroCode.includes("'Sonoro/DroneMaster/Protocolo_Titan.wav'"), 'dronemaster_tita .wav mapeado');
assert(sonoroCode.includes("dronemaster_assalto:") && sonoroCode.includes("'Sonoro/DroneMaster/modo%20assalto.wav'"), 'dronemaster_assalto .wav mapeado');
assert(sonoroCode.includes("dronemaster_assalto_impacto:") && sonoroCode.includes("'Sonoro/DroneMaster/modo%20assalto_Impacto.wav'"), 'dronemaster_assalto_impacto mapeado');
assert(sonoroCode.includes("roqueiro_damage:") && sonoroCode.includes("'Sonoro/Roqueiro/Roqueiro_damage.wav'"), 'roqueiro_damage mapeado');
assert(sonoroCode.includes("roqueiro_skill4:") && sonoroCode.includes("'Sonoro/Roqueiro/Roqueiro_skill_4.mp3'"), 'roqueiro_skill4 mapeado');
assert(sonoroCode.includes("sniper_damage:") && sonoroCode.includes("'Sonoro/Sniper/Sniper_damage.wav'"), 'sniper_damage mapeado');
assert(sonoroCode.includes("summoner_damage:") && sonoroCode.includes("'Sonoro/Summoner/Summoner_damage.wav'"), 'summoner_damage mapeado');
assert(sonoroCode.includes("summoner_skill4_1:") && sonoroCode.includes("'Sonoro/Summoner/Summoner_skill4_1%20(1).wav'"), 'summoner_skill4_1 mapeado');
assert(sonoroCode.includes("summoner_skill4_2:") && sonoroCode.includes("'Sonoro/Summoner/Summoner_skill4_1%20(2).wav'"), 'summoner_skill4_2 mapeado');
assert(sonoroCode.includes("summoner_skill4_fim:") && sonoroCode.includes("'Sonoro/Summoner/Summoner_Skill4_3.wav'"), 'summoner_skill4_fim mapeado');
assert(sonoroCode.includes("if (_bateriaAudio && !_bateriaAudio.paused && !_bateriaAudio.ended)"), 'Proteção contra cortes/restarts no som da Bateria');

console.log('\n--- 3. VERIFICAÇÃO DO INDEX.HTML ---');
const indexCode = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Versões
const vOccurrences = (indexCode.match(/v1\.58\.0/g) || []).length;
assert(vOccurrences >= 3, 'Pelo menos 3 ocorrências de v1.58.0 no index.html (encontrado: ' + vOccurrences + ')');
assert(indexCode.includes("classes/dronemaster.js?v=1005"), 'Cache-buster dronemaster.js v=1005');
assert(indexCode.includes("efeitos/vfx_guerreiro_escudo.js?v=2"), 'Cache-buster vfx_guerreiro_escudo.js v=2');
assert(indexCode.includes("efeitos/vfx_summoner_golem.js?v=3"), 'Cache-buster vfx_summoner_golem.js v=3');
assert(indexCode.includes("sonoro.js?v=1580"), 'Cache-buster sonoro.js v=1580');

// Botão Lançamento de Escudo
assert(indexCode.includes('if (btnGuerreiroEscudo) btnGuerreiroEscudo.style.display = "block";'), 'btnGuerreiroEscudo ativado no slot 4 do Guerreiro');

// Audio triggers
assert(indexCode.includes("window.tocarSonoro('guerreiro_skill4')"), 'Som dispararEscudo toca guerreiro_skill4');
assert(indexCode.includes("window.tocarSonoro('roqueiro_skill4')"), 'Som usarGritoDeGuerraRoqueiro toca roqueiro_skill4');
assert(indexCode.includes("window.tocarSonoro('guerreiro_damage')"), 'Dano local Guerreiro');
assert(indexCode.includes("window.tocarSonoro('roqueiro_damage')"), 'Dano local Roqueiro');
assert(indexCode.includes("window.tocarSonoro('sniper_damage')"), 'Dano local Sniper');
assert(indexCode.includes("window.tocarSonoro('summoner_damage')"), 'Dano local Summoner');
assert(indexCode.includes("window.tocarSonoroProximidade('guerreiro_damage', atual.x, atual.y)"), 'Dano proximidade Guerreiro');
assert(indexCode.includes("window.tocarSonoroProximidade('roqueiro_damage', atual.x, atual.y)"), 'Dano proximidade Roqueiro');
assert(indexCode.includes("window.tocarSonoroProximidade('sniper_damage', atual.x, atual.y)"), 'Dano proximidade Sniper');
assert(indexCode.includes("window.tocarSonoroProximidade('summoner_damage', atual.x, atual.y)"), 'Dano proximidade Summoner');
assert(indexCode.includes("action_dm_assalto_ataque"), 'Handler action_dm_assalto_ataque registrado');
assert(indexCode.includes("dronemaster_assalto_impacto"), 'dronemaster_assalto_impacto chamado');
assert(indexCode.includes("window.tocarSonoroProximidade('roqueiro_skill4', dados.x, dados.y)"), 'Grito de guerra proximity sound');

// Roqueiro bateria pararSomBateria geral
assert(indexCode.includes("if (dados.type === 'action_roqueiro_bateria_end') {") &&
       indexCode.includes("if (window.pararSomBateria) window.pararSomBateria();"), 'pararSomBateria executado para todos no end');

console.log('\n--- 4. VERIFICAÇÃO DE VFX E SERVER ---');
const vfxEscudo = fs.readFileSync(path.join(__dirname, 'efeitos/vfx_guerreiro_escudo.js'), 'utf8');
assert(vfxEscudo.includes('afterimages: []'), 'Afterimage Trail inicializado no escudo');
assert(vfxEscudo.includes('maxDist = dados.maxDist || 300'), 'Alcance máximo 300px configurado');
assert(vfxEscudo.includes("window.tocarSonoroProximidade('guerreiro_skill4'"), 'Som de proximidade guerreiro_skill4 no lançamento');

const vfxGolem = fs.readFileSync(path.join(__dirname, 'efeitos/vfx_summoner_golem.js'), 'utf8');
assert(vfxGolem.includes('summoner_skill4_1') && vfxGolem.includes('summoner_skill4_2'), 'Pulsos sonoros alternados no Golem');
assert(vfxGolem.includes('summoner_skill4_fim'), 'Som de finalização no Golem');

const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
assert(serverCode.includes("action_dm_assalto_ataque"), 'action_dm_assalto_ataque presente no server');
assert(serverCode.includes("action_roqueiro_bateria") && serverCode.includes("start: true"), 'roqueiro_bateria start payload no server');
assert(serverCode.includes("slime.pull"), 'Puxão físico de slimes implementado no server tick');

console.log('\n=============================================');
if (falhas === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO! (0 falhas)');
    process.exit(0);
} else {
    console.error(`❌ TESTE FALHOU com ${falhas} erro(s).`);
    process.exit(1);
}
