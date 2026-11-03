/*
 * Where the song continues when the scheduling clock was late: after a frozen tab or a
 * sleeping laptop the missed bars are skipped (the song keeps its place) and playback
 * resumes almost immediately, instead of firing every missed note at once.
 */
export const RESUME_DELAY = 0.05;

export function nextBarAfter(
  bar: number,
  time: number,
  now: number,
  barSeconds: number
): { bar: number; time: number } {
  if (time >= now) return { bar, time };
  const missed = Math.floor((now - time) / barSeconds);
  return {
    bar: bar + missed + (now - time - missed * barSeconds > 0 ? 1 : 0),
    time: now + RESUME_DELAY
  };
}
