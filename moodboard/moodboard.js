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
            case 'TRANSFORM_ITEMS': {
                (action.elements || []).forEach(itemChange => {
                    const el = (activeBoardData.elements || []).find(e => e.id === itemChange.id);
                    if (el && itemChange.from) {
                        el.x = itemChange.from.x;
                        el.y = itemChange.from.y;
                        el.width = itemChange.from.width;
                        el.height = itemChange.from.height;
                        el.rotation = itemChange.from.rotation;
                    }
                });
                (action.drawings || []).forEach(drawChange => {
                    const path = (activeBoardData.drawingPaths || []).find(p => p.id === drawChange.id);
                    if (path && drawChange.fromPoints) {
                        path.points = drawChange.fromPoints.map(pt => ({ ...pt }));
                        if (drawChange.fromSize) path.size = drawChange.fromSize;
                    }
                });
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
            case 'TRANSFORM_ITEMS': {
                (action.elements || []).forEach(itemChange => {
                    const el = (activeBoardData.elements || []).find(e => e.id === itemChange.id);
                    if (el && itemChange.to) {
                        el.x = itemChange.to.x;
                        el.y = itemChange.to.y;
                        el.width = itemChange.to.width;
                        el.height = itemChange.to.height;
                        el.rotation = itemChange.to.rotation;
                    }
                });
                (action.drawings || []).forEach(drawChange => {
                    const path = (activeBoardData.drawingPaths || []).find(p => p.id === drawChange.id);
                    if (path && drawChange.toPoints) {
                        path.points = drawChange.toPoints.map(pt => ({ ...pt }));
                        if (drawChange.toSize) path.size = drawChange.toSize;
                    }
                });
                renderCanvasElements(activeBoardData.elements);
                renderDrawingPaths(activeBoardData.drawingPaths);
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

            if (isDraggingElement || isTransformingElement || isDrawingStroke || isPanning || isMarqueeSelecting) {
                // Do not recreate DOM elements while the user is actively dragging or transforming
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

    let viewportAnimId = null;
    const animateViewportTo = (targetPanX, targetPanY, targetScale) => {
        if (viewportAnimId) cancelAnimationFrame(viewportAnimId);
        const startPanX = viewportPanX;
        const startPanY = viewportPanY;
        const startScale = viewportScale;
        const startTime = performance.now();
        const duration = 280;

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - progress, 3);

            viewportPanX = startPanX + (targetPanX - startPanX) * ease;
            viewportPanY = startPanY + (targetPanY - startPanY) * ease;
            viewportScale = startScale + (targetScale - startScale) * ease;
            updateViewportTransform();

            if (progress < 1) {
                viewportAnimId = requestAnimationFrame(step);
            } else {
                viewportAnimId = null;
            }
        };

        viewportAnimId = requestAnimationFrame(step);
    };

    const centerViewport = () => {
        const vpRect = canvasViewport.getBoundingClientRect();
        viewportScale = 1.0;
        viewportPanX = (vpRect.width / 2) - 3000;
        viewportPanY = (vpRect.height / 2) - 3000;
        updateViewportTransform();
    };

    // Auto-fit & zoom to view all existing elements and drawings
    const fitViewToElements = (elements, drawingPaths, smooth = false) => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let count = 0;

        // Gather all elements (passed array, activeBoardData, or live DOM)
        let allItems = [];
        if (Array.isArray(elements) && elements.length > 0) {
            allItems = elements;
        } else if (Array.isArray(activeBoardData?.elements) && activeBoardData.elements.length > 0) {
            allItems = activeBoardData.elements;
        } else {
            document.querySelectorAll('.board-element:not(.board-element-drawing)').forEach(domEl => {
                const ex = parseFloat(domEl.style.left) || domEl.offsetLeft || 0;
                const ey = parseFloat(domEl.style.top) || domEl.offsetTop || 0;
                const ew = parseFloat(domEl.style.width) || domEl.offsetWidth || 240;
                const eh = parseFloat(domEl.style.height) || domEl.offsetHeight || 200;
                allItems.push({ x: ex, y: ey, width: ew, height: eh });
            });
        }

        allItems.forEach(el => {
            const ex = Number(el.x) || 0;
            const ey = Number(el.y) || 0;
            const ew = Number(el.width) || 240;
            const eh = Number(el.height) || 200;
            const rot = Number(el.rotation) || 0;

            // Calculate rotated bounding box to prevent corner clipping
            const rad = rot * (Math.PI / 180);
            const cos = Math.abs(Math.cos(rad));
            const sin = Math.abs(Math.sin(rad));
            const boundW = ew * cos + eh * sin;
            const boundH = ew * sin + eh * cos;
            const cx = ex + ew / 2;
            const cy = ey + eh / 2;

            minX = Math.min(minX, cx - boundW / 2);
            minY = Math.min(minY, cy - boundH / 2);
            maxX = Math.max(maxX, cx + boundW / 2);
            maxY = Math.max(maxY, cy + boundH / 2);
            count++;
        });

        // Gather all vector drawings
        let allDrawings = [];
        if (Array.isArray(drawingPaths) && drawingPaths.length > 0) {
            allDrawings = drawingPaths;
        } else if (Array.isArray(activeBoardData?.drawingPaths) && activeBoardData.drawingPaths.length > 0) {
            allDrawings = activeBoardData.drawingPaths;
        }

        allDrawings.forEach(path => {
            if (path.isEraser) return;
            const pad = (Number(path.size) || 6) / 2 + 6;
            (path.points || []).forEach(pt => {
                const px = Number(pt.x);
                const py = Number(pt.y);
                if (isFinite(px) && isFinite(py)) {
                    minX = Math.min(minX, px - pad);
                    minY = Math.min(minY, py - pad);
                    maxX = Math.max(maxX, px + pad);
                    maxY = Math.max(maxY, py + pad);
                    count++;
                }
            });
        });

        // If moodboard is completely empty
        if (count === 0 || !isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            centerViewport();
            return;
        }

        const vpRect = canvasViewport.getBoundingClientRect();
        const vpWidth = Math.max(300, vpRect.width || window.innerWidth);
        const vpHeight = Math.max(300, vpRect.height || window.innerHeight);

        const contentW = Math.max(60, maxX - minX);
        const contentH = Math.max(60, maxY - minY);

        // Safe margins accounting for top bar, HUD, and bottom toolbar
        const padX = Math.max(50, vpWidth * 0.08);
        const padTop = Math.max(60, vpHeight * 0.12);
        const padBottom = Math.max(80, vpHeight * 0.16);

        const availableW = Math.max(50, vpWidth - padX * 2);
        const availableH = Math.max(50, vpHeight - padTop - padBottom);

        const scaleX = availableW / contentW;
        const scaleY = availableH / contentH;

        // Auto zoom: compute the exact scale needed to fit all items (allows zoom down to 0.04x)
        const targetScale = Math.max(0.04, Math.min(1.0, Math.min(scaleX, scaleY)));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const targetPanX = (vpWidth / 2) - (centerX * targetScale);
        const targetPanY = ((padTop + (vpHeight - padBottom)) / 2) - (centerY * targetScale);

        if (smooth) {
            animateViewportTo(targetPanX, targetPanY, targetScale);
        } else {
            viewportScale = targetScale;
            viewportPanX = targetPanX;
            viewportPanY = targetPanY;
            updateViewportTransform();
        }
    };

    const zoomAroundPoint = (screenX, screenY, newScale) => {
        newScale = Math.max(0.05, Math.min(4.0, newScale));
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
        fitViewToElements(undefined, undefined, true);
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
        // Remove boxes for drawings that are no longer selected
        document.querySelectorAll('.board-element-drawing').forEach(el => {
            if (!selectedElementIds.has(el.dataset.id)) {
                el.remove();
            }
        });

        selectedElementIds.forEach(id => {
            const path = activeBoardData?.drawingPaths?.find(p => p.id === id);
            if (!path || !path.points || path.points.length === 0) {
                const oldEl = elementsContainer.querySelector(`.board-element-drawing[data-id="${id}"]`);
                if (oldEl) oldEl.remove();
                return;
            }
            const box = getPathBoundingBox(path);
            if (!box) return;

            let el = elementsContainer.querySelector(`.board-element-drawing[data-id="${path.id}"]`);
            if (el) {
                el.style.left = `${box.x}px`;
                el.style.top = `${box.y}px`;
                el.style.width = `${box.width}px`;
                el.style.height = `${box.height}px`;
                return;
            }

            el = document.createElement('div');
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

    // --- DOM Elements Rendering with In-Place Element Recycling (Eliminates Image Flickering) ---
    const renderCanvasElements = (elements = []) => {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.classList.contains('editable-text')) {
            return;
        }

        const currentIds = new Set(elements.map(item => item.id));

        document.querySelectorAll('.board-element:not(.board-element-drawing)').forEach(domEl => {
            if (!currentIds.has(domEl.dataset.id)) {
                domEl.remove();
            }
        });

        elements.forEach(item => {
            let el = elementsContainer.querySelector(`[data-id="${item.id}"]`);

            if (!el) {
                el = document.createElement('div');
                el.className = `board-element ${item.type === 'text' ? 'element-text' : 'element-image'}`;
                el.dataset.id = item.id;

                if (item.type === 'image') {
                    const img = document.createElement('img');
                    img.src = item.url;
                    img.draggable = false;
                    img.alt = item.alt || 'Moodboard Image';

                    const handlesContainer = document.createElement('div');
                    handlesContainer.className = 'transform-handles';
                    handlesContainer.innerHTML = `
                        <div class="transform-handle handle-nw" data-handle="nw"></div>
                        <div class="transform-handle handle-ne" data-handle="ne"></div>
                        <div class="transform-handle handle-se" data-handle="se"></div>
                        <div class="transform-handle handle-sw" data-handle="sw"></div>
                        <div class="transform-handle handle-rotate" data-handle="rotate"></div>
                    `;

                    el.appendChild(img);
                    el.appendChild(handlesContainer);
                } else if (item.type === 'text') {
                    const body = document.createElement('div');
                    body.className = `note-body ${item.stylePreset || 'note-dark'}`;

                    const textarea = document.createElement('textarea');
                    textarea.className = 'editable-text';
                    textarea.placeholder = 'Type something...';
                    textarea.value = item.content || '';

                    body.appendChild(textarea);
                    el.appendChild(body);

                    const handlesContainer = document.createElement('div');
                    handlesContainer.className = 'transform-handles';
                    handlesContainer.innerHTML = `
                        <div class="transform-handle handle-nw" data-handle="nw"></div>
                        <div class="transform-handle handle-ne" data-handle="ne"></div>
                        <div class="transform-handle handle-se" data-handle="se"></div>
                        <div class="transform-handle handle-sw" data-handle="sw"></div>
                        <div class="transform-handle handle-rotate" data-handle="rotate"></div>
                    `;
                    el.appendChild(handlesContainer);

                    let initialTextContent = '';
                    textarea.addEventListener('focus', () => {
                        initialTextContent = textarea.value;
                    });

                    textarea.addEventListener('input', () => {
                        item.content = textarea.value;
                        if (item.type === 'text' && !item.stylePreset) {
                            item.stylePreset = 'note-dark';
                        }
                    });

                    textarea.addEventListener('blur', () => {
                        if (textarea.value !== initialTextContent) {
                            recordAction({ type: 'TEXT_CHANGE', id: item.id, from: initialTextContent, to: textarea.value });
                            queueSaveBoard();
                        }
                    });
                }

                el.addEventListener('pointerdown', (e) => {
                    if (activeTool !== 'select') return;
                    if (activeTouches.size >= 2 || (e.pointerType === 'touch' && activeTouches.size > 1)) return;

                    const handle = e.target.closest('.transform-handle');
                    if (handle) {
                        e.stopPropagation();
                        startElementTransform(item, handle.dataset.handle, e);
                        return;
                    }

                    if (e.target.classList.contains('editable-text')) {
                        e.stopPropagation();
                        selectElement(item.id, e.shiftKey);
                        return;
                    }

                    e.stopPropagation();
                    if (!selectedElementIds.has(item.id)) {
                        selectElement(item.id, e.shiftKey);
                    }
                    startElementDrag(item, e);
                });

                elementsContainer.appendChild(el);
            }

            el.style.left = `${item.x}px`;
            el.style.top = `${item.y}px`;
            el.style.width = `${item.width}px`;
            el.style.height = `${item.height}px`;
            
            const rotation = item.rotation || 0;
            el.style.transform = `rotate(${rotation}deg)`;
            el.dataset.rotation = rotation;

            if (item.type === 'text') {
                const body = el.querySelector('.note-body');
                if (body) {
                    body.className = `note-body ${item.stylePreset || 'note-dark'}`;
                    if (item.stylePreset === 'note-custom' && item.customBg) {
                        body.style.background = item.customBg;
                    } else {
                        body.style.background = '';
                    }
                    if (item.customColor) {
                        body.style.color = item.customColor;
                    } else {
                        body.style.color = '';
                    }
                    if (item.fontSize) {
                        body.style.fontSize = `${item.fontSize}px`;
                    } else {
                        body.style.fontSize = '';
                    }
                    body.style.fontWeight = item.fontBold ? '700' : '';
                    body.style.fontStyle = item.fontItalic ? 'italic' : '';

                    const ta = body.querySelector('.editable-text');
                    if (ta) {
                        if (document.activeElement !== ta) {
                            ta.value = item.content || '';
                        }
                        ta.style.color = item.customColor || '';
                        ta.style.fontSize = item.fontSize ? `${item.fontSize}px` : '';
                        ta.style.fontWeight = item.fontBold ? '700' : '';
                        ta.style.fontStyle = item.fontItalic ? 'italic' : '';
                    }
                }
            }

            if (selectedElementIds.has(item.id)) {
                el.classList.add('is-selected');
            } else {
                el.classList.remove('is-selected');
            }
        });

        updateDrawingSelectionBoxes();
    };

    // Selection State Management
    const selectElement = (id, multi = false) => {
        if (!multi) selectedElementIds.clear();
        if (id) selectedElementIds.add(id);
        selectedElementId = selectedElementIds.size > 0 ? Array.from(selectedElementIds)[0] : null;
        updateSelectedDOM();
        updateSelectionToolbar();
    };

    const deselectAll = () => {
        selectedElementIds.clear();
        selectedElementId = null;
        updateSelectedDOM();
        updateSelectionToolbar();
    };

    const updateSelectedDOM = () => {
        document.querySelectorAll('.board-element').forEach(el => {
            if (selectedElementIds.has(el.dataset.id)) {
                el.classList.add('is-selected');
            } else {
                el.classList.remove('is-selected');
            }
        });
        updateDrawingSelectionBoxes();
        updateSelectionToolbar();
    };

    // --- Element Dragging & Multi-Drag ---
    let dragStartPositions = new Map();

    const startElementDrag = (item, e) => {
        isDraggingElement = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        dragStartPositions.clear();
        selectedElementIds.forEach(id => {
            const el = activeBoardData.elements?.find(it => it.id === id);
            if (el) {
                dragStartPositions.set(id, { x: el.x, y: el.y, isDrawing: false });
            } else {
                const path = activeBoardData.drawingPaths?.find(p => p.id === id);
                if (path) {
                    dragStartPositions.set(id, {
                        isDrawing: true,
                        points: path.points.map(pt => ({ x: pt.x, y: pt.y }))
                    });
                }
            }
        });

        try {
            if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
        } catch (_) {}
    };

    const handleElementDragMove = (e) => {
        if (!isDraggingElement) return;
        const deltaX = (e.clientX - dragStartX) / viewportScale;
        const deltaY = (e.clientY - dragStartY) / viewportScale;

        selectedElementIds.forEach(id => {
            const initial = dragStartPositions.get(id);
            if (!initial) return;

            if (initial.isDrawing) {
                const path = activeBoardData.drawingPaths?.find(p => p.id === id);
                if (path && initial.points) {
                    path.points = initial.points.map(pt => ({
                        x: pt.x + deltaX,
                        y: pt.y + deltaY
                    }));
                }
            } else {
                const el = activeBoardData.elements?.find(it => it.id === id);
                if (el) {
                    el.x = initial.x + deltaX;
                    el.y = initial.y + deltaY;

                    const domEl = elementsContainer.querySelector(`[data-id="${id}"]`);
                    if (domEl) {
                        domEl.style.left = `${el.x}px`;
                        domEl.style.top = `${el.y}px`;
                    }
                }
            }
        });

        renderDrawingPaths(activeBoardData.drawingPaths);
        updateDrawingSelectionBoxes();
    };

    const endElementDrag = async () => {
        if (!isDraggingElement) return;
        isDraggingElement = false;

        const moves = [];
        selectedElementIds.forEach(id => {
            const initial = dragStartPositions.get(id);
            if (!initial) return;

            if (initial.isDrawing) {
                const path = activeBoardData.drawingPaths?.find(p => p.id === id);
                if (path && initial.points) {
                    const hasMoved = path.points.some((pt, idx) => pt.x !== initial.points[idx].x || pt.y !== initial.points[idx].y);
                    if (hasMoved) {
                        moves.push({
                            id,
                            isDrawing: true,
                            fromPoints: initial.points.map(pt => ({ ...pt })),
                            toPoints: path.points.map(pt => ({ ...pt }))
                        });
                    }
                }
            } else {
                const el = activeBoardData.elements?.find(it => it.id === id);
                if (el) {
                    if (el.x !== initial.x || el.y !== initial.y) {
                        moves.push({
                            id,
                            isDrawing: false,
                            from: { x: initial.x, y: initial.y },
                            to: { x: el.x, y: el.y }
                        });
                    }
                }
            }
        });

        if (moves.length > 0) {
            recordAction({ type: 'MOVE_ITEMS', moves });
            await queueSaveBoard();
        }
    };

    // --- Element Transformation (Resize & Rotate) ---
    let initialSelectedItemsState = new Map();

    const startElementTransform = (item, action, e) => {
        isTransformingElement = true;
        transformAction = action;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        initialSelectedItemsState.clear();
        selectedElementIds.forEach(id => {
            const el = activeBoardData.elements?.find(it => it.id === id);
            if (el) {
                initialSelectedItemsState.set(id, {
                    isDrawing: false,
                    x: el.x,
                    y: el.y,
                    width: el.width,
                    height: el.height,
                    rotation: el.rotation || 0
                });
            } else {
                const path = activeBoardData.drawingPaths?.find(p => p.id === id);
                if (path) {
                    const box = getPathBoundingBox(path);
                    initialSelectedItemsState.set(id, {
                        isDrawing: true,
                        box,
                        size: path.size || 6,
                        points: path.points.map(pt => ({ x: pt.x, y: pt.y }))
                    });
                }
            }
        });

        try {
            if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
        } catch (_) {}
    };

    const handleElementTransformMove = (e) => {
        if (!isTransformingElement) return;

        const deltaX = (e.clientX - dragStartX) / viewportScale;
        const deltaY = (e.clientY - dragStartY) / viewportScale;

        selectedElementIds.forEach(id => {
            const init = initialSelectedItemsState.get(id);
            if (!init) return;

            if (init.isDrawing) {
                const path = activeBoardData.drawingPaths?.find(p => p.id === id);
                if (!path || !init.box) return;

                if (transformAction === 'rotate') {
                    const centerScreenX = init.box.cx * viewportScale + viewportPanX + canvasViewport.getBoundingClientRect().left;
                    const centerScreenY = init.box.cy * viewportScale + viewportPanY + canvasViewport.getBoundingClientRect().top;

                    const rad = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX) - Math.atan2(dragStartY - centerScreenY, dragStartX - centerScreenX);

                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);

                    path.points = init.points.map(pt => {
                        const dx = pt.x - init.box.cx;
                        const dy = pt.y - init.box.cy;
                        return {
                            x: init.box.cx + (dx * cos - dy * sin),
                            y: init.box.cy + (dx * sin + dy * cos)
                        };
                    });
                } else {
                    let scaleX = 1;
                    let scaleY = 1;
                    let originX = init.box.x;
                    let originY = init.box.y;

                    if (transformAction === 'se') {
                        originX = init.box.x;
                        originY = init.box.y;
                        scaleX = Math.max(0.1, (init.box.width + deltaX) / init.box.width);
                        scaleY = Math.max(0.1, (init.box.height + deltaY) / init.box.height);
                    } else if (transformAction === 'sw') {
                        originX = init.box.x + init.box.width;
                        originY = init.box.y;
                        scaleX = Math.max(0.1, (init.box.width - deltaX) / init.box.width);
                        scaleY = Math.max(0.1, (init.box.height + deltaY) / init.box.height);
                    } else if (transformAction === 'ne') {
                        originX = init.box.x;
                        originY = init.box.y + init.box.height;
                        scaleX = Math.max(0.1, (init.box.width + deltaX) / init.box.width);
                        scaleY = Math.max(0.1, (init.box.height - deltaY) / init.box.height);
                    } else if (transformAction === 'nw') {
                        originX = init.box.x + init.box.width;
                        originY = init.box.y + init.box.height;
                        scaleX = Math.max(0.1, (init.box.width - deltaX) / init.box.width);
                        scaleY = Math.max(0.1, (init.box.height - deltaY) / init.box.height);
                    }

                    const avgScale = (scaleX + scaleY) / 2;
                    path.size = Math.max(2, Math.round(init.size * avgScale));

                    path.points = init.points.map(pt => ({
                        x: originX + (pt.x - originX) * scaleX,
                        y: originY + (pt.y - originY) * scaleY
                    }));
                }
            } else {
                const el = activeBoardData.elements?.find(it => it.id === id);
                if (!el) return;

                if (transformAction === 'rotate') {
                    const centerWorldX = init.x + init.width / 2;
                    const centerWorldY = init.y + init.height / 2;

                    const centerScreenX = centerWorldX * viewportScale + viewportPanX + canvasViewport.getBoundingClientRect().left;
                    const centerScreenY = centerWorldY * viewportScale + viewportPanY + canvasViewport.getBoundingClientRect().top;

                    const startAngle = Math.atan2(dragStartY - centerScreenY, dragStartX - centerScreenX);
                    const currentAngle = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX);

                    let newRot = init.rotation + (currentAngle - startAngle) * (180 / Math.PI);
                    if (e.shiftKey) newRot = Math.round(newRot / 15) * 15;

                    el.rotation = Math.round(newRot % 360);

                    const domEl = elementsContainer.querySelector(`[data-id="${id}"]`);
                    if (domEl) {
                        domEl.style.transform = `rotate(${el.rotation}deg)`;
                        domEl.dataset.rotation = el.rotation;
                    }
                } else {
                    let newX = init.x;
                    let newY = init.y;
                    let newW = init.width;
                    let newH = init.height;

                    if (transformAction === 'se') {
                        newW = Math.max(40, init.width + deltaX);
                        newH = Math.max(40, init.height + deltaY);
                    } else if (transformAction === 'sw') {
                        newW = Math.max(40, init.width - deltaX);
                        newX = init.x + (init.width - newW);
                        newH = Math.max(40, init.height + deltaY);
                    } else if (transformAction === 'ne') {
                        newW = Math.max(40, init.width + deltaX);
                        newH = Math.max(40, init.height - deltaY);
                        newY = init.y + (init.height - newH);
                    } else if (transformAction === 'nw') {
                        newW = Math.max(40, init.width - deltaX);
                        newX = init.x + (init.width - newW);
                        newH = Math.max(40, init.height - deltaY);
                        newY = init.y + (init.height - newH);
                    }

                    el.x = newX;
                    el.y = newY;
                    el.width = newW;
                    el.height = newH;

                    const domEl = elementsContainer.querySelector(`[data-id="${id}"]`);
                    if (domEl) {
                        domEl.style.left = `${el.x}px`;
                        domEl.style.top = `${el.y}px`;
                        domEl.style.width = `${el.width}px`;
                        domEl.style.height = `${el.height}px`;
                    }
                }
            }
        });

        renderDrawingPaths(activeBoardData.drawingPaths);
        updateDrawingSelectionBoxes();
    };

    const endElementTransform = async () => {
        if (!isTransformingElement) return;
        isTransformingElement = false;

        const elemChanges = [];
        const drawChanges = [];

        selectedElementIds.forEach(id => {
            const init = initialSelectedItemsState.get(id);
            if (!init) return;

            if (init.isDrawing) {
                const path = activeBoardData.drawingPaths?.find(p => p.id === id);
                if (path && init.points) {
                    drawChanges.push({
                        id,
                        fromPoints: init.points.map(pt => ({ ...pt })),
                        toPoints: path.points.map(pt => ({ ...pt })),
                        fromSize: init.size,
                        toSize: path.size
                    });
                }
            } else {
                const el = activeBoardData.elements?.find(it => it.id === id);
                if (el) {
                    elemChanges.push({
                        id,
                        from: { x: init.x, y: init.y, width: init.width, height: init.height, rotation: init.rotation },
                        to: { x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation }
                    });
                }
            }
        });

        if (elemChanges.length > 0 || drawChanges.length > 0) {
            recordAction({ type: 'TRANSFORM_ITEMS', elements: elemChanges, drawings: drawChanges });
            await queueSaveBoard();
        }
    };

    // --- Delete Selected Elements ---
    const deleteSelectedElements = async () => {
        if (selectedElementIds.size === 0 || !activeBoardData) return;

        const deletedElems = [];
        const deletedDrawings = [];

        selectedElementIds.forEach(id => {
            const elemIdx = (activeBoardData.elements || []).findIndex(e => e.id === id);
            if (elemIdx !== -1) {
                deletedElems.push(activeBoardData.elements[elemIdx]);
                activeBoardData.elements.splice(elemIdx, 1);
            } else {
                const drawIdx = (activeBoardData.drawingPaths || []).findIndex(p => p.id === id);
                if (drawIdx !== -1) {
                    deletedDrawings.push(activeBoardData.drawingPaths[drawIdx]);
                    activeBoardData.drawingPaths.splice(drawIdx, 1);
                }
            }
        });

        recordAction({ type: 'DELETE_ITEMS', elements: deletedElems, drawings: deletedDrawings });
        deselectAll();
        renderCanvasElements(activeBoardData.elements);
        renderDrawingPaths(activeBoardData.drawingPaths);
        await queueSaveBoard();
        showToast('Selected item(s) deleted.');
    };

    // --- Adding New Elements ---
    const addNewTextElement = async () => {
        if (!activeBoardData) {
            activeBoardData = getOrCreateLocalBoard();
            activeBoardId = activeBoardData.id;
        }

        const vpRect = canvasViewport.getBoundingClientRect();
        const centerWorld = screenToWorld(vpRect.left + vpRect.width / 2, vpRect.top + vpRect.height / 2);

        const newEl = {
            id: 'text_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            type: 'text',
            content: '',
            x: Math.round(centerWorld.x - 120),
            y: Math.round(centerWorld.y - 100),
            width: 240,
            height: 200,
            rotation: 0,
            stylePreset: 'note-dark',
            fontSize: 14,
            fontBold: false,
            fontItalic: false
        };

        if (!activeBoardData.elements) activeBoardData.elements = [];
        activeBoardData.elements.push(newEl);
        recordAction({ type: 'ADD_ELEMENT', element: { ...newEl } });
        renderCanvasElements(activeBoardData.elements);
        selectElement(newEl.id);

        setTimeout(() => {
            const domEl = elementsContainer.querySelector(`[data-id="${newEl.id}"] .editable-text`);
            if (domEl) domEl.focus();
        }, 50);

        await queueSaveBoard();
    };

    if (toolAddText) {
        toolAddText.addEventListener('click', addNewTextElement);
    }

    // Add Photo Modal
    if (toolAddPhoto) {
        toolAddPhoto.addEventListener('click', () => {
            openModal(modalAddPhoto);
            loadPhotoshootLibrary();
        });
    }

    // Modal Tabs
    document.querySelectorAll('.picker-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.picker-tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.dataset.tab;
            document.getElementById('tab-content-photoshoots').style.display = tabName === 'photoshoots' ? 'block' : 'none';
            document.getElementById('tab-content-url').style.display = tabName === 'url' ? 'block' : 'none';
            document.getElementById('tab-content-upload').style.display = tabName === 'upload' ? 'block' : 'none';
        });
    });

    // Photoshoot Explorer
    let loadedPhotoshoots = [];
    const loadPhotoshootLibrary = async () => {
        if (loadedPhotoshoots.length > 0) return;
        pickerPhotosGrid.innerHTML = '<div style="color:var(--mb-text-muted); grid-column:1/-1; text-align:center; padding:2rem;">Loading photoshoot references...</div>';

        try {
            const snap = await getDocs(collection(db, 'photoshoots'));
            loadedPhotoshoots = [];
            photoshootCategoryFilter.innerHTML = '<option value="all">All Photoshoots</option>';

            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.images && data.images.length > 0) {
                    loadedPhotoshoots.push({ id: docSnap.id, title: data.title || 'Untitled', images: data.images });
                    const opt = document.createElement('option');
                    opt.value = docSnap.id;
                    opt.textContent = data.title || 'Untitled';
                    photoshootCategoryFilter.appendChild(opt);
                }
            });

            renderPhotoshootGrid('all');
        } catch (err) {
            console.error("Error loading photoshoots:", err);
            pickerPhotosGrid.innerHTML = '<div style="color:var(--mb-danger); grid-column:1/-1; text-align:center;">Failed to load photoshoots.</div>';
        }
    };

    const renderPhotoshootGrid = (filterId) => {
        pickerPhotosGrid.innerHTML = '';
        let count = 0;

        loadedPhotoshoots.forEach(set => {
            if (filterId !== 'all' && set.id !== filterId) return;

            set.images.forEach(imgUrl => {
                count++;
                const item = document.createElement('div');
                item.className = 'picker-photo-item';
                item.innerHTML = `<img src="${imgUrl}" alt="Photoshoot Reference" loading="lazy">`;
                item.addEventListener('click', () => {
                    insertImageToCanvas(imgUrl);
                    closeModal(modalAddPhoto);
                });
                pickerPhotosGrid.appendChild(item);
            });
        });

        photoshootCountBadge.textContent = `${count} photo${count === 1 ? '' : 's'}`;
    };

    if (photoshootCategoryFilter) {
        photoshootCategoryFilter.addEventListener('change', (e) => {
            renderPhotoshootGrid(e.target.value);
        });
    }

    // Direct Image URL Insert
    if (inputImgUrl) {
        inputImgUrl.addEventListener('input', () => {
            const url = inputImgUrl.value.trim();
            const previewBox = document.getElementById('url-preview-box');
            const previewImg = document.getElementById('url-preview-img');
            if (url) {
                previewImg.src = url;
                previewBox.style.display = 'block';
            } else {
                previewBox.style.display = 'none';
            }
        });
    }

    if (btnInsertUrlImg) {
        btnInsertUrlImg.addEventListener('click', () => {
            const url = inputImgUrl.value.trim();
            if (url) {
                insertImageToCanvas(url);
                closeModal(modalAddPhoto);
                inputImgUrl.value = '';
                document.getElementById('url-preview-box').style.display = 'none';
            }
        });
    }

    // Local Image File Upload (ImgBB)
    if (inputFileLocal) {
        inputFileLocal.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uploadStatusText.style.display = 'block';
            uploadStatusText.textContent = 'Uploading image, please wait...';

            try {
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch('https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY_HERE', {
                    method: 'POST',
                    body: formData
                });

                const resData = await response.json();
                if (resData && resData.data && resData.data.url) {
                    insertImageToCanvas(resData.data.url);
                    closeModal(modalAddPhoto);
                    uploadStatusText.style.display = 'none';
                    inputFileLocal.value = '';
                } else {
                    uploadStatusText.textContent = 'Upload failed. Please try again.';
                }
            } catch (err) {
                console.error("Local file upload error:", err);
                uploadStatusText.textContent = 'Upload error. Please check internet connection.';
            }
        });
    }

    const insertImageToCanvas = async (url) => {
        if (!activeBoardData) {
            activeBoardData = getOrCreateLocalBoard();
            activeBoardId = activeBoardData.id;
        }

        const vpRect = canvasViewport.getBoundingClientRect();
        const centerWorld = screenToWorld(vpRect.left + vpRect.width / 2, vpRect.top + vpRect.height / 2);

        // Preload image to get original intrinsic aspect ratio
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });

        let targetW = 320;
        let targetH = 240;
        if (img.width && img.height) {
            const aspect = img.width / img.height;
            targetW = 360;
            targetH = Math.round(360 / aspect);
        }

        const newEl = {
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            type: 'image',
            url: url,
            x: Math.round(centerWorld.x - targetW / 2),
            y: Math.round(centerWorld.y - targetH / 2),
            width: targetW,
            height: targetH,
            rotation: 0
        };

        if (!activeBoardData.elements) activeBoardData.elements = [];
        activeBoardData.elements.push(newEl);
        recordAction({ type: 'ADD_ELEMENT', element: { ...newEl } });
        renderCanvasElements(activeBoardData.elements);
        selectElement(newEl.id);
        await queueSaveBoard();
        showToast('Image added to moodboard!');
    };

    // --- Board Settings & Share Modal ---
    if (btnBoardSettings) {
        btnBoardSettings.addEventListener('click', () => {
            if (!activeBoardData) return;
            settingsBoardTitle.value = activeBoardData.title || '';
            settingsBoardDesc.value = activeBoardData.description || '';
            
            settingViewViaUrl.checked = activeBoardData.viewViaUrl === true || activeBoardData.viewViaUrl === 'true';
            
            const origin = window.location.origin;
            const shareUrl = `${origin}/moodboard/?id=${activeBoardId}`;
            inputShareUrl.value = shareUrl;
            shareLinkBox.style.display = settingViewViaUrl.checked ? 'block' : 'none';

            renderCollaboratorChips();
            openModal(modalBoardSettings);
        });
    }

    if (settingViewViaUrl) {
        settingViewViaUrl.addEventListener('change', (e) => {
            shareLinkBox.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    if (btnCopyShareUrl) {
        btnCopyShareUrl.addEventListener('click', () => {
            inputShareUrl.select();
            navigator.clipboard.writeText(inputShareUrl.value).then(() => {
                showToast('Share link copied to clipboard!');
            });
        });
    }

    const renderCollaboratorChips = () => {
        collabChipsContainer.innerHTML = '';
        const emails = activeBoardData?.trustedEmails || [];

        if (emails.length === 0) {
            collabChipsContainer.innerHTML = '<span style="color:var(--mb-text-muted); font-size:0.85rem;">No trusted collaborators added yet.</span>';
            return;
        }

        emails.forEach(email => {
            const chip = document.createElement('div');
            chip.className = 'collab-chip';
            chip.innerHTML = `
                <span>${escapeHtml(email)}</span>
                <button class="remove-chip-btn" title="Remove collaborator">&times;</button>
            `;

            chip.querySelector('.remove-chip-btn').addEventListener('click', () => {
                activeBoardData.trustedEmails = activeBoardData.trustedEmails.filter(e => e !== email);
                renderCollaboratorChips();
            });

            collabChipsContainer.appendChild(chip);
        });
    };

    if (btnAddCollabEmail) {
        btnAddCollabEmail.addEventListener('click', () => {
            const email = inputAddCollabEmail.value.trim().toLowerCase();
            if (email && email.includes('@')) {
                if (!activeBoardData.trustedEmails) activeBoardData.trustedEmails = [];
                if (!activeBoardData.trustedEmails.includes(email)) {
                    activeBoardData.trustedEmails.push(email);
                    inputAddCollabEmail.value = '';
                    renderCollaboratorChips();
                }
            }
        });
    }

    if (btnSaveBoardSettings) {
        btnSaveBoardSettings.addEventListener('click', async () => {
            if (!activeBoardData || !activeBoardId) return;

            activeBoardData.title = settingsBoardTitle.value.trim() || 'Untitled Board';
            activeBoardData.description = settingsBoardDesc.value.trim();
            activeBoardData.viewViaUrl = settingViewViaUrl.checked;

            activeBoardTitle.textContent = activeBoardData.title;

            try {
                await updateDoc(doc(db, 'moodboards', activeBoardId), {
                    title: activeBoardData.title,
                    description: activeBoardData.description,
                    trustedEmails: activeBoardData.trustedEmails || [],
                    viewViaUrl: activeBoardData.viewViaUrl,
                    updatedAt: new Date().toISOString()
                });

                closeModal(modalBoardSettings);
                showToast('Board settings updated!');
            } catch (err) {
                console.error("Error saving board settings:", err);
                showToast('Error saving board settings.');
            }
        });
    }

    // --- Persistence & Firestore Saving ---
    const getOrCreateLocalBoard = () => {
        return {
            id: 'local_' + Date.now(),
            title: 'Guest Moodboard',
            description: 'Local session moodboard',
            elements: [],
            drawingPaths: []
        };
    };

    const cleanAndSaveBoard = async () => {
        if (!activeBoardId || !activeBoardData) return;

        // Clean out invalid entries
        activeBoardData.elements = (activeBoardData.elements || []).filter(el => el && el.id && isFinite(el.x) && isFinite(el.y));
        activeBoardData.drawingPaths = (activeBoardData.drawingPaths || []).filter(p => p && p.id && Array.isArray(p.points));

        if (activeBoardId.startsWith('local_')) return;

        try {
            await updateDoc(doc(db, 'moodboards', activeBoardId), {
                elements: activeBoardData.elements,
                drawingPaths: activeBoardData.drawingPaths,
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error("Error saving moodboard to Firestore:", err);
        }
    };

    const queueSaveBoard = async () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            await cleanAndSaveBoard();
        }, 400);
    };

    // Helper: Escape HTML
    function escapeHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
});