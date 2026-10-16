/* =========================================================================
   KALEDRON — CAVALEIRO DO ABISMO
   -------------------------------------------------------------------------
   Direção de arte (substitui integralmente o visual anterior de magma):

     Tempero ....... FRIO / VAZIO. Nada de brasa, cratera ou lava.
     Materiais ..... Obsidiana polida com costuras de runa acesa por dentro.
     Silhueta ...... Ombros angulares e largos (leem "força" a 48 px);
                     o corpo AFUNILA e se dissolve em lascas — ele é
                     colossal e flutuante, não tem pernas.
     Assinatura .... A LÂMINA FLUTUANTE: cristal que orbita o corpo no
                     descanso e trava à frente no ataque. É o ponto mais
                     claro da tela, então o olho sempre acha o personagem.
     Paleta ....... #07080f vazio · #151824 obsidiana · #5fe0ff runa
                     #9b7dff violeta · #dfe7f5 luz de borda

   Tudo é desenhado por código no Canvas 2D: sem PNG, sem atlas, sem escala
   de textura. O custo por quadro é propositalmente baixo (poucos gradients,
   shapes reaproveitados) porque o desenho roda para todo Kaledron visível.
   ========================================================================= */
(function (window) {
    'use strict';

    // ---------------------------------------------------------------- paleta
    const VAZIO        = '#07080f';
    const OBSIDIANA    = '#151824';
    const OBSIDIANA_2  = '#242a3d';
    const OBSIDIANA_3  = '#39415c';
    const RUNA         = '#5fe0ff';
    const RUNA_FRACA   = '#2b7f9e';
    const VIOLETA      = '#9b7dff';
    const LUZ_BORDA    = '#dfe7f5';

    // Estados de animação que alteram a pose/visual.
    const ESTADOS_ATAQUE = { golpe: 1, impacto: 1, redemoinho: 1, brado: 1 };

    function agoraMs() {
        return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
    }

    // Ruído estável por id: duas personagens nunca compartilham fase, então
    // a flutuação não fica "emLockstep" num grupinho de monstros.
    function ruido(id) {
        let h = 2166136261;
        const s = String(id || 'kaledron');
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return ((h >>> 0) % 1000) / 1000;
    }

    // ------------------------------------------------------------- primitivas

    // Retângulo com cantos arredondados, compatível com navegadores antigos
    // (roundRect não existe em todo lugar).
    function caixa(ctx, x, y, w, h, r) {
        const raio = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.beginPath();
        ctx.moveTo(x + raio, y);
        ctx.lineTo(x + w - raio, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + raio);
        ctx.lineTo(x + w, y + h - raio);
        ctx.quadraticCurveTo(x + w, y + h, x + w - raio, y + h);
        ctx.lineTo(x + raio, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - raio);
        ctx.lineTo(x, y + raio);
        ctx.quadraticCurveTo(x, y, x + raio, y);
        ctx.closePath();
    }

    // Polígono a partir de pares [x,y].
    function poli(ctx, pontos) {
        ctx.beginPath();
        ctx.moveTo(pontos[0][0], pontos[0][1]);
        for (let i = 1; i < pontos.length; i++) ctx.lineTo(pontos[i][0], pontos[i][1]);
        ctx.closePath();
    }

    // Losango (lasca de cristal).
    function losango(ctx, x, y, larg, alt) {
        ctx.beginPath();
        ctx.moveTo(x, y - alt);
        ctx.lineTo(x + larg, y);
        ctx.lineTo(x, y + alt);
        ctx.lineTo(x - larg, y);
        ctx.closePath();
    }

    // Brilho radial reutilizável — um único gradient por quadro por personagem.
    function brilho(ctx, x, y, r, cor, alpha) {
        if (r <= 0) return;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, cor);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --------------------------------------------------------- camada: chão
    // Poça de vazio + círculo rúnico. Substitui a cratera de lava antiga.
    function desenharPoco(ctx, pulso, intensidade) {
        ctx.save();
        // poça
        ctx.fillStyle = 'rgba(7, 8, 15, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 10, 15 + pulso * 1.2, 5.2 + pulso * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // círculo rúnico externo (segmentado, como um sigilo girando devagar)
        ctx.strokeStyle = 'rgba(95, 224, 255, ' + (0.16 + intensidade * 0.3).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const raio = 12.5 + pulso * 0.8;
        for (let i = 0; i < 4; i++) {
            const a0 = i * Math.PI / 2 + pulso * 0.6;
            ctx.arc(0, 10, raio, a0, a0 + 1.05);
            ctx.moveTo(0, 10);
        }
        ctx.stroke();

        // círculo interno
        ctx.strokeStyle = 'rgba(155, 125, 255, ' + (0.10 + intensidade * 0.22).toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(0, 10, 6.4, 2.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // ------------------------------------------------- camada: lascas orbitais
    // Três fragmentos de cristal em órbita lenta. Preenchem a silhueta e
    // comunicam levitação sem precisar de pernas.
    function desenharOrbita(ctx, t, fase, tamanho, cor) {
        for (let i = 0; i < 3; i++) {
            const a = t * 0.00055 + fase + (i * Math.PI * 2) / 3;
            const ox = Math.cos(a) * (16 + tamanho * 4);
            const oy = -14 + Math.sin(a) * (5.5 + tamanho * 3);
            const esc = 0.75 + Math.sin(a * 2) * 0.25;
            const larg = 2.1 * esc * tamanho;
            const alt = 3.6 * esc * tamanho;

            ctx.save();
            ctx.translate(ox, oy);
            ctx.rotate(Math.sin(a) * 0.5);
            // corpo da lasca
            losango(ctx, 0, 0, larg, alt);
            ctx.fillStyle = OBSIDIANA_2;
            ctx.fill();
            // filete de runa na aresta
            ctx.strokeStyle = cor;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();

            brilho(ctx, ox, oy, alt * 1.9, cor, 0.14 + tamanho * 0.12);
        }
    }

    // ------------------------------------------------- camada: manto de sombra
    // Só a barra de trás: antes ela cobria o torso inteiro e o personagem
    // virava um cone preto. Agora ela sai por baixo do quadril.
    function desenharManto(ctx, fase, movendo, sufocando, t) {
        const balanco = Math.sin(t * 0.0022 + fase) * (movendo ? 2.4 : 0.8);
        const abertura = 5.5 + sufocando * 4.5;

        ctx.save();
        for (let i = 0; i < 2; i++) {
            const escala = 1 - i * 0.3;
            const bal = balanco * (i === 0 ? 1 : -0.6);
            poli(ctx, [
                [-abertura * escala, -10],
                [ abertura * escala, -10],
                [ bal * 0.8 + abertura * escala * 0.3, 4],
                [ bal, 8],
                [ bal * 0.8 - abertura * escala * 0.3, 4]
            ]);
            ctx.fillStyle = i === 0 ? VAZIO : OBSIDIANA;
            ctx.globalAlpha = 0.9 - i * 0.3;
            ctx.fill();
        }
        ctx.restore();
    }

    // -------------------------------------------------------- camada: torso
    // Prioridade: a silhueta precisa LER COMO CAVALEIRO. Peito definido,
    // cintura estreita e quadril alargado — a armadura sustenta a leitura.
    function desenharTorso(ctx, t, fase, intensidade) {
        // peitoral: ombros largos -> cintura estreita
        poli(ctx, [
            [-8.6, -27.5],
            [ 8.6, -27.5],
            [ 6.4, -19.0],
            [ 4.6, -13.5],
            [-4.6, -13.5],
            [-6.4, -19.0]
        ]);
        ctx.fillStyle = OBSIDIANA;
        ctx.fill();

        // luz de volume no flanco esquerdo
        poli(ctx, [
            [-8.6, -27.5],
            [-2.0, -27.5],
            [-2.4, -19.0],
            [-1.6, -13.5],
            [-4.6, -13.5],
            [-6.4, -19.0]
        ]);
        ctx.fillStyle = OBSIDIANA_2;
        ctx.fill();

        // cinto / faldão: uma faixa clara que segura a leitura do quadril
        caixa(ctx, -5.4, -13.6, 10.8, 2.2, 0.8);
        ctx.fillStyle = OBSIDIANA_3;
        ctx.fill();

        // quadril alargado que se dissolve nas lascas
        poli(ctx, [
            [-5.0, -12.2],
            [ 5.0, -12.2],
            [ 3.4, -4.0],
            [ 1.2, 1.0],
            [-1.2, 1.0],
            [-3.4, -4.0]
        ]);
        ctx.fillStyle = OBSIDIANA;
        ctx.fill();

        // sigilo do peito: losango vertical (NÃO uma cruz — isso lia como
        // clérigo). Duas lascas sobrepostas, o "vazio selado".
        ctx.save();
        ctx.globalAlpha = 0.8 + intensidade * 0.2;
        losango(ctx, 0, -21.0, 2.0, 4.6);
        ctx.fillStyle = RUNA;
        ctx.fill();
        losango(ctx, 0, -21.0, 0.9, 2.2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        brilho(ctx, 0, -21, 7.5, RUNA, 0.10 + intensidade * 0.18);
    }

    // ------------------------------------------------- camada: ombreiras
    // Prioridade de silhueta #1. Precisam ser LARGAS e conectadas ao peito,
    // senao o personagem le como um vulto e nao como um cavaleiro colossal.
    function desenharOmbros(ctx, tempo, movendo) {
        const respira = Math.sin(tempo * 0.0026) * 0.35;
        for (let lado = -1; lado <= 1; lado += 2) {
            ctx.save();
            ctx.translate(lado * 8.0, -26.5 + respira);
            ctx.scale(lado, 1);

            // placa principal, bem maior e ligada ao torso
            poli(ctx, [
                [-2.6, -3.4],
                [ 4.2, -5.2],
                [ 8.4, -2.2],
                [ 9.2,  2.2],
                [ 3.0,  4.4],
                [-2.8,  2.6]
            ]);
            ctx.fillStyle = OBSIDIANA_2;
            ctx.fill();
            ctx.strokeStyle = OBSIDIANA_3;
            ctx.lineWidth = 1;
            ctx.stroke();

            // quina superior: a "asa" que dá peso
            poli(ctx, [
                [ 2.0, -4.6],
                [ 8.6, -7.4],
                [ 9.2, -2.0]
            ]);
            ctx.fillStyle = OBSIDIANA_3;
            ctx.fill();
            ctx.stroke();

            // inferior articulado (o "braço" da armadura)
            poli(ctx, [
                [ 3.0,  4.0],
                [ 8.0,  2.6],
                [ 7.2,  9.0],
                [ 2.6,  8.0]
            ]);
            ctx.fillStyle = OBSIDIANA;
            ctx.fill();
            ctx.stroke();

            // fenda de runa na placa
            ctx.strokeStyle = RUNA_FRACA;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0.4, -1.6);
            ctx.lineTo(6.6, -3.0);
            ctx.stroke();
            ctx.restore();
        }
    }

    // -------------------------------------------------------- camada: elmo
    // Gorjal + elmo. O gorjal e o que separa a cabeca do corpo: sem ele a
    // silhueta vira uma mancha unica.
    function desenharElmo(ctx, tempo, intensidade) {
        const t = tempo * 0.001;
        ctx.save();

        // gorjal (colarinho) — separa cabeca de ombros
        poli(ctx, [[-5.6, -27.4], [5.6, -27.4], [4.4, -30.2], [-4.4, -30.2]]);
        ctx.fillStyle = OBSIDIANA_2;
        ctx.fill();
        ctx.strokeStyle = OBSIDIANA_3;
        ctx.lineWidth = 0.9;
        ctx.stroke();

        // cupula do elmo
        poli(ctx, [[-4.6, -30.0], [4.6, -30.0], [4.0, -35.6], [0, -37.8], [-4.0, -35.6]]);
        ctx.fillStyle = OBSIDIANA;
        ctx.fill();
        ctx.stroke();

        // coroa: tres espinhos
        ctx.fillStyle = OBSIDIANA_2;
        ctx.strokeStyle = OBSIDIANA_3;
        ctx.lineWidth = 0.7;
        for (let i = -1; i <= 1; i++) {
            const alt = i === 0 ? 4.2 : 2.8;
            poli(ctx, [
                [i * 2.4 - 0.8, -36.4],
                [i * 2.4 + 0.8, -36.4],
                [i * 2.4, -36.4 - alt]
            ]);
            ctx.fill();
            ctx.stroke();
        }

        // fenda de visao
        const pulso = 0.75 + Math.sin(t * 2.1) * 0.13 + intensidade * 0.25;
        ctx.globalAlpha = Math.min(1, pulso);
        ctx.fillStyle = RUNA;
        caixa(ctx, -3.6, -33.0, 7.2, 1.6, 0.7);
        ctx.fill();
        ctx.globalAlpha = 1;

        brilho(ctx, 0, -32.3, 7, RUNA, 0.22 + intensidade * 0.3);
        ctx.restore();
    }

    // ------------------------------------------- camada: lâmina flutuante
    // A assinatura da classe. Orbita no descanso; trava à frente no ataque.
    function desenharLamina(ctx, t, anguloAtaque, prog, ativo, facing) {
        const orbitando = !(ativo && ESTADOS_ATAQUE[ativo]);
        let x, y, rot;

        if (orbitando) {
            // órbita lenta à frente e acima
            const a = t * 0.0016;
            x = facing * (13 + Math.cos(a) * 2.4);
            y = -20 + Math.sin(a) * 3.2;
            rot = -0.5 + Math.sin(a * 0.8) * 0.22;
        } else {
            // trava na direção do golpe, com antecipação (ease-out)
            const e = 1 - Math.pow(1 - Math.min(1, prog), 3);
            const dist = 12 + e * 15;
            x = facing * (7 + dist * 0.72);
            y = -19 + Math.sin(prog * Math.PI) * -5;
            rot = anguloAtaque + facing * -0.5;
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);

        // haste escura
        caixa(ctx, -0.9, -10, 1.8, 20, 0.8);
        ctx.fillStyle = OBSIDIANA_2;
        ctx.fill();

        // lâmina propriamente dita (losango alongado)
        losango(ctx, 0, -15.5, 2.5, 9.5);
        ctx.fillStyle = LUZ_BORDA;
        ctx.fill();

        // nucleo de runa
        losango(ctx, 0, -15.5, 1.1, 5.2);
        ctx.fillStyle = RUNA;
        ctx.fill();

        // guarda
        caixa(ctx, -2.6, 9.4, 5.2, 1.5, 0.7);
        ctx.fillStyle = OBSIDIANA_3;
        ctx.fill();

        ctx.restore();

        brilho(ctx, x, y - 6, 11, RUNA, orbitando ? 0.16 : 0.34);
        return { x: x, y: y };
    }

    // ------------------------------------------------- camada: estados de skill
    function desenharBrado(ctx, prog) {
        // onda de choque concêntrica saindo do elmo
        const r = 12 + prog * 34;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
            const p = prog - i * 0.14;
            if (p <= 0) continue;
            ctx.strokeStyle = 'rgba(95, 224, 255, ' + (0.34 * (1 - p)).toFixed(3) + ')';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(0, -18, 8 + p * 34, (8 + p * 34) * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function desenharRedemoinho(ctx, prog) {
        // lâminas em espiral ao redor do corpo
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const n = 4;
        for (let i = 0; i < n; i++) {
            const a = prog * Math.PI * 4 + (i * Math.PI * 2) / n;
            const rr = 17 - prog * 6;
            const ox = Math.cos(a) * rr;
            const oy = -15 + Math.sin(a) * rr * 0.42;
            poli(ctx, [[ox - 3, oy], [ox, oy - 1.4], [ox + 3, oy], [ox, oy + 1.4]]);
            ctx.fillStyle = 'rgba(155, 125, 255, 0.45)';
            ctx.fill();
        }
        ctx.restore();
    }

    // =========================================================================
    // ENTRADA PÚBLICA
    // =========================================================================
    window.KaledronVisual = {
        desenhar: function (x, y, isMoving, anguloBase, hp, maxHp, pid, anim) {
            const ctx = window.ctx;
            if (!ctx) return;

            const agora = anim && anim.agora ? anim.agora : agoraMs();
            const fase = ruido(pid) * Math.PI * 2;
            const prog = anim && anim.prog ? anim.prog : 0;
            const estado = (anim && anim.estado) || '';

            // direção
            let facingRight = true;
            if (anguloBase !== undefined && anguloBase !== null) facingRight = Math.cos(anguloBase) >= 0;
            const facing = facingRight ? 1 : -1;

            // ferido -> pisca em violeta; morto -> some (o jogo cuida do corpo)
            const morreu = hp <= 0;
            const ferido = !morreu && maxHp > 0 && hp / maxHp < 0.34;
            const transitorio = ferido ? 0.5 + Math.sin(agora * 0.018) * 0.5 : 0;

            // levitação: sobe e desce sempre, e sobe mais quando anda
            const flutuar = Math.sin(agora * 0.0021 + fase) * (1.5 + (isMoving ? 0.9 : 0));
            const altura = flutuar - 5;

            const intensidade = estado === 'brado' ? 1 : (estado === 'redemoinho' ? 0.7 : transitorio * 0.5);
            const pulso = Math.sin(agora * 0.0031 + fase) * 0.5 + 0.5;

            ctx.save();
            ctx.translate(x, y);

            // --- CHÃO: poça de vazio + sigilo
            desenharPoco(ctx, pulso, intensidade);

            if (morreu) {
                ctx.restore();
                return;
            }

            // --- flash de dano: o corpo inteiro acende por um instante
            if (transitorio > 0.55) {
                brilho(ctx, 0, -18, 22, VIOLETA, 0.22);
            }

            // --- camada flutuante
            ctx.save();
            ctx.translate(0, altura);

            // leve inclinação na marcha, só para dar peso sem ser caminhada
            const tilt = isMoving ? facing * 0.05 : 0;
            ctx.rotate(tilt);

            if (estado === 'brado') desenharBrado(ctx, prog);
            if (estado === 'redemoinho') desenharRedemoinho(ctx, prog);

            desenharOrbita(ctx, agora, fase, 1 + intensidade * 0.3, estado === 'redemoinho' ? VIOLETA : RUNA_FRACA);
            desenharManto(ctx, fase, isMoving, isMoving ? 1 : 0.25, agora);
            desenharTorso(ctx, agora, fase, intensidade);
            desenharOmbros(ctx, agora, isMoving);
            desenharElmo(ctx, agora, intensidade);

            ctx.restore();

            // --- lâmina flutuante (fora do tilt: ela tem vida própria)
            const angAtaque = anim && anim.anguloAtaque !== undefined
                ? anim.anguloAtaque
                : (anguloBase || 0);
            desenharLamina(ctx, agora, angAtaque, prog, estado, facing);

            ctx.restore();
        }
    };
})(window);
