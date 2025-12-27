/**
 * SAMD Directory - Favorites System
 * Local storage based favorites with cloud sync capability
 */

class FavoritesController {
    constructor() {
        this.favorites = new Set();
        this.storageKey = 'samd-favorites';

        this.init();
    }

    init() {
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.favorites = new Set(parsed);
            }
        } catch (e) {
            console.error('Failed to load favorites:', e);
            this.favorites = new Set();
        }
    }

    saveToStorage() {
        try {
            const arr = Array.from(this.favorites);
            localStorage.setItem(this.storageKey, JSON.stringify(arr));
        } catch (e) {
            console.error('Failed to save favorites:', e);
        }
    }

    add(doctorId) {
        this.favorites.add(doctorId);
        this.saveToStorage();
        this.notifyChange(doctorId, true);
        return true;
    }

    remove(doctorId) {
        this.favorites.delete(doctorId);
        this.saveToStorage();
        this.notifyChange(doctorId, false);
        return true;
    }

    toggle(doctorId) {
        if (this.isFavorite(doctorId)) {
            this.remove(doctorId);
            return false;
        } else {
            this.add(doctorId);
            return true;
        }
    }

    isFavorite(doctorId) {
        return this.favorites.has(doctorId);
    }

    getAll() {
        return Array.from(this.favorites);
    }

    count() {
        return this.favorites.size;
    }

    clear() {
        this.favorites.clear();
        this.saveToStorage();
        window.dispatchEvent(new CustomEvent('favoritesCleared'));
    }

    notifyChange(doctorId, added) {
        window.dispatchEvent(new CustomEvent('favoriteChanged', {
            detail: { doctorId, added, count: this.count() }
        }));
    }

    // Cloud sync methods (mock - would connect to Firebase)
    async syncFromServer() {
        // In production, fetch favorites from user's cloud storage
        console.log('[Favorites] Syncing from server...');

        // Mock: just return local favorites
        return this.getAll();
    }

    async syncToServer() {
        // In production, save favorites to user's cloud storage
        console.log('[Favorites] Syncing to server...', this.getAll());

        // Mock: pretend it worked
        return true;
    }

    // Export favorites as shareable list
    exportAsList() {
        const doctors = SAMD_DATA.doctors.filter(d => this.isFavorite(d.id));
        let text = 'My Favorite Doctors from SAMD Directory\n';
        text += '='.repeat(40) + '\n\n';

        doctors.forEach((doc, i) => {
            text += `${i + 1}. ${doc.name}\n`;
            text += `   Specialty: ${getSpecialtyLabel(doc.specialty)}\n`;
            if (doc.phone) text += `   Phone: ${doc.phone}\n`;
            if (doc.hospital) text += `   Hospital: ${doc.hospital}\n`;
            text += '\n';
        });

        text += '\nGenerated from SAMD Directory - samd.org';

        return text;
    }

    shareFavorites() {
        const text = this.exportAsList();

        if (navigator.share) {
            navigator.share({
                title: 'My Favorite Doctors - SAMD',
                text: text
            }).catch(() => { });
        } else {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Favorites list copied to clipboard!');
            }).catch(() => {
                showToast('Could not copy favorites.', 'error');
            });
        }
    }
}

// Initialize favorites controller globally
let favoritesController;
document.addEventListener('DOMContentLoaded', () => {
    favoritesController = new FavoritesController();
});
