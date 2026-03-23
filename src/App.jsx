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

import { useState } from "react";

// ---------------------------------------------------------------------------
// DATA: All 331 US government GitHub organisations
// Source: github/government.github.com/_data/governments.yml (U.S. sections only)
// Grouped into 8 categories matching the YAML structure.
// Each entry has:
//   name     - the GitHub organisation slug (used in API calls)
//   category - the section from governments.yml
//   emoji    - visual indicator for the category in the UI
// ---------------------------------------------------------------------------

const ORGS = [
  // ── U.S. Federal (164 orgs) ───────────────────────────────────────────────
  { name: "18f", category: "U.S. Federal", emoji: "🏛️" },
  { name: "adl-aicc", category: "U.S. Federal", emoji: "🏛️" },
  { name: "adlnet", category: "U.S. Federal", emoji: "🏛️" },
  { name: "afrl", category: "U.S. Federal", emoji: "🏛️" },
  { name: "arcticlcc", category: "U.S. Federal", emoji: "🏛️" },
  { name: "BBGInnovate", category: "U.S. Federal", emoji: "🏛️" },
  { name: "bfelob", category: "U.S. Federal", emoji: "🏛️" },
  { name: "blue-button", category: "U.S. Federal", emoji: "🏛️" },
  { name: "businessusa", category: "U.S. Federal", emoji: "🏛️" },
  { name: "CA-CST-Library", category: "U.S. Federal", emoji: "🏛️" },
  { name: "CA-CST-SII", category: "U.S. Federal", emoji: "🏛️" },
  { name: "ccmc", category: "U.S. Federal", emoji: "🏛️" },
  { name: "CDCgov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "cfpb", category: "U.S. Federal", emoji: "🏛️" },
  { name: "cigiegov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "cisagov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "cloud-gov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "cmsgov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "Code-dot-mil", category: "U.S. Federal", emoji: "🏛️" },
  { name: "commercedataservice", category: "U.S. Federal", emoji: "🏛️" },
  { name: "commercegov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "demand-driven-open-data", category: "U.S. Federal", emoji: "🏛️" },
  { name: "department-of-veterans-affairs", category: "U.S. Federal", emoji: "🏛️" },
  { name: "dhs-gov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "didsr", category: "U.S. Federal", emoji: "🏛️" },
  { name: "digital-analytics-program", category: "U.S. Federal", emoji: "🏛️" },
  { name: "dodcio", category: "U.S. Federal", emoji: "🏛️" },
  { name: "doecode", category: "U.S. Federal", emoji: "🏛️" },
  { name: "doi-open-data", category: "U.S. Federal", emoji: "🏛️" },
  { name: "EEOC", category: "U.S. Federal", emoji: "🏛️" },
  { name: "energyapps", category: "U.S. Federal", emoji: "🏛️" },
  { name: "erdc", category: "U.S. Federal", emoji: "🏛️" },
  { name: "eregs", category: "U.S. Federal", emoji: "🏛️" },
  { name: "FAA-Aviation-Data-Portal", category: "U.S. Federal", emoji: "🏛️" },
  { name: "fcc", category: "U.S. Federal", emoji: "🏛️" },
  { name: "fda", category: "U.S. Federal", emoji: "🏛️" },
  { name: "fecgov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "Federal-Aviation-Administration", category: "U.S. Federal", emoji: "🏛️" },
  { name: "federal-courts-software-factory", category: "U.S. Federal", emoji: "🏛️" },
  { name: "federaltradecommission", category: "U.S. Federal", emoji: "🏛️" },
  { name: "fedramp", category: "U.S. Federal", emoji: "🏛️" },
  { name: "fedspendingtransparency", category: "U.S. Federal", emoji: "🏛️" },
  { name: "fema", category: "U.S. Federal", emoji: "🏛️" },
  { name: "firelab", category: "U.S. Federal", emoji: "🏛️" },
  { name: "globegit", category: "U.S. Federal", emoji: "🏛️" },
  { name: "gopleader", category: "U.S. Federal", emoji: "🏛️" },
  { name: "government-services", category: "U.S. Federal", emoji: "🏛️" },
  { name: "GrainGenes", category: "U.S. Federal", emoji: "🏛️" },
  { name: "gsa", category: "U.S. Federal", emoji: "🏛️" },
  { name: "gsa-oes", category: "U.S. Federal", emoji: "🏛️" },
  { name: "gsa-tts", category: "U.S. Federal", emoji: "🏛️" },
  { name: "hhs", category: "U.S. Federal", emoji: "🏛️" },
  { name: "HHS-AHRQ", category: "U.S. Federal", emoji: "🏛️" },
  { name: "HHSDigitalMediaAPIPlatform", category: "U.S. Federal", emoji: "🏛️" },
  { name: "HHSIDEAlab", category: "U.S. Federal", emoji: "🏛️" },
  { name: "historyatstate", category: "U.S. Federal", emoji: "🏛️" },
  { name: "IIP-Design", category: "U.S. Federal", emoji: "🏛️" },
  { name: "IMDProjects", category: "U.S. Federal", emoji: "🏛️" },
  { name: "imls", category: "U.S. Federal", emoji: "🏛️" },
  { name: "informaticslab", category: "U.S. Federal", emoji: "🏛️" },
  { name: "Innovation-Toolkit", category: "U.S. Federal", emoji: "🏛️" },
  { name: "internationaltradeadministration", category: "U.S. Federal", emoji: "🏛️" },
  { name: "ioos", category: "U.S. Federal", emoji: "🏛️" },
  { name: "IRSgov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "keplergo", category: "U.S. Federal", emoji: "🏛️" },
  { name: "libraryofcongress", category: "U.S. Federal", emoji: "🏛️" },
  { name: "M-O-S-E-S", category: "U.S. Federal", emoji: "🏛️" },
  { name: "mcc-gov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "missioncommand", category: "U.S. Federal", emoji: "🏛️" },
  { name: "nasa", category: "U.S. Federal", emoji: "🏛️" },
  { name: "nasa-develop", category: "U.S. Federal", emoji: "🏛️" },
  { name: "nasa-gibs", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NASA-rdt", category: "U.S. Federal", emoji: "🏛️" },
  { name: "nasa-tournament-lab", category: "U.S. Federal", emoji: "🏛️" },
  { name: "nasaworldwind", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NationalGuard", category: "U.S. Federal", emoji: "🏛️" },
  { name: "nationalparkservice", category: "U.S. Federal", emoji: "🏛️" },
  { name: "navadmc", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NCI-Agency", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NCRN", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NeoGeographyToolkit", category: "U.S. Federal", emoji: "🏛️" },
  { name: "nesii", category: "U.S. Federal", emoji: "🏛️" },
  { name: "ngds", category: "U.S. Federal", emoji: "🏛️" },
  { name: "nhanes", category: "U.S. Federal", emoji: "🏛️" },
  { name: "nidcd", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NIEM", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NMB-Dev", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NMML", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NOAA-EPIC", category: "U.S. Federal", emoji: "🏛️" },
  { name: "noaa-gfdl", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NOAA-ORR-ERD", category: "U.S. Federal", emoji: "🏛️" },
  { name: "noaa-pmel", category: "U.S. Federal", emoji: "🏛️" },
  { name: "ntia", category: "U.S. Federal", emoji: "🏛️" },
  { name: "NUWCDIVNPT", category: "U.S. Federal", emoji: "🏛️" },
  { name: "ombegov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "Open-Sat", category: "U.S. Federal", emoji: "🏛️" },
  { name: "opengovplatform", category: "U.S. Federal", emoji: "🏛️" },
  { name: "ozoneplatform", category: "U.S. Federal", emoji: "🏛️" },
  { name: "peacecorps", category: "U.S. Federal", emoji: "🏛️" },
  { name: "petsc", category: "U.S. Federal", emoji: "🏛️" },
  { name: "presidential-innovation-fellows", category: "U.S. Federal", emoji: "🏛️" },
  { name: "project-open-data", category: "U.S. Federal", emoji: "🏛️" },
  { name: "radiofreeasia", category: "U.S. Federal", emoji: "🏛️" },
  { name: "redhawksdr", category: "U.S. Federal", emoji: "🏛️" },
  { name: "regulationsgov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "sbstusa", category: "U.S. Federal", emoji: "🏛️" },
  { name: "SelectUSA", category: "U.S. Federal", emoji: "🏛️" },
  { name: "SERVIR", category: "U.S. Federal", emoji: "🏛️" },
  { name: "SSAgov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "state-hiu", category: "U.S. Federal", emoji: "🏛️" },
  { name: "sunpy", category: "U.S. Federal", emoji: "🏛️" },
  { name: "us-bea", category: "U.S. Federal", emoji: "🏛️" },
  { name: "US-CBP", category: "U.S. Federal", emoji: "🏛️" },
  { name: "US-Department-of-the-Treasury", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usagov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usaid", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usasearch", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usbr", category: "U.S. Federal", emoji: "🏛️" },
  { name: "uscensusbureau", category: "U.S. Federal", emoji: "🏛️" },
  { name: "uscis", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usda", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usda-ars-agil", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usda-ars-gbru", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usda-ars-ltar", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usda-ars-nwrc", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usda-ars-wmsru", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USDA-ERS", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USDA-FSA", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usda-nifa-b-team", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usda-vs", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usdaForestService", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usdepartmentoflabor", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usdoj", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usdot-fhwa-stol", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usdot-jpo-ode", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usds", category: "U.S. Federal", emoji: "🏛️" },
  { name: "useda", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usepa", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USFWS", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usg-scope", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USGCRP", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usgpo", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usgs", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USGS-Astrogeology", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usgs-cmg", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usgs-eros", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USGS-OWI", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USGS-R", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USGS-WiM", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usnationalarchives", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usopm", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USPS", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USPTO", category: "U.S. Federal", emoji: "🏛️" },
  { name: "USSBA", category: "U.S. Federal", emoji: "🏛️" },
  { name: "usstatedept", category: "U.S. Federal", emoji: "🏛️" },
  { name: "ustaxcourt", category: "U.S. Federal", emoji: "🏛️" },
  { name: "uswds", category: "U.S. Federal", emoji: "🏛️" },
  { name: "VHAINNOVATIONS", category: "U.S. Federal", emoji: "🏛️" },
  { name: "virtual-world-framework", category: "U.S. Federal", emoji: "🏛️" },
  { name: "visionworkbench", category: "U.S. Federal", emoji: "🏛️" },
  { name: "weather-gov", category: "U.S. Federal", emoji: "🏛️" },
  { name: "WFMRDA", category: "U.S. Federal", emoji: "🏛️" },
  { name: "whitehouse", category: "U.S. Federal", emoji: "🏛️" },
  { name: "XDgov", category: "U.S. Federal", emoji: "🏛️" },

  // ── U.S. Military & Intelligence (17 orgs) ───────────────────────────────
  { name: "afseo", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "CRREL", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "deptofdefense", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "dod-cyber-crime-center", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "erdc-itl", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "iadgov", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "info-sharing-environment", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "NationalSecurityAgency", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "ngageoint", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "nsacyber", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "project-interoperability", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "psns-imf", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "shareandprotect", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "SIMP", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "transcom", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "usarmyresearchlab", category: "U.S. Military & Intelligence", emoji: "🪖" },
  { name: "USNavalResearchLaboratory", category: "U.S. Military & Intelligence", emoji: "🪖" },

  // ── U.S. States (52 orgs) ────────────────────────────────────────────────
  { name: "agrc", category: "U.S. States", emoji: "🗺️" },
  { name: "akhealth", category: "U.S. States", emoji: "🗺️" },
  { name: "azgs", category: "U.S. States", emoji: "🗺️" },
  { name: "cagov", category: "U.S. States", emoji: "🗺️" },
  { name: "CAWaterBoardDataCenter", category: "U.S. States", emoji: "🗺️" },
  { name: "ccap", category: "U.S. States", emoji: "🗺️" },
  { name: "CentralValleyModeling", category: "U.S. States", emoji: "🗺️" },
  { name: "coloradodemography", category: "U.S. States", emoji: "🗺️" },
  { name: "CTOpenData", category: "U.S. States", emoji: "🗺️" },
  { name: "DCGovWeb", category: "U.S. States", emoji: "🗺️" },
  { name: "eHawaii", category: "U.S. States", emoji: "🗺️" },
  { name: "FGS-FloridaGeologicalSurvey", category: "U.S. States", emoji: "🗺️" },
  { name: "gaepdit", category: "U.S. States", emoji: "🗺️" },
  { name: "gocodecolorado", category: "U.S. States", emoji: "🗺️" },
  { name: "IDAHO-DOC-NCOMS", category: "U.S. States", emoji: "🗺️" },
  { name: "idahofishgame", category: "U.S. States", emoji: "🗺️" },
  { name: "judicialcouncilcalifornia", category: "U.S. States", emoji: "🗺️" },
  { name: "la-ots", category: "U.S. States", emoji: "🗺️" },
  { name: "LADCO", category: "U.S. States", emoji: "🗺️" },
  { name: "LibraryofVA", category: "U.S. States", emoji: "🗺️" },
  { name: "massgov", category: "U.S. States", emoji: "🗺️" },
  { name: "MESMD", category: "U.S. States", emoji: "🗺️" },
  { name: "MFWP-GIS", category: "U.S. States", emoji: "🗺️" },
  { name: "nebraskamap", category: "U.S. States", emoji: "🗺️" },
  { name: "nelegislature", category: "U.S. States", emoji: "🗺️" },
  { name: "NJOGIS", category: "U.S. States", emoji: "🗺️" },
  { name: "njstatelibrary", category: "U.S. States", emoji: "🗺️" },
  { name: "ny", category: "U.S. States", emoji: "🗺️" },
  { name: "nys-its", category: "U.S. States", emoji: "🗺️" },
  { name: "nysenate", category: "U.S. States", emoji: "🗺️" },
  { name: "oimt", category: "U.S. States", emoji: "🗺️" },
  { name: "okcareertech", category: "U.S. States", emoji: "🗺️" },
  { name: "oregonopendata", category: "U.S. States", emoji: "🗺️" },
  { name: "ORMetro", category: "U.S. States", emoji: "🗺️" },
  { name: "scgeology", category: "U.S. States", emoji: "🗺️" },
  { name: "SLNC-DIMP", category: "U.S. States", emoji: "🗺️" },
  { name: "State-of-Arizona", category: "U.S. States", emoji: "🗺️" },
  { name: "StateOfCalifornia", category: "U.S. States", emoji: "🗺️" },
  { name: "swibwi", category: "U.S. States", emoji: "🗺️" },
  { name: "tndidd", category: "U.S. States", emoji: "🗺️" },
  { name: "TNRIS", category: "U.S. States", emoji: "🗺️" },
  { name: "twdb", category: "U.S. States", emoji: "🗺️" },
  { name: "TxDOT", category: "U.S. States", emoji: "🗺️" },
  { name: "UtahForestryFireStateLands", category: "U.S. States", emoji: "🗺️" },
  { name: "VDGIF", category: "U.S. States", emoji: "🗺️" },
  { name: "Virginia-Department-of-Health", category: "U.S. States", emoji: "🗺️" },
  { name: "Virginia-House-of-Delegates", category: "U.S. States", emoji: "🗺️" },
  { name: "vtrans", category: "U.S. States", emoji: "🗺️" },
  { name: "vtrans-rail", category: "U.S. States", emoji: "🗺️" },
  { name: "WA-Department-of-Agriculture", category: "U.S. States", emoji: "🗺️" },
  { name: "wsdot", category: "U.S. States", emoji: "🗺️" },
  { name: "WSDOT-GIS", category: "U.S. States", emoji: "🗺️" },

  // ── U.S. Cities (66 orgs) ────────────────────────────────────────────────
  { name: "austincodeit", category: "U.S. Cities", emoji: "🏙️" },
  { name: "Baltimore-City-EGIS", category: "U.S. Cities", emoji: "🏙️" },
  { name: "berkeleypubliclibrary", category: "U.S. Cities", emoji: "🏙️" },
  { name: "BostonRedevelop", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cambridgedata", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cambridgegis", category: "U.S. Cities", emoji: "🏙️" },
  { name: "chicago", category: "U.S. Cities", emoji: "🏙️" },
  { name: "city-of-bellingham", category: "U.S. Cities", emoji: "🏙️" },
  { name: "city-of-bloomington", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofasheville", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityOfAuburnAL", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofaustin", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofboise", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityOfBoston", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofboulder", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofburlington", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofchattanooga", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityOfDetroit", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityOfLosAngeles", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofnewyork", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityOfPhiladelphia", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityofPittsburgh", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofportland", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityofReno", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityofSanFrancisco", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityofSantaMonica", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofsomerville", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofvernonia", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityOfVirginiaBeach", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cityofwestsacramento", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CityofYakima", category: "U.S. Cities", emoji: "🏙️" },
  { name: "cno-opa", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CORaleigh", category: "U.S. Cities", emoji: "🏙️" },
  { name: "CUMTD", category: "U.S. Cities", emoji: "🏙️" },
  { name: "DCCouncil", category: "U.S. Cities", emoji: "🏙️" },
  { name: "DCgov", category: "U.S. Cities", emoji: "🏙️" },
  { name: "DenverDev", category: "U.S. Cities", emoji: "🏙️" },
  { name: "digitalinclusion", category: "U.S. Cities", emoji: "🏙️" },
  { name: "egovpdx", category: "U.S. Cities", emoji: "🏙️" },
  { name: "Honolulu", category: "U.S. Cities", emoji: "🏙️" },
  { name: "kcmo", category: "U.S. Cities", emoji: "🏙️" },
  { name: "lfucg", category: "U.S. Cities", emoji: "🏙️" },
  { name: "longbeachinnovationteam", category: "U.S. Cities", emoji: "🏙️" },
  { name: "LouisvilleMetro", category: "U.S. Cities", emoji: "🏙️" },
  { name: "louisvillemetro-innovation", category: "U.S. Cities", emoji: "🏙️" },
  { name: "mnhrc", category: "U.S. Cities", emoji: "🏙️" },
  { name: "mnylc", category: "U.S. Cities", emoji: "🏙️" },
  { name: "moda-nyc", category: "U.S. Cities", emoji: "🏙️" },
  { name: "monum", category: "U.S. Cities", emoji: "🏙️" },
  { name: "NewYorkCityCouncil", category: "U.S. Cities", emoji: "🏙️" },
  { name: "NYCComptroller", category: "U.S. Cities", emoji: "🏙️" },
  { name: "nycdot", category: "U.S. Cities", emoji: "🏙️" },
  { name: "NYCPlanning", category: "U.S. Cities", emoji: "🏙️" },
  { name: "onc-healthit", category: "U.S. Cities", emoji: "🏙️" },
  { name: "OpenGovDC", category: "U.S. Cities", emoji: "🏙️" },
  { name: "p2g", category: "U.S. Cities", emoji: "🏙️" },
  { name: "pdxgis", category: "U.S. Cities", emoji: "🏙️" },
  { name: "PierceCountyWA", category: "U.S. Cities", emoji: "🏙️" },
  { name: "ProBonoDC", category: "U.S. Cities", emoji: "🏙️" },
  { name: "ridertd", category: "U.S. Cities", emoji: "🏙️" },
  { name: "SantaClarita", category: "U.S. Cities", emoji: "🏙️" },
  { name: "sfbart", category: "U.S. Cities", emoji: "🏙️" },
  { name: "SiloamSprings", category: "U.S. Cities", emoji: "🏙️" },
  { name: "southbendin", category: "U.S. Cities", emoji: "🏙️" },
  { name: "TownOfBrookline", category: "U.S. Cities", emoji: "🏙️" },
  { name: "tucsonaz", category: "U.S. Cities", emoji: "🏙️" },

  // ── U.S. Counties (18 orgs) ──────────────────────────────────────────────
  { name: "anoka-script-team", category: "U.S. Counties", emoji: "🏘️" },
  { name: "ArlingtonCounty", category: "U.S. Counties", emoji: "🏘️" },
  { name: "baltimorecounty", category: "U.S. Counties", emoji: "🏘️" },
  { name: "BayAreaMetro", category: "U.S. Counties", emoji: "🏘️" },
  { name: "bouldercounty", category: "U.S. Counties", emoji: "🏘️" },
  { name: "Canyon-County", category: "U.S. Counties", emoji: "🏘️" },
  { name: "CarverCounty", category: "U.S. Counties", emoji: "🏘️" },
  { name: "donaanacounty", category: "U.S. Counties", emoji: "🏘️" },
  { name: "fairfieldcountyit", category: "U.S. Counties", emoji: "🏘️" },
  { name: "fpdcc", category: "U.S. Counties", emoji: "🏘️" },
  { name: "HarrisCountyFOA", category: "U.S. Counties", emoji: "🏘️" },
  { name: "HennepinCountyPublicDefender", category: "U.S. Counties", emoji: "🏘️" },
  { name: "LACMTA", category: "U.S. Counties", emoji: "🏘️" },
  { name: "MCLD", category: "U.S. Counties", emoji: "🏘️" },
  { name: "pottcountyit", category: "U.S. Counties", emoji: "🏘️" },
  { name: "saccounty", category: "U.S. Counties", emoji: "🏘️" },
  { name: "sfcta", category: "U.S. Counties", emoji: "🏘️" },
  { name: "slugis", category: "U.S. Counties", emoji: "🏘️" },

  // ── U.S. Special Districts (10 orgs) ─────────────────────────────────────
  // Regional planning authorities, transit agencies, port authorities, etc.
  { name: "atlregional", category: "U.S. Special Districts", emoji: "🔷" },
  { name: "AZMAG", category: "U.S. Special Districts", emoji: "🔷" },
  { name: "baaqmd", category: "U.S. Special Districts", emoji: "🔷" },
  { name: "cleveland-metroparks", category: "U.S. Special Districts", emoji: "🔷" },
  { name: "CMAP-REPOS", category: "U.S. Special Districts", emoji: "🔷" },
  { name: "commonwealth-of-puerto-rico", category: "U.S. Special Districts", emoji: "🔷" },
  { name: "MAPC", category: "U.S. Special Districts", emoji: "🔷" },
  { name: "Metropolitan-Council", category: "U.S. Special Districts", emoji: "🔷" },
  { name: "portofsandiego", category: "U.S. Special Districts", emoji: "🔷" },
  { name: "psrc", category: "U.S. Special Districts", emoji: "🔷" },

  // ── U.S. Tribal Nations (3 orgs) ─────────────────────────────────────────
  { name: "coquille-indian-tribe", category: "U.S. Tribal Nations", emoji: "🪶" },
  { name: "MSBandofChoctawIndians", category: "U.S. Tribal Nations", emoji: "🪶" },
  { name: "osage-nation", category: "U.S. Tribal Nations", emoji: "🪶" },

  // ── U.S. Law Enforcement (1 org) ─────────────────────────────────────────
  { name: "SanDiegoCountySheriff", category: "U.S. Law Enforcement", emoji: "🚔" },
];

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/**
 * All category values that appear in ORGS, plus "All" for the unfiltered view.
 * Used to populate the category filter dropdown.
 */
const CATEGORIES = [
  "All",
  "U.S. Federal",
  "U.S. Military & Intelligence",
  "U.S. States",
  "U.S. Cities",
  "U.S. Counties",
  "U.S. Special Districts",
  "U.S. Tribal Nations",
  "U.S. Law Enforcement",
];

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

/** Pause execution for `ms` milliseconds. Used to pace API requests. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const [token, setToken] = useState("");         // GitHub Personal Access Token (optional)
  const [showToken, setShowToken] = useState(false); // toggles the token input field

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
    // Reset all state for a fresh run
    setPhase("loading");
    setRepos([]);
    setOrgIndex(0);
    setFatalMsg("");
    setRateLimitedAt(null);

    // Build request headers. Authorization header is only added when a token
    // is present — the GitHub API accepts unauthenticated requests too.
    const headers = { Accept: "application/vnd.github+json" };
    if (token.trim()) {
      headers["Authorization"] = "Bearer " + token.trim();
    }

    // Accumulate repos here, then copy to state after each org
    const accumulated = [];

    for (let i = 0; i < ORGS.length; i++) {
      const org = ORGS[i];

      // Update progress indicators
      setOrgIndex(i + 1);
      setOrgName(org.name);

      // Attempt the API call
      let res;
      try {
        res = await fetch(
          "https://api.github.com/orgs/" + org.name + "/repos?type=public&per_page=100&sort=stars",
          { headers: headers }
        );
      } catch (err) {
        // Network-level failure (fetch() itself threw).
        // If this happens on the very first org, it means the API is
        // completely unreachable — show the fatal screen.
        if (i === 0) {
          setFatalMsg(
            "Could not reach api.github.com — " + err.message +
            "\n\nThe Claude.ai artifact sandbox blocks requests to external APIs. " +
            "To use this app, run it locally:\n\n" +
            "  npm create vite@latest us-gov-oss -- --template react\n" +
            "  cd us-gov-oss && npm install\n" +
            "  # Replace src/App.jsx with this file\n" +
            "  npm run dev"
          );
          setPhase("fatal");
          return;
        }
        // For later orgs, just skip and continue
        continue;
      }

      // HTTP 403 / 429 = rate limited. Stop the loop and show a warning.
      if (res.status === 403 || res.status === 429) {
        setRateLimitedAt(i);
        break;
      }

      // HTTP 404 = org doesn't exist or has no public GitHub presence. Skip.
      if (res.status === 404) {
        continue;
      }

      // Any other non-OK response: skip this org silently.
      if (!res.ok) {
        continue;
      }

      // Parse the JSON response
      let data;
      try {
        data = await res.json();
      } catch {
        continue;
      }

      // Add qualifying repos to the accumulator
      if (Array.isArray(data)) {
        for (const r of data) {
          // Exclude forks and archived repos — same policy as the UK leaderboard
          if (r.fork === false && r.archived === false) {
            accumulated.push({
              id: r.id,                          // GitHub repo ID (used as React key)
              name: r.name,                      // repo slug
              url: r.html_url,                   // link to the repo on GitHub
              desc: r.description || "",         // short description
              stars: r.stargazers_count || 0,
              forks: r.forks_count || 0,
              issues: r.open_issues_count || 0,  // open issues + PRs
              lang: r.language || null,           // primary language (may be null)
              updated: r.pushed_at || null,       // date of last push
              license: r.license ? r.license.spdx_id : null,
              org: org.name,                     // GitHub org slug
              category: org.category,            // e.g. "U.S. Federal"
              emoji: org.emoji,                  // category emoji
            });
          }
        }

        // Update state with a new array reference so React re-renders.
        // We do this inside the loop (not after) so the table fills live.
        setRepos(accumulated.slice());
      }

      // Polite delay between requests
      await sleep(100);
    }

    setPhase("done");
  }

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
  // SHARED STYLES
  // ---------------------------------------------------------------------------

  const S = {
    page: {
      minHeight: "100vh",
      background: "#05080f",
      color: "#e8eaf0",
      fontFamily: "Georgia, serif",
    },
    // Reused style for all <select> dropdowns in the controls bar
    select: {
      background: "#0d1220",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 7,
      padding: "7px 11px",
      color: "#e8eaf0",
      fontSize: 12,
      fontFamily: "monospace",
      cursor: "pointer",
      outline: "none",
    },
  };

  // ---------------------------------------------------------------------------
  // RENDER: WELCOME SCREEN
  // ---------------------------------------------------------------------------

  if (phase === "welcome") {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: 540, width: "100%", textAlign: "center" }}>

          <div style={{ fontSize: 10, letterSpacing: 6, textTransform: "uppercase", color: "#b22234", fontFamily: "monospace", marginBottom: 12 }}>
            ★ &nbsp; United States Government &nbsp; ★
          </div>

          <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 14px", background: "linear-gradient(135deg, #fff 0%, #b8c4e0 55%, #b22234 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Open Source<br /><em>Repository Leaderboard</em>
          </h1>

          <p style={{ color: "#6b7280", fontFamily: "monospace", fontSize: 12, marginBottom: 24, lineHeight: 1.9 }}>
            Live data from <strong style={{ color: "#c5cad4" }}>{ORGS.length} US government organizations</strong> on GitHub
            <br />
            Federal · Military · States · Cities · Counties · Tribal Nations
          </p>

          {/* Rate limit explainer */}
          <div style={{ background: "rgba(178,34,52,0.08)", border: "1px solid rgba(178,34,52,0.22)", borderRadius: 10, padding: "14px 18px", marginBottom: 22, textAlign: "left" }}>
            <div style={{ color: "#ff9999", fontFamily: "monospace", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>⚡ Rate limits</div>
            <div style={{ color: "#6b7280", fontFamily: "monospace", fontSize: 11, lineHeight: 1.9 }}>
              No token: <strong style={{ color: "#c5cad4" }}>60 req/hr</strong> — covers ~60 orgs out of {ORGS.length}<br />
              With a GitHub token: <strong style={{ color: "#c5cad4" }}>5,000 req/hr</strong> — covers all {ORGS.length}<br />
              No scopes needed. Token is only used for GitHub API calls in your browser.
            </div>
          </div>

          {/* Token input toggle */}
          <button
            onClick={() => setShowToken(!showToken)}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "5px 14px", color: "#6b7280", fontFamily: "monospace", fontSize: 11, cursor: "pointer", marginBottom: showToken ? 10 : 22 }}
          >
            {showToken ? "▲ Hide token" : "▼ Add GitHub token (optional)"}
          </button>

          {showToken && (
            <div style={{ marginBottom: 22 }}>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                type="password"
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          )}

          {/* Main CTA */}
          <button
            onClick={startLoading}
            style={{ background: "linear-gradient(135deg, #b22234, #3c3b6e)", border: "none", borderRadius: 10, padding: "13px 38px", color: "#fff", fontFamily: "monospace", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 1, boxShadow: "0 4px 20px rgba(178,34,52,0.35)" }}
          >
            🇺🇸 &nbsp; Load All Agencies
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: FATAL ERROR SCREEN
  // Shown when the very first network request fails (API unreachable).
  // ---------------------------------------------------------------------------

  if (phase === "fatal") {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: 540, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontFamily: "monospace", color: "#ff8a8a", marginBottom: 12 }}>GitHub API Unreachable</h2>
          <pre style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "14px 16px", fontFamily: "monospace", fontSize: 11, color: "#6b7280", textAlign: "left", whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 20 }}>
            {fatalMsg}
          </pre>
          <button
            onClick={() => setPhase("welcome")}
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "8px 18px", color: "#a0aec0", fontFamily: "monospace", fontSize: 12, cursor: "pointer" }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN LEADERBOARD
  // Shown during loading (with progress bar) and after loading completes.
  // ---------------------------------------------------------------------------

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 16px 40px" }}>

        {/* Page title */}
        <div style={{ textAlign: "center", padding: "32px 0 18px" }}>
          <div style={{ fontSize: 10, letterSpacing: 5, textTransform: "uppercase", color: "#b22234", fontFamily: "monospace", marginBottom: 7 }}>
            ★ &nbsp; United States Government &nbsp; ★
          </div>
          <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2.4rem)", fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #fff 0%, #b8c4e0 55%, #b22234 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Open Source Repository Leaderboard
          </h1>
        </div>

        {/* Stats pills */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {[
            ["Orgs",       orgIndex + " / " + ORGS.length],
            ["Repos",      repos.length.toLocaleString()],
            ["★ Stars",    fmtNum(totalStars)],
            ["Languages",  langs.length - 1],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{value}</div>
              <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar — only shown while loading */}
        {isLoading && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
              <div style={{ width: progress + "%", height: "100%", background: "linear-gradient(90deg, #b22234, #3c3b6e)", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontFamily: "monospace", fontSize: 10, color: "#374151" }}>
              <span>⟳ {orgName}</span>
              <span>{progress}% · {orgIndex}/{ORGS.length} orgs · {repos.length} repos found</span>
            </div>
          </div>
        )}

        {/* Rate limit warning banner */}
        {rateLimitedAt !== null && (
          <div style={{ background: "rgba(178,34,52,0.09)", border: "1px solid rgba(178,34,52,0.3)", borderRadius: 7, padding: "9px 14px", marginBottom: 14, color: "#ff8a8a", fontFamily: "monospace", fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ Rate limited after {rateLimitedAt}/{ORGS.length} orgs — partial results shown. Add a GitHub token and reload for full data.</span>
            <button onClick={() => setPhase("welcome")} style={{ background: "rgba(178,34,52,0.2)", border: "1px solid #b22234", borderRadius: 4, padding: "3px 8px", color: "#ff8a8a", cursor: "pointer", fontFamily: "monospace", fontSize: 10 }}>← Reset</button>
          </div>
        )}

        {/* Controls bar: search, sort, category filter, language filter */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "10px 12px", marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>

          {/* Free-text search: matches repo name or description */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search repos…"
            style={{ flex: "1 1 150px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "7px 11px", color: "#e8eaf0", fontSize: 12, fontFamily: "monospace", outline: "none" }}
          />

          {/* Sort order */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={S.select}>
            <option value="stars">★ Stars</option>
            <option value="forks">⑂ Forks</option>
            <option value="issues">● Issues</option>
            <option value="updated">↻ Updated</option>
          </select>

          {/* Category filter */}
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ ...S.select, maxWidth: 220 }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} style={{ background: "#0d1220" }}>{c}</option>
            ))}
          </select>

          {/* Language filter — options built dynamically from fetched repos */}
          <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)} style={S.select}>
            {langs.map((l) => (
              <option key={l} value={l} style={{ background: "#0d1220" }}>
                {l === "all" ? "All Languages" : l}
              </option>
            ))}
          </select>

          {/* Result count */}
          <span style={{ fontSize: 10, color: "#374151", fontFamily: "monospace", marginLeft: "auto" }}>
            {filtered.length.toLocaleString()} repos
          </span>

          {/* Reset button — goes back to the welcome screen */}
          <button
            onClick={() => setPhase("welcome")}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 6, padding: "5px 10px", color: "#374151", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}
          >
            ← Reset
          </button>
        </div>

        {/* Repo table */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(178,34,52,0.28)" }}>
                <th style={{ padding: "9px 11px", textAlign: "right",  color: "#4a5568", fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, width: 40 }}>#</th>
                <th style={{ padding: "9px 11px", textAlign: "left",   color: "#4a5568", fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Repository</th>
                <th style={{ padding: "9px 11px", textAlign: "left",   color: "#4a5568", fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, width: 170 }}>Org / Category</th>
                <th style={{ padding: "9px 11px", textAlign: "left",   color: "#4a5568", fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, width: 108 }}>Language</th>
                <th style={{ padding: "9px 11px", textAlign: "right",  color: "#4a5568", fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, width: 68 }}>Stars</th>
                <th style={{ padding: "9px 11px", textAlign: "right",  color: "#4a5568", fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, width: 60 }}>Forks</th>
                <th style={{ padding: "9px 11px", textAlign: "right",  color: "#4a5568", fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, width: 65 }}>Issues</th>
                <th style={{ padding: "9px 11px", textAlign: "left",   color: "#4a5568", fontFamily: "monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, width: 108 }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {/* Render top 300 filtered results */}
              {filtered.slice(0, 300).map((repo, idx) => (
                <tr
                  key={repo.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Rank: medals for top 3, number for the rest */}
                  <td style={{ padding: "10px 11px", textAlign: "right", fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: idx < 3 ? "#b22234" : "#1f2937" }}>
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                  </td>

                  {/* Repo name, description, license badge */}
                  <td style={{ padding: "10px 7px 10px 0", maxWidth: 340 }}>
                    <a href={repo.url} target="_blank" rel="noreferrer" style={{ color: "#7eb6ff", textDecoration: "none", fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>
                      {repo.name}
                    </a>
                    {repo.desc && (
                      <div style={{ color: "#374151", fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>
                        {repo.desc}
                      </div>
                    )}
                    {repo.license && (
                      <span style={{ display: "inline-block", marginTop: 2, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 3, padding: "1px 5px", fontSize: 9, color: "#374151", fontFamily: "monospace" }}>
                        {repo.license}
                      </span>
                    )}
                  </td>

                  {/* Org name and category */}
                  <td style={{ padding: "10px 11px" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{repo.emoji} {repo.org}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 9, color: "#374151", marginTop: 2 }}>{repo.category}</div>
                  </td>

                  {/* Language dot + name */}
                  <td style={{ padding: "10px 11px" }}>
                    {repo.lang && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: LANG_COLORS[repo.lang] || "#555", flexShrink: 0 }} />
                        <span style={{ color: "#9ca3af", fontSize: 10, fontFamily: "monospace" }}>{repo.lang}</span>
                      </span>
                    )}
                  </td>

                  {/* Stars — highlighted gold when > 500 */}
                  <td style={{ padding: "10px 11px", textAlign: "right", fontFamily: "monospace", fontSize: 11, color: repo.stars > 500 ? "#fbbf24" : repo.stars > 50 ? "#6b7280" : "#1f2937", fontWeight: repo.stars > 500 ? 700 : 400 }}>
                    {fmtNum(repo.stars)}
                  </td>

                  <td style={{ padding: "10px 11px", textAlign: "right", fontFamily: "monospace", fontSize: 11, color: "#374151" }}>
                    {fmtNum(repo.forks)}
                  </td>

                  <td style={{ padding: "10px 11px", textAlign: "right", fontFamily: "monospace", fontSize: 11, color: "#374151" }}>
                    {fmtNum(repo.issues)}
                  </td>

                  <td style={{ padding: "10px 11px", fontFamily: "monospace", fontSize: 10, color: "#1f2937", whiteSpace: "nowrap" }}>
                    {fmtDate(repo.updated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty state while loading */}
          {repos.length === 0 && isLoading && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#374151", fontFamily: "monospace", fontSize: 12 }}>
              ⟳ Fetching {orgName}…
            </div>
          )}

          {/* Empty state after loading completes with no results */}
          {repos.length === 0 && !isLoading && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#374151", fontFamily: "monospace", fontSize: 12 }}>
              No repos found — the API may be unreachable or all orgs returned empty results.
            </div>
          )}

          {/* Truncation notice when more than 300 results match the current filters */}
          {filtered.length > 300 && (
            <div style={{ textAlign: "center", padding: "11px", color: "#374151", fontFamily: "monospace", fontSize: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              Showing top 300 of {filtered.length.toLocaleString()} — refine your search to see more
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 18, color: "#1f2937", fontSize: 10, fontFamily: "monospace" }}>
          Org list from{" "}
          <a href="https://government.github.com/community/" target="_blank" rel="noreferrer" style={{ color: "#374151" }}>
            github/government.github.com
          </a>
          {" · "}
          Inspired by the{" "}
          <a href="https://www.uk-x-gov-software-community.org.uk/xgov-opensource-repo-scraper/" target="_blank" rel="noreferrer" style={{ color: "#374151" }}>
            UK Cross-Gov OSS Leaderboard
          </a>
        </div>

      </div>
    </div>
  );
}
