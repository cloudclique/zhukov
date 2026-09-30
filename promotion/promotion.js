// ==========================================================================
// ZHUKOV Studio — Promotion Page Block-Based Layout Builder Engine
// Full visual builder for Admin with clean native rendering for visitors
// ==========================================================================

const STORAGE_KEY = 'zhukov_promotion_builder_data';

// Default starter template for new visitors / reset
const DEFAULT_PAGE_DATA = [
    {
        id: 'row_' + Date.now() + '_1',
        layout: '1',
        spacing: 'medium',
        bg: 'transparent',
        columns: [
            {
                id: 'col_1_1',
                blocks: [
                    { id: 'b_1', type: 'badge', text: 'SPECIAL PROMOTION • LIMITED SESSIONS', color: 'crimson', align: 'center' },
                    { id: 'b_2', type: 'title', text: 'EDITORIAL PROMOTION', level: 'h1', align: 'center' },
                    { id: 'b_3', type: 'subtitle', text: 'EXCLUSIVE ATELIER SESSIONS & CURATED COMMISSIONS', color: 'muted', align: 'center' },
                    { id: 'b_4', type: 'spacer', height: 24, line: 'none' }
                ]
            }
        ]
    },
    {
        id: 'row_' + Date.now() + '_2',
        layout: '2-equal',
        spacing: 'medium',
        bg: 'card',
        columns: [
            {
                id: 'col_2_1',
                blocks: [
                    {
                        id: 'b_5',
                        type: 'image',
                        url: '/_images/beh/editorial.jpg',
                        alt: 'Editorial Fashion Shoot',
                        caption: 'High Fashion & Editorial Atmosphere',
                        ratio: '4-5',
                        linkUrl: '/photoshoots/'
                    }
                ]
            },
            {
                id: 'col_2_2',
                blocks: [
                    { id: 'b_6', type: 'badge', text: 'FEATURED PACKAGE', color: 'gold', align: 'left' },
                    { id: 'b_7', type: 'title', text: 'THE SIGNATURE EDITORIAL', level: 'h2', align: 'left' },
                    {
                        id: 'b_8',
                        type: 'text',
                        text: 'A fully tailored three-hour creative session exploring conceptual glamour, sensual portraiture, or fashion narrative. Includes collaborative moodboard direction, two distinct lighting setups, and magazine-grade retouching on all master deliverables.',
                        align: 'left'
                    },
                    { id: 'b_9', type: 'spacer', height: 16, line: 'subtle' },
                    {
                        id: 'b_10',
                        type: 'button',
                        label: 'INQUIRE THIS PACKAGE →',
                        linkUrl: '/contact/',
                        style: 'solid',
                        align: 'left',
                        targetBlank: false
                    }
                ]
            }
        ]
    },
    {
        id: 'row_' + Date.now() + '_3',
        layout: '3-equal',
        spacing: 'medium',
        bg: 'transparent',
        columns: [
            {
                id: 'col_3_1',
                blocks: [
                    { id: 'b_11', type: 'subtitle', text: 'TIER I • ESSENTIAL', color: 'crimson', align: 'left' },
                    { id: 'b_12', type: 'title', text: 'PORTRAIT CAPSULE', level: 'h3', align: 'left' },
                    { id: 'b_13', type: 'text', text: '90-minute daylight or studio portraiture. Ideal for agency model test shoots, personal portfolios, and natural confidence building.', align: 'left' },
                    { id: 'b_14', type: 'button', label: 'BOOK CAPSULE', linkUrl: '/contact/', style: 'outline', align: 'left', targetBlank: false }
                ]
            },
            {
                id: 'col_3_2',
                blocks: [
                    { id: 'b_15', type: 'subtitle', text: 'TIER II • GLAMOUR', color: 'gold', align: 'left' },
                    { id: 'b_16', type: 'title', text: 'SENSUAL ATELIER', level: 'h3', align: 'left' },
                    { id: 'b_17', type: 'text', text: '2.5-hour intimate boudoir or glamour production with custom shadow play and emotive fine-art color grading.', align: 'left' },
                    { id: 'b_18', type: 'button', label: 'BOOK ATELIER', linkUrl: '/contact/', style: 'solid', align: 'left', targetBlank: false }
                ]
            },
            {
                id: 'col_3_3',
                blocks: [
                    { id: 'b_19', type: 'subtitle', text: 'TIER III • BESPOKE', color: 'crimson', align: 'left' },
                    { id: 'b_20', type: 'title', text: 'THEMATIC ODYSSEY', level: 'h3', align: 'left' },
                    { id: 'b_21', type: 'text', text: 'Half-day cinematic cosplay, fantasy world-building, and special atmospheric lighting with composite retouching.', align: 'left' },
                    { id: 'b_22', type: 'button', label: 'BOOK ODYSSEY', linkUrl: '/contact/', style: 'outline', align: 'left', targetBlank: false }
                ]
            }
        ]
    },
    {
        id: 'row_' + Date.now() + '_4',
        layout: '1',
        spacing: 'spacious',
        bg: 'card',
        columns: [
            {
                id: 'col_4_1',
                blocks: [
                    {
                        id: 'b_23',
                        type: 'quote',
                        text: '“Every photograph should evoke confidence, grace, and effortless cinematic allure.”',
                        author: 'Stanislav Zhukov — Creative Director',
                        align: 'center'
                    },
                    { id: 'b_24', type: 'spacer', height: 20, line: 'gold' },
                    {
                        id: 'b_25',
                        type: 'button',
                        label: 'GET IN TOUCH DIRECTLY',
                        linkUrl: '/contact/',
                        style: 'gold',
                        align: 'center',
                        targetBlank: false
                    }
                ]
            }
        ]
    }
];

const PRESETS_STORAGE_KEY = 'zhukov_promotion_presets';
const ACTIVE_PRESET_KEY = 'zhukov_promotion_active_preset_id';

// Initial built-in presets
const INITIAL_PRESETS = [
    {
        id: 'preset_signature_editorial',
        title: 'Signature Editorial',
        slug: 'signature-editorial',
        description: 'Complete high-fashion flagship promotion with 3-tier production packages and editorial narrative.',
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-30T12:00:00.000Z',
        isDefault: true,
        pageData: DEFAULT_PAGE_DATA
    },
    {
        id: 'preset_summer_atelier',
        title: 'Summer Atelier',
        slug: 'summer-atelier',
        description: 'Atmospheric daylight portraiture & seasonal commission campaign with side-by-side showcase.',
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-30T12:00:00.000Z',
        isDefault: false,
        pageData: [
            {
                id: 'row_sa_1',
                layout: '2-equal',
                spacing: 'spacious',
                bg: 'transparent',
                columns: [
                    {
                        id: 'col_sa_1_1',
                        blocks: [
                            { id: 'b_sa_1', type: 'badge', text: 'SEASONAL COMMISSION', color: 'crimson', align: 'left' },
                            { id: 'b_sa_2', type: 'title', text: 'SUMMER ATELIER COMMISSIONS', level: 'h1', align: 'left' },
                            { id: 'b_sa_3', type: 'subtitle', text: 'LIMITED EDITORIAL SLOTS • LOCATION & STUDIO', color: 'gold', align: 'left' },
                            { id: 'b_sa_4', type: 'text', text: 'Step into an intimate visual narrative with bespoke creative direction, natural golden-hour lighting setups, and high-end magazine retouching.', align: 'left' },
                            { id: 'b_sa_5', type: 'spacer', height: 16, line: 'subtle' },
                            { id: 'b_sa_6', type: 'button', label: 'RESERVE SUMMER SESSION →', linkUrl: '/contact/', style: 'solid', align: 'left' }
                        ]
                    },
                    {
                        id: 'col_sa_1_2',
                        blocks: [
                            { id: 'b_sa_7', type: 'image', url: '/_images/beh/editorial.jpg', ratio: '4-5', alt: 'Summer Atelier Model' }
                        ]
                    }
                ]
            }
        ]
    }
];

// App State
let pageData = [];
let savedPresets = [];
let currentActivePreset = null;
let requestedPresetMissing = null;
let isPreviewMode = false;
let currentTargetColId = null;
let currentEditingBlockId = null;

// Slugify text for clean public URLs (.../promotion/preset-title)
function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// Check Admin Status
function checkIsAdmin() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        try { localStorage.setItem('zhukov_is_admin', 'true'); } catch (e) { }
        return true;
    }
    return localStorage.getItem('zhukov_is_admin') === 'true';
}

// ── Preset Storage & URL Routing Helpers ─────────────────────────────────
function loadAllPresets() {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (raw) {
        try {
            savedPresets = JSON.parse(raw);
            if (!Array.isArray(savedPresets)) savedPresets = [];
        } catch (e) {
            console.error('Failed to parse saved presets:', e);
            savedPresets = [];
        }
    }
    if (!savedPresets || savedPresets.length === 0) {
        savedPresets = JSON.parse(JSON.stringify(INITIAL_PRESETS));
        try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(savedPresets)); } catch (_) {}
    }
    return savedPresets;
}

function saveAllPresets(presets) {
    savedPresets = presets;
    try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets)); } catch (_) {}
    syncPresetsToFirestore(presets);
}

// Detect preset requested in URL via query, pathname segment, or hash
function getRequestedPresetQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    const param = urlParams.get('preset') || urlParams.get('p') || urlParams.get('title');
    if (param) return decodeURIComponent(param).trim();

    // Check pathname segment e.g. /promotion/summer-special or /promotion/Summer%20Special
    const pathMatch = window.location.pathname.match(/\/promotion\/([^/]+)\/?$/i);
    if (pathMatch && pathMatch[1]) {
        const seg = decodeURIComponent(pathMatch[1]).trim();
        if (seg !== 'index.html' && seg.toLowerCase() !== 'promotion') {
            return seg;
        }
    }

    // Check hash e.g. #summer-special
    const hash = window.location.hash.replace(/^#\!?/, '').trim();
    if (hash && !['admin', 'edit', 'login', 'signup'].includes(hash.toLowerCase())) {
        return decodeURIComponent(hash);
    }

    return null;
}

function findPresetByQuery(query) {
    if (!query || !savedPresets || savedPresets.length === 0) return null;
    const clean = query.trim().toLowerCase();
    const slug = slugify(query);

    return savedPresets.find(p => {
        if (!p) return false;
        if (p.id && p.id.toLowerCase() === clean) return true;
        if (p.slug && p.slug.toLowerCase() === slug) return true;
        if (p.title && slugify(p.title) === slug) return true;
        if (p.title && p.title.toLowerCase() === clean) return true;
        return false;
    }) || null;
}

// ── 1. Initialization ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadAllPresets();
    loadPageData();
    renderPage();
    setupAdminControls();

    // Background cloud sync without blocking 0ms render
    loadPresetsFromFirestore().then(() => {
        const query = getRequestedPresetQuery();
        if (query) {
            loadPageData();
            renderPage();
            setupAdminControls();
        }
    }).catch(() => {});

    const urlParams = new URLSearchParams(window.location.search);
    const testModal = urlParams.get('test_modal');
    if (testModal === 'picker') {
        setTimeout(() => { if (pageData[0]?.columns[0]) openBlockPicker(pageData[0].columns[0].id); }, 100);
    } else if (testModal === 'row') {
        setTimeout(() => { if (pageData[0]) openRowSettingsModal(pageData[0].id); }, 100);
    } else if (testModal === 'presets') {
        setTimeout(() => { openTemplatesModal(); }, 100);
    } else if (testModal === 'save_preset') {
        setTimeout(() => { openSavePresetModal(); }, 100);
    } else if (testModal === 'presets_then_save') {
        setTimeout(() => {
            openTemplatesModal();
            setTimeout(() => {
                openSavePresetModal();
            }, 300);
        }, 100);
    } else if (testModal === 'json') {
        setTimeout(() => { openJsonModal(); }, 100);
    }
});

function loadPageData() {
    loadAllPresets();

    const requestedQuery = getRequestedPresetQuery();
    if (requestedQuery) {
        const found = findPresetByQuery(requestedQuery);
        if (found) {
            currentActivePreset = found;
            pageData = JSON.parse(JSON.stringify(found.pageData || []));
            requestedPresetMissing = null;
            document.title = 'ZHUKOV — ' + found.title;

            // Reflect /promotion/<slug> cleanly in browser URL
            if (window.history && window.history.replaceState) {
                const isAdmin = checkIsAdmin();
                const adminQuery = isAdmin && new URLSearchParams(window.location.search).get('admin') === 'true' ? '?admin=true' : '';
                const targetPath = '/promotion/' + encodeURIComponent(found.slug) + adminQuery;
                if (!window.location.pathname.includes('/promotion/' + found.slug)) {
                    try { window.history.replaceState(null, '', targetPath); } catch (_) {}
                }
            }
            return;
        } else {
            // Requested a preset that does not exist
            requestedPresetMissing = requestedQuery;
            currentActivePreset = null;
            pageData = [];
            return;
        }
    }

    // No specific preset requested: load default preset or canvas data
    const defaultPreset = savedPresets.find(p => p.isDefault);
    const raw = localStorage.getItem(STORAGE_KEY);

    if (defaultPreset) {
        currentActivePreset = defaultPreset;
        pageData = JSON.parse(JSON.stringify(defaultPreset.pageData || []));
    } else if (raw) {
        try {
            pageData = JSON.parse(raw);
        } catch (e) {
            pageData = JSON.parse(JSON.stringify(DEFAULT_PAGE_DATA));
        }
    } else {
        pageData = JSON.parse(JSON.stringify(DEFAULT_PAGE_DATA));
    }
}

function savePageData(showFeedback = true) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pageData)); } catch (_) {}

    // If currently editing an existing preset, keep preset updated in sync
    if (currentActivePreset) {
        const idx = savedPresets.findIndex(p => p.id === currentActivePreset.id);
        if (idx !== -1) {
            savedPresets[idx].pageData = JSON.parse(JSON.stringify(pageData));
            savedPresets[idx].updatedAt = new Date().toISOString();
            saveAllPresets(savedPresets);
            if (showFeedback) {
                showToast(`Saved layout to preset "${savedPresets[idx].title}" ✓`);
            }
            setupAdminControls();
            return;
        }
    }

    if (showFeedback) {
        showToast('Page layout saved successfully ✓');
    }
}

// ── 2. Core Page Rendering ────────────────────────────────────────────────
function renderPage() {
    const canvas = document.getElementById('builder-canvas');
    if (!canvas) return;

    const isAdmin = checkIsAdmin();
    const isEditActive = isAdmin && !isPreviewMode;

    document.body.classList.toggle('is-builder-active', isEditActive);

    // Preset Not Found Fallback Notice
    if (requestedPresetMissing) {
        canvas.innerHTML = `
            <div class="preset-not-found-card">
                <span class="preset-not-found-kicker">PROMOTION PRESET NOT FOUND</span>
                <h2 class="preset-not-found-title">LOOKING FOR “${escapeHtml(requestedPresetMissing)}”?</h2>
                <p class="preset-not-found-desc">
                    The requested promotion page could not be located or may have been renamed.
                    Discover our current featured editorial packages or get in touch for custom commissions.
                </p>
                <div style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap;">
                    <a href="/promotion/" class="pub-btn style-solid">VIEW ACTIVE PROMOTION</a>
                    <a href="/contact/" class="pub-btn style-outline">INQUIRE DIRECTLY →</a>
                </div>
            </div>
        `;
        return;
    }

    // Empty State
    if (!pageData || pageData.length === 0) {
        canvas.innerHTML = `
            <div class="empty-canvas-prompt">
                <h3 class="empty-canvas-title">NO CONTENT YET</h3>
                <p class="empty-canvas-desc">${isEditActive ? 'Click below to add your first row container and start building.' : 'This page is currently being curated. Check back soon.'}</p>
                ${isEditActive ? `<button type="button" class="pub-btn style-solid" onclick="addNewRow()">+ ADD YOUR FIRST ROW</button>` : ''}
            </div>
        `;
        return;
    }

    let html = '';

    pageData.forEach((row, rowIndex) => {
        html += renderRow(row, rowIndex, isEditActive);
    });

    // Final bottom add row zone for admin
    if (isEditActive) {
        html += `
            <div class="add-row-zone">
                <button type="button" class="add-row-btn" onclick="addNewRow(${pageData.length})">
                    <span>+</span> ADD ROW AT BOTTOM
                </button>
            </div>
        `;
    }

    canvas.innerHTML = html;

    // Attach inline contenteditable listeners in edit mode
    if (isEditActive) {
        attachInlineEditListeners();
    }
}

function renderRow(row, rowIndex, isEditActive) {
    let colHtml = '';
    (row.columns || []).forEach((col, colIndex) => {
        colHtml += renderColumn(col, row.id, colIndex, isEditActive);
    });

    const adminBar = isEditActive ? `
        <div class="row-admin-bar">
            <span style="font-size: 0.6rem; color: #a1a1aa; font-weight: 700; margin-right: 0.35rem;">ROW ${rowIndex + 1}</span>
            <button type="button" class="row-action-btn" title="Change Layout / Columns" onclick="openRowSettingsModal('${row.id}')">📐 Layout</button>
            <button type="button" class="row-action-btn" title="Move Up" onclick="moveRow(${rowIndex}, -1)" ${rowIndex === 0 ? 'disabled style="opacity:0.3;"' : ''}>↑</button>
            <button type="button" class="row-action-btn" title="Move Down" onclick="moveRow(${rowIndex}, 1)" ${rowIndex === pageData.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>↓</button>
            <button type="button" class="row-action-btn" title="Duplicate Row" onclick="duplicateRow('${row.id}')">⧉</button>
            <button type="button" class="row-action-btn btn-danger" title="Delete Row" onclick="deleteRow('${row.id}')">🗑</button>
        </div>
    ` : '';

    const addRowBefore = isEditActive && rowIndex > 0 ? `
        <div class="add-row-zone">
            <button type="button" class="add-row-btn" onclick="addNewRow(${rowIndex})">
                <span>+</span> INSERT ROW HERE
            </button>
        </div>
    ` : '';

    return `
        ${addRowBefore}
        <section class="pub-row layout-${row.layout || '1'} spacing-${row.spacing || 'medium'} bg-${row.bg || 'transparent'}" id="${row.id}">
            ${adminBar}
            <div class="pub-row-inner">
                ${colHtml}
            </div>
        </section>
    `;
}

function renderColumn(col, rowId, colIndex, isEditActive) {
    let blocksHtml = '';
    (col.blocks || []).forEach((block, blockIndex) => {
        blocksHtml += renderBlock(block, col.id, blockIndex, isEditActive);
    });

    const addBlockBtn = isEditActive ? `
        <button type="button" class="col-add-block-btn" onclick="openBlockPicker('${col.id}')">
            <span>+</span> ADD ELEMENT
        </button>
    ` : '';

    return `
        <div class="pub-col" id="${col.id}" data-col-id="${col.id}">
            ${blocksHtml}
            ${addBlockBtn}
        </div>
    `;
}

function renderBlock(block, colId, blockIndex, isEditActive) {
    let contentHtml = '';
    const alignClass = `align-${block.align || 'left'}`;

    switch (block.type) {
        case 'title':
            contentHtml = `
                <${block.level || 'h2'} class="pub-title level-${block.level || 'h2'} ${alignClass}"
                    ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="text"` : ''}>
                    ${block.text || 'Untitled Heading'}
                </${block.level || 'h2'}>
            `;
            break;

        case 'subtitle':
            contentHtml = `
                <div class="pub-subtitle color-${block.color || 'crimson'} ${alignClass}"
                    ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="text"` : ''}>
                    ${block.text || 'SUBTITLE'}
                </div>
            `;
            break;

        case 'text':
            contentHtml = `
                <div class="pub-text ${alignClass}"
                    ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="text"` : ''}>
                    ${block.text || 'Click to edit your paragraph text here...'}
                </div>
            `;
            break;

        case 'image':
            const imgRatio = `ratio-${block.ratio || 'auto'}`;
            const imgContent = `
                <div class="pub-image-wrapper ${imgRatio}">
                    <img src="${block.url || '/_images/editorial.png'}" alt="${block.alt || 'Photography image'}" class="pub-image" loading="lazy">
                </div>
                ${block.caption ? `<div class="pub-image-caption">${block.caption}</div>` : ''}
            `;
            contentHtml = block.linkUrl && !isEditActive
                ? `<a href="${block.linkUrl}" class="pub-image-link">${imgContent}</a>`
                : imgContent;
            break;

        case 'button':
            contentHtml = `
                <div class="pub-button-wrapper ${alignClass}">
                    <a href="${isEditActive ? '#' : (block.linkUrl || '#')}"
                       class="pub-btn style-${block.style || 'solid'}"
                       ${block.targetBlank && !isEditActive ? 'target="_blank" rel="noopener noreferrer"' : ''}
                       ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="label"` : ''}>
                        ${block.label || 'CLICK HERE'}
                    </a>
                </div>
            `;
            break;

        case 'spacer':
            const height = block.height || 32;
            const lineClass = block.line && block.line !== 'none' ? `pub-divider-line line-${block.line}` : '';
            contentHtml = `
                <div class="pub-spacer" style="height: ${height}px; display: flex; align-items: center;">
                    ${lineClass ? `<hr class="${lineClass}">` : ''}
                </div>
            `;
            break;

        case 'badge':
            contentHtml = `
                <div style="display: flex; justify-content: ${block.align === 'center' ? 'center' : (block.align === 'right' ? 'flex-end' : 'flex-start')};">
                    <span class="pub-badge color-${block.color || 'crimson'}"
                          ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="text"` : ''}>
                        ${block.text || 'BADGE'}
                    </span>
                </div>
            `;
            break;

        case 'quote':
            contentHtml = `
                <div class="pub-quote ${alignClass}">
                    <div class="pub-quote-text" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="text"` : ''}>
                        ${block.text || '“Quote goes here”'}
                    </div>
                    ${block.author ? `
                        <div class="pub-quote-author" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="author"` : ''}>
                            ${block.author}
                        </div>
                    ` : ''}
                </div>
            `;
            break;

        case 'video':
            const embedUrl = getEmbedUrl(block.videoUrl);
            contentHtml = `
                <div class="pub-video-wrapper">
                    ${embedUrl ? `<iframe class="pub-video-iframe" src="${embedUrl}" allowfullscreen></iframe>` : '<div style="color:#aaa; padding:2rem; text-align:center;">No valid video URL set</div>'}
                </div>
            `;
            break;

        default:
            contentHtml = `<div class="pub-text">Unknown block type</div>`;
    }

    const adminToolbar = isEditActive ? `
        <div class="block-admin-toolbar">
            <button type="button" class="block-tool-btn" title="Edit Properties" onclick="openBlockSettingsModal('${block.id}')">⚙️</button>
            <button type="button" class="block-tool-btn" title="Move Up" onclick="moveBlock('${colId}', ${blockIndex}, -1)">↑</button>
            <button type="button" class="block-tool-btn" title="Move Down" onclick="moveBlock('${colId}', ${blockIndex}, 1)">↓</button>
            <button type="button" class="block-tool-btn" title="Duplicate" onclick="duplicateBlock('${colId}', '${block.id}')">⧉</button>
            <button type="button" class="block-tool-btn btn-delete" title="Delete" onclick="deleteBlock('${colId}', '${block.id}')">🗑</button>
        </div>
    ` : '';

    return `
        <div class="block-item" id="${block.id}" data-block-type="${block.type}">
            ${adminToolbar}
            ${contentHtml}
        </div>
    `;
}

// ── 3. Inline Editing Handlers ────────────────────────────────────────────
function attachInlineEditListeners() {
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        el.addEventListener('blur', () => {
            const blockId = el.getAttribute('data-block-id');
            const field = el.getAttribute('data-field');
            const text = el.innerText.trim();
            if (blockId && field) {
                updateBlockField(blockId, field, text);
            }
        });

        // Prevent Enter causing unformatted div nesting on single-line headings
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.classList.contains('pub-subtitle') || el.classList.contains('pub-btn'))) {
                e.preventDefault();
                el.blur();
            }
        });
    });
}

function updateBlockField(blockId, field, value) {
    const block = findBlockById(blockId);
    if (block) {
        block[field] = value;
        savePageData(false);
    }
}

// ── 4. Helper Finders ─────────────────────────────────────────────────────
function findBlockById(blockId) {
    for (const row of pageData) {
        for (const col of row.columns || []) {
            const b = (col.blocks || []).find(it => it.id === blockId);
            if (b) return b;
        }
    }
    return null;
}

function findColById(colId) {
    for (const row of pageData) {
        const c = (row.columns || []).find(it => it.id === colId);
        if (c) return c;
    }
    return null;
}

function findRowById(rowId) {
    return pageData.find(it => it.id === rowId);
}

// ── 5. Row Manipulation ───────────────────────────────────────────────────
window.addNewRow = function (insertAtIndex = null) {
    const newRow = {
        id: 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        layout: '1',
        spacing: 'medium',
        bg: 'transparent',
        columns: [
            {
                id: 'col_' + Date.now() + '_1',
                blocks: [
                    { id: 'b_' + Date.now(), type: 'title', text: 'NEW SECTION HEADING', level: 'h2', align: 'center' }
                ]
            }
        ]
    };

    if (insertAtIndex !== null && insertAtIndex >= 0 && insertAtIndex <= pageData.length) {
        pageData.splice(insertAtIndex, 0, newRow);
    } else {
        pageData.push(newRow);
    }

    savePageData();
    renderPage();
};

window.deleteRow = function (rowId) {
    if (!confirm('Are you sure you want to delete this row and all its contents?')) return;
    pageData = pageData.filter(r => r.id !== rowId);
    savePageData();
    renderPage();
};

window.moveRow = function (index, direction) {
    const target = index + direction;
    if (target < 0 || target >= pageData.length) return;
    const temp = pageData[index];
    pageData[index] = pageData[target];
    pageData[target] = temp;
    savePageData();
    renderPage();
};

window.duplicateRow = function (rowId) {
    const index = pageData.findIndex(r => r.id === rowId);
    if (index === -1) return;
    const clone = JSON.parse(JSON.stringify(pageData[index]));
    clone.id = 'row_' + Date.now();
    (clone.columns || []).forEach(col => {
        col.id = 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3);
        (col.blocks || []).forEach(b => {
            b.id = 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3);
        });
    });
    pageData.splice(index + 1, 0, clone);
    savePageData();
    renderPage();
};

// ── 6. Column Layouts for Rows ────────────────────────────────────────────
window.setRowLayout = function (rowId, layoutType) {
    const row = findRowById(rowId);
    if (!row) return;

    row.layout = layoutType;
    let targetColCount = 1;
    if (layoutType.startsWith('2-')) targetColCount = 2;
    else if (layoutType === '3-equal') targetColCount = 3;
    else if (layoutType === '4-equal') targetColCount = 4;

    row.columns = row.columns || [];

    // Add extra columns if needed
    while (row.columns.length < targetColCount) {
        row.columns.push({
            id: 'col_' + Date.now() + '_' + (row.columns.length + 1),
            blocks: []
        });
    }

    // If reducing columns, merge blocks from extra columns into the last remaining column
    if (row.columns.length > targetColCount) {
        const removedCols = row.columns.splice(targetColCount);
        const lastCol = row.columns[row.columns.length - 1];
        removedCols.forEach(col => {
            (col.blocks || []).forEach(b => lastCol.blocks.push(b));
        });
    }

    savePageData();
    renderPage();
    closeAllModals();
};

// ── 7. Block Manipulation ─────────────────────────────────────────────────
window.openBlockPicker = function (colId) {
    currentTargetColId = colId;
    const modal = document.getElementById('block-picker-modal');
    if (modal) {
        modal.classList.add('is-open');
    }
};

window.insertBlock = function (type) {
    if (!currentTargetColId) return;
    const col = findColById(currentTargetColId);
    if (!col) return;

    const newId = 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    let newBlock = { id: newId, type: type };

    switch (type) {
        case 'title':
            newBlock.text = 'NEW EDITORIAL TITLE';
            newBlock.level = 'h2';
            newBlock.align = 'center';
            break;
        case 'subtitle':
            newBlock.text = 'SECTION KICKER';
            newBlock.color = 'crimson';
            newBlock.align = 'center';
            break;
        case 'text':
            newBlock.text = 'Enter your custom editorial text description here. Share stories, session instructions, or vision highlights.';
            newBlock.align = 'left';
            break;
        case 'image':
            newBlock.url = '/_images/editorial.png';
            newBlock.alt = 'Photoshoot Showcase';
            newBlock.ratio = '4-5';
            newBlock.caption = '';
            break;
        case 'button':
            newBlock.label = 'INQUIRE NOW →';
            newBlock.linkUrl = '/contact/';
            newBlock.style = 'solid';
            newBlock.align = 'left';
            newBlock.targetBlank = false;
            break;
        case 'spacer':
            newBlock.height = 36;
            newBlock.line = 'none';
            break;
        case 'badge':
            newBlock.text = 'LIMITED TIME';
            newBlock.color = 'gold';
            newBlock.align = 'left';
            break;
        case 'quote':
            newBlock.text = '“A photograph is a secret about a secret. The more it tells you, the less you know.”';
            newBlock.author = 'Diane Arbus';
            newBlock.align = 'left';
            break;
        case 'video':
            newBlock.videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            break;
    }

    col.blocks = col.blocks || [];
    col.blocks.push(newBlock);
    savePageData();
    renderPage();
    closeAllModals();
};

window.deleteBlock = function (colId, blockId) {
    const col = findColById(colId);
    if (!col) return;
    col.blocks = (col.blocks || []).filter(b => b.id !== blockId);
    savePageData();
    renderPage();
};

window.moveBlock = function (colId, index, direction) {
    const col = findColById(colId);
    if (!col) return;
    const target = index + direction;
    if (target < 0 || target >= col.blocks.length) return;
    const temp = col.blocks[index];
    col.blocks[index] = col.blocks[target];
    col.blocks[target] = temp;
    savePageData();
    renderPage();
};

window.duplicateBlock = function (colId, blockId) {
    const col = findColById(colId);
    if (!col) return;
    const index = col.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    const clone = JSON.parse(JSON.stringify(col.blocks[index]));
    clone.id = 'b_' + Date.now();
    col.blocks.splice(index + 1, 0, clone);
    savePageData();
    renderPage();
};

// ── 8. Settings Modals ────────────────────────────────────────────────────
window.openRowSettingsModal = function (rowId) {
    const row = findRowById(rowId);
    if (!row) return;

    const modal = document.getElementById('row-settings-modal');
    if (!modal) return;

    modal.setAttribute('data-target-row-id', rowId);

    const layoutSelect = document.getElementById('row-layout-select');
    const spacingSelect = document.getElementById('row-spacing-select');
    const bgSelect = document.getElementById('row-bg-select');

    if (layoutSelect) layoutSelect.value = row.layout || '1';
    if (spacingSelect) spacingSelect.value = row.spacing || 'medium';
    if (bgSelect) bgSelect.value = row.bg || 'transparent';

    modal.classList.add('is-open');
};

window.saveRowSettings = function () {
    const modal = document.getElementById('row-settings-modal');
    const rowId = modal ? modal.getAttribute('data-target-row-id') : null;
    const row = findRowById(rowId);
    if (!row) return;

    const layout = document.getElementById('row-layout-select')?.value || '1';
    const spacing = document.getElementById('row-spacing-select')?.value || 'medium';
    const bg = document.getElementById('row-bg-select')?.value || 'transparent';

    row.spacing = spacing;
    row.bg = bg;

    if (row.layout !== layout) {
        window.setRowLayout(rowId, layout);
    } else {
        savePageData();
        renderPage();
        closeAllModals();
    }
};

window.openBlockSettingsModal = function (blockId) {
    currentEditingBlockId = blockId;
    const block = findBlockById(blockId);
    if (!block) return;

    const modal = document.getElementById('block-settings-modal');
    const bodyContainer = document.getElementById('block-settings-fields');
    if (!modal || !bodyContainer) return;

    document.getElementById('block-settings-title').textContent = `EDIT ${block.type.toUpperCase()} ELEMENT`;

    let fieldsHtml = '';

    // Common Alignment
    if (block.type !== 'spacer' && block.type !== 'video') {
        fieldsHtml += `
            <div class="builder-form-group">
                <label class="builder-label">Alignment</label>
                <select id="edit-block-align" class="builder-select">
                    <option value="left" ${block.align === 'left' ? 'selected' : ''}>Left</option>
                    <option value="center" ${block.align === 'center' ? 'selected' : ''}>Center</option>
                    <option value="right" ${block.align === 'right' ? 'selected' : ''}>Right</option>
                </select>
            </div>
        `;
    }

    switch (block.type) {
        case 'title':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Title Text</label>
                    <input type="text" id="edit-block-text" class="builder-input" value="${escapeHtml(block.text || '')}">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Heading Level</label>
                    <select id="edit-block-level" class="builder-select">
                        <option value="h1" ${block.level === 'h1' ? 'selected' : ''}>H1 — Main Title (Large)</option>
                        <option value="h2" ${block.level === 'h2' ? 'selected' : ''}>H2 — Section Header (Medium)</option>
                        <option value="h3" ${block.level === 'h3' ? 'selected' : ''}>H3 — Subsection Header (Small)</option>
                    </select>
                </div>
            `;
            break;

        case 'subtitle':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Subtitle Text</label>
                    <input type="text" id="edit-block-text" class="builder-input" value="${escapeHtml(block.text || '')}">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Color Style</label>
                    <select id="edit-block-color" class="builder-select">
                        <option value="crimson" ${block.color === 'crimson' ? 'selected' : ''}>Crimson Accent (#b32d2e)</option>
                        <option value="gold" ${block.color === 'gold' ? 'selected' : ''}>Luxury Gold (#c5a059)</option>
                        <option value="muted" ${block.color === 'muted' ? 'selected' : ''}>Muted Gray</option>
                        <option value="black" ${block.color === 'black' ? 'selected' : ''}>Dark / Theme Text</option>
                    </select>
                </div>
            `;
            break;

        case 'text':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Paragraph Text</label>
                    <textarea id="edit-block-text" class="builder-textarea">${escapeHtml(block.text || '')}</textarea>
                </div>
            `;
            break;

        case 'image':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Image URL</label>
                    <input type="text" id="edit-block-url" class="builder-input" value="${escapeHtml(block.url || '')}" placeholder="https://example.com/photo.jpg or /_images/...">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Aspect Ratio</label>
                    <select id="edit-block-ratio" class="builder-select">
                        <option value="4-5" ${block.ratio === '4-5' ? 'selected' : ''}>4:5 (Editorial Portrait)</option>
                        <option value="3-2" ${block.ratio === '3-2' ? 'selected' : ''}>3:2 (Landscape)</option>
                        <option value="1-1" ${block.ratio === '1-1' ? 'selected' : ''}>1:1 (Square)</option>
                        <option value="16-9" ${block.ratio === '16-9' ? 'selected' : ''}>16:9 (Cinematic)</option>
                        <option value="auto" ${block.ratio === 'auto' ? 'selected' : ''}>Auto Height (Natural)</option>
                    </select>
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Alt / Description</label>
                    <input type="text" id="edit-block-alt" class="builder-input" value="${escapeHtml(block.alt || '')}">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Optional Caption</label>
                    <input type="text" id="edit-block-caption" class="builder-input" value="${escapeHtml(block.caption || '')}">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Clickable Link Destination (Optional)</label>
                    <input type="text" id="edit-block-link" class="builder-input" value="${escapeHtml(block.linkUrl || '')}" placeholder="e.g. /photoshoots/ or https://...">
                </div>
            `;
            break;

        case 'button':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Button Label</label>
                    <input type="text" id="edit-block-label" class="builder-input" value="${escapeHtml(block.label || '')}">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Destination URL</label>
                    <input type="text" id="edit-block-link" class="builder-input" value="${escapeHtml(block.linkUrl || '')}" placeholder="/contact/, mailto:..., https://...">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Button Style</label>
                    <select id="edit-block-style" class="builder-select">
                        <option value="solid" ${block.style === 'solid' ? 'selected' : ''}>Solid Vogue Black / White</option>
                        <option value="outline" ${block.style === 'outline' ? 'selected' : ''}>Minimal Outline</option>
                        <option value="gold" ${block.style === 'gold' ? 'selected' : ''}>Luxury Gold Accent</option>
                    </select>
                </div>
                <div class="builder-form-group">
                    <label class="builder-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                        <input type="checkbox" id="edit-block-target" ${block.targetBlank ? 'checked' : ''}>
                        <span>Open in new window / tab</span>
                    </label>
                </div>
            `;
            break;

        case 'spacer':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Vertical Space Height (px)</label>
                    <input type="number" id="edit-block-height" class="builder-input" value="${block.height || 32}" min="4" max="160" step="4">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Divider Line</label>
                    <select id="edit-block-line" class="builder-select">
                        <option value="none" ${block.line === 'none' ? 'selected' : ''}>No Line (Empty Space)</option>
                        <option value="subtle" ${block.line === 'subtle' ? 'selected' : ''}>Subtle Hairline Line</option>
                        <option value="accent" ${block.line === 'accent' ? 'selected' : ''}>Crimson Gradient Fade</option>
                        <option value="gold" ${block.line === 'gold' ? 'selected' : ''}>Gold Gradient Fade</option>
                    </select>
                </div>
            `;
            break;

        case 'badge':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Badge Text</label>
                    <input type="text" id="edit-block-text" class="builder-input" value="${escapeHtml(block.text || '')}">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Badge Theme</label>
                    <select id="edit-block-color" class="builder-select">
                        <option value="crimson" ${block.color === 'crimson' ? 'selected' : ''}>Crimson (#b32d2e)</option>
                        <option value="gold" ${block.color === 'gold' ? 'selected' : ''}>Gold (#c5a059)</option>
                        <option value="dark" ${block.color === 'dark' ? 'selected' : ''}>Solid Dark</option>
                    </select>
                </div>
            `;
            break;

        case 'quote':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Quote Text</label>
                    <textarea id="edit-block-text" class="builder-textarea">${escapeHtml(block.text || '')}</textarea>
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Author / Attribution</label>
                    <input type="text" id="edit-block-author" class="builder-input" value="${escapeHtml(block.author || '')}">
                </div>
            `;
            break;

        case 'video':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Video URL (YouTube or Vimeo)</label>
                    <input type="text" id="edit-block-video" class="builder-input" value="${escapeHtml(block.videoUrl || '')}" placeholder="https://www.youtube.com/watch?v=...">
                </div>
            `;
            break;
    }

    bodyContainer.innerHTML = fieldsHtml;
    modal.classList.add('is-open');
};

window.saveBlockSettings = function () {
    const block = findBlockById(currentEditingBlockId);
    if (!block) return;

    const align = document.getElementById('edit-block-align')?.value;
    if (align) block.align = align;

    switch (block.type) {
        case 'title':
            block.text = document.getElementById('edit-block-text')?.value || '';
            block.level = document.getElementById('edit-block-level')?.value || 'h2';
            break;
        case 'subtitle':
            block.text = document.getElementById('edit-block-text')?.value || '';
            block.color = document.getElementById('edit-block-color')?.value || 'crimson';
            break;
        case 'text':
            block.text = document.getElementById('edit-block-text')?.value || '';
            break;
        case 'image':
            block.url = document.getElementById('edit-block-url')?.value || '';
            block.ratio = document.getElementById('edit-block-ratio')?.value || 'auto';
            block.alt = document.getElementById('edit-block-alt')?.value || '';
            block.caption = document.getElementById('edit-block-caption')?.value || '';
            block.linkUrl = document.getElementById('edit-block-link')?.value || '';
            break;
        case 'button':
            block.label = document.getElementById('edit-block-label')?.value || '';
            block.linkUrl = document.getElementById('edit-block-link')?.value || '';
            block.style = document.getElementById('edit-block-style')?.value || 'solid';
            block.targetBlank = !!document.getElementById('edit-block-target')?.checked;
            break;
        case 'spacer':
            block.height = parseInt(document.getElementById('edit-block-height')?.value || '32', 10);
            block.line = document.getElementById('edit-block-line')?.value || 'none';
            break;
        case 'badge':
            block.text = document.getElementById('edit-block-text')?.value || '';
            block.color = document.getElementById('edit-block-color')?.value || 'crimson';
            break;
        case 'quote':
            block.text = document.getElementById('edit-block-text')?.value || '';
            block.author = document.getElementById('edit-block-author')?.value || '';
            break;
        case 'video':
            block.videoUrl = document.getElementById('edit-block-video')?.value || '';
            break;
    }

    savePageData();
    renderPage();
    closeAllModals();
};

// ── 9. Admin Studio Bar & Actions ─────────────────────────────────────────
function setupAdminControls() {
    const isAdmin = checkIsAdmin();
    const existingBar = document.getElementById('admin-builder-bar');
    if (existingBar) existingBar.remove();

    if (!isAdmin) return;

    const bar = document.createElement('div');
    bar.id = 'admin-builder-bar';
    bar.className = 'admin-builder-bar';
    bar.innerHTML = `
        <div class="admin-mode-pill">
            <span class="admin-pulse-dot"></span>
            <span>BUILDER MODE</span>
        </div>
        ${currentActivePreset ? `
            <div class="active-preset-pill" onclick="openSavePresetModal()" title="Click to view or edit preset details">
                <span>🔖</span>
                <span>PRESET: ${escapeHtml(currentActivePreset.title)}</span>
            </div>
        ` : ''}
        <div class="admin-bar-divider"></div>
        <button type="button" class="admin-bar-btn ${isPreviewMode ? 'btn-active' : ''}" id="btn-toggle-preview" onclick="toggleVisitorPreview()">
            <span>${isPreviewMode ? '✏️ Edit Mode' : '👁️ Preview as Visitor'}</span>
        </button>
        <button type="button" class="admin-bar-btn" onclick="addNewRow()">
            <span>+ Add Row</span>
        </button>
        <button type="button" class="admin-bar-btn btn-primary" onclick="savePageData()">
            <span>💾 Save</span>
        </button>
        <button type="button" class="admin-bar-btn" onclick="openSavePresetModal()">
            <span>🔖 Save As Preset</span>
        </button>
        <button type="button" class="admin-bar-btn" onclick="openTemplatesModal()">
            <span>⚙️ Presets (${savedPresets.length})</span>
        </button>
        <button type="button" class="admin-bar-btn" onclick="openJsonModal()">
            <span>⇄ JSON</span>
        </button>
        <button type="button" class="admin-bar-btn" onclick="clearEntirePage()" title="Wipe canvas clear">
            <span>🗑️</span>
        </button>
    `;
    document.body.appendChild(bar);
}

window.toggleVisitorPreview = function () {
    isPreviewMode = !isPreviewMode;
    renderPage();
    setupAdminControls();
    showToast(isPreviewMode ? 'Switched to clean visitor view mode' : 'Switched to edit mode');
};

window.clearEntirePage = function () {
    if (!confirm('Are you sure you want to clear all rows on this page?')) return;
    pageData = [];
    savePageData();
    renderPage();
};

// ── Preset Builder & Public URL Actions ──────────────────────────────────
window.openSavePresetModal = function () {
    // 1. Close Presets Manager modal so Save window never appears behind it
    const templatesModal = document.getElementById('templates-modal');
    if (templatesModal) templatesModal.classList.remove('is-open');

    const modal = document.getElementById('save-preset-modal');
    if (!modal) return;

    const titleInput = document.getElementById('preset-title-input');
    const descInput = document.getElementById('preset-desc-input');
    const defaultCheck = document.getElementById('preset-is-default-checkbox');
    const activeInfo = document.getElementById('save-modal-active-info');
    const activeTitle = document.getElementById('save-modal-active-title');
    const selectToUpdate = document.getElementById('select-preset-to-update');
    const btnUpdate = document.getElementById('btn-update-existing-preset');

    // Populate dropdown with existing presets
    if (selectToUpdate) {
        let opts = '<option value="">-- Choose Existing Preset to Overwrite/Update --</option>';
        savedPresets.forEach(p => {
            const isSel = currentActivePreset && currentActivePreset.id === p.id;
            opts += `<option value="${p.id}" ${isSel ? 'selected' : ''}>${escapeHtml(p.title)} (/promotion/${escapeHtml(p.slug)})</option>`;
        });
        selectToUpdate.innerHTML = opts;
    }

    if (currentActivePreset) {
        if (titleInput) titleInput.value = currentActivePreset.title || '';
        if (descInput) descInput.value = currentActivePreset.description || '';
        if (defaultCheck) defaultCheck.checked = !!currentActivePreset.isDefault;
        if (activeInfo) activeInfo.style.display = 'flex';
        if (activeTitle) activeTitle.textContent = currentActivePreset.title;
        if (btnUpdate) {
            btnUpdate.innerHTML = `<span>💾 Update "${escapeHtml(currentActivePreset.title)}"</span>`;
        }
    } else {
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
        if (defaultCheck) defaultCheck.checked = false;
        if (activeInfo) activeInfo.style.display = 'none';
        if (btnUpdate) {
            btnUpdate.innerHTML = `<span>💾 Update Selected Preset</span>`;
        }
    }

    window.updatePresetUrlPreview();
    modal.classList.add('is-open');
    if (titleInput) titleInput.focus();
};

window.onSelectPresetToUpdateChange = function () {
    const selectEl = document.getElementById('select-preset-to-update');
    const titleInput = document.getElementById('preset-title-input');
    const descInput = document.getElementById('preset-desc-input');
    const defaultCheck = document.getElementById('preset-is-default-checkbox');
    const btnUpdate = document.getElementById('btn-update-existing-preset');

    if (!selectEl) return;
    const selectedId = selectEl.value;
    const selectedPreset = savedPresets.find(p => p.id === selectedId);

    if (selectedPreset) {
        if (titleInput) titleInput.value = selectedPreset.title;
        if (descInput) descInput.value = selectedPreset.description || '';
        if (defaultCheck) defaultCheck.checked = !!selectedPreset.isDefault;
        if (btnUpdate) {
            btnUpdate.innerHTML = `<span>💾 Update "${escapeHtml(selectedPreset.title)}"</span>`;
        }
    } else {
        if (btnUpdate) {
            btnUpdate.innerHTML = `<span>💾 Update Existing Preset</span>`;
        }
    }
    window.updatePresetUrlPreview();
};

window.updatePresetUrlPreview = function () {
    const input = document.getElementById('preset-title-input');
    const slugEl = document.getElementById('preset-url-slug');
    const prefixEl = document.getElementById('preset-url-prefix');

    if (prefixEl) {
        prefixEl.textContent = window.location.origin + '/promotion/';
    }

    if (slugEl) {
        const raw = input ? input.value : '';
        const slug = slugify(raw) || 'preset-title';
        slugEl.textContent = slug;
    }
};

window.createNewPresetFromCanvas = function () {
    const titleInput = document.getElementById('preset-title-input');
    const descInput = document.getElementById('preset-desc-input');
    const defaultCheck = document.getElementById('preset-is-default-checkbox');

    const title = titleInput ? titleInput.value.trim() : '';
    if (!title) {
        alert('Please enter a preset title for your new build (e.g. Summer Special 2026).');
        if (titleInput) titleInput.focus();
        return;
    }

    let baseSlug = slugify(title);
    let finalSlug = baseSlug;
    let counter = 1;
    // Ensure new preset gets a unique slug
    while (savedPresets.some(p => p.slug === finalSlug)) {
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
    }

    const desc = descInput ? descInput.value.trim() : '';
    const isDefault = defaultCheck ? !!defaultCheck.checked : false;

    if (isDefault) {
        savedPresets.forEach(p => p.isDefault = false);
    }

    const newPreset = {
        id: 'preset_' + Date.now(),
        title: title + (counter > 1 ? ` (${counter})` : ''),
        slug: finalSlug,
        description: desc,
        isDefault: isDefault,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pageData: JSON.parse(JSON.stringify(pageData))
    };

    savedPresets.unshift(newPreset);
    saveAllPresets(savedPresets);
    currentActivePreset = newPreset;

    const fullUrl = window.location.origin + '/promotion/' + encodeURIComponent(finalSlug);
    try { navigator.clipboard.writeText(fullUrl); } catch (_) {}

    if (window.history && window.history.replaceState) {
        const adminQuery = checkIsAdmin() ? '?admin=true' : '';
        window.history.replaceState(null, '', '/promotion/' + encodeURIComponent(finalSlug) + adminQuery);
    }

    closeAllModals();
    setupAdminControls();
    showToast(`Created new preset "${newPreset.title}"! Public URL copied to clipboard.`);
};

window.updateSelectedOrActivePreset = function () {
    const selectEl = document.getElementById('select-preset-to-update');
    const titleInput = document.getElementById('preset-title-input');
    const descInput = document.getElementById('preset-desc-input');
    const defaultCheck = document.getElementById('preset-is-default-checkbox');

    let targetPreset = null;
    if (selectEl && selectEl.value) {
        targetPreset = savedPresets.find(p => p.id === selectEl.value);
    }
    if (!targetPreset && currentActivePreset) {
        targetPreset = savedPresets.find(p => p.id === currentActivePreset.id);
    }
    if (!targetPreset) {
        // Fallback: check if typed title matches any preset
        const typedTitle = titleInput ? titleInput.value.trim().toLowerCase() : '';
        if (typedTitle) {
            targetPreset = savedPresets.find(p => p.title.toLowerCase() === typedTitle || p.slug === slugify(typedTitle));
        }
    }

    if (!targetPreset) {
        alert('Please choose an existing preset to update from the dropdown, or click "Save as New Preset" to create a new one.');
        if (selectEl) selectEl.focus();
        return;
    }

    const newTitle = titleInput ? titleInput.value.trim() : targetPreset.title;
    if (!newTitle) {
        alert('Preset title cannot be empty.');
        return;
    }

    const desc = descInput ? descInput.value.trim() : (targetPreset.description || '');
    const isDefault = defaultCheck ? !!defaultCheck.checked : false;

    if (isDefault) {
        savedPresets.forEach(p => p.isDefault = false);
    }

    targetPreset.title = newTitle;
    targetPreset.slug = slugify(newTitle) || targetPreset.slug;
    targetPreset.description = desc;
    targetPreset.isDefault = isDefault;
    targetPreset.updatedAt = new Date().toISOString();
    targetPreset.pageData = JSON.parse(JSON.stringify(pageData));

    saveAllPresets(savedPresets);
    currentActivePreset = targetPreset;

    const fullUrl = window.location.origin + '/promotion/' + encodeURIComponent(targetPreset.slug);
    try { navigator.clipboard.writeText(fullUrl); } catch (_) {}

    if (window.history && window.history.replaceState) {
        const adminQuery = checkIsAdmin() ? '?admin=true' : '';
        window.history.replaceState(null, '', '/promotion/' + encodeURIComponent(targetPreset.slug) + adminQuery);
    }

    closeAllModals();
    setupAdminControls();
    showToast(`Updated preset "${targetPreset.title}" with current build! Public URL copied.`);
};

// Backwards compatibility alias
window.saveCurrentBuildAsPreset = window.createNewPresetFromCanvas;

window.loadPresetIntoBuilder = function (presetId) {
    const preset = savedPresets.find(p => p.id === presetId);
    if (!preset) return;

    if (!confirm(`Load preset "${preset.title}" into the builder? This will replace the canvas with this preset's build.`)) return;

    currentActivePreset = preset;
    pageData = JSON.parse(JSON.stringify(preset.pageData || []));
    requestedPresetMissing = null;

    if (window.history && window.history.replaceState) {
        const adminQuery = checkIsAdmin() ? '?admin=true' : '';
        window.history.replaceState(null, '', '/promotion/' + encodeURIComponent(preset.slug) + adminQuery);
    }

    savePageData(false);
    renderPage();
    setupAdminControls();
    closeAllModals();
    showToast(`Loaded preset "${preset.title}" into builder`);
};

window.copyPresetPublicUrl = function (slug) {
    const url = window.location.origin + '/promotion/' + encodeURIComponent(slug);
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
    }
    showToast(`Copied public URL: /promotion/${slug}`);
};

window.setPresetAsDefault = function (presetId) {
    savedPresets.forEach(p => {
        p.isDefault = (p.id === presetId);
    });
    saveAllPresets(savedPresets);
    renderCustomPresetsList();
    const p = savedPresets.find(x => x.id === presetId);
    showToast(`Preset "${p ? p.title : ''}" is now the default /promotion/ page.`);
};

window.deleteCustomPreset = function (presetId) {
    const p = savedPresets.find(x => x.id === presetId);
    if (!p) return;
    if (!confirm(`Are you sure you want to delete preset "${p.title}"? Normal users will no longer be able to access /promotion/${p.slug}.`)) return;

    savedPresets = savedPresets.filter(x => x.id !== presetId);
    saveAllPresets(savedPresets);

    if (currentActivePreset && currentActivePreset.id === presetId) {
        currentActivePreset = null;
    }

    renderCustomPresetsList();
    setupAdminControls();
    showToast(`Deleted preset "${p.title}"`);
};

function renderCustomPresetsList() {
    const container = document.getElementById('custom-presets-list');
    const countBadge = document.getElementById('custom-presets-count');
    if (!container) return;

    if (countBadge) {
        countBadge.textContent = `${savedPresets.length} Preset${savedPresets.length === 1 ? '' : 's'}`;
    }

    if (savedPresets.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:1.5rem 1rem; color:#888; font-size:0.75rem;">
                No custom presets saved yet. Build a layout and click "+ Save As Preset" to create your first public promotion link.
            </div>
        `;
        return;
    }

    let html = '';
    savedPresets.forEach(p => {
        const isCurrent = currentActivePreset && currentActivePreset.id === p.id;
        const totalRows = (p.pageData || []).length;
        const totalBlocks = (p.pageData || []).reduce((acc, row) => acc + (row.columns || []).reduce((cAcc, col) => cAcc + (col.blocks || []).length, 0), 0);

        html += `
            <div class="custom-preset-card ${isCurrent ? 'is-active-card' : ''}">
                <div class="preset-card-top">
                    <div class="preset-card-title-line">
                        <h4 class="preset-card-title">${escapeHtml(p.title)}</h4>
                        ${p.isDefault ? '<span class="preset-status-tag tag-default">Default Main</span>' : ''}
                        ${isCurrent ? '<span class="preset-status-tag tag-active">Currently Loaded</span>' : ''}
                    </div>
                </div>

                <div class="preset-card-url">
                    <span>Public URL:</span>
                    <a href="/promotion/${encodeURIComponent(p.slug)}" target="_blank" title="Visit public page">/promotion/${escapeHtml(p.slug)}</a>
                </div>

                ${p.description ? `<p style="font-size:0.72rem; color:#666; margin:0.1rem 0;">${escapeHtml(p.description)}</p>` : ''}

                <div class="preset-card-meta">
                    <span>${totalRows} row${totalRows === 1 ? '' : 's'} • ${totalBlocks} element${totalBlocks === 1 ? '' : 's'}</span>
                    <span> • Updated ${new Date(p.updatedAt || Date.now()).toLocaleDateString()}</span>
                </div>

                <div class="preset-card-actions">
                    <button type="button" class="preset-btn btn-load" onclick="loadPresetIntoBuilder('${p.id}')">⚡ Load in Builder</button>
                    <button type="button" class="preset-btn" onclick="copyPresetPublicUrl('${p.slug}')">📋 Copy Link</button>
                    <a href="/promotion/${encodeURIComponent(p.slug)}" target="_blank" class="preset-btn">↗ View Public</a>
                    ${!p.isDefault ? `<button type="button" class="preset-btn" onclick="setPresetAsDefault('${p.id}')">★ Set as Default</button>` : ''}
                    <button type="button" class="preset-btn btn-delete" onclick="deleteCustomPreset('${p.id}')">🗑</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

window.openTemplatesModal = function () {
    renderCustomPresetsList();
    const modal = document.getElementById('templates-modal');
    if (modal) modal.classList.add('is-open');
};

window.applyPresetTemplate = function (type) {
    if (!confirm('Applying this preset will replace the current page content. Proceed?')) return;

    if (type === 'default') {
        pageData = JSON.parse(JSON.stringify(DEFAULT_PAGE_DATA));
    } else if (type === 'split') {
        pageData = [
            {
                id: 'row_' + Date.now() + '_1',
                layout: '2-equal',
                spacing: 'spacious',
                bg: 'transparent',
                columns: [
                    {
                        id: 'col_1_1',
                        blocks: [
                            { id: 'b_1', type: 'badge', text: 'EXCLUSIVE OFFER', color: 'crimson', align: 'left' },
                            { id: 'b_2', type: 'title', text: 'HIGH-FASHION EDITORIAL', level: 'h1', align: 'left' },
                            { id: 'b_3', type: 'subtitle', text: 'SUMMER & AUTUMN COMMISSIONS', color: 'gold', align: 'left' },
                            { id: 'b_4', type: 'text', text: 'Experience private master-crafted photography with fine-art direction and international caliber lighting.', align: 'left' },
                            { id: 'b_5', type: 'button', label: 'BOOK PHOTOSHOOT', linkUrl: '/contact/', style: 'solid', align: 'left' }
                        ]
                    },
                    {
                        id: 'col_1_2',
                        blocks: [
                            { id: 'b_6', type: 'image', url: '/_images/beh/editorial.jpg', ratio: '4-5' }
                        ]
                    }
                ]
            }
        ];
    } else if (type === 'blank') {
        pageData = [];
    }

    currentActivePreset = null;
    savePageData();
    renderPage();
    setupAdminControls();
    closeAllModals();
};

// ── Firestore Optional Cloud Sync ─────────────────────────────────────────
async function syncPresetsToFirestore(presets) {
    try {
        const { db } = await import('../firebase-config.js');
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
        if (db) {
            await setDoc(doc(db, 'settings', 'promotion_presets'), {
                presets: presets,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }
    } catch (_) {
        // Silently skip if Firestore is offline or unauthenticated
    }
}

async function loadPresetsFromFirestore() {
    try {
        const fetchPromise = (async () => {
            const { db } = await import('../firebase-config.js');
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
            if (db) {
                const snap = await getDoc(doc(db, 'settings', 'promotion_presets'));
                if (snap.exists() && Array.isArray(snap.data()?.presets) && snap.data().presets.length > 0) {
                    const cloudPresets = snap.data().presets;
                    const localMap = new Map(savedPresets.map(p => [p.slug, p]));
                    cloudPresets.forEach(cp => localMap.set(cp.slug, cp));
                    savedPresets = Array.from(localMap.values());
                    try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(savedPresets)); } catch (_) {}
                }
            }
        })();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 1200));
        await Promise.race([fetchPromise, timeoutPromise]);
    } catch (_) {
        // Silently skip if offline or timed out
    }
}

window.openJsonModal = function () {
    const modal = document.getElementById('json-modal');
    const textarea = document.getElementById('json-data-textarea');
    if (modal && textarea) {
        textarea.value = JSON.stringify(pageData, null, 2);
        modal.classList.add('is-open');
    }
};

window.importJsonData = function () {
    const textarea = document.getElementById('json-data-textarea');
    if (!textarea) return;
    try {
        const parsed = JSON.parse(textarea.value);
        if (Array.isArray(parsed)) {
            pageData = parsed;
            savePageData();
            renderPage();
            closeAllModals();
            showToast('Page layout imported successfully!');
        } else {
            alert('Invalid JSON: Must be an array of row objects.');
        }
    } catch (e) {
        alert('Invalid JSON format: ' + e.message);
    }
};

// ── 10. Modals Universal Handlers ─────────────────────────────────────────
window.closeAllModals = function () {
    document.querySelectorAll('.builder-modal-backdrop').forEach(m => {
        m.classList.remove('is-open');
    });
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// ── 11. Utilities ─────────────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function getEmbedUrl(url) {
    if (!url) return '';
    if (url.includes('youtube.com/watch')) {
        const id = new URL(url).searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (url.includes('vimeo.com/')) {
        const id = url.split('vimeo.com/')[1]?.split('?')[0];
        return id ? `https://player.vimeo.com/video/${id}` : '';
    }
    return url;
}

let toastTimer = null;
function showToast(message) {
    let toast = document.getElementById('builder-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'builder-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 5.5rem;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: #111111;
            color: #ffffff;
            padding: 0.65rem 1.5rem;
            border-radius: 9999px;
            font-family: 'Inter', sans-serif;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            border: 1px solid rgba(197, 160, 89, 0.4);
            z-index: 100001;
            opacity: 0;
            visibility: hidden;
            transition: all 0.25s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.visibility = 'visible';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.visibility = 'hidden';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2800);
}
