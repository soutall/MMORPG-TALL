// ============================================================================
// mapa-editor.js — EDITOR DE MAPA IN-GAME (Exclusivo Admin)
// ----------------------------------------------------------------------------
// Abre uma janela dentro do jogo para colocar no mapa: árvores (vários modelos,
// duplas...), pedras, montanhas, blocos, paredes, moitas/esconderijos, plantas,
// rosas/flores, quadrados de água animados e decorações.
//
// • Colisão e Camadas: cada objeto tem colisão (liga/desliga + tamanho da caixa)
//   e camada (Chão / Meio / Frente) — editáveis nas abas COLISÃO e CAMADA
//   ("o outro editor"). Também dá para PINTAR zonas livres de colisão e de frente.
// • Efeitos: cada objeto aceita os efeitos persistentes que já existem no jogo
//   (tocha, fogo, lâmpada, vaga-lumes, bolhas, cristais, espinhos, folhas...).
// • Ferramentas: colocar onde o mouse estiver, arrastar para desenhar (drag),
//   segurar SHIFT para pintar vários seguidos onde o mouse passar, apagar,
//   mover, selecionar, duplicar, ir até, travar (bloqueia edição), salvar/limpar.
// • Persistência: map_objetos.json no servidor + broadcast para todos os clientes.
// ============================================================================
(function (global) {
    'use strict';

    // ============================================================================
    // CATÁLOGO DE OBJETOS (espelho do TIPOS_OBJETOS_MAPA do servidor)
    // ============================================================================
    var CATALOGO = {};
    var PALETA = [
        // ----- Árvores -----
        ['arvore', 'Árvore', '🌳', 46, 64, true, 'meio', 'arvore'],
        ['arvore_pinheiro', 'Pinheiro', '🌲', 40, 74, true, 'meio', 'arvore'],
        ['arvore_florida', 'Árvore com Flores', '🌸', 46, 64, true, 'meio', 'arvore'],
        ['arvore_dupla', 'Árvore Dupla', '🌳🌳', 90, 70, true, 'meio', 'arvore'],
        ['arvore_outono', 'Árvore de Outono', '🍂', 46, 64, true, 'meio', 'arvore'],
        ['palmeira', 'Palmeira', '🌴', 42, 84, true, 'meio', 'arvore'],
        ['arvore_sakura', 'Árvore Sakura', '🌸', 46, 64, true, 'meio', 'arvore'],
        ['arvore_carvalho', 'Carvalho Antigo', '🌳', 56, 76, true, 'meio', 'arvore'],
        ['arvore_pantano', 'Salgueiro do Pântano', '🌳', 70, 98, true, 'meio', 'arvore', ['pantano']],
        ['arvore_gelo', 'Pinheiro Boreal', '🌲', 58, 106, true, 'meio', 'arvore', ['neve', 'taiga', 'picos_gelo', 'plataforma_gelo']],
        ['arvore_deserto', 'Acácia do Deserto', '🌳', 78, 86, true, 'meio', 'arvore', ['deserto', 'canyon']],
        ['arvore_selva', 'Árvore Gigante da Selva', '🌴', 96, 132, true, 'meio', 'arvore', ['selva', 'recife_cristal']],
        ['arvore_profana', 'Árvore Retorcida Profanada', '🪾', 72, 106, true, 'meio', 'arvore', ['profanado', 'lamentos', 'obsidiana']],
        ['arvore_cristal', 'Árvore de Cristal', '💎', 76, 112, true, 'meio', 'arvore', ['cristais', 'recife_cristal']],
        ['muda', 'Muda', '🌱', 22, 26, false, 'chao', 'arvore'],
        // ----- Paredes Vivas (Labirintos) -----
        ['parede_viva', 'Parede Viva (Sebe)', '🌿', 84, 30, true, 'meio', 'sebe'],
        ['parede_viva_florida', 'Sebe com Flores', '🌺', 84, 30, true, 'meio', 'sebe'],
        ['parede_viva_curva', 'Canto de Sebe', '🌿', 70, 70, true, 'meio', 'sebe'],
        ['roseiral', 'Roseiral', '🌹', 84, 30, true, 'meio', 'sebe'],
        // ----- Pedras -----
        ['pedra', 'Pedra', '🪨', 40, 30, true, 'meio', 'pedra'],
        ['pedra2', 'Pedra Grande', '🪨', 46, 36, true, 'meio', 'pedra'],
        ['rocha_grande', 'Rocha Gigante', '🗿', 96, 58, true, 'meio', 'pedra'],
        ['pedregulho', 'Pedregulho', '⛰️', 30, 20, true, 'meio', 'pedra'],
        ['pedra_pontuda', 'Pedra Pontuda', '🗻', 36, 46, true, 'meio', 'pedra'],
        ['pedra_musgo', 'Pedra com Musgo', '🪨', 44, 30, true, 'meio', 'pedra'],
        ['laje', 'Laje de Pedra', '🪨', 34, 14, true, 'chao', 'pedra'],
        ['pilha_pedra', 'Pilha de Pedras', '⛰️', 40, 40, true, 'meio', 'pedra'],
        ['cristais_rocha', 'Rocha de Cristais', '💎', 46, 42, true, 'meio', 'pedra'],
        ['pedra_lunar', 'Pedra Lunar', '🌙', 40, 32, true, 'meio', 'pedra'],
        // ----- Montanhas / Blocos -----
        ['montanha', 'Montanha', '🏔️', 160, 110, true, 'meio', 'montanha'],
        ['bloco_pedra', 'Bloco de Pedra', '🧱', 60, 46, true, 'meio', 'montanha'],
        ['bloco_granito', 'Bloco de Granito', '🟫', 48, 40, true, 'meio', 'montanha'],
        ['coluna', 'Coluna', '🏛️', 36, 92, true, 'frente', 'montanha'],
        ['obelisco', 'Obelisco', '🔺', 40, 108, true, 'frente', 'montanha'],
        ['ruina', 'Ruína', '🏚️', 82, 58, true, 'meio', 'montanha'],
        ['muro_pedra', 'Muro de Pedra', '🧱', 90, 40, true, 'meio', 'montanha'],
        ['montanha_gigante', 'Montanha Colossal', '🏔️', 320, 220, true, 'meio', 'montanha'],
        ['montanha_neve', 'Montanha Nevada', '🏔️', 280, 210, true, 'meio', 'montanha', ['neve', 'taiga', 'picos_gelo', 'oceano_gelo']],
        ['montanha_vulcanica', 'Montanha Vulcânica', '🌋', 280, 210, true, 'meio', 'montanha', ['vulcao', 'obsidiana']],
        ['iceberg_editor', 'Iceberg Esculpido', '🧊', 150, 110, true, 'meio', 'montanha', ['plataforma_gelo', 'oceano_gelo']],
        ['duna_gigante', 'Duna Gigante', '🏜️', 250, 150, false, 'chao', 'montanha', ['deserto', 'canyon']],
        ['muralha', 'Muralha Alta', '🏰', 120, 70, true, 'frente', 'montanha'],
        ['portao', 'Portão de Fazenda', '🚪', 60, 70, true, 'meio', 'montanha'],
        ['ponte', 'Ponte de Madeira', '🎢', 110, 40, true, 'meio', 'montanha'],
        // ----- Paredes / Estruturas -----
        ['parede_tijolo', 'Parede de Tijolo', '🧱', 90, 32, true, 'meio', 'parede'],
        ['muro_pedra_vertical', 'Muro de Pedra Vertical', '🧱', 38, 92, true, 'meio', 'parede'],
        ['muro_pedra_diagonal', 'Muro de Pedra Diagonal', '🧱', 110, 110, true, 'meio', 'parede'],
        ['parede_madeira', 'Parede de Madeira', '🪵', 90, 34, true, 'meio', 'parede'],
        ['parede_madeira_vertical', 'Parede de Madeira Vertical', '🪵', 38, 94, true, 'meio', 'parede'],
        ['parede_tijolo_vertical', 'Parede de Tijolo Vertical', '🧱', 38, 94, true, 'meio', 'parede'],
        ['parede_gelo', 'Muralha de Gelo', '🧊', 100, 48, true, 'meio', 'parede', ['neve', 'taiga', 'picos_gelo', 'oceano_gelo']],
        ['muro_pantano', 'Muro de Raízes do Pântano', '🌿', 100, 46, true, 'meio', 'parede', ['pantano', 'lamentos']],
        ['cerca', 'Cerca', '🚧', 84, 26, true, 'meio', 'parede'],
        ['cerca_vertical', 'Cerca Vertical', '🚧', 28, 82, true, 'meio', 'parede'],
        ['torre', 'Torre', '🗼', 60, 110, true, 'frente', 'parede'],
        ['parede_troncos', 'Palicada de Troncos', '🪵', 90, 42, true, 'meio', 'parede'],
        ['tocha', 'Tocha', '🔥', 22, 48, false, 'meio', 'parede'],
        ['fogueira', 'Fogueira', '🔥', 40, 34, false, 'chao', 'parede'],
        // ----- Vegetação -----
        ['moita', 'Moita', '🌿', 46, 30, false, 'meio', 'vegetacao'],
        ['moita2', 'Moita Grande', '🌿', 56, 36, false, 'meio', 'vegetacao'],
        ['moita_esconderijo', 'Moita Esconderijo', '🌳', 68, 42, true, 'meio', 'vegetacao'],
        ['arbusto', 'Arbusto', '🌱', 34, 24, false, 'meio', 'vegetacao'],
        ['grama', 'Grama', '🌾', 36, 20, false, 'chao', 'vegetacao'],
        ['grama_alta', 'Touceira de Grama Alta', '🌾', 48, 44, false, 'chao', 'vegetacao', ['santuario', 'floresta', 'selva', 'taiga']],
        ['juncos_pantano', 'Juncos do Pântano', '🌿', 60, 72, false, 'chao', 'vegetacao', ['pantano', 'lamentos']],
        ['raizes_pantano', 'Raízes Expostas', '🌱', 86, 46, true, 'meio', 'vegetacao', ['pantano', 'lamentos', 'selva']],
        ['arbusto_desertico', 'Arbusto Espinhoso do Deserto', '🌵', 54, 48, true, 'meio', 'vegetacao', ['deserto', 'canyon', 'obsidiana']],
        ['cristal_colossal', 'Cristal Colossal', '💎', 92, 130, true, 'meio', 'vegetacao', ['cristais', 'recife_cristal', 'tempestade']],
        ['rocha_lava', 'Rocha Vulcânica Incandescente', '🌋', 74, 62, true, 'meio', 'vegetacao', ['vulcao', 'obsidiana']],
        ['capim', 'Capim', '🍃', 30, 24, false, 'chao', 'vegetacao'],
        ['samambaia', 'Samambaia', '🌿', 38, 26, false, 'chao', 'vegetacao'],
        ['bambu', 'Bambu', '🎋', 26, 72, true, 'meio', 'vegetacao'],
        ['cogumelo', 'Cogumelo', '🍄', 26, 24, false, 'chao', 'vegetacao'],
        ['tronco', 'Tronco Caído', '🪵', 46, 22, true, 'meio', 'vegetacao'],
        ['toco', 'Toco', '🪑', 22, 16, false, 'chao', 'vegetacao'],
        ['arbusto_florido', 'Arbusto Florido', '🌸', 40, 28, false, 'meio', 'vegetacao'],
        ['samambaia_gigante', 'Samambaia Gigante', '🌿', 54, 44, false, 'meio', 'vegetacao'],
        ['planta_carnivora', 'Planta Carnívora', '🪴', 34, 40, true, 'meio', 'vegetacao'],
        ['cogumelo_gigante', 'Cogumelo Gigante', '🍄', 60, 52, false, 'meio', 'vegetacao'],
        ['campo_flores', 'Campo de Flores', '🌸', 96, 40, false, 'chao', 'vegetacao'],
        ['caminho_pedras', 'Caminho de Pedras', '🪨', 100, 34, false, 'chao', 'vegetacao'],
        ['teia', 'Teia de Aranha', '🕸️', 40, 40, false, 'frente', 'vegetacao'],
        ['osso', 'Pilha de Ossos', '🦴', 40, 26, false, 'chao', 'vegetacao'],
        // ----- Plantas / Flores -----
        ['planta', 'Planta', '🌱', 30, 26, false, 'chao', 'flor'],
        ['planta_dupla', 'Planta Dupla', '🌿', 62, 26, false, 'chao', 'flor'],
        ['rosa_vermelha', 'Rosa Vermelha', '🌹', 26, 24, false, 'chao', 'flor'],
        ['rosa_amarela', 'Rosa Amarela', '🌻', 26, 24, false, 'chao', 'flor'],
        ['flor_roxa', 'Flor Roxa', '💜', 24, 26, false, 'chao', 'flor'],
        ['girassol', 'Girassol', '🌻', 26, 42, false, 'chao', 'flor'],
        ['tulipa', 'Tulipa', '🌷', 22, 30, false, 'chao', 'flor'],
        ['cacto_florido', 'Cacto Florido', '🌵', 30, 46, true, 'meio', 'flor'],
        ['flor_branca', 'Flor Branca', '🌼', 22, 24, false, 'chao', 'flor'],
        ['flor_laranja', 'Flor Laranja', '🏵️', 24, 26, false, 'chao', 'flor'],
        ['flor_azul', 'Flor Azul', '💠', 22, 26, false, 'chao', 'flor'],
        // ----- Água -----
        ['agua_quadrado', 'Quadrado de Água', '💧', 64, 64, false, 'meio', 'agua'],
        ['lagoa', 'Lagoa', '🏞️', 130, 92, false, 'meio', 'agua'],
        ['canal', 'Canal de Água', '💦', 130, 42, false, 'meio', 'agua'],
        // ----- Decoração -----
        ['banco', 'Banco', '🪑', 46, 20, true, 'meio', 'decor'],
        ['lamparina', 'Lamparina', '🏮', 22, 40, false, 'meio', 'decor'],
        ['estaca_flamejante', 'Estaca Flamejante', '🔥', 24, 50, false, 'meio', 'decor'],
        ['bandeira', 'Bandeira', '🚩', 18, 48, false, 'meio', 'decor'],
        ['ancoradouro', 'Ancoradouro', '⛵', 76, 44, true, 'meio', 'decor'],
        ['fonte', 'Fonte', '⛲', 70, 60, true, 'meio', 'decor'],
        ['poco', 'Poço', '🕳️', 56, 60, true, 'meio', 'decor'],
        ['caixa', 'Caixa de Madeira', '📦', 30, 24, true, 'meio', 'decor'],
        ['barril', 'Barril', '🛢️', 26, 34, true, 'meio', 'decor'],
        ['carroca', 'Carroça', '🛒', 64, 44, true, 'meio', 'decor'],
        ['placa', 'Placa', '🪧', 24, 44, false, 'meio', 'decor'],
        ['ruina_ancestral', 'Ruína Ancestral Submersa', '🏛️', 96, 72, true, 'meio', 'decor', ['plataforma_gelo', 'oceano_gelo']],
        // ----- Floresta dos Sussurros (árvores animadas) -----
        ['arvore_florestal', 'Árvore da Floresta', '🌳', 48, 68, true, 'meio', 'floresta'],
        ['arvore_gigante_f', 'Árvore Gigante', '🌳', 70, 96, true, 'meio', 'floresta'],
        ['pinheiro_silvestre', 'Pinheiro Silvestre', '🌲', 44, 88, true, 'meio', 'floresta'],
        ['salgueiro', 'Salgueiro Chorão', '🌳', 60, 66, true, 'meio', 'floresta'],
        ['arvore_morta', 'Árvore Morta', '🪾', 42, 62, true, 'meio', 'floresta'],
        ['tronco_musgo', 'Tronco com Musgo', '🪵', 50, 24, true, 'meio', 'floresta'],
        // ----- Cabanas / Construções de Floresta -----
        ['cabana_grande', 'Cabana Grande', '🏡', 112, 90, true, 'meio', 'floresta'],
        ['cabana_media', 'Cabana Média', '🏠', 88, 72, true, 'meio', 'floresta'],
        ['cabana_palha', 'Cabana de Palha', '🛖', 84, 70, true, 'meio', 'floresta'],
        // ----- Fogueiras de Floresta -----
        ['fogueira_pedra', 'Fogueira de Pedras', '🔥', 48, 38, false, 'chao', 'floresta'],
        ['fogueira_grande', 'Fogueira Grande', '🔥', 62, 46, false, 'chao', 'floresta'],
        // ----- Água de Floresta -----
        ['lago_grande', 'Lago Grande', '🏞️', 180, 120, false, 'meio', 'floresta'],
        ['riacho', 'Riacho', '💦', 130, 34, false, 'meio', 'floresta'],
        // ----- Decoração de Floresta -----
        ['colmeia', 'Colmeia', '🍯', 26, 32, true, 'meio', 'floresta'],
        ['cogumelos_grupo', 'Grupo de Cogumelos', '🍄', 40, 26, false, 'chao', 'floresta'],
        ['toco_musgo', 'Toco com Musgo', '🪵', 26, 20, false, 'chao', 'floresta'],
        ['galhos', 'Galhos Caídos', '🪾', 46, 18, false, 'chao', 'floresta'],
        ['pilha_lenha', 'Pilha de Lenha', '🪵', 40, 28, true, 'meio', 'floresta'],
        ['torre_vigia', 'Torre de Vigia', '🗼', 70, 120, true, 'frente', 'floresta'],
        ['barco_lago', 'Barco do Lago', '🛶', 56, 30, false, 'meio', 'floresta'],
        ['pier_madeira', 'Píer de Madeira', '🎣', 120, 40, true, 'meio', 'floresta'],
        ['ponte_pedra', 'Ponte de Pedra', '🌉', 130, 44, true, 'meio', 'floresta'],
        ['secador_peles', 'Secador de Peles', '🦌', 54, 56, false, 'meio', 'floresta'],
        ['arvore_betula', 'Bétula', '🌳', 40, 64, true, 'meio', 'floresta'],
        ['entrada_caverna', 'Entrada de Caverna', '🕳️', 120, 80, true, 'meio', 'floresta'],
        ['horta', 'Horta', '🥬', 90, 44, false, 'chao', 'floresta'],
        // ----- Zonas pintadas -----
        ['zona_colisao', 'Zona de Colisão (livre)', '⛔', 40, 40, true, 'meio', 'zona'],
        ['zona_frente', 'Zona de Frente (livre)', '🌿', 40, 40, false, 'frente', 'zona']
    ];

    PALETA.forEach(function (p) {
        var o = { nome: p[1], icone: p[2], w: p[3], h: p[4], colisao: p[5], camada: p[6], grupo: p[7], biomas: p[8] || [], agua: false };
        o.pintar = pintorParaTipo(p[0]);
        CATALOGO[p[0]] = o;
    });

    var GRUPOS = [
        ['todas', '🌐 Todas'],
        ['arvore', '🌳 Árvores'],
        ['pedra', '🪨 Pedras'],
        ['montanha', '🏔️ Montanhas/Blocos'],
        ['parede', '🧱 Paredes'],
        ['sebe', '🌳 Paredes Vivas (Labirinto)'],
        ['vegetacao', '🌿 Vegetação'],
        ['flor', '🌹 Flores/Plantas'],
        ['agua', '💧 Água'],
        ['floresta', '🌲 Floresta'],
        ['decor', '✨ Decoração'],
        ['zona', '🚧 Zonas (colisão/frente)']
    ];
    var BIOMAS_CATALOGO = [
        ['todos', '🌐 Todos os biomas'], ['santuario', '🌿 Santuário'], ['floresta', '🌲 Floresta sombria'],
        ['tempestade', '⚡ Pico dos relâmpagos'], ['deserto', '🏜️ Deserto'], ['cristais', '💎 Vale dos cristais'],
        ['neve', '❄️ Tundra gélida'], ['pantano', '🐊 Pântano nebuloso'], ['profanado', '💀 Terra profanada'],
        ['vulcao', '🌋 Terras vulcânicas'], ['selva', '🌴 Selva proibida'], ['obsidiana', '♨️ Terras de obsidiana'],
        ['lamentos', '🍂 Floresta dos lamentos'], ['taiga', '🌲 Taiga boreal'], ['picos_gelo', '🧊 Picos de gelo'],
        ['canyon', '🟠 Canyon'], ['recife_cristal', '🐚 Costa cristalina'],
        ['plataforma_gelo', '🏛️ Plataforma ancestral'], ['oceano_gelo', '🌊 Oceano de gelo']
    ];
    var meBiomaCatalogo = 'todos';

    var EFX_LIST = [
        ['nenhum', 'Sem efeito'],
        ['tocha', '🔥 Tocha'],
        ['fogo', '🔥 Fogueira'],
        ['lampada', '💡 Lâmpada'],
        ['holofote', '🔦 Holofote'],
        ['vaga_lumes', '✨ Vagalumes'],
        ['agua_corrente', '💧 Água corrente'],
        ['bolhas', '🫧 Bolhas'],
        ['espinhos', '🌵 Espinhos'],
        ['cristais', '💎 Cristais'],
        ['runas', '🔮 Runas'],
        ['folhas', '🍃 Folhas ao vento'],
        ['petalas', '🌸 Pétalas'],
        ['grama', '🌾 Grama balançando'],
        ['borboletas', '🦋 Borboletas'],
        ['neve', '❄️ Neve']
    ];
    var EFX_CORES = {
        tocha: '#ff9f1c', fogo: '#ff6b35', lampada: '#ffd166', holofote: '#fff3b0',
        vaga_lumes: '#f7e36d', agua_corrente: '#38bdf8', bolhas: '#8de7ff',
        espinhos: '#a7d129', cristais: '#7ee7ff', runas: '#75f0ca',
        folhas: '#7abf45', petalas: '#ff86b7', grama: '#72b75b', borboletas: '#d99cff', neve: '#e8f7ff'
    };
    var ANIMACOES_SPRITE = [
        ['nenhuma', 'Sem animação'],
        ['brisa_suave', 'Brisa suave'],
        ['vento_constante', 'Vento constante'],
        ['rajada_vento', 'Rajada de vento'],
        ['copa_ondulante', 'Copa ondulante'],
        ['folhas_tremulas', 'Folhas trêmulas'],
        ['arvore_tempestade', 'Árvore na tempestade'],
        ['respirar', 'Respirar'],
        ['pulsar', 'Pulsar'],
        ['batimento', 'Batimento cardíaco'],
        ['esticar', 'Esticar e relaxar'],
        ['compressao', 'Compressão elástica'],
        ['crescer', 'Crescer e diminuir'],
        ['flutuar', 'Flutuar'],
        ['levitar_lento', 'Levitar lentamente'],
        ['saltitar', 'Saltitar'],
        ['balanco_vertical', 'Balanço vertical'],
        ['balanco_horizontal', 'Balanço horizontal'],
        ['inclinar', 'Inclinar'],
        ['balanco_profundo', 'Balanço profundo'],
        ['tronco_flexivel', 'Tronco flexível'],
        ['ondular', 'Ondular'],
        ['tremular', 'Tremular'],
        ['sacudir', 'Sacudir'],
        ['tremor', 'Tremor'],
        ['giro_horario', 'Giro horário'],
        ['giro_lento', 'Giro lento'],
        ['oscilacao', 'Oscilação dupla'],
        ['deriva_vento', 'Deriva com o vento'],
        ['vibracao_folhas', 'Vibração de folhas'],
        ['squash_stretch', 'Squash e stretch']
    ];
    var ANIMACOES_SPRITE_VALIDAS = ANIMACOES_SPRITE.map(function (animacao) { return animacao[0]; });

    // ============================================================================
    // ESTADO
    // ============================================================================
    window.mapaObjetos = [];
    var mapaObjetoIdsConfirmados = new Set();
    var meUltimoAvisoFalhaAutoSave = 0;
    window.mapaEditorAtivo = false;
    window.mapaEditorTravado = false;
    window.mapaEditorMinimizado = false;
    window.mapaEditorTab = 'objetos';
    var meSelId = null;
    var meFerramenta = 'colocar';
    var meCategoria = 'todas';
    var meShowColisoes = true;
    var meShowCamadas = true;
    var meShift = false;
    var mePintando = false;
    var meTracoColisao = null;
    var meMoverObj = null;
    var meOffX = 0, meOffY = 0;
    var meLastX = -1e9, meLastY = -1e9;
    var meGhostX = -1e9, meGhostY = -1e9;
    var meSnap = false;
    var mePlacementGrid = false;
    var meDragPincel = true;
    var meUltimoMapa = null;
    var brush = { tipo: 'arvore', asset: '', assetRect: null, assetMask: null, assetMaskRaster: null, assetMaskMode: '', spriteId: '', categoria: 'Geral', escala: 1, escalaX: 1, escalaY: 1, rotacao: 0, variante: 0, camada: 'objects', colisao: true, efeito: '', efeitoCor: '#ffd166', animacao: 'nenhuma', zonaW: 40, zonaH: 40 };
    var spritesMapaCatalogo = [];
    var spritePaletteItems = [];
    var paletteCategory = 'Todas';
    var imagensSpritesMapa = {};
    var assetCropDrag = null;
    var assetCropLayout = null;

    function urlSpriteMapa(nome) {
        return 'sprites/Objetos/editor/' + encodeURIComponent(nome);
    }

    function obterImagemSpriteMapa(nome) {
        if (!nome) return null;
        if (!imagensSpritesMapa[nome]) {
            imagensSpritesMapa[nome] = new Image();
            imagensSpritesMapa[nome].src = urlSpriteMapa(nome);
        }
        return imagensSpritesMapa[nome];
    }

    function dimensoesSpriteMapa(nome, recorte) {
        var imagem = obterImagemSpriteMapa(nome);
        if (imagem && imagem.complete && imagem.naturalWidth > 0 && imagem.naturalHeight > 0) {
            var largura = recorte && Number.isFinite(recorte.w) ? recorte.w : imagem.naturalWidth;
            var altura = recorte && Number.isFinite(recorte.h) ? recorte.h : imagem.naturalHeight;
            var fator = Math.min(1, 500 / Math.max(largura, altura));
            return { w: Math.max(4, Math.round(largura * fator)), h: Math.max(4, Math.round(altura * fator)) };
        }
        return { w: 64, h: 64 };
    }

    function dimensoesImagemSprite(imagem) {
        return {
            w: imagem ? Number(imagem.naturalWidth || imagem.width) || 0 : 0,
            h: imagem ? Number(imagem.naturalHeight || imagem.height) || 0 : 0
        };
    }

    function assetRectValido(recorte, imagem) {
        var dimensoes = dimensoesImagemSprite(imagem);
        return !!(recorte && imagem && dimensoes.w > 0 && dimensoes.h > 0 &&
            Number.isFinite(recorte.x) && Number.isFinite(recorte.y) && Number.isFinite(recorte.w) && Number.isFinite(recorte.h) &&
            recorte.x >= 0 && recorte.y >= 0 && recorte.w >= 1 && recorte.h >= 1 &&
            recorte.x + recorte.w <= dimensoes.w && recorte.y + recorte.h <= dimensoes.h);
    }

    function assetMaskValida(mask) {
        return Array.isArray(mask) && mask.length >= 3 && mask.length <= 256 &&
            mask.every(function (point) {
                return point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
                    point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
            });
    }

    function assetMaskRasterValida(mask, region) {
        if (!mask || !region || !Number.isInteger(mask.w) || !Number.isInteger(mask.h) ||
            mask.w !== region.w || mask.h !== region.h || mask.w < 1 || mask.h < 1 ||
            mask.w * mask.h > 2000000 || typeof mask.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(mask.data)) return false;
        return Math.ceil(mask.w * mask.h / 8) === Math.floor(mask.data.length * 3 / 4) -
            (mask.data.endsWith('==') ? 2 : (mask.data.endsWith('=') ? 1 : 0));
    }

    var lassoDiagEnabled = !!(global.location && new URLSearchParams(global.location.search).get('lasso-diagnostics') === '1');
    var lassoDiagTarget = null;
    var lassoDiagTargetSelector = null;
    var lassoDiagLogged = new Set();
    var lassoDiagMaskHashes = new WeakMap();
    function lassoRasterResumo(mask) {
        if (!mask || typeof mask.data !== 'string') return null;
        var packed = atob(mask.data), selectedPixels = 0;
        for (var i = 0; i < packed.length; i++) {
            var value = packed.charCodeAt(i);
            while (value) {
                value &= value - 1;
                selectedPixels++;
            }
        }
        return {
            width: mask.w, height: mask.h, selectedPixels: selectedPixels,
            transparentPixels: Math.max(0, mask.w * mask.h - selectedPixels)
        };
    }

    function lassoDiagFingerprint(o) {
        var rect = o && (o.assetRect || o.region) || {};
        var raster = o && (o.assetMaskRaster || o.maskRaster);
        var hash = '';
        if (raster && typeof raster.data === 'string') {
            hash = lassoDiagMaskHashes.get(raster);
            if (!hash) {
                hash = 2166136261;
                for (var i = 0; i < raster.data.length; i++) {
                    hash ^= raster.data.charCodeAt(i);
                    hash = Math.imul(hash, 16777619);
                }
                hash = (hash >>> 0).toString(16);
                lassoDiagMaskHashes.set(raster, hash);
            }
        }
        return [o && o.asset || '', rect.x, rect.y, rect.w, rect.h, hash].join('|');
    }

    function lassoDiagAlphaCount(canvas) {
        var context = canvas && canvas.getContext && canvas.getContext('2d');
        if (!context || !canvas.width || !canvas.height) return null;
        var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        var alphaPixels = 0;
        for (var i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) alphaPixels++;
        return alphaPixels;
    }

    function lassoDiagnostico(stage, o, sourceImage, finalTexture, details) {
        if (!lassoDiagEnabled || !o || o.assetMaskMode !== 'auto') return;
        var fingerprint = lassoDiagFingerprint(o);
        if (lassoDiagTargetSelector &&
            lassoDiagTargetSelector !== String(o.id || '') &&
            lassoDiagTargetSelector !== String(o.spriteId || '') &&
            lassoDiagTargetSelector !== String(o.asset || '')) return;
        if (stage === 'SELECTION') lassoDiagTarget = fingerprint;
        if (lassoDiagTarget && lassoDiagTarget !== fingerprint) return;
        if (!lassoDiagTarget) lassoDiagTarget = fingerprint;
        var onceKey = stage + '|' + String(o.id || o.spriteId || o.asset || '');
        if (stage !== 'PLACEMENT' && stage !== 'SERIALIZATION' && lassoDiagLogged.has(onceKey)) return;
        lassoDiagLogged.add(onceKey);
        var region = o.assetRect || o.region || null;
        var dim = sourceImage ? dimensoesImagemSprite(sourceImage) : null;
        console.info('[LASSO DIAG ' + stage + ']', {
            id: o.id || null,
            spriteId: o.spriteId || null,
            asset: o.asset || null,
            sourceTexture: o.asset || null,
            sourceTextureSize: dim,
            sourceXY: region ? { x: region.x, y: region.y } : null,
            sourceRegion: region,
            mapBounds: Number.isFinite(o.x) ? { x: o.x, y: o.y, w: o.w, h: o.h } : null,
            hasRasterMask: assetMaskRasterValida(o.assetMaskRaster || o.maskRaster, region),
            mask: lassoRasterResumo(o.assetMaskRaster || o.maskRaster),
            finalTexture: finalTexture ? {
                type: finalTexture.tagName === 'CANVAS' ? 'masked-canvas' : 'image',
                width: finalTexture.width,
                height: finalTexture.height,
                alphaPixels: lassoDiagAlphaCount(finalTexture)
            } : null,
            details: details || null
        });
    }

    window.meDiagnosticarLaco = function (target) {
        lassoDiagEnabled = target !== false;
        lassoDiagTarget = null;
        lassoDiagTargetSelector = typeof target === 'string' ? target : null;
        lassoDiagLogged.clear();
        console.info('[LASSO DIAG]', lassoDiagEnabled
            ? 'Ativo: registros de seleção, preview, colocação, serialização, load e render final serão emitidos no console.'
            : 'Desativado.');
        return lassoDiagEnabled;
    };

    window.meExportarTexturaLaco = function (id) {
        var object = (window.mapaObjetos || []).find(function (item) { return item && item.id === id; });
        if (!object || object.tipo !== 'sprite_personalizado') throw new Error('Objeto sprite não encontrado: ' + id);
        var image = obterImagemSpriteMapa(object.asset);
        if (!image || !image.complete) throw new Error('A spritesheet ainda não terminou de carregar.');
        if (mascaraAutomaticaAusente(object, obterAssetRect(object, image))) {
            throw new Error('A máscara raster do Laço 2 não está disponível neste objeto.');
        }
        var texture = obterSpriteComMascara(object, image);
        if (!texture) throw new Error('Não foi possível produzir a textura final mascarada.');
        return texture.toDataURL('image/png');
    };

    function limparPixelsForaMascara(imageData, width, height, rasterMask) {
        var packed = atob(rasterMask.data);
        var sameSize = width === rasterMask.w && height === rasterMask.h;
        for (var y = 0; y < height; y++) {
            var maskY = sameSize ? y : Math.min(rasterMask.h - 1, Math.floor(y / height * rasterMask.h));
            for (var x = 0; x < width; x++) {
                var maskX = sameSize ? x : Math.min(rasterMask.w - 1, Math.floor(x / width * rasterMask.w));
                var maskIndex = maskY * rasterMask.w + maskX;
                if ((packed.charCodeAt(maskIndex >> 3) & (1 << (maskIndex & 7))) !== 0) continue;
                var colorIndex = (y * width + x) * 4;
                imageData.data[colorIndex] = 0;
                imageData.data[colorIndex + 1] = 0;
                imageData.data[colorIndex + 2] = 0;
                imageData.data[colorIndex + 3] = 0;
            }
        }
        return imageData;
    }

    function obterAssetRect(o, imagem) {
        var dimensoes = dimensoesImagemSprite(imagem);
        return assetRectValido(o && o.assetRect, imagem) ? o.assetRect : { x: 0, y: 0, w: dimensoes.w, h: dimensoes.h };
    }

    var assetMascaraAutoInvalidaAvisada = new Set();
    function mascaraAutomaticaAusente(o, region) {
        if (!o || o.assetMaskMode !== 'auto' || assetMaskRasterValida(o.assetMaskRaster, region)) return false;
        var key = String(o.spriteId || o.id || o.asset || 'sprite');
        if (!assetMascaraAutoInvalidaAvisada.has(key)) {
            assetMascaraAutoInvalidaAvisada.add(key);
            console.error('Laço 2 sem máscara raster válida; sprite ocultada para impedir vazamento do atlas:', key);
        }
        return true;
    }

    var assetMaskSourceIds = new WeakMap();
    var assetMaskSourceNextId = 1;
    var assetMaskedSprites = new Map();
    var ASSET_MASKED_SPRITES_MAX_BYTES = 32 * 1024 * 1024;
    var assetMaskedSpritesBytes = 0;
    function guardarSpriteMascaradaNoCache(key, canvas) {
        var cachedBytes = canvas.width * canvas.height * 4;
        var existing = assetMaskedSprites.get(key);
        if (existing) {
            assetMaskedSprites.delete(key);
            assetMaskedSpritesBytes -= existing.bytes;
        }
        while (assetMaskedSprites.size && assetMaskedSpritesBytes + cachedBytes > ASSET_MASKED_SPRITES_MAX_BYTES) {
            var oldestKey = assetMaskedSprites.keys().next().value;
            var oldest = assetMaskedSprites.get(oldestKey);
            assetMaskedSprites.delete(oldestKey);
            assetMaskedSpritesBytes -= oldest.bytes;
        }
        assetMaskedSprites.set(key, { canvas: canvas, bytes: cachedBytes });
        assetMaskedSpritesBytes += cachedBytes;
    }
    function obterSpriteComMascara(o, imagem) {
        var region = obterAssetRect(o, imagem);
        var rasterMask = assetMaskRasterValida(o && o.assetMaskRaster, region) ? o.assetMaskRaster : null;
        var vectorMask = assetMaskValida(o && o.assetMask) ? o.assetMask : null;
        if (mascaraAutomaticaAusente(o, region)) return null;
        var maskSource = rasterMask || vectorMask;
        if (!maskSource || !region || !imagem) return null;
        var width = region.w;
        var height = region.h;
        var sourceId = assetMaskSourceIds.get(maskSource);
        if (!sourceId) {
            sourceId = assetMaskSourceNextId++;
            assetMaskSourceIds.set(maskSource, sourceId);
        }
        var key = [sourceId, o.asset, region.x, region.y, region.w, region.h, width, height].join('|');
        var cached = assetMaskedSprites.get(key);
        if (cached) {
            assetMaskedSprites.delete(key);
            assetMaskedSprites.set(key, cached);
            lassoDiagnostico('MASKED_TEXTURE', o, imagem, cached.canvas, { cache: 'hit', sourceRegion: region });
            return cached.canvas;
        }
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var context = canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.drawImage(imagem, region.x, region.y, region.w, region.h, 0, 0, width, height);
        if (rasterMask) {
            var imageData = context.getImageData(0, 0, width, height);
            limparPixelsForaMascara(imageData, width, height, rasterMask);
            context.putImageData(imageData, 0, 0);
        } else {
            var maskCanvas = document.createElement('canvas');
            maskCanvas.width = width;
            maskCanvas.height = height;
            var maskContext = maskCanvas.getContext('2d');
            maskContext.beginPath();
            vectorMask.forEach(function (point, index) {
                var x = point.x * width, y = point.y * height;
                if (index === 0) maskContext.moveTo(x, y);
                else maskContext.lineTo(x, y);
            });
            maskContext.closePath();
            maskContext.fillStyle = '#fff';
            maskContext.fill();
            context.globalCompositeOperation = 'destination-in';
            context.drawImage(maskCanvas, 0, 0);
            context.globalCompositeOperation = 'source-over';
        }
        guardarSpriteMascaradaNoCache(key, canvas);
        lassoDiagnostico('MASKED_TEXTURE', o, imagem, canvas, { cache: 'miss', sourceRegion: region });
        return canvas;
    }

    function seedDe(o) {
        var s = 7;
        var str = String((o && o.id) || 'x');
        for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) % 997;
        return s;
    }
    function variar(s, n) { return (s % 97) / n; }
    function hash2(a, b) {
        var n = (a * 374761393 + b * 668265263) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }
    function dims(o) {
        var escala = o.escala || 1;
        return {
            x: o.x, y: o.y,
            W: (o.w || 40) * escala * (o.escalaX || 1),
            H: (o.h || 40) * escala * (o.escalaY || 1)
        };
    }
    function normalizarCamadaEditor(camada) {
        var aliases = { chao: 'ground', meio: 'objects', frente: 'foreground' };
        var canonical = aliases[camada] || camada;
        return ['ground', 'decoration_behind', 'objects', 'decoration_front', 'buildings', 'foreground'].indexOf(canonical) !== -1 ? canonical : 'objects';
    }
    function camadaEditorFicaNaFrente(camada) {
        var canonical = normalizarCamadaEditor(camada);
        return canonical === 'decoration_front' || canonical === 'foreground';
    }
    function mascaraPoligonoValida(mask) {
        return Array.isArray(mask) && mask.length >= 3 && mask.length <= 256 &&
            mask.every(function (point) {
                return point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
                    point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
            });
    }
    function mascaraPoligonoContem(mask, x, y) {
        var dentro = false;
        for (var i = 0, j = mask.length - 1; i < mask.length; j = i++) {
            var a = mask[i], b = mask[j];
            if ((a.y > y) !== (b.y > y) &&
                x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) dentro = !dentro;
        }
        return dentro;
    }
    function ancoraYDoLaco(mask) {
        var intersections = [];
        for (var i = 0; i < mask.length; i++) {
            var a = mask[i], b = mask[(i + 1) % mask.length];
            if (a.x === 0.5) intersections.push(a.y);
            if ((a.x < 0.5 && b.x > 0.5) || (a.x > 0.5 && b.x < 0.5)) {
                intersections.push(a.y + (b.y - a.y) * ((0.5 - a.x) / (b.x - a.x)));
            }
        }
        return intersections.length
            ? Math.max.apply(null, intersections)
            : Math.max.apply(null, mask.map(function (point) { return point.y; }));
    }
    function areaMascaraPoligono(mask) {
        var area = 0;
        for (var i = 0; i < mask.length; i++) {
            var a = mask[i], b = mask[(i + 1) % mask.length];
            area += a.x * b.y - b.x * a.y;
        }
        return Math.abs(area) / 2;
    }
    function mascaraInferiorDoLaco(mask, limiteY) {
        if (!assetMaskValida(mask) || !Number.isFinite(limiteY) || limiteY <= 0 || limiteY >= 1) return null;
        var resultado = [];
        for (var i = 0; i < mask.length; i++) {
            var atual = mask[i], anterior = mask[(i + mask.length - 1) % mask.length];
            var atualDentro = atual.y >= limiteY, anteriorDentro = anterior.y >= limiteY;
            if (atualDentro !== anteriorDentro) {
                var fracao = (limiteY - anterior.y) / (atual.y - anterior.y);
                resultado.push({
                    x: anterior.x + (atual.x - anterior.x) * fracao,
                    y: limiteY
                });
            }
            if (atualDentro) resultado.push({ x: atual.x, y: atual.y });
        }
        if (resultado.length > 1) {
            var primeiro = resultado[0], ultimo = resultado[resultado.length - 1];
            if (Math.abs(primeiro.x - ultimo.x) < 1e-9 && Math.abs(primeiro.y - ultimo.y) < 1e-9) resultado.pop();
        }
        return mascaraPoligonoValida(resultado) && areaMascaraPoligono(resultado) > 1e-6 ? resultado : null;
    }
    function divisaoSpriteValida(objeto) {
        return objeto && objeto.tipo === 'sprite_personalizado' &&
            Number.isFinite(objeto.assetDepthSplit) && objeto.assetDepthSplit >= 0.1 && objeto.assetDepthSplit <= 0.9;
    }
    function atualizarDivisaoAutomaticaSprite(objeto, limiteY) {
        if (!objeto || objeto.tipo !== 'sprite_personalizado' || !assetMaskValida(objeto.assetMask)) return false;
        var colisaoInferior = mascaraInferiorDoLaco(objeto.assetMask, limiteY);
        if (!colisaoInferior) return false;
        objeto.assetDepthSplit = limiteY;
        objeto.assetCollisionMask = colisaoInferior;
        objeto.ySortAnchor = limiteY;
        objeto.colisao = true;
        return true;
    }

    function sombra(ctx, cx, cy, rx, ry, a) {
        ctx.fillStyle = 'rgba(0,0,0,' + (a == null ? 0.25 : a) + ')';
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
    function elipse(ctx, cx, cy, rx, ry, cor) {
        ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
    function circulo(ctx, cx, cy, r, cor) {
        ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    function ret(ctx, x, y, w, h, cor) {
        ctx.fillStyle = cor; ctx.fillRect(x, y, w, h);
    }
    function linha(ctx, x1, y1, x2, y2, cor, lw) {
        ctx.strokeStyle = cor; ctx.lineWidth = lw || 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    function poligono(ctx, pts, cor) {
        ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath(); ctx.fill();
    }

    // ============================================================================
    // PINTORES (procedurais, desenham no footprint w×h em coordenadas de mundo)
    // ============================================================================
    function pintorParaTipo(tipo) {
        switch (tipo) {
            case 'arvore': return pintarArvore;
            case 'arvore_pinheiro': return pintarPinheiro;
            case 'arvore_florida': return pintarArvoreFlorida;
            case 'arvore_dupla': return pintarArvoreDupla;
            case 'arvore_outono': return pintarArvoreOutono;
            case 'palmeira': return pintarPalmeira;
            case 'arvore_sakura': return pintarArvoreSakura;
            case 'arvore_carvalho': return pintarCarvalho;
            case 'arvore_pantano': return pintarSalgueiro;
            case 'arvore_gelo': return pintarPinheiro;
            case 'arvore_deserto': return pintarPalmeira;
            case 'arvore_selva': return pintarArvoreGiganteF;
            case 'arvore_profana': return pintarArvoreProfana;
            case 'arvore_cristal': return pintarArvoreCristal;
            case 'muda': return pintarMuda;
            case 'parede_viva': case 'parede_viva_florida': case 'roseiral': return function (o, ctx) { pintarSebe(o, ctx, o.tipo); };
            case 'parede_viva_curva': return pintarSebeCanto;
            case 'pedra': case 'pedra2': case 'rocha_grande': case 'pedregulho': case 'pedra_pontuda':
                return function (o, ctx) { pintarPedra(o, ctx, tipo); };
            case 'pedra_musgo': return pintarPedraMusgo;
            case 'laje': return pintarLaje;
            case 'pilha_pedra': return pintarPilhaPedra;
            case 'cristais_rocha': return pintarCristaisRocha;
            case 'pedra_lunar': return pintarPedraLunar;
            case 'montanha': return pintarMontanha;
            case 'montanha_gigante': case 'montanha_neve': case 'montanha_vulcanica': case 'duna_gigante':
                return function (o, ctx) { pintarMontanhaBioma(o, ctx, tipo); };
            case 'iceberg_editor': return pintarIceberg;
            case 'bloco_pedra': case 'bloco_granito': return function (o, ctx) { pintarBloco(o, ctx, tipo); };
            case 'coluna': return pintarColuna;
            case 'obelisco': return pintarObelisco;
            case 'ruina': return pintarRuina;
            case 'muro_pedra': return pintarMuroPedra;
            case 'muro_pedra_vertical': return pintorRotacionado(pintarMuroPedra, Math.PI / 2);
            case 'muro_pedra_diagonal': return pintorRotacionado(pintarMuroPedra, -Math.PI / 4, 40);
            case 'muralha': return pintarMuralha;
            case 'portao': return pintarPortao;
            case 'ponte': return pintarPonte;
            case 'parede_tijolo': return pintarParedeTijolo;
            case 'parede_tijolo_vertical': return pintorRotacionado(pintarParedeTijolo, Math.PI / 2);
            case 'parede_madeira': return pintarParedeMadeira;
            case 'parede_madeira_vertical': return pintorRotacionado(pintarParedeMadeira, Math.PI / 2);
            case 'parede_gelo': return pintarParedeGelo;
            case 'muro_pantano': return pintarMuroPantano;
            case 'cerca': return pintarCerca;
            case 'cerca_vertical': return pintorRotacionado(pintarCerca, Math.PI / 2);
            case 'torre': return pintarTorre;
            case 'parede_troncos': return pintarPalicada;
            case 'tocha': return pintarTocha;
            case 'fogueira': return pintarFogueira;
            case 'moita': case 'moita2': case 'moita_esconderijo': return function (o, ctx) { pintarMoita(o, ctx, tipo); };
            case 'arbusto': return pintarArbusto;
            case 'grama': return pintarGrama;
            case 'grama_alta': return pintarGramaAlta;
            case 'juncos_pantano': return pintarJuncosPantano;
            case 'raizes_pantano': return pintarRaizesPantano;
            case 'arbusto_desertico': return pintarArbustoDesertico;
            case 'cristal_colossal': return pintarCristalColossal;
            case 'rocha_lava': return pintarRochaLava;
            case 'capim': return pintarCapim;
            case 'samambaia': return pintarSamambaia;
            case 'bambu': return pintarBambu;
            case 'cogumelo': return pintarCogumelo;
            case 'tronco': return pintarTronco;
            case 'toco': return pintarToco;
            case 'arbusto_florido': return pintarArbustoFlorido;
            case 'samambaia_gigante': return pintarSamambaiaGigante;
            case 'planta_carnivora': return pintarPlantaCarnivora;
            case 'cogumelo_gigante': return pintarCogumeloGigante;
            case 'campo_flores': return pintarCampoFlores;
            case 'caminho_pedras': return pintarCaminhoPedras;
            case 'teia': return pintarTeia;
            case 'osso': return pintarOsso;
            case 'planta': case 'planta_dupla': return function (o, ctx) { pintarPlanta(o, ctx, tipo); };
            case 'rosa_vermelha': case 'rosa_amarela': return function (o, ctx) { pintarRosa(o, ctx, tipo); };
            case 'flor_roxa': return pintarFlorRoxa;
            case 'girassol': return pintarGirassol;
            case 'tulipa': return pintarTulipa;
            case 'cacto_florido': return pintarCacto;
            case 'flor_branca': case 'flor_laranja': case 'flor_azul': return function (o, ctx) { pintarFlorSimples(o, ctx, o.tipo); };
            case 'agua_quadrado': case 'lagoa': case 'canal': return function (o, ctx, t) { pintarAgua(o, ctx, t, tipo); };
            case 'banco': return pintarBanco;
            case 'lamparina': return pintarLamparina;
            case 'estaca_flamejante': return pintarEstaca;
            case 'bandeira': return pintarBandeira;
            case 'ancoradouro': return pintarAncoradouro;
            case 'fonte': return function (o, ctx, t) { pintarFonte(o, ctx, t); };
            case 'poco': return pintarPoco;
            case 'caixa': return pintarCaixa;
            case 'barril': return pintarBarril;
            case 'carroca': return pintarCarroca;
            case 'placa': return pintarPlaca;
            case 'ruina_ancestral': return pintarRuinaAncestral;
            case 'zona_colisao': return pintarZonaColisao;
            case 'zona_frente': return pintarZonaFrente;
            // ----- Floresta dos Sussurros -----
            case 'arvore_florestal': return pintarArvoreFlorestal;
            case 'arvore_gigante_f': return pintarArvoreGiganteF;
            case 'pinheiro_silvestre': return pintarPinheiroSilvestre;
            case 'salgueiro': return pintarSalgueiro;
            case 'arvore_morta': return pintarArvoreMorta;
            case 'tronco_musgo': return pintarTroncoMusgo;
            case 'cabana_grande': case 'cabana_media': case 'cabana_palha': return pintarCabanaF;
            case 'fogueira_pedra': return pintarFogueiraPedra;
            case 'fogueira_grande': return pintarFogueiraGrande;
            case 'lago_grande': return pintarLagoGrande;
            case 'riacho': return pintarRiacho;
            case 'colmeia': return pintarColmeia;
            case 'cogumelos_grupo': return pintarCogumelosGrupo;
            case 'toco_musgo': return pintarTocoMusgo;
            case 'galhos': return pintarGalhos;
            case 'pilha_lenha': return pintarPilhaLenha;
            case 'torre_vigia': return pintarTorreVigia;
            case 'barco_lago': return pintarBarcoLago;
            case 'pier_madeira': return pintarPierMadeira;
            case 'ponte_pedra': return pintarPontePedraObj;
            case 'secador_peles': return pintarSecadorPeles;
            case 'arvore_betula': return pintarArvoreBetula;
            case 'entrada_caverna': return pintarEntradaCaverna;
            case 'horta': return pintarHorta;
            default: return pintarArvore;
        }
    }

    function pintarArvore(o, ctx) {
        var s = seedDe(o), v = o.variante || 0, d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var pal = [['#4e342e', '#2e7d32', '#388e3c'], ['#5d4037', '#1b5e20', '#2e7d32']][v % 2];
        sombra(ctx, x + W / 2, y + H, W * 0.34, 4);
        ret(ctx, x + W * 0.44, y + H * 0.50, W * 0.16, H * 0.50, pal[0]);
        ret(ctx, x + W * 0.40, y + H * 0.50, W * 0.12, H * 0.08, '#6d4c41');
        elipse(ctx, x + W * 0.28, y + H * 0.42, W * 0.30, H * 0.22, pal[1]);
        elipse(ctx, x + W * 0.72, y + H * 0.44, W * 0.28, H * 0.20, pal[2]);
        elipse(ctx, x + W * 0.50, y + H * 0.30, W * 0.34, H * 0.26, pal[2]);
        circulo(ctx, x + W * 0.48, y + H * 0.22, W * 0.13, pal[1]);
        circulo(ctx, x + W * 0.58, y + H * 0.26, W * 0.09, '#66bb6a');
    }

    function pintarPinheiro(o, ctx) {
        var v = o.variante || 0, d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.30, 4);
        ret(ctx, x + W * 0.44, y + H * 0.52, W * 0.14, H * 0.48, '#4e342e');
        var cores = [v % 2 ? '#14532d' : '#1b5e20', v % 2 ? '#1e7d34' : '#2e7d32'];
        for (var n = 0; n < 4; n++) {
            var ly = y + H * (0.08 + n * 0.16);
            var rw = W * (0.52 - n * 0.10);
            ctx.fillStyle = cores[n % 2];
            ctx.beginPath();
            ctx.moveTo(x + W / 2, ly);
            ctx.lineTo(x + W / 2 - rw, ly + H * 0.17);
            ctx.lineTo(x + W / 2 + rw, ly + H * 0.17);
            ctx.closePath(); ctx.fill();
        }
    }

    function pintarArvoreFlorida(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.34, 4);
        ret(ctx, x + W * 0.44, y + H * 0.50, W * 0.16, H * 0.50, '#7a5230');
        elipse(ctx, x + W * 0.30, y + H * 0.42, W * 0.30, H * 0.22, '#8d6e63');
        elipse(ctx, x + W * 0.70, y + H * 0.44, W * 0.28, H * 0.20, '#8b5e34'.replace('#8b5e34', '#9a7b4f'));
        elipse(ctx, x + W * 0.50, y + H * 0.30, W * 0.34, H * 0.26, '#c98860');
        var s = seedDe(o);
        for (var i = 0; i < 9; i++) {
            var ang = (i / 9) * Math.PI * 2 + variar(s + i, 3);
            circulo(ctx, x + W * 0.5 + Math.cos(ang) * W * 0.26, y + H * 0.30 + Math.sin(ang) * H * 0.18, W * 0.055, i % 3 ? '#f48fb1' : '#ffb6c1');
        }
        circulo(ctx, x + W * 0.5, y + H * 0.30, W * 0.10, '#ffcce0');
    }

    function pintarArvoreDupla(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.36, 5);
        var tX = x + W * 0.26, t2X = x + W * 0.74;
        ret(ctx, tX - W * 0.07, y + H * 0.46, W * 0.14, H * 0.54, '#5d4037');
        ret(ctx, t2X - W * 0.07, y + H * 0.46, W * 0.14, H * 0.54, '#4e342e');
        elipse(ctx, tX, y + H * 0.34, W * 0.26, H * 0.24, '#2e7d32');
        elipse(ctx, t2X, y + H * 0.36, W * 0.24, H * 0.22, '#388e3c');
        elipse(ctx, x + W * 0.5, y + H * 0.20, W * 0.34, H * 0.20, '#43a047');
        circulo(ctx, x + W * 0.42, y + H * 0.14, W * 0.10, '#66bb6a');
    }

    function pintarArvoreOutono(o, ctx) {
        var v = o.variante || 0, d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.34, 4);
        ret(ctx, x + W * 0.44, y + H * 0.50, W * 0.16, H * 0.50, '#6d4c41');
        var c1 = v % 2 ? '#e65100' : '#ef6c00', c2 = v % 2 ? '#f57f17' : '#f9a825';
        elipse(ctx, x + W * 0.28, y + H * 0.42, W * 0.32, H * 0.22, c1);
        elipse(ctx, x + W * 0.72, y + H * 0.44, W * 0.30, H * 0.20, c2);
        elipse(ctx, x + W * 0.50, y + H * 0.30, W * 0.36, H * 0.26, c2);
        circulo(ctx, x + W * 0.46, y + H * 0.24, W * 0.14, '#ffb300');
    }

    function pintarPalmeira(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.36, 4);
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = W * 0.13; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + W / 2, y + H); ctx.quadraticCurveTo(x + W * 0.62, y + H * 0.55, x + W * 0.52, y + H * 0.16); ctx.stroke();
        ctx.lineCap = 'butt';
        var topoX = x + W * 0.52, topoY = y + H * 0.16;
        for (var i = 0; i < 7; i++) {
            var ang = -Math.PI / 2 + i * (Math.PI / 6) - Math.PI / 3;
            ctx.strokeStyle = i % 2 ? '#2e7d32' : '#388e3c';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(topoX, topoY);
            ctx.quadraticCurveTo(topoX + Math.cos(ang) * W * 0.3, topoY + Math.sin(ang) * W * 0.34 - 6, topoX + Math.cos(ang) * W * 0.5, topoY + Math.sin(ang) * W * 0.5);
            ctx.stroke();
        }
        circulo(ctx, topoX + 3, topoY + 4, 3, '#8d6e63');
        circulo(ctx, topoX - 3, topoY + 5, 3, '#8d6e63');
    }

    // ============================================================================
    // PINTORES DA FLORESTA DOS SUSSURROS (animados via t; paleta e jogo)
    // ============================================================================
    function balancoDe(o, t, amp) {
        var s = seedDe(o), fase = (s % 628) / 100;
        return Math.sin(t * 1.4 + fase) * amp;
    }

    function pintarArvoreFlorestal(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var v = o.variante || 0, sw = balancoDe(o, t, W * 0.05);
        sombra(ctx, x + W / 2, y + H, W * 0.32, 4);
        ret(ctx, x + W * 0.44, y + H * 0.48, W * 0.14, H * 0.52, '#5b4028');
        ret(ctx, x + W * 0.47, y + H * 0.48, W * 0.04, H * 0.52, 'rgba(0,0,0,0.18)');
        elipse(ctx, x + W * 0.30 + sw, y + H * 0.40, W * 0.30, H * 0.22, '#2a5c2e');
        elipse(ctx, x + W * 0.70 + sw * 1.1, y + H * 0.42, W * 0.28, H * 0.20, '#347038');
        elipse(ctx, x + W * 0.50 + sw * 1.2, y + H * 0.28, W * 0.34, H * 0.26, '#3f8543');
        circulo(ctx, x + W * 0.46 + sw * 1.3, y + H * 0.20, W * 0.12, '#4e9a52');
        if (v % 3 === 0) { circulo(ctx, x + W * 0.60 + sw, y + H * 0.32, W * 0.05, '#d94949'); }
    }

    function pintarArvoreGiganteF(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var sw = balancoDe(o, t, W * 0.04);
        sombra(ctx, x + W / 2, y + H, W * 0.40, 6);
        ret(ctx, x + W * 0.42, y + H * 0.42, W * 0.16, H * 0.58, '#4a3320');
        ret(ctx, x + W * 0.46, y + H * 0.42, W * 0.05, H * 0.58, 'rgba(0,0,0,0.2)');
        poligono(ctx, [{ x: x + W * 0.28, y: y + H }, { x: x + W * 0.42, y: y + H * 0.78 }, { x: x + W * 0.42, y: y + H }], '#4a3320');
        poligono(ctx, [{ x: x + W * 0.72, y: y + H }, { x: x + W * 0.58, y: y + H * 0.78 }, { x: x + W * 0.58, y: y + H }], '#4a3320');
        var cores = ['#1e4d22', '#27632b', '#317a35', '#3f8f43'];
        for (var k = 0; k < 4; k++) {
            var rr = W * 0.34 - k * W * 0.07;
            var yy = y + H * 0.32 - k * H * 0.09;
            elipse(ctx, x + W / 2 + sw * (0.4 + k * 0.25), yy, rr, rr * 0.8, cores[k]);
        }
        circulo(ctx, x + W * 0.44 + sw * 1.3, y + H * 0.10, W * 0.14, '#4e9a52');
    }

    function pintarPinheiroSilvestre(o, ctx, t) {
        var v = o.variante || 0, d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var sw = balancoDe(o, t, W * 0.03);
        sombra(ctx, x + W / 2, y + H, W * 0.30, 4);
        ret(ctx, x + W * 0.44, y + H * 0.46, W * 0.14, H * 0.54, '#4e342e');
        var cores = [v % 2 ? '#14532d' : '#1b5e20', v % 2 ? '#1e7d34' : '#2e7d32'];
        for (var n = 0; n < 5; n++) {
            var ly = y + H * (0.04 + n * 0.15);
            var rw = W * (0.50 - n * 0.085) + sw * (n / 5);
            ctx.fillStyle = cores[n % 2];
            ctx.beginPath();
            ctx.moveTo(x + W / 2 + sw * 0.5, ly);
            ctx.lineTo(x + W / 2 - rw, ly + H * 0.16);
            ctx.lineTo(x + W / 2 + rw, ly + H * 0.16);
            ctx.closePath(); ctx.fill();
        }
    }

    function pintarSalgueiro(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var sw = balancoDe(o, t, W * 0.04);
        sombra(ctx, x + W / 2, y + H, W * 0.36, 4);
        ctx.strokeStyle = '#6d4c33'; ctx.lineWidth = W * 0.12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + W / 2, y + H); ctx.quadraticCurveTo(x + W * 0.46, y + H * 0.6, x + W * 0.5, y + H * 0.34); ctx.stroke();
        ctx.lineCap = 'butt';
        elipse(ctx, x + W / 2 + sw, y + H * 0.26, W * 0.30, H * 0.14, '#4e8f4a');
        for (var i = 0; i < 6; i++) {
            var fx = x + W * (0.18 + i * 0.13);
            var len = H * (0.24 + hash2(i, seedDe(o)) * 0.14);
            ctx.strokeStyle = i % 2 ? '#5da457' : '#4e8f4a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx, y + H * 0.28);
            ctx.quadraticCurveTo(fx + sw * 0.8, y + H * 0.28 + len * 0.6, fx + sw, y + H * 0.28 + len);
            ctx.stroke();
        }
    }

    function pintarArvoreMorta(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var s = seedDe(o);
        sombra(ctx, x + W / 2, y + H, W * 0.24, 3);
        ret(ctx, x + W * 0.44, y + H * 0.30, W * 0.13, H * 0.70, '#6b5b4a');
        ctx.strokeStyle = '#5d4e3f'; ctx.lineWidth = W * 0.06; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + W * 0.5, y + H * 0.5); ctx.lineTo(x + W * (0.2 + variar(s, 5) * 0.15), y + H * 0.22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.5, y + H * 0.38); ctx.lineTo(x + W * (0.68 + variar(s + 3, 5) * 0.12), y + H * 0.10); ctx.stroke();
        ctx.lineCap = 'butt';
    }

    function pintarTroncoMusgo(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 3);
        ret(ctx, x + W * 0.04, y + H * 0.25, W * 0.92, H * 0.5, '#5b4028');
        elipse(ctx, x + W * 0.5, y + H * 0.25, W * 0.46, H * 0.22, '#4a3320');
        elipse(ctx, x + W * 0.3, y + H * 0.28, W * 0.16, H * 0.14, '#4e8f4a');
        elipse(ctx, x + W * 0.62, y + H * 0.24, W * 0.12, H * 0.12, '#3f7a3e');
        elipse(ctx, x + W * 0.84, y + H * 0.32, W * 0.07, H * 0.10, '#4e8f4a');
    }

    // Cabana da floresta — grande / média / palha, com janelas acesas e chaminé
    function pintarCabanaF(o, ctx, t) {
        var tipo = o.tipo, d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var v = o.variante || 0;
        var ehPalha = tipo === 'cabana_palha';
        var grande = tipo === 'cabana_grande';
        sombra(ctx, x + W / 2, y + H, W * 0.55, 6);
        var gP = ctx.createLinearGradient(x, y + H * 0.3, x, y + H);
        gP.addColorStop(0, '#7c5836'); gP.addColorStop(1, '#5d3f26');
        ctx.fillStyle = gP;
        ctx.fillRect(x + W * 0.06, y + H * 0.38, W * 0.88, H * 0.62);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.2;
        for (var yy = y + H * 0.44; yy < y + H; yy += Math.max(7, H * 0.09)) {
            ctx.beginPath(); ctx.moveTo(x + W * 0.08, yy); ctx.lineTo(x + W * 0.92, yy); ctx.stroke();
        }
        ctx.fillStyle = '#4a3018';
        ctx.fillRect(x + W * 0.06, y + H * 0.38, W * 0.05, H * 0.62);
        ctx.fillRect(x + W * 0.89, y + H * 0.38, W * 0.05, H * 0.62);
        var dw = W * 0.20, dh = H * 0.34;
        ctx.fillStyle = '#3c2712';
        ctx.fillRect(x + W / 2 - dw / 2 - 3, y + H - dh - 3, dw + 6, dh + 3);
        var gP = ctx.createLinearGradient(x + W / 2 - dw / 2, y, x + W / 2 + dw / 2, y + H);
        gP.addColorStop(0, '#8a6134'); gP.addColorStop(1, '#6b4826');
        ctx.fillStyle = gP;
        ctx.fillRect(x + W / 2 - dw / 2, y + H - dh, dw, dh);
        ctx.fillStyle = '#d9b45c';
        ctx.beginPath(); ctx.arc(x + W / 2 + dw / 2 - 5, y + H - dh / 2, 2.2, 0, Math.PI * 2); ctx.fill();
        var wy = y + H * 0.52;
        [[x + W * 0.20, wy], [x + W * 0.80, wy]].forEach(function (wpt, i) {
            ctx.fillStyle = '#3c2712';
            ctx.fillRect(wpt[0] - W * 0.07, wy - H * 0.09, W * 0.14, H * 0.18);
            var pulsa = 0.72 + Math.sin(t * 2.1 + i * 2 + v) * 0.12;
            ctx.fillStyle = 'rgba(255, 200, 110,' + pulsa.toFixed(3) + ')';
            ctx.fillRect(wpt[0] - W * 0.055, wy - H * 0.065, W * 0.11, H * 0.13);
            ctx.strokeStyle = 'rgba(60,39,18,0.9)'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(wpt[0], wy - H * 0.065); ctx.lineTo(wpt[0], wy + H * 0.065);
            ctx.moveTo(wpt[0] - W * 0.055, wy); ctx.lineTo(wpt[0] + W * 0.055, wy);
            ctx.stroke();
        });
        var topoY = y + H * 0.10;
        var corT = ehPalha ? '#c9a85c' : '#a8442e';
        var corT2 = ehPalha ? '#a8873e' : '#8f3524';
        ctx.fillStyle = corT;
        ctx.beginPath();
        ctx.moveTo(x - W * 0.02, y + H * 0.44);
        ctx.lineTo(x + W / 2, topoY);
        ctx.lineTo(x + W * 1.02, y + H * 0.44);
        ctx.lineTo(x + W * 0.92, y + H * 0.40);
        ctx.lineTo(x + W / 2, topoY + 8);
        ctx.lineTo(x + W * 0.08, y + H * 0.40);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = corT2;
        ctx.beginPath();
        ctx.moveTo(x + W / 2, topoY);
        ctx.lineTo(x + W * 1.02, y + H * 0.44);
        ctx.lineTo(x + W * 0.92, y + H * 0.40);
        ctx.lineTo(x + W / 2, topoY + 8);
        ctx.closePath(); ctx.fill();
        if (ehPalha) {
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
            for (var k = 1; k <= 4; k++) {
                var yk = topoY + 6 + k * (H * 0.06);
                var half = Math.max(0, (yk - topoY) * 0.9);
                ctx.beginPath();
                ctx.moveTo(x + W / 2 - Math.min(half, W * 0.5), yk);
                ctx.lineTo(x + W / 2 + Math.min(half, W * 0.5), yk);
                ctx.stroke();
            }
        }
        if (grande || (tipo === 'cabana_media' && v % 2 === 0)) {
            var chx = x + W * 0.78, chy = topoY + 4;
            ctx.fillStyle = '#6d6d68'; ctx.fillRect(chx, chy - 8, W * 0.08, 16);
            ctx.fillStyle = '#575752'; ctx.fillRect(chx - 2, chy - 11, W * 0.08 + 4, 5);
            for (var i2 = 0; i2 < 3; i2++) {
                var prog = (t * 0.3 + i2 / 3) % 1;
                ctx.fillStyle = 'rgba(150,150,150,' + (Math.sin(prog * Math.PI) * 0.2).toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(chx + W * 0.04 + Math.sin(t * 1.4 + i2) * 5 * prog, chy - 14 - prog * 34, 3 + prog * 7, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function pintarFogueiraPedra(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 4);
        for (var i = 0; i < 8; i++) {
            var a = (i / 8) * Math.PI * 2;
            circulo(ctx, x + W / 2 + Math.cos(a) * W * 0.36, y + H * 0.66 + Math.sin(a) * H * 0.2, W * 0.09, '#8d8d8d');
        }
        ctx.save(); ctx.translate(x + W / 2, y + H * 0.6); ctx.rotate(-0.45);
        ret(ctx, -W * 0.3, -2.5, W * 0.6, 5, '#6d4c41'); ctx.restore();
        ctx.save(); ctx.translate(x + W / 2, y + H * 0.6); ctx.rotate(0.45);
        ret(ctx, -W * 0.3, -2.5, W * 0.6, 5, '#7a5230'); ctx.restore();
        pintarFogo(ctx, x + W / 2, y + H * 0.5, W * 0.8, t || Date.now() / 1000, '#ff6b35');
    }

    function pintarFogueiraGrande(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 5);
        for (var row = 0; row < 3; row++) {
            var n = 4 - row, rw = W * (0.4 - row * 0.09);
            for (var i = 0; i < n; i++) {
                circulo(ctx, x + W / 2 + (i - (n - 1) / 2) * rw * 0.9, y + H * 0.72 - row * H * 0.14, rw * 0.34, row % 2 ? '#7a5230' : '#6d4c41');
            }
        }
        pintarFogo(ctx, x + W / 2, y + H * 0.42, W * 1.0, t || Date.now() / 1000, '#ff5722');
        for (var s = 0; s < 5; s++) {
            var prog = (t * 0.7 + s / 5) % 1;
            ctx.fillStyle = 'rgba(255, 190, 60,' + (Math.sin(prog * Math.PI) * 0.8).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(x + W / 2 + Math.sin(t * 4 + s * 2.6) * W * 0.18, y + H * 0.4 - prog * H * 0.6, 1.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function pintarAguaFlorestal(o, ctx, t, tipo) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        elipse(ctx, x + W / 2, y + H / 2, W / 2, H / 2, '#c2b280');
        var g = ctx.createLinearGradient(x, y, x, y + H);
        g.addColorStop(0, '#1b5e70'); g.addColorStop(1, '#123d4c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x + W / 2, y + H / 2, W * 0.44, H * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x + W / 2, y + H / 2, W * 0.44, H * 0.42, 0, 0, Math.PI * 2);
        ctx.clip();
        for (var i = 0; i < 4; i++) {
            var oy = y + H * (0.2 + i * 0.2) + Math.sin(t * 1.6 + i * 1.3) * H * 0.04;
            ctx.fillStyle = 'rgba(140, 220, 235,' + (0.10 + 0.08 * Math.abs(Math.sin(t + i))).toFixed(3) + ')';
            ctx.fillRect(x, oy, W, 3);
        }
        for (var s = 0; s < 5; s++) {
            var hsh = hash2(s * 13, Math.round(W));
            var px = x + W * (0.15 + hsh * 0.7), py = y + H * (0.2 + hash2(s, 7) * 0.6);
            var al = 0.25 + Math.sin(t * 2.4 + s * 2.2) * 0.2;
            if (al > 0.1) {
                ctx.fillStyle = 'rgba(230, 250, 255,' + al.toFixed(3) + ')';
                ctx.fillRect(px, py, 6, 1.6);
            }
        }
        ctx.restore();
    }

    function pintarLagoGrande(o, ctx, t) { pintarAguaFlorestal(o, ctx, t, 'lago_grande'); }
    function pintarRiacho(o, ctx, t) { pintarAguaFlorestal(o, ctx, t, 'riacho'); }

    function pintarColmeia(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        linha(ctx, x + W * 0.5, y, x + W * 0.5, y + H * 0.18, '#5b4028', 2.5);
        for (var k = 0; k < 3; k++) {
            ctx.fillStyle = k % 2 ? '#d9a527' : '#c68f1c';
            ctx.beginPath();
            ctx.ellipse(x + W / 2, y + H * 0.55 - k * H * 0.02, W * (0.32 - k * 0.07), H * (0.3 - k * 0.06), 0, Math.PI, 0);
            ctx.fill();
        }
        ctx.fillStyle = '#7a5216';
        ctx.beginPath(); ctx.arc(x + W / 2, y + H * 0.85, W * 0.1, 0, Math.PI * 2); ctx.fill();
        for (var i = 0; i < 3; i++) {
            var ang = t * 2 + i * 2.1;
            circulo(ctx, x + W / 2 + Math.cos(ang) * W * 0.55, y + H * 0.6 + Math.sin(ang) * H * 0.2, 1.6, '#3a2a08');
        }
    }

    function pintarCogumelosGrupo(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var v = o.variante || 0;
        var caps = v % 2 ? '#c62828' : '#8d4e2a';
        [[0.28, 1], [0.55, 0.7], [0.75, 0.5]].forEach(function (mst, i) {
            var mx = x + W * mst[0], mr = W * 0.16 * mst[1], mh = H * 0.4 * mst[1];
            var sway = Math.sin(t * 1.8 + i * 2) * 1.2;
            ret(ctx, mx - mr * 0.25, y + H - mh, mr * 0.5, mh, '#e8dcc8');
            ctx.fillStyle = caps;
            ctx.beginPath();
            ctx.ellipse(mx + sway, y + H - mh, mr, mr * 0.62, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath(); ctx.arc(mx + sway - mr * 0.3, y + H - mh - mr * 0.2, mr * 0.14, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(mx + sway + mr * 0.35, y + H - mh - mr * 0.1, mr * 0.11, 0, Math.PI * 2); ctx.fill();
        });
    }

    function pintarTocoMusgo(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        ret(ctx, x + W * 0.15, y + H * 0.3, W * 0.7, H * 0.7, '#5d4a32');
        elipse(ctx, x + W / 2, y + H * 0.3, W * 0.35, H * 0.22, '#a1887f');
        elipse(ctx, x + W / 2, y + H * 0.3, W * 0.2, H * 0.12, '#8d6e63');
        elipse(ctx, x + W * 0.32, y + H * 0.28, W * 0.16, H * 0.10, '#4e8f4a');
        elipse(ctx, x + W * 0.68, y + H * 0.33, W * 0.13, H * 0.08, '#3f7a3e');
    }

    function pintarGalhos(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var s = seedDe(o);
        ctx.strokeStyle = '#6b5138'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + W * 0.08, y + H * 0.7); ctx.lineTo(x + W * 0.85, y + H * 0.45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.3, y + H * 0.75); ctx.lineTo(x + W * 0.6, y + H * 0.3); ctx.stroke();
        ctx.strokeStyle = '#5d4630'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + W * (0.3 + variar(s, 7) * 0.3), y + H * 0.6); ctx.lineTo(x + W * 0.5, y + H * 0.85); ctx.stroke();
        ctx.lineCap = 'butt';
        circulo(ctx, x + W * 0.15, y + H * 0.85, 2, '#9c7c3c');
        circulo(ctx, x + W * 0.75, y + H * 0.8, 2.4, '#8a6c30');
    }

    function pintarPilhaLenha(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 3);
        for (var row = 0; row < 3; row++) {
            var n = 4 - row, rw = W * (0.8 - row * 0.12) / n;
            for (var i = 0; i < n; i++) {
                var lx = x + W * 0.1 + rw * 0.5 + i * rw + row * rw * 0.5;
                var ly = y + H * 0.8 - row * H * 0.24;
                circulo(ctx, lx, ly, rw * 0.36, '#8a6134');
                circulo(ctx, lx, ly, rw * 0.2, '#c9a875');
            }
        }
    }

    // ---- Itens da Floresta dos Nebulos (vila, lago, torre, caverna) ----
    function pintarTorreVigia(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var v = o.variante || 0;
        sombra(ctx, x + W / 2, y + H, W * 0.5, 6);
        // 4 pernas inclinadas
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = Math.max(3, W * 0.09); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + W * 0.14, y + H); ctx.lineTo(x + W * 0.3, y + H * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.86, y + H); ctx.lineTo(x + W * 0.7, y + H * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.3, y + H * 0.98); ctx.lineTo(x + W * 0.34, y + H * 0.52); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.7, y + H * 0.98); ctx.lineTo(x + W * 0.66, y + H * 0.52); ctx.stroke();
        ctx.lineCap = 'butt';
        // travessas
        ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + W * 0.2, y + H * 0.78); ctx.lineTo(x + W * 0.8, y + H * 0.78); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.24, y + H * 0.6); ctx.lineTo(x + W * 0.76, y + H * 0.6); ctx.stroke();
        // plataforma + cabine
        ret(ctx, x + W * 0.16, y + H * 0.46, W * 0.68, H * 0.08, '#6d4c41');
        ret(ctx, x + W * 0.2, y + H * 0.22, W * 0.6, H * 0.25, '#8a6134');
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
        for (var yy = y + H * 0.27; yy < y + H * 0.46; yy += H * 0.05) {
            ctx.beginPath(); ctx.moveTo(x + W * 0.22, yy); ctx.lineTo(x + W * 0.78, yy); ctx.stroke();
        }
        // janela acesa
        var pulsa = 0.7 + Math.sin(t * 2 + v) * 0.15;
        ctx.fillStyle = 'rgba(255, 200, 110,' + pulsa.toFixed(3) + ')';
        ctx.fillRect(x + W * 0.42, y + H * 0.28, W * 0.16, H * 0.1);
        // telhado
        poligono(ctx, [{ x: x + W * 0.12, y: y + H * 0.24 }, { x: x + W / 2, y: y + H * 0.06 }, { x: x + W * 0.88, y: y + H * 0.24 }], '#8f3524');
        // escada
        ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x + W * 0.48, y + H); ctx.lineTo(x + W * 0.48, y + H * 0.54); ctx.stroke();
        for (var i = 0; i < 6; i++) {
            var ly = y + H * (0.96 - i * 0.07);
            ctx.beginPath(); ctx.moveTo(x + W * 0.42, ly); ctx.lineTo(x + W * 0.54, ly); ctx.stroke();
        }
    }

    function pintarBarcoLago(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var bob = Math.sin(t * 1.5 + seedDe(o) % 7) * 2;
        var cy = y + H / 2 + bob;
        sombra(ctx, x + W / 2, y + H * 0.85, W * 0.4, 3, 0.2);
        // casco
        ctx.fillStyle = '#7a5230';
        ctx.beginPath();
        ctx.moveTo(x + W * 0.06, cy);
        ctx.quadraticCurveTo(x + W * 0.2, cy + H * 0.42, x + W * 0.5, cy + H * 0.44);
        ctx.quadraticCurveTo(x + W * 0.8, cy + H * 0.42, x + W * 0.94, cy);
        ctx.quadraticCurveTo(x + W * 0.5, cy - H * 0.1, x + W * 0.06, cy);
        ctx.closePath(); ctx.fill();
        // interior
        ctx.fillStyle = '#5d3f26';
        ctx.beginPath();
        ctx.moveTo(x + W * 0.14, cy - 1);
        ctx.quadraticCurveTo(x + W * 0.5, cy + H * 0.22, x + W * 0.86, cy - 1);
        ctx.quadraticCurveTo(x + W * 0.5, cy - H * 0.06, x + W * 0.14, cy - 1);
        ctx.closePath(); ctx.fill();
        // remos
        ctx.strokeStyle = '#8a6134'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + W * 0.3, cy + H * 0.05); ctx.lineTo(x + W * 0.2, cy - H * 0.3 + bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.7, cy + H * 0.05); ctx.lineTo(x + W * 0.8, cy - H * 0.3 + bob); ctx.stroke();
    }

    function pintarPierMadeira(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ret(ctx, x, y + H * 0.2, W, H * 0.6, '#6e4c2e');
        ctx.fillStyle = '#82603c';
        for (var i = 0; i < 8; i++) ctx.fillRect(x + i * W / 8 + 2, y + H * 0.2, W / 8 - 4, H * 0.6);
        ctx.fillStyle = '#4a3018';
        ctx.fillRect(x, y + H * 0.2, W, 3);
        ctx.fillRect(x, y + H * 0.8 - 3, W, 3);
        // postes
        ctx.fillStyle = '#5d4037';
        [0.1, 0.35, 0.65, 0.9].forEach(function (f) {
            ctx.fillRect(x + W * f, y + H * 0.72, W * 0.045, H * 0.34);
        });
    }

    function pintarPontePedraObj(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        // corpo da ponte
        ret(ctx, x, y + H * 0.1, W, H * 0.66, '#8d8d86');
        // arco (vão escuro embaixo)
        ctx.fillStyle = '#20303a';
        ctx.beginPath();
        ctx.ellipse(x + W / 2, y + H * 0.78, W * 0.24, H * 0.3, 0, Math.PI, 0);
        ctx.fill();
        // blocos de pedra
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.2;
        for (var i = 1; i < 7; i++) {
            ctx.beginPath(); ctx.moveTo(x + i * W / 7, y + H * 0.1); ctx.lineTo(x + i * W / 7, y + H * 0.7); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(x, y + H * 0.4); ctx.lineTo(x + W, y + H * 0.4); ctx.stroke();
        // corrimãos
        ret(ctx, x, y, W, H * 0.14, '#a3a39a');
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x, y, W, 3);
    }

    function pintarSecadorPeles(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var s = seedDe(o);
        // postes em Y + travessa
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + W * 0.12, y + H); ctx.lineTo(x + W * 0.16, y + H * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.88, y + H); ctx.lineTo(x + W * 0.84, y + H * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.16, y + H * 0.34); ctx.lineTo(x + W * 0.1, y + H * 0.16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.84, y + H * 0.34); ctx.lineTo(x + W * 0.9, y + H * 0.16); ctx.stroke();
        ctx.lineCap = 'butt';
        linha(ctx, x + W * 0.1, y + H * 0.2, x + W * 0.9, y + H * 0.2, '#6d4c41', 3);
        // peles penduradas (balançam)
        for (var i = 0; i < 3; i++) {
            var px = x + W * (0.28 + i * 0.22);
            var sway = Math.sin(t * 1.3 + i * 1.9 + variar(s + i, 3)) * 2.2;
            var pw = W * 0.16, ph = H * (0.4 + variar(s + i * 3, 4) * 0.16);
            ctx.fillStyle = i % 2 ? '#8a5a30' : '#6d4423';
            ctx.beginPath();
            ctx.moveTo(px - pw / 2 + sway, y + H * 0.22);
            ctx.quadraticCurveTo(px - pw * 0.62 + sway, y + H * 0.22 + ph * 0.6, px + sway, y + H * 0.22 + ph);
            ctx.quadraticCurveTo(px + pw * 0.62 + sway, y + H * 0.22 + ph * 0.6, px + pw / 2 + sway, y + H * 0.22);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(px - 2 + sway, y + H * 0.22, 4, ph * 0.3);
        }
    }

    function pintarArvoreBetula(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var sw = balancoDe(o, t, W * 0.05);
        sombra(ctx, x + W / 2, y + H, W * 0.3, 4);
        ctx.fillStyle = '#e8e4da';
        ctx.fillRect(x + W * 0.42, y + H * 0.34, W * 0.16, H * 0.66);
        ctx.fillStyle = '#3a352e';
        ctx.fillRect(x + W * 0.44, y + H * 0.62, W * 0.1, H * 0.03);
        ctx.fillRect(x + W * 0.47, y + H * 0.48, W * 0.09, H * 0.03);
        ctx.fillRect(x + W * 0.43, y + H * 0.78, W * 0.11, H * 0.03);
        ctx.fillStyle = ['#9cc259', '#aad06b', '#8fb84e'][(o.variante || 0) % 3];
        for (var k = 0; k < 3; k++) {
            var rr = W * 0.28 - k * W * 0.06;
            var yy = y + H * 0.3 - k * H * 0.11;
            elipse(ctx, x + W / 2 + sw * (0.4 + k * 0.3), yy, rr, rr * 0.8, ctx.fillStyle);
        }
    }

    function pintarEntradaCaverna(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.5, 6);
        // monte de pedras
        ctx.fillStyle = '#7b7b7b';
        ctx.beginPath();
        ctx.moveTo(x, y + H);
        ctx.quadraticCurveTo(x + W * 0.05, y + H * 0.3, x + W * 0.3, y + H * 0.22);
        ctx.quadraticCurveTo(x + W * 0.5, y + H * 0.05, x + W * 0.72, y + H * 0.24);
        ctx.quadraticCurveTo(x + W * 0.95, y + H * 0.32, x + W, y + H);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8d8d8d';
        elipse(ctx, x + W * 0.22, y + H * 0.55, W * 0.16, H * 0.2, '#8d8d8d');
        elipse(ctx, x + W * 0.78, y + H * 0.5, W * 0.14, H * 0.18, '#8d8d8d');
        // boca escura da caverna
        ctx.fillStyle = '#14181c';
        ctx.beginPath();
        ctx.ellipse(x + W / 2, y + H * 0.72, W * 0.2, H * 0.3, 0, Math.PI, 0);
        ctx.lineTo(x + W / 2 + W * 0.2, y + H);
        ctx.lineTo(x + W / 2 - W * 0.2, y + H);
        ctx.closePath(); ctx.fill();
        // trepadeiras
        ctx.strokeStyle = '#4e8f4a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + W * 0.12, y + H * 0.5); ctx.quadraticCurveTo(x + W * 0.08, y + H * 0.3, x + W * 0.2, y + H * 0.18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + W * 0.9, y + H * 0.55); ctx.quadraticCurveTo(x + W * 0.94, y + H * 0.35, x + W * 0.84, y + H * 0.2); ctx.stroke();
    }

    function pintarHorta(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var v = o.variante || 0;
        ret(ctx, x, y + H * 0.1, W, H * 0.8, '#6b4f2e');
        // sulcos de terra
        for (var r = 0; r < 3; r++) {
            var ry = y + H * (0.24 + r * 0.22);
            ret(ctx, x + W * 0.05, ry, W * 0.9, H * 0.1, '#5d4224');
            // brotos
            for (var i = 0; i < 6; i++) {
                var px = x + W * (0.12 + i * 0.14);
                var sway = Math.sin(t * 1.6 + r + i) * 1.2;
                ctx.strokeStyle = v % 2 ? '#5fae55' : '#4e9a52';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(px, ry + H * 0.05); ctx.lineTo(px + sway, ry - H * 0.04); ctx.stroke();
                circulo(ctx, px + sway, ry - H * 0.05, 1.8, '#6fbe62');
            }
        }
    }

    function pintarPedra(o, ctx, tipo) {
        var s = seedDe(o), v = o.variante || 0, d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 4);
        var n = tipo === 'pedra_pontuda' ? 5 : 9;
        var pts = [];
        for (var i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2;
            var rx = W * 0.42 * (0.75 + variar(s + i, 2) * 0.5);
            var ry = H * 0.42 * (0.75 + variar(s + i + 9, 2) * 0.5);
            if (tipo === 'pedra_pontuda') { rx = W * 0.4 * (a > -0.2 && a < 0.6 ? 0.35 : 1); ry = H * 0.44; }
            pts.push({ x: x + W / 2 + Math.cos(a) * rx, y: y + H / 2 + Math.sin(a) * ry });
        }
        var cor1 = v % 2 ? '#8d8d8d' : '#7b7b7b';
        poligono(ctx, pts, cor1);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
        elipse(ctx, x + W * 0.34, y + H * 0.30, W * 0.16, H * 0.11, v % 2 ? '#a5a5a5' : '#959595');
        if (tipo === 'rocha_grande') {
            linha(ctx, x + W * 0.4, y + H * 0.45, x + W * 0.55, y + H * 0.6, 'rgba(0,0,0,0.35)', 2);
            linha(ctx, x + W * 0.55, y + H * 0.6, x + W * 0.6, y + H * 0.8, 'rgba(0,0,0,0.3)', 1.5);
        }
        if (tipo === 'pedregulho') { circulo(ctx, x + W * 0.2, y + H * 0.3, W * 0.07, '#666'); }
    }

    function pintarMontanha(o, ctx) {
        var v = o.variante || 0, d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.5, 8);
        var cor = v % 2 ? '#5d6d7e' : '#707b7c';
        poligono(ctx, [{ x: x, y: y + H }, { x: x + W / 2, y: y }, { x: x + W, y: y + H }], cor);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke();
        // neve
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(x + W * 0.26, y + H * 0.42);
        ctx.lineTo(x + W / 2, y + H * 0.16);
        ctx.lineTo(x + W * 0.74, y + H * 0.42);
        ctx.lineTo(x + W * 0.62, y + H * 0.34);
        ctx.lineTo(x + W / 2, y + H * 0.24);
        ctx.lineTo(x + W * 0.38, y + H * 0.34);
        ctx.closePath(); ctx.fill();
        // textura
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath(); ctx.moveTo(x + W * 0.35, y + H * 0.6); ctx.lineTo(x + W * 0.42, y + H * 0.45); ctx.lineTo(x + W * 0.5, y + H * 0.6); ctx.closePath(); ctx.fill();
    }

    function pintarBloco(o, ctx, tipo) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var cor = tipo === 'bloco_granito' ? '#8d6e63' : '#757575';
        var corTopo = tipo === 'bloco_granito' ? '#a1887f' : '#9e9e9e';
        sombra(ctx, x + W / 2, y + H, W * 0.4, 4);
        var topH = H * 0.26;
        ret(ctx, x, y + topH, W, H - topH, cor);
        poligono(ctx, [{ x: x, y: y + topH }, { x: x + W / 2, y: y }, { x: x + W, y: y + topH }, { x: x + W / 2, y: y + topH * 2 }], corTopo);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x + W * 0.12, y + topH + H * 0.18, W * 0.76, H * 0.16);
        linha(ctx, x, y + topH, x + W, y + topH, '#fff', 1);
    }

    function pintarColuna(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        ret(ctx, x + W * 0.2, y + H * 0.16, W * 0.6, H * 0.84, '#b8b8a0');
        elipse(ctx, x + W / 2, y + H * 0.16, W * 0.34, H * 0.05, '#d6d6c2');
        ret(ctx, x + W * 0.16, y + H * 0.22, W * 0.68, H * 0.08, '#c9c9b0');
        ret(ctx, x + W * 0.16, y + H * 0.84, W * 0.68, H * 0.08, '#c9c9b0');
        ret(ctx, x + W * 0.32, y + H * 0.3, W * 0.08, H * 0.5, '#8f8f78');
        ret(ctx, x + W * 0.60, y + H * 0.3, W * 0.08, H * 0.5, '#8f8f78');
    }

    function pintarObelisco(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        poligono(ctx, [{ x: x + W * 0.22, y: y + H }, { x: x + W * 0.3, y: y + H * 0.18 }, { x: x + W * 0.5, y: y }, { x: x + W * 0.7, y: y + H * 0.18 }, { x: x + W * 0.78, y: y + H }], '#a67c52');
        ret(ctx, x + W * 0.18, y + H * 0.86, W * 0.64, H * 0.14, '#8d6239');
        ctx.strokeStyle = '#f4d9a8'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x + W * 0.34, y + H * 0.22); ctx.lineTo(x + W * 0.34, y + H * 0.8); ctx.stroke();
    }

    function pintarRuina(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.42, 4);
        var base = y + H * 0.72;
        poligono(ctx, [{ x: x + W * 0.06, y: y + H }, { x: x + W * 0.1, y: base }, { x: x + W * 0.34, y: base }, { x: x + W * 0.3, y: y + H }], '#8f8a75');
        poligono(ctx, [{ x: x + W * 0.34, y: y + H }, { x: x + W * 0.4, y: y + H * 0.28 }, { x: x + W * 0.56, y: y + H * 0.28 }, { x: x + W * 0.66, y: y + H }], '#9e9782');
        ret(ctx, x + W * 0.62, y + H * 0.52, W * 0.3, H * 0.48, '#8f8a75');
        ret(ctx, x + W * 0.62, y + H * 0.52, W * 0.12, H * 0.48, '#a39c87');
        for (var i = 0; i < 3; i++) circulo(ctx, x + W * (0.14 + i * 0.2), y + H * 0.9, W * 0.04, '#6f6a58');
    }

    function pintarParedeTijolo(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.46, 4);
        ret(ctx, x, y, W, H, '#a84325');
        ctx.strokeStyle = '#6e2a15'; ctx.lineWidth = 2;
        ctx.strokeRect(x, y, W, H);
        var rows = Math.max(2, Math.round(H / 12));
        var th = H / rows;
        for (var r = 0; r < rows; r++) {
            var off = (r % 2) * 14;
            linha(ctx, x, y + (r + 1) * th, x + W, y + (r + 1) * th, '#6e2a15', 2);
            for (var c = off; c < W; c += 28) { linha(ctx, x + c, y + r * th, x + c, y + (r + 1) * th, '#6e2a15', 2); }
        }
    }

    function pintarParedeMadeira(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.46, 4);
        ret(ctx, x, y, W, H, '#8d6239');
        ctx.strokeStyle = '#5d3f1e'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, W, H);
        var n = Math.max(2, Math.round(H / 9));
        for (var i = 0; i < n; i++) { linha(ctx, x, y + (i + 1) * (H / n), x + W, y + (i + 1) * (H / n), '#5d3f1e', 1.5); }
        for (var j = 0; j < Math.round(W / 22); j++) { linha(ctx, x + j * 22, y, x + j * 22 + 4, y, '#5d3f1e', 1); }
    }

    function pintarCerca(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ret(ctx, x, y + H * 0.36, W, H * 0.14, '#7a5230');
        ret(ctx, x, y + H * 0.66, W, H * 0.14, '#7a5230');
        var n = Math.max(2, Math.round(W / 18));
        for (var i = 0; i < n; i++) {
            var px = x + (i / (n - 1 || 1)) * (W - 6);
            ret(ctx, px, y, 5, H, '#5d3f1e');
            ret(ctx, px + 1, y - 2, 3, 4, '#8d6239');
        }
        sombra(ctx, x + W / 2, y + H, W * 0.46, 3);
    }

    function pintarTorre(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 4);
        ret(ctx, x + W * 0.2, y + H * 0.14, W * 0.6, H * 0.86, '#8f9aa3');
        poligono(ctx, [{ x: x + W * 0.08, y: y + H * 0.2 }, { x: x + W / 2, y: y }, { x: x + W * 0.92, y: y + H * 0.2 }, { x: x + W * 0.82, y: y + H * 0.24 }, { x: x + W * 0.5, y: y + H * 0.1 }, { x: x + W * 0.18, y: y + H * 0.24 }], '#aeb6bf');
        circulo(ctx, x + W / 2, y + H * 0.34, W * 0.09, '#ffd166');
        ret(ctx, x + W * 0.36, y + H * 0.42, W * 0.28, H * 0.1, '#5d6d7e');
        var n = Math.max(2, Math.round(H / 22));
        for (var i = 0; i < n - 2; i++) linha(ctx, x + W * 0.22, y + H * (0.52 + i * 0.17), x + W * 0.78, y + H * (0.52 + i * 0.17), 'rgba(0,0,0,0.18)', 1.5);
    }

    function pintarMoita(o, ctx, tipo) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var big = tipo === 'moita_esconderijo';
        sombra(ctx, x + W / 2, y + H, W * 0.46, 4);
        var c1 = big ? '#1b5e20' : '#2e7d32', c2 = big ? '#2e7d32' : '#388e3c';
        elipse(ctx, x + W * 0.5, y + H * 0.38, W * 0.46, H * 0.5, c2);
        for (var i = 0; i < (big ? 8 : 6); i++) {
            var ang = (i / (big ? 8 : 6)) * Math.PI * 2 + variar(s + i, 3);
            circulo(ctx, x + W * 0.5 + Math.cos(ang) * W * 0.3, y + H * 0.38 + Math.sin(ang) * H * 0.34, W * (0.16 + variar(s + i, 2) * 0.08), i % 2 ? c1 : c2);
        }
        circulo(ctx, x + W * 0.4, y + H * 0.32, W * 0.12, '#4caf50');
        circulo(ctx, x + W * 0.58, y + H * 0.36, W * 0.09, '#66bb6a');
        if (big) { circulo(ctx, x + W * 0.5, y + H * 0.3, W * 0.15, '#1b5e20'); }
    }

    function pintarArbusto(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        elipse(ctx, x + W * 0.5, y + H * 0.5, W * 0.45, H * 0.42, '#2e7d32');
        circulo(ctx, x + W * 0.35, y + H * 0.42, W * 0.18, '#43a047');
        circulo(ctx, x + W * 0.62, y + H * 0.5, W * 0.12, '#66bb6a');
    }

    function pintarGrama(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        for (var i = 0; i < 8; i++) {
            var gx = x + (variar(s + i, 2)) * W;
            ctx.strokeStyle = i % 2 ? '#4caf50' : '#388e3c';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(gx, y + H);
            ctx.quadraticCurveTo(gx + 2, y + H * 0.5, gx + 1 + variar(s + i, 2) * 2, y + H * 0.1);
            ctx.stroke();
        }
    }

    function pintarCapim(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        for (var i = 0; i < 7; i++) {
            var gx = x + (variar(s + i, 2)) * W;
            ctx.strokeStyle = i % 2 ? '#7cb342' : '#9ccc65';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(gx, y + H);
            ctx.quadraticCurveTo(gx - 2, y + H * 0.45, gx - 3, y);
            ctx.stroke();
        }
    }

    function pintarSamambaia(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        for (var i = 0; i < 5; i++) {
            var gx = x + (variar(s + i, 2)) * W * 0.9;
            ctx.strokeStyle = i % 2 ? '#558b2f' : '#689f38';
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(gx, y + H);
            ctx.quadraticCurveTo(gx - W * 0.12, y + H * 0.5, gx + W * 0.08, y);
            for (var l = 1; l < 4; l++) {
                var ly = y + H * (1 - l / 5);
                ctx.moveTo(gx - W * 0.05, ly); ctx.lineTo(gx - W * 0.14, ly - 4);
                ctx.moveTo(gx + W * 0.03, ly); ctx.lineTo(gx + W * 0.12, ly - 4);
            }
            ctx.stroke();
        }
    }

    function pintarBambu(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.3, 3);
        var n = Math.max(2, Math.round(W / 9));
        for (var i = 0; i < n; i++) {
            var bx = x + (i + 0.5) * (W / n);
            ret(ctx, bx - W * 0.08, y, W * 0.16, H, '#4caf50');
            for (var seg = 1; seg < 6; seg++) { linha(ctx, bx - W * 0.08, y + H * (seg / 6), bx + W * 0.08, y + H * (seg / 6), '#1b5e20', 1.5); }
        }
        ret(ctx, x, y, W, 3, '#2e7d32');
    }

    function pintarCogumelo(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.3, 3);
        ret(ctx, x + W * 0.4, y + H * 0.55, W * 0.2, H * 0.45, '#d7ccc8');
        elipse(ctx, x + W * 0.5, y + H * 0.5, W * 0.42, H * 0.34, s % 3 === 0 ? '#c62828' : (s % 3 === 1 ? '#ef6c00' : '#6d4c41'));
        circulo(ctx, x + W * 0.4, y + H * 0.42, W * 0.07, '#fff');
        circulo(ctx, x + W * 0.58, y + H * 0.48, W * 0.05, '#fff');
    }

    function pintarTronco(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        elipse(ctx, x + W / 2, y + H * 0.6, W * 0.46, H * 0.38, '#6d4c41');
        elipse(ctx, x + W * 0.44, y + H * 0.52, W * 0.32, H * 0.26, '#8d6239');
        circulo(ctx, x + W * 0.24, y + H * 0.62, W * 0.10, '#7a5230');
        circulo(ctx, x + W * 0.7, y + H * 0.58, W * 0.08, '#7a5230');
        for (var i = 0; i < 3; i++) { circulo(ctx, x + W * (0.42 + i * 0.07), y + H * 0.5, W * 0.045, '#5d3f1e'); }
    }

    function pintarToco(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.36, 3);
        ret(ctx, x, y + H * 0.3, W, H * 0.7, '#6d4c41');
        elipse(ctx, x + W / 2, y + H * 0.3, W * 0.5, H * 0.28, '#a1887f');
        circulo(ctx, x + W * 0.42, y + H * 0.28, W * 0.10, '#8d6239');
        circulo(ctx, x + W * 0.62, y + H * 0.32, W * 0.07, '#8d6e63');
    }

    function pintarPlanta(o, ctx, tipo) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var dupla = tipo === 'planta_dupla';
        var centros = dupla ? [x + W * 0.3, x + W * 0.7] : [x + W * 0.5];
        for (var c = 0; c < centros.length; c++) {
            var px = centros[c];
            ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px, y + H); ctx.quadraticCurveTo(px + 1, y + H * 0.6, px + 2, y + H * 0.25); ctx.stroke();
            elipse(ctx, px + 6, y + H * 0.35, 6, 3, '#388e3c');
            elipse(ctx, px - 6, y + H * 0.45, 6, 3, '#43a047');
            elipse(ctx, px, y + H * 0.2, 5, 3, '#66bb6a');
        }
    }

    function pintarRosa(o, ctx, tipo) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var cor = tipo === 'rosa_amarela' ? '#f9a825' : '#c62828';
        ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x + W / 2, y + H); ctx.quadraticCurveTo(x + W / 2 + 1, y + H * 0.6, x + W / 2 + 2, y + H * 0.32); ctx.stroke();
        elipse(ctx, x + W * 0.34, y + H * 0.5, 5, 3, '#388e3c');
        elipse(ctx, x + W * 0.62, y + H * 0.6, 6, 3, '#43a047');
        circulo(ctx, x + W / 2 + 2, y + H * 0.22, W * 0.3, cor);
        circulo(ctx, x + W / 2 + 2, y + H * 0.22, W * 0.2, '#ad1457');
        circulo(ctx, x + W * 0.4, y + H * 0.16, 2.5, '#f8bbd0');
    }

    function pintarFlorRoxa(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ctx.strokeStyle = '#33691e'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x + W / 2, y + H); ctx.quadraticCurveTo(x + W / 2 + 1, y + H * 0.55, x + W / 2 + 3, y + H * 0.25); ctx.stroke();
        for (var i = 0; i < 6; i++) {
            var a = i * Math.PI / 3;
            circulo(ctx, x + W / 2 + 3 + Math.cos(a) * W * 0.22, y + H * 0.2 + Math.sin(a) * W * 0.22, W * 0.13, '#ab47bc');
        }
        circulo(ctx, x + W / 2 + 3, y + H * 0.2, W * 0.12, '#f3e5f5');
    }

    function pintarGirassol(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + W / 2, y + H); ctx.quadraticCurveTo(x + W / 2 + 2, y + H * 0.5, x + W / 2 + 4, y + H * 0.2); ctx.stroke();
        elipse(ctx, x + W * 0.36, y + H * 0.5, 7, 4, '#388e3c');
        elipse(ctx, x + W * 0.68, y + H * 0.62, 8, 4, '#43a047');
        for (var i = 0; i < 10; i++) {
            var a = i * Math.PI / 5;
            circulo(ctx, x + W / 2 + 4 + Math.cos(a) * W * 0.26, y + H * 0.22 + Math.sin(a) * W * 0.26, W * 0.10, i % 2 ? '#fdd835' : '#ffeb3b');
        }
        circulo(ctx, x + W / 2 + 4, y + H * 0.22, W * 0.14, '#6d4c41');
    }

    function pintarTulipa(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        var cores = ['#e53935', '#ec407a', '#ffb300'];
        var cor = cores[(o.variante || 0) % 3];
        ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x + W / 2, y + H); ctx.quadraticCurveTo(x + W / 2, y + H * 0.5, x + W / 2 + 1, y + H * 0.3); ctx.stroke();
        elipse(ctx, x + W * 0.62, y + H * 0.55, 6, 3, '#43a047');
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.moveTo(x + W / 2, y + H * 0.28);
        ctx.quadraticCurveTo(x + W * 0.2, y - 2, x + W * 0.36, y + H * 0.28);
        ctx.quadraticCurveTo(x + W / 2, y + H * 0.32, x + W * 0.64, y + H * 0.28);
        ctx.quadraticCurveTo(x + W * 0.8, y - 2, x + W / 2, y + H * 0.28);
        ctx.fill();
    }

    function pintarCacto(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.3, 3);
        ret(ctx, x + W * 0.38, y + H * 0.18, W * 0.24, H * 0.82, '#2e7d32');
        ret(ctx, x + W * 0.3, y + H * 0.4, W * 0.14, H * 0.14, '#2e7d32');
        ret(ctx, x + W * 0.56, y + H * 0.44, W * 0.14, H * 0.14, '#2e7d32');
        ret(ctx, x + W * 0.3, y + H * 0.4, W * 0.14, H * 0.14, '#2e7d32');
        ctx.fillStyle = '#43a047';
        ctx.beginPath(); ctx.moveTo(x + W * 0.44, y + H * 0.4); ctx.lineTo(x + W * 0.5, y + H * 0.32); ctx.lineTo(x + W * 0.56, y + H * 0.4); ctx.fill();
        ctx.fillStyle = '#f06292';
        ctx.beginPath(); ctx.moveTo(x + W * 0.34, y + H * 0.43); ctx.lineTo(x + W * 0.37, y + H * 0.38); ctx.lineTo(x + W * 0.4, y + H * 0.43); ctx.fill();
        ctx.fillStyle = '#f8bbd0';
        ctx.beginPath(); ctx.moveTo(x + W * 0.58, y + H * 0.47); ctx.lineTo(x + W * 0.61, y + H * 0.42); ctx.lineTo(x + W * 0.64, y + H * 0.47); ctx.fill();
    }

    function pintarAgua(o, ctx, t, tipo) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        if (tipo === 'lagoa') {
            sombra(ctx, x + W / 2, y + H, W * 0.46, 6);
            var g = ctx.createRadialGradient(x + W / 2, y + H * 0.42, 6, x + W / 2, y + H * 0.42, W * 0.5);
            g.addColorStop(0, '#57c3e8'); g.addColorStop(1, '#14639c');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(x + W / 2, y + H * 0.44, W * 0.46, H * 0.42, 0, 0, Math.PI * 2); ctx.fill();
            for (var pe = 0; pe < 7; pe++) {
                var aang = (pe / 7) * Math.PI * 2;
                elipse(ctx, x + W / 2 + Math.cos(aang) * W * 0.46, y + H * 0.44 + Math.sin(aang) * H * 0.42, W * 0.06, H * 0.05, '#8d6e63');
            }
        } else {
            sombra(ctx, x + W / 2, y + H, W * 0.46, 5);
            var g2 = ctx.createLinearGradient(x, y, x, y + H);
            g2.addColorStop(0, '#3aa0d9'); g2.addColorStop(1, '#0e4f7e');
            ctx.fillStyle = g2; ctx.fillRect(x, y, W, H);
            ctx.strokeStyle = 'rgba(230,247,255,0.55)'; ctx.lineWidth = 1.6;
            var ondas = Math.max(2, Math.floor(H / 20));
            for (var wl = 0; wl < ondas; wl++) {
                var yy = y + 12 + wl * (H / (ondas + 1));
                ctx.beginPath();
                for (var xx = x; xx <= x + W; xx += 7) {
                    var wave = Math.sin((xx / 13) + (t || 0) * 1.6 + wl * 1.3) * 2.3;
                    xx === x ? ctx.moveTo(xx, yy + wave) : ctx.lineTo(xx, yy + wave);
                }
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(255,255,255,0.20)';
            ctx.beginPath(); ctx.ellipse(x + W * 0.32, y + H * 0.3, W * 0.18, H * 0.06, 0.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        ctx.strokeRect(x, y, W, H);
    }

    function pintarBanco(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        ret(ctx, x, y + H * 0.3, W, H * 0.22, '#8d6239');
        ret(ctx, x, y + H * 0.06, W, H * 0.14, '#7a5230');
        ret(ctx, x + 3, y + H * 0.52, 5, H * 0.48, '#5d3f1e');
        ret(ctx, x + W - 8, y + H * 0.52, 5, H * 0.48, '#5d3f1e');
    }

    function pintarLamparina(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ret(ctx, x + W * 0.45, y + H * 0.2, W * 0.1, H * 0.8, '#263238');
        circulo(ctx, x + W / 2, y + H * 0.16, W * 0.3, '#5d6d7e');
        var acesa = (typeof window.isLuzMapaAtiva === 'function') ? window.isLuzMapaAtiva() : true;
        if (acesa || window.mapaEditorAtivo) {
            ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14;
            circulo(ctx, x + W / 2, y + H * 0.16, W * 0.14, '#ffe082');
            ctx.shadowBlur = 0;
        } else {
            // Apagada de dia (vidro fosco cinza, sem emissão de luz)
            ctx.fillStyle = '#4a4e52';
            circulo(ctx, x + W / 2, y + H * 0.16, W * 0.14, '#373a3c');
        }
    }

    function pintarEstaca(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ret(ctx, x + W * 0.42, y + H * 0.15, W * 0.16, H * 0.85, '#5d3f1e');
        poligono(ctx, [{ x: x + W * 0.4, y: y + H * 0.16 }, { x: x + W / 2, y: y }, { x: x + W * 0.6, y: y + H * 0.2 }], '#4e342e');
        circulo(ctx, x + W / 2, y + H * 0.14, W * 0.22, '#ff6b35');
    }

    function pintarBandeira(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ret(ctx, x + W * 0.2, y, W * 0.08, H, '#7a5230');
        var s = seedDe(o), cor = ['#e53935', '#1e88e5', '#43a047', '#fdd835'][s % 4];
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.moveTo(x + W * 0.28, y + H * 0.06);
        ctx.quadraticCurveTo(x + W * 0.85, y + H * 0.06 + Math.sin((t || 0) * 5 + s) * 3, x + W * 0.9, y + H * 0.13);
        ctx.lineTo(x + W * 0.28, y + H * 0.13);
        ctx.closePath(); ctx.fill();
    }

    function pintarAncoradouro(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 4);
        ret(ctx, x, y + H * 0.62, W, H * 0.38, '#5f6a6f');
        var n = Math.max(2, Math.round(W / 22));
        for (var i = 0; i < n; i++) {
            var px = x + i * (W / n);
            ret(ctx, px + 2, y + H * 0.5, (W / n) - 4, H * 0.2, '#8d6239');
            ret(ctx, px + 2, y + H * 0.44, 4, H * 0.1, '#4e342e');
        }
        ret(ctx, x + W * 0.44, y + H * 0.28, W * 0.12, H * 0.24, '#4e342e');
    }

    // ============================================================================
    // NOVOS OBJETOS v2.2 (~36 modelos: paredes vivas/labirinto, árvores, pedras,
    // estruturas, flores, decorações e cenário)
    // ============================================================================
    function pintarArvoreSakura(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.34, 4);
        ret(ctx, x + W * 0.44, y + H * 0.5, W * 0.14, H * 0.5, '#6d4c41');
        elipse(ctx, x + W * 0.3, y + H * 0.4, W * 0.32, H * 0.24, '#f8bbd0');
        elipse(ctx, x + W * 0.7, y + H * 0.42, W * 0.3, H * 0.22, '#f48fb1');
        elipse(ctx, x + W * 0.5, y + H * 0.3, W * 0.36, H * 0.28, '#f8bbd0');
        circulo(ctx, x + W * 0.42, y + H * 0.22, W * 0.13, '#ffcce0');
        circulo(ctx, x + W * 0.56, y + H * 0.26, W * 0.09, '#ffb6c1');
    }

    function pintarCarvalho(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.42, 5);
        ret(ctx, x + W * 0.38, y + H * 0.38, W * 0.24, H * 0.62, '#4e342e');
        ret(ctx, x + W * 0.56, y + H * 0.5, W * 0.16, H * 0.5, '#5d4037');
        elipse(ctx, x + W * 0.3, y + H * 0.3, W * 0.36, H * 0.26, '#1b5e20');
        elipse(ctx, x + W * 0.74, y + H * 0.32, W * 0.34, H * 0.24, '#2e7d32');
        elipse(ctx, x + W * 0.5, y + H * 0.16, W * 0.46, H * 0.26, '#2e7d32');
        circulo(ctx, x + W * 0.4, y + H * 0.12, W * 0.14, '#388e3c');
    }

    function pintarMuda(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + W / 2, y + H); ctx.quadraticCurveTo(x + W / 2 + 1, y + H * 0.6, x + W / 2 + 3, y + H * 0.35); ctx.stroke();
        elipse(ctx, x + W / 2 + 7, y + H * 0.3, 7, 4, '#388e3c');
        elipse(ctx, x + W / 2 - 5, y + H * 0.4, 6, 3.5, '#43a047');
        circulo(ctx, x + W / 2 + 3, y + H * 0.16, 3, '#66bb6a');
    }

    function pintarSebe(o, ctx, tipo) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.5, 4);
        var florida = (tipo === 'parede_viva_florida' || tipo === 'roseiral');
        var c1 = florida ? '#14532d' : '#1b5e20';
        var c2 = florida ? '#388e3c' : '#2e7d32';
        var n = Math.max(3, Math.round(W / 11));
        for (var i = 0; i <= n; i++) {
            elipse(ctx, x + (i / n) * W, y + H * 0.45, Math.max(7, W / n * 0.8), Math.max(9, H * 0.8), i % 2 ? c1 : c2);
        }
        elipse(ctx, x + W / 2 + W * 0.06, y + H * 0.1, W * 0.5, 6, c1);
        if (tipo === 'parede_viva_florida') {
            for (var f = 0; f < 5; f++) {
                circulo(ctx, x + W * (0.12 + f * 0.19) + ((f % 2) ? 5 : 0), y + H * 0.22 + ((f * 7) % 3) * 4, 4, f % 2 ? '#c62828' : '#f06292');
            }
        } else if (tipo === 'roseiral') {
            for (var r = 0; r < 6; r++) {
                circulo(ctx, x + W * (0.08 + r * 0.16), y + H * 0.38 + ((r * 13) % 5) * 3, 5, r % 2 ? '#c62828' : '#e53935');
            }
        }
    }

    function pintarSebeCanto(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.5, 4);
        var c1 = '#1b5e20', c2 = '#2e7d32';
        for (var i = 0; i <= 8; i++) elipse(ctx, x + (i / 8) * W * 0.78, y + H * 0.3, Math.max(7, W * 0.09), Math.max(9, H * 0.4), i % 2 ? c1 : c2);
        for (var j = 0; j <= 8; j++) elipse(ctx, x + W * 0.84, y + H * 0.3 + (j / 8) * H * 0.6, Math.max(7, W * 0.1), Math.max(9, H * 0.3), j % 2 ? c2 : c1);
        elipse(ctx, x + W * 0.84, y + H * 0.34, W * 0.24, H * 0.4, c1);
    }

    function pintarPedraMusgo(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 3);
        var pts = [];
        for (var i = 0; i < 8; i++) {
            var a = i / 8 * Math.PI * 2;
            pts.push({ x: x + W / 2 + Math.cos(a) * W * 0.45, y: y + H / 2 + Math.sin(a) * H * 0.44 });
        }
        poligono(ctx, pts, '#8d8d8d');
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
        elipse(ctx, x + W * 0.3, y + H * 0.35, W * 0.2, H * 0.12, '#9a9a9a');
        for (var m = 0; m < 4; m++) circulo(ctx, x + W * (0.15 + m * 0.22), y + H * 0.55 + ((m * 7) % 3) * 5, 6, m % 2 ? '#558b2f' : '#689f38');
    }

    function pintarLaje(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.48, 2);
        ctx.fillStyle = '#9e9e9e';
        ctx.beginPath(); ctx.ellipse(x + W / 2, y + H / 2, W * 0.48, H * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#bdbdbd';
        ctx.beginPath(); ctx.ellipse(x + W / 2, y + H / 2 - 3, W * 0.44, H * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath(); ctx.ellipse(x + W * 0.45, y + H * 0.5, W * 0.1, H * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    }

    function pintarPilhaPedra(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.42, 3);
        elipse(ctx, x + W * 0.35, y + H * 0.7, W * 0.3, H * 0.22, '#8d8d8d');
        elipse(ctx, x + W * 0.62, y + H * 0.75, W * 0.26, H * 0.2, '#757575');
        elipse(ctx, x + W * 0.5, y + H * 0.45, W * 0.3, H * 0.24, '#9e9e9e');
        circulo(ctx, x + W * 0.44, y + H * 0.38, W * 0.1, '#bdbdbd');
    }

    function pintarCristaisRocha(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 3);
        poligono(ctx, [
            { x: x, y: y + H }, { x: x + W * 0.3, y: y + H * 0.55 }, { x: x + W * 0.75, y: y + H * 0.6 }, { x: x + W, y: y + H }, { x: x + W * 0.55, y: y + H * 0.95 }
        ], '#8f8f8f');
        ctx.fillStyle = '#7ee7ff';
        ctx.shadowColor = '#7ee7ff'; ctx.shadowBlur = 8;
        poligono(ctx, [{ x: x + W * 0.32, y: y + H * 0.42 }, { x: x + W * 0.42, y: y }, { x: x + W * 0.48, y: y + H * 0.42 }], '#a5f1ff');
        poligono(ctx, [{ x: x + W * 0.62, y: y + H * 0.46 }, { x: x + W * 0.7, y: y + H * 0.12 }, { x: x + W * 0.78, y: y + H * 0.46 }], '#a5f1ff');
        poligono(ctx, [{ x: x + W * 0.45, y: y + H * 0.4 }, { x: x + W * 0.52, y: y + H * 0.18 }, { x: x + W * 0.58, y: y + H * 0.4 }], '#c9f7ff');
        ctx.shadowBlur = 0;
    }

    function pintarPedraLunar(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 3);
        ctx.fillStyle = '#546e7a';
        ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.ellipse(x + W / 2, y + H / 2, W * 0.44, H * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#80deea';
        ctx.beginPath(); ctx.ellipse(x + W * 0.4, y + H * 0.35, W * 0.12, H * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b2ebf2';
        ctx.beginPath(); ctx.ellipse(x + W * 0.62, y + H * 0.55, W * 0.08, H * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    }

    function pintarMuroPedra(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.48, 4);
        ret(ctx, x, y, W, H, '#8f8a75');
        ctx.strokeStyle = '#6f6a58'; ctx.lineWidth = 2;
        ctx.strokeRect(x, y, W, H);
        var n = Math.max(2, Math.round(H / 14));
        for (var r = 0; r < n; r++) {
            linha(ctx, x, y + (r + 1) * (H / n), x + W, y + (r + 1) * (H / n), '#6f6a58', 2);
            for (var c = (r % 2) * 12; c < W; c += 24) linha(ctx, x + c, y + r * (H / n), x + c, y + (r + 1) * (H / n), '#6f6a58', 2);
        }
        ret(ctx, x, y - 3, W, 3, '#a39c87');
        ret(ctx, x, y + H, W, 3, '#6f6a58');
    }

    function pintorRotacionado(pintor, angulo, alturaBase) {
        return function (o, ctx, t) {
            var escala = o.escala || 1;
            var d = dims(o);
            var troca = Math.abs(angulo) === Math.PI / 2;
            var baseW = troca ? d.H : d.W;
            var baseH = troca ? d.W : (alturaBase ? Math.min(d.H, alturaBase * escala) : d.H);
            var base = Object.assign({}, o, {
                x: d.x + d.W / 2 - baseW / 2,
                y: d.y + d.H / 2 - baseH / 2,
                w: baseW / escala,
                h: baseH / escala
            });
            ctx.save();
            ctx.translate(d.x + d.W / 2, d.y + d.H / 2);
            ctx.rotate(angulo);
            ctx.translate(-(d.x + d.W / 2), -(d.y + d.H / 2));
            pintor(base, ctx, t);
            ctx.restore();
        };
    }

    function pintarMontanhaBioma(o, ctx, tipo) {
        var v = o.variante || 0, d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W * 0.52, y + H * 0.98, W * 0.48, H * 0.07, 0.34);
        if (tipo === 'duna_gigante') {
            var duna = ctx.createLinearGradient(x, y + H * 0.35, x + W, y + H);
            duna.addColorStop(0, '#f7d98b'); duna.addColorStop(0.55, '#d9a94f'); duna.addColorStop(1, '#9b6834');
            ctx.fillStyle = duna;
            ctx.beginPath(); ctx.moveTo(x, y + H * 0.86);
            ctx.bezierCurveTo(x + W * 0.28, y + H * 0.12, x + W * 0.68, y + H * 0.08, x + W, y + H * 0.62);
            ctx.lineTo(x + W, y + H); ctx.lineTo(x, y + H); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(255,244,190,0.72)'; ctx.lineWidth = Math.max(2, H * 0.025);
            ctx.beginPath(); ctx.moveTo(x + W * 0.08, y + H * 0.78);
            ctx.bezierCurveTo(x + W * 0.35, y + H * 0.42, x + W * 0.66, y + H * 0.32, x + W * 0.94, y + H * 0.58); ctx.stroke();
            return;
        }
        var topo = tipo === 'montanha_vulcanica' ? '#292d33' : (tipo === 'montanha_neve' ? '#718999' : '#626b70');
        var luz = tipo === 'montanha_vulcanica' ? '#55504d' : (tipo === 'montanha_neve' ? '#a8c1ce' : '#9aa19e');
        var sombraRocha = tipo === 'montanha_vulcanica' ? '#171b20' : '#414b50';
        var baseY = y + H * 0.92;
        var picoX = x + W * (0.48 + (v % 3 - 1) * 0.035);
        poligono(ctx, [{ x: x + W * 0.03, y: baseY }, { x: x + W * 0.22, y: y + H * 0.4 }, { x: x + W * 0.38, y: y + H * 0.54 }, { x: picoX, y: y + H * 0.05 }, { x: x + W * 0.66, y: y + H * 0.42 }, { x: x + W * 0.82, y: y + H * 0.3 }, { x: x + W * 0.98, y: baseY }], topo);
        poligono(ctx, [{ x: picoX, y: y + H * 0.05 }, { x: x + W * 0.66, y: y + H * 0.42 }, { x: x + W * 0.98, y: baseY }, { x: x + W * 0.54, y: baseY }], sombraRocha);
        poligono(ctx, [{ x: x + W * 0.03, y: baseY }, { x: x + W * 0.22, y: y + H * 0.4 }, { x: x + W * 0.38, y: y + H * 0.54 }, { x: picoX, y: y + H * 0.05 }, { x: x + W * 0.53, y: baseY }], luz);
        if (tipo === 'montanha_neve' || tipo === 'montanha_gigante') {
            var neve = tipo === 'montanha_neve' ? '#f1fbff' : '#e0e8e8';
            poligono(ctx, [{ x: picoX, y: y + H * 0.05 }, { x: x + W * 0.39, y: y + H * 0.33 }, { x: x + W * 0.46, y: y + H * 0.28 }, { x: x + W * 0.52, y: y + H * 0.38 }, { x: x + W * 0.60, y: y + H * 0.30 }, { x: x + W * 0.66, y: y + H * 0.42 }, { x: picoX, y: y + H * 0.22 }], neve);
        }
        ctx.strokeStyle = 'rgba(28,35,39,0.42)'; ctx.lineWidth = Math.max(1.5, W * 0.009);
        for (var i = 0; i < 5; i++) {
            var sx = x + W * (0.18 + i * 0.14);
            ctx.beginPath(); ctx.moveTo(sx, y + H * (0.55 + (i % 2) * 0.08));
            ctx.lineTo(sx + W * 0.045, y + H * (0.74 + (i % 3) * 0.035));
            ctx.lineTo(sx + W * 0.02, y + H * 0.86); ctx.stroke();
        }
        if (tipo === 'montanha_vulcanica') {
            ctx.strokeStyle = '#ff6a21'; ctx.lineWidth = Math.max(3, W * 0.018); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(picoX, y + H * 0.15); ctx.lineTo(picoX - W * 0.06, y + H * 0.4); ctx.lineTo(picoX + W * 0.02, y + H * 0.57); ctx.stroke();
            ctx.strokeStyle = '#ffd166'; ctx.lineWidth = Math.max(1, W * 0.005); ctx.stroke();
            ctx.lineCap = 'butt';
        }
    }

    function pintarIceberg(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W * 0.52, y + H * 0.94, W * 0.48, H * 0.1, 0.34);
        poligono(ctx, [{ x: x + W * 0.07, y: y + H * 0.92 }, { x: x + W * 0.2, y: y + H * 0.45 },
            { x: x + W * 0.37, y: y + H * 0.5 }, { x: x + W * 0.53, y: y + H * 0.05 },
            { x: x + W * 0.72, y: y + H * 0.41 }, { x: x + W * 0.9, y: y + H * 0.34 },
            { x: x + W * 0.96, y: y + H * 0.9 }], '#5ca9c0');
        poligono(ctx, [{ x: x + W * 0.2, y: y + H * 0.45 }, { x: x + W * 0.53, y: y + H * 0.05 },
            { x: x + W * 0.55, y: y + H * 0.9 }, { x: x + W * 0.07, y: y + H * 0.92 }], '#d7f5f6');
        poligono(ctx, [{ x: x + W * 0.53, y: y + H * 0.05 }, { x: x + W * 0.72, y: y + H * 0.41 },
            { x: x + W * 0.62, y: y + H * 0.53 }, { x: x + W * 0.55, y: y + H * 0.9 }], '#9adce5');
        poligono(ctx, [{ x: x + W * 0.72, y: y + H * 0.41 }, { x: x + W * 0.9, y: y + H * 0.34 },
            { x: x + W * 0.96, y: y + H * 0.9 }, { x: x + W * 0.55, y: y + H * 0.9 }], '#347e9d');
        linha(ctx, x + W * 0.25, y + H * 0.5, x + W * 0.37, y + H * 0.68, 'rgba(255,255,255,0.75)', 2);
        linha(ctx, x + W * 0.75, y + H * 0.47, x + W * 0.69, y + H * 0.72, 'rgba(221,250,255,0.7)', 2);
    }

    function pintarRuinaAncestral(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W * 0.52, y + H, W * 0.48, 5);
        ret(ctx, x + W * 0.08, y + H * 0.32, W * 0.84, H * 0.62, '#526e78');
        poligono(ctx, [{ x: x + W * 0.04, y: y + H * 0.34 }, { x: x + W * 0.24, y: y + H * 0.08 },
            { x: x + W * 0.42, y: y + H * 0.3 }, { x: x + W * 0.62, y: y + H * 0.06 },
            { x: x + W * 0.96, y: y + H * 0.34 }], '#9ab3b4');
        ret(ctx, x + W * 0.2, y + H * 0.48, W * 0.17, H * 0.42, '#203f4e');
        ret(ctx, x + W * 0.64, y + H * 0.48, W * 0.16, H * 0.42, '#274956');
        ret(ctx, x + W * 0.43, y + H * 0.58, W * 0.17, H * 0.34, '#183947');
        ctx.strokeStyle = 'rgba(205,235,222,0.65)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + W * 0.15, y + H * 0.38); ctx.lineTo(x + W * 0.35, y + H * 0.4);
        ctx.moveTo(x + W * 0.73, y + H * 0.36); ctx.lineTo(x + W * 0.83, y + H * 0.4); ctx.stroke();
        for (var i = 0; i < 5; i++) {
            ctx.strokeStyle = i % 2 ? '#557f66' : '#78966b'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x + W * (0.13 + i * 0.17), y + H * 0.38);
            ctx.quadraticCurveTo(x + W * (0.11 + i * 0.18), y + H * 0.14, x + W * (0.18 + i * 0.16), y + H * 0.2); ctx.stroke();
        }
    }

    function pintarParedeGelo(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.48, 5);
        var gelo = ctx.createLinearGradient(x, y, x + W, y + H);
        gelo.addColorStop(0, '#e4fbff'); gelo.addColorStop(0.45, '#83cddd'); gelo.addColorStop(1, '#397c9c');
        ctx.fillStyle = gelo; ctx.fillRect(x, y + H * 0.1, W, H * 0.9);
        poligono(ctx, [{ x: x, y: y + H * 0.1 }, { x: x + W * 0.18, y: y }, { x: x + W * 0.35, y: y + H * 0.1 }, { x: x + W * 0.57, y: y - H * 0.03 }, { x: x + W * 0.76, y: y + H * 0.1 }, { x: x + W, y: y + H * 0.02 }, { x: x + W, y: y + H * 0.24 }, { x: x, y: y + H * 0.24 }], '#c9f4fb');
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
        for (var i = 0; i < 4; i++) {
            var cx = x + W * (0.16 + i * 0.22);
            ctx.beginPath(); ctx.moveTo(cx, y + H * 0.25); ctx.lineTo(cx + W * 0.04, y + H * 0.48); ctx.lineTo(cx - W * 0.01, y + H * 0.67); ctx.stroke();
        }
    }

    function pintarMuroPantano(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.5, 5);
        ctx.strokeStyle = '#554331'; ctx.lineWidth = Math.max(4, H * 0.23); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y + H * 0.76); ctx.bezierCurveTo(x + W * 0.24, y + H * 0.34, x + W * 0.55, y + H * 0.9, x + W * 0.78, y + H * 0.38); ctx.lineTo(x + W, y + H * 0.7); ctx.stroke();
        ctx.strokeStyle = '#334d30'; ctx.lineWidth = Math.max(2, H * 0.08);
        ctx.beginPath(); ctx.moveTo(x + W * 0.2, y + H * 0.45); ctx.lineTo(x + W * 0.28, y + H); ctx.moveTo(x + W * 0.7, y + H * 0.52); ctx.lineTo(x + W * 0.62, y + H); ctx.stroke();
        for (var i = 0; i < 7; i++) circulo(ctx, x + W * (0.08 + i * 0.14), y + H * (0.28 + (i % 2) * 0.14), H * 0.055, i % 2 ? '#78934a' : '#49683a');
        ctx.lineCap = 'butt';
    }

    function pintarGramaAlta(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H, s = seedDe(o);
        sombra(ctx, x + W / 2, y + H, W * 0.38, 2, 0.14);
        for (var i = 0; i < 17; i++) {
            var bx = x + W * (0.08 + i / 19), tipX = bx + (variar(s + i, 2) - 0.5) * W * 0.22;
            var tipY = y + H * (0.08 + variar(s + i + 31, 2) * 0.42);
            ctx.strokeStyle = ['#386d35', '#4e8e3f', '#72a84b'][i % 3]; ctx.lineWidth = 1.4 + (i % 3) * 0.35;
            ctx.beginPath(); ctx.moveTo(bx, y + H); ctx.quadraticCurveTo(bx + (tipX - bx) * 0.4, y + H * 0.45, tipX, tipY); ctx.stroke();
            if (i % 3 === 0) { ctx.beginPath(); ctx.moveTo(bx, y + H * 0.78); ctx.lineTo(bx - W * 0.12, y + H * 0.58); ctx.stroke(); }
        }
    }

    function pintarJuncosPantano(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3, 0.18);
        for (var i = 0; i < 8; i++) {
            var bx = x + W * (0.12 + i * 0.105), top = y + H * (0.12 + (i % 3) * 0.08);
            ctx.strokeStyle = i % 2 ? '#587a3b' : '#758d45'; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.moveTo(bx, y + H); ctx.quadraticCurveTo(bx + (i % 2 ? 5 : -5), y + H * 0.5, bx, top); ctx.stroke();
            if (i % 2 === 0) { ctx.fillStyle = '#69472f'; ctx.beginPath(); ctx.ellipse(bx, top - 3, 2.8, 7, -0.1, 0, Math.PI * 2); ctx.fill(); }
        }
    }

    function pintarRaizesPantano(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H * 0.82, W * 0.48, 4);
        ctx.strokeStyle = '#57432c'; ctx.lineCap = 'round';
        for (var i = 0; i < 6; i++) {
            var sx = x + W * (0.2 + i * 0.12);
            ctx.lineWidth = 3 + (i % 2);
            ctx.beginPath(); ctx.moveTo(sx, y + H * 0.05); ctx.bezierCurveTo(sx - W * 0.08, y + H * 0.4, sx + W * 0.08, y + H * 0.7, sx + (i - 2.5) * W * 0.08, y + H); ctx.stroke();
        }
        ctx.lineCap = 'butt';
        for (var j = 0; j < 8; j++) circulo(ctx, x + W * (0.08 + j * 0.12), y + H * (0.76 + (j % 2) * 0.12), 2.5, j % 2 ? '#637c3f' : '#816645');
    }

    function pintarArbustoDesertico(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        var cx = x + W / 2;
        ctx.strokeStyle = '#76502b'; ctx.lineWidth = W * 0.1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx, y + H); ctx.lineTo(cx, y + H * 0.25); ctx.moveTo(cx, y + H * 0.62); ctx.lineTo(x + W * 0.2, y + H * 0.42); ctx.moveTo(cx, y + H * 0.72); ctx.lineTo(x + W * 0.82, y + H * 0.48); ctx.stroke();
        ctx.lineCap = 'butt';
        for (var i = 0; i < 7; i++) {
            var lx = x + W * (0.16 + i * 0.11), ly = y + H * (0.28 + (i % 3) * 0.1);
            elipse(ctx, lx, ly, W * 0.12, H * 0.075, i % 2 ? '#76904a' : '#91a75a');
            circulo(ctx, lx + W * 0.04, ly - 2, 1.7, '#d8c77d');
        }
    }

    function pintarCristalColossal(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.38, 4);
        var cores = ['#164e75', '#2587ae', '#65d7e8', '#b9f5f3'];
        for (var i = 0; i < 5; i++) {
            var cx = x + W * (0.16 + i * 0.17), cw = W * (0.22 - (i % 2) * 0.025), ch = H * (0.72 + (i % 3) * 0.09);
            poligono(ctx, [{ x: cx, y: y + H }, { x: cx + cw * 0.08, y: y + H - ch * 0.72 }, { x: cx + cw * 0.5, y: y + H - ch }, { x: cx + cw * 0.94, y: y + H - ch * 0.68 }, { x: cx + cw, y: y + H }], cores[i % cores.length]);
            poligono(ctx, [{ x: cx + cw * 0.5, y: y + H - ch }, { x: cx + cw * 0.94, y: y + H - ch * 0.68 }, { x: cx + cw, y: y + H }, { x: cx + cw * 0.54, y: y + H }], 'rgba(12,48,84,0.42)');
            linha(ctx, cx + cw * 0.5, y + H - ch, cx + cw * 0.42, y + H - ch * 0.22, 'rgba(255,255,255,0.65)', 1.5);
        }
    }

    function pintarRochaLava(o, ctx) {
        pintarPedra(o, ctx, 'rocha_grande');
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,93,35,0.9)'; ctx.lineWidth = Math.max(2, W * 0.035); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + W * 0.35, y + H * 0.32); ctx.lineTo(x + W * 0.48, y + H * 0.5); ctx.lineTo(x + W * 0.42, y + H * 0.77); ctx.moveTo(x + W * 0.48, y + H * 0.5); ctx.lineTo(x + W * 0.7, y + H * 0.62); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,204,102,0.8)'; ctx.lineWidth = Math.max(1, W * 0.012); ctx.stroke();
        ctx.lineCap = 'butt'; ctx.restore();
    }

    function pintarArvoreProfana(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.36, 4);
        ctx.strokeStyle = '#342c2b'; ctx.lineCap = 'round';
        ctx.lineWidth = W * 0.11;
        ctx.beginPath(); ctx.moveTo(x + W * 0.5, y + H); ctx.bezierCurveTo(x + W * 0.38, y + H * 0.68, x + W * 0.62, y + H * 0.37, x + W * 0.46, y + H * 0.1); ctx.stroke();
        ctx.lineWidth = W * 0.055;
        ctx.beginPath(); ctx.moveTo(x + W * 0.45, y + H * 0.56); ctx.lineTo(x + W * 0.15, y + H * 0.3); ctx.lineTo(x + W * 0.08, y + H * 0.12);
        ctx.moveTo(x + W * 0.52, y + H * 0.43); ctx.lineTo(x + W * 0.81, y + H * 0.24); ctx.lineTo(x + W * 0.9, y + H * 0.06);
        ctx.moveTo(x + W * 0.48, y + H * 0.7); ctx.lineTo(x + W * 0.22, y + H * 0.55); ctx.stroke();
        ctx.lineCap = 'butt';
        elipse(ctx, x + W * 0.5, y + H * 0.17, W * 0.3, H * 0.08, 'rgba(87,104,71,0.48)');
    }

    function pintarArvoreCristal(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.32, 4);
        ret(ctx, x + W * 0.46, y + H * 0.5, W * 0.09, H * 0.5, '#235c70');
        for (var i = 0; i < 5; i++) {
            var bx = x + W * (0.5 + (i - 2) * 0.09), top = y + H * (0.1 + (i % 2) * 0.12);
            ctx.strokeStyle = '#287d93'; ctx.lineWidth = Math.max(2, W * 0.035);
            ctx.beginPath(); ctx.moveTo(x + W * 0.5, y + H * 0.62); ctx.lineTo(bx, top + H * 0.3); ctx.stroke();
            var cw = W * 0.14, ch = H * 0.31;
            poligono(ctx, [{ x: bx - cw * 0.45, y: top + ch }, { x: bx - cw * 0.3, y: top + ch * 0.28 }, { x: bx, y: top }, { x: bx + cw * 0.4, y: top + ch * 0.3 }, { x: bx + cw * 0.45, y: top + ch }], i % 2 ? '#42c4d0' : '#77e4e4');
            poligono(ctx, [{ x: bx, y: top }, { x: bx + cw * 0.4, y: top + ch * 0.3 }, { x: bx + cw * 0.45, y: top + ch }, { x: bx, y: top + ch }], 'rgba(20,92,133,0.42)');
        }
    }

    function pintarMuralha(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.5, 5);
        ret(ctx, x, y + H * 0.14, W, H * 0.86, '#7d8d99');
        var n = Math.max(3, Math.round(W / 22));
        for (var i = 0; i < n; i++) {
            ret(ctx, x + (i / n) * W, y, Math.max(8, W / n * 0.55), H * 0.16, '#8ea0ad');
        }
        ret(ctx, x, y + H * 0.2, W, H * 0.12, '#93a5b2');
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (var f = 0; f < n - 1; f++) ret(ctx, x + (f / n) * W + 4, y + H * 0.4, Math.max(6, W / n * 0.3), H * 0.14);
    }

    function pintarPortao(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 4);
        ret(ctx, x, y + H * 0.1, W * 0.14, H * 0.9, '#5d3f1e');
        ret(ctx, x + W * 0.86, y + H * 0.1, W * 0.14, H * 0.9, '#5d3f1e');
        ret(ctx, x - 3, y + H * 0.08, W + 6, 10, '#8d6239');
        ctx.fillStyle = '#8d6239';
        for (var i = 0; i < 5; i++) {
            ctx.fillRect(x + W * 0.14, y + H * (0.24 + i * 0.15), W * 0.72, 4);
        }
        ret(ctx, x + W * 0.14, y + H * 0.32, W * 0.72, 8, '#a1784a');
    }

    function pintarPonte(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.48, 4);
        ret(ctx, x, y + H * 0.55, W, H * 0.3, '#8d6239');
        var n = Math.max(4, Math.round(W / 16));
        for (var i = 0; i < n; i++) linha(ctx, x + i * (W / n), y + H * 0.55, x + i * (W / n) + 4, y + H * 0.3, '#6d4c41', 2);
        ret(ctx, x, y + H * 0.3, W, 5, '#a1784a');
        ret(ctx, x, y + H * 0.85, W, 5, '#5d3f1e');
        ret(ctx, x + 1, y + H * 0.28, 5, H * 0.72, '#5d3f1e');
        ret(ctx, x + W - 6, y + H * 0.28, 5, H * 0.72, '#5d3f1e');
        ret(ctx, x + W * 0.2, y + H * 0.55, 6, H * 0.45, '#6f6a58');
        ret(ctx, x + W * 0.75, y + H * 0.55, 6, H * 0.45, '#6f6a58');
    }

    function pintarPalicada(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.48, 4);
        var n = Math.max(4, Math.round(W / 10));
        for (var i = 0; i < n; i++) {
            var px = x + (i / n) * W;
            ret(ctx, px + 1, y + H * 0.12, Math.max(5, W / n - 2), H * 0.88, i % 2 ? '#7a5230' : '#8d6239');
            poligono(ctx, [
                { x: px + 1, y: y + H * 0.12 },
                { x: px + (W / n) / 2, y: y },
                { x: px + Math.max(4, W / n - 1), y: y + H * 0.12 }
            ], '#6d4c41');
        }
        ret(ctx, x - 2, y + H * 0.4, W + 4, 4, '#5d3f1e');
        ret(ctx, x - 2, y + H * 0.75, W + 4, 4, '#5d3f1e');
    }

    function pintarFogo(ctx, cx, cy, r, t, cor) {
        ctx.fillStyle = cor;
        ctx.shadowColor = cor; ctx.shadowBlur = 16;
        var n = 5;
        for (var i = 0; i < n; i++) {
            var q = Math.abs(Math.sin(i * 2.1 + t * 5 + (i % 2) * 0.7));
            var cx2 = cx + (i - (n - 1) / 2) * r * 0.18 + Math.sin(t * 2 + i) * 2;
            var rr = r * (0.3 + q * 0.4);
            ctx.beginPath();
            ctx.moveTo(cx2 - rr * 0.7, cy + r * 0.4);
            ctx.quadraticCurveTo(cx2 - rr * 0.5, cy - rr * 0.4, cx2, cy - rr);
            ctx.quadraticCurveTo(cx2 + rr * 0.5, cy - rr * 0.4, cx2 + rr * 0.7, cy + r * 0.4);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,180,0.9)';
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    function pintarTocha(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ret(ctx, x + W * 0.44, y + H * 0.18, W * 0.12, H * 0.82, '#5d3f1e');
        ret(ctx, x + W * 0.44, y + H * 0.18, W * 0.12, H * 0.14, '#4e2f14');
        pintarFogo(ctx, x + W / 2, y + H * 0.12, W * 0.55, Date.now() / 1000, '#ff9f1c');
    }

    function pintarFogueira(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.36, 4);
        ctx.save(); ctx.translate(x + W / 2, y + H * 0.62); ctx.rotate(-0.5);
        ret(ctx, -W * 0.38, -3, W * 0.76, 6, '#6d4c41'); ctx.restore();
        ctx.save(); ctx.translate(x + W / 2, y + H * 0.62); ctx.rotate(0.5);
        ret(ctx, -W * 0.38, -3, W * 0.76, 6, '#7a5230'); ctx.restore();
        ctx.save(); ctx.translate(x + W / 2, y + H * 0.6); ctx.rotate(0.15);
        ret(ctx, -W * 0.36, -3, W * 0.72, 6, '#8d6239'); ctx.restore();
        pintarFogo(ctx, x + W / 2, y + H * 0.5, W * 0.85, Date.now() / 1000, '#ff6b35');
        circulo(ctx, x + W * 0.2, y + H * 0.75, W * 0.09, '#8d8d8d');
        circulo(ctx, x + W * 0.78, y + H * 0.78, W * 0.08, '#8d8d8d');
    }

    function pintarArbustoFlorido(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 3);
        elipse(ctx, x + W / 2, y + H * 0.5, W * 0.48, H * 0.44, '#2e7d32');
        circulo(ctx, x + W * 0.32, y + H * 0.38, W * 0.18, '#43a047');
        circulo(ctx, x + W * 0.62, y + H * 0.52, W * 0.14, '#66bb6a');
        for (var f = 0; f < 6; f++) circulo(ctx, x + W * (0.14 + f * 0.15), y + H * 0.5 + ((f * 7) % 3) * 4, 3.5, f % 2 ? '#ec407a' : '#f48fb1');
    }

    function pintarSamambaiaGigante(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        for (var i = 0; i < 5; i++) {
            var gx = x + (variar(s + i, 2)) * W * 0.85;
            ctx.strokeStyle = i % 2 ? '#558b2f' : '#689f38';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(gx, y + H);
            ctx.quadraticCurveTo(gx - W * 0.13, y + H * 0.45, gx + W * 0.1, y);
            for (var l = 1; l < 5; l++) {
                var ly = y + H * (1 - l / 6);
                ctx.moveTo(gx - W * 0.07, ly); ctx.lineTo(gx - W * 0.17, ly - 5);
                ctx.moveTo(gx + W * 0.05, ly); ctx.lineTo(gx + W * 0.15, ly - 5);
            }
            ctx.stroke();
        }
    }

    function pintarPlantaCarnivora(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        poligono(ctx, [
            { x: x + W * 0.18, y: y + H }, { x: x + W * 0.28, y: y + H * 0.72 }, { x: x + W * 0.72, y: y + H * 0.72 }, { x: x + W * 0.82, y: y + H }
        ], '#a35f2e');
        ret(ctx, x + W * 0.16, y + H * 0.9, W * 0.68, H * 0.1, '#8c4f24');
        ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + W / 2, y + H * 0.72); ctx.quadraticCurveTo(x + W / 2 + 4, y + H * 0.5, x + W / 2 + 6, y + H * 0.2); ctx.stroke();
        ctx.fillStyle = '#43a047';
        ctx.beginPath(); ctx.ellipse(x + W / 2 + 6, y + H * 0.12, W * 0.28, W * 0.2, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + W / 2 + 2, y + H * 0.07, W * 0.18, W * 0.13, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8f5e9';
        for (var d2 = -1; d2 <= 1; d2++) {
            poligono(ctx, [
                { x: x + W / 2 + 2 + d2 * W * 0.12, y: y + H * 0.05 },
                { x: x + W / 2 + 2 + d2 * W * 0.12 + 3, y: y + H * 0.02 },
                { x: x + W / 2 + 2 + d2 * W * 0.12 + 6, y: y + H * 0.05 }
            ], '#e8f5e9');
        }
        circulo(ctx, x + W / 2 + 8, y + H * 0.14, 3, '#ff6b6b');
    }

    function pintarCogumeloGigante(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.42, 4);
        ret(ctx, x + W * 0.42, y + H * 0.42, W * 0.16, H * 0.58, '#d7ccc8');
        elipse(ctx, x + W * 0.5, y + H * 0.38, W * 0.46, H * 0.3, s % 2 ? '#c62828' : '#e65100');
        elipse(ctx, x + W * 0.4, y + H * 0.16, W * 0.3, H * 0.18, s % 2 ? '#b71c1c' : '#bf360c');
        circulo(ctx, x + W * 0.38, y + H * 0.3, W * 0.07, '#fff');
        circulo(ctx, x + W * 0.56, y + H * 0.26, W * 0.05, '#fff');
        circulo(ctx, x + W * 0.3, y + H * 0.44, W * 0.05, '#fff');
        ret(ctx, x + W * 0.72, y + H * 0.78, W * 0.08, H * 0.22, '#d7ccc8');
        elipse(ctx, x + W * 0.76, y + H * 0.76, W * 0.14, H * 0.1, '#e57373');
    }

    function pintarCampoFlores(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ctx.fillStyle = 'rgba(74,160,88,0.55)';
        ctx.beginPath(); ctx.ellipse(x + W / 2, y + H / 2, W * 0.49, H * 0.49, 0, 0, Math.PI * 2); ctx.fill();
        var cores = ['#f48fb1', '#fff59d', '#ce93d8', '#80deea', '#ffab91'];
        for (var i = 0; i < 22; i++) {
            var fx = x + variar(s + i, 2) * W * 0.92 + W * 0.04;
            var fy = y + variar(s + i + 33, 2) * H * 0.92 + H * 0.04;
            circulo(ctx, fx, fy, 3, cores[i % 5]);
            circulo(ctx, fx, fy, 1.5, '#fff9c4');
        }
    }

    function pintarCaminhoPedras(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H / 2, W * 0.5, H * 0.5, 0.18);
        var n = Math.max(3, Math.round(W / 22));
        for (var i = 0; i < n; i++) {
            var px = x + (i / n) * W + (i % 2) * 4;
            var rw = (W / n) * 0.8 * (0.8 + variar(s + i, 2) * 0.4);
            ctx.fillStyle = i % 2 ? '#9e9e9e' : '#a8a8a8';
            ctx.beginPath(); ctx.ellipse(px, y + H / 2 + ((i * 17) % 3) * 4 - 4, rw / 2, H * 0.4, 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.beginPath(); ctx.ellipse(px - rw * 0.1, y + H / 2 - 3, rw * 0.22, H * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        }
    }

    function pintarTeia(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ctx.strokeStyle = 'rgba(230,240,245,0.8)';
        ctx.lineWidth = 1.2;
        var cx = x + W / 2, cy = y + H * 0.45;
        for (var a = 0; a < 8; a++) {
            var ang = (a / 8) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(ang) * W * 0.5, cy + Math.sin(ang) * W * 0.5);
            ctx.stroke();
        }
        for (var r = 1; r <= 3; r++) {
            ctx.beginPath();
            for (var b = 0; b <= 8; b++) {
                var ab = (b / 8) * Math.PI * 2;
                var rr = (r / 3) * W * 0.48;
                var pxp = cx + Math.cos(ab) * rr, pyp = cy + Math.sin(ab) * rr;
                if (b === 0) ctx.moveTo(pxp, pyp); else ctx.lineTo(pxp, pyp);
            }
            ctx.stroke();
        }
    }

    function pintarOsso(o, ctx) {
        var s = seedDe(o), d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.42, 3);
        var n = Math.max(2, Math.round(W / 20));
        for (var i = 0; i < n; i++) {
            var bx = x + (i / n) * W + (i % 2) * 5;
            var by = y + H * 0.6 - ((i * 13) % 4) * 3;
            ctx.fillStyle = '#e8e2d4';
            ctx.beginPath(); ctx.ellipse(bx, by, Math.max(6, (W / n) * 0.45), H * 0.2, 0.2, 0, Math.PI * 2); ctx.fill();
            circulo(ctx, bx - Math.max(4, (W / n) * 0.3), by, 2.6, '#d5cdbc');
            circulo(ctx, bx + Math.max(4, (W / n) * 0.3), by, 2.6, '#d5cdbc');
        }
    }

    function pintarFlorSimples(o, ctx, tipo) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ctx.strokeStyle = '#33691e'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x + W / 2, y + H); ctx.quadraticCurveTo(x + W / 2 + 1, y + H * 0.55, x + W / 2 + 2, y + H * 0.3); ctx.stroke();
        elipse(ctx, x + W * 0.32, y + H * 0.5, 5, 3, '#388e3c');
        var cor = tipo === 'flor_branca' ? '#f5f5f5' : (tipo === 'flor_laranja' ? '#fb8c00' : '#29b6f6');
        for (var i = 0; i < 6; i++) {
            var a2 = i * Math.PI / 3;
            circulo(ctx, x + W / 2 + 2 + Math.cos(a2) * W * 0.22, y + H * 0.25 + Math.sin(a2) * W * 0.22, W * 0.14, cor);
        }
        circulo(ctx, x + W / 2 + 2, y + H * 0.25, W * 0.11, 'rgba(255,235,59,0.9)');
    }

    function pintarFonte(o, ctx, t) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.46, 5);
        ret(ctx, x, y + H * 0.66, W, H * 0.34, '#8f8a75');
        ret(ctx, x, y + H * 0.7, W, 6, '#a39c87');
        var ag = ctx.createLinearGradient(x, y + H * 0.62, x, y + H * 0.7);
        ag.addColorStop(0, '#57c3e8'); ag.addColorStop(1, '#1e88e5');
        ctx.fillStyle = ag;
        ctx.beginPath(); ctx.ellipse(x + W / 2, y + H * 0.66, W * 0.46, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
        ret(ctx, x + W / 2 - W * 0.06, y + H * 0.3, W * 0.12, H * 0.4, '#9e9e9e');
        elipse(ctx, x + W / 2, y + H * 0.3, W * 0.16, H * 0.05, '#bdbdbd');
        ret(ctx, x + W / 2 - W * 0.12, y + H * 0.14, W * 0.24, 8, '#bdbdbd');
        t = t || 0;
        ctx.strokeStyle = 'rgba(190,235,255,0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + W / 2, y + H * 0.14);
        ctx.quadraticCurveTo(x + W / 2, y + H * 0.02, x + W / 2 + Math.sin(t * 2) * 6, y + H * 0.05);
        ctx.stroke();
        for (var g = 0; g < 5; g++) {
            circulo(ctx, x + W / 2 + Math.sin(t * 3 + g) * 10, y + H * 0.62 + ((t * 40 + g * 14) % 26), 2, 'rgba(190,235,255,0.8)');
        }
    }

    function pintarPoco(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.44, 4);
        ret(ctx, x + W * 0.12, y + H * 0.45, W * 0.76, H * 0.55, '#8f8a75');
        ret(ctx, x + W * 0.12, y + H * 0.45, W * 0.76, 8, '#a39c87');
        ctx.fillStyle = '#2b2b2b';
        ctx.beginPath(); ctx.ellipse(x + W / 2, y + H * 0.45, W * 0.4, H * 0.08, 0, 0, Math.PI * 2); ctx.fill();
        ret(ctx, x + W * 0.28, y + H * 0.1, 6, H * 0.42, '#5d3f1e');
        ret(ctx, x + W * 0.66, y + H * 0.1, 6, H * 0.42, '#5d3f1e');
        ret(ctx, x + W * 0.14, y + H * 0.1, W * 0.72, 6, '#7a5230');
        poligono(ctx, [{ x: x + W * 0.14, y: y + H * 0.1 }, { x: x + W / 2, y: y - 2 }, { x: x + W * 0.86, y: y + H * 0.1 }], '#6d4c41');
        ret(ctx, x + W / 2 - 4, y + H * 0.3, 8, H * 0.12, '#8d6239');
        ctx.strokeStyle = '#5d3f1e'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x + W / 2 - 4, y + H * 0.34, 7, -1.2, 1.2); ctx.stroke();
    }

    function pintarCaixa(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.42, 3);
        ret(ctx, x, y + H * 0.28, W, H * 0.72, '#a1784a');
        elipse(ctx, x + W / 2, y + H * 0.28, W * 0.5, H * 0.26, '#c08a4f');
        ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + H * 0.28, W - 2, H * 0.72);
        ret(ctx, x + W * 0.4, y + H * 0.3, W * 0.2, H * 0.7, '#8d6239');
        linha(ctx, x + W * 0.1, y + H * 0.6, x + W * 0.9, y + H * 0.6, '#7a5230', 2);
    }

    function pintarBarril(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.4, 3);
        ctx.fillStyle = '#8d6239';
        ctx.beginPath(); ctx.ellipse(x + W / 2, y + H * 0.5, W * 0.46, H * 0.46, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3e2a12'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(x + W / 2, y + H * 0.5, W * 0.46, H * 0.46, 0, 0, Math.PI * 2); ctx.stroke();
        linha(ctx, x + W * 0.06, y + H * 0.32, x + W * 0.94, y + H * 0.32, '#5d3f1e', 2);
        linha(ctx, x + W * 0.06, y + H * 0.68, x + W * 0.94, y + H * 0.68, '#5d3f1e', 2);
        elipse(ctx, x + W / 2, y + H * 0.5, W * 0.12, H * 0.06, '#a1784a');
    }

    function pintarCarroca(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.46, 4);
        poligono(ctx, [
            { x: x + W * 0.18, y: y + H * 0.5 }, { x: x + W * 0.26, y: y + H * 0.14 }, { x: x + W * 0.92, y: y + H * 0.16 }, { x: x + W * 0.96, y: y + H * 0.55 }
        ], '#8d6239');
        ret(ctx, x + W * 0.2, y + H * 0.52, W * 0.74, H * 0.1, '#a1784a');
        ctx.strokeStyle = '#5d3f1e'; ctx.lineWidth = 1.5;
        for (var i = 0; i < 3; i++) linha(ctx, x + W * (0.32 + i * 0.22), y + H * 0.17, x + W * (0.34 + i * 0.22), y + H * 0.5, '#5d3f1e', 1.5);
        var rw = W * 0.22;
        circulo(ctx, x + W * 0.42, y + H * 0.66, rw, '#5d4037');
        circulo(ctx, x + W * 0.42, y + H * 0.66, rw * 0.55, '#8d6239');
        circulo(ctx, x + W * 0.42, y + H * 0.66, rw * 0.14, '#3e2723');
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
        for (var sp = 0; sp < 4; sp++) {
            var sa = sp * Math.PI / 2;
            linha(ctx, x + W * 0.42, y + H * 0.66, x + W * 0.42 + Math.cos(sa) * rw * 0.8, y + H * 0.66 + Math.sin(sa) * rw * 0.8, '#3e2723', 2);
        }
        ret(ctx, x + W * 0.06, y + H * 0.42, W * 0.16, 5, '#5d3f1e');
    }

    function pintarPlaca(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        sombra(ctx, x + W / 2, y + H, W * 0.34, 3);
        ret(ctx, x + W * 0.44, y + H * 0.3, W * 0.12, H * 0.7, '#5d3f1e');
        ret(ctx, x + W * 0.4, y + H * 0.26, W * 0.2, 6, '#7a5230');
        ctx.fillStyle = '#8d6239';
        ctx.fillRect(x - 2, y, W + 4, H * 0.26);
        ctx.strokeStyle = '#5d3f1e'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 2, y, W + 4, H * 0.26);
        ctx.fillStyle = '#3e2723';
        ctx.font = 'bold ' + Math.max(6, W * 0.24) + 'px monospace';
        ctx.fillText('→', x + W * 0.42, y + H * 0.18);
    }

    function pintarZonaColisao(o, ctx) {
        if (!window.mapaEditorAtivo) return; // colisão é invisível fora do editor
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        if (Array.isArray(o.pontos) && o.pontos.length) {
            desenharTracoColisao(ctx, o.pontos, o.raioX || 12, o.raioY || 12, 'rgba(231,76,60,0.2)', 'rgba(231,76,60,0.9)', [6, 4]);
            return;
        }
        ctx.fillStyle = 'rgba(231,76,60,0.20)';
        ctx.fillRect(x, y, W, H);
        ctx.strokeStyle = 'rgba(231,76,60,0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y, W, H);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(10,10,10,0.7)';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('⛔ COLISÃO', x + 3, y + 11);
    }

    function desenharTracoColisao(ctx, pontos, raioX, raioY, preenchimento, contorno, tracejado) {
        if (!pontos || !pontos.length) return;
        var origemX = pontos[0].x, origemY = pontos[0].y;
        ctx.save();
        ctx.translate(origemX, origemY);
        ctx.scale(Math.max(1, raioX), Math.max(1, raioY));
        ctx.beginPath();
        if (pontos.length === 1) {
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
        } else {
            ctx.moveTo(0, 0);
            for (var i = 1; i < pontos.length; i++) ctx.lineTo(pontos[i].x - origemX, pontos[i].y - origemY);
        }
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (tracejado) ctx.setLineDash(tracejado);
        ctx.fillStyle = preenchimento;
        ctx.strokeStyle = contorno;
        ctx.globalAlpha = 1;
        if (pontos.length === 1) ctx.fill();
        else ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    function pintarZonaFrente(o, ctx) {
        var d = dims(o), x = d.x, y = d.y, W = d.W, H = d.H;
        ctx.fillStyle = 'rgba(46,204,113,0.14)';
        ctx.fillRect(x, y, W, H);
        ctx.strokeStyle = 'rgba(46,204,113,0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y, W, H);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(10,10,10,0.7)';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('🌿 FRENTE', x + 3, y + 11);
    }

    // ============================================================================
    // EFEITOS POR OBJETO (reaproveita os efeitos persistentes que já existem)
    // ============================================================================
    function desenharEfeitoObjeto(o, ctx, t) {
        var ef = o.efeito;
        if (!ef || ef === 'nenhum' || ef === 'none') return;
        if (typeof window.isEfeitoLuz === 'function' && window.isEfeitoLuz(ef)) {
            var acesa = (typeof window.isLuzMapaAtiva === 'function') ? window.isLuzMapaAtiva() : true;
            if (!acesa && !window.mapaEditorAtivo) return; // Apagada durante o dia (06h às 19h)
        }
        var cor = /^#[0-9a-fA-F]{6}$/.test(o.efeitoCor || '') ? o.efeitoCor : (EFX_CORES[ef] || '#ffd166');
        var cx = o.x + (o.w || 40) / 2;
        var cy = o.y + (o.h || 40) / 2;
        var r = Math.max(14, Math.max(o.w || 40, o.h || 40) * 0.55 * (o.escala || 1));
        var a = (t || 0);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = cor; ctx.strokeStyle = cor;
        ctx.shadowColor = cor; ctx.shadowBlur = 14;

        if (ef === 'tocha' || ef === 'fogo') {
            for (var i = 0; i < 14; i++) {
                var q = Math.abs(Math.sin(seedDe(o) * 1.3 + i * 78.233 + a * 4));
                var ang = a * 2 + i * 2.1;
                ctx.beginPath();
                ctx.arc(Math.cos(ang) * r * (0.2 + q * 0.4), -r * 0.4 + q * 2 + Math.sin(a * 5 + i) * 2 + i / 3, 2 + q * 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = 'rgba(255,0,0,0.25)';
            ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.5 + Math.sin(a * 3) * 4, 0, Math.PI * 2); ctx.fill();
        } else if (ef === 'lampada' || ef === 'holofote') {
            ctx.globalAlpha = 0.16;
            ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.arc(0, 0, 4 + Math.sin(a * 2) * 1.5, 0, Math.PI * 2); ctx.fill();
        } else if (ef === 'vaga_lumes') {
            for (var m = 0; m < 8; m++) {
                var tw = 0.4 + 0.6 * Math.abs(Math.sin(a * 1.6 + m + seedDe(o)));
                ctx.beginPath();
                ctx.arc(Math.cos(a * 0.4 + m * 1.7) * r * 0.8, Math.sin(a * 0.5 + m * 2.3) * r * 0.6, 1 + tw * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (ef === 'agua_corrente' || ef === 'bolhas') {
            ctx.lineWidth = 2;
            for (var b = 0; b < 7; b++) {
                var bx = (b - 3) * r * 0.28 + Math.sin(a + b) * 5;
                ctx.beginPath(); ctx.arc(bx, -r * 0.6 + ((a * 60 + b * 30) % (r * 1.1)), 2 + b % 3, 0, Math.PI * 2); ctx.fill();
            }
        } else if (ef === 'cristais' || ef === 'runas') {
            ctx.lineWidth = 2;
            ctx.rotate(a * 0.3);
            for (var n = 0; n < 5; n++) {
                var an = n * Math.PI * 2 / 5 + a * 0.4;
                ctx.beginPath();
                ctx.moveTo(Math.cos(an) * r * 0.25, Math.sin(an) * r * 0.25);
                ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
                ctx.stroke();
            }
        } else if (ef === 'espinhos') {
            ctx.lineWidth = 3;
            for (var h = 0; h < 5; h++) {
                ctx.beginPath();
                ctx.moveTo(h * r * 0.4 - r, 0);
                ctx.lineTo(h * r * 0.4 - r + 10, -16 - h % 2 * 6);
                ctx.stroke();
            }
        } else if (ef === 'folhas' || ef === 'petalas' || ef === 'grama' || ef === 'borboletas') {
            for (var f = 0; f < 12; f++) {
                var q2 = Math.abs(Math.sin(seedDe(o) * 1.7 + f * 33.3 + a * 2.2));
                ctx.beginPath();
                ctx.arc(Math.cos(a * 1.1 + f * 2.5) * r * (0.3 + q2 * 0.5), Math.sin(a * 0.9 + f) * r * 0.3 + Math.sin(a * 2 + f) * 6, 1.5 + q2 * 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (ef === 'neve') {
            ctx.fillStyle = '#ffffff';
            for (var sn = 0; sn < 10; sn++) {
                var snx = ((sn * 47) % 100) / 100;
                var sx = snx * r * 2 - r;
                var sy = ((a * 50 + sn * 23) % (r * 2)) - r * 0.4;
                ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(a + sn));
                ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    // ============================================================================
    // PINTURA DO OBJETO (usa window.ctx; efeito anexado)
    // ============================================================================
    function animarSpritePersonalizado(o, ctx, imagem, medidas, t) {
        var animacao = ANIMACOES_SPRITE_VALIDAS.indexOf(o.animacao) !== -1 ? o.animacao : 'nenhuma';
        var tempo = Number(t) || 0;
        var semente = seedDe(o) * 0.173;
        var fase = tempo * 2.4 + semente;
        var amp = Math.max(1, Math.min(medidas.W, medidas.H) * 0.055);
        var rotacao = 0, sx = 1, sy = 1, deslocamentoX = 0, deslocamentoY = 0, shear = 0;
        switch (animacao) {
            case 'brisa_suave': rotacao = Math.sin(fase * 0.55) * 0.035; shear = Math.sin(fase * 0.55) * 0.035; break;
            case 'vento_constante': rotacao = 0.055 + Math.sin(fase * 0.7) * 0.025; shear = 0.08 + Math.sin(fase * 0.7) * 0.045; break;
            case 'rajada_vento': {
                var rajada = Math.sin(tempo * 0.75 + semente) > 0.72 ? 1 : 0.28;
                rotacao = Math.sin(fase * 0.65) * 0.09 * rajada; shear = Math.sin(fase * 0.65) * 0.14 * rajada;
                break;
            }
            case 'copa_ondulante': shear = Math.sin(fase * 0.7) * 0.11; deslocamentoX = Math.sin(fase * 0.7) * amp * 0.2; break;
            case 'folhas_tremulas': shear = Math.sin(fase * 2.1) * 0.055 + Math.sin(fase * 3.4) * 0.025; break;
            case 'arvore_tempestade': rotacao = Math.sin(fase * 0.55) * 0.14; shear = Math.sin(fase * 0.55) * 0.22; break;
            case 'respirar': sx = 1 + Math.sin(fase * 0.5) * 0.035; sy = 1 + Math.sin(fase * 0.5 - 0.6) * 0.045; break;
            case 'pulsar': sx = sy = 1 + Math.sin(fase) * 0.055; break;
            case 'batimento': {
                var batida = Math.pow(Math.max(0, Math.sin(fase * 0.5)), 12);
                sx = 1 + batida * 0.07; sy = 1 - batida * 0.035;
                break;
            }
            case 'esticar': sy = 1 + Math.sin(fase * 0.65) * 0.12; sx = 1 - Math.sin(fase * 0.65) * 0.045; break;
            case 'compressao': sx = 1 + Math.sin(fase) * 0.075; sy = 1 - Math.sin(fase) * 0.075; break;
            case 'crescer': sx = sy = 0.94 + (0.5 + 0.5 * Math.sin(fase * 0.35)) * 0.12; break;
            case 'flutuar': deslocamentoY = Math.sin(fase) * amp * 0.22; rotacao = Math.sin(fase * 0.5) * 0.018; break;
            case 'levitar_lento': deslocamentoY = Math.sin(fase * 0.35) * amp * 0.35; deslocamentoX = Math.sin(fase * 0.24) * amp * 0.12; break;
            case 'saltitar': deslocamentoY = -Math.max(0, Math.sin(fase * 0.7)) * amp * 0.42; sx = 1 + Math.sin(fase * 0.7) * 0.025; break;
            case 'balanco_vertical': deslocamentoY = Math.sin(fase * 0.7) * amp * 0.1; break;
            case 'balanco_horizontal': deslocamentoX = Math.sin(fase * 0.7) * amp * 0.14; break;
            case 'inclinar': rotacao = Math.sin(fase * 0.65) * 0.1; break;
            case 'balanco_profundo': rotacao = Math.sin(fase * 0.55) * 0.17; deslocamentoX = Math.sin(fase * 0.55) * amp * 0.1; break;
            case 'tronco_flexivel': shear = Math.sin(fase * 0.8) * 0.15; rotacao = Math.sin(fase * 0.8) * 0.045; break;
            case 'ondular': shear = Math.sin(fase + semente) * 0.075; deslocamentoY = Math.sin(fase * 1.2) * amp * 0.08; break;
            case 'tremular': rotacao = Math.sin(fase * 2.5) * 0.035; deslocamentoX = Math.sin(fase * 3) * amp * 0.045; break;
            case 'sacudir': {
                var sacudida = Math.sin(tempo * 0.7 + semente) > 0.88 ? 1 : 0;
                deslocamentoX = Math.sin(fase * 9) * amp * 0.12 * sacudida; rotacao = Math.sin(fase * 8) * 0.05 * sacudida;
                break;
            }
            case 'tremor': deslocamentoX = Math.sin(fase * 11) * amp * 0.035; deslocamentoY = Math.cos(fase * 13) * amp * 0.025; break;
            case 'giro_horario': rotacao = (tempo * 0.42 + semente) % (Math.PI * 2); break;
            case 'giro_lento': rotacao = Math.sin(fase * 0.16) * 0.35; break;
            case 'oscilacao': rotacao = Math.sin(fase) * 0.06; deslocamentoY = Math.sin(fase * 2) * amp * 0.12; break;
            case 'deriva_vento': deslocamentoX = Math.sin(fase * 0.28) * amp * 0.42; deslocamentoY = Math.sin(fase * 0.38) * amp * 0.15; rotacao = Math.sin(fase * 0.28) * 0.035; break;
            case 'vibracao_folhas': shear = Math.sin(fase * 3.2) * 0.085 + Math.sin(fase * 4.7) * 0.035; break;
            case 'squash_stretch': {
                var squash = Math.sin(fase * 0.8);
                sx = 1 + squash * 0.085; sy = 1 - squash * 0.085;
                deslocamentoY = Math.max(0, squash) * amp * 0.1;
                break;
            }
        }

        var area = o.animacaoArea;
        var recorte = obterAssetRect(o, imagem);
        if (area && Number.isFinite(area.x) && Number.isFinite(area.y) && Number.isFinite(area.w) && Number.isFinite(area.h) &&
            area.x >= 0 && area.y >= 0 && area.w > 0 && area.h > 0 && area.x + area.w <= 1 && area.y + area.h <= 1 &&
            (area.x > 0 || area.y > 0 || area.w < 1 || area.h < 1)) {
            var ax = medidas.x + medidas.W * area.x, ay = medidas.y + medidas.H * area.y;
            var aw = medidas.W * area.w, ah = medidas.H * area.h;
            ctx.save();
            ctx.beginPath();
            ctx.rect(medidas.x, medidas.y, medidas.W, medidas.H);
            ctx.rect(ax, ay, aw, ah);
            ctx.clip('evenodd');
            ctx.drawImage(imagem, recorte.x, recorte.y, recorte.w, recorte.h, medidas.x, medidas.y, medidas.W, medidas.H);
            ctx.restore();

            ctx.save();
            ctx.translate(ax + aw / 2 + deslocamentoX, ay + ah / 2 + deslocamentoY);
            ctx.rotate(rotacao);
            ctx.transform(1, 0, shear, 1, 0, 0);
            ctx.scale(sx, sy);
            ctx.drawImage(imagem, recorte.x + area.x * recorte.w, recorte.y + area.y * recorte.h,
                area.w * recorte.w, area.h * recorte.h, -aw / 2, -ah / 2, aw, ah);
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.translate(medidas.x + medidas.W / 2 + deslocamentoX, medidas.y + medidas.H + deslocamentoY);
        ctx.rotate(rotacao);
        ctx.transform(1, 0, shear, 1, 0, 0);
        ctx.scale(sx, sy);
        ctx.drawImage(imagem, recorte.x, recorte.y, recorte.w, recorte.h, -medidas.W / 2, -medidas.H, medidas.W, medidas.H);
        ctx.restore();
    }

    function pintarObjeto(o, ctx, t, alpha, parteSprite) {
        if (!o) return;
        if (o.tipo === 'sprite_personalizado') {
            var imagemSprite = obterImagemSpriteMapa(o.asset);
            if (imagemSprite && imagemSprite.complete && imagemSprite.naturalWidth > 0) {
                var medidasSprite = dims(o);
                var sourceImage = imagemSprite;
                var sourceRegion = obterAssetRect(o, sourceImage);
                if (mascaraAutomaticaAusente(o, sourceRegion)) return;
                var imagemComMascara = obterSpriteComMascara(o, sourceImage);
                var objetoDesenho = o;
                if (imagemComMascara) {
                    imagemSprite = imagemComMascara;
                    objetoDesenho = Object.assign({}, o, { assetRect: null, assetMask: null, assetMaskRaster: null });
                }
                lassoDiagnostico('FINAL_RENDER', o, sourceImage, imagemSprite, {
                    rendererTexture: imagemComMascara ? 'masked-canvas' : o.asset,
                    drawSourceRegion: imagemComMascara ? null : sourceRegion,
                    originalSpritesheet: imagemComMascara ? o.asset : null,
                    finalTextureSize: { width: imagemSprite.width, height: imagemSprite.height }
                });
                ctx.save();
                if (alpha != null) ctx.globalAlpha = alpha;
                var rotacaoObjeto = (Number(o.rotacao) || 0) * Math.PI / 180;
                if (rotacaoObjeto) {
                    ctx.translate(medidasSprite.x + medidasSprite.W / 2, medidasSprite.y + medidasSprite.H / 2);
                    ctx.rotate(rotacaoObjeto);
                    medidasSprite.x = -medidasSprite.W / 2;
                    medidasSprite.y = -medidasSprite.H / 2;
                }
                if (parteSprite && divisaoSpriteValida(o)) {
                    var linhaDivisao = medidasSprite.y + medidasSprite.H * o.assetDepthSplit;
                    var topoRecorte = parteSprite === 'superior' ? medidasSprite.y - medidasSprite.H : linhaDivisao;
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(medidasSprite.x - medidasSprite.W, topoRecorte, medidasSprite.W * 3, medidasSprite.H * 2);
                    ctx.clip();
                    animarSpritePersonalizado(objetoDesenho, ctx, imagemSprite, medidasSprite, t);
                    ctx.restore();
                } else {
                    animarSpritePersonalizado(objetoDesenho, ctx, imagemSprite, medidasSprite, t);
                }
                ctx.restore();
            }
            return;
        }
        var def = CATALOGO[o.tipo];
        if (!def) def = CATALOGO.arvore;
        ctx.save();
        if (alpha != null) ctx.globalAlpha = alpha;
        def.pintar(o, ctx, t || 0);
        desenharEfeitoObjeto(o, ctx, t || 0);
        ctx.restore();
    }

    // ============================================================================
    // COLISÃO DO CLIENTE (objetos com colisão bloqueiam o jogador)
    // ============================================================================
    function pontoNaColisaoPincel(objeto, x, y, raioJogador) {
        var pontos = objeto.pontos;
        var raioX = Math.max(1, Number(objeto.raioX) || 12);
        var raioY = Math.max(1, Number(objeto.raioY) || 12);
        var expandir = Math.max(0, raioJogador || 0) / Math.min(raioX, raioY);
        var px = x / raioX, py = y / raioY;
        if (px < (objeto.x - raioJogador) / raioX || px > (objeto.x + objeto.w + raioJogador) / raioX ||
            py < (objeto.y - raioJogador) / raioY || py > (objeto.y + objeto.h + raioJogador) / raioY) return false;
        if (pontos.length === 1) return Math.hypot(px - pontos[0].x / raioX, py - pontos[0].y / raioY) <= 1 + expandir;
        for (var i = 1; i < pontos.length; i++) {
            var x1 = pontos[i - 1].x / raioX, y1 = pontos[i - 1].y / raioY;
            var x2 = pontos[i].x / raioX, y2 = pontos[i].y / raioY;
            var dx = x2 - x1, dy = y2 - y1;
            var comprimento2 = dx * dx + dy * dy;
            var t = comprimento2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / comprimento2)) : 0;
            if (Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)) <= 1 + expandir) return true;
        }
        return false;
    }

    function pontoNaMascaraColisao(objeto, x, y, raioJogador) {
        var mask = objeto.assetCollisionMask;
        var medidas = dims(objeto);
        var radians = -(Number(objeto.rotacao) || 0) * Math.PI / 180;
        var dx = x - (medidas.x + medidas.W / 2), dy = y - (medidas.y + medidas.H / 2);
        var localX = dx * Math.cos(radians) - dy * Math.sin(radians);
        var localY = dx * Math.sin(radians) + dy * Math.cos(radians);
        var localPixelX = localX + medidas.W / 2, localPixelY = localY + medidas.H / 2;
        var radius = Math.max(0, Number(raioJogador) || 0);
        if (localPixelX < -radius || localPixelX > medidas.W + radius ||
            localPixelY < -radius || localPixelY > medidas.H + radius) return false;
        if (mascaraPoligonoContem(mask, localPixelX / medidas.W, localPixelY / medidas.H)) return true;
        if (!radius) return false;
        for (var i = 0; i < mask.length; i++) {
            var a = mask[i], b = mask[(i + 1) % mask.length];
            var ax = a.x * medidas.W, ay = a.y * medidas.H;
            var bx = b.x * medidas.W, by = b.y * medidas.H;
            var segX = bx - ax, segY = by - ay;
            var length2 = segX * segX + segY * segY;
            var t = length2 ? Math.max(0, Math.min(1, ((localPixelX - ax) * segX + (localPixelY - ay) * segY) / length2)) : 0;
            if (Math.hypot(localPixelX - (ax + t * segX), localPixelY - (ay + t * segY)) <= radius) return true;
        }
        return false;
    }

    function colideObjetosDoMapa(x, y, raio) {
        var mapa = global.currentMap || 'green';
        var r = (typeof raio === 'number') ? raio : 8;
        var lista = window.mapaObjetos;
        if (!lista || !lista.length) return false;
        for (var i = 0; i < lista.length; i++) {
            var o = lista[i];
            if (!o || o.mapa !== mapa || !o.colisao) continue;
            if (o.tipo === 'zona_colisao' && Array.isArray(o.pontos) && o.pontos.length) {
                if (pontoNaColisaoPincel(o, x, y, r)) return true;
                continue;
            }
            if (o.tipo === 'sprite_personalizado' && mascaraPoligonoValida(o.assetCollisionMask)) {
                if (pontoNaMascaraColisao(o, x, y, r)) return true;
                continue;
            }
            var medidas = dims(o);
            var radians = -(Number(o.rotacao) || 0) * Math.PI / 180;
            var deltaX = x - (medidas.x + medidas.W / 2), deltaY = y - (medidas.y + medidas.H / 2);
            var dx = Math.abs(deltaX * Math.cos(radians) - deltaY * Math.sin(radians));
            var dy = Math.abs(deltaX * Math.sin(radians) + deltaY * Math.cos(radians));
            var w = medidas.W, h = medidas.H;
            if (dx >= w / 2 + r || dy >= h / 2 + r) continue;
            var ox = dx - w / 2, oy = dy - h / 2;
            if (ox <= 0 || oy <= 0) return true;
            if (ox * ox + oy * oy <= r * r) return true;
        }
        return false;
    }

    (function wrapColidir() {
        var baseColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (baseColide) {
                try { if (baseColide(x, y, raio)) return true; } catch (e) {}
            }
            return colideObjetosDoMapa(x, y, (typeof raio === 'number') ? raio : 8);
        };
    })();

    // ============================================================================
    // ÁGUA: objetos de água deixam o jogador mais lento (feito que já existe)
    // ============================================================================
    if (typeof global.estaNaAgua !== 'function') {
        global.estaNaAgua = function (x, y) {
            var mapa = global.currentMap || 'green';
            var lista = window.mapaObjetos;
            if (!lista || !lista.length) return false;
            var px = x + 12, py = y + 16;
            for (var i = 0; i < lista.length; i++) {
                var o = lista[i];
                if (!o || o.mapa !== mapa) continue;
                var def = CATALOGO[o.tipo];
                if (def && def.agua) {
                    var w = o.w || 40, h = o.h || 40;
                    if (px >= o.x && px <= o.x + w && py >= o.y && py <= o.y + h) return true;
                }
            }
            return false;
        };
    }
    ['agua_quadrado', 'lagoa', 'canal', 'lago_grande', 'riacho'].forEach(function (tp) { CATALOGO[tp].agua = true; });

    // ============================================================================
    // RENDERIZAÇÃO: objetos entram no y-sort + camada frente depois dos jogadores
    // ============================================================================
    function visivel(o, camX, camY, cw, ch) {
        if (!o) return false;
        var medidas = dims(o);
        var raioBounds = Math.hypot(medidas.W, medidas.H) / 2;
        var centroX = medidas.x + medidas.W / 2, centroY = medidas.y + medidas.H / 2;
        return centroX + raioBounds >= camX - 80 && centroX - raioBounds <= camX + cw + 80 &&
            centroY + raioBounds >= camY - 80 && centroY - raioBounds <= camY + ch + 80;
    }

    window.coletarObjetosMapa = function (t, arr) {
        var mapa = global.currentMap || 'green';
        var lista = window.mapaObjetos;
        if (!lista || !lista.length) return;
        var camX = global.camX || 0, camY = global.camY || 0;
        var zoom = (typeof global.cameraZoomAtual === 'number' && global.cameraZoomAtual > 0) ? global.cameraZoomAtual : (global.ZOOM_CAMERA || 0.92);
        var cw = ((global.canvas && global.canvas.width) || 800) / zoom;
        var ch = ((global.canvas && global.canvas.height) || 600) / zoom;
        for (var i = 0; i < lista.length; i++) {
            var o = lista[i];
            if (!o || o.mapa !== mapa) continue;
            if (camadaEditorFicaNaFrente(o.camada) && !divisaoSpriteValida(o)) continue; // sprites divididas entram no Y-sort
            if (!visivel(o, camX, camY, cw, ch)) continue;
            (function (obj) {
                var orderTieBreak = Math.max(0, Math.min(1000000, Number(obj.ordem) || 0)) * 0.000001;
                var layer = normalizarCamadaEditor(obj.camada);
                if (divisaoSpriteValida(obj)) {
                    var splitDepth = obj.y + dims(obj).H * obj.assetDepthSplit + orderTieBreak;
                    var baseDepth = obj.y + dims(obj).H + orderTieBreak;
                    arr.push({
                        y: splitDepth,
                        draw: function () { pintarObjeto(obj, global.ctx, t || 0, null, 'superior'); }
                    });
                    arr.push({
                        y: baseDepth,
                        draw: function () { pintarObjeto(obj, global.ctx, t || 0, null, 'inferior'); }
                    });
                    return;
                }
                var depth = layer === 'ground' ? -1000000000 + orderTieBreak :
                    (layer === 'decoration_behind' ? -500000000 + orderTieBreak :
                        obj.y + dims(obj).H * (Number.isFinite(obj.ySortAnchor) &&
                            obj.ySortAnchor >= 0 && obj.ySortAnchor <= 1 ? obj.ySortAnchor : 1) + orderTieBreak);
                arr.push({ y: depth, draw: function () { pintarObjeto(obj, global.ctx, t || 0); } });
            })(o);
        }
    };

    window.meSetSelAnimacao = function (animacao) {
        if (!meSel || meSel.tipo !== 'sprite_personalizado') return;
        meSel.animacao = ANIMACOES_SPRITE_VALIDAS.indexOf(animacao) !== -1 ? animacao : 'nenhuma';
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
    };

    function meDesenharAreaAnimacao() {
        var canvas = document.getElementById('me-area-animacao-preview');
        if (!canvas || !meSel || meSel.tipo !== 'sprite_personalizado') return;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#101710';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var imagem = obterImagemSpriteMapa(meSel.asset);
        if (!imagem || !imagem.complete || !imagem.naturalWidth || !imagem.naturalHeight) {
            if (imagem) imagem.addEventListener('load', meDesenharAreaAnimacao, { once: true });
            return;
        }
        var recorte = obterAssetRect(meSel, imagem);
        var escala = Math.min(canvas.width / recorte.w, canvas.height / recorte.h);
        var largura = recorte.w * escala, altura = recorte.h * escala;
        var x = (canvas.width - largura) / 2, y = (canvas.height - altura) / 2;
        meAreaAnimacaoLayout = { x: x, y: y, w: largura, h: altura };
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imagem, recorte.x, recorte.y, recorte.w, recorte.h, x, y, largura, altura);
        var area = meAreaAnimacaoDrag && meAreaAnimacaoDrag.preview ? meAreaAnimacaoDrag.preview : meSel.animacaoArea || { x: 0, y: 0, w: 1, h: 1 };
        var rx = x + largura * area.x, ry = y + altura * area.y;
        var rw = largura * area.w, rh = altura * area.h;
        ctx.fillStyle = 'rgba(83, 220, 155, 0.2)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = '#5bffb2';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.setLineDash([]);
        ctx.fillStyle = '#e8fff3';
        ctx.font = '11px sans-serif';
        ctx.fillText(meSel.animacaoArea ? 'Somente a área destacada será animada' : 'Sprite inteiro · arraste para limitar a área', 6, 14);
    }

    function meAreaAnimacaoCoordenada(e) {
        var canvas = document.getElementById('me-area-animacao-preview');
        var layout = meAreaAnimacaoLayout;
        if (!canvas || !layout) return null;
        var rect = canvas.getBoundingClientRect();
        var px = (e.clientX - rect.left) * canvas.width / rect.width;
        var py = (e.clientY - rect.top) * canvas.height / rect.height;
        if (px < layout.x || py < layout.y || px > layout.x + layout.w || py > layout.y + layout.h) return null;
        return { x: (px - layout.x) / layout.w, y: (py - layout.y) / layout.h };
    }

    window.meAreaAnimacaoPointerDown = function (e) {
        if (!meSel || meSel.tipo !== 'sprite_personalizado') return;
        var ponto = meAreaAnimacaoCoordenada(e);
        if (!ponto) return;
        meAreaAnimacaoDrag = { pointerId: e.pointerId, start: ponto, preview: { x: ponto.x, y: ponto.y, w: 0, h: 0 } };
        e.currentTarget.setPointerCapture(e.pointerId);
        meDesenharAreaAnimacao();
        e.preventDefault();
    };

    window.meAreaAnimacaoPointerMove = function (e) {
        if (!meAreaAnimacaoDrag || meAreaAnimacaoDrag.pointerId !== e.pointerId) return;
        var ponto = meAreaAnimacaoCoordenada(e);
        if (!ponto) return;
        var inicio = meAreaAnimacaoDrag.start;
        meAreaAnimacaoDrag.preview = {
            x: Math.min(inicio.x, ponto.x), y: Math.min(inicio.y, ponto.y),
            w: Math.abs(ponto.x - inicio.x), h: Math.abs(ponto.y - inicio.y)
        };
        meDesenharAreaAnimacao();
        e.preventDefault();
    };

    window.meAreaAnimacaoPointerUp = function (e) {
        if (!meAreaAnimacaoDrag || meAreaAnimacaoDrag.pointerId !== e.pointerId) return;
        var area = meAreaAnimacaoDrag.preview;
        meAreaAnimacaoDrag = null;
        if (area.w >= 0.01 && area.h >= 0.01 && meSel && meSel.tipo === 'sprite_personalizado') {
            meSel.animacaoArea = area;
            enviar(meSel, 'editar');
        }
        meAtualizarPropsUI();
        meDesenharAreaAnimacao();
    };

    window.meLimparAreaAnimacao = function () {
        if (!meSel || meSel.tipo !== 'sprite_personalizado') return;
        delete meSel.animacaoArea;
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
        meDesenharAreaAnimacao();
    };

    window.desenharObjetosFrente = function () {
        var mapa = global.currentMap || 'green';
        var lista = window.mapaObjetos;
        if (!lista || !lista.length) return;
        var camX = global.camX || 0, camY = global.camY || 0;
        var zoom = (typeof global.cameraZoomAtual === 'number' && global.cameraZoomAtual > 0) ? global.cameraZoomAtual : (global.ZOOM_CAMERA || 0.92);
        var cw = ((global.canvas && global.canvas.width) || 800) / zoom;
        var ch = ((global.canvas && global.canvas.height) || 600) / zoom;
        var t = Date.now() / 1000;
        var objetosFrente = [];
        for (var i = 0; i < lista.length; i++) {
            var o = lista[i];
            if (!o || o.mapa !== mapa || !camadaEditorFicaNaFrente(o.camada)) continue;
            if (!visivel(o, camX, camY, cw, ch)) continue;
            objetosFrente.push(o);
        }
        objetosFrente.sort(function (a, b) {
            var ordem = (Number(a.ordem) || 0) - (Number(b.ordem) || 0);
            return ordem || (a.y + dims(a).H) - (b.y + dims(b).H);
        });
        objetosFrente.forEach(function (objeto) {
            if (!divisaoSpriteValida(objeto)) pintarObjeto(objeto, global.ctx, t);
        });
    };

    // ============================================================================
    // SINCRONIZAÇÃO — recebe a lista do servidor
    // ============================================================================
    window.receberMapaObjetos = function (lista) {
        window.mapaObjetos = lista || [];
        mapaObjetoIdsConfirmados = new Set(window.mapaObjetos.filter(function (objeto) {
            return objeto && typeof objeto.id === 'string';
        }).map(function (objeto) { return objeto.id; }));
        if (lassoDiagEnabled) {
            window.mapaObjetos.forEach(function (objeto) {
                if (objeto && objeto.assetMaskMode === 'auto') {
                    var imagem = obterImagemSpriteMapa(objeto.asset);
                    lassoDiagnostico('LOAD_CLIENT', objeto, imagem, null, {
                        receivedAssetRect: objeto.assetRect,
                        rasterMaskPresent: !!objeto.assetMaskRaster
                    });
                }
            });
        }
        // mantém a seleção pelo id (o broadcast substitui a lista)
        if (meSelId) {
            var achado = null;
            for (var i = 0; i < window.mapaObjetos.length; i++) if (window.mapaObjetos[i].id === meSelId) { achado = window.mapaObjetos[i]; break; }
            if (!achado) meSelId = null;
            else meSel = achado;
        }
        meAtualizarListas();
        meAtualizarPropsUI();
    };

    function enviar(objeto, sub) {
        var o = objeto;
        var msg = {
            action: 'admin_map_objetos',
            sub: sub || 'criar',
            objeto: {
                id: o.id, tipo: o.tipo, asset: o.asset || '', x: o.x, y: o.y, w: o.w, h: o.h,
                assetRect: o.assetRect ? {
                    x: o.assetRect.x, y: o.assetRect.y, w: o.assetRect.w, h: o.assetRect.h
                } : undefined,
                assetMask: assetMaskValida(o.assetMask) ? o.assetMask.map(function (point) { return { x: point.x, y: point.y }; }) : undefined,
                assetMaskRaster: o.assetMaskRaster || undefined,
                assetMaskMode: o.assetMaskMode === 'auto' || o.assetMaskMode === 'manual' ? o.assetMaskMode : '',
                assetCollisionMask: mascaraPoligonoValida(o.assetCollisionMask)
                    ? o.assetCollisionMask.map(function (point) { return { x: point.x, y: point.y }; })
                    : undefined,
                ySortAnchor: Number.isFinite(o.ySortAnchor) ? o.ySortAnchor : undefined,
                assetDepthSplit: divisaoSpriteValida(o) ? o.assetDepthSplit : undefined,
                spriteId: o.spriteId || '',
                categoria: o.categoria || 'Geral',
                escala: o.escala != null ? o.escala : 1,
                escalaX: o.escalaX != null ? o.escalaX : 1,
                escalaY: o.escalaY != null ? o.escalaY : 1,
                rotacao: o.rotacao || 0,
                ordem: o.ordem || 0,
                variante: o.variante || 0,
                animacao: ANIMACOES_SPRITE_VALIDAS.indexOf(o.animacao) !== -1 ? o.animacao : 'nenhuma',
                animacaoArea: o.animacaoArea ? {
                    x: o.animacaoArea.x, y: o.animacaoArea.y, w: o.animacaoArea.w, h: o.animacaoArea.h
                } : undefined,
                colisao: !!o.colisao,
                pontos: Array.isArray(o.pontos) ? o.pontos : undefined,
                raioX: o.raioX,
                raioY: o.raioY,
                camada: o.camada || 'meio',
                efeito: o.efeito || '',
                efeitoCor: o.efeitoCor || ''
            }
        };
        var sourceImage = o.asset ? obterImagemSpriteMapa(o.asset) : null;
        lassoDiagnostico('SERIALIZATION', o, sourceImage, null, {
            action: msg.action,
            sub: msg.sub,
            payloadAsset: msg.objeto.asset,
            payloadRect: msg.objeto.assetRect,
            payloadMaskPresent: !!msg.objeto.assetMaskRaster,
            payloadMask: lassoRasterResumo(msg.objeto.assetMaskRaster),
            mapBounds: { x: msg.objeto.x, y: msg.objeto.y, w: msg.objeto.w, h: msg.objeto.h }
        });
        if (global.ws && global.ws.readyState === 1) {
            global.ws.send(JSON.stringify(msg));
            return true;
        }
        return false;
    }

    function enviarNovoObjeto(objeto) {
        if (enviar(objeto, 'criar')) return;
        var agora = Date.now();
        if (agora - meUltimoAvisoFalhaAutoSave < 2500) return;
        meUltimoAvisoFalhaAutoSave = agora;
        meToast('Objeto colocado apenas localmente: servidor desconectado. Salve após reconectar.');
    }

    // ============================================================================
    // AJUDA DE NAVEGAÇÃO
    // ============================================================================
    function obterListaAtual() {
        var mapa = global.currentMap || 'green';
        return (window.mapaObjetos || []).filter(function (o) { return o && o.mapa === mapa; });
    }

    function pontoEmObjeto(o, wx, wy) {
        var medidas = dims(o);
        var radians = -(Number(o.rotacao) || 0) * Math.PI / 180;
        var dx = wx - (medidas.x + medidas.W / 2), dy = wy - (medidas.y + medidas.H / 2);
        var localX = dx * Math.cos(radians) - dy * Math.sin(radians);
        var localY = dx * Math.sin(radians) + dy * Math.cos(radians);
        return Math.abs(localX) <= medidas.W / 2 && Math.abs(localY) <= medidas.H / 2;
    }

    function acharObjetoEm(wx, wy) {
        var lista = obterListaAtual();
        // 1) hit exato: caixa do objeto expandida pela escala (o desenho pode ser maior que o hitbox)
        for (var i = lista.length - 1; i >= 0; i--) {
            var o0 = lista[i];
            if (o0.tipo === 'zona_colisao' && Array.isArray(o0.pontos) && o0.pontos.length) {
                if (pontoNaColisaoPincel(o0, wx, wy, 0)) return o0;
                continue;
            }
            var medidas = dims(o0);
            var ew = medidas.W;
            var eh = medidas.H;
            var extW = Math.max(ew, (o0.w || 40) + 12);
            var extH = Math.max(eh, (o0.h || 40) + 12);
            if (pontoEmObjeto(o0, wx, wy) ||
                (wx >= o0.x && wx <= o0.x + extW && wy >= o0.y && wy <= o0.y + extH)) return o0;
        }
        // 2) mais próximo pelo centro (até 60px) — garante que "clicou na árvore" sempre apaga
        var melhor = null, melhorD = 60;
        for (var j = 0; j < lista.length; j++) {
            var o = lista[j];
            var d = Math.hypot(wx - (o.x + (o.w || 40) / 2), wy - (o.y + (o.h || 40) / 2));
            if (d < melhorD) { melhorD = d; melhor = o; }
        }
        return melhor;
    }

    // ============================================================================
    // INPUT — escuta no canvas (fase de captura: roda antes do jogo)
    // ============================================================================
    function telaParaMundo(cx, cy) {
        var cv = global.canvas;
        if (!cv) return { wx: 0, wy: 0 };
        var rect = cv.getBoundingClientRect();
        if (!rect.width || !rect.height) return { wx: 0, wy: 0 };
        var zoom = (typeof global.cameraZoomAtual === 'number' && global.cameraZoomAtual > 0) ? global.cameraZoomAtual : (global.ZOOM_CAMERA || 0.92);
        var camX = global.camX || 0, camY = global.camY || 0;
        var canvasX = Math.max(0, Math.min(cv.width, (cx - rect.left) * cv.width / rect.width));
        var canvasY = Math.max(0, Math.min(cv.height, (cy - rect.top) * cv.height / rect.height));
        var wx = canvasX / zoom + camX;
        var wy = canvasY / zoom + camY;
        var cfg = (global.MAPAS_REGISTRY || {})[global.currentMap || 'mundo'];
        var minX = cfg ? cfg.x0 : 0, minY = cfg ? cfg.y0 : 0;
        var maxX = cfg ? cfg.x0 + cfg.w : (global.WORLD_WIDTH || 65040);
        var maxY = cfg ? cfg.y0 + cfg.h : (global.WORLD_HEIGHT || 36000);
        return {
            wx: Math.max(minX, Math.min(maxX - 1, wx)),
            wy: Math.max(minY, Math.min(maxY - 1, wy))
        };
    }

    function limitesMapaEditor() {
        var cfg = (global.MAPAS_REGISTRY || {})[global.currentMap || 'mundo'];
        if (cfg) return cfg;
        return { x0: 0, y0: 0, w: global.WORLD_WIDTH || 65040, h: global.WORLD_HEIGHT || 36000 };
    }

    function editorAberto() {
        return window.mapaEditorAtivo && !window.mapaEditorMinimizado;
    }

    function editorCampoCapturaDelete(active) {
        if (!active) return false;
        if (active.tagName === 'TEXTAREA' || active.isContentEditable) return true;
        if (active.tagName !== 'INPUT') return false;
        return ['text', 'number', 'search', 'email', 'password', 'tel', 'url'].indexOf(String(active.type || 'text').toLowerCase()) !== -1;
    }

    function focarCanvasEditor() {
        if (!global.canvas || typeof global.canvas.focus !== 'function') return;
        if (global.canvas.tabIndex < 0) global.canvas.tabIndex = -1;
        global.canvas.focus();
    }

    function snapCoord(v) {
        return meSnap ? Math.round(v / 20) * 20 : Math.round(v);
    }

    function ferramentaColoca() {
        return meFerramenta === 'colocar' || meFerramenta === 'colocar_colisao' || meFerramenta === 'colocar_frente';
    }

    function iniciarTracoColisao(wx, wy) {
        mePintando = true;
        meTracoColisao = {
            mapa: global.currentMap || 'green',
            pontos: [{ x: Math.round(wx), y: Math.round(wy) }],
            raioX: Math.max(2, (brush.zonaW || 40) / 2),
            raioY: Math.max(2, (brush.zonaH || 40) / 2)
        };
        meLastX = wx;
        meLastY = wy;
    }

    function acrescentarPontoTraco(wx, wy) {
        if (!meTracoColisao) return;
        var dx = wx - meLastX, dy = wy - meLastY;
        var distancia = Math.hypot(dx, dy);
        var passo = Math.max(4, Math.min(meTracoColisao.raioX, meTracoColisao.raioY) * 0.35);
        var segmentos = Math.max(1, Math.ceil(distancia / passo));
        for (var i = 1; i <= segmentos; i++) {
            var fracao = i / segmentos;
            var proximo = { x: Math.round(meLastX + dx * fracao), y: Math.round(meLastY + dy * fracao) };
            var ultimo = meTracoColisao.pontos[meTracoColisao.pontos.length - 1];
            if (ultimo.x === proximo.x && ultimo.y === proximo.y) continue;
            if (meTracoColisao.pontos.length < 512) meTracoColisao.pontos.push(proximo);
            else meTracoColisao.pontos[511] = proximo;
        }
        meLastX = wx;
        meLastY = wy;
    }

    function finalizarTracoColisao(wx, wy) {
        if (!meTracoColisao) return;
        if (Number.isFinite(wx) && Number.isFinite(wy)) acrescentarPontoTraco(wx, wy);
        var traco = meTracoColisao;
        meTracoColisao = null;
        mePintando = false;
        var pontos = traco.pontos;
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pontos.forEach(function (ponto) {
            minX = Math.min(minX, ponto.x); maxX = Math.max(maxX, ponto.x);
            minY = Math.min(minY, ponto.y); maxY = Math.max(maxY, ponto.y);
        });
        var objeto = {
            id: 'obj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
            tipo: 'zona_colisao',
            mapa: traco.mapa,
            x: Math.round(minX - traco.raioX), y: Math.round(minY - traco.raioY),
            w: Math.max(4, Math.ceil(maxX - minX + traco.raioX * 2)),
            h: Math.max(4, Math.ceil(maxY - minY + traco.raioY * 2)),
            escala: 1, variante: 0, colisao: true, camada: 'meio',
            pontos: pontos, raioX: traco.raioX, raioY: traco.raioY,
            efeito: '', efeitoCor: ''
        };
        window.mapaObjetos.push(objeto);
        meSelId = objeto.id;
        meSel = objeto;
        enviarNovoObjeto(objeto);
        meAtualizarListas();
        meAtualizarPropsUI();
    }

    function colocarNoPonto(wx, wy) {
        if (!editorAberto() || window.mapaEditorTravado) return;
        var mapa = global.currentMap || 'green';
        var o;
        if (meFerramenta === 'colocar_colisao' || meFerramenta === 'colocar_frente') {
            var zW = brush.zonaW || 40, zH = brush.zonaH || 40;
            o = {
                id: 'obj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                tipo: meFerramenta === 'colocar_colisao' ? 'zona_colisao' : 'zona_frente',
                mapa: mapa,
                x: snapCoord(wx - zW / 2), y: snapCoord(wy - zH / 2),
                w: zW, h: zH, escala: 1, variante: 0,
                colisao: meFerramenta === 'colocar_colisao',
                camada: meFerramenta === 'colocar_frente' ? 'frente' : 'meio',
                efeito: '', efeitoCor: ''
            };
        } else {
            var def = CATALOGO[brush.tipo] || CATALOGO.arvore;
            var spriteDims = brush.tipo === 'sprite_personalizado' ? dimensoesSpriteMapa(brush.asset, brush.assetRect) : null;
            var w = spriteDims ? spriteDims.w : def.w, h = spriteDims ? spriteDims.h : def.h;
            var escalaInstancia = brush.escala || 1;
            var escalaXInstancia = brush.escalaX || 1, escalaYInstancia = brush.escalaY || 1;
            o = {
                id: 'obj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                tipo: brush.tipo, asset: brush.asset || '', mapa: mapa,
                assetRect: brush.assetRect ? { x: brush.assetRect.x, y: brush.assetRect.y, w: brush.assetRect.w, h: brush.assetRect.h } : undefined,
                assetMask: assetMaskValida(brush.assetMask) ? brush.assetMask.map(function (point) { return { x: point.x, y: point.y }; }) : undefined,
                assetMaskRaster: brush.assetMaskRaster || undefined,
                assetMaskMode: brush.assetMaskMode || '',
                spriteId: brush.spriteId || '',
                categoria: brush.categoria || 'Geral',
                x: snapCoord(wx - w * escalaInstancia * escalaXInstancia / 2),
                y: snapCoord(wy - h * escalaInstancia * escalaYInstancia / 2),
                w: w, h: h, escala: escalaInstancia, escalaX: escalaXInstancia, escalaY: escalaYInstancia,
                rotacao: Number(brush.rotacao) || 0,
                ordem: window.mapaObjetos.reduce(function (maximo, existente) { return Math.max(maximo, Number(existente.ordem) || 0); }, 0) + 1,
                variante: brush.variante,
                animacao: brush.animacao,
                colisao: !!brush.colisao, camada: brush.camada,
                efeito: brush.efeito || '', efeitoCor: brush.efeitoCor || ''
            };
        }
        if (o.tipo === 'sprite_personalizado' && assetMaskValida(o.assetMask) && !divisaoSpriteValida(o)) {
            atualizarDivisaoAutomaticaSprite(o, 0.5);
        }
        lassoDiagnostico('PLACEMENT', o, o.asset ? obterImagemSpriteMapa(o.asset) : null, null, {
            sourceTexture: o.asset || null,
            sourceRegion: o.assetRect || null,
            maskSent: !!o.assetMaskRaster,
            mask: lassoRasterResumo(o.assetMaskRaster),
            exactTextureWillBeDerivedFromMask: o.assetMaskMode === 'auto'
        });
        window.mapaObjetos.push(o);
        meSelId = o.id; meSel = o;
        enviarNovoObjeto(o);
        meAtualizarListas();
        meAtualizarPropsUI();
    }

    function apagarNoPonto(wx, wy) {
        if (!editorAberto()) return;
        if (window.mapaEditorTravado) {
            meToast('🔒 Editor travado — destrave (🔓) antes de apagar.');
            return;
        }
        var alvo = acharObjetoEm(wx, wy);
        if (!alvo) {
            meToast('Nenhum objeto aqui. Clique em cima de uma árvore/pedra/objeto.');
            return;
        }
        meExcluir(alvo.id);
    }

    function onMouseDown(e) {
        if (!editorAberto()) return;
        if (window.mapaEditorMinimizado) return;
        e.preventDefault();
        e.stopPropagation();
        focarCanvasEditor();
        var p = telaParaMundo(e.clientX, e.clientY);
        meGhostX = p.wx; meGhostY = p.wy;
        if (window.mapaEditorTravado) return; // travado: não edita

        if (meFerramenta === 'mover') {
            var alvo = acharObjetoEm(p.wx, p.wy);
            if (alvo) {
                meSelId = alvo.id; meSel = alvo;
                meDefinirAlvoRecorteSelecao(alvo);
                meMoverObj = alvo;
                meOffX = p.wx - alvo.x;
                meOffY = p.wy - alvo.y;
            }
            meAtualizarListas();
            meAtualizarPropsUI();
            return;
        }
        if (meFerramenta === 'apagar') { apagarNoPonto(p.wx, p.wy); return; }
        if (meFerramenta === 'colocar_colisao') {
            iniciarTracoColisao(p.wx, p.wy);
            return;
        }
        if (ferramentaColoca()) {
            mePintando = true;
            meLastX = p.wx; meLastY = p.wy;
            colocarNoPonto(p.wx, p.wy);
        }
    }

    function onMouseMove(e) {
        if (!window.mapaEditorAtivo) return;
        var p = telaParaMundo(e.clientX, e.clientY);
        meGhostX = p.wx; meGhostY = p.wy;
        if (window.mapaEditorMinimizado || !editorAberto()) return;
        if (window.mapaEditorTravado) return;
        if (meMoverObj) {
            var novoX = snapCoord(p.wx - meOffX), novoY = snapCoord(p.wy - meOffY);
            var limites = limitesMapaEditor();
            novoX = Math.max(limites.x0, Math.min(limites.x0 + limites.w - 20, novoX));
            novoY = Math.max(limites.y0, Math.min(limites.y0 + limites.h - 20, novoY));
            if (novoX !== meMoverObj.x || novoY !== meMoverObj.y) {
                meMoverObj.x = novoX; meMoverObj.y = novoY;
            }
            return;
        }
        if (meTracoColisao && mePintando) {
            acrescentarPontoTraco(p.wx, p.wy);
            return;
        }
        var pintar = (mePintando && meDragPincel) || meShift;
        if (pintar && ferramentaColoca()) {
            var def = CATALOGO[brush.tipo] || CATALOGO.arvore;
            var passo = Math.max(10, Math.min(28, Math.max(def.w, def.h) * 0.4));
            if (meFerramenta !== 'colocar') passo = Math.max(8, Math.min(brush.zonaW, brush.zonaH) * 0.5);
            var dist = Math.hypot(p.wx - meLastX, p.wy - meLastY);
            if (dist >= passo) {
                meLastX = p.wx; meLastY = p.wy;
                colocarNoPonto(p.wx, p.wy);
            }
        }
    }

    function onMouseUp(e) {
        if (meTracoColisao) {
            var p = e && Number.isFinite(e.clientX) && Number.isFinite(e.clientY) ? telaParaMundo(e.clientX, e.clientY) : null;
            finalizarTracoColisao(p && p.wx, p && p.wy);
        }
        mePintando = false;
        if (meMoverObj) {
            var movido = meMoverObj;
            meMoverObj = null;
            enviar(movido, 'editar');
        }
    }

    function onKeyDown(e) {
        if (!editorAberto() || window.mapaEditorTravado) return;
        var active = document.activeElement;
        var editingText = editorCampoCapturaDelete(active);
        if (!editingText && (e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'd') {
            e.preventDefault();
            e.stopPropagation();
            window.meDuplicar();
            return;
        }
        if (!editingText && (e.key === 'Delete' || e.key === 'Backspace') && meSelId) {
            e.preventDefault();
            e.stopPropagation();
            window.meExcluirSel();
            return;
        }
        if (!editingText && e.key === 'Escape' && meFerramenta === 'colocar') {
            e.preventDefault();
            e.stopPropagation();
            stampPlacementArmed = false;
            brush.spriteId = '';
            meSetFerramenta('mover');
            meToast('Carimbo cancelado. Selecione outra sprite ou ferramenta.');
            return;
        }
        if (!editingText && String(e.key).toLowerCase() === 'r' && meSel) {
            e.preventDefault();
            e.stopPropagation();
            window.meRotateSelected(15);
            return;
        }
        if (e.key === 'Shift') meShift = true;
    }
    function onKeyUp(e) {
        if (e.key === 'Shift') meShift = false;
    }

    function onTouchStart(e) {
        if (!editorAberto()) return;
        e.preventDefault();
        e.stopPropagation();
        var ch = e.changedTouches;
        if (!ch || !ch.length) return;
        var t = ch[0];
        var p = telaParaMundo(t.clientX, t.clientY);
        meGhostX = p.wx; meGhostY = p.wy;
        if (window.mapaEditorTravado) return;
        if (meFerramenta === 'mover' || meFerramenta === 'apagar') {
            if (meFerramenta === 'apagar') apagarNoPonto(p.wx, p.wy);
            else {
                var alvo = acharObjetoEm(p.wx, p.wy);
                if (alvo) {
                    meSelId = alvo.id; meSel = alvo;
                    meDefinirAlvoRecorteSelecao(alvo);
                }
            }
            return;
        }
        if (meFerramenta === 'colocar_colisao') {
            iniciarTracoColisao(p.wx, p.wy);
            return;
        }
        mePintando = true;
        meLastX = p.wx; meLastY = p.wy;
        colocarNoPonto(p.wx, p.wy);
    }
    function onTouchMove(e) {
        if (!editorAberto()) return;
        e.preventDefault();
        e.stopPropagation();
        if (window.mapaEditorTravado) return;
        var ch = e.changedTouches;
        if (!ch || !ch.length) return;
        var p = telaParaMundo(ch[0].clientX, ch[0].clientY);
        meGhostX = p.wx; meGhostY = p.wy;
        if (meTracoColisao && mePintando) {
            acrescentarPontoTraco(p.wx, p.wy);
            return;
        }
        if (mePintando && ferramentaColoca()) {
            var dist = Math.hypot(p.wx - meLastX, p.wy - meLastY);
            if (dist >= 14) {
                meLastX = p.wx; meLastY = p.wy;
                colocarNoPonto(p.wx, p.wy);
            }
        }
    }
    function onTouchEnd(e) {
        if (meTracoColisao) {
            var toque = e && e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : null;
            var p = toque ? telaParaMundo(toque.clientX, toque.clientY) : null;
            finalizarTracoColisao(p && p.wx, p && p.wy);
        }
        mePintando = false;
        if (meMoverObj) { enviar(meMoverObj, 'editar'); meMoverObj = null; }
    }

    function onCanvasClick(e) {
        if (editorAberto()) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    var meInputLigado = false;
    function registrarInput() {
        var cv = global.canvas;
        if (!cv || meInputLigado) return;
        meInputLigado = true;
        cv.addEventListener('mousedown', onMouseDown, true);
        cv.addEventListener('mousemove', onMouseMove, true);
        cv.addEventListener('mouseup', onMouseUp, true);
        window.addEventListener('mouseup', onMouseUp, true);
        cv.addEventListener('click', onCanvasClick, true);
        cv.addEventListener('touchstart', onTouchStart, { capture: true, passive: false });
        cv.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
        cv.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp);
    }

    // ============================================================================
    // OVERLAY DO EDITOR (ghost, seleção, caixas de colisão/camada)
    // ============================================================================
    window.desenharOverlayMapaEditor = function (ctx) {
        if (!window.mapaEditorAtivo) return;
        if (meUltimoMapa !== global.currentMap) {
            meUltimoMapa = global.currentMap;
            meAtualizarListas();
        }
        var zoom = (typeof global.cameraZoomAtual === 'number' && global.cameraZoomAtual > 0) ? global.cameraZoomAtual : (global.ZOOM_CAMERA || 0.92);
        var camX = global.camX || 0, camY = global.camY || 0;
        var cw = ((global.canvas && global.canvas.width) || 800) / zoom;
        var ch = ((global.canvas && global.canvas.height) || 600) / zoom;
        var mapa = global.currentMap || 'green';
        var lista = window.mapaObjetos || [];

        ctx.save();

        // Caixas de colisão (aba COLISÃO) e rótulos de camada (aba CAMADA)
        for (var i = 0; i < lista.length; i++) {
            var o = lista[i];
            if (!o || o.mapa !== mapa) continue;
            var medidasObjeto = dims(o), ow = medidasObjeto.W, oh = medidasObjeto.H;
            var raioBounds = Math.hypot(ow, oh) / 2;
            var centroX = medidasObjeto.x + ow / 2, centroY = medidasObjeto.y + oh / 2;
            var foraDaTela = centroX + raioBounds < camX || centroX - raioBounds > camX + cw ||
                centroY + raioBounds < camY || centroY - raioBounds > camY + ch;
            if (window.mapaEditorTab === 'colisao' && meShowColisoes && o.colisao) {
                if (foraDaTela) continue;
                if (o.tipo === 'sprite_personalizado' && mascaraPoligonoValida(o.assetCollisionMask)) {
                    ctx.save();
                    ctx.translate(centroX, centroY);
                    ctx.rotate((Number(o.rotacao) || 0) * Math.PI / 180);
                    ctx.beginPath();
                    o.assetCollisionMask.forEach(function (point, index) {
                        var px = -ow / 2 + point.x * ow, py = -oh / 2 + point.y * oh;
                        if (index === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    });
                    ctx.closePath();
                    ctx.fillStyle = 'rgba(231,76,60,0.24)';
                    ctx.strokeStyle = (o.id === meSelId) ? '#ffffff' : '#e74c3c';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 3]);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                } else if (o.tipo === 'zona_colisao' && Array.isArray(o.pontos) && o.pontos.length) {
                    desenharTracoColisao(ctx, o.pontos, o.raioX || 12, o.raioY || 12, 'rgba(231,76,60,0.24)', (o.id === meSelId) ? '#ffffff' : '#e74c3c', [5, 3]);
                } else {
                    ctx.fillStyle = (o.tipo === 'zona_colisao') ? 'rgba(231,76,60,0.0)' : 'rgba(241,196,15,0.16)';
                    ctx.strokeStyle = (o.id === meSelId) ? '#ffffff' : '#f1c40f';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 3]);
                    ctx.save();
                    ctx.translate(centroX, centroY);
                    ctx.rotate((Number(o.rotacao) || 0) * Math.PI / 180);
                    ctx.fillRect(-ow / 2, -oh / 2, ow, oh);
                    ctx.strokeRect(-ow / 2, -oh / 2, ow, oh);
                    ctx.restore();
                    ctx.setLineDash([]);
                }
                if (o.id === meSelId) {
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.font = 'bold 10px monospace';
                    var rotulo = '🚧 ' + (CATALOGO[o.tipo] ? CATALOGO[o.tipo].nome : (o.asset || o.tipo)) + ' [' + Math.round(ow) + 'x' + Math.round(oh) + ']';
                    ctx.fillText(rotulo, o.x + 2, o.y - 4);
                }
            }
            if (window.mapaEditorTab === 'camada' && meShowCamadas) {
                if (foraDaTela) continue;
                if (o.tipo === 'zona_frente') continue; // já fica visível no jogo
                var camadaAtual = normalizarCamadaEditor(o.camada);
                var badge = { ground: '⬇ CHÃO', decoration_behind: '◀ ATRÁS', objects: '➡ OBJETOS', decoration_front: '▶ FRENTE', buildings: '🏠 CONSTRUÇÕES', foreground: '⬆ PRIMEIRO PLANO' }[camadaAtual];
                var corBadge = camadaAtual === 'ground' ? '#8e44ad' : (camadaEditorFicaNaFrente(camadaAtual) ? '#27ae60' : (camadaAtual === 'decoration_behind' ? '#d68910' : '#2980b9'));
                ctx.fillStyle = 'rgba(10,10,10,0.78)';
                ctx.font = 'bold 10px monospace';
                var tw = ctx.measureText(badge).width;
                ctx.fillRect(o.x + 2, o.y + oh - 15, tw + 8, 14);
                ctx.fillStyle = corBadge;
                ctx.fillText(badge, o.x + 6, o.y + oh - 4);
                if (o.id === meSelId && Number.isFinite(o.ySortAnchor)) {
                    var depthY = o.y + oh * o.ySortAnchor;
                    ctx.save();
                    ctx.strokeStyle = '#00e5ff';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 3]);
                    ctx.beginPath();
                    ctx.moveTo(o.x, depthY);
                    ctx.lineTo(o.x + ow, depthY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#00e5ff';
                    ctx.font = 'bold 9px monospace';
                    ctx.fillText('Y SORT', o.x + 3, depthY - 3);
                    ctx.restore();
                }
            }
        }

        // Seleção
        if (meSelId) {
            var sel = null;
            for (var si = 0; si < lista.length; si++) if (lista[si].id === meSelId) { sel = lista[si]; break; }
            if (sel && sel.mapa === mapa) {
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 2.5;
                var medidasSelecionada = dims(sel);
                ctx.save();
                ctx.translate(medidasSelecionada.x + medidasSelecionada.W / 2, medidasSelecionada.y + medidasSelecionada.H / 2);
                ctx.rotate((Number(sel.rotacao) || 0) * Math.PI / 180);
                if (sel.tipo === 'sprite_personalizado' && assetMaskValida(sel.assetMask)) {
                    ctx.beginPath();
                    sel.assetMask.forEach(function (point, index) {
                        var px = -medidasSelecionada.W / 2 + point.x * medidasSelecionada.W;
                        var py = -medidasSelecionada.H / 2 + point.y * medidasSelecionada.H;
                        if (index === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    });
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    ctx.strokeRect(-medidasSelecionada.W / 2 - 3, -medidasSelecionada.H / 2 - 3, medidasSelecionada.W + 6, medidasSelecionada.H + 6);
                }
                ctx.restore();
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.font = 'bold 11px monospace';
                var lb = (CATALOGO[sel.tipo] ? CATALOGO[sel.tipo].icone + ' ' + CATALOGO[sel.tipo].nome : (sel.asset || sel.tipo)) + '  (X:' + sel.x + ' Y:' + sel.y + ')';
                ctx.fillText(lb, sel.x + 4, sel.y - 8);
            }
        }

        if (meTracoColisao) {
            desenharTracoColisao(ctx, meTracoColisao.pontos, meTracoColisao.raioX, meTracoColisao.raioY, 'rgba(231,76,60,0.22)', '#ff6b5e', [5, 3]);
            desenharTracoColisao(ctx, [{ x: meGhostX, y: meGhostY }], meTracoColisao.raioX, meTracoColisao.raioY, 'rgba(231,76,60,0.28)', '#ff6b5e');
        }

        // Ghost do pincel (onde o mouse está agora)
        if (!meTracoColisao && !window.mapaEditorTravado && ferramentaColoca() &&
            (meFerramenta !== 'colocar' || !brush.spriteId || stampPlacementArmed) && meGhostX > -1e8) {
            var gwx = meGhostX, gwy = meGhostY;
            if (meFerramenta === 'colocar') {
                var gdef = CATALOGO[brush.tipo] || CATALOGO.arvore;
                var gSpriteDims = brush.tipo === 'sprite_personalizado' ? dimensoesSpriteMapa(brush.asset, brush.assetRect) : null;
                var gBaseW = gSpriteDims ? gSpriteDims.w : gdef.w;
                var gBaseH = gSpriteDims ? gSpriteDims.h : gdef.h;
                var gw = gBaseW * (brush.escala || 1) * (brush.escalaX || 1);
                var gh = gBaseH * (brush.escala || 1) * (brush.escalaY || 1);
                var gX = snapCoord(gwx - gw / 2), gY = snapCoord(gwy - gh / 2);
                if (!assetMaskValida(brush.assetMask)) {
                    ctx.fillStyle = 'rgba(0,229,255,0.06)';
                    ctx.fillRect(gX, gY, gw, gh);
                    ctx.strokeStyle = 'rgba(0,229,255,0.85)';
                    ctx.lineWidth = meSnap ? 1.5 : 1;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(gX, gY, gw, gh);
                    ctx.setLineDash([]);
                }
                var ghost = { id: 'ghost', tipo: brush.tipo, asset: brush.asset || '', assetRect: brush.assetRect, assetMask: brush.assetMask, assetMaskRaster: brush.assetMaskRaster, assetMaskMode: brush.assetMaskMode, x: gX, y: gY, w: gBaseW, h: gBaseH, escala: brush.escala, escalaX: brush.escalaX, escalaY: brush.escalaY, rotacao: brush.rotacao, variante: brush.variante, colisao: brush.colisao, camada: brush.camada, efeito: '', efeitoCor: '' };
                ghost.animacao = brush.animacao;
                pintarObjeto(ghost, ctx, Date.now() / 1000, 0.45);
            } else {
                var zonaW = brush.zonaW || 40, zonaH = brush.zonaH || 40;
                ctx.fillStyle = meFerramenta === 'colocar_colisao' ? 'rgba(231,76,60,0.18)' : 'rgba(46,204,113,0.16)';
                ctx.fillRect(snapCoord(gwx - zonaW / 2), snapCoord(gwy - zonaH / 2), zonaW, zonaH);
                ctx.strokeStyle = meFerramenta === 'colocar_colisao' ? '#e74c3c' : '#2ecc71';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(snapCoord(gwx - zonaW / 2), snapCoord(gwy - zonaH / 2), zonaW, zonaH);
                ctx.setLineDash([]);
            }
        }

        // Aviso de travado
        if (window.mapaEditorTravado) {
            ctx.fillStyle = 'rgba(231,76,60,0.85)';
            ctx.font = 'bold 13px monospace';
            ctx.fillText('🔒 EDITOR TRAVADO — clique em "Destravar" no editor', global.camX + 16, global.camY + 30);
        }

        ctx.restore();
    };

    // ============================================================================
    // INTERFACE (DOM)
    // ============================================================================
    function injetarEstilos() {
        if (document.getElementById('me-style')) return;
        var st = document.createElement('style');
        st.id = 'me-style';
        st.textContent = [
            '#mapa-editor-screen{position:fixed;right:8px;top:8px;width:min(1080px,calc(100vw - 20px));height:min(960px,calc(100vh - 16px));min-height:min(640px,calc(100vh - 16px));max-width:calc(100vw - 20px);max-height:calc(100vh - 16px);box-sizing:border-box;background:rgba(14,17,14,0.98);border:1px solid #2e7d32;border-radius:10px;display:none;flex-direction:column;z-index:990;font-family:"Rajdhani","Segoe UI",Arial,sans-serif;color:#ecf0f1;box-shadow:0 6px 22px rgba(0,0,0,.7);}',
            '#mapa-editor-screen.visible{display:flex;}',
            '#mapa-editor-header{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#1b5e20,#2e7d32);padding:6px 10px;border-radius:9px 9px 0 0;cursor:move;user-select:none;}',
            '#mapa-editor-title{font-weight:700;font-size:14px;letter-spacing:1px;color:#eafbea;}',
            '.me-win-btn{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:5px;padding:2px 8px;margin-left:4px;cursor:pointer;font-size:12px;}',
            '.me-win-btn:hover{background:rgba(0,0,0,.6);}',
            '#mapa-editor-tabs{display:flex;gap:4px;padding:6px 8px 0;}',
            '.me-tab-btn{flex:1;padding:5px 2px;background:#1c241c;border:1px solid #34403a;border-radius:6px 6px 0 0;color:#b8c4bc;font-weight:700;font-size:11px;cursor:pointer;}',
            '.me-tab-btn.active{background:#2e7d32;border-color:#43a047;color:#fff;}',
            '#mapa-editor-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:10px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box;}',
            '#me-panel-objetos,#me-panel-colisao,#me-panel-camada{flex-direction:column;gap:8px;width:100%;min-width:0;box-sizing:border-box;}',
            '#me-sprites-paleta{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:8px!important;overflow-y:auto!important;overflow-x:hidden!important;max-height:260px;min-height:120px!important;padding:6px!important;background:rgba(0,0,0,.22);border:1px solid #34403a;border-radius:6px;box-sizing:border-box;}',
            '#me-sprites-paleta button{width:100%;min-width:0;min-height:104px;box-sizing:border-box;}',
            '#me-sprites-paleta button img{width:100%!important;height:72px!important;object-fit:contain!important;image-rendering:auto!important;}',
            '#me-sprites-paleta button span{max-width:100%!important;width:100%;}',
            '#me-sprite-palette{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px;max-height:190px;min-height:64px;overflow:auto;padding:6px;background:#111911;border:1px solid #34483a;border-radius:6px;}',
            '#me-recorte-wrap{align-items:center;}#me-recorte-preview{width:min(100%,900px,calc((100vh - 360px)*1.5))!important;height:auto!important;max-height:none!important;object-fit:fill!important;}',
            '.me-sprite-item{display:flex;min-width:0;min-height:74px;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:#202a20;border:1px solid #39513b;border-radius:6px;color:#e1eee1;padding:4px;cursor:pointer;}',
            '.me-sprite-item.active{border-color:#00e5ff;background:#123a4a;box-shadow:0 0 6px rgba(0,229,255,.45);}',
            '.me-sprite-item img{width:58px;height:44px;object-fit:contain;image-rendering:auto;}',
            '.me-sprite-item span{width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-size:9px;}',
            '.me-toolbar{display:flex;gap:4px;flex-wrap:wrap;}',
            '.me-tool-btn{flex:1 1 auto;padding:5px 6px;background:#232c23;border:1px solid #3a4a3c;border-radius:6px;color:#dfe8df;font-size:11px;cursor:pointer;min-width:70px;}',
            '.me-tool-btn.active{background:#2980b9;border-color:#3498db;color:#fff;}',
            '.me-tool-btn.travado{background:#c0392b;border-color:#e74c3c;color:#fff;}',
            '.me-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}',
            '.me-field{display:flex;flex-direction:column;gap:2px;flex:1 1 120px;}',
            '.me-field label{font-size:10px;color:#9db8a5;font-weight:600;}',
            '.me-field input[type=range]{width:100%;}',
            '.me-field select,.me-field input[type=number]{background:#171f17;border:1px solid #3a4a3c;color:#ecf0f1;border-radius:5px;padding:3px 5px;font-size:11px;}',
            '#me-paleta{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;max-height:210px;overflow-y:auto;padding:2px;}',
            '.me-pal-item{background:#202a20;border:1px solid #39513b;border-radius:7px;padding:3px;text-align:center;cursor:pointer;color:#dceadc;font-size:9.5px;}',
            '.me-pal-item.active{border-color:#00e5ff;background:#123a4a;box-shadow:0 0 6px rgba(0,229,255,.6);}',
            '.me-pal-item canvas{width:34px;height:34px;display:block;margin:0 auto;image-rendering:pixelated;}',
            '.me-cat{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;}',
            '.me-cat-btn{padding:3px 7px;border-radius:10px;background:#232c23;border:1px solid #39513b;color:#b8c4bc;font-size:10px;cursor:pointer;}',
            '.me-cat-btn.active{background:#27ae60;color:#fff;border-color:#2ecc71;}',
            '#me-sel-panel{background:#1a241a;border:1px solid #355036;border-radius:7px;padding:7px;display:none;flex-direction:column;gap:5px;}',
            '#me-sel-panel.visible{display:flex;}',
            '.me-steppers{display:flex;gap:3px;align-items:center;}',
            '.me-step{background:#2c3a2c;border:1px solid #4a6a4a;color:#fff;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:11px;}',
            '.me-step:hover{background:#3d553d;}',
            '.me-chk{display:flex;align-items:center;gap:5px;font-size:10.5px;cursor:pointer;}',
            '.me-actions{display:flex;gap:4px;flex-wrap:wrap;}',
            '.me-act{flex:1 1 auto;padding:4px 6px;border-radius:5px;border:1px solid;cursor:pointer;font-size:10.5px;background:rgba(0,0,0,.3);color:#fff;}',
            '.me-act.save{background:#27ae60;border-color:#2ecc71;}',
            '.me-act.del{background:#c0392b;border-color:#e74c3c;}',
            '.me-act.go{background:#2980b9;border-color:#3498db;}',
            '.me-act.lock{background:#8e44ad;border-color:#9b59b6;}',
            '#mapa-editor-footer{padding:6px 8px;border-top:1px solid #2e3d30;display:flex;flex-direction:column;gap:5px]}'.replace(']}', '}'),
            '#me-status-bar{font-size:10px;color:#9db8a5;text-align:center;}',
            '#me-contador{font-size:10px;color:#2ecc71;text-align:center;font-weight:700;}',
            '#mapa-editor-hud-badge{position:fixed;left:50%;transform:translateX(-50%);top:6px;background:rgba(16,24,16,.95);border:1px solid #43a047;border-radius:8px;padding:4px 10px;color:#dff6df;font-size:11px;display:none;z-index:991;font-family:"Rajdhani",Arial,sans-serif;}',
            '#mapa-editor-hud-badge button{border:1px solid;border-radius:5px;padding:1px 7px;cursor:pointer;margin-left:5px;background:rgba(0,0,0,.3);color:#fff;font-size:10px;}',
            '#btn-mapa-editor{display:none;}',
            '@media(max-width:600px){#mapa-editor-screen{left:8px;right:8px;top:8px;width:auto;height:calc(100vh - 16px);min-height:0;max-width:none;}#mapa-editor-body{padding:7px;gap:7px;}#me-sprites-paleta{grid-template-columns:repeat(auto-fill,minmax(95px,1fr));max-height:180px;}#me-sprite-palette{grid-template-columns:repeat(auto-fill,minmax(76px,1fr));max-height:150px;}#me-recorte-preview{width:100%!important;}}'
        ].join('\n');
        document.head.appendChild(st);
    }

    var meSel = null;
    var meAreaAnimacaoDrag = null;
    var meAreaAnimacaoLayout = null;

    function animacoesSelectHtml(id, onchange) {
        return '<select id="' + id + '" onchange="' + onchange + '">' +
            ANIMACOES_SPRITE.map(function (animacao) {
                return '<option value="' + animacao[0] + '">' + animacao[1] + '</option>';
            }).join('') +
            '</select>';
    }

    function montarEditorUI() {
        var barra = document.getElementById('util-buttons');
        if (barra && !document.getElementById('btn-mapa-editor')) {
            var btn = document.createElement('button');
            btn.id = 'btn-mapa-editor';
            btn.className = 'btn-util';
            btn.innerHTML = '🗺️';
            btn.title = 'Editor de Mapa (Admin)';
            btn.style.display = 'none';
            btn.onclick = function (e) {
                e.stopPropagation();
                window.toggleEditorMapa();
            };
            barra.appendChild(btn);
        }

        if (!document.getElementById('mapa-editor-hud-badge')) {
            var badge = document.createElement('div');
            badge.id = 'mapa-editor-hud-badge';
            badge.innerHTML =
                '<span>🗺️ EDITOR DE MAPA</span>' +
                '<button id="me-badge-lock" onclick="window.meTravar()">🔒 Travar</button>' +
                '<button onclick="window.meSalvar()" style="border-color:#2ecc71;color:#2ecc71;">💾</button>' +
                '<button onclick="window.fecharEditorMapa()" style="border-color:#e74c3c;color:#e74c3c;">✕ Sair</button>';
            document.body.appendChild(badge);
        }

        if (!document.getElementById('mapa-editor-screen')) {
            var scr = document.createElement('div');
            scr.id = 'mapa-editor-screen';
            scr.innerHTML =
                '<div id="mapa-editor-header">' +
                    '<div id="mapa-editor-title">🗺️ EDITOR DE MAPA</div>' +
                    '<div style="display:flex;">' +
                        '<button class="me-win-btn" onclick="window.minimizarEditorMapa()" title="Minimizar">_</button>' +
                        '<button class="me-win-btn" onclick="window.fecharEditorMapa()" title="Fechar">✕</button>' +
                    '</div>' +
                '</div>' +
                '<div id="mapa-editor-tabs">' +
                    '<button id="me-tab-objetos" class="me-tab-btn active" onclick="window.meSetTab(\'objetos\')">🌳 OBJETOS</button>' +
                    '<button id="me-tab-colisao" class="me-tab-btn" onclick="window.meSetTab(\'colisao\')">🧱 COLISÃO</button>' +
                    '<button id="me-tab-camada" class="me-tab-btn" onclick="window.meSetTab(\'camada\')">🌿 CAMADA</button>' +
                '</div>' +
                '<div id="mapa-editor-body">' +

                    '<div id="me-panel-objetos">' +
                            '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 2px;font-size:10px;color:#9db8a5;">' +
                                '<span>🖼️ Importar atlas · sprites/Objetos/editor</span>' +
                                '<button class="me-tool-btn" onclick="window.meAtualizarSprites()">↻ Atualizar</button>' +
                            '</div>' +
                            '<div id="me-sprites-paleta"></div>' +
                            '<div id="me-recorte-wrap" style="display:none;flex-direction:column;gap:4px;padding:5px;background:#172117;border:1px solid #43543f;border-radius:5px;">' +
                                '<label style="font-size:10px;color:#d8e8d1;">Selecione em retângulo ou trace o contorno da sprite com o laço magnético.</label>' +
                                '<div class="me-toolbar"><button id="me-crop-mode-rect" class="me-tool-btn active" onclick="window.meSetCropMode(\'rect\')">▭ Retângulo</button><button id="me-crop-mode-lasso" class="me-tool-btn" onclick="window.meSetCropMode(\'lasso\')">🧲 Laço 1 — magnético</button><button id="me-crop-mode-lasso2" class="me-tool-btn" onclick="window.meSetCropMode(\'auto\')">🧲 Laço 2 — clique automático</button></div>' +
                                '<canvas id="me-recorte-preview" width="900" height="600" style="display:block;width:min(100%,900px);height:auto;object-fit:fill;background-color:#263126;background-image:linear-gradient(45deg,#344234 25%,transparent 25%),linear-gradient(-45deg,#344234 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#344234 75%),linear-gradient(-45deg,transparent 75%,#344234 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0;touch-action:none;cursor:crosshair;" onpointerdown="window.meRecortePointerDown(event)" onpointermove="window.meRecortePointerMove(event)" onpointerup="window.meRecortePointerUp(event)" onpointercancel="window.meRecortePointerUp(event)"></canvas>' +
                                '<div class="me-row"><div class="me-field"><label>Região X</label><input id="me-crop-x" type="number" min="0" step="1" onchange="window.meSetCropField(\'x\',this.value)"></div><div class="me-field"><label>Região Y</label><input id="me-crop-y" type="number" min="0" step="1" onchange="window.meSetCropField(\'y\',this.value)"></div><div class="me-field"><label>Largura</label><input id="me-crop-w" type="number" min="4" step="1" onchange="window.meSetCropField(\'w\',this.value)"></div><div class="me-field"><label>Altura</label><input id="me-crop-h" type="number" min="4" step="1" onchange="window.meSetCropField(\'h\',this.value)"></div></div>' +
                                '<div class="me-row"><div class="me-field"><label>Nome da sprite</label><input id="me-sprite-name" maxlength="64" type="text" placeholder="Ex.: Carvalho grande"></div><div class="me-field"><label>Categoria</label><input id="me-sprite-category" maxlength="48" type="text" list="me-sprite-categories" value="Vegetação" placeholder="Ex.: Vegetação"><datalist id="me-sprite-categories"><option value="Vegetação"><option value="Construções"><option value="Decoração"><option value="Estruturas"></datalist></div></div>' +
                                '<div style="display:flex;align-items:center;gap:6px;"><span id="me-recorte-status" style="flex:1;font-size:9px;color:#a9c0a7;">Selecione uma imagem acima e marque uma região.</span><button class="me-tool-btn" onclick="window.meLimparRecorteSprite()">Imagem inteira</button><button class="me-tool-btn" onclick="window.meLimparMascaraSprite()">Limpar laço</button><button class="me-tool-btn" onclick="window.meAdicionarSpritePaleta()">＋ Adicionar à Palette</button></div>' +
                            '</div>' +
                            '<div style="display:flex;align-items:center;justify-content:space-between;padding:2px;font-size:10px;color:#9db8a5;"><strong>SPRITE PALETTE</strong><select id="me-sprite-category-filter" onchange="window.meFiltrarSpritePalette(this.value)" style="background:#171f17;border:1px solid #3a4a3c;color:#ecf0f1;border-radius:5px;padding:3px 5px;font-size:10px;"><option value="Todas">Todas as categorias</option></select></div>' +
                            '<div id="me-sprite-palette"></div>' +
                            '<div class="me-toolbar">' +
                            '<button id="me-tool-colocar" class="me-tool-btn active" onclick="window.meSetFerramenta(\'colocar\')">🖱️ Colocar</button>' +
                            '<button id="me-tool-apagar" class="me-tool-btn" onclick="window.meSetFerramenta(\'apagar\')">🗑️ Apagar</button>' +
                            '<button id="me-tool-mover" class="me-tool-btn" onclick="window.meSetFerramenta(\'mover\')">👆 Mover</button>' +
                        '</div>' +
                        '<div class="me-toolbar">' +
                            '<button id="me-drag-pincel" class="me-tool-btn active" onclick="window.meToggleArrastarPincel()">🖌️ Arrastar: ON</button>' +
                            '<button id="me-snap-btn" class="me-tool-btn" onclick="window.meToggleSnap()">🧲 FREE</button>' +
                            '<button id="me-efeito-rand" class="me-tool-btn" onclick="window.meRandomVariante()">🎲 Variação</button>' +
                        '</div>' +
                        '<div id="me-brush-settings" style="display:flex;flex-direction:column;gap:8px;">' +
                        '<div class="me-row">' +
                            '<div class="me-field"><label>Escala</label><input type="range" id="me-escala" min="0.2" max="4" step="0.1" value="1" oninput="window.meSetEscala(this.value)"></div>' +
                            '<div class="me-field"><label>Variação</label><div class="me-steppers"><button class="me-step" onclick="window.meSetVariante(-1)">−</button><span id="me-variante-label" style="font-size:11px;">0</span><button class="me-step" onclick="window.meSetVariante(1)">+</button></div></div>' +
                            '<div class="me-field"><label>Camada</label><select id="me-camada" onchange="window.meSetCamada(this.value)">' +
                                '<option value="ground">⬇ Chão</option><option value="decoration_behind">◀ Decoração atrás</option><option value="objects" selected>➡ Objetos</option><option value="decoration_front">▶ Decoração à frente</option><option value="buildings">🏠 Construções</option><option value="foreground">⬆ Primeiro plano</option>' +
                            '</select></div>' +
                        '</div>' +
                        '<div class="me-row" id="me-brush-transform-row"><div class="me-field"><label>Escala X</label><input type="range" id="me-brush-scale-x" min="0.2" max="4" step="0.1" value="1" oninput="window.meSetBrushScaleAxis(\'escalaX\',this.value)"></div><div class="me-field"><label>Escala Y</label><input type="range" id="me-brush-scale-y" min="0.2" max="4" step="0.1" value="1" oninput="window.meSetBrushScaleAxis(\'escalaY\',this.value)"></div><div class="me-field"><label>Rotação: <span id="me-brush-rotation-label">0°</span></label><input type="range" id="me-brush-rotation" min="0" max="359" step="1" value="0" oninput="window.meSetBrushRotation(this.value)"></div></div>' +
                        '<div class="me-row">' +
                            '<div class="me-field"><label>Animação do sprite (30 estilos)</label>' + animacoesSelectHtml('me-animacao', 'window.meSetAnimacao(this.value)') + '</div>' +
                        '</div>' +
                        '<div class="me-row">' +
                            '<div class="me-field"><label>Colisão</label><label class="me-chk"><input type="checkbox" id="me-colisao" checked onchange="window.meSetColisao(this.checked)"> Ativa</label></div>' +
                            '<div class="me-field"><label>Efeito</label><select id="me-efeito" onchange="window.meSetEfeito(this.value)"></select></div>' +
                            '<div class="me-field" style="flex:0 0 52px;"><label>Cor</label><input type="color" id="me-efeito-cor" value="#ffd166" oninput="window.meSetEfeitoCor(this.value)"></div>' +
                        '</div>' +
                        '</div>' +
                            '<div class="me-row"><div class="me-field"><label>Conjunto do bioma</label><select id="me-bioma-catalogo" onchange="window.meSetFiltroBioma(this.value)">' +
                                BIOMAS_CATALOGO.map(function (bioma) { return '<option value="' + bioma[0] + '">' + bioma[1] + '</option>'; }).join('') +
                            '</select></div></div>' +
                            '<div class="me-cat" id="me-cat-bar"></div>' +
                        '<div id="me-paleta"></div>' +
                    '</div>' +

                    '<div id="me-panel-colisao" style="display:none;">' +
                        '<div class="me-toolbar">' +
                            '<button id="me-tool-colocar_colisao" class="me-tool-btn" onclick="window.meSetFerramenta(\'colocar_colisao\')">🖱️ Pintar colisão</button>' +
                            '<button id="me-tool-apagar2" class="me-tool-btn" onclick="window.meSetFerramenta(\'apagar\')">🗑️ Apagar</button>' +
                            '<button id="me-tool-mover2" class="me-tool-btn" onclick="window.meSetFerramenta(\'mover\')">👆 Selecionar</button>' +
                        '</div>' +
                        '<div style="font-size:10px;color:#9db8a5;">Arraste o pincel pelo mapa e solte: o traço inteiro vira uma única colisão contínua.</div>' +
                        '<div class="me-row">' +
                            '<div class="me-field"><label>Zona W</label><div class="me-steppers"><button class="me-step" onclick="window.meSetZona(\'w\',-10)">−10</button><button class="me-step" onclick="window.meSetZona(\'w\',-1)">−1</button><span id="me-zona-w-label">40</span><button class="me-step" onclick="window.meSetZona(\'w\',1)">+1</button><button class="me-step" onclick="window.meSetZona(\'w\',10)">+10</button></div></div>' +
                            '<div class="me-field"><label>Zona H</label><div class="me-steppers"><button class="me-step" onclick="window.meSetZona(\'h\',-10)">−10</button><button class="me-step" onclick="window.meSetZona(\'h\',-1)">−1</button><span id="me-zona-h-label">40</span><button class="me-step" onclick="window.meSetZona(\'h\',1)">+1</button><button class="me-step" onclick="window.meSetZona(\'h\',10)">+10</button></div></div>' +
                        '</div>' +
                        '<label class="me-chk"><input type="checkbox" id="me-show-colisoes" checked onchange="window.meToggleMostraColisoes()"> 🟡 Ver caixas de colisão</label>' +
                        '<div id="me-lista-colisao" style="display:flex;flex-direction:column;gap:3px;"></div>' +
                    '</div>' +

                    '<div id="me-panel-camada" style="display:none;">' +
                        '<div class="me-toolbar">' +
                            '<button id="me-tool-colocar_frente" class="me-tool-btn" onclick="window.meSetFerramenta(\'colocar_frente\')">🖱️ Pintar frente</button>' +
                            '<button id="me-tool-apagar3" class="me-tool-btn" onclick="window.meSetFerramenta(\'apagar\')">🗑️ Apagar</button>' +
                            '<button id="me-tool-mover3" class="me-tool-btn" onclick="window.meSetFerramenta(\'mover\')">👆 Selecionar</button>' +
                        '</div>' +
                        '<div class="me-row">' +
                            '<div class="me-field"><label>Zona W</label><div class="me-steppers"><button class="me-step" onclick="window.meSetZona(\'w\',-10)">−10</button><button class="me-step" onclick="window.meSetZona(\'w\',-1)">−1</button><span id="me-zona-w2-label">40</span><button class="me-step" onclick="window.meSetZona(\'w\',1)">+1</button><button class="me-step" onclick="window.meSetZona(\'w\',10)">+10</button></div></div>' +
                            '<div class="me-field"><label>Zona H</label><div class="me-steppers"><button class="me-step" onclick="window.meSetZona(\'h\',-10)">−10</button><button class="me-step" onclick="window.meSetZona(\'h\',-1)">−1</button><span id="me-zona-h2-label">40</span><button class="me-step" onclick="window.meSetZona(\'h\',1)">+1</button><button class="me-step" onclick="window.meSetZona(\'h\',10)">+10</button></div></div>' +
                        '</div>' +
                        '<label class="me-chk"><input type="checkbox" id="me-show-camadas" checked onchange="window.meToggleMostraCamadas()"> 🟢 Ver camadas dos objetos</label>' +
                        '<div id="me-lista-camada" style="display:flex;flex-direction:column;gap:3px;"></div>' +
                    '</div>' +

                    '<div id="me-sel-panel">' +
                        '<div style="font-size:11px;font-weight:700;" id="me-sel-titulo">—</div>' +
                        '<div style="font-size:10px;color:#9db8a5;" id="me-sel-pos">—</div>' +
                        '<div id="me-sel-lasso-tools" style="display:none;flex-direction:column;gap:5px;padding:5px;background:#172117;border:1px solid #43543f;border-radius:5px;">' +
                            '<div style="font-size:10px;color:#d8e8d1;">Laço 1 do objeto selecionado: use o contorno para ajustar colisão e referência Y.</div>' +
                            '<div id="me-sel-lasso-status" style="font-size:10px;color:#9db8a5;"></div>' +
                            '<div class="me-row"><button class="me-tool-btn" onclick="window.meAplicarLacoColisao()">Aplicar Laço 1 à colisão</button><button class="me-tool-btn" onclick="window.meAplicarLacoCamadaY()">Definir Y pelo Laço 1</button></div>' +
                            '<div class="me-row"><button class="me-tool-btn" onclick="window.meLimparLacoColisao()">Remover máscara de colisão</button><button class="me-tool-btn" onclick="window.meLimparLacoCamadaY()">Restaurar Y padrão</button></div>' +
                            '<div id="me-sel-lasso-holder"></div>' +
                        '</div>' +
                        '<div id="me-sel-depth-split-tools" style="display:none;flex-direction:column;gap:4px;padding:5px;background:#172117;border:1px solid #43543f;border-radius:5px;">' +
                            '<label class="me-field"><span>Divisão copa/tronco: <b id="me-sel-depth-split-label">50%</b></span><input id="me-sel-depth-split" type="range" min="10" max="90" step="1" value="50" oninput="window.meSetSelDepthSplit(this.value,false)" onchange="window.meSetSelDepthSplit(this.value,true)"></label>' +
                            '<div style="font-size:10px;color:#9db8a5;">Parte superior acompanha o Y-sort; parte inferior recebe a colisão do Laço.</div>' +
                            '<div class="me-row"><button class="me-tool-btn" onclick="window.meAplicarDivisaoSprite()">Aplicar divisão automática</button><button class="me-tool-btn" onclick="window.meRemoverDivisaoSprite()">Remover divisão</button></div>' +
                        '</div>' +
                        '<div class="me-row">' +
                            '<div class="me-field"><label>Colisão (W)</label><div class="me-steppers"><button class="me-step" onclick="window.meSetWH(\'w\',-10)">−10</button><button class="me-step" onclick="window.meSetWH(\'w\',-1)">−1</button><span id="me-sel-w">—</span><button class="me-step" onclick="window.meSetWH(\'w\',1)">+1</button><button class="me-step" onclick="window.meSetWH(\'w\',10)">+10</button></div></div>' +
                            '<div class="me-field"><label>Colisão (H)</label><div class="me-steppers"><button class="me-step" onclick="window.meSetWH(\'h\',-10)">−10</button><button class="me-step" onclick="window.meSetWH(\'h\',-1)">−1</button><span id="me-sel-h">—</span><button class="me-step" onclick="window.meSetWH(\'h\',1)">+1</button><button class="me-step" onclick="window.meSetWH(\'h\',10)">+10</button></div></div>' +
                            '<div class="me-field"><label>Camada</label><select id="me-sel-camada" onchange="window.meSetSelCamada(this.value)">' +
                                '<option value="ground">⬇ Chão</option><option value="decoration_behind">◀ Decoração atrás</option><option value="objects">➡ Objetos</option><option value="decoration_front">▶ Decoração à frente</option><option value="buildings">🏠 Construções</option><option value="foreground">⬆ Primeiro plano</option>' +
                            '</select></div>' +
                        '</div>' +
                        '<div class="me-field"><label>Escala visual: <span id="me-sel-escala-label">1.0x</span></label><input type="range" id="me-sel-escala" min="0.2" max="4" step="0.1" value="1" oninput="window.meSetSelEscala(this.value, false)" onchange="window.meSetSelEscala(this.value, true)"></div>' +
                        '<div class="me-row"><div class="me-field"><label>Escala X</label><input type="range" id="me-sel-scale-x" min="0.2" max="4" step="0.1" value="1" oninput="window.meSetSelScaleAxis(\'escalaX\',this.value,false)" onchange="window.meSetSelScaleAxis(\'escalaX\',this.value,true)"></div><div class="me-field"><label>Escala Y</label><input type="range" id="me-sel-scale-y" min="0.2" max="4" step="0.1" value="1" oninput="window.meSetSelScaleAxis(\'escalaY\',this.value,false)" onchange="window.meSetSelScaleAxis(\'escalaY\',this.value,true)"></div></div>' +
                        '<div class="me-row"><div class="me-field"><label>Rotação: <span id="me-sel-rotation-label">0°</span></label><input type="range" id="me-sel-rotation" min="0" max="359" step="1" value="0" oninput="window.meSetSelRotation(this.value,false)" onchange="window.meSetSelRotation(this.value,true)"></div><button class="me-step" id="me-sel-rotate-right" onclick="window.meRotateSelected(15)" title="Girar 15°">↻ 15°</button><button class="me-step" id="me-sel-rotate-left" onclick="window.meRotateSelected(-15)" title="Girar -15°">↺ 15°</button></div>' +
                        '<div class="me-field"><label>Ordem de desenho</label><input id="me-sel-order" type="number" min="0" max="1000000" step="1" onchange="window.meSetSelOrder(this.value)"></div>' +
                        '<div class="me-field"><label>Animação do sprite</label>' + animacoesSelectHtml('me-sel-animacao', 'window.meSetSelAnimacao(this.value)') + '</div>' +
                        '<div id="me-area-animacao-wrap" class="me-field" style="display:none;">' +
                            '<label>Área animada · arraste sobre o sprite</label>' +
                            '<canvas id="me-area-animacao-preview" width="320" height="150" style="display:block;width:100%;height:auto;max-height:150px;object-fit:contain;background:#101710;border:1px solid #52634a;border-radius:4px;touch-action:none;cursor:crosshair;" onpointerdown="window.meAreaAnimacaoPointerDown(event)" onpointermove="window.meAreaAnimacaoPointerMove(event)" onpointerup="window.meAreaAnimacaoPointerUp(event)" onpointercancel="window.meAreaAnimacaoPointerUp(event)"></canvas>' +
                            '<button class="me-tool-btn" onclick="window.meLimparAreaAnimacao()">Animar o sprite inteiro</button>' +
                        '</div>' +
                        '<div class="me-row">' +
                            '<label class="me-chk"><input type="checkbox" id="me-sel-colisao" onchange="window.meSetSelColisao(this.checked)"> 🟡 Colisão</label>' +
                            '<div class="me-field"><label>Efeito</label><select id="me-sel-efeito" onchange="window.meSetSelEfeito(this.value)"></select></div>' +
                        '</div>' +
                        '<div class="me-actions">' +
                            '<button class="me-act go" onclick="window.meIrAte()">📍 Ir até</button>' +
                            '<button class="me-act" onclick="window.meDuplicar()">📋 Duplicar</button>' +
                            '<button class="me-act del" onclick="window.meExcluirSel()">🗑️ Excluir</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div id="mapa-editor-footer">' +
                    '<div class="me-actions">' +
                        '<button class="me-act save" onclick="window.meSalvar()">💾 SALVAR</button>' +
                        '<button class="me-act lock" id="me-btn-lock" onclick="window.meTravar()">🔒 TRAVAR</button>' +
                        '<button class="me-act del" onclick="window.meLimparMapa()">🧹 LIMPAR MAPA</button>' +
                    '</div>' +
                    '<div id="me-contador">0 objetos neste mapa</div>' +
                    '<div id="me-status-bar">Aponte o mouse e CLIQUE para colocar · segure SHIFT ou ARRASTE para pintar vários seguidos</div>' +
                '</div>';
            document.body.appendChild(scr);
            tornarArrastavel(scr, document.getElementById('mapa-editor-header'));
            preencherEfeitosSel();
            montarCategorias();
            meMontarPaleta();
        }
    }

    function tornarArrastavel(janela, cabecalho) {
        var isDragging = false, startX, startY, origX, origY;
        cabecalho.addEventListener('mousedown', function (e) {
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            origX = janela.offsetLeft; origY = janela.offsetTop;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            e.preventDefault();
        });
        function onMove(e) {
            if (!isDragging) return;
            janela.style.left = (origX + e.clientX - startX) + 'px';
            janela.style.top = (origY + e.clientY - startY) + 'px';
            janela.style.right = 'auto';
        }
        function onUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    }

    function montarCategorias() {
        var bar = document.getElementById('me-cat-bar');
        if (!bar) return;
        bar.innerHTML = '';
        GRUPOS.forEach(function (g) {
            var b = document.createElement('button');
            b.className = 'me-cat-btn' + (g[0] === meCategoria ? ' active' : '');
            b.textContent = g[1];
            b.onclick = function () {
                meCategoria = g[0];
                montarCategorias();
                meMontarPaleta();
            };
            bar.appendChild(b);
        });
    }

    function meMontarPaleta() {
        var pal = document.getElementById('me-paleta');
        if (!pal) return;
        pal.innerHTML = '';
        var t = 0;
        PALETA.forEach(function (p) {
            var tipo = p[0];
            var def = CATALOGO[tipo];
            if (!def) return;
            if (meCategoria !== 'todas' && def.grupo !== meCategoria) return;
            if (meBiomaCatalogo !== 'todos' && def.biomas.length && def.biomas.indexOf(meBiomaCatalogo) === -1) return;
            if (tipo === 'zona_colisao' || tipo === 'zona_frente') return; // usadas nas abas Colisão/Camada
            t++;
            var item = document.createElement('div');
            item.className = 'me-pal-item' + (brush.tipo === tipo ? ' active' : '');
            item.title = def.nome;
            var cvs = document.createElement('canvas');
            cvs.width = 34; cvs.height = 34;
            var preview = { id: 'prev_' + tipo, tipo: tipo, x: 0, y: 0, w: def.w, h: def.h, escala: 0.6, variante: 0, colisao: def.colisao, camada: def.camada, efeito: '', efeitoCor: '' };
            var c2 = cvs.getContext('2d');
            c2.clearRect(0, 0, 34, 34);
            var esc = Math.min((34 - 6) / (def.w * 0.6), (34 - 6) / (def.h * 0.6));
            c2.save();
            c2.scale(esc, esc);
            c2.translate((34 / esc - def.w * 0.6) / 2, (34 / esc - def.h * 0.6) / 2);
            pintarObjeto(preview, c2, Date.now() / 1000);
            c2.restore();
            item.appendChild(cvs);
            var nome = document.createElement('div');
            nome.textContent = def.icone + ' ' + def.nome.split(' ')[0];
            item.appendChild(nome);
            item.onclick = function () { brush.tipo = tipo; meMontarPaleta(); meAtualizarPropsUI(); };
            pal.appendChild(item);
        });
        if (!t) pal.innerHTML = '<div style="font-size:10px;color:#7f8c8d;padding:6px;">Nada nesta categoria.</div>';
    }

    window.meSetFiltroBioma = function (bioma) {
        meBiomaCatalogo = BIOMAS_CATALOGO.some(function (item) { return item[0] === bioma; }) ? bioma : 'todos';
        meMontarPaleta();
    };

    function meMontarPaletaSprites() {
        var paleta = document.getElementById('me-sprites-paleta');
        if (!paleta) return;
        paleta.innerHTML = '';
        if (!spritesMapaCatalogo.length) {
            paleta.textContent = 'Nenhuma imagem encontrada. Adicione PNG/JPG/WEBP à pasta e atualize.';
            paleta.style.color = '#7f8c8d';
            paleta.style.fontSize = '10px';
            return;
        }
        paleta.style.color = '';
        spritesMapaCatalogo.forEach(function (sprite) {
            var item = document.createElement('button');
            item.type = 'button';
            item.title = sprite.name;
            item.style.cssText = 'display:flex;flex:0 0 72px;flex-direction:column;align-items:center;gap:2px;background:#231e17;border:1px solid #5a4b36;border-radius:4px;color:#ddd;padding:3px;cursor:pointer;font-size:9px;overflow:hidden;';
            item.classList.toggle('active', brush.tipo === 'sprite_personalizado' && brush.asset === sprite.name);
            var imagemCompleta = obterImagemSpriteMapa(sprite.name);
            item.disabled = false;
            if (!item.disabled) item.title += ' · ' + imagemCompleta.naturalWidth + '×' + imagemCompleta.naturalHeight;
            else if (imagemCompleta) {
                imagemCompleta.addEventListener('load', function () {
                    item.disabled = false;
                    item.title = sprite.name + ' · ' + imagemCompleta.naturalWidth + '×' + imagemCompleta.naturalHeight;
                }, { once: true });
            }
            var img = document.createElement('img');
            img.src = urlSpriteMapa(sprite.name);
            img.alt = '';
            img.style.cssText = 'width:42px;height:32px;object-fit:contain;image-rendering:pixelated;';
            img.onerror = function () {
                item.disabled = true;
                label.textContent = 'Falha ao carregar';
            };
            item.appendChild(img);
            var label = document.createElement('span');
            label.textContent = sprite.name;
            label.style.cssText = 'max-width:68px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            item.appendChild(label);
            item.onclick = function () {
                    stampPlacementArmed = false;
                    brush.tipo = 'sprite_personalizado';
                brush.asset = sprite.name;
                brush.assetRect = null;
                brush.assetMask = null;
                brush.assetMaskRaster = null;
                brush.assetMaskMode = '';
                brush.spriteId = '';
                brush.categoria = 'Vegetação';
                brush.escala = 1;
                brush.escalaX = 1;
                brush.escalaY = 1;
                brush.rotacao = 0;
                brush.colisao = false;
                assetCropTarget = 'brush';
                assetCropAsset = sprite.name;
                var nomeInput = document.getElementById('me-sprite-name');
                if (nomeInput) nomeInput.value = sprite.name.replace(/\.[^.]+$/, '');
                var categoriaInput = document.getElementById('me-sprite-category');
                if (categoriaInput) categoriaInput.value = 'Vegetação';
                var slider = document.getElementById('me-escala');
                if (slider) slider.value = '1';
                meMontarPaletaSprites();
                meDesenharRecorteSprite();
                meAtualizarPainel();
            };
            paleta.appendChild(item);
        });
    }

    var assetCropTarget = 'brush';
    var assetCropAsset = '';
    var stampPlacementArmed = false;
    var assetCropMode = 'rect';
    var assetMaskCanvases = {};

    window.receberSpritePalette = function (items) {
        spritePaletteItems = Array.isArray(items) ? items.filter(function (item) {
            return item && typeof item.id === 'string' && typeof item.name === 'string' &&
                typeof item.asset === 'string' && item.region && typeof item.category === 'string';
        }) : [];
        meMontarSpritePalette();
    };

    function meMontarSpritePalette() {
        var root = document.getElementById('me-sprite-palette');
        var filter = document.getElementById('me-sprite-category-filter');
        if (!root || !filter) return;
        var categories = ['Todas'].concat(Array.from(new Set(spritePaletteItems.map(function (item) { return item.category; })).values()).sort());
        filter.innerHTML = categories.map(function (category) {
            return '<option value="' + category.replace(/[&<>"']/g, '') + '">' +
                (category === 'Todas' ? 'Todas as categorias' : category.replace(/[&<>]/g, '')) + '</option>';
        }).join('');
        if (categories.indexOf(paletteCategory) === -1) paletteCategory = 'Todas';
        filter.value = paletteCategory;
        root.innerHTML = '';
        var visibleItems = spritePaletteItems.filter(function (item) {
            return paletteCategory === 'Todas' || item.category === paletteCategory;
        });
        visibleItems.forEach(function (paletteItem) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'me-sprite-item' + (brush.spriteId === paletteItem.id ? ' active' : '');
            button.title = paletteItem.name + ' · ' + paletteItem.category;
            var preview = document.createElement('canvas');
            preview.width = 116;
            preview.height = 88;
            var image = obterImagemSpriteMapa(paletteItem.asset);
            var desenhar = function () {
                if (!image || !image.complete || !image.naturalWidth) return;
                var rect = paletteItem.region;
                if (!assetRectValido(rect, image)) return;
                var context = preview.getContext('2d');
                context.clearRect(0, 0, preview.width, preview.height);
                var scale = Math.min((preview.width - 8) / rect.w, (preview.height - 8) / rect.h);
                var width = rect.w * scale, height = rect.h * scale;
                var maskedCanvas = obterSpriteComMascara({
                    asset: paletteItem.asset,
                    id: paletteItem.id,
                    spriteId: paletteItem.id,
                    assetRect: rect,
                    assetMask: paletteItem.mask,
                    assetMaskRaster: paletteItem.maskRaster,
                    assetMaskMode: paletteItem.maskMode
                }, image);
                if (maskedCanvas) {
                    context.drawImage(maskedCanvas, (preview.width - width) / 2, (preview.height - height) / 2, width, height);
                    return;
                }
                if (mascaraAutomaticaAusente({
                    id: paletteItem.id, assetMaskMode: paletteItem.maskMode,
                    assetMaskRaster: paletteItem.maskRaster
                }, rect)) return;
                if (assetMaskValida(paletteItem.mask)) {
                    context.save();
                    context.beginPath();
                    paletteItem.mask.forEach(function (point, index) {
                        var px = (preview.width - width) / 2 + point.x * width;
                        var py = (preview.height - height) / 2 + point.y * height;
                        if (index === 0) context.moveTo(px, py);
                        else context.lineTo(px, py);
                    });
                    context.closePath();
                    context.clip();
                }
                context.drawImage(image, rect.x, rect.y, rect.w, rect.h,
                    (preview.width - width) / 2, (preview.height - height) / 2, width, height);
                if (assetMaskValida(paletteItem.mask)) context.restore();
            };
            if (image && image.complete) desenhar();
            else if (image) image.addEventListener('load', desenhar, { once: true });
            button.appendChild(preview);
            var label = document.createElement('span');
            label.textContent = paletteItem.name;
            button.appendChild(label);
            button.onclick = function () {
                brush.tipo = 'sprite_personalizado';
                brush.asset = paletteItem.asset;
                brush.assetRect = {
                    x: paletteItem.region.x, y: paletteItem.region.y,
                    w: paletteItem.region.w, h: paletteItem.region.h
                };
                brush.assetMask = assetMaskValida(paletteItem.mask) ? paletteItem.mask.map(function (point) { return { x: point.x, y: point.y }; }) : null;
                brush.assetMaskRaster = paletteItem.maskRaster || null;
                brush.assetMaskMode = paletteItem.maskMode === 'auto' || paletteItem.maskMode === 'manual' ? paletteItem.maskMode : '';
                brush.spriteId = paletteItem.id;
                brush.categoria = paletteItem.category;
                brush.escala = 1;
                brush.escalaX = 1;
                brush.escalaY = 1;
                brush.rotacao = 0;
                brush.colisao = false;
                assetCropTarget = 'brush';
                assetCropAsset = paletteItem.asset;
                meFerramenta = 'colocar';
                meSetTab('objetos');
                stampPlacementArmed = true;
                meAtualizarToolbar();
                meMontarSpritePalette();
                meMontarPaletaSprites();
                meAtualizarPainel();
                meToast('Sprite selecionada. Clique no mapa para carimbar; ESC cancela.');
            };
            root.appendChild(button);
        });
        if (!visibleItems.length) {
            root.textContent = spritePaletteItems.length ? 'Nenhuma sprite nesta categoria.' : 'Selecione um atlas, marque uma região e adicione sprites à palette.';
            root.style.color = '#7f8c8d';
            root.style.fontSize = '10px';
        } else {
            root.style.color = '';
            root.style.fontSize = '';
        }
    }

    window.meFiltrarSpritePalette = function (category) {
        paletteCategory = category || 'Todas';
        meMontarSpritePalette();
    };

    window.meSolicitarSpritePalette = function () {
        if (!global.ws || global.ws.readyState !== 1) {
            meToast('Não foi possível carregar a palette: conexão com o servidor fechada.');
            return;
        }
        global.ws.send(JSON.stringify({ action: 'admin_map_sprite_palette_get' }));
    };

    function meSalvarSpritePaletteItems(items) {
        if (!global.ws || global.ws.readyState !== 1) {
            meToast('Não foi possível salvar a palette: conexão com o servidor fechada.');
            return false;
        }
        global.ws.send(JSON.stringify({ action: 'admin_map_sprite_palette_save', items: items }));
        return true;
    }

    window.meAdicionarSpritePaleta = function () {
        if (brush.tipo !== 'sprite_personalizado' || !brush.asset) {
            meToast('Selecione primeiro uma imagem do atlas.');
            return;
        }
        var image = obterImagemSpriteMapa(brush.asset);
        if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) {
            meToast('Aguarde o carregamento completo do atlas.');
            return;
        }
        var region = brush.assetRect || { x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight };
        if (!assetRectValido(region, image) || region.w < 4 || region.h < 4) {
            meToast('Selecione uma região válida da imagem.');
            return;
        }
        var nameInput = document.getElementById('me-sprite-name');
        var categoryInput = document.getElementById('me-sprite-category');
        var name = nameInput ? nameInput.value.trim() : '';
        var category = categoryInput ? categoryInput.value.trim() : '';
        if (!name || !category) {
            meToast('Informe o nome da sprite e sua categoria.');
            return;
        }
        var item = {
            id: 'sprite_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
            name: name,
            asset: brush.asset,
            region: { x: Math.floor(region.x), y: Math.floor(region.y), w: Math.floor(region.w), h: Math.floor(region.h) },
            mask: assetMaskValida(brush.assetMask) ? brush.assetMask.map(function (point) { return { x: point.x, y: point.y }; }) : undefined,
            maskRaster: brush.assetMaskRaster || undefined,
            maskMode: assetMaskValida(brush.assetMask) ? brush.assetMaskMode : '',
            category: category
        };
        var items = spritePaletteItems.concat([item]);
        meSalvarSpritePaletteItems(items);
    };

    function meAlvoRecorteSprite() {
        if (assetCropTarget === 'selection' && meSel && meSel.tipo === 'sprite_personalizado' && meSel.asset === assetCropAsset) return meSel;
        return brush.tipo === 'sprite_personalizado' && brush.asset === assetCropAsset ? brush : null;
    }

    function meAlphaCanvas(asset, image) {
        if (!assetMaskCanvases[asset]) {
            var canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            var context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0);
            assetMaskCanvases[asset] = { canvas: canvas, context: context, width: canvas.width, height: canvas.height, alpha: null };
        }
        return assetMaskCanvases[asset];
    }

    function meSimplificarLinha(points, tolerance) {
        if (points.length <= 3) return points.slice();
        var keep = new Uint8Array(points.length);
        keep[0] = 1;
        keep[points.length - 1] = 1;
        var stack = [[0, points.length - 1]];
        var toleranceSquared = tolerance * tolerance;
        while (stack.length) {
            var range = stack.pop();
            var first = points[range[0]], last = points[range[1]];
            var dx = last.x - first.x, dy = last.y - first.y;
            var lengthSquared = dx * dx + dy * dy;
            var greatest = toleranceSquared, bestIndex = -1;
            for (var i = range[0] + 1; i < range[1]; i++) {
                var px = points[i].x - first.x, py = points[i].y - first.y;
                var ratio = lengthSquared ? Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared)) : 0;
                var deltaX = points[i].x - (first.x + ratio * dx);
                var deltaY = points[i].y - (first.y + ratio * dy);
                var distanceSquared = deltaX * deltaX + deltaY * deltaY;
                if (distanceSquared > greatest) {
                    greatest = distanceSquared;
                    bestIndex = i;
                }
            }
            if (bestIndex !== -1) {
                keep[bestIndex] = 1;
                stack.push([range[0], bestIndex], [bestIndex, range[1]]);
            }
        }
        return points.filter(function (_, index) { return keep[index] === 1; });
    }

    function meSimplificarContorno(points) {
        var corners = [];
        for (var i = 0; i < points.length; i++) {
            var previous = points[(i + points.length - 1) % points.length];
            var current = points[i];
            var next = points[(i + 1) % points.length];
            var cross = (current.x - previous.x) * (next.y - current.y) -
                (current.y - previous.y) * (next.x - current.x);
            if (cross !== 0) corners.push(current);
        }
        if (corners.length <= 256) return corners;
        var farthest = 1, farthestDistance = 0;
        for (var p = 1; p < corners.length; p++) {
            var distance = Math.hypot(corners[p].x - corners[0].x, corners[p].y - corners[0].y);
            if (distance > farthestDistance) {
                farthestDistance = distance;
                farthest = p;
            }
        }
        var firstHalf = corners.slice(0, farthest + 1);
        var secondHalf = corners.slice(farthest).concat([corners[0]]);
        var tolerance = 1;
        var result = corners;
        for (var attempt = 0; attempt < 18; attempt++) {
            var simplified = meSimplificarLinha(firstHalf, tolerance)
                .concat(meSimplificarLinha(secondHalf, tolerance).slice(1, -1));
            result = simplified;
            if (result.length <= 256) break;
            tolerance *= 1.5;
        }
        if (result.length > 256) {
            var sampled = [];
            var stride = result.length / 256;
            for (var sample = 0; sample < 256; sample++) sampled.push(result[Math.floor(sample * stride)]);
            result = sampled;
        }
        return result;
    }

    function meCodificarBitsMascara(bits) {
        var binary = '';
        for (var start = 0; start < bits.length; start += 0x8000) {
            binary += String.fromCharCode.apply(null, bits.subarray(start, Math.min(start + 0x8000, bits.length)));
        }
        return btoa(binary);
    }

    function meCriarMascaraRaster(visited, atlasWidth, region) {
        var pixelCount = region.w * region.h;
        var packed = new Uint8Array(Math.ceil(pixelCount / 8));
        for (var y = 0; y < region.h; y++) {
            var atlasOffset = (region.y + y) * atlasWidth + region.x;
            var regionOffset = y * region.w;
            for (var x = 0; x < region.w; x++) {
                if (!visited[atlasOffset + x]) continue;
                var index = regionOffset + x;
                packed[index >> 3] |= 1 << (index & 7);
            }
        }
        return { w: region.w, h: region.h, data: meCodificarBitsMascara(packed) };
    }

    function meLacoAutomatico(point, image) {
        var alphaMap = meAlphaCanvas(assetCropAsset, image);
        if (!alphaMap.alpha) {
            var pixels = alphaMap.context.getImageData(0, 0, alphaMap.width, alphaMap.height).data;
            alphaMap.alpha = new Uint8Array(alphaMap.width * alphaMap.height);
            for (var i = 0; i < alphaMap.alpha.length; i++) alphaMap.alpha[i] = pixels[i * 4 + 3];
        }
        var width = alphaMap.width, height = alphaMap.height, alpha = alphaMap.alpha;
        var seedX = Math.max(0, Math.min(width - 1, Math.floor(point.x * width)));
        var seedY = Math.max(0, Math.min(height - 1, Math.floor(point.y * height)));
        var seed = seedY * width + seedX, alphaThreshold = 32;
        if (alpha[seed] < alphaThreshold) {
            var nearest = -1, nearestDistance = Infinity, radius = 18;
            for (var oy = -radius; oy <= radius; oy++) {
                var py = seedY + oy;
                if (py < 0 || py >= height) continue;
                for (var ox = -radius; ox <= radius; ox++) {
                    var px = seedX + ox;
                    if (px < 0 || px >= width) continue;
                    var candidate = py * width + px;
                    var distance = ox * ox + oy * oy;
                    if (distance < nearestDistance && alpha[candidate] >= alphaThreshold) {
                        nearest = candidate;
                        nearestDistance = distance;
                    }
                }
            }
            seed = nearest;
        }
        if (seed < 0 || alpha[seed] < alphaThreshold) return null;

        var visited = new Uint8Array(width * height);
        var queue = new Int32Array(width * height);
        var head = 0, tail = 0;
        visited[seed] = 1;
        queue[tail++] = seed;
        var minX = width, minY = height, maxX = 0, maxY = 0;
        var componentLimit = 400000;
        while (head < tail) {
            var pixel = queue[head++];
            var x = pixel % width, y = Math.floor(pixel / width);
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
            if (tail >= componentLimit) throw new Error('A seleção automática ficou grande demais; use o Laço magnético manual.');
            var neighbors = [pixel - width, pixel + 1, pixel + width, pixel - 1];
            for (var n = 0; n < 4; n++) {
                var next = neighbors[n];
                if ((n === 0 && y === 0) || (n === 1 && x === width - 1) ||
                    (n === 2 && y === height - 1) || (n === 3 && x === 0) ||
                    visited[next] || alpha[next] < alphaThreshold) continue;
                visited[next] = 1;
                queue[tail++] = next;
            }
        }

        var edges = [], outgoing = new Map();
        function addEdge(sx, sy, ex, ey, direction) {
            var edge = { sx: sx, sy: sy, ex: ex, ey: ey, direction: direction, used: false };
            edges.push(edge);
            var key = sx + ',' + sy;
            if (!outgoing.has(key)) outgoing.set(key, []);
            outgoing.get(key).push(edge);
        }
        for (var q = 0; q < tail; q++) {
            var cell = queue[q], cellX = cell % width, cellY = Math.floor(cell / width);
            if (cellY === 0 || !visited[cell - width]) addEdge(cellX, cellY, cellX + 1, cellY, 0);
            if (cellX === width - 1 || !visited[cell + 1]) addEdge(cellX + 1, cellY, cellX + 1, cellY + 1, 1);
            if (cellY === height - 1 || !visited[cell + width]) addEdge(cellX + 1, cellY + 1, cellX, cellY + 1, 2);
            if (cellX === 0 || !visited[cell - 1]) addEdge(cellX, cellY + 1, cellX, cellY, 3);
        }
        if (edges.length < 12) return null;
        var first = edges[0];
        for (var edgeIndex = 1; edgeIndex < edges.length; edgeIndex++) {
            var candidateEdge = edges[edgeIndex];
            if (candidateEdge.sy < first.sy || (candidateEdge.sy === first.sy && candidateEdge.sx < first.sx)) first = candidateEdge;
        }
        var contour = [], currentEdge = first, maxSteps = edges.length + 1;
        while (maxSteps-- > 0 && currentEdge && !currentEdge.used) {
            currentEdge.used = true;
            contour.push({ x: currentEdge.sx, y: currentEdge.sy });
            var candidates = outgoing.get(currentEdge.ex + ',' + currentEdge.ey) || [];
            var preference = [
                (currentEdge.direction + 1) % 4,
                currentEdge.direction,
                (currentEdge.direction + 3) % 4,
                (currentEdge.direction + 2) % 4
            ];
            var nextEdge = null;
            for (var turn = 0; turn < preference.length && !nextEdge; turn++) {
                for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
                    if (!candidates[candidateIndex].used && candidates[candidateIndex].direction === preference[turn]) {
                        nextEdge = candidates[candidateIndex];
                        break;
                    }
                }
            }
            if (!nextEdge || nextEdge === first) break;
            currentEdge = nextEdge;
        }
        if (contour.length < 3) return null;
        var polygon = meSimplificarContorno(contour);
        var rectX = Math.max(0, Math.floor(minX)), rectY = Math.max(0, Math.floor(minY));
        var rectW = Math.min(width, maxX + 1) - rectX, rectH = Math.min(height, maxY + 1) - rectY;
        if (rectW < 4 || rectH < 4 || polygon.length < 3) return null;
        return {
            region: { x: rectX, y: rectY, w: rectW, h: rectH },
            mask: polygon.map(function (vertex) {
                return {
                    x: Math.max(0, Math.min(1, (vertex.x - rectX) / rectW)),
                    y: Math.max(0, Math.min(1, (vertex.y - rectY) / rectH))
                };
            }),
            raster: meCriarMascaraRaster(visited, width, { x: rectX, y: rectY, w: rectW, h: rectH }),
            mode: 'auto',
            pixels: tail
        };
    }

    function mePontoBordaAlpha(asset, image, x, y) {
        var alphaMap = meAlphaCanvas(asset, image);
        var centerX = Math.round(x), centerY = Math.round(y), radius = 28;
        var left = Math.max(0, centerX - radius), top = Math.max(0, centerY - radius);
        var right = Math.min(alphaMap.width - 1, centerX + radius), bottom = Math.min(alphaMap.height - 1, centerY + radius);
        var sample = alphaMap.context.getImageData(left, top, right - left + 1, bottom - top + 1);
        var best = null, bestDistance = Infinity;
        for (var py = 1; py < sample.height - 1; py++) {
            for (var px = 1; px < sample.width - 1; px++) {
                var index = (py * sample.width + px) * 4 + 3;
                if (sample.data[index] < 96) continue;
                var edge = sample.data[index - 4] < 48 || sample.data[index + 4] < 48 ||
                    sample.data[index - sample.width * 4] < 48 || sample.data[index + sample.width * 4] < 48;
                if (!edge) continue;
                var ax = left + px, ay = top + py;
                var distance = (ax - x) * (ax - x) + (ay - y) * (ay - y);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = { x: ax, y: ay };
                }
            }
        }
        return best && bestDistance <= radius * radius ? best : { x: x, y: y };
    }

    function meCroparMascara(points, image) {
        if (!points || points.length < 3) return null;
        var minX = image.naturalWidth, minY = image.naturalHeight, maxX = 0, maxY = 0;
        points.forEach(function (point) {
            minX = Math.min(minX, point.x); minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y);
        });
        var x = Math.max(0, Math.floor(minX)), y = Math.max(0, Math.floor(minY));
        var right = Math.min(image.naturalWidth, Math.ceil(maxX)), bottom = Math.min(image.naturalHeight, Math.ceil(maxY));
        if (right - x < 4 || bottom - y < 4) return null;
        var width = right - x, height = bottom - y;
        var normalized = points.map(function (point) {
            return {
                x: Math.max(0, Math.min(1, (point.x - x) / width)),
                y: Math.max(0, Math.min(1, (point.y - y) / height))
            };
        });
        return { region: { x: x, y: y, w: width, h: height }, mask: normalized, raster: null };
    }

    window.meSetCropMode = function (mode) {
        assetCropMode = mode === 'lasso' || mode === 'auto' ? mode : 'rect';
        var rectButton = document.getElementById('me-crop-mode-rect');
        var lassoButton = document.getElementById('me-crop-mode-lasso');
        var autoButton = document.getElementById('me-crop-mode-lasso2');
        if (rectButton) rectButton.classList.toggle('active', assetCropMode === 'rect');
        if (lassoButton) lassoButton.classList.toggle('active', assetCropMode === 'lasso');
        if (autoButton) autoButton.classList.toggle('active', assetCropMode === 'auto');
        var canvas = document.getElementById('me-recorte-preview');
        if (canvas) canvas.style.cursor = assetCropMode === 'lasso' ? 'crosshair' : 'crosshair';
        var status = document.getElementById('me-recorte-status');
        if (status && assetCropMode === 'auto') status.textContent = 'Laço 2: clique dentro da sprite para selecionar automaticamente sua área opaca.';
        else if (status && assetCropMode === 'lasso') status.textContent = 'Laço magnético: arraste o cursor ao redor da sprite.';
    };

    function meDesenharRecorteSprite() {
        var wrap = document.getElementById('me-recorte-wrap');
        var canvas = document.getElementById('me-recorte-preview');
        if (!wrap || !canvas) return;
        var target = meAlvoRecorteSprite();
        wrap.style.display = target ? 'flex' : 'none';
        if (!target) return;

        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var imagem = obterImagemSpriteMapa(assetCropAsset);
        var status = document.getElementById('me-recorte-status');
        if (!imagem || !imagem.complete || !imagem.naturalWidth || !imagem.naturalHeight) {
            if (status) status.textContent = 'Carregando o atlas…';
            if (imagem) imagem.addEventListener('load', meDesenharRecorteSprite, { once: true });
            return;
        }
        var escala = Math.min(canvas.width / imagem.naturalWidth, canvas.height / imagem.naturalHeight);
        var largura = imagem.naturalWidth * escala, altura = imagem.naturalHeight * escala;
        var x = (canvas.width - largura) / 2, y = (canvas.height - altura) / 2;
        assetCropLayout = { x: x, y: y, w: largura, h: altura };
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imagem, x, y, largura, altura);
        var recorte = assetCropDrag && assetCropDrag.mode === 'rect' && assetCropDrag.preview ? assetCropDrag.preview : target.assetRect;
        if (assetRectValido(recorte, imagem) && !assetMaskValida(target.assetMask)) {
            var rx = x + largura * recorte.x / imagem.naturalWidth;
            var ry = y + altura * recorte.y / imagem.naturalHeight;
            var rw = largura * recorte.w / imagem.naturalWidth;
            var rh = altura * recorte.h / imagem.naturalHeight;
            ctx.fillStyle = 'rgba(70,245,155,0.18)';
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeStyle = '#56ffad';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.setLineDash([]);
        }
        var lassoInProgress = assetCropDrag && assetCropDrag.mode === 'lasso' && assetCropDrag.points.length > 1;
        var mask = lassoInProgress
            ? assetCropDrag.points.map(function (point) {
                return { x: point.x / imagem.naturalWidth, y: point.y / imagem.naturalHeight };
            })
            : target.assetMask;
        if (assetMaskValida(mask) || (lassoInProgress && mask && mask.length > 1)) {
            ctx.save();
            ctx.beginPath();
            mask.forEach(function (point, index) {
                var px = lassoInProgress
                    ? x + point.x * largura
                    : x + (recorte.x + point.x * recorte.w) * largura / imagem.naturalWidth;
                var py = lassoInProgress
                    ? y + point.y * altura
                    : y + (recorte.y + point.y * recorte.h) * altura / imagem.naturalHeight;
                if (index === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            if (assetMaskValida(mask)) {
                ctx.closePath();
                ctx.fillStyle = 'rgba(70,245,155,0.18)';
                ctx.fill();
            }
            ctx.strokeStyle = '#56ffad';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.restore();
        }
        if (status) {
            status.textContent = target.assetRect
                ? (assetMaskValida(target.assetMask)
                    ? (target.assetMaskMode === 'auto' ? 'Laço 2: ' : 'Laço magnético: ')
                    : 'Recorte: ') + Math.round(target.assetRect.w) + ' × ' + Math.round(target.assetRect.h) + ' px · ' + assetCropAsset
                : 'Arraste um retângulo sobre uma peça do atlas · ' + imagem.naturalWidth + ' × ' + imagem.naturalHeight + ' px';
        }
        meAtualizarCropInputs(target.assetRect);
    }

    function meAtualizarCropInputs(region) {
        var values = region || { x: '', y: '', w: '', h: '' };
        [['x', 'x'], ['y', 'y'], ['w', 'w'], ['h', 'h']].forEach(function (field) {
            var input = document.getElementById('me-crop-' + field[0]);
            if (input) input.value = values[field[1]] == null ? '' : String(Math.round(values[field[1]]));
        });
    }

    window.meSetCropField = function (field, value) {
        if (['x', 'y', 'w', 'h'].indexOf(field) === -1) return;
        var target = meAlvoRecorteSprite();
        var image = target && obterImagemSpriteMapa(assetCropAsset);
        var number = Number(value);
        if (!target || !image || !image.complete || !image.naturalWidth || !image.naturalHeight || !Number.isFinite(number)) return;
        var region = target.assetRect ? {
            x: target.assetRect.x, y: target.assetRect.y, w: target.assetRect.w, h: target.assetRect.h
        } : { x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight };
        region[field] = Math.round(number);
        region.x = Math.max(0, Math.min(image.naturalWidth - 4, region.x));
        region.y = Math.max(0, Math.min(image.naturalHeight - 4, region.y));
        region.w = Math.max(4, Math.min(image.naturalWidth - region.x, region.w));
        region.h = Math.max(4, Math.min(image.naturalHeight - region.y, region.h));
        target.assetRect = region;
        target.assetMask = null;
        target.assetMaskRaster = null;
        target.assetMaskMode = '';
        if (assetCropTarget === 'selection' && target === meSel) {
            var dimensions = dimensoesSpriteMapa(target.asset, region);
            target.w = dimensions.w;
            target.h = dimensions.h;
            enviar(target, 'editar');
            meAtualizarListas();
            meAtualizarPropsUI();
        }
        meAtualizarCropInputs(region);
        meDesenharRecorteSprite();
    };

    function mePosicaoNoAtlas(e) {
        var canvas = document.getElementById('me-recorte-preview');
        if (!canvas || !assetCropLayout) return null;
        var rect = canvas.getBoundingClientRect();
        var px = (e.clientX - rect.left) * canvas.width / rect.width;
        var py = (e.clientY - rect.top) * canvas.height / rect.height;
        if (px < assetCropLayout.x || py < assetCropLayout.y ||
            px > assetCropLayout.x + assetCropLayout.w || py > assetCropLayout.y + assetCropLayout.h) return null;
        return {
            x: (px - assetCropLayout.x) / assetCropLayout.w,
            y: (py - assetCropLayout.y) / assetCropLayout.h
        };
    }

    function meAdicionarPontoLaco(ponto, imagem, forcar) {
        var px = ponto.x * imagem.naturalWidth, py = ponto.y * imagem.naturalHeight;
        var magnetic = mePontoBordaAlpha(assetCropAsset, imagem, px, py);
        var points = assetCropDrag.points;
        var last = points[points.length - 1];
        if (last && !forcar && Math.hypot(magnetic.x - last.x, magnetic.y - last.y) < 3) return;
        if (!last || Math.hypot(magnetic.x - last.x, magnetic.y - last.y) >= 3) points.push(magnetic);
        if (points.length > 220) {
            var simplified = [points[0]];
            for (var i = 2; i < points.length - 1; i += 2) simplified.push(points[i]);
            simplified.push(points[points.length - 1]);
            assetCropDrag.points = simplified;
        }
    }

    function meAplicarRecorteMascara(target, crop) {
        if (!target || !crop) return;
        target.assetRect = crop.region;
        target.assetMask = crop.mask;
        target.assetMaskRaster = crop.raster || null;
        target.assetMaskMode = crop.mode === 'auto' ? 'auto' : 'manual';
        var dimensions = dimensoesSpriteMapa(target.asset, crop.region);
        target.w = dimensions.w;
        target.h = dimensions.h;
        if (assetCropTarget === 'selection' && meSel === target) {
            enviar(target, 'editar');
            meAtualizarListas();
            meAtualizarPropsUI();
        } else {
            meAtualizarPainel();
        }
        if (target.spriteId) {
            var paletteItem = spritePaletteItems.find(function (item) { return item.id === target.spriteId; });
            if (paletteItem) {
                paletteItem.region = { x: crop.region.x, y: crop.region.y, w: crop.region.w, h: crop.region.h };
                paletteItem.mask = crop.mask.map(function (point) { return { x: point.x, y: point.y }; });
                paletteItem.maskRaster = crop.raster || undefined;
                paletteItem.maskMode = target.assetMaskMode;
                if (meSalvarSpritePaletteItems(spritePaletteItems)) meMontarSpritePalette();
            }
        }
        lassoDiagnostico('SELECTION', target, obterImagemSpriteMapa(target.asset), null, {
            detectedPixels: crop.pixels || null,
            bboxPixels: crop.region.w * crop.region.h,
            bboxTransparentPixels: crop.raster
                ? crop.region.w * crop.region.h - (lassoRasterResumo(crop.raster).selectedPixels)
                : null,
            exactMaskAvailable: !!crop.raster
        });
        meDesenharRecorteSprite();
    }

    window.meRecortePointerDown = function (e) {
        var target = meAlvoRecorteSprite();
        var imagem = target && obterImagemSpriteMapa(assetCropAsset);
        var ponto = mePosicaoNoAtlas(e);
        if (!target || !imagem || !ponto) return;
        if (assetCropMode === 'auto') {
            try {
                var crop = meLacoAutomatico(ponto, imagem);
                if (!crop) {
                    meToast('Não encontrei uma sprite opaca perto do clique. Clique sobre a imagem da sprite.');
                    return;
                }
                meAplicarRecorteMascara(target, crop);
                meToast('Laço 2 selecionou automaticamente ' + crop.pixels + ' pixels. Revise e adicione à Palette.');
            } catch (error) {
                meToast('Laço 2 não conseguiu selecionar a sprite: ' + error.message);
            }
            e.preventDefault();
            return;
        }
        assetCropDrag = { pointerId: e.pointerId, start: ponto, preview: null, mode: assetCropMode, points: [] };
        if (assetCropMode === 'lasso') {
            try {
                meAdicionarPontoLaco(ponto, imagem, true);
            } catch (error) {
                assetCropDrag = null;
                meToast('Laço magnético indisponível para esta imagem: ' + error.message);
                return;
            }
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
    };

    window.meRecortePointerMove = function (e) {
        if (!assetCropDrag || assetCropDrag.pointerId !== e.pointerId) return;
        var ponto = mePosicaoNoAtlas(e);
        if (!ponto) return;
        var imagem = obterImagemSpriteMapa(assetCropAsset);
        if (assetCropDrag.mode === 'lasso') {
            try {
                meAdicionarPontoLaco(ponto, imagem, false);
            } catch (error) {
                assetCropDrag = null;
                meToast('Falha ao acompanhar a borda transparente do atlas: ' + error.message);
                meDesenharRecorteSprite();
                return;
            }
            meDesenharRecorteSprite();
            e.preventDefault();
            return;
        }
        var inicio = assetCropDrag.start;
        assetCropDrag.preview = {
            x: Math.min(inicio.x, ponto.x) * imagem.naturalWidth,
            y: Math.min(inicio.y, ponto.y) * imagem.naturalHeight,
            w: Math.abs(ponto.x - inicio.x) * imagem.naturalWidth,
            h: Math.abs(ponto.y - inicio.y) * imagem.naturalHeight
        };
        meDesenharRecorteSprite();
        e.preventDefault();
    };

    window.meRecortePointerUp = function (e) {
        if (!assetCropDrag || assetCropDrag.pointerId !== e.pointerId) return;
        var drag = assetCropDrag;
        var recorte = drag.preview;
        var target = meAlvoRecorteSprite();
        var imagem = target && obterImagemSpriteMapa(assetCropAsset);
        if (drag.mode === 'lasso' && imagem) {
            try {
                var finalPoint = mePosicaoNoAtlas(e);
                if (finalPoint) meAdicionarPontoLaco(finalPoint, imagem, true);
                var crop = meCroparMascara(drag.points, imagem);
                assetCropDrag = null;
                if (crop) {
                    meAplicarRecorteMascara(target, crop);
                }
            } catch (error) {
                assetCropDrag = null;
                meToast('Não foi possível criar o recorte magnético: ' + error.message);
            }
        } else if (recorte && imagem && recorte.w >= 4 && recorte.h >= 4) {
            assetCropDrag = null;
            recorte = {
                x: Math.max(0, Math.floor(recorte.x)),
                y: Math.max(0, Math.floor(recorte.y)),
                w: Math.min(imagem.naturalWidth, Math.ceil(recorte.x + recorte.w)) - Math.max(0, Math.floor(recorte.x)),
                h: Math.min(imagem.naturalHeight, Math.ceil(recorte.y + recorte.h)) - Math.max(0, Math.floor(recorte.y))
            };
            if (assetCropTarget === 'selection' && meSel && meSel === target) {
                meSel.assetRect = recorte;
                meSel.assetMask = null;
                meSel.assetMaskRaster = null;
                meSel.assetMaskMode = '';
                var dimensoes = dimensoesSpriteMapa(meSel.asset, recorte);
                meSel.w = dimensoes.w;
                meSel.h = dimensoes.h;
                enviar(meSel, 'editar');
                meAtualizarListas();
                meAtualizarPropsUI();
            } else {
                brush.assetRect = recorte;
                brush.assetMask = null;
                brush.assetMaskRaster = null;
                brush.assetMaskMode = '';
                meAtualizarPainel();
            }
        } else {
            assetCropDrag = null;
        }
        meDesenharRecorteSprite();
    };

    window.meLimparRecorteSprite = function () {
        var target = meAlvoRecorteSprite();
        if (!target) return;
        target.assetRect = null;
        target.assetMask = null;
        target.assetMaskRaster = null;
        target.assetMaskMode = '';
        if (assetCropTarget === 'selection' && meSel === target) {
            var dimensoes = dimensoesSpriteMapa(target.asset);
            target.w = dimensoes.w;
            target.h = dimensoes.h;
            enviar(target, 'editar');
            meAtualizarListas();
            meAtualizarPropsUI();
        } else {
            meAtualizarPainel();
        }
        meDesenharRecorteSprite();
    };

    window.meLimparMascaraSprite = function () {
        var target = meAlvoRecorteSprite();
        if (!target) return;
        target.assetMask = null;
        target.assetMaskRaster = null;
        target.assetMaskMode = '';
        if (assetCropTarget === 'selection' && meSel === target) {
            enviar(target, 'editar');
            meAtualizarPropsUI();
        } else {
            meAtualizarPainel();
        }
        if (target.spriteId) {
            var paletteItem = spritePaletteItems.find(function (item) { return item.id === target.spriteId; });
            if (paletteItem) {
                paletteItem.mask = null;
                paletteItem.maskRaster = null;
                paletteItem.maskMode = '';
                if (meSalvarSpritePaletteItems(spritePaletteItems)) meMontarSpritePalette();
            }
        }
        var status = document.getElementById('me-recorte-status');
        if (status) status.textContent = 'Laço removido. O recorte retangular atual foi mantido.';
        meDesenharRecorteSprite();
    };

    window.meAtualizarSprites = function () {
        if (!global.ws || global.ws.readyState !== 1) {
            meToast('Não foi possível atualizar: conexão com o servidor fechada.');
            return;
        }
        global.ws.send(JSON.stringify({ action: 'admin_map_sprites_list' }));
    };

    window.receberSpritesMapa = function (arquivos) {
        spritesMapaCatalogo = Array.isArray(arquivos) ? arquivos.filter(function (arquivo) {
            return arquivo && typeof arquivo.name === 'string' &&
                /^[^/\\]+\.(?:png|jpe?g|webp)$/i.test(arquivo.name);
        }) : [];
        spritesMapaCatalogo.forEach(function (sprite) { obterImagemSpriteMapa(sprite.name); });
        meMontarPaletaSprites();
    };

    function preencherEfeitosSel() {
        var selEf = document.getElementById('me-efeito');
        var selEf2 = document.getElementById('me-sel-efeito');
        var html = '';
        EFX_LIST.forEach(function (e) { html += '<option value="' + e[0] + '">' + e[1] + '</option>'; });
        if (selEf) selEf.innerHTML = html;
        if (selEf2) selEf2.innerHTML = html;
    }

    function meToast(msg) {
        if (typeof window.mostrarToast === 'function') { window.mostrarToast(msg); return; }
        var t = document.createElement('div');
        t.className = 'col-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 2400);
    }

    function meAtualizarListas() {
        var lista = obterListaAtual();
        var cont = document.getElementById('me-contador');
        if (cont) cont.textContent = lista.length + ' objetos neste mapa (' + (global.currentMap || '?') + ')';

        var LC = document.getElementById('me-lista-colisao');
        if (LC) {
            LC.innerHTML = '';
            lista.forEach(function (o) {
                var def = CATALOGO[o.tipo];
                var item = document.createElement('div');
                item.style.cssText = 'display:flex;align-items:center;gap:5px;background:#1c241c;border:1px solid ' + (o.id === meSelId ? '#00e5ff' : '#34403a') + ';border-radius:5px;padding:3px 5px;font-size:10px;cursor:pointer;';
                item.innerHTML = '<label class="me-chk"><input type="checkbox" ' + (o.colisao ? 'checked' : '') + ' onchange="window.meSetSelColisao(this.checked, \'' + o.id + '\')"></label>' +
                    '<span style="flex:1;">' + (def ? def.icone : '⛔') + ' ' + (def ? def.nome : o.tipo) + ' [' + (o.w || 40) + 'x' + (o.h || 40) + ']</span>';
                item.onclick = function () {
                    meSelId = o.id; meSel = o;
                    meDefinirAlvoRecorteSelecao(o);
                    meAtualizarListas(); meAtualizarPropsUI();
                };
                LC.appendChild(item);
            });
            if (!lista.length) LC.innerHTML = '<div style="font-size:10px;color:#7f8c8d;padding:4px;text-align:center;">Nenhum objeto neste mapa.</div>';
        }

        var CAM = document.getElementById('me-lista-camada');
        if (CAM) {
            CAM.innerHTML = '';
            lista.forEach(function (o) {
                var def = CATALOGO[o.tipo];
                var item = document.createElement('div');
                item.style.cssText = 'display:flex;align-items:center;gap:5px;background:#1c241c;border:1px solid ' + (o.id === meSelId ? '#00e5ff' : '#34403a') + ';border-radius:5px;padding:3px 5px;font-size:10px;cursor:pointer;';
                var camadaAtual = normalizarCamadaEditor(o.camada);
                var badge = { ground: '⬇', decoration_behind: '◀', objects: '➡', decoration_front: '▶', buildings: '🏠', foreground: '⬆' }[camadaAtual];
                item.innerHTML = '<span>' + badge + '</span>' +
                    '<select onchange="window.meSetSelCamada(this.value, \'' + o.id + '\')" style="background:#171f17;border:1px solid #3a4a3c;color:#ecf0f1;font-size:10px;">' +
                        '<option value="ground"' + (camadaAtual === 'ground' ? ' selected' : '') + '>Chão</option>' +
                        '<option value="decoration_behind"' + (camadaAtual === 'decoration_behind' ? ' selected' : '') + '>Decoração atrás</option>' +
                        '<option value="objects"' + (camadaAtual === 'objects' ? ' selected' : '') + '>Objetos</option>' +
                        '<option value="decoration_front"' + (camadaAtual === 'decoration_front' ? ' selected' : '') + '>Decoração à frente</option>' +
                        '<option value="buildings"' + (camadaAtual === 'buildings' ? ' selected' : '') + '>Construções</option>' +
                        '<option value="foreground"' + (camadaAtual === 'foreground' ? ' selected' : '') + '>Primeiro plano</option>' +
                    '</select>' +
                    '<span style="flex:1;">' + (def ? def.icone : '') + ' ' + (def ? def.nome : o.tipo) + '</span>';
                item.onclick = function (e) {
                    if (e.target.tagName === 'SELECT') return;
                    meSelId = o.id; meSel = o;
                    meDefinirAlvoRecorteSelecao(o);
                    meAtualizarListas(); meAtualizarPropsUI();
                };
                CAM.appendChild(item);
            });
            if (!lista.length) CAM.innerHTML = '<div style="font-size:10px;color:#7f8c8d;padding:4px;text-align:center;">Nenhum objeto neste mapa.</div>';
        }
    }

    function meDefinirAlvoRecorteSelecao(sel) {
        if (sel && sel.tipo === 'sprite_personalizado') {
            assetCropTarget = 'selection';
            assetCropAsset = sel.asset;
        } else if (assetCropTarget === 'selection') {
            assetCropTarget = 'brush';
            assetCropAsset = brush.tipo === 'sprite_personalizado' ? brush.asset : '';
        }
    }

    function meAtualizarPropsUI() {
        var panel = document.getElementById('me-sel-panel');
        if (!panel) return;
        var sel = null;
        if (meSelId) {
            var lista = window.mapaObjetos || [];
            for (var i = 0; i < lista.length; i++) if (lista[i].id === meSelId) { sel = lista[i]; break; }
        }
        meSel = sel;
        if (!sel) {
            panel.classList.remove('visible');
            meDefinirAlvoRecorteSelecao(null);
            meDesenharRecorteSprite();
            return;
        }
        panel.classList.add('visible');
        var def = CATALOGO[sel.tipo];
        document.getElementById('me-sel-titulo').textContent = (def ? def.icone + ' ' + def.nome : (sel.asset || sel.tipo)) + ' (' + sel.mapa + ')';
        document.getElementById('me-sel-pos').textContent = 'X:' + sel.x + '  Y:' + sel.y + '  Colisão: ' + (sel.colisao ? 'SIM' : 'NÃO');
        document.getElementById('me-sel-w').textContent = sel.tipo === 'zona_colisao' && Array.isArray(sel.pontos) ? Math.round((sel.raioX || 12) * 2) : (sel.w || 40);
        document.getElementById('me-sel-h').textContent = sel.tipo === 'zona_colisao' && Array.isArray(sel.pontos) ? Math.round((sel.raioY || 12) * 2) : (sel.h || 40);
        var escalaSel = document.getElementById('me-sel-escala');
        if (escalaSel) escalaSel.value = sel.escala || 1;
        var escalaLabel = document.getElementById('me-sel-escala-label');
        if (escalaLabel) escalaLabel.textContent = (sel.escala || 1).toFixed(1) + 'x';
        var escalaXSelecionada = document.getElementById('me-sel-scale-x');
        if (escalaXSelecionada) escalaXSelecionada.value = sel.escalaX || 1;
        var escalaYSelecionada = document.getElementById('me-sel-scale-y');
        if (escalaYSelecionada) escalaYSelecionada.value = sel.escalaY || 1;
        if (escalaXSelecionada) escalaXSelecionada.disabled = sel.tipo !== 'sprite_personalizado';
        if (escalaYSelecionada) escalaYSelecionada.disabled = sel.tipo !== 'sprite_personalizado';
        var rotacaoSelecionada = document.getElementById('me-sel-rotation');
        if (rotacaoSelecionada) rotacaoSelecionada.value = Math.round(Number(sel.rotacao) || 0);
        if (rotacaoSelecionada) rotacaoSelecionada.disabled = sel.tipo !== 'sprite_personalizado';
        var rotacaoLabel = document.getElementById('me-sel-rotation-label');
        if (rotacaoLabel) rotacaoLabel.textContent = Math.round(Number(sel.rotacao) || 0) + '°';
        ['me-sel-rotate-left', 'me-sel-rotate-right'].forEach(function (id) {
            var button = document.getElementById(id);
            if (button) button.disabled = sel.tipo !== 'sprite_personalizado';
        });
        var ordemSelecionada = document.getElementById('me-sel-order');
        if (ordemSelecionada) ordemSelecionada.value = Math.max(0, Number(sel.ordem) || 0);
        var animacaoSel = document.getElementById('me-sel-animacao');
        if (animacaoSel) {
            animacaoSel.value = ANIMACOES_SPRITE_VALIDAS.indexOf(sel.animacao) !== -1 ? sel.animacao : 'nenhuma';
            animacaoSel.disabled = sel.tipo !== 'sprite_personalizado';
        }
        var areaAnimacaoWrap = document.getElementById('me-area-animacao-wrap');
        if (areaAnimacaoWrap) areaAnimacaoWrap.style.display = sel.tipo === 'sprite_personalizado' ? 'flex' : 'none';
        if (sel.tipo === 'sprite_personalizado') {
            meDesenharAreaAnimacao();
        }
        var lassoTools = document.getElementById('me-sel-lasso-tools');
        if (lassoTools) lassoTools.style.display = sel.tipo === 'sprite_personalizado' &&
            (window.mapaEditorTab === 'colisao' || window.mapaEditorTab === 'camada') ? 'flex' : 'none';
        var lassoStatus = document.getElementById('me-sel-lasso-status');
        if (lassoStatus) lassoStatus.textContent = 'Colisão: ' +
            (mascaraPoligonoValida(sel.assetCollisionMask) ? 'contorno Laço 1' : 'retângulo') +
            ' · Y: ' + (Number.isFinite(sel.ySortAnchor) ? Math.round(sel.ySortAnchor * 100) + '% do Laço 1' : 'base da sprite');
        var splitTools = document.getElementById('me-sel-depth-split-tools');
        if (splitTools) splitTools.style.display = sel.tipo === 'sprite_personalizado' && assetMaskValida(sel.assetMask) ? 'flex' : 'none';
        var splitInput = document.getElementById('me-sel-depth-split');
        var splitLabel = document.getElementById('me-sel-depth-split-label');
        if (splitInput) {
            splitInput.value = String(Math.round((divisaoSpriteValida(sel) ? sel.assetDepthSplit : 0.5) * 100));
            splitInput.disabled = !divisaoSpriteValida(sel);
        }
        if (splitLabel) splitLabel.textContent = (divisaoSpriteValida(sel) ? Math.round(sel.assetDepthSplit * 100) : 50) + '%';
        meDesenharRecorteSprite();
        var cam = document.getElementById('me-sel-camada');
        if (cam) cam.value = normalizarCamadaEditor(sel.camada);
        var ci = document.getElementById('me-sel-colisao');
        if (ci) ci.checked = !!sel.colisao;
        var ef = document.getElementById('me-sel-efeito');
        if (ef) ef.value = sel.efeito || 'nenhum';
        var cor = document.getElementById('me-sel-cor');
        if (cor) { cor.value = /^#[0-9a-fA-F]{6}$/.test(sel.efeitoCor || '') ? sel.efeitoCor : (EFX_CORES[sel.efeito] || '#ffd166'); }
    }

    // ============================================================================
    // APIs PÚBLICAS
    // ============================================================================
    window.mostrarBotaoMapaEditor = function () {
        window.ehAdmin = true;
        var btn = document.getElementById('btn-mapa-editor');
        if (btn) btn.style.display = 'flex';
    };

    window.toggleEditorMapa = function () {
        if (window.mapaEditorAtivo) window.fecharEditorMapa();
        else window.abrirEditorMapa();
    };

    window.abrirEditorMapa = function () {
        if (!window.ehAdmin) { console.warn('Apenas administradores podem acessar o editor de mapa.'); return; }
        montarEditorUI();
        injetarEstilos();
        window.mapaEditorAtivo = true;
        window.mapaEditorMinimizado = false;
        registrarInput(); // garante que os listeners estejam ligados (o canvas pode não existir no load)
        var scr = document.getElementById('mapa-editor-screen');
        if (scr) scr.classList.add('visible');
        var badge = document.getElementById('mapa-editor-hud-badge');
        if (badge) badge.style.display = 'flex';
        var btn = document.getElementById('btn-mapa-editor');
        if (btn) btn.classList.add('ativo');
        meAtualizarListas();
        meAtualizarPropsUI();
        meAtualizarToolbar();
        meAtualizarPainel();
        window.meAtualizarSprites();
        window.meSolicitarSpritePalette();
    };

    window.fecharEditorMapa = function () {
        window.mapaEditorAtivo = false;
        meSelId = null; meSel = null;
        meMoverObj = null; mePintando = false; meTracoColisao = null;
        var scr = document.getElementById('mapa-editor-screen');
        if (scr) scr.classList.remove('visible');
        var badge = document.getElementById('mapa-editor-hud-badge');
        if (badge) badge.style.display = 'none';
        var btn = document.getElementById('btn-mapa-editor');
        if (btn) btn.classList.remove('ativo');
    };

    window.minimizarEditorMapa = function () {
        window.mapaEditorMinimizado = !window.mapaEditorMinimizado;
        var scr = document.getElementById('mapa-editor-screen');
        if (scr) scr.classList.toggle('visible', !window.mapaEditorMinimizado);
    };

    function mePosicionarPainelSelecao(tab) {
        var panel = document.getElementById('me-sel-panel');
        var body = document.getElementById('mapa-editor-body');
        if (!panel || !body) return;
        if (tab === 'objetos') {
            var settings = document.getElementById('me-brush-settings');
            var biomeSelect = document.getElementById('me-bioma-catalogo');
            var biomeRow = biomeSelect && biomeSelect.parentNode && biomeSelect.parentNode.parentNode;
            if (settings && biomeRow && biomeRow.parentNode) biomeRow.parentNode.insertBefore(panel, biomeRow);
            return;
        }
        var activePanel = document.getElementById(tab === 'colisao' ? 'me-panel-colisao' : 'me-panel-camada');
        if (activePanel && activePanel.parentNode) activePanel.parentNode.insertBefore(panel, activePanel.nextSibling);
    }

    function mePosicionarRecorteSprite(tab) {
        var wrap = document.getElementById('me-recorte-wrap');
        if (!wrap) return;
        if (tab === 'colisao' || tab === 'camada') {
            var holder = document.getElementById('me-sel-lasso-holder');
            if (holder && wrap.parentNode !== holder) holder.appendChild(wrap);
        } else {
            var palette = document.getElementById('me-sprites-paleta');
            if (palette && palette.parentNode && wrap.parentNode !== palette.parentNode) {
                palette.parentNode.insertBefore(wrap, palette);
            }
        }
    }

    window.meSetTab = function (tab) {
        window.mapaEditorTab = tab;
        document.getElementById('me-panel-objetos').style.display = tab === 'objetos' ? 'flex' : 'none';
        document.getElementById('me-panel-colisao').style.display = tab === 'colisao' ? 'flex' : 'none';
        document.getElementById('me-panel-camada').style.display = tab === 'camada' ? 'flex' : 'none';
        document.getElementById('me-tab-objetos').classList.toggle('active', tab === 'objetos');
        document.getElementById('me-tab-colisao').classList.toggle('active', tab === 'colisao');
        document.getElementById('me-tab-camada').classList.toggle('active', tab === 'camada');
        mePosicionarPainelSelecao(tab);
        mePosicionarRecorteSprite(tab);
        if (tab === 'colisao' || tab === 'camada') {
            meSetFerramenta(tab === 'colisao' ? 'colocar_colisao' : 'colocar_frente');
        } else {
            meSetFerramenta('colocar');
        }
        meAtualizarListas();
        meAtualizarPropsUI();
    };

    window.meSetFerramenta = function (f) {
        if (meTracoColisao && f !== 'colocar_colisao') finalizarTracoColisao(meLastX, meLastY);
        if (f !== 'colocar') stampPlacementArmed = false;
        meFerramenta = f;
        meAtualizarToolbar();
    };

    function meAtualizarToolbar() {
        var map = {
            'colocar': 'me-tool-colocar', 'colocar_colisao': 'me-tool-colocar_colisao',
            'colocar_frente': 'me-tool-colocar_frente', 'apagar': 'me-tool-apagar', 'mover': 'me-tool-mover'
        };
        // botões duplicados (apagar/mover em outras abas) têm sufixo
        var ids = ['me-tool-colocar', 'me-tool-colocar_colisao', 'me-tool-colocar_frente', 'me-tool-apagar', 'me-tool-apagar2', 'me-tool-apagar3', 'me-tool-mover', 'me-tool-mover2', 'me-tool-mover3'];
        ids.forEach(function (idD) {
            var b = document.getElementById(idD);
            if (!b) return;
            var chave = idD === 'me-tool-apagar2' || idD === 'me-tool-apagar3' ? 'apagar' : (idD === 'me-tool-mover2' || idD === 'me-tool-mover3' ? 'mover' : idD.replace('me-tool-', ''));
            b.classList.toggle('active', chave === meFerramenta);
        });
        var cv = global.canvas;
        if (cv) cv.style.cursor = (meFerramenta === 'mover' ? 'move' : (meFerramenta === 'apagar' ? 'not-allowed' : 'crosshair'));
    }

    window.meToggleArrastarPincel = function () {
        meDragPincel = !meDragPincel;
        var b = document.getElementById('me-drag-pincel');
        if (b) { b.textContent = '🖌️ Arrastar: ' + (meDragPincel ? 'ON' : 'OFF'); b.classList.toggle('active', meDragPincel); }
    };

    window.meToggleSnap = function () {
        meSnap = !meSnap;
        var b = document.getElementById('me-snap-btn');
        if (b) { b.textContent = meSnap ? '🧲 GRID SNAP 20' : '🧲 FREE'; b.classList.toggle('active', meSnap); }
    };

    window.meRandomVariante = function () {
        brush.variante = Math.floor(Math.random() * 4);
        var lb = document.getElementById('me-variante-label');
        if (lb) lb.textContent = brush.variante;
    };

    window.meSetEscala = function (v) {
        brush.escala = Math.max(0.2, Math.min(4, Number(v) || 1));
    };

    window.meSetBrushScaleAxis = function (axis, value) {
        if (brush.tipo !== 'sprite_personalizado' || (axis !== 'escalaX' && axis !== 'escalaY')) return;
        brush[axis] = Math.max(0.2, Math.min(4, Number(value) || 1));
    };

    window.meSetBrushRotation = function (value) {
        if (brush.tipo !== 'sprite_personalizado') return;
        brush.rotacao = ((Number(value) || 0) % 360 + 360) % 360;
        var label = document.getElementById('me-brush-rotation-label');
        if (label) label.textContent = Math.round(brush.rotacao) + '°';
    };

    window.meSetAnimacao = function (animacao) {
        brush.animacao = ANIMACOES_SPRITE_VALIDAS.indexOf(animacao) !== -1 ? animacao : 'nenhuma';
    };

    window.meSetSelEscala = function (v, persistir) {
        if (!meSel) return;
        meSel.escala = Math.max(0.2, Math.min(4, Number(v) || 1));
        var label = document.getElementById('me-sel-escala-label');
        if (label) label.textContent = meSel.escala.toFixed(1) + 'x';
        if (persistir) {
            enviar(meSel, 'editar');
            meAtualizarPropsUI();
            meAtualizarListas();
        }
    };

    window.meSetSelScaleAxis = function (axis, value, persistir) {
        if (!meSel || meSel.tipo !== 'sprite_personalizado' || (axis !== 'escalaX' && axis !== 'escalaY')) return;
        meSel[axis] = Math.max(0.2, Math.min(4, Number(value) || 1));
        if (persistir) {
            enviar(meSel, 'editar');
            meAtualizarPropsUI();
            meAtualizarListas();
        }
    };

    window.meSetSelRotation = function (value, persistir) {
        if (!meSel || meSel.tipo !== 'sprite_personalizado') return;
        meSel.rotacao = ((Number(value) || 0) % 360 + 360) % 360;
        var slider = document.getElementById('me-sel-rotation');
        var label = document.getElementById('me-sel-rotation-label');
        if (slider) slider.value = String(Math.round(meSel.rotacao));
        if (label) label.textContent = Math.round(meSel.rotacao) + '°';
        if (persistir) {
            enviar(meSel, 'editar');
            meAtualizarPropsUI();
            meAtualizarListas();
        }
    };

    window.meRotateSelected = function (delta) {
        if (!meSel || meSel.tipo !== 'sprite_personalizado' || window.mapaEditorTravado) return;
        window.meSetSelRotation((Number(meSel.rotacao) || 0) + Number(delta || 0), true);
    };

    window.meSetSelOrder = function (value) {
        if (!meSel) return;
        var order = Number(value);
        if (!Number.isFinite(order)) return;
        meSel.ordem = Math.max(0, Math.min(1000000, Math.round(order)));
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
    };

    window.meSetVariante = function (d) {
        brush.variante = Math.max(0, Math.min(8, brush.variante + d));
        var lb = document.getElementById('me-variante-label');
        if (lb) lb.textContent = brush.variante;
    };

    window.meSetCamada = function (v) {
        brush.camada = normalizarCamadaEditor(v);
    };

    window.meSetColisao = function (b) {
        brush.colisao = !!b;
    };

    window.meSetEfeito = function (v) {
        brush.efeito = v || '';
        var selCor = document.getElementById('me-efeito-cor');
        if (selCor && EFX_CORES[v]) selCor.value = EFX_CORES[v];
    };

    window.meSetEfeitoCor = function (v) {
        brush.efeitoCor = v || '';
    };

    window.meSetSelColisao = function (b, idForcado) {
        var lista = window.mapaObjetos || [];
        var alvo = null;
        if (idForcado) { for (var i = 0; i < lista.length; i++) if (lista[i].id === idForcado) { alvo = lista[i]; break; } }
        else alvo = meSel;
        if (!alvo) return;
        alvo.colisao = !!b;
        enviar(alvo, 'editar');
        meAtualizarPropsUI(); meAtualizarListas();
    };

    window.meAplicarLacoColisao = function () {
        if (!meSel || meSel.tipo !== 'sprite_personalizado') {
            meToast('Selecione uma sprite personalizada antes de aplicar o Laço 1.');
            return;
        }
        if (meSel.assetMaskMode !== 'manual' || !assetMaskValida(meSel.assetMask)) {
            meToast('Desenhe primeiro o contorno com o Laço 1 na imagem da sprite.');
            return;
        }
        meSel.assetCollisionMask = meSel.assetMask.map(function (point) { return { x: point.x, y: point.y }; });
        meSel.colisao = true;
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
        meAtualizarListas();
        meToast('Laço 1 aplicado à colisão desta sprite.');
    };

    window.meAplicarDivisaoSprite = function () {
        if (!meSel || meSel.tipo !== 'sprite_personalizado' || !assetMaskValida(meSel.assetMask)) {
            meToast('Selecione uma sprite personalizada recortada pelo Laço para dividir copa e tronco.');
            return;
        }
        var limite = divisaoSpriteValida(meSel) ? meSel.assetDepthSplit : 0.5;
        if (!atualizarDivisaoAutomaticaSprite(meSel, limite)) {
            meToast('Não foi possível gerar uma colisão inferior válida para esta divisão.');
            return;
        }
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
        meToast('Divisão aplicada: parte superior no Y-sort e parte inferior com colisão.');
    };

    window.meSetSelDepthSplit = function (value, persistir) {
        if (!meSel || !divisaoSpriteValida(meSel)) return;
        var limite = Math.max(0.1, Math.min(0.9, Number(value) / 100));
        if (!atualizarDivisaoAutomaticaSprite(meSel, limite)) {
            if (persistir) meToast('Essa altura não produz uma máscara de colisão válida.');
            meAtualizarPropsUI();
            return;
        }
        var label = document.getElementById('me-sel-depth-split-label');
        if (label) label.textContent = Math.round(limite * 100) + '%';
        if (persistir) {
            enviar(meSel, 'editar');
            meAtualizarPropsUI();
            meAtualizarListas();
        }
    };

    window.meRemoverDivisaoSprite = function () {
        if (!meSel || !divisaoSpriteValida(meSel)) return;
        delete meSel.assetDepthSplit;
        delete meSel.assetCollisionMask;
        delete meSel.ySortAnchor;
        meSel.colisao = false;
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
        meAtualizarListas();
        meToast('Divisão removida; a sprite voltou à ordenação e colisão padrão.');
    };

    window.meLimparLacoColisao = function () {
        if (!meSel || meSel.tipo !== 'sprite_personalizado') return;
        delete meSel.assetCollisionMask;
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
        meAtualizarListas();
        meToast('Máscara da colisão removida; colisão retangular restaurada.');
    };

    window.meAplicarLacoCamadaY = function () {
        if (!meSel || meSel.tipo !== 'sprite_personalizado') {
            meToast('Selecione uma sprite personalizada antes de aplicar o Laço 1.');
            return;
        }
        if (meSel.assetMaskMode !== 'manual' || !assetMaskValida(meSel.assetMask)) {
            meToast('Desenhe primeiro o contorno com o Laço 1 na imagem da sprite.');
            return;
        }
        meSel.ySortAnchor = ancoraYDoLaco(meSel.assetMask);
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
        meToast('Referência Y definida pelo ponto inferior central do Laço 1.');
    };

    window.meLimparLacoCamadaY = function () {
        if (!meSel || meSel.tipo !== 'sprite_personalizado') return;
        delete meSel.ySortAnchor;
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
        meToast('Ordenação Y padrão restaurada para a base da sprite.');
    };

    window.meSetSelCamada = function (v, idForcado) {
        var lista = window.mapaObjetos || [];
        var alvo = null;
        if (idForcado) { for (var i = 0; i < lista.length; i++) if (lista[i].id === idForcado) { alvo = lista[i]; break; } }
        else alvo = meSel;
        if (!alvo) return;
        alvo.camada = normalizarCamadaEditor(v);
        enviar(alvo, 'editar');
        meAtualizarPropsUI(); meAtualizarListas();
    };

    window.meSetSelEfeito = function (v) {
        if (!meSel) return;
        meSel.efeito = v === 'nenhum' ? '' : (v || '');
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
    };

    window.meSetWH = function (prop, d) {
        if (!meSel) return;
        if (meSel.tipo === 'zona_colisao' && Array.isArray(meSel.pontos) && meSel.pontos.length) {
            var raioProp = prop === 'w' ? 'raioX' : 'raioY';
            meSel[raioProp] = Math.max(2, Math.min(100, (Number(meSel[raioProp]) || 12) + d / 2));
            var xs = meSel.pontos.map(function (ponto) { return ponto.x; });
            var ys = meSel.pontos.map(function (ponto) { return ponto.y; });
            meSel.x = Math.floor(Math.min.apply(null, xs) - meSel.raioX);
            meSel.y = Math.floor(Math.min.apply(null, ys) - meSel.raioY);
            meSel.w = Math.ceil(Math.max.apply(null, xs) - Math.min.apply(null, xs) + meSel.raioX * 2);
            meSel.h = Math.ceil(Math.max.apply(null, ys) - Math.min.apply(null, ys) + meSel.raioY * 2);
            enviar(meSel, 'editar');
            meAtualizarPropsUI();
            meAtualizarListas();
            return;
        }
        var v = (prop === 'w' ? (meSel.w || 40) : (meSel.h || 40)) + d;
        v = Math.max(4, Math.min(500, v));
        if (prop === 'w') meSel.w = v; else meSel.h = v;
        enviar(meSel, 'editar');
        meAtualizarPropsUI();
        meAtualizarListas();
    };

    window.meSetZona = function (prop, d) {
        var v = (prop === 'w' ? (brush.zonaW || 40) : (brush.zonaH || 40)) + d;
        v = Math.max(4, Math.min(200, v));
        if (prop === 'w') brush.zonaW = v; else brush.zonaH = v;
        var lbls = [document.getElementById('me-zona-w-label'), document.getElementById('me-zona-w2-label')];
        if (prop === 'w') lbls.forEach(function (l) { if (l) l.textContent = brush.zonaW; });
        else {
            document.getElementById('me-zona-h-label').textContent = brush.zonaH;
            document.getElementById('me-zona-h2-label').textContent = brush.zonaH;
        }
    };

    window.meToggleMostraColisoes = function () {
        meShowColisoes = !meShowColisoes;
        var b = document.getElementById('me-show-colisoes');
        if (b) b.checked = meShowColisoes;
    };

    window.meToggleMostraCamadas = function () {
        meShowCamadas = !meShowCamadas;
        var b = document.getElementById('me-show-camadas');
        if (b) b.checked = meShowCamadas;
    };

    window.meTravar = function () {
        window.mapaEditorTravado = !window.mapaEditorTravado;
        var btn = document.getElementById('me-btn-lock');
        if (btn) { btn.textContent = window.mapaEditorTravado ? '🔓 DESTRAVAR' : '🔒 TRAVAR'; btn.classList.toggle('travado', window.mapaEditorTravado); }
        var badge = document.getElementById('me-badge-lock');
        if (badge) badge.textContent = window.mapaEditorTravado ? '🔓 Destravar' : '🔒 Travar';
        var spanHud = document.querySelector('#mapa-editor-hud-badge span');
        if (spanHud) spanHud.textContent = window.mapaEditorTravado ? '🗺️ EDITOR TRAVADO' : '🗺️ EDITOR DE MAPA';
    };

    window.meSalvar = function () {
        if (global.ws && global.ws.readyState === 1) {
            var mapa = global.currentMap || 'green';
            var objetos = obterListaAtual();
            global.ws.send(JSON.stringify({ action: 'admin_map_objetos_sync', mapa: mapa, objetos: objetos }));
            meToast('💾 Salvando ' + objetos.length + ' objeto(s) do mapa ' + mapa + '...');
        } else {
            meToast('Erro: conexão fechada.');
        }
    };

    window.meLimparMapa = function () {
        if (window.mapaEditorTravado) { meToast('🔒 Editor travado! Destrave antes de limpar.'); return; }
        var mapa = global.currentMap || 'green';
        if (!window.confirm('Apagar TODOS os objetos/collisões do mapa ' + mapa.toUpperCase() + '?')) return;
        if (global.ws && global.ws.readyState === 1) {
            global.ws.send(JSON.stringify({ action: 'admin_map_objetos_limpar', mapa: mapa }));
            meToast('Solicitando limpeza apenas do mapa ' + mapa + '...');
        } else {
            meToast('Não foi possível limpar: conexão com o servidor fechada.');
        }
    };

    window.meSelecionar = function (id) {
        meSelId = id;
        var selected = (window.mapaObjetos || []).find(function (object) { return object && object.id === id; }) || null;
        meSel = selected;
        meDefinirAlvoRecorteSelecao(selected);
        meAtualizarListas();
        meAtualizarPropsUI();
    };

    window.meExcluir = function (id) {
        if (window.mapaEditorTravado) {
            meToast('🔒 Editor travado — destrave (🔓) antes de apagar.');
            return;
        }
        if (typeof id !== 'string' || !id) {
            meToast('Não foi possível excluir: identificador do objeto inválido.');
            return;
        }
        if (!global.ws || global.ws.readyState !== 1) {
            meToast('Não foi possível excluir: conexão com o servidor fechada.');
            return;
        }
        var existeLocal = (window.mapaObjetos || []).some(function (objeto) { return objeto && objeto.id === id; });
        if (!existeLocal) {
            meToast('Não foi possível excluir: o objeto não está mais na lista atual.');
            return;
        }
        global.ws.send(JSON.stringify({ action: 'admin_map_objetos_excluir', id: id }));
        meToast(mapaObjetoIdsConfirmados.has(id)
            ? 'Solicitando exclusão de um objeto...'
            : 'Objeto ainda não confirmado pelo servidor; sincronizando a exclusão...');
    };

    window.meExcluirSel = function () {
        if (meSelId) window.meExcluir(meSelId);
    };

    window.meIrAte = function () {
        if (!meSel) return;
        global.meuX = meSel.x + (meSel.w || 40) / 2 - 12;
        global.meuY = meSel.y + (meSel.h || 40) + 20;
        if (global.ws && global.ws.readyState === 1) {
            global.ws.send(JSON.stringify({ x: global.meuX, y: global.meuY, angulo: 0, moving: false }));
        }
        meToast('📍 Teleportado até o objeto!');
    };

    window.meDuplicar = function () {
        if (!meSel || window.mapaEditorTravado) return;
        var copia = JSON.parse(JSON.stringify(meSel));
        copia.id = 'obj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
        copia.x += 20; copia.y += 20;
        copia.ordem = window.mapaObjetos.reduce(function (maximo, existente) { return Math.max(maximo, Number(existente.ordem) || 0); }, 0) + 1;
        window.mapaObjetos.push(copia);
        meSelId = copia.id; meSel = copia;
        enviarNovoObjeto(copia);
        meAtualizarListas();
        meAtualizarPropsUI();
    };

    function meAtualizarPainel() {
        // sincroniza seletores do brush com o estado atual
        var transformRow = document.getElementById('me-brush-transform-row');
        if (transformRow) transformRow.style.display = brush.tipo === 'sprite_personalizado' ? 'flex' : 'none';
        var cam = document.getElementById('me-camada');
        if (cam) cam.value = normalizarCamadaEditor(brush.camada);
        var ci = document.getElementById('me-colisao');
        if (ci) ci.checked = !!brush.colisao;
        var ef = document.getElementById('me-efeito');
        if (ef) ef.value = brush.efeito || 'nenhum';
        var esc = document.getElementById('me-escala');
        if (esc) esc.value = brush.escala;
        var escalaXBrush = document.getElementById('me-brush-scale-x');
        if (escalaXBrush) escalaXBrush.value = brush.escalaX || 1;
        var escalaYBrush = document.getElementById('me-brush-scale-y');
        if (escalaYBrush) escalaYBrush.value = brush.escalaY || 1;
        var rotacaoBrush = document.getElementById('me-brush-rotation');
        if (rotacaoBrush) rotacaoBrush.value = Math.round(Number(brush.rotacao) || 0);
        var rotacaoBrushLabel = document.getElementById('me-brush-rotation-label');
        if (rotacaoBrushLabel) rotacaoBrushLabel.textContent = Math.round(Number(brush.rotacao) || 0) + '°';
        var animacao = document.getElementById('me-animacao');
        if (animacao) animacao.value = brush.animacao;
        var varLb = document.getElementById('me-variante-label');
        if (varLb) varLb.textContent = brush.variante;
        var zbw = document.getElementById('me-zona-w-label');
        if (zbw) zbw.textContent = brush.zonaW;
        var zbh = document.getElementById('me-zona-h-label');
        if (zbh) zbh.textContent = brush.zonaH;
        var z2w = document.getElementById('me-zona-w2-label');
        if (z2w) z2w.textContent = brush.zonaW;
        var z2h = document.getElementById('me-zona-h2-label');
        if (z2h) z2h.textContent = brush.zonaH;
    }

    // init
    injetarEstilos();
    registrarInput();
    montarEditorUI();
    mePosicionarPainelSelecao('objetos');
    meAtualizarPainel();
})(window);