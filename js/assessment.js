/**
 * Induction Assessment Engine
 * Handles interactive question flow, scoring, feedback, and SCORM 1.2 status reporting
 */

class AssessmentEngine {
    constructor(containerId, onComplete) {
        this.container = document.getElementById(containerId);
        this.onComplete = onComplete;
        this.questions = window.COURSE_DATA.assessment || [];
        this.currentIndex = 0;
        this.userAnswers = [];
        this.isSubmitted = false;
    }

    start() {
        this.currentIndex = 0;
        this.userAnswers = new Array(this.questions.length).fill(null);
        this.isSubmitted = false;
        this.renderQuestion();
    }

    renderQuestion() {
        const q = this.questions[this.currentIndex];
        const selectedOption = this.userAnswers[this.currentIndex];

        this.container.innerHTML = `
            <div class="assessment-container">
                <div class="assessment-header">
                    <div class="assessment-progress-badge">Question ${this.currentIndex + 1} of ${this.questions.length}</div>
                    <div class="assessment-progress-bar">
                        <div class="assessment-progress-fill" style="width: ${((this.currentIndex + 1) / this.questions.length) * 100}%"></div>
                    </div>
                </div>

                <div class="assessment-body">
                    <h3 class="assessment-question">${q.question}</h3>
                    <div class="assessment-options">
                        ${q.options.map((opt, idx) => `
                            <button class="option-btn ${selectedOption === idx ? 'selected' : ''}" onclick="window.assessmentEngine.selectOption(${idx})">
                                <span class="option-marker">${String.fromCharCode(65 + idx)}</span>
                                <span class="option-text">${opt}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="assessment-footer">
                    <button class="btn btn-secondary" onclick="window.assessmentEngine.prevQuestion()" ${this.currentIndex === 0 ? 'disabled' : ''}>
                        Previous
                    </button>
                    ${this.currentIndex < this.questions.length - 1 ? `
                        <button class="btn btn-primary" onclick="window.assessmentEngine.nextQuestion()" ${selectedOption === null ? 'disabled' : ''}>
                            Next Question
                        </button>
                    ` : `
                        <button class="btn btn-success" onclick="window.assessmentEngine.submit()" ${selectedOption === null ? 'disabled' : ''}>
                            Submit Assessment
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    selectOption(index) {
        this.userAnswers[this.currentIndex] = index;
        this.renderQuestion();
    }

    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.renderQuestion();
        }
    }

    prevQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderQuestion();
        }
    }

    submit() {
        let correctCount = 0;
        this.questions.forEach((q, idx) => {
            if (this.userAnswers[idx] === q.correctIndex) {
                correctCount++;
            }
        });

        const scorePercent = Math.round((correctCount / this.questions.length) * 100);
        const passScore = window.COURSE_DATA.meta.passingScore || 75;
        const passed = scorePercent >= passScore;

        // Record in SCORM
        if (window.scorm) {
            window.scorm.recordScore(scorePercent, passed);
        }

        this.container.innerHTML = `
            <div class="assessment-container result-container">
                <div class="result-badge ${passed ? 'badge-passed' : 'badge-retry'}">
                    ${passed ? 'PASSED' : 'RETRY REQUIRED'}
                </div>
                <h2 class="result-title">${passed ? 'Congratulations!' : 'Almost there!'}</h2>
                <div class="score-circle">
                    <span class="score-num">${scorePercent}%</span>
                    <span class="score-label">Score</span>
                </div>
                <p class="result-desc">
                    ${passed 
                        ? `You have demonstrated strong alignment with Tabuk's founding history, regional operations, leadership, and core values.`
                        : `You scored ${scorePercent}%, but a score of ${passScore}% is required to complete induction. Review the module and try again.`
                    }
                </p>

                <div class="scorm-status-pill">
                    <span class="dot ${passed ? 'dot-green' : 'dot-yellow'}"></span>
                    <span>LMS Status: <strong>${passed ? 'COMPLETED / PASSED' : 'INCOMPLETE'}</strong></span>
                </div>

                <div class="result-actions">
                    ${passed ? `
                        <button class="btn btn-primary" onclick="window.app.goToScene('completion')">
                            View Induction Certificate
                        </button>
                    ` : `
                        <button class="btn btn-primary" onclick="window.assessmentEngine.start()">
                            Retake Assessment
                        </button>
                        <button class="btn btn-secondary" onclick="window.app.goToScene('riyadh_hq')">
                            Review Environments
                        </button>
                    `}
                </div>
            </div>
        `;

        if (passed && this.onComplete) {
            this.onComplete(scorePercent);
        }
    }
}

window.AssessmentEngine = AssessmentEngine;
