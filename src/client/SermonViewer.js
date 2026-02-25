// SermonViewer.js — Paginated devotional sermon viewer (canvas-based)
// IIFE pattern, sets window.SermonViewer
(function () {
    let sermonData = null;       // { pages: string[], prayer: string, verseReference: string }
    let currentPage = 0;
    let totalPages = 0;          // pages.length + 1 (prayer is the last page)
    let hitRects = [];
    let isLoading = false;
    let loadError = null;
    let returnCallback = null;   // Called when user exits the viewer

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

    /**
     * Fetch sermon from the API and display it.
     * @param {string} verseReference - e.g. "John 3:16"
     * @param {string} verseText - full verse text
     * @param {string} category - verse category
     * @param {function} onExit - callback when viewer is closed
     */
    function open(verseReference, verseText, category, onExit) {
        sermonData = null;
        currentPage = 0;
        totalPages = 0;
        isLoading = true;
        loadError = null;
        returnCallback = onExit || null;

        // Render loading state immediately
        render();

        // Fetch from API
        const params = new URLSearchParams({
            ref: verseReference,
            text: verseText,
            category: category || 'General'
        });

        fetch('/api/sermon?' + params.toString())
            .then(function (res) { return res.json(); })
            .then(function (data) {
                isLoading = false;
                if (data.status === 'ready' && data.pages && data.prayer) {
                    sermonData = {
                        pages: data.pages,
                        prayer: data.prayer,
                        verseReference: verseReference
                    };
                    totalPages = data.pages.length + 1; // +1 for prayer page
                    currentPage = 0;
                } else {
                    loadError = data.error || 'Could not generate devotional. Try again later.';
                }
                render();
            })
            .catch(function (err) {
                isLoading = false;
                loadError = 'Network error. Check your connection.';
                console.error('Sermon fetch error:', err);
                render();
            });
    }

    function close() {
        sermonData = null;
        isLoading = false;
        loadError = null;
        if (returnCallback) {
            returnCallback();
            returnCallback = null;
        }
    }

    function isOpen() {
        return isLoading || sermonData !== null || loadError !== null;
    }

    // ==================== Rendering ====================

    function render() {
        updateDimensions();
        var c = getCtx();
        if (!c) return;

        c.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Background
        c.fillStyle = '#1a1a2e';
        c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        hitRects = [];

        if (isLoading) {
            drawLoading(c);
        } else if (loadError) {
            drawError(c);
        } else if (sermonData) {
            drawSermonPage(c);
        }
    }

    function drawLoading(c) {
        c.fillStyle = '#ffd700';
        c.font = 'bold 20px Arial';
        c.textAlign = 'center';
        c.fillText('Generating devotional...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

        c.fillStyle = '#888';
        c.font = '14px Arial';
        c.fillText('This may take a few seconds', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);

        // Animated dots
        var dots = '.'.repeat((Math.floor(Date.now() / 500) % 3) + 1);
        c.fillText(dots, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);

        drawCloseButton(c);
        c.textAlign = 'left';
    }

    function drawError(c) {
        c.fillStyle = '#ff6b6b';
        c.font = 'bold 18px Arial';
        c.textAlign = 'center';
        c.fillText('Could not load devotional', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        c.fillStyle = '#aaa';
        c.font = '14px Arial';
        drawWrappedText(c, loadError, 30, CANVAS_HEIGHT / 2 + 5, CANVAS_WIDTH - 60, 22);

        // Retry button
        var btnX = CANVAS_WIDTH / 2 - 50;
        var btnY = CANVAS_HEIGHT / 2 + 60;
        c.fillStyle = '#e67e22';
        roundRect(c, btnX, btnY, 100, 36, 6);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 14px Arial';
        c.fillText('Retry', CANVAS_WIDTH / 2, btnY + 24);
        hitRects.push({ name: 'retry', x: btnX, y: btnY, w: 100, h: 36 });

        drawCloseButton(c);
        c.textAlign = 'left';
    }

    function drawSermonPage(c) {
        var isLastPage = currentPage >= sermonData.pages.length;
        var pageText = isLastPage ? sermonData.prayer : sermonData.pages[currentPage];
        var pageLabel = isLastPage ? 'Prayer' : ('Page ' + (currentPage + 1) + ' of ' + sermonData.pages.length);

        // Header
        c.fillStyle = '#ffd700';
        c.font = 'bold 20px Arial';
        c.textAlign = 'center';
        c.fillText('Devotional', CANVAS_WIDTH / 2, 35);

        // Verse reference
        c.fillStyle = '#aaa';
        c.font = '13px Arial';
        c.fillText(sermonData.verseReference, CANVAS_WIDTH / 2, 55);

        // Page indicator
        c.fillStyle = isLastPage ? '#4CAF50' : '#666';
        c.font = '12px Arial';
        c.fillText(pageLabel, CANVAS_WIDTH / 2, 75);

        // Content area
        c.fillStyle = isLastPage ? '#c8e6c9' : '#e0e0e0';
        c.font = isLastPage ? 'italic 17px Arial' : '17px Arial';
        c.textAlign = 'left';

        var textY = 100;
        var maxWidth = CANVAS_WIDTH - 50;
        drawWrappedText(c, pageText, 25, textY, maxWidth, 28);

        // Navigation buttons
        drawNavButtons(c);

        // Close button
        drawCloseButton(c);

        c.textAlign = 'left';
    }

    function drawNavButtons(c) {
        var btnY = CANVAS_HEIGHT - 55;
        var btnH = 40;

        // Previous button (only if not first page)
        if (currentPage > 0) {
            var prevX = 20;
            var prevW = 100;
            c.fillStyle = '#555';
            roundRect(c, prevX, btnY, prevW, btnH, 6);
            c.fill();
            c.fillStyle = '#fff';
            c.font = 'bold 14px Arial';
            c.textAlign = 'center';
            c.fillText('< Previous', prevX + prevW / 2, btnY + 27);
            hitRects.push({ name: 'prev', x: prevX, y: btnY, w: prevW, h: btnH });
        }

        // Next / Done button
        var isLastPage = currentPage >= sermonData.pages.length;
        var nextX = CANVAS_WIDTH - 120;
        var nextW = 100;
        c.fillStyle = isLastPage ? '#4CAF50' : '#0066cc';
        roundRect(c, nextX, btnY, nextW, btnH, 6);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 14px Arial';
        c.textAlign = 'center';
        c.fillText(isLastPage ? 'Amen' : 'Next >', nextX + nextW / 2, btnY + 27);
        hitRects.push({ name: isLastPage ? 'done' : 'next', x: nextX, y: btnY, w: nextW, h: btnH });
    }

    function drawCloseButton(c) {
        // X button top-right
        var btnX = CANVAS_WIDTH - 40;
        var btnY = 8;
        var btnSize = 28;
        c.fillStyle = 'rgba(255,255,255,0.15)';
        roundRect(c, btnX, btnY, btnSize, btnSize, 4);
        c.fill();
        c.fillStyle = '#ccc';
        c.font = 'bold 16px Arial';
        c.textAlign = 'center';
        c.fillText('✕', btnX + btnSize / 2, btnY + 20);
        hitRects.push({ name: 'close', x: btnX, y: btnY, w: btnSize, h: btnSize });
    }

    // ==================== Interaction ====================

    function handleClick(x, y) {
        for (var i = 0; i < hitRects.length; i++) {
            var r = hitRects[i];
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                if (r.name === 'prev') {
                    currentPage = Math.max(0, currentPage - 1);
                    render();
                } else if (r.name === 'next') {
                    currentPage = Math.min(totalPages - 1, currentPage + 1);
                    render();
                } else if (r.name === 'done' || r.name === 'close') {
                    close();
                } else if (r.name === 'retry') {
                    // Re-attempt — caller must call open() again
                    close();
                }
                return true;
            }
        }
        return false;
    }

    // ==================== Helpers ====================

    function drawWrappedText(c, text, x, y, maxWidth, lineHeight) {
        var words = text.split(' ');
        var line = '';
        for (var i = 0; i < words.length; i++) {
            var testLine = line + words[i] + ' ';
            if (c.measureText(testLine).width > maxWidth && i > 0) {
                c.fillText(line, x, y);
                line = words[i] + ' ';
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

    // ==================== Public API ====================

    window.SermonViewer = {
        open: open,
        close: close,
        isOpen: isOpen,
        render: render,
        handleClick: handleClick
    };
})();
