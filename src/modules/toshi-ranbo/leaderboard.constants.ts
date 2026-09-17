// Ranbo Rating constants — locked in design session on 2026-09-16.
//
// league_avg is the shared shrinkage anchor every player's Season Average
// is pulled toward. It's pinned once per season and held fixed for that
// entire season (deliberately NOT recomputed live) so nobody's score moves
// on a night they didn't play. Season 1 has no prior season to inherit
// from, so this is the empirical average `adjusted` score across the 9
// games recorded before this system went live (156 / 34 score rows).
// Season 2+ should inherit the actual final average of the season before
// it, computed fresh at that boundary — not derived from this constant.
export const SEASON_1_LEAGUE_AVG = 156 / 34;

// Shrinkage buffer for Season Average: how many "phantom" games of
// league_avg a player's own record must outweigh before it's trusted on
// its own. Same buffer size reused for Recent Form (shrunk toward the
// player's own Season Average instead of the league one).
export const SEASON_SHRINK_K = 2;
export const RECENT_FORM_K = 2;

// How many of a player's most recent games count toward Recent Form.
export const RECENT_FORM_WINDOW = 5;

// Composite blend: Rating = (1 - RECENT_FORM_WEIGHT) * SeasonAvg + RECENT_FORM_WEIGHT * RecentForm.
export const RECENT_FORM_WEIGHT = 0.3;
