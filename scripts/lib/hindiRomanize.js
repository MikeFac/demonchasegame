const DEVANAGARI_VOWELS = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ii', 'उ': 'u', 'ऊ': 'uu',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऍ': 'e', 'ऑ': 'o'
};

const DEVANAGARI_MATRAS = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ii', 'ु': 'u', 'ू': 'uu',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॅ': 'e', 'ॉ': 'o'
};

const DEVANAGARI_CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r',
  'ढ़': 'rh', 'फ़': 'f', 'य़': 'y'
};

const NUKTA_CONSONANTS = {
  'क': 'q',
  'ख': 'kh',
  'ग': 'gh',
  'ज': 'z',
  'ड': 'r',
  'ढ': 'rh',
  'फ': 'f',
  'य': 'y'
};

const DEVANAGARI_SIGNS = {
  'ं': 'n',
  'ँ': 'n',
  'ः': 'h',
  'ऽ': "'"
};

const HTML_TAG_RE = /(<[^>]+>)/g;

function isDevanagariChar(ch) {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return code >= 0x0900 && code <= 0x097F;
}

function toAsciiRomanized(text) {
  if (!text) return text;
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ṁ|ṃ/g, 'm')
    .replace(/ṅ/g, 'ng')
    .replace(/ñ/g, 'ny')
    .replace(/ṇ/g, 'n')
    .replace(/ṭ/g, 't')
    .replace(/ḍ/g, 'd')
    .replace(/ś|ṣ/g, 'sh')
    .replace(/ṛ/g, 'ri')
    .replace(/ḥ/g, 'h')
    .replace(/ḷ/g, 'l')
    .replace(/Ū/g, 'Uu')
    .replace(/ū/g, 'uu')
    .replace(/Ī/g, 'Ii')
    .replace(/ī/g, 'ii')
    .replace(/Ā/g, 'Aa')
    .replace(/ā/g, 'aa')
    .replace(/Ṃ/g, 'M')
    .replace(/।/g, '.')
    .replace(/॥/g, '.')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function romanizeHindiWord(word) {
  const syllables = [];

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const next = word[i + 1];

    if (DEVANAGARI_VOWELS[ch]) {
      syllables.push({ type: 'vowel', value: DEVANAGARI_VOWELS[ch], hadInherentA: false });
      continue;
    }

    if (DEVANAGARI_MATRAS[ch]) {
      syllables.push({ type: 'vowel', value: DEVANAGARI_MATRAS[ch], hadInherentA: false });
      continue;
    }

    if (DEVANAGARI_CONSONANTS[ch]) {
      let base = DEVANAGARI_CONSONANTS[ch];
      let cursor = i + 1;

      if (word[cursor] === '़') {
        base = NUKTA_CONSONANTS[ch] || base;
        cursor += 1;
      }

      if (word[cursor] === '्') {
        syllables.push({ type: 'consonant', value: base, hadInherentA: false });
        i = cursor;
        continue;
      }

      if (DEVANAGARI_MATRAS[word[cursor]]) {
        syllables.push({ type: 'consonant', value: base + DEVANAGARI_MATRAS[word[cursor]], hadInherentA: false });
        i = cursor;
        continue;
      }

      syllables.push({ type: 'consonant', value: base + 'a', hadInherentA: true });
      if (word[cursor] === '़') {
        i = cursor - 1;
      }
      continue;
    }

    if (DEVANAGARI_SIGNS[ch]) {
      syllables.push({ type: 'sign', value: DEVANAGARI_SIGNS[ch], hadInherentA: false });
      continue;
    }

    if (ch === '़' || ch === '्') {
      continue;
    }

    syllables.push({ type: 'other', value: ch, hadInherentA: false });
  }

  for (let i = syllables.length - 1; i >= 0; i--) {
    const syllable = syllables[i];
    if (syllable.type === 'sign' || syllable.type === 'other') {
      continue;
    }
    if (syllable.type === 'consonant' && syllable.hadInherentA) {
      syllable.value = syllable.value.slice(0, -1);
    }
    break;
  }

  return syllables.map((entry) => entry.value).join('');
}

function romanizeHindiText(text) {
  if (!text) return text;
  const parts = String(text).split(HTML_TAG_RE);
  const converted = parts.map((part) => {
    if (!part) return part;
    if (part.startsWith('<') && part.endsWith('>')) {
      return part;
    }

    return part.replace(/[\u0900-\u097F]+/g, (word) => romanizeHindiWord(word));
  }).join('');

  return toAsciiRomanized(converted)
    .replace(/\bmaiin\b/g, 'main')
    .replace(/\bnahiin\b/g, 'nahin')
    .replace(/\bkyonki\b/g, 'kyunki')
    .replace(/\bprabhuu\b/g, 'prabhu')
    .replace(/\bparmeshvar\b/g, 'parmeshwar')
    .replace(/\bmasiih\b/g, 'masih')
    .replace(/\bvishwaas\b/g, 'vishwas')
    .replace(/\bsvaasthya\b/g, 'swasthya')
    .replace(/\bgalata\b/g, 'galat')
    .replace(/\bparaajita\b/g, 'parajit')
    .replace(/\baatm[- ]?niyantrita\b/g, 'aatm-niyantrit')
    .replace(/\s+/g, ' ')
    .trim();
}

function deepRomanizeValue(value) {
  if (typeof value === 'string') {
    return romanizeHindiText(value);
  }
  if (Array.isArray(value)) {
    return value.map(deepRomanizeValue);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = deepRomanizeValue(inner);
    }
    return out;
  }
  return value;
}

module.exports = {
  romanizeHindiText,
  deepRomanizeValue,
  toAsciiRomanized
};
