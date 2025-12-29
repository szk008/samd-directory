// ==================== GLOBAL STATE ====================
let map;
let markers = [];
let allDoctors = [];
let filteredDoctors = [];
let markerClusterGroup;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadDoctors();
    initEventListeners();
});

function initMap() {
    // Initialize Leaflet map centered on Surat, India (default)
    map = L.map('map').setView([21.1702, 72.8311], 13);

    // Add OSM tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Initialize marker cluster group
    markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 50
    });

    map.addLayer(markerClusterGroup);
}

function initEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Debounced live search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performSearch(), 500);
    });

    // Navigation buttons
    document.getElementById('doctorLoginBtn').addEventListener('click', () => {
        window.location.href = '/doctor/login';
    });

    document.getElementById('addDoctorBtn').addEventListener('click', () => {
        window.location.href = '/doctor/register';
    });
}

// ==================== DATA LOADING ====================
async function loadDoctors() {
    try {
        showLoading();

        const response = await fetch('/api/search');
        if (!response.ok) throw new Error('Failed to load doctors');

        allDoctors = await response.json();
        filteredDoctors = allDoctors;

        renderDoctors(filteredDoctors);
        renderMarkers(filteredDoctors);
        updateResultCount();

    } catch (error) {
        console.error('Error loading doctors:', error);
        showError('Failed to load doctors. Please refresh the page.');
    }
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();

    if (!query) {
        filteredDoctors = allDoctors;
    } else {
        filteredDoctors = allDoctors.filter(doctor => {
            return (
                doctor.name.toLowerCase().includes(query) ||
                (doctor.specialty && doctor.specialty.toLowerCase().includes(query)) ||
                (doctor.area && doctor.area.toLowerCase().includes(query)) ||
                (doctor.city && doctor.city.toLowerCase().includes(query)) ||
                (doctor.degree && doctor.degree.toLowerCase().includes(query))
            );
        });
    }

    renderDoctors(filteredDoctors);
    renderMarkers(filteredDoctors);
    updateResultCount();
}

// ==================== MAP RENDERING ====================
function renderMarkers(doctors) {
    // Clear existing markers
    markerClusterGroup.clearLayers();
    markers = [];

    doctors.forEach((doctor, index) => {
        if (!doctor.latitude || !doctor.longitude) return;

        // Create marker
        const marker = L.marker([doctor.latitude, doctor.longitude], {
            icon: L.divIcon({
                className: 'custom-marker',
                iconSize: [24, 24]
            })
        });

        // Popup content
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 8px 0;">${doctor.name}</h3>
                <p style="margin: 0; color: #2196F3; font-weight: 500;">${doctor.specialty || 'Doctor'}</p>
                ${doctor.degree ? `<p style="margin: 4px 0 0 0; font-size: 14px;">${doctor.degree}</p>` : ''}
                <p style="margin: 8px 0 0 0; font-size: 14px;">${doctor.area || ''}, ${doctor.city || ''}</p>
            </div>
        `);

        // Click handler - focus on doctor card
        marker.on('click', () => {
            focusDoctorCard(doctor.id);
        });

        // Store reference
        markers.push({ doctor, marker });

        // Add to cluster group
        markerClusterGroup.addLayer(marker);
    });

    // Fit map to markers if any exist
    if (doctors.length > 0 && markers.length > 0) {
        const bounds = markerClusterGroup.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
}

// ==================== DOCTOR CARDS RENDERING ====================
function renderDoctors(doctors) {
    const container = document.getElementById('doctorCards');

    if (doctors.length === 0) {
        container.innerHTML = '<div class="no-results">No doctors found. Try a different search.</div>';
        return;
    }

    container.innerHTML = doctors.map((doctor, index) => createDoctorCard(doctor)).join('');

    // Add click handlers after rendering
    doctors.forEach((doctor, index) => {
        const card = document.getElementById(`doctor-${doctor.id}`);
        if (card) {
            card.addEventListener('click', () => focusMarker(doctor.id));
        }

        // Call button
        const callBtn = card.querySelector('.btn-call');
        if (callBtn) {
            callBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                callDoctor(doctor.id);
            });
        }
    });
}

function createDoctorCard(doctor) {
    return `
        <div class="doctor-card" id="doctor-${doctor.id}">
            <div class="doctor-card-header">
                <div>
                    <h3 class="doctor-name">${doctor.name}</h3>
                    <p class="doctor-specialty">${doctor.specialty || 'General Practitioner'}</p>
                </div>
                ${doctor.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
            </div>
            
            <div class="doctor-info">
                ${doctor.degree ? `
                    <div class="info-item">
                        <svg class="info-icon" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                        </svg>
                        ${doctor.degree}
                    </div>
                ` : ''}
                ${doctor.experience_years ? `
                    <div class="info-item">
                        <svg class="info-icon" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                        </svg>
                        ${doctor.experience_years} years experience
                    </div>
                ` : ''}
                ${doctor.area || doctor.city ? `
                    <div class="info-item">
                        <svg class="info-icon" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                        </svg>
                        ${doctor.area ? doctor.area : ''}${doctor.area && doctor.city ? ', ' : ''}${doctor.city ? doctor.city : ''}
                    </div>
                ` : ''}
            </div>
            
            <div class="doctor-actions">
                <button class="btn btn-call">📞 Call</button>
                <button class="btn btn-details" onclick="window.location.href='/doctor/${doctor.id}'">View Details</button>
            </div>
        </div>
    `;
}

// ==================== INTERACTIONS ====================
function focusMarker(doctorId) {
    const markerData = markers.find(m => m.doctor.id === doctorId);
    if (!markerData) return;

    const { marker, doctor } = markerData;

    // Zoom to marker
    map.setView([doctor.latitude, doctor.longitude], 16);

    // Open popup
    marker.openPopup();

    // Highlight marker (TODO: style active marker)
}

function focusDoctorCard(doctorId) {
    const card = document.getElementById(`doctor-${doctorId}`);
    if (!card) return;

    // Scroll card into view
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Highlight briefly
    card.style.transform = 'scale(1.02)';
    card.style.boxShadow = '0 8px 24px rgba(33, 150, 243, 0.3)';

    setTimeout(() => {
        card.style.transform = '';
        card.style.boxShadow = '';
    }, 1000);
}

async function callDoctor(doctorId) {
    try {
        const response = await fetch(`/api/doctor/${doctorId}/contact`);
        const data = await response.json();

        if (data.contact_number) {
            // Show contact number (in production, this would initiate call via Twilio)
            alert(`Contact: ${data.contact_number}\n\n${data.is_business_number ? 'Business Number' : 'Contact Number'}`);
        } else {
            alert('Contact information not available');
        }
    } catch (error) {
        console.error('Error fetching contact:', error);
        alert('Failed to get contact information');
    }
}

// ==================== HELPER FUNCTIONS ====================
function updateResultCount() {
    const count = filteredDoctors.length;
    const countElement = document.getElementById('resultCount');
    countElement.textContent = `${count} doctor${count !== 1 ? 's' : ''} found`;
}

function showLoading() {
    const container = document.getElementById('doctorCards');
    container.innerHTML = '<div class="loading">Loading doctors...</div>';
}

function showError(message) {
    const container = document.getElementById('doctorCards');
    container.innerHTML = `<div class="no-results">${message}</div>`;
}
