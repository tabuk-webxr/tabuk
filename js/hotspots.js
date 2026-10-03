/**
 * Hotspot & Navigation Portal Manager
 * Renders spatial interactive markers projected accurately onto the 360 sphere
 */

class HotspotManager {
    constructor(viewer, overlayContainerId, onHotspotClick) {
        this.viewer = viewer;
        this.container = document.getElementById(overlayContainerId);
        this.onHotspotClick = onHotspotClick;
        this.hotspots = [];
        this.elements = [];

        // Connect render callback from viewer
        this.viewer.onSceneRendered = () => this.updatePositions();
    }

    setHotspots(hotspotDataList) {
        // Clean up previous elements
        this.container.innerHTML = '';
        this.elements = [];
        this.hotspots = hotspotDataList || [];

        this.hotspots.forEach(data => {
            const el = this.createHotspotElement(data);
            this.container.appendChild(el);
            this.elements.push({ data, el });
        });

        this.updatePositions();
    }

    createHotspotElement(data) {
        const wrapper = document.createElement('div');
        wrapper.className = `hotspot-item ${data.type === 'portal' ? 'hotspot-portal' : 'hotspot-info'}`;
        wrapper.setAttribute('data-id', data.id);
        wrapper.setAttribute('data-icon', data.icon || '');
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('tabindex', '0');

        if (data.type === 'portal') {
            // Directional floor arrow chevron matching storyboard
            wrapper.innerHTML = `
                <div class="portal-indicator">
                    <div class="portal-arrow-prompt">Follow the arrow</div>
                    <div class="portal-chevron-svg">
                        <svg viewBox="0 0 100 60" width="64" height="40">
                            <polyline points="10,50 50,15 90,50" fill="none" stroke="#0072CE" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="25,55 50,30 75,55" fill="none" stroke="#00A859" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="portal-label">${data.label}</div>
                </div>
            `;
        } else {
            // Concentric pulsing circular marker matching storyboard
            const iconSvg = this.getIconSvg(data.icon || 'info');
            wrapper.innerHTML = `
                <div class="hotspot-pulse-ring"></div>
                <div class="hotspot-pulse-ring-outer"></div>
                <div class="hotspot-inner-circle">
                    ${iconSvg}
                </div>
                <div class="hotspot-tooltip">
                    <span class="tooltip-title">${data.label}</span>
                </div>
            `;
        }

        const handleTrigger = (e) => {
            e.stopPropagation();
            if (this.onHotspotClick) {
                this.onHotspotClick(data);
            }
        };

        wrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
        wrapper.addEventListener('click', handleTrigger);
        wrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                handleTrigger(e);
            }
        });

        return wrapper;
    }

    getIconSvg(type) {
        switch (type) {
            case 'play':
                return `<svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" style="margin-left: 2px;"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
            case 'info':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
            case 'eye':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
            case 'target':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2"/></svg>`;
            case 'diamond':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.16 3l8.84 8.84-8.84 8.84-8.84-8.84L12.16 3zm0 2.83L6.15 11.84l6.01 6.01 6.01-6.01-6.01-6.01z"/></svg>`;
            case 'factory':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22 22H2V10l7-3v4l7-3v4l6-3v14zM4 20h16V10.27l-4 2V8.27l-7 3V7.27L4 9.42V20z"/></svg>`;
            case 'globe':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
            case 'check':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
            case 'dropper':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3a3 3 0 0 0-4.24 0l-1.5 1.5 4.24 4.24 1.5-1.5A3 3 0 0 0 19 3zM12 5.8L3.2 14.6a1 1 0 0 0-.29.71V19a1 1 0 0 0 1 1h3.69a1 1 0 0 0 .71-.29L17.1 10.9 12 5.8z"/></svg>`;
            case 'award':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
            case 'users':
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`;
            default:
                return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>`;
        }
    }

    updatePositions() {
        this.elements.forEach(({ data, el }) => {
            const screen = this.viewer.projectToScreen(data.pitch, data.yaw);
            if (screen.visible) {
                el.style.display = 'block';
                el.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`;
            } else {
                el.style.display = 'none';
            }
        });
    }
}

window.HotspotManager = HotspotManager;
