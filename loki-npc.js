(function (global) {
    'use strict';

    var HEIGHT = 56;
    var DEFAULT_HAMMER = 'custom/tool_hammer/down';
    var DEFAULT_IDLE = 'standard/idle/down';
    var animations = new Map();

    function loadAnimation(id, count, spriteDir) {
        var root = spriteDir === 'npc-potion' ? 'npc-potion' : 'ferreiro';
        var cacheKey = root + ':' + id;
        var cached = animations.get(cacheKey);
        if (cached) return cached;
        var frames = [];
        animations.set(cacheKey, frames);
        if (!/^(standard|custom)\/[a-z0-9_-]+\/(down|left|right|up)$/i.test(id) ||
            !Number.isInteger(count) || count < 1 || count > 32) return frames;
        for (var i = 1; i <= count; i++) {
            var image = new Image();
            image.onload = function () {
                var canvas = document.createElement('canvas');
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                var context = canvas.getContext('2d', { willReadFrequently: true });
                context.drawImage(this, 0, 0);
                var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
                var left = canvas.width, top = canvas.height, right = -1, bottom = -1;
                for (var y = 0; y < canvas.height; y++) {
                    for (var x = 0; x < canvas.width; x++) {
                        if (pixels[(y * canvas.width + x) * 4 + 3] === 0) continue;
                        if (x < left) left = x;
                        if (x > right) right = x;
                        if (y < top) top = y;
                        if (y > bottom) bottom = y;
                    }
                }
                if (right >= left && bottom >= top) {
                    this.spriteBounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
                }
            };
            image.onerror = function () {
                console.error('Não foi possível carregar um quadro da animação do NPC:', this.src);
            };
            image.src = 'sprites/NPC/' + root + '/' + id + '/' + i + '.png';
            frames.push(image);
        }
        return frames;
    }

    function frameFor(id, count, timeMs, durationMs, loop, spriteDir) {
        var frames = loadAnimation(id, count, spriteDir);
        if (!frames.length) return null;
        var frameIndex = loop === false
            ? Math.floor(Math.min(Math.max(0, timeMs), durationMs - 1) / (durationMs / frames.length))
            : Math.floor((((timeMs % durationMs) + durationMs) % durationMs) / (durationMs / frames.length));
        return frames[Math.min(frames.length - 1, frameIndex)];
    }

    function drawFrame(ctx, image, x, y, height) {
        if (!image || !image.complete || !image.naturalWidth || !image.spriteBounds) return;
        var bounds = image.spriteBounds;
        var drawHeight = height || HEIGHT;
        var width = drawHeight * bounds.width / bounds.height;
        ctx.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height,
            x - width / 2, y - drawHeight, width, drawHeight);
    }

    function duracaoQuadro(fps) {
        return 1000 / Math.max(1, Math.min(30, Number(fps) || 10));
    }

    function desenhar(ctx, npc, timeMs) {
        if (!ctx || !npc || !npc.spriteDir) return;
        var spriteDir = npc.spriteDir;
        var frameMs = duracaoQuadro(npc.velocidadeFrames);
        var image = null;
        if (npc.movendo) {
            var walkAnimation = 'standard/walk/' + (npc.direcao || 'down');
            var walkFrames = npc.walkQuadros || 8;
            image = frameFor(walkAnimation, walkFrames, timeMs, walkFrames * frameMs, true, spriteDir);
        } else if (npc.animacaoAtual) {
            var actionFrames = npc.animacaoAtualQuadros || 2;
            var actionElapsed = Math.max(0, timeMs - (npc.animacaoInicioEm || timeMs));
            image = frameFor(npc.animacaoAtual, actionFrames, actionElapsed,
                actionFrames * frameMs, npc.animacaoLoop !== false, spriteDir);
        } else if (npc.animacao === DEFAULT_HAMMER) {
            var hammerDuration = (npc.quadros || 9) * frameMs;
            var idleDuration = 2 * frameMs;
            var cycleMs = hammerDuration + idleDuration;
            var cycle = ((timeMs % cycleMs) + cycleMs) % cycleMs;
            image = cycle < hammerDuration
                ? frameFor(DEFAULT_HAMMER, npc.quadros || 9, cycle, hammerDuration, true, spriteDir)
                : frameFor(DEFAULT_IDLE, 2, cycle - hammerDuration, idleDuration, true, spriteDir);
        } else {
            image = frameFor(npc.animacao || DEFAULT_IDLE, npc.quadros || 2,
                timeMs % 100000, (npc.quadros || 2) * frameMs, true, spriteDir);
        }

        ctx.save();
        drawFrame(ctx, image, npc.x, npc.y);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = "bold 16px 'Rajdhani', Arial, sans-serif";
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.strokeText(npc.nome || 'Loki', npc.x, npc.y - HEIGHT - 5);
        ctx.fillStyle = '#54e6ff';
        ctx.shadowColor = '#07131a';
        ctx.shadowBlur = 5;
        ctx.fillText(npc.nome || 'Loki', npc.x, npc.y - HEIGHT - 5);
        ctx.restore();
    }

    function desenharPrevia(ctx, id, count, timeMs, loop, fps, spriteDir) {
        if (!ctx || !id) return;
        var duration = count * duracaoQuadro(fps);
        var image = frameFor(id, count, timeMs, duration, loop, spriteDir);
        drawFrame(ctx, image, ctx.canvas.width / 2, ctx.canvas.height - 8, ctx.canvas.height - 16);
    }

    global.LokiNpcRenderer = { desenhar: desenhar, desenharPrevia: desenharPrevia };
})(window);
