/**
 * Environment 1 · Scene 3 — Vision, Mission & Values (storyboard slides 15–35).
 * Copy, sequence, and interactions follow the slide text and speaker notes.
 * Visual treatment matches storyboard colors and layout (slides 15–35).
 */
(function () {
    const VISION = 'To be a leading pharmaceutical company valued for its trusted and diversified products.';
    const MISSION_SHORT = 'Investing in differentiated technologies to deliver high-quality, affordable generic medicines.';
    const MISSION_FULL = 'Investing in differentiated technologies to deliver high-quality, affordable generic medicines for better global healthcare.';

    const VISION_VO = 'Our vision reflects what we aim to build — a trusted organisation known for quality, scale, and impact across the region.';
    const MISSION_VO = 'Our mission comes to life through how we work every day — combining expertise, collaboration, and a commitment to delivering quality medicines that make a difference.';
    const VALUES_VO = 'What guides these actions? Our values. Now let\'s see them in action.';
    const VAULT_VO = 'Four values guide everything we do at Tabuk. In this activity, you\'ll meet real-world situations and match each one to the value it reflects, unlocking each panel as you go. Let\'s see if you can open all four.';
    const SUMMARY_VO = 'You have now explored all four of Tabuk\'s values: Integrity, Respect for People, Stakeholder Centricity, and Results. These values go beyond words. They guide how we work, how we interact with one another, and how we contribute to Tabuk\'s success. You have completed Level 1 of your learning journey. Now, it\'s time to take the next step. In Level 2, we will explore the Dammam plant and get a closer look at our operations. Follow the arrows back to the reception area, where you will find the digital kiosk to begin your next journey.';

    const SUPPORTS = [
        { id: 'office', label: 'Office / facility', image: 'assets/images/vmv_office.png' },
        { id: 'plant', label: 'Manufacturing', image: 'assets/images/vmv_plant.png' },
        { id: 'lab', label: 'Quality / lab', image: 'assets/images/vmv_lab.png' }
    ];

    const HOTSPOTS = [
        {
            lead: 'Aim for',
            title: 'EXCELLENCE',
            points: ['Set high standards', 'Drive accountability', 'Execute flawlessly']
        },
        {
            lead: 'Win through',
            title: 'COLLABORATION',
            points: ['Communicate well', 'Build relationships', 'Influence']
        },
        {
            lead: 'Have a',
            title: 'BUSINESS MINDSET',
            points: ['Know our business', 'Think analytically', 'Be open to change']
        }
    ];

    const VALUES = [
        {
            id: 'integrity',
            name: 'Integrity',
            short: 'Doing the right thing even when it\'s difficult.',
            icon: 'assets/images/vmv_icons/integrity.svg'
        },
        {
            id: 'respect',
            name: 'Respect for People',
            short: 'Supporting each other to do our best work.',
            icon: 'assets/images/vmv_icons/respect.svg'
        },
        {
            id: 'stakeholder',
            name: 'Stakeholder Centric',
            short: 'Considering impact on all who depend on us.',
            icon: 'assets/images/vmv_icons/stakeholder.svg'
        },
        {
            id: 'results',
            name: 'Results',
            short: 'Delivering outcomes that matter.',
            summary: 'Delivering outcomes that matter with quality.',
            icon: 'assets/images/vmv_icons/results.svg'
        }
    ];

    const VALUE_ICONS = {
        integrity: '<svg class="vmv-value-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 6 L38 12 V24 C38 33.5 31.5 40.5 24 43 C16.5 40.5 10 33.5 10 24 V12 Z" stroke="currentColor" stroke-width="2.25" stroke-linejoin="round"/><path d="M17.5 24.5 L22 29 L31 18.5" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        respect: '<svg class="vmv-value-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="18" cy="16" r="5" stroke="currentColor" stroke-width="2.25"/><circle cx="31" cy="16" r="5" stroke="currentColor" stroke-width="2.25"/><path d="M8.5 36.5 C9.5 29.5 13.5 26 18 26 C20.5 26 22.6 27.1 24 28.8 C25.4 27.1 27.5 26 30 26 C34.5 26 38.5 29.5 39.5 36.5" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        stakeholder: '<svg class="vmv-value-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="5" stroke="currentColor" stroke-width="2.25"/><circle cx="24" cy="9" r="3.5" stroke="currentColor" stroke-width="2.25"/><circle cx="37" cy="31.5" r="3.5" stroke="currentColor" stroke-width="2.25"/><circle cx="11" cy="31.5" r="3.5" stroke="currentColor" stroke-width="2.25"/><path d="M24 19 V12.5 M28.2 26.8 L34.2 30.2 M19.8 26.8 L13.8 30.2" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"/></svg>',
        results: '<svg class="vmv-value-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M10 34 V26 M19 34 V20 M28 34 V24 M37 34 V14" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"/><path d="M10 14 L19 22 L28 18 L37 10" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/><circle cx="37" cy="10" r="2.25" stroke="currentColor" stroke-width="2"/></svg>',
        check: '<svg class="vmv-value-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="2.25"/><path d="M16.5 24.5 L21.5 29.5 L32 18" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        lock: '<svg class="vmv-corner-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10.25 V7.4 a4 4 0 0 1 8 0 v2.85" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="5" y="10.25" width="14" height="10" rx="2" fill="currentColor"/><circle cx="12" cy="15.2" r="1.35" fill="#ffffff"/></svg>',
        unlock: '<svg class="vmv-corner-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10.25 V7.1 a4 4 0 0 1 7.7 -1.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="5" y="10.25" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M9.8 15.5 L11.5 17.1 L15.1 13.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        key: '<svg class="vmv-corner-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.2" cy="10.2" r="3.6" fill="none" stroke="currentColor" stroke-width="2.3"/><circle cx="8.2" cy="10.2" r="1.15" fill="currentColor"/><path d="M11.4 10.2 H20.2 M17.2 10.2 V13.6 M19.4 10.2 V12.6" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    const SCENARIOS = [
        {
            prompt: 'A supplier offers a shortcut that speeds up delivery, but it skips a critical quality check.',
            drag: 'DRAG this card onto the correct value panel.',
            answer: 'integrity',
            wrongTitle: 'Not quite — try again',
            wrongHint: 'Speed is valuable — but at Tabuk, we never compromise on quality. Think about what principle guides that conviction.',
            wrongVo: 'That value is important at Tabuk — but it doesn\'t quite capture what\'s being tested here. Think about what choosing quality over shortcuts really represents. Try again.',
            askVo: 'Here\'s your first situation. A supplier wants to skip a quality check to save time. Which of Tabuk\'s four values does this test? Drag the scenario card to the panel you think it matches.',
            correctTitle: 'That\'s it! Panel unlocked.',
            reveal: 'Doing the right thing, even when it\'s difficult — especially when shortcuts tempt us.',
            correctVo: 'Exactly right. Choosing to uphold the quality check even when it slows things down is what Integrity looks like in practice at Tabuk. One panel unlocked. Three to go.'
        },
        {
            prompt: 'A colleague is struggling with a new process and falling behind. The deadline is today.',
            drag: 'DRAG this card onto the correct value panel.',
            answer: 'respect',
            wrongTitle: 'Not quite — try again',
            wrongHint: 'Think about the relationship between colleagues. Which value speaks directly to how Tabuk people support one another?',
            wrongVo: 'Close, but this scenario is really about the people around you. How do we treat colleagues at Tabuk? Which value says something specific about that?',
            askVo: 'One panel is already yours. Here\'s your second scenario. A colleague is struggling and falling behind. What does Tabuk\'s culture call you to do here and which value does it reflect?',
            correctTitle: 'Vault panel unlocked!',
            reveal: 'Supporting each other so everyone can do their best work — not leaving colleagues behind.',
            correctVo: 'Yes — offering to help and flagging the delay shows Respect for People. At Tabuk, we lift each other up. Two panels open. Two more to go.'
        },
        {
            prompt: 'You spot a process error that won\'t affect your team but if left unchecked, it could reach patients downstream.',
            drag: 'DRAG this card onto the correct value panel.',
            answer: 'stakeholder',
            wrongTitle: 'Not quite — try again',
            wrongHint: 'The error doesn\'t affect your results — but it does affect others. Which value is about those \'others\' beyond your team?',
            wrongVo: 'Think about who is affected — not just internally, but further along the chain. Patients, partners, communities. Which value names that wider circle?',
            askVo: 'Two panels open, two to go. This scenario asks you to think beyond your immediate team — to everyone affected by what we do. Which value drives that kind of thinking?',
            correctTitle: 'Third panel cracked open!',
            reveal: 'Considering the impact on all who depend on us — patients, partners, communities — not just our immediate team.',
            correctVo: 'That\'s the Stakeholder Centric mindset — always thinking about who downstream is affected by our decisions. Three panels open. One final vault to unlock.'
        },
        {
            prompt: 'You\'re managing competing priorities and a tight deadline. Speed, tasks, quality, and your team all demand attention.',
            drag: 'DRAG to the value that defines success at Tabuk.',
            final: true,
            answer: 'results',
            wrongTitle: 'Not the full picture — try again',
            wrongHint: 'Speed matters — but it doesn\'t define success at Tabuk. There\'s something deeper that measures how well we\'ve done.',
            wrongVo: 'Hmm — speed is a factor, but it\'s not what defines success at Tabuk. Think about what the outcome of your work ultimately needs to be. What do we measure?',
            askVo: 'You\'re almost there — three values unlocked, one vault to go. This final scenario asks you what success really means at Tabuk. When everything is competing for your attention, what ultimately defines great work here?',
            correctTitle: 'Results — the final vault is open!',
            banner: 'VAULT COMPLETE — All four values unlocked!',
            reveal: 'Delivering high-quality outcomes that make a real difference to patients — not just completing tasks but doing them with impact.',
            correctVo: 'That\'s it — Results. At Tabuk, success isn\'t just moving fast or checking boxes. It\'s delivering quality outcomes that matter to real people. All four vaults are open.'
        }
    ];

    function esc(value) {
        return String(value).replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    }

    class ValuesExperience {
        constructor(app) {
            this.app = app;
            this.root = document.getElementById('values-experience');
            this.stage = document.getElementById('values-stage');
            this.titleEl = document.getElementById('values-chrome-title');
            this.metaEl = document.getElementById('values-chrome-meta');
            this.timers = [];
            this.isOpen = false;
            this.phase = 'vision';
            this.visionStep = 0;
            this.missionRevealed = 0;
            this.scenarioIndex = 0;
            this.scenarioPhase = 'ask';
            this.unlocked = new Set();
            this.vo = '';
            this._drag = null;

            const closeBtn = document.getElementById('values-experience-close');
            if (closeBtn) closeBtn.addEventListener('click', () => this.close());
            this._onWindowPointerMove = (event) => this._onPointerMove(event);
            this._onWindowPointerUp = (event) => this._onPointerUp(event);
            if (this.stage) {
                this.stage.addEventListener('click', (event) => this._onStageClick(event));
                this.stage.addEventListener('pointerdown', (event) => this._onPointerDown(event));
            }
        }

        open(options = {}) {
            if (!this.root || !this.stage) return;
            this._clearTimers();
            this.isOpen = true;
            this.unlocked = new Set();
            this.scenarioIndex = 0;
            this.scenarioPhase = 'ask';
            this.missionRevealed = 0;
            this.visionStep = 0;

            if (this.app && typeof this.app.hideTimelineCinematic === 'function') {
                this.app.hideTimelineCinematic({ restoreScene: false });
            }
            if (this.app && typeof this.app._stopCinematicSpeech === 'function') {
                this.app._stopCinematicSpeech();
            }
            this._setSceneChromeHidden(true);

            this.root.hidden = false;
            this.root.classList.remove('is-open', 'is-summary', 'is-vault', 'is-values', 'is-vault-complete', 'is-expanding');
            requestAnimationFrame(() => {
                this.root.classList.add('is-open', 'is-expanding');
                setTimeout(() => this.root && this.root.classList.remove('is-expanding'), 700);
            });

            if (options.devJump) {
                this.devJump(options.devJump, { silent: true });
                return;
            }

            if (options.start === 'vault') {
                this._showVaultIntro();
            } else {
                this._showVision(0);
                this._later(2600, () => this._showVision(1));
                this._later(5200, () => this._showVision(2));
            }
        }

        /** DEV — jump to a Values phase without auto-advance timers. */
        devJump(target, { silent = true } = {}) {
            if (!this.root || !this.stage) return;
            this._clearTimers();
            if (!this.isOpen) {
                this.open({ devJump: target });
                return;
            }
            if (this.app && typeof this.app._stopCinematicSpeech === 'function') {
                this.app._stopCinematicSpeech();
            }
            this.vo = '';
            if (target === 'vision') {
                this.phase = 'vision';
                this.visionStep = 2;
                if (!silent) this.vo = VISION_VO;
                this._render();
                return;
            }
            if (target === 'mission') {
                this.phase = 'mission';
                this.missionRevealed = 3;
                if (!silent) this.vo = MISSION_VO;
                this._render();
                return;
            }
            if (target === 'values') {
                this.phase = 'values';
                if (!silent) {
                    this.vo = VALUES_VO;
                    this._speak(VALUES_VO);
                } else {
                    this._render();
                }
                return;
            }
            if (target === 'vault') {
                this.unlocked = new Set();
                this.scenarioIndex = 0;
                this.scenarioPhase = 'ask';
                this.phase = 'vault-intro';
                if (!silent) {
                    this.vo = VAULT_VO;
                    this._speak(VAULT_VO);
                }
                this._render();
                return;
            }
            if (target === 'summary') {
                this.unlocked = new Set(['integrity', 'respect', 'stakeholder', 'results']);
                this.phase = 'summary';
                if (!silent) {
                    this.vo = SUMMARY_VO;
                    this._speak(SUMMARY_VO);
                }
                this._render();
                return;
            }
            if (typeof target === 'string' && target.startsWith('scenario:')) {
                const idx = Math.max(0, Math.min(SCENARIOS.length - 1, parseInt(target.split(':')[1], 10) || 0));
                const prior = ['integrity', 'respect', 'stakeholder', 'results'].slice(0, idx);
                this.unlocked = new Set(prior);
                this.phase = 'scenario';
                this.scenarioIndex = idx;
                this.scenarioPhase = 'ask';
                if (!silent) {
                    this.vo = SCENARIOS[idx].askVo;
                    this._speak(SCENARIOS[idx].askVo);
                }
                this._render();
            }
        }

        close(options = {}) {
            const restore = options.restore !== false;
            this.isOpen = false;
            this._clearTimers();
            this._cancelDrag();
            if (this.app && typeof this.app._stopCinematicSpeech === 'function') {
                this.app._stopCinematicSpeech();
            }
            if (this.root) {
                this.root.classList.remove('is-open', 'is-summary', 'is-vault', 'is-values', 'is-vault-complete', 'is-expanding');
                this.root.hidden = true;
            }
            if (restore) this._setSceneChromeHidden(false);
        }

        goToLift() {
            this.close({ restore: false });
            this._setSceneChromeHidden(false);
            const scene = window.COURSE_DATA && window.COURSE_DATA.scenes.reception;
            const hotspot = scene && (scene.hotspots || []).find((item) => item.id === 'next_destination');
            if (!this.app || !hotspot || typeof this.app.playPortalTransitionVideo !== 'function') return;
            if (!this.app.currentSceneId) this.app.currentSceneId = 'reception';
            if (typeof this.app.unlockLiftHotspot === 'function') this.app.unlockLiftHotspot();
            else this.app.receptionLiftUnlocked = true;
            this.app.playPortalTransitionVideo(hotspot);
        }

        _showVision(step) {
            if (!this.isOpen) return;
            if (step !== 0 && this.phase !== 'vision') return;
            if (this.phase === 'vision' && step < this.visionStep) return;
            this.phase = 'vision';
            this.visionStep = step;
            if (step === 0) this.vo = VISION_VO;
            this._speak(step === 0 ? VISION_VO : null);
            this._render();
        }

        _enterMission() {
            if (!this.isOpen || this.phase !== 'vision' || this.visionStep < 2) return;
            this._clearTimers();
            this.phase = 'mission';
            this.missionRevealed = 1;
            this.vo = MISSION_VO;
            this._speak(MISSION_VO);
            this._render();
        }

        _revealHotspot(index) {
            if (this.phase !== 'mission') return;
            if (index !== this.missionRevealed) return;
            this.missionRevealed = index + 1;
            this._render();
        }

        _enterValues() {
            if (this.phase !== 'mission' || this.missionRevealed < 3) return;
            this.phase = 'values';
            this.vo = VALUES_VO;
            this._speak(VALUES_VO);
            this._render();
        }

        _showVaultIntro() {
            if (!this.isOpen) return;
            this.phase = 'vault-intro';
            this.vo = VAULT_VO;
            this._speak(VAULT_VO);
            this._render();
        }

        _beginScenario(index) {
            if (!this.isOpen) return;
            this.phase = 'scenario';
            this.scenarioIndex = index;
            this.scenarioPhase = 'ask';
            this.vo = SCENARIOS[index].askVo;
            this._speak(SCENARIOS[index].askVo);
            this._render();
        }

        _resolveChoice(valueId) {
            if (this.phase !== 'scenario') return;
            if (this.scenarioPhase === 'correct' || this._resolving) return;
            this._resolving = true;
            const scenario = SCENARIOS[this.scenarioIndex];
            if (!scenario || !valueId) {
                this._resolving = false;
                return;
            }

            if (valueId === scenario.answer) {
                this.unlocked.add(valueId);
                this.scenarioPhase = 'correct';
                this.vo = scenario.correctVo;
                this._speak(scenario.correctVo);
                this._render();
                this._burstParticles(valueId, this.unlocked.size === 4);
                if (this.app && typeof this.app.playTone === 'function') this.app.playTone(660, 'sine', 0.12);
                setTimeout(() => { this._resolving = false; }, 400);
                return;
            }

            const panel = this.stage && this.stage.querySelector(`[data-value="${valueId}"]`);
            if (panel) {
                panel.classList.add('is-wrong');
                panel.classList.add('is-pulse-wrong');
            }
            this._snapCardBack();
            if (navigator.vibrate) navigator.vibrate(70);
            if (this.app && typeof this.app.playTone === 'function') this.app.playTone(196, 'sine', 0.12);
            this.scenarioPhase = 'wrong';
            this.vo = scenario.wrongVo;
            this._speak(scenario.wrongVo);
            setTimeout(() => {
                if (!this.isOpen || this.phase !== 'scenario') {
                    this._resolving = false;
                    return;
                }
                this._render();
                this._resolving = false;
            }, 420);
        }

        _snapCardBack() {
            const card = this.stage && this.stage.querySelector('.vmv-card');
            if (!card) return;
            card.classList.add('is-snap-back');
            setTimeout(() => card.classList.remove('is-snap-back'), 420);
        }

        _burstParticles(valueId, grand) {
            if (!this.stage) return;
            const host = this.stage.querySelector(`[data-value="${valueId}"]`) || this.stage.querySelector('.vmv-panels');
            if (!host) return;
            const burst = document.createElement('div');
            burst.className = grand ? 'vmv-particles is-grand' : 'vmv-particles';
            burst.setAttribute('aria-hidden', 'true');
            for (let i = 0; i < (grand ? 12 : 6); i += 1) {
                const speck = document.createElement('span');
                speck.style.setProperty('--i', String(i));
                speck.style.setProperty('--a', `${(i / (grand ? 12 : 6)) * 360}deg`);
                burst.appendChild(speck);
            }
            host.appendChild(burst);
            setTimeout(() => burst.remove(), 900);
        }

        _continueAfterCorrect() {
            if (this.phase !== 'scenario' || this.scenarioPhase !== 'correct') return;
            if (this.scenarioIndex < SCENARIOS.length - 1) {
                this._beginScenario(this.scenarioIndex + 1);
            } else {
                this._showSummary();
            }
        }

        _showSummary() {
            this.phase = 'summary';
            this.vo = SUMMARY_VO;
            this._speak(SUMMARY_VO);
            this._render();
        }

        _slideNumber() {
            if (this.phase === 'vision') return 15 + this.visionStep;
            if (this.phase === 'mission') return 17 + this.missionRevealed;
            if (this.phase === 'values') return 21;
            if (this.phase === 'vault-intro') return 22;
            if (this.phase === 'summary') return 35;
            const bases = [23, 26, 29, 32];
            const base = bases[this.scenarioIndex] || 23;
            if (this.scenarioPhase === 'wrong') return base + 1;
            if (this.scenarioPhase === 'correct') return base + 2;
            return base;
        }

        _chrome() {
            if (this.phase === 'vault-intro') {
                return {
                    title: 'TABUK PHARMACEUTICALS  ·  Induction  ·  What Guides Us',
                    meta: 'E1-S3  ·  ENVIRONMENT 1'
                };
            }
            if (this.phase === 'scenario') {
                const n = this.scenarioIndex + 1;
                const scenario = SCENARIOS[this.scenarioIndex];
                let meta = `E1-S3  ·  ${n} of 4`;
                if (scenario.final) meta += '  ·  FINAL VAULT';
                if (this.scenarioPhase === 'wrong') meta += '  ·  Wrong attempt';
                if (this.scenarioPhase === 'correct') meta += '  ·  Correct!';
                return {
                    title: 'TABUK PHARMACEUTICALS  ·  Induction  ·  What Guides Us  ·  Values Vault',
                    meta
                };
            }
            if (this.phase === 'summary') {
                return {
                    title: 'TABUK PHARMACEUTICALS  ·  Induction  ·  What Guides Us  ·  Summary',
                    meta: 'E1-S3  ·  ENVIRONMENT 1'
                };
            }
            return {
                title: 'TABUK PHARMACEUTICALS  ·  Induction  ·  Vision, Mission & Values',
                meta: 'E1-S3  ·  ENVIRONMENT 1'
            };
        }

        _render() {
            if (!this.stage || !this.root) return;
            const chrome = this._chrome();
            if (this.titleEl) this.titleEl.textContent = chrome.title;
            if (this.metaEl) this.metaEl.textContent = chrome.meta;
            this.root.classList.toggle('is-summary', this.phase === 'summary');
            this.root.classList.toggle('is-vault', this.phase === 'vault-intro' || this.phase === 'scenario');
            this.root.classList.toggle('is-values', this.phase === 'values');
            this.root.classList.toggle('is-vault-complete', this.phase === 'scenario' && this.scenarioPhase === 'correct' && this.unlocked.size === 4);
            this.root.dataset.phase = this.phase;
            this.root.dataset.slide = String(this._slideNumber());
            this.root.dataset.vo = this.vo || '';

            let body = '';
            if (this.phase === 'vision') body = this._htmlVision();
            else if (this.phase === 'mission') body = this._htmlMission();
            else if (this.phase === 'values') body = this._htmlValues();
            else if (this.phase === 'vault-intro') body = this._htmlVaultIntro();
            else if (this.phase === 'scenario') body = this._htmlScenario();
            else if (this.phase === 'summary') body = this._htmlSummary();

            this.stage.innerHTML = body + this._htmlCaption();
        }

        _htmlCaption() {
            if (!this.vo) return '';
            return `<p class="vmv-vo" data-vo-caption>${esc(this.vo)}</p>`;
        }

        _htmlSupportSlots(step) {
            return SUPPORTS.map((item, index) => {
                const state = index < step ? 'is-done' : index === step ? 'is-active' : 'is-pending';
                const mark = index < step ? '✓' : index === step ? '●' : '○';
                const img = index <= step
                    ? `<img src="${esc(item.image)}" alt="${esc(item.label)}">`
                    : '';
                return `<figure class="vmv-support-slot ${item.id} ${state}">
                    ${img}
                    <figcaption>${esc(item.label)} <span aria-hidden="true">${mark}</span></figcaption>
                </figure>`;
            }).join('');
        }

        _htmlVision() {
            const step = this.visionStep;
            const missionLive = step >= 2;
            return `
                <div class="vmv-board is-vision is-step-${step}">
                    <div class="vmv-waterline" aria-hidden="true"></div>
                    <figure class="vmv-iceberg">
                        <img src="assets/images/vmv_iceberg.png" alt="">
                    </figure>
                    <article class="vmv-panel vmv-vision">
                        <h2 class="vmv-kicker">
                            <span class="vmv-kicker-icon" aria-hidden="true"><svg class="vmv-kicker-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12 C4.8 7.4 8.2 5.2 12 5.2 C15.8 5.2 19.2 7.4 22 12 C19.2 16.6 15.8 18.8 12 18.8 C8.2 18.8 4.8 16.6 2 12 Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.9"/></svg></span>
                            Vision
                        </h2>
                        <p class="vmv-statement">${esc(VISION)}</p>
                    </article>
                    <article class="vmv-panel vmv-mission ${missionLive ? 'is-live' : 'is-dim'}">
                        <h2 class="vmv-kicker">
                            <span class="vmv-kicker-icon" aria-hidden="true"><svg class="vmv-kicker-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="4.6" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg></span>
                            ${missionLive ? 'Mission →' : 'Mission'}
                        </h2>
                        <p class="vmv-statement">${esc(MISSION_SHORT)}</p>
                    </article>
                    ${this._htmlSupportSlots(step)}
                    ${missionLive ? '<button type="button" class="vmv-footer-prompt" data-action="mission">How does this vision come to life?</button>' : ''}
                </div>`;
        }

        _htmlMission() {
            const revealed = this.missionRevealed;
            const hotspots = HOTSPOTS.map((hotspot, index) => {
                const state = index < revealed - 1 ? 'is-done' : index === revealed - 1 ? 'is-active' : 'is-dim';
                const title = `<span class="vmv-hotspot-lead">${esc(hotspot.lead)}</span> <strong>${esc(hotspot.title)}</strong>`;
                const points = state === 'is-active'
                    ? `<ul>${hotspot.points.map((point) => `<li>${esc(point)}</li>`).join('')}</ul>`
                    : '';
                const mark = state === 'is-done' ? '✓' : state === 'is-active' ? '●' : '○';
                const actionable = index === revealed;
                const nextLabel = actionable ? ' aria-label="Reveal the next mission action"' : '';
                return `<button type="button" class="vmv-hotspot ${state}" data-action="hotspot" data-index="${index}"${nextLabel} ${actionable ? '' : 'disabled'}>
                    <span class="vmv-mark" aria-hidden="true">${mark}</span>
                    <span>${title}${points}</span>
                </button>`;
            }).join('');
            const below = revealed >= 3
                ? `<button type="button" class="vmv-below" data-action="below">Look below the surface  ↓  Our Values</button>
                   <p class="vmv-below-q">What truly drives everything we do?</p>`
                : '';
            return `
                <div class="vmv-board is-mission">
                    <div class="vmv-waterline" aria-hidden="true"></div>
                    <figure class="vmv-iceberg">
                        <img src="assets/images/vmv_iceberg.png" alt="">
                    </figure>
                    <article class="vmv-panel vmv-vision is-quiet">
                        <h2 class="vmv-kicker">
                            <span class="vmv-kicker-icon" aria-hidden="true"><svg class="vmv-kicker-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12 C4.8 7.4 8.2 5.2 12 5.2 C15.8 5.2 19.2 7.4 22 12 C19.2 16.6 15.8 18.8 12 18.8 C8.2 18.8 4.8 16.6 2 12 Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.9"/></svg></span>
                            Vision <span class="vmv-check">✓</span>
                        </h2>
                        <p class="vmv-statement">${esc(VISION)}</p>
                    </article>
                    <article class="vmv-panel vmv-mission is-live">
                        <h2 class="vmv-kicker">
                            <span class="vmv-kicker-icon" aria-hidden="true"><svg class="vmv-kicker-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="4.6" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg></span>
                            Mission
                        </h2>
                        <p class="vmv-statement">${esc(MISSION_FULL)}</p>
                    </article>
                    <div class="vmv-hotspots">${hotspots}</div>
                    ${below}
                </div>`;
        }

        _htmlValues() {
            return `
                <div class="vmv-board vmv-values">
                    <figure class="vmv-iceberg">
                        <img src="assets/images/vmv_iceberg.png" alt="">
                    </figure>
                    <div class="vmv-values-grid">
                        ${VALUES.map((value, index) => `
                            <article class="vmv-value-card vmv-value-${value.id}" style="--i:${index}">
                                <span class="vmv-value-badge" aria-hidden="true">${VALUE_ICONS[value.id]}</span>
                                <div class="vmv-value-copy">
                                    <h3>${esc(value.name)}</h3>
                                    <p>${esc(value.short)}</p>
                                </div>
                            </article>`).join('')}
                    </div>
                    <button type="button" class="vmv-footer-prompt" data-action="vault">These values guide how we work at Tabuk.</button>
                </div>`;
        }

        _htmlVaultIntro() {
            return `
                <div class="vmv-board vmv-vault">
                    <div class="vmv-vault-side">
                        <div class="vmv-vault-head">
                            <h2>The Values Vault</h2>
                            <p>Four values power everything at Tabuk.<br>Can you unlock them all?</p>
                            <div class="vmv-progress-track" aria-hidden="true"><span style="width:${(this.unlocked.size / 4) * 100}%"></span></div>
                            <p class="vmv-progress">${this.unlocked.size} / 4  unlocked</p>
                        </div>
                        <button type="button" class="vmv-instruction-bar" data-action="begin">Read each scenario card, then DRAG it onto the correct value panel to unlock it</button>
                    </div>
                    ${this._htmlPanels()}
                </div>`;
        }

        _htmlScenario() {
            const scenario = SCENARIOS[this.scenarioIndex];
            const n = this.scenarioIndex + 1;
            const isCorrect = this.scenarioPhase === 'correct';
            const isWrong = this.scenarioPhase === 'wrong';
            // Layout order: title → progress → vault complete → question → Scenario N → drag → error → 4 options
            const banner = (isCorrect && scenario.banner)
                ? `<p class="vmv-banner">${esc(scenario.banner)}</p>`
                : '';
            let cardLabel = `Scenario ${n}`;
            if (isWrong) cardLabel = `Scenario ${n} · ${scenario.wrongTitle}`;
            else if (isCorrect) cardLabel = `Scenario ${n} · ${scenario.correctTitle}`;
            const scenarioCard = !isCorrect
                ? `<article class="vmv-card vmv-option-card ${scenario.final ? 'is-final' : ''} ${isWrong ? 'is-feedback' : ''}" data-drag-card>
                        <span class="vmv-corner-key" aria-hidden="true" title="Key">${VALUE_ICONS.key}</span>
                        <p class="vmv-card-label">${esc(cardLabel)}</p>
                        <p class="vmv-card-question">${esc(scenario.prompt)}</p>
                   </article>`
                : '';
            const statusLabel = isCorrect
                ? `<p class="vmv-card-label is-status">${esc(cardLabel)}</p>`
                : '';
            const dragBar = !isCorrect
                ? `<p class="vmv-instruction-bar is-static">${esc(scenario.drag)}</p>`
                : '';
            const errorBar = isWrong
                ? `<p class="vmv-hint" role="status">✕ ${esc(scenario.wrongHint)}</p>`
                : '';
            let extra = '';
            if (isCorrect) {
                const value = VALUES.find((item) => item.id === scenario.answer);
                extra = `
                    <aside class="vmv-reveal">
                        <p class="vmv-reveal-kicker">Value unlocked</p>
                        <h3>${esc(value.name)}</h3>
                        <p>${esc(scenario.reveal)}</p>
                    </aside>
                    <button type="button" class="vmv-next" data-action="continue">${n === 4 ? 'All four values' : 'Continue'}</button>`;
            }
            return `
                <div class="vmv-board vmv-vault is-scenario ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''} ${scenario.final ? 'is-final-round' : ''}">
                    <div class="vmv-vault-side">
                        <div class="vmv-vault-head">
                            <h2>The Values Vault</h2>
                            <div class="vmv-progress-track" aria-hidden="true"><span style="width:${(this.unlocked.size / 4) * 100}%"></span></div>
                            <p class="vmv-progress">${this.unlocked.size} / 4  unlocked</p>
                            ${scenario.final && !isCorrect ? '<p class="vmv-final">Final vault</p>' : ''}
                        </div>
                        ${banner}
                        ${statusLabel}
                        ${scenarioCard}
                        ${dragBar}
                        ${extra}
                        ${errorBar}
                    </div>
                    ${this._htmlPanels()}
                </div>`;
        }

        _htmlPanels() {
            // Drop targets only — answers must come from dragging the scenario card
            return `<div class="vmv-panels">${VALUES.map((value) => {
                const open = this.unlocked.has(value.id);
                const justOpened = open && this.phase === 'scenario' && this.scenarioPhase === 'correct'
                    && SCENARIOS[this.scenarioIndex] && SCENARIOS[this.scenarioIndex].answer === value.id;
                const iconSvg = VALUE_ICONS[value.id] || VALUE_ICONS.integrity;
                const cornerIcon = open ? VALUE_ICONS.unlock : VALUE_ICONS.lock;
                return `<article class="vmv-panel-card vmv-value-${value.id} ${open ? 'is-open' : 'is-locked'} ${justOpened ? 'is-opening' : ''}" data-value="${value.id}" data-drop-target="true">
                    <span class="vmv-corner-lock" aria-hidden="true" title="${open ? 'Unlocked' : 'Locked'}">${cornerIcon}</span>
                    <span class="vmv-lock" aria-hidden="true">${iconSvg}</span>
                    <h3>${esc(value.name)}</h3>
                    <p>${esc(value.short)}</p>
                </article>`;
            }).join('')}</div>`;
        }

        _htmlSummary() {
            return `
                <div class="vmv-board vmv-summary">
                    <div class="vmv-summary-head">
                        <p class="vmv-guide">These values guide how we work at Tabuk.</p>
                        <p class="vmv-question">As you begin your journey here, which value will guide the way you work?</p>
                    </div>
                    <div class="vmv-summary-grid">
                        ${VALUES.map((value, index) => `
                            <article class="vmv-value-card vmv-value-${value.id} is-done" style="--i:${index}">
                                <span class="vmv-check" aria-hidden="true">\u2713</span>
                                <span class="vmv-value-badge" aria-hidden="true">${VALUE_ICONS[value.id]}</span>
                                <div class="vmv-value-copy">
                                    <h3>${esc(value.name)}</h3>
                                    <p>${esc(value.summary || value.short)}</p>
                                </div>
                            </article>`).join('')}
                    </div>
                    <p class="vmv-dots" aria-hidden="true">\u25CF \u25CF \u25CF \u25CF</p>
                    <p class="vmv-level2-cue">Follow the arrows back to the reception area to begin Level 2.</p>
                    <button type="button" class="vmv-lift" data-action="lift">Lift</button>
                </div>`;
        }

        _onStageClick(event) {
            const el = event.target.closest('[data-action]');
            if (!el || !this.stage.contains(el)) return;
            if (this._drag && this._drag.moved) return;
            const action = el.getAttribute('data-action');
            if (action === 'mission') this._enterMission();
            else if (action === 'hotspot') this._revealHotspot(Number(el.getAttribute('data-index')));
            else if (action === 'below') this._enterValues();
            else if (action === 'vault') this._showVaultIntro();
            else if (action === 'begin') this._beginScenario(0);
            else if (action === 'continue') this._continueAfterCorrect();
            else if (action === 'lift') this.goToLift();
        }

        _bindWindowDrag() {
            window.addEventListener('pointermove', this._onWindowPointerMove, { passive: false });
            window.addEventListener('pointerup', this._onWindowPointerUp);
            window.addEventListener('pointercancel', this._onWindowPointerUp);
        }

        _unbindWindowDrag() {
            window.removeEventListener('pointermove', this._onWindowPointerMove);
            window.removeEventListener('pointerup', this._onWindowPointerUp);
            window.removeEventListener('pointercancel', this._onWindowPointerUp);
        }

        _onPointerDown(event) {
            const card = event.target.closest('[data-drag-card]');
            if (!card || event.button > 0) return;
            event.preventDefault();
            const rect = card.getBoundingClientRect();
            this._drag = {
                card,
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                width: rect.width,
                moved: false
            };
            card.classList.add('is-dragging');
            card.style.transform = 'none';
            try { card.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
            this._bindWindowDrag();
        }

        _onPointerMove(event) {
            if (!this._drag || event.pointerId !== this._drag.pointerId) return;
            if (event.cancelable) event.preventDefault();
            const dx = event.clientX - this._drag.x;
            const dy = event.clientY - this._drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 4) this._drag.moved = true;
            const card = this._drag.card;
            card.style.position = 'fixed';
            card.style.left = `${event.clientX - this._drag.offsetX}px`;
            card.style.top = `${event.clientY - this._drag.offsetY}px`;
            card.style.width = `${this._drag.width}px`;
            card.style.margin = '0';
            card.style.transform = 'none';
            card.style.zIndex = '20';
        }

        _onPointerUp(event) {
            if (!this._drag || (event.pointerId != null && event.pointerId !== this._drag.pointerId)) return;
            const drag = this._drag;
            this._unbindWindowDrag();
            this._drag = null;
            const card = drag.card;
            card.classList.remove('is-dragging');
            card.style.position = '';
            card.style.left = '';
            card.style.top = '';
            card.style.width = '';
            card.style.margin = '';
            card.style.zIndex = '';
            card.style.transform = '';
            if (!drag.moved) return;
            card.style.pointerEvents = 'none';
            const hit = document.elementFromPoint(event.clientX, event.clientY);
            card.style.pointerEvents = '';
            const panel = hit && hit.closest('[data-drop-target="true"][data-value]');
            if (panel) this._resolveChoice(panel.getAttribute('data-value'));
            else this._snapCardBack();
        }

        _cancelDrag() {
            this._unbindWindowDrag();
            if (this._drag && this._drag.card) {
                const card = this._drag.card;
                card.classList.remove('is-dragging');
                card.style.position = '';
                card.style.left = '';
                card.style.top = '';
                card.style.width = '';
                card.style.margin = '';
                card.style.zIndex = '';
                card.style.transform = '';
            }
            this._drag = null;
        }

        _speak(text) {
            if (!text || !this.app || typeof this.app._speakCinematicLine !== 'function') return;
            this.app._speakCinematicLine(text);
        }

        _later(ms, fn) {
            const id = setTimeout(() => {
                if (!this.isOpen) return;
                fn();
            }, ms);
            this.timers.push(id);
        }

        _clearTimers() {
            this.timers.forEach((id) => clearTimeout(id));
            this.timers = [];
        }

        _setSceneChromeHidden(hidden) {
            const hotspotsLayer = document.getElementById('hotspots-layer');
            const hud = document.getElementById('hud-layer');
            if (hotspotsLayer) hotspotsLayer.style.visibility = hidden ? 'hidden' : '';
            if (hud) hud.style.visibility = hidden ? 'hidden' : '';
            if (!hidden && this.app && this.app.hotspots && this.app.currentSceneId && window.COURSE_DATA) {
                const scene = window.COURSE_DATA.scenes[this.app.currentSceneId];
                if (scene && typeof this.app._buildHotspotList === 'function') {
                    this.app.hotspots.setHotspots(this.app._buildHotspotList(scene));
                }
            }
        }
    }

    window.ValuesExperience = ValuesExperience;
})();
