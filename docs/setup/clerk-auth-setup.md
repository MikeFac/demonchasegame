# Clerk Authentication Setup

Clerk handles user authentication (sign-in, sign-up, session management) for VerseBattles.

## Architecture

- **Frontend**: `AuthManager.js` loads Clerk JS SDK and provides `openSignIn()` / `openSignUp()` modals
- **Backend**: `clerkAuth.js` middleware validates JWT tokens from Clerk sessions
- **Domain**: Custom domain `clerk.versebattles.com` for Frontend API

## Environment Variables

Required in `.env`:

```
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
```

Get these from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys.

## Custom Domain Setup

1. **Add Domain in Clerk Dashboard**
   - Go to **Configure** → **Hostnames** (or **Paths**)
   - Add `versebattles.com` as your application domain
   - Add `clerk.versebattles.com` for Frontend API
   - Add `accounts.versebattles.com` for Accounts portal

2. **Configure DNS** (in your domain registrar)
   - `clerk` CNAME → `frontend-api.clerk.services`
   - `accounts` CNAME → `accounts.clerk.services`

3. **Wait for SSL Provisioning**
   - Clerk provisions SSL certificates automatically
   - Can take 5-30 minutes
   - Dashboard shows green checkmarks when ready

## Google OAuth Setup

1. **Create Google Cloud OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://clerk.versebattles.com/v1/oauth_callback`
   - Copy Client ID and Client Secret

2. **Configure in Clerk Dashboard**
   - **Configure** → **SSO Connections** → **Google**
   - Paste Client ID and Client Secret
   - Enable Google sign-in

## Important: Clerk JS SDK Loading

The Clerk JS SDK must be loaded from the **custom domain** to include UI components for modal sign-in/sign-up.

```javascript
// CORRECT - loads from custom domain with UI components
script.src = `https://clerk.versebattles.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;

// WRONG - jsdelivr CDN doesn't include UI components
script.src = `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
```

See `src/client/AuthManager.js` for implementation.

## Troubleshooting

### "Clerk was not loaded with UI components"
- Cause: Loading Clerk JS from jsdelivr CDN instead of custom domain
- Fix: Load from `https://clerk.versebattles.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js`

### Cloudflare Challenge on accounts.versebattles.com
- This is Clerk's Cloudflare protection, not your Cloudflare settings
- The hosted accounts pages may show a challenge to bots/curl
- Real browsers should work fine

### 502 Bad Gateway after deployment
- Cause: Missing npm packages (e.g., `@clerk/backend`)
- Fix: Run `npm install` on server before restarting

### DNS not resolving
- Verify CNAME records point to `*.clerk.services` domains
- Use `dig accounts.versebattles.com` to check DNS propagation

## Deployment Checklist

1. Set `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env`
2. Run `npm install` if new packages added
3. Restart with `pm2 restart dcgame-staging`
4. Test sign-in/sign-up flows at https://versebattles.com
