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

        // 6. Launch Initial Scene (Welcome Exterior)
        this.goToScene('welcome');
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

        // Load 360 texture
        this.viewer.loadTexture(scene.bgImage, () => {
            this.viewer.setLookAt(scene.initialPitch || 0, scene.initialYaw || 0);
        });

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

        // Scene Card (frosted card in bottom right matching storyboard)
        if (scene.cardText) {
            const lines = scene.cardText.split('\n');
            sceneCard.innerHTML = `
                <div class="card-headline">${lines[0]}</div>
                <div class="card-subline">${lines[1] || ''}</div>
            `;
            sceneCard.style.display = 'block';
        } else {
            sceneCard.style.display = 'none';
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
