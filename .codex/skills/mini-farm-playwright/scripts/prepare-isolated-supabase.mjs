#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

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

function replaceTomlValue(text, key, value) {
  return text.replace(new RegExp(`^${key} = .*$`, 'm'), `${key} = ${value}`)
}

function replacePort(text, section, port) {
  const pattern = new RegExp(`(\\[${section}\\][\\s\\S]*?\\nport = )\\d+`)
  return text.replace(pattern, `$1${port}`)
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    encoding: 'utf8',
    stdio: options?.capture ? 'pipe' : 'inherit',
  })
  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : ''
    throw new Error(`${command} ${args.join(' ')} failed${stderr}`)
  }
  return result.stdout ?? ''
}

function parseStatusValue(status, label) {
  const line = status.split(/\r?\n/).find((entry) => entry.includes(`│ ${label}`))
  if (!line) return null
  const cells = line.split('│').map((cell) => cell.trim()).filter(Boolean)
  return cells.at(-1) ?? null
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    console.log(`Usage: prepare-isolated-supabase.mjs [options]

Options:
  --name <name>       Isolated project suffix (default: timestamp)
  --base-port <port>  First port to allocate (default: 55321)
  --dir <path>        Output project root (default: /tmp/mini-farm-playwright-<name>)
  --start             Run supabase start after preparing the temp project
  --help              Show this help
`)
    return
  }

  const scriptDir = dirname(fileURLToPath(import.meta.url))
  const repoRoot = resolve(scriptDir, '../../../..')
  const name = args.name ?? `${Date.now()}`
  const basePort = Number(args['base-port'] ?? 55321)
  const tempRoot = resolve(args.dir ?? `/tmp/mini-farm-playwright-${name}`)
  const tempSupabase = resolve(tempRoot, 'supabase')

  if (existsSync(tempRoot)) {
    throw new Error(`${tempRoot} already exists. Use a different --name or --dir.`)
  }

  mkdirSync(tempRoot, { recursive: true })
  cpSync(resolve(repoRoot, 'supabase'), tempSupabase, {
    recursive: true,
    filter: (src) => !src.includes('/.branches') && !src.includes('/.temp'),
  })

  const configPath = resolve(tempSupabase, 'config.toml')
  let config = readFileSync(configPath, 'utf8')
  config = replaceTomlValue(config, 'project_id', `"mini-farm-e2e-${name}"`)
  config = replacePort(config, 'api', basePort)
  config = replacePort(config, 'db', basePort + 1)
  config = config.replace(/shadow_port = \d+/, `shadow_port = ${basePort + 2}`)
  config = replacePort(config, 'studio', basePort + 3)
  config = replacePort(config, 'inbucket', basePort + 4)
  writeFileSync(configPath, config)

  console.log(`Prepared isolated Supabase project: ${tempRoot}`)
  console.log(`Project URL will be: http://127.0.0.1:${basePort}`)

  if (args.start) {
    run('supabase', ['start', '--workdir', tempRoot])
    const status = run('supabase', ['status', '--workdir', tempRoot], { capture: true })
    const publishableKey = parseStatusValue(status, 'Publishable')
    if (!publishableKey) {
      throw new Error('Could not parse Supabase publishable key from supabase status.')
    }

    const appPort = basePort - 52321 + 3100
    const envPath = resolve(tempRoot, '.env.isolated')
    writeFileSync(
      envPath,
      [
        `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${basePort}`,
        `SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
        `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
        `SUPABASE_INTERNAL_URL=http://127.0.0.1:${basePort}`,
        'DEVICE_API_KEY=dev-api-key-001',
        `NEXT_PUBLIC_SITE_URL=http://localhost:${appPort}`,
        '',
      ].join('\n'),
      { mode: 0o600 },
    )

    console.log(status)
    console.log(`Wrote app env: ${envPath}`)
    console.log(`Run app: cd app && env $(cat ${envPath} | xargs) npm run dev -- -p ${appPort}`)
    console.log(`Stop isolated Supabase: supabase stop --workdir ${tempRoot}`)
  }
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
