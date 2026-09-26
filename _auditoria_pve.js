// Auditoria v1.60.1 — teste AO VIVO de PvE (imunidade do Salto + Chuva do Alto):
//   A) BASELINE: monstro real causa dano ao jogador (pipeline PvE funciona)
//      + mede a CADÊNCIA de ataque => prova que a janela imune de 3000ms
//        deveria conter pelo menos um ataque
//   B) IMUNE: com p.imune = true o mesmo monstro NÃO causa dano
//   C) DEPOIS: com a imunidade expirada o dano volta (monstro seguia atacando)
// Mapa: Cidade Perdida (monstro melee dano=1 => exposição segura, hp detectável)
// O ambiente é 4 CPUs com load ~20: sleeps podem sofrer STALL. Por isso o
// teste mede cada sleep, marca stall e repete a fase afetada em vez de
// gerar falso-negativo.
// Uso: node _auditoria_pve.js   (servidor precisa estar de pé em :8080)
const WebSocket = require('ws');

let pass = 0, fail = 0;
function r(n, ok, msg) {
    if (ok) { pass++; console.log('PASS ' + n + (msg ? ' · ' + msg : '')); }
    else { fail++; console.log('FAIL ' + n + ' — ' + msg); }
}

let stallou = false;
async function sleepMedido(ms) {
    const t0 = Date.now();
    await new Promise(res => setTimeout(res, ms));
    if (Date.now() - t0 > Math.max(900, ms * 3)) stallou = true;
}

function conectar(userId) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://127.0.0.1:8080');
        const st = { wu: null, all: [] };
        const timer = setTimeout(() => reject(new Error('timeout login ' + userId)), 8000);
        ws.on('error', (e) => { clearTimeout(timer); reject(e); });
        ws.on('message', (m) => {
            let d; try { d = JSON.parse(m); } catch (e) { return; }
            if (d.type === 'world_update') { st.wu = d; return; }  // não reter (memória/GC)
            st.all.push({ m: d, t: Date.now() });
        });
        ws.on('open', () => ws.send(JSON.stringify({ action: 'login', userId })));
        const waitUp = () => {
            if (st.wu && st.wu.players && st.wu.players['heroi_' + userId]) {
                clearTimeout(timer); resolve({ ws, st });
            } else setTimeout(waitUp, 30);
        };
        waitUp();
    });
}

async function main() {
    const U = 'aud_pve_a';
    const { ws, st } = await conectar(U);
    const enviar = (o) => ws.send(JSON.stringify(o));
    const eu = () => st.wu && st.wu.players && st.wu.players['heroi_' + U];
    const monstros = () => (st.wu && st.wu.slimes ? st.wu.slimes : []).filter(s => s.hp > 0);
    const maisPerto = () => monstros().map(s => ({ s, d: Math.hypot(s.x - eu().x, s.y - eu().y) })).sort((a, b) => a.d - b.d)[0];

    await sleepMedido(300);
    // estado limpo antes do teste: respawn zera hp/mana e reposiciona na cidade
    enviar({ action: 'respawn' }); await sleepMedido(700);
    enviar({ action: 'teleporte_mapa', mapa: 'cidade' }); await sleepMedido(700);
    enviar({ action: 'teleporte_mapa', mapa: 'cidadeperdida' }); await sleepMedido(900);
    r('pve_no_mapa', eu() && eu().x > 65040 && eu().x < 71920,
        `posicao ${Math.round(eu() ? eu().x : -1)},${Math.round(eu() ? eu().y : -1)}`);
    r('pve_vivo', eu() && eu().hp === eu().maxHp, `hp ${eu() ? eu().hp : '-'}/${eu() ? eu().maxHp : '-'}`);
    if (!eu() || eu().hp <= 0) { ws.close(); console.log('\n=== PVE AO VIVO: ' + pass + ' PASS / ' + fail + ' FAIL ==='); process.exit(1); }

    const lista = monstros();
    r('pve_tem_monstro', lista.length > 0, `${lista.length} monstros no mapa`);
    if (!lista.length) { ws.close(); console.log('\n=== PVE AO VIVO: ' + pass + ' PASS / ' + fail + ' FAIL ==='); process.exit(1); }

    // preferimos um monstro "tanque" (hp alto) — ele sobrevive à provocação de dano
    const candsAlvo = monstros()
        .map(s => ({ s, d: Math.hypot(s.x - eu().x, s.y - eu().y) }))
        .filter(c => c.d <= 1100);
    const tanques = candsAlvo.filter(c => c.s.hp >= 1000);
    const escolhido = (tanques.length ? tanques : candsAlvo).sort((a, b) => a.d - b.d)[0] || maisPerto();
    console.log(`   alvo: ${escolhido.s.tipo} dano=${escolhido.s.dano} hp=${escolhido.s.hp} a ${Math.round(escolhido.d)}px`);

    let idAlvo = escolhido.s.id;
    const monstroAlvo = () => monstros().find(s => s.id === idAlvo) || null;

    // --- caminha até ~50px do monstro (valida colisão a cada passo) ---
    async function caminharAte() {
        let pos = { x: eu().x, y: eu().y };
        for (let i = 0; i < 100; i++) {
            const alvoVivo = monstroAlvo();
            if (!alvoVivo) return -1;
            const d = Math.hypot(alvoVivo.x - pos.x, alvoVivo.y - pos.y);
            if (d < 52) return Math.hypot(alvoVivo.x - eu().x, alvoVivo.y - eu().y);
            const dx = alvoVivo.x - pos.x, dy = alvoVivo.y - pos.y;
            const k = Math.min(1, 50 / d);
            enviar({ x: pos.x + dx * k, y: pos.y + dy * k });
            await sleepMedido(70);
            const q = eu();
            if (Math.hypot(q.x - pos.x, q.y - pos.y) > 1) pos = { x: q.x, y: q.y };
        }
        const alvoVivo = monstroAlvo();
        return alvoVivo ? Math.hypot(alvoVivo.x - eu().x, alvoVivo.y - eu().y) : -1;
    }
    let distFinal = await caminharAte();
    if (!(distFinal >= 0 && distFinal <= 90)) {
        const m = maisPerto();
        if (m && m.s.id !== idAlvo && m.d <= 700) { idAlvo = m.s.id; distFinal = await caminharAte(); }
    }
    r('pve_chegou_perto', distFinal >= 0 && distFinal <= 90, `distancia final ${Math.round(distFinal)}px`);
    if (!(distFinal >= 0 && distFinal <= 200)) { ws.close(); console.log('\n=== PVE AO VIVO: ' + pass + ' PASS / ' + fail + ' FAIL ==='); process.exit(1); }

    // provoca com dano se o agro não acionar (isso marca slime.targetId = jogador)
    const provocar = () => {
        const m = monstroAlvo();
        if (m && Math.hypot(m.x - eu().x, m.y - eu().y) <= 380 && eu().mana >= 30) {
            enviar({ action: 'meteoro', targetX: m.x, targetY: m.y });
            return true;
        }
        return false;
    };

    // Espera quedas de HP. Monstro que ficou "voltando pra casa" após a rodada
    // anterior não ataca nem responde a provocação — nesse caso o teste muda de
    // monstro e continua (até `rodadasMax`).
    async function aguardarQueda(amostrasPorRodada, rodadasMax, minQuedas) {
        const eventos = [];
        let prev = eu().hp;
        const jaUsados = new Set([idAlvo]);
        for (let rodada = 0; rodada < rodadasMax && eventos.length < minQuedas; rodada++) {
            for (let i = 0; i < amostrasPorRodada && eventos.length < minQuedas; i++) {
                await sleepMedido(250);
                const h = eu().hp;
                if (h < prev) eventos.push({ t: Date.now(), hp: h });
                prev = h;
                if (i === 22 && !eventos.length) provocar();
            }
            if (eventos.length >= minQuedas) break;
            if (eventos.length === 0) {
                const prox = monstros().filter(s => !jaUsados.has(s.id))
                    .map(s => ({ s, d: Math.hypot(s.x - eu().x, s.y - eu().y) }))
                    .filter(c => c.d <= 900).sort((a, b) => a.d - b.d)[0];
                if (!prox) break;
                idAlvo = prox.s.id; jaUsados.add(idAlvo);
                console.log(`   sem dano em ${amostrasPorRodada * 250}ms; trocando de alvo -> ${prox.s.tipo} hp=${prox.s.hp} a ${Math.round(prox.d)}px`);
                await caminharAte();
                prev = eu().hp;
            }
        }
        return eventos;
    }

    // ===== FASE A: BASELINE — o monstro causa dano (mede a cadência de ataque) =====
    let quedasA = [];
    for (let tentativa = 0; tentativa < 2 && quedasA.length < 3; tentativa++) {
        stallou = false;
        quedasA = await aguardarQueda(48, 3, 3);
        if (quedasA.length >= 2) break;
        if (stallou) console.log('   [dbg] stall no ambiente; refazendo fase A');
    }
    console.log(`   [dbg] quedas fase A: ${quedasA.length}`);
    r('pve_baseline_dano', quedasA.length >= 1, `sem imunidade => ${quedasA.length} queda(s) de hp (${eu().hp}/${eu().maxHp})`);
    const gaps = [];
    for (let i = 1; i < quedasA.length; i++) gaps.push(quedasA[i].t - quedasA[i - 1].t);
    const cadencia = gaps.length ? Math.min(...gaps) : -1;
    r('pve_cadencia_medida', cadencia > 0 && cadencia <= 3000,
        cadencia > 0 ? `ritmo mais rápido observado = ${cadencia}ms (janela imune = 3000ms; gaps: ${gaps.join('/')})`
            : 'não foi possível medir a cadência');

    // ===== FASE B: COM IMUNIDADE (com proteção contra stall + retry no CD) =====
    r('pve_mana_pra_salto', eu().mana >= 25, `mana ${Math.round(eu().mana)} >= 25 (custo do Salto)`);

    async function tentarFaseB() {
        stallou = false;
        st.all.length = 0;
        const T0 = Date.now();
        enviar({ action: 'arqueiro_salto_chuva' });
        await sleepMedido(250);
        if (!st.all.some(e => e.m.type === 'action_arqueiro_salto_chuva_up')) return { inconclusivo: true, motivo: 'cast não confirmado' };
        const hp0 = eu().hp;
        let anterior = hp0;
        const quedas = [];
        let prevT = Date.now();
        while (Date.now() - T0 < 2900) {
            await sleepMedido(100);
            const now = Date.now();
            if (now - prevT > 700) return { inconclusivo: true, motivo: `stall de ${now - prevT}ms` };
            prevT = now;
            const h = eu().hp;
            if (h < anterior) quedas.push({ t: now - T0, hp: h });
            anterior = h;
        }
        if (stallou) return { inconclusivo: true, motivo: 'stall na janela imune' };
        return { inconclusivo: false, quedas, hp0, hp1: eu().hp };
    }

    let resB = null, tentB = 0;
    while (tentB < 3) {
        tentB++;
        if (tentB > 1) {
            console.log(`   [dbg] repetindo fase B (tentativa ${tentB}) — espera o CD de 24,5s + mana`);
            await sleepMedido(25000);
            for (let k = 0; k < 40 && eu().mana < 25; k++) await sleepMedido(500);
        }
        resB = await tentarFaseB();
        if (!resB.inconclusivo) break;
        console.log(`   [dbg] fase B inconclusiva: ${resB.motivo}`);
    }
    r('pve_salto_cast', !!(resB && !resB.inconclusivo),
        resB && !resB.inconclusivo ? 'Salto + Chuva do Alto executado (p.imune = true no servidor)'
            : 'cast não confirmado após 3 tentativas');
    if (resB && !resB.inconclusivo) {
        r('pve_imune_bloqueia_dano', resB.quedas.length === 0 && resB.hp1 > 0,
            resB.quedas.length === 0
                ? `hp ${resB.hp1}/${eu().maxHp} durante 2900ms da janela imune de 3000ms (p.imune = true, monstro atacando)`
                : `hp caiu em ${resB.quedas.map(q => q.t + 'ms').join(',')} dentro da janela imune (${resB.hp0} -> ${resB.hp1})`);
    } else {
        r('pve_imune_bloqueia_dano', false, 'fase B inconclusiva (stall do ambiente)');
    }

    // ===== FASE C: IMUNIDADE EXPIROU — dano volta =====
    await sleepMedido(500); // garante que os 3000ms de imunidade já passaram
    const tC0 = Date.now();
    let quedasC = [];
    for (let tentativa = 0; tentativa < 2 && quedasC.length < 1; tentativa++) {
        quedasC = await aguardarQueda(40, 2, 1);
    }
    r('pve_dano_volta_apos_imunidade', quedasC.length >= 1,
        `queda de hp depois de a imunidade expirar (hp ${eu().hp}/${eu().maxHp}, espera ${Date.now() - tC0}ms)`);

    enviar({ action: 'teleporte_mapa', mapa: 'cidade' });
    await sleepMedido(400);
    console.log(`   hp final ${eu().hp}/${eu().maxHp}`);
    ws.close();
    console.log('\n=== PVE AO VIVO: ' + pass + ' PASS / ' + fail + ' FAIL ===');
    process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('ERRO NO TESTE:', e.message); process.exit(2); });
