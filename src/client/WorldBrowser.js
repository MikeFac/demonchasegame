/**
 * WorldBrowser.js
 * Client-side UI component for browsing, joining, and managing worlds.
 * Uses the REST API endpoints defined in src/server/routes/worlds.js.
 * Requires AuthManager.js for authenticated requests.
 */
class WorldBrowser {
    constructor(authManager) {
        this.authManager = authManager;
        this.worlds = [];
        this.currentWorld = null;
        this._onWorldSelect = null;
    }

    // ==================== API Methods ====================

    /**
     * Fetch public + own + joined worlds from the server.
     * Authenticated users see their own worlds too.
     */
    async loadWorlds() {
        try {
            const headers = {};
            const token = this.authManager ? await this.authManager.getToken() : null;
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/worlds', { headers });
            if (!response.ok) {
                throw new Error(`Failed to load worlds: ${response.status}`);
            }

            const data = await response.json();
            this.worlds = data.worlds || [];
            return this.worlds;
        } catch (error) {
            console.error('WorldBrowser: Error loading worlds', error);
            return [];
        }
    }

    /**
     * Fetch public worlds only (no auth required).
     */
    async loadPublicWorlds() {
        try {
            const response = await fetch('/api/worlds');
            if (!response.ok) {
                throw new Error(`Failed to load public worlds: ${response.status}`);
            }
            const data = await response.json();
            return data.worlds || [];
        } catch (error) {
            console.error('WorldBrowser: Error loading public worlds', error);
            return [];
        }
    }

    /**
     * Fetch full details for a single world by slug.
     */
    async getWorld(slug) {
        try {
            const headers = {};
            const token = this.authManager ? await this.authManager.getToken() : null;
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`/api/worlds/${encodeURIComponent(slug)}`, { headers });
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Failed to get world: ${response.status}`);
            }

            const data = await response.json();
            this.currentWorld = data.world;
            return this.currentWorld;
        } catch (error) {
            console.error('WorldBrowser: Error getting world', error);
            return null;
        }
    }

    /**
     * Join a world by slug. Requires authentication.
     */
    async joinWorld(slug) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch(`/api/worlds/${encodeURIComponent(slug)}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Join failed' };
            }
            return { success: true, message: data.message };
        } catch (error) {
            console.error('WorldBrowser: Error joining world', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Look up a world by its share code (e.g. "FAITH42X").
     */
    async joinByShareCode(code) {
        try {
            const response = await fetch(`/api/worlds/share/${encodeURIComponent(code)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    return { success: false, error: 'Share code not found' };
                }
                throw new Error(`Share code lookup failed: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, world: data.world };
        } catch (error) {
            console.error('WorldBrowser: Error looking up share code', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a new world. Requires authentication.
     */
    async createWorld(payload) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch('/api/worlds', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload || {})
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Create failed' };
            }

            return { success: true, world: data.world };
        } catch (error) {
            console.error('WorldBrowser: Error creating world', error);
            return { success: false, error: error.message };
        }
    }

    async updateWorld(slug, payload) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch(`/api/worlds/${encodeURIComponent(slug)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload || {})
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Update failed' };
            }

            return { success: true, world: data.world };
        } catch (error) {
            console.error('WorldBrowser: Error updating world', error);
            return { success: false, error: error.message };
        }
    }

    async deleteWorld(slug) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch(`/api/worlds/${encodeURIComponent(slug)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Delete failed' };
            }

            return { success: true, message: data.message };
        } catch (error) {
            console.error('WorldBrowser: Error deleting world', error);
            return { success: false, error: error.message };
        }
    }

    async getEditorWorld(slug) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch(`/api/worlds/${encodeURIComponent(slug)}/editor`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Editor load failed' };
            }

            return { success: true, world: data.world, maps: data.maps || [] };
        } catch (error) {
            console.error('WorldBrowser: Error loading editor world', error);
            return { success: false, error: error.message };
        }
    }

    async updateMission(slug, missionId, payload) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch(`/api/worlds/${encodeURIComponent(slug)}/missions/${encodeURIComponent(missionId)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload || {})
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Mission update failed' };
            }

            return { success: true, mission: data.mission, world: data.world };
        } catch (error) {
            console.error('WorldBrowser: Error updating mission', error);
            return { success: false, error: error.message };
        }
    }

    async previewMission(slug, missionId, payload) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch(`/api/worlds/${encodeURIComponent(slug)}/missions/${encodeURIComponent(missionId)}/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload || {})
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Mission preview failed' };
            }

            return { success: true, preview: data.preview };
        } catch (error) {
            console.error('WorldBrowser: Error previewing mission', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== Rendering ====================

    /**
     * Render a list of worlds into a container element.
     * @param {HTMLElement} container - DOM element to render into
     * @param {Object} options - { onSelect: function(world) }
     */
    renderWorldList(container, options = {}) {
        this._onWorldSelect = options.onSelect || null;
        container.innerHTML = '';

        if (this.worlds.length === 0) {
            const empty = document.createElement('p');
            empty.style.textAlign = 'center';
            empty.style.opacity = '0.6';
            empty.textContent = 'No worlds available yet.';
            container.appendChild(empty);
            return;
        }

        this.worlds.forEach(world => {
            const item = document.createElement('div');
            item.className = 'world-item';
            item.style.cssText = 'padding: 12px 15px; background: rgba(255,255,255,0.1); border-radius: 10px; margin-bottom: 10px; cursor: pointer; transition: background 0.2s;';

            const name = document.createElement('h3');
            name.style.cssText = 'font-size: 1.1em; margin: 0 0 4px 0;';
            name.textContent = `🌍 ${world.name}`;

            const meta = document.createElement('span');
            meta.style.cssText = 'font-size: 0.85em; opacity: 0.7;';
            const parts = [];
            if (world.authorUsername) parts.push(`by ${world.authorUsername}`);
            if (world.playerCount) parts.push(`${world.playerCount} players`);
            if (world.visibility) parts.push(world.visibility);
            meta.textContent = parts.join(' • ');

            item.appendChild(name);
            item.appendChild(meta);

            item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,0.2)'; });
            item.addEventListener('mouseleave', () => { item.style.background = 'rgba(255,255,255,0.1)'; });
            item.addEventListener('click', () => {
                if (this._onWorldSelect) this._onWorldSelect(world);
            });

            container.appendChild(item);
        });
    }

    /**
     * Render world detail view into a container element.
     * @param {Object} world - Full world object from API
     * @param {HTMLElement} container - DOM element to render into
     * @param {Object} options - { onJoin: function(world), onBack: function() }
     */
    renderWorldDetail(world, container, options = {}) {
        container.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.style.marginBottom = '20px';

        const title = document.createElement('h2');
        title.textContent = world.name;
        title.style.marginBottom = '8px';
        header.appendChild(title);

        if (world.description) {
            const desc = document.createElement('p');
            desc.style.cssText = 'opacity: 0.8; font-size: 0.9em; margin: 0;';
            desc.textContent = world.description;
            header.appendChild(desc);
        }

        const authorLine = document.createElement('p');
        authorLine.style.cssText = 'font-size: 0.85em; opacity: 0.6; margin: 8px 0 0 0;';
        authorLine.textContent = `Created by ${world.authorUsername || 'Unknown'} • ${world.playerCount || 0} players`;
        header.appendChild(authorLine);

        container.appendChild(header);

        // Chapters / Missions
        if (world.chapters && world.chapters.length > 0) {
            const chaptersSection = document.createElement('div');
            chaptersSection.style.marginBottom = '20px';

            const chaptersTitle = document.createElement('h3');
            chaptersTitle.textContent = 'Chapters';
            chaptersTitle.style.cssText = 'margin-bottom: 10px; font-size: 1em;';
            chaptersSection.appendChild(chaptersTitle);

            world.chapters.forEach(ch => {
                const chItem = document.createElement('div');
                chItem.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 6px;';
                chItem.innerHTML = `<strong>${ch.name}</strong>`;
                if (ch.description) {
                    const chDesc = document.createElement('div');
                    chDesc.style.cssText = 'font-size: 0.85em; opacity: 0.7; margin-top: 2px;';
                    chDesc.textContent = ch.description;
                    chItem.appendChild(chDesc);
                }
                if (ch.missionIds) {
                    const mCount = document.createElement('div');
                    mCount.style.cssText = 'font-size: 0.8em; opacity: 0.5; margin-top: 2px;';
                    mCount.textContent = `${ch.missionIds.length} missions`;
                    chItem.appendChild(mCount);
                }
                chaptersSection.appendChild(chItem);
            });

            container.appendChild(chaptersSection);
        }

        if (world.missions && world.missions.length > 0) {
            const missionSection = document.createElement('div');
            missionSection.style.marginBottom = '20px';

            const missionTitle = document.createElement('h3');
            missionTitle.textContent = 'Missions';
            missionTitle.style.cssText = 'margin-bottom: 10px; font-size: 1em;';
            missionSection.appendChild(missionTitle);

            world.missions.forEach((mission) => {
                const missionCard = document.createElement('div');
                missionCard.style.cssText = 'padding: 10px 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;';

                const row = document.createElement('div');
                row.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:10px;';

                const textWrap = document.createElement('div');
                textWrap.style.flex = '1';

                const missionName = document.createElement('div');
                missionName.style.cssText = 'font-weight:700;';
                missionName.textContent = mission.name;
                textWrap.appendChild(missionName);

                const missionMeta = document.createElement('div');
                missionMeta.style.cssText = 'font-size:0.82em;opacity:0.72;margin-top:4px;';
                missionMeta.textContent = `${mission.category || 'Faith'} • ${mission.mapStyle || 'classic'} • ${mission.monstersToKill || 0} to clear`;
                textWrap.appendChild(missionMeta);

                if (mission.description) {
                    const missionDesc = document.createElement('div');
                    missionDesc.style.cssText = 'font-size:0.82em;opacity:0.82;margin-top:6px;';
                    missionDesc.textContent = mission.description;
                    textWrap.appendChild(missionDesc);
                }

                row.appendChild(textWrap);

                if (options.onPlayMission) {
                    const buttonWrap = document.createElement('div');
                    buttonWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

                    const playBtn = document.createElement('button');
                    playBtn.type = 'button';
                    playBtn.textContent = 'Play';
                    playBtn.style.cssText = 'padding:8px 12px;border:none;border-radius:8px;background:#4CAF50;color:#fff;cursor:pointer;font-weight:700;';
                    playBtn.addEventListener('click', () => options.onPlayMission(world, mission));
                    buttonWrap.appendChild(playBtn);

                    if (options.onEditMission && world.canEdit) {
                        const editMissionBtn = document.createElement('button');
                        editMissionBtn.type = 'button';
                        editMissionBtn.textContent = 'Edit';
                        editMissionBtn.style.cssText = 'padding:8px 12px;border:none;border-radius:8px;background:#4a90e2;color:#fff;cursor:pointer;font-weight:700;';
                        editMissionBtn.addEventListener('click', () => options.onEditMission(world, mission));
                        buttonWrap.appendChild(editMissionBtn);
                    }

                    row.appendChild(buttonWrap);
                }

                missionCard.appendChild(row);
                missionSection.appendChild(missionCard);
            });

            container.appendChild(missionSection);
        }

        // Share code
        if (world.shareCode) {
            const shareSection = document.createElement('div');
            shareSection.style.cssText = 'padding: 10px; background: rgba(102,126,234,0.15); border-radius: 8px; margin-bottom: 20px; text-align: center;';
            shareSection.innerHTML = `<span style="opacity: 0.7;">Share Code:</span> <strong style="font-size: 1.2em; letter-spacing: 2px;">${world.shareCode}</strong>`;
            container.appendChild(shareSection);
        }

        // Action buttons
        const actions = document.createElement('div');

        if (options.onEditWorld && world.canEdit) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-secondary';
            editBtn.textContent = '✏️ Edit World';
            editBtn.style.cssText = 'width: 100%; padding: 12px; margin-bottom: 10px;';
            editBtn.addEventListener('click', () => options.onEditWorld(world));
            actions.appendChild(editBtn);
        }

        if (options.onDeleteWorld && world.canEdit) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-secondary';
            deleteBtn.textContent = '🗑 Delete World';
            deleteBtn.style.cssText = 'width: 100%; padding: 12px; margin-bottom: 10px; background: rgba(255,80,80,0.15); color: #ffd4d4;';
            deleteBtn.addEventListener('click', () => options.onDeleteWorld(world));
            actions.appendChild(deleteBtn);
        }

        if (options.onJoin && this.authManager && this.authManager.isAuthenticated && !world.canEdit) {
            const joinBtn = document.createElement('button');
            joinBtn.className = 'btn-primary';
            joinBtn.textContent = world.isJoined ? '✓ Joined' : '🎮 Join World';
            joinBtn.style.cssText = 'width: 100%; padding: 12px; margin-bottom: 10px;';
            joinBtn.disabled = !!world.isJoined;
            joinBtn.addEventListener('click', () => options.onJoin(world));
            actions.appendChild(joinBtn);
        }

        if (options.onBack) {
            const backBtn = document.createElement('button');
            backBtn.className = 'btn-secondary';
            backBtn.textContent = '← Back to Worlds';
            backBtn.style.cssText = 'width: 100%; padding: 12px;';
            backBtn.addEventListener('click', options.onBack);
            actions.appendChild(backBtn);
        }

        container.appendChild(actions);
    }

    // ==================== Helpers ====================

    async _requireToken() {
        if (!this.authManager) return null;
        return await this.authManager.getToken();
    }
}

// Export for use in browser
window.WorldBrowser = WorldBrowser;
