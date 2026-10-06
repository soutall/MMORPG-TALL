'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const petsUI = require('../../sistemas/pets/pets-ui.js');

test('Bestiary rows reveal registered species and keep undiscovered entries masked', () => {
    const rows = petsUI.buildSpeciesRows([
        { species_id: 'slime', nome: 'Slime' },
        { species_id: 'ogro', nome: 'Ogro' }
    ], {
        slime: { capturas: 1, monstrosMortos: 0 }
    });

    assert.equal(rows[0].species.species_id, 'slime');
    assert.equal(rows[0].discovered, true);
    assert.equal(rows[1].discovered, false);
    assert.equal(rows[1].record, null);
});

test('My Pets keeps same-species PetInstances independent and overlays live runtime fields', () => {
    const first = { pet_instance_id: 'pet_one', species_id: 'slime', level: 2, hp: 70, mode: 'ATK' };
    const second = { pet_instance_id: 'pet_two', species_id: 'slime', level: 5, hp: 95, mode: 'PARADO' };
    const rows = petsUI.buildPetRows([first, second], 'pet_one', {
        pet_one: { hp: 0, state: 'DEAD' },
        pet_two: { hp: 80, state: 'FOLLOW' }
    });

    assert.equal(rows.length, 2);
    assert.equal(rows[0].pet.pet_instance_id, 'pet_one');
    assert.equal(rows[0].pet.level, 2);
    assert.equal(rows[0].pet.hp, 0);
    assert.equal(rows[0].pet.state, 'DEAD');
    assert.equal(rows[0].active, true);
    assert.equal(rows[1].pet.pet_instance_id, 'pet_two');
    assert.equal(rows[1].pet.level, 5);
    assert.equal(rows[1].pet.hp, 80);
    assert.equal(rows[1].pet.state, 'FOLLOW');
    assert.equal(rows[1].active, false);
});

test('Pet UI formats stored rarity and passives without inventing missing values', () => {
    assert.equal(petsUI.rarityLabel('lendario'), 'Lendário');
    assert.deepEqual(petsUI.listValues(['Aggressive', { nome: 'Loyal' }, null]), ['Aggressive', 'Loyal']);
    assert.deepEqual(petsUI.listValues(undefined), []);
});
