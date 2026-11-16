// GitHub Pages serves 404.html for unknown paths; copying index.html there lets
// deep links like /show/tt0903747 load the app, which then routes client-side.
import { copyFileSync, mkdirSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')

// Pages that must answer with a real 200 status (not the 404 fallback), such as the privacy
// policy the Chrome Web Store links to: give each its own index.html.
for (const page of ['privacy']) {
  mkdirSync(`dist/${page}`, { recursive: true })
  copyFileSync('dist/index.html', `dist/${page}/index.html`)
}
