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

    const MAX_UPGRADE_POINTS = 16;
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
        },
        guerreiro: {
            postura_guardiao: {
                id: 'postura_guardiao',
                nome: 'Aura do Vanguarda',
                icon: '🛡️',
                descBase: 'Ergue uma aura mística de proteção em torno do guerreiro, concedendo +30% de defesa e +10% de vida máxima por 10s.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'furia_vanguarda',
                            nome: 'Fúria do Vanguarda',
                            categoria: 'DPS / Ímpeto Ofensivo',
                            icone: '⚔️',
                            desc: 'A postura converte vigor defensivo em ímpeto ofensivo puro: concede +25% de Dano de Ataque Físico e +15% de Velocidade de Ataque enquanto a postura estiver ativa.',
                            efeito: '+25% Dano Físico · +15% Velocidade de Ataque durante a Postura (10s)',
                            valores: {
                                bonusDanoPct: 0.25,
                                bonusVelAtaquePct: 0.15,
                                duracaoMs: 10000
                            }
                        },
                        B: {
                            id: 'bastiao_inabalavel',
                            nome: 'Bastião Inabalável',
                            categoria: 'TANK / Barreira Suprema',
                            icone: '🛡️',
                            desc: 'Eleva a Defesa da postura para +50% e canaliza uma Barreira de Escudo absorvedora equivalente a 20% da Vida Máxima por 10 segundos.',
                            efeito: '+50% Defesa total · Barreira de 20% do HP Máximo por 10s',
                            valores: {
                                bonusDefesaPct: 0.50,
                                barreiraHpPct: 0.20,
                                duracaoMs: 10000
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'espinhos_retaliacao',
                            nome: 'Espinhos de Retaliação',
                            categoria: 'DPS / Contra-Ataque',
                            icone: '🩸',
                            desc: 'Enquanto a postura estiver ativa, 35% de todo dano sofrido é refletido como estilhaços cortantes em raio de 120px, aplicando Sangramento aos atacantes.',
                            efeito: 'Reflete 35% do dano em área (120px) · Aplica Sangramento de 3 ticks nos atacantes',
                            valores: {
                                reflexaoPct: 0.35,
                                raioReflexaoPx: 120,
                                sangramentoTicks: 3,
                                sangramentoDanoPorTick: 8
                            }
                        },
                        B: {
                            id: 'armadura_titanica',
                            nome: 'Armadura Titânica',
                            categoria: 'TANK / Fortaleza Inabalável',
                            icone: '🧱',
                            desc: 'As placas de metal são endurecidas com liga titânica: concede imunidade total a Lentidão (Slow) e empurrões, e reduz todo dano crítico recebido em 50%.',
                            efeito: 'Imunidade a Lentidão e Repulsão · Reduz Dano Crítico recebido em 50%',
                            valores: {
                                imuneSlow: true,
                                imuneKnockback: true,
                                reducaoDanoCriticoPct: 0.50
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'pulso_sismico_ruptura',
                            nome: 'Pulso de Ruptura',
                            categoria: 'DPS / Onda Periódica',
                            icone: '🌋',
                            desc: 'A cada 2 segundos com a postura ativa, o guerreiro estala o solo emitindo uma onda de choque que causa 40 de dano físico e fragmenta 15% da armadura inimiga.',
                            efeito: 'Pulso de choque a cada 2s · 40 dano físico · Reduz Armadura inimiga em 15% por 3s',
                            valores: {
                                intervaloMs: 2000,
                                intervaloTicks: 40,
                                danoPulso: 40,
                                reducaoArmaduraPct: 0.15,
                                debuffDuracaoMs: 3000,
                                raio: 140
                            }
                        },
                        B: {
                            id: 'egide_protetora',
                            nome: 'Égide Protetora',
                            categoria: 'TANK / Proteção de Grupo',
                            icone: '✨',
                            desc: 'A aura protetora irradia para aliados do grupo em até 220px, reduzindo em 20% todo dano sofrido por eles enquanto permanecerem dentro da aura.',
                            efeito: 'Aura de grupo (raio 220px) · Aliados sofrem -20% de dano durante a postura',
                            valores: {
                                raioAuraPx: 220,
                                reducaoDanoAliadosPct: 0.20,
                                duracaoMs: 10000
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'furia_berserker',
                            nome: 'Fúria Berserker',
                            categoria: 'DPS / Frenesi Destrutivo',
                            icone: '🔥',
                            desc: 'Desperta a fúria sanguinária ancestral: cada ataque básico desferido durante a postura estende sua duração em +0.5s (até +5s) e acumula +5% de Chance Crítica (até +30%).',
                            efeito: 'Ataques básicos estendem a Postura (+0.5s por acerto) · +5% Crítico por golpe (até +30%)',
                            valores: {
                                extensaoPorGolpeMs: 500,
                                maxExtensaoMs: 5000,
                                criticoPorAcumuloPct: 0.05,
                                maxAcumulosCritico: 6
                            }
                        },
                        B: {
                            id: 'fortaleza_indestrutivel',
                            nome: 'Fortaleza Indestrutível',
                            categoria: 'TANK / Invulnerabilidade',
                            icone: '🏰',
                            desc: 'Nos primeiros 3 segundos após erguer a postura, o Guerreiro torna-se uma muralha intransponível: 80% de Redução de Dano Absoluta e Imunidade total a qualquer Controle de Grupo (CC).',
                            efeito: 'Primeiros 3 segundos: 80% de Redução de Dano · Imunidade a Stun, Paralisia e CC',
                            valores: {
                                duracaoInvulneravelMs: 3000,
                                duracaoInvulneravelTicks: 60,
                                reducaoDanoAbsolutaPct: 0.80,
                                imuneCC: true
                            }
                        }
                    }
                }
            },
            tornado: {
                id: 'tornado',
                nome: 'Giro do Vanguarda',
                icon: '🌀',
                descBase: 'Gira a lança em um arco devastador, atingindo inimigos próximos com pulsos cortantes durante o giro.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'vortice_cortante',
                            nome: 'Vórtice Cortante',
                            categoria: 'DPS / Laceramento',
                            icone: '🌪️',
                            desc: 'Lâminas de vento hiperafiadas envolvem o giro: o dano base é aumentado em +40% e todos os inimigos atingidos sofrem Sangramento por 4 segundos.',
                            efeito: '+40% de Dano total · Inimigos atingidos sofrem Sangramento lacerante por 4s',
                            valores: {
                                bonusDanoPct: 0.40,
                                sangramentoDuracaoMs: 4000,
                                sangramentoTicks: 4,
                                sangramentoDanoPorTick: 7
                            }
                        },
                        B: {
                            id: 'vortice_protetor',
                            nome: 'Vórtice Protetor',
                            categoria: 'TANK / Desvio Cinético',
                            icone: '🛡️',
                            desc: 'O vendaval veloz deflete projéteis e amortece impactos: o Guerreiro recebe 40% a menos de dano de todas as fontes durante a execução do giro.',
                            efeito: 'Reduz em 40% o dano recebido durante os giros do tornado (800ms)',
                            valores: {
                                reducaoDanoGiroPct: 0.40,
                                duracaoMs: 800
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'laminas_dilacerantes',
                            nome: 'Lâminas Dilacerantes',
                            categoria: 'DPS / Projéteis Cortantes',
                            icone: '🗡️',
                            desc: 'A força centrífuga arremessa 4 lâminas de vento afiadas em cruz (alcance 180px), causando dano a alvos distantes além do círculo do tornado.',
                            efeito: 'Dispara 4 lâminas de vento em cruz (180px) · 35 de dano adicional a alvos distantes',
                            valores: {
                                qtdLaminas: 4,
                                alcancePx: 180,
                                danoPorLamina: 35
                            }
                        },
                        B: {
                            id: 'ciclone_gravitacional',
                            nome: 'Ciclone Gravitacional',
                            categoria: 'TANK / Controle de Multidão',
                            icone: '🧲',
                            desc: 'O vórtice gera um vácuo potente que puxa todos os inimigos em raio de 160px para o centro do giro e reduz a Velocidade de Movimento deles em 40% por 3s.',
                            efeito: 'Puxa inimigos (raio 160px) para o guerreiro · Lentidão de 40% por 3 segundos',
                            valores: {
                                raioPuxaoPx: 160,
                                forcaPuxaoPx: 35,
                                slowPct: 0.40,
                                slowDuracaoMs: 3000
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'impeto_tempestade',
                            nome: 'Ímpeto da Tempestade',
                            categoria: 'DPS / Velocidade & Crítico',
                            icone: '⚡',
                            desc: 'O guerreiro ganha +50% de Velocidade de Movimento durante o giro e desfere um 4º pulso giratório no tornado que tem Acerto Crítico garantido.',
                            efeito: '+50% Velocidade de Movimento durante o giro · 4º pulso giratório com 100% de Crítico',
                            valores: {
                                bonusVelMovimentoPct: 0.50,
                                pulsosExtras: 1,
                                criticoGarantido: true
                            }
                        },
                        B: {
                            id: 'barricada_vento',
                            nome: 'Barricada de Vento',
                            categoria: 'TANK / Barreira por Acerto',
                            icone: '🔰',
                            desc: 'Cada monstro ou chefe atingido pelos pulsos do tornado condensa uma Barreira Protetora temporária de 5% da Vida Máxima (acumula até 25%) por 5 segundos.',
                            efeito: '+5% HP Máximo em Barreira por inimigo atingido (acumula até 25%) por 5s',
                            valores: {
                                barreiraPorInimigoPct: 0.05,
                                maxBarreiraPct: 0.25,
                                duracaoMs: 5000
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'cataclismo_laminas',
                            nome: 'Cataclismo de Lâminas',
                            categoria: 'DPS / Apocalipse de Aço',
                            icone: '⚔️',
                            desc: 'O tornado se expande em +60% de raio, dobrando o dano total (+100%) e culminando em uma detonação de estilhaços metálicos afiados no final.',
                            efeito: '+60% de Raio do tornado · +100% Dano total · Detonação estilhaçante final',
                            valores: {
                                bonusRaioPct: 0.60,
                                bonusDanoPct: 1.00,
                                danoDetonacaoFinal: 55,
                                raioDetonacaoPx: 160
                            }
                        },
                        B: {
                            id: 'olho_furacao',
                            nome: 'Olho do Furacão',
                            categoria: 'TANK / Estordoamento & Sustentação',
                            icone: '🌀',
                            desc: 'No encerramento do giro, uma onda de choque sônica atordoa (Stun) todos os inimigos no raio por 1.8 segundos e regenera 15% da Vida Máxima do Guerreiro.',
                            efeito: 'Stun coletivo de 1.8s ao final do giro · Restaura instantaneamente 15% do HP Máx',
                            valores: {
                                stunDuracaoMs: 1800,
                                stunDuracaoTicks: 36,
                                curaHpPct: 0.15,
                                raio: 130
                            }
                        }
                    }
                }
            },
            provocacao: {
                id: 'provocacao',
                nome: 'Grito Estrondoso',
                icon: '📢',
                descBase: 'Grita poderosamente, tremendo o chão e provocando todos os monstros próximos para atacá-lo, enquanto cura sua própria vida.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'rugido_agressivo',
                            nome: 'Rugido Agressivo',
                            categoria: 'DPS / Amplificação de Dano',
                            icone: '🦁',
                            desc: 'O grito intimidador quebra a postura dos adversários: o Guerreiro causa +25% de dano adicional contra todos os monstros e chefes provocados por 8 segundos.',
                            efeito: '+25% de dano causado pelo Guerreiro contra alvos provocados por 8s',
                            valores: {
                                bonusDanoContraProvocadosPct: 0.25,
                                duracaoMs: 8000
                            }
                        },
                        B: {
                            id: 'rugido_encouracado',
                            nome: 'Rugido Encouraçado',
                            categoria: 'TANK / Cura & Casca Grossa',
                            icone: '🛡️',
                            desc: 'Potencializa o fôlego vital: eleva a cura instantânea do grito de 20% para 35% da Vida Máxima e concede +20% de Defesa adicional por 6 segundos.',
                            efeito: 'Cura aumentada para 35% do HP Máximo · +20% Defesa extra por 6 segundos',
                            valores: {
                                curaHpPct: 0.35,
                                bonusDefesaPct: 0.20,
                                duracaoDefesaMs: 6000
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'onda_ressonante',
                            nome: 'Onda Ressonante',
                            categoria: 'DPS / Onda de Impacto',
                            icone: '💥',
                            desc: 'O estrondo do grito se materializa em uma onda acústica destruidora que causa 50 de dano físico e fragmenta a armadura dos alvos em 25% por 6s.',
                            efeito: '50 de dano físico em área (300px) · Reduz Defesa dos inimigos em 25% por 6s',
                            valores: {
                                danoFisico: 50,
                                reducaoDefesaAlvosPct: 0.25,
                                duracaoDebuffMs: 6000,
                                raio: 300
                            }
                        },
                        B: {
                            id: 'desmoralizacao',
                            nome: 'Desmoralização',
                            categoria: 'TANK / Supressão de Dano',
                            icone: '💢',
                            desc: 'O pavor sonoro perturba a concentração inimiga: todos os monstros e chefes atingidos têm o seu Poder de Ataque reduzido em 30% por 8 segundos.',
                            efeito: 'Inimigos provocados causam 30% a menos de dano por 8 segundos',
                            valores: {
                                reducaoAtaqueInimigosPct: 0.30,
                                duracaoMs: 8000,
                                raio: 300
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'fervor_batalha',
                            nome: 'Fervor de Batalha',
                            categoria: 'DPS / Frenesi por Provocação',
                            icone: '🔥',
                            desc: 'Para cada monstro ou chefe provocado pelo grito, o Guerreiro ganha +8% de Dano de Ataque e +5% de Velocidade de Ataque por 8s (acumula até 5 vezes).',
                            efeito: 'Por inimigo provocado: +8% Dano e +5% Vel. Ataque (até 5 acúmulos = +40% Dano / +25% Vel)',
                            valores: {
                                bonusDanoPorInimigoPct: 0.08,
                                bonusVelAtaquePorInimigoPct: 0.05,
                                maxAcumulos: 5,
                                duracaoMs: 8000
                            }
                        },
                        B: {
                            id: 'folego_inabalavel',
                            nome: 'Fôlego Inabalável',
                            categoria: 'TANK / Regeneração Contínua',
                            icone: '💚',
                            desc: 'Após a cura imediata, o guerreiro entra em regeneração contínua de vigor: restaura 4% da Vida Máxima a cada segundo durante 5 segundos (+20% de HP total).',
                            efeito: 'Regenera 4% do HP Máximo por segundo durante 5s (+20% HP adicional)',
                            valores: {
                                regenPorSegundoPct: 0.04,
                                duracaoSegundos: 5,
                                totalRegenPct: 0.20
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'brado_conquistador',
                            nome: 'Brado do Conquistador',
                            categoria: 'DPS / Detonação Sônica',
                            icone: '👑',
                            desc: 'Uma onda de choque titânica causa 90 de dano físico em área massiva (320px), arremessando monstros fracos para trás e infligindo Lentidão severa de 60% por 4s.',
                            efeito: '90 de dano físico massivo (320px) · Repulsão de monstros · Lentidão de 60% por 4s',
                            valores: {
                                danoMassivo: 90,
                                raio: 320,
                                repulsaoPx: 45,
                                slowPct: 0.60,
                                slowDuracaoMs: 4000
                            }
                        },
                        B: {
                            id: 'avatar_vanguarda',
                            nome: 'Avatar da Vanguarda',
                            categoria: 'TANK / Transcrescência Protetora',
                            icone: '🦁',
                            desc: 'O guerreiro invoca o espírito do Leão Ancestral: cresce visualmente +25%, ganha +50% de Defesa e conjura uma Barreira impenetrável de 40% do HP Máx por 10s.',
                            efeito: 'Tamanho +25% · +50% Defesa · Barreira de 40% da Vida Máxima por 10s · Aggro absoluto',
                            valores: {
                                escalaVisual: 1.25,
                                bonusDefesaPct: 0.50,
                                barreiraHpPct: 0.40,
                                duracaoMs: 10000
                            }
                        }
                    }
                }
            },
            escudo_lancamento: {
                id: 'escudo_lancamento',
                nome: 'Lançamento do Escudo',
                icon: '🛡️',
                descBase: 'Arremessa o escudo à frente causando dano, puxando o inimigo atingido para perto e provocando-o.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'escudo_serrilhado',
                            nome: 'Escudo Serrilhado',
                            categoria: 'DPS / Hemorragia',
                            icone: '⚙️',
                            desc: 'A borda do escudo ganha lâminas de serra giratórias: causa +35% de dano de impacto e inflige Sangramento lacerante pesado no alvo atingido por 6 segundos.',
                            efeito: '+35% Dano de impacto · Aplica Sangramento pesado (6 ticks de dano) no alvo',
                            valores: {
                                bonusDanoPct: 0.35,
                                sangramentoTicks: 6,
                                sangramentoDanoPorTick: 10,
                                duracaoMs: 6000
                            }
                        },
                        B: {
                            id: 'impacto_esmagador',
                            nome: 'Impacto Esmagador',
                            categoria: 'TANK / Atordoamento Pesado',
                            icone: '🔨',
                            desc: 'O baque do escudo estraçalha a guarda do inimigo: atordoa (Stun) o alvo por 2.0 segundos (40 ticks), interrompendo qualquer conjuração em andamento.',
                            efeito: 'Atordoa (Stun) o alvo por 2.0s · Interrompe conjurações de habilidades',
                            valores: {
                                stunDuracaoMs: 2000,
                                stunDuracaoTicks: 40,
                                interrompeSkills: true
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'escudo_ricocheteador',
                            nome: 'Escudo Ricocheteador',
                            categoria: 'DPS / Ricochete em Cadeia',
                            icone: '🪃',
                            desc: 'Após colidir com o primeiro alvo, o escudo ricocheteia para até 2 inimigos adicionais no raio de 140px, causando dano total a cada um deles.',
                            efeito: 'Ricocheteia em até 2 inimigos adicionais próximos · Causa dano a múltiplos alvos',
                            valores: {
                                maxRicochetes: 2,
                                raioRicochetePx: 140,
                                danoRicocheteMult: 0.85
                            }
                        },
                        B: {
                            id: 'vortice_atracao',
                            nome: 'Vórtice de Atração',
                            categoria: 'TANK / Agrupamento em Área',
                            icone: '🌀',
                            desc: 'No ponto onde o escudo atinge, uma fenda cinética se abre, puxando todos os monstros no raio de 120px para junto do alvo principal.',
                            efeito: 'Puxa todos os monstros no raio de 120px para o ponto de impacto do escudo',
                            valores: {
                                raioVorticePx: 120,
                                forcaPuxaoPx: 40
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'estilhacos_cortantes',
                            nome: 'Estilhaços Cortantes',
                            categoria: 'DPS / Detonação de Fragmentos',
                            icone: '💥',
                            desc: 'No impacto, o escudo libera uma explosão de 6 estilhaços de aço pontiagudos em 360°, causando 30 de dano a cada inimigo atingido num raio de 120px.',
                            efeito: 'Detona 6 estilhaços de aço afiados · 30 de dano a cada inimigo na área (120px)',
                            valores: {
                                qtdEstilhacos: 6,
                                danoPorEstilhaco: 30,
                                raioPx: 120
                            }
                        },
                        B: {
                            id: 'escudo_retorno',
                            nome: 'Escudo de Retorno',
                            categoria: 'TANK / Barreira no Retorno',
                            icone: '🛡️',
                            desc: 'Ao voar de volta para o braço do Guerreiro, o escudo canaliza energia cinética acumulada, concedendo uma Barreira de 15% da Vida Máxima por 6 segundos.',
                            efeito: 'Ao retornar: concede Barreira de Escudo de 15% do HP Máximo por 6 segundos',
                            valores: {
                                barreiraHpPct: 0.15,
                                duracaoMs: 6000
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'escudo_titanico',
                            nome: 'Escudo Titânico Devastador',
                            categoria: 'DPS / Perfurante Colossal',
                            icone: '☄️',
                            desc: 'O escudo arremessado torna-se uma efígie colossal de fogo e aço: dobra de tamanho, causa +100% de dano e perfura TODOS os inimigos em linha reta.',
                            efeito: 'Escudo Colossal (2x tamanho) · +100% Dano · Perfura todos os inimigos em linha',
                            valores: {
                                escalaVisual: 2.0,
                                bonusDanoPct: 1.00,
                                perfuracaoTotal: true,
                                alcanceMaxPx: 360
                            }
                        },
                        B: {
                            id: 'muralha_protetora',
                            nome: 'Muralha Protetora',
                            categoria: 'TANK / Zona Defensiva no Solo',
                            icone: '🏰',
                            desc: 'Ao atingir o destino, o escudo projeta uma Muralha de Energia Sagrada no solo por 5s: aliados na área recebem 30% de Redução de Dano e imunidade a empurrões.',
                            efeito: 'Cria zona protetora no solo por 5s · Aliados recebem -30% de dano e imunidade a repulsão',
                            valores: {
                                duracaoMs: 5000,
                                duracaoTicks: 100,
                                raioZonaPx: 110,
                                reducaoDanoAliadosPct: 0.30,
                                imuneRepulsao: true
                            }
                        }
                    }
                }
            }
        },
        mago: {
            meteoro: {
                id: 'meteoro',
                nome: 'Meteoro',
                icon: '☄️',
                descBase: 'Carrega por 1s e invoca um meteoro no ponto marcado.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'meteoro_chuva_quintupla',
                            nome: 'Chuva Quíntupla de Meteoros',
                            categoria: 'DPS / Bombardeio Sequencial',
                            icone: '☄️',
                            desc: 'Transforma em 5 meteoros seguidos. O 1º cai após 1.5s de cast, logo em seguida cai o 2º com intervalo de 0.4s, o 3º com 0.2s, o 4º com 0.1s e o 5º cai junto com o 4º. Caem sempre próximos mas nunca no mesmo lugar. A tela treme e o som repete a cada impacto.',
                            efeito: '5 Meteoros sequenciais (intervalos 0.4s, 0.2s, 0.1s, duplo) · Tela treme a cada impacto · Som repete em cada queda',
                            valores: {
                                quantidadeMeteoros: 5,
                                castTimeMs: 1500,
                                intervalosMs: [0, 400, 200, 100, 0],
                                screenShake: 12
                            }
                        },
                        B: {
                            id: 'esfera_ignea_repulsora',
                            nome: 'Esfera Ígnea Repulsora',
                            categoria: 'Controle / Projétil Ígneo',
                            icone: '🔥',
                            desc: 'Deixa de ser um meteoro celeste e transforma-se em uma Bola de Fogo lançada que empurra inimigos com repulsão violenta (knockback) e deixa um rastro de chamas no chão por onde passa.',
                            efeito: 'Converte em Bola de Fogo · Empurra inimigos (Knockback) · Deixa rastro de chamas',
                            valores: {
                                projetilBolaFogo: true,
                                knockbackDist: 90,
                                rastroFogo: true,
                                duracaoRastroMs: 4000
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'impacto_avassalador',
                            nome: 'Impacto Avassalador',
                            categoria: 'DPS / Potência Arcana',
                            icone: '💥',
                            desc: 'Aumenta o dano de cada meteoro em 30% e reduz o tempo de recarga da habilidade em 3 segundos.',
                            efeito: '+30% Dano do Meteoro · -3s Tempo de Recarga',
                            valores: {
                                danoMult: 1.30,
                                cooldownReducaoSegundos: 3
                            }
                        },
                        B: {
                            id: 'desfragmentacao_incendiaria',
                            nome: 'Desfragmentação Incendiária',
                            categoria: 'Controle / Dispersão de Chamas',
                            icone: '✨',
                            desc: 'Ao atingir o inimigo, a Bola de Fogo se desfragmenta em vários estilhaços ardentes em leque, atingindo todos ao redor e deixando-os queimando por 5 segundos.',
                            efeito: 'Desfragmenta em fragmentos · Atinge em área ao redor · Queimadura contínua por 5s',
                            valores: {
                                desfragmentacao: true,
                                fragmentosQtd: 6,
                                duracaoQueimaduraMs: 5000,
                                danoQueimaduraPorTick: 8
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'tempestade_celeste_canalizada',
                            nome: 'Tempestade Celeste Canalizada',
                            categoria: 'DPS / Canalização Cataclísmica',
                            icone: '⚡',
                            desc: 'Amplia para 10 meteoros sequenciais, aumenta o dano em 50% e cada meteoro causa MicroStun de 0.5s por acerto. Porém, enquanto estiverem caindo, o Mago fica paralisado no local canalizando os meteoros (sem movimento e sem dash).',
                            efeito: '10 Meteoros · +50% Dano · MicroStun 0.5s por acerto · Mago paralisado canalizando (sem andar e sem dash)',
                            valores: {
                                quantidadeMeteoros: 10,
                                danoMult: 1.50,
                                microStunMs: 500,
                                canalizacaoImovel: true
                            }
                        },
                        B: {
                            id: 'rajada_triplice_ignea',
                            nome: 'Rajada Tríplice Ígnea',
                            categoria: 'Controle / Sequência Explosiva',
                            icone: '☄️',
                            desc: 'Lança uma sequência consecutiva de 3 Bolas de Fogo velozes: a 1ª causa 100% de dano, a 2ª causa 50% de dano e a 3ª causa 20% de dano.',
                            efeito: 'Sequência de 3 Bolas de Fogo · Dano: 100% / 50% / 20% · Efeitos de repulsão consecutivos',
                            valores: {
                                bolasFogoQtd: 3,
                                danosMult: [1.0, 0.5, 0.2]
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'cometa_cataclismo_ancestral',
                            nome: 'Cometa do Cataclismo Ancestral',
                            categoria: 'DPS / Impacto Colossal',
                            icone: '🪐',
                            desc: 'No final dos meteoros, um COMETA GIGANTE desce lentamente sobre a área marcada. Ao colidir, explode rochas incandescentes para todos os lados, ergue e afunda uma grande cratera no solo e deixa o mapa queimando por 10 segundos.',
                            efeito: 'Cometa Gigante final · Descida lenta · Grande Cratera no chão · Explosão de pedras · Solo queimando por 10s',
                            valores: {
                                cometaGigante: true,
                                duracaoChamasSegundos: 10,
                                duracaoChamasTicks: 200,
                                screenShakeFinal: 25,
                                raioCometaPx: 140
                            }
                        },
                        B: {
                            id: 'metamorfose_bola_de_fogo',
                            nome: 'Metamorfose Elemental: Orbe Vivo',
                            categoria: 'Controle / Forma de Fogo Viva',
                            icone: '🌀',
                            desc: 'Transforma o Mago em uma Bola de Fogo viva sob controle por 5 segundos. Concede +100% de velocidade de movimento, reduz todo o dano recebido em 50%, desacelera os inimigos atropelados e queima o solo causando alto dano por onde passar.',
                            efeito: 'Transforma em Bola de Fogo por 5s · +100% Velocidade · -50% Dano recebido · Lentidão e dano/s por atropelamento',
                            valores: {
                                metamorfoseFogo: true,
                                duracaoMs: 5000,
                                velMovBonusPct: 1.0,
                                reducaoDanoRecebidoPct: 0.50,
                                slowAtropeladosPct: 0.40
                            }
                        }
                    }
                }
            },
            nevasca: {
                id: 'nevasca',
                nome: 'Nevasca',
                icon: '❄️',
                descBase: 'Carrega por 1s e cria uma tempestade que desacelera e gela os inimigos na área.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'congelamento_profundo',
                            nome: 'Congelamento Profundo',
                            categoria: 'Gelo / Paralisia Congelante',
                            icone: '❄️',
                            desc: 'Inimigos que permanecerem dentro da Nevasca por mais de 3 segundos são congelados por 1.5 segundos. A área exibe fragmentos nítidos de gelo entrelaçados na água.',
                            efeito: 'Inimigos > 3s na área congelam por 1.5s · Efeito visual de fragmentos de gelo na água',
                            valores: {
                                tempoNecessarioMs: 3000,
                                stunGeloMs: 1500
                            }
                        },
                        B: {
                            id: 'fusao_piroclastica',
                            nome: 'Fusão Piroclástica',
                            categoria: 'Fogo / Queimadura Contínua',
                            icone: '🔥',
                            desc: 'A Nevasca se funde ao Fogo Primordial: deixa de causar lentidão para causar intenso dano por queimadura contínua por segundo a todos os inimigos.',
                            efeito: 'Funde-se ao fogo · Remove lentidão · Causa dano por queimadura por segundo',
                            valores: {
                                removeLentidao: true,
                                queimaduraPorSegundo: true,
                                queimaduraDanoMult: 1.4
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'ressonancia_criomantica',
                            nome: 'Ressonância Criomântica',
                            categoria: 'Gelo / Intensificação Arcana',
                            icone: '🔷',
                            desc: 'Ao usar Nevasca, aumenta seu dano mágico em 10% por 10 segundos. Acumula até 3 vezes (+30%). Uma aura azul se manifesta nos pés do Mago e se repete em até 3 camadas visuais.',
                            efeito: '+10% Dano Mágico por 10s · Acumula até 3x (+30%) · Aura azul pulsante nos pés com 3 camadas concêntricas',
                            valores: {
                                danoMagicoPorStackPct: 0.10,
                                maxStacks: 3,
                                duracaoBuffMs: 10000
                            }
                        },
                        B: {
                            id: 'tornado_igneo_devastador',
                            nome: 'Tornado Ígneo Devastador',
                            categoria: 'Fogo / Vórtice de Chamas',
                            icone: '🌪️',
                            desc: 'A Nevasca se transforma em um violento Tornado de Fogo. Reduz a defesa de todos os inimigos dentro do tornado e causa dano contínuo acelerado.',
                            efeito: 'Transforma em Tornado de Fogo · Reduz Defesa dos inimigos dentro · Dano contínuo',
                            valores: {
                                viraTornado: true,
                                reducaoDefesaPct: 0.20
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'projeteis_de_gelo_congelantes',
                            nome: 'Projéteis Árticos Perfurantes',
                            categoria: 'Gelo / Ataque Básico Gélido',
                            icone: '🧊',
                            desc: 'Enquanto a Nevasca estiver ativada, seus ataques básicos se transformam em fragmentos afiados de gelo azulado. Acertar o mesmo inimigo 3 vezes consecutivas com o ataque básico congela-o por 1 segundo.',
                            efeito: 'Ataque básico vira Fragmentos de Gelo · 3 acertos seguidos no alvo congelam por 1s',
                            valores: {
                                basicAtkGelo: true,
                                acertosParaCongelar: 3,
                                stunGeloBasicoMs: 1000
                            }
                        },
                        B: {
                            id: 'vortices_menores_perseguidores',
                            nome: 'Vórtices Menores Perseguidores',
                            categoria: 'Fogo / Tornados Homing',
                            icone: '🌀',
                            desc: 'Quando o Tornado principal termina, dá origem a 4 novos tornados menores que perseguem os inimigos autonomamente por 5 segundos.',
                            efeito: 'Ao terminar, cria 4 mini-tornados · Perseguem inimigos por 5s causando dano por contato',
                            valores: {
                                miniTornadosQtd: 4,
                                duracaoMiniTornadosMs: 5000,
                                velocidadeMiniTornados: 3.5
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'estacas_glaciais_detonantes',
                            nome: 'Estacas Glaciais Detonantes',
                            categoria: 'Gelo / Erupção Glacial',
                            icone: '💎',
                            desc: 'A Nevasca ergue espinhos pontiagudos de gelo sob os pés dos inimigos na área. Ao término da Nevasca, essas estacas de vidro explodem violentamente, causando dano massivo.',
                            efeito: 'Cria espinhos de gelo sob os inimigos · Explodem no término causando Grande Dano',
                            valores: {
                                espinhosGelo: true,
                                danoExplosaoMult: 2.2,
                                raioExplosaoPx: 120
                            }
                        },
                        B: {
                            id: 'tornado_colossal_cacador',
                            nome: 'Tornado Colossal Caçador',
                            categoria: 'Fogo / Vórtice Crescente Caçador',
                            icone: '🔥',
                            desc: 'O Tornado dura 10 segundos. Quanto mais tempo permanece, maior ele fica e mais dano ele causa, passando a perseguir ativamente os inimigos pelo mapa.',
                            efeito: 'Duração de 10s · Cresce em tamanho e dano ao longo do tempo · Persegue inimigos ativamente',
                            valores: {
                                duracaoMs: 10000,
                                persegueInimigos: true,
                                crescimentoRaioMaxMult: 1.8,
                                danoEscaladoMaxMult: 1.75
                            }
                        }
                    }
                }
            },
            vulcao: {
                id: 'vulcao',
                nome: 'Vulcão Flamejante',
                icon: '🌋',
                descBase: 'Carrega por 1s e faz um vulcão emergir parcialmente do terreno, lançando fragmentos e magma.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'erupcao_dupla_frequencia',
                            nome: 'Erupção Acelerada',
                            categoria: 'Erupção / Cadência Extrema',
                            icone: '🌋',
                            desc: 'Dobra a quantidade total de fragmentos arremessados pelo vulcão e dobra a cadência/velocidade de disparo durante toda a erupção.',
                            efeito: '2x Fragmentos arremessados · 2x Cadência de disparo (dobro da velocidade)',
                            valores: {
                                fragmentosMult: 2.0,
                                cadenciaMult: 2.0
                            }
                        },
                        B: {
                            id: 'despertar_golem_fogo',
                            nome: 'Despertar do Golem de Fogo',
                            categoria: 'Golem / Lacaio Incandescente',
                            icone: '👹',
                            desc: 'O Vulcão se transforma em um Golem de Fogo lacaio que segue o Mago por 30 segundos, atirando bolas de fogo pelas mãos à distância (invulnerável e sem vida).',
                            efeito: 'Vira Golem de Fogo por 30s · Segue o Mago · Atira bolas de fogo à distância · Invulnerável',
                            valores: {
                                viraGolem: true,
                                duracaoSegundos: 30,
                                alcanceTiroPx: 320,
                                danoTiroGolem: 28
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'pocoes_de_larva_debilitante',
                            nome: 'Poças de Magma Debilitante',
                            categoria: 'Erupção / Solo de Magma',
                            icone: '🧪',
                            desc: 'O vulcão espalha larvas e poças ferventes pelo chão ao seu redor, queimando os inimigos e reduzindo o ataque deles em 30% (5% em bosses).',
                            efeito: 'Poças de larva no solo · Queimadura contínua · Reduz ataque dos monstros em 30% (Bosses 5%)',
                            valores: {
                                pocasLava: true,
                                reducaoAtaqueMonstrosPct: 0.30,
                                reducaoAtaqueBossPct: 0.05
                            }
                        },
                        B: {
                            id: 'golem_bracos_bielementais',
                            nome: 'Garras Bi-Elementais (Fogo & Gelo)',
                            categoria: 'Golem / Hibridismo Elemental',
                            icone: '❄️',
                            desc: 'O Golem transforma uma de suas mãos para atacar com gelo. Revezando o ataque entre bola de fogo e bola de gelo com maior cadência e causando mais dano mágico.',
                            efeito: 'Mão esquerda de Gelo · Alterna disparos de Fogo e Gelo · Maior velocidade e +dano mágico',
                            valores: {
                                bracoGelo: true,
                                cadenciaBonusPct: 0.35,
                                danoMagicoBonusPct: 0.30
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'detonacao_secundaria_fragmentos',
                            nome: 'Fragmentação Detonante Secundária',
                            categoria: 'Erupção / Segunda Explosão',
                            icone: '💥',
                            desc: 'Quando os fragmentos do vulcão acertam os inimigos, causam uma segunda explosão imediata, provocando dano em área novamente ao redor do alvo.',
                            efeito: 'Fragmentos causam uma 2ª explosão ao atingir inimigos · Dano em área repetido',
                            valores: {
                                explosaoSecundaria: true,
                                danoExplosaoSecPct: 0.60,
                                raioExplosaoSecPx: 45
                            }
                        },
                        B: {
                            id: 'rugido_protetor_tita',
                            nome: 'Rugido Protetor do Titã',
                            categoria: 'Golem / Barreira de Proteção',
                            icone: '🛡️',
                            desc: 'A cada 10 segundos o Golem executa uma animação de RUGIDO que buffa o Mago, concedendo uma bolha de proteção de 20% da vida máxima do Mago (representada por uma barra branca sobreposta ao HP).',
                            efeito: 'Rugido a cada 10s com animação · Concede bolha de proteção de 20% HP Máx · Barra branca sobreposta à vida',
                            valores: {
                                rugidoIntervaloMs: 10000,
                                escudoHpMaxPct: 0.20,
                                duracaoEscudoMs: 8000
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'caldeira_vulcanica_suprema',
                            nome: 'Caldeira Vulcânica da Ruína',
                            categoria: 'Erupção / Domínio de Calor Extremo',
                            icone: '☀️',
                            desc: 'Aumenta a área e alcance do vulcão em 20% e o dano em 40%. Gera uma Grande Zona de Calor ao redor dele que enfraquece os inimigos, reduzindo velocidade de ataque e a defesa em 10%.',
                            efeito: '+20% Área e Alcance · +40% Dano · Grande Zona de Calor: reduz vel. de ataque e -10% de Defesa',
                            valores: {
                                areaBonusPct: 0.20,
                                danoBonusPct: 0.40,
                                zonaCalor: true,
                                reducaoDefesaPct: 0.10,
                                reducaoVelAtkPct: 0.20,
                                raioZonaCalorPx: 220
                            }
                        },
                        B: {
                            id: 'cataclismo_meteoros_bielamentais',
                            nome: 'Chuva Bi-Elemental do Golem',
                            categoria: 'Golem / Bombardeio Periódico',
                            icone: '☄️',
                            desc: 'O Golem lança meteoros de gelo e meteoros de fogo periodicamente a cada 5 segundos (um por vez) sempre que houver inimigos por perto.',
                            efeito: 'A cada 5s lança 1 Meteoro de Fogo e 1 Meteoro de Gelo sequenciais sobre inimigos próximos',
                            valores: {
                                meteorosPeriodicos: true,
                                intervaloMeteorosMs: 5000,
                                danoMeteoroGolem: 50
                            }
                        }
                    }
                }
            },
            bola_elemental: {
                id: 'bola_elemental',
                nome: 'Bola Elemental',
                icon: '🔮',
                descBase: 'Lança uma esfera elemental que rola empurrando alvos e interagindo com Nevasca e Fogo.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'esfera_perfurante_colossal',
                            nome: 'Esfera Perfurante Hiper-Rolante',
                            categoria: 'Ofensivo / Perfuratriz Elemental',
                            icone: '🔮',
                            desc: 'Aumenta o diâmetro da Bola Elemental em 25% e sua velocidade de rolagem, perfurando e empurrando inimigos sem desacelerar.',
                            efeito: '+25% Tamanho da esfera · +30% Velocidade · Perfura múltiplos alvos com repulsão pesada',
                            valores: {
                                tamanhoBonusPct: 0.25,
                                velocidadeBonusPct: 0.30,
                                perfurante: true
                            }
                        },
                        B: {
                            id: 'esfera_gravitacional_atrativa',
                            nome: 'Esfera Gravitacional Arcana',
                            categoria: 'Controle / Vórtice Gravitacional',
                            icone: '🌀',
                            desc: 'A esfera irradia um campo gravitacional que puxa vigorosamente todos os inimigos próximos para o seu centro enquanto rola.',
                            efeito: 'Campo gravitacional contínuo · Puxa inimigos em raio de 150px para o centro da esfera',
                            valores: {
                                vortexAtracao: true,
                                raioVortexPx: 150,
                                forcaAtracao: 8
                            }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'nucleo_trielemental_pulsante',
                            nome: 'Núcleo Tri-Elemental Ressonante',
                            categoria: 'Ofensivo / Fusão Primitiva',
                            icone: '⚛️',
                            desc: 'A esfera emite pulsos periódicos de fogo, gelo e eletricidade a cada 0.3s pelo caminho, causando ondas de dano elementar a todos ao redor.',
                            efeito: 'Pulsos de dano elemental ao redor da esfera durante todo o trajeto',
                            valores: {
                                pulsosElementais: true,
                                pulsoIntervaloMs: 300,
                                raioPulsoPx: 100,
                                danoPulso: 15
                            }
                        },
                        B: {
                            id: 'orbe_ressonante_bumerangue',
                            nome: 'Orbe Ressonante Retornável',
                            categoria: 'Controle / Bumerangue Energético',
                            icone: '🪃',
                            desc: 'Ao atingir o alcance máximo, a esfera faz o retorno e volta até o Mago. Ao ser recolhida, restaura 15% de Mana e 10% de HP.',
                            efeito: 'Retorna até o Mago após o percurso · Dano na ida e volta · Recupera 15% de Mana e 10% HP ao colidir',
                            valores: {
                                bumerangue: true,
                                manaRegenPct: 0.15,
                                hpRegenPct: 0.10
                            }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'bolas_gemeas_fracionadas',
                            nome: 'Bolas Elementais Gêmeas',
                            categoria: 'Ofensivo / Bifurcação Arcana',
                            icone: '✨',
                            desc: 'Conjura duas esferas elementais gêmeas em vez de apenas uma, lançadas em leve abertura angular. Ambas compartilham interações com Nevasca e Fogo.',
                            efeito: 'Dispara 2 Bolas Elementais simultâneas em leque · Ambas interagem com elementos',
                            valores: {
                                esferasGemeas: true,
                                quantidade: 2,
                                anguloAberturaDeg: 25
                            }
                        },
                        B: {
                            id: 'barreira_elemental_vanguarda',
                            nome: 'Escudo Elemental de Vanguarda',
                            categoria: 'Controle / Barreira Móvel',
                            icone: '🛡️',
                            desc: 'A esfera projeta uma redoma mística sobre o Mago e aliados enquanto avança, reduzindo em 35% o dano recebido pelo grupo.',
                            efeito: 'Redoma protetora enquanto ativa · -35% dano recebido para aliados próximos',
                            valores: {
                                redomaProtetora: true,
                                reducaoDanoPct: 0.35,
                                raioRedomaPx: 160
                            }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'supernova_elemental_primordial',
                            nome: 'Supernova Elemental Primordial',
                            categoria: 'Ofensivo / Cataclismo de Fusão',
                            icone: '💥',
                            desc: 'Ao final do trajeto ou impacto final, a Bola Elemental explode em uma Supernova estonteante (raio 180px), causando dano massivo, congelando por 2s e queimando o solo.',
                            efeito: 'Detonação em Supernova (raio 180px) · Dano massivo · Congela por 2s e queima o solo',
                            valores: {
                                supernovaFinal: true,
                                raioSupernovaPx: 180,
                                danoSupernovaMult: 2.5,
                                stunGeloMs: 2000
                            }
                        },
                        B: {
                            id: 'singularidade_do_vazio_arcano',
                            nome: 'Singularidade do Vazio Arcano',
                            categoria: 'Controle / Horizonte de Eventos',
                            icone: '🌌',
                            desc: 'Ao colidir, a esfera implode em uma Singularidade por 6s: atrai os inimigos, reduz o dano causado por eles em 40% e inflige dano por segundo.',
                            efeito: 'Implosão em Singularidade por 6s · Prende inimigos · Reduz o dano deles em 40%',
                            valores: {
                                singularidadeVazio: true,
                                duracaoMs: 6000,
                                supressaoDanoPct: 0.40,
                                danoPorSegundo: 35
                            }
                        }
                    }
                }
            }
        },
        ladino: {
            visao_noturna_aprimorada: {
                id: 'visao_noturna_aprimorada',
                nome: 'Visão Noturna Aprimorada',
                icon: '🌙',
                descBase: 'Entre 00:00 e 04:00, seu foco sombrio reduz o breu total e permite enxergar contornos sem perder a agilidade.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'contornos_sombrios',
                            nome: 'Contornos Sombrios',
                            categoria: 'Visão de Combate',
                            icone: '🕶️',
                            desc: 'A escuridão da madrugada é limitada em 90% para o Ladino, permitindo perceber melhor inimigos e terreno nas sombras.',
                            efeito: 'Noite de 00:00 a 04:00: breu máximo reduzido de 100% para 90%',
                            valores: { maxEscuridaoPct: 0.90 }
                        },
                        B: {
                            id: 'percepcao_veloz',
                            nome: 'Percepção Veloz',
                            categoria: 'Mobilidade / Reconhecimento',
                            icone: '👁️',
                            desc: 'Você reconhece contornos e bordas de movimento mesmo na neblina profunda, reduzindo o delay de percepção da sombra.',
                            efeito: 'Recupera 6% de visão amigável em neblina profunda · Ajusta leitura de alvo em combate',
                            valores: { bonusPercepcaoPct: 0.06 }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'sinais_de_fuga',
                            nome: 'Sinais de Fuga',
                            categoria: 'Assistência / Visão',
                            icone: '🧭',
                            desc: 'A silhueta dos alvos em fuga fica mais clara, permitindo rastrear melhor inimigos em deslocamento rápido nas sombras.',
                            efeito: 'Alvo em fuga recebe marca visual de sombras · mais fácil de perseguir',
                            valores: { rastreioBonusPx: 18 }
                        },
                        B: {
                            id: 'rastros_laterais',
                            nome: 'Rastros Laterais',
                            categoria: 'Leitura de Campo',
                            icone: '🩶',
                            desc: 'Você lê o eixo de movimento do rival pela névoa e consegue identificar melhor arcos de ataque e rota de saída.',
                            efeito: 'Aumenta leitura de combate em 12% · melhora rastreio de giro ou corrida',
                            valores: { leituraBonusPct: 0.12 }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'escuta_do_breu',
                            nome: 'Escuta do Breu',
                            categoria: 'Dados do Campo',
                            icone: '🎧',
                            desc: 'A sombra transmite informações sutis: passos, quedas e alvos em velocidade ficam mais visíveis mesmo sem luz.',
                            efeito: 'Detecta movimento em 15% maior alcance na madrugada',
                            valores: { alcanceBonusPct: 0.15 }
                        },
                        B: {
                            id: 'fenda_da_sombra',
                            nome: 'Fenda da Sombra',
                            categoria: 'Pulo / Exploração',
                            icone: '🕳️',
                            desc: 'Ao se misturar à penumbra, a leitura do espaço ao redor se torna precisa e permite pequenos ajustes de posicionamento.',
                            efeito: 'Melhora a precisão de dash e desvio em sombras',
                            valores: { precisaoBonusPct: 0.10 }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'manto_da_madrugada',
                            nome: 'Manto da Madrugada',
                            categoria: 'Domínio da Sombra',
                            icone: '🌌',
                            desc: 'O Ladino aprende a caminhar em plena escuridão como se a noite fosse o próprio elemento, reduzindo o breu ao mínimo possível.',
                            efeito: 'Breu máximo permanente em 90% durante 00:00 a 04:00 · visão ativa mesmo em sombras profundas',
                            valores: { maxEscuridaoPct: 0.90 }
                        },
                        B: {
                            id: 'noite_letal',
                            nome: 'Noite Letal',
                            categoria: 'Combate Acrobático',
                            icone: '☠️',
                            desc: 'Na penumbra, seus ataques ganham leitura superior e o primeiro acerto contra inimigos em breu total se torna mais preciso.',
                            efeito: '10% de melhora de precisão e 8% de dano adicional em combate noturno',
                            valores: { bonusPrecisaoPct: 0.10, bonusDanoPct: 0.08 }
                        }
                    }
                }
            }
        },
        pikeman: {
            visao_noturna_aprimorada: {
                id: 'visao_noturna_aprimorada',
                nome: 'Visão Noturna Aprimorada',
                icon: '🌙',
                descBase: 'A guarda do Pikeman domina o breu da madrugada, permitindo manter a leitura do campo mesmo quando a noite se torna opressiva.',
                tiers: {
                    1: {
                        nivelRequerido: 10,
                        A: {
                            id: 'olho_do_pesadelo',
                            nome: 'Olho do Pesadelo',
                            categoria: 'Visão de Campo',
                            icone: '🕶️',
                            desc: 'A escuridão da madrugada é limitada em 90%, permitindo enxergar melhor as bordas de ataque e evitar encurralamentos.',
                            efeito: 'Noite de 00:00 a 04:00: breu máximo reduzido de 100% para 90%',
                            valores: { maxEscuridaoPct: 0.90 }
                        },
                        B: {
                            id: 'linha_de_frente',
                            nome: 'Linha de Frente',
                            categoria: 'Defesa / Fronteira',
                            icone: '🛡️',
                            desc: 'Seu olhar da guarda percebe surgimentos distantes e ajuda a posicionar a linha avançada mesmo em trevas profundas.',
                            efeito: 'Melhora leitura de inimigos na linha de frente em 10%',
                            valores: { leituraLinhaPct: 0.10 }
                        }
                    },
                    2: {
                        nivelRequerido: 20,
                        A: {
                            id: 'fenda_espectral',
                            nome: 'Fenda Espectral',
                            categoria: 'Detecção / Deslocamento',
                            icone: '⚔️',
                            desc: 'O Pikeman percebe pequenos deslocamentos ao redor, permitindo interceptar alvos que se ocultam na penumbra.',
                            efeito: 'Aumenta percepção de movimento em 12% em noites profundas',
                            valores: { percepcaoMovePct: 0.12 }
                        },
                        B: {
                            id: 'mural_do_breu',
                            nome: 'Mural do Breu',
                            categoria: 'Controle / Pressão',
                            icone: '🧱',
                            desc: 'A sombra vira uma ferramenta tática: você mantém o foco no centro do combate mesmo sem alcançar o brilho.',
                            efeito: 'Amplia a leitura do centro do campo e melhora a manutenção de ao redor',
                            valores: { focoCentroPct: 0.08 }
                        }
                    },
                    3: {
                        nivelRequerido: 30,
                        A: {
                            id: 'olhar_de_escudo',
                            nome: 'Olhar de Escudo',
                            categoria: 'Defesa / Vigilância',
                            icone: '🛡️',
                            desc: 'Você enxerga os contornos do ataque antes que ele chegue, aumentando sua capacidade de responder no intervalo crítico.',
                            efeito: 'Aumenta a reação defensiva em 15% durante a noite',
                            valores: { defesaReacaoPct: 0.15 }
                        },
                        B: {
                            id: 'sinal_de_guerra',
                            nome: 'Sinal de Guerra',
                            categoria: 'Coordenação / Pressão',
                            icone: '📣',
                            desc: 'A silhueta da ameaça à frente se torna mais clara, permitindo o Pico de pressão e execução sem perder a linha.',
                            efeito: 'Reforça a leitura de alvos em combate por 10%',
                            valores: { combateLeituraPct: 0.10 }
                        }
                    },
                    4: {
                        nivelRequerido: 40,
                        A: {
                            id: 'sentinela_da_madrugada',
                            nome: 'Sentinela da Madrugada',
                            categoria: 'Domínio da Noite',
                            icone: '🌑',
                            desc: 'O Pikeman aprende a conduzir a própria noite: o breu não o cega, as linhas do campo ficam vivas e sua guarda se torna implacável.',
                            efeito: 'Breu máximo permanente em 90% durante 00:00 a 04:00 · visão de campo ativa',
                            valores: { maxEscuridaoPct: 0.90 }
                        },
                        B: {
                            id: 'pressao_da_sombra',
                            nome: 'Pressão da Sombra',
                            categoria: 'Explosão / Controle',
                            icone: '💢',
                            desc: 'Na penumbra, sua pressão se torna mais letal: a leitura do alvo e o timing do golpe ficam mais nítidos.',
                            efeito: '8% de dano adicional e 10% de precisão em combate noturno',
                            valores: { bonusDanoPct: 0.08, bonusPrecisaoPct: 0.10 }
                        }
                    }
                }
            }
        }
    };

    /**
     * Calcula quantos pontos de upgrade o personagem ganhou pelo seu nível.
     * Concede 1 ponto a cada 5 níveis até o teto de 16 (4 skills x 4 tiers).
     * Exemplo: Nv 10 -> 2 pts, Nv 20 -> 4 pts, Nv 40 -> 8 pts, Nv 80+ -> 16 pts.
     */
    function calcularPontosUpgradeGanhos(level) {
        const lvl = Math.max(1, Number(level) || 1);
        return Math.min(Math.floor(lvl / 5), MAX_UPGRADE_POINTS);
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
        // Suporte polimórfico caso chamado como gerarVisaoCliente(skillUpgrades, level)
        if (typeof classe === 'object' && classe !== null && (typeof skillId === 'number' || typeof skillId === 'string')) {
            const upg = classe;
            const lvl = Number(skillId) || 1;
            const normUpg = normalizarSkillUpgrades(upg);
            const ganhos = calcularPontosUpgradeGanhos(lvl);
            const gastos = calcularPontosUpgradeGastos(normUpg);
            return {
                pontosDisponiveis: Math.max(0, ganhos - gastos),
                pontosGanhos: ganhos,
                pontosGastos: gastos
            };
        }

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
