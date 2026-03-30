/**
 * Government Open Source Repository Leaderboard
 *
 * A leaderboard of public GitHub repositories from government
 * organisations worldwide, inspired by the UK Cross-Government OSS Leaderboard:
 * https://www.uk-x-gov-software-community.org.uk/xgov-opensource-repo-scraper/
 *
 * Organisation list sourced from GitHub's official government community registry:
 * https://github.com/github/government.github.com/blob/gh-pages/_data/governments.yml
 *
 * HOW IT WORKS:
 * - On load, fetches pre-cached repo data from /api/repos (Vercel serverless)
 * - The user can filter by country, category, language, sort order, and free-text search
 * - Forks and archived repos are excluded server-side
 */

import { useState, useEffect } from "react";
import { ORGS, COUNTRIES } from "../lib/orgs.js";

/**
 * Lookup: category → country. Used to backfill the `country` field for repos
 * fetched before the field was added to the cron output.
 */
const CATEGORY_TO_COUNTRY = Object.fromEntries(
  ORGS.map((o) => [o.category, o.country])
);

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
  const [phase, setPhase] = useState("loading");
  const [repos, setRepos] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [sortBy, setSortBy] = useState("stars");
  const [filterCountry, setFilterCountry] = useState("All");
  const [filterDomain, setFilterDomain] = useState("all");
  const [filterFn, setFilterFn] = useState("all");
  const [filterLang, setFilterLang] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/repos")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // Backfill `country` for repos fetched before the field existed.
        const repos = data.repos.map((r) => ({
          ...r,
          country: r.country || CATEGORY_TO_COUNTRY[r.category] || r.category,
        }));
        setRepos(repos);
        setLastUpdated(data.lastUpdated);
        setPhase("done");
      })
      .catch((err) => {
        setErrorMsg("Could not load repository data: " + err.message);
        setPhase("fatal");
      });
  }, []);

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------

  /** Unique languages seen across all fetched repos, sorted alphabetically. */
  const langs = ["all"].concat(
    Array.from(new Set(repos.map((r) => r.lang).filter(Boolean))).sort()
  );

  /** Top topics by frequency (capped at 50 to keep dropdown usable). */
  const topicCounts = {};
  for (const r of repos) {
    for (const t of r.topics || []) {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
  }
  const topics = ["all"].concat(
    Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([t]) => t)
      .sort()
  );

  /** Unique domains and functions seen across repos. */
  const domains = ["all"].concat(
    Array.from(new Set(repos.map((r) => r.domain).filter(Boolean))).sort()
  );
  const fns = ["all"].concat(
    Array.from(new Set(repos.map((r) => r.fn).filter(Boolean))).sort()
  );

  const filtered = repos
    .filter((r) => filterCountry === "All" || r.country === filterCountry)
    .filter((r) => filterDomain === "all" || r.domain === filterDomain)
    .filter((r) => filterFn === "all" || r.fn === filterFn)
    .filter((r) => filterLang === "all" || r.lang === filterLang)
    .filter((r) => filterTopic === "all" || (r.topics && r.topics.includes(filterTopic)))
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

  /** Stats derived from the filtered list so they respond to filters. */
  const totalStars = filtered.reduce((s, r) => s + r.stars, 0);
  const countryCount = new Set(filtered.map((r) => r.country).filter(Boolean)).size;
  const filteredLangs = new Set(filtered.map((r) => r.lang).filter(Boolean)).size;

  const isLoading = phase === "loading";

  // ---------------------------------------------------------------------------
  // GOV.UK STYLE HEADER
  // ---------------------------------------------------------------------------

  const Header = () => (
    <header style={{ background: "#0b0c0c", borderBottom: "10px solid #1d70b8" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "10px 15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 24 }}>
          <span style={{ fontWeight: 700 }}>GOV</span>
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
          <a href="https://government.github.com/community/" target="_blank" rel="noreferrer">github/government.github.com</a>{" "}
          covering 67 countries.
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
  // RENDER: FATAL ERROR SCREEN
  // ---------------------------------------------------------------------------

  if (phase === "fatal") {
    return (
      <div>
        <Header />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 15px" }}>
          <div style={{ borderLeft: "5px solid #d4351c", padding: "15px 20px", marginBottom: 30 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#d4351c", marginBottom: 10 }}>There is a problem</h2>
            <p style={{ fontSize: 16, color: "#0b0c0c" }}>{errorMsg}</p>
          </div>
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
          Public repositories from government organisations worldwide on GitHub.
        </p>

        {/* Stats summary */}
        <div style={{ display: "flex", gap: 30, flexWrap: "wrap", marginBottom: 30, padding: "20px 0", borderTop: "1px solid #b1b4b6", borderBottom: "1px solid #b1b4b6" }}>
          {[
            ["Repositories", filtered.length.toLocaleString()],
            ["Total stars", fmtNum(totalStars)],
            ["Countries", String(countryCount)],
            ["Languages", String(filteredLangs)],
            ["Last updated", lastUpdated ? fmtDate(lastUpdated) : "—"],
          ].map(([label, value]) => (
            <div key={label} style={{ minWidth: 100 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#0b0c0c", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 16, color: "#505a5f", marginTop: 5 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 15 }}>Filter repositories</h2>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Search</label>
            <input
              className="govuk-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description"
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ display: "flex", gap: 15, flexWrap: "wrap", alignItems: "flex-end" }}>
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
              <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Country</label>
              <select className="govuk-select" value={filterCountry} onChange={(e) => { setFilterCountry(e.target.value); setFilterCat("All"); }}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c === "All" ? "All countries" : c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Sector</label>
              <select className="govuk-select" value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)}>
                {domains.map((d) => (
                  <option key={d} value={d}>{d === "all" ? "All sectors" : d}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Type</label>
              <select className="govuk-select" value={filterFn} onChange={(e) => setFilterFn(e.target.value)}>
                {fns.map((f) => (
                  <option key={f} value={f}>{f === "all" ? "All types" : f}</option>
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
              <label style={{ display: "block", fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Topic</label>
              <select className="govuk-select" value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}>
                {topics.map((t) => (
                  <option key={t} value={t}>{t === "all" ? "All topics" : t}</option>
                ))}
              </select>
            </div>
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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {repo.license && (
                      <span className="govuk-tag govuk-tag--grey" style={{ fontSize: 12 }}>
                        {repo.license}
                      </span>
                    )}
                    {(repo.topics || []).slice(0, 3).map((t) => (
                      <span key={t} className="govuk-tag govuk-tag--blue" style={{ fontSize: 11, textTransform: "none", letterSpacing: 0 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </td>

                <td style={{ padding: "12px 10px 12px 0" }}>
                  <div style={{ fontSize: 14, color: "#0b0c0c" }}>{repo.org}</div>
                  <div style={{ fontSize: 12, color: "#505a5f", marginTop: 2 }}>{repo.emoji} {repo.country || repo.category}</div>
                  {repo.domain && repo.domain !== "Other" && (
                    <div style={{ fontSize: 11, color: "#1d70b8", marginTop: 2 }}>{repo.domain}{repo.fn && repo.fn !== "Other" ? ` / ${repo.fn}` : ""}</div>
                  )}
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
