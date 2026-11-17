// Outils partagés par l'API du dashboard (Vercel Functions, Node 18+)
const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'iTrame02/capucine-caulliez-studio';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

function secret() {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error('ADMIN_SECRET manquant');
  return s;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + mac;
}

function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

function requireAuth(req, res) {
  const h = req.headers.authorization || '';
  const ok = verify(h.replace(/^Bearer\s+/i, ''));
  if (!ok) { res.status(401).json({ error: 'Session expirée, reconnecte-toi.' }); return false; }
  return true;
}

async function gh(path, opts = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN manquant dans Vercel');
  const r = await fetch('https://api.github.com/repos/' + REPO + path, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error('GitHub ' + r.status + ' : ' + (data.message || text));
  return data;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

function fail(res, e) {
  console.error(e);
  res.status(500).json({ error: e.message || String(e) });
}

module.exports = { REPO, BRANCH, sign, verify, requireAuth, gh, readBody, fail };
