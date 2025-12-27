/**
 * SAMD Directory - Authentication System
 * OTP-based phone authentication with real Flask Backend
 */

class AuthController {
    constructor() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.modal = document.getElementById('authModal');
        this.init();
    }

    async init() {
        await this.checkSession();
        this.updateUI();
        this.attachEventListeners();
    }

    async checkSession() {
        try {
            const res = await fetch('/api/current-user');
            const data = await res.json();
            if (data.authenticated) {
                this.isLoggedIn = true;
                this.currentUser = data;
            } else {
                this.isLoggedIn = false;
                this.currentUser = null;
            }
        } catch (e) {
            console.warn("Auth check failed (expected in local file mode):", e.message);
            // Gracefully handle - allow local testing without backend
            this.isLoggedIn = false;
            this.currentUser = null;
        }
    }

    updateUI() {
        const authBtnText = document.getElementById('authBtnText');
        const displayUserName = document.getElementById('displayUserName');

        if (this.isLoggedIn && this.currentUser) {
            // Update Header Name
            if (authBtnText) authBtnText.innerText = this.currentUser.name || 'My Profile';

            // Logged In Modal View
            if (displayUserName) displayUserName.innerText = this.currentUser.name;

            // We do NOT overwrite innerHTML anymore, buttons are static in index.html

        } else {
            if (authBtnText) authBtnText.innerText = 'Login';
        }
    }

    openModal() {
        if (this.modal) {
            this.modal.classList.add('active');
            // Show logged-in step if already authenticated, otherwise show phone step
            this.showStep(this.isLoggedIn ? 'loggedIn' : 'phone');
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    }

    showStep(step) {
        // Hide all steps
        const steps = ['phoneStep', 'otpStep', 'loggedInStep'];
        steps.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.style.display = 'none';
        });

        // Show requested step
        const stepMap = {
            'phone': 'phoneStep',
            'otp': 'otpStep',
            'loggedIn': 'loggedInStep'
        };
        const targetStep = document.getElementById(stepMap[step]);
        if (targetStep) targetStep.style.display = 'block';
    }

    attachEventListeners() {
        // Open modal on login button click
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            authBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isLoggedIn) {
                    this.showStep('loggedIn');
                }
                this.openModal();
            });
        }

        // Close modal button
        const closeAuthModal = document.getElementById('closeAuthModal');
        if (closeAuthModal) {
            closeAuthModal.addEventListener('click', () => this.closeModal());
        }

        // Close modal when clicking outside
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Phone form submission
        const phoneForm = document.getElementById('phoneForm');
        if (phoneForm) {
            phoneForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendOTP();
            });
        }

        // OTP form submission
        const otpForm = document.getElementById('otpForm');
        if (otpForm) {
            otpForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.verifyOTP();
            });
        }

        // OTP digit auto-focus
        const otpDigits = document.querySelectorAll('.otp-digit');
        otpDigits.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < otpDigits.length - 1) {
                    otpDigits[index + 1].focus();
                }
                // Enable verify button when all digits filled
                const allFilled = Array.from(otpDigits).every(i => i.value.length === 1);
                const verifyBtn = document.getElementById('verifyOtpBtn');
                if (verifyBtn) verifyBtn.disabled = !allFilled;
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    otpDigits[index - 1].focus();
                }
            });
        });

        // Change phone button
        const changePhoneBtn = document.getElementById('changePhoneBtn');
        if (changePhoneBtn) {
            changePhoneBtn.addEventListener('click', () => this.showStep('phone'));
        }

        // Resend OTP button
        const resendOtpBtn = document.getElementById('resendOtpBtn');
        if (resendOtpBtn) {
            resendOtpBtn.addEventListener('click', () => this.sendOTP());
        }
    }

    async sendOTP() {
        const phoneInput = document.getElementById('phoneInput');
        if (!phoneInput || !phoneInput.value) return;

        const phone = '+91' + phoneInput.value;

        try {
            const res = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });

            const data = await res.json();

            if (data.success) {
                showToast(data.message || 'OTP sent successfully!', 'success');

                // ⚠️ DEVELOPMENT MODE: Show OTP in popup
                // 🚨 WARNING: REMOVE THIS BLOCK BEFORE PRODUCTION! 🚨
                if (data.dev_otp) {
                    // Show OTP in alert for easy testing
                    alert(`🔑 DEVELOPMENT MODE\n\nYour OTP is: ${data.dev_otp}\n\n⚠️ This popup will be removed in production!`);

                    // Auto-fill OTP for convenience
                    const otpInputs = document.querySelectorAll('.otp-digit');
                    const otpDigits = data.dev_otp.toString().split('');
                    otpInputs.forEach((input, index) => {
                        if (otpDigits[index]) {
                            input.value = otpDigits[index];
                        }
                    });
                    // Auto-focus the verify button
                    setTimeout(() => {
                        const verifyBtn = document.querySelector('#otpView button[type="submit"]');
                        if (verifyBtn) verifyBtn.focus();
                    }, 100);
                }
                // 🚨 END OF DEVELOPMENT-ONLY CODE - REMOVE ABOVE BLOCK IN PRODUCTION

                const displayPhone = document.getElementById('displayPhone');
                if (displayPhone) displayPhone.textContent = phone;
                this.showStep('otp');
            } else {
                showToast('Failed to send OTP: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (e) {
            console.error('Send OTP error:', e);
            alert('Network error. Please check your connection.');
        }
    }

    async verifyOTP() {
        const phoneInput = document.getElementById('phoneInput');
        const otpDigits = document.querySelectorAll('.otp-digit');

        if (!phoneInput || otpDigits.length === 0) return;

        const phone = '+91' + phoneInput.value;
        const code = Array.from(otpDigits).map(i => i.value).join('');

        console.log('Verifying OTP:', { phone, code }); // Debug log

        try {
            const res = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code }) // Send 'code' instead of 'otp'
            });

            const data = await res.json();

            if (data.success) {
                this.isLoggedIn = true;
                this.currentUser = data.user;
                this.updateUI();
                this.closeModal();
                location.reload(); // Refresh to update UI
            } else {
                alert('Invalid OTP: ' + (data.message || 'Please try again'));
            }
        } catch (e) {
            console.error('Verify OTP error:', e);
            alert('Network error. Please check your connection.');
        }
    }

    async logout() {
        await fetch('/logout');
        window.location.reload();
    }
}

// Global Init
let authController;
document.addEventListener('DOMContentLoaded', () => {
    authController = new AuthController();
    window.authController = authController;
});
