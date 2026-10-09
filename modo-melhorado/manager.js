(function (root, factory) {
    'use strict';

    const api = factory(root);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.EnhancedModeCore = api;

    if (typeof window !== 'undefined' && root === window) {
        root.EnhancedMode = api.createEnhancedMode({
            modules: root.EnhancedModeModules || {},
            query: root.location.search
        });
        root.EnhancedMode.init(root.document);
    }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
    'use strict';

    function createEnhancedMode(options) {
        options = options || {};
        const modules = options.modules || {};
        const moduleNames = Object.keys(modules);
        const query = new URLSearchParams(options.query || '');
        const disabledModules = new Set((query.get('enhancedOff') || '').split(',').filter(Boolean));
        const moduleEnabled = {};
        let enabled = query.get('enhanced') === '1' || query.get('enhanced') === 'true';
        let reducedMotion = false;
        let toastTimer = null;
        let doc = null;

        moduleNames.forEach(function (name) { moduleEnabled[name] = !disabledModules.has(name); });

        function setModuleEnabled(name, value) {
            if (!Object.prototype.hasOwnProperty.call(moduleEnabled, name)) return false;
            moduleEnabled[name] = !!value;
            if (typeof modules[name].setEnabled === 'function') {
                modules[name].setEnabled(enabled && moduleEnabled[name]);
            }
            return true;
        }

        function syncControls() {
            if (!doc) return;
            const modeControl = doc.getElementById('enhanced-mode-toggle');
            const motionControl = doc.getElementById('enhanced-reduce-motion');
            if (modeControl) modeControl.checked = enabled;
            if (motionControl) motionControl.checked = reducedMotion;
        }

        function showNotice() {
            if (!doc || !doc.body) return;
            let toast = doc.getElementById('enhanced-mode-notice');
            if (!toast) {
                toast = doc.createElement('div');
                toast.id = 'enhanced-mode-notice';
                toast.className = 'enhanced-mode-notice';
                toast.setAttribute('role', 'status');
                toast.setAttribute('aria-live', 'polite');
                doc.body.appendChild(toast);
            }
            toast.textContent = 'Modo Melhorado ' + (enabled ? 'ativado' : 'desativado');
            toast.classList.add('visible');
            if (toastTimer !== null) rootClearTimeout(toastTimer);
            toastTimer = rootSetTimeout(function () {
                toast.classList.remove('visible');
                toastTimer = null;
            }, 1500);
        }

        function rootClearTimeout(timer) {
            if (typeof clearTimeout === 'function') clearTimeout(timer);
        }

        function rootSetTimeout(callback, delay) {
            return typeof setTimeout === 'function' ? setTimeout(callback, delay) : null;
        }

        function setEnabled(value, silent) {
            const next = !!value;
            if (enabled === next) {
                syncControls();
                return enabled;
            }
            enabled = next;
            moduleNames.forEach(function (name) {
                if (typeof modules[name].setEnabled === 'function') {
                    modules[name].setEnabled(enabled && moduleEnabled[name]);
                }
            });
            syncControls();
            if (!silent) showNotice();
            return enabled;
        }

        function setReducedMotion(value) {
            reducedMotion = !!value;
            syncControls();
            return reducedMotion;
        }

        function getFrameState(state, dt) {
            const frameState = Object.assign(frameStateCache, state || {});
            frameState.reducedMotion = reducedMotion;
            frameState.dt = Math.max(0, Math.min(3, Number(dt) || 0));
            return frameState;
        }

        const frameStateCache = {};

        function update(dt, state) {
            if (!enabled) return { x: 0, y: 0 };
            const frameState = getFrameState(state, dt);
            let cameraOffset = { x: 0, y: 0 };
            moduleNames.forEach(function (name) {
                if (moduleEnabled[name] && typeof modules[name].update === 'function') {
                    const result = modules[name].update(frameState.dt, frameState);
                    if (name === 'camera' && result) cameraOffset = result;
                }
            });
            return cameraOffset;
        }

        function renderShadows(ctx, state) {
            if (!enabled || !moduleEnabled.shadows || typeof modules.shadows.render !== 'function') return;
            modules.shadows.render(ctx, getFrameState(state, 0));
        }

        function renderEffects(ctx, state) {
            if (!enabled) return;
            const frameState = getFrameState(state, 0);
            ['atmosphere', 'combat'].forEach(function (name) {
                if (moduleEnabled[name] && typeof modules[name].render === 'function') {
                    modules[name].render(ctx, frameState);
                }
            });
        }

        function handleNetworkEvent(message) {
            if (!enabled || !message || !Number.isFinite(Number(message.x)) || !Number.isFinite(Number(message.y))) return;
            const impactTypes = {
                monster_skill_impact: 'impact',
                boss_golem_impacto: 'boss',
                action_ladino_estrela_impacto: 'boss',
                boss_golem_morte: 'boss'
            };
            const kind = impactTypes[message.type];
            if (!kind) return;
            const event = {
                x: Number(message.x),
                y: Number(message.y),
                kind: kind,
                angle: Number(message.angle) || 0
            };
            if (!reducedMotion && moduleEnabled.combat && typeof modules.combat.impact === 'function') {
                modules.combat.impact(event);
            }
            if (moduleEnabled.camera && typeof modules.camera.impact === 'function') {
                modules.camera.impact(kind === 'boss' ? 1.25 : 0.65);
            }
        }

        function init(documentRef) {
            doc = documentRef || null;
            const motionPreference = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
            reducedMotion = !!motionPreference;
            const startEnabled = enabled;
            enabled = false;
            moduleNames.forEach(function (name) {
                if (typeof modules[name].setEnabled === 'function') modules[name].setEnabled(false);
            });
            const modeControl = doc && doc.getElementById('enhanced-mode-toggle');
            const motionControl = doc && doc.getElementById('enhanced-reduce-motion');
            if (modeControl) {
                modeControl.addEventListener('change', function () { setEnabled(modeControl.checked); });
            }
            if (motionControl) {
                motionControl.addEventListener('change', function () { setReducedMotion(motionControl.checked); });
            }
            if (root.addEventListener) {
                root.addEventListener('keydown', function (event) {
                    const target = event.target;
                    const isEditable = target && (target.isContentEditable ||
                        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
                    if (event.key === 'F8' && !isEditable) {
                        event.preventDefault();
                        setEnabled(!enabled);
                    }
                });
            }
            setEnabled(startEnabled, true);
            syncControls();
            return this;
        }

        return {
            init: init,
            toggle: function () { return setEnabled(!enabled); },
            setEnabled: setEnabled,
            setReducedMotion: setReducedMotion,
            setModuleEnabled: setModuleEnabled,
            update: update,
            renderShadows: renderShadows,
            renderEffects: renderEffects,
            handleNetworkEvent: handleNetworkEvent,
            isEnabled: function () { return enabled; },
            isReducedMotion: function () { return reducedMotion; },
            getModuleState: function () { return Object.assign({}, moduleEnabled); }
        };
    }

    return { createEnhancedMode: createEnhancedMode };
});
