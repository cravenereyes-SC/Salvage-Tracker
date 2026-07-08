const { spawnSync, spawn } = require('node:child_process')
const fs = require('node:fs/promises')
const path = require('node:path')

const APP_DIR = path.join(process.env.LOCALAPPDATA || process.cwd(), 'SCSalvageCompanion')
const PAYLOAD_ZIP = path.join(__dirname, '../build/installer-payload.zip')
const LAUNCHER_EXE = path.join(APP_DIR, 'SCSalvageCompanion.exe')
const UNINSTALLER_EXE = path.join(APP_DIR, 'SCSalvageCompanion-Uninstall.exe')

async function extractPayloadZip() {
  const tempZipPath = path.join(process.env.TEMP || APP_DIR, 'sc-salvage-companion-installer-payload.zip')
  await fs.copyFile(PAYLOAD_ZIP, tempZipPath)

  const command = `Expand-Archive -Path '${tempZipPath}' -DestinationPath '${APP_DIR}' -Force`
  const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    stdio: 'ignore',
    windowsHide: true,
  })

  await fs.rm(tempZipPath, { force: true })

  if (result.status !== 0) {
    throw new Error('Failed to extract installer payload.')
  }
}

function createShortcuts() {
  const escapedLauncher = LAUNCHER_EXE.replace(/\\/g, '\\\\')
  const escapedUninstaller = UNINSTALLER_EXE.replace(/\\/g, '\\\\')
  const escapedAppDir = APP_DIR.replace(/\\/g, '\\\\')

  const command = [
    '$ws = New-Object -ComObject WScript.Shell',
    '$desktop = [Environment]::GetFolderPath("Desktop")',
    '$programs = [Environment]::GetFolderPath("Programs")',
    '$startMenuDir = Join-Path $programs "SC Salvage Companion"',
    'if (!(Test-Path $startMenuDir)) { New-Item -ItemType Directory -Path $startMenuDir | Out-Null }',
    '$desktopLink = $ws.CreateShortcut((Join-Path $desktop "SC Salvage Companion.lnk"))',
    `$desktopLink.TargetPath = "${escapedLauncher}"`,
    `$desktopLink.WorkingDirectory = "${escapedAppDir}"`,
    '$desktopLink.Description = "Launch SC Salvage Companion"',
    '$desktopLink.Save()',
    '$startLink = $ws.CreateShortcut((Join-Path $startMenuDir "SC Salvage Companion.lnk"))',
    `$startLink.TargetPath = "${escapedLauncher}"`,
    `$startLink.WorkingDirectory = "${escapedAppDir}"`,
    '$startLink.Description = "Launch SC Salvage Companion"',
    '$startLink.Save()',
    '$uninstallLink = $ws.CreateShortcut((Join-Path $startMenuDir "Uninstall SC Salvage Companion.lnk"))',
    `$uninstallLink.TargetPath = "${escapedUninstaller}"`,
    `$uninstallLink.WorkingDirectory = "${escapedAppDir}"`,
    '$uninstallLink.Description = "Uninstall SC Salvage Companion"',
    '$uninstallLink.Save()',
  ].join('; ')

  const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    stdio: 'ignore',
    windowsHide: true,
  })

  if (result.status !== 0) {
    console.error('Warning: Could not create app shortcuts.')
  }
}

function launchApp() {
  const child = spawn(LAUNCHER_EXE, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })

  child.unref()
}

async function run() {
  await fs.mkdir(APP_DIR, { recursive: true })
  await extractPayloadZip()
  createShortcuts()
  launchApp()
  console.log(`Installed to ${APP_DIR}`)
}

run().catch((error) => {
  console.error(error?.message || String(error))
  process.exit(1)
})
