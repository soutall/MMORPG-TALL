// efeitos/vfx_summoner_golem.js - SUMMONER: GOLEM SÍSMICO (SKILL 4 / ULTIMATE)
// ============================================================================
// Reformulação Visual Completa da Última Skill do Summoner:
// 1. SUPER ROCHA FIXA NO CHÃO: Rocha monumental multifacetada cravada e ancorada
//    solidamente na terra, na mesmíssima paleta de cor roxa do Golem (GOLEM_COR),
//    com facetas 3D iluminadas/sombreadas, fissuras de cristal violeta e runas ancestrais.
// 2. CHÃO TRINCANDO HIPER-REALISTA: Fissuras fractais brownianas profundas que se
//    abrem no solo ao redor da rocha com veios de energia arcana/cristalina violeta.
// 3. CHUVA DE ROCHAS A CADA BATIDA: A cada pulso/batida sísmica, despenca uma
//    verdadeira avalanche de pedaços de rocha roxa com sombras dinâmicas, aceleração
//    gravitacional e estilhaços que explodem ao tocar o chão.
// 4. ESPINHOS DA SEGUNDA SKILL (ROCHAS PONTUDAS 3D): Estalagmites telúricas que
//    irrompem violentamente do solo com física easeOutBack tanto na ancoragem inicial
//    quanto a cada nova batida sísmica.
// ============================================================================

window.vfxSummonerGolems = window.vfxSummonerGolems || {};
window.vfxSummonerGolemPulses = window.vfxSummonerGolemPulses || [];
window.vfxSummonerGolemDebris = window.vfxSummonerGolemDebris || [];
window.vfxSummonerGolemFallingRocks = window.vfxSummonerGolemFallingRocks || [];
window.vfxSummonerGolemImpactFlashes = window.vfxSummonerGolemImpactFlashes || [];
window.vfxSummonerGolemSpikes = window.vfxSummonerGolemSpikes || [];
window.golemsSismicosAtivos = window.golemsSismicosAtivos || {};

// Paleta Oficial da Rocha do Golem da Summoner
const SUPER_ROCHA_COR = {
    picoClaro: '#bca2e8',
    faceClara: '#9a86c9',
    faceMedia: '#6f5aa0',
    faceEscura: '#463a70',
    faceSombra: '#2a2245',
    baseSolo: '#1e1833',
    fissuraFundo: '#100c1c',
    cristalLuz: '#efd9ff',
    cristalMagia: '#b878ff',
    cristalAura: '#a94fff',
    especular: 'rgba(240, 220, 255, 0.45)'
};

// Gerador procedural de fissuras realistas brownianas (se não disponível globalmente)
function _obterRachadurasSismicas(raioMax, numRamos) {
    if (typeof window.gerarRachadurasRealistasSismicas === 'function') {
        return window.gerarRachadurasRealistasSismicas(raioMax, numRamos);
    }
    
    // Fallback fractal browniano com sub-ramificações
    let ramos = [];
    let nRamos = numRamos || 10;
    let rMax = raioMax || 150;
    
    for (let r = 0; r < nRamos; r++) {
        let angBase = (r / nRamos) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        let compTotal = rMax * (0.65 + Math.random() * 0.45);
        let pontos = [{ x: 0, y: 0, w: 5.5 }];
        let curDist = 0;
        let curAng = angBase;
        let curX = 0, curY = 0;
        let subRamos = [];

        while (curDist < compTotal) {
            let passo = 10 + Math.random() * 12;
            curDist += passo;
            curAng += (Math.random() - 0.5) * 0.52;
            curX += Math.cos(curAng) * passo;
            curY += Math.sin(curAng) * passo * 0.65;
            let prog = curDist / compTotal;
            let larg = Math.max(1.0, 5.5 * (1 - prog));
            pontos.push({ x: curX, y: curY, w: larg });

            if (Math.random() < 0.38 && prog < 0.8) {
                let subAng = curAng + (Math.random() > 0.5 ? 0.75 : -0.75) + (Math.random() - 0.5) * 0.3;
                let subLen = 20 + Math.random() * 24;
                let subPts = [{ x: curX, y: curY, w: larg * 0.7 }];
                let sx = curX, sy = curY, sDist = 0;
                while (sDist < subLen) {
                    let sp = 8 + Math.random() * 8;
                    sDist += sp;
                    subAng += (Math.random() - 0.5) * 0.6;
                    sx += Math.cos(subAng) * sp;
                    sy += Math.sin(subAng) * sp * 0.65;
                    subPts.push({ x: sx, y: sy, w: Math.max(0.8, larg * 0.7 * (1 - sDist / subLen)) });
                }
                subRamos.push(subPts);
            }
        }
        ramos.push({ pontos: pontos, subRamos: subRamos });
    }
    return ramos;
}

// Criação de lote de rochas pontudas 3D (espinhos da Skill 2)
function _criarLoteEspinhosTeluricos(cx, cy, qtd, raioMin, raioMax, delayBase) {
    let spikes = [];
    let count = qtd || 8;
    let rMin = raioMin || 40;
    let rMax = raioMax || 110;
    let dBase = delayBase || 0;

    for (let k = 0; k < count; k++) {
        let ang = (k / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
        let dist = rMin + Math.random() * (rMax - rMin);
        let sx = cx + Math.cos(ang) * dist;
        let sy = cy + Math.sin(ang) * dist * 0.68;

        spikes.push({
            x: sx,
            y: sy,
            largura: 16 + Math.random() * 11,
            alturaMax: 34 + Math.random() * 28,
            desvioPonta: (Math.random() - 0.5) * 8,
            inclinacao: (Math.random() - 0.5) * 0.28,
            delay: dBase + k * 22,
            createdAt: Date.now(),
            corClara: SUPER_ROCHA_COR.faceClara,
            corMedia: SUPER_ROCHA_COR.faceMedia,
            corEscura: SUPER_ROCHA_COR.faceEscura,
            corSombra: SUPER_ROCHA_COR.faceSombra,
            fendaLuz: SUPER_ROCHA_COR.cristalLuz
        });
    }
    return spikes;
}

// Listener de eventos do servidor para o VFX do Golem Sísmico
window.vfxListeners = window.vfxListeners || [];

window.vfxListeners.push(function(dados) {
    if (!dados) return;

    // 1. ATIVAÇÃO DA SKILL: FIXA A SUPER ROCHA NO CHÃO
    if (dados.type === 'action_summoner_golem_sismico') {
        let x = dados.x, y = dados.y;
        let ownerId = dados.ownerId;

        window.golemsSismicosAtivos[ownerId] = true;
        if (ownerId === window.meuId) {
            window.golemSismicoAtivo = true;
            let b1 = document.getElementById("btn-ogro-skill");
            let b2 = document.getElementById("btn-ogro-salto");
            let b3 = document.getElementById("btn-ogro-colossal");
            if (b1) b1.classList.add("blocked");
            if (b2) b2.classList.add("blocked");
            if (b3) b3.classList.add("blocked");
        }

        // Tremor de tela de impacto inicial da ancoragem
        window.tremorTela = Math.max(window.tremorTela || 0, 16);

        // Inicializa o estado da Super Rocha
        window.vfxSummonerGolems[ownerId] = {
            ownerId: ownerId,
            x: x,
            y: y,
            startTime: Date.now(),
            duration: dados.duration || 8000,
            emergeDuration: 1400, // 1.4s para cravar e fixar no solo
            cracks: _obterRachadurasSismicas(165, 12),
            dust: [],
            boulders: [],
            spikes: []
        };

        let g = window.vfxSummonerGolems[ownerId];

        // Lajes e pedregulhos de ancoragem profunda cravados na base
        for (let i = 0; i < 11; i++) {
            let a = (i / 11) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
            let dist = 22 + Math.random() * 26;
            g.boulders.push({
                x: Math.cos(a) * dist,
                y: Math.sin(a) * dist * 0.65,
                w: 12 + Math.random() * 12,
                h: 8 + Math.random() * 8,
                cor: i % 2 === 0 ? SUPER_ROCHA_COR.faceEscura : SUPER_ROCHA_COR.faceSombra,
                ang: Math.random() * Math.PI
            });
        }

        // Espinhos de rocha pontuda iniciais irrompendo ao redor da rocha
        let espinhosIniciais = _criarLoteEspinhosTeluricos(x, y, 8, 38, 90, 80);
        espinhosIniciais.forEach(sp => window.vfxSummonerGolemSpikes.push(sp));

        // Poeira e terra revolvida na quebra e ancoragem do chão
        for (let i = 0; i < 50; i++) {
            let a = Math.random() * Math.PI * 2;
            let d = Math.random() * 55;
            g.dust.push({
                x: Math.cos(a) * d,
                y: Math.sin(a) * d * 0.65,
                vx: Math.cos(a) * (Math.random() * 2.8 + 0.6),
                vy: -Math.random() * 3.8 - 1.2,
                size: Math.random() * 9 + 4,
                alpha: 0.8,
                life: Math.random() * 45 + 30,
                maxLife: 75,
                color: Math.random() > 0.4 ? 'rgba(75, 55, 95,' : 'rgba(45, 32, 60,'
            });
        }
    }

    // 2. PULSO / BATIDA SÍSMICA DA SKILL
    // A cada batida: cai chuva de rochas roxas + trincados pulsam + espinhos telúricos irrompem
    if (dados.type === 'action_summoner_golem_pulse') {
        let x = dados.x, y = dados.y;
        let progress = dados.progress || 0;
        let intensity = dados.intensity || 1;
        let radius = dados.radius || 260;

        // Tremor de tela crescente com o clímax da skill
        let shakePower = 6.0 + progress * 10.0;
        window.tremorTela = Math.max(window.tremorTela || 0, shakePower);

        // Áudio da batida sísmica
        window._summonerSkill4PulseContador = (window._summonerSkill4PulseContador || 0) + 1;
        let chaveSomPulse = (window._summonerSkill4PulseContador % 2 === 1) ? 'summoner_skill4_1' : 'summoner_skill4_2';
        if (dados.ownerId === window.meuId) {
            if (typeof window.tocarSonoro === 'function') window.tocarSonoro(chaveSomPulse);
        } else if (typeof window.tocarSonoroProximidade === 'function') {
            window.tocarSonoroProximidade(chaveSomPulse, x, y);
        }

        // Onda de choque circular de energia violeta
        window.vfxSummonerGolemPulses.push({
            x: x,
            y: y,
            radius: 20,
            maxRadius: radius,
            progress: progress,
            intensity: intensity,
            life: 0,
            maxLife: 28
        });

        // -------------------------------------------------------------------
        // REQUISITO: "caindo um monte de outros pedacos de roxas a cada batida da skilll"
        // Avalanche substancial de fragmentos e blocos de rocha roxa caindo
        // -------------------------------------------------------------------
        let numPedrasCaindo = 16 + Math.floor(progress * 8); // 16 a 24 pedras por batida
        for (let i = 0; i < numPedrasCaindo; i++) {
            let ang = Math.random() * Math.PI * 2;
            let dist = 25 + Math.random() * (radius * 0.85);
            let tx = x + Math.cos(ang) * dist;
            let ty = y + Math.sin(ang) * dist * 0.68;
            let tamanhoPedra = 8 + Math.random() * 16; // fragmentos variados (8px a 24px)
            let alturaQueda = 200 + Math.random() * 140;

            // Paleta de pedra roxa combinando perfeitamente com o Golem
            let corPedra = SUPER_ROCHA_COR.faceMedia;
            let rCor = Math.random();
            if (rCor < 0.3) corPedra = SUPER_ROCHA_COR.faceClara;
            else if (rCor < 0.6) corPedra = SUPER_ROCHA_COR.faceEscura;
            else if (rCor < 0.85) corPedra = SUPER_ROCHA_COR.faceSombra;

            window.vfxSummonerGolemFallingRocks.push({
                x: tx + (Math.random() - 0.5) * 35,
                y: ty - alturaQueda,
                targetX: tx,
                targetY: ty,
                vy: 6.5 + Math.random() * 5.0,
                size: tamanhoPedra,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.45,
                color: corPedra,
                corBorda: SUPER_ROCHA_COR.fissuraFundo
            });
        }

        // -------------------------------------------------------------------
        // REQUISITO: "pode colocar os espinhos que vc acabou de fazer da segunda skill"
        // Erupção de espigões de rocha pontuda 3D a cada batida da skill
        // -------------------------------------------------------------------
        let espinhosBatida = _criarLoteEspinhosTeluricos(
            x, y, 
            7 + Math.floor(Math.random() * 3), // 7 a 9 espigões por pulso
            45 + progress * 20, 
            110 + progress * 60, 
            0
        );
        espinhosBatida.forEach(sp => window.vfxSummonerGolemSpikes.push(sp));

        // Impactos visuais nos monstros atingidos pela batida
        if (dados.targets && Array.isArray(dados.targets)) {
            dados.targets.forEach(tgt => {
                window.vfxSummonerGolemImpactFlashes.push({
                    x: tgt.x,
                    y: tgt.y,
                    life: 0,
                    maxLife: 18,
                    intensity: intensity
                });
            });
        }
    }

    // 3. TÉRMINO DA SKILL (Desintegração catastrófica da super rocha)
    if (dados.type === 'action_summoner_golem_sismico_end') {
        let ownerId = dados.ownerId;
        let golem = window.vfxSummonerGolems[ownerId];
        let gx = golem ? golem.x : dados.x;
        let gy = golem ? golem.y : dados.y;

        if (gx !== undefined && gy !== undefined) {
            // Explosão massiva de fragmentos de rocha roxa
            for (let i = 0; i < 54; i++) {
                let ang = Math.random() * Math.PI * 2;
                let spd = Math.random() * 7 + 2.5;
                window.vfxSummonerGolemDebris.push({
                    x: gx + (Math.random() - 0.5) * 30,
                    y: gy - 20 + (Math.random() - 0.5) * 35,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - Math.random() * 4.0,
                    size: 7 + Math.random() * 11,
                    life: 45 + Math.random() * 25,
                    maxLife: 70,
                    rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.5,
                    cor: i % 3 === 0 ? SUPER_ROCHA_COR.faceClara : (i % 3 === 1 ? SUPER_ROCHA_COR.faceMedia : SUPER_ROCHA_COR.faceEscura)
                });
            }
            window.tremorTela = Math.max(window.tremorTela || 0, 14);
        }

        if (ownerId === window.meuId) {
            if (typeof window.tocarSonoro === 'function') window.tocarSonoro('summoner_skill4_fim');
        } else if (typeof window.tocarSonoroProximidade === 'function' && gx !== undefined && gy !== undefined) {
            window.tocarSonoroProximidade('summoner_skill4_fim', gx, gy);
        }

        delete window.vfxSummonerGolems[ownerId];
        delete window.golemsSismicosAtivos[ownerId];

        if (ownerId === window.meuId) {
            window.golemSismicoAtivo = false;
            let b1 = document.getElementById("btn-ogro-skill");
            let b2 = document.getElementById("btn-ogro-salto");
            let b3 = document.getElementById("btn-ogro-colossal");
            if (b1) b1.classList.remove("blocked");
            if (b2) b2.classList.remove("blocked");
            if (b3) b3.classList.remove("blocked");
        }
    }
});

// Renderização das Rachaduras Profundas no Terreno
function desenharRachadurasChao(ctx, golem, elapsed, progress) {
    let emergeRatio = Math.min(1, elapsed / golem.emergeDuration);
    let pulseGlow = 0.65 + Math.sin(Date.now() * 0.012) * 0.35;
    let coreGlowAlpha = (0.50 + progress * 0.50) * pulseGlow;

    ctx.save();
    ctx.translate(golem.x, golem.y + 12);

    // Iluminação violeta profunda de energia arcana sob o solo
    let groundRad = 75 + progress * 40;
    let radGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, groundRad);
    radGlow.addColorStop(0, `rgba(184, 120, 255, ${0.45 * coreGlowAlpha})`);
    radGlow.addColorStop(0.5, `rgba(124, 47, 224, ${0.25 * coreGlowAlpha})`);
    radGlow.addColorStop(1, 'rgba(80, 20, 150, 0)');
    ctx.fillStyle = radGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, groundRad * 1.15, groundRad * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    // Desenho das fraturas em 3 camadas de profundidade
    for (let r = 0; r < golem.cracks.length; r++) {
        let crack = golem.cracks[r];
        let maxIdx = Math.floor(crack.pontos.length * emergeRatio);
        if (maxIdx < 2) continue;

        // Camada 1: Trincheira funda / Sombra da fratura
        ctx.strokeStyle = 'rgba(12, 8, 20, 0.95)';
        ctx.lineWidth = 5.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(crack.pontos[0].x, crack.pontos[0].y);
        for (let i = 1; i < maxIdx; i++) ctx.lineTo(crack.pontos[i].x, crack.pontos[i].y);
        ctx.stroke();

        // Camada 2: Parede rochosa interna
        ctx.strokeStyle = SUPER_ROCHA_COR.faceSombra;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(crack.pontos[0].x, crack.pontos[0].y);
        for (let i = 1; i < maxIdx; i++) ctx.lineTo(crack.pontos[i].x, crack.pontos[i].y);
        ctx.stroke();

        // Camada 3: Veio de energia arcana violeta incandescente
        ctx.strokeStyle = `rgba(215, 140, 255, ${coreGlowAlpha})`;
        ctx.lineWidth = 1.8 + progress * 1.2;
        ctx.shadowColor = SUPER_ROCHA_COR.cristalAura;
        ctx.shadowBlur = 9 + progress * 9;
        ctx.beginPath();
        ctx.moveTo(crack.pontos[0].x, crack.pontos[0].y);
        for (let i = 1; i < maxIdx; i++) ctx.lineTo(crack.pontos[i].x, crack.pontos[i].y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Sub-ramificações menores
        for (let sb = 0; sb < crack.subRamos.length; sb++) {
            let sub = crack.subRamos[sb];
            let subMax = Math.floor(sub.length * emergeRatio);
            if (subMax < 2) continue;

            ctx.strokeStyle = 'rgba(14, 10, 24, 0.85)';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(sub[0].x, sub[0].y);
            for (let si = 1; si < subMax; si++) ctx.lineTo(sub[si].x, sub[si].y);
            ctx.stroke();

            ctx.strokeStyle = `rgba(184, 120, 255, ${coreGlowAlpha * 0.85})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(sub[0].x, sub[0].y);
            for (let si = 1; si < subMax; si++) ctx.lineTo(sub[si].x, sub[si].y);
            ctx.stroke();
        }
    }

    // Boulders e lajes de base ancoradas na terra
    for (let b = 0; b < golem.boulders.length; b++) {
        let bd = golem.boulders[b];
        ctx.save();
        ctx.translate(bd.x, bd.y);
        ctx.rotate(bd.ang);
        ctx.fillStyle = bd.cor;
        ctx.strokeStyle = SUPER_ROCHA_COR.baseSolo;
        ctx.lineWidth = 1.8;
        ctx.fillRect(-bd.w / 2, -bd.h / 2, bd.w, bd.h);
        ctx.strokeRect(-bd.w / 2, -bd.h / 2, bd.w, bd.h);
        ctx.restore();
    }

    ctx.restore();
}

// Renderização da SUPER ROCHA FIXA NO CHÃO (Mesma paleta roxa do Golem)
function desenharSuperRochaFixa(ctx, golem, elapsed, progress) {
    let now = Date.now();
    let emergeRatio = Math.min(1, elapsed / golem.emergeDuration);
    let easeRise = 1 - Math.pow(1 - emergeRatio, 3);
    let yOffset = (1 - easeRise) * 35; // Emerge do solo e fixa com peso

    let escalaFinal = 1.05; // Monumental e sólida
    let escalaAtual = 0.70 + (escalaFinal - 0.70) * easeRise;

    // Tremores contínuos da rocha fincada
    let shakeIntensity = (progress > 0.3 ? (progress - 0.3) * 5.0 : 0.6);
    let shakeX = (Math.random() - 0.5) * shakeIntensity;
    let shakeY = (Math.random() - 0.5) * (shakeIntensity * 0.5);

    ctx.save();
    ctx.translate(golem.x + shakeX, golem.y + shakeY + yOffset);
    ctx.scale(escalaAtual, escalaAtual);

    // 1. Sombra maciça de ancoragem fixa no solo
    ctx.save();
    ctx.fillStyle = "rgba(10, 6, 18, 0.65)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 58, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. CORPO DA SUPER ROCHA MONUMENTAL (Multifacetada e maciça)
    let gradRocha = ctx.createLinearGradient(-40, -108, 40, 15);
    gradRocha.addColorStop(0, SUPER_ROCHA_COR.picoClaro);
    gradRocha.addColorStop(0.28, SUPER_ROCHA_COR.faceClara);
    gradRocha.addColorStop(0.60, SUPER_ROCHA_COR.faceMedia);
    gradRocha.addColorStop(0.85, SUPER_ROCHA_COR.faceEscura);
    gradRocha.addColorStop(1, SUPER_ROCHA_COR.faceSombra);

    ctx.fillStyle = gradRocha;
    ctx.strokeStyle = SUPER_ROCHA_COR.baseSolo;
    ctx.lineWidth = 4.2;

    ctx.beginPath();
    ctx.moveTo(0, -104);       // Pico principal pontiagudo
    ctx.lineTo(26, -92);      // Faceta superior direita
    ctx.lineTo(42, -62);      // Ombro superior direito
    ctx.lineTo(48, -24);      // Flanco direito
    ctx.lineTo(40, 14);       // Base direita cravada no solo
    ctx.lineTo(-40, 14);      // Base esquerda cravada no solo
    ctx.lineTo(-48, -24);     // Flanco esquerdo
    ctx.lineTo(-42, -62);     // Ombro superior esquerdo
    ctx.lineTo(-26, -92);     // Faceta superior esquerda
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. BASE DE ANCORAGEM FIXA NA TERRA
    ctx.fillStyle = SUPER_ROCHA_COR.faceSombra;
    ctx.fillRect(-44, 9, 88, 11);
    ctx.strokeStyle = SUPER_ROCHA_COR.baseSolo;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-44, 9, 88, 11);

    // 4. FACETAS POLIGONAIS 3D (Volume, arestas afiadas e profundidade)
    // Faceta iluminada esquerda superior
    ctx.fillStyle = "rgba(240, 220, 255, 0.28)";
    ctx.beginPath();
    ctx.moveTo(0, -104);
    ctx.lineTo(-26, -92);
    ctx.lineTo(-16, -56);
    ctx.lineTo(0, -62);
    ctx.closePath();
    ctx.fill();

    // Faceta iluminada centro-esquerda
    ctx.fillStyle = "rgba(230, 205, 255, 0.18)";
    ctx.beginPath();
    ctx.moveTo(-16, -56);
    ctx.lineTo(-42, -62);
    ctx.lineTo(-28, -20);
    ctx.lineTo(-8, -24);
    ctx.closePath();
    ctx.fill();

    // Faceta sombreada direita superior
    ctx.fillStyle = "rgba(20, 14, 34, 0.35)";
    ctx.beginPath();
    ctx.moveTo(0, -104);
    ctx.lineTo(26, -92);
    ctx.lineTo(16, -56);
    ctx.lineTo(0, -62);
    ctx.closePath();
    ctx.fill();

    // Faceta sombreada flanco direito
    ctx.beginPath();
    ctx.moveTo(16, -56);
    ctx.lineTo(42, -62);
    ctx.lineTo(30, -20);
    ctx.lineTo(8, -24);
    ctx.closePath();
    ctx.fill();

    // 5. FISSURA CENTRAL DE ENERGIA CRISTALINA VIOLETA
    let pulseVioleta = 0.65 + Math.sin(now * 0.01 + progress * 15) * 0.35;
    let corFissura = `rgba(235, 180, 255, ${0.85 + progress * 0.15})`;

    ctx.save();
    ctx.shadowColor = SUPER_ROCHA_COR.cristalAura;
    ctx.shadowBlur = 12 + progress * 16;
    ctx.strokeStyle = corFissura;
    ctx.lineWidth = 3.2 + Math.sin(now * 0.02) * 1.0 + progress * 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'bevel';

    ctx.beginPath();
    ctx.moveTo(0, -88);
    ctx.lineTo(7, -64);
    ctx.lineTo(-5, -42);
    ctx.lineTo(8, -16);
    ctx.lineTo(-2, 12);

    // Ramificações laterais da fissura
    ctx.moveTo(7, -64);
    ctx.lineTo(20, -52);
    ctx.moveTo(-5, -42);
    ctx.lineTo(-22, -34);
    ctx.stroke();

    // Núcleo branco-violeta brilhante no ápice da skill
    if (progress > 0.4) {
        ctx.strokeStyle = `rgba(255, 245, 255, ${(progress - 0.4) * 1.7})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }
    ctx.restore();

    // 6. RUNAS ANCESTRAIS ESCULPIDAS NA ROCHA
    ctx.save();
    ctx.strokeStyle = `rgba(239, 217, 255, ${0.50 + pulseVioleta * 0.45})`;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = SUPER_ROCHA_COR.cristalAura;
    ctx.shadowBlur = 7 + progress * 7;

    // Runa Esquerda
    ctx.beginPath();
    ctx.moveTo(-24, -66); ctx.lineTo(-16, -72); ctx.lineTo(-20, -58);
    ctx.moveTo(-20, -58); ctx.lineTo(-26, -50);
    ctx.stroke();

    // Runa Direita
    ctx.beginPath();
    ctx.moveTo(24, -66); ctx.lineTo(16, -72); ctx.lineTo(20, -58);
    ctx.moveTo(20, -58); ctx.lineTo(26, -50);
    ctx.stroke();
    ctx.restore();

    // 7. BRASAS E CRISTAIS ASCENDENTES VIOLETAS
    for (let f = 0; f < 6; f++) {
        let fa = (now * 0.003 + f * 1.3) % (Math.PI * 2);
        let fx = Math.cos(fa) * 28;
        let fy = -30 - ((now * 0.09 + f * 24) % 75);
        ctx.fillStyle = `rgba(215, 150, 255, ${0.80 - (-fy - 30) / 75})`;
        ctx.shadowColor = SUPER_ROCHA_COR.cristalMagia;
        ctx.shadowBlur = 4;
        ctx.fillRect(fx, fy, 2.5, 2.5);
    }

    ctx.restore();
}

// LOOP PRINCIPAL DE DESENHO DO VFX DO GOLEM SÍSMICO
window.desenharVfxSummonerGolem = function(ctx) {
    if (!ctx) return;

    try {
        let now = Date.now();

        // 1. DESENHA AS ROCHAS PONTUDAS 3D (Espinhos da Skill 2 saindo do solo)
        for (let i = window.vfxSummonerGolemSpikes.length - 1; i >= 0; i--) {
            let spike = window.vfxSummonerGolemSpikes[i];
            let elapsedSpike = now - spike.createdAt;

            if (elapsedSpike > 2200) {
                window.vfxSummonerGolemSpikes.splice(i, 1);
                continue;
            }

            let alphaSpike = 1.0;
            if (elapsedSpike > 1600) {
                alphaSpike = Math.max(0, 1.0 - (elapsedSpike - 1600) / 600);
            }

            if (typeof window.desenharRochaPontudaSalto === 'function') {
                window.desenharRochaPontudaSalto(ctx, spike, elapsedSpike / 2200, elapsedSpike, alphaSpike);
            }
        }

        // 2. DESENHA GOLEMS TRANSFORMADOS EM SUPER ROCHA FIXA
        for (let id in window.vfxSummonerGolems) {
            let golem = window.vfxSummonerGolems[id];
            let elapsed = now - golem.startTime;
            let progress = Math.min(1, elapsed / golem.duration);

            // Rachaduras realistas ancoradas no solo
            desenharRachadurasChao(ctx, golem, elapsed, progress);

            // Poeira de impacto e vibração da terra
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

            // Super Rocha Fixa no Chão
            desenharSuperRochaFixa(ctx, golem, elapsed, progress);
        }

        // 3. DESENHA ONDAS SÍSMICAS CIRCULARES EXPANDINDO (Violeta / Púrpura)
        for (let i = window.vfxSummonerGolemPulses.length - 1; i >= 0; i--) {
            let pulse = window.vfxSummonerGolemPulses[i];
            pulse.life++;
            pulse.radius += (pulse.maxRadius - pulse.radius) * 0.16;

            let fade = Math.max(0, 1 - (pulse.life / pulse.maxLife));
            let r = pulse.radius;

            ctx.save();
            ctx.translate(pulse.x, pulse.y + 12);

            // Anel externo de impacto violeta
            ctx.strokeStyle = `rgba(217, 130, 250, ${0.90 * fade})`;
            ctx.lineWidth = 3.8 * pulse.intensity;
            ctx.shadowColor = SUPER_ROCHA_COR.cristalAura;
            ctx.shadowBlur = 14 * pulse.intensity;
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r * 0.68, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Anel interno cristalino
            ctx.strokeStyle = `rgba(240, 210, 255, ${0.65 * fade})`;
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.78, r * 0.52, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Borda de poeira púrpura expandindo
            ctx.strokeStyle = `rgba(130, 105, 150, ${0.35 * fade})`;
            ctx.lineWidth = 7.5;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.95, r * 0.64, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();

            if (pulse.life >= pulse.maxLife) {
                window.vfxSummonerGolemPulses.splice(i, 1);
            }
        }

        // 4. DESENHA PEDRAS CAINDO NA ÁREA A CADA BATIDA
        for (let i = window.vfxSummonerGolemFallingRocks.length - 1; i >= 0; i--) {
            let rk = window.vfxSummonerGolemFallingRocks[i];
            rk.y += rk.vy;
            rk.vy += 0.82; // Aceleração gravitacional
            rk.rot += rk.rotSpeed;

            let distToTarget = rk.targetY - rk.y;

            // Sombra dinâmica no chão que cresce conforme a pedra se aproxima
            if (distToTarget > 0) {
                let sProgress = Math.max(0.12, 1 - (distToTarget / 260));
                ctx.fillStyle = `rgba(14, 8, 22, ${0.52 * sProgress})`;
                ctx.beginPath();
                ctx.ellipse(rk.targetX, rk.targetY, rk.size * sProgress * 1.35, rk.size * sProgress * 0.70, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Desenho do pedaço de rocha roxa facetada (Polígono irregular)
            ctx.save();
            ctx.translate(rk.x, rk.y);
            ctx.rotate(rk.rot);
            let hs = rk.size / 2;

            ctx.fillStyle = rk.color;
            ctx.strokeStyle = rk.corBorda || SUPER_ROCHA_COR.fissuraFundo;
            ctx.lineWidth = 1.8;

            ctx.beginPath();
            ctx.moveTo(-hs, -hs * 0.7);
            ctx.lineTo(hs * 0.6, -hs);
            ctx.lineTo(hs, hs * 0.3);
            ctx.lineTo(hs * 0.4, hs);
            ctx.lineTo(-hs * 0.8, hs * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Faceta iluminada
            ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
            ctx.beginPath();
            ctx.moveTo(-hs, -hs * 0.7);
            ctx.lineTo(hs * 0.6, -hs);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();

            // Impacto violento da pedra no chão
            if (rk.y >= rk.targetY) {
                // Fragmenta em 5 estilhaços menores que quicam
                for (let k = 0; k < 5; k++) {
                    let a = Math.random() * Math.PI * 2;
                    let sp = Math.random() * 3.5 + 1.2;
                    window.vfxSummonerGolemDebris.push({
                        x: rk.targetX,
                        y: rk.targetY,
                        vx: Math.cos(a) * sp,
                        vy: Math.sin(a) * sp * 0.65 - Math.random() * 2.8,
                        size: rk.size * 0.38,
                        life: 28,
                        maxLife: 28,
                        rot: Math.random() * Math.PI * 2,
                        rotSpeed: (Math.random() - 0.5) * 0.45,
                        cor: rk.color
                    });
                }
                window.vfxSummonerGolemFallingRocks.splice(i, 1);
            }
        }

        // 5. DESENHA FLASHES DE IMPACTO NOS INIMIGOS
        for (let i = window.vfxSummonerGolemImpactFlashes.length - 1; i >= 0; i--) {
            let f = window.vfxSummonerGolemImpactFlashes[i];
            f.life++;
            let p = f.life / f.maxLife;
            let fade = 1 - p;

            ctx.save();
            ctx.translate(f.x, f.y);

            ctx.strokeStyle = `rgba(215, 140, 255, ${0.85 * fade})`;
            ctx.lineWidth = 2.8;
            ctx.shadowColor = SUPER_ROCHA_COR.cristalAura;
            ctx.shadowBlur = 8 * fade;
            ctx.beginPath();
            ctx.arc(0, 0, 10 + p * 20, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = `rgba(140, 115, 160, ${0.60 * fade})`;
            ctx.beginPath();
            ctx.arc((p - 0.5) * 8, -p * 14, 5 + p * 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            if (f.life >= f.maxLife) {
                window.vfxSummonerGolemImpactFlashes.splice(i, 1);
            }
        }

        // 6. DESENHA ESTILHAÇOS E PEDREGULHOS QUICANDO (Debris)
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
            ctx.fillStyle = d.cor || SUPER_ROCHA_COR.faceMedia;
            ctx.strokeStyle = SUPER_ROCHA_COR.baseSolo;
            ctx.lineWidth = 1.4;

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
