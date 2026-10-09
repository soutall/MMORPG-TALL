(function (global) {
    'use strict';

    var products = {
        hp: { nome: 'Poção de Vida I', subtipo: 'pocao_hp', icone: 'HP-lvl1.png', preco: 10 },
        mp: { nome: 'Poção de Mana I', subtipo: 'pocao_mp', icone: 'MP-lvl1.png', preco: 50 }
    };
    var aberto = false;
    var comprando = false;
    var checagemProximidade = null;
    var quantidades = { hp: 0, mp: 0 };
    var itensLoja = [];

    global.zeniaShopAberto = false;

    function ensureWindow() {
        var style = document.getElementById('zenia-shop-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'zenia-shop-style';
            style.textContent = [
                '#zenia-shop-screen{display:none;position:fixed;inset:0;z-index:200100;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.72);font:15px Segoe UI,Arial,sans-serif;color:#eff8ff}',
                '#zenia-shop-screen.ativo{display:flex}',
                '#zenia-shop-window{width:min(760px,96vw);max-height:90vh;overflow:auto;padding:16px;border:2px solid #7de5b1;border-radius:12px;background:linear-gradient(160deg,#172620,#0a1210);box-shadow:0 12px 40px #000c}',
                '.zenia-shop-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;color:#b7f7d7;font-size:21px;font-weight:900}',
                '.zenia-shop-close{width:40px;height:40px;border:1px solid #527766;border-radius:7px;background:#14241d;color:white;font-size:22px;cursor:pointer}',
                '.zenia-shop-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
                '.zenia-shop-panel{min-width:0;padding:12px;border:1px solid #354e43;border-radius:9px;background:rgba(5,12,9,.58)}',
                '.zenia-shop-panel h3{margin:0 0 10px;color:#b7f7d7;font-size:16px}',
                '.zenia-shop-product,.zenia-shop-cart-item{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:10px;margin:7px 0;padding:9px;border:1px solid #344c3f;border-radius:8px;background:#101a15}',
                '.zenia-shop-product img,.zenia-shop-cart-item img{width:44px;height:44px;object-fit:contain;image-rendering:pixelated}',
                '.zenia-shop-product-name{font-weight:800}.zenia-shop-price{margin-top:3px;color:#f3d875;font-size:13px}',
                '.zenia-shop-quantity{width:76px;min-height:40px;padding:5px;border:1px solid #567263;border-radius:6px;background:#0b120e;color:#fff;text-align:center;font-size:16px}',
                '.zenia-shop-cart{min-height:100px}.zenia-shop-empty{padding:14px 4px;color:#aab8b0;text-align:center}',
                '.zenia-shop-cart-item{grid-template-columns:40px minmax(0,1fr) auto}.zenia-shop-cart-item img{width:36px;height:36px}',
                '.zenia-shop-cart-item button{width:30px;height:30px;margin-left:4px;border:1px solid #567263;border-radius:5px;background:#18271f;color:#eafff1;font-size:17px;cursor:pointer}',
                '.zenia-shop-total{display:flex;justify-content:space-between;gap:10px;margin-top:12px;padding:11px 4px;border-top:1px solid #455c4c;font-weight:800}',
                '.zenia-shop-total strong{color:#f3d875}.zenia-shop-status{min-height:20px;margin:5px 0;color:#a7f3d0;font-size:13px}',
                '.zenia-shop-status.erro{color:#ff9292}.zenia-shop-buy{width:100%;min-height:46px;margin-top:7px;border:1px solid #88e8b1;border-radius:8px;background:linear-gradient(#31965e,#216840);color:white;font-weight:900;font-size:16px;cursor:pointer}',
                '.zenia-shop-buy:disabled{opacity:.5;cursor:not-allowed}',
                '@media(max-width:620px){#zenia-shop-screen{padding:8px}#zenia-shop-window{width:100%;max-height:92vh;padding:11px}.zenia-shop-columns{grid-template-columns:1fr;gap:8px}.zenia-shop-panel{padding:9px}.zenia-shop-header{font-size:18px}}'
            ].join('');
            document.head.appendChild(style);
        }
        var screen = document.getElementById('zenia-shop-screen');
        if (screen) return screen;

        screen = document.createElement('div');
        screen.id = 'zenia-shop-screen';
        screen.dataset.ui = 'true';
        screen.innerHTML = [
            '<section id="zenia-shop-window" role="dialog" aria-modal="true" aria-labelledby="zenia-shop-title">',
            '<header class="zenia-shop-header"><span id="zenia-shop-title">Zenia — Loja de Poções</span><button class="zenia-shop-close" type="button" aria-label="Fechar">×</button></header>',
            '<div class="zenia-shop-columns">',
            '<section class="zenia-shop-panel"><h3>Poções disponíveis</h3><div class="zenia-shop-products"></div></section>',
            '<section class="zenia-shop-panel"><h3>Itens selecionados</h3><div class="zenia-shop-cart"></div>',
            '<div class="zenia-shop-total"><span>Total: <strong class="zenia-shop-total-value">0 Gold</strong></span><span>Saldo: <strong class="zenia-shop-balance">0 Gold</strong></span></div>',
            '<div class="zenia-shop-status" role="status" aria-live="polite"></div><button class="zenia-shop-buy" type="button">Comprar selecionados</button>',
            '</section></div></section>'
        ].join('');
        document.body.appendChild(screen);
        screen.querySelector('.zenia-shop-close').addEventListener('click', fechar);
        screen.querySelector('.zenia-shop-buy').addEventListener('click', comprar);
        screen.addEventListener('pointerdown', function (event) {
            if (event.target === screen) fechar();
        });
        screen.querySelector('.zenia-shop-products').addEventListener('input', function (event) {
            var input = event.target.closest('[data-shop-quantity]');
            if (!input) return;
            var id = input.dataset.shopQuantity;
            var quantity = normalizarQuantidade(input.value);
            if (quantity === null) {
                input.value = String(quantidades[id] || 0);
                definirStatus('Use uma quantidade inteira entre 0 e 100.', true);
                return;
            }
            quantidades[id] = quantity;
            input.value = String(quantidades[id]);
            definirStatus('', false);
            renderizarCarrinho();
        });
        screen.querySelector('.zenia-shop-cart').addEventListener('click', function (event) {
            var button = event.target.closest('[data-shop-change]');
            if (!button) return;
            var id = button.dataset.shopItem;
            var change = Number(button.dataset.shopChange);
            quantidades[id] = Math.max(0, Math.min(100, quantidades[id] + change));
            atualizarControles();
            renderizarCarrinho();
        });
        global.addEventListener('keydown', function (event) {
            if (aberto && event.key === 'Escape') fechar();
        });
        return screen;
    }

    function normalizarQuantidade(value) {
        var quantity = value === '' ? 0 : Number(value);
        if (!Number.isInteger(quantity)) return null;
        return Math.max(0, Math.min(100, quantity));
    }

    function listarProdutos() {
        var screen = ensureWindow();
        var container = screen.querySelector('.zenia-shop-products');
        container.textContent = '';
        itensLoja.forEach(function (item) {
            var product = products[item.id];
            if (!product) return;
            var row = document.createElement('div');
            row.className = 'zenia-shop-product';
            var image = document.createElement('img');
            image.src = 'sprites/Objetos/icones/' + product.icone;
            image.alt = '';
            var details = document.createElement('div');
            var name = document.createElement('div');
            name.className = 'zenia-shop-product-name';
            name.textContent = item.nome || product.nome;
            var price = document.createElement('div');
            price.className = 'zenia-shop-price';
            price.textContent = String(item.preco) + ' Gold cada';
            details.appendChild(name);
            details.appendChild(price);
            var input = document.createElement('input');
            input.className = 'zenia-shop-quantity';
            input.type = 'number';
            input.min = '0';
            input.max = '100';
            input.step = '1';
            input.value = String(quantidades[item.id] || 0);
            input.setAttribute('aria-label', 'Quantidade de ' + (item.nome || product.nome));
            input.dataset.shopQuantity = item.id;
            row.appendChild(image);
            row.appendChild(details);
            row.appendChild(input);
            container.appendChild(row);
        });
    }

    function renderizarCarrinho() {
        var screen = ensureWindow();
        var cart = screen.querySelector('.zenia-shop-cart');
        cart.textContent = '';
        var selecionados = itensLoja.filter(function (item) {
            return quantidades[item.id] > 0 && products[item.id];
        });
        if (!selecionados.length) {
            var empty = document.createElement('div');
            empty.className = 'zenia-shop-empty';
            empty.textContent = 'Selecione poções no painel ao lado.';
            cart.appendChild(empty);
        }
        var total = 0;
        selecionados.forEach(function (item) {
            var product = products[item.id];
            var quantity = quantidades[item.id];
            total += quantity * item.preco;
            var row = document.createElement('div');
            row.className = 'zenia-shop-cart-item';
            var image = document.createElement('img');
            image.src = 'sprites/Objetos/icones/' + product.icone;
            image.alt = '';
            var label = document.createElement('span');
            label.textContent = (item.nome || product.nome) + ' × ' + quantity;
            var controls = document.createElement('span');
            [-1, 1].forEach(function (delta) {
                var button = document.createElement('button');
                button.type = 'button';
                button.textContent = delta < 0 ? '−' : '+';
                button.setAttribute('aria-label', (delta < 0 ? 'Remover uma' : 'Adicionar uma') + ' ' + product.nome);
                button.dataset.shopChange = String(delta);
                button.dataset.shopItem = item.id;
                controls.appendChild(button);
            });
            row.appendChild(image);
            row.appendChild(label);
            row.appendChild(controls);
            cart.appendChild(row);
        });
        screen.querySelector('.zenia-shop-total-value').textContent = total + ' Gold';
        screen.querySelector('.zenia-shop-balance').textContent = (Number(global.meuOuro) || 0) + ' Gold';
        screen.querySelector('.zenia-shop-buy').disabled = comprando || total <= 0;
    }

    function atualizarControles() {
        var screen = ensureWindow();
        screen.querySelectorAll('[data-shop-quantity]').forEach(function (input) {
            input.value = String(quantidades[input.dataset.shopQuantity] || 0);
        });
    }

    function definirStatus(text, erro) {
        var status = ensureWindow().querySelector('.zenia-shop-status');
        status.textContent = text;
        status.classList.toggle('erro', !!erro);
    }

    function abrir(items) {
        if (global.estaMorto) return;
        var npc = (global.npcsInterativos || []).find(function (entry) {
            return entry && entry.id === 'zenia_pocoes';
        });
        if (!npc || (typeof global.requerProximidade === 'function' &&
                !global.requerProximidade(npc.x, npc.y, 130))) {
            if (typeof global.avisoProximidade === 'function') global.avisoProximidade();
            return;
        }
        itensLoja = Array.isArray(items) ? items.filter(function (item) {
            return item && products[item.id] &&
                item.preco === products[item.id].preco &&
                item.subtipo === products[item.id].subtipo &&
                item.nivel === 1;
        }) : [];
        if (!itensLoja.length) {
            console.error('A Zenia não enviou uma lista válida de produtos.');
            return;
        }
        if (global.ferreiroAberto && typeof global.fecharFerreiro === 'function') global.fecharFerreiro();
        quantidades = { hp: 0, mp: 0 };
        comprando = false;
        aberto = true;
        var screen = ensureWindow();
        screen.classList.add('ativo');
        global.zeniaShopAberto = true;
        listarProdutos();
        definirStatus('', false);
        renderizarCarrinho();
        if (checagemProximidade) global.clearInterval(checagemProximidade);
        checagemProximidade = global.setInterval(function () {
            var npcAtual = (global.npcsInterativos || []).find(function (entry) {
                return entry && entry.id === 'zenia_pocoes';
            });
            if (global.estaMorto || !npcAtual ||
                (typeof global.requerProximidade === 'function' &&
                    !global.requerProximidade(npcAtual.x, npcAtual.y, 160))) {
                fechar();
            }
        }, 600);
    }

    function fechar() {
        aberto = false;
        global.zeniaShopAberto = false;
        if (checagemProximidade) {
            global.clearInterval(checagemProximidade);
            checagemProximidade = null;
        }
        var screen = document.getElementById('zenia-shop-screen');
        if (screen) screen.classList.remove('ativo');
    }

    function comprar() {
        if (!aberto || comprando) return;
        var socket = global.ws;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            definirStatus('Sem conexão com o servidor. Tente novamente.', true);
            return;
        }
        if (!quantidades.hp && !quantidades.mp) {
            definirStatus('Selecione pelo menos uma poção.', true);
            return;
        }
        var transactionId = global.crypto && typeof global.crypto.randomUUID === 'function'
            ? global.crypto.randomUUID()
            : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        comprando = true;
        renderizarCarrinho();
        definirStatus('Processando compra…', false);
        socket.send(JSON.stringify({
            action: 'zenia_shop_buy',
            transactionId: transactionId,
            quantidades: { hp: quantidades.hp, mp: quantidades.mp }
        }));
    }

    function handleMessage(message) {
        if (!message) return;
        if (message.type === 'npc_service_open' &&
            message.npcId === 'zenia_pocoes' && message.service === 'potion_shop') {
            abrir(message.items);
            return;
        }
        if (message.type === 'zenia_shop_error') {
            comprando = false;
            definirStatus(message.motivo || 'A compra foi recusada.', true);
            renderizarCarrinho();
            return;
        }
        if (message.type === 'zenia_shop_purchase_result') {
            comprando = false;
            quantidades = { hp: 0, mp: 0 };
            atualizarControles();
            if (message.ouro !== undefined) {
                global.meuOuro = message.ouro;
                if (typeof global.atualizarHudOuro === 'function') global.atualizarHudOuro();
            }
            var total = Number(message.total) || 0;
            definirStatus('Compra concluída. ' + total + ' Gold descontados.', false);
            renderizarCarrinho();
        }
    }

    global.ZeniaShop = { handleMessage: handleMessage, fechar: fechar };
})(window);
