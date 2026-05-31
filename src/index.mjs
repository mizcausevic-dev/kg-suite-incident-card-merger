// index.mjs — Merge N Incident Cards into cross-vertical timeline + referral matrix.
//
// Input: array of Incident Card objects (each from any vertical).
// Output: { timeline, referral_matrix, severity_distribution, dedup_report }

const VERTICAL_BY_EVENT_PREFIX = {
  "defensetech": "defensetech",
  "dfars": "defensetech",
  "cui": "defensetech",
  "itar": "defensetech",
  "ear": "defensetech",
  "cmmc": "defensetech",
  "nispom": "defensetech",
  "scif": "defensetech",
  "classified": "defensetech",
  "foreign-person": "defensetech",
  "energytech": "energytech",
  "cip-008": "energytech",
  "nerc": "energytech",
  "tsa-sd": "energytech",
  "grid": "energytech",
  "legaltech": "legaltech",
  "mata-v-avianca": "legaltech",
  "privilege-waiver": "legaltech",
  "fintech": "fintech",
  "fcra": "fintech",
  "ecoa": "fintech",
  "cfpb": "fintech",
  "fincen": "fintech",
  "hrtech": "hrtech",
  "ai-eeoc": "hrtech",
  "ai-nyc-ll-144": "hrtech",
  "ai-il-820-ilcs-42": "hrtech",
  "insurtech": "insurtech",
  "naic": "insurtech",
  "proptech": "proptech",
  "mortgage": "proptech",
  "title-chain": "proptech",
  "edtech": "edtech",
  "ferpa": "edtech",
  "coppa": "edtech",
  "ai-student": "edtech",
  "govtech": "govtech",
  "omb-m-24-10": "govtech",
  "federal-ai-use-case-inventory": "govtech",
  "healthtech": "healthtech",
  "fda": "healthtech",
  "medical-adverse": "healthtech",
  "hipaa": "healthtech"
};

function inferVertical(card) {
  if (card.vertical) return card.vertical;
  const et = card.event_type || "";
  for (const [prefix, vertical] of Object.entries(VERTICAL_BY_EVENT_PREFIX)) {
    if (et.includes(prefix)) return vertical;
  }
  return "unknown";
}

function severityRank(s) {
  const map = { "S1-catastrophic": 1, "S2-critical": 2, "S3-significant": 3, "S4-moderate": 4, "S5-low": 5 };
  return map[s] ?? 9;
}

/**
 * Dedup heuristic: two cards are "the same incident" if they share
 * the same contractor identifier AND the same occurred_at within ±15 min
 * AND the same event_type. We mark the second one as a duplicate-of
 * the first, keeping both in the timeline but flagging the relationship.
 */
function findDuplicates(cards) {
  const duplicates = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i], b = cards[j];
      const aId = a.contractor?.cage_code_tokenized || a.contractor?.id_tokenized || a.contractor?.duns_tokenized;
      const bId = b.contractor?.cage_code_tokenized || b.contractor?.id_tokenized || b.contractor?.duns_tokenized;
      if (!aId || aId !== bId) continue;
      if (a.event_type !== b.event_type) continue;
      const da = new Date(a.occurred_at).getTime();
      const db = new Date(b.occurred_at).getTime();
      if (Math.abs(da - db) > 15 * 60 * 1000) continue;
      duplicates.push({ keeper: a.incident_id, duplicate: b.incident_id, reason: "same contractor + event_type + within 15min" });
    }
  }
  return duplicates;
}

export function mergeIncidentCards(cards) {
  // 1) Annotate each card with its inferred vertical
  const annotated = cards.map((c) => ({ ...c, _vertical: inferVertical(c) }));

  // 2) Deduplicate
  const duplicates = findDuplicates(annotated);
  const dupIds = new Set(duplicates.map((d) => d.duplicate));
  const unique = annotated.filter((c) => !dupIds.has(c.incident_id));

  // 3) Sort timeline by occurred_at ascending
  const timeline = [...unique].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));

  // 4) Severity distribution
  const severity_distribution = unique.reduce((acc, c) => {
    acc[c.severity] = (acc[c.severity] ?? 0) + 1;
    return acc;
  }, {});

  // 5) Referral matrix: per (vertical, regulator) → list of incident_ids that should refer there
  const referral_matrix = {};
  for (const c of unique) {
    const verticalKey = c._vertical;
    referral_matrix[verticalKey] ??= {};
    const refs = [];
    if (c.dfars_72_hour_report_filed) refs.push("DoD CIO (dibnet.dod.mil)");
    if (c.public_disclosure_posture?.dibnet_reported) refs.push("DoD CIO (dibnet.dod.mil)");
    if (c.public_disclosure_posture?.ddtc_voluntary_disclosure_filed) refs.push("DDTC voluntary disclosure");
    if (c.public_disclosure_posture?.bis_voluntary_disclosure_filed) refs.push("BIS voluntary disclosure");
    for (const r of refs) {
      referral_matrix[verticalKey][r] ??= [];
      referral_matrix[verticalKey][r].push(c.incident_id);
    }
  }

  // 6) Cross-vertical hot spots: any vertical with ≥3 incidents
  const counts = Object.entries(unique.reduce((acc, c) => { acc[c._vertical] = (acc[c._vertical] ?? 0) + 1; return acc; }, {}));
  const hotspots = counts.filter(([_, n]) => n >= 3).map(([v, n]) => ({ vertical: v, incident_count: n }));

  // 7) Earliest catastrophic / critical for surfacing
  const highSeverity = [...unique]
    .filter((c) => severityRank(c.severity) <= 2)
    .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));

  return {
    timeline: timeline.map((c) => ({
      incident_id: c.incident_id,
      vertical: c._vertical,
      occurred_at: c.occurred_at,
      event_type: c.event_type,
      severity: c.severity
    })),
    referral_matrix,
    severity_distribution,
    hotspots,
    high_severity_first: highSeverity.map((c) => ({ incident_id: c.incident_id, occurred_at: c.occurred_at, vertical: c._vertical, severity: c.severity })),
    dedup_report: {
      total_input: cards.length,
      unique_after_dedup: unique.length,
      duplicates
    }
  };
}
