// HWUI renderer tweak

let hwuiCurrentState = {};
let hwuiSavedState = {};
let hwuiPendingState = {};
let hwuiReferenceState = {};
let hwuiDefaultState = {};

const HWUI_RENDERERS = ['default', 'skiavk', 'skiagl'];
const runHwuiBackend = (...args) => window.runTweakBackend('hwui', ...args);

function normalizeHwuiRenderer(value) {
    const renderer = String(value || 'default');
    return HWUI_RENDERERS.includes(renderer) ? renderer : 'default';
}

function getHwuiRendererLabel(renderer) {
    const translate = (key, fallback) => {
        const value = window.t ? window.t(key) : '';
        const text = String(value || '');
        return text && text !== key && !text.startsWith('@') ? text : fallback;
    };

    const labels = {
        default: translate('tweaks.hwui.default', 'Default'),
        skiavk: 'Vulkan',
        skiagl: 'OpenGL'
    };
    return labels[normalizeHwuiRenderer(renderer)] || labels.default;
}

async function loadHwuiState() {
    try {
        const { current, saved } = await window.loadTweakState('hwui');

        hwuiCurrentState = {
            ...current,
            renderer: normalizeHwuiRenderer(current.renderer)
        };
        hwuiDefaultState = {
            renderer: 'default',
            ...window.getDefaultTweakPreset('hwui')
        };
        hwuiDefaultState.renderer = normalizeHwuiRenderer(hwuiDefaultState.renderer);
        hwuiSavedState = window.buildSparseStateAgainstDefaults(saved, hwuiDefaultState);

        hwuiReferenceState = window.initPendingState(hwuiCurrentState, hwuiSavedState, hwuiDefaultState);
        hwuiReferenceState.renderer = normalizeHwuiRenderer(hwuiReferenceState.renderer);
        hwuiPendingState = { ...hwuiReferenceState };

        renderHwuiCard();
    } catch (e) {
        console.error('Failed to load HWUI state:', e);
    }
}
window.loadHwuiState = loadHwuiState;

function renderHwuiCard() {
    const pendingRenderer = normalizeHwuiRenderer(hwuiPendingState.renderer);

    const options = document.getElementById('hwui-renderer-options');
    if (options) {
        options.querySelectorAll('.option-btn').forEach((btn) => {
            btn.classList.toggle('selected', btn.dataset.renderer === pendingRenderer);
        });
    }

    const activeEl = document.getElementById('hwui-current-renderer');
    if (activeEl) {
        activeEl.textContent = getHwuiRendererLabel(hwuiCurrentState.renderer);
    }

    const defaultEl = document.getElementById('hwui-rom-default');
    if (defaultEl) {
        defaultEl.textContent = hwuiCurrentState.rom_default || hwuiDefaultState.rom_default || 'Unknown';
    }

    updateHwuiPendingIndicator();
}

function updateHwuiPendingIndicator() {
    const pendingRenderer = normalizeHwuiRenderer(hwuiPendingState.renderer);
    const referenceRenderer = normalizeHwuiRenderer(hwuiReferenceState.renderer);
    window.setPendingIndicator('hwui-pending-indicator', pendingRenderer !== referenceRenderer);
}

function selectHwuiRenderer(renderer) {
    hwuiPendingState.renderer = normalizeHwuiRenderer(renderer);
    renderHwuiCard();
}

function getHwuiCardTitle() {
    const title = document.querySelector('#hwui-card .card-title')?.textContent?.trim();
    return title || (window.t ? window.t('tweaks.hwui.title') : 'HWUI Renderer');
}

async function maybeShowHwuiRebootModal() {
    if (typeof window.showTweakRebootRequiredModal === 'function') {
        await window.showTweakRebootRequiredModal([getHwuiCardTitle()]);
    }
}

async function saveHwui(options = {}) {
    const normalizedState = {
        renderer: normalizeHwuiRenderer(hwuiPendingState.renderer)
    };
    const sparseState = window.buildSparseStateAgainstDefaults(normalizedState, hwuiDefaultState);
    const args = Object.entries(sparseState).map(([key, value]) => `${key}=${value}`);
    const result = await runHwuiBackend('save', ...args);

    if (result && result.includes('saved')) {
        hwuiSavedState = { ...sparseState };
        hwuiReferenceState = window.initPendingState(hwuiCurrentState, hwuiSavedState, hwuiDefaultState);
        hwuiReferenceState.renderer = normalizeHwuiRenderer(hwuiReferenceState.renderer);
        hwuiPendingState = { ...hwuiReferenceState };
        showToast(window.t ? window.t('toast.settingsSaved') : 'Settings saved');
        renderHwuiCard();
        return true;
    } else {
        showToast(window.t ? window.t('toast.settingsFailed') : 'Failed to apply settings', true);
        return false;
    }
}

async function applyHwui() {
    const renderer = normalizeHwuiRenderer(hwuiPendingState.renderer);
    const result = await runHwuiBackend('apply', renderer);

    if (result && result.includes('applied')) {
        showToast(window.t ? window.t('toast.settingsApplied') : 'Settings applied');
        const currentOutput = await runHwuiBackend('get_current');
        hwuiCurrentState = parseKeyValue(currentOutput);
        hwuiCurrentState.renderer = normalizeHwuiRenderer(hwuiCurrentState.renderer);
        renderHwuiCard();
    } else {
        showToast(window.t ? window.t('toast.settingsFailed') : 'Failed to apply settings', true);
    }
}

function initHwuiTweak() {
    const options = document.getElementById('hwui-renderer-options');
    if (options) {
        options.querySelectorAll('.option-btn').forEach((btn) => {
            btn.addEventListener('click', () => selectHwuiRenderer(btn.dataset.renderer));
        });
    }

    bindHwuiButtons();
    loadHwuiState();

    if (typeof window.registerTweak === 'function') {
        window.registerTweak('hwui', {
            getState: () => ({ renderer: normalizeHwuiRenderer(hwuiPendingState.renderer) }),
            setState: (config) => {
                hwuiPendingState = {
                    ...hwuiPendingState,
                    renderer: normalizeHwuiRenderer(config?.renderer)
                };
                renderHwuiCard();
            },
            render: renderHwuiCard,
            save: saveHwui,
            apply: applyHwui
        });
    }
}

function bindHwuiButtons() {
    const btnSave = document.getElementById('hwui-btn-save');
    const btnApply = document.getElementById('hwui-btn-apply');
    const btnSaveApply = document.getElementById('hwui-btn-save-apply');

    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            const saved = await saveHwui();
            if (saved) {
                await maybeShowHwuiRebootModal();
            }
        });
    }
    if (btnApply) {
        btnApply.addEventListener('click', () => applyHwui());
    }
    if (btnSaveApply) {
        btnSaveApply.addEventListener('click', async () => {
            const saved = await saveHwui();
            if (saved) {
                await applyHwui();
                await maybeShowHwuiRebootModal();
            }
        });
    }
}

document.addEventListener('languageChanged', () => {
    if (document.getElementById('hwui-card')) {
        renderHwuiCard();
    }
});
