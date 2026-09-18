// classes/curandeiro.js — Renderização completa do Curandeiro / Sacerdote (v2: visual 2.5D)
// ============================================================================
// INTERFACE PÚBLICA IDÊNTICA À v1:
//     window.desenharCurandeiro(x, y, isMoving, angulo, hp, maxHp)
//     window.enviarAtaqueCurandeiro(ws)
// Estado externo lido:
//     window.ctx, window.walkCycle, window.danoFlashTimer,
//     window.modoMiraPrece, window.modoMiraJulgamento
//
// O que mudou em relação à v1:
//   • Silhueta e drapeado da batina/túnica litúrgica desenhada em curvas suaves (quadraticCurveTo)
//   • Paleta pontifícia refinada: branco-marfim sagrado, dourado solar e toques carmesins
//   • Sombreamento suave por gradientes direcionais (fonte de luz a noroeste)
//   • Contornos nítidos para leitura perfeita do personagem na escala 20x36 px
//   • MITRA PAPAL (chapéu papal em cúspide/ogiva) com grande Cruz Dourada em relevo frontal,
//     filigrana dourada e ínfulas sagradas (fitas drapeadas nas costas)
//   • Auréola / Halo celestial luminoso pulsando suavemente atrás da cabeça
//   • Rosto sereno com olhos emanando brilho sagrado dourado/celeste
//   • Estola litúrgica sobre os ombros com bordados sacros e cruz peitoral relicário
//   • STAFF DE LUZ DIVINA: haste cerimonial em marfim e ouro com anéis, coroa solar sustentando
//     um Orbe de Pura Luz Sagrada, feixes estelares em cruz e centelhas sagradas orbitando
//   • Reação visual dinâmica do cajado ao mirar a habilidade de Cura/Prece
//   • Animação orgânica de passos e suave respiração
// ============================================================================
window.desenharCurandeiro = function (x, y, isMoving, angulo, hp, maxHp) {
    if (hp <= 0 || !window.ctx) return;
    const ctx = window.ctx;

    // ---------- tempo / animação ----------
    const t = Date.now() / 1000;
    const ciclo = window.walkCycle || 0;
    const passo = isMoving ? Math.sin(ciclo) : 0;                              // -1..1 (passadas)
    const sobe = isMoving ? Math.abs(Math.sin(ciclo)) * 1.2                    // balanço ao caminhar
                          : Math.sin(t * 2.1) * 0.45 + 0.45;                   // respiração quando parado
    const ang = angulo || 0;
    const dano = (window.danoFlashTimer || 0) > 0;
    const cor = (normal, flash) => (dano ? flash : normal);

    // ---------- paleta pontifícia ----------
    const BRANCO_LUZ   = cor('#ffffff', '#ff9b8a');
    const MARFIM_TOPO  = cor('#f8f9fa', '#f78a78');
    const MARFIM_MEIO  = cor('#e9ecef', '#e65c49');
    const MARFIM_BASE  = cor('#ced4da', '#c0392b');
    const DOBRA_TECIDO = cor('rgba(140, 150, 165, 0.45)', 'rgba(120, 20, 10, 0.55)');
    const OURO         = cor('#f1c40f', '#ffe08a');
    const OURO_CLARO   = cor('#f9e79f', '#fff3cd');
    const OURO_ESCURO  = cor('#b8860b', '#c9a227');
    const CARMESIM     = cor('#922b21', '#d9534f');
    const PELE         = cor('#f5d7ba', '#ffb3a7');
    const CONTORNO     = 'rgba(25, 18, 12, 0.85)';
    const CONTORNO_MIT = 'rgba(35, 24, 15, 0.88)';

    // Orbe do cajado reage ao modo de cura / prece
    let corLuzPrincipal = '#fff275';
    let corLuzHalo      = '#f39c12';
    if (window.modoMiraPrece) {
        corLuzPrincipal = '#a8ff78';
        corLuzHalo      = '#2ecc71';
    } else if (window.modoMiraJulgamento) {
        corLuzPrincipal = '#ffeaa7';
        corLuzHalo      = '#e67e22';
    }

    ctx.save();
    ctx.translate(x, y);

    // ========================================================================
    // 1. AURA SAGRADA NO CHÃO — pulsa suavemente dando destaque e presença divina
    // ========================================================================
    const pulsoAura = 1 + Math.sin(t * 2.3) * 0.08;
    const gAura = ctx.createRadialGradient(12, 31.2, 0.5, 12, 31.2, 10.5);
    gAura.addColorStop(0, 'rgba(255, 242, 117, 0.26)');
    gAura.addColorStop(0.55, 'rgba(241, 196, 15, 0.10)');
    gAura.addColorStop(1, 'rgba(212, 172, 13, 0)');
    ctx.fillStyle = gAura;
    ctx.beginPath();
    ctx.ellipse(12, 31.2, 10.2 * pulsoAura, 3.8 * pulsoAura, 0, 0, Math.PI * 2);
    ctx.fill();

    // ========================================================================
    // 2. SOMBRA NO CHÃO
    // ========================================================================
    const gSombra = ctx.createRadialGradient(12, 32.4, 0.5, 12, 32.4, 10.2);
    gSombra.addColorStop(0, 'rgba(10, 8, 5, 0.58)');
    gSombra.addColorStop(0.7, 'rgba(10, 8, 5, 0.32)');
    gSombra.addColorStop(1, 'rgba(10, 8, 5, 0)');
    ctx.fillStyle = gSombra;
    ctx.beginPath();
    ctx.ellipse(12, 32.4, 10.2, 3.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ========================================================================
    // 3. BOTAS SACRAS (aparecem sob a barra da batina alternando no passo)
    // ========================================================================
    const pE = passo * 1.9, pD = -passo * 1.9;
    ctx.fillStyle = cor('#2c3e50', '#5b1f16');
    ctx.beginPath();
    ctx.ellipse(9.3, 30.9 + pE * 0.5, 3.1, 1.9, 0, 0, Math.PI * 2);
    ctx.ellipse(14.7, 30.9 + pD * 0.5, 3.1, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // ========================================================================
    // 4. CORPO RESPIRANDO (translate vertical suave)
    // ========================================================================
    ctx.save();
    ctx.translate(0, -sobe * 0.55);

    // ========================================================================
    // 5. ÍNFULAS PAPAIS TRASEIRAS (duas fitas que descem da mitra pelas costas)
    // ========================================================================
    const balancoFita = isMoving ? Math.sin(ciclo * 0.8) * 1.2 : Math.sin(t * 1.8) * 0.5;
    ctx.fillStyle = MARFIM_BASE;
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.7;

    // Fita esquerda
    ctx.beginPath();
    ctx.moveTo(8.2, 7.5);
    ctx.quadraticCurveTo(5.2 + balancoFita, 14.0, 5.8 + balancoFita, 20.2);
    ctx.lineTo(8.2 + balancoFita, 20.2);
    ctx.quadraticCurveTo(7.6 + balancoFita, 14.0, 9.6, 7.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Franja dourada da ponta
    ctx.fillStyle = OURO;
    ctx.fillRect(5.8 + balancoFita, 19.2, 2.4, 1.6);

    // Fita direita
    ctx.fillStyle = MARFIM_BASE;
    ctx.beginPath();
    ctx.moveTo(15.8, 7.5);
    ctx.quadraticCurveTo(18.8 - balancoFita, 14.0, 18.2 - balancoFita, 20.2);
    ctx.lineTo(15.8 - balancoFita, 20.2);
    ctx.quadraticCurveTo(16.4 - balancoFita, 14.0, 14.4, 7.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Franja dourada da ponta
    ctx.fillStyle = OURO;
    ctx.fillRect(15.8 - balancoFita, 19.2, 2.4, 1.6);

    // ========================================================================
    // 6. TÚNICA SACRA / BATINA PONTIFÍCIA — curvas fluidas e gradiente 2.5D
    // ========================================================================
    const gTunica = ctx.createLinearGradient(0, 10, 0, 31.5);
    gTunica.addColorStop(0, BRANCO_LUZ);
    gTunica.addColorStop(0.35, MARFIM_TOPO);
    gTunica.addColorStop(0.70, MARFIM_MEIO);
    gTunica.addColorStop(1, MARFIM_BASE);
    ctx.fillStyle = gTunica;

    ctx.beginPath();
    ctx.moveTo(7.1, 12.0);
    ctx.quadraticCurveTo(4.2, 20.0, 2.8 + passo * 0.6, 30.3);
    ctx.quadraticCurveTo(12.0, 32.8, 21.2 - passo * 0.6, 30.3);
    ctx.quadraticCurveTo(19.8, 20.0, 16.9, 12.0);
    ctx.quadraticCurveTo(12.0, 9.4, 7.1, 12.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Dobras litúrgicas do tecido
    ctx.strokeStyle = DOBRA_TECIDO;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(9.2, 14.0);  ctx.quadraticCurveTo(8.0, 21.0, 8.4, 29.4);
    ctx.moveTo(12.0, 14.8); ctx.quadraticCurveTo(12.0, 22.0, 12.0, 29.8);
    ctx.moveTo(14.8, 14.0); ctx.quadraticCurveTo(16.0, 21.0, 15.6, 29.4);
    ctx.stroke();

    // Luz de borda no lado iluminado (noroeste)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(7.6, 12.8); ctx.quadraticCurveTo(4.9, 20.0, 3.8, 29.0);
    ctx.stroke();

    // Barra da túnica com filigrana e filete dourado
    ctx.strokeStyle = cor('#2c3e50', '#8e2a1f');
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(3.3, 29.9); ctx.quadraticCurveTo(12.0, 32.4, 20.7, 29.9);
    ctx.stroke();

    ctx.strokeStyle = OURO;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(3.7, 28.7); ctx.quadraticCurveTo(12.0, 31.1, 20.3, 28.7);
    ctx.stroke();

    // ========================================================================
    // 7. CINTO LITÚRGICO (CÍNGULO) + ESTOLA SACRA
    // ========================================================================
    // Cinto/Faixa sagrada
    ctx.fillStyle = cor('#d4ac0d', '#a93226');
    ctx.beginPath();
    ctx.moveTo(6.0, 19.0);
    ctx.quadraticCurveTo(12.0, 20.4, 18.0, 19.0);
    ctx.lineTo(18.4, 21.4);
    ctx.quadraticCurveTo(12.0, 22.8, 5.6, 21.4);
    ctx.closePath();
    ctx.fill();

    // Estola Litúrgica Dourada (desce dos ombros em direção ao peitoral)
    const gEstola = ctx.createLinearGradient(0, 11, 0, 25);
    gEstola.addColorStop(0, OURO_CLARO);
    gEstola.addColorStop(0.5, OURO);
    gEstola.addColorStop(1, OURO_ESCURO);
    ctx.fillStyle = gEstola;
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.6;

    // Faixa esquerda da estola
    ctx.beginPath();
    ctx.moveTo(7.8, 11.8);
    ctx.quadraticCurveTo(7.2, 17.0, 8.6, 24.8);
    ctx.lineTo(10.8, 24.8);
    ctx.quadraticCurveTo(9.6, 17.0, 9.8, 11.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Faixa direita da estola
    ctx.beginPath();
    ctx.moveTo(16.2, 11.8);
    ctx.quadraticCurveTo(16.8, 17.0, 15.4, 24.8);
    ctx.lineTo(13.2, 24.8);
    ctx.quadraticCurveTo(14.4, 17.0, 14.2, 11.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cruzes vermelhas/carmesins bordadas nas pontas da estola
    ctx.fillStyle = CARMESIM;
    // Cruz esquerda
    ctx.fillRect(9.2, 22.2, 1.0, 2.2);
    ctx.fillRect(8.7, 22.7, 2.0, 0.9);
    // Cruz direita
    ctx.fillRect(13.8, 22.2, 1.0, 2.2);
    ctx.fillRect(13.3, 22.7, 2.0, 0.9);

    // ========================================================================
    // 8. CRUZ PEITORAL RELICÁRIO (ouro trabalhado com gema cintilante no peito)
    // ========================================================================
    // Cordão peitoral
    ctx.strokeStyle = OURO_ESCURO;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(9.8, 12.0);
    ctx.quadraticCurveTo(12.0, 14.5, 14.2, 12.0);
    ctx.stroke();

    // Cruz relicário
    ctx.fillStyle = OURO;
    ctx.beginPath();
    // Haste vertical
    ctx.rect(11.3, 13.8, 1.4, 4.4);
    // Haste horizontal
    ctx.rect(9.9, 14.8, 4.2, 1.4);
    ctx.fill();
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Gema central brilhante na cruz
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12.0, 15.5, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // ========================================================================
    // 9. MANGAS PONTIFÍCIAS — manga direita conecta à mão do cajado
    // ========================================================================
    const DESLOC_STAFF = 13.5, PEGADA = 6.0;
    const maoX = 12.0 + Math.cos(ang) * DESLOC_STAFF - Math.sin(ang) * PEGADA;
    const maoY = 16.0 + Math.sin(ang) * DESLOC_STAFF + Math.cos(ang) * PEGADA;

    // Manga esquerda (ampla, solene)
    ctx.fillStyle = MARFIM_TOPO;
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(7.0, 12.2);
    ctx.quadraticCurveTo(3.5, 17.0, 4.4, 21.8);
    ctx.quadraticCurveTo(6.8, 23.0, 7.8, 20.6);
    ctx.quadraticCurveTo(6.8, 16.5, 8.8, 13.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Punho dourado da manga esquerda
    ctx.fillStyle = OURO;
    ctx.fillRect(4.8, 20.8, 2.4, 1.2);

    // Manga direita (estendida em direção à empunhadura do cajado)
    ctx.fillStyle = MARFIM_TOPO;
    ctx.beginPath();
    ctx.moveTo(16.6, 12.2);
    ctx.quadraticCurveTo(maoX + 2.2, maoY - 4.6, maoX + 1.2, maoY - 0.8);
    ctx.quadraticCurveTo(maoX - 2.6, maoY + 1.4, maoX - 3.2, maoY - 1.8);
    ctx.quadraticCurveTo(14.0, 14.2, 14.6, 12.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Punho dourado da manga direita
    ctx.fillStyle = OURO;
    ctx.beginPath();
    ctx.ellipse(maoX - 1.0, maoY - 0.5, 1.8, 1.2, ang, 0, Math.PI * 2);
    ctx.fill();

    // ========================================================================
    // 10. AURÉOLA SANTA / HALO CELESTIAL ATRÁS DA CABEÇA
    // ========================================================================
    const pulsoHalo = 1 + Math.sin(t * 2.8) * 0.05;
    ctx.save();
    ctx.shadowColor = '#f39c12';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(255, 235, 130, 0.45)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(12.0, 2.5, 9.2 * pulsoHalo, 9.2 * pulsoHalo, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // ========================================================================
    // 11. CABEÇA, CAPELINA (MUCETA) E ROSTO SERENO
    // ========================================================================
    // Capelina/Muceta sobre os ombros
    ctx.fillStyle = MARFIM_TOPO;
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(7.2, 12.4);
    ctx.quadraticCurveTo(12.0, 14.6, 16.8, 12.4);
    ctx.quadraticCurveTo(15.2, 8.4, 12.0, 8.0);
    ctx.quadraticCurveTo(8.8, 8.4, 7.2, 12.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rosto sob a mitra
    ctx.fillStyle = PELE;
    ctx.beginPath();
    ctx.ellipse(12.0, 8.8, 3.8, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 65, 45, 0.45)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Olhos sagrados com brilho divino celestial
    const brilhoOlho = 0.72 + Math.sin(t * 3.2) * 0.28;
    ctx.save();
    ctx.shadowColor = '#f39c12';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(255, 245, 150, ' + brilhoOlho.toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(10.3, 8.7, 1.2, 1.0, 0, 0, Math.PI * 2);
    ctx.ellipse(13.7, 8.7, 1.2, 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupila celeste pura
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(10.1, 8.5, 0.7, 0.7);
    ctx.fillRect(13.5, 8.5, 0.7, 0.7);
    ctx.restore();

    // ========================================================================
    // 12. MITRA PAPAL (CHAPÉU DO PAPA COM CRUZ DOURADA)
    // ========================================================================
    // Cúspide traseira (dá espessura e profundidade 2.5D tridimensional à mitra)
    ctx.fillStyle = MARFIM_BASE;
    ctx.beginPath();
    ctx.moveTo(9.5, -4.2);
    ctx.quadraticCurveTo(12.0, -6.6, 14.5, -4.2);
    ctx.lineTo(13.5, -1.0);
    ctx.lineTo(10.5, -1.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONTORNO_MIT;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Cúspide / Corpo frontal da Mitra Papal
    const gMitra = ctx.createLinearGradient(5, 0, 19, 0);
    gMitra.addColorStop(0, BRANCO_LUZ);
    gMitra.addColorStop(0.35, MARFIM_TOPO);
    gMitra.addColorStop(0.75, MARFIM_MEIO);
    gMitra.addColorStop(1, MARFIM_BASE);
    ctx.fillStyle = gMitra;

    ctx.beginPath();
    ctx.moveTo(5.8, 6.4);
    ctx.quadraticCurveTo(5.2, 0.5, 9.8, -4.6);
    ctx.lineTo(12.0, -5.6); // ápice da mitra papal
    ctx.lineTo(14.2, -4.6);
    ctx.quadraticCurveTo(18.8, 0.5, 18.2, 6.4);
    ctx.quadraticCurveTo(12.0, 8.0, 5.8, 6.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONTORNO_MIT;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Faixa base dourada da mitra (Circulus)
    ctx.fillStyle = OURO;
    ctx.beginPath();
    ctx.moveTo(5.8, 6.2);
    ctx.quadraticCurveTo(12.0, 7.8, 18.2, 6.2);
    ctx.lineTo(18.0, 4.8);
    ctx.quadraticCurveTo(12.0, 6.4, 6.0, 4.8);
    ctx.closePath();
    ctx.fill();

    // Faixa vertical dourada central (Titulus)
    ctx.fillStyle = OURO_ESCURO;
    ctx.fillRect(11.2, -4.5, 1.6, 11.2);

    // ------------------------------------------------------------------------
    // A GRANDE CRUZ PAPAL DOURADA NA MITRA
    // ------------------------------------------------------------------------
    ctx.save();
    ctx.shadowColor = '#f39c12';
    ctx.shadowBlur = 3;
    ctx.fillStyle = OURO;
    ctx.beginPath();
    // Braço vertical da cruz
    ctx.rect(11.0, -2.8, 2.0, 6.6);
    // Braço horizontal da cruz
    ctx.rect(8.2, -0.6, 7.6, 2.0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 45, 15, 0.9)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Relevo interno / Luz da cruz dourada
    ctx.fillStyle = OURO_CLARO;
    ctx.fillRect(11.4, -2.4, 1.2, 5.8);
    ctx.fillRect(8.6, -0.2, 6.8, 1.2);

    // Diamante / Gema central cintilante no coração da cruz
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12.0, 0.4, 1.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore(); // fim do bloco "respirar"

    // ========================================================================
    // 13. STAFF DE LUZ DIVINA (CAJADO SAGRADO COM ORBE E RAIOS CELESTIAIS)
    // ========================================================================
    ctx.save();
    ctx.translate(12, 16);
    ctx.rotate(ang);
    ctx.translate(DESLOC_STAFF, 0);

    // Haste de marfim nobre e acabamentos em ouro
    const gHaste = ctx.createLinearGradient(-1.5, 0, 1.5, 0);
    gHaste.addColorStop(0, cor('#ffffff', '#ffeaa7'));
    gHaste.addColorStop(0.45, cor('#f1f2f6', '#fdcb6e'));
    gHaste.addColorStop(1, cor('#ced6e0', '#d63031'));
    ctx.fillStyle = gHaste;
    ctx.beginPath();
    ctx.moveTo(-1.3, -12.5);
    ctx.lineTo(1.3, -12.5);
    ctx.lineTo(1.1, 13.6);
    ctx.lineTo(-1.1, 13.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 45, 20, 0.85)';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Anéis cerimoniais dourados na haste
    ctx.fillStyle = OURO;
    ctx.fillRect(-1.7, -12.4, 3.4, 1.4);
    ctx.fillRect(-1.6, -2.4, 3.2, 1.2);
    ctx.fillRect(-1.6, 2.4, 3.2, 1.2);
    // Ponteira inferior do cajado
    ctx.beginPath();
    ctx.moveTo(-1.4, 13.4);
    ctx.lineTo(0, 15.6);
    ctx.lineTo(1.4, 13.4);
    ctx.closePath();
    ctx.fill();

    // Cabeça do Staff: Coroa solar alada sustentando o orbe de luz
    ctx.strokeStyle = OURO;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    // Asa/Arco esquerdo
    ctx.moveTo(-1.2, -12.2);
    ctx.quadraticCurveTo(-5.4, -15.5, -3.2, -19.4);
    // Asa/Arco direito
    ctx.moveTo(1.2, -12.2);
    ctx.quadraticCurveTo(5.4, -15.5, 3.2, -19.4);
    ctx.stroke();

    // Mini auréola dourada na coroa do cajado
    ctx.strokeStyle = OURO_CLARO;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, -16.8, 4.4, 4.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ------------------------------------------------------------------------
    // ORBE DE PURA LUZ SAGRADA (NÚCLEO RADIANTE + RAIOS EM CRUZ + CENTELHAS)
    // ------------------------------------------------------------------------
    const pulsoOrbe = Math.sin(t * 5.0) * 0.8;
    const pulsoRaio = Math.sin(t * 3.5) * 1.5;

    ctx.save();
    // Halo externo radiante
    ctx.shadowColor = corLuzHalo;
    ctx.shadowBlur = 15;
    ctx.fillStyle = corLuzPrincipal;
    ctx.beginPath();
    ctx.arc(0, -17.0, 5.0 + pulsoOrbe, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo branco incandescente de luz pura
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -17.0, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Quatro Raios Celestes em Cruz (luz brilhante estilizada do cajado)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    // Raio vertical
    ctx.moveTo(0, -24.5 - pulsoRaio);
    ctx.lineTo(0, -9.5 + pulsoRaio);
    // Raio horizontal
    ctx.moveTo(-7.5 - pulsoRaio, -17.0);
    ctx.lineTo(7.5 + pulsoRaio, -17.0);
    ctx.stroke();

    // Raios diagonais sutis
    ctx.strokeStyle = 'rgba(255, 235, 140, 0.45)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-4.0, -21.0); ctx.lineTo(4.0, -13.0);
    ctx.moveTo(4.0, -21.0);  ctx.lineTo(-4.0, -13.0);
    ctx.stroke();

    // Centelhas sagradas orbitando o orbe de luz
    for (let i = 0; i < 3; i++) {
        const a = t * 2.2 + i * (Math.PI * 2 / 3);
        const sx = Math.cos(a) * 5.4;
        const sy = -17.0 + Math.sin(a) * 2.6;
        const opacidade = 0.35 + 0.65 * Math.abs(Math.sin(a * 0.5 + t * 1.4));
        ctx.fillStyle = 'rgba(255, 255, 255, ' + opacidade.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, 0.85, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Mão sacerdotisa envolvendo a empunhadura do cajado
    ctx.fillStyle = PELE;
    ctx.strokeStyle = 'rgba(80, 50, 30, 0.6)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, PEGADA, 2.1, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // fim do staff
    ctx.restore(); // fim do translate do personagem

    // Barra de Vida
    if (typeof window.desenharBarraHp === "function") {
        window.desenharBarraHp(x - 3, y - 8, hp, maxHp);
    }
};

window.enviarAtaqueCurandeiro = function(ws) {
    if (window.estaMorto) return;
    if (typeof window.tocarSomLuzSagrada === 'function') window.tocarSomLuzSagrada();
    let alvoDetectado = typeof window.obterAlvoNaMira === 'function' ? window.obterAlvoNaMira() : null;
    let anguloDisparo = alvoDetectado ? alvoDetectado.angulo : window.meuAngulo;
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ action: 'ataque_curandeiro', angulo: anguloDisparo })); }
};

