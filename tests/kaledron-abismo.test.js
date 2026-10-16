'use strict';

// Testes do NOVO visual do Kaledron — "Cavaleiro do Abismo".
//
// Substituem os testes da arquitetura anterior (pixel-art em PNG + sprites
// direcionais), que foi REMOVIDA de proposito: o visual foi refeito do zero em
// Canvas 2D procedural. Estes testes travam o que o novo visual precisa fazer.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const raiz = path.join(__dirname, '..');
const visual = fs.readFileSync(path.join(raiz, 'classes', 'kaledron_visual.js'), 'utf8');
const classe = fs.readFileSync(path.join(raiz, 'classes', 'guerreiro_kaledron.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');

// Comentarios explicam o que foi TROCADO e citam o termo antigo; sem isso o
// teste acusaria o proprio comentario que documenta a remocao.
function semComentarios(txt) {
    return txt.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 ');
}
const visualCodigo = semComentarios(visual);

test('a arquitetura antiga em PNG foi removida de verdade', () => {
    // nem os arquivos, nem as tags de script, nem as chamadas
    assert.equal(fs.existsSync(path.join(raiz, 'classes', 'kaledron_pixel_art.js')), false,
        'kaledron_pixel_art.js nao deveria mais existir');
    assert.equal(fs.existsSync(path.join(raiz, 'classes', 'kaledron_sprites.js')), false,
        'kaledron_sprites.js nao deveria mais existir');
    assert.doesNotMatch(indexHtml, /kaledron_pixel_art\.js/, 'tag do pixel art ainda no index.html');
    assert.doesNotMatch(indexHtml, /kaledron_sprites\.js/, 'tag do sprites ainda no index.html');
    assert.doesNotMatch(indexHtml, /kaledreonPixelArt/, 'ainda chamando o renderer de sprite');
});

test('o visual novo e procedural e nao depende de imagem', () => {
    assert.match(visual, /window\.KaledronVisual\s*=/, 'KaledronVisual nao exportado');
    assert.match(visual, /desenhar:\s*function/, 'metodo desenhar ausente');
    assert.doesNotMatch(visual, /new Image\(|\.src\s*=|drawImage/,
        'o visual novo nao deve carregar PNG: e tudo desenhado por codigo');
});

test('a paleta e a coerencia do "Cavaleiro do Abismo" (frio, sem magma)', () => {
    // o conceito antigo era magma/lava; o novo e obsidiana + runa fria
    for (const cor of ['#07080f', '#151824', '#5fe0ff', '#9b7dff']) {
        assert.match(visualCodigo, new RegExp(cor), `cor ${cor} ausente`);
    }
    // nenhuma cor quente de magma deve ter sobrado no CODIGO
    for (const proibida of ['#ff6', '#f60', 'lava', 'magma', 'brasa', 'vulca']) {
        assert.doesNotMatch(visualCodigo.toLowerCase(), new RegExp(proibida),
            `conceito antigo (${proibida}) ainda presente no visual`);
    }
});

test('a assinatura da classe — a lamina flutuante — esta presente', () => {
    assert.match(visual, /function desenharLamina/, 'a lamina flutuante sumiu');
    // ela precisa ORBITAR no descanso e TRAVAR no ataque
    const bloco = visual.slice(visual.indexOf('function desenharLamina'), visual.indexOf('function desenharLamina') + 1800);
    assert.match(bloco, /orbitando/, 'a lamina nao orbita no descanso');
    assert.match(bloco, /if \(orbitando\)/, 'a lamina nao distingue repouso de ataque');
    assert.match(bloco, /ease|prog/, 'a lamina nao tem antecipacao no ataque');
});

test('a silhueta de "colossal flutuante" — sem pernas, com lascas', () => {
    // ombreiras largas = leitura de forca a 48px
    assert.match(visualCodigo, /function desenharOmbros/, 'ombreiras ausentes');
    // as lascas orbitais substituem as pernas
    assert.match(visualCodigo, /function desenharOrbita/, 'lascas orbitais ausentes');
    assert.doesNotMatch(visualCodigo, /function desenharPerna|function desenharLeg/,
        'o Kaledron flutua: nao deve ter pernas');
    // poca de vazio substitui a cratera de lava
    assert.match(visualCodigo, /function desenharPoco/, 'a poca/sigilo do chão sumiu');
    assert.doesNotMatch(visualCodigo, /cratera|vulca/i, 'a cratera de lava do visual antigo nao deveria existir');
});

test('o elmo tem a fenda de luz (assinatura visual)', () => {
    const bloco = visual.slice(visual.indexOf('function desenharElmo'), visual.indexOf('function desenharElmo') + 1200);
    assert.match(bloco, /fenda de vis|RUNA/, 'a fenda de luz do elmo sumiu');
});

test('os estados de combate ainda reagem no visual', () => {
    // golpe/impacto travam a lamina; brado e redemoinho tem efeitos proprios
    assert.match(visual, /ESTADOS_ATAQUE\s*=\s*\{[\s\S]*golpe[\s\S]*redemoinho/, 'tabela de estados de ataque ausente');
    assert.match(visual, /function desenharBrado/, 'efeito do brado ausente');
    assert.match(visual, /function desenharRedemoinho/, 'efeito do redemoinho ausente');
    // morte e vida
    assert.match(visual, /morreu/, 'tratamento de morte ausente');
    assert.match(visual, /hp\s*\/|maxHp/, 'reacao a dano/HP ausente');
});

test('desenharKaledron traduz o estado de animacao e delega ao visual', () => {
    assert.match(classe, /window\.desenharKaledron\s*=\s*function/, 'entry point ausente');
    assert.match(classe, /KaledronVisual\.desenhar\(/, 'nao delega para o visual novo');
    // a logica de combate nao pode ter sido perdida no caminho
    for (const api of ['kaledronAnims', 'kaledronEstadoLocal', 'registrarKaledronAnim', 'kaledronEmAnimacaoSkill', 'enviarAtaqueKaledron']) {
        assert.match(classe, new RegExp('window\\.' + api), `API publica perdida: ${api}`);
    }
    assert.match(classe, /redemoinhoAtivo/, 'o estado global do redemoinho deixou de ser lido');
});

test('o ponto de entrada do jogo chama o visual novo (e nao um caminho morto)', () => {
    assert.match(indexHtml, /cls === 'guerreiro_kaledron' && window\.desenharKaledron/,
        'o despachante do jogador local nao usa o visual novo');
    assert.match(indexHtml, /classeJogador === 'guerreiro_kaledron'/, 'o despachante de sprite nao foi ajustado');
    // o nome do arquivo novo precisa estar carregado
    assert.match(indexHtml, /classes\/kaledron_visual\.js\?v=\d+/, 'script do visual novo ausente');
});

test('o visual executa sem estourar (smoke test com canvas falso)', () => {
    // Stub minimo de Canvas 2D: se o codigo chamar algo que nao existe,
    // o teste quebra aqui em vez de travar o jogo em producao.
    const chamadas = [];
    const alvo = { canvas: { width: 800, height: 600 } };
    const ctx = new Proxy(alvo, {
        get(obj, prop) {
            if (prop in obj) return obj[prop];
            if (typeof prop !== 'string') return undefined;
            // metodos de gradient devolvem um objeto com addColorStop
            if (/^create(Linear|Radial)Gradient$/.test(prop)) {
                return () => ({ addColorStop() {} });
            }
            // propriedades de estilo: valor inofensivo
            if (/^(globalAlpha|fillStyle|strokeStyle|lineWidth|globalCompositeOperation|font|textAlign|textBaseline|lineJoin|lineCap|shadowBlur|shadowColor|filter|imageSmoothingEnabled|miterLimit|imageSmoothingQuality|lineDashOffset)$/.test(prop)) {
                return '';
            }
            // qualquer outra coisa e um metodo de desenho
            return (...args) => { chamadas.push(prop); return undefined; };
        },
        set(obj, prop, value) { obj[prop] = value; return true; }
    });

    const sandbox = { window: { ctx, performance: { now: () => 1234 }, meuId: 'k1' } };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(visual, sandbox);

    const V = sandbox.window.KaledronVisual;
    assert.ok(V && typeof V.desenhar === 'function', 'KaledronVisual nao subiu no sandbox');

    const base = { agora: 1234, prog: 0.3, estado: 'golpe', anguloAtaque: 0.5 };
    // parado, andando, olhando para os dois lados, em cada estado
    for (const mov of [false, true]) {
        for (const ang of [0, Math.PI]) {
            for (const est of ['', 'golpe', 'impacto', 'brado', 'redemoinho']) {
                V.desenhar(100, 200, mov, ang, 50, 100, 'k1', Object.assign({}, base, { estado: est }));
            }
        }
    }
    // vida baixa e morte tambem precisam nao estourar
    V.desenhar(100, 200, false, 0, 5, 100, 'k1', base);
    V.desenhar(100, 200, false, 0, 0, 100, 'k1', base);

    assert.ok(chamadas.length > 100, 'o visual desenhou pouco demais: suspecto de no-op (' + chamadas.length + ')');
    assert.ok(chamadas.includes('fill'), 'nenhum preenchimento desenhado');
    assert.ok(chamadas.includes('stroke'), 'nenhum contorno desenhado');
    // save/restore balanceados: sem isso o ctx vaza estado na tela toda
    const saves = chamadas.filter((c) => c === 'save').length;
    const restores = chamadas.filter((c) => c === 'restore').length;
    assert.equal(saves, restores, `save/restore desbalanceados: ${saves} save vs ${restores} restore`);
});
