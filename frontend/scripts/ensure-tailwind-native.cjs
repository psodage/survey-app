'use strict'
/**
 * Render (and some npm workspace installs) can skip @tailwindcss/oxide optional
 * platform packages. On Linux x64, ensure the matching Oxide binary is present
 * before Vite runs.
 */
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')

const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const req = createRequire(path.join(frontendRoot, 'package.json'))

const OXIDE_VERSION = '4.2.4'

function isLinuxMusl() {
  try {
    return fs.readFileSync('/usr/bin/ldd', 'utf8').includes('musl')
  } catch {
    return false
  }
}

function oxidePackageForPlatform() {
  if (process.platform !== 'linux') return null
  if (process.arch === 'x64') {
    return isLinuxMusl()
      ? '@tailwindcss/oxide-linux-x64-musl'
      : '@tailwindcss/oxide-linux-x64-gnu'
  }
  return null
}

function resolveOxide(pkg) {
  try {
    req.resolve(`${pkg}/package.json`)
    return true
  } catch {
    return false
  }
}

const oxidePkg = oxidePackageForPlatform()
if (!oxidePkg) {
  process.exit(0)
}

if (resolveOxide(oxidePkg)) {
  process.exit(0)
}

const spec = `${oxidePkg}@${OXIDE_VERSION}`
const rootPkgPath = path.join(repoRoot, 'package.json')
const useWorkspace =
  fs.existsSync(rootPkgPath) &&
  (() => {
    try {
      const p = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'))
      return Array.isArray(p.workspaces)
    } catch {
      return false
    }
  })()

console.warn(`[ensure-tailwind-native] Missing ${oxidePkg}; installing ${spec} (npm optional-deps workaround)...`)

try {
  if (useWorkspace) {
    execSync(`npm install ${spec} -w frontend --no-save --loglevel error`, {
      cwd: repoRoot,
      stdio: 'inherit',
    })
  } else {
    execSync(`npm install ${spec} --no-save --loglevel error`, {
      cwd: frontendRoot,
      stdio: 'inherit',
    })
  }
} catch {
  process.exit(1)
}

if (!resolveOxide(oxidePkg)) {
  console.error(`[ensure-tailwind-native] ${oxidePkg} still not resolvable after install.`)
  process.exit(1)
}
