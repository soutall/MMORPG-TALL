'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const petsUI = require('../../sistemas/pets/pets-ui.js');
const root = path.join(__dirname, '..', '..');

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

test('Bestiary previews use the registered monster asset and redraw when its sprite loads', () => {
    const source = fs.readFileSync(path.join(root, 'sistemas', 'pets', 'pets-ui.js'), 'utf8');
    const commonRenderer = fs.readFileSync(path.join(root, 'classes', 'comum.js'), 'utf8');
    assert.match(source, /asset:\s*\(pet\s*&&\s*pet\.asset\)\s*\|\|\s*species\.asset/);
    assert.match(source, /featured \? 3 : 1/);
    assert.match(source, /preview:\s*true/);
    assert.match(source, /sprite\.metadata\s*&&\s*sprite\.image/);
    assert.match(source, /canvas\.isConnected/);
    assert.match(commonRenderer, /if\s*\(slime\s*&&\s*slime\.preview\)\s*return/);
});

test('Bestiary detail presentation emphasizes the real monster preview and its statistics', () => {
    const source = fs.readFileSync(path.join(root, 'sistemas', 'pets', 'pets-ui.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'sistemas', 'pets', 'pets-ui.css'), 'utf8');
    assert.match(source, /pets-preview-featured/);
    assert.match(source, /pets-stat-value/);
    assert.match(styles, /\.pets-detail-header\s*\{[^}]*flex-direction:\s*column/s);
    assert.match(styles, /\.pets-detail-header \.pets-preview-featured\s*\{[^}]*width:\s*clamp/s);
    assert.match(styles, /\.pets-stat-value\s*\{[^}]*font-weight:\s*900/s);
    assert.match(styles, /\.pets-knowledge-meter \+ \.pets-detail-subtitle\s*\{[^}]*font-weight:\s*900/s);
    assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*1fr\);\s*grid-template-rows:/);
});

test('Bestiary list previews render lazily and species selection reuses its cached list', () => {
    const source = fs.readFileSync(path.join(root, 'sistemas', 'pets', 'pets-ui.js'), 'utf8');
    assert.match(source, /function makePreview\(species, pet, className, lazy\)/);
    assert.match(source, /new win\.IntersectionObserver/);
    assert.match(source, /makePreview\(row\.species, null, '', true\)/);
    assert.match(source, /speciesDetailsNode\.replaceChildren\(renderSpeciesDetails\(selected\)\)/);
});
