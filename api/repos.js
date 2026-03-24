import { head } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let blobInfo;
    try {
      blobInfo = await head("repos.json");
    } catch {
      return res
        .status(503)
        .setHeader("Cache-Control", "no-store")
        .json({ error: "Data not yet available. Run the cron job to seed initial data." });
    }

    const blobRes = await fetch(blobInfo.url);
    const data = await blobRes.text();

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
