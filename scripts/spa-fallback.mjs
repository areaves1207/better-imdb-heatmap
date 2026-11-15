// GitHub Pages serves 404.html for unknown paths; copying index.html there lets
// deep links like /show/tt0903747 load the app, which then routes client-side.
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
