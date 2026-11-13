// Fills `stars`, `createdAt` and `updatedAt` of every entry with a `repo`
// in `data/frameworks.json` and `data/adjacent.json`, from the API of the
// host in the URL of its `repo`:
//
// - GitHub (`github.com`): `updatedAt` is the last push (`pushed_at`, not
//   `updated_at`, which a star also changes).
// - GitLab (`gitlab.com`, or a host named `gitlab.*`): `updatedAt` is the
//   last activity.
// - Any other host is read as a Gitea or Forgejo (Codeberg, a self-hosted
//   Gitea): `updatedAt` is its `updated_at`.
//
// `stars` is the star count of `repo`, `createdAt` the day the repository
// was created (of `originRepo` when the project moved). It also prints the
// entries whose `status` disagrees with the archived flag of their host,
// and leaves them for a person to decide. An entry its host does not answer
// for keeps its values, and the run says so (SKIPPED).
//
// Run: GITHUB_TOKEN=<token> node scripts/fetch-repo-stats.mjs
// The token is optional and only sent to GitHub: without it the GitHub API
// allows 60 requests an hour, fewer than one run needs. Then format the
// files: pnpm run format
import { readFile, writeFile } from 'node:fs/promises'

const FILES = ['../data/frameworks.json', '../data/adjacent.json'].map(
  (path) => new URL(path, import.meta.url),
)

const USER_AGENT = 'tea-ecosystem (+https://github.com/rinn7e/tea-ecosystem)'

const dayOf = (timestamp) => timestamp.slice(0, 10)

const getJson = async (url, extraHeaders) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      ...extraHeaders,
    },
  })
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`)
  } else {
    return response.json()
  }
}

const fromGitHub = async (owner, name) => {
  const body = await getJson(`https://api.github.com/repos/${owner}/${name}`, {
    Accept: 'application/vnd.github+json',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  })
  return {
    stars: body.stargazers_count,
    createdAt: dayOf(body.created_at),
    updatedAt: dayOf(body.pushed_at),
    archived: body.archived,
  }
}

const fromGitLab = async (host, owner, name) => {
  const path = encodeURIComponent(`${owner}/${name}`)
  const body = await getJson(`https://${host}/api/v4/projects/${path}`)
  return {
    stars: body.star_count,
    createdAt: dayOf(body.created_at),
    updatedAt: dayOf(body.last_activity_at),
    archived: body.archived,
  }
}

const fromGitea = async (host, owner, name) => {
  const body = await getJson(`https://${host}/api/v1/repos/${owner}/${name}`)
  return {
    stars: body.stars_count,
    createdAt: dayOf(body.created_at),
    updatedAt: dayOf(body.updated_at),
    archived: body.archived,
  }
}

// `repo` is a full URL: `https://<host>/<owner>/<name>`
const fetchRepo = async (repo) => {
  const { host, pathname } = new URL(repo)
  const [owner, name] = pathname.split('/').filter((part) => part !== '')
  if (host === 'github.com') {
    return fromGitHub(owner, name)
  } else if (host === 'gitlab.com' || host.startsWith('gitlab.')) {
    return fromGitLab(host, owner, name)
  } else {
    return fromGitea(host, owner, name)
  }
}

const statsOf = async (entry) => {
  const { stars, updatedAt, archived, ...current } = await fetchRepo(entry.repo)
  const { createdAt } =
    entry.originRepo === undefined ? current : await fetchRepo(entry.originRepo)
  return { stars, createdAt, updatedAt, archived }
}

for (const file of FILES) {
  const entries = JSON.parse(await readFile(file, 'utf8'))
  const updated = []
  for (const entry of entries) {
    if (entry.repo === undefined) {
      updated.push(entry)
    } else {
      try {
        const { stars, createdAt, updatedAt, archived } = await statsOf(entry)
        updated.push({ ...entry, stars, createdAt, updatedAt })
        const flag =
          archived !== (entry.status === 'archived') ? '  STATUS?' : ''
        console.log(
          `${entry.id}: ${stars} stars, ${createdAt} .. ${updatedAt}${archived ? ' archived' : ''}${flag}`,
        )
      } catch (error) {
        updated.push(entry)
        console.log(`${entry.id}: SKIPPED, ${error.message}`)
      }
    }
  }
  await writeFile(file, `${JSON.stringify(updated, null, 2)}\n`)
}
