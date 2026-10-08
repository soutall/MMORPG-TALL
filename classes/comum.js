window.desenharBarraHp = function(x, y, hp, maxHp, stunTimer = 0, slowTimer = 0, larguraCustom = 0, slime = null) {
    if (!window.ctx) return;
    if (slime && slime.preview) return;

    // REGRA GERAL: Retira a barra de HP em cima do personagem para TODAS as classes de heróis!
    // A barra só é renderizada para monstros/slimes/bosses (onde slime é passado).
    if (!slime) return;

    let largura = larguraCustom || 30, altura = 4;
    let porcentagem = Math.max(0, Math.min(1, hp / maxHp));

    // Fundo e preenchimento da vida do monstro
    window.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    window.ctx.fillRect(x - 3, y - 10, largura + 6, altura + 4);
    window.ctx.fillStyle = "#e74c3c";
    window.ctx.fillRect(x, y - 8, largura * porcentagem, altura);
    window.ctx.strokeStyle = "#1a252f";
    window.ctx.lineWidth = 1;
    window.ctx.strokeRect(x, y - 8, largura, altura);

    // =========================================================================
    // COLEÇÃO DE DEBUFFS DO GOLEM E DO COMBATE (renderizados acima da barra)
    // =========================================================================
    const debuffs = [];
    const agoraMs = Date.now();

    // 1. STUN / ATORDOAMENTO (💫)
    let sTimer = (stunTimer > 0) ? stunTimer : (slime && slime.stunTimer > 0 ? slime.stunTimer : 0);
    if (sTimer > 0) {
        let segs = (sTimer / 20).toFixed(1) + 's';
        debuffs.push({ icone: '💫', texto: segs, cor: '#f1c40f', bg: 'rgba(50, 40, 10, 0.85)' });
    }

    // 2. LENTIDÃO / SLOW (❄️ / 🐌)
    let slTimer = 0;
    if (slowTimer > 0) slTimer = slowTimer;
    else if (slime && slime.slowTimer > 0) slTimer = slime.slowTimer;
    else if (slime && slime.lentidaoTimer > 0) slTimer = slime.lentidaoTimer;

    if (slTimer > 0) {
        let segs = (slTimer / 20).toFixed(1) + 's';
        debuffs.push({ icone: '❄️', texto: segs, cor: '#38bdf8', bg: 'rgba(12, 35, 60, 0.85)' });
    }

    // 3. ENRAIZADO / PRESO (⛓️) - Prisão de Placas (3A), Presa Inescapável (4A), Prisão Tectônica (2A), Domínio das Placas (4A)
    let presoAtivo = false;
    let presoSegs = '';
    if (slime) {
        if (slime.isPreso && slime.isPreso > agoraMs) {
            presoAtivo = true;
            presoSegs = ((slime.isPreso - agoraMs) / 1000).toFixed(1) + 's';
        } else if (!slime.isPreso && slime.presoTimer > 0) {
            presoAtivo = true;
            presoSegs = (slime.presoTimer / 20).toFixed(1) + 's';
        }
    }
    if (presoAtivo) {
        debuffs.push({ icone: '⛓️', texto: presoSegs || '0.1s', cor: '#fbbf24', bg: 'rgba(40, 30, 10, 0.85)' });
    }

    // 4. FRATURA EXPOSTA / REDUÇÃO DEF (🛡️) - Esmagamento Tier 2B & Florim Espinhos
    let temReducaoDef = false;
    let defSegs = '';
    if (slime) {
        if (slime.fraturaExpostaExpires && slime.fraturaExpostaExpires > agoraMs) {
            temReducaoDef = true;
            defSegs = ((slime.fraturaExpostaExpires - agoraMs) / 1000).toFixed(1) + 's';
        } else if (!slime.fraturaExpostaExpires && slime.reducaoDefTimer > 0) {
            temReducaoDef = true;
            defSegs = (slime.reducaoDefTimer / 20).toFixed(1) + 's';
        } else if (slime.efeitos && Array.isArray(slime.efeitos)) {
            let efDef = slime.efeitos.find(e => e && (e.tipo === 'reducaoDef' || e.nome === 'reducaoDef' || e.id === 'reducaoDef'));
            if (efDef && (efDef.tempo > 0 || efDef.duracao > 0)) {
                temReducaoDef = true;
                let t = efDef.tempo || efDef.duracao || 0;
                defSegs = (t / 20).toFixed(1) + 's';
            }
        }
    }
    if (temReducaoDef) {
        debuffs.push({ icone: '🛡️', texto: defSegs || '-20%', cor: '#f87171', bg: 'rgba(50, 15, 15, 0.85)' });
    }

    // 5. FRATURA DEFENSIVA (💔+12%) - Esmagamento Tier 3B (+12% dano sofrido)
    if (slime && slime.fraturaDefensivaExpires && slime.fraturaDefensivaExpires > agoraMs) {
        let segs = ((slime.fraturaDefensivaExpires - agoraMs) / 1000).toFixed(1) + 's';
        debuffs.push({ icone: '💔', texto: segs, cor: '#ec4899', bg: 'rgba(50, 10, 35, 0.85)' });
    }

    // 6. MARCA DA PRESA (🎯 Presa) - Salto do Ogro Tier 1A
    if (slime && slime.marcaPresaExpires && slime.marcaPresaExpires > agoraMs) {
        let segs = ((slime.marcaPresaExpires - agoraMs) / 1000).toFixed(1) + 's';
        debuffs.push({ icone: '🎯', texto: segs, cor: '#f97316', bg: 'rgba(50, 25, 10, 0.85)' });
    }

    // 7. QUEIMADURA (🔥) - Colossal Tier 1B Munição Incandescente
    let temQueimadura = false;
    let queimaduraTexto = '';
    if (slime) {
        if (slime.queimaduraExpires && slime.queimaduraExpires > agoraMs) {
            temQueimadura = true;
            queimaduraTexto = ((slime.queimaduraExpires - agoraMs) / 1000).toFixed(1) + 's';
        } else if (slime.efeitos && Array.isArray(slime.efeitos)) {
            let efQ = slime.efeitos.find(e => e && (e.tipo === 'queimadura' || e.nome === 'queimadura' || e.id === 'queimadura'));
            if (efQ && (efQ.tempo > 0 || efQ.duracao > 0)) {
                temQueimadura = true;
                let t = efQ.tempo || efQ.duracao || 0;
                queimaduraTexto = (t / 20).toFixed(1) + 's';
            }
        }
    }
    if (temQueimadura) {
        debuffs.push({ icone: '🔥', texto: queimaduraTexto || 'Fogo', cor: '#fb923c', bg: 'rgba(60, 20, 10, 0.85)' });
    }

    // 8. REDUÇÃO DE ATAQUE (⚔️-20%) - Florim Espinhos
    let temReducaoAtk = false;
    let atkTexto = '';
    if (slime) {
        if (slime.reducaoAtkTimer > 0) {
            temReducaoAtk = true;
            atkTexto = (slime.reducaoAtkTimer / 20).toFixed(1) + 's';
        } else if (slime.efeitos && Array.isArray(slime.efeitos)) {
            let efAtk = slime.efeitos.find(e => e && (e.tipo === 'reducaoAtk' || e.nome === 'reducaoAtk' || e.id === 'reducaoAtk'));
            if (efAtk && (efAtk.tempo > 0 || efAtk.duracao > 0)) {
                temReducaoAtk = true;
                let t = efAtk.tempo || efAtk.duracao || 0;
                atkTexto = (t / 20).toFixed(1) + 's';
            }
        }
    }
    if (temReducaoAtk) {
        debuffs.push({ icone: '⚔️', texto: atkTexto || '-20%', cor: '#e67e22', bg: 'rgba(50, 30, 10, 0.85)' });
    }

    if (slime && Array.isArray(slime.buffsMonstros)) {
        slime.buffsMonstros.forEach(function (buff) {
            if (!buff || buff.expiraEm <= agoraMs) return;
            debuffs.push({
                icone: buff.icon || '✦',
                texto: Math.max(1, Math.ceil((buff.expiraEm - agoraMs) / 1000)) + 's',
                cor: buff.cor || '#79e7ff',
                bg: 'rgba(12, 35, 60, 0.85)'
            });
        });
    }

    const nomeMonstro = String(slime.nome || slime.tipo || 'Monstro')
        .replace(/_/g, ' ')
        .replace(/^./, letra => letra.toLocaleUpperCase());
    window.ctx.save();
    window.ctx.font = "700 11px 'Cinzel', Georgia, serif";
    window.ctx.textAlign = "center";
    window.ctx.textBaseline = "bottom";
    window.ctx.lineWidth = 3;
    window.ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    window.ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    window.ctx.shadowBlur = 3;
    window.ctx.fillStyle = (slime.type === 'pet' || slime.pet_instance_id || slime.owner_id)
        ? '#4ade80'
        : '#f4e6b5';
    const nomeY = y - (debuffs.length > 0 ? 28 : 13);
    window.ctx.strokeText(nomeMonstro, x + largura / 2, nomeY, 150);
    window.ctx.fillText(nomeMonstro, x + largura / 2, nomeY, 150);
    window.ctx.restore();

    // =========================================================================
    // DESENHAR OS BADGES DE DEBUFFS CENTRALIZADOS ACIMA DA BARRA DE VIDA
    // =========================================================================
    if (debuffs.length > 0) {
        window.ctx.save();
        window.ctx.font = "bold 9px 'Rajdhani', Arial, sans-serif";
        window.ctx.textBaseline = "middle";

        const badgeH = 13;
        const gap = 3;
        const badgesConfig = debuffs.map(d => {
            const textoCompleto = d.icone + ' ' + d.texto;
            const textW = (typeof window.ctx.measureText === 'function') ? window.ctx.measureText(textoCompleto).width : (textoCompleto.length * 6);
            const w = Math.max(30, Math.ceil(textW + 8));
            return { d, w, textoCompleto };
        });
        const totalW = badgesConfig.reduce((acc, b) => acc + b.w, 0) + (badgesConfig.length - 1) * gap;
        let curX = (x + largura / 2) - (totalW / 2);
        const badgeY = y - 24;

        badgesConfig.forEach(b => {
            const bx = curX;
            curX += b.w + gap;

            // Fundo do badge com cantos arredondados
            window.ctx.fillStyle = b.d.bg || "rgba(15, 23, 42, 0.85)";
            window.ctx.beginPath();
            window.ctx.roundRect ? window.ctx.roundRect(bx, badgeY, b.w, badgeH, 3) : window.ctx.rect(bx, badgeY, b.w, badgeH);
            window.ctx.fill();

            // Borda do badge
            window.ctx.strokeStyle = b.d.cor;
            window.ctx.lineWidth = 0.8;
            window.ctx.stroke();

            // Texto com ícone
            window.ctx.fillStyle = b.d.cor;
            window.ctx.textAlign = "center";
            window.ctx.fillText(b.textoCompleto, bx + b.w / 2, badgeY + badgeH / 2 + 0.5);
        });

        window.ctx.restore();
    }
};
