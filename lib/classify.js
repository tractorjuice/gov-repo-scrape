// ---------------------------------------------------------------------------
// Keyword-based repo classifier.
// Assigns a domain (what sector) and a function (what kind of software).
// ---------------------------------------------------------------------------

const DOMAIN_RULES = [
  { domain: "Healthcare", keywords: ["health", "medical", "clinical", "hospital", "patient", "cdc", "fda", "nih", "vaccine", "disease", "epidemiol", "pharma", "drug", "hhs", "medicare", "medicaid", "genomic", "biomedic", "nhs", "mhra", "nice-org", "hscni", "phe-", "ema-europa", "ecdc", "eu4health", "tga-au", "healthcanada"] },
  { domain: "Defence", keywords: ["military", "defense", "defence", "army", "navy", "airforce", "air-force", "dod", "missile", "weapon", "combat", "warfight", "tactical", "veteran", "mod-", "modgov", "dstl", "dasa", "raf-", "royal-navy", "eda-europa", "adf-au", "nzdf", "caf-canada"] },
  { domain: "Education", keywords: ["education", "school", "student", "university", "learning", "curriculum", "academic", "teach", "classroom", "course", "dfe-", "ofsted", "eacea-europa", "eurydice"] },
  { domain: "Environment", keywords: ["environment", "climate", "weather", "ocean", "atmospher", "ecology", "pollution", "epa", "noaa", "forest", "wildlife", "conservation", "emission", "sustainab", "water-quality", "biodiversity", "defra", "metoffice", "environment-agency", "eea-europa", "copernicus", "ecmwf", "bom-au", "eccc-canada"] },
  { domain: "Geospatial", keywords: ["gis", "geospatial", "mapping", "geographic", "spatial", "coordinate", "geodata", "lidar", "satellite", "raster", "shapefile", "cartograph", "topograph", "remote-sensing"] },
  { domain: "Finance", keywords: ["finance", "fiscal", "budget", "tax", "treasury", "economic", "banking", "monetary", "accounting", "revenue", "expenditure", "procurement", "hmrc", "hmtreasury", "bankofengland", "ecb-europa", "eib-europa", "eiopa", "ato-au", "cra-canada"] },
  { domain: "Transport", keywords: ["transport", "transit", "traffic", "highway", "road", "aviation", "faa", "vehicle", "freight", "railway", "railroad", "dot-", "usdot", "dft-uk", "highways-england", "network-rail", "easa-europa", "era-europa", "transport-canada"] },
  { domain: "Cybersecurity", keywords: ["security", "cyber", "vulnerab", "malware", "encrypt", "firewall", "nsa", "cisa", "intrusion", "threat", "incident-response", "pentest", "cve", "ncsc", "ico-org", "enisa", "edpb-europa", "cse-cst", "acsc-au", "ncsc-nz"] },
  { domain: "Science", keywords: ["science", "research", "nasa", "laborator", "physics", "chemistry", "biology", "genome", "astro", "seismic", "geological", "hydrology", "meteorolog", "stfc", "ukspace", "ukri", "npl-", "esa-", "cern", "jrc-europa", "csiro", "csa-canada"] },
  { domain: "Legal", keywords: ["law", "legal", "justice", "court", "regulat", "compliance", "judicial", "statute", "legislation", "enforcement", "moj-", "crownoffice", "cps-uk", "eur-lex", "cjeu", "eppo-europa"] },
  { domain: "Agriculture", keywords: ["agricultur", "farm", "crop", "soil", "usda", "livestock", "irrigation", "forestry", "pest", "grain", "food-safety", "fsa-uk", "efsa-europa"] },
  { domain: "Data & Statistics", keywords: ["census", "statistic", "survey", "open-data", "dataset", "data-portal", "demographic", "indicator", "onsdigital", "eurostat", "destatis", "insee", "statcan", "abs-au"] },
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
 * @param {{ name: string, desc: string, topics?: string[], org?: string }} repo
 * @returns {{ domain: string, fn: string }}
 */
export function classify(repo) {
  // Build a single searchable string from org + name + description + topics.
  // Including the owning org lets agency-slug keywords (ncsc, dstl, hmrc, etc.)
  // match repos owned by those agencies even when the repo name is generic.
  const text = [
    repo.org || "",
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
