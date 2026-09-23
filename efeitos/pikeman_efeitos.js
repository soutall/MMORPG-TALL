/* ============================================================
   efeitos/pikeman_efeitos.js — VFX do PIKEMAN
   Giro da Foice · Pirueta da Morte · Geada da Morte ·
   Execução da Morte · Instinto da Morte (gelo nos inimigos)
   ============================================================ */
(function () {
    window.girosPikeman = window.girosPikeman || [];
    window.piruetasPikeman = window.piruetasPikeman || [];
    window.geadasPikeman = window.geadasPikeman || [];
    window.execucoesPikeman = window.execucoesPikeman || [];
    window.impactosPikeman = window.impactosPikeman || [];
    window.flashesPikeman = window.flashesPikeman || [];
    window.pikemanFrost = window.pikemanFrost || [];

    function _agora() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
    // Flash pequeno reutilizável (usado por handlers externos — tempo correto interno)
    window.criarFlashPikeman = function (x, y, cor, raio) {
        window.flashesPikeman.push({ x: x, y: y, cor: cor || '#ff5d7a', raio: raio || 8, inicio: _agora() });
    };
    function _posJogador(id) {
        if (id === window.meuId) return { x: window.meuX + 12, y: window.meuY + 16 };
        let pj = window.todosJogadores && window.todosJogadores[id];
        return pj ? { x: pj.x + 12, y: pj.y + 16 } : null;
    }

    /* ================= GIRO DA FOICE (Skill 1) ================= */
    window.criarAnimacaoGiroPikeman = function (id, x, y, durMs) {
        let dur = (durMs || 1200);
        if (typeof window.registrarPikemanAnim === 'function') window.registrarPikemanAnim(id, 'giro', dur, { alvoAng: (x !== undefined ? Math.atan2((y || 0) - (window.meuY + 16 || 0), (x || 0) - (window.meuX + 12 || 0)) : 0) + Math.PI * 0.25 });
        let exist = window.girosPikeman.find(g => g.id === id);
        let inicio = _agora();
        if (exist) { exist.inicio = inicio; exist.dur = dur; return; }
        let giro = { id: id, x: x || 0, y: y || 0, inicio: inicio, dur: dur, rastro: [], particulas: [], aneis: [] };
        // rastros que acompanham a lâmina (posição angular muda com o giro)
        for (let i = 0; i < 22; i++) {
            giro.rastro.push({
                a0: Math.random() * Math.PI * 2,
                compr: 0.7 + Math.random() * 1.3,
                raio: 44 + Math.random() * 26,
                larg: 3 + Math.random() * 6,
                cor: Math.random() > 0.55 ? 'rgba(255,60,90,' : Math.random() > 0.3 ? 'rgba(140,30,140,' : 'rgba(200,60,60,'
            });
        }
        for (let i = 0; i < 26; i++) {
            giro.particulas.push({
                x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 5 - 1,
                life: 1, size: 1 + Math.random() * 2.6, cor: Math.random() > 0.5 ? '#ff3b6b' : '#7a1fa8'
            });
        }
        window.girosPikeman.push(giro);
    };

    window.finalizarAnimacaoGiroPikeman = function (id) {
        let g = window.girosPikeman.find(x => x.id === id);
        if (g) g.dur = Math.min(g.dur, 200);
        if (id === window.meuId && typeof window.registrarPikemanAnim === 'function') window.registrarPikemanAnim(id, 'idle', 200);
    };

    /* ================= PIRUETA DA MORTE (Skill 2) ================= */
    window.criarAnimacaoPiruetaPikeman = function (id, x, y) {
        if (typeof window.registrarPikemanAnim === 'function') window.registrarPikemanAnim(id, 'pirueta', 860, { hit: 1, dir: Math.random() > 0.5 ? 1 : -1 });
        window.piruetasPikeman.push({ id: id, x: x || 0, y: y || 0, inicio: _agora(), dur: 860, hit: 0 });
    };
    window.criarImpactoPiruetaPikeman = function (x, y, hit) {
        window.impactosPikeman.push({ x: x, y: y, hit: 'pir' + (hit || 1), inicio: _agora(), raio: 8 + (hit || 1) * 4 });
        window.flashesPikeman.push({ x: x, y: y, cor: '#ff5d7a', raio: 9, inicio: _agora() });
        // atualiza hit da animação daquele jogador (para o corte correspondente)
        for (let p of window.piruetasPikeman) { if (!p) continue; }
        window.piruetasPikeman.forEach(function (pir) {
            if (Math.hypot(pir.x - x, pir.y - y) < 90 && pir.hit < (hit || 1)) {
                pir.hit = hit || 1;
                if (typeof window.registrarPikemanAnim === 'function') window.registrarPikemanAnim(pir.id, 'pirueta', 860, { hit: hit || 1, dir: 1 });
            }
        });
    };

    /* ================= GEADA DA MORTE (Skill 3) ================= */
    window.criarAnimacaoGeadaPikeman = function (id, x, y, raio) {
        if (typeof window.registrarPikemanAnim === 'function') window.registrarPikemanAnim(id, 'geada', 1000);
        let r = raio || 130;
        window.geadasPikeman.push({ id: id, x: x || 0, y: y || 0, inicio: _agora(), dur: 950, raio: r, cristais: [], flocos: [] });
        let g = window.geadasPikeman[window.geadasPikeman.length - 1];
        for (let i = 0; i < 16; i++) {
            let a = Math.random() * Math.PI * 2;
            g.cristais.push({ x: (x || 0) + Math.cos(a) * r * (0.3 + Math.random() * 0.7), y: (y || 0) + Math.sin(a) * r * (0.3 + Math.random() * 0.7), tam: 2 + Math.random() * 5, rot: Math.random() * Math.PI });
        }
        for (let i = 0; i < 30; i++) {
            g.flocos.push({ x: (x || 0) + (Math.random() - 0.5) * r * 2.2, y: (y || 0) + (Math.random() - 0.5) * r * 1.5, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 1.4, size: 0.8 + Math.random() * 1.8, life: 1 });
        }
    };
    window.criarImpactoGeadaPikeman = function (x, y) {
        window.pikemanFrost.push({ x: x, y: y, inicio: _agora(), dur: 1800, cristais: [] });
        let f = window.pikemanFrost[window.pikemanFrost.length - 1];
        for (let i = 0; i < 7; i++) {
            f.cristais.push({ x: (Math.random() - 0.5) * 22, y: -4 + (Math.random() - 0.5) * 14, tam: 2 + Math.random() * 3.6, rot: Math.random() * Math.PI });
        }
        window.flashesPikeman.push({ x: x, y: y, cor: '#a8ecff', raio: 10, inicio: _agora() });
    };

    /* ================= EXECUÇÃO DA MORTE (Skill 4) ================= */
    window.criarAnimacaoExecucaoPikeman = function (id, x, y, alvoX, alvoY, durMs) {
        let dur = durMs || 3000;
        if (typeof window.registrarPikemanAnim === 'function') window.registrarPikemanAnim(id, 'execucao', dur + 640, { hit: 1, alvoX: alvoX, alvoY: alvoY });
        if (id === window.meuId && window.pikemanEstadoLocal) {
            // a barra de carga usa EXATAMENTE a duração do canal (3s), não a animação estendida
            window.pikemanEstadoLocal.execucaoInicio = (window.pikemanAnims && window.pikemanAnims[id]) ? window.pikemanAnims[id].inicio : _agora();
            window.pikemanEstadoLocal.execucaoDur = dur;
        }
        let exist = window.execucoesPikeman.find(e => e.id === id);
        if (exist) { exist.inicio = _agora(); exist.dur = dur + 640; exist.alvoX = alvoX; exist.alvoY = alvoY; return; }
        window.execucoesPikeman.push({ id: id, x: x || 0, y: y || 0, alvoX: alvoX, alvoY: alvoY, inicio: _agora(), dur: dur + 640, hit: 0, particulas: [] });
    };
    window.cancelarAnimacaoExecucaoPikeman = function (id) {
        if (typeof window.registrarPikemanAnim === 'function') window.registrarPikemanAnim(id, 'idle', 200);
        for (let i = window.execucoesPikeman.length - 1; i >= 0; i--) {
            if (window.execucoesPikeman[i].id === id) window.execucoesPikeman.splice(i, 1);
        }
        if (window.meuId === id) {
            window.pikemanEstadoLocal.execucaoAtiva = false;
        }
    };
    window.criarImpactoExecucaoPikeman = function (x, y, hit, alvoX, alvoY) {
        let escala = (hit || 1);
        window.impactosPikeman.push({ x: x, y: y, hit: 'exe' + escala, inicio: _agora(), raio: 16 + escala * 12, escala: escala });
        if (typeof alvoX === 'number' && typeof alvoY === 'number') {
            window.impactosPikeman.push({ x: alvoX, y: alvoY, hit: 'exeAlvo' + escala, inicio: _agora(), raio: 10 + escala * 8, escala: escala });
        }
        window.flashesPikeman.push({ x: x, y: y, cor: escala >= 3 ? '#ffd54a' : '#ff5d7a', raio: 12 + escala * 7, inicio: _agora() });
        if (window.tremorTela !== undefined) window.tremorTela = Math.max(window.tremorTela, escala >= 3 ? 22 : 10 * escala);
        if (navigator.vibrate) { try { navigator.vibrate(escala >= 3 ? 90 : 45); } catch (e) {} }
    };

    /* ================= PIKEMAN: desenho dos efeitos (chamado no loop) ================= */
    window.desenharEfeitosPikeman = function () {
        let ctx = window.ctx;
        if (!ctx) return;
        let agora = _agora();

        /* ---- GIRO DA FOICE ---- */
        for (let i = window.girosPikeman.length - 1; i >= 0; i--) {
            let g = window.girosPikeman[i];
            let p = (agora - g.inicio) / g.dur;
            if (p >= 1) { 
                if (g.id === window.meuId && typeof window.registrarPikemanAnim === 'function') window.registrarPikemanAnim(g.id, 'idle', 150);
                window.girosPikeman.splice(i, 1); continue;
            }
            let pos = _posJogador(g.id);
            if (pos) { g.x = pos.x; g.y = pos.y; }
            ctx.save();
            ctx.translate(g.x, g.y);
            let angEspiral = p * Math.PI * 6; // exatamente acompanha a rotação da arma
            // rastros que "giram" junto com a lâmina
            for (let r of g.rastro) {
                let a = r.a0 + angEspiral;
                let raio = r.raio + Math.sin(agora / 120 + r.a0) * 8;
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(2, raio * (0.75 + Math.sin(agora / 100 + r.a0) * 0.18)), a - r.compr, a + 0.12);
                ctx.strokeStyle = r.cor + (0.16 + p * 0.3) + ')';
                ctx.lineWidth = r.larg * (1 - p * 0.4);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(2, raio * 0.6), a - r.compr * 0.7, a - 0.02);
                ctx.strokeStyle = 'rgba(255,220,230,' + (0.5 * (1 - p * 0.5)) + ')';
                ctx.lineWidth = Math.max(1, r.larg * 0.4);
                ctx.stroke();
            }
            // onda circular ao completar o giro
            if (p > 0.82) {
                let o = (p - 0.82) / 0.18;
                ctx.beginPath();
                ctx.arc(0, 0, 26 + o * 86, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,60,90,' + (0.5 * (1 - o)) + ')';
                ctx.lineWidth = 4;
                ctx.stroke();
            }
            // partículas de energia fragmentada
            for (let pt of g.particulas) {
                pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.03; pt.vy += 0.03;
                if (pt.life <= 0) continue;
                ctx.fillStyle = pt.cor;
                ctx.globalAlpha = pt.life * 0.85;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        /* ---- PIRUETA DA MORTE (cortes) ---- */
        for (let i = window.piruetasPikeman.length - 1; i >= 0; i--) {
            let pir = window.piruetasPikeman[i];
            let p = (agora - pir.inicio) / pir.dur;
            if (p >= 1) {
                if (pir.id === window.meuId && typeof window.registrarPikemanAnim === 'function') window.registrarPikemanAnim(pir.id, 'idle', 150);
                window.piruetasPikeman.splice(i, 1); continue;
            }
            let pos = _posJogador(pir.id);
            if (pos) { pir.x = pos.x; pir.y = pos.y; }
            ctx.save();
            ctx.translate(pir.x, pir.y);
            // trail por hit: 3 arcos de corte
            for (let h = 1; h <= 3; h++) {
                let hIni = (h - 1) * (pir.dur / 3);
                let hProg = (agora - pir.inicio - hIni) / (pir.dur / 3);
                if (hProg < 0 || hProg > 1) continue;
                let a = -1.2 + hProg * 2.4;
                ctx.beginPath();
                ctx.arc(10, -14, 30, a - 0.5, a);
                ctx.strokeStyle = 'rgba(255,70,100,' + (0.75 * (1 - hProg * 0.8)) + ')';
                ctx.lineWidth = 6 - hProg * 3;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(10, -14, 24, a - 0.4, a - 0.02);
                ctx.strokeStyle = 'rgba(255,230,235,' + (0.6 * (1 - hProg)) + ')';
                ctx.lineWidth = 2;
                ctx.stroke();
                if (h === 3 && hProg > 0.55) {
                    // impacto maior no terceiro golpe
                    let o = (hProg - 0.55) / 0.45;
                    ctx.beginPath();
                    ctx.arc(14, -8, 8 + o * 26, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255,90,120,' + (0.7 * (1 - o)) + ')';
                    ctx.lineWidth = 3.5;
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        /* ---- GEADA DA MORTE (anel congelante + cristais + flocos) ---- */
        for (let i = window.geadasPikeman.length - 1; i >= 0; i--) {
            let g = window.geadasPikeman[i];
            let p = (agora - g.inicio) / g.dur;
            if (p >= 1) { window.geadasPikeman.splice(i, 1); continue; }
            let pos = _posJogador(g.id);
            if (pos) { g.x = pos.x; g.y = pos.y; }
            ctx.save();
            ctx.translate(g.x, g.y);
            let raio = g.raio * Math.min(1, p * 3.2);
            let o = 1 - p;
            // chão congelado (mancha azulada)
            ctx.fillStyle = 'rgba(150,220,255,' + (0.16 * o) + ')';
            ctx.beginPath();
            ctx.arc(0, 2, raio, 0, Math.PI * 2);
            ctx.fill();
            // anel congelante (2 ondas)
            for (let k = 0; k < 2; k++) {
                let r2 = raio * (0.55 + k * 0.45);
                ctx.beginPath();
                ctx.arc(0, 2, r2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(180,235,255,' + (0.65 * o * (k === 0 ? 1 : 0.7)) + ')';
                ctx.lineWidth = 3 - k;
                ctx.stroke();
            }
            // cristais nascendo do chão (girando/emergindo)
            for (let c of g.cristais) {
                let cp = Math.min(1, p * 5);
                ctx.save();
                ctx.translate(c.x - g.x, c.y - g.y);
                ctx.rotate(c.rot + p * 0.5);
                ctx.fillStyle = 'rgba(200,240,255,' + (0.9 * (1 - cp * 0.35)) + ')';
                ctx.beginPath();
                ctx.moveTo(0, -c.tam * cp);
                ctx.lineTo(c.tam * 0.4 * cp, 0);
                ctx.lineTo(-c.tam * 0.4 * cp, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            // flocos de neve
            for (let f of g.flocos) {
                f.x += f.vx; f.y += f.vy; f.life -= 0.012;
                if (f.life <= 0) continue;
                ctx.fillStyle = 'rgba(255,255,255,' + (f.life * 0.8) + ')';
                ctx.beginPath();
                ctx.arc(f.x - g.x, f.y - g.y, f.size, 0, Math.PI * 2);
                ctx.fill();
            }
            // névoa fria
            ctx.fillStyle = 'rgba(190,235,255,' + (0.08 * o) + ')';
            for (let k = 0; k < 6; k++) {
                let a = k * Math.PI / 3 + p * 0.7;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * raio * 0.5, 2 + Math.sin(a) * raio * 0.35, 18 + Math.sin(agora / 300 + k) * 6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        /* ---- EXECUÇÃO DA MORTE (carga) ---- */
        // cargas de todos os pikemans (próprio + outros jogadores vistos)
        let cargas = [];
        if (window.pikemanEstadoLocal && window.pikemanEstadoLocal.execucaoAtiva) {
            let inicio = window.pikemanEstadoLocal.execucaoInicio || 0;
            let dur = window.pikemanEstadoLocal.execucaoDur || 3000;
            let prox = Math.max(0, Math.min(1, (agora - inicio) / dur));
            if (prox < 1) cargas.push({ x: window.meuX + 12, y: window.meuY + 16, p: prox });
        }
        if (window.todosJogadores) {
            for (let pid in window.todosJogadores) {
                let pj = window.todosJogadores[pid];
                if (pj && pj.pikemanProgresso > 0 && pj.pikemanProgresso < 1 && pj.classe === 'pikeman') {
                    cargas.push({ x: pj.x + 12, y: pj.y + 16, p: pj.pikemanProgresso });
                }
            }
        }
        for (let c of cargas) {
            ctx.save();
            ctx.translate(c.x, c.y);
            // aura crescente
            let auraR = 14 + c.p * 22;
            ctx.fillStyle = 'rgba(120,20,40,' + (0.10 + c.p * 0.18) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, auraR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,60,90,' + (0.25 + c.p * 0.45) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, auraR, 0, Math.PI * 2);
            ctx.stroke();
            // fragmentos de energia sendo atraídos para a arma
            ctx.shadowColor = 'rgba(255,40,90,0.9)';
            ctx.shadowBlur = 8;
            for (let k = 0; k < 8; k++) {
                let a = k * Math.PI / 4 + c.p * 2.2 + agora / 400;
                let dist = 30 - c.p * 8 - Math.sin(agora / 160 + k) * 6;
                let fx = Math.cos(a) * Math.max(6, dist);
                let fy = Math.sin(a) * Math.max(4, dist * 0.7) - 10;
                ctx.fillStyle = 'rgba(255,' + Math.round(120 + c.p * 80) + ',' + Math.round(140 + c.p * 80) + ',' + (0.5 + c.p * 0.4) + ')';
                ctx.beginPath();
                ctx.arc(fx, fy, 1.4 + c.p * 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            // rachaduras no chão
            if (c.p > 0.3) {
                ctx.strokeStyle = 'rgba(20,8,10,' + (0.25 + c.p * 0.3) + ')';
                ctx.lineWidth = 1.4;
                for (let k = 0; k < 5; k++) {
                    let a = k * Math.PI / 2.6 + c.p * 3.1;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 10 + 2);
                    ctx.lineTo(Math.cos(a + 0.22) * (26 + c.p * 26), Math.sin(a + 0.22) * (16 + c.p * 16) + 2);
                    ctx.lineTo(Math.cos(a + 0.4) * (34 + c.p * 26), Math.sin(a + 0.4) * (21 + c.p * 18) + 2);
                    ctx.stroke();
                }
            }
            // clarões na arma enquanto carrega
            if (c.p > 0.55 && Math.sin(agora / 90) > 0.2) {
                ctx.fillStyle = 'rgba(255,240,200,0.7)';
                ctx.beginPath();
                ctx.arc(Math.sin(agora / 140) * 6, -24 - c.p * 6, 3 + c.p * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        /* ---------- IMPACTOS (pirueta / execução) ---------- */
        for (let i = window.impactosPikeman.length - 1; i >= 0; i--) {
            let im = window.impactosPikeman[i];
            let p = (agora - im.inicio) / 420;
            if (p >= 1) { window.impactosPikeman.splice(i, 1); continue; }
            ctx.save();
            ctx.translate(im.x, im.y);
            let o = 1 - p;
            if (im.hit === 'pir1' || im.hit === 'pir2' || im.hit === 'pir3') {
                // corte cruzado no inimigo
                ctx.strokeStyle = 'rgba(255,70,100,' + (0.8 * o) + ')';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-10 - p * 6, -6);
                ctx.lineTo(10 + p * 6, 6);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-10 - p * 6, 6);
                ctx.lineTo(10 + p * 6, -6);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255,200,210,' + (0.5 * o) + ')';
                ctx.beginPath();
                ctx.arc(0, 0, 3 + p * 6, 0, Math.PI * 2);
                ctx.fill();
            } else if (im.hit === 'exe1' || im.hit === 'exe2' || im.hit === 'exe3') {
                let esc = im.escala || 1;
                // onda de choque (raio cresce com o golpe)
                ctx.beginPath();
                ctx.arc(0, 3, 12 + p * 34 * esc, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,90,110,' + (0.75 * o) + ')';
                ctx.lineWidth = 5;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 3, 8 + p * 24 * esc, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,210,120,' + (0.6 * o) + ')';
                ctx.lineWidth = 2;
                ctx.stroke();
                // poeira/fragmentos
                ctx.fillStyle = 'rgba(120,90,70,' + (0.5 * o) + ')';
                for (let k = 0; k < 8; k++) {
                    let a = k * Math.PI / 4 + p * 2;
                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * p * 26 * esc, Math.sin(a) * p * 16 * esc + 3, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (im.hit.indexOf('exeAlvo') === 0) {
                let esc = im.escala || 1;
                // corte gigante no alvo (golpe final = explosão)
                ctx.strokeStyle = 'rgba(255,110,130,' + (0.9 * o) + ')';
                ctx.lineWidth = 2 + esc;
                ctx.beginPath();
                ctx.moveTo(-16 - p * 10, -8);
                ctx.lineTo(16 + p * 10, 8);
                ctx.stroke();
                if (esc >= 3) {
                    ctx.fillStyle = 'rgba(255,210,0,' + (0.5 * o) + ')';
                    ctx.shadowColor = '#ffb300';
                    ctx.shadowBlur = 24;
                    ctx.beginPath();
                    ctx.arc(0, 0, 14 + p * 22, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
            ctx.restore();
        }

        /* ---------- FLASHES ---------- */
        for (let i = window.flashesPikeman.length - 1; i >= 0; i--) {
            let f = window.flashesPikeman[i];
            let p = (agora - f.inicio) / 260;
            if (p >= 1) { window.flashesPikeman.splice(i, 1); continue; }
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.globalAlpha = 1 - p;
            ctx.strokeStyle = f.cor;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = f.cor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, f.raio * (0.4 + p * 1.4), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        /* ---------- INIMIGOS CONGELADOS/LENTOS (Instinto da Morte) ---------- */
        // extrai gelo fresco dos slimes afetados
        function _puxarGeloFresco(alvo, agoraRef) {
            let temGelo = alvo.efeitos && alvo.efeitos.some(function (e) { return e && (e.id === 'gelo' || e.id === 'congelado' || e.id === 'lentidao') && e.tempo > 0; });
            let temSlow = (typeof alvo.slowTimer === 'number' && alvo.slowTimer > 0);
            if ((temGelo || temSlow) && window.pikemanFrost.length < 60) {
                if (Math.random() > 0.85) return;
                window.pikemanFrost.push({ x: alvo.x, y: alvo.y, inicio: agoraRef, dur: 700, cristais: [] });
                let f = window.pikemanFrost[window.pikemanFrost.length - 1];
                for (let k = 0; k < 4; k++) {
                    f.cristais.push({ x: (Math.random() - 0.5) * 24, y: -3 + (Math.random() - 0.5) * 12, tam: 1.5 + Math.random() * 3, rot: Math.random() * Math.PI });
                }
            }
        }
        if (window.listaSlimes) {
            for (let s of window.listaSlimes) {
                if (!s || s.hp <= 0) continue;
                _puxarGeloFresco(s, agora);
            }
        }
        if (typeof listaBosses !== 'undefined' && Array.isArray(listaBosses)) {
            for (let b of listaBosses) {
                if (!b || b.hp <= 0) continue;
                _puxarGeloFresco(b, agora);
            }
        }
        for (let i = window.pikemanFrost.length - 1; i >= 0; i--) {
            let f = window.pikemanFrost[i];
            let p = (agora - f.inicio) / f.dur;
            if (p >= 1) { window.pikemanFrost.splice(i, 1); continue; }
            ctx.save();
            ctx.translate(f.x, f.y);
            let o = 1 - p;
            // aura azul
            ctx.fillStyle = 'rgba(120,190,255,' + (0.14 * o) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, 13 + p * 4, 0, Math.PI * 2);
            ctx.fill();
            // cristais nas pernas
            for (let c of f.cristais) {
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate(c.rot + p);
                ctx.fillStyle = 'rgba(190,235,255,' + (0.85 * o) + ')';
                ctx.beginPath();
                ctx.moveTo(0, -c.tam * (1 - p * 0.3));
                ctx.lineTo(c.tam * 0.42, 0);
                ctx.lineTo(-c.tam * 0.42, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            // partículas de gelo subindo
            if (Math.random() > 0.7) {
                ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * o) + ')';
                ctx.beginPath();
                ctx.arc((Math.random() - 0.5) * 20, -4 - Math.random() * 10, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    };
})();