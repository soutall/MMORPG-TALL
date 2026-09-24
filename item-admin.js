// item-admin.js

window.itemAdminAberto = false;

window.toggleItemAdmin = function () {
    let win = document.getElementById('item-admin-window');
    if (!win) return;
    window.itemAdminAberto = !window.itemAdminAberto;
    win.style.display = window.itemAdminAberto ? 'block' : 'none';
    if (window.itemAdminAberto) {
        atualizarPreviewItemAdmin();
    }
};

function atualizarPreviewItemAdmin() {
    let canvas = document.getElementById('item-admin-preview');
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    
    let w = canvas.width;
    let h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Fundo do canvas (grade ou brilho radial)
    let cx = w / 2;
    let cy = h / 2;
    
    // Obter valores
    let len = parseFloat(document.getElementById('ia-len').value);
    let wid = parseFloat(document.getElementById('ia-wid').value);
    let corBase = document.getElementById('ia-corBase').value;
    let corMeio = document.getElementById('ia-corMeio').value;
    let corPonta = document.getElementById('ia-corPonta').value;
    let corFio = document.getElementById('ia-corFio').value;
    
    let armaVisualCustom = {
        customVisual: {
            tamanho: len,
            largura: wid,
            cBase: corBase,
            cMeio: corMeio,
            cPonta: corPonta,
            cFio: corFio
        }
    };
    
    // Configurar glow na tela
    ctx.shadowColor = corFio;
    ctx.shadowBlur = 15;
    
    ctx.save();
    // Centralizar e rotacionar para ficar bonita (diagonal)
    ctx.translate(cx, cy + 20);
    ctx.rotate(-Math.PI / 4);
    ctx.scale(2.5, 2.5); // aumentar para visualização
    
    let cls = document.getElementById('ia-classe') ? document.getElementById('ia-classe').value : 'guerreiro';
    let isDrone = cls === 'dronemaster';
    let isMago = cls === 'mago';

    if (isDrone && typeof window.desenharDroneExposta === 'function') {
        window.desenharDroneExposta(ctx, armaVisualCustom);
    } else if (isMago && typeof window.desenharCajadoExposta === 'function') {
        window.desenharCajadoExposta(ctx, armaVisualCustom);
    } else if (cls === 'summoner' && typeof window.desenharOrbeExposta === 'function') {
        window.desenharOrbeExposta(ctx, armaVisualCustom);
    } else if (cls === 'arqueiro' && typeof window.desenharArcoExposta === 'function') {
        window.desenharArcoExposta(ctx, armaVisualCustom);
    } else if (cls === 'arqueiro_arcano' && typeof window.desenharArcoArcanoExposta === 'function') {
        window.desenharArcoArcanoExposta(ctx, armaVisualCustom);
    } else if (cls === 'curandeiro' && typeof window.desenharCajadoLuzExposta === 'function') {
        window.desenharCajadoLuzExposta(ctx, armaVisualCustom);
    } else if (cls === 'barbaro' && typeof window.desenharMachadoExposta === 'function') {
        window.desenharMachadoExposta(ctx, armaVisualCustom);
    } else if (cls === 'roqueiro' && typeof window.desenharGuitarraExposta === 'function') {
        window.desenharGuitarraExposta(ctx, armaVisualCustom);
    } else if (cls === 'ladino' && typeof window.desenharAdagaExposta === 'function') {
        window.desenharAdagaExposta(ctx, armaVisualCustom);
    } else if (cls === 'sniper' && typeof window.desenharFuzilExposta === 'function') {
        window.desenharFuzilExposta(ctx, armaVisualCustom);
    } else if (cls === 'pikeman' && typeof window.desenharFoiceExposta === 'function') {
        window.desenharFoiceExposta(ctx, armaVisualCustom);
    } else if (typeof window.desenharLaminaLargaExposta === 'function') {
        // Fallback for warrior and unknown classes
        window.desenharLaminaLargaExposta(ctx, 0, armaVisualCustom);
    } else {
        ctx.fillStyle = '#fff';
        ctx.fillText("Preview Indisponível", -30, 0);
    }
    
    ctx.restore();
}

// Adicionar eventos para redesenhar o preview sempre que um controle mudar
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(() => {
        let inputs = document.querySelectorAll('#item-admin-window input, #item-admin-window select');
        inputs.forEach(inp => {
            inp.addEventListener('input', atualizarPreviewItemAdmin);
        });
    }, 1000);
});

window.spawnarArmaAdmin = function() {
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;
    
    let payload = {
        action: 'admin_spawn_weapon',
        classe: document.getElementById('ia-classe') ? document.getElementById('ia-classe').value : 'guerreiro',
        slotItem: document.getElementById('ia-slot') ? document.getElementById('ia-slot').value : 'arma',
        nome: document.getElementById('ia-nome').value,
        raridade: document.getElementById('ia-raridade').value,
        forca: parseInt(document.getElementById('ia-forca').value) || 0,
        vida: parseInt(document.getElementById('ia-vida').value) || 0,
        customVisual: {
            tamanho: parseFloat(document.getElementById('ia-len').value),
            largura: parseFloat(document.getElementById('ia-wid').value),
            cBase: document.getElementById('ia-corBase').value,
            cMeio: document.getElementById('ia-corMeio').value,
            cPonta: document.getElementById('ia-corPonta').value,
            cFio: document.getElementById('ia-corFio').value
        }
    };
    
    window.ws.send(JSON.stringify(payload));
    
    // Feedback visual do botão
    let btn = document.querySelector('#item-admin-window button[onclick="window.spawnarArmaAdmin()"]');
    if (btn) {
        let old = btn.innerText;
        btn.innerText = "✔️ ENVIADO!";
        setTimeout(() => btn.innerText = old, 1500);
    }
};
