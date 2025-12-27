/**
 * SAMD Directory - Ads Management
 * Google AdSense integration with placeholders and subscription tiers
 */

class AdsController {
    constructor() {
        // AdSense configuration (placeholder - replace with actual IDs)
        this.config = {
            enabled: true,
            publisherId: 'ca-pub-XXXXXXXXXXXXXXXX', // Replace with actual AdSense ID
            adSlots: {
                'sidebar-top': 'XXXXXXXXXX',
                'sidebar-inline': 'XXXXXXXXXX',
                'header-banner': 'XXXXXXXXXX'
            }
        };

        this.adBlockDetected = false;
        this.loadedAds = new Set();

        this.init();
    }

    init() {
        // Check for ad blocker
        this.detectAdBlocker();

        // Initialize ad zones
        this.initializeAdZones();

        // Load AdSense script if not already loaded
        if (this.config.enabled && !this.adBlockDetected) {
            this.loadAdSenseScript();
        }
    }

    async detectAdBlocker() {
        try {
            // Try to create a bait element
            const bait = document.createElement('div');
            bait.className = 'adsbox ad-banner textads banner-ads';
            bait.style.cssText = 'position: absolute; top: -10px; left: -10px; width: 1px; height: 1px;';
            document.body.appendChild(bait);

            await new Promise(resolve => setTimeout(resolve, 100));

            this.adBlockDetected = bait.offsetHeight === 0;
            bait.remove();

            if (this.adBlockDetected) {
                console.log('[Ads] Ad blocker detected');
            }
        } catch (e) {
            this.adBlockDetected = false;
        }
    }

    loadAdSenseScript() {
        // Check if script already exists
        if (document.querySelector('script[src*="adsbygoogle"]')) {
            return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.config.publisherId}`;
        script.crossOrigin = 'anonymous';

        script.onerror = () => {
            console.log('[Ads] Failed to load AdSense script');
            this.adBlockDetected = true;
        };

        document.head.appendChild(script);
    }

    initializeAdZones() {
        const adZones = document.querySelectorAll('.ad-zone');

        adZones.forEach(zone => {
            const slot = zone.dataset.adSlot;

            if (this.loadedAds.has(slot)) return;

            if (this.adBlockDetected || !this.config.enabled) {
                // Show attractive fallback instead of blank space
                this.showFallback(zone);
            } else {
                // In production, inject AdSense code here
                // For now, show placeholder
                this.showPlaceholder(zone);
            }

            this.loadedAds.add(slot);
        });
    }

    showPlaceholder(zone) {
        // Keep the CSS placeholder styling
        zone.classList.remove('loaded');
    }

    showFallback(zone) {
        // Show SAMD promotional content instead of blank space
        zone.innerHTML = `
            <div style="
                padding: 12px;
                text-align: center;
                background: linear-gradient(135deg, var(--primary-50), var(--secondary-50));
                border-radius: var(--radius-lg);
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
            ">
                <span style="font-size: 24px;">🏥</span>
                <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">
                    Join SAMD Today!
                </span>
                <a href="add-doctor.html" style="
                    font-size: 11px;
                    color: var(--primary-600);
                    text-decoration: none;
                    font-weight: 500;
                ">Register Your Practice →</a>
            </div>
        `;
        zone.classList.add('loaded');
    }

    // Insert inline ad between doctor cards
    createInlineAd() {
        const adZone = document.createElement('div');
        adZone.className = 'ad-zone ad-zone-inline';
        adZone.dataset.adSlot = 'inline-' + Date.now();

        if (this.adBlockDetected || !this.config.enabled) {
            this.showFallback(adZone);
        }

        return adZone;
    }

    // Refresh ads when content changes
    refreshAds() {
        if (window.adsbygoogle && !this.adBlockDetected) {
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.log('[Ads] Failed to refresh ads');
            }
        }
    }

    // Track ad impressions (for analytics)
    trackImpression(slot) {
        console.log(`[Ads] Impression tracked: ${slot}`);
        // In production, send to analytics
    }

    trackClick(slot) {
        console.log(`[Ads] Click tracked: ${slot}`);
        // In production, send to analytics
    }
}

/**
 * Subscription Tiers for Doctors
 */
const SUBSCRIPTION_TIERS = {
    basic: {
        name: 'Basic',
        price: 0,
        features: [
            'Standard listing',
            'Basic profile',
            'Contact display'
        ],
        badge: null,
        cardClass: ''
    },
    premium: {
        name: 'Premium',
        monthlyPrice: 999,
        yearlyPrice: 9999,
        features: [
            'Highlighted listing',
            'Priority in search',
            'Gold badge',
            'Enhanced profile',
            'Analytics dashboard'
        ],
        badge: 'tier-premium',
        cardClass: 'premium'
    },
    featured: {
        name: 'Featured',
        monthlyPrice: 2999,
        yearlyPrice: 29999,
        features: [
            'Homepage carousel',
            'Top of search results',
            'Featured badge',
            'Photo in listing',
            'Full page profile',
            'Priority support',
            'Social media promotion'
        ],
        badge: 'tier-featured',
        cardClass: 'featured'
    }
};

/**
 * Get subscription tier badge HTML
 */
function getSubscriptionBadge(tier) {
    if (!tier || tier === 'basic') return '';

    const tierData = SUBSCRIPTION_TIERS[tier];
    if (!tierData || !tierData.badge) return '';

    return `<span class="subscription-tier ${tierData.badge}">${tierData.name}</span>`;
}

/**
 * Get featured doctors for carousel
 */
function getFeaturedDoctors() {
    return SAMD_DATA.doctors.filter(doc =>
        doc.subscriptionTier === 'featured' || doc.featured === true
    );
}

// Initialize ads controller globally
let adsController;
document.addEventListener('DOMContentLoaded', () => {
    adsController = new AdsController();
});
