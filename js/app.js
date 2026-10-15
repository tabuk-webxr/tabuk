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

        // 5. Bind UI Controls
        this.bindUI();

        // 6. Launch with far-from-building approach, then welcome
        this.goToScene('approach');
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
        const panel = document.getElementById('dev-orientation-panel');
        const sphereYaw = document.getElementById('dev-sphere-yaw');
        const camPitch = document.getElementById('dev-cam-pitch');
        const camYaw = document.getElementById('dev-cam-yaw');
        const hotSelect = document.getElementById('dev-hotspot-select');
        const hotPitch = document.getElementById('dev-hot-pitch');
        const hotYaw = document.getElementById('dev-hot-yaw');
        const placeBtn = document.getElementById('dev-place-at-view');
        const copyBtn = document.getElementById('dev-copy-orientation');
        if (!panel || !sphereYaw || !camPitch || !camYaw) return;

        const applyOrientation = () => {
            this.viewer.setSphereRotationY(Number(sphereYaw.value));
            this.viewer.setLookAt(Number(camPitch.value), Number(camYaw.value));
            this.updateDevOrientationReadout();
        };

        const applyHotspot = () => {
            if (!hotSelect || !hotSelect.value) return;
            const pitch = Number(hotPitch.value);
            const yaw = Number(hotYaw.value);
            this.hotspots.setHotspotCoords(hotSelect.value, pitch, yaw);
            this.persistHotspotCoords(hotSelect.value, pitch, yaw);
            document.getElementById('dev-hot-pitch-val').textContent = `${Math.round(pitch)}°`;
            document.getElementById('dev-hot-yaw-val').textContent = `${Math.round(yaw)}°`;
            this.updateDevOrientationReadout();
        };

        sphereYaw.addEventListener('input', applyOrientation);
        camPitch.addEventListener('input', applyOrientation);
        camYaw.addEventListener('input', applyOrientation);
        if (hotPitch) hotPitch.addEventListener('input', applyHotspot);
        if (hotYaw) hotYaw.addEventListener('input', applyHotspot);

        if (hotSelect) {
            hotSelect.addEventListener('change', () => this.loadSelectedHotspotIntoDevSliders());
        }

        if (placeBtn) {
            placeBtn.addEventListener('click', () => {
                if (!hotSelect || !hotSelect.value) return;
                const pitch = Math.round(this.viewer.targetPitch);
                const yaw = Math.round(this.viewer.targetYaw);
                hotPitch.value = String(pitch);
                hotYaw.value = String(yaw);
                this.hotspots.setHotspotCoords(hotSelect.value, pitch, yaw);
                this.persistHotspotCoords(hotSelect.value, pitch, yaw);
                this.loadSelectedHotspotIntoDevSliders();
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
    }

    toggleDevOrientationPanel(forceState) {
        const panel = document.getElementById('dev-orientation-panel');
        if (!panel) return;
        this.devPanelOpen = typeof forceState === 'boolean' ? forceState : !this.devPanelOpen;
        panel.style.display = this.devPanelOpen ? 'block' : 'none';
        if (this.devPanelOpen) {
            this.refreshDevHotspotList();
            this.syncDevOrientationPanel();
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
            opt.textContent = `${h.label || h.id} (${h.id})`;
            hotSelect.appendChild(opt);
        });
        if (prev && list.some((h) => h.id === prev)) {
            hotSelect.value = prev;
        }
        this.loadSelectedHotspotIntoDevSliders();
    }

    loadSelectedHotspotIntoDevSliders() {
        const hotSelect = document.getElementById('dev-hotspot-select');
        const hotPitch = document.getElementById('dev-hot-pitch');
        const hotYaw = document.getElementById('dev-hot-yaw');
        if (!hotSelect || !hotSelect.value || !hotPitch || !hotYaw) return;
        const h = this.hotspots.getHotspotById(hotSelect.value);
        if (!h) return;
        hotPitch.value = String(Math.round(h.pitch));
        hotYaw.value = String(Math.round(h.yaw));
        document.getElementById('dev-hot-pitch-val').textContent = `${Math.round(h.pitch)}°`;
        document.getElementById('dev-hot-yaw-val').textContent = `${Math.round(h.yaw)}°`;
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
                ? hotspots.map((h) => `  - ${h.id}: pitch ${h.pitch}, yaw ${h.yaw}`).join('\n')
                : '  (none)';
            pre.textContent =
                `scene: ${sceneId}\n` +
                `sphereYaw: ${o.sphereYaw}\n` +
                `initialPitch: ${o.initialPitch}\n` +
                `initialYaw: ${o.initialYaw}\n` +
                `hotspots:\n${hotLines}`;
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

    goToScene(sceneId) {
        const scene = window.COURSE_DATA.scenes[sceneId];
        if (!scene) {
            console.error("Unknown scene ID:", sceneId);
            return;
        }

        this.playTone(380, 'sine', 0.2);
        this.currentSceneId = sceneId;
        this.visitedScenes.add(sceneId);

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

        // Load 360 video or still panorama
        const onMediaReady = () => {
            this.viewer.setSphereRotationY(scene.sphereYaw || 0);
            this.viewer.setLookAt(scene.initialPitch || 0, scene.initialYaw || 0);
            // 360 videos start at min zoom (widest view); stills use scene FOV or default
            if (scene.bgVideo) {
                this.viewer.setMinZoom();
            } else if (typeof scene.initialFov === 'number') {
                this.viewer.setFov(scene.initialFov, true);
            } else {
                this.viewer.setFov(75, true);
            }
            this.syncDevOrientationPanel();
        };
        if (scene.bgVideo) {
            this.viewer.setMinZoom();
            this.viewer.loadVideo(scene.bgVideo, onMediaReady);
        } else {
            this.viewer.loadTexture(scene.bgImage, onMediaReady);
        }

        // Set hotspots
        this.hotspots.setHotspots(scene.hotspots || []);

        // Update UI HUD Cards & Overlays
        this.updateHUD(scene);
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
        const isIntroScene = scene.id === 'welcome' || scene.id === 'approach';
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

        // Specific scene states
        if (scene.id === 'welcome') {
            welcomeOverlay.classList.add('active');
        } else if (scene.isAssessment) {
            assessmentOverlay.classList.add('active');
            this.assessment.start();
        } else if (scene.isCompletion) {
            completionOverlay.classList.add('active');
            this.renderCompletionScreen();
        }
    }

    handleHotspotClick(hotspot) {
        this.playTone(660, 'sine', 0.15);
        this.visitedHotspots.add(hotspot.id);

        if (hotspot.type === 'portal') {
            this.goToScene(hotspot.targetScene);
        } else if (hotspot.type === 'modal') {
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
                    <span class="tabuk-brand">tabuk</span>
                    <span class="pharma-text">pharmaceuticals</span>
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
