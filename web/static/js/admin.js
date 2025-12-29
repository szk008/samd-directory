// Admin Panel Logic
const ADMIN_TOKEN = 'admin-secret-123';  // Store securely in production!

let currentTab = 'pending';

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadPendingDoctors();
    loadStats();

    // Load based on hash
    if (window.location.hash) {
        const tab = window.location.hash.substring(1);
        switchTab(tab);
    }
});

// ==================== TAB MANAGEMENT ====================
function initTabs() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    currentTab = tabName;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        }
    });

    // Update content
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load data
    switch (tabName) {
        case 'pending':
            loadPendingDoctors();
            break;
        case 'verified':
            loadVerifiedDoctors();
            break;
        case 'business-numbers':
            loadAllDoctors();
            break;
        case 'stats':
            loadStats();
            break;
    }
}

// ==================== API CALLS ====================
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': ADMIN_TOKEN
        }
    };

    const response = await fetch(endpoint, { ...defaultOptions, ...options });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
}

// ==================== DATA LOADING ====================
async function loadPendingDoctors() {
    try {
        const doctors = await apiCall('/api/admin/doctors/pending');
        renderDoctorList(doctors, 'pendingDoctors', 'pending');
        document.getElementById('pendingCount').textContent = doctors.length;
    } catch (error) {
        showToast('Failed to load pending doctors', 'error');
    }
}

async function loadVerifiedDoctors() {
    try {
        const doctors = await apiCall('/api/admin/doctors/verified');
        renderDoctorList(doctors, 'verifiedDoctors', 'verified');
    } catch (error) {
        showToast('Failed to load verified doctors', 'error');
    }
}

async function loadAllDoctors() {
    try {
        const doctors = await apiCall('/api/admin/doctors/all');
        renderDoctorList(doctors, 'businessNumbers', 'business');
    } catch (error) {
        showToast('Failed to load doctors', 'error');
    }
}

async function loadStats() {
    try {
        const stats = await apiCall('/api/admin/stats');
        document.getElementById('totalDoctors').textContent = stats.total || 0;
        document.getElementById('verifiedCount').textContent = stats.verified || 0;
        document.getElementById('selfRegisteredCount').textContent = stats.self_registered || 0;
        document.getElementById('businessNumbersCount').textContent = stats.with_business_numbers || 0;
        document.getElementById('pendingCount').textContent = stats.pending || 0;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// ==================== RENDERING ====================
function renderDoctorList(doctors, containerId, mode) {
    const container = document.getElementById(containerId);

    if (doctors.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">No doctors found</p>';
        return;
    }

    container.innerHTML = doctors.map(doctor => createDoctorCard(doctor, mode)).join('');
}

function createDoctorCard(doctor, mode) {
    const isPending = mode === 'pending';
    const isBusiness = mode === 'business';

    return `
        <div class="doctor-admin-card ${isPending ? 'pending' : ''}">
            <div class="doctor-admin-header">
                <div class="doctor-admin-info">
                    <h3>${doctor.name}</h3>
                    <p>${doctor.specialty} ${doctor.degree ? `• ${doctor.degree}` : ''}</p>
                </div>
                ${doctor.verified ? '<span class="verified-badge">✓ Verified</span>' : '<span class="badge" style="background: orange;">Pending</span>'}
            </div>
            
            <div class="doctor-admin-meta">
                <div class="meta-item">
                    <span class="meta-label">Mobile</span>
                    <span class="meta-value">${doctor.personal_mobile || doctor.phone || 'N/A'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Business Number</span>
                    <span class="meta-value">${doctor.business_mobile || 'Not assigned'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Location</span>
                    <span class="meta-value">${doctor.area ? doctor.area + ', ' : ''}${doctor.city || 'N/A'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Source</span>
                    <span class="meta-value">${doctor.self_registered ? 'Self-Registered' : 'Admin Added'}</span>
                </div>
            </div>
            
            <div class="doctor-admin-actions">
                ${isPending ? `
                    <button class="btn btn-sm btn-success" onclick="verifyDoctor('${doctor.id}')">
                        ✓ Verify
                    </button>
                ` : `
                    <button class="btn btn-sm btn-danger" onclick="unverifyDoctor('${doctor.id}')">
                        ✗ Unverify
                    </button>
                `}
                <button class="btn btn-sm btn-primary" onclick="editDoctor('${doctor.id}')">
                    Edit
                </button>
                ${isBusiness ? `
                    <button class="btn btn-sm btn-primary" onclick="assignBusinessNumber('${doctor.id}')">
                        ${doctor.business_mobile ? 'Change Number' : 'Assign Number'}
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteDoctor('${doctor.id}')">
                    Delete
                </button>
            </div>
        </div>
    `;
}

// ==================== ACTIONS ====================
async function verifyDoctor(id) {
    if (!confirm('Verify this doctor?')) return;

    try {
        await apiCall(`/api/admin/doctor/${id}/verify`, { method: 'POST' });
        showToast('Doctor verified successfully', 'success');
        loadPendingDoctors();
        loadStats();
    } catch (error) {
        showToast('Failed to verify doctor', 'error');
    }
}

async function unverifyDoctor(id) {
    if (!confirm('Mark this doctor as pending?')) return;

    try {
        await apiCall(`/api/admin/doctor/${id}/unverify`, { method: 'POST' });
        showToast('Doctor marked as pending', 'success');
        loadVerifiedDoctors();
        loadStats();
    } catch (error) {
        showToast('Failed to unverify doctor', 'error');
    }
}

async function deleteDoctor(id) {
    if (!confirm('Permanently delete this doctor? This action cannot be undone.')) return;

    try {
        await apiCall(`/api/admin/doctor/${id}`, { method: 'DELETE' });
        showToast('Doctor deleted', 'success');

        // Reload current view
        switch (currentTab) {
            case 'pending': loadPendingDoctors(); break;
            case 'verified': loadVerifiedDoctors(); break;
            case 'business-numbers': loadAllDoctors(); break;
        }
        loadStats();
    } catch (error) {
        showToast('Failed to delete doctor', 'error');
    }
}

function editDoctor(id) {
    // Fetch doctor data and populate modal
    fetch(`/api/search`)
        .then(res => res.json())
        .then(doctors => {
            const doctor = doctors.find(d => d.id === id);
            if (!doctor) {
                showToast('Doctor not found', 'error');
                return;
            }

            document.getElementById('editDoctorId').value = id;
            document.getElementById('editName').value = doctor.name;
            document.getElementById('editDegree').value = doctor.degree || '';
            document.getElementById('editSpecialty').value = doctor.specialty;
            document.getElementById('editBusinessMobile').value = doctor.business_mobile || '';

            document.getElementById('editModal').style.display = 'flex';
        });
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editDoctorId').value;
    const data = {
        name: document.getElementById('editName').value,
        degree: document.getElementById('editDegree').value,
        specialty: document.getElementById('editSpecialty').value,
        business_mobile: document.getElementById('editBusinessMobile').value
    };

    try {
        await apiCall(`/api/admin/doctor/${id}/update`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        showToast('Doctor updated successfully', 'success');
        closeEditModal();

        // Reload current view
        switch (currentTab) {
            case 'pending': loadPendingDoctors(); break;
            case 'verified': loadVerifiedDoctors(); break;
            case 'business-numbers': loadAllDoctors(); break;
        }
    } catch (error) {
        showToast('Failed to update doctor', 'error');
    }
});

function assignBusinessNumber(id) {
    const number = prompt('Enter business number (e.g., +91 9XX-XXX-XXXX):');
    if (!number) return;

    apiCall(`/api/admin/doctor/${id}/update`, {
        method: 'PUT',
        body: JSON.stringify({ business_mobile: number })
    })
        .then(() => {
            showToast('Business number assigned', 'success');
            loadAllDoctors();
            loadStats();
        })
        .catch(() => {
            showToast('Failed to assign number', 'error');
        });
}

// ==================== TOAST ====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('message');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}
