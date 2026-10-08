(function (global) {
    'use strict';

    const CATEGORY = {
        UI: 'ui',
        AMBIENT: 'ambient',
        PLAYER: 'player',
        MONSTER: 'monster',
        BOSS: 'boss',
        SKILL: 'skill',
        IMPORTANT: 'important'
    };

    const LIMITS = {
        ui: 8,
        ambient: 3,
        player: 8,
        monster: 8,
        boss: 4,
        skill: 12,
        important: 4
    };

    const DEFINITIONS = {
        skill_nevasca: { category: CATEGORY.SKILL, volume: 0.9, maxDistance: 200, rolloff: 1.1, loop: true, priority: 7 },
        skill_giro_berserker: { category: CATEGORY.SKILL, volume: 0.8, maxDistance: 200, rolloff: 1.0, loop: true, priority: 7 },
        skill_vulcao: { category: CATEGORY.SKILL, volume: 0.8, maxDistance: 1800, rolloff: 1.0, priority: 7 },
        skill_chuva: { category: CATEGORY.SKILL, volume: 0.55, maxDistance: 1500, rolloff: 1.1, priority: 5 },
        skill_arqueiro_rajada_carregar: { category: CATEGORY.SKILL, volume: 0.6, maxDistance: 800, rolloff: 1.1, priority: 6, src: 'Sonoro/arqueira/Rajada%20e%20Flechas%201.ogg' },
        skill_arqueiro_rajada_soltar:   { category: CATEGORY.SKILL, volume: 0.7, maxDistance: 900, rolloff: 1.0, priority: 6, src: 'Sonoro/arqueira/Rajada%20e%20Flechas%202.ogg' },
        skill_arqueiro_perfurante:      { category: CATEGORY.PLAYER, volume: 0.6, maxDistance: 600, rolloff: 1.1, priority: 5, src: 'Sonoro/arqueira/disparo%20perfurante.ogg' },
        skill_arqueiro_chuva_lancar:    { category: CATEGORY.SKILL, volume: 0.65, maxDistance: 1200, rolloff: 1.0, priority: 5, src: 'Sonoro/arqueira/chuva%20de%20flacha.ogg' },
        skill_arqueiro_ataque_basico:   { category: CATEGORY.PLAYER, volume: 0.5, maxDistance: 500, rolloff: 1.2, priority: 3, src: 'Sonoro/arqueira/atk_basico.ogg' },
        malakar_basic_attack: { category: CATEGORY.PLAYER, volume: 0.5, maxDistance: 650, rolloff: 1.2, priority: 4, src: 'Sonoro/Malakar/malakar-atk-basico-malakar.mp3' },
        malakar_skill_1: { category: CATEGORY.SKILL, volume: 0.8, maxDistance: 750, rolloff: 1.1, priority: 6, src: 'Sonoro/Malakar/malakar-skill-1.mp3' },
        malakar_skill_2: { category: CATEGORY.SKILL, volume: 0.8, maxDistance: 750, rolloff: 1.1, priority: 6, loop: true, src: 'Sonoro/Malakar/malakar-skill-2.mp3' },
        malakar_skill_3: { category: CATEGORY.SKILL, volume: 0.8, maxDistance: 750, rolloff: 1.1, priority: 6, loop: true, src: 'Sonoro/Malakar/malakar-skill-3.mp3' },
        malakar_skill_4: { category: CATEGORY.SKILL, volume: 0.8, maxDistance: 750, rolloff: 1.1, priority: 6, src: 'Sonoro/Malakar/malakar-skill-4.mp3' },
        malakar_suffering_voice: { category: CATEGORY.SKILL, volume: 0.65, maxDistance: 700, rolloff: 1.1, priority: 5, src: 'Sonoro/Malakar/phatphrogstudio-oni-demon-voice-demonic-laughter-477923.mp3' },
        malakar_warrior_attack: { category: CATEGORY.PLAYER, volume: 0.315, maxDistance: 520, rolloff: 1.2, priority: 3, src: 'Sonoro/Malakar/malakar-gurreiro-atk-basico.mp3' },
        malakar_archer_attack: { category: CATEGORY.PLAYER, volume: 0.315, maxDistance: 600, rolloff: 1.2, priority: 3, src: 'Sonoro/Malakar/malakar-arqueiro-atk-basico.mp3' },
        malakar_mage_attack: { category: CATEGORY.PLAYER, volume: 0.315, maxDistance: 750, rolloff: 1.2, priority: 3, src: 'Sonoro/Malakar/malakar-mago-atk-basico.mp3' },
        malakar_reaper_attack: { category: CATEGORY.PLAYER, volume: 0.315, maxDistance: 520, rolloff: 1.2, priority: 3, src: 'Sonoro/Malakar/malakar-ceifador-atk-basico.mp3' },
        malakar_reaper_skill: { category: CATEGORY.SKILL, volume: 0.56, maxDistance: 650, rolloff: 1.1, priority: 4, src: 'Sonoro/Malakar/malakar-ceifador-skill1.mp3' },
        malakar_sniper_attack: { category: CATEGORY.PLAYER, volume: 0.315, maxDistance: 850, rolloff: 1.2, priority: 3, src: 'Sonoro/Malakar/malakar-sniper-atk-basico.mp3' },
        malakar_sniper_skill: { category: CATEGORY.SKILL, volume: 0.56, maxDistance: 900, rolloff: 1.1, priority: 4, src: 'Sonoro/Malakar/malakar-sniper-skill.mp3' },
        malakar_cleric_heal: { category: CATEGORY.SKILL, volume: 0.8, maxDistance: 650, rolloff: 1.1, priority: 4, src: 'Sonoro/Malakar/malakar-clerigo-cura.mp3' },
        tundra_dragon_basic: { category: CATEGORY.BOSS, volume: 0.72, maxDistance: 700, rolloff: 1.1, priority: 6, src: 'sprites/monstros/dragon%20negro_aeecf00d/dragon-tundra-atk%20basico.mp3' },
        tundra_dragon_skill_1: { category: CATEGORY.SKILL, volume: 0.72, maxDistance: 850, rolloff: 1.1, loop: true, priority: 7, src: 'sprites/monstros/dragon%20negro_aeecf00d/dragon-tundra-skill%201.mp3' },
        tundra_dragon_skill_2: { category: CATEGORY.SKILL, volume: 0.78, maxDistance: 850, rolloff: 1.1, priority: 7, src: 'sprites/monstros/dragon%20negro_aeecf00d/Dragon-tundra-skill%202.mp3' },
        tundra_dragon_flight: { category: CATEGORY.MONSTER, volume: 0.16, maxDistance: 360, rolloff: 1.25, loop: true, priority: 2, src: 'sprites/monstros/dragon%20negro_aeecf00d/dragon-tundra-voando.mp3' },
        tundra_dragon_sleep: { category: CATEGORY.MONSTER, volume: 0.24, maxDistance: 300, rolloff: 1.2, loop: true, priority: 2, src: 'sprites/monstros/dragon%20negro_aeecf00d/dragon-tundra-dormindo.mp3' },
        boss_attack: { category: CATEGORY.BOSS, volume: 0.9, maxDistance: 200, rolloff: 1.0, priority: 8 },
           boss_impact: { category: CATEGORY.BOSS, volume: 0.9, maxDistance: 200, rolloff: 1.0, priority: 8 },
           boss_death: { category: CATEGORY.IMPORTANT, volume: 1, maxDistance: 2400, rolloff: 0.9, priority: 10 },
           slime_elite_hit: { category: CATEGORY.BOSS, volume: 0.75, maxDistance: 700, rolloff: 1.1, priority: 6, src: 'Sonoro/SOM%20GERAL/liq_slime_splash_01.ogg' },
           // "Walking through Mud" by Breviceps, CC0 1.0: https://freesound.org/people/Breviceps/sounds/508179
           slime_elite_move: { category: CATEGORY.MONSTER, volume: 0.14, maxDistance: 320, rolloff: 1.3, priority: 2, src: 'Sonoro/Slime/slime_elite_walk_cc0.mp3' },
           jungle_monster_move: { category: CATEGORY.MONSTER, volume: 0.12, maxDistance: 280, rolloff: 1.3, priority: 2, loop: true, src: 'Sonoro/Monstros/passos_selva_cc0.ogg' },
           jungle_monster_hit: { category: CATEGORY.MONSTER, volume: 0.38, maxDistance: 430, rolloff: 1.2, priority: 3, src: 'Sonoro/Monstros/impacto_selva_cc0.ogg' },
           jungle_mushroom_attack: { category: CATEGORY.MONSTER, volume: 0.38, maxDistance: 480, rolloff: 1.2, priority: 4, src: 'Sonoro/Monstros/ataque_cogumelo_cc0.ogg' },
           jungle_snake_attack: { category: CATEGORY.MONSTER, volume: 0.42, maxDistance: 460, rolloff: 1.2, priority: 4, src: 'Sonoro/Monstros/ataque_serpente_cc0.ogg' },
           jungle_mantis_attack: { category: CATEGORY.MONSTER, volume: 0.4, maxDistance: 480, rolloff: 1.2, priority: 4, src: 'Sonoro/Monstros/ataque_louva_cc0.ogg' },
           jungle_mushroom_skill: { category: CATEGORY.SKILL, volume: 0.48, maxDistance: 520, rolloff: 1.1, priority: 5, src: 'Sonoro/Monstros/ataque_cogumelo_cc0.ogg' },
           jungle_mantis_skill: { category: CATEGORY.SKILL, volume: 0.42, maxDistance: 500, rolloff: 1.1, priority: 5, src: 'Sonoro/Monstros/ataque_louva_cc0.ogg' },
           monster_slime_walk: { category: CATEGORY.MONSTER, volume: 0.16, maxDistance: 300, rolloff: 1.25, loop: true, priority: 2, src: 'sprites/monstros/slime/slime-andando.mp3' },
           monster_slime_attack: { category: CATEGORY.MONSTER, volume: 0.42, maxDistance: 460, rolloff: 1.15, priority: 4, src: 'sprites/monstros/slime/slime-atacando.mp3' },
           monster_mushroom_attack: { category: CATEGORY.MONSTER, volume: 0.4, maxDistance: 480, rolloff: 1.15, priority: 4, src: 'sprites/monstros/cogumelo_50cc70dc/cogumelo-atk.mp3' },
           monster_mushroom_hit: { category: CATEGORY.MONSTER, volume: 0.48, maxDistance: 420, rolloff: 1.1, loop: true, priority: 5, src: 'sprites/monstros/cogumelo_50cc70dc/cogumelo-acertou-efeito.mp3' },
           monster_beetle_attack: { category: CATEGORY.MONSTER, volume: 0.42, maxDistance: 460, rolloff: 1.15, priority: 4, src: 'sprites/monstros/besouro%20dourado_f71ed54d/besouro-atk.mp3' },
           monster_beetle_flight: { category: CATEGORY.MONSTER, volume: 0.16, maxDistance: 340, rolloff: 1.25, loop: true, priority: 2, src: 'sprites/monstros/besouro%20dourado_f71ed54d/besouro-voando.mp3' },
           monster_beetle_skill: { category: CATEGORY.MONSTER, volume: 0.48, maxDistance: 520, rolloff: 1.1, priority: 5, src: 'sprites/monstros/besouro%20dourado_f71ed54d/besouro_skill.mp3' },
           monster_anaconda_brown_walk: { category: CATEGORY.MONSTER, volume: 0.15, maxDistance: 300, rolloff: 1.25, loop: true, priority: 2, src: 'sprites/monstros/anaconda_marrom_53b6e531/anaconda-marrom-andando.mp3' },
           monster_anaconda_brown_attack: { category: CATEGORY.MONSTER, volume: 0.42, maxDistance: 460, rolloff: 1.15, priority: 4, src: 'sprites/monstros/anaconda_marrom_53b6e531/anaconda-marrom-atk.mp3' },
           monster_anaconda_walk: { category: CATEGORY.MONSTER, volume: 0.15, maxDistance: 300, rolloff: 1.25, loop: true, priority: 2, src: 'sprites/monstros/anaconda_b42dd2b8/anaconda-andando.mp3' },
           monster_anaconda_attack: { category: CATEGORY.MONSTER, volume: 0.42, maxDistance: 460, rolloff: 1.15, priority: 4, src: 'sprites/monstros/anaconda_b42dd2b8/anaconda_atacando.mp3' },
           monster_hawk_attack: { category: CATEGORY.MONSTER, volume: 0.42, maxDistance: 480, rolloff: 1.15, priority: 4, src: 'sprites/monstros/gaviao_335f3d57/gaviao-atk.mp3' },
           monster_hawk_flight: { category: CATEGORY.MONSTER, volume: 0.16, maxDistance: 380, rolloff: 1.25, loop: true, priority: 2, src: 'sprites/monstros/gaviao_335f3d57/gaviao-voando.mp3' },
           monster_druaase_attack: { category: CATEGORY.MONSTER, volume: 0.42, maxDistance: 460, rolloff: 1.15, priority: 4, src: 'sprites/monstros/druaerussa_tundra_eb93f50d/druaerussa-atk.mp3' },
           monster_owl_attack: { category: CATEGORY.MONSTER, volume: 0.42, maxDistance: 460, rolloff: 1.15, priority: 4, src: 'sprites/monstros/coruja%20branca_2fe25484/coruja-ataque.mp3' },
           monster_owl_skill: { category: CATEGORY.MONSTER, volume: 0.48, maxDistance: 520, rolloff: 1.1, priority: 5, src: 'sprites/monstros/coruja%20branca_2fe25484/coruja-skill.mp3' },
           monster_owl_flight: { category: CATEGORY.MONSTER, volume: 0.16, maxDistance: 360, rolloff: 1.25, loop: true, priority: 2, src: 'sprites/monstros/coruja%20branca_2fe25484/coruja-voando.mp3' },
           monster_ant_attack: { category: CATEGORY.MONSTER, volume: 0.4, maxDistance: 430, rolloff: 1.15, priority: 4, src: 'sprites/monstros/formiga%20a_4f74a16a/formiga-atacando.mp3' },
           monster_attack: { category: CATEGORY.MONSTER, volume: 0.55, maxDistance: 500, rolloff: 1.2, priority: 3 },
           player_attack: { category: CATEGORY.PLAYER, volume: 0.45, maxDistance: 500, rolloff: 1.2, priority: 3 },
           impact: { category: CATEGORY.SKILL, volume: 0.7, maxDistance: 500, rolloff: 1.1, priority: 5 }
    };
    DEFINITIONS.skill_vulcao.maxDistance = 800;
    DEFINITIONS.skill_chuva.maxDistance = 500;

    let context = null;
    let masterGain = null;
    let categoryGains = {};
    let muted = { master: false, sfx: false, ambient: false };
    const loops = new Map();
    const timedLoopTimers = new Map();
    const voices = [];
    const malakarAttackLastPlayed = new Map();
    let lastUpdate = 0;

    function definition(id, options) {
        return Object.assign({}, DEFINITIONS[id] || DEFINITIONS.impact, options || {});
    }

    function ensureContext() {
        if (context) {
            if (context.state === 'suspended') context.resume().catch(function () {});
            return true;
        }
        const AudioCtor = global.AudioContext || global.webkitAudioContext;
        if (!AudioCtor) return false;
        context = new AudioCtor();
        masterGain = context.createGain();
        masterGain.gain.value = Number(global.volumeGeral) || 0.8;
        masterGain.connect(context.destination);
        Object.keys(LIMITS).forEach(function (category) {
            const gain = context.createGain();
            gain.gain.value = 1;
            gain.connect(masterGain);
            categoryGains[category] = gain;
        });
        if (context.state === 'suspended') context.resume().catch(function () {});
        return true;
    }

    function unlock() {
        ensureContext();
    }

    ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (eventName) {
        global.addEventListener(eventName, unlock, { passive: true });
    });

    function currentMap() {
        return global.currentMap || 'green';
    }

    function mapFromX(x) {
        const value = Number(x) || 0;
        const maps = global.MAPAS_REGISTRY || {};
        const mapIds = Object.keys(maps);
        for (let i = 0; i < mapIds.length; i++) {
            const map = maps[mapIds[i]];
            if (value >= map.x0 && value < map.x0 + map.w) return map.id || mapIds[i];
        }
        if (value >= (global.LARGURA_CIDADE_PERDIDA || 65040)) return 'cidadeperdida';
        if (value >= (global.LARGURA_SOLARI || 63800)) return 'solari';
        if (value >= (global.LARGURA_CIDADE || 59800) && value < (global.FIM_CIDADE || 61174)) return 'cidade';
        if (value >= (global.LARGURA_PANTANO || 58000)) return 'caverna';
        if (value >= (global.LARGURA_DESERTO || 50000)) return 'pantano';
        if (value >= (global.LARGURA_VERDE || 18000)) return 'desert';
        return 'green';
    }

    function listenerPosition() {
        return { x: (Number(global.meuX) || 0) + 12, y: (Number(global.meuY) || 0) + 16 };
    }

    function distanceData(x, y) {
        const listener = listenerPosition();
        const dx = (Number(x) || 0) - listener.x;
        const dy = (Number(y) || 0) - listener.y;
        const distanceSq = dx * dx + dy * dy;
        return { dx, dy, distance: Math.sqrt(distanceSq), distanceSq };
    }

    function attenuation(distance, config) {
        if (distance >= config.maxDistance) return 0;
        const progress = Math.max(0, Math.min(1, distance / config.maxDistance));
        return config.minVolume === undefined ? Math.pow(1 - progress, config.rolloff || 1) : Math.max(config.minVolume, Math.pow(1 - progress, config.rolloff || 1));
    }

    function panValue(dx, dy) {
        const angle = Number(global.meuAngulo) || 0;
        const rightX = -Math.sin(angle);
        const rightY = Math.cos(angle);
        return Math.max(-1, Math.min(1, (dx * rightX + dy * rightY) / 700));
    }

    function categoryVolume(category) {
        if (category === CATEGORY.AMBIENT) return muted.ambient ? 0 : 1;
        if (category === CATEGORY.UI) return 1;
        return muted.sfx ? 0 : 1;
    }

    function trimVoices(config) {
        const categoryVoices = voices.filter(function (voice) { return voice.category === config.category && !voice.done; });
        const limit = LIMITS[config.category] || 8;
        if (categoryVoices.length < limit) return true;
        categoryVoices.sort(function (a, b) { return a.priority - b.priority || b.startedAt - a.startedAt; });
        if (categoryVoices[0].priority > config.priority) return false;
        stopVoice(categoryVoices[0]);
        return true;
    }

    function stopVoice(voice) {
        if (!voice || voice.done) return;
        voice.done = true;
        if (voice.element) {
            voice.element.pause();
            try { voice.element.currentTime = 0; } catch (e) {}
            return;
        }
        try { voice.gain.gain.cancelScheduledValues(context.currentTime); voice.gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.04); } catch (e) {}
        try { voice.source.stop(context.currentTime + 0.06); } catch (e) {}
    }

    function createVoice(config, volume, pan) {
        // Spatial control only: real assets must provide `src`. Never synthesize gameplay audio here.
        if (!config.src || typeof global.Audio !== 'function' || !trimVoices(config)) return null;
        const element = new global.Audio(config.src);
        element.loop = !!config.loop;
        element.volume = Math.max(0, Math.min(1, volume));
        element.play().catch(function () {});
        const voice = { element, category: config.category, priority: config.priority, startedAt: Date.now(), done: false };
        voices.push(voice);
        element.onended = function () { voice.done = true; };
        return voice;
    }

    function playSpatial(id, options) {
        options = options || {};
        const config = definition(id, options);
        if (options.mapa && options.mapa !== currentMap()) return null;
        const data = distanceData(options.x, options.y);
        const volume = (options.volume === undefined ? config.volume : options.volume) * attenuation(data.distance, config) * categoryVolume(config.category);
        if (volume <= 0) return null;
        return createVoice(config, volume, panValue(data.dx, data.dy));
    }

    function playGlobal(id, options) {
        options = options || {};
        const config = definition(id, options);
        const volume = (options.volume === undefined ? config.volume : options.volume) * categoryVolume(config.category);
        if (volume <= 0) return null;
        return createVoice(config, volume, 0);
    }

    function startLoop(id, options) {
        options = options || {};
        const key = options.key || id;
        stopLoop(key);
        const config = definition(id, Object.assign({}, options, { loop: true }));
        const loop = { key, id, options, config, voice: null, stopped: false };
        loops.set(key, loop);
        updateLoop(loop);
        return key;
    }

    function startTimedLoop(id, options, durationMs) {
        options = options || {};
        const key = options.key || id;
        const previousTimer = timedLoopTimers.get(key);
        if (previousTimer) global.clearTimeout(previousTimer);
        startLoop(id, Object.assign({}, options, { key }));
        const timer = global.setTimeout(function () {
            timedLoopTimers.delete(key);
            stopLoop(key);
        }, Math.max(0, Number(durationMs) || 0));
        timedLoopTimers.set(key, timer);
        return key;
    }

    function updateLoop(loop) {
        if (!loop || loop.stopped) return;
        if (!loop.config.src) return;
        const options = loop.options;
        const followedPlayer = options.followPlayerId && global.todosJogadores
            ? global.todosJogadores[options.followPlayerId] : null;
        if (followedPlayer) {
            options.x = followedPlayer.x + 12;
            options.y = followedPlayer.y + 16;
        }
        if (options.mapa && options.mapa !== currentMap()) {
            if (loop.voice) stopVoice(loop.voice);
            loop.voice = null;
            return;
        }
        const data = distanceData(options.x, options.y);
        const volume = (options.volume === undefined ? loop.config.volume : options.volume) * attenuation(data.distance, loop.config) * categoryVolume(loop.config.category);
        if (volume <= 0) {
            if (loop.voice) stopVoice(loop.voice);
            loop.voice = null;
            return;
        }
        if (!loop.voice || loop.voice.done) loop.voice = createVoice(loop.config, volume, panValue(data.dx, data.dy));
        if (loop.voice && loop.voice.element) loop.voice.element.volume = Math.max(0, Math.min(1, volume));
    }

    function stopLoop(key) {
        const loop = loops.get(key);
        const timer = timedLoopTimers.get(key);
        if (timer) {
            global.clearTimeout(timer);
            timedLoopTimers.delete(key);
        }
        if (!loop) return;
        loop.stopped = true;
        if (loop.voice) stopVoice(loop.voice);
        loops.delete(key);
    }

    function updateSpatialLoop(key, options) {
        const loop = loops.get(key);
        if (!loop) return false;
        Object.assign(loop.options, options || {});
        updateLoop(loop);
        return true;
    }

    function update() {
        const now = Date.now();
        if (now - lastUpdate < 80) return;
        lastUpdate = now;
        loops.forEach(updateLoop);
        for (let i = voices.length - 1; i >= 0; i--) if (voices[i].done) voices.splice(i, 1);
    }

    function stopMapSounds() {
        loops.forEach(function (loop) {
            if (loop.options.mapa) stopLoop(loop.key);
        });
    }

    function setMapAmbient(mapa) {
        loops.forEach(function (loop) {
            if (loop.options.ambient) stopLoop(loop.key);
        });
    }

    function stopAll() {
        loops.forEach(function (loop) { stopLoop(loop.key); });
        voices.slice().forEach(stopVoice);
    }

    function eventPosition(data) {
        if (typeof data.x === 'number' && typeof data.y === 'number') return { x: data.x, y: data.y };
        if (typeof data.targetX === 'number' && typeof data.targetY === 'number') return { x: data.targetX, y: data.targetY };
        const playerId = data.id || data.ownerId;
        const player = playerId && global.todosJogadores ? global.todosJogadores[playerId] : null;
        return player ? { x: player.x + 12, y: player.y + 16 } : null;
    }

    function playMalakarAttackSound(data) {
        const soundByAttack = {
            skull_warrior: 'malakar_warrior_attack',
            skull_archer: 'malakar_archer_attack',
            skull_mage: 'malakar_mage_attack',
            reaper: 'malakar_reaper_attack',
            reaper_spin: 'malakar_reaper_skill',
            sniper: data.fifthShot ? 'malakar_sniper_skill' : 'malakar_sniper_attack'
        };
        const soundId = soundByAttack[data.attack];
        if (!soundId || (Array.isArray(data.targets) && data.targets.length === 0)) return;

        const now = Date.now();
        const ownerKey = String(data.ownerId || 'unknown');
        const previous = malakarAttackLastPlayed.get(ownerKey) || 0;
        if (now - previous < 140) return;
        malakarAttackLastPlayed.set(ownerKey, now);
        if (malakarAttackLastPlayed.size > 300) {
            malakarAttackLastPlayed.forEach(function (playedAt, key) {
                if (now - playedAt > 10000) malakarAttackLastPlayed.delete(key);
            });
        }
        playSpatial(soundId, {
            x: data.x,
            y: data.y,
            mapa: data.mapa || mapFromX(data.x)
        });
    }

    function playMalakarOwnerSound(soundId, position, data, includeVoice) {
        if (!position) return;
        const options = { x: position.x, y: position.y, mapa: data.mapa || mapFromX(position.x) };
        playSpatial(soundId, options);
        if (includeVoice) playSpatial('malakar_suffering_voice', options);
    }

    function malakarLoopKey(soundId, ownerId) {
        return soundId + ':' + String(ownerId || 'unknown');
    }

    function tundraDragonLoopKey(soundId, dragonId) {
        return soundId + ':' + String(dragonId || 'unknown');
    }

    const MONSTER_SOUND_PROFILES = {
        slime: { attack: 'monster_slime_attack', movement: 'monster_slime_walk' },
        cogumelo_proibido: { attack: 'monster_mushroom_attack' },
        besouro_dourado: { attack: 'monster_beetle_attack', movement: 'monster_beetle_flight' },
        anaconda_selvagem: { attack: 'monster_anaconda_attack', movement: 'monster_anaconda_walk' },
        jararaca: { attack: 'monster_anaconda_brown_attack', movement: 'monster_anaconda_brown_walk' },
        gaviao: { attack: 'monster_hawk_attack', movement: 'monster_hawk_flight' },
        druaase_tundra: { attack: 'monster_druaase_attack' },
        coruja_branca_tundra: { attack: 'monster_owl_attack', skill: 'monster_owl_skill', movement: 'monster_owl_flight' },
        formiga_sauva: { attack: 'monster_ant_attack' },
        louvadermi: {
            attack: 'jungle_mantis_attack',
            skill: 'jungle_mantis_skill',
            movement: 'jungle_monster_move',
            hit: 'jungle_monster_hit',
            snapshotAttack: true
        },
        'gaviao_335f3d57': { attack: 'monster_hawk_attack', movement: 'monster_hawk_flight' },
        'besouro dourado_f71ed54d': { attack: 'monster_beetle_attack', movement: 'monster_beetle_flight' },
        'anaconda_marrom_53b6e531': { attack: 'monster_anaconda_brown_attack', movement: 'monster_anaconda_brown_walk' },
        anaconda_b42dd2b8: { attack: 'monster_anaconda_attack', movement: 'monster_anaconda_walk' },
        'druaerussa_tundra_eb93f50d': { attack: 'monster_druaase_attack' },
        'coruja branca_2fe25484': { attack: 'monster_owl_attack', skill: 'monster_owl_skill', movement: 'monster_owl_flight' },
        'formiga a_4f74a16a': { attack: 'monster_ant_attack' }
    };

    function monsterSoundProfile(monster) {
        return monster && (MONSTER_SOUND_PROFILES[monster.asset] || MONSTER_SOUND_PROFILES[monster.tipo]) || null;
    }

    function updateMonsterMovementSound(monster, previous, activeLoops) {
        if (!monster || !activeLoops) return;
        const profile = monsterSoundProfile(monster);
        if (!profile) return;
        if (previous) {
            const position = { x: monster.x, y: monster.y, mapa: currentMap() };
            if (profile.hit && monster.hp < previous.hp) playSpatial(profile.hit, position);
            if (profile.skill && monster.aiSkillAt > (previous.aiSkillAt || 0)) {
                playSpatial(profile.skill, position);
            } else if (profile.snapshotAttack && profile.attack &&
                monster.aiAtacandoAte > (previous.aiAtacandoAte || 0)) {
                playSpatial(profile.attack, position);
            }
        }
        if (!monster.id || !profile.movement) return;
        const dx = previous ? Number(monster.x) - Number(previous.x) : 0;
        const dy = previous ? Number(monster.y) - Number(previous.y) : 0;
        const movingState = monster.aiEstado === 'walk' || monster.aiEstado === 'run' ||
            monster.aiEstado === 'combat' || monster.aiEstado === 'kite' || monster.aiEstado === 'dodge';
        if (monster.hp <= 0 || !movingState || dx * dx + dy * dy <= 0.25) return;
        const key = 'monster_move:' + monster.id;
        activeLoops[key] = true;
        const position = { x: monster.x, y: monster.y, mapa: currentMap() };
        if (loops.has(key)) updateSpatialLoop(key, position);
        else startLoop(profile.movement, Object.assign({ key }, position));
    }

    function playMonsterAttack(data) {
        const profile = monsterSoundProfile({ tipo: data.monsterType, asset: data.asset });
        const position = eventPosition(data);
        if (!profile || !profile.attack || !position) return false;
        playSpatial(profile.attack, {
            x: position.x,
            y: position.y,
            mapa: data.mapa || currentMap()
        });
        return true;
    }

    function startMalakarLoop(soundId, data) {
        const owner = data.ownerId && global.todosJogadores ? global.todosJogadores[data.ownerId] : null;
        const position = owner ? { x: owner.x + 12, y: owner.y + 16 } : eventPosition(data);
        if (!position) return;
        startLoop(soundId, {
            key: malakarLoopKey(soundId, data.ownerId),
            followPlayerId: data.ownerId,
            x: position.x,
            y: position.y,
            mapa: data.mapa || mapFromX(position.x)
        });
    }

    function handleGameEvent(data) {
        if (!data || !data.type) return false;
        if (data.type === 'monster_audio_attack') {
            playMonsterAttack(data);
            return true;
        }
        if (data.type === 'cogumelo_veneno_acerto') {
            const position = eventPosition(data);
            if (position) {
                startTimedLoop('monster_mushroom_hit', {
                    key: data.soundKey || ('monster_mushroom_hit:' + String(data.id || 'mushroom')),
                    x: position.x,
                    y: position.y,
                    mapa: data.mapa || currentMap()
                }, data.duration);
            }
            return true;
        }
        if (data.type === 'action_besouro_decolagem') {
            const position = eventPosition(data);
            if (position) {
                playSpatial('monster_beetle_skill', {
                    x: position.x,
                    y: position.y,
                    mapa: data.mapa || currentMap()
                });
            }
            return true;
        }
        if (data.type === 'tundra_dragon_vortex_start') {
            const position = eventPosition(data);
            if (position) {
                startLoop('tundra_dragon_skill_1', {
                    key: tundraDragonLoopKey('tundra_dragon_skill_1', data.id),
                    x: position.x,
                    y: position.y,
                    mapa: data.mapa || mapFromX(position.x)
                });
            }
            return true;
        }
        if (data.type === 'tundra_dragon_vortex_end') {
            stopLoop(tundraDragonLoopKey('tundra_dragon_skill_1', data.id));
            return true;
        }
        if (data.type === 'tundra_dragon_dash') {
            const position = typeof data.fromX === 'number' && typeof data.fromY === 'number'
                ? { x: data.fromX, y: data.fromY } : eventPosition(data);
            if (position) {
                playSpatial('tundra_dragon_skill_2', {
                    x: position.x,
                    y: position.y,
                    mapa: data.mapa || mapFromX(position.x)
                });
            }
            return true;
        }
        if (data.type === 'tundra_dragon_dash_cancel') {
            return true;
        }
        if (data.type === 'tundra_dragon_breath') {
            const position = eventPosition(data);
            if (position) {
                playSpatial('tundra_dragon_basic', {
                    x: position.x,
                    y: position.y,
                    mapa: data.mapa || mapFromX(position.x)
                });
            }
            return true;
        }
        if (data.type === 'tundra_owl_scream_start') {
            const position = eventPosition(data);
            if (position) {
                playSpatial('monster_owl_skill', {
                    x: position.x,
                    y: position.y,
                    mapa: data.mapa || currentMap()
                });
            }
            return true;
        }
        if (data.type === 'sound_event' && data.action === 'stop' && data.soundId) {
            stopLoop(data.soundId);
            return true;
        }
        if (data.type === 'action_barbaro_giro_end') {
            stopLoop('giro_' + data.id);
            return true;
        }
        if (data.type === 'lord_malakar_attack') {
            playMalakarAttackSound(data);
            return true;
        }
        if (data.type === 'lord_malakar_link_end') {
            stopLoop(malakarLoopKey('malakar_skill_2', data.ownerId));
            return true;
        }
        if (data.type === 'lord_malakar_heal') {
            playMalakarOwnerSound('malakar_cleric_heal', eventPosition(data), data, false);
            return true;
        }
        if (data.type === 'lord_malakar_summon' && data.entity) {
            const soundId = String(data.entity.type || '').indexOf('skull_') === 0
                ? 'malakar_skill_1' : 'malakar_skill_4';
            playMalakarOwnerSound(soundId, { x: data.entity.x, y: data.entity.y }, data, false);
            return true;
        }
        if (data.type === 'lord_malakar_link') {
            startMalakarLoop('malakar_skill_2', data);
            return true;
        }
        if (data.type === 'lord_malakar_suffering') {
            const key = malakarLoopKey('malakar_skill_3', data.ownerId);
            if (!data.active) {
                stopLoop(key);
                return true;
            }
            const owner = data.ownerId && global.todosJogadores ? global.todosJogadores[data.ownerId] : null;
            startMalakarLoop('malakar_skill_3', data);
            if (owner) {
                playSpatial('malakar_suffering_voice', {
                    x: owner.x + 12,
                    y: owner.y + 16,
                    mapa: data.mapa || mapFromX(owner.x + 12)
                });
            }
            return true;
        }
        if (data.type === 'lord_malakar_blood_tether_hit' || data.type === 'action_lord_malakar_basic') {
            const owner = data.ownerId && global.todosJogadores ? global.todosJogadores[data.ownerId] : null;
            playMalakarOwnerSound('malakar_basic_attack',
                owner ? { x: owner.x + 12, y: owner.y + 16 } : eventPosition(data), data, false);
            return true;
        }
        const position = eventPosition(data);
        if (!position) return false;
        const mapa = data.mapa || mapFromX(position.x);
        if (data.type === 'action_nevasca') {
            startLoop('skill_nevasca', { key: data.soundId || ('nevasca_' + position.x + '_' + position.y), x: position.x, y: position.y, mapa: mapa });
            return true;
        }
        if (data.type === 'action_barbaro_giro_start') {
            startLoop('skill_giro_berserker', { key: 'giro_' + data.id, x: position.x, y: position.y, mapa: mapa });
            return true;
        }
        const instant = {
            action_golem_ataque: 'boss_attack',
            boss_golem_levantar: 'boss_attack',
            boss_golem_marca: 'skill_vulcao',
            boss_golem_impacto: 'boss_impact',
            boss_golem_escudo: 'boss_attack',
            boss_golem_morte: 'boss_death',
            action_ogro_sismico: 'monster_attack',
            action_ogro_rugido: 'monster_attack',
            action_magia_basica: 'player_attack',
            action_orbe: 'player_attack',
            action_flecha: 'player_attack',
            action_sagrado: 'player_attack',
            action_barbaro_furia: 'player_attack',
            action_meteoro: 'impact',
            action_arqueiro_chuva: 'skill_chuva',
            action_arqueiro_perfurante: 'player_attack',
            action_vulcao: 'skill_vulcao',
            action_curandeiro_julgamento: 'skill_vulcao',
            action_curandeiro_cura: 'skill_vulcao',
            action_guerreiro_provocacao: 'monster_attack',
            action_machadada: 'player_attack',
            action_roqueiro_bateria: 'impact',
            action_roqueiro_teleporte: 'impact',
            action_lacaio_dano: 'monster_attack',
            action_lacaio_morreu: 'boss_death',
            action_besouro_impacto: 'impact',
            action_ogro_colossal: 'boss_attack',
            action_barbaro_esmagamento: 'impact',
            action_dash: 'impact'
        };
        if (instant[data.type]) {
            playSpatial(instant[data.type], { x: position.x, y: position.y, mapa: mapa });
            return true;
        }
        return false;
    }

    function setVolume(kind, value) {
        const volume = Math.max(0, Math.min(1, Number(value) || 0));
        if (kind === 'master') {
            muted.master = volume === 0;
            if (masterGain) masterGain.gain.value = volume;
            global.volumeGeral = volume;
            localStorage.setItem('mmorpg_volume', String(volume));
        } else if (kind === 'sfx' || kind === 'ambient') {
            muted[kind] = volume === 0;
            if (categoryGains[kind]) categoryGains[kind].gain.value = volume;
        }
    }

    global.AudioManager = {
        CATEGORY,
        SOUND_DEFINITIONS: DEFINITIONS,
        playSpatialSound: playSpatial,
        playGlobalSound: playGlobal,
        startSpatialLoop: startLoop,
        stopSpatialLoop: stopLoop,
        updateSpatialLoop,
        updateMonsterMovementSound,
        updateListener: update,
        updateSpatialSounds: update,
        handleGameEvent,
        stopMapSounds,
        setMapAmbient,
        stopAll,
        setMasterVolume: function (value) { setVolume('master', value); },
        setSfxVolume: function (value) { setVolume('sfx', value); },
        setAmbientVolume: function (value) { setVolume('ambient', value); },
        muteMaster: function (value) { muted.master = !!value; if (masterGain) masterGain.gain.value = muted.master ? 0 : (Number(global.volumeGeral) || 0.8); },
        muteSfx: function (value) { muted.sfx = !!value; },
        muteAmbient: function (value) { muted.ambient = !!value; },
        cleanup: stopAll,
        unlock
    };

    global.playSpatialSound = playSpatial;
    global.startSpatialLoop = startLoop;
    global.stopSpatialLoop = stopLoop;
    global.setInterval(update, 80);
})(window);
