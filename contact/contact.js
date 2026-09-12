// =========================================================================
// ZHUKOV Studio — Studio Availability Calendar & Contact Controller
// =========================================================================

import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";
import { getCachedData, setCachedData } from "../site-cache.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Calendar State
const MONTH_NAMES = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const CAL_CACHE_KEY = 'zhukov_calendar_availability_v2';

let displayedYear = new Date().getFullYear();
let displayedMonth = new Date().getMonth(); // 0-indexed

// In-Modal Calendar State
let modalDisplayedYear = new Date().getFullYear();
let modalDisplayedMonth = new Date().getMonth();
let selectedBookingDate = null;
let modalViewHistory = [];
let activeTopicKey = null;

// Availability Sets
let unavailableDates = new Set(); // Specific ISO format dates: 'YYYY-MM-DD'
let disabledWeekdays = new Set(); // Day of week numbers: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
let availableOverrides = new Set(); // Specific dates that are OPEN even if weekday is disabled

let isAdmin = false;

// Drag & Bulk Edit State
let isDragging = false;
let dragTargetState = null; // true: mark unavailable (booked); false: mark available (free)
let dragModifiedDates = new Set();
let dragStartX = 0;
let dragStartY = 0;
let toastTimeout = null;

// UI DOM References - Main Page
let daysGrid = null;
let monthHeading = null;
let prevBtn = null;
let nextBtn = null;
let todayBtn = null;
let adminBadge = null;
let adminHint = null;
let recurringBar = null;
let recurringTogglesContainer = null;
let weekdaysHeader = null;
let toastEl = null;
let mainCalSelectedDate = null;
let mainCalActionBar = null;
let mainCalSelectedText = null;
let mainCalConfirmBtn = null;

// UI DOM References - Contact Modal
let contactModal = null;
let modalBackBtn = null;
let modalCloseBtn = null;
let modalStepIndicator = null;
let topicsView = null;
let calendarView = null;
let modalCalDaysGrid = null;
let modalCalMonthHeading = null;
let modalCalPrevBtn = null;
let modalCalNextBtn = null;
let modalCalTodayBtn = null;
let modalSelectedDateText = null;
let modalConfirmDateBtn = null;

// ── Pre-Written Email Templates ─────────────────────────────────────────
const EMAIL_TEMPLATES = {
    info: {
        kicker: 'GENERAL INQUIRY',
        headline: 'GET INFORMATION',
        subject: 'General question',
        body: `Hello Stanislav,

I would like to request further information regarding your photography services:

- Inquiry Category: [Commercial Rates / Editorial Concepts / Location Scouting / Private Shoot]
- Project / Brand: [Your Name or Organization]
- Estimated Timeline: [e.g. October 2026 / Winter Season]

Specific Questions:
[Please write your questions or project vision here]

Best regards,
[Your Name]
[Your Phone / Website]`
    },
    booking: {
        kicker: 'PHOTOSHOOT RESERVATION',
        headline: 'BOOK A PHOTOSHOOT',
        subject: (dateKey) => `Photoshoot Booking Request — ${dateKey || '[Date]'}`,
        body: (dateKey) => `Hello Stanislav,

I would like to book a photoshoot session with you on: ${dateKey || '[Selected Date]'}

Session Specifications:
- Shoot Type: [High-Fashion Editorial / Commercial Campaign / Private Portrait / Lookbook]
- Preferred Location: [Studio / Outdoor Natural Light / On-Location]
- Estimated Duration: [Half-Day (4 Hours) / Full-Day (8 Hours)]
- Creative Direction / Mood: [Brief concept description, references, or moodboard link]

Contact Details:
- Client / Brand: [Your Name or Brand Name]
- Telephone / WhatsApp: [Your Phone Number]

Looking forward to confirming date availability and production logistics.

Best regards,
[Your Name]`
    },
    bug: {
        kicker: 'TECHNICAL REPORT',
        headline: 'BUG REPORT',
        subject: 'Technical Report: Website Issue on zhukov.studio',
        body: `Hello Stanislav & Web Team,

I encountered an issue while browsing zhukov.studio:

- Page URL: ${window.location.href}
- Device / Operating System: [e.g. iPhone iOS 18 / Windows 11 PC / macOS]
- Browser: [e.g. Safari / Google Chrome / Firefox]

Problem Summary:
[Describe the bug, glitch, or broken behavior here]

Steps to Reproduce:
1. 
2. 
3. 

Expected Behavior:
[What did you expect to happen?]

Thank you,
[Your Name]`
    },
    legal: {
        kicker: 'LEGAL & ADMINISTRATIVE',
        headline: 'LEGAL REQUEST',
        subject: 'Legal Communication / Rights Notice — ZHUKOV Photography',
        body: `To: Stanislav Zhukov (ZHUKOV Photography Studio)

I am submitting a formal legal or administrative inquiry regarding:

- Subject Matter: [DDG § 5 Notice / Copyright & Image Rights / Licensing Request / Data Privacy / Other]
- Inquiring Party / Entity: [Full Legal Name / Company / Legal Representation]
- Relevant Content or URL: [Link to image, webpage, or specific publication]

Statement of Request / Notice:
[Please detail the context, legal basis, and specific details of this communication]

Official Contact Details:
- Mailing Address: [Street, Postal Code, City, Country]
- Telephone: [Official Phone Number]
- Email Address: [Official Contact Email]

Sincerely,
[Full Legal Name]
[Title / Legal Representation]`
    }
};

// ── Toast Notification ──────────────────────────────────────────────────
function showToast(message, isError = false) {
    if (!toastEl) return;
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.style.background = isError ? '#991b1b' : '#000000';
    toastEl.classList.remove('hidden');
    // Force reflow
    void toastEl.offsetWidth;
    toastEl.classList.add('show');

    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => {
            if (!toastEl.classList.contains('show')) {
                toastEl.classList.add('hidden');
            }
        }, 250);
    }, 2800);
}

// ── Date Formatting & Availability Checkers ─────────────────────────────
function formatDateKey(year, month, day) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

function getTodayKey() {
    const now = new Date();
    return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDayOfWeekFromKey(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
}

/**
 * Checks if a specific date is unavailable (booked or recurringly closed).
 * Priority:
 * 1. availableOverrides -> if present, date is FREE/OPEN (overrides weekday setting)
 * 2. unavailableDates -> if present, date is BOOKED/CLOSED
 * 3. disabledWeekdays -> if day of week is closed, date is BOOKED/CLOSED
 * 4. Otherwise -> date is OPEN
 */
function isDateUnavailable(dateKey) {
    if (availableOverrides.has(dateKey)) {
        return false;
    }
    if (unavailableDates.has(dateKey)) {
        return true;
    }
    const dayOfWeek = getDayOfWeekFromKey(dateKey);
    if (disabledWeekdays.has(dayOfWeek)) {
        return true;
    }
    return false;
}

/**
 * Applies availability state to a specific dateKey.
 */
function setDateAvailability(dateKey, willBeUnavailable) {
    const dayOfWeek = getDayOfWeekFromKey(dateKey);
    const weekdayIsClosed = disabledWeekdays.has(dayOfWeek);

    if (willBeUnavailable) {
        // We want this date to be BOOKED/CLOSED
        if (weekdayIsClosed) {
            // Already closed by weekday rule; remove any open override
            availableOverrides.delete(dateKey);
        } else {
            unavailableDates.add(dateKey);
        }
    } else {
        // We want this date to be FREE/OPEN
        if (weekdayIsClosed) {
            // Weekday is closed, so we add a specific open override for this date
            availableOverrides.add(dateKey);
        } else {
            unavailableDates.delete(dateKey);
        }
    }
}

// ── Main Page Calendar Rendering Engine ─────────────────────────────────
function renderCalendar() {
    if (!daysGrid || !monthHeading) return;

    // Update Month & Year heading (e.g. "OCTOBER 2026")
    monthHeading.textContent = `${MONTH_NAMES[displayedMonth]} ${displayedYear}`;

    // Clean grid
    daysGrid.innerHTML = '';

    const todayKey = getTodayKey();

    // 1st day of displayed month
    const firstDay = new Date(displayedYear, displayedMonth, 1);
    // Monday-first index: Mon=0, Tue=1, ..., Sun=6
    const startDayIndex = (firstDay.getDay() + 6) % 7;

    // Number of days in current month
    const daysInMonth = new Date(displayedYear, displayedMonth + 1, 0).getDate();

    // Number of days in previous month
    const daysInPrevMonth = new Date(displayedYear, displayedMonth, 0).getDate();

    // 1. Previous Month Padding Days
    for (let i = startDayIndex - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const prevMonth = displayedMonth === 0 ? 11 : displayedMonth - 1;
        const prevYear = displayedMonth === 0 ? displayedYear - 1 : displayedYear;
        const dateKey = formatDateKey(prevYear, prevMonth, dayNum);

        const cell = createDayCell(dayNum, dateKey, true, todayKey);
        daysGrid.appendChild(cell);
    }

    // 2. Current Month Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = formatDateKey(displayedYear, displayedMonth, day);
        const cell = createDayCell(day, dateKey, false, todayKey);
        daysGrid.appendChild(cell);
    }

    // 3. Next Month Padding Days (Fill out grid to multiple of 7)
    const totalRendered = startDayIndex + daysInMonth;
    const paddingNeeded = (7 - (totalRendered % 7)) % 7;
    for (let nextDay = 1; nextDay <= paddingNeeded; nextDay++) {
        const nextMonth = displayedMonth === 11 ? 0 : displayedMonth + 1;
        const nextYear = displayedMonth === 11 ? displayedYear + 1 : displayedYear;
        const dateKey = formatDateKey(nextYear, nextMonth, nextDay);

        const cell = createDayCell(nextDay, dateKey, true, todayKey);
        daysGrid.appendChild(cell);
    }

    updateRecurringBarUI();
}

function createDayCell(dayNum, dateKey, isOtherMonth, todayKey) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    cell.dataset.date = dateKey;
    cell.setAttribute('role', 'gridcell');

    const isUnavailable = isDateUnavailable(dateKey);
    const isToday = dateKey === todayKey;
    const isPast = dateKey < todayKey;
    const isSelected = (mainCalSelectedDate === dateKey);

    if (isOtherMonth) cell.classList.add('is-other-month');
    if (isToday) cell.classList.add('is-today');
    if (isPast) cell.classList.add('is-past');
    if (isSelected) cell.classList.add('is-selected');

    if (isUnavailable) {
        cell.classList.add('is-booked');
    } else if (!isPast && !isOtherMonth) {
        cell.classList.add('is-open');
    }

    // Badge label
    let badgeText = 'OPEN';
    if (isUnavailable) {
        badgeText = 'BOOKED';
    } else if (isPast) {
        badgeText = 'PAST';
    } else if (isOtherMonth) {
        badgeText = '';
    }

    if (isSelected) {
        badgeText = 'SELECTED';
    }

    cell.setAttribute('aria-label', `${dateKey}: ${badgeText || 'Date'}`);

    const numSpan = document.createElement('span');
    numSpan.className = 'cal-day-num';
    numSpan.textContent = dayNum;

    cell.appendChild(numSpan);

    return cell;
}

// ── In-Modal Calendar Rendering Engine ──────────────────────────────────
function renderModalCalendar() {
    if (!modalCalDaysGrid || !modalCalMonthHeading) return;

    modalCalMonthHeading.textContent = `${MONTH_NAMES[modalDisplayedMonth]} ${modalDisplayedYear}`;
    modalCalDaysGrid.innerHTML = '';

    const todayKey = getTodayKey();
    const firstDay = new Date(modalDisplayedYear, modalDisplayedMonth, 1);
    const startDayIndex = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(modalDisplayedYear, modalDisplayedMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(modalDisplayedYear, modalDisplayedMonth, 0).getDate();

    // 1. Previous Month Padding Days
    for (let i = startDayIndex - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const prevMonth = modalDisplayedMonth === 0 ? 11 : modalDisplayedMonth - 1;
        const prevYear = modalDisplayedMonth === 0 ? modalDisplayedYear - 1 : modalDisplayedYear;
        const dateKey = formatDateKey(prevYear, prevMonth, dayNum);

        const cell = createModalDayCell(dayNum, dateKey, true, todayKey);
        modalCalDaysGrid.appendChild(cell);
    }

    // 2. Current Month Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = formatDateKey(modalDisplayedYear, modalDisplayedMonth, day);
        const cell = createModalDayCell(day, dateKey, false, todayKey);
        modalCalDaysGrid.appendChild(cell);
    }

    // 3. Next Month Padding Days
    const totalRendered = startDayIndex + daysInMonth;
    const paddingNeeded = (7 - (totalRendered % 7)) % 7;
    for (let nextDay = 1; nextDay <= paddingNeeded; nextDay++) {
        const nextMonth = modalDisplayedMonth === 11 ? 0 : modalDisplayedMonth + 1;
        const nextYear = modalDisplayedMonth === 11 ? modalDisplayedYear + 1 : modalDisplayedYear;
        const dateKey = formatDateKey(nextYear, nextMonth, nextDay);

        const cell = createModalDayCell(nextDay, dateKey, true, todayKey);
        modalCalDaysGrid.appendChild(cell);
    }
}

function createModalDayCell(dayNum, dateKey, isOtherMonth, todayKey) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    cell.dataset.date = dateKey;
    cell.setAttribute('role', 'gridcell');

    const isUnavailable = isDateUnavailable(dateKey);
    const isToday = dateKey === todayKey;
    const isPast = dateKey < todayKey;
    const isSelected = (selectedBookingDate === dateKey);

    if (isOtherMonth) cell.classList.add('is-other-month');
    if (isToday) cell.classList.add('is-today');
    if (isPast) cell.classList.add('is-past');
    if (isSelected) cell.classList.add('is-selected');

    if (isUnavailable) {
        cell.classList.add('is-booked');
    } else if (!isPast && !isOtherMonth) {
        cell.classList.add('is-open');
    }

    let badgeText = 'OPEN';
    if (isUnavailable) {
        badgeText = 'BOOKED';
    } else if (isPast) {
        badgeText = 'PAST';
    } else if (isOtherMonth) {
        badgeText = '';
    }

    cell.setAttribute('aria-label', `${dateKey}: ${badgeText || 'Date'}`);

    const numSpan = document.createElement('span');
    numSpan.className = 'cal-day-num';
    numSpan.textContent = dayNum;

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'cal-day-badge';
    badgeSpan.textContent = isSelected ? 'SELECTED' : badgeText;

    cell.appendChild(numSpan);
    cell.appendChild(badgeSpan);

    // Modal date selection click listener
    cell.addEventListener('click', () => {
        if (isOtherMonth) return;
        if (isPast) {
            showToast("Selected date is in the past.", false);
            return;
        }
        if (isUnavailable) {
            showToast("This date is already booked. Please choose an open date.", false);
            return;
        }

        // Select this date
        selectedBookingDate = dateKey;

        // Format friendly date
        const [y, m, d] = dateKey.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const formattedDate = dt.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (modalSelectedDateText) {
            modalSelectedDateText.textContent = formattedDate;
        }
        if (modalConfirmDateBtn) {
            modalConfirmDateBtn.disabled = false;
        }

        renderModalCalendar();
    });

    return cell;
}

// ── DOM Visual Update Helper for Main Calendar Cell ─────────────────────
function updateCellVisual(cell, dateKey, willBeUnavailable) {
    const todayKey = getTodayKey();
    const isPast = dateKey < todayKey;
    const badgeSpan = cell.querySelector('.cal-day-badge');

    if (willBeUnavailable) {
        cell.classList.remove('is-open');
        cell.classList.add('is-booked');
        if (badgeSpan) badgeSpan.textContent = 'BOOKED';
        cell.setAttribute('aria-label', `${dateKey}: BOOKED`);
    } else {
        cell.classList.remove('is-booked');
        if (!isPast && !cell.classList.contains('is-other-month')) {
            cell.classList.add('is-open');
            if (badgeSpan) badgeSpan.textContent = 'OPEN';
            cell.setAttribute('aria-label', `${dateKey}: OPEN`);
        } else if (isPast) {
            if (badgeSpan) badgeSpan.textContent = 'PAST';
            cell.setAttribute('aria-label', `${dateKey}: PAST`);
        }
    }
}

// ── Update Recurring Weekdays UI Bar & Header ───────────────────────────
function updateRecurringBarUI() {
    // 1. Update toolbar pills
    document.querySelectorAll('.cal-day-pill').forEach(pill => {
        const dayInt = parseInt(pill.dataset.day, 10);
        const isClosed = disabledWeekdays.has(dayInt);
        pill.classList.toggle('is-day-closed', isClosed);
        pill.classList.toggle('is-day-open', !isClosed);
        const shortName = DAY_SHORT[dayInt];
        pill.textContent = isClosed ? `${shortName} ✕` : `${shortName} ✓`;
        pill.title = isClosed
            ? `${DAY_NAMES[dayInt]}s are CLOSED permanently. Click to make OPEN.`
            : `${DAY_NAMES[dayInt]}s are OPEN. Click to make CLOSED permanently.`;
    });

    // 2. Update weekday column header highlights
    document.querySelectorAll('.cal-weekday-col').forEach(col => {
        const dayInt = parseInt(col.dataset.day, 10);
        const isClosed = disabledWeekdays.has(dayInt);
        col.classList.toggle('is-disabled-weekday', isClosed);
        col.title = isClosed
            ? `${DAY_NAMES[dayInt]}s are permanently closed. (Admin: Click to toggle)`
            : `${DAY_NAMES[dayInt]}s are open. (Admin: Click to toggle)`;
    });
}

// ── Toggle Recurring Weekday ────────────────────────────────────────────
async function toggleWeekday(dayInt) {
    if (!isAdmin) return;

    const isCurrentlyClosed = disabledWeekdays.has(dayInt);
    const dayName = DAY_NAMES[dayInt];

    if (isCurrentlyClosed) {
        disabledWeekdays.delete(dayInt);

        // Remove overrides for this day of week as the whole day is now open
        for (const dKey of Array.from(availableOverrides)) {
            if (getDayOfWeekFromKey(dKey) === dayInt) {
                availableOverrides.delete(dKey);
            }
        }
        showToast(`All ${dayName}s set to OPEN permanently`);
    } else {
        disabledWeekdays.add(dayInt);

        // Remove redundant individual unavailable entries for this day of week
        for (const dKey of Array.from(unavailableDates)) {
            if (getDayOfWeekFromKey(dKey) === dayInt) {
                unavailableDates.delete(dKey);
            }
        }
        showToast(`All ${dayName}s set to CLOSED permanently`);
    }

    updateRecurringBarUI();
    renderCalendar();
    renderModalCalendar();
    await saveAvailabilityToFirestore();
}

// ── Firestore Persistence & Sync ────────────────────────────────────────
async function saveAvailabilityToFirestore() {
    try {
        const payload = {
            unavailableDates: Array.from(unavailableDates).sort(),
            disabledWeekdays: Array.from(disabledWeekdays).sort(),
            availableOverrides: Array.from(availableOverrides).sort(),
            updatedAt: new Date().toISOString()
        };

        // Instant local cache save
        setCachedData(CAL_CACHE_KEY, payload);

        // Firestore database commit
        await setDoc(doc(db, 'settings', 'calendar'), payload, { merge: true });
    } catch (err) {
        console.error("Failed to save calendar availability to Firestore:", err);
        showToast("Error saving to database. Check permissions.", true);
    }
}

function initFirestoreSync() {
    // 1. Initial Instant Cache Load (0ms)
    const cached = getCachedData(CAL_CACHE_KEY);
    if (cached) {
        if (Array.isArray(cached.unavailableDates)) {
            unavailableDates = new Set(cached.unavailableDates);
        }
        if (Array.isArray(cached.disabledWeekdays)) {
            disabledWeekdays = new Set(cached.disabledWeekdays.map(Number));
        }
        if (Array.isArray(cached.availableOverrides)) {
            availableOverrides = new Set(cached.availableOverrides);
        }
        renderCalendar();
        renderModalCalendar();
    }

    // 2. Real-time Firestore Listener
    onSnapshot(doc(db, 'settings', 'calendar'), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            // Do not disrupt ongoing drag edit
            if (!isDragging) {
                if (Array.isArray(data.unavailableDates)) {
                    unavailableDates = new Set(data.unavailableDates);
                }
                if (Array.isArray(data.disabledWeekdays)) {
                    disabledWeekdays = new Set(data.disabledWeekdays.map(Number));
                }
                if (Array.isArray(data.availableOverrides)) {
                    availableOverrides = new Set(data.availableOverrides);
                }
                setCachedData(CAL_CACHE_KEY, data);
                renderCalendar();
                renderModalCalendar();
            }
        }
    }, (error) => {
        console.warn("Firestore calendar snapshot subscription notice:", error);
    });
}

// ── Admin Mode State Controller ─────────────────────────────────────────
function setAdminState(active) {
    isAdmin = Boolean(active);
    document.body.classList.toggle('cal-admin-active', isAdmin);

    if (adminBadge) {
        adminBadge.classList.toggle('hidden', !isAdmin);
    }
    if (adminHint) {
        adminHint.classList.toggle('hidden', !isAdmin);
    }
    if (recurringBar) {
        recurringBar.classList.toggle('hidden', !isAdmin);
    }

    // Re-render so cell tooltips and interactions reflect admin status
    renderCalendar();
}

// ── Interaction Engine: Single Click & Hold-and-Drag Bulk Edit ───────────
function initInteractionEngine() {
    if (!daysGrid) return;

    // Pointer Down on a day cell (Mouse click / Pen / Finger touch)
    daysGrid.addEventListener('pointerdown', (e) => {
        const cell = e.target.closest('.cal-day-cell');
        if (!cell) return;

        const dateKey = cell.dataset.date;
        if (!dateKey) return;

        // If NOT admin: Handle visitor click (informational notice, NEVER opens email)
        if (!isAdmin) {
            handleVisitorClick(cell, dateKey);
            return;
        }

        // ADMIN MODE: Start toggle & bulk drag session
        e.preventDefault();

        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const isCurrentlyBooked = isDateUnavailable(dateKey);
        dragTargetState = !isCurrentlyBooked;

        // Apply immediately to the initial clicked date
        setDateAvailability(dateKey, dragTargetState);

        dragModifiedDates = new Set([dateKey]);
        updateCellVisual(cell, dateKey, dragTargetState);
        cell.classList.add('is-drag-active');
    });

    // Pointer Move (Window-level so drag continues smoothly across gaps)
    window.addEventListener('pointermove', (e) => {
        if (!isDragging || !isAdmin) return;

        const hoveredEl = document.elementFromPoint(e.clientX, e.clientY);
        const cell = hoveredEl ? hoveredEl.closest('.cal-day-cell') : null;
        if (!cell) return;

        const dateKey = cell.dataset.date;
        if (!dateKey) return;

        if (!dragModifiedDates.has(dateKey)) {
            dragModifiedDates.add(dateKey);

            setDateAvailability(dateKey, dragTargetState);

            updateCellVisual(cell, dateKey, dragTargetState);
            cell.classList.add('is-drag-active', 'bulk-drag-pulse');
            setTimeout(() => cell.classList.remove('bulk-drag-pulse'), 280);
        }
    });

    // Pointer Up & Cancel (Commit changes upon release)
    const endDragSession = () => {
        if (!isDragging) return;
        isDragging = false;

        document.querySelectorAll('.cal-day-cell.is-drag-active').forEach(el => {
            el.classList.remove('is-drag-active');
        });

        if (dragModifiedDates.size > 0) {
            saveAvailabilityToFirestore();

            const actionText = dragTargetState ? 'booked' : 'open';
            if (dragModifiedDates.size === 1) {
                showToast(`Date marked as ${actionText}`);
            } else {
                showToast(`${dragModifiedDates.size} dates updated to ${actionText}`);
            }
        }

        dragModifiedDates.clear();
        dragTargetState = null;
    };

    window.addEventListener('pointerup', endDragSession);
    window.addEventListener('pointercancel', endDragSession);

    // Recurring Weekday Bar Buttons
    if (recurringTogglesContainer) {
        recurringTogglesContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.cal-day-pill');
            if (!btn) return;
            const dayNum = parseInt(btn.dataset.day, 10);
            toggleWeekday(dayNum);
        });
    }

    // Weekdays Header Column Clicks (Admin Mode)
    if (weekdaysHeader) {
        weekdaysHeader.addEventListener('click', (e) => {
            if (!isAdmin) return;
            const colBtn = e.target.closest('.cal-weekday-col');
            if (!colBtn) return;
            const dayNum = parseInt(colBtn.dataset.day, 10);
            toggleWeekday(dayNum);
        });
    }
}

// ── Visitor Main Calendar Date Click Handler ──────────────────────────
function handleVisitorClick(cell, dateKey) {
    const todayKey = getTodayKey();
    const isPast = dateKey < todayKey;
    const isBooked = isDateUnavailable(dateKey);

    if (isPast) {
        showToast("Selected date is in the past.", false);
        return;
    }

    if (isBooked) {
        showToast("This date is booked / unavailable. Please choose an open date.", false);
        return;
    }

    // Set selected date
    mainCalSelectedDate = dateKey;

    // Highlight cell in daysGrid
    if (daysGrid) {
        daysGrid.querySelectorAll('.cal-day-cell').forEach(c => {
            const isTarget = (c.dataset.date === dateKey);
            c.classList.toggle('is-selected', isTarget);
            const badge = c.querySelector('.cal-day-badge');
            if (badge) {
                if (isTarget) {
                    badge.textContent = 'SELECTED';
                } else if (!c.classList.contains('is-booked') && !c.classList.contains('is-past') && !c.classList.contains('is-other-month')) {
                    badge.textContent = 'OPEN';
                }
            }
        });
    }

    // Format friendly date
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const formattedDate = dt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (mainCalSelectedText) {
        mainCalSelectedText.textContent = formattedDate;
    }
    if (mainCalActionBar) {
        mainCalActionBar.classList.remove('hidden');
        mainCalActionBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ── Direct Email Dispatcher Helper ──────────────────────────────────────
function openEmailClientForTopic(topicKey, chosenDate = null) {
    const template = EMAIL_TEMPLATES[topicKey];
    if (!template) return;

    const subjectStr = typeof template.subject === 'function' ? template.subject(chosenDate) : template.subject;
    const bodyStr = typeof template.body === 'function' ? template.body(chosenDate) : template.body;

    closeContactModal();
    showToast("Opening your email app...");

    const mailtoUri = `mailto:contact@zhukov.studio?subject=${encodeURIComponent(subjectStr)}&body=${encodeURIComponent(bodyStr)}`;
    window.location.href = mailtoUri;
}

// ── Contact Topic Popup Modal Controller ────────────────────────────────
function initContactModal() {
    contactModal = document.getElementById('contact-modal');
    modalBackBtn = document.getElementById('contact-modal-back');
    modalCloseBtn = document.getElementById('contact-modal-close');
    modalStepIndicator = document.getElementById('modal-step-indicator');
    topicsView = document.getElementById('modal-topics-view');
    calendarView = document.getElementById('modal-calendar-view');

    // Modal Calendar Controls
    modalCalDaysGrid = document.getElementById('modal-cal-days-grid');
    modalCalMonthHeading = document.getElementById('modal-cal-month-heading');
    modalCalPrevBtn = document.getElementById('modal-cal-prev-btn');
    modalCalNextBtn = document.getElementById('modal-cal-next-btn');
    modalCalTodayBtn = document.getElementById('modal-cal-today-btn');
    modalSelectedDateText = document.getElementById('modal-selected-date-text');
    modalConfirmDateBtn = document.getElementById('modal-confirm-date-btn');

    // Open Modal Trigger Button
    const contactBtn = document.getElementById('contact-cta-btn');
    if (contactBtn) {
        contactBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openContactModal();
        });
    }

    // Modal Close Triggers
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeContactModal);
    }
    if (contactModal) {
        contactModal.addEventListener('click', (e) => {
            if (e.target === contactModal) {
                closeContactModal();
            }
        });
    }
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && contactModal && !contactModal.classList.contains('hidden')) {
            closeContactModal();
        }
    });

    // Modal Back Button
    if (modalBackBtn) {
        modalBackBtn.addEventListener('click', () => {
            switchModalView('topics');
        });
    }

    // Topic Selection Cards: Click to open email directly (or open calendar for booking)
    document.querySelectorAll('.topic-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const topic = btn.dataset.topic;
            activeTopicKey = topic;

            if (topic === 'booking') {
                // Topic 2: Go to In-Modal Calendar to choose date
                switchModalView('calendar');
            } else {
                // Topic 1, 3, or 4: Open email app directly with tailored pre-written message
                openEmailClientForTopic(topic);
            }
        });
    });

    // In-Modal Calendar Navigation
    if (modalCalPrevBtn) {
        modalCalPrevBtn.addEventListener('click', () => {
            modalDisplayedMonth--;
            if (modalDisplayedMonth < 0) {
                modalDisplayedMonth = 11;
                modalDisplayedYear--;
            }
            renderModalCalendar();
        });
    }
    if (modalCalNextBtn) {
        modalCalNextBtn.addEventListener('click', () => {
            modalDisplayedMonth++;
            if (modalDisplayedMonth > 11) {
                modalDisplayedMonth = 0;
                modalDisplayedYear++;
            }
            renderModalCalendar();
        });
    }
    if (modalCalTodayBtn) {
        modalCalTodayBtn.addEventListener('click', () => {
            const now = new Date();
            modalDisplayedYear = now.getFullYear();
            modalDisplayedMonth = now.getMonth();
            renderModalCalendar();
        });
    }

    // Modal Confirm Date Button: Open email app directly with the chosen date!
    if (modalConfirmDateBtn) {
        modalConfirmDateBtn.addEventListener('click', () => {
            if (!selectedBookingDate) return;
            openEmailClientForTopic('booking', selectedBookingDate);
        });
    }
}

function openContactModal() {
    if (!contactModal) return;
    selectedBookingDate = null;
    if (modalSelectedDateText) modalSelectedDateText.textContent = 'None selected';
    if (modalConfirmDateBtn) modalConfirmDateBtn.disabled = true;

    // Match main calendar's current month
    modalDisplayedYear = displayedYear;
    modalDisplayedMonth = displayedMonth;

    switchModalView('topics');
    contactModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeContactModal() {
    if (!contactModal) return;
    contactModal.classList.add('hidden');
    document.body.style.overflow = '';
}

function switchModalView(viewName) {
    // Hide all view panels
    if (topicsView) topicsView.classList.add('hidden');
    if (calendarView) calendarView.classList.add('hidden');

    if (viewName === 'topics') {
        if (topicsView) topicsView.classList.remove('hidden');
        if (modalStepIndicator) modalStepIndicator.textContent = 'CONTACT INQUIRY';
        if (modalBackBtn) modalBackBtn.classList.add('hidden');
    } else if (viewName === 'calendar') {
        if (calendarView) calendarView.classList.remove('hidden');
        if (modalStepIndicator) modalStepIndicator.textContent = 'CHOOSE A DATE';
        if (modalBackBtn) modalBackBtn.classList.remove('hidden');
        renderModalCalendar();
    }
}

// ── Main Calendar Month Navigation Controls ─────────────────────────────
function initNavigation() {
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            displayedMonth--;
            if (displayedMonth < 0) {
                displayedMonth = 11;
                displayedYear--;
            }
            renderCalendar();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            displayedMonth++;
            if (displayedMonth > 11) {
                displayedMonth = 0;
                displayedYear++;
            }
            renderCalendar();
        });
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            const now = new Date();
            displayedYear = now.getFullYear();
            displayedMonth = now.getMonth();
            renderCalendar();
        });
    }
}

// ── Firebase Authentication & Role Check ────────────────────────────────
function initAuth() {
    // 1. Instant check from localStorage to avoid visual flicker
    const storedLoggedIn = localStorage.getItem('zhukov_logged_in') === 'true';
    const storedIsAdmin = localStorage.getItem('zhukov_is_admin') === 'true';
    if (storedLoggedIn && storedIsAdmin) {
        setAdminState(true);
    }

    // 2. Firebase Auth state listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');
            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists() && userSnap.data().role === 'admin') {
                    localStorage.setItem('zhukov_is_admin', 'true');
                    setAdminState(true);
                    if (window.updateHeaderAuthState) {
                        window.updateHeaderAuthState(user, true);
                    }
                } else {
                    localStorage.removeItem('zhukov_is_admin');
                    setAdminState(false);
                    if (window.updateHeaderAuthState) {
                        window.updateHeaderAuthState(user, false);
                    }
                }
            } catch (error) {
                console.error("Error verifying user permissions:", error);
                setAdminState(false);
                if (window.updateHeaderAuthState) {
                    window.updateHeaderAuthState(user, false);
                }
            }
        } else {
            localStorage.removeItem('zhukov_logged_in');
            localStorage.removeItem('zhukov_is_admin');
            setAdminState(false);
            if (window.updateHeaderAuthState) {
                window.updateHeaderAuthState(null, false);
            }
        }
    });

    // Delegated click listeners for header login/logout
    document.addEventListener('click', (e) => {
        const loginBtn = e.target.closest('#login-btn-header');
        if (loginBtn) {
            localStorage.setItem('zhukov_logged_in', 'true');
            signInWithPopup(auth, provider).catch((err) => {
                console.error("Sign-in error:", err);
            });
        }

        const logoutBtn = e.target.closest('#logout-btn');
        if (logoutBtn) {
            localStorage.removeItem('zhukov_logged_in');
            localStorage.removeItem('zhukov_is_admin');
            signOut(auth).catch((err) => {
                console.error("Sign-out error:", err);
            });
        }
    });
}

// ── Impressum Drawer & Deep Link Controller ─────────────────────────────
function initImpressumDrawer() {
    const checkHash = () => {
        const rawHash = (window.location.hash || '').toLowerCase();
        if (rawHash.includes('impressum') || rawHash.includes('legal')) {
            const drawer = document.getElementById('impressum');
            if (drawer) {
                drawer.open = true;
                setTimeout(() => {
                    drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    };

    // Run on initial load
    checkHash();
    // Run whenever hash changes (e.g. from footer link)
    window.addEventListener('hashchange', checkHash);
}

// ── Application Initialization ──────────────────────────────────────────
function initContactApp() {
    // Cache DOM Elements - Main Page Calendar
    daysGrid = document.getElementById('cal-days-grid');
    monthHeading = document.getElementById('cal-month-heading');
    prevBtn = document.getElementById('cal-prev-btn');
    nextBtn = document.getElementById('cal-next-btn');
    todayBtn = document.getElementById('cal-today-btn');
    adminBadge = document.getElementById('calendar-admin-badge');
    adminHint = document.getElementById('cal-admin-hint');
    recurringBar = document.getElementById('cal-recurring-bar');
    recurringTogglesContainer = document.getElementById('recurring-weekday-toggles');
    weekdaysHeader = document.getElementById('cal-weekdays');
    toastEl = document.getElementById('cal-toast');

    // Main Calendar Action Bar Elements
    mainCalActionBar = document.getElementById('main-cal-action-bar');
    mainCalSelectedText = document.getElementById('main-cal-selected-date-text');
    mainCalConfirmBtn = document.getElementById('main-cal-confirm-btn');

    if (mainCalConfirmBtn) {
        mainCalConfirmBtn.addEventListener('click', () => {
            if (!mainCalSelectedDate) return;
            openEmailClientForTopic('booking', mainCalSelectedDate);
        });
    }

    // Initialize modules
    renderCalendar();
    initNavigation();
    initInteractionEngine();
    initFirestoreSync();
    initAuth();
    initContactModal();
    initImpressumDrawer();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactApp);
} else {
    initContactApp();
}
