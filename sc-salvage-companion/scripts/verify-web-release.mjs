import { spawn } from 'node:child_process'

const STARTUP_TIMEOUT_MS = 20_000
const REQUEST_TIMEOUT_MS = 10_000
const BASE_URL = process.env.BETA_WEB_BASE_URL || 'http://127.0.0.1:8787'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function waitForServerReady(proc, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false

    const timer = setTimeout(() => {
      if (settled) {
        return
      }
      settled = true
      reject(new Error('Timed out waiting for server startup output.'))
    }, timeoutMs)

    const onData = (chunk) => {
      const text = String(chunk)
      process.stdout.write(text)
      if (text.includes('Auth server running on')) {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        resolve()
      }
    }

    const onExit = (code) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      reject(new Error(`Server exited before ready. Exit code: ${code}`))
    }

    proc.stdout.on('data', onData)
    proc.stderr.on('data', (chunk) => process.stderr.write(String(chunk)))
    proc.once('exit', onExit)
  })
}

async function verifyEndpoints() {
  const root = await fetchWithTimeout(BASE_URL, REQUEST_TIMEOUT_MS)
  if (!root.ok) {
    throw new Error(`Root page request failed with status ${root.status}.`)
  }

  const health = await fetchWithTimeout(`${BASE_URL}/api/health`, REQUEST_TIMEOUT_MS)
  if (!health.ok) {
    throw new Error(`/api/health request failed with status ${health.status}.`)
  }

  const healthBody = await health.text()
  if (!healthBody.includes('"ok":true')) {
    throw new Error(`/api/health returned unexpected body: ${healthBody}`)
  }
}

async function run() {
  const env = {
    ...process.env,
    OPEN_BROWSER: '0',
    PORT: process.env.PORT || '8787',
  }

  const server = spawn(process.execPath, ['server/index.js'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  try {
    await waitForServerReady(server, STARTUP_TIMEOUT_MS)
    await sleep(250)
    await verifyEndpoints()
    console.log('\nWeb beta smoke test passed: root page and /api/health are reachable.')
  } finally {
    if (!server.killed) {
      server.kill('SIGTERM')
    }
  }
}

run().catch((error) => {
  console.error(`\nWeb beta smoke test failed: ${error.message}`)
  process.exitCode = 1
})
