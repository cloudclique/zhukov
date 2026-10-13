import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, arrayUnion, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";
import { invalidateCache } from "../site-cache.js";
import { CLOUDFLARE_WORKER_URL } from "../cloudflare-storage.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const loginBtn = document.getElementById('login-btn-header');
    const logoutBtn = document.getElementById('logout-btn');
    const authWarning = document.getElementById('auth-warning');
    const uploadSection = document.getElementById('upload-section');

    const dropZone = document.getElementById('drop-zone');
    const imageInput = document.getElementById('image-input');
    const previewContainer = document.getElementById('preview-container');
    const uploadBtn = document.getElementById('upload-btn');
    const statusMsg = document.getElementById('status-msg');

    const categoryGroup = document.getElementById('category-group');
    const categoryInput = document.getElementById('category-input');
    const categoryDropdown = document.getElementById('category-dropdown');
    const categoryDropdownToggle = document.getElementById('category-dropdown-toggle');

    const modelGroup = document.getElementById('model-group');
    const modelInput = document.getElementById('model-input');
    const modelDropdown = document.getElementById('model-dropdown');
    const modelDropdownToggle = document.getElementById('model-dropdown-toggle');

    const themeGroup = document.getElementById('theme-group');
    const themeInput = document.getElementById('theme-input');
    const themeDropdown = document.getElementById('theme-dropdown');
    const themeDropdownToggle = document.getElementById('theme-dropdown-toggle');

    const descInput = document.getElementById('desc-input');
    const adultInput = document.getElementById('adult-input');
    const archiveInput = document.getElementById('archive-input');
    const existingSetBadge = document.getElementById('existing-set-badge');
    const descLockedHint = document.getElementById('desc-locked-hint');

    let selectedFiles = [];
    let previewObjectUrls = [];

    const clearThumbnails = () => {
        previewObjectUrls.forEach(url => {
            try { URL.revokeObjectURL(url); } catch (_) {}
        });
        previewObjectUrls = [];
        if (previewContainer) previewContainer.innerHTML = '';
    };

    // Map from display name -> stable doc ID
    const categoryIdMap = new Map();
    // Map from lowercase lookup key -> set object
    const existingSetsMap = new Map();
    let allPhotoSets = [];
    let allModels = [];
    let allThemes = [];

    let activeExistingSet = null;
    let autoCarriedModel = null;
    let autoCarriedTheme = null;
    let activeDropdownIndex = -1;
    let activeModelDropdownIndex = -1;
    let activeThemeDropdownIndex = -1;

    // --- Custom Full-Width Dropdown Rendering & Interaction ---

    const renderDropdown = (filterText = '') => {
        if (!categoryDropdown) return;
        categoryDropdown.innerHTML = '';
        activeDropdownIndex = -1;

        const q = (filterText || '').trim().toLowerCase();

        // Single Shots item definition
        const singleShotsItem = {
            id: 'single-shots',
            displayName: 'Single Shots',
            categoryName: 'Single Shots',
            isSingleShots: true,
            isArchived: false,
            modelName: '',
            theme: '',
            metaLabel: 'Mixed Editorial Collection',
            themeDisplay: 'Mixed',
            modelDisplay: 'Mixed'
        };

        const matchesQuery = (item) => {
            if (!q) return true;
            return (
                (item.displayName && item.displayName.toLowerCase().includes(q)) ||
                (item.modelName && item.modelName.toLowerCase().includes(q)) ||
                (item.theme && item.theme.toLowerCase().includes(q))
            );
        };

        const publicSets = allPhotoSets.filter(s => !s.isArchived && matchesQuery(s));
        const archivedSets = allPhotoSets.filter(s => s.isArchived && matchesQuery(s));
        const showSingleShots = matchesQuery(singleShotsItem);

        let totalRendered = 0;

        // ── 1. PUBLIC SECTION (ON TOP) ──
        if (showSingleShots || publicSets.length > 0) {
            const pubHeader = document.createElement('div');
            pubHeader.className = 'dropdown-section-title';
            pubHeader.innerHTML = '<span>PUBLIC PHOTO SETS</span>';
            categoryDropdown.appendChild(pubHeader);

            if (showSingleShots) {
                const itemEl = createDropdownItemEl(singleShotsItem);
                categoryDropdown.appendChild(itemEl);
                totalRendered++;
            }

            publicSets.forEach(set => {
                const itemEl = createDropdownItemEl(set);
                categoryDropdown.appendChild(itemEl);
                totalRendered++;
            });
        }

        // ── 2. ARCHIVED SECTION (ON THE BOTTOM WITH MINI TITLE) ──
        if (archivedSets.length > 0) {
            const archHeader = document.createElement('div');
            archHeader.className = 'dropdown-section-title archived-section-title';
            archHeader.innerHTML = '<span>── ARCHIVED PHOTO SETS ──</span>';
            categoryDropdown.appendChild(archHeader);

            archivedSets.forEach(set => {
                const itemEl = createDropdownItemEl(set);
                categoryDropdown.appendChild(itemEl);
                totalRendered++;
            });
        }

        if (totalRendered === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'dropdown-empty-msg';
            emptyEl.textContent = `No existing photo set matches "${filterText}". Type a new name to create one.`;
            categoryDropdown.appendChild(emptyEl);
        }
    };

    const createDropdownItemEl = (item) => {
        const el = document.createElement('div');
        el.className = 'dropdown-item';
        el.setAttribute('tabindex', '0');

        let metaHtml = '';
        if (item.isSingleShots) {
            metaHtml = `<span class="dropdown-meta-tag"><span class="meta-label">Type:</span> <span class="meta-value">Single Editorial Images</span></span>`;
        } else {
            const themeClass = item.themeDisplay === 'None' ? 'meta-none' : '';
            const modelClass = item.modelDisplay === 'Unknown' ? 'meta-none' : '';
            metaHtml = `
                <span class="dropdown-meta-tag"><span class="meta-label">Theme:</span> <span class="meta-value ${themeClass}">${item.themeDisplay}</span></span>
                <span class="meta-sep">•</span>
                <span class="dropdown-meta-tag"><span class="meta-label">Model:</span> <span class="meta-value ${modelClass}">${item.modelDisplay}</span></span>
            `;
        }

        const badgeHtml = item.isArchived ? `<span class="dropdown-archived-badge">Archived</span>` : '';

        el.innerHTML = `
            <div class="dropdown-item-header">
                <span class="dropdown-item-title">${item.displayName}</span>
                ${badgeHtml}
            </div>
            <div class="dropdown-item-meta">
                ${metaHtml}
            </div>
        `;

        el.addEventListener('click', () => {
            selectCategory(item);
        });

        return el;
    };

    const selectCategory = (item) => {
        categoryInput.value = item.displayName;
        closeDropdown();

        if (item.isSingleShots) {
            activeExistingSet = null;
            if (autoCarriedModel !== null && modelInput.value === autoCarriedModel) {
                modelInput.value = '';
            }
            autoCarriedModel = null;
            if (autoCarriedTheme !== null && themeInput.value === autoCarriedTheme) {
                themeInput.value = '';
            }
            autoCarriedTheme = null;
            if (descInput) {
                descInput.disabled = false;
                descInput.placeholder = "e.g. Studio session with @model. Stylist: @stylist...";
            }
            if (existingSetBadge) existingSetBadge.classList.add('hidden');
            if (descLockedHint) descLockedHint.classList.add('hidden');
            if (archiveInput) archiveInput.checked = false;
            return;
        }

        activeExistingSet = item;

        // 1. Carry over Model Name if collection has one and it isn't "Unknown"
        const rawModel = (item.modelName || '').trim();
        if (rawModel && rawModel.toLowerCase() !== 'unknown') {
            modelInput.value = rawModel;
            autoCarriedModel = rawModel;
        } else {
            if (autoCarriedModel !== null && modelInput.value === autoCarriedModel) {
                modelInput.value = '';
            }
            autoCarriedModel = null;
        }

        // 2. Carry over Theme if collection has one and it isn't "none"
        const rawTheme = (item.theme || '').trim();
        if (rawTheme && rawTheme.toLowerCase() !== 'none') {
            themeInput.value = rawTheme;
            autoCarriedTheme = rawTheme;
        } else {
            if (autoCarriedTheme !== null && themeInput.value === autoCarriedTheme) {
                themeInput.value = '';
            }
            autoCarriedTheme = null;
        }

        // 3. Disable Description & Credits for existing collection
        if (descInput) {
            descInput.value = '';
            descInput.disabled = true;
            descInput.placeholder = "Description & credits are locked for existing photo sets.";
        }

        if (existingSetBadge) {
            const typeLabel = item.isArchived ? 'Archived' : 'Public';
            existingSetBadge.textContent = `✓ Existing ${typeLabel} Photo Set: ${item.displayName} (${item.metaLabel})`;
            existingSetBadge.classList.remove('hidden');
        }
        if (descLockedHint) {
            descLockedHint.classList.remove('hidden');
        }

        if (item.isArchived && archiveInput) {
            archiveInput.checked = true;
        } else if (!item.isArchived && archiveInput) {
            archiveInput.checked = false;
        }
    };

    const openCategoryDropdown = () => {
        if (!categoryDropdown) return;
        closeModelDropdown();
        closeThemeDropdown();
        renderDropdown(categoryInput ? categoryInput.value.trim() : '');
        categoryDropdown.classList.remove('hidden');
        if (categoryDropdownToggle) categoryDropdownToggle.classList.add('is-open');
        if (categoryGroup) categoryGroup.classList.add('is-open');
    };

    const closeCategoryDropdown = () => {
        if (!categoryDropdown) return;
        categoryDropdown.classList.add('hidden');
        if (categoryDropdownToggle) categoryDropdownToggle.classList.remove('is-open');
        if (categoryGroup) categoryGroup.classList.remove('is-open');
        activeDropdownIndex = -1;
    };

    const openDropdown = openCategoryDropdown;
    const closeDropdown = closeCategoryDropdown;

    if (categoryInput) {
        categoryInput.addEventListener('focus', () => {
            openDropdown();
        });

        categoryInput.addEventListener('click', () => {
            openDropdown();
        });

        categoryInput.addEventListener('input', () => {
            openDropdown();
            const val = categoryInput.value.trim();
            const matched = existingSetsMap.get(val.toLowerCase());
            if (matched) {
                selectCategory(matched);
                // Keep dropdown open for further typing/viewing
                openDropdown();
            } else if (!val || val.toLowerCase() === 'single shots') {
                activeExistingSet = null;
                if (autoCarriedModel !== null && modelInput.value === autoCarriedModel) {
                    modelInput.value = '';
                }
                autoCarriedModel = null;
                if (autoCarriedTheme !== null && themeInput.value === autoCarriedTheme) {
                    themeInput.value = '';
                }
                autoCarriedTheme = null;
                if (descInput) {
                    descInput.disabled = false;
                    descInput.placeholder = "e.g. Studio session with @model. Stylist: @stylist...";
                }
                if (existingSetBadge) existingSetBadge.classList.add('hidden');
                if (descLockedHint) descLockedHint.classList.add('hidden');
            } else {
                // New photoshoot name
                activeExistingSet = null;
                if (autoCarriedModel !== null && modelInput.value === autoCarriedModel) {
                    modelInput.value = '';
                }
                autoCarriedModel = null;
                if (autoCarriedTheme !== null && themeInput.value === autoCarriedTheme) {
                    themeInput.value = '';
                }
                autoCarriedTheme = null;
                if (descInput) {
                    descInput.disabled = false;
                    descInput.placeholder = "e.g. Studio session with @model. Stylist: @stylist...";
                }
                if (existingSetBadge) existingSetBadge.classList.add('hidden');
                if (descLockedHint) descLockedHint.classList.add('hidden');
            }
        });

        categoryInput.addEventListener('keydown', (e) => {
            if (!categoryDropdown || categoryDropdown.classList.contains('hidden')) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    openDropdown();
                    e.preventDefault();
                }
                return;
            }

            const items = categoryDropdown.querySelectorAll('.dropdown-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeDropdownIndex = (activeDropdownIndex + 1) % items.length;
                items.forEach((el, idx) => el.classList.toggle('is-active', idx === activeDropdownIndex));
                items[activeDropdownIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeDropdownIndex = (activeDropdownIndex - 1 + items.length) % items.length;
                items.forEach((el, idx) => el.classList.toggle('is-active', idx === activeDropdownIndex));
                items[activeDropdownIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                if (activeDropdownIndex >= 0 && items[activeDropdownIndex]) {
                    e.preventDefault();
                    items[activeDropdownIndex].click();
                } else {
                    closeDropdown();
                }
            } else if (e.key === 'Escape') {
                closeDropdown();
            }
        });
    }

    if (categoryDropdownToggle) {
        categoryDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (categoryDropdown.classList.contains('hidden')) {
                openDropdown();
                categoryInput.focus();
            } else {
                closeDropdown();
            }
        });
    }

    // ── Model Name Custom Dropdown ──
    const renderModelDropdown = (filterText = '') => {
        if (!modelDropdown) return;
        modelDropdown.innerHTML = '';
        activeModelDropdownIndex = -1;

        const q = (filterText || '').trim().toLowerCase();
        const filtered = allModels.filter(m => !q || m.toLowerCase().includes(q));

        if (filtered.length > 0) {
            const header = document.createElement('div');
            header.className = 'dropdown-section-title';
            header.innerHTML = `<span>EXISTING MODELS (${filtered.length})</span>`;
            modelDropdown.appendChild(header);

            filtered.forEach(modelName => {
                const el = document.createElement('div');
                el.className = 'dropdown-item';
                el.setAttribute('tabindex', '0');
                el.innerHTML = `
                    <div class="dropdown-item-header">
                        <span class="dropdown-item-title">${modelName}</span>
                        <span class="dropdown-tag-badge">Model</span>
                    </div>
                `;
                el.addEventListener('click', () => {
                    modelInput.value = modelName;
                    closeModelDropdown();
                });
                modelDropdown.appendChild(el);
            });
        } else {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'dropdown-empty-msg';
            emptyEl.textContent = filterText
                ? `No existing model matches "${filterText}". Type to add a new model.`
                : `No existing models found. Type to add a new model.`;
            modelDropdown.appendChild(emptyEl);
        }
    };

    const openModelDropdown = () => {
        if (!modelDropdown) return;
        closeCategoryDropdown();
        closeThemeDropdown();
        renderModelDropdown(modelInput ? modelInput.value.trim() : '');
        modelDropdown.classList.remove('hidden');
        if (modelDropdownToggle) modelDropdownToggle.classList.add('is-open');
        if (modelGroup) modelGroup.classList.add('is-open');
    };

    const closeModelDropdown = () => {
        if (!modelDropdown) return;
        modelDropdown.classList.add('hidden');
        if (modelDropdownToggle) modelDropdownToggle.classList.remove('is-open');
        if (modelGroup) modelGroup.classList.remove('is-open');
        activeModelDropdownIndex = -1;
    };

    if (modelInput) {
        modelInput.addEventListener('focus', () => {
            openModelDropdown();
        });

        modelInput.addEventListener('click', () => {
            openModelDropdown();
        });

        modelInput.addEventListener('input', () => {
            openModelDropdown();
        });

        modelInput.addEventListener('keydown', (e) => {
            if (!modelDropdown || modelDropdown.classList.contains('hidden')) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    openModelDropdown();
                    e.preventDefault();
                }
                return;
            }

            const items = modelDropdown.querySelectorAll('.dropdown-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeModelDropdownIndex = (activeModelDropdownIndex + 1) % items.length;
                items.forEach((el, idx) => el.classList.toggle('is-active', idx === activeModelDropdownIndex));
                items[activeModelDropdownIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeModelDropdownIndex = (activeModelDropdownIndex - 1 + items.length) % items.length;
                items.forEach((el, idx) => el.classList.toggle('is-active', idx === activeModelDropdownIndex));
                items[activeModelDropdownIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                if (activeModelDropdownIndex >= 0 && items[activeModelDropdownIndex]) {
                    e.preventDefault();
                    items[activeModelDropdownIndex].click();
                } else {
                    closeModelDropdown();
                }
            } else if (e.key === 'Escape') {
                closeModelDropdown();
            }
        });
    }

    if (modelDropdownToggle) {
        modelDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (modelDropdown.classList.contains('hidden')) {
                openModelDropdown();
                modelInput.focus();
            } else {
                closeModelDropdown();
            }
        });
    }

    // ── Theme Custom Dropdown ──
    const renderThemeDropdown = (filterText = '') => {
        if (!themeDropdown) return;
        themeDropdown.innerHTML = '';
        activeThemeDropdownIndex = -1;

        const q = (filterText || '').trim().toLowerCase();
        const filtered = allThemes.filter(t => !q || t.toLowerCase().includes(q));

        if (filtered.length > 0) {
            const header = document.createElement('div');
            header.className = 'dropdown-section-title';
            header.innerHTML = `<span>EXISTING THEMES (${filtered.length})</span>`;
            themeDropdown.appendChild(header);

            filtered.forEach(themeName => {
                const el = document.createElement('div');
                el.className = 'dropdown-item';
                el.setAttribute('tabindex', '0');
                el.innerHTML = `
                    <div class="dropdown-item-header">
                        <span class="dropdown-item-title">${themeName}</span>
                        <span class="dropdown-tag-badge">Theme</span>
                    </div>
                `;
                el.addEventListener('click', () => {
                    themeInput.value = themeName;
                    closeThemeDropdown();
                });
                themeDropdown.appendChild(el);
            });
        } else {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'dropdown-empty-msg';
            emptyEl.textContent = filterText
                ? `No existing theme matches "${filterText}". Type to add a new theme.`
                : `No existing themes found. Type to add a new theme.`;
            themeDropdown.appendChild(emptyEl);
        }
    };

    const openThemeDropdown = () => {
        if (!themeDropdown) return;
        closeCategoryDropdown();
        closeModelDropdown();
        renderThemeDropdown(themeInput ? themeInput.value.trim() : '');
        themeDropdown.classList.remove('hidden');
        if (themeDropdownToggle) themeDropdownToggle.classList.add('is-open');
        if (themeGroup) themeGroup.classList.add('is-open');
    };

    const closeThemeDropdown = () => {
        if (!themeDropdown) return;
        themeDropdown.classList.add('hidden');
        if (themeDropdownToggle) themeDropdownToggle.classList.remove('is-open');
        if (themeGroup) themeGroup.classList.remove('is-open');
        activeThemeDropdownIndex = -1;
    };

    if (themeInput) {
        themeInput.addEventListener('focus', () => {
            openThemeDropdown();
        });

        themeInput.addEventListener('click', () => {
            openThemeDropdown();
        });

        themeInput.addEventListener('input', () => {
            openThemeDropdown();
        });

        themeInput.addEventListener('keydown', (e) => {
            if (!themeDropdown || themeDropdown.classList.contains('hidden')) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    openThemeDropdown();
                    e.preventDefault();
                }
                return;
            }

            const items = themeDropdown.querySelectorAll('.dropdown-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeThemeDropdownIndex = (activeThemeDropdownIndex + 1) % items.length;
                items.forEach((el, idx) => el.classList.toggle('is-active', idx === activeThemeDropdownIndex));
                items[activeThemeDropdownIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeThemeDropdownIndex = (activeThemeDropdownIndex - 1 + items.length) % items.length;
                items.forEach((el, idx) => el.classList.toggle('is-active', idx === activeThemeDropdownIndex));
                items[activeThemeDropdownIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                if (activeThemeDropdownIndex >= 0 && items[activeThemeDropdownIndex]) {
                    e.preventDefault();
                    items[activeThemeDropdownIndex].click();
                } else {
                    closeThemeDropdown();
                }
            } else if (e.key === 'Escape') {
                closeThemeDropdown();
            }
        });
    }

    if (themeDropdownToggle) {
        themeDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (themeDropdown.classList.contains('hidden')) {
                openThemeDropdown();
                themeInput.focus();
            } else {
                closeThemeDropdown();
            }
        });
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (categoryGroup && !categoryGroup.contains(e.target)) {
            closeCategoryDropdown();
        }
        if (modelGroup && !modelGroup.contains(e.target)) {
            closeModelDropdown();
        }
        if (themeGroup && !themeGroup.contains(e.target)) {
            closeThemeDropdown();
        }
    });

    // --- Fetch Metadata (Photo Sets & Tags) ---
    const loadMetadata = async () => {
        try {
            existingSetsMap.clear();
            categoryIdMap.clear();
            allPhotoSets = [];

            const [setsSnap, tagsSnap] = await Promise.all([
                getDocs(collection(db, 'photo_sets')).catch(err => {
                    console.warn("Could not fetch photo_sets:", err);
                    return { empty: true, forEach: () => {} };
                }),
                getDoc(doc(db, 'metadata', 'tags')).catch(err => {
                    console.warn("Could not fetch metadata/tags:", err);
                    return { exists: () => false };
                })
            ]);

            const modelsSet = new Set();
            const themesSet = new Set();

            const knownSetIds = new Set();
            const rawPublic = [];
            const rawArchived = [];

            if (!setsSnap.empty) {
                setsSnap.forEach(setDoc => {
                    const data = setDoc.data() || {};
                    const id = setDoc.id;
                    knownSetIds.add(id);

                    const rawName = data.categoryName || id;
                    const displayName = (rawName && rawName.trim() !== '-') ? rawName.trim() : id;
                    const modelName = (data.modelName || '').trim();
                    const theme = (data.theme || '').trim();
                    const description = data.description || '';

                    if (modelName && modelName !== '/' && modelName.toLowerCase() !== 'unknown') {
                        modelsSet.add(modelName);
                    }
                    if (theme && theme.toLowerCase() !== 'none') {
                        themesSet.add(theme);
                    }

                    const archivedUrls = Array.isArray(data.archivedUrls) ? data.archivedUrls : (Array.isArray(data.archived_photos) ? data.archived_photos : []);
                    const allUrlsArchived = Array.isArray(data.urls) && data.urls.length > 0 && data.urls.every(u => archivedUrls.includes(u));
                    const isArchived = Boolean(data.archived === true || allUrlsArchived);

                    const themeDisplay = (theme && theme.toLowerCase() !== 'none') ? theme : 'None';
                    const modelDisplay = (modelName && modelName.toLowerCase() !== 'unknown') ? modelName : 'Unknown';
                    const metaLabel = `Theme: ${themeDisplay} | Model: ${modelDisplay}`;

                    const setObj = {
                        id,
                        categoryName: displayName,
                        displayName,
                        modelName,
                        theme,
                        description,
                        isArchived,
                        themeDisplay,
                        modelDisplay,
                        metaLabel
                    };

                    categoryIdMap.set(displayName, id);
                    existingSetsMap.set(displayName.toLowerCase(), setObj);
                    existingSetsMap.set(id.toLowerCase(), setObj);

                    if (isArchived) {
                        rawArchived.push(setObj);
                    } else {
                        rawPublic.push(setObj);
                    }
                });
            }

            // Also check metadata tags for any additional categories, models, and themes
            if (tagsSnap && tagsSnap.exists()) {
                const data = tagsSnap.data();

                if (Array.isArray(data.categories)) {
                    data.categories.forEach(cat => {
                        const name = (typeof cat === 'object' && cat !== null) ? cat.name : cat;
                        const id   = (typeof cat === 'object' && cat !== null) ? cat.id   : cat;
                        if (name && name !== 'Single Shots' && name !== '-' && !knownSetIds.has(id)) {
                            const displayName = name.trim();
                            if (!existingSetsMap.has(displayName.toLowerCase())) {
                                const setObj = {
                                    id: id || displayName,
                                    categoryName: displayName,
                                    displayName,
                                    modelName: '',
                                    theme: '',
                                    description: '',
                                    isArchived: false,
                                    themeDisplay: 'None',
                                    modelDisplay: 'Unknown',
                                    metaLabel: 'Theme: None | Model: Unknown'
                                };
                                categoryIdMap.set(displayName, id || displayName);
                                existingSetsMap.set(displayName.toLowerCase(), setObj);
                                rawPublic.push(setObj);
                            }
                        }
                    });
                }

                if (Array.isArray(data.models)) {
                    data.models.forEach(model => {
                        const m = (typeof model === 'string' ? model : '').trim();
                        if (m && m !== '/' && m.toLowerCase() !== 'unknown') {
                            modelsSet.add(m);
                        }
                    });
                }

                if (Array.isArray(data.themes)) {
                    data.themes.forEach(theme => {
                        const t = (typeof theme === 'string' ? theme : '').trim();
                        if (t && t.toLowerCase() !== 'none') {
                            themesSet.add(t);
                        }
                    });
                }
            }

            // Case-insensitive deduplication and alphabetical sorting
            const dedupeCi = (arr) => {
                const map = new Map();
                arr.forEach(item => {
                    const lower = item.toLowerCase();
                    if (!map.has(lower)) {
                        map.set(lower, item);
                    }
                });
                return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
            };

            allModels = dedupeCi(Array.from(modelsSet));
            allThemes = dedupeCi(Array.from(themesSet));

            // Sort alphabetically within each section
            rawPublic.sort((a, b) => a.displayName.localeCompare(b.displayName));
            rawArchived.sort((a, b) => a.displayName.localeCompare(b.displayName));

            allPhotoSets = [...rawPublic, ...rawArchived];

            // Render dropdown initial states
            renderDropdown(categoryInput ? categoryInput.value.trim() : '');
            renderModelDropdown(modelInput ? modelInput.value.trim() : '');
            renderThemeDropdown(themeInput ? themeInput.value.trim() : '');
        } catch (error) {
            console.error("Error loading metadata:", error);
        }
    };

    const updateMetadata = async (category, stableId, model, theme) => {
        try {
            const tagsRef = doc(db, 'metadata', 'tags');
            const tagsSnap = await getDoc(tagsRef);
            const updates = {};

            if (category && category !== 'Single Shots') {
                // Build the updated categories array, replacing or adding the {id, name} entry
                const existing = (tagsSnap.exists() && Array.isArray(tagsSnap.data().categories))
                    ? tagsSnap.data().categories
                    : [];
                const newEntry = { id: stableId, name: category };
                const alreadyPresent = existing.some(c =>
                    (typeof c === 'object' && c !== null && c.id === stableId) ||
                    (typeof c === 'string' && c === category)
                );
                if (!alreadyPresent) {
                    updates.categories = arrayUnion(newEntry);
                }
            }
            if (model && model.toLowerCase() !== 'unknown') {
                updates.models = arrayUnion(model);
            }
            if (theme && theme.toLowerCase() !== 'none') {
                updates.themes = arrayUnion(theme);
            }

            if (Object.keys(updates).length > 0) {
                await setDoc(tagsRef, updates, { merge: true });
            }
        } catch (error) {
            console.error("Error updating metadata:", error);
        }
    };

    // --- Firebase Authentication & Role Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');
            let isAdmin = false;
            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists() && userSnap.data().role === 'admin') {
                    isAdmin = true;
                    if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, true);
                    authWarning.classList.add('hidden');
                    uploadSection.classList.remove('hidden');
                    loadMetadata();
                } else {
                    if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, false);
                    authWarning.classList.remove('hidden');
                    authWarning.innerHTML = `
                        <h2>Access Denied</h2>
                        <p style="color: #ff6b6b; margin-top: 1rem;">You do not have administrator privileges to access this page.</p>
                    `;
                    uploadSection.classList.add('hidden');
                }
            } catch (error) {
                console.error("Error checking role:", error);
                if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, false);
                authWarning.innerHTML = `<p style="color: #ff6b6b;">Error checking permissions.</p>`;
            }
        } else {
            localStorage.removeItem('zhukov_logged_in');
            if (window.updateHeaderAuthState) window.updateHeaderAuthState(null, false);
            authWarning.classList.remove('hidden');
            uploadSection.classList.add('hidden');
        }
    });

    // Delegated click listeners for header auth buttons
    document.addEventListener('click', (e) => {
        const loginTarget = e.target.closest('#login-btn-header');
        if (loginTarget) {
            localStorage.setItem('zhukov_logged_in', 'true');
            signInWithPopup(auth, provider).catch(console.error);
        }

        const logoutTarget = e.target.closest('#logout-btn');
        if (logoutTarget) {
            localStorage.removeItem('zhukov_logged_in');
            signOut(auth).catch(console.error);
        }
    });

    // --- Image Processing (Resize & WebP via Native createImageBitmap / ObjectURL) ---
    let sharedCanvas = null;

    const processImage = async (file) => {
        const MAX_DIMENSION = 1920;
        const MAX_THUMB_DIMENSION = 720;

        const renderToBlob = async (source, srcWidth, srcHeight, maxDim, quality) => {
            let width = srcWidth;
            let height = srcHeight;

            if (width > height) {
                if (width > maxDim) {
                    height = Math.round(height * (maxDim / width));
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width = Math.round(width * (maxDim / height));
                    height = maxDim;
                }
            }

            if (!sharedCanvas) {
                sharedCanvas = document.createElement('canvas');
            }
            sharedCanvas.width = width;
            sharedCanvas.height = height;

            const ctx = sharedCanvas.getContext('2d', { willReadFrequently: false });
            // Fill white background to prevent transparent alpha void
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(source, 0, 0, width, height);

            const blob = await new Promise((resolve, reject) => {
                sharedCanvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Canvas toBlob failed'));
                }, 'image/webp', quality);
            });

            // Purge canvas backing buffer immediately to reclaim GPU VRAM
            sharedCanvas.width = 0;
            sharedCanvas.height = 0;

            return blob;
        };

        const generateBlobs = async (source, srcWidth, srcHeight) => {
            const ratio = Math.round((srcWidth / srcHeight) * 10000) / 10000;
            const fullBlob = await renderToBlob(source, srcWidth, srcHeight, MAX_DIMENSION, 0.85);
            const thumbBlob = await renderToBlob(source, srcWidth, srcHeight, MAX_THUMB_DIMENSION, 0.80);
            return { fullBlob, thumbBlob, aspectRatio: ratio, width: srcWidth, height: srcHeight };
        };

        // Strategy 1: Native createImageBitmap (off-main-thread decode, EXIF orientation aware, zero base64 memory overhead)
        if (typeof window.createImageBitmap === 'function') {
            try {
                const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
                try {
                    const res = await generateBlobs(bmp, bmp.width, bmp.height);
                    if (res.fullBlob && (res.fullBlob.size > 12000 || file.size < 50000)) {
                        return res;
                    }
                    console.warn(`createImageBitmap produced unexpectedly small blob (${res.fullBlob ? res.fullBlob.size : 0} bytes). Retrying via Image element...`);
                } finally {
                    bmp.close();
                }
            } catch (bmpErr) {
                console.warn('createImageBitmap failed, falling back to HTMLImageElement:', bmpErr);
            }
        }

        // Strategy 2: HTMLImageElement with ObjectURL and explicit decode()
        const objectUrl = URL.createObjectURL(file);
        try {
            const img = new Image();
            img.src = objectUrl;
            if (typeof img.decode === 'function') {
                await img.decode();
            } else {
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
            }

            return await generateBlobs(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    };

    // --- Upload UI Interactions ---

    const handleFiles = (files) => {
        const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (validFiles.length === 0) {
            statusMsg.innerHTML = '<span class="error">Please select valid image files.</span>';
            return;
        }

        selectedFiles = [...selectedFiles, ...validFiles];

        // Render thumbnails safely with Object URLs (instant, zero RAM base64 bloat)
        clearThumbnails();
        dropZone.querySelector('p').style.display = 'none';

        selectedFiles.forEach((file) => {
            const objUrl = URL.createObjectURL(file);
            previewObjectUrls.push(objUrl);
            const img = document.createElement('img');
            img.src = objUrl;
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';
            previewContainer.appendChild(img);
        });

        uploadBtn.disabled = false;
        statusMsg.innerHTML = '';
    };

    dropZone.addEventListener('click', (e) => {
        // Prevent click if clicking on thumbnails
        if (e.target.tagName !== 'IMG') imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFiles(e.target.files);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });

    // --- Upload Logic ---
    uploadBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        const categoryVal = categoryInput.value.trim() || 'Single Shots';
        let category = categoryVal;
        let stableDocId = null;
        let isNewSet = true;
        let targetSet = activeExistingSet;

        if (categoryVal === 'Single Shots') {
            isNewSet = false;
            stableDocId = null;
            category = 'Single Shots';
        } else {
            if (!targetSet) {
                const cleanName = categoryVal.replace(/\s*\([^)]*\)$/, '').trim().toLowerCase();
                targetSet = existingSetsMap.get(categoryVal.toLowerCase()) || existingSetsMap.get(cleanName);
            }

            if (targetSet) {
                isNewSet = false;
                category = targetSet.displayName || targetSet.categoryName;
                stableDocId = targetSet.id;
            } else {
                isNewSet = true;
                stableDocId = categoryIdMap.get(categoryVal) || (Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
            }
        }

        const modelName = modelInput.value.trim();
        const theme = themeInput.value.trim();
        const description = descInput ? descInput.value.trim() : '';
        const isAdult = adultInput ? Boolean(adultInput.checked) : false;
        const isArchived = archiveInput ? Boolean(archiveInput.checked) : false;
        const date = new Date().toISOString();

        uploadBtn.disabled = true;

        try {
            const uploadedItems = [];
            const workerUrl = CLOUDFLARE_WORKER_URL;

            // Process and Upload Sequentially
            for (let i = 0; i < selectedFiles.length; i++) {
                statusMsg.innerHTML = `<span style="color: #60a5fa;">Processing & Uploading ${i + 1} of ${selectedFiles.length}...</span>`;

                // 1. Process Image to Full WebP & Thumbnail WebP
                const processed = await processImage(selectedFiles[i]);
                const { fullBlob, thumbBlob, aspectRatio } = processed;

                if (!fullBlob || fullBlob.size === 0) {
                    throw new Error(`Failed to process image ${i + 1} (empty output)`);
                }

                // Safety validation
                if (fullBlob.size < 12000 && selectedFiles[i].size > 50000) {
                    throw new Error(`Image ${i + 1} (${selectedFiles[i].name}) failed rendering to canvas (output size ${fullBlob.size} bytes). Upload aborted to prevent blank images.`);
                }

                // 2. Upload to Cloudflare R2 via Worker
                const safePrefix = category.replace(/[^a-zA-Z0-9_-]/g, '_');
                const baseName = `${safePrefix}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
                const uniqueFileName = `${baseName}.webp`;
                const uniqueThumbName = `${baseName}_thumb.webp`;

                const formData = new FormData();
                formData.append('image', fullBlob, uniqueFileName);

                const uploadRes = await fetch(workerUrl, {
                    method: 'POST',
                    body: formData
                });

                const uploadResult = await uploadRes.json();

                if (!uploadRes.ok || !uploadResult.success) {
                    throw new Error(uploadResult.error || `Failed to upload image ${i + 1}`);
                }

                const fullUrl = uploadResult.data.url;
                let thumbUrl = fullUrl;

                // Upload 720px lightweight grid thumbnail
                if (thumbBlob && thumbBlob.size > 0) {
                    try {
                        const thumbFormData = new FormData();
                        thumbFormData.append('image', thumbBlob, uniqueThumbName);
                        const thumbRes = await fetch(workerUrl, {
                            method: 'POST',
                            body: thumbFormData
                        });
                        const thumbResult = await thumbRes.json();
                        if (thumbRes.ok && thumbResult.success && thumbResult.data && thumbResult.data.url) {
                            thumbUrl = thumbResult.data.url;
                        }
                    } catch (thumbErr) {
                        console.warn("Thumbnail upload warning (falling back to full URL):", thumbErr);
                    }
                }

                uploadedItems.push({ url: fullUrl, thumbUrl, aspectRatio });

                // Small yield to let browser run GC and event loop
                await new Promise(r => setTimeout(r, 40));
            }

            statusMsg.innerHTML = `<span style="color: #60a5fa;">Saving references to Firebase...</span>`;

            const uploadedUrls = uploadedItems.map(item => item.url);

            // 3. Save to Firestore
            if (category === 'Single Shots') {
                const singleShotsRef = collection(db, 'single_shots');
                for (let j = 0; j < uploadedItems.length; j++) {
                    statusMsg.innerHTML = `<span style="color: #60a5fa;">Saving reference ${j + 1} of ${uploadedItems.length} to database...</span>`;
                    await addDoc(singleShotsRef, {
                        url: uploadedItems[j].url,
                        thumbUrl: uploadedItems[j].thumbUrl,
                        aspectRatio: uploadedItems[j].aspectRatio,
                        modelName, theme, description, date,
                        isAdult: isAdult,
                        archived: isArchived,
                        uploadedAt: date,
                        uploadedBy: auth.currentUser.uid
                    });
                }

                // Prepend newly uploaded URLs to single_shots_order setting so they are placed at the top of the gallery
                try {
                    const orderRef = doc(db, 'settings', 'single_shots_order');
                    const orderSnap = await getDoc(orderRef).catch(() => null);
                    if (orderSnap && orderSnap.exists()) {
                        const currentOrder = Array.isArray(orderSnap.data().order) ? orderSnap.data().order : [];
                        const newOrder = [...uploadedUrls, ...currentOrder.filter(u => !uploadedUrls.includes(u))];
                        await setDoc(orderRef, { order: newOrder }, { merge: true });
                    } else {
                        await setDoc(orderRef, { order: uploadedUrls }, { merge: true });
                    }
                } catch (orderErr) {
                    console.warn("Could not update single_shots_order on upload:", orderErr);
                }
            } else {
                // Use the stable document ID (immutable; survives category renames)
                const photoSetRef = doc(db, 'photo_sets', stableDocId);

                // Build thumbnail and aspect ratio maps
                const thumbMap = {};
                const ratioMap = {};
                uploadedItems.forEach(item => {
                    if (item.thumbUrl) thumbMap[item.url] = item.thumbUrl;
                    if (typeof item.aspectRatio === 'number') ratioMap[item.url] = item.aspectRatio;
                });

                // In photo sets, galleries display images using rawUrls.reverse() (newest to oldest).
                // Reversing the uploaded batch before arrayUnion ensures that the first uploaded
                // image is placed at index 0 (the top of the gallery), followed by subsequent images.
                const reversedBatch = [...uploadedUrls].reverse();

                // 1. Save base photoshoot metadata
                const baseData = {
                    categoryName: category,
                    uploadedAt: date,
                    uploadedBy: auth.currentUser.uid,
                    thumbUrls: thumbMap,
                    aspectRatios: ratioMap
                };

                // Model resolution: carry over / preserve
                let finalModel = '';
                if (modelName && modelName.toLowerCase() !== 'unknown') {
                    finalModel = modelName;
                } else if (targetSet && targetSet.modelName && targetSet.modelName.toLowerCase() !== 'unknown') {
                    finalModel = targetSet.modelName;
                }
                if (finalModel) {
                    baseData.modelName = finalModel;
                }

                // Theme resolution: carry over / preserve
                let finalTheme = '';
                if (theme && theme.toLowerCase() !== 'none') {
                    finalTheme = theme;
                } else if (targetSet && targetSet.theme && targetSet.theme.toLowerCase() !== 'none') {
                    finalTheme = targetSet.theme;
                }
                if (finalTheme) {
                    baseData.theme = finalTheme;
                }

                if (isAdult) {
                    baseData.isAdult = true;
                }

                if (isNewSet) {
                    baseData.date = date;
                    if (isArchived) {
                        baseData.archived = true;
                    }
                    if (description) {
                        baseData.description = description;
                    }
                }
                // IMPORTANT: For existing sets (isNewSet === false), baseData.description is NEVER set!
                // This ensures Description & Credits are never updated or overwritten for existing collections!

                await setDoc(photoSetRef, baseData, { merge: true });

                // 2. Append URLs in safe chunks of 20 to prevent Firestore batch or field transform limits
                const CHUNK_SIZE = 20;
                const totalChunks = Math.ceil(reversedBatch.length / CHUNK_SIZE);
                for (let c = 0; c < totalChunks; c++) {
                    const chunk = reversedBatch.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
                    statusMsg.innerHTML = `<span style="color: #60a5fa;">Saving batch ${c + 1} of ${totalChunks} to database...</span>`;
                    const chunkUpdate = {
                        urls: arrayUnion(...chunk),
                        thumbUrls: thumbMap,
                        aspectRatios: ratioMap
                    };
                    if (isAdult) {
                        chunkUpdate.adultUrls = arrayUnion(...chunk);
                    }
                    if (isArchived && !isNewSet) {
                        chunkUpdate.archivedUrls = arrayUnion(...chunk);
                    }
                    await setDoc(photoSetRef, chunkUpdate, { merge: true });
                }
            }

            // 4. Update metadata tags
            await updateMetadata(category, stableDocId, modelName, theme);

            // Invalidate cached photoshoots so fresh uploads appear immediately
            invalidateCache('photoshoots');
            invalidateCache('gallery');
            invalidateCache('archived');

            // Success!
            statusMsg.innerHTML = '<span class="success">All photos successfully uploaded and saved!</span>';

            // Reset form
            setTimeout(() => {
                selectedFiles = [];
                clearThumbnails();
                dropZone.querySelector('p').style.display = 'block';
                uploadBtn.disabled = true;
                uploadBtn.innerText = 'Upload Photo';
                statusMsg.innerHTML = '';
                categoryInput.value = '';
                modelInput.value = '';
                themeInput.value = '';
                activeExistingSet = null;
                autoCarriedModel = null;
                autoCarriedTheme = null;
                closeCategoryDropdown();
                closeModelDropdown();
                closeThemeDropdown();
                if (descInput) {
                    descInput.value = '';
                    descInput.disabled = false;
                    descInput.placeholder = "e.g. Studio session with @model. Stylist: @stylist...";
                }
                if (existingSetBadge) existingSetBadge.classList.add('hidden');
                if (descLockedHint) descLockedHint.classList.add('hidden');
                if (adultInput) adultInput.checked = false;
                if (archiveInput) archiveInput.checked = false;
                loadMetadata();
            }, 3000);

        } catch (error) {
            console.error("Upload error:", error);
            statusMsg.innerHTML = `<span class="error">Error: ${error.message}</span>`;
            uploadBtn.disabled = false;
            uploadBtn.innerText = 'Retry Upload';
        }
    });
});

