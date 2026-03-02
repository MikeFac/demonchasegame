/**
 * AuthManager.js
 * Client-side wrapper for Clerk.js.
 * Manages authentication state and provides a unified interface for the game.
 */
class AuthManager {
    constructor() {
        this.clerk = null;
        this.user = null;           // Clerk user object
        this.dbUser = null;         // MongoDB user profile
        this.isAuthenticated = false;
        this.isRegistered = false;   // User has completed registration (consent + DB entry)
        this.publishableKey = '';    // Set during init
        this._authChangeCallbacks = [];
    }

    /**
     * Initialize Clerk SDK
     */
    async init(publishableKey) {
        this.publishableKey = publishableKey;
        
        if (!publishableKey) {
            console.log('AuthManager: No Clerk publishable key — auth disabled');
            return false;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.setAttribute('data-clerk-publishable-key', publishableKey);
            script.async = true;
            // Use jsdelivr CDN (cdn.clerk.com may not resolve on all servers)
            script.src = `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
            
            script.onload = async () => {
                try {
                    this.clerk = window.Clerk;
                    await this.clerk.load();
                    
                    this.clerk.addListener(async ({ user }) => {
                        this.user = user;
                        this.isAuthenticated = !!user;
                        
                        if (this.isAuthenticated) {
                            await this._syncWithDB();
                        } else {
                            this.dbUser = null;
                            this.isRegistered = false;
                        }
                        
                        this._notifyAuthChange();
                    });
                    
                    resolve(this.isAuthenticated);
                } catch (err) {
                    console.error('Clerk load error:', err);
                    reject(err);
                }
            };
            
            script.onerror = (err) => {
                console.warn('Clerk CDN failed, trying local fallback...');
                // Try loading from local vendor path as fallback
                const fallbackScript = document.createElement('script');
                fallbackScript.setAttribute('data-clerk-publishable-key', publishableKey);
                fallbackScript.async = true;
                fallbackScript.src = '/vendor/clerk.browser.js';
                fallbackScript.onload = script.onload;
                fallbackScript.onerror = () => reject(new Error('Failed to load Clerk script from all sources'));
                document.body.appendChild(fallbackScript);
            };
            document.body.appendChild(script);
        });
    }

    /**
     * Fetch profile from our MongoDB to see if user is fully registered
     */
    async _syncWithDB() {
        if (!this.isAuthenticated) return;

        try {
            const token = await this.getToken();
            const response = await fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 404) {
                this.isRegistered = false;
                this.dbUser = null;
            } else if (response.ok) {
                const data = await response.json();
                this.dbUser = data.user;
                this.isRegistered = true;
            }
        } catch (error) {
            console.error('Error syncing with DB:', error);
        }
    }

    /**
     * Open Clerk Sign-in UI
     */
    async openSignIn() {
        if (!this.clerk) return;
        this.clerk.openSignIn({
            afterSignInUrl: window.location.href,
            redirectUrl: window.location.href
        });
    }

    /**
     * Open Clerk Sign-up UI
     */
    async openSignUp() {
        if (!this.clerk) return;
        this.clerk.openSignUp({
            afterSignUpUrl: window.location.href,
            redirectUrl: window.location.href
        });
    }

    /**
     * Sign Out — clears local state and Clerk session
     */
    async signOut() {
        if (!this.clerk) return;
        // Clear local state immediately
        this.user = null;
        this.dbUser = null;
        this.isAuthenticated = false;
        this.isRegistered = false;
        this._notifyAuthChange();
        // Then clear the Clerk session
        await this.clerk.signOut();
    }

    /**
     * Get JWT for authenticated API calls
     */
    async getToken() {
        if (!this.clerk || !this.user) return null;
        // clerk.session can be null momentarily during sign-in transitions
        if (!this.clerk.session) return null;
        try {
            return await this.clerk.session.getToken();
        } catch (e) {
            console.warn('AuthManager: Failed to get token', e.message);
            return null;
        }
    }

    /**
     * Complete the registration process (called from lobby/config)
     */
    async register(registrationData) {
        const token = await this.getToken();
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(registrationData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }

        const data = await response.json();
        this.dbUser = data.user;
        this.isRegistered = true;
        this._notifyAuthChange();
        return data;
    }

    /**
     * Event listener for auth changes
     */
    onAuthChange(callback) {
        this._authChangeCallbacks.push(callback);
        // Immediate call with current state
        callback({
            isAuthenticated: this.isAuthenticated,
            isRegistered: this.isRegistered,
            user: this.user,
            dbUser: this.dbUser
        });
    }

    _notifyAuthChange() {
        const state = {
            isAuthenticated: this.isAuthenticated,
            isRegistered: this.isRegistered,
            user: this.user,
            dbUser: this.dbUser
        };
        this._authChangeCallbacks.forEach(cb => cb(state));
    }
}

// Export for use in game
window.AuthManager = AuthManager;
