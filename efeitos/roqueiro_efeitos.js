window.roqueiroEfeitosAtivos = [];
window.bandaRoqueiroEfeitos = [];

const CORES_BANDA_ROQUEIRO = ['#ff3355', '#ff7a18', '#ffd23f', '#a855f7', '#36a2ff', '#00e5ff'];
const NOTAS_ROQUEIRO = ['♪', '♫', '♬'];

// Paleta usada pelo palco da Bateria Solo.
const CORES_PALCO_BATERIA = ['#ff3b30', '#36a2ff', '#a855f7', '#32d74b', '#ffd60a', '#00d9ff', '#ff2d92', '#ff7a18'];

window.criarAnimacaoBateriaSolo = function(x, y) {
    // A Bateria Solo acontece em batidas periódicas (~500ms).
    // Mantemos UM palco persistente e atualizamos o pulso a cada batida,
    // em vez de empilhar dezenas de efeitos completos.
    if (!Array.isArray(window.roqueiroEfeitosAtivos)) window.roqueiroEfeitosAtivos = [];

    let palco = window.roqueiroEfeitosAtivos.find(e => e.tipo === 'bateriaPalco');

    if (!palco) {
        palco = {
            tipo: 'bateriaPalco',
            x: x,
            y: y,
            alpha: 1.0,
            pulso: 1.0,
            ultimoPulso: Date.now(),
            luzes: []
        };

        // Luzes distribuídas ao redor do Roqueiro, como refletores de palco.
        const quantidadeLuzes = 10;
        for (let i = 0; i < quantidadeLuzes; i++) {
            const angulo = (Math.PI * 2 * i) / quantidadeLuzes;
            const distancia = 70 + (i % 2) * 24;
            palco.luzes.push({
                angulo,
                distancia,
                tamanho: 18 + (i % 3) * 5,
                cor: CORES_PALCO_BATERIA[i % CORES_PALCO_BATERIA.length],
                fase: i * 0.72,
                elevacao: 30 + (i % 3) * 10
            });
        }

        window.roqueiroEfeitosAtivos.push(palco);
    } else {
        // Atualiza a posição para o palco acompanhar o jogador.
        palco.x = x;
        palco.y = y;
        palco.alpha = 1.0;
        palco.pulso = 1.0;
        palco.ultimoPulso = Date.now();
    }

    // Efeito curto de impacto sincronizado com cada batida.
    if (window.roqueiroEfeitosAtivos.filter(e => e.tipo === 'bateriaBatida').length < 6) {
        window.roqueiroEfeitosAtivos.push({
            tipo: 'bateriaBatida',
            x: x,
            y: y,
            raio: 12,
            alpha: 1.0,
            cor: CORES_PALCO_BATERIA[Math.floor(Math.random() * CORES_PALCO_BATERIA.length)]
        });
    }

    window.tremorTela = Math.max(window.tremorTela || 0, 3);
};

window.criarAnimacaoTeleporteRoqueiro = function(x, y) {
    window.roqueiroEfeitosAtivos.push({ tipo: 'teleporte', x: x, y: y, raio: 45, alpha: 1.0 });
};

window.criarAnimacaoGritoGuerra = function(id, x, y, raio, alvos) {
    // Buff curto de entrada + aura persistente. Sem dezenas de partículas por frame.
    let existente = window.roqueiroEfeitosAtivos.find(e => e.tipo === 'gritoGuerra' && e.id === id);
    if (existente) {
        existente.x = x;
        existente.y = y;
        existente.raio = 18;
        existente.maxRaio = raio || existente.maxRaio || 220;
        existente.alpha = 1;
        existente.tempo = 0;
        existente.alvos = Array.isArray(alvos) ? alvos : existente.alvos;
        return;
    }
    window.roqueiroEfeitosAtivos.push({
        tipo: 'gritoGuerra',
        x: x,
        y: y,
        raio: 18,
        maxRaio: raio || 220,
        alpha: 1.0,
        id: id,
        tempo: 0,
        notasFase: Math.random() * 6,
        alvos: Array.isArray(alvos) ? alvos : []
    });
    window.tremorTela = Math.max(window.tremorTela || 0, 6);
};

// Skill 3 — Chamar a Banda: visual do guitarrista + entrada de palco.
// O desenho visual do membro real continua sendo responsabilidade do renderer
// da classe; esta função fornece um overlay de guitarrista e efeitos sem alterar lógica.
window.criarAnimacaoBandaRoqueiro = function(x, y, id) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    window.bandaRoqueiroEfeitos.push({
        tipo: 'guitarrista',
        x: x,
        y: y,
        id: id || null,
        tempo: 0,
        vida: 165,
        alpha: 0,
        escala: 0.85,
        fase: Math.random() * Math.PI * 2,
        cor: CORES_BANDA_ROQUEIRO[Math.floor(Math.random() * CORES_BANDA_ROQUEIRO.length)]
    });
    window.tremorTela = Math.max(window.tremorTela || 0, 2);
};

window.criarAnimacaoBanda = window.criarAnimacaoBandaRoqueiro;
window.iniciarVisualBandaRoqueiro = function(data) {
    data = data || {};
    let x = Number(data.x);
    let y = Number(data.y);
    let id = data.id || data.playerId || data.ownerId || null;

    // O servidor atual envia somente {type,id}. Para o jogador local usamos a
    // posição conhecida; para outros clientes o dispatcher pode fornecer x/y.
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        if (id && id === window.meuId && Number.isFinite(window.meuX) && Number.isFinite(window.meuY)) {
            x = window.meuX + 34;
            y = window.meuY + 34;
        }
    }
    if (Number.isFinite(x) && Number.isFinite(y)) {
        window.criarAnimacaoBandaRoqueiro(x, y, id);
    }
};

window.desenharEfeitosRoqueiro = function() {
    // 1. Desenha a mira do Teleporte (Stage Dive)
    if (window.modoMiraTeleporteRoqueiro) {
        let tx = window.meuX + 12 + Math.cos(window.meuAngulo) * 160;
        let ty = window.meuY + 16 + Math.sin(window.meuAngulo) * 160;
        ctx.save();
        ctx.beginPath();
        ctx.arc(tx, ty, 20, 0, Math.PI * 2);
        ctx.strokeStyle = "#9b59b6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.fillStyle = "rgba(155, 89, 182, 0.3)";
        ctx.fill();
        ctx.restore();
    }

    // 2. Efeito visual do guitarrista convocado
    desenharGuitarristaRoqueiro(ctx);

    // 3. Efeitos da Bateria Solo, Teleporte e Grito de Guerra
    for (let i = window.roqueiroEfeitosAtivos.length - 1; i >= 0; i--) {
        let ef = window.roqueiroEfeitosAtivos[i];
        ctx.save();

        if (ef.tipo === 'bateriaPalco') {
            // Fade automático caso a sequência de batidas termine.
            const agora = Date.now();
            const tempoSemBatida = agora - ef.ultimoPulso;
            if (tempoSemBatida > 850) {
                ef.alpha -= 0.035;
            } else {
                ef.alpha += (1 - ef.alpha) * 0.25;
            }

            ef.pulso += (0 - ef.pulso) * 0.18;
            if (tempoSemBatida < 180) ef.pulso = Math.max(ef.pulso, 0.8);

            // Palco acompanha a posição atual do jogador.
            if (window.meuId && typeof window.meuX === 'number' && typeof window.meuY === 'number') {
                ef.x = window.meuX + 12;
                ef.y = window.meuY + 12;
            }

            if (ef.alpha <= 0) {
                window.roqueiroEfeitosAtivos.splice(i, 1);
                ctx.restore();
                continue;
            }

            const t = agora / 1000;

            // Luz ambiente central no chão.
            const gradCentro = ctx.createRadialGradient(ef.x, ef.y + 12, 0, ef.x, ef.y + 12, 100);
            gradCentro.addColorStop(0, 'rgba(255,255,255,' + (0.10 * ef.alpha + ef.pulso * 0.10) + ')');
            gradCentro.addColorStop(0.28, 'rgba(255,90,160,' + (0.10 * ef.alpha + ef.pulso * 0.08) + ')');
            gradCentro.addColorStop(0.65, 'rgba(110,70,255,' + (0.06 * ef.alpha) + ')');
            gradCentro.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradCentro;
            ctx.beginPath();
            ctx.ellipse(ef.x, ef.y + 14, 100, 36, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vários refletores coloridos no chão, com feixes e glow.
            for (let l = 0; l < ef.luzes.length; l++) {
                const luz = ef.luzes[l];
                const swing = Math.sin(t * 1.6 + luz.fase) * 0.16;
                const angulo = luz.angulo + swing;
                const distancia = luz.distancia + Math.sin(t * 2.1 + luz.fase) * 7;
                const lx = ef.x + Math.cos(angulo) * distancia;
                const ly = ef.y + Math.sin(angulo) * distancia * 0.48 + 8;
                const pulseLocal = 0.72 + Math.sin(t * 3.4 + luz.fase) * 0.18 + ef.pulso * 0.42;
                const raio = luz.tamanho * (0.88 + pulseLocal * 0.20);

                // Halo oval no chão.
                const gradLuz = ctx.createRadialGradient(lx, ly, 0, lx, ly, raio * 3.6);
                gradLuz.addColorStop(0, hexToRgbaLocal(luz.cor, 0.36 * pulseLocal * ef.alpha));
                gradLuz.addColorStop(0.28, hexToRgbaLocal(luz.cor, 0.20 * pulseLocal * ef.alpha));
                gradLuz.addColorStop(1, hexToRgbaLocal(luz.cor, 0));
                ctx.fillStyle = gradLuz;
                ctx.beginPath();
                ctx.ellipse(lx, ly, raio * 2.9, raio * 1.25, angulo, 0, Math.PI * 2);
                ctx.fill();

                // Núcleo da luz.
                ctx.globalAlpha = Math.min(1, (0.55 + ef.pulso * 0.35) * ef.alpha);
                ctx.fillStyle = luz.cor;
                ctx.shadowColor = luz.cor;
                ctx.shadowBlur = 12 + ef.pulso * 10;
                ctx.beginPath();
                ctx.ellipse(lx, ly, raio * 0.72, raio * 0.34, angulo, 0, Math.PI * 2);
                ctx.fill();

                // Feixe inclinado de palco, desenhado atrás do núcleo.
                ctx.globalAlpha = Math.min(0.22, (0.08 + ef.pulso * 0.10) * ef.alpha);
                ctx.shadowBlur = 0;
                ctx.fillStyle = luz.cor;
                ctx.beginPath();
                const beamLen = luz.elevacao + Math.sin(t * 1.2 + luz.fase) * 5;
                const perpX = -Math.sin(angulo) * (raio * 0.55);
                const perpY = Math.cos(angulo) * (raio * 0.30);
                const baseX = lx, baseY = ly;
                const tipX = lx - Math.cos(angulo) * beamLen;
                const tipY = ly - Math.sin(angulo) * beamLen * 0.55 - 12;
                ctx.moveTo(baseX - perpX, baseY - perpY);
                ctx.lineTo(baseX + perpX, baseY + perpY);
                ctx.lineTo(tipX + perpX * 0.18, tipY + perpY * 0.12);
                ctx.lineTo(tipX - perpX * 0.18, tipY - perpY * 0.12);
                ctx.closePath();
                ctx.fill();

                // Pequenos pontos de partículas saindo do foco.
                ctx.globalAlpha = Math.min(0.8, ef.alpha * (0.28 + ef.pulso * 0.38));
                ctx.fillStyle = '#ffffff';
                for (let p = 0; p < 3; p++) {
                    const pa = t * (1.5 + p * 0.25) + luz.fase + p * 2.1;
                    const py = ly - ((t * (14 + p * 5) + luz.fase * 20 + p * 17) % 24);
                    const px = lx + Math.cos(pa) * (raio * (0.6 + p * 0.18));
                    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
                }
            }

            // Flash coletivo da batida.
            if (ef.pulso > 0.25) {
                const flash = Math.min(0.20, ef.pulso * 0.14) * ef.alpha;
                const gradFlash = ctx.createRadialGradient(ef.x, ef.y + 10, 0, ef.x, ef.y + 10, 170);
                gradFlash.addColorStop(0, 'rgba(255,255,255,' + flash + ')');
                gradFlash.addColorStop(0.35, 'rgba(255,160,220,' + (flash * 0.55) + ')');
                gradFlash.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.globalAlpha = 1;
                ctx.fillStyle = gradFlash;
                ctx.beginPath();
                ctx.ellipse(ef.x, ef.y + 12, 150, 52, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (ef.tipo === 'bateriaBatida') {
            // Anel curto de impacto sincronizado com cada batida.
            ef.raio += 7;
            ef.alpha -= 0.07;
            if (ef.alpha <= 0) {
                window.roqueiroEfeitosAtivos.splice(i, 1);
                ctx.restore();
                continue;
            }

            ctx.beginPath();
            ctx.ellipse(ef.x, ef.y + 8, ef.raio * 1.35, ef.raio * 0.48, 0, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgbaLocal(ef.cor, ef.alpha * 0.80);
            ctx.lineWidth = 4;
            ctx.shadowColor = ef.cor;
            ctx.shadowBlur = 10;
            ctx.stroke();
        } else if (ef.tipo === 'teleporte') {
            ef.raio -= 3;
            ef.alpha -= 0.06;
            if (ef.alpha <= 0) { window.roqueiroEfeitosAtivos.splice(i, 1); ctx.restore(); continue; }
            ctx.beginPath(); ctx.arc(ef.x, ef.y, Math.abs(ef.raio), 0, Math.PI * 2);
            ctx.fillStyle = "rgba(155, 89, 182, " + (ef.alpha * 0.8) + ")";
            ctx.shadowColor = "#9b59b6"; ctx.shadowBlur = 6; ctx.fill();
        } else if (ef.tipo === 'gritoGuerra') {
            const agora = Date.now();
            ef.tempo = (ef.tempo || 0) + 1;

            // Expansão inicial do grito.
            if (ef.tempo < 42) {
                ef.raio = Math.min(ef.maxRaio || 220, 18 + ef.tempo * 5.2);
                ef.alpha = Math.max(0.42, 1 - ef.tempo / 90);
            } else {
                // Aura de manutenção enquanto o buff existe no cliente.
                ef.raio = Math.min(ef.maxRaio || 220, ef.raio + 0.65);
                ef.alpha = 0.55 + Math.sin(agora * 0.004) * 0.10;
                if (ef.raio >= (ef.maxRaio || 220)) ef.raio = 34 + Math.sin(agora * 0.003) * 5;
            }

            if (ef.tempo > 150) {
                window.roqueiroEfeitosAtivos.splice(i, 1);
                ctx.restore();
                continue;
            }

            const r = Math.min(ef.maxRaio || 220, ef.raio);
            const pulse = 0.5 + Math.sin(agora * 0.006) * 0.5;

            // Palco no chão: halo + anéis concêntricos.
            ctx.globalAlpha = ef.alpha * 0.24;
            ctx.fillStyle = '#ff4f9a';
            ctx.beginPath();
            ctx.ellipse(ef.x, ef.y + 10, Math.min(r, 110), Math.min(r * 0.42, 46), 0, 0, Math.PI * 2);
            ctx.fill();

            for (let k = 0; k < 3; k++) {
                const rr = Math.max(18, Math.min(r, r * (0.55 + k * 0.16)));
                ctx.globalAlpha = ef.alpha * (0.80 - k * 0.18);
                ctx.strokeStyle = k === 0 ? '#fff0ae' : (k === 1 ? '#ff7ad9' : '#8c7bff');
                ctx.lineWidth = k === 0 ? 3 : 1.5;
                ctx.setLineDash(k === 2 ? [5, 7] : []);
                ctx.beginPath();
                ctx.ellipse(ef.x, ef.y + 9, rr, rr * 0.40, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Estouro central do grito.
            ctx.globalAlpha = ef.alpha * (0.20 + pulse * 0.12);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ef.x, ef.y - 2, 16 + pulse * 12, 0, Math.PI * 2);
            ctx.fill();

            // Ondas sonoras em 4 arcos; leves para manter FPS.
            ctx.globalAlpha = ef.alpha * 0.85;
            ctx.lineWidth = 2;
            for (let a = 0; a < 4; a++) {
                const arcR = 28 + a * 9 + pulse * 4;
                ctx.strokeStyle = CORES_BANDA_ROQUEIRO[(a + 1) % CORES_BANDA_ROQUEIRO.length];
                ctx.beginPath();
                ctx.arc(ef.x, ef.y - 8, arcR, -1.05, 1.05);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(ef.x, ef.y - 8, arcR, Math.PI - 1.05, Math.PI + 1.05);
                ctx.stroke();
            }

            // Notas musicais orbitando o buff.
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (let n = 0; n < 4; n++) {
                const ang = agora * 0.0017 + ef.notasFase + n * (Math.PI * 0.5);
                const nr = 42 + n * 4;
                const nx = ef.x + Math.cos(ang) * nr;
                const ny = ef.y - 12 + Math.sin(ang) * nr * 0.46 - ((agora / 18 + n * 14) % 26);
                ctx.globalAlpha = ef.alpha * 0.82;
                ctx.fillStyle = CORES_BANDA_ROQUEIRO[n % CORES_BANDA_ROQUEIRO.length];
                ctx.fillText(NOTAS_ROQUEIRO[n % NOTAS_ROQUEIRO.length], nx, ny);
            }

            // Pequenos pilares verticais sugerindo "ímpeto" nos aliados.
            for (let s = 0; s < 5; s++) {
                const sx = ef.x - 36 + s * 18;
                const sy = ef.y + 18;
                const sh = 10 + Math.sin(agora * 0.008 + s) * 5;
                ctx.globalAlpha = ef.alpha * 0.28;
                ctx.fillStyle = s % 2 ? '#ffda56' : '#7ef9ff';
                ctx.fillRect(Math.round(sx), Math.round(sy - sh), 3, Math.round(sh));
            }
        }
        ctx.restore();
    }
};

// Desenha o guitarrista da Banda como overlay leve: silhueta + guitarra + palco.
function desenharGuitarristaRoqueiro(ctx) {
    const agora = Date.now();
    if (!Array.isArray(window.bandaRoqueiroEfeitos)) window.bandaRoqueiroEfeitos = [];

    for (let i = window.bandaRoqueiroEfeitos.length - 1; i >= 0; i--) {
        const g = window.bandaRoqueiroEfeitos[i];
        g.tempo += 1;
        g.vida -= 1;
        g.alpha += (1 - g.alpha) * 0.13;

        if (g.vida <= 0) {
            g.alpha *= 0.88;
            if (g.alpha < 0.03) {
                window.bandaRoqueiroEfeitos.splice(i, 1);
                continue;
            }
        }

        // Pequeno balanço de palco.
        const bob = Math.sin(agora * 0.006 + g.fase) * 2.2;
        const sway = Math.sin(agora * 0.004 + g.fase) * 0.07;
        const pulse = 0.8 + Math.sin(agora * 0.008 + g.fase) * 0.2;
        const x = g.x;
        const y = g.y + bob;
        const s = g.escala;

        ctx.save();
        ctx.globalAlpha = g.alpha;

        // Luz no chão.
        ctx.fillStyle = g.cor;
        ctx.globalAlpha = g.alpha * 0.18;
        ctx.beginPath();
        ctx.ellipse(x, y + 24 * s, 30 * s + pulse * 8, 10 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Aura vertical curta.
        ctx.globalAlpha = g.alpha * 0.20;
        const halo = ctx.createRadialGradient(x, y, 2, x, y, 34 * s);
        halo.addColorStop(0, '#ffffff');
        halo.addColorStop(0.25, g.cor);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, 34 * s, 0, Math.PI * 2);
        ctx.fill();

        // Instrumento e corpo estilizados, desenhados com poucos paths.
        ctx.translate(x, y);
        ctx.rotate(sway);
        ctx.scale(s, s);

        // Pernas/ botas.
        ctx.globalAlpha = g.alpha * 0.95;
        ctx.fillStyle = '#191722';
        ctx.fillRect(-11, 9, 7, 17);
        ctx.fillRect(4, 9, 7, 17);
        ctx.fillStyle = '#5b3b2e';
        ctx.fillRect(-13, 24, 9, 4);
        ctx.fillRect(3, 24, 10, 4);

        // Jaqueta.
        ctx.fillStyle = '#20212b';
        ctx.beginPath();
        ctx.moveTo(-15, -7);
        ctx.lineTo(15, -7);
        ctx.lineTo(18, 10);
        ctx.lineTo(7, 13);
        ctx.lineTo(0, 5);
        ctx.lineTo(-7, 13);
        ctx.lineTo(-18, 10);
        ctx.closePath();
        ctx.fill();

        // Camisa brilhante.
        ctx.fillStyle = '#d9d3e5';
        ctx.beginPath();
        ctx.moveTo(-5, -6);
        ctx.lineTo(5, -6);
        ctx.lineTo(7, 5);
        ctx.lineTo(-7, 5);
        ctx.closePath();
        ctx.fill();

        // Cabeça / rosto.
        ctx.fillStyle = '#c9875d';
        ctx.beginPath();
        ctx.arc(0, -18, 8.2, 0, Math.PI * 2);
        ctx.fill();

        // Cabelo do guitarrista.
        ctx.fillStyle = '#211a28';
        ctx.beginPath();
        ctx.arc(-1, -21, 9.4, Math.PI * 0.98, Math.PI * 2.02);
        ctx.lineTo(7, -15);
        ctx.lineTo(4, -17);
        ctx.lineTo(0, -15);
        ctx.lineTo(-6, -17);
        ctx.closePath();
        ctx.fill();

        // Braços segurando a guitarra.
        ctx.strokeStyle = '#c9875d';
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-13, -2);
        ctx.lineTo(2, 5);
        ctx.lineTo(13, -3);
        ctx.stroke();

        // Pescoço e corpo da guitarra.
        ctx.strokeStyle = '#8e5b3f';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-2, -2);
        ctx.lineTo(13, -9);
        ctx.stroke();

        ctx.fillStyle = '#8f2f55';
        ctx.beginPath();
        ctx.ellipse(-1, 8, 9, 6.5, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd56a';
        ctx.beginPath();
        ctx.arc(-1, 8, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Faixas de energia musical.
        ctx.globalAlpha = g.alpha * 0.9;
        ctx.strokeStyle = g.cor;
        ctx.lineWidth = 1.8;
        for (let a = 0; a < 3; a++) {
            ctx.beginPath();
            ctx.arc(0, -2, 22 + a * 6 + Math.sin(agora * 0.005 + a) * 2, -2.2, -0.5);
            ctx.stroke();
        }

        // Sparkles de entrada / saída.
        for (let p = 0; p < 5; p++) {
            const ang = agora * 0.002 + g.fase + p * 1.256;
            const rr = 23 + (p % 2) * 8;
            const px = Math.cos(ang) * rr;
            const py = Math.sin(ang) * rr * 0.55 - 5;
            ctx.globalAlpha = g.alpha * 0.72;
            ctx.fillStyle = CORES_BANDA_ROQUEIRO[(p + 2) % CORES_BANDA_ROQUEIRO.length];
            ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
        }

        ctx.restore();
    }
}

// Converte uma cor hexadecimal em rgba para usar nos gradientes sem depender de outras funções do projeto.
function hexToRgbaLocal(hex, alpha) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + Math.max(0, Math.min(1, alpha)) + ')';
}
