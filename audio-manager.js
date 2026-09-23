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
        boss_attack: { category: CATEGORY.BOSS, volume: 0.9, maxDistance: 200, rolloff: 1.0, priority: 8 },
           boss_impact: { category: CATEGORY.BOSS, volume: 0.9, maxDistance: 200, rolloff: 1.0, priority: 8 },
           boss_death: { category: CATEGORY.IMPORTANT, volume: 1, maxDistance: 2400, rolloff: 0.9, priority: 10 },
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
    const voices = [];
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
        if (value >= (global.LARGURA_CIDADE_PERDIDA || 65040)) return 'cidadeperdida';
        if (value >= (global.LARGURA_ARENA || 63800)) return 'arena';
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

    function updateLoop(loop) {
        if (!loop || loop.stopped) return;
        if (!loop.config.src) return;
        const options = loop.options;
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
        if (!loop) return;
        loop.stopped = true;
        if (loop.voice) stopVoice(loop.voice);
        loops.delete(key);
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
        const player = data.id && global.todosJogadores ? global.todosJogadores[data.id] : null;
        return player ? { x: player.x + 12, y: player.y + 16 } : null;
    }

    function handleGameEvent(data) {
        if (!data || !data.type) return false;
        if (data.type === 'sound_event' && data.action === 'stop' && data.soundId) {
            stopLoop(data.soundId);
            return true;
        }
        if (data.type === 'action_barbaro_giro_end') {
            stopLoop('giro_' + data.id);
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
