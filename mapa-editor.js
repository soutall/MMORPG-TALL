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
        ['muralha', 'Muralha Alta', '🏰', 120, 70, true, 'frente', 'montanha'],
        ['portao', 'Portão de Fazenda', '🚪', 60, 70, true, 'meio', 'montanha'],
        ['ponte', 'Ponte de Madeira', '🎢', 110, 40, true, 'meio', 'montanha'],
        // ----- Paredes / Estruturas -----
        ['parede_tijolo', 'Parede de Tijolo', '🧱', 90, 32, true, 'meio', 'parede'],
        ['parede_madeira', 'Parede de Madeira', '🪵', 90, 34, true, 'meio', 'parede'],
        ['cerca', 'Cerca', '🚧', 84, 26, true, 'meio', 'parede'],
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
        // ----- Zonas pintadas -----
        ['zona_colisao', 'Zona de Colisão (livre)', '⛔', 40, 40, true, 'meio', 'zona'],
        ['zona_frente', 'Zona de Frente (livre)', '🌿', 40, 40, false, 'frente', 'zona']
    ];

    PALETA.forEach(function (p) {
        var o = { nome: p[1], icone: p[2], w: p[3], h: p[4], colisao: p[5], camada: p[6], grupo: p[7], agua: false };
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
        ['decor', '✨ Decoração'],
        ['zona', '🚧 Zonas (colisão/frente)']
    ];

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

    // ============================================================================
    // ESTADO
    // ============================================================================
    window.mapaObjetos = [];
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
    var meMoverObj = null;
    var meOffX = 0, meOffY = 0;
    var meLastX = -1e9, meLastY = -1e9;
    var meGhostX = -1e9, meGhostY = -1e9;
    var meSnap = false;
    var meDragPincel = true;
    var meUltimoMapa = null;
    var brush = { tipo: 'arvore', escala: 1, variante: 0, camada: 'meio', colisao: true, efeito: '', efeitoCor: '#ffd166', zonaW: 40, zonaH: 40 };

    function seedDe(o) {
        var s = 7;
        var str = String((o && o.id) || 'x');
        for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) % 997;
        return s;
    }
    function variar(s, n) { return (s % 97) / n; }
    function dims(o) {
        return { x: o.x, y: o.y, W: (o.w || 40) * (o.escala || 1), H: (o.h || 40) * (o.escala || 1) };
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
            case 'bloco_pedra': case 'bloco_granito': return function (o, ctx) { pintarBloco(o, ctx, tipo); };
            case 'coluna': return pintarColuna;
            case 'obelisco': return pintarObelisco;
            case 'ruina': return pintarRuina;
            case 'muro_pedra': return pintarMuroPedra;
            case 'muralha': return pintarMuralha;
            case 'portao': return pintarPortao;
            case 'ponte': return pintarPonte;
            case 'parede_tijolo': return pintarParedeTijolo;
            case 'parede_madeira': return pintarParedeMadeira;
            case 'cerca': return pintarCerca;
            case 'torre': return pintarTorre;
            case 'parede_troncos': return pintarPalicada;
            case 'tocha': return pintarTocha;
            case 'fogueira': return pintarFogueira;
            case 'moita': case 'moita2': case 'moita_esconderijo': return function (o, ctx) { pintarMoita(o, ctx, tipo); };
            case 'arbusto': return pintarArbusto;
            case 'grama': return pintarGrama;
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
            case 'zona_colisao': return pintarZonaColisao;
            case 'zona_frente': return pintarZonaFrente;
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
    function pintarObjeto(o, ctx, t, alpha) {
        if (!o) return;
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
    function colideObjetosDoMapa(x, y, raio) {
        var mapa = global.currentMap || 'green';
        var r = (typeof raio === 'number') ? raio : 8;
        var lista = window.mapaObjetos;
        if (!lista || !lista.length) return false;
        for (var i = 0; i < lista.length; i++) {
            var o = lista[i];
            if (!o || o.mapa !== mapa || !o.colisao) continue;
            var w = o.w || 40, h = o.h || 40;
            var cxo = o.x + w / 2, cyo = o.y + h / 2;
            var dx = Math.abs(x - cxo), dy = Math.abs(y - cyo);
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
    ['agua_quadrado', 'lagoa', 'canal'].forEach(function (tp) { CATALOGO[tp].agua = true; });

    // ============================================================================
    // RENDERIZAÇÃO: objetos entram no y-sort + camada frente depois dos jogadores
    // ============================================================================
    function visivel(o, camX, camY, cw, ch) {
        return o && (o.x + o.w >= camX - 80) && (o.x <= camX + cw + 80) && (o.y + o.h >= camY - 80) && (o.y <= camY + ch + 80);
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
            if (o.camada === 'frente') continue; // desenhado depois dos jogadores
            if (!visivel(o, camX, camY, cw, ch)) continue;
            (function (obj) {
                arr.push({ y: obj.y + (obj.h || 40), draw: function () { pintarObjeto(obj, global.ctx, t || 0); } });
            })(o);
        }
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
        for (var i = 0; i < lista.length; i++) {
            var o = lista[i];
            if (!o || o.mapa !== mapa || o.camada !== 'frente') continue;
            if (!visivel(o, camX, camY, cw, ch)) continue;
            pintarObjeto(o, global.ctx, t);
        }
    };

    // ============================================================================
    // SINCRONIZAÇÃO — recebe a lista do servidor
    // ============================================================================
    window.receberMapaObjetos = function (lista) {
        window.mapaObjetos = lista || [];
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
                id: o.id, tipo: o.tipo, x: o.x, y: o.y, w: o.w, h: o.h,
                escala: o.escala != null ? o.escala : 1,
                variante: o.variante || 0,
                colisao: !!o.colisao,
                camada: o.camada || 'meio',
                efeito: o.efeito || '',
                efeitoCor: o.efeitoCor || ''
            }
        };
        if (global.ws && global.ws.readyState === 1) {
            global.ws.send(JSON.stringify(msg));
        }
    }

    // ============================================================================
    // AJUDA DE NAVEGAÇÃO
    // ============================================================================
    function obterListaAtual() {
        var mapa = global.currentMap || 'green';
        return (window.mapaObjetos || []).filter(function (o) { return o && o.mapa === mapa; });
    }

    function pontoEmObjeto(o, wx, wy) {
        var w = o.w || 40, h = o.h || 40;
        return wx >= o.x && wx <= o.x + w && wy >= o.y && wy <= o.y + h;
    }

    function acharObjetoEm(wx, wy) {
        var lista = obterListaAtual();
        // 1) hit exato: caixa do objeto expandida pela escala (o desenho pode ser maior que o hitbox)
        for (var i = lista.length - 1; i >= 0; i--) {
            var o0 = lista[i];
            var ew = (o0.w || 40) * (o0.escala || 1);
            var eh = (o0.h || 40) * (o0.escala || 1);
            var extW = Math.max(ew, (o0.w || 40) + 12);
            var extH = Math.max(eh, (o0.h || 40) + 12);
            if (wx >= o0.x && wx <= o0.x + extW && wy >= o0.y && wy <= o0.y + extH) return o0;
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
        var zoom = (typeof global.cameraZoomAtual === 'number' && global.cameraZoomAtual > 0) ? global.cameraZoomAtual : (global.ZOOM_CAMERA || 0.92);
        var camX = global.camX || 0, camY = global.camY || 0;
        var iw = window.innerWidth || 1, ih = window.innerHeight || 1;
        var wx = (((cx || 0) / iw) * cv.width) / zoom + camX;
        var wy = (((cy || 0) / ih) * cv.height) / zoom + camY;
        return {
            wx: Math.max(0, Math.min((global.WORLD_WIDTH || 65040), wx)),
            wy: Math.max(0, Math.min((global.WORLD_HEIGHT || 36000), wy))
        };
    }

    function editorAberto() {
        return window.mapaEditorAtivo && !window.mapaEditorMinimizado;
    }

    function snapCoord(v) {
        return meSnap ? Math.round(v / 20) * 20 : Math.round(v);
    }

    function ferramentaColoca() {
        return meFerramenta === 'colocar' || meFerramenta === 'colocar_colisao' || meFerramenta === 'colocar_frente';
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
            var w = def.w, h = def.h;
            o = {
                id: 'obj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                tipo: brush.tipo, mapa: mapa,
                x: snapCoord(wx - w / 2), y: snapCoord(wy - h / 2),
                w: w, h: h, escala: brush.escala, variante: brush.variante,
                colisao: !!brush.colisao, camada: brush.camada,
                efeito: brush.efeito || '', efeitoCor: brush.efeitoCor || ''
            };
        }
        window.mapaObjetos.push(o);
        meSelId = o.id; meSel = o;
        enviar(o, 'criar');
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
        var p = telaParaMundo(e.clientX, e.clientY);
        meGhostX = p.wx; meGhostY = p.wy;
        if (window.mapaEditorTravado) return; // travado: não edita

        if (meFerramenta === 'mover') {
            var alvo = acharObjetoEm(p.wx, p.wy);
            if (alvo) {
                meSelId = alvo.id; meSel = alvo;
                meMoverObj = alvo;
                meOffX = p.wx - alvo.x;
                meOffY = p.wy - alvo.y;
            }
            meAtualizarListas();
            meAtualizarPropsUI();
            return;
        }
        if (meFerramenta === 'apagar') { apagarNoPonto(p.wx, p.wy); return; }
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
            novoX = Math.max(0, Math.min((global.WORLD_WIDTH || 65040) - 20, novoX));
            novoY = Math.max(0, Math.min((global.WORLD_HEIGHT || 36000) - 20, novoY));
            if (novoX !== meMoverObj.x || novoY !== meMoverObj.y) {
                meMoverObj.x = novoX; meMoverObj.y = novoY;
            }
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

    function onMouseUp() {
        mePintando = false;
        if (meMoverObj) {
            var movido = meMoverObj;
            meMoverObj = null;
            enviar(movido, 'editar');
        }
    }

    function onKeyDown(e) {
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
                if (alvo) { meSelId = alvo.id; meSel = alvo; }
            }
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
        if (mePintando && ferramentaColoca()) {
            var dist = Math.hypot(p.wx - meLastX, p.wy - meLastY);
            if (dist >= 14) {
                meLastX = p.wx; meLastY = p.wy;
                colocarNoPonto(p.wx, p.wy);
            }
        }
    }
    function onTouchEnd() {
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
        cv.addEventListener('click', onCanvasClick, true);
        cv.addEventListener('touchstart', onTouchStart, { capture: true, passive: false });
        cv.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
        cv.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
        window.addEventListener('keydown', onKeyDown);
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
            if (window.mapaEditorTab === 'colisao' && meShowColisoes && o.colisao) {
                if (o.x + o.w < camX || o.x > camX + cw || o.y + o.h < camY || o.y > camY + ch) continue;
                ctx.fillStyle = (o.tipo === 'zona_colisao') ? 'rgba(231,76,60,0.0)' : 'rgba(241,196,15,0.16)';
                ctx.fillRect(o.x, o.y, o.w, o.h);
                ctx.strokeStyle = (o.id === meSelId) ? '#ffffff' : '#f1c40f';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(o.x, o.y, o.w, o.h);
                ctx.setLineDash([]);
                if (o.id === meSelId) {
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.font = 'bold 10px monospace';
                    var rotulo = '🚧 ' + (CATALOGO[o.tipo] ? CATALOGO[o.tipo].nome : o.tipo) + ' [' + o.w + 'x' + o.h + ']';
                    ctx.fillText(rotulo, o.x + 2, o.y - 4);
                }
            }
            if (window.mapaEditorTab === 'camada' && meShowCamadas) {
                if (o.x + o.w < camX || o.x > camX + cw || o.y + o.h < camY || o.y > camY + ch) continue;
                if (o.tipo === 'zona_frente') continue; // já fica visível no jogo
                var badge = o.camada === 'frente' ? '⬆ FRENTE' : (o.camada === 'chao' ? '⬇ CHÃO' : '➡ MEIO');
                var corBadge = o.camada === 'frente' ? '#27ae60' : (o.camada === 'chao' ? '#8e44ad' : '#2980b9');
                ctx.fillStyle = 'rgba(10,10,10,0.78)';
                ctx.font = 'bold 10px monospace';
                var tw = ctx.measureText(badge).width;
                ctx.fillRect(o.x + 2, o.y + o.h - 15, tw + 8, 14);
                ctx.fillStyle = corBadge;
                ctx.fillText(badge, o.x + 6, o.y + o.h - 4);
            }
        }

        // Seleção
        if (meSelId) {
            var sel = null;
            for (var si = 0; si < lista.length; si++) if (lista[si].id === meSelId) { sel = lista[si]; break; }
            if (sel && sel.mapa === mapa) {
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(sel.x - 3, sel.y - 3, (sel.w || 40) + 6, (sel.h || 40) + 6);
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.font = 'bold 11px monospace';
                var lb = (CATALOGO[sel.tipo] ? CATALOGO[sel.tipo].icone + ' ' + CATALOGO[sel.tipo].nome : sel.tipo) + '  (X:' + sel.x + ' Y:' + sel.y + ')';
                ctx.fillText(lb, sel.x + 4, sel.y - 8);
            }
        }

        // Ghost do pincel (onde o mouse está agora)
        if (!window.mapaEditorTravado && ferramentaColoca() && meGhostX > -1e8) {
            var gwx = meGhostX, gwy = meGhostY;
            if (meFerramenta === 'colocar') {
                var gdef = CATALOGO[brush.tipo] || CATALOGO.arvore;
                var gw = gdef.w * (brush.escala || 1), gh = gdef.h * (brush.escala || 1);
                ctx.fillStyle = 'rgba(0,229,255,0.06)';
                ctx.fillRect(snapCoord(gwx - gdef.w / 2), snapCoord(gwy - gdef.h / 2), gdef.w, gdef.h);
                ctx.strokeStyle = 'rgba(0,229,255,0.85)';
                ctx.lineWidth = meSnap ? 1.5 : 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(snapCoord(gwx - gdef.w / 2), snapCoord(gwy - gdef.h / 2), gdef.w, gdef.h);
                ctx.setLineDash([]);
                var ghost = { id: 'ghost', tipo: brush.tipo, x: snapCoord(gwx - gdef.w / 2), y: snapCoord(gwy - gdef.h / 2), w: gdef.w, h: gdef.h, escala: brush.escala, variante: brush.variante, colisao: brush.colisao, camada: brush.camada, efeito: '', efeitoCor: '' };
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
            '#mapa-editor-screen{position:fixed;right:8px;top:8px;width:352px;max-width:92vw;max-height:86vh;background:rgba(14,17,14,0.97);border:1px solid #2e7d32;border-radius:10px;display:none;flex-direction:column;z-index:990;font-family:"Rajdhani","Segoe UI",Arial,sans-serif;color:#ecf0f1;box-shadow:0 6px 22px rgba(0,0,0,.7);}',
            '#mapa-editor-screen.visible{display:flex;}',
            '#mapa-editor-header{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#1b5e20,#2e7d32);padding:6px 10px;border-radius:9px 9px 0 0;cursor:move;user-select:none;}',
            '#mapa-editor-title{font-weight:700;font-size:14px;letter-spacing:1px;color:#eafbea;}',
            '.me-win-btn{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:5px;padding:2px 8px;margin-left:4px;cursor:pointer;font-size:12px;}',
            '.me-win-btn:hover{background:rgba(0,0,0,.6);}',
            '#mapa-editor-tabs{display:flex;gap:4px;padding:6px 8px 0;}',
            '.me-tab-btn{flex:1;padding:5px 2px;background:#1c241c;border:1px solid #34403a;border-radius:6px 6px 0 0;color:#b8c4bc;font-weight:700;font-size:11px;cursor:pointer;}',
            '.me-tab-btn.active{background:#2e7d32;border-color:#43a047;color:#fff;}',
            '#mapa-editor-body{overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px;}',
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
            '#btn-mapa-editor{display:none;}'
        ].join('\n');
        document.head.appendChild(st);
    }

    var meSel = null;

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
                        '<div class="me-toolbar">' +
                            '<button id="me-tool-colocar" class="me-tool-btn active" onclick="window.meSetFerramenta(\'colocar\')">🖱️ Colocar</button>' +
                            '<button id="me-tool-apagar" class="me-tool-btn" onclick="window.meSetFerramenta(\'apagar\')">🗑️ Apagar</button>' +
                            '<button id="me-tool-mover" class="me-tool-btn" onclick="window.meSetFerramenta(\'mover\')">👆 Mover</button>' +
                        '</div>' +
                        '<div class="me-toolbar">' +
                            '<button id="me-drag-pincel" class="me-tool-btn active" onclick="window.meToggleArrastarPincel()">🖌️ Arrastar: ON</button>' +
                            '<button id="me-snap-btn" class="me-tool-btn" onclick="window.meToggleSnap()">🧲 Grade 20: OFF</button>' +
                            '<button id="me-efeito-rand" class="me-tool-btn" onclick="window.meRandomVariante()">🎲 Variação</button>' +
                        '</div>' +
                        '<div class="me-cat" id="me-cat-bar"></div>' +
                        '<div id="me-paleta"></div>' +
                        '<div class="me-row">' +
                            '<div class="me-field"><label>Escala</label><input type="range" id="me-escala" min="0.5" max="3" step="0.1" value="1" oninput="window.meSetEscala(this.value)"></div>' +
                            '<div class="me-field"><label>Variação</label><div class="me-steppers"><button class="me-step" onclick="window.meSetVariante(-1)">−</button><span id="me-variante-label" style="font-size:11px;">0</span><button class="me-step" onclick="window.meSetVariante(1)">+</button></div></div>' +
                            '<div class="me-field"><label>Camada</label><select id="me-camada" onchange="window.meSetCamada(this.value)">' +
                                '<option value="chao">⬇ Chão</option><option value="meio" selected>➡ Meio</option><option value="frente">⬆ Frente</option>' +
                            '</select></div>' +
                        '</div>' +
                        '<div class="me-row">' +
                            '<div class="me-field"><label>Colisão</label><label class="me-chk"><input type="checkbox" id="me-colisao" checked onchange="window.meSetColisao(this.checked)"> Ativa</label></div>' +
                            '<div class="me-field"><label>Efeito</label><select id="me-efeito" onchange="window.meSetEfeito(this.value)"></select></div>' +
                            '<div class="me-field" style="flex:0 0 52px;"><label>Cor</label><input type="color" id="me-efeito-cor" value="#ffd166" oninput="window.meSetEfeitoCor(this.value)"></div>' +
                        '</div>' +
                    '</div>' +

                    '<div id="me-panel-colisao" style="display:none;">' +
                        '<div class="me-toolbar">' +
                            '<button id="me-tool-colocar_colisao" class="me-tool-btn" onclick="window.meSetFerramenta(\'colocar_colisao\')">🖱️ Pintar colisão</button>' +
                            '<button id="me-tool-apagar2" class="me-tool-btn" onclick="window.meSetFerramenta(\'apagar\')">🗑️ Apagar</button>' +
                            '<button id="me-tool-mover2" class="me-tool-btn" onclick="window.meSetFerramenta(\'mover\')">👆 Selecionar</button>' +
                        '</div>' +
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
                        '<div class="me-row">' +
                            '<div class="me-field"><label>Colisão (W)</label><div class="me-steppers"><button class="me-step" onclick="window.meSetWH(\'w\',-10)">−10</button><button class="me-step" onclick="window.meSetWH(\'w\',-1)">−1</button><span id="me-sel-w">—</span><button class="me-step" onclick="window.meSetWH(\'w\',1)">+1</button><button class="me-step" onclick="window.meSetWH(\'w\',10)">+10</button></div></div>' +
                            '<div class="me-field"><label>Colisão (H)</label><div class="me-steppers"><button class="me-step" onclick="window.meSetWH(\'h\',-10)">−10</button><button class="me-step" onclick="window.meSetWH(\'h\',-1)">−1</button><span id="me-sel-h">—</span><button class="me-step" onclick="window.meSetWH(\'h\',1)">+1</button><button class="me-step" onclick="window.meSetWH(\'h\',10)">+10</button></div></div>' +
                            '<div class="me-field"><label>Camada</label><select id="me-sel-camada" onchange="window.meSetSelCamada(this.value)">' +
                                '<option value="chao">⬇ Chão</option><option value="meio">➡ Meio</option><option value="frente">⬆ Frente</option>' +
                            '</select></div>' +
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
                item.onclick = function () { meSelId = o.id; meSel = o; meAtualizarListas(); meAtualizarPropsUI(); };
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
                var badge = o.camada === 'frente' ? '⬆' : (o.camada === 'chao' ? '⬇' : '➡');
                item.innerHTML = '<span>' + badge + '</span>' +
                    '<select onchange="window.meSetSelCamada(this.value, \'' + o.id + '\')" style="background:#171f17;border:1px solid #3a4a3c;color:#ecf0f1;font-size:10px;">' +
                        '<option value="chao"' + (o.camada === 'chao' ? ' selected' : '') + '>Chão</option>' +
                        '<option value="meio"' + (o.camada === 'meio' ? ' selected' : '') + '>Meio</option>' +
                        '<option value="frente"' + (o.camada === 'frente' ? ' selected' : '') + '>Frente</option>' +
                    '</select>' +
                    '<span style="flex:1;">' + (def ? def.icone : '') + ' ' + (def ? def.nome : o.tipo) + '</span>';
                item.onclick = function (e) {
                    if (e.target.tagName === 'SELECT') return;
                    meSelId = o.id; meSel = o; meAtualizarListas(); meAtualizarPropsUI();
                };
                CAM.appendChild(item);
            });
            if (!lista.length) CAM.innerHTML = '<div style="font-size:10px;color:#7f8c8d;padding:4px;text-align:center;">Nenhum objeto neste mapa.</div>';
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
            return;
        }
        panel.classList.add('visible');
        var def = CATALOGO[sel.tipo];
        document.getElementById('me-sel-titulo').textContent = (def ? def.icone + ' ' + def.nome : sel.tipo) + ' (' + sel.mapa + ')';
        document.getElementById('me-sel-pos').textContent = 'X:' + sel.x + '  Y:' + sel.y + '  Colisão: ' + (sel.colisao ? 'SIM' : 'NÃO');
        document.getElementById('me-sel-w').textContent = sel.w || 40;
        document.getElementById('me-sel-h').textContent = sel.h || 40;
        var cam = document.getElementById('me-sel-camada');
        if (cam) cam.value = sel.camada || 'meio';
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
    };

    window.fecharEditorMapa = function () {
        window.mapaEditorAtivo = false;
        meSelId = null; meSel = null;
        meMoverObj = null; mePintando = false;
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

    window.meSetTab = function (tab) {
        window.mapaEditorTab = tab;
        document.getElementById('me-panel-objetos').style.display = tab === 'objetos' ? 'flex' : 'none';
        document.getElementById('me-panel-colisao').style.display = tab === 'colisao' ? 'flex' : 'none';
        document.getElementById('me-panel-camada').style.display = tab === 'camada' ? 'flex' : 'none';
        document.getElementById('me-tab-objetos').classList.toggle('active', tab === 'objetos');
        document.getElementById('me-tab-colisao').classList.toggle('active', tab === 'colisao');
        document.getElementById('me-tab-camada').classList.toggle('active', tab === 'camada');
        if (tab === 'colisao' || tab === 'camada') {
            meSetFerramenta(tab === 'colisao' ? 'colocar_colisao' : 'colocar_frente');
        } else {
            meSetFerramenta('colocar');
        }
        meAtualizarListas();
        meAtualizarPropsUI();
    };

    window.meSetFerramenta = function (f) {
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
        if (b) { b.textContent = '🧲 Grade 20: ' + (meSnap ? 'ON' : 'OFF'); b.classList.toggle('active', meSnap); }
    };

    window.meRandomVariante = function () {
        brush.variante = Math.floor(Math.random() * 4);
        var lb = document.getElementById('me-variante-label');
        if (lb) lb.textContent = brush.variante;
    };

    window.meSetEscala = function (v) {
        brush.escala = Math.max(0.5, Math.min(3, Number(v) || 1));
    };

    window.meSetVariante = function (d) {
        brush.variante = Math.max(0, Math.min(8, brush.variante + d));
        var lb = document.getElementById('me-variante-label');
        if (lb) lb.textContent = brush.variante;
    };

    window.meSetCamada = function (v) {
        var cam = v === 'chao' || v === 'frente' ? v : 'meio';
        brush.camada = cam;
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

    window.meSetSelCamada = function (v, idForcado) {
        var lista = window.mapaObjetos || [];
        var alvo = null;
        if (idForcado) { for (var i = 0; i < lista.length; i++) if (lista[i].id === idForcado) { alvo = lista[i]; break; } }
        else alvo = meSel;
        if (!alvo) return;
        var cam = v === 'chao' || v === 'frente' ? v : 'meio';
        alvo.camada = cam;
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
            global.ws.send(JSON.stringify({ action: 'admin_map_objetos_sync' }));
            meToast('💾 Objetos já são salvos automaticamente no servidor. Sincronizando...');
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
            meToast('🗑️ Mapa ' + mapa + ' limpo!');
        }
    };

    window.meSelecionar = function (id) {
        meSelId = id;
        meAtualizarListas();
        meAtualizarPropsUI();
    };

    window.meExcluir = function (id) {
        if (window.mapaEditorTravado) {
            meToast('🔒 Editor travado — destrave (🔓) antes de apagar.');
            return;
        }
        // Remove imediatamente na tela (otimista) e avisa o servidor.
        // Antes dependia só do broadcast voltar — se o servidor demorasse,
        // o objeto não sumia. Agora some na hora e o servidor confirma depois.
        window.mapaObjetos = (window.mapaObjetos || []).filter(function (o) { return o && o.id !== id; });
        if (global.ws && global.ws.readyState === 1) {
            global.ws.send(JSON.stringify({ action: 'admin_map_objetos_excluir', id: id }));
        }
        if (meSelId === id) { meSelId = null; meSel = null; }
        meAtualizarListas();
        meAtualizarPropsUI();
        meToast('🗑️ Objeto excluído!');
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
        window.mapaObjetos.push(copia);
        meSelId = copia.id; meSel = copia;
        enviar(copia, 'criar');
        meAtualizarListas();
        meAtualizarPropsUI();
    };

    function meAtualizarPainel() {
        // sincroniza seletores do brush com o estado atual
        var cam = document.getElementById('me-camada');
        if (cam) cam.value = brush.camada;
        var ci = document.getElementById('me-colisao');
        if (ci) ci.checked = !!brush.colisao;
        var ef = document.getElementById('me-efeito');
        if (ef) ef.value = brush.efeito || 'nenhum';
        var esc = document.getElementById('me-escala');
        if (esc) esc.value = brush.escala;
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
    meAtualizarPainel();
})(window);