#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { mergeIncidentCards } from "./index.mjs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: kg-suite-incident-merge <card.json> [<card.json> ...] [--json]");
  process.exit(2);
}

const asJson = args.includes("--json");
const files = args.filter((a) => !a.startsWith("--"));
const cards = files.map((f) => JSON.parse(readFileSync(f, "utf8")));

const result = mergeIncidentCards(cards);

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Input: ${cards.length} cards · Unique after dedup: ${result.dedup_report.unique_after_dedup}`);
  if (result.dedup_report.duplicates.length) {
    console.log(`Duplicates flagged: ${result.dedup_report.duplicates.length}`);
    for (const d of result.dedup_report.duplicates) console.log(`  - ${d.duplicate} → duplicate-of ${d.keeper} (${d.reason})`);
  }
  console.log(`\nTimeline (${result.timeline.length} events):`);
  for (const t of result.timeline) console.log(`  ${t.occurred_at}  ${t.severity.padEnd(15)} ${t.vertical.padEnd(12)} ${t.event_type}  [${t.incident_id}]`);
  console.log(`\nSeverity distribution:`);
  for (const [s, n] of Object.entries(result.severity_distribution)) console.log(`  ${s}: ${n}`);
  if (result.hotspots.length) {
    console.log(`\nHotspot verticals (≥3 incidents):`);
    for (const h of result.hotspots) console.log(`  ${h.vertical}: ${h.incident_count}`);
  }
  console.log(`\nRegulator referral matrix:`);
  for (const [vertical, regulators] of Object.entries(result.referral_matrix)) {
    console.log(`  ${vertical}:`);
    for (const [reg, ids] of Object.entries(regulators)) console.log(`    ${reg} ← ${ids.join(", ")}`);
  }
}
