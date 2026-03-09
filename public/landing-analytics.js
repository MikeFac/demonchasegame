(function () {
  var GA_MEASUREMENT_ID = 'G-673VQ9VE50';

  function ensureGtag() {
    if (typeof window.gtag === 'function') return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
      page_title: document.title
    });
  }

  function trackLandingView() {
    var audience = document.body.getAttribute('data-landing-audience') || 'unknown';
    window.gtag('event', 'landing_page_view', {
      audience: audience,
      page_path: window.location.pathname,
      page_title: document.title
    });
  }

  function wireCtas() {
    var audience = document.body.getAttribute('data-landing-audience') || 'unknown';
    document.querySelectorAll('[data-cta]').forEach(function (link) {
      link.addEventListener('click', function () {
        window.gtag('event', 'landing_cta_click', {
          audience: audience,
          cta_name: link.getAttribute('data-cta'),
          destination: link.getAttribute('href') || ''
        });
      });
    });
  }

  ensureGtag();
  trackLandingView();
  wireCtas();
})();
