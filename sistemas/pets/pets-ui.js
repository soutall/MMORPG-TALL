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
        let onModeRequest = function () {};

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
            stat.appendChild(doc.createTextNode(value === null || value === undefined || value === '' ? '—' : String(value)));
            parent.appendChild(stat);
        }

        function drawPreview(canvas, species, pet) {
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
                    tipo: species.tipo || species.species_id,
                    x: width / 2,
                    y: height * 0.76,
                    hp: Math.max(1, Number((pet && pet.hp) || 100)),
                    maxHp: Math.max(1, Number((pet && pet.maxHp) || 100)),
                    escala: Math.min(1, Number((pet && pet.escala) || 1)),
                    aiEstado: 'idle'
                }));
            } catch (error) {
                console.error('[PetsUI] Não foi possível desenhar a prévia do monstro:', error);
            } finally {
                win.ctx = oldContext;
            }
        }

        function makePreview(species, pet, className) {
            const canvas = el('canvas', 'pets-preview' + (className ? ' ' + className : ''));
            canvas.width = 128;
            canvas.height = 128;
            drawPreview(canvas, species, pet);
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
            header.appendChild(makePreview(species, null));
            const titleGroup = el('div');
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
            const rows = buildSpeciesRows(data.species, data.bestiario);
            const layout = el('div', 'pets-layout');
            const list = el('div', 'pets-list');
            let selected = rows.find(function (row) { return row.species.species_id === selectedSpeciesId && row.discovered; });
            if (!selected) selected = rows.find(function (row) { return row.discovered; }) || null;
            selectedSpeciesId = selected ? selected.species.species_id : null;

            rows.forEach(function (row) {
                const button = el('button', 'pets-list-row' +
                    (row.discovered ? '' : ' desconhecida') +
                    (selected && selected.species.species_id === row.species.species_id ? ' ativo' : ''));
                button.type = 'button';
                button.dataset.speciesId = row.species.species_id;
                if (row.discovered) {
                    button.appendChild(makePreview(row.species, null));
                    const title = el('span', 'pets-row-title', row.species.nome);
                    title.appendChild(el('span', 'pets-row-meta', 'Capturas: ' + Number((row.record && row.record.capturas) || 0)));
                    button.appendChild(title);
                } else {
                    button.appendChild(el('span', 'pets-preview', '❔'));
                    button.appendChild(el('span', 'pets-row-title', 'Espécie desconhecida'));
                }
                button.addEventListener('click', function () {
                    if (!row.discovered) return;
                    selectedSpeciesId = row.species.species_id;
                    render(true);
                });
                list.appendChild(button);
            });
            layout.appendChild(list);
            layout.appendChild(renderSpeciesDetails(selected));
            content.replaceChildren(layout);
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
            addStat(stats, 'XP do Pet', Number(pet.pet_xp ?? pet.xp ?? 0) +
                (Number(pet.pet_xp_to_next) > 0 ? ' / ' + Number(pet.pet_xp_to_next) : ''));
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

            if (item.active) {
                const controls = el('div', 'pets-mode-controls');
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
            } else {
                detail.appendChild(el('div', 'pets-muted', 'Troca de Pet ativo não está disponível.'));
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
                button.appendChild(makePreview(species, pet));
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
            const activePet = buildPetRows(profile.pets, profile.petActiveId, runtimePets)
                .find(function (item) { return item.active; });
            summary.textContent = activePet
                ? 'Pet ativo: ' + (activePet.pet.nome || activePet.pet.species_id) +
                    ' · ' + (activePet.pet.state || 'INATIVO') + ' · ' + (activePet.pet.mode || '—')
                : 'Nenhum Pet ativo';

            const signature = JSON.stringify({
                tab: activeTab,
                profile: profile,
                runtime: buildPetRows(profile.pets, profile.petActiveId, runtimePets).map(function (item) {
                    return {
                        id: item.pet.pet_instance_id,
                        hp: item.pet.hp,
                        maxHp: item.pet.maxHp,
                        state: item.pet.state,
                        mode: item.pet.mode,
                        level: item.pet.level
                    };
                }),
                selectedSpeciesId: selectedSpeciesId,
                selectedPetId: selectedPetId
            });
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
            win.petProfileAtual = profile;
            selectedPetId = profile.petActiveId || selectedPetId;
            lastRenderSignature = '';
            render(true);
        }

        function setRuntime(pets) {
            runtimePets = pets && typeof pets === 'object' ? pets : {};
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
            lastRenderSignature = '';
            render(true);
        }

        function setModeRequester(handler) {
            if (typeof handler === 'function') onModeRequest = handler;
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

        return {
            open: open,
            close: close,
            setProfile: setProfile,
            setRuntime: setRuntime,
            setMode: setMode,
            setModeRequester: setModeRequester,
            buildSpeciesRows: buildSpeciesRows,
            buildPetRows: buildPetRows
        };
    }

    return {
        rarityLabel: rarityLabel,
        listValues: listValues,
        buildSpeciesRows: buildSpeciesRows,
        buildPetRows: buildPetRows,
        createPetsUI: createPetsUI
    };
}));
