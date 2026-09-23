/* ====================================================================
   MOBILE HUD LÓGICA (v1.39)
   - Controle do menu sidebar retrátil
   - Fechamento ao tocar fora ou acionar modal
   - Notificações de recursos futuros
   ==================================================================== */

(function () {
    let sidebarOpen = false;

    function getSidebarDropdown() {
        return document.getElementById("mobile-sidebar-dropdown");
    }

    function getSidebarToggleBtn() {
        return document.getElementById("mobile-sidebar-toggle");
    }

    function toggleMobileSidebar(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        sidebarOpen = !sidebarOpen;
        atualizarVisualSidebar();
    }

    function fecharMobileSidebar() {
        if (!sidebarOpen) return;
        sidebarOpen = false;
        atualizarVisualSidebar();
    }

    function atualizarVisualSidebar() {
        const dropdown = getSidebarDropdown();
        const btn = getSidebarToggleBtn();
        if (dropdown) {
            dropdown.classList.toggle("open", sidebarOpen);
        }
        if (btn) {
            btn.classList.toggle("open", sidebarOpen);
            const label = btn.querySelector(".btn-label");
            if (label) {
                label.textContent = sidebarOpen ? "FECHAR" : "MENU";
            }
        }
    }

    // Acionar função do jogo e fechar o menu da sidebar
    function acionarMenuMobile(funcao) {
        fecharMobileSidebar();
        if (typeof funcao === "function") {
            funcao();
        }
    }

    // Exibir notificação toast para botões futuros
    let toastTimeout = null;
    function mostrarAvisoUpdate(mensagem) {
        fecharMobileSidebar();
        let toast = document.getElementById("mobile-hud-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "mobile-hud-toast";
            document.body.appendChild(toast);
        }
        toast.innerHTML = mensagem || "🔒 Recurso em desenvolvimento para as próximas atualizações!";
        toast.classList.add("show");
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 2200);
    }

    // Fecha o menu ao tocar fora
    document.addEventListener("pointerdown", function (e) {
        if (!sidebarOpen) return;
        const container = document.getElementById("mobile-sidebar-container");
        if (container && !container.contains(e.target)) {
            fecharMobileSidebar();
        }
    });

    // Detectar touch ou mobile e aplicar classe no body para testes/compatibilidade
    function verificarDispositivoMobile() {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isSmall = window.innerWidth <= 1024;
        if (isTouch || isSmall) {
            document.body.classList.add("mobile-hud-active");
        }
    }

    window.addEventListener("resize", verificarDispositivoMobile);
    document.addEventListener("DOMContentLoaded", verificarDispositivoMobile);
    verificarDispositivoMobile();

    // Exportar funções globais
    window.toggleMobileSidebar = toggleMobileSidebar;
    window.fecharMobileSidebar = fecharMobileSidebar;
    window.acionarMenuMobile = acionarMenuMobile;
    window.mostrarAvisoUpdate = mostrarAvisoUpdate;
})();
