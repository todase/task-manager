export function priorityColor(score: number): string {
  // Interpolate from blue (#3b82f6) at score=1 to gray (#e5e7eb) at score=0
  const r = Math.round(59 + (229 - 59) * (1 - score))
  const g = Math.round(130 + (231 - 130) * (1 - score))
  const b = Math.round(246 + (235 - 246) * (1 - score))
  return `rgb(${r}, ${g}, ${b})`
}
