// classes/arqueiro.js - Sprites da Arqueira e arco de espinhos
(function () {
    const baseSprites = new URL('../sprites/classes/arqueira/', document.currentScript.src);
    const escalaSprite = 1.5 / 1.3;
    const direcoesAndando = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    const direcoesParada = ['east', 'south', 'west', 'north'];
    const gruposSprites = Object.create(null);
    const direcoesJogadores = Object.create(null);
    const posicoesJogadores = Object.create(null);
    const ultimosFramesPorJogador = Object.create(null);
    const limiteMiraFrontal = 100 * Math.PI / 180;

    function obterDirecao(angulo, andando) {
        const anguloSeguro = Number.isFinite(angulo) ? angulo : 0;
        const setor = andando
            ? ((Math.round(anguloSeguro / (Math.PI / 4)) % 8) + 8) % 8
            : ((Math.round(anguloSeguro / (Math.PI / 2)) % 4) + 4) % 4;
        const direcao = andando ? direcoesAndando[setor] : direcoesParada[setor];

        if (andando && direcao === 'south-east') return 'south-east-67e6882c';
        if (!andando && direcao === 'east') {
            return Math.sin(anguloSeguro) < 0 ? 'east-ac61aa33' : 'east-b6c5825c';
        }
        return direcao;
    }

    function obterGrupoSprites(andando, direcao) {
        const animacao = andando ? 'Walking' : 'Idle';
        const chave = animacao + ':' + direcao;
        if (gruposSprites[chave]) return gruposSprites[chave];

        const caminho = andando ? 'andando/animations/Walking/' : 'parado/animations/Idle/';
        const grupo = { imagens: [], carregadas: 0, falhou: false };
        gruposSprites[chave] = grupo;

        for (let i = 0; i < 8; i++) {
            const imagem = new Image();
            imagem.onload = function () {
                grupo.carregadas++;
            };
            imagem.onerror = function () {
                grupo.falhou = true;
                console.error('Falha ao carregar frame da Arqueira:', imagem.src);
            };
            imagem.src = new URL(caminho + direcao + '/frame_' + String(i).padStart(3, '0') + '.png', baseSprites).href;
            grupo.imagens.push(imagem);
        }
        return grupo;
    }
    window.desenharArqueiro = function (x, y, isMoving, angulo, hp, maxHp, pid, anguloMovimento) {
    if (hp <= 0 || !window.ctx) return;

    const ctx = window.ctx;
    const andando = Boolean(isMoving);
    const idJogador = pid || '__local__';
    let anguloCorpo = direcoesJogadores[idJogador];
    if (andando && Number.isFinite(anguloMovimento)) {
        anguloCorpo = anguloMovimento;
    } else if (andando && pid && pid !== window.meuId) {
        const posicaoAnterior = posicoesJogadores[idJogador];
        if (posicaoAnterior) {
            const dx = x - posicaoAnterior.x;
            const dy = y - posicaoAnterior.y;
            if (Math.hypot(dx, dy) > 0.01) anguloCorpo = Math.atan2(dy, dx);
        }
    }
    posicoesJogadores[idJogador] = { x: x, y: y };
    const anguloMira = Number.isFinite(angulo) ? angulo : (anguloCorpo || 0);
    if (!Number.isFinite(anguloCorpo)) anguloCorpo = anguloMira;

    let diferencaMira = Math.atan2(
        Math.sin(anguloMira - anguloCorpo),
        Math.cos(anguloMira - anguloCorpo)
    );
    if (Math.abs(diferencaMira) > limiteMiraFrontal) {
        anguloCorpo = anguloMira;
        diferencaMira = 0;
    }

    direcoesJogadores[idJogador] = anguloCorpo;
    const direcao = obterDirecao(anguloCorpo, andando);
    const olhandoParaCima = andando && Math.sin(anguloCorpo) < -Math.SQRT1_2;
    const olhandoParaBaixo = Math.sin(anguloCorpo) > Math.SQRT1_2;
    const deslocamentoYArco = olhandoParaCima ? -7 : olhandoParaBaixo ? 3 : -3;
    const anguloArco = anguloCorpo + Math.max(
        -limiteMiraFrontal,
        Math.min(limiteMiraFrontal, diferencaMira)
    );
    const grupo = obterGrupoSprites(andando, direcao);
    const intervalo = andando ? 110 : 160;
    const indice = Math.floor(Date.now() / intervalo) % 8;

    let tiroEm = 0;
    if (pid === undefined || pid === window.meuId) tiroEm = window.arqueiroTiroEm || 0;
    else if (window._arqueiroTiroPorId) tiroEm = window._arqueiroTiroPorId[pid] || 0;
    const dtTiro = Date.now() - tiroEm;
    let pull = 0;
    let recoil = 0;
    if (dtTiro >= 0 && dtTiro < 200) {
        if (dtTiro < 90) {
            pull = Math.min(1, dtTiro / 90);
            recoil = -pull * 0.14;
        } else {
            pull = Math.max(0, 1 - (dtTiro - 90) / 60);
            recoil = Math.sin(((dtTiro - 90) / 60) * Math.PI) * 0.20;
        }
    }

    ctx.save();
    ctx.translate(x, y);
    let imagem = grupo.imagens[indice];
    if (!imagem || !imagem.complete || imagem.naturalWidth === 0) {
        imagem = null;
        for (let distancia = 1; distancia < grupo.imagens.length; distancia++) {
            const antes = grupo.imagens[(indice - distancia + grupo.imagens.length) % grupo.imagens.length];
            const depois = grupo.imagens[(indice + distancia) % grupo.imagens.length];
            if (antes && antes.complete && antes.naturalWidth > 0) {
                imagem = antes;
                break;
            }
            if (depois && depois.complete && depois.naturalWidth > 0) {
                imagem = depois;
                break;
            }
        }
    }
    if (imagem && imagem.complete && imagem.naturalWidth > 0) {
        ultimosFramesPorJogador[idJogador] = imagem;
    } else {
        imagem = ultimosFramesPorJogador[idJogador];
    }
    const desenharArco = function () {
        let armaV = null;
        const arma = window.inventario ? window.inventario.arma : null;
        if (x === window.meuX && y === window.meuY && arma && arma.customVisual) armaV = arma;
        if (typeof window.desenharArcoExposta === 'function') {
            window.desenharArcoExposta(ctx, armaV, anguloArco, pull, recoil, deslocamentoYArco);
        }
    };
    if (olhandoParaCima) desenharArco();

    if (imagem && imagem.complete && imagem.naturalWidth > 0) {
        const suavizacaoAnterior = ctx.imageSmoothingEnabled;
        const qualidadeSuavizacaoAnterior = ctx.imageSmoothingQuality;
        const larguraSprite = imagem.naturalWidth * escalaSprite;
        const alturaSprite = imagem.naturalHeight * escalaSprite;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        try {
            ctx.drawImage(imagem, 8 - larguraSprite / 2, -3 - alturaSprite / 2, larguraSprite, alturaSprite);
        } finally {
            ctx.imageSmoothingEnabled = suavizacaoAnterior;
            ctx.imageSmoothingQuality = qualidadeSuavizacaoAnterior;
        }
    }

    if (!olhandoParaCima) desenharArco();
    ctx.restore();

    if (typeof window.desenharBarraHp === 'function') {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
    };
})();

window.enviarAtaqueArqueiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomFlecha === 'function') window.tocarSomFlecha();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_arqueiro', angulo: anguloDisparo })); }
};

window.desenharArcoExposta = function(ctx, armaVisualCustom, angulo, pull, recoil, deslocamentoY) {
    let tamanho = 20;
    let largura = 3.6;
    let cBase = "#4e3322";
    let cMeio = "#33200f";
    let cPonta = "#c98f55";
    let cFio = pull > 0 ? "#f5f0e4" : "#ecf0f1";

    if (armaVisualCustom && armaVisualCustom.customVisual) {
        let cv = armaVisualCustom.customVisual;
        if (cv.tamanho) tamanho *= cv.tamanho;
        if (cv.largura) largura *= cv.largura;
        if (cv.cBase) cBase = cv.cBase;
        if (cv.cMeio) cMeio = cv.cMeio;
        if (cv.cPonta) cPonta = cv.cPonta;
        if (cv.cFio) cFio = cv.cFio;
    }

    ctx.save();
    ctx.translate(12, 16 + (Number.isFinite(deslocamentoY) ? deslocamentoY : 0));
    ctx.rotate(angulo + recoil);
    ctx.translate(18, 0);

    // Estrutura de madeira retorcida
    ctx.strokeStyle = cBase;
    ctx.lineWidth = largura;
    ctx.beginPath();
    ctx.arc(0, 0, tamanho, -Math.PI / 2.3, Math.PI / 2.3, false);
    ctx.stroke();

    ctx.strokeStyle = cMeio;
    ctx.lineWidth = largura * (1.4 / 3.6);
    ctx.beginPath();
    ctx.arc(0, 0, tamanho * (17.5 / 20), -Math.PI / 2.4, Math.PI / 2.3, false);
    ctx.stroke();

    // EMPUNHADURA
    ctx.strokeStyle = cMeio; // default "#5a4126" in original
    ctx.lineWidth = largura * (5 / 3.6);
    ctx.beginPath();
    ctx.arc(0, 0, tamanho, -0.24, 0.24, false);
    ctx.stroke();
    for (let v = -0.16; v <= 0.16; v += 0.08) {
        ctx.strokeStyle = cPonta; // default "#7a5a38" in original
        ctx.lineWidth = largura * (1.6 / 3.6);
        ctx.beginPath();
        ctx.moveTo(Math.cos(v) * (tamanho - 1), Math.sin(v) * (tamanho - 1) + 2);
        ctx.lineTo(Math.cos(v) * (tamanho + 1), Math.sin(v) * (tamanho + 1) - 2);
        ctx.stroke();
    }

    // ESPINHOS
    for (let e = 0; e < 8; e++) {
        const ea = -Math.PI / 2.3 + (Math.PI / 2.3 * 2) * (e / 7);
        const ex = Math.cos(ea) * (tamanho + 0.5);
        const ey = Math.sin(ea) * (tamanho + 0.5);
        const dxo = Math.cos(ea);
        const dyo = Math.sin(ea);
        ctx.fillStyle = e % 2 === 0 ? cPonta : cMeio;
        ctx.beginPath();
        ctx.moveTo(ex + dxo * 2 - dyo * 1.8, ey + dyo * 2 + dxo * 1.8);
        ctx.lineTo(ex + dxo * 6, ey + dyo * 6);
        ctx.lineTo(ex + dxo * 2 + dyo * 1.8, ey + dyo * 2 - dxo * 1.8);
        ctx.closePath();
        ctx.fill();
    }

    // Corda engatilhada
    const cTopoX = Math.cos(-Math.PI / 2.3) * tamanho;
    const cTopoY = Math.sin(-Math.PI / 2.3) * tamanho;
    const cBaseX = Math.cos(Math.PI / 2.3) * tamanho;
    const cBaseY = Math.sin(Math.PI / 2.3) * tamanho;
    const nockX = -pull * tamanho * 0.75 - Math.abs(recoil) * 4;
    ctx.strokeStyle = cFio;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cTopoX, cTopoY);
    if (pull > 0.01) ctx.lineTo(nockX, 0);
    ctx.lineTo(cBaseX, cBaseY);
    ctx.stroke();

    // Flecha nockada
    if (pull > 0.15) {
        ctx.fillStyle = "#8a5a2a";
        ctx.fillRect(nockX, -1, 26, 2);
        ctx.fillStyle = "#bdc3c7";
        ctx.beginPath();
        ctx.moveTo(nockX + 26, -3.2);
        ctx.lineTo(nockX + 33, 0);
        ctx.lineTo(nockX + 26, 3.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#7a9c3a";
        ctx.fillRect(nockX, -3, 4, 2);
        ctx.fillRect(nockX, 1, 4, 2);
    }

    ctx.restore();
};