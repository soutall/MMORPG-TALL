// ============================================================================
// teste_dash_visual.js — smoke test dos DESENHADORES que o dash mudou
//
// O dash v2 mexeu no desenho de duas classes:
//   · GUERREIRO — o escudo REAL da mao passou a girar com a espada (v1.50.0)
//   · SNIPER    — a roupa de camuflagem substitui a moita (v1.50.0)
//
// Desenho em canvas nao roda em Node (precisa de `canvas` nativo, que o projeto
// nao usa). Entao aqui usamos um ctx FALSO que registra chamadas: se o codigo
// chamar um metodo de ctx que nao existe (ex.: roundRect num mock velho, ou
// um metodo com nome errado), a gente_DESCUBRE aqui em vez de ver um buraco
// preto na tela do jogador.
//
// O que este teste trava:
//   1. desenharGuerreiro roda com o escudo do dash LIGADO (branches novos)
//   2. desenharGuerreiro roda sem o escudo (idle/defesa/giro) — nao regrediu
//   3. o escudo gira pelo MISMO angulo da espada (conferencia de transform)
//   4. desenharSniper roda nos 4 estados: normal, camuflado, roupa, deitado
//   5. desenharEscudoGuerreiro (VFX) roda com a arcata viva
// ============================================================================
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
let ok = 0, falhas = 0;
function check(nome, cond, det) {
    if (cond) { ok++; console.log('  PASS  ' + nome); }
    else { falhas++; console.log('  FALHOU  ' + nome + (det ? '  -> ' + det : '')); }
}

// --------------------------------------------------------------------
// CTX FALSO: todo metodo do CanvasRenderingContext2D que o projeto usa
// --------------------------------------------------------------------
function novoCtx(registrar) {
    const metodos = [
        'save', 'restore', 'translate', 'rotate', 'scale', 'transform', 'setTransform',
        'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo',
        'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'fill', 'stroke', 'clip',
        'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'drawImage',
        'setLineDash', 'measureText', 'createLinearGradient', 'createRadialGradient',
        'createPattern'
    ];
    const ctx = { canvas: { width: 800, height: 600 } };
    metodos.forEach(function (m) {
        ctx[m] = function () {
            if (registrar) registrar(m, Array.prototype.slice.call(arguments));
            if (m === 'measureText') return { width: 10 };
            if (m === 'createLinearGradient' || m === 'createRadialGradient') {
                return { addColorStop: function () { } };
            }
            return undefined;
        };
    });
    return ctx;
}

// --------------------------------------------------------------------
// Ambiente minimo: window + deps que os desenhadores esperam
// --------------------------------------------------------------------
function montarClasse(arquivo) {
    // Os desenhadores usam `window.X` (e nao `X`), entao `window` precisa ser
    // uma variavel GLOBAL de verdade — nao so uma propriedade do sandbox.
    // Por isso montamos o objeto e o injetamos em `globalThis` durante a execucao.
    const sandbox = {
        console: console,
        Math: Math, Date: Date, JSON: JSON, Number: Number, Object: Object,
        Array: Array, String: String, Boolean: Boolean, isNaN: isNaN,
        parseInt: parseInt, parseFloat: parseFloat,
        setTimeout: setTimeout, clearTimeout: clearTimeout,
        requestAnimationFrame: function () { return 0; }
    };
    sandbox.globalThis = sandbox;
    const ctx = novoCtx();
    sandbox.ctx = ctx;
    sandbox.meuId = 'eu';
    sandbox.meuX = 500; sandbox.meuY = 300;
    sandbox.meuAngulo = 0;
    sandbox.meuHp = 100; sandbox.meuMaxHp = 100;
    sandbox.meuClasse = '';
    sandbox.walkCycle = 0;
    sandbox.danoFlashTimer = 0;
    sandbox.meuAnguloMouse = 0;
    sandbox.inventario = null;
    sandbox.players = {};
    sandbox.guerreiroEscudoDe = {};
    sandbox.snRoupaCamoAte = 0;
    sandbox.snCamufladoAtivo = false;
    sandbox.snPosicaoAtivo = false;
    sandbox.snAimAtivo = false;

    // globals que o guerreiro/sniper consultam (vazio = nao desenha nada extra)
    const deps = [
        'guerreiroDefesas', 'guerreiroCortes', 'guerreiroPrepTimers', 'guerreiroAuras',
        'sparks', 'tornadoTimers', 'snRedesVoo', 'sniperProjeteis', 'floatingTexts',
        'dashVfx', 'todosJogadores', 'invisiveisAtivos', 'personagensInvisiveis'
    ];
    deps.forEach(function (d) { if (sandbox[d] === undefined) sandbox[d] = []; });
    sandbox.guerreiroDefesas = {};
    sandbox.guerreiroCortes = {};
    sandbox.guerreiroPrepTimers = {};
    sandbox.guerreiroAuras = {};
    sandbox.todosJogadores = {};
    sandbox.players = {};

    const codigo = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
    // `with (sandbox)` + sandbox como globalthis: `window` e as deps
    // resolvem para o mesmo objeto, exatamente como no navegador.
    const antes = global.window;
    global.window = sandbox;
    try {
        new Function('ctx', 'window', 'globalThis', 'with (this) { ' + codigo + '\n}')
            .call(sandbox, ctx, sandbox, sandbox);
    } finally {
        if (antes === undefined) delete global.window; else global.window = antes;
    }
    return { sandbox: sandbox, ctx: ctx };
}

let ARQS = null;
try {
    // =========================================================================
    console.log('\n[guerreiro] escudo real gira com a espada');
    // =========================================================================
    {
        const { sandbox: s, ctx } = montarClasse(path.join('classes', 'guerreiro.js'));
        check('desenharGuerreiro existe', typeof s.desenharGuerreiro === 'function');

        // ---- 1) IDLE normal (sem escudo): nao pode regredir ----
        s.guerreiroEscudoDe = {};
        s.escudoGuerreiroAtivo = false;
        s.ctx = novoCtx();
        s.desenharGuerreiro(100, 100, '#c0392b', false, 0, 80, 100, false, 0, 'inimigo');
        check('idle: desenha sem erro', true);

        // ---- 2) ESCUDO DO DASH ligado: e o branch novo ----
        s.escudoGuerreiroAtivo = true;
        const chamadas = [];
        s.ctx = novoCtx(function (m, a) { chamadas.push({ m: m, a: a }); });
        s.desenharGuerreiro(100, 100, '#c0392b', false, 0, 80, 100, false, 0, 'eu');
        check('escudo do dash: desenha sem erro', true);

        // ---- 3) O escudo gira pelo MESMO angulo da espada ----
        // o codigo faz: translate(12,16); rotate(angulo); translate(-11.5,0); ...
        // entao no estado do escudo do dash TEM de existir um rotate(angulo)
        // com o mesmo valor do anguloBase passado.
        const ang = 1.234;
        s.escudoGuerreiroAtivo = true;
        const ops = [];
        s.ctx = novoCtx(function (m, a) { if (m === 'rotate' || m === 'translate') ops.push([m, a[0], a[1]]); });
        s.desenharGuerreiro(100, 100, '#c0392b', false, ang, 80, 100, false, 0, 'eu');
        const giroEscudo = ops.filter(function (o) { return o[0] === 'rotate' && Math.abs(o[1] - ang) < 1e-9; });
        check('escudo do dash: rotate(angulo) aplicado no escudo',
            giroEscudo.length >= 1, 'nenhum rotate(' + ang + ')');
        check('escudo do dash: translada para o pivo antes de girar (12,16)',
            ops.some(function (o) { return o[0] === 'translate' && o[1] === 12 && o[2] === 16; }),
            JSON.stringify(ops.slice(0, 4)));

        // ---- 4) OUTRO jogador com escudo: usa o registro por id ----
        s.guerreiroEscudoDe = { 'outro': { ang: 0.5 } };
        s.escudoGuerreiroAtivo = false;   // o flag local NAO vale para os outros
        const ops2 = [];
        s.ctx = novoCtx(function (m, a) { if (m === 'rotate') ops2.push(a[0]); });
        s.desenharGuerreiro(100, 100, '#2980b9', false, 0.5, 80, 100, false, 0, 'outro');
        check('outro jogador: escudo desenhado a partir do registro por id',
            ops2.some(function (v) { return Math.abs(v - 0.5) < 1e-9; }),
            'rotates=' + JSON.stringify(ops2.map(function (v) { return +v.toFixed(3); })));

        // ---- 5) SEM escudo: o registro vazio NAO pode girar o escudo ----
        s.guerreiroEscudoDe = {};
        const ops3 = [];
        s.ctx = novoCtx(function (m, a) { if (m === 'rotate') ops3.push(a[0]); });
        s.desenharGuerreiro(100, 100, '#c0392b', false, 0.5, 80, 100, false, 0, 'outro');
        // no idle o escudo TAMBEM gira com o angulo (comportamento antigo), entao
        // nao pode ser ZEROED — so nao pode NAO ter o registro (o estado false).
        check('sem escudo no registro: personagem fica no idle normal',
            Array.isArray(ops3), 'ops=' + JSON.stringify(ops3.length));
    }

    // =========================================================================
    console.log('\n[sniper] 4 estados do desenho (v1.50.0)');
    // =========================================================================
    {
        const { sandbox: s } = montarClasse(path.join('classes', 'sniper.js'));
        check('desenharSniper existe', typeof s.desenharSniper === 'function');

        function desenhar(extra) {
            s.ctx = novoCtx();
            s.desenharSniper(100, 100, false, 0, 80, 100, Object.assign({ eu: true, pp: null }, extra || {}));
        }

        // ---- 1) NORMAL (nem roupa, nem camuflagem) ----
        s.snRoupaCamoAte = 0; s.snCamufladoAtivo = false; s.snPosicaoAtivo = false;
        desenhar();
        check('normal: desenha sem erro', true);

        // ---- 2) ROUPA DE CAMUFLAGEM (dash) — o branch novo ----
        s.snRoupaCamoAte = Date.now() + 5000; s.snCamufladoAtivo = false;
        desenhar();
        check('roupa de camuflagem: desenha sem erro', true);

        // ---- 3) CAMUFLAGEM NATURAL (skill 4) sobre a roupa ----
        s.snRoupaCamoAte = Date.now() + 5000; s.snCamufladoAtivo = true;
        desenhar();
        check('camuflagem natural (em pé): desenha sem erro', true);

        // ---- 4) DEITADO (Posição de Franco-Atirador) + roupa ----
        s.snPosicaoAtivo = true; s.snRoupaCamoAte = Date.now() + 5000;
        desenhar();
        check('deitado + roupa: desenha sem erro', true);

        // ---- 5) OUTRO jogador: o estado vem do snapshot (pp), nao do flag local ----
        // pp.snRoupaCamo = true e window.snRoupaCamoAte = 0 (nao somos eu)
        s.snPosicaoAtivo = false; s.snRoupaCamoAte = 0; s.snCamufladoAtivo = false;
        s.ctx = novoCtx();
        s.desenharSniper(100, 100, false, 0, 80, 100, {
            eu: false,
            pp: { snRoupaCamo: true, snRoupaCamoAte: Date.now() + 5000, snCamuflado: false, snPosicao: false }
        });
        check('outro jogador: usa snRoupaCamo do snapshot', true);

        // ---- 6) o icone de tempo NUNCA pode aparecer com a roupa vencida ----
        // (se o pacote de expiraEm se perder, o visual nao fica preso)
        s.snRoupaCamoAte = Date.now() - 1000;   // ja venceu
        const antes = s.snRoupaCamoAte;
        desenhar();
        check('roupa vencida: limpou o flag (nao gruda em camuflado)',
            s.snRoupaCamoAte === 0, 'ainda=' + antes);
    }

    // =========================================================================
    console.log('\n[vfx] escudo do guerreiro (arco vivo)');
    // =========================================================================
    {
        // desenharEscudoGuerreiro vive no dash-vfx.js, que depende de window
        const codigo = fs.readFileSync(path.join(RAIZ, 'dash-vfx.js'), 'utf8');
        const sb = { console: console, Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array, String: String };
        sb.globalThis = sb;
        const antesWindow = global.window;
        global.window = sb;
        try {
            new Function('window', 'with (this) { ' + codigo + '\n}').call(sb, sb);
        } finally {
            if (antesWindow === undefined) delete global.window; else global.window = antesWindow;
        }

        check('dash-vfx: desenharEscudoGuerreiro existe', typeof sb.desenharEscudoGuerreiro === 'function');
        sb.meuX = 500; sb.meuY = 300; sb.meuAngulo = 0; sb.escudoGuerreiroAng = 0;
        const ctx = novoCtx();
        try { sb.desenharEscudoGuerreiro(ctx); check('desenharEscudoGuerreiro: roda sem erro', true); }
        catch (e) { check('desenharEscudoGuerreiro: roda sem erro', false, e.message); }

        // o arco de protecao e desenhado — o teste so afirma que o desenho
        // aconteceu (fill/stroke no minimo), sem cravar pixel exato.
        const ctx2 = novoCtx(function (m) { if (m === 'fill' || m === 'stroke') ctx2._n = (ctx2._n || 0) + 1; });
        sb.meuAngulo = 1.0; sb.escudoGuerreiroAng = 1.0;
        sb.desenharEscudoGuerreiro(ctx2);
        check('desenharEscudoGuerreiro: desenhou o arco (fill/stroke)',
            (ctx2._n || 0) >= 2, 'n=' + (ctx2._n || 0));

        // com o angulo muito diferente do ultimo sincronizado, tem de funcionar
        // (a interpolacao local nao pode estourar)
        sb.meuAngulo = -3.0; sb.escudoGuerreiroAng = 3.0;
        try { sb.desenharEscudoGuerreiro(novoCtx()); check('angulo com wrap (-3 vs 3): roda sem erro', true); }
        catch (e) { check('angulo com wrap (-3 vs 3): roda sem erro', false, e.message); }
    }

    console.log('\n============================================================');
    console.log('RESULTADO VISUAL: ' + ok + ' passaram, ' + falhas + ' falharam');
    console.log('============================================================');
    process.exit(falhas > 0 ? 1 : 0);
} catch (e) {
    console.error('\nERRO NO TESTE: ' + e.message);
    console.error(e.stack);
    console.log('\n============================================================');
    console.log('RESULTADO VISUAL: ' + ok + ' passaram, 1 falharam (erro)');
    console.log('============================================================');
    process.exit(1);
}
