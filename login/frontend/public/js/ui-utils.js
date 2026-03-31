/**
 * UI Utilities for BrainByte Quiz App
 * Handles:
 * - Global Toast Notifications
 * - Page Load Transitions
 * - Reveal Animations
 */

const UI = {
    /**
     * Show a toast message.
     * @param {string} message - The text to display.
     * @param {'success' | 'error' | 'info'} type - The type of toast.
     * @param {number} duration - Time in milliseconds before auto-hiding.
     */
    showToast: (message, type = 'info', duration = 3000) => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `
            <span>${icon}</span>
            <p>${message}</p>
        `;

        container.appendChild(toast);

        // Slide In
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto Close
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400); // Wait for transition
        }, duration);
    },

    /**
     * Initialize Page Transition / Loading Animation
     */
    initLoader: () => {
        const spinner = document.getElementById('global-spinner');
        if (spinner) {
            window.addEventListener('load', () => {
                spinner.classList.add('hidden');
                document.body.classList.add('loaded');
                UI.initScrollReveal();
            });
        } else {
          document.body.classList.add('loaded');
          UI.initScrollReveal();
        }
    },

    /**
     * Scroll Reveal for sections with class `.section-reveal`
     */
    initScrollReveal: () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Stop observing once visible
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        const sections = document.querySelectorAll('.section-reveal');
        sections.forEach(s => observer.observe(s));
    },

    /**
     * Handle button feedback and loading states
     * @param {string} btnId - The ID of the button.
     * @param {string} loadingText - Text to show during loading.
     */
    btnLoading: (btnId, loadingText = "Processing...") => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = `<span class="spinner-mini"></span> ${loadingText}`;
            btn.disabled = true;
            return () => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            };
        }
        return () => {};
    }
};

// Initialize globally if needed
document.addEventListener('DOMContentLoaded', () => {
    UI.initLoader();
});

// Export UI globally
window.UI = UI;
