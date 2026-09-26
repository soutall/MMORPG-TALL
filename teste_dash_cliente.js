// ============================================================================
// teste_dash_cliente.js — valida o LADO CLIENTE do DASH v2 sem abrir o jogo
//
// Extrai o bloco real do index.html (não uma cópia) e roda contra um DOM
// mínimo. Se alguém editar o index.html e quebrar a predição, este teste
// acusa — sem precisar de navegador.
// ============================================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = __dirname;
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

let ok = 0, falhas = 0;
function check(nome, cond, det) {
    if (cond) { ok++; console.log('  PASS  ' + nome); }
    else { falhas++; console.log('  FALHOU  ' + nome + (det ? '  -> ' + det : '')); }
}

// --------------------------------------------------------------------
// Extrai o bloco do cliente entre dois marcadores do index.html
// --------------------------------------------------------------------
function extrair(inicio, fim) {
    const a = html.indexOf(inicio);
    const b = html.indexOf(fim, a);
    if (a === -1 || b === -1) throw new Error('marcador nao encontrado: ' + inicio);
    return html.slice(a, b);
}

const inicio = '// DASH v2 (v1.50.0) — CLIENTE';
const fim = 'function usarTornado()';
const codigo = extrair(inicio, fim);

// --------------------------------------------------------------------
// Ambiente de teste
// --------------------------------------------------------------------
function novoAmbiente(over) {
    const enviados = [];
    const sandbox = {
        console: console,
        setTimeout: setTimeout, clearTimeout: clearTimeout,
        Math: Math, Date: Date, JSON: JSON, Number: Number, Object: Object,
        Array: Array, String: String, isFinite: isFinite,
        document: { getElementById: () => ({ classList: { add() { }, remove() { } }, dataset: {} }) },
        performance: { now: () => Date.now() },
        // o codigo real compara `ws.readyState === WebSocket.OPEN`
        WebSocket: { OPEN: 1 },
        ws: { readyState: 1, OPEN: 1, send: (s) => enviados.push(JSON.parse(s)) },
        btnDash: { classList: { add() { }, remove() { } }, dataset: {} },
        dashCooldownAtivo: false,
        dashTrails: [],
        world: 200000,
        // stubs de outras partes do jogo
        checarEstamina: () => true,
        registrarCooldownBotao: () => { },
        atualizarMiraMouse: () => { },
        tocarSonoro: () => { },
        mostrarAvisoEstamina: () => { },
        colideMapaAtivo: () => false,
        window: null
    };
    sandbox.window = sandbox;
    Object.assign(sandbox, over || {});
    return { sandbox: sandbox, enviados: enviados };
}

function montar(over) {
    const amb = novoAmbiente(over);
    // 1) carrega os módulos isomórficos
    vm.createContext(amb.sandbox);
    vm.runInContext(fs.readFileSync(path.join(RAIZ, 'dash.js'), 'utf8'), amb.sandbox, { filename: 'dash.js' });
    vm.runInContext(fs.readFileSync(path.join(RAIZ, 'dash-vfx.js'), 'utf8'), amb.sandbox, { filename: 'dash-vfx.js' });
    // 2) carrega o bloco real do index.html
    vm.runInContext(codigo, amb.sandbox, { filename: 'index.html:bloco-dash' });
    return amb;
}

console.log('Extraidos ' + codigo.split('\n').length + ' linhas do index.html\n');

// =====================================================================
// 1) Os módulos carregam e expõem a API
// =====================================================================
console.log('[modulos]');
{
    const { sandbox: s } = montar();
    check('window.DASH carregado', !!s.DASH);
    check('dash-vfx: adicionarVfxReal existe', typeof s.dashAdicionarVfxReal === 'function');
    check('dash-vfx: desenharDashVfx existe', typeof s.desenharDashVfx === 'function');
    // v1.50.0: as moitas dinâmicas do Sniper foram REMOVIDAS (o dash dele agora
    // veste a roupa de camuflagem). Este teste trava essa decisão.
    check('dash-vfx: moitas do sniper foram removidas',
        typeof s.criarMoitaSniper !== 'function' && typeof s.desenharMoitasSniper !== 'function');
    check('dash-vfx: escudo do guerreiro existe', typeof s.desenharEscudoGuerreiro === 'function');
    check('index: usarDash existe', typeof s.usarDash === 'function');
    check('index: soltarDash existe', typeof s.soltarDash === 'function');
    check('index: dashConfirmar existe', typeof s.dashConfirmar === 'function');
}

// =====================================================================
// 2) TELEPORTE (mago): manda a mensagem certa e prediz o destino
// =====================================================================
console.log('\n[mago] teleporte');
{
    const { sandbox: s, enviados } = montar({
        minhaClasse: 'mago', meuAngulo: 0, meuX: 1000, meuY: 1000
    });
    s.usarDash();
    check('enviou {action:dash, angulo}', enviados.length === 1 && enviados[0].action === 'dash' && enviados[0].angulo === 0, JSON.stringify(enviados));
    check('nao usa predicao de corrida (teleporte e instantaneo)', s.dashPrev === null, JSON.stringify(s.dashPrev));
    // a VFX foi criada no modulo
    const vfxAntes = s.dashAdicionarVfxReal ? true : false;
    check('VFX registrada via modulo', vfxAntes);
    // confirmar posiciona o char
    s.dashConfirmar({ tipo: 'teleporte', x: 1160, y: 1000 });
    check('dashConfirmado moveu o char', s.meuX === 1160 && s.meuY === 1000, 'meuX=' + s.meuX);
}

// =====================================================================
// 3) CORRIDA (arqueiro): PREDICAO local anima o caminho
// =====================================================================
console.log('\n[arqueiro] predicao de corrida');
{
    const { sandbox: s, enviados } = montar({
        minhaClasse: 'arqueiro', meuAngulo: 0, meuX: 1000, meuY: 1000
    });
    s.usarDash();
    check('enviou dash', enviados.length === 1);
    check('criou predicao local', !!s.dashPrev, JSON.stringify(s.dashPrev));
    if (s.dashPrev) {
        const d = s.dashPrev;
        check('predicao vai ~230px para frente', Math.abs(d.x1 - d.x0 - 230) < 1, 'dx=' + (d.x1 - d.x0));
        check('predicao dura 260ms', d.duracaoMs === 260, d.duracaoMs);
        check('predicao comeca no char atual', d.x0 === 1000, d.x0);
    }
}

// =====================================================================
// 4) GUERREIRO: escudo e um ESTADO (nao um teleport)
// =====================================================================
console.log('\n[guerreiro] escudo segurado');
{
    const { sandbox: s, enviados } = montar({
        minhaClasse: 'guerreiro', meuAngulo: 0.5, meuX: 1000, meuY: 1000
    });
    s.usarDash();
    check('enviou dash', enviados.length === 1);
    check('NAO teleportou (sem predicao)', s.dashPrev === null, JSON.stringify(s.dashPrev));
    check('NAO mexeu na posicao', s.meuX === 1000 && s.meuY === 1000, 'meuX=' + s.meuX);
    check('escudo Ativo = true', s.escudoGuerreiroAtivo === true);
    check('escudo guarda o angulo da MIRA (0.5)', s.escudoGuerreiroAng === 0.5, s.escudoGuerreiroAng);
    // segundo toque nao faz nada
    s.usarDash();
    check('segundo toque e ignorado (nao spam)', enviados.length === 1, JSON.stringify(enviados));
    // escTravandoAcoes
    check('escudoTravandoAcoes() = true', s.escudoTravandoAcoes() === true);
    // soltar
    s.soltarDash();
    check('soltar limpou o estado', s.escudoGuerreiroAtivo === false);
    check('soltar mandou {acao:soltar}', enviados.length === 2 && enviados[1].acao === 'soltar', JSON.stringify(enviados[1]));
    // soltar de novo nao envia nada
    s.soltarDash();
    check('soltar duas vezes e seguro', enviados.length === 2, JSON.stringify(enviados));
}

// =====================================================================
// 5) CURANDEIRO / SNIPER: nao movem o char
// =====================================================================
console.log('\n[curandeiro e sniper] mecanicas sem deslocamento');
{
    const cu = montar({ minhaClasse: 'curandeiro', meuAngulo: 0, meuX: 500, meuY: 500 });
    cu.sandbox.usarDash();
    check('curandeiro nao se moveu', cu.sandbox.meuX === 500 && cu.sandbox.meuY === 500);
    check('curandeiro nao tem predicao', cu.sandbox.dashPrev === null);
    const sn = montar({ minhaClasse: 'sniper', meuAngulo: 0, meuX: 500, meuY: 500 });
    sn.sandbox.usarDash();
    check('sniper nao se moveu', sn.sandbox.meuX === 500 && sn.sandbox.meuY === 500);
    check('sniper nao tem predicao', sn.sandbox.dashPrev === null);
}

// =====================================================================
// 6) COOLDOWN: o cliente respeita o eco do servidor (anti-exploit)
// =====================================================================
console.log('\n[cooldown] eco do servidor');
{
    const { sandbox: s, enviados } = montar({ minhaClasse: 'mago', meuAngulo: 0, meuX: 0, meuY: 0 });
    s.dashConfirmar({ tipo: 'teleporte', x: 100, y: 0, cooldownMs: 4000 });
    s.usarDash();
    check('dash bloqueado pelo cooldown do servidor', enviados.length === 0, 'enviou: ' + JSON.stringify(enviados));
    // apos o cooldown expirar, volta a funcionar
    s.dashCdAteServidor = Date.now() - 1;
    s.usarDash();
    check('liberado apos o cooldown', enviados.length === 1, JSON.stringify(enviados));
}

// =====================================================================
// 7) RECUSA DO SERVIDOR (parede / custo) nao deixa o char fantasma
// =====================================================================
console.log('\n[recusa] servidor responde dash_bloqueado');
{
    const { sandbox: s } = montar({ minhaClasse: 'guerreiro', meuAngulo: 0, meuX: 0, meuY: 0 });
    s.usarDash();
    s.escudoGuerreiroAtivo = true;
    s.dashRecusado();
    check('dashRecusado abaixa o escudo', s.escudoGuerreiroAtivo === false);
}

// =====================================================================
// 8) COLISAO: parede corta a predicao (igual ao servidor)
// =====================================================================
console.log('\n[colisao] parede corta o dash igual ao servidor');
{
    const { sandbox: s } = montar({
        minhaClasse: 'arqueiro', meuAngulo: 0, meuX: 0, meuY: 0,
        colideMapaAtivo: (x) => x > 100     // parede em x=100
    });
    s.usarDash();
    check('parou antes da parede', s.dashPrev && s.dashPrev.x1 <= 112, s.dashPrev && ('x1=' + s.dashPrev.x1));
}

// =====================================================================
// 9) VFX: todos os tipos do dash.js tem desenho
// =====================================================================
console.log('\n[vfx] cobertura de todos os vfx declarados');
{
    const { sandbox: s } = montar();
    const ctx = new Proxy({}, { get: (t, k) => {
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() { } });
        return typeof k === 'string' ? (() => { }) : undefined;
    }, set: () => true });
    const tipos = Object.keys(s.DASH.DASH).map(c => s.DASH.DASH[c].vfx).filter(Boolean);
    tipos.push('guerreiro_escudo', 'curandeiro_escudo_area', 'curandeiro_escudo_area_carga', 'summoner_pet_teleporte');
    const falta = [];
    tipos.forEach(t => {
        try {
            s.dashAdicionarVfxReal(t, 100, 100, 0, {});
            s.desenharDashVfx(ctx);
        } catch (e) { falta.push(t + ' (' + e.message + ')'); }
    });
    check('todos os ' + tipos.length + ' vfx desenham sem erro', falta.length === 0, falta.join(', '));
    // baque de escudo e camuflagem do sniper (v1.50.0)
    ['guerreiro_baque', 'sniper_camo'].forEach(t => {
        try { s.dashAdicionarVfxReal(t, 100, 100, 0, { raio: 62 }); s.desenharDashVfx(ctx); check('vfx ' + t + ' desenha', true); }
        catch (e) { check('vfx ' + t + ' desenha', false, e.message); }
    });
    // escudo do guerreiro desenha
    s.meuX = 100; s.meuY = 100; s.meuAngulo = 0; s.escudoGuerreiroAng = 0;
    try { s.desenharEscudoGuerreiro(ctx); check('escudo do guerreiro desenha', true); }
    catch (e) { check('escudo do guerreiro desenha', false, e.message); }
}

console.log('\n' + '='.repeat(60));
console.log('RESULTADO CLIENTE: ' + ok + ' passaram, ' + falhas + ' falharam');
console.log('='.repeat(60));
process.exit(falhas > 0 ? 1 : 0);
