(function () {
    'use strict';

    const padroes = {
        blur: 0,
        sharpness: 120,
        saturation: 155,
        hue: 0,
        temperature: 0,
        vignette: 0,
        bloom: 0,
        glow: 0,
        posterize: 16,
        dithering: 0,
        grain: 0,
        pixelation: 0,
        outline: 0,
        zoom: 100
    };
    const controles = [
        ['blur', 'Blur', 0, 8, 0.1, 'px'],
        ['sharpness', 'Nitidez (contraste)', 50, 200, 1, '%'],
        ['saturation', 'Saturação', 0, 250, 1, '%'],
        ['hue', 'Matiz', 0, 360, 1, '°'],
        ['temperature', 'Temperatura de cor', -100, 100, 1, ''],
        ['vignette', 'Vinheta', 0, 100, 1, '%'],
        ['bloom', 'Bloom', 0, 100, 1, '%'],
        ['glow', 'Glow do personagem', 0, 100, 1, '%'],
        ['posterize', 'Posterização (16 = desligada)', 2, 16, 1, ' níveis'],
        ['dithering', 'Dithering', 0, 100, 1, '%'],
        ['grain', 'Grão de filme', 0, 100, 1, '%'],
        ['pixelation', 'Pixelização', 0, 100, 1, '%'],
        ['outline', 'Contorno luminoso', 0, 100, 1, '%'],
        ['zoom', 'Zoom da câmera', 50, 150, 1, '%']
    ];
    const settings = Object.assign({}, padroes);
    let painel;
    let overlayCanvas;
    let bloomCanvas;
    let vignette;
    let grainLayer;
    let ditherLayer;
    let posterizeSvg;
    let overlayTimer = 0;
    let adminPreviewAtivo = false;

    window.adminImageSettings = settings;

    function criarPainel() {
        if (painel) return;

        const style = document.createElement('style');
        style.id = 'admin-image-settings-style';
        style.textContent = `
            #admin-image-settings-window {
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 390px; max-width: 92vw; max-height: 88vh; z-index: 100002;
                display: none; flex-direction: column; overflow: hidden;
                color: #eaf4ff; background: linear-gradient(180deg, #142334, #09111b);
                border: 1px solid #57c7ff; border-radius: 12px;
                box-shadow: 0 0 24px rgba(40, 170, 255, .35), 0 12px 40px #000c;
                font: 13px 'Segoe UI', sans-serif;
            }
            #admin-image-settings-window .ais-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 15px; background: #10283b; border-bottom: 1px solid #286080;
                cursor: grab; touch-action: none;
            }
            #admin-image-settings-window .ais-header.ais-dragging { cursor: grabbing; }
            #admin-image-settings-window .ais-title { color: #83dcff; font-weight: 700; font-size: 15px; }
            #admin-image-settings-window .ais-close, #admin-image-settings-window .ais-reset {
                border: 1px solid #4384a5; border-radius: 6px; color: #eaf4ff;
                background: #17364c; padding: 6px 10px; cursor: pointer;
            }
            #admin-image-settings-window .ais-controls {
                padding: 10px 15px; overflow-y: auto; display: grid; gap: 8px;
            }
            #admin-image-settings-window .ais-row {
                display: grid; grid-template-columns: 1fr auto; gap: 3px 10px; align-items: center;
                padding: 6px 8px; background: #ffffff0a; border: 1px solid #ffffff12; border-radius: 6px;
            }
            #admin-image-settings-window .ais-row label { font-weight: 600; }
            #admin-image-settings-window .ais-value { color: #80d8ff; font-variant-numeric: tabular-nums; }
            #admin-image-settings-window input[type=range] { grid-column: 1 / -1; width: 100%; accent-color: #38bdf8; }
            #admin-image-settings-window .ais-note {
                padding: 8px 15px; color: #a9c2d2; font-size: 11px; line-height: 1.45;
                border-top: 1px solid #ffffff16;
            }
            #admin-image-settings-window .ais-footer { padding: 0 15px 12px; display: flex; justify-content: flex-end; }
            #admin-image-settings-vignette, #admin-image-settings-grain, #admin-image-settings-dither {
                position: fixed; inset: 0; pointer-events: none; display: none;
            }
            #admin-image-settings-vignette { z-index: 2; }
            #admin-image-settings-grain, #admin-image-settings-dither { z-index: 3; }
            #admin-image-settings-pixels, #admin-image-settings-bloom {
                position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none;
            }
            #admin-image-settings-pixels { z-index: 1; image-rendering: pixelated; display: none; }
            #admin-image-settings-bloom { z-index: 2; display: none; mix-blend-mode: screen; }
        `;
        document.head.appendChild(style);

        painel = document.createElement('section');
        painel.id = 'admin-image-settings-window';
        painel.dataset.ui = 'true';
        painel.innerHTML = `
            <div class="ais-header">
                <div class="ais-title">🎨 TESTE DE IMAGEM — ADMIN</div>
                <button class="ais-close" type="button" aria-label="Fechar">✕</button>
            </div>
            <div class="ais-controls"></div>
            <div class="ais-note">Prévia em tempo real somente na sua tela; não muda a tela dos outros jogadores. Nitidez usa contraste como aproximação. Glow e contorno são aplicados ao seu personagem.</div>
            <div class="ais-footer"><button class="ais-reset" type="button">Restaurar valores padrão</button></div>
        `;
        document.body.appendChild(painel);
        painel.querySelector('.ais-close').addEventListener('click', fechar);
        const cabecalho = painel.querySelector('.ais-header');
        cabecalho.addEventListener('pointerdown', function (event) {
            if (event.target.closest('button')) return;
            const rect = painel.getBoundingClientRect();
            painel.style.transform = 'none';
            painel.style.left = rect.left + 'px';
            painel.style.top = rect.top + 'px';
            painel.style.margin = '0';
            cabecalho.classList.add('ais-dragging');
            try {
                cabecalho.setPointerCapture(event.pointerId);
            } catch (error) {
                cabecalho._dragPointerId = event.pointerId;
            }
            cabecalho._dragOffsetX = event.clientX - rect.left;
            cabecalho._dragOffsetY = event.clientY - rect.top;
            event.preventDefault();
        });
        cabecalho.addEventListener('pointermove', function (event) {
            if (!cabecalho.hasPointerCapture(event.pointerId) && cabecalho._dragPointerId !== event.pointerId) return;
            const maxLeft = Math.max(0, window.innerWidth - painel.offsetWidth);
            const maxTop = Math.max(0, window.innerHeight - painel.offsetHeight);
            painel.style.left = Math.max(0, Math.min(maxLeft, event.clientX - cabecalho._dragOffsetX)) + 'px';
            painel.style.top = Math.max(0, Math.min(maxTop, event.clientY - cabecalho._dragOffsetY)) + 'px';
        });
        function finalizarArraste(event) {
            if (cabecalho.hasPointerCapture(event.pointerId)) cabecalho.releasePointerCapture(event.pointerId);
            cabecalho._dragPointerId = null;
            cabecalho.classList.remove('ais-dragging');
        }
        cabecalho.addEventListener('pointerup', finalizarArraste);
        cabecalho.addEventListener('pointercancel', finalizarArraste);
        painel.querySelector('.ais-reset').addEventListener('click', function () {
            Object.assign(settings, padroes);
            atualizarControles();
            aplicar();
        });

        const areaControles = painel.querySelector('.ais-controls');
        controles.forEach(function (item) {
            const [chave, nome, min, max, passo, unidade] = item;
            const row = document.createElement('div');
            row.className = 'ais-row';
            row.innerHTML = '<label for="ais-' + chave + '">' + nome + '</label>' +
                '<span class="ais-value" id="ais-value-' + chave + '"></span>' +
                '<input id="ais-' + chave + '" type="range" min="' + min + '" max="' + max +
                '" step="' + passo + '" value="' + settings[chave] + '">';
            const input = row.querySelector('input');
            input.addEventListener('input', function () {
                settings[chave] = Number(input.value);
                atualizarValor(chave, unidade);
                aplicar();
            });
            areaControles.appendChild(row);
        });

        vignette = document.createElement('div');
        vignette.id = 'admin-image-settings-vignette';
        grainLayer = document.createElement('div');
        grainLayer.id = 'admin-image-settings-grain';
        grainLayer.setAttribute('aria-hidden', 'true');
        ditherLayer = document.createElement('div');
        ditherLayer.id = 'admin-image-settings-dither';
        ditherLayer.setAttribute('aria-hidden', 'true');
        overlayCanvas = document.createElement('canvas');
        overlayCanvas.id = 'admin-image-settings-pixels';
        bloomCanvas = document.createElement('canvas');
        bloomCanvas.id = 'admin-image-settings-bloom';
        posterizeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        posterizeSvg.setAttribute('aria-hidden', 'true');
        posterizeSvg.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden';
        posterizeSvg.innerHTML = '<filter id="admin-image-posterize" color-interpolation-filters="sRGB">' +
            '<feComponentTransfer><feFuncR id="ais-poster-r" type="discrete"/>' +
            '<feFuncG id="ais-poster-g" type="discrete"/><feFuncB id="ais-poster-b" type="discrete"/>' +
            '</feComponentTransfer></filter>';
        document.body.append(vignette, grainLayer, ditherLayer, overlayCanvas, bloomCanvas, posterizeSvg);
        atualizarControles();
    }

    function formatarValor(chave, unidade) {
        if (chave === 'temperature') return (settings[chave] > 0 ? '+' : '') + settings[chave];
        if (chave === 'posterize' && settings[chave] === 16) return 'Desligada';
        return settings[chave] + unidade;
    }

    function atualizarValor(chave, unidade) {
        const output = document.getElementById('ais-value-' + chave);
        if (output) output.textContent = formatarValor(chave, unidade);
    }

    function atualizarControles() {
        controles.forEach(function (item) {
            const [chave, , , , , unidade] = item;
            const input = document.getElementById('ais-' + chave);
            if (input) input.value = settings[chave];
            atualizarValor(chave, unidade);
        });
    }

    function filtroImagem() {
        const temperature = settings.temperature;
        const parts = [
            'blur(' + settings.blur + 'px)',
            'contrast(' + settings.sharpness + '%)',
            'saturate(' + settings.saturation + '%)',
            'hue-rotate(' + settings.hue + 'deg)'
        ];
        if (temperature !== 0) {
            parts.push('sepia(' + Math.abs(temperature) + '%)');
            if (temperature < 0) parts.push('hue-rotate(180deg) saturate(85%)');
        }
        if (settings.posterize < 16) parts.push('url(#admin-image-posterize)');
        return parts.join(' ');
    }

    function atualizarPosterizacao() {
        const levels = Math.max(2, Math.min(16, Math.round(settings.posterize)));
        const tableValues = Array.from({ length: levels }, function (_, i) {
            return (i / (levels - 1)).toFixed(3);
        }).join(' ');
        ['r', 'g', 'b'].forEach(function (channel) {
            const fn = document.getElementById('ais-poster-' + channel);
            if (fn) fn.setAttribute('tableValues', tableValues);
        });
    }

    function atualizarCamadas() {
        const ativo = window.ehAdmin;
        const canvas = window.canvas || document.getElementById('jogoCanvas');
        if (!canvas) return;
        const pixelacao = ativo ? settings.pixelation : 0;
        const bloom = ativo ? settings.bloom : 0;
        canvas.style.filter = filtroImagem();
        canvas.style.visibility = pixelacao > 0 ? 'hidden' : '';
        if (overlayCanvas) overlayCanvas.style.display = pixelacao > 0 ? 'block' : 'none';
        if (bloomCanvas) bloomCanvas.style.display = bloom > 0 ? 'block' : 'none';
        if (vignette) {
            vignette.style.display = ativo && settings.vignette > 0 ? 'block' : 'none';
            vignette.style.background = 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,' +
                Math.min(0.9, settings.vignette / 100) + ') 100%)';
        }
        if (grainLayer) {
            grainLayer.style.display = ativo && settings.grain > 0 ? 'block' : 'none';
            grainLayer.style.opacity = String(settings.grain / 100);
            grainLayer.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 180 180%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.45%27/%3E%3C/svg%3E")';
        }
        if (ditherLayer) {
            ditherLayer.style.display = ativo && settings.dithering > 0 ? 'block' : 'none';
            ditherLayer.style.opacity = String(settings.dithering / 100);
            ditherLayer.style.backgroundImage =
                'repeating-conic-gradient(rgba(0,0,0,.45) 0% 25%, transparent 0% 50%)';
            ditherLayer.style.backgroundSize = '3px 3px';
        }
        if (bloomCanvas) bloomCanvas.style.filter = 'blur(' + (1 + bloom / 12) + 'px) brightness(1.8)';
        if (overlayCanvas) overlayCanvas.style.filter = filtroImagem();
        if (bloomCanvas) bloomCanvas.style.opacity = String(bloom / 100);
        atualizarPosterizacao();
        atualizarLoopCamadas();
    }

    function atualizarLoopCamadas() {
        const deveRodar = window.ehAdmin && (settings.pixelation > 0 || settings.bloom > 0);
        if (deveRodar && !overlayTimer) overlayTimer = window.setInterval(desenharCamadas, 50);
        if (!deveRodar && overlayTimer) {
            window.clearInterval(overlayTimer);
            overlayTimer = 0;
            if (overlayCanvas) overlayCanvas.getContext('2d').clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            if (bloomCanvas) bloomCanvas.getContext('2d').clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
        }
    }

    function dimensionar(canvas) {
        const source = window.canvas || document.getElementById('jogoCanvas');
        if (!source || !canvas) return null;
        if (canvas.width !== source.width || canvas.height !== source.height) {
            canvas.width = source.width;
            canvas.height = source.height;
        }
        return source;
    }

    function desenharCamadas() {
        if (!window.ehAdmin) {
            aplicar();
            return;
        }
        const source = dimensionar(overlayCanvas);
        dimensionar(bloomCanvas);
        if (!source) return;

        if (settings.pixelation > 0) {
            const ctx = overlayCanvas.getContext('2d');
            const scale = Math.max(0.08, 1 - settings.pixelation / 110);
            const width = Math.max(1, Math.round(source.width * scale));
            const height = Math.max(1, Math.round(source.height * scale));
            const scratch = overlayCanvas._scratch || (overlayCanvas._scratch = document.createElement('canvas'));
            if (scratch.width !== width || scratch.height !== height) {
                scratch.width = width;
                scratch.height = height;
            }
            const small = scratch.getContext('2d');
            small.imageSmoothingEnabled = false;
            small.drawImage(source, 0, 0, width, height);
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(scratch, 0, 0, overlayCanvas.width, overlayCanvas.height);
        }

        if (settings.bloom > 0) {
            const ctx = bloomCanvas.getContext('2d');
            ctx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
            ctx.globalCompositeOperation = 'screen';
            ctx.filter = 'blur(' + (1 + settings.bloom / 12) + 'px) brightness(1.8)';
            ctx.drawImage(source, 0, 0, bloomCanvas.width, bloomCanvas.height);
            ctx.filter = 'none';
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    function aplicar() {
        if (!window.ehAdmin) {
            atualizarCamadas();
            return;
        }
        atualizarCamadas();
    }

    function fechar() {
        if (painel) painel.style.display = 'none';
    }

    window.toggleAdminImageSettings = function () {
        if (!window.ehAdmin) return;
        criarPainel();
        const abrir = painel.style.display !== 'flex';
        painel.style.display = abrir ? 'flex' : 'none';
        if (abrir) {
            atualizarControles();
            aplicar();
        }
    };

    window.mostrarBotaoAdminImageSettings = function () {
        if (!window.ehAdmin) return;
        const button = document.getElementById('btn-admin-image-settings');
        if (button) button.style.setProperty('display', 'flex', 'important');
        if (!adminPreviewAtivo) {
            adminPreviewAtivo = true;
            aplicar();
        }
    };

    window.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && painel && painel.style.display === 'flex') fechar();
    });

    window.setInterval(function () {
        if (window.ehAdmin) {
            window.mostrarBotaoAdminImageSettings();
            return;
        }
        const button = document.getElementById('btn-admin-image-settings');
        if (button) button.style.display = 'none';
        if (painel) fechar();
        if (overlayTimer) {
            window.clearInterval(overlayTimer);
            overlayTimer = 0;
        }
        atualizarCamadas();
        adminPreviewAtivo = false;
        [overlayCanvas, bloomCanvas, vignette, grainLayer, ditherLayer].forEach(function (layer) {
            if (layer) layer.style.display = 'none';
        });
    }, 500);
})();
