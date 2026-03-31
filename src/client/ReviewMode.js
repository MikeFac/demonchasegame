// ReviewMode.js - Review mode functionality extracted from game.js
// IIFE pattern, sets window.ReviewMode (same as UILayout.js)
(function () {
    // Private audio state
    let isAudioPlaying = false;
    let currentAudio = null;

    // Review mode state
    let reviewCategoryPickerOpen = false;
    let repeatDelay = 5000; // Default 5 seconds in milliseconds
    let repeatTimer = null;
    let meditationMode = false; // Toggle for continuous repeat
    let returnToMode = 'game'; // Where to return when exiting review ('game' or 'overland')
    let currentReviewVerseIndex = 0;
    let lastRenderedVerseIndex = -1; // Track verse changes to trigger new background
    let musicWasPlayingOnEntry = false;
    let currentDiscipleshipPageIndex = 0;


    // Repeat delay options (in milliseconds)
    const REPEAT_DELAYS = {
        '5s': 5000,
        '15s': 15000,
        '1m': 60000,
        '5m': 300000,
        '1h': 3600000
    };

    // UI state for icon-based interaction
    let hitRects = [];
    let hoveredButton = null;
    let delayDropdownOpen = false;

    // Local flash message for review mode feedback
    let reviewFlashMessage = null;

    // Preloaded SVG icons
    const iconImages = {};
    let iconsLoaded = false;

    // Background images — all 3 preloaded, one selected randomly per verse
    const BG_SRCS = [
        'images/backgrounds/forest.png',
        'images/backgrounds/lake.png',
        'images/backgrounds/mountains.png'
    ];
    const bgImages = BG_SRCS.map(src => {
        const img = new Image();
        img.src = src;
        return img;
    });
    let currentBgImage = bgImages[0]; // default until first verse shown

    function pickRandomBackground() {
        const loaded = bgImages.filter(img => img.complete && img.naturalWidth > 0);
        if (loaded.length === 0) return;
        currentBgImage = loaded[Math.floor(Math.random() * loaded.length)];
    }

    function loadIcons() {
        if (iconsLoaded) return;
        const iconNames = ['back', 'next', 'play', 'repeat', 'share', 'stop'];
        iconNames.forEach(name => {
            const img = new Image();
            img.src = `images/icons/${name}.svg`;
            iconImages[name] = img;
        });
        iconsLoaded = true;
    }

    function drawSvgIcon(c, name, x, y, size, color) {
        const img = iconImages[name];
        if (img && img.complete && img.naturalWidth > 0) {
            c.save();
            if (color) {
                c.globalCompositeOperation = 'source-over';
            }
            c.drawImage(img, x, y, size, size);
            c.restore();
        } else {
            // Fallback: draw shapes if SVG not loaded yet
            c.save();
            c.strokeStyle = color || '#fff';
            c.fillStyle = color || '#fff';
            c.lineWidth = 2;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            const cx = x + size / 2;
            const cy = y + size / 2;
            const s = size * 0.6;
            if (name === 'back') {
                c.beginPath();
                c.moveTo(cx + s / 4, cy - s / 2);
                c.lineTo(cx - s / 4, cy);
                c.lineTo(cx + s / 4, cy + s / 2);
                c.stroke();
            } else if (name === 'next') {
                c.beginPath();
                c.moveTo(cx - s / 4, cy - s / 2);
                c.lineTo(cx + s / 4, cy);
                c.lineTo(cx - s / 4, cy + s / 2);
                c.stroke();
            } else if (name === 'play') {
                c.beginPath();
                c.moveTo(cx - s / 4, cy - s / 2);
                c.lineTo(cx + s / 2, cy);
                c.lineTo(cx - s / 4, cy + s / 2);
                c.closePath();
                c.fill();
            } else if (name === 'stop') {
                c.beginPath();
                c.rect(cx - s / 2, cy - s / 2, s, s);
                c.fill();
            } else if (name === 'repeat') {
                c.beginPath();
                c.arc(cx, cy, s / 2, -Math.PI / 2, Math.PI, false);
                c.stroke();
                c.beginPath();
                c.moveTo(cx - s / 2 - s / 6, cy - s / 6);
                c.lineTo(cx - s / 2, cy + s / 6);
                c.lineTo(cx - s / 2 + s / 6, cy - s / 6);
                c.stroke();
            } else if (name === 'share') {
                c.beginPath();
                c.arc(cx - s / 3, cy, s / 6, 0, Math.PI * 2);
                c.moveTo(cx + s / 3, cy - s / 3);
                c.arc(cx + s / 3, cy - s / 3, s / 6, 0, Math.PI * 2);
                c.moveTo(cx + s / 3, cy + s / 3);
                c.arc(cx + s / 3, cy + s / 3, s / 6, 0, Math.PI * 2);
                c.stroke();
                c.beginPath();
                c.moveTo(cx - s / 3 + s / 6, cy);
                c.lineTo(cx + s / 3 - s / 6, cy - s / 3);
                c.moveTo(cx - s / 3 + s / 6, cy);
                c.lineTo(cx + s / 3 - s / 6, cy + s / 3);
                c.stroke();
            }
            c.restore();
        }
    }

    function drawMusicLibraryIcon(c, x, y, size, color) {
        c.save();
        c.strokeStyle = color || '#fff';
        c.fillStyle = color || '#fff';
        c.lineWidth = 2.4;
        c.lineCap = 'round';

        const stemBottom = y + size * 0.72;
        const leftStemX = x + size * 0.34;
        const rightStemX = x + size * 0.58;
        const stemTopY = y + size * 0.20;
        const beamY = y + size * 0.18;

        c.beginPath();
        c.moveTo(leftStemX, stemBottom);
        c.lineTo(leftStemX, stemTopY);
        c.lineTo(rightStemX, stemTopY + size * 0.08);
        c.lineTo(rightStemX, stemBottom - size * 0.02);
        c.stroke();

        c.beginPath();
        c.moveTo(leftStemX, beamY);
        c.lineTo(rightStemX, beamY + size * 0.08);
        c.stroke();

        c.beginPath();
        c.ellipse(leftStemX - size * 0.10, stemBottom, size * 0.11, size * 0.08, -0.35, 0, Math.PI * 2);
        c.ellipse(rightStemX - size * 0.10, stemBottom - size * 0.02, size * 0.11, size * 0.08, -0.35, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }

    function drawTooltip(c, text, x, y) {
        c.font = '12px Arial';
        const textWidth = c.measureText(text).width;
        const tw = textWidth + 12;
        const th = 22;

        let tx = x - tw / 2;
        let ty = y - th - 10;

        // Boundary clamping
        if (tx < 5) tx = 5;
        if (tx + tw > canvas.width - 5) tx = canvas.width - tw - 5;
        if (ty < 5) ty = y + 40;

        c.fillStyle = 'rgba(0, 0, 0, 0.85)';
        c.beginPath();
        c.roundRect(tx, ty, tw, th, 4);
        c.fill();
        c.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        c.stroke();

        c.fillStyle = '#fff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(text, tx + tw / 2, ty + th / 2);
        c.textBaseline = 'alphabetic';
        c.textAlign = 'left';
    }

    function saveGameState() {
        console.log("Got to save game state - button clicked");
        let savedGameState = {
            player: {
                ...player
            },
            monsters: [...monsters],
        };
    }

    function startReviewMode(options) {
        options = options || {};
        returnToMode = options.returnTo || 'game';
        
        loadIcons();

        // Force canvas resize BEFORE any rendering
        if (typeof canvas !== 'undefined' && typeof getOptimalCanvasWidth === 'function') {
            canvas.width = getOptimalCanvasWidth();
            canvas.height = Math.min(600, window.innerHeight - 80);
            ctx = canvas.getContext('2d');
            // Canvas resize logged only when actually changed
        }
        

        
        // Pick a valid category with verses for first render.
        const availableQualities = Object.keys(organizedVerses || {}).filter(function (quality) {
            return organizedVerses[quality] && organizedVerses[quality].length > 0;
        });
        const requestedQuality = options.vQuality;
        const existingQuality = window.vQuality;

        if (requestedQuality && availableQualities.includes(requestedQuality)) {
            window.vQuality = requestedQuality;
        } else if (!existingQuality || !availableQualities.includes(existingQuality)) {
            window.vQuality = availableQualities.length > 0 ? availableQualities[0] : 'Faith';
        }

        resetReviewPresentationState();
        musicWasPlayingOnEntry = Boolean(
            window.MusicManager &&
            typeof window.MusicManager.getIsPlaying === 'function' &&
            window.MusicManager.getIsPlaying()
        );

        if (musicWasPlayingOnEntry && typeof window.MusicManager.pause === 'function') {
            window.MusicManager.pause();
        }

        
        window.gameMode = 'review';
        if (typeof window.clearToasts === 'function') {
            window.clearToasts();
        }
        if (window.ModeManager && typeof window.ModeManager.adopt === 'function') {
            window.ModeManager.adopt('review', options);
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        displayReviewVerseScreen();


        if (window.Analytics) {
            var verseCount = incorrectAnswerReferences.length > 0 
                ? incorrectAnswerReferences.length 
                : (organizedVerses[window.vQuality] ? organizedVerses[window.vQuality].length : 0);
            Analytics.trackReviewModeUsed(verseCount);
        }
    }

    function restoreGameState() {
        clearRepeatTimer();
        if (typeof window.onReviewModeReturn === 'function') {
            window.onReviewModeReturn(returnToMode);
        }
        
        if (returnToMode === 'overland' && typeof showOverland === 'function') {
            if (typeof clearMissionContentOverride === 'function' && !window.currentMission) {
                clearMissionContentOverride();
            }
            if (musicWasPlayingOnEntry &&
                window.MusicManager &&
                typeof window.MusicManager.resume === 'function') {
                window.MusicManager.resume();
            }
            window.gameMode = 'overland';
            showOverland();
        } else {
            window.gameMode = 'game';
            if (window.ModeManager && typeof window.ModeManager.adopt === 'function') {
                window.ModeManager.adopt('soloDungeon');
            }
            if (musicWasPlayingOnEntry &&
                window.MusicManager &&
                typeof window.MusicManager.resume === 'function') {
                window.MusicManager.resume();
            }
        }

        musicWasPlayingOnEntry = false;
    }

    function getVerseDetails(reference) {
        for (let category in organizedVerses) {
            for (let i = 0; i < organizedVerses[category].length; i++) {
                const verse = organizedVerses[category][i];
                if (verse.Reference === reference) {
                    return {
                        text: verse.Text,
                        category: category,
                        entry: verse,
                        discipleshipContent: verse.discipleshipContent || null
                    };
                }
            }
        }
        return null;
    }

    function getReviewItemsForCurrentCategory() {
        const qualityVerses = organizedVerses[window.vQuality];
        if (!qualityVerses || qualityVerses.length === 0) {
            return [];
        }

        const items = [];
        const seenContentIds = new Set();

        qualityVerses.forEach(function (entry) {
            if (entry && entry.discipleshipContent) {
                const contentId = entry.discipleshipContent.contentId || entry.Reference;
                if (seenContentIds.has(contentId)) {
                    return;
                }
                seenContentIds.add(contentId);
            }
            items.push(entry);
        });

        return items;
    }

    function resetReviewPresentationState() {
        currentReviewMode = 'quality';
        currentReviewVerseIndex = 0;
        currentDiscipleshipPageIndex = 0;
        lastRenderedVerseIndex = -1;
        repeatEnabled = false;
        meditationMode = false;
        hasPlayed = false;
        reviewCategoryPickerOpen = false;
        delayDropdownOpen = false;
        stopAudio();
        clearRepeatTimer();
    }

    function drawWrappedParagraph(text, x, startY, maxWidth, font, color, lineHeight, maxLines) {
        if (!text) return startY;
        const words = String(text).split(' ');
        let line = '';
        let y = startY;
        let linesDrawn = 0;

        ctx.font = font;
        ctx.fillStyle = color;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth && line && (!maxLines || linesDrawn < maxLines - 1)) {
                ctx.fillText(line.trim(), x, y);
                y += lineHeight;
                line = words[i] + ' ';
                linesDrawn++;
            } else {
                line = testLine;
            }
        }

        if (line && (!maxLines || linesDrawn < maxLines)) {
            ctx.fillText(line.trim(), x, y);
            y += lineHeight;
        }

        return y;
    }

    function getDiscipleshipPages(verseReference, verseDetails) {
        const entry = verseDetails && verseDetails.entry;
        const content = verseDetails && verseDetails.discipleshipContent;
        if (!entry || !content) {
            return [];
        }

        const passages = Array.isArray(content.passages) ? content.passages : [];
        const pages = [];

        pages.push({
            pageLabel: 'Overview',
            badge: content.type ? content.type.toUpperCase() : 'DISCIPLESHIP',
            title: content.title || verseReference,
            sections: [
                content.summary ? { body: content.summary, font: '20px Arial', color: '#e7edf6', lineHeight: 28, maxLines: 4 } : null,
                content.focus && content.focus.statement ? { heading: 'Focus', body: content.focus.statement, font: '18px Arial', color: '#fff6d9', lineHeight: 24, maxLines: 4 } : null
            ].filter(Boolean)
        });

        if (passages.length > 0) {
            pages.push({
                pageLabel: 'Passage',
                badge: 'PASSAGE',
                title: passages[0].reference || verseReference,
                sections: [
                    { body: passages[0].text || verseDetails.text, font: '22px Arial', color: '#ffffff', lineHeight: 30, maxLines: 7 }
                ]
            });
        }

        if (content.contextCard && content.contextCard.body) {
            pages.push({
                pageLabel: 'Context',
                badge: 'CONTEXT',
                title: content.contextCard.title || 'Context',
                sections: [
                    { body: content.contextCard.body, font: '18px Arial', color: '#d8e4f2', lineHeight: 24, maxLines: 8 }
                ]
            });
        }

        if (content.reflection && content.reflection.prompt) {
            pages.push({
                pageLabel: 'Reflect',
                badge: 'REFLECT',
                title: 'Reflect',
                sections: [
                    { body: content.reflection.prompt, font: '20px Arial', color: '#fff6d9', lineHeight: 28, maxLines: 7 }
                ]
            });
        }

        return pages;
    }

    function displayReviewDiscipleshipEntry(verseReference, verseDetails) {
        const pages = getDiscipleshipPages(verseReference, verseDetails);
        if (pages.length === 0) {
            displayReviewVerse(verseDetails ? verseDetails.text : '');
            return { pageCount: 1, pageIndex: 0, pageLabel: '' };
        }

        if (currentDiscipleshipPageIndex < 0) currentDiscipleshipPageIndex = 0;
        if (currentDiscipleshipPageIndex >= pages.length) currentDiscipleshipPageIndex = pages.length - 1;

        const page = pages[currentDiscipleshipPageIndex];
        let y = 96;
        const maxWidth = canvas.width - 40;

        ctx.fillStyle = '#f5c542';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(page.badge, 20, y);
        y += 30;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        y = drawWrappedParagraph(page.title || verseReference, 20, y, maxWidth, 'bold 30px Arial', '#ffffff', 34, 3) + 8;

        page.sections.forEach(function (section) {
            if (section.heading) {
                ctx.fillStyle = '#9fd0ff';
                ctx.font = 'bold 18px Arial';
                ctx.fillText(section.heading, 20, y);
                y += 26;
            }
            y = drawWrappedParagraph(section.body, 20, y, maxWidth, section.font, section.color, section.lineHeight, section.maxLines) + 14;
        });

        return {
            pageCount: pages.length,
            pageIndex: currentDiscipleshipPageIndex,
            pageLabel: page.pageLabel
        };
    }

    function displayReviewVerseScreen() {
        if (window.gameMode === 'review') {
            // Force canvas resize before every render to ensure correct dimensions
            if (typeof canvas !== 'undefined' && typeof getOptimalCanvasWidth === 'function') {
                const targetWidth = getOptimalCanvasWidth();
                const targetHeight = Math.min(600, window.innerHeight - 80);
                if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    ctx = canvas.getContext('2d');
                }
            }
            

            
            // If sermon viewer is open, let it render instead
            if (window.SermonViewer && SermonViewer.isOpen()) {
                SermonViewer.render();
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Background: draw image + gradient overlay for readability
            if (currentBgImage && currentBgImage.complete && currentBgImage.naturalWidth > 0) {
                // Draw image scaled to fill canvas
                const scale = Math.max(canvas.width / currentBgImage.width, canvas.height / currentBgImage.height);
                const w = currentBgImage.width * scale;
                const h = currentBgImage.height * scale;
                ctx.drawImage(currentBgImage, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

                // Dark overlay — stronger at top (controls/text) and bottom (nav buttons)
                // lighter in the middle so the image bleeds through
                const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
                grad.addColorStop(0,    'rgba(10, 10, 25, 0.82)'); // top bar area
                grad.addColorStop(0.18, 'rgba(10, 10, 25, 0.55)'); // verse text area starts
                grad.addColorStop(0.6,  'rgba(10, 10, 25, 0.45)'); // mid canvas
                grad.addColorStop(0.82, 'rgba(10, 10, 25, 0.65)'); // approaching bottom controls
                grad.addColorStop(1,    'rgba(10, 10, 25, 0.85)'); // bottom nav bar
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                // Fallback solid dark background
                ctx.fillStyle = '#0f0f1b';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Top bar — subtle frosted glass strip
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(0, 0, canvas.width, 60);

            // Reset hitRects for this frame
            hitRects = [];

            drawReviewModeButtons();
            drawNavigationButtons();

            // Draw category picker if open
            if (reviewCategoryPickerOpen) {
                drawCategoryPicker();
                return; // Don't draw verse when picker is open
            }

            let verseReference;
            let verseDetails;

            if (incorrectAnswerReferences.length == 0) {
                currentReviewMode = 'quality';
            }
            if (currentReviewMode === 'incorrect') {
                verseReference = incorrectAnswerReferences[currentReviewVerseIndex];
                verseDetails = getVerseDetails(verseReference);
            } else if (currentReviewMode === 'quality') {
                const reviewItems = getReviewItemsForCurrentCategory();
                if (!reviewItems || reviewItems.length === 0) {
                    ctx.font = '18px Arial';
                    ctx.fillStyle = 'red';
                    ctx.fillText('No verses in this category', 10, 150);
                    return;
                }
                if (currentReviewVerseIndex >= reviewItems.length) {
                    currentReviewVerseIndex = reviewItems.length - 1;
                }
                verseReference = reviewItems[currentReviewVerseIndex].Reference;
                verseDetails = {
                    text: reviewItems[currentReviewVerseIndex].Text,
                    category: window.vQuality,
                    entry: reviewItems[currentReviewVerseIndex],
                    discipleshipContent: reviewItems[currentReviewVerseIndex].discipleshipContent || null
                };
            }

            if (verseDetails) {
                // Pick a new random background whenever the verse changes
                if (currentReviewVerseIndex !== lastRenderedVerseIndex) {
                    pickRandomBackground();
                    lastRenderedVerseIndex = currentReviewVerseIndex;
                    currentDiscipleshipPageIndex = 0;
                }
                let discipleshipPageState = null;
                if (verseDetails.discipleshipContent) {
                    discipleshipPageState = displayReviewDiscipleshipEntry(verseReference, verseDetails);
                } else {
                    displayReviewVerse(verseDetails.text);
                }

                if (verseDetails.discipleshipContent) {
                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(t('review.reference', verseReference), 20, canvas.height - 94);

                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(t('review.learn', tCategory(verseDetails.category)), 20, canvas.height - 68);

                    if (discipleshipPageState && discipleshipPageState.pageCount > 1) {
                        ctx.textAlign = 'right';
                        ctx.fillStyle = '#e8d44d';
                        ctx.fillText(
                            `${discipleshipPageState.pageLabel} ${discipleshipPageState.pageIndex + 1}/${discipleshipPageState.pageCount}`,
                            canvas.width - 20,
                            canvas.height - 68
                        );
                        ctx.textAlign = 'left';
                    }
                } else {
                    ctx.font = '20px Arial';
                    ctx.fillStyle = 'white';
                    ctx.fillText(t('review.learn', tCategory(verseDetails.category)), 20, canvas.height - 90);

                    ctx.font = '20px Arial';
                    ctx.fillStyle = 'white';
                    ctx.fillText(t('review.reference', verseReference), 20, canvas.height - 120);
                }

                const songBrowsingMode = window.MusicManager &&
                    typeof window.MusicManager.getSongBrowsingMode === 'function' &&
                    window.MusicManager.getSongBrowsingMode();

                if (!verseDetails.discipleshipContent && !songBrowsingMode && !isAudioPlaying && !repeatEnabled && !meditationMode) {
                    startVerseAudio(verseReference);
                }
            }

            // Draw flash message (share feedback, etc.)
            if (reviewFlashMessage) {
                const elapsed = Date.now() - reviewFlashMessage.startTime;
                if (elapsed < reviewFlashMessage.duration) {
                    const alpha = Math.min(1, 1 - (elapsed / reviewFlashMessage.duration) * 0.5);
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    const msgW = ctx.measureText(reviewFlashMessage.text).width + 30;
                    const msgX = canvas.width / 2 - msgW / 2;
                    const msgY = 65;
                    ctx.beginPath();
                    ctx.roundRect(msgX, msgY, msgW, 32, 8);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.fillText(reviewFlashMessage.text, canvas.width / 2, msgY + 22);
                    ctx.textAlign = 'left';
                    ctx.restore();
                } else {
                    reviewFlashMessage = null;
                }
            }

            // Draw tooltip layer (on top of everything)
            if (hoveredButton) {
                const rect = hitRects.find(r => r.name === hoveredButton);
                if (rect && rect.tooltip) {
                    drawTooltip(ctx, rect.tooltip, rect.x + rect.w / 2, rect.y);
                }
            }
        }
    }

    function displayReviewVerse(text) {
        const fontSize = 28;
        const lineHeight = fontSize * 1.3;
        const maxWidth = canvas.width - 40;
        


        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = 'white';

        const words = text.split(' ');
        let line = '';
        let y = 100;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && i > 0) {

                ctx.fillText(line, 20, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        

        ctx.fillText(line, 20, y);
    }

    function drawNavigationButtons() {
        const iconSize = 44;
        const bottomY = canvas.height - iconSize - 15;

        // === Previous (back) icon - left ===
        const prevX = 15;
        if (hoveredButton === 'prev') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.roundRect(prevX, bottomY, iconSize, iconSize, 10);
            ctx.fill();
        }
        drawSvgIcon(ctx, 'back', prevX, bottomY, iconSize, '#fff');
        hitRects.push({ name: 'prev', x: prevX, y: bottomY, w: iconSize, h: iconSize, tooltip: t('review.previous') });

        // === Repeat icon - left-center ===
        const repeatX = prevX + iconSize + 12;
        if (hoveredButton === 'repeat') {
            ctx.fillStyle = meditationMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(repeatX + iconSize / 2, bottomY + iconSize / 2, iconSize / 2 + 5, 0, Math.PI * 2);
            ctx.fill();
        }
        const repeatColor = meditationMode ? '#4CAF50' : '#888';
        drawSvgIcon(ctx, 'repeat', repeatX, bottomY, iconSize, repeatColor);
        hitRects.push({ name: 'repeat', x: repeatX, y: bottomY, w: iconSize, h: iconSize, tooltip: meditationMode ? t('review.meditationOn') : t('review.repeat') });

        // === Timing dropdown button - appears right of repeat when meditation is on ===
        if (meditationMode) {
            const timeX = repeatX + iconSize + 8;
            const timeY = bottomY + 7;
            const timeW = 48;
            const timeH = 32;

            if (hoveredButton === 'timing') {
                ctx.fillStyle = 'rgba(76, 175, 80, 0.25)';
            } else {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            }
            ctx.beginPath();
            ctx.roundRect(timeX, timeY, timeW, timeH, 6);
            ctx.fill();
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            const delayLabel = getDelayLabel(repeatDelay);
            ctx.fillText(delayLabel, timeX + timeW / 2, timeY + 21);
            ctx.textAlign = 'left';
            hitRects.push({ name: 'timing', x: timeX, y: timeY, w: timeW, h: timeH, tooltip: 'Repeat Delay' });

            // Draw dropdown if open (opens ABOVE the timing button to stay on screen)
            if (delayDropdownOpen) {
                const options = Object.keys(REPEAT_DELAYS);
                const dropdownH = options.length * 32;
                drawDelayDropdown(timeX, timeY - dropdownH - 4);
            }
        }

        // === Next icon - right ===
        const nextX = canvas.width - iconSize - 15;
        if (hoveredButton === 'next') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.roundRect(nextX, bottomY, iconSize, iconSize, 10);
            ctx.fill();
        }
        drawSvgIcon(ctx, 'next', nextX, bottomY, iconSize, '#fff');
        hitRects.push({ name: 'next', x: nextX, y: bottomY, w: iconSize, h: iconSize, tooltip: t('review.next') });
    }

    function getDelayLabel(ms) {
        for (const [label, value] of Object.entries(REPEAT_DELAYS)) {
            if (value === ms) return label;
        }
        return '5s';
    }

    function drawCategoryPicker() {
        const categories = (typeof QUALITIES !== 'undefined' && QUALITIES.length > 0) 
            ? QUALITIES 
            : Object.keys(organizedVerses);
        const currentCategory = window.vQuality;
        const padding = 10;
        const itemH = 32;
        const cols = 2;
        const itemSpacing = 6;
        const panelW = 280;
        const rows = Math.ceil(categories.length / cols);
        const colWidth = (panelW - padding * 2 - itemSpacing * (cols - 1)) / cols;
        const panelH = padding + rows * (itemH + itemSpacing) + padding + 30;

        const panelX = (canvas.width - panelW) / 2;
        const panelY = Math.max(30, (canvas.height - panelH) / 2);

        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Panel background
        ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 12);
        ctx.fill();
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t('ui.selectCategory'), panelX + panelW / 2, panelY + 22);
        ctx.textAlign = 'left';

        // Category items in 2-column grid
        categories.forEach((cat, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const itemX = panelX + padding + col * (colWidth + itemSpacing);
            const itemY = panelY + 30 + padding + row * (itemH + itemSpacing);
            const isActive = cat === currentCategory;

            // Item background
            ctx.fillStyle = isActive ? 'rgba(74, 144, 226, 0.4)' : 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            ctx.roundRect(itemX, itemY, colWidth, itemH, 6);
            ctx.fill();

            if (isActive) {
                ctx.strokeStyle = '#4a90e2';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(itemX, itemY, colWidth, itemH, 6);
                ctx.stroke();
            }

            // Item text
            ctx.fillStyle = isActive ? '#4a90e2' : '#ffffff';
            ctx.font = isActive ? 'bold 13px Arial' : '13px Arial';
            const displayName = (typeof tCategory === 'function') ? tCategory(cat) : cat;
            ctx.fillText(displayName, itemX + 8, itemY + itemH / 2 + 4);
        });
    }

    function drawDelayDropdown(dropX, dropY) {
        const options = Object.keys(REPEAT_DELAYS);
        const itemH = 32;
        const dropdownW = 55;
        const dropdownH = options.length * itemH;

        ctx.fillStyle = 'rgba(30, 30, 50, 0.98)';
        ctx.beginPath();
        ctx.roundRect(dropX, dropY, dropdownW, dropdownH, 8);
        ctx.fill();
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.stroke();

        options.forEach((opt, idx) => {
            const iy = dropY + idx * itemH;
            if (hoveredButton === `delayOpt${idx}`) {
                ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
                ctx.fillRect(dropX + 2, iy + 2, dropdownW - 4, itemH - 4);
            }
            const isSelected = REPEAT_DELAYS[opt] === repeatDelay;
            ctx.fillStyle = isSelected ? '#ffd700' : 'white';
            ctx.font = isSelected ? 'bold 13px Arial' : '13px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(opt, dropX + dropdownW / 2, iy + 21);
            ctx.textAlign = 'left';

            hitRects.push({ name: `delayOpt${idx}`, x: dropX, y: iy, w: dropdownW, h: itemH });
        });
    }

    function handleReviewClick(clickedX, clickedY) {
        console.log('[REVIEW CLICK]', clickedX.toFixed(0), clickedY.toFixed(0), 'hitRects:', hitRects.length, hitRects.map(r => r.name).join(','));

        // If sermon viewer is open, delegate clicks to it
        if (window.SermonViewer && SermonViewer.isOpen()) {
            SermonViewer.handleClick(clickedX, clickedY);
            return;
        }

        // Handle category picker clicks (modal - consumes all clicks)
        if (reviewCategoryPickerOpen) {
            const categories = (typeof QUALITIES !== 'undefined' && QUALITIES.length > 0) 
                ? QUALITIES 
                : Object.keys(organizedVerses);
            const padding = 10;
            const itemH = 32;
            const cols = 2;
            const itemSpacing = 6;
            const panelW = 280;
            const rows = Math.ceil(categories.length / cols);
            const colWidth = (panelW - padding * 2 - itemSpacing * (cols - 1)) / cols;
            const panelH = padding + rows * (itemH + itemSpacing) + padding + 30;

            const panelX = (canvas.width - panelW) / 2;
            const panelY = Math.max(30, (canvas.height - panelH) / 2);

            // Check if click is inside a category item
            for (let idx = 0; idx < categories.length; idx++) {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const itemX = panelX + padding + col * (colWidth + itemSpacing);
                const itemY = panelY + 30 + padding + row * (itemH + itemSpacing);

                if (clickedX >= itemX && clickedX <= itemX + colWidth &&
                    clickedY >= itemY && clickedY <= itemY + itemH) {
                    // Category selected
                    window.vQuality = categories[idx];
                    resetReviewPresentationState();
                    displayReviewVerseScreen();
                    return;
                }
            }

            // Click outside items closes picker
            reviewCategoryPickerOpen = false;
            displayReviewVerseScreen();
            return;
        }

        // hitRect-based click dispatch
        for (const rect of hitRects) {
            if (clickedX >= rect.x && clickedX <= rect.x + rect.w &&
                clickedY >= rect.y && clickedY <= rect.y + rect.h) {

                if (rect.name === 'back') {
                    // Exit review mode
                    stopAudio();
                    clearRepeatTimer();
                    repeatEnabled = false;
                    meditationMode = false;
                    hasPlayed = false;
                    delayDropdownOpen = false;
                    restoreGameState();
                } else if (rect.name === 'share') {
                    // Share current verse
                    const verseRef = getCurrentVerseReference();
                    const verseDetails = getVerseDetails(verseRef);
                    if (verseRef && verseDetails && window.ShareManager) {
                        ShareManager.shareVerse(verseRef, verseDetails.text).then(result => {
                            if (result.success) {
                                // Show feedback directly in review mode
                                reviewFlashMessage = {
                                    text: result.method === 'native' ? '📤 Shared!' : '📋 Copied to clipboard!',
                                    startTime: Date.now(),
                                    duration: 2000
                                };
                                displayReviewVerseScreen();
                            }
                        });
                    }
                } else if (rect.name === 'songLibrary') {
                    const verseRef = getCurrentVerseReference();
                    if (window.SongLibraryOverlay) {
                        window.SongLibraryOverlay.open({
                            currentReference: verseRef
                        });
                    }
                } else if (rect.name === 'category') {
                    // Open category picker
                    reviewCategoryPickerOpen = true;
                    delayDropdownOpen = false;
                    displayReviewVerseScreen();
                } else if (rect.name === 'devotional') {
                    // Open devotional/sermon viewer
                    const verseRef = getCurrentVerseReference();
                    const verseDetails = getVerseDetails(verseRef);
                    if (verseRef && verseDetails && window.SermonViewer) {
                        stopAudio();
                        clearRepeatTimer();
                        delayDropdownOpen = false;
                        SermonViewer.open(verseRef, verseDetails.text, verseDetails.category, function () {
                            displayReviewVerseScreen();
                        });
                    }
                } else if (rect.name === 'prev') {
                    const verseRef = getCurrentVerseReference();
                    const verseInfo = verseRef ? getVerseDetails(verseRef) : null;
                    const pageCount = verseInfo && verseInfo.discipleshipContent
                        ? getDiscipleshipPages(verseRef, verseInfo).length
                        : 0;

                    if (pageCount > 1 && currentDiscipleshipPageIndex > 0) {
                        currentDiscipleshipPageIndex--;
                    } else if (currentReviewMode === 'incorrect') {
                        currentReviewVerseIndex = Math.max(currentReviewVerseIndex - 1, 0);
                        currentDiscipleshipPageIndex = 0;
                    } else if (currentReviewMode === 'quality') {
                        currentReviewVerseIndex = Math.max(currentReviewVerseIndex - 1, 0);
                        currentDiscipleshipPageIndex = 0;
                    }
                    stopAudio();
                    clearRepeatTimer();
                    repeatEnabled = false;
                    meditationMode = false;
                    hasPlayed = false;
                    delayDropdownOpen = false;
                    displayReviewVerseScreen();
                } else if (rect.name === 'next') {
                    const verseRef = getCurrentVerseReference();
                    const verseInfo = verseRef ? getVerseDetails(verseRef) : null;
                    const pageCount = verseInfo && verseInfo.discipleshipContent
                        ? getDiscipleshipPages(verseRef, verseInfo).length
                        : 0;

                    if (pageCount > 1 && currentDiscipleshipPageIndex < pageCount - 1) {
                        currentDiscipleshipPageIndex++;
                    } else if (currentReviewMode === 'incorrect') {
                        currentReviewVerseIndex = Math.min(currentReviewVerseIndex + 1, incorrectAnswerReferences.length - 1);
                        currentDiscipleshipPageIndex = 0;
                    } else if (currentReviewMode === 'quality') {
                        const reviewItems = getReviewItemsForCurrentCategory();
                        currentReviewVerseIndex = Math.min(currentReviewVerseIndex + 1, reviewItems.length - 1);
                        currentDiscipleshipPageIndex = 0;
                    }
                    stopAudio();
                    clearRepeatTimer();
                    repeatEnabled = false;
                    meditationMode = false;
                    hasPlayed = false;
                    delayDropdownOpen = false;
                    displayReviewVerseScreen();
                } else if (rect.name === 'repeat') {
                    // Toggle meditation mode on/off (immediately shows timer)
                    delayDropdownOpen = false;
                    if (!meditationMode) {
                        meditationMode = true;
                        repeatEnabled = false;
                        hasPlayed = false;
                        startMeditationRepeat();
                    } else {
                        // Turn off meditation mode
                        meditationMode = false;
                        repeatEnabled = false;
                        stopAudio();
                        clearRepeatTimer();
                    }
                    displayReviewVerseScreen();
                } else if (rect.name === 'timing') {
                    // Toggle delay dropdown
                    delayDropdownOpen = !delayDropdownOpen;
                    displayReviewVerseScreen();
                } else if (rect.name.startsWith('delayOpt')) {
                    // Select a delay option
                    const options = Object.keys(REPEAT_DELAYS);
                    const idx = parseInt(rect.name.replace('delayOpt', ''));
                    if (idx >= 0 && idx < options.length) {
                        repeatDelay = REPEAT_DELAYS[options[idx]];
                    }
                    delayDropdownOpen = false;
                    displayReviewVerseScreen();
                }

                // Close dropdown if clicked something other than timing or delay option
                if (delayDropdownOpen && !rect.name.startsWith('delayOpt') && rect.name !== 'timing') {
                    delayDropdownOpen = false;
                }

                return;
            }
        }

        // Click outside any button — close dropdown if open
        if (delayDropdownOpen) {
            delayDropdownOpen = false;
            displayReviewVerseScreen();
        }
    }

    function handleMouseMove(mouseX, mouseY) {
        let found = null;
        for (const rect of hitRects) {
            if (mouseX >= rect.x && mouseX <= rect.x + rect.w &&
                mouseY >= rect.y && mouseY <= rect.y + rect.h) {
                found = rect.name;
                break;
            }
        }
        if (hoveredButton !== found) {
            hoveredButton = found;
            displayReviewVerseScreen();
        }
    }

    function clearRepeatTimer() {
        if (repeatTimer) {
            clearTimeout(repeatTimer);
            repeatTimer = null;
        }
    }

    function startMeditationRepeat() {
        clearRepeatTimer();
        const verseRef = getCurrentVerseReference();
        if (verseRef && meditationMode) {
            startVerseAudio(verseRef);
        }
    }

    async function playAudio(verseRef) {
        var base = 'https://spiritualwar.games/otd/mv/www/audio/se/';
        var audio = new Audio(base + verseRef);
        audio.type = 'audio/ogg';
        audio.volume = 1;
        currentAudio = audio;

        return new Promise((resolve, reject) => {
            audio.onended = resolve;
            audio.onerror = reject;
            audio.play();
        });
    }

    var convertRef = function (Reference) {
        console.log("Reference to convert: " + Reference);
        var $lookup = {
            Chronicles: 'CH',
            Corinthians: 'CO',
            John: 'JHN',
            Peter: 'PE',
            Thessalonians: 'TH',
            Kings: 'KI',
            Samuel: 'SA',
            Timothy: 'TI',
            Genesis: 'GEN',
            Exodus: 'EXO',
            Leviticus: 'LEV',
            Numbers: 'NUM',
            Deuteronomy: 'DEU',
            Joshua: 'JOS',
            Judges: 'JDG',
            Ruth: 'RUT',
            Ezra: 'EZR',
            Nehemiah: 'NEH',
            Esther: 'EST',
            Job: 'JOB',
            Psalm: 'PSA',
            Psalms: 'PSA',
            Proverbs: 'PRO',
            Ecclesiastes: 'ECC',
            'Song of Solomon': 'SNG',
            'Song of Songs': 'SNG',
            Isaiah: 'ISA',
            Jeremiah: 'JER',
            Ezekiel: 'EZK',
            Daniel: 'DAN',
            Hosea: 'HOS',
            Joel: 'JOL',
            Amos: 'AMO',
            Obadiah: 'OBA',
            Jonah: 'JON',
            Micah: 'MIC',
            Nahum: 'NAM',
            Habbakuk: 'HAB',
            Zephaniah: 'ZEP',
            Haggai: 'HAG',
            Zechariah: 'ZEC',
            Malachi: 'MAL',
            Matthew: 'MAT',
            Mark: 'MRK',
            Luke: 'LUK',
            Acts: 'ACT',
            Romans: 'ROM',
            Galatians: 'GAL',
            Ephesians: 'EPH',
            Philippians: 'PHP',
            Colossians: 'COL',
            Titus: 'TIT',
            Philemon: 'PHM',
            Hebrews: 'HEB',
            James: 'JAS',
            Jude: 'JUD',
            Revelation: 'REV'
        };

        let arr = Reference.split(' ');
        let bookCode, bookPrefix, bookNameMain, chapterVerse;
        if (arr[0] in ['1', '2', '3']) {
            bookPrefix = arr[0];
            bookNameMain = arr[1];
            chapterVerse = arr[2];
            if (bookNameMain === 'John') {
                bookCode = bookPrefix + 'JN';
            } else {
                bookCode = bookPrefix + $lookup[bookNameMain];
            }
            console.log("Arr[0] = " + arr[0]);
            console.log(bookCode);
        } else {
            bookPrefix = '';
            bookNameMain = arr[0];
            chapterVerse = arr[1];
            bookCode = $lookup[arr[0]];
            if (typeof bookCode === undefined) {
                console.error(arr[0] + "is not a valid book");
                return "";
            }
        }
        let $arr2 = chapterVerse.split(':');
        let $arr3 = $arr2[1].split('-');
        return (bookCode + '-' + $arr2[0] + '-' + $arr3[0]);
    };

    function startVerseAudio(verseReference) {
        if (window.MusicManager &&
            typeof window.MusicManager.getSongBrowsingMode === 'function' &&
            window.MusicManager.getSongBrowsingMode()) {
            return;
        }

        if (isAudioPlaying || (hasPlayed && !repeatEnabled && !meditationMode)) {
            return;
        }

        var $vdir = convertRef(verseReference);
        console.log("Verse directory and file:" + $vdir);
        isAudioPlaying = true;
        playAudio($vdir + ".ogg")
            .then(() => {
                isAudioPlaying = false;
                hasPlayed = true;
                
                // Handle meditation mode repeat
                if (meditationMode && window.gameMode === 'review') {
                    repeatTimer = setTimeout(() => {
                        if (meditationMode && window.gameMode === 'review') {
                            hasPlayed = false;
                            startVerseAudio(getCurrentVerseReference());
                        }
                    }, repeatDelay);
                }
                // Handle simple repeat mode (one repeat only)
                else if (repeatEnabled && window.gameMode === 'review' && verseReference === getCurrentVerseReference()) {
                    setTimeout(() => {
                        if (repeatEnabled && window.gameMode === 'review' && verseReference === getCurrentVerseReference()) {
                            hasPlayed = false;
                            startVerseAudio(verseReference);
                        }
                    }, 5000);
                }
            })
            .catch((error) => {
                isAudioPlaying = false;
                console.error('Error playing audio:', error);
            });
    }

    function stopAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            isAudioPlaying = false;
            currentAudio = null;
        }
        isAudioPlaying = false;
    }

    function drawReviewModeButtons() {
        const iconSize = 44;
        const iconY = 8;

        // === Back icon (top-left) ===
        const backX = 10;
        if (hoveredButton === 'back') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.roundRect(backX, iconY, iconSize, iconSize, 10);
            ctx.fill();
        }
        drawSvgIcon(ctx, 'back', backX, iconY, iconSize, '#fff');
        hitRects.push({ name: 'back', x: backX, y: iconY, w: iconSize, h: iconSize, tooltip: 'Back' });

        // === Share icon (top-right) ===
        const shareX = canvas.width - iconSize - 10;
        if (hoveredButton === 'share') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.roundRect(shareX, iconY, iconSize, iconSize, 10);
            ctx.fill();
        }
        drawSvgIcon(ctx, 'share', shareX, iconY, iconSize, '#fff');
        hitRects.push({ name: 'share', x: shareX, y: iconY, w: iconSize, h: iconSize, tooltip: 'Share' });

        // === Song library icon (left of share) ===
        const musicX = shareX - iconSize - 10;
        if (hoveredButton === 'songLibrary') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.roundRect(musicX, iconY, iconSize, iconSize, 10);
            ctx.fill();
        }
        drawMusicLibraryIcon(ctx, musicX, iconY, iconSize, '#9bd2ff');
        hitRects.push({ name: 'songLibrary', x: musicX, y: iconY, w: iconSize, h: iconSize, tooltip: 'Song Library' });

        // === Category button (left of center) ===
        const catW = 90;
        const catH = 30;
        const catX = backX + iconSize + 12;
        const catY = iconY + (iconSize - catH) / 2;
        if (hoveredButton === 'category') {
            ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
        } else {
            ctx.fillStyle = reviewCategoryPickerOpen ? '#4a90e2' : 'rgba(74, 144, 226, 0.15)';
        }
        ctx.beginPath();
        ctx.roundRect(catX, catY, catW, catH, 15);
        ctx.fill();
        ctx.strokeStyle = reviewCategoryPickerOpen ? '#4a90e2' : 'rgba(74, 144, 226, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(catX, catY, catW, catH, 15);
        ctx.stroke();

        ctx.font = '12px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        const categoryLabel = (typeof tCategory === 'function') ? tCategory(window.vQuality) : window.vQuality;
        const displayLabel = categoryLabel.length > 10 ? categoryLabel.substring(0, 10) + '…' : categoryLabel;
        ctx.fillText(displayLabel + ' ▾', catX + catW / 2, catY + catH / 2 + 4);
        ctx.textAlign = 'left';
        hitRects.push({ name: 'category', x: catX, y: catY, w: catW, h: catH, tooltip: t('ui.selectCategory') });

        // === Devotional button (center) ===
        const devW = 90;
        const devH = 30;
        const devX = Math.floor((canvas.width - devW) / 2);
        const devY = iconY + (iconSize - devH) / 2;
        if (hoveredButton === 'devotional') {
            ctx.fillStyle = 'rgba(232, 212, 77, 0.25)';
        } else {
            ctx.fillStyle = 'rgba(232, 212, 77, 0.1)';
        }
        ctx.beginPath();
        ctx.roundRect(devX, devY, devW, devH, 15);
        ctx.fill();
        ctx.strokeStyle = '#e8d44d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(devX, devY, devW, devH, 15);
        ctx.stroke();
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#e8d44d';
        ctx.textAlign = 'center';
        ctx.fillText('Devotional', devX + devW / 2, devY + devH / 2 + 4);
        ctx.textAlign = 'left';
        hitRects.push({ name: 'devotional', x: devX, y: devY, w: devW, h: devH, tooltip: 'Devotional' });
    }

    function getCurrentVerseReference() {
        if (currentReviewMode === 'incorrect') {
            return incorrectAnswerReferences[currentReviewVerseIndex];
        } else if (currentReviewMode === 'quality') {
            const reviewItems = getReviewItemsForCurrentCategory();
            return reviewItems[currentReviewVerseIndex] ? reviewItems[currentReviewVerseIndex].Reference : null;
        }
    }

    // Public interface
    window.ReviewMode = {
        displayReviewVerseScreen,
        handleReviewClick,
        handleMouseMove,
        startReviewMode,
        saveGameState,
        restoreGameState,
        stopAudio,
        convertRef,
        playAudio
    };
})();
