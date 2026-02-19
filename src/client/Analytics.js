(function () {
    let sessionStartTime = null;
    let heartbeatInterval = null;
    let lastHeartbeatLevel = 1;
    let lastHeartbeatKills = 0;
    let sessionStarted = false;

    function track(eventName, params) {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, params || {});
        }
    }

    function startSession(offlineMode) {
        if (sessionStarted) return;
        sessionStarted = true;
        sessionStartTime = performance.now();

        track('session_start', {
            offline_mode: offlineMode,
            timestamp: new Date().toISOString()
        });

        checkReturnVisit();

        heartbeatInterval = setInterval(function () {
            var duration = Math.round((performance.now() - sessionStartTime) / 1000);
            track('heartbeat', {
                duration_sec: duration,
                level: lastHeartbeatLevel,
                kills: lastHeartbeatKills
            });
        }, 60000);
    }

    function endSession(params) {
        if (!sessionStarted) return;
        
        var duration = Math.round((performance.now() - sessionStartTime) / 1000);
        
        track('game_end', Object.assign({
            duration_sec: duration,
            offline_mode: typeof offlineMode !== 'undefined' ? offlineMode : null
        }, params || {}));

        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        sessionStarted = false;
    }

    function updateHeartbeat(level, kills) {
        lastHeartbeatLevel = level;
        lastHeartbeatKills = kills;
    }

    function checkReturnVisit() {
        var lastVisit = localStorage.getItem('lastVisitDate');
        var today = new Date().toISOString().split('T')[0];
        
        if (lastVisit && lastVisit !== today) {
            var lastDate = new Date(lastVisit);
            var todayDate = new Date(today);
            var daysSince = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            track('return_visit', {
                days_since_last: daysSince
            });
        }
        
        localStorage.setItem('lastVisitDate', today);
    }

    function trackQuizCorrect(quizMode, verseReference) {
        track('quiz_correct', {
            quiz_mode: quizMode,
            verse_reference: verseReference
        });
    }

    function trackQuizWrong(quizMode, verseReference) {
        track('quiz_wrong', {
            quiz_mode: quizMode,
            verse_reference: verseReference
        });
    }

    function trackMonsterKilled(level) {
        track('monster_killed', { level: level });
    }

    function trackLevelComplete(level, kills) {
        track('level_complete', {
            level: level,
            kills: kills
        });
    }

    function trackPlayerDeath(level, xp, kills, monstersActive) {
        track('player_death', {
            level: level,
            xp: xp,
            kills: kills,
            monsters_active: monstersActive
        });
    }

    function trackPlayerLevelUp(newLevel) {
        track('player_level_up', { new_level: newLevel });
    }

    function trackItemCollected(itemType) {
        track('item_collected', { item_type: itemType });
    }

    function trackFtueTip(tipType) {
        track('ftue_tip_shown', { tip_type: tipType });
    }

    function trackMenuClick(button) {
        track('menu_click', { button: button });
    }

    function trackOfflineToggle(enabled) {
        track('offline_toggle', { enabled: enabled });
    }

    function trackReviewModeUsed(versesViewed) {
        track('review_mode_used', { verses_viewed: versesViewed });
    }

    function trackLobbyEnter() {
        track('lobby_enter', {});
    }

    function trackRoomCreated(difficulty, quizSettings) {
        track('room_created', {
            difficulty: difficulty,
            quiz_first_letter: quizSettings.firstLetter,
            quiz_missing_word: quizSettings.missingWord,
            quiz_category_match: quizSettings.categoryMatch,
            quiz_true_false: quizSettings.trueFalse
        });
    }

    function trackRoomJoined(roomId, playerCount) {
        track('room_joined', {
            player_count: playerCount
        });
    }

    function trackRoomLeave(durationSec) {
        track('room_leave', { duration_sec: durationSec });
    }

    function trackGameStart(mode, offline) {
        track('game_start', {
            game_mode: mode,
            offline: offline,
            timestamp: new Date().toISOString()
        });
    }

    window.Analytics = {
        track: track,
        startSession: startSession,
        endSession: endSession,
        updateHeartbeat: updateHeartbeat,
        trackQuizCorrect: trackQuizCorrect,
        trackQuizWrong: trackQuizWrong,
        trackMonsterKilled: trackMonsterKilled,
        trackLevelComplete: trackLevelComplete,
        trackPlayerDeath: trackPlayerDeath,
        trackPlayerLevelUp: trackPlayerLevelUp,
        trackItemCollected: trackItemCollected,
        trackFtueTip: trackFtueTip,
        trackMenuClick: trackMenuClick,
        trackOfflineToggle: trackOfflineToggle,
        trackReviewModeUsed: trackReviewModeUsed,
        trackLobbyEnter: trackLobbyEnter,
        trackRoomCreated: trackRoomCreated,
        trackRoomJoined: trackRoomJoined,
        trackRoomLeave: trackRoomLeave,
        trackGameStart: trackGameStart
    };
})();
