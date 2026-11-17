// Envoie une image sur GitHub (sans la publier) et renvoie son identifiant
const { requireAuth, gh, readBody, fail } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' });
  if (!requireAuth(req, res)) return;
  try {
    const { data } = await readBody(req);
    if (!data || typeof data !== 'string') return res.status(400).json({ error: 'Image manquante.' });
    if (data.length > 4_000_000) return res.status(413).json({ error: 'Image trop lourde.' });
    const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: data, encoding: 'base64' }) });
    res.status(200).json({ sha: blob.sha });
  } catch (e) { fail(res, e); }
};
