// efeitos.js - Magias, explosões, saltos, impactos de combate e Smart Cast unificado

window.impactosGolem = [];

window.criarAnimacaoImpactoGolem = function(x, y) {
    let particulas = [];
    for (let i = 0; i < 8; i++) {
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

window.criarAnimacaoOgroSismico = function(x, y) {
    if (typeof tocarSomImpactoPesado === 'function') tocarSomImpactoPesado();
    window.tremorTela = 18;
    let linhasRachadura = [];
    for (let i = 0; i < 8; i++) {
        let ang = (i / 8) * Math.PI * 2 + (Math.random() * 0.3);
        let compr = Math.random() * 45 + 55;
        linhasRachadura.push({ x2: Math.cos(ang) * compr, y2: Math.sin(ang) * compr });
    }
    let pedras = [];
    for (let p = 0; p < 16; p++) {
        let ang = Math.random() * Math.PI * 2;
        let spd = Math.random() * 3.5 + 1.5;
        pedras.push({ x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, tamanho: Math.random() * 4 + 2, vida: 1.0 });
    }
    window.impactosSismicos.push({ x: x, y: y, raioOnda: 10, raioMax: 95, alpha: 1.0, rachaduras: linhasRachadura, pedras: pedras });
    window.floatingTexts.push({ x: x, y: y - 30, text: "💥 ESMAGAMENTO SÍSMICO! (-45)", color: "#e67e22", alpha: 1.0 });
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
            rachaduras: [],
            pedras: [],
            cor: "rgba(155, 89, 182,"
        });
    }
};

window.criarAnimacaoMeteoro = function(tx, ty) {
    if (typeof tocarSomQuedaMeteoro === 'function') tocarSomQuedaMeteoro();
    window.meteorosAtivos.push({ startX: tx - 240, startY: ty - 420, targetX: tx, targetY: ty, progresso: 0, velocidade: 0.032, rastro: [] });
};

window.criarAnimacaoNevasca = function(tx, ty, raio, duracaoMs) {
    if (typeof tocarSomNevasca === 'function') tocarSomNevasca();
    const duracaoVisualMs = Number.isFinite(duracaoMs) ? duracaoMs : Math.round(480 * (1000 / 60));
    let particulasGelo = [];
    for (let i = 0; i < 45; i++) {
        particulasGelo.push({ dist: Math.random() * raio, angle: Math.random() * Math.PI * 2, speed: Math.random() * 0.06 + 0.04, size: Math.random() * 4 + 2, color: Math.random() > 0.4 ? "#00ffff" : "#ffffff", alpha: Math.random() });
    }
    window.nevascasAtivas.push({ x: tx, y: ty, radius: raio, duracao: 480, startTime: Date.now(), duracaoMs: duracaoVisualMs, rotacao: 0, particulas: particulasGelo });
    window.floatingTexts.push({ x: tx, y: ty - 40, text: "❄️ NEVASCA (LENTIDÃO 50%)", color: "#00ffff", alpha: 1.0 });
};

window.desenharEfeitosMeteoro = function() {
    if (!window.ctx) return;
    for (let i = window.chaoEmChamas.length - 1; i >= 0; i--) {
        let fogo = window.chaoEmChamas[i];
        fogo.duracao--;
        if (fogo.duracao <= 0) { window.chaoEmChamas.splice(i, 1); } else {
            window.ctx.save();
            window.ctx.fillStyle = "rgba(20, 10, 5, 0.75)";
            window.ctx.beginPath(); window.ctx.ellipse(fogo.x, fogo.y, 75, 45, 0, 0, Math.PI * 2); window.ctx.fill();
            window.ctx.strokeStyle = "rgba(230, 126, 34, 0.5)"; window.ctx.lineWidth = 3; window.ctx.stroke();
            for (let p of fogo.particulasFogo) {
                p.y -= p.vy; p.x += Math.sin(Date.now() / 150 + p.offset) * 0.8; p.vida -= 0.03;
                if (p.vida <= 0) { p.vida = 1.0; p.y = fogo.y + (Math.random() * 30 - 15); p.x = fogo.x + (Math.random() * 80 - 40); }
                window.ctx.fillStyle = p.cor; window.ctx.shadowColor = "#e67e22"; window.ctx.shadowBlur = 8;
                window.ctx.beginPath(); window.ctx.arc(p.x, p.y, p.tamanho * p.vida, 0, Math.PI * 2); window.ctx.fill();
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
            if (typeof tocarSomImpactoMeteoro === 'function') tocarSomImpactoMeteoro();
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
            window.chaoEmChamas.push({ x: m.targetX, y: m.targetY, duracao: 180, particulasFogo: particulas });
            window.floatingTexts.push({ x: m.targetX, y: m.targetY - 30, text: "💥 METEORO! (-25)", color: "#e67e22", alpha: 1.0 });
            window.meteorosAtivos.splice(i, 1);
        }
    }
};

window.desenharEfeitosNevasca = function() {
    if (!window.ctx) return;
    for (let i = window.nevascasAtivas.length - 1; i >= 0; i--) {
        let n = window.nevascasAtivas[i];
        n.duracao--; n.rotacao += 0.05;
        if (n.startTime && Date.now() - n.startTime >= n.duracaoMs) {
            window.nevascasAtivas.splice(i, 1);
            continue;
        }
        if (n.duracao % 60 === 0) {
            window.listaSlimes.forEach(slime => {
                if (slime.hp > 0 && Math.hypot(slime.x - n.x, slime.y - n.y) < n.radius) {
                    if (typeof registrarDanoCausado === 'function') registrarDanoCausado(6);
                    window.floatingTexts.push({ x: slime.x, y: slime.y - 15, text: "-6", color: "#00ffff", alpha: 1.0 });
                }
            });
        }
        if (n.duracao <= 0) { window.nevascasAtivas.splice(i, 1); } else {
            window.ctx.save();
            window.ctx.fillStyle = "rgba(23, 105, 170, 0.25)"; window.ctx.beginPath(); window.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2); window.ctx.fill();
            window.ctx.strokeStyle = "rgba(0, 255, 255, 0.4)"; window.ctx.lineWidth = 3; window.ctx.beginPath(); window.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2); window.ctx.stroke();
            for (let s = 0; s < 3; s++) {
                let offsetAng = n.rotacao + (s * (Math.PI * 2 / 3));
                window.ctx.strokeStyle = "rgba(255, 255, 255, 0.35)"; window.ctx.lineWidth = 2.5; window.ctx.beginPath(); window.ctx.arc(n.x, n.y, n.radius * 0.7, offsetAng, offsetAng + 1.2); window.ctx.stroke();
            }
            for (let p of n.particulas) {
                p.angle += p.speed; p.dist += Math.sin(p.angle * 3) * 0.4; if (p.dist > n.radius) p.dist = 10;
                let px = n.x + Math.cos(p.angle) * p.dist; let py = n.y + Math.sin(p.angle) * p.dist;
                window.ctx.fillStyle = p.color; window.ctx.shadowColor = "#00ffff"; window.ctx.shadowBlur = 6; window.ctx.beginPath(); window.ctx.arc(px, py, p.size, 0, Math.PI * 2); window.ctx.fill();
            }
            window.ctx.restore();
        }
    }
};

window.desenharEfeitosSismicos = function() {
    if (!window.ctx) return;
    for (let i = window.impactosSismicos.length - 1; i >= 0; i--) {
        let imp = window.impactosSismicos[i];
        imp.raioOnda += 2.2; imp.alpha -= 0.025;
        if (imp.alpha <= 0) { window.impactosSismicos.splice(i, 1); } else {
            window.ctx.save();
            let corOnda = imp.cor ? (imp.cor + imp.alpha + ")") : ("rgba(211, 84, 0, " + imp.alpha + ")");
            window.ctx.strokeStyle = corOnda; window.ctx.lineWidth = 4; window.ctx.beginPath(); window.ctx.arc(imp.x, imp.y, imp.raioOnda, 0, Math.PI * 2); window.ctx.stroke();
            window.ctx.strokeStyle = "rgba(20, 10, 5, " + (imp.alpha + 0.2) + ")"; window.ctx.lineWidth = 3; window.ctx.beginPath();
            for (let rach of imp.rachaduras) { window.ctx.moveTo(imp.x, imp.y); window.ctx.lineTo(imp.x + rach.x2 * (imp.raioOnda / imp.raioMax), imp.y + rach.y2 * (imp.raioOnda / imp.raioMax)); }
            window.ctx.stroke();
            for (let ped of imp.pedras) {
                ped.x += ped.vx; ped.y += ped.vy; ped.vida -= 0.03;
                window.ctx.fillStyle = "rgba(100, 90, 80, " + ped.vida + ")"; window.ctx.fillRect(ped.x, ped.y, ped.tamanho, ped.tamanho);
            }
            window.ctx.restore();
        }
    }
    for (let i = window.saltosOgroAtivos.length - 1; i >= 0; i--) {
        let salto = window.saltosOgroAtivos[i];
        salto.progresso += salto.velocidade;

        let curX = salto.startX + (salto.targetX - salto.startX) * Math.min(salto.progresso, 1.0); 
        let curY = salto.startY + (salto.targetY - salto.startY) * Math.min(salto.progresso, 1.0);
        let alturaArco = Math.sin(Math.min(salto.progresso, 1.0) * Math.PI) * 75;

        window.ctx.save();
        window.ctx.fillStyle = "rgba(0,0,0,0.3)"; window.ctx.beginPath(); window.ctx.ellipse(curX, curY + 16, 12, 5, 0, 0, Math.PI * 2); window.ctx.fill();
        window.ctx.translate(curX, curY - alturaArco);
        window.ctx.fillStyle = "#784212"; window.ctx.beginPath(); window.ctx.arc(0, 0, 15, 0, Math.PI * 2); window.ctx.fill();
        window.ctx.fillStyle = "#566573"; window.ctx.fillRect(-16, -9, 9, 6); window.ctx.fillRect(7, -9, 9, 6);
        window.ctx.fillStyle = "#f1c40f"; window.ctx.fillRect(-4, -14, 3, 3); window.ctx.fillRect(2, -14, 3, 3);
        window.ctx.restore();

        if (salto.progresso >= 1.0) {
            window.criarAnimacaoOgroSismico(salto.targetX, salto.targetY); 
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
    let ang = Math.atan2(pp.vy || 0, pp.vx || 1);

    let corRastro = (tipo === 'magia') ? '#9b59b6' : (tipo === 'orbe') ? '#2ecc71' : (tipo === 'sagrado') ? '#f1c40f' : (tipo === 'riff') ? '#e67e22' : '#f39c12';
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
