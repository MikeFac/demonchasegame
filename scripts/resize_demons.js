const fs = require('fs');
const path = require('path');

// Check if sharp is available
try {
    const sharp = require('sharp');

    const TARGET_SIZE = 48;
    const monstersDir = path.join(__dirname, '../images/monsters');

    const newDemons = [
        'DECEPTION_SPIRIT1.png',
        'DEMON-OF-POVERTY.png',
        'DEMON-SWARM.png',
        'DISCOURAGEMENT.png',
        'JEZEBEL.png',
        'SHAME-ACCUSATION.png',
        'SPIRITUALBLINDNESS.png',
        'PRIDE.png'
    ];

    console.log('🎨 Resizing demon images to 48x48...\n');

    Promise.all(
        newDemons.map(async (filename) => {
            const filepath = path.join(monstersDir, filename);

            if (!fs.existsSync(filepath)) {
                console.log(`⚠️  Skipping ${filename} - not found`);
                return;
            }

            const metadata = await sharp(filepath).metadata();
            console.log(`${filename}: ${metadata.width}x${metadata.height} -> 48x48`);

            await sharp(filepath)
                .resize(TARGET_SIZE, TARGET_SIZE, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toFile(filepath + '.tmp');

            // Replace original with resized
            fs.renameSync(filepath + '.tmp', filepath);
            console.log(`  ✅ Done`);
        })
    ).then(() => {
        console.log('\n✅ All images resized!');
    }).catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });

} catch (e) {
    console.log('sharp not found, installing...');
    console.log('Run: npm install sharp');
    process.exit(1);
}
