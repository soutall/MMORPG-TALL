/* Editor admin de VFX persistentes do mapa. */
(function () {
    'use strict';

    var tipos = [
        { id: 'lampada', nome: 'Lâmpada quente', grupo: 'Luzes', cor: '#ffd166' },
        { id: 'holofote', nome: 'Holofote', grupo: 'Luzes', cor: '#fff3b0' },
        { id: 'tocha', nome: 'Tocha com labaredas', grupo: 'Luzes', cor: '#ff9f1c' },
        { id: 'fogo', nome: 'Fogueira realista', grupo: 'Luzes', cor: '#ff6b35' },
        { id: 'fogo-alto', nome: 'Labaredas altas', grupo: 'Luzes', cor: '#ff5b22' },
        { id: 'brasa', nome: 'Brasas e fagulhas', grupo: 'Luzes', cor: '#ff9f43' },
        { id: 'sombra', nome: 'Sombra pulsante', grupo: 'Luzes', cor: '#171020' },
        { id: 'fumaça', nome: 'Fumaça subindo', grupo: 'Ambiente', cor: '#aab7b8' },
        { id: 'fumaça-chaminé', nome: 'Fumaça de chaminé', grupo: 'Ambiente', cor: '#b4b5bb' },
        { id: 'nuvem', nome: 'Nuvem volumétrica', grupo: 'Ambiente', cor: '#dce6ee' },
        { id: 'névoa', nome: 'Névoa rasteira', grupo: 'Ambiente', cor: '#91b4c7' },
        { id: 'névoa-baixa', nome: 'Bancos de névoa', grupo: 'Ambiente', cor: '#a5c0ce' },
        { id: 'poeira', nome: 'Poeira ao vento', grupo: 'Ambiente', cor: '#c6a77b' },
        { id: 'cinzas', nome: 'Cinzas caindo', grupo: 'Ambiente', cor: '#9da3a8' },
        { id: 'chuva', nome: 'Chuva inclinada', grupo: 'Clima e água', cor: '#63b4e8' },
        { id: 'tempestade', nome: 'Tempestade elétrica', grupo: 'Clima e água', cor: '#7489b8' },
        { id: 'raios', nome: 'Raios ramificados', grupo: 'Clima e água', cor: '#e8f7ff' },
        { id: 'relampago', nome: 'Relâmpago', grupo: 'Clima e água', cor: '#bde7ff' },
        { id: 'neve', nome: 'Neve caindo', grupo: 'Clima e água', cor: '#e8f7ff' },
        { id: 'água', nome: 'Correnteza', grupo: 'Clima e água', cor: '#38bdf8' },
        { id: 'ondas', nome: 'Ondas na superfície', grupo: 'Clima e água', cor: '#52d6e8' },
        { id: 'nuvem-chuva', nome: 'Nuvem com chuva local', grupo: 'Clima e água', cor: '#9db9ce' },
        { id: 'impacto-agua', nome: 'Objeto caindo na água', grupo: 'Clima e água', cor: '#8be9fd' },
        { id: 'cachoeira', nome: 'Cachoeira e respingos', grupo: 'Clima e água', cor: '#8be9fd' },
        { id: 'bolhas', nome: 'Bolhas subindo', grupo: 'Clima e água', cor: '#8de7ff' },
        { id: 'impacto-pedra', nome: 'Batidas em pedra', grupo: 'Impactos e destroços', cor: '#c6c0b7' },
        { id: 'rocha-quebrando', nome: 'Rocha se quebrando', grupo: 'Impactos e destroços', cor: '#d0c1a4' },
        { id: 'folhas', nome: 'Folhas caindo', grupo: 'Natureza', cor: '#7abf45' },
        { id: 'folhas-caindo', nome: 'Rajada de folhas', grupo: 'Natureza', cor: '#77b84b' },
        { id: 'pétalas', nome: 'Pétalas ao vento', grupo: 'Natureza', cor: '#ff86b7' },
        { id: 'petalas-caindo', nome: 'Chuva de pétalas', grupo: 'Natureza', cor: '#ff9ecb' },
        { id: 'grama', nome: 'Grama balançando', grupo: 'Natureza', cor: '#72b75b' },
        { id: 'borboletas', nome: 'Borboletas voando', grupo: 'Natureza', cor: '#d99cff' },
        { id: 'vaga-lumes', nome: 'Vaga-lumes', grupo: 'Natureza', cor: '#f7e36d' },
        { id: 'vaga-lumes-denso', nome: 'Enxame de vaga-lumes', grupo: 'Natureza', cor: '#f7e36d' },
        { id: 'espinhos', nome: 'Espinhos brotando', grupo: 'Natureza', cor: '#a7d129' },
        { id: 'cristais', nome: 'Cristais flutuantes', grupo: 'Mágicos', cor: '#7ee7ff' },
        { id: 'runas', nome: 'Runas orbitais', grupo: 'Mágicos', cor: '#75f0ca' },
        { id: 'portal', nome: 'Portal mágico', grupo: 'Mágicos', cor: '#b56cff' },
        { id: 'vórtice', nome: 'Vórtice arcano', grupo: 'Mágicos', cor: '#c084fc' },
        { id: 'estrelas', nome: 'Poeira estelar', grupo: 'Mágicos', cor: '#fff4a3' },
        { id: 'aurora', nome: 'Aurora etérea', grupo: 'Mágicos', cor: '#65e6c0' },
        { id: 'faíscas', nome: 'Faíscas mágicas', grupo: 'Mágicos', cor: '#ffe28a' },
        { id: 'poeira-mágica', nome: 'Poeira encantada', grupo: 'Mágicos', cor: '#dab3ff' }
    ];

    var lista = [];
    var selecionado = null;
    var armado = false;
    var previewFrame = 0;
    var descricoes = {
        'fogo': 'Línguas de fogo animadas, núcleo quente, brilho no chão e brasas ascendentes.',
        'fogo-alto': 'Labaredas mais altas e intensas para fogueiras grandes e áreas de incêndio.',
        'folhas': 'Pequenas folhas giram, balançam e caem suavemente dentro da área.',
        'folhas-caindo': 'Rajada mais larga de folhas em queda, com movimento lateral de vento.',
        'pétalas': 'Pétalas delicadas flutuam e rodopiam pelo local.',
        'petalas-caindo': 'Chuva densa de pétalas com queda lenta e oscilante.',
        'cachoeira': 'Fluxo vertical contínuo com espuma e respingos na base.',
        'névoa': 'Camadas baixas e translúcidas deslizam pelo terreno.',
        'nuvem-chuva': 'Nuvens locais com chuva e pequenos respingos; não altera o clima global.',
        'impacto-agua': 'Gotas caem em ciclos, formando ondas concêntricas e respingos.',
        'impacto-pedra': 'Batidas repetidas levantam lascas e poeira de pedra.',
        'rocha-quebrando': 'Fissuras se abrem e fragmentos se soltam em ciclos.'
    };
    var direcoesHolofote = {
        n: { x: 0, y: -1, rotacao: Math.PI },
        ne: { x: 1, y: -1, rotacao: -Math.PI * 0.75 },
        e: { x: 1, y: 0, rotacao: -Math.PI / 2 },
        se: { x: 1, y: 1, rotacao: -Math.PI * 0.25 },
        s: { x: 0, y: 1, rotacao: 0 },
        sw: { x: -1, y: 1, rotacao: Math.PI * 0.25 },
        w: { x: -1, y: 0, rotacao: Math.PI / 2 },
        nw: { x: -1, y: -1, rotacao: Math.PI * 0.75 }
    };

    function el(tag, props) {
        var elemento = document.createElement(tag);
        Object.keys(props || {}).forEach(function (chave) { elemento[chave] = props[chave]; });
        return elemento;
    }

    function obterTipo(id) {
        for (var i = 0; i < tipos.length; i++) if (tipos[i].id === id) return tipos[i];
        return tipos[0];
    }

    function montar() {
        var barra = document.getElementById('util-buttons');
        if (!barra || document.getElementById('btn-admin-vfx')) return;

        var botao = el('button', { id: 'btn-admin-vfx', className: 'btn-util btn-admin-vfx', textContent: '✨' });
        botao.title = 'Editor de VFX do mapa';
        botao.onclick = function () {
            armado = !armado;
            botao.classList.toggle('ativo', armado);
        };
        barra.appendChild(botao);

        var tela = el('div', { id: 'map-vfx-screen' });
        var janela = el('div', { id: 'map-vfx-window' });
        tela.appendChild(janela);
        janela.innerHTML =
            '<div class="map-vfx-title">✨ ATELIÊ DE VFX DO MAPA</div>' +
            '<div class="map-vfx-subtitle">Escolha um efeito e confira a animação antes de aplicar no mapa.</div>' +
            '<label>EFEITO<select id="map-vfx-tipo"></select></label>' +
            '<div id="map-vfx-preview-wrap"><canvas id="map-vfx-preview" width="560" height="240"></canvas><span>PRÉVIA ANIMADA</span></div>' +
            '<div id="map-vfx-description"></div>' +
            '<div class="map-vfx-controls">' +
            '<label id="map-vfx-direcao-wrap">DIREÇÃO DO HOLOFOTE<select id="map-vfx-direcao"><option value="n">Norte ↑</option><option value="ne">Nordeste ↗</option><option value="e">Leste →</option><option value="se">Sudeste ↘</option><option value="s">Sul ↓</option><option value="sw">Sudoeste ↙</option><option value="w">Oeste ←</option><option value="nw">Noroeste ↖</option></select></label>' +
            '<label>CAMADA<select id="map-vfx-camada"><option value="atras">Atrás das texturas</option><option value="frente">Na frente das texturas</option></select></label>' +
            '<label>ESCALA <output id="map-vfx-escala-label">1.0x</output><input id="map-vfx-escala" type="range" min="0.3" max="4" step="0.1" value="1"></label>' +
                '<label>INTENSIDADE <output id="map-vfx-intensidade-label">1.0x</output><input id="map-vfx-intensidade" type="range" min="0.1" max="2" step="0.1" value="1"></label>' +
                '<label>ÁREA DO EFEITO <output id="map-vfx-raio-label">80</output><input id="map-vfx-raio" type="range" min="20" max="260" step="5" value="80"></label>' +
                '<label class="map-vfx-color-label">COR DO EFEITO<input id="map-vfx-cor" type="color" value="#ffd166"></label>' +
            '</div>' +
            '<div id="map-vfx-pos"></div>' +
            '<div id="map-vfx-status" role="status"></div>' +
            '<div class="map-vfx-actions"><button id="map-vfx-save">SALVAR</button><button id="map-vfx-delete">EXCLUIR</button><button id="map-vfx-close">FECHAR</button></div>';
        document.body.appendChild(tela);

        var select = document.getElementById('map-vfx-tipo');
        var grupos = {};
        tipos.forEach(function (tipo) {
            if (!grupos[tipo.grupo]) {
                grupos[tipo.grupo] = el('optgroup', { label: tipo.grupo });
                select.appendChild(grupos[tipo.grupo]);
            }
            grupos[tipo.grupo].appendChild(el('option', { value: tipo.id, textContent: tipo.nome }));
        });

        document.getElementById('map-vfx-close').onclick = fechar;
        document.getElementById('map-vfx-save').onclick = salvar;
        document.getElementById('map-vfx-delete').onclick = excluir;
        select.onchange = function () {
            document.getElementById('map-vfx-cor').value = obterTipo(select.value).cor;
            document.getElementById('map-vfx-direcao-wrap').style.display = select.value === 'holofote' ? '' : 'none';
            atualizarPreview();
        };
        ['map-vfx-direcao', 'map-vfx-camada', 'map-vfx-escala', 'map-vfx-intensidade', 'map-vfx-raio', 'map-vfx-cor'].forEach(function (id) {
            document.getElementById(id).addEventListener('input', atualizarPreview);
            document.getElementById(id).addEventListener('change', atualizarPreview);
        });
    }

    function mostrarStatus(mensagem, erro) {
        var status = document.getElementById('map-vfx-status');
        if (!status) return;
        status.textContent = mensagem || '';
        status.classList.toggle('erro', !!erro);
    }

    function atualizarDescricao() {
        var tipo = document.getElementById('map-vfx-tipo').value;
        document.getElementById('map-vfx-description').textContent =
            descricoes[tipo] || 'Efeito procedural animado. Ajuste cor, escala, intensidade e área para combinar com o cenário.';
    }

    function lerControles() {
        return {
            tipo: document.getElementById('map-vfx-tipo').value,
            escala: Number(document.getElementById('map-vfx-escala').value),
            intensidade: Number(document.getElementById('map-vfx-intensidade').value),
            raio: Number(document.getElementById('map-vfx-raio').value),
            cor: document.getElementById('map-vfx-cor').value,
            direcao: document.getElementById('map-vfx-direcao').value,
            camada: document.getElementById('map-vfx-camada').value
        };
    }

    function atualizarRotulos(controles) {
        document.getElementById('map-vfx-escala-label').textContent = controles.escala.toFixed(1) + 'x';
        document.getElementById('map-vfx-intensidade-label').textContent = controles.intensidade.toFixed(1) + 'x';
        document.getElementById('map-vfx-raio-label').textContent = String(controles.raio);
    }

    function atualizarPreview() {
        if (!document.getElementById('map-vfx-screen')) return;
        var controles = lerControles();
        atualizarRotulos(controles);
        atualizarDescricao();
        desenharPreview(controles, Date.now());
    }

    function desenharPreview(controles, tempo) {
        var canvas = document.getElementById('map-vfx-preview');
        if (!canvas) return;
        var contexto = canvas.getContext('2d');
        contexto.clearRect(0, 0, canvas.width, canvas.height);
        contexto.fillStyle = '#100c17';
        contexto.fillRect(0, 0, canvas.width, canvas.height);
        var raioTela = Math.min((controles.tipo === 'holofote' ? 43 : 88) * controles.escala,
            canvas.height * 0.42, canvas.width * 0.42);
        desenhar({
            id: 'preview-' + controles.tipo,
            tipo: controles.tipo,
            x: canvas.width / 2,
            y: canvas.height / 2 + 14,
            escala: controles.escala,
            intensidade: controles.intensidade,
            raio: raioTela / controles.escala,
            cor: controles.cor,
            direcao: controles.direcao,
            camada: controles.camada
        }, tempo, contexto, true);
    }

    function iniciarPreview() {
        if (previewFrame) cancelAnimationFrame(previewFrame);
        function quadro() {
            if (!document.getElementById('map-vfx-screen') || document.getElementById('map-vfx-screen').style.display !== 'flex') {
                previewFrame = 0;
                return;
            }
            atualizarPreview();
            previewFrame = requestAnimationFrame(quadro);
        }
        previewFrame = requestAnimationFrame(quadro);
    }

    window.mostrarBotaoVfxAdmin = function () {
        var botao = document.getElementById('btn-admin-vfx');
        if (botao) botao.style.display = 'flex';
    };

    function abrir(vfx) {
        var selecionadoVfx = vfx || {
            x: Math.round(window.mouseWorldX || window.meuX + 12),
            y: Math.round(window.mouseWorldY || window.meuY + 16),
            tipo: 'lampada', escala: 1, intensidade: 1, raio: 80, cor: '#ffd166'
        };
        selecionado = selecionadoVfx;
        document.getElementById('map-vfx-tipo').value = selecionado.tipo;
        document.getElementById('map-vfx-escala').value = selecionado.escala || 1;
        document.getElementById('map-vfx-intensidade').value = selecionado.intensidade || 1;
        document.getElementById('map-vfx-raio').value = selecionado.raio || 80;
        document.getElementById('map-vfx-cor').value = selecionado.cor || obterTipo(selecionado.tipo).cor;
        document.getElementById('map-vfx-direcao').value = direcoesHolofote[selecionado.direcao] ? selecionado.direcao : 'n';
        document.getElementById('map-vfx-camada').value = selecionado.camada === 'frente' ? 'frente' : 'atras';
        document.getElementById('map-vfx-direcao-wrap').style.display = selecionado.tipo === 'holofote' ? '' : 'none';
        document.getElementById('map-vfx-pos').textContent = 'X: ' + Math.round(selecionado.x) + ' · Y: ' + Math.round(selecionado.y);
        document.getElementById('map-vfx-delete').style.display = vfx ? 'block' : 'none';
        mostrarStatus('', false);
        document.getElementById('map-vfx-screen').style.display = 'flex';
        window.mapVfxAberto = true;
        atualizarPreview();
        iniciarPreview();
    }

    function fechar() {
        document.getElementById('map-vfx-screen').style.display = 'none';
        window.mapVfxAberto = false;
        if (previewFrame) cancelAnimationFrame(previewFrame);
        previewFrame = 0;
        selecionado = null;
    }

    function salvar() {
        if (!selecionado) {
            mostrarStatus('Selecione uma posição do mapa antes de salvar.', true);
            return;
        }
        if (!window.ws || window.ws.readyState !== 1) {
            mostrarStatus('Não foi possível salvar: conexão com o servidor fechada.', true);
            return;
        }
        var novo = {
            id: selecionado.id || ('vfx_' + Date.now().toString(36)),
            x: selecionado.x,
            y: selecionado.y,
            tipo: document.getElementById('map-vfx-tipo').value,
            escala: Number(document.getElementById('map-vfx-escala').value),
            intensidade: Number(document.getElementById('map-vfx-intensidade').value),
            raio: Number(document.getElementById('map-vfx-raio').value),
            cor: document.getElementById('map-vfx-cor').value,
            direcao: document.getElementById('map-vfx-direcao').value,
            camada: document.getElementById('map-vfx-camada').value
        };
        window.ws.send(JSON.stringify({ action: 'admin_map_vfx', sub: selecionado.id ? 'editar' : 'criar', vfx: novo }));
        fechar();
    }

    function excluir() {
        if (!selecionado || !selecionado.id) return;
        if (!window.ws || window.ws.readyState !== 1) {
            mostrarStatus('Não foi possível excluir: conexão com o servidor fechada.', true);
            return;
        }
        window.ws.send(JSON.stringify({ action: 'admin_map_vfx_excluir', id: selecionado.id }));
        fechar();
    }

    function corComAlpha(cor, alpha) {
        if (/^#[0-9a-f]{6}$/i.test(cor)) {
            return 'rgba(' + parseInt(cor.slice(1, 3), 16) + ',' + parseInt(cor.slice(3, 5), 16) + ',' + parseInt(cor.slice(5, 7), 16) + ',' + alpha + ')';
        }
        return cor;
    }

    function desenhar(v, tempo, contexto, preview) {
        var c = contexto || window.ctx;
        if (!c || !v) return;
        var tipo = v.tipo || 'lampada';
        var luz = ['lampada', 'holofote', 'tocha', 'fogo', 'fogo-alto', 'brasa'].indexOf(tipo) !== -1;
        var fatorLuz = !preview && luz && typeof window.obterFatorLuzDiaNoite === 'function' ? window.obterFatorLuzDiaNoite() : 1;
        if (luz && !window.mapVfxAberto && fatorLuz <= 0.001) return;
        var x = Number(v.x) || 0;
        var y = Number(v.y) || 0;
        var escala = Math.max(0.1, Number(v.escala) || 1);
        var raio = Math.max(1, (Number(v.raio) || 80) * escala);
        var potencia = Math.max(0.1, Number(v.intensidade) || 1) * (luz ? fatorLuz : 1);
        var a = tempo / 1000;
        var cor = v.cor || obterTipo(tipo).cor;
        var direcao = direcoesHolofote[v.direcao] || direcoesHolofote.n;
        var seed = 0;
        String(v.id || tipo).split('').forEach(function (ch) { seed = (seed * 31 + ch.charCodeAt(0)) % 997; });
        var fase = seed / 997 * Math.PI * 2;
        function aleatorio(i) { return Math.abs(Math.sin(seed * 12.9898 + i * 78.233)); }
        function elipse(px, py, rx, ry, rotacao, alpha, preenchimento) {
            c.save();
            c.globalAlpha = Math.max(0, Math.min(1, alpha));
            c.fillStyle = preenchimento || cor;
            c.beginPath();
            c.ellipse(px, py, Math.max(0.5, rx), Math.max(0.5, ry), rotacao || 0, 0, Math.PI * 2);
            c.fill();
            c.restore();
        }
        function brilho(px, py, r, corBrilho, alpha) {
            var gradiente = c.createRadialGradient(px, py, 0, px, py, r);
            gradiente.addColorStop(0, corComAlpha(corBrilho, alpha));
            gradiente.addColorStop(1, corComAlpha(corBrilho, 0));
            c.fillStyle = gradiente;
            c.globalAlpha = 1;
            c.beginPath();
            c.arc(px, py, r, 0, Math.PI * 2);
            c.fill();
        }
        function folha(px, py, tamanho, angulo, corFolha, alpha) {
            c.save();
            c.translate(px, py);
            c.rotate(angulo);
            c.globalAlpha = Math.max(0.1, Math.min(1, alpha));
            c.fillStyle = corFolha;
            c.strokeStyle = corComAlpha('#183d1c', 0.65);
            c.lineWidth = Math.max(0.5, tamanho * 0.08);
            c.beginPath();
            c.moveTo(-tamanho * 0.62, 0);
            c.quadraticCurveTo(-tamanho * 0.25, -tamanho * 0.66, tamanho * 0.58, -tamanho * 0.08);
            c.quadraticCurveTo(tamanho * 0.15, tamanho * 0.55, -tamanho * 0.62, 0);
            c.closePath();
            c.fill();
            c.beginPath();
            c.moveTo(-tamanho * 0.5, 0);
            c.quadraticCurveTo(0, -tamanho * 0.04, tamanho * 0.48, -tamanho * 0.08);
            c.stroke();
            c.restore();
        }
        function petala(px, py, tamanho, angulo, alpha) {
            c.save();
            c.translate(px, py);
            c.rotate(angulo);
            c.globalAlpha = Math.max(0.12, Math.min(1, alpha));
            c.fillStyle = cor;
            c.beginPath();
            c.moveTo(-tamanho * 0.55, 0);
            c.bezierCurveTo(-tamanho * 0.48, -tamanho * 0.72, tamanho * 0.45, -tamanho * 0.58, tamanho * 0.62, 0);
            c.bezierCurveTo(tamanho * 0.28, tamanho * 0.55, -tamanho * 0.42, tamanho * 0.62, -tamanho * 0.55, 0);
            c.fill();
            c.restore();
        }

        c.save();
        c.translate(x, y);
        c.globalAlpha = 1;
        c.fillStyle = cor;
        c.strokeStyle = cor;
        c.shadowColor = cor;
        c.shadowBlur = Math.min(24, 12 * potencia) * (preview ? 0.8 : 1);

        if (tipo === 'lampada' || tipo === 'holofote' || tipo === 'sombra') {
            if (tipo === 'holofote') {
                c.save();
                c.rotate(direcao.rotacao);
                var cone = c.createRadialGradient(0, 0, raio * 0.05, 0, 0, raio);
                cone.addColorStop(0, corComAlpha(cor, 0.48 * potencia));
                cone.addColorStop(1, corComAlpha(cor, 0));
                c.fillStyle = cone;
                c.beginPath();
                c.moveTo(-raio * 0.22, 0);
                c.lineTo(-raio * 0.72, raio * 1.85);
                c.quadraticCurveTo(0, raio * 2.1, raio * 0.72, raio * 1.85);
                c.lineTo(raio * 0.22, 0);
                c.closePath();
                c.fill();
                c.globalAlpha = 0.18 * potencia;
                c.fillStyle = cor;
                c.beginPath();
                c.moveTo(-raio * 0.06, 0);
                c.lineTo(-raio * 0.28, raio * 1.9);
                c.quadraticCurveTo(0, raio * 2.02, raio * 0.28, raio * 1.9);
                c.lineTo(raio * 0.06, 0);
                c.closePath();
                c.fill();
                elipse(0, 0, 3.5 * escala, 3.5 * escala, 0, 1, '#fff9db');
                c.restore();
            } else if (tipo === 'sombra') {
                elipse(0, raio * 0.12, raio * 0.68, raio * 0.32, 0, 0.16 * potencia, cor);
                elipse(0, raio * 0.12, raio * (0.22 + Math.sin(a * 2 + fase) * 0.025), raio * 0.1, 0, 0.55, cor);
            } else {
                brilho(0, 0, raio * 0.8, cor, 0.22 * potencia);
                brilho(0, 0, raio * 0.4, cor, 0.28 * potencia);
                elipse(0, 0, 4 * escala, 4 * escala, 0, 1, '#fff3b0');
            }
        } else if (tipo === 'fogo' || tipo === 'fogo-alto' || tipo === 'tocha' || tipo === 'brasa') {
            var altura = raio * (tipo === 'fogo-alto' ? 0.92 : tipo === 'tocha' ? 0.64 : 0.68);
            var largura = raio * (tipo === 'tocha' ? 0.24 : 0.52);
            var baseY = raio * 0.28;
            var count = tipo === 'brasa' ? 3 : 5;
            if (tipo !== 'brasa') {
                brilho(0, baseY - altura * 0.28, raio * 0.85, cor, 0.3 * potencia);
                elipse(0, baseY + raio * 0.08, largura * 0.86, raio * 0.19, 0, 0.72, '#332117');
                for (var f = 0; f < count; f++) {
                    var offset = (f - (count - 1) / 2) * largura * 0.28;
                    var wave = Math.sin(a * (3.2 + f * 0.21) + fase + f * 1.8);
                    var tongueHeight = altura * (0.62 + aleatorio(f + 4) * 0.38) * (0.86 + wave * 0.1);
                    var tongueWidth = largura * (0.26 + aleatorio(f + 13) * 0.12);
                    var topX = offset + wave * tongueWidth * 0.75;
                    c.globalAlpha = (0.72 + aleatorio(f + 22) * 0.2) * Math.min(1, potencia);
                    c.fillStyle = f % 2 ? '#ff791f' : cor;
                    c.beginPath();
                    c.moveTo(offset - tongueWidth, baseY);
                    c.bezierCurveTo(offset - tongueWidth * 1.4, baseY - tongueHeight * 0.38, topX - tongueWidth * 0.36, baseY - tongueHeight * 0.65, topX, baseY - tongueHeight);
                    c.bezierCurveTo(topX + tongueWidth * 0.48, baseY - tongueHeight * 0.62, offset + tongueWidth * 1.55, baseY - tongueHeight * 0.3, offset + tongueWidth, baseY);
                    c.closePath();
                    c.fill();
                    c.globalAlpha *= 0.92;
                    c.fillStyle = f % 2 ? '#ffd34e' : '#ffb52e';
                    c.beginPath();
                    c.moveTo(offset - tongueWidth * 0.48, baseY - 1);
                    c.bezierCurveTo(offset - tongueWidth * 0.52, baseY - tongueHeight * 0.35, topX - tongueWidth * 0.2, baseY - tongueHeight * 0.5, topX, baseY - tongueHeight * 0.73);
                    c.bezierCurveTo(topX + tongueWidth * 0.25, baseY - tongueHeight * 0.42, offset + tongueWidth * 0.7, baseY - tongueHeight * 0.2, offset + tongueWidth * 0.48, baseY - 1);
                    c.closePath();
                    c.fill();
                }
                for (var e = 0; e < (tipo === 'fogo-alto' ? 9 : 6); e++) {
                    var emberPhase = (a * (0.14 + aleatorio(e + 40) * 0.12) + aleatorio(e + 9)) % 1;
                    var emberX = (aleatorio(e + 80) - 0.5) * largura * 1.4 + Math.sin(a * 2 + e) * largura * 0.1;
                    var emberY = baseY - emberPhase * altura * 1.4;
                    elipse(emberX, emberY, 1.4 * escala, 2 * escala, a * 2 + e, 1 - emberPhase, e % 2 ? '#ffd34e' : '#ff692e');
                }
            } else {
                for (var b = 0; b < 9; b++) {
                    var brasaPhase = (a * (0.12 + aleatorio(b + 120) * 0.15) + aleatorio(b + 90)) % 1;
                    elipse((aleatorio(b + 4) - 0.5) * raio, raio * 0.15 - brasaPhase * raio * 0.9, (1.2 + aleatorio(b + 7) * 1.8) * escala, 2.5 * escala, a + b, 1 - brasaPhase, b % 2 ? '#ffb52e' : cor);
                }
            }
        } else if (tipo === 'fumaça' || tipo === 'fumaça-chaminé' || tipo === 'nuvem' || tipo === 'névoa' || tipo === 'névoa-baixa' || tipo === 'cinzas' || tipo === 'poeira') {
            var rasteira = tipo === 'névoa' || tipo === 'névoa-baixa';
            var puffCount = tipo === 'névoa-baixa' ? 7 : 10;
            for (var s = 0; s < puffCount; s++) {
                var rise = (a * (rasteira ? 0.018 : 0.035) + aleatorio(s + 15)) % 1;
                var drift = (aleatorio(s + 5) - 0.5) * raio * (rasteira ? 1.5 : 0.75) + Math.sin(a * 0.55 + s + fase) * raio * 0.12;
                var puffY = rasteira ? raio * 0.2 + Math.sin(a * 0.4 + s) * raio * 0.16 : raio * 0.5 - rise * raio * 1.25;
                var puffSize = raio * (0.1 + aleatorio(s + 28) * 0.14) * (0.65 + rise * 0.6);
                var puffAlpha = (rasteira ? 0.11 : 0.15) * (1 - rise * 0.4) * potencia;
                elipse(drift, puffY, puffSize * 1.35, puffSize * 0.72, Math.sin(a + s) * 0.12, puffAlpha, cor);
                if (!rasteira && s % 2 === 0) elipse(drift - puffSize * 0.4, puffY + puffSize * 0.12, puffSize * 0.65, puffSize * 0.52, 0, puffAlpha * 0.7, '#d7dce0');
            }
        } else if (tipo === 'nuvem-chuva') {
            for (var cloud = 0; cloud < 7; cloud++) {
                var cloudX = (cloud - 3) * raio * 0.16;
                var cloudY = -raio * 0.3 + Math.sin(cloud * 1.7 + fase) * raio * 0.07;
                elipse(cloudX, cloudY, raio * (0.2 + aleatorio(cloud + 210) * 0.08), raio * 0.13,
                    0, 0.34 * potencia, cloud % 2 ? '#6d8294' : cor);
            }
            c.lineCap = 'round';
            for (var chuva = 0; chuva < 28; chuva++) {
                var chuvaFase = (a * 0.72 + aleatorio(chuva + 250)) % 1;
                var chuvaX = (aleatorio(chuva + 260) - 0.5) * raio * 1.25 + (chuvaFase - 0.5) * raio * 0.16;
                var chuvaY = -raio * 0.12 + chuvaFase * raio * 1.25;
                c.globalAlpha = (0.3 + aleatorio(chuva + 280) * 0.32) * potencia;
                c.lineWidth = Math.max(0.7, escala * 0.9);
                c.beginPath();
                c.moveTo(chuvaX, chuvaY);
                c.lineTo(chuvaX + raio * 0.035, chuvaY + raio * 0.1);
                c.stroke();
            }
            for (var respingo = 0; respingo < 6; respingo++) {
                var respingoFase = (a * 0.7 + aleatorio(respingo + 310)) % 1;
                elipse((aleatorio(respingo + 320) - 0.5) * raio * 1.2, raio * 0.58,
                    escala * (1 + respingoFase * 2), escala * 0.7, 0,
                    (1 - respingoFase) * 0.6 * potencia, '#d9f5ff');
            }
        } else if (tipo === 'impacto-pedra' || tipo === 'rocha-quebrando') {
            var cicloImpacto = (a * (tipo === 'rocha-quebrando' ? 0.34 : 0.62) + fase / (Math.PI * 2)) % 1;
            var pulsoImpacto = Math.max(0, 1 - cicloImpacto * 4);
            c.lineCap = 'round';
            c.lineJoin = 'round';
            if (tipo === 'rocha-quebrando') {
                c.globalAlpha = (0.28 + Math.sin(a * 1.1 + fase) * 0.08) * potencia;
                c.lineWidth = Math.max(1, 1.5 * escala);
                c.beginPath();
                c.moveTo(-raio * 0.16, raio * 0.2);
                c.lineTo(-raio * 0.04, raio * 0.06);
                c.lineTo(-raio * 0.1, -raio * 0.08);
                c.lineTo(raio * 0.03, -raio * 0.18);
                c.moveTo(raio * 0.03, -raio * 0.18);
                c.lineTo(raio * 0.08, -raio * 0.02);
                c.lineTo(raio * 0.2, raio * 0.08);
                c.stroke();
            }
            for (var fragmento = 0; fragmento < (tipo === 'rocha-quebrando' ? 13 : 8); fragmento++) {
                var anguloFragmento = fragmento * 2.399 + fase;
                var faseFragmento = (cicloImpacto + aleatorio(fragmento + 350)) % 1;
                var distanciaFragmento = raio * (0.12 + faseFragmento * (tipo === 'rocha-quebrando' ? 0.62 : 0.42));
                var fx = Math.cos(anguloFragmento) * distanciaFragmento;
                var fy = raio * 0.18 + Math.sin(anguloFragmento) * distanciaFragmento * 0.48 + faseFragmento * faseFragmento * raio * 0.24;
                c.save();
                c.translate(fx, fy);
                c.rotate(anguloFragmento + faseFragmento * 4);
                c.globalAlpha = (1 - faseFragmento) * potencia;
                c.fillStyle = fragmento % 3 === 0 ? '#e1d4bd' : cor;
                c.beginPath();
                c.moveTo(-escala * 2.8, escala * 1.5);
                c.lineTo(escala * 0.5, -escala * (2 + aleatorio(fragmento + 370) * 2));
                c.lineTo(escala * 3, escala * 1.2);
                c.closePath();
                c.fill();
                c.restore();
            }
            if (pulsoImpacto > 0) {
                c.globalAlpha = pulsoImpacto * 0.85 * potencia;
                c.lineWidth = Math.max(1, escala * 1.8);
                c.beginPath();
                c.moveTo(-raio * 0.25, raio * 0.16);
                c.lineTo(0, raio * (0.05 + pulsoImpacto * 0.08));
                c.lineTo(raio * 0.2, raio * 0.18);
                c.stroke();
                for (var fagulha = 0; fagulha < 5; fagulha++) {
                    var anguloFagulha = fagulha * Math.PI * 0.4 - Math.PI * 0.9;
                    var distanciaFagulha = raio * (0.12 + (1 - pulsoImpacto) * 0.18);
                    elipse(Math.cos(anguloFagulha) * distanciaFagulha, raio * 0.12 + Math.sin(anguloFagulha) * distanciaFagulha,
                        escala * 1.5, escala * 1.5, 0, pulsoImpacto, '#ffe2a3');
                }
            }
            if (tipo === 'rocha-quebrando') {
                c.globalAlpha = 0.14 * potencia;
                elipse(0, raio * 0.2, raio * (0.24 + Math.sin(a * 2 + fase) * 0.02), raio * 0.09, 0, 1, '#9a8062');
            }
        } else if (tipo === 'folhas' || tipo === 'folhas-caindo' || tipo === 'pétalas' || tipo === 'petalas-caindo' || tipo === 'cinzas' || tipo === 'neve') {
            var folhas = tipo === 'folhas' || tipo === 'folhas-caindo';
            var petalas = tipo === 'pétalas' || tipo === 'petalas-caindo';
            var densidade = tipo === 'folhas-caindo' ? 40 : tipo === 'petalas-caindo' ? 36 : folhas ? 28 : 24;
            for (var q = 0; q < densidade; q++) {
                var queda = (a * (0.075 + aleatorio(q + 33) * 0.04) + aleatorio(q + 2)) % 1;
                var lateral = (aleatorio(q + 70) - 0.5) * raio * 1.8 + Math.sin(a * (1.1 + aleatorio(q + 99)) + q * 1.7 + fase) * raio * 0.23;
                var quedaY = -raio * 0.75 + queda * raio * 1.5;
                var giro = a * (0.55 + aleatorio(q + 44)) + q * 1.7;
                var tamanhoParticula = escala * (folhas ? 4.5 + aleatorio(q + 54) * 6 : 4 + aleatorio(q + 54) * 5.5);
                var alphaParticula = (0.55 + aleatorio(q + 20) * 0.4) * potencia;
                if (folhas) {
                    var folhaCor = aleatorio(q + 31) > 0.5 ? cor : (aleatorio(q + 32) > 0.5 ? '#d7a83c' : '#4f963e');
                    folha(lateral, quedaY, tamanhoParticula, giro, folhaCor, alphaParticula);
                } else if (petalas) {
                    petala(lateral, quedaY, tamanhoParticula, giro, alphaParticula);
                } else if (tipo === 'neve') {
                    elipse(lateral, quedaY, tamanhoParticula * 0.45, tamanhoParticula * 0.45, 0, alphaParticula, cor);
                } else {
                    elipse(lateral, quedaY, tamanhoParticula * 0.3, tamanhoParticula * 0.55, giro, alphaParticula * 0.6, cor);
                }
            }
        } else if (tipo === 'raios' || tipo === 'relampago' || tipo === 'tempestade') {
            var flash = 0.25 + Math.pow(Math.max(0, Math.sin(a * (tipo === 'tempestade' ? 2.8 : 1.3) + fase)), 12) * 0.75;
            c.globalAlpha = flash;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            for (var r = 0; r < (tipo === 'raios' ? 4 : 2); r++) {
                var sx = (r - 1.5) * raio * 0.24;
                c.beginPath();
                c.moveTo(sx, -raio * 0.85);
                var px = sx, py = -raio * 0.85;
                for (var seg = 0; seg < 6; seg++) {
                    px += (aleatorio(r * 12 + seg + Math.floor(a * 3)) - 0.5) * raio * 0.24;
                    py += raio * 0.28;
                    c.lineTo(px, py);
                }
                c.lineWidth = (r === 0 ? 3 : 1.2) * escala;
                c.stroke();
                if (r === 0) {
                    c.globalAlpha = flash * 0.45;
                    c.lineWidth = 7 * escala;
                    c.stroke();
                    c.globalAlpha = flash;
                }
            }
        } else if (tipo === 'chuva' || tipo === 'água' || tipo === 'cachoeira') {
            c.lineCap = 'round';
            for (var d = 0; d < 26; d++) {
                var flow = (a * (tipo === 'chuva' ? 0.65 : 0.85) + aleatorio(d + 71)) % 1;
                var xx = (aleatorio(d + 14) - 0.5) * raio * (tipo === 'cachoeira' ? 0.54 : 1.65);
                var yy = -raio * 0.72 + flow * raio * 1.5;
                var comprimento = escala * (tipo === 'chuva' ? 8 + aleatorio(d + 9) * 10 : 12 + aleatorio(d + 7) * 16);
                c.globalAlpha = (0.35 + aleatorio(d + 3) * 0.45) * potencia;
                c.lineWidth = (tipo === 'cachoeira' ? 1.4 : 1) * escala;
                c.beginPath();
                c.moveTo(xx, yy);
                c.lineTo(xx + (tipo === 'chuva' ? 4 : 0), yy + comprimento);
                c.stroke();
            }
            if (tipo === 'cachoeira') {
                c.globalAlpha = 0.26 * potencia;
                for (var sp = 0; sp < 8; sp++) {
                    var splash = (a * 0.22 + aleatorio(sp + 180)) % 1;
                    elipse((aleatorio(sp + 190) - 0.5) * raio, raio * 0.58 - splash * raio * 0.2, escala * (2 + splash * 5), escala * 2, 0, 1, '#d8fbff');
                }
            }
        } else if (tipo === 'ondas') {
            c.lineWidth = 1.5 * escala;
            c.globalAlpha = 0.16 * potencia;
            c.fillStyle = cor;
            c.beginPath();
            c.moveTo(-raio, 0);
            for (var aguaX = -raio; aguaX <= raio; aguaX += 4 * escala) {
                var aguaY = Math.sin(aguaX * 0.026 + a * 1.8) * raio * 0.055 +
                    Math.sin(aguaX * 0.011 - a * 1.1) * raio * 0.035;
                c.lineTo(aguaX, aguaY);
            }
            c.lineTo(raio, raio * 0.4);
            c.lineTo(-raio, raio * 0.4);
            c.closePath();
            c.fill();
            for (var onda = 0; onda < 5; onda++) {
                c.globalAlpha = (0.2 + onda * 0.045) * potencia;
                c.beginPath();
                for (var ox = -raio; ox <= raio; ox += 5 * escala) {
                    var oy = onda * raio * 0.12 + Math.sin(ox * (0.026 + onda * 0.002) + a * (1.7 + onda * 0.08) + onda) * raio * 0.045;
                    if (ox === -raio) c.moveTo(ox, oy); else c.lineTo(ox, oy);
                }
                c.stroke();
            }
            for (var brilhoAgua = 0; brilhoAgua < 12; brilhoAgua++) {
                var brilhoX = (aleatorio(brilhoAgua + 420) - 0.5) * raio * 1.8;
                var brilhoY = (aleatorio(brilhoAgua + 430) - 0.5) * raio * 0.48;
                var brilhoFase = (a * 0.7 + aleatorio(brilhoAgua + 440)) % 1;
                c.globalAlpha = (1 - brilhoFase) * 0.38 * potencia;
                c.lineWidth = Math.max(0.7, escala * 0.8);
                c.beginPath();
                c.moveTo(brilhoX - raio * 0.025, brilhoY);
                c.quadraticCurveTo(brilhoX, brilhoY - escala * 1.4, brilhoX + raio * 0.025, brilhoY);
                c.stroke();
            }
        } else if (tipo === 'impacto-agua') {
            var faseAgua = (a * 0.42 + fase / (Math.PI * 2)) % 1;
            var raioMaximoAgua = raio * 0.72;
            for (var anel = 0; anel < 3; anel++) {
                var faseAnel = (faseAgua + anel / 3) % 1;
                c.globalAlpha = (1 - faseAnel) * 0.7 * potencia;
                c.lineWidth = Math.max(1, escala * (1.8 - faseAnel));
                c.beginPath();
                c.ellipse(0, raio * 0.2, raioMaximoAgua * faseAnel, raioMaximoAgua * faseAnel * 0.22, 0, 0, Math.PI * 2);
                c.stroke();
            }
            var alturaGota = raio * (0.45 + (1 - faseAgua) * 0.9);
            elipse(Math.sin(a * 3) * raio * 0.05, raio * 0.2 - alturaGota,
                escala * (1.5 + faseAgua), escala * (2.5 + faseAgua * 2), 0,
                Math.min(1, faseAgua * 2) * potencia, '#e6fbff');
            if (faseAgua > 0.87) {
                var respingoAgua = (faseAgua - 0.87) / 0.13;
                for (var gota = 0; gota < 7; gota++) {
                    var anguloGota = gota * Math.PI * 2 / 7;
                    var distanciaGota = raio * respingoAgua * 0.22;
                    elipse(Math.cos(anguloGota) * distanciaGota, raio * 0.2 + Math.sin(anguloGota) * distanciaGota * 0.4,
                        escala, escala * 1.8, anguloGota, (1 - respingoAgua) * potencia, cor);
                }
            }
        } else if (tipo === 'bolhas') {
            for (var bubble = 0; bubble < 14; bubble++) {
                var bubbleRise = (a * 0.09 + aleatorio(bubble + 62)) % 1;
                var bx = (aleatorio(bubble + 100) - 0.5) * raio + Math.sin(a + bubble) * raio * 0.08;
                var by = raio * 0.65 - bubbleRise * raio * 1.3;
                var br = escala * (2 + aleatorio(bubble + 80) * 5);
                c.globalAlpha = (1 - bubbleRise * 0.5) * 0.65;
                c.lineWidth = 1.2 * escala;
                c.beginPath();
                c.arc(bx, by, br, 0, Math.PI * 2);
                c.stroke();
                elipse(bx - br * 0.25, by - br * 0.28, br * 0.18, br * 0.12, -0.5, 0.75, '#fff');
            }
        } else if (tipo === 'grama') {
            for (var g = -5; g <= 5; g++) {
                var gx = g * raio * 0.13;
                var sway = Math.sin(a * 1.8 + g * 0.7 + fase) * raio * 0.08;
                c.globalAlpha = 0.7 * potencia;
                c.lineWidth = 2 * escala;
                c.beginPath();
                c.moveTo(gx, raio * 0.3);
                c.quadraticCurveTo(gx + sway * 0.5, 0, gx + sway, -raio * (0.2 + aleatorio(g + 9) * 0.3));
                c.stroke();
            }
        } else if (tipo === 'espinhos') {
            for (var esp = -4; esp <= 4; esp++) {
                var ex = esp * raio * 0.2;
                c.globalAlpha = 0.8 * potencia;
                c.lineWidth = 2.5 * escala;
                c.beginPath();
                c.moveTo(ex, raio * 0.32);
                c.quadraticCurveTo(ex + raio * 0.04, 0, ex + raio * 0.08, -raio * (0.25 + aleatorio(esp + 5) * 0.18));
                c.stroke();
            }
        } else if (tipo === 'borboletas') {
            for (var bf = 0; bf < 8; bf++) {
                var ba = a * 0.9 + bf * Math.PI / 4;
                var bx2 = Math.cos(ba) * raio * 0.62;
                var by2 = Math.sin(ba * 1.3) * raio * 0.4;
                var flap = Math.abs(Math.sin(a * 9 + bf));
                c.save();
                c.translate(bx2, by2);
                c.rotate(Math.sin(a + bf) * 0.4);
                elipse(-escala * (2 + flap * 2), 0, escala * (1 + flap * 2), escala * 3, -0.5, 0.85, cor);
                elipse(escala * (2 + flap * 2), 0, escala * (1 + flap * 2), escala * 3, 0.5, 0.85, bf % 2 ? '#ffd166' : cor);
                c.restore();
            }
        } else if (tipo === 'vaga-lumes' || tipo === 'vaga-lumes-denso' || tipo === 'estrelas' || tipo === 'aurora') {
            if (tipo === 'aurora') {
                for (var aur = 0; aur < 4; aur++) {
                    c.globalAlpha = 0.12 * potencia;
                    c.lineWidth = raio * (0.12 + aur * 0.035);
                    c.beginPath();
                    c.moveTo(-raio, Math.sin(a * 0.35 + aur) * raio * 0.25);
                    c.bezierCurveTo(-raio * 0.4, -raio * 0.65 + aur * 12, raio * 0.45, raio * 0.48, raio, Math.sin(a * 0.4 + aur + 1) * raio * 0.22);
                    c.stroke();
                }
            }
            var lights = tipo === 'vaga-lumes-denso' ? 22 : 12;
            for (var li = 0; li < lights; li++) {
                var lx = Math.sin(a * (0.19 + aleatorio(li + 3) * 0.28) + li * 7 + fase) * raio * 0.83;
                var ly = Math.cos(a * (0.25 + aleatorio(li + 7) * 0.2) + li * 3) * raio * 0.48;
                var twinkle = 0.45 + Math.max(0, Math.sin(a * 3 + li * 2.3)) * 0.55;
                brilho(lx, ly, (tipo === 'vaga-lumes-denso' ? 7 : 5) * escala, cor, twinkle * 0.36 * potencia);
                elipse(lx, ly, escala * (1 + twinkle), escala * (1 + twinkle), 0, twinkle, cor);
            }
        } else if (tipo === 'cristais' || tipo === 'runas' || tipo === 'portal' || tipo === 'vórtice' || tipo === 'faíscas' || tipo === 'poeira-mágica') {
            if (tipo === 'portal' || tipo === 'vórtice') {
                c.globalAlpha = 0.6 * potencia;
                c.lineWidth = 2 * escala;
                for (var ring = 0; ring < 4; ring++) {
                    c.beginPath();
                    c.ellipse(0, 0, raio * (0.28 + ring * 0.12), raio * (0.16 + ring * 0.07), a * (ring % 2 ? -0.28 : 0.28), a * 0.8 + ring, a * 0.8 + ring + Math.PI * 1.5);
                    c.stroke();
                }
                if (tipo === 'vórtice') {
                    c.beginPath();
                    for (var spiral = 0; spiral < 80; spiral++) {
                        var st = spiral / 80;
                        var sr = st * raio * 0.75;
                        var sa = st * Math.PI * 6 - a * 2;
                        if (spiral === 0) c.moveTo(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.55);
                        else c.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.55);
                    }
                    c.stroke();
                }
            } else if (tipo === 'runas') {
                c.globalAlpha = 0.65 * potencia;
                c.lineWidth = 1.5 * escala;
                c.beginPath();
                c.arc(0, 0, raio * 0.55, a * 0.3, a * 0.3 + Math.PI * 1.7);
                c.stroke();
                for (var ru = 0; ru < 6; ru++) {
                    var ran = a * 0.3 + ru * Math.PI / 3;
                    c.save();
                    c.translate(Math.cos(ran) * raio * 0.55, Math.sin(ran) * raio * 0.55);
                    c.rotate(ran + a * 0.4);
                    c.strokeRect(-4 * escala, -4 * escala, 8 * escala, 8 * escala);
                    c.beginPath(); c.moveTo(-3 * escala, 0); c.lineTo(3 * escala, 0); c.moveTo(0, -3 * escala); c.lineTo(0, 3 * escala); c.stroke();
                    c.restore();
                }
            } else {
                for (var mag = 0; mag < 14; mag++) {
                    var ma = a * (0.3 + aleatorio(mag + 16) * 0.5) + mag * 2.4 + fase;
                    var mr = raio * (0.18 + aleatorio(mag + 6) * 0.7);
                    var mx = Math.cos(ma) * mr;
                    var my = Math.sin(ma) * mr * 0.58;
                    if (tipo === 'cristais') {
                        c.save(); c.translate(mx, my); c.rotate(ma);
                        c.globalAlpha = 0.72 * potencia;
                        c.beginPath(); c.moveTo(0, -7 * escala); c.lineTo(4 * escala, 0); c.lineTo(0, 8 * escala); c.lineTo(-4 * escala, 0); c.closePath(); c.fill();
                        c.globalAlpha = 0.75; c.strokeStyle = '#efffff'; c.lineWidth = escala; c.stroke(); c.restore();
                    } else {
                        var sparkLife = 0.5 + 0.5 * Math.sin(a * 3 + mag * 4);
                        elipse(mx, my, escala * (1 + sparkLife), escala * (1 + sparkLife), ma, sparkLife * 0.8, cor);
                    }
                }
            }
        } else {
            for (var part = 0; part < 18; part++) {
                var pa = a * 0.7 + part * 2.4 + fase;
                var pr = raio * (0.2 + aleatorio(part + 40) * 0.7);
                elipse(Math.cos(pa) * pr, Math.sin(pa) * pr * 0.6, escala * 2, escala * 2, pa, 0.7 * potencia, cor);
            }
        }
        c.restore();
    }

    window.receberVfxMapa = function (vfx) {
        lista = Array.isArray(vfx) ? vfx : [];
        window.vfxMapa = lista;
    };
    window.desenharVfxMapa = function (camada) {
        if (!window.ehAdmin && (!window.vfxMapa || !window.vfxMapa.length)) return;
        var mapa = window.currentMap || 'cidade';
        var agora = Date.now();
        (window.vfxMapa || lista).forEach(function (vfx) {
            var camadaVfx = vfx.camada === 'frente' ? 'frente' : 'atras';
            if ((!camada || camadaVfx === camada) && (!vfx.mapa || vfx.mapa === mapa)) desenhar(vfx, agora);
        });
    };
    window.tentarAbrirVfxMapa = function (wx, wy) {
        if (!window.ehAdmin || !armado || window.spawnAdminAberto || window.mapVfxAberto) return false;
        window.mouseWorldX = wx;
        window.mouseWorldY = wy;
        armado = false;
        var botao = document.getElementById('btn-admin-vfx');
        if (botao) botao.classList.remove('ativo');
        abrir(null);
        return true;
    };
    window.selecionarVfxMapa = function (wx, wy) {
        if (!window.ehAdmin || !window.vfxMapa) return false;
        var achado = null;
        var distancia = 36;
        window.vfxMapa.forEach(function (vfx) {
            if (!vfx.mapa || vfx.mapa === window.currentMap) {
                var d = Math.hypot(vfx.x - wx, vfx.y - wy);
                if (d < distancia) { distancia = d; achado = vfx; }
            }
        });
        if (achado) { abrir(achado); return true; }
        return false;
    };
    window.mapVfxAberto = false;
    montar();
})();
