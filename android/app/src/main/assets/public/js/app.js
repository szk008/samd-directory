/**
 * SAMD Directory - Main Application Controller
 * Orchestrates all modules and global functionality
 */

// Global toast function
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ'}
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slide-up 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Global utility functions
function getSpecialtyColor(specialty) {
    const specialtyData = SAMD_DATA.specialties[specialty];
    if (specialtyData && specialtyData.color) {
        return specialtyData.color;
    }
    return '#94a3b8'; // Default gray
}

function getSpecialtyLabel(specialty) {
    const specialtyData = SAMD_DATA.specialties[specialty];
    if (specialtyData && specialtyData.label) {
        return specialtyData.label;
    }
    return specialty.charAt(0) + specialty.slice(1).toLowerCase().replace(/_/g, ' ');
}

function getSpecialtyIcon(specialty) {
    const specialtyData = SAMD_DATA.specialties[specialty];
    if (specialtyData && specialtyData.icon) {
        return specialtyData.icon;
    }
    return 'stethoscope';
}

function getInitials(name) {
    const cleanName = name.replace(/^Dr\.?\s*/i, '');
    const parts = cleanName.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || '??';
}

// Main App Controller
class App {
    constructor() {
        this.isDarkTheme = false;

        this.init();
    }

    init() {
        // Check saved theme preference
        this.loadTheme();

        // Load and apply admin settings
        this.applyAdminSettings();

        // Ensure 'All' filter is selected by default
        this.ensureDefaultFilters();

        // Setup global event listeners
        this.setupEventListeners();

        // Hide loading overlay
        this.hideLoading();

        // Initialize icons
        if (window.lucide) {
            lucide.createIcons();
        }

        console.log('🏥 SAMD Directory v2.0 initialized');
    }

    applyAdminSettings() {
        const SETTINGS_KEY = 'samd_admin_settings';
        const stored = localStorage.getItem(SETTINGS_KEY);
        const settings = stored ? JSON.parse(stored) : {
            creatorFooterVisible: true,
            creatorName: 'Dr. Shahnavaz Kanuga',
            creatorPhone: '9879520091',
            showAds: true
        };

        // Apply creator footer
        const creatorFooter = document.getElementById('creatorFooter');
        const creatorName = document.getElementById('creatorName');
        if (creatorFooter) {
            if (settings.creatorFooterVisible === false) {
                creatorFooter.classList.add('hidden');
            } else {
                creatorFooter.classList.remove('hidden');
            }
        }
        if (creatorName && settings.creatorName) {
            creatorName.textContent = settings.creatorName;
            creatorName.href = `tel:${settings.creatorPhone || '9879520091'}`;
        }

        // Apply ads visibility
        if (settings.showAds === false) {
            document.querySelectorAll('.ad-zone').forEach(ad => {
                ad.style.display = 'none';
            });
        }
    }

    ensureDefaultFilters() {
        // Make sure 'All' specialty chip is active
        const allChip = document.querySelector('.specialty-chip[data-specialty="all"]');
        if (allChip) {
            document.querySelectorAll('.specialty-chip').forEach(c => c.classList.remove('active'));
            allChip.classList.add('active');
        }

        // Make sure 'All' filter tab is active
        const allTab = document.querySelector('.filter-tab[data-filter="all"]');
        if (allTab) {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            allTab.classList.add('active');
        }
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());

        // Toggle sidebar
        document.getElementById('toggleSidebar')?.addEventListener('click', () => this.toggleSidebar());

        // Locate button
        document.getElementById('locateBtn')?.addEventListener('click', () => {
            if (window.mapController) {
                window.mapController.locateUser();
            }
        });

        // Reset view button
        document.getElementById('resetViewBtn')?.addEventListener('click', () => {
            if (window.mapController) {
                window.mapController.resetView();
                window.mapController.addMarkers(SAMD_DATA.doctors);
            }
            // Reset any filters
            if (window.directoryController) {
                window.directoryController.nearbyMode = false;
                window.directoryController.nearbyDoctors = [];
                window.directoryController.filterDoctors();
            }
            // Hide location panel
            document.getElementById('locationFilterPanel')?.classList.remove('visible');
        });

        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshData();
        });

        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.mapController) {
                    window.mapController.invalidateSize();
                }
            }, 250);
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }

            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }
        });

        // Handle visibility change (tab focus)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Refresh icons when tab becomes visible
                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        });
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('samd-theme');
        if (savedTheme === 'dark') {
            this.isDarkTheme = true;
            document.documentElement.setAttribute('data-theme', 'dark');
            this.updateThemeIcon();
        }
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
        localStorage.setItem('samd-theme', this.isDarkTheme ? 'dark' : 'light');

        this.updateThemeIcon();

        // Update map tiles
        if (window.mapController) {
            window.mapController.updateTileLayer();
        }
    }

    updateThemeIcon() {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            const icon = btn.querySelector('[data-lucide]');
            if (icon) {
                icon.setAttribute('data-lucide', this.isDarkTheme ? 'sun' : 'moon');
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('sidebar-hidden');

            // Update map size after transition
            setTimeout(() => {
                if (window.mapController) {
                    window.mapController.invalidateSize();
                }
            }, 350);
        }
    }

    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay?.querySelector('.loading-text');

        if (loadingText) loadingText.textContent = text;
        overlay?.classList.add('active');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay?.classList.remove('active');
    }

    async refreshData() {
        this.showLoading('Refreshing data...');

        // In production, this would fetch from server
        // For now, just simulate a refresh
        await new Promise(resolve => setTimeout(resolve, 800));

        // Reinitialize controllers
        if (window.directoryController) {
            window.directoryController.doctors = SAMD_DATA.doctors;
            window.directoryController.filterDoctors();
        }

        if (window.mapController) {
            window.mapController.addMarkers(SAMD_DATA.doctors);
        }

        this.hideLoading();
        showToast('Data refreshed successfully!', 'success');
    }
}

// Service Worker Registration (for PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered:', registration.scope);
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    });
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});

// Expose utilities globally
window.showToast = showToast;
window.getSpecialtyColor = getSpecialtyColor;
window.getSpecialtyLabel = getSpecialtyLabel;
window.getSpecialtyIcon = getSpecialtyIcon;
window.getInitials = getInitials;
