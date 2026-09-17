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
    var PREF = "mmorpg_jv_win_";   // prefijo localStorage das janelas

    var arrastro = null;           // estado atual do arrastre
    var clickSuprimidoHasta = 0;

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
            } else if (obj.destino === "mochila") {
                if (obj.id !== null && String(obj.id) === String(arrastro.id)) return;
                obj.el.classList.add("dnd-alvo-mochila");
            }
        } else if (arrastro.tipo === "slot") {
            if (obj.destino === "mochila") obj.el.classList.add("dnd-alvo-mochila");
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
        }
    }

    function resolverDropSlot(a, obj) {
        if (!obj || obj.destino !== "mochila") {
            if (obj && obj.destino === "slot") mensaje("Arrastre o ítem equipado até a mochila para desequipar.");
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
        var nx = x - a.despX, ny = y - a.despY;
        var r = a.win.getBoundingClientRect();
        var vw = window.innerWidth, vh = window.innerHeight;
        nx = Math.max(40 - r.width, Math.min(nx, vw - 40));
        ny = Math.max(0, Math.min(ny, vh - 24));
        a.win.style.left = Math.round(nx) + "px";
        a.win.style.top = Math.round(ny) + "px";
        a.win.style.transform = "none";
    }

    function guardarPosicion(win) {
        var id = win.id;
        if (!id || !win.getBoundingClientRect) return;
        var r = win.getBoundingClientRect();
        try {
            localStorage.setItem(PREF + id, JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }));
        } catch (e) { }
    }

    function restaurarPosicion(win) {
        var id = win.id;
        if (!id) return;
        try {
            var s = localStorage.getItem(PREF + id);
            if (!s) return;
            var d = JSON.parse(s);
            if (typeof d.x === "number" && typeof d.y === "number" && win.getBoundingClientRect) {
                var r = win.getBoundingClientRect();
                var vw = window.innerWidth, vh = window.innerHeight;
                d.x = Math.max(40 - r.width, Math.min(d.x, vw - 40));
                d.y = Math.max(0, Math.min(d.y, vh - 24));
                win.style.left = Math.round(d.x) + "px";
                win.style.top = Math.round(d.y) + "px";
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

        // 1) Janela arrastrable
        var handle = t.closest("#inv-title, #skills-header, #settings-header, #atributos-title, #detalhes-title, #big-map-top, #teleport-title");
        if (handle) {
            var win = handle.closest("#inv-window, #skills-window, #atributos-dupla, #settings-window, #big-map-window, #teleport-window");
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
        if (a.tipo === "ui") {
            clickSuprimidoHasta = Date.now() + 250;
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
        { sel: "#teleport-window",   handles: ["#teleport-title"] }
    ];

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

    // Reset positions (debug / por si algún día hay botón de restaurar)
    window.dndResetarJanelas = function () {
        for (var k = 0; k < JANELAS.length; k++) {
            var wEl = document.querySelector(JANELAS[k].sel);
            if (wEl) {
                wEl.style.left = "";
                wEl.style.top = "";
                wEl.style.transform = "";
                try { localStorage.removeItem(PREF + wEl.id); } catch (e) { }
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
    var LAYOUT_PREF = "mmorpg_ui_layout_";

    function claveLayoutUI() {
        return LAYOUT_PREF + (window.meuId || "anonimo");
    }

    function toastUI(texto) {
        var t = document.getElementById("ui-toast");
        if (!t) {
            t = document.createElement("div");
            t.id = "ui-toast";
            t.className = "ui-toast";
            document.body.appendChild(t);
        }
        t.innerText = texto;
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
        el.style.position = "fixed";
        el.style.left = pos.x + "px";
        el.style.top = pos.y + "px";
        el.style.right = "";
        el.style.bottom = "";
        el.style.transform = "none";
        el.classList.add("ui-movido");
    }

    function registrarElementoUI(el, nome) {
        if (!el || !nome) return;
        if (elementosUI[nome]) return;
        elementosUI[nome] = { el: el, nome: nome };
        el.classList.add("ui-elemento");
        aplicarPosicionUI(elementosUI[nome]);
    }

    function aplicarLayoutUI(dict) {
        if (!dict || typeof dict !== "object") return;
        var algum = false;
        for (var nome in dict) {
            var p = dict[nome];
            if (p && typeof p.x === "number" && typeof p.y === "number") {
                layoutUI[nome] = { x: Math.round(p.x), y: Math.round(p.y) };
                algum = true;
            }
        }
        if (!algum) return;
        for (var n in elementosUI) aplicarPosicionUI(elementosUI[n]);
        try { localStorage.setItem(claveLayoutUI(), JSON.stringify(layoutUI)); } catch (e) { }
    }

    function recogerLayoutUI() {
        for (var nome in elementosUI) {
            var el = elementosUI[nome].el;
            if (el.classList.contains("ui-movido") && el.style.left && el.style.top) {
                layoutUI[nome] = { x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10) };
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
        var nx = x - a.despX, ny = y - a.despY;
        var r = a.el.getBoundingClientRect();
        var vw = window.innerWidth, vh = window.innerHeight;
        nx = Math.max(40 - r.width, Math.min(nx, vw - 40));
        ny = Math.max(0, Math.min(ny, vh - 24));
        a.el.style.position = "fixed";
        a.el.style.left = Math.round(nx) + "px";
        a.el.style.top = Math.round(ny) + "px";
        a.el.style.right = "";
        a.el.style.bottom = "";
        a.el.style.transform = "none";
        a.el.classList.add("ui-movido");
        layoutUI[a.nome] = { x: Math.round(nx), y: Math.round(ny) };
    }

    function marcarSucioUI() {
        uiSucio = true;
        actualizarBarraEditor();
    }

    function actualizarBarraEditor() {
        var d = document.getElementById("ui-editor-dirty");
        if (d) d.style.display = uiSucio ? "inline-block" : "none";
    }

    function asegurarBarraEditor() {
        var bar = document.getElementById("ui-editor-bar");
        if (bar) return bar;
        bar = document.createElement("div");
        bar.id = "ui-editor-bar";
        bar.className = "ui-editor-bar";
        bar.innerHTML =
            '<span class="ui-editor-titulo">🔧 EDITAR INTERFACE</span>' +
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
        modoeditarUI = true;
        uiSucio = false;
        document.body.classList.add("ui-editando");
        asegurarBarraEditor().style.display = "flex";
        actualizarBarraEditor();
        toastUI("Arraste os elementos da interface para movêlos. Toque 💾 SALVAR para guardar.");
    };

    window.salvarInterfaceUI = function () {
        recogerLayoutUI();
        try { localStorage.setItem(claveLayoutUI(), JSON.stringify(layoutUI)); } catch (e) { }
        var enviado = false;
        var srv = window.parentWs || ws;
        if (typeof srv !== "undefined" && srv && srv.readyState === WebSocket.OPEN) {
            srv.send(JSON.stringify({ action: "salvar_ui_layout", layout: layoutUI }));
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
                el.style.position = "";
                el.style.left = "";
                el.style.top = "";
                el.style.right = "";
                el.style.bottom = "";
                el.style.transform = "";
                el.style.transition = "";
                el.classList.remove("ui-movido");
            }
            layoutUI = {};
            try { localStorage.removeItem(claveLayoutUI()); } catch (e) { }
            if (typeof ws !== "undefined" && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "restaurar_ui_layout" }));
            }
            uiSucio = false;
            actualizarBarraEditor();
            toastUI("↺ Interface restaurada ao original");
        };
        if (typeof mostrarConfirmacao === "function") mostrarConfirmacao("Restaurar toda a interface aos valores originais?", fn);
        else fn();
    };

    window.sairInterfaceUI = function () {
        if (uiSucio) {
            recogerLayoutUI();
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

    if (window.MutationObserver) {
        var observerUI = new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                if (muts[i].type === "childList") escanearNodos(muts[i].addedNodes);
            }
        });
        observerUI.observe(document.body, { childList: true, subtree: true });
    }

    escanearNodos(document.body.childNodes);

    /* ===== API PÚBLICA para UIs criadas por JS ===== */
    window.InterfaceEditor = {
        modo: function () { return modoeditarUI; },
        sucio: function () { return uiSucio; },
        registrar: registrarElementoUI,
        aplicarLayout: function (dict) { aplicarLayoutUI(dict); },
        layout: function () { return JSON.stringify(layoutUI); },
        salvar: window.salvarInterfaceUI,
        restaurar: window.restaurarInterfaceUI
    };
})();