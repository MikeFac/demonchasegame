/**
 * SongLibraryOverlay - Read-only song browser opened from Learn Mode.
 */
(function () {
    function formatDuration(seconds) {
        if (!seconds || !Number.isFinite(seconds)) {
            return '';
        }

        const totalSeconds = Math.round(seconds);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    class SongLibraryOverlay {
        constructor() {
            this.root = null;
            this.content = null;
            this.status = null;
            this.searchInput = null;
            this.currentAudio = null;
            this.currentSongId = null;
            this.lastPayload = null;
            this.isOpen = false;
            this.searchTerm = '';
            this.openCategories = new Set();
            this.currentReference = null;
            this.isSongAdmin = false;
            this.playbackNonce = 0;
        }

        getLocalAdminStatus() {
            if (!window.authManager) {
                return false;
            }

            const dbEmail = window.authManager.dbUser?.email
                ? String(window.authManager.dbUser.email).toLowerCase()
                : null;
            const primaryEmail = window.authManager.user?.primaryEmailAddress?.emailAddress
                ? String(window.authManager.user.primaryEmailAddress.emailAddress).toLowerCase()
                : null;
            const listedEmail = Array.isArray(window.authManager.user?.emailAddresses)
                ? window.authManager.user.emailAddresses
                    .map((entry) => entry?.emailAddress ? String(entry.emailAddress).toLowerCase() : null)
                    .find(Boolean)
                : null;

            return (
                dbEmail === 'michaelfackerell@gmail.com' ||
                primaryEmail === 'michaelfackerell@gmail.com' ||
                listedEmail === 'michaelfackerell@gmail.com'
            );
        }

        ensureDom() {
            if (this.root) {
                return;
            }

            const root = document.createElement('div');
            root.id = 'song-library-overlay';
            root.style.cssText = [
                'display:none',
                'position:fixed',
                'inset:0',
                'background:rgba(7, 10, 18, 0.84)',
                'backdrop-filter: blur(6px)',
                'z-index:2500',
                'padding:20px',
                'font-family:"Segoe UI", Tahoma, sans-serif'
            ].join(';');

            const panel = document.createElement('div');
            panel.style.cssText = [
                'width:min(980px, 100%)',
                'max-height:min(88vh, 900px)',
                'margin:0 auto',
                'background:linear-gradient(180deg, #182333 0%, #101823 100%)',
                'border:1px solid rgba(255,255,255,0.12)',
                'border-radius:18px',
                'box-shadow:0 24px 80px rgba(0,0,0,0.45)',
                'display:flex',
                'flex-direction:column',
                'overflow:hidden'
            ].join(';');

            const header = document.createElement('div');
            header.style.cssText = [
                'display:flex',
                'justify-content:space-between',
                'align-items:center',
                'gap:16px',
                'padding:18px 22px 14px 22px',
                'border-bottom:1px solid rgba(255,255,255,0.08)'
            ].join(';');

            const titleWrap = document.createElement('div');
            const title = document.createElement('div');
            title.textContent = 'Song Library';
            title.style.cssText = 'font-size:1.25rem;font-weight:700;color:#f8fbff;';
            const subtitle = document.createElement('div');
            subtitle.textContent = 'Browse by category, filter by verse, and play any exact song version.';
            subtitle.style.cssText = 'font-size:0.92rem;color:rgba(255,255,255,0.68);margin-top:4px;';
            titleWrap.appendChild(title);
            titleWrap.appendChild(subtitle);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = [
                'background:rgba(255,255,255,0.08)',
                'color:#fff',
                'border:1px solid rgba(255,255,255,0.14)',
                'border-radius:10px',
                'padding:10px 14px',
                'cursor:pointer',
                'font-weight:600'
            ].join(';');
            closeBtn.addEventListener('click', () => this.close());

            header.appendChild(titleWrap);
            header.appendChild(closeBtn);

            const status = document.createElement('div');
            status.style.cssText = 'padding:10px 22px;color:#b9c7d8;font-size:0.92rem;border-bottom:1px solid rgba(255,255,255,0.06);';
            status.textContent = 'Loading songs...';

            const toolbar = document.createElement('div');
            toolbar.style.cssText = [
                'display:flex',
                'gap:12px',
                'align-items:center',
                'padding:14px 22px',
                'border-bottom:1px solid rgba(255,255,255,0.06)',
                'background:rgba(255,255,255,0.02)',
                'position:sticky',
                'top:0',
                'z-index:2'
            ].join(';');

            const searchInput = document.createElement('input');
            searchInput.type = 'search';
            searchInput.placeholder = 'Filter by category, verse, or style';
            searchInput.style.cssText = [
                'flex:1',
                'background:rgba(255,255,255,0.08)',
                'color:#fff',
                'border:1px solid rgba(255,255,255,0.14)',
                'border-radius:12px',
                'padding:11px 14px',
                'font-size:0.95rem',
                'outline:none'
            ].join(';');
            searchInput.addEventListener('input', () => {
                this.searchTerm = searchInput.value.trim().toLowerCase();
                this.renderLibrary(this.lastPayload, { currentReference: this.currentReference });
            });

            const stopBtn = document.createElement('button');
            stopBtn.type = 'button';
            stopBtn.textContent = 'Stop Audio';
            stopBtn.style.cssText = [
                'background:rgba(255,123,114,0.16)',
                'color:#ffd8d4',
                'border:1px solid rgba(255,123,114,0.26)',
                'border-radius:12px',
                'padding:10px 14px',
                'cursor:pointer',
                'font-weight:600'
            ].join(';');
            stopBtn.addEventListener('click', () => this.stopPlayback());

            toolbar.appendChild(searchInput);
            toolbar.appendChild(stopBtn);

            const content = document.createElement('div');
            content.style.cssText = 'padding:18px 22px 22px 22px;overflow:auto;';

            panel.appendChild(header);
            panel.appendChild(status);
            panel.appendChild(toolbar);
            panel.appendChild(content);
            root.appendChild(panel);
            document.body.appendChild(root);

            root.addEventListener('click', (event) => {
                if (event.target === root) {
                    this.close();
                }
            });

            this.root = root;
            this.content = content;
            this.status = status;
            this.searchInput = searchInput;
        }

        async fetchLibrary() {
            const headers = {};
            if (window.authManager && window.authManager.isAuthenticated) {
                const token = await window.authManager.getToken();
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }
            }

            const lang = typeof I18n !== 'undefined'
                ? (typeof I18n.getContentLang === 'function' ? I18n.getContentLang() : I18n.getLang())
                : 'en';
            const response = await fetch(`/api/verse-song/library?lang=${lang}`, { headers });
            if (!response.ok) {
                throw new Error(`Library request failed: ${response.status}`);
            }

            return response.json();
        }

        stopOtherAudioSources() {
            if (window.ReviewMode && typeof window.ReviewMode.stopAudio === 'function') {
                window.ReviewMode.stopAudio();
            }

            if (window.MusicManager && typeof window.MusicManager.stop === 'function') {
                window.MusicManager.stop();
            }
        }

        getVisibleCategories(payload) {
            const categories = payload?.categories || [];
            if (!this.searchTerm) {
                return categories;
            }

            return categories
                .map((categoryGroup) => {
                    const categoryMatches = categoryGroup.category.toLowerCase().includes(this.searchTerm);
                    const verses = categoryGroup.verses.filter((verse) => {
                        const verseText = `${verse.displayReference} ${verse.verseReference} ${verse.verseReferenceFull || ''}`.toLowerCase();
                        const verseMatches = verseText.includes(this.searchTerm);
                        const songMatches = verse.songs.some((song) => (
                            `${song.generationStyle || ''} v${song.version}`.toLowerCase().includes(this.searchTerm)
                        ));
                        return categoryMatches || verseMatches || songMatches;
                    });

                    if (!categoryMatches && !verses.length) {
                        return null;
                    }

                    return {
                        ...categoryGroup,
                        verses: categoryMatches && !verses.length ? categoryGroup.verses : verses
                    };
                })
                .filter(Boolean);
        }

        async open(options = {}) {
            this.ensureDom();
            if (window.MusicManager && typeof window.MusicManager.setSongBrowsingMode === 'function') {
                window.MusicManager.setSongBrowsingMode(true);
            }
            this.stopOtherAudioSources();
            this.root.style.display = 'block';
            this.isOpen = true;
            this.status.textContent = 'Loading songs...';
            this.content.innerHTML = '';
            this.currentReference = options.currentReference || null;

            if (this.searchInput) {
                this.searchInput.value = this.searchTerm;
            }

            try {
                const payload = await this.fetchLibrary();
                this.lastPayload = payload;
                this.isSongAdmin = Boolean(payload.isSongAdmin || this.getLocalAdminStatus());

                const currentCategory = payload.categories.find((categoryGroup) => (
                    categoryGroup.verses.some((verse) => verse.displayReference === this.currentReference)
                ));
                if (currentCategory) {
                    this.openCategories.add(currentCategory.category);
                }

                this.renderLibrary(payload, options);
            } catch (err) {
                console.error('SongLibraryOverlay: failed to load library', err);
                this.status.textContent = 'Could not load the song library.';
                this.content.innerHTML = '<div style="color:#ffb4b4;">The song library could not be loaded.</div>';
            }
        }

        close() {
            if (!this.root) {
                return;
            }
            this.stopPlayback();
            this.stopOtherAudioSources();
            this.root.style.display = 'none';
            this.isOpen = false;
            if (window.MusicManager && typeof window.MusicManager.setSongBrowsingMode === 'function') {
                window.MusicManager.setSongBrowsingMode(false);
            }
        }

        stopPlayback() {
            this.playbackNonce += 1;
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio.removeAttribute('src');
                this.currentAudio.load();
                this.currentAudio = null;
            }
            this.currentSongId = null;
            this.status.textContent = this.lastPayload
                ? `${this.lastPayload.totalSongs || 0} songs across ${this.lastPayload.totalCategories || 0} categories`
                : 'Playback stopped';
            this.refreshPlayingState();
        }

        async archiveDeleteSong(song) {
            const confirmed = window.confirm(`Archive and delete ${song.displayReference} v${song.version}?`);
            if (!confirmed) {
                return;
            }

            if (!window.authManager || !window.authManager.isAuthenticated) {
                this.status.textContent = 'You must be logged in to delete songs.';
                return;
            }

            const token = await window.authManager.getToken();
            if (!token) {
                this.status.textContent = 'Could not verify your login token.';
                return;
            }

            const response = await fetch(`/api/verse-song/${song.id}/archive-delete`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || `Delete failed (${response.status})`);
            }

            if (this.currentSongId === song.id) {
                this.stopPlayback();
            }

            this.status.textContent = `Archived and deleted ${song.displayReference} v${song.version}`;
            const refreshed = await this.fetchLibrary();
            this.lastPayload = refreshed;
            this.isSongAdmin = Boolean(refreshed.isSongAdmin);
            this.renderLibrary(refreshed, { currentReference: this.currentReference });
        }

        playSong(song) {
            if (!song?.audioUrl) {
                return;
            }

            this.stopOtherAudioSources();

            if (this.currentSongId === song.id && this.currentAudio && !this.currentAudio.paused) {
                this.stopPlayback();
                return;
            }

            this.stopPlayback();
            const playbackNonce = this.playbackNonce;
            this.currentSongId = song.id;
            this.currentAudio = new Audio(song.audioUrl);
            this.currentAudio.addEventListener('ended', () => {
                if (playbackNonce !== this.playbackNonce) {
                    return;
                }
                this.currentAudio = null;
                this.currentSongId = null;
                this.status.textContent = `Finished ${song.displayReference} v${song.version}`;
                this.refreshPlayingState();
            });
            this.currentAudio.addEventListener('error', () => {
                if (playbackNonce !== this.playbackNonce) {
                    return;
                }
                this.currentAudio = null;
                this.currentSongId = null;
                this.refreshPlayingState();
                this.status.textContent = 'That song could not be played.';
            });
            this.currentAudio.play()
                .then(() => {
                    if (playbackNonce !== this.playbackNonce || !this.isOpen) {
                        this.stopPlayback();
                        return;
                    }
                    this.status.textContent = `Playing ${song.displayReference} v${song.version}`;
                    this.refreshPlayingState();
                })
                .catch((err) => {
                    if (playbackNonce !== this.playbackNonce) {
                        return;
                    }
                    console.error('SongLibraryOverlay: playback failed', err);
                    this.currentAudio = null;
                    this.currentSongId = null;
                    this.refreshPlayingState();
                    this.status.textContent = 'Browser blocked playback.';
                });
        }

        refreshPlayingState() {
            if (!this.root) {
                return;
            }

            const rows = this.root.querySelectorAll('[data-song-row-id]');
            rows.forEach((row) => {
                const isCurrent = row.getAttribute('data-song-row-id') === this.currentSongId;
                row.style.background = isCurrent ? 'rgba(62,156,255,0.16)' : 'transparent';
                row.style.borderColor = isCurrent ? 'rgba(62,156,255,0.35)' : 'transparent';
            });

            const buttons = this.root.querySelectorAll('[data-song-id]');
            buttons.forEach((button) => {
                const isCurrent = button.getAttribute('data-song-id') === this.currentSongId;
                button.textContent = isCurrent ? 'Stop' : 'Play';
                button.style.background = isCurrent ? '#ff7b72' : '#3e9cff';
            });
        }

        toggleCategory(categoryName) {
            if (this.openCategories.has(categoryName)) {
                this.openCategories.delete(categoryName);
            } else {
                this.openCategories.add(categoryName);
            }

            this.renderLibrary(this.lastPayload, { currentReference: this.currentReference });
        }

        renderLibrary(payload, options = {}) {
            if (!payload) {
                return;
            }

            this.lastPayload = payload;
            this.currentReference = options.currentReference || this.currentReference;
            this.isSongAdmin = Boolean(payload.isSongAdmin || this.getLocalAdminStatus());

            const categories = this.getVisibleCategories(payload);
            const currentReference = this.currentReference;
            this.status.textContent = `${payload.totalSongs || 0} songs across ${payload.totalCategories || 0} categories`;
            this.content.innerHTML = '';

            if (this.searchTerm && !categories.length) {
                this.content.innerHTML = '<div style="color:#d7e5f5;">No songs matched that filter.</div>';
                return;
            }

            if (!categories.length) {
                this.content.innerHTML = '<div style="color:#d7e5f5;">No completed songs are available yet.</div>';
                return;
            }

            categories.forEach((categoryGroup) => {
                const shouldOpen = this.openCategories.has(categoryGroup.category) || Boolean(this.searchTerm);

                const section = document.createElement('section');
                section.style.cssText = 'margin-bottom:18px;border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden;background:rgba(255,255,255,0.03);';

                const header = document.createElement('button');
                header.type = 'button';
                header.style.cssText = [
                    'width:100%',
                    'padding:12px 16px',
                    'background:rgba(255,255,255,0.04)',
                    'font-size:1rem',
                    'font-weight:700',
                    'color:#ffe39a',
                    'display:flex',
                    'align-items:center',
                    'justify-content:space-between',
                    'border:none',
                    'cursor:pointer'
                ].join(';');
                header.innerHTML = `<span>${categoryGroup.category} (${categoryGroup.verses.length})</span><span style="color:rgba(255,255,255,0.65);font-size:0.9rem;">${shouldOpen ? 'Hide' : 'Show'}</span>`;
                header.addEventListener('click', () => this.toggleCategory(categoryGroup.category));
                section.appendChild(header);

                if (shouldOpen) {
                    const verseList = document.createElement('div');
                    verseList.style.cssText = 'padding:10px 12px 12px 12px;';

                    categoryGroup.verses.forEach((verse) => {
                        const verseCard = document.createElement('div');
                        const isCurrentVerse = currentReference && verse.displayReference === currentReference;
                        verseCard.style.cssText = [
                            'padding:12px 12px 8px 12px',
                            'border-radius:12px',
                            'margin-bottom:10px',
                            isCurrentVerse ? 'background:rgba(62,156,255,0.12)' : 'background:rgba(0,0,0,0.16)'
                        ].join(';');

                        const verseHeader = document.createElement('div');
                        verseHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;';

                        const verseTitle = document.createElement('div');
                        verseTitle.textContent = verse.displayReference;
                        verseTitle.style.cssText = 'color:#f7fbff;font-weight:700;font-size:0.98rem;';

                        verseHeader.appendChild(verseTitle);

                        if (isCurrentVerse) {
                            const badge = document.createElement('div');
                            badge.textContent = 'Current Learn Verse';
                            badge.style.cssText = 'padding:4px 8px;border-radius:999px;background:rgba(62,156,255,0.18);color:#9bd2ff;font-size:0.75rem;font-weight:700;';
                            verseHeader.appendChild(badge);
                        }

                        verseCard.appendChild(verseHeader);

                        verse.songs.forEach((song) => {
                            const row = document.createElement('div');
                            row.setAttribute('data-song-row-id', song.id);
                            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;border:1px solid transparent;transition:background 120ms ease;margin-bottom:6px;';

                            const meta = document.createElement('div');
                            meta.style.cssText = 'display:flex;flex-direction:column;gap:2px;min-width:0;';

                            const top = document.createElement('div');
                            top.textContent = `Version ${song.version}`;
                            top.style.cssText = 'color:#fff;font-size:0.94rem;font-weight:600;';

                            const bottom = document.createElement('div');
                            const parts = [];
                            if (song.generationStyle) {
                                parts.push(song.generationStyle);
                            }
                            if (song.duration) {
                                parts.push(formatDuration(song.duration));
                            }
                            bottom.textContent = parts.join(' • ');
                            bottom.style.cssText = 'color:rgba(255,255,255,0.62);font-size:0.83rem;';

                            meta.appendChild(top);
                            meta.appendChild(bottom);

                            const controls = document.createElement('div');
                            controls.style.cssText = 'display:flex;align-items:center;gap:8px;';

                            const playBtn = document.createElement('button');
                            playBtn.type = 'button';
                            playBtn.setAttribute('data-song-id', song.id);
                            playBtn.textContent = this.currentSongId === song.id ? 'Stop' : 'Play';
                            playBtn.style.cssText = [
                                'background:#3e9cff',
                                'color:#fff',
                                'border:none',
                                'border-radius:10px',
                                'padding:8px 14px',
                                'font-weight:700',
                                'cursor:pointer',
                                'min-width:72px'
                            ].join(';');
                            playBtn.addEventListener('click', () => {
                                this.playSong({
                                    ...song,
                                    displayReference: verse.displayReference
                                });
                            });

                            controls.appendChild(playBtn);

                            if (this.isSongAdmin) {
                                const deleteBtn = document.createElement('button');
                                deleteBtn.type = 'button';
                                deleteBtn.textContent = 'Delete';
                                deleteBtn.style.cssText = [
                                    'background:rgba(255,123,114,0.14)',
                                    'color:#ffd8d4',
                                    'border:1px solid rgba(255,123,114,0.25)',
                                    'border-radius:10px',
                                    'padding:8px 12px',
                                    'font-weight:700',
                                    'cursor:pointer'
                                ].join(';');
                                deleteBtn.addEventListener('click', async () => {
                                    try {
                                        await this.archiveDeleteSong({
                                            ...song,
                                            displayReference: verse.displayReference
                                        });
                                    } catch (err) {
                                        console.error('SongLibraryOverlay: archive-delete failed', err);
                                        this.status.textContent = err.message;
                                    }
                                });
                                controls.appendChild(deleteBtn);
                            }

                            row.appendChild(meta);
                            row.appendChild(controls);
                            verseCard.appendChild(row);
                        });

                        verseList.appendChild(verseCard);
                    });

                    section.appendChild(verseList);
                }

                this.content.appendChild(section);
            });

            this.refreshPlayingState();
        }
    }

    window.SongLibraryOverlay = new SongLibraryOverlay();
})();
