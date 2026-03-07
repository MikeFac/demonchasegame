const mongoose = require('mongoose');
require('dotenv').config();

const CategoryStyle = require('../src/server/models/CategoryStyle');

const styles = [
  {
    category: 'Wisdom',
    generationStyle: 'acoustic',
    description: 'Fingerpicking acoustic—introspective and timeless',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Purity',
    generationStyle: 'ambient',
    description: 'Atmospheric pads with minimal rhythm—clean and transcendent',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Faith',
    generationStyle: 'yacht rock + aor',
    description: 'Smooth yacht rock with polished production—uplifting and trustworthy',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Love',
    generationStyle: 'pop',
    description: 'Melodic pop with relatable hooks—warm and accessible',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Knowledge',
    generationStyle: 'celtic',
    description: 'Celtic flutes and strings—mystical and flowing',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Joy',
    generationStyle: 'disco',
    description: 'Upbeat disco with strings—evokes celebration and happiness',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Praise',
    generationStyle: 'gospel',
    description: 'Spiritual gospel vocals—celebratory and communal',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Humility',
    generationStyle: 'folk',
    description: 'Storytelling folk with acoustic guitar—humble and grounded',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Healing',
    generationStyle: 'soul',
    description: 'Soulful vocals with warmth and groove—compassionate and restorative',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Hope',
    generationStyle: 'uplifting pop',
    description: 'Bright synths in major keys—optimistic and forward-moving',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Endurance',
    generationStyle: '80s rock',
    description: 'Big melodic 80s rock with driving rhythm—steady and determined',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Forgiveness',
    generationStyle: 'r&b',
    description: 'Smooth R&B grooves with soulful vocals—compassionate and healing',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Prosperity',
    generationStyle: 'jazz',
    description: 'Smooth jazz horns with complex rhythms—rich and sophisticated',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Focus',
    generationStyle: 'lo-fi',
    description: 'Chill lo-fi beats with atmospheric elements—steady and meditative',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Identity',
    generationStyle: 'indie rock',
    description: 'Honest indie rock with introspective vocals—authentic and direct',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Prophecy',
    generationStyle: 'electronic',
    description: 'Synths and future-forward soundscape—visionary and mysterious',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Deliverance',
    generationStyle: 'hip-hop',
    description: 'Strong beat with rhythmic spoken word—powerful and liberating',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Power',
    generationStyle: 'anthemic pop',
    description: 'Big uplifting pop with punch and confidence—strong without harshness',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Good News',
    generationStyle: 'pop rock',
    description: 'Energetic pop rock with hooky melodies—exciting and spreading',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Courage',
    generationStyle: '80s rock',
    description: 'Melodic 80s rock with strong hooks—bold and fearless',
    generationDuration: 75,
    repeatCount: 1
  },
  {
    category: 'Prayer',
    generationStyle: 'worship',
    description: 'Reverent worship with spacious arrangement—prayerful and intimate',
    generationDuration: 75,
    repeatCount: 1
  },

];

async function seedStyles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    for (const style of styles) {
      await CategoryStyle.updateOne(
        { category: style.category },
        style,
        { upsert: true }
      );
      console.log(`✨ Seeded: ${style.category} → ${style.generationStyle}`);
    }

    console.log('\n✅ All category styles seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding:', err);
    process.exit(1);
  }
}

seedStyles();
