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

## Verification
Visit [https://dcgame.4you.tel](https://dcgame.4you.tel) to confirm the changes are live.

## Quick Command (One-Liner)
You can run this entire sequence from your local machine in one go:

```bash
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && git pull && pm2 restart dcgame-staging'"
```
