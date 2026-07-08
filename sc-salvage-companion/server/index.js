import cors from 'cors'
import express from 'express'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const DIST_DIR = path.join(__dirname, '..', 'dist')
const PORT = Number(process.env.PORT) || 8787
const cargoCapacityCache = new Map()

const app = express()

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:5173']

app.use(cors({ origin: corsOrigins }))
app.use(express.json())

async function ensureDataStore() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(USERS_FILE)
  } catch {
    await fs.writeFile(USERS_FILE, '[]', 'utf8')
  }
}

async function readUsers() {
  await ensureDataStore()
  const raw = await fs.readFile(USERS_FILE, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8')
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function normalizeCallsign(callsign) {
  return String(callsign ?? '').trim().toLowerCase()
}

function normalizeShipName(name) {
  return String(name ?? '').trim()
}

async function queryCargoCapacityByTitle(title) {
  const query = `[[${title}]]|?Cargo capacity`
  const url = `https://starcitizen.tools/api.php?action=ask&query=${encodeURIComponent(query)}&format=json`

  const response = await fetch(url)
  if (!response.ok) {
    return null
  }

  const payload = await response.json()
  const firstResult = Object.values(payload?.query?.results ?? {})[0]
  const value = firstResult?.printouts?.['Cargo capacity']?.[0]
  const capacity = Number(value)

  if (!Number.isFinite(capacity) || capacity < 0) {
    return null
  }

  return Math.round(capacity)
}

async function fetchCargoCapacityFromInternet(shipName) {
  const normalized = normalizeShipName(shipName)
  if (!normalized) {
    return null
  }

  if (cargoCapacityCache.has(normalized.toLowerCase())) {
    return cargoCapacityCache.get(normalized.toLowerCase())
  }

  const directCandidates = [
    normalized,
    normalized.replace(/\s+b\/?i\/?s$/i, '').trim(),
    normalized.replace(/^(Drake|Anvil|Aegis|MISC|Origin|RSI|Crusader|Argo|Mirai)\s+/i, '').trim(),
  ].filter(Boolean)

  for (const candidate of directCandidates) {
    const capacity = await queryCargoCapacityByTitle(candidate)
    if (capacity !== null) {
      cargoCapacityCache.set(normalized.toLowerCase(), capacity)
      return capacity
    }
  }

  const searchUrl = `https://starcitizen.tools/api.php?action=opensearch&search=${encodeURIComponent(normalized)}&limit=5&namespace=0&format=json`
  const searchResponse = await fetch(searchUrl)
  if (!searchResponse.ok) {
    return null
  }

  const searchPayload = await searchResponse.json()
  const titles = Array.isArray(searchPayload?.[1]) ? searchPayload[1] : []

  for (const title of titles) {
    const capacity = await queryCargoCapacityByTitle(String(title))
    if (capacity !== null) {
      cargoCapacityCache.set(normalized.toLowerCase(), capacity)
      return capacity
    }
  }

  return null
}

function hashPassword(password, salt) {
  const finalSalt = salt || randomBytes(16).toString('hex')
  const derived = scryptSync(password, finalSalt, 64).toString('hex')
  return { hash: derived, salt: finalSalt }
}

function verifyPassword(password, hash, salt) {
  const candidate = scryptSync(password, salt, 64)
  const actual = Buffer.from(hash, 'hex')
  return actual.length === candidate.length && timingSafeEqual(actual, candidate)
}

function getWorkOrderDurationMinutes(type) {
  switch (String(type).trim()) {
    case 'Salvage':
      return 180
    case 'Mining':
      return 120
    case 'Cargo':
      return 90
    case 'Recovery':
      return 60
    case 'Survey':
      return 45
    default:
      return 120
  }
}

function sanitizeUser(user) {
  const financial = user && typeof user.financial === 'object' ? user.financial : {}
  const sessions = user && typeof user.sessions === 'object' ? user.sessions : {}
  const activeWorkOrders = Array.isArray(user?.activeWorkOrders) ? user.activeWorkOrders : []

  return {
    callsign: user.callsign,
    email: user.email,
    createdAt: user.createdAt,
    role: user.role,
    ship: user.ship,
    ownedShips: Array.isArray(user.ownedShips) ? user.ownedShips : [],
    financial: {
      currentBalance: Number(financial.currentBalance) || 0,
      totalEarnings: Number(financial.totalEarnings) || 0,
      totalCosts: Number(financial.totalCosts) || 0,
    },
    sessions: {
      totalSessions: Number(sessions.totalSessions) || 0,
      salvageSessions: Number(sessions.salvageSessions) || 0,
      miningSessions: Number(sessions.miningSessions) || 0,
      totalProfit: Number(sessions.totalProfit) || 0,
    },
    activeWorkOrders: activeWorkOrders
      .filter((workOrder) => workOrder && typeof workOrder === 'object')
      .map((workOrder) => ({
        id: String(workOrder.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        location: String(workOrder.location ?? '').trim(),
        type: String(workOrder.type ?? '').trim(),
        startedAt: Number(workOrder.startedAt) || Date.now(),
        functioningTimeMinutes:
          Number(workOrder.functioningTimeMinutes) || getWorkOrderDurationMinutes(workOrder.type),
      }))
      .filter((workOrder) => workOrder.location && workOrder.type),
  }
}

function issueToken() {
  return randomBytes(24).toString('base64url')
}

app.post('/api/auth/register', async (req, res) => {
  const { callsign, email, password, role, ship, ownedShips, financial, sessions, activeWorkOrders } = req.body ?? {}

  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !password || !callsign || !role || !ship) {
    return res.status(400).json({ error: 'Missing required registration fields.' })
  }

  const users = await readUsers()
  const existing = users.find((entry) => normalizeEmail(entry.email) === normalizedEmail)
  if (existing) {
    return res.status(409).json({ error: 'Account already exists for that email.' })
  }

  const { hash, salt } = hashPassword(password)
  const createdAt = new Date().toISOString()
  const userRecord = {
    id: randomBytes(12).toString('hex'),
    callsign: String(callsign).trim(),
    email: normalizedEmail,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt,
    role: String(role).trim(),
    ship: String(ship).trim(),
    ownedShips: Array.isArray(ownedShips) ? ownedShips : [],
    financial:
      financial && typeof financial === 'object'
        ? {
            currentBalance: Number(financial.currentBalance) || 0,
            totalEarnings: Number(financial.totalEarnings) || 0,
            totalCosts: Number(financial.totalCosts) || 0,
          }
        : {
            currentBalance: 0,
            totalEarnings: 0,
            totalCosts: 0,
          },
    sessions:
      sessions && typeof sessions === 'object'
        ? {
            totalSessions: Number(sessions.totalSessions) || 0,
            salvageSessions: Number(sessions.salvageSessions) || 0,
            miningSessions: Number(sessions.miningSessions) || 0,
            totalProfit: Number(sessions.totalProfit) || 0,
          }
        : {
            totalSessions: 0,
            salvageSessions: 0,
            miningSessions: 0,
            totalProfit: 0,
          },
    activeWorkOrders: Array.isArray(activeWorkOrders)
      ? activeWorkOrders
          .filter((workOrder) => workOrder && typeof workOrder === 'object')
          .map((workOrder) => ({
            id: String(workOrder.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            location: String(workOrder.location ?? '').trim(),
            type: String(workOrder.type ?? '').trim(),
            startedAt: Number(workOrder.startedAt) || Date.now(),
            functioningTimeMinutes:
              Number(workOrder.functioningTimeMinutes) || getWorkOrderDurationMinutes(workOrder.type),
          }))
          .filter((workOrder) => workOrder.location && workOrder.type)
      : [],
  }

  users.push(userRecord)
  await writeUsers(users)

  return res.status(201).json({ token: issueToken(), user: sanitizeUser(userRecord) })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, callsign, identifier, password } = req.body ?? {}
  const loginId = String(identifier ?? email ?? callsign ?? '').trim()
  const normalizedEmail = normalizeEmail(loginId)
  const normalizedCallsign = normalizeCallsign(loginId)

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Email or callsign and password are required.' })
  }

  const users = await readUsers()
  const found = users.find(
    (entry) =>
      normalizeEmail(entry.email) === normalizedEmail ||
      normalizeCallsign(entry.callsign) === normalizedCallsign,
  )

  if (!found || !verifyPassword(password, found.passwordHash, found.passwordSalt)) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  return res.status(200).json({ token: issueToken(), user: sanitizeUser(found) })
})

app.post('/api/profile/update-owned-ships', async (req, res) => {
  const { email, ownedShips, ship } = req.body ?? {}
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !Array.isArray(ownedShips)) {
    return res.status(400).json({ error: 'Email and ownedShips are required.' })
  }

  const users = await readUsers()
  const index = users.findIndex((entry) => normalizeEmail(entry.email) === normalizedEmail)

  if (index < 0) {
    return res.status(404).json({ error: 'User not found.' })
  }

  users[index] = {
    ...users[index],
    ownedShips,
    ship: typeof ship === 'string' && ship.trim() ? ship.trim() : users[index].ship,
  }

  await writeUsers(users)
  return res.status(200).json({ ok: true, user: sanitizeUser(users[index]) })
})

app.post('/api/profile/update-role', async (req, res) => {
  const { email, role } = req.body ?? {}
  const normalizedEmail = normalizeEmail(email)
  const normalizedRole = String(role ?? '').trim()

  if (!normalizedEmail || !normalizedRole) {
    return res.status(400).json({ error: 'Email and role are required.' })
  }

  const users = await readUsers()
  const index = users.findIndex((entry) => normalizeEmail(entry.email) === normalizedEmail)

  if (index < 0) {
    return res.status(404).json({ error: 'User not found.' })
  }

  users[index] = {
    ...users[index],
    role: normalizedRole,
  }

  await writeUsers(users)
  return res.status(200).json({ ok: true, user: sanitizeUser(users[index]) })
})

app.post('/api/profile/update-financial', async (req, res) => {
  const { email, financial } = req.body ?? {}
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !financial || typeof financial !== 'object') {
    return res.status(400).json({ error: 'Email and financial payload are required.' })
  }

  const users = await readUsers()
  const index = users.findIndex((entry) => normalizeEmail(entry.email) === normalizedEmail)

  if (index < 0) {
    return res.status(404).json({ error: 'User not found.' })
  }

  users[index] = {
    ...users[index],
    financial: {
      currentBalance: Number(financial.currentBalance) || 0,
      totalEarnings: Number(financial.totalEarnings) || 0,
      totalCosts: Number(financial.totalCosts) || 0,
    },
  }

  await writeUsers(users)
  return res.status(200).json({ ok: true, user: sanitizeUser(users[index]) })
})

app.post('/api/profile/update-sessions', async (req, res) => {
  const { email, sessions } = req.body ?? {}
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !sessions || typeof sessions !== 'object') {
    return res.status(400).json({ error: 'Email and sessions payload are required.' })
  }

  const users = await readUsers()
  const index = users.findIndex((entry) => normalizeEmail(entry.email) === normalizedEmail)

  if (index < 0) {
    return res.status(404).json({ error: 'User not found.' })
  }

  users[index] = {
    ...users[index],
    sessions: {
      totalSessions: Number(sessions.totalSessions) || 0,
      salvageSessions: Number(sessions.salvageSessions) || 0,
      miningSessions: Number(sessions.miningSessions) || 0,
      totalProfit: Number(sessions.totalProfit) || 0,
    },
  }

  await writeUsers(users)
  return res.status(200).json({ ok: true, user: sanitizeUser(users[index]) })
})

app.post('/api/profile/update-work-orders', async (req, res) => {
  const { email, activeWorkOrders } = req.body ?? {}
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !Array.isArray(activeWorkOrders)) {
    return res.status(400).json({ error: 'Email and activeWorkOrders are required.' })
  }

  const users = await readUsers()
  const index = users.findIndex((entry) => normalizeEmail(entry.email) === normalizedEmail)

  if (index < 0) {
    return res.status(404).json({ error: 'User not found.' })
  }

  users[index] = {
    ...users[index],
    activeWorkOrders: activeWorkOrders
      .filter((workOrder) => workOrder && typeof workOrder === 'object')
      .map((workOrder) => ({
        id: String(workOrder.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        location: String(workOrder.location ?? '').trim(),
        type: String(workOrder.type ?? '').trim(),
        startedAt: Number(workOrder.startedAt) || Date.now(),
        functioningTimeMinutes:
          Number(workOrder.functioningTimeMinutes) || getWorkOrderDurationMinutes(workOrder.type),
      }))
      .filter((workOrder) => workOrder.location && workOrder.type),
  }

  await writeUsers(users)
  return res.status(200).json({ ok: true, user: sanitizeUser(users[index]) })
})

app.post('/api/profile/update-details', async (req, res) => {
  const { currentEmail, email, createdAt } = req.body ?? {}

  const normalizedCurrentEmail = normalizeEmail(currentEmail)
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedCurrentEmail || !normalizedEmail || !createdAt) {
    return res.status(400).json({ error: 'currentEmail, email, and createdAt are required.' })
  }

  const parsedCreatedAt = new Date(createdAt)
  if (Number.isNaN(parsedCreatedAt.getTime())) {
    return res.status(400).json({ error: 'createdAt must be a valid date.' })
  }

  const users = await readUsers()
  const index = users.findIndex((entry) => normalizeEmail(entry.email) === normalizedCurrentEmail)

  if (index < 0) {
    return res.status(404).json({ error: 'User not found.' })
  }

  if (normalizedEmail !== normalizedCurrentEmail) {
    const emailTaken = users.some(
      (entry, entryIndex) => entryIndex !== index && normalizeEmail(entry.email) === normalizedEmail,
    )

    if (emailTaken) {
      return res.status(409).json({ error: 'Account already exists for that email.' })
    }
  }

  users[index] = {
    ...users[index],
    email: normalizedEmail,
    createdAt: parsedCreatedAt.toISOString(),
  }

  await writeUsers(users)
  return res.status(200).json({ ok: true, user: sanitizeUser(users[index]) })
})

app.get('/api/ships/cargo-capacity', async (req, res) => {
  const shipName = normalizeShipName(req.query.name)

  if (!shipName) {
    return res.status(400).json({ error: 'Ship name is required.' })
  }

  try {
    const cargoCapacity = await fetchCargoCapacityFromInternet(shipName)

    if (cargoCapacity === null) {
      return res.status(404).json({ error: 'Cargo capacity not found for ship.' })
    }

    return res.status(200).json({ ship: shipName, cargoCapacity, source: 'starcitizen.tools' })
  } catch {
    return res.status(502).json({ error: 'Unable to reach external ship data source.' })
  }
})

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(DIST_DIR))

  app.get(/^(?!\/api).*/, async (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`)
})
