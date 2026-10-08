const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(root, 'monstros.js'), 'utf8');

function functionSource(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `expected production function ${name}`);
    const braceStart = source.indexOf('{', start);
    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let i = braceStart; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') {
            quote = ch;
        } else if (ch === '{') {
            depth++;
        } else if (ch === '}' && --depth === 0) {
            return source.slice(start, i + 1);
        }
    }
    assert.fail(`could not parse function ${name}`);
}

test('Coruja de Tundra uses the existing Tundra biome and original sprite asset', () => {
    const spawns = require('../spawns');
    const worldMap = require('../mapas/mapa_mundo');
    const config = spawns.getMonstroConfig('coruja_branca_tundra');
    const assetDir = path.join(root, 'sprites', 'monstros', config.asset);

    assert.equal(config.nome, 'Coruja de Tundra');
    assert.equal(config.bioma, 'Tundra Gélida');
    assert.equal(worldMap.biomaNome(worldMap.CENTROS_BIOMAS.neve.x, worldMap.CENTROS_BIOMAS.neve.y), config.bioma);
    assert.equal(config.escala, 1.2);
    assert.equal(config.aggroRange, 300, 'the owl should only acquire nearby targets');
    assert.equal(config.aiManaged, true);
    assert.deepEqual(config.tags, ['voadores', 'noturno', 'dps', 'hibridos', 'healers']);
    for (const point of [
        { x: 143750, y: 19150 }, { x: 145000, y: 19150 },
        { x: 143000, y: 20850 }, { x: 145000, y: 20850 }
    ]) {
        assert.equal(worldMap.biomaNome(point.x, point.y), config.bioma, 'each natural group center must be in Tundra');
    }
    assert.ok(fs.existsSync(path.join(assetDir, 'spritesheet.png')));
    assert.match(rendererSource, /_carregarSpriteSlime\('coruja branca_2fe25484'\)/);
    assert.match(rendererSource, /_desenharTelegraphGritoCoruja\(ctx, slime\)/);
    assert.match(serverSource, /slime\.tipo === 'coruja_branca_tundra'[\s\S]{0,100}Math\.max\(slime\.aggroRange \|\| 300, 360\)/);
});

test('Coruja renderer can use every directional animation supplied by the asset', () => {
    const metadata = JSON.parse(fs.readFileSync(
        path.join(root, 'sprites', 'monstros', 'coruja branca_2fe25484', 'spritesheet.json'), 'utf8'));
    const clips = new Map(metadata.clips.map(clip => [clip.name, clip]));
    const directions = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
    const states = ['idle', 'walk', 'run', 'action', 'hit', 'rest_enter', 'sleep', 'rest_exit'];

    for (const state of states) {
        for (const direction of directions) {
            const clip = clips.get(`${state}_${direction}`);
            assert.ok(clip, `missing ${state}_${direction} clip`);
            assert.ok(clip.frames.length > 0, `${state}_${direction} must contain frames`);
        }
    }
    assert.match(rendererSource, /voador \|\| slime\.aiEstado === 'run'/);
});

test('Coruja damage does not flash or replace an active attack animation with hit', () => {
    const sprite = {
        metadata: { frameWidth: 68, frameHeight: 79, originX: 34, originY: 62 },
        image: {},
        clipsByName: Object.create(null)
    };
    for (const name of ['action_E', 'hit_E', 'run_E']) {
        sprite.clipsByName[name] = {
            name,
            frames: [{ x: 0, y: name === 'hit_E' ? 79 : name === 'run_E' ? 158 : 0, durationMs: 33 }],
            fps: 30,
            loop: false
        };
    }
    const context = vm.createContext({
        Date,
        Math,
        _desenharEfeitoMordidaDruaase() {},
        _slimeSprites: { 'coruja branca_2fe25484': sprite }
    });
    const draw = vm.runInContext(`(${functionSource(rendererSource, '_desenharSpriteSlime')})`, context);
    const now = Date.now();
    const owl = {
        tipo: 'coruja_branca_tundra',
        asset: 'coruja branca_2fe25484',
        hp: 90,
        aiEstado: 'idle',
        aiAtacandoAte: now + 1000
    };
    const state = { slimeHp: 100, face: 0 };
    const drawn = [];
    const canvas = { drawImage: (...args) => drawn.push(args) };

    assert.equal(draw(canvas, owl, state), true);
    assert.equal(state.slimeClipe, 'action_E');
    assert.equal(state.slimeHitAte, undefined);
    assert.equal(drawn[0][2], 0, 'draw the attack clip rather than the hit clip');

    owl.aiAtacandoAte = 0;
    owl.aiEstado = 'walk';
    assert.equal(draw(canvas, owl, state), true);
    assert.equal(state.slimeClipe, 'run_E', 'use the flying animation during normal movement');
    assert.equal(drawn[1][2], 158);
});

test('Coruja natural spawn reuses biome-validated spawn, respawn, and patrol paths', () => {
    assert.match(serverSource, /inicializarSpawnsNaturaisCorujaTundra\(\);/);
    assert.match(serverSource, /gerarPosicaoNaturalBioma\(TUNDRA_CORUJA_BIOMA, centro, 2600\)/);
    assert.match(serverSource, /slime\.bioma === TUNDRA_CORUJA_BIOMA[\s\S]{0,220}gerarPosicaoNaturalBioma/);
    assert.match(serverSource, /slime\.bioma === TUNDRA_CORUJA_BIOMA[\s\S]{0,150}patrulha = gerarPosicaoNaturalBioma/);
});

test('Coruja scream marks a fixed area, warns for 1.5 seconds, and paralyzes only players inside it', () => {
    const atingidos = [];
    const players = {
        dentro: { x: 100, y: 0, hp: 100 },
        fora: { x: 300, y: 0, hp: 100 }
    };
    const context = vm.createContext({
        Math,
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        players,
        jogadorPodeSerAlvoDoSlime: () => true,
        monstroPodeAtacar: () => true,
        enviarEventoSlimeElite: () => {},
        efeitos: { aplicarEfeito: (...args) => atingidos.push(args) },
        moverMonstroComDesvio: (mob, x, y) => {
            mob.destinosFuga = mob.destinosFuga || [];
            mob.destinosFuga.push({ inicioX: mob.x, x, y });
            mob.x = x;
            mob.y = y;
            return true;
        }
    });
    const atualizar = vm.runInContext(`(${functionSource(serverSource, 'atualizarGritoCoruja')})`, context);
    const coruja = {
        id: 'owl-test',
        x: 0,
        y: 0,
        velocidade: 2.7,
        corujaGritoRaio: 150,
        corujaGritoProximoAte: 0
    };
    const alvo = { x: 100, y: 0 };

    assert.equal(atualizar(coruja, alvo, false, 1000, false), true);
    assert.equal(coruja.corujaGritoDuracao, 1500);
    assert.equal(coruja.corujaGritoAte, 2500);
    assert.equal(coruja.corujaGritoX, 100);
    assert.equal(atualizar(coruja, { x: 120, y: 0 }, false, 1800, false), true);
    assert.ok(coruja.destinosFuga.every(destino => destino.x < destino.inicioX),
        'during the cast the owl should move away from the player, not orbit toward them');
    assert.equal(coruja.corujaGritoX, 100, 'the marked area remains at the original target position');
    assert.equal(atualizar(coruja, null, false, 2500, false), true);
    assert.equal(coruja.corujaGritoAte, 0);
    assert.deepEqual(atingidos.map(args => [args[0], args[1], args[2]]), [
        [players.dentro, 'paralisia', 80]
    ]);
});

test('Coruja scream telegraph uses red ground-mark colors', () => {
    const estilos = [];
    const ctx = {
        save() {},
        restore() {},
        beginPath() {},
        arc() {},
        fill() {},
        stroke() {},
        setLineDash() {},
        moveTo() {},
        lineTo() {},
        strokeText() {},
        fillText() {}
    };
    for (const property of ['fillStyle', 'strokeStyle']) {
        Object.defineProperty(ctx, property, {
            set(value) { estilos.push(value); }
        });
    }
    const drawTelegraph = vm.runInNewContext(
        `(${functionSource(rendererSource, '_desenharTelegraphGritoCoruja')})`,
        { Date, Math });

    drawTelegraph(ctx, {
        corujaGritoRaio: 150,
        corujaGritoX: 100,
        corujaGritoY: 100,
        corujaGritoAte: Date.now() + 1000,
        corujaGritoDuracao: 1500
    });

    assert.ok(estilos.includes('rgba(255, 45, 45, 0.24)'));
    assert.ok(estilos.includes('#ffb0b0'));
    assert.ok(estilos.includes('rgba(255, 65, 65, 0.9)'));
    assert.equal(estilos.some(estilo => /blue|cyan|211, 255/i.test(estilo)), false);
});

test('Coruja has a 20% scream chance when awakened during daytime', () => {
    const criarContexto = chance => vm.createContext({
        Math: Object.assign(Object.create(Math), { random: () => chance }),
        PLAYER_OFFSET_X: 0,
        PLAYER_OFFSET_Y: 0,
        players: {},
        jogadorPodeSerAlvoDoSlime: () => true,
        monstroPodeAtacar: () => true,
        enviarEventoSlimeElite: () => {},
        efeitos: null,
        aiIsNight: false,
        moverMonstroComDesvio: () => true
    });
    const atualizarFonte = `(${functionSource(serverSource, 'atualizarGritoCoruja')})`;
    const alvo = { x: 200, y: 0 };
    const corujaAcordada = {
        x: 0,
        y: 0,
        velocidade: 2.7,
        corujaGritoRaio: 150,
        corujaGritoProximoAte: 0,
        corujaGritoDiaAcordada: true
    };
    const tentarComChance = chance => {
        const atualizar = vm.runInContext(atualizarFonte, criarContexto(chance));
        const coruja = { ...corujaAcordada };
        const iniciou = atualizar(coruja, alvo, false, 1000, true);
        return { iniciou, coruja };
    };

    const sucesso = tentarComChance(0.19);
    assert.equal(sucesso.iniciou, true);
    assert.equal(sucesso.coruja.corujaGritoAte, 2500);

    const falha = tentarComChance(0.2);
    assert.equal(falha.iniciou, false);
    assert.equal(falha.coruja.corujaGritoAte, undefined);
    assert.ok(falha.coruja.corujaGritoProximoAte > 1000,
        'a failed roll waits for the next random cooldown instead of rerolling every AI tick');

    const dormindo = { ...corujaAcordada, corujaGritoDiaAcordada: false };
    const atualizar = vm.runInContext(atualizarFonte, criarContexto(0));
    assert.equal(atualizar(dormindo, alvo, false, 1000, true), false,
        'daytime skill use is only enabled after the owl has been woken');

    const corujaAcordadaDeNoite = { ...corujaAcordada, aiIsNight: true };
    assert.equal(atualizar(corujaAcordadaDeNoite, alvo, false, 1000, true), false,
        'the 20% exception applies to daytime wake-ups, not nighttime');
});

test('Coruja dodges an approaching player projectile aimed at it', () => {
    const players = { jogador: { x: 0, y: 100, hp: 100 } };
    const playerProjectiles = [{
        x: 0, y: 100, vx: 10, vy: 0, vida: 20, raio: 8,
        mapa: 'mundo', solari: false, ownerId: 'jogador',
        origemBasica: true, alvoTipo: 'slime', alvoId: 'owl-test'
    }];
    const context = vm.createContext({
        Math,
        PLAYER_OFFSET_X: 0,
        players,
        playerProjeteis: playerProjectiles,
        mapaPorCoordenada: () => 'mundo',
        instanciaCompativel: () => true,
        moverMonstroComDesvio: (mob, x, y) => {
            mob.x = x;
            mob.y = y;
            return true;
        }
    });
    const esquivar = vm.runInContext(`(${functionSource(serverSource, 'esquivarProjetilCoruja')})`, context);
    const coruja = {
        id: 'owl-test', x: 100, y: 100, velocidade: 2.7,
        raioColisao: 20, aiProximoDodge: 0
    };

    assert.equal(esquivar(coruja, 5000), true);
    assert.notEqual(coruja.y, 100);
    assert.equal(coruja.aiEstado, 'run');
    assert.equal(coruja.aiProximoDodge, 5650);
});
