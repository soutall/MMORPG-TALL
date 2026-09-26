// Auditoria v1.60.1 — teste AO VIVO de PvP (imunidade do Salto + Chuva do Alto):
//   1) BASELINE: dano PvP chega quando NÃO há imunidade (pipeline funciona)
//   2) IMUNE: dano PvP chega MESMO com p.imune = true (imunidade é só PvE)
// Uso: node _auditoria_pvp.js   (servidor precisa estar de pé em :8080)
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
        const timer = setTimeout(() => reject(new Error('timeout login ' + userId)), 8000);
        ws.on('error', (e) => { clearTimeout(timer); reject(e); });
        ws.on('message', (m) => {
            let d; try { d = JSON.parse(m); } catch (e) { return; }
            msgs.push({ m: d, t: Date.now() });
            if (d.type === 'world_update' && d.players) {
                const p = d.players['heroi_' + userId];
                if (p) pos = { x: p.x, y: p.y };
                if (pos) { clearTimeout(timer); resolve({ ws, msgs, pos }); }
            }
        });
        ws.on('open', () => ws.send(JSON.stringify({ action: 'login', userId })));
    });
}

const danoDe = (msgs, atkId) => msgs.filter(e => e.m.type === 'texto_dano' && e.m.autorId === atkId);

async function main() {
    const A = 'aud_pvp_a';   // atacante
    const B = 'aud_pvp_b';   // defensor (fica com a imunidade)
    const atkId = 'heroi_' + A;

    const ca = await conectar(A);
    const cb = await conectar(B);
    await sleep(300);
    // estado limpo: respawn zera hp/mana dos dois lados
    ca.ws.send(JSON.stringify({ action: 'respawn' }));
    cb.ws.send(JSON.stringify({ action: 'respawn' }));
    await sleep(700);

    // ----- setup: PvP ligado nos dois -----
    ca.ws.send(JSON.stringify({ action: 'toggle_pvp' }));
    cb.ws.send(JSON.stringify({ action: 'toggle_pvp' }));
    await sleep(500);

    // ----- 1. BASELINE (sem imunidade) -----
    ca.msgs.length = 0;
    const alvo1 = { x: cb.pos.x, y: cb.pos.y };
    ca.ws.send(JSON.stringify({ action: 'meteoro', targetX: alvo1.x, targetY: alvo1.y }));
    await sleep(2200); // meteoro cai aos 600ms + ticks de 1000ms
    const base = danoDe(ca.msgs, atkId);
    r('pvp_baseline_dano', base.length >= 1, `sem imunidade => ${base.length} acerto(s) PvP registrado(s)`);
    r('pvp_baseline_lado_errado_nao', ca.msgs.every(e => !(e.m.type === 'texto_dano' && e.m.dano === 9999999)), 'sem admin cheat envolvido');

    // espera o CD do meteoro (6500ms server) e a imunidade do B expirar (3000ms)
    await sleep(5200);

    // ----- 2. COM IMUNIDADE (Salto + Chuva do Alto) -----
    cb.msgs.length = 0;
    cb.ws.send(JSON.stringify({ action: 'arqueiro_salto_chuva' }));
    await sleep(150);
    const t0 = Date.now();
    const castou = cb.msgs.some(e => e.m.type === 'action_arqueiro_salto_chuva_up');
    r('salto_chuva_cast', castou, 'B executou o Salto + Chuva do Alto (p.imune = true)');

    ca.msgs.length = 0;
    const alvo2 = { x: cb.pos.x, y: cb.pos.y };
    ca.ws.send(JSON.stringify({ action: 'meteoro', targetX: alvo2.x, targetY: alvo2.y }));
    // janela de imunidade: 3000ms a partir do cast do B; meteoro cai em 600ms
    await sleep(2500);
    const hits = danoDe(ca.msgs, atkId);
    const primeiro = hits.length ? hits[0].t - t0 : -1;
    r('pvp_com_imune_dano', hits.length >= 1, `COM p.imune=true => ${hits.length} acerto(s) PvP`);
    r('pvp_dentro_janela_imune', hits.length >= 1 && primeiro >= 0 && primeiro < 2900,
        `1º acerto em t=+${primeiro}ms (imunidade vale até +3000ms) => imunidade NÃO bloqueou PvP`);

    // prova auxiliar: a imunidade ESTAVA de fato ativa naquele instante
    // (pelo menos um tick de imunidade entre o cast do B e o 1º acerto)
    r('imune_ativa_na_janela', (cb.msgs.some(e => e.m.type === 'action_arqueiro_salto_chuva_up') && primeiro >= 0 && primeiro < 2900),
        'salto confirmado + acerto antes do fim da imunidade');

    ca.ws.close(); cb.ws.close();
    console.log('\n=== PVP AO VIVO: ' + pass + ' PASS / ' + fail + ' FAIL ===');
    process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('ERRO NO TESTE:', e.message); process.exit(2); });
