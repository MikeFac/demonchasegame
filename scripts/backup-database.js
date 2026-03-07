#!/usr/bin/env node
/**
 * Backup Database Before Migration
 * 
 * Creates a timestamped backup of the database
 * Run this BEFORE migrating to production!
 * 
 * Usage:
 *   node scripts/backup-database.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('📦 Creating database backup...\n');

  // Use mongodump if available
  const { execSync } = require('child_process');
  
  const dumpFile = path.join(backupDir, `versesongs-${timestamp}.archive`);
  const command = `mongodump --uri="${process.env.MONGODB_URI}" --archive="${dumpFile}"`;
  
  console.log(`Running: ${command}`);
  
  execSync(command, { stdio: 'inherit' });
  
  console.log(`\n✅ Backup created: ${dumpFile}`);
  console.log(`   Location: ${dumpFile}`);
  console.log(`   Size: ${(fs.statSync(dumpFile).size / 1024 / 1024).toFixed(2)} MB)\n`);
  console.log('⚠️  Keep this file safe in case you rollback is needed!\n');
}

backupDatabase().catch(err => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});
