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
            this.nodePositions = [];
            this._logCount = 0;
        }
        
        /**
         * Set the worlds data to render.
         * @param {Array} worlds - Array of world objects
         */
        setWorlds(worlds) {
            this.worlds = worlds;
            this._calculateNodePositions();
        }
        
        /**
         * Calculate node positions for all worlds/missions.
         */
        _calculateNodePositions() {
            this.nodePositions = [];
            
            const padding = 30;
            const nodeRadius = 25;
            const nodeSpacing = 70;
            const chapterSpacing = 40;
            
            let currentY = 80;
            
            for (let w = 0; w < this.worlds.length; w++) {
                const world = this.worlds[w];
                const worldNodes = [];
                
                const missions = world.missions || [];
                const startX = (this.canvas.width - (missions.length - 1) * nodeSpacing) / 2;
                
                for (let m = 0; m < missions.length; m++) {
                    worldNodes.push({
                        worldId: world.id,
                        worldName: world.name,
                        missionId: missions[m].id,
                        missionName: missions[m].name,
                        x: startX + m * nodeSpacing,
                        y: currentY,
                        radius: nodeRadius,
                        shape: NODE_SHAPES[world.nodeShape] || 'circle'
                    });
                }
                
                this.nodePositions.push({
                    worldId: world.id,
                    worldName: world.name,
                    nodes: worldNodes,
                    y: currentY
                });
                
                currentY += chapterSpacing + nodeRadius * 2;
            }
        }
        
        /**
         * Render the overland screen.
         * @param {ProgressManager} progressManager - ProgressManager instance
         */
        render(progressManager) {
            const ctx = this.ctx;
            const canvas = this.canvas;
            
            // Log only occasionally (every 60 frames = ~1 second)
            if (this._logCount % 60 === 0) {
                console.log('OverlandRenderer.render() canvas:', canvas.width, 'x', canvas.height, 'worlds:', this.worlds?.length, 'nodes:', this.nodePositions?.length);
            }
            this._logCount++;
            
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
         * Draw the header with title.
         */
        _drawHeader(ctx, canvas) {
            // Header background
            ctx.fillStyle = '#16213e';
            ctx.fillRect(0, 0, canvas.width, 50);
            
            // Title
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(t('overland.title', 'Select Mission'), canvas.width / 2, 32);
            ctx.textAlign = 'left';
        }
        
        /**
         * Draw all chapters with their mission nodes.
         */
        _drawChapters(ctx, canvas, progressManager) {
            for (const chapterData of this.nodePositions) {
                const world = this.worlds.find(w => w.id === chapterData.worldId);
                const isUnlocked = progressManager.isWorldUnlocked(chapterData.worldId);
                
                // Draw chapter name
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = isUnlocked ? '#ffffff' : COLORS.locked.text;
                ctx.textAlign = 'left';
                ctx.fillText(world ? world.name : chapterData.worldId, 10, chapterData.y - 15);
                
                // Draw locked label
                if (!isUnlocked) {
                    ctx.font = '12px Arial';
                    ctx.fillStyle = COLORS.locked.text;
                    ctx.fillText(t('overland.locked', '[LOCKED]'), canvas.width - 80, chapterData.y - 15);
                }
                
                // Draw connection lines between nodes
                if (chapterData.nodes.length > 1) {
                    ctx.strokeStyle = isUnlocked ? '#4a90e2' : '#333333';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(chapterData.nodes[0].x, chapterData.nodes[0].y);
                    for (let i = 1; i < chapterData.nodes.length; i++) {
                        ctx.lineTo(chapterData.nodes[i].x, chapterData.nodes[i].y);
                    }
                    ctx.stroke();
                }
                
                // Draw nodes
                for (const node of chapterData.nodes) {
                    this._drawNode(ctx, node, progressManager, isUnlocked);
                }
            }
        }
        
        /**
         * Draw a single mission node.
         */
        _drawNode(ctx, node, progressManager, isWorldUnlocked) {
            const isCompleted = progressManager.isMissionCompleted(node.missionId);
            const isSelected = this.selectedMission && this.selectedMission.missionId === node.missionId;
            
            let colors;
            if (!isWorldUnlocked) {
                colors = COLORS.locked;
            } else if (isCompleted) {
                colors = COLORS.completed;
            } else {
                colors = COLORS.unlocked;
            }
            
            // Selection highlight
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fill();
            }
            
            // Draw shape based on chapter theme
            this._drawShape(ctx, node.x, node.y, node.radius, colors, node.shape);
            
            // Draw mission number or stars
            if (isWorldUnlocked) {
                const stars = progressManager.getMissionStars(node.missionId);
                if (stars > 0) {
                    ctx.font = '12px Arial';
                    ctx.fillStyle = '#FFD700';
                    ctx.textAlign = 'center';
                    ctx.fillText('★'.repeat(stars), node.x, node.y + node.radius + 15);
                }
            }
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
            const panelY = canvas.height - 100;
            const panelHeight = 60;
            
            // Panel background
            ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
            ctx.fillRect(0, panelY, canvas.width, panelHeight);
            
            // Mission name
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(this.selectedMission.missionName, canvas.width / 2, panelY + 20);
            
            // Mission status
            const isCompleted = progressManager.isMissionCompleted(this.selectedMission.missionId);
            const statusText = isCompleted ? t('overland.completed', 'Completed') : t('overland.available', 'Available');
            ctx.font = '12px Arial';
            ctx.fillStyle = isCompleted ? '#4CAF50' : '#4a90e2';
            ctx.fillText(statusText, canvas.width / 2, panelY + 40);
        }
        
        /**
         * Draw bottom buttons (Start Mission, Learn Verses).
         */
        _drawBottomButtons(ctx, canvas) {
            const buttonY = canvas.height - 35;
            const buttonWidth = 100;
            const buttonHeight = 30;
            const buttonSpacing = 20;
            
            const totalWidth = buttonWidth * 2 + buttonSpacing;
            const startX = (canvas.width - totalWidth) / 2;
            
            // Start Mission button
            this._drawButton(ctx, startX, buttonY, buttonWidth, buttonHeight,
                t('overland.startMission', 'Start Mission'),
                this.selectedMission ? '#4CAF50' : '#333333');
            
            // Learn Verses button
            this._drawButton(ctx, startX + buttonWidth + buttonSpacing, buttonY, buttonWidth, buttonHeight,
                t('overland.learnVerses', 'Learn Verses'),
                this.selectedMission ? '#4a90e2' : '#333333');
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
            for (const chapterData of this.nodePositions) {
                const isUnlocked = progressManager.isWorldUnlocked(chapterData.worldId);
                if (!isUnlocked) continue;
                
                for (const node of chapterData.nodes) {
                    const dx = screenX - node.x;
                    const dy = screenY - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist <= node.radius) {
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
            
            const buttonY = this.canvas.height - 35;
            const buttonWidth = 100;
            const buttonHeight = 30;
            const buttonSpacing = 20;
            const totalWidth = buttonWidth * 2 + buttonSpacing;
            const startX = (this.canvas.width - totalWidth) / 2;
            
            return screenX >= startX && screenX <= startX + buttonWidth &&
                   screenY >= buttonY && screenY <= buttonY + buttonHeight;
        }
        
        /**
         * Check if Learn Verses button was clicked.
         */
        isLearnVersesClicked(screenX, screenY) {
            if (!this.selectedMission) return false;
            
            const buttonY = this.canvas.height - 35;
            const buttonWidth = 100;
            const buttonHeight = 30;
            const buttonSpacing = 20;
            const totalWidth = buttonWidth * 2 + buttonSpacing;
            const startX = (this.canvas.width - totalWidth) / 2;
            const learnX = startX + buttonWidth + buttonSpacing;
            
            return screenX >= learnX && screenX <= learnX + buttonWidth &&
                   screenY >= buttonY && screenY <= buttonY + buttonHeight;
        }
        
        /**
         * Get the currently selected mission.
         */
        getSelectedMission() {
            return this.selectedMission;
        }
        
        /**
         * Clear selection.
         */
        clearSelection() {
            this.selectedMission = null;
            this.selectedWorld = null;
        }
    }
    
    // Export for browser
    if (typeof window !== 'undefined') {
        window.OverlandRenderer = OverlandRenderer;
    }
})();
