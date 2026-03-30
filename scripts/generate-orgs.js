#!/usr/bin/env node
/**
 * Fetches the GitHub government community YAML and generates lib/orgs.js.
 *
 * Usage:  node scripts/generate-orgs.js
 * Source: https://github.com/github/government.github.com/blob/gh-pages/_data/governments.yml
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "../lib/orgs.js");
const YAML_URL =
  "https://raw.githubusercontent.com/github/government.github.com/gh-pages/_data/governments.yml";

// Maps each YAML section to a flag emoji.
const EMOJI = {
  Argentina: "\u{1F1E6}\u{1F1F7}",
  Australia: "\u{1F1E6}\u{1F1FA}",
  Austria: "\u{1F1E6}\u{1F1F9}",
  Belgium: "\u{1F1E7}\u{1F1EA}",
  Bolivia: "\u{1F1E7}\u{1F1F4}",
  Brazil: "\u{1F1E7}\u{1F1F7}",
  Bulgaria: "\u{1F1E7}\u{1F1EC}",
  Cambodia: "\u{1F1F0}\u{1F1ED}",
  Canada: "\u{1F1E8}\u{1F1E6}",
  Chile: "\u{1F1E8}\u{1F1F1}",
  China: "\u{1F1E8}\u{1F1F3}",
  Colombia: "\u{1F1E8}\u{1F1F4}",
  "Czech Republic": "\u{1F1E8}\u{1F1FF}",
  Denmark: "\u{1F1E9}\u{1F1F0}",
  Ecuador: "\u{1F1EA}\u{1F1E8}",
  Egypt: "\u{1F1EA}\u{1F1EC}",
  Estonia: "\u{1F1EA}\u{1F1EA}",
  Ethiopia: "\u{1F1EA}\u{1F1F9}",
  "European Union": "\u{1F1EA}\u{1F1FA}",
  Finland: "\u{1F1EB}\u{1F1EE}",
  France: "\u{1F1EB}\u{1F1F7}",
  "French Polynesia": "\u{1F1F5}\u{1F1EB}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  Guatemala: "\u{1F1EC}\u{1F1F9}",
  "Hong Kong": "\u{1F1ED}\u{1F1F0}",
  Hungary: "\u{1F1ED}\u{1F1FA}",
  India: "\u{1F1EE}\u{1F1F3}",
  Indonesia: "\u{1F1EE}\u{1F1E9}",
  International: "\u{1F310}",
  Ireland: "\u{1F1EE}\u{1F1EA}",
  "Isle of Man": "\u{1F1EE}\u{1F1F2}",
  Israel: "\u{1F1EE}\u{1F1F1}",
  Italy: "\u{1F1EE}\u{1F1F9}",
  Japan: "\u{1F1EF}\u{1F1F5}",
  Jersey: "\u{1F1EF}\u{1F1EA}",
  Kosovo: "\u{1F1FD}\u{1F1F0}",
  Latvia: "\u{1F1F1}\u{1F1FB}",
  Lithuania: "\u{1F1F1}\u{1F1F9}",
  Luxemburg: "\u{1F1F1}\u{1F1FA}",
  Malaysia: "\u{1F1F2}\u{1F1FE}",
  Mauritius: "\u{1F1F2}\u{1F1FA}",
  Mexico: "\u{1F1F2}\u{1F1FD}",
  Netherlands: "\u{1F1F3}\u{1F1F1}",
  "New Zealand": "\u{1F1F3}\u{1F1FF}",
  Norway: "\u{1F1F3}\u{1F1F4}",
  Panama: "\u{1F1F5}\u{1F1E6}",
  Paraguay: "\u{1F1F5}\u{1F1FE}",
  Peru: "\u{1F1F5}\u{1F1EA}",
  Philippines: "\u{1F1F5}\u{1F1ED}",
  Poland: "\u{1F1F5}\u{1F1F1}",
  Portugal: "\u{1F1F5}\u{1F1F9}",
  "Republic of Korea": "\u{1F1F0}\u{1F1F7}",
  Romania: "\u{1F1F7}\u{1F1F4}",
  Russia: "\u{1F1F7}\u{1F1FA}",
  "Saudi Arabia": "\u{1F1F8}\u{1F1E6}",
  Singapore: "\u{1F1F8}\u{1F1EC}",
  Slovakia: "\u{1F1F8}\u{1F1F0}",
  "South Africa": "\u{1F1FF}\u{1F1E6}",
  Spain: "\u{1F1EA}\u{1F1F8}",
  Sweden: "\u{1F1F8}\u{1F1EA}",
  Switzerland: "\u{1F1E8}\u{1F1ED}",
  Taiwan: "\u{1F1F9}\u{1F1FC}",
  Thailand: "\u{1F1F9}\u{1F1ED}",
  "U.K. Central": "\u{1F1EC}\u{1F1E7}",
  "U.K. Councils": "\u{1F1EC}\u{1F1E7}",
  "U.S. City": "\u{1F1FA}\u{1F1F8}",
  "U.S. County": "\u{1F1FA}\u{1F1F8}",
  "U.S. Federal": "\u{1F1FA}\u{1F1F8}",
  "U.S. Local Law Enforcement": "\u{1F1FA}\u{1F1F8}",
  "U.S. Military and Intelligence": "\u{1F1FA}\u{1F1F8}",
  "U.S. Special District": "\u{1F1FA}\u{1F1F8}",
  "U.S. States": "\u{1F1FA}\u{1F1F8}",
  "U.S. Tribal Nations": "\u{1F1FA}\u{1F1F8}",
  Ukraine: "\u{1F1FA}\u{1F1E6}",
  "United Nations": "\u{1F1FA}\u{1F1F3}",
  Venezuela: "\u{1F1FB}\u{1F1EA}",
};

// Maps YAML sections → a top-level country for grouping in the UI.
const COUNTRY_OF = {
  "U.S. Federal": "United States",
  "U.S. Military and Intelligence": "United States",
  "U.S. States": "United States",
  "U.S. City": "United States",
  "U.S. County": "United States",
  "U.S. Special District": "United States",
  "U.S. Tribal Nations": "United States",
  "U.S. Local Law Enforcement": "United States",
  "U.K. Central": "United Kingdom",
  "U.K. Councils": "United Kingdom",
  International: "International",
  "European Union": "European Union",
  "United Nations": "International",
};

async function main() {
  console.log("Fetching governments.yml ...");
  const res = await fetch(YAML_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const data = yaml.load(text);

  const sections = Object.keys(data).sort();
  const orgs = [];

  for (const section of sections) {
    const slugs = data[section];
    if (!Array.isArray(slugs)) continue;
    const emoji = EMOJI[section] || "\u{1F3DB}\u{FE0F}";
    const country = COUNTRY_OF[section] || section;

    for (const slug of slugs) {
      orgs.push({ name: slug, category: section, country, emoji });
    }
  }

  // Build the CATEGORIES list: "All" + sorted unique section names.
  const categories = ["All", ...sections.filter((s) => Array.isArray(data[s]))];

  // Build COUNTRIES list: "All" + sorted unique country names.
  const countries = [
    "All",
    ...Array.from(new Set(orgs.map((o) => o.country))).sort(),
  ];

  // Generate the JavaScript source file.
  const lines = [
    "// ---------------------------------------------------------------------------",
    `// DATA: ${orgs.length} government GitHub organisations from ${categories.length - 1} categories`,
    "// Source: github/government.github.com/_data/governments.yml",
    "// Generated by: node scripts/generate-orgs.js",
    "// ---------------------------------------------------------------------------",
    "",
    "export const ORGS = [",
  ];

  let currentSection = null;
  for (const org of orgs) {
    if (org.category !== currentSection) {
      currentSection = org.category;
      const count = orgs.filter((o) => o.category === currentSection).length;
      lines.push("");
      lines.push(`  // -- ${currentSection} (${count} orgs) ${"─".repeat(Math.max(1, 60 - currentSection.length))}`)
    }
    lines.push(
      `  { name: ${JSON.stringify(org.name)}, category: ${JSON.stringify(org.category)}, country: ${JSON.stringify(org.country)}, emoji: ${JSON.stringify(org.emoji)} },`
    );
  }

  lines.push("];");
  lines.push("");
  lines.push("export const CATEGORIES = " + JSON.stringify(categories, null, 2) + ";");
  lines.push("");
  lines.push("export const COUNTRIES = " + JSON.stringify(countries, null, 2) + ";");
  lines.push("");

  writeFileSync(OUTPUT, lines.join("\n"), "utf-8");
  console.log(`Wrote ${orgs.length} orgs across ${categories.length - 1} categories to ${OUTPUT}`);
  console.log(`Countries: ${countries.length - 1}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
