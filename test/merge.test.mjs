import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeIncidentCards } from "../src/index.mjs";

const defenseCard = JSON.parse(readFileSync(new URL("../examples/defense-card.json", import.meta.url), "utf8"));
const hrCard = JSON.parse(readFileSync(new URL("../examples/hr-card.json", import.meta.url), "utf8"));
const dupCard = JSON.parse(readFileSync(new URL("../examples/defense-duplicate-card.json", import.meta.url), "utf8"));

test("merges multi-vertical cards into single timeline", () => {
  const r = mergeIncidentCards([defenseCard, hrCard]);
  assert.equal(r.timeline.length, 2);
  // HR card is earlier (Oct 15) — should come first
  assert.equal(r.timeline[0].vertical, "hrtech");
  assert.equal(r.timeline[1].vertical, "defensetech");
});

test("dedup catches same-contractor + same-event_type within 15min", () => {
  const r = mergeIncidentCards([defenseCard, dupCard]);
  assert.equal(r.dedup_report.unique_after_dedup, 1);
  assert.equal(r.dedup_report.duplicates.length, 1);
  assert.equal(r.dedup_report.duplicates[0].keeper, "STRATOS-INC-2026-DFARS-0011");
});

test("dedup does NOT collapse different event_types", () => {
  const r = mergeIncidentCards([defenseCard, hrCard]);
  assert.equal(r.dedup_report.duplicates.length, 0);
  assert.equal(r.dedup_report.unique_after_dedup, 2);
});

test("severity distribution counts", () => {
  const r = mergeIncidentCards([defenseCard, hrCard]);
  assert.equal(r.severity_distribution["S2-critical"], 1);
  assert.equal(r.severity_distribution["S3-significant"], 1);
});

test("high_severity_first surfaces S1/S2 sorted by time", () => {
  const r = mergeIncidentCards([defenseCard, hrCard]);
  assert.equal(r.high_severity_first.length, 1);
  assert.equal(r.high_severity_first[0].incident_id, "STRATOS-INC-2026-DFARS-0011");
});

test("referral matrix routes DFARS card to DoD CIO", () => {
  const r = mergeIncidentCards([defenseCard]);
  assert.ok(r.referral_matrix.defensetech);
  assert.ok(Object.keys(r.referral_matrix.defensetech).some((k) => k.includes("DoD CIO")));
});

test("vertical inference falls through to event_type substring", () => {
  const fpCard = { incident_id: "X", contractor: { id_tokenized: "tok_x" }, event_type: "fcra-section-615-failure", occurred_at: "2026-01-01T00:00:00Z", severity: "S3-significant" };
  const r = mergeIncidentCards([fpCard]);
  assert.equal(r.timeline[0].vertical, "fintech");
});

test("empty input returns empty result without crashing", () => {
  const r = mergeIncidentCards([]);
  assert.equal(r.timeline.length, 0);
  assert.equal(r.dedup_report.unique_after_dedup, 0);
});
