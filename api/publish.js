// Publie content.json + les nouvelles images en un seul commit : Vercel remet le site en ligne tout seul
const { requireAuth, gh, readBody, BRANCH, fail } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' });
  if (!requireAuth(req, res)) return;
  try {
    const { content, files = [] } = await readBody(req);
    if (!content || !Array.isArray(content.photos) || !Array.isArray(content.series)) {
      return res.status(400).json({ error: 'Contenu invalide, rien n\'a été publié.' });
    }
    const ref = await gh('/git/ref/heads/' + BRANCH);
    const head = await gh('/git/commits/' + ref.object.sha);
    const tree = [{ path: 'content.json', mode: '100644', type: 'blob', content: JSON.stringify(content, null, 1) + '\n' }];
    for (const f of files) {
      if (!/^images\/up\/[\w.-]+\.(webp|jpg)$/.test(f.path) || !/^[0-9a-f]{40}$/.test(f.sha)) continue;
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: f.sha });
    }
    const newTree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
    const commit = await gh('/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message: 'Mise à jour depuis le dashboard', tree: newTree.sha, parents: [ref.object.sha] }),
    });
    await gh('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
    res.status(200).json({ ok: true, commit: commit.sha });
  } catch (e) { fail(res, e); }
};
