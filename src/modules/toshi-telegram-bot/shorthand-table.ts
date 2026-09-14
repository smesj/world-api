// Source of truth for the shorthand codes is the "Recording Game Results
// (Workflow)" section of world-api/.claude-context.md, which documents the
// same table for the manual (human-pasted) recording flow. Keep this in sync
// by hand if that table ever changes (new category, new typo variant seen).
export const SHORTHAND_DECODE_TABLE = `
| Codes seen | Category (ToshiRanboScore column) |
|---|---|
| 1f, f1 | fightWin1f — First Fight Win |
| 2f, f2 | fightWin2f — Second Fight Win |
| 3v, 3c | threeVillages — "3 villages" (NOT "3 cities" despite the c) |
| 1t | firstToshiRanbo — permanent point for first to Toshi Ranbo |
| tr | heldToshiRanbo — separate transient point for holding it, stacks with 1t |
| 2s, 2sh | twoShrines |
| 3n, 3o | threeNobleActions (3o is a typo of 3n — o/n are adjacent keys) |
| 2b | twoBuildings |
| 3t | threeTactics |
| c1, 1c | clanGoal1 — First Clan Goal |
| c2, 2c | clanGoal2 — Second Clan Goal |
`.trim();

// Every boolean flag on ToshiRanboScore, in the order the DTO expects them.
export const SCORE_FLAG_KEYS = [
  'fightWin1f',
  'fightWin2f',
  'threeVillages',
  'firstToshiRanbo',
  'heldToshiRanbo',
  'twoShrines',
  'threeNobleActions',
  'twoBuildings',
  'threeTactics',
  'clanGoal1',
  'clanGoal2',
] as const;
