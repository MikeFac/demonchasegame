(function () {
    let sessionStartTime = null;
    let heartbeatInterval = null;
    let lastHeartbeatLevel = 1;
    let lastHeartbeatKills = 0;
    let sessionStarted = false;
    let eventQueue = [];
    let gtagLoadAttempted = false;
    let redditGameStartTracked = false;

    if (window.RedditAnalytics) {
        window.RedditAnalytics.trackPageVisit({
            page_path: window.location.pathname
        });
    }

    function track(eventName, params) {
        var event = { name: eventName, params: params || {}, time: Date.now() };
        
        if (typeof gtag !== 'undefined') {
            // gtag available - send queued events first, then this one
            _flushQueue();
            gtag('event', eventName, params || {});
        } else if (navigator.onLine) {
            // Online but gtag not loaded - try to load it
            eventQueue.push(event);
            _loadGtag();
        } else {
            // Offline - queue for later
            eventQueue.push(event);
        }
    }
    
    function _loadGtag() {
        if (gtagLoadAttempted) return;
        gtagLoadAttempted = true;
        
        var script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-673VQ9VE50';
        script.async = true;
        script.onload = function () {
            window.dataLayer = window.dataLayer || [];
            function gtagLoader() { dataLayer.push(arguments); }
            window.gtag = gtagLoader;
            gtag('js', new Date());
            gtag('config', 'G-673VQ9VE50');
            _flushQueue();
        };
        document.head.appendChild(script);
    }
    
    function _flushQueue() {
        if (typeof gtag === 'undefined' || eventQueue.length === 0) return;
        
        // Only flush events from the last 5 minutes (avoid stale data)
        var cutoff = Date.now() - (5 * 60 * 1000);
        var toSend = eventQueue.filter(function(e) { return e.time > cutoff; });
        eventQueue = [];
        
        toSend.forEach(function(event) {
            gtag('event', event.name, event.params);
        });
        
        if (toSend.length > 0) {
            console.log('Analytics: flushed', toSend.length, 'queued events');
        }
    }
    
    // Listen for online event to flush queue
    if (typeof window !== 'undefined') {
        window.addEventListener('online', function() {
            if (eventQueue.length > 0 && typeof gtag === 'undefined') {
                _loadGtag();
            } else {
                _flushQueue();
            }
        });
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

    function trackOnboardingMissionStarted(missionId, missionName) {
        track('onboarding_mission_started', {
            mission_id: missionId,
            mission_name: missionName || null
        });
    }

    function trackOnboardingMissionStep(stepName, params) {
        track('onboarding_mission_step', Object.assign({
            step_name: stepName
        }, params || {}));
    }

    function trackOnboardingMissionFinished(result, params) {
        track('onboarding_mission_finished', Object.assign({
            result: result
        }, params || {}));
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

        if (!redditGameStartTracked && window.RedditAnalytics) {
            redditGameStartTracked = true;
            window.RedditAnalytics.trackGameStartAfterLanding({
                game_mode: mode,
                offline: offline
            });
        }
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
        trackOnboardingMissionStarted: trackOnboardingMissionStarted,
        trackOnboardingMissionStep: trackOnboardingMissionStep,
        trackOnboardingMissionFinished: trackOnboardingMissionFinished,
        trackLobbyEnter: trackLobbyEnter,
        trackRoomCreated: trackRoomCreated,
        trackRoomJoined: trackRoomJoined,
        trackRoomLeave: trackRoomLeave,
        trackGameStart: trackGameStart
    };
})();
