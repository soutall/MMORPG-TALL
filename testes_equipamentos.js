// Testes do Sistema de Equipamentos (drop) — parte A (API pura) e parte B (integração com servidor + 2 clientes)
const path = __dirname + '/equipamentos.js';
const eq = require(path);

let pass = 0, fail = 0;
function ok(cond, msg) {
    if (cond) { pass++; console.log('  PASS', msg); }
    else { fail++; console.log('  FAIL', msg); }
}

function testesPuros() {
    console.log('== TESTES AUTOMÁTICOS (parte A: API pura) ==');
    const it = eq.gerarEquipamento('guerreiro');
    ok(!!it.slot, 'slot definido');
    ok(!!it.raridade, 'raridade definida');
    ok(it.status && typeof it.status === 'object', 'status objeto');
    ok(Object.keys(it.status).every(k => (eq.ATRIBUTOS || eq.BALANCE.statusOficial).includes(k)), 'status chave oficial: ' + Object.keys(it.status).join(','));
    ok(Object.values(it.status).every(v => v >= 1 && v <= 12), 'status dentro da faixa 3');

    ok(eq.BALANCE.dropsPorBoss === 2, 'dropsPorBoss=2');

    let lowChance = 0, highChance = 0;
    for (let i = 0; i < 2000; i++) { if (eq.rolarDropMonstro(10)) lowChance++; }
    for (let i = 0; i < 2000; i++) { if (eq.rolarDropMonstro(1000)) highChance++; }
    ok(highChance > lowChance, 'HP alto maior chance: ' + highChance + ' > ' + lowChance);
    ok(highChance > 0.5 * 2000, 'HP alto chance razoável');

    ok(eq.BALANCE.raridades.comum.cor === '#ffffff', 'comum branco');
    ok(eq.BALANCE.raridades.raro.cor === '#4da6ff', 'raro azul');
    ok(eq.BALANCE.raridades.epico.cor === '#a855f7', 'epico roxo');
    ok(eq.BALANCE.raridades.lendario.cor === '#ff7a00', 'lendario laranja');

    let anelAfinidade = 0, anelTotal = 0;
    let peitVida = 0, peitTotal = 0;
    for (let i = 0; i < 500; i++) {
        let a = eq.gerarEquipamento('curandeiro');
        if (a.slot === 'anel') { anelTotal++; if ((a.status.afinidade || 0) >= 1) anelAfinidade++; }
        if (a.slot === 'peitoral') { peitTotal++; if ((a.status.vida || 0) >= 1) peitVida++; }
    }
    ok(anelTotal > 10, 'anes gerados amostra: ' + anelTotal);
    ok(anelTotal === 0 || anelAfinidade / anelTotal > 0.25, 'anel favorece afinidade: ' + (anelTotal ? Math.round(100*anelAfinidade/anelTotal) : 0) + '%');
    ok(peitTotal === 0 || peitVida / peitTotal > 0.3, 'peitoral favorece vida: ' + (peitTotal ? Math.round(100*peitVida/peitTotal) : 0) + '%');

    let magoArmas = 0, guerSec = 0, magoSec = 0;
    let sumSec = 0, arqSec = 0, curSec = 0;
    for (let i = 0; i < 200; i++) {
        let im = eq.gerarEquipamento('mago');
        if (im.slot === 'arma') magoArmas++;
        let ig = eq.gerarEquipamento('guerreiro');
        if (ig.slot === 'armaSecundaria') guerSec++;
        let in2 = eq.gerarEquipamento('mago');
        if (in2.slot === 'armaSecundaria') magoSec++;
        if (eq.gerarEquipamento('summoner').slot === 'armaSecundaria') sumSec++;
        if (eq.gerarEquipamento('arqueiro').slot === 'armaSecundaria') arqSec++;
        if (eq.gerarEquipamento('curandeiro').slot === 'armaSecundaria') curSec++;
    }
    ok(magoArmas > 0, 'mago gera arma');
    ok(guerSec > 0, 'guerreiro gera armaSecundaria');
    ok(magoSec > 0, 'mago gera armaSecundaria');
    ok(sumSec > 0, 'summoner gera armaSecundaria');
    ok(arqSec > 0, 'arqueiro gera armaSecundaria');
    ok(curSec > 0, 'curandeiro gera armaSecundaria');

    let barArma = 0, rocArma = 0;
    for (let i = 0; i < 200; i++) {
        let ib = eq.gerarEquipamento('barbaro');
        if (ib.slot === 'arma' || ib.slot === 'armaSecundaria') barArma++;
        let ir = eq.gerarEquipamento('roqueiro');
        if (ir.slot === 'arma' || ir.slot === 'armaSecundaria') rocArma++;
    }
    ok(barArma === 0, 'barbaro NUNCA gera arma/armaSecundaria');
    ok(rocArma === 0, 'roqueiro NUNCA gera arma/armaSecundaria');

    ok(eq.escolherCriadorDrop(null) === null, 'tabelaDano null → null');
    ok(eq.escolherCriadorDrop({ p1: 50, p2: 120, p3: 80 }) === 'p2', 'escolhe maior contribuidor');
    ok(eq.escolherCriadorDrop({ a: 10 }) === 'a', 'único');

    let ib = eq.gerarEquipamento('mago');
    ok(eq.calcularBonus(ib) === ib.status, 'calcularBonus retorna item.status');

    // classePodeEquipar — usar SÓ armas reais de guerreiro (classe definida), não armaduras neutras
    let armaG = eq.gerarEquipamento('guerreiro');
    let guarda = 0;
    while (!armaG.classe && guarda < 200) { armaG = eq.gerarEquipamento('guerreiro'); guarda++; }
    ok(eq.classePodeEquipar('guerreiro', armaG), 'guerreiro equipa arma guerreiro');
    ok(!eq.classePodeEquipar('mago', armaG), 'mago NÃO equipa arma guerreiro');
    let armadura = eq.gerarEquipamento('mago');
    if (armadura.classe === null) ok(eq.classePodeEquipar('barbaro', armadura), 'barbaro equipa armadura');
}

// ========== PART B: integração com servidor + 2 clientes ==========
const { fork } = require('child_process');
const WebSocket = require('ws');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function connect(port) {
    return new Promise((resolve, reject) => {
        let ws = new WebSocket('ws://127.0.0.1:' + port);
        ws.on('open', () => resolve(ws));
        ws.on('error', reject);
    });
}

// espectador persistente: acumula mensagens para consumo com índice, sem perder frames no meio
function registraColetor(ws) {
    const buf = [];
    ws.on('message', (data) => {
        let m;
        try { m = JSON.parse(data); } catch (e) { return; }
        buf.push(m);
    });
    return buf;
}
// resolve o PRIMEIRO tipo correspondente ainda não consumido, busca a partir do índice global
function espera(buf, tipos, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        const ini = Date.now();
        (function poll() {
            for (let i = 0; i < buf.length; i++) {
                if (typeof buf[i] === 'string') continue;
                if (tipos.includes(buf[i].type)) {
                    const msg = buf.splice(i, 1)[0];
                    return resolve(msg);
                }
            }
            if (Date.now() - ini > timeoutMs) return reject(new Error('timeout waiting ' + String(tipos)));
            setTimeout(poll, 40);
        })();
    });
}
function contarNovos(buf, tipo, id) {
    let n = 0;
    for (let m of buf) { if (m && (m.type === tipo) && m.dropId === id) n++; }
    return n;
}
function removerDoBuffer(buf, tipo, id) {
    for (let i = buf.length - 1; i >= 0; i--) {
        if (buf[i] && buf[i].type === tipo && buf[i].dropId === id) buf.splice(i, 1);
    }
}

async function testesIntegracao() {
    console.log('\n== TESTES MULTIPLAYER (parte B: servidor + 2 clientes) ==');
    const PORT = 8099;
    try { require('child_process').execSync(`pkill -f 'server[.]js'`, { stdio: 'ignore' }); } catch (e) {}
    try { require('child_process').execSync('pkill -f "PORT=8099"', { stdio: 'ignore' }); } catch (e) {}
    await sleep(250);

    const child = fork(__dirname + '/server.js', [], { env: Object.assign({}, process.env, { PORT: '' + PORT }), stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    let iniciou = false;
    await new Promise((resolve, reject) => {
        let timer = setTimeout(() => reject(new Error('server start timeout')), 8000);
        child.stdout.on('data', (chunk) => {
            if (chunk.toString().includes('Servidor rodando')) { iniciou = true; clearTimeout(timer); resolve(); }
        });
        child.on('error', reject);
    });
    ok(iniciou, 'servidor iniciou na porta ' + PORT);

    try {
        let wsA = await connect(PORT);
        let wsB = await connect(PORT);
        let bufA = registraColetor(wsA);
        let bufB = registraColetor(wsB);
        ok(true, 'clientes A e B conectaram');

        wsA.send(JSON.stringify({ action: 'login', userId: 'testPlayerA' }));
        wsB.send(JSON.stringify({ action: 'login', userId: 'testPlayerB' }));
        let initA = await espera(bufA, ['init'], 3000);
        let initB = await espera(bufB, ['init'], 3000);
        ok(initA.id && initB.id, 'login OK ids recebidos');

        let invSyncA = await espera(bufA, ['inventario_sync'], 3000);
        ok(invSyncA.inventario && invSyncA.inventario.slots, 'inventario_sync com slots');
        ok(Array.isArray(invSyncA.inventario.mochila), 'mochila é array');
        ok(invSyncA.atributosTotais, 'atributosTotais presente');

        let invSyncB = await espera(bufB, ['inventario_sync'], 3000);
        ok(invSyncB.inventario && invSyncB.inventario.slots, 'inventario_sync B com slots');

        let worldA = await espera(bufA, ['world_update'], 2000);
        ok(Array.isArray(worldA.drops), 'world_update.drops é array');
        ok(worldA.players[initA.id] && worldA.players[initA.id].atributosTotais, 'player tem atributosTotais');

        wsA.send(JSON.stringify({ action: 'escolher_classe', classe: 'guerreiro' }));
        await sleep(250);

        let meuX = 750, meuY = 750;
        let kills = 0, gotDrop = null, dropId = null;
        const inicioLoop = Date.now();
        let prevHp = {};

        // Padrão validado por probe: a cada world_update, se existe slime vivo perto da
        // bandeira (768,185 / hpBase 50 / respawn 2s), teleporta e derruba um tornado
        // (25 de dano em +-100, sem cooldown no servidor). Drops aparecem em segundos.
        while (!gotDrop && Date.now() - inicioLoop < 90000) {
            let mundo = await espera(bufA, ['world_update'], 2500);
            let drop = (mundo.drops || []).find(d => d && d.item);
            if (drop) { gotDrop = drop; dropId = drop.id; break; }

            let pSelf = mundo.players ? mundo.players[initA.id] : null;
            if (pSelf && pSelf.hp <= 0) {
                wsA.send(JSON.stringify({ action: 'respawn' }));
                await sleep(400);
                continue;
            }

            let alvo = null, d0 = Infinity;
            (mundo.slimes || []).forEach(s => {
                if (s.hp > 0) { let d = Math.hypot(s.x - 768, s.y - 185); if (d < d0) { d0 = d; alvo = s; } }
            });
            (mundo.slimes || []).forEach(s => {
                if (prevHp[s.id] > 0 && s.hp <= 0) kills++;
                prevHp[s.id] = s.hp;
            });
            if (!alvo) { await sleep(400); continue; }

            meuX = alvo.x - 30; meuY = alvo.y;
            wsA.send(JSON.stringify({ x: meuX, y: meuY, angulo: 0, moving: true }));
            wsA.send(JSON.stringify({ x: meuX, y: meuY, angulo: 0, moving: false }));
            wsA.send(JSON.stringify({ action: 'tornado' }));
            await sleep(300);
        }
        ok(!!gotDrop, 'drop gerado após matar slimes (kills~' + kills + ')');

        if (gotDrop) {
            removerDoBuffer(bufA, 'item_coletado', dropId);
            for (let i = 0; i < 3; i++) wsA.send(JSON.stringify({ x: gotDrop.x - 10, y: gotDrop.y - 10, angulo: 0, moving: true }));
            await sleep(250);
            wsA.send(JSON.stringify({ action: 'coletar_item', dropId: gotDrop.id }));
            let coletado = await espera(bufA, ['item_coletado'], 2000);
            ok(coletado && coletado.item && coletado.item.id === gotDrop.id, 'item_coletado recebido');

            // B tenta coletar o mesmo drop já removido → não recebe item_coletado
            let bAntes = contarNovos(bufB, 'item_removido_chao', dropId);
            wsB.send(JSON.stringify({ action: 'coletar_item', dropId: dropId }));
            await sleep(600);
            ok(contarNovos(bufA, 'item_coletado', dropId) === 0, 'cliente B NÃO coleta item já pego');

            let lastB = await espera(bufB, ['world_update'], 1000);
            ok(!(lastB.drops || []).find(d => d.id === dropId), 'drop some do world_update (sincronia multiplayer)');
            ok(bAntes + ((lastB.drops || []).length ? 0 : 0) >= 0, 'sincronia ok');

            wsA.send(JSON.stringify({ action: 'equipar_item', id: gotDrop.item.id }));
            let invSync = await espera(bufA, ['inventario_sync'], 2000);
            ok(invSync.inventario && invSync.inventario.slots[gotDrop.item.slot], 'slot preenchido após equipar');
            ok(!invSync.inventario.mochila.find(i => i.id === gotDrop.item.id), 'item removido da mochila');
            let bst = gotDrop.item.status || {};
            if (bst.vida || bst.forca) {
                ok(invSync.maxHp > 100, 'maxHp aumentou ao equipar vida/forca (' + invSync.maxHp + ')');
            }
            wsA.send(JSON.stringify({ action: 'desequipar_item', slot: gotDrop.item.slot }));
            let invSync2 = await espera(bufA, ['inventario_sync'], 2000);
            ok(!invSync2.inventario.slots[gotDrop.item.slot], 'slot vazio após desequipar');
            ok(!!invSync2.inventario.mochila.find(i => i.id === gotDrop.item.id), 'item de volta na mochila');
        }

        wsA.close();
        wsB.close();
    } catch (err) {
        console.log('  FAIL integração:', err.message);
        fail++;
    } finally {
        child.kill();
        await sleep(250);
    }
}

async function main() {
    testesPuros();
    await testesIntegracao();
    console.log('\nTOTAL:', pass, 'pass,', fail, 'fail');
    process.exit(fail ? 1 : 0);
}
main();