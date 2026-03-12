const express = require('express');
const fs = require('fs');
const path = require('path');
const { createClerkClient } = require('@clerk/backend');
const User = require('../models/User');
const { requireAuth } = require('../middleware/clerkAuth');

const router = express.Router();

const APP_ROOT = path.resolve(__dirname, '../../..');
const DRAFT_ROOT = path.join(APP_ROOT, 'content-maker', 'drafts');
const ALLOWED_EMAILS = new Set(['michaelfackerell@gmail.com']);
const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

fs.mkdirSync(DRAFT_ROOT, { recursive: true });

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function safeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `draft-${Date.now()}`;
}

function readDraftFile(slug) {
  const filePath = path.join(DRAFT_ROOT, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeDraftFile(payload) {
  const slug = safeSlug(payload.slug || payload.title);
  const filePath = path.join(DRAFT_ROOT, `${slug}.json`);
  const now = new Date().toISOString();
  const existing = readDraftFile(slug);
  const documentPayload = {
    slug,
    title: String(payload.title || '').trim(),
    metaDescription: String(payload.metaDescription || '').trim(),
    audience: String(payload.audience || '').trim(),
    cluster: String(payload.cluster || '').trim(),
    searchIntent: String(payload.searchIntent || '').trim(),
    keyword: String(payload.keyword || '').trim(),
    cta: String(payload.cta || '').trim(),
    productAngle: String(payload.productAngle || '').trim(),
    imageConcept: String(payload.imageConcept || '').trim(),
    status: String(payload.status || existing?.status || 'draft').trim(),
    body: String(payload.body || '').trim(),
    suggestedInternalLinks: normalizeList(payload.suggestedInternalLinks),
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    notes: String(payload.notes || '').trim(),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  fs.writeFileSync(filePath, JSON.stringify(documentPayload, null, 2));
  return documentPayload;
}

async function getAuthorizedEmail(req, user) {
  const dbEmail = user?.email ? String(user.email).toLowerCase() : null;
  if (dbEmail) {
    return dbEmail;
  }

  const sessionEmail = req.auth?.session?.email ? String(req.auth.session.email).toLowerCase() : null;
  if (sessionEmail) {
    return sessionEmail;
  }

  if (clerkClient && req.auth?.userId) {
    try {
      const clerkUser = await clerkClient.users.getUser(req.auth.userId);
      const primaryEmailId = clerkUser?.primaryEmailAddressId || null;
      const primary = Array.isArray(clerkUser?.emailAddresses)
        ? clerkUser.emailAddresses.find((entry) => entry.id === primaryEmailId) || clerkUser.emailAddresses[0]
        : null;
      if (primary?.emailAddress) {
        return String(primary.emailAddress).toLowerCase();
      }
    } catch (err) {
      console.warn('Could not resolve Clerk user email for content-maker:', err.message);
    }
  }

  return null;
}

async function requireContentMakerAdmin(req, res, next) {
  try {
    await requireAuth(req, res, async function onAuthorized() {
      const user = await User.findOne({ clerkId: req.auth.userId }).select('email username').lean();
      const email = await getAuthorizedEmail(req, user);

      if (!email || !ALLOWED_EMAILS.has(email)) {
        return res.status(403).json({ error: 'Not authorized for content-maker' });
      }

      req.contentMakerUser = {
        email,
        username: user?.username || null,
        clerkId: req.auth.userId
      };

      next();
    });
  } catch (err) {
    console.error('Content maker auth error:', err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

function buildStarterDraft(input) {
  const audience = String(input.audience || '').trim();
  const keyword = String(input.keyword || '').trim();
  const searchIntent = String(input.searchIntent || '').trim();
  const articleAngle = String(input.articleAngle || '').trim();
  const productAngle = String(input.productAngle || '').trim();
  const cta = String(input.cta || '').trim();
  const sources = Array.isArray(input.sources) ? input.sources : [];
  const title = String(input.title || '').trim() || `Draft: ${keyword || audience || 'New Article'}`;
  const slug = safeSlug(input.slug || keyword || title);

  const body = [
    `# ${title}`,
    '',
    `## Audience`,
    audience || 'TBD',
    '',
    `## Search Intent`,
    searchIntent || 'TBD',
    '',
    `## Angle`,
    articleAngle || 'TBD',
    '',
    `## Why This Matters`,
    `Write a concrete opening that explains the problem for ${audience || 'the reader'} and why this topic matters now.`,
    '',
    `## What Missions Leaders Should Evaluate`,
    '- access constraints',
    '- device realities',
    '- group context',
    '- leadership effort required',
    '- whether the tool strengthens real discipleship rather than replacing it',
    '',
    `## Where VerseBattles Fits`,
    productAngle || 'Describe the real product fit here.',
    '',
    `## Where VerseBattles Does Not Fit`,
    'State honest constraints, especially around connectivity, device access, and local implementation realities.',
    '',
    `## Implementation Guidance`,
    'Add a rollout checklist for local leaders, teachers, or ministry teams.',
    '',
    `## CTA`,
    cta || 'Add the next step.',
    '',
    `## Source Notes`,
    ...sources.map((source) => `- ${source.title || source.url || 'Source'}${source.url ? ` - ${source.url}` : ''}`)
  ].join('\n');

  return {
    slug,
    title,
    metaDescription: String(input.metaDescription || '').trim(),
    audience,
    cluster: String(input.cluster || '').trim(),
    searchIntent,
    keyword,
    cta,
    productAngle,
    imageConcept: String(input.imageConcept || '').trim(),
    status: 'draft',
    body,
    suggestedInternalLinks: normalizeList(input.suggestedInternalLinks),
    sources,
    notes: String(input.notes || '').trim()
  };
}

router.get('/session', requireContentMakerAdmin, async (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.json({
    authorized: true,
    user: req.contentMakerUser
  });
});

router.get('/drafts', requireContentMakerAdmin, async (req, res) => {
  const drafts = fs.readdirSync(DRAFT_ROOT)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const draft = JSON.parse(fs.readFileSync(path.join(DRAFT_ROOT, file), 'utf8'));
      return {
        slug: draft.slug,
        title: draft.title,
        audience: draft.audience,
        cluster: draft.cluster,
        status: draft.status,
        updatedAt: draft.updatedAt
      };
    })
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.json({ drafts });
});

router.get('/drafts/:slug', requireContentMakerAdmin, async (req, res) => {
  const draft = readDraftFile(req.params.slug);
  if (!draft) {
    return res.status(404).json({ error: 'Draft not found' });
  }
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.json({ draft });
});

router.post('/generate-starter', requireContentMakerAdmin, async (req, res) => {
  const draft = buildStarterDraft(req.body || {});
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.json({ draft });
});

router.post('/drafts', requireContentMakerAdmin, async (req, res) => {
  const payload = req.body || {};
  if (!payload.title || !payload.body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const draft = writeDraftFile(payload);
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.json({ draft });
});

module.exports = router;
