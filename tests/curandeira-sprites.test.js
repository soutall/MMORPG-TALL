const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

test('Curandeira usa as animações originais de caminhada e repouso', () => {
    const arquivo = path.join(__dirname, '..', 'classes', 'curandeira_sprites.js');
    const codigo = fs.readFileSync(arquivo, 'utf8');
    const requisicoes = [];
    const desenhos = [];
    let chamadasLegadas = 0;
    const ctx = {
        imageSmoothingEnabled: true,
        save() {},
        restore() {},
        drawImage(...args) { desenhos.push(args); }
    };
    class ImagemFalsa {
        set src(valor) {
            this._src = valor;
            requisicoes.push(this);
        }
        get src() { return this._src; }
    }
    const window = {
        ctx,
        desenharCurandeiro() { chamadasLegadas++; }
    };

    vm.runInNewContext(codigo, {
        window,
        document: { currentScript: { src: 'http://localhost/classes/curandeira_sprites.js' } },
        Image: ImagemFalsa,
        URL,
        Number,
        Math,
        Date: { now: () => 110 },
        console
    });

    window.desenharCurandeiro(10, 10, true, Math.PI / 4, 100, 100);
    assert.equal(chamadasLegadas, 1);
    assert.equal(requisicoes.length, 8);
    assert.match(requisicoes[0].src, /sprites\/classes\/curandeira\/andando\/Andando\/animations\/walking\/south-east\/frame_000\.png$/);
    requisicoes.forEach(imagem => imagem.onload());

    window.desenharCurandeiro(10, 10, true, Math.PI / 4, 100, 100);
    assert.equal(desenhos.length, 1);
    assert.deepEqual(desenhos[0].slice(1), [-26, -37, 88, 88]);
    assert.equal(ctx.imageSmoothingEnabled, true);

    window.desenharCurandeiro(10, 10, false, -Math.PI / 2, 100, 100);
    assert.match(requisicoes[8].src, /sprites\/classes\/curandeira\/parado\/parado\/animations\/Idle\/north\/frame_000\.png$/);
});
