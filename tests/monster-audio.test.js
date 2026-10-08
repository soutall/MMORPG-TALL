'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const audioManagerSource = fs.readFileSync(path.join(root, 'audio-manager.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function createAudioHarness() {
    const played = [];
    const timers = [];
    let nextTimerId = 1;
    class MockAudio {
        constructor(src) {
            this.src = src;
            this.volume = 1;
            this.loop = false;
            this.paused = true;
            played.push(this);
        }

        play() {
            this.paused = false;
            return Promise.resolve();
        }

        pause() {
            this.paused = true;
        }
    }
    const window = {
        Audio: MockAudio,
        addEventListener() {},
        setInterval() {},
        setTimeout(callback, delay) {
            const timer = { id: nextTimerId++, callback, delay, cleared: false };
            timers.push(timer);
            return timer.id;
        },
        clearTimeout(id) {
            const timer = timers.find(function (entry) { return entry.id === id; });
            if (timer) timer.cleared = true;
        },
        meuX: 1000,
        meuY: 1000,
        currentMap: 'mundo',
        MAPAS_REGISTRY: { mundo: { id: 'mundo', x0: 100000, w: 88000 } }
    };
    vm.runInNewContext(audioManagerSource, {
        window, Date, Math, Map, Object, Number, String, Array
    });
    return { manager: window.AudioManager, played, timers, window };
}

test('each requested monster sound uses an existing file from its supplied sprite folder', () => {
    const { manager } = createAudioHarness();
    const expected = {
        monster_slime_walk: 'sprites/monstros/slime/slime-andando.mp3',
        monster_slime_attack: 'sprites/monstros/slime/slime-atacando.mp3',
        monster_mushroom_attack: 'sprites/monstros/cogumelo_50cc70dc/cogumelo-atk.mp3',
        monster_mushroom_hit: 'sprites/monstros/cogumelo_50cc70dc/cogumelo-acertou-efeito.mp3',
        monster_beetle_attack: 'sprites/monstros/besouro dourado_f71ed54d/besouro-atk.mp3',
        monster_beetle_flight: 'sprites/monstros/besouro dourado_f71ed54d/besouro-voando.mp3',
        monster_beetle_skill: 'sprites/monstros/besouro dourado_f71ed54d/besouro_skill.mp3',
        monster_anaconda_brown_walk: 'sprites/monstros/anaconda_marrom_53b6e531/anaconda-marrom-andando.mp3',
        monster_anaconda_brown_attack: 'sprites/monstros/anaconda_marrom_53b6e531/anaconda-marrom-atk.mp3',
        monster_anaconda_walk: 'sprites/monstros/anaconda_b42dd2b8/anaconda-andando.mp3',
        monster_anaconda_attack: 'sprites/monstros/anaconda_b42dd2b8/anaconda_atacando.mp3',
        monster_hawk_attack: 'sprites/monstros/gaviao_335f3d57/gaviao-atk.mp3',
        monster_hawk_flight: 'sprites/monstros/gaviao_335f3d57/gaviao-voando.mp3',
        monster_druaase_attack: 'sprites/monstros/druaerussa_tundra_eb93f50d/druaerussa-atk.mp3',
        monster_owl_attack: 'sprites/monstros/coruja branca_2fe25484/coruja-ataque.mp3',
        monster_owl_skill: 'sprites/monstros/coruja branca_2fe25484/coruja-skill.mp3',
        monster_owl_flight: 'sprites/monstros/coruja branca_2fe25484/coruja-voando.mp3',
        monster_ant_attack: 'sprites/monstros/formiga a_4f74a16a/formiga-atacando.mp3'
    };
    for (const [id, relativePath] of Object.entries(expected)) {
        const definition = manager.SOUND_DEFINITIONS[id];
        assert.ok(definition, `missing sound definition ${id}`);
        assert.equal(decodeURIComponent(definition.src), relativePath);
        assert.ok(fs.statSync(path.join(root, relativePath)).isFile(), relativePath);
        assert.ok(definition.maxDistance > 0, `${id} must use spatial attenuation`);
    }
    for (const id of [
        'monster_slime_walk', 'monster_beetle_flight', 'monster_anaconda_brown_walk',
        'monster_anaconda_walk', 'monster_hawk_flight', 'monster_owl_flight'
    ]) {
        assert.equal(manager.SOUND_DEFINITIONS[id].loop, true, `${id} is a movement loop`);
    }
    assert.equal(manager.SOUND_DEFINITIONS.monster_mushroom_hit.loop, true);
});

test('monster attack effects are positional, proximity-limited, and use the supplied attack clips', () => {
    const { manager, played, window } = createAudioHarness();
    const attacks = [
        ['slime', 'monster_slime_attack'],
        ['cogumelo_proibido', 'monster_mushroom_attack'],
        ['besouro_dourado', 'monster_beetle_attack'],
        ['anaconda_selvagem', 'monster_anaconda_attack'],
        ['jararaca', 'monster_anaconda_brown_attack'],
        ['gaviao', 'monster_hawk_attack'],
        ['druaase_tundra', 'monster_druaase_attack'],
        ['coruja_branca_tundra', 'monster_owl_attack'],
        ['formiga_sauva', 'monster_ant_attack']
    ];
    for (const [monsterType, soundId] of attacks) {
        const before = played.length;
        manager.handleGameEvent({
            type: 'monster_audio_attack',
            monsterType,
            x: 1020,
            y: 1020,
            mapa: 'mundo'
        });
        assert.equal(played.length, before + 1, `expected a nearby ${monsterType} attack sound`);
        assert.ok(played.at(-1).src.endsWith(manager.SOUND_DEFINITIONS[soundId].src.split('/').at(-1)));
        assert.equal(played.at(-1).loop, false);
    }

    window.meuX = 6000;
    const beforeFarEvent = played.length;
    manager.handleGameEvent({
        type: 'monster_audio_attack',
        monsterType: 'slime',
        x: 1020,
        y: 1020,
        mapa: 'mundo'
    });
    assert.equal(played.length, beforeFarEvent, 'attack sound must not play outside its configured audible range');
});

test('monster movement loops are only started when moving and audible within proximity range', () => {
    const { manager, played } = createAudioHarness();
    const active = Object.create(null);
    const previous = { x: 1020, y: 1020, aiEstado: 'walk', hp: 100 };
    const movingSlime = { id: 'slime-1', tipo: 'slime', x: 1030, y: 1020, aiEstado: 'walk', hp: 100 };
    manager.updateMonsterMovementSound(movingSlime, previous, active);
    assert.equal(played.length, 1);
    assert.equal(played[0].loop, true);
    assert.equal(active['monster_move:slime-1'], true);

    const farBeetle = { id: 'beetle-1', tipo: 'besouro_dourado', x: 2000, y: 1020, aiEstado: 'run', hp: 100 };
    const beforeFarMove = played.length;
    manager.updateMonsterMovementSound(farBeetle,
        { x: 1990, y: 1020, aiEstado: 'run', hp: 100 }, active);
    assert.equal(played.length, beforeFarMove, 'movement audio stays silent outside the sound radius');
});

test('Mushroom hit effect loops for its five-second debuff, then stops', () => {
    const { manager, played, timers } = createAudioHarness();
    manager.handleGameEvent({
        type: 'cogumelo_veneno_acerto',
        id: 'mushroom-1',
        soundKey: 'mushroom-hit:1',
        x: 1020,
        y: 1020,
        mapa: 'mundo',
        duration: 5000
    });
    assert.equal(played.length, 1);
    assert.equal(played[0].loop, true);
    assert.equal(timers[0].delay, 5000);
    assert.equal(played[0].paused, false);
    timers[0].callback();
    assert.equal(played[0].paused, true);
});

test('provided beetle and owl skill sounds respond to their existing game events', () => {
    const { manager, played } = createAudioHarness();
    manager.handleGameEvent({
        type: 'action_besouro_decolagem', id: 'beetle-1', x: 1020, y: 1020, mapa: 'mundo'
    });
    manager.handleGameEvent({
        type: 'tundra_owl_scream_start', id: 'owl-1', x: 1020, y: 1020, mapa: 'mundo'
    });
    assert.equal(played.length, 2);
    assert.ok(played[0].src.endsWith('/besouro_skill.mp3'));
    assert.ok(played[1].src.endsWith('/coruja-skill.mp3'));
});

test('existing Louvadermi movement, hit, attack and skill sounds are preserved', () => {
    const { manager, played } = createAudioHarness();
    const active = Object.create(null);
    const previous = {
        id: 'louvadermi-1', tipo: 'louvadermi', x: 1020, y: 1020,
        hp: 100, aiEstado: 'walk', aiAtacandoAte: 0, aiSkillAt: 0
    };
    manager.updateMonsterMovementSound({
        ...previous, x: 1030
    }, previous, active);
    manager.updateMonsterMovementSound({
        ...previous, hp: 90, aiAtacandoAte: 100, aiSkillAt: 100
    }, previous, Object.create(null));
    assert.ok(played.some(function (audio) { return audio.src.endsWith('/passos_selva_cc0.ogg'); }));
    assert.ok(played.some(function (audio) { return audio.src.endsWith('/impacto_selva_cc0.ogg'); }));
    assert.ok(played.some(function (audio) { return audio.src.endsWith('/ataque_louva_cc0.ogg'); }));
});

test('server emits the monster attack, mushroom-hit and owl-skill events, and client reconciles movement loops', () => {
    assert.match(serverSource, /function enviarAudioAtaqueMonstro\(slime\)/);
    assert.match(serverSource, /enviarAudioAtaqueMonstro\(slime\)/);
    assert.match(serverSource, /'cogumelo_veneno_acerto'/);
    assert.match(serverSource, /'tundra_owl_scream_start'/);
    assert.match(clientSource, /updateMonsterMovementSound\(mob, anterior, activeLoops\)/);
    assert.match(clientSource, /activeMonsterAudioLoops\[loopKey\]/);
});
