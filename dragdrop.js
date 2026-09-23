/* =====================================================================
   SISTEMA DE INTERFACE DRAG & DROP (v1.24.0) — client-side
   - Arrastrar ítem da mochila → slot do corpo (equipar)
   - Arrastrar slot equipado → mochila (desequipar)
   - Arrastrar ítem da mochila sobre outro (reordenar persistente)
   - Janelas arrastrables (inventário, skills, status, config, mapa, teleporte)
   - Posição das janelas persistida em localStorage
   Cargado APÓS inventario.js no index.html.
   ===================================================================== */
(function () {
    "use strict";

    var UMBRAL = 10;               // px de movimento para distinguir click de arrastre
    var PREF = "mmorpg_jv_win_";   // prefijo localStorage das janelas (fallback legado)

    // ID do herói SEMPRE por personagem (nunca "anonimo" quando existe identidade).
    function idDoJogador() {
        var uid = window.meuId;
        if (!uid) {
            try { uid = localStorage.getItem("mmorpg_user_id"); } catch (e) {}
        }
        if (!uid) return "";
        return String(uid).replace(/[^a-zA-Z0-9_.-]/g, "").substring(0, 64);
    }

    // Chaves das janelas agora são POR DISPOSITIVO (pc/mobile).
    function chaveJanela(id) {
        var u = idDoJogador();
        var dev = dispositivo();
        if (u) return "mmorpg_jv_win_" + u + "_" + dev + "_" + id;
        return PREF + dev + "_" + id;
    }

    // Chaves legadas (sem sufixo de dispositivo) usadas na migração.
    function chaveJanelaLegadas(id) {
        var u = idDoJogador();
        var chaves = [PREF + id];
        if (u) chaves.push("mmorpg_jv_win_" + u + "_" + id);
        return chaves;
    }

    function removerTodasChavesJanela(id) {
        var u = idDoJogador();
        try { localStorage.removeItem(chaveJanela(id)); } catch (e) { }
        if (u) {
            try { localStorage.removeItem("mmorpg_jv_win_" + u + "_pc_" + id); } catch (e) { }
            try { localStorage.removeItem("mmorpg_jv_win_" + u + "_mobile_" + id); } catch (e) { }
            try { localStorage.removeItem("mmorpg_jv_win_" + u + "_" + id); } catch (e) { }
        } else {
            try { localStorage.removeItem(PREF + "pc_" + id); } catch (e) { }
            try { localStorage.removeItem(PREF + "mobile_" + id); } catch (e) { }
        }
        try { localStorage.removeItem(PREF + id); } catch (e) { }
    }

    var arrastro = null;           // estado atual do arrastre
    var clickSuprimidoHasta = 0;

    function clampPosElemento(config) {
        var x = Number(config.x) || 0;
        var y = Number(config.y) || 0;
        var width = Number(config.width) || 0;
        var height = Number(config.height) || 0;
        var viewportWidth = Number(config.viewportWidth) || window.innerWidth || 0;
        var viewportHeight = Number(config.viewportHeight) || window.innerHeight || 0;
        var maxX = Math.max(0, viewportWidth - width);
        var maxY = Math.max(0, viewportHeight - height);
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));
        return { x: x, y: y };
    }

    function buscarMochila(id) {
        if (!window.mochila) return null;
        return window.mochila.find(function (i) { return String(i.id) === String(id); });
    }

    function slotOcupado(chave) {
        return window.inventario && window.inventario[chave];
    }

    function mensaje(texto) {
        var el = document.getElementById("inv-info");
        if (el) el.innerText = texto;
    }

    // Marca de "houbo arrastre" → os handlers de click originais ignoram o click seguinte
    window.__dndClickSuprimido = function () {
        return Date.now() < clickSuprimidoHasta;
    };

    /* ============ FANTASMA (ghost) ============ */
    function crearFantasma(icon, cor, label) {
        eliminarFantasma();
        var g = document.createElement("div");
        g.id = "drag-ghost";
        var span = document.createElement("span");
        span.className = "dg-ico";
        span.textContent = icon || "🎒";
        g.appendChild(span);
        if (label) {
            var txt = document.createElement("span");
            txt.className = "dg-txt";
            txt.textContent = label.length > 14 ? label.substring(0, 13) + "…" : label;
            g.appendChild(txt);
        }
        if (cor) g.style.borderColor = cor;
        document.body.appendChild(g);
        moverFantasma(0, 0);
        return g;
    }

    function eliminarFantasma() {
        var g = document.getElementById("drag-ghost");
        if (g) g.remove();
    }

    function moverFantasma(x, y) {
        var g = document.getElementById("drag-ghost");
        if (g) {
            g.style.left = (x + 14) + "px";
            g.style.top = (y + 12) + "px";
        }
    }

    /* ============ MARCAS VISUAIS DE ZONAS ============ */
    function limpiarMarcas() {
        var els = document.querySelectorAll(".dnd-alvo-mochila, .dnd-alvo-slot, .dnd-alvo-invalido, .dnd-origen");
        for (var i = 0; i < els.length; i++) {
            els[i].classList.remove("dnd-alvo-mochila", "dnd-alvo-slot", "dnd-alvo-invalido", "dnd-origen");
        }
    }

    function objetivoEn(x, y) {
        if (!document.elementFromPoint) return null;
        var el = document.elementFromPoint(x, y);
        for (var i = 0; el && i < 7; i++) {
            if (el.classList) {
                if (el.classList.contains("ferreiro-slot")) {
                    return { destino: "ferreiro", el: el };
                }
                if (el.classList.contains("mochila-slot")) {
                    var id = el.getAttribute("data-id");
                    return { destino: "mochila", id: (id !== null ? id : null), el: el };
                }
                if (el.classList.contains("inv-slot") && el.getAttribute("data-slot")) {
                    return { destino: "slot", slot: el.getAttribute("data-slot"), el: el };
                }
                if (el.classList.contains("mochila-slot-vazio")) {
                    return { destino: "mochila", id: null, el: el };
                }
                if (el.id === "mochila-grade") {
                    return { destino: "mochila", id: null, el: el };
                }
            }
            if (el.parentElement) el = el.parentElement; else break;
        }
        return null;
    }

    function marcarAlvo(x, y) {
        var els = document.querySelectorAll(".dnd-alvo-mochila, .dnd-alvo-slot, .dnd-alvo-invalido");
        for (var i = 0; i < els.length; i++) {
            els[i].classList.remove("dnd-alvo-mochila", "dnd-alvo-slot", "dnd-alvo-invalido");
        }
        if (!arrastro) return;
        var obj = objetivoEn(x, y);
        if (!obj) return;

        if (arrastro.tipo === "mochila") {
            var item = buscarMochila(arrastro.id);
            if (obj.destino === "slot") {
                var ok = item && item.tipo === "equipamento";
                if (ok && typeof classePodeUsarItemNoCliente === "function") ok = classePodeUsarItemNoCliente(item);
                obj.el.classList.add(ok ? "dnd-alvo-slot" : "dnd-alvo-invalido");
            } else if (obj.destino === "ferreiro") {
                var okF = item && item.tipo === "equipamento" && !item.locked;
                obj.el.classList.add(okF ? "dnd-alvo-slot" : "dnd-alvo-invalido");
            } else if (obj.destino === "mochila") {
                if (obj.id !== null && String(obj.id) === String(arrastro.id)) return;
                obj.el.classList.add("dnd-alvo-mochila");
            }
        } else if (arrastro.tipo === "slot") {
            if (obj.destino === "mochila") obj.el.classList.add("dnd-alvo-mochila");
            else if (obj.destino === "ferreiro") obj.el.classList.add("dnd-alvo-slot");
            else if (obj.destino === "slot") obj.el.classList.add("dnd-alvo-invalido");
        }
    }
/* ============ RESOLUÇÃO DO SOLTADO ============ */
    function resolverDropMochila(a, obj) {
        if (!obj) { mensaje("Arrasto cancelado."); return; }
        var item = buscarMochila(a.id);
        if (!item) return;

        if (obj.destino === "slot") {
            if (item.tipo !== "equipamento") {
                mensaje("⚠️ Sólo se equipa EQUIPAMENTO (armas/armaduras).");
                return;
            }
            if (typeof classePodeUsarItemNoCliente === "function" && !classePodeUsarItemNoCliente(item)) {
                mensaje("⚠️ " + (item.nome || "Item") + " — sua classe não pode usar!");
                if (window.floatingTexts) window.floatingTexts.push({ x: (window.meuX || 0) + 12, y: (window.meuY || 0) - 30, text: "⚠️ Classe não pode usar", color: "#f39c12", alpha: 1.0 });
                return;
            }
            if (typeof ws !== "undefined" && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "equipar_item", id: item.id }));
            }
            mensaje("Equipando...");
            return;
        }

        if (obj.destino === "mochila") {
            if (obj.id !== null && String(obj.id) === String(a.id)) return;
            if (typeof ws !== "undefined" && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "mover_item_mochila", id: item.id, targetId: obj.id }));
            }
            mensaje("Reordenando mochila...");
            return;
        }

        if (obj.destino === "ferreiro") {
            if (item.tipo !== "equipamento") {
                mensaje("⚠️ Apenas EQUIPAMENTOS entram na forja.");
                return;
            }
            if (item.locked) {
                mensaje("🔒 Item bloqueado — desbloqueie no inventário.");
                if (window.floatingTexts) window.floatingTexts.push({ x: (window.meuX || 0) + 12, y: (window.meuY || 0) - 30, text: "🔒 Bloqueado", color: "#f39c12", alpha: 1.0 });
                return;
            }
            if (typeof window.ferreiroColocarItem === "function") {
                window.ferreiroColocarItem(item.id);
                mensaje("Equipamento na forja! 🔨");
            }
        }
    }

    function resolverDropSlot(a, obj) {
        if (!obj || obj.destino !== "mochila") {
            if (obj && obj.destino === "slot") mensaje("Arrastre o ítem equipado até a mochila para desequipar.");
            if (obj && obj.destino === "ferreiro") {
                // arrastou um item EQUIPADO para o slot da forja
                if (!slotOcupado(a.slot)) return;
                if (typeof window.ferreiroColocarEquipado === "function") {
                    window.ferreiroColocarEquipado(a.slot);
                    mensaje("Equipamento na forja! 🔨");
                }
            }
            return;
        }
        if (!slotOcupado(a.slot)) return;
        if (typeof ws !== "undefined" && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "desequipar_item", slot: a.slot }));
        }
        mensaje("Desequipando...");
    }

    /* ============ MOVIMIENTO / PERSISTÊNCIA DE JANELAS ============ */
    function moverJanela(x, y) {
        var a = arrastro;
        if (!a) return;
        var r = a.win.getBoundingClientRect();
        var pos = clampPosElemento({
            x: x - a.despX,
            y: y - a.despY,
            width: r.width,
            height: r.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        });
        a.win.style.left = Math.round(pos.x) + "px";
        a.win.style.top = Math.round(pos.y) + "px";
        a.win.style.transform = "none";
    }

    function guardarPosicion(win) {
        var id = win.id;
        if (!id || !win.getBoundingClientRect) return;
        var r = win.getBoundingClientRect();
        try {
            localStorage.setItem(chaveJanela(id), JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }));
        } catch (e) { }
    }

    function restaurarPosicion(win) {
        var id = win.id;
        if (!id) return;
        try {
            var s = localStorage.getItem(chaveJanela(id));
            if (!s) {
                // migração: chaves legadas (sem sufixo de dispositivo) → chave atual
                var legadas = chaveJanelaLegadas(id);
                for (var li = 0; li < legadas.length && !s; li++) s = localStorage.getItem(legadas[li]);
                if (s) {
                    try { localStorage.setItem(chaveJanela(id), s); } catch (e) { }
                }
            }
            if (!s) return;
            var d = JSON.parse(s);
            if (typeof d.x === "number" && typeof d.y === "number" && win.getBoundingClientRect) {
                var r = win.getBoundingClientRect();
                var pos = clampPosElemento({
                    x: d.x,
                    y: d.y,
                    width: r.width || win.offsetWidth || 0,
                    height: r.height || win.offsetHeight || 0,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight
                });
                win.style.left = Math.round(pos.x) + "px";
                win.style.top = Math.round(pos.y) + "px";
                win.style.transform = "none";
            }
        } catch (e) { }
    }

    function limpiarArrastre() {
        if (!arrastro) return;
        arrastro = null;
        limpiarMarcas();
        eliminarFantasma();
    }
/* ============ HANDLERS DE PUNTERO (mouse + toque unificado) ============ */
    document.addEventListener("pointerdown", function (e) {
        if (e.button !== undefined && e.button !== 0) return; // solo botón izquierdo
        var t = e.target;
        if (!t || !t.closest) return;

        // [UI EDITOR] Modo editar: qualquer elemento data-ui é arrastrable.
        // Sem preventDefault: os clicks normais (incl. botões filhos) seguem
        // funcionando; o arrastre só "rouba" o gesto quando há movimento real.
        if (modoeditarUI) {
            var manivela = t.closest(".ui-resize-handle");
            if (manivela) {
                var uiRes = manivela.closest(".ui-elemento");
                if (uiRes) {
                    var rr = uiRes.getBoundingClientRect();
                    arrastro = {
                        tipo: "ui-resize", el: uiRes,
                        nome: uiRes.getAttribute("data-ui") || uiRes.id,
                        origX: e.clientX, origY: e.clientY, activo: false,
                        baseW: rr.width, baseH: rr.height,
                        posX: rr.left, posY: rr.top
                    };
                    e.preventDefault();
                }
                return;
            }
            var uiAlvo = t.closest(".ui-elemento");
            if (uiAlvo) {
                arrastro = {
                    tipo: "ui", el: uiAlvo,
                    nome: uiAlvo.getAttribute("data-ui") || uiAlvo.id,
                    origX: e.clientX, origY: e.clientY, activo: false
                };
                return;
            }
        }

        if (t.closest("button")) return; // não interceptar botões (⚔️/🗑️/↩️/✕)

        // 1) Janela arrastrable (Universal para todos os modais)
        var handle = t.closest("#inv-title, #skills-header, #settings-header, #atributos-title, #detalhes-title, #big-map-top, #teleport-title, #ferreiro-title, #social-modal h2, #trade-modal h2, #party-invite-modal h2, #trade-invite-modal h2, #confirm-title, .modal-drag-handle, .dnd-handle");
        if (handle) {
            var win = handle.closest("#inv-window, #skills-window, #atributos-dupla, #settings-window, #big-map-window, #teleport-window, #ferreiro-window, #social-modal, #trade-modal, #party-invite-modal, #trade-invite-modal, #confirm-window, .dnd-window");
            if (win && win.getBoundingClientRect) {
                var r = win.getBoundingClientRect();
                arrastro = {
                    tipo: "janela", win: win,
                    despX: e.clientX - r.left, despY: e.clientY - r.top,
                    origX: e.clientX, origY: e.clientY, activo: false
                };
                e.preventDefault();
            }
            return;
        }

        // 2) Ítem da mochila
        var moch = t.closest(".mochila-slot[data-id]");
        if (moch) {
            var item = buscarMochila(moch.getAttribute("data-id"));
            if (item) {
                arrastro = {
                    tipo: "mochila", id: moch.getAttribute("data-id"), el: moch,
                    icon: item.icon || "🎒", nombre: item.nome || "", cor: item.cor || null,
                    origX: e.clientX, origY: e.clientY, activo: false
                };
                e.preventDefault();
            }
            return;
        }

        // 3) Slot do corpo EQUIPADO → mochila
        var slo = t.closest(".inv-slot[data-slot]");
        if (slo) {
            var chave = slo.getAttribute("data-slot");
            var itemSlot = slotOcupado(chave);
            if (itemSlot) {
                arrastro = {
                    tipo: "slot", slot: chave, el: slo,
                    icon: itemSlot.icon || "↩️", nombre: "Desequipar", cor: itemSlot.cor || null,
                    origX: e.clientX, origY: e.clientY, activo: false
                };
                e.preventDefault();
            }
            return;
        }
    });

    document.addEventListener("pointermove", function (e) {
        if (!arrastro) return;
        if (!arrastro.activo) {
            if (Math.hypot(e.clientX - arrastro.origX, e.clientY - arrastro.origY) <= UMBRAL) return;
            arrastro.activo = true;
            if (arrastro.tipo === "janela") {
                moverJanela(e.clientX, e.clientY);
            } else if (arrastro.tipo === "ui") {
                activarArrastreUI();
                moverUI(e.clientX, e.clientY);
            } else if (arrastro.tipo === "ui-resize") {
                redimensionarUI(e.clientX, e.clientY);
            } else {
                crearFantasma(arrastro.icon, arrastro.cor, arrastro.nombre);
                moverFantasma(e.clientX, e.clientY);
                arrastro.el.classList.add("dnd-origen");
                marcarAlvo(e.clientX, e.clientY);
            }
            return;
        }
        if (arrastro.tipo === "janela") moverJanela(e.clientX, e.clientY);
        else if (arrastro.tipo === "ui") moverUI(e.clientX, e.clientY);
        else if (arrastro.tipo === "ui-resize") redimensionarUI(e.clientX, e.clientY);
        else {
            moverFantasma(e.clientX, e.clientY);
            marcarAlvo(e.clientX, e.clientY);
        }
    });

    function soltar(e) {
        if (!arrastro) return;
        var a = arrastro;
        arrastro = null;
        limpiarMarcas();
        eliminarFantasma();
        if (!a.activo) return; // foi um click normal, não interceptar

        clickSuprimidoHasta = Date.now() + 250;

        if (a.tipo === "janela") {
            guardarPosicion(a.win);
            return;
        }
        if (a.tipo === "ui" || a.tipo === "ui-resize") {
            clickSuprimidoHasta = Date.now() + 250;
            atualizarOriginalUI(a.nome);
            marcarSucioUI();
            return;
        }
        var obj = objetivoEn(e && e.clientX !== undefined ? e.clientX : a.origX,
                             e && e.clientY !== undefined ? e.clientY : a.origY);
        if (a.tipo === "mochila") resolverDropMochila(a, obj);
        else resolverDropSlot(a, obj);
    }

    document.addEventListener("pointerup", soltar);
    document.addEventListener("pointercancel", limpiarArrastre);
    document.addEventListener("blur", limpiarArrastre);

    /* ============ REGISTRO DE JANELAS + RESTAURAR POSICIONES ============ */
    var JANELAS = [
        { sel: "#inv-window",        handles: ["#inv-title"] },
        { sel: "#skills-window",     handles: ["#skills-header"] },
        { sel: "#atributos-dupla",   handles: ["#atributos-title", "#detalhes-title"] },
        { sel: "#settings-window",   handles: ["#settings-header"] },
        { sel: "#big-map-window",    handles: ["#big-map-top"] },
        { sel: "#teleport-window",   handles: ["#teleport-title"] },
        { sel: "#ferreiro-window",   handles: ["#ferreiro-title"] },
        { sel: "#social-modal",      handles: ["#social-modal h2"] },
        { sel: "#trade-modal",       handles: ["#trade-modal h2", "#trade-modal-header"] },
        { sel: "#party-invite-modal",handles: ["#party-invite-modal h2"] },
        { sel: "#trade-invite-modal",handles: ["#trade-invite-modal h2"] },
        { sel: "#confirm-window",    handles: ["#confirm-title", "#confirm-window"] }
    ];

    function registrarTodasJanelas() {
        for (var j = 0; j < JANELAS.length; j++) {
            var winEl = document.querySelector(JANELAS[j].sel);
            if (winEl) {
                winEl.classList.add("dnd-window");
                restaurarPosicion(winEl);
            }
            for (var h = 0; h < JANELAS[j].handles.length; h++) {
                var hEl = document.querySelector(JANELAS[j].handles[h]);
                if (hEl) hEl.classList.add("dnd-handle");
            }
        }
    }
    registrarTodasJanelas();

    // Universal API para tornar qualquer modal dinâmico arrastável
    window.tornarModalArrastavel = function (winEl, handleEl) {
        if (!winEl) return;
        winEl.classList.add("dnd-window");
        if (handleEl) handleEl.classList.add("dnd-handle");
        restaurarPosicion(winEl);
    };

    // Auto-scaling inteligente: ao redimensionar a tela, recalcula posições para nunca cortar ou sobrepor
    window.addEventListener("resize", function () {
        for (var k = 0; k < JANELAS.length; k++) {
            var wEl = document.querySelector(JANELAS[k].sel);
            if (wEl && wEl.style.left && wEl.style.top) {
                var r = wEl.getBoundingClientRect();
                var pos = clampPosElemento({
                    x: r.left,
                    y: r.top,
                    width: r.width,
                    height: r.height,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight
                });
                wEl.style.left = Math.round(pos.x) + "px";
                wEl.style.top = Math.round(pos.y) + "px";
            }
        }
    });

    // Reset positions (debug / restaurar posições padrão)
    window.dndResetarJanelas = function () {
        for (var k = 0; k < JANELAS.length; k++) {
            var wEl = document.querySelector(JANELAS[k].sel);
            if (wEl) {
                wEl.style.left = "";
                wEl.style.top = "";
                wEl.style.transform = "";
                removerTodasChavesJanela(wEl.id);
            }
        }
    };
/* =====================================================================
       UI EDITOR — editar interface (drag livre + guardado por jogador)
       REGRA UIs FUTURAS: qualquer elemento COM data-ui="nome" (HTML
       estático ou dinâmico!) entra NESTE sistema automáticamente. Para
       UI criadas 100% por JS: InterfaceEditor.registrar(el, nome).
       ===================================================================== */
    var modoeditarUI = false;
    var uiSucio = false;
    var elementosUI = {};
    var layoutUI = {};
    var escalaUI = 1;
    var originaisUI = {};
    var LAYOUT_PREF = "mmorpg_ui_layout_";
    var autoUI = {};              // nomes posicionados pelo layout padrão (pc/mobile)
    var autoAtivoUI = false;
    var dispositivoAnterior = "";

    /* =====================================================================
       DETECÇÃO DE DISPOSITIVO (PC vs MOBILE)
       - mobile: User-Agent de celular OU tela pequena/estreita.
       - pc:     qualquer outro caso (desktop/notebook etc).
       - window.__forcarDispositivo = 'pc'|'mobile' força um modo (testes).
       ===================================================================== */
    function telaPequena() {
        var w = Math.max(0, window.innerWidth || 0);
        var h = Math.max(0, window.innerHeight || 0);
        if (w <= 0 || h <= 0) return false;
        var razao = w / Math.max(1, h);
        return w < 830 || (razao < 1.5 && h > 400);
    }

    function dispositivo() {
        if (window.__forcarDispositivo === "pc" || window.__forcarDispositivo === "mobile") return window.__forcarDispositivo;
        try {
            var forcado = localStorage.getItem("mmorpg_dispositivo_forcado");
            if (forcado === "pc" || forcado === "mobile") return forcado;
        } catch (e) { }
        try {
            var ua = navigator.userAgent || "";
            if (/Android|iPhone|iPad|iPod|Windows Phone|Opera Mini|Mobile/i.test(ua)) return "mobile";
        } catch (e) { }
        return telaPequena() ? "mobile" : "pc";
    }

    // Atalhos de TESTE: forçar o modo dispositivo sem mudar de máquina.
    window.forcarDispositivo = function (modo) {
        if (modo !== "pc" && modo !== "mobile") return false;
        try { localStorage.setItem("mmorpg_dispositivo_forcado", modo); } catch (e) { }
        window.__forcarDispositivo = modo;
        return true;
    };
    window.limparForcarDispositivo = function () {
        try { localStorage.removeItem("mmorpg_dispositivo_forcado"); } catch (e) { }
        window.__forcarDispositivo = null;
        return true;
    };

    // Chave do layout POR DISPOSITIVO: mmorpg_ui_layout_<id>_pc | ..._mobile
    function claveLayoutUI(dev) {
        var uid = idDoJogador();
        var d = dev || dispositivo();
        return LAYOUT_PREF + (uid || "anonimo") + "_" + d;
    }

    function cargarLayoutLocal() {
        // Carrega (mescla) a chave do dispositivo ATUAL. Não limpa layoutUI:
        // chamadas como recarregarLocal() (pós-init do servidor) dependem disso.
        try {
            var chave = claveLayoutUI();
            var uid = idDoJogador();
            if (dispositivo() === "pc" && uid && !localStorage.getItem(chave)) {
                // migração de chaves legadas (sem sufixo de dispositivo / anonimo) → PC
                var legado = localStorage.getItem(LAYOUT_PREF + uid);
                if (!legado) legado = localStorage.getItem(LAYOUT_PREF + "anonimo");
                if (!legado) legado = localStorage.getItem(LAYOUT_PREF);
                if (legado) {
                    try { localStorage.setItem(chave, legado); } catch (e) { }
                }
            }
            var s = localStorage.getItem(chave);
            if (s) {
                var d = JSON.parse(s);
                if (d && typeof d === "object") {
                    for (var k in d) layoutUI[k] = d[k];
                }
            }
        } catch (e) { }
    }

    /* =====================================================================
       LAYOUTS PADRÃO POR DISPOSITIVO + COLISÃO UI
       - LAYOUT_PADRAO_PC / LAYOUT_PADRAO_MOBILE: posições padrão expressas
         em FRAÇÃO da tela (0..1). Assim, qualquer resolução detectada
         automaticamente (PC 1366x768 / 1920x1080 / celular...) coloca os
         elementos nos locais corretos.
       - O layout padrão NUNCA sobreescreve um layout salvo: só aplica quando
         o jogador ainda não personalizou nada (nem local nem servidor).
       - resolverColisaoUI(): evita sobreposição de elementos visíveis ao
         arrastrar/redimensionar/carregar layout (empurra o elemento para a
         posição livre mais próxima, respeitando a viewport).
       ==================================================================== */

    // Posições padrão (0..1 = fração da tela) para PC (desktop/notebook).
    var LAYOUT_PADRAO_PC = {
        "status":            { x: 0.5, y: 0.012, alinharX: "center" },
        "fps":               { x: 0.5, y: 0.04,  alinharX: "center" },
        "hud-status-window": { x: 0.015, y: 0.02, alinharX: "left" },
        "hud-buffs":         { x: 0.015, y: 0.155, alinharX: "left" },
        "hud-party":         { x: 0.02, y: 0.22, alinharX: "left" },
        "hud-boss":          { x: 0.5, y: 0.03, alinharX: "center" },
        "hud-xp-central":    { x: 0.5, y: 0.9, alinharX: "center" },
        "minimap":           { x: 0.985, y: 0.02, alinharX: "right" },
        "actions":           { x: 0.5, y: 0.975, alinharX: "center", porBaixo: true },
        "util-buttons":      { x: 0.985, y: 0.975, alinharX: "right", porBaixo: true }
    };

    // Posições padrão (0..1 = fração da tela) para telas pequenas (mobile).
    var LAYOUT_PADRAO_MOBILE = {
        "hud-status-window": { x: 0.5, y: 0.07, alinharX: "center" },
        "hud-xp-central":    { x: 0.5, y: 0.93, alinharX: "center", porBaixo: true },
        "minimap":           { x: 0.94, y: 0.9, alinharX: "right" },
        "joystick":          { x: 0.08, y: 0.82 },
        "actions":           { x: 0.5, y: 0.95, alinharX: "center", porBaixo: true },
        "util-buttons":      { x: 0.94, y: 0.02, alinharX: "right" },
        "hud-party":         { x: 0.06, y: 0.5 },
        "hud-buffs":         { x: 0.5, y: 0.01, alinharX: "center" },
        "hud-boss":          { x: 0.5, y: 0.03, alinharX: "center" }
    };

    function retanguloUI(reg) {
        if (!reg || !reg.el) return null;
        var r = reg.el.getBoundingClientRect();
        var w = r.width || reg.el.offsetWidth || 0;
        var h = r.height || reg.el.offsetHeight || 0;
        if (w <= 0 && h <= 0) return null;
        return { left: r.left, top: r.top, width: w, height: h };
    }

    function dentroDeOutraUI(reg) {
        if (!reg || !reg.el) return false;
        var p = reg.el.parentElement;
        while (p) {
            if (p.classList && p.classList.contains("ui-elemento")) return true;
            p = p.parentElement;
        }
        return false;
    }

    function uiVisivel(reg) {
        if (!reg || !reg.el) return false;
        try {
            var cs = getComputedStyle(reg.el);
            if (cs && (cs.display === "none" || cs.visibility === "hidden")) return false;
        } catch (e) { }
        var r = retanguloUI(reg);
        return !!(r && (r.width > 0 || r.height > 0)) && (reg.el.offsetWidth > 0 || reg.el.offsetHeight > 0);
    }

    function retsColidem(a, b, folga) {
        var f = folga || 5;
        return !(a.left + a.width + f <= b.left || b.left + b.width + f <= a.left || a.top + a.height + f <= b.top || b.top + b.height + f <= a.top);
    }

    // Empurra o elemento `nome` para uma posição livre visível mais próxima.
    function resolverColisaoUI(nome, x, y, w, h) {
        var folga = 5;
        var bloqueadores = [];
        for (var outro in elementosUI) {
            if (outro === nome) continue;
            var reg = elementosUI[outro];
            if (!reg || !uiVisivel(reg) || dentroDeOutraUI(reg)) continue;
            var r = retanguloUI(reg);
            if (r) bloqueadores.push(r);
        }
        var atual = { left: x, top: y, width: w, height: h };
        var colideAlgum = false;
        for (var i = 0; i < bloqueadores.length; i++) {
            if (retsColidem(atual, bloqueadores[i], folga)) { colideAlgum = true; break; }
        }
        if (!colideAlgum) return { x: x, y: y };

        var candidatos = [{ x: x, y: y }];
        for (var i2 = 0; i2 < bloqueadores.length; i2++) {
            var b = bloqueadores[i2];
            if (!retsColidem(atual, b, folga)) continue;
            candidatos.push({ x: b.left + b.width + folga, y: y });
            candidatos.push({ x: b.left - w - folga, y: y });
            candidatos.push({ x: x, y: b.top + b.height + folga });
            candidatos.push({ x: x, y: b.top - h - folga });
        }
        var melhor = null;
        var melhorDist = Infinity;
        for (var c = 0; c < candidatos.length; c++) {
            var cand = candidatos[c];
            var cr = { left: cand.x, top: cand.y, width: w, height: h };
            var ok = true;
            for (var j = 0; j < bloqueadores.length; j++) {
                if (retsColidem(cr, bloqueadores[j], folga)) { ok = false; break; }
            }
            if (!ok) continue;
            var candClamp = clampPosElemento({
                x: cand.x, y: cand.y, width: w, height: h,
                viewportWidth: window.innerWidth, viewportHeight: window.innerHeight
            });
            var dist = Math.abs(candClamp.x - x) + Math.abs(candClamp.y - y);
            if (dist < melhorDist) { melhorDist = dist; melhor = candClamp; }
        }
        return melhor || clampPosElemento({ x: x, y: y, width: w, height: h, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight });
    }

    // Aplica um layout padrão (fração da tela) nos elementos ainda sem posição.
    // Persistido apenas em memória; grava com "💾 SALVAR" por jogador.
    function aplicarPadroesNaTela(PADRAO, classeAuto) {
        if (Object.keys(layoutUI).length > 0) return;
        if (Object.keys(elementosUI).length === 0) return;
        var fez = false;
        for (var nome in PADRAO) {
            var reg = elementosUI[nome];
            if (!reg || !reg.el) continue;
            if (layoutUI[nome]) continue;
            if (!uiVisivel(reg) || dentroDeOutraUI(reg)) continue;
            var r = retanguloUI(reg);
            if (!r) continue;
            var conf = PADRAO[nome];
            var vw = window.innerWidth, vh = window.innerHeight;
            var w = r.width, h = r.height;
            var x = conf.alinharX === "center" ? (vw / 2 - w / 2) : (conf.alinharX === "right" ? (vw - w - 10) : (conf.x * vw));
            var y = conf.porBaixo ? (vh - h - 12) : (conf.y * vh);
            var res = resolverColisaoUI(nome, Math.round(x), Math.round(y), w, h);
            var el2 = reg.el;
            el2.style.position = "fixed";
            el2.style.left = Math.round(res.x) + "px";
            el2.style.top = Math.round(res.y) + "px";
            el2.style.right = "auto";
            el2.style.bottom = "auto";
            el2.style.float = "none";
            el2.style.transform = "none";
            el2.classList.add("ui-movido", classeAuto);
            layoutUI[nome] = { x: Math.round(res.x), y: Math.round(res.y), w: w, h: h };
            autoUI[nome] = true;
            autoAtivoUI = true;
            fez = true;
        }
        if (fez) uiSucio = true;
    }

    // Aplica o layout padrão de CELULAR (quando não há layout salvo).
    function aplicarLayoutPadraoMobile() {
        if (dispositivo() !== "mobile") return;
        aplicarPadroesNaTela(LAYOUT_PADRAO_MOBILE, "ui-auto-mobile");
    }

    // Aplica o layout padrão de PC na resolução AUTODETECTADA (fração da tela).
    function aplicarLayoutPadraoPC() {
        if (dispositivo() !== "pc") return;
        aplicarPadroesNaTela(LAYOUT_PADRAO_PC, "ui-auto-pc");
    }

    // Aplica o padrão do dispositivo atual (só se ainda não há layout salvo).
    function aplicarPadraoAtual() {
        if (Object.keys(layoutUI).length > 0) return;
        var dev = dispositivo();
        if (dev === "mobile") aplicarLayoutPadraoMobile();
        else aplicarLayoutPadraoPC();
    }

    // Quando a resolução muda, reposiciona os elementos "auto" (layout padrão
    // que ainda não foi personalizado) proporcionalmente à NOVA resolução.
    function reposicionarAutoPadrao() {
        var PADRAO = dispositivo() === "mobile" ? LAYOUT_PADRAO_MOBILE : LAYOUT_PADRAO_PC;
        var fez = false;
        for (var nome in PADRAO) {
            if (!autoUI[nome]) continue;
            var reg = elementosUI[nome];
            if (!reg || !reg.el) continue;
            var r = retanguloUI(reg);
            if (!r) continue;
            var conf = PADRAO[nome];
            var vw = window.innerWidth, vh = window.innerHeight;
            var x = conf.alinharX === "center" ? (vw / 2 - r.width / 2) : (conf.alinharX === "right" ? (vw - r.width - 10) : (conf.x * vw));
            var y = conf.porBaixo ? (vh - r.height - 12) : (conf.y * vh);
            var res = resolverColisaoUI(nome, Math.round(x), Math.round(y), r.width, r.height);
            var el2 = reg.el;
            el2.style.position = "fixed";
            el2.style.left = Math.round(res.x) + "px";
            el2.style.top = Math.round(res.y) + "px";
            el2.style.right = "auto";
            el2.style.bottom = "auto";
            el2.style.transform = "none";
            layoutUI[nome] = { x: Math.round(res.x), y: Math.round(res.y), w: r.width, h: r.height };
            fez = true;
        }
        if (fez) resolverColisoesAplicadas();
    }

    // Usuário personalizou (arrastou/redimensionou/salvou): o layout vira "do
    // jogador" e o reposicionamento automático por resolução é desligado.
    function desativarAutoLayout() {
        if (!autoAtivoUI) return;
        autoAtivoUI = false;
        autoUI = {};
        for (var nome in elementosUI) {
            var el = elementosUI[nome].el;
            if (el) el.classList.remove("ui-auto-pc", "ui-auto-mobile");
        }
    }

    // Remove posições inline para voltar ao CSS padrão do elemento.
    function limparPosicaoManualUI(el) {
        if (!el) return;
        el.style.position = "";
        el.style.left = "";
        el.style.top = "";
        el.style.right = "";
        el.style.bottom = "";
        el.style.transform = "";
        el.style.transition = "";
        el.style.width = "";
        el.style.height = "";
        el.style.maxWidth = "";
        el.style.minWidth = "";
        el.style.minHeight = "";
        el.classList.remove("ui-movido", "ui-collide", "ui-auto-pc", "ui-auto-mobile");
    }

    // Resolve colisões em TODOS os elementos já aplicados (passes limitados
    // para garantir convergência sem travões).
    function resolverColisoesAplicadas() {
        var nomes = [];
        for (var n in elementosUI) if (elementosUI[n] && elementosUI[n].el) nomes.push(n);
        var passos = 0;
        var maxPassos = 12;
        var trocou = true;
        while (trocou && passos < maxPassos) {
            trocou = false;
            passos++;
            for (var i = 0; i < nomes.length; i++) {
                var nm = nomes[i];
                var reg = elementosUI[nm];
                if (!reg || !reg.el || !uiVisivel(reg) || dentroDeOutraUI(reg)) continue;
                var r = retanguloUI(reg);
                if (!r) continue;
                var res = resolverColisaoUI(nm, r.left, r.top, r.width, r.height);
                if (Math.round(res.x) !== Math.round(r.left) || Math.round(res.y) !== Math.round(r.top)) {
                    reg.el.style.position = "fixed";
                    reg.el.style.left = Math.round(res.x) + "px";
                    reg.el.style.top = Math.round(res.y) + "px";
                    reg.el.style.right = "auto";
                    reg.el.style.bottom = "auto";
                    reg.el.style.transform = "none";
                    reg.el.classList.add("ui-movido", "ui-collide");
                    var ant = layoutUI[nm] || {};
                    layoutUI[nm] = { x: Math.round(res.x), y: Math.round(res.y), w: ant.w, h: ant.h };
                    trocou = true;
                }
            }
        }
    }

    function toastUI(texto) {
        var t = document.getElementById("ui-toast");
        if (!t) {
            t = document.createElement("div");
            t.id = "ui-toast";
            t.className = "ui-toast";
            document.body.appendChild(t);
        }
        t.classList.remove("ui-toast-hide");
        var actual = t.getAttribute('data-timer') ? parseInt(t.getAttribute('data-timer'), 10) : null;
        if (actual) clearTimeout(actual);
        var timer = setTimeout(function () {
            var to = document.getElementById("ui-toast");
            if (to) to.classList.add("ui-toast-hide");
        }, 2800);
        t.setAttribute('data-timer', String(timer));
    }

    function aplicarPosicionUI(reg) {
        var pos = layoutUI[reg.nome];
        if (!pos) return;
        var el = reg.el;
        var rect = el.getBoundingClientRect();
        var clamp = clampPosElemento({
            x: pos.x,
            y: pos.y,
            width: rect.width || el.offsetWidth || 0,
            height: rect.height || el.offsetHeight || 0,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        });
        el.style.position = "fixed";
        el.style.left = clamp.x + "px";
        el.style.top = clamp.y + "px";
        el.style.right = "auto";
        el.style.bottom = "auto";
        el.style.transform = "none";
        if (typeof pos.w === "number" && pos.w > 0) {
            aplicarTamanhoEl(el, Math.round(pos.w), typeof pos.h === "number" && pos.h > 0 ? Math.round(pos.h) : Math.round(rect.height));
        }
        el.classList.add("ui-movido");
        layoutUI[reg.nome] = { x: Math.round(clamp.x), y: Math.round(clamp.y), w: pos.w, h: pos.h };
    }

    function registrarElementoUI(el, nome) {
        if (!el || !nome) return;
        if (elementosUI[nome]) return;
        elementosUI[nome] = { el: el, nome: nome };
        el.classList.add("ui-elemento");
        asegurarManivelaResize(el);
        aplicarPosicionUI(elementosUI[nome]);
    }

    function asegurarManivelaResize(el) {
        if (!el || el.querySelector(".ui-resize-handle")) return;
        var h = document.createElement("span");
        h.className = "ui-resize-handle";
        h.textContent = "⤡";
        h.title = "Arraste para redimensionar";
        el.appendChild(h);
    }

    function aplicarTamanhoEl(el, w, h) {
        if (!el) return;
        el.style.maxWidth = "none";
        el.style.minWidth = "none";
        el.style.minHeight = "none";
        el.style.width = Math.max(10, Math.round(w)) + "px";
        el.style.height = Math.max(10, Math.round(h)) + "px";
    }

    function receberLayoutDispositivo(d) {
        if (!d || typeof d !== "object") return;
        var comConteudo = 0;
        for (var k in d) {
            var v = d[k];
            if (v && typeof v.x === "number" && Number.isFinite(v.x)) comConteudo++;
        }
        if (comConteudo === 0) {
            // servidor não tem layout salvo p/ este dispositivo: preserva o
            // local (pode ser só-local) ou aplica o padrão do dispositivo.
            if (Object.keys(layoutUI).length > 0) return;
            layoutUI = {};
            autoUI = {}; autoAtivoUI = false;
            for (var n in elementosUI) limparPosicaoManualUI(elementosUI[n].el);
            aplicarPadraoAtual();
            return;
        }
        layoutUI = {};
        autoUI = {}; autoAtivoUI = false;
        for (var nome in d) {
            var p = d[nome];
            if (p && typeof p.x === "number" && typeof p.y === "number") {
                var novo = { x: Math.round(p.x), y: Math.round(p.y) };
                if (typeof p.w === "number" && Number.isFinite(p.w) && p.w > 0) novo.w = Math.round(p.w);
                if (typeof p.h === "number" && Number.isFinite(p.h) && p.h > 0) novo.h = Math.round(p.h);
                layoutUI[nome] = novo;
            }
        }
        for (var n2 in elementosUI) aplicarPosicionUI(elementosUI[n2]);
    }

    // Recebe o layout do SERVIDOR. O servidor guarda os layouts POR
    // DISPOSITIVO: { pc: {...}, mobile: {...} }. Layout plano (legado) é
    // tratado como layout de PC.
    function aplicarLayoutUI(dict) {
        if (!dict || typeof dict !== "object") return;
        var temPc = dict && typeof dict.pc === "object" && dict.pc !== null;
        var temMob = dict && typeof dict.mobile === "object" && dict.mobile !== null;
        if (!temPc && !temMob) {
            // layout plano legado (pré-separação) → assume PC
            var plano = {};
            var algumPlano = false;
            for (var kp in dict) {
                var vp = dict[kp];
                if (vp && typeof vp.x === "number") { plano[kp] = vp; algumPlano = true; }
            }
            if (!algumPlano) return;
            try { localStorage.setItem(claveLayoutUI("pc"), JSON.stringify(plano)); } catch (e) { }
            if (dispositivo() === "pc") receberLayoutDispositivo(plano);
            return;
        }
        if (temPc) { try { localStorage.setItem(claveLayoutUI("pc"), JSON.stringify(dict.pc)); } catch (e) { } }
        if (temMob) { try { localStorage.setItem(claveLayoutUI("mobile"), JSON.stringify(dict.mobile)); } catch (e) { } }
        receberLayoutDispositivo(dispositivo() === "pc" ? dict.pc : dict.mobile);
    }

    function recogerLayoutUI() {
        for (var nome in elementosUI) {
            var el = elementosUI[nome].el;
            if (el.classList.contains("ui-movido") && el.style.left && el.style.top) {
                var ant = layoutUI[nome] || {};
                layoutUI[nome] = { x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10), w: ant.w, h: ant.h };
            }
        }
    }

    function activarArrastreUI() {
        var a = arrastro;
        if (!a) return;
        var r = a.el.getBoundingClientRect();
        a.despX = a.origX - r.left;
        a.despY = a.origY - r.top;
        a.el.style.transition = "none";
    }

    function moverUI(x, y) {
        var a = arrastro;
        if (!a) return;
        var r = a.el.getBoundingClientRect();
        var pos = clampPosElemento({
            x: x - a.despX,
            y: y - a.despY,
            width: r.width,
            height: r.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        });
        pos = resolverColisaoUI(a.nome, Math.round(pos.x), Math.round(pos.y), r.width || a.el.offsetWidth || 0, r.height || a.el.offsetHeight || 0);
        desativarAutoLayout();
        a.el.style.position = "fixed";
        a.el.style.left = Math.round(pos.x) + "px";
        a.el.style.top = Math.round(pos.y) + "px";
        a.el.style.right = "";
        a.el.style.bottom = "";
        a.el.style.transform = "none";
        a.el.classList.add("ui-movido");
        var anterior = layoutUI[a.nome] || {};
        layoutUI[a.nome] = { x: Math.round(pos.x), y: Math.round(pos.y), w: anterior.w, h: anterior.h };
        atualizarOriginalUI(a.nome);
    }

    function marcarSucioUI() {
        uiSucio = true;
        actualizarBarraEditor();
    }

    function actualizarBarraEditor() {
        var d = document.getElementById("ui-editor-dirty");
        if (d) d.style.display = uiSucio ? "inline-block" : "none";
    }

    function redimensionarUI(x, y) {
        var a = arrastro;
        if (!a) return;
        var w = Math.max(30, Math.round(a.baseW + (x - a.origX)));
        var h = Math.max(20, Math.round(a.baseH + (y - a.origY)));
        var pos = clampPosElemento({
            x: a.posX,
            y: a.posY,
            width: w,
            height: h,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        });
        pos = resolverColisaoUI(a.nome, Math.round(pos.x), Math.round(pos.y), w, h);
        desativarAutoLayout();
        var el = a.el;
        el.style.position = "fixed";
        el.style.left = Math.round(pos.x) + "px";
        el.style.top = Math.round(pos.y) + "px";
        el.style.right = "auto";
        el.style.bottom = "auto";
        el.style.transform = "none";
        aplicarTamanhoEl(el, w, h);
        el.classList.add("ui-movido");
        layoutUI[a.nome] = { x: Math.round(pos.x), y: Math.round(pos.y), w: w, h: h };
    }

    function atualizarOriginalUI(nome) {
        var reg = elementosUI[nome];
        if (!reg || !reg.el || !reg.el.getBoundingClientRect) return;
        var r = reg.el.getBoundingClientRect();
        originaisUI[nome] = { x: r.left, y: r.top, w: r.width, h: r.height };
    }

    function capturarOriginaisUI() {
        originaisUI = {};
        for (var nome in elementosUI) atualizarOriginalUI(nome);
    }

    function EscalaInterface(f) {
        var algum = false;
        for (var nome in originaisUI) {
            var o = originaisUI[nome];
            var reg = elementosUI[nome];
            if (!o || !reg || !reg.el) continue;
            var el = reg.el;
            var w = Math.max(24, Math.round(o.w * f));
            var h = Math.max(16, Math.round(o.h * f));
            var pos = clampPosElemento({
                x: Math.round(o.x * f),
                y: Math.round(o.y * f),
                width: w,
                height: h,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight
            });
            el.style.position = "fixed";
            el.style.left = pos.x + "px";
            el.style.top = pos.y + "px";
            el.style.right = "auto";
            el.style.bottom = "auto";
            el.style.transform = "none";
            aplicarTamanhoEl(el, w, h);
            el.classList.add("ui-movido");
            layoutUI[nome] = { x: pos.x, y: pos.y, w: w, h: h };
            algum = true;
        }
        if (algum) {
            desativarAutoLayout();
            uiSucio = true;
            actualizarBarraEditor();
        }
        escalaUI = f;
    }

    window.mudarEscalaInterface = function (val) {
        var v = parseInt(val, 10);
        if (isNaN(v)) return;
        var f = Math.max(0.5, Math.min(2.5, v / 100));
        EscalaInterface(f);
        var lbl = document.getElementById("ui-escala-label");
        if (lbl) lbl.innerText = Math.round(f * 100) + "%";
    };

    function asegurarBarraEditor() {
        var bar = document.getElementById("ui-editor-bar");
        if (bar) return bar;
        bar = document.createElement("div");
        bar.id = "ui-editor-bar";
        bar.className = "ui-editor-bar";
        bar.innerHTML =
            '<span class="ui-editor-titulo">🔧 EDITAR INTERFACE</span>' +
            '<span class="ui-editor-sep"></span>' +
            '<span class="ui-editor-escala-titulo" title="Redimensiona TODAS as partes da interface proporcionalmente">📐 ESCALA</span>' +
            '<input type="range" id="ui-escala-slider" class="ui-escala-slider" min="50" max="250" step="5" value="100" oninput="mudarEscalaInterface(this.value)" title="Escala global da interface (50%~250%)">' +
            '<span id="ui-escala-label" class="ui-editor-escala-label">100%</span>' +
            '<span class="ui-editor-sep"></span>' +
            '<button class="ui-editor-btn ui-editor-save" onclick="salvarInterfaceUI()" title="Guardar no servidor (persistente por jogador)">💾 SALVAR</button>' +
            '<button class="ui-editor-btn ui-editor-reset" onclick="restaurarInterfaceUI()" title="Voltar ao layout original">↺ RESTAURAR</button>' +
            '<button class="ui-editor-btn ui-editor-exit" onclick="sairInterfaceUI()" title="Sair do modo edição">✕ SAIR</button>' +
            '<span id="ui-editor-dirty" class="ui-editor-dirty" style="display:none">● modificado</span>';
        document.body.appendChild(bar);
        return bar;
    }
/* ===== FUNÇÕES GLOBÁIS DO EDITOR (usadas pelos botões) ===== */
    window.ativarEditarInterface = function () {
        if (typeof fecharConfig === "function") fecharConfig();
        if (typeof fecharInventario === "function") fecharInventario();
        if (typeof fecharSkills === "function") fecharSkills();
        if (typeof fecharAtributos === "function") fecharAtributos();
        if (typeof cancelarTodasMiras === "function") cancelarTodasMiras();
        recogerLayoutUI();
        capturarOriginaisUI();
        modoeditarUI = true;
        uiSucio = false;
        escalaUI = 1;
        var sl = document.getElementById("ui-escala-slider");
        if (sl) sl.value = "100";
        var lb = document.getElementById("ui-escala-label");
        if (lb) lb.innerText = "100%";
        document.body.classList.add("ui-editando");
        asegurarBarraEditor().style.display = "flex";
        actualizarBarraEditor();
        toastUI("Arraste para mover. Puxe o canto ⤡ para redimensionar. Use 📐 ESCALA para redimensionar tudo.");
    };

    window.salvarInterfaceUI = function () {
        recogerLayoutUI();
        desativarAutoLayout();
        try { localStorage.setItem(claveLayoutUI(), JSON.stringify(layoutUI)); } catch (e) { }
        var enviado = false;
        var srv = window.parentWs || ws;
        if (typeof srv !== "undefined" && srv && srv.readyState === WebSocket.OPEN) {
            srv.send(JSON.stringify({ action: "salvar_ui_layout", device: dispositivo(), layout: layoutUI }));
            enviado = true;
        }
        uiSucio = false;
        actualizarBarraEditor();
        toastUI(enviado ? "💾 Interface guardada no servidor!" : "💾 Interface guardada (sólo local)");
    };

    window.restaurarInterfaceUI = function () {
        var fn = function () {
            for (var nome in elementosUI) {
                var el = elementosUI[nome].el;
                limparPosicaoManualUI(el);
            }
            layoutUI = {};
            autoUI = {}; autoAtivoUI = false;
            escalaUI = 1;
            var escSl = document.getElementById("ui-escala-slider");
            if (escSl) escSl.value = "100";
            var escLb = document.getElementById("ui-escala-label");
            if (escLb) escLb.innerText = "100%";
            try { localStorage.removeItem(claveLayoutUI()); } catch (e) { }
            if (typeof ws !== "undefined" && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "restaurar_ui_layout", device: dispositivo() }));
            }
            uiSucio = false;
            actualizarBarraEditor();
            aplicarPadraoAtual();
            var lblDev = dispositivo() === "pc" ? "PC" : "Celular";
            toastUI("↺ Interface restaurada ao layout padrão do " + lblDev);
        };
        if (typeof mostrarConfirmacao === "function") mostrarConfirmacao("Restaurar toda a interface aos valores originais?", fn);
        else fn();
    };

    window.sairInterfaceUI = function () {
        if (uiSucio) {
            recogerLayoutUI();
            desativarAutoLayout();
            try { localStorage.setItem(claveLayoutUI(), JSON.stringify(layoutUI)); } catch (e) { }
        }
        modoeditarUI = false;
        uiSucio = false;
        document.body.classList.remove("ui-editando");
        var bar = document.getElementById("ui-editor-bar");
        if (bar) bar.style.display = "none";
    };

    /* ===== ESCÁNER AUTOMÁTICO: toda UI com data-ui entra no sistema ===== */
    function escanearNodos(nodes) {
        if (!nodes) return;
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (!el || typeof el.matches !== "function") continue;
            if (el.matches("[data-ui]:not([data-ui-ignored])")) registrarElementoUI(el, el.getAttribute("data-ui") || el.id);
            var sub = el.querySelectorAll ? el.querySelectorAll("[data-ui]:not([data-ui-ignored])") : [];
            for (var j = 0; j < sub.length; j++) {
                registrarElementoUI(sub[j], sub[j].getAttribute("data-ui") || sub[j].id);
            }
        }
    }

    function revalidarLimitesViewport() {
        var nome;
        for (nome in elementosUI) {
            var reg = elementosUI[nome];
            if (!reg || !reg.el || !layoutUI[nome]) continue;
            var rect = reg.el.getBoundingClientRect();
            var clamped = clampPosElemento({
                x: layoutUI[nome].x,
                y: layoutUI[nome].y,
                width: rect.width || reg.el.offsetWidth || 0,
                height: rect.height || reg.el.offsetHeight || 0,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight
            });
            if (Math.round(clamped.x) !== Math.round(layoutUI[nome].x) || Math.round(clamped.y) !== Math.round(layoutUI[nome].y)) {
                reg.el.style.left = Math.round(clamped.x) + "px";
                reg.el.style.top = Math.round(clamped.y) + "px";
                layoutUI[nome] = { x: Math.round(clamped.x), y: Math.round(clamped.y) };
            }
        }
    }

    window.addEventListener("resize", reaccionarRedimensionamiento);

    function reaccionarRedimensionamiento() {
        revalidarLimitesViewport();
        if (modoeditarUI) return;
        var dev = dispositivo();
        if (dev !== dispositivoAnterior) {
            // mudou de dispositivo (janela estreitou/expandiu): troca a interface
            dispositivoAnterior = dev;
            document.body.setAttribute("data-dispositivo", dev);
            layoutUI = {};
            autoUI = {}; autoAtivoUI = false;
            cargarLayoutLocal();
            for (var n in elementosUI) {
                if (layoutUI[n]) aplicarPosicionUI(elementosUI[n]);
                else limparPosicaoManualUI(elementosUI[n].el);
            }
            aplicarPadraoAtual();
            return;
        }
        if (dev === "mobile") resolverColisoesAplicadas();
        else if (autoAtivoUI) reposicionarAutoPadrao();
    }

    if (window.MutationObserver) {
        var observerUI = new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                if (muts[i].type === "childList") escanearNodos(muts[i].addedNodes);
            }
        });
        observerUI.observe(document.body, { childList: true, subtree: true });
    }

    layoutUI = {};
    cargarLayoutLocal();
    escanearNodos(document.body.childNodes);
    dispositivoAnterior = dispositivo();
    document.body.setAttribute("data-dispositivo", dispositivoAnterior);
    aplicarPadraoAtual();
    if (dispositivoAnterior === "mobile") resolverColisoesAplicadas();

    /* ===== API PÚBLICA para UIs criadas por JS ===== */
    window.InterfaceEditor = {
        modo: function () { return modoeditarUI; },
        sucio: function () { return uiSucio; },
        registrar: registrarElementoUI,
        aplicarLayout: function (dict) { aplicarLayoutUI(dict); },
        recarregarLocal: function () { cargarLayoutLocal(); for (var n in elementosUI) aplicarPosicionUI(elementosUI[n]); },
        layout: function () { return JSON.stringify(layoutUI); },
        salvar: window.salvarInterfaceUI,
        restaurar: window.restaurarInterfaceUI
    };
})();