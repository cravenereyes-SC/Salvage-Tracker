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
const PORT = 8787

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
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

function sanitizeUser(user) {
  const financial = user && typeof user.financial === 'object' ? user.financial : {}
  const sessions = user && typeof user.sessions === 'object' ? user.sessions : {}

  return {
    callsign: user.callsign,
    email: user.email,
    createdAt: user.createdAt,
    nickname: user.nickname,
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
  }
}

function issueToken() {
  return randomBytes(24).toString('base64url')
}

app.post('/api/auth/register', async (req, res) => {
  const { callsign, email, password, nickname, role, ship, ownedShips, financial, sessions } = req.body ?? {}

  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !password || !callsign || !nickname || !role || !ship) {
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
    nickname: String(nickname).trim(),
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

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`)
})
