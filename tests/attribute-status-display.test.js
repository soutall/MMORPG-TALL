'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const attributesSource = fs.readFileSync(path.join(projectRoot, 'atributos.js'), 'utf8');
const skillsSource = fs.readFileSync(path.join(projectRoot, 'skills.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

test('attribute status descriptions and derived values match server progression', () => {
    assert.match(attributesSource, /Força',\s*bonus: '\+1 dano físico direto por ponto'/);
    assert.match(attributesSource, /Inteligência',\s*bonus: '\+10 dano mágico e \+10 Mana máxima por ponto'/);
    assert.match(attributesSource, /Vida',\s*bonus: '\+5 Vida máxima por ponto'/);
    assert.match(attributesSource, /Profanidade',\s*bonus: '\+1% de dano periódico por ponto'/);
    assert.match(attributesSource, /Afinidade',\s*bonus: '\+5% dano do Malakar e herança de atributos para pets\/lacaios/);
    assert.match(attributesSource, /let maxHp = Math\.round\(100 \+ \(g\('vida'\) - 1\) \* 5\);/);
    assert.match(attributesSource, /let danoFisico = Math\.max\(0, g\('forca'\) - 1\);/);
    assert.match(attributesSource, /let danoMagico = Math\.max\(0, \(g\('inteligencia'\) - 1\) \* 10\);/);
    assert.doesNotMatch(attributesSource, /g\('forca'\) - 1\) \* 0\.05/);
});

test('skill preview uses flat Force and Intelligence bonuses', () => {
    assert.match(skillsSource, /if \(atr\.chave === 'forca'\) dano \+= pontos;/);
    assert.match(skillsSource, /else if \(atr\.chave === 'inteligencia'\) dano \+= pontos \* 10;/);
    assert.match(skillsSource, /return '\+1 dano por ponto de Força';/);
    assert.match(skillsSource, /return '\+10 dano por ponto de Inteligência';/);
    assert.match(skillsSource, /Escala com atributos herdados do lacaio/);
    assert.doesNotMatch(skillsSource, /baseDano \* \(1 \+ \(tot - 1\) \* 0\.05\)/);
});

test('Berserker spin damage and skill preview both use a half-damage multiplier', () => {
    assert.match(serverSource, /dmgSkill\(player, 'giro_descontrolado', 18\) \* 0\.2/);
    assert.match(serverSource, /registrarDanoMonstro\(slime, pid, danoGiro, 'player', undefined, undefined, 0\.5\)/);
    assert.match(serverSource, /registrarDanoBoss\(boss, pid, danoGiro, 'skill', 'player', undefined, undefined, 0\.5\)/);
    assert.match(skillsSource, /id: 'giro_descontrolado'[\s\S]{0,300}danoMultiplicadorBase: 0\.2, danoMultiplicadorFinal: 0\.5/);
    assert.match(clientSource, /const GAME_VERSION = 'v1\.75\.83'/);
});
