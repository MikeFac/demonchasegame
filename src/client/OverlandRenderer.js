/**
 * OverlandRenderer - Draws the overland map with mission nodes.
 * 
 * Renders chapters as themed nodes (shield, heart, sword) showing
 * locked/unlocked/completed states. Supports chapter navigation.
 */
(function () {
    
    // Node shapes by chapter theme
    const NODE_SHAPES = {
        shield: 'shield',
        heart: 'heart',
        sword: 'sword',
        default: 'circle'
    };
    
    // Colors for states
    const COLORS = {
        locked: { fill: '#444444', stroke: '#666666', text: '#888888' },
        unlocked: { fill: '#4a90e2', stroke: '#2a70c2', text: '#ffffff' },
        completed: { fill: '#4CAF50', stroke: '#2E7D32', text: '#ffffff' },
        current: { fill: '#FFD700', stroke: '#FFA000', text: '#000000' }
    };
    
    class OverlandRenderer {
        constructor(ctx, canvas) {
            this.ctx = ctx;
            this.canvas = canvas;
            this.selectedWorld = null;
            this.selectedMission = null;
            this.worlds = [];
            this.featuredMissions = [];
            this.nodePositions = [];
            this.featuredNodePositions = [];
            this.scrollOffset = 0;
            this.contentHeight = 0;
        }
        
        /**
         * Set the worlds data to render.
         * @param {Array} worlds - Array of world objects
         * @param {Array} featuredMissions - Optional array of featured mission objects
         */
        setWorlds(worlds, featuredMissions) {
            this.worlds = worlds;
            this.featuredMissions = Array.isArray(featuredMissions) ? featuredMissions : [];
            this._calculateNodePositions();
        }
        
        /**
         * Calculate node positions for all worlds/missions.
         */
        _calculateNodePositions() {
            this.nodePositions = [];
            this.featuredNodePositions = [];

            const listX = 12;
            const listWidth = Math.max(260, this.canvas.width - 24);
            const headerHeight = 18;
            const headerGap = 8;
            const rowHeight = 34;
            const rowGap = 6;
            const chapterGap = 10;

            let currentY = 62;

            // Featured missions section (top)
            if (this.featuredMissions.length > 0) {
                const featuredHeaderY = currentY;
                currentY += headerHeight + headerGap;

                for (let f = 0; f < this.featuredMissions.length; f++) {
                    const fm = this.featuredMissions[f];
                    this.featuredNodePositions.push({
                        worldId: fm.worldId || 'featured',
                        worldName: fm.name || 'Featured',
                        missionId: fm.id,
                        missionName: fm.name || fm.nameKey || 'Featured Mission',
                        missionDescription: fm.description || '',
                        missionQualities: [],
                        x: listX,
                        y: currentY,
                        width: listWidth,
                        height: rowHeight,
                        radius: 0,
                        shape: fm.nodeShape || 'star',
                        listIndex: f + 1,
                        isFeatured: true
                    });
                    currentY += rowHeight + rowGap;
                }

                currentY += chapterGap;
            }

            for (let w = 0; w < this.worlds.length; w++) {
                const world = this.worlds[w];
                const worldNodes = [];
                const missions = world.missions || [];
                const headerY = currentY;

                currentY += headerHeight + headerGap;

                for (let m = 0; m < missions.length; m++) {
                    const mission = missions[m];
                    worldNodes.push({
                        worldId: world.id,
                        worldName: world.name,
                        missionId: mission.id,
                        missionName: mission.name,
                        missionDescription: mission.description || '',
                        missionQualities: Array.isArray(mission.qualities) ? mission.qualities.slice() : [],
                        x: listX,
                        y: currentY,
                        width: listWidth,
                        height: rowHeight,
                        radius: 0,
                        shape: NODE_SHAPES[world.nodeShape] || 'circle',
                        listIndex: m + 1
                    });

                    currentY += rowHeight + rowGap;
                }

                this.nodePositions.push({
                    worldId: world.id,
                    worldName: world.name,
                    nodes: worldNodes,
                    y: headerY,
                    headerHeight: headerHeight
                });

                currentY += chapterGap;
            }

            this.contentHeight = currentY;
            this._clampScrollOffset();
        }
        
        /**
         * Render the overland screen.
         * @param {ProgressManager} progressManager - ProgressManager instance
         */
        render(progressManager) {
            const ctx = this.ctx;
            const canvas = this.canvas;
            
            if (!ctx || !canvas) {
                console.error('OverlandRenderer: no ctx or canvas');
                return;
            }
            
            // Clear canvas
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw header
            this._drawHeader(ctx, canvas);
            
            // Draw chapters and missions
            this._drawChapters(ctx, canvas, progressManager);
            
            // Draw mission info panel if selected
            if (this.selectedMission) {
                this._drawMissionInfo(ctx, canvas, progressManager);
            }
            
            // Draw bottom buttons
            this._drawBottomButtons(ctx, canvas);
        }
        
        /**
         * Draw the header with title, back button, and user info.
         */
        _drawHeader(ctx, canvas) {
            // Header background
            ctx.fillStyle = '#16213e';
            ctx.fillRect(0, 0, canvas.width, 50);
            
            // Back to Menu button (left side)
            this._drawButton(ctx, 10, 10, 80, 30, '← Menu', '#4a4a6a');
            
            // Title (center)
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(t('overland.title', 'Select Mission'), canvas.width / 2, 32);
            ctx.textAlign = 'left';
            
            // User info (right side) - show if logged in
            if (window.authManager && window.authManager.isAuthenticated) {
                const username = window.authManager.dbUser?.username || window.authManager.user?.firstName || 'User';
                ctx.font = '12px Arial';
                ctx.fillStyle = '#4CAF50';
                ctx.textAlign = 'right';
                ctx.fillText(`👤 ${username}`, canvas.width - 10, 30);
                ctx.textAlign = 'left';
            }
        }
        
        /**
         * Draw all chapters with their mission nodes.
         */
        _drawChapters(ctx, canvas, progressManager) {
            const viewport = this._getListViewport();
            ctx.save();
            ctx.beginPath();
            ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
            ctx.clip();

            // Draw featured missions section
            if (this.featuredNodePositions.length > 0) {
                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = '#ffd666';
                ctx.textAlign = 'left';
                ctx.fillText(t('overland.featured', 'Featured Mission'), 10, 62 - this.scrollOffset);

                for (const node of this.featuredNodePositions) {
                    const rowY = node.y - this.scrollOffset;
                    if (rowY + node.height < viewport.y || rowY > viewport.y + viewport.height) continue;
                    this._drawMissionRow(ctx, Object.assign({}, node, { screenY: rowY }), progressManager, true);
                }
            }

            for (const chapterData of this.nodePositions) {
                const world = this.worlds.find(w => w.id === chapterData.worldId);
                const isUnlocked = progressManager.isWorldUnlocked(chapterData.worldId);
                const headerY = chapterData.y - this.scrollOffset;
                if (headerY < viewport.y - 30 || headerY > viewport.y + viewport.height + 40) {
                    // Skip obviously off-screen headers; rows are checked individually below.
                }

                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = isUnlocked ? '#ffffff' : COLORS.locked.text;
                ctx.textAlign = 'left';
                ctx.fillText(world ? world.name : chapterData.worldId, 10, headerY);

                if (!isUnlocked) {
                    ctx.font = '12px Arial';
                    ctx.fillStyle = COLORS.locked.text;
                    ctx.textAlign = 'right';
                    ctx.fillText(t('overland.locked', '[LOCKED]'), canvas.width - 12, headerY);
                }

                for (const node of chapterData.nodes) {
                    const rowY = node.y - this.scrollOffset;
                    if (rowY + node.height < viewport.y || rowY > viewport.y + viewport.height) continue;
                    this._drawMissionRow(ctx, Object.assign({}, node, { screenY: rowY }), progressManager, isUnlocked);
                }
            }
            ctx.textAlign = 'left';
            ctx.restore();

            this._drawScrollIndicators(ctx, viewport);
        }
        
        /**
         * Draw a single mission node.
         */
        _drawMissionRow(ctx, node, progressManager, isWorldUnlocked) {
            const isCompleted = progressManager.isMissionCompleted(node.missionId);
            const isSelected = this.selectedMission && this.selectedMission.missionId === node.missionId;
            const drawY = typeof node.screenY === 'number' ? node.screenY : node.y;

            const fill = !isWorldUnlocked
                ? '#2d2d38'
                : isSelected
                    ? '#274a7f'
                    : isCompleted
                        ? '#214f2f'
                        : '#1f2f4d';
            const stroke = isSelected ? '#ffd166' : (isCompleted ? '#5bc777' : '#4a90e2');

            ctx.fillStyle = fill;
            ctx.strokeStyle = stroke;
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.fillRect(node.x, drawY, node.width, node.height);
            ctx.strokeRect(node.x, drawY, node.width, node.height);

            const badgeSize = 22;
            const badgeX = node.x + 8;
            const badgeY = drawY + 6;
            const badgeColors = !isWorldUnlocked ? COLORS.locked : (isCompleted ? COLORS.completed : COLORS.unlocked);
            this._drawShape(ctx, badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, badgeColors, node.shape);

            ctx.font = 'bold 13px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(node.missionName, node.x + 38, drawY + 14);

            ctx.font = '11px Arial';
            ctx.fillStyle = isWorldUnlocked ? '#d1d8e6' : '#8f96a3';
            const subtitle = this._truncateText(node.missionDescription || '', node.width - 120, '11px Arial');
            ctx.fillText(subtitle, node.x + 38, drawY + 28);

            const statusText = !isWorldUnlocked
                ? t('overland.locked', 'Locked')
                : isCompleted
                    ? t('overland.completed', 'Completed')
                    : t('overland.available', 'Available');
            ctx.font = '11px Arial';
            ctx.fillStyle = isCompleted ? '#89f0a0' : (!isWorldUnlocked ? '#999999' : '#8dc3ff');
            ctx.textAlign = 'right';
            ctx.fillText(statusText, node.x + node.width - 10, drawY + 21);
            ctx.textAlign = 'left';
        }
        
        /**
         * Draw a themed shape (shield, heart, sword, circle).
         */
        _drawShape(ctx, x, y, radius, colors, shape) {
            ctx.fillStyle = colors.fill;
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 2;
            
            switch (shape) {
                case 'shield':
                    this._drawShield(ctx, x, y, radius, colors);
                    break;
                case 'heart':
                    this._drawHeart(ctx, x, y, radius, colors);
                    break;
                case 'sword':
                    this._drawSword(ctx, x, y, radius, colors);
                    break;
                default:
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
            }
        }
        
        /**
         * Draw shield shape.
         */
        _drawShield(ctx, x, y, r, colors) {
            ctx.beginPath();
            ctx.moveTo(x, y - r);
            ctx.lineTo(x + r * 0.9, y - r * 0.4);
            ctx.lineTo(x + r * 0.9, y + r * 0.3);
            ctx.quadraticCurveTo(x, y + r, x, y + r);
            ctx.quadraticCurveTo(x, y + r, x - r * 0.9, y + r * 0.3);
            ctx.lineTo(x - r * 0.9, y - r * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        /**
         * Draw heart shape.
         */
        _drawHeart(ctx, x, y, r, colors) {
            ctx.beginPath();
            ctx.moveTo(x, y + r * 0.3);
            ctx.bezierCurveTo(x - r, y - r * 0.5, x - r, y - r, x, y - r * 0.5);
            ctx.bezierCurveTo(x + r, y - r, x + r, y - r * 0.5, x, y + r * 0.3);
            ctx.fill();
            ctx.stroke();
        }
        
        /**
         * Draw sword shape.
         */
        _drawSword(ctx, x, y, r, colors) {
            ctx.beginPath();
            // Blade
            ctx.moveTo(x, y - r);
            ctx.lineTo(x + r * 0.2, y + r * 0.3);
            ctx.lineTo(x, y + r * 0.1);
            ctx.lineTo(x - r * 0.2, y + r * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Guard
            ctx.beginPath();
            ctx.moveTo(x - r * 0.6, y + r * 0.4);
            ctx.lineTo(x + r * 0.6, y + r * 0.4);
            ctx.lineTo(x + r * 0.6, y + r * 0.6);
            ctx.lineTo(x - r * 0.6, y + r * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        /**
         * Draw mission info panel at bottom.
         */
        _drawMissionInfo(ctx, canvas, progressManager) {
            const panelY = canvas.height - 92;
            const panelHeight = 42;

            ctx.fillStyle = 'rgba(20, 24, 40, 0.96)';
            ctx.fillRect(0, panelY, canvas.width, panelHeight);

            const isCompleted = progressManager.isMissionCompleted(this.selectedMission.missionId);
            const statusText = isCompleted ? t('overland.completed', 'Completed') : t('overland.available', 'Available');
            const qualitiesText = this.selectedMission.missionQualities && this.selectedMission.missionQualities.length
                ? this.selectedMission.missionQualities.join(' • ')
                : statusText;

            ctx.font = '11px Arial';
            ctx.fillStyle = '#f2f5ff';
            ctx.textAlign = 'left';
            ctx.fillText(this._truncateText(this.selectedMission.missionDescription || '', canvas.width - 24, '11px Arial'), 12, panelY + 16);

            ctx.fillStyle = '#9ec6ff';
            ctx.fillText(this._truncateText(qualitiesText, canvas.width - 24, '11px Arial'), 12, panelY + 31);
        }
        
        /**
         * Draw bottom buttons (Mission Learning, Start Mission).
         */
        _drawBottomButtons(ctx, canvas) {
            const buttonY = canvas.height - 42;
            const buttonWidth = 108;
            const buttonHeight = 30;
            const buttonSpacing = 16;
            
            const totalWidth = buttonWidth * 2 + buttonSpacing;
            const startX = (canvas.width - totalWidth) / 2;
            
            // Mission Learning button
            this._drawButton(ctx, startX, buttonY, buttonWidth, buttonHeight,
                'Mission Learning',
                this.selectedMission ? '#4a90e2' : '#333333');
            
            // Start Mission button
            this._drawButton(ctx, startX + buttonWidth + buttonSpacing, buttonY, buttonWidth, buttonHeight,
                t('overland.startMission', 'Start Mission'),
                this.selectedMission ? '#4CAF50' : '#333333');
        }
        
        /**
         * Draw a button.
         */
        _drawButton(ctx, x, y, width, height, text, bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, width, height);
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
            
            ctx.font = '12px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(text, x + width / 2, y + height / 2 + 4);
        }
        
        /**
         * Handle click to select a mission node.
         * @param {number} screenX - Screen X coordinate
         * @param {number} screenY - Screen Y coordinate
         * @param {ProgressManager} progressManager - ProgressManager instance
         * @returns {Object|null} Clicked node or null
         */
        handleClick(screenX, screenY, progressManager) {
            const viewport = this._getListViewport();
            if (screenY < viewport.y || screenY > viewport.y + viewport.height) {
                return null;
            }

            // Check featured missions first
            for (const node of this.featuredNodePositions) {
                if (screenX >= node.x && screenX <= node.x + node.width &&
                    screenY + this.scrollOffset >= node.y && screenY + this.scrollOffset <= node.y + node.height) {
                    this.selectedMission = node;
                    this.selectedWorld = node.worldId;
                    return node;
                }
            }

            for (const chapterData of this.nodePositions) {
                const isUnlocked = progressManager.isWorldUnlocked(chapterData.worldId);
                if (!isUnlocked) continue;
                
                for (const node of chapterData.nodes) {
                    if (screenX >= node.x && screenX <= node.x + node.width &&
                        screenY + this.scrollOffset >= node.y && screenY + this.scrollOffset <= node.y + node.height) {
                        this.selectedMission = node;
                        this.selectedWorld = chapterData.worldId;
                        return node;
                    }
                }
            }
            return null;
        }
        
        /**
         * Check if Start Mission button was clicked.
         */
        isStartMissionClicked(screenX, screenY) {
            if (!this.selectedMission) return false;
            
            const buttonY = this.canvas.height - 42;
            const buttonWidth = 108;
            const buttonHeight = 30;
            const buttonSpacing = 16;
            const totalWidth = buttonWidth * 2 + buttonSpacing;
            const startX = (this.canvas.width - totalWidth) / 2;
            const missionStartX = startX + buttonWidth + buttonSpacing;
            
            return screenX >= missionStartX && screenX <= missionStartX + buttonWidth &&
                   screenY >= buttonY && screenY <= buttonY + buttonHeight;
        }
        
        /**
         * Check if Back to Menu button was clicked.
         */
        isMenuClicked(screenX, screenY) {
            const menuBtnX = 10;
            const menuBtnY = 10;
            const menuBtnW = 80;
            const menuBtnH = 30;
            
            return screenX >= menuBtnX && screenX <= menuBtnX + menuBtnW &&
                   screenY >= menuBtnY && screenY <= menuBtnY + menuBtnH;
        }
        
        /**
         * Check if Mission Learning button was clicked.
         */
        isMissionLearningClicked(screenX, screenY) {
            const buttonY = this.canvas.height - 42;
            const buttonWidth = 108;
            const buttonHeight = 30;
            const buttonSpacing = 16;
            const totalWidth = buttonWidth * 2 + buttonSpacing;
            const startX = (this.canvas.width - totalWidth) / 2;
            
            return screenX >= startX && screenX <= startX + buttonWidth &&
                   screenY >= buttonY && screenY <= buttonY + buttonHeight;
        }
        
        /**
         * Get the currently selected mission.
         */
        getSelectedMission() {
            return this.selectedMission;
        }

        /**
         * Programmatically select a mission by world and mission id.
         * @param {string} worldId
         * @param {string} missionId
         * @returns {Object|null}
         */
        selectMission(worldId, missionId) {
            for (const chapterData of this.nodePositions) {
                if (chapterData.worldId !== worldId) continue;
                for (const node of chapterData.nodes) {
                    if (node.missionId === missionId) {
                        this.selectedMission = node;
                        this.selectedWorld = worldId;
                        return node;
                    }
                }
            }
            return null;
        }
        
        /**
         * Clear selection.
         */
        clearSelection() {
            this.selectedMission = null;
            this.selectedWorld = null;
        }

        scrollBy(deltaY) {
            this.scrollOffset += deltaY;
            this._clampScrollOffset();
        }

        _getListViewport() {
            return {
                x: 0,
                y: 50,
                width: this.canvas.width,
                height: Math.max(120, this.canvas.height - 148)
            };
        }

        _clampScrollOffset() {
            const viewport = this._getListViewport();
            const maxOffset = Math.max(0, this.contentHeight - (viewport.y + viewport.height) + 8);
            this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxOffset));
        }

        _drawScrollIndicators(ctx, viewport) {
            const maxOffset = Math.max(0, this.contentHeight - (viewport.y + viewport.height) + 8);
            if (maxOffset <= 0) return;

            const trackX = this.canvas.width - 8;
            const trackY = viewport.y + 8;
            const trackHeight = viewport.height - 16;
            const thumbHeight = Math.max(24, Math.round((viewport.height / this.contentHeight) * trackHeight));
            const scrollRatio = maxOffset > 0 ? this.scrollOffset / maxOffset : 0;
            const thumbY = trackY + Math.round((trackHeight - thumbHeight) * scrollRatio);

            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(trackX, trackY, 3, trackHeight);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fillRect(trackX, thumbY, 3, thumbHeight);
            ctx.restore();
        }

        _truncateText(text, maxWidth, font) {
            const ctx = this.ctx;
            const originalFont = ctx.font;
            ctx.font = font || originalFont;
            if (ctx.measureText(text).width <= maxWidth) {
                ctx.font = originalFont;
                return text;
            }

            let truncated = text;
            while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
                truncated = truncated.slice(0, -1);
            }
            ctx.font = originalFont;
            return truncated + '...';
        }
    }
    
    // Export for browser
    if (typeof window !== 'undefined') {
        window.OverlandRenderer = OverlandRenderer;
    }
})();
