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
        // Clean up previous DOM markers + 3D gum-stuck avatars
        this.container.innerHTML = '';
        this.elements = [];
        this.hotspots = hotspotDataList || [];

        if (this.viewer && typeof this.viewer.syncSceneAvatars === 'function') {
            this.viewer.syncSceneAvatars(this.hotspots);
        }

        this.hotspots.forEach(data => {
            // Avatars live as 3D planes on the sphere — no floating HTML billboard
            if (data.type === 'avatar') return;

            const el = this.createHotspotElement(data);
            this.container.appendChild(el);
            this.elements.push({ data, el });
        });

        this.updatePositions();
    }

    createHotspotElement(data) {
        const wrapper = document.createElement('div');
        const isAvatar = data.type === 'avatar';
        const isNametag = data.type === 'nametag';
        const typeClass = data.type === 'portal'
            ? 'hotspot-portal'
            : isAvatar
                ? 'hotspot-avatar'
                : isNametag
                    ? 'hotspot-nametag'
                    : 'hotspot-info';
        wrapper.className = `hotspot-item ${typeClass}${data.locked ? ' hotspot-locked' : ''}`;
        wrapper.setAttribute('data-id', data.id);
        wrapper.setAttribute('data-icon', data.icon || '');
        if (isAvatar || isNametag || data.interactive === false) {
            // Decorative 360 UI only — not clickable
            wrapper.setAttribute('aria-hidden', 'true');
            wrapper.removeAttribute('role');
            wrapper.tabIndex = -1;
            wrapper.style.pointerEvents = 'none';
        } else {
            wrapper.setAttribute('role', 'button');
            wrapper.setAttribute('tabindex', data.locked ? '-1' : '0');
            if (data.locked) {
                wrapper.setAttribute('aria-disabled', 'true');
                wrapper.title = 'Complete this step to continue';
            }
        }

        if (data.type === 'nametag') {
            const rot = typeof data.rot === 'number' ? data.rot : 0;
            wrapper.style.setProperty('--name-rot', `${rot}deg`);
            wrapper.innerHTML = `
                <div class="hotspot-nametag-pill">${data.label || ''}</div>
            `;
        } else if (data.type === 'portal') {
            // 3 stacked 3D chevrons — angle via arrowYaw (0 = straight)
            const yawRot = typeof data.arrowYaw === 'number' ? data.arrowYaw : 0;
            const promptGap = typeof data.promptOffsetY === 'number' ? data.promptOffsetY : 6;
            const arrowScale = typeof data.arrowScale === 'number' ? data.arrowScale : 1;
            wrapper.style.setProperty('--arrow-prompt-gap', `${promptGap}px`);
            wrapper.style.setProperty('--arrow-scale', String(arrowScale));
            // Solid closed chevron (reference shape) — fixed colors, no color picker
            const chevronSvg = (key) => `
                <div class="portal-chevron portal-chevron-${key}" aria-hidden="true">
                    <svg viewBox="0 0 120 72" width="96" height="58">
                        <path d="M8 60 L60 8 L112 60 L88 60 L60 32 L32 60 Z"
                              fill="#2F8FD6"
                              stroke="#7EC8F0"
                              stroke-width="3"
                              stroke-linejoin="round"/>
                    </svg>
                </div>`;

            wrapper.innerHTML = `
                <div class="portal-indicator" style="--arrow-yaw: ${yawRot}deg;">
                    <div class="portal-arrow-prompt">Follow the arrow</div>
                    <div class="portal-arrow-stage">
                        <div class="portal-arrow-3d">
                            <div class="portal-arrow-motion">
                                ${chevronSvg('a')}
                                ${chevronSvg('b')}
                                ${chevronSvg('c')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (data.icon === 'monitor' || data.icon === 'ipad') {
            // Glued 3D tablet — play on screen + name box above (offsets from courseData / DEV)
            const labelY = typeof data.labelOffsetY === 'number' ? data.labelOffsetY : -36;
            const labelX = typeof data.labelOffsetX === 'number' ? data.labelOffsetX : 0;
            const playY = typeof data.playOffsetY === 'number' ? data.playOffsetY : -48;
            wrapper.style.setProperty('--label-offset-y', `${labelY}px`);
            wrapper.style.setProperty('--label-offset-x', `${labelX}px`);
            wrapper.style.setProperty('--play-offset-y', `${playY}px`);
            wrapper.innerHTML = `
                <div class="hotspot-monitor-hit" aria-hidden="true">
                    <div class="hotspot-monitor-play">
                        <svg class="hotspot-play-icon" viewBox="0 0 24 24" width="14" height="14" fill="#ffffff" aria-hidden="true">
                            <path d="M8.5 5.8v12.4L19 12 8.5 5.8z"/>
                        </svg>
                    </div>
                </div>
                <div class="hotspot-tooltip">
                    <span class="tooltip-title">${data.label}</span>
                </div>
            `;
        } else {
            // Concentric pulsing circular marker — rings + icon share one center stack
            const iconSvg = this.getIconSvg(data.icon || 'info');
            wrapper.innerHTML = `
                <div class="hotspot-marker">
                    <div class="hotspot-pulse-ring" aria-hidden="true"></div>
                    <div class="hotspot-pulse-ring-outer" aria-hidden="true"></div>
                    <div class="hotspot-inner-circle">
                        ${iconSvg}
                    </div>
                </div>
                <div class="hotspot-tooltip">
                    <span class="tooltip-title">${data.label}</span>
                </div>
            `;
        }

        if (!isNametag && data.interactive !== false) {
            const handleTrigger = (e) => {
                e.stopPropagation();
                if (this.onHotspotClick) {
                    this.onHotspotClick(data);
                }
            };

            wrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
            wrapper.addEventListener('click', handleTrigger);
            wrapper.addEventListener('keydown', (e) => {
                // Space is reserved for DEV panel toggle — use Enter to activate
                if (e.key === 'Enter') {
                    handleTrigger(e);
                }
            });
        }

        return wrapper;
    }

    getIconSvg(type) {
        switch (type) {
            case 'play':
                return `<svg class="hotspot-play-icon" viewBox="0 0 24 24" width="20" height="20" fill="#ffffff" aria-hidden="true"><path d="M8.5 5.8v12.4L19 12 8.5 5.8z"/></svg>`;
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
            if (!data.hidden && screen.visible) {
                el.style.display = 'block';
                if (data.type === 'nametag') {
                    const rot = typeof data.rot === 'number' ? data.rot : 0;
                    el.style.transform =
                        `translate3d(${screen.x}px, ${screen.y}px, 0) translate(-50%, -50%) rotate(${rot}deg)`;
                } else {
                    el.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`;
                }
            } else {
                el.style.display = 'none';
            }
        });
    }

    setNametagRot(id, rot) {
        const hotspot = this.getHotspotById(id);
        const entry = this.elements.find((e) => e.data.id === id);
        if (!hotspot || hotspot.type !== 'nametag') return false;
        hotspot.rot = rot;
        if (entry) {
            entry.data.rot = rot;
            entry.el.style.setProperty('--name-rot', `${rot}deg`);
        }
        this.updatePositions();
        return true;
    }

    setPromptOffsetY(id, promptOffsetY) {
        const hotspot = this.getHotspotById(id);
        const entry = this.elements.find((e) => e.data.id === id);
        if (!hotspot || hotspot.type !== 'portal') return false;
        if (typeof promptOffsetY !== 'number') return false;
        hotspot.promptOffsetY = promptOffsetY;
        if (entry) {
            entry.data.promptOffsetY = promptOffsetY;
            entry.el.style.setProperty('--arrow-prompt-gap', `${promptOffsetY}px`);
        }
        return true;
    }

    setArrowScale(id, arrowScale) {
        const hotspot = this.getHotspotById(id);
        const entry = this.elements.find((e) => e.data.id === id);
        if (!hotspot || hotspot.type !== 'portal') return false;
        if (typeof arrowScale !== 'number') return false;
        const scale = Math.max(0.25, Math.min(1.5, arrowScale));
        hotspot.arrowScale = scale;
        if (entry) {
            entry.data.arrowScale = scale;
            entry.el.style.setProperty('--arrow-scale', String(scale));
        }
        return true;
    }

    setLabelOffset(id, { labelOffsetY, labelOffsetX, playOffsetY } = {}) {
        const hotspot = this.getHotspotById(id);
        const entry = this.elements.find((e) => e.data.id === id);
        if (!hotspot) return false;
        if (typeof labelOffsetY === 'number') hotspot.labelOffsetY = labelOffsetY;
        if (typeof labelOffsetX === 'number') hotspot.labelOffsetX = labelOffsetX;
        if (typeof playOffsetY === 'number') hotspot.playOffsetY = playOffsetY;
        if (entry) {
            if (typeof labelOffsetY === 'number') {
                entry.data.labelOffsetY = labelOffsetY;
                entry.el.style.setProperty('--label-offset-y', `${labelOffsetY}px`);
            }
            if (typeof labelOffsetX === 'number') {
                entry.data.labelOffsetX = labelOffsetX;
                entry.el.style.setProperty('--label-offset-x', `${labelOffsetX}px`);
            }
            if (typeof playOffsetY === 'number') {
                entry.data.playOffsetY = playOffsetY;
                entry.el.style.setProperty('--play-offset-y', `${playOffsetY}px`);
            }
        }
        return true;
    }

    setHotspotHidden(id, hidden) {
        const hotspot = this.getHotspotById(id);
        const entry = this.elements.find((e) => e.data.id === id);
        if (hotspot) hotspot.hidden = !!hidden;
        if (entry) {
            entry.data.hidden = !!hidden;
            if (hidden) {
                entry.el.style.display = 'none';
                entry.el.setAttribute('aria-hidden', 'true');
            } else {
                entry.el.removeAttribute('aria-hidden');
            }
        }
        if (hotspot && this.viewer && (hotspot.type === 'avatar' || hotspot.glue)) {
            if (!hidden && !this.viewer.getSceneAvatarSettings(id)) {
                // CHRO unlock etc. — mesh was skipped while hidden; create now
                this.viewer.addSceneAvatar(hotspot);
            } else {
                this.viewer.setSceneAvatarHidden(id, !!hidden);
            }
        }
        this.updatePositions();
        return !!(hotspot || entry);
    }

    getHotspotById(id) {
        return this.hotspots.find((h) => h.id === id) || null;
    }

    setHotspotCoords(id, pitch, yaw) {
        const hotspot = this.getHotspotById(id);
        if (!hotspot) return false;
        hotspot.pitch = pitch;
        hotspot.yaw = yaw;
        if ((hotspot.type === 'avatar' || hotspot.glue) && this.viewer) {
            // Ensure 3D image exists (e.g. after scene load) then move it
            if (!this.viewer.getSceneAvatarSettings(id)) {
                this.viewer.addSceneAvatar(hotspot);
            } else {
                this.viewer.setSceneAvatarCoords(id, pitch, yaw);
            }
        }
        this.updatePositions();
        return true;
    }

    exportHotspotCoords() {
        return this.hotspots.map((h) => {
            const row = {
                id: h.id,
                label: h.label || h.id,
                pitch: Math.round(h.pitch),
                yaw: Math.round(h.yaw)
            };
            if (h.type === 'nametag') {
                row.rot = Math.round(h.rot || 0);
            }
            return row;
        });
    }
}

window.HotspotManager = HotspotManager;
