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
        this.activeVideoProfile = null;
        this.welcomeAudio = null;
        this.welcomeAudioSrc = null;
        this.videoPlaybackEnded = false;
        this.onWelcomeVideoClosed = null;

        this.videoProfiles = {
            modal_video_welcome: {
                id: 'ceo',
                label: 'CEO Welcome — tap to play',
                speakerTitle: 'Ismail Shehada · Chief Executive Officer',
                image: 'assets/images/video_chro_welcome.png',
                audio: 'Audios/Welcome Notes.mp3',
                duration: 43.47,
                captions: null // use getCeoCaptionCues()
            },
            modal_video_chro: {
                id: 'chro',
                label: 'CHRO Welcome — Tap to play',
                speakerTitle: 'Mohammad Al Fawazi · Chief Human Resources Officer',
                image: 'assets/images/video_executive_welcome.png?v=8.0',
                audio: 'Audios/CHRO_Notes.mp3',
                duration: 45.95,
                // Word-level timings from CHRO Notes_json.json (~45.8s)
                captions: [
                    { at: 0.00, text: 'Welcome to Tabuk Pharmaceuticals.' },
                    { at: 2.56, text: 'I\'m glad you\'ve chosen to be part of our journey.' },
                    { at: 5.52, text: 'At Tabuk, what we do is rooted in a simple purpose:' },
                    { at: 9.60, text: 'improving patients\' lives through medicines people can trust.' },
                    { at: 13.51, text: 'But what truly brings that purpose to life is our people.' },
                    { at: 17.43, text: 'Every day, teams across our organization work with integrity, care, and a shared commitment to making a difference.' },
                    { at: 25.11, text: 'Through this experience, you\'ll get a glimpse of how we work, what we value, and the impact we strive to create.' },
                    { at: 32.20, text: 'As you step into your role, know that what you do matters,' },
                    { at: 35.64, text: 'and the impact you make will reach far beyond your day to day work.' },
                    { at: 39.72, text: 'Once again, welcome to Tabuk Pharmaceuticals.' },
                    { at: 43.05, text: 'I look forward to seeing you grow and succeed with us.' }
                ]
            }
        };
    }

    isOpen() {
        return this.overlay && this.overlay.classList.contains('active');
    }

    close() {
        const closedProfile = this.activeVideoProfile;
        const ended = this.videoPlaybackEnded;
        this.stopVideoPlayback();
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        if (this.contentContainer) {
            this.contentContainer.innerHTML = '';
        }
        this.activeVideoProfile = null;
        if (typeof this.onWelcomeVideoClosed === 'function' && closedProfile) {
            this.onWelcomeVideoClosed(closedProfile, ended);
        }
        this.videoPlaybackEnded = false;
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
        } else if (modalId === 'modal_video_welcome' || modalId === 'modal_video_chro') {
            const profile = this.videoProfiles[modalId];
            this.activeVideoProfile = profile;
            this.videoPlaybackEnded = false;
            const firstCaption = (profile.captions && profile.captions[0])
                ? profile.captions[0].text
                : 'Welcome to Tabuk Pharmaceuticals.';
            innerHtml = `
                <div class="deck-modal-video-player">
                    <button class="card-close-x video-close-btn" onclick="window.modalManager.closeVideoPlayer()" aria-label="Close Video">&times;</button>
                    <div class="deck-video-curved-viewport">
                        <img src="${profile.image}" alt="${profile.label}" class="deck-video-visual" />
                        
                        <div class="deck-video-overlay-gradient"></div>
                        
                        <!-- Floating Closed Captions -->
                        <div class="deck-video-subtitles" id="video-subtitles-box">
                            ${firstCaption}
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
                            
                            <div id="video-timer-label" class="video-timer-label">00:00 / 00:00</div>
                            
                            <button id="video-audio-toggle" class="video-audio-btn" onclick="window.modalManager.toggleVideoAudio()" title="Audio Narration On/Off">
                                <svg id="video-audio-icon" viewBox="0 0 24 24" width="20" height="20" fill="#ffffff">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="deck-video-speaker-title" id="video-speaker-title">
                        ${profile.speakerTitle || ''}
                    </div>
                </div>
            `;
            setTimeout(() => this.startVideoPlayback(), 150);
        }

        this.contentContainer.innerHTML = innerHtml;
        this.overlay.classList.add('active');
    }

    getActiveAudioDuration() {
        const audio = this.welcomeAudio;
        if (audio && isFinite(audio.duration) && audio.duration > 0) {
            return audio.duration;
        }
        const fallback = this.activeVideoProfile && this.activeVideoProfile.duration;
        return fallback || this.videoDuration || 0;
    }

    ensureWelcomeAudio() {
        const src = this.activeVideoProfile && this.activeVideoProfile.audio;
        if (!src) return null;
        if (this.welcomeAudio && this.welcomeAudioSrc === src) return this.welcomeAudio;

        if (this.welcomeAudio) {
            this.welcomeAudio.pause();
            this.welcomeAudio.removeAttribute('src');
            this.welcomeAudio.load();
            this.welcomeAudio = null;
            this.welcomeAudioSrc = null;
        }

        const resolved = (window.app && window.app.assets)
            ? window.app.assets.getUrl(src)
            : src;
        const audio = new Audio(resolved);
        audio.preload = 'auto';
        const onMeta = () => {
            if (audio !== this.welcomeAudio) return;
            if (audio.duration && isFinite(audio.duration)) {
                this.videoDuration = audio.duration;
                this.updateVideoUI();
            }
        };
        audio.addEventListener('loadedmetadata', onMeta);
        audio.addEventListener('durationchange', onMeta);
        audio.addEventListener('timeupdate', () => {
            if (audio !== this.welcomeAudio) return;
            this.videoCurrentTime = audio.currentTime;
            this.videoDuration = this.getActiveAudioDuration();
            this.updateVideoUI();
        });
        audio.addEventListener('ended', () => {
            if (audio !== this.welcomeAudio) return;
            this.isVideoPlaying = false;
            this.videoPlaybackEnded = true;
            this.videoDuration = this.getActiveAudioDuration();
            this.videoCurrentTime = this.videoDuration;
            this.updateVideoPlayIcon();
            this.updateVideoUI();
        });
        this.welcomeAudio = audio;
        this.welcomeAudioSrc = src;
        return audio;
    }

    startVideoPlayback() {
        this.stopVideoPlayback();
        const audio = this.ensureWelcomeAudio();
        this.videoCurrentTime = 0;
        this.videoDuration = this.getActiveAudioDuration();
        this.isVideoPlaying = !!audio;
        this.isVideoMuted = false;
        if (audio) {
            audio.muted = false;
            try { audio.currentTime = 0; } catch (e) { /* ignore until seekable */ }
            audio.play().catch(() => {});
        }
        this.updateVideoPlayIcon();
        this.updateVideoUI();
    }

    toggleVideoPlay() {
        const audio = this.ensureWelcomeAudio();
        if (!audio) return;
        this.videoDuration = this.getActiveAudioDuration();
        this.isVideoPlaying = !this.isVideoPlaying;
        if (this.isVideoPlaying) {
            if (this.videoDuration && this.videoCurrentTime >= this.videoDuration - 0.05) {
                this.videoCurrentTime = 0;
                try { audio.currentTime = 0; } catch (e) { /* ignore */ }
            }
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
        this.updateVideoPlayIcon();
    }

    seekVideo(event) {
        const audio = this.ensureWelcomeAudio();
        if (!audio) return;
        const duration = this.getActiveAudioDuration();
        if (!duration) return;
        this.videoDuration = duration;
        const track = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - track.left;
        const pct = Math.max(0, Math.min(1, clickX / track.width));
        this.videoCurrentTime = pct * duration;
        try {
            audio.currentTime = this.videoCurrentTime;
        } catch (e) {
            // Not seekable yet — retry once metadata is ready
            const retry = () => {
                if (audio !== this.welcomeAudio) return;
                try { audio.currentTime = this.videoCurrentTime; } catch (err) { /* ignore */ }
                this.updateVideoUI();
            };
            audio.addEventListener('loadedmetadata', retry, { once: true });
            audio.addEventListener('canplay', retry, { once: true });
        }
        this.updateVideoUI();
    }

    toggleVideoAudio() {
        const audio = this.ensureWelcomeAudio();
        if (!audio) return;
        this.isVideoMuted = !this.isVideoMuted;
        audio.muted = this.isVideoMuted;
        const icon = document.getElementById('video-audio-icon');
        if (this.isVideoMuted) {
            if (icon) {
                icon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
            }
        } else if (icon) {
            icon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
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

    getCeoCaptionCues() {
        // Word-level timings from ElevenLabs Welcome Notes transcript (~43.3s)
        return [
            { at: 0.00, text: 'Welcome to Tabuk Pharmaceuticals.' },
            { at: 2.48, text: 'For over 30 years, this organisation has been built on a single belief' },
            { at: 7.44, text: 'that every patient deserves access to medicines they can trust.' },
            { at: 11.52, text: 'That belief is why we exist, and it is what drives every decision we make.' },
            { at: 16.73, text: 'Today, you join a team of more than 2,400 people working across manufacturing, research, commercial and support functions,' },
            { at: 26.01, text: 'each one contributing to that same purpose.' },
            { at: 29.12, text: 'Your role, whatever it is, connects directly to a patient somewhere in our region.' },
            { at: 34.38, text: 'We are growing.' },
            { at: 35.58, text: 'We are investing.' },
            { at: 36.78, text: 'And we are doing it because we believe the best is still ahead of us.' },
            { at: 40.78, text: 'I\'m glad you\'re here.' },
            { at: 42.22, text: 'Welcome to Tabuk.' }
        ];
    }

    getWelcomeCaptionCues() {
        if (this.activeVideoProfile && this.activeVideoProfile.captions) {
            return this.activeVideoProfile.captions;
        }
        return this.getCeoCaptionCues();
    }

    updateVideoUI() {
        const bar = document.getElementById('video-progress-bar');
        const timer = document.getElementById('video-timer-label');
        const subtitles = document.getElementById('video-subtitles-box');

        const duration = this.videoDuration || 0;
        const pct = duration ? Math.min(100, (this.videoCurrentTime / duration) * 100) : 0;
        if (bar) bar.style.width = `${pct}%`;

        if (timer) {
            const curM = String(Math.floor(this.videoCurrentTime / 60)).padStart(2, '0');
            const curS = String(Math.floor(this.videoCurrentTime % 60)).padStart(2, '0');
            const totM = String(Math.floor(duration / 60)).padStart(2, '0');
            const totS = String(Math.floor(duration % 60)).padStart(2, '0');
            timer.textContent = `${curM}:${curS} / ${totM}:${totS}`;
        }

        if (subtitles) {
            const cues = this.getWelcomeCaptionCues();
            let caption = cues[0] ? cues[0].text : '';
            for (let i = 0; i < cues.length; i++) {
                if (this.videoCurrentTime >= cues[i].at) {
                    caption = cues[i].text;
                } else {
                    break;
                }
            }
            subtitles.textContent = caption;
        }
    }

    stopVideoPlayback() {
        if (this.videoInterval) {
            clearInterval(this.videoInterval);
            this.videoInterval = null;
        }
        if (this.welcomeAudio) {
            this.welcomeAudio.pause();
            try { this.welcomeAudio.currentTime = 0; } catch (e) { /* ignore */ }
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        this.isVideoPlaying = false;
        this.videoCurrentTime = 0;
    }

    closeVideoPlayer() {
        // Capture before teardown so the X button always unlocks CHRO after CEO
        const closedProfile = this.activeVideoProfile;
        const ended = this.videoPlaybackEnded;
        this.stopVideoPlayback();
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        if (this.contentContainer) {
            this.contentContainer.innerHTML = '';
        }
        this.activeVideoProfile = null;
        this.videoPlaybackEnded = false;
        if (typeof this.onWelcomeVideoClosed === 'function' && closedProfile) {
            this.onWelcomeVideoClosed(closedProfile, ended);
        }
    }
}

window.modalManager = new ModalManager();
