// File: api/submissions.js
import { Octokit } from "@octokit/rest";

const repoOwner = "SkellyRen"; // GitHub username (case-sensitive)
const repoName = "Discord-Game-Night"; // Your repo name
const filePath = "submissions.csv"; // Path to the CSV in the repo

/**
 * Helper function to count votes in a semicolon-delimited field
 */
function countVotes(entries, field) {
  const counts = {};
  for (const entry of entries) {
    const values = (entry[field] || "").split(";").map(s => s.trim());
    for (const val of values) {
      if (!val) continue;
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return counts;
}

export default async function handler(req, res) {
  const octokit = new Octokit({
    auth: process.env.GH_ISSUE_TOKEN // Set in Vercel or .env.local
  });

  try {
    // Get CSV file content
    const { data: file } = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: filePath
    });

    const csvContent = Buffer.from(file.content, 'base64').toString('utf8');
    const lines = csvContent.trim().split('\n');

    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const entries = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      return headers.reduce((obj, header, idx) => {
        obj[header] = values[idx] || "";
        return obj;
      }, {});
    });

    const stats = {
      topPlatforms: countVotes(entries, "Platforms"),
      topFreeGames: countVotes(entries, "Free"),
      topPaidGames: countVotes(entries, "Paid"),
      topNights: countVotes(entries, "Nights")
    };

    res.status(200).json({ submissions: entries, stats });
  } catch (error) {
    console.error("Error loading submissions:", error);
    res.status(500).json({ error: "Could not load submissions." });
  }
}
