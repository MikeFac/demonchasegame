/**
 * GroupsPanel.js
 * Client-side UI component for managing groups (youth groups, Bible studies, etc.).
    Uses the REST API endpoints defined in src/server/routes/groups.js.
 * Requires AuthManager.js for authenticated requests.
 */
class GroupsPanel {
    constructor(authManager) {
        this.authManager = authManager;
        this.groups = [];
        this.currentGroup = null;
        this.leaderboard = null;
        this._onGroupSelect = null;
        this._onBack = null;
    }

    
    async loadMyGroups() {
        try {
            const token = await this._requireToken();
            if (!token) return [];

            const response = await fetch('/api/groups/mine', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Failed to load groups: ${response.status}`);
            }

            const data = await response.json();
            this.groups = data.groups || [];
            return this.groups;
        } catch (error) {
            console.error('GroupsPanel: Error loading groups', error);
            return [];
        }
    }

    
    async createGroup(name, description = '') {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, description })
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Failed to create group' };
            }

            this.groups.push(data.group);
            return { success: true, group: data.group };
        } catch (error) {
            console.error('GroupsPanel: Error creating group', error);
            return { success: false, error: error.message };
        }
    }

    
    async joinGroup(code) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch('/api/groups/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code })
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Failed to join group' };
            }

            this.groups.push(data.group);
            return { success: true, group: data.group };
        } catch (error) {
            console.error('GroupsPanel: Error joining group', error);
            return { success: false, error: error.message };
        }
    }

    
    async leaveGroup(groupId) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch(`/api/groups/${groupId}/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Failed to leave group' };
            }

            this.groups = this.groups.filter(g => g._id !== groupId);
            return { success: true };
        } catch (error) {
            console.error('GroupsPanel: Error leaving group', error);
            return { success: false, error: error.message };
        }
    }

    
    async deleteGroup(groupId) {
        try {
            const token = await this._requireToken();
            if (!token) return { success: false, error: 'Not authenticated' };

            const response = await fetch(`/api/groups/${groupId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.error || 'Failed to delete group' };
            }

            this.groups = this.groups.filter(g => g._id !== groupId);
            return { success: true };
        } catch (error) {
            console.error('GroupsPanel: Error deleting group', error);
            return { success: false, error: error.message };
        }
    }

    
    async loadLeaderboard(groupId, period = 'weekly') {
        try {
            const token = await this._requireToken();
            if (!token) return null;

            const response = await fetch(`/api/groups/${groupId}/leaderboard?period=${period}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Failed to load leaderboard: ${response.status}`);
            }

            const data = await response.json();
            this.leaderboard = data;
            this.currentGroup = data.group;
            return data;
        } catch (error) {
            console.error('GroupsPanel: Error loading leaderboard', error);
            return null;
        }
    }

    
    renderGroupsList(container, options = {}) {
        this._onGroupSelect = options.onSelect || null;
        this._onCreateGroup = options.onCreateGroup || null;
        this._onJoinGroup = options.onJoinGroup || null;
        container.innerHTML = '';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';

        const title = document.createElement('h2');
        title.textContent = 'Your Groups';
        title.style.margin = '0';
        header.appendChild(title);

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 8px;';

        const joinBtn = document.createElement('button');
        joinBtn.className = 'btn-secondary';
        joinBtn.textContent = 'Join';
        joinBtn.style.cssText = 'padding: 6px 12px; font-size: 0.9em;';
        joinBtn.addEventListener('click', () => {
            if (this._onJoinGroup) this._onJoinGroup();
        });
        btnGroup.appendChild(joinBtn);

        const createBtn = document.createElement('button');
        createBtn.className = 'btn-primary';
        createBtn.textContent = '+ Create';
        createBtn.style.cssText = 'padding: 6px 12px; font-size: 0.9em;';
        createBtn.addEventListener('click', () => {
            if (this._onCreateGroup) this._onCreateGroup();
        });
        btnGroup.appendChild(createBtn);

        header.appendChild(btnGroup);
        container.appendChild(header);

        if (this.groups.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'text-align: center; padding: 40px 20px; opacity: 0.7;';
            empty.innerHTML = `
                <p style="margin-bottom: 15px;">You haven't joined any groups yet.</p>
                <p style="font-size: 0.9em;">Create a group for your youth group or Bible study, or join one with a code from your leader.</p>
            `;
            container.appendChild(empty);
            return;
        }

        const list = document.createElement('div');
        list.className = 'groups-list';

        this.groups.forEach(group => {
            const item = document.createElement('div');
            item.className = 'group-item';
            item.style.cssText = 'padding: 12px 15px; background: rgba(255,255,255,0.1); border-radius: 10px; margin-bottom: 10px; cursor: pointer; transition: background 0.2s;';

            const name = document.createElement('h3');
            name.style.cssText = 'font-size: 1.1em; margin: 0 0 4px 0;';
            name.textContent = group.name;

            const meta = document.createElement('div');
            meta.style.cssText = 'font-size: 0.85em; opacity: 0.7;';
            const parts = [];
            parts.push(`${group.memberCount} member${group.memberCount !== 1 ? 's' : ''}`);
            if (group.isCreator) parts.push('Owner');
            meta.textContent = parts.join(' • ');

            item.appendChild(name);
            item.appendChild(meta);

            item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,0.2)'; });
            item.addEventListener('mouseleave', () => { item.style.background = 'rgba(255,255,255,0.1)'; });
            item.addEventListener('click', () => {
                if (this._onGroupSelect) this._onGroupSelect(group);
            });

            list.appendChild(item);
        });

        container.appendChild(list);
    }

    
    renderLeaderboard(container, options = {}) {
        this._onBack = options.onBack || null;
        container.innerHTML = '';

        if (!this.leaderboard) {
            const loading = document.createElement('p');
            loading.textContent = 'Loading leaderboard...';
            loading.style.cssText = 'text-align: center; padding: 40px;';
            container.appendChild(loading);
            return;
        }

        const header = document.createElement('div');
        header.style.marginBottom = '15px;';

        const backBtn = document.createElement('button');
        backBtn.className = 'btn-secondary';
        backBtn.textContent = '← Back to Groups';
        backBtn.style.cssText = 'margin-bottom: 10px; padding: 6px 12px;';
        backBtn.addEventListener('click', () => {
            if (this._onBack) this._onBack();
        });
        header.appendChild(backBtn);

        const title = document.createElement('h2');
        title.textContent = this.leaderboard.group.name;
        title.style.cssText = 'margin: 10px 0 5px 0;';
        header.appendChild(title);

        const codeInfo = document.createElement('div');
        codeInfo.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(102,126,234,0.15); border-radius: 8px; margin-bottom: 10px;';
        codeInfo.innerHTML = `
            <span style="opacity: 0.7;">Group Code:</span>
            <strong style="font-size: 1.1em; letter-spacing: 1px;">${this.leaderboard.group.code}</strong>
            <button id="copy-group-code" style="margin-left: auto; padding: 4px 8px; font-size: 0.8em;" class="btn-secondary">Copy</button>
        `;
        header.appendChild(codeInfo);

        container.appendChild(header);

        document.getElementById('copy-group-code').addEventListener('click', () => {
            navigator.clipboard.writeText(this.leaderboard.group.code).then(() => {
                const btn = document.getElementById('copy-group-code');
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
            });
        });

        const entries = this.leaderboard.entries || [];
        if (entries.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'text-align: center; padding: 20px; opacity: 0.7;';
            empty.textContent = 'No activity yet. Start playing to appear on the leaderboard!';
            container.appendChild(empty);
            return;
        }

        const list = document.createElement('div');
        list.className = 'leaderboard-list';

        const currentUserId = this.authManager?.dbUser?._id;

        entries.forEach(entry => {
            const item = document.createElement('div');
            const isCurrentUser = currentUserId && entry.userId === currentUserId;
            item.className = 'leaderboard-entry';
            item.style.cssText = `padding: 10px 12px; background: ${isCurrentUser ? 'rgba(102,126,234,0.25)' : 'rgba(255,255,255,0.08)'}; border-radius: 8px; margin-bottom: 6px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s;`;

            item.addEventListener('mouseenter', () => {
                item.style.background = isCurrentUser ? 'rgba(102,126,234,0.35)' : 'rgba(255,255,255,0.15)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = isCurrentUser ? 'rgba(102,126,234,0.25)' : 'rgba(255,255,255,0.08)';
            });
            item.addEventListener('click', () => {
                this.showUserVerses(entry);
            });

            const rankBadge = document.createElement('div');
            rankBadge.style.cssText = 'width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9em; flex-shrink: 0;';
            if (entry.rank === 1) {
                rankBadge.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
                rankBadge.style.color = '#000';
            } else if (entry.rank === 2) {
                rankBadge.style.background = 'linear-gradient(135deg, #C0C0C0, #A0A0A1)';
                rankBadge.style.color = '#000';
            } else if (entry.rank === 3) {
                rankBadge.style.background = 'linear-gradient(135deg, #CD7F32, #8B4513)';
                rankBadge.style.color = '#fff';
            } else {
                rankBadge.style.background = 'rgba(255,255,255,0.1)';
            }
            rankBadge.textContent = entry.rank;
            item.appendChild(rankBadge);

            const userInfo = document.createElement('div');
            userInfo.style.cssText = 'flex: 1;';
            const username = document.createElement('div');
            username.style.fontWeight = isCurrentUser ? 'bold' : 'normal';
            username.textContent = isCurrentUser ? `${entry.username} (you)` : entry.username;
            userInfo.appendChild(username);
            item.appendChild(userInfo);

            const stats = document.createElement('div');
            stats.style.cssText = 'text-align: right; font-size: 0.85em;';
            stats.innerHTML = `<strong>${entry.versesLearned}</strong> verses<br><span style="opacity: 0.6;">${entry.totalXP} XP</span>`;
            item.appendChild(stats);

            list.appendChild(item);
        });

        container.appendChild(list);

        if (this.leaderboard.yourRank && this.leaderboard.yourRank > 10) {
            const yourRank = document.createElement('div');
            yourRank.style.cssText = 'padding: 10px; margin-top: 10px; background: rgba(102,126,234,0.15); border-radius: 8px; text-align: center;';
            yourRank.innerHTML = `Your rank: <strong>#${this.leaderboard.yourRank}</strong> • ${this.leaderboard.yourStats.versesLearned} verses`;
            container.appendChild(yourRank);
        }
    }

    
    showUserVerses(entry) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; justify-content: center; align-items: center; font-family: "Segoe UI", sans-serif;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; max-width: 380px; width: 90%; max-height: 85vh; overflow-y: auto; color: #fff; border: 2px solid rgba(255,215,0,0.3); box-shadow: 0 10px 40px rgba(0,0,0,0.5); position: relative; padding: 25px;';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'position: absolute; top: 10px; right: 15px; background: rgba(255,255,255,0.2); border: none; color: #fff; font-size: 24px; cursor: pointer;';
        closeBtn.addEventListener('click', () => modal.remove());
        content.appendChild(closeBtn);
        
        const title = document.createElement('h2');
        title.textContent = `${entry.username}'s Verses`;
        title.style.cssText = 'margin: 0 0 15px 0; color: #a8c5e6;';
        content.appendChild(title);
        
        const versesList = document.createElement('div');
        versesList.style.cssText = 'max-height: 300px; overflow-y: auto;';
        
        if (!entry.versesList || entry.versesList.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'text-align: center; padding: 20px; opacity: 0.7;';
            empty.textContent = 'No verses learned yet.';
            versesList.appendChild(empty);
        } else {
            entry.versesList.forEach(verse => {
                const verseItem = document.createElement('div');
                verseItem.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 4px; font-size: 0.9em;';
                verseItem.textContent = verse;
                versesList.appendChild(verseItem);
            });
        }
        
        content.appendChild(versesList);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    async _requireToken() {
        if (!this.authManager) return null;
        return await this.authManager.getToken();
    }
}

window.GroupsPanel = GroupsPanel;
