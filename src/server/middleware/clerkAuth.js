const { verifyToken } = require('@clerk/backend');

/**
 * Clerk Authentication Middleware
 * Verifies the Clerk session JWT from the Authorization header.
 * Uses the top-level `verifyToken` export (not the ClerkClient instance method).
 */

const SECRET_KEY = process.env.CLERK_SECRET_KEY;

/**
 * Middleware to protect routes and require a valid Clerk session.
 * Usage: app.get('/protected-route', requireAuth, (req, res) => { ... })
 */
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or malformed Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // verifyToken is a top-level function from @clerk/backend
        // It validates the JWT signature and expiry using the secret key
        const sessionClaims = await verifyToken(token, {
            secretKey: SECRET_KEY
        });

        if (!sessionClaims) {
            return res.status(401).json({ error: 'Invalid session token' });
        }

        // Attach session/user info to request
        req.auth = {
            userId: sessionClaims.sub, // Clerk user ID
            sessionId: sessionClaims.sid,
            session: sessionClaims
        };

        next();
    } catch (error) {
        console.error('Clerk Auth Error:', error.message);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

/**
 * Optional Auth Middleware
 * Attaches user info to req.auth if a valid token is present, but doesn't block if missing.
 * Use for routes that show extra data to logged-in users.
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const sessionClaims = await verifyToken(token, {
                secretKey: SECRET_KEY
            });
            if (sessionClaims) {
                req.auth = {
                    userId: sessionClaims.sub,
                    sessionId: sessionClaims.sid,
                    session: sessionClaims
                };
            }
        } catch (e) {
            // Silently ignore — user proceeds as guest
        }
    }
    next();
};

module.exports = {
    requireAuth,
    optionalAuth
};
