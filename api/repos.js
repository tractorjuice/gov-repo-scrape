import { head } from "@vercel/blob";

const BLOB_NAMES = ["repos-0.json", "repos-1.json"];

async function readBlob(name) {
  try {
    const info = await head(name);
    const res = await fetch(info.url);
    return await res.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Try partitioned blobs first, fall back to single blob.
    const parts = await Promise.all(BLOB_NAMES.map(readBlob));
    const hasParts = parts.some((p) => p !== null);

    let data;
    if (hasParts) {
      const allRepos = parts.flatMap((p) => (p ? p.repos : []));
      const lastUpdated = parts
        .filter(Boolean)
        .map((p) => p.lastUpdated)
        .sort()
        .pop();
      data = JSON.stringify({ lastUpdated, repos: allRepos });
    } else {
      // Fall back to legacy single blob.
      const legacy = await readBlob("repos.json");
      if (!legacy) {
        return res
          .status(503)
          .setHeader("Cache-Control", "no-store")
          .json({ error: "Data not yet available. Run the cron job to seed initial data." });
      }
      data = JSON.stringify(legacy);
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(data);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to read cached data",
      detail: err.message,
    });
  }
}
