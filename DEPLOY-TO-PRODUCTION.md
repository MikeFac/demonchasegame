# Deploy to Staging: dcgame.4you.tel

**Server**: `109.123.227.158`
**Domain**: `dcgame.4you.tel`
**User**: `dcgame` (No sudo access)
**Directory**: `/var/www/dcgame.4you.tel`

## 1. Initial Server Setup (As Root)
Login as root to create the user and directory structure.

```bash
# SSH into server
ssh root@109.123.227.158

# 1. Create the user (Follow prompts to set password)
adduser dcgame

# 2. Create the web directory and set ownership
mkdir -p /var/www/dcgame.4you.tel
chown -R dcgame:dcgame /var/www/dcgame.4you.tel
chmod -R 755 /var/www/dcgame.4you.tel

# 3. Install/Check Dependencies
# Node.js, Nginx are already installed.
# We just need PM2 and Certbot.
npm install -g pm2
apt-get install -y certbot python3-certbot-nginx
```

## 2. Deployment (As `dcgame` User)
Switch to the `dcgame` user to deploy the code securely.

```bash
# From root session:
su - dcgame

# Navigate to app directory
cd /var/www/dcgame.4you.tel

# Clone Repository
git clone git@github.com:MikeFac/demonchasegame.git .
npm install
```

## 2.1 Authorize GitHub (Deploy Key)
To clone a private repository, or just to authorize this server without using your password:

1.  **Get the Public Key** (Run on server as `dcgame`):
    ```bash
    cat ~/.ssh/id_ed25519.pub
    ```
2.  **Add to GitHub**:
    *   Go to your Repo Settings -> **Deploy Keys** -> **Add deploy key**.
    *   Title: `Staging Server (dcgame)`
    *   Key: (Paste the output from step 1)

## 3. PM2 Configuration (As `dcgame` User)
Start the application using PM2 so it runs in the background.

```bash
# Start the app
pm2 start server.js --name "dcgame-staging"
pm2 save

# Setup PM2 to start on boot (Requires Root)
# 1. Run this as dcgame user to get the command:
pm2 startup
# 2. Exit to root
exit 
# 3. Run the command displayed by the previous step (e.g., sudo env PATH=... pm2 startup systemd -u dcgame --hp /home/dcgame)
```

## 4. Nginx Configuration (As Root)
Setup the reverse proxy to point the domain to your Node.js app (Port 3500).

Create `/etc/nginx/conf.d/dcgame.4you.tel.conf`:

```nginx
server {
    server_name dcgame.4you.tel;

    location / {
        proxy_pass http://localhost:3500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
```

Enable and Test:
```bash
nginx -t
systemctl reload nginx
```

## 5. SSL Certificate (As Root)
Use Certbot to automatically obtain and configure the SSL certificate.

```bash
certbot --nginx -d dcgame.4you.tel
```
Follow the prompts. Certbot will automatically update the Nginx config to use HTTPS.
