export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const submission = req.body;
  console.log('Received submission:', submission);

  // TODO: Save to DB, send Discord webhook, etc.
  return res.status(200).json({ message: 'Submission received!' });
}
