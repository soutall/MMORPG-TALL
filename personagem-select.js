// personagem-select.js — Tela de SELEÇÃO / CRIAÇÃO e gerenciamento de personagens (PC + Mobile).
// O personagem NÃO entra no mundo até o servidor confirmar 'personagem_selecionar'.
// Não altera gameplay: só decide quando o fluxo de login existente é disparado.
(function () {
    'use strict';

    var MAX_SLOTS = 10;
    var HISTORIA_PADRAO = 'História ainda não criada.';
    var FOTO_RETRY = '?v=perfil4';

    // Mesmos retratos já usados pelo HUD (fonte: index.html / imagem/HUD/Perfil)
    var PERFIL_POR_CLASSE = {
        guerreiro: 'Guerreiro', mago: 'Mago', summoner: 'Summoner', arqueiro: 'Arqueira',
        barbaro: 'Barbaro', roqueiro: 'Roqueiro', ladino: 'Ladino', dronemaster: 'DroneMaster',
        arqueiro_arcano: 'Arqueir_astral', arqueiro_astral: 'Arqueir_astral', sniper: 'sniper',
        pikeman: 'PikeMan', curandeiro: 'curandeiro', florim: 'Florim',
        guerreiro_kaledron: 'Kaledron', kaledron: 'Kaledron',
        lord_malakar: 'Malakar'
    };

    var CLASSES = null;
    var telas = { selecao: null, criacao: null };
    var estado = {
        conta: '',
        maximo: MAX_SLOTS,
        personagens: [],
        escolhido: null,
        classeCriacao: null,
        entrouSelecionado: false,
        forcarTrocaClasse: false,
        autoClasse: false,
        aguardandoSelecionar: false,
        aguardandoCriar: false,
        reconexaoPendente: null
    };
    var _timerNome = null;
    var _ultimoNomeVerificado = null;

    // ---------- dados reais do projeto ----------
    function lerClasses() {
        if (CLASSES) return CLASSES;
        var out = [];
        try {
            var cards = document.querySelectorAll('#char-select-screen .class-card');
            for (var i = 0; i < cards.length; i++) {
                var c = cards[i];
                var attr = c.getAttribute('onclick') || '';
                var m = /selecionarClasse\(['"]([^'"]+)['"]\)/.exec(attr);
                if (!m) continue;
                var t = c.querySelector('.title');
                var d = c.querySelector('.desc');
                var ic = c.querySelector('.icon');
                out.push({
                    id: m[1],
                    nome: t ? t.textContent.trim() : m[1],
                    desc: d ? d.textContent.trim() : '',
                    icone: ic ? ic.textContent.trim() : '⚔️',
                    cor: (t && t.style && t.style.color) ? t.style.color : '#f1c40f'
                });
            }
        } catch (e) { out = []; }
        CLASSES = out;
        return out;
    }

    function classeInfo(id) {
        var lista = lerClasses();
        for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
        return { id: id, nome: id || 'Guerreiro', desc: '', icone: '⚔️', cor: '#f1c40f' };
    }

    function skillsIniciais(classe) {
        try {
            if (typeof SKILLS_INFO === 'undefined' || !Array.isArray(SKILLS_INFO[classe])) return [];
            return SKILLS_INFO[classe].slice(0, 4);
        } catch (e) { return []; }
    }

    function historiaDaClasse(classe) {
        var mapa = window.historiasPersonagens || {};
        return mapa[classe] || HISTORIA_PADRAO;
    }

    function retratoUrl(classe) {
        if (!classe) return '';
        var cNorm = String(classe).toLowerCase().trim();
        var nome = PERFIL_POR_CLASSE[cNorm] || PERFIL_POR_CLASSE[classe];
        if (!nome) return '';
        if (cNorm === 'florim') return 'imagem/HUD/Perfil/Frorin.png' + FOTO_RETRY;
        if (cNorm === 'lord_malakar') return 'imagem/HUD/Perfil/Malakar.png' + FOTO_RETRY;
        return 'imagem/HUD/Perfil/' + nome + '.png' + FOTO_RETRY;
    }

    function el(tag, cls, texto) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (texto !== undefined && texto !== null) e.textContent = texto;
        return e;
    }

    function enviar(obj) {
        try {
            if (window.ws && window.ws.readyState === WebSocket.OPEN) window.ws.send(JSON.stringify(obj));
        } catch (e) {}
    }

    // ---------- construção das telas ----------
    function construirTela(tipo) {
        var raiz = el('div', 'ps-tela ps-' + tipo);
        raiz.id = (tipo === 'selecao') ? 'personagem-select-screen' : 'personagem-criar-screen';

        var topo = el('div', 'ps-topo');
        topo.appendChild(el('h1', 'ps-titulo', (tipo === 'selecao') ? 'ESCOLHA SEU PERSONAGEM' : 'CRIAR PERSONAGEM'));
        var sub = el('div', 'ps-conta');
        topo.appendChild(sub);
        raiz.appendChild(topo);

        var corpo = el('div', 'ps-corpo ' + tipo);

        // --- coluna esquerda: lista / classes ---
        var esq = el('div', 'ps-col ps-esq');
        corpo.appendChild(esq);

        // --- centro: apresentação + informações + skills ---
        var meio = el('div', 'ps-col ps-meio');
        corpo.appendChild(meio);

        // --- direita: história ---
        var dir = el('div', 'ps-col ps-dir');
        dir.appendChild(el('div', 'ps-dir-titulo', 'HISTÓRIA DO PERSONAGEM'));
        var hist = el('div', 'ps-historia');
        dir.appendChild(hist);
        corpo.appendChild(dir);

        raiz.appendChild(corpo);

        var rodape = el('div', 'ps-rodape');
        raiz.appendChild(rodape);

        raiz._refs = { topo: topo, sub: sub, corpo: corpo, esq: esq, meio: meio, dir: dir, historia: hist, rodape: rodape };
        return raiz;
    }

    function garantirTelas() {
        if (!telas.selecao) {
            telas.selecao = construirTela('selecao');
            document.body.appendChild(telas.selecao);
        }
        if (!telas.criacao) {
            telas.criacao = construirTela('criacao');
            document.body.appendChild(telas.criacao);
        }
    }

    // ---------- coluna esquerda: personagens existentes ----------
    function renderizarLista() {
        var r = telas.selecao._refs;
        r.esq.innerHTML = '';
        r.esq.appendChild(el('div', 'ps-esq-titulo', 'SEUS PERSONAGENS'));

        var total = Math.max(estado.maximo, MAX_SLOTS);
        for (var i = 0; i < total; i++) {
            var p = estado.personagens[i];
            if (p) {
                var item = el('button', 'ps-item' + (estado.escolhido === p.personagem ? ' ativo' : ''));
                item.type = 'button';
                var foto = el('img', 'ps-item-foto');
                foto.src = retratoUrl(p.classe);
                foto.alt = '';
                item.appendChild(foto);
                var meta = el('div', 'ps-item-meta');
                meta.appendChild(el('div', 'ps-item-nome', p.personagem));
                var inf = el('div', 'ps-item-info');
                inf.appendChild(el('span', 'ps-item-classe', classeInfo(p.classe).nome));
                inf.appendChild(el('span', 'ps-item-level', 'Nv ' + (p.level || 1)));
                meta.appendChild(inf);
                item.appendChild(meta);
                (function (nome) {
                    item.addEventListener('click', function () { selecionarPersonagem(nome); });
                    item.addEventListener('dblclick', function () { entrarNoMundo(); });
                })(p.personagem);
                r.esq.appendChild(item);
            } else {
                var slot = el('button', 'ps-item ps-slot-vazio');
                slot.type = 'button';
                slot.appendChild(el('span', 'ps-slot-mais', '+'));
                slot.appendChild(el('span', 'ps-slot-texto', 'CRIAR PERSONAGEM'));
                slot.addEventListener('click', function () { abrirCriacao(); });
                r.esq.appendChild(slot);
            }
        }
    }

    // ---------- centro: retrato + informações + 4 primeiras skills ----------
    // Mesmo critério do CSS: celular na horizontal → 3 colunas compactas, sem scroll.
    var QUERY_COMPACTA = '(max-width: 1280px) and (max-height: 640px) and (orientation: landscape)';

    function ehCompacto() {
        try { return !!(window.matchMedia && window.matchMedia(QUERY_COMPACTA).matches); }
        catch (e) { return false; }
    }

    function criarInfoBox(classe) {
        var infoBox = el('div', 'ps-info-box');
        infoBox.appendChild(el('div', 'ps-info-titulo', 'INFORMAÇÕES DA CLASSE'));
        var linha = el('div', 'ps-info-linha');
        linha.appendChild(el('span', 'ps-info-icone', classeInfo(classe).icone));
        var txt = el('div', 'ps-info-texto');
        txt.appendChild(el('div', 'ps-info-nome', classeInfo(classe).nome));
        txt.appendChild(el('div', 'ps-info-desc', classeInfo(classe).desc));
        linha.appendChild(txt);
        infoBox.appendChild(linha);
        return infoBox;
    }

    function criarSkillsBox(classe) {
        var skills = skillsIniciais(classe);
        if (!skills.length) return null;
        var box = el('div', 'ps-skills');
        box.appendChild(el('div', 'ps-skills-titulo', 'PRIMEIRAS SKILLS'));
        for (var i = 0; i < skills.length; i++) {
            var s = skills[i];
            var linhaS = el('div', 'ps-skill');
            var cabec = el('div', 'ps-skill-topo');
            cabec.appendChild(el('span', 'ps-skill-icone', s.icon || '•'));
            cabec.appendChild(el('span', 'ps-skill-nome', s.nome || s.id || ''));
            var custo = [];
            if (s.mp) custo.push(s.mp + ' MP');
            if (s.cd) custo.push('CD ' + s.cd + 's');
            if (custo.length) cabec.appendChild(el('span', 'ps-skill-custo', custo.join(' · ')));
            linhaS.appendChild(cabec);
            if (s.desc) linhaS.appendChild(el('div', 'ps-skill-desc', s.desc));
            box.appendChild(linhaS);
        }
        return box;
    }

    // Coluna da direita: no celular compacto, INFORMAÇÕES + skills vão para cá;
    // no desktop continuam no centro e a direita fica só com a HISTÓRIA.
    function preencherDir(refs, classe) {
        refs.dir.innerHTML = '';
        if (classe && ehCompacto()) {
            refs.dir.appendChild(criarInfoBox(classe));
            var sk = criarSkillsBox(classe);
            if (sk) refs.dir.appendChild(sk);
        }
        refs.dir.appendChild(el('div', 'ps-dir-titulo', 'HISTÓRIA DO PERSONAGEM'));
        refs.dir.appendChild(el('div', 'ps-historia', historiaDaClasse(classe)));
    }

    function renderizarMeio(alvo, classe, opcoes) {
        opcoes = opcoes || {};
        alvo.innerHTML = '';

        var palco = el('div', 'ps-palco');
        var sombra = el('div', 'ps-palco-sombra');
        var img = el('img', 'ps-retrato');
        img.src = retratoUrl(classe);
        img.alt = classeInfo(classe).nome;
        palco.appendChild(sombra);
        palco.appendChild(img);
        alvo.appendChild(palco);

        if (opcoes.nome) alvo.appendChild(el('div', 'ps-nome', opcoes.nome));

        var info = el('div', 'ps-classe-linha');
        info.appendChild(el('span', 'ps-classe-icone', classeInfo(classe).icone));
        var nomeClasse = el('span', 'ps-classe-nome', classeInfo(classe).nome);
        nomeClasse.style.color = classeInfo(classe).cor;
        info.appendChild(nomeClasse);
        alvo.appendChild(info);

        alvo.appendChild(el('div', 'ps-classe-desc', classeInfo(classe).desc));

        if (opcoes.level) alvo.appendChild(el('div', 'ps-level', 'Nível ' + opcoes.level));

        if (opcoes.incluiInfo !== false) {
            alvo.appendChild(criarInfoBox(classe));
            var boxSkills = criarSkillsBox(classe);
            if (boxSkills) alvo.appendChild(boxSkills);
        }

        if (opcoes.botoes) {
            var acoes = el('div', 'ps-acoes');
            for (var b = 0; b < opcoes.botoes.length; b++) (function (def) {
                var btn = el('button', 'ps-botao ' + (def.cls || ''), def.rotulo);
                btn.type = 'button';
                btn.addEventListener('click', def.ao);
                acoes.appendChild(btn);
            })(opcoes.botoes[b]);
            alvo.appendChild(acoes);
        }
    }

    function renderizarCentroSelecao() {
        var r = telas.selecao._refs;
        var p = null;
        for (var i = 0; i < estado.personagens.length; i++) {
            if (estado.personagens[i].personagem === estado.escolhido) p = estado.personagens[i];
        }
        if (!p) {
            r.meio.innerHTML = '';
            var aviso = el('div', 'ps-vazio');
            aviso.appendChild(el('div', 'ps-vazio-titulo', estado.personagens.length ? 'Selecione um personagem' : 'Nenhum personagem ainda'));
            aviso.appendChild(el('div', 'ps-vazio-texto', estado.personagens.length
                ? 'Escolha um personagem na lista ao lado para entrar.'
                : 'Clique em um dos slots para criar seu primeiro personagem.'));
            r.meio.appendChild(aviso);
            preencherDir(r, null);
            return;
        }
        renderizarMeio(r.meio, p.classe, {
            nome: p.personagem,
            level: p.level || 1,
            incluiInfo: !ehCompacto(),
            botoes: [
                { rotulo: 'ENTRAR NO MUNDO', cls: 'primario', ao: entrarNoMundo },
                { rotulo: 'TROCAR CLASSE', cls: 'secundario', ao: function () { estado.forcarTrocaClasse = true; entrarNoMundo(); } },
                { rotulo: 'EXCLUIR', cls: 'perigo', ao: function () { excluirPersonagem(p.personagem); } }
            ]
        });
        preencherDir(r, p.classe);
    }

    function renderizarCentroCriacao() {
        var r = telas.criacao._refs;
        var classe = estado.classeCriacao || (lerClasses()[0] || {}).id || 'guerreiro';
        renderizarMeio(r.meio, classe, { incluiInfo: !ehCompacto() });
        preencherDir(r, classe);

        var form = el('div', 'ps-form');
        form.appendChild(el('label', 'ps-label', 'NOME DO PERSONAGEM'));
        var campo = el('input', 'ps-input');
        campo.type = 'text';
        campo.id = 'ps-input-nome';
        campo.maxLength = 16;
        campo.placeholder = 'Ex: Aranha_01';
        campo.autocomplete = 'off';
        form.appendChild(campo);
        var msg = el('div', 'ps-msg');
        msg.id = 'ps-msg-nome';
        form.appendChild(msg);

        var botoes = el('div', 'ps-acoes');
        var btnCriar = el('button', 'ps-botao primario', 'CRIAR');
        btnCriar.type = 'button';
        btnCriar.id = 'ps-btn-criar';
        btnCriar.addEventListener('click', confirmarCriacao);
        var btnVoltar = el('button', 'ps-botao secundario', 'VOLTAR');
        btnVoltar.type = 'button';
        btnVoltar.addEventListener('click', fecharCriacao);
        botoes.appendChild(btnCriar);
        botoes.appendChild(btnVoltar);
        form.appendChild(botoes);
        r.meio.appendChild(form);

        campo.addEventListener('input', agendarVerificacaoDeNome);
        campo.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') confirmarCriacao();
        });
    }

    function renderizarClassesCriacao() {
        var r = telas.criacao._refs;
        r.esq.innerHTML = '';
        r.esq.appendChild(el('div', 'ps-esq-titulo', 'ESCOLHA A CLASSE'));
        var grid = el('div', 'ps-classes');
        var classes = lerClasses();
        for (var i = 0; i < classes.length; i++) (function (c) {
            var card = el('button', 'ps-classe-card' + (estado.classeCriacao === c.id ? ' ativo' : ''));
            card.type = 'button';
            card.style.setProperty('--cor', c.cor);
            card.appendChild(el('div', 'ps-classe-card-icone', c.icone));
            card.appendChild(el('div', 'ps-classe-card-nome', c.nome));
            card.appendChild(el('div', 'ps-classe-card-desc', c.desc));
            card.addEventListener('click', function () {
                estado.classeCriacao = c.id;
                renderizarClassesCriacao();
                renderizarCentroCriacao();
            });
            grid.appendChild(card);
        })(classes[i]);
        r.esq.appendChild(grid);
    }

    function renderizarRodape(tela, comSair) {
        var r = tela._refs;
        r.rodape.innerHTML = '';
        if (comSair) {
            var sair = el('button', 'ps-botao sair', 'SAIR DO JOGO');
            sair.type = 'button';
            sair.addEventListener('click', sairDoJogo);
            r.rodape.appendChild(sair);
        }
    }

    // ---------- ações ----------
    function selecionarPersonagem(nome) {
        estado.escolhido = nome;
        renderizarLista();
        renderizarCentroSelecao();
    }

    function entrarNoMundo() {
        if (!estado.escolhido) return;
        estado.aguardandoSelecionar = true;
        estado.entrouSelecionado = true;
        enviar({ action: 'personagem_selecionar', personagem: estado.escolhido });
    }

    function abrirCriacao() {
        if (estado.personagens.length >= estado.maximo) {
            alert('Limite de personagens atingido.');
            return;
        }
        var classes = lerClasses();
        estado.classeCriacao = estado.classeCriacao || (classes[0] || {}).id || 'guerreiro';
        telas.selecao.style.display = 'none';
        renderizarClassesCriacao();
        renderizarCentroCriacao();
        renderizarRodape(telas.criacao, true);
        telas.criacao.style.display = 'flex';
        // Sem foco automático: no celular isso abria o teclado sozinho ao entrar
        // na tela de criação. O campo só recebe foco quando o jogador toca nele.
    }

    function fecharCriacao() {
        telas.criacao.style.display = 'none';
        limparMensagemNome();
        telas.selecao.style.display = 'flex';
    }

    function agendarVerificacaoDeNome() {
        var campo = document.getElementById('ps-input-nome');
        if (!campo) return;
        if (_timerNome) clearTimeout(_timerNome);
        var valor = campo.value;
        limparMensagemNome();
        if (!valor) return;
        _timerNome = setTimeout(function () {
            _ultimoNomeVerificado = valor;
            enviar({ action: 'personagem_verificar_nome', personagem: valor });
        }, 400);
    }

    function limparMensagemNome() {
        var msg = document.getElementById('ps-msg-nome');
        if (msg) { msg.textContent = ''; msg.className = 'ps-msg'; }
        _ultimoNomeVerificado = null;
    }

    function mostrarMensagemNome(texto, ok) {
        var msg = document.getElementById('ps-msg-nome');
        if (!msg) return;
        msg.textContent = texto || '';
        msg.className = 'ps-msg' + (texto ? (ok ? ' ok' : ' erro') : '');
    }

    function confirmarCriacao() {
        var campo = document.getElementById('ps-input-nome');
        if (!campo) return;
        var nome = campo.value;
        if (!nome || !nome.trim()) { mostrarMensagemNome('Contem Caracteres proibido ou inapropriados', false); return; }
        if (estado.aguardandoCriar) return;
        estado.aguardandoCriar = true;
        if (_timerNome) clearTimeout(_timerNome);
        enviar({ action: 'personagem_criar', personagem: nome, classe: estado.classeCriacao });
    }

    function excluirPersonagem(nome) {
        if (!nome) return;
        if (!confirm('Excluir o personagem "' + nome + '"?\n\nO personagem será movido para a pasta "Char deletados".')) return;
        enviar({ action: 'personagem_deletar', personagem: nome });
    }

    function sairDoJogo() {
        try { if (window.ws) window.ws.close(); } catch (e) {}
        window.jogoIniciado = false;
        window.bgmLiberado = false;
        estado.conta = '';
        estado.personagens = [];
        estado.escolhido = null;
        estado.entrouSelecionado = false;
        estado.forcarTrocaClasse = false;
        fecharTudo();
        var login = document.getElementById('login-screen');
        if (login) login.style.display = 'flex';
        // Sem foco automático no campo de ID: no celular o teclado abria sozinho
        // ao voltar para o login. Só abre ao tocar no campo.
    }

    function fecharTudo() {
        garantirTelas();
        telas.selecao.style.display = 'none';
        telas.criacao.style.display = 'none';
    }

    function abrirSelecao() {
        garantirTelas();
        telas.criacao.style.display = 'none';
        renderizarLista();
        renderizarCentroSelecao();
        renderizarRodape(telas.selecao, true);
        telas.selecao._refs.sub.textContent = estado.conta ? ('Conta: ' + estado.conta) : '';
        telas.selecao.style.display = 'flex';
    }

    // ---------- mensagens do servidor ----------
    function aoReceber(dados) {
        if (!dados || !dados.type) return;

        if (dados.type === 'personagens_lista') {
            garantirTelas();
            estado.conta = dados.conta || estado.conta;
            estado.maximo = dados.maximo || MAX_SLOTS;
            estado.personagens = Array.isArray(dados.personagens) ? dados.personagens : [];
            if (estado.reconexaoPendente) {
                var personagemReconectado = estado.personagens.find(function (p) {
                    return p.personagem === estado.reconexaoPendente;
                });
                var nomeReconectado = estado.reconexaoPendente;
                estado.reconexaoPendente = null;
                if (personagemReconectado) {
                    estado.escolhido = nomeReconectado;
                    estado.aguardandoSelecionar = true;
                    estado.entrouSelecionado = true;
                    enviar({ action: 'personagem_selecionar', personagem: nomeReconectado });
                    fecharTudo();
                    return;
                }
            }
            if (!estado.escolhido || !estado.personagens.some(function (p) { return p.personagem === estado.escolhido; })) {
                estado.escolhido = estado.personagens.length ? estado.personagens[0].personagem : null;
            }
            estado.aguardandoSelecionar = false;
            estado.aguardandoCriar = false;
            var login = document.getElementById('login-screen');
            if (login) login.style.display = 'none';
            abrirSelecao();
            return;
        }

        if (dados.type === 'personagem_nome_status') {
            if (!dados.personagem || dados.personagem === _ultimoNomeVerificado) {
                if (dados.disponivel) mostrarMensagemNome('Nome disponível', true);
                else mostrarMensagemNome(dados.mensagem || 'Nome já Utilizado', false);
            }
            return;
        }

        if (dados.type === 'personagem_criado') {
            estado.aguardandoCriar = false;
            if (dados.ok) {
                estado.escolhido = dados.personagem;
                estado.classeCriacao = dados.classe;
                estado.aguardandoSelecionar = true;
                estado.entrouSelecionado = true;
                enviar({ action: 'personagem_selecionar', personagem: dados.personagem });
            } else {
                mostrarMensagemNome(dados.mensagem || 'Erro ao criar o personagem.', false);
                var b = document.getElementById('ps-btn-criar');
                if (b) b.disabled = false;
            }
            return;
        }

        if (dados.type === 'personagem_deletado') {
            if (!dados.ok) {
                alert(dados.mensagem || 'Erro ao excluir o personagem.');
            } else if (estado.escolhido === dados.personagem) {
                estado.escolhido = null;
            }
            return;
        }

        if (dados.type === 'personagem_selecionar_erro') {
            estado.aguardandoSelecionar = false;
            estado.entrouSelecionado = false;
            alert(dados.mensagem || 'Erro ao entrar com o personagem.');
            return;
        }

        if (dados.type === 'login_erro') {
            estado.entrouSelecionado = false;
            alert(dados.mensagem || 'Erro ao entrar.');
            return;
        }
    }

    // ---------- integração com o fluxo existente do index.html ----------
    function tratarInit() {
        fecharTudo();
        // Ainda não está no mundo: só 'selecionarClasse' libera o input do jogo.
        window.jogoIniciado = false;
        estado.autoClasse = !!(estado.entrouSelecionado && !estado.forcarTrocaClasse);
        estado.entrouSelecionado = false;
        estado.forcarTrocaClasse = false;
        estado.aguardandoSelecionar = false;
    }

    function autoEntrarComClasse() {
        var v = estado.autoClasse;
        estado.autoClasse = false;
        return v;
    }

    function prepararReconexao(nome) {
        estado.reconexaoPendente = (typeof nome === 'string' && nome.trim()) ? nome.trim() : null;
    }

    garantirTelas();

    // Gira entre PC (3 colunas com história à direita) e celular horizontal
    // compacto (lista · foto · informações) re-renderizando a tela visível.
    function rerenderizarTelaAtiva() {
        garantirTelas();
        if (telas.criacao.style.display === 'flex') {
            renderizarClassesCriacao();
            renderizarCentroCriacao();
            renderizarRodape(telas.criacao, true);
        } else if (telas.selecao.style.display === 'flex') {
            renderizarLista();
            renderizarCentroSelecao();
            renderizarRodape(telas.selecao, true);
        }
    }

    try {
        if (window.matchMedia) {
            var mqCompacta = window.matchMedia(QUERY_COMPACTA);
            var aoMudar = function () { rerenderizarTelaAtiva(); };
            if (mqCompacta.addEventListener) mqCompacta.addEventListener('change', aoMudar);
            else if (mqCompacta.addListener) mqCompacta.addListener(aoMudar);
        }
    } catch (e) {}

    window.PersonagemSelect = {
        onMessage: aoReceber,
        tratarInit: tratarInit,
        autoEntrarComClasse: autoEntrarComClasse,
        prepararReconexao: prepararReconexao
    };
})();
