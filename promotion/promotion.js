// ==========================================================================
// ZHUKOV Studio — Promotion Page Block-Based Layout Builder Engine
// Full visual builder for Admin with clean native rendering for visitors
// ==========================================================================

import { app, db } from '../firebase-config.js';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const STORAGE_KEY = 'zhukov_promotion_builder_data';

// Default starter template for new visitors / reset
const DEFAULT_PAGE_DATA = [
    {
        id: 'row_' + Date.now() + '_1',
        layout: '1',
        spacing: 'none',
        bg: 'transparent',
        columns: [
            {
                id: 'col_1_1',
                blocks: [
                    {
                        id: 'b_hero_1',
                        type: 'hero',
                        tag: '01 / CONCEPT / EDITORIAL',
                        titleTop: 'CAPTURING',
                        titleItalic: 'THE',
                        titlePlain: 'UNSEEN',
                        subdeck: 'Where darkness meets light. Exclusive, artistic, and sensual photography that redefines your perspective.',
                        buttons: [
                            { id: 'btn_hero_1', type: 'primary', label: 'EXPLORE PACKAGES →', linkUrl: '#packages' },
                            { id: 'btn_hero_2', type: 'secondary', label: 'INQUIRE NOW', linkUrl: '/contact/' }
                        ],
                        buttonLabel: 'EXPLORE PACKAGES →',
                        linkUrl: '#packages',
                        secButtonLabel: 'INQUIRE NOW',
                        secButtonLink: '/contact/',
                        imageUrl: '/_images/theme_main.jpg',
                        imageAlt: 'Stanislav Zhukov Editorial Photography'
                    }
                ]
            }
        ]
    },
    {
        id: 'row_' + Date.now() + '_2',
        layout: '2-equal',
        spacing: 'none',
        bg: 'card',
        columns: [
            {
                id: 'col_2_1',
                blocks: [
                    {
                        id: 'b_5',
                        type: 'image',
                        url: '/_images/theme_main.jpg',
                        alt: 'Editorial Fashion Shoot',
                        caption: 'High Fashion & Sensual Editorial Atmosphere',
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
                        text: 'A fully tailored creative session exploring conceptual glamour, sensual portraiture, or high-fashion narrative. Includes collaborative moodboard direction, two distinct lighting setups, and magazine-grade retouching on all master deliverables.',
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
        spacing: 'none',
        bg: 'transparent',
        columns: [
            {
                id: 'col_3_1',
                blocks: [
                    {
                        id: 'b_11',
                        type: 'pricing',
                        kicker: 'TIER I • ESSENTIAL',
                        title: 'PORTRAIT CAPSULE',
                        price: '€280',
                        period: 'per session',
                        subtitle: '90-Minute Daylight or Studio Portraiture',
                        desc: 'Ideal for agency model test shoots, personal portfolios, and natural confidence building.',
                        features: '✓ 90 Minutes shooting time\n✓ 1 Studio daylight lighting setup\n✓ 6 Magazine-grade retouched deliverables\n✓ Private digital proofs gallery\n✓ Commercial & personal usage release',
                        buttonLabel: 'BOOK CAPSULE',
                        linkUrl: '/contact/',
                        buttonStyle: 'outline',
                        isFeatured: false,
                        align: 'left'
                    }
                ]
            },
            {
                id: 'col_3_2',
                blocks: [
                    {
                        id: 'b_12',
                        type: 'pricing',
                        kicker: 'TIER II • GLAMOUR',
                        title: 'SENSUAL ATELIER',
                        price: '€650',
                        period: 'per session',
                        subtitle: '3-Hour Intimate Boudoir or Haute Glamour',
                        desc: 'Intimate boudoir or glamour production with custom shadow play and emotive fine-art color grading.',
                        features: '✓ 3 Hours comprehensive studio time\n✓ 2 Distinct creative lighting setups\n✓ 15 High-fashion master retouches\n✓ Collaborative moodboard styling\n✓ Private high-res delivery gallery',
                        buttonLabel: 'BOOK ATELIER',
                        linkUrl: '/contact/',
                        buttonStyle: 'gold',
                        isFeatured: true,
                        badge: 'MOST POPULAR',
                        align: 'left'
                    }
                ]
            },
            {
                id: 'col_3_3',
                blocks: [
                    {
                        id: 'b_13',
                        type: 'pricing',
                        kicker: 'TIER III • BESPOKE',
                        title: 'THEMATIC ODYSSEY',
                        price: '€1,200',
                        period: 'full day',
                        subtitle: 'Cinematic Cosplay & World-Building',
                        desc: 'Half-day cinematic cosplay, fantasy world-building, and special atmospheric lighting with composite retouching.',
                        features: '✓ Full half-day dedicated production\n✓ Special atmospheric FX lighting\n✓ 25 Master editorial art deliverables\n✓ Creative composite post-production\n✓ Direct creative director consultation',
                        buttonLabel: 'BOOK ODYSSEY',
                        linkUrl: '/contact/',
                        buttonStyle: 'outline',
                        isFeatured: false,
                        align: 'left'
                    }
                ]
            }
        ]
    },
    {
        id: 'row_' + Date.now() + '_4',
        layout: '1',
        spacing: 'none',
        bg: 'gold-tint',
        columns: [
            {
                id: 'col_4_1',
                blocks: [
                    {
                        id: 'b_14',
                        type: 'countdown',
                        kicker: 'SEASONAL EDITORIAL PROMOTION',
                        title: 'EXCLUSIVE PROMOTION SESSIONS CLOSE IN:',
                        targetDate: '2026-11-01T23:59',
                        note: 'Limited to 6 atelier commissions per month. Early booking ensures calendar priority.'
                    }
                ]
            }
        ]
    },
    {
        id: 'row_' + Date.now() + '_5',
        layout: '2-equal',
        spacing: 'none',
        bg: 'card',
        columns: [
            {
                id: 'col_5_1',
                blocks: [
                    { id: 'b_15', type: 'subtitle', text: 'FAQ & BOOKING POLICIES', color: 'crimson', align: 'left' },
                    { id: 'b_16', type: 'title', text: 'COMMON INQUIRIES', level: 'h2', align: 'left' },
                    {
                        id: 'b_17',
                        type: 'accordion',
                        items: [
                            { q: 'How do I reserve an editorial commission date?', a: 'You can submit an inquiry through our contact page. A 30% retainer confirms your selected date in our studio calendar.' },
                            { q: 'Are moodboards and styling direction included?', a: 'Yes. Every booking includes a private collaborative moodboard and styling guidance prior to shooting.' },
                            { q: 'When do I receive my retouched photographs?', a: 'Online preview proofs are shared within 48 hours. Master high-fashion retouches are delivered within 10 to 14 business days.' },
                            { q: 'Can we shoot on location or in studio?', a: 'Both options are available. We operate a dedicated atelier studio and also shoot on private location sets.' }
                        ]
                    }
                ]
            },
            {
                id: 'col_5_2',
                blocks: [
                    {
                        id: 'b_18',
                        type: 'image',
                        url: '/_images/location_studio.jpg',
                        alt: 'Studio Production Setup',
                        caption: 'Zhukov Atelier Studio Environment',
                        ratio: '4-5'
                    }
                ]
            }
        ]
    },
    {
        id: 'row_' + Date.now() + '_6',
        layout: '1',
        spacing: 'none',
        bg: 'transparent',
        columns: [
            {
                id: 'col_6_1',
                blocks: [
                    {
                        id: 'b_19',
                        type: 'quote',
                        text: '“Every photograph should evoke confidence, grace, and effortless cinematic allure.”',
                        author: 'Stanislav Zhukov — Creative Director',
                        align: 'center'
                    },
                    { id: 'b_20', type: 'spacer', height: 20, line: 'gold' },
                    {
                        id: 'b_21',
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

// Verified Studio Photo Library assets available in repo
const STUDIO_LIBRARY_IMAGES = [
    { url: '/_images/theme_main.jpg', title: 'Main Editorial Portrait' },
    { url: '/_images/theme_concept_a.jpg', title: 'Sensual Concept A' },
    { url: '/_images/theme_concept_b.jpg', title: 'Haute Glamour Concept B' },
    { url: '/_images/location_studio.jpg', title: 'Studio Production Setup' },
    { url: '/_images/location_interior.jpg', title: 'Interior Atelier Atmosphere' },
    { url: '/_images/location_waterfall.jpg', title: 'Outdoor Natural Location' },
    { url: '/_images/moodboard_preview.jpg', title: 'Editorial Moodboard' },
    { url: '/_images/editing_preview.jpg', title: 'Retouching & Grading Suite' }
];

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
                spacing: 'none',
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
                            { id: 'b_sa_7', type: 'image', url: '/_images/theme_concept_a.jpg', ratio: '4-5', alt: 'Summer Atelier Model' }
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

// History & Usability State
let historyStack = [];
let historyIndex = -1;
let isUnsaved = false;
let previewViewport = 'desktop'; // 'desktop' | 'tablet' | 'mobile'
let presetsSearchTerm = '';
let currentMovingBlockInfo = null; // { colId, blockId }

function pushHistoryState() {
    if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
    }
    historyStack.push(JSON.parse(JSON.stringify(pageData)));
    if (historyStack.length > 40) {
        historyStack.shift();
    } else {
        historyIndex++;
    }
    isUnsaved = true;
    setupAdminControls();
}
window.pushHistoryState = pushHistoryState;

window.undo = function () {
    if (historyIndex > 0) {
        historyIndex--;
        pageData = JSON.parse(JSON.stringify(historyStack[historyIndex]));
        savePageData(false);
        renderPage();
        setupAdminControls();
        showToast('Undo performed ↶');
    }
};

window.redo = function () {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        pageData = JSON.parse(JSON.stringify(historyStack[historyIndex]));
        savePageData(false);
        renderPage();
        setupAdminControls();
        showToast('Redo performed ↷');
    }
};

window.setPreviewViewport = function (device) {
    previewViewport = device;
    const main = document.querySelector('.vogue-promotion-main');
    if (main) {
        main.classList.remove('preview-mobile', 'preview-tablet');
        if (device === 'mobile') main.classList.add('preview-mobile');
        if (device === 'tablet') main.classList.add('preview-tablet');
    }
    setupAdminControls();
};

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

// ── Firebase Auth & Role Verification ─────────────────────────────────────
let currentFirebaseUser = null;
let isUserVerifiedAdmin = false;

// Check Admin Status (cached flag or query override)
function checkIsAdmin() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        try { localStorage.setItem('zhukov_is_admin', 'true'); } catch (e) { }
        return true;
    }
    return localStorage.getItem('zhukov_is_admin') === 'true';
}

// Initialize Firebase Authentication & Role Check
function initPromotionAuth() {
    isUserVerifiedAdmin = checkIsAdmin();

    onAuthStateChanged(auth, async (user) => {
        currentFirebaseUser = user;
        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    isUserVerifiedAdmin = true;
                    localStorage.setItem('zhukov_is_admin', 'true');
                } else {
                    if (!new URLSearchParams(window.location.search).get('admin')) {
                        isUserVerifiedAdmin = false;
                        localStorage.removeItem('zhukov_is_admin');
                    }
                }
            } catch (err) {
                console.warn("Could not verify user admin role in Firestore:", err);
            }
            if (window.updateHeaderAuthState) {
                window.updateHeaderAuthState(user, isUserVerifiedAdmin);
            }
        } else {
            localStorage.removeItem('zhukov_logged_in');
            if (!new URLSearchParams(window.location.search).get('admin')) {
                isUserVerifiedAdmin = false;
                localStorage.removeItem('zhukov_is_admin');
            }
            if (window.updateHeaderAuthState) {
                window.updateHeaderAuthState(null, false);
            }
        }
        setupAdminControls();
        renderPage();
    });

    // Delegated click listeners for header login/logout
    document.addEventListener('click', (e) => {
        const loginTarget = e.target.closest('#login-btn-header');
        if (loginTarget) {
            localStorage.setItem('zhukov_logged_in', 'true');
            signInWithPopup(auth, provider).catch(error => {
                console.error("Sign-in error:", error);
                showToast("Sign in error: " + (error.message || error));
            });
        }

        const logoutTarget = e.target.closest('#logout-btn');
        if (logoutTarget) {
            localStorage.removeItem('zhukov_logged_in');
            localStorage.removeItem('zhukov_is_admin');
            signOut(auth).then(() => {
                showToast("Logged out");
            }).catch(error => console.error(error));
        }
    });
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

    // Ensure built-in starter preset contains the latest pricing, countdown, and accordion showcases
    const sigPreset = savedPresets.find(p => p.id === 'preset_signature_editorial');
    const hasPricingBlock = sigPreset && (sigPreset.pageData || []).some(r => (r.columns || []).some(c => (c.blocks || []).some(b => b.type === 'pricing')));
    if (sigPreset && !hasPricingBlock) {
        sigPreset.pageData = JSON.parse(JSON.stringify(DEFAULT_PAGE_DATA));
        try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(savedPresets)); } catch (_) {}
    }

    window.savedPresets = savedPresets;
    return savedPresets;
}

// ── Firestore Cloud Sync Functions ─────────────────────────────────────────
async function syncSinglePresetToFirestore(preset) {
    if (!preset || !db) return;
    const cleanPayload = {
        id: preset.id,
        title: preset.title,
        slug: preset.slug,
        description: preset.description || '',
        isDefault: !!preset.isDefault,
        pageData: preset.pageData || [],
        createdAt: preset.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || (checkIsAdmin() ? 'admin' : 'unknown')
    };

    const writes = [
        setDoc(doc(db, 'promotions', preset.slug), cleanPayload, { merge: true })
    ];
    if (preset.id && preset.id !== preset.slug) {
        writes.push(setDoc(doc(db, 'promotions', preset.id), cleanPayload, { merge: true }));
    }
    if (preset.isDefault) {
        writes.push(setDoc(doc(db, 'promotions', 'default'), cleanPayload, { merge: true }));
    }
    await Promise.all(writes);
}

async function syncPresetsToFirestore(presets) {
    if (!db) return;
    try {
        // 1. Sync full presets registry to settings/promotion_presets
        await setDoc(doc(db, 'settings', 'promotion_presets'), {
            presets: presets,
            updatedAt: new Date().toISOString(),
            updatedBy: auth.currentUser?.email || (checkIsAdmin() ? 'admin' : 'unknown')
        }, { merge: true });

        // 2. Also ensure each preset exists as a standalone document in /promotions/{slug}
        if (Array.isArray(presets)) {
            await Promise.all(presets.map(p => syncSinglePresetToFirestore(p)));
        }
    } catch (err) {
        console.error("Firestore syncPresets error:", err);
        throw err;
    }
}

async function saveDefaultPageToFirestore(showFeedback = true) {
    if (!db) return;
    try {
        const pagePayload = {
            id: 'default',
            slug: 'default',
            title: 'Editorial Promotion',
            isDefault: true,
            pageData: JSON.parse(JSON.stringify(pageData)),
            updatedAt: new Date().toISOString(),
            updatedBy: auth.currentUser?.email || (checkIsAdmin() ? 'admin' : 'unknown')
        };

        await Promise.all([
            setDoc(doc(db, 'promotions', 'default'), pagePayload, { merge: true }),
            setDoc(doc(db, 'settings', 'promotion_page'), pagePayload, { merge: true })
        ]);

        if (showFeedback) {
            showToast('Page layout saved to Firestore ✓');
        }
    } catch (err) {
        console.error("Failed to save default promotion page to Firestore:", err);
        if (showFeedback) {
            if (!auth.currentUser) {
                showToast('Saved locally in browser. (Sign in with Google in header to save to Firestore)', 4500);
            } else {
                showToast(`Saved locally (Firestore: ${err.code || err.message})`, 4500);
            }
        }
    }
}

async function saveAllPresets(presets, showNotice = false) {
    savedPresets = presets;
    try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets)); } catch (_) {}
    try {
        await syncPresetsToFirestore(presets);
        if (showNotice) {
            showToast('Presets synced to Firestore ✓');
        }
    } catch (err) {
        console.error("Firestore saveAllPresets error:", err);
        if (showNotice) {
            if (!auth.currentUser) {
                showToast('Saved locally in browser. (Sign in with Google in header to sync to Firestore)', 4500);
            } else {
                showToast(`Saved locally (Firestore notice: ${err.code || err.message})`, 4500);
            }
        }
        throw err;
    }
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
function initPromotionApp() {
    initPromotionAuth();
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromotionApp);
} else {
    initPromotionApp();
}

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

    const hasPricing = pageData.some(r => (r.columns || []).some(c => (c.blocks || []).some(b => b.type === 'pricing')));
    if (!hasPricing && (!raw || pageData.length <= 4)) {
        pageData = JSON.parse(JSON.stringify(DEFAULT_PAGE_DATA));
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pageData)); } catch (_) {}
    }

    historyStack = [JSON.parse(JSON.stringify(pageData))];
    historyIndex = 0;
    isUnsaved = false;
    window.pageData = pageData;
}

async function savePageData(showFeedback = true) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pageData)); } catch (_) {}
    isUnsaved = false;
    window.pageData = pageData;

    // If currently editing an existing preset, keep preset updated in sync
    if (currentActivePreset) {
        const idx = savedPresets.findIndex(p => p.id === currentActivePreset.id);
        if (idx !== -1) {
            savedPresets[idx].pageData = JSON.parse(JSON.stringify(pageData));
            savedPresets[idx].updatedAt = new Date().toISOString();
            try {
                await saveAllPresets(savedPresets, false);
                if (showFeedback) {
                    showToast(`Saved layout to preset "${savedPresets[idx].title}" & Firestore ✓`);
                }
            } catch (err) {
                if (showFeedback) {
                    if (!auth.currentUser) {
                        showToast(`Saved locally. (Sign in with Google in header to save to Firestore cloud)`, 4500);
                    } else {
                        showToast(`Saved locally (Firestore: ${err.code || err.message})`, 4500);
                    }
                }
            }
            setupAdminControls();
            return;
        }
    }

    // Saving default page to Firestore
    await saveDefaultPageToFirestore(showFeedback);
}
window.savePageData = savePageData;

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
    const addRowBefore = isEditActive && rowIndex > 0 ? `
        <div class="add-row-zone">
            <button type="button" class="add-row-btn" onclick="addNewRow(${rowIndex})">
                <span>+</span> INSERT ROW HERE
            </button>
        </div>
    ` : '';

    const numCols = (row.columns || []).length || 1;
    let colWidths = Array.isArray(row.colWidths) && row.colWidths.length === numCols
        ? row.colWidths.map(Number)
        : Array(numCols).fill(100 / numCols);

    const totalW = colWidths.reduce((a, b) => a + b, 0);
    if (Math.abs(totalW - 100) > 0.5 && totalW > 0) {
        colWidths = colWidths.map(w => (w / totalW) * 100);
    }

    const colGap = typeof row.colGap === 'number' ? row.colGap : 0;

    let colHtml = '';
    (row.columns || []).forEach((col, colIndex) => {
        // Draggable resizer line between adjacent columns with gap button
        if (colIndex > 0 && isEditActive) {
            colHtml += `
                <div class="col-resizer-line" data-row-id="${row.id}" data-split-index="${colIndex - 1}">
                    <div class="col-resizer-hitbox" onmousedown="initColResize(event, '${row.id}', ${colIndex - 1})">
                        <div class="col-resizer-visual-bar"></div>
                    </div>
                    <button type="button" class="col-divider-gap-btn" onclick="toggleColumnGapPopover(event, '${row.id}', ${colIndex - 1})" title="Adjust Column Spacing / Gap">
                        <span class="gap-icon">↔</span>
                        <span class="gap-label">${colGap}px</span>
                    </button>
                </div>
            `;
        }

        colHtml += renderColumn(col, row.id, colIndex, isEditActive, colWidths[colIndex], numCols);
    });

    const adminBar = isEditActive ? `
        <div class="row-admin-bar">
            <span style="font-size: 0.6rem; color: #a1a1aa; font-weight: 700; margin-right: 0.35rem;">ROW ${rowIndex + 1} (${numCols} COL${numCols > 1 ? 'S' : ''})</span>
            <button type="button" class="row-action-btn" title="Add Column to the Right" onclick="addColumnToRow('${row.id}', ${numCols - 1}, 'right')">+ Column</button>
            <button type="button" class="row-action-btn" title="Row Padding & Atmosphere" onclick="openRowSettingsModal('${row.id}')">📐 Layout</button>
            <button type="button" class="row-action-btn" title="Move Up" onclick="moveRow(${rowIndex}, -1)" ${rowIndex === 0 ? 'disabled style="opacity:0.3;"' : ''}>↑</button>
            <button type="button" class="row-action-btn" title="Move Down" onclick="moveRow(${rowIndex}, 1)" ${rowIndex === pageData.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>↓</button>
            <button type="button" class="row-action-btn" title="Duplicate Row" onclick="duplicateRow('${row.id}')">⧉</button>
            <button type="button" class="row-action-btn btn-danger" title="Delete Row" onclick="deleteRow('${row.id}')">🗑</button>
        </div>
    ` : '';

    return `
        ${addRowBefore}
        <section class="pub-row spacing-${row.spacing || 'none'} bg-${row.bg || 'transparent'}" id="${row.id}" data-row-id="${row.id}">
            ${adminBar}
            <div class="pub-row-inner" style="gap: ${colGap}px;">
                ${colHtml}
            </div>
        </section>
    `;
}

function renderColumn(col, rowId, colIndex, isEditActive, colWidthPct, totalCols) {
    let blocksHtml = '';
    (col.blocks || []).forEach((block, blockIndex) => {
        blocksHtml += renderBlock(block, col.id, blockIndex, isEditActive);
    });

    const colWidthFormatted = Math.round(colWidthPct || (100 / totalCols));

    const colAdminBar = isEditActive ? `
        <div class="col-admin-bar">
            <button type="button" class="col-quick-add-btn" onclick="addColumnToRow('${rowId}', ${colIndex}, 'left')" title="Add column to the left of this column">
                <span>+</span> Left
            </button>
            <span class="col-meta-pill" title="Column proportion">
                Col ${colIndex + 1} • ${colWidthFormatted}%
            </span>
            ${totalCols > 1 ? `
                <button type="button" class="col-quick-del-btn" onclick="deleteColumnFromRow('${rowId}', ${colIndex})" title="Remove this column">
                    ✕
                </button>
            ` : ''}
            <button type="button" class="col-quick-add-btn" onclick="addColumnToRow('${rowId}', ${colIndex}, 'right')" title="Add column to the right of this column">
                <span>+</span> Right
            </button>
        </div>
    ` : '';

    const addBlockBtn = isEditActive ? `
        <button type="button" class="col-add-block-btn" onclick="openBlockPicker('${col.id}')">
            <span>+</span> ADD ELEMENT
        </button>
    ` : '';

    // Clickable edge triggers for quick side adding
    const edgeTriggers = isEditActive ? `
        <div class="col-edge-trigger edge-left" onclick="addColumnToRow('${rowId}', ${colIndex}, 'left')" title="Click to add column on left">
            <span>+</span>
        </div>
        <div class="col-edge-trigger edge-right" onclick="addColumnToRow('${rowId}', ${colIndex}, 'right')" title="Click to add column on right">
            <span>+</span>
        </div>
    ` : '';

    return `
        <div class="pub-col" id="${col.id}" data-col-id="${col.id}" data-col-index="${colIndex}"
             style="flex: ${colWidthPct} ${colWidthPct} 0px;">
            ${colAdminBar}
            ${edgeTriggers}
            ${blocksHtml}
            ${addBlockBtn}
        </div>
    `;
}

function getHeroButtons(block) {
    if (Array.isArray(block.buttons)) {
        return block.buttons;
    }
    const btns = [];
    if (block.showButton !== false) {
        btns.push({
            id: 'hbtn_' + (block.id || '1') + '_1',
            type: 'primary',
            label: block.buttonLabel || 'EXPLORE PORTFOLIO',
            linkUrl: block.linkUrl || '#packages'
        });
    }
    if (block.showSecondaryButton) {
        btns.push({
            id: 'hbtn_' + (block.id || '1') + '_2',
            type: 'secondary',
            label: block.secButtonLabel || 'INQUIRE NOW',
            linkUrl: block.secButtonLink || '/contact/'
        });
    }
    return btns;
}

function renderBlock(block, colId, blockIndex, isEditActive) {
    let contentHtml = '';
    const alignClass = `align-${block.align || 'left'}`;

    switch (block.type) {
        case 'hero':
            const heroTag = block.tag || '01 / CONCEPT / EDITORIAL';
            const heroTop = block.titleTop || 'CAPTURING';
            const heroItalic = block.titleItalic || 'THE';
            const heroPlain = block.titlePlain || 'UNSEEN';
            const heroSubdeck = block.subdeck || 'Where darkness meets light. Exclusive, artistic, and sensual photography that redefines your perspective.';
            const heroBtn = block.buttonLabel || 'EXPLORE PORTFOLIO';
            const heroLink = block.linkUrl || '#packages';
            const heroImg = block.imageUrl || '/_images/theme_main.jpg';
            const heroAlt = block.imageAlt || 'Editorial Hero Photography';

            // Hero image alignment
            const heroImgAlign = block.imageAlign || 'center';
            let heroImgValign = '20%';
            if (block.imageValign === 'top') heroImgValign = 'top';
            else if (block.imageValign === 'center') heroImgValign = 'center';
            else if (block.imageValign === 'bottom') heroImgValign = 'bottom';
            else if (block.imageValign === 'editorial') heroImgValign = '20%';
            const heroImgPosition = `${heroImgAlign} ${heroImgValign}`;

            // Left section modular elements
            const showTag = block.showTag !== false;
            const showTitle = block.showTitle !== false;
            const showSubdeck = block.showSubdeck !== false;
            const showBtn = block.showButton !== false;
            const showSecBtn = !!block.showSecondaryButton;
            const showBadge = !!block.showBadge;
            const showNote = !!block.showExtraNote;

            const tagHtml = showTag ? `
                <div class="pub-hero-item-wrapper hero-elem-tag">
                    <span class="pub-hero-issue-tag hero-issue-tag" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="tag"` : ''}>
                        ${escapeHtml(heroTag)}
                    </span>
                    ${isEditActive ? `<button type="button" class="hero-item-del-btn" onclick="removeHeroElement('${block.id}', 'tag')" title="Remove Issue Tag">✕</button>` : ''}
                </div>
            ` : '';

            const badgeHtml = showBadge ? `
                <div class="pub-hero-item-wrapper hero-elem-badge" style="margin-bottom:0.75rem;">
                    <span class="pub-badge color-${block.badgeColor || 'gold'}">
                        ${escapeHtml(block.badgeText || 'SPECIAL FEATURE')}
                    </span>
                    ${isEditActive ? `<button type="button" class="hero-item-del-btn" onclick="removeHeroElement('${block.id}', 'badge')" title="Remove Badge">✕</button>` : ''}
                </div>
            ` : '';

            const titleHtml = showTitle ? `
                <div class="pub-hero-item-wrapper hero-elem-title">
                    <h1 class="pub-hero-main-title hero-main-title">
                        <span class="pub-hero-line-top hero-line-top" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="titleTop"` : ''}>
                            ${escapeHtml(heroTop)}
                        </span>
                        <span class="pub-hero-line-bottom hero-line-bottom">
                            <span class="pub-hero-line-italic line-italic" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="titleItalic"` : ''}>
                                ${escapeHtml(heroItalic)}
                            </span>
                            <span class="pub-hero-line-plain line-plain" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="titlePlain"` : ''}>
                                ${escapeHtml(heroPlain)}
                            </span>
                        </span>
                    </h1>
                    ${isEditActive ? `<button type="button" class="hero-item-del-btn" onclick="removeHeroElement('${block.id}', 'title')" title="Remove Title">✕</button>` : ''}
                </div>
            ` : '';

            const subdeckHtml = showSubdeck ? `
                <div class="pub-hero-item-wrapper hero-elem-subdeck">
                    <p class="pub-hero-subdeck hero-subdeck" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="subdeck"` : ''}>
                        ${escapeHtml(heroSubdeck)}
                    </p>
                    ${isEditActive ? `<button type="button" class="hero-item-del-btn" onclick="removeHeroElement('${block.id}', 'subdeck')" title="Remove Subdeck">✕</button>` : ''}
                </div>
            ` : '';

            const noteHtml = showNote ? `
                <div class="pub-hero-item-wrapper hero-elem-note" style="margin-bottom:1rem; font-size:0.8rem; color:#888; font-style:italic;">
                    <span ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="extraNote"` : ''}>
                        ${escapeHtml(block.extraNote || 'Limited editorial sessions available each season.')}
                    </span>
                    ${isEditActive ? `<button type="button" class="hero-item-del-btn" onclick="removeHeroElement('${block.id}', 'extraNote')" title="Remove Note">✕</button>` : ''}
                </div>
            ` : '';

            // Buttons list (supports multiple primary and secondary buttons)
            const heroButtons = getHeroButtons(block);
            const buttonsHtml = heroButtons.length > 0 ? `
                <div class="pub-hero-action-container hero-action-container" style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
                    ${heroButtons.map((btn, bIndex) => {
                        const isPrimary = btn.type === 'primary';
                        const btnClass = isPrimary ? 'pub-hero-action-btn hero-action-btn' : 'pub-btn style-outline';
                        const extraStyle = !isPrimary ? 'font-size:0.75rem; padding:0.6rem 1.4rem; letter-spacing:0.12em;' : '';
                        return `
                            <div class="pub-hero-item-wrapper hero-elem-btn" data-hero-btn-id="${btn.id}">
                                <a href="${isEditActive ? '#' : (btn.linkUrl || '#')}"
                                   class="${btnClass}"
                                   style="${extraStyle}"
                                   ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-btn-index="${bIndex}" data-field="heroButtonLabel"` : ''}>
                                    ${escapeHtml(btn.label || (isPrimary ? 'PRIMARY ACTION' : 'SECONDARY ACTION'))}
                                </a>
                                ${isEditActive ? `<button type="button" class="hero-item-del-btn" onclick="removeHeroButton('${block.id}', ${bIndex})" title="Remove this ${btn.type} button">✕</button>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '';

            const addElementMenu = isEditActive ? `
                <div class="hero-add-element-bar" style="margin-top: 1.5rem; position: relative;">
                    <button type="button" class="hero-add-elem-btn" onclick="toggleHeroAddMenu(event, '${block.id}')" title="Add elements to the hero left section">
                        <span>+</span> Add Element to Hero Left Section ▾
                    </button>
                    <div id="hero-add-menu-${block.id}" class="hero-add-dropdown-menu" style="display: none;">
                        <button type="button" class="hero-menu-opt" onclick="addHeroButton('${block.id}', 'primary')">🔘 + Add Primary Action Button</button>
                        <button type="button" class="hero-menu-opt" onclick="addHeroButton('${block.id}', 'secondary')">🔘 + Add Secondary Action Button</button>
                        ${!showTag ? `<button type="button" class="hero-menu-opt" onclick="addHeroElement('${block.id}', 'tag')">🏷️ + Issue / Concept Tag</button>` : ''}
                        ${!showBadge ? `<button type="button" class="hero-menu-opt" onclick="addHeroElement('${block.id}', 'badge')">✦ + Concept Badge</button>` : ''}
                        ${!showTitle ? `<button type="button" class="hero-menu-opt" onclick="addHeroElement('${block.id}', 'title')">🔤 + Main Editorial Title</button>` : ''}
                        ${!showSubdeck ? `<button type="button" class="hero-menu-opt" onclick="addHeroElement('${block.id}', 'subdeck')">📝 + Subdeck Description</button>` : ''}
                        ${!showNote ? `<button type="button" class="hero-menu-opt" onclick="addHeroElement('${block.id}', 'extraNote')">💬 + Editorial Note / Extra Text</button>` : ''}
                    </div>
                </div>
            ` : '';

            contentHtml = `
                <div class="pub-editorial-hero" id="hero-${block.id}">
                    <div class="pub-hero-text-container hero-text-container">
                        <div class="pub-hero-editorial-card hero-editorial-card">
                            ${tagHtml}
                            ${badgeHtml}
                            ${titleHtml}
                            ${subdeckHtml}
                            ${noteHtml}
                            ${buttonsHtml}
                            ${addElementMenu}
                        </div>
                    </div>
                    <div class="pub-hero-diagonal-cut-wrapper hero-diagonal-cut-wrapper">
                        <img src="${heroImg}" alt="${escapeHtml(heroAlt)}" class="pub-hero-img" id="hero-img" loading="eager" style="object-position: ${heroImgPosition} !important;">
                        ${isEditActive ? `
                            <button type="button" class="pub-hero-photo-btn" onclick="openBlockSettingsModal('${block.id}')" title="Change Hero Image & Alignment">
                                📷 Hero Image & Alignment
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            break;

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

        case 'pricing':
            const isFeatured = !!block.isFeatured;
            const featuredClass = isFeatured ? 'is-featured' : '';
            const badgeText = block.badge || (isFeatured ? 'MOST POPULAR' : '');
            const rawFeatures = Array.isArray(block.features) 
                ? block.features 
                : (typeof block.features === 'string' ? block.features.split('\n') : []);
            const featuresList = rawFeatures.map(f => f.trim()).filter(Boolean);
            const isPriceStrikethrough = !!block.strikethroughPrice;
            const hasOrigPrice = !!block.originalPrice;
            const hasDiscount = !!block.discount;

            contentHtml = `
                <div class="pub-pricing-card ${featuredClass} ${alignClass}">
                    ${badgeText ? `<div class="pub-pricing-badge-slot">${escapeHtml(badgeText)}</div>` : ''}
                    ${block.kicker ? `<div class="pub-pricing-kicker" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="kicker"` : ''}>${escapeHtml(block.kicker)}</div>` : ''}
                    <h3 class="pub-pricing-title" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="title"` : ''}>${escapeHtml(block.title || 'PACKAGE NAME')}</h3>
                    <div class="pub-pricing-price-wrap">
                        ${hasOrigPrice ? `
                            <span class="pub-pricing-original-price" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="originalPrice" title="Original Strikethrough Price"` : ''}>${escapeHtml(block.originalPrice)}</span>
                        ` : ''}
                        <span class="pub-pricing-price ${isPriceStrikethrough ? 'is-strikethrough' : ''}" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="price"` : ''}>${escapeHtml(block.price || '€450')}</span>
                        ${block.period ? `<span class="pub-pricing-period" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="period"` : ''}>${escapeHtml(block.period)}</span>` : ''}
                        ${hasDiscount ? `
                            <span class="pub-pricing-discount-tag" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="discount" title="Promotional Discount"` : ''}>${escapeHtml(block.discount)}</span>
                        ` : ''}
                    </div>
                    ${block.subtitle ? `<div class="pub-pricing-subtitle" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="subtitle"` : ''}>${escapeHtml(block.subtitle)}</div>` : ''}
                    ${block.desc ? `<div class="pub-pricing-desc" ${isEditActive ? `contenteditable="true" data-block-id="${block.id}" data-field="desc"` : ''}>${escapeHtml(block.desc)}</div>` : ''}
                    ${featuresList.length > 0 ? `
                        <ul class="pub-pricing-features-list">
                            ${featuresList.map(item => `
                                <li class="pub-pricing-feature-item">
                                    <span class="pub-pricing-feature-icon">✓</span>
                                    <span>${escapeHtml(item.replace(/^✓\s*/, ''))}</span>
                                </li>
                            `).join('')}
                        </ul>
                    ` : ''}
                    <div style="margin-top: auto; padding-top: 0.5rem;">
                        <a href="${isEditActive ? '#' : (block.linkUrl || '/contact/')}"
                           class="pub-btn style-${block.buttonStyle || (isFeatured ? 'gold' : 'solid')}"
                           style="width: 100%; box-sizing: border-box; text-align: center;">
                            ${escapeHtml(block.buttonLabel || 'BOOK THIS PACKAGE →')}
                        </a>
                    </div>
                </div>
            `;
            break;

        case 'countdown':
            const targetDate = block.targetDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
            contentHtml = `
                <div class="pub-countdown-block" data-target-date="${targetDate}">
                    ${block.kicker ? `<div class="pub-countdown-kicker">${escapeHtml(block.kicker)}</div>` : ''}
                    <h2 class="pub-countdown-title">${escapeHtml(block.title || 'EXCLUSIVE OFFER CLOSES IN:')}</h2>
                    <div class="pub-countdown-grid">
                        <div class="pub-countdown-unit">
                            <span class="pub-countdown-number cd-days">00</span>
                            <span class="pub-countdown-label">Days</span>
                        </div>
                        <div class="pub-countdown-unit">
                            <span class="pub-countdown-number cd-hours">00</span>
                            <span class="pub-countdown-label">Hours</span>
                        </div>
                        <div class="pub-countdown-unit">
                            <span class="pub-countdown-number cd-mins">00</span>
                            <span class="pub-countdown-label">Mins</span>
                        </div>
                        <div class="pub-countdown-unit">
                            <span class="pub-countdown-number cd-secs">00</span>
                            <span class="pub-countdown-label">Secs</span>
                        </div>
                    </div>
                    ${block.note ? `<p style="font-size:0.75rem; color:#888; margin-top:1rem; letter-spacing:0.05em;">${escapeHtml(block.note)}</p>` : ''}
                </div>
            `;
            break;

        case 'accordion':
            const accordionItems = Array.isArray(block.items) && block.items.length > 0 ? block.items : [
                { q: 'How do I reserve a date for an editorial commission?', a: 'You can submit an inquiry via our contact form. A 30% retainer confirms your selected date in our studio calendar.' },
                { q: 'Are wardrobe direction and moodboards included?', a: 'Yes. Every booking includes a private collaborative moodboard and styling consultation prior to shooting.' },
                { q: 'What is the delivery timeline for retouched deliverables?', a: 'High-resolution preview selections are available within 48 hours. Master high-fashion retouches are delivered within 10 to 14 business days.' }
            ];

            contentHtml = `
                <div class="pub-accordion" id="acc_${block.id}">
                    ${accordionItems.map((item, idx) => `
                        <div class="pub-accordion-item ${idx === 0 ? 'is-open' : ''}">
                            <button type="button" class="pub-accordion-header" onclick="toggleAccordionItem(this)">
                                <span>${escapeHtml(item.q || item.question || 'Question')}</span>
                                <span class="pub-accordion-icon">+</span>
                            </button>
                            <div class="pub-accordion-content">
                                <p style="margin:0;">${escapeHtml(item.a || item.answer || 'Answer')}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            break;

        case 'features':
            const featItems = Array.isArray(block.items) && block.items.length > 0 ? block.items : [
                { icon: '✦', title: 'Haute Couture Direction', desc: 'Personalized visual narrative with curated moodboard alignment.' },
                { icon: '◈', title: 'Master Lighting Setups', desc: 'Two distinct atmospheric setups in daylight or cinema strobes.' },
                { icon: '⚜', title: 'Magazine Deliverables', desc: 'High-end color grading and Vogue-standard skin retouching.' }
            ];

            contentHtml = `
                <div class="pub-features-grid">
                    ${featItems.map(item => `
                        <div class="pub-feature-item">
                            <div class="pub-feature-icon">${escapeHtml(item.icon || '✦')}</div>
                            <h4 class="pub-feature-title">${escapeHtml(item.title || 'Feature Title')}</h4>
                            <p class="pub-feature-desc">${escapeHtml(item.desc || 'Feature description details.')}</p>
                        </div>
                    `).join('')}
                </div>
            `;
            break;

        case 'image':
            let horizAlign = block.align || 'center';
            let vertAlign = block.valign || 'center';
            let focalPos = block.focal || 'center';

            // Support direct top/bottom values if passed in align
            if (block.align === 'top') { vertAlign = 'top'; horizAlign = 'center'; }
            else if (block.align === 'bottom') { vertAlign = 'bottom'; horizAlign = 'center'; }
            else if (block.align === 'center-top') { vertAlign = 'top'; focalPos = 'top'; horizAlign = 'center'; }
            else if (block.align === 'center-bottom') { vertAlign = 'bottom'; focalPos = 'bottom'; horizAlign = 'center'; }

            const imgRatio = `ratio-${block.ratio || 'auto'}`;
            const imgWidth = block.width || '100%';
            const imgValign = `valign-${vertAlign}`;
            const imgFocal = `focal-${focalPos}`;
            const imgAlignClass = `align-${horizAlign}`;
            const imageCore = `
                <div class="pub-image-wrapper ${imgRatio}">
                    <img src="${block.url || '/_images/theme_main.jpg'}" alt="${block.alt || 'Photography image'}" class="pub-image ${imgFocal}" loading="lazy">
                </div>
            `;
            const imageWrapped = block.linkUrl && !isEditActive
                ? `<a href="${block.linkUrl}" class="pub-image-link" style="display:block; width:100%;">${imageCore}</a>`
                : imageCore;

            contentHtml = `
                <div class="pub-image-align-container ${imgAlignClass} ${imgValign}">
                    <div class="pub-image-outer" style="max-width: ${imgWidth}; width: 100%;">
                        ${imageWrapped}
                        ${block.caption ? `<div class="pub-image-caption">${escapeHtml(block.caption)}</div>` : ''}
                    </div>
                </div>
            `;
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
            <button type="button" class="block-tool-btn" title="Move to Column / Row" onclick="openMoveBlockModal('${colId}', '${block.id}')">⇄</button>
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
            const btnIdx = el.getAttribute('data-btn-index');
            const text = el.innerText.trim();
            if (blockId && field === 'heroButtonLabel' && btnIdx !== null) {
                updateHeroButtonField(blockId, parseInt(btnIdx, 10), 'label', text);
            } else if (blockId && field) {
                updateBlockField(blockId, field, text);
            }
        });

        // Prevent Enter causing unformatted div nesting on single-line headings
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.classList.contains('pub-subtitle') || el.classList.contains('pub-btn') || el.classList.contains('pub-hero-issue-tag') || el.classList.contains('pub-hero-line-top') || el.classList.contains('pub-hero-line-italic') || el.classList.contains('pub-hero-line-plain') || el.classList.contains('pub-hero-action-btn'))) {
                e.preventDefault();
                el.blur();
            }
        });
    });
}

function updateHeroButtonField(blockId, btnIndex, field, value) {
    const block = findBlockById(blockId);
    if (!block) return;
    const btns = getHeroButtons(block);
    if (btns[btnIndex]) {
        btns[btnIndex][field] = value;
        block.buttons = btns;
        const firstPrimary = btns.find(b => b.type === 'primary');
        const firstSec = btns.find(b => b.type === 'secondary');
        if (firstPrimary) {
            block.buttonLabel = firstPrimary.label;
            block.linkUrl = firstPrimary.linkUrl;
            block.showButton = true;
        }
        if (firstSec) {
            block.secButtonLabel = firstSec.label;
            block.secButtonLink = firstSec.linkUrl;
            block.showSecondaryButton = true;
        }
        savePageData(false);
    }
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
    pushHistoryState();
    const newRow = {
        id: 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        layout: 'dynamic',
        colWidths: [100],
        colGap: 0,
        spacing: 'none',
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
    pushHistoryState();
    pageData = pageData.filter(r => r.id !== rowId);
    savePageData();
    renderPage();
};

window.moveRow = function (index, direction) {
    const target = index + direction;
    if (target < 0 || target >= pageData.length) return;
    pushHistoryState();
    const temp = pageData[index];
    pageData[index] = pageData[target];
    pageData[target] = temp;
    savePageData();
    renderPage();
};

window.duplicateRow = function (rowId) {
    const index = pageData.findIndex(r => r.id === rowId);
    if (index === -1) return;
    pushHistoryState();
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

// ── 6. Dynamic Column Operations (Add, Remove, Proportion Resize, Gap) ────
window.addColumnToRow = function (rowId, colIndex, side = 'right') {
    const row = findRowById(rowId);
    if (!row) return;

    pushHistoryState();
    row.columns = row.columns || [];

    const newColId = 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newCol = {
        id: newColId,
        blocks: []
    };

    const targetIndex = side === 'left' ? colIndex : colIndex + 1;
    row.columns.splice(targetIndex, 0, newCol);

    const numCols = row.columns.length;
    row.colWidths = Array(numCols).fill(100 / numCols);
    if (typeof row.colGap !== 'number') row.colGap = 0;

    savePageData();
    renderPage();
    showToast(`Added column (${numCols} total) ✓`);
};

window.deleteColumnFromRow = function (rowId, colIndex) {
    const row = findRowById(rowId);
    if (!row || !row.columns || row.columns.length <= 1) return;

    const col = row.columns[colIndex];
    if (col && col.blocks && col.blocks.length > 0) {
        if (!confirm(`Delete Column ${colIndex + 1} and its ${col.blocks.length} element(s)?`)) return;
    }

    pushHistoryState();
    row.columns.splice(colIndex, 1);

    const numCols = row.columns.length;
    row.colWidths = Array(numCols).fill(100 / numCols);

    savePageData();
    renderPage();
    showToast(`Removed column (${numCols} remaining) ✓`);
};

window.resetCurrentRowToSingleColumn = function () {
    const modal = document.getElementById('row-settings-modal');
    const rowId = modal ? modal.getAttribute('data-target-row-id') : null;
    const row = findRowById(rowId);
    if (!row) return;

    if (row.columns && row.columns.length > 1) {
        const allBlocks = [];
        row.columns.forEach(c => {
            (c.blocks || []).forEach(b => allBlocks.push(b));
        });
        row.columns = [
            {
                id: row.columns[0].id || ('col_' + Date.now()),
                blocks: allBlocks
            }
        ];
    }
    row.colWidths = [100];
    row.colGap = 0;

    savePageData();
    renderPage();
    closeAllModals();
    showToast('Reset row to 1 column ✓');
};

// Interactive Drag Resizer Engine
let activeResizeState = null;

window.initColResize = function (e, rowId, splitIndex) {
    e.preventDefault();
    e.stopPropagation();

    const row = findRowById(rowId);
    if (!row || !row.columns || row.columns.length <= splitIndex + 1) return;

    const rowEl = document.getElementById(rowId);
    if (!rowEl) return;
    const innerEl = rowEl.querySelector('.pub-row-inner');
    if (!innerEl) return;

    const colEls = innerEl.querySelectorAll('.pub-col');
    const leftColEl = colEls[splitIndex];
    const rightColEl = colEls[splitIndex + 1];
    if (!leftColEl || !rightColEl) return;

    const numCols = row.columns.length;
    let colWidths = Array.isArray(row.colWidths) && row.colWidths.length === numCols
        ? [...row.colWidths.map(Number)]
        : Array(numCols).fill(100 / numCols);

    const leftColRect = leftColEl.getBoundingClientRect();
    const rightColRect = rightColEl.getBoundingClientRect();
    const pairWidthPx = leftColRect.width + rightColRect.width;
    const combinedPct = colWidths[splitIndex] + colWidths[splitIndex + 1];

    const tooltip = document.getElementById('col-resize-tooltip');
    const tooltipText = document.getElementById('col-resize-tooltip-text');

    activeResizeState = {
        rowId,
        splitIndex,
        startX: e.clientX,
        leftColEl,
        rightColEl,
        pairWidthPx,
        combinedPct,
        initialLeftPct: colWidths[splitIndex],
        initialRightPct: colWidths[splitIndex + 1],
        colWidths,
        tooltip,
        tooltipText
    };

    if (tooltip && tooltipText) {
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY - 36) + 'px';
        tooltipText.textContent = `${Math.round(colWidths[splitIndex])}% ⬌ ${Math.round(colWidths[splitIndex + 1])}%`;
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleEl = e.currentTarget.closest('.col-resizer-line');
    if (handleEl) handleEl.classList.add('is-dragging');

    window.addEventListener('mousemove', onColResizeMove);
    window.addEventListener('mouseup', onColResizeEnd);
};

function onColResizeMove(e) {
    if (!activeResizeState) return;
    const { startX, leftColEl, rightColEl, pairWidthPx, combinedPct, initialLeftPct, tooltip, tooltipText, splitIndex } = activeResizeState;

    const deltaX = e.clientX - startX;
    const deltaPct = (deltaX / pairWidthPx) * combinedPct;

    const minPct = 10;
    let newLeftPct = Math.max(minPct, Math.min(combinedPct - minPct, initialLeftPct + deltaPct));
    let newRightPct = combinedPct - newLeftPct;

    newLeftPct = Math.round(newLeftPct * 10) / 10;
    newRightPct = Math.round(newRightPct * 10) / 10;

    leftColEl.style.flex = `${newLeftPct} ${newLeftPct} 0px`;
    rightColEl.style.flex = `${newRightPct} ${newRightPct} 0px`;

    const leftMeta = leftColEl.querySelector('.col-meta-pill');
    if (leftMeta) leftMeta.textContent = `Col ${splitIndex + 1} • ${Math.round(newLeftPct)}%`;
    const rightMeta = rightColEl.querySelector('.col-meta-pill');
    if (rightMeta) rightMeta.textContent = `Col ${splitIndex + 2} • ${Math.round(newRightPct)}%`;

    if (tooltip && tooltipText) {
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY - 36) + 'px';
        tooltipText.textContent = `${Math.round(newLeftPct)}% ⬌ ${Math.round(newRightPct)}%`;
    }

    activeResizeState.currentLeftPct = newLeftPct;
    activeResizeState.currentRightPct = newRightPct;
}

function onColResizeEnd(e) {
    if (!activeResizeState) return;
    const { rowId, splitIndex, colWidths, currentLeftPct, currentRightPct, tooltip } = activeResizeState;

    window.removeEventListener('mousemove', onColResizeMove);
    window.removeEventListener('mouseup', onColResizeEnd);

    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (tooltip) tooltip.style.display = 'none';

    document.querySelectorAll('.col-resizer-line.is-dragging').forEach(el => el.classList.remove('is-dragging'));

    if (currentLeftPct !== undefined && currentRightPct !== undefined) {
        const row = findRowById(rowId);
        if (row) {
            pushHistoryState();
            colWidths[splitIndex] = currentLeftPct;
            colWidths[splitIndex + 1] = currentRightPct;
            row.colWidths = colWidths;
            savePageData();
            showToast(`Column proportions saved: ${Math.round(currentLeftPct)}% / ${Math.round(currentRightPct)}% ✓`);
        }
    }

    activeResizeState = null;
}

// Column Gap / Spacing Popover Handlers
window.toggleColumnGapPopover = function (e, rowId, splitIndex) {
    e.preventDefault();
    e.stopPropagation();

    const popover = document.getElementById('col-gap-popover');
    if (!popover) return;

    const row = findRowById(rowId);
    if (!row) return;

    popover.setAttribute('data-target-row-id', rowId);
    popover.setAttribute('data-split-index', splitIndex);

    const btnRect = e.currentTarget.getBoundingClientRect();
    popover.style.display = 'flex';

    let left = btnRect.left - 80;
    if (left < 10) left = 10;
    if (left + 230 > window.innerWidth) left = window.innerWidth - 240;

    let top = btnRect.bottom + 8;
    if (top + 160 > window.innerHeight) {
        top = btnRect.top - 170;
    }

    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
};

window.closeColumnGapPopover = function () {
    const popover = document.getElementById('col-gap-popover');
    if (popover) popover.style.display = 'none';
};

window.applyColumnGap = function (gapPx) {
    const popover = document.getElementById('col-gap-popover');
    const rowId = popover ? popover.getAttribute('data-target-row-id') : null;
    const row = findRowById(rowId);
    if (!row) return;

    pushHistoryState();
    row.colGap = gapPx;
    savePageData();
    renderPage();
    closeColumnGapPopover();
    showToast(`Column spacing set to ${gapPx}px ✓`);
};

document.addEventListener('click', (e) => {
    const popover = document.getElementById('col-gap-popover');
    if (popover && popover.style.display !== 'none') {
        if (!popover.contains(e.target) && !e.target.closest('.col-divider-gap-btn')) {
            closeColumnGapPopover();
        }
    }
});

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

    pushHistoryState();
    const newId = 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    let newBlock = { id: newId, type: type };

    switch (type) {
        case 'hero':
            newBlock.tag = '01 / CONCEPT / EDITORIAL';
            newBlock.titleTop = 'CAPTURING';
            newBlock.titleItalic = 'THE';
            newBlock.titlePlain = 'UNSEEN';
            newBlock.subdeck = 'Where darkness meets light. Exclusive, artistic, and sensual photography that redefines your perspective.';
            newBlock.buttons = [
                { id: 'btn_' + Date.now() + '_1', type: 'primary', label: 'EXPLORE PACKAGES →', linkUrl: '#packages' },
                { id: 'btn_' + Date.now() + '_2', type: 'secondary', label: 'INQUIRE NOW', linkUrl: '/contact/' }
            ];
            newBlock.buttonLabel = 'EXPLORE PACKAGES →';
            newBlock.linkUrl = '#packages';
            newBlock.secButtonLabel = 'INQUIRE NOW';
            newBlock.secButtonLink = '/contact/';
            newBlock.showButton = true;
            newBlock.showSecondaryButton = true;
            newBlock.imageUrl = '/_images/theme_main.jpg';
            newBlock.imageAlt = 'Stanislav Zhukov Editorial Photography';
            break;
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
        case 'pricing':
            newBlock.kicker = 'TIER II • MOST POPULAR';
            newBlock.title = 'THE SENSUAL ATELIER';
            newBlock.price = '€650';
            newBlock.originalPrice = '€850';
            newBlock.discount = 'SAVE €200';
            newBlock.strikethroughPrice = false;
            newBlock.period = 'per session';
            newBlock.subtitle = '3-Hour Private Studio Production';
            newBlock.desc = 'Intimate boudoir or fine-art glamour session with custom shadow play, 2 wardrobe changes, and master retouching.';
            newBlock.features = '✓ Collaborative moodboard direction\n✓ 2 Distinct lighting configurations\n✓ 15 Magazine-grade master deliverables\n✓ Private high-res online gallery\n✓ Commercial & personal usage release';
            newBlock.buttonLabel = 'BOOK ATELIER PACKAGE →';
            newBlock.linkUrl = '/contact/';
            newBlock.buttonStyle = 'gold';
            newBlock.isFeatured = true;
            newBlock.badge = 'RECOMMENDED';
            newBlock.align = 'left';
            break;
        case 'countdown':
            newBlock.kicker = 'SEASONAL EDITORIAL PROMOTION';
            newBlock.title = 'EXCLUSIVE COMMISSIONS CLOSE IN:';
            newBlock.targetDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16);
            newBlock.note = 'Limited to 6 atelier commissions per month. Early booking recommended.';
            break;
        case 'accordion':
            newBlock.items = [
                { q: 'How do I secure my date in the studio calendar?', a: 'Submit an inquiry through our contact page. A 30% retainer reserves your preferred date and time.' },
                { q: 'Can I bring my own wardrobe or moodboard ideas?', a: 'Absolutely. We develop a shared digital moodboard prior to the shoot and guide your outfit choices.' },
                { q: 'When do I receive the finished master photographs?', a: 'Online preview proofs are shared within 48 hours. Master high-fashion retouches are delivered within 10–14 days.' }
            ];
            break;
        case 'features':
            newBlock.items = [
                { icon: '✦', title: 'Fine-Art Creative Direction', desc: 'Bespoke storytelling tailored to your confidence and vision.' },
                { icon: '◈', title: 'Pro Studio & Natural Light', desc: 'Access to professional studio lighting and cinematic strobe gear.' },
                { icon: '⚜', title: 'Magazine-Grade Retouching', desc: 'Vogue-caliber frequency separation and nuanced color harmony.' }
            ];
            break;
        case 'image':
            newBlock.url = '/_images/theme_main.jpg';
            newBlock.alt = 'Photoshoot Showcase';
            newBlock.ratio = '4-5';
            newBlock.caption = '';
            newBlock.width = '100%';
            newBlock.align = 'center';
            newBlock.valign = 'center';
            newBlock.focal = 'center';
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
    pushHistoryState();
    col.blocks = (col.blocks || []).filter(b => b.id !== blockId);
    savePageData();
    renderPage();
};

window.moveBlock = function (colId, index, direction) {
    const col = findColById(colId);
    if (!col) return;
    const target = index + direction;
    if (target < 0 || target >= col.blocks.length) return;
    pushHistoryState();
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
    pushHistoryState();
    const clone = JSON.parse(JSON.stringify(col.blocks[index]));
    clone.id = 'b_' + Date.now();
    col.blocks.splice(index + 1, 0, clone);
    savePageData();
    renderPage();
};

window.removeHeroElement = function (blockId, elemType) {
    const block = findBlockById(blockId);
    if (!block) return;
    pushHistoryState();
    if (elemType === 'tag') block.showTag = false;
    else if (elemType === 'title') block.showTitle = false;
    else if (elemType === 'subdeck') block.showSubdeck = false;
    else if (elemType === 'button') {
        block.showButton = false;
        block.buttons = getHeroButtons(block).filter(b => b.type !== 'primary');
    } else if (elemType === 'secButton') {
        block.showSecondaryButton = false;
        block.buttons = getHeroButtons(block).filter(b => b.type !== 'secondary');
    } else if (elemType === 'badge') block.showBadge = false;
    else if (elemType === 'extraNote') block.showExtraNote = false;
    savePageData(false);
    renderPage();
    showToast(`Removed element from hero section`);
};

window.addHeroElement = function (blockId, elemType) {
    const block = findBlockById(blockId);
    if (!block) return;
    pushHistoryState();
    if (elemType === 'tag') {
        block.showTag = true;
        if (!block.tag) block.tag = '01 / CONCEPT / EDITORIAL';
    } else if (elemType === 'title') {
        block.showTitle = true;
        if (!block.titleTop) block.titleTop = 'CAPTURING';
        if (!block.titleItalic) block.titleItalic = 'THE';
        if (!block.titlePlain) block.titlePlain = 'UNSEEN';
    } else if (elemType === 'subdeck') {
        block.showSubdeck = true;
        if (!block.subdeck) block.subdeck = 'Where darkness meets light. Exclusive, artistic, and sensual photography that redefines your perspective.';
    } else if (elemType === 'button') {
        window.addHeroButton(blockId, 'primary');
        return;
    } else if (elemType === 'secButton') {
        window.addHeroButton(blockId, 'secondary');
        return;
    } else if (elemType === 'badge') {
        block.showBadge = true;
        if (!block.badgeText) block.badgeText = 'SPECIAL FEATURE';
        if (!block.badgeColor) block.badgeColor = 'gold';
    } else if (elemType === 'extraNote') {
        block.showExtraNote = true;
        if (!block.extraNote) block.extraNote = 'Limited editorial sessions available each season.';
    }
    savePageData(false);
    renderPage();
    showToast(`Added element to hero section`);
};

window.addHeroButton = function (blockId, type = 'primary') {
    const block = findBlockById(blockId);
    if (!block) return;
    pushHistoryState();
    const btns = getHeroButtons(block);
    const newBtn = {
        id: 'btn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type: type === 'secondary' ? 'secondary' : 'primary',
        label: type === 'secondary' ? 'INQUIRE NOW' : 'EXPLORE PACKAGES →',
        linkUrl: type === 'secondary' ? '/contact/' : '#packages'
    };
    btns.push(newBtn);
    block.buttons = btns;
    if (type === 'primary') {
        block.showButton = true;
        block.buttonLabel = newBtn.label;
        block.linkUrl = newBtn.linkUrl;
    }
    if (type === 'secondary') {
        block.showSecondaryButton = true;
        block.secButtonLabel = newBtn.label;
        block.secButtonLink = newBtn.linkUrl;
    }
    savePageData(false);
    renderPage();
    showToast(`Added ${newBtn.type} button to hero section`);
};

window.removeHeroButton = function (blockId, btnIndex) {
    const block = findBlockById(blockId);
    if (!block) return;
    pushHistoryState();
    const btns = getHeroButtons(block);
    if (btnIndex >= 0 && btnIndex < btns.length) {
        btns.splice(btnIndex, 1);
        block.buttons = btns;
        const firstPrimary = btns.find(b => b.type === 'primary');
        const firstSec = btns.find(b => b.type === 'secondary');
        block.showButton = !!firstPrimary;
        if (firstPrimary) {
            block.buttonLabel = firstPrimary.label;
            block.linkUrl = firstPrimary.linkUrl;
        }
        block.showSecondaryButton = !!firstSec;
        if (firstSec) {
            block.secButtonLabel = firstSec.label;
            block.secButtonLink = firstSec.linkUrl;
        }
        savePageData(false);
        renderPage();
        showToast(`Removed button from hero section`);
    }
};

function syncHeroModalInputsToBlock(block) {
    if (!block) return;
    const tagInput = document.getElementById('edit-block-hero-tag');
    if (tagInput) block.tag = tagInput.value;
    const tagCheck = document.getElementById('edit-hero-show-tag');
    if (tagCheck) block.showTag = tagCheck.checked;

    const badgeCheck = document.getElementById('edit-hero-show-badge');
    if (badgeCheck) block.showBadge = badgeCheck.checked;
    const badgeText = document.getElementById('edit-hero-badge-text');
    if (badgeText) block.badgeText = badgeText.value;
    const badgeColor = document.getElementById('edit-hero-badge-color');
    if (badgeColor) block.badgeColor = badgeColor.value;

    const titleCheck = document.getElementById('edit-hero-show-title');
    if (titleCheck) block.showTitle = titleCheck.checked;
    const titleTop = document.getElementById('edit-block-hero-top');
    if (titleTop) block.titleTop = titleTop.value;
    const titleItalic = document.getElementById('edit-block-hero-italic');
    if (titleItalic) block.titleItalic = titleItalic.value;
    const titlePlain = document.getElementById('edit-block-hero-plain');
    if (titlePlain) block.titlePlain = titlePlain.value;

    const subdeckCheck = document.getElementById('edit-hero-show-subdeck');
    if (subdeckCheck) block.showSubdeck = subdeckCheck.checked;
    const subdeck = document.getElementById('edit-block-hero-subdeck');
    if (subdeck) block.subdeck = subdeck.value;

    const noteCheck = document.getElementById('edit-hero-show-note');
    if (noteCheck) block.showExtraNote = noteCheck.checked;
    const noteText = document.getElementById('edit-hero-extra-note');
    if (noteText) block.extraNote = noteText.value;

    const imgInput = document.getElementById('edit-block-hero-img');
    if (imgInput) block.imageUrl = imgInput.value;
    const altInput = document.getElementById('edit-block-hero-alt');
    if (altInput) block.imageAlt = altInput.value;
    const alignSelect = document.getElementById('edit-hero-img-align');
    if (alignSelect) block.imageAlign = alignSelect.value;
    const valignSelect = document.getElementById('edit-hero-img-valign');
    if (valignSelect) block.imageValign = valignSelect.value;

    // Read current buttons from modal
    const btnItemEls = document.querySelectorAll('#hero-modal-buttons-list .hero-modal-btn-item');
    if (btnItemEls.length > 0 || document.getElementById('hero-modal-buttons-list')) {
        const curButtons = [];
        btnItemEls.forEach((el, index) => {
            curButtons.push({
                id: 'btn_' + Date.now() + '_' + index,
                type: el.querySelector('.hero-modal-btn-type')?.value || 'primary',
                label: el.querySelector('.hero-modal-btn-label')?.value || '',
                linkUrl: el.querySelector('.hero-modal-btn-link')?.value || ''
            });
        });
        block.buttons = curButtons;
    }
}

window.addHeroButtonFromModal = function (blockId, type = 'primary') {
    const block = findBlockById(blockId);
    if (!block) return;
    syncHeroModalInputsToBlock(block);
    const btns = getHeroButtons(block);
    btns.push({
        id: 'btn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type: type === 'secondary' ? 'secondary' : 'primary',
        label: type === 'secondary' ? 'INQUIRE NOW' : 'EXPLORE PACKAGES →',
        linkUrl: type === 'secondary' ? '/contact/' : '#packages'
    });
    block.buttons = btns;
    openBlockSettingsModal(blockId);
};

window.removeHeroButtonFromModal = function (blockId, idx) {
    const block = findBlockById(blockId);
    if (!block) return;
    syncHeroModalInputsToBlock(block);
    const btns = getHeroButtons(block);
    if (idx >= 0 && idx < btns.length) {
        btns.splice(idx, 1);
        block.buttons = btns;
        openBlockSettingsModal(blockId);
    }
};

window.toggleHeroAddMenu = function (e, blockId) {
    e.stopPropagation();
    const menu = document.getElementById(`hero-add-menu-${blockId}`);
    if (menu) {
        const isShown = menu.style.display === 'flex';
        document.querySelectorAll('.hero-add-dropdown-menu').forEach(m => m.style.display = 'none');
        menu.style.display = isShown ? 'none' : 'flex';
    }
};

document.addEventListener('click', () => {
    document.querySelectorAll('.hero-add-dropdown-menu').forEach(m => m.style.display = 'none');
});

// ── 8. Settings Modals ────────────────────────────────────────────────────
window.openRowSettingsModal = function (rowId) {
    const row = findRowById(rowId);
    if (!row) return;

    const modal = document.getElementById('row-settings-modal');
    if (!modal) return;

    modal.setAttribute('data-target-row-id', rowId);

    const colsCountEl = document.getElementById('row-modal-cols-count');
    const numCols = (row.columns || []).length || 1;
    if (colsCountEl) {
        colsCountEl.textContent = `${numCols} Column${numCols > 1 ? 's' : ''}`;
    }

    const gapSelect = document.getElementById('row-gap-select');
    if (gapSelect) gapSelect.value = String(typeof row.colGap === 'number' ? row.colGap : 0);

    const spacingSelect = document.getElementById('row-spacing-select');
    const bgSelect = document.getElementById('row-bg-select');

    if (spacingSelect) spacingSelect.value = row.spacing || 'none';
    if (bgSelect) bgSelect.value = row.bg || 'transparent';

    modal.classList.add('is-open');
};

window.saveRowSettings = function () {
    const modal = document.getElementById('row-settings-modal');
    const rowId = modal ? modal.getAttribute('data-target-row-id') : null;
    const row = findRowById(rowId);
    if (!row) return;

    pushHistoryState();

    const gap = parseInt(document.getElementById('row-gap-select')?.value || '0', 10);
    const spacing = document.getElementById('row-spacing-select')?.value || 'none';
    const bg = document.getElementById('row-bg-select')?.value || 'transparent';

    row.colGap = gap;
    row.spacing = spacing;
    row.bg = bg;

    savePageData();
    renderPage();
    closeAllModals();
    showToast('Row settings applied ✓');
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

    // Common Alignment (Image uses its own dedicated multi-axis alignment panel)
    if (block.type !== 'spacer' && block.type !== 'video' && block.type !== 'image') {
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
        case 'hero':
            fieldsHtml += `
                <div class="builder-form-group" style="background:rgba(197,160,89,0.06); border:1px solid rgba(197,160,89,0.22); border-radius:6px; padding:0.85rem; margin-bottom:1rem;">
                    <label class="builder-label" style="color:var(--pub-gold, #c5a059); font-weight:600; margin-bottom:0.6rem; display:block; letter-spacing:0.08em; font-size:0.75rem;">
                        📷 HERO COVER IMAGE & ALIGNMENT
                    </label>
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.75rem;">
                        <button type="button" class="pub-btn style-solid" onclick="openStudioGalleryModal()" style="font-size:0.72rem; padding:0.45rem 0.85rem; width:auto;">
                            <span>🖼️ Choose from Studio Photo Library</span>
                        </button>
                        <label class="pub-btn style-outline" style="font-size:0.72rem; padding:0.45rem 0.85rem; cursor:pointer; width:auto; display:inline-flex; align-items:center;">
                            <span>📤 Upload Local Photo</span>
                            <input type="file" accept="image/*" style="display:none;" onchange="handleModalImageUpload(event)">
                        </label>
                    </div>
                    <div id="block-settings-hero-img-preview" style="text-align:center; padding:0.5rem; background:rgba(0,0,0,0.04); border-radius:4px; margin-bottom:0.75rem;">
                        <img src="${escapeHtml(block.imageUrl || '/_images/theme_main.jpg')}" alt="Hero Preview" style="max-height:140px; border-radius:4px; object-fit:cover; border:1px solid rgba(197,160,89,0.3);">
                    </div>
                    <div class="builder-form-group">
                        <label class="builder-label">Hero Image URL</label>
                        <input type="text" id="edit-block-hero-img" class="builder-input" value="${escapeHtml(block.imageUrl || '')}" placeholder="/_images/theme_main.jpg" oninput="const p = document.querySelector('#block-settings-hero-img-preview img'); if (p) p.src = this.value;">
                    </div>
                    <div class="builder-form-group">
                        <label class="builder-label">Image Alt Text</label>
                        <input type="text" id="edit-block-hero-alt" class="builder-input" value="${escapeHtml(block.imageAlt || '')}" placeholder="Stanislav Zhukov Editorial Photography">
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-top:0.75rem;">
                        <div>
                            <label class="builder-label" style="font-size:0.72rem;">Horizontal Alignment</label>
                            <select id="edit-hero-img-align" class="builder-select" style="font-size:0.75rem;">
                                <option value="center" ${block.imageAlign === 'center' || !block.imageAlign ? 'selected' : ''}>Center</option>
                                <option value="left" ${block.imageAlign === 'left' ? 'selected' : ''}>Left</option>
                                <option value="right" ${block.imageAlign === 'right' ? 'selected' : ''}>Right</option>
                            </select>
                        </div>
                        <div>
                            <label class="builder-label" style="font-size:0.72rem;">Vertical Alignment</label>
                            <select id="edit-hero-img-valign" class="builder-select" style="font-size:0.75rem;">
                                <option value="editorial" ${block.imageValign === 'editorial' || !block.imageValign ? 'selected' : ''}>Upper 20% (Editorial Focus)</option>
                                <option value="top" ${block.imageValign === 'top' ? 'selected' : ''}>Top (Face / Head)</option>
                                <option value="center" ${block.imageValign === 'center' ? 'selected' : ''}>Center (Middle)</option>
                                <option value="bottom" ${block.imageValign === 'bottom' ? 'selected' : ''}>Bottom (Body / Lower)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="builder-form-group" style="background:rgba(197,160,89,0.06); border:1px solid rgba(197,160,89,0.22); border-radius:6px; padding:0.85rem; margin-bottom:1rem;">
                    <label class="builder-label" style="color:var(--pub-gold, #c5a059); font-weight:600; margin-bottom:0.6rem; display:block; letter-spacing:0.08em; font-size:0.75rem;">
                        🗂️ HERO LEFT SECTION ELEMENTS (ADD / REMOVE & EDIT)
                    </label>

                    <!-- Element 1: Issue Tag -->
                    <div style="border-bottom:1px solid rgba(0,0,0,0.06); padding-bottom:0.75rem; margin-bottom:0.75rem;">
                        <label class="builder-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="checkbox" id="edit-hero-show-tag" ${block.showTag !== false ? 'checked' : ''} onchange="document.getElementById('edit-hero-tag-fields').style.display = this.checked ? 'block' : 'none';">
                            <span style="font-weight:600;">🏷️ Issue / Concept Tag</span>
                        </label>
                        <div id="edit-hero-tag-fields" style="display:${block.showTag !== false ? 'block' : 'none'}; margin-top:0.4rem;">
                            <input type="text" id="edit-block-hero-tag" class="builder-input" value="${escapeHtml(block.tag || '01 / CONCEPT / EDITORIAL')}" placeholder="e.g. 01 / CONCEPT / EDITORIAL">
                        </div>
                    </div>

                    <!-- Element 2: Concept Badge -->
                    <div style="border-bottom:1px solid rgba(0,0,0,0.06); padding-bottom:0.75rem; margin-bottom:0.75rem;">
                        <label class="builder-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="checkbox" id="edit-hero-show-badge" ${block.showBadge ? 'checked' : ''} onchange="document.getElementById('edit-hero-badge-fields').style.display = this.checked ? 'grid' : 'none';">
                            <span style="font-weight:600;">✦ Concept Badge</span>
                        </label>
                        <div id="edit-hero-badge-fields" style="display:${block.showBadge ? 'grid' : 'none'}; grid-template-columns: 2fr 1fr; gap:0.5rem; margin-top:0.4rem;">
                            <input type="text" id="edit-hero-badge-text" class="builder-input" value="${escapeHtml(block.badgeText || 'SPECIAL FEATURE')}" placeholder="Badge Text">
                            <select id="edit-hero-badge-color" class="builder-select">
                                <option value="gold" ${block.badgeColor === 'gold' ? 'selected' : ''}>Gold</option>
                                <option value="crimson" ${block.badgeColor === 'crimson' ? 'selected' : ''}>Crimson</option>
                                <option value="dark" ${block.badgeColor === 'dark' ? 'selected' : ''}>Dark</option>
                            </select>
                        </div>
                    </div>

                    <!-- Element 3: Main Title -->
                    <div style="border-bottom:1px solid rgba(0,0,0,0.06); padding-bottom:0.75rem; margin-bottom:0.75rem;">
                        <label class="builder-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="checkbox" id="edit-hero-show-title" ${block.showTitle !== false ? 'checked' : ''} onchange="document.getElementById('edit-hero-title-fields').style.display = this.checked ? 'block' : 'none';">
                            <span style="font-weight:600;">🔤 Main Editorial Title</span>
                        </label>
                        <div id="edit-hero-title-fields" style="display:${block.showTitle !== false ? 'block' : 'none'}; margin-top:0.4rem;">
                            <div class="builder-form-group" style="margin-bottom:0.4rem;">
                                <label class="builder-label" style="font-size:0.68rem;">Line 1 (Top Word)</label>
                                <input type="text" id="edit-block-hero-top" class="builder-input" value="${escapeHtml(block.titleTop || 'CAPTURING')}" placeholder="e.g. CAPTURING">
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem;">
                                <div>
                                    <label class="builder-label" style="font-size:0.68rem;">Line 2 (Italic Serif Word)</label>
                                    <input type="text" id="edit-block-hero-italic" class="builder-input" value="${escapeHtml(block.titleItalic || 'THE')}" placeholder="e.g. THE">
                                </div>
                                <div>
                                    <label class="builder-label" style="font-size:0.68rem;">Line 2 (Plain Serif Word)</label>
                                    <input type="text" id="edit-block-hero-plain" class="builder-input" value="${escapeHtml(block.titlePlain || 'UNSEEN')}" placeholder="e.g. UNSEEN">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Element 4: Subdeck -->
                    <div style="border-bottom:1px solid rgba(0,0,0,0.06); padding-bottom:0.75rem; margin-bottom:0.75rem;">
                        <label class="builder-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="checkbox" id="edit-hero-show-subdeck" ${block.showSubdeck !== false ? 'checked' : ''} onchange="document.getElementById('edit-hero-subdeck-fields').style.display = this.checked ? 'block' : 'none';">
                            <span style="font-weight:600;">📝 Subdeck Description</span>
                        </label>
                        <div id="edit-hero-subdeck-fields" style="display:${block.showSubdeck !== false ? 'block' : 'none'}; margin-top:0.4rem;">
                            <textarea id="edit-block-hero-subdeck" class="builder-textarea" style="min-height:60px;">${escapeHtml(block.subdeck || '')}</textarea>
                        </div>
                    </div>

                    <!-- Element 5 & 6: Action Buttons Manager (Multiple Primary & Secondary) -->
                    <div style="border-bottom:1px solid rgba(0,0,0,0.06); padding-bottom:0.75rem; margin-bottom:0.75rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                            <label class="builder-label" style="font-weight:600; margin-bottom:0; display:flex; align-items:center; gap:0.4rem;">
                                <span>🔘 Action Buttons (${getHeroButtons(block).length})</span>
                            </label>
                            <div style="display:flex; gap:0.4rem;">
                                <button type="button" class="pub-btn style-solid" onclick="addHeroButtonFromModal('${block.id}', 'primary')" style="font-size:0.68rem; padding:0.3rem 0.65rem; width:auto;">
                                    + Primary
                                </button>
                                <button type="button" class="pub-btn style-outline" onclick="addHeroButtonFromModal('${block.id}', 'secondary')" style="font-size:0.68rem; padding:0.3rem 0.65rem; width:auto;">
                                    + Secondary
                                </button>
                            </div>
                        </div>
                        <div id="hero-modal-buttons-list" style="display:flex; flex-direction:column; gap:0.6rem;">
                            ${getHeroButtons(block).map((btn, idx) => `
                                <div class="hero-modal-btn-item" data-btn-idx="${idx}" style="background:rgba(0,0,0,0.03); border:1px solid rgba(197,160,89,0.25); border-radius:4px; padding:0.6rem;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                                        <div style="display:flex; align-items:center; gap:0.5rem;">
                                            <span style="font-size:0.7rem; font-weight:700; color:var(--pub-gold, #c5a059);">#${idx + 1}</span>
                                            <select class="builder-select hero-modal-btn-type" style="padding:0.2rem 0.4rem; font-size:0.7rem; height:auto; width:auto;">
                                                <option value="primary" ${btn.type === 'primary' ? 'selected' : ''}>Primary (Solid)</option>
                                                <option value="secondary" ${btn.type === 'secondary' ? 'selected' : ''}>Secondary (Outline)</option>
                                            </select>
                                        </div>
                                        <button type="button" class="hero-item-del-btn" style="position:static; opacity:1; pointer-events:auto; width:20px; height:20px; font-size:0.65rem;" onclick="removeHeroButtonFromModal('${block.id}', ${idx})" title="Delete Button">✕</button>
                                    </div>
                                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem;">
                                        <div>
                                            <label class="builder-label" style="font-size:0.65rem;">Button Label</label>
                                            <input type="text" class="builder-input hero-modal-btn-label" value="${escapeHtml(btn.label || '')}" placeholder="Button Label">
                                        </div>
                                        <div>
                                            <label class="builder-label" style="font-size:0.65rem;">Destination URL</label>
                                            <input type="text" class="builder-input hero-modal-btn-link" value="${escapeHtml(btn.linkUrl || '')}" placeholder="Destination URL">
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                            ${getHeroButtons(block).length === 0 ? `<p style="font-size:0.75rem; color:#888; font-style:italic; margin:0.25rem 0;">No buttons added yet. Click "+ Primary" or "+ Secondary" above to add buttons.</p>` : ''}
                        </div>
                    </div>

                    <!-- Element 7: Editorial Note -->
                    <div>
                        <label class="builder-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="checkbox" id="edit-hero-show-note" ${block.showExtraNote ? 'checked' : ''} onchange="document.getElementById('edit-hero-note-fields').style.display = this.checked ? 'block' : 'none';">
                            <span style="font-weight:600;">💬 Editorial Note / Extra Text</span>
                        </label>
                        <div id="edit-hero-note-fields" style="display:${block.showExtraNote ? 'block' : 'none'}; margin-top:0.4rem;">
                            <input type="text" id="edit-hero-extra-note" class="builder-input" value="${escapeHtml(block.extraNote || 'Limited editorial sessions available each season.')}" placeholder="Extra note text...">
                        </div>
                    </div>
                </div>
            `;
            break;

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
                    <label class="builder-label">Studio Photo Assets</label>
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.75rem;">
                        <button type="button" class="pub-btn style-solid" onclick="openStudioGalleryModal()" style="font-size:0.72rem; padding:0.45rem 0.85rem; width:auto;">
                            <span>🖼️ Choose from Studio Photo Library</span>
                        </button>
                        <label class="pub-btn style-outline" style="font-size:0.72rem; padding:0.45rem 0.85rem; cursor:pointer; width:auto; display:inline-flex; align-items:center;">
                            <span>📤 Upload Local Photo</span>
                            <input type="file" accept="image/*" style="display:none;" onchange="handleModalImageUpload(event)">
                        </label>
                    </div>
                    <div id="block-settings-img-preview" style="text-align:center; padding:0.5rem; background:rgba(0,0,0,0.04); border-radius:4px; margin-bottom:0.75rem;">
                        <img src="${escapeHtml(block.url || '/_images/theme_main.jpg')}" alt="Preview" style="max-height:140px; border-radius:4px; object-fit:cover; border:1px solid rgba(197,160,89,0.3);">
                    </div>
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Image URL</label>
                    <input type="text" id="edit-block-url" class="builder-input" value="${escapeHtml(block.url || '')}" placeholder="https://... or /_images/..." oninput="const p = document.querySelector('#block-settings-img-preview img'); if (p) p.src = this.value;">
                </div>

                <div class="builder-form-group" style="background:rgba(197,160,89,0.06); border:1px solid rgba(197,160,89,0.22); border-radius:6px; padding:0.85rem; margin-bottom:1rem;">
                    <label class="builder-label" style="color:var(--pub-gold, #c5a059); font-weight:600; margin-bottom:0.6rem; display:block; letter-spacing:0.08em; font-size:0.75rem;">
                        📐 IMAGE ALIGNMENT
                    </label>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;">
                        <div>
                            <label class="builder-label" style="font-size:0.72rem;">Horizontal Alignment</label>
                            <select id="edit-block-align" class="builder-select" style="font-size:0.75rem;">
                                <option value="left" ${block.align === 'left' ? 'selected' : ''}>Left</option>
                                <option value="center" ${block.align === 'center' || !block.align ? 'selected' : ''}>Center</option>
                                <option value="right" ${block.align === 'right' ? 'selected' : ''}>Right</option>
                            </select>
                        </div>
                        <div>
                            <label class="builder-label" style="font-size:0.72rem;">Vertical Alignment</label>
                            <select id="edit-block-valign" class="builder-select" style="font-size:0.75rem;">
                                <option value="top" ${block.valign === 'top' ? 'selected' : ''}>Top</option>
                                <option value="center" ${block.valign === 'center' || !block.valign ? 'selected' : ''}>Center</option>
                                <option value="bottom" ${block.valign === 'bottom' ? 'selected' : ''}>Bottom</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="builder-form-group">
                    <label class="builder-label">Image Width / Scale (Alignment will position this)</label>
                    <select id="edit-block-width" class="builder-select">
                        <option value="100%" ${block.width === '100%' || !block.width ? 'selected' : ''}>100% (Full Column Width)</option>
                        <option value="80%" ${block.width === '80%' ? 'selected' : ''}>80% Width</option>
                        <option value="60%" ${block.width === '60%' ? 'selected' : ''}>60% Width</option>
                        <option value="50%" ${block.width === '50%' ? 'selected' : ''}>50% Width (Half Column)</option>
                        <option value="40%" ${block.width === '40%' ? 'selected' : ''}>40% Width</option>
                        <option value="30%" ${block.width === '30%' ? 'selected' : ''}>30% Width</option>
                    </select>
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

        case 'pricing':
            const featText = Array.isArray(block.features)
                ? block.features.join('\n')
                : (block.features || '');
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Package Title / Name</label>
                    <input type="text" id="edit-block-title" class="builder-input" value="${escapeHtml(block.title || '')}" placeholder="e.g. THE SENSUAL ATELIER">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Kicker / Category Tag</label>
                    <input type="text" id="edit-block-kicker" class="builder-input" value="${escapeHtml(block.kicker || '')}" placeholder="e.g. TIER II • SIGNATURE">
                </div>
                <div class="builder-form-group" style="background:rgba(197,160,89,0.06); border:1px solid rgba(197,160,89,0.22); border-radius:6px; padding:0.85rem; margin-bottom:1rem;">
                    <label class="builder-label" style="color:var(--pub-gold, #c5a059); font-weight:600; margin-bottom:0.6rem; display:block; letter-spacing:0.08em; font-size:0.75rem;">
                        🏷️ PRICING & PROMOTIONAL DISCOUNT
                    </label>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.6rem;">
                        <div class="builder-form-group" style="margin-bottom:0;">
                            <label class="builder-label">Price</label>
                            <input type="text" id="edit-block-price" class="builder-input" value="${escapeHtml(block.price || '')}" placeholder="e.g. €450 or €280">
                        </div>
                        <div class="builder-form-group" style="margin-bottom:0;">
                            <label class="builder-label">Period / Billing Note</label>
                            <input type="text" id="edit-block-period" class="builder-input" value="${escapeHtml(block.period || '')}" placeholder="e.g. per session">
                        </div>
                    </div>

                    <div style="margin-top:0.6rem; padding-top:0.6rem; border-top:1px dashed rgba(197,160,89,0.3);">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.6rem;">
                            <div>
                                <label class="builder-label" style="font-size:0.72rem;">Original Price (Strikethrough)</label>
                                <input type="text" id="edit-block-orig-price" class="builder-input" value="${escapeHtml(block.originalPrice || '')}" placeholder="e.g. €350">
                                <span style="font-size:0.65rem; color:#888; display:block; margin-top:2px;">Crossed out before price (e.g. <span style="text-decoration:line-through;">€350</span> €280)</span>
                            </div>
                            <div>
                                <label class="builder-label" style="font-size:0.72rem;">Discount Badge / Text (Optional)</label>
                                <input type="text" id="edit-block-discount" class="builder-input" value="${escapeHtml(block.discount || '')}" placeholder="e.g. -20% OFF or SAVE €70">
                                <span style="font-size:0.65rem; color:#888; display:block; margin-top:2px;">Promotional badge next to price</span>
                            </div>
                        </div>

                        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.5rem; background:rgba(0,0,0,0.03); padding:0.4rem 0.6rem; border-radius:4px;">
                            <label style="display:flex; align-items:center; gap:0.45rem; font-size:0.75rem; cursor:pointer;">
                                <input type="checkbox" id="edit-block-strikethrough-price" ${block.strikethroughPrice ? 'checked' : ''}>
                                <span style="font-weight:600;">Strikethrough price directly</span>
                            </label>
                            <span style="font-size:0.68rem; color:#888;">(Crosses out the price text)</span>
                        </div>
                    </div>
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Duration / Subtitle</label>
                    <input type="text" id="edit-block-subtitle" class="builder-input" value="${escapeHtml(block.subtitle || '')}" placeholder="e.g. 3-Hour Private Studio Production">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Description</label>
                    <textarea id="edit-block-desc" class="builder-textarea" style="min-height:70px;">${escapeHtml(block.desc || '')}</textarea>
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Included Features (One line per feature)</label>
                    <textarea id="edit-block-features" class="builder-textarea" style="min-height:100px;" placeholder="Collaborative moodboard direction\n2 Distinct lighting configurations\n15 Magazine-grade deliverables">${escapeHtml(featText)}</textarea>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;">
                    <div class="builder-form-group">
                        <label class="builder-label">Button Label</label>
                        <input type="text" id="edit-block-btn-label" class="builder-input" value="${escapeHtml(block.buttonLabel || 'BOOK THIS PACKAGE →')}">
                    </div>
                    <div class="builder-form-group">
                        <label class="builder-label">Button Style</label>
                        <select id="edit-block-btn-style" class="builder-select">
                            <option value="gold" ${block.buttonStyle === 'gold' ? 'selected' : ''}>Luxury Gold Accent</option>
                            <option value="solid" ${block.buttonStyle === 'solid' ? 'selected' : ''}>Solid Vogue Black / White</option>
                            <option value="outline" ${block.buttonStyle === 'outline' ? 'selected' : ''}>Minimal Hairline Outline</option>
                        </select>
                    </div>
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Button Link URL</label>
                    <input type="text" id="edit-block-btn-link" class="builder-input" value="${escapeHtml(block.linkUrl || '/contact/')}">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;">
                    <div class="builder-form-group">
                        <label class="builder-label">Highlight Badge Text</label>
                        <input type="text" id="edit-block-badge" class="builder-input" value="${escapeHtml(block.badge || '')}" placeholder="e.g. RECOMMENDED">
                    </div>
                    <div class="builder-form-group" style="display:flex; align-items:center; padding-top:1.5rem;">
                        <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.75rem; cursor:pointer;">
                            <input type="checkbox" id="edit-block-featured" ${block.isFeatured ? 'checked' : ''}>
                            <span>Highlight as Featured Tier (Gold border & glow)</span>
                        </label>
                    </div>
                </div>
            `;
            break;

        case 'countdown':
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Kicker / Top Tag</label>
                    <input type="text" id="edit-block-kicker" class="builder-input" value="${escapeHtml(block.kicker || '')}" placeholder="e.g. SEASONAL EDITORIAL PROMOTION">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Headline Title</label>
                    <input type="text" id="edit-block-title" class="builder-input" value="${escapeHtml(block.title || '')}" placeholder="e.g. EXCLUSIVE COMMISSIONS CLOSE IN:">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Target Expiration Date & Time</label>
                    <input type="datetime-local" id="edit-block-target-date" class="builder-input" value="${block.targetDate || ''}">
                </div>
                <div class="builder-form-group">
                    <label class="builder-label">Urgency Note / Footnote</label>
                    <input type="text" id="edit-block-note" class="builder-input" value="${escapeHtml(block.note || '')}" placeholder="e.g. Limited to 6 atelier commissions per month.">
                </div>
            `;
            break;

        case 'accordion':
            const accItems = Array.isArray(block.items) && block.items.length > 0 ? block.items : [
                { q: 'How do I secure my date in the studio calendar?', a: 'Submit an inquiry through our contact page. A 30% retainer reserves your date.' },
                { q: 'Can I bring my own wardrobe or moodboard ideas?', a: 'Absolutely. We develop a shared digital moodboard prior to shooting.' }
            ];
            const accFormatted = accItems.map(it => `Q: ${it.q || it.question || ''}\nA: ${it.a || it.answer || ''}`).join('\n\n');
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">FAQ Questions & Answers (Format: Q: Question followed by A: Answer)</label>
                    <textarea id="edit-block-accordion-items" class="builder-textarea" style="min-height:160px; font-size:0.75rem; line-height:1.5;">${escapeHtml(accFormatted)}</textarea>
                    <p style="font-size:0.68rem; color:#888; margin-top:0.35rem;">Separate multiple FAQ pairs with double newlines.</p>
                </div>
            `;
            break;

        case 'features':
            const featGridItems = Array.isArray(block.items) && block.items.length > 0 ? block.items : [
                { icon: '✦', title: 'Fine-Art Creative Direction', desc: 'Bespoke storytelling tailored to your confidence.' },
                { icon: '◈', title: 'Pro Studio & Natural Light', desc: 'Access to professional studio lighting.' },
                { icon: '⚜', title: 'Magazine-Grade Retouching', desc: 'Vogue-caliber frequency separation.' }
            ];
            const featFormatted = featGridItems.map(it => `${it.icon || '✦'} | ${it.title || ''} | ${it.desc || ''}`).join('\n');
            fieldsHtml += `
                <div class="builder-form-group">
                    <label class="builder-label">Feature Perks (Format: Icon | Title | Description)</label>
                    <textarea id="edit-block-features-items" class="builder-textarea" style="min-height:130px; font-size:0.75rem; line-height:1.5;">${escapeHtml(featFormatted)}</textarea>
                    <p style="font-size:0.68rem; color:#888; margin-top:0.35rem;">One feature perk per line. Example icons: ✦, ◈, ⚜, ❖, ◫</p>
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

    pushHistoryState();

    const align = document.getElementById('edit-block-align')?.value;
    if (align) block.align = align;
    const valign = document.getElementById('edit-block-valign')?.value;
    if (valign) {
        block.valign = valign;
        block.focal = valign;
    }

    switch (block.type) {
        case 'hero':
            block.showTag = !!document.getElementById('edit-hero-show-tag')?.checked;
            block.tag = document.getElementById('edit-block-hero-tag')?.value || '';
            block.showBadge = !!document.getElementById('edit-hero-show-badge')?.checked;
            block.badgeText = document.getElementById('edit-hero-badge-text')?.value || 'SPECIAL FEATURE';
            block.badgeColor = document.getElementById('edit-hero-badge-color')?.value || 'gold';
            block.showTitle = !!document.getElementById('edit-hero-show-title')?.checked;
            block.titleTop = document.getElementById('edit-block-hero-top')?.value || '';
            block.titleItalic = document.getElementById('edit-block-hero-italic')?.value || '';
            block.titlePlain = document.getElementById('edit-block-hero-plain')?.value || '';
            block.showSubdeck = !!document.getElementById('edit-hero-show-subdeck')?.checked;
            block.subdeck = document.getElementById('edit-block-hero-subdeck')?.value || '';

            // Read dynamic buttons list from modal if present
            const btnItemEls = document.querySelectorAll('#hero-modal-buttons-list .hero-modal-btn-item');
            if (btnItemEls.length > 0 || document.getElementById('hero-modal-buttons-list')) {
                const parsedButtons = [];
                btnItemEls.forEach((el, index) => {
                    const type = el.querySelector('.hero-modal-btn-type')?.value || 'primary';
                    const label = el.querySelector('.hero-modal-btn-label')?.value || '';
                    const linkUrl = el.querySelector('.hero-modal-btn-link')?.value || '';
                    parsedButtons.push({
                        id: 'btn_' + Date.now() + '_' + index,
                        type: type,
                        label: label,
                        linkUrl: linkUrl
                    });
                });
                block.buttons = parsedButtons;
                const firstPrimary = parsedButtons.find(b => b.type === 'primary');
                const firstSec = parsedButtons.find(b => b.type === 'secondary');
                block.showButton = !!firstPrimary;
                if (firstPrimary) {
                    block.buttonLabel = firstPrimary.label;
                    block.linkUrl = firstPrimary.linkUrl;
                }
                block.showSecondaryButton = !!firstSec;
                if (firstSec) {
                    block.secButtonLabel = firstSec.label;
                    block.secButtonLink = firstSec.linkUrl;
                }
            }

            block.showExtraNote = !!document.getElementById('edit-hero-show-note')?.checked;
            block.extraNote = document.getElementById('edit-hero-extra-note')?.value || '';
            block.imageUrl = document.getElementById('edit-block-hero-img')?.value || '/_images/theme_main.jpg';
            block.imageAlt = document.getElementById('edit-block-hero-alt')?.value || 'Editorial Hero Photography';
            block.imageAlign = document.getElementById('edit-hero-img-align')?.value || 'center';
            block.imageValign = document.getElementById('edit-hero-img-valign')?.value || 'editorial';
            break;
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
            block.width = document.getElementById('edit-block-width')?.value || '100%';
            block.alt = document.getElementById('edit-block-alt')?.value || '';
            block.caption = document.getElementById('edit-block-caption')?.value || '';
            block.linkUrl = document.getElementById('edit-block-link')?.value || '';
            block.align = document.getElementById('edit-block-align')?.value || 'center';
            block.valign = document.getElementById('edit-block-valign')?.value || 'center';
            block.focal = block.valign;
            break;
        case 'pricing':
            block.title = document.getElementById('edit-block-title')?.value || 'PACKAGE NAME';
            block.kicker = document.getElementById('edit-block-kicker')?.value || '';
            block.price = document.getElementById('edit-block-price')?.value || '€450';
            block.period = document.getElementById('edit-block-period')?.value || '';
            block.originalPrice = document.getElementById('edit-block-orig-price')?.value || '';
            block.discount = document.getElementById('edit-block-discount')?.value || '';
            block.strikethroughPrice = !!document.getElementById('edit-block-strikethrough-price')?.checked;
            block.subtitle = document.getElementById('edit-block-subtitle')?.value || '';
            block.desc = document.getElementById('edit-block-desc')?.value || '';
            block.features = document.getElementById('edit-block-features')?.value || '';
            block.buttonLabel = document.getElementById('edit-block-btn-label')?.value || 'BOOK THIS PACKAGE →';
            block.linkUrl = document.getElementById('edit-block-btn-link')?.value || '/contact/';
            block.buttonStyle = document.getElementById('edit-block-btn-style')?.value || 'gold';
            block.badge = document.getElementById('edit-block-badge')?.value || '';
            block.isFeatured = !!document.getElementById('edit-block-featured')?.checked;
            break;
        case 'countdown':
            block.kicker = document.getElementById('edit-block-kicker')?.value || '';
            block.title = document.getElementById('edit-block-title')?.value || 'OFFER CLOSES IN:';
            block.targetDate = document.getElementById('edit-block-target-date')?.value || '';
            block.note = document.getElementById('edit-block-note')?.value || '';
            break;
        case 'accordion':
            const rawAcc = document.getElementById('edit-block-accordion-items')?.value || '';
            const pairs = rawAcc.split(/\n\s*\n/).map(chunk => {
                const lines = chunk.trim().split('\n');
                let q = '';
                let a = '';
                lines.forEach(l => {
                    if (/^Q:\s*/i.test(l)) q = l.replace(/^Q:\s*/i, '').trim();
                    else if (/^A:\s*/i.test(l)) a = l.replace(/^A:\s*/i, '').trim();
                    else if (!q) q = l.trim();
                    else a += (a ? ' ' : '') + l.trim();
                });
                return { q, a };
            }).filter(p => p.q);
            if (pairs.length > 0) block.items = pairs;
            break;
        case 'features':
            const rawFeat = document.getElementById('edit-block-features-items')?.value || '';
            const parsedFeats = rawFeat.split('\n').map(line => {
                const parts = line.split('|').map(s => s.trim());
                if (parts.length >= 3) return { icon: parts[0], title: parts[1], desc: parts[2] };
                if (parts.length === 2) return { icon: '✦', title: parts[0], desc: parts[1] };
                if (parts.length === 1 && parts[0]) return { icon: '✦', title: parts[0], desc: '' };
                return null;
            }).filter(Boolean);
            if (parsedFeats.length > 0) block.items = parsedFeats;
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
        ${isUnsaved ? '<span class="admin-unsaved-badge" title="You have unsaved canvas edits">● Unsaved</span>' : '<span class="admin-saved-badge" title="All edits saved">✓ Saved</span>'}
        ${currentActivePreset ? `
            <div class="active-preset-pill" onclick="openSavePresetModal()" title="Click to view or edit preset details">
                <span>🔖</span>
                <span>PRESET: ${escapeHtml(currentActivePreset.title)}</span>
            </div>
        ` : ''}
        ${auth.currentUser ? `
            <div class="active-preset-pill" style="border-color:rgba(16,185,129,0.35); color:#10b981;" title="Connected to Firestore as ${escapeHtml(auth.currentUser.email || 'Admin')}">
                <span>☁️ Synced</span>
            </div>
        ` : `
            <button type="button" class="admin-bar-btn" onclick="document.getElementById('login-btn-header')?.click()" style="color:#cca353; border-color:rgba(204,163,83,0.4);" title="Sign in with Google to save directly to Firestore cloud">
                <span>☁️ Sign In (Cloud)</span>
            </button>
        `}
        <div class="admin-bar-divider"></div>
        <button type="button" class="admin-bar-btn" onclick="undo()" ${historyIndex <= 0 ? 'disabled' : ''} title="Undo (Ctrl+Z)">
            <span>↶ Undo</span>
        </button>
        <button type="button" class="admin-bar-btn" onclick="redo()" ${historyIndex >= historyStack.length - 1 ? 'disabled' : ''} title="Redo (Ctrl+Y)">
            <span>↷ Redo</span>
        </button>
        <button type="button" class="admin-bar-btn ${isPreviewMode ? 'btn-active' : ''}" id="btn-toggle-preview" onclick="toggleVisitorPreview()">
            <span>${isPreviewMode ? '✏️ Edit Mode' : '👁️ Preview'}</span>
        </button>
        ${isPreviewMode ? `
            <div class="device-viewport-group">
                <button type="button" class="device-btn ${previewViewport === 'desktop' ? 'is-active' : ''}" onclick="setPreviewViewport('desktop')" title="Desktop View">🖥️ Full</button>
                <button type="button" class="device-btn ${previewViewport === 'tablet' ? 'is-active' : ''}" onclick="setPreviewViewport('tablet')" title="Tablet View">📟 Tablet</button>
                <button type="button" class="device-btn ${previewViewport === 'mobile' ? 'is-active' : ''}" onclick="setPreviewViewport('mobile')" title="Mobile View">📱 Mobile</button>
            </div>
        ` : `
            <button type="button" class="admin-bar-btn" onclick="addNewRow()">
                <span>+ Add Row</span>
            </button>
        `}
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
    if (!isPreviewMode) {
        setPreviewViewport('desktop');
    }
    renderPage();
    setupAdminControls();
    showToast(isPreviewMode ? 'Switched to visitor preview mode' : 'Switched to visual editor');
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

window.createNewPresetFromCanvas = async function () {
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
    currentActivePreset = newPreset;

    const fullUrl = window.location.origin + '/promotion/' + encodeURIComponent(finalSlug);
    try { navigator.clipboard.writeText(fullUrl); } catch (_) {}

    if (window.history && window.history.replaceState) {
        const adminQuery = checkIsAdmin() ? '?admin=true' : '';
        window.history.replaceState(null, '', '/promotion/' + encodeURIComponent(finalSlug) + adminQuery);
    }

    closeAllModals();
    setupAdminControls();

    try {
        await saveAllPresets(savedPresets);
        showToast(`Created preset "${newPreset.title}" & saved to Firestore! URL copied.`);
    } catch (err) {
        if (!auth.currentUser) {
            showToast(`Created preset "${newPreset.title}" locally! (Sign in to sync to Firestore cloud)`, 4500);
        } else {
            showToast(`Created preset locally (Firestore: ${err.code || err.message})`, 4500);
        }
    }
};

window.updateSelectedOrActivePreset = async function () {
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

    currentActivePreset = targetPreset;

    const fullUrl = window.location.origin + '/promotion/' + encodeURIComponent(targetPreset.slug);
    try { navigator.clipboard.writeText(fullUrl); } catch (_) {}

    if (window.history && window.history.replaceState) {
        const adminQuery = checkIsAdmin() ? '?admin=true' : '';
        window.history.replaceState(null, '', '/promotion/' + encodeURIComponent(targetPreset.slug) + adminQuery);
    }

    closeAllModals();
    setupAdminControls();

    try {
        await saveAllPresets(savedPresets);
        showToast(`Updated preset "${targetPreset.title}" in Firestore! URL copied.`);
    } catch (err) {
        if (!auth.currentUser) {
            showToast(`Updated preset "${targetPreset.title}" locally! (Sign in to sync to Firestore cloud)`, 4500);
        } else {
            showToast(`Updated preset locally (Firestore: ${err.code || err.message})`, 4500);
        }
    }
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

window.setPresetAsDefault = async function (presetId) {
    savedPresets.forEach(p => {
        p.isDefault = (p.id === presetId);
    });
    try {
        await saveAllPresets(savedPresets);
    } catch (_) {}
    renderCustomPresetsList();
    const p = savedPresets.find(x => x.id === presetId);
    showToast(`Preset "${p ? p.title : ''}" is now the default /promotion/ page.`);
};

window.deleteCustomPreset = async function (presetId) {
    const p = savedPresets.find(x => x.id === presetId);
    if (!p) return;
    if (!confirm(`Are you sure you want to delete preset "${p.title}"? Normal users will no longer be able to access /promotion/${p.slug}.`)) return;

    savedPresets = savedPresets.filter(x => x.id !== presetId);
    try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(savedPresets)); } catch (_) {}

    if (currentActivePreset && currentActivePreset.id === presetId) {
        currentActivePreset = null;
    }

    renderCustomPresetsList();
    setupAdminControls();

    try {
        await Promise.all([
            deleteDoc(doc(db, 'promotions', p.slug)),
            deleteDoc(doc(db, 'promotions', p.id)),
            setDoc(doc(db, 'settings', 'promotion_presets'), {
                presets: savedPresets,
                updatedAt: new Date().toISOString()
            }, { merge: true })
        ]);
        showToast(`Deleted preset "${p.title}" from Firestore`);
    } catch (err) {
        console.warn("Could not delete preset from Firestore:", err);
        showToast(`Deleted preset "${p.title}" locally`);
    }
};

window.onPresetsSearchInput = function (e) {
    presetsSearchTerm = (e.target.value || '').toLowerCase().trim();
    renderCustomPresetsList();
};

window.duplicateCustomPreset = async function (presetId) {
    const preset = savedPresets.find(p => p.id === presetId);
    if (!preset) return;

    let baseSlug = slugify(preset.title) + '-copy';
    let finalSlug = baseSlug;
    let counter = 1;
    while (savedPresets.some(p => p.slug === finalSlug)) {
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
    }

    const clone = {
        id: 'preset_' + Date.now(),
        title: preset.title + ' (Copy)',
        slug: finalSlug,
        description: preset.description || '',
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pageData: JSON.parse(JSON.stringify(preset.pageData || []))
    };

    savedPresets.unshift(clone);
    renderCustomPresetsList();
    setupAdminControls();

    try {
        await saveAllPresets(savedPresets);
        showToast(`Duplicated preset as "${clone.title}" ✓`);
    } catch (_) {
        showToast(`Duplicated preset locally ✓`);
    }
};

function renderCustomPresetsList() {
    const container = document.getElementById('custom-presets-list');
    const countBadge = document.getElementById('custom-presets-count');
    if (!container) return;

    const filtered = presetsSearchTerm
        ? savedPresets.filter(p => (p.title || '').toLowerCase().includes(presetsSearchTerm) || (p.slug || '').toLowerCase().includes(presetsSearchTerm) || (p.description || '').toLowerCase().includes(presetsSearchTerm))
        : savedPresets;

    if (countBadge) {
        countBadge.textContent = `${filtered.length} of ${savedPresets.length} Preset${savedPresets.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:1.5rem 1rem; color:#888; font-size:0.75rem;">
                ${presetsSearchTerm ? `No presets match "${escapeHtml(presetsSearchTerm)}".` : 'No custom presets saved yet. Build a layout and click "+ Save As Preset" to create your first public promotion link.'}
            </div>
        `;
        return;
    }

    let html = '';
    filtered.forEach(p => {
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
                    <button type="button" class="preset-btn" onclick="duplicateCustomPreset('${p.id}')">⧉ Clone</button>
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
                spacing: 'none',
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

// ── Firestore Loading & Cloud Synchronization ──────────────────────────────
async function loadPresetsFromFirestore() {
    if (!db) return;
    try {
        let loadedFromCloud = false;

        // 1. Fetch settings/promotion_presets
        try {
            const presetsSnap = await getDoc(doc(db, 'settings', 'promotion_presets'));
            if (presetsSnap.exists() && Array.isArray(presetsSnap.data()?.presets) && presetsSnap.data().presets.length > 0) {
                const cloudPresets = presetsSnap.data().presets;
                const localMap = new Map(savedPresets.map(p => [p.slug, p]));
                cloudPresets.forEach(cp => {
                    if (cp && cp.slug) localMap.set(cp.slug, cp);
                });
                savedPresets = Array.from(localMap.values());
                loadedFromCloud = true;
            }
        } catch (e) {
            console.warn("Could not read settings/promotion_presets:", e);
        }

        // 2. Fetch /promotions collection documents
        try {
            const collSnap = await getDocs(collection(db, 'promotions'));
            if (!collSnap.empty) {
                const localMap = new Map(savedPresets.map(p => [p.slug, p]));
                collSnap.forEach(snap => {
                    const data = snap.data();
                    if (data && data.slug && Array.isArray(data.pageData)) {
                        if (data.slug === 'default') {
                            if (!getRequestedPresetQuery()) {
                                const localRaw = localStorage.getItem(STORAGE_KEY);
                                if (!localRaw || !checkIsAdmin()) {
                                    pageData = JSON.parse(JSON.stringify(data.pageData));
                                }
                            }
                        } else {
                            localMap.set(data.slug, data);
                        }
                    }
                });
                savedPresets = Array.from(localMap.values());
                loadedFromCloud = true;
            }
        } catch (collErr) {
            console.warn("Could not list /promotions collection:", collErr);
        }

        // 3. If a specific preset slug was requested and not yet in savedPresets, fetch directly
        const reqQuery = getRequestedPresetQuery();
        if (reqQuery) {
            const slug = slugify(reqQuery);
            if (!savedPresets.some(p => p.slug === slug || p.id === reqQuery)) {
                try {
                    const directSnap = await getDoc(doc(db, 'promotions', slug));
                    if (directSnap.exists() && directSnap.data()?.pageData) {
                        const directData = directSnap.data();
                        savedPresets.push(directData);
                        loadedFromCloud = true;
                    }
                } catch (e) {}
            }
        }

        if (loadedFromCloud) {
            try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(savedPresets)); } catch (_) {}
            renderCustomPresetsList();
            setupAdminControls();
        }
    } catch (err) {
        console.warn("Could not load presets from Firestore:", err);
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

// ── 10. Move Element & Studio Photo Library Handlers ──────────────────────
window.openMoveBlockModal = function (colId, blockId) {
    currentMovingBlockInfo = { colId, blockId };
    const modal = document.getElementById('move-block-modal');
    const select = document.getElementById('move-target-select');
    if (!modal || !select) return;

    let opts = '';
    pageData.forEach((row, rIdx) => {
        const rowTitle = `Row ${rIdx + 1} (${row.layout || '1'})`;
        (row.columns || []).forEach((c, cIdx) => {
            const isCurrent = c.id === colId;
            opts += `<option value="${c.id}" ${isCurrent ? 'disabled' : ''}>${rowTitle} — Column ${cIdx + 1} ${isCurrent ? '(Current)' : ''}</option>`;
        });
    });

    select.innerHTML = opts;
    modal.classList.add('is-open');
};

window.executeMoveBlock = function () {
    if (!currentMovingBlockInfo || !currentMovingBlockInfo.colId || !currentMovingBlockInfo.blockId) return;
    const targetColId = document.getElementById('move-target-select')?.value;
    if (!targetColId || targetColId === currentMovingBlockInfo.colId) {
        closeAllModals();
        return;
    }

    const srcCol = findColById(currentMovingBlockInfo.colId);
    const destCol = findColById(targetColId);
    if (!srcCol || !destCol) return;

    const blockIdx = (srcCol.blocks || []).findIndex(b => b.id === currentMovingBlockInfo.blockId);
    if (blockIdx === -1) return;

    pushHistoryState();
    const [movedBlock] = srcCol.blocks.splice(blockIdx, 1);
    destCol.blocks = destCol.blocks || [];
    destCol.blocks.push(movedBlock);

    currentMovingBlockInfo = null;
    savePageData();
    renderPage();
    closeAllModals();
    showToast('Element relocated successfully ⇄');
};

const STUDIO_PHOTOS = [
    { url: '/_images/theme_main.jpg', title: 'Vogue Noir Editorial Cover', category: 'High Fashion' },
    { url: '/_images/theme_concept_a.jpg', title: 'Cinematic Strobe & Shadow', category: 'Editorial' },
    { url: '/_images/theme_concept_b.jpg', title: 'High-Fashion Monolith', category: 'Noir Atelier' },
    { url: '/_images/location_studio.jpg', title: 'Industrial Cyclorama Atelier', category: 'Studio Location' },
    { url: '/_images/location_interior.jpg', title: 'Baroque Penthouse Suite', category: 'Interior Space' },
    { url: '/_images/location_waterfall.jpg', title: 'Nordic Mist Waterfall', category: 'Outdoor Location' },
    { url: '/_images/moodboard_preview.jpg', title: 'Curated Moodboard Direction', category: 'Creative Direction' },
    { url: '/_images/editing_preview.jpg', title: 'Master Retouching Suite', category: 'Post-Production' }
];

window.openStudioGalleryModal = function () {
    const modal = document.getElementById('studio-gallery-modal');
    const grid = document.getElementById('studio-library-grid');
    if (!modal || !grid) return;

    grid.innerHTML = STUDIO_PHOTOS.map(photo => `
        <div class="studio-photo-card" onclick="selectStudioLibraryImage('${photo.url}')">
            <div class="studio-photo-thumb-wrap">
                <img src="${photo.url}" alt="${escapeHtml(photo.title)}" class="studio-photo-thumb" loading="lazy">
            </div>
            <div class="studio-photo-info">
                <span class="studio-photo-name">${escapeHtml(photo.title)}</span>
                <span class="studio-photo-meta">${escapeHtml(photo.category)}</span>
            </div>
        </div>
    `).join('');

    modal.classList.add('is-open');
};

window.selectStudioLibraryImage = function (url) {
    const heroUrlInput = document.getElementById('edit-block-hero-img');
    const urlInput = document.getElementById('edit-block-url');
    if (heroUrlInput) {
        heroUrlInput.value = url;
        const previewImg = document.querySelector('#block-settings-hero-img-preview img');
        if (previewImg) previewImg.src = url;
    } else if (urlInput) {
        urlInput.value = url;
        const previewImg = document.querySelector('#block-settings-img-preview img');
        if (previewImg) previewImg.src = url;
    } else if (currentEditingBlockId) {
        const block = findBlockById(currentEditingBlockId);
        if (block && block.type === 'image') {
            pushHistoryState();
            block.url = url;
            savePageData();
            renderPage();
        } else if (block && block.type === 'hero') {
            pushHistoryState();
            block.imageUrl = url;
            savePageData();
            renderPage();
        }
    }
    const modal = document.getElementById('studio-gallery-modal');
    if (modal) modal.classList.remove('is-open');
    showToast('Selected studio image ✓');
};

window.handleModalImageUpload = function (event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const status = document.getElementById('upload-status-indicator');
    if (status) status.textContent = 'Processing image...';

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        window.selectStudioLibraryImage(dataUrl);
        if (status) status.textContent = '';
        showToast('Local image loaded ✓');
    };
    reader.onerror = () => {
        if (status) status.textContent = 'Failed to load file';
        showToast('Failed to read image file');
    };
    reader.readAsDataURL(file);
};

// ── 11. Interactive Accordion & Countdown Handlers ────────────────────────
window.toggleAccordionItem = function (buttonEl) {
    const item = buttonEl.closest('.pub-accordion-item');
    if (!item) return;
    const isOpen = item.classList.contains('is-open');
    const parentAccordion = item.closest('.pub-accordion');
    if (parentAccordion) {
        parentAccordion.querySelectorAll('.pub-accordion-item').forEach(it => it.classList.remove('is-open'));
    }
    if (!isOpen) {
        item.classList.add('is-open');
    }
};

function updateAllCountdowns() {
    const countdownBoxes = document.querySelectorAll('.pub-countdown-block');
    if (!countdownBoxes.length) return;

    const now = Date.now();
    countdownBoxes.forEach(box => {
        const targetDateStr = box.getAttribute('data-target-date');
        if (!targetDateStr) return;

        const targetTime = new Date(targetDateStr).getTime();
        const diff = targetTime - now;

        const daysEl = box.querySelector('.cd-days');
        const hoursEl = box.querySelector('.cd-hours');
        const minsEl = box.querySelector('.cd-mins');
        const secsEl = box.querySelector('.cd-secs');

        if (diff <= 0) {
            if (daysEl) daysEl.textContent = '00';
            if (hoursEl) hoursEl.textContent = '00';
            if (minsEl) minsEl.textContent = '00';
            if (secsEl) secsEl.textContent = '00';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
        if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
    });
}
setInterval(updateAllCountdowns, 1000);

// ── 12. Modals Universal Handlers & Keyboard Shortcuts ───────────────────
window.closeAllModals = function () {
    document.querySelectorAll('.builder-modal-backdrop').forEach(m => {
        m.classList.remove('is-open');
    });
};

document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('builder-modal-backdrop')) {
        closeAllModals();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllModals();
        return;
    }

    if (!checkIsAdmin()) return;

    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
            e.preventDefault();
            window.redo();
        } else if (!isInput) {
            e.preventDefault();
            window.undo();
        }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isInput) {
            e.preventDefault();
            window.redo();
        }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        savePageData();
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
