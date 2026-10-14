import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";
import { getCachedData, setCachedData, invalidateCache, isDataEqual, registerSiteServiceWorker } from "../site-cache.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Application State
let currentUser = null;
let currentIsAdmin = localStorage.getItem('zhukov_is_admin') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    registerSiteServiceWorker();

    // DOM Elements
    const boardsGrid = document.getElementById('boards-grid');
    const btnCreateBoard = document.getElementById('btn-create-board');
    const authNotice = document.getElementById('auth-notice');
    const emptyBoardsNotice = document.getElementById('empty-boards-notice');
    const noAccessNotice = document.getElementById('no-access-notice');
    const modalCreateBoard = document.getElementById('modal-create-board');
    const btnSubmitCreateBoard = document.getElementById('btn-submit-create-board');
    const newBoardTitle = document.getElementById('new-board-title');
    const newBoardDesc = document.getElementById('new-board-desc');
    const newBoardCollabs = document.getElementById('new-board-collabs');

    // Toast Notification Banner
    const showToast = (message) => {
        const toast = document.getElementById('mb-toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3200);
    };

    // Modal Helpers
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

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Render Dashboard Cards
    const renderDashboardCards = (userBoards) => {
        boardsGrid.innerHTML = '';

        if (!userBoards || userBoards.length === 0) {
            if (currentIsAdmin) {
                emptyBoardsNotice.classList.remove('hidden');
                if (noAccessNotice) noAccessNotice.classList.add('hidden');
            } else {
                emptyBoardsNotice.classList.add('hidden');
                if (noAccessNotice) {
                    const emailSpan = document.getElementById('no-access-user-email');
                    if (emailSpan && currentUser) emailSpan.textContent = currentUser.email || '';
                    noAccessNotice.classList.remove('hidden');
                }
            }
            return;
        } else {
            emptyBoardsNotice.classList.add('hidden');
            if (noAccessNotice) noAccessNotice.classList.add('hidden');
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

            // Click to open moodboard on the moodboard workspace page
            card.addEventListener('click', (e) => {
                if (e.target.closest('.delete-board-btn')) return;
                window.location.href = `/moodboard/?id=${encodeURIComponent(board.id)}`;
            });

            // Admin delete handler
            if (currentIsAdmin) {
                const deleteBtn = card.querySelector('.delete-board-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const confirmed = window.showConfirmModal ? await window.showConfirmModal({
                            title: "Delete Moodboard",
                            message: `Are you sure you want to permanently delete the moodboard "${board.title}"?`,
                            confirmText: "Delete Moodboard",
                            confirmVariant: "red"
                        }) : confirm(`Are you sure you want to permanently delete the moodboard "${board.title}"?`);
                        if (confirmed) {
                            try {
                                invalidateCache('moodboard_');
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
    };

    const loadDashboardBoards = async () => {
        if (!currentUser) return;
        const cacheKey = `moodboard_dashboard_${currentUser.uid}_admin_${currentIsAdmin}`;

        // 1. Instant Cache Render
        const cached = getCachedData(cacheKey);
        if (cached && Array.isArray(cached)) {
            renderDashboardCards(cached);
        } else {
            boardsGrid.innerHTML = '<div style="color: var(--mb-text-muted); font-size: 1.1rem; grid-column: 1/-1; text-align: center; padding: 2rem;">Loading moodboards...</div>';
        }

        try {
            const boardsCol = collection(db, 'moodboards');
            const snap = await getDocs(boardsCol);
            const userBoards = [];

            snap.forEach(docSnap => {
                const data = docSnap.data();
                const trustedUsers = data.trustedUsers || [];
                const trustedEmails = (data.trustedEmails || []).map(e => (e || '').toLowerCase());
                const userEmail = (currentUser.email || '').toLowerCase();

                // Admin sees all. Regular user sees if in trustedUsers, trustedEmails, or creator
                if (currentIsAdmin || trustedUsers.includes(currentUser.uid) || trustedEmails.includes(userEmail) || data.creatorUid === currentUser.uid || (data.creatorEmail && data.creatorEmail.toLowerCase() === userEmail)) {
                    userBoards.push({ id: docSnap.id, ...data });
                }
            });

            // Update moodboard permission state
            const hasAccess = Boolean(currentIsAdmin || userBoards.length > 0);
            if (hasAccess) {
                localStorage.setItem('zhukov_has_moodboards', 'true');
            } else {
                localStorage.removeItem('zhukov_has_moodboards');
            }
            if (window.updateHeaderAuthState) {
                window.updateHeaderAuthState(currentUser, currentIsAdmin, hasAccess);
            }

            if (!isDataEqual(cached, userBoards)) {
                setCachedData(cacheKey, userBoards);
                renderDashboardCards(userBoards);
            } else {
                setCachedData(cacheKey, userBoards);
            }
        } catch (err) {
            console.error("Error loading moodboards:", err);
            if (!cached) {
                boardsGrid.innerHTML = '<div style="color: var(--mb-danger); grid-column: 1/-1; text-align: center; padding: 2rem;">Error loading moodboards. Please check your permissions.</div>';
            }
        }
    };

    // --- Create Moodboard (Admin only) ---
    if (btnCreateBoard) {
        btnCreateBoard.addEventListener('click', () => {
            newBoardTitle.value = '';
            newBoardDesc.value = '';
            newBoardCollabs.value = '';
            openModal(modalCreateBoard);
        });
    }

    if (btnSubmitCreateBoard) {
        btnSubmitCreateBoard.addEventListener('click', async () => {
            const title = newBoardTitle.value.trim();
            if (!title) {
                alert('Please enter a moodboard title.');
                return;
            }

            const description = newBoardDesc.value.trim();
            const emailsRaw = newBoardCollabs.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

            try {
                invalidateCache('moodboard_');
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
                // Open new moodboard directly on the moodboard workspace page
                window.location.href = `/moodboard/?id=${encodeURIComponent(newDocRef.id)}`;
            } catch (err) {
                console.error("Error creating moodboard:", err);
                showToast('Error creating moodboard.');
            }
        });
    }

    // --- Auth Management ---
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;

        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');

            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                currentIsAdmin = userSnap.exists() && userSnap.data().role === 'admin';
            } catch (err) {
                console.error("User role check failed:", err);
                currentIsAdmin = false;
            }

            localStorage.setItem('zhukov_is_admin', currentIsAdmin ? 'true' : 'false');

            if (window.updateHeaderAuthState) {
                window.updateHeaderAuthState(user, currentIsAdmin);
            }

            if (btnCreateBoard) {
                if (currentIsAdmin) {
                    btnCreateBoard.classList.remove('hidden');
                } else {
                    btnCreateBoard.classList.add('hidden');
                }
            }

            if (authNotice) authNotice.classList.add('hidden');
            loadDashboardBoards();
        } else {
            localStorage.removeItem('zhukov_logged_in');
            localStorage.removeItem('zhukov_is_admin');
            localStorage.removeItem('zhukov_has_moodboards');
            currentUser = null;
            currentIsAdmin = false;
            if (window.updateHeaderAuthState) {
                window.updateHeaderAuthState(null, false, false);
            }
            if (btnCreateBoard) btnCreateBoard.classList.add('hidden');

            boardsGrid.innerHTML = '';
            if (authNotice) authNotice.classList.remove('hidden');
            if (emptyBoardsNotice) emptyBoardsNotice.classList.add('hidden');
            if (noAccessNotice) noAccessNotice.classList.add('hidden');
        }
    });

    // Delegated click listeners for header and dashboard auth buttons
    document.addEventListener('click', (e) => {
        const loginTarget = e.target.closest('#login-btn-header') || e.target.closest('#btn-auth-notice-login');
        if (loginTarget) {
            localStorage.setItem('zhukov_logged_in', 'true');
            signInWithPopup(auth, provider).catch(console.error);
        }

        const logoutTarget = e.target.closest('#logout-btn');
        if (logoutTarget) {
            signOut(auth).catch(console.error);
        }
    });
});
