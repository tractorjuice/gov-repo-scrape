// ---------------------------------------------------------------------------
// Keyword-based repo classifier.
// Assigns a domain (what sector) and a function (what kind of software).
// ---------------------------------------------------------------------------

const DOMAIN_RULES = [
  { domain: "Healthcare", keywords: ["health", "medical", "clinical", "hospital", "patient", "cdc", "fda", "nih", "vaccine", "disease", "epidemiol", "pharma", "drug", "hhs", "medicare", "medicaid", "genomic", "biomedic"] },
  { domain: "Defence", keywords: ["military", "defense", "defence", "army", "navy", "airforce", "air-force", "dod", "missile", "weapon", "combat", "warfight", "tactical", "veteran"] },
  { domain: "Education", keywords: ["education", "school", "student", "university", "learning", "curriculum", "academic", "teach", "classroom", "course"] },
  { domain: "Environment", keywords: ["environment", "climate", "weather", "ocean", "atmospher", "ecology", "pollution", "epa", "noaa", "forest", "wildlife", "conservation", "emission", "sustainab", "water-quality", "biodiversity"] },
  { domain: "Geospatial", keywords: ["gis", "geospatial", "mapping", "geographic", "spatial", "coordinate", "geodata", "lidar", "satellite", "raster", "shapefile", "cartograph", "topograph", "remote-sensing"] },
  { domain: "Finance", keywords: ["finance", "fiscal", "budget", "tax", "treasury", "economic", "banking", "monetary", "accounting", "revenue", "expenditure", "procurement"] },
  { domain: "Transport", keywords: ["transport", "transit", "traffic", "highway", "road", "aviation", "faa", "vehicle", "freight", "railway", "railroad", "dot-", "usdot"] },
  { domain: "Cybersecurity", keywords: ["security", "cyber", "vulnerab", "malware", "encrypt", "firewall", "nsa", "cisa", "intrusion", "threat", "incident-response", "pentest", "cve"] },
  { domain: "Science", keywords: ["science", "research", "nasa", "laborator", "physics", "chemistry", "biology", "genome", "astro", "seismic", "geological", "hydrology", "meteorolog"] },
  { domain: "Legal", keywords: ["law", "legal", "justice", "court", "regulat", "compliance", "judicial", "statute", "legislation", "enforcement"] },
  { domain: "Agriculture", keywords: ["agricultur", "farm", "crop", "soil", "usda", "livestock", "irrigation", "forestry", "pest", "grain", "food-safety"] },
  { domain: "Data & Statistics", keywords: ["census", "statistic", "survey", "open-data", "dataset", "data-portal", "demographic", "indicator"] },
];

const FUNCTION_RULES = [
  { fn: "Library", keywords: ["lib", "sdk", "package", "module", "client-library", "wrapper", "binding", "plugin"] },
  { fn: "Web App", keywords: ["webapp", "web-app", "dashboard", "portal", "frontend", "ui", "website", "cms", "admin-panel"] },
  { fn: "API", keywords: ["-api", "api-", "restful", "graphql", "endpoint", "microservice", "webservice", "web-service"] },
  { fn: "CLI Tool", keywords: ["cli", "command-line", "commandline", "terminal", "console-app"] },
  { fn: "Data Pipeline", keywords: ["pipeline", "etl", "ingest", "scraper", "crawler", "parser", "data-processing", "batch-process"] },
  { fn: "Documentation", keywords: ["docs", "documentation", "guide", "manual", "reference", "spec", "playbook", "handbook", "wiki"] },
  { fn: "Infrastructure", keywords: ["devops", "infrastructure", "terraform", "ansible", "docker", "deploy", "kubernetes", "helm", "ci-cd", "monitoring"] },
  { fn: "Framework", keywords: ["framework", "boilerplate", "scaffold", "starter", "template", "archetype"] },
];

/**
 * Classify a repo by domain and function.
 * @param {{ name: string, desc: string, topics?: string[] }} repo
 * @returns {{ domain: string, fn: string }}
 */
export function classify(repo) {
  // Build a single searchable string from name + description + topics.
  const text = [
    repo.name || "",
    repo.desc || "",
    ...(repo.topics || []),
  ]
    .join(" ")
    .toLowerCase();

  let domain = "Other";
  let bestDomainScore = 0;
  for (const rule of DOMAIN_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestDomainScore) {
      bestDomainScore = score;
      domain = rule.domain;
    }
  }

  let fn = "Other";
  let bestFnScore = 0;
  for (const rule of FUNCTION_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestFnScore) {
      bestFnScore = score;
      fn = rule.fn;
    }
  }

  return { domain, fn };
}
