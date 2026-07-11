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
const installerScriptPath = path.join(projectRoot, 'scripts', 'windows-installer.nsi')
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
    shell: false,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}.`)
  }
}

function resolveMakensisPath() {
  const candidates = [
    'makensis',
    path.join('C:\\Program Files (x86)', 'NSIS', 'makensis.exe'),
    path.join('C:\\Program Files', 'NSIS', 'makensis.exe'),
  ]

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['/VERSION'], {
      cwd: projectRoot,
      stdio: 'ignore',
      shell: false,
      windowsHide: true,
    })

    if (!result.error && result.status === 0) {
      return candidate
    }
  }

  throw new Error(
    [
      'NSIS (makensis) is required to build the Windows installer.',
      'Install NSIS from https://nsis.sourceforge.io/Download and re-run npm run build:windows.',
    ].join(' '),
  )
}

function compileInstallerWithNsis() {
  const makensisPath = resolveMakensisPath()
  const args = [
    `/DPROJECT_ROOT=${projectRoot}`,
    `/DPAYLOAD_ZIP=${installerPayloadZip}`,
    `/DOUTPUT_EXE=${outputSetupExe}`,
    installerScriptPath,
  ]

  runOrThrow(makensisPath, args)
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
  await ensureExists(installerScriptPath, 'NSIS installer script')
  compileInstallerWithNsis()

  await ensureExists(outputSetupExe, 'Setup executable')
  console.log(`Created setup executable: ${outputSetupExe}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
