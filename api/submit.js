// File: api/submit.js

import { Octokit } from "@octokit/rest";

const repoOwner = "skellyren";
const repoName = "Discord-Game-Night";
const filePath = "submissions.csv";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    name = "",
    nights = [],
    timezone = [],
    platforms = [],
    subs = [],
    free = [],
    paid = [],
    notes = ""
  } = req.body;

  const newRow = `"${name}","${nights.join(";")}","${timezone.join(";")}","${platforms.join(";")}","${subs.join(";")}","${free.join(";")}","${paid.join(";")}","${notes.replace(/\n/g, ' ')}"\n`;

  const octokit = new Octokit({ auth: process.env.GH_ISSUE_TOKEN });

  try {
    // Get latest commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner: repoOwner,
      repo: repoName,
      ref: "heads/main"
    });

    const latestCommitSha = refData.object.sha;

    const { data: commitData } = await octokit.git.getCommit({
      owner: repoOwner,
      repo: repoName,
      commit_sha: latestCommitSha
    });

    const baseTree = commitData.tree.sha;

    // Try reading the existing CSV
    let currentContent = "Name,Nights,Timezone,Platforms,Subs,Free,Paid,Notes\n"; // default if missing
    let currentSha = null;

    try {
      const { data: file } = await octokit.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: filePath
      });

      currentContent = Buffer.from(file.content, "base64").toString("utf8");
      currentSha = file.sha;
    } catch (err) {
      if (err.status !== 404) throw err; // Only ignore file-not-found
    }

    const updatedContent = currentContent + newRow;

    await octokit.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
      message: `Add submission from ${name}`,
      content: Buffer.from(updatedContent).toString("base64"),
      sha: currentSha || undefined,
      branch: "main"
    });

    res.status(200).json({ message: "Submission saved!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save submission." });
  }
}
