// classes/mago.js — Renderização completa do Mago (v2: visual 2.5D)
// ============================================================================
// INTERFACE PÚBLICA IDÊNTICA À v1 — nada fora deste arquivo mudou:
//     window.desenharMago(x, y, isMoving, angulo, hp, maxHp)
// Estado externo lido (os mesmos de antes):
//     window.ctx, window.walkCycle, window.danoFlashTimer,
//     window.modoMiraMeteoro, window.modoMiraNevasca
//
// O que mudou em relação à v1 (que era: retângulos + triângulos + um círculo):
//   • silhueta da túnica, do capuz e do chapéu em CURVAS (quadraticCurveTo)
//   • sombreamento por gradientes — luz vinda de noroeste, como o resto da cidade
//   • contorno escuro em toda a silhueta: é o que faz o personagem "aparecer"
//     quando ele tem só ~20x34 px na tela
//   • rosto na sombra do capuz, olhos que pulsam, aura arcana nos pés
//   • chapéu de ponta dobrada, com aba, faixa dourada e estrela no peito
//   • cajado com haste curva, aros de metal, gavinhas e CRISTAL facetado com
//     núcleo, halo e faíscas orbitando (era um círculo roxo com shadowBlur)
// ============================================================================
window.desenharMago = function (x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    const ctx = window.ctx;

    // ---------- tempo / animação ----------
    const t = Date.now() / 1000;
    const ciclo = window.walkCycle || 0;
    const passo = isMoving ? Math.sin(ciclo) : 0;                              // -1..1 (pernas)
    const sobe = isMoving ? Math.abs(Math.sin(ciclo)) * 1.2                    // balanço ao andar
                          : Math.sin(t * 2.1) * 0.45 + 0.45;                   // respiração parada
    const ang = angulo || 0;
    const dano = (window.danoFlashTimer || 0) > 0;
    const cor = (normal, flash) => (dano ? flash : normal);

    // ---------- paleta ----------
    const TUNICA_TOPO = cor('#a05ac4', '#ff8f7d');
    const TUNICA_MEIO = cor('#6c3483', '#e74c3c');
    const TUNICA_BASE = cor('#371a45', '#a93226');
    const MANGA       = cor('#5b2c78', '#d1442f');
    const CAPUZ_TOPO  = cor('#5b2c78', '#e04b3a');
    const CAPUZ_BASE  = cor('#2a1030', '#8e2a1f');
    const CHAPEU_TOPO = cor('#8e44ad', '#ff9b8a');
    const CHAPEU_MEIO = cor('#5b2c78', '#e04b3a');
    const CHAPEU_BASE = cor('#2e1236', '#a93226');
    const OURO        = cor('#f1c40f', '#ffe08a');
    const OURO_ESCURO = cor('#b8860b', '#c9a227');
    const PELE        = cor('#e8c39e', '#ffb3a7');
    const CONTORNO    = 'rgba(16,7,24,0.85)';

    // cristal do cajado muda de cor conforme a magia na mira (como na v1)
    let corCristal = '#9b59b6';
    if (window.modoMiraMeteoro) corCristal = '#e74c3c';
    if (window.modoMiraNevasca) corCristal = '#00ffff';

    ctx.save();
    ctx.translate(x, y);

    // ========================================================================
    // 1. AURA ARCANA NO CHÃO — pulsa e ajuda a ler o personagem no calçamento
    // ========================================================================
    const pulsoAura = 1 + Math.sin(t * 2.4) * 0.07;
    const gAura = ctx.createRadialGradient(12, 31.2, 0.5, 12, 31.2, 9.8);
    gAura.addColorStop(0, 'rgba(155, 89, 182, 0.22)');
    gAura.addColorStop(0.55, 'rgba(108, 52, 131, 0.09)');
    gAura.addColorStop(1, 'rgba(60, 30, 90, 0)');
    ctx.fillStyle = gAura;
    ctx.beginPath();
    ctx.ellipse(12, 31.2, 9.8 * pulsoAura, 3.6 * pulsoAura, 0, 0, Math.PI * 2);
    ctx.fill();

    // ========================================================================
    // 2. SOMBRA NO CHÃO
    // ========================================================================
    const gSombra = ctx.createRadialGradient(12, 32.4, 0.5, 12, 32.4, 10.2);
    gSombra.addColorStop(0, 'rgba(8, 4, 14, 0.60)');
    gSombra.addColorStop(0.7, 'rgba(8, 4, 14, 0.34)');
    gSombra.addColorStop(1, 'rgba(8, 4, 14, 0)');
    ctx.fillStyle = gSombra;
    ctx.beginPath();
    ctx.ellipse(12, 32.4, 10.2, 3.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ========================================================================
    // 3. BOTAS (aparecem sob a barra da túnica, alternando no passo)
    // ========================================================================
    const pE = passo * 2.0, pD = -passo * 2.0;
    ctx.fillStyle = cor('#241226', '#6b1f16');
    ctx.beginPath();
    ctx.ellipse(9.3, 30.9 + pE * 0.5, 3.1, 1.9, 0, 0, Math.PI * 2);
    ctx.ellipse(14.7, 30.9 + pD * 0.5, 3.1, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // ========================================================================
    // 4. TÚNICA — silhueta em curvas + gradiente vertical (ombros claros, barra escura)
    //    O translate(-sobe) faz o corpo "respirar" subindo e descendo.
    // ========================================================================
    ctx.save();
    ctx.translate(0, -sobe * 0.55);

    const gTunica = ctx.createLinearGradient(0, 10, 0, 31.5);
    gTunica.addColorStop(0, TUNICA_TOPO);
    gTunica.addColorStop(0.42, TUNICA_MEIO);
    gTunica.addColorStop(1, TUNICA_BASE);
    ctx.fillStyle = gTunica;
    ctx.beginPath();
    ctx.moveTo(7.1, 12.0);
    ctx.quadraticCurveTo(4.1, 20.0, 2.7 + passo * 0.7, 30.3);
    ctx.quadraticCurveTo(12.0, 33.0, 21.3 - passo * 0.7, 30.3);
    ctx.quadraticCurveTo(19.9, 20.0, 16.9, 12.0);
    ctx.quadraticCurveTo(12.0, 9.2, 7.1, 12.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // dobras verticais (um único stroke com 3 subcaminhos)
    ctx.strokeStyle = 'rgba(28,10,40,0.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(9.3, 13.6); ctx.quadraticCurveTo(8.0, 21.0, 8.5, 29.4);
    ctx.moveTo(12.0, 14.2); ctx.quadraticCurveTo(12.0, 22.0, 12.0, 29.9);
    ctx.moveTo(14.7, 13.6); ctx.quadraticCurveTo(16.0, 21.0, 15.5, 29.4);
    ctx.stroke();

    // luz de borda (sol de noroeste) na lateral esquerda da túnica
    ctx.strokeStyle = 'rgba(226,190,255,0.38)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(7.6, 12.8); ctx.quadraticCurveTo(4.9, 20.0, 3.7, 29.2);
    ctx.stroke();

    // barra da túnica: faixa escura + filete dourado
    ctx.strokeStyle = cor('#2a1336', '#8e2a1f');
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(3.2, 29.9); ctx.quadraticCurveTo(12.0, 32.5, 20.8, 29.9);
    ctx.stroke();
    ctx.strokeStyle = OURO;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(3.6, 28.7); ctx.quadraticCurveTo(12.0, 31.2, 20.4, 28.7);
    ctx.stroke();

    // ========================================================================
    // 5. CINTO + FIVELA
    // ========================================================================
    ctx.fillStyle = cor('#42195a', '#8e2a1f');
    ctx.beginPath();
    ctx.moveTo(5.9, 18.6);
    ctx.quadraticCurveTo(12.0, 20.0, 18.1, 18.6);
    ctx.lineTo(18.5, 21.2);
    ctx.quadraticCurveTo(12.0, 22.6, 5.5, 21.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = OURO;
    ctx.beginPath();
    ctx.ellipse(12.0, 20.3, 1.7, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = OURO_ESCURO;
    ctx.beginPath();
    ctx.ellipse(12.0, 20.3, 0.7, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ========================================================================
    // 6. ESTRELA ARCANA NO PEITO (emblema de 4 pontas)
    // ========================================================================
    // pontas retas = estrela arcana nítida (com curvas virava um losango mole)
    ctx.fillStyle = OURO;
    ctx.beginPath();
    ctx.moveTo(12.0, 12.5);
    ctx.lineTo(12.9, 15.0);
    ctx.lineTo(15.4, 15.9);
    ctx.lineTo(12.9, 16.8);
    ctx.lineTo(12.0, 19.3);
    ctx.lineTo(11.1, 16.8);
    ctx.lineTo(8.6, 15.9);
    ctx.lineTo(11.1, 15.0);
    ctx.closePath();
    ctx.fill();

    // ========================================================================
    // 7. MANGAS — a direita acompanha o cajado (o braço aponta para ele)
    // ========================================================================
    // Posição da MÃO = ponto (0, 6) do referencial do cajado (pegada na haste):
    //   translate(12,16) -> rotate(ang) -> translate(13.5,0) -> local (0,6)
    const DESLOC_CAJADO = 13.5, PEGADA = 6.0;
    const maoX = 12.0 + Math.cos(ang) * DESLOC_CAJADO - Math.sin(ang) * PEGADA;
    const maoY = 16.0 + Math.sin(ang) * DESLOC_CAJADO + Math.cos(ang) * PEGADA;

    // manga esquerda (caída)
    ctx.fillStyle = MANGA;
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(7.0, 12.4);
    ctx.quadraticCurveTo(3.7, 17.0, 4.6, 21.6);
    ctx.quadraticCurveTo(7.0, 22.8, 7.9, 20.4);
    ctx.quadraticCurveTo(6.9, 16.4, 8.9, 13.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // manga direita (em direção à mão que segura o cajado)
    ctx.beginPath();
    ctx.moveTo(16.6, 12.4);
    ctx.quadraticCurveTo(maoX + 2.2, maoY - 4.6, maoX + 1.2, maoY - 0.8);
    ctx.quadraticCurveTo(maoX - 2.6, maoY + 1.4, maoX - 3.2, maoY - 1.8);
    ctx.quadraticCurveTo(14.0, 14.2, 14.6, 12.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // fim do bloco "respirar"

    // ========================================================================
    // 8. CAPUZ + ROSTO
    // ========================================================================
    const gCapuz = ctx.createLinearGradient(0, 4.6, 0, 13.4);
    gCapuz.addColorStop(0, CAPUZ_TOPO);
    gCapuz.addColorStop(1, CAPUZ_BASE);
    ctx.fillStyle = gCapuz;
    ctx.beginPath();
    ctx.moveTo(7.0, 12.2);
    ctx.quadraticCurveTo(6.1, 5.6, 12.0, 5.2);
    ctx.quadraticCurveTo(17.9, 5.6, 17.0, 12.2);
    ctx.quadraticCurveTo(12.0, 14.4, 7.0, 12.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // vão do rosto (escuro)
    ctx.fillStyle = '#150a1c';
    ctx.beginPath();
    ctx.ellipse(12.0, 9.6, 3.6, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // olhos luminosos (pulsam)
    const brilhoOlho = 0.70 + Math.sin(t * 3.4) * 0.30;
    ctx.save();
    ctx.shadowColor = '#7df9ff';
    ctx.shadowBlur = 5;
    ctx.fillStyle = 'rgba(165, 247, 255, ' + (0.72 + brilhoOlho * 0.28).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(10.2, 9.3, 1.5, 1.1, 0, 0, Math.PI * 2);
    ctx.ellipse(13.8, 9.3, 1.5, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ========================================================================
    // 9. CHAPÉU — aba + cone de ponta dobrada + faixa dourada
    // ========================================================================
    const gChapeu = ctx.createLinearGradient(3, 0, 21, 0);
    gChapeu.addColorStop(0, CHAPEU_TOPO);
    gChapeu.addColorStop(0.45, CHAPEU_MEIO);
    gChapeu.addColorStop(1, CHAPEU_BASE);

    // cone (a ponta dobra para a direita e volta por dentro, criando a espessura)
    ctx.fillStyle = gChapeu;
    ctx.beginPath();
    ctx.moveTo(5.3, 5.9);
    ctx.quadraticCurveTo(7.4, 1.5, 10.2, -1.4);
    ctx.quadraticCurveTo(12.5, -3.5, 15.4, -1.7);
    ctx.quadraticCurveTo(13.3, -2.7, 12.3, -0.4);
    ctx.quadraticCurveTo(15.4, 1.1, 18.7, 5.9);
    ctx.quadraticCurveTo(12.0, 8.1, 5.3, 5.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // aba (elipse achatada — menor que a v2 inicial, que virava sombrero)
    ctx.fillStyle = cor('#3d1f4d', '#8e2a1f');
    ctx.beginPath();
    ctx.ellipse(12.0, 6.0, 7.1, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // luz na aba (topo claro) — separa a aba do cone
    ctx.strokeStyle = 'rgba(255,220,255,0.26)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(5.2, 5.6); ctx.quadraticCurveTo(12.0, 3.5, 18.8, 5.6);
    ctx.stroke();

    // faixa dourada do chapéu
    ctx.fillStyle = OURO;
    ctx.beginPath();
    ctx.moveTo(8.7, 4.5);
    ctx.quadraticCurveTo(12.0, 5.6, 15.3, 4.5);
    ctx.lineTo(15.5, 5.9);
    ctx.quadraticCurveTo(12.0, 7.0, 8.5, 5.9);
    ctx.closePath();
    ctx.fill();

    // ========================================================================
    // 10. CAJADO — mesmo mecanismo de mira da v1 (orbita e gira com o ângulo)
    // ========================================================================
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(ang);
    ctx.translate(DESLOC_CAJADO, 0);

    // haste de madeira curvada, com luz na lateral esquerda
    const gHaste = ctx.createLinearGradient(-1.7, 0, 1.5, 0);
    gHaste.addColorStop(0, cor('#8d6e63', '#c98d7d'));
    gHaste.addColorStop(0.45, cor('#6d4c41', '#a9614f'));
    gHaste.addColorStop(1, cor('#3e2723', '#6b2f24'));
    ctx.fillStyle = gHaste;
    ctx.beginPath();
    ctx.moveTo(-1.4, -11.6);
    ctx.quadraticCurveTo(-1.9, 0.5, -1.3, 12.6);
    ctx.quadraticCurveTo(0, 13.9, 1.3, 12.6);
    ctx.quadraticCurveTo(1.9, 0.5, 1.4, -11.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(24,14,8,0.75)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // aros de metal
    ctx.fillStyle = cor('#b0bec5', '#e0c9a6');
    ctx.fillRect(-1.9, -2.6, 3.8, 1.4);
    ctx.fillStyle = cor('#78909c', '#b09a76');
    ctx.fillRect(-1.9, 1.8, 3.8, 1.2);

    // gavinhas segurando o cristal
    ctx.strokeStyle = cor('#90a4ae', '#d8c4a4');
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-1.3, -11.4); ctx.quadraticCurveTo(-4.4, -14.4, -2.6, -17.0);
    ctx.moveTo(1.3, -11.4);  ctx.quadraticCurveTo(4.4, -14.4, 2.6, -17.0);
    ctx.stroke();

    // cristal facetado em losango, com halo e núcleo
    ctx.save();
    ctx.shadowColor = corCristal;
    ctx.shadowBlur = 10;
    ctx.fillStyle = corCristal;
    ctx.beginPath();
    ctx.moveTo(0, -20.2);
    ctx.lineTo(3.2, -15.6);
    ctx.lineTo(0, -11.0);
    ctx.lineTo(-3.2, -15.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // faceta clara (dá o corte no cristal)
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.beginPath();
    ctx.moveTo(0, -19.3);
    ctx.lineTo(1.5, -15.6);
    ctx.lineTo(0, -11.9);
    ctx.closePath();
    ctx.fill();
    // faceta escura
    ctx.fillStyle = 'rgba(40,0,60,0.30)';
    ctx.beginPath();
    ctx.moveTo(0, -19.3);
    ctx.lineTo(-1.5, -15.6);
    ctx.lineTo(0, -11.9);
    ctx.closePath();
    ctx.fill();
    // núcleo brilhante
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, -15.6, 0.95, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // faíscas orbitando o cristal
    ctx.save();
    ctx.shadowColor = corCristal;
    ctx.shadowBlur = 6;
    for (let i = 0; i < 3; i++) {
        const a = t * 1.7 + i * (Math.PI * 2 / 3);
        const sx = Math.cos(a) * 5.0;
        const sy = -15.6 + Math.sin(a) * 2.3;
        const brilhoS = 0.30 + 0.70 * Math.abs(Math.sin(a * 0.5 + t * 1.3));
        ctx.fillStyle = 'rgba(255,255,255,' + brilhoS.toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(sx, sy, 0.85, 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // mão agarrando a haste — desenhada DEPOIS da haste, senão fica atrás dela
    ctx.fillStyle = PELE;
    ctx.strokeStyle = 'rgba(60,35,20,0.55)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, PEGADA, 2.1, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // fim do cajado
    ctx.restore(); // fim do translate do personagem

    // Barra de Vida (posição idêntica à v1)
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueMago = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomMagiaBasica === 'function') window.tocarSomMagiaBasica();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_mago', angulo: anguloDisparo })); }
};
