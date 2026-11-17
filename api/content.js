// Lit la version la plus récente de content.json directement sur GitHub
const { requireAuth, gh, BRANCH, fail } = require('./_lib');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const f = await gh('/contents/content.json?ref=' + BRANCH);
    const content = JSON.parse(Buffer.from(f.content, 'base64').toString('utf8'));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ content });
  } catch (e) { fail(res, e); }
};
