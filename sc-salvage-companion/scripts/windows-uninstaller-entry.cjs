const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs/promises')
const path = require('node:path')

const APP_DIR = path.join(process.env.LOCALAPPDATA || process.cwd(), 'SCSalvageCompanion')
const UNINSTALLER_EXE = path.join(APP_DIR, 'SCSalvageCompanion-Uninstall.exe')
const TEMP_HELPER_EXE = path.join(
  process.env.TEMP || APP_DIR,
  `SCSalvageCompanion-Uninstall-Helper-${process.pid}.exe`,
)

function isCleanupMode() {
  return process.argv.includes('--cleanup')
}

function removeShortcuts() {
  const command = [
    '$desktop = [Environment]::GetFolderPath("Desktop")',
    '$programs = [Environment]::GetFolderPath("Programs")',
    '$desktopLink = Join-Path $desktop "SC Salvage Companion.lnk"',
    '$startMenuDir = Join-Path $programs "SC Salvage Companion"',
    'if (Test-Path $desktopLink) { Remove-Item $desktopLink -Force -ErrorAction SilentlyContinue }',
    'if (Test-Path $startMenuDir) { Remove-Item $startMenuDir -Recurse -Force -ErrorAction SilentlyContinue }',
  ].join('; ')

  spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    stdio: 'ignore',
    windowsHide: true,
  })
}

function stopRunningLauncher() {
  spawnSync('taskkill', ['/IM', 'SCSalvageCompanion.exe', '/F'], {
    stdio: 'ignore',
    windowsHide: true,
  })
}

function deleteTempHelper(temporaryExePath) {
  const command = `timeout /t 2 /nobreak >nul & del /f /q "${temporaryExePath}"`
  const child = spawn('cmd.exe', ['/c', command], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: process.env.TEMP || process.cwd(),
  })

  child.unref()
}

async function runCleanupMode() {
  removeShortcuts()
  stopRunningLauncher()

  await fs.rm(APP_DIR, { recursive: true, force: true })

  if (process.execPath.toLowerCase() !== UNINSTALLER_EXE.toLowerCase()) {
    deleteTempHelper(process.execPath)
  }

  console.log('SC Salvage Companion uninstalled.')
}

async function runBootstrapMode() {
  await fs.copyFile(process.execPath, TEMP_HELPER_EXE)

  const child = spawn(TEMP_HELPER_EXE, ['--cleanup'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: process.env.TEMP || process.cwd(),
  })

  child.unref()
}

async function run() {
  if (isCleanupMode()) {
    await runCleanupMode()
    return
  }

  await runBootstrapMode()
  console.log('SC Salvage Companion uninstalled.')
}

run().catch((error) => {
  console.error(error?.message || String(error))
  process.exit(1)
})
