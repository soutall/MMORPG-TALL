// efeitos/arqueiro_efeitos.js - Renderização de magias e projéteis do Arqueiro
window.chuvasFlechas = [];
window.flechasPerfurantes = [];
window.rajadasFlechas = [];
window.flechasBasicas = [];
window.cargasRajada = {};

function criarParticulasRajada(quantidade, origem, cor) {
    let particulas = [];
    for (let i = 0; i < quantidade; i++) {
        let ang = Math.random() * Math.PI * 2;
        particulas.push({
            x: origem.x,
            y: origem.y,
            vx: Math.cos(ang) * (0.3 + Math.random() * 1.5),
            vy: Math.sin(ang) * (0.3 + Math.random() * 1.5),
            vida: 18 + Math.random() * 42,
            tamanho: 1 + Math.random() * 2.5,
            cor: cor || (Math.random() > 0.5 ? '#c8ff75' : '#ffd86a'),
            tipo: Math.random() > 0.72 ? 'folha' : 'particula'
        });
    }
    return particulas;
}

window.iniciarCarregamentoRajada = function(id, x, y, angulo) {
    window.cargasRajada[id || 'local'] = {
        x: x,
        y: y,
        angulo: angulo || 0,
        progresso: 0,
        particulas: criarParticulasRajada(34, { x: x, y: y }, '#c8ff75'),
        vida: 1,
        flash: 0
    };
};

window.atualizarCarregamentoRajada = function(id, x, y, progresso, angulo) {
    let chave = id || 'local';
    let carga = window.cargasRajada[chave];
    if (!carga) window.iniciarCarregamentoRajada(chave, x, y, angulo);
    carga = window.cargasRajada[chave];
    carga.x = x;
    carga.y = y;
    carga.angulo = angulo === undefined ? carga.angulo : angulo;
    carga.progresso = Math.max(0, Math.min(1, Number(progresso) || 0));
};

window.cancelarCarregamentoRajada = function(id) {
    let carga = window.cargasRajada[id || 'local'];
    if (carga) carga.vida = 0.01;
};

window.criarAnimacaoRajadaFlechas = function(x, y, angulo) {
    let quantidade = 38;
    let flechas = [];
    for (let n = 0; n < quantidade; n++) {
        let progressoLateral = (n / (quantidade - 1)) * 2 - 1;
        flechas.push({
            distancia: 0,
            lateral: progressoLateral * (0.4 + Math.random() * 0.55),
            velocidade: 15 + Math.random() * 4,
            comprimento: 18 + Math.random() * 7,
            espessura: 1.4 + Math.random() * 1.2,
            angulo: progressoLateral * 0.18 + (Math.random() - 0.5) * 0.08,
            vida: 1,
            trilha: []
        });
    }
    window.rajadasFlechas.push({
        x: x,
        y: y,
        angulo: angulo || 0,
        vida: 60,
        tempo: 0,
        flechas: flechas,
        ondas: [0, 42, 84, 126],
        particulas: criarParticulasRajada(110, { x: x, y: y }, '#b8ff62'),
        flash: 10
    });
};

window.finalizarRajadaVisual = function(id) {
    let carga = window.cargasRajada[id || 'local'];
    if (carga) {
        carga.vida = 0;
        carga.particulas = Array.isArray(carga.particulas) ? carga.particulas : [];
    }
};

window.criarAnimacaoFlechaBasica = function(x, y, vx, vy) {
    window.flechasBasicas.push({ x: x, y: y, vx: vx, vy: vy, vida: 18 });
};

window.criarAnimacaoChuvaFlechas = function(x, y) {
    let flechas = [];
    for (let i = 0; i < 28; i++) {
        flechas.push({
            x: x + (Math.random() * 110 - 55),
            y: y - 220 - (Math.random() * 120),
            targetY: y + (Math.random() * 60 - 30),
            velocidade: Math.random() * 4 + 11,
            caiu: false
        });
    }
    window.chuvasFlechas.push({
        x: x,
        y: y,
        duracao: 140,
        flechas: flechas
    });
    window.floatingTexts.push({ x: x, y: y - 35, text: "🏹 CHUVA DE FLECHAS!", color: "#1abc9c", alpha: 1.0 });
};

window.criarAnimacaoDisparoPerfurante = function(x, y, vx, vy, angulo) {
    window.flechasPerfurantes.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        angulo: angulo,
        vida: 40,
        rastro: []
    });
};

window.criarAnimacaoImpactoFlecha = function(x, y, stacks) {
    if (!window.floatingTexts) return;
    window.floatingTexts.push({ x: x, y: y - 20, text: "✦ " + (stacks || 1) + "x", color: "#00bcd4", alpha: 1.0 });
};

window.desenharEfeitosArqueiro = function() {
    if (!window.ctx) return;
    let ctx = window.ctx;

    Object.keys(window.cargasRajada).forEach(function(chave) {
        let carga = window.cargasRajada[chave];
        if (!carga || !Array.isArray(carga.particulas)) {
            delete window.cargasRajada[chave];
            return;
        }
        if (carga.vida <= 0) {
            carga.vida -= 0.08;
            carga.particulas.forEach(function(p) { p.vida -= 2.8; });
        } else {
            carga.vida = Math.min(1, carga.vida + 0.08);
        }
        let intensidade = Math.max(0.08, carga.progresso) * carga.vida;
        let pulso = 1 + Math.sin(Date.now() / 75) * 0.08;

        carga.particulas.forEach(function(p) {
            if (p.vida <= 0) {
                p.x = carga.x;
                p.y = carga.y;
                p.vida = 18 + Math.random() * 38;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.985;
            p.vy *= 0.985;

            ctx.save();
            ctx.globalAlpha = Math.min(1, p.vida / 18) * intensidade;
            ctx.fillStyle = p.cor;
            ctx.shadowColor = p.cor;
            ctx.shadowBlur = 5;
            if (p.tipo === 'folha') {
                ctx.translate(p.x, p.y);
                ctx.rotate((p.x + p.y) * 0.03);
                ctx.beginPath();
                ctx.moveTo(-p.tamanho * 2, 0);
                ctx.lineTo(0, -p.tamanho);
                ctx.lineTo(p.tamanho * 2, 0);
                ctx.lineTo(0, p.tamanho);
                ctx.fill();
            } else {
                ctx.fillRect(p.x - p.tamanho / 2, p.y - p.tamanho / 2, p.tamanho, p.tamanho);
            }
            ctx.restore();
        });

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        let aura = ctx.createRadialGradient(carga.x, carga.y, 2, carga.x, carga.y, 32 + intensidade * 30);
        aura.addColorStop(0, 'rgba(255, 245, 170, ' + (0.45 * intensidade) + ')');
        aura.addColorStop(0.45, 'rgba(177, 255, 91, ' + (0.22 * intensidade) + ')');
        aura.addColorStop(1, 'rgba(177, 255, 91, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(carga.x, carga.y, (32 + intensidade * 30) * pulso, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(carga.x, carga.y);
        ctx.rotate(carga.angulo);
        ctx.strokeStyle = 'rgba(255, 222, 103, ' + (0.45 * intensidade) + ')';
        ctx.lineWidth = 2 + intensidade * 2;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.quadraticCurveTo(22, -10 - intensidade * 12, 42, 0);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(191, 255, 104, ' + (0.5 * intensidade) + ')';
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.quadraticCurveTo(22, 10 + intensidade * 12, 42, 0);
        ctx.stroke();
        ctx.restore();

        if (carga.progresso >= 0.98 && carga.flash <= 0 && carga.vida > 0) carga.flash = 8;
        if (carga.flash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = carga.flash / 10;
            ctx.fillStyle = '#fff5bb';
            ctx.beginPath();
            ctx.arc(carga.x, carga.y, 8 + (10 - carga.flash) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            carga.flash--;
        }
        if (carga.vida <= 0 && carga.particulas.every(function(p) { return p.vida <= 0; })) delete window.cargasRajada[chave];
    });

    for (let i = window.flechasBasicas.length - 1; i >= 0; i--) {
        let f = window.flechasBasicas[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vida--;
        let ang = Math.atan2(f.vy, f.vx);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(ang);
        ctx.strokeStyle = '#f5b041';
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 9;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(7, -4);
        ctx.lineTo(7, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (f.vida <= 0) window.flechasBasicas.splice(i, 1);
    }

    // Chuva de Flechas
    for (let i = window.chuvasFlechas.length - 1; i >= 0; i--) {
        let chuva = window.chuvasFlechas[i];
        chuva.duracao--;

        ctx.save();
        // Círculo no solo
        ctx.fillStyle = "rgba(26, 188, 156, 0.18)";
        ctx.beginPath();
        ctx.arc(chuva.x, chuva.y, 65, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(46, 204, 113, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Flechas caindo
        chuva.flechas.forEach(f => {
            if (!f.caiu) {
                f.y += f.velocidade;
                ctx.strokeStyle = "#f39c12";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(f.x, f.y);
                ctx.lineTo(f.x, f.y - 14);
                ctx.stroke();

                if (f.y >= f.targetY) {
                    f.caiu = true;
                }
            } else {
                ctx.fillStyle = "rgba(243, 156, 18, 0.4)";
                ctx.beginPath();
                ctx.arc(f.x, f.targetY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        if (chuva.duracao <= 0) {
            window.chuvasFlechas.splice(i, 1);
        }
    }

    // Disparo Perfurante
    for (let i = window.flechasPerfurantes.length - 1; i >= 0; i--) {
        let f = window.flechasPerfurantes[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vida--;

        f.rastro.push({ x: f.x, y: f.y, alpha: 1.0 });

        ctx.save();
        for (let r of f.rastro) {
            r.alpha -= 0.08;
            ctx.fillStyle = "rgba(26, 188, 156, " + r.alpha + ")";
            ctx.beginPath();
            ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(f.x, f.y);
        ctx.rotate(f.angulo);
        ctx.fillStyle = "#1abc9c";
        ctx.shadowColor = "#2ecc71";
        ctx.shadowBlur = 12;
        ctx.fillRect(-16, -2, 32, 4);
        ctx.restore();

        if (f.vida <= 0) {
            window.flechasPerfurantes.splice(i, 1);
        }
    }

    for (let i = window.rajadasFlechas.length - 1; i >= 0; i--) {
        let r = window.rajadasFlechas[i];
        if (!r || !Array.isArray(r.flechas)) {
            window.rajadasFlechas.splice(i, 1);
            continue;
        }
        if (!Array.isArray(r.particulas)) r.particulas = [];
        if (!Array.isArray(r.ondas)) r.ondas = [];
        r.vida--;
        r.tempo++;
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.angulo);
        ctx.globalCompositeOperation = 'lighter';

        if (r.flash > 0) {
            ctx.globalAlpha = r.flash / 10;
            ctx.fillStyle = '#fff4af';
            ctx.beginPath();
            ctx.arc(0, 0, 18 + (10 - r.flash) * 3, 0, Math.PI * 2);
            ctx.fill();
            r.flash--;
        }

        r.ondas.forEach(function(inicio) {
            let idade = r.tempo - inicio;
            if (idade < 0 || idade > 58) return;
            let progressoOnda = idade / 58;
            let distanciaOnda = progressoOnda * 230;
            ctx.save();
            ctx.globalAlpha = (1 - progressoOnda) * 0.55;
            ctx.strokeStyle = '#d8ff8a';
            ctx.shadowColor = '#9eff4f';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(distanciaOnda, 0, 22 + progressoOnda * 34, -1.05, 1.05);
            ctx.stroke();
            ctx.restore();
        });

        r.flechas.forEach(function (f) {
            f.distancia += f.velocidade;
            let larguraCone = 5 + f.distancia * 0.28;
            let px = f.distancia;
            let py = f.lateral * larguraCone + Math.sin(r.tempo * 0.12 + f.lateral * 4) * 1.5;
            let anguloFlecha = f.angulo + Math.atan2(f.lateral * larguraCone, Math.max(20, f.distancia));
            f.trilha.push({ x: px, y: py, vida: 1 });
            if (f.trilha.length > 8) f.trilha.shift();

            f.trilha.forEach(function(t, indice) {
                t.vida -= 0.12;
                if (t.vida <= 0) return;
                ctx.save();
                ctx.globalAlpha = t.vida * (indice / f.trilha.length) * 0.45;
                ctx.strokeStyle = indice % 2 ? '#8dff55' : '#ffd866';
                ctx.lineWidth = f.espessura + 2;
                ctx.beginPath();
                ctx.moveTo(t.x - Math.cos(anguloFlecha) * 20, t.y - Math.sin(anguloFlecha) * 20);
                ctx.lineTo(t.x, t.y);
                ctx.stroke();
                ctx.restore();
            });

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(anguloFlecha);
            ctx.globalAlpha = Math.min(1, r.vida / 16);
            ctx.shadowColor = '#caff70';
            ctx.shadowBlur = 7;
            ctx.strokeStyle = '#62dd4e';
            ctx.lineWidth = f.espessura + 2;
            ctx.beginPath();
            ctx.moveTo(-f.comprimento, 0);
            ctx.lineTo(f.comprimento * 0.35, 0);
            ctx.stroke();
            ctx.fillStyle = '#fff4ba';
            ctx.beginPath();
            ctx.moveTo(f.comprimento, 0);
            ctx.lineTo(f.comprimento * 0.42, -4);
            ctx.lineTo(f.comprimento * 0.48, 0);
            ctx.lineTo(f.comprimento * 0.42, 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#d69b35';
            ctx.fillRect(-f.comprimento, -2, 6, 4);
            ctx.restore();
        });
        ctx.restore();

        r.particulas.forEach(function(p) {
            p.x += p.vx + 2.2;
            p.y += p.vy;
            p.vida--;
            if (p.vida > 0) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, p.vida / 18) * 0.75;
                ctx.fillStyle = p.cor;
                ctx.shadowColor = p.cor;
                ctx.shadowBlur = 5;
                ctx.fillRect(p.x - p.tamanho / 2, p.y - p.tamanho / 2, p.tamanho, p.tamanho);
                ctx.restore();
            }
        });

        if (r.vida <= 0 && r.particulas.every(function(p) { return p.vida <= 0; })) window.rajadasFlechas.splice(i, 1);
    }
};
