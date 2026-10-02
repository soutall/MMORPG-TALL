const fs = require('fs');

let file = fs.readFileSync('e:/MMORPG/server.js', 'utf8');

const startMarker = "    // ============ FLORIM: ARMADILHAS, RAÍZES, ANEL E PRAGA ============";
const endMarker = "        florimBroadcastGlobal({type:'action_florim_praga_hit',id:z.id,x:z.x,y:z.y,raio:z.raio}); florimDebuffs.splice(i,1);\n    }";

const startIndex = file.indexOf(startMarker);
const endIndex = file.indexOf(endMarker) + endMarker.length;

if (startIndex === -1 || endIndex < startIndex) {
    console.error("Markers not found");
    process.exit(1);
}

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
                    if (ehAliado) { p.mana = Math.min((p.mana || 0) + 8, p.maxMp || 100); wss.clients.forEach(c => { if(c._playerId === pid && c.readyState === 1) c.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp })); }); }
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
                    wss.clients.forEach(c => { if(c._playerId === pid && c.readyState === 1) c.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp })); });
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

file = file.substring(0, startIndex) + tickNew + file.substring(endIndex);
fs.writeFileSync('e:/MMORPG/server.js', file, 'utf8');
console.log('Tick loop patch applied!');
