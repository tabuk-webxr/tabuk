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
        this.receptionRightUnlocked = false;
        this.receptionRightArrived = false;
        this.receptionVmvEntryUnlocked = false;
        this.receptionLiftUnlocked = false;
        this._devSlideIndex = -1;
        // Full induction scrubber — start → end (Level 1 + Level 2 scenes)
        this._devSlides = [
            { id: 'approach', label: '01 Approach', kind: 'scene', scene: 'approach' },
            { id: 'welcome', label: '02 Welcome ENTER', kind: 'scene', scene: 'welcome', gates: { welcomeModal: true, welcomePortal: false } },
            { id: 'welcome_portal', label: '03 Welcome → Reception', kind: 'scene', scene: 'welcome', gates: { welcomeModal: false, welcomePortal: true } },
            { id: 'reception_ceo', label: '04 Reception CEO', kind: 'scene', scene: 'reception', gates: { chro: false, right: false, rightArrived: false, vmv: false, lift: false, tip: 'ceo' } },
            { id: 'reception_chro', label: '05 Reception CHRO', kind: 'scene', scene: 'reception', gates: { chro: true, right: false, rightArrived: false, vmv: false, lift: false, tip: 'chro' } },
            { id: 'reception_who_arrow', label: '06 Who We Are arrow', kind: 'scene', scene: 'reception', gates: { chro: true, right: true, rightArrived: false, vmv: false, lift: false } },
            { id: 'reception_tv', label: '07 TV Play Who We Are', kind: 'scene', scene: 'reception', gates: { chro: true, right: true, rightArrived: true, vmv: false, lift: false } },
            { id: 'timeline', label: '08 Timeline', kind: 'cinematic', mode: 'timeline' },
            { id: 'people', label: '09 People', kind: 'cinematic', mode: 'people' },
            { id: 'footprint', label: '10 Footprint', kind: 'cinematic', mode: 'footprint' },
            { id: 'scale', label: '11 Scale', kind: 'cinematic', mode: 'scale' },
            { id: 'reception_guides', label: '12 Discover guides arrow', kind: 'scene', scene: 'reception', gates: { chro: true, right: true, rightArrived: true, vmv: true, lift: false } },
            { id: 'vision', label: '13 Vision', kind: 'values', mode: 'vision' },
            { id: 'mission', label: '14 Mission', kind: 'values', mode: 'mission' },
            { id: 'values', label: '15 Values intro', kind: 'values', mode: 'values' },
            { id: 'vault', label: '16 Vault intro', kind: 'values', mode: 'vault' },
            { id: 'scenario1', label: '17 Vault scenario 1', kind: 'values', mode: 'scenario:0' },
            { id: 'scenario2', label: '18 Vault scenario 2', kind: 'values', mode: 'scenario:1' },
            { id: 'scenario3', label: '19 Vault scenario 3', kind: 'values', mode: 'scenario:2' },
            { id: 'scenario4', label: '20 Vault scenario 4', kind: 'values', mode: 'scenario:3' },
            { id: 'summary', label: '21 Summary → Level 2', kind: 'values', mode: 'summary' },
            { id: 'reception_lift', label: '22 Lift unlocked', kind: 'scene', scene: 'reception', gates: { chro: true, right: true, rightArrived: true, vmv: true, lift: true } },
            { id: 'elevator', label: '23 Elevator Level 2', kind: 'scene', scene: 'riyadh_elevator' },
            { id: 'dammam', label: '24 Dammam plant', kind: 'scene', scene: 'dammam_reception' },
            { id: 'lab', label: '25 QC Lab', kind: 'scene', scene: 'dammam_lab' },
            { id: 'campus', label: '26 Tabuk campus', kind: 'scene', scene: 'tabuk_plant' },
            { id: 'boardroom', label: '27 Boardroom', kind: 'scene', scene: 'tabuk_boardroom' },
            { id: 'assessment', label: '28 Assessment', kind: 'scene', scene: 'assessment_hub' },
            { id: 'completion', label: '29 Completion', kind: 'scene', scene: 'completion' }
        ];
        this.welcomePortalUnlocked = false;
        this._receptionTipTimer = null;
        this._chroIntroAudio = null;
        this._ceoIntroAudio = null;
        this._welcomeEnterAudio = null;
        this._tipAvatarRaf = null;
        this._tipAvatarKeying = false;
        this._sceneTransitioning = false;
        this._timelineBeatTimers = [];
        this._cinematicSpeech = null;
        this._cinematicSpeechGen = 0;
        this._speechKeepAlive = null;
        this.footprintPins = null;
        this.footprintPinKey = 'ksa';
        this._footprintDragKey = null;
        this._footprintDragEdge = null;
        this.devPanelSide = 'right';
        
        // Sound effects synthesis via Web Audio API (zero external asset dependency)
        this.audioCtx = null;
    }

    init() {
        console.log("%c[Tabuk WebXR Induction] Initializing...", "color:#0072CE; font-weight:bold; font-size:14px;");

        // 1. Initialize SCORM (off while SCORM_ENABLED is false in scorm.js)
        if (window.SCORM_ENABLED && window.scorm) {
            window.scorm.init();
        }

        // 2. Initialize 360 Viewer
        this.viewer = new window.PanoramaViewer('vr-viewport');
        this._primeCinematicVoices();

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
        this.valuesExperience = new window.ValuesExperience(this);
        this.bindUI();

        // 6. Preload all video/audio, then open first scene
        this.assets = new window.AssetLoader();
        this.bindAssetLoadingUI();
        const cinematicMode = new URLSearchParams(window.location.search).get('cinematic');
        if (
            cinematicMode === 'timeline'
            || cinematicMode === 'people'
            || cinematicMode === 'footprint'
            || cinematicMode === 'scale'
            || cinematicMode === 'closing'
        ) {
            this.hideAssetLoadingScreen();
            this._openCinematicPreview(cinematicMode);
            return;
        }
        if (cinematicMode === 'values' || cinematicMode === 'vault') {
            this.hideAssetLoadingScreen();
            this.valuesExperience.open({ start: cinematicMode === 'vault' ? 'vault' : 'vision' });
            return;
        }
        this.runAssetPreload();
    }

    _openCinematicPreview(mode) {
        if (mode === 'closing') {
            this._returnToWhoWeAreForVmvEntry();
            return;
        }
        const idx = this._devSlides.findIndex((s) => s.mode === mode || s.id === mode);
        if (idx >= 0) {
            this.devGotoSlide(idx);
            return;
        }
        this._devShowCinematicSlide(mode || 'timeline');
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

        const timelineClose = document.getElementById('timeline-cinematic-close');
        if (timelineClose) {
            timelineClose.addEventListener('click', () => this.hideTimelineCinematic());
        }

        const valuesEntry = document.getElementById('values-entry-arrow');
        if (valuesEntry) {
            valuesEntry.addEventListener('click', () => this.openValuesExperienceFromPoster());
        }
        const posterHotspot = document.getElementById('vmv-poster-hotspot');
        if (posterHotspot) {
            posterHotspot.addEventListener('click', () => this.openValuesExperienceFromPoster());
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
                if (this.isAudioMuted) this._stopCinematicSpeech();
            });
        }

        // SCORM Diagnostic drawer toggle (hidden while SCORM is disabled)
        const scormLogBtn = document.getElementById('btn-toggle-scorm-logs');
        const scormPanel = document.getElementById('scorm-diagnostics-panel');
        if (!window.SCORM_ENABLED) {
            if (scormLogBtn) scormLogBtn.style.display = 'none';
            if (scormPanel) {
                scormPanel.classList.remove('active');
                scormPanel.style.display = 'none';
            }
        } else if (scormLogBtn && scormPanel) {
            scormLogBtn.addEventListener('click', () => {
                scormPanel.classList.toggle('active');
            });
            const scormClose = document.getElementById('scorm-panel-close');
            if (scormClose) {
                scormClose.addEventListener('click', () => scormPanel.classList.remove('active'));
            }
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
        const avatarRot = document.getElementById('dev-avatar-rot');
        const namePitch = document.getElementById('dev-name-pitch');
        const nameYaw = document.getElementById('dev-name-yaw');
        const nameRot = document.getElementById('dev-name-rot');
        const placeNameBtn = document.getElementById('dev-place-name-at-view');
        const screenSelect = document.getElementById('dev-screen-select');
        const screenCorner = document.getElementById('dev-screen-corner');
        const screenPitch = document.getElementById('dev-screen-pitch');
        const screenYaw = document.getElementById('dev-screen-yaw');
        const screenRadius = document.getElementById('dev-screen-radius');
        const placeScreenCornerBtn = document.getElementById('dev-place-screen-corner');
        const labelY = document.getElementById('dev-label-y');
        const labelX = document.getElementById('dev-label-x');
        const playY = document.getElementById('dev-play-y');
        const promptGap = document.getElementById('dev-prompt-gap');
        const arrowScaleEl = document.getElementById('dev-arrow-scale');
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
            const worldRot = avatarRot ? Number(avatarRot.value) : 0;
            this.viewer.setSceneAvatarSize(id, { worldHeight, worldWidth, radius, worldRot });
            this.persistAvatarImageSettings(id, { worldHeight, worldWidth, radius, worldRot });
            const hVal = document.getElementById('dev-avatar-height-val');
            const wVal = document.getElementById('dev-avatar-width-val');
            const rVal = document.getElementById('dev-avatar-radius-val');
            const rotVal = document.getElementById('dev-avatar-rot-val');
            if (hVal) hVal.textContent = String(Math.round(worldHeight));
            if (wVal) wVal.textContent = String(Math.round(worldWidth));
            if (rVal) rVal.textContent = String(Math.round(radius));
            if (rotVal) rotVal.textContent = `${Math.round(worldRot)}°`;
            this.updateDevOrientationReadout();
        };

        const applyNameTag = () => {
            const id = this.getNameTagHotspotId();
            if (!id || !namePitch || !nameYaw) return;
            const pitch = Number(namePitch.value);
            let yaw = Number(nameYaw.value);
            yaw = ((yaw % 360) + 360) % 360;
            const rot = nameRot ? Number(nameRot.value) : 0;
            this.hotspots.setHotspotCoords(id, pitch, yaw);
            this.hotspots.setNametagRot(id, rot);
            this.persistAvatarNameTagSettings(id, { pitch, yaw, rot });
            const pVal = document.getElementById('dev-name-pitch-val');
            const yVal = document.getElementById('dev-name-yaw-val');
            const rVal = document.getElementById('dev-name-rot-val');
            if (pVal) pVal.textContent = `${Math.round(pitch)}°`;
            if (yVal) yVal.textContent = `${Math.round(yaw)}°`;
            if (rVal) rVal.textContent = `${Math.round(rot)}°`;
            this.updateDevOrientationReadout();
        };

        const applyScreenOverlay = () => {
            if (!screenSelect || !screenSelect.value || !screenCorner || !screenPitch || !screenYaw) return;
            const id = screenSelect.value;
            const corner = screenCorner.value;
            const pitch = this._round1(Number(screenPitch.value));
            let yaw = this._round1(Number(screenYaw.value));
            yaw = this._round1(((yaw % 360) + 360) % 360);
            const radius = this._round1(screenRadius ? Number(screenRadius.value) : 480);
            this.viewer.setScreenOverlayCorner(id, corner, pitch, yaw);
            this.viewer.setScreenOverlayRadius(id, radius);
            this.persistScreenOverlaySettings(id);
            const pVal = document.getElementById('dev-screen-pitch-val');
            const yVal = document.getElementById('dev-screen-yaw-val');
            const rVal = document.getElementById('dev-screen-radius-val');
            if (pVal) pVal.textContent = `${pitch.toFixed(1)}°`;
            if (yVal) yVal.textContent = `${yaw.toFixed(1)}°`;
            if (rVal) rVal.textContent = radius.toFixed(1);
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

        const applyTabletLabelOffset = () => {
            if (!hotSelect || !hotSelect.value || !labelY || !labelX) return;
            const id = hotSelect.value;
            const h = this.hotspots.getHotspotById(id);
            if (!h || !(h.icon === 'monitor' || h.icon === 'ipad' || h.glue)) return;
            const labelOffsetY = Number(labelY.value);
            const labelOffsetX = Number(labelX.value);
            const playOffsetY = playY ? Number(playY.value) : -48;
            this.hotspots.setLabelOffset(id, { labelOffsetY, labelOffsetX, playOffsetY });
            this.persistTabletLabelOffset(id, { labelOffsetY, labelOffsetX, playOffsetY });
            const yVal = document.getElementById('dev-label-y-val');
            const xVal = document.getElementById('dev-label-x-val');
            const pVal = document.getElementById('dev-play-y-val');
            if (yVal) yVal.textContent = `${Math.round(labelOffsetY)}px`;
            if (xVal) xVal.textContent = `${Math.round(labelOffsetX)}px`;
            if (pVal) pVal.textContent = `${Math.round(playOffsetY)}px`;
            this.updateDevOrientationReadout();
        };

        const applyArrowPromptGap = () => {
            if (!hotSelect || !hotSelect.value || !promptGap) return;
            const id = hotSelect.value;
            const h = this.hotspots.getHotspotById(id);
            if (!h || h.type !== 'portal') return;
            const promptOffsetY = Number(promptGap.value);
            this.hotspots.setPromptOffsetY(id, promptOffsetY);
            this.persistArrowPromptOffset(id, { promptOffsetY });
            const gVal = document.getElementById('dev-prompt-gap-val');
            if (gVal) gVal.textContent = `${Math.round(promptOffsetY)}px`;
            this.updateDevOrientationReadout();
        };

        const applyArrowScale = () => {
            if (!hotSelect || !hotSelect.value || !arrowScaleEl) return;
            const id = hotSelect.value;
            const h = this.hotspots.getHotspotById(id);
            if (!h || h.type !== 'portal') return;
            const arrowScale = Number(arrowScaleEl.value) / 100;
            this.hotspots.setArrowScale(id, arrowScale);
            this.persistArrowPromptOffset(id, { arrowScale });
            const sVal = document.getElementById('dev-arrow-scale-val');
            if (sVal) sVal.textContent = `${Math.round(arrowScale * 100)}%`;
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
        if (avatarRot) avatarRot.addEventListener('input', applySceneAvatarImage);
        if (namePitch) namePitch.addEventListener('input', applyNameTag);
        if (nameYaw) nameYaw.addEventListener('input', applyNameTag);
        if (nameRot) nameRot.addEventListener('input', applyNameTag);
        if (screenPitch) screenPitch.addEventListener('input', applyScreenOverlay);
        if (screenYaw) screenYaw.addEventListener('input', applyScreenOverlay);
        if (screenRadius) screenRadius.addEventListener('input', applyScreenOverlay);
        if (screenSelect) {
            screenSelect.addEventListener('change', () => this.loadScreenOverlayIntoDevSliders());
        }
        if (screenCorner) {
            screenCorner.addEventListener('change', () => this.loadScreenOverlayIntoDevSliders());
        }
        if (tipLeft) tipLeft.addEventListener('input', applyTipPlacement);
        if (tipBottom) tipBottom.addEventListener('input', applyTipPlacement);
        if (tipWidth) tipWidth.addEventListener('input', applyTipPlacement);
        if (tipHeight) tipHeight.addEventListener('input', applyTipPlacement);
        if (tipBoxWidth) tipBoxWidth.addEventListener('input', applyTipPlacement);
        if (tipGap) tipGap.addEventListener('input', applyTipPlacement);
        if (labelY) labelY.addEventListener('input', applyTabletLabelOffset);
        if (labelX) labelX.addEventListener('input', applyTabletLabelOffset);
        if (playY) playY.addEventListener('input', applyTabletLabelOffset);
        if (promptGap) promptGap.addEventListener('input', applyArrowPromptGap);
        if (arrowScaleEl) arrowScaleEl.addEventListener('input', applyArrowScale);

        if (hotSelect) {
            hotSelect.addEventListener('change', () => {
                this.loadSelectedHotspotIntoDevSliders();
                this.loadAvatarImageSettingsIntoDevSliders();
                this.loadNameTagSettingsIntoDevSliders();
                this.loadTabletLabelOffsetIntoDevSliders();
                this.loadArrowPromptGapIntoDevSliders();
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

        if (placeNameBtn) {
            placeNameBtn.addEventListener('click', () => {
                const id = this.getNameTagHotspotId();
                if (!id || !namePitch || !nameYaw) return;
                const pitch = Math.round(this.viewer.targetPitch);
                let yaw = Math.round(this.viewer.targetYaw);
                yaw = ((yaw % 360) + 360) % 360;
                const rot = nameRot ? Number(nameRot.value) : 0;
                namePitch.value = String(pitch);
                nameYaw.value = String(yaw);
                this.hotspots.setHotspotCoords(id, pitch, yaw);
                this.hotspots.setNametagRot(id, rot);
                this.persistAvatarNameTagSettings(id, { pitch, yaw, rot });
                this.loadNameTagSettingsIntoDevSliders();
                this.updateDevOrientationReadout();
            });
        }

        if (placeScreenCornerBtn) {
            placeScreenCornerBtn.addEventListener('click', () => {
                if (!screenSelect || !screenSelect.value || !screenCorner || !screenPitch || !screenYaw) return;
                const pitch = this._round1(this.viewer.targetPitch);
                let yaw = this._round1(this.viewer.targetYaw);
                yaw = this._round1(((yaw % 360) + 360) % 360);
                screenPitch.value = String(pitch);
                screenYaw.value = String(yaw);
                this.viewer.setScreenOverlayCorner(screenSelect.value, screenCorner.value, pitch, yaw);
                this.persistScreenOverlaySettings(screenSelect.value);
                this.loadScreenOverlayIntoDevSliders();
                this.updateDevOrientationReadout();
            });
        }

        if (tipShowBtn) {
            tipShowBtn.addEventListener('click', () => {
                this.showReceptionTip(
                    'Welcome to Tabuk Pharmaceuticals!<br><em>Your journey starts here.</em>',
                    { animate: false, showAvatar: false }
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

        // Space toggles DEV panel; ← → change slides when DEV is open
        window.addEventListener('keydown', (e) => {
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable)) {
                return;
            }
            if (this.devPanelOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                if (e.key === 'ArrowLeft') this.devSlidePrev();
                else this.devSlideNext();
                return;
            }
            if (e.code !== 'Space' && e.key !== ' ') return;
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
        this.bindDevSlideNav();
        this.bindDevFootprintPins();
    }

    bindDevSlideNav() {
        const prev = document.getElementById('dev-slide-prev');
        const next = document.getElementById('dev-slide-next');
        const prevFab = document.getElementById('dev-slide-prev-fab');
        const nextFab = document.getElementById('dev-slide-next-fab');
        const select = document.getElementById('dev-slide-select');
        if (prev) prev.addEventListener('click', () => this.devSlidePrev());
        if (next) next.addEventListener('click', () => this.devSlideNext());
        if (prevFab) prevFab.addEventListener('click', () => this.devSlidePrev());
        if (nextFab) nextFab.addEventListener('click', () => this.devSlideNext());
        if (select) {
            select.innerHTML = this._devSlides
                .map((s, i) => `<option value="${i}">${i + 1}. ${s.label.replace(/^\d+\s*/, '')}</option>`)
                .join('');
            select.addEventListener('change', () => {
                const idx = parseInt(select.value, 10);
                if (!Number.isNaN(idx)) this.devGotoSlide(idx);
            });
        }
        this._updateDevSlideLabel();
    }

    _updateDevSlideLabel() {
        const total = this._devSlides.length;
        const slide = this._devSlides[this._devSlideIndex];
        const text = slide
            ? `${this._devSlideIndex + 1}/${total} · ${slide.label}`
            : `—/${total} · press Next`;
        const panelLabel = document.getElementById('dev-slide-label');
        const fabLabel = document.getElementById('dev-slide-nav-label');
        const select = document.getElementById('dev-slide-select');
        if (panelLabel) panelLabel.textContent = text;
        if (fabLabel) fabLabel.textContent = text;
        if (select && this._devSlideIndex >= 0) select.value = String(this._devSlideIndex);

        const prevDisabled = this._devSlideIndex <= 0;
        const nextDisabled = this._devSlideIndex >= total - 1 && this._devSlideIndex >= 0;
        ['dev-slide-prev', 'dev-slide-prev-fab'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = prevDisabled;
        });
        ['dev-slide-next', 'dev-slide-next-fab'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = nextDisabled;
        });
    }

    _syncDevSlideNavVisibility() {
        const nav = document.getElementById('dev-slide-nav');
        if (!nav) return;
        nav.hidden = !this.devPanelOpen;
    }

    _devCloseExperiences() {
        this._clearTimelineBeats();
        this._stopCinematicSpeech();
        this._sceneTransitioning = false;
        if (this.valuesExperience && this.valuesExperience.isOpen) {
            this.valuesExperience.close({ restore: false });
        }
        this.hideTimelineCinematic({ restoreScene: false });
        if (window.modalManager && typeof window.modalManager.close === 'function') {
            window.modalManager.close();
        }
        const welcomeOverlay = document.getElementById('welcome-modal-overlay');
        const assessmentOverlay = document.getElementById('assessment-modal-overlay');
        const completionOverlay = document.getElementById('completion-modal-overlay');
        if (welcomeOverlay) welcomeOverlay.classList.remove('active');
        if (assessmentOverlay) assessmentOverlay.classList.remove('active');
        if (completionOverlay) completionOverlay.classList.remove('active');
        this.hideReceptionTip();
        this.stopCeoIntroAudio();
        this.stopChroIntroAudio();
        this.stopWelcomeEnterAudio();
        this.stopTipAvatar();
    }

    _devApplyGates(gates = {}) {
        if (typeof gates.welcomePortal === 'boolean') {
            this.welcomePortalUnlocked = gates.welcomePortal;
        }
        if (typeof gates.chro === 'boolean') this.receptionChroUnlocked = gates.chro;
        if (typeof gates.right === 'boolean') this.receptionRightUnlocked = gates.right;
        if (typeof gates.rightArrived === 'boolean') this.receptionRightArrived = gates.rightArrived;
        if (typeof gates.vmv === 'boolean') this.receptionVmvEntryUnlocked = gates.vmv;
        if (typeof gates.lift === 'boolean') this.receptionLiftUnlocked = gates.lift;

        const welcomeOverlay = document.getElementById('welcome-modal-overlay');
        if (welcomeOverlay && typeof gates.welcomeModal === 'boolean') {
            welcomeOverlay.classList.toggle('active', !!gates.welcomeModal);
            if (gates.welcomeModal) this.playWelcomeEnterAudio();
            else this.stopWelcomeEnterAudio();
        }

        const scene = window.COURSE_DATA && window.COURSE_DATA.scenes[this.currentSceneId];
        if (scene && this.hotspots) {
            this.hotspots.setHotspots(this._buildHotspotList(scene));
            if (this.viewer && typeof this.viewer.syncScreenOverlays === 'function') {
                this.viewer.syncScreenOverlays(this._visibleScreenOverlays(scene));
            }
        }
        if (this.devPanelOpen) this.refreshDevHotspotList();

        if (gates.tip === 'ceo') {
            this.showReceptionTip(
                'Welcome to Tabuk Pharmaceuticals!<br><em>Your journey starts here.</em>',
                { showAvatar: false }
            );
        } else if (gates.tip === 'chro') {
            this.showReceptionTip(
                'And now, a personal welcome from our CHRO.',
                { animate: true, showAvatar: false }
            );
        } else if (this.currentSceneId === 'reception') {
            this.hideReceptionTip();
            this.stopCeoIntroAudio();
            this.stopChroIntroAudio();
        }
    }

    _devGotoScene(sceneId, gates = {}) {
        this._devCloseExperiences();
        // Pre-set gates so _finishSceneUI tip logic sees them when landing on reception
        if (gates.chro !== undefined || gates.right !== undefined || gates.lift !== undefined) {
            this._devApplyGates({
                chro: !!gates.chro,
                right: !!gates.right,
                rightArrived: !!gates.rightArrived,
                vmv: !!gates.vmv,
                lift: !!gates.lift
            });
        }
        const alreadyThere = this.currentSceneId === sceneId;
        if (!alreadyThere) {
            this.goToScene(sceneId);
        }
        // Re-apply after HUD defaults so DEV gates win
        requestAnimationFrame(() => {
            this._devApplyGates(gates);
            setTimeout(() => this._devApplyGates(gates), 80);
        });
    }

    devSlideNext() {
        const max = this._devSlides.length - 1;
        const next = this._devSlideIndex < 0 ? 0 : Math.min(max, this._devSlideIndex + 1);
        this.devGotoSlide(next);
    }

    devSlidePrev() {
        if (this._devSlideIndex < 0) {
            this.devGotoSlide(0);
            return;
        }
        this.devGotoSlide(Math.max(0, this._devSlideIndex - 1));
    }

    devGotoSlide(index) {
        const slide = this._devSlides[index];
        if (!slide) return;
        this._devSlideIndex = index;
        this._updateDevSlideLabel();

        if (slide.kind === 'scene') {
            this._devGotoScene(slide.scene, slide.gates || {});
            return;
        }

        if (slide.kind === 'cinematic') {
            this._devCloseExperiences();
            this._devShowCinematicSlide(slide.mode);
            return;
        }

        if (slide.kind === 'values') {
            this._devCloseExperiences();
            if (this.valuesExperience) {
                if (!this.valuesExperience.isOpen) {
                    this.valuesExperience.open({ devJump: slide.mode });
                } else {
                    this.valuesExperience.devJump(slide.mode, { silent: true });
                }
            }
        }
    }

    _devShowCinematicSlide(mode) {
        const overlay = document.getElementById('timeline-cinematic-overlay');
        if (!overlay) return;

        const hotspotsLayer = document.getElementById('hotspots-layer');
        const hud = document.getElementById('hud-layer');
        if (hotspotsLayer) hotspotsLayer.style.visibility = 'hidden';
        if (hud) hud.style.visibility = 'hidden';
        if (this.hotspots) this.hotspots.setHotspots([]);
        if (this.viewer && typeof this.viewer.syncScreenOverlays === 'function') {
            this.viewer.syncScreenOverlays([]);
        }

        const valuesEntry = document.getElementById('values-entry-arrow');
        if (valuesEntry) valuesEntry.hidden = true;
        const posterHotspot = document.getElementById('vmv-poster-hotspot');
        if (posterHotspot) posterHotspot.hidden = true;

        overlay.hidden = false;
        overlay.className = 'timeline-cinematic is-open';
        overlay.querySelectorAll('.people-purpose-photo, .footprint-map').forEach((photo) => {
            const path = photo.getAttribute('src') || '';
            const bare = path.split('?')[0];
            if (bare) photo.src = this.resolveMediaUrl(bare);
        });
        this.applyFootprintPins();

        // Full timeline beats unlocked for static preview
        overlay.classList.add(
            'is-beat-1', 'is-beat-2', 'is-beat-3', 'is-beat-4',
            'is-node-1', 'is-node-2', 'is-node-3', 'is-node-4',
            'is-draw-4'
        );
        this._alignTimelineLineSoon();

        if (mode === 'people') {
            overlay.classList.add('is-people', 'is-people-beat-1', 'is-people-beat-2');
        } else if (mode === 'footprint') {
            overlay.classList.add('is-people', 'is-footprint', 'is-foot-out');
            this._syncDevFootprintClass();
        } else if (mode === 'scale') {
            overlay.classList.add('is-people', 'is-footprint', 'is-scale');
            this._runScaleImpactCounts();
        }
        // mode === 'timeline' keeps timeline stage only
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

    _footprintPinDefaults() {
        return {
            ksa: { x: 76.3, y: 38.4, w: 19.6, h: 27.4, rot: 81 },
            gulf: { x: 88.6, y: 35, w: 23.2, h: 30.8, rot: 55 },
            nafrica: { x: 28.3, y: 26, w: 16.8, h: 40, rot: 0 },
            origin: { x: 76.5, y: 38.3 },
            r1: { x: 28.2, y: 26 },
            r2: { x: 84, y: 27.3 },
            r3: { x: 93, y: 46.1 }
        };
    }

    _isFootprintRoutePin(key) {
        return key === 'origin' || key === 'r1' || key === 'r2' || key === 'r3';
    }

    _isFootprintGlowPin(key) {
        return key === 'ksa' || key === 'gulf' || key === 'nafrica';
    }

    _cloneFootprintPins(source) {
        const defaults = this._footprintPinDefaults();
        const src = source || defaults;
        const out = {};
        Object.keys(defaults).forEach((key) => {
            const base = defaults[key];
            const next = src[key] || base;
            out[key] = { x: Number(next.x), y: Number(next.y) };
            if (this._isFootprintGlowPin(key)) {
                const oldCircle = (
                    (key === 'ksa' && Number(next.w) === 17 && Number(next.h) === 30) ||
                    (key === 'gulf' && Number(next.w) === 20 && Number(next.h) === 36) ||
                    (key === 'nafrica' && Number(next.w) === 18 && Number(next.h) === 30)
                );
                out[key].w = Number(oldCircle ? base.w : (next.w != null ? next.w : base.w));
                out[key].h = Number(oldCircle ? base.h : (next.h != null ? next.h : base.h));
                out[key].rot = Number(next.rot != null ? next.rot : (base.rot || 0));
            }
        });
        return out;
    }

    _loadFootprintPins() {
        try {
            const raw = window.localStorage.getItem('tabuk-footprint-pins');
            if (raw) return this._cloneFootprintPins(JSON.parse(raw));
        } catch (err) {
            /* keep defaults */
        }
        return this._cloneFootprintPins();
    }

    _saveFootprintPins() {
        try {
            window.localStorage.setItem('tabuk-footprint-pins', JSON.stringify(this.footprintPins));
        } catch (err) {
            /* ignore quota / private mode */
        }
    }

    _syncDevFootprintClass() {
        const overlay = document.getElementById('timeline-cinematic-overlay');
        if (!overlay) return;
        overlay.classList.toggle(
            'is-dev-footprint',
            !!(this.devPanelOpen && overlay.classList.contains('is-footprint'))
        );
    }

    _footprintImageBox() {
        const wrap = document.querySelector('.footprint-map-wrap');
        const map = document.querySelector('.footprint-map');
        if (!wrap || !map) return null;
        const wrapR = wrap.getBoundingClientRect();
        const mapR = map.getBoundingClientRect();
        if (mapR.width < 2 || mapR.height < 2) return null;
        return {
            left: mapR.left - wrapR.left,
            top: mapR.top - wrapR.top,
            w: mapR.width,
            h: mapR.height
        };
    }

    _fitFootprintLayer() {
        const wrap = document.querySelector('.footprint-map-wrap');
        const map = document.querySelector('.footprint-map');
        const layer = document.querySelector('.footprint-layer');
        if (!wrap || !map || !layer) return null;
        const nw = map.naturalWidth;
        const nh = map.naturalHeight;
        if (nw < 2 || nh < 2) return this._footprintImageBox();
        wrap.style.height = '';
        const maxW = wrap.clientWidth;
        const maxH = wrap.clientHeight;
        if (maxW < 2 || maxH < 2) return this._footprintImageBox();
        const scale = Math.min(maxW / nw, maxH / nh);
        const w = Math.round(nw * scale);
        const h = Math.round(nh * scale);
        map.style.width = `${w}px`;
        map.style.height = `${h}px`;
        const wrapR = wrap.getBoundingClientRect();
        const mapR = map.getBoundingClientRect();
        const left = Math.max(0, mapR.left - wrapR.left);
        const top = Math.max(0, mapR.top - wrapR.top);
        layer.style.left = `${left}px`;
        layer.style.top = `${top}px`;
        layer.style.width = `${w}px`;
        layer.style.height = `${h}px`;
        return { left, top, w, h };
    }

    _footprintMapSize() {
        const box = this._fitFootprintLayer() || this._footprintImageBox();
        if (!box) return null;
        return { w: box.w, h: box.h };
    }

    _normalizeFootprintRot(deg) {
        let rot = Number(deg) || 0;
        while (rot > 180) rot -= 360;
        while (rot < -180) rot += 360;
        return Math.round(rot * 10) / 10;
    }

    _rotateAroundPin(pin, x, y) {
        const map = this._footprintMapSize();
        const rot = Number(pin.rot) || 0;
        if (!map || !rot) return { x, y };
        const rad = rot * Math.PI / 180;
        const dx = (x - pin.x) / 100 * map.w;
        const dy = (y - pin.y) / 100 * map.h;
        return {
            x: Math.round((pin.x + (dx * Math.cos(rad) - dy * Math.sin(rad)) / map.w * 100) * 10) / 10,
            y: Math.round((pin.y + (dx * Math.sin(rad) + dy * Math.cos(rad)) / map.h * 100) * 10) / 10
        };
    }

    _setFootprintPinRotFromPoint(key, pt) {
        const pin = this.footprintPins && this.footprintPins[key];
        const map = this._footprintMapSize();
        if (!pin || !map || !this._isFootprintGlowPin(key)) return;
        const dx = pt.x / 100 * map.w - pin.x / 100 * map.w;
        const dy = pt.y / 100 * map.h - pin.y / 100 * map.h;
        pin.rot = this._normalizeFootprintRot(Math.atan2(dy, dx) * 180 / Math.PI + 90);
        this.syncDevFootprintSliders();
        this.applyFootprintPins();
    }

    _footprintImagePercent(clientX, clientY) {
        this._fitFootprintLayer();
        const layer = document.querySelector('.footprint-layer');
        if (!layer) return null;
        const rect = layer.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return null;
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
        return {
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10
        };
    }

    _setFootprintPinXY(key, x, y, { persist = false } = {}) {
        if (!this.footprintPins || !this.footprintPins[key]) return;
        this.footprintPins[key].x = x;
        this.footprintPins[key].y = y;
        if (persist) this._saveFootprintPins();
        this.syncDevFootprintSliders();
        this.applyFootprintPins();
    }

    _footprintPinEdges(pin) {
        const w = Number(pin.w) || 8;
        const left = Math.round((pin.x - w / 2) * 10) / 10;
        const right = Math.round((pin.x + w / 2) * 10) / 10;
        return { left, right };
    }

    _setFootprintPinEdges(key, { left, right } = {}) {
        if (!this._isFootprintGlowPin(key)) return;
        const pin = this.footprintPins && this.footprintPins[key];
        if (!pin) return;
        const minW = 6;
        const current = this._footprintPinEdges(pin);
        let nextLeft = left != null ? Number(left) : current.left;
        let nextRight = right != null ? Number(right) : current.right;
        nextLeft = Math.max(0, Math.min(100 - minW, nextLeft));
        nextRight = Math.max(nextLeft + minW, Math.min(100, nextRight));
        pin.w = Math.round((nextRight - nextLeft) * 10) / 10;
        pin.x = Math.round((nextLeft + pin.w / 2) * 10) / 10;
        this.syncDevFootprintSliders();
        this.applyFootprintPins();
    }

    applyDevPanelSide() {
        const panel = document.getElementById('dev-orientation-panel');
        if (!panel) return;
        const side = this.devPanelSide === 'left' ? 'left' : 'right';
        this.devPanelSide = side;
        panel.classList.toggle('is-left', side === 'left');
        try {
            window.localStorage.setItem('tabuk-dev-panel-side', side);
        } catch (err) {
            /* ignore */
        }
    }

    applyFootprintPins() {
        if (!this.footprintPins) this.footprintPins = this._loadFootprintPins();
        this._fitFootprintLayer();
        const pins = this.footprintPins;
        const selected = this.footprintPinKey || 'ksa';

        ['ksa', 'gulf', 'nafrica'].forEach((key) => {
            const pin = pins[key];
            const glow = document.querySelector(`.footprint-glow[data-foot-pin="${key}"]`);
            if (!glow || !pin) return;
            glow.style.left = `${pin.x - pin.w / 2}%`;
            glow.style.top = `${pin.y - pin.h / 2}%`;
            glow.style.width = `${pin.w}%`;
            glow.style.height = `${pin.h}%`;
            glow.style.setProperty('--foot-rot', `${Number(pin.rot) || 0}deg`);
            glow.classList.toggle('is-selected-glow', selected === key);
        });

        const origin = pins.origin;
        ['r1', 'r2', 'r3'].forEach((key) => {
            const end = pins[key];
            const path = document.querySelector(`.footprint-route[data-foot-route="${key}"]`);
            if (!path || !origin || !end) return;
            path.setAttribute('d', `M${origin.x} ${origin.y} L${end.x} ${end.y}`);
        });

        document.querySelectorAll('[data-foot-handle]').forEach((handle) => {
            const key = handle.getAttribute('data-foot-handle');
            const pin = pins[key];
            if (!pin) return;
            handle.style.left = `${pin.x}%`;
            handle.style.top = `${pin.y}%`;
            handle.classList.toggle('is-selected', selected === key);
            handle.classList.toggle('is-dragging', this._footprintDragKey === key && !this._footprintDragEdge);
        });

        const selectedPin = pins[selected];
        const showEdges = this._isFootprintGlowPin(selected) && selectedPin;
        const edges = showEdges ? this._footprintPinEdges(selectedPin) : null;
        document.querySelectorAll('[data-foot-edge]').forEach((handle) => {
            const edge = handle.getAttribute('data-foot-edge');
            handle.style.visibility = showEdges ? 'visible' : 'hidden';
            if (!edges) return;
            let point = { x: selectedPin.x, y: selectedPin.y };
            if (edge === 'left') point = { x: edges.left, y: selectedPin.y };
            if (edge === 'right') point = { x: edges.right, y: selectedPin.y };
            if (edge === 'rot') point = { x: selectedPin.x, y: selectedPin.y - selectedPin.h / 2 };
            point = this._rotateAroundPin(selectedPin, point.x, point.y);
            handle.style.left = `${point.x}%`;
            handle.style.top = `${point.y}%`;
        });
    }

    syncDevFootprintSliders() {
        if (!this.footprintPins) this.footprintPins = this._loadFootprintPins();
        const key = this.footprintPinKey || 'ksa';
        const pin = this.footprintPins[key];
        if (!pin) return;
        const pinSelect = document.getElementById('dev-foot-pin');
        const leftEl = document.getElementById('dev-foot-left');
        const rightEl = document.getElementById('dev-foot-right');
        const xEl = document.getElementById('dev-foot-x');
        const yEl = document.getElementById('dev-foot-y');
        const hEl = document.getElementById('dev-foot-h');
        const rotEl = document.getElementById('dev-foot-rot');
        const leftVal = document.getElementById('dev-foot-left-val');
        const rightVal = document.getElementById('dev-foot-right-val');
        const xVal = document.getElementById('dev-foot-x-val');
        const yVal = document.getElementById('dev-foot-y-val');
        const hVal = document.getElementById('dev-foot-h-val');
        const rotVal = document.getElementById('dev-foot-rot-val');
        const isGlow = this._isFootprintGlowPin(key);
        const edges = isGlow ? this._footprintPinEdges(pin) : { left: pin.x, right: pin.x };
        if (pinSelect && pinSelect.value !== key) pinSelect.value = key;
        if (leftEl) {
            leftEl.disabled = !isGlow;
            if (isGlow) leftEl.value = String(edges.left);
        }
        if (rightEl) {
            rightEl.disabled = !isGlow;
            if (isGlow) rightEl.value = String(edges.right);
        }
        if (xEl) xEl.value = String(pin.x);
        if (yEl) yEl.value = String(pin.y);
        if (leftVal) leftVal.textContent = isGlow ? `${edges.left}%` : '—';
        if (rightVal) rightVal.textContent = isGlow ? `${edges.right}%` : '—';
        if (xVal) xVal.textContent = `${pin.x}%`;
        if (yVal) yVal.textContent = `${pin.y}%`;
        if (hEl) {
            hEl.disabled = !isGlow;
            if (isGlow) hEl.value = String(pin.h);
        }
        if (hVal) hVal.textContent = isGlow ? `${pin.h}%` : '—';
        if (rotEl) {
            rotEl.disabled = !isGlow;
            if (isGlow) rotEl.value = String(pin.rot || 0);
        }
        if (rotVal) rotVal.textContent = isGlow ? `${pin.rot || 0}°` : '—';
    }

    bindDevFootprintPins() {
        this.footprintPins = this._loadFootprintPins();
        if (!this.footprintPins[this.footprintPinKey]) this.footprintPinKey = 'ksa';
        this._footprintDragKey = null;
        this._footprintDragEdge = null;
        try {
            const savedSide = window.localStorage.getItem('tabuk-dev-panel-side');
            if (savedSide === 'left' || savedSide === 'right') this.devPanelSide = savedSide;
        } catch (err) {
            /* keep default */
        }
        this.applyDevPanelSide();

        const pinSelect = document.getElementById('dev-foot-pin');
        const leftEl = document.getElementById('dev-foot-left');
        const rightEl = document.getElementById('dev-foot-right');
        const xEl = document.getElementById('dev-foot-x');
        const yEl = document.getElementById('dev-foot-y');
        const hEl = document.getElementById('dev-foot-h');
        const rotEl = document.getElementById('dev-foot-rot');
        const resetBtn = document.getElementById('dev-foot-reset');
        const panelLeftBtn = document.getElementById('dev-panel-left');
        const panelRightBtn = document.getElementById('dev-panel-right');
        const wrap = document.querySelector('.footprint-map-wrap');
        const map = document.querySelector('.footprint-map');

        const applyFromSliders = (edge) => {
            const key = pinSelect ? pinSelect.value : this.footprintPinKey;
            this.footprintPinKey = key;
            const pin = this.footprintPins[key];
            if (!pin) return;
            if (this._isFootprintGlowPin(key) && (edge === 'left' || edge === 'right')) {
                this._setFootprintPinEdges(key, {
                    left: leftEl ? Number(leftEl.value) : undefined,
                    right: rightEl ? Number(rightEl.value) : undefined
                });
            } else {
                if (xEl) pin.x = Number(xEl.value);
                if (yEl) pin.y = Number(yEl.value);
                if (this._isFootprintGlowPin(key) && hEl) pin.h = Number(hEl.value);
                if (this._isFootprintGlowPin(key) && rotEl) pin.rot = this._normalizeFootprintRot(rotEl.value);
                this.syncDevFootprintSliders();
                this.applyFootprintPins();
            }
            this._saveFootprintPins();
            this.updateDevOrientationReadout();
        };

        if (pinSelect) {
            pinSelect.addEventListener('change', () => {
                this.footprintPinKey = pinSelect.value;
                this.syncDevFootprintSliders();
                this.applyFootprintPins();
            });
        }
        if (leftEl) leftEl.addEventListener('input', () => applyFromSliders('left'));
        if (rightEl) rightEl.addEventListener('input', () => applyFromSliders('right'));
        if (xEl) xEl.addEventListener('input', () => applyFromSliders('x'));
        if (yEl) yEl.addEventListener('input', () => applyFromSliders('y'));
        if (hEl) hEl.addEventListener('input', () => applyFromSliders('h'));
        if (rotEl) rotEl.addEventListener('input', () => applyFromSliders('rot'));
        if (panelLeftBtn) {
            panelLeftBtn.addEventListener('click', () => {
                this.devPanelSide = 'left';
                this.applyDevPanelSide();
            });
        }
        if (panelRightBtn) {
            panelRightBtn.addEventListener('click', () => {
                this.devPanelSide = 'right';
                this.applyDevPanelSide();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.footprintPins = this._cloneFootprintPins();
                this._saveFootprintPins();
                this.syncDevFootprintSliders();
                this.applyFootprintPins();
                this.updateDevOrientationReadout();
            });
        }

        if (map) {
            map.addEventListener('load', () => this.applyFootprintPins());
        }
        const wrapEl = document.querySelector('.footprint-map-wrap');
        if (wrapEl && typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => this.applyFootprintPins());
            ro.observe(wrapEl);
        }
        const beatsEl = document.querySelector('.timeline-beats');
        if (beatsEl && typeof ResizeObserver !== 'undefined') {
            const lineRo = new ResizeObserver(() => this._alignTimelineLineSoon());
            lineRo.observe(beatsEl);
        }
        window.addEventListener('resize', () => {
            this._alignTimelineLine();
            if (document.querySelector('.timeline-cinematic.is-footprint')) {
                this.applyFootprintPins();
            }
        });

        if (wrap) {
            wrap.addEventListener('pointerdown', (e) => {
                if (!this.devPanelOpen) return;
                const overlay = document.getElementById('timeline-cinematic-overlay');
                if (!overlay || !overlay.classList.contains('is-footprint')) return;
                const edgeHandle = e.target.closest('[data-foot-edge]');
                if (edgeHandle) {
                    this._footprintDragKey = this.footprintPinKey;
                    this._footprintDragEdge = edgeHandle.getAttribute('data-foot-edge');
                    if (edgeHandle.setPointerCapture) edgeHandle.setPointerCapture(e.pointerId);
                    e.preventDefault();
                    return;
                }
                const handle = e.target.closest('[data-foot-handle]');
                if (handle) {
                    this.footprintPinKey = handle.getAttribute('data-foot-handle');
                    if (pinSelect) pinSelect.value = this.footprintPinKey;
                    this.syncDevFootprintSliders();
                    this._footprintDragKey = this.footprintPinKey;
                    this._footprintDragEdge = null;
                    this.applyFootprintPins();
                    if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
                    e.preventDefault();
                    return;
                }
                const pt = this._footprintImagePercent(e.clientX, e.clientY);
                if (!pt) return;
                this._footprintDragKey = this.footprintPinKey;
                this._footprintDragEdge = null;
                this._setFootprintPinXY(this.footprintPinKey, pt.x, pt.y);
                e.preventDefault();
            });
        }

        window.addEventListener('pointermove', (e) => {
            if (!this._footprintDragKey) return;
            const pt = this._footprintImagePercent(e.clientX, e.clientY);
            if (!pt) return;
            if (this._footprintDragEdge === 'rot') {
                this._setFootprintPinRotFromPoint(this._footprintDragKey, pt);
                return;
            }
            if (this._footprintDragEdge === 'left' || this._footprintDragEdge === 'right') {
                this._setFootprintPinEdges(this._footprintDragKey, {
                    [this._footprintDragEdge]: pt.x
                });
                return;
            }
            this._setFootprintPinXY(this._footprintDragKey, pt.x, pt.y);
        });

        window.addEventListener('pointerup', () => {
            if (!this._footprintDragKey && !this._footprintDragEdge) return;
            this._footprintDragKey = null;
            this._footprintDragEdge = null;
            this._saveFootprintPins();
            this.applyFootprintPins();
            this.updateDevOrientationReadout();
        });

        this.syncDevFootprintSliders();
        this.applyFootprintPins();
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
            this.syncDevFootprintSliders();
            this.applyFootprintPins();
            this.applyDevPanelSide();
            this._updateDevSlideLabel();
        }
        this._syncDevSlideNavVisibility();
        this._syncDevFootprintClass();
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

    persistAvatarImageSettings(id, { worldHeight, worldWidth, radius, worldRot }) {
        const scene = window.COURSE_DATA.scenes[this.currentSceneId];
        if (!scene || !scene.hotspots) return;
        const source = scene.hotspots.find((h) => h.id === id);
        const live = this.hotspots ? this.hotspots.getHotspotById(id) : null;
        [source, live].forEach((h) => {
            if (!h) return;
            if (typeof worldHeight === 'number') h.worldHeight = worldHeight;
            if (typeof worldWidth === 'number') h.worldWidth = worldWidth;
            if (typeof radius === 'number') h.radius = radius;
            if (typeof worldRot === 'number') h.worldRot = worldRot;
        });
    }

    persistTabletLabelOffset(id, { labelOffsetY, labelOffsetX, playOffsetY }) {
        const scene = window.COURSE_DATA.scenes[this.currentSceneId];
        if (!scene || !scene.hotspots) return;
        const source = scene.hotspots.find((h) => h.id === id);
        const live = this.hotspots ? this.hotspots.getHotspotById(id) : null;
        [source, live].forEach((h) => {
            if (!h) return;
            if (typeof labelOffsetY === 'number') h.labelOffsetY = labelOffsetY;
            if (typeof labelOffsetX === 'number') h.labelOffsetX = labelOffsetX;
            if (typeof playOffsetY === 'number') h.playOffsetY = playOffsetY;
        });
    }

    persistArrowPromptOffset(id, { promptOffsetY, arrowScale } = {}) {
        const scene = window.COURSE_DATA.scenes[this.currentSceneId];
        if (!scene || !scene.hotspots) return;
        const source = scene.hotspots.find((h) => h.id === id);
        const live = this.hotspots ? this.hotspots.getHotspotById(id) : null;
        [source, live].forEach((h) => {
            if (!h || h.type !== 'portal') return;
            if (typeof promptOffsetY === 'number') h.promptOffsetY = promptOffsetY;
            if (typeof arrowScale === 'number') h.arrowScale = arrowScale;
        });
    }

    persistAvatarNameTagSettings(id, { pitch, yaw, rot }) {
        const scene = window.COURSE_DATA.scenes[this.currentSceneId];
        if (!scene || !scene.hotspots) return;
        const source = scene.hotspots.find((h) => h.id === id);
        const live = this.hotspots ? this.hotspots.getHotspotById(id) : null;
        [source, live].forEach((h) => {
            if (!h) return;
            if (typeof pitch === 'number') h.pitch = pitch;
            if (typeof yaw === 'number') h.yaw = yaw;
            if (typeof rot === 'number') h.rot = rot;
        });
    }

    _round1(n) {
        return Math.round(Number(n) * 10) / 10;
    }

    persistScreenOverlaySettings(id) {
        const scene = window.COURSE_DATA.scenes[this.currentSceneId];
        if (!scene || !scene.screenOverlays) return;
        const live = this.viewer.getScreenOverlaySettings(id);
        if (!live) return;
        const source = scene.screenOverlays.find((o) => o.id === id);
        if (!source) return;
        const roundCorner = (c) => ({
            pitch: this._round1(c.pitch),
            yaw: this._round1(c.yaw)
        });
        source.radius = this._round1(live.radius);
        source.corners = {
            tl: roundCorner(live.corners.tl),
            tr: roundCorner(live.corners.tr),
            br: roundCorner(live.corners.br),
            bl: roundCorner(live.corners.bl)
        };
    }

    getSelectedAvatarHotspotId() {
        const hotSelect = document.getElementById('dev-hotspot-select');
        if (!hotSelect || !hotSelect.value || !this.hotspots) return null;
        const h = this.hotspots.getHotspotById(hotSelect.value);
        // Avatars + glued tablet/monitor props share the same size controls
        if (h && (h.type === 'avatar' || h.glue)) return h.id;
        const avatar = (this.hotspots.hotspots || []).find((x) => x.type === 'avatar' || x.glue);
        return avatar ? avatar.id : null;
    }

    getNameTagHotspotId() {
        if (!this.hotspots) return null;
        const named = (this.hotspots.hotspots || []).find((x) => x.type === 'nametag');
        return named ? named.id : null;
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
            const kind = h.type === 'avatar'
                ? 'image'
                : h.type === 'nametag'
                    ? 'name'
                    : h.glue
                        ? 'tablet'
                        : (h.type || 'hotspot');
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
        this.loadNameTagSettingsIntoDevSliders();
        this.loadTabletLabelOffsetIntoDevSliders();
        this.loadArrowPromptGapIntoDevSliders();
        this.refreshDevScreenOverlayList();
    }

    refreshDevScreenOverlayList() {
        const screenSelect = document.getElementById('dev-screen-select');
        if (!screenSelect || !this.viewer) return;
        const scene = window.COURSE_DATA.scenes[this.currentSceneId];
        const list = (scene && scene.screenOverlays) || [];
        const prev = screenSelect.value;
        screenSelect.innerHTML = '';

        if (!list.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '(no TV overlay in this scene)';
            screenSelect.appendChild(opt);
            screenSelect.disabled = true;
            return;
        }

        screenSelect.disabled = false;
        list.forEach((o) => {
            const opt = document.createElement('option');
            opt.value = o.id;
            opt.textContent = o.id;
            screenSelect.appendChild(opt);
        });
        if (prev && list.some((o) => o.id === prev)) {
            screenSelect.value = prev;
        }
        this.loadScreenOverlayIntoDevSliders();
    }

    loadScreenOverlayIntoDevSliders() {
        const screenSelect = document.getElementById('dev-screen-select');
        const screenCorner = document.getElementById('dev-screen-corner');
        const screenPitch = document.getElementById('dev-screen-pitch');
        const screenYaw = document.getElementById('dev-screen-yaw');
        const screenRadius = document.getElementById('dev-screen-radius');
        if (!screenSelect || !screenSelect.value || !screenCorner || !screenPitch || !screenYaw) return;

        const live = this.viewer.getScreenOverlaySettings(screenSelect.value);
        if (!live) return;
        const corner = screenCorner.value || 'tl';
        const c = live.corners[corner] || { pitch: 0, yaw: 0 };
        const pitch = this._round1(c.pitch);
        const yaw = this._round1(((c.yaw % 360) + 360) % 360);
        const radius = this._round1(live.radius || 480);

        screenPitch.value = String(pitch);
        screenYaw.value = String(yaw);
        if (screenRadius) screenRadius.value = String(radius);

        const pVal = document.getElementById('dev-screen-pitch-val');
        const yVal = document.getElementById('dev-screen-yaw-val');
        const rVal = document.getElementById('dev-screen-radius-val');
        if (pVal) pVal.textContent = `${pitch.toFixed(1)}°`;
        if (yVal) yVal.textContent = `${yaw.toFixed(1)}°`;
        if (rVal) rVal.textContent = radius.toFixed(1);
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
        this.loadTabletLabelOffsetIntoDevSliders();
        this.loadArrowPromptGapIntoDevSliders();
    }

    loadArrowPromptGapIntoDevSliders() {
        const hotSelect = document.getElementById('dev-hotspot-select');
        const promptGap = document.getElementById('dev-prompt-gap');
        const arrowScaleEl = document.getElementById('dev-arrow-scale');
        const gVal = document.getElementById('dev-prompt-gap-val');
        const sVal = document.getElementById('dev-arrow-scale-val');
        if (!promptGap && !arrowScaleEl) return;

        const h = hotSelect && hotSelect.value && this.hotspots
            ? this.hotspots.getHotspotById(hotSelect.value)
            : null;
        const isPortal = !!(h && h.type === 'portal');
        if (promptGap) promptGap.disabled = !isPortal;
        if (arrowScaleEl) arrowScaleEl.disabled = !isPortal;

        const promptOffsetY = isPortal && typeof h.promptOffsetY === 'number' ? h.promptOffsetY : 6;
        const arrowScale = isPortal && typeof h.arrowScale === 'number' ? h.arrowScale : 1;
        if (promptGap) promptGap.value = String(Math.round(promptOffsetY));
        if (arrowScaleEl) arrowScaleEl.value = String(Math.round(arrowScale * 100));
        if (gVal) gVal.textContent = `${Math.round(promptOffsetY)}px`;
        if (sVal) sVal.textContent = `${Math.round(arrowScale * 100)}%`;
    }

    loadTabletLabelOffsetIntoDevSliders() {
        const hotSelect = document.getElementById('dev-hotspot-select');
        const labelY = document.getElementById('dev-label-y');
        const labelX = document.getElementById('dev-label-x');
        const playY = document.getElementById('dev-play-y');
        const yVal = document.getElementById('dev-label-y-val');
        const xVal = document.getElementById('dev-label-x-val');
        const pVal = document.getElementById('dev-play-y-val');
        if (!labelY || !labelX) return;

        const h = hotSelect && hotSelect.value && this.hotspots
            ? this.hotspots.getHotspotById(hotSelect.value)
            : null;
        const isTablet = !!(h && (h.icon === 'monitor' || h.icon === 'ipad' || h.glue));
        labelY.disabled = !isTablet;
        labelX.disabled = !isTablet;
        if (playY) playY.disabled = !isTablet;

        const labelOffsetY = isTablet && typeof h.labelOffsetY === 'number' ? h.labelOffsetY : -36;
        const labelOffsetX = isTablet && typeof h.labelOffsetX === 'number' ? h.labelOffsetX : 0;
        const playOffsetY = isTablet && typeof h.playOffsetY === 'number' ? h.playOffsetY : -48;
        labelY.value = String(Math.round(labelOffsetY));
        labelX.value = String(Math.round(labelOffsetX));
        if (playY) playY.value = String(Math.round(playOffsetY));
        if (yVal) yVal.textContent = `${Math.round(labelOffsetY)}px`;
        if (xVal) xVal.textContent = `${Math.round(labelOffsetX)}px`;
        if (pVal) pVal.textContent = `${Math.round(playOffsetY)}px`;
    }

    loadAvatarImageSettingsIntoDevSliders() {
        const id = this.getSelectedAvatarHotspotId();
        const heightEl = document.getElementById('dev-avatar-height');
        const widthEl = document.getElementById('dev-avatar-width');
        const radiusEl = document.getElementById('dev-avatar-radius');
        const rotEl = document.getElementById('dev-avatar-rot');
        if (!heightEl || !widthEl || !radiusEl) return;

        const h = id && this.hotspots ? this.hotspots.getHotspotById(id) : null;
        const live = id && this.viewer ? this.viewer.getSceneAvatarSettings(id) : null;
        const worldHeight = (live && live.worldHeight) || (h && h.worldHeight) || 150;
        const worldWidth = (live && live.worldWidth) || (h && h.worldWidth) || Math.round(worldHeight * 0.35);
        const radius = (live && live.radius) || (h && h.radius) || 430;
        const worldRot = (live && typeof live.worldRot === 'number')
            ? live.worldRot
            : ((h && typeof h.worldRot === 'number') ? h.worldRot : 0);

        heightEl.value = String(Math.round(worldHeight));
        widthEl.value = String(Math.round(worldWidth));
        radiusEl.value = String(Math.round(radius));
        if (rotEl) rotEl.value = String(Math.round(worldRot));
        const hVal = document.getElementById('dev-avatar-height-val');
        const wVal = document.getElementById('dev-avatar-width-val');
        const rVal = document.getElementById('dev-avatar-radius-val');
        const rotVal = document.getElementById('dev-avatar-rot-val');
        if (hVal) hVal.textContent = String(Math.round(worldHeight));
        if (wVal) wVal.textContent = String(Math.round(worldWidth));
        if (rVal) rVal.textContent = String(Math.round(radius));
        if (rotVal) rotVal.textContent = `${Math.round(worldRot)}°`;
    }

    loadNameTagSettingsIntoDevSliders() {
        const id = this.getNameTagHotspotId();
        const pitchEl = document.getElementById('dev-name-pitch');
        const yawEl = document.getElementById('dev-name-yaw');
        const rotEl = document.getElementById('dev-name-rot');
        if (!pitchEl || !yawEl) return;

        const h = id && this.hotspots ? this.hotspots.getHotspotById(id) : null;
        const pitch = (h && typeof h.pitch === 'number') ? h.pitch : -18;
        const yaw = ((Math.round((h && h.yaw) || 128) % 360) + 360) % 360;
        const rot = (h && typeof h.rot === 'number') ? h.rot : 0;

        pitchEl.value = String(Math.round(pitch));
        yawEl.value = String(yaw);
        if (rotEl) rotEl.value = String(Math.round(rot));
        const pVal = document.getElementById('dev-name-pitch-val');
        const yVal = document.getElementById('dev-name-yaw-val');
        const rVal = document.getElementById('dev-name-rot-val');
        if (pVal) pVal.textContent = `${Math.round(pitch)}°`;
        if (yVal) yVal.textContent = `${yaw}°`;
        if (rVal) rVal.textContent = `${Math.round(rot)}°`;
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
                            `, radius ${Math.round(s.radius || live.radius || 430)}` +
                            `, worldRot ${Math.round(typeof s.worldRot === 'number' ? s.worldRot : (live.worldRot || 0))}`
                        );
                    }
                    if (live && live.glue) {
                        const s = this.viewer.getSceneAvatarSettings(h.id) || {};
                        return (
                            `  - ${h.id}: pitch ${h.pitch}, yaw ${h.yaw}` +
                            `, worldHeight ${Math.round(s.worldHeight || live.worldHeight || 95)}` +
                            `, worldWidth ${Math.round(s.worldWidth || live.worldWidth || 92)}` +
                            `, radius ${Math.round(s.radius || live.radius || 355)}` +
                            `, worldRot ${Math.round(typeof s.worldRot === 'number' ? s.worldRot : (live.worldRot || 0))}` +
                            `, playOffsetY ${Math.round(typeof live.playOffsetY === 'number' ? live.playOffsetY : -48)}` +
                            `, labelOffsetY ${Math.round(typeof live.labelOffsetY === 'number' ? live.labelOffsetY : -36)}` +
                            `, labelOffsetX ${Math.round(typeof live.labelOffsetX === 'number' ? live.labelOffsetX : 0)}`
                        );
                    }
                    if (live && live.type === 'nametag') {
                        return `  - ${h.id}: pitch ${h.pitch}, yaw ${h.yaw}, rot ${Math.round(live.rot || 0)}`;
                    }
                    if (live && live.type === 'portal') {
                        const gap = typeof live.promptOffsetY === 'number' ? live.promptOffsetY : 6;
                        const scale = typeof live.arrowScale === 'number' ? live.arrowScale : 1;
                        return (
                            `  - ${h.id}: pitch ${h.pitch}, yaw ${h.yaw}` +
                            `, promptOffsetY ${Math.round(gap)}` +
                            `, arrowScale ${Math.round(scale * 100) / 100}`
                        );
                    }
                    return `  - ${h.id}: pitch ${h.pitch}, yaw ${h.yaw}`;
                }).join('\n')
                : '  (none)';
            const screenSelect = document.getElementById('dev-screen-select');
            const screenId = screenSelect && screenSelect.value;
            const screenLive = screenId ? this.viewer.getScreenOverlaySettings(screenId) : null;
            const fmt1 = (n) => this._round1(n).toFixed(1);
            const screenLines = screenLive
                ? (
                    `screenOverlays:\n` +
                    `  - ${screenLive.id}: radius ${fmt1(screenLive.radius)}\n` +
                    `    tl: pitch ${fmt1(screenLive.corners.tl.pitch)}, yaw ${fmt1(screenLive.corners.tl.yaw)}\n` +
                    `    tr: pitch ${fmt1(screenLive.corners.tr.pitch)}, yaw ${fmt1(screenLive.corners.tr.yaw)}\n` +
                    `    br: pitch ${fmt1(screenLive.corners.br.pitch)}, yaw ${fmt1(screenLive.corners.br.yaw)}\n` +
                    `    bl: pitch ${fmt1(screenLive.corners.bl.pitch)}, yaw ${fmt1(screenLive.corners.bl.yaw)}\n`
                )
                : 'screenOverlays: (none)\n';
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
                screenLines +
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
            const pins = this.footprintPins || this._loadFootprintPins();
            const pinLines = Object.keys(this._footprintPinDefaults()).map((key) => {
                const p = pins[key];
                if (!p) return `  ${key}: (missing)`;
                if (this._isFootprintGlowPin(key)) {
                    const edges = this._footprintPinEdges(p);
                    return `  ${key}: { left: ${edges.left}, right: ${edges.right}, x: ${p.x}, y: ${p.y}, w: ${p.w}, h: ${p.h}, rot: ${p.rot || 0} }`;
                }
                return `  ${key}: { x: ${p.x}, y: ${p.y} }`;
            }).join('\n');
            pre.textContent += `\nfootprintPins:\n${pinLines}`;
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
                if (h.id === 'video_welcome') {
                    return { ...h, hidden: this.receptionRightArrived };
                }
                if (h.id === 'video_chro_welcome') {
                    return { ...h, hidden: !this.receptionChroUnlocked || this.receptionRightArrived };
                }
                // Guide, name, and left arrow stay as they were until the right 360
                if (h.id === 'enter_hq') {
                    return { ...h, hidden: this.receptionRightArrived, locked: true };
                }
                if (h.id === 'reception_right_video') {
                    // Hide TV play once Who We Are cinematic is done (VMV entry arrow takes over)
                    return {
                        ...h,
                        hidden: !this.receptionRightArrived || this.receptionVmvEntryUnlocked
                    };
                }
                // Right-reception arrow after CHRO close, before the lift
                if (h.id === 'next_reception_right') {
                    return {
                        ...h,
                        hidden: !this.receptionRightUnlocked || this.receptionRightArrived,
                        locked: !this.receptionRightUnlocked
                    };
                }
                // After Who We Are cinematic — arrow in 360 to open Vision / Mission / Values
                if (h.id === 'discover_what_guides') {
                    return {
                        ...h,
                        hidden: !this.receptionVmvEntryUnlocked || this.receptionLiftUnlocked,
                        locked: !this.receptionVmvEntryUnlocked
                    };
                }
                // Lift arrow only after the right-reception click
                if (h.id === 'next_destination') {
                    return {
                        ...h,
                        hidden: !this.receptionLiftUnlocked,
                        locked: !this.receptionLiftUnlocked
                    };
                }
                return { ...h };
            });
        }
        return hotspotList;
    }

    _visibleScreenOverlays(scene) {
        if (!scene) return [];
        return scene.screenOverlays || [];
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
        if (this.viewer && typeof this.viewer.syncScreenOverlays === 'function') {
            this.viewer.syncScreenOverlays(this._visibleScreenOverlays(scene));
        }
        this.updateHUD(scene);
        this.syncDevOrientationPanel();
        if (this.devPanelOpen) this.refreshDevScreenOverlayList();
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
        if (!profile) return;

        if (profile.id === 'ceo') {
            if (this.receptionChroUnlocked) return;
            // Unlock CHRO on any CEO close (even before video ends)
            this.startChroIntroSequence();
            return;
        }

        if (profile.id === 'chro') {
            // Right-reception arrow after CHRO close (even if closed early)
            this.unlockReceptionRightHotspot();
        }
    }

    unlockReceptionRightHotspot() {
        if (this.receptionRightUnlocked) return;
        this.receptionRightUnlocked = true;
        if (this.currentSceneId !== 'reception' || !this.hotspots) return;

        const scene = window.COURSE_DATA.scenes.reception;
        if (scene) {
            this.hotspots.setHotspots(this._buildHotspotList(scene));
        }
        if (this.devPanelOpen) {
            this.refreshDevHotspotList();
        }
        // Slide 8 — post-CHRO bridge tip before Who We Are
        this.showReceptionTip(
            'Discover our story and our presence across the region.<br><em>Follow the arrow to discover who we are.</em>',
            { showAvatar: false }
        );
        this._speakCinematicLine(
            'Now that you have heard from our leaders, let\'s take a closer look at Tabuk. Follow the arrow to discover our story and our presence across the region.'
        );
    }

    revealReceptionRightArrival() {
        this.receptionRightArrived = true;
        // Lift stays locked until Vision/Mission/Values completes (slide 35).
        const scene = window.COURSE_DATA.scenes.reception;
        if (!scene || this.currentSceneId !== 'reception' || !this.hotspots) return;

        this.hotspots.setHotspots(this._buildHotspotList(scene));
        if (this.viewer && typeof this.viewer.syncScreenOverlays === 'function') {
            this.viewer.syncScreenOverlays(this._visibleScreenOverlays(scene));
        }
        if (this.devPanelOpen) {
            this.refreshDevHotspotList();
            this.refreshDevScreenOverlayList();
        }
        this.syncDevOrientationPanel();
        // Slide 9 — prompt to play Who We Are on the TV
        this.showReceptionTip('Click Play to discover who we are.', { showAvatar: false });
    }

    openValuesExperienceFromPoster() {
        const overlay = document.getElementById('timeline-cinematic-overlay');
        const poster = document.getElementById('vmv-poster-hotspot');
        const start = () => {
            this.hideTimelineCinematic({ restoreScene: false });
            if (this.valuesExperience) this.valuesExperience.open({ start: 'vision' });
        };
        if (overlay && poster && !poster.hidden) {
            overlay.classList.add('is-poster-expand');
            setTimeout(start, 520);
            return;
        }
        start();
    }

    unlockLiftHotspot() {
        if (this.receptionLiftUnlocked) return;
        this.receptionLiftUnlocked = true;
        if (this.currentSceneId !== 'reception' || !this.hotspots) return;

        const scene = window.COURSE_DATA.scenes.reception;
        if (scene) {
            this.hotspots.setHotspots(this._buildHotspotList(scene));
        }
        if (this.devPanelOpen) {
            this.refreshDevHotspotList();
        }
    }

    /**
     * Plays hotspot.transitionVideo as a 360 panorama (e.g. Lift_4k.mov).
     * Stays on that 360 — does not auto-advance to another scene.
     */
    playPortalTransitionVideo(hotspot) {
        if (!hotspot || !hotspot.transitionVideo) return;
        if (this._sceneTransitioning || (this.viewer && this.viewer.isTransitioning())) return;

        this._sceneTransitioning = true;
        this.hotspots.setHotspots([]);
        // Drop glued TV / screen overlays so they don't stick onto the lift 360
        if (this.viewer && typeof this.viewer.syncScreenOverlays === 'function') {
            this.viewer.syncScreenOverlays([]);
        }
        this.hideReceptionTip();
        this.stopWelcomeEnterAudio();
        this.stopCeoIntroAudio();
        this.stopChroIntroAudio();

        const stayInScene = !!hotspot.stayInScene;
        const arriveAtTargetScene = () => {
            this._sceneTransitioning = false;
            if (stayInScene) {
                this.revealReceptionRightArrival();
                return;
            }
            // Update scene state / HUD only — keep the lift 360 playing (no media swap)
            if (hotspot.targetScene) {
                this.currentSceneId = hotspot.targetScene;
                this.visitedScenes.add(hotspot.targetScene);
                const scene = window.COURSE_DATA.scenes[hotspot.targetScene];
                if (scene) {
                    // Lift 360 stay — no hotspots / no TV overlays
                    this.hotspots.setHotspots([]);
                    if (this.viewer && typeof this.viewer.syncScreenOverlays === 'function') {
                        this.viewer.syncScreenOverlays([]);
                    }
                    this.updateHUD(scene);
                    this.syncDevOrientationPanel();
                    if (this.devPanelOpen) this.refreshDevHotspotList();
                }
            }
        };

        const targetScene = !stayInScene && hotspot.targetScene
            ? window.COURSE_DATA.scenes[hotspot.targetScene]
            : window.COURSE_DATA.scenes[this.currentSceneId];
        const orient = targetScene
            ? this._sceneOrientation(targetScene)
            : {
                pitch: typeof hotspot.pitch === 'number' ? hotspot.pitch : 0,
                yaw: typeof hotspot.yaw === 'number' ? hotspot.yaw : 0,
                sphereYaw: 0
            };

        this.viewer.setMinZoom();
        this.viewer.loadVideo(
            hotspot.transitionVideo,
            (video) => {
                if (!video) {
                    console.warn('360 transition video failed');
                    this._sceneTransitioning = false;
                    if (stayInScene) this.revealReceptionRightArrival();
                    return;
                }
                // Keep looping on the lift — no auto jump to the next still scene
                video.loop = true;
                try {
                    video.currentTime = 0;
                    const playPromise = video.play();
                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch(() => { /* ignore autoplay block */ });
                    }
                } catch (e) { /* ignore */ }
                arriveAtTargetScene();
            },
            {
                loop: true,
                muted: true,
                sphereYaw: orient.sphereYaw,
                targetPitch: orient.pitch,
                targetYaw: orient.yaw,
                targetFov: this.viewer.maxFov
            }
        );
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
            // Reset reception progress when leaving so revisit starts with CEO again
            this.receptionChroUnlocked = false;
            this.receptionRightUnlocked = false;
            this.receptionRightArrived = false;
            this.receptionVmvEntryUnlocked = false;
            this.receptionLiftUnlocked = false;
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

    _alignTimelineLine() {
        const overlay = document.getElementById('timeline-cinematic-overlay');
        const beats = document.querySelector('.timeline-beats');
        const line = document.querySelector('.timeline-line-draw');
        const dots = overlay ? [...overlay.querySelectorAll('.timeline-node-dot')] : [];
        if (!overlay || overlay.hidden || !beats || !line || dots.length < 2) return;
        const br = beats.getBoundingClientRect();
        const first = dots[0].getBoundingClientRect();
        const last = dots[dots.length - 1].getBoundingClientRect();
        if (br.width < 2 || first.width < 2 || last.width < 2) return;
        const x1 = first.left + first.width / 2 - br.left;
        const x2 = last.left + last.width / 2 - br.left;
        line.style.left = `${Math.round(x1)}px`;
        line.style.right = 'auto';
        line.style.width = `${Math.max(0, Math.round(x2 - x1))}px`;
        line.style.top = '';
    }

    _alignTimelineLineSoon() {
        this._alignTimelineLine();
        requestAnimationFrame(() => {
            this._alignTimelineLine();
            requestAnimationFrame(() => this._alignTimelineLine());
        });
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => this._alignTimelineLine());
        }
        clearTimeout(this._timelineLineAlignTimer);
        this._timelineLineAlignTimer = setTimeout(() => this._alignTimelineLine(), 120);
    }

    showTimelineCinematic() {
        const overlay = document.getElementById('timeline-cinematic-overlay');
        if (!overlay) return;

        this._clearTimelineBeats();
        this.hideReceptionTip();
        this.stopCeoIntroAudio();
        this.stopChroIntroAudio();
        this.stopTipAvatar();

        const hotspotsLayer = document.getElementById('hotspots-layer');
        const hud = document.getElementById('hud-layer');
        if (hotspotsLayer) hotspotsLayer.style.visibility = 'hidden';
        if (hud) hud.style.visibility = 'hidden';
        if (this.hotspots) this.hotspots.setHotspots([]);
        if (this.viewer && typeof this.viewer.syncScreenOverlays === 'function') {
            this.viewer.syncScreenOverlays([]);
        }

        const valuesEntry = document.getElementById('values-entry-arrow');
        if (valuesEntry) valuesEntry.hidden = true;
        const posterHotspot = document.getElementById('vmv-poster-hotspot');
        if (posterHotspot) posterHotspot.hidden = true;

        overlay.hidden = false;
        overlay.className = 'timeline-cinematic';
        this._alignTimelineLineSoon();
        overlay.querySelectorAll('.people-purpose-photo, .footprint-map').forEach((photo) => {
            const path = photo.getAttribute('src') || '';
            const bare = path.split('?')[0];
            if (bare) photo.src = this.resolveMediaUrl(bare);
        });
        this.applyFootprintPins();
        requestAnimationFrame(() => {
            overlay.classList.add('is-open');
            this._alignTimelineLineSoon();
        });

        const beats = [
            { at: 240, cls: 'is-beat-1 is-node-1' },
            { at: 1500, cls: 'is-beat-2 is-node-2 is-draw-2' },
            { at: 2800, cls: 'is-beat-3 is-node-3 is-draw-3' },
            { at: 4100, cls: 'is-beat-4 is-node-4 is-draw-4' }
        ];
        beats.forEach(({ at, cls }) => {
            const id = setTimeout(() => overlay.classList.add(...cls.split(' ')), at);
            this._timelineBeatTimers.push(id);
        });

        this._speakCinematicLine(
            "What began as a family-led vision in Riyadh, KSA, has grown into a company committed to improving patients' lives across the region. At Tabuk, that sense of responsibility continues to guide how we work — with care, integrity, and a focus on quality.",
            () => this._revealPeoplePurposeScreen(overlay)
        );
    }

    hideTimelineCinematic(options = {}) {
        const restoreScene = options.restoreScene !== false;
        const overlay = document.getElementById('timeline-cinematic-overlay');
        this._clearTimelineBeats();
        this._stopCinematicSpeech();
        const valuesEntry = document.getElementById('values-entry-arrow');
        if (valuesEntry) valuesEntry.hidden = true;
        const posterHotspot = document.getElementById('vmv-poster-hotspot');
        if (posterHotspot) posterHotspot.hidden = true;
        if (overlay) {
            overlay.className = 'timeline-cinematic';
            overlay.hidden = true;
        }
        this._syncDevFootprintClass();
        if (!restoreScene) return;

        const hotspotsLayer = document.getElementById('hotspots-layer');
        const hud = document.getElementById('hud-layer');
        if (hotspotsLayer) hotspotsLayer.style.visibility = '';
        if (hud) hud.style.visibility = '';

        const scene = window.COURSE_DATA && window.COURSE_DATA.scenes[this.currentSceneId];
        if (scene && this.hotspots) {
            this.hotspots.setHotspots(this._buildHotspotList(scene));
            if (this.viewer && typeof this.viewer.syncScreenOverlays === 'function') {
                this.viewer.syncScreenOverlays(this._visibleScreenOverlays(scene));
            }
        }
    }

    _clearTimelineBeats() {
        (this._timelineBeatTimers || []).forEach((id) => clearTimeout(id));
        this._timelineBeatTimers = [];
    }

    _revealPeoplePurposeScreen(overlay) {
        if (!overlay || overlay.hidden) return;
        overlay.classList.add('is-people', 'is-people-beat-1');
        this._speakCinematicLine(
            'Every role here contributes to something bigger.',
            () => {
                if (!overlay || overlay.hidden) return;
                overlay.classList.add('is-people-beat-2');
                this._speakCinematicLine(
                    'Supporting patients, communities, and each other.',
                    () => this._revealFootprintScreen(overlay)
                );
            }
        );
    }

    _revealFootprintScreen(overlay) {
        if (!overlay || overlay.hidden) return;
        overlay.classList.add('is-footprint', 'is-foot-ksa');
        this.applyFootprintPins();
        this._syncDevFootprintClass();
        this._playFootprintTone(0);
        const lines = [
            {
                cls: 'is-foot-ksa',
                text: 'In Saudi Arabia, our core market, we have a strong operational presence across key cities like Riyadh, Jeddah, Dammam, and Tabuk.'
            },
            {
                cls: 'is-foot-gulf',
                text: 'Across the Gulf, we serve key markets through a growing regional footprint.'
            },
            {
                cls: 'is-foot-nafrica',
                text: 'In North Africa, our presence spans multiple countries across the region.'
            },
            {
                cls: 'is-foot-out',
                text: 'Beyond these, we extend our reach through a network of distribution partners.'
            }
        ];
        const footBeats = ['is-foot-ksa', 'is-foot-gulf', 'is-foot-nafrica', 'is-foot-out'];
        const speakStep = (index) => {
            if (!overlay || overlay.hidden) return;
            const step = lines[index];
            overlay.classList.remove(...footBeats);
            overlay.classList.add(step.cls);
            this._playFootprintTone(index);
            this._speakCinematicLine(step.text, () => {
                if (index < lines.length - 1) speakStep(index + 1);
                else this._revealScaleImpactScreen(overlay);
            });
        };
        speakStep(0);
    }

    _revealScaleImpactScreen(overlay) {
        if (!overlay || overlay.hidden) return;
        overlay.classList.remove('is-foot-ksa', 'is-foot-gulf', 'is-foot-nafrica', 'is-foot-out');
        overlay.classList.add('is-scale');
        this._runScaleImpactCounts();
        this._speakCinematicLine(
            'Tabuk now operates across 17 plus countries, helping improve access to trusted medicines across the Middle East and North Africa. With 280 plus registered products, Tabuk addresses diverse therapeutic needs that support patients across multiple health conditions. A team of 2,400 plus employees works across functions and locations, ensuring every product meets the highest standards of quality and care.',
            () => this._revealWhoClosingScreen(overlay)
        );
    }

    _runScaleImpactCounts() {
        const cards = [
            { sel: '[data-scale-card="countries"] [data-scale-count]', target: 17, duration: 1200 },
            { sel: '[data-scale-card="products"] [data-scale-count]', target: 280, duration: 1400 },
            { sel: '[data-scale-card="employees"] [data-scale-count]', target: 2400, duration: 1600 }
        ];
        cards.forEach((card, index) => {
            const el = document.querySelector(card.sel);
            if (!el) return;
            el.textContent = '0';
            const startAt = 180 + index * 420;
            const id = setTimeout(() => this._animateScaleCount(el, card.target, card.duration), startAt);
            this._timelineBeatTimers.push(id);
        });
    }

    _animateScaleCount(el, target, duration) {
        const started = performance.now();
        const format = (value) => {
            if (target >= 1000) return value.toLocaleString('en-US');
            return String(value);
        };
        const tick = (now) => {
            const overlay = document.getElementById('timeline-cinematic-overlay');
            if (!overlay || overlay.hidden || !overlay.classList.contains('is-scale')) return;
            const t = Math.min(1, (now - started) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = format(Math.round(target * eased));
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = format(target);
        };
        requestAnimationFrame(tick);
    }

    _revealWhoClosingScreen(overlay) {
        // Slide 14 OST capsule removed — keep bridge VO, then return to Who We Are 360 hotspot
        if (!overlay || overlay.hidden) return;
        this._speakCinematicLine(
            'You have now had a glimpse of who we are, where we operate, and the difference we strive to make. However, what guides us as we continue to grow? What is the purpose that brings us together and shapes the work we do? Let\'s explore our Vision and Mission to discover what we stand for and where we are headed. Look around and follow the directional arrows to continue your learning journey!',
            () => this._returnToWhoWeAreForVmvEntry()
        );
    }

    _returnToWhoWeAreForVmvEntry() {
        this.receptionVmvEntryUnlocked = true;
        // Keep right-side Who We Are context (TV + guide) when returning to 360
        this.receptionRightArrived = true;
        this.hideTimelineCinematic({ restoreScene: true });
        if (this.currentSceneId !== 'reception') {
            this.goToScene('reception');
        } else if (this.hotspots && window.COURSE_DATA) {
            const scene = window.COURSE_DATA.scenes.reception;
            if (scene) this.hotspots.setHotspots(this._buildHotspotList(scene));
        }
        this.hideReceptionTip();
    }

    _offerValuesExperience() {
        // Dev / cinematic preview fallback — live flow uses the 360 discover arrow
        const overlay = document.getElementById('timeline-cinematic-overlay');
        const arrow = document.getElementById('values-entry-arrow');
        const poster = document.getElementById('vmv-poster-hotspot');
        if (!overlay || overlay.hidden) return;
        if (poster) poster.hidden = false;
        if (arrow) arrow.hidden = false;
    }

    _playFootprintTone(step) {
        const freqs = [523, 587, 659, 784];
        this.playTone(freqs[step] || 523, 'sine', 0.16);
    }

    _primeCinematicVoices() {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.getVoices();
        if (typeof window.speechSynthesis.addEventListener === 'function') {
            window.speechSynthesis.addEventListener('voiceschanged', () => {
                window.speechSynthesis.getVoices();
            }, { once: true });
        }
    }

    _stopCinematicSpeech() {
        this._cinematicSpeechGen += 1;
        if (this._speechKeepAlive) {
            clearInterval(this._speechKeepAlive);
            this._speechKeepAlive = null;
        }
        this._cinematicSpeech = null;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    _pickCinematicVoice() {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        const tests = [
            (v) => /en-GB/i.test(v.lang) && /female|samantha|karen|moira|serena|kate|susan|fiona/i.test(v.name),
            (v) => /en-GB/i.test(v.lang),
            (v) => /en-US/i.test(v.lang) && /female|samantha|karen|moira|siri/i.test(v.name),
            (v) => /^en[-_]/i.test(v.lang)
        ];
        for (let i = 0; i < tests.length; i += 1) {
            const found = voices.find(tests[i]);
            if (found) return found;
        }
        return voices[0] || null;
    }

    _speakCinematicLine(text, onEnd) {
        this._stopCinematicSpeech();
        const finish = () => {
            if (typeof onEnd === 'function') onEnd();
        };
        if (this.isAudioMuted || !('speechSynthesis' in window)) {
            const id = setTimeout(finish, 1600);
            this._timelineBeatTimers.push(id);
            return;
        }

        const gen = this._cinematicSpeechGen;
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-GB';
        utter.rate = 0.92;
        utter.pitch = 1;
        utter.volume = 1;
        const voice = this._pickCinematicVoice();
        if (voice) {
            utter.voice = voice;
            if (voice.lang) utter.lang = voice.lang;
        }
        utter.onend = () => {
            if (gen !== this._cinematicSpeechGen) return;
            this._stopCinematicSpeech();
            finish();
        };
        utter.onerror = (event) => {
            if (gen !== this._cinematicSpeechGen) return;
            const err = event && event.error;
            if (err === 'interrupted' || err === 'canceled') return;
            const waitMs = Math.max(1600, text.split(/\s+/).length * 380);
            const waitId = setTimeout(() => {
                if (gen !== this._cinematicSpeechGen) return;
                this._stopCinematicSpeech();
                finish();
            }, waitMs);
            this._timelineBeatTimers.push(waitId);
        };
        this._cinematicSpeech = utter;
        // Chrome drops the next utterance if speak() follows cancel() in the same tick
        const id = setTimeout(() => {
            if (gen !== this._cinematicSpeechGen) return;
            window.speechSynthesis.speak(utter);
        }, 40);
        this._timelineBeatTimers.push(id);
        this._speechKeepAlive = setInterval(() => {
            if (!window.speechSynthesis.speaking) return;
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        }, 4000);
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
            // CEO / CHRO message arrows open a video modal instead of navigating
            if (hotspot.modalId) {
                if (hotspot.modalId === 'modal_video_welcome' || hotspot.modalId === 'modal_video_chro') {
                    this.stopCeoIntroAudio();
                    this.stopChroIntroAudio();
                    this.stopTipAvatar();
                }
                window.modalManager.showComplexModal(hotspot.modalId);
                return;
            }
            // Who We Are 360 — arrow opens Vision / Mission / Values experience
            if (hotspot.id === 'discover_what_guides' || hotspot.openValuesExperience) {
                this.hideReceptionTip();
                if (this.valuesExperience) this.valuesExperience.open({ start: 'vision' });
                return;
            }
            if (hotspot.transitionVideo) {
                this.playPortalTransitionVideo(hotspot);
            } else {
                this.goToScene(hotspot.targetScene, { fromHotspot: hotspot });
            }
        } else if (hotspot.type === 'modal') {
            // Stop reception tip VO/avatar when opening CEO/CHRO video players
            if (hotspot.modalId === 'modal_video_welcome' || hotspot.modalId === 'modal_video_chro') {
                this.stopCeoIntroAudio();
                this.stopChroIntroAudio();
                this.stopTipAvatar();
            }
            if (hotspot.id === 'reception_right_video') {
                this.showTimelineCinematic();
                return;
            }
            if (!hotspot.modalId) return;
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
                    <button class="btn btn-secondary" onclick="if (window.scorm) { window.scorm.terminate(); } alert('Module completed. You may now close this window.');">
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
