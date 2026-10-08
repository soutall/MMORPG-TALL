const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(root, 'monstros.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

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
        if (ch === "'" || ch === '"' || ch === '`') quote = ch;
        else if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
    }
    assert.fail(`could not parse production function ${name}`);
}

test('Druaase reuses the directional Tundra spritesheet and is configured as a fast daytime tank', () => {
    const spawns = require('../spawns');
    const worldMap = require('../mapas/mapa_mundo');
    const config = spawns.getMonstroConfig('druaase_tundra');
    const assetDir = path.join(root, 'sprites', 'monstros', 'druaerussa_tundra_eb93f50d');
    const metadata = JSON.parse(fs.readFileSync(path.join(assetDir, 'spritesheet.json'), 'utf8'));
    const clips = new Set(metadata.clips.map(clip => clip.name));

    assert.equal(config.nome, 'Druaase');
    assert.equal(config.bioma, 'Tundra Gélida');
    assert.equal(config.ehMelee, true);
    assert.equal(config.velocidade, 4.2);
    assert.equal(config.cadenciaAtk, 100);
    assert.deepEqual(config.tags, ['tank', 'diurno', 'debuffers']);
    for (const state of ['idle', 'walk', 'run', 'action']) {
        for (const direction of ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']) {
            assert.ok(clips.has(`${state}_${direction}`), `missing ${state}_${direction}`);
        }
    }
    assert.ok(fs.existsSync(path.join(assetDir, 'spritesheet.png')));
    assert.match(rendererSource, /_carregarSpriteSlime\('druaerussa_tundra_eb93f50d'\)/);
    assert.match(rendererSource, /druaerussa_tundra_eb93f50d:\s*\{\s*metadata:\s*null,\s*image:\s*null,\s*clipsByName:\s*null,\s*loading:\s*false\s*\}/);
    assert.match(serverSource, /inicializarSpawnsNaturaisDruaaseTundra\(\);/);
    assert.match(serverSource, /gerarPosicaoNaturalBioma\(TUNDRA_CORUJA_BIOMA, centro, 2600\)/);
    for (const point of [
        { x: 144000, y: 19000 }, { x: 144000, y: 21000 },
        { x: 145000, y: 19000 }, { x: 145000, y: 21000 }
    ]) {
        assert.equal(worldMap.biomaNome(point.x, point.y), config.bioma);
    }
});

test('Druaase bleed has a 30% application chance and lasts ten seconds', () => {
    const create = random => {
        const math = Object.create(Math);
        math.random = () => random;
        const context = vm.createContext({ Math: math });
        const apply = vm.runInContext(
            `(${functionSource(serverSource, 'aplicarHemorragiaDruaase')})`, context);
        return { apply, context };
    };
    const target = { hp: 100, moving: true };
    assert.equal(create(0.29).apply(target, 5000), true);
    assert.equal(target.druaaseHemorragiaAte, 15000);
    assert.equal(target.druaaseHemorragiaTempoAndando, 0);
    assert.equal(create(0.3).apply({ hp: 100 }, 5000), false);
    assert.match(serverSource, /aplicarHemorragiaDruaase\(alvo, agora, slime\.x, slime\.y\)/);
});

test('Druaase bleed deals 2% max HP after each 500 ms of movement, not while standing', () => {
    let now = 1000;
    const damage = [];
    const context = vm.createContext({
        players: {
            target: {
                hp: 1000,
                maxHp: 1000,
                x: 30,
                y: 40,
                moving: true,
                druaaseHemorragiaAte: 11000,
                druaaseHemorragiaUltimaAtualizacao: 1000,
                druaaseHemorragiaUltimaPosicaoX: 30,
                druaaseHemorragiaUltimaPosicaoY: 40,
                druaaseHemorragiaTempoAndando: 0
            }
        },
        PLAYER_OFFSET_X: 12,
        PLAYER_OFFSET_Y: 16,
        aplicarDanoJogador: (pid, x, y, amount) => damage.push({ pid, x, y, amount })
    });
    const update = vm.runInContext(
        `(${functionSource(serverSource, 'atualizarHemorragiaDruaase')})`, context);

    context.players.target.x = 35;
    now = 1249;
    update(now);
    assert.equal(damage.length, 0);
    context.players.target.moving = false;
    now = 1500;
    update(now);
    assert.equal(damage.length, 0, 'stationary time must not accrue toward the bleed tick');
    context.players.target.moving = true;
    context.players.target.x = 40;
    now = 1751;
    update(now);
    assert.equal(damage.length, 1);
    assert.deepEqual(damage[0], { pid: 'target', x: 52, y: 56, amount: 20 });

    context.players.target.druaaseHemorragiaAte = 1700;
    update(1800);
    assert.equal(context.players.target.druaaseHemorragiaAte, 0);
    assert.equal(context.players.target.druaaseHemorragiaTempoAndando, 0);
});

test('Druaase uses its supplied attack animation without procedural visual overlays', () => {
    assert.match(rendererSource, /slime\.tipo === 'druaase_tundra'/);
    assert.match(serverSource, /slime\.tipo === 'druaase_tundra' && !alvoPet[\s\S]{0,180}slime\.aiEstado = 'action'[\s\S]{0,120}aplicarHemorragiaDruaase/);
    assert.doesNotMatch(rendererSource, /_desenharEfeitoMordidaDruaase/);
    assert.match(rendererSource, /_carregarSpriteSlime\('druaerussa_tundra_eb93f50d'\)/);

    const sprite = {
        metadata: { frameWidth: 68, frameHeight: 79, originX: 34, originY: 62 },
        image: {},
        clipsByName: Object.create(null)
    };
    for (const name of ['action_E', 'hit_E']) {
        sprite.clipsByName[name] = {
            name,
            frames: [{ x: 0, y: name === 'hit_E' ? 79 : 0, durationMs: 33 }],
            fps: 30,
            loop: false
        };
    }
    const context = vm.createContext({
        Date,
        Math,
        _slimeSprites: { druaerussa_tundra_eb93f50d: sprite }
    });
    const draw = vm.runInContext(
        `(${functionSource(rendererSource, '_desenharSpriteSlime')})`, context);
    const target = {
        tipo: 'druaase_tundra',
        asset: 'druaerussa_tundra_eb93f50d',
        hp: 90,
        aiEstado: 'idle',
        aiAtacandoAte: Date.now() + 1000
    };
    const state = { slimeHp: 100, face: 0 };
    const drawn = [];

    assert.equal(draw({ drawImage: (...args) => drawn.push(args) }, target, state), true);
    assert.equal(state.slimeClipe, 'action_E');
    assert.equal(state.slimeHitAte, undefined);
    assert.equal(drawn[0][2], 0);
});

test('Druaase attacks immediately in melee range without the red attack telegraph', () => {
    assert.match(serverSource, /slime\.tipo === 'druaase_tundra'[\s\S]{0,100}\{ status: 'ready', angle: Math\.atan2\(dy, dx\) \}[\s\S]{0,100}prepararAtaqueMonstroComAviso/);
    assert.match(serverSource, /if \(aviso\.status === 'ready' && \(distancia <= alcanceAtaque\)\)/);
});

test('players with Druaase bleed receive the blood-drop visual marker', () => {
    assert.match(clientSource, /if \(pp\.druaaseHemorragiaAte > Date\.now\(\)\)/);
    assert.match(clientSource, /ctx\.fillStyle = '#a60016'/);
    assert.match(clientSource, /ctx\.bezierCurveTo\(-2, -4, -7, 1, -7, 4\)/);
});
