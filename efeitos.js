// efeitos.js - Magias, explosões, saltos, impactos de combate e Smart Cast unificado

window.impactosGolem = [];

function obterFatorParticulasGrafica() {
    if (typeof window !== 'undefined') {
        if (typeof window.getFatorQualidadeGrafica === 'function') {
            return window.getFatorQualidadeGrafica('particulas', 1);
        }
        if (typeof window.obterFatorParticulasGrafica === 'function') {
            return window.obterFatorParticulasGrafica();
        }
    }
    return 1;
}

function limitarParticulas(base, multiplicador) {
    const fator = obterFatorParticulasGrafica();
    const escala = multiplicador || 1;
    return Math.max(0, Math.round((base || 0) * fator * escala));
}

window.criarAnimacaoImpactoGolem = function(x, y) {
    let particulas = [];
    const fator = obterFatorParticulasGrafica();
    for (let i = 0; i < limitarParticulas(8, 1); i++) {
        let ang = Math.random() * Math.PI * 2;
        let vel = Math.random() * 3 + 1;
        particulas.push({
            x: x,
            y: y,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel,
            vida: 1.0,
            tamanho: Math.random() * 3 + 2,
            cor: Math.random() > 0.5 ? "#d35400" : "#7f8c8d"
        });
    }

    window.impactosGolem.push({
        x: x,
        y: y,
        raio: 6,
        raioMax: 24,
        alpha: 1.0,
        particulas: particulas
    });
};

window.desenharImpactosGolem = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;

    for (let i = window.impactosGolem.length - 1; i >= 0; i--) {
        let imp = window.impactosGolem[i];
        imp.raio += 2;
        imp.alpha -= 0.08;

        if (imp.alpha <= 0) {
            window.impactosGolem.splice(i, 1);
        } else {
            ctx.save();
            ctx.strokeStyle = "rgba(230, 126, 34, " + imp.alpha + ")";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(imp.x, imp.y, imp.raio, 0, Math.PI * 2);
            ctx.stroke();

            for (let p of imp.particulas) {
                p.x += p.vx;
                p.y += p.vy;
                p.vida -= 0.08;
                ctx.fillStyle = p.cor;
                ctx.globalAlpha = Math.max(0, p.vida);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.tamanho, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
};

// Gerador procedural de fraturas e rachaduras telúricas hiper-realistas
function _gerarRachadurasRealistasSismicas(raioMax, numRamos, seedBase) {
    const ramos = [];
    const seed = seedBase || Math.floor(Math.random() * 99999);
    for (let r = 0; r < numRamos; r++) {
        const angBase = (r / numRamos) * Math.PI * 2 + ((seed + r * 37) % 100 / 100 - 0.5) * 0.45;
        const lenTotal = raioMax * (0.75 + ((seed + r * 53) % 40) / 100);
        let curDist = 0;
        let curAng = angBase;
        let cx = 0, cy = 0;
        const pontos = [{ x: 0, y: 0, w: 5.5 }];
        const subRamos = [];
        
        while (curDist < lenTotal) {
            const step = 9 + ((seed + r * 19 + Math.floor(curDist)) % 10);
            curDist += step;
            const deltaAng = (Math.sin((seed + r * 31 + curDist) * 0.17)) * 0.42;
            curAng += deltaAng;
            cx += Math.cos(curAng) * step;
            cy += Math.sin(curAng) * step * 0.65; // perspectiva 2.5D
            const prog = curDist / lenTotal;
            const w = Math.max(0.8, 5.5 * (1 - prog));
            pontos.push({ x: cx, y: cy, w });
            
            // Sub-fraturas brotando das laterais
            if (((seed + r * 23 + Math.floor(curDist)) % 10 < 4) && prog < 0.72) {
                const subAng = curAng + (((seed + r) % 2 === 0) ? 0.68 : -0.68);
                const subLen = 16 + ((seed + r * 13) % 22);
                let sx = cx, sy = cy;
                const subPts = [{ x: sx, y: sy, w: w * 0.7 }];
                let sDist = 0;
                while (sDist < subLen) {
                    const sp = 7 + (sDist % 6);
                    sDist += sp;
                    sx += Math.cos(subAng) * sp;
                    sy += Math.sin(subAng) * sp * 0.65;
                    subPts.push({ x: sx, y: sy, w: Math.max(0.6, w * 0.7 * (1 - sDist / subLen)) });
                }
                subRamos.push(subPts);
            }
        }
        ramos.push({ pontos, subRamos });
    }
    return ramos;
}

// Skill 1: Esmagamento Sísmico — Rachaduras Realistas no Chão
window.criarAnimacaoOgroSismico = function(x, y) {
    if (typeof tocarSomImpactoPesado === 'function') tocarSomImpactoPesado(x, y);
    window.tremorTela = Math.max(window.tremorTela || 0, 18);
    const fator = obterFatorParticulasGrafica();
    
    const ramos = _gerarRachadurasRealistasSismicas(95, limitarParticulas(9, 1));
    
    // Placas de terra/rocha levantadas no epicentro
    const lajes = [];
    for (let l = 0; l < 5; l++) {
        const la = (l / 5) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const ld = 12 + Math.random() * 16;
        lajes.push({
            x: Math.cos(la) * ld,
            y: Math.sin(la) * ld * 0.65,
            w: 8 + Math.random() * 8,
            h: 6 + Math.random() * 6,
            ang: Math.random() * Math.PI,
            cor: l % 2 === 0 ? '#453856' : '#2b2138'
        });
    }

    // Detritos e pedras ejetadas com física balística
    let pedras = [];
    for (let p = 0; p < limitarParticulas(24, 1); p++) {
        let ang = Math.random() * Math.PI * 2;
        let spd = Math.random() * 4.5 + 1.8;
        pedras.push({
            x: x + (Math.random() - 0.5) * 12,
            y: y + (Math.random() - 0.5) * 8,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd * 0.65 - Math.random() * 3.5,
            tamanho: Math.random() * 4.5 + 2.0,
            vida: 1.0,
            cor: p % 3 === 0 ? '#8e79b0' : (p % 2 === 0 ? '#5a4674' : '#2c223c')
        });
    }

    window.impactosSismicos.push({
        x: x,
        y: y,
        raioOnda: 8,
        raioMax: 100,
        alpha: 1.0,
        idade: 0,
        vida: 65,
        ramos: ramos,
        lajes: lajes,
        pedras: pedras
    });
    window.floatingTexts.push({ x: x, y: y - 30, text: "💥 ESMAGAMENTO SÍSMICO! (-45)", color: "#e67e22", alpha: 1.0 });
};

// Skill 2: Aterrissagem do Salto do Golem — Trincados Exagerados e Rochas Pontudas Saindo do Chão
window.aterrissagensSaltoGolem = window.aterrissagensSaltoGolem || [];

window.criarEfeitoAterrissagemSaltoGolem = function(x, y) {
    // Debounce anti-duplicação
    window._ultimoImpactoSaltoGolem = window._ultimoImpactoSaltoGolem || { t: 0, x: 0, y: 0 };
    if (Date.now() - window._ultimoImpactoSaltoGolem.t < 250 && Math.hypot(x - window._ultimoImpactoSaltoGolem.x, y - window._ultimoImpactoSaltoGolem.y) < 50) {
        return;
    }
    window._ultimoImpactoSaltoGolem = { t: Date.now(), x, y };

    if (typeof tocarSomImpactoPesado === 'function') tocarSomImpactoPesado(x, y);
    if (typeof window.tocarSonoroProximidade === 'function') window.tocarSonoroProximidade('summoner_salto', x, y);
    else if (window.tocarSonoro) window.tocarSonoro('summoner_salto');

    // Tremor de tela épico exagerado
    window.tremorTela = Math.max(window.tremorTela || 0, 25);

    // 1. Rachaduras Exageradas e Hiper-Realistas (Raio de 150px com 16 ramificações e 3 anéis concêntricos)
    const ramos = _gerarRachadurasRealistasSismicas(150, 16);

    // 2. Rochas Pontudas Saindo do Chão (8 a 10 Estalagmites Telúricas)
    const fator = obterFatorParticulasGrafica();
    const rochasPontudas = [];
    const numSpikes = Math.max(5, Math.round(9 * fator));
    for (let k = 0; k < numSpikes; k++) {
        const ang = (k / numSpikes) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const dist = 38 + Math.random() * 45;
        const sx = x + Math.cos(ang) * dist;
        const sy = y + Math.sin(ang) * dist * 0.65;
        rochasPontudas.push({
            x: sx,
            y: sy,
            largura: 18 + Math.random() * 10,
            alturaMax: 38 + Math.random() * 26,
            desvioPonta: (Math.random() - 0.5) * 8,
            inclinacao: (Math.random() - 0.5) * 0.32,
            delay: k * 18,
            corClara: '#9a86c9',
            corMedia: '#6f5aa0',
            corEscura: '#463a70',
            corSombra: '#2a2245',
            fendaLuz: '#efd9ff'
        });
    }

    // 3. Placas de rocha deslocadas
    const lajes = [];
    for (let l = 0; l < 8; l++) {
        const la = (l / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const ld = 18 + Math.random() * 28;
        lajes.push({
            x: Math.cos(la) * ld,
            y: Math.sin(la) * ld * 0.65,
            w: 12 + Math.random() * 12,
            h: 8 + Math.random() * 8,
            ang: Math.random() * Math.PI,
            cor: l % 2 === 0 ? '#463a70' : '#2a2245'
        });
    }

    // 4. Detritos e pedras ejetadas voando alto
    const pedras = [];
    for (let p = 0; p < limitarParticulas(45, 1); p++) {
        const a = Math.random() * Math.PI * 2;
        const sp = Math.random() * 6.5 + 2.5;
        pedras.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 14,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp * 0.65 - Math.random() * 5.0,
            tamanho: Math.random() * 5.5 + 2.5,
            vida: 1.0,
            cor: p % 3 === 0 ? '#9a86c9' : (p % 2 === 0 ? '#6f5aa0' : '#2a2245')
        });
    }

    window.aterrissagensSaltoGolem.push({
        x: x,
        y: y,
        raioMax: 155,
        idade: 0,
        vida: 2200, // 2.2 segundos para as rochas pontudas permanecerem cravadas no chão
        ramos: ramos,
        rochasPontudas: rochasPontudas,
        lajes: lajes,
        pedras: pedras
    });

    window.floatingTexts.push({ x: x, y: y - 45, text: "💥 ATERRISSAGEM TELÚRICA!", color: "#e056fd", alpha: 1.0 });
};

window.criarAnimacaoSaltoOgro = function(startX, startY, targetX, targetY) {
    if (typeof tocarSomSalto === 'function') tocarSomSalto();
    window.saltosOgroAtivos.push({ 
        startX: startX, 
        startY: startY, 
        targetX: targetX, 
        targetY: targetY, 
        progresso: 0, 
        velocidade: 0.04 
    });
};

window.criarAnimacaoRugidoOgro = function(x, y) {
    if (typeof tocarSomRugidoOgro === 'function') tocarSomRugidoOgro();
    window.tremorTela = 12;
    for (let i = 0; i < 3; i++) {
        window.impactosSismicos.push({
            x: x, y: y,
            raioOnda: 10 + i * 14, raioMax: 120 + i * 30,
            alpha: 1.0,
            idade: 0,
            vida: 45,
            rachaduras: [],
            pedras: [],
            cor: "rgba(155, 89, 182,"
        });
    }
};

window.criarAnimacaoMeteoro = function(tx, ty) {
    if (typeof window.tocarSonoroProximidade === 'function') window.tocarSonoroProximidade('mago_meteoro_queda', tx, ty);
    else if (window.tocarSonoro) window.tocarSonoro('mago_meteoro_queda');
    else if (typeof tocarSomQuedaMeteoro === 'function') tocarSomQuedaMeteoro();
    window.meteorosAtivos.push({ startX: tx - 240, startY: ty - 420, targetX: tx, targetY: ty, progresso: 0, velocidade: 0.032, rastro: [] });
};

window.criarAnimacaoNevasca = function(tx, ty, raio, duracaoMs, isFogo) {
    const isChamas = !!isFogo;
    if (isChamas) {
        if (typeof window.tocarSonoroProximidade === 'function') window.tocarSonoroProximidade('mago_lava_impacto', tx, ty);
        else if (typeof window.tocarSonoro === 'function') window.tocarSonoro('mago_lava_impacto');
        else if (typeof tocarSomNevasca === 'function') tocarSomNevasca();
    } else {
        if (typeof tocarSomNevasca === 'function') tocarSomNevasca();
    }

    const duracaoVisualMs = Number.isFinite(duracaoMs) ? duracaoMs : Math.round(480 * (1000 / 60));
    const particulas = [];
    const qtd = 50;

    for (let i = 0; i < qtd; i++) {
        if (isChamas) {
            const coresFogo = ['#ffffff', '#fff3b0', '#ffd166', '#f97316', '#ef4444', '#b91c1c'];
            particulas.push({
                dist: Math.random() * (raio * 0.95),
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.05 + 0.03,
                size: Math.random() * 4.5 + 2.0,
                color: coresFogo[Math.floor(Math.random() * coresFogo.length)],
                alpha: Math.random() * 0.7 + 0.3,
                driftY: Math.random() * 0.8 + 0.2
            });
        } else {
            const coresGelo = ['#ffffff', '#f0f9ff', '#e0f2fe', '#bae6fd', '#38bdf8', '#0284c7'];
            particulas.push({
                dist: Math.random() * (raio * 0.95),
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.045 + 0.025,
                size: Math.random() * 4.0 + 1.8,
                color: coresGelo[Math.floor(Math.random() * coresGelo.length)],
                alpha: Math.random() * 0.75 + 0.25,
                isSnowflake: Math.random() > 0.45
            });
        }
    }

    window.nevascasAtivas.push({
        x: tx,
        y: ty,
        radius: raio || 115,
        duracao: 480,
        startTime: Date.now(),
        duracaoMs: duracaoVisualMs,
        rotacao: 0,
        isFogo: isChamas,
        particulas: particulas
    });

    if (window.floatingTexts) {
        if (isChamas) {
            window.floatingTexts.push({ x: tx, y: ty - 40, text: "🔥 NEVASCA DE FOGO (QUEIMADURA)", color: "#f97316", alpha: 1.0 });
        } else {
            window.floatingTexts.push({ x: tx, y: ty - 40, text: "❄️ NEVASCA GLACIAL (CONGELAMENTO)", color: "#38bdf8", alpha: 1.0 });
        }
    }
};

window.desenharEfeitosMeteoro = function() {
    if (!window.ctx) return;
    for (let i = window.chaoEmChamas.length - 1; i >= 0; i--) {
        let fogo = window.chaoEmChamas[i];
        // PROTEÇÃO: entradas com shape inesperado não podem travar o jogo
        if (!fogo || typeof fogo !== 'object') { window.chaoEmChamas.splice(i, 1); continue; }
        if (!Array.isArray(fogo.particulasFogo)) { window.chaoEmChamas.splice(i, 1); continue; }
        if (!Number.isFinite(fogo.duracao)) fogo.duracao = 300;
        fogo.duracao--;
        if (fogo.duracao <= 0) { window.chaoEmChamas.splice(i, 1); } else {
            const progFogo = fogo.duracaoInicial ? fogo.duracao / fogo.duracaoInicial : 1;
            const fadeFogo = Math.min(1, progFogo / 0.20); // Mantém vivo por 80% do tempo e fade suave no final
            window.ctx.save();

            // 1) Iluminação quente e pulsante no solo (5s)
            const pulsoLuz = Math.sin(Date.now() / 140) * 0.08 + 0.92;
            let luzChao = window.ctx.createRadialGradient(fogo.x, fogo.y + 6, 4, fogo.x, fogo.y + 6, 95);
            luzChao.addColorStop(0, "rgba(255, 190, 80, " + (0.38 * fadeFogo * pulsoLuz) + ")");
            luzChao.addColorStop(0.5, "rgba(240, 90, 20, " + (0.22 * fadeFogo * pulsoLuz) + ")");
            luzChao.addColorStop(0.85, "rgba(180, 40, 0, " + (0.08 * fadeFogo) + ")");
            luzChao.addColorStop(1, "rgba(0, 0, 0, 0)");
            window.ctx.fillStyle = luzChao;
            window.ctx.beginPath(); window.ctx.ellipse(fogo.x, fogo.y + 6, 95, 48, 0, 0, Math.PI * 2); window.ctx.fill();

            // 2) Cratera de terra calcinada / rocha derretida
            window.ctx.fillStyle = "rgba(18, 8, 4, " + (0.80 * fadeFogo) + ")";
            window.ctx.beginPath(); window.ctx.ellipse(fogo.x, fogo.y, 78, 42, 0, 0, Math.PI * 2); window.ctx.fill();
            window.ctx.strokeStyle = "rgba(245, 130, 32, " + (0.65 * fadeFogo) + ")";
            window.ctx.lineWidth = 2.5;
            window.ctx.stroke();

            // 3) Chamas dançantes procedurais na cratera
            window.ctx.save();
            window.ctx.globalCompositeOperation = 'lighter';
            const tempoFogo = Date.now() / 90;
            for (let fIdx = 0; fIdx < 7; fIdx++) {
                const offX = Math.cos(fIdx * 1.05 + 0.4) * 45;
                const offY = Math.sin(fIdx * 1.05 + 0.4) * 18;
                const altChama = 14 + Math.sin(tempoFogo + fIdx * 1.8) * 8;
                const largChama = 6 + Math.cos(tempoFogo + fIdx) * 2;

                const gradChama = window.ctx.createLinearGradient(fogo.x + offX, fogo.y + offY - altChama, fogo.x + offX, fogo.y + offY);
                gradChama.addColorStop(0, "rgba(255, 245, 180, " + (0.85 * fadeFogo) + ")");
                gradChama.addColorStop(0.45, "rgba(255, 120, 0, " + (0.75 * fadeFogo) + ")");
                gradChama.addColorStop(1, "rgba(200, 20, 0, " + (0.2 * fadeFogo) + ")");
                window.ctx.fillStyle = gradChama;

                window.ctx.beginPath();
                window.ctx.moveTo(fogo.x + offX, fogo.y + offY - altChama);
                window.ctx.lineTo(fogo.x + offX + largChama, fogo.y + offY);
                window.ctx.lineTo(fogo.x + offX - largChama, fogo.y + offY);
                window.ctx.closePath();
                window.ctx.fill();
            }
            window.ctx.restore();

            // 4) Brasas incandescentes flutuando continuamente para cima
            window.ctx.save();
            window.ctx.globalCompositeOperation = 'lighter';
            for (let p of fogo.particulasFogo) {
                p.y -= p.vy; p.x += Math.sin(Date.now() / 150 + p.offset) * 0.8; p.vida -= 0.025;
                if (p.vida <= 0) { p.vida = 1.0; p.y = fogo.y + (Math.random() * 24 - 12); p.x = fogo.x + (Math.random() * 70 - 35); }
                const bAlpha = p.vida * fadeFogo;
                window.ctx.fillStyle = p.cor;
                window.ctx.beginPath(); window.ctx.arc(p.x, p.y, p.tamanho * (0.5 + p.vida * 0.5), 0, Math.PI * 2); window.ctx.fill();
            }
            window.ctx.restore();

            // 5) Fumaça volumosa subindo e dispersando
            if (Array.isArray(fogo.fumaça)) {
                for (let s = fogo.fumaça.length - 1; s >= 0; s--) {
                    const sm = fogo.fumaça[s];
                    sm.y -= sm.vy; sm.vida -= 0.010; sm.tamanho += 0.09;
                    if (sm.vida <= 0) { sm.vida = 1.0; sm.y = fogo.y + (Math.random() * 20 - 10); sm.x = fogo.x + (Math.random() * 60 - 30); sm.tamanho = 7 + Math.random() * 5; }
                    window.ctx.fillStyle = "rgba(65, 60, 60, " + (0.24 * sm.vida * fadeFogo) + ")";
                    window.ctx.beginPath(); window.ctx.arc(sm.x, sm.y, sm.tamanho, 0, Math.PI * 2); window.ctx.fill();
                }
            }
            window.ctx.restore();
        }
    }
    for (let i = window.meteorosAtivos.length - 1; i >= 0; i--) {
        let m = window.meteorosAtivos[i];
        m.progresso += m.velocidade;
        let curX = m.startX + (m.targetX - m.startX) * m.progresso;
        let curY = m.startY + (m.targetY - m.startY) * m.progresso;
        m.rastro.push({ x: curX, y: curY, alpha: 1.0, tamanho: Math.random() * 12 + 10 });
        window.ctx.save();
        for (let r of m.rastro) {
            r.alpha -= 0.05; window.ctx.fillStyle = "rgba(230, 126, 34, " + r.alpha + ")"; window.ctx.shadowColor = "#d35400"; window.ctx.shadowBlur = 10;
            window.ctx.beginPath(); window.ctx.arc(r.x + (Math.random() * 8 - 4), r.y + (Math.random() * 8 - 4), r.tamanho, 0, Math.PI * 2); window.ctx.fill();
        }
        let grad = window.ctx.createRadialGradient(curX, curY, 6, curX, curY, 26);
        grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.3, "#f1c40f"); grad.addColorStop(0.7, "#e67e22"); grad.addColorStop(1, "rgba(192, 57, 43, 0)");
        window.ctx.fillStyle = grad; window.ctx.shadowColor = "#f39c12"; window.ctx.shadowBlur = 25;
        window.ctx.beginPath(); window.ctx.arc(curX, curY, 28, 0, Math.PI * 2); window.ctx.fill();
        window.ctx.restore();
        if (m.progresso >= 1) {
            if (typeof window.tocarSonoroProximidade === 'function') window.tocarSonoroProximidade('mago_meteoro_impacto', m.targetX, m.targetY);
            else if (window.tocarSonoro) window.tocarSonoro('mago_meteoro_impacto');
            else if (typeof tocarSomImpactoMeteoro === 'function') tocarSomImpactoMeteoro();
            window.tremorTela = 14;
            
            if (typeof registrarDanoCausado === 'function') {
                window.listaSlimes.forEach(slime => {
                    if (slime.hp > 0 && Math.hypot(slime.x - m.targetX, slime.y - m.targetY) < 85) {
                        registrarDanoCausado(25);
                    }
                });
            }

            let particulas = [];
            for (let f = 0; f < 25; f++) {
                particulas.push({ x: m.targetX + (Math.random() * 90 - 45), y: m.targetY + (Math.random() * 40 - 20), vy: Math.random() * 1.5 + 0.8, vida: Math.random(), tamanho: Math.random() * 5 + 4, offset: Math.random() * 10, cor: Math.random() > 0.4 ? "#e67e22" : "#f1c40f" });
            }
            // Fogo no chão por 5 SEGUNDOS (300 frames @60fps) — alinhado ao `meteorFires` do servidor (+5000ms)
            let fumaçaMeteoro = [];
            for (let s = 0; s < 4; s++) {
                fumaçaMeteoro.push({ x: m.targetX + (Math.random() * 70 - 35), y: m.targetY + (Math.random() * 24 - 12), vy: Math.random() * 0.6 + 0.5, vida: Math.random(), tamanho: Math.random() * 8 + 6 });
            }
            window.chaoEmChamas.push({ x: m.targetX, y: m.targetY, duracao: 300, duracaoInicial: 300, particulasFogo: particulas, fumaça: fumaçaMeteoro });
            window.floatingTexts.push({ x: m.targetX, y: m.targetY - 30, text: "💥 METEORO! (-25)", color: "#e67e22", alpha: 1.0 });
            window.meteorosAtivos.splice(i, 1);
        }
    }
};

window.desenharEfeitosNevasca = function() {
    const ctx = window.ctx;
    if (!ctx) return;
    const agora = Date.now();

    for (let i = window.nevascasAtivas.length - 1; i >= 0; i--) {
        let n = window.nevascasAtivas[i];
        n.duracao--;
        n.rotacao += 0.04;

        const decorrido = agora - (n.startTime || agora);
        if (decorrido >= (n.duracaoMs || 8000)) {
            window.nevascasAtivas.splice(i, 1);
            continue;
        }

        // Suave fade in (400ms) e fade out nos últimos 1500ms
        const tempoRestante = (n.duracaoMs || 8000) - decorrido;
        const alphaFade = Math.min(1.0, decorrido / 400) * Math.min(1.0, tempoRestante / 1500);

        if (n.duracao <= 0) {
            window.nevascasAtivas.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = alphaFade;

        if (n.isFogo) {
            // =================================================================
            // NEVASCA DE FOGO (B1) — VÓRTICE MAGMÁTICO E CHÃO EM BRASAS
            // =================================================================
            const pulsoFogo = Math.sin(agora * 0.007) * 0.12 + 0.88;

            // 1. Iluminação térmica no solo (radial gradient incandescente)
            const gradCalor = ctx.createRadialGradient(n.x, n.y, 4, n.x, n.y, n.radius);
            gradCalor.addColorStop(0, `rgba(255, 245, 180, ${0.48 * pulsoFogo})`);
            gradCalor.addColorStop(0.35, `rgba(249, 115, 22, ${0.32 * pulsoFogo})`);
            gradCalor.addColorStop(0.70, `rgba(185, 28, 28, ${0.16 * pulsoFogo})`);
            gradCalor.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradCalor;
            ctx.beginPath();
            ctx.ellipse(n.x, n.y, n.radius, n.radius * 0.72, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. Anel de chamas ondulantes no perímetro
            ctx.save();
            ctx.translate(n.x, n.y);
            ctx.beginPath();
            for (let st = 0; st <= 48; st++) {
                const ang = (st / 48) * Math.PI * 2;
                const onda = Math.sin(ang * 6 + n.rotacao * 2) * 5 + Math.sin(ang * 12 - n.rotacao) * 2;
                const r = (n.radius * 0.95) + onda;
                const px = Math.cos(ang) * r;
                const py = Math.sin(ang) * (r * 0.72);
                if (st === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(249, 115, 22, ${0.65 * pulsoFogo})`;
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 14;
            ctx.stroke();

            // 3. Faixas espirais de fogo giratório
            for (let s = 0; s < 3; s++) {
                const offAng = n.rotacao + (s * (Math.PI * 2 / 3));
                ctx.beginPath();
                ctx.ellipse(0, 0, n.radius * 0.65, n.radius * 0.45, offAng, 0, 1.4);
                ctx.strokeStyle = `rgba(254, 240, 138, ${0.65 * pulsoFogo})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 10;
                ctx.stroke();
            }
            ctx.restore();

            // 4. Partículas de fogo e brasas incandescentes
            for (let p of n.particulas) {
                p.angle += p.speed;
                p.dist += Math.sin(p.angle * 3) * 0.45;
                if (p.dist > n.radius * 0.95) p.dist = 12;

                const px = n.x + Math.cos(p.angle) * p.dist;
                const py = n.y + Math.sin(p.angle) * (p.dist * 0.72) - (p.driftY || 0.5) * 8;

                ctx.fillStyle = p.color;
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(px, py, p.size * (0.8 + Math.sin(agora * 0.01 + p.angle) * 0.2), 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // =================================================================
            // NEVASCA GLACIAL (SIDE A) — BLIZZARD DE GELO CRISTALINO & RUNAS
            // =================================================================
            const pulsoGelo = Math.sin(agora * 0.005) * 0.10 + 0.90;

            // 1. Campo térmico gélido (glaze radial)
            const gradGelo = ctx.createRadialGradient(n.x, n.y, 4, n.x, n.y, n.radius);
            gradGelo.addColorStop(0, `rgba(240, 249, 255, ${0.40 * pulsoGelo})`);
            gradGelo.addColorStop(0.35, `rgba(56, 189, 248, ${0.25 * pulsoGelo})`);
            gradGelo.addColorStop(0.75, `rgba(2, 132, 199, ${0.12 * pulsoGelo})`);
            gradGelo.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradGelo;
            ctx.beginPath();
            ctx.ellipse(n.x, n.y, n.radius, n.radius * 0.72, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. Anel de geada com espículas de gelo no perímetro
            ctx.save();
            ctx.translate(n.x, n.y);
            ctx.beginPath();
            for (let st = 0; st <= 48; st++) {
                const ang = (st / 48) * Math.PI * 2;
                const espicula = (st % 4 === 0) ? 6 : (st % 2 === 0 ? -3 : 0);
                const r = (n.radius * 0.95) + espicula;
                const px = Math.cos(ang) * r;
                const py = Math.sin(ang) * (r * 0.72);
                if (st === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(186, 230, 253, ${0.60 * pulsoGelo})`;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.stroke();

            // 3. Arcos de vento glacial concêntricos girando
            for (let s = 0; s < 3; s++) {
                const offAng = n.rotacao + (s * (Math.PI * 2 / 3));
                ctx.beginPath();
                ctx.ellipse(0, 0, n.radius * 0.68, n.radius * 0.48, offAng, 0, 1.5);
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * pulsoGelo})`;
                ctx.lineWidth = 2.2;
                ctx.shadowColor = '#bae6fd';
                ctx.shadowBlur = 8;
                ctx.stroke();
            }

            // 4. Cristais de gelo nos eixos cardinais (Runas glaciais)
            for (let k = 0; k < 4; k++) {
                const rAng = n.rotacao * 0.5 + (Math.PI / 2) * k;
                const rx = Math.cos(rAng) * (n.radius * 0.82);
                const ry = Math.sin(rAng) * (n.radius * 0.58);

                ctx.save();
                ctx.translate(rx, ry);
                ctx.rotate(rAng);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
                ctx.moveTo(0, -5); ctx.lineTo(0, 5);
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();

            // 5. Flocos de neve cristalinos e poeira glacial
            for (let p of n.particulas) {
                p.angle += p.speed;
                p.dist += Math.sin(p.angle * 3) * 0.4;
                if (p.dist > n.radius * 0.95) p.dist = 10;

                const px = n.x + Math.cos(p.angle) * p.dist;
                const py = n.y + Math.sin(p.angle) * (p.dist * 0.72);

                if (p.isSnowflake) {
                    // Floco de neve estrelado
                    ctx.save();
                    ctx.translate(px, py);
                    ctx.rotate(p.angle * 2);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0);
                    ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size);
                    ctx.stroke();
                    ctx.restore();
                } else {
                    ctx.fillStyle = p.color;
                    ctx.shadowColor = '#38bdf8';
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(px, py, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }
};

// Renderizador de Estalagmites / Rochas Pontudas 3D que irrompem do solo
function _desenharRochaPontudaSalto(ctx, spike, progress, elapsedMs, alphaGeral) {
    if (elapsedMs < spike.delay) return; // aguarda o delay da cascata

    const tSpike = elapsedMs - spike.delay;
    let alturaRatio = 1.0;
    
    // Fase 1: Emergência explosiva do chão (0 a 160ms)
    if (tSpike < 160) {
        const pEmerge = tSpike / 160;
        // easeOutBack: erupção violenta com overshoot
        const c1 = 1.70158;
        const c3 = c1 + 1;
        alturaRatio = 1 + c3 * Math.pow(pEmerge - 1, 3) + c1 * Math.pow(pEmerge - 1, 2);
        alturaRatio = Math.max(0, Math.min(1.15, alturaRatio));
    } 
    // Fase 2: Cravada de pé no solo (160ms a 1600ms)
    else if (tSpike < 1600) {
        alturaRatio = 1.0;
    }
    // Fase 3: Esfarela e afunda suavemente de volta à terra (1600ms a 2200ms)
    else {
        const pAfunda = (tSpike - 1600) / 600;
        alturaRatio = Math.max(0, 1.0 - Math.pow(pAfunda, 2));
    }

    if (alturaRatio <= 0.01) return;

    const hAtual = spike.alturaMax * alturaRatio;
    const wBase = spike.largura;

    ctx.save();
    ctx.translate(spike.x, spike.y);
    ctx.rotate(spike.inclinacao);

    // Sombra da rocha projetada no solo
    ctx.save();
    ctx.fillStyle = 'rgba(10, 6, 18, ' + (0.45 * alphaGeral).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(0, 4, wBase * 0.75, wBase * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sombra do corpo do espigão projetada lateralmente
    ctx.save();
    ctx.fillStyle = 'rgba(8, 4, 15, ' + (0.35 * alphaGeral).toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(-wBase * 0.5, 2);
    ctx.lineTo(wBase * 0.5, 2);
    ctx.lineTo(wBase * 0.6 + hAtual * 0.35, 6 + hAtual * 0.2);
    ctx.lineTo(-wBase * 0.2 + hAtual * 0.35, 6 + hAtual * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const pontaX = spike.desvioPonta || 0;
    const pontaY = -hAtual;
    const cristaX = pontaX * 0.5;
    const cristaY = pontaY * 0.85;

    // FACETA ESQUERDA ILUMINADA
    let gEsq = ctx.createLinearGradient(-wBase * 0.6, 0, pontaX, pontaY);
    gEsq.addColorStop(0, spike.corEscura);
    gEsq.addColorStop(0.5, spike.corMedia);
    gEsq.addColorStop(1, spike.corClara);
    ctx.fillStyle = gEsq;
    ctx.strokeStyle = spike.corSombra;
    ctx.lineWidth = 1.3;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-wBase * 0.55, 0);
    ctx.lineTo(-wBase * 0.35, pontaY * 0.45);
    ctx.lineTo(pontaX, pontaY);
    ctx.lineTo(cristaX, cristaY * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Filete de luz na aresta iluminada esquerda
    ctx.strokeStyle = 'rgba(235, 215, 255, ' + (0.45 * alphaGeral).toFixed(3) + ')';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-wBase * 0.35, pontaY * 0.45);
    ctx.lineTo(pontaX, pontaY);
    ctx.stroke();

    // FACETA DIREITA EM SOMBRA PROFUNDA
    let gDir = ctx.createLinearGradient(0, 0, wBase * 0.6, pontaY);
    gDir.addColorStop(0, spike.corEscura);
    gDir.addColorStop(0.7, spike.corSombra);
    gDir.addColorStop(1, spike.corMedia);
    ctx.fillStyle = gDir;
    ctx.strokeStyle = spike.corSombra;
    ctx.lineWidth = 1.3;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(wBase * 0.55, 0);
    ctx.lineTo(wBase * 0.4, pontaY * 0.4);
    ctx.lineTo(pontaX, pontaY);
    ctx.lineTo(cristaX, cristaY * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Aresta central afiada com destaque 3D
    ctx.strokeStyle = spike.corSombra;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cristaX, cristaY * 0.5);
    ctx.lineTo(pontaX, pontaY);
    ctx.stroke();

    // Fenda rúnica de energia violeta/arcana pulsando na rocha
    const pulsoRuna = 0.7 + Math.sin(tSpike * 0.008) * 0.3;
    ctx.save();
    ctx.strokeStyle = spike.fendaLuz;
    ctx.shadowColor = spike.fendaLuz;
    ctx.shadowBlur = 8 * pulsoRuna * alphaGeral;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-wBase * 0.15, pontaY * 0.2);
    ctx.lineTo(-wBase * 0.05, pontaY * 0.45);
    ctx.lineTo(pontaX * 0.8, pontaY * 0.75);
    ctx.stroke();
    ctx.restore();

    // Monte de terra revolvida na base
    ctx.fillStyle = 'rgba(40, 28, 55, ' + (0.9 * alphaGeral).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(0, 2, wBase * 0.65, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cascalhos ao redor da base
    ctx.fillStyle = spike.corMedia;
    ctx.fillRect(-wBase * 0.5, 0, 3, 3);
    ctx.fillRect(wBase * 0.38, -1, 3.5, 2.5);
    ctx.fillRect(-wBase * 0.1, 3, 2.5, 2.5);

    ctx.restore();
}

// Exportações globais para efeitos de solo e espigões telúricos (compartilhados com Skill 4 do Summoner)
window.gerarRachadurasRealistasSismicas = _gerarRachadurasRealistasSismicas;
window.desenharRochaPontudaSalto = _desenharRochaPontudaSalto;

window.desenharEfeitosSismicos = function() {
    if (!window.ctx) return;
    const ctx = window.ctx;

    // 1. SKILL 1: IMPACTOS SÍSMICOS (Rachaduras Realistas no Chão)
    for (let i = window.impactosSismicos.length - 1; i >= 0; i--) {
        let imp = window.impactosSismicos[i];
        imp.idade = (imp.idade || 0) + 1;
        // Guarda de segurança: impactos sem vida válida recebem default para não expandir infinitamente
        if (!imp.vida || imp.vida <= 0) imp.vida = 50;
        imp.raioOnda += 2.2;
        // Cap: não ultrapassar raioMax (evita expansão infinita visual)
        if (imp.raioMax && imp.raioOnda > imp.raioMax * 1.5) imp.raioOnda = imp.raioMax * 1.5;
        const prog = Math.min(1, imp.idade / imp.vida);
        imp.alpha = Math.max(0, 1 - prog);

        if (imp.alpha <= 0) {
            window.impactosSismicos.splice(i, 1);
            continue;
        }

        ctx.save();

        // Se tiver ramos procedurais realistas:
        if (imp.ramos && imp.ramos.length > 0) {
            const easedExp = Math.min(1, imp.idade / 7);

            // Onda de choque elíptica
            ctx.save();
            ctx.strokeStyle = "rgba(184, 120, 255, " + (imp.alpha * 0.75).toFixed(3) + ")";
            ctx.lineWidth = 3.5;
            ctx.shadowColor = "#9b4dff";
            ctx.shadowBlur = 10 * imp.alpha;
            ctx.beginPath();
            ctx.ellipse(imp.x, imp.y + 8, imp.raioOnda * 1.1, imp.raioOnda * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Placas de solo levantadas
            if (imp.lajes) {
                for (let l of imp.lajes) {
                    ctx.save();
                    ctx.translate(imp.x + l.x, imp.y + l.y);
                    ctx.rotate(l.ang);
                    ctx.fillStyle = l.cor;
                    ctx.strokeStyle = '#181224';
                    ctx.lineWidth = 1.4;
                    ctx.fillRect(-l.w / 2, -l.h / 2, l.w, l.h);
                    ctx.strokeRect(-l.w / 2, -l.h / 2, l.w, l.h);
                    ctx.restore();
                }
            }

            // Fissuras profundas realistas no solo (3 camadas de profundidade)
            ctx.save();
            ctx.translate(imp.x, imp.y);

            // Camada 1: Trincheira funda / Sombra de solo partido
            ctx.strokeStyle = 'rgba(12, 8, 20, ' + (0.95 * imp.alpha).toFixed(3) + ')';
            ctx.lineWidth = 5.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'miter';
            ctx.beginPath();
            for (let r of imp.ramos) {
                const maxPts = Math.max(2, Math.floor(r.pontos.length * easedExp));
                ctx.moveTo(r.pontos[0].x, r.pontos[0].y);
                for (let k = 1; k < maxPts; k++) ctx.lineTo(r.pontos[k].x, r.pontos[k].y);
                for (let sb of r.subRamos) {
                    const maxSb = Math.max(2, Math.floor(sb.length * easedExp));
                    ctx.moveTo(sb[0].x, sb[0].y);
                    for (let sk = 1; sk < maxSb; sk++) ctx.lineTo(sb[sk].x, sb[sk].y);
                }
            }
            ctx.stroke();

            // Camada 2: Paredes rochosas internas
            ctx.strokeStyle = 'rgba(60, 46, 78, ' + (0.85 * imp.alpha).toFixed(3) + ')';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            for (let r of imp.ramos) {
                const maxPts = Math.max(2, Math.floor(r.pontos.length * easedExp));
                ctx.moveTo(r.pontos[0].x, r.pontos[0].y);
                for (let k = 1; k < maxPts; k++) ctx.lineTo(r.pontos[k].x, r.pontos[k].y);
            }
            ctx.stroke();

            // Camada 3: Veio de energia sísmica brilhante interior
            ctx.strokeStyle = 'rgba(192, 132, 252, ' + (0.90 * imp.alpha).toFixed(3) + ')';
            ctx.lineWidth = 1.6;
            ctx.shadowColor = '#b878ff';
            ctx.shadowBlur = 8 * imp.alpha;
            ctx.beginPath();
            for (let r of imp.ramos) {
                const maxPts = Math.max(2, Math.floor(r.pontos.length * easedExp));
                ctx.moveTo(r.pontos[0].x, r.pontos[0].y);
                for (let k = 1; k < maxPts; k++) ctx.lineTo(r.pontos[k].x, r.pontos[k].y);
            }
            ctx.stroke();
            ctx.restore();

        } else {
            // Fallback para impactos simples (ex: rugido)
            let corOnda = imp.cor ? (imp.cor + imp.alpha + ")") : ("rgba(211, 84, 0, " + imp.alpha + ")");
            ctx.strokeStyle = corOnda; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(imp.x, imp.y, imp.raioOnda, 0, Math.PI * 2); ctx.stroke();
            if (imp.rachaduras && imp.rachaduras.length > 0) {
                ctx.strokeStyle = "rgba(20, 10, 5, " + (imp.alpha + 0.2) + ")"; ctx.lineWidth = 3; ctx.beginPath();
                for (let rach of imp.rachaduras) { ctx.moveTo(imp.x, imp.y); ctx.lineTo(imp.x + rach.x2 * (imp.raioOnda / imp.raioMax), imp.y + rach.y2 * (imp.raioOnda / imp.raioMax)); }
                ctx.stroke();
            }
        }

        // Detritos e pedregulhos ejetados com física parabólica
        if (imp.pedras) {
            for (let ped of imp.pedras) {
                ped.x += ped.vx;
                ped.y += ped.vy;
                ped.vy += 0.24; // gravidade
                ped.vida -= 0.024;
                if (ped.vida > 0) {
                    ctx.fillStyle = ped.cor || ("rgba(100, 90, 80, " + ped.vida + ")");
                    ctx.fillRect(ped.x, ped.y, ped.tamanho, ped.tamanho);
                }
            }
        }
        ctx.restore();
    }

    // 2. SKILL 2: ATERRISSAGEM DO SALTO (Trincados Exagerados + Rochas Pontudas 3D)
    if (window.aterrissagensSaltoGolem) {
        for (let i = window.aterrissagensSaltoGolem.length - 1; i >= 0; i--) {
            const aterr = window.aterrissagensSaltoGolem[i];
            aterr.idade += 16.67;
            const progress = Math.min(1, aterr.idade / aterr.vida);
            const alphaGeral = Math.max(0, 1 - progress);

            if (progress >= 1) {
                window.aterrissagensSaltoGolem.splice(i, 1);
                continue;
            }

            ctx.save();
            const easedExp = Math.min(1, aterr.idade / 150);

            // Flash inicial e onda de choque sísmica dupla
            if (aterr.idade < 320) {
                const pFlash = aterr.idade / 320;
                ctx.save();
                const gFlash = ctx.createRadialGradient(aterr.x, aterr.y + 8, 4, aterr.x, aterr.y + 8, 70 * (1 - pFlash));
                gFlash.addColorStop(0, 'rgba(235, 200, 255, ' + (0.7 * (1 - pFlash)).toFixed(3) + ')');
                gFlash.addColorStop(1, 'rgba(184, 120, 255, 0)');
                ctx.fillStyle = gFlash;
                ctx.beginPath();
                ctx.ellipse(aterr.x, aterr.y + 8, 75 * (1 - pFlash), 45 * (1 - pFlash), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Anel duplo de onda de choque expansiva
            const raioOnda1 = 15 + aterr.raioMax * Math.min(1, aterr.idade / 400);
            ctx.save();
            ctx.strokeStyle = 'rgba(217, 130, 250, ' + (0.85 * alphaGeral).toFixed(3) + ')';
            ctx.lineWidth = 4.2;
            ctx.shadowColor = '#d980fa';
            ctx.shadowBlur = 12 * alphaGeral;
            ctx.beginPath();
            ctx.ellipse(aterr.x, aterr.y + 12, raioOnda1, raioOnda1 * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Cortina de poeira e terra espessa levantada
            ctx.strokeStyle = 'rgba(140, 115, 160, ' + (0.45 * alphaGeral).toFixed(3) + ')';
            ctx.lineWidth = 7.5;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.ellipse(aterr.x, aterr.y + 12, raioOnda1 * 0.88, raioOnda1 * 0.58, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Placas gigantescas de rocha deslocadas ao redor do epicentro
            if (aterr.lajes) {
                for (let l of aterr.lajes) {
                    ctx.save();
                    ctx.translate(aterr.x + l.x, aterr.y + l.y);
                    ctx.rotate(l.ang);
                    ctx.fillStyle = l.cor;
                    ctx.strokeStyle = '#181024';
                    ctx.lineWidth = 1.8;
                    ctx.fillRect(-l.w / 2, -l.h / 2, l.w, l.h);
                    ctx.strokeRect(-l.w / 2, -l.h / 2, l.w, l.h);
                    ctx.restore();
                }
            }

            // RACHADURAS EXAGERADAS NO CHÃO (16 ramificações + 3 anéis concêntricos fraturados)
            ctx.save();
            ctx.translate(aterr.x, aterr.y);

            // Camada 1: Trincheira colossal abissal
            ctx.strokeStyle = 'rgba(10, 6, 18, ' + (0.98 * alphaGeral).toFixed(3) + ')';
            ctx.lineWidth = 6.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'miter';
            ctx.beginPath();
            for (let r of aterr.ramos) {
                const maxPts = Math.max(2, Math.floor(r.pontos.length * easedExp));
                ctx.moveTo(r.pontos[0].x, r.pontos[0].y);
                for (let k = 1; k < maxPts; k++) ctx.lineTo(r.pontos[k].x, r.pontos[k].y);
                for (let sb of r.subRamos) {
                    const maxSb = Math.max(2, Math.floor(sb.length * easedExp));
                    ctx.moveTo(sb[0].x, sb[0].y);
                    for (let sk = 1; sk < maxSb; sk++) ctx.lineTo(sb[sk].x, sb[sk].y);
                }
            }
            // 3 anéis concêntricos de solo estilhaçado conectando as fissuras
            for (let anelR of [35, 75, 115]) {
                const aRaio = anelR * easedExp;
                ctx.moveTo(aRaio, 0);
                ctx.ellipse(0, 6, aRaio, aRaio * 0.62, 0, 0, Math.PI * 2);
            }
            ctx.stroke();

            // Camada 2: Rocha fraturada interna
            ctx.strokeStyle = 'rgba(65, 45, 90, ' + (0.85 * alphaGeral).toFixed(3) + ')';
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            for (let r of aterr.ramos) {
                const maxPts = Math.max(2, Math.floor(r.pontos.length * easedExp));
                ctx.moveTo(r.pontos[0].x, r.pontos[0].y);
                for (let k = 1; k < maxPts; k++) ctx.lineTo(r.pontos[k].x, r.pontos[k].y);
            }
            ctx.stroke();

            // Camada 3: Veio de magma arcano/sísmico luminoso incandescente
            ctx.strokeStyle = 'rgba(224, 86, 253, ' + (0.95 * alphaGeral).toFixed(3) + ')';
            ctx.lineWidth = 1.8;
            ctx.shadowColor = '#d980fa';
            ctx.shadowBlur = 12 * alphaGeral;
            ctx.beginPath();
            for (let r of aterr.ramos) {
                const maxPts = Math.max(2, Math.floor(r.pontos.length * easedExp));
                ctx.moveTo(r.pontos[0].x, r.pontos[0].y);
                for (let k = 1; k < maxPts; k++) ctx.lineTo(r.pontos[k].x, r.pontos[k].y);
            }
            ctx.stroke();
            ctx.restore();

            // ROCHAS PONTUDAS SAINDO DO CHÃO (8 a 10 Estalagmites Telúricas em 3D)
            if (aterr.rochasPontudas) {
                for (let spike of aterr.rochasPontudas) {
                    _desenharRochaPontudaSalto(ctx, spike, progress, aterr.idade, alphaGeral);
                }
            }

            // Detritos de pedra voando alto e caindo
            if (aterr.pedras) {
                for (let ped of aterr.pedras) {
                    ped.x += ped.vx;
                    ped.y += ped.vy;
                    ped.vy += 0.28;
                    ped.vida -= 0.016;
                    if (ped.vida > 0) {
                        ctx.fillStyle = ped.cor;
                        ctx.strokeStyle = '#1a1226';
                        ctx.lineWidth = 0.8;
                        ctx.fillRect(ped.x, ped.y, ped.tamanho, ped.tamanho);
                        ctx.strokeRect(ped.x, ped.y, ped.tamanho, ped.tamanho);
                    }
                }
            }

            ctx.restore();
        }
    }

    // 3. ARCO DE VOO DO SALTO DO GOLEM
    for (let i = window.saltosOgroAtivos.length - 1; i >= 0; i--) {
        let salto = window.saltosOgroAtivos[i];
        salto.progresso += salto.velocidade;

        let curX = salto.startX + (salto.targetX - salto.startX) * Math.min(salto.progresso, 1.0); 
        let curY = salto.startY + (salto.targetY - salto.startY) * Math.min(salto.progresso, 1.0);
        let alturaArco = Math.sin(Math.min(salto.progresso, 1.0) * Math.PI) * 75;

        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(curX, curY + 16, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(curX, curY - alturaArco);
        if (typeof window.desenharCorpoGolem === "function") {
            window.desenharCorpoGolem(0, 0, 1);
        } else {
            ctx.fillStyle = "#784212"; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#566573"; ctx.fillRect(-16, -9, 9, 6); ctx.fillRect(7, -9, 9, 6);
            ctx.fillStyle = "#f1c40f"; ctx.fillRect(-4, -14, 3, 3); ctx.fillRect(2, -14, 3, 3);
        }
        ctx.restore();

        // Ao tocar o solo, dispara a aterrissagem exagerada com rochas pontudas
        if (salto.progresso >= 1.0) {
            window.criarEfeitoAterrissagemSaltoGolem(salto.targetX, salto.targetY); 
            window.saltosOgroAtivos.splice(i, 1);
        }
    }
};

// RENDERIZAÇÃO DO SMART CAST UNIFICADO NO CHÃO (PC e MOBILE)
window.desenharMiraArcana = function() {
    if (window.estaMorto || !window.ctx) return;
    let pX = window.meuX + 12;
    let pY = window.meuY + 16;

    // 1. SMART CAST ATIVO (mira pelo mouse no PC ou toggle)
    let mira = (typeof window.obterInfoMiraAtiva === 'function') ? window.obterInfoMiraAtiva() : null;

    // Se estiver em drag no celular, prioriza a posição de arrasto
    if (window.dragSkill && window.dragSkill.ativo && window.SKILLS_DRAG && window.SKILLS_DRAG[window.dragSkill.skill]) {
        let cfg = window.SKILLS_DRAG[window.dragSkill.skill];
        mira = {
            skill: window.dragSkill.skill,
            cfg: cfg,
            pX: pX,
            pY: pY,
            tx: window.dragSkill.x,
            ty: window.dragSkill.y,
            dist: Math.hypot(window.dragSkill.x - pX, window.dragSkill.y - pY)
        };
    }

    if (mira) {
        let cfg = mira.cfg || {};
        let tx = mira.tx, ty = mira.ty;
        let cor = cfg.cor || '#00ffff';
        let raio = cfg.raio || 75;
        let alcanceMax = cfg.alcanceMax || 350;
        let nome = cfg.nome || '🎯 HABILIDADE';

        window.ctx.save();

        // 1. CÍRCULO DO ALCANCE MÁXIMO DA SKILL AO REDOR DO JOGADOR
        window.ctx.beginPath();
        window.ctx.arc(pX, pY, alcanceMax, 0, Math.PI * 2);
        window.ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        window.ctx.fill();
        window.ctx.setLineDash([8, 8]);
        window.ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        window.ctx.lineWidth = 2;
        window.ctx.stroke();

        // 2. LINHA GUIA TRAJETÓRIA ATÉ O PONTO MIRADO
        window.ctx.beginPath();
        window.ctx.moveTo(pX, pY);
        window.ctx.lineTo(tx, ty);
        window.ctx.strokeStyle = cor;
        window.ctx.lineWidth = 2.5;
        window.ctx.setLineDash([6, 6]);
        window.ctx.stroke();

        // 3. CÍRCULO DE ÁREA DE EFEITO (AOE) EXATO SOBRE O MOUSE
        window.ctx.setLineDash([]);
        let pulso = Math.sin(Date.now() / 200) * 3;
        window.ctx.beginPath();
        window.ctx.arc(tx, ty, Math.max(10, raio + pulso), 0, Math.PI * 2);
        window.ctx.fillStyle = cor + "26"; // ~15% opacidade
        window.ctx.fill();
        window.ctx.strokeStyle = cor;
        window.ctx.lineWidth = 3.5;
        window.ctx.shadowColor = cor;
        window.ctx.shadowBlur = 14;
        window.ctx.stroke();

        // Ponto de retículo central
        window.ctx.beginPath();
        window.ctx.arc(tx, ty, 4.5, 0, Math.PI * 2);
        window.ctx.fillStyle = "#ffffff";
        window.ctx.fill();

        // Rótulo da habilidade
        window.ctx.font = "bold 12px Arial";
        window.ctx.textAlign = "center";
        window.ctx.fillStyle = "#ffffff";
        window.ctx.shadowColor = "#000000";
        window.ctx.shadowBlur = 6;
        window.ctx.fillText(nome, tx, ty - raio - 8);

        window.ctx.restore();
        return;
    }

    // Mira padrão com alvo fixado (auto-mira) para as classes de longo alcance
    let cMira = window.minhaClasse;
    if (cMira === 'mago' || cMira === 'summoner' || cMira === 'arqueiro' || cMira === 'curandeiro' || cMira === 'roqueiro') {
        let alvo = (typeof obterAlvoNaMira === 'function') ? obterAlvoNaMira() : null;
        window.ctx.save();
        window.ctx.setLineDash([6, 8]); window.ctx.lineWidth = 2; window.ctx.shadowBlur = 8;
        let corGuia, corReticulo;
        if (cMira === 'summoner') { corGuia = "rgba(39, 174, 96, 0.75)"; corReticulo = "#2ecc71"; }
        else if (cMira === 'arqueiro') { corGuia = "rgba(26, 188, 156, 0.75)"; corReticulo = "#1abc9c"; }
        else if (cMira === 'curandeiro') { corGuia = "rgba(241, 196, 15, 0.75)"; corReticulo = "#f1c40f"; }
        else if (cMira === 'roqueiro') { corGuia = "rgba(230, 126, 34, 0.75)"; corReticulo = "#e67e22"; }
        else { corGuia = "rgba(0, 255, 255, 0.75)"; corReticulo = "#9b59b6"; }

        if (alvo) {
            window.ctx.strokeStyle = corGuia; window.ctx.shadowColor = corReticulo;
            window.ctx.beginPath(); window.ctx.moveTo(pX, pY); window.ctx.lineTo(alvo.x, alvo.y); window.ctx.stroke();
            window.ctx.setLineDash([]); window.ctx.strokeStyle = corReticulo; window.ctx.lineWidth = 3;
            window.ctx.beginPath(); window.ctx.arc(alvo.x, alvo.y, 22, 0, Math.PI * 2); window.ctx.stroke();
        } else {
            window.ctx.strokeStyle = "rgba(155, 89, 182, 0.45)"; window.ctx.shadowColor = "#9b59b6";
            let alcanceLivre = 180;
            let miraX = pX + Math.cos(window.meuAngulo) * alcanceLivre;
            let miraY = pY + Math.sin(window.meuAngulo) * alcanceLivre;
            window.ctx.beginPath(); window.ctx.moveTo(pX, pY); window.ctx.lineTo(miraX, miraY); window.ctx.stroke();
            window.ctx.setLineDash([]); window.ctx.fillStyle = corGuia;
            window.ctx.beginPath(); window.ctx.arc(miraX, miraY, 4, 0, Math.PI * 2); window.ctx.fill();
        }
        window.ctx.restore();
    }
};

// Projéteis dos jogadores (visual por classe) - chamado no loop do index.html
window.trailProjeteis = [];
window.desenharPlayerProjetil = function(pp) {
    if (!window.ctx || !pp) return;
    let ctx = window.ctx;
    let tipo = pp.tipo || ('normal');
    if (tipo === 'arqueiro_perfurante') return;
    let ang = Math.atan2(pp.vy || 0, pp.vx || 1);

    let corRastro = (tipo === 'magia') ? '#9b59b6' : (tipo === 'orbe') ? '#2ecc71' : (tipo === 'sagrado') ? '#f1c40f' : (tipo === 'riff') ? '#e67e22' : (tipo === 'dm_laser' || tipo === 'dm_tita_laser') ? '#00ffff' : (tipo === 'sniper_tiro' || tipo === 'sniper_super') ? '#ffe08a' : (tipo === 'flecha_arcana') ? '#f39c12' : '#f39c12';
    window.trailProjeteis.push({ x: pp.x, y: pp.y, cor: corRastro, vida: 1.0 });
    for (let i = window.trailProjeteis.length - 1; i >= 0; i--) { let t = window.trailProjeteis[i]; t.vida -= 0.08; if (t.vida <= 0) window.trailProjeteis.splice(i, 1); }
    window.trailProjeteis.forEach(t => { ctx.save(); ctx.globalAlpha = t.vida * 0.35; ctx.fillStyle = t.cor; ctx.beginPath(); ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });

    ctx.save();
    if (tipo === 'magia') {
        let pulso = 1 + Math.sin((pp.vida || 1) * 0.5) * 0.2;
        ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(155,89,182,0.45)'; ctx.beginPath(); ctx.arc(pp.x, pp.y, 10 * pulso, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00ffff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(pp.x, pp.y, 5.5 * pulso, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 4; k++) { let a = (pp.vida || 1) * 0.9 + k * 1.5708; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(pp.x + Math.cos(a) * 11 * pulso, pp.y + Math.sin(a) * 11 * pulso, 1.6, 0, Math.PI * 2); ctx.fill(); }
    } else if (tipo === 'flecha') {
        ctx.translate(pp.x, pp.y); ctx.rotate(ang);
        ctx.shadowColor = '#f39c12'; ctx.shadowBlur = 6;
        ctx.fillStyle = '#d35400'; ctx.fillRect(-8, -1.5, 14, 3);
        ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.moveTo(6, -3.5); ctx.lineTo(13, 0); ctx.lineTo(6, 3.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ecf0f1'; ctx.fillRect(-8, -3, 3, 1.5); ctx.fillRect(-8, 1.5, 3, 1.5);
    } else if (tipo === 'riff') {
        ctx.translate(pp.x, pp.y); ctx.rotate(Math.sin((pp.vida || 1) * 0.4) * 0.3);
        ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = '#e67e22'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffd700'; ctx.fillText('🎵', 0, 0);
        ctx.font = '11px Arial'; ctx.globalAlpha = 0.6; ctx.fillText('♪', -11, -7);
    } else if (tipo === 'sagrado') {
        ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pp.x, pp.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pp.x, pp.y, 11, (pp.vida || 1) * 0.3, (pp.vida || 1) * 0.3 + 4.2); ctx.stroke();
    } else if (tipo === 'orbe') {
        ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(pp.x, pp.y, 6, 0, Math.PI * 2); ctx.fill();
    } else if (tipo === 'dm_laser') {
        // Tiro de energia do Drone (DroneMaster)
        let pulso = 1 + Math.sin((pp.vida || 1) * 0.7) * 0.2;
        ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 16;
        ctx.strokeStyle = 'rgba(0,255,255,0.5)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(pp.x - 5, pp.y); ctx.lineTo(pp.x + 5, pp.y); ctx.stroke();
        ctx.fillStyle = '#d9ffff';
        ctx.beginPath(); ctx.arc(pp.x, pp.y, 5.5 * pulso, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath(); ctx.arc(pp.x, pp.y, 3.4 * pulso, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 3; k++) {
            let a = (pp.vida || 1) * 0.8 + k * 2.1;
            ctx.fillStyle = 'rgba(0,229,255,0.9)';
            ctx.beginPath(); ctx.arc(pp.x + Math.cos(a) * 8 * pulso, pp.y + Math.sin(a) * 8 * pulso, 1.4, 0, Math.PI * 2); ctx.fill();
        }
    } else if (tipo === 'dm_tita_laser') {
        // Laser da Forma Titã (DroneMaster robô)
        let pulso = 1 + Math.sin((pp.vida || 1) * 0.6) * 0.2;
        ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(155,89,182,0.55)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(pp.x - 8, pp.y); ctx.lineTo(pp.x + 8, pp.y); ctx.stroke();
        ctx.fillStyle = '#e8d9ff';
        ctx.beginPath(); ctx.arc(pp.x, pp.y, 8 * pulso, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath(); ctx.arc(pp.x, pp.y, 5 * pulso, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 4; k++) {
            let a = (pp.vida || 1) * 0.7 + k * 1.57;
            ctx.fillStyle = 'rgba(168,120,255,0.9)';
            ctx.beginPath(); ctx.arc(pp.x + Math.cos(a) * 12 * pulso, pp.y + Math.sin(a) * 12 * pulso, 1.8, 0, Math.PI * 2); ctx.fill();
        }
    } else if (tipo === 'flecha_astral' || tipo === 'flecha_arcana') {
        // Disparo Estelar (Arqueiro Astral): flecha-cometa de luz com cauda cósmica
        let corEstelar = pp.cor || '#fff6c2';
        ctx.translate(pp.x, pp.y); ctx.rotate(ang);
        // cauda do cometa (fumaça de estrelas, se afinando)
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 5;
        ctx.shadowColor = '#c39bff'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-24, 0); ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = corEstelar; ctx.lineWidth = 2.2;
        ctx.shadowColor = corEstelar; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(7, 0); ctx.stroke();
        // coração do cometa (ponta da estrela)
        ctx.fillStyle = '#fff6c2'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(7, -4.2); ctx.lineTo(16, 0); ctx.lineTo(7, 4.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = corEstelar; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(2, 0, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(2, 0, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (tipo === 'sniper_tiro') {
        // Traçador longo do Tiro de Barrett (perfurante)
        let comp = Math.hypot(pp.vx || 0, pp.vy || 0) || 300;
        ctx.save();
        ctx.translate(pp.x, pp.y);
        ctx.rotate(ang);
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3;
        ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(34, 0); ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(40, 0); ctx.stroke();
        ctx.restore();
    } else if (tipo === 'sniper_super') {
        // Super tiro (3x) do Disparo Supremo
        ctx.save();
        ctx.translate(pp.x, pp.y);
        ctx.rotate(ang);
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
        ctx.shadowColor = '#ffe08a'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(60, 0); ctx.stroke();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(70, 0); ctx.stroke();
        ctx.restore();
    } else {
        ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(pp.x, pp.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
};

// ===== MARCADOR VERMELHO DO DRAG TO CAST =====
window.desenharMarcadorDrag = function() {
    let d = window.dragSkill;
    if (!d || !d.ativo || window.estaMorto) return;
    let cfg = window.SKILLS_DRAG && window.SKILLS_DRAG[d.skill];
    if (!cfg) return;
    let ctx = window.ctx;
    let raio = cfg.raio;
    let pt = 60 + Math.sin(Date.now() / 90) * 12;

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, raio, raio, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#ff2020";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, raio, raio, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffdddd";
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, raio + 6, raio + 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // alvo central
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff3030";
    ctx.beginPath();
    ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(d.x - pt, d.y); ctx.lineTo(d.x - 10, d.y);
    ctx.moveTo(d.x + 10, d.y); ctx.lineTo(d.x + pt, d.y);
    ctx.moveTo(d.x, d.y - pt); ctx.lineTo(d.x, d.y - 10);
    ctx.moveTo(d.x, d.y + 10); ctx.lineTo(d.x, d.y + pt);
    ctx.stroke();

    // raio limite a partir do jogador
    ctx.globalAlpha = 0.28;
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = "#ff7070";
    ctx.beginPath();
    ctx.ellipse(window.meuX + 12, window.meuY + 16, cfg.alcanceMax, cfg.alcanceMax, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
};

// ===== PINOS DE LOCALIZAÇÃO (X Y) =====
window.desenharPinosLocalizacao = function() {
    let ctx = window.ctx;
    let t = Date.now() / 220;
    window.pinosLocalizacao.forEach((p, i) => {
        let s = 1 + Math.sin(t + i * 2) * 0.08;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(s, s);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#f1c40f";
        ctx.beginPath();
        ctx.ellipse(0, 10, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#f39c12";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#f1c40f";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(8, 0); ctx.lineTo(0, 6); ctx.lineTo(-8, 0); ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = "#f1c40f";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = "bold 11px Arial";
        ctx.fillStyle = "#fff";
        ctx.fillText("X:" + Math.round(p.x) + " Y:" + Math.round(p.y), -34, -18);
        ctx.restore();
    });
};

// ===== BESOURO NEGRO: decolagem e impacto do voo =====
window.besouroExplosoes = [];

window.criarAnimacaoBesouroDecolagem = function(x, y) {
    window.besouroExplosoes.push({
        x: x, y: y,
        raio: 6, raioMax: 42,
        alpha: 1.0, tempo: 0,
        particulas: []
    });
    for (let i = 0; i < 14; i++) {
        let ang = Math.random() * Math.PI * 2;
        let vel = Math.random() * 2.2 + 0.6;
        window.besouroExplosoes[window.besouroExplosoes.length - 1].particulas.push({
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel,
            vida: 1.0,
            tamanho: Math.random() * 3 + 2,
            cor: "#9b59b6"
        });
    }
};

window.criarAnimacaoBesouroImpacto = function(pid, x, y) {
    window.tremorTela = 16;
    window.besouroExplosoes.push({
        x: x, y: y,
        raio: 8, raioMax: 80,
        alpha: 1.0, tempo: 0,
        particulas: []
    });
    for (let i = 0; i < 26; i++) {
        let ang = Math.random() * Math.PI * 2;
        let vel = Math.random() * 4 + 1.5;
        window.besouroExplosoes[window.besouroExplosoes.length - 1].particulas.push({
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel,
            vida: 1.0,
            tamanho: Math.random() * 4 + 2,
            cor: i % 3 === 0 ? "#f1c40f" : "#9b59b6"
        });
    }
    window.floatingTexts.push({ x: x, y: y - 24, text: "⚡ STUN 5s!", color: "#9b59b6", alpha: 1.0 });
};

window.desenharBesouroExplosoes = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;
    for (let i = window.besouroExplosoes.length - 1; i >= 0; i--) {
        let e = window.besouroExplosoes[i];
        e.raio += 2.4;
        e.alpha -= 0.035;
        e.tempo += 0.035;
        if (e.alpha <= 0) {
            window.besouroExplosoes.splice(i, 1);
        } else {
            ctx.save();
            ctx.strokeStyle = "rgba(155, 89, 182, " + e.alpha + ")";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#9b59b6";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.raio, 0, Math.PI * 2);
            ctx.stroke();
            for (let p of e.particulas) {
                p.x = (p.x || e.x) + p.vx;
                p.y = (p.y || e.y) + p.vy;
                p.vida -= 0.05;
                ctx.fillStyle = p.cor;
                ctx.globalAlpha = Math.max(0, p.vida);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.tamanho, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
};
