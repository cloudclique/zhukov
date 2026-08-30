import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, query, where, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Global Application State
let currentUser = null;
let currentIsAdmin = false;
let activeBoardId = null;
let activeBoardData = null;
let unsubscribeBoardSnapshot = null;

// Infinite Canvas & Viewport State
let viewportScale = 1.0;
let viewportPanX = -2000;
let viewportPanY = -2000;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// Active Tool State: 'select' | 'move' | 'pen' | 'eraser'
let activeTool = 'select';
let previousToolBeforePan = null;
let isMiddleMousePanning = false;
let penColor = '#38bdf8';
let penSize = 6;
let eraserSize = 30;

// Box Area Marquee Selection State
let isMarqueeSelecting = false;
let marqueeScreenStart = { x: 0, y: 0 };
let marqueeWorldStart = { x: 0, y: 0 };

// Selected Elements for Drag / Transform (Supports Multi-Selection)
let selectedElementIds = new Set();
let selectedElementId = null;
let isDraggingElement = false;
let isTransformingElement = false;
let transformAction = null;
let dragStartX = 0;
let dragStartY = 0;
let elementInitialRect = { x: 0, y: 0, width: 0, height: 0, rotation: 0 };

// Freehand Ink Drawing System
let isDrawingStroke = false;
let currentStrokePoints = [];
let drawingCanvas = null;
let drawingCtx = null;

// Debounce helper for saving to Firestore
let saveTimeout = null;

// Undo/Redo History Stack
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 50;

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loginBtn = document.getElementById('login-btn-header');
    const logoutBtn = document.getElementById('logout-btn');
    const uploadLink = document.getElementById('upload-nav-link');
    const dashboardView = document.getElementById('dashboard-view');
    const canvasView = document.getElementById('canvas-view');
    const boardsGrid = document.getElementById('boards-grid');
    const btnCreateBoard = document.getElementById('btn-create-board');
    const authNotice = document.getElementById('auth-notice');
    const emptyBoardsNotice = document.getElementById('empty-boards-notice');
    const btnAuthNoticeLogin = document.getElementById('btn-auth-notice-login');
    const selectionToolbar = document.getElementById('selection-toolbar');
    const btnUndoAction = document.getElementById('btn-undo-action');
    const btnRedoAction = document.getElementById('btn-redo-action');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');

    const boardMetaBar = document.getElementById('board-meta-bar');
    const btnBackToDashboard = document.getElementById('btn-back-to-dashboard');
    const activeBoardTitle = document.getElementById('active-board-title');
    const activeBoardRoleBadge = document.getElementById('active-board-role-badge');

    const canvasViewport = document.getElementById('canvas-viewport');
    const canvasWorld = document.getElementById('canvas-world');
    const elementsContainer = document.getElementById('elements-container');
    drawingCanvas = document.getElementById('drawing-layer');
    drawingCtx = drawingCanvas.getContext('2d');

    // Tool buttons
    const toolSelect = document.getElementById('tool-select');
    const toolMove = document.getElementById('tool-move');
    const toolPen = document.getElementById('tool-pen');
    const toolEraser = document.getElementById('tool-eraser');
    const toolAddText = document.getElementById('tool-add-text');
    const toolAddPhoto = document.getElementById('tool-add-photo');
    const btnClearDrawing = document.getElementById('btn-clear-drawing');
    const penOptionsDrawer = document.getElementById('pen-options-drawer');
    const eraserOptionsDrawer = document.getElementById('eraser-options-drawer');
    const eraserCursor = document.getElementById('eraser-cursor');
    const selectionMarquee = document.getElementById('selection-marquee');
    const eraserSizeSlider = document.getElementById('eraser-size-slider');
    const eraserSizeDisplay = document.getElementById('eraser-size-display');

    // HUD controls
    const hudZoomIn = document.getElementById('hud-zoom-in');
    const hudZoomOut = document.getElementById('hud-zoom-out');
    const hudResetView = document.getElementById('hud-reset-view');
    const hudZoomDisplay = document.getElementById('hud-zoom-display');

    // Modals
    const modalCreateBoard = document.getElementById('modal-create-board');
    const btnSubmitCreateBoard = document.getElementById('btn-submit-create-board');
    const newBoardTitle = document.getElementById('new-board-title');
    const newBoardDesc = document.getElementById('new-board-desc');
    const newBoardCollabs = document.getElementById('new-board-collabs');

    const btnBoardSettings = document.getElementById('btn-board-settings');
    const modalBoardSettings = document.getElementById('modal-board-settings');
    const settingsBoardTitle = document.getElementById('settings-board-title');
    const settingsBoardDesc = document.getElementById('settings-board-desc');
    const btnSaveBoardSettings = document.getElementById('btn-save-board-settings');
    const inputAddCollabEmail = document.getElementById('input-add-collab-email');
    const btnAddCollabEmail = document.getElementById('btn-add-collab-email');
    const collabChipsContainer = document.getElementById('collab-chips-container');
    const settingViewViaUrl = document.getElementById('setting-view-via-url');
    const shareLinkBox = document.getElementById('share-link-box');
    const inputShareUrl = document.getElementById('input-share-url');
    const btnCopyShareUrl = document.getElementById('btn-copy-share-url');

    const modalAddPhoto = document.getElementById('modal-add-photo');
    const pickerPhotosGrid = document.getElementById('picker-photos-grid');
    const photoshootCategoryFilter = document.getElementById('photoshoot-category-filter');
    const photoshootCountBadge = document.getElementById('photoshoot-count-badge');
    const inputImgUrl = document.getElementById('input-img-url');
    const btnInsertUrlImg = document.getElementById('btn-insert-url-img');
    const inputFileLocal = document.getElementById('input-file-local');
    const uploadStatusText = document.getElementById('upload-status-text');

    // --- Toast Notification Helper ---
    const showToast = (message) => {
        const toast = document.getElementById('mb-toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3200);
    };

    // --- Modal Helpers ---
    const openModal = (modal) => {
        if (modal) modal.classList.add('active');
    };
    const closeModal = (modal) => {
        if (modal) modal.classList.remove('active');
    };
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) closeModal(modal);
        });
    });
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    // Helper: Robust board ID extractor from URL (supports ?id=, ?board=, #id, or /moodboard/<id>/)
    const getBoardIdFromUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const paramId = urlParams.get('id') || urlParams.get('board');
        if (paramId) return paramId;

        const hash = window.location.hash.replace(/^#/, '');
        if (hash) {
            const hashParams = new URLSearchParams(hash);
            const hashId = hashParams.get('id') || hashParams.get('board');
            if (hashId) return hashId;
            if (!['login', 'signup', 'dashboard'].includes(hash) && hash.length >= 5) return hash;
        }

        const pathMatches = window.location.pathname.match(/\/moodboard\/([a-zA-Z0-9_-]+)\/?$/);
        if (pathMatches && pathMatches[1] && pathMatches[1] !== 'index.html' && pathMatches[1] !== 'moodboard') {
            return pathMatches[1];
        }
        return null;
    };

    // --- Auth Management ---
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        const targetBoardFromUrl = getBoardIdFromUrl();

        if (user) {
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            localStorage.setItem('zhukov_logged_in', 'true');

            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                currentIsAdmin = userSnap.exists() && userSnap.data().role === 'admin';
            } catch (err) {
                console.error("User role check failed:", err);
                currentIsAdmin = false;
            }

            if (currentIsAdmin) {
                if (uploadLink) uploadLink.classList.remove('hidden');
                btnCreateBoard.classList.remove('hidden');
            } else {
                if (uploadLink) uploadLink.classList.add('hidden');
                btnCreateBoard.classList.add('hidden');
            }

            authNotice.classList.add('hidden');

            if (targetBoardFromUrl && !activeBoardId) {
                openMoodboard(targetBoardFromUrl);
            } else if (!activeBoardId) {
                loadDashboardBoards();
            }
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            if (uploadLink) uploadLink.classList.add('hidden');
            localStorage.removeItem('zhukov_logged_in');
            currentUser = null;
            currentIsAdmin = false;
            btnCreateBoard.classList.add('hidden');
            
            // Show auth notice on dashboard
            boardsGrid.innerHTML = '';
            authNotice.classList.remove('hidden');
            emptyBoardsNotice.classList.add('hidden');

            if (targetBoardFromUrl) {
                openMoodboard(targetBoardFromUrl);
            } else {
                exitBoardToDashboard();
            }
        }
    });

    loginBtn.addEventListener('click', () => {
        localStorage.setItem('zhukov_logged_in', 'true');
        signInWithPopup(auth, provider).catch(console.error);
    });
    if (btnAuthNoticeLogin) {
        btnAuthNoticeLogin.addEventListener('click', () => {
            localStorage.setItem('zhukov_logged_in', 'true');
            signInWithPopup(auth, provider).catch(console.error);
        });
    }
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('zhukov_logged_in');
        signOut(auth).catch(console.error);
    });

    // --- User-Scoped Action-Based History (Undo / Redo) ---
    // Sync viewport height with mobile/tablet visual viewport to compensate for browser searchbars and tabs
    const syncVisualViewportHeight = () => {
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--vvh', `${vh}px`);
    };
    window.visualViewport?.addEventListener('resize', syncVisualViewportHeight);
    window.visualViewport?.addEventListener('scroll', syncVisualViewportHeight);
    window.addEventListener('resize', syncVisualViewportHeight);
    syncVisualViewportHeight();

    const recordAction = (action) => {
        undoStack.push(action);
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
        updateUndoRedoButtons();
    };

    const updateUndoRedoButtons = () => {
        if (btnUndoAction) btnUndoAction.disabled = undoStack.length === 0;
        if (btnRedoAction) btnRedoAction.disabled = redoStack.length === 0;
    };

    const performUndo = async () => {
        if (undoStack.length === 0 || !activeBoardData) return;
        const action = undoStack.pop();
        redoStack.push(action);

        switch (action.type) {
            case 'ADD_ELEMENT': {
                activeBoardData.elements = (activeBoardData.elements || []).filter(el => el.id !== action.element.id);
                if (selectedElementId === action.element.id) {
                    selectedElementId = null;
                }
                renderCanvasElements(activeBoardData.elements);
                updateSelectionToolbar();
                break;
            }
            case 'DELETE_ELEMENT': {
                if (!activeBoardData.elements) activeBoardData.elements = [];
                activeBoardData.elements.push({ ...action.element });
                renderCanvasElements(activeBoardData.elements);
                selectElement(action.element.id);
                break;
            }
            case 'MOVE_ELEMENT': {
                const el = (activeBoardData.elements || []).find(e => e.id === action.id);
                if (el) {
                    el.x = action.from.x;
                    el.y = action.from.y;
                    renderCanvasElements(activeBoardData.elements);
                    selectElement(action.id);
                }
                break;
            }
            case 'MOVE_ELEMENTS':
            case 'MOVE_ITEMS': {
                (action.moves || []).forEach(m => {
                    if (m.isDrawing) {
                        const path = (activeBoardData.drawingPaths || []).find(p => p.id === m.id);
                        if (path && m.fromPoints) {
                            path.points = m.fromPoints.map(pt => ({ x: pt.x, y: pt.y }));
                        }
                    } else {
                        const el = (activeBoardData.elements || []).find(e => e.id === m.id);
                        if (el && m.from) {
                            el.x = m.from.x;
                            el.y = m.from.y;
                        }
                    }
                });
                renderCanvasElements(activeBoardData.elements);
                renderDrawingPaths(activeBoardData.drawingPaths);
                selectedElementIds = new Set((action.moves || []).map(m => m.id));
                selectedElementId = Array.from(selectedElementIds)[0] || null;
                updateSelectedDOM();
                break;
            }
            case 'DELETE_ELEMENTS': {
                if (!activeBoardData.elements) activeBoardData.elements = [];
                activeBoardData.elements.push(...action.elements.map(it => ({ ...it })));
                selectedElementIds = new Set(action.elements.map(it => it.id));
                selectedElementId = Array.from(selectedElementIds)[0] || null;
                renderCanvasElements(activeBoardData.elements);
                updateSelectedDOM();
                break;
            }
            case 'DELETE_ITEMS': {
                if (!activeBoardData.elements) activeBoardData.elements = [];
                if (!activeBoardData.drawingPaths) activeBoardData.drawingPaths = [];
                if (action.elements) {
                    activeBoardData.elements.push(...action.elements.map(it => ({ ...it })));
                }
                if (action.drawings) {
                    activeBoardData.drawingPaths.push(...action.drawings.map(p => ({
                        ...p,
                        points: p.points.map(pt => ({ ...pt }))
                    })));
                }
                selectedElementIds = new Set([
                    ...(action.elements || []).map(it => it.id),
                    ...(action.drawings || []).map(p => p.id)
                ]);
                selectedElementId = Array.from(selectedElementIds)[0] || null;
                renderCanvasElements(activeBoardData.elements);
                renderDrawingPaths(activeBoardData.drawingPaths);
                updateSelectedDOM();
                break;
            }
            case 'TRANSFORM_ELEMENT': {
                const el = (activeBoardData.elements || []).find(e => e.id === action.id);
                if (el) {
                    el.x = action.from.x;
                    el.y = action.from.y;
                    el.width = action.from.width;
                    el.height = action.from.height;
                    el.rotation = action.from.rotation;
                    renderCanvasElements(activeBoardData.elements);
                    selectElement(action.id);
                }
                break;
            }
            case 'TRANSFORM_DRAWING': {
                const path = (activeBoardData.drawingPaths || []).find(p => p.id === action.id);
                if (path && action.fromPoints) {
                    path.points = action.fromPoints.map(pt => ({ x: pt.x, y: pt.y }));
                    renderDrawingPaths(activeBoardData.drawingPaths);
                    selectElement(action.id);
                }
                break;
            }
            case 'STYLE_ELEMENT': {
                const el = (activeBoardData.elements || []).find(e => e.id === action.id);
                if (el) {
                    Object.assign(el, action.from);
                    renderCanvasElements(activeBoardData.elements);
                    selectElement(action.id);
                    if (typeof syncStylePanelToItem === 'function') syncStylePanelToItem(el);
                }
                break;
            }
            case 'TEXT_CHANGE': {
                const el = (activeBoardData.elements || []).find(e => e.id === action.id);
                if (el) {
                    el.content = action.from;
                    renderCanvasElements(activeBoardData.elements);
                    selectElement(action.id);
                }
                break;
            }
            case 'DRAW_STROKE': {
                activeBoardData.drawingPaths = (activeBoardData.drawingPaths || []).filter(p => p.id !== action.path.id);
                renderDrawingPaths(activeBoardData.drawingPaths);
                break;
            }
            case 'CLEAR_DRAWINGS': {
                activeBoardData.drawingPaths = [ ...action.paths ];
                renderDrawingPaths(activeBoardData.drawingPaths);
                break;
            }
        }

        updateUndoRedoButtons();
        await queueSaveBoard();
    };

    const performRedo = async () => {
        if (redoStack.length === 0 || !activeBoardData) return;
        const action = redoStack.pop();
        undoStack.push(action);

        switch (action.type) {
            case 'ADD_ELEMENT': {
                if (!activeBoardData.elements) activeBoardData.elements = [];
                activeBoardData.elements.push({ ...action.element });
                renderCanvasElements(activeBoardData.elements);
                selectElement(action.element.id);
                break;
            }
            case 'DELETE_ELEMENT': {
                activeBoardData.elements = (activeBoardData.elements || []).filter(el => el.id !== action.element.id);
                selectedElementIds.delete(action.element.id);
                if (selectedElementId === action.element.id) {
                    selectedElementId = Array.from(selectedElementIds)[0] || null;
                }
                renderCanvasElements(activeBoardData.elements);
                updateSelectedDOM();
                updateSelectionToolbar();
                break;
            }
            case 'DELETE_ELEMENTS': {
                const ids = new Set((action.elements || []).map(it => it.id));
                activeBoardData.elements = (activeBoardData.elements || []).filter(el => !ids.has(el.id));
                deselectAll();
                renderCanvasElements(activeBoardData.elements);
                break;
            }
            case 'DELETE_ITEMS': {
                const elemIds = new Set((action.elements || []).map(it => it.id));
                const drawIds = new Set((action.drawings || []).map(p => p.id));
                activeBoardData.elements = (activeBoardData.elements || []).filter(el => !elemIds.has(el.id));
                activeBoardData.drawingPaths = (activeBoardData.drawingPaths || []).filter(p => !drawIds.has(p.id));
                deselectAll();
                renderCanvasElements(activeBoardData.elements);
                renderDrawingPaths(activeBoardData.drawingPaths);
                break;
            }
            case 'MOVE_ELEMENT': {
                const el = (activeBoardData.elements || []).find(e => e.id === action.id);
                if (el) {
                    el.x = action.to.x;
                    el.y = action.to.y;
                    renderCanvasElements(activeBoardData.elements);
                    selectElement(action.id);
                }
                break;
            }
            case 'MOVE_ELEMENTS':
            case 'MOVE_ITEMS': {
                (action.moves || []).forEach(m => {
                    if (m.isDrawing) {
                        const path = (activeBoardData.drawingPaths || []).find(p => p.id === m.id);
                        if (path && m.toPoints) {
                            path.points = m.toPoints.map(pt => ({ x: pt.x, y: pt.y }));
                        }
                    } else {
                        const el = (activeBoardData.elements || []).find(e => e.id === m.id);
                        if (el && m.to) {
                            el.x = m.to.x;
                            el.y = m.to.y;
                        }
                    }
                });
                renderCanvasElements(activeBoardData.elements);
                renderDrawingPaths(activeBoardData.drawingPaths);
                selectedElementIds = new Set((action.moves || []).map(m => m.id));
                selectedElementId = Array.from(selectedElementIds)[0] || null;
                updateSelectedDOM();
                break;
            }
            case 'TRANSFORM_ELEMENT': {
                const el = (activeBoardData.elements || []).find(e => e.id === action.id);
                if (el) {
                    el.x = action.to.x;
                    el.y = action.to.y;
                    el.width = action.to.width;
                    el.height = action.to.height;
                    el.rotation = action.to.rotation;
                    renderCanvasElements(activeBoardData.elements);
                    selectElement(action.id);
                }
                break;
            }
            case 'TRANSFORM_DRAWING': {
                const path = (activeBoardData.drawingPaths || []).find(p => p.id === action.id);
                if (path && action.toPoints) {
                    path.points = action.toPoints.map(pt => ({ x: pt.x, y: pt.y }));
                    renderDrawingPaths(activeBoardData.drawingPaths);
                    selectElement(action.id);
                }
                break;
            }
            case 'STYLE_ELEMENT': {
                const el = (activeBoardData.elements || []).find(e => e.id === action.id);
                if (el) {
                    Object.assign(el, action.to);
                    renderCanvasElements(activeBoardData.elements);
                    selectElement(action.id);
                    if (typeof syncStylePanelToItem === 'function') syncStylePanelToItem(el);
                }
                break;
            }
            case 'TEXT_CHANGE': {
                const el = (activeBoardData.elements || []).find(e => e.id === action.id);
                if (el) {
                    el.content = action.to;
                    renderCanvasElements(activeBoardData.elements);
                    selectElement(action.id);
                }
                break;
            }
            case 'DRAW_STROKE': {
                if (!activeBoardData.drawingPaths) activeBoardData.drawingPaths = [];
                activeBoardData.drawingPaths.push({ ...action.path });
                renderDrawingPaths(activeBoardData.drawingPaths);
                break;
            }
            case 'CLEAR_DRAWINGS': {
                activeBoardData.drawingPaths = [];
                renderDrawingPaths(activeBoardData.drawingPaths);
                break;
            }
        }

        updateUndoRedoButtons();
        await queueSaveBoard();
    };

    if (btnUndoAction) {
        btnUndoAction.addEventListener('click', performUndo);
    }

    if (btnRedoAction) {
        btnRedoAction.addEventListener('click', performRedo);
    }

    if (btnDeleteSelected) {
        btnDeleteSelected.addEventListener('click', () => {
            deleteSelectedElements();
        });
    }

    // Show/hide the floating selection toolbar and note style panel based on selection
    const noteStylePanel = document.getElementById('note-style-panel');
    const btnStyleNote = document.getElementById('btn-style-note');
    const styleSep = document.getElementById('style-sep');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSizeDisplay = document.getElementById('font-size-display');
    const toggleBold = document.getElementById('toggle-bold');
    const toggleItalic = document.getElementById('toggle-italic');
    const bgColorInput = document.getElementById('bg-color-input');
    const fontColorInput = document.getElementById('font-color-input');

    const updateSelectionToolbar = () => {
        if (!selectionToolbar) return;
        const count = selectedElementIds.size || (selectedElementId ? 1 : 0);
        if (count > 0) {
            selectionToolbar.classList.add('visible');
            // Show "Style" button only when a single text note is selected
            const isSingle = count === 1;
            const singleId = selectedElementId || Array.from(selectedElementIds)[0];
            const item = (isSingle && activeBoardData) ? activeBoardData.elements.find(it => it.id === singleId) : null;
            const isText = item && item.type === 'text';
            if (btnStyleNote) btnStyleNote.style.display = isText ? '' : 'none';
            if (styleSep) styleSep.style.display = isText ? '' : 'none';
            if (!isText && noteStylePanel) noteStylePanel.classList.remove('open');
            if (isText) syncStylePanelToItem(item);
        } else {
            selectionToolbar.classList.remove('visible');
            if (noteStylePanel) noteStylePanel.classList.remove('open');
        }
    };

    // Sync panel controls to current item styles
    const syncStylePanelToItem = (item) => {
        if (!item) return;
        // Font size
        const fs = item.fontSize || 14;
        if (fontSizeSlider) fontSizeSlider.value = fs;
        if (fontSizeDisplay) fontSizeDisplay.textContent = fs + 'px';
        // Bold/italic
        if (toggleBold) toggleBold.classList.toggle('active', !!item.fontBold);
        if (toggleItalic) toggleItalic.classList.toggle('active', !!item.fontItalic);
        // Swatch active states (bg)
        document.querySelectorAll('#bg-swatches .swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.preset === (item.stylePreset || 'note-dark'));
        });
    };

    // Open/close style panel on Style button
    if (btnStyleNote) {
        btnStyleNote.addEventListener('click', (e) => {
            e.stopPropagation();
            if (noteStylePanel) noteStylePanel.classList.toggle('open');
        });
    }
    document.getElementById('close-style-panel')?.addEventListener('click', () => {
        noteStylePanel?.classList.remove('open');
    });

    // Helper to snapshot styling for a note
    const getNoteStyles = (item) => ({
        stylePreset: item.stylePreset || 'note-dark',
        customBg: item.customBg || '',
        customColor: item.customColor || '',
        fontSize: item.fontSize || 14,
        fontBold: !!item.fontBold,
        fontItalic: !!item.fontItalic
    });

    // Background swatch clicks
    document.querySelectorAll('#bg-swatches .swatch[data-preset]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (!item || item.type !== 'text') return;
            const oldStyles = getNoteStyles(item);
            item.stylePreset = btn.dataset.preset;
            delete item.customBg;
            delete item.customColor;
            const newStyles = getNoteStyles(item);
            recordAction({ type: 'STYLE_ELEMENT', id: item.id, from: oldStyles, to: newStyles });
            renderCanvasElements(activeBoardData.elements);
            selectElement(selectedElementId);
            syncStylePanelToItem(item);
            queueSaveBoard();
        });
    });

    // Custom background color
    let lastCustomBgFrom = null;
    if (bgColorInput) {
        bgColorInput.addEventListener('focus', () => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (item) lastCustomBgFrom = getNoteStyles(item);
        });
        bgColorInput.addEventListener('input', (e) => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (!item || item.type !== 'text') return;
            if (!lastCustomBgFrom) lastCustomBgFrom = getNoteStyles(item);
            item.customBg = e.target.value;
            item.stylePreset = 'note-custom';
            const body = document.querySelector(`[data-id="${item.id}"] .note-body`);
            if (body) body.style.background = e.target.value;
            queueSaveBoard();
        });
        bgColorInput.addEventListener('change', () => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (item && lastCustomBgFrom) {
                recordAction({ type: 'STYLE_ELEMENT', id: item.id, from: lastCustomBgFrom, to: getNoteStyles(item) });
                lastCustomBgFrom = null;
            }
        });
    }

    // Font color swatches
    document.querySelectorAll('.swatch[data-font-color]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (!item || item.type !== 'text') return;
            const oldStyles = getNoteStyles(item);
            item.customColor = btn.dataset.fontColor;
            recordAction({ type: 'STYLE_ELEMENT', id: item.id, from: oldStyles, to: getNoteStyles(item) });
            const body = document.querySelector(`[data-id="${item.id}"] .note-body`);
            if (body) {
                body.style.color = item.customColor;
                const ta = body.querySelector('.editable-text');
                if (ta) ta.style.color = item.customColor;
            }
            queueSaveBoard();
        });
    });

    // Custom font color
    let lastFontColorFrom = null;
    if (fontColorInput) {
        fontColorInput.addEventListener('focus', () => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (item) lastFontColorFrom = getNoteStyles(item);
        });
        fontColorInput.addEventListener('input', (e) => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (!item || item.type !== 'text') return;
            if (!lastFontColorFrom) lastFontColorFrom = getNoteStyles(item);
            item.customColor = e.target.value;
            const body = document.querySelector(`[data-id="${item.id}"] .note-body`);
            if (body) {
                body.style.color = item.customColor;
                const ta = body.querySelector('.editable-text');
                if (ta) ta.style.color = item.customColor;
            }
            queueSaveBoard();
        });
        fontColorInput.addEventListener('change', () => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (item && lastFontColorFrom) {
                recordAction({ type: 'STYLE_ELEMENT', id: item.id, from: lastFontColorFrom, to: getNoteStyles(item) });
                lastFontColorFrom = null;
            }
        });
    }

    // Font size slider
    let lastFontSizeFrom = null;
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('mousedown', () => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (item) lastFontSizeFrom = getNoteStyles(item);
        });
        fontSizeSlider.addEventListener('input', (e) => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (!item || item.type !== 'text') return;
            if (!lastFontSizeFrom) lastFontSizeFrom = getNoteStyles(item);
            item.fontSize = parseInt(e.target.value, 10);
            if (fontSizeDisplay) fontSizeDisplay.textContent = item.fontSize + 'px';
            const body = document.querySelector(`[data-id="${item.id}"] .note-body`);
            if (body) {
                body.style.fontSize = item.fontSize + 'px';
                const ta = body.querySelector('.editable-text');
                if (ta) ta.style.fontSize = item.fontSize + 'px';
            }
            queueSaveBoard();
        });
        fontSizeSlider.addEventListener('change', () => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (item && lastFontSizeFrom) {
                recordAction({ type: 'STYLE_ELEMENT', id: item.id, from: lastFontSizeFrom, to: getNoteStyles(item) });
                lastFontSizeFrom = null;
            }
        });
    }

    // Bold toggle
    if (toggleBold) {
        toggleBold.addEventListener('click', () => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (!item || item.type !== 'text') return;
            const oldStyles = getNoteStyles(item);
            item.fontBold = !item.fontBold;
            recordAction({ type: 'STYLE_ELEMENT', id: item.id, from: oldStyles, to: getNoteStyles(item) });
            toggleBold.classList.toggle('active', !!item.fontBold);
            const body = document.querySelector(`[data-id="${item.id}"] .note-body`);
            if (body) {
                body.style.fontWeight = item.fontBold ? '700' : '';
                const ta = body.querySelector('.editable-text');
                if (ta) ta.style.fontWeight = item.fontBold ? '700' : '';
            }
            queueSaveBoard();
        });
    }

    // Italic toggle
    if (toggleItalic) {
        toggleItalic.addEventListener('click', () => {
            if (!selectedElementId || !activeBoardData) return;
            const item = activeBoardData.elements.find(it => it.id === selectedElementId);
            if (!item || item.type !== 'text') return;
            const oldStyles = getNoteStyles(item);
            item.fontItalic = !item.fontItalic;
            recordAction({ type: 'STYLE_ELEMENT', id: item.id, from: oldStyles, to: getNoteStyles(item) });
            toggleItalic.classList.toggle('active', !!item.fontItalic);
            const body = document.querySelector(`[data-id="${item.id}"] .note-body`);
            if (body) {
                body.style.fontStyle = item.fontItalic ? 'italic' : '';
                const ta = body.querySelector('.editable-text');
                if (ta) ta.style.fontStyle = item.fontItalic ? 'italic' : '';
            }
            queueSaveBoard();
        });
    }

    // --- VIEW 1: Dashboard Boards Loader ---
    const loadDashboardBoards = async () => {
        if (!currentUser) return;
        boardsGrid.innerHTML = '<div style="color: var(--mb-text-muted); font-size: 1.1rem; grid-column: 1/-1; text-align: center; padding: 2rem;">Loading moodboards...</div>';

        try {
            const boardsCol = collection(db, 'moodboards');
            const snap = await getDocs(boardsCol);
            const userBoards = [];

            snap.forEach(docSnap => {
                const data = docSnap.data();
                const trustedUsers = data.trustedUsers || [];
                const trustedEmails = (data.trustedEmails || []).map(e => e.toLowerCase());
                const userEmail = (currentUser.email || '').toLowerCase();

                // Admin sees all. Regular user sees if in trustedUsers or trustedEmails
                if (currentIsAdmin || trustedUsers.includes(currentUser.uid) || trustedEmails.includes(userEmail)) {
                    userBoards.push({ id: docSnap.id, ...data });
                }
            });

            boardsGrid.innerHTML = '';

            if (userBoards.length === 0) {
                // If admin has 0 boards, show empty notice or create first default board
                emptyBoardsNotice.classList.remove('hidden');
                return;
            } else {
                emptyBoardsNotice.classList.add('hidden');
            }

            userBoards.forEach(board => {
                const card = document.createElement('div');
                card.className = 'board-card';
                
                const elemCount = (board.elements || []).length;
                const collabsCount = (board.trustedEmails || []).length;

                card.innerHTML = `
                    <div>
                        <div class="board-card-header">
                            <h3 class="board-card-title">${escapeHtml(board.title || 'Untitled Board')}</h3>
                            <span class="board-badge ${currentIsAdmin ? 'admin-badge' : ''}">${currentIsAdmin ? 'Admin' : 'Collaborator'}</span>
                        </div>
                        <p class="board-card-desc">${escapeHtml(board.description || 'No description provided.')}</p>
                    </div>
                    <div class="board-card-footer">
                        <div class="board-card-collaborators">
                            <span class="collab-tag">${elemCount} items</span>
                            <span class="collab-tag">${collabsCount} collaborator${collabsCount === 1 ? '' : 's'}</span>
                        </div>
                        ${currentIsAdmin ? `
                            <div class="board-card-admin-actions">
                                <button class="icon-btn-small delete-board-btn" title="Delete Moodboard">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;

                // Click to open board
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-board-btn')) return;
                    openMoodboard(board.id);
                });

                // Admin delete handler
                if (currentIsAdmin) {
                    const deleteBtn = card.querySelector('.delete-board-btn');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to permanently delete the moodboard "${board.title}"?`)) {
                                try {
                                    await deleteDoc(doc(db, 'moodboards', board.id));
                                    showToast('Moodboard deleted.');
                                    loadDashboardBoards();
                                } catch (err) {
                                    console.error("Error deleting moodboard:", err);
                                    showToast('Error deleting moodboard.');
                                }
                            }
                        });
                    }
                }

                boardsGrid.appendChild(card);
            });
        } catch (err) {
            console.error("Error loading moodboards:", err);
            boardsGrid.innerHTML = '<div style="color: var(--mb-danger); grid-column: 1/-1; text-align: center; padding: 2rem;">Error loading moodboards. Please check your permissions.</div>';
        }
    };

    // --- Create Moodboard (Admin only) ---
    btnCreateBoard.addEventListener('click', () => {
        newBoardTitle.value = '';
        newBoardDesc.value = '';
        newBoardCollabs.value = '';
        openModal(modalCreateBoard);
    });

    btnSubmitCreateBoard.addEventListener('click', async () => {
        const title = newBoardTitle.value.trim();
        if (!title) {
            alert('Please enter a moodboard title.');
            return;
        }

        const description = newBoardDesc.value.trim();
        const emailsRaw = newBoardCollabs.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

        try {
            const newDocRef = doc(collection(db, 'moodboards'));
            await setDoc(newDocRef, {
                title: title,
                description: description,
                creatorUid: currentUser ? currentUser.uid : 'admin',
                creatorEmail: currentUser ? currentUser.email : '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                trustedUsers: currentUser ? [currentUser.uid] : [],
                trustedEmails: emailsRaw,
                elements: [],
                drawingPaths: []
            });

            closeModal(modalCreateBoard);
            showToast('Moodboard created!');
            openMoodboard(newDocRef.id);
        } catch (err) {
            console.error("Error creating moodboard:", err);
            showToast('Error creating moodboard.');
        }
    });

    // --- Open & Realtime Sync of a Moodboard Canvas ---
    const openMoodboard = (boardId) => {
        activeBoardId = boardId;
        document.body.classList.add('inside-board');
        dashboardView.style.display = 'none';
        canvasView.style.display = 'flex';
        undoStack = [];
        redoStack = [];
        updateUndoRedoButtons();
        selectedElementId = null;
        updateSelectionToolbar();

        // Update URL with query param ?id= to support all hosting environments
        const newUrl = boardId.startsWith('local_') ? '/moodboard/' : `/moodboard/?id=${boardId}`;
        history.pushState({ boardId }, '', newUrl);

        // Ensure settings button is always available in board view
        if (btnBoardSettings) btnBoardSettings.classList.remove('hidden');

        // Center viewport initially
        centerViewport();

        let isFirstLoadForBoard = true;

        // Listen for Realtime updates from Firestore
        if (unsubscribeBoardSnapshot) unsubscribeBoardSnapshot();
        const boardRef = doc(db, 'moodboards', boardId);

        unsubscribeBoardSnapshot = onSnapshot(boardRef, (docSnap) => {
            if (!docSnap.exists()) {
                showToast('Moodboard not found or was deleted.');
                exitBoardToDashboard();
                return;
            }

            const data = docSnap.data();
            const trustedUsers = data.trustedUsers || [];
            const trustedEmails = (data.trustedEmails || []).map(e => e.toLowerCase());
            const userEmail = (currentUser?.email || '').toLowerCase();
            const isCollaborator = currentUser && (trustedUsers.includes(currentUser.uid) || trustedEmails.includes(userEmail));
            const isCreator = currentUser && (data.creatorUid === currentUser.uid || (data.creatorEmail && data.creatorEmail.toLowerCase() === userEmail));
            const canEdit = currentIsAdmin || isCreator || isCollaborator;
            const isPublicView = !canEdit && (data.viewViaUrl === true || data.viewViaUrl === 'true');

            if (!canEdit && !isPublicView) {
                showToast('This moodboard is private. Please log in with a collaborator account.');
                exitBoardToDashboard();
                return;
            }

            activeBoardData = { id: docSnap.id, ...data };
            if (!activeBoardData.elements) activeBoardData.elements = [];
            if (!activeBoardData.drawingPaths) activeBoardData.drawingPaths = [];
            if (!activeBoardData.trustedEmails) activeBoardData.trustedEmails = [];

            activeBoardTitle.textContent = activeBoardData.title || 'Untitled Board';

            if (currentIsAdmin) {
                activeBoardRoleBadge.textContent = 'Studio Admin';
                activeBoardRoleBadge.className = 'board-badge admin-badge';
            } else if (isCreator) {
                activeBoardRoleBadge.textContent = 'Creator';
                activeBoardRoleBadge.className = 'board-badge admin-badge';
            } else if (isCollaborator) {
                activeBoardRoleBadge.textContent = 'Collaborator';
                activeBoardRoleBadge.className = 'board-badge';
            } else {
                activeBoardRoleBadge.textContent = 'Viewer (Read-Only)';
                activeBoardRoleBadge.className = 'board-badge';
            }

            // Adjust UI for Viewer (Read-Only) Mode vs Editor Mode
            const floatingToolbar = document.querySelector('.floating-toolbar');
            const undoRedoBtns = document.querySelector('.top-history-btns');
            if (isPublicView) {
                if (floatingToolbar) floatingToolbar.style.display = 'none';
                if (undoRedoBtns) undoRedoBtns.style.display = 'none';
                if (btnBoardSettings) btnBoardSettings.style.display = 'none';
                canvasViewport.classList.add('is-viewer-mode');
            } else {
                if (floatingToolbar) floatingToolbar.style.display = 'flex';
                if (undoRedoBtns) undoRedoBtns.style.display = 'flex';
                if (btnBoardSettings) btnBoardSettings.style.display = '';
                canvasViewport.classList.remove('is-viewer-mode');
            }

            renderCanvasElements(activeBoardData.elements || []);
            renderDrawingPaths(activeBoardData.drawingPaths || []);

            if (isFirstLoadForBoard) {
                isFirstLoadForBoard = false;
                setTimeout(() => {
                    fitViewToElements(activeBoardData.elements, activeBoardData.drawingPaths);
                }, 60);
            }
        }, (error) => {
            console.error("Realtime sync error:", error);
            showToast("Access denied or permission issue.");
            exitBoardToDashboard();
        });
    };

    const exitBoardToDashboard = async () => {
        if (activeBoardId && activeBoardData) {
            await cleanAndSaveBoard();
        }
        if (unsubscribeBoardSnapshot) {
            unsubscribeBoardSnapshot();
            unsubscribeBoardSnapshot = null;
        }
        document.body.classList.remove('inside-board');
        activeBoardId = null;
        activeBoardData = null;
        selectedElementIds.clear();
        selectedElementId = null;
        updateSelectionToolbar();
        canvasView.style.display = 'none';
        dashboardView.style.display = 'flex';
        history.pushState({}, '', '/moodboard/');
        if (currentUser) {
            loadDashboardBoards();
        }
    };

    btnBackToDashboard.addEventListener('click', exitBoardToDashboard);

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        const state = e.state;
        if (state && state.boardId) {
            openMoodboard(state.boardId);
        } else {
            exitBoardToDashboard();
        }
    });

    // --- Touch gesture state for mobile pinch zoom & two-finger pan ---
    let activeTouches = new Map();
    let initialPinchDistance = null;
    let initialPinchScale = 1.0;
    let initialPinchCenter = { x: 0, y: 0 };
    let lastTouchCenter = null;

    // --- Canvas Viewport Navigation (Pan & Zoom) ---
    const updateViewportTransform = () => {
        canvasWorld.style.transform = `translate(${viewportPanX}px, ${viewportPanY}px) scale(${viewportScale})`;
        hudZoomDisplay.textContent = `${Math.round(viewportScale * 100)}%`;
        if (typeof updateEraserCursor === 'function') {
            updateEraserCursor();
        }
    };

    const centerViewport = () => {
        const vpRect = canvasViewport.getBoundingClientRect();
        viewportScale = 1.0;
        // Center the 6000x6000 world in the middle of the screen
        viewportPanX = (vpRect.width / 2) - 3000;
        viewportPanY = (vpRect.height / 2) - 3000;
        updateViewportTransform();
    };

    // Auto-fit & zoom out to view all existing elements and drawings
    const fitViewToElements = (elements = [], drawingPaths = []) => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let count = 0;

        if (elements && elements.length > 0) {
            elements.forEach(el => {
                const ex = el.x !== undefined ? el.x : 0;
                const ey = el.y !== undefined ? el.y : 0;
                const ew = el.width || 240;
                const eh = el.height || 200;
                minX = Math.min(minX, ex);
                minY = Math.min(minY, ey);
                maxX = Math.max(maxX, ex + ew);
                maxY = Math.max(maxY, ey + eh);
                count++;
            });
        }

        if (drawingPaths && drawingPaths.length > 0) {
            drawingPaths.forEach(path => {
                (path.points || []).forEach(pt => {
                    minX = Math.min(minX, pt.x);
                    minY = Math.min(minY, pt.y);
                    maxX = Math.max(maxX, pt.x);
                    maxY = Math.max(maxY, pt.y);
                    count++;
                });
            });
        }

        if (count === 0 || !isFinite(minX) || !isFinite(minY)) {
            centerViewport();
            return;
        }

        const vpRect = canvasViewport.getBoundingClientRect();
        const vpWidth = Math.max(300, vpRect.width || window.innerWidth);
        const vpHeight = Math.max(300, vpRect.height || window.innerHeight);

        const contentW = Math.max(150, maxX - minX);
        const contentH = Math.max(150, maxY - minY);

        // Generous padding around the content (12% or 80px)
        const padX = Math.max(80, vpWidth * 0.12);
        const padY = Math.max(80, vpHeight * 0.12);

        const scaleX = (vpWidth - padX * 2) / contentW;
        const scaleY = (vpHeight - padY * 2) / contentH;

        // Auto zoom out to show everything, but don't overzoom (max 1.0x, min 0.15x)
        const fitScale = Math.max(0.15, Math.min(1.0, Math.min(scaleX, scaleY)));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        viewportScale = fitScale;
        viewportPanX = (vpWidth / 2) - (centerX * fitScale);
        viewportPanY = (vpHeight / 2) - (centerY * fitScale);

        updateViewportTransform();
    };

    const zoomAroundPoint = (screenX, screenY, newScale) => {
        newScale = Math.max(0.2, Math.min(3.5, newScale));
        const rect = canvasViewport.getBoundingClientRect();
        const mouseX = screenX - rect.left;
        const mouseY = screenY - rect.top;

        viewportPanX = mouseX - (mouseX - viewportPanX) * (newScale / viewportScale);
        viewportPanY = mouseY - (mouseY - viewportPanY) * (newScale / viewportScale);
        viewportScale = newScale;
        updateViewportTransform();
    };

    hudZoomIn.addEventListener('click', () => {
        const rect = canvasViewport.getBoundingClientRect();
        zoomAroundPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, viewportScale + 0.2);
    });
    hudZoomOut.addEventListener('click', () => {
        const rect = canvasViewport.getBoundingClientRect();
        zoomAroundPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, viewportScale - 0.2);
    });
    hudResetView.addEventListener('click', () => {
        if (activeBoardData && ((activeBoardData.elements || []).length > 0 || (activeBoardData.drawingPaths || []).length > 0)) {
            fitViewToElements(activeBoardData.elements, activeBoardData.drawingPaths);
        } else {
            centerViewport();
        }
    });

    // Mouse wheel zoom directly with wheel or pinch trackpad
    canvasViewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.ctrlKey ? -e.deltaY * 0.015 : -Math.sign(e.deltaY) * 0.12;
        const targetScale = viewportScale + zoomDelta;
        zoomAroundPoint(e.clientX, e.clientY, targetScale);
    }, { passive: false });

    // Touch & Pinch-to-zoom and Two-Finger Pan on Mobile / Tablets
    const handleTouchStartGlobal = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
        }

        if (activeTouches.size >= 2) {
            // Cancel marquee selection immediately
            if (isMarqueeSelecting) {
                isMarqueeSelecting = false;
                if (selectionMarquee) selectionMarquee.classList.remove('active');
            }
            // Cancel any element drag or transform immediately
            if (isDraggingElement) isDraggingElement = false;
            if (isTransformingElement) isTransformingElement = false;
            if (isDrawingStroke) endStroke();

            // Deselect any selected note or image during 2-finger camera gesture
            deselectAll();

            const [t1, t2] = Array.from(activeTouches.values());
            initialPinchDistance = Math.hypot(t2.x - t1.x, t2.y - t1.y);
            initialPinchScale = viewportScale;
            initialPinchCenter = { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };
            lastTouchCenter = { ...initialPinchCenter };
        }
    };

    canvasViewport.addEventListener('touchstart', handleTouchStartGlobal, { passive: false });
    window.addEventListener('touchstart', handleTouchStartGlobal, { passive: true });

    canvasViewport.addEventListener('touchmove', (e) => {
        if (activeTouches.size >= 2) {
            // Guarantee marquee box and element selection are never active during 2-finger gestures
            if (isMarqueeSelecting) {
                isMarqueeSelecting = false;
                if (selectionMarquee) selectionMarquee.classList.remove('active');
            }
            if (isDraggingElement) isDraggingElement = false;
            if (isTransformingElement) isTransformingElement = false;

            if (initialPinchDistance && e.touches.length >= 2) {
                e.preventDefault();
                const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
                const currentDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
                const currentCenter = { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };

                // Two-finger Pan
                if (lastTouchCenter) {
                    const panDx = currentCenter.x - lastTouchCenter.x;
                    const panDy = currentCenter.y - lastTouchCenter.y;
                    viewportPanX += panDx;
                    viewportPanY += panDy;
                }
                lastTouchCenter = { ...currentCenter };

                // Two-finger Zoom
                const scaleFactor = currentDist / initialPinchDistance;
                const newScale = Math.max(0.2, Math.min(3.5, initialPinchScale * scaleFactor));
                zoomAroundPoint(currentCenter.x, currentCenter.y, newScale);
            }
        }
    }, { passive: false });

    const handleTouchEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            activeTouches.delete(e.changedTouches[i].identifier);
        }
        if (activeTouches.size < 2) {
            initialPinchDistance = null;
            lastTouchCenter = null;
        }
    };
    canvasViewport.addEventListener('touchend', handleTouchEnd);
    canvasViewport.addEventListener('touchcancel', handleTouchEnd);

    // Viewport Panning Drag (Middle click, Spacebar + Click, or Move Tool)
    let isSpacePressed = false;
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            isSpacePressed = true;
            canvasViewport.classList.add('is-panning');
        }
        // Keyboard Shortcuts (skip when typing in text fields)
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        // Undo / Redo
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' || e.key === 'Z') {
                if (e.shiftKey) {
                    // Ctrl+Shift+Z = Redo
                    if (btnRedoAction && !btnRedoAction.disabled) btnRedoAction.click();
                } else {
                    // Ctrl+Z = Undo
                    if (btnUndoAction && !btnUndoAction.disabled) btnUndoAction.click();
                }
                e.preventDefault();
                return;
            }
            if (e.key === 'y' || e.key === 'Y') {
                if (btnRedoAction && !btnRedoAction.disabled) btnRedoAction.click();
                e.preventDefault();
                return;
            }
        }

        if (e.key === 'v' || e.key === 'V') setTool('select');
        if (e.key === 'h' || e.key === 'H' || e.key === 'm' || e.key === 'M') setTool('move');
        if (e.key === 'p' || e.key === 'P') setTool('pen');
        if (e.key === 'e' || e.key === 'E') setTool('eraser');
        if (e.key === 't' || e.key === 'T') addNewTextElement();
        if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteSelectedElements();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            isSpacePressed = false;
            if (activeTool !== 'move') canvasViewport.classList.remove('is-panning');
        }
    });

    // Helper: Convert Screen coords to Canvas World coords
    const screenToWorld = (screenX, screenY) => {
        const rect = canvasViewport.getBoundingClientRect();
        const xInViewport = screenX - rect.left;
        const yInViewport = screenY - rect.top;
        return {
            x: (xInViewport - viewportPanX) / viewportScale,
            y: (yInViewport - viewportPanY) / viewportScale
        };
    };

    // --- Eraser Visual Cursor Ring Tracking ---
    let lastPointerPos = null;
    const updateEraserCursor = (e) => {
        if (!eraserCursor) return;
        if (activeTool !== 'eraser') {
            eraserCursor.classList.remove('visible');
            return;
        }
        if (e) {
            lastPointerPos = { clientX: e.clientX, clientY: e.clientY };
        }
        if (lastPointerPos) {
            const rect = canvasViewport.getBoundingClientRect();
            if (lastPointerPos.clientX < rect.left || lastPointerPos.clientX > rect.right ||
                lastPointerPos.clientY < rect.top || lastPointerPos.clientY > rect.bottom) {
                eraserCursor.classList.remove('visible');
                return;
            }
            const x = lastPointerPos.clientX - rect.left;
            const y = lastPointerPos.clientY - rect.top;
            const screenDiameter = Math.max(10, eraserSize * viewportScale);
            eraserCursor.style.left = `${x}px`;
            eraserCursor.style.top = `${y}px`;
            eraserCursor.style.width = `${screenDiameter}px`;
            eraserCursor.style.height = `${screenDiameter}px`;
            eraserCursor.classList.add('visible');
        }
    };

    // Track pointer movement across viewport and window for smooth continuous eraser circle display
    window.addEventListener('pointermove', (e) => {
        if (activeTool === 'eraser' && !isPanning) {
            updateEraserCursor(e);
        }
    });

    canvasViewport.addEventListener('pointerleave', () => {
        if (eraserCursor) eraserCursor.classList.remove('visible');
    });

    canvasViewport.addEventListener('pointerenter', (e) => {
        if (activeTool === 'eraser' && !isPanning) {
            updateEraserCursor(e);
        }
    });

    // Prevent default middle click autoscroll in browsers
    window.addEventListener('auxclick', (e) => {
        if (e.button === 1) e.preventDefault();
    });

    // --- Toolbar & Tool Selection ---
    const setTool = (tool) => {
        activeTool = tool;
        [toolSelect, toolMove, toolPen, toolEraser].filter(Boolean).forEach(b => b.classList.remove('active'));
        canvasViewport.classList.remove('is-drawing', 'is-eraser-active', 'is-move-tool');
        drawingCanvas.classList.remove('drawing-active');
        if (eraserCursor) eraserCursor.classList.remove('visible');

        if (tool === 'select') {
            if (toolSelect) toolSelect.classList.add('active');
            if (penOptionsDrawer) penOptionsDrawer.classList.remove('show');
            if (eraserOptionsDrawer) eraserOptionsDrawer.classList.remove('show');
        } else if (tool === 'move') {
            if (toolMove) toolMove.classList.add('active');
            canvasViewport.classList.add('is-move-tool');
            if (penOptionsDrawer) penOptionsDrawer.classList.remove('show');
            if (eraserOptionsDrawer) eraserOptionsDrawer.classList.remove('show');
            deselectAll();
        } else if (tool === 'pen') {
            if (toolPen) toolPen.classList.add('active');
            if (penOptionsDrawer) penOptionsDrawer.classList.add('show');
            if (eraserOptionsDrawer) eraserOptionsDrawer.classList.remove('show');
            canvasViewport.classList.add('is-drawing');
            drawingCanvas.classList.add('drawing-active');
            deselectAll();
        } else if (tool === 'eraser') {
            if (toolEraser) toolEraser.classList.add('active');
            if (penOptionsDrawer) penOptionsDrawer.classList.remove('show');
            if (eraserOptionsDrawer) eraserOptionsDrawer.classList.add('show');
            canvasViewport.classList.add('is-drawing', 'is-eraser-active');
            drawingCanvas.classList.add('drawing-active');
            deselectAll();
            updateEraserCursor();
        }
    };

    if (toolSelect) toolSelect.addEventListener('click', () => setTool('select'));
    if (toolMove) toolMove.addEventListener('click', () => setTool('move'));
    if (toolPen) toolPen.addEventListener('click', () => setTool('pen'));
    if (toolEraser) toolEraser.addEventListener('click', () => setTool('eraser'));

    // Pen colors & brush sizes
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
            dot.classList.add('selected');
            penColor = dot.dataset.color;
        });
    });

    document.querySelectorAll('.size-pill:not(.eraser-size-pill)').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.size-pill:not(.eraser-size-pill)').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            penSize = parseInt(pill.dataset.size, 10);
        });
    });

    // Eraser size presets & slider
    document.querySelectorAll('.eraser-size-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.eraser-size-pill').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            eraserSize = parseInt(pill.dataset.eraserSize, 10);
            if (eraserSizeSlider) eraserSizeSlider.value = eraserSize;
            if (eraserSizeDisplay) eraserSizeDisplay.textContent = `${eraserSize}px`;
            updateEraserCursor();
        });
    });

    if (eraserSizeSlider) {
        eraserSizeSlider.addEventListener('input', (e) => {
            eraserSize = parseInt(e.target.value, 10);
            if (eraserSizeDisplay) eraserSizeDisplay.textContent = `${eraserSize}px`;
            document.querySelectorAll('.eraser-size-pill').forEach(p => {
                p.classList.toggle('selected', parseInt(p.dataset.eraserSize, 10) === eraserSize);
            });
            updateEraserCursor();
        });
    }

    // Clear Drawings
    btnClearDrawing.addEventListener('click', async () => {
        if (!activeBoardData) {
            activeBoardData = getOrCreateLocalBoard();
            activeBoardId = activeBoardData.id;
        }
        if ((activeBoardData.drawingPaths || []).length === 0) return;
        if (confirm('Clear all freehand ink sketches on this moodboard?')) {
            const cleared = [ ...(activeBoardData.drawingPaths || []) ];
            activeBoardData.drawingPaths = [];
            renderDrawingPaths([]);
            recordAction({ type: 'CLEAR_DRAWINGS', paths: cleared });
            await queueSaveBoard();
            showToast('Drawing layer cleared.');
        }
    });

    // --- Freehand Pen & Eraser Drawing Layer ---
    const startStroke = (e) => {
        if (activeTool !== 'pen' && activeTool !== 'eraser') return;
        isDrawingStroke = true;
        const pos = screenToWorld(e.clientX, e.clientY);
        currentStrokePoints = [pos];

        drawingCtx.beginPath();
        drawingCtx.moveTo(pos.x, pos.y);
        drawingCtx.lineCap = 'round';
        drawingCtx.lineJoin = 'round';

        if (activeTool === 'eraser') {
            drawingCtx.globalCompositeOperation = 'destination-out';
            drawingCtx.lineWidth = eraserSize;
        } else {
            drawingCtx.globalCompositeOperation = 'source-over';
            drawingCtx.strokeStyle = penColor;
            drawingCtx.lineWidth = penSize;
        }
    };

    const drawStroke = (e) => {
        if (!isDrawingStroke) return;
        const pos = screenToWorld(e.clientX, e.clientY);
        currentStrokePoints.push(pos);

        drawingCtx.lineTo(pos.x, pos.y);
        drawingCtx.stroke();
    };

    const endStroke = async () => {
        if (!isDrawingStroke) return;
        isDrawingStroke = false;

        if (currentStrokePoints.length > 1) {
            if (!activeBoardData) {
                activeBoardData = getOrCreateLocalBoard();
                activeBoardId = activeBoardData.id;
            }
            const newPath = {
                id: 'path_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                points: currentStrokePoints,
                color: penColor,
                size: activeTool === 'eraser' ? eraserSize : penSize,
                isEraser: activeTool === 'eraser'
            };

            if (!activeBoardData.drawingPaths) activeBoardData.drawingPaths = [];
            activeBoardData.drawingPaths.push(newPath);
            recordAction({ type: 'DRAW_STROKE', path: { ...newPath } });
            await queueSaveBoard();
        }
        currentStrokePoints = [];
    };

    // Geometry Helpers for Vector Drawing Selection & Transforms
    function distToSegment(p, v, w) {
        const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    function hitTestDrawingPath(worldPos, path) {
        if (!path || !path.points || path.points.length < 2 || path.isEraser) return false;
        const threshold = Math.max(10, (path.size || 6) / 2 + 8);
        for (let i = 0; i < path.points.length - 1; i++) {
            if (distToSegment(worldPos, path.points[i], path.points[i + 1]) <= threshold) {
                return true;
            }
        }
        return false;
    }

    function getPathBoundingBox(path) {
        if (!path || !path.points || path.points.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        path.points.forEach(pt => {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
        });
        const pad = Math.max(6, (path.size || 6) / 2 + 4);
        return {
            x: Math.round(minX - pad),
            y: Math.round(minY - pad),
            width: Math.max(24, Math.round(maxX - minX + pad * 2)),
            height: Math.max(24, Math.round(maxY - minY + pad * 2)),
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2
        };
    }

    // Render all saved drawing paths onto canvas
    const renderDrawingPaths = (paths) => {
        if (!drawingCtx) return;
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

        (paths || []).forEach(path => {
            if (!path.points || path.points.length < 2) return;
            drawingCtx.beginPath();
            drawingCtx.moveTo(path.points[0].x, path.points[0].y);
            drawingCtx.lineCap = 'round';
            drawingCtx.lineJoin = 'round';

            if (path.isEraser) {
                drawingCtx.globalCompositeOperation = 'destination-out';
                drawingCtx.lineWidth = path.size || 30;
            } else {
                drawingCtx.globalCompositeOperation = 'source-over';
                drawingCtx.strokeStyle = path.color || '#38bdf8';
                drawingCtx.lineWidth = path.size || 6;
            }

            for (let i = 1; i < path.points.length; i++) {
                drawingCtx.lineTo(path.points[i].x, path.points[i].y);
            }
            drawingCtx.stroke();
        });
    };

    // Pointer events on Canvas Viewport
    canvasViewport.addEventListener('pointerdown', (e) => {
        // Quick pull with mouse wheel hold (button 1) on PC: switch to pan, switch back on let go
        if (e.button === 1) {
            e.preventDefault();
            isMiddleMousePanning = true;
            previousToolBeforePan = activeTool;
            isPanning = true;
            panStartX = e.clientX - viewportPanX;
            panStartY = e.clientY - viewportPanY;
            canvasViewport.classList.add('is-panning');
            // Visually highlight Move tool in floating toolbar
            [toolSelect, toolMove, toolPen, toolEraser].filter(Boolean).forEach(b => b.classList.remove('active'));
            if (toolMove) toolMove.classList.add('active');
            if (eraserCursor) eraserCursor.classList.remove('visible');
            return;
        }

        // If clicking background/canvas/elements-container directly
        const isBackground = e.target === canvasViewport || e.target === drawingCanvas || e.target === elementsContainer || e.target === canvasWorld;
        
        if (isSpacePressed || activeTool === 'move' || (activeTool === 'select' && isBackground && e.button !== 0)) {
            // Start Panning
            isPanning = true;
            panStartX = e.clientX - viewportPanX;
            panStartY = e.clientY - viewportPanY;
            canvasViewport.classList.add('is-panning');
        } else if (activeTool === 'select' && isBackground && e.button === 0) {
            if (activeTouches.size >= 2) {
                return; // Never start marquee if 2 fingers are touching
            }

            const worldPos = screenToWorld(e.clientX, e.clientY);

            // Test if clicked directly on a vector drawing stroke
            const hitPath = (activeBoardData?.drawingPaths || []).slice().reverse().find(p => !p.isEraser && hitTestDrawingPath(worldPos, p));
            if (hitPath) {
                if (!selectedElementIds.has(hitPath.id)) {
                    if (e.shiftKey) {
                        selectedElementIds.add(hitPath.id);
                    } else {
                        deselectAll();
                        selectedElementIds.add(hitPath.id);
                    }
                    selectedElementId = hitPath.id;
                    updateSelectedDOM();
                    updateSelectionToolbar();
                }
                startElementDrag({ id: hitPath.id, isDrawing: true }, e);
                return;
            }

            // Start Box / Marquee Area Selection
            isMarqueeSelecting = true;
            const vpRect = canvasViewport.getBoundingClientRect();
            marqueeScreenStart = { x: e.clientX - vpRect.left, y: e.clientY - vpRect.top };
            marqueeWorldStart = screenToWorld(e.clientX, e.clientY);

            if (!e.shiftKey) {
                deselectAll();
            }

            if (selectionMarquee) {
                selectionMarquee.style.left = `${marqueeScreenStart.x}px`;
                selectionMarquee.style.top = `${marqueeScreenStart.y}px`;
                selectionMarquee.style.width = '0px';
                selectionMarquee.style.height = '0px';
                selectionMarquee.classList.remove('active');
            }

            try {
                if (canvasViewport.setPointerCapture) {
                    canvasViewport.setPointerCapture(e.pointerId);
                }
            } catch (_) {}
        } else if (activeTool === 'pen' || activeTool === 'eraser') {
            startStroke(e);
        }
    });

    window.addEventListener('pointermove', (e) => {
        if (isPanning) {
            viewportPanX = e.clientX - panStartX;
            viewportPanY = e.clientY - panStartY;
            updateViewportTransform();
        } else if (isMarqueeSelecting) {
            if (activeTouches.size >= 2) {
                isMarqueeSelecting = false;
                if (selectionMarquee) selectionMarquee.classList.remove('active');
                return;
            }

            const vpRect = canvasViewport.getBoundingClientRect();
            const currentScreenX = e.clientX - vpRect.left;
            const currentScreenY = e.clientY - vpRect.top;

            const left = Math.min(marqueeScreenStart.x, currentScreenX);
            const top = Math.min(marqueeScreenStart.y, currentScreenY);
            const width = Math.abs(currentScreenX - marqueeScreenStart.x);
            const height = Math.abs(currentScreenY - marqueeScreenStart.y);

            // Require minimum drag threshold (5px) before showing marquee and selecting items
            if (width > 5 || height > 5) {
                if (selectionMarquee) {
                    selectionMarquee.style.left = `${left}px`;
                    selectionMarquee.style.top = `${top}px`;
                    selectionMarquee.style.width = `${width}px`;
                    selectionMarquee.style.height = `${height}px`;
                    selectionMarquee.classList.add('active');
                }

                // World bounding box for intersection test
                const currentWorld = screenToWorld(e.clientX, e.clientY);
                const wMinX = Math.min(marqueeWorldStart.x, currentWorld.x);
                const wMaxX = Math.max(marqueeWorldStart.x, currentWorld.x);
                const wMinY = Math.min(marqueeWorldStart.y, currentWorld.y);
                const wMaxY = Math.max(marqueeWorldStart.y, currentWorld.y);

                if (!e.shiftKey) selectedElementIds.clear();

                // Check DOM elements (photos, notes)
                (activeBoardData?.elements || []).forEach(it => {
                    const itemRight = it.x + (it.width || 100);
                    const itemBottom = it.y + (it.height || 100);
                    const touches = it.x < wMaxX && itemRight > wMinX && it.y < wMaxY && itemBottom > wMinY;
                    if (touches) {
                        selectedElementIds.add(it.id);
                    }
                });

                // Check Vector Drawing strokes
                (activeBoardData?.drawingPaths || []).forEach(path => {
                    if (path.isEraser) return;
                    const box = getPathBoundingBox(path);
                    if (!box) return;
                    const touches = box.x < wMaxX && (box.x + box.width) > wMinX && box.y < wMaxY && (box.y + box.height) > wMinY;
                    if (touches) {
                        selectedElementIds.add(path.id);
                    }
                });

                selectedElementId = selectedElementIds.size > 0 ? Array.from(selectedElementIds)[0] : null;
                updateSelectedDOM();
            }
        } else if (isDrawingStroke) {
            drawStroke(e);
        } else if (isDraggingElement) {
            handleElementDragMove(e);
        } else if (isTransformingElement) {
            handleElementTransformMove(e);
        }
    });

    const handlePointerEnd = (e) => {
        try {
            if (e && canvasViewport.releasePointerCapture) {
                canvasViewport.releasePointerCapture(e.pointerId);
            }
        } catch (_) {}

        if (isMiddleMousePanning) {
            isMiddleMousePanning = false;
            isPanning = false;
            canvasViewport.classList.remove('is-panning');
            if (previousToolBeforePan) {
                setTool(previousToolBeforePan);
                previousToolBeforePan = null;
            }
        }
        if (isPanning) {
            isPanning = false;
            if (!isSpacePressed && activeTool !== 'move') canvasViewport.classList.remove('is-panning');
        }
        if (isMarqueeSelecting) {
            isMarqueeSelecting = false;
            if (selectionMarquee) selectionMarquee.classList.remove('active');
            updateSelectionToolbar();
        }
        if (isDrawingStroke) endStroke();
        if (isDraggingElement) endElementDrag();
        if (isTransformingElement) endElementTransform();
    };

    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    // Render interactive selection boxes for selected vector drawing strokes
    const updateDrawingSelectionBoxes = () => {
        document.querySelectorAll('.board-element-drawing').forEach(el => el.remove());

        selectedElementIds.forEach(id => {
            const path = activeBoardData?.drawingPaths?.find(p => p.id === id);
            if (!path || !path.points || path.points.length === 0) return;
            const box = getPathBoundingBox(path);
            if (!box) return;

            const el = document.createElement('div');
            el.className = 'board-element board-element-drawing is-selected';
            el.dataset.id = path.id;
            el.style.left = `${box.x}px`;
            el.style.top = `${box.y}px`;
            el.style.width = `${box.width}px`;
            el.style.height = `${box.height}px`;
            el.style.zIndex = 30;

            el.innerHTML = `
                <div class="transform-handle handle-nw" data-handle="nw"></div>
                <div class="transform-handle handle-ne" data-handle="ne"></div>
                <div class="transform-handle handle-se" data-handle="se"></div>
                <div class="transform-handle handle-sw" data-handle="sw"></div>
                <div class="transform-handle handle-rotate" data-handle="rotate"></div>
            `;

            el.addEventListener('pointerdown', (e) => {
                if (activeTool !== 'select') return;
                if (activeTouches.size >= 2 || (e.pointerType === 'touch' && activeTouches.size > 1)) return;

                const handle = e.target.closest('.transform-handle');
                if (handle) {
                    e.stopPropagation();
                    startElementTransform({ id: path.id, isDrawing: true, ...box }, handle.dataset.handle, e);
                    return;
                }

                e.stopPropagation();
                if (!selectedElementIds.has(path.id)) {
                    selectElement(path.id, e.shiftKey);
                }
                startElementDrag({ id: path.id, isDrawing: true }, e);
            });

            elementsContainer.appendChild(el);
        });
    };

    // --- DOM Elements Rendering & Freeform Transforms ---
    const renderCanvasElements = (elements) => {
        const activeEl = document.activeElement;
        const isEditingText = activeEl && activeEl.classList.contains('editable-text');
        const activeEditingId = isEditingText && activeEl.closest('.board-element') ? 
            activeEl.closest('.board-element').dataset.id : null;
        const cursorSelectionStart = isEditingText ? activeEl.selectionStart : null;
        const cursorSelectionEnd = isEditingText ? activeEl.selectionEnd : null;

        elementsContainer.innerHTML = '';

        (elements || []).forEach(item => {
            const el = document.createElement('div');
            el.className = `board-element ${selectedElementIds.has(item.id) || item.id === selectedElementId ? 'is-selected' : ''}`;
            el.dataset.id = item.id;
            el.style.left = `${item.x}px`;
            el.style.top = `${item.y}px`;
            el.style.width = `${item.width}px`;
            el.style.height = `${item.height}px`;
            el.style.transform = `rotate(${item.rotation || 0}deg)`;
            el.style.zIndex = item.zIndex || 10;

            // Content type render
            if (item.type === 'image') {
                el.classList.add('board-element-image');
                el.innerHTML = `
                    <div class="img-inner" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        <img src="${escapeHtml(item.content)}" alt="Moodboard image" style="width:100%; height:100%; object-fit:contain; pointer-events:none; display:block;" loading="lazy">
                    </div>
                    <div class="transform-handle handle-nw" data-handle="nw"></div>
                    <div class="transform-handle handle-ne" data-handle="ne"></div>
                    <div class="transform-handle handle-se" data-handle="se"></div>
                    <div class="transform-handle handle-sw" data-handle="sw"></div>
                    <div class="transform-handle handle-rotate" data-handle="rotate"></div>
                `;
            } else if (item.type === 'text') {
                const preset = item.stylePreset || 'note-dark';
                el.classList.add('board-element-text');

                const bodyBg = item.customBg || '';
                const bodyColor = item.customColor || '';
                const bodyFontSize = item.fontSize ? `${item.fontSize}px` : '';
                const bodyFontWeight = item.fontBold ? '700' : '';
                const bodyFontStyle = item.fontItalic ? 'italic' : '';

                const presetClass = (preset !== 'note-custom') ? preset : '';

                el.innerHTML = `
                    <div class="note-body ${presetClass}"
                         style="${bodyBg ? 'background:'+bodyBg+';' : ''}${bodyColor ? 'color:'+bodyColor+';' : ''}${bodyFontSize ? 'font-size:'+bodyFontSize+';' : ''}${bodyFontWeight ? 'font-weight:'+bodyFontWeight+';' : ''}${bodyFontStyle ? 'font-style:'+bodyFontStyle+';' : ''}">
                        <textarea class="editable-text" placeholder="Type notes or labels..."></textarea>
                    </div>
                    <div class="transform-handle handle-nw" data-handle="nw"></div>
                    <div class="transform-handle handle-ne" data-handle="ne"></div>
                    <div class="transform-handle handle-se" data-handle="se"></div>
                    <div class="transform-handle handle-sw" data-handle="sw"></div>
                    <div class="transform-handle handle-rotate" data-handle="rotate"></div>
                `;

                const textarea = el.querySelector('.editable-text');
                textarea.value = item.content || '';

                if (bodyColor) textarea.style.color = bodyColor;
                if (bodyFontSize) textarea.style.fontSize = bodyFontSize;
                if (bodyFontWeight) textarea.style.fontWeight = bodyFontWeight;
                if (bodyFontStyle) textarea.style.fontStyle = bodyFontStyle;

                let initialTextContent = null;
                textarea.addEventListener('focus', () => {
                    initialTextContent = textarea.value;
                });
                textarea.addEventListener('blur', () => {
                    if (initialTextContent !== null && initialTextContent !== textarea.value) {
                        recordAction({
                            type: 'TEXT_CHANGE',
                            id: item.id,
                            from: initialTextContent,
                            to: textarea.value
                        });
                        initialTextContent = null;
                    }
                });

                textarea.addEventListener('input', () => {
                    item.content = textarea.value;
                    queueSaveBoard();
                });
            }

            // Selection & Drag Initiation
            el.addEventListener('pointerdown', (e) => {
                if (activeTool !== 'select') return;
                if (activeTouches.size >= 2 || (e.pointerType === 'touch' && activeTouches.size > 1)) {
                    return;
                }
                
                const handle = e.target.closest('.transform-handle');
                if (handle) {
                    e.stopPropagation();
                    startElementTransform(item, handle.dataset.handle, e);
                    return;
                }

                if (['TEXTAREA', 'BUTTON', 'INPUT'].includes(e.target.tagName)) {
                    if (activeTouches.size < 2) {
                        selectElement(item.id, e.shiftKey);
                    }
                    return;
                }

                e.stopPropagation();
                // If item is not part of existing selection, select it
                if (!selectedElementIds.has(item.id)) {
                    selectElement(item.id, e.shiftKey);
                }
                startElementDrag(item, e);
            });

            elementsContainer.appendChild(el);
        });

        // Also render drawing selection boxes
        updateDrawingSelectionBoxes();

        // Exact cursor and focus restoration
        if (activeEditingId) {
            const el = elementsContainer.querySelector(`[data-id="${activeEditingId}"] textarea`);
            if (el) {
                el.focus();
                if (cursorSelectionStart !== null && cursorSelectionEnd !== null) {
                    el.setSelectionRange(cursorSelectionStart, cursorSelectionEnd);
                }
            }
        }
    };

    const updateSelectedDOM = () => {
        document.querySelectorAll('.board-element:not(.board-element-drawing)').forEach(el => {
            const isSel = selectedElementIds.has(el.dataset.id) || el.dataset.id === selectedElementId;
            el.classList.toggle('is-selected', isSel);
        });
        updateDrawingSelectionBoxes();
    };

    const selectElement = (id, addToSelection = false) => {
        if (activeTouches.size >= 2) return;
        if (!addToSelection) {
            selectedElementIds.clear();
        }
        if (id) {
            selectedElementIds.add(id);
        }
        selectedElementId = id || (selectedElementIds.size > 0 ? Array.from(selectedElementIds)[0] : null);
        updateSelectedDOM();
        updateSelectionToolbar();
    };

    const deselectAll = () => {
        selectedElementIds.clear();
        selectedElementId = null;
        updateSelectedDOM();
        updateSelectionToolbar();
    };

    const deselectElement = deselectAll;

    // Multi-Element & Drawing Drag Handling
    let dragItemInitialPositions = new Map();
    let dragPathInitialPoints = new Map();

    const startElementDrag = (item, e) => {
        if (activeTouches.size >= 2) return;
        isDraggingElement = true;

        if (!selectedElementIds.has(item.id)) {
            if (e.shiftKey) {
                selectedElementIds.add(item.id);
            } else {
                selectedElementIds.clear();
                selectedElementIds.add(item.id);
            }
            selectedElementId = item.id;
            updateSelectedDOM();
            updateSelectionToolbar();
        }

        const worldPos = screenToWorld(e.clientX, e.clientY);
        dragStartX = worldPos.x;
        dragStartY = worldPos.y;

        dragItemInitialPositions.clear();
        dragPathInitialPoints.clear();

        selectedElementIds.forEach(id => {
            const elItem = activeBoardData?.elements.find(it => it.id === id);
            if (elItem) {
                dragItemInitialPositions.set(id, { x: elItem.x, y: elItem.y });
            }
            const pathItem = activeBoardData?.drawingPaths.find(p => p.id === id);
            if (pathItem && pathItem.points) {
                dragPathInitialPoints.set(id, pathItem.points.map(pt => ({ x: pt.x, y: pt.y })));
            }
        });
    };

    const handleElementDragMove = (e) => {
        if (activeTouches.size >= 2) {
            isDraggingElement = false;
            return;
        }
        if (!isDraggingElement || (dragItemInitialPositions.size === 0 && dragPathInitialPoints.size === 0) || !activeBoardData) return;
        const worldPos = screenToWorld(e.clientX, e.clientY);
        const dx = Math.round(worldPos.x - dragStartX);
        const dy = Math.round(worldPos.y - dragStartY);

        // Move DOM elements
        dragItemInitialPositions.forEach((startPos, id) => {
            const item = activeBoardData.elements.find(it => it.id === id);
            if (item) {
                item.x = startPos.x + dx;
                item.y = startPos.y + dy;
                const el = elementsContainer.querySelector(`[data-id="${id}"]`);
                if (el) {
                    el.style.left = `${item.x}px`;
                    el.style.top = `${item.y}px`;
                }
            }
        });

        // Move Drawing Strokes
        dragPathInitialPoints.forEach((initialPts, id) => {
            const path = activeBoardData.drawingPaths.find(p => p.id === id);
            if (path) {
                path.points = initialPts.map(pt => ({
                    x: Math.round(pt.x + dx),
                    y: Math.round(pt.y + dy)
                }));
            }
        });

        if (dragPathInitialPoints.size > 0) {
            renderDrawingPaths(activeBoardData.drawingPaths);
            updateDrawingSelectionBoxes();
        }
    };

    const endElementDrag = () => {
        if (!isDraggingElement) return;
        isDraggingElement = false;
        if ((dragItemInitialPositions.size > 0 || dragPathInitialPoints.size > 0) && activeBoardData) {
            const moves = [];
            dragItemInitialPositions.forEach((startPos, id) => {
                const item = activeBoardData.elements.find(it => it.id === id);
                if (item && (item.x !== startPos.x || item.y !== startPos.y)) {
                    moves.push({
                        id: id,
                        isDrawing: false,
                        from: { ...startPos },
                        to: { x: item.x, y: item.y }
                    });
                }
            });
            dragPathInitialPoints.forEach((initialPts, id) => {
                const path = activeBoardData.drawingPaths.find(p => p.id === id);
                if (path) {
                    moves.push({
                        id: id,
                        isDrawing: true,
                        fromPoints: initialPts,
                        toPoints: path.points.map(pt => ({ x: pt.x, y: pt.y }))
                    });
                }
            });

            if (moves.length > 0) {
                recordAction({
                    type: 'MOVE_ITEMS',
                    moves: moves
                });
            }
        }
        dragItemInitialPositions.clear();
        dragPathInitialPoints.clear();
        queueSaveBoard();
    };

    // Transform (Resize & Rotate) Handling
    let transformInitialSnapshot = null;
    let transformInitialPathPoints = null;
    let transformDrawingCenter = null;
    let transformInitialAngle = 0;

    const startElementTransform = (item, handleType, e) => {
        if (activeTouches.size >= 2) return;
        isTransformingElement = true;
        transformAction = handleType;
        const worldPos = screenToWorld(e.clientX, e.clientY);
        dragStartX = worldPos.x;
        dragStartY = worldPos.y;

        if (item.isDrawing) {
            const path = activeBoardData?.drawingPaths?.find(p => p.id === item.id);
            if (path && path.points) {
                transformInitialPathPoints = path.points.map(pt => ({ x: pt.x, y: pt.y }));
                const box = getPathBoundingBox(path);
                transformDrawingCenter = { x: box.cx, y: box.cy };
                transformInitialAngle = Math.atan2(worldPos.y - box.cy, worldPos.x - box.cx);
            }
            return;
        }

        elementInitialRect = {
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation || 0,
            aspectRatio: (item.width && item.height) ? (item.width / item.height) : 1
        };
        transformInitialSnapshot = {
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation || 0
        };
    };

    const handleElementTransformMove = (e) => {
        if (!isTransformingElement || !selectedElementId || !activeBoardData) return;

        // Drawing stroke rotation
        if (transformInitialPathPoints && transformDrawingCenter) {
            const worldPos = screenToWorld(e.clientX, e.clientY);
            const currentAngle = Math.atan2(worldPos.y - transformDrawingCenter.cy, worldPos.x - transformDrawingCenter.cx);
            const dAngle = currentAngle - transformInitialAngle;
            const cos = Math.cos(dAngle);
            const sin = Math.sin(dAngle);
            const cx = transformDrawingCenter.x;
            const cy = transformDrawingCenter.y;
            const path = activeBoardData.drawingPaths.find(p => p.id === selectedElementId);
            if (path) {
                path.points = transformInitialPathPoints.map(pt => ({
                    x: Math.round(cx + (pt.x - cx) * cos - (pt.y - cy) * sin),
                    y: Math.round(cy + (pt.x - cx) * sin + (pt.y - cy) * cos)
                }));
                renderDrawingPaths(activeBoardData.drawingPaths);
                updateDrawingSelectionBoxes();
            }
            return;
        }

        const item = activeBoardData.elements.find(it => it.id === selectedElementId);
        if (!item) return;

        const worldPos = screenToWorld(e.clientX, e.clientY);
        const rad = (elementInitialRect.rotation || 0) * (Math.PI / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const globalDx = worldPos.x - dragStartX;
        const globalDy = worldPos.y - dragStartY;

        const localDx = globalDx * cos + globalDy * sin;
        const localDy = -globalDx * sin + globalDy * cos;

        if (transformAction === 'rotate') {
            const centerX = elementInitialRect.x + elementInitialRect.width / 2;
            const centerY = elementInitialRect.y + elementInitialRect.height / 2;
            const angle = Math.atan2(worldPos.y - centerY, worldPos.x - centerX) * (180 / Math.PI);
            item.rotation = Math.round(angle + 90);
        } else {
            let newW = elementInitialRect.width;
            let newH = elementInitialRect.height;
            let localOffsetX = 0;
            let localOffsetY = 0;

            const isImage = item.type === 'image';
            const preserveAspect = isImage && !e.shiftKey;

            switch (transformAction) {
                case 'se':
                    newW = Math.max(80, elementInitialRect.width + localDx);
                    newH = preserveAspect ? (newW / elementInitialRect.aspectRatio) : Math.max(80, elementInitialRect.height + localDy);
                    break;
                case 'sw':
                    newW = Math.max(80, elementInitialRect.width - localDx);
                    newH = preserveAspect ? (newW / elementInitialRect.aspectRatio) : Math.max(80, elementInitialRect.height + localDy);
                    localOffsetX = elementInitialRect.width - newW;
                    break;
                case 'ne':
                    newW = Math.max(80, elementInitialRect.width + localDx);
                    newH = preserveAspect ? (newW / elementInitialRect.aspectRatio) : Math.max(80, elementInitialRect.height - localDy);
                    localOffsetY = elementInitialRect.height - newH;
                    break;
                case 'nw':
                    newW = Math.max(80, elementInitialRect.width - localDx);
                    newH = preserveAspect ? (newW / elementInitialRect.aspectRatio) : Math.max(80, elementInitialRect.height - localDy);
                    localOffsetX = elementInitialRect.width - newW;
                    localOffsetY = elementInitialRect.height - newH;
                    break;
            }

            // Convert local offset back into world coordinates
            const worldOffsetX = localOffsetX * cos - localOffsetY * sin;
            const worldOffsetY = localOffsetX * sin + localOffsetY * cos;

            item.x = Math.round(elementInitialRect.x + worldOffsetX);
            item.y = Math.round(elementInitialRect.y + worldOffsetY);
            item.width = Math.round(newW);
            item.height = Math.round(newH);
        }

        const el = elementsContainer.querySelector(`[data-id="${item.id}"]`);
        if (el) {
            el.style.left = `${item.x}px`;
            el.style.top = `${item.y}px`;
            el.style.width = `${item.width}px`;
            el.style.height = `${item.height}px`;
            el.style.transform = `rotate(${item.rotation || 0}deg)`;
        }
    };

    const endElementTransform = () => {
        if (!isTransformingElement) return;
        isTransformingElement = false;
        transformAction = null;

        if (transformInitialPathPoints) {
            const path = activeBoardData?.drawingPaths?.find(p => p.id === selectedElementId);
            if (path) {
                recordAction({
                    type: 'TRANSFORM_DRAWING',
                    id: path.id,
                    fromPoints: transformInitialPathPoints,
                    toPoints: path.points.map(pt => ({ x: pt.x, y: pt.y }))
                });
            }
            transformInitialPathPoints = null;
            transformDrawingCenter = null;
            queueSaveBoard();
            return;
        }

        const item = activeBoardData && activeBoardData.elements.find(it => it.id === selectedElementId);
        if (item && transformInitialSnapshot) {
            const hasChanged = item.x !== transformInitialSnapshot.x ||
                               item.y !== transformInitialSnapshot.y ||
                               item.width !== transformInitialSnapshot.width ||
                               item.height !== transformInitialSnapshot.height ||
                               (item.rotation || 0) !== transformInitialSnapshot.rotation;
            if (hasChanged) {
                recordAction({
                    type: 'TRANSFORM_ELEMENT',
                    id: item.id,
                    from: { ...transformInitialSnapshot },
                    to: {
                        x: item.x,
                        y: item.y,
                        width: item.width,
                        height: item.height,
                        rotation: item.rotation || 0
                    }
                });
            }
        }
        transformInitialSnapshot = null;
        queueSaveBoard();
    };

    // Add New Text Note
    const addNewTextElement = () => {
        if (!activeBoardData) {
            activeBoardData = getOrCreateLocalBoard();
            activeBoardId = activeBoardData.id;
        }
        // Position near center of user's current viewport
        const centerPos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);

        const newId = 'elem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newItem = {
            id: newId,
            type: 'text',
            content: 'Double click to add notes or styling concepts...',
            x: Math.round(centerPos.x - 120),
            y: Math.round(centerPos.y - 60),
            width: 260,
            height: 140,
            rotation: 0,
            stylePreset: 'note-dark',
            zIndex: ((activeBoardData.elements && activeBoardData.elements.length) || 0) + 10
        };

        if (!activeBoardData.elements) activeBoardData.elements = [];
        activeBoardData.elements.push(newItem);
        recordAction({ type: 'ADD_ELEMENT', element: { ...newItem } });
        renderCanvasElements(activeBoardData.elements);
        selectElement(newId);
        queueSaveBoard();
        showToast('Text note added.');
    };

    toolAddText.addEventListener('click', addNewTextElement);

    const deleteSelectedElements = async () => {
        if (!activeBoardData) return;
        if (selectedElementIds.size === 0 && selectedElementId) {
            selectedElementIds.add(selectedElementId);
        }
        if (selectedElementIds.size === 0) return;

        const toDeleteElements = (activeBoardData.elements || []).filter(it => selectedElementIds.has(it.id));
        const toDeleteDrawings = (activeBoardData.drawingPaths || []).filter(p => selectedElementIds.has(p.id));

        if (toDeleteElements.length === 0 && toDeleteDrawings.length === 0) return;

        recordAction({
            type: 'DELETE_ITEMS',
            elements: toDeleteElements.map(it => ({ ...it })),
            drawings: toDeleteDrawings.map(p => ({ ...p, points: p.points.map(pt => ({ ...pt })) }))
        });

        activeBoardData.elements = (activeBoardData.elements || []).filter(it => !selectedElementIds.has(it.id));
        activeBoardData.drawingPaths = (activeBoardData.drawingPaths || []).filter(p => !selectedElementIds.has(p.id));

        const totalDeleted = toDeleteElements.length + toDeleteDrawings.length;
        deselectAll();
        renderCanvasElements(activeBoardData.elements);
        renderDrawingPaths(activeBoardData.drawingPaths);
        await queueSaveBoard();
        showToast(`Deleted ${totalDeleted} item${totalDeleted === 1 ? '' : 's'}.`);
    };

    const deleteElementById = async (id) => {
        if (!activeBoardData) return;
        const itemToDelete = (activeBoardData.elements || []).find(it => it.id === id);
        const pathToDelete = (activeBoardData.drawingPaths || []).find(p => p.id === id);

        if (itemToDelete) {
            recordAction({ type: 'DELETE_ELEMENT', element: { ...itemToDelete } });
            activeBoardData.elements = (activeBoardData.elements || []).filter(it => it.id !== id);
        } else if (pathToDelete) {
            recordAction({ type: 'DELETE_ITEMS', drawings: [{ ...pathToDelete, points: pathToDelete.points.map(pt => ({ ...pt })) }] });
            activeBoardData.drawingPaths = (activeBoardData.drawingPaths || []).filter(p => p.id !== id);
        }

        selectedElementIds.delete(id);
        if (selectedElementId === id) {
            selectedElementId = Array.from(selectedElementIds)[0] || null;
        }
        renderCanvasElements(activeBoardData.elements);
        renderDrawingPaths(activeBoardData.drawingPaths);
        updateSelectionToolbar();
        await queueSaveBoard();
        showToast('Item deleted.');
    };

    // Add Image Element Helper (Calculates Exact Natural Aspect Ratio & Viewport Scale)
    const insertImageElement = (imageUrl) => {
        if (!imageUrl) return;

        if (!activeBoardData) {
            activeBoardData = getOrCreateLocalBoard();
            activeBoardId = activeBoardData.id;
        }

        const img = new Image();
        // Do NOT use crossOrigin='anonymous' to avoid CORS rejections on external image hosts
        img.onload = () => {
            const naturalW = img.naturalWidth || 800;
            const naturalH = img.naturalHeight || 600;
            const aspect = naturalW / naturalH;

            // Target size relative to current viewport: ~38% of visible screen height
            const vpRect = canvasViewport.getBoundingClientRect();
            const targetVisibleHeight = Math.max(260, Math.min(480, (vpRect.height || 600) * 0.42));
            
            // Adjust for current canvas zoom level
            let elementH = targetVisibleHeight / viewportScale;
            let elementW = elementH * aspect;

            // Clamp reasonable bounds
            if (elementW > 1200) {
                elementW = 1200;
                elementH = elementW / aspect;
            }

            const centerPos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
            const newId = 'elem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const newItem = {
                id: newId,
                type: 'image',
                content: imageUrl,
                x: Math.round(centerPos.x - elementW / 2),
                y: Math.round(centerPos.y - elementH / 2),
                width: Math.round(elementW),
                height: Math.round(elementH),
                rotation: 0,
                zIndex: ((activeBoardData.elements && activeBoardData.elements.length) || 0) + 10
            };

            if (!activeBoardData.elements) activeBoardData.elements = [];
            activeBoardData.elements.push(newItem);
            recordAction({ type: 'ADD_ELEMENT', element: { ...newItem } });
            renderCanvasElements(activeBoardData.elements);
            selectElement(newId);
            queueSaveBoard();
            closeModal(modalAddPhoto);
            showToast('Photo placed onto moodboard in original ratio.');
        };

        img.onerror = () => {
            const centerPos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
            const newId = 'elem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const newItem = {
                id: newId,
                type: 'image',
                content: imageUrl,
                x: Math.round(centerPos.x - 180),
                y: Math.round(centerPos.y - 180),
                width: 360,
                height: 360,
                rotation: 0,
                zIndex: ((activeBoardData.elements && activeBoardData.elements.length) || 0) + 10
            };
            if (!activeBoardData.elements) activeBoardData.elements = [];
            activeBoardData.elements.push(newItem);
            recordAction({ type: 'ADD_ELEMENT', element: { ...newItem } });
            renderCanvasElements(activeBoardData.elements);
            selectElement(newId);
            queueSaveBoard();
            closeModal(modalAddPhoto);
            showToast('Photo placed onto moodboard.');
        };

        img.src = imageUrl;
    };

    // --- Photoshoot Library & Image Inserter Modal ---
    toolAddPhoto.addEventListener('click', () => {
        openModal(modalAddPhoto);
        loadPhotoshootPicker();
    });

    // Tab switcher in Photoshoot Modal
    document.querySelectorAll('.picker-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.picker-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            const targetPane = document.getElementById(`tab-content-${tab}`);
            if (targetPane) targetPane.style.display = 'block';
        });
    });

    // Load Photoshoots with Role Permissions
    const loadPhotoshootPicker = async () => {
        pickerPhotosGrid.innerHTML = '<div style="color: var(--mb-text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">Loading photoshoot library...</div>';
        photoshootCategoryFilter.innerHTML = '<option value="all">All Photoshoots</option>';

        try {
            let allPhotos = [];

            // 1. Fetch Single Shots
            const singleSnap = await getDocs(collection(db, 'single_shots'));
            singleSnap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.url) {
                    allPhotos.push({
                        url: data.url,
                        title: 'Single Shot',
                        isArchived: false,
                        category: 'Single Shots'
                    });
                }
            });

            // 2. Fetch Photo Sets
            const setsSnap = await getDocs(collection(db, 'photo_sets'));
            const categoriesFound = new Set(['Single Shots']);

            setsSnap.forEach(docSnap => {
                const data = docSnap.data();
                const isArchived = data.archived === true;

                // If regular user, exclude archived
                if (isArchived && !currentIsAdmin) return;

                const catName = data.categoryName || 'Untitled Set';
                categoriesFound.add(catName);

                if (data.urls && Array.isArray(data.urls)) {
                    data.urls.forEach(url => {
                        allPhotos.push({
                            url: url,
                            title: catName,
                            isArchived: isArchived,
                            category: catName
                        });
                    });
                }
            });

            // Populate category filter dropdown
            categoriesFound.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                photoshootCategoryFilter.appendChild(opt);
            });

            photoshootCountBadge.textContent = `${allPhotos.length} photos available`;

            // Render Photos
            const renderPickerGrid = (filtered) => {
                pickerPhotosGrid.innerHTML = '';
                if (filtered.length === 0) {
                    pickerPhotosGrid.innerHTML = '<div style="color: var(--mb-text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">No photos match the filter.</div>';
                    return;
                }

                filtered.forEach(photo => {
                    const card = document.createElement('div');
                    card.className = 'picker-photo-card';
                    card.innerHTML = `
                        <img src="${photo.url}" alt="${escapeHtml(photo.title)}" loading="lazy">
                        ${photo.isArchived ? '<span class="picker-badge-archived">Archived</span>' : ''}
                    `;
                    card.addEventListener('click', (e) => {
                        e.stopPropagation();
                        insertImageElement(photo.url);
                    });
                    pickerPhotosGrid.appendChild(card);
                });
            };

            renderPickerGrid(allPhotos);

            // Filter select handler
            photoshootCategoryFilter.onchange = () => {
                const selected = photoshootCategoryFilter.value;
                if (selected === 'all') renderPickerGrid(allPhotos);
                else renderPickerGrid(allPhotos.filter(p => p.category === selected));
            };

        } catch (err) {
            console.error("Error loading photoshoot images:", err);
            pickerPhotosGrid.innerHTML = '<div style="color: var(--mb-danger); grid-column: 1/-1; text-align: center;">Error loading photos.</div>';
        }
    };

    // Insert Image via URL
    btnInsertUrlImg.addEventListener('click', () => {
        const url = inputImgUrl.value.trim();
        if (!url) {
            alert('Please enter a valid image URL.');
            return;
        }
        insertImageElement(url);
        inputImgUrl.value = '';
    });

    // Local File Upload directly onto Moodboard via Cloudflare Worker -> ImgBB
    inputFileLocal.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadStatusText.style.display = 'block';
        uploadStatusText.textContent = 'Compressing & uploading image to ImgBB...';

        try {
            const formData = new FormData();
            formData.append('image', file);

            const workerUrl = 'https://long-sky-4aa4.dener4826.workers.dev';
            const response = await fetch(workerUrl, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success && data.data && data.data.url) {
                insertImageElement(data.data.url);
                uploadStatusText.style.display = 'none';
                inputFileLocal.value = '';
            } else {
                throw new Error(data.error?.message || 'Upload failed');
            }
        } catch (err) {
            console.error("Direct upload error:", err);
            uploadStatusText.textContent = 'Upload failed. Please try a direct URL.';
            uploadStatusText.style.color = '#f43f5e';
        }
    });

    // Helper: Check if current user is board creator or admin
    const isBoardCreatorOrAdmin = () => {
        if (currentIsAdmin) return true;
        if (!currentUser || !activeBoardData) return false;
        const uidMatch = activeBoardData.creatorUid && activeBoardData.creatorUid === currentUser.uid;
        const emailMatch = activeBoardData.creatorEmail && currentUser.email &&
            activeBoardData.creatorEmail.toLowerCase() === currentUser.email.toLowerCase();
        return !!(uidMatch || emailMatch);
    };

    // --- Moodboard Settings Modal (Title, Description, Collaborators & View via URL) ---
    if (btnBoardSettings) {
        btnBoardSettings.addEventListener('click', () => {
            if (!activeBoardData) {
                activeBoardData = getOrCreateLocalBoard();
                activeBoardId = activeBoardData.id;
            }
            const canEdit = isBoardCreatorOrAdmin();
            if (settingsBoardTitle) {
                settingsBoardTitle.value = activeBoardData.title || '';
                settingsBoardTitle.disabled = !canEdit;
            }
            if (settingsBoardDesc) {
                settingsBoardDesc.value = activeBoardData.description || '';
                settingsBoardDesc.disabled = !canEdit;
            }
            const collabControls = document.getElementById('collab-add-controls');
            if (collabControls) collabControls.style.display = canEdit ? 'flex' : 'none';
            if (btnSaveBoardSettings) btnSaveBoardSettings.style.display = canEdit ? '' : 'none';

            if (settingViewViaUrl) {
                settingViewViaUrl.checked = !!activeBoardData.viewViaUrl;
                settingViewViaUrl.disabled = !canEdit;
            }

            const shareUrl = activeBoardId && !activeBoardId.startsWith('local_')
                ? `${window.location.origin}/moodboard/?id=${activeBoardId}`
                : `${window.location.origin}/moodboard/`;
            if (inputShareUrl) inputShareUrl.value = shareUrl;
            if (shareLinkBox) shareLinkBox.style.display = activeBoardData.viewViaUrl ? 'block' : 'none';

            renderCollabChips(canEdit);
            openModal(modalBoardSettings);
        });
    }

    if (settingViewViaUrl) {
        settingViewViaUrl.addEventListener('change', () => {
            if (shareLinkBox) shareLinkBox.style.display = settingViewViaUrl.checked ? 'block' : 'none';
        });
    }

    if (btnCopyShareUrl) {
        btnCopyShareUrl.addEventListener('click', () => {
            if (inputShareUrl) {
                inputShareUrl.select();
                navigator.clipboard.writeText(inputShareUrl.value);
                showToast('Moodboard link copied to clipboard!');
            }
        });
    }

    if (btnSaveBoardSettings) {
        btnSaveBoardSettings.addEventListener('click', async () => {
            if (!activeBoardData) return;
            if (!isBoardCreatorOrAdmin()) {
                showToast('Only the moodboard creator can change settings.');
                return;
            }
            const newTitle = settingsBoardTitle ? settingsBoardTitle.value.trim() : '';
            const newDesc = settingsBoardDesc ? settingsBoardDesc.value.trim() : '';

            activeBoardData.title = newTitle || 'Untitled Board';
            activeBoardData.description = newDesc;
            activeBoardData.viewViaUrl = settingViewViaUrl ? settingViewViaUrl.checked : false;
            if (activeBoardTitle) activeBoardTitle.textContent = activeBoardData.title;

            if (activeBoardId && !activeBoardId.startsWith('local_')) {
                try {
                    const boardRef = doc(db, 'moodboards', activeBoardId);
                    await updateDoc(boardRef, {
                        title: activeBoardData.title,
                        description: activeBoardData.description,
                        trustedEmails: activeBoardData.trustedEmails || [],
                        viewViaUrl: !!activeBoardData.viewViaUrl,
                        updatedAt: new Date().toISOString()
                    });
                } catch (err) {
                    console.error("Error saving board settings:", err);
                }
            } else {
                queueSaveBoard();
            }

            closeModal(modalBoardSettings);
            showToast('Moodboard settings saved!');
        });
    }

    const renderCollabChips = (canEdit = isBoardCreatorOrAdmin()) => {
        if (!collabChipsContainer) return;
        collabChipsContainer.innerHTML = '';
        const emails = (activeBoardData && activeBoardData.trustedEmails) || [];

        if (emails.length === 0) {
            collabChipsContainer.innerHTML = '<span style="color: var(--mb-text-muted); font-size: 0.85rem;">No collaborators added yet.</span>';
            return;
        }

        emails.forEach(email => {
            const chip = document.createElement('div');
            chip.className = 'collab-chip';
            chip.innerHTML = `
                <span>${escapeHtml(email)}</span>
                ${canEdit ? `<span class="remove-chip" title="Remove Collaborator">&times;</span>` : ''}
            `;

            if (canEdit) {
                const removeBtn = chip.querySelector('.remove-chip');
                if (removeBtn) {
                    removeBtn.addEventListener('click', async () => {
                        activeBoardData.trustedEmails = activeBoardData.trustedEmails.filter(e => e !== email);
                        renderCollabChips(canEdit);
                        await queueSaveBoard();
                        showToast(`Removed ${email}`);
                    });
                }
            }

            collabChipsContainer.appendChild(chip);
        });
    };

    if (btnAddCollabEmail) {
        btnAddCollabEmail.addEventListener('click', async () => {
            if (!isBoardCreatorOrAdmin()) {
                showToast('Only the creator can add collaborators.');
                return;
            }
            const email = inputAddCollabEmail.value.trim().toLowerCase();
            if (!email || !email.includes('@')) {
                alert('Please enter a valid email address.');
                return;
            }

            if (!activeBoardData.trustedEmails) activeBoardData.trustedEmails = [];
            if (activeBoardData.trustedEmails.includes(email)) {
                alert('User is already added to this board.');
                return;
            }

            activeBoardData.trustedEmails.push(email);
            inputAddCollabEmail.value = '';
            renderCollabChips(true);
            await queueSaveBoard();
            showToast(`Added ${email} to collaborators!`);
        });
    }

    // --- Clean Non-Existent/Empty Drawings and Firestore Persistence ---
    const cleanAndSaveBoard = async () => {
        if (!activeBoardId || !activeBoardData) return;
        // Clean out any empty strokes (< 2 points) or invalid drawings
        if (activeBoardData.drawingPaths) {
            activeBoardData.drawingPaths = activeBoardData.drawingPaths.filter(
                p => p && p.points && p.points.length >= 2 && !p.isDeleted
            );
        }
        if (activeBoardId.startsWith('local_')) {
            localStorage.setItem('zhukov_local_board', JSON.stringify(activeBoardData));
            return;
        }
        try {
            const boardRef = doc(db, 'moodboards', activeBoardId);
            await updateDoc(boardRef, {
                elements: activeBoardData.elements || [],
                drawingPaths: activeBoardData.drawingPaths || [],
                trustedEmails: activeBoardData.trustedEmails || [],
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error("Error persisting cleaned moodboard:", err);
        }
    };

    window.addEventListener('beforeunload', () => {
        cleanAndSaveBoard();
    });
    window.addEventListener('pagehide', () => {
        cleanAndSaveBoard();
    });

    const queueSaveBoard = async () => {
        if (!activeBoardId || !activeBoardData) return;
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            await cleanAndSaveBoard();
        }, 300);
    };

    // Helper: HTML Escaper
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- URL-based Board Routing on Page Load ---
    const initialBoardId = getBoardIdFromUrl();
    if (initialBoardId) {
        setTimeout(() => {
            if (!activeBoardId) openMoodboard(initialBoardId);
        }, 150);
    }
});
