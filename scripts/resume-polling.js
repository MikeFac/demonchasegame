const mongoose = require('mongoose');
require('dotenv').config();
const VerseSong = require('../src/server/models/VerseSong');
const { pollSunoStatus } = require('../src/server/services/SunoService');

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all verses stuck in processing
        const processing = await VerseSong.find({ generationStatus: 'processing' });
        console.log(`🚀 Resuming polling for ${processing.length} 'processing' songs...\n`);

        for (let i = 0; i < processing.length; i++) {
            const song = processing[i];
            // Stagger polling slightly to avoid hammering DB/API instantly
            setTimeout(() => {
                console.log(`📡 Resuming poll for: ${song.verseReference} (${song._id})`);
                pollSunoStatus(song._id).catch(err => {
                    console.error(`Error polling ${song.verseReference}:`, err.message);
                });
            }, i * 200); // 200ms stagger is enough
        }

        const keepAliveTime = 25 * 60 * 1000; // 25 minutes
        console.log(`\n✅ Polling resumed. Keeping process alive for 25 minutes to allow completion.`);

        setTimeout(() => {
            console.log('🏁 Finished monitoring period. Exiting.');
            process.exit(0);
        }, keepAliveTime);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

main();
