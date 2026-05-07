export type Stats = {
  sopsGenerated: number;
  universitiesSearched: number;
  profilesAnalyzed: number;
  chatMessages: number;
  lastActive: string;
};

const DEFAULT_STATS: Stats = {
  sopsGenerated: 0,
  universitiesSearched: 0,
  profilesAnalyzed: 0,
  chatMessages: 0,
  lastActive: '',
};

export function getStats(): Stats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem('ai_admission_stats');
    return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}

export function incrementStat(key: keyof Omit<Stats, 'lastActive'>, amount = 1) {
  if (typeof window === 'undefined') return;
  const stats = getStats();
  stats[key] = (stats[key] as number) + amount;
  stats.lastActive = new Date().toISOString();
  localStorage.setItem('ai_admission_stats', JSON.stringify(stats));
}