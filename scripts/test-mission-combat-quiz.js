const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'mission-combat-quiz');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3500/';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function main() {
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
    const browser = await chromium.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage({ viewport: { width: 768, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForFunction(() => typeof window.startMission === 'function', { timeout: 15000 });
        await page.evaluate(() => {
            localStorage.setItem('dcgame_speedPromptShown', 'true');
            const splash = document.getElementById('splashScreen');
            if (splash) splash.style.display = 'none';
            return window.startMission('generated', 'trials-of-grace');
        });
        await page.waitForFunction(() =>
            window.gameMode === 'game' &&
            window.currentMission &&
            window.currentMission.id === 'trials-of-grace' &&
            window.QuizManager &&
            window.QuizManager.getMissionQuizDebug().fightNumber > 0,
        { timeout: 15000 });

        const visualQuiz = await page.evaluate(() => {
            for (let i = 0; i < 8 && window.QuizManager.getMissionQuizDebug().currentMode !== 'cloze'; i++) {
                window.QuizManager.pickQualityVerse();
            }
            return window.QuizManager.getMissionQuizDebug();
        });
        assert(visualQuiz.currentMode === 'cloze', 'could not prepare an early cloze quiz for visual inspection');
        assert(visualQuiz.progressiveHiddenWordCount === Math.min(visualQuiz.verseWordCount, visualQuiz.currentFightNumber + 1),
            'visual cloze sample did not follow the progressive word count');

        await page.waitForTimeout(500);
        for (let i = 0; i < 4; i++) {
            if (await page.evaluate(() => window.isStoryPaused())) {
                await page.evaluate(() => window.exitStoryPause());
            }
            await page.waitForTimeout(200);
        }
        assert(!(await page.evaluate(() => window.isStoryPaused())), 'story dialogue still covered the combat quiz');
        await page.waitForTimeout(1100);
        await page.evaluate(() => {
            if (typeof flashMessages !== 'undefined' && Array.isArray(flashMessages)) flashMessages.splice(0);
            if (typeof clearCombatHint === 'function') clearCombatHint();
        });
        await page.waitForTimeout(4200);
        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, 'progressive-cloze.png') });

        const result = await page.evaluate(() => {
            const originalPlayVerseTrack = window.MusicManager && window.MusicManager.playVerseTrack;
            if (window.MusicManager) window.MusicManager.playVerseTrack = () => Promise.resolve(false);

            const rows = [];
            for (let i = 0; i < 50; i++) {
                window.QuizManager.pickQualityVerse();
                rows.push(window.QuizManager.getMissionQuizDebug());
            }

            if (window.MusicManager) window.MusicManager.playVerseTrack = originalPlayVerseTrack;
            return {
                config: window.currentMission.combatQuiz,
                quizSettings: window.currentMission.quizSettings,
                rows: rows
            };
        });

        assert(result.quizSettings.firstLetter === 50 && result.quizSettings.cloze === 50,
            'mission should split combat quizzes between double-letter and cloze');
        assert(result.quizSettings.missingWord === 0 && result.quizSettings.categoryMatch === 0 && result.quizSettings.trueFalse === 0,
            'easy combat quiz modes should be disabled');
        assert(result.config.focusVerseTestPercent === 70, 'focus verse percentage should be loaded from mission JSON');
        assert(result.rows.every(row => row.currentMode === 'first_letter' || row.currentMode === 'cloze'),
            'found a combat quiz outside the allowed hard modes');

        const focusRows = result.rows.filter(row => row.usedFocusVerse);
        assert(focusRows.length >= 10 && focusRows.length <= 49,
            '70% focus verse policy produced an implausible sample: ' + focusRows.length + '/50');
        assert(focusRows.every(row => row.currentReference === 'Hebrews 11:1'),
            'a focus-verse selection used the wrong reference');

        const clozeRows = result.rows.filter(row => row.currentMode === 'cloze');
        assert(clozeRows.length > 0, 'no cloze quizzes were generated');
        const checkedClozeRows = [visualQuiz].concat(clozeRows.slice(0, 8));
        checkedClozeRows.forEach(row => {
            const expectedWords = Math.min(row.verseWordCount, row.currentFightNumber + 1);
            assert(row.progressiveHiddenWordCount === expectedWords,
                'fight ' + row.currentFightNumber + ' should hide ' + expectedWords +
                ' starting words, got ' + row.progressiveHiddenWordCount);
        });

        const taskReset = await page.evaluate(() => {
            const story = window.__integratedStoryState;
            story.currentStepId = 'collect-lantern';
            window.QuizManager.pickQualityVerse();
            const lanternFirst = window.QuizManager.getMissionQuizDebug();
            window.QuizManager.pickQualityVerse();
            const lanternSecond = window.QuizManager.getMissionQuizDebug();

            story.currentStepId = 'collect-shield';
            window.QuizManager.pickQualityVerse();
            const shieldFirst = window.QuizManager.getMissionQuizDebug();
            return { lanternFirst, lanternSecond, shieldFirst };
        });
        assert(taskReset.lanternFirst.currentFightNumber === 1 && taskReset.lanternSecond.currentFightNumber === 2,
            'fight progression did not start at one and increment within a task');
        assert(taskReset.shieldFirst.currentFightNumber === 1,
            'fight progression did not reset when the task changed');
        assert(taskReset.shieldFirst.config.focusVerseReference === 'Joshua 1:9',
            'task-specific focus verse did not change for collect-shield');

        const finalBefore = await page.evaluate(() => {
            const story = window.__integratedStoryState;
            story.currentStepId = 'collect-lantern';
            if (story.completedSteps) delete story.completedSteps['collect-lantern'];
            completeQuestStep('collect-lantern');
            return {
                completed: !!(story.completedSteps && story.completedSteps['collect-lantern']),
                shielded: verseTestShieldActive === true,
                debug: window.QuizManager.getMissionQuizDebug(),
                finalState: story.finalFocusTests && story.finalFocusTests['collect-lantern']
            };
        });
        assert(!finalBefore.completed, 'task completed before its final focus-verse test');
        assert(finalBefore.shielded, 'player should be protected while taking the mandatory final test');
        assert(finalBefore.debug.isFinalFocusTest, 'final focus-verse cloze was not started');
        assert(finalBefore.debug.currentReference === 'Hebrews 11:1', 'final test used the wrong focus verse');
        assert(finalBefore.debug.progressiveHiddenWordCount === finalBefore.debug.verseWordCount,
            'final test should hide the full focus verse');
        assert(finalBefore.finalState && finalBefore.finalState.status === 'pending',
            'final focus test was not recorded as pending');

        const rotationLock = await page.evaluate(() => {
            for (let i = 0; i < 2; i++) {
                const answer = currentQuiz.answers[currentQuiz.currentWordIndex];
                window.QuizManager.handleClozeLetterSelect(answer.charAt(0).toUpperCase());
            }
            const before = window.QuizManager.getMissionQuizDebug();
            const attempts = [];
            for (let i = 0; i < 12; i++) {
                attempts.push(window.QuizManager.pickQualityVerse());
                attempts.push(window.QuizManager.pickRandomVerse());
                completeQuestStep('collect-lantern');
            }
            return {
                before: before,
                after: window.QuizManager.getMissionQuizDebug(),
                attempts: attempts,
                active: window.QuizManager.isMissionFinalFocusTestActive()
            };
        });
        assert(rotationLock.active, 'final focus test lost its exclusive state');
        assert(rotationLock.attempts.every(result => result === false),
            'a timed or event-driven quiz rotation was allowed during the final test');
        assert(rotationLock.after.currentReference === rotationLock.before.currentReference &&
            rotationLock.after.currentWordIndex === rotationLock.before.currentWordIndex &&
            rotationLock.after.answerCount === rotationLock.before.answerCount,
            'the final quiz was replaced or restarted by a gameplay event');
        await page.locator('#gameCanvas').screenshot({ path: path.join(OUTPUT_DIR, 'final-focus-test.png') });

        await page.evaluate(() => {
            let safety = 100;
            while (currentQuiz && currentQuiz.mode === 'cloze' && !currentQuiz.isComplete && safety-- > 0) {
                const answer = currentQuiz.answers[currentQuiz.currentWordIndex];
                window.QuizManager.handleClozeLetterSelect(answer.charAt(0).toUpperCase());
            }
        });
        await page.waitForFunction(() =>
            window.__integratedStoryState &&
            window.__integratedStoryState.completedSteps &&
            window.__integratedStoryState.completedSteps['collect-lantern'],
        { timeout: 5000 });
        const finalAfter = await page.evaluate(() => ({
            completed: !!window.__integratedStoryState.completedSteps['collect-lantern'],
            shielded: verseTestShieldActive === true,
            finalState: window.__integratedStoryState.finalFocusTests['collect-lantern']
        }));
        assert(finalAfter.completed && finalAfter.finalState.status === 'passed',
            'passing the final focus test did not complete the task');
        assert(!finalAfter.shielded, 'final-test protection remained active after passing');
        await fs.promises.writeFile(path.join(OUTPUT_DIR, 'state.json'), JSON.stringify({
            visualQuiz: visualQuiz,
            focusSelections: focusRows.length,
            totalSelections: result.rows.length,
            clozeSamples: clozeRows.slice(0, 8),
            taskReset: taskReset,
            finalBefore: finalBefore,
            rotationLock: rotationLock,
            finalAfter: finalAfter,
            errors: errors
        }, null, 2));
        console.log('Mission combat quiz regression passed:', focusRows.length + '/50 focus selections');
    } finally {
        await browser.close();
    }

    assert(errors.length === 0, 'page errors: ' + errors.join('; '));
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exit(1);
});
