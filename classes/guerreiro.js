// classes/guerreiro.js - Renderização completa do Guerreiro
window.guerreiroPrepTimers = window.guerreiroPrepTimers || {};

window.desenharGuerreiro = function(x, y, corCapa, isMoving, anguloBase, hp, maxHp, isSpinning, spinTimer, pid) {
    if (hp <= 0 || !window.ctx) return;
    let ctx = window.ctx;

    ctx.save();
    ctx.translate(x, y);

    let agora = Date.now();
    let pctHp = (maxHp && maxHp > 0) ? (hp / maxHp) : 1;

    // Recuo elástico de preparação do Grito de Provocação (0.15s)
    let prepTimer = (pid && window.guerreiroPrepTimers[pid]) ? window.guerreiroPrepTimers[pid] : 0;
    if (prepTimer > 0) {
        let fPrep = Math.min(1.0, prepTimer / 10);
        ctx.translate(12, 16);
        ctx.scale(1.0 + Math.sin(fPrep * Math.PI) * 0.12, 1.0 - Math.sin(fPrep * Math.PI) * 0.16);
        ctx.translate(-12, -16);
    }

    let angulo = anguloBase;
    let progressoGiro = 0;
    if (isSpinning) {
        progressoGiro = (30 - (spinTimer || 0)) / 30;
        angulo = anguloBase + (progressoGiro * Math.PI * 10);
    }

    // =========================================================================
    // PASSIVA: RESISTÊNCIA DO ÚLTIMO FÔLEGO (Aura defensiva progressiva)
    // <= 50%: Aura sutil protetora (5% mitigação)
    // <= 30%: Aura intensa + partículas de determinação + escudo (10% mitigação)
    // <= 10%: Aura ardente pulsante de sobrevivência + fragmentos orbitando (15% mitigação)
    // =========================================================================
    if (pctHp <= 0.50) {
        desenharAuraUltimoFolego(ctx, pctHp, agora);
    }
    
    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(12, 32, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas (Animação de corrida)
    let legOffset = isMoving ? Math.sin(window.walkCycle || 0) * 4 : 0;
    ctx.fillStyle = "#333";
    ctx.fillRect(7, 24, 3, 7 + legOffset);
    ctx.fillRect(14, 24, 3, 7 - legOffset);

    // Capa traseira
    ctx.fillStyle = corCapa;
    ctx.beginPath();
    ctx.moveTo(4, 10);
    ctx.lineTo(20, 10);
    ctx.lineTo(24, 28);
    ctx.lineTo(0, 28);
    ctx.closePath();
    ctx.fill();
    
    // Peitoral da armadura
    let corArmadura = ((window.danoFlashTimer || 0) > 0) ? "#e74c3c" : "#8a9ea7";
    ctx.fillStyle = corArmadura;
    ctx.fillRect(4, 10, 16, 14);

    // Detalhe dourado na armadura
    ctx.fillStyle = "#f39c12";
    ctx.fillRect(10, 12, 4, 10);

    // Ombreiras
    ctx.fillStyle = "#5d6d7e";
    ctx.fillRect(2, 9, 6, 5);
    ctx.fillRect(16, 9, 6, 5);

    // Elmo e fenda do visor
    ctx.fillStyle = "#566573";
    ctx.fillRect(5, 2, 14, 10);
    ctx.fillStyle = "#111";
    ctx.fillRect(7, 5, 10, 3);
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(9, 6, 2, 1);
    ctx.fillRect(13, 6, 2, 1);

    // Pluma do elmo
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(12, -4);
    ctx.lineTo(16, 0);
    ctx.closePath();
    ctx.fill();

    // Efeito circular do Tornado (quando ativo)
    if (isSpinning) {
        ctx.save();
        ctx.translate(12, 16);
        ctx.rotate(angulo);
        ctx.globalAlpha = 1.0 - (progressoGiro * 0.3);
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 6;
        ctx.shadowColor = "#3498db";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 25, Math.PI, Math.PI * 2.5);
        ctx.stroke();
        ctx.restore();
    }

    // Espada na mão direita
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo);
    ctx.translate(isSpinning ? 22 : 18, 0);
    ctx.fillStyle = "#795548";
    ctx.fillRect(-6, -2, 6, 4);
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(-2, -6, 4, 12);
    ctx.fillStyle = "#ecf0f1";
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.lineTo(22, 0);
    ctx.lineTo(2, 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3498db";
    ctx.fillRect(2, -1, 14, 2);
    ctx.restore();

    // Escudo na mão esquerda
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(angulo + Math.PI);
    ctx.translate(isSpinning ? 22 : 16, 0);
    ctx.fillStyle = "#7f8c8d";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#bdc3c7";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(-2, -6, 4, 12);
    ctx.fillRect(-6, -2, 12, 4);
    ctx.restore();

    ctx.restore();

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueGuerreiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomCorte === 'function') window.tocarSomCorte();
    if (typeof window.criarEfeitoCorte === 'function') window.criarEfeitoCorte(window.meuX + 12, window.meuY + 16, window.meuAngulo);
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'corte' })); }
};

// Renderização dos 3 níveis da Passiva: Resistência do Último Fôlego
function desenharAuraUltimoFolego(ctx, pctHp, agora) {
    ctx.save();

    let cx = 12;
    let cy = 20;

    if (pctHp <= 0.10) {
        // =====================================================================
        // NÍVEL 3 (HP <= 10%): FÚRIA DA SOBREVIVÊNCIA (-15% Dano Recebido)
        // Aura ardente carmesim e dourada com pulso rápido e fragmentos poligonais
        // =====================================================================
        let pulsoCoracao = Math.sin(agora / 80) * 3.5;
        let raio3 = 24 + pulsoCoracao;

        // Chamas de energia subindo do solo
        for (let i = 0; i < 5; i++) {
            let offsetChama = Math.sin((agora / 120) + i * 1.3) * 6;
            let altChama = 14 + Math.sin((agora / 90) + i) * 8;
            ctx.fillStyle = (i % 2 === 0) ? "rgba(231, 76, 60, 0.4)" : "rgba(241, 196, 15, 0.4)";
            ctx.beginPath();
            ctx.ellipse(cx + (i - 2) * 6, cy + 8 - altChama / 2, 4, altChama / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Anel de contenção vital externo (Carmesim)
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, raio3, raio3 * 0.58, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(231, 76, 60, 0.9)";
        ctx.lineWidth = 3.2;
        ctx.stroke();

        // Anel interno brilhante (Dourado-Sol)
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, raio3 - 4, (raio3 - 4) * 0.58, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(241, 196, 15, 0.85)";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 3 Fragmentos de escudo prismáticos orbitando em alta velocidade
        let qtdShards = 3;
        let angBase = agora / 280;
        for (let s = 0; s < qtdShards; s++) {
            let ang = angBase + s * (Math.PI * 2 / qtdShards);
            let sx = cx + Math.cos(ang) * 26;
            let sy = cy + 4 + Math.sin(ang) * 16;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(ang + Math.PI / 2);

            // Fragmento de barreira prismática
            ctx.fillStyle = "rgba(241, 196, 15, 0.9)";
            ctx.strokeStyle = "#e74c3c";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 6);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

    } else if (pctHp <= 0.30) {
        // =====================================================================
        // NÍVEL 2 (HP <= 30%): POSTURA INABALÁVEL (-10% Dano Recebido)
        // Aura âmbar vibrante + brasões de escudo orbitando suavemente
        // =====================================================================
        let pulsoMedio = Math.sin(agora / 160) * 2.2;
        let raio2 = 20 + pulsoMedio;

        // Domo de energia protetora
        ctx.beginPath();
        ctx.ellipse(cx, cy + 8, raio2, raio2 * 0.55, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(230, 126, 34, 0.75)";
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.fillStyle = "rgba(243, 156, 18, 0.14)";
        ctx.fill();

        // 2 Pequenos fragmentos rúnicos de escudo orbitando
        let angBase2 = agora / 550;
        for (let s = 0; s < 2; s++) {
            let ang = angBase2 + s * Math.PI;
            let sx = cx + Math.cos(ang) * 22;
            let sy = cy + 4 + Math.sin(ang) * 12;

            ctx.fillStyle = "rgba(243, 156, 18, 0.85)";
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Partículas de determinação subindo
        let sparkY = (agora / 25) % 24;
        ctx.fillStyle = "rgba(255, 230, 100, 0.7)";
        ctx.beginPath();
        ctx.arc(cx - 7, cy + 12 - sparkY, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 7, cy + 16 - ((sparkY + 12) % 24), 1.5, 0, Math.PI * 2);
        ctx.fill();

    } else {
        // =====================================================================
        // NÍVEL 1 (HP <= 50%): ESCUDO DE VONTADE (-5% Dano Recebido)
        // Aura sutil protetora translúcida dourada com respiração suave
        // =====================================================================
        let pulsoSuave = Math.sin(agora / 260) * 1.5;
        let raio1 = 16 + pulsoSuave;

        ctx.beginPath();
        ctx.ellipse(cx, cy + 8, raio1, raio1 * 0.52, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(243, 156, 18, 0.4)";
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = "rgba(243, 156, 18, 0.08)";
        ctx.fill();
    }

    ctx.restore();
}

