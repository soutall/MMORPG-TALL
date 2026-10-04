// renderizador_arvore_3d.js — Renderizador e Cache dos Sprites do Modelo 3D (Arvore.glb)
(function (global) {
    'use strict';

    const Arvore3D = {
        pronto: false,
        carregando: false,
        snapshots: [], // Variações de rotação pré-renderizadas da árvore 3D
        canvasSize: 256,
        ancoraX: 128,
        ancoraY: 205
    };

    function carregarScript(url, callback) {
        const s = document.createElement('script');
        s.src = url;
        s.onload = callback;
        s.onerror = function (e) {
            console.error('[Arvore3D] Erro ao carregar biblioteca:', url, e);
        };
        document.head.appendChild(s);
    }

    function iniciarCarregamento() {
        if (Arvore3D.carregando || Arvore3D.pronto) return;
        Arvore3D.carregando = true;

        function prepararRenderer() {
            if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
                console.warn('[Arvore3D] THREE ou GLTFLoader ausente.');
                return;
            }

            const loader = new THREE.GLTFLoader();
            const caminhoGlb = 'sprites/mapas/Arvore.glb';

            loader.load(caminhoGlb, function (gltf) {
                try {
                    const scene = gltf.scene || gltf.scenes[0];
                    renderizarSnapshots(scene);
                } catch (err) {
                    console.error('[Arvore3D] Erro ao processar cena do modelo:', err);
                }
            }, undefined, function (err) {
                console.error('[Arvore3D] Erro ao carregar Arvore.glb:', err);
            });
        }

        if (typeof THREE === 'undefined') {
            carregarScript('three.min.js', function () {
                if (typeof THREE.GLTFLoader === 'undefined') {
                    carregarScript('GLTFLoader.js', prepararRenderer);
                } else {
                    prepararRenderer();
                }
            });
        } else if (typeof THREE.GLTFLoader === 'undefined') {
            carregarScript('GLTFLoader.js', prepararRenderer);
        } else {
            prepararRenderer();
        }
    }

    function renderizarSnapshots(modelo) {
        const S = Arvore3D.canvasSize;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(S, S);
        renderer.setClearColor(0x000000, 0);
        renderer.outputEncoding = THREE.sRGBEncoding || 3001;

        const scene = new THREE.Scene();

        // Iluminação de jogo 2.5D: Sol brilhante + luz ambiente suave
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfffae0, 1.4);
        dirLight.position.set(2, 4, 3);
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x8bc34a, 0.45);
        fillLight.position.set(-2, 1, -2);
        scene.add(fillLight);

        // Caixa delimitadora do modelo para enquadrar a câmera perfeitamente
        const box = new THREE.Box3().setFromObject(modelo);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Centraliza a base do modelo no ponto (0, 0, 0)
        modelo.position.x = -center.x;
        modelo.position.y = -box.min.y;
        modelo.position.z = -center.z;
        scene.add(modelo);

        // Câmera isométrica/2.5D enquadrada sem cortar o tronco nem as folhas
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetY = size.y * 0.5;
        const d = maxDim * 0.82;
        const camera = new THREE.OrthographicCamera(-d, d, d, -d, 0.1, 100);
        
        // Posição da câmera (olhando a ~28° para a árvore)
        camera.position.set(0, targetY + maxDim * 0.65, maxDim * 1.35);
        camera.lookAt(0, targetY, 0);
        camera.updateMatrixWorld();

        // Projeta o ponto base do tronco (0, 0, 0) para determinar a âncora exata no chão
        const basePoint = new THREE.Vector3(0, 0, 0);
        basePoint.project(camera);
        Arvore3D.ancoraX = (basePoint.x * 0.5 + 0.5) * S;
        Arvore3D.ancoraY = (-basePoint.y * 0.5 + 0.5) * S;

        // Renderiza 8 rotações diferentes para que as árvores no mapa tenham variedade natural
        const qtdVariacoes = 8;
        Arvore3D.snapshots = [];

        for (let i = 0; i < qtdVariacoes; i++) {
            modelo.rotation.y = (i / qtdVariacoes) * Math.PI * 2;
            renderer.render(scene, camera);

            const offCanvas = document.createElement('canvas');
            offCanvas.width = S;
            offCanvas.height = S;
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(renderer.domElement, 0, 0);

            Arvore3D.snapshots.push(offCanvas);
        }

        // Libera recursos WebGL temporários
        renderer.dispose();
        Arvore3D.pronto = true;
        console.log('[Arvore3D] Modelo Arvore.glb carregado com sucesso! ' + qtdVariacoes + ' variações geradas. Âncora: (' + Arvore3D.ancoraX.toFixed(1) + ', ' + Arvore3D.ancoraY.toFixed(1) + ')');
    }

    // Desenha a árvore 3D diretamente no Canvas 2D
    Arvore3D.desenhar = function (ctx, x, y, escala, vento, seed) {
        if (!Arvore3D.pronto || !Arvore3D.snapshots.length) return false;

        const idx = Math.abs((seed || 0) | 0) % Arvore3D.snapshots.length;
        const img = Arvore3D.snapshots[idx];
        if (!img) return false;

        const e = escala || 1;
        const w = 195 * e;
        const h = 195 * e;

        // Ponto de contato exato das raízes com o chão
        const ox = (Arvore3D.ancoraX / Arvore3D.canvasSize) * w;
        const oy = (Arvore3D.ancoraY / Arvore3D.canvasSize) * h;

        // Sombra suave sob as raízes da árvore 3D
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.ellipse(0, 0, 36 * e, 14 * e, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10, 24, 14, 0.42)';
        ctx.fill();
        ctx.restore();

        // Oscilação natural de vento enraizada no solo
        ctx.save();
        ctx.translate(x, y);
        const anguloVento = ((vento || 0) * 0.015);
        if (anguloVento !== 0) {
            ctx.rotate(anguloVento);
        }
        ctx.drawImage(img, -ox, -oy, w, h);
        ctx.restore();

        return true;
    };

    global.Arvore3D = Arvore3D;

    // Dispara carregamento automaticamente quando o documento estiver pronto
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciarCarregamento);
        } else {
            iniciarCarregamento();
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
