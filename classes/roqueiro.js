// classes/roqueiro.js - Renderização do Roqueiro CANTOR DE ROCK AND ROLL
// ---------------------------------------------------------------------------
// Visual: Humano carismático, cantor de rock, roupas pretas elegantes,
// cabelo comprido/penteado estilo rock, guitarra elétrica vermelha/preta.
// Aura de notas musicais ao seu redor. Movimento elegante e dinâmico.
// ---------------------------------------------------------------------------
const ROQUEIRO_BASE_SPRITES = new URL('../sprites/classes/roqueiro/', document.currentScript.src);
const ROQUEIRO_DIRECOES_ANDANDO = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const ROQUEIRO_DIRECOES_PARADO = [
    'east-4eef18ce', 'south', 'west', 'north-b093e6a5'
];
const roqueiroGruposSprites = Object.create(null);
const roqueiroDirecoesSprites = Object.create(null);
const roqueiroUltimosFrames = Object.create(null);
let roqueiroFrameReserva = null;

function roqueiroCarregarGrupo(andando, direcao) {
    const animacao = andando ? 'walking' : 'idle';
    const chave = animacao + ':' + direcao;
    if (roqueiroGruposSprites[chave]) return roqueiroGruposSprites[chave];

    const pasta = andando ? 'andando/animations/Walking/' : 'parado/animations/Idle/';
    const grupo = { imagens: [] };
    roqueiroGruposSprites[chave] = grupo;
    for (let i = 0; i < 8; i++) {
        const imagem = new Image();
        imagem.onload = function () {
            if (!roqueiroFrameReserva) roqueiroFrameReserva = imagem;
        };
        imagem.onerror = function () {
            console.error('Falha ao carregar frame do Roqueiro:', imagem.src);
        };
        imagem.src = new URL(
            pasta + direcao + '/frame_' + String(i).padStart(3, '0') + '.png',
            ROQUEIRO_BASE_SPRITES
        ).href;
        grupo.imagens.push(imagem);
    }
    return grupo;
}

function roqueiroObterDirecao(angulo, andando, pid) {
    const direcoes = andando ? ROQUEIRO_DIRECOES_ANDANDO : ROQUEIRO_DIRECOES_PARADO;
    const passoSetor = Math.PI * 2 / direcoes.length;
    const anguloSeguro = Number.isFinite(angulo) ? angulo : 0;
    const anterior = roqueiroDirecoesSprites[pid];
    let setor = ((Math.round(anguloSeguro / passoSetor) % direcoes.length) + direcoes.length) % direcoes.length;
    if (anterior && anterior.andando === andando) {
        const centroAnterior = anterior.setor * passoSetor;
        const diferenca = Math.atan2(
            Math.sin(anguloSeguro - centroAnterior),
            Math.cos(anguloSeguro - centroAnterior)
        );
        if (Math.abs(diferenca) < passoSetor / 2 + Math.PI / 36) setor = anterior.setor;
    }
    roqueiroDirecoesSprites[pid] = { andando: andando, setor: setor };
    return direcoes[setor];
}

function roqueiroObterFrame(grupo, indice) {
    if (!grupo) return null;
    const atual = grupo.imagens[indice];
    if (atual && atual.complete && atual.naturalWidth > 0) return atual;
    for (let distancia = 1; distancia < grupo.imagens.length; distancia++) {
        const anterior = grupo.imagens[(indice - distancia + grupo.imagens.length) % grupo.imagens.length];
        const seguinte = grupo.imagens[(indice + distancia) % grupo.imagens.length];
        if (anterior && anterior.complete && anterior.naturalWidth > 0) return anterior;
        if (seguinte && seguinte.complete && seguinte.naturalWidth > 0) return seguinte;
    }
    return null;
}

function roqueiroAlinharNaGrade(ctx, x, y) {
    if (typeof ctx.getTransform !== 'function') return { x: x, y: y };
    const transformacao = ctx.getTransform();
    const determinante = transformacao.a * transformacao.d - transformacao.b * transformacao.c;
    if (!Number.isFinite(determinante) || Math.abs(determinante) < 0.000001) return { x: x, y: y };
    const telaX = transformacao.a * x + transformacao.c * y + transformacao.e;
    const telaY = transformacao.b * x + transformacao.d * y + transformacao.f;
    const deltaX = Math.round(telaX) - telaX;
    const deltaY = Math.round(telaY) - telaY;
    return {
        x: x + (transformacao.d * deltaX - transformacao.c * deltaY) / determinante,
        y: y + (-transformacao.b * deltaX + transformacao.a * deltaY) / determinante
    };
}

function roqueiroDesenharSprite(ctx, andando, angulo, pid) {
    const direcao = roqueiroObterDirecao(angulo, andando, pid);
    const grupo = roqueiroCarregarGrupo(andando, direcao);
    const indice = Math.floor(Date.now() / (andando ? 110 : 160)) % 8;
    let imagem = roqueiroObterFrame(grupo, indice);
    if (!imagem && roqueiroFrameReserva && roqueiroFrameReserva.complete && roqueiroFrameReserva.naturalWidth > 0) {
        imagem = roqueiroFrameReserva;
    }
    if (imagem) roqueiroUltimosFrames[pid] = imagem;
    else imagem = roqueiroUltimosFrames[pid];
    if (!imagem || !imagem.complete || imagem.naturalWidth <= 0) return;

    const posicao = roqueiroAlinharNaGrade(ctx, 0, 0);
    const suavizacaoAnterior = ctx.imageSmoothingEnabled;
    const qualidadeAnterior = ctx.imageSmoothingQuality;
    ctx.save();
    ctx.translate(posicao.x, posicao.y);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    try {
        ctx.drawImage(imagem, -36, -47, imagem.naturalWidth, imagem.naturalHeight);
    } finally {
        ctx.imageSmoothingEnabled = suavizacaoAnterior;
        ctx.imageSmoothingQuality = qualidadeAnterior;
        ctx.restore();
    }
}

ROQUEIRO_DIRECOES_PARADO.forEach(function (direcao) { roqueiroCarregarGrupo(false, direcao); });
ROQUEIRO_DIRECOES_ANDANDO.forEach(function (direcao) { roqueiroCarregarGrupo(true, direcao); });

window.desenharRoqueiro = function(x, y, isMoving, angulo, hp, maxHp, pid, anguloMovimento) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;
    const t = Date.now() / 1000;

    ctx.save();
    ctx.translate(x, y);

    // Aura passiva de notas musicais (isolada por jogador / pid)
    if (!window.notasMusicaisPorPid) window.notasMusicaisPorPid = {};
    let safePid = pid || 'local';
    if (!window.notasMusicaisPorPid[safePid]) window.notasMusicaisPorPid[safePid] = [];
    let notas = window.notasMusicaisPorPid[safePid];
    let isBateria = (safePid === 'local' || safePid === window.meuId) ? !!window.roqueiroBateriaLigada : false;
    let chanceNota = isBateria ? 0.22 : 0.10;
    if (notas.length < 20 && Math.random() < chanceNota) {
        notas.push({
            x: 12 + (Math.random() - 0.5) * 40,
            y: 16 + (Math.random() - 0.5) * 40,
            vy: -1.0 - Math.random(),
            alpha: 1.0,
            char: ['🎵', '🎶', '🎸', '🤘', '⚡'][Math.floor(Math.random() * 5)],
            escala: isBateria ? 1.6 : 1.0
        });
    }
    notas.forEach((nota, index) => {
        ctx.save();
        ctx.globalAlpha = nota.alpha;
        ctx.font = Math.floor(12 * nota.escala) + "px Arial";
        ctx.fillStyle = isBateria ? "#f1c40f" : "#ecf0f1";
        ctx.fillText(nota.char, nota.x, nota.y);
        ctx.restore();
        nota.y += nota.vy;
        nota.alpha -= 0.03;
        if (nota.alpha <= 0) notas.splice(index, 1);
    });

    const anguloSprite = isMoving && Number.isFinite(anguloMovimento)
        ? anguloMovimento
        : (Number.isFinite(angulo) ? angulo : 0);
    const olhandoParaCima = Math.sin(anguloSprite) < -Math.SQRT1_2;
    const desenharGuitarra = function() {
        ctx.save();
        const ladoGuitarra = Math.cos(anguloSprite) < 0 ? -1 : 1;
        const lateral = Math.abs(Math.cos(anguloSprite)) > Math.SQRT1_2;
        ctx.translate(12, lateral ? -10 : -7);
        ctx.scale(ladoGuitarra, 1);
        ctx.rotate(-0.48);

        let golpeEm = 0;
        if (pid === undefined || pid === window.meuId) golpeEm = window.roqueiroGuitarraGolpeEm || 0;
        else if (window._roqueiroGolpePorId) golpeEm = window._roqueiroGolpePorId[pid] || 0;
        const dtGolpe = Date.now() - golpeEm;
        if (dtGolpe >= 0 && dtGolpe < 200) {
            ctx.rotate(Math.sin((dtGolpe / 200) * Math.PI) * 0.9);
        }

        const wp = window.inventario ? window.inventario.arma : null;
        const armaV = x === window.meuX && y === window.meuY && wp && wp.customVisual ? wp : null;
        if (typeof window.desenharGuitarraExposta === 'function') window.desenharGuitarraExposta(ctx, armaV);
        ctx.restore();
    };

    if (olhandoParaCima) desenharGuitarra();
    roqueiroDesenharSprite(ctx, Boolean(isMoving), anguloSprite, safePid);
    if (!olhandoParaCima) desenharGuitarra();

    ctx.restore(); // fim translate principal

    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

// ===== FUNÇÃO: LACAIO VOCALISTA DA BANDA =====
window.desenharBandaRoqueiro = function(listaBanda) {
    if (!window.ctx) return;
    let ctx = window.ctx;
    const t = Date.now() / 1000;

    for (let bId in listaBanda) {
        let banda = listaBanda[bId];
        if (banda && banda.membros) {
            banda.membros.forEach(membro => {
                ctx.save();
                ctx.translate(membro.x, membro.y);

                const pulse = 0.5 + Math.sin(t * 8 + (membro.x || 0) * 0.03) * 0.5;
                const cantando = Math.sin(t * 7 + (membro.y || 0) * 0.02);
                const passoVocalista = Math.sin(t * 5 + (membro.x || 0) * 0.04) * 1.2;

                // Calca escura, botas e casaco de palco com abas vermelhas.
                ctx.fillStyle = "#16151c";
                ctx.fillRect(-3.4, 8 + passoVocalista, 2.8, 7);
                ctx.fillRect(0.6, 8 - passoVocalista, 2.8, 7);
                ctx.fillStyle = "#6f202b";
                ctx.fillRect(-4, 14 + passoVocalista, 4, 2);
                ctx.fillRect(0, 14 - passoVocalista, 4, 2);
                ctx.fillStyle = "#211923";
                ctx.beginPath();
                ctx.moveTo(-5, -2); ctx.lineTo(5, -2); ctx.lineTo(6, 10);
                ctx.lineTo(2, 8); ctx.lineTo(0, 12); ctx.lineTo(-2, 8); ctx.lineTo(-6, 10);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = "#a52d3d"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 7); ctx.stroke();
                ctx.fillStyle = "#d5b06b";
                ctx.beginPath(); ctx.arc(0, 4, 1.1, 0, Math.PI * 2); ctx.fill();

                // Rosto aquecido pelo palco, cabelo vermelho e boca em canto.
                ctx.fillStyle = "#c98768";
                ctx.beginPath(); ctx.ellipse(0, -7, 4.1, 4.8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#8f1f32";
                ctx.beginPath();
                ctx.moveTo(-4, -8); ctx.lineTo(-6, -13); ctx.lineTo(-1, -11);
                ctx.lineTo(1, -15); ctx.lineTo(2, -11); ctx.lineTo(6, -12);
                ctx.lineTo(4, -7); ctx.lineTo(3, -4); ctx.lineTo(-3, -5);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#27141a";
                ctx.fillRect(-2.5, -8, 1.4, 0.8);
                ctx.fillRect(1.2, -8, 1.4, 0.8);
                ctx.fillStyle = "#45121d";
                ctx.beginPath(); ctx.ellipse(0.5, -4.5, 1.1, 1.6 + Math.abs(cantando) * 0.8, 0, 0, Math.PI * 2); ctx.fill();

                // Microfone erguido na mao e ondas sonoras do vocal.
                ctx.strokeStyle = "#c98768"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
                ctx.beginPath(); ctx.moveTo(3, 1); ctx.quadraticCurveTo(6, -1, 5, -5); ctx.stroke();
                ctx.strokeStyle = "#bfc6d2"; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(6.5, -11); ctx.stroke();
                ctx.fillStyle = "#181a22";
                ctx.beginPath(); ctx.ellipse(6.7, -12, 2, 2.8, -0.2, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "#c33b52"; ctx.lineWidth = 0.8;
                ctx.beginPath(); ctx.arc(0, -9, 10 + pulse * 2, -2.5, -0.6); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, -9, 14 + pulse * 3, -2.45, -0.65); ctx.stroke();

                ctx.restore();  // fecha o save() da linha 325 (membro inteiro)
            });
        }
    }
};

window.enviarAtaqueRoqueiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomMagiaBasica === 'function') window.tocarSomMagiaBasica();
    window.roqueiroGuitarraGolpeEm = Date.now();
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_roqueiro' })); }
};

window.desenharGuitarraExposta = function(ctx, armaVisualCustom) {
    let t = Date.now() / 1000;
    let strum = window.roqueiroBateriaLigada ? Math.sin(Date.now() / 55) * 0.18 : Math.sin(t * 2.2) * 0.06;

    let cv = armaVisualCustom && armaVisualCustom.customVisual ? armaVisualCustom.customVisual : {};
    let tamanho = cv.tamanho || 1.0;
    let largura = cv.largura || 1.0;
    let cBase = cv.cBase || "#b30000";
    let cMeio = cv.cMeio || "#c0392b";
    let cPonta = cv.cPonta || "#000";
    let cFio = cv.cFio || "#daa520";

    ctx.save();
    // Diminui 10% geral (0.9) e move um pouco para baixo (+1.5 no eixo Y)
    ctx.translate(0, 1.5);
    ctx.scale(tamanho * 0.9, largura * 0.9);

    // ===== CORPO DA GUITARRA =====
    ctx.save();
    ctx.translate(-5, 0);

    // Asa superior (horn) da guitarra
    ctx.fillStyle = cMeio;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-8, -12);
    ctx.lineTo(-2, -10);
    ctx.lineTo(1, -5);
    ctx.closePath();
    ctx.fill();

    // Asa inferior (horn) da guitarra
    ctx.beginPath();
    ctx.moveTo(2, 1);
    ctx.lineTo(-6, 5);
    ctx.lineTo(-8, 12);
    ctx.lineTo(-2, 10);
    ctx.lineTo(1, 5);
    ctx.closePath();
    ctx.fill();

    // Corpo central (round body elétrico)
    ctx.fillStyle = cBase;
    ctx.beginPath();
    ctx.moveTo(-1, -7);
    ctx.quadraticCurveTo(-15, -9, -16, 0);
    ctx.quadraticCurveTo(-15, 9, -1, 7);
    ctx.closePath();
    ctx.fill();

    // Contorno preto na guitarra
    ctx.strokeStyle = cPonta;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Binding dourado (borda)
    ctx.strokeStyle = cFio;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-1, -6);
    ctx.quadraticCurveTo(-14, -7.5, -15, 0);
    ctx.quadraticCurveTo(-14, 7.5, -1, 6);
    ctx.stroke();

    // Pickups (captadores) - pretos
    ctx.fillStyle = "#000";
    ctx.fillRect(-6, -2, 4, 1.2);
    ctx.fillRect(-6, 1, 4, 1.2);

    // Buraco do som
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(-8, 0, 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Ponte (bridge)
    ctx.fillStyle = "#999";
    ctx.fillRect(-7, -0.5, 3, 1);

    ctx.restore();

    // ===== BRAÇO DA GUITARRA (neck) =====
    ctx.save();
    ctx.rotate(-0.04 + strum * 0.5);
    
    // Neck de madeira
    ctx.fillStyle = "#8b6914";
    ctx.fillRect(0, -1.4, 20, 2.8);
    
    // Escala (fretboard)
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(1.5, -1.2, 18, 2.4);
    
    // Trastes (frets)
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 0.4;
    for (let fret = 3; fret <= 19; fret += 2.2) {
        ctx.beginPath();
        ctx.moveTo(fret, -1.2);
        ctx.lineTo(fret, 1.2);
        ctx.stroke();
    }
    
    // Headstock (cabeçalho)
    ctx.fillStyle = cPonta;
    ctx.beginPath();
    ctx.moveTo(20, -1.4);
    ctx.lineTo(25, -2.8);
    ctx.lineTo(26, 0);
    ctx.lineTo(25, 2.8);
    ctx.lineTo(20, 1.4);
    ctx.closePath();
    ctx.fill();
    
    // Tuners (tarraxas)
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.arc(23, -2.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(24, 0, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(23, 2.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    ctx.restore();
};
