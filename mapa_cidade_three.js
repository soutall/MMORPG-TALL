// ============================================================================
// mapa_cidade_three.js — Renderizador WebGL 2.5D da Cidade de Davahl (Three.js)
// Substitui o pipeline Canvas 2D por WebGL real com:
//   • Sombras dinâmicas (ShadowMap PCF Soft)
//   • Iluminação direcional (Sol NW) + AmbientLight + PointLights nos postes
//   • Materiais PBR via MeshStandardMaterial (roughness / metalness / emissive)
//   • Câmera isométrica 2.5D controlada pelo sistema de câmera do jogo
//   • Renderização para canvas WebGL sobreposta ao canvas 2D principal
//
// IMPORTANTE: Apenas carregado no NAVEGADOR (client-side).
// Colisão e exports do servidor continuam em mapa_cidade.js.
// ============================================================================
(function (global) {
    'use strict';

    // ── Aguarda Three.js e o sistema base do jogo estarem carregados ──────────
    function waitFor(test, cb, ms) {
        if (test()) { cb(); return; }
        setTimeout(function () { waitFor(test, cb, ms); }, ms || 80);
    }

    waitFor(function () {
        return typeof THREE !== 'undefined' && global.mapaCidade && global.mapaCidade.gerarCidade;
    }, function () { initThreeCity(); });

    // ── Constantes ────────────────────────────────────────────────────────────
    const TILE = 40;
    const CID_X0 = 59800;
    const CID_X1 = 63800;
    const COLS = (CID_X1 - CID_X0) / TILE;   // 100
    const ROWS = 75;
    const PRACA_CX = 50, PRACA_CY = 37;

    // Paleta de cores → converte hex para THREE.Color
    function hex(h) { return new THREE.Color(h); }

    // Escala de visualização: 1 unidade Three.js = TILE px do jogo
    const S = 1 / TILE; // 0.025

    // Isometric camera: ângulo de visão leve (30°)
    const CAM_FOV   = 30;
    const CAM_NEAR  = 0.1;
    const CAM_FAR   = 5000;
    const CAM_DIST  = 120;  // distância z da câmera
    const CAM_TILT  = 55;   // graus de inclinação (vertical)

    // ── Variáveis do módulo ───────────────────────────────────────────────────
    let renderer, scene, camera;
    let threeCanvas, threeCtx;
    let dirLight, ambLight;
    let posLights = [];
    let fountainMeshes = [];
    let treeMeshes = [];
    let smokeParts = [];
    let waterTime = 0;
    let initialized = false;
    let lastCamX = -1, lastCamY = -1;

    // ── Geometrias reutilizadas ───────────────────────────────────────────────
    const geoBox    = new THREE.BoxGeometry(1, 1, 1);
    const geoCyl    = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg || 8);
    const geoCone   = (r, h, seg) => new THREE.ConeGeometry(r, h, seg || 8);
    const geoPlane  = (w, h) => new THREE.PlaneGeometry(w, h);
    const geoSphere = (r, w, h) => new THREE.SphereGeometry(r, w || 8, h || 6);

    // ── Materiais ─────────────────────────────────────────────────────────────
    function mat(color, opts) {
        return new THREE.MeshStandardMaterial(Object.assign({
            color: hex(color),
            roughness: 0.85,
            metalness: 0.05
        }, opts || {}));
    }

    function matEmissive(color, emissive, intensity) {
        return new THREE.MeshStandardMaterial({
            color: hex(color),
            emissive: hex(emissive),
            emissiveIntensity: intensity || 1.0,
            roughness: 0.4,
            metalness: 0.0
        });
    }

    // ── Procedural textura de paralelepípedo (canvas 2D → CanvasTexture) ─────
    function gerarTexturaCobblestone() {
        const size = 256;
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');

        c.fillStyle = '#1e1c18';
        c.fillRect(0, 0, size, size);

        const stones = [
            '#696055', '#756c60', '#5c544a', '#807769', '#6e6559',
            '#6a6050', '#5e564c', '#7a7060'
        ];
        const rows = 6, cols = 6;
        const sw = size / cols, sh = size / rows;

        for (let r = 0; r < rows; r++) {
            const offset = (r % 2 === 1) ? sw * 0.5 : 0;
            for (let c2 = 0; c2 < cols + 1; c2++) {
                const px = c2 * sw - sw * 0.5 + offset;
                const py = r * sh + 2;
                const w = sw - 4, h = sh - 4;
                const stoneColor = stones[Math.floor(Math.abs(Math.sin(r * 7 + c2 * 13)) * stones.length)];
                c.fillStyle = stoneColor;
                c.beginPath();
                c.roundRect(px + 2, py, w, h, 3);
                c.fill();
                // highlight
                c.fillStyle = 'rgba(255,255,255,0.13)';
                c.fillRect(px + 2, py, w, 2);
                c.fillRect(px + 2, py, 2, h);
                // shadow
                c.fillStyle = 'rgba(0,0,0,0.40)';
                c.fillRect(px + 2, py + h - 2, w, 2);
                c.fillRect(px + w - 2, py, 2, h);
            }
        }

        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(6, 6);
        return tex;
    }

    // ── Textura de grama ──────────────────────────────────────────────────────
    function gerarTexturaGrama() {
        const size = 128;
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        c.fillStyle = '#1d3e18';
        c.fillRect(0, 0, size, size);
        c.fillStyle = '#295a22';
        for (let i = 0; i < 300; i++) {
            const x = Math.random() * size, y = Math.random() * size;
            c.beginPath();
            c.arc(x, y, 2 + Math.random() * 3, 0, Math.PI * 2);
            c.fillStyle = ['#295a22','#3a7a32','#2e7d32','#1b5e20'][Math.floor(Math.random()*4)];
            c.fill();
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(3, 3);
        return tex;
    }

    // ── Textura de pedra para paredes ─────────────────────────────────────────
    function gerarTexturaPedra(baseColor) {
        const size = 256;
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        c.fillStyle = baseColor || '#d5c4a1';
        c.fillRect(0, 0, size, size);
        // Juntas de cantaria
        c.strokeStyle = 'rgba(0,0,0,0.25)';
        c.lineWidth = 2;
        const bh = 32;
        for (let row = 0; row < size / bh; row++) {
            const yy = row * bh;
            const offset = (row % 2 === 0) ? 0 : size * 0.5;
            c.beginPath();
            c.moveTo(0, yy); c.lineTo(size, yy); c.stroke();
            for (let col = 0; col < 3; col++) {
                const xx = (col * size / 2 + offset) % size;
                c.beginPath();
                c.moveTo(xx, yy); c.lineTo(xx, yy + bh); c.stroke();
            }
        }
        // Variação tonal procedural
        for (let i = 0; i < 120; i++) {
            const x = Math.random() * size, y = Math.random() * size;
            c.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
            c.beginPath();
            c.ellipse(x, y, 8 + Math.random() * 16, 4 + Math.random() * 8, Math.random(), 0, Math.PI * 2);
            c.fill();
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        return tex;
    }

    // ── Textura de telhado (telhas) ───────────────────────────────────────────
    function gerarTexturaTelhado(baseColor) {
        const size = 256;
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        c.fillStyle = baseColor || '#a93226';
        c.fillRect(0, 0, size, size);
        // Fileiras de telhas arredondadas
        const rows = 10, tw = 32, th = 20;
        for (let r = 0; r < rows + 1; r++) {
            const yy = r * th;
            const offset = (r % 2 === 0) ? 0 : tw * 0.5;
            for (let t2 = -1; t2 < size / tw + 1; t2++) {
                const xx = t2 * tw + offset;
                c.fillStyle = 'rgba(0,0,0,0.15)';
                c.beginPath();
                c.arc(xx + tw / 2, yy + th, tw * 0.5, Math.PI, 0);
                c.fill();
                c.fillStyle = 'rgba(255,255,255,0.08)';
                c.beginPath();
                c.arc(xx + tw / 2, yy + th * 0.4, tw * 0.4, Math.PI, 0);
                c.fill();
            }
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(3, 2);
        return tex;
    }

    // ── Cria uma Mesh com sombra ──────────────────────────────────────────────
    function mesh(geo, material, castShadow, receiveShadow) {
        const m = new THREE.Mesh(geo, material);
        m.castShadow    = castShadow    !== false;
        m.receiveShadow = receiveShadow !== false;
        return m;
    }

    // ── Converte coordenadas do jogo → Three.js (Y-up) ────────────────────────
    // Jogo: X crescendo para direita, Y crescendo para baixo
    // Three: X direita, Y para cima (altitude), Z "para cima" na tela
    function gX(worldX) { return (worldX - CID_X0) * S; }
    function gZ(worldY) { return worldY * S; }   // eixo Z = profundidade (jogo Y)

    // ── Inicialização Principal ───────────────────────────────────────────────
    function initThreeCity() {
        if (initialized) return;
        initialized = true;

        // 1. Canvas WebGL sobreposto
        threeCanvas = document.createElement('canvas');
        threeCanvas.id = 'canvas-three-city';
        threeCanvas.style.cssText = [
            'position:fixed',
            'left:0', 'top:0',
            'width:100%', 'height:100%',
            'pointer-events:none',
            'z-index:2',
            'display:none'
        ].join(';');
        document.body.appendChild(threeCanvas);

        // 2. Renderer WebGL
        renderer = new THREE.WebGLRenderer({
            canvas: threeCanvas,
            antialias: true,
            alpha: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        // 3. Cena
        scene = new THREE.Scene();
        scene.background = new THREE.Color('#0a0e12');
        scene.fog = new THREE.FogExp2(0x0a0e12, 0.008);

        // 4. Câmera perspectiva isométrica
        camera = new THREE.PerspectiveCamera(CAM_FOV, window.innerWidth / window.innerHeight, CAM_NEAR, CAM_FAR);
        atualizarCamera(CID_X0 + 2000, 1500);

        // 5. Luzes
        ambLight = new THREE.AmbientLight(0x8090a0, 0.55);
        scene.add(ambLight);

        dirLight = new THREE.DirectionalLight(0xfff0cc, 1.65);
        dirLight.position.set(-40, 80, -30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far  = 400;
        dirLight.shadow.camera.left  = -60;
        dirLight.shadow.camera.right =  60;
        dirLight.shadow.camera.top   =  60;
        dirLight.shadow.camera.bottom= -60;
        dirLight.shadow.bias = -0.0005;
        scene.add(dirLight);

        // Luz de preenchimento fria (lua / céu)
        const fillLight = new THREE.DirectionalLight(0x8aadff, 0.28);
        fillLight.position.set(30, 20, 30);
        scene.add(fillLight);

        // 6. Constrói a cena 3D
        construirCena();

        // 7. Substitui as funções de renderização globais
        patchRenderLoop();

        // 8. Listener de resize
        window.addEventListener('resize', onResize);
        onResize();

        console.log('[ThreeCity] Engine WebGL 2.5D inicializada com sucesso!');
    }

    // ── Atualiza câmera isométrica conforme posição do jogo ──────────────────
    function atualizarCamera(worldX, worldY) {
        const cx = gX(worldX);
        const cz = gZ(worldY);
        const tiltRad = CAM_TILT * Math.PI / 180;
        const dist = CAM_DIST;

        camera.position.set(
            cx,
            dist * Math.sin(tiltRad),
            cz + dist * Math.cos(tiltRad)
        );
        camera.lookAt(cx, 0, cz);
        camera.updateProjectionMatrix();
    }

    // ── Resize ────────────────────────────────────────────────────────────────
    function onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    // ── Constrói toda a cena 3D ───────────────────────────────────────────────
    function construirCena() {
        construirChao();
        construirCasas();
        construirMuralhas();
        construirFonte();
        construirArvores();
        construirLampadas();
        construirBarracas();
        construirTorres();
        construirPortal();
    }

    // ── Chão procedural ───────────────────────────────────────────────────────
    function construirChao() {
        const grid = global.mapaCidade.grid();
        if (!grid) return;

        const cobbleTex = gerarTexturaCobblestone();
        const gramaTex  = gerarTexturaGrama();

        const matCobble = new THREE.MeshStandardMaterial({
            map: cobbleTex, roughness: 0.9, metalness: 0.0
        });
        const matGrama = new THREE.MeshStandardMaterial({
            map: gramaTex, roughness: 1.0, metalness: 0.0
        });
        const matMuro = mat('#3c372f', { roughness: 0.95 });
        const matChao = mat('#2f2b26', { roughness: 1.0 });

        // Agrupa tiles para draw calls mínimos usando merged geometry
        const geoRua   = [];
        const geoGrama = [];
        const geoMuro  = [];
        const geoChao  = [];

        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                const t = grid[l][c];
                const wx = c + 0.5;
                const wz = l + 0.5;
                const tg = new THREE.PlaneGeometry(1, 1);
                tg.rotateX(-Math.PI / 2);
                tg.translate(wx, 0, wz);

                if (t.tipo === 'rua')                     geoRua.push(tg);
                else if (t.tipo === 'grama' || t.tipo === 'flor') geoGrama.push(tg);
                else if (t.tipo === 'muro')               geoMuro.push(tg);
                else                                      geoChao.push(tg);
            }
        }

        function mergeAdd(geos, material, yOff) {
            if (!geos.length) return;
            const merged = THREE.BufferGeometryUtils
                ? THREE.BufferGeometryUtils.mergeBufferGeometries(geos)
                : geos[0]; // fallback sem utils
            if (!merged) return;
            const m = new THREE.Mesh(merged, material);
            m.receiveShadow = true;
            m.position.y = yOff || 0;
            scene.add(m);
        }

        mergeAdd(geoRua,   matCobble, 0);
        mergeAdd(geoGrama, matGrama,  0);
        mergeAdd(geoMuro,  matMuro,   0);
        mergeAdd(geoChao,  matChao,   0);

        // Mosaico da praça (disco em mármore)
        const mosaicGeo = new THREE.CircleGeometry(11, 64);
        mosaicGeo.rotateX(-Math.PI / 2);
        const mosaicMat = new THREE.MeshStandardMaterial({
            color: hex('#c9b89a'),
            roughness: 0.3,
            metalness: 0.1
        });
        const mosaicM = new THREE.Mesh(mosaicGeo, mosaicMat);
        mosaicM.position.set(PRACA_CX + 0.5, 0.01, PRACA_CY + 0.5);
        mosaicM.receiveShadow = true;
        scene.add(mosaicM);

        // Anel dourado externo da praça
        const ringGeo = new THREE.RingGeometry(9.8, 10.6, 64);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshStandardMaterial({
            color: hex('#c5a059'), roughness: 0.25, metalness: 0.55
        });
        const ringM = new THREE.Mesh(ringGeo, ringMat);
        ringM.position.set(PRACA_CX + 0.5, 0.02, PRACA_CY + 0.5);
        ringM.receiveShadow = true;
        scene.add(ringM);
    }

    // ── Casas volumétricas 2.5D ───────────────────────────────────────────────
    const CASAS = [
        { id: 'taverna',    cx: 15, cy: 12, lx: 5, ly: 4, corParede: '#d5c4a1', corTelhado: '#a93226', estilo: 'enxaimel'       },
        { id: 'forja',      cx: 34, cy: 7,  lx: 6, ly: 4, corParede: '#7f8c8d', corTelhado: '#4a235a', estilo: 'pedra'          },
        { id: 'alquimia',   cx: 66, cy: 8,  lx: 6, ly: 4, corParede: '#bdc3c7', corTelhado: '#1f618d', estilo: 'enxaimel_azul'  },
        { id: 'mansao1',    cx: 84, cy: 14, lx: 5, ly: 4, corParede: '#f5eef8', corTelhado: '#2c3e50', estilo: 'nobre'          },
        { id: 'arcanos',    cx: 88, cy: 34, lx: 4, ly: 5, corParede: '#d0ece7', corTelhado: '#6c3483', estilo: 'mistico'        },
        { id: 'guarda',     cx: 84, cy: 56, lx: 5, ly: 4, corParede: '#95a5a6', corTelhado: '#78281f', estilo: 'militar'        },
        { id: 'estalagem',  cx: 66, cy: 62, lx: 6, ly: 4, corParede: '#f9e79f', corTelhado: '#b9770e', estilo: 'enxaimel'       },
        { id: 'alfaiate',   cx: 44, cy: 66, lx: 5, ly: 4, corParede: '#fadbd8', corTelhado: '#117864', estilo: 'comercio'       },
        { id: 'biblioteca', cx: 22, cy: 62, lx: 6, ly: 4, corParede: '#e8daef', corTelhado: '#1b4f72', estilo: 'classico'       },
        { id: 'armazem',    cx: 7,  cy: 54, lx: 5, ly: 4, corParede: '#d7ccc8', corTelhado: '#8d6e63', estilo: 'rustico'        },
        { id: 'res1',       cx: 84, cy: 64, lx: 3, ly: 3, corParede: '#e0f2f1', corTelhado: '#e67e22', estilo: 'floral'         },
        { id: 'res2',       cx: 14, cy: 30, lx: 3, ly: 3, corParede: '#fff9c4', corTelhado: '#1e8449', estilo: 'herbal'         },
        { id: 'res3',       cx: 84, cy: 30, lx: 3, ly: 3, corParede: '#ede7f6', corTelhado: '#2e4053', estilo: 'luxo'           },
        { id: 'res4',       cx: 10, cy: 64, lx: 3, ly: 3, corParede: '#e1f5fe', corTelhado: '#ba4a00', estilo: 'pesca'          }
    ];

    function construirCasas() {
        CASAS.forEach(function (H) {
            const cx = H.cx, cz = H.cy;
            const lx = H.lx * 2, lz = H.ly * 2;
            const altParede = lz * 0.9 + 1.5;   // altura da parede
            const altTelhado = altParede * 0.55;

            // Texturas
            const pedraMap = gerarTexturaPedra(H.corParede);
            const telhadoMap = gerarTexturaTelhado(H.corTelhado);

            // ── Parede frontal ────────────────────────────────────────────────
            const matParede = new THREE.MeshStandardMaterial({
                map: pedraMap, roughness: 0.88, metalness: 0.02
            });
            const matTelhado = new THREE.MeshStandardMaterial({
                map: telhadoMap, roughness: 0.75, metalness: 0.0
            });

            // Corpo principal da casa (box)
            const geoParede = new THREE.BoxGeometry(lx, altParede, lz);
            const paredeM = mesh(geoParede, matParede);
            paredeM.position.set(cx, altParede / 2, cz);
            scene.add(paredeM);

            // ── Telhado (pirâmide / prisma triangular) ────────────────────────
            // Usando CylinderGeometry com 4 lados = pirâmide quadrangular
            const telhadoGeo = new THREE.CylinderGeometry(0, lx * 0.72, altTelhado, 4, 1);
            telhadoGeo.rotateY(Math.PI / 4);
            const telhadoM = mesh(telhadoGeo, matTelhado);
            telhadoM.position.set(cx, altParede + altTelhado / 2, cz);
            scene.add(telhadoM);

            // ── Chaminé ───────────────────────────────────────────────────────
            const chimneyMat = mat('#564d42');
            const chimneyGeo = new THREE.BoxGeometry(0.35, altTelhado * 0.7, 0.35);
            const chimneyM = mesh(chimneyGeo, chimneyMat);
            chimneyM.position.set(cx + lx * 0.25, altParede + altTelhado * 0.6, cz);
            scene.add(chimneyM);

            // ── Janelas emissivas ─────────────────────────────────────────────
            const janelaGeo = new THREE.BoxGeometry(0.6, 0.7, 0.05);
            const janelaMat = matEmissive('#f9e79f', '#f39c12', 0.9);
            const nJ = Math.max(1, Math.floor(lx / 2));
            for (let j = 0; j < nJ; j++) {
                const jx = cx - lx / 2 + 0.8 + j * (lx - 1) / Math.max(1, nJ - 1);
                const jM = mesh(janelaGeo, janelaMat, false);
                jM.position.set(jx, altParede * 0.65, cz - lz / 2 - 0.01);
                scene.add(jM);

                // Ponto de luz quente por janela (máx 2 por prédio para perf)
                if (j < 2) {
                    const pl = new THREE.PointLight(0xf9e079, 0.4, 4);
                    pl.position.set(jx, altParede * 0.65, cz - lz / 2 - 0.3);
                    scene.add(pl);
                }
            }

            // ── Porta ─────────────────────────────────────────────────────────
            const portaGeo = new THREE.BoxGeometry(0.7, 1.1, 0.06);
            const portaMat = mat('#3e2714', { roughness: 0.95 });
            const portaM = mesh(portaGeo, portaMat, false);
            portaM.position.set(cx, 0.55, cz - lz / 2 - 0.02);
            scene.add(portaM);
        });
    }

    // ── Muralhas externas com ameias ──────────────────────────────────────────
    function construirMuralhas() {
        const grid = global.mapaCidade.grid();
        if (!grid) return;

        const matMuroParede = mat('#5e564a', { roughness: 0.92 });
        const matAmeia = mat('#6f6658', { roughness: 0.90 });
        const altMuro = 2.2;

        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                if (!grid[l] || grid[l][c].tipo !== 'muro') continue;

                // Parede elevada
                const muroGeo = new THREE.BoxGeometry(1, altMuro, 1);
                const muroM = mesh(muroGeo, matMuroParede);
                muroM.position.set(c + 0.5, altMuro / 2, l + 0.5);
                scene.add(muroM);

                // Ameia alternada no topo
                if (c % 2 === 0 || l % 2 === 0) {
                    const ameiaGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
                    const ameiaM = mesh(ameiaGeo, matAmeia);
                    ameiaM.position.set(c + 0.5, altMuro + 0.2, l + 0.5);
                    scene.add(ameiaM);
                }
            }
        }
    }

    // ── Fonte em 3 níveis ─────────────────────────────────────────────────────
    function construirFonte() {
        const fx = PRACA_CX + 0.5;
        const fz = PRACA_CY + 0.5;

        const marmoreMat = new THREE.MeshStandardMaterial({
            color: hex('#90a4ae'), roughness: 0.25, metalness: 0.15
        });
        const aguaMat = new THREE.MeshStandardMaterial({
            color: hex('#0288d1'),
            transparent: true,
            opacity: 0.82,
            roughness: 0.1,
            metalness: 0.2,
            envMapIntensity: 1.5
        });

        // Bacia inferior
        const baciaExtGeo = new THREE.CylinderGeometry(3.2, 3.0, 0.7, 16);
        const baciaExtM = mesh(baciaExtGeo, marmoreMat);
        baciaExtM.position.set(fx, 0.35, fz);
        scene.add(baciaExtM);

        const baciaAguaGeo = new THREE.CylinderGeometry(2.8, 2.8, 0.35, 16);
        const baciaAguaM = mesh(baciaAguaGeo, aguaMat, false);
        baciaAguaM.position.set(fx, 0.6, fz);
        scene.add(baciaAguaM);
        fountainMeshes.push({ m: baciaAguaM, type: 'water' });

        // Coluna central
        const colunaGeo = new THREE.CylinderGeometry(0.22, 0.3, 2.2, 10);
        const colunaM = mesh(colunaGeo, marmoreMat);
        colunaM.position.set(fx, 1.1, fz);
        scene.add(colunaM);

        // Taça intermediária
        const tacaGeo = new THREE.CylinderGeometry(1.4, 0.25, 0.4, 12);
        const tacaM = mesh(tacaGeo, marmoreMat);
        tacaM.position.set(fx, 2.0, fz);
        scene.add(tacaM);

        const tacaAguaGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.18, 12);
        const tacaAguaM = mesh(tacaAguaGeo, aguaMat, false);
        tacaAguaM.position.set(fx, 2.15, fz);
        scene.add(tacaAguaM);
        fountainMeshes.push({ m: tacaAguaM, type: 'water_top' });

        // Topo / pináculo
        const pinaGeo = new THREE.CylinderGeometry(0.1, 0.22, 1.0, 8);
        const pinaM = mesh(pinaGeo, marmoreMat);
        pinaM.position.set(fx, 2.7, fz);
        scene.add(pinaM);

        // Ponto de luz azul no centro da fonte
        const fonteLight = new THREE.PointLight(0x00b0ff, 1.2, 8);
        fonteLight.position.set(fx, 1.5, fz);
        scene.add(fonteLight);
        fountainMeshes.push({ m: fonteLight, type: 'light' });

        // Jatos de água (cones finos translúcidos)
        const jatoMat = new THREE.MeshStandardMaterial({
            color: hex('#e0f7fa'), transparent: true, opacity: 0.55,
            roughness: 0.1, metalness: 0.0
        });
        for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2;
            const jatoGeo = new THREE.CylinderGeometry(0.04, 0.0, 1.2, 4);
            const jatoM = mesh(jatoGeo, jatoMat, false, false);
            jatoM.position.set(fx + Math.cos(ang) * 0.3, 2.6, fz + Math.sin(ang) * 0.3);
            jatoM.rotation.z = ang * 0.15 + 0.3;
            scene.add(jatoM);
            fountainMeshes.push({ m: jatoM, type: 'jet', ang: ang });
        }

        // Jato central
        const jatoCentroGeo = new THREE.CylinderGeometry(0.05, 0.0, 1.6, 4);
        const jatoCentroM = mesh(jatoCentroGeo, jatoMat, false, false);
        jatoCentroM.position.set(fx, 3.5, fz);
        scene.add(jatoCentroM);
        fountainMeshes.push({ m: jatoCentroM, type: 'jet_center' });
    }

    // ── Árvores ───────────────────────────────────────────────────────────────
    const ARVORES = [
        { cx: 8, cy: 8 }, { cx: 12, cy: 9 }, { cx: 10, cy: 13 },
        { cx: 90, cy: 8 }, { cx: 93, cy: 11 }, { cx: 90, cy: 14 },
        { cx: 92, cy: 60 }, { cx: 93, cy: 63 },
        { cx: 7, cy: 60 }, { cx: 10, cy: 58 },
        { cx: 48, cy: 68 }, { cx: 52, cy: 68 },
        { cx: 48, cy: 4 }, { cx: 52, cy: 4 }
    ];

    function construirArvores() {
        const troncoMat = mat('#3e2714', { roughness: 0.95 });
        const copaCore  = new THREE.MeshStandardMaterial({ color: hex('#145a32'), roughness: 0.85 });
        const copaLight = new THREE.MeshStandardMaterial({ color: hex('#2ecc71'), roughness: 0.80 });
        const murMat    = mat('#5d5446', { roughness: 0.92 });

        ARVORES.forEach(function (A, i) {
            const ax = A.cx + 0.5;
            const az = A.cy + 0.5;

            // Mureta circular de granito
            const murGeo = geoCyl(1.1, 1.1, 0.3, 16);
            const murM = mesh(murGeo, murMat);
            murM.position.set(ax, 0.15, az);
            scene.add(murM);

            // Tronco
            const troncoGeo = geoCyl(0.18, 0.25, 2.0, 8);
            const troncoM = mesh(troncoGeo, troncoMat);
            troncoM.position.set(ax, 1.0, az);
            scene.add(troncoM);

            // Camada base de copa
            const copa1Geo = geoSphere(1.2, 8, 6);
            const copa1M = mesh(copa1Geo, copaCore);
            copa1M.position.set(ax, 2.8, az);
            scene.add(copa1M);

            // Camada superior solar
            const copa2Geo = geoSphere(0.85, 8, 6);
            const copa2M = mesh(copa2Geo, copaLight);
            copa2M.position.set(ax - 0.15, 3.5, az);
            scene.add(copa2M);

            treeMeshes.push({ tronco: troncoM, copa1: copa1M, copa2: copa2M, phase: i * 0.6 });
        });
    }

    // ── Postes de iluminação ──────────────────────────────────────────────────
    const LAMPADAS = [
        { cx: 44, cy: 30 }, { cx: 56, cy: 30 }, { cx: 44, cy: 44 }, { cx: 56, cy: 44 },
        { cx: 44, cy: 10 }, { cx: 56, cy: 10 }, { cx: 44, cy: 64 }, { cx: 56, cy: 64 },
        { cx: 20, cy: 37 }, { cx: 30, cy: 37 }, { cx: 70, cy: 37 }, { cx: 80, cy: 37 }
    ];
    if (typeof window !== 'undefined') {
        window.CIDADE_LAMPADAS = LAMPADAS.map(function (L) {
            return { x: CID_X0 + (L.cx + 0.5) * TILE, y: (L.cy + 0.5) * TILE };
        });
    }

    function construirLampadas() {
        const ferroMat   = mat('#1c1f24', { roughness: 0.7, metalness: 0.6 });
        const laternaMat = matEmissive('#fff9c4', '#f39c12', 1.2);

        LAMPADAS.forEach(function (L, i) {
            const lx = L.cx + 0.5;
            const lz = L.cy + 0.5;

            // Haste
            const hasteGeo = geoCyl(0.07, 0.1, 2.4, 6);
            const hasteM = mesh(hasteGeo, ferroMat);
            hasteM.position.set(lx, 1.2, lz);
            scene.add(hasteM);

            // Topo ornamentado (base de latão)
            const topoGeo = geoCyl(0.18, 0.07, 0.25, 8);
            const topoM = mesh(topoGeo, mat('#37474f', { metalness: 0.4 }));
            topoM.position.set(lx, 2.55, lz);
            scene.add(topoM);

            // Lanterna emissiva
            const laternGeo = geoSphere(0.22, 8, 6);
            const laternM = mesh(laternGeo, laternaMat, false, false);
            laternM.position.set(lx, 2.8, lz);
            scene.add(laternM);

            // PointLight real
            const pl = new THREE.PointLight(0xffd070, 0.9, 7);
            pl.castShadow = false; // muitas shadow maps = lento
            pl.position.set(lx, 2.7, lz);
            scene.add(pl);
            posLights.push({ light: pl, latern: laternM, phase: i * 0.8 });
        });
    }

    // ── Barracas de feira ─────────────────────────────────────────────────────
    const BARRACAS = [
        { cx: 43, cy: 33, corToldo1: '#8e44ad', corToldo2: '#f4d03f' },
        { cx: 57, cy: 33, corToldo1: '#c0392b', corToldo2: '#ecf0f1' },
        { cx: 43, cy: 41, corToldo1: '#2980b9', corToldo2: '#f39c12' },
        { cx: 57, cy: 41, corToldo1: '#27ae60', corToldo2: '#ecf0f1' }
    ];

    function construirBarracas() {
        const madeiraM = mat('#5d4037', { roughness: 0.95 });

        BARRACAS.forEach(function (B) {
            const bx = B.cx + 0.5;
            const bz = B.cy + 0.5;

            // Bancada
            const bancadaGeo = new THREE.BoxGeometry(1.8, 0.2, 0.9);
            const bancM = mesh(bancadaGeo, madeiraM);
            bancM.position.set(bx, 0.7, bz);
            scene.add(bancM);

            // Postes do toldo
            [[bx - 0.8, bz - 0.4], [bx + 0.8, bz - 0.4]].forEach(function (p) {
                const pGeo = geoCyl(0.04, 0.04, 1.8, 4);
                const pM = mesh(pGeo, madeiraM);
                pM.position.set(p[0], 0.9, p[1]);
                scene.add(pM);
            });

            // Toldo
            const toldoGeo = new THREE.BoxGeometry(2.2, 0.08, 1.1);
            const toldoMat = mat(B.corToldo1, { roughness: 0.9 });
            const toldoM = mesh(toldoGeo, toldoMat);
            toldoM.position.set(bx, 1.82, bz - 0.15);
            scene.add(toldoM);

            // Franjas listradas (planos verticais finos)
            for (let f = 0; f < 6; f++) {
                const fGeo = new THREE.PlaneGeometry(0.28, 0.18);
                const fMat = mat(f % 2 === 0 ? B.corToldo1 : B.corToldo2);
                const fM = mesh(fGeo, fMat, false, false);
                fM.position.set(bx - 0.9 + f * 0.36, 1.72, bz + 0.4);
                scene.add(fM);
            }
        });
    }

    // ── Torres de vigia ───────────────────────────────────────────────────────
    const TORRES = [
        { cx: 2,       cy: 2        },
        { cx: COLS-3,  cy: 2        },
        { cx: 2,       cy: ROWS-3   },
        { cx: COLS-3,  cy: ROWS-3   }
    ];

    function construirTorres() {
        const pedraM = mat('#4a443a', { roughness: 0.92 });
        const telhM  = mat('#2c3e50', { roughness: 0.80 });
        const ameiaM = mat('#7a7060', { roughness: 0.90 });

        TORRES.forEach(function (T) {
            const tx = T.cx + 1.0;
            const tz = T.cy + 1.0;

            // Corpo cilíndrico
            const corpoGeo = geoCyl(1.0, 1.2, 5.0, 12);
            const corpoM = mesh(corpoGeo, pedraM);
            corpoM.position.set(tx, 2.5, tz);
            scene.add(corpoM);

            // Ameias no topo
            for (let i = 0; i < 8; i++) {
                if (i % 2 === 0) continue;
                const ang = (i / 8) * Math.PI * 2;
                const aGeo = new THREE.BoxGeometry(0.35, 0.45, 0.35);
                const aM = mesh(aGeo, ameiaM);
                aM.position.set(
                    tx + Math.cos(ang) * 0.85,
                    5.2,
                    tz + Math.sin(ang) * 0.85
                );
                scene.add(aM);
            }

            // Telhado cônico de ardósia
            const coneGeo = geoCone(1.15, 2.2, 12);
            const coneM = mesh(coneGeo, telhM);
            coneM.position.set(tx, 6.1, tz);
            scene.add(coneM);

            // Pináculo
            const pinGeo = geoCyl(0.04, 0.04, 0.5, 4);
            const pinM = mesh(pinGeo, mat('#f39c12', { metalness: 0.6 }));
            pinM.position.set(tx, 7.45, tz);
            scene.add(pinM);
        });
    }

    // ── Portal de viagem interdimensional ─────────────────────────────────────
    function construirPortal() {
        const px = gX(61824);   // PORTAL_MAPAS.x em coords Three
        const pz = gZ(1783);
        // Disco brilhante
        const discGeo = new THREE.CircleGeometry(1.5, 32);
        discGeo.rotateX(-Math.PI / 2);
        const discMat = new THREE.MeshStandardMaterial({
            color: hex('#0288d1'),
            emissive: hex('#00e5ff'),
            emissiveIntensity: 1.8,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1
        });
        const discM = new THREE.Mesh(discGeo, discMat);
        discM.position.set(px, 0.05, pz);
        scene.add(discM);

        // Anel externo
        const ringGeo = new THREE.RingGeometry(1.4, 1.7, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshStandardMaterial({
            color: hex('#00e5ff'),
            emissive: hex('#00e5ff'),
            emissiveIntensity: 2.0,
            roughness: 0.1,
            side: THREE.DoubleSide
        });
        const ringM = new THREE.Mesh(ringGeo, ringMat);
        ringM.position.set(px, 0.06, pz);
        scene.add(ringM);
        fountainMeshes.push({ m: ringM, type: 'portal_ring' });

        const pl = new THREE.PointLight(0x00e5ff, 2.0, 10);
        pl.position.set(px, 1.0, pz);
        scene.add(pl);
        fountainMeshes.push({ m: pl, type: 'portal_light' });
    }

    // ── Loop de animação ──────────────────────────────────────────────────────
    let animRunning = false;
    function startAnimLoop() {
        if (animRunning) return;
        animRunning = true;
        requestAnimationFrame(animFrame);
    }

    function animFrame(timestamp) {
        requestAnimationFrame(animFrame);
        if (!renderer || !scene || !camera) return;

        // Só renderiza se estiver na cidade
        const isCidade = (global.currentMap === 'cidade');
        if (!isCidade) {
            if (threeCanvas.style.display !== 'none') threeCanvas.style.display = 'none';
            return;
        }

        threeCanvas.style.display = 'block';
        waterTime = timestamp * 0.001;

        // Sincroniza câmera com câmera do jogo
        const wx = global.camX || (global.meuX || CID_X0 + 2000);
        const wy = global.camY || (global.meuY || 1500);
        if (Math.abs(wx - lastCamX) > 2 || Math.abs(wy - lastCamY) > 2) {
            atualizarCamera(wx + ((global.canvas && global.canvas.width ? global.canvas.width / 2 : 400)),
                            wy + ((global.canvas && global.canvas.height ? global.canvas.height / 2 : 300)));
            lastCamX = wx; lastCamY = wy;
        }

        // Anima fonte
        fountainMeshes.forEach(function (f) {
            if (f.type === 'water') {
                f.m.material.opacity = 0.75 + Math.sin(waterTime * 2.0) * 0.06;
            } else if (f.type === 'jet' || f.type === 'jet_center') {
                f.m.position.y += Math.sin(waterTime * 4 + (f.ang || 0)) * 0.005;
            } else if (f.type === 'portal_ring') {
                f.m.rotation.y = waterTime * 1.8;
                f.m.material.emissiveIntensity = 1.5 + Math.sin(waterTime * 3) * 0.5;
            } else if (f.type === 'portal_light') {
                f.m.intensity = 1.8 + Math.sin(waterTime * 2.5) * 0.4;
            }
        });

        // Anima árvores (vento)
        treeMeshes.forEach(function (tr) {
            const sway = Math.sin(waterTime * 1.5 + tr.phase) * 0.04;
            tr.copa1.position.x += sway * 0.5;
            tr.copa2.position.x += sway;
        });

        // Anima postes (flicker e ciclo dia/noite)
        const fatorLuz = (typeof global.obterFatorLuzDiaNoite === 'function') ? global.obterFatorLuzDiaNoite() : 1.0;
        posLights.forEach(function (pl) {
            if (fatorLuz <= 0.001) {
                pl.light.intensity = 0;
                pl.latern.material.emissiveIntensity = 0;
                return;
            }
            const flicker = 0.85 + Math.sin(waterTime * 3.8 + pl.phase) * 0.15;
            pl.light.intensity = 0.9 * flicker * fatorLuz;
            pl.latern.material.emissiveIntensity = 1.2 * flicker * fatorLuz;
        });

        renderer.render(scene, camera);
    }

    // ── Intercept das funções de render do jogo ───────────────────────────────
    function patchRenderLoop() {
        // Salva a função original do canvas 2D para cenário de fallback
        const orig2D = global.desenharCenarioCidade;

        global.desenharCenarioCidade = function (t) {
            // Quando na cidade, o Three.js já renderizou no canvas sobreposto
            // O canvas 2D principal é limpo apenas com o fundo escuro
            if (global.currentMap === 'cidade') {
                const ctx = global.ctx;
                if (ctx) {
                    const cw = global.canvas ? global.canvas.width  : 800;
                    const ch = global.canvas ? global.canvas.height : 600;
                    ctx.clearRect(0, 0, cw, ch);
                    // Mantém a renderização 2D para HUD, efeitos de partículas e overlay
                    // mas o fundo da cidade vem do Three.js
                }
            } else if (orig2D) {
                orig2D(t);
            }
        };

        // coletarCidadeSortables: mantém a versão 2D para os sprites de HUD
        // (os edifícios já estão no Three.js, mas NPCs/jogadores continuam 2D)
        const origSort = global.coletarCidadeSortables;
        global.coletarCidadeSortables = function (t, arr) {
            // Não adiciona mais os sprites 3D do ambiente (casas, árvores, fonte, lampadas)
            // pois já estão renderizados pelo Three.js
            // NPCs e jogadores continuam sendo adicionados pelo sistema principal
        };

        startAnimLoop();
    }

    // ── Expõe API mínima ──────────────────────────────────────────────────────
    global.mapaCidadeThree = {
        renderer: function () { return renderer; },
        scene: function () { return scene; },
        camera: function () { return camera; }
    };

})(typeof window !== 'undefined' ? window : this);

