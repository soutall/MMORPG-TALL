// efeitos/vfx_summoner_golem.js - SUMMONER: GOLEM SÍSMICO (REFEITO DO ZERO)
// Monólito Rochoso Colossal, Rachaduras Realistas, Ondas Sísmicas, Chuva de Pedras e Tremor de Tela

window.vfxSummonerGolems = window.vfxSummonerGolems || {};
window.vfxSummonerGolemPulses = window.vfxSummonerGolemPulses || [];
window.vfxSummonerGolemDebris = window.vfxSummonerGolemDebris || [];
window.vfxSummonerGolemFallingRocks = window.vfxSummonerGolemFallingRocks || [];
window.vfxSummonerGolemImpactFlashes = window.vfxSummonerGolemImpactFlashes || [];
window.golemsSismicosAtivos = window.golemsSismicosAtivos || {};

// Gerador procedural de rachaduras realistas ("sem parecer paint")
function gerarRachadurasProcedurais(cx, cy) {
    let rachaduras = [];
    let numRamos = 6 + Math.floor(Math.random() * 3); // 6 a 8 ramificações principais
    
    for (let r = 0; r < numRamos; r++) {
        let anguloBase = (r / numRamos) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
        let comprimentoTotal = 85 + Math.random() * 55; // 85px a 140px de extensão
        let pontos = [{ x: 0, y: 0, w: 5.5 }];
        
        let curDist = 0;
        let curAng = anguloBase;
        let curX = 0, curY = 0;
        let subRamos = [];
        
        while (curDist < comprimentoTotal) {
            let passo = 10 + Math.random() * 12;
            curDist += passo;
            curAng += (Math.random() - 0.5) * 0.55; // desvio angular irregular (fractal)
            curX += Math.cos(curAng) * passo;
            curY += Math.sin(curAng) * passo * 0.65; // perspectiva isométrica/top-down
            
            let progressoRamo = curDist / comprimentoTotal;
            let largura = Math.max(1.0, 5.5 * (1 - progressoRamo));
            pontos.push({ x: curX, y: curY, w: largura });
            
            // Sub-fraturas menores brotando dos ramos principais
            if (Math.random() < 0.35 && progressoRamo < 0.75) {
                let subAng = curAng + (Math.random() > 0.5 ? 0.7 : -0.7) + (Math.random() - 0.5) * 0.3;
                let subLen = 18 + Math.random() * 22;
                let subPts = [{ x: curX, y: curY, w: largura * 0.7 }];
                let sx = curX, sy = curY;
                let sDist = 0;
                while (sDist < subLen) {
                    let sp = 8 + Math.random() * 8;
                    sDist += sp;
                    subAng += (Math.random() - 0.5) * 0.6;
                    sx += Math.cos(subAng) * sp;
                    sy += Math.sin(subAng) * sp * 0.65;
                    subPts.push({ x: sx, y: sy, w: Math.max(0.8, largura * 0.7 * (1 - sDist / subLen)) });
                }
                subRamos.push(subPts);
            }
        }
        
        rachaduras.push({ pontos: pontos, subRamos: subRamos });
    }
    
    return rachaduras;
}

window.vfxListeners = window.vfxListeners || [];

window.vfxListeners.push(function(dados) {
    if (!dados) return;
    
    // 1. ATIVAÇÃO DO GOLEM SÍSMICO
    if (dados.type === 'action_summoner_golem_sismico') {
        let x = dados.x, y = dados.y;
        let ownerId = dados.ownerId;
        
        window.golemsSismicosAtivos[ownerId] = true;
        if (ownerId === window.meuId) {
            window.golemSismicoAtivo = true;
            // Bloqueia visualmente os botões das outras skills do Summoner
            let b1 = document.getElementById("btn-ogro-skill");
            let b2 = document.getElementById("btn-ogro-salto");
            let b3 = document.getElementById("btn-ogro-colossal");
            if (b1) b1.classList.add("blocked");
            if (b2) b2.classList.add("blocked");
            if (b3) b3.classList.add("blocked");
        }
        
        // Tremor inicial de impacto
        window.tremorTela = Math.max(window.tremorTela || 0, 7);
        
        // Inicializa o Monólito e seus efeitos
        window.vfxSummonerGolems[ownerId] = {
            ownerId: ownerId,
            x: x,
            y: y,
            startTime: Date.now(),
            duration: dados.duration || 8000,
            emergeDuration: 2000, // 2s emergindo do solo
            cracks: gerarRachadurasProcedurais(x, y),
            dust: [],
            boulders: []
        };
        
        let g = window.vfxSummonerGolems[ownerId];
        
        // Boulders estáticos amontoados na base (proporcionais ao tamanho ~40% menor)
        for (let i = 0; i < 9; i++) {
            let a = (i / 9) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            let dist = 18 + Math.random() * 16;
            g.boulders.push({
                x: Math.cos(a) * dist,
                y: Math.sin(a) * dist * 0.65,
                w: 8 + Math.random() * 8,
                h: 6 + Math.random() * 6,
                cor: i % 2 === 0 ? '#455260' : '#333e4a',
                ang: Math.random() * Math.PI
            });
        }
        
        // Poeira e terra subindo da quebra do solo
        for (let i = 0; i < 45; i++) {
            let a = Math.random() * Math.PI * 2;
            let d = Math.random() * 50;
            g.dust.push({
                x: Math.cos(a) * d,
                y: Math.sin(a) * d * 0.65,
                vx: Math.cos(a) * (Math.random() * 2.5 + 0.5),
                vy: -Math.random() * 3.5 - 1.2,
                size: Math.random() * 9 + 4,
                alpha: 0.75,
                life: Math.random() * 45 + 30,
                maxLife: 75,
                color: Math.random() > 0.4 ? 'rgba(125,105,85,' : 'rgba(90,80,70,'
            });
        }
    }
    
    // 2. PULSO SÍSMICO (Acelera de 1.0s até 0.3s)
    if (dados.type === 'action_summoner_golem_pulse') {
        let x = dados.x, y = dados.y;
        let progress = dados.progress || 0;
        let intensity = dados.intensity || 1;
        let radius = dados.radius || 260;
        
        // Intensifica screen shake conforme o final se aproxima
        let shakePower = 3.5 + progress * 7.5; // Começa suave (3.5) e chega a forte (11.0)
        window.tremorTela = Math.max(window.tremorTela || 0, shakePower);

        // Áudio alternado de pulso sísmico (Summoner_skill4_1 (1).wav e (2).wav)
        window._summonerSkill4PulseContador = (window._summonerSkill4PulseContador || 0) + 1;
        let chaveSomPulse = (window._summonerSkill4PulseContador % 2 === 1) ? 'summoner_skill4_1' : 'summoner_skill4_2';
        if (dados.ownerId === window.meuId) {
            if (typeof window.tocarSonoro === 'function') window.tocarSonoro(chaveSomPulse);
        } else if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade(chaveSomPulse, x, y);
        }
        
        // Adiciona onda sísmica em expansão
        window.vfxSummonerGolemPulses.push({
            x: x,
            y: y,
            radius: 15,
            maxRadius: radius,
            progress: progress,
            intensity: intensity,
            life: 0,
            maxLife: 26,
            craterPoints: []
        });
        
        // Chuva de pedras / fragmentos caindo na área
        let numPedras = 3 + Math.floor(progress * 4); // Mais pedras caindo no final
        for (let i = 0; i < numPedras; i++) {
            let ang = Math.random() * Math.PI * 2;
            let dist = Math.random() * (radius * 0.85);
            let tx = x + Math.cos(ang) * dist;
            let ty = y + Math.sin(ang) * dist * 0.7; // perspectiva
            
            window.vfxSummonerGolemFallingRocks.push({
                x: tx + (Math.random() - 0.5) * 40,
                y: ty - 180 - Math.random() * 60,
                targetX: tx,
                targetY: ty,
                vy: 6 + Math.random() * 4,
                size: 7 + Math.random() * 9,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.4,
                color: Math.random() > 0.5 ? '#505f70' : '#384450'
            });
        }
        
        // Impactos visuais nos monstros atingidos
        if (dados.targets && Array.isArray(dados.targets)) {
            dados.targets.forEach(tgt => {
                window.vfxSummonerGolemImpactFlashes.push({
                    x: tgt.x,
                    y: tgt.y,
                    life: 0,
                    maxLife: 16,
                    intensity: intensity
                });
            });
        }
    }
    
    // 3. TÉRMINO DA SKILL (Quebra catastrófica da rocha)
    if (dados.type === 'action_summoner_golem_sismico_end') {
        let ownerId = dados.ownerId;
        let golem = window.vfxSummonerGolems[ownerId];
        let gx = golem ? golem.x : dados.x;
        let gy = golem ? golem.y : dados.y;
        
        // Grande explosão de fragmentos da casca rochosa
        if (gx !== undefined && gy !== undefined) {
            for (let i = 0; i < 48; i++) {
                let ang = Math.random() * Math.PI * 2;
                let spd = Math.random() * 6 + 2.5;
                window.vfxSummonerGolemDebris.push({
                    x: gx + (Math.random() - 0.5) * 25,
                    y: gy - 15 + (Math.random() - 0.5) * 30,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - Math.random() * 3.5,
                    size: 6 + Math.random() * 9,
                    life: 45 + Math.random() * 20,
                    maxLife: 65,
                    rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.5,
                    cor: i % 2 === 0 ? '#546577' : '#36424e'
                });
            }
            // Tremor de encerramento
            window.tremorTela = Math.max(window.tremorTela || 0, 9);
        }

        // Áudio de término da skill 4 (Summoner_Skill4_3.wav)
        if (ownerId === window.meuId) {
            if (typeof window.tocarSonoro === 'function') window.tocarSonoro('summoner_skill4_fim');
        } else if (typeof window.tocarSonoroProximidade === 'function' && gx !== undefined && gy !== undefined) {
            window.tocarSonoroProximidade('summoner_skill4_fim', gx, gy);
        }
        
        delete window.vfxSummonerGolems[ownerId];
        delete window.golemsSismicosAtivos[ownerId];
        
        if (ownerId === window.meuId) {
            window.golemSismicoAtivo = false;
            // Libera botões das outras skills do Summoner
            let b1 = document.getElementById("btn-ogro-skill");
            let b2 = document.getElementById("btn-ogro-salto");
            let b3 = document.getElementById("btn-ogro-colossal");
            if (b1) b1.classList.remove("blocked");
            if (b2) b2.classList.remove("blocked");
            if (b3) b3.classList.remove("blocked");
        }
    }
});

// Renderização das Rachaduras Profundas no Terreno ("Sem parecer paint")
function desenharRachadurasChao(ctx, golem, elapsed, progress) {
    let emergeRatio = Math.min(1, elapsed / golem.emergeDuration);
    let pulseGlow = 0.65 + Math.sin(Date.now() * 0.012) * 0.35;
    let coreGlowAlpha = (0.45 + progress * 0.50) * pulseGlow;
    
    ctx.save();
    ctx.translate(golem.x, golem.y + 12);
    
    // Iluminação do núcleo sísmico no solo
    let groundRad = 70 + progress * 35;
    let radGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, groundRad);
    radGlow.addColorStop(0, `rgba(255, 140, 20, ${0.35 * coreGlowAlpha})`);
    radGlow.addColorStop(0.5, `rgba(255, 70, 0, ${0.18 * coreGlowAlpha})`);
    radGlow.addColorStop(1, 'rgba(255, 70, 0, 0)');
    ctx.fillStyle = radGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, groundRad * 1.1, groundRad * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    for (let r = 0; r < golem.cracks.length; r++) {
        let crack = golem.cracks[r];
        let maxIdx = Math.floor(crack.pontos.length * emergeRatio);
        if (maxIdx < 2) continue;
        
        // Camada 1: Trincheira profunda / Sombra da fratura
        ctx.strokeStyle = 'rgba(8, 12, 16, 0.95)';
        ctx.lineWidth = 5.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(crack.pontos[0].x, crack.pontos[0].y);
        for (let i = 1; i < maxIdx; i++) {
            ctx.lineTo(crack.pontos[i].x, crack.pontos[i].y);
        }
        ctx.stroke();
        
        // Camada 2: Rocha interna da fratura
        ctx.strokeStyle = '#1d252e';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(crack.pontos[0].x, crack.pontos[0].y);
        for (let i = 1; i < maxIdx; i++) {
            ctx.lineTo(crack.pontos[i].x, crack.pontos[i].y);
        }
        ctx.stroke();
        
        // Camada 3: Energia sísmica incandescente profunda (Magma / Fogo da Terra)
        ctx.strokeStyle = `rgba(255, 110, 10, ${coreGlowAlpha})`;
        ctx.lineWidth = 1.8 + progress * 1.2;
        ctx.shadowColor = '#ff6a00';
        ctx.shadowBlur = 8 + progress * 8;
        ctx.beginPath();
        ctx.moveTo(crack.pontos[0].x, crack.pontos[0].y);
        for (let i = 1; i < maxIdx; i++) {
            ctx.lineTo(crack.pontos[i].x, crack.pontos[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Sub-ramos de fissura
        for (let sb = 0; sb < crack.subRamos.length; sb++) {
            let sub = crack.subRamos[sb];
            let subMax = Math.floor(sub.length * emergeRatio);
            if (subMax < 2) continue;
            
            ctx.strokeStyle = 'rgba(10, 14, 18, 0.85)';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(sub[0].x, sub[0].y);
            for (let si = 1; si < subMax; si++) ctx.lineTo(sub[si].x, sub[si].y);
            ctx.stroke();
            
            ctx.strokeStyle = `rgba(255, 130, 20, ${coreGlowAlpha * 0.85})`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(sub[0].x, sub[0].y);
            for (let si = 1; si < subMax; si++) ctx.lineTo(sub[si].x, sub[si].y);
            ctx.stroke();
        }
    }
    
    // Boulders de base ancorados
    for (let b = 0; b < golem.boulders.length; b++) {
        let bd = golem.boulders[b];
        ctx.save();
        ctx.translate(bd.x, bd.y);
        ctx.rotate(bd.ang);
        ctx.fillStyle = bd.cor;
        ctx.strokeStyle = '#1b222a';
        ctx.lineWidth = 1.8;
        ctx.fillRect(-bd.w / 2, -bd.h / 2, bd.w, bd.h);
        ctx.strokeRect(-bd.w / 2, -bd.h / 2, bd.w, bd.h);
        ctx.restore();
    }
    
    ctx.restore();
}

// Renderização do Monólito Rochoso Colossal (Inspirado no Boss de Pedra do Jogo)
function desenharMonolitoRochoso(ctx, golem, elapsed, progress) {
    let now = Date.now();
    let emergeRatio = Math.min(1, elapsed / golem.emergeDuration);
    // Easing de subida da rocha: emerge progressivamente do chão nos 2 primeiros segundos
    let easeRise = 1 - Math.pow(1 - emergeRatio, 3);
    let yOffset = (1 - easeRise) * 40; // Começa 40px soterrado e sobe (proporcional ao tamanho reduzido)
    
    // Escala: reduzida em 40% a pedido visual (escalaFinal de 1.5 -> 0.90)
    let escalaFinal = 0.90;
    let escalaAtual = 0.60 + (escalaFinal - 0.60) * easeRise;
    
    // Vibração sísmica da rocha aumentando no final
    let shakeIntensity = (progress > 0.4 ? (progress - 0.4) * 5.5 : 0.8);
    let shakeX = (Math.random() - 0.5) * shakeIntensity;
    let shakeY = (Math.random() - 0.5) * (shakeIntensity * 0.6);
    
    ctx.save();
    ctx.translate(golem.x + shakeX, golem.y + shakeY + yOffset);
    ctx.scale(escalaAtual, escalaAtual);
    
    // Sombra colossal na terra
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 52, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // ===== MONÓLITO ROCHOSO (Polígono de rocha maciça facetada) =====
    let gradRocha = ctx.createLinearGradient(-35, -95, 35, 10);
    gradRocha.addColorStop(0, "#8da0b4");
    gradRocha.addColorStop(0.35, "#5a6b7e");
    gradRocha.addColorStop(0.75, "#3b4754");
    gradRocha.addColorStop(1, "#232b33");
    
    ctx.fillStyle = gradRocha;
    ctx.strokeStyle = "#1b232a";
    ctx.lineWidth = 4;
    
    ctx.beginPath();
    ctx.moveTo(0, -96);       // Pico pontiagudo do topo
    ctx.lineTo(24, -84);     // Faceta superior direita
    ctx.lineTo(38, -55);     // Ombro superior direito
    ctx.lineTo(44, -20);     // Costela direita
    ctx.lineTo(36, 12);      // Base direita cravada no solo
    ctx.lineTo(-36, 12);     // Base esquerda cravada no solo
    ctx.lineTo(-44, -20);    // Costela esquerda
    ctx.lineTo(-38, -55);    // Ombro superior esquerdo
    ctx.lineTo(-24, -84);    // Faceta superior esquerda
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Base de ancoragem assentada na terra
    ctx.fillStyle = "#2c3641";
    ctx.fillRect(-38, 8, 76, 10);
    ctx.strokeStyle = "#171e25";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-38, 8, 76, 10);
    
    // ===== FACETAS POLIGONAIS ROCHOSAS (Volume e Arestas Tridimensionais) =====
    // Faceta iluminada esquerda
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.beginPath();
    ctx.moveTo(0, -96);
    ctx.lineTo(-24, -84);
    ctx.lineTo(-14, -50);
    ctx.lineTo(0, -56);
    ctx.closePath();
    ctx.fill();
    
    // Faceta iluminada centro-esquerda
    ctx.beginPath();
    ctx.moveTo(-14, -50);
    ctx.lineTo(-38, -55);
    ctx.lineTo(-26, -18);
    ctx.lineTo(-8, -22);
    ctx.closePath();
    ctx.fill();
    
    // Faceta sombreada direita
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.moveTo(0, -96);
    ctx.lineTo(24, -84);
    ctx.lineTo(14, -50);
    ctx.lineTo(0, -56);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(14, -50);
    ctx.lineTo(38, -55);
    ctx.lineTo(28, -18);
    ctx.lineTo(8, -22);
    ctx.closePath();
    ctx.fill();
    
    // ===== FISSURA CENTRAL DE ENERGIA MAGMÁTICA / SÍSMICA =====
    let pulseMagma = 0.65 + Math.sin(now * 0.01 + progress * 15) * 0.35;
    let corCrevice = `rgba(255, ${Math.floor(130 + progress * 80)}, 30, ${0.85 + progress * 0.15})`;
    
    ctx.save();
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 10 + progress * 15;
    ctx.strokeStyle = corCrevice;
    ctx.lineWidth = 2.8 + Math.sin(now * 0.02) * 1.0 + progress * 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'bevel';
    
    ctx.beginPath();
    ctx.moveTo(0, -82);
    ctx.lineTo(6, -60);
    ctx.lineTo(-4, -40);
    ctx.lineTo(7, -15);
    ctx.lineTo(-2, 10);
    
    // Ramificação menor da fissura
    ctx.moveTo(6, -60);
    ctx.lineTo(18, -48);
    ctx.moveTo(-4, -40);
    ctx.lineTo(-20, -32);
    ctx.stroke();
    
    // Núcleo branco-dourado superaquecido no final da skill
    if (progress > 0.45) {
        ctx.strokeStyle = `rgba(255, 250, 210, ${(progress - 0.45) * 1.8})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    ctx.restore();
    
    // ===== RUNAS ANCESTRAIS ESCULPIDAS NA ROCHA =====
    ctx.save();
    ctx.strokeStyle = `rgba(255, 175, 40, ${0.45 + pulseMagma * 0.45})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(255, 140, 0, 0.9)';
    ctx.shadowBlur = 6 + progress * 6;
    
    // Runa Esquerda
    ctx.beginPath();
    ctx.moveTo(-22, -62); ctx.lineTo(-14, -68); ctx.lineTo(-18, -54);
    ctx.moveTo(-18, -54); ctx.lineTo(-24, -46);
    ctx.stroke();
    
    // Runa Direita
    ctx.beginPath();
    ctx.moveTo(22, -62); ctx.lineTo(14, -68); ctx.lineTo(18, -54);
    ctx.moveTo(18, -54); ctx.lineTo(24, -46);
    ctx.stroke();
    ctx.restore();
    
    // Brasas/faíscas ascendentes
    for (let f = 0; f < 5; f++) {
        let fa = (now * 0.003 + f * 1.4) % (Math.PI * 2);
        let fx = Math.cos(fa) * 26;
        let fy = -30 - ((now * 0.08 + f * 22) % 65);
        ctx.fillStyle = `rgba(255, ${160 + f * 18}, 40, ${0.75 - (-fy - 30) / 65})`;
        ctx.fillRect(fx, fy, 2.4, 2.4);
    }
    
    ctx.restore();
}

// LOOP PRINCIPAL DE DESENHO DO VFX
window.desenharVfxSummonerGolem = function(ctx) {
    if (!ctx) return;
    
    try {
        let now = Date.now();
        
        // 1. DESENHA GOLEMS TRANSFORMADOS (Rachaduras + Monólito)
        for (let id in window.vfxSummonerGolems) {
            let golem = window.vfxSummonerGolems[id];
            let elapsed = now - golem.startTime;
            let progress = Math.min(1, elapsed / golem.duration);
            
            // Rachaduras procedurais ancoradas no chão
            desenharRachadurasChao(ctx, golem, elapsed, progress);
            
            // Poeira de emergência e vibração
            for (let i = golem.dust.length - 1; i >= 0; i--) {
                let p = golem.dust[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                
                let a = (p.life / p.maxLife) * p.alpha;
                ctx.fillStyle = p.color + a + ')';
                ctx.beginPath();
                ctx.arc(golem.x + p.x, golem.y + p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                
                if (p.life <= 0) golem.dust.splice(i, 1);
            }
            
            // Corpo colossal do Monólito
            desenharMonolitoRochoso(ctx, golem, elapsed, progress);
        }
        
        // 2. DESENHA ONDAS SÍSMICAS CIRCULARES EXPANDINDO
        for (let i = window.vfxSummonerGolemPulses.length - 1; i >= 0; i--) {
            let pulse = window.vfxSummonerGolemPulses[i];
            pulse.life++;
            pulse.radius += (pulse.maxRadius - pulse.radius) * 0.16; // Easing de expansão
            
            let fade = Math.max(0, 1 - (pulse.life / pulse.maxLife));
            let r = pulse.radius;
            
            ctx.save();
            ctx.translate(pulse.x, pulse.y + 12);
            
            // Anel externo de impacto / terra levantada
            ctx.strokeStyle = `rgba(255, 120, 10, ${0.85 * fade})`;
            ctx.lineWidth = 3.5 * pulse.intensity;
            ctx.shadowColor = '#ff6a00';
            ctx.shadowBlur = 12 * pulse.intensity;
            
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r * 0.68, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // Segundo anel ondulatório interno
            ctx.strokeStyle = `rgba(255, 210, 80, ${0.55 * fade})`;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.78, r * 0.52, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // Borda de poeira circular expandindo
            ctx.strokeStyle = `rgba(140, 120, 100, ${0.35 * fade})`;
            ctx.lineWidth = 7;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.95, r * 0.64, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
            
            if (pulse.life >= pulse.maxLife) {
                window.vfxSummonerGolemPulses.splice(i, 1);
            }
        }
        
        // 3. DESENHA PEDRAS CAINDO NA ÁREA DURANTE OS TREMORES
        for (let i = window.vfxSummonerGolemFallingRocks.length - 1; i >= 0; i--) {
            let rk = window.vfxSummonerGolemFallingRocks[i];
            rk.y += rk.vy;
            rk.vy += 0.75; // Gravidade
            rk.rot += rk.rotSpeed;
            
            let distToTarget = rk.targetY - rk.y;
            
            // Sombra crescendo no chão enquanto cai
            if (distToTarget > 0) {
                let sProgress = Math.max(0.1, 1 - (distToTarget / 240));
                ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * sProgress})`;
                ctx.beginPath();
                ctx.ellipse(rk.targetX, rk.targetY, rk.size * sProgress * 1.3, rk.size * sProgress * 0.65, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Desenha a pedra caindo
            ctx.save();
            ctx.translate(rk.x, rk.y);
            ctx.rotate(rk.rot);
            ctx.fillStyle = rk.color;
            ctx.strokeStyle = '#1d252e';
            ctx.lineWidth = 1.8;
            ctx.fillRect(-rk.size / 2, -rk.size / 2, rk.size, rk.size);
            ctx.strokeRect(-rk.size / 2, -rk.size / 2, rk.size, rk.size);
            ctx.restore();
            
            // Impacto da pedra no chão
            if (rk.y >= rk.targetY) {
                // Fragmenta em 4 pedriscos
                for (let k = 0; k < 4; k++) {
                    let a = Math.random() * Math.PI * 2;
                    let sp = Math.random() * 3 + 1;
                    window.vfxSummonerGolemDebris.push({
                        x: rk.targetX,
                        y: rk.targetY,
                        vx: Math.cos(a) * sp,
                        vy: Math.sin(a) * sp * 0.6 - Math.random() * 2.5,
                        size: rk.size * 0.4,
                        life: 25,
                        maxLife: 25,
                        rot: Math.random() * Math.PI * 2,
                        rotSpeed: (Math.random() - 0.5) * 0.4,
                        cor: rk.color
                    });
                }
                window.vfxSummonerGolemFallingRocks.splice(i, 1);
            }
        }
        
        // 4. DESENHA IMPACTOS VISUAIS NOS INIMIGOS ATINGIDOS
        for (let i = window.vfxSummonerGolemImpactFlashes.length - 1; i >= 0; i--) {
            let f = window.vfxSummonerGolemImpactFlashes[i];
            f.life++;
            let p = f.life / f.maxLife;
            let fade = 1 - p;
            
            ctx.save();
            ctx.translate(f.x, f.y);
            
            // Flash de tremor no chão do monstro
            ctx.strokeStyle = `rgba(255, 140, 20, ${0.75 * fade})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 10 + p * 18, 0, Math.PI * 2);
            ctx.stroke();
            
            // Poeira subindo do alvo
            ctx.fillStyle = `rgba(160, 140, 120, ${0.6 * fade})`;
            ctx.beginPath();
            ctx.arc((p - 0.5) * 8, -p * 14, 5 + p * 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            
            if (f.life >= f.maxLife) {
                window.vfxSummonerGolemImpactFlashes.splice(i, 1);
            }
        }
        
        // 5. DESENHA DETRITOS E PEDREGULHOS QUICANDO (Debris)
        for (let i = window.vfxSummonerGolemDebris.length - 1; i >= 0; i--) {
            let d = window.vfxSummonerGolemDebris[i];
            d.x += d.vx;
            d.y += d.vy;
            d.vy += 0.35; // Gravidade
            d.rot += d.rotSpeed;
            d.life--;
            
            let alpha = Math.max(0, d.life / d.maxLife);
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rot);
            ctx.fillStyle = d.cor || '#4a5766';
            ctx.strokeStyle = '#1b222a';
            ctx.lineWidth = 1.5;
            
            // Fragmento de rocha irregular
            ctx.beginPath();
            ctx.moveTo(-d.size / 2, -d.size / 2);
            ctx.lineTo(d.size / 2, -d.size * 0.3);
            ctx.lineTo(d.size * 0.4, d.size / 2);
            ctx.lineTo(-d.size * 0.3, d.size * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            
            if (d.life <= 0) {
                window.vfxSummonerGolemDebris.splice(i, 1);
            }
        }
        
    } catch (errGolem) {
        console.error("Erro VFX Golem Sísmico:", errGolem);
    }
};
