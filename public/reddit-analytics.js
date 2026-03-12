(function () {
  var PIXEL_ID = 'a2_fepjisq7z9u8';
  var LANDING_INTENT_KEY = 'redditLandingIntent';
  var PAGE_VISIT_KEY_PREFIX = 'redditPageVisitTracked:';
  var DEBUG_PREFIX = '[RedditAnalytics]';

  function log() {
    if (typeof console === 'undefined' || typeof console.log !== 'function') {
      return;
    }
    var args = Array.prototype.slice.call(arguments);
    args.unshift(DEBUG_PREFIX);
    console.log.apply(console, args);
  }

  function ensurePixel() {
    if (typeof window.rdt === 'function' && window.rdt._verseBattlesReady) {
      log('pixel already ready');
      return true;
    }

    if (typeof window.rdt !== 'function') {
      (function (w, d) {
        if (w.rdt) {
          return;
        }
        var rdt = function () {
          rdt.callQueue.push(arguments);
        };
        rdt.callQueue = [];
        w.rdt = rdt;
        log('created rdt stub');

        var script = d.createElement('script');
        script.async = true;
        script.src = 'https://www.redditstatic.com/ads/pixel.js';
        script.onload = function () {
          log('loaded reddit pixel.js');
        };
        script.onerror = function () {
          console.error(DEBUG_PREFIX, 'failed to load reddit pixel.js');
        };
        var firstScript = d.getElementsByTagName('script')[0];
        firstScript.parentNode.insertBefore(script, firstScript);
        log('injected reddit pixel.js');
      })(window, document);
    }

    window.rdt('init', PIXEL_ID);
    window.rdt._verseBattlesReady = true;
    log('called rdt init', PIXEL_ID);
    return true;
  }

  function safeSessionStorage(action, fallbackValue) {
    try {
      return action(window.sessionStorage);
    } catch (error) {
      return fallbackValue;
    }
  }

  function track(eventName, payload) {
    ensurePixel();
    if (payload && Object.keys(payload).length > 0) {
      log('track', eventName, payload);
      window.rdt('track', eventName, payload);
      return;
    }
    log('track', eventName);
    window.rdt('track', eventName);
  }

  function trackCustomEvent(customEventName, payload) {
    ensurePixel();
    var eventPayload = Object.assign({ customEventName: customEventName }, payload || {});
    log('track custom', customEventName, eventPayload);
    window.rdt('track', 'Custom', eventPayload);
  }

  function trackPageVisit(context) {
    var pageKey = PAGE_VISIT_KEY_PREFIX + window.location.pathname + window.location.search;
    var alreadyTracked = safeSessionStorage(function (storage) {
      return storage.getItem(pageKey);
    }, null);

    if (alreadyTracked) {
      log('skip duplicate PageVisit for', window.location.pathname + window.location.search);
      return;
    }

    track('PageVisit');
    safeSessionStorage(function (storage) {
      storage.setItem(pageKey, '1');
      if (context && Object.keys(context).length > 0) {
        storage.setItem(pageKey + ':context', JSON.stringify(context));
      }
    }, null);
  }

  function rememberLandingIntent(details) {
    safeSessionStorage(function (storage) {
      storage.setItem(LANDING_INTENT_KEY, JSON.stringify(Object.assign({
        createdAt: Date.now()
      }, details || {})));
    }, null);
  }

  function consumeLandingIntent(maxAgeMs) {
    return safeSessionStorage(function (storage) {
      var raw = storage.getItem(LANDING_INTENT_KEY);
      if (!raw) {
        return null;
      }

      storage.removeItem(LANDING_INTENT_KEY);

      try {
        var parsed = JSON.parse(raw);
        if (!parsed.createdAt || (Date.now() - parsed.createdAt) > maxAgeMs) {
          return null;
        }
        return parsed;
      } catch (error) {
        return null;
      }
    }, null);
  }

  function trackGameStartAfterLanding(details) {
    var intent = consumeLandingIntent(30 * 60 * 1000);
    if (!intent) {
      return;
    }

    trackCustomEvent('start_game_after_landing', Object.assign({
      landingAudience: intent.audience || 'unknown',
      ctaName: intent.ctaName || '',
      destination: intent.destination || ''
    }, details || {}));
  }

  window.RedditAnalytics = {
    ensurePixel: ensurePixel,
    trackPageVisit: trackPageVisit,
    rememberLandingIntent: rememberLandingIntent,
    trackGameStartAfterLanding: trackGameStartAfterLanding
  };

  log('wrapper loaded');
  ensurePixel();
})();
