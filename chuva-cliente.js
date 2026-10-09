(function (global) {
    'use strict';

    function criarRenderizadorChuva(randomFn) {
        const random = typeof randomFn === 'function' ? randomFn : Math.random;
        let gotas = [];
        let larguraAnterior = 0;
        let alturaAnterior = 0;
        let intensidadeAnterior = '';
        let ultimoTempo = null;
        let tempoSimulado = 0;
        let respingos = [];

        function obterConfiguracaoIntensidade(intensidade) {
            if (intensidade === 'media') return { densidade: 1.3, velocidade: 1 };
            if (intensidade === 'tempestade') return { densidade: 1.6, velocidade: 1.6 };
            return { densidade: 1, velocidade: 1 };
        }

        function obterLimitesMundo(largura, altura, camera) {
            const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
            const inclinacaoY = Number.isFinite(camera.inclinacaoY) && camera.inclinacaoY > 0 ? camera.inclinacaoY : 1;
            const mundoLargura = largura / zoom;
            const mundoAltura = altura / (zoom * inclinacaoY);
            const margemX = mundoLargura * 0.35;
            const margemY = mundoAltura * 0.35;
            return {
                minX: camera.x - margemX,
                maxX: camera.x + mundoLargura + margemX,
                minY: camera.y - margemY,
                maxY: camera.y + mundoAltura + margemY,
                zoom: zoom,
                inclinacaoY: inclinacaoY
            };
        }

        function prepararTrajetoria(gota, limites) {
            gota.inicioX = gota.x - gota.deriva * gota.duracao / 1000;
            gota.inicioY = gota.y - 150 / (limites.zoom * limites.inclinacaoY);
        }

        function criarGota(limites, indice, quantidade, colunas) {
            const linhas = Math.ceil(quantidade / colunas);
            const largura = limites.maxX - limites.minX;
            const altura = limites.maxY - limites.minY;
            const coluna = indice % colunas;
            const linha = Math.floor(indice / colunas);
            const duracao = 420 + random() * 300;
            const gota = {
                x: limites.minX + (coluna + 0.2 + random() * 0.6) * largura / colunas,
                y: limites.minY + (linha + 0.2 + random() * 0.6) * altura / linhas,
                inicioX: 0,
                inicioY: 0,
                duracao: duracao,
                decorrido: random() * duracao,
                deriva: 20 + random() * 26
            };
            prepararTrajetoria(gota, limites);
            return gota;
        }

        function inicializarGotas(largura, altura, limites, intensidade) {
            const configuracao = obterConfiguracaoIntensidade(intensidade);
            const quantidade = Math.min(220, Math.max(45, Math.floor(largura * altura / 9000 * configuracao.densidade)));
            const mundoLargura = limites.maxX - limites.minX;
            const mundoAltura = limites.maxY - limites.minY;
            const colunas = Math.max(1, Math.ceil(Math.sqrt(quantidade * mundoLargura / mundoAltura)));
            gotas = Array.from({ length: quantidade }, function (_, indice) {
                return criarGota(limites, indice, quantidade, colunas);
            });
            larguraAnterior = largura;
            alturaAnterior = altura;
            intensidadeAnterior = intensidade;
        }

        function desenhar(ctx, ativo, agora, camera, intensidade) {
            const tempo = Number.isFinite(agora) ? agora : Date.now();
            controladorAudioChuva.atualizar(ativo, tempo);
            if (!ativo || !ctx || !ctx.canvas || typeof ctx.beginPath !== 'function') {
                ultimoTempo = null;
                respingos = [];
                return;
            }
            const intensidadeAtual = intensidade === 'media' || intensidade === 'tempestade' ? intensidade : 'fraca';
            const largura = ctx.canvas.width;
            const altura = ctx.canvas.height;
            if (!(largura > 0 && altura > 0)) return;
            const cameraAtual = camera || {};
            const cameraMundo = {
                x: Number.isFinite(cameraAtual.x) ? cameraAtual.x : 0,
                y: Number.isFinite(cameraAtual.y) ? cameraAtual.y : 0,
                zoom: cameraAtual.zoom,
                inclinacaoY: cameraAtual.inclinacaoY
            };
            const limites = obterLimitesMundo(largura, altura, cameraMundo);
            if (largura !== larguraAnterior || altura !== alturaAnterior || intensidadeAtual !== intensidadeAnterior || !gotas.length) {
                inicializarGotas(largura, altura, limites, intensidadeAtual);
            }

            const delta = ultimoTempo === null ? 0 : Math.min(0.05, Math.max(0, (tempo - ultimoTempo) / 1000));
            const configuracao = obterConfiguracaoIntensidade(intensidadeAtual);
            ultimoTempo = tempo;
            tempoSimulado += delta * 1000;

            ctx.save();
            const zoom = limites.zoom;
            const inclinacaoY = limites.inclinacaoY;
            const shakeX = Number.isFinite(cameraAtual.shakeX) ? cameraAtual.shakeX : 0;
            const shakeY = Number.isFinite(cameraAtual.shakeY) ? cameraAtual.shakeY : 0;
            ctx.setTransform(
                zoom, 0, 0, zoom * inclinacaoY,
                (-cameraMundo.x + shakeX) * zoom,
                (-cameraMundo.y + shakeY) * zoom * inclinacaoY
            );
            ctx.beginPath();
            for (const gota of gotas) {
                gota.decorrido += delta * 1000 * configuracao.velocidade;
                if (gota.decorrido >= gota.duracao) {
                    respingos.push({
                        x: gota.x,
                        y: gota.y,
                        inicio: tempoSimulado,
                        escala: 0.7 + random() * 0.6
                    });
                    if (respingos.length > 80) respingos.splice(0, respingos.length - 80);
                    const alturaFaixa = limites.maxY - limites.minY;
                    const larguraFaixa = limites.maxX - limites.minX;
                    gota.x = limites.minX + random() * larguraFaixa;
                    gota.y = limites.minY + random() * alturaFaixa;
                    gota.duracao = 420 + random() * 300;
                    gota.decorrido = 0;
                    prepararTrajetoria(gota, limites);
                    continue;
                }
                const progresso = Math.min(1, gota.decorrido / gota.duracao);
                const x = gota.inicioX + (gota.x - gota.inicioX) * progresso;
                const y = gota.inicioY + (gota.y - gota.inicioY) * progresso;
                if (progresso < 1) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - 4, y - 12);
                }
            }
            ctx.strokeStyle = 'rgba(185, 218, 255, 0.48)';
            ctx.lineWidth = 1.2;
            ctx.lineCap = 'round';
            ctx.stroke();

            respingos = respingos.filter(function (respingosAtivo) {
                return tempoSimulado - respingosAtivo.inicio < 220;
            });
            if (respingos.length) {
                const caminhosRespingos = [[], [], [], []];
                for (const respingo of respingos) {
                    const idade = tempoSimulado - respingo.inicio;
                    const progresso = Math.max(0, Math.min(1, idade / 220));
                    const escala = respingo.escala;
                    const raio = (2 + progresso * 5) * escala;
                    const lote = caminhosRespingos[Math.min(3, Math.floor(progresso * 4))];
                    lote.push(
                        [respingo.x - raio, respingo.y, respingo.x + raio, respingo.y],
                        [respingo.x, respingo.y - raio * 0.45, respingo.x, respingo.y + raio * 0.45],
                        [respingo.x - raio * 0.58, respingo.y - raio * 0.58, respingo.x + raio * 0.58, respingo.y + raio * 0.58],
                        [respingo.x + raio * 0.58, respingo.y - raio * 0.58, respingo.x - raio * 0.58, respingo.y + raio * 0.58]
                    );
                }
                ctx.strokeStyle = 'rgba(205, 235, 255, 0.8)';
                ctx.lineWidth = 1;
                for (let i = 0; i < caminhosRespingos.length; i++) {
                    const lote = caminhosRespingos[i];
                    if (!lote.length) continue;
                    ctx.beginPath();
                    for (const segmento of lote) {
                        ctx.moveTo(segmento[0], segmento[1]);
                        ctx.lineTo(segmento[2], segmento[3]);
                    }
                    ctx.globalAlpha = 1 - (i + 0.5) / caminhosRespingos.length;
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
            ctx.restore();
        }

        return desenhar;
    }

    function criarControladorAudioChuva(AudioCtor, volumeMaximo, aoFalhar) {
        const AudioType = AudioCtor;
        const obterVolume = typeof volumeMaximo === 'function' ? volumeMaximo : function () { return 0.55; };
        const reportarFalha = typeof aoFalhar === 'function' ? aoFalhar : function (erro) {
            console.warn('Não foi possível reproduzir o áudio da chuva:', erro);
        };
        let audio = null;
        let volume = 0;
        let volumeTransicaoInicio = 0;
        let volumeTransicaoAlvo = null;
        let tempoInicioTransicao = 0;
        let ativoAtual = false;
        let reproducaoBloqueada = false;

        function iniciarAudio() {
            if (audio || typeof AudioType !== 'function') return;
            audio = new AudioType('Sonoro/SOM%20GERAL/chuva/chuva.mp3');
            audio.loop = true;
            audio.preload = 'auto';
            audio.volume = 0;
        }

        function atualizar(ativa, agora) {
            if (ativa) iniciarAudio();
            ativoAtual = ativa;
            const tempo = Number.isFinite(agora) ? agora : Date.now();
            if (!audio) return;

            if (ativa && audio.paused && !reproducaoBloqueada) {
                const resultado = audio.play();
                if (resultado && typeof resultado.catch === 'function') {
                    resultado.catch(function (erro) {
                        reproducaoBloqueada = true;
                        reportarFalha(erro);
                    });
                }
            }

            const volumeConfigurado = Number(obterVolume());
            const volumeAlvo = ativa && Number.isFinite(volumeConfigurado)
                ? Math.max(0, Math.min(1, volumeConfigurado))
                : 0;
            if (volumeAlvo !== volumeTransicaoAlvo) {
                volumeTransicaoInicio = volume;
                volumeTransicaoAlvo = volumeAlvo;
                tempoInicioTransicao = tempo;
            }
            const progresso = Math.max(0, Math.min(1, (tempo - tempoInicioTransicao) / 1200));
            volume = volumeTransicaoInicio + (volumeTransicaoAlvo - volumeTransicaoInicio) * progresso;
            audio.volume = volume;

            if (!ativa && progresso === 1 && volume === 0 && !audio.paused) audio.pause();
        }

        function desbloquear() {
            if (!ativoAtual || !audio || !audio.paused) return;
            reproducaoBloqueada = false;
            atualizar(true, Date.now());
        }

        return { atualizar: atualizar, desbloquear: desbloquear };
    }

    function criarEfeitoTrovao(randomFn, aoCairRaio) {
        const random = typeof randomFn === 'function' ? randomFn : Math.random;
        const notificarRaio = typeof aoCairRaio === 'function' ? aoCairRaio : function () {};
        let proximoTrovaoEm = null;
        let clarãoIniciadoEm = null;
        let caminhosRelampago = [];
        let raioPendente = false;

        function criarCaminhosRelampago(largura, altura) {
            const xInicial = random() * largura;
            let x = xInicial;
            let y = -12;
            const segmentos = [];
            const quantidade = 7 + Math.floor(random() * 5);
            for (let i = 0; i < quantidade; i++) {
                const proximoX = x + (random() - 0.5) * largura * 0.12;
                const proximoY = (i + 1) * (altura * 0.78 / quantidade);
                segmentos.push([x, y, proximoX, proximoY]);
                if (i > 1 && random() < 0.28) {
                    const lado = random() < 0.5 ? -1 : 1;
                    segmentos.push([
                        proximoX,
                        proximoY,
                        proximoX + lado * (18 + random() * 42),
                        proximoY + 12 + random() * 30
                    ]);
                }
                x = proximoX;
                y = proximoY;
            }
            caminhosRelampago = segmentos;
            return xInicial;
        }

        function obterIntensidade(tempo) {
            if (clarãoIniciadoEm === null) return 0;
            const idade = tempo - clarãoIniciadoEm;
            if (idade < 0 || idade >= 420) return 0;
            if (idade < 55) return 0.94;
            if (idade < 105) return 0.16;
            if (idade < 170) return 0.72;
            if (idade < 230) return 0.08;
            if (idade < 280) return 0.38;
            return 0.12 * (1 - (idade - 280) / 140);
        }

        function atualizar(noite, chuvaAtiva, agora) {
            if (!noite || !chuvaAtiva) {
                proximoTrovaoEm = null;
                clarãoIniciadoEm = null;
                caminhosRelampago = [];
                raioPendente = false;
                return 0;
            }
            const tempo = Number.isFinite(agora) ? agora : Date.now();

            if (proximoTrovaoEm === null && clarãoIniciadoEm === null) {
                proximoTrovaoEm = tempo + 12000 + random() * 18000;
            }
            if (clarãoIniciadoEm === null && tempo >= proximoTrovaoEm) {
                clarãoIniciadoEm = tempo;
                proximoTrovaoEm = null;
                raioPendente = true;
            }
            if (clarãoIniciadoEm === null) return 0;

            const idade = tempo - clarãoIniciadoEm;
            if (idade >= 420) {
                clarãoIniciadoEm = null;
                caminhosRelampago = [];
                proximoTrovaoEm = tempo + 14000 + random() * 24000;
            }
            return obterIntensidade(tempo);
        }

        function desenhar(ctx, agora) {
            if (!ctx || !ctx.canvas || typeof ctx.beginPath !== 'function') return;
            const intensidade = obterIntensidade(Number.isFinite(agora) ? agora : Date.now());
            if (intensidade < 0.2) return;
            const largura = ctx.canvas.width;
            const altura = ctx.canvas.height;
            if (!(largura > 0 && altura > 0)) return;
            if (!caminhosRelampago.length) {
                const xRaio = criarCaminhosRelampago(largura, altura);
                if (raioPendente) {
                    notificarRaio(Math.abs(xRaio - largura / 2) <= largura * 0.18);
                    raioPendente = false;
                }
            }
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = Math.min(1, intensidade);
            ctx.beginPath();
            for (const segmento of caminhosRelampago) {
                ctx.moveTo(segmento[0], segmento[1]);
                ctx.lineTo(segmento[2], segmento[3]);
            }
            ctx.strokeStyle = 'rgba(245, 250, 255, 0.98)';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#d8eaff';
            ctx.shadowBlur = 24;
            ctx.stroke();
            ctx.restore();
        }

        return { atualizar: atualizar, desenhar: desenhar };
    }

    const controladorAudioChuva = criarControladorAudioChuva(
        global.Audio,
        function () {
            const volumeGeral = Number(global.volumeGeral);
            return (Number.isFinite(volumeGeral) ? Math.max(0, Math.min(1, volumeGeral)) : 0.8) * 0.55;
        }
    );
    if (typeof global.addEventListener === 'function') {
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (evento) {
            global.addEventListener(evento, function () {
                controladorAudioChuva.desbloquear();
            }, { passive: true });
        });
    }
    function tocarSomTrovao(perto) {
        if (typeof global.Audio !== 'function') return;
        const volumeGeral = Number(global.volumeGeral);
        const volumeBase = Number.isFinite(volumeGeral) ? Math.max(0, Math.min(1, volumeGeral)) : 0.8;
        const audioTrovao = new global.Audio(perto
            ? 'Sonoro/SOM%20GERAL/chuva/trovao-forte.mp3'
            : 'Sonoro/SOM%20GERAL/chuva/trovao-fraco.mp3');
        audioTrovao.volume = volumeBase * (perto ? 0.85 : 0.5);
        const resultado = audioTrovao.play();
        if (resultado && typeof resultado.catch === 'function') {
            resultado.catch(function (erro) {
                console.warn('Não foi possível reproduzir o áudio do trovão:', erro);
            });
        }
    }

    const desenhador = criarRenderizadorChuva();
    global.desenharChuva = function (ctx, ativa, agora, camera, intensidade) {
        desenhador(ctx, ativa, agora, camera, intensidade);
    };
    const desenhadorTrovao = criarEfeitoTrovao(undefined, tocarSomTrovao);
    global.atualizarTrovao = function (noite, chuvaAtiva) {
        global.trovaoIntensidade = desenhadorTrovao.atualizar(noite, chuvaAtiva);
        return global.trovaoIntensidade;
    };
    global.desenharTrovao = function (ctx) {
        desenhadorTrovao.desenhar(ctx);
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            criarRenderizadorChuva: criarRenderizadorChuva,
            criarEfeitoTrovao: criarEfeitoTrovao,
            criarControladorAudioChuva: criarControladorAudioChuva
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
