// Doctor Login Logic
let sessionId = null;
let mobileNumber = null;

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await requestOTP();
});

document.getElementById('verifyOtpBtn').addEventListener('click', verifyOTP);
document.getElementById('resendOtpBtn').addEventListener('click', requestOTP);

async function requestOTP() {
    const mobile = document.getElementById('mobile').value.trim();
    if (!mobile) {
        showMessage('Please enter your mobile number', 'error');
        return;
    }

    mobileNumber = mobile;
    const btn = document.getElementById('sendOtpBtn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const response = await fetch('/api/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send OTP');
        }

        sessionId = data.session_id;

        // Show OTP input section
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('otpSection').style.display = 'block';
        document.getElementById('sentToNumber').textContent = mobile;

        showMessage('OTP sent successfully! Check your phone.', 'success');

    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

async function verifyOTP() {
    const otp = document.getElementById('otp').value.trim();

    if (!otp || otp.length !== 6) {
        showMessage('Please enter a valid 6-digit OTP', 'error');
        return;
    }

    const btn = document.getElementById('verifyOtpBtn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                otp: otp,
                mobile: mobileNumber
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Invalid OTP');
        }

        if (data.is_new) {
            // New user - redirect to registration
            showMessage('Phone number not registered. Redirecting to registration...', 'info');
            setTimeout(() => {
                window.location.href = '/doctor/register';
            }, 2000);
        } else {
            // Existing user - save token and redirect to dashboard
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('doctor', JSON.stringify(data.doctor));

            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/doctor/dashboard';
            }, 1000);
        }

    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function showMessage(text, type = 'info') {
    const msgEl = document.getElementById('message');
    msgEl.textContent = text;
    msgEl.className = `message ${type}`;
    msgEl.style.display = 'block';

    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            msgEl.style.display = 'none';
        }, 5000);
    }
}
