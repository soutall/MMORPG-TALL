const fs = require('fs');

let file = fs.readFileSync('e:/MMORPG/server.js', 'utf8');

const startMarker = "                // ===== FLORIM: ATAQUE BÁSICO E 4 SKILLS =====";
const endMarker = "                    ws.send(JSON.stringify({ type: 'mp_sync', mp: Math.round(p.mana), maxMp: p.maxMp }));\n                    return;\n                }";

const startIndex = file.indexOf(startMarker);
// we want the LAST occurrence of the endMarker before curandeiro_cantico, or rather just the first one after florim_praga
const pragaIndex = file.indexOf("data.action === 'florim_praga'");
const endIndex = file.indexOf(endMarker, pragaIndex) + endMarker.length;

if (startIndex === -1 || endIndex < startIndex || pragaIndex === -1) {
    console.error("Markers not found");
    process.exit(1);
}

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

file = file.substring(0, startIndex) + handlersNew + file.substring(endIndex);
fs.writeFileSync('e:/MMORPG/server.js', file, 'utf8');
console.log('Handlers patch applied!');
