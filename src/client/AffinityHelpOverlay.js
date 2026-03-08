(function () {
    function getAffinityRows() {
        var matrix = window.LevelConfig && window.LevelConfig.combatMatrix;
        var affinities = matrix && matrix.affinities ? matrix.affinities : {};

        return Object.keys(affinities).sort().map(function (category) {
            var row = affinities[category] || {};
            var strong = [];
            var weak = [];

            Object.keys(row).forEach(function (demonType) {
                var multiplier = row[demonType];
                if (typeof multiplier !== 'number') return;

                var entry = {
                    demonType: demonType,
                    multiplier: multiplier
                };

                if (multiplier > 1.0) {
                    strong.push(entry);
                } else if (multiplier < 1.0) {
                    weak.push(entry);
                }
            });

            strong.sort(function (a, b) { return b.multiplier - a.multiplier; });
            weak.sort(function (a, b) { return a.multiplier - b.multiplier; });

            return {
                category: category,
                strong: strong,
                weak: weak
            };
        });
    }

    function createBadge(text, colors) {
        var badge = document.createElement('span');
        badge.textContent = text;
        badge.style.cssText = [
            'display:inline-flex',
            'align-items:center',
            'gap:6px',
            'padding:6px 10px',
            'border-radius:999px',
            'font-size:0.85rem',
            'font-weight:700',
            'letter-spacing:0.01em',
            'background:' + colors.background,
            'color:' + colors.text,
            'border:1px solid ' + colors.border
        ].join(';');
        return badge;
    }

    class AffinityHelpOverlay {
        constructor() {
            this.root = null;
            this.body = null;
            this.isOpen = false;
        }

        ensureDom() {
            if (this.root) {
                return;
            }

            var root = document.createElement('div');
            root.id = 'affinity-help-overlay';
            root.style.cssText = [
                'display:none',
                'position:fixed',
                'inset:0',
                'z-index:2600',
                'padding:18px',
                'background:rgba(6, 10, 18, 0.86)',
                'backdrop-filter:blur(6px)'
            ].join(';');

            var panel = document.createElement('div');
            panel.style.cssText = [
                'width:min(1020px, 100%)',
                'max-height:min(90vh, 920px)',
                'margin:0 auto',
                'display:flex',
                'flex-direction:column',
                'overflow:hidden',
                'border-radius:18px',
                'background:linear-gradient(180deg, #171f2b 0%, #0f1520 100%)',
                'border:1px solid rgba(255,255,255,0.12)',
                'box-shadow:0 24px 80px rgba(0,0,0,0.4)',
                'font-family:\"Segoe UI\", Tahoma, sans-serif'
            ].join(';');

            var header = document.createElement('div');
            header.style.cssText = [
                'display:flex',
                'justify-content:space-between',
                'align-items:flex-start',
                'gap:16px',
                'padding:20px 22px 16px 22px',
                'border-bottom:1px solid rgba(255,255,255,0.08)'
            ].join(';');

            var titleWrap = document.createElement('div');
            var title = document.createElement('div');
            title.textContent = 'Affinity Help';
            title.style.cssText = 'font-size:1.35rem;font-weight:800;color:#f6fbff;';
            var subtitle = document.createElement('div');
            subtitle.textContent = 'Use the right quality against the right demon. Higher multipliers hit harder; values below 1.0 are weaker matchups.';
            subtitle.style.cssText = 'margin-top:6px;font-size:0.95rem;line-height:1.45;color:rgba(255,255,255,0.72);max-width:760px;';
            titleWrap.appendChild(title);
            titleWrap.appendChild(subtitle);

            var closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = [
                'padding:10px 14px',
                'border-radius:10px',
                'border:1px solid rgba(255,255,255,0.14)',
                'background:rgba(255,255,255,0.08)',
                'color:#fff',
                'font-weight:700',
                'cursor:pointer'
            ].join(';');
            closeBtn.addEventListener('click', this.close.bind(this));

            header.appendChild(titleWrap);
            header.appendChild(closeBtn);

            var intro = document.createElement('div');
            intro.style.cssText = [
                'display:flex',
                'flex-wrap:wrap',
                'gap:10px',
                'padding:14px 22px 0 22px'
            ].join(';');
            intro.appendChild(createBadge('1.4-1.6 Strong advantage', {
                background: 'rgba(74, 222, 128, 0.14)',
                text: '#d6ffe2',
                border: 'rgba(74, 222, 128, 0.28)'
            }));
            intro.appendChild(createBadge('1.15-1.35 Useful advantage', {
                background: 'rgba(96, 165, 250, 0.14)',
                text: '#d8eaff',
                border: 'rgba(96, 165, 250, 0.28)'
            }));
            intro.appendChild(createBadge('0.9-0.95 Less effective', {
                background: 'rgba(248, 113, 113, 0.14)',
                text: '#ffe0e0',
                border: 'rgba(248, 113, 113, 0.28)'
            }));

            var body = document.createElement('div');
            body.style.cssText = 'padding:18px 22px 22px 22px;overflow:auto;';

            panel.appendChild(header);
            panel.appendChild(intro);
            panel.appendChild(body);
            root.appendChild(panel);
            document.body.appendChild(root);

            root.addEventListener('click', (event) => {
                if (event.target === root) {
                    this.close();
                }
            });

            this.root = root;
            this.body = body;
        }

        render() {
            if (!this.body) {
                return;
            }

            var rows = getAffinityRows();
            this.body.innerHTML = '';

            var grid = document.createElement('div');
            grid.style.cssText = [
                'display:grid',
                'grid-template-columns:repeat(auto-fit, minmax(260px, 1fr))',
                'gap:14px'
            ].join(';');

            rows.forEach(function (row) {
                var card = document.createElement('section');
                card.style.cssText = [
                    'padding:16px',
                    'border-radius:16px',
                    'background:rgba(255,255,255,0.04)',
                    'border:1px solid rgba(255,255,255,0.08)'
                ].join(';');

                var heading = document.createElement('div');
                heading.textContent = window.I18n && window.I18n.tCategory ? window.I18n.tCategory(row.category) : row.category;
                heading.style.cssText = 'font-size:1.05rem;font-weight:800;color:#ffe39a;margin-bottom:10px;';
                card.appendChild(heading);

                var strongLabel = document.createElement('div');
                strongLabel.textContent = 'Best against';
                strongLabel.style.cssText = 'font-size:0.82rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#7ee0a0;margin-bottom:8px;';
                card.appendChild(strongLabel);

                var strongWrap = document.createElement('div');
                strongWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;';
                row.strong.slice(0, 4).forEach(function (entry) {
                    strongWrap.appendChild(createBadge(
                        (window.I18n && window.I18n.tDemon ? window.I18n.tDemon(entry.demonType) : entry.demonType) + ' x' + entry.multiplier.toFixed(2).replace(/0$/, ''),
                        {
                            background: entry.multiplier >= 1.4 ? 'rgba(74, 222, 128, 0.14)' : 'rgba(96, 165, 250, 0.14)',
                            text: entry.multiplier >= 1.4 ? '#d6ffe2' : '#d8eaff',
                            border: entry.multiplier >= 1.4 ? 'rgba(74, 222, 128, 0.28)' : 'rgba(96, 165, 250, 0.28)'
                        }
                    ));
                });
                card.appendChild(strongWrap);

                var weakLabel = document.createElement('div');
                weakLabel.textContent = 'Lower impact';
                weakLabel.style.cssText = 'font-size:0.82rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffb6b6;margin-bottom:8px;';
                card.appendChild(weakLabel);

                var weakWrap = document.createElement('div');
                weakWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
                row.weak.slice(0, 3).forEach(function (entry) {
                    weakWrap.appendChild(createBadge(
                        (window.I18n && window.I18n.tDemon ? window.I18n.tDemon(entry.demonType) : entry.demonType) + ' x' + entry.multiplier.toFixed(2).replace(/0$/, ''),
                        {
                            background: 'rgba(248, 113, 113, 0.14)',
                            text: '#ffe0e0',
                            border: 'rgba(248, 113, 113, 0.28)'
                        }
                    ));
                });

                if (!row.weak.length) {
                    var neutral = document.createElement('div');
                    neutral.textContent = 'Everything else is neutral at x1.0';
                    neutral.style.cssText = 'color:rgba(255,255,255,0.62);font-size:0.9rem;';
                    weakWrap.appendChild(neutral);
                }

                card.appendChild(weakWrap);
                grid.appendChild(card);
            });

            this.body.appendChild(grid);
        }

        open() {
            this.ensureDom();
            this.render();
            this.root.style.display = 'block';
            this.isOpen = true;
        }

        close() {
            if (!this.root) {
                return;
            }

            this.root.style.display = 'none';
            this.isOpen = false;
        }
    }

    window.AffinityHelpOverlay = new AffinityHelpOverlay();
})();
