// File: api/submissions.js
import { Octokit } from "@octokit/rest";

const repoOwner = "SkellyRen"; // GitHub username (case-sensitive)
const repoName = "Discord-Game-Night"; // Your repo name
const filePath = "submissions.csv"; // Path to the CSV in the repo

/**
 * Parse a CSV string into objects, handling quoted values with commas.
 */
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));

  const entries = lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        current += '"'; i++; // escaped quote
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current); // add last field

    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || "";
      return obj;
    }, {});
  });

  return entries;
}

/**
 * Count semicolon-delimited votes in a field.
 */
function countVotes(entries, field) {
  const counts = {};
  for (const entry of entries) {
    const values = (entry[field] || "").split(';').map(v => v.trim());
    for (const val of values) {
      if (!val) continue;
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return counts;
}

export default async function handler(req, res) {
  const octokit = new Octokit({
    auth: process.env.GH_ISSUE_TOKEN
  });

  try {
    const { data: file } = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: filePath
    });

    const csvContent = Buffer.from(file.content, 'base64').toString('utf8');
    const entries = parseCSV(csvContent);

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
