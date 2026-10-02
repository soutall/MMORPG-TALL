// classes/florim.js — Florim v2.0: Entidade vegetal feminina, raízes ancestrais, rosas e Arma Flutuante
(function(){
'use strict';

function corDano(normal, flash) {
    return (window.danoFlashTimer && window.danoFlashTimer > 0) ? flash : normal;
}

// Estado inercial da arma flutuante da Florim
window.florimArmas = window.florimArmas || {};

window.desenharFlorim = function(x, y, isMoving, angulo, hp, maxHp) {
    const ctx = window.ctx || (document.getElementById('gameCanvas') ? document.getElementById('gameCanvas').getContext('2d') : null);
    if (!ctx || hp <= 0) return;
    
    ctx.save();
    ctx.translate(x, y);
    
    const t = performance.now() / 1000;
    const ang = Number.isFinite(angulo) ? angulo : 0;
    const flip = Math.cos(ang) < 0 ? -1 : 1;
    
    // Animações de respiração e passos
    let passo = isMoving ? Math.sin(window.walkCycle || (t * 8)) : 0;
    let passo2 = isMoving ? Math.cos(window.walkCycle || (t * 8)) : 0;
    let breath = Math.sin(t * 2.0) * 0.8;
    let floatOsc = Math.sin(t * 2.6) * 3;
    
    // Paleta de Cores Texturizadas da Florim
    const cCascaEscura = corDano('#2a1a0c', '#ffffff');
    const cCascaBase = corDano('#4d331a', '#ffffff');
    const cCascaMedia = corDano('#6b4724', '#ffffff');
    const cCascaLuz = corDano('#8c6239', '#ffffff');
    
    const cVinhaEscura = corDano('#1c3614', '#ffffff');
    const cVinhaBase = corDano('#2f5922', '#ffffff');
    const cVinhaClara = corDano('#488235', '#ffffff');
    const cVinhaLuz = corDano('#66b34b', '#ffffff');
    
    const cFolhaEscura = corDano('#234a1a', '#ffffff');
    const cFolhaBase = corDano('#417d2f', '#ffffff');
    const cFolhaLuz = corDano('#6ab84d', '#ffffff');
    
    const cRosaEscura = corDano('#8c1b3d', '#ffffff');
    const cRosaBase = corDano('#d63364', '#ffffff');
    const cRosaClara = corDano('#f0658e', '#ffffff');
    const cRosaCentro = corDano('#ffd154', '#ffffff');
    
    const cSeiva = corDano('#88ff44', '#ffffff');
    const cRosto = corDano('#749658', '#ffffff');
    const cRostoSombra = corDano('#55733d', '#ffffff');
    
    // -------------------------------------------------------------
    // [CAMADA 1] SOMBRAS NO SOLO (Personagem e Arma Flutuante)
    // -------------------------------------------------------------
    // Sombra do corpo
    ctx.save();
    ctx.fillStyle = 'rgba(10, 20, 8, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Sombra da arma flutuante
    const armaOffsetBaseX = flip * 19;
    const armaOffsetBaseY = -12 + floatOsc;
    const escalaArmaSombra = Math.max(0.5, 1.0 - (Math.abs(floatOsc) / 20));
    ctx.fillStyle = 'rgba(10, 20, 8, 0.35)';
    ctx.beginPath();
    ctx.ellipse(armaOffsetBaseX, 11, 7 * escalaArmaSombra, 3.5 * escalaArmaSombra, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // -------------------------------------------------------------
    // [CAMADA 2] AURA VEGETAL PASSIVA
    // -------------------------------------------------------------
    ctx.save();
    const pulsoAura = Math.sin(t * 3.2) * 0.18 + 0.82;
    const gradAura = ctx.createRadialGradient(0, -14, 2, 0, -14, 38 * pulsoAura);
    gradAura.addColorStop(0, 'rgba(106, 184, 77, 0.22)');
    gradAura.addColorStop(0.5, 'rgba(65, 125, 47, 0.10)');
    gradAura.addColorStop(1, 'rgba(30, 70, 20, 0)');
    ctx.fillStyle = gradAura;
    ctx.beginPath();
    ctx.arc(0, -14, 38 * pulsoAura, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Helper: desenha uma Rosa procedural realista com pétalas em camadas
    function desenharRosaTexturizada(rx, ry, escala, rotacao) {
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(rotacao || 0);
        ctx.scale(escala, escala);
        
        // Camada externa (pétalas escuras)
        ctx.fillStyle = cRosaEscura;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.ellipse(Math.cos(i * 1.256) * 3, Math.sin(i * 1.256) * 3, 3.2, 2.2, i * 1.256, 0, Math.PI * 2);
            ctx.fill();
        }
        // Camada intermediária (pétalas vivas)
        ctx.fillStyle = cRosaBase;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.ellipse(Math.cos(i * 1.256 + 0.6) * 2, Math.sin(i * 1.256 + 0.6) * 2, 2.4, 1.8, i * 1.256 + 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        // Camada interna / miolo
        ctx.fillStyle = cRosaClara;
        ctx.beginPath();
        ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = cRosaCentro;
        ctx.beginPath();
        ctx.arc(0.3, -0.3, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // -------------------------------------------------------------
    // [CAMADA 3] CORPO DA FLORIM (Orientação 2.5D com Flip)
    // -------------------------------------------------------------
    ctx.save();
    ctx.scale(flip, 1);

    // 1. Raízes Traseiras (Pernas de Apoio com texturas de casca)
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Raiz traseira esquerda
    ctx.strokeStyle = cCascaEscura;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.quadraticCurveTo(-11 - passo * 4, 3, -14 - passo * 5, 11 - passo2 * 2);
    ctx.stroke();
    // Sub-raiz fina
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-11 - passo * 4, 6);
    ctx.lineTo(-17 - passo * 5, 12);
    ctx.stroke();

    // Raiz traseira direita
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = cCascaBase;
    ctx.beginPath();
    ctx.moveTo(3, -4);
    ctx.quadraticCurveTo(8 + passo * 4, 3, 11 + passo * 5, 10 + passo2 * 2);
    ctx.stroke();

    // 2. Raízes Frontais Robustas (Pernas principais de sustentação)
    ctx.lineWidth = 4.8;
    ctx.strokeStyle = cCascaBase;
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.quadraticCurveTo(-7 + passo * 5, 4, -9 + passo * 6, 12 + passo2 * 3);
    ctx.stroke();
    // Filete de luz na casca da raiz
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = cCascaLuz;
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.quadraticCurveTo(-6 + passo * 5, 4, -7 + passo * 6, 10 + passo2 * 3);
    ctx.stroke();

    // Raiz frontal central
    ctx.lineWidth = 5.2;
    ctx.strokeStyle = cCascaMedia;
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.quadraticCurveTo(5 - passo * 5, 4, 7 - passo * 6, 12 - passo2 * 3);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = cCascaLuz;
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.quadraticCurveTo(4 - passo * 5, 4, 5 - passo * 6, 11 - passo2 * 3);
    ctx.stroke();

    // 3. Cipós Envolventes nos Joelhos/Quadris com Espinhos e Rosas
    ctx.strokeStyle = cVinhaEscura;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -3, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Espinhos nos quadris
    ctx.fillStyle = cVinhaLuz;
    ctx.beginPath();
    ctx.moveTo(-7, -2); ctx.lineTo(-11, -3); ctx.lineTo(-8, 0); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7, -2); ctx.lineTo(11, -3); ctx.lineTo(8, 0); ctx.fill();

    // Rosas na cintura
    desenharRosaTexturizada(-6, -2, 0.85, 0.2);
    desenharRosaTexturizada(5, -1, 0.95, -0.3);
    desenharRosaTexturizada(0, -3, 0.75, 0.5);

    // 4. Torso de Vinhas Entrelaçadas com Anatomia Feminina
    ctx.save();
    ctx.translate(0, -13 + breath);

    // Gradiente do corpo
    const gradTorso = ctx.createLinearGradient(-6, -12, 6, 6);
    gradTorso.addColorStop(0, cVinhaLuz);
    gradTorso.addColorStop(0.4, cVinhaBase);
    gradTorso.addColorStop(1, cVinhaEscura);
    ctx.fillStyle = gradTorso;
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.bezierCurveTo(-7, 1, -5, -6, -6, -11);
    ctx.bezierCurveTo(-2, -13, 2, -13, 6, -11);
    ctx.bezierCurveTo(5, -6, 7, 1, 5, 6);
    ctx.closePath();
    ctx.fill();

    // Nervuras / Vinhas cruzadas no torso (efeito espartilho vegetal)
    ctx.strokeStyle = cVinhaLuz;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-5, -8); ctx.lineTo(4, -3);
    ctx.moveTo(-4, -4); ctx.lineTo(5, 2);
    ctx.moveTo(5, -8); ctx.lineTo(-4, -3);
    ctx.moveTo(4, -4); ctx.lineTo(-5, 2);
    ctx.stroke();

    // Rosas no busto / ombros
    desenharRosaTexturizada(-4, -7, 0.7, 0.1);
    desenharRosaTexturizada(4, -6, 0.8, -0.2);
    desenharRosaTexturizada(0, -10, 0.6, 0.4);

    // 5. Braço Esquerdo (Traseiro)
    ctx.save();
    ctx.translate(-6, -9);
    ctx.rotate(-0.2 + Math.sin(t * 2.5) * 0.1);
    ctx.strokeStyle = cCascaMedia;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4, 7, -2, 14);
    ctx.stroke();
    // Garras
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = cCascaLuz;
    ctx.beginPath();
    ctx.moveTo(-2, 14); ctx.lineTo(-5, 18);
    ctx.moveTo(-2, 14); ctx.lineTo(-2, 19);
    ctx.moveTo(-2, 14); ctx.lineTo(1, 18);
    ctx.stroke();
    // Rosa no pulso
    desenharRosaTexturizada(-2, 13, 0.6, 0);
    ctx.restore();

    // 6. Braço Direito (Frontal)
    ctx.save();
    ctx.translate(6, -9);
    ctx.rotate(0.3 - Math.sin(t * 2.5) * 0.12);
    ctx.strokeStyle = cCascaBase;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(5, 7, 3, 14);
    ctx.stroke();
    // Espinhos no antebraço
    ctx.fillStyle = cVinhaLuz;
    ctx.beginPath();
    ctx.moveTo(4, 5); ctx.lineTo(7, 4); ctx.lineTo(5, 8); ctx.fill();
    // Garras
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = cCascaLuz;
    ctx.beginPath();
    ctx.moveTo(3, 14); ctx.lineTo(6, 18);
    ctx.moveTo(3, 14); ctx.lineTo(3, 19);
    ctx.moveTo(3, 14); ctx.lineTo(0, 18);
    ctx.stroke();
    // Rosa no ombro e punho
    desenharRosaTexturizada(1, 0, 0.8, -0.4);
    desenharRosaTexturizada(3, 13, 0.65, 0.3);
    ctx.restore();

    // 7. Cabeça e Cabeleira Foliar
    ctx.save();
    ctx.translate(0, -14);

    // Cabeleira de folhas volumosas (Camada traseira)
    ctx.fillStyle = cFolhaEscura;
    ctx.strokeStyle = cFolhaBase;
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
        let angFolha = (i / 9) * Math.PI * 1.8 - Math.PI * 0.9;
        let rFolha = 10 + Math.sin(t * 2 + i) * 1.5;
        let fx = Math.cos(angFolha) * rFolha;
        let fy = Math.sin(angFolha) * (rFolha * 0.85) - 3;
        
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(angFolha + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Nervura central
        ctx.strokeStyle = cFolhaLuz;
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(0, 6);
        ctx.stroke();
        ctx.restore();
    }

    // Rosto Élfico de Seiva
    ctx.fillStyle = cRosto;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.bezierCurveTo(-5, 0, -3, 4, 0, 5);
    ctx.bezierCurveTo(3, 4, 5, 0, 4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = cRostoSombra;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Orelha élfica pontuda de folha
    ctx.fillStyle = cFolhaBase;
    ctx.beginPath();
    ctx.moveTo(3.5, -2);
    ctx.lineTo(8, -5);
    ctx.lineTo(3.5, 0);
    ctx.closePath();
    ctx.fill();

    // Olhos brilhantes de pura seiva viva
    ctx.fillStyle = cSeiva;
    ctx.beginPath();
    ctx.ellipse(-1.8, -1, 1.6, 1.1, 0.1, 0, Math.PI * 2);
    ctx.ellipse(1.8, -1, 1.6, 1.1, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // Brilho especular dos olhos
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1.5, -1.3, 0.6, 0, Math.PI * 2);
    ctx.arc(2.1, -1.3, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Lábios delicados
    ctx.fillStyle = cRosaEscura;
    ctx.beginPath();
    ctx.arc(0, 2.4, 0.9, 0, Math.PI);
    ctx.fill();

    // Tiara de Rosas e Folhas na Cabeça
    desenharRosaTexturizada(-4, -6, 0.8, -0.2);
    desenharRosaTexturizada(0, -8, 0.95, 0.1);
    desenharRosaTexturizada(4, -5, 0.75, 0.3);
    desenharRosaTexturizada(-7, -2, 0.6, -0.4);

    ctx.restore(); // Fim cabeça
    ctx.restore(); // Fim torso
    ctx.restore(); // Fim corpo

    // -------------------------------------------------------------
    // [CAMADA 4] A GRANDE ARMA FLUTUANTE DA FLORIM (Floating Briar Scepter)
    // -------------------------------------------------------------
    ctx.save();
    // Posição inercial flutuante ao lado do personagem
    const armaX = flip * 22;
    const armaY = -14 + floatOsc;
    ctx.translate(armaX, armaY);

    // Inclinação sutil apontando para o ângulo de ataque
    let angArma = Math.sin(t * 1.8) * 0.1 + (ang * 0.25);
    ctx.rotate(angArma);

    // 1. Haste do Cetro Ancestral (Madeira retorcida com nós)
    ctx.save();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = cCascaBase;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(-2, 0, 0, -18);
    ctx.stroke();

    // Vinha verde enrolada em espiral na haste
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = cVinhaLuz;
    ctx.beginPath();
    ctx.moveTo(-1, 16); ctx.lineTo(1, 10);
    ctx.moveTo(-1, 6); ctx.lineTo(1, 0);
    ctx.moveTo(-1, -4); ctx.lineTo(1, -10);
    ctx.stroke();

    // Espinhos afiados ao longo do cetro
    ctx.fillStyle = cVinhaLuz;
    ctx.beginPath();
    ctx.moveTo(1, 8); ctx.lineTo(4, 7); ctx.lineTo(2, 10); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-1, -2); ctx.lineTo(-4, -3); ctx.lineTo(-2, 0); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1, -12); ctx.lineTo(4, -13); ctx.lineTo(2, -10); ctx.fill();

    // 2. Cálice Floral no Topo
    ctx.fillStyle = cFolhaBase;
    ctx.beginPath();
    ctx.arc(0, -18, 4.5, 0, Math.PI);
    ctx.fill();

    // Rosas em torno da base do orbe
    desenharRosaTexturizada(-3, -19, 0.65, -0.3);
    desenharRosaTexturizada(3, -19, 0.65, 0.3);

    // 3. O GRANDE ORBE MÍSTICO DE SEIVA VIVA
    const pulsoOrbe = Math.sin(t * 4.5) * 0.15 + 0.85;
    const raioOrbe = 6.5 * pulsoOrbe;
    
    // Halo luminoso do orbe
    const gradOrbeHalo = ctx.createRadialGradient(0, -26, 1, 0, -26, 18 * pulsoOrbe);
    gradOrbeHalo.addColorStop(0, 'rgba(136, 255, 68, 0.7)');
    gradOrbeHalo.addColorStop(0.5, 'rgba(106, 184, 77, 0.3)');
    gradOrbeHalo.addColorStop(1, 'rgba(40, 100, 20, 0)');
    ctx.fillStyle = gradOrbeHalo;
    ctx.beginPath();
    ctx.arc(0, -26, 18 * pulsoOrbe, 0, Math.PI * 2);
    ctx.fill();

    // Esfera central de seiva concentrada
    const gradOrbe = ctx.createRadialGradient(-1.5, -28, 1, 0, -26, raioOrbe);
    gradOrbe.addColorStop(0, '#ffffff');
    gradOrbe.addColorStop(0.3, cSeiva);
    gradOrbe.addColorStop(0.7, cFolhaLuz);
    gradOrbe.addColorStop(1, cVinhaEscura);
    ctx.fillStyle = gradOrbe;
    ctx.beginPath();
    ctx.arc(0, -26, raioOrbe, 0, Math.PI * 2);
    ctx.fill();

    // 4. Folhas Místicas em Órbita do Orbe
    for (let k = 0; k < 3; k++) {
        let angOrbita = t * 3.5 + (k * Math.PI * 2 / 3);
        let distOrbitaX = Math.cos(angOrbita) * 11;
        let distOrbitaY = Math.sin(angOrbita) * 5.5;
        
        ctx.save();
        ctx.translate(distOrbitaX, -26 + distOrbitaY);
        ctx.rotate(angOrbita);
        ctx.fillStyle = cFolhaLuz;
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.8, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Partículas de pólen dourado saindo do cetro
    ctx.fillStyle = cRosaCentro;
    for (let p = 0; p < 4; p++) {
        let pAng = t * 2.8 + p * 1.5;
        let px = Math.cos(pAng) * (7 + p * 2);
        let py = -26 + Math.sin(pAng * 1.4) * 8;
        let pAlpha = Math.sin(t * 3 + p) * 0.5 + 0.5;
        ctx.globalAlpha = pAlpha;
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
    ctx.restore();

    // -------------------------------------------------------------
    // [CAMADA 5] GOTAS DE SEIVA CINTILANTE PULSANTES
    // -------------------------------------------------------------
    ctx.fillStyle = cSeiva;
    const pingarSeiva = (px, py, offset) => {
        let opacidade = Math.sin(t * 4 + offset) * 0.5 + 0.5;
        ctx.globalAlpha = opacidade;
        ctx.beginPath();
        ctx.arc(px, py + breath, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    };
    pingarSeiva(-7, -18, 0);
    pingarSeiva(6, -12, 1);
    pingarSeiva(-3, -6, 2);
    pingarSeiva(8, -22, 3);

    ctx.restore(); // Fim do translate inicial
};

window.enviarAtaqueFlorim = function(anguloForcado, alvoTipo, alvoId) {
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
    
    let msg = { action: 'ataque_florim' };
    
    if (anguloForcado !== undefined && anguloForcado !== null) {
        msg.angulo = anguloForcado;
    } else {
        if (Number.isFinite(window.mouseAngulo)) {
            msg.angulo = window.mouseAngulo;
        } else if (Number.isFinite(window.meuAngulo)) {
            msg.angulo = window.meuAngulo;
        } else {
            msg.angulo = 0;
        }
    }
    
    if (alvoTipo && alvoId) {
        msg.alvoTipo = alvoTipo;
        msg.alvoId = alvoId;
    }
    
    window.ws.send(JSON.stringify(msg));
};

})();