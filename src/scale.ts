// Diverging color scale for ratings: red arm (worse) <- neutral gray <- blue arm (better).
// Red/blue rather than red/green so it stays readable with red-green color blindness.
// Bins are tuned to IMDb episode ratings, which cluster around 7.5–8.

export interface Bin {
  min: number
  label: string
  /** CSS custom property holding the fill, so dark mode can restep the neutral */
  fill: string
  /** true when the fill is dark enough to need light text */
  darkFill: boolean
}

export const BINS: Bin[] = [
  { min: 9.5, label: '9.5+', fill: 'var(--r-9)', darkFill: true },
  { min: 9.0, label: '9.0', fill: 'var(--r-8)', darkFill: true },
  { min: 8.5, label: '8.5', fill: 'var(--r-7)', darkFill: false },
  { min: 8.0, label: '8.0', fill: 'var(--r-6)', darkFill: false },
  { min: 7.5, label: '7.5', fill: 'var(--r-5)', darkFill: false },
  { min: 7.0, label: '7.0', fill: 'var(--r-4)', darkFill: false },
  { min: 6.0, label: '6.0', fill: 'var(--r-3)', darkFill: false },
  { min: 5.0, label: '5.0', fill: 'var(--r-2)', darkFill: true },
  { min: -Infinity, label: '<5', fill: 'var(--r-1)', darkFill: true },
]

export const binFor = (rating: number): Bin => BINS.find((b) => rating >= b.min)!
