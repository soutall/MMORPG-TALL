/**
 * skill_upgrade_tree.js — Sistema Universal de Árvores de Upgrades de Habilidades
 * Arquitetura modular e data-driven (isomórfica: Node.js + Navegador)
 *
 * Regras:
 * - Pontos: 1 ponto a cada 10 níveis (Nv 10 -> 1, Nv 20 -> 2, ..., Nv 100 -> 10 máx).
 * - Tiers: 4 tiers por habilidade (Tier 1 = Nv 10, Tier 2 = Nv 20, Tier 3 = Nv 30, Tier 4 = Nv 40).
 * - Escolha A/B por Tier (adquirir uma bloqueia a outra).
 * - Revelação Progressiva: Próximo Tier visível; Tiers futuros ocultos (Enigma).
 * - Totalmente independente do Nível da Skill (1/10).
 */
(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SkillUpgradeTree = factory();
    }
})(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    const MAX_UPGRADE_POINTS = 10;
    const MAX_TIERS_PER_SKILL = 4;
    const TIER_LEVEL_REQUIREMENTS = { 1: 10, 2: 20, 3: 30, 4: 40 };

    /**
     * Catálogo mestre de Árvores de Upgrades por Classe
     * Cada classe registra suas skills participantes e seus 4 Tiers com Ramos A e B
     */
    const SKILL_UPGRADE_TREES = {
        summoner: {
            esmagamento: {
                id: 'esmagamento',
                nome: 'Esmagamento Sísmico',
                icon: '💥',
                descBase: 'Comando o ogro a bater o chão, danificando e atordoando ao redor dele.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'fenda_persistente',
                            nome: 'Fenda Persistente',
                            categoria: 'Controle de Terreno',
                            icone: '🌋',
                            desc: 'Ao atingir o solo, o impacto abre uma fissura que perdura por 4 segundos. Inimigos que cruzarem ou permanecerem na fissura sofrem dano secundário periódico e lentidão.',
                            efeito: 'Fissura 4s no chão · Dano secundário periódico · Lentidão de 35% por 1.5s',
                            valores: {
                                duracaoFissuraMs: 4000,
                                duracaoFissuraTicks: 80,
                                slowPct: 0.35,
                                slowDuracaoMs: 1500,
                                slowDuracaoTicks: 30,
                                tickDanoIntervaloMs: 1000,
                                tickDanoMult: 0.20 // 20% do dano base da skill por segundo
                            }
                        },
                        B: {
                            id: 'impacto_duplo',
                            nome: 'Impacto Duplo',
                            categoria: 'Dano Concentrado',
                            icone: '💥',
                            desc: 'Após o golpe inicial, uma réplica subterrânea atrasada implode no epicentro do impacto, estraçalhando inimigos na área central.',
                            efeito: 'Impacto secundário após 0.6s · 60% do dano base no centro · Área concentrada (raio 60px)',
                            valores: {
                                delayMs: 600,
                                delayTicks: 12,
                                danoMult: 0.60,
                                raio: 60
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'colisao_tectonica',
                            nome: 'Colisão Tectônica',
                            categoria: 'Controle Espacial / Atração',
                            icone: '🧲',
                            desc: 'A fissura do Esmagamento passa a emitir pulsos magnéticos telúricos, puxando inimigos próximos continuamente para o centro do tremor.',
                            efeito: 'Puxão para o centro a cada 1s · Deslocamento de ~20px · Concentra inimigos',
                            valores: {
                                pulsoIntervaloMs: 1000,
                                pulsoIntervaloTicks: 20,
                                forcaPuxaoPx: 20,
                                raioPuxao: 130
                            }
                        },
                        B: {
                            id: 'fratura_exposta',
                            nome: 'Fratura Exposta',
                            categoria: 'Vulnerabilidade / Sinistralidade',
                            icone: '🦴',
                            desc: 'Inimigos atingidos pelo impacto ficam Fraturados, tendo sua carapaça rompida e sofrendo dano amplificado de todos os socos do Golem.',
                            efeito: 'Debuff Fraturado 4s · +15% dano recebido de ataques básicos do Golem · Renova ao acertar',
                            valores: {
                                debuffDuracaoMs: 4000,
                                debuffDuracaoTicks: 80,
                                bonusDanoBasicoGolemPct: 0.15
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'prisao_placas',
                            nome: 'Prisão de Placas',
                            categoria: 'Enraizamento Coletivo',
                            icone: '🧱',
                            desc: 'No instante em que a fissura se fecha, placas rochosas pontiagudas se erguem violentamente do solo, prendendo no lugar todos os inimigos na área.',
                            efeito: 'Ao término da fissura (4s) · Enraíza (Root) por 0.7s · Impede movimento',
                            valores: {
                                rootDuracaoMs: 700,
                                rootDuracaoTicks: 14,
                                raio: 100
                            }
                        },
                        B: {
                            id: 'fratura_defensiva',
                            nome: 'Fratura Defensiva',
                            categoria: 'Debuff de Armadura',
                            icone: '🛡️',
                            desc: 'O golpe quebra a guarda física dos inimigos atingidos, rasgando suas armaduras e reduzindo sua Defesa Física.',
                            efeito: 'Reduz Defesa Física em 12% por 4 segundos · Aplica a slimes e chefes',
                            valores: {
                                reducaoDefesaPct: 0.12,
                                duracaoMs: 4000,
                                duracaoTicks: 80
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'colapso_territorial',
                            nome: 'Colapso Territorial',
                            categoria: 'Cataclismo de Terreno',
                            icone: '🌀',
                            desc: 'A região do impacto permanece instável por 3 segundos: inimigos sofrem lentidão severa e tremores constantes. No último tremor, uma implosão arremessa todos para o centro.',
                            efeito: 'Zona instável 3s · Lentidão de 50% · Tremores periódicos · Implosão final com puxão forte',
                            valores: {
                                duracaoMs: 3000,
                                duracaoTicks: 60,
                                slowPct: 0.50,
                                tremorIntervaloTicks: 20,
                                implosaoPuxaoPx: 45
                            }
                        },
                        B: {
                            id: 'martelo_colosso',
                            nome: 'Martelo do Colosso',
                            categoria: 'Finalização Devastadora',
                            icone: '🔨',
                            desc: 'O Golem canaliza o tremor restante em seu braço: seu próximo soco contra um inimigo marcado pelo Esmagamento desfere uma pancada com dano massivo.',
                            efeito: 'Próximo ataque básico contra alvo atingido: +70% dano físico · 1x por conjuração',
                            valores: {
                                bonusDanoProximoAtaquePct: 0.70,
                                duracaoJanelaMs: 6000
                            }
                        }
                    }
                }
            },
            salto: {
                id: 'salto',
                nome: 'Salto do Ogro',
                icon: '🦘',
                descBase: 'O ogro salta em arco sobre o inimigo mais próximo, causando dano e atordoamento.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'marca_presa',
                            nome: 'Marca da Presa',
                            categoria: 'Caça / Perseguição',
                            icone: '🎯',
                            desc: 'Ao aterrissar, o Golem crava a Marca da Presa sobre o alvo principal. O Golem ignora distrações e persegue ferozmente a presa com velocidade ampliada.',
                            efeito: 'Marca por 6s · Foco prioritário travado · Golem ganha +15% velocidade de movimento em direção ao alvo',
                            valores: {
                                duracaoMs: 6000,
                                duracaoTicks: 120,
                                bonusVelMovimentoPct: 0.15
                            }
                        },
                        B: {
                            id: 'cratera',
                            nome: 'Cratera',
                            categoria: 'Área de Impacto',
                            icone: '🕳️',
                            desc: 'O peso colossal do salto afunda o solo, criando uma cratera esmagada por 3 segundos que dificulta os passos dos inimigos.',
                            efeito: 'Cratera por 3s · Lentidão de 30% para inimigos dentro da área',
                            valores: {
                                duracaoMs: 3000,
                                duracaoTicks: 60,
                                slowPct: 0.30,
                                raio: 80
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'cacada_voraz',
                            nome: 'Caçada Voraz',
                            categoria: 'Frenesi Ofensivo',
                            icone: '🐺',
                            desc: 'Enquanto o alvo estiver marcado pela Presa, a fúria do Golem acelera seus punhos, golpeando com maior cadência e foco inabalável.',
                            efeito: '+10% velocidade de ataque do Golem contra o alvo marcado · Foco resistente a perda de agro',
                            valores: {
                                reducaoIntervaloAtaquePct: 0.10
                            }
                        },
                        B: {
                            id: 'onda_choque',
                            nome: 'Onda de Choque',
                            categoria: 'Expansão Radial',
                            icone: '🌊',
                            desc: '0.8s após a aterrissagem, a pressão comprimida no solo explode em uma onda de choque circular secundária, empurrando inimigos.',
                            efeito: 'Onda 0.8s após o impacto · 40% do dano base da skill · Empurrão radial',
                            valores: {
                                delayMs: 800,
                                delayTicks: 16,
                                danoMult: 0.40,
                                empurraoPx: 35,
                                raio: 95
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'salto_recaca',
                            nome: 'Salto de Recaça',
                            categoria: 'Reengajamento Instantâneo',
                            icone: '⚡',
                            desc: 'Se a presa marcada tentar fugir a mais de 220px, o Golem executa um avanço sísmico automático em sua direção, fechando o cerco.',
                            efeito: 'Avanço automático ao se afastar >220px · 50% de dano base · Cooldown interno 4s · Sem custo de MP',
                            valores: {
                                distanciaGatilhoPx: 220,
                                danoMult: 0.50,
                                cooldownInternoMs: 4000,
                                cooldownInternoTicks: 80
                            }
                        },
                        B: {
                            id: 'rochas_ascendentes',
                            nome: 'Rochas Ascendentes',
                            categoria: 'Controle Aéreo / Knock-up',
                            icone: '⛰️',
                            desc: '1.2s após a queda, duas estalagmites rochosas gigantes brotam do solo abaixo dos inimigos, projetando-os para cima.',
                            efeito: 'Delay de 1.2s · Erupção de 2 rochas · Arremesso para cima / Stun aéreo de 0.6s',
                            valores: {
                                delayMs: 1200,
                                delayTicks: 24,
                                knockUpDuracaoMs: 600,
                                knockUpDuracaoTicks: 12,
                                raio: 75
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'presa_inescapavel',
                            nome: 'Presa Inescapável',
                            categoria: 'Aprisionamento Fatal',
                            icone: '⛓️',
                            desc: 'A marca aprisiona os movimentos da presa com raízes de pedra: o inimigo sofre lentidão severa adicional e tem dashes bloqueados.',
                            efeito: 'Lentidão adicional de 25% · Bloqueia habilidades de dash/mobilidade na presa',
                            valores: {
                                slowAdicionalPct: 0.25,
                                bloqueiaDash: true
                            }
                        },
                        B: {
                            id: 'queda_cataclisma',
                            nome: 'Queda Cataclímica',
                            categoria: 'Detonação Gigante',
                            icone: '🌋',
                            desc: '1.5s após pousar, o solo em colapso desmorona em uma detonação monumental de poeira e pedregulhos com grande alcance.',
                            efeito: 'Explosão após 1.5s · 100% do dano base da skill · Stun adicional de 0.8s · Raio expandido (110px)',
                            valores: {
                                delayMs: 1500,
                                delayTicks: 30,
                                danoMult: 1.00,
                                stunDuracaoMs: 800,
                                stunDuracaoTicks: 16,
                                raio: 110
                            }
                        }
                    }
                }
            },
            colossal: {
                id: 'colossal',
                nome: 'Golem Colossal',
                icon: '🗿',
                descBase: 'Amplifica o golem, aumentando tamanho, cura, dano e arremesso de pedras por 20s.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'carapaca_colossal',
                            nome: 'Carapaça Colossal',
                            categoria: 'Blindagem e Proteção Mútua',
                            icone: '🛡️',
                            desc: 'A couraça do Golem endurece como granito reforçado, reduzindo todo dano sofrido por ele e pela Invocadora quando próxima.',
                            efeito: 'Golem recebe 20% menos dano · Summoner próxima (<220px) recebe 8% menos dano',
                            valores: {
                                reducaoDanoPetPct: 0.20,
                                reducaoDanoSummonerPct: 0.08,
                                raioProximidadePx: 220
                            }
                        },
                        B: {
                            id: 'municao_incandescente',
                            nome: 'Munição Incandescente',
                            categoria: 'Dano Contínuo / Queimadura',
                            icone: '🔥',
                            desc: 'As pedras maciças arremessadas pelo Golem pegam fogo pelo atrito, incendiando os alvos atingidos em chamas ardentes.',
                            efeito: 'Pedras aplicam Queimadura (Burn) por 3s · Dano periódico de fogo a cada 1s',
                            valores: {
                                burnDuracaoMs: 3000,
                                burnDuracaoTicks: 60,
                                burnDanoPorSegundoMult: 0.25 // 25% do dano da pedra por segundo
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'guarda_invocadora',
                            nome: 'Guarda da Invocadora',
                            categoria: 'Transferência de Dano / Vínculo',
                            icone: '🤝',
                            desc: 'Um elo místico telúrico protege a Summoner: parte de todo golpe recebido por ela é transferido diretamente para o Golem.',
                            efeito: 'Transfere 25% do dano recebido pela Summoner ao Golem Colossal (raio de 220px)',
                            valores: {
                                transferenciaPct: 0.25,
                                raioMaximoPx: 220
                            }
                        },
                        B: {
                            id: 'municao_pesada',
                            nome: 'Munição Pesada',
                            categoria: 'Disparo Especial / Artilharia',
                            icone: '☄️',
                            desc: 'A cada 4 pedras lançadas, o Golem arremessa um monólito colossal com dano devastador e maior raio de explosão no impacto.',
                            efeito: 'A cada 4 pedras: 1 Rocha Pesada com 180% de dano e área de explosão +40%',
                            valores: {
                                pedrasGatilho: 4,
                                danoMult: 1.80,
                                raioBonusPct: 0.40
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'aura_bastiao',
                            nome: 'Aura do Bastião',
                            categoria: 'Controle de Presença Telúrica',
                            icone: '🛑',
                            desc: 'A presença do gigante impõe um campo de gravidade opressivo: inimigos ao redor dele perdem velocidade de ataque e marcha.',
                            efeito: 'Raio 140px ao redor do Golem · -20% velocidade de ataque e -15% velocidade de movimento aos inimigos',
                            valores: {
                                raioPx: 140,
                                reducaoAtkSpeedPct: 0.20,
                                reducaoMovSpeedPct: 0.15
                            }
                        },
                        B: {
                            id: 'bombardeio_estilhacos',
                            nome: 'Bombardeio de Estilhaços',
                            categoria: 'Fragmentação Balística',
                            icone: '💥',
                            desc: 'Ao atingir o alvo, a Rocha Pesada se despedaça violentamente em 3 estilhaços rochosos que atingem posições ao redor.',
                            efeito: 'Pedra Pesada gera 3 fragmentos · Cada fragmento causa 45% do dano da Pedra Pesada',
                            valores: {
                                fragmentosQtd: 3,
                                fragmentoDanoMult: 0.45,
                                raioEspalhamentoPx: 55
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'ultimo_bastiao',
                            nome: 'Último Bastião',
                            categoria: 'Sobrevivência Lendária',
                            icone: '✨',
                            desc: 'Uma vez por transformação, se o Golem sofrer dano fatal que o destruiria, sua alma de rocha se recusa a sucumbir.',
                            efeito: '1x por ativação: dano fatal deixa com 10% HP e concede 1.2s de invulnerabilidade total',
                            valores: {
                                hpRetidoPct: 0.10,
                                invulneravelDuracaoMs: 1200,
                                invulneravelDuracaoTicks: 24
                            }
                        },
                        B: {
                            id: 'chuva_cerco',
                            nome: 'Chuva de Cerco',
                            categoria: 'Bombardeio Contínuo',
                            icone: '🌩️',
                            desc: 'Nos últimos 6 segundos da forma Colossal, o gigante entra em fúria de artilharia, disparando pedras no dobro da velocidade e mirando até 3 alvos!',
                            efeito: 'Últimos 6s: intervalo cai de 1.0s para 0.5s · Dispara em até 3 alvos simultâneos',
                            valores: {
                                janelaFinalSegundos: 6,
                                intervaloPedrasMs: 500,
                                intervaloPedrasTicks: 10,
                                maxAlvosSimultaneos: 3
                            }
                        }
                    }
                }
            },
            sismico: {
                id: 'sismico',
                nome: 'Golem Sísmico',
                icon: '🗿⚡',
                descBase: 'Golem trava no solo liberando terremoto contínuo por 8s com pulsos acelerados e lentidão.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'campo_falha',
                            nome: 'Campo de Falha',
                            categoria: 'Contenção Perimetral',
                            icone: '⭕',
                            desc: 'Uma borda perimetral de rachaduras ativas cerca toda a área do terremoto. Inimigos que tentarem cruzar ou tocarem a borda são desacelerados.',
                            efeito: 'Borda delimitada ativa por 8s · Ao cruzar a borda: Lentidão de 40% por 1.5s',
                            valores: {
                                slowPct: 0.40,
                                slowDuracaoMs: 1500,
                                slowDuracaoTicks: 30,
                                raioBorda: 260
                            }
                        },
                        B: {
                            id: 'nucleo_instavel',
                            nome: 'Núcleo Instável',
                            categoria: 'Amplificação Progressiva',
                            icone: '📈',
                            desc: 'O núcleo do Golem sobrecarrega a cada batida: cada pulso consecutivo acumula energia tectônica, escalando o dano de toda a sequência.',
                            efeito: '+3% de dano a cada pulso consecutivo (limite máximo de +30%) · Reseta ao término',
                            valores: {
                                bonusPorPulsoPct: 0.03,
                                bonusMaximoPct: 0.30
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'prisao_tectonica',
                            nome: 'Prisão Tectônica',
                            categoria: 'Enraizamento Periódico',
                            icone: '⛓️',
                            desc: 'A cada ~2 segundos, as fendas abertas no solo engolem as pernas de até 2 inimigos dentro da área, enraizando-os.',
                            efeito: 'A cada 2s: até 2 inimigos na área sofrem Root de 0.6s · Alterna alvos prioritários',
                            valores: {
                                intervaloMs: 2000,
                                intervaloTicks: 40,
                                maxAlvos: 2,
                                rootDuracaoMs: 600,
                                rootDuracaoTicks: 12
                            }
                        },
                        B: {
                            id: 'chuva_meteoros',
                            nome: 'Chuva de Meteoros',
                            categoria: 'Bombardeio Orbital',
                            icone: '🌠',
                            desc: 'A cada 2 pulsos do terremoto, rochas incandescentes desprendem-se do céu e despencam diretamente sobre a posição de um inimigo.',
                            efeito: 'A cada 2 pulsos: 1 meteoro cai sobre um inimigo · 70% do dano do pulso atual (raio 45px)',
                            valores: {
                                pulsosGatilho: 2,
                                danoMult: 0.70,
                                raioImpactoPx: 45
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'anel_contencao',
                            nome: 'Anel de Contenção',
                            categoria: 'Barreira Gravitacional',
                            icone: '🧲',
                            desc: 'Inimigos tentando escapar da área sofrem uma força gravitacional centrípeta a cada 1.5s, sendo puxados de volta para o terremoto.',
                            efeito: 'A cada 1.5s: pequeno empurrão em direção ao centro para quem estiver na periferia',
                            valores: {
                                intervaloMs: 1500,
                                intervaloTicks: 30,
                                forcaPuxaoPx: 35,
                                raioMinimoGatilhoPx: 160
                            }
                        },
                        B: {
                            id: 'reacao_cadeia',
                            nome: 'Reação em Cadeia',
                            categoria: 'Sinergia de Fissura',
                            icone: '⚡',
                            desc: 'O impacto dos meteoros (Tier 2 B) racha o solo criando mini-fissuras de 3s. Se um pulso sísmico atingir a fissura, seu choque é amplificado!',
                            efeito: 'Meteoro gera fissura por 3s · Próximo pulso sísmico na fissura ganha +25% de dano bônus',
                            valores: {
                                duracaoFissuraMs: 3000,
                                duracaoFissuraTicks: 60,
                                bonusDanoPulsoPct: 0.25
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'dominio_placas',
                            nome: 'Domínio das Placas',
                            categoria: 'Supressão Total',
                            icone: '🛑',
                            desc: 'Nos últimos 2 segundos da habilidade, a pressão atinge o ápice: inimigos na área têm teleporte e dashes completamente bloqueados e são enraizados.',
                            efeito: 'Últimos 2s: bloqueia Dash e Teleporte · Aplica Root de 0.5s nos pulsos finais',
                            valores: {
                                janelaFinalSegundos: 2,
                                bloqueiaDash: true,
                                rootDuracaoMs: 500,
                                rootDuracaoTicks: 10
                            }
                        },
                        B: {
                            id: 'colapso_final',
                            nome: 'Colapso Final',
                            categoria: 'Grande Detonação',
                            icone: '🌋',
                            desc: 'Ao término dos 8 segundos, todas as fissuras e zonas residuais ativas detonam em uníssono em uma explosão sísmica avassaladora.',
                            efeito: 'Ao término da skill: detona todas as zonas ativas · 120% do último pulso por detonação · Limpa o terreno',
                            valores: {
                                danoMult: 1.20,
                                raioDetonacaoPx: 80
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     * Calcula quantos pontos de upgrade o personagem ganhou pelo seu nível.
     * Fórmula oficial: upgradePointsEarned = min(floor(level / 10), 10)
     */
    function calcularPontosUpgradeGanhos(level) {
        const lvl = Math.max(1, Number(level) || 1);
        return Math.min(Math.floor(lvl / 10), MAX_UPGRADE_POINTS);
    }

    /**
     * Conta quantos pontos já foram investidos pelo jogador em todas as skills.
     */
    function calcularPontosUpgradeGastos(skillUpgrades) {
        if (!skillUpgrades || typeof skillUpgrades !== 'object') return 0;
        let gastos = 0;
        for (const skillId of Object.keys(skillUpgrades)) {
            const data = skillUpgrades[skillId];
            if (data && typeof data === 'object') {
                if (Array.isArray(data.choices)) {
                    gastos += data.choices.length;
                } else if (typeof data.purchased === 'number') {
                    gastos += data.purchased;
                }
            }
        }
        return gastos;
    }

    /**
     * Retorna quantos pontos de upgrade estão atualmente disponíveis para gastar.
     */
    function calcularPontosUpgradeDisponiveis(level, skillUpgrades) {
        const ganhos = calcularPontosUpgradeGanhos(level);
        const gastos = calcularPontosUpgradeGastos(skillUpgrades);
        return Math.max(0, ganhos - gastos);
    }

    /**
     * Normaliza a estrutura de skillUpgrades garantindo formato seguro
     */
    function normalizarSkillUpgrades(skillUpgrades) {
        if (!skillUpgrades || typeof skillUpgrades !== 'object') return {};
        const norm = {};
        for (const k of Object.keys(skillUpgrades)) {
            const v = skillUpgrades[k];
            if (!v || typeof v !== 'object') continue;
            const choices = Array.isArray(v.choices) ? v.choices.map(c => String(c).toUpperCase()) : [];
            norm[k] = {
                purchased: choices.length,
                choices: choices
            };
        }
        return norm;
    }

    /**
     * Verifica se o personagem possui um upgrade específico (ex: skill 'esmagamento', tier 1, branch 'A')
     */
    function temUpgrade(skillUpgrades, skillId, tier, branch) {
        if (!skillUpgrades || !skillUpgrades[skillId]) return false;
        const info = skillUpgrades[skillId];
        const tierIdx = Number(tier) - 1;
        if (!Array.isArray(info.choices) || tierIdx < 0 || tierIdx >= info.choices.length) return false;
        const escolha = info.choices[tierIdx];
        if (branch) {
            return String(escolha).toUpperCase() === String(branch).toUpperCase();
        }
        return !!escolha;
    }

    /**
     * Retorna a escolha feita em um Tier ('A', 'B' ou null)
     */
    function obterEscolhaTier(skillUpgrades, skillId, tier) {
        if (!skillUpgrades || !skillUpgrades[skillId]) return null;
        const info = skillUpgrades[skillId];
        const tierIdx = Number(tier) - 1;
        if (!Array.isArray(info.choices) || tierIdx < 0 || tierIdx >= info.choices.length) return null;
        return info.choices[tierIdx] || null;
    }

    /**
     * Valida compra de upgrade no Servidor (Server-Authoritative).
     * Suporta (classe, skillId, tier, branch, level, skillUpgrades) ou (classe, level, skillUpgrades, skillId, tier, branch)
     * Retorna { valido: true, upgrade: ... } ou { valido: false, erro: '...', motivo: '...' }
     */
    function validarCompraUpgrade(classe, arg2, arg3, arg4, arg5, arg6) {
        let skillId, tier, branch, level, skillUpgrades;

        if (typeof arg2 === 'string' && (typeof arg3 === 'number' || typeof arg3 === 'string')) {
            // Ordem: (classe, skillId, tier, branch, level, skillUpgrades)
            skillId = arg2;
            tier = arg3;
            branch = arg4;
            level = arg5;
            skillUpgrades = arg6;
        } else {
            // Ordem: (classe, level, skillUpgrades, skillId, tier, branch)
            level = arg2;
            skillUpgrades = arg3;
            skillId = arg4;
            tier = arg5;
            branch = arg6;
        }

        const arvoreClasse = SKILL_UPGRADE_TREES[classe];
        if (!arvoreClasse) {
            const m = 'Árvore de upgrades ainda não disponível para a classe ' + classe;
            return { valido: false, erro: m, motivo: m };
        }

        const skillTree = arvoreClasse[skillId];
        if (!skillTree) {
            const m = 'Skill não possui árvore de upgrades nesta versão';
            return { valido: false, erro: m, motivo: m };
        }

        const tierNum = Number(tier);
        if (isNaN(tierNum) || tierNum < 1 || tierNum > MAX_TIERS_PER_SKILL) {
            const m = 'Tier inválido (deve ser entre 1 e 4)';
            return { valido: false, erro: m, motivo: m };
        }

        const branchUpper = String(branch || '').toUpperCase().trim();
        if (branchUpper !== 'A' && branchUpper !== 'B') {
            const m = 'Opção de ramo inválida (escolha A ou B)';
            return { valido: false, erro: m, motivo: m };
        }

        const norm = normalizarSkillUpgrades(skillUpgrades);
        const skillData = norm[skillId] || { purchased: 0, choices: [] };

        if (skillData.purchased >= tierNum) {
            const m = 'Tier ' + tierNum + ' já foi adquirido';
            return { valido: false, erro: m, motivo: m };
        }

        if (skillData.purchased !== tierNum - 1) {
            const m = 'Deve adquirir o Tier ' + (tierNum - 1) + ' primeiro';
            return { valido: false, erro: m, motivo: m };
        }

        const lvlChar = Math.max(1, Number(level) || 1);
        const reqLvl = TIER_LEVEL_REQUIREMENTS[tierNum] || (tierNum * 10);
        if (lvlChar < reqLvl) {
            const m = 'Nível insuficiente! Requer nível ' + reqLvl + ' (você está no nível ' + lvlChar + ')';
            return { valido: false, erro: m, motivo: m };
        }

        const pontosDisponiveis = calcularPontosUpgradeDisponiveis(lvlChar, norm);
        if (pontosDisponiveis <= 0) {
            const m = 'Sem pontos de upgrade disponíveis';
            return { valido: false, erro: m, motivo: m };
        }

        const upgradeDef = skillTree.tiers[tierNum] && skillTree.tiers[tierNum][branchUpper];

        return {
            valido: true,
            tier: tierNum,
            branch: branchUpper,
            skillTree: skillTree,
            upgrade: upgradeDef
        };
    }

    /**
     * Aplica a compra de um upgrade retornando a estrutura atualizada
     */
    function aplicarCompraUpgrade(skillUpgrades, skillId, tier, branch) {
        if (!skillUpgrades || typeof skillUpgrades !== 'object') skillUpgrades = {};
        if (!skillUpgrades[skillId] || typeof skillUpgrades[skillId] !== 'object') {
            skillUpgrades[skillId] = { purchased: 0, choices: [] };
        }
        if (!Array.isArray(skillUpgrades[skillId].choices)) {
            skillUpgrades[skillId].choices = [];
        }
        const tierIdx = Number(tier) - 1;
        skillUpgrades[skillId].choices[tierIdx] = String(branch).toUpperCase();
        skillUpgrades[skillId].purchased = skillUpgrades[skillId].choices.length;
        return skillUpgrades;
    }

    /**
     * Gera a visão protegida do cliente (Progressive Revelation / Enigma):
     * Apenas Tiers até (adquiridos + 1) têm seus dados detalhados revelados.
     * Tiers futuros vêm marcados como { oculto: true, nivelRequerido: N, enigma: true }
     */
    function gerarVisaoCliente(classe, skillId, level, skillUpgrades) {
        const arvoreClasse = SKILL_UPGRADE_TREES[classe];
        if (!arvoreClasse || !arvoreClasse[skillId]) return null;

        const skillDef = arvoreClasse[skillId];
        const norm = normalizarSkillUpgrades(skillUpgrades);
        const skillData = norm[skillId] || { purchased: 0, choices: [] };
        const levelChar = Math.max(1, Number(level) || 1);
        const pontosDisponiveis = calcularPontosUpgradeDisponiveis(levelChar, norm);

        const tiersView = [];
        const nextUnlockTier = skillData.purchased + 1; // o próximo a ser escolhido

        for (let t = 1; t <= MAX_TIERS_PER_SKILL; t++) {
            const tierDef = skillDef.tiers[t];
            const nivelReq = TIER_LEVEL_REQUIREMENTS[t];
            const adquirido = t <= skillData.purchased;
            const escolhaAdquirida = adquirido ? skillData.choices[t - 1] : null;

            if (adquirido) {
                // Tier já adquirido: revela a escolha feita e bloqueia a oposta
                tiersView.push({
                    tier: t,
                    nivelRequerido: nivelReq,
                    status: 'adquirido',
                    escolha: escolhaAdquirida,
                    enigma: false,
                    oculto: false,
                    A: {
                        id: tierDef.A.id,
                        nome: tierDef.A.nome,
                        categoria: tierDef.A.categoria,
                        icone: tierDef.A.icone,
                        desc: tierDef.A.desc,
                        efeito: tierDef.A.efeito,
                        bloqueado: escolhaAdquirida !== 'A',
                        selecionado: escolhaAdquirida === 'A'
                    },
                    B: {
                        id: tierDef.B.id,
                        nome: tierDef.B.nome,
                        categoria: tierDef.B.categoria,
                        icone: tierDef.B.icone,
                        desc: tierDef.B.desc,
                        efeito: tierDef.B.efeito,
                        bloqueado: escolhaAdquirida !== 'B',
                        selecionado: escolhaAdquirida === 'B'
                    }
                });
            } else if (t === nextUnlockTier) {
                // Próximo Tier disponível para revelação e compra
                const temNivel = levelChar >= nivelReq;
                const podeComprar = temNivel && pontosDisponiveis > 0;
                tiersView.push({
                    tier: t,
                    nivelRequerido: nivelReq,
                    status: podeComprar ? 'disponivel' : (temNivel ? 'sem_pontos' : 'nivel_bloqueado'),
                    escolha: null,
                    podeComprar: podeComprar,
                    faltaNivel: !temNivel,
                    enigma: false,
                    oculto: false,
                    A: {
                        id: tierDef.A.id,
                        nome: tierDef.A.nome,
                        categoria: tierDef.A.categoria,
                        icone: tierDef.A.icone,
                        desc: tierDef.A.desc,
                        efeito: tierDef.A.efeito,
                        bloqueado: false,
                        selecionado: false
                    },
                    B: {
                        id: tierDef.B.id,
                        nome: tierDef.B.nome,
                        categoria: tierDef.B.categoria,
                        icone: tierDef.B.icone,
                        desc: tierDef.B.desc,
                        efeito: tierDef.B.efeito,
                        bloqueado: false,
                        selecionado: false
                    }
                });
            } else {
                // Tier futuro: ENIGMA / OCULTO! Não envia detalhes de A e B
                tiersView.push({
                    tier: t,
                    nivelRequerido: nivelReq,
                    status: 'oculto',
                    enigma: true,
                    oculto: true,
                    mensagem: '??? CAMADA ENIGMÁTICA BLOQUEADA ???',
                    subtexto: 'Evolua o Upgrade ' + (t - 1) + ' para revelar este poder ancestral.'
                });
            }
        }

        return {
            skillId: skillId,
            nome: skillDef.nome,
            icon: skillDef.icon,
            descBase: skillDef.descBase,
            purchased: skillData.purchased,
            maxTiers: MAX_TIERS_PER_SKILL,
            pontosDisponiveis: pontosDisponiveis,
            pontosGanhos: calcularPontosUpgradeGanhos(levelChar),
            level: levelChar,
            tiers: tiersView
        };
    }

    /**
     * Retorna a lista de skills da classe que participam da árvore
     */
    function obterSkillsParticipantes(classe) {
        const arvoreClasse = SKILL_UPGRADE_TREES[classe];
        if (!arvoreClasse) return [];
        return Object.keys(arvoreClasse);
    }

    return {
        MAX_UPGRADE_POINTS: MAX_UPGRADE_POINTS,
        MAX_TIERS_PER_SKILL: MAX_TIERS_PER_SKILL,
        TIER_LEVEL_REQUIREMENTS: TIER_LEVEL_REQUIREMENTS,
        SKILL_UPGRADE_TREES: SKILL_UPGRADE_TREES,
        calcularPontosUpgradeGanhos: calcularPontosUpgradeGanhos,
        calcularPontosUpgradeGastos: calcularPontosUpgradeGastos,
        calcularPontosUpgradeDisponiveis: calcularPontosUpgradeDisponiveis,
        normalizarSkillUpgrades: normalizarSkillUpgrades,
        temUpgrade: temUpgrade,
        obterEscolhaTier: obterEscolhaTier,
        validarCompraUpgrade: validarCompraUpgrade,
        aplicarCompraUpgrade: aplicarCompraUpgrade,
        gerarVisaoCliente: gerarVisaoCliente,
        obterSkillsParticipantes: obterSkillsParticipantes
    };
});
