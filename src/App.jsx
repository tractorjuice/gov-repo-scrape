/**
 * US Government Open Source Repository Leaderboard
 *
 * A live leaderboard of public GitHub repositories from US government
 * organisations, inspired by the UK Cross-Government OSS Leaderboard:
 * https://www.uk-x-gov-software-community.org.uk/xgov-opensource-repo-scraper/
 *
 * Organisation list sourced from GitHub's official government community registry:
 * https://github.com/github/government.github.com/blob/gh-pages/_data/governments.yml
 *
 * HOW IT WORKS:
 * - On load, the user clicks "Load All Agencies"
 * - The app loops through all 331 US gov GitHub organisations
 * - For each org it calls the GitHub REST API: GET /orgs/{org}/repos
 * - Repos are accumulated into state and rendered live as they arrive
 * - Forks and archived repos are excluded (same approach as the UK tool)
 * - The user can filter by category, language, sort order, and free-text search
 *
 * RATE LIMITS:
 * - Unauthenticated: 60 requests/hour — covers roughly 60 orgs
 * - With a Personal Access Token (no scopes needed): 5,000 requests/hour
 * - Token is passed in the Authorization header; never stored anywhere
 *
 * TO RUN LOCALLY:
 *   npm create vite@latest us-gov-oss -- --template react
 *   cd us-gov-oss
 *   npm install
 *   # Replace src/App.jsx with this file
 *   npm run dev
 *
 * SUGGESTED NEXT STEPS FOR CLAUDE CODE:
 * - Add a GitHub Actions workflow that runs nightly, fetches all repo data,
 *   and saves it to a static JSON file (avoids rate limits for end users)
 * - Add charts: stars by category, most active languages, top agencies
 * - Add pagination so all results are browsable, not just top 300
 * - Expand to include UK, Canadian, Australian orgs from the same governments.yml
 * - Add a "last updated" timestamp and stale-data warning
 * - Deploy as a static site to GitHub Pages or Cloudflare Pages
 */

import { useState, useEffect, useRef } from "react";
import { ORGS, CATEGORIES } from "../lib/orgs.js";

/**
 * GitHub's language colour palette, used to render the coloured dot next to
 * each repo's primary language. Colours sourced from:
 * https://github.com/ozh/github-colors
 */
const LANG_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#2b7489",
  Python: "#3572A5",
  Ruby: "#701516",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Shell: "#89e051",
  Rust: "#dea584",
  CSS: "#563d7c",
  HTML: "#e34c26",
  "C#": "#178600",
  "Jupyter Notebook": "#DA5B0B",
  R: "#198CE7",
  Dockerfile: "#384d54",
  Fortran: "#4d41b1",
  MATLAB: "#e16737",
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Format a number: values >= 1000 are shown as e.g. "1.2k". */
function fmtNum(n) {
  if (!n) return "0";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

/** Format an ISO date string to a short human-readable form e.g. "Mar 21, 2025". */
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// ROOT COMPONENT
// ---------------------------------------------------------------------------

export default function App() {
  // -- App phase ------------------------------------------------------------
  // Controls which screen is shown. One of:
  //   "welcome"  - landing page, user hasn't started loading yet
  //   "loading"  - actively fetching repos from the GitHub API
  //   "done"     - all orgs fetched (or rate limited), table is browsable
  //   "fatal"    - first API call failed completely (e.g. network blocked)
  const [phase, setPhase] = useState("welcome");

  // -- Fetched data ---------------------------------------------------------
  // Flat array of repo objects. Grows in real time as each org is fetched.
  // Each object shape is documented in the fetch loop below.
  const [repos, setRepos] = useState([]);

  // -- Loading progress -----------------------------------------------------
  const [orgIndex, setOrgIndex] = useState(0);   // how many orgs processed so far
  const [orgName, setOrgName] = useState("");     // name of the org currently being fetched

  // -- Error state ----------------------------------------------------------
  const [fatalMsg, setFatalMsg] = useState("");         // shown on the fatal error screen
  const [rateLimitedAt, setRateLimitedAt] = useState(null); // org index at which rate limit hit

  // -- Auth -----------------------------------------------------------------
  const [token, setToken] = useState(import.meta.env.VITE_GITHUB_TOKEN || "");
  const [showToken, setShowToken] = useState(false);

  // -- Filters & sort -------------------------------------------------------
  const [sortBy, setSortBy] = useState("stars");      // "stars" | "forks" | "issues" | "updated"
  const [filterCat, setFilterCat] = useState("All");  // category filter
  const [filterLang, setFilterLang] = useState("all"); // language filter
  const [search, setSearch] = useState("");            // free-text search

  // ---------------------------------------------------------------------------
  // FETCH LOGIC
  // ---------------------------------------------------------------------------

  /**
   * Main data loading function. Called when the user clicks "Load All Agencies".
   *
   * Strategy:
   * - Loops through all entries in ORGS sequentially (one request per org)
   * - Fetches up to 100 repos per org, sorted by stars descending
   * - Excludes forks and archived repos to match the UK leaderboard's approach
   * - Calls setRepos() after each org so the table updates in real time
   * - Sleeps 100ms between requests to be polite to the API
   * - Stops and sets rateLimitedAt if GitHub returns 403 or 429
   * - Sets phase "fatal" if the very first request fails at the network level
   *   (which happens when running inside the Claude.ai sandbox)
   */
  async function startLoading() {
    setPhase("loading");
    setRepos([]);
    setOrgIndex(0);
    setFatalMsg("");
    setRateLimitedAt(null);

    const headers = { Accept: "application/vnd.github+json" };
    if (token.trim()) {
      headers["Authorization"] = "Bearer " + token.trim();
    }

    const BATCH_SIZE = token.trim() ? 10 : 3;
    const accumulated = [];
    let rateLimited = false;

    for (let i = 0; i < ORGS.length; i += BATCH_SIZE) {
      if (rateLimited) break;

      const batch = ORGS.slice(i, i + BATCH_SIZE);
      setOrgIndex(i + batch.length);
      setOrgName(batch.map((o) => o.name).join(", "));

      const results = await Promise.allSettled(
        batch.map((org) =>
          fetch(
            "https://api.github.com/orgs/" + org.name + "/repos?type=public&per_page=100&sort=stars",
            { headers }
          ).then(async (res) => ({ res, org }))
        )
      );

      for (const result of results) {
        if (result.status === "rejected") {
          // Network failure on the very first batch → fatal
          if (i === 0 && accumulated.length === 0) {
            setFatalMsg(
              "Could not reach api.github.com — " + result.reason.message +
              "\n\nTo use this app, run it locally with: npm run dev"
            );
            setPhase("fatal");
            return;
          }
          continue;
        }

        const { res, org } = result.value;

        if (res.status === 403 || res.status === 429) {
          setRateLimitedAt(i);
          rateLimited = true;
          continue;
        }

        if (!res.ok) continue;

        let data;
        try { data = await res.json(); } catch { continue; }

        if (Array.isArray(data)) {
          for (const r of data) {
            if (r.fork === false && r.archived === false) {
              accumulated.push({
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
                emoji: org.emoji,
              });
            }
          }
        }
      }

      setRepos(accumulated.slice());
    }

    setPhase("done");
  }

  // Auto-load on mount
  const hasStarted = useRef(false);
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      startLoading();
    }
  }, []);

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------

  /** Unique languages seen across all fetched repos, sorted alphabetically. */
  const langs = ["all"].concat(
    Array.from(new Set(repos.map((r) => r.lang).filter(Boolean))).sort()
  );

  /**
   * Filtered and sorted repo list for the table.
   * Filtering happens in sequence: category → language → text search.
   * Limited to 300 rows in the render to keep the DOM manageable.
   */
  const filtered = repos
    .filter((r) => filterCat === "All" || r.category === filterCat)
    .filter((r) => filterLang === "all" || r.lang === filterLang)
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "stars")   return b.stars - a.stars;
      if (sortBy === "forks")   return b.forks - a.forks;
      if (sortBy === "issues")  return b.issues - a.issues;
      return new Date(b.updated) - new Date(a.updated);
    });

  /** Running total of stars across all fetched repos (shown in stats bar). */
  const totalStars = repos.reduce((s, r) => s + r.stars, 0);

  /** Progress bar percentage (0–100). */
  const progress = Math.round((orgIndex / ORGS.length) * 100);

  const isLoading = phase === "loading";

  // ---------------------------------------------------------------------------
  // GOV.UK STYLE HEADER
  // ---------------------------------------------------------------------------

  const Header = () => (
    <header style={{ background: "#0b0c0c", borderBottom: "10px solid #1d70b8" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "10px 15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 24 }}>
          <span style={{ fontWeight: 700 }}>US.GOV</span>
          <span style={{ fontWeight: 400, marginLeft: 5, fontSize: 16, color: "#a0a0a0" }}>Open Source</span>
        </a>
        <span style={{ color: "#fff", fontSize: 14 }}>
          <strong style={{ color: "#fd0" }}>BETA</strong>
        </span>
      </div>
    </header>
  );

  // ---------------------------------------------------------------------------
  // GOV.UK STYLE FOOTER
  // ---------------------------------------------------------------------------

  const Footer = () => (
    <footer style={{ background: "#f3f2f1", borderTop: "1px solid #b1b4b6", marginTop: 40 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "25px 15px 15px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, color: "#0b0c0c" }}>About this service</h2>
        <p style={{ fontSize: 14, color: "#505a5f", lineHeight: 1.6, marginBottom: 15 }}>
          Organisation list sourced from{" "}
          <a href="https://government.github.com/community/" target="_blank" rel="noreferrer">github/government.github.com</a>.
          {" "}Inspired by the{" "}
          <a href="https://www.uk-x-gov-software-community.org.uk/xgov-opensource-repo-scraper/" target="_blank" rel="noreferrer">UK Cross-Gov OSS Leaderboard</a>.
        </p>
        <div style={{ borderTop: "1px solid #b1b4b6", paddingTop: 15, fontSize: 14, color: "#505a5f" }}>
          Built with data from the GitHub API
        </div>
      </div>
    </footer>
  );

  // ---------------------------------------------------------------------------
  // RENDER: WELCOME SCREEN (brief splash while autoload begins)
  // ---------------------------------------------------------------------------

  if (phase === "welcome") {
    return (
      <div>
        <Header />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 15px", textAlign: "center" }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 10 }}>Open Source Repository Leaderboard</h1>
          <p style={{ fontSize: 19, color: "#505a5f" }}>Loading repositories from {ORGS.length} US government organisations...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: FATAL ERROR SCREEN
  // ---------------------------------------------------------------------------

  if (phase === "fatal") {
    return (
      <div>
        <Header />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 15px" }}>
          <div style={{ borderLeft: "5px solid #d4351c", padding: "15px 20px", marginBottom: 30 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#d4351c", marginBottom: 10 }}>There is a problem</h2>
            <p style={{ fontSize: 16, color: "#0b0c0c", marginBottom: 10 }}>GitHub API could not be reached.</p>
            <pre style={{ fontSize: 14, color: "#505a5f", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
              {fatalMsg}
            </pre>
          </div>
          <button className="govuk-btn govuk-btn--secondary" onClick={startLoading}>
            Try again
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN LEADERBOARD
  // ---------------------------------------------------------------------------

  return (
    <div>
      <Header />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 15px 0" }}>

        {/* Phase banner */}
        <div style={{ borderBottom: "1px solid #b1b4b6", padding: "10px 0", marginBottom: 30, display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
          <strong className="govuk-tag govuk-tag--blue" style={{ fontSize: 12 }}>BETA</strong>
          <span style={{ color: "#505a5f" }}>
            This is a new service. Data is fetched live from the GitHub API.
          </span>
        </div>

        {/* Page heading */}
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 10 }}>
          Open Source Repository Leaderboard
        </h1>
        <p style={{ fontSize: 19, color: "#505a5f", marginBottom: 30 }}>
          Public repositories from {ORGS.length} US government organisations on GitHub.
        </p>

        {/* Stats summary */}
        <div style={{ display: "flex", gap: 30, flexWrap: "wrap", marginBottom: 30, padding: "20px 0", borderTop: "1px solid #b1b4b6", borderBottom: "1px solid #b1b4b6" }}>
          {[
            ["Organisations", orgIndex + " of " + ORGS.length],
            ["Repositories", repos.length.toLocaleString()],
            ["Total stars", fmtNum(totalStars)],
            ["Languages", String(langs.length - 1)],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#0b0c0c", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 16, color: "#505a5f", marginTop: 5 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar — only shown while loading */}
        {isLoading && (
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: 14, color: "#505a5f", marginBottom: 5 }}>
              Fetching: {orgName}
            </div>
            <div style={{ width: "100%", height: 8, background: "#f3f2f1" }}>
              <div style={{ width: progress + "%", height: "100%", background: "#1d70b8", transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 14, color: "#505a5f", marginTop: 5 }}>
              {progress}% complete — {orgIndex} of {ORGS.length} organisations — {repos.length} repositories found
            </div>
          </div>
        )}

        {/* Rate limit warning */}
        {rateLimitedAt !== null && (
          <div style={{ borderLeft: "5px solid #f47738", padding: "15px 20px", marginBottom: 30, background: "#fef7f1" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 5 }}>Rate limit reached</h3>
            <p style={{ fontSize: 16, color: "#0b0c0c", margin: "0 0 10px" }}>
              Showing partial results ({rateLimitedAt} of {ORGS.length} organisations). Add a GitHub personal access token below and reload for complete data.
            </p>
            <button className="govuk-btn govuk-btn--secondary" onClick={startLoading}>Reload data</button>
          </div>
        )}

        {/* Filters */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 15 }}>Filter repositories</h2>
          <div style={{ display: "flex", gap: 15, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Search</label>
              <input
                className="govuk-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or description"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Sort by</label>
              <select className="govuk-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="stars">Stars</option>
                <option value="forks">Forks</option>
                <option value="issues">Open issues</option>
                <option value="updated">Last updated</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Category</label>
              <select className="govuk-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Language</label>
              <select className="govuk-select" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
                {langs.map((l) => (
                  <option key={l} value={l}>{l === "all" ? "All languages" : l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>GitHub token</label>
              <input
                className="govuk-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                type="password"
                style={{ width: 180 }}
              />
            </div>
            <button className="govuk-btn govuk-btn--secondary" onClick={startLoading}>
              Reload
            </button>
          </div>
        </div>

        {/* Result count */}
        <p style={{ fontSize: 16, color: "#505a5f", marginBottom: 15 }}>
          Showing <strong>{Math.min(filtered.length, 300).toLocaleString()}</strong> of{" "}
          <strong>{filtered.length.toLocaleString()}</strong> repositories
        </p>

        {/* Repo table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16, marginBottom: 30 }}>
          <thead>
            <tr>
              {[
                ["#", "right", 40],
                ["Repository", "left", undefined],
                ["Organisation", "left", 160],
                ["Language", "left", 110],
                ["Stars", "right", 70],
                ["Forks", "right", 70],
                ["Issues", "right", 70],
                ["Updated", "left", 120],
              ].map(([label, align, w]) => (
                <th key={label} style={{
                  padding: "12px 10px 12px 0",
                  textAlign: align,
                  fontWeight: 700,
                  fontSize: 16,
                  borderBottom: "2px solid #0b0c0c",
                  color: "#0b0c0c",
                  width: w,
                }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((repo, idx) => (
              <tr key={repo.id} className="repo-row" style={{ borderBottom: "1px solid #b1b4b6" }}>
                <td style={{ padding: "12px 10px 12px 0", textAlign: "right", fontWeight: 700, color: idx < 3 ? "#1d70b8" : "#505a5f", fontSize: 16 }}>
                  {idx + 1}
                </td>

                <td style={{ padding: "12px 10px 12px 0" }}>
                  <a href={repo.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 16 }}>
                    {repo.name}
                  </a>
                  {repo.desc && (
                    <div style={{ color: "#505a5f", fontSize: 14, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>
                      {repo.desc}
                    </div>
                  )}
                  {repo.license && (
                    <span className="govuk-tag govuk-tag--grey" style={{ marginTop: 4, fontSize: 12 }}>
                      {repo.license}
                    </span>
                  )}
                </td>

                <td style={{ padding: "12px 10px 12px 0" }}>
                  <div style={{ fontSize: 14, color: "#0b0c0c" }}>{repo.org}</div>
                  <div style={{ fontSize: 12, color: "#505a5f", marginTop: 2 }}>{repo.category}</div>
                </td>

                <td style={{ padding: "12px 10px 12px 0" }}>
                  {repo.lang && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: LANG_COLORS[repo.lang] || "#505a5f", flexShrink: 0 }} />
                      <span style={{ color: "#0b0c0c", fontSize: 14 }}>{repo.lang}</span>
                    </span>
                  )}
                </td>

                <td style={{ padding: "12px 10px 12px 0", textAlign: "right", fontSize: 16, fontWeight: repo.stars > 500 ? 700 : 400, color: "#0b0c0c" }}>
                  {fmtNum(repo.stars)}
                </td>

                <td style={{ padding: "12px 10px 12px 0", textAlign: "right", fontSize: 16, color: "#505a5f" }}>
                  {fmtNum(repo.forks)}
                </td>

                <td style={{ padding: "12px 10px 12px 0", textAlign: "right", fontSize: 16, color: "#505a5f" }}>
                  {fmtNum(repo.issues)}
                </td>

                <td style={{ padding: "12px 10px 12px 0", fontSize: 14, color: "#505a5f", whiteSpace: "nowrap" }}>
                  {fmtDate(repo.updated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty states */}
        {repos.length === 0 && isLoading && (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#505a5f", fontSize: 19 }}>
            Loading repositories...
          </p>
        )}

        {repos.length === 0 && !isLoading && (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#505a5f", fontSize: 19 }}>
            No repositories found. The API may be unreachable or all organisations returned empty results.
          </p>
        )}

        {filtered.length > 300 && (
          <p style={{ textAlign: "center", padding: "15px 0", color: "#505a5f", fontSize: 14, borderTop: "1px solid #b1b4b6" }}>
            Showing top 300 of {filtered.length.toLocaleString()} results. Refine your search to see more.
          </p>
        )}
      </div>
      <Footer />
    </div>
  );
}
