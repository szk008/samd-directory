// Doctor Registration Logic - Multi-step with OTP and Map
let sessionId = null;
let mobileNumber = null;
let registrationMap = null;
let locationMarker = null;
let selectedLat = 21.1702;  // Default: Surat
let selectedLng = 72.8311;

// ==================== EVENT LISTENERS ====================
document.getElementById('otpRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await requestOTP();
});

document.getElementById('verifyOtpBtn').addEventListener('click', verifyOTP);
document.getElementById('nextToLocationBtn').addEventListener('click', showLocationStep);
document.getElementById('completeRegistrationBtn').addEventListener('click', completeRegistration);

// ==================== STEP 1: OTP ====================
async function requestOTP() {
    const mobile = document.getElementById('mobile').value.trim();
    if (!mobile) {
        showMessage('Please enter your mobile number', 'error');
        return;
    }

    mobileNumber = mobile;
    const form = document.getElementById('otpRequestForm');
    const btn = form.querySelector('button');
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

        // Show OTP verification
        form.style.display = 'none';
        document.getElementById('otpVerifySection').style.display = 'block';

        showMessage('OTP sent! Check your phone.', 'success');

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

        if (!data.is_new) {
            // Existing user
            showMessage('You are already registered! Redirecting to login...', 'info');
            setTimeout(() => {
                window.location.href = '/doctor/login';
            }, 2000);
            return;
        }

        // OTP verified - move to step 2
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';

        showMessage('OTP verified! Please complete your profile.', 'success');

    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ==================== STEP 2: PROFILE ====================
function showLocationStep() {
    // Validate profile fields
    const name = document.getElementById('name').value.trim();
    const degree = document.getElementById('degree').value.trim();
    const specialty = document.getElementById('specialty').value;

    if (!name || !degree || !specialty) {
        showMessage('Please fill all required fields', 'error');
        return;
    }

    // Move to step 3
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';

    // Initialize map
    initRegistrationMap();
}

// ==================== STEP 3: LOCATION ====================
function initRegistrationMap() {
    if (registrationMap) return;  // Already initialized

    // Create map
    registrationMap = L.map('registrationMap').setView([selectedLat, selectedLng], 13);

    // Add OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(registrationMap);

    // Add draggable marker
    locationMarker = L.marker([selectedLat, selectedLng], {
        draggable: true
    }).addTo(registrationMap);

    // Update coordinates on drag
    locationMarker.on('dragend', function (event) {
        const position = event.target.getLatLng();
        selectedLat = position.lat;
        selectedLng = position.lng;
        updateCoordinatesDisplay();
    });

    // Update on map click
    registrationMap.on('click', function (event) {
        selectedLat = event.latlng.lat;
        selectedLng = event.latlng.lng;
        locationMarker.setLatLng([selectedLat, selectedLng]);
        updateCoordinatesDisplay();
    });

    updateCoordinatesDisplay();
}

function updateCoordinatesDisplay() {
    document.getElementById('latDisplay').textContent = selectedLat.toFixed(6);
    document.getElementById('lngDisplay').textContent = selectedLng.toFixed(6);
}

// ==================== COMPLETE REGISTRATION ====================
async function completeRegistration() {
    // Gather all data
    const area = document.getElementById('area').value.trim();
    const city = document.getElementById('city').value.trim();

    if (!area || !city) {
        showMessage('Please fill area and city', 'error');
        return;
    }

    const registrationData = {
        mobile: mobileNumber,
        name: document.getElementById('name').value.trim(),
        degree: document.getElementById('degree').value.trim(),
        specialty: document.getElementById('specialty').value,
        experience_years: parseInt(document.getElementById('experience').value) || 0,
        clinic_name: document.getElementById('clinicName').value.trim(),
        area: area,
        city: city,
        latitude: selectedLat,
        longitude: selectedLng
    };

    const btn = document.getElementById('completeRegistrationBtn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Save token
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('doctor', JSON.stringify(data.doctor));

        showMessage('Registration successful! Your profile is pending verification. Redirecting to dashboard...', 'success');

        setTimeout(() => {
            window.location.href = '/doctor/dashboard';
        }, 2000);

    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ==================== HELPER ====================
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
