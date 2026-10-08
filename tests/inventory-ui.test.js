'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const inventory = fs.readFileSync(path.join(root, 'inventario.js'), 'utf8');
const inventoryCss = fs.readFileSync(path.join(root, 'inventario.css'), 'utf8');
const statusCss = fs.readFileSync(path.join(root, 'atributos.css'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const bestiary = fs.readFileSync(path.join(root, 'sistemas', 'pets', 'pets-ui.js'), 'utf8');

test('inventory no longer depends on the old artwork and exposes every category and gear filter', () => {
    assert.doesNotMatch(html, /src="imagem\/HUD\/InventoryHUD\.png/);
    for (const category of ['todos', 'equipamentos', 'itens', 'consumiveis', 'pedras', 'quest', 'cosmeticos']) {
        assert.match(html, new RegExp('data-aba="' + category + '"'));
    }
    for (const slot of ['arma', 'armaSecundaria', 'armadura', 'capacete', 'peitoral', 'capa', 'luva', 'colar', 'anel', 'bota']) {
        assert.match(html, new RegExp('data-slot-filtro="' + slot + '"'));
    }
    assert.doesNotMatch(html, /btn-inv-categorias-extra|btn-inv-slot-extra/);
    assert.match(inventoryCss, /grid-template-areas:\s*"equipment"\s*"backpack"\s*"inspect"\s*"actions"/);
    assert.equal((html.match(/class="mochila-aba(?: ativa)?"/g) || []).length, 7);
    assert.equal((html.match(/class="mochila-aba(?: ativa)?"[^>]*>.*?class="aba-ico"/g) || []).length, 7);
    assert.equal((html.match(/class="mochila-filtro-slot(?: ativo)?"/g) || []).length, 11);
    assert.match(inventoryCss, /\.slot-peitoral::before\s*\{\s*content:\s*"🛡️"/);
    assert.match(inventoryCss, /\[data-atributo="forca"\]::before\s*\{\s*content:\s*"👊"/);
    assert.match(inventoryCss, /\[data-atributo="inteligencia"\]::before\s*\{\s*content:\s*"📖"/);
    assert.match(inventoryCss, /\[data-atributo="afinidade"\]::before\s*\{\s*content:\s*"🐾"/);
});

test('inventory has multi-item discard selection with authoritative batch validation', () => {
    assert.match(inventory, /window\._modoDescarteMochila/);
    assert.match(inventory, /window\._itensSelecionadosDescarte\.add\(id\)/);
    assert.match(inventory, /action: 'destruir_itens'/);
    assert.match(server, /data\.action === 'destruir_itens'/);
    assert.match(server, /itensSelecionados\.some\(function \(item\) \{ return item\.locked; \}\)/);
    assert.match(server, /salvarProgresso\(userId, \{ inventario: inventarioSeguinte \}\)/);
});

test('item rolls show relative strongest and weakest values and rare tiles have a sweep effect', () => {
    assert.match(inventory, /function obterExtremosRolagens\(item\)/);
    assert.match(inventory, /roll-mais-forte/);
    assert.match(inventory, /roll-mais-fraca/);
    assert.match(inventoryCss, /\.mochila-slot\.equip-epico::after/);
    assert.match(inventoryCss, /\.mochila-slot\.equip-lendario::after/);
    assert.match(inventoryCss, /@media \(prefers-reduced-motion: reduce\)/);
});

test('inventory renders equipment icons from their gear slot instead of legacy backpack icons', () => {
    assert.match(inventory, /function iconeItemInventario\(item\)/);
    assert.match(inventory, /luva:\s*'🧤'/);
    assert.match(inventory, /capacete:\s*'🪖'/);
    assert.match(inventory, /icone\.textContent = iconeItemInventario\(item\)/);
    assert.match(inventory, /ctx\.fillText\(iconeItemInventario\(drop\.item\)/);
    assert.match(html, /inventario\.js\?v=172/);
});

test('status screen uses a responsive horizontal layout with two-column status details', () => {
    assert.match(statusCss, /#atributos-dupla\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.25fr\)\s+minmax\(270px,\s*0\.85fr\)/s);
    assert.match(statusCss, /#atributos-lista\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
    assert.match(statusCss, /@media \(max-width: 700px\)/);
});

test('bestiary selection reuses the species list instead of rebuilding all previews', () => {
    assert.match(bestiary, /if \(!speciesRowsCache\) \{/);
    assert.match(bestiary, /speciesDetailsNode\.replaceChildren\(renderSpeciesDetails\(selected\)\)/);
    assert.doesNotMatch(bestiary, /const signature = JSON\.stringify/);
    assert.match(bestiary, /function atualizarSelecaoEspecie\(\)/);
});
