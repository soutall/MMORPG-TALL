# 📋 MAPA DE SKILLS — 12 CLASSES ATIVAS

> Análise gerada a partir de `server.js`, `skills.js`, `index.html` e `classes/*.js`.
> Regra de dano em `server.js:1588`.

**Regra de dano do servidor:**
- **MÁGICO (inteligência):** mago, summoner, curandeiro, roqueiro, arqueiro arcano/astral
- **FÍSICO (força):** guerreiro, bárbaro, pikeman, arqueiro, ladino, sniper, dronemaster
- **Exceções:** dano de pet/invocado → **afinidade** · DoT/envenenamento → **profanidade** · cura → **divindade**
- Todas as classes têm **Dash** (tecla Espaço, CD ~2s, 25 estamina) — não repetido abaixo.
- Escala: dano de skill **+25%/nível** (`dmgSkill`, server.js:836) · mana **+6%/nível** (`mpSkill`, server.js:842).

---

## 🛡️ GUERREIRO — *Tanque / Controle de grupo*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Corte (`corte`) | Dano | **Físico** 12 | **Corpo a corpo** (cone 100px) | — |
| Escudo Erguido (`dash` soltar) | Tanque | — | Frontal 66° | **−70% dano frontal** + baque 30 (stun 0,6s) |
| Tornado de Espada (`tornado`) | Dano/Área | **Físico** 25 | **Ao redor r100px** | Giro 360° |
| Grito de Provocação (`guerreiro_provocacao`) | Suporte | — | **Área r300px** | **Taunt 10s** + **cura 20% HP** |
| Lançamento do Escudo (`guerreiro_escudo_lancamento`) | Dano+Suporte | **Físico** 45 | **Distância 300px** | **Puxa o alvo** + taunt 5s |
| Passiva: Bloqueio | Tanque | — | Frontal | **Anula 100% do dano** (gasta estamina) |
| Passiva: Último Fôlego | Tanque | — | Self | −5/10/15% dano conforme HP baixa |

Refs: `skills.js:12,18,24,30,50,37,43` · `server.js:10173,1317,9668,9940,9691,2334,2351` · `dash.js:31-44`

---

## ⚔️ BÁRBARO — *Bruiser / Sustain*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Machadada (`ataque_barbaro`) | Dano | **Físico** 20 | **Corpo a corpo** (cone 100px) | Cura 8 HP com Fúria ativa |
| Fúria Berserker (`barbaro_furia`) | Buff | — | Self | Lifesteal +8/golpe, +30% vel |
| Giro Descontrolado (`barbaro_giro_descontrolado`) | Dano/Área | **Físico** ~18 total | **Ao redor r90px / 4s** | Sangramento + −10% dano recebido |
| Salto Esmagador (`barbaro_esmagamento`) | Dano/Área | **Físico** 35 | Mira 240px, impacto **r75px** | **Stun 1,25s** (charge) |
| Vínculo Berserker (`barbaro_vinculo`) | Buff | — | Alvo até **420px** | +30% dano, +20% vampiro/vel ataque |
| Passiva: Fúria Crescente | Buff | — | Self | Escala com HP baixo (bônus de dano **não implementado**) |
| Dash: Investida | Dano+Mobil. | **Físico** 45 | **Linha 400px** | Empurra 90px + stun 0,5s |

Refs: `skills.js:200,206,212,218,225,231` · `server.js:8642,8690,8735,8705,9856,4528,1140`

---

## 🌾 PIKEMAN — *DPS corpo a corpo / Anti-controle*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Foicada (`ataque_pikeman`) | Dano | **Físico** 13 | **Corpo a corpo** (cone 100px) | — |
| Giro da Foice (`pikeman_giro`) | Dano/Área | **Físico** 26 | **Ao redor r143px** | Giro 360° |
| Pirueta da Morte (`pikeman_pirueta`) | Dano | **Físico** 18×3 | Alvo único **120px** | 3 cortes |
| Geada da Morte (`pikeman_geada`) | Dano+Debuff | **Físico** 14 | **Ao redor r130px** | **Lentidão 50% / 3s** (só PvE) |
| Execução da Morte (`pikeman_execucao`) | Dano (canal) | **Físico** 42×3 | Alvo **125px** | Canal 3s, trava movimento |
| Passiva: Instinto da Morte | Buff | Físico | Alvo lento/congelado | **+10% crítico, crítico ×1,5, dano ×1,20** |
| Dash: Arranque | Mobilidade | — | Linha 200px | **Invisibilidade 1s** |

Refs: `skills.js:420,426,432,438,444,414` · `server.js:9997,10038,10067,10095,10131,1595`

---

## 🔮 MAGO — *Burst em área / AoE*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Bola de Magia (`ataque_mago`) | Dano | **Mágico** 15 | **Distância 600px** | Projétil |
| Meteoro (`meteoro`) | Dano | **Mágico** 25 | **Área r85px / mira 380px** | Zona de fogo 5s (DoT) |
| Nevasca (`nevasca`) | Dano+Debuff | **Mágico** 6/s | **Área r115px** | **Lentidão 0,75s + gelo** |
| Vulcão Flamejante (`mago_vulcao`) | Dano/Área | **Mágico** 18+4/s | **Área r140px** | **Stun 0,5s** + queimadura |
| Bola Elemental (`mago_bola_elemental`) | Dano+Controle | **Mágico** 60 (×2 fogo) | **Distância 400px** | **Congela 2s** (com Nevasca) ou empurra 60px |
| Dash | Mobilidade | — | 160px | Teleporte |

Refs: `skills.js:58,64,70,76,82` · `server.js:10211,10404,10424,10436,9716`

---

## 🐾 SUMMONER — *Pet / Invocação*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Orbe das Sombras (`ataque_summoner`) | Dano | **Mágico** 6 | **Distância 600px** | Projétil + define alvo do pet |
| Golem/Ogro Guardião (passiva) | Invocação | **Afinidade** 15/golpe | **Corpo a corpo** 38px | Vida 90, **Rugido = taunt 5s**, respawn 12s |
| Esmagamento Sísmico (`comando_pet_ogro`) | Dano+Controle | **Afinidade** 45 | **Área r100px** no pet | **Stun 1,5s** |
| Salto do Ogro (`comando_salto_ogro`) | Dano | **Afinidade** 35 | **Área r70px / mira 360px** | **Stun 0,5s** |
| Golem Colossal (`comando_ogro_colossal`) | Buff | **Afinidade** 30/pedra | Alvo **650px** | Pet ×1,4, cura +50% HP, 20s |
| Golem Sísmico (`summoner_golem_sismico`) | Dano+Debuff | **Afinidade** 55+45%/s | **Área r260px** | Pet **imune**, **lentidão 50%** |
| Comando: Modo do Golem | Suporte | — | Pet | Alterna agressivo/passivo |

Refs: `skills.js:90,96,102,108,114,120` · `server.js:10211,4980,10475,10521,10503,9732`

---

## 🏹 ARQUEIRO — *DPS à distância / AoE*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Flecha Precisa (`ataque_arqueiro`) | Dano | **Físico** 18 | **Distância 672px** | Projétil |
| Chuva de Flechas (`arqueiro_chuva`) | Dano/Área | **Físico** 8/s | **Área r65px / mira 420px** | **Lentidão 0,75s** |
| Disparo Perfurante (`arqueiro_perfurante`) | Dano | **Físico** 32 | **Distância 720px** | **Atravessa todos os alvos** |
| Rajada de Flechas (`arqueiro_rajada`) | Dano (canal) | **Físico** 18–32 | **Cone ~60° / 230px** | Canal 1s, trava movimento |
| Salto + Chuva do Alto (`arqueiro_salto_chuva`) | Mobil.+Dano | **Físico** 15/tick | **Área r120px** | Salto; imune **declarada mas inoperante** |

Refs: `skills.js:128,134,140,146,152` · `server.js:10211,10342,10353,10381,9756`

---

## ✨ ARQUEIRO ARCANO / ASTRAL — *Controle mágico à distância*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Disparo Estelar (`ataque_arqueiro_arcano`) | Dano | **Mágico** 16 | **Distância 260px** | Projétil |
| Chuva de Cometas (`arqueiro_cometas`) | Dano/Área | **Mágico** 22+9/0,5s | **Área r85px / mira 300px** | Zona 4s |
| Orbe de Constelação (`arqueiro_orbe`) | Dano+Controle | **Mágico** 26 | **Área r100px / mira 260px** | **Cativeiro/congela 2s** |
| Cascata Estelar (`arqueiro_cascata`) | Controle | — | **Cone 280px** | **Root/paralisia 2s** (afeta PvP) |
| Buraco Negro Astral (`astral_buraco_negro`) | Dano+Controle | **Mágico** 5 (10%/tick) | **Área r200px / mira 300px** | **Sucção + lentidão 80%** (só mobs) |
| Dash | Mobilidade | — | 240px | Teleporte |

Refs: `skills.js:349,355,361,367,373` · `server.js:9264,9294,9330,9361,9924`

---

## 💀 ROQUEIRO — *Suporte ofensivo / Buff de grupo*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Riff de Guitarra (`ataque_roqueiro`) | Dano | **Mágico** 15 | **Distância ~600px** | Projétil sonoro |
| Bateria Solo (`roqueiro_bateria`) | Dano+Controle | **Mágico** 21/0,5s | **Área r110px** | **Stun 5s (1º hit)**, canal, drena mana |
| Stage Dive (`roqueiro_teleporte`) | Mobilidade | — | Mira **300px** | Teleporte |
| Chamar a Banda (`roqueiro_banda`) | Invocação | **Afinidade** 12 | Persegue | Guitarrista por 15s |
| Grito de Guerra (`roqueiro_grito_guerra`) | Buff | — | **Área r220px** | **+30% crítico, ×1,5 crítico, +5% HP, −10% intervalo** |

Refs: `skills.js:239,245,251,257,263` · `server.js:8754,6441,8826,8853,8875`

---

## 🗡️ LADINO — *Assassino / Stealth*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Estocada de Adaga (`ataque_ladino`) | Dano | **Físico** 12 | **Corpo a corpo** (cone 110px) | — |
| Dança das Adagas (`ladino_danca`) | Dano+Mobil. | **Físico** 15×5 | Alvos até **110px** | 5 teleports + **imunidade total** |
| Névoa Venenosa (`ladino_bomba`) | Dano/Área+Debuff | **Profanidade** 8/0,5s | **Área r90px / arremesso 200px** | **Cegueira** (ataques erram) |
| Camuflagem Sombria (`ladino_camuflagem`) | Stealth+Buff | — | Self | Invisível 10s, **1º golpe ×2** |
| Estrela da Morte (`ladino_estrela`) | Dano/Área | **Físico** 25 | **Área r120px / mira 380px** | **Stun 2s** |
| Passiva: Lâminas Sangrentas | Debuff | Físico→DoT | Alvo atingido | 20% chance de **sangramento 5s** |

Refs: `skills.js:271,277,283,289,295,301` · `server.js:8913,8954,9001,9038,9053,1676`

---

## 🎯 SNIPER — *Single target / One-shot*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Tiro de Barrett (`ataque_sniper`) | Dano | **Físico** 30 | **Linha 384px** | Perfura todos |
| Disparo Supremo (`sniper_apontar`+`sniper_fogo`) | Dano | **Físico** 54×3 = **162** | **Distância 700px** | Mira tracejada, trava movimento 3s |
| Arame Prendedor (`sniper_rede`) | Controle | — | **Área r60px / arremesso 320px** | **Root 3s** (funciona em PvP) |
| Camuflagem Natural (`sniper_camuflagem`) | Stealth | — | Self (mato + roupa dash) | Zera CD da skill 1, congela outros CDs |
| Posição de Franco-Atirador (`sniper_posicao`) | Buff | — | Self | **×2 dano + 100% crítico**, reseta CD do Supremo, detecta invisíveis 420px |

Refs: `skills.js:382,388,394,400,406` · `server.js:9413,9448,9518,9591,9634`

---

## 🤖 DRONEMASTER — *DPS com drone / Suporte*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Disparo do Drone (`ataque_dronemaster`) | Dano | **Físico** 13 | **Distância 124px** (242px no Titã) | Laser do drone orbital |
| Modo Supressão (`dronemaster_supressao`) | Dano/Área | **Físico** 12/tiro | **Área r300px no drone** | Até 3 alvos, 5s |
| Modo Assalto (`dronemaster_assalto`) | Invocação+Dano | **Físico** 26 | **Corpo a corpo 42px** | Drone vira robô de perseguição |
| Caixa de Ferramentas (`dronemaster_caixa`) | Suporte | — | **Área r140px / arremesso 200px** | **Escudo 50% HP / 10s** no grupo |
| Protocolo Titã (`dronemaster_tita`) | Buff | **Físico** 15 | Forma própria 10s | **+30% dano, +20% crítico, −30% dano recebido**, revive 50% ao morrer |
| Passiva: Drone Companheiro | Cura | — | Pessoal | **Cura 2% HP/s** |
| Dash: Escudo de Energia | Suporte | — | Self | **Absorção 50% HP / 3s** |

Refs: `skills.js:310,316,322,328,334,340` · `server.js:9109,9173,9189,9209,9244,4777`

---

## 💚 CURANDEIRO — *Healer / Suporte*
| Skill | Tipo | Dano | Alcance | Efeito |
|---|---|---|---|---|
| Luz Sagrada (`ataque_curandeiro`) | Dano | **Mágico** 12 | **Distância 600px** | Projétil de luz |
| Cura Divina (`curandeiro_cura`) | **Cura** | — | **Alvo/área 320px, raio 140px** | Cura **35 base** (+5%/pt Divindade) |
| Julgamento Sagrado (`curandeiro_julgamento`) | Dano+Debuff | **Mágico** 28 | **Área r78px / mira 340px** | **Lentidão 1,75s** |
| Aura Sagrada (`curandeiro_aura`) | Buff+Cura | — | **Área r190px** | **2% HP/s, −10% dano recebido, +5% dano, +10% cura** (drena 8% mana/s) |
| Cântico Celestial (`curandeiro_cantico`) | Dano+Debuff | **Mágico** 25 | **5 alvos ≤320px** | **−20% defesa / −5% ataque / 10s** |
| Passiva: Ressurreição | Cura | — | **Raio 190px** | Revive aliado com **35% HP** (CD 600s) |
| Dash: Escudo de Área | Suporte | — | **Área r160px** | Escudo 20% HP/10s + empurra inimigos 220px |

Refs: `skills.js:160,166,172,178,185,192` · `server.js:10211,10300,10324,10279,9793,985,1164`

---

## 📊 RESUMO POR PERFIL

| Perfil | Classes |
|---|---|
| **Tanque** | Guerreiro |
| **Bruiser / Sustain** | Bárbaro, Pikeman |
| **DPS corpo a corpo** | Pikeman, Ladino, Bárbaro |
| **DPS à distância** | Arqueiro, Sniper, Dronemaster |
| **Burst mágico em área** | Mago, Arqueiro Arcano |
| **Controle / CC** | Mago, Arqueiro Arcano, Pikeman, Roqueiro, Ladino |
| **Invocação / Pet** | Summoner, Dronemaster, Roqueiro |
| **Healer / Suporte** | Curandeiro, Guerreiro, Dronemaster |
| **Stealth** | Ladino, Sniper, Pikeman (1s) |

**Cobertura de dano:**
- Físico: guerreiro, bárbaro, pikeman, arqueiro, ladino, sniper, dronemaster
- Mágico: mago, summoner, curandeiro, roqueiro, arqueiro arcano
- Misto (pet/DoT escala em afinidade/profanidade): summoner, ladino, roqueiro

---

## ⚠️ Divergências cliente × servidor (o servidor manda)

| Problema | Detalhe |
|---|---|
| **CDs só no cliente** (sem trava server-side) | meteoro, nevasca, chuva do arqueiro, perfurante, rajada, tornado, salto esmagador, cura e julgamento do curandeiro |
| **Durações da ficha (`skills.js`) erradas** | Nevasca 8s (não 24s) · Chuva do Arqueiro 2,3s (não 7s) · Vulcão 10s (não 6s) · Golem Colossal 20s (não 4s) · Stun da Bateria 5s (não 1,25s) |
| **Tipo de dano errado na ficha** | `skills.js:241` rotula o dano do Roqueiro como "físico", mas o servidor escala com **Inteligência** |
| **Passiva não implementada** | Bônus de dano da "Fúria Crescente" (Bárbaro) documentado mas sem efeito |
| **Imunidade inoperante** | `p.imune` do Salto + Chuva do Alto nunca é lida em `aplicarDanoJogador` |
| **CD divergente** | `dronemaster_assalto`: 15s no servidor × 10s no cliente |
| **Miras divergentes** | Meteoro 380px (ficha 160) · Nevasca 350px · Chuva 420px (ficha 150) · Julgamento 340px (ficha 140) |
