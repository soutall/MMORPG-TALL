'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'npc-admin.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'loki-npc.js'), 'utf8');
const shop = fs.readFileSync(path.join(root, 'zenia-shop.js'), 'utf8');

test('Zenia is registered near Loki in the active world map and uses the supplied potion NPC sprites', () => {
    assert.match(server, /zenia_pocoes:\s*\{\s*id:\s*'zenia_pocoes',\s*nome:\s*'Zenia',\s*x:\s*144500,\s*y:\s*13894,\s*mapa:\s*'mundo',\s*raioInteracao:\s*105,\s*servico:\s*'potion_shop',\s*spriteDir:\s*'npc-potion'/);
    assert.match(server, /const mapas = Array\.from\(new Set\(Object\.values\(NPCS_INTERATIVOS\)\.map\(npc => npc\.mapa\)\)\)/);
    assert.match(server, /NPC_SPRITES_DIRS[\s\S]{0,180}'npc-potion':\s*path\.join\(__dirname,\s*'sprites',\s*'NPC',\s*'npc-potion'\)/);
    assert.match(admin, /item\.spriteDir === \(npc && npc\.spriteDir \|\| 'ferreiro'\)/);
    assert.match(renderer, /'sprites\/NPC\/' \+ root \+ '\/' \+ id/);

    const sprites = path.join(root, 'sprites', 'NPC', 'npc-potion');
    for (const frame of [1, 2]) {
        assert.ok(fs.existsSync(path.join(sprites, 'standard', 'idle', 'down', `${frame}.png`)));
    }
    for (let frame = 1; frame <= 9; frame++) {
        assert.ok(fs.existsSync(path.join(sprites, 'standard', 'walk', 'down', `${frame}.png`)));
    }
});

test('Zenia sells only level-one HP and MP potions at the requested server prices', () => {
    assert.match(server, /hp:\s*\{\s*nome:\s*'Poção de Vida I',\s*subtipo:\s*'pocao_hp',\s*tipo:\s*'hp',\s*nivel:\s*1,\s*preco:\s*10\s*\}/);
    assert.match(server, /mp:\s*\{\s*nome:\s*'Poção de Mana I',\s*subtipo:\s*'pocao_mp',\s*tipo:\s*'mp',\s*nivel:\s*1,\s*preco:\s*50\s*\}/);
    assert.match(server, /equipment|equipamentos\.gerarPocao/);
    assert.match(server, /item\.subtipo !== produto\.subtipo \|\| item\.nivel !== produto\.nivel/);
    assert.match(shop, /Poção de Vida I/);
    assert.match(shop, /Poção de Mana I/);
    assert.match(shop, /sprites\/Objetos\/icones\/' \+ product\.icone/);
});

test('Potion purchases validate proximity, item IDs, quantities, gold, and persistence on server', () => {
    assert.match(server, /data\.action === 'zenia_shop_buy'/);
    assert.match(server, /mapaJogadorLoja !== npcLoja\.mapa \|\| poseLoja\.desativado/);
    assert.match(server, /Object\.keys\(data\.quantidades\)\.some\(chave => !chavesLoja\.includes\(chave\)\)/);
    assert.match(server, /!Number\.isInteger\(quantidade\) \|\| quantidade < 0 \|\| quantidade > 100/);
    assert.match(server, /ouroAtual < custoTotal/);
    assert.match(server, /salvarProgresso\(userId, \{\s*inventario: inventarioSeguinte,\s*ouro: ouroSeguinte\s*\}\)/);
    assert.match(server, /jogadorLoja\.zeniaShopTxn\.id === data\.transactionId/);
    assert.match(server, /type: 'inventario_sync'[\s\S]{0,100}ouro: ouroSeguinte/);
});

test('The shop opens only from Zenia interaction and provides a two-column quantity cart', () => {
    assert.match(server, /npc\.servico === 'potion_shop'[\s\S]{0,160}type: 'npc_service_open'[\s\S]{0,80}service: npc\.servico/);
    assert.match(html, /zenia-shop\.js\?v=1/);
    assert.match(html, /window\.ZeniaShop\.handleMessage\(dados\)/);
    assert.match(shop, /zenia-shop-columns/);
    assert.match(shop, /Poções disponíveis/);
    assert.match(shop, /Itens selecionados/);
    assert.match(shop, /Comprar selecionados/);
    assert.match(shop, /max = '100'/);
});

test('Interaction icons use named image assets and fall back to SEM-ICONE', () => {
    const icons = path.join(root, 'sprites', 'Objetos', 'icones');
    assert.ok(fs.existsSync(path.join(icons, 'HP-lvl1.png')));
    assert.ok(fs.existsSync(path.join(icons, 'MP-lvl1.png')));
    assert.ok(fs.existsSync(path.join(icons, 'ferreiro.png')));
    assert.ok(fs.existsSync(path.join(icons, 'SEM-ICONE.png')));
    assert.match(server, /iconeInteracao:\s*'HP-lvl1\.png'/);
    assert.match(html, /iconeInteracao/);
    assert.match(html, /this\.src = 'sprites\/Objetos\/icones\/SEM-ICONE\.png'/);
});
