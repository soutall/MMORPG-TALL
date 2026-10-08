(function (root, createApi) {
    const api = createApi();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) root.PetsUI = api.createPetsUI(root);
}(typeof window !== 'undefined' ? window : null, function () {
    const RARITY_LABELS = {
        comum: 'Comum',
        incomum: 'Incomum',
        raro: 'Raro',
        epico: 'Épico',
        épico: 'Épico',
        lendario: 'Lendário',
        lendário: 'Lendário'
    };

    function rarityLabel(value) {
        const normalized = String(value || '').trim().toLowerCase();
        return RARITY_LABELS[normalized] || (value ? String(value) : '—');
    }

    function listValues(value) {
        if (!Array.isArray(value)) return [];
        return value.map(function (entry) {
            if (typeof entry === 'string' || typeof entry === 'number') return String(entry);
            if (entry && typeof entry === 'object') {
                return String(entry.nome || entry.name || entry.id || entry.tipo || '');
            }
            return '';
        }).filter(Boolean);
    }

    function buildSpeciesRows(species, bestiary) {
        const entries = Array.isArray(species) ? species : [];
        const records = bestiary && typeof bestiary === 'object' ? bestiary : {};
        return entries.map(function (definition) {
            const record = records[definition.species_id] || null;
            const discovered = !!record && (
                Number(record.capturas) > 0 ||
                Number(record.monstrosMortos) > 0 ||
                listValues(record.passivasDescobertas).length > 0
            );
            return {
                species: definition,
                record: record,
                discovered: discovered
            };
        }).sort(function (left, right) {
            if (left.discovered !== right.discovered) return left.discovered ? -1 : 1;
            return left.discovered
                ? String(left.species.nome).localeCompare(String(right.species.nome), 'pt-BR')
                : 0;
        });
    }

    function buildPetRows(pets, activeId, runtimePets) {
        const instances = Array.isArray(pets) ? pets : [];
        const runtimes = runtimePets && typeof runtimePets === 'object' ? runtimePets : {};
        return instances.filter(function (pet) {
            return pet && pet.pet_instance_id;
        }).map(function (pet) {
            const runtime = runtimes[pet.pet_instance_id] || {};
            return {
                pet: Object.assign({}, pet, runtime),
                active: pet.pet_instance_id === activeId,
                runtime: runtime
            };
        });
    }

    function createPetsUI(win) {
        const doc = win.document;
        const screen = doc.getElementById('pets-screen');
        const content = doc.getElementById('pets-content');
        const summary = doc.getElementById('pets-active-summary');
        if (!screen || !content || !summary) return null;

        let profile = null;
        let runtimePets = {};
        let activeTab = 'pets';
        let selectedSpeciesId = null;
        let selectedPetId = null;
        let lastRenderSignature = '';
        let renderTimer = null;
        let profileRevision = 0;
        let runtimeRevision = 0;
        let speciesRowsCache = null;
        let speciesListNode = null;
        let speciesLayoutNode = null;
        let speciesDetailsNode = null;
        let onModeRequest = function () {};
        let onActivateRequest = function () {};

        function el(tag, className, text) {
            const node = doc.createElement(tag);
            if (className) node.className = className;
            if (text !== undefined && text !== null) node.textContent = String(text);
            return node;
        }

        function addStat(parent, label, value) {
            const stat = el('div', 'pets-stat');
            const title = el('strong', '', label + ': ');
            stat.appendChild(title);
            stat.appendChild(el('span', 'pets-stat-value',
                value === null || value === undefined || value === '' ? '—' : String(value)));
            parent.appendChild(stat);
        }

        function drawPreview(canvas, species, pet, retryCount, scaleMultiplier) {
            if (!canvas || !species || typeof win.desenharSlime !== 'function') return;
            if (pet && (pet.state === 'DEAD' || pet.state === 'RESPAWN' || Number(pet.hp) <= 0)) return;
            const context = canvas.getContext('2d');
            if (!context) return;
            const oldContext = win.ctx;
            const width = canvas.width;
            const height = canvas.height;
            context.clearRect(0, 0, width, height);
            win.ctx = context;
            try {
                win.desenharSlime(Object.assign({}, pet || {}, {
                    id: (pet && pet.pet_instance_id) || species.species_id,
                    tipo: species.tipo || (pet && pet.tipo) || species.species_id,
                    asset: (pet && pet.asset) || species.asset,
                    x: width / 2,
                    y: height * 0.76,
                    hp: Math.max(1, Number((pet && pet.hp) || 100)),
                    maxHp: Math.max(1, Number((pet && pet.maxHp) || 100)),
                    escala: (Number((pet && pet.escala) || species.escala) || 1) *
                        (Number(scaleMultiplier) || 1),
                    preview: true,
                    aiEstado: 'idle'
                }));
            } catch (error) {
                console.error('[PetsUI] Não foi possível desenhar a prévia do monstro:', error);
            } finally {
                win.ctx = oldContext;
            }
            const attempts = Number(retryCount) || 0;
            const sprite = win._slimeSprites && win._slimeSprites[(pet && pet.asset) || species.asset];
            if (attempts < 20 && !(sprite && sprite.loadFailed) &&
                !(sprite && sprite.metadata && sprite.image) && typeof win.setTimeout === 'function') {
                win.setTimeout(function () {
                    if (canvas.isConnected) {
                        drawPreview(canvas, species, pet, attempts + 1, scaleMultiplier);
                    }
                }, 160);
            }
        }

        function makePreview(species, pet, className, lazy) {
            const canvas = el('canvas', 'pets-preview' + (className ? ' ' + className : ''));
            const featured = String(className || '').split(/\s+/).indexOf('pets-preview-featured') !== -1;
            canvas.width = featured ? 256 : 128;
            canvas.height = featured ? 256 : 128;
            if (lazy && typeof win.IntersectionObserver === 'function') {
                const observer = new win.IntersectionObserver(function (entries) {
                    if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
                    observer.disconnect();
                    drawPreview(canvas, species, pet, 0, featured ? 3 : 1);
                }, { root: speciesListNode || null, rootMargin: '96px' });
                observer.observe(canvas);
            } else if (lazy && typeof win.requestIdleCallback === 'function') {
                win.requestIdleCallback(function () {
                    if (canvas.isConnected) drawPreview(canvas, species, pet, 0, featured ? 3 : 1);
                });
            } else if (lazy && typeof win.setTimeout === 'function') {
                win.setTimeout(function () {
                    if (canvas.isConnected) drawPreview(canvas, species, pet, 0, featured ? 3 : 1);
                }, 0);
            } else {
                drawPreview(canvas, species, pet, 0, featured ? 3 : 1);
            }
            return canvas;
        }

        function getProfile() {
            return profile || {
                pets: [],
                bestiario: {},
                maestria: {},
                species: [],
                petActiveId: null
            };
        }

        function renderSpeciesDetails(row) {
            const detail = el('section', 'pets-details');
            if (!row || !row.discovered) {
                detail.appendChild(el('div', 'pets-empty', 'Selecione uma espécie descoberta para ver os dados registrados.'));
                return detail;
            }

            const species = row.species;
            const record = row.record || {};
            const mastery = (getProfile().maestria || {})[species.species_id] || null;
            const owned = buildPetRows(getProfile().pets, getProfile().petActiveId, runtimePets)
                .map(function (item) { return item.pet; })
                .filter(function (pet) { return pet.species_id === species.species_id; });
            const maxRarity = owned.map(function (pet) { return pet.rarity; }).filter(Boolean)
                .sort(function (a, b) {
                    const order = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
                    return order.indexOf(String(b).toLowerCase()) - order.indexOf(String(a).toLowerCase());
                })[0];
            const header = el('div', 'pets-detail-header');
            header.appendChild(makePreview(species, null, 'pets-preview-featured'));
            const titleGroup = el('div', 'pets-detail-heading');
            titleGroup.appendChild(el('h3', 'pets-detail-name', species.nome));
            titleGroup.appendChild(el('div', 'pets-detail-subtitle', species.habitat || 'Habitat não registrado'));
            header.appendChild(titleGroup);
            detail.appendChild(header);

            const stats = el('div', 'pets-detail-grid');
            addStat(stats, 'Monstros derrotados', record.monstrosMortos);
            addStat(stats, 'Capturas', record.capturas);
            addStat(stats, 'Maior nível capturado', record.maiorLevelPet || '—');
            addStat(stats, 'Maior raridade capturada', maxRarity ? rarityLabel(maxRarity) : '—');
            detail.appendChild(stats);

            const knowledgeLevel = Math.max(0, Number(record.nivelConhecimento) || 0);
            const knowledgeXp = Math.max(0, Number(record.conhecimentoXp) || 0);
            const storedKnowledgeNext = Number(record.conhecimentoXpParaProximo);
            const knowledgeNext = Number.isFinite(storedKnowledgeNext)
                ? Math.max(0, storedKnowledgeNext)
                : (knowledgeLevel >= 10 ? 0 : 100 + knowledgeLevel * 75);
            const knowledgeBonus = Math.min(15, Math.max(0, Number(record.bonusCapturaConhecimento) || knowledgeLevel * 1.5));
            detail.appendChild(el('h4', 'pets-section-title', 'CONHECIMENTO DO INIMIGO'));
            detail.appendChild(el('div', 'pets-detail-subtitle',
                'Nível ' + knowledgeLevel + ' · ' + Number(record.monstrosMortos || 0) + ' derrotados'));
            const knowledgeMeter = el('div', 'pets-meter pets-knowledge-meter');
            const knowledgeFill = el('div', 'pets-meter-fill pets-knowledge-fill');
            knowledgeFill.style.width = knowledgeNext > 0
                ? Math.max(0, Math.min(100, knowledgeXp / knowledgeNext * 100)) + '%'
                : '100%';
            knowledgeMeter.appendChild(knowledgeFill);
            detail.appendChild(knowledgeMeter);
            detail.appendChild(el('div', 'pets-detail-subtitle', knowledgeNext > 0
                ? knowledgeXp + ' / ' + knowledgeNext + ' XP · +' + knowledgeBonus.toFixed(1) + '% chance de captura'
                : 'Conhecimento máximo · +' + knowledgeBonus.toFixed(1) + '% chance de captura'));
            detail.appendChild(el('div', 'pets-muted', 'Conhecimento do Bestiário afeta somente captura; não altera status dos Pets.'));

            detail.appendChild(el('h4', 'pets-section-title', 'MAESTRIA DA ESPÉCIE'));
            if (mastery) {
                const masteryLevel = Number(mastery.nivelMaestria || 0);
                const masteryXp = Number(mastery.xpMaestria || 0);
                const masteryNext = Number(mastery.xpParaProximo || 0);
                detail.appendChild(el('div', 'pets-detail-subtitle',
                    'Espécie: ' + species.nome + ' · Maestria Lv. ' + masteryLevel));
                detail.appendChild(el('div', 'pets-detail-subtitle',
                    masteryNext > 0 ? 'XP ' + masteryXp + ' / ' + masteryNext : 'XP ' + masteryXp));
            } else {
                detail.appendChild(el('div', 'pets-muted', 'Maestria ainda não registrada para esta espécie.'));
            }

            const skills = Array.from(new Set(listValues(record.skillsConhecidas).concat(
                owned.flatMap(function (pet) { return listValues(pet.skills); })
            )));
            const passives = Array.from(new Set(listValues(record.passivasDescobertas).concat(
                owned.flatMap(function (pet) { return listValues(pet.passivas); })
            )));
            detail.appendChild(el('h4', 'pets-section-title', 'Skills conhecidas'));
            detail.appendChild(el('div', skills.length ? 'pets-detail-subtitle' : 'pets-muted',
                skills.length ? skills.join(' · ') : 'Nenhuma registrada.'));
            detail.appendChild(el('h4', 'pets-section-title', 'Passivas conhecidas'));
            detail.appendChild(el('div', passives.length ? 'pets-detail-subtitle' : 'pets-muted',
                passives.length ? passives.join(' · ') : 'Nenhuma registrada.'));
            return detail;
        }

        function renderSpecies() {
            const data = getProfile();
            if (!speciesRowsCache) {
                speciesRowsCache = buildSpeciesRows(data.species, data.bestiario);
                speciesListNode = el('div', 'pets-list');
                speciesRowsCache.forEach(function (row) {
                    const button = el('button', 'pets-list-row' + (row.discovered ? '' : ' desconhecida'));
                    button.type = 'button';
                    button.dataset.speciesId = row.species.species_id;
                    if (row.discovered) {
                        button.appendChild(makePreview(row.species, null, '', true));
                        const title = el('span', 'pets-row-title', row.species.nome);
                        const knowledgeLevel = Number((row.record && row.record.nivelConhecimento) || 0);
                        title.appendChild(el('span', 'pets-row-meta',
                            'Capturas: ' + Number((row.record && row.record.capturas) || 0) +
                            ' · Conhecimento Lv. ' + knowledgeLevel));
                        button.appendChild(title);
                    } else {
                        button.appendChild(el('span', 'pets-preview', '❔'));
                        button.appendChild(el('span', 'pets-row-title', 'Espécie desconhecida'));
                    }
                    button.addEventListener('click', function () {
                        if (!row.discovered) return;
                        selectedSpeciesId = row.species.species_id;
                        atualizarSelecaoEspecie();
                    });
                    speciesListNode.appendChild(button);
                });
                speciesLayoutNode = el('div', 'pets-layout');
                speciesDetailsNode = el('section', 'pets-details');
                speciesLayoutNode.appendChild(speciesListNode);
                speciesLayoutNode.appendChild(speciesDetailsNode);
            }
            const rows = speciesRowsCache;
            let selected = rows.find(function (row) { return row.species.species_id === selectedSpeciesId && row.discovered; });
            if (!selected) selected = rows.find(function (row) { return row.discovered; }) || null;
            selectedSpeciesId = selected ? selected.species.species_id : null;

            atualizarSelecaoEspecie();
            if (content.firstChild !== speciesLayoutNode) content.replaceChildren(speciesLayoutNode);
        }

        function atualizarSelecaoEspecie() {
            if (!speciesRowsCache || !speciesListNode || !speciesDetailsNode) return;
            const selected = speciesRowsCache.find(function (row) {
                return row.species.species_id === selectedSpeciesId && row.discovered;
            }) || null;
            speciesListNode.querySelectorAll('[data-species-id]').forEach(function (button) {
                button.classList.toggle('ativo', button.dataset.speciesId === selectedSpeciesId);
            });
            speciesDetailsNode.replaceChildren(renderSpeciesDetails(selected));
        }

        function invalidarCacheBestiario() {
            speciesRowsCache = null;
            speciesListNode = null;
            speciesLayoutNode = null;
            speciesDetailsNode = null;
        }

        function renderPetDetails(item) {
            const detail = el('section', 'pets-details');
            if (!item) {
                detail.appendChild(el('div', 'pets-empty', 'Selecione um Pet para ver os detalhes.'));
                return detail;
            }
            const pet = item.pet;
            const species = (getProfile().species || []).find(function (entry) {
                return entry.species_id === pet.species_id;
            }) || { species_id: pet.species_id, nome: pet.nome || pet.species_id, tipo: pet.tipo || pet.species_id };
            const header = el('div', 'pets-detail-header');
            header.appendChild(makePreview(species, pet));
            const titleGroup = el('div');
            titleGroup.appendChild(el('h3', 'pets-detail-name', pet.nome || species.nome || species.species_id));
            titleGroup.appendChild(el('div', 'pets-detail-subtitle',
                species.nome + (item.active ? ' · PET ATIVO' : ' · INATIVO')));
            header.appendChild(titleGroup);
            detail.appendChild(header);

            const maxHp = Math.max(1, Number(pet.maxHp || pet.max_hp || pet.status && pet.status.vida || 1));
            const hp = Math.max(0, Math.min(maxHp, Number(pet.hp ?? (pet.status && pet.status.vida) ?? 0)));
            const hpTitle = el('h4', 'pets-section-title', 'HP ' + hp + ' / ' + maxHp);
            detail.appendChild(hpTitle);
            const meter = el('div', 'pets-meter');
            const fill = el('div', 'pets-meter-fill');
            fill.style.width = (hp / maxHp * 100) + '%';
            meter.appendChild(fill);
            detail.appendChild(meter);

            const stats = el('div', 'pets-detail-grid');
            addStat(stats, 'Raridade', rarityLabel(pet.rarity));
            addStat(stats, 'Nível do Pet', Number(pet.level || pet.pet_level || 1));
            const totalPetXp = Math.max(0, Number(pet.pet_xp ?? pet.xp ?? 0));
            let petXpProgress = Number(pet.pet_xp_progress);
            let petXpToNext = Number(pet.pet_xp_to_next);
            if (!Number.isFinite(petXpProgress) || !(petXpToNext > 0)) {
                let remainingXp = totalPetXp;
                let calculatedLevel = 1;
                while (remainingXp >= 90 + calculatedLevel * 90) {
                    remainingXp -= 90 + calculatedLevel * 90;
                    calculatedLevel += 1;
                }
                petXpProgress = remainingXp;
                petXpToNext = 90 + calculatedLevel * 90;
            }
            addStat(stats, 'XP para próximo nível', petXpProgress + ' / ' + petXpToNext);
            addStat(stats, 'Potencial', Number(pet.potencial ?? pet.potential ?? 0) + ' / 100');
            addStat(stats, 'Estado', pet.state || (item.active ? 'INATIVO' : 'INATIVO'));
            addStat(stats, 'Modo', pet.mode || '—');
            detail.appendChild(stats);

            const attributes = pet.status && typeof pet.status === 'object' ? pet.status : pet.atributos;
            if (attributes && typeof attributes === 'object') {
                detail.appendChild(el('h4', 'pets-section-title', 'Atributos'));
                const attrGrid = el('div', 'pets-detail-grid');
                Object.entries(attributes).forEach(function (entry) {
                    addStat(attrGrid, entry[0], entry[1]);
                });
                detail.appendChild(attrGrid);
            }

            detail.appendChild(el('h4', 'pets-section-title', 'Passivas'));
            const passives = listValues(pet.passivas);
            detail.appendChild(el('div', passives.length ? 'pets-detail-subtitle' : 'pets-muted',
                passives.length ? passives.join(' · ') : 'Nenhuma passiva registrada.'));
            detail.appendChild(el('h4', 'pets-section-title', 'Traits'));
            const traits = listValues(pet.traits);
            detail.appendChild(el('div', traits.length ? 'pets-detail-subtitle' : 'pets-muted',
                traits.length ? traits.join(' · ') : 'Nenhum trait registrado.'));
            detail.appendChild(el('h4', 'pets-section-title', 'Skills do Pet'));
            const skills = listValues(pet.skills);
            detail.appendChild(el('div', skills.length ? 'pets-detail-subtitle' : 'pets-muted',
                skills.length ? skills.join(' · ') : 'Nenhuma skill registrada.'));

            const controls = el('div', 'pets-mode-controls');
            if (item.active) {
                ['ATK', 'DEFESA', 'PARADO'].forEach(function (mode) {
                    const button = el('button', 'pets-mode-button' + (pet.mode === mode ? ' ativo' : ''), mode);
                    button.type = 'button';
                    button.dataset.mode = mode;
                    button.disabled = hp <= 0 || pet.state === 'DEAD' || pet.state === 'RESPAWN';
                    button.addEventListener('click', function () {
                        onModeRequest(mode, pet.pet_instance_id);
                    });
                    controls.appendChild(button);
                });
                detail.appendChild(el('h4', 'pets-section-title', 'Comportamento do Pet ativo'));
                detail.appendChild(controls);
                const deactivate = el('button', 'pets-mode-button', 'Desequipar pet');
                deactivate.type = 'button';
                deactivate.addEventListener('click', function () {
                    onActivateRequest(null);
                });
                detail.appendChild(deactivate);
            } else {
                const equip = el('button', 'pets-mode-button', 'Equipar pet');
                equip.type = 'button';
                equip.addEventListener('click', function () {
                    onActivateRequest(pet.pet_instance_id);
                });
                controls.appendChild(equip);
                detail.appendChild(el('div', 'pets-muted', 'Pet inativo no momento.'));
                detail.appendChild(controls);
            }
            return detail;
        }

        function renderPets() {
            const data = getProfile();
            const rows = buildPetRows(data.pets, data.petActiveId, runtimePets);
            const layout = el('div', 'pets-layout');
            const list = el('div', 'pets-list');
            let selected = rows.find(function (item) { return item.pet.pet_instance_id === selectedPetId; });
            if (!selected) selected = rows.find(function (item) { return item.active; }) || rows[0] || null;
            selectedPetId = selected ? selected.pet.pet_instance_id : null;

            if (!rows.length) {
                list.appendChild(el('div', 'pets-empty', 'Você ainda não possui Pets. Capture um monstro normal para começar.'));
            }
            rows.forEach(function (item) {
                const pet = item.pet;
                const species = (data.species || []).find(function (entry) { return entry.species_id === pet.species_id; }) ||
                    { species_id: pet.species_id, nome: pet.nome || pet.species_id, tipo: pet.tipo || pet.species_id };
                const button = el('button', 'pets-list-row' +
                    (selected && selected.pet.pet_instance_id === pet.pet_instance_id ? ' ativo' : ''));
                button.type = 'button';
                button.dataset.petInstanceId = pet.pet_instance_id;
                button.appendChild(makePreview(species, pet, '', true));
                const title = el('span', 'pets-row-title', pet.nome || species.nome);
                title.appendChild(el('span', 'pets-row-meta',
                    rarityLabel(pet.rarity) + ' · Lv. ' + Number(pet.level || pet.pet_level || 1) +
                    (item.active ? ' · Ativo' : ' · Inativo')));
                button.appendChild(title);
                button.addEventListener('click', function () {
                    selectedPetId = pet.pet_instance_id;
                    render(true);
                });
                list.appendChild(button);
            });
            layout.appendChild(list);
            layout.appendChild(renderPetDetails(selected));
            content.replaceChildren(layout);
        }

        function render(force) {
            if (!profile || !screen.classList.contains('ativo')) return;
            const activePetInstance = (profile.pets || []).find(function (pet) {
                return pet.pet_instance_id === profile.petActiveId;
            });
            const activePet = activePetInstance ? Object.assign({}, activePetInstance,
                runtimePets[activePetInstance.pet_instance_id] || {}) : null;
            summary.textContent = activePet
                ? 'Pet ativo: ' + (activePet.nome || activePet.species_id) +
                    ' · ' + (activePet.state || 'INATIVO') + ' · ' + (activePet.mode || '—')
                : 'Nenhum Pet ativo';

            const signature = [
                activeTab,
                profileRevision,
                activeTab === 'pets' ? runtimeRevision : 0,
                selectedSpeciesId || '',
                selectedPetId || ''
            ].join('|');
            if (!force && signature === lastRenderSignature) return;
            lastRenderSignature = signature;
            if (activeTab === 'bestiary') renderSpecies();
            else renderPets();
        }

        function open(tab) {
            if (!profile) {
                if (typeof win.mostrarToast === 'function') win.mostrarToast('Entre no jogo para carregar seus Pets.');
                return;
            }
            activeTab = tab === 'bestiary' ? 'bestiary' : 'pets';
            screen.classList.add('ativo');
            screen.setAttribute('aria-hidden', 'false');
            render(true);
        }

        function close() {
            screen.classList.remove('ativo');
            screen.setAttribute('aria-hidden', 'true');
        }

        function setProfile(value) {
            if (!value || typeof value !== 'object') return;
            profile = Object.assign({
                pets: [],
                bestiario: {},
                maestria: {},
                species: [],
                petActiveId: null
            }, value);
            profileRevision++;
            invalidarCacheBestiario();
            win.petProfileAtual = profile;
            selectedPetId = profile.petActiveId || selectedPetId;
            lastRenderSignature = '';
            render(true);
        }

        function setRuntime(pets) {
            runtimePets = pets && typeof pets === 'object' ? pets : {};
            runtimeRevision++;
            if (!screen.classList.contains('ativo')) return;
            if (renderTimer) return;
            renderTimer = win.setTimeout(function () {
                renderTimer = null;
                render(false);
            }, 250);
        }

        function setMode(mode, petInstanceId) {
            if (!profile || !Array.isArray(profile.pets)) return;
            const pet = profile.pets.find(function (entry) { return entry.pet_instance_id === petInstanceId; });
            if (!pet || profile.petActiveId !== petInstanceId) return;
            pet.mode = mode;
            profileRevision++;
            lastRenderSignature = '';
            render(true);
        }

        function setModeRequester(handler) {
            if (typeof handler === 'function') onModeRequest = handler;
        }

        function setActivateRequester(handler) {
            if (typeof handler === 'function') onActivateRequest = handler;
        }

        doc.getElementById('pets-close').addEventListener('click', close);
        doc.getElementById('pets-capture').addEventListener('click', function () {
            if (typeof win.solicitarCapturaPetUI === 'function') {
                win.solicitarCapturaPetUI();
            } else {
                console.error('[PetsUI] O cliente não disponibilizou o envio de captura.');
            }
        });
        screen.addEventListener('click', function (event) {
            if (event.target === screen) close();
        });
        doc.querySelectorAll('.pets-tab').forEach(function (button) {
            button.addEventListener('click', function () {
                activeTab = button.dataset.petsTab === 'bestiary' ? 'bestiary' : 'pets';
                doc.querySelectorAll('.pets-tab').forEach(function (tab) {
                    tab.classList.toggle('ativo', tab === button);
                });
                lastRenderSignature = '';
                render(true);
            });
        });
        onModeRequest = function (mode, petInstanceId) {
            if (typeof win.solicitarModoPetUI === 'function') {
                win.solicitarModoPetUI(mode, petInstanceId);
            } else {
                console.error('[PetsUI] O cliente não disponibilizou o envio seguro de modo.');
            }
        };

        onActivateRequest = function (petInstanceId) {
            if (petInstanceId) {
                if (typeof win.solicitarEquiparPetUI === 'function') {
                    win.solicitarEquiparPetUI(petInstanceId);
                } else {
                    console.error('[PetsUI] O cliente não disponibilizou o envio de equipar pet.');
                }
            } else if (typeof win.solicitarDesequiparPetUI === 'function') {
                win.solicitarDesequiparPetUI();
            } else {
                console.error('[PetsUI] O cliente não disponibilizou o envio de desequipar pet.');
            }
        };

        const instance = {
            open: open,
            close: close,
            setProfile: setProfile,
            setRuntime: setRuntime,
            setMode: setMode,
            setModeRequester: setModeRequester,
            setActivateRequester: setActivateRequester,
            buildSpeciesRows: buildSpeciesRows,
            buildPetRows: buildPetRows
        };
        instance.setModeRequester(onModeRequest);
        instance.setActivateRequester(onActivateRequest);
        return instance;
    }

    return {
        rarityLabel: rarityLabel,
        listValues: listValues,
        buildSpeciesRows: buildSpeciesRows,
        buildPetRows: buildPetRows,
        createPetsUI: createPetsUI
    };
}));
