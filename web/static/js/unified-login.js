/**
 * Unified Login JavaScript
 * Handles OTP, Magic Link, and Google OAuth authentication
 */

let currentSessionId = null;

// ========== OTP LOGIN ==========

document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const mobile = document.getElementById('otp-mobile').value;

    try {
        const response = await fetch('/api/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });

        const data = await response.json();

        if (data.success) {
            currentSessionId = data.session_id;
            document.getElementById('otp-verify').classList.remove('hidden');
            showMessage(data.message, 'success');
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Failed to send OTP', 'error');
    }
});

document.getElementById('verify-otp-btn').addEventListener('click', async () => {
    const otp = document.getElementById('otp-code').value;

    try {
        const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSessionId,
                otp: otp
            })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('auth_token', data.token);
            showMessage('Login successful!', 'success');
            setTimeout(() => window.location.href = '/doctor/dashboard', 1000);
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('OTP verification failed', 'error');
    }
});


// ========== MAGIC LINK ==========

document.getElementById('magic-link-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('magic-email').value;

    try {
        const response = await fetch('/api/auth/request-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            showMessage(data.message, 'success');
            document.getElementById('magic-email').value = '';
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Failed to send magic link', 'error');
    }
});


// ========== GOOGLE OAUTH ==========

function handleGoogleCredential(response) {
    const idToken = response.credential;

    fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (data.needs_registration) {
                    // Redirect to complete registration (mobile required)
                    localStorage.setItem('auth_token', data.temp_token);
                    window.location.href = '/doctor/complete-registration';
                } else {
                    // Direct login
                    localStorage.setItem('auth_token', data.token);
                    showMessage('Google login successful!', 'success');
                    setTimeout(() => window.location.href = '/doctor/dashboard', 1000);
                }
            } else {
                showMessage(data.error, 'error');
            }
        })
        .catch(() => showMessage('Google login failed', 'error'));
}

// Initialize Google Sign-In
window.onload = function () {
    google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID',  // Replace with actual client ID
        callback: handleGoogleCredential
    });

    google.accounts.id.renderButton(
        document.getElementById('google-login-btn'),
        {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            width: 300
        }
    );
};


// ========== HELPERS ==========

function showMessage(text, type) {
    const messageBox = document.getElementById('message-box');
    messageBox.textContent = text;
    messageBox.className = `message ${type}`;
    messageBox.classList.remove('hidden');

    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 5000);
}
