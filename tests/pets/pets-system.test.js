const assert = require('node:assert/strict');
const test = require('node:test');
const petSystem = require('../../sistemas/pets/pets_system.js');

test('localiza monstros existentes no registro do projeto', () => {
    const monsters = petSystem.listMonsterSpecies();
    assert.ok(monsters.length > 0, 'deve localizar monstros no catálogo');
    assert.ok(monsters.some((monster) => monster.species_id === 'slime'));
    assert.ok(monsters.some((monster) => monster.species_id === 'besouro_dourado'));
});

test('registra espécies automaticamente a partir do catálogo original', () => {
    const registry = petSystem.buildSpeciesRegistry();
    assert.ok(registry.slime, 'slime deve existir no registro');
    assert.equal(registry.slime.capturavel, true);
    assert.equal(registry.slime.elite, false);
    assert.equal(registry.slime.boss, false);
});

test('registra automaticamente monstros normais e ignora elite/boss', () => {
    const capturaveis = petSystem.getCapturableSpecies();
    assert.ok(capturaveis.some((monster) => monster.species_id === 'slime'));
    assert.ok(capturaveis.some((monster) => monster.species_id === 'slime_elite') === false);
    assert.ok(capturaveis.some((monster) => monster.species_id === 'besouro_dourado'));
});

test('espécies e instâncias de pet expõem ícone e emoji corretos', () => {
    const species = petSystem.getSpeciesById('escorpiao_escaldante');
    assert.ok(species, 'espécie deve existir');
    assert.equal(species.emoji, '🦂');
    assert.equal(species.icon, '🦂');

    const pet = petSystem.createPetInstance('escorpiao_escaldante');
    assert.equal(pet.emoji, '🦂');
    assert.equal(pet.icon, '🦂');
    assert.equal(pet.visual.icon, '🦂');
});

test('troca de pet ativo precisa alternar o perfil corretamente', () => {
    const profile = {
        pets: [
            { pet_instance_id: 'pet_a', species_id: 'slime', nome: 'Slime A' },
            { pet_instance_id: 'pet_b', species_id: 'escorpiao_escaldante', nome: 'Escorpião B' }
        ],
        bestiario: {},
        maestria: {},
        captureState: { species: {} },
        petActiveId: null
    };

    const afterSelect = petSystem.setActivePet(profile, 'pet_b');
    assert.equal(afterSelect.valid, true);
    assert.equal(afterSelect.petActiveId, 'pet_b');
    assert.equal(afterSelect.profile.petActiveId, 'pet_b');

    const afterClear = petSystem.clearActivePet(afterSelect.profile);
    assert.equal(afterClear.valid, true);
    assert.equal(afterClear.petActiveId, null);
    assert.equal(afterClear.profile.petActiveId, null);
});

test('espécies com projéteis existentes expõem somente a habilidade original compatível', () => {
    assert.deepEqual(
        petSystem.getSpeciesById('cogumelo_proibido').combat_profile.petAttackSkill,
        {
            projectileType: 'cogumelo_veneno',
            projectileSpeed: 8,
            projectileLife: 80,
            cooldownMs: 3250
        }
    );
    assert.deepEqual(
        petSystem.getSpeciesById('louvadermi').combat_profile.petAttackSkill,
        {
            projectileType: 'louva_folha',
            projectileSpeed: 11,
            projectileLife: 80,
            cooldownMs: 2100
        }
    );
    assert.equal(petSystem.getSpeciesById('slime').combat_profile.petAttackSkill, null);
});

test('rejeita Elite no backend', () => {
    const elite = petSystem.getSpeciesById('slime_elite');
    assert.ok(elite, 'elite deve estar no catálogo de espécies');
    assert.equal(elite.capturavel, false);
    assert.throws(() => petSystem.createPetInstance('slime_elite'), /não pode ser capturada|Elite/i);
});

test('rejeita Boss no backend', () => {
    assert.equal(petSystem.isMonsterCapturable({ tags: ['boss'] }), false);
    assert.equal(petSystem.isMonsterCapturable({ boss: true }), false);
    assert.equal(petSystem.isMonsterCapturable({ boss: false, tags: ['elite'] }), false);
});

test('valida species_id', () => {
    assert.equal(petSystem.validateSpeciesId('slime'), 'slime');
    assert.throws(() => petSystem.validateSpeciesId('Slime!'), /species_id/i);
    assert.throws(() => petSystem.validateSpeciesId(''), /species_id/i);
});

test('cria PetInstance com ID único', () => {
    const pet = petSystem.createPetInstance('slime');
    assert.match(pet.pet_instance_id, /^pet_[0-9a-f-]+$/i);
    assert.notEqual(pet.pet_instance_id, pet.species_id);
    assert.equal(pet.rarity, 'comum');
    assert.equal(pet.level, 1);
});

test('garante ID único para instâncias do mesmo perfil', () => {
    const first = petSystem.createPetInstance('slime');
    const second = petSystem.createPetInstance('slime');
    assert.notEqual(first.pet_instance_id, second.pet_instance_id);
});

test('calcula XP de Maestria', () => {
    const xp = petSystem.computeMasteryXpGain({ playerLevel: 10, monsterLevel: 5, levelDifference: 5 });
    assert.ok(Number.isFinite(xp));
    assert.ok(xp > 0, 'deve gerar XP positivo');
});

test('progressão de Maestria', () => {
    const mastery = petSystem.createMasteryRecord('slime');
    petSystem.applyMasteryXp(mastery, { xp: 500 });
    assert.ok(mastery.xpMaestria >= 0);
    assert.ok(mastery.nivelMaestria >= 0);
    assert.ok(mastery.xpParaProximo > 0);
});

test('reconhecimento automático de novo monstro em catálogo customizado', () => {
    const customRegistry = {
        slime: { nome: 'Slime', nivel: 1, tags: ['diurno'], boss: false },
        novo_teste: { nome: 'Novo Teste', nivel: 12, tags: [], boss: false }
    };
    const registry = petSystem.buildSpeciesRegistry(customRegistry);
    assert.ok(registry.novo_teste, 'novo monstro deve entrar no catálogo');
    assert.equal(registry.novo_teste.capturavel, true);
});

test('captura válida é autorizada no servidor e gera pet individual', () => {
    const player = { id: 'player-capture', level: 25, x: 0, y: 0 };
    const monster = { id: 'slime-capture', tipo: 'slime', species_id: 'slime', nivel: 12, hp: 8, maxHp: 80, x: 10, y: 0 };
    const profile = { pets: [], bestiario: {}, maestria: {} };
    const result = petSystem.createPetCaptureResult({ player, monster, profile, sourceX: 0, sourceY: 0, targetX: 10, targetY: 0, random: () => 0.01 });
    assert.equal(result.success, true, 'captura deve ocorrer com chance favorável');
    assert.ok(result.pet, 'deve gerar pet capturado');
    assert.match(result.pet.pet_instance_id, /^pet_[0-9a-f-]+$/i);
    assert.equal(result.pet.species_id, 'slime');
    assert.ok(Array.isArray(result.pet.passivas) && result.pet.passivas.length > 0);
    assert.ok(result.pet.potential >= 0 && result.pet.potential <= 100);
});

test('captura inválida rejeita distância e estado do alvo', () => {
    const player = { id: 'player-far', level: 15, x: 0, y: 0 };
    const monster = { id: 'slime-far', tipo: 'slime', species_id: 'slime', nivel: 10, hp: 8, maxHp: 80, x: 500, y: 0 };
    const validation = petSystem.validateCaptureAttempt({ player, monster, profile: { pets: [], bestiario: {}, maestria: {} }, sourceX: 0, sourceY: 0, targetX: 500, targetY: 0 });
    assert.equal(validation.valid, false);
    assert.equal(validation.reason, 'distance_invalid');
});

test('HP baixo aumenta a chance de captura no backend', () => {
    const fullHpChance = petSystem.calculateCaptureChance({ playerLevel: 20, monsterLevel: 12, monsterHp: 80, maxHp: 80, masteryLevel: 5, pityFails: 0, resistance: 0 });
    const lowHpChance = petSystem.calculateCaptureChance({ playerLevel: 20, monsterLevel: 12, monsterHp: 10, maxHp: 80, masteryLevel: 5, pityFails: 0, resistance: 0 });
    assert.ok(lowHpChance > fullHpChance, 'HP baixo deve produzir chance maior');
});

test('diferença de level modifica a chance de captura', () => {
    const easy = petSystem.calculateCaptureChance({ playerLevel: 30, monsterLevel: 10, monsterHp: 20, maxHp: 80, masteryLevel: 4, pityFails: 0, resistance: 0 });
    const hard = petSystem.calculateCaptureChance({ playerLevel: 30, monsterLevel: 45, monsterHp: 20, maxHp: 80, masteryLevel: 4, pityFails: 0, resistance: 0 });
    assert.ok(easy > hard, 'monstro muito mais forte deve reduzir chance');
});

test('falhas consecutivas criam resistência temporária', () => {
    const profile = { pets: [], bestiario: {}, maestria: {} };
    const attempt = petSystem.createPetCaptureResult({
        player: { id: 'player-r', level: 10, x: 0, y: 0 },
        monster: { id: 'slime-r1', tipo: 'slime', species_id: 'slime', nivel: 20, hp: 41, maxHp: 80, x: 5, y: 0 },
        profile: profile,
        sourceX: 0, sourceY: 0, targetX: 5, targetY: 0,
        random: () => 0.999
    });
    assert.equal(attempt.success, false);
    assert.ok(attempt.profile.captureState.species.slime.resistance > 0);
});

test('raridade, status e potencial são gerados corretamente', () => {
    const pet = petSystem.createPetInstance('slime', {
        rarity: 'raro',
        potential: 68,
        status: { vida: 25, ataque: 18, defesa: 12, critico: 15, velocidade: 10, sorte: 8 },
        passivas: [{ nome: 'Instinto Goblin' }],
        traits: [{ nome: 'Agressivo' }]
    });
    assert.equal(pet.rarity, 'raro');
    assert.equal(pet.potential, 68);
    assert.ok(pet.status.vida > 0);
    assert.ok(Array.isArray(pet.passivas) && pet.passivas.length > 0);
    assert.ok(Array.isArray(pet.traits) && pet.traits.length > 0);
});

test('passivas e traits são data-driven e modulares', () => {
    const passive = petSystem.generatePassiveSet('goblin', 'incomum', 55, { random: () => 0.2 });
    const traits = petSystem.pickTraits({ count: 2, random: () => 0.25 });
    assert.ok(Array.isArray(passive) && passive.length > 0);
    assert.ok(Array.isArray(traits) && traits.length > 0);
    assert.ok(passive[0].nome || passive[0].key);
});

test('XP e nível do pet são independentes da maestria da espécie', () => {
    const pet = petSystem.createPetInstance('slime', { pet_xp: 330, level: 1 });
    petSystem.gainPetXp(pet, 120);
    assert.ok(pet.pet_xp >= 330);
    assert.equal(pet.level, 3);
    assert.equal(pet.pet_level, pet.level, 'level e pet_level devem permanecer sincronizados');
    assert.equal(pet.pet_xp_progress, 0, '450 XP acumulados devem preencher os níveis 1 e 2');
    assert.equal(pet.pet_xp_to_next, 360, 'o nível 3 exige 360 XP para o próximo nível');
    assert.equal(pet.status.vida, pet.status_base.vida + 2,
        'dois níveis ganhos devem aumentar vida em pelo menos 1 por nível');
    assert.equal(pet.status.ataque, pet.status_base.ataque + 2,
        'dois níveis ganhos devem aumentar ataque em pelo menos 1 por nível');
    assert.equal(pet.status.defesa, pet.status_base.defesa + 2,
        'dois níveis ganhos devem aumentar defesa em pelo menos 1 por nível');
    petSystem.gainPetXp(pet, 50);
    assert.equal(pet.pet_xp_progress, 50, 'o progresso deve mostrar o XP dentro do nível atual');
    assert.equal(pet.pet_xp_to_next, 360);
    const mastery = petSystem.createMasteryRecord('slime');
    petSystem.applyMasteryXp(mastery, { xp: 250 });
    assert.ok(mastery.nivelMaestria >= 0);
    assert.notEqual(mastery.nivelMaestria, pet.level);
});

test('maestria de espécie progride em patamares próprios e registra recompensas de nível', () => {
    const mastery = petSystem.createMasteryRecord('slime');
    petSystem.applyMasteryXp(mastery, { xp: petSystem.getMasteryXpToNext(0) });
    assert.equal(mastery.nivelMaestria, 1);
    assert.equal(mastery.xpMaestria, 0);
    assert.equal(mastery.xpParaProximo, petSystem.getMasteryXpToNext(1));
    assert.deepEqual(mastery.recompensas.map((reward) => reward.nivel), [1]);

    petSystem.applyMasteryXp(mastery, { xp: petSystem.getMasteryXpToNext(1) + 25 });
    assert.equal(mastery.nivelMaestria, 2);
    assert.equal(mastery.xpMaestria, 25);
    assert.equal(mastery.xpParaProximo, petSystem.getMasteryXpToNext(2));
    assert.deepEqual(mastery.recompensas.map((reward) => reward.nivel), [1, 2]);
});

test('conhecimento do Bestiário sobe por abates com barra independente da maestria', () => {
    const bestiario = {};
    const first = petSystem.grantMonsterKnowledge(bestiario, 'slime', 1, 1);
    assert.equal(first.entry.monstrosMortos, 1);
    assert.equal(first.level, 0);
    assert.equal(first.xpGain, 23);
    assert.equal(first.xpProgress, 23);
    assert.equal(first.xpToNext, 100);
    assert.equal(first.captureBonusPercent, 0);

    const next = petSystem.grantMonsterKnowledge(bestiario, 'slime', 1, 4);
    assert.equal(next.entry.monstrosMortos, 5);
    assert.equal(next.level, 1);
    assert.equal(next.xpProgress, 15);
    assert.equal(next.xpToNext, 175);
    assert.equal(next.captureBonusPercent, 1.5);
    assert.equal(bestiario.slime.nivelMaestria, 0,
        'Bestiary knowledge must not mutate species mastery');
});

test('Conhecimento aumenta somente a chance de captura e respeita o limite global', () => {
    const base = petSystem.calculateCaptureChance({
        playerLevel: 15, monsterLevel: 20, monsterHp: 20, maxHp: 100,
        masteryLevel: 0, knowledgeLevel: 0, pityFails: 0, resistance: 0
    });
    const informed = petSystem.calculateCaptureChance({
        playerLevel: 15, monsterLevel: 20, monsterHp: 20, maxHp: 100,
        masteryLevel: 0, knowledgeLevel: 5, pityFails: 0, resistance: 0
    });
    const capped = petSystem.calculateCaptureChance({
        playerLevel: 15, monsterLevel: 20, monsterHp: 20, maxHp: 100,
        masteryLevel: 0, knowledgeLevel: 100, pityFails: 0, resistance: 0
    });
    assert.ok(informed > base, 'knowledge should improve capture chance');
    assert.ok(capped <= 0.88, 'knowledge must respect the existing global chance cap');

    const pet = petSystem.createPetInstance('slime');
    const statusBefore = Object.assign({}, pet.status);
    petSystem.grantMonsterKnowledge({}, 'slime', 1, 10);
    assert.deepEqual(pet.status, statusBefore,
        'Bestiary knowledge must never mutate any pet attributes');
});

test('pet só considera inimigo engajado pelo próprio dono como alvo', () => {
    const enemy = { id: 'mob_1', hp: 20 };
    assert.equal(petSystem.isEnemyEngagedByOwner(enemy, 'player_1'), false,
        'inimigo próximo mas não atacado pelo dono não deve liberar o pet para atacar');
    enemy.petAggroOwners = { player_2: Date.now() };
    assert.equal(petSystem.isEnemyEngagedByOwner(enemy, 'player_1'), false,
        'ataque de outro jogador não deve liberar o alvo para este pet');
    enemy.petAggroOwners.player_1 = Date.now();
    assert.equal(petSystem.isEnemyEngagedByOwner(enemy, 'player_1'), true,
        'dano iniciado pelo dono deve liberar esse inimigo como alvo');
});

test('aceita valores zero sem quebrar a captura e os traits', () => {
    const chance = petSystem.calculateCaptureChance({
        playerLevel: 0,
        monsterLevel: 0,
        monsterHp: 0,
        maxHp: 0,
        masteryLevel: 0,
        pityFails: 0,
        resistance: 0
    });
    assert.ok(chance > 0 && chance <= 1);
    const traits = petSystem.pickTraits({ count: 0, random: () => 0.3 });
    assert.deepEqual(traits, []);
});

test('pet AI segue o dono e entra em estado de combate no servidor', () => {
    const pet = petSystem.createPetInstance('slime', { x: 0, y: 0, hp: 50, maxHp: 50 });
    const owner = { id: 'player-pet', x: 200, y: 0 };
    const runtime = petSystem.createPetAIState(pet, owner.id, { followDistance: 90, combatRange: 80 });
    runtime.x = 0;
    runtime.y = 0;
    const updated = petSystem.updatePetFollowState(runtime, owner, { enemyList: [], deltaMs: 100 });
    assert.equal(updated.state, petSystem.PET_STATES.FOLLOW);

    const enemy = { id: 'monster-1', type: 'slime', x: 60, y: 0, hp: 30 };
    const combatState = petSystem.updatePetFollowState(updated, owner, { enemyList: [enemy], deltaMs: 100 });
    assert.equal(combatState.state, petSystem.PET_STATES.COMBAT);

    const validation = petSystem.validatePetServerAction('attack', combatState, owner, enemy, { deltaMs: 100 });
    assert.equal(validation.valid, true);
    assert.equal(validation.reason, 'valid');
});

test('pet AI rejeita ação sem dono válido e reseta em estado de retorno em stuck', () => {
    const pet = petSystem.createPetInstance('slime', { x: 0, y: 0, hp: 20, maxHp: 20 });
    const runtime = petSystem.createPetAIState(pet, 'owner-a', { stuckRecoveryMs: 50 });
    const owner = { id: 'owner-a', x: 0, y: 0 };
    runtime.x = 0;
    runtime.y = 0;
    runtime.lastMoveAt = Date.now() - 1000;
    runtime.stuckTimer = 70;
    const result = petSystem.updatePetFollowState(runtime, owner, { enemyList: [], deltaMs: 100 });
    assert.equal(result.state, petSystem.PET_STATES.RETURN);

    const invalid = petSystem.validatePetServerAction('attack', runtime, { id: 'other-owner' }, { id: 'enemy' }, {});
    assert.equal(invalid.valid, false);
    assert.equal(invalid.reason, 'owner_mismatch');
});
