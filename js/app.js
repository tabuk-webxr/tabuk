/**
 * Tabuk WebXR Induction Application Coordinator
 * Connects Viewer, Hotspots, Modals, Assessment, and SCORM 1.2
 */

class WebXRApp {
    constructor() {
        this.currentSceneId = null;
        this.viewer = null;
        this.hotspots = null;
        this.assessment = null;
        this.visitedScenes = new Set();
        this.visitedHotspots = new Set();
        this.isAudioMuted = false;
        this.devPanelOpen = false;
        this.receptionChroUnlocked = false;
        this.welcomePortalUnlocked = false;
        this._receptionTipTimer = null;
        this._chroIntroAudio = null;
        this._ceoIntroAudio = null;
        this._welcomeEnterAudio = null;
        this._tipAvatarRaf = null;
        this._tipAvatarKeying = false;
        this._sceneTransitioning = false;
        
        // Sound effects synthesis via Web Audio API (zero external asset dependency)
        this.audioCtx = null;
    }

    init() {
        console.log("%c[Tabuk WebXR Induction] Initializing...", "color:#0072CE; font-weight:bold; font-size:14px;");

        // 1. Initialize SCORM
        if (window.scorm) {
            window.scorm.init();
        }

        // 2. Initialize 360 Viewer
        this.viewer = new window.PanoramaViewer('vr-viewport');

        // 3. Initialize Hotspot Manager
        this.hotspots = new window.HotspotManager(
            this.viewer,
            'hotspots-layer',
            (hotspotData) => this.handleHotspotClick(hotspotData)
        );

        // 4. Initialize Assessment Engine
        this.assessment = new window.AssessmentEngine('assessment-overlay-content', (score) => {
            console.log("Assessment completed with score:", score);
        });
        window.assessmentEngine = this.assessment;

        // CEO welcome finished + closed → CHRO intro tip, then swap hotspots
        if (window.modalManager) {
            window.modalManager.onWelcomeVideoClosed = (profile, ended) => {
                this.handleWelcomeVideoClosed(profile, ended);
            };
        }

        // 5. Bind UI Controls
        this.bindUI();

        // 6. Preload all video/audio, then open first scene
        this.assets = new window.AssetLoader();
        this.bindAssetLoadingUI();
        this.runAssetPreload();
    }

    bindAssetLoadingUI() {
        const retryBtn = document.getElementById('asset-loading-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.runAssetPreload({ onlyFailed: true });
            });
        }
    }

    updateAssetLoadingUI(progress, { statusText = null, error = null } = {}) {
        const fill = document.getElementById('asset-loading-bar-fill');
        const percentEl = document.getElementById('asset-loading-percent');
        const statusEl = document.getElementById('asset-loading-status');
        const errorBox = document.getElementById('asset-loading-error');
        const errorText = document.getElementById('asset-loading-error-text');
        const screen = document.getElementById('asset-loading-screen');

        const pct = Math.max(0, Math.min(100, progress.percent || 0));
        if (fill) fill.style.width = `${pct}%`;
        if (percentEl) percentEl.textContent = `${pct}%`;
        if (statusEl) {
            statusEl.textContent = statusText
                || `Loading media ${progress.completed || 0} of ${progress.total || 0}`;
        }

        if (error) {
            if (errorBox) errorBox.hidden = false;
            if (errorText) errorText.textContent = error;
            if (screen) screen.setAttribute('aria-busy', 'false');
        } else {
            if (errorBox) errorBox.hidden = true;
            if (screen) screen.setAttribute('aria-busy', 'true');
        }
    }

    hideAssetLoadingScreen() {
        const screen = document.getElementById('asset-loading-screen');
        if (!screen) return;
        screen.classList.add('is-done');
        screen.setAttribute('aria-busy', 'false');
        screen.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            if (screen.parentNode) screen.hidden = true;
        }, 500);
    }

    async runAssetPreload({ onlyFailed = false } = {}) {
        if (!this.assets) return;

        const screen = document.getElementById('asset-loading-screen');
        if (screen) {
            screen.hidden = false;
            screen.classList.remove('is-done');
            screen.setAttribute('aria-hidden', 'false');
        }

        this.updateAssetLoadingUI(this.assets.getProgress(), {
            statusText: onlyFailed ? 'Retrying failed assets…' : 'Loading media assets…'
        });

        this.assets.onProgress((progress) => {
            this.updateAssetLoadingUI(progress);
        });

        const result = await this.assets.preload({ onlyFailed });

        if (!result.ok) {
            const failed = result.failed || [];
            const names = failed.map((f) => f.url.split('/').pop()).join(', ');
            this.updateAssetLoadingUI(result.progress, {
                statusText: 'Waiting for retry',
                error: `Could not load: ${names || 'some media files'}. Check your connection and tap Retry.`
            });
            return;
        }

        this.updateAssetLoadingUI({ ...result.progress, percent: 100 }, {
            statusText: 'Ready'
        });
        this.hideAssetLoadingScreen();

        // First screen only after everything is ready
        if (!this.currentSceneId) {
            this.goToScene('approach');
        }
    }

    resolveMediaUrl(url) {
        if (this.assets) return this.assets.getUrl(url);
        return url;
    }

    playTone(freq = 440, type = 'sine', duration = 0.15) {
        if (this.isAudioMuted) return;
        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (e) {
            // Audio context restricted until first user interaction
        }
    }

    bindUI() {
        // 3-dots Quick Menu Toggle
        const menuBtn = document.getElementById('menu-toggle-btn');
        const drawer = document.getElementById('quick-menu-drawer');
        const drawerClose = document.getElementById('menu-drawer-close');

        if (menuBtn && drawer) {
            menuBtn.addEventListener('click', () => {
                this.playTone(520, 'sine', 0.1);
                drawer.classList.toggle('active');
            });
            if (drawerClose) {
                drawerClose.addEventListener('click', () => drawer.classList.remove('active'));
            }
        }

        // Gyroscope toggle
        const gyroBtn = document.getElementById('btn-toggle-gyro');
        if (gyroBtn) {
            gyroBtn.addEventListener('click', () => {
                const active = this.viewer.toggleGyroscope();
                gyroBtn.classList.toggle('active', active);
                this.playTone(600, 'sine', 0.1);
            });
        }

        // Fullscreen toggle
        const fsBtn = document.getElementById('btn-toggle-fullscreen');
        if (fsBtn) {
            fsBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });
        }

        // Audio toggle
        const audioBtn = document.getElementById('btn-toggle-audio');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                this.isAudioMuted = !this.isAudioMuted;
                audioBtn.classList.toggle('muted', this.isAudioMuted);
                audioBtn.innerHTML = this.isAudioMuted ? '🔇 Audio Off' : '🔊 Audio On';
            });
        }

        // SCORM Diagnostic drawer toggle
        const scormLogBtn = document.getElementById('btn-toggle-scorm-logs');
        const scormPanel = document.getElementById('scorm-diagnostics-panel');
        if (scormLogBtn && scormPanel) {
            scormLogBtn.addEventListener('click', () => {
                scormPanel.classList.toggle('active');
            });
        }
        const scormClose = document.getElementById('scorm-panel-close');
        if (scormClose && scormPanel) {
            scormClose.addEventListener('click', () => scormPanel.classList.remove('active'));
        }

        // DEV ONLY — 360 orientation sliders
        this.bindDevOrientationPanel();

        // WebXR VR Session button
        const xrBtn = document.getElementById('btn-enter-xr');
        if (xrBtn) {
            if (navigator.xr) {
                navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                    if (supported) {
                        xrBtn.style.display = 'inline-flex';
                        xrBtn.addEventListener('click', () => this.enterVR());
                    }
                });
            }
        }
    }

    bindDevOrientationPanel() {
        this.devPanelOpen = false;
        this.tipPlacement = {
            left: 20,
            bottom: 29,
            width: 348,
            height: 440,
            tipWidth: 392,
            gap: -1
        };
        const panel = document.getElementById('dev-orientation-panel');
        const sphereYaw = document.getElementById('dev-sphere-yaw');
        const camPitch = document.getElementById('dev-cam-pitch');
        const camYaw = document.getElementById('dev-cam-yaw');
        const hotSelect = document.getElementById('dev-hotspot-select');
        const hotPitch = document.getElementById('dev-hot-pitch');
        const hotYaw = document.getElementById('dev-hot-yaw');
        const placeBtn = document.getElementById('dev-place-at-view');
        const copyBtn = document.getElementById('dev-copy-orientation');
        const tipLeft = document.getElementById('dev-tip-left');
        const tipBottom = document.getElementById('dev-tip-bottom');
        const tipWidth = document.getElementById('dev-tip-width');
        const tipHeight = document.getElementById('dev-tip-height');
        const tipBoxWidth = document.getElementById('dev-tip-box-width');
        const tipGap = document.getElementById('dev-tip-gap');
        const tipShowBtn = document.getElementById('dev-tip-show');
        const tipResetBtn = document.getElementById('dev-tip-reset');
        const avatarHeight = document.getElementById('dev-avatar-height');
        const avatarWidth = document.getElementById('dev-avatar-width');
        const avatarRadius = document.getElementById('dev-avatar-radius');
        if (!panel || !sphereYaw || !camPitch || !camYaw) return;

        const applyOrientation = () => {
            this.viewer.setSphereRotationY(Number(sphereYaw.value));
            this.viewer.setLookAt(Number(camPitch.value), Number(camYaw.value));
            this.updateDevOrientationReadout();
        };

        const applyHotspot = () => {
            if (!hotSelect || !hotSelect.value) return;
            const pitch = Number(hotPitch.value);
            let yaw = Number(hotYaw.value);
            yaw = ((yaw % 360) + 360) % 360;
            this.hotspots.setHotspotCoords(hotSelect.value, pitch, yaw);
            this.persistHotspotCoords(hotSelect.value, pitch, yaw);
            document.getElementById('dev-hot-pitch-val').textContent = `${Math.round(pitch)}°`;
            document.getElementById('dev-hot-yaw-val').textContent = `${Math.round(yaw)}°`;
            this.updateDevOrientationReadout();
        };

        const applySceneAvatarImage = () => {
            const id = this.getSelectedAvatarHotspotId();
            if (!id || !avatarHeight || !avatarWidth || !avatarRadius) return;
            const worldHeight = Number(avatarHeight.value);
            const worldWidth = Number(avatarWidth.value);
            const radius = Number(avatarRadius.value);
            this.viewer.setSceneAvatarSize(id, { worldHeight, worldWidth, radius });
            this.persistAvatarImageSettings(id, { worldHeight, worldWidth, radius });
            const hVal = document.getElementById('dev-avatar-height-val');
            const wVal = document.getElementById('dev-avatar-width-val');
            const rVal = document.getElementById('dev-avatar-radius-val');
            if (hVal) hVal.textContent = String(Math.round(worldHeight));
            if (wVal) wVal.textContent = String(Math.round(worldWidth));
            if (rVal) rVal.textContent = String(Math.round(radius));
            this.updateDevOrientationReadout();
        };

        const applyTipPlacement = () => {
            if (!tipLeft || !tipBottom || !tipWidth || !tipHeight || !tipBoxWidth || !tipGap) return;
            this.tipPlacement = {
                left: Number(tipLeft.value),
                bottom: Number(tipBottom.value),
                width: Number(tipWidth.value),
                height: Number(tipHeight.value),
                tipWidth: Number(tipBoxWidth.value),
                gap: Number(tipGap.value)
            };
            this.applyTipPlacementStyles();
            this.updateDevOrientationReadout();
        };

        sphereYaw.addEventListener('input', applyOrientation);
        camPitch.addEventListener('input', applyOrientation);
        camYaw.addEventListener('input', applyOrientation);
        if (hotPitch) hotPitch.addEventListener('input', applyHotspot);
        if (hotYaw) hotYaw.addEventListener('input', applyHotspot);
        if (avatarHeight) avatarHeight.addEventListener('input', applySceneAvatarImage);
        if (avatarWidth) avatarWidth.addEventListener('input', applySceneAvatarImage);
        if (avatarRadius) avatarRadius.addEventListener('input', applySceneAvatarImage);
        if (tipLeft) tipLeft.addEventListener('input', applyTipPlacement);
        if (tipBottom) tipBottom.addEventListener('input', applyTipPlacement);
        if (tipWidth) tipWidth.addEventListener('input', applyTipPlacement);
        if (tipHeight) tipHeight.addEventListener('input', applyTipPlacement);
        if (tipBoxWidth) tipBoxWidth.addEventListener('input', applyTipPlacement);
        if (tipGap) tipGap.addEventListener('input', applyTipPlacement);

        if (hotSelect) {
            hotSelect.addEventListener('change', () => {
                this.loadSelectedHotspotIntoDevSliders();
                this.loadAvatarImageSettingsIntoDevSliders();
            });
        }

        if (placeBtn) {
            placeBtn.addEventListener('click', () => {
                if (!hotSelect || !hotSelect.value) return;
                const pitch = Math.round(this.viewer.targetPitch);
                let yaw = Math.round(this.viewer.targetYaw);
                yaw = ((yaw % 360) + 360) % 360;
                hotPitch.value = String(pitch);
                hotYaw.value = String(yaw);
                this.hotspots.setHotspotCoords(hotSelect.value, pitch, yaw);
                this.persistHotspotCoords(hotSelect.value, pitch, yaw);
                this.loadSelectedHotspotIntoDevSliders();
                this.updateDevOrientationReadout();
            });
        }

        if (tipShowBtn) {
            tipShowBtn.addEventListener('click', () => {
                this.showReceptionTip(
                    'Welcome to Tabuk Pharmaceuticals!<br><em>Your journey starts here.</em>',
                    { animate: false, showAvatar: true }
                );
                this.applyTipPlacementStyles();
            });
        }

        if (tipResetBtn) {
            tipResetBtn.addEventListener('click', () => {
                this.tipPlacement = {
                    left: 20,
                    bottom: 29,
                    width: 348,
                    height: 440,
                    tipWidth: 392,
                    gap: -1
                };
                this.syncDevTipPlacementSliders();
                this.applyTipPlacementStyles();
                this.updateDevOrientationReadout();
            });
        }

        // Space toggles DEV panel on every scene
        window.addEventListener('keydown', (e) => {
            if (e.code !== 'Space' && e.key !== ' ') return;
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable)) {
                return;
            }
            e.preventDefault();
            this.toggleDevOrientationPanel();
        });

        this.viewer.onSceneRendered = () => {
            if (this.devPanelOpen) {
                this.syncDevOrientationPanel(true);
            }
            if (this.hotspots) this.hotspots.updatePositions();
        };

        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const values = document.getElementById('dev-orientation-values');
                const text = values ? values.textContent : '';
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => { copyBtn.textContent = 'Copy values'; }, 1200);
                } catch (err) {
                    prompt('Copy these values:', text);
                }
            });
        }

        this.syncDevTipPlacementSliders();
        this.applyTipPlacementStyles();
    }

    syncDevTipPlacementSliders() {
        const p = this.tipPlacement || {
            left: 20, bottom: 29, width: 348, height: 440, tipWidth: 392, gap: -1
        };
        const tipLeft = document.getElementById('dev-tip-left');
        const tipBottom = document.getElementById('dev-tip-bottom');
        const tipWidth = document.getElementById('dev-tip-width');
        const tipHeight = document.getElementById('dev-tip-height');
        const tipBoxWidth = document.getElementById('dev-tip-box-width');
        const tipGap = document.getElementById('dev-tip-gap');
        if (tipLeft) tipLeft.value = String(p.left);
        if (tipBottom) tipBottom.value = String(p.bottom);
        if (tipWidth) tipWidth.value = String(p.width);
        if (tipHeight) tipHeight.value = String(p.height);
        if (tipBoxWidth) tipBoxWidth.value = String(p.tipWidth);
        if (tipGap) tipGap.value = String(p.gap);
        const leftVal = document.getElementById('dev-tip-left-val');
        const bottomVal = document.getElementById('dev-tip-bottom-val');
        const widthVal = document.getElementById('dev-tip-width-val');
        const heightVal = document.getElementById('dev-tip-height-val');
        const boxVal = document.getElementById('dev-tip-box-width-val');
        const gapVal = document.getElementById('dev-tip-gap-val');
        if (leftVal) leftVal.textContent = `${p.left}px`;
        if (bottomVal) bottomVal.textContent = `${p.bottom}px`;
        if (widthVal) widthVal.textContent = `${p.width}px`;
        if (heightVal) heightVal.textContent = `${p.height}px`;
        if (boxVal) boxVal.textContent = `${p.tipWidth}px`;
        if (gapVal) gapVal.textContent = `${p.gap}px`;
    }

    applyTipPlacementStyles() {
        const p = this.tipPlacement;
        if (!p) return;
        const stack = document.getElementById('reception-welcome-stack');
        const avatar = document.getElementById('reception-tip-avatar');
        const tip = document.getElementById('reception-welcome-tip');
        const gap = typeof p.gap === 'number' ? p.gap : 10;
        if (stack) {
            stack.style.left = `${p.left}px`;
            stack.style.bottom = `${p.bottom}px`;
            stack.style.maxWidth = `${Math.max(p.width, p.tipWidth) + 24}px`;
            // Positive = space; negative = tip overlaps up toward avatar
            stack.style.gap = `${Math.max(0, gap)}px`;
        }
        if (avatar) {
            avatar.style.width = `${p.width}px`;
            avatar.style.height = `${p.height}px`;
        }
        if (tip) {
            tip.style.width = `${p.tipWidth}px`;
            tip.style.marginTop = gap < 0 ? `${gap}px` : '0px';
        }
        const leftVal = document.getElementById('dev-tip-left-val');
        const bottomVal = document.getElementById('dev-tip-bottom-val');
        const widthVal = document.getElementById('dev-tip-width-val');
        const heightVal = document.getElementById('dev-tip-height-val');
        const boxVal = document.getElementById('dev-tip-box-width-val');
        const gapVal = document.getElementById('dev-tip-gap-val');
        if (leftVal) leftVal.textContent = `${p.left}px`;
        if (bottomVal) bottomVal.textContent = `${p.bottom}px`;
        if (widthVal) widthVal.textContent = `${p.width}px`;
        if (heightVal) heightVal.textContent = `${p.height}px`;
        if (boxVal) boxVal.textContent = `${p.tipWidth}px`;
        if (gapVal) gapVal.textContent = `${gap}px`;
    }

    toggleDevOrientationPanel(forceState) {
        const panel = document.getElementById('dev-orientation-panel');
        if (!panel) return;
        this.devPanelOpen = typeof forceState === 'boolean' ? forceState : !this.devPanelOpen;
        panel.style.display = this.devPanelOpen ? 'block' : 'none';
        if (this.devPanelOpen) {
            this.refreshDevHotspotList();
            this.syncDevOrientationPanel();
            this.syncDevTipPlacementSliders();
            this.applyTipPlacementStyles();
        }
    }

    persistHotspotCoords(id, pitch, yaw) {
        const scene = window.COURSE_DATA.scenes[this.currentSceneId];
        if (!scene || !scene.hotspots) return;
        const source = scene.hotspots.find((h) => h.id === id);
        if (source) {
            source.pitch = pitch;
            source.yaw = yaw;
        }
    }

    persistAvatarImageSettings(id, { worldHeight, worldWidth, radius }) {
        const scene = window.COURSE_DATA.scenes[this.currentSceneId];
        if (!scene || !scene.hotspots) return;
        const source = scene.hotspots.find((h) => h.id === id);
        const live = this.hotspots ? this.hotspots.getHotspotById(id) : null;
        [source, live].forEach((h) => {
            if (!h) return;
            if (typeof worldHeight === 'number') h.worldHeight = worldHeight;
            if (typeof worldWidth === 'number') h.worldWidth = worldWidth;
            if (typeof radius === 'number') h.radius = radius;
        });
    }

    getSelectedAvatarHotspotId() {
        const hotSelect = document.getElementById('dev-hotspot-select');
        if (!hotSelect || !hotSelect.value || !this.hotspots) return null;
        const h = this.hotspots.getHotspotById(hotSelect.value);
        if (h && h.type === 'avatar') return h.id;
        // Fallback: first avatar in scene
        const avatar = (this.hotspots.hotspots || []).find((x) => x.type === 'avatar');
        return avatar ? avatar.id : null;
    }

    refreshDevHotspotList() {
        const hotSelect = document.getElementById('dev-hotspot-select');
        if (!hotSelect || !this.hotspots) return;
        const list = this.hotspots.hotspots || [];
        const prev = hotSelect.value;
        hotSelect.innerHTML = '';

        if (!list.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '(no hotspots in this scene)';
            hotSelect.appendChild(opt);
            hotSelect.disabled = true;
            return;
        }

        hotSelect.disabled = false;
        list.forEach((h) => {
            const opt = document.createElement('option');
            opt.value = h.id;
            const kind = h.type === 'avatar' ? 'image' : (h.type || 'hotspot');
            opt.textContent = `${h.label || h.id} [${kind}]`;
            hotSelect.appendChild(opt);
        });
        if (prev && list.some((h) => h.id === prev)) {
            hotSelect.value = prev;
        } else {
            const avatar = list.find((h) => h.type === 'avatar');
            if (avatar) hotSelect.value = avatar.id;
        }
        this.loadSelectedHotspotIntoDevSliders();
        this.loadAvatarImageSettingsIntoDevSliders();
    }

    loadSelectedHotspotIntoDevSliders() {
        const hotSelect = document.getElementById('dev-hotspot-select');
        const hotPitch = document.getElementById('dev-hot-pitch');
        const hotYaw = document.getElementById('dev-hot-yaw');
        if (!hotSelect || !hotSelect.value || !hotPitch || !hotYaw) return;
        const h = this.hotspots.getHotspotById(hotSelect.value);
        if (!h) return;
        const yaw = ((Math.round(h.yaw) % 360) + 360) % 360;
        hotPitch.value = String(Math.round(h.pitch));
        hotYaw.value = String(yaw);
        document.getElementById('dev-hot-pitch-val').textContent = `${Math.round(h.pitch)}°`;
        document.getElementById('dev-hot-yaw-val').textContent = `${yaw}°`;
    }

    loadAvatarImageSettingsIntoDevSliders() {
        const id = this.getSelectedAvatarHotspotId();
        const heightEl = document.getElementById('dev-avatar-height');
        const widthEl = document.getElementById('dev-avatar-width');
        const radiusEl = document.getElementById('dev-avatar-radius');
        if (!heightEl || !widthEl || !radiusEl) return;

        const h = id && this.hotspots ? this.hotspots.getHotspotById(id) : null;
        const live = id && this.viewer ? this.viewer.getSceneAvatarSettings(id) : null;
        const worldHeight = (live && live.worldHeight) || (h && h.worldHeight) || 150;
        const worldWidth = (live && live.worldWidth) || (h && h.worldWidth) || Math.round(worldHeight * 0.35);
        const radius = (live && live.radius) || (h && h.radius) || 430;

        heightEl.value = String(Math.round(worldHeight));
        widthEl.value = String(Math.round(worldWidth));
        radiusEl.value = String(Math.round(radius));
        const hVal = document.getElementById('dev-avatar-height-val');
        const wVal = document.getElementById('dev-avatar-width-val');
        const rVal = document.getElementById('dev-avatar-radius-val');
        if (hVal) hVal.textContent = String(Math.round(worldHeight));
        if (wVal) wVal.textContent = String(Math.round(worldWidth));
        if (rVal) rVal.textContent = String(Math.round(radius));
    }

    syncDevOrientationPanel(fromCameraOnly = false) {
        const sphereYaw = document.getElementById('dev-sphere-yaw');
        const camPitch = document.getElementById('dev-cam-pitch');
        const camYaw = document.getElementById('dev-cam-yaw');
        if (!sphereYaw || !this.viewer || !this.devPanelOpen) return;

        if (!fromCameraOnly) {
            sphereYaw.value = String(Math.round(this.viewer.sphereRotationY || 0));
        }
        if (document.activeElement !== camPitch) {
            camPitch.value = String(Math.round(this.viewer.targetPitch));
        }
        if (document.activeElement !== camYaw) {
            camYaw.value = String(Math.round(this.viewer.targetYaw));
        }
        this.updateDevOrientationReadout();
    }

    updateDevOrientationReadout() {
        const o = this.viewer.getOrientation();
        const sceneId = this.currentSceneId || '—';
        const sphereVal = document.getElementById('dev-sphere-yaw-val');
        const pitchVal = document.getElementById('dev-cam-pitch-val');
        const yawVal = document.getElementById('dev-cam-yaw-val');
        const sceneLabel = document.getElementById('dev-scene-id');
        const pre = document.getElementById('dev-orientation-values');
        const hotspots = this.hotspots ? this.hotspots.exportHotspotCoords() : [];

        if (sceneLabel) sceneLabel.textContent = `scene: ${sceneId}`;
        if (sphereVal) sphereVal.textContent = `${o.sphereYaw}°`;
        if (pitchVal) pitchVal.textContent = `${o.initialPitch}°`;
        if (yawVal) yawVal.textContent = `${o.initialYaw}°`;
        if (pre) {
            const hotLines = hotspots.length
                ? hotspots.map((h) => {
                    const live = this.hotspots.getHotspotById(h.id);
                    if (live && live.type === 'avatar') {
                        const s = this.viewer.getSceneAvatarSettings(h.id) || {};
                        return (
                            `  - ${h.id}: pitch ${h.pitch}, yaw ${h.yaw}` +
                            `, worldHeight ${Math.round(s.worldHeight || live.worldHeight || 150)}` +
                            `, worldWidth ${Math.round(s.worldWidth || live.worldWidth || 52)}` +
                            `, radius ${Math.round(s.radius || live.radius || 430)}`
                        );
                    }
                    return `  - ${h.id}: pitch ${h.pitch}, yaw ${h.yaw}`;
                }).join('\n')
                : '  (none)';
            const tip = this.tipPlacement || {
                left: 20, bottom: 29, width: 348, height: 440, tipWidth: 392, gap: -1
            };
            const gapCss = tip.gap < 0
                ? `gap: 0; /* tip margin-top: ${tip.gap}px */`
                : `gap: ${tip.gap}px;`;
            pre.textContent =
                `scene: ${sceneId}\n` +
                `sphereYaw: ${o.sphereYaw}\n` +
                `initialPitch: ${o.initialPitch}\n` +
                `initialYaw: ${o.initialYaw}\n` +
                `hotspots:\n${hotLines}\n` +
                `tipAvatar:\n` +
                `  left: ${tip.left}px\n` +
                `  bottom: ${tip.bottom}px\n` +
                `  width: ${tip.width}px\n` +
                `  height: ${tip.height}px\n` +
                `  tipWidth: ${tip.tipWidth}px\n` +
                `  gap: ${tip.gap}px\n` +
                `/* CSS snippet */\n` +
                `.reception-welcome-stack { left: ${tip.left}px; bottom: ${tip.bottom}px; ${gapCss} }\n` +
                `.reception-tip-avatar { width: ${tip.width}px; height: ${tip.height}px; }\n` +
                `.reception-welcome-tip { width: ${tip.tipWidth}px;${tip.gap < 0 ? ` margin-top: ${tip.gap}px;` : ''} }`;
        }
    }

    enterVR() {
        if (!navigator.xr) return;
        navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor']
        }).then((session) => {
            this.viewer.renderer.xr.setSession(session);
        }).catch((err) => {
            alert("Could not start WebXR VR session: " + err.message);
        });
    }

    _buildHotspotList(scene) {
        let hotspotList = scene.hotspots || [];
        if (scene.id === 'welcome') {
            hotspotList = hotspotList.map((h) => {
                if (h.id === 'enter_reception') {
                    return { ...h, hidden: !this.welcomePortalUnlocked };
                }
                return { ...h };
            });
        }
        if (scene.id === 'reception') {
            hotspotList = hotspotList.map((h) => {
                if (h.id === 'video_chro_welcome') {
                    return { ...h, hidden: !this.receptionChroUnlocked };
                }
                // Show next arrow as a cue, but block navigation for now
                if (h.id === 'enter_hq') {
                    return { ...h, hidden: false, locked: true };
                }
                return { ...h };
            });
        }
        return hotspotList;
    }

    /**
     * ENTER TABUK — close welcome popup, reveal portal hotspot to reception.
     */
    dismissWelcomeIntro() {
        if (this.currentSceneId !== 'welcome') return;

        const welcomeOverlay = document.getElementById('welcome-modal-overlay');
        if (welcomeOverlay) welcomeOverlay.classList.remove('active');
        this.stopWelcomeEnterAudio();
        this.playTone(520, 'sine', 0.12);

        this.welcomePortalUnlocked = true;
        if (this.hotspots) {
            this.hotspots.setHotspotHidden('enter_reception', false);
            if (this.devPanelOpen) this.refreshDevHotspotList();
        }
    }

    _sceneOrientation(scene) {
        return {
            pitch: typeof scene.initialPitch === 'number' ? scene.initialPitch : 0,
            yaw: typeof scene.initialYaw === 'number' ? scene.initialYaw : 0,
            sphereYaw: typeof scene.sphereYaw === 'number' ? scene.sphereYaw : 0
        };
    }

    _applySceneMediaReady(scene) {
        const { pitch, yaw, sphereYaw } = this._sceneOrientation(scene);
        this.viewer.setSphereRotationY(sphereYaw);
        this.viewer.setLookAt(pitch, yaw);
        // 360 videos start at min zoom (widest view); stills use scene FOV or default
        if (scene.bgVideo) {
            this.viewer.setMinZoom();
        } else if (typeof scene.initialFov === 'number') {
            this.viewer.setFov(scene.initialFov, true);
        } else {
            this.viewer.setFov(75, true);
        }
        this.syncDevOrientationPanel();
    }

    _finishSceneUI(scene) {
        this.hotspots.setHotspots(this._buildHotspotList(scene));
        this.updateHUD(scene);
        this.syncDevOrientationPanel();
    }

    goToScene(sceneId, options = {}) {
        const scene = window.COURSE_DATA.scenes[sceneId];
        if (!scene) {
            console.error("Unknown scene ID:", sceneId);
            return;
        }

        if (this._sceneTransitioning || (this.viewer && this.viewer.isTransitioning())) {
            return;
        }

        this.playTone(380, 'sine', 0.2);
        this.currentSceneId = sceneId;
        this.visitedScenes.add(sceneId);

        // Welcome portal only after ENTER TABUK on this visit
        if (sceneId === 'welcome') {
            this.welcomePortalUnlocked = false;
        }

        // Update SCORM suspend data
        if (window.scorm) {
            window.scorm.set('cmi.suspend_data', JSON.stringify({
                currentScene: sceneId,
                visitedCount: this.visitedScenes.size
            }));
            window.scorm.commit();
        }

        // Close any open menu drawer
        const drawer = document.getElementById('quick-menu-drawer');
        if (drawer) drawer.classList.remove('active');

        const fromHotspot = options.fromHotspot || null;
        const useForwardTransition = !!(fromHotspot && fromHotspot.type === 'portal' && this.viewer);

        if (useForwardTransition) {
            this._sceneTransitioning = true;
            // Hide markers + overlays while dollied forward
            this.hotspots.setHotspots([]);
            const welcomeOverlay = document.getElementById('welcome-modal-overlay');
            const assessmentOverlay = document.getElementById('assessment-modal-overlay');
            const completionOverlay = document.getElementById('completion-modal-overlay');
            if (welcomeOverlay) welcomeOverlay.classList.remove('active');
            if (assessmentOverlay) assessmentOverlay.classList.remove('active');
            if (completionOverlay) completionOverlay.classList.remove('active');
            this.hideReceptionTip();
            this.stopWelcomeEnterAudio();

            const targetFov = scene.bgVideo
                ? this.viewer.maxFov
                : (typeof scene.initialFov === 'number' ? scene.initialFov : 75);

            const { pitch, yaw, sphereYaw } = this._sceneOrientation(scene);
            this.viewer.transitionForward({
                mediaType: scene.bgVideo ? 'video' : 'image',
                url: scene.bgVideo || scene.bgImage,
                lookPitch: fromHotspot.pitch,
                lookYaw: fromHotspot.yaw,
                targetPitch: pitch,
                targetYaw: yaw,
                targetFov,
                sphereYaw,
                duration: 800,
                onSwapped: () => this.syncDevOrientationPanel()
            }).then(() => {
                this._sceneTransitioning = false;
                this._finishSceneUI(scene);
            }).catch((err) => {
                console.error('Scene transition failed:', err);
                this._sceneTransitioning = false;
                this._applySceneMediaReady(scene);
                this._finishSceneUI(scene);
            });
            return;
        }

        // Instant path (menu / first launch) — pass orientation into dissolve so
        // look-at is correct when the new panorama appears (not after it finishes).
        const { pitch, yaw, sphereYaw } = this._sceneOrientation(scene);
        const hasExistingMedia = !!(this.viewer.sphere?.material?.map || this.viewer.activeVideo);
        // First launch: no media yet — set look-at now so we never flash 0°/0°.
        if (!hasExistingMedia) {
            this.viewer.setSphereRotationY(sphereYaw);
            this.viewer.setLookAt(pitch, yaw);
        }

        const onMediaReady = () => this._applySceneMediaReady(scene);
        const orientOpts = { sphereYaw, targetPitch: pitch, targetYaw: yaw };
        if (scene.bgVideo) {
            this.viewer.setMinZoom();
            this.viewer.loadVideo(scene.bgVideo, onMediaReady, {
                ...orientOpts,
                targetFov: this.viewer.maxFov
            });
        } else {
            this.viewer.loadTexture(scene.bgImage, onMediaReady, {
                ...orientOpts,
                targetFov: typeof scene.initialFov === 'number' ? scene.initialFov : 75
            });
        }

        this._finishSceneUI(scene);
    }

    handleWelcomeVideoClosed(profile, ended) {
        if (this.currentSceneId !== 'reception') return;
        if (!profile || profile.id !== 'ceo') return;
        if (this.receptionChroUnlocked) return;
        // Unlock CHRO on any CEO close (even before video ends)
        this.startChroIntroSequence();
    }

    showReceptionTip(html, { animate = true, showAvatar = false } = {}) {
        const stack = document.getElementById('reception-welcome-stack');
        const tip = document.getElementById('reception-welcome-tip');
        if (!stack || !tip) return;
        const textEl = tip.querySelector('.reception-tip-text');
        if (textEl) textEl.innerHTML = html;

        if (this._receptionTipTimer) {
            clearTimeout(this._receptionTipTimer);
            this._receptionTipTimer = null;
        }

        stack.hidden = false;
        stack.classList.remove('visible');

        if (showAvatar) {
            this.startTipAvatar();
        } else {
            this.stopTipAvatar();
        }

        this.applyTipPlacementStyles();

        if (!animate) {
            stack.classList.add('visible');
            return;
        }
        // Hide → slide in from bottom-left
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                stack.classList.add('visible');
            });
        });
    }

    hideReceptionTip() {
        const stack = document.getElementById('reception-welcome-stack');
        if (stack) {
            stack.classList.remove('visible');
            stack.hidden = true;
        }
        this.stopTipAvatar();
    }

    stopTipAvatar() {
        this._tipAvatarKeying = false;
        if (this._tipAvatarRaf) {
            cancelAnimationFrame(this._tipAvatarRaf);
            this._tipAvatarRaf = null;
        }
        const avatar = document.getElementById('reception-tip-avatar');
        if (avatar) avatar.hidden = true;
        this.stopCeoIntroAudio();
    }

    startTipAvatar() {
        const avatar = document.getElementById('reception-tip-avatar');
        const img = document.getElementById('reception-tip-avatar-img');
        const canvas = document.getElementById('reception-tip-avatar-canvas');
        if (!avatar || !img || !canvas) return;

        this.stopTipAvatar();
        avatar.hidden = false;
        this._tipAvatarKeying = true;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const paint = () => {
            if (!this._tipAvatarKeying) return;
            const iw = img.naturalWidth || 360;
            const ih = img.naturalHeight || 640;
            const maxSide = 720;
            const scale = Math.min(1, maxSide / Math.max(iw, ih));
            const w = Math.max(2, Math.round(iw * scale));
            const h = Math.max(2, Math.round(ih * scale));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            this.keyBlackBackground(ctx, w, h);
        };

        const begin = () => {
            paint();
            // Static avatar — play welcome VO that used to live in the tip video
            this.playCeoIntroAudio();
        };

        if (img.complete && img.naturalWidth > 0) {
            begin();
        } else {
            img.addEventListener('load', begin, { once: true });
            img.addEventListener('error', () => {
                console.warn('Tip avatar image failed to load');
                avatar.hidden = false;
            }, { once: true });
        }
    }

    keyBlackBackground(ctx, w, h) {
        let frame;
        try {
            frame = ctx.getImageData(0, 0, w, h);
        } catch (err) {
            console.warn('Black-background key failed:', err);
            return;
        }

        const data = frame.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            // Solid black plate → transparent; keep dark shoe detail (higher lum / color)
            if (lum < 10 && Math.max(r, g, b) < 14) {
                data[i + 3] = 0;
            } else if (lum < 22 && Math.max(r, g, b) < 28) {
                data[i + 3] = Math.round(data[i + 3] * ((lum - 10) / 12));
            }
        }

        ctx.putImageData(frame, 0, 0);
    }

    stopChroIntroAudio() {
        if (this._chroIntroAudio) {
            this._chroIntroAudio.pause();
            this._chroIntroAudio.onended = null;
            this._chroIntroAudio.onerror = null;
            this._chroIntroAudio = null;
        }
        if (this._receptionTipTimer) {
            clearTimeout(this._receptionTipTimer);
            this._receptionTipTimer = null;
        }
    }

    stopWelcomeEnterAudio() {
        if (this._welcomeEnterAudio) {
            this._welcomeEnterAudio.pause();
            this._welcomeEnterAudio.onended = null;
            this._welcomeEnterAudio.onerror = null;
            this._welcomeEnterAudio = null;
        }
    }

    playWelcomeEnterAudio() {
        this.stopWelcomeEnterAudio();
        const audio = new Audio(this.resolveMediaUrl('Audios/Welcome_Enter.mp3'));
        this._welcomeEnterAudio = audio;
        audio.preload = 'auto';
        audio.play().catch(() => {
            // Autoplay may be blocked until a further gesture
        });
    }

    stopCeoIntroAudio() {
        if (this._ceoIntroAudio) {
            this._ceoIntroAudio.pause();
            this._ceoIntroAudio.onended = null;
            this._ceoIntroAudio.onerror = null;
            this._ceoIntroAudio = null;
        }
    }

    playCeoIntroAudio() {
        this.stopCeoIntroAudio();
        const audio = new Audio(this.resolveMediaUrl('Audios/Welcome Notes.mp3'));
        this._ceoIntroAudio = audio;
        audio.preload = 'auto';
        audio.play().catch(() => {
            // Autoplay may be blocked until a further gesture
        });
    }

    startChroIntroSequence() {
        if (this.receptionChroUnlocked) return;

        // Tip + VO; reveal CHRO hotspot when intro audio ends
        this.stopCeoIntroAudio();
        this.showReceptionTip('And now, a personal welcome from our CHRO.', {
            showAvatar: false
        });
        this.stopChroIntroAudio();

        const audio = new Audio(this.resolveMediaUrl('Audios/CHRO_Intro.mp3'));
        this._chroIntroAudio = audio;
        audio.preload = 'auto';

        const finish = () => {
            if (this._chroIntroAudio !== audio) return;
            this._chroIntroAudio = null;
            this.unlockChroHotspot();
        };

        audio.addEventListener('ended', finish);
        audio.addEventListener('error', finish);
        audio.play().catch(() => {
            // If autoplay fails, still unlock after tip is shown briefly
            this._receptionTipTimer = setTimeout(finish, 4000);
        });
    }

    unlockChroHotspot() {
        if (this.receptionChroUnlocked) return;
        this.receptionChroUnlocked = true;
        this.stopChroIntroAudio();
        if (this.currentSceneId !== 'reception' || !this.hotspots) return;

        // Keep CEO visible; reveal CHRO after the intro tip
        this.hotspots.setHotspotHidden('video_welcome', false);
        this.hotspots.setHotspotHidden('video_chro_welcome', false);
        if (this.devPanelOpen) {
            this.refreshDevHotspotList();
        }
    }

    updateHUD(scene) {
        const welcomeOverlay = document.getElementById('welcome-modal-overlay');
        const assessmentOverlay = document.getElementById('assessment-modal-overlay');
        const completionOverlay = document.getElementById('completion-modal-overlay');
        const sceneCard = document.getElementById('scene-info-card');
        const envBadge = document.getElementById('env-progress-badge');

        // Hide overlays by default
        welcomeOverlay.classList.remove('active');
        assessmentOverlay.classList.remove('active');
        completionOverlay.classList.remove('active');

        // Progress badge
        if (scene.envIndex) {
            envBadge.textContent = `Environment ${scene.envIndex} of 4: ${scene.title}`;
            envBadge.style.display = 'block';
        } else {
            envBadge.style.display = 'none';
        }

        // Scene Card (frosted card in bottom right) — hide on intro screens
        const isIntroScene = scene.id === 'welcome' || scene.id === 'approach' || scene.id === 'reception';
        if (scene.cardText && !isIntroScene) {
            const lines = scene.cardText.split('\n');
            sceneCard.innerHTML = `
                <div class="card-headline">${lines[0]}</div>
                <div class="card-subline">${lines[1] || ''}</div>
            `;
            sceneCard.style.display = 'block';
        } else {
            sceneCard.style.display = 'none';
        }

        const hudLayer = document.getElementById('hud-layer');
        if (hudLayer) {
            // Always show title + fullscreen (HUD stripped to those only)
            hudLayer.style.visibility = 'visible';
        }

        // Keep DEV panel state across scenes; refresh hotspot list when open
        if (this.devPanelOpen) {
            this.refreshDevHotspotList();
            this.syncDevOrientationPanel();
        }

        // Reception welcome glass tip (third screen)
        this.stopChroIntroAudio();
        this.stopCeoIntroAudio();
        if (scene.id === 'reception') {
            if (!this.receptionChroUnlocked) {
                this.showReceptionTip(
                    'Welcome to Tabuk Pharmaceuticals!<br><em>Your journey starts here.</em>',
                    { showAvatar: false }
                );
                this.playCeoIntroAudio();
            } else {
                this.showReceptionTip(
                    'And now, a personal welcome from our CHRO.',
                    { animate: true, showAvatar: false }
                );
            }
        } else {
            this.hideReceptionTip();
            // Reset CHRO lock when leaving reception so revisit starts with CEO again
            this.receptionChroUnlocked = false;
        }

        // Welcome / ENTER TABUK screen narration
        this.stopWelcomeEnterAudio();
        if (scene.id === 'welcome') {
            // Portal stays hidden until ENTER TABUK; popup shows on each visit
            this.welcomePortalUnlocked = false;
            welcomeOverlay.classList.add('active');
            this.playWelcomeEnterAudio();
        } else {
            this.welcomePortalUnlocked = false;
            if (scene.isAssessment) {
                assessmentOverlay.classList.add('active');
                this.assessment.start();
            } else if (scene.isCompletion) {
                completionOverlay.classList.add('active');
                this.renderCompletionScreen();
            }
        }
    }

    handleHotspotClick(hotspot) {
        // Locked portals stay visible but do not navigate
        if (hotspot.locked) {
            this.playTone(220, 'sine', 0.08);
            return;
        }

        if (this._sceneTransitioning || (this.viewer && this.viewer.isTransitioning())) {
            return;
        }

        this.playTone(660, 'sine', 0.15);
        this.visitedHotspots.add(hotspot.id);

        if (hotspot.type === 'portal') {
            this.goToScene(hotspot.targetScene, { fromHotspot: hotspot });
        } else if (hotspot.type === 'modal') {
            // Stop reception tip VO/avatar when opening CEO/CHRO video players
            if (hotspot.modalId === 'modal_video_welcome' || hotspot.modalId === 'modal_video_chro') {
                this.stopCeoIntroAudio();
                this.stopChroIntroAudio();
                this.stopTipAvatar();
            }
            window.modalManager.showComplexModal(hotspot.modalId);
        } else if (hotspot.type === 'info') {
            window.modalManager.showInfo(hotspot.title, hotspot.text, hotspot.icon || 'building', hotspot.bullets || null);
        }
    }

    renderCompletionScreen() {
        const container = document.getElementById('completion-overlay-content');
        const rawScore = window.scorm ? window.scorm.get('cmi.core.score.raw') : '100';
        const studentName = window.scorm ? window.scorm.get('cmi.core.student_name') : 'Tabuk Colleague';
        const sessionTime = window.scorm ? window.scorm.formatSessionTime(new Date() - window.scorm.startTime) : '00:15:30';

        container.innerHTML = `
            <div class="completion-card">
                <div class="completion-logo">
                    <img class="completion-aperture-logo" src="assets/images/tabuk_aperture_logo.png" alt="Tabuk" width="56" height="56">
                    <div class="completion-brand-text">
                        <span class="tabuk-brand">tabuk</span>
                        <span class="pharma-text">pharmaceuticals</span>
                    </div>
                </div>
                <h1 class="completion-title">Welcome to the Team!</h1>
                <p class="completion-subtitle">You have successfully completed the Tabuk WebXR Induction Experience.</p>
                
                <div class="certificate-preview">
                    <div class="cert-border">
                        <div class="cert-header">CERTIFICATE OF INDUCTION</div>
                        <div class="cert-recipient">${studentName}</div>
                        <div class="cert-body">has thoroughly completed the interactive induction journey through Riyadh HQ, Dammam Plant, and Tabuk Flagship Facilities.</div>
                        <div class="cert-meta">
                            <span>Score: <strong>${rawScore || 100}%</strong></span>
                            <span>Status: <strong class="text-green">PASSED</strong></span>
                            <span>Duration: <strong>${sessionTime}</strong></span>
                        </div>
                    </div>
                </div>

                <div class="completion-actions">
                    <button class="btn btn-primary" onclick="window.app.goToScene('riyadh_hq')">
                        Revisit Environments
                    </button>
                    <button class="btn btn-secondary" onclick="window.scorm.terminate(); alert('Module completed. You may now close this window.');">
                        Exit Induction
                    </button>
                </div>
            </div>
        `;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new WebXRApp();
    window.app.init();
});
