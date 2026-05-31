# Changelog

## [0.1] — 2026-05-31

### Added

- Initial release. `mergeIncidentCards(cards)` accepts an array of Incident Cards from any vertical and produces a consolidated cross-vertical view.
- Vertical inference: explicit `card.vertical` if set, else inferred from event_type substring (covers all 10 verticals' typical event-type prefixes).
- Dedup heuristic: same (contractor + event_type + occurred_at ±15min) → flagged as duplicate; both retained in dedup report.
- Outputs: chronological timeline, regulator referral matrix (DoD CIO / DDTC / BIS / others surfaced from `dfars_72_hour_report_filed` + `public_disclosure_posture` blocks), severity distribution, hotspot detection (≥3 incidents per vertical), `high_severity_first` quickview (S1/S2 sorted by time).
- `kg-suite-incident-merge` CLI accepting multiple JSON files, `--json` mode.
- 8 unit tests covering: timeline ordering, dedup catches same event_type, dedup doesn't collapse different event_types, severity distribution, high-severity surfacing, referral routing, vertical fallback inference, empty input.

### Not yet

- Time-window-tunable dedup (today fixed at ±15 min).
- Ingest from a publicly-hosted Incident Card index URL (today reads local files only).
- Per-regulator deadline tracking (e.g., "DDTC voluntary disclosure within X days").
- Diff-against-prior-merge (would let a reviewer spot newly-added incidents since their last review).
