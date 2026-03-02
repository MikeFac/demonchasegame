/**
 * SyncManager.js
 * Handles the synchronization of player progress between 
 * localStorage and the MongoDB backend.
 * 
 * Features:
 * - Periodic background sync (every 5 minutes)
 * - Sync on window focus
 * - Offline queue: changes are queued in localStorage when offline
 * - Queue is flushed automatically when connectivity is restored
 */
const SYNC_QUEUE_KEY = 'syncQueue';

class SyncManager {
    constructor(authManager, progressManager) {
        this.auth = authManager;
        this.progress = progressManager;
        this.isSyncing = false;
        this.syncInterval = 5 * 60 * 1000; // 5 minutes
        this._intervalId = null;
        this._boundOnline = this._onOnline.bind(this);
        this._boundFocus = this._onFocus.bind(this);
    }

    /**
     * Start the background sync loop and event listeners.
     */
    start() {
        if (this._intervalId) return;

        this._intervalId = setInterval(() => this.sync(), this.syncInterval);

        // Sync when browser comes back online
        window.addEventListener('online', this._boundOnline);

        // Sync when window regains focus
        window.addEventListener('focus', this._boundFocus);

        // Initial sync (if online and authenticated)
        this.sync();
    }

    /**
     * Stop the background sync loop and remove event listeners.
     */
    stop() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        window.removeEventListener('online', this._boundOnline);
        window.removeEventListener('focus', this._boundFocus);
    }

    /**
     * Check if the browser is online.
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * Called when the browser regains connectivity.
     * Flushes any queued changes, then does a full sync.
     */
    _onOnline() {
        console.log('SyncManager: Back online, flushing queue...');
        this.sync();
    }

    /**
     * Called when the window regains focus.
     */
    _onFocus() {
        this.sync();
    }

    /**
     * Queue a change for later sync.
     * Used when offline or when we want to batch changes.
     * @param {Object} change - The change to queue (e.g., { type: 'missionComplete', ... })
     */
    queueChange(change) {
        try {
            const queue = this._getQueue();
            queue.push({
                ...change,
                timestamp: Date.now()
            });
            localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
        } catch (error) {
            console.error('SyncManager: Failed to queue change', error);
        }
    }

    /**
     * Get the current offline queue from localStorage.
     */
    _getQueue() {
        try {
            const stored = localStorage.getItem(SYNC_QUEUE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Clear the offline queue after a successful sync.
     */
    _clearQueue() {
        localStorage.removeItem(SYNC_QUEUE_KEY);
    }

    /**
     * Perform a synchronization.
     * 1. Check preconditions (online, authenticated, registered).
     * 2. Get current local progress.
     * 3. Send to server (server merges and returns the merged result).
     * 4. Update local progress with server response.
     * 5. Clear the offline queue.
     */
    async sync() {
        // Guard: don't sync if not online, not authenticated, or already syncing
        if (!this.isOnline()) return;
        if (!this.auth.isAuthenticated || !this.auth.isRegistered) return;
        if (this.isSyncing) return;

        this.isSyncing = true;

        try {
            const token = await this.auth.getToken();
            if (!token) {
                console.warn('SyncManager: No auth token available');
                return;
            }

            const localProgress = this.progress.getProgress();

            const response = await fetch('/api/progress/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    clientProgress: localProgress
                })
            });

            if (!response.ok) {
                throw new Error(`Sync failed with status ${response.status}`);
            }

            const data = await response.json();
            
            // Update local progress with the merged server result
            if (data.progress) {
                this.progress.overwriteProgress(data.progress);
            }

            // Clear the offline queue — everything is now synced
            this._clearQueue();

            console.log('SyncManager: Sync complete.');
        } catch (error) {
            console.warn('SyncManager: Sync failed (will retry later)', error.message);
            // Don't throw — the sync will be retried on next interval/focus/online
        } finally {
            this.isSyncing = false;
        }
    }
}

// Export for use in game
window.SyncManager = SyncManager;
