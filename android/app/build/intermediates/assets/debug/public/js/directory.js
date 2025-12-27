/**
 * SAMD Directory - Enhanced Directory Controller
 * Handles doctor listing, search, filtering, favorites, and premium features
 */

class DirectoryController {
    constructor() {
        this.doctors = [];
        this.filteredDoctors = [];
        this.activeSpecialty = 'all';
        this.activeFilter = 'all';
        this.searchQuery = '';
        this.activeCardId = null;
        this.viewMode = 'list'; // 'list' or 'grid'
        this.nearbyMode = false;
        this.nearbyDoctors = [];

        // DOM Elements
        this.doctorListEl = document.getElementById('doctorList');
        this.searchInputEl = document.getElementById('searchInput');
        this.searchClearEl = document.getElementById('searchClear');
        this.specialtyFiltersEl = document.getElementById('specialtyFilters');
        this.doctorCountEl = document.getElementById('doctorCount');
        this.emptyStateEl = document.getElementById('emptyState');

        this.init();
    }

    async init() {
        // Fetch doctors from API (with fallback to static data)
        await this.fetchDoctors();

        this.filteredDoctors = [...this.doctors];

        // Sort: featured first, then premium, then verified
        this.sortDoctors();

        // Setup event listeners
        this.setupEventListeners();

        // Render specialty filters
        this.renderSpecialtyFilters();

        // Render initial list
        this.renderDoctorList();

        // Update count
        this.updateCount();

        // Add markers to map after a short delay
        setTimeout(() => {
            if (window.mapController) {
                window.mapController.addMarkers(this.filteredDoctors);
            }
        }, 100);

        // Check if user is logged in and auto-center map
        this.checkCurrentUser();
    }

    async fetchDoctors() {
        try {
            const response = await fetch('/api/doctors');
            if (response.ok) {
                const data = await response.json();
                this.doctors = data.doctors || [];
                console.log('✅ Loaded doctors from API:', this.doctors.length);
            } else {
                throw new Error('API request failed');
            }
        } catch (error) {
            console.warn('⚠️ Failed to fetch doctors from API, using static data:', error);
            this.doctors = SAMD_DATA.doctors;
        }
    }

    async checkCurrentUser() {
        try {
            const response = await fetch('/api/current-user');
            if (response.ok) {
                const userData = await response.json();
                if (userData.authenticated && userData.doctor_id) {
                    // User is a logged-in doctor, auto-center map on their location
                    const doctorId = userData.doctor_id;
                    const doctor = this.doctors.find(d => d.id === doctorId);

                    if (doctor && window.mapController) {
                        console.log('🎯 Auto-centering map on logged-in doctor:', doctor.name);
                        setTimeout(() => {
                            window.mapController.focusMarker(doctorId, true);
                        }, 500);
                    }
                }
            }
        } catch (error) {
            console.warn('Could not check current user:', error);
        }
    }

    setupEventListeners() {
        // Search input
        this.searchInputEl?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase().trim();
            this.updateSearchClear();
            this.filterDoctors();
        });

        // Search clear button
        this.searchClearEl?.addEventListener('click', () => {
            this.searchInputEl.value = '';
            this.searchQuery = '';
            this.updateSearchClear();
            this.filterDoctors();
        });

        // District Filter
        document.getElementById('districtFilter')?.addEventListener('change', (e) => {
            this.updateAreaOptions(e.target.value);
            this.filterDoctors();
        });

        // Area Filter
        document.getElementById('areaFilter')?.addEventListener('change', () => {
            this.filterDoctors();
        });

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeFilter = tab.dataset.filter;
                this.filterDoctors();
            });
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.viewMode = btn.dataset.view;
                this.updateViewMode();
            });
        });

        // Initial population of areas only if areas exist and nothing selected
        if (!document.getElementById('districtFilter').value) {
            this.updateAreaOptions('');
        }

        // Listen for marker clicks from map
        window.addEventListener('markerClick', (e) => {
            this.setActiveCard(e.detail.doctorId);
            this.scrollToCard(e.detail.doctorId);
        });

        // Listen for map clicks to deselect
        window.addEventListener('mapClick', () => {
            this.setActiveCard(null);
        });

        // Listen for nearby doctors filter
        window.addEventListener('nearbyDoctorsFiltered', (e) => {
            this.nearbyMode = true;
            this.nearbyDoctors = e.detail.doctors;
            this.filterDoctors();
        });

        // Listen for location filter cleared
        window.addEventListener('locationFilterCleared', () => {
            this.nearbyMode = false;
            this.nearbyDoctors = [];
            this.filterDoctors();
        });

        // Listen for favorite changes
        window.addEventListener('favoriteChanged', (e) => {
            this.updateFavoriteButton(e.detail.doctorId, e.detail.added);
        });

        // Mobile sidebar handle
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.addEventListener('click', (e) => {
                if (e.target === sidebar || e.target.closest('.sidebar-header')) {
                    sidebar.classList.toggle('expanded');
                }
            });
        }
    }

    sortDoctors() {
        this.doctors.sort((a, b) => {
            // Featured first
            const aFeatured = a.subscriptionTier === 'featured' || a.featured ? 2 : 0;
            const bFeatured = b.subscriptionTier === 'featured' || b.featured ? 2 : 0;
            if (aFeatured !== bFeatured) return bFeatured - aFeatured;

            // Premium second
            const aPremium = a.subscriptionTier === 'premium' ? 1 : 0;
            const bPremium = b.subscriptionTier === 'premium' ? 1 : 0;
            if (aPremium !== bPremium) return bPremium - aPremium;

            // Then by name
            return a.name.localeCompare(b.name);
        });
    }

    updateSearchClear() {
        if (this.searchClearEl) {
            this.searchClearEl.classList.toggle('visible', this.searchQuery.length > 0);
        }
    }

    updateViewMode() {
        if (this.doctorListEl) {
            this.doctorListEl.classList.toggle('grid-view', this.viewMode === 'grid');
        }
    }

    updateAreaOptions(district) {
        const select = document.getElementById('areaFilter');
        if (!select) return;

        // Clear existing options except first
        select.innerHTML = '<option value="">All Areas</option>';

        let areas = [];
        if (district && typeof GUJARAT_DATA !== 'undefined' && GUJARAT_DATA[district]) {
            areas = GUJARAT_DATA[district];
        } else if (typeof GUJARAT_DATA !== 'undefined') {
            // No district selected - show all areas flattened
            areas = Object.values(GUJARAT_DATA).flat();
        }

        // Sort and deduplicate
        areas = [...new Set(areas)].sort();

        areas.forEach(area => {
            const opt = document.createElement('option');
            opt.value = area;
            opt.textContent = area;
            select.appendChild(opt);
        });
    }

    renderSpecialtyFilters() {
        // Get unique specialties with counts
        const specialtyCounts = {};
        this.doctors.forEach(doctor => {
            specialtyCounts[doctor.specialty] = (specialtyCounts[doctor.specialty] || 0) + 1;
        });

        // Sort by count
        const sortedSpecialties = Object.entries(specialtyCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([spec]) => spec);

        // Render chips
        let html = `
            <button class="specialty-chip active" data-specialty="all">
                <span class="chip-dot" style="background: var(--primary-500);"></span>
                All (${this.doctors.length})
            </button>
        `;

        sortedSpecialties.forEach(specialty => {
            const count = specialtyCounts[specialty];
            const color = getSpecialtyColor(specialty);
            const label = getSpecialtyLabel(specialty);
            html += `
                <button class="specialty-chip" data-specialty="${specialty}" style="--specialty-color: ${color}">
                    <span class="chip-dot" style="background: ${color};"></span>
                    ${label} (${count})
                </button>
            `;
        });

        if (this.specialtyFiltersEl) {
            this.specialtyFiltersEl.innerHTML = html;

            // Add click handlers
            this.specialtyFiltersEl.querySelectorAll('.specialty-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    this.specialtyFiltersEl.querySelectorAll('.specialty-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    this.activeSpecialty = chip.dataset.specialty;
                    this.filterDoctors();
                });
            });
        }
    }

    filterDoctors() {
        let baseList = this.nearbyMode ? this.nearbyDoctors : this.doctors;

        this.filteredDoctors = baseList.filter(doctor => {
            // Filter by specialty
            if (this.activeSpecialty !== 'all' && doctor.specialty !== this.activeSpecialty) {
                return false;
            }

            // Filter by tab (verified, nearby handled above)
            if (this.activeFilter === 'verified' && !doctor.verified) {
                return false;
            }

            // District Filter
            const districtVal = document.getElementById('districtFilter')?.value;
            if (districtVal && doctor.district !== districtVal) {
                return false;
            }

            // Area Filter
            const areaVal = document.getElementById('areaFilter')?.value.toLowerCase().trim();
            if (areaVal) {
                const areaText = [doctor.city, doctor.address, doctor.pincode].filter(Boolean).join(' ').toLowerCase();
                if (!areaText.includes(areaVal)) return false;
            }

            // Filter by search query
            if (this.searchQuery) {
                const searchFields = [
                    doctor.name,
                    doctor.qualification,
                    doctor.hospital,
                    doctor.address,
                    doctor.specialty,
                    doctor.phone,
                    getSpecialtyLabel(doctor.specialty)
                ].filter(Boolean).join(' ').toLowerCase();

                // Smart search - check each word
                const queryWords = this.searchQuery.split(' ');
                if (!queryWords.every(word => searchFields.includes(word))) {
                    return false;
                }
            }

            return true;
        });

        // Sort alphabetically by name
        this.filteredDoctors.sort((a, b) => a.name.localeCompare(b.name));

        this.renderDoctorList();
        this.updateCount();

        // Update map markers
        if (window.mapController && !this.nearbyMode) {
            window.mapController.addMarkers(this.filteredDoctors);
        }
    }

    showFavorites() {
        if (!window.favoritesController) return;

        const favoriteIds = window.favoritesController.getAll();
        this.filteredDoctors = this.doctors.filter(d => favoriteIds.includes(d.id));

        this.renderDoctorList();
        this.updateCount();

        if (window.mapController) {
            window.mapController.addMarkers(this.filteredDoctors);
        }

        showToast(`Showing ${this.filteredDoctors.length} favorite(s)`);
    }

    renderDoctorList() {
        if (!this.doctorListEl) return;

        if (this.filteredDoctors.length === 0) {
            this.doctorListEl.innerHTML = '';
            if (this.emptyStateEl) {
                this.emptyStateEl.style.display = 'block';
                this.doctorListEl.appendChild(this.emptyStateEl);
            }
            return;
        }

        if (this.emptyStateEl) {
            this.emptyStateEl.style.display = 'none';
        }

        // Add inline ads every 8 doctors
        let html = '';
        this.filteredDoctors.forEach((doctor, index) => {
            html += this.renderDoctorCard(doctor);

            // Insert ad after every 8th doctor
            if ((index + 1) % 8 === 0 && index < this.filteredDoctors.length - 1) {
                html += `<div class="ad-zone ad-zone-inline" data-ad-slot="inline-${index}"></div>`;
            }
        });

        this.doctorListEl.innerHTML = html;

        // Reinitialize ads
        if (window.adsController) {
            window.adsController.initializeAdZones();
        }

        // Add click handlers to cards
        this.doctorListEl.querySelectorAll('.doctor-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking action buttons
                if (e.target.closest('.action-btn')) return;

                const doctorId = parseInt(card.dataset.id);
                this.handleCardClick(doctorId);
            });
        });

        // Reinitialize lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    renderDoctorCard(doctor) {
        const color = getSpecialtyColor(doctor.specialty);
        const label = getSpecialtyLabel(doctor.specialty);
        const initials = getInitials(doctor.name);
        const isActive = this.activeCardId === doctor.id;
        const isFavorite = window.favoritesController?.isFavorite(doctor.id);

        let cardClass = isActive ? 'active' : '';

        return `
            <div class="doctor-card ${cardClass}" data-id="${doctor.id}" style="--specialty-color: ${color}">
                <div class="doctor-header">
                    <div class="doctor-avatar" style="background: linear-gradient(135deg, ${color}66, ${color}cc);">
                        ${initials}
                        ${doctor.verified ? `
                            <div class="verified-indicator">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                            </div>
                        ` : ''}
                    </div>
                    <div class="doctor-info">
                        <div class="doctor-name">${doctor.name}</div>
                        <div class="doctor-specialty">
                            <span class="specialty-dot" style="background: ${color}"></span>
                            ${label}
                        </div>
                    </div>
                </div>
                
                <div class="doctor-details">
                    ${doctor.qualification ? `
                        <div class="detail-item">
                            <i data-lucide="graduation-cap" class="detail-icon"></i>
                            <span class="detail-text">${doctor.qualification}</span>
                        </div>
                    ` : ''}
                    
                    ${doctor.hospital ? `
                        <div class="detail-item">
                            <i data-lucide="building-2" class="detail-icon"></i>
                            <span class="detail-text">${doctor.hospital}</span>
                        </div>
                    ` : ''}
                    
                    ${doctor.address ? `
                        <div class="detail-item">
                            <i data-lucide="map-pin" class="detail-icon"></i>
                            <span class="detail-text">${doctor.address}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="doctor-actions">
                    ${doctor.phone ? `
                        <a href="tel:${doctor.phone}" class="action-btn call-btn" onclick="event.stopPropagation();">
                            <i data-lucide="phone" style="width: 14px; height: 14px;"></i>
                            Call
                        </a>
                    ` : ''}
                    <button class="action-btn" onclick="event.stopPropagation(); directoryController.getDirections(${doctor.id});">
                        <i data-lucide="navigation" style="width: 14px; height: 14px;"></i>
                        Directions
                    </button>
                    <button class="action-btn favorite-btn ${isFavorite ? 'active' : ''}" 
                            onclick="event.stopPropagation(); directoryController.toggleFavorite(${doctor.id});"
                            data-doctor-id="${doctor.id}">
                        <i data-lucide="${isFavorite ? 'heart' : 'heart'}" style="width: 14px; height: 14px; ${isFavorite ? 'fill: white;' : ''}"></i>
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); directoryController.shareDoctor(${doctor.id});">
                        <i data-lucide="share-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </div>
        `;
    }

    handleCardClick(doctorId) {
        this.setActiveCard(doctorId);

        // Find the doctor and activate their specialty filter
        const doctor = this.doctors.find(d => d.id === doctorId);
        if (doctor && doctor.specialty) {
            // Switch specialty filter to this doctor's specialty
            this.setSpecialtyFilter(doctor.specialty);
        }

        // Focus on map marker and open popup
        if (window.mapController) {
            window.mapController.focusMarker(doctorId, true);
        }
    }

    setSpecialtyFilter(specialty) {
        // Update active specialty
        this.activeSpecialty = specialty;

        // Update UI - activate the correct chip
        if (this.specialtyFiltersEl) {
            this.specialtyFiltersEl.querySelectorAll('.specialty-chip').forEach(chip => {
                chip.classList.remove('active');
                if (chip.dataset.specialty === specialty) {
                    chip.classList.add('active');
                    // Scroll chip into view
                    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            });
        }
    }

    setActiveCard(doctorId) {
        // Remove active from previous
        if (this.activeCardId) {
            const prevCard = this.doctorListEl?.querySelector(`.doctor-card[data-id="${this.activeCardId}"]`);
            if (prevCard) prevCard.classList.remove('active');
        }

        // Set new active
        this.activeCardId = doctorId;
        if (doctorId) {
            const card = this.doctorListEl?.querySelector(`.doctor-card[data-id="${doctorId}"]`);
            if (card) card.classList.add('active');
        }
    }

    scrollToCard(doctorId) {
        const card = this.doctorListEl?.querySelector(`.doctor-card[data-id="${doctorId}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    updateCount() {
        if (this.doctorCountEl) {
            this.doctorCountEl.textContent = this.filteredDoctors.length;
        }
    }

    updateFavoriteButton(doctorId, isFavorite) {
        const btn = this.doctorListEl?.querySelector(`.favorite-btn[data-doctor-id="${doctorId}"]`);
        if (btn) {
            btn.classList.toggle('active', isFavorite);
            // Re-render icon
            const icon = btn.querySelector('i');
            if (icon) {
                icon.style.fill = isFavorite ? 'white' : 'none';
            }
        }
    }

    toggleFavorite(doctorId) {
        if (window.favoritesController) {
            const added = window.favoritesController.toggle(doctorId);
            showToast(added ? 'Added to favorites!' : 'Removed from favorites');
        } else {
            // Require auth for favorites
            if (window.authController) {
                window.authController.requireAuth(() => {
                    this.toggleFavorite(doctorId);
                });
            }
        }
    }

    getDirections(doctorId) {
        const doctor = this.doctors.find(d => d.id === doctorId);
        if (doctor && doctor.lat && doctor.lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${doctor.lat},${doctor.lng}`, '_blank');
        } else if (doctor && doctor.address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.address)}`, '_blank');
        }
    }

    shareDoctor(doctorId) {
        const doctor = this.doctors.find(d => d.id === doctorId);
        if (!doctor) return;

        const shareText = `${doctor.name}
${getSpecialtyLabel(doctor.specialty)}
${doctor.hospital || ''}
${doctor.phone ? 'Phone: ' + doctor.phone : ''}

Find more doctors at SAMD Directory`;

        const shareData = {
            title: doctor.name,
            text: shareText,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(() => { });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                showToast('Doctor info copied to clipboard!');
            }).catch(() => {
                showToast('Could not share. Please try again.', 'error');
            });
        }
    }
}

// Initialize directory controller globally
let directoryController;
document.addEventListener('DOMContentLoaded', () => {
    directoryController = new DirectoryController();
});
