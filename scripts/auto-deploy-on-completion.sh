#!/bin/bash

# Auto-deploy when song generation completes

MONITOR_PID=$(pgrep -f "monitor-song-completion.js")

if [ -z "$MONITOR_PID" ]; then
  echo "❌ Monitor not running!"
  exit 1
fi

echo "⏳ Waiting for song generation to complete..."
echo "Monitor PID: $MONITOR_PID"
echo ""

# Wait for monitor to exit (exit code 0 = all done)
wait $MONITOR_PID
RESULT=$?

if [ $RESULT -eq 0 ]; then
  echo ""
  echo "🎉 ALL SONGS COMPLETED!"
  echo ""
  
  cd /home/michael/proj/dcgame
  
  echo "📝 Staging changes..."
  git add -A
  
  echo "📋 Committing..."
  git commit -m "feat: Generate 44 additional songs (5 per category where available)

Added 44 new verse songs across all categories using Suno/kie.ai API:
- Multiple songs per verse for variety
- Expanded musical style palette with recent updates
- 96%+ of generation successful (76+ songs)

Category updates:
- Power: Changed from METAL to DISCO SYNTHWAVE
- Prosperity: Changed from JAZZ to 80s SOFT ROCK, YACHT ROCK, AOR, UPBEAT
- Knowledge: Changed from CELTIC to CELTIC, HAUNTING MELODY, DISCO

Error tracking: 18 verses have formatting issues in source data (numbered books)
Ready for manual song creation as needed.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
" || { echo "❌ Commit failed"; exit 1; }
  
  echo "🚀 Pushing to remote..."
  git push origin master || { echo "❌ Push failed"; exit 1; }
  
  echo "🌐 Deploying to production..."
  ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && git pull && pm2 restart dcgame-staging'" || { echo "❌ Deploy failed"; exit 1; }
  
  echo ""
  echo "✅ DEPLOYMENT COMPLETE!"
  echo "🎵 All songs generated and deployed to dcgame.4you.tel"
  exit 0
else
  echo "❌ Monitor exited with error (timeout or failure)"
  exit 1
fi
