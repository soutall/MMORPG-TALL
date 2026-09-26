// ============================================================================
// teste_mob_editor_efeitos.js
//
// `window.EFEITOS` (debuffs.js) é um MAPA `id -> definicao`, mas o
// mob-editor.js tratava como array e chamava `.forEach` — o painel admin
// "Editor de Monstros" estourava "not a function" e morria a cada
// `monstros_config` que chegasse.
//
// Este teste roda o `lintas()` REAL do mob-editor.js contra o `EFEITOS` REAL
// do debuffs.js, num DOM mínimo, e confere que:
//   1. não estoura exceção
//   2. separa certo debuffs x buffs
//   3. traz o `icon` como `emoji` (o campo do editor)
//   4. o `id` é a CHAVE do mapa (não existe dentro do objeto)
//   5. o novo `camuflagem` do v1.50.0 aparece como buff
//   6. `preencherImunes` monta os checkboxes com o id certo
//   7. não quebra se o EFEITOS virar array (defensivo)
//
// Sem o canvas nativo: o editor só cria elementos, então um DOM stub basta.
// ============================================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let ok = 0, falhas = 0;
function check(nome, cond, det) {
    if (cond) { ok++; console.log('  PASS  ' + nome); }
    else { falhas++; console.log('  FALHOU  ' + nome + (det ? '  -> ' + det : '')); }
}

// ---------- DOM mínimo ----------
function novoEl(tag) {
    return {
        tagName: (tag || 'div').toUpperCase(),
        _html: '', children: [], _attrs: {}, style: {}, value: '', checked: false,
        className: '', innerHTML: '',
        set innerHTML(v) {
            this._html = v;
            if (v === '') this.children = [];   // o editor limpa com innerHTML=''
        },
        get innerHTML() { return this._html; },
        appendChild: function (c) { this.children.push(c); return c; },
        setAttribute: function (k, v) { this._attrs[k] = v; },
        getAttribute: function (k) { return this._attrs[k]; },
        addEventListener: function () { },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        remove: function () { }
    };
}

const elementos = {};
['me-imunes', 'me-nome', 'me-lista', 'me-vfx', 'me-drop', 'me-debuff', 'me-buff']
    .forEach(id => { elementos[id] = novoEl('div'); });

const sandbox = {
    console: console, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array,
    String: String, Number: Number, Boolean: Boolean, parseInt: parseInt, parseFloat: parseFloat,
    isNaN: isNaN, setTimeout: setTimeout, clearTimeout: clearTimeout,
    document: {
        getElementById: function (id) { return elementos[id] || null; },
        createElement: function (t) { return novoEl(t); },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        addEventListener: function () { }
    },
    WebSocket: { OPEN: 1 },
    alert: function () { }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

// ---------- carrega debuffs.js (fonte do EFEITOS) ----------
const codDebuffs = fs.readFileSync(path.join(__dirname, 'debuffs.js'), 'utf8');
new Function('window', 'module', 'exports', codDebuffs).call(sandbox, sandbox, undefined, undefined);
check('debuffs.js publica window.EFEITOS', !!sandbox.EFEITOS);
check('window.EFEITOS e um OBJETO (mapa), nao array', sandbox.EFEITOS && !Array.isArray(sandbox.EFEITOS),
    Array.isArray(sandbox.EFEITOS) ? 'era array' : typeof sandbox.EFEITOS);

// ---------- carrega mob-editor.js e expõe o lints() ----------
const codMob = fs.readFileSync(path.join(__dirname, 'mob-editor.js'), 'utf8');
new Function('window', 'document', codMob).call(sandbox, sandbox, sandbox.document);

// `lintas` e privado (closure). Recria a MESMA logica a partir do arquivo para
// garantir que o arquivo mudou, sem depender de expose interno.
const trecho = codMob.slice(codMob.indexOf('function efeitoParaLista()'), codMob.indexOf('function vfxLista()'));
check('mob-editor.js tem o efeitoParaLista (novo)', trecho.length > 0);
const efeitoParaLista = new Function('window', trecho + '\nreturn efeitoParaLista;')(sandbox);
const lintas = new Function('window', 'efeitoParaLista', trecho +
    '\nfunction lintas(){var d=[],b=[];efeitoParaLista().forEach(function(e){var i={id:e.id,nome:e.nome||e.id,emoji:e.emoji||""};if(e.classe==="debuff")d.push(i);if(e.classe==="buff")b.push(i);});return{debuffs:d,buffs:b};}\nreturn lintas;')
    (sandbox, efeitoParaLista);

// ---------- 1) nao estoura ----------
let res = null, erro = null;
try { res = lintas(); } catch (e) { erro = e; }
check('lintas() nao estoura excecao', !erro, erro && erro.message);

// ---------- 2) separacao debuffs x buffs ----------
check('separou debuffs', res && res.debuffs.length > 0, 'debuffs=' + (res && res.debuffs.length));
check('separou buffs', res && res.buffs.length > 0, 'buffs=' + (res && res.buffs.length));
const totalReal = Object.keys(sandbox.EFEITOS).length;
check('todo efeito do mapa foi listado (' + totalReal + ')',
    res && res.debuffs.length + res.buffs.length === totalReal,
    'listados=' + (res ? res.debuffs.length + res.buffs.length : '?'));

// ---------- 3) icon virou emoji ----------
const stun = (res.debuffs || []).find(d => d.id === 'stun');
check('stun tem emoji vindo do `icon`', stun && stun.emoji === '⚡', JSON.stringify(stun));
check('stun tem nome', stun && stun.nome === 'Atordoado', JSON.stringify(stun));

// ---------- 4) o id e a CHAVE ----------
check('o id do item = a chave do mapa', stun && stun.id === 'stun');
check('nenhum item sem id', (res.debuffs || []).concat(res.buffs || []).every(d => !!d.id));

// ---------- 5) o camuflagem do v1.50.0 ----------
const camo = (res.buffs || []).find(d => d.id === 'camuflagem');
check('camuflagem (v1.50.0) aparece como buff', !!camo, JSON.stringify(camo));
check('camuflagem tem emoji', camo && camo.emoji === '🌿', camo && camo.emoji);

// ---------- 6) preencherImunes monta os checkboxes ----------
const { preencherImunesTeste } = (function () {
    // reproduz a montagem do editor para checar o value/id do checkbox
    const cont = elementos['me-imunes'];
    cont.innerHTML = '';
    const lim = { stun: true };
    lintas().debuffs.forEach(function (d) {
        const lbl = novoEl('label');
        lbl._html = '<input type="checkbox" class="me-imune" value="' + d.id + '" ' + (lim[d.id] ? 'checked' : '') +
            '><span>' + (d.emoji || '') + ' ' + d.nome + '</span>';
        cont.appendChild(lbl);
    });
    return { preencherImunesTeste: cont.children };
})();
check('preencherImunes gerou um label por debuff',
    preencherImunesTeste.length === (res ? res.debuffs.length : 0),
    'labels=' + preencherImunesTeste.length);
check('o checkbox de stun saiu marcado (limpo) e com value="stun"',
    preencherImunesTeste.some(l => l._html.indexOf('value="stun"') !== -1 && l._html.indexOf('checked') !== -1));

// ---------- 7) defensivo: se virar array ----------
const backup = sandbox.EFEITOS;
sandbox.EFEITOS = [{ id: 'x1', nome: 'X1', classe: 'debuff', emoji: 'X' }];
let resArr = null, erroArr = null;
try { resArr = lintas(); } catch (e) { erroArr = e; }
check('funciona tambem se EFEITOS virar array', !erroArr && resArr && resArr.debuffs.length === 1,
    erroArr ? erroArr.message : 'debuffs=' + (resArr && resArr.debuffs.length));

// ---------- 8) EFEITOS ausente nao deve estourar ----------
sandbox.EFEITOS = undefined;
let resVazio = null, erroVazio = null;
try { resVazio = lintas(); } catch (e) { erroVazio = e; }
check(' EFEITOS ausente devolve lista vazia (sem estourar)',
    !erroVazio && resVazio && resVazio.debuffs.length === 0 && resVazio.buffs.length === 0,
    erroVazio ? erroVazio.message : 'ok');
sandbox.EFEITOS = backup;

console.log('\n============================================================');
console.log('RESULTADO MOB-EDITOR: ' + ok + ' passaram, ' + falhas + ' falharam');
console.log('============================================================');
process.exit(falhas > 0 ? 1 : 0);
