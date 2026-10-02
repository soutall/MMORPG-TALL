const fs = require('fs');

let file = fs.readFileSync('e:/MMORPG/server.js', 'utf8');

// 1. Linhas 574-577: Declaração das coleções
file = file.replace(
`let florimSementes = colecaoCombate('florimSementes');
let florimCorrentes = colecaoCombate('florimCorrentes');
let florimAneis = colecaoCombate('florimAneis');
let florimDebuffs = colecaoCombate('florimDebuffs');`,
`let florimSementes = colecaoCombate('florimSementes');
let florimArvores = colecaoCombate('florimArvores');
let florimEspinhos = colecaoCombate('florimEspinhos');
let florimParedes = colecaoCombate('florimParedes');`);

// 2. Linha 510:
file = file.replace(
`        florimSementes, florimCorrentes, florimAneis, florimDebuffs,`,
`        florimSementes, florimArvores, florimEspinhos, florimParedes,`);

// 3. Linhas 2549-2552: Limpeza
file = file.replace(
`    florimSementes = florimSementes.filter(function (z) { return z.instanciaId !== instanciaId; });
    florimCorrentes = florimCorrentes.filter(function (z) { return z.instanciaId !== instanciaId; });
    florimAneis = florimAneis.filter(function (z) { return z.instanciaId !== instanciaId; });
    florimDebuffs = florimDebuffs.filter(function (z) { return z.instanciaId !== instanciaId; });`,
`    florimSementes = florimSementes.filter(function (z) { return z.instanciaId !== instanciaId; });
    florimArvores = florimArvores.filter(function (z) { return z.instanciaId !== instanciaId; });
    florimEspinhos = florimEspinhos.filter(function (z) { return z.instanciaId !== instanciaId; });
    florimParedes = florimParedes.filter(function (z) { return z.instanciaId !== instanciaId; });`);

// 4. Linhas 2585 and 2600 (Instance arrays)
file = file.replace(
`        florimSementes, florimCorrentes, florimAneis, florimDebuffs,`,
`        florimSementes, florimArvores, florimEspinhos, florimParedes,`);

file = file.replace(
`    const listas = [playerProjeteis, dropsChao, gasesVeneno, florimSementes, florimCorrentes, florimAneis, florimDebuffs];`,
`    const listas = [playerProjeteis, dropsChao, gasesVeneno, florimSementes, florimArvores, florimEspinhos, florimParedes];`);

// 5. Tick Loop
const tickOld = `    // ============ FLORIM: ARMADILHAS, RAÍZES, ANEL E PRAGA ============
    for (let i = florimSementes.length - 1; i >= 0; i--) {
        const z = florimSementes[i]; z.tempo--;
        if (z.tempo <= 0 || z.ativada) { if (z.tempo <= 0) florimBroadcastGlobal({ type: 'action_florim_semente_fim', id: z.id, x: z.x, y: z.y }); florimSementes.splice(i, 1); continue; }
        let ativou = false, aliado = false, alvoId = null;
        for (let pid in players) {
            const p = players[pid]; if (!p || p.hp <= 0) continue;
            if (entidadeEhSolari(p) !== !!z.solari) continue;
            if (!z.solari && mapaPorCoordenada(p.x + PLAYER_OFFSET_X) !== z.mapa) continue;
            if (Math.hypot((p.x + PLAYER_OFFSET_X) - z.x, (p.y + PLAYER_OFFSET_Y) - z.y) > z.raio) continue;
            aliado = pid === z.ownerId || (players[z.ownerId] && players[z.ownerId].partyId && p.partyId === players[z.ownerId].partyId);
            if (!aliado && !pvpPodeAtacar(z.ownerId, pid)) continue;
            ativou = true; alvoId = pid; break;
        }
        if (!ativou) {
            for (const m of slimes) { if (!m || m.hp <= 0 || entidadeEhSolari(m) !== !!z.solari || (!z.solari && mapaPorCoordenada(m.x) !== z.mapa)) continue; if (Math.hypot(m.x-z.x,m.y-z.y) <= z.raio) { ativou=true; alvoId=m.id; aliado=false; break; } }
        }
        if (!ativou) {
            for (const b of bosses) { if (!b || b.hp <= 0 || entidadeEhSolari(b) !== !!z.solari || (!z.solari && mapaPorCoordenada(b.x) !== z.mapa)) continue; if (Math.hypot(b.x-z.x,b.y-z.y) <= z.raio) { ativou=true; alvoId=b.id; aliado=false; break; } }
        }
        if (ativou) {
            z.ativada = true;
            if (players[alvoId]) { if (aliado) aplicarCuraAoJogador(alvoId, z.curaBase); else aplicarDanoPvP(z.ownerId, alvoId, z.danoBase, 'natureza'); sincronizarEfeitos(alvoId, players[alvoId]); }
            else { const m=slimes.find(q=>q && q.id===alvoId); const b=bosses.find(q=>q && q.id===alvoId); if(m) registrarDanoMonstro(m,z.ownerId,z.danoBase,'player'); else if(b) registrarDanoBoss(b,z.ownerId,z.danoBase,'skill','player'); }
            florimBroadcastGlobal({ type:'action_florim_semente_ativada', id:z.id, x:z.x, y:z.y, aliado:aliado });
            florimSementes.splice(i,1);
        }
    }

    for (let i = florimCorrentes.length - 1; i >= 0; i--) {
        const z = florimCorrentes[i]; z.tempo--; if (z.tempo <= 0) { florimBroadcastGlobal({type:'action_florim_corrente_fim',id:z.id,x:z.alvoX,y:z.alvoY}); florimCorrentes.splice(i,1); }
    }

    for (let i = florimAneis.length - 1; i >= 0; i--) {
        const z = florimAneis[i]; z.tempo--;
        if (z.tempo <= 0) { florimBroadcastGlobal({type:'action_florim_anel_fim',id:z.id,x:z.x,y:z.y}); florimAneis.splice(i,1); continue; }
        if (z.tempo % 10 !== 0) continue;
        for (const m of slimes) {
            if (!m || m.hp<=0 || entidadeEhSolari(m)!==!!z.solari || (!z.solari && mapaPorCoordenada(m.x)!==z.mapa)) continue;
            if (Math.hypot(m.x-z.x,m.y-z.y)<=z.raio) { m.isPreso=Math.max(m.isPreso||0,Date.now()+650); efeitos.aplicarEfeito(m,'paralisia',14,1); efeitos.aplicarEfeito(m,'veneno',20,Math.max(4,Math.round(z.danoBase*0.55))); registrarDanoMonstro(m,z.ownerId,z.danoBase,'dot'); }
        }
        for (const b of bosses) {
            if (!b || b.hp<=0 || entidadeEhSolari(b)!==!!z.solari || (!z.solari && mapaPorCoordenada(b.x)!==z.mapa)) continue;
            if (Math.hypot(b.x-z.x,b.y-z.y)<=z.raio) { b.isPreso=Math.max(b.isPreso||0,Date.now()+650); efeitos.aplicarEfeito(b,'paralisia',14,1); efeitos.aplicarEfeito(b,'veneno',20,Math.max(4,Math.round(z.danoBase*0.55))); registrarDanoBoss(b,z.ownerId,z.danoBase,'skill','dot'); }
        }
        for (let pid in players) { const q=players[pid]; if(!q||q.hp<=0||entidadeEhSolari(q)!==!!z.solari||(!z.solari&&mapaPorCoordenada(q.x+12)!==z.mapa)) continue; if(Math.hypot(q.x+12-z.x,q.y+16-z.y)<=z.raio && pid!==z.ownerId && pvpPodeAtacar(z.ownerId,pid)){ efeitos.aplicarEfeito(q,'paralisia',14,1); efeitos.aplicarEfeito(q,'veneno',20,Math.max(4,Math.round(z.danoBase*0.55))); aplicarDanoPvP(z.ownerId,pid,z.danoBase,'natureza'); sincronizarEfeitos(pid,q); } }
        florimBroadcastGlobal({type:'action_florim_anel_pulso',id:z.id,x:z.x,y:z.y});
    }

    for (let i = florimDebuffs.length - 1; i >= 0; i--) {
        const z=florimDebuffs[i]; z.tempo--; if(z.tempo>0) continue;
        for(const m of slimes){if(!m||m.hp<=0||entidadeEhSolari(m)!==!!z.solari||(!z.solari&&mapaPorCoordenada(m.x)!==z.mapa))continue;if(Math.hypot(m.x-z.x,m.y-z.y)<=z.raio){efeitos.aplicarEfeito(m,'reducaoDef',200,.25);efeitos.aplicarEfeito(m,'reducaoAtk',200,.25);efeitos.aplicarEfeito(m,'lentidao',200,.5);efeitos.aplicarEfeito(m,'cortaCura',200,.20);m.slowTimer=Math.max(m.slowTimer||0,200);}}
        for(const b of bosses){if(!b||b.hp<=0||entidadeEhSolari(b)!==!!z.solari||(!z.solari&&mapaPorCoordenada(b.x)!==z.mapa))continue;if(Math.hypot(b.x-z.x,b.y-z.y)<=z.raio){efeitos.aplicarEfeito(b,'reducaoDef',200,.25);efeitos.aplicarEfeito(b,'reducaoAtk',200,.25);efeitos.aplicarEfeito(b,'lentidao',200,.5);efeitos.aplicarEfeito(b,'cortaCura',200,.20);b.slowTimer=Math.max(b.slowTimer||0,200);}}
        for(let pid in players){const q=players[pid];if(!q||q.hp<=0||pid===z.ownerId||entidadeEhSolari(q)!==!!z.solari||(!z.solari&&mapaPorCoordenada(q.x+12)!==z.mapa))continue;if(Math.hypot(q.x+12-z.x,q.y+16-z.y)<=z.raio&&pvpPodeAtacar(z.ownerId,pid)){efeitos.aplicarEfeito(q,'reducaoDef',200,.25);efeitos.aplicarEfeito(q,'reducaoAtk',200,.25);efeitos.aplicarEfeito(q,'lentidao',200,.5);efeitos.aplicarEfeito(q,'cortaCura',200,.20);sincronizarEfeitos(pid,q);}}
        florimBroadcastGlobal({type:'action_florim_praga_hit',id:z.id,x:z.x,y:z.y,raio:z.raio}); florimDebuffs.splice(i,1);
    }`;

const tickNew = `    // ============ FLORIM: ARVORES, SEMENTES, ESPINHOS, PAREDES E PASSIVA ============
    for (let i = florimArvores.length - 1; i >= 0; i--) {
        const z = florimArvores[i]; z.tempo--;
        if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_arvore_fim', id: z.id, x: z.x, y: z.y }); florimArvores.splice(i, 1); continue; }
        if (z.tempo % 20 === 0) {
            for (let pid in players) {
                const p = players[pid]; if (!p || p.hp <= 0) continue;
                if (entidadeEhSolari(p) !== !!z.solari) continue;
                if (!z.solari && mapaPorCoordenada(p.x + PLAYER_OFFSET_X) !== z.mapa) continue;
                if (Math.hypot((p.x + PLAYER_OFFSET_X) - z.x, (p.y + PLAYER_OFFSET_Y) - z.y) > 100) continue;
                const ehAliado = pid === z.ownerId || (players[z.ownerId] && players[z.ownerId].partyId && p.partyId === players[z.ownerId].partyId);
                if (ehAliado) { aplicarCuraAoJogador(pid, z.curaBase || 30); }
            }
            florimBroadcastGlobal({ type: 'action_florim_arvore_cura', id: z.id, x: z.x, y: z.y });
        }
    }

    for (let i = florimSementes.length - 1; i >= 0; i--) {
        const z = florimSementes[i]; z.tempo--;
        if (z.estado === 'carnivora') {
            if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_semente_fim', id: z.id, x: z.x, y: z.y }); florimSementes.splice(i, 1); continue; }
            if (z.tempo % 20 === 0) {
                for (const m of slimes) { if (!m || m.hp<=0 || entidadeEhSolari(m)!==!!z.solari || (!z.solari && mapaPorCoordenada(m.x)!==z.mapa)) continue; if (Math.hypot(m.x-z.x,m.y-z.y)<=60) registrarDanoMonstro(m, z.ownerId, 25, 'skill'); }
                for (const b of bosses) { if (!b || b.hp<=0 || entidadeEhSolari(b)!==!!z.solari || (!z.solari && mapaPorCoordenada(b.x)!==z.mapa)) continue; if (Math.hypot(b.x-z.x,b.y-z.y)<=60) registrarDanoBoss(b, z.ownerId, 25, 'skill', 'skill'); }
                for (let pid in players) { const q = players[pid]; if (!q || q.hp<=0 || entidadeEhSolari(q)!==!!z.solari || (!z.solari && mapaPorCoordenada(q.x+PLAYER_OFFSET_X)!==z.mapa)) continue; if (Math.hypot((q.x+PLAYER_OFFSET_X)-z.x,(q.y+PLAYER_OFFSET_Y)-z.y)<=60 && pid!==z.ownerId && pvpPodeAtacar(z.ownerId, pid)) { aplicarDanoPvP(z.ownerId, pid, 25, 'natureza'); sincronizarEfeitos(pid, q); } }
            }
            continue;
        }
        if (z.estado === 'rosa') {
            if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_semente_fim', id: z.id, x: z.x, y: z.y }); florimSementes.splice(i, 1); continue; }
            if (z.tempo % 20 === 0) {
                for (let pid in players) {
                    const p = players[pid]; if (!p || p.hp <= 0) continue;
                    if (entidadeEhSolari(p) !== !!z.solari) continue;
                    if (!z.solari && mapaPorCoordenada(p.x + PLAYER_OFFSET_X) !== z.mapa) continue;
                    if (Math.hypot((p.x + PLAYER_OFFSET_X) - z.x, (p.y + PLAYER_OFFSET_Y) - z.y) > 60) continue;
                    const ehAliado = pid === z.ownerId || (players[z.ownerId] && players[z.ownerId].partyId && p.partyId === players[z.ownerId].partyId);
                    if (ehAliado) { p.mana = Math.min((p.mana || 0) + 8, p.maxMp || 100); wss.clients.forEach(c => { if(c._playerId === pid && c.readyState === 1 /* WebSocket.OPEN */) c.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp })); }); }
                }
            }
            continue;
        }
        if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_semente_fim', id: z.id, x: z.x, y: z.y }); florimSementes.splice(i, 1); continue; }
        
        let ativou = false, aliado = false, alvoId = null;
        for (let pid in players) {
            const p = players[pid]; if (!p || p.hp <= 0) continue;
            if (entidadeEhSolari(p) !== !!z.solari) continue;
            if (!z.solari && mapaPorCoordenada(p.x + PLAYER_OFFSET_X) !== z.mapa) continue;
            if (Math.hypot((p.x + PLAYER_OFFSET_X) - z.x, (p.y + PLAYER_OFFSET_Y) - z.y) > z.raio) continue;
            aliado = pid === z.ownerId || (players[z.ownerId] && players[z.ownerId].partyId && p.partyId === players[z.ownerId].partyId);
            if (!aliado && !pvpPodeAtacar(z.ownerId, pid)) continue;
            ativou = true; alvoId = pid; break;
        }
        if (!ativou) {
            for (const m of slimes) { if (!m || m.hp <= 0 || entidadeEhSolari(m) !== !!z.solari || (!z.solari && mapaPorCoordenada(m.x) !== z.mapa)) continue; if (Math.hypot(m.x-z.x,m.y-z.y) <= z.raio) { ativou=true; alvoId=m.id; aliado=false; break; } }
        }
        if (!ativou) {
            for (const b of bosses) { if (!b || b.hp <= 0 || entidadeEhSolari(b) !== !!z.solari || (!z.solari && mapaPorCoordenada(b.x) !== z.mapa)) continue; if (Math.hypot(b.x-z.x,b.y-z.y) <= z.raio) { ativou=true; alvoId=b.id; aliado=false; break; } }
        }
        if (ativou) {
            if (aliado) { z.estado = 'rosa'; z.tempo = 80; florimBroadcastGlobal({ type:'action_florim_semente_ativada', id:z.id, x:z.x, y:z.y, tipo:'rosa' }); }
            else { z.estado = 'carnivora'; z.tempo = 100; florimBroadcastGlobal({ type:'action_florim_semente_ativada', id:z.id, x:z.x, y:z.y, tipo:'carnivora' }); }
        }
    }

    for (let i = florimEspinhos.length - 1; i >= 0; i--) {
        const z = florimEspinhos[i]; z.tempo--;
        if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_espinhos_fim', id: z.id, x: z.x, y: z.y }); florimEspinhos.splice(i, 1); continue; }
        for (const m of slimes) { if (!m || m.hp<=0 || entidadeEhSolari(m)!==!!z.solari || (!z.solari && mapaPorCoordenada(m.x)!==z.mapa)) continue; if (Math.hypot(m.x-z.x,m.y-z.y)<=z.raio) { efeitos.aplicarEfeito(m,'reducaoDef',20,.20); efeitos.aplicarEfeito(m,'reducaoAtk',20,.20); } }
        for (const b of bosses) { if (!b || b.hp<=0 || entidadeEhSolari(b)!==!!z.solari || (!z.solari && mapaPorCoordenada(b.x)!==z.mapa)) continue; if (Math.hypot(b.x-z.x,b.y-z.y)<=z.raio) { efeitos.aplicarEfeito(b,'reducaoDef',20,.20); efeitos.aplicarEfeito(b,'reducaoAtk',20,.20); } }
        for (let pid in players) { const q = players[pid]; if (!q || q.hp<=0 || entidadeEhSolari(q)!==!!z.solari || (!z.solari && mapaPorCoordenada(q.x+PLAYER_OFFSET_X)!==z.mapa)) continue; if (Math.hypot((q.x+PLAYER_OFFSET_X)-z.x,(q.y+PLAYER_OFFSET_Y)-z.y)<=z.raio && pid!==z.ownerId && pvpPodeAtacar(z.ownerId, pid)) { efeitos.aplicarEfeito(q,'reducaoDef',20,.20); efeitos.aplicarEfeito(q,'reducaoAtk',20,.20); sincronizarEfeitos(pid, q); } }
    }

    for (let i = florimParedes.length - 1; i >= 0; i--) {
        const z = florimParedes[i]; z.tempo--;
        if (z.tempo <= 0) { florimBroadcastGlobal({ type: 'action_florim_parede_fim', id: z.id, x: z.x, y: z.y }); florimParedes.splice(i, 1); continue; }
        if (z.tempo % 10 === 0) {
            for (const m of slimes) { if (!m || m.hp<=0 || entidadeEhSolari(m)!==!!z.solari || (!z.solari && mapaPorCoordenada(m.x)!==z.mapa)) continue; if (Math.hypot(m.x-z.x,m.y-z.y)<=z.raio) { m.isPreso=Math.max(m.isPreso||0,Date.now()+250); efeitos.aplicarEfeito(m,'paralisia',5,1); } }
            for (const b of bosses) { if (!b || b.hp<=0 || entidadeEhSolari(b)!==!!z.solari || (!z.solari && mapaPorCoordenada(b.x)!==z.mapa)) continue; if (Math.hypot(b.x-z.x,b.y-z.y)<=z.raio) { b.isPreso=Math.max(b.isPreso||0,Date.now()+250); efeitos.aplicarEfeito(b,'paralisia',5,1); } }
            for (let pid in players) { const q = players[pid]; if (!q || q.hp<=0 || entidadeEhSolari(q)!==!!z.solari || (!z.solari && mapaPorCoordenada(q.x+PLAYER_OFFSET_X)!==z.mapa)) continue; if (Math.hypot((q.x+PLAYER_OFFSET_X)-z.x,(q.y+PLAYER_OFFSET_Y)-z.y)<=z.raio && pid!==z.ownerId && pvpPodeAtacar(z.ownerId, pid)) { q.isPreso=Math.max(q.isPreso||0,Date.now()+250); efeitos.aplicarEfeito(q,'paralisia',5,1); sincronizarEfeitos(pid, q); } }
        }
    }

    global.florimPassivaTick = ((global.florimPassivaTick || 0) + 1);
    if (global.florimPassivaTick % 40 === 0) {
        for (let fid in players) {
            const f = players[fid];
            if (!f || f.hp <= 0 || f.classe !== 'florim') continue;
            for (let pid in players) {
                const p = players[pid]; if (!p || p.hp <= 0) continue;
                if (entidadeEhSolari(p) !== entidadeEhSolari(f)) continue;
                if (!entidadeEhSolari(f) && mapaPorCoordenada(p.x + PLAYER_OFFSET_X) !== mapaPorCoordenada(f.x + PLAYER_OFFSET_X)) continue;
                if (Math.hypot((p.x + PLAYER_OFFSET_X) - (f.x + PLAYER_OFFSET_X), (p.y + PLAYER_OFFSET_Y) - (f.y + PLAYER_OFFSET_Y)) > 120) continue;
                const ehAliado = pid === fid || (f.partyId && p.partyId === f.partyId);
                if (ehAliado) { 
                    p.mana = Math.min((p.mana || 0) + 5, p.maxMp || 100); 
                    wss.clients.forEach(c => { if(c._playerId === pid && c.readyState === 1 /* WebSocket.OPEN */) c.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp })); });
                } else if (pvpPodeAtacar(fid, pid)) {
                    efeitos.aplicarEfeito(p, 'sangramento', 60, 2); 
                    sincronizarEfeitos(pid, p);
                }
            }
            for (const m of slimes) {
                if (!m || m.hp <= 0 || entidadeEhSolari(m) !== entidadeEhSolari(f) || (!entidadeEhSolari(f) && mapaPorCoordenada(m.x) !== mapaPorCoordenada(f.x + PLAYER_OFFSET_X))) continue;
                if (Math.hypot(m.x - (f.x + PLAYER_OFFSET_X), m.y - (f.y + PLAYER_OFFSET_Y)) <= 120) efeitos.aplicarEfeito(m, 'sangramento', 60, 2);
            }
            for (const b of bosses) {
                if (!b || b.hp <= 0 || entidadeEhSolari(b) !== entidadeEhSolari(f) || (!entidadeEhSolari(f) && mapaPorCoordenada(b.x) !== mapaPorCoordenada(f.x + PLAYER_OFFSET_X))) continue;
                if (Math.hypot(b.x - (f.x + PLAYER_OFFSET_X), b.y - (f.y + PLAYER_OFFSET_Y)) <= 120) efeitos.aplicarEfeito(b, 'sangramento', 60, 2);
            }
        }
    }`;
file = file.replace(tickOld, tickNew);

// 6. Broadcast
file = file.replace(
`            florimSementes: filtrarPorMapa(florimSementes, mapaCliente, instanciaCliente),
            florimCorrentes: filtrarPorMapa(florimCorrentes, mapaCliente, instanciaCliente),
            florimAneis: filtrarPorMapa(florimAneis, mapaCliente, instanciaCliente),
            florimDebuffs: filtrarPorMapa(florimDebuffs, mapaCliente, instanciaCliente),`,
`            florimSementes: filtrarPorMapa(florimSementes, mapaCliente, instanciaCliente),
            florimArvores: filtrarPorMapa(florimArvores, mapaCliente, instanciaCliente),
            florimEspinhos: filtrarPorMapa(florimEspinhos, mapaCliente, instanciaCliente),
            florimParedes: filtrarPorMapa(florimParedes, mapaCliente, instanciaCliente),`);

// 7. Cheats
file = file.replace(
`                        pAc.lastFlorimSemente = 0; pAc.lastFlorimCorrente = 0; pAc.lastFlorimAnel = 0; pAc.lastFlorimPraga = 0;`,
`                        pAc.lastFlorimSemente = 0; pAc.lastFlorimArvore = 0; pAc.lastFlorimEspinhos = 0; pAc.lastFlorimParede = 0;`);

// 8. CC Block
file = file.replace(
`                    'ataque_pikeman', 'pikeman_giro', 'pikeman_pirueta', 'pikeman_geada', 'pikeman_execucao', 'ataque_florim', 'florim_semente', 'florim_corrente', 'florim_anel', 'florim_praga',`,
`                    'ataque_pikeman', 'pikeman_giro', 'pikeman_pirueta', 'pikeman_geada', 'pikeman_execucao', 'ataque_florim', 'florim_arvore', 'florim_semente', 'florim_espinhos', 'florim_parede',`);

// 9. Handlers
const handlersOld = `                // ===== FLORIM: ATAQUE BÁSICO E 4 SKILLS =====
                function florimPos(p) { return { x: p.x + PLAYER_OFFSET_X, y: p.y + PLAYER_OFFSET_Y }; }
                function florimMesmoEspaco(a, b) {
                    if (!a || !b) return false;
                    if (entidadeEhSolari(a) !== entidadeEhSolari(b)) return false;
                    if (entidadeEhSolari(a)) return true;
                    return mapaPorCoordenada(a.x) === mapaPorCoordenada(b.x);
                }
                function florimDistPonto(p, x, y) { const q = florimPos(p); return Math.hypot(q.x - x, q.y - y); }
                function florimId(prefixo) { return prefixo + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6); }
                function florimBroadcast(msg, origem) {
                    wss.clients.forEach(client => {
                        if (client.readyState !== WebSocket.OPEN) return;
                        if (!origem || !client._playerId || !players[client._playerId] || florimMesmoEspaco(players[client._playerId], origem)) client.send(JSON.stringify(msg));
                    });
                }
                function florimAlvoValido(atkId, alvoTipo, alvoId, alcance) {
                    const p = players[atkId];
                    const alvo = obterAlvoAtaqueServidor(alvoTipo, alvoId);
                    if (!p || !alvo || p.hp <= 0 || alvo.hp <= 0 || !florimMesmoEspaco(p, alvo)) return null;
                    if (alvoTipo === 'player' && !pvpPodeAtacar(atkId, alvoId)) return null;
                    const pp = florimPos(p);
                    if (Math.hypot(alvo.x - pp.x, alvo.y - pp.y) > alcance) return null;
                    return alvo;
                }

                if (data.action === 'ataque_florim') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimBasic', 550, 'ataque_florim')) return;
                    marcarSkillUsada(p, 'lastFlorimBasic');
                    let alvo = validarAtaqueBasicoAlvo(playerId, p, data.alvoTipo, data.alvoId);
                    if (alvo) {
                        const dano = dmgSkill(p, 'semente', 12);
                        if (data.alvoTipo === 'player') aplicarDanoPvP(playerId, data.alvoId, dano, 'natureza');
                        else if (data.alvoTipo === 'boss') registrarDanoBoss(alvo, playerId, dano, 'basico', 'player');
                        else registrarDanoMonstro(alvo, playerId, dano, 'player');
                    }
                    florimBroadcast({ type: 'action_florim_basic', id: playerId, x: p.x + PLAYER_OFFSET_X, y: p.y + PLAYER_OFFSET_Y, angulo: Number(data.angulo) || p.angulo }, p);
                    return;
                }

                if (data.action === 'florim_semente') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimSemente', 5500, 'florim_semente')) return;
                    const custo = mpSkill(p, 'semente', 18); if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 300) { avisaForaAlcance(ws, 'florim_semente'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimSemente');
                    const z = { id: florimId('seed'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 34, tempo: 140, danoBase: dmgSkill(p, 'semente', 28), curaBase: dmgSkill(p, 'semente', 35), mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p), ativada: false };
                    florimSementes.push(z);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    florimBroadcast({ type: 'action_florim_semente', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 7000 }, p);
                    return;
                }

                if (data.action === 'florim_corrente') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimCorrente', 8500, 'florim_corrente')) return;
                    const custo = mpSkill(p, 'corrente_raizes', 22); if ((p.mana || 0) < custo) return;
                    const alvo = florimAlvoValido(playerId, data.alvoTipo, data.alvoId, 300); if (!alvo) { ws.send(JSON.stringify({type:'skill_aviso',skill:'florim_corrente',motivo:'alvo_invalido'})); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimCorrente');
                    const pp = florimPos(p); const z = { id: florimId('root'), ownerId: playerId, alvoTipo: data.alvoTipo, alvoId: data.alvoId, x: pp.x, y: pp.y, alvoX: alvo.x, alvoY: alvo.y, tempo: 60, mapa: mapaPorCoordenada(pp.x), danoBase: dmgSkill(p, 'corrente_raizes', 18) };
                    florimCorrentes.push(z);
                    efeitos.aplicarEfeito(alvo, 'paralisia', 60, 1);
                    alvo.isPreso = Math.max(alvo.isPreso || 0, Date.now() + 3000); alvo.stunTimer = Math.max(alvo.stunTimer || 0, 60);
                    if (data.alvoTipo === 'player') sincronizarEfeitos(data.alvoId, alvo);
                    florimBroadcast({ type: 'action_florim_corrente', id: z.id, x: z.x, y: z.y, alvoX: alvo.x, alvoY: alvo.y, durMs: 3000 }, p);
                    if (data.alvoTipo === 'player') aplicarDanoPvP(playerId, data.alvoId, z.danoBase, 'natureza'); else if (data.alvoTipo === 'boss') registrarDanoBoss(alvo, playerId, z.danoBase, 'skill', 'player'); else registrarDanoMonstro(alvo, playerId, z.danoBase, 'player');
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    return;
                }

                if (data.action === 'florim_anel') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimAnel', 13500, 'florim_anel')) return;
                    const custo = mpSkill(p, 'anel_espinhos', 30); if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 320) { avisaForaAlcance(ws, 'florim_anel'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimAnel');
                    const z = { id: florimId('ring'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 85, tempo: 100, mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p), danoBase: dmgSkill(p, 'anel_espinhos', 16) };
                    florimAneis.push(z); florimBroadcast({ type: 'action_florim_anel', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 5000 }, p);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    return;
                }

                if (data.action === 'florim_praga') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimPraga', 15500, 'florim_praga')) return;
                    const custo = mpSkill(p, 'praga_natural', 28); if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 320) { avisaForaAlcance(ws, 'florim_praga'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimPraga');
                    const z = { id: florimId('debuff'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 170, tempo: 20, mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p) };
                    florimDebuffs.push(z);
                    florimBroadcast({ type: 'action_florim_praga', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 10000 }, p);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    return;
                }`;

const handlersNew = `                // ===== FLORIM: ATAQUE BÁSICO E 4 SKILLS =====
                function florimPos(p) { return { x: p.x + PLAYER_OFFSET_X, y: p.y + PLAYER_OFFSET_Y }; }
                function florimMesmoEspaco(a, b) {
                    if (!a || !b) return false;
                    if (entidadeEhSolari(a) !== entidadeEhSolari(b)) return false;
                    if (entidadeEhSolari(a)) return true;
                    return mapaPorCoordenada(a.x) === mapaPorCoordenada(b.x);
                }
                function florimDistPonto(p, x, y) { const q = florimPos(p); return Math.hypot(q.x - x, q.y - y); }
                function florimId(prefixo) { return prefixo + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6); }
                function florimBroadcast(msg, origem) {
                    wss.clients.forEach(client => {
                        if (client.readyState !== WebSocket.OPEN) return;
                        if (!origem || !client._playerId || !players[client._playerId] || florimMesmoEspaco(players[client._playerId], origem)) client.send(JSON.stringify(msg));
                    });
                }
                function florimAlvoValido(atkId, alvoTipo, alvoId, alcance) {
                    const p = players[atkId];
                    const alvo = obterAlvoAtaqueServidor(alvoTipo, alvoId);
                    if (!p || !alvo || p.hp <= 0 || alvo.hp <= 0 || !florimMesmoEspaco(p, alvo)) return null;
                    if (alvoTipo === 'player' && !pvpPodeAtacar(atkId, alvoId)) return null;
                    const pp = florimPos(p);
                    if (Math.hypot(alvo.x - pp.x, alvo.y - pp.y) > alcance) return null;
                    return alvo;
                }

                if (data.action === 'ataque_florim') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimBasic', 550, 'ataque_florim')) return;
                    marcarSkillUsada(p, 'lastFlorimBasic');
                    let alvo = validarAtaqueBasicoAlvo(playerId, p, data.alvoTipo, data.alvoId);
                    if (alvo) {
                        const dano = 12;
                        if (data.alvoTipo === 'player') aplicarDanoPvP(playerId, data.alvoId, dano, 'natureza');
                        else if (data.alvoTipo === 'boss') registrarDanoBoss(alvo, playerId, dano, 'basico', 'player');
                        else registrarDanoMonstro(alvo, playerId, dano, 'player');
                    }
                    florimBroadcast({ type: 'action_florim_basic', id: playerId, x: p.x + PLAYER_OFFSET_X, y: p.y + PLAYER_OFFSET_Y, angulo: Number(data.angulo) || p.angulo }, p);
                    return;
                }

                if (data.action === 'florim_arvore') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimArvore', 15000, 'florim_arvore')) return;
                    const custo = mpSkill(p, 'arvore', 25); if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 300) { avisaForaAlcance(ws, 'florim_arvore'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimArvore');
                    const z = { id: florimId('tree'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 100, tempo: 160, curaBase: 30, mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p) };
                    florimArvores.push(z);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    florimBroadcast({ type: 'action_florim_arvore', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 8000 }, p);
                    return;
                }

                if (data.action === 'florim_semente') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimSemente', 10000, 'florim_semente')) return;
                    const custo = mpSkill(p, 'semente', 18); if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 300) { avisaForaAlcance(ws, 'florim_semente'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimSemente');
                    const z = { id: florimId('seed'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 40, tempo: 400, estado: 'espera', mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p) };
                    florimSementes.push(z);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    florimBroadcast({ type: 'action_florim_semente', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 20000 }, p);
                    return;
                }

                if (data.action === 'florim_espinhos') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimEspinhos', 13000, 'florim_espinhos')) return;
                    const custo = mpSkill(p, 'espinhos', 22); if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 300) { avisaForaAlcance(ws, 'florim_espinhos'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimEspinhos');
                    const z = { id: florimId('thorns'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 120, tempo: 100, mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p) };
                    florimEspinhos.push(z);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    florimBroadcast({ type: 'action_florim_espinhos', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 5000 }, p);
                    return;
                }

                if (data.action === 'florim_parede') {
                    const p = players[playerId]; if (!p || p.classe !== 'florim') return;
                    if (!cdSkillExpirado(ws, p, 'lastFlorimParede', 10000, 'florim_parede')) return;
                    const custo = mpSkill(p, 'parede', 20); if ((p.mana || 0) < custo) return;
                    const pp = florimPos(p); const tx = Number(data.targetX), ty = Number(data.targetY);
                    if (!Number.isFinite(tx) || !Number.isFinite(ty) || Math.hypot(tx - pp.x, ty - pp.y) > 250) { avisaForaAlcance(ws, 'florim_parede'); return; }
                    p.mana -= custo; marcarSkillUsada(p, 'lastFlorimParede');
                    const z = { id: florimId('wall'), ownerId: playerId, x: Math.round(tx), y: Math.round(ty), raio: 80, tempo: 80, mapa: mapaPorCoordenada(pp.x), solari: entidadeEhSolari(p) };
                    florimParedes.push(z);
                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));
                    florimBroadcast({ type: 'action_florim_parede', id: z.id, x: z.x, y: z.y, raio: z.raio, durMs: 4000 }, p);
                    return;
                }`;
file = file.replace(handlersOld, handlersNew);

fs.writeFileSync('e:/MMORPG/server.js', file, 'utf8');
console.log('Patch aplicado!');
