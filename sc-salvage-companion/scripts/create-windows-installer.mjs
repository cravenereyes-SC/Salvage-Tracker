import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const releaseRoot = path.join(projectRoot, 'release')
const appSourceDir = path.join(releaseRoot, 'win-app')
const frontendDistDir = path.join(projectRoot, 'dist')
const installerPayloadDir = path.join(projectRoot, 'build', 'installer-payload')
const installerPayloadZip = path.join(projectRoot, 'build', 'installer-payload.zip')
const installerPkgConfigPath = path.join(projectRoot, 'build', 'pkg-installer.json')
const launcherExePath = path.join(appSourceDir, 'SCSalvageCompanion.exe')
const uninstallerExePath = path.join(appSourceDir, 'SCSalvageCompanion-Uninstall.exe')
const outputSetupExe = path.join(releaseRoot, 'SCSalvageCompanion-Setup.exe')

async function ensureExists(targetPath, label) {
  try {
    await fs.access(targetPath)
  } catch {
    throw new Error(`${label} not found at ${targetPath}.`) 
  }
}

function runOrThrow(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}.`)
  }
}

async function stageInstallerPayload() {
  await ensureExists(launcherExePath, 'Launcher executable')
  await ensureExists(uninstallerExePath, 'Uninstaller executable')
  await ensureExists(path.join(frontendDistDir, 'index.html'), 'Built frontend')

  await fs.rm(installerPayloadDir, { recursive: true, force: true })
  await fs.mkdir(installerPayloadDir, { recursive: true })

  await fs.copyFile(launcherExePath, path.join(installerPayloadDir, 'SCSalvageCompanion.exe'))
  await fs.copyFile(uninstallerExePath, path.join(installerPayloadDir, 'SCSalvageCompanion-Uninstall.exe'))
  await fs.cp(frontendDistDir, path.join(installerPayloadDir, 'dist'), { recursive: true })

  await fs.rm(installerPayloadZip, { force: true })
  runOrThrow('powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    `Compress-Archive -Path '${installerPayloadDir}\\*' -DestinationPath '${installerPayloadZip}' -CompressionLevel Optimal`,
  ])

  await ensureExists(installerPayloadZip, 'Installer payload zip')
}

async function main() {
  await stageInstallerPayload()

  const installerPkgConfig = {
    name: 'sc-salvage-companion-installer',
    version: '1.0.0',
    private: true,
    bin: 'scripts/windows-installer-entry.cjs',
    pkg: {
      assets: ['build/installer-payload.zip'],
    },
  }
  await fs.writeFile(installerPkgConfigPath, `${JSON.stringify(installerPkgConfig, null, 2)}\n`, 'utf8')

  runOrThrow('npx', [
    'pkg',
    'scripts/windows-installer-entry.cjs',
    '--config',
    'build/pkg-installer.json',
    '--targets',
    'node18-win-x64',
    '--output',
    'release/SCSalvageCompanion-Setup.exe',
  ])

  await ensureExists(outputSetupExe, 'Setup executable')
  console.log(`Created setup executable: ${outputSetupExe}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
