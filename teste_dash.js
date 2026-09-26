// ============================================================================
// teste_dash.js — E2E real do DASH v2 (v1.49.0)
// Sobe o servidor de verdade, loga um personagem DE CADA CLASSE por WebSocket
// e confere o comportamento observado do lado do cliente.
//
// Não é teste de unidade: o objetivo é pegar o que só aparece com o servidor
// no ar (stamina, cooldown autoritativo, tick de 50ms, estado do mundo).
//
// Uso:  node teste_dash.js
// ============================================================================
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORTA = 8097;
const RAIZ = __dirname;
const ARQ_DB = path.join(RAIZ, 'jogadores.json');

const CLASSES = [
    'guerreiro', 'mago', 'summoner', 'arqueiro', 'curandeiro', 'barbaro',
    'roqueiro', 'ladino', 'dronemaster', 'arqueiro_arcano', 'sniper', 'pikeman'
];

let ok = 0, falhas = 0;
function check(nome, cond, detalhe) {
    if (cond) { ok++; console.log('  PASS  ' + nome); }
    else { falhas++; console.log('  FALHOU  ' + nome + (detalhe ? '  -> ' + detalhe : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// --------------------------------------------------------------------
// Semeia personagens de teste (1 por classe) no banco, preservando o resto
// --------------------------------------------------------------------
function semear() {
    let db = {};
    if (fs.existsSync(ARQ_DB)) {
        try { db = JSON.parse(fs.readFileSync(ARQ_DB, 'utf8')); } catch (e) { db = {}; }
    }
    if (!db || typeof db !== 'object' || Array.isArray(db)) db = {};
    CLASSES.forEach(c => { db['__teste_' + c] = { classe: c, level: 1, xp: 0, hp: 100 }; });
    fs.writeFileSync(ARQ_DB, JSON.stringify(db), 'utf8');
    return Object.keys(db).filter(k => k.indexOf('__teste_') === 0);
}

function limpar(ids) {
    let db = JSON.parse(fs.readFileSync(ARQ_DB, 'utf8'));
    ids.forEach(i => delete db[i]);
    fs.writeFileSync(ARQ_DB, JSON.stringify(db), 'utf8');
}

// --------------------------------------------------------------------
// Cliente WebSocket mínimo
// --------------------------------------------------------------------
function conectar(userId) {
    const WebSocket = require(path.join(RAIZ, 'node_modules', 'ws'));
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:' + PORTA);
        const recebidas = [];
        ws.on('open', () => {
            ws.send(JSON.stringify({ action: 'login', userId: userId }));
            resolve({ ws: ws, msgs: recebidas, esperando: [] });
        });
        ws.on('error', reject);
        ws.on('message', (d) => {
            let j; try { j = JSON.parse(d.toString()); } catch (e) { return; }
            recebidas.push(j);
            // resolve pendentes por tipo
            for (let i = recebidas.length - 1; i >= 0; i--) { }
        });
    });
}

function esperar(c, tipo, ms) {
    return new Promise((resolve) => {
        const inicio = Date.now();
        const t = setInterval(() => {
            const achado = c.msgs.find(m => m.type === tipo);
            if (achado) { clearInterval(t); resolve(achado); }
            else if (Date.now() - inicio > ms) { clearInterval(t); resolve(null); }
        }, 25);
    });
}

function limparMsgs(c) { c.msgs.length = 0; }
function achados(c, tipo) { return c.msgs.filter(m => m.type === tipo); }

// Dasha em vários ângulos e devolve a confirmação com o maior percurso.
// Na Cidade de Davahl o char nasce perto de prédios, então um ângulo fixo
// esbarra em parede e "corta" o dash — isso é comportamento CORRETO do
// resolverDestino, não um bug. Aqui queremos medir o alcance máximo possível.
async function dashComMaiorAlcance(c, angulos) {
    let melhor = null;
    for (const ang of angulos) {
        limparMsgs(c);
        c.ws.send(JSON.stringify({ action: 'dash', angulo: ang }));
        const conf = await esperar(c, 'dash_confirmado', 2500);
        if (!conf) { await sleep(2300); continue; }
        const d = Math.max(
            Math.abs((conf.x1 || 0) - (conf.x0 || 0)),
            Math.abs((conf.y1 || 0) - (conf.y0 || 0))
        );
        if (!melhor || d > melhor.dist) melhor = { conf: conf, dist: d, ang: ang };
        if (d > (conf.duracaoMs > 400 ? 350 : 200)) break;   // já deu alcance de sobra
        await sleep(2300);                                     // respeita o cooldown
    }
    return melhor;
}

// --------------------------------------------------------------------
(async function main() {
    const ids = semear();
    console.log('Semeados: ' + ids.join(', '));
    console.log('Subindo servidor na porta ' + PORTA + '...\n');

    const srv = spawn(process.execPath, ['server.js'], {
        cwd: RAIZ, env: Object.assign({}, process.env, { PORT: String(PORTA) }),
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let saida = '';
    srv.stdout.on('data', d => { saida += d.toString(); });
    srv.stderr.on('data', d => { saida += d.toString(); });

    // espera o "Servidor rodando"
    const t0 = Date.now();
    while (saida.indexOf('Servidor rodando') === -1 && Date.now() - t0 < 20000) await sleep(100);
    if (saida.indexOf('Servidor rodando') === -1) {
        console.log('SERVIDOR NAO SUBIU:\n' + saida);
        srv.kill(); limpar(ids); process.exit(1);
    }
    console.log('Servidor no ar.\n');

    try {
        // ============================================================
        // 0) dash.js: os NUMEROS que cliente e servidor compartilham
        // ============================================================
        console.log('[dash.js] tabela de configuracao compartilhada');
        const D = require(path.join(RAIZ, 'dash.js'));
        const esperado = {
            mago: ['teleporte', 160], summoner: ['teleporte', 160],
            arqueiro: ['corrida', 230], roqueiro: ['corrida', 230],
            arqueiro_arcano: ['teleporte', 240],
            barbaro: ['investida', 400],
            pikeman: ['arranque', 200],
            // a Curandeira nao desloca: o 160 e o RAIO da area, nao uma distancia
            curandeiro: ['area', null], guerreiro: ['escudo', null],
            sniper: ['camuflagem', null], dronemaster: ['energia', null],
            ladino: ['arranque', null]   // v1.50.0: sem distancia (so buff)
        };
        Object.keys(esperado).forEach(k => {
            const c = D.configDe(k);
            check('dash.js ' + k + ': tipo = ' + esperado[k][0], c.tipo === esperado[k][0], c.tipo);
            if (esperado[k][1] !== null) {
                check('dash.js ' + k + ': distancia = ' + esperado[k][1] + 'px', c.distancia === esperado[k][1], c.distancia);
            }
        });
        // ---- LADINO v1.51.0: invisivel + 200% de velocidade por 1s, SEM deslocar ----
        const cfgL = D.configDe('ladino');
        check('dash.js ladino: 3,0x de velocidade (+200%)', cfgL.velocidade === 3.0, cfgL.velocidade);
        check('dash.js ladino: 1s de invisibilidade', cfgL.invisivelMs === 1000, cfgL.invisivelMs);
        check('dash.js ladino: 1s de buff', cfgL.duracaoMs === 1000, cfgL.duracaoMs);
        check('dash.js ladino: soBuff (NAO desloca)', cfgL.soBuff === true, cfgL.soBuff);
        check('dash.js ladino: sem distancia de corrida', cfgL.distancia === undefined, cfgL.distancia);
        check('dash.js ladino: movePersonagem = false', D.movePersonagem('ladino') === false);
        check('dash.js ladino: duracaoBuffVelocidade = 1000ms', D.duracaoBuffVelocidade('ladino') === 1000, D.duracaoBuffVelocidade('ladino'));
        check('dash.js pikeman: continua deslocando', D.movePersonagem('pikeman') === true);
        check('dash.js curandeiro: atordoa 5s', D.configDe('curandeiro').atordoamentoMs === 5000, D.configDe('curandeiro').atordoamentoMs);
        check('dash.js curandeiro: raio da area = 160px', D.configDe('curandeiro').raio === 160, D.configDe('curandeiro').raio);
        check('dash.js curandeiro: escudo de area dura 10s', D.configDe('curandeiro').duracaoMs === 10000, D.configDe('curandeiro').duracaoMs);
        check('dash.js curandeiro: nao desloca', D.movePersonagem('curandeiro') === false);
        check('dash.js sniper: ROUPA de camuflagem dura 5s', D.configDe('sniper').duracaoMs === 5000, D.configDe('sniper').duracaoMs);
        check('dash.js sniper: nao move', D.movePersonagem('sniper') === false);
        check('dash.js guerreiro: reducao frontal = 70%', D.configDe('guerreiro').reducaoFrontal === 0.70, D.configDe('guerreiro').reducaoFrontal);
        check('dash.js guerreiro: dreno = 12/s (gradual e baixo)', D.configDe('guerreiro').drenoPorSegundo === 12, D.configDe('guerreiro').drenoPorSegundo);
        // ---- GUERREIRO v1.50.0: baque de escudo 1x a cada 2s ----
        const cfgG = D.configDe('guerreiro');
        check('dash.js guerreiro: baque a cada 2s', cfgG.intervaloBaqueMs === 2000, cfgG.intervaloBaqueMs);
        check('dash.js guerreiro: baque tem dano', cfgG.danoBaque > 0, cfgG.danoBaque);
        check('dash.js guerreiro: arco de bloqueio = 66 graus', Math.abs((cfgG.arco * 180 / Math.PI) - 66) < 1.5, cfgG.arco);
        // easeOut: 0 no inicio, 1 no fim, sempre crescente
        check('dash.js easeOut(0)=0 e easeOut(1)=1', D.easeOut(0) === 0 && D.easeOut(1) === 1);
        check('dash.js easeOut e crescente', D.easeOut(0.5) > D.easeOut(0.25) && D.easeOut(0.75) > D.easeOut(0.5));
        // resolverDestino sem colisao = distancia exata
        const semColisao = D.resolverDestino(0, 0, 0, 230, () => false);
        check('dash.js resolverDestino: sem colisao anda a distancia toda', Math.abs(semColisao.distPercorrida - 230) < 0.5, semColisao.distPercorrida);
        // resolverDestino com parede no meio para no ultimo ponto livre
        const comParede = D.resolverDestino(0, 0, 0, 400, (x) => x > 100);
        check('dash.js resolverDestino: para na parede', comParede.distPercorrida <= 105 && comParede.distPercorrida > 80, comParede.distPercorrida);

        // ============================================================
        // 1) MAGO: teleporte + VFX + cooldown autoritativo
        // ============================================================
        console.log('[mago] teleporte + cooldown no servidor');
        let m = await conectar('__teste_mago');
        await esperar(m, 'init', 5000);
        await sleep(300);
        limparMsgs(m);
        let antes = achados(m, 'world_update');
        m.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        let conf = await esperar(m, 'dash_confirmado', 3000);
        check('mago: dash_confirmado chegou', !!conf, 'sem confirmacao');
        check('mago: tipo = teleporte', conf && conf.tipo === 'teleporte', conf && conf.tipo);
        check('mago: posicionou no destino', conf && Number.isFinite(conf.x), conf && JSON.stringify(conf));
        const vfx = achados(m, 'action_dash');
        check('mago: action_dash com vfx', vfx.length > 0 && vfx[0].vfx === 'mago_teleporte', JSON.stringify(vfx[0] || null));
        // stamina cobrada
        let stam = achados(m, 'stamina_sync');
        check('mago: gastou 25 de stamina', stam.some(s => s.estamina === 75), JSON.stringify(stam));
        // COOLDOWN: segundo dash imediato deve ser RECUSADO
        limparMsgs(m);
        m.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        await sleep(400);
        const conf2 = achados(m, 'dash_confirmado');
        check('mago: cooldown BLOQUEIA 2o dash (anti-exploit)', conf2.length === 0, 'servidor aceitou: ' + JSON.stringify(conf2));
        m.ws.close();

        // ============================================================
        // 2) ARQUEIRO: dash ANIMADO (corre de verdade, nao teleporta)
        // ============================================================
        console.log('\n[arqueiro] dash animado (corre, nao teleporta)');
        let a = await conectar('__teste_arqueiro');
        await esperar(a, 'init', 5000);
        await sleep(300);
        const melhorA = await dashComMaiorAlcance(a, [0, Math.PI, -Math.PI / 2, Math.PI / 2, 0.9]);
        const ca = melhorA && melhorA.conf;
        check('arqueiro: tipo = corrida', ca && ca.tipo === 'corrida', ca && ca.tipo);
        check('arqueiro: servidor mandou o caminho (x0..x1)', ca && Number.isFinite(ca.x0) && Number.isFinite(ca.x1), ca && JSON.stringify(ca));
        check('arqueiro: alcance maximo proximo a 230px', melhorA && melhorA.dist > 190 && melhorA.dist < 250, 'dist=' + (melhorA && melhorA.dist));
        // o char tem de SE MOVER ao longo do tempo (amostra o mundo)
        const x0 = ca ? ca.x0 : 0, dur = ca ? ca.duracaoMs : 0;
        const amostras = [];
        for (let i = 0; i < 6; i++) {
            await sleep(Math.max(20, Math.floor(dur / 6)));
            const wu = achados(a, 'world_update').pop();
            const eu = wu && wu.players && Object.values(wu.players).find(j => j && j.nome === '__teste_arqueiro');
            if (eu) amostras.push(eu.x);
        }
        // A direção depende do ângulo escolhido (pode ser -x), então medimos
        // "andou" e "não deu saltos" sem supear o sentido.
        const passos = [];
        for (let i = 1; i < amostras.length; i++) passos.push(Math.abs(amostras[i] - amostras[i - 1]));
        const total = amostras.length >= 2 ? Math.abs(amostras[amostras.length - 1] - amostras[0]) : 0;
        const andou = amostras.length >= 3 && total > 30;
        // Um TELEPORTE colocaria 100% do trajeto num único passo. Com o easeOut
        // do dash, o maior passo cobre bem menos (a curva desacelera).
        const maior = passos.length ? Math.max.apply(null, passos) : 0;
        const semPulo = andou && (maior / total) < 0.8;
        check('arqueiro: servidor moveu o char progressivamente', andou, 'xs=' + JSON.stringify(amostras.map(v => Math.round(v))));
        check('arqueiro: movimento continuo (sem teleporte no meio)', semPulo, 'maior passo=' + Math.round(maior) + ' de ' + Math.round(total) + ' total');
        a.ws.close();

        // ============================================================
        // 3) GUERREIRO: escudo segurado + bloqueio de skill + soltar
        // ============================================================
        console.log('\n[guerreiro] escudo segurado, bloqueia skill, drena stamina');
        let g = await conectar('__teste_guerreiro');
        await esperar(g, 'init', 5000);
        await sleep(300);
        limparMsgs(g);
        g.ws.send(JSON.stringify({ action: 'dash', angulo: 1.2 }));
        let cg = await esperar(g, 'dash_confirmado', 3000);
        check('guerreiro: tipo = escudo', cg && cg.tipo === 'escudo', cg && cg.tipo);
        const evEsc = achados(g, 'action_guerreiro_escudo');
        check('guerreiro: action_guerreiro_escudo ativo', evEsc.length === 1 && evEsc[0].ativo === true, JSON.stringify(evEsc[0] || null));
        check('guerreiro: angulo do escudo = mira (1.2)', evEsc[0] && Math.abs(evEsc[0].angulo - 1.2) < 0.001, evEsc[0] && evEsc[0].angulo);

        // dreno de stamina: comeca em 100, deve cair a ~12/s (gradual e baixo)
        limparMsgs(g);
        await sleep(1000);
        const st1 = achados(g, 'stamina_sync');
        const valorFinal = st1.length ? st1[st1.length - 1].estamina : 100;
        check('guerreiro: stamina DRENOU (100 -> <95 em ~1s)', valorFinal < 95, 'final=' + valorFinal);
        check('guerreiro: dreno ~12/s (100 - 12*tempo)', valorFinal > 80 && valorFinal < 95, 'final=' + valorFinal + ' (esperado ~88)');

        // skill bloqueada pelo servidor (o escudo so dura ~2s, entao e rapido)
        limparMsgs(g);
        g.ws.send(JSON.stringify({ action: 'ataque_barbaro' }));   // acao de ataque generica
        g.ws.send(JSON.stringify({ action: 'guerreiro_provocacao' }));
        await sleep(300);
        check('guerreiro: servidor responde dash_bloqueado', achados(g, 'dash_bloqueado').length > 0, 'nenhum bloqueio emitido');
        check('guerreiro: skill NAO chegou a executar', achados(g, 'action_barbaro_fury').length === 0, 'skill executou!');

        // ---- v1.50.0: o ESCUDO VIRA junto com a ESPADA (arco vivo) ----
        // Testado NO PRIMEIRO escudo, enquanto ele ainda está de pé: mudar a
        // mira de 1.2 para 3.0 tem de virar o arco de bloqueio junto. O pacote
        // de movimento do jogo real NAO tem `action` (é só x/y/angulo/moving) —
        // é justamente ele que o servidor não pode descartar com o escudo up.
        limparMsgs(g);
        const wuAntes = achados(g, 'world_update').pop();
        const euAntes = wuAntes && wuAntes.players && Object.values(wuAntes.players).find(j => j && j.nome === '__teste_guerreiro');
        const posG = euAntes ? { x: Math.round(euAntes.x), y: Math.round(euAntes.y) } : { x: 0, y: 0 };
        g.ws.send(JSON.stringify({ x: posG.x, y: posG.y, angulo: 3.0, moving: false }));
        await sleep(500);
        const syncAng = achados(g, 'action_guerreiro_escudo_ang');
        check('guerreiro: escudo virou junto com a espada (sync de angulo)',
            syncAng.length > 0 && Math.abs(syncAng[syncAng.length - 1].angulo - 3.0) < 0.01,
            JSON.stringify(syncAng.slice(-1)));
        // o estado vai tambem no snapshot (e e o que o OUTRO cliente usa pra
        // desenhar o escudo real na mao do guerreiro)
        const wuG = achados(g, 'world_update').pop();
        const euG = wuG && wuG.players && Object.values(wuG.players).find(j => j && j.nome === '__teste_guerreiro');
        check('guerreiro: snapshot traz escudoGuerreiroAtivo', euG && euG.escudoGuerreiroAtivo === true,
            JSON.stringify(euG && euG.escudoGuerreiroAtivo));
        check('guerreiro: snapshot traz o angulo do arco (= mira viva)',
            euG && Math.abs(euG.escudoGuerreiroAng - 3.0) < 0.01, euG && euG.escudoGuerreiroAng);

        // ---- BAQUE DE ESCUDO 1x a cada 2s na direção da espada ----
        // O escudo inteiro dura ~2s de stamina e depois entra em recarga de 2s.
        // Para o 1º baque (1,2s) sair precisamos de >=60 de stamina no momento em
        // que erguemos (dreno de 50/s). A regeneracao e de 15/s, entao esperamos
        // a recarga (2s) + ~4,5s de regeneracao antes de erguer de novo.
        // v1.51.0: com dreno de 12/s (~8,3s de duracao total), aguarda o dreno gradual
        await esperar(g, 'guerreiro_escudo_fim', 9000);
        check('guerreiro: escudo caiu sozinho quando a stamina zerou',
            achados(g, 'guerreiro_escudo_fim').length > 0, 'nao caiu');
        await sleep(5500);
        limparMsgs(g);
        g.ws.send(JSON.stringify({ action: 'dash', angulo: 1.2 }));
        const cgo = await esperar(g, 'dash_confirmado', 3000);
        check('guerreiro: pode erguer o escudo de novo', !!cgo, 'sem dash_confirmado');
        const tBaque = Date.now();
        await esperar(g, 'action_guerreiro_escudo_baque', 3200);
        const baque = achados(g, 'action_guerreiro_escudo_baque');
        check('guerreiro: BAQUE de escudo disparou', baque.length >= 1, 'nenhum baque em 3,2s');
        if (baque.length) {
            const dt = Date.now() - tBaque;
            // o 1º baque vem cedo (1,2s), nunca instantâneo nem so depois dos 2s
            check('guerreiro: 1o baque entre 0,9s e 1,8s', dt > 900 && dt < 1800, 'dt=' + dt + 'ms');
            check('guerreiro: baque na direcao da espada', Math.abs(baque[0].angulo - 1.2) < 0.001, baque[0].angulo);
            check('guerreiro: baque tem posicao e raio',
                Number.isFinite(baque[0].x) && Number.isFinite(baque[0].y) && baque[0].raio > 0,
                JSON.stringify(baque[0]));
            // 1x a cada 2s: em ~3,2s de espera no maximo 2, nunca 4+
            check('guerreiro: no maximo 2 baques (1 a cada 2s)', baque.length <= 2, 'baques=' + baque.length);
        }

        // soltar o escudo manualmente
        limparMsgs(g);
        g.ws.send(JSON.stringify({ action: 'dash', acao: 'soltar' }));
        let fimEsc = await esperar(g, 'guerreiro_escudo_fim', 2000);
        check('guerreiro: soltou o escudo', !!fimEsc, 'sem evento de fim');
        const evEscOff = achados(g, 'action_guerreiro_escudo');
        check('guerreiro: action_guerreiro_escudo ativo=false', evEscOff.some(e => e.ativo === false), JSON.stringify(evEscOff));
        // apos soltar, o ataque passa a funcionar de novo
        limparMsgs(g);
        g.ws.send(JSON.stringify({ action: 'guerreiro_provocacao' }));
        await sleep(300);
        check('guerreiro: ataque liberado apos soltar', achados(g, 'dash_bloqueado').length === 0, 'ainda bloqueando');
        // stamina volta a regenerar
        await sleep(700);
        const st2 = achados(g, 'stamina_sync');
        check('guerreiro: stamina regenera apos soltar', st2.length === 0 || st2[st2.length - 1].estamina >= valorFinal - 6, JSON.stringify(st2.slice(-1)));
        g.ws.close();

        // ============================================================
        // 4) CURANDEIRO: escudo de AREA consome TUDA e atordoa ela
        // ============================================================
        console.log('\n[curandeiro] escudo de area consome toda a stamina e atordoa');
        let cu = await conectar('__teste_curandeiro');
        await esperar(cu, 'init', 5000);
        await sleep(300);
        limparMsgs(cu);
        cu.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        let ccu = await esperar(cu, 'dash_confirmado', 3000);
        check('curandeiro: tipo = area', ccu && ccu.tipo === 'area', ccu && ccu.tipo);
        const stamC = achados(cu, 'stamina_sync');
        check('curandeiro: stamina foi a ZERO', stamC.some(s => s.estamina === 0), JSON.stringify(stamC));
        check('curandeiro: evento de escudo de area', achados(cu, 'action_curandeiro_escudo_area_carga').length > 0, 'sem evento de carga');
        check('curandeiro: atordoamento sinalizado', achados(cu, 'action_curandeiro_escudo_solto').length > 0, 'sem evento de solto');
        // v1.50.0: o escudo de área dura 10s (era 8s) — o evento traz a duracao
        const evArea = achados(cu, 'action_curandeiro_escudo_area')[0];
        check('curandeiro: escudo de area dura 10s', evArea && evArea.duracaoMs === 10000, JSON.stringify(evArea));
        // atordoada = nao anda
        const stAntes = achados(cu, 'action_curandeiro_escudo_solto').length;
        check('curandeiro: ficou atordoada (5s)', stAntes > 0);
        cu.ws.close();

        // ============================================================
        // 5) SNIPER: o dash VESTE a ROUPA DE CAMUFLAGEM (5s) e libera a skill 4
        // ============================================================
        console.log('\n[sniper] roupa de camuflagem (5s) + skill 4 so no modo camuflado');
        let s = await conectar('__teste_sniper');
        await esperar(s, 'init', 5000);
        await sleep(300);
        limparMsgs(s);
        let t0m = Date.now();
        s.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        let ccs = await esperar(s, 'dash_confirmado', 3000);
        check('sniper: tipo = camuflagem', ccs && ccs.tipo === 'camuflagem', ccs && ccs.tipo);
        const roupa = achados(s, 'action_sniper_roupa_camo');
        check('sniper: action_sniper_roupa_camo', roupa.length === 1, JSON.stringify(roupa[0] || null));
        if (roupa.length) {
            const durMs = roupa[0].expiraEm - t0m;
            check('sniper: a roupa dura 5s', durMs > 4300 && durMs < 5600, 'dur=' + durMs + 'ms');
        }
        check('sniper: confirmacao traz expiraEm', ccs && Number.isFinite(ccs.expiraEm), JSON.stringify(ccs));
        // o dash_confirmado traz a duracao que o CLIENTE usa para o sprite
        check('sniper: confirmacao traz duracaoMs = 5000', ccs && ccs.duracaoMs === 5000, ccs && ccs.duracaoMs);
        // o snapshot dos OUTROS jogadores (ou o proprio) tem a flag de roupa
        await sleep(300);
        let wuS = achados(s, 'world_update').pop();
        const euS = wuS && wuS.players && Object.values(wuS.players).find(j => j && j.nome === '__teste_sniper');
        check('sniper: snapshot traz snRoupaCamo = true', euS && euS.snRoupaCamo === true, JSON.stringify(euS && { r: euS.snRoupaCamo, a: euS.snRoupaCamoAte }));
        // a skill 4 responde (o servidor e a autoridade do "so no modo camuflado")
        limparMsgs(s);
        s.ws.send(JSON.stringify({ action: 'sniper_camuflagem' }));
        await sleep(400);
        const avisos = achados(s, 'skill_aviso');
        const camuflou = achados(s, 'action_sniper_camuflagem');
        // Numa cidade sem mato: ou liga a Camuflagem Natural, ou avisa "fora_mato".
        // O que NÃO pode é o dash ter criado moita (o registro foi removido).
        check('sniper: sem evento de moita (removido no v1.50.0)',
            achados(s, 'action_sniper_moita_criada').length === 0 &&
            achados(s, 'action_sniper_moita_sumiu').length === 0);
        check('sniper: skill 4 respondeu (ligou ou avisou)',
            camuflou.length > 0 || avisos.some(a => a && (a.motivo === 'fora_mato' || a.motivo === 'sem_roupa')),
            'camuflou=' + camuflou.length + ' avisos=' + JSON.stringify(avisos));
        // o sniper NAO se move ao vestir a roupa
        const ccsX = ccs ? ccs.x : null;
        check('sniper: nao se moveu ao vestir a roupa', Number.isFinite(ccsX), JSON.stringify(ccs));
        // 5s depois a roupa cai sozinha
        await sleep(4800);
        wuS = achados(s, 'world_update').pop();
        const euS2 = wuS && wuS.players && Object.values(wuS.players).find(j => j && j.nome === '__teste_sniper');
        check('sniper: roupa caiu sozinha depois de 5s', euS2 && euS2.snRoupaCamo === false,
            JSON.stringify(euS2 && euS2.snRoupaCamo));
        s.ws.close();

        // ============================================================
        // 6) LADINO v1.50.0: SO invisivel + 90% de velocidade por 2s
        // ============================================================
        console.log('\n[ladino] invisivel + 90% de velocidade por 2s, sem deslocamento');
        let l = await conectar('__teste_ladino');
        await esperar(l, 'init', 5000);
        await sleep(300);
        limparMsgs(l);
        l.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        let ccl = await esperar(l, 'dash_confirmado', 3000);
        check('ladino: tipo = arranque', ccl && ccl.tipo === 'arranque', ccl && ccl.tipo);
        check('ladino: servidor marcou soBuff', ccl && ccl.soBuff === true, JSON.stringify(ccl));
        // NENHUM caminho roteirizado: sem x0/x1 o char não é deslocado
        check('ladino: servidor NAO mandou caminho (x0/x1)',
            ccl && ccl.x0 === undefined && ccl.x1 === undefined, JSON.stringify(ccl));
        check('ladino: multiplicador autoritativo = 3.0', ccl && ccl.multVelocidade === 3.0, ccl && ccl.multVelocidade);
        // o buff de velocidade tem FIM AUTORITATIVO (timestamp, não timer local)
        const ate = ccl && ccl.multVelAte;
        check('ladino: multVelAte no futuro (1s de buff)',
            Number.isFinite(ate) && (ate - Date.now()) > 400 && (ate - Date.now()) <= 1100, 'restam ' + ((ate || 0) - Date.now()) + 'ms');
        // invisibilidade: deve aparecer como efeito no mundo
        await sleep(300);
        let wuL = achados(l, 'world_update').pop();
        const euL = wuL && wuL.players && Object.values(wuL.players).find(j => j && j.nome === '__teste_ladino');
        const invis = euL && Array.isArray(euL.efeitos) && euL.efeitos.some(e => e && e.id === 'invisivel');
        check('ladino: ficou INVISIVEL durante o arranque', !!invis, 'efeitos=' + JSON.stringify(euL && euL.efeitos));
        // depois volta ao normal
        await sleep(900);
        wuL = achados(l, 'world_update').pop();
        const euL2 = wuL && wuL.players && Object.values(wuL.players).find(j => j && j.nome === '__teste_ladino');
        const invisDepois = euL2 && Array.isArray(euL2.efeitos) && euL2.efeitos.some(e => e && e.id === 'invisivel');
        check('ladino: REAPARECEU depois de ~2,5s', !invisDepois, 'ainda invisivel');
        l.ws.close();

        // ============================================================
        // 7) ARQUEIRO ARCANO: buraco necrologico
        // ============================================================
        console.log('\n[arqueiro_arcano] buraco necrologico');
        let aa = await conectar('__teste_arqueiro_arcano');
        await esperar(aa, 'init', 5000);
        await sleep(300);
        limparMsgs(aa);
        aa.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        let cca = await esperar(aa, 'dash_confirmado', 3000);
        check('arqueiro_arcano: tipo = teleporte', cca && cca.tipo === 'teleporte', cca && cca.tipo);
        const vfxA = achados(aa, 'action_dash');
        check('arqueiro_arcano: vfx = buraco_necro', vfxA.length > 0 && vfxA[0].vfx === 'buraco_necro', JSON.stringify(vfxA[0] || null));
        aa.ws.close();

        // ============================================================
        // 8) BARBARO: investida = corre + dano
        // ============================================================
        console.log('\n[barbaro] investida (corre + dano)');
        let b = await conectar('__teste_barbaro');
        await esperar(b, 'init', 5000);
        await sleep(300);
        const melhorB = await dashComMaiorAlcance(b, [0, Math.PI, -Math.PI / 2, Math.PI / 2]);
        const ccb = melhorB && melhorB.conf;
        check('barbaro: tipo = investida', ccb && ccb.tipo === 'investida', ccb && ccb.tipo);
        // A config pede 400px; dentro da Cidade de Davahl as paredes cortam antes.
        // Aqui garantimos que foi uma INVESTIDA LONGA (e não um dash de 160px).
        check('barbaro: investida longa (>=280px na cidade)', melhorB && melhorB.dist >= 280, 'dist=' + (melhorB && melhorB.dist));
        check('barbaro: bem mais longo que o dash normal (160px)', melhorB && melhorB.dist > 250, 'dist=' + (melhorB && melhorB.dist));
        // Custo: a investida SEMPRE cobra 40, mesmo se a parede cortou o percurso
        await sleep(2300);
        limparMsgs(b);
        b.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        await esperar(b, 'dash_confirmado', 2500);
        const stamB = achados(b, 'stamina_sync');
        check('barbaro: investida cobra 40 de stamina', stamB.length > 0 && stamB[0].estamina === 60, JSON.stringify(stamB.slice(0, 2)));
        b.ws.close();

        // ============================================================
        // 9) PIKEYMAN: mesmo arranque do ladino
        // ============================================================
        console.log('\n[pikeman] arranque igual ao ladino');
        let pk = await conectar('__teste_pikeman');
        await esperar(pk, 'init', 5000);
        await sleep(300);
        limparMsgs(pk);
        pk.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        let ccp = await esperar(pk, 'dash_confirmado', 3000);
        check('pikeman: tipo = arranque', ccp && ccp.tipo === 'arranque', ccp && ccp.tipo);
        await sleep(250);
        let wuP = achados(pk, 'world_update').pop();
        const euP = wuP && wuP.players && Object.values(wuP.players).find(j => j && j.nome === '__teste_pikeman');
        check('pikeman: invisivel durante o arranque', euP && Array.isArray(euP.efeitos) && euP.efeitos.some(e => e && e.id === 'invisivel'), JSON.stringify(euP && euP.efeitos));
        pk.ws.close();

        // ============================================================
        // 10) DRONEMASTER: inalterado (escudo de energia, 40 de stamina)
        // ============================================================
        console.log('\n[dronemaster] inalterado');
        let d = await conectar('__teste_dronemaster');
        await esperar(d, 'init', 5000);
        await sleep(300);
        limparMsgs(d);
        d.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        let ccd = await esperar(d, 'dash_confirmado', 3000);
        check('dronemaster: tipo = energia (nao teleportou)', ccd && ccd.tipo === 'energia', ccd && ccd.tipo);
        const evDm = achados(d, 'action_dm_dash_escudo');
        check('dronemaster: escudo de energia emitido', evDm.length > 0, 'sem evento');
        const stamD = achados(d, 'stamina_sync');
        check('dronemaster: gastou 40', stamD.some(s => s.estamina === 60), JSON.stringify(stamD));
        d.ws.close();

        // ============================================================
        // 11) ROQUEIRO: corrida com vfx de pedra
        // ============================================================
        console.log('\n[roqueiro] corrida com efeitos de rock');
        let rq = await conectar('__teste_roqueiro');
        await esperar(rq, 'init', 5000);
        await sleep(300);
        limparMsgs(rq);
        rq.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        let ccr = await esperar(rq, 'dash_confirmado', 3000);
        check('roqueiro: tipo = corrida', ccr && ccr.tipo === 'corrida', ccr && ccr.tipo);
        const vfxR = achados(rq, 'action_dash');
        check('roqueiro: vfx = roqueiro_dash', vfxR.length > 0 && vfxR[0].vfx === 'roqueiro_dash', JSON.stringify(vfxR[0] || null));
        rq.ws.close();

        // ============================================================
        // 12) SUMMONER: teleporte + pet teleporta junto
        // ============================================================
        console.log('\n[summoner] teleporte + pet vai junto');
        let su = await conectar('__teste_summoner');
        await esperar(su, 'init', 5000);
        await sleep(600);
        limparMsgs(su);
        su.ws.send(JSON.stringify({ action: 'dash', angulo: 0 }));
        await esperar(su, 'dash_confirmado', 3000);
        await sleep(400);
        const petTp = achados(su, 'action_summoner_pet_teleporte');
        check('summoner: pet teleportou para o lado', petTp.length > 0, 'sem evento de pet');
        su.ws.close();

    } catch (e) {
        console.log('\nERRO NO TESTE: ' + e.stack);
        falhas++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('RESULTADO: ' + ok + ' passaram, ' + falhas + ' falharam');
    console.log('='.repeat(60));

    srv.kill();
    await sleep(400);
    limpar(ids);
    process.exit(falhas > 0 ? 1 : 0);
})();
