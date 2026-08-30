// Age Verification Module with 12-hour local storage expiration
const AGE_KEY = 'zhukov_age_verified';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export const getAgeVerificationStatus = () => {
    try {
        const raw = localStorage.getItem(AGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || typeof data.timestamp !== 'number') {
            localStorage.removeItem(AGE_KEY);
            return null;
        }
        if (Date.now() - data.timestamp > TWELVE_HOURS_MS) {
            localStorage.removeItem(AGE_KEY);
            return null; // Expired after 12 hours
        }
        return data.isAdult === true;
    } catch (e) {
        localStorage.removeItem(AGE_KEY);
        return null;
    }
};

export const setAgeVerificationStatus = (isAdult) => {
    try {
        localStorage.setItem(AGE_KEY, JSON.stringify({
            isAdult: Boolean(isAdult),
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Failed to save age verification:', e);
    }
};

export const showAgeGateModal = () => {
    return new Promise((resolve) => {
        let existingModal = document.getElementById('age-gate-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'age-gate-modal';
        modal.className = 'age-gate-overlay';
        modal.innerHTML = `
            <div class="age-gate-card">
                <div class="age-gate-badge">18+</div>
                <h2 class="age-gate-title">Age Verification</h2>
                <p class="age-gate-desc">This section may contain adult and artistic mature photography. Are you at least 18 years old?</p>
                <div class="age-gate-actions">
                    <button id="age-gate-yes" class="age-btn age-btn-yes">Yes, I am 18+</button>
                    <button id="age-gate-no" class="age-btn age-btn-no">No, I am under 18</button>
                </div>
                <p class="age-gate-note">Your preference will be remembered on this device for 12 hours.</p>
            </div>
        `;

        document.body.appendChild(modal);

        // Animate entrance
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        const handleChoice = (isAdult) => {
            setAgeVerificationStatus(isAdult);
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                resolve(isAdult);
            }, 300);
        };

        modal.querySelector('#age-gate-yes').addEventListener('click', () => handleChoice(true));
        modal.querySelector('#age-gate-no').addEventListener('click', () => handleChoice(false));
    });
};

export const ensureAgeVerification = async () => {
    const currentStatus = getAgeVerificationStatus();
    if (currentStatus !== null) {
        return currentStatus;
    }
    return await showAgeGateModal();
};
