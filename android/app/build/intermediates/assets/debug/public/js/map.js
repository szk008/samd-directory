/**
 * SAMD Directory - Map Controller
 * Advanced Leaflet map with clustering, nearby search, and geo-filtering
 */

class MapController {
    constructor() {
        this.map = null;
        this.markers = {};
        this.markerClusterGroup = null;
        this.activeMarkerId = null;
        this.userLocation = null;
        this.userLocationMarker = null;
        this.radiusCircle = null;
        this.selectedRadius = 5; // km
        this.doctors = []; // Store doctors data for dynamic updates

        // Default center: Surat, Gujarat
        this.defaultCenter = [21.1702, 72.8311];
        this.defaultZoom = 11;

        // Map tile layers - Enhanced with better tiles
        this.tileLayers = {
            light: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', // Humanitarian style - colorful
            dark: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', // Dark mode
            fallbackLight: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            fallbackDark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        };

        this.currentTileLayer = null;

        this.init();
    }

    init() {
        // Initialize map
        this.map = L.map('map', {
            center: this.defaultCenter,
            zoom: this.defaultZoom,
            zoomControl: false,
            attributionControl: false
        });

        // Add zoom control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Add attribution
        L.control.attribution({
            position: 'bottomleft',
            prefix: '© <a href="https://openstreetmap.org">OpenStreetMap</a> | SAMD'
        }).addTo(this.map);

        // Set tile layer based on theme
        this.updateTileLayer();

        // Initialize marker cluster group
        this.markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            maxClusterRadius: 60,
            iconCreateFunction: (cluster) => this.createClusterIcon(cluster),
            animate: true,
            animateAddingMarkers: true
        });

        this.map.addLayer(this.markerClusterGroup);

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Radius select
        const radiusSelect = document.getElementById('radiusSelect');
        if (radiusSelect) {
            radiusSelect.addEventListener('change', (e) => {
                this.selectedRadius = parseInt(e.target.value);
                if (this.userLocation) {
                    this.updateRadiusCircle();
                    this.filterByRadius();
                }
            });
        }

        // Clear location filter
        const clearBtn = document.getElementById('clearLocationFilter');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLocationFilter());
        }

        // Map click to deselect
        this.map.on('click', () => {
            this.setActiveMarker(null);
            window.dispatchEvent(new CustomEvent('mapClick'));
        });
    }

    updateTileLayer() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        // Remove existing tile layer
        if (this.currentTileLayer) {
            this.map.removeLayer(this.currentTileLayer);
        }

        // Try enhanced tiles first, fallback to basic tiles if needed
        let tileUrl = isDark ? this.tileLayers.dark : this.tileLayers.light;

        this.currentTileLayer = L.tileLayer(tileUrl, {
            maxZoom: 19,
            attribution: isDark
                ? '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a>'
                : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // Add error handler to fallback to basic tiles
        this.currentTileLayer.on('tileerror', () => {
            console.warn('Enhanced tiles failed, using fallback');
            this.map.removeLayer(this.currentTileLayer);
            const fallbackUrl = isDark ? this.tileLayers.fallbackDark : this.tileLayers.fallbackLight;
            this.currentTileLayer = L.tileLayer(fallbackUrl, {
                maxZoom: 19,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(this.map);
        });
    }

    createClusterIcon(cluster) {
        const count = cluster.getChildCount();
        const size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
        const sizes = { small: 40, medium: 50, large: 60 };

        // Get dominant specialty color in cluster
        const children = cluster.getAllChildMarkers();
        const specialtyCounts = {};
        children.forEach(marker => {
            const spec = marker.options.specialty || 'OTHER';
            specialtyCounts[spec] = (specialtyCounts[spec] || 0) + 1;
        });

        const dominantSpecialty = Object.entries(specialtyCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'OTHER';
        const dominantColor = getSpecialtyColor(dominantSpecialty);

        return L.divIcon({
            html: `
                <div style="
                    background: linear-gradient(135deg, ${dominantColor}, ${this.adjustColor(dominantColor, -20)});
                    color: white;
                    width: ${sizes[size]}px;
                    height: ${sizes[size]}px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: ${size === 'large' ? '16px' : '14px'};
                    font-family: 'Outfit', sans-serif;
                    box-shadow: 0 4px 15px ${dominantColor}66, 0 2px 6px rgba(0,0,0,0.2);
                    border: 3px solid white;
                    transition: transform 0.2s ease;
                ">${count}</div>
            `,
            className: 'custom-cluster-icon',
            iconSize: [sizes[size], sizes[size]]
        });
    }

    adjustColor(color, amount) {
        // Darken or lighten a hex color
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    }

    getIconSvg(name) {
        const icons = {
            'heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />',
            'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M2 12h2l2 4 4-10 2 6h4" />',
            'stethoscope': '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 0 .6h1a1.2 1.2 0 0 1 1.2 1.2v5a4.8 4.8 0 1 1-9.6 0V4a1.2 1.2 0 0 1 1.2-1.2h.8z"/><path d="M11 15h2a6 6 0 1 0 0-12"/>',
            'sparkles': '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>',
            'ear': '<path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 0 4 0v-1"/>',
            'baby': '<path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 19 6.3Z"/>',
            'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
            'bone': '<path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"/>',
            'microscope': '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
            'scan': '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.9-1.9"/>',
            'scissors': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" x2="8.12" y1="4" y2="15.88"/><line x1="14.47" x2="20" y1="14.48" y2="20"/><line x1="8.12" x2="12" y1="8.12" y2="12"/>',
            'smile': '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
            'brain': '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>',
            'ribbon': '<path d="M4.588 5.428A6.002 6.002 0 0 1 12 2a6 6 0 0 1 7.412 3.428l-5.698 12.352c-.502 1.088-2.926 1.088-3.428 0Z"/><path d="m14 18 3.5 4"/><path d="m10 18-3.5 4"/>',
            'droplet': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
            'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
            'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
            'leaf': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
            'flower': '<circle cx="12" cy="12" r="3"/><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"/><path d="M12 7.5V9"/><path d="M7.5 12H9"/><path d="M16.5 12H15"/><path d="M12 16.5V15"/><path d="m8 8 1.88 1.88"/><path d="M14.12 9.88 16 8"/><path d="m8 16 1.88-1.88"/><path d="M14.12 14.12 16 16"/>',
            'flask': '<path d="M9 3v5l-3 6.95c-.39.84-.2 1.85.5 2.5.7.65 1.7.75 2.5.25v2.8h6v-2.8c.8.5 1.8.4 2.5-.25.7-.65.89-1.66.5-2.5L15 8V3h-6Z"/><path d="M10 6h4"/>'
        };
        const path = icons[name] || icons['user'];
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    }

    createMarkerIcon(doctor, isActive = false) {
        const color = getSpecialtyColor(doctor.specialty);
        // Look up icon from SAMD_DATA or use default
        const specialtyData = SAMD_DATA.specialties[doctor.specialty];
        const iconName = specialtyData ? specialtyData.icon : 'user';
        const iconSvg = this.getIconSvg(iconName);

        const size = isActive ? 48 : 42;

        return L.divIcon({
            html: `
                <div style="
                    width: ${size}px;
                    height: ${size}px;
                    background: ${isActive ? 'var(--gray-800)' : color};
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    border: 3px solid white;
                    /* Ensure the inner icon remains upright relative to correct orientation */
                    position: relative;
                ">
                    <div style="
                        transform: rotate(45deg);
                        width: 22px;
                        height: 22px;
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        ${iconSvg}
                    </div>
                </div>
            `,
            className: 'custom-marker-icon',
            iconSize: [size, size],
            iconAnchor: [size / 2, size * 0.85], // Anchored at the point
            popupAnchor: [0, -size + 10]
        });
    }

    createPopupContent(doctor) {
        const color = getSpecialtyColor(doctor.specialty);
        const label = getSpecialtyLabel(doctor.specialty);
        const isFavorite = window.favoritesController?.isFavorite(doctor.id);

        // Use icon for popup avatar too for consistency
        const specialtyData = SAMD_DATA.specialties[doctor.specialty];
        const iconName = specialtyData ? specialtyData.icon : 'user';
        const iconSvg = this.getIconSvg(iconName);

        return `
            <div class="popup-content">
                <div class="popup-header">
                    <div class="popup-avatar" style="
                        background: linear-gradient(135deg, ${color}88, ${color});
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                    ">
                        <div style="width: 24px; height: 24px;">${iconSvg}</div>
                    </div>
                    <div class="popup-info">
                        <div class="popup-name">${doctor.name}</div>
                        <div class="popup-specialty" style="color: ${color};">${label}</div>
                    </div>
                </div>
                <div class="popup-details">
                    ${doctor.phone ? `
                        <div class="popup-detail-item">
                            <strong>📞 Phone:</strong>
                            <span><a href="tel:${doctor.phone}" style="color: var(--primary-600); text-decoration: none;">${doctor.phone}</a></span>
                        </div>
                    ` : ''}
                    ${doctor.qualification ? `
                        <div class="popup-detail-item">
                            <strong>🎓 Qualification:</strong>
                            <span>${doctor.qualification}</span>
                        </div>
                    ` : ''}
                    ${doctor.hospital ? `
                        <div class="popup-detail-item">
                            <strong>🏥 Hospital:</strong>
                            <span>${doctor.hospital}</span>
                        </div>
                    ` : ''}
                    ${doctor.address ? `
                        <div class="popup-detail-item">
                            <strong>📍 Address:</strong>
                            <span>${doctor.address}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="popup-actions">
                    ${doctor.phone ? `
                        <a href="https://wa.me/91${doctor.phone.replace(/\D/g, '')}?text=Hello Dr. ${encodeURIComponent(doctor.name)}, I found your profile on SAMD Directory." target="_blank" class="popup-btn primary" style="text-decoration: none; background-color: #25D366; border-color: #25D366;">
                            💬 WhatsApp
                        </a>
                    ` : ''}
                    <button class="popup-btn secondary" onclick="mapController.getDirections(${doctor.lat}, ${doctor.lng})">
                        📍 Directions
                    </button>
                    <button class="popup-btn secondary" onclick="mapController.toggleFavorite(${doctor.id})" 
                            style="flex: 0; padding: 12px; ${isFavorite ? 'background: var(--error); color: white;' : ''}">
                        ${isFavorite ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        `;
    }

    addMarkers(doctors) {
        // Store doctors reference for use in other methods
        this.doctors = doctors;

        // Clear existing markers
        this.markerClusterGroup.clearLayers();
        this.markers = {};

        // Add markers for doctors with valid coordinates
        doctors.forEach(doctor => {
            if (doctor.lat && doctor.lng) {
                const marker = L.marker([doctor.lat, doctor.lng], {
                    icon: this.createMarkerIcon(doctor),
                    specialty: doctor.specialty
                });

                marker.bindPopup(this.createPopupContent(doctor), {
                    maxWidth: 360,
                    className: 'custom-popup'
                });

                marker.on('click', () => {
                    this.setActiveMarker(doctor.id);

                    // Dispatch event for directory to handle
                    window.dispatchEvent(new CustomEvent('markerClick', {
                        detail: { doctorId: doctor.id }
                    }));
                });

                marker.doctorId = doctor.id;
                this.markers[doctor.id] = marker;
                this.markerClusterGroup.addLayer(marker);
            }
        });

        // Fit bounds if we have markers
        if (Object.keys(this.markers).length > 0) {
            this.fitBounds();
        }
    }

    setActiveMarker(doctorId) {
        // Reset previous active marker
        if (this.activeMarkerId && this.markers[this.activeMarkerId]) {
            const prevDoctor = this.doctors.find(d => d.id === this.activeMarkerId);
            if (prevDoctor) {
                this.markers[this.activeMarkerId].setIcon(this.createMarkerIcon(prevDoctor, false));
            }
        }

        // Set new active marker
        if (doctorId && this.markers[doctorId]) {
            const doctor = this.doctors.find(d => d.id === doctorId);
            if (doctor) {
                this.markers[doctorId].setIcon(this.createMarkerIcon(doctor, true));
                this.activeMarkerId = doctorId;
            }
        } else {
            this.activeMarkerId = null;
        }
    }

    focusMarker(doctorId, openPopup = true) {
        const marker = this.markers[doctorId];
        if (marker) {
            const doctor = this.doctors.find(d => d.id === doctorId);
            if (doctor && doctor.lat && doctor.lng) {
                this.map.flyTo([doctor.lat, doctor.lng], 16, {
                    duration: 0.8
                });

                this.setActiveMarker(doctorId);

                if (openPopup) {
                    setTimeout(() => {
                        marker.openPopup();
                    }, 800);
                }
            }
        }
    }

    fitBounds() {
        if (this.markerClusterGroup.getLayers().length > 0) {
            const bounds = this.markerClusterGroup.getBounds();
            this.map.fitBounds(bounds, {
                padding: [60, 60],
                maxZoom: 13,
                animate: true
            });
        }
    }

    resetView() {
        this.map.flyTo(this.defaultCenter, this.defaultZoom, { duration: 0.5 });
        this.setActiveMarker(null);
    }

    // Geolocation - Find doctors near me
    async locateUser() {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser', 'error');
            return null;
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.userLocation = [latitude, longitude];

                    // Add user location marker
                    this.addUserMarker(latitude, longitude);

                    // Show radius circle
                    this.updateRadiusCircle();

                    // Center map on user
                    this.map.flyTo(this.userLocation, 14, { duration: 0.8 });

                    // Show location filter panel
                    const panel = document.getElementById('locationFilterPanel');
                    if (panel) panel.classList.add('visible');

                    // Filter doctors by radius
                    this.filterByRadius();

                    resolve(this.userLocation);
                },
                (error) => {
                    let message = 'Could not get your location';
                    if (error.code === 1) message = 'Location access denied. Please enable in browser settings.';
                    else if (error.code === 2) message = 'Location unavailable';
                    else if (error.code === 3) message = 'Location request timed out';

                    showToast(message, 'error');
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes cache
                }
            );
        });
    }

    addUserMarker(lat, lng) {
        // Remove existing user marker
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
        }

        const userIcon = L.divIcon({
            html: `
                <div style="
                    width: 24px;
                    height: 24px;
                    background: var(--info);
                    border: 4px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.2);
                    animation: pulse-soft 2s infinite;
                "></div>
            `,
            className: 'user-location-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        this.userLocationMarker = L.marker([lat, lng], { icon: userIcon })
            .addTo(this.map)
            .bindPopup('<strong>You are here</strong>');
    }

    updateRadiusCircle() {
        if (!this.userLocation) return;

        // Remove existing circle
        if (this.radiusCircle) {
            this.map.removeLayer(this.radiusCircle);
        }

        // Add new circle
        this.radiusCircle = L.circle(this.userLocation, {
            radius: this.selectedRadius * 1000, // Convert km to meters
            color: 'var(--primary-500)',
            fillColor: 'var(--primary-500)',
            fillOpacity: 0.1,
            weight: 2
        }).addTo(this.map);
    }

    filterByRadius() {
        if (!this.userLocation) return;

        const [userLat, userLng] = this.userLocation;
        const radiusKm = this.selectedRadius;

        // Filter doctors by distance
        const nearbyDoctors = this.doctors.filter(doctor => {
            if (!doctor.lat || !doctor.lng) return false;
            const distance = this.calculateDistance(userLat, userLng, doctor.lat, doctor.lng);
            return distance <= radiusKm;
        });

        // Update markers
        this.addMarkers(nearbyDoctors);

        // Notify directory controller
        window.dispatchEvent(new CustomEvent('nearbyDoctorsFiltered', {
            detail: {
                doctors: nearbyDoctors,
                center: this.userLocation,
                radius: radiusKm
            }
        }));

        showToast(`Found ${nearbyDoctors.length} doctors within ${radiusKm} km`);
    }

    clearLocationFilter() {
        // Remove user marker and circle
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
            this.userLocationMarker = null;
        }
        if (this.radiusCircle) {
            this.map.removeLayer(this.radiusCircle);
            this.radiusCircle = null;
        }

        this.userLocation = null;

        // Hide filter panel
        const panel = document.getElementById('locationFilterPanel');
        if (panel) panel.classList.remove('visible');

        // Reset to all doctors
        window.dispatchEvent(new CustomEvent('locationFilterCleared'));

        showToast('Location filter cleared');
    }

    // Haversine formula for distance calculation
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(deg) {
        return deg * (Math.PI / 180);
    }

    // Get directions to location
    getDirections(lat, lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }

    // Toggle favorite from popup
    toggleFavorite(doctorId) {
        if (window.favoritesController) {
            const added = window.favoritesController.toggle(doctorId);

            // Refresh popup content
            const marker = this.markers[doctorId];
            if (marker) {
                const doctor = this.doctors.find(d => d.id === doctorId);
                if (doctor) {
                    marker.setPopupContent(this.createPopupContent(doctor));
                }
            }

            showToast(added ? 'Added to favorites!' : 'Removed from favorites');
        }
    }

    // Recalculate map size (for responsive)
    invalidateSize() {
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }

    // Get all doctors within current map bounds
    getDoctorsInView() {
        const bounds = this.map.getBounds();
        return this.doctors.filter(doctor => {
            if (!doctor.lat || !doctor.lng) return false;
            return bounds.contains([doctor.lat, doctor.lng]);
        });
    }
}

// Initialize map controller globally
document.addEventListener('DOMContentLoaded', () => {
    window.mapController = new MapController();
});
