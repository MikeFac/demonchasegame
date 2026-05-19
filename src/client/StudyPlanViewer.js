// StudyPlanViewer.js - Guided Bible study plan viewer (canvas-based)
// IIFE pattern, sets window.StudyPlanViewer
(function () {
    let studyPlanData = null;
    let sections = [];
    let currentIndex = 0;
    let hitRects = [];
    let isLoading = false;
    let loadError = null;
    let returnCallback = null;
    let pollTimer = null;
    let pendingRequest = null;
    let pollAttemptCount = 0;
    const MAX_POLL_ATTEMPTS = 45;
    const POLL_DELAY_MS = 2000;

    let CANVAS_WIDTH = 400;
    let CANVAS_HEIGHT = 600;

    function getCanvas() {
        return typeof canvas !== 'undefined' ? canvas : { width: 400, height: 600 };
    }

    function getCtx() {
        return typeof ctx !== 'undefined' ? ctx : null;
    }

    function updateDimensions() {
        const c = getCanvas();
        CANVAS_WIDTH = c.width || 400;
        CANVAS_HEIGHT = c.height || 600;
    }

    function getCurrentLanguage() {
        if (typeof I18n !== 'undefined' && typeof I18n.getLang === 'function') {
            return I18n.getLang();
        }
        return 'en';
    }

    function clearPollTimer() {
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
    }

    function schedulePoll() {
        clearPollTimer();
        pollTimer = setTimeout(function () {
            if (pendingRequest) {
                requestStudyPlan();
            }
        }, POLL_DELAY_MS);
    }

    function buildSections(data) {
        const built = [];
        if (data.summary) {
            built.push({
                type: 'summary',
                label: t('studyPlan.summary'),
                title: data.title || t('studyPlan.title'),
                body: data.summary
            });
        }
        (data.questions || []).forEach((question, index) => {
            built.push({
                type: 'question',
                label: t('studyPlan.questionLabel', index + 1, data.questions.length),
                title: question.prompt,
                body: question.help || ''
            });
        });
        if (data.application) {
            built.push({
                type: 'application',
                label: t('studyPlan.application'),
                title: t('studyPlan.application'),
                body: data.application
            });
        }
        if (data.prayer) {
            built.push({
                type: 'prayer',
                label: t('studyPlan.prayer'),
                title: t('studyPlan.prayer'),
                body: data.prayer
            });
        }
        return built;
    }

    function handleStudyPlanResponse(data) {
        if (data.status === 'ready' && Array.isArray(data.questions)) {
            clearPollTimer();
            pendingRequest = null;
            isLoading = false;
            loadError = null;
            studyPlanData = {
                verseReference: data.verseReference,
                lang: data.lang || getCurrentLanguage(),
                title: data.title || t('studyPlan.title'),
                summary: data.summary || '',
                questions: data.questions || [],
                application: data.application || '',
                prayer: data.prayer || '',
                versionLabel: data.versionLabel || null
            };
            sections = buildSections(studyPlanData);
            currentIndex = 0;
            render();
            return;
        }

        if (data.status === 'pending') {
            isLoading = true;
            loadError = null;
            pollAttemptCount++;
            if (pollAttemptCount >= MAX_POLL_ATTEMPTS) {
                clearPollTimer();
                pendingRequest = null;
                isLoading = false;
                loadError = 'Study plan generation is taking longer than expected. Please retry in a moment.';
            } else {
                schedulePoll();
            }
            render();
            return;
        }

        clearPollTimer();
        pendingRequest = null;
        isLoading = false;
        loadError = data.error || 'Could not generate study plan. Try again later.';
        render();
    }

    function requestStudyPlan() {
        if (!pendingRequest) return;

        fetch('/api/sermon/study-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: pendingRequest.verseReference,
                text: pendingRequest.verseText,
                category: pendingRequest.category || 'General',
                lang: pendingRequest.lang
            })
        })
            .then(function (res) { return res.json(); })
            .then(handleStudyPlanResponse)
            .catch(function (err) {
                clearPollTimer();
                pendingRequest = null;
                isLoading = false;
                loadError = 'Network error. Check your connection.';
                console.error('Study plan fetch error:', err);
                render();
            });
    }

    function open(verseReference, verseText, category, lang, onExit) {
        studyPlanData = null;
        sections = [];
        currentIndex = 0;
        isLoading = true;
        loadError = null;
        returnCallback = onExit || null;
        clearPollTimer();
        pollAttemptCount = 0;
        pendingRequest = {
            verseReference: verseReference,
            verseText: verseText,
            category: category || 'General',
            lang: lang || getCurrentLanguage()
        };

        render();
        requestStudyPlan();
    }

    function close() {
        clearPollTimer();
        pendingRequest = null;
        studyPlanData = null;
        sections = [];
        isLoading = false;
        loadError = null;
        if (returnCallback) {
            returnCallback();
            returnCallback = null;
        }
    }

    function isOpen() {
        return isLoading || studyPlanData !== null || loadError !== null;
    }

    function render() {
        updateDimensions();
        var c = getCtx();
        if (!c) return;

        c.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        c.fillStyle = '#10223d';
        c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        hitRects = [];

        if (isLoading) {
            drawLoading(c);
        } else if (loadError) {
            drawError(c);
        } else if (studyPlanData && sections.length > 0) {
            drawStudyPlanSection(c);
        }
    }

    function drawLoading(c) {
        c.fillStyle = '#8ec8ff';
        c.font = 'bold 20px Arial';
        c.textAlign = 'center';
        c.fillText(t('studyPlan.loading'), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

        c.fillStyle = '#9fb3c8';
        c.font = '14px Arial';
        c.fillText(t('studyPlan.loadingHint'), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);

        var dots = '.'.repeat((Math.floor(Date.now() / 500) % 3) + 1);
        c.fillText(dots, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);

        drawCloseButton(c);
        c.textAlign = 'left';
    }

    function drawError(c) {
        c.fillStyle = '#ff8a80';
        c.font = 'bold 18px Arial';
        c.textAlign = 'center';
        c.fillText(t('studyPlan.errorTitle'), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        c.fillStyle = '#c7d2e0';
        c.font = '14px Arial';
        drawWrappedText(c, loadError, 30, CANVAS_HEIGHT / 2 + 5, CANVAS_WIDTH - 60, 22);

        var btnX = CANVAS_WIDTH / 2 - 50;
        var btnY = CANVAS_HEIGHT / 2 + 60;
        c.fillStyle = '#3c7bd6';
        roundRect(c, btnX, btnY, 100, 36, 6);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 14px Arial';
        c.fillText(t('studyPlan.retry'), CANVAS_WIDTH / 2, btnY + 24);
        hitRects.push({ name: 'retry', x: btnX, y: btnY, w: 100, h: 36 });

        drawCloseButton(c);
        c.textAlign = 'left';
    }

    function drawStudyPlanSection(c) {
        const section = sections[currentIndex];
        const isQuestion = section.type === 'question';

        c.fillStyle = '#8ec8ff';
        c.font = 'bold 20px Arial';
        c.textAlign = 'center';
        c.fillText(studyPlanData.title || t('studyPlan.title'), CANVAS_WIDTH / 2, 35);

        c.fillStyle = '#b7c7d9';
        c.font = '13px Arial';
        c.fillText(studyPlanData.verseReference, CANVAS_WIDTH / 2, 55);

        c.fillStyle = isQuestion ? '#ffe082' : '#9ad4ff';
        c.font = 'bold 12px Arial';
        c.fillText(section.label, CANVAS_WIDTH / 2, 76);

        c.fillStyle = '#e7eef8';
        c.font = isQuestion ? 'bold 18px Arial' : '17px Arial';
        c.textAlign = 'left';

        var textY = 110;
        var maxWidth = CANVAS_WIDTH - 50;
        drawWrappedText(c, section.title, 25, textY, maxWidth, 28);
        if (section.body) {
            c.fillStyle = isQuestion ? '#c9d6e3' : '#d7e3ef';
            c.font = '15px Arial';
            drawWrappedText(c, section.body, 25, textY + 55, maxWidth, 24);
        }

        drawNavButtons(c);
        drawCloseButton(c);
        c.textAlign = 'left';
    }

    function drawNavButtons(c) {
        var btnY = CANVAS_HEIGHT - 55;
        var btnH = 40;

        if (currentIndex > 0) {
            var prevX = 20;
            var prevW = 100;
            c.fillStyle = '#445d7c';
            roundRect(c, prevX, btnY, prevW, btnH, 6);
            c.fill();
            c.fillStyle = '#fff';
            c.font = 'bold 14px Arial';
            c.textAlign = 'center';
            c.fillText(t('studyPlan.previous'), prevX + prevW / 2, btnY + 27);
            hitRects.push({ name: 'prev', x: prevX, y: btnY, w: prevW, h: btnH });
        }

        var nextX = CANVAS_WIDTH - 120;
        var nextW = 100;
        var isLastSection = currentIndex >= sections.length - 1;
        c.fillStyle = isLastSection ? '#4caf50' : '#3c7bd6';
        roundRect(c, nextX, btnY, nextW, btnH, 6);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 14px Arial';
        c.textAlign = 'center';
        c.fillText(isLastSection ? t('studyPlan.done') : t('studyPlan.next'), nextX + nextW / 2, btnY + 27);
        hitRects.push({ name: isLastSection ? 'done' : 'next', x: nextX, y: btnY, w: nextW, h: btnH });
    }

    function drawCloseButton(c) {
        var btnX = CANVAS_WIDTH - 40;
        var btnY = 8;
        var btnSize = 28;
        c.fillStyle = 'rgba(255,255,255,0.15)';
        roundRect(c, btnX, btnY, btnSize, btnSize, 4);
        c.fill();
        c.fillStyle = '#d6e4f2';
        c.font = 'bold 16px Arial';
        c.textAlign = 'center';
        c.fillText('✕', btnX + btnSize / 2, btnY + 20);
        hitRects.push({ name: 'close', x: btnX, y: btnY, w: btnSize, h: btnSize });
    }

    function handleClick(x, y) {
        for (var i = 0; i < hitRects.length; i++) {
            var r = hitRects[i];
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                if (r.name === 'prev') {
                    currentIndex = Math.max(0, currentIndex - 1);
                    render();
                } else if (r.name === 'next') {
                    currentIndex = Math.min(sections.length - 1, currentIndex + 1);
                    render();
                } else if (r.name === 'done' || r.name === 'close') {
                    close();
                } else if (r.name === 'retry') {
                    if (pendingRequest) {
                        studyPlanData = null;
                        sections = [];
                        isLoading = true;
                        loadError = null;
                        pollAttemptCount = 0;
                        render();
                        requestStudyPlan();
                    } else {
                        close();
                    }
                }
                return true;
            }
        }
        return false;
    }

    function drawWrappedText(c, text, x, y, maxWidth, lineHeight) {
        const raw = String(text || '');
        const tokens = /\s/.test(raw) ? raw.split(/\s+/) : Array.from(raw);
        let line = '';
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const separator = /\s/.test(raw) ? ' ' : '';
            const testLine = line ? line + separator + token : token;
            if (c.measureText(testLine).width > maxWidth && line) {
                c.fillText(line, x, y);
                line = token;
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line.length > 0) c.fillText(line, x, y);
    }

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
    }

    window.StudyPlanViewer = {
        open: open,
        close: close,
        isOpen: isOpen,
        render: render,
        handleClick: handleClick
    };
})();
