/**
 * SAMD Directory - Navigation Controller
 * Handles navigation tabs with login protection
 */

class NavigationController {
    constructor() {
        this.navTabs = document.getElementById('navTabs');
        this.init();
    }

    init() {
        // Check if user is logged in and show/hide navigation tabs
        this.updateNavVisibility();

        // Attach event listeners
        this.attachEventListeners();

        // Listen for auth state changes
        document.addEventListener('authStateChanged', () => {
            this.updateNavVisibility();
        });
    }

    updateNavVisibility() {
        const authController = window.authController;
        if (authController && authController.isLoggedIn) {
            // User is logged in - show navigation tabs
            if (this.navTabs) {
                this.navTabs.style.display = 'flex';
            }
        } else {
            // User is not logged in - hide navigation tabs
            if (this.navTabs) {
                this.navTabs.style.display = 'none';
            }
        }
    }

    requireLogin(action) {
        const authController = window.authController;
        if (!authController || !authController.isLoggedIn) {
            // User not logged in - show login modal
            if (authController && typeof authController.openModal === 'function') {
                authController.openModal();
            } else {
                alert('Please login to access this feature');
            }
            return false;
        }
        return true;
    }

    attachEventListeners() {
        // Edit Profile Tab
        const editProfileTab = document.getElementById('editProfileTab');
        if (editProfileTab) {
            editProfileTab.addEventListener('click', () => {
                if (this.requireLogin('Edit Profile')) {
                    // Navigate to edit profile or show edit profile modal
                    window.location.href = '/dashboard';
                }
            });
        }

        // Add Doctor Tab (Nav)
        const addDoctorTabNav = document.getElementById('addDoctorTabNav');
        if (addDoctorTabNav) {
            addDoctorTabNav.addEventListener('click', () => {
                if (this.requireLogin('Add Doctor')) {
                    window.location.href = 'add-doctor.html';
                }
            });
        }

        // Admin Tab
        const adminLoginTab = document.getElementById('adminLoginTab');
        if (adminLoginTab) {
            adminLoginTab.addEventListener('click', () => {
                if (this.requireLogin('Admin Panel')) {
                    window.location.href = 'admin.html';
                }
            });
        }

        // Add Doctor FAB (Floating Action Button) - also require login
        const addDoctorBtn = document.getElementById('addDoctorBtn');
        if (addDoctorBtn) {
            addDoctorBtn.addEventListener('click', () => {
                if (this.requireLogin('Add Doctor')) {
                    window.location.href = 'add-doctor.html';
                }
            });
        }
    }
}

// Initialize navigation controller after DOM is loaded
let navigationController;
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for authController to initialize
    setTimeout(() => {
        navigationController = new NavigationController();
        window.navigationController = navigationController;
    }, 100);
});
