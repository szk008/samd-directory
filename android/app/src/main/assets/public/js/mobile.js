/**
 * Mobile-specific enhancements for SAMD Directory
 * Handles Capacitor integration and native features
 */

// Import Capacitor plugins
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

class MobileEnhancements {
    constructor() {
        this.isNative = Capacitor.isNativePlatform();
        this.init();
    }

    async init() {
        if (!this.isNative) return;

        // Configure status bar
        await this.setupStatusBar();

        // Hide splash screen after load
        window.addEventListener('load', () => {
            setTimeout(() => {
                SplashScreen.hide();
            }, 1000);
        });

        // Handle back button
        App.addListener('backButton', ({ canGoBack }) => {
            if (!canGoBack) {
                App.exitApp();
            } else {
                window.history.back();
            }
        });

        // Override geolocation with native
        this.setupNativeGeolocation();
    }

    async setupStatusBar() {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#0fb89b' });
    }

    setupNativeGeolocation() {
        // Store original
        const originalGeo = navigator.geolocation;

        // Override with native implementation
        navigator.geolocation.getCurrentPosition = async (success, error) => {
            try {
                const permission = await Geolocation.checkPermissions();
                if (permission.location !== 'granted') {
                    const request = await Geolocation.requestPermissions();
                    if (request.location !== 'granted') {
                        error({ code: 1, message: 'Permission denied' });
                        return;
                    }
                }

                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 10000
                });

                success({
                    coords: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed
                    },
                    timestamp: position.timestamp
                });
            } catch (err) {
                error({ code: 2, message: err.message });
            }
        };
    }

    // Configure API base URL for mobile
    getAPIBaseURL() {
        if (this.isNative) {
            // In production, this should point to your deployed backend
            // For now, use environment variable or default to localhost
            return window.SAMD_API_URL || 'http://10.0.2.2:8080'; // Android emulator
        }
        return ''; // Relative URLs for web
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileEnhancements = new MobileEnhancements();
    });
} else {
    window.mobileEnhancements = new MobileEnhancements();
}

export default MobileEnhancements;
