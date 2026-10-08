'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const audioManagerSource = fs.readFileSync(path.join(root, 'audio-manager.js'), 'utf8');

function createAudioManager() {
    const played = [];
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
        meuX: 88,
        meuY: 84,
        currentMap: 'green',
        MAPAS_REGISTRY: { mundo: { id: 'mundo', x0: 100000, w: 88000 } },
        todosJogadores: {}
    };
    vm.runInNewContext(audioManagerSource, { window, Date, Math, Map, Object, Number, String });
    return { manager: window.AudioManager, played, window };
}

test('Malakar and minion attack sounds map to the supplied audio files', () => {
    const { manager } = createAudioManager();
    const defs = manager.SOUND_DEFINITIONS;
    const expected = {
        malakar_basic_attack: 'malakar-atk-basico-malakar.mp3',
        malakar_skill_1: 'malakar-skill-1.mp3',
        malakar_skill_2: 'malakar-skill-2.mp3',
        malakar_skill_3: 'malakar-skill-3.mp3',
        malakar_skill_4: 'malakar-skill-4.mp3',
        malakar_warrior_attack: 'malakar-gurreiro-atk-basico.mp3',
        malakar_archer_attack: 'malakar-arqueiro-atk-basico.mp3',
        malakar_mage_attack: 'malakar-mago-atk-basico.mp3',
        malakar_reaper_attack: 'malakar-ceifador-atk-basico.mp3',
        malakar_reaper_skill: 'malakar-ceifador-skill1.mp3',
        malakar_sniper_attack: 'malakar-sniper-atk-basico.mp3',
        malakar_sniper_skill: 'malakar-sniper-skill.mp3',
        malakar_cleric_heal: 'malakar-clerigo-cura.mp3',
        malakar_suffering_voice: 'phatphrogstudio-oni-demon-voice-demonic-laughter-477923.mp3'
    };
    Object.entries(expected).forEach(function ([key, filename]) {
        assert.ok(defs[key].src.endsWith('/' + filename), key + ' must use its supplied audio');
        const relativePath = decodeURIComponent(defs[key].src);
        assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath + ' must exist');
    });
    assert.equal(defs.malakar_warrior_attack.volume, 0.315);
    assert.equal(defs.malakar_archer_attack.volume, 0.315);
    assert.equal(defs.malakar_mage_attack.volume, 0.315);
    assert.equal(defs.malakar_reaper_attack.volume, 0.315);
    assert.equal(defs.malakar_sniper_attack.volume, 0.315);
    assert.equal(defs.malakar_reaper_skill.volume, 0.56);
    assert.equal(defs.malakar_sniper_skill.volume, 0.56);
});

test('Mage basic attacks play the supplied reduced-volume sound', () => {
    const { manager, played } = createAudioManager();
    manager.handleGameEvent({
        type: 'lord_malakar_attack',
        ownerId: 'mage-owner',
        attack: 'skull_mage',
        x: 100,
        y: 100,
        damage: 10
    });
    assert.equal(played.length, 1);
    assert.ok(played[0].src.endsWith('/malakar-mago-atk-basico.mp3'));
    assert.equal(played[0].volume, 0.315);
});

test('summon attacks play spatial audio at reduced volume and throttle overlapping hits', () => {
    const { manager, played } = createAudioManager();
    const event = {
        type: 'lord_malakar_attack',
        ownerId: 'malakar-player',
        attack: 'skull_archer',
        x: 100,
        y: 100,
        targetX: 120,
        targetY: 100
    };
    assert.equal(manager.handleGameEvent(event), true);
    assert.equal(manager.handleGameEvent(event), true);
    assert.equal(played.length, 1);
    assert.ok(played[0].src.endsWith('/malakar-arqueiro-atk-basico.mp3'));
    assert.equal(played[0].volume, 0.315);
});

test('Malakar sounds play on the current unified world map', () => {
    const { manager, played, window } = createAudioManager();
    window.currentMap = 'mundo';
    window.meuX = 143988;
    window.meuY = 13984;
    assert.equal(manager.handleGameEvent({
        type: 'lord_malakar_attack',
        ownerId: 'malakar-player',
        attack: 'skull_warrior',
        x: 144000,
        y: 14000
    }), true);
    assert.equal(played.length, 1);
    assert.ok(played[0].src.endsWith('/malakar-gurreiro-atk-basico.mp3'));
    assert.ok(played[0].volume > 0);
});

test('Reaper and fifth Sniper hits use their special attack sounds', () => {
    const { manager, played } = createAudioManager();
    manager.handleGameEvent({
        type: 'lord_malakar_attack', ownerId: 'reaper-owner',
        attack: 'reaper_spin', x: 100, y: 100, targets: [{ damage: 10 }]
    });
    manager.handleGameEvent({
        type: 'lord_malakar_attack', ownerId: 'sniper-owner',
        attack: 'sniper', fifthShot: true, x: 100, y: 100
    });
    assert.equal(played.length, 2);
    assert.ok(played[0].src.endsWith('/malakar-ceifador-skill1.mp3'));
    assert.ok(played[1].src.endsWith('/malakar-sniper-skill.mp3'));
    assert.ok(played[0].volume <= 0.56 && played[0].volume > 0.5);
    assert.ok(played[1].volume <= 0.56 && played[1].volume > 0.5);
});

test('Malakar cast, summon, basic attack, and cleric heal events trigger their matching audio', () => {
    const { manager, played, window } = createAudioManager();
    window.todosJogadores.owner = { x: 88, y: 84 };
    manager.handleGameEvent({
        type: 'lord_malakar_summon',
        ownerId: 'owner',
        entity: { type: 'skull_mage', x: 100, y: 100 }
    });
    manager.handleGameEvent({
        type: 'lord_malakar_summon',
        ownerId: 'owner',
        entity: { type: 'sniper', x: 100, y: 100 }
    });
    manager.handleGameEvent({ type: 'lord_malakar_link', ownerId: 'owner' });
    manager.handleGameEvent({ type: 'lord_malakar_suffering', ownerId: 'owner', active: true });
    manager.handleGameEvent({
        type: 'lord_malakar_blood_tether_hit', ownerId: 'owner', x: 100, y: 100
    });
    manager.handleGameEvent({ type: 'lord_malakar_heal', x: 100, y: 100 });
    assert.deepEqual(played.map(function (audio) { return audio.src.split('/').pop(); }), [
        'malakar-skill-1.mp3',
        'malakar-skill-4.mp3',
        'malakar-skill-2.mp3',
        'malakar-skill-3.mp3',
        'phatphrogstudio-oni-demon-voice-demonic-laughter-477923.mp3',
        'malakar-atk-basico-malakar.mp3',
        'malakar-clerigo-cura.mp3'
    ]);
});

test('Mortal Bond loops until its link ends and stops immediately', () => {
    const { manager, played, window } = createAudioManager();
    window.currentMap = 'mundo';
    window.meuX = 143988;
    window.meuY = 13984;
    window.todosJogadores.owner = { x: 144000, y: 14000 };

    manager.handleGameEvent({ type: 'lord_malakar_link', ownerId: 'owner' });
    assert.equal(played.length, 1);
    assert.ok(played[0].src.endsWith('/malakar-skill-2.mp3'));
    assert.equal(played[0].loop, true);
    assert.equal(played[0].paused, false);

    manager.handleGameEvent({ type: 'lord_malakar_link_end', ownerId: 'owner', reason: 'target_invalid' });
    assert.equal(played[0].paused, true);
});

test('Eternal Suffering loops while active and stops immediately when deactivated', () => {
    const { manager, played, window } = createAudioManager();
    window.currentMap = 'mundo';
    window.meuX = 143988;
    window.meuY = 13984;
    window.todosJogadores.owner = { x: 144000, y: 14000 };

    manager.handleGameEvent({ type: 'lord_malakar_suffering', ownerId: 'owner', active: true });
    const skillLoop = played.find(function (audio) { return audio.src.endsWith('/malakar-skill-3.mp3'); });
    assert.ok(skillLoop);
    assert.equal(skillLoop.loop, true);
    assert.equal(skillLoop.paused, false);

    manager.handleGameEvent({ type: 'lord_malakar_suffering', ownerId: 'owner', active: false });
    assert.equal(skillLoop.paused, true);
});

test('Tundra Dragon sounds use its supplied clips for flight, basic attack and both skills', () => {
    const { manager } = createAudioManager();
    const expected = {
        tundra_dragon_basic: 'dragon-tundra-atk basico.mp3',
        tundra_dragon_skill_1: 'dragon-tundra-skill 1.mp3',
        tundra_dragon_skill_2: 'Dragon-tundra-skill 2.mp3',
        tundra_dragon_flight: 'dragon-tundra-voando.mp3',
        tundra_dragon_sleep: 'dragon-tundra-dormindo.mp3'
    };
    Object.entries(expected).forEach(function ([id, filename]) {
        const def = manager.SOUND_DEFINITIONS[id];
        assert.ok(def.src.endsWith('/' + encodeURIComponent(filename)), id);
        const relativePath = decodeURIComponent(def.src);
        assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath + ' must exist');
    });
    assert.equal(manager.SOUND_DEFINITIONS.tundra_dragon_skill_1.loop, true);
    assert.equal(manager.SOUND_DEFINITIONS.tundra_dragon_flight.loop, true);
    assert.equal(manager.SOUND_DEFINITIONS.tundra_dragon_sleep.loop, true);
    assert.equal(manager.SOUND_DEFINITIONS.tundra_dragon_sleep.maxDistance, 300);
});

test('Tundra Dragon skill 1 loops for the vortex duration and stops on its end event', () => {
    const { manager, played, window } = createAudioManager();
    window.currentMap = 'mundo';
    window.meuX = 143988;
    window.meuY = 13984;
    manager.handleGameEvent({
        type: 'tundra_dragon_vortex_start', id: 'dragon-1', x: 144000, y: 14000, mapa: 'mundo'
    });
    const vortexLoop = played.find(function (audio) { return audio.src.endsWith('/dragon-tundra-skill%201.mp3'); });
    assert.ok(vortexLoop);
    assert.equal(vortexLoop.loop, true);
    assert.equal(vortexLoop.paused, false);

    manager.handleGameEvent({ type: 'tundra_dragon_vortex_end', id: 'dragon-1', mapa: 'mundo' });
    assert.equal(vortexLoop.paused, true);
});

test('Tundra Dragon basic breath and skill 2 dash play their supplied one-shot sounds', () => {
    const { manager, played, window } = createAudioManager();
    window.currentMap = 'mundo';
    window.meuX = 143988;
    window.meuY = 13984;
    manager.handleGameEvent({
        type: 'tundra_dragon_breath', id: 'dragon-1', x: 144000, y: 14000, mapa: 'mundo'
    });
    manager.handleGameEvent({
        type: 'tundra_dragon_dash', id: 'dragon-1', fromX: 144000, fromY: 14000, mapa: 'mundo'
    });
    assert.equal(played.length, 2);
    assert.ok(played[0].src.endsWith('/dragon-tundra-atk%20basico.mp3'));
    assert.ok(played[1].src.endsWith('/Dragon-tundra-skill%202.mp3'));
    assert.equal(played[0].loop, false);
    assert.equal(played[1].loop, false);
});
