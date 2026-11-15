import { useState } from 'react'

// Heatmap color palettes. The colors themselves are CSS variables in index.css;
// this just switches data-palette on <html> and remembers the choice.
//   green: red (worse) -> gray -> green (better). Default.
//   blue:  red (worse) -> gray -> blue (better). Readable with red-green color blindness.
export type Palette = 'green' | 'blue'

export const PALETTES: { id: Palette; label: string }[] = [
  { id: 'green', label: 'Red / green' },
  { id: 'blue', label: 'Color-blind friendly' },
]

export function usePalette(): [Palette, (p: Palette) => void] {
  // index.html already applied the saved choice before React loaded
  const [palette, setPalette] = useState<Palette>(() =>
    document.documentElement.dataset.palette === 'blue' ? 'blue' : 'green',
  )
  const choose = (p: Palette) => {
    document.documentElement.dataset.palette = p
    try {
      localStorage.setItem('palette', p)
    } catch {
      // storage blocked: the choice just won't be remembered
    }
    setPalette(p)
  }
  return [palette, choose]
}
