/**
 * Modal Dialog & Content Card Manager
 * Pure HTML/CSS UI matching the exact storyboard layouts from the deck
 */

class ModalManager {
    constructor() {
        this.overlay = document.getElementById('modal-overlay');
        this.contentContainer = document.getElementById('modal-content');

        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });

        // Leadership member data
        this.leadershipData = [
            { id: 1, name: "Ismail Shehada", role: "Chief Executive Officer", img: "assets/images/leader1.png?v=10.0" },
            { id: 2, name: "Dr. Khalid Mansoor", role: "VP - Strategy & Corporate Development", img: "assets/images/leader2.png?v=10.0" },
            { id: 3, name: "Fahad Al-Otaibi", role: "VP - Government & Healthcare Affairs", img: "assets/images/leader3.png?v=10.0" },
            { id: 4, name: "Tariq Al-Hamad", role: "VP - Technical Operations & Manufacturing", img: "assets/images/leader4.png?v=10.0" },
            { id: 5, name: "Dr. Sami Al-Nasser", role: "VP - Medical Affairs & Regulatory Compliance", img: "assets/images/leader5.png?v=10.0" },
            { id: 6, name: "Ahmed Al-Ghamdi", role: "Chief Financial Officer (CFO)", img: "assets/images/leader6.png?v=10.0" },
            { id: 7, name: "Majed Al-Mutairi", role: "VP - Human Capital & Culture", img: "assets/images/leader7.png?v=10.0" },
            { id: 8, name: "Omar Al-Khatib", role: "VP - Supply Chain & Distribution", img: "assets/images/leader8.png?v=10.0" },
            { id: 9, name: "Dr. Youssef Al-Zahrani", role: "VP - Quality Assurance & Control", img: "assets/images/leader9.png?v=10.0" },
            { id: 10, name: "Bandar Al-Harbi", role: "General Counsel & Corporate Governance", img: "assets/images/leader10.png?v=10.0" }
        ];
        this.activeLeaderId = 1;
        this.hoveredLeaderId = null;
    }

    isOpen() {
        return this.overlay && this.overlay.classList.contains('active');
    }

    close() {
        this.stopVideoPlayback();
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        if (this.contentContainer) {
            this.contentContainer.innerHTML = '';
        }
    }

    getIconSvg(iconType) {
        switch (iconType) {
            case 'eye':
                return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005696" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            case 'target':
                return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005696" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;
            case 'globe':
                return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005696" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
            case 'factory':
                return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005696" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"></path><path d="M2 14l5-3v4l5-3v4l6-3v8H2z"></path></svg>`;
            case 'check':
                return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005696" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            case 'dropper':
                return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005696" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"></path><path d="m5 2 5 5"></path><path d="M2 13h15"></path></svg>`;
            case 'award':
                return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005696" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
            case 'building':
            default:
                return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005696" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="6" x2="9" y2="6.01"></line><line x1="15" y1="6" x2="15" y2="6.01"></line><line x1="9" y1="10" x2="9" y2="10.01"></line><line x1="15" y1="10" x2="15" y2="10.01"></line><line x1="9" y1="14" x2="9" y2="14.01"></line><line x1="15" y1="14" x2="15" y2="14.01"></line><line x1="9" y1="18" x2="15" y2="18"></line></svg>`;
        }
    }

    showInfo(title, text, icon = 'building', bullets = null) {
        const iconSvg = this.getIconSvg(icon);
        let bulletsHtml = '';

        if (bullets && Array.isArray(bullets)) {
            bulletsHtml = `
                <div class="deck-bullets-row">
                    ${bullets.map(b => `<span class="deck-bullet-pill">• ${b}</span>`).join('')}
                </div>
            `;
        }

        this.contentContainer.innerHTML = `
            <div class="deck-speech-callout">
                <button class="card-close-x" onclick="window.modalManager.close()" aria-label="Close">&times;</button>
                <div class="deck-callout-header">
                    <div class="deck-callout-icon">${iconSvg}</div>
                    <h2 class="deck-callout-title">${title}</h2>
                </div>
                <div class="deck-callout-body">
                    <p class="deck-callout-text">${text}</p>
                    ${bulletsHtml}
                </div>
            </div>
        `;
        this.overlay.classList.add('active');
    }

    selectLeader(leaderId) {
        this.activeLeaderId = leaderId;
        this.updateLeadershipUI();
    }

    hoverLeader(leaderId) {
        this.hoveredLeaderId = leaderId;
        this.updateLeadershipUI();
    }

    unhoverLeader() {
        this.hoveredLeaderId = null;
        this.updateLeadershipUI();
    }

    updateLeadershipUI() {
        const currentId = this.hoveredLeaderId || this.activeLeaderId || 1;
        document.querySelectorAll('.deck-leader-item').forEach(el => {
            const id = parseInt(el.getAttribute('data-id'), 10);
            const isCurrent = (id === currentId);
            el.classList.toggle('active', isCurrent);
            const circle = el.querySelector('.deck-leader-circle');
            if (circle) {
                circle.classList.toggle('ismail-highlight', id === 1 && isCurrent);
            }
        });
    }

    showComplexModal(modalId) {
        let innerHtml = '';

        if (modalId === 'modal_leadership') {
            this.activeLeaderId = 1;
            this.hoveredLeaderId = null;
            // Slide 18 exact layout built with HTML & CSS
            // Pre-allocated space for each leader ensures ZERO layout movement up or down
            innerHtml = `
                <div class="deck-modal-leadership">
                    <button class="card-close-x" onclick="window.modalManager.close()" aria-label="Close">&times;</button>
                    <h1 class="deck-leadership-title">Our Leadership Team</h1>
                    
                    <div class="deck-leadership-grid">
                        ${this.leadershipData.map((l, idx) => `
                            <div class="deck-leader-item ${idx === 0 ? 'active' : ''}" 
                                 data-id="${l.id}" 
                                 onmouseenter="window.modalManager.hoverLeader(${l.id})" 
                                 onmouseleave="window.modalManager.unhoverLeader()"
                                 onclick="window.modalManager.selectLeader(${l.id})">
                                <div class="deck-leader-circle ${idx === 0 ? 'ismail-highlight' : ''}">
                                    <img src="${l.img}" alt="${l.name}" />
                                </div>
                                <div class="deck-leader-info">
                                    <div class="deck-leader-name">${l.name}</div>
                                    <div class="deck-leader-role">${l.role}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (modalId === 'modal_scale_sites') {
            // Slide 14 exact layout built with HTML & CSS
            innerHtml = `
                <div class="deck-callout-scale-sites">
                    <button class="card-close-x" onclick="window.modalManager.close()" aria-label="Close">&times;</button>
                    <div class="deck-callout-header">
                        <div class="deck-callout-globe-icon">
                            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#005696" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                        </div>
                        <h2 class="deck-callout-title">Scale & Sites</h2>
                    </div>
                    <div class="deck-callout-body">
                        <p class="deck-callout-intro">Tabuk’s manufacturing network spans four production sites:</p>
                        <p class="deck-sites-list">
                            <span class="site-bullet">•</span> Tabuk &nbsp;&nbsp;
                            <span class="site-bullet">•</span> Dammam &nbsp;&nbsp;
                            <span class="site-bullet">•</span> Algeria &nbsp;&nbsp;
                            <span class="site-bullet">•</span> Sudan
                        </p>
                        <p class="deck-callout-outro">
                            Together, these facilities supply medicines across the Middle East and North Africa.
                        </p>
                    </div>
                </div>
            `;
        } else if (modalId === 'modal_who_we_are') {
            // Slide 7 & 8 exact layout built with HTML & CSS
            innerHtml = `
                <div class="deck-modal-who-we-are">
                    <button class="card-close-x" onclick="window.modalManager.close()" aria-label="Close">&times;</button>
                    <h1 class="deck-who-we-are-title">WHO WE ARE</h1>

                    <div class="deck-metrics-row">
                        <div class="deck-metric-item">
                            <div class="deck-metric-badge">
                                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ffffff" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><path d="M9 22v-4h6v4"></path></svg>
                            </div>
                            <div class="deck-metric-label">FOUNDED</div>
                            <div class="deck-metric-sub">1994</div>
                        </div>

                        <div class="deck-metric-item">
                            <div class="deck-metric-badge">
                                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ffffff" stroke-width="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
                            </div>
                            <div class="deck-metric-label">LARGEST PRIVATE</div>
                            <div class="deck-metric-sub">PHARMA IN KSA</div>
                        </div>

                        <div class="deck-metric-item">
                            <div class="deck-metric-badge">
                                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ffffff" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </div>
                            <div class="deck-metric-label">2,400+</div>
                            <div class="deck-metric-sub">PROFESSIONALS</div>
                        </div>

                        <div class="deck-metric-item">
                            <div class="deck-metric-badge">
                                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ffffff" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            </div>
                            <div class="deck-metric-label">17+ MENA</div>
                            <div class="deck-metric-sub">COUNTRIES</div>
                        </div>
                    </div>

                    <div class="deck-speech-bubble-1994">
                        <div class="deck-bubble-pointer"></div>
                        <div class="deck-bubble-img-wrap">
                            <img src="assets/images/scene0_exterior.jpg" alt="Riyadh HQ Building" class="deck-bubble-img" />
                        </div>
                        <p class="deck-bubble-text">
                            In <strong>1994</strong>, a vision took root in Riyadh. A vision to build something Saudi Arabia could be proud of.
                        </p>
                    </div>
                </div>
            `;
        } else if (modalId === 'modal_values') {
            // Slide 10 exact layout built with HTML & CSS
            innerHtml = `
                <div class="deck-modal-values">
                    <button class="card-close-x" onclick="window.modalManager.close()" aria-label="Close">&times;</button>
                    <div class="deck-values-header">
                        <div class="deck-tabuk-branding">tabuk <span>pharmaceuticals</span></div>
                        <h1 class="deck-values-title">VALUES</h1>
                        <p class="deck-values-tagline">ONE TABUK TEAM</p>
                    </div>

                    <div class="deck-values-split">
                        <div class="deck-values-iceberg-graphic">
                            <img src="assets/images/scene1_elevator_values.jpg" alt="Tabuk Iceberg Model" class="iceberg-board-img" />
                        </div>
                        <div class="deck-values-list">
                            <div class="deck-val-card">
                                <div class="deck-val-name">INTEGRITY</div>
                                <div class="deck-val-desc">Upholding uncompromising ethical standards, clinical transparency, and scientific honesty.</div>
                            </div>
                            <div class="deck-val-card">
                                <div class="deck-val-name">RESPECT FOR PEOPLE</div>
                                <div class="deck-val-desc">Valuing our 2,400+ diverse colleagues, listening actively, and treating all patients with empathy.</div>
                            </div>
                            <div class="deck-val-card">
                                <div class="deck-val-name">RESULTS</div>
                                <div class="deck-val-desc">Executing with urgency and holding ourselves accountable to the highest milestones.</div>
                            </div>
                            <div class="deck-val-card">
                                <div class="deck-val-name">STAKEHOLDER CENTRIC</div>
                                <div class="deck-val-desc">Placing patients, healthcare providers, communities, and regulators at the very center.</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (modalId === 'modal_video_welcome') {
            // Slide 5 exact floating curved video player matching storyboard
            innerHtml = `
                <div class="deck-modal-video-player">
                    <button class="card-close-x video-close-btn" onclick="window.modalManager.closeVideoPlayer()" aria-label="Close Video">&times;</button>
                    <div class="deck-video-curved-viewport">
                        <img src="assets/images/video_executive_welcome.png?v=8.0" alt="Executive Welcome Video" class="deck-video-visual" />
                        
                        <div class="deck-video-overlay-gradient"></div>
                        
                        <!-- Floating Closed Captions -->
                        <div class="deck-video-subtitles" id="video-subtitles-box">
                            "Welcome to Tabuk Pharmaceuticals Headquarters in Riyadh. On behalf of leadership, we welcome you."
                        </div>
                        
                        <!-- Video Controls Bar matching Slide 5 -->
                        <div class="deck-video-controls">
                            <button id="video-play-btn" class="video-play-toggle" onclick="window.modalManager.toggleVideoPlay()" title="Play / Pause">
                                <svg id="video-play-icon-svg" viewBox="0 0 24 24" width="22" height="22" fill="#ffffff">
                                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                                </svg>
                            </button>
                            
                            <div class="video-timeline-wrapper" onclick="window.modalManager.seekVideo(event)">
                                <div class="video-timeline-track">
                                    <div id="video-progress-bar" class="video-timeline-fill" style="width: 0%;"></div>
                                </div>
                            </div>
                            
                            <div id="video-timer-label" class="video-timer-label">00:00 / 00:35</div>
                            
                            <button id="video-audio-toggle" class="video-audio-btn" onclick="window.modalManager.toggleVideoAudio()" title="Audio Narration On/Off">
                                <svg id="video-audio-icon" viewBox="0 0 24 24" width="20" height="20" fill="#ffffff">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            setTimeout(() => this.startVideoPlayback(), 150);
        }

        this.contentContainer.innerHTML = innerHtml;
        this.overlay.classList.add('active');
    }

    startVideoPlayback() {
        this.stopVideoPlayback();
        this.videoCurrentTime = 0;
        this.videoDuration = 35;
        this.isVideoPlaying = true;
        this.isVideoMuted = false;

        this.videoInterval = setInterval(() => {
            if (!this.isVideoPlaying) return;
            this.videoCurrentTime += 0.2;
            if (this.videoCurrentTime >= this.videoDuration) {
                this.videoCurrentTime = this.videoDuration;
                this.isVideoPlaying = false;
                this.updateVideoPlayIcon();
            }
            this.updateVideoUI();
        }, 200);

        this.speakVideoNarration();
    }

    toggleVideoPlay() {
        this.isVideoPlaying = !this.isVideoPlaying;
        if (this.isVideoPlaying && this.videoCurrentTime >= this.videoDuration) {
            this.videoCurrentTime = 0;
            this.speakVideoNarration();
        } else if (!this.isVideoPlaying) {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        } else {
            this.speakVideoNarration(this.videoCurrentTime);
        }
        this.updateVideoPlayIcon();
    }

    seekVideo(event) {
        const track = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - track.left;
        const pct = Math.max(0, Math.min(1, clickX / track.width));
        this.videoCurrentTime = pct * this.videoDuration;
        this.updateVideoUI();
        if (this.isVideoPlaying) {
            this.speakVideoNarration(this.videoCurrentTime);
        }
    }

    toggleVideoAudio() {
        this.isVideoMuted = !this.isVideoMuted;
        const icon = document.getElementById('video-audio-icon');
        if (this.isVideoMuted) {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            if (icon) {
                icon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
            }
        } else {
            if (icon) {
                icon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
            }
            if (this.isVideoPlaying) this.speakVideoNarration(this.videoCurrentTime);
        }
    }

    updateVideoPlayIcon() {
        const iconSvg = document.getElementById('video-play-icon-svg');
        if (!iconSvg) return;
        if (this.isVideoPlaying) {
            iconSvg.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>`;
        } else {
            iconSvg.innerHTML = `<polygon points="6 4 20 12 6 20 6 4"/>`;
        }
    }

    updateVideoUI() {
        const bar = document.getElementById('video-progress-bar');
        const timer = document.getElementById('video-timer-label');
        const subtitles = document.getElementById('video-subtitles-box');

        const pct = Math.min(100, (this.videoCurrentTime / this.videoDuration) * 100);
        if (bar) bar.style.width = `${pct}%`;

        if (timer) {
            const curM = String(Math.floor(this.videoCurrentTime / 60)).padStart(2, '0');
            const curS = String(Math.floor(this.videoCurrentTime % 60)).padStart(2, '0');
            const totM = String(Math.floor(this.videoDuration / 60)).padStart(2, '0');
            const totS = String(Math.floor(this.videoDuration % 60)).padStart(2, '0');
            timer.textContent = `${curM}:${curS} / ${totM}:${totS}`;
        }

        if (subtitles) {
            if (this.videoCurrentTime < 11) {
                subtitles.textContent = '"Welcome to Tabuk Pharmaceuticals Headquarters in Riyadh. On behalf of executive leadership and 2,400+ colleagues, we welcome you."';
            } else if (this.videoCurrentTime < 24) {
                subtitles.textContent = '"Our manufacturing plants in Tabuk, Dammam, Algeria, and Sudan supply trusted medicines across 17 MENA countries."';
            } else {
                subtitles.textContent = '"Driven by integrity, high quality, and respect, you are now part of our mission. Have an inspiring induction experience!"';
            }
        }
    }

    speakVideoNarration(offsetSeconds = 0) {
        if (!('speechSynthesis' in window) || this.isVideoMuted) return;
        window.speechSynthesis.cancel();

        let text = "Welcome to Tabuk Pharmaceuticals Headquarters in Riyadh. On behalf of executive leadership and over 2,400 colleagues, we welcome you to the company. Our manufacturing plants across Tabuk, Dammam, Algeria, and Sudan supply trusted medicines to millions of patients across 17 countries. We wish you an inspiring induction experience.";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    stopVideoPlayback() {
        if (this.videoInterval) {
            clearInterval(this.videoInterval);
            this.videoInterval = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        this.isVideoPlaying = false;
    }

    closeVideoPlayer() {
        this.stopVideoPlayback();
        this.close();
    }
}

window.modalManager = new ModalManager();
