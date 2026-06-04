#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const STORAGE_KEY = 'mini-farm-auth-token'
const DEFAULT_EMAIL = 'dev@example.com'
const DEFAULT_PASSWORD = 'devpassword123'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i]
    if (!part.startsWith('--')) continue
    const eq = part.indexOf('=')
    if (eq >= 0) {
      args[part.slice(2, eq)] = part.slice(eq + 1)
    } else {
      const key = part.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args[key] = next
        i += 1
      } else {
        args[key] = 'true'
      }
    }
  }
  return args
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  const result = {}
  const text = readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[match[1]] = value
  }
  return result
}

function firstValue(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0)
}

function createChunks(key, value, chunkSize = 3180) {
  let encodedValue = encodeURIComponent(value)
  if (encodedValue.length <= chunkSize) return [{ name: key, value }]

  const chunks = []
  while (encodedValue.length > 0) {
    let encodedChunkHead = encodedValue.slice(0, chunkSize)
    const lastEscapePos = encodedChunkHead.lastIndexOf('%')
    if (lastEscapePos > chunkSize - 3) {
      encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos)
    }

    let valueHead = ''
    while (encodedChunkHead.length > 0) {
      try {
        valueHead = decodeURIComponent(encodedChunkHead)
        break
      } catch (error) {
        if (
          error instanceof URIError &&
          encodedChunkHead.at(-3) === '%' &&
          encodedChunkHead.length > 3
        ) {
          encodedChunkHead = encodedChunkHead.slice(0, encodedChunkHead.length - 3)
        } else {
          throw error
        }
      }
    }

    chunks.push(valueHead)
    encodedValue = encodedValue.slice(encodedChunkHead.length)
  }

  return chunks.map((value, index) => ({ name: `${key}.${index}`, value }))
}

async function signIn({ supabaseUrl, anonKey, email, password }) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const body = await response.text()
    const repairHint =
      body.includes('invalid_credentials') || body.includes('Invalid login credentials')
        ? '\nSeed auth may be missing auth.identities. See .codex/skills/mini-farm-playwright/references/ensure-seed-auth.sql and run it only when local auth repair is intended.'
        : ''
    throw new Error(`Supabase password sign-in failed: ${response.status} ${body}${repairHint}`)
  }

  return response.json()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    console.log(`Usage: prepare-auth-state.mjs [options]

Options:
  --base-url <url>       App origin for cookie/localStorage state (default: http://localhost:3000)
  --supabase-url <url>   Supabase API URL (default: env or http://localhost:54321)
  --anon-key <key>       Supabase anon/publishable key (default: env)
  --email <email>        Seed auth email (default: ${DEFAULT_EMAIL})
  --password <password>  Seed auth password (default: ${DEFAULT_PASSWORD})
  --out <path>           Storage state output (default: /tmp/mini-farm-playwright-auth.json)
  --help                 Show this help
`)
    return
  }

  const scriptDir = dirname(fileURLToPath(import.meta.url))
  const repoRoot = resolve(scriptDir, '../../../..')
  const rootEnv = parseEnvFile(resolve(repoRoot, '.env'))
  const appEnv = parseEnvFile(resolve(repoRoot, 'app/.env.local'))
  const appEnvDev = parseEnvFile(resolve(repoRoot, 'app/.env.development.local'))
  const env = { ...rootEnv, ...appEnv, ...appEnvDev, ...process.env }

  const baseUrl = args['base-url'] ?? 'http://localhost:3000'
  const base = new URL(baseUrl)
  const supabaseUrl = firstValue(
    args['supabase-url'],
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_URL,
    'http://localhost:54321',
  )
  const anonKey = firstValue(
    args['anon-key'],
    env.SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  const email = args.email ?? env.MINI_FARM_E2E_EMAIL ?? DEFAULT_EMAIL
  const password = args.password ?? env.MINI_FARM_E2E_PASSWORD ?? DEFAULT_PASSWORD
  const out = args.out ?? '/tmp/mini-farm-playwright-auth.json'

  if (!anonKey) {
    throw new Error(
      'Missing Supabase anon/publishable key. Set SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  const session = await signIn({ supabaseUrl, anonKey, email, password })
  const sessionValue = JSON.stringify(session)
  const expires = session.expires_at ?? Math.floor(Date.now() / 1000) + 3600
  const cookieBase = {
    domain: base.hostname,
    path: '/',
    expires,
    httpOnly: false,
    secure: base.protocol === 'https:',
    sameSite: 'Lax',
  }
  const cookies = createChunks(STORAGE_KEY, sessionValue).map((chunk) => ({
    ...cookieBase,
    name: chunk.name,
    value: chunk.value,
  }))

  const state = {
    cookies,
    origins: [
      {
        origin: base.origin,
        localStorage: [{ name: STORAGE_KEY, value: sessionValue }],
      },
    ],
  }

  writeFileSync(out, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  console.log(`Wrote Playwright auth state for ${email} to ${out}`)
  console.log(`Use: playwright codegen --load-storage=${out} ${base.origin}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
