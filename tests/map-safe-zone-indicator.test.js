'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const worldMap = require('../mapas/mapa_mundo');

test('the protected sanctuary area matches the established 900-unit safe-zone boundary', () => {
    assert.equal(worldMap.ehAreaSegura(144000, 14018), true);
    assert.equal(worldMap.ehAreaSegura(144899.99, 14018), true);
    assert.equal(worldMap.ehAreaSegura(144900, 14018), false);
    assert.equal(worldMap.ehAreaSegura(144901, 14018), false);
});

test('the minimap exposes an accessible protected-area badge driven by the safe-zone helper', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const styles = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

    assert.match(html, /id="minimap-area-protegida"[^>]*hidden/);
    assert.match(html, /<span>ÁREA PROTEGIDA<\/span>/);
    assert.match(html, /window\.mapaMundo\.ehAreaSegura\(centroPersonagemX, centroPersonagemY\)/);
    assert.match(styles, /#minimap-area-protegida\[hidden\]\s*\{\s*display:\s*none;/);
});
