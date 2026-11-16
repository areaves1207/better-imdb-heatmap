import { useEffect } from 'react'

const REPO_ISSUES = 'https://github.com/areaves1207/better-imdb-heatmap/issues'

/** Privacy policy for the website and the TV Heatmap Chrome extension (linked from the Web Store). */
export function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy · IMDb Heatmap'
  }, [])

  return (
    <article className="prose">
      <h1>Privacy Policy</h1>
      <p className="prose-meta">Effective November 16, 2026</p>

      <p>
        This policy covers this website (heatmap.aidanreaves.com) and the <strong>TV Heatmap</strong> Chrome
        extension. Both show IMDb episode ratings for TV shows. Neither has accounts, ads, analytics or tracking,
        and neither sells or shares your information.
      </p>

      <h2>What is sent to our servers</h2>
      <p>
        When you search for a show or open one, the text you type and the show's IMDb ID are sent to our database
        (hosted by <a href="https://supabase.com/privacy">Supabase</a>) so it can return results. These requests
        are not linked to you or stored by us. Like most hosting providers, Supabase may keep standard request logs,
        such as IP addresses, for a limited time.
      </p>

      <h2>What stays on your device</h2>
      <p>
        Your settings are saved in your browser's local storage and never leave your device: the dark/light theme
        and the color palette. The extension also saves your six most recently viewed shows, where you were in the
        popup (show, season and episode), and your seasons layout choice, so it reopens where you left off. You can
        clear these by removing the extension or clearing your browser's site data.
      </p>

      <h2>What the extension does not do</h2>
      <p>
        The extension requests no browser permissions. It does not read the web pages you visit, your tabs, your
        browsing history or any other data in your browser. It only talks to our database, and opens IMDb or this
        website when you click a link to them.
      </p>

      <h2>Other services on this website</h2>
      <p>
        Show posters on this website are loaded from <a href="https://www.tvmaze.com/api">TVmaze</a> using the
        show's IMDb ID. The website is hosted on GitHub Pages, which may log visits as described in{' '}
        <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
          GitHub's privacy statement
        </a>
        .
      </p>

      <h2>Data source</h2>
      <p>
        Ratings come from IMDb's public datasets. Information courtesy of IMDb (
        <a href="https://www.imdb.com">https://www.imdb.com</a>). Used with permission. This project is not affiliated
        with IMDb.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If this policy changes, the updated version will be posted on this page with a new effective date. Questions
        can be raised on the project's <a href={REPO_ISSUES}>GitHub issues page</a>.
      </p>
    </article>
  )
}
