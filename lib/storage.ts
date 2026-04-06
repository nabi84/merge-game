const BEST_SCORE_KEY = "merge-han.best-score";

export function loadBestScore() {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(BEST_SCORE_KEY);
  const value = raw ? Number(raw) : 0;

  return Number.isFinite(value) ? value : 0;
}

export function saveBestScore(score: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BEST_SCORE_KEY, String(score));
}
