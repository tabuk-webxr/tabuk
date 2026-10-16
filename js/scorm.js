/**
 * SCORM 1.2 API Wrapper & Diagnostic Bridge
 * Supports official SCORM 1.2 LMS runtime environments (Cornerstone, SuccessFactors, Moodle, SCORM Cloud)
 * and provides a simulated mock LMS for standalone browser testing.
 *
 * Set SCORM_ENABLED to true when packaging for LMS again.
 */
window.SCORM_ENABLED = false;

class ScormController {
    constructor() {
        this.api = null;
        this.isInitialized = false;
        this.isStandalone = false;
        this.startTime = new Date();
        this.mockData = {
            'cmi.core.student_name': 'Learner, Tabuk',
            'cmi.core.student_id': 'EMP-2026-0922',
            'cmi.core.lesson_status': 'not attempted',
            'cmi.core.score.raw': '0',
            'cmi.core.score.min': '0',
            'cmi.core.score.max': '100',
            'cmi.core.session_time': '00:00:00',
            'cmi.suspend_data': ''
        };
        this.logs = [];
    }

    init() {
        this.api = this.findAPI(window);
        if (!this.api && window.opener) {
            this.api = this.findAPI(window.opener);
        }

        if (this.api) {
            this.log('LMS API found in window hierarchy.');
            const result = this.api.LMSInitialize('');
            if (result === 'true' || result === true) {
                this.isInitialized = true;
                this.log('SCORM LMSInitialize successful.');
                const status = this.get('cmi.core.lesson_status');
                if (status === 'not attempted' || !status) {
                    this.set('cmi.core.lesson_status', 'incomplete');
                    this.commit();
                }
            } else {
                this.log('SCORM LMSInitialize returned false. Using Standalone mode.');
                this.isStandalone = true;
            }
        } else {
            this.log('No LMS API found. Operating in Standalone / Preview Mode.');
            this.isStandalone = true;
            this.isInitialized = true;
            this.mockData['cmi.core.lesson_status'] = 'incomplete';
        }

        window.addEventListener('beforeunload', () => this.terminate());
        return this.isInitialized;
    }

    findAPI(win) {
        let attempts = 0;
        let currentWin = win;
        while (currentWin && attempts < 10) {
            try {
                if (currentWin.API) return currentWin.API;
                if (currentWin.parent && currentWin.parent !== currentWin) {
                    currentWin = currentWin.parent;
                } else {
                    break;
                }
            } catch (e) {
                break;
            }
            attempts++;
        }
        return null;
    }

    get(element) {
        if (this.api && !this.isStandalone) {
            const val = this.api.LMSGetValue(element);
            this.log(`LMSGetValue('${element}') => '${val}'`);
            return val;
        } else {
            const val = this.mockData[element] || '';
            this.log(`[Mock] LMSGetValue('${element}') => '${val}'`);
            return val;
        }
    }

    set(element, value) {
        const valStr = String(value);
        if (this.api && !this.isStandalone) {
            const res = this.api.LMSSetValue(element, valStr);
            this.log(`LMSSetValue('${element}', '${valStr}') => ${res}`);
            return res === 'true' || res === true;
        } else {
            this.mockData[element] = valStr;
            this.log(`[Mock] LMSSetValue('${element}', '${valStr}') => true`);
            return true;
        }
    }

    commit() {
        if (this.api && !this.isStandalone) {
            const res = this.api.LMSCommit('');
            this.log(`LMSCommit => ${res}`);
            return res === 'true' || res === true;
        } else {
            this.log('[Mock] LMSCommit => true');
            return true;
        }
    }

    recordScore(score, passed = true) {
        this.set('cmi.core.score.raw', Math.round(score));
        this.set('cmi.core.score.min', 0);
        this.set('cmi.core.score.max', 100);
        const status = passed ? 'passed' : 'failed';
        this.set('cmi.core.lesson_status', status);
        this.commit();
        this.log(`Recorded score ${score}% with status: ${status}`);
    }

    terminate() {
        if (!this.isInitialized) return;
        const sessionTime = this.formatSessionTime(new Date() - this.startTime);
        this.set('cmi.core.session_time', sessionTime);
        this.commit();
        if (this.api && !this.isStandalone) {
            this.api.LMSFinish('');
            this.log('LMSFinish called.');
        } else {
            this.log('[Mock] LMSFinish called.');
        }
        this.isInitialized = false;
    }

    formatSessionTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSec % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    log(msg) {
        const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.logs.push(entry);
        console.log(`%c[SCORM 1.2]`, 'color:#00A859; font-weight:bold;', msg);
        const logDisplay = document.getElementById('scorm-console-logs');
        if (logDisplay) {
            const line = document.createElement('div');
            line.className = 'scorm-log-line';
            line.textContent = entry;
            logDisplay.appendChild(line);
            logDisplay.scrollTop = logDisplay.scrollHeight;
        }
    }
}

if (window.SCORM_ENABLED) {
    window.scorm = new ScormController();
} else {
    window.scorm = null;
    console.log('[SCORM] Disabled for local preview');
}
