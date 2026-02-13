# Deploying Updates to Staging

**Server**: `109.123.227.158`
**User**: `root` -> `dcgame`
**Directory**: `/var/www/dcgame.4you.tel`

## Prerequisite
Ensure your local changes are committed and pushed to the `master` branch on GitHub.

```bash
git push origin master
```

## Deployment Steps

1.  **SSH into the server as root**:
    ```bash
    ssh root@109.123.227.158
    ```

2.  **Switch to the application user**:
    ```bash
    su - dcgame
    ```

3.  **Navigate to the project directory**:
    ```bash
    cd /var/www/dcgame.4you.tel
    ```

4.  **Pull the latest changes**:
    ```bash
    git pull
    ```

5.  **Restart the application**:
    ```bash
    pm2 restart dcgame-staging
    ```

## Syncing Audio Files (Songs)

Audio files are **not stored in git** (`public/audio/` is in `.gitignore`).
After generating new songs locally, sync them to staging separately.

### 1. Upload audio files via SCP
From your **local machine**:
```bash
scp -r public/audio/*.mp3 root@109.123.227.158:/var/www/dcgame.4you.tel/public/audio/
```

Then fix ownership:
```bash
ssh root@109.123.227.158 "chown -R dcgame:dcgame /var/www/dcgame.4you.tel/public/audio/"
```

### 2. Export & import VerseSong database records
From your **local machine**:
```bash
# Export completed songs from local DB
mongoexport --uri="mongodb://admin:secret@localhost:27017/dcgame?authSource=admin" \
  --collection=versesongs \
  --query='{"generationStatus":"completed"}' \
  --out=/tmp/versesongs-export.json

# Fix paths for staging
sed -i 's|/home/michael/proj/dcgame/|/var/www/dcgame.4you.tel/|g' /tmp/versesongs-export.json

# Upload export to staging
scp /tmp/versesongs-export.json root@109.123.227.158:/tmp/versesongs-export.json
```

### 3. Backup & import on staging
```bash
ssh root@109.123.227.158 bash -c '
  # Backup existing DB
  mongodump --uri="mongodb://admin:secret@localhost:27017/dcgame?authSource=admin" \
    --out=/tmp/dcgame-backup-$(date +%Y%m%d)

  # Import (--drop replaces the collection)
  mongoimport --uri="mongodb://admin:secret@localhost:27017/dcgame?authSource=admin" \
    --collection=versesongs \
    --file=/tmp/versesongs-export.json \
    --drop
'
```

### 4. Restart the app
```bash
ssh root@109.123.227.158 "su - dcgame -c 'pm2 restart dcgame-staging'"
```

## Verification
Visit [https://dcgame.4you.tel](https://dcgame.4you.tel) to confirm the changes are live.

## Quick Command (Code Only — No Songs)
Deploy code changes only (songs require the SCP steps above):

```bash
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && git pull && pm2 restart dcgame-staging'"
```
