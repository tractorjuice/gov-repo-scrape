// ---------------------------------------------------------------------------
// Manual overlay: orgs that are not (yet) in upstream
// github/government.github.com/_data/governments.yml but are verified
// government / public-sector GitHub organisations.
//
// This file is read by scripts/generate-orgs.js and appended to the
// upstream list when regenerating lib/orgs.js. Entries here survive
// regenerate runs; upstream additions take precedence on (category, name)
// collision.
//
// Each entry must have a { name, category } pair. The generator looks up
// `emoji` from its EMOJI map (keyed on category) so categories here must
// match the upstream section names used in governments.yml.
//
// The `notes` field is metadata for maintainers; it is not emitted into
// the generated lib/orgs.js.
// ---------------------------------------------------------------------------

export const MANUAL_ORGS = [
  // -- Austria ------------------------------------------------------------
  // Upstream governments.yml lists only `datagvat`. See issue #3 for context.
  {
    name: "BRZ-GmbH",
    category: "Austria",
    notes: "Bundesrechenzentrum — federal IT service (brz.gv.at). 7 public repos.",
  },
  {
    name: "a-sit-plus",
    category: "Austria",
    notes: "A-SIT Plus GmbH — e-government security (ID-Austria etc.), a-sit.at partner. 37 public repos.",
  },
  {
    name: "rtr-nettest",
    category: "Austria",
    notes: "Rundfunk und Telekom Regulierungs-GmbH — federal telecoms/broadcasting regulator. 10 public repos.",
  },
  {
    name: "statistikat",
    category: "Austria",
    notes: "Self-described 'Unofficial Organization for Open Source Projects of Statistics Austria'. De-facto Statistik Austria presence; no official org exists. 20 public repos.",
  },
];
