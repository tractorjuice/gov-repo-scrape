import { put, head } from "@vercel/blob";
import { ORGS } from "../../lib/orgs.js";

export const config = {
  maxDuration: 300,
};

function getNextPageUrl(linkHeader) {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function fetchOrgRepos(org, headers) {
  const repos = [];
  let url = `https://api.github.com/orgs/${org.name}/repos?type=public&per_page=100&sort=stars`;

  while (url) {
    const res = await fetch(url, { headers });

    if (res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")) {
      return { repos, rateLimited: true };
    }
    if (res.status === 403) {
      // Org-level permission issue, not a global rate limit — skip this org.
      return { repos, rateLimited: false };
    }
    if (!res.ok) return { repos, rateLimited: false };

    const data = await res.json();
    if (Array.isArray(data)) {
      for (const r of data) {
        if (r.fork === false && r.archived === false) {
          repos.push({
            id: r.id,
            name: r.name,
            url: r.html_url,
            desc: r.description || "",
            stars: r.stargazers_count || 0,
            forks: r.forks_count || 0,
            issues: r.open_issues_count || 0,
            lang: r.language || null,
            updated: r.pushed_at || null,
            license: r.license ? r.license.spdx_id : null,
            org: org.name,
            category: org.category,
            country: org.country,
            emoji: org.emoji,
          });
        }
      }
    }

    url = getNextPageUrl(res.headers.get("link"));
  }

  return { repos, rateLimited: false };
}

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).send("Unauthorized");
  }

  const startTime = Date.now();
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GH_TOKEN}`,
  };

  const BATCH_SIZE = 20;
  const TIME_LIMIT_MS = 270_000; // stop fetching at 270s, leaving 30s to write blob

  // Resume support: read existing blob and skip orgs already fetched.
  let existingRepos = [];
  let existingOrgs = new Set();
  try {
    const blobInfo = await head("repos.json");
    const blobRes = await fetch(blobInfo.url);
    const existing = await blobRes.json();
    if (Array.isArray(existing.repos)) {
      existingRepos = existing.repos;
      existingOrgs = new Set(existingRepos.map((r) => r.org));
    }
  } catch {
    // No existing data — start fresh.
  }

  const remainingOrgs = ORGS.filter((o) => !existingOrgs.has(o.name));
  const newRepos = [];
  let rateLimitedAt = null;
  let orgsProcessed = existingOrgs.size;
  let timedOut = false;

  for (let i = 0; i < remainingOrgs.length; i += BATCH_SIZE) {
    if (rateLimitedAt !== null) break;
    if (Date.now() - startTime > TIME_LIMIT_MS) {
      timedOut = true;
      break;
    }

    const batch = remainingOrgs.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((org) => fetchOrgRepos(org, headers))
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        const { repos, rateLimited } = results[j].value;
        newRepos.push(...repos);
        if (rateLimited) {
          rateLimitedAt = i + j;
          break;
        }
      }
    }

    orgsProcessed = existingOrgs.size + Math.min(i + batch.length, remainingOrgs.length);
  }

  const allRepos = [...existingRepos, ...newRepos];

  const payload = {
    lastUpdated: new Date().toISOString(),
    repos: allRepos,
    ...(rateLimitedAt !== null && { rateLimitedAt }),
    ...(timedOut && { timedOut: true }),
  };

  try {
    await put("repos.json", JSON.stringify(payload), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to write to Blob",
      detail: err.message,
    });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  return res.status(200).json({
    orgs: orgsProcessed,
    totalOrgs: ORGS.length,
    repos: allRepos.length,
    rateLimitedAt,
    timedOut,
    duration: `${duration}s`,
  });
}
