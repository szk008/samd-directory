/**
 * SAMD Directory - Admin Panel Controller
 * Handles authentication, doctor management, and settings
 */

// Admin phone number - only this number can access admin
const ADMIN_PHONE = '9879520091';
const OTP_CODE = '123456'; // Mock OTP for testing

// Settings keys
const SETTINGS_KEY = 'samd_admin_settings';
const DOCTORS_KEY = 'samd_doctors_data';

// Default settings
const DEFAULT_SETTINGS = {
    creatorFooterVisible: true,
    creatorName: 'Dr. Shahnavaz Kanuga',
    creatorPhone: '9879520091',
    showAds: true,
    defaultLat: 21.1702,
    defaultLng: 72.8311,
    defaultZoom: 12
};

// ========== Authentication ==========
const adminAuth = {
    phoneNumber: '',

    async sendOTP() {
        const phoneInput = document.getElementById('adminPhoneInput');
        const phone = phoneInput.value.trim();

        if (phone.length !== 10 || !/^\d+$/.test(phone)) {
            showToast('Please enter a valid 10-digit phone number', 'error');
            return;
        }

        // Check if admin phone
        if (phone !== ADMIN_PHONE) {
            showToast('This phone number is not authorized for admin access', 'error');
            return;
        }

        try {
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: '+91' + phone })
            });

            const data = await response.json();

            if (response.ok) {
                this.phoneNumber = phone;
                // Show OTP step
                document.getElementById('phoneStep').style.display = 'none';
                document.getElementById('otpStep').style.display = 'block';

                // Show OTP for Dev Mode (Critical for user feedback)
                if (data.dev_otp) {
                    alert('Your Admin OTP is: ' + data.dev_otp);
                    console.log('OTP:', data.dev_otp);
                }

                showToast(`OTP sent to +91 ${phone}`, 'success');

                // Focus first OTP digit
                setTimeout(() => {
                    document.querySelector('.otp-digit').focus();
                }, 100);

                // Setup OTP input handlers
                this.setupOTPInputs();
            } else {
                showToast(data.error || 'Failed to send OTP', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Network error sending OTP', 'error');
        }
    },

    setupOTPInputs() {
        const digits = document.querySelectorAll('#otpStep .otp-digit');
        digits.forEach((digit, index) => {
            digit.value = '';
            digit.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < digits.length - 1) {
                    digits[index + 1].focus();
                }
            });
            digit.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    digits[index - 1].focus();
                }
            });
        });
    },

    async verifyOTP() {
        const digits = document.querySelectorAll('#otpStep .otp-digit');
        const otp = Array.from(digits).map(d => d.value).join('');

        if (otp.length !== 6) {
            showToast('Please enter complete 6-digit OTP', 'error');
            return;
        }

        try {
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: '+91' + this.phoneNumber, code: otp })
            });

            const data = await response.json();

            if (response.ok) {
                // Store admin session
                localStorage.setItem('samd_admin_session', JSON.stringify({
                    phone: this.phoneNumber,
                    loggedIn: true,
                    timestamp: Date.now()
                }));

                showToast('Login successful! Welcome, Admin.', 'success');

                // Show admin dashboard
                setTimeout(() => {
                    document.getElementById('loginSection').style.display = 'none';
                    document.getElementById('adminDashboard').style.display = 'flex';
                    adminPanel.init();
                }, 500);
            } else {
                showToast(data.error || 'Invalid OTP', 'error');
            }
        } catch (e) {
            showToast('Network error verifying OTP', 'error');
        }
    },

    backToPhone() {
        document.getElementById('phoneStep').style.display = 'block';
        document.getElementById('otpStep').style.display = 'none';
    },

    logout() {
        localStorage.removeItem('samd_admin_session');
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 500);
    },

    checkSession() {
        const session = localStorage.getItem('samd_admin_session');
        if (session) {
            const data = JSON.parse(session);
            // Session valid for 24 hours
            if (data.loggedIn && Date.now() - data.timestamp < 86400000) {
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('adminDashboard').style.display = 'flex';
                return true;
            }
        }
        return false;
    }
};

// ========== Admin Panel Controller ==========
const adminPanel = {
    doctors: [],
    users: [],
    specialties: {},

    init() {
        // Load data
        this.loadDoctors();
        this.loadUsers();
        this.specialties = SAMD_DATA.specialties;

        // Populate specialty dropdown
        this.populateSpecialtyDropdown();

        // Load settings
        this.loadSettings();

        // Render stats
        this.updateStats();

        // Render tables
        this.renderRecentDoctors();
        this.renderAllDoctors();
        this.renderAllUsers();

        // Setup navigation
        this.setupNavigation();

        // Setup search
        this.setupSearch();

        // Init icons
        if (window.lucide) {
            lucide.createIcons();
        }
    },

    async loadDoctors() {
        try {
            console.log('Loading doctors from API...');
            const response = await fetch('/api/doctors');
            if (response.ok) {
                const data = await response.json();
                this.doctors = data.doctors || [];
                console.log('✅ Loaded doctors:', this.doctors.length);
            } else {
                console.warn('Failed to load doctors from API, falling back to local');
                const stored = localStorage.getItem(DOCTORS_KEY);
                this.doctors = stored ? JSON.parse(stored) : [...SAMD_DATA.doctors];
            }
        } catch (error) {
            console.error('Error loading doctors:', error);
            const stored = localStorage.getItem(DOCTORS_KEY);
            this.doctors = stored ? JSON.parse(stored) : [...SAMD_DATA.doctors];
        }

        this.updateStats();
        this.renderRecentDoctors();
        this.renderAllDoctors();
    },

    saveDoctors() {
        localStorage.setItem(DOCTORS_KEY, JSON.stringify(this.doctors));
    },

    populateSpecialtyDropdown() {
        const select = document.getElementById('doctorSpecialty');
        if (!select) return;

        select.innerHTML = '<option value="">Select Specialty</option>';

        Object.entries(this.specialties).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value.label;
            select.appendChild(option);
        });
    },

    loadSettings() {
        const stored = localStorage.getItem(SETTINGS_KEY);
        const settings = stored ? JSON.parse(stored) : DEFAULT_SETTINGS;

        // Apply to form
        document.getElementById('setting-creatorFooter').checked = settings.creatorFooterVisible !== false;
        document.getElementById('setting-creatorName').value = settings.creatorName || DEFAULT_SETTINGS.creatorName;
        document.getElementById('setting-creatorPhone').value = settings.creatorPhone || DEFAULT_SETTINGS.creatorPhone;
        document.getElementById('setting-showAds').checked = settings.showAds !== false;
        document.getElementById('setting-defaultLat').value = settings.defaultLat || DEFAULT_SETTINGS.defaultLat;
        document.getElementById('setting-defaultLng').value = settings.defaultLng || DEFAULT_SETTINGS.defaultLng;
        document.getElementById('setting-defaultZoom').value = settings.defaultZoom || DEFAULT_SETTINGS.defaultZoom;
    },

    saveSettings() {
        const settings = {
            creatorFooterVisible: document.getElementById('setting-creatorFooter').checked,
            creatorName: document.getElementById('setting-creatorName').value,
            creatorPhone: document.getElementById('setting-creatorPhone').value,
            showAds: document.getElementById('setting-showAds').checked,
            defaultLat: parseFloat(document.getElementById('setting-defaultLat').value),
            defaultLng: parseFloat(document.getElementById('setting-defaultLng').value),
            defaultZoom: parseInt(document.getElementById('setting-defaultZoom').value)
        };

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        showToast('Settings saved successfully!', 'success');
    },

    updateStats() {
        const total = this.doctors.length;
        const verified = this.doctors.filter(d => d.verified).length;
        const featured = this.doctors.filter(d => d.subscriptionTier === 'featured' || d.featured).length;
        const specialties = new Set(this.doctors.map(d => d.specialty)).size;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-verified').textContent = verified;
        document.getElementById('stat-featured').textContent = featured;
        document.getElementById('stat-specialties').textContent = specialties;
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                // Update active nav
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                // Show section
                const section = item.dataset.section;
                document.querySelectorAll('[id^="section-"]').forEach(s => s.style.display = 'none');
                document.getElementById(`section-${section}`).style.display = 'block';
            });
        });
    },

    setupSearch() {
        // Doctor search
        const doctorSearchInput = document.getElementById('doctorSearchInput');
        if (doctorSearchInput) {
            doctorSearchInput.addEventListener('input', (e) => {
                this.renderAllDoctors(e.target.value.toLowerCase());
            });
        }

        // User search
        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput) {
            userSearchInput.addEventListener('input', (e) => {
                this.renderAllUsers(e.target.value.toLowerCase());
            });
        }

        // User role filter
        const userRoleFilter = document.getElementById('userRoleFilter');
        if (userRoleFilter) {
            userRoleFilter.addEventListener('change', () => {
                const searchValue = userSearchInput ? userSearchInput.value.toLowerCase() : '';
                this.renderAllUsers(searchValue);
            });
        }

        // User profile filter
        const userProfileFilter = document.getElementById('userProfileFilter');
        if (userProfileFilter) {
            userProfileFilter.addEventListener('change', () => {
                const searchValue = userSearchInput ? userSearchInput.value.toLowerCase() : '';
                this.renderAllUsers(searchValue);
            });
        }
    },

    // ========== User Management ==========
    async loadUsers() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const data = await response.json();
                this.users = data.users || [];

                // Also load doctors to match hospital/specialty data
                const doctorsResp = await fetch('/api/doctors');
                if (doctorsResp.ok) {
                    const doctorsData = await doctorsResp.json();
                    this.doctors = doctorsData.doctors || [];
                }

                console.log('✅ Loaded users:', this.users.length);
            } else {
                console.warn('Failed to load users from API');
                this.users = [];
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.users = [];
        }
    },

    renderAllUsers(filter = '') {
        const tbody = document.getElementById('allUsersTable');
        const countEl = document.getElementById('userTableCount');
        const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';
        const profileFilter = document.getElementById('userProfileFilter')?.value || 'all';

        if (!tbody) return;

        let filtered = this.users;

        // Apply role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(u => u.role === roleFilter);
        }

        // Apply profile filter
        if (profileFilter === 'has_profile') {
            filtered = filtered.filter(u => u.doctor_id !== null);
        } else if (profileFilter === 'no_profile') {
            filtered = filtered.filter(u => u.doctor_id === null);
        }

        // Apply search filter - search in user data AND doctor data
        if (filter) {
            filtered = filtered.filter(u => {
                const doctor = this.doctors.find(d => d.id === u.doctor_id);
                const searchText = [
                    u.name,
                    u.phone,
                    u.email,
                    doctor?.hospital,
                    doctor?.specialty,
                    doctor?.address
                ].filter(Boolean).join(' ').toLowerCase();

                return searchText.includes(filter);
            });
        }

        if (countEl) countEl.textContent = filtered.length;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
                        ${filter || roleFilter !== 'all' || profileFilter !== 'all' ? '🔍 No users match your search criteria' : '📋 No users registered yet'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(user => this.createUserRow(user)).join('');

        if (window.lucide) {
            lucide.createIcons();
        }
    },

    createUserRow(user) {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
        const roleColors = {
            'admin': '#ef4444',
            'doctor': '#10b981',
            'user': '#6b7280'
        };
        const roleColor = roleColors[user.role] || roleColors['user'];

        // Find associated doctor profile
        const doctor = this.doctors.find(d => d.id === user.doctor_id);
        const hospital = doctor?.hospital || '-';
        const specialty = doctor?.specialty || '-';
        const specialtyLabel = specialty !== '-' ? (this.specialties[specialty]?.label || specialty) : '-';

        return `
            <tr>
                <td>${user.id}</td>
                <td>
                    <div class="doctor-cell">
                        <div class="doctor-avatar-sm" style="background: ${roleColor}">${initials}</div>
                        <div>
                            <div class="doctor-name-cell" style="cursor: pointer;" onclick="adminPanel.editUserName(${user.id}, '${(user.name || '').replace(/'/g, "\\'")}')">  
                                ${user.name || 'Unknown'}
                                <i data-lucide="edit-2" style="width: 12px; height: 12px; margin-left: 6px; opacity: 0.5;"></i>
                            </div>
                        </div>
                    </div>
                </td>
                <td style="cursor: pointer;" onclick="adminPanel.editUserPhone(${user.id}, '${user.phone}')">
                    ${user.phone || '-'}
                    <i data-lucide="edit-2" style="width: 12px; height: 12px; margin-left: 4px; opacity: 0.4;"></i>
                </td>
                <td>
                    <span class="badge" style="background: ${roleColor}20; color: ${roleColor}; border: 1px solid ${roleColor}40; cursor: pointer;" 
                          onclick="adminPanel.changeUserRole(${user.id}, '${user.role}')">
                        ${user.role || 'user'}
                        <i data-lucide="chevron-down" style="width: 12px; height: 12px; margin-left: 4px;"></i>
                    </span>
                </td>
                <td style="${doctor ? 'cursor: pointer;' : ''}" ${doctor ? `onclick="adminPanel.editDoctorHospital(${doctor.id}, '${hospital.replace(/'/g, "\\'")}')"` : ''}>
                    ${hospital}
                    ${doctor ? '<i data-lucide="edit-2" style="width: 12px; height: 12px; margin-left: 4px; opacity: 0.4;"></i>' : ''}
                </td>
                <td style="${doctor ? 'cursor: pointer;' : ''}"  ${doctor ? `onclick="adminPanel.editDoctorSpecialty(${doctor.id}, '${specialty}')"` : ''}>
                    ${specialtyLabel}
                    ${doctor ? '<i data-lucide="edit-2" style="width: 12px; height: 12px; margin-left: 4px; opacity: 0.4;"></i>' : ''}
                </td>
                <td>
                    ${doctor ?
                `<a href="#" onclick="adminPanel.viewDoctorProfile(${doctor.id}); return false;" style="color: var(--admin-primary); text-decoration: none;">
                            View #${doctor.id} →
                        </a>`
                :
                '<span style="color: var(--admin-text-muted);">No profile</span>'
            }
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" title="Edit User" onclick="adminPanel.editUserDetails(${user.id})">
                            <i data-lucide="edit" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="action-btn delete" title="Delete User" onclick="adminPanel.deleteUser(${user.id})">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    async changeUserRole(userId, currentRole) {
        const newRole = prompt(`Change role for user #${userId}.\nCurrent: ${currentRole}\n\nEnter new role (user/doctor/admin):`, currentRole);

        if (!newRole || !['user', 'doctor', 'admin'].includes(newRole.toLowerCase())) {
            if (newRole !== null) {
                showToast('Invalid role. Must be: user, doctor, or admin', 'error');
            }
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole.toLowerCase() })
            });

            if (response.ok) {
                showToast('User role updated successfully', 'success');
                await this.loadUsers();
                this.renderAllUsers();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to update role', 'error');
            }
        } catch (error) {
            console.error('Error updating user role:', error);
            showToast('Error updating user role', 'error');
        }
    },

    async deleteUser(userId) {
        if (!confirm(`Are you sure you want to delete user #${userId}? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('User deleted successfully', 'success');
                await this.loadUsers();
                this.renderAllUsers();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete user', 'error');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast('Error deleting user', 'error');
        }
    },

    viewDoctorProfile(doctorId) {
        // Switch to doctors section and find the doctor
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('[data-section="doctors"]').classList.add('active');
        document.querySelectorAll('[id^="section-"]').forEach(s => s.style.display = 'none');
        document.getElementById('section-doctors').style.display = 'block';

        // Search for the doctor
        const searchInput = document.getElementById('doctorSearchInput');
        if (searchInput) {
            searchInput.value = `#${doctorId}`;
            this.renderAllDoctors(`${doctorId}`);
        }
    },

    // Inline editing methods
    editAdminProfile() {
        window.location.href = '/dashboard';
    },

    async editUserName(userId, currentName) {
        const newName = prompt('Edit name:', currentName);
        if (!newName || newName === currentName) return;
        await this.updateUser(userId, { name: newName });
    },

    async editUserPhone(userId, currentPhone) {
        const newPhone = prompt('Edit phone (10 digits):', currentPhone);
        if (!newPhone || newPhone === currentPhone) return;
        await this.updateUser(userId, { phone: newPhone });
    },

    async editDoctorHospital(doctorId, currentHospital) {
        const newHospital = prompt('Edit hospital:', currentHospital);
        if (!newHospital || newHospital === currentHospital) return;

        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: doctorId, hospital: newHospital })
        });

        if (response.ok) {
            showToast('Hospital updated', 'success');
            await this.loadUsers();
            this.renderAllUsers();
        }
    },

    async editDoctorSpecialty(doctorId, currentSpecialty) {
        const newSpecialty = prompt('Edit specialty code (e.g., CARDIO, DERM):', currentSpecialty);
        if (!newSpecialty || newSpecialty === currentSpecialty) return;

        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: doctorId, specialty: newSpecialty })
        });

        if (response.ok) {
            showToast('Specialty updated', 'success');
            await this.loadUsers();
            this.renderAllUsers();
        }
    },

    async updateUser(userId, data) {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast('User updated successfully', 'success');
            await this.loadUsers();
            this.renderAllUsers();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update user', 'error');
        }
    },

    editUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        alert(`Edit user #${userId}\n\nName: ${user.name}\nPhone: ${user.phone}\nRole: ${user.role}\n\nClick individual fields to edit them.`);
    },

    renderRecentDoctors() {
        const tbody = document.getElementById('recentDoctorsTable');
        if (!tbody) return;

        const recent = this.doctors.slice(0, 10);
        tbody.innerHTML = recent.map(doctor => this.createDoctorRow(doctor, true)).join('');

        if (window.lucide) {
            lucide.createIcons();
        }
    },

    renderAllDoctors(filter = '') {
        const tbody = document.getElementById('allDoctorsTable');
        const countEl = document.getElementById('doctorTableCount');
        if (!tbody) return;

        let filtered = this.doctors;
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            filtered = this.doctors.filter(d => {
                const text = [
                    d.name,
                    d.specialty,
                    d.phone,
                    d.hospital,
                    d.address,
                    d.qualification
                ].filter(Boolean).join(' ').toLowerCase();
                return text.includes(lowerFilter);
            });
        }

        if (countEl) countEl.textContent = filtered.length;

        tbody.innerHTML = filtered.map(doctor => this.createDoctorRow(doctor, false)).join('');

        if (window.lucide) {
            lucide.createIcons();
        }
    },

    createDoctorRow(doctor, compact = false) {
        const specialty = this.specialties[doctor.specialty] || { label: doctor.specialty, color: '#94a3b8' };
        const initials = doctor.name.replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const hasGeo = doctor.lat && doctor.lng;
        const tier = doctor.subscriptionTier || 'basic';

        if (compact) {
            return `
                <tr>
                    <td>
                        <div class="doctor-cell">
                            <div class="doctor-avatar-sm" style="background: ${specialty.color}">${initials}</div>
                            <div>
                                <div class="doctor-name-cell">${doctor.name}</div>
                                <div class="doctor-qual-cell">${doctor.qualification || '-'}</div>
                            </div>
                        </div>
                    </td>
                    <td>${specialty.label}</td>
                    <td><span class="badge ${doctor.verified ? 'verified' : 'pending'}">${doctor.verified ? 'Verified' : 'Pending'}</span></td>
                    <td><span class="badge ${tier}">${tier}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn" title="Edit" onclick="adminPanel.editDoctor(${doctor.id})">
                                <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        return `
            <tr>
                <td>${doctor.id}</td>
                <td>
                    <div class="doctor-cell">
                        <div class="doctor-avatar-sm" style="background: ${specialty.color}">${initials}</div>
                        <div>
                            <div class="doctor-name-cell">${doctor.name}</div>
                            <div class="doctor-qual-cell">${doctor.qualification || '-'}</div>
                        </div>
                    </div>
                </td>
                <td>${doctor.phone || '-'}</td>
                <td>${specialty.label}</td>
                <td><span class="badge ${hasGeo ? 'verified' : 'pending'}">${hasGeo ? '✓ Yes' : '✗ No'}</span></td>
                <td><span class="badge ${doctor.verified ? 'verified' : 'pending'}">${doctor.verified ? 'Verified' : 'Pending'}</span></td>
                <td><span class="badge ${tier}">${tier}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" title="Edit" onclick="adminPanel.editDoctor(${doctor.id})">
                            <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="action-btn delete" title="Delete" onclick="adminPanel.deleteDoctor(${doctor.id})">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    initMapPicker(lat, lng) {
        lat = parseFloat(lat) || 21.1702;
        lng = parseFloat(lng) || 72.8311;

        if (!this.mapPicker) {
            this.mapPicker = L.map('admin-map-picker').setView([lat, lng], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.mapPicker);
            this.mapMarker = L.marker([lat, lng], { draggable: true }).addTo(this.mapPicker);

            // Update inputs on drag
            this.mapMarker.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                document.getElementById('doctorLat').value = pos.lat.toFixed(6);
                document.getElementById('doctorLng').value = pos.lng.toFixed(6);
            });

            // Update marker on map click
            this.mapPicker.on('click', (e) => {
                this.mapMarker.setLatLng(e.latlng);
                document.getElementById('doctorLat').value = e.latlng.lat.toFixed(6);
                document.getElementById('doctorLng').value = e.latlng.lng.toFixed(6);
            });
        } else {
            this.mapPicker.setView([lat, lng], 13);
            this.mapMarker.setLatLng([lat, lng]);
        }

        // Fix map size after modal transition
        setTimeout(() => {
            this.mapPicker.invalidateSize();
        }, 200);
    },

    showAddDoctor() {
        const modal = document.getElementById('editDoctorModal');
        const formTitle = document.getElementById('modalTitle');
        const submitBtn = document.getElementById('saveDoctorBtn');

        if (modal) {
            modal.classList.add('active');
            formTitle.textContent = 'Add Doctor';
            submitBtn.textContent = 'Add Doctor';

            // Clear inputs
            document.getElementById('editDoctorId').value = '';
            document.getElementById('doctorName').value = '';
            document.getElementById('doctorPhone').value = '';
            // Populate Specialties if needed
            this.populateSpecialtyDropdown();
            document.getElementById('doctorSpecialty').value = '';

            // Clear Selects
            const qualSelect = document.getElementById('doctorQualification');
            if (qualSelect) Array.from(qualSelect.options).forEach(o => o.selected = false);

            document.getElementById('doctorHospital').value = '';
            document.getElementById('doctorAddress').value = '';
            document.getElementById('doctorLat').value = '';
            document.getElementById('doctorLng').value = '';
            document.getElementById('doctorTier').value = 'basic';
            document.getElementById('doctorVerified').checked = false;

            // New fields reset
            if (document.getElementById('doctorDistrict')) {
                const distInput = document.getElementById('doctorDistrict');
                distInput.value = '';
                distInput.addEventListener('change', (e) => this.updateAreaOptions(e.target.value));
            }
            if (document.getElementById('doctorArea')) document.getElementById('doctorArea').value = '';
            this.updateAreaOptions(''); // Clear options

            if (document.getElementById('doctorPincode')) document.getElementById('doctorPincode').value = '';

            // Map picker default
            this.initMapPicker(21.1702, 72.8311); // Surat default
        }
    },

    updateAreaOptions(district) {
        const areaList = document.getElementById('areaList');
        if (!areaList) return;
        areaList.innerHTML = '';

        if (district && typeof GUJARAT_DATA !== 'undefined' && GUJARAT_DATA[district]) {
            GUJARAT_DATA[district].sort().forEach(area => {
                const opt = document.createElement('option');
                opt.value = area;
                areaList.appendChild(opt);
            });
        }
    },

    async loadIssues() {
        try {
            const response = await fetch('/api/admin/issues');
            if (response.ok) {
                const data = await response.json();
                this.renderIssues(data.issues || []);
            }
        } catch (error) {
            console.error('Failed to load issues:', error);
            showToast('Failed to load notifications', 'error');
        }
    },

    renderIssues(issues) {
        const tbody = document.getElementById('issuesTableBody');
        if (!tbody) return;

        if (issues.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No data issues found.</td></tr>';
            return;
        }

        tbody.innerHTML = issues.map(issue => `
            <tr>
                <td>${issue.name}</td>
                <td>${issue.phone}</td>
                <td style="color: var(--danger-500);">${issue.issues}</td>
                <td>${issue.district || '-'}</td>
                <td>
                    <button class="btn btn-sm" onclick="adminPanel.editDoctor(${issue.id})">Edit</button>
                    <button class="btn btn-sm btn-secondary" onclick="adminPanel.resolveIssue(${issue.id})">Ignore</button>
                </td>
            </tr>
        `).join('');
    },

    async resolveIssue(id) {
        if (!confirm('Clear this flag? Normalization script may re-flag it unless data is changed.')) return;
        try {
            const response = await fetch(`/api/admin/issues/clear/${id}`, { method: 'POST' });
            if (response.ok) {
                showToast('Issue cleared', 'success');
                this.loadIssues(); // Reload
            }
        } catch (e) {
            showToast('Error clearing issue', 'error');
        }
    },

    populateSpecialtyDropdown() {
        const select = document.getElementById('doctorSpecialty');
        if (!select || select.options.length > 1) return; // Already populated

        // Use SAMD_DATA if available
        if (typeof SAMD_DATA !== 'undefined' && SAMD_DATA.specialties) {
            Object.keys(SAMD_DATA.specialties).sort().forEach(key => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');
                select.appendChild(opt);
            });
        }
    },

    editDoctor(id) {
        const doctor = this.doctors.find(d => d.id === parseInt(id));
        if (!doctor) return;

        const modal = document.getElementById('editDoctorModal');
        const formTitle = document.getElementById('modalTitle');
        const submitBtn = document.getElementById('saveDoctorBtn');

        if (modal) {
            modal.classList.add('active');
            formTitle.textContent = 'Edit Doctor';
            submitBtn.textContent = 'Update Doctor';

            document.getElementById('editDoctorId').value = doctor.id;
            document.getElementById('doctorName').value = doctor.name;
            document.getElementById('doctorPhone').value = doctor.phone || '';

            this.populateSpecialtyDropdown();
            document.getElementById('doctorSpecialty').value = doctor.specialty || '';

            // Handle Qualification Multi-select
            const qualSelect = document.getElementById('doctorQualification');
            if (qualSelect) {
                Array.from(qualSelect.options).forEach(o => o.selected = false);
                if (doctor.qualification) {
                    // Qualification string usually "MBBS, MD"
                    const parts = doctor.qualification.split(/[,\s]+/).map(p => p.trim().toUpperCase()); // Split by comma/space
                    // Check 'MBBS' 'MD' etc against parts
                    // Logic: Iterate options, if option value in parts, select it
                    for (let i = 0; i < qualSelect.options.length; i++) {
                        if (parts.includes(qualSelect.options[i].value)) {
                            qualSelect.options[i].selected = true;
                        }
                    }
                }
            }

            document.getElementById('doctorHospital').value = doctor.hospital || '';
            document.getElementById('doctorAddress').value = doctor.address || '';
            document.getElementById('doctorLat').value = doctor.lat || '';
            document.getElementById('doctorLng').value = doctor.lng || '';
            document.getElementById('doctorTier').value = doctor.subscriptionTier || 'basic';
            document.getElementById('doctorVerified').checked = doctor.verified;

            // New Fields
            if (document.getElementById('doctorDistrict')) {
                const distInput = document.getElementById('doctorDistrict');
                distInput.value = doctor.district || '';
                // Setup listener and initial population
                this.updateAreaOptions(doctor.district);
                distInput.addEventListener('change', (e) => this.updateAreaOptions(e.target.value));
            }
            if (document.getElementById('doctorArea')) document.getElementById('doctorArea').value = doctor.city || '';
            if (document.getElementById('doctorPincode')) document.getElementById('doctorPincode').value = doctor.pincode || '';

            this.initMapPicker(doctor.lat, doctor.lng);
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    },

    closeModal() {
        document.getElementById('doctorModal').classList.remove('active');
    },

    async saveDoctor() {
        const name = document.getElementById('doctorName').value.trim();
        const phone = document.getElementById('doctorPhone').value.trim();
        const specialty = document.getElementById('doctorSpecialty').value;
        const editId = document.getElementById('editDoctorId').value;

        if (!name || !phone || !specialty) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        // Qualification (Multi)
        const qualSelect = document.getElementById('doctorQualification');
        const qualifications = Array.from(qualSelect.selectedOptions).map(o => o.value).join(', ');

        const doctorData = {
            name,
            phone,
            specialty,
            qualification: qualifications,
            hospital: document.getElementById('doctorHospital').value.trim(),
            address: document.getElementById('doctorAddress').value.trim(),
            district: document.getElementById('doctorDistrict').value,
            city: document.getElementById('doctorArea').value.trim(),
            pincode: document.getElementById('doctorPincode').value.trim(),
            lat: parseFloat(document.getElementById('doctorLat').value) || null,
            lng: parseFloat(document.getElementById('doctorLng').value) || null,
            subscriptionTier: document.getElementById('doctorTier').value,
            verified: document.getElementById('doctorVerified').checked,
            featured: document.getElementById('doctorTier').value === 'featured'
        };

        try {
            const url = editId ? `/api/doctors/${editId}` : '/api/doctors';
            const method = editId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doctorData)
            });

            if (response.ok) {
                showToast(editId ? 'Doctor updated successfully!' : 'Doctor added successfully!', 'success');
                this.closeModal();
                await this.loadDoctors();

                // Refresh users if available to keep links updated
                if (this.loadUsers) await this.loadUsers();
                if (this.renderAllUsers) this.renderAllUsers();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to save doctor', 'error');
            }
        } catch (error) {
            console.error('Error saving doctor:', error);
            showToast('Error saving doctor', 'error');
        }
    },

    async deleteDoctor(id) {
        if (!confirm('Are you sure you want to delete this doctor?')) return;

        try {
            const response = await fetch(`/api/doctors/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('Doctor deleted successfully', 'success');
                await this.loadDoctors();
                if (this.loadUsers) await this.loadUsers();
                if (this.renderAllUsers) this.renderAllUsers();
            } else {
                showToast('Failed to delete doctor', 'error');
            }
        } catch (error) {
            console.error('Error deleting doctor:', error);
            showToast('Error deleting doctor', 'error');
        }
    },

    exportData() {
        const dataStr = JSON.stringify({
            meta: {
                exportedAt: new Date().toISOString(),
                totalDoctors: this.doctors.length
            },
            doctors: this.doctors,
            settings: JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
        }, null, 2);

        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `samd-directory-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('Data exported successfully!', 'success');
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.doctors && Array.isArray(data.doctors)) {
                    this.doctors = data.doctors;
                    this.saveDoctors();

                    if (data.settings) {
                        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
                        this.loadSettings();
                    }

                    this.updateStats();
                    this.renderRecentDoctors();
                    this.renderAllDoctors();

                    showToast(`Imported ${data.doctors.length} doctors successfully!`, 'success');
                } else {
                    showToast('Invalid data format', 'error');
                }
            } catch (err) {
                showToast('Error parsing JSON file', 'error');
            }
        };
        reader.readAsText(file);

        // Reset input
        event.target.value = '';
    }
};

// ========== Toast Utility ==========
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'alert-circle'}" style="width: 20px; height: 20px;"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    if (window.lucide) {
        lucide.createIcons();
    }

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// ========== Get Settings for Main App ==========
function getAdminSettings() {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
}

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    const loggedIn = adminAuth.checkSession();

    if (loggedIn) {
        adminPanel.init();
    }

    // Init icons
    if (window.lucide) {
        lucide.createIcons();
    }
});
