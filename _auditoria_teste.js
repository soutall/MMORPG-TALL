// Auditoria v1.60.1 — testes AO VIVO por WebSocket:
//   1) Cooldown server-side das 9 skills (com a margem de -500ms)
//   2) Validação server-side de ALCANCE (4 skills)
//   3) Regressão geral
// Uso: node _auditoria_teste.js   (servidor precisa estar de pé em :8080)
const WebSocket = require('ws');

let pass = 0, fail = 0;
function r(n, ok, msg) {
    if (ok) { pass++; console.log('PASS ' + n + (msg ? ' · ' + msg : '')); }
    else { fail++; console.log('FAIL ' + n + ' — ' + msg); }
}
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function conectar(userId) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://127.0.0.1:8080');
        const msgs = [];
        let pos = null;
        let entrou = false;
        const timer = setTimeout(() => reject(new Error('timeout login ' + userId)), 10000);
        ws.on('error', (e) => { clearTimeout(timer); reject(e); });
        ws.on('message', (m) => {
            let d; try { d = JSON.parse(m); } catch (e) { return; }
            d._ts = Date.now();
            msgs.push(d);
            if (d.type === 'world_update' && d.players) {
                const p = d.players['heroi_' + userId];
                if (p) pos = { x: p.x, y: p.y };
                if (p && !entrou) {
                    entrou = true;
                    // Estado limpo (hp/mana cheios) para não herdar mana do save
                    // anterior — senão o cast de fase 1 já sai como mp_insuficiente.
                    ws.send(JSON.stringify({ action: 'respawn' }));
                    setTimeout(() => { clearTimeout(timer); resolve({ ws, msgs, pos }); }, 600);
                }
            }
        });
        ws.on('open', () => ws.send(JSON.stringify({ action: 'login', userId })));
    });
}
const centro = (pos) => ({ x: pos.x + 12, y: pos.y + 16 });
const conta = (msgs, tipo) => ({
    ok: msgs.filter(m => m.type === tipo).length,
    avisoCd: msgs.filter(m => m.type === 'skill_aviso' && m.motivo === 'cooldown').length,
    avisoAlcance: msgs.filter(m => m.type === 'skill_aviso' && m.motivo === 'fora_alcance').length,
    semMana: msgs.filter(m => m.type === 'mp_insuficiente').length
});

// ==================== 1. COOLDOWNS (9 skills) ====================
// cdCliente = valor exibido no cliente (não muda); cdServidor = cliente - 500ms.
async function testarCd(nome, userId, mkPayload, msgSucesso, cdCliente, cdServidor, custo) {
    const { ws, msgs, pos } = await conectar(userId);
    const p = mkPayload(pos);
    const contaCd = () => conta(msgs, msgSucesso);

    // FASE 1 — primeiro uso executa
    msgs.length = 0;
    const t0 = Date.now();
    ws.send(JSON.stringify(p));
    await sleep(700);
    const a = contaCd();
    r(nome + '_1uso', a.ok === 1 && a.avisoCd === 0, `exec=${a.ok} avisoCd=${a.avisoCd} semMana=${a.semMana}`);

    // FASE 2 — segundo uso imediato é recusado pelo servidor, com `restante` coerente
    msgs.length = 0;
    ws.send(JSON.stringify(p));
    await sleep(700);
    const b = contaCd();
    const aviso = msgs.find(m => m.type === 'skill_aviso' && m.motivo === 'cooldown');
    const restante = aviso ? aviso.restante : -1;
    r(nome + '_2uso_bloqueado', b.ok === 0 && b.avisoCd === 1, `exec=${b.ok} avisoCd=${b.avisoCd} restante=${restante}ms`);

    // Medida DIRETA do CD do servidor: (instante de recebimento do aviso − envio
    // do 1º cast) + restante reportado pelo próprio servidor. O atraso do cliente
    // (stall de CPU) se cancela na conta, então este número é confiável mesmo com
    // o host carregado. Se o servidor usasse o valor do CLIENTE ele apareceria
    // aqui como cdServidor + 500ms.
    const cdMedido = aviso ? (aviso._ts - t0) + aviso.restante : -1;
    r(nome + '_cd_valor', cdMedido >= cdServidor - 250 && cdMedido <= cdServidor + 250,
        `CD medido no servidor = ${cdMedido}ms | esperado ${cdServidor}ms (cliente ${cdCliente}ms)`);

    // FASE 3 — em cdServidor+300ms a skill volta (prova que o servidor usa a
    // margem de -500ms: se usasse o valor do cliente estaria ainda em recarga)
    const alvo3 = cdServidor + 300;
    while (Date.now() - t0 < alvo3) await sleep(50);
    msgs.length = 0;
    ws.send(JSON.stringify(p));
    await sleep(700);
    const c = contaCd();
    const tAgora = Date.now() - t0;
    r(nome + '_apos_cd_margem', c.ok === 1 && c.avisoCd === 0,
        `em t=${tAgora}ms => exec=${c.ok} avisoCd=${c.avisoCd} (servidor pronto em ${cdServidor}ms, cliente em ${cdCliente}ms${tAgora <= cdCliente ? ', janela estrita respeitada' : ', stall do ambiente — margem comprovada pelo CD medido'})`);
    r(nome + '_mana_ok', c.semMana === 0 && a.semMana === 0, `mana recuperou p/ 2o uso (custo ${custo})`);
    ws.close();
}

// ==================== 2. ALCANCE (4 skills) ====================
async function testarAlcance(nome, userId, mkPayload, msgSucesso, alcance) {
    const { ws, msgs, pos } = await conectar(userId);
    const c = centro(pos);

    // FORA do alcance => rejeita e avisa, sem executar
    msgs.length = 0;
    ws.send(JSON.stringify(mkPayload(c.x + alcance + 60, c.y)));
    await sleep(700);
    const fora = conta(msgs, msgSucesso);
    r(nome + '_fora_rejeitado', fora.ok === 0 && fora.avisoAlcance === 1,
        `alvo a ${alcance + 60}px => exec=${fora.ok} avisoForaAlcance=${fora.avisoAlcance}`);

    // DENTRO do alcance => executa. Como a validação de alcance roda ANTES do
    // cooldown, o cast recusado NÃO pode ter queimado a recarga.
    msgs.length = 0;
    ws.send(JSON.stringify(mkPayload(c.x + 60, c.y)));
    await sleep(700);
    const dentro = conta(msgs, msgSucesso);
    r(nome + '_dentro_executa', dentro.ok === 1 && dentro.avisoAlcance === 0,
        `alvo a 60px => exec=${dentro.ok} avisoForaAlcance=${dentro.avisoAlcance} (CD não foi consumido pelo cast recusado)`);
    ws.close();
}

async function main() {
    console.log('--- 1. COOLDOWNS SERVER-SIDE (9 skills, margem -500ms) ---');
    // nome, userId, mkPayload, msgSucesso, cdCliente(ms), cdServidor(ms), custo mana
    const T = [
        ['tornado',       'aud_tornado', () => ({ action: 'tornado' }), 'action_tornado', 5000, 4500, 20],
        ['meteoro',       'aud_meteoro', (pos) => { const c = centro(pos); return { action: 'meteoro', targetX: c.x + 60, targetY: c.y }; }, 'action_meteoro', 7000, 6500, 30],
        ['nevasca',       'aud_nevasca', (pos) => { const c = centro(pos); return { action: 'nevasca', targetX: c.x + 60, targetY: c.y }; }, 'action_nevasca', 12000, 11500, 35],
        ['chuva_flechas', 'aud_chuva',   (pos) => { const c = centro(pos); return { action: 'arqueiro_chuva', targetX: c.x + 60, targetY: c.y }; }, 'action_arqueiro_chuva', 6000, 5500, 22],
        ['perfurante',    'aud_perfu',   () => ({ action: 'arqueiro_perfurante', angulo: 0 }), 'action_arqueiro_perfurante', 4500, 4000, 18],
        ['rajada',        'aud_rajada',  () => ({ action: 'arqueiro_rajada', angulo: 0 }), 'action_arqueiro_rajada_start', 12000, 11500, 30],
        ['cura_divina',   'aud_cura',    (pos) => { const c = centro(pos); return { action: 'curandeiro_cura', targetX: c.x + 60, targetY: c.y }; }, 'action_curandeiro_cura', 5000, 4500, 25],
        ['julgamento',    'aud_julg',    (pos) => { const c = centro(pos); return { action: 'curandeiro_julgamento', targetX: c.x + 60, targetY: c.y }; }, 'action_curandeiro_julgamento', 6500, 6000, 24],
        ['salto_esmagador', 'aud_esmag', (pos) => { const c = centro(pos); return { action: 'barbaro_esmagamento', targetX: c.x, targetY: c.y }; }, 'action_barbaro_esmagamento', 6000, 5500, 25]
    ];
    await Promise.all(T.map(t => testarCd(t[0], t[1], t[2], t[3], t[4], t[5], t[6])));

    console.log('\n--- 2. ALCANCE SERVER-SIDE (4 skills) ---');
    const A = [
        ['meteoro',     'alv_meteoro', (x, y) => ({ action: 'meteoro', targetX: x, targetY: y }), 'action_meteoro', 380],
        ['nevasca',     'alv_nevasca', (x, y) => ({ action: 'nevasca', targetX: x, targetY: y }), 'action_nevasca', 350],
        ['chuva',       'alv_chuva',   (x, y) => ({ action: 'arqueiro_chuva', targetX: x, targetY: y }), 'action_arqueiro_chuva', 420],
        ['julgamento',  'alv_julg',    (x, y) => ({ action: 'curandeiro_julgamento', targetX: x, targetY: y }), 'action_curandeiro_julgamento', 340]
    ];
    await Promise.all(A.map(a => testarAlcance(a[0], a[1], a[2], a[3], a[4])));

    console.log('\n--- 3. REGRESSAO GERAL ---');
    const { ws, msgs, pos } = await conectar('aud_regressao');
    await sleep(300);
    msgs.length = 0;
    ws.send(JSON.stringify({ action: 'tornado' }));
    await sleep(600);
    r('ws_mundo_recebe', msgs.some(m => m.type === 'world_update'), 'world_update chegando');
    r('skill_executa', msgs.some(m => m.type === 'action_tornado'), 'tornado executou');
    ws.close();

    console.log('\n=== AO VIVO: ' + pass + ' PASS / ' + fail + ' FAIL ===');
    process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('ERRO NO TESTE:', e.message); process.exit(2); });
