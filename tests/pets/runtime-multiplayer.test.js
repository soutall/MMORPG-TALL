'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const test = require('node:test');
const WebSocket = require('ws');
const petSystem = require('../../sistemas/pets/pets_system.js');

const projectRoot = path.resolve(__dirname, '../..');

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureWithTimingMinigame(client, targetId) {
    client.socket.send(JSON.stringify({ action: 'pet_capture_start', targetId: targetId }));
    let challenge = await client.waitFor.next((message) =>
        message.type === 'pet_capture_challenge' || message.type === 'pet_capture_result');
    if (challenge.type === 'pet_capture_result') return challenge;

    let minigamePassed = true;
    for (let round = 1; round <= 3; round++) {
        const duration = Number(challenge.durationMs) || 1800;
        const maxAttempt = Number(challenge.maxAttemptMs) || 5500;
        let sent = false;
        while (Date.now() - challenge.startedAt < maxAttempt) {
            const elapsed = Date.now() - challenge.startedAt;
            if (elapsed >= 0) {
                const phase = ((Math.max(0, elapsed) + Number(challenge.phaseMs || 0)) % (duration * 2)) / duration;
                const marker = phase <= 1 ? phase : 2 - phase;
                if (marker >= challenge.zoneStart + 0.025 &&
                    marker <= challenge.zoneStart + challenge.zoneWidth - 0.025) {
                    client.socket.send(JSON.stringify({
                        action: 'pet_capture_round', targetId: targetId,
                        challengeId: challenge.challengeId, round: round
                    }));
                    sent = true;
                    break;
                }
            }
            await sleep(4);
        }
        if (!sent) {
            client.socket.send(JSON.stringify({
                action: 'pet_capture_round', targetId: targetId,
                challengeId: challenge.challengeId, round: round
            }));
        }
        const roundResult = await client.waitFor.next((message) =>
            message.type === 'pet_capture_round_result' || message.type === 'pet_capture_result');
        if (roundResult.type === 'pet_capture_result') return roundResult;
        if (!roundResult.roundPassed || roundResult.complete) {
            minigamePassed = roundResult.roundsPassed === 3;
            client.socket.send(JSON.stringify({
                action: 'pet_capture', targetId: targetId, challengeId: challenge.challengeId
            }));
            return client.waitFor.next((message) => message.type === 'pet_capture_result');
        }
        challenge = await client.waitFor.next((message) =>
            message.type === 'pet_capture_challenge' || message.type === 'pet_capture_result');
        if (challenge.type === 'pet_capture_result') return challenge;
    }
    return { success: false, reason: 'minigame_incomplete', minigamePassed: minigamePassed };
}

async function reservePort() {
    const socket = net.createServer();
    await new Promise((resolve, reject) => {
        socket.once('error', reject);
        socket.listen(0, '127.0.0.1', resolve);
    });
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    return port;
}

function listenForMessages(socket) {
    const messages = [];
    let nextMessageIndex = 0;
    socket.on('message', (data) => {
        try {
            messages.push(JSON.parse(data.toString()));
        } catch (error) {
            messages.push({ type: 'invalid_json', error: error.message });
        }
    });
    const waitFor = async function (predicate, timeoutMs = 8000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const found = messages.find(predicate);
            if (found) return found;
            await sleep(20);
        }
        const recent = messages.slice(-3).map((message) => ({
            type: message.type,
            owner: message.players && message.players.heroi_player_a
                ? { x: message.players.heroi_player_a.x, y: message.players.heroi_player_a.y }
                : null,
            pets: message.pets
                ? Object.fromEntries(Object.entries(message.pets).map(([id, pet]) =>
                    [id, { x: pet.x, y: pet.y, hp: pet.hp, state: pet.state, mode: pet.mode, targetId: pet.targetId }]))
                : null,
            ownerC: message.players && message.players.heroi_player_c
                ? { x: message.players.heroi_player_c.x, y: message.players.heroi_player_c.y,
                    hp: message.players.heroi_player_c.hp }
                : null,
            projectiles: message.projeteis
                ? message.projeteis.map((projectile) => projectile.tipo)
                : null,
            nearbyMonsters: message.slimes && message.pets
                ? message.slimes.filter((monster) => {
                    const pet = message.pets[Object.keys(message.pets)[0]];
                    return pet && Math.hypot(monster.x - pet.x, monster.y - pet.y) < 450;
                }).slice(0, 3).map((monster) => ({
                    id: monster.id, type: monster.tipo, hp: monster.hp, x: monster.x, y: monster.y, targetId: monster.targetId
                }))
                : null
        }));
        throw new Error('Timed out waiting for WebSocket message; recent snapshots: ' + JSON.stringify(recent));
    };
    waitFor.mark = function () { return messages.length; };
    waitFor.after = async function (mark, predicate, timeoutMs = 8000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const found = messages.slice(mark).find(predicate);
            if (found) return found;
            await sleep(20);
        }
        throw new Error('Timed out waiting for a fresh WebSocket message');
    };
    waitFor.next = async function (predicate, timeoutMs = 8000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            while (nextMessageIndex < messages.length) {
                const message = messages[nextMessageIndex++];
                if (predicate(message)) return message;
            }
            await sleep(20);
        }
        throw new Error('Timed out waiting for a new WebSocket message');
    };
    return waitFor;
}

async function waitForServer(child, port, getOutput) {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error('Test server exited early: ' + getOutput());
        }
        try {
            const response = await fetch('http://127.0.0.1:' + port + '/health');
            if (response.ok && (await response.text()) === 'OK') return;
        } catch (error) {
            await sleep(100);
        }
        await sleep(100);
    }
    throw new Error('Test server did not become healthy: ' + getOutput());
}

async function connectAndSelect(port, characterId) {
    const socket = new WebSocket('ws://127.0.0.1:' + port);
    const waitFor = listenForMessages(socket);
    await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });
    socket.send(JSON.stringify({ action: 'login', id: characterId }));
    const login = await waitFor((message) => message.type === 'personagens_lista');
    assert.equal(login.localIdLogin, true);
    socket.send(JSON.stringify({ action: 'personagem_selecionar', personagem: characterId }));
    await waitFor((message) => message.type === 'init');
    return { socket, waitFor };
}

test('isolated authenticated clients validate multiplayer PvE, real capture, and Pet runtime', async (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmorpg-pets-runtime-'));
    const databaseFile = path.join(tempDir, 'players.json');
    const port = await reservePort();
    const petA = petSystem.createPetInstance('cogumelo_proibido');
    const petB = petSystem.createPetInstance('louvadermi');
    petA.mode = 'PARADO';
    petB.mode = 'PARADO';
    fs.writeFileSync(databaseFile, JSON.stringify({
        player_a: {
            personagemId: 'test-a', level: 50, x: 142950, y: 13000,
            pets: [petA], petActiveId: petA.pet_instance_id
        },
        player_b: {
            personagemId: 'test-b', level: 50, x: 145050, y: 13000,
            pets: [petB], petActiveId: petB.pet_instance_id
        },
        player_c: {
            personagemId: 'test-c', level: 50, x: 142950, y: 15035,
            pets: [], petActiveId: null,
            captureState: { species: { slime: { fails: 100 } } }
        }
    }));

    let serverOutput = '';
    const child = spawn(process.execPath, ['server.js'], {
        cwd: projectRoot,
        env: Object.assign({}, process.env, {
            NODE_ENV: 'test',
            LOCAL_ID_LOGIN_ENABLED: '1',
            MMORPG_DATABASE_FILE: databaseFile,
            PORT: String(port)
        }),
        stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
    child.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
    t.after(async () => {
        if (child.exitCode === null) {
            child.kill('SIGTERM');
            await Promise.race([
                new Promise((resolve) => child.once('exit', resolve)),
                sleep(3000)
            ]);
        }
        try { fs.unlinkSync(databaseFile + '.lock'); } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        fs.unlinkSync(databaseFile);
        fs.rmdirSync(tempDir);
    });

    await waitForServer(child, port, () => serverOutput);
    const clientA = await connectAndSelect(port, 'player_a');
    const clientB = await connectAndSelect(port, 'player_b');
    let clientC = await connectAndSelect(port, 'player_c');
    const initA = await clientA.waitFor((message) => message.type === 'init' && message.petProfile);
    const initC = await clientC.waitFor((message) => message.type === 'init' && message.petProfile);
    assert.ok(initA.petProfile.pets.some((pet) => pet.pet_instance_id === petA.pet_instance_id));
    assert.ok(initA.petProfile.species.some((species) => species.species_id === 'cogumelo_proibido'));
    assert.equal(initA.petProfile.petActiveId, petA.pet_instance_id);
    assert.deepEqual(initC.petProfile.pets, []);
    const clients = [clientA, clientB, clientC];
    t.after(() => {
        clients.forEach((client) => {
            if (client.socket.readyState !== WebSocket.CLOSED) client.socket.close();
        });
    });
    for (const client of clients) {
        client.socket.send(JSON.stringify({
            action: 'admin_cheats_toggle',
            cheats: { vidaInfinita: true }
        }));
        await client.waitFor((message) =>
            message.type === 'admin_cheats_sync' && message.cheats && message.cheats.vidaInfinita);
    }

    const updateA = await clientA.waitFor((message) =>
        message.type === 'world_update' &&
        message.slimes && message.slimes.length > 0 &&
        message.pets && message.pets[petA.pet_instance_id] && message.pets[petB.pet_instance_id]);
    const updateB = await clientB.waitFor((message) =>
        message.type === 'world_update' &&
        message.slimes && message.slimes.length > 0 &&
        message.pets && message.pets[petA.pet_instance_id] && message.pets[petB.pet_instance_id]);
    assert.equal(updateA.pets[petA.pet_instance_id].owner_id, 'heroi_player_a');
    assert.equal(updateA.pets[petB.pet_instance_id].owner_id, 'heroi_player_b');
    assert.equal(updateB.pets[petA.pet_instance_id].owner_id, 'heroi_player_a');
    assert.equal(updateB.pets[petB.pet_instance_id].owner_id, 'heroi_player_b');
    assert.equal(updateA.pets[petA.pet_instance_id].hp > 0, true);
    assert.equal(updateB.pets[petB.pet_instance_id].hp > 0, true);

    clientA.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'ATK' }));
    await clientA.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'ATK');
    const ownerA = updateA.players.heroi_player_a;
    const engagedMonster = updateA.slimes.filter((monster) => monster && monster.hp > 0)
        .map((monster) => ({
            monster,
            distance: Math.hypot(monster.x - (ownerA.x + 12), monster.y - (ownerA.y + 16))
        }))
        .filter((entry) => entry.distance <= 90)
        .sort((a, b) => a.distance - b.distance)[0];
    assert.ok(engagedMonster, 'test owner must have a real monster within basic attack reach');
    clientA.socket.send(JSON.stringify({
        action: 'corte',
        alvoTipo: 'slime',
        alvoId: engagedMonster.monster.id
    }));
    await clientA.waitFor((message) => message.type === 'world_update' && message.slimes &&
        message.slimes.some((monster) => monster.id === engagedMonster.monster.id &&
            monster.hp < engagedMonster.monster.hp), 5000);
    clientA.socket.send(JSON.stringify({
        action: 'admin_cheats_toggle',
        cheats: { superAtaque: true }
    }));
    await clientA.waitFor((message) =>
        message.type === 'admin_cheats_sync' && message.cheats && message.cheats.superAtaque);
    const petXpUpdateEarly = await clientA.waitFor((message) =>
        message.type === 'pet_xp_ganho' &&
        Array.isArray(message.ganhos) &&
        message.ganhos.some((gain) => gain.petInstanceId === petA.pet_instance_id), 15000)
        .catch((error) => { throw new Error(error.message + '\nServer trace:\n' + serverOutput.slice(-5000)); });
    const petXpGainEarly = petXpUpdateEarly.ganhos.find((gain) => gain.petInstanceId === petA.pet_instance_id);
    assert.ok(petXpGainEarly.xpGain > 0,
        'pet should gain individual XP for a real monster kill it contributed damage to');
    assert.ok(petXpUpdateEarly.petProfile.pets.find((pet) => pet.pet_instance_id === petA.pet_instance_id).pet_xp > 0,
        'pet XP update must include the refreshed persisted profile');
    const masteryGain = (petXpUpdateEarly.maestrias || []).find((gain) => gain.speciesId === petA.species_id);
    assert.ok(masteryGain && masteryGain.xpGain > 0,
        'pet species must gain mastery XP for a real kill after its owner engaged the target');
    assert.ok(petXpUpdateEarly.petProfile.maestria[petA.species_id].xpMaestria > 0 ||
        petXpUpdateEarly.petProfile.maestria[petA.species_id].nivelMaestria > 0,
    'mastery progress must be included in the updated owner profile');
    const persistedPetXpEarly = JSON.parse(fs.readFileSync(databaseFile, 'utf8')).player_a.pets
        .find((pet) => pet.pet_instance_id === petA.pet_instance_id);
    assert.ok(persistedPetXpEarly.pet_xp > 0, 'pet individual XP must be saved to the player profile');
    const persistedMastery = JSON.parse(fs.readFileSync(databaseFile, 'utf8')).player_a.maestria[petA.species_id];
    assert.ok(persistedMastery.xpMaestria > 0 || persistedMastery.nivelMaestria > 0,
        'species mastery progress must be persisted');
    await sleep(550);
    clientA.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'PARADO' }));
    await clientA.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'PARADO');
    clientA.socket.send(JSON.stringify({ action: 'admin_cheats_toggle', cheats: { superAtaque: false } }));
    await clientA.waitFor((message) =>
        message.type === 'admin_cheats_sync' && message.cheats && !message.cheats.superAtaque);

    const initialOwner = updateA.players.heroi_player_a;
    const initialPet = updateA.pets[petA.pet_instance_id];
    const movementCursor = clientA.waitFor.mark();
    for (let step = 1; step <= 16; step++) {
        clientA.socket.send(JSON.stringify({
            x: initialOwner.x,
            y: initialOwner.y - step * 18,
            moving: true,
            angulo: 0
        }));
        await sleep(120);
    }
    const followedUpdate = await clientA.waitFor.after(movementCursor, (message) => {
        const owner = message.type === 'world_update' && message.players && message.players.heroi_player_a;
        const pet = message.type === 'world_update' && message.pets && message.pets[petA.pet_instance_id];
        return !!(owner && pet && owner.y < initialOwner.y - 10 &&
            Math.hypot(pet.x - initialPet.x, pet.y - initialPet.y) > 10 &&
            pet.animationState === 'WALK');
    });
    const followedOwner = followedUpdate.players.heroi_player_a;
    const followedPet = followedUpdate.pets[petA.pet_instance_id];
    assert.ok(followedOwner.y < initialOwner.y - 10, 'owner movement must be applied by the live server');
    assert.ok(Math.hypot(followedPet.x - initialPet.x, followedPet.y - initialPet.y) > 10,
        'runtime pet must move while following its owner');
    const followedDistance = Math.hypot(followedPet.x - followedOwner.x, followedPet.y - followedOwner.y);
    assert.ok(followedDistance < 300,
        'pet should remain within recovery distance instead of becoming detached (distance=' + followedDistance + ')');
    const caughtUpCursor = clientA.waitFor.mark();
    const caughtUp = await clientA.waitFor.after(caughtUpCursor, (message) => {
        const owner = message.type === 'world_update' && message.players && message.players.heroi_player_a;
        const pet = message.type === 'world_update' && message.pets && message.pets[petA.pet_instance_id];
        return !!(owner && pet && owner.y < initialOwner.y - 150 &&
            Math.hypot(pet.x - owner.x, pet.y - owner.y) < 150);
    }, 5000);

    const cInitialUpdate = await clientC.waitFor((message) =>
        message.type === 'world_update' && message.slimes && message.slimes.length > 0);
    const cOwner = cInitialUpdate.players.heroi_player_c;
    const captureMonster = cInitialUpdate.slimes.find((monster) =>
        monster && monster.hp > 0 && monster.tipo === 'slime' &&
        Math.hypot(monster.x - (cOwner.x + 12), monster.y - (cOwner.y + 16)) <= 140);
    assert.ok(captureMonster, 'capture must target a living slime entity in the server world and in range');
    const initialXp = cOwner.xp;
    const initialDropIds = new Set((cInitialUpdate.drops || []).map((drop) => drop.id));
    let captureResult = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        const result = await captureWithTimingMinigame(clientC, captureMonster.id);
        if (result.success) {
            captureResult = result;
            break;
        }
        assert.equal(result.reason, 'capture_failed', 'capture result must come from the live server');
        assert.equal(result.minigamePassed, true, 'all three successful minigame rounds must apply the capture chance bonus');
        if (attempt < 4) await sleep(3100);
    }
    assert.ok(captureResult, 'server must eventually accept the genuine live-monster capture');
    assert.ok(captureResult.pet.pet_instance_id);
    const capturedPetId = captureResult.pet.pet_instance_id;
    assert.ok(captureResult.petProfile.pets.some((pet) => pet.pet_instance_id === capturedPetId),
        'capture response must refresh the owner-only PetInstance list');
    assert.ok(captureResult.petProfile.bestiario.slime.capturas > 0,
        'capture response must refresh the owner Bestiary record');
    assert.ok(captureResult.petProfile.maestria.slime,
        'successful species discovery must initialize its existing mastery record');
    const captureUpdate = await clientB.waitFor((message) =>
        message.type === 'world_update' && message.pets && message.pets[capturedPetId]);
    const consumedMonster = captureUpdate.slimes.find((monster) => monster.id === captureMonster.id);
    assert.equal(consumedMonster.hp, 0, 'captured live monster must be consumed in the world');
    assert.equal(captureUpdate.players.heroi_player_c.xp, initialXp, 'capture must not grant monster XP');
    for (const drop of captureUpdate.drops || []) {
        assert.ok(initialDropIds.has(drop.id), 'capture must not produce a new monster drop');
    }
    const persisted = JSON.parse(fs.readFileSync(databaseFile, 'utf8')).player_c;
    assert.ok(persisted.pets.some((pet) => pet.pet_instance_id === capturedPetId),
        'captured PetInstance must be persisted');
    assert.equal(persisted.petActiveId, capturedPetId, 'first successful capture must activate its runtime');

    const reconnectCursor = clientA.waitFor.mark();
    clientC.socket.close();
    await new Promise((resolve) => clientC.socket.once('close', resolve));
    await clientB.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        !message.pets[capturedPetId] && message.pets[petB.pet_instance_id]);
    clientC = await connectAndSelect(port, 'player_c');
    clients.push(clientC);
    clientC.socket.send(JSON.stringify({
        action: 'admin_cheats_toggle',
        cheats: { vidaInfinita: true }
    }));
    await clientC.waitFor((message) =>
        message.type === 'admin_cheats_sync' && message.cheats && message.cheats.vidaInfinita);
    const restoredCapture = await clientA.waitFor.after(reconnectCursor, (message) =>
        message.type === 'world_update' && message.pets && message.pets[capturedPetId]);
    assert.equal(restoredCapture.pets[capturedPetId].owner_id, 'heroi_player_c',
        'reconnect must restore the persisted Pet to the server runtime');
    assert.ok(['FOLLOW', 'IDLE', 'COMBAT'].includes(restoredCapture.pets[capturedPetId].state),
        'reconnected Pet must be alive in the runtime');

    clientC.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'PARADO' }));
    await clientC.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'PARADO');
    const capturedHp = captureUpdate.pets[capturedPetId].hp;
    await sleep(550);
    clientC.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'DEFESA' }));
    await clientC.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'DEFESA');
    const hpPetA = restoredCapture.pets[petA.pet_instance_id].hp;
    const hpPetB = restoredCapture.pets[petB.pet_instance_id].hp;
    clientA.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'ATK' }));
    await clientA.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'ATK');
    const atkModeUpdate = await clientB.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        message.pets[petA.pet_instance_id] && message.pets[petA.pet_instance_id].mode === 'ATK');
    const petAHpBeforeAtk = atkModeUpdate.pets[petA.pet_instance_id].hp;
    const petDamagedInAtkMode = await clientB.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        message.pets[petA.pet_instance_id] &&
        message.pets[petA.pet_instance_id].hp < petAHpBeforeAtk, 25000);
    assert.ok(petDamagedInAtkMode.pets[petA.pet_instance_id].hp < petAHpBeforeAtk,
        'a real monster must be able to damage an ATK-mode Pet');
    await sleep(550);
    clientA.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'DEFESA' }));
    await clientA.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'DEFESA');
    clientB.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'DEFESA' }));
    await clientB.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'DEFESA');
    const petADamaged = await clientB.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        message.pets[petA.pet_instance_id] && message.pets[petA.pet_instance_id].hp < hpPetA, 25000);
    assert.ok(petADamaged.pets[petA.pet_instance_id].hp < hpPetA,
        'real monsters must be able to damage Player A Pet');
    const petBDamaged = await clientA.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        message.pets[petB.pet_instance_id] && message.pets[petB.pet_instance_id].hp < hpPetB, 25000);
    assert.ok(petBDamaged.pets[petB.pet_instance_id].hp < hpPetB,
        'real monsters must be able to damage Player B Pet');
    const petDamageUpdate = await clientA.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        message.pets[capturedPetId] && message.pets[capturedPetId].hp < capturedHp, 20000);
    assert.ok(petDamageUpdate.pets[capturedPetId].hp < capturedHp,
        'a live world monster must damage the captured Pet through monster AI');
    const deadUpdate = await clientB.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        message.pets[capturedPetId] && message.pets[capturedPetId].state === 'DEAD', 30000);
    assert.equal(deadUpdate.pets[capturedPetId].hp, 0, 'Pet must enter DEAD at zero HP');
    clientC.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'ATK' }));
    const deadCommand = await clientC.waitFor.next((message) =>
        message.type === 'pet_mode_result' && message.success === false, 5000);
    assert.equal(deadCommand.success, false, 'server must reject Pet commands while DEAD');
    const respawnUpdate = await clientA.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        message.pets[capturedPetId] && message.pets[capturedPetId].state === 'RESPAWN', 8000);
    assert.equal(respawnUpdate.pets[capturedPetId].hp, 0,
        'RESPAWN is visible before HP restoration');
    const followAgain = await clientB.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        message.pets[capturedPetId] &&
        message.pets[capturedPetId].state === 'FOLLOW' &&
        message.pets[capturedPetId].hp === message.pets[capturedPetId].maxHp, 8000);
    const respawnedPet = followAgain.pets[capturedPetId];
    const respawnedOwner = followAgain.players.heroi_player_c;
    assert.ok(Math.hypot(respawnedPet.x - (respawnedOwner.x + 12),
        respawnedPet.y - (respawnedOwner.y + 16)) < 160,
    'respawn must use a safe position near the owner and resume FOLLOW');

    await sleep(550);
    clientA.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'ATK' }));
    const modeResult = await clientA.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'ATK');
    assert.equal(modeResult.success, true);
    assert.equal(modeResult.petInstanceId, petA.pet_instance_id,
        'mode result must identify the active Pet instance acknowledged by the server');
    const modeUpdate = await clientB.waitFor((message) =>
        message.type === 'world_update' &&
        message.pets &&
        message.pets[petA.pet_instance_id] &&
        message.pets[petA.pet_instance_id].mode === 'ATK');
    assert.equal(modeUpdate.pets[petA.pet_instance_id].mode, 'ATK');
    await sleep(550);
    clientB.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'ATK' }));
    await clientB.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'ATK');
    const skillUseB = await clientA.waitFor((message) =>
        message.type === 'world_update' && message.projeteis &&
        message.projeteis.some((projectile) =>
            projectile.petInstanceId === petB.pet_instance_id && projectile.tipo === 'louva_folha'), 12000);
    assert.equal(skillUseB.pets[petB.pet_instance_id].animationState, 'ATTACK',
        'the attack animation state must accompany the skill projectile in world_update');
    assert.ok(skillUseB.pets[petB.pet_instance_id].animationUntil > skillUseB.pets[petB.pet_instance_id].animationStartedAt,
        'the attack animation must have a bounded playback interval');
    assert.ok(skillUseB.projeteis.some((projectile) =>
        projectile.petInstanceId === petB.pet_instance_id && projectile.tipo === 'louva_folha'),
    'Louvadermi Pet must fire its existing leaf projectile');
    const projectileB = skillUseB.projeteis.find((projectile) =>
        projectile.petInstanceId === petB.pet_instance_id && projectile.tipo === 'louva_folha');
    assert.equal(projectileB.petTargetType, 'slime');
    const nearbyTargetsB = skillUseB.slimes.filter((monster) =>
        monster.hp > 0 && Math.hypot(monster.x - skillUseB.pets[petB.pet_instance_id].x,
            monster.y - skillUseB.pets[petB.pet_instance_id].y) <= 500);
    assert.ok(nearbyTargetsB.some((monster) => monster.id === projectileB.petTargetId),
        'Louva projectile must be bound to a nearby live world monster');
    const hpBeforeLouva = new Map(nearbyTargetsB.map((monster) => [monster.id, monster.hp]));
    const damageB = await clientA.waitFor((message) =>
        message.type === 'world_update' && message.slimes &&
        message.slimes.some((monster) => hpBeforeLouva.has(monster.id) &&
            (monster.hp === 0 || monster.hp < hpBeforeLouva.get(monster.id))), 12000);
    assert.ok(damageB.slimes.some((monster) => hpBeforeLouva.has(monster.id) &&
        monster.hp < hpBeforeLouva.get(monster.id)),
    'Louva projectile must apply damage to a nearby real monster');

    const skillUseA = await clientB.waitFor((message) =>
        message.type === 'world_update' && message.projeteis &&
        message.projeteis.some((projectile) =>
            projectile.petInstanceId === petA.pet_instance_id && projectile.tipo === 'cogumelo_veneno'), 12000);
    assert.ok(skillUseA.projeteis.some((projectile) =>
        projectile.petInstanceId === petA.pet_instance_id && projectile.tipo === 'cogumelo_veneno'),
    'Cogumelo Pet must fire its existing poison projectile through the shared runtime path');
    const projectileA = skillUseA.projeteis.find((projectile) =>
        projectile.petInstanceId === petA.pet_instance_id && projectile.tipo === 'cogumelo_veneno');
    assert.equal(projectileA.petTargetType, 'slime');
    const nearbyTargetsA = skillUseA.slimes.filter((monster) =>
        monster.hp > 0 && Math.hypot(monster.x - skillUseA.pets[petA.pet_instance_id].x,
            monster.y - skillUseA.pets[petA.pet_instance_id].y) <= 500);
    assert.ok(nearbyTargetsA.some((monster) => monster.id === projectileA.petTargetId),
        'Cogumelo projectile must target a nearby living world monster');
    const hpBeforeCogumelo = new Map(nearbyTargetsA.map((monster) => [monster.id, monster.hp]));
    const damageA = await clientB.waitFor((message) =>
        message.type === 'world_update' && message.slimes &&
        message.slimes.some((monster) => hpBeforeCogumelo.has(monster.id) &&
            (monster.hp === 0 || monster.hp < hpBeforeCogumelo.get(monster.id))), 12000);
    assert.ok(damageA.slimes.some((monster) => hpBeforeCogumelo.has(monster.id) &&
        monster.hp < hpBeforeCogumelo.get(monster.id)),
    'Cogumelo projectile must apply damage through the existing monster damage handler');

    await sleep(550);
    clientA.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'PARADO' }));
    await clientA.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === true && message.mode === 'PARADO');
    clientA.socket.send(JSON.stringify({ action: 'teleporte_mapa', mapa: 'cidade' }));
    await clientA.waitFor((message) => message.type === 'teleporte_confirmado' && message.mapa === 'cidade');
    const recoveredPet = await clientB.waitFor((message) =>
        message.type === 'world_update' && message.pets &&
        message.pets[petA.pet_instance_id] &&
        message.pets[petA.pet_instance_id].state === 'RETURN', 5000);
    const recoveredOwner = recoveredPet.players.heroi_player_a;
    const recoveredRuntime = recoveredPet.pets[petA.pet_instance_id];
    assert.ok(Math.hypot(recoveredRuntime.x - (recoveredOwner.x + 12),
        recoveredRuntime.y - (recoveredOwner.y + 16)) < 160,
    'excessive owner distance must trigger RETURN and safe repositioning');

    clientA.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'DEAD' }));
    const invalidModeResult = await clientA.waitFor((message) =>
        message.type === 'pet_mode_result' && message.success === false);
    assert.equal(invalidModeResult.success, false, 'client must not set a server lifecycle state');

    for (const client of [clientA, clientB]) {
        const socket = client.socket;
        socket.close();
        await new Promise((resolve) => socket.once('close', resolve));
    }
    const clientBAfterReconnect = await connectAndSelect(port, 'player_b');
    clients.push(clientBAfterReconnect);
    const reconnectUpdate = await clientBAfterReconnect.waitFor((message) =>
        message.type === 'world_update' && message.pets && message.pets[petB.pet_instance_id]);
    assert.equal(reconnectUpdate.pets[petB.pet_instance_id].owner_id, 'heroi_player_b');
});

test('server stuck recovery repositions a following Pet blocked by an isolated map obstacle', async (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmorpg-pet-stuck-'));
    const databaseFile = path.join(tempDir, 'players.json');
    const obstacleConfigFile = path.join(tempDir, 'obstacle.json');
    const obstacleStatsFile = path.join(tempDir, 'obstacle-stats.json');
    const preloadFile = path.join(tempDir, 'test-map-collision-hook.js');
    const port = await reservePort();
    const pet = petSystem.createPetInstance('slime');
    pet.mode = 'PARADO';
    fs.writeFileSync(databaseFile, JSON.stringify({
        stuck_owner: { personagemId: 'stuck-owner', level: 50, x: 142950, y: 13000, pets: [pet], petActiveId: pet.pet_instance_id }
    }));
    fs.writeFileSync(preloadFile, [
        "'use strict';",
        "const fs = require('node:fs');",
        "const Module = require('node:module');",
        "const originalLoad = Module._load;",
        "let blockedCalls = 0;",
        "Module._load = function (request, parent, isMain) {",
        "  const loaded = originalLoad.call(this, request, parent, isMain);",
        "  if (!String(request).toLowerCase().includes('mapa_mundo.js') || !loaded || loaded.__petTestCollisionHook) return loaded;",
        "  const originalCollision = loaded.colideMundo;",
        "  loaded.colideMundo = function (x, y, radius) {",
        "    try {",
        "      const obstacle = JSON.parse(fs.readFileSync(process.env.PET_TEST_OBSTACLE_FILE, 'utf8'));",
        "      if (Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.radius + (radius || 0)) {",
        "        blockedCalls++;",
        "        const statsFile = process.env.PET_TEST_OBSTACLE_STATS_FILE;",
        "        const temporaryStatsFile = statsFile + '.tmp';",
        "        fs.writeFileSync(temporaryStatsFile, JSON.stringify({ blockedCalls, x, y, radius }));",
        "        fs.renameSync(temporaryStatsFile, statsFile);",
        "        return true;",
        "      }",
        "    } catch (error) {",
        "      if (error.code !== 'ENOENT') throw error;",
        "    }",
        "    return originalCollision.call(this, x, y, radius);",
        "  };",
        "  Object.defineProperty(loaded, '__petTestCollisionHook', { value: true });",
        "  return loaded;",
        "};",
        ""
    ].join('\n'));

    let serverOutput = '';
    const child = spawn(process.execPath, ['--require', preloadFile, 'server.js'], {
        cwd: projectRoot,
        env: Object.assign({}, process.env, {
            NODE_ENV: 'test',
            LOCAL_ID_LOGIN_ENABLED: '1',
            MMORPG_DATABASE_FILE: databaseFile,
            PET_TEST_OBSTACLE_FILE: obstacleConfigFile,
            PET_TEST_OBSTACLE_STATS_FILE: obstacleStatsFile,
            PORT: String(port)
        }),
        stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
    child.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
    t.after(async () => {
        if (child.exitCode === null) {
            child.kill('SIGTERM');
            await Promise.race([
                new Promise((resolve) => child.once('exit', resolve)),
                sleep(3000)
            ]);
        }
        try { fs.unlinkSync(databaseFile + '.lock'); } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        for (const file of [databaseFile, obstacleConfigFile, obstacleStatsFile,
            obstacleStatsFile + '.tmp', preloadFile]) {
            try { fs.unlinkSync(file); } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
        }
        fs.rmdirSync(tempDir);
    });

    await waitForServer(child, port, () => serverOutput);
    const client = await connectAndSelect(port, 'stuck_owner');
    t.after(() => {
        if (client.socket.readyState !== WebSocket.CLOSED) client.socket.close();
    });
    client.socket.send(JSON.stringify({
        action: 'admin_cheats_toggle',
        cheats: { vidaInfinita: true }
    }));
    await client.waitFor((message) =>
        message.type === 'admin_cheats_sync' && message.cheats && message.cheats.vidaInfinita);
    const initial = await client.waitFor((message) =>
        message.type === 'world_update' && message.players &&
        message.players.heroi_stuck_owner && message.pets && message.pets[pet.pet_instance_id]);
    const initialOwner = initial.players.heroi_stuck_owner;
    const initialPet = initial.pets[pet.pet_instance_id];
    client.socket.send(JSON.stringify({ action: 'pet_set_mode', mode: 'PARADO' }));
    const modeSet = await client.waitFor.next((message) =>
        message.type === 'pet_mode_result' && message.success && message.mode === 'PARADO');
    assert.equal(modeSet.mode, 'PARADO');

    const initialDistance = Math.hypot(initialPet.x - (initialOwner.x + 12),
        initialPet.y - (initialOwner.y + 16)) || 1;
    const awayX = (initialOwner.x + 12 - initialPet.x) / initialDistance;
    const awayY = (initialOwner.y + 16 - initialPet.y) / initialDistance;
    const startMovingAt = client.waitFor.mark();
    for (let step = 1; step <= 30; step++) {
        client.socket.send(JSON.stringify({
            x: initialOwner.x + awayX * step * 8,
            y: initialOwner.y + awayY * step * 8,
            moving: true,
            angulo: Math.atan2(awayY, awayX)
        }));
        await sleep(80);
    }
    const hasSnapshot = (message) =>
        message.type === 'world_update' && message.players && message.players.heroi_stuck_owner &&
        message.pets && message.pets[pet.pet_instance_id];
    let follow = await client.waitFor.after(startMovingAt, (message) => {
        if (!hasSnapshot(message)) return false;
        const owner = message.players.heroi_stuck_owner;
        const runtime = message.pets[pet.pet_instance_id];
        const distance = Math.hypot(owner.x + 12 - runtime.x, owner.y + 16 - runtime.y);
        return runtime.state === 'FOLLOW' && distance > 76 && distance < 300;
    }, 5000);
    const followPet = follow.pets[pet.pet_instance_id];
    assert.ok(Math.hypot(followPet.x - initialPet.x, followPet.y - initialPet.y) > 0.75,
        'Pet must make measurable FOLLOW progress before obstruction');
    const currentCursor = client.waitFor.mark();
    const current = await client.waitFor.after(currentCursor, hasSnapshot, 1000);
    const ownerBeforeObstacle = current.players.heroi_stuck_owner;
    const petBeforeObstacle = current.pets[pet.pet_instance_id];
    const distanceBefore = Math.hypot(ownerBeforeObstacle.x + 12 - petBeforeObstacle.x,
        ownerBeforeObstacle.y + 16 - petBeforeObstacle.y);
    assert.ok(['FOLLOW', 'IDLE'].includes(petBeforeObstacle.state));
    assert.ok(distanceBefore > 10 && distanceBefore < 300);

    fs.writeFileSync(obstacleConfigFile, JSON.stringify({
        x: petBeforeObstacle.x,
        y: petBeforeObstacle.y,
        radius: 80
    }));
    const obstacleActivatedAt = Date.now();
    for (let step = 1; step <= 10; step++) {
        client.socket.send(JSON.stringify({
            x: ownerBeforeObstacle.x + awayX * step * 8,
            y: ownerBeforeObstacle.y + awayY * step * 8,
            moving: true,
            angulo: Math.atan2(awayY, awayX)
        }));
        await sleep(80);
    }
    const blocked = [];
    let recovery = null;
    let recoveryElapsedMs = null;
    while (Date.now() - obstacleActivatedAt < 5000) {
        const cursor = client.waitFor.mark();
        const snapshot = await client.waitFor.after(cursor, hasSnapshot, 1000);
        const runtime = snapshot.pets[pet.pet_instance_id];
        const displacement = Math.hypot(runtime.x - petBeforeObstacle.x, runtime.y - petBeforeObstacle.y);
        const owner = snapshot.players.heroi_stuck_owner;
        const distanceToOwner = Math.hypot(runtime.x - (owner.x + 12), runtime.y - (owner.y + 16));
        if (Date.now() - obstacleActivatedAt >= 1200 && runtime.state === 'RETURN' &&
            displacement > 30 && distanceToOwner < 160) {
            recovery = snapshot;
            recoveryElapsedMs = Date.now() - obstacleActivatedAt;
            break;
        }
        blocked.push({ runtime, elapsed: Date.now() - obstacleActivatedAt });
        await sleep(50);
    }
    assert.ok(fs.existsSync(obstacleStatsFile),
        'server must attempt Pet movement into the isolated obstacle');
    const collisionStats = JSON.parse(fs.readFileSync(obstacleStatsFile, 'utf8'));
    assert.ok(collisionStats.blockedCalls > 0, 'server map collision handler must reject Pet movement at the obstacle');
    assert.ok(blocked.some((sample) => sample.runtime.state === 'FOLLOW'),
        'Pet must be in FOLLOW while attempting to cross the blocked location');
    assert.ok(blocked.length >= 4, 'test must observe repeated world updates during zero progress');
    const stableTail = blocked.slice(-4);
    const stableX = stableTail[0].runtime.x;
    const stableY = stableTail[0].runtime.y;
    assert.ok(stableTail.every((sample) =>
        Math.hypot(sample.runtime.x - stableX, sample.runtime.y - stableY) < 0.75),
    'Pet must show no meaningful progress over repeated world updates');
    assert.ok(blocked[blocked.length - 1].elapsed >= 1000,
        'absence of progress must persist long enough to exercise stuck detection');
    assert.ok(recovery, 'stuck detection must enter recovery and reposition the Pet');
    const recoveredPet = recovery.pets[pet.pet_instance_id];
    const recoveredOwner = recovery.players.heroi_stuck_owner;
    assert.ok(Math.hypot(recoveredPet.x - petBeforeObstacle.x,
        recoveredPet.y - petBeforeObstacle.y) > 30);
    assert.ok(Math.hypot(recoveredPet.x - (recoveredOwner.x + 12),
        recoveredPet.y - (recoveredOwner.y + 16)) < 160,
    'recovery must use a safe nearby position');
    assert.ok(Math.hypot(recoveredPet.x - petBeforeObstacle.x,
        recoveredPet.y - petBeforeObstacle.y) >= 104,
    'recovery position must be outside the injected obstacle plus Pet collision radius');
    const maxBlockedDisplacement = Math.max(...blocked.map((sample) =>
        Math.hypot(sample.runtime.x - petBeforeObstacle.x, sample.runtime.y - petBeforeObstacle.y)));
    t.diagnostic('stuck recovery metrics: ' + JSON.stringify({
        stateBefore: petBeforeObstacle.state,
        ownerGapBeforePx: Number(distanceBefore.toFixed(1)),
        obstacleRadiusPx: 80,
        blockedCollisionChecks: collisionStats.blockedCalls,
        blockedSamples: blocked.length,
        maxBlockedDisplacementPx: Number(maxBlockedDisplacement.toFixed(1)),
        noProgressObservedMs: blocked[blocked.length - 1].elapsed,
        recoveryDetectedAfterMs: recoveryElapsedMs,
        recoveryAction: 'RETURN with safe reposition',
        petPositionBefore: { x: petBeforeObstacle.x, y: petBeforeObstacle.y },
        petPositionAfter: { x: recoveredPet.x, y: recoveredPet.y },
        ownerGapAfterPx: Number(Math.hypot(recoveredPet.x - (recoveredOwner.x + 12),
            recoveredPet.y - (recoveredOwner.y + 16)).toFixed(1)),
        obstacleClearancePx: Number(Math.hypot(recoveredPet.x - petBeforeObstacle.x,
            recoveredPet.y - petBeforeObstacle.y).toFixed(1)),
        stateAfterRecovery: recoveredPet.state
    }));

    fs.unlinkSync(obstacleConfigFile);
    const resumeCursor = client.waitFor.mark();
    for (let step = 1; step <= 10; step++) {
        client.socket.send(JSON.stringify({
            x: recoveredOwner.x - step * 10,
            y: recoveredOwner.y,
            moving: true,
            angulo: Math.PI
        }));
        await sleep(100);
    }
    const resumed = await client.waitFor.after(resumeCursor, (message) =>
        hasSnapshot(message) && message.pets[pet.pet_instance_id].state === 'FOLLOW', 5000);
    assert.equal(resumed.pets[pet.pet_instance_id].state, 'FOLLOW');
    t.diagnostic('state after recovery, obstruction removal, and owner movement: ' +
        resumed.pets[pet.pet_instance_id].state);
});
