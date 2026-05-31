# kg-suite-incident-card-merger

> Merge N Kinetic Gain Protocol Suite Incident Cards from any verticals into a deduplicated cross-vertical incident timeline + regulator-referral matrix + severity distribution + hotspot detection.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com).

## Why this exists

Multi-vertical SaaS vendors publish Incident Cards across regulatory regimes over time. A buyer-side procurement reviewer doing a vendor due-diligence pass needs the consolidated picture, not 7 separate Cards:

- Which incidents share a contractor + time window (potential duplicates)?
- What's the cross-vertical severity distribution (S1/S2 catastrophic + critical concentration)?
- Which verticals are hotspots (≥3 incidents)?
- Which regulators should the buyer expect to hear from (DoD CIO, DDTC, BIS, EEOC, CFPB, ...)?

This tool answers all four questions in one merge pass.

## Usage

```bash
npm install -g kg-suite-incident-card-merger
kg-suite-incident-merge card1.json card2.json card3.json
# Input: 3 cards · Unique after dedup: 2
# Duplicates flagged: 1
#   - STRATOS-INC-...-DUP → duplicate-of STRATOS-INC-...-DFARS-0011 (same contractor + event_type + within 15min)
#
# Timeline (2 events):
#   2026-10-15T09:00:00Z  S3-significant   hrtech       ai-eeoc-disparate-impact-finding  [STRATOS-INC-2026-EEOC-0042]
#   2026-11-03T17:45:00Z  S2-critical      defensetech  dfars-72-hour-cyber-incident      [STRATOS-INC-2026-DFARS-0011]
#
# Severity distribution: { S2-critical: 1, S3-significant: 1 }
#
# Regulator referral matrix:
#   defensetech: DoD CIO (dibnet.dod.mil) ← STRATOS-INC-2026-DFARS-0011
```

Library API:
```js
import { mergeIncidentCards } from "kg-suite-incident-card-merger";

const result = mergeIncidentCards([card1, card2, card3]);
// { timeline, referral_matrix, severity_distribution, hotspots, high_severity_first, dedup_report }
```

## What gets deduplicated

Two cards are flagged as duplicates if they share **(contractor id + event_type + occurred_at within ±15 min)**. The second is marked `duplicate-of` the first. Both are retained in the dedup report so reviewers can see the relationship.

Different event_types for the same contractor stay as separate incidents — they're different regulatory triggers, even if temporally close.

## Composes with

- All 10 verticals' Incident Card profiles ([healthtech](https://github.com/mizcausevic-dev/medical-adverse-event-incident-card) · [edtech](https://github.com/mizcausevic-dev/ai-student-record-incident-card-profile) · [proptech](https://github.com/mizcausevic-dev/title-chain-evidence-incident-card-profile) · [insurtech](https://github.com/mizcausevic-dev/unfair-discrimination-incident-card-profile) · [hrtech](https://github.com/mizcausevic-dev/employment-ai-incident-card-profile) · [fintech](https://github.com/mizcausevic-dev/financial-ai-incident-card-profile) · [govtech](https://github.com/mizcausevic-dev/government-ai-incident-card-profile) · [legaltech](https://github.com/mizcausevic-dev/legal-ai-incident-card-profile) · [energytech](https://github.com/mizcausevic-dev/grid-operations-incident-card-profile) · [defensetech](https://github.com/mizcausevic-dev/defense-ai-incident-card-profile))
- [`kg-suite-multi-vertical-conformance`](https://github.com/mizcausevic-dev/kg-suite-multi-vertical-conformance) — for ANY-artifact applicability detection; this tool focuses specifically on Incident Cards
- [Kinetic Gain Protocol Suite](https://suite.kineticgain.com) — umbrella

## License

MIT.
