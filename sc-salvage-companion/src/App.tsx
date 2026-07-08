import { type FormEvent, useEffect, useState } from 'react'
import './App.css'

type AuthMode = 'login' | 'register'

type SessionStorageType = 'local' | 'session'

type OwnedShip = {
  id: string
  name: string
  cargoCapacity: number
  functionLabel: string
}

type FinancialProfile = {
  currentBalance: number
  totalEarnings: number
  totalCosts: number
}

type SessionMetrics = {
  totalSessions: number
  salvageSessions: number
  miningSessions: number
  totalProfit: number
}

type ActiveWorkOrder = {
  id: string
  location: string
  type: string
  startedAt: number
  functioningTimeMinutes: number
}

type SessionExpense = {
  id: string
  type: string
  cost: number
  location?: string
  processingType?: string
  functioningTimeMinutes?: number
  startedAt?: number
  linkedWorkOrderId?: string
}

type ActiveSession = {
  id: string
  name: string
  type: (typeof SESSION_TYPES)[number]
  startedAt: number
  expenses: SessionExpense[]
}

type SessionTableSortKey = 'type' | 'description' | 'amount' | 'time'

type UserProfile = {
  callsign: string
  email: string
  createdAt: string
  role: string
  ship: string
  ownedShips: OwnedShip[]
  financial: FinancialProfile
  sessions: SessionMetrics
  activeWorkOrders: ActiveWorkOrder[]
}

type AuthSession = {
  token: string
  user: UserProfile
}

const AUTH_STORAGE_KEY = 'sc-auth-session-v1'

const SHIP_CHOICES = [
  'Vulture',
  'Reclaimer',
  'SRV',
  'Prospector',
  'Mole',
  'ROC',
  'ROC-DS',
  'Drake Cutter',
  'Drake Cutlass Black',
  'Drake Cutlass Red',
  'Drake Cutlass Blue',
  'Drake Corsair',
  'Drake Caterpillar',
  'Anvil C8 Pisces',
  'Anvil C8R Pisces',
  'Anvil Arrow',
  'Anvil Gladius',
  'Anvil Terrapin',
  'Anvil Carrack',
  'Aegis Avenger Titan',
  'Aegis Vanguard Warden',
  'Aegis Redeemer',
  'Aegis Hammerhead',
  'Aegis Reclaimer BIS',
  'MISC Freelancer',
  'Constellation Taurus',
  'Constellation Andromeda',
  'Constellation Aquila',
  'Constellation Phoenix',
  'Freelancer MAX',
  'Argo RAFT',
  'Argo MPUV Cargo',
  'Crusader C1 Spirit',
  'Crusader A1 Spirit',
  'Crusader Hercules C2',
  'Crusader Mercury Star Runner',
  'Origin 315p',
  'Origin 400i',
  'Origin 600i Explorer',
  'RSI Scorpius',
  'RSI Zeus Mk II CL',
  'RSI Polaris',
]

const SHIP_FUNCTION_MAP: Record<string, string> = {
  Vulture: 'Salvage',
  Reclaimer: 'Salvage',
  SRV: 'Towing and Support',
  Prospector: 'Mining',
  Mole: 'Mining',
  ROC: 'Ground Mining',
  'ROC-DS': 'Ground Mining',
  'Drake Cutter': 'Light Cargo and Utility',
  'Drake Cutlass Black': 'Multirole',
  'Drake Cutlass Red': 'Medical and Rescue',
  'Drake Cutlass Blue': 'Interdiction and Patrol',
  'Drake Corsair': 'Exploration and Combat',
  'Drake Caterpillar': 'Cargo Hauling',
  'Anvil C8 Pisces': 'Shuttle and Utility',
  'Anvil C8R Pisces': 'Medical and Rescue',
  'Anvil Arrow': 'Light Fighter',
  'Anvil Gladius': 'Light Fighter',
  'Anvil Terrapin': 'Reconnaissance',
  'Anvil Carrack': 'Exploration',
  'Aegis Avenger Titan': 'Light Cargo and Combat',
  'Aegis Vanguard Warden': 'Heavy Fighter',
  'Aegis Redeemer': 'Gunship',
  'Aegis Hammerhead': 'Patrol Gunship',
  'Aegis Reclaimer BIS': 'Salvage',
  'MISC Freelancer': 'Cargo Hauling',
  'Constellation Taurus': 'Cargo Hauling',
  'Constellation Andromeda': 'Multirole',
  'Constellation Aquila': 'Exploration',
  'Constellation Phoenix': 'Luxury Transport',
  'Freelancer MAX': 'Cargo Hauling',
  'Argo RAFT': 'Cargo Hauling',
  'Argo MPUV Cargo': 'Cargo Shuttle',
  'Crusader C1 Spirit': 'Cargo Hauling',
  'Crusader A1 Spirit': 'Bomber',
  'Crusader Hercules C2': 'Heavy Cargo Hauling',
  'Crusader Mercury Star Runner': 'Data and Cargo Running',
  'Origin 315p': 'Exploration',
  'Origin 400i': 'Touring and Exploration',
  'Origin 600i Explorer': 'Exploration',
  'RSI Scorpius': 'Heavy Fighter',
  'RSI Zeus Mk II CL': 'Cargo Hauling',
  'RSI Polaris': 'Capital Combat',
}

const ROLE_CHOICES = ['Salvager', 'Miner', 'Hybrid Operator', 'Fleet Lead']

const WORK_ORDER_TYPES = ['Salvage', 'Mining', 'Cargo', 'Recovery', 'Survey']
const WORK_ORDER_DURATION_MAP: Record<(typeof WORK_ORDER_TYPES)[number], number> = {
  Salvage: 180,
  Mining: 120,
  Cargo: 90,
  Recovery: 60,
  Survey: 45,
}
const SESSION_TYPES = ['Salvage', 'Mining'] as const
const EXPENSE_TYPES = ['Fuel', 'Repairs', 'Crew and Supplies', 'Ammo', 'Insurance', 'Landing and Docking', 'Work Orders'] as const

const REFINERY_STATION_OPTIONS = [
  'ARC-L1 Wide Forest Station',
  'ARC-L2 Latham Mining Complex',
  'ARC-L3 Shubin Mining Facility',
  'ARC-L4 Weeping Cove Station',
  'ARC-L5 Trident Station',
  'CRU-L1 Ambitious Dream Station',
  'CRU-L4 Shubin Mining Facility',
  'CRU-L5 Sieres Station',
  'HUR-L1 Green Glade Station',
  'HUR-L2 Faithful Dream Station',
  'HUR-L3 Long Forest Station',
  'HUR-L4 Grin Station',
  'HUR-L5 Everus Harbor',
  'MIC-L1 Benson Mining Outpost',
  'MIC-L2 Long Forest Station',
  'MIC-L3 Shubin Mining Facility',
  'MIC-L4 Shubin Mining Facility',
  'MIC-L5 Shubin Mining Facility',
  'POI-L1 Shubin Mining Facility',
  'POI-L2 Redwind Station',
  'POI-L3 Shubin Mining Facility',
  'PYR-L1 Ruin Station',
] as const

const WORK_ORDER_PROCESSING_TYPES = [
  'Dinyx Solventation',
  'Electrostar Solventation',
  'Ferron Exchange',
  'Gaskin Process',
  'Pyrometric Chromalysis',
  'Sinder Molecularization',
] as const

const WORK_ORDER_PROCESSING_MAP: Record<(typeof WORK_ORDER_PROCESSING_TYPES)[number], { cost: number; functioningTimeMinutes: number }> = {
  'Dinyx Solventation': { cost: 4800, functioningTimeMinutes: 110 },
  'Electrostar Solventation': { cost: 5200, functioningTimeMinutes: 125 },
  'Ferron Exchange': { cost: 4500, functioningTimeMinutes: 100 },
  'Gaskin Process': { cost: 3900, functioningTimeMinutes: 90 },
  'Pyrometric Chromalysis': { cost: 5600, functioningTimeMinutes: 140 },
  'Sinder Molecularization': { cost: 6100, functioningTimeMinutes: 150 },
}

const EXPENSE_TYPE_COST_MAP: Record<(typeof EXPENSE_TYPES)[number], number> = {
  Fuel: 1500,
  Repairs: 3000,
  'Crew and Supplies': 2500,
  Ammo: 1200,
  Insurance: 5000,
  'Landing and Docking': 700,
  'Work Orders': 0,
}

const auecFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

function defaultFinancial(): FinancialProfile {
  return {
    currentBalance: 0,
    totalEarnings: 0,
    totalCosts: 0,
  }
}

function defaultSessions(): SessionMetrics {
  return {
    totalSessions: 0,
    salvageSessions: 0,
    miningSessions: 0,
    totalProfit: 0,
  }
}

function generateSessionName(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const randomThreeDigits = Math.floor(100 + Math.random() * 900)
  return `Session-${year}${month}${day}-${hours}${minutes}-${randomThreeDigits}`
}

function createOwnedShip(name: string, cargoCapacity: number, functionLabel: string): OwnedShip {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    cargoCapacity,
    functionLabel,
  }
}

function createSessionExpense(type: string, cost: number): SessionExpense {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    cost,
  }
}

function createWorkOrderExpense(
  processingType: string,
  location: string,
  cost: number,
  functioningTimeMinutes: number,
  linkedWorkOrderId?: string,
): SessionExpense {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'Work Orders',
    cost,
    location,
    processingType,
    functioningTimeMinutes,
    startedAt: Date.now(),
    linkedWorkOrderId,
  }
}

function createActiveWorkOrder(location: string, type: string, functioningTimeMinutes: number): ActiveWorkOrder {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    location,
    type,
    startedAt: Date.now(),
    functioningTimeMinutes,
  }
}

function ensureUserProfile(raw: UserProfile): UserProfile {
  return {
    ...raw,
    ownedShips: Array.isArray(raw.ownedShips) ? raw.ownedShips : [],
    financial:
      raw.financial && typeof raw.financial === 'object'
        ? {
            currentBalance: Number(raw.financial.currentBalance) || 0,
            totalEarnings: Number(raw.financial.totalEarnings) || 0,
            totalCosts: Number(raw.financial.totalCosts) || 0,
          }
        : defaultFinancial(),
    sessions:
      raw.sessions && typeof raw.sessions === 'object'
        ? {
            totalSessions: Number(raw.sessions.totalSessions) || 0,
            salvageSessions: Number(raw.sessions.salvageSessions) || 0,
            miningSessions: Number(raw.sessions.miningSessions) || 0,
            totalProfit: Number(raw.sessions.totalProfit) || 0,
          }
        : defaultSessions(),
    activeWorkOrders: Array.isArray(raw.activeWorkOrders)
      ? raw.activeWorkOrders
          .filter((workOrder) => workOrder && typeof workOrder === 'object')
          .map((workOrder) => ({
            id: String(workOrder.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            location: String(workOrder.location ?? '').trim(),
            type: String(workOrder.type ?? '').trim(),
            startedAt: Number(workOrder.startedAt) || Date.now(),
            functioningTimeMinutes:
              Number(workOrder.functioningTimeMinutes) ||
              WORK_ORDER_DURATION_MAP[
                (WORK_ORDER_TYPES.includes(String(workOrder.type ?? '') as (typeof WORK_ORDER_TYPES)[number])
                  ? String(workOrder.type ?? '')
                  : WORK_ORDER_TYPES[0]) as (typeof WORK_ORDER_TYPES)[number]
              ],
          }))
          .filter((workOrder) => workOrder.location && workOrder.type)
      : [],
  }
}

function toAuec(value: number): string {
  return `${auecFormatter.format(value)} aUEC`
}

function toDateTimeLocalValue(isoDate: string): string {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60000
  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16)
}

function inferShipFunction(shipName: string): string {
  const normalized = shipName.trim()
  if (!normalized) {
    return ''
  }

  const mapped = SHIP_FUNCTION_MAP[normalized]
  if (mapped) {
    return mapped
  }

  if (/prospector|mole|roc/i.test(normalized)) {
    return 'Mining'
  }

  if (/vulture|reclaimer|salvage/i.test(normalized)) {
    return 'Salvage'
  }

  if (/raft|cargo|freelancer|taurus|caterpillar|hercules/i.test(normalized)) {
    return 'Cargo Hauling'
  }

  if (/arrow|gladius|vanguard|scorpius/i.test(normalized)) {
    return 'Combat'
  }

  if (/aquila|carrack|explorer|400i|315p/i.test(normalized)) {
    return 'Exploration'
  }

  return 'Multirole'
}

function readStoredSession(): { session: AuthSession; storage: SessionStorageType } | null {
  const localRaw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (localRaw) {
    try {
      const parsed = JSON.parse(localRaw) as AuthSession
      if (parsed?.token && parsed?.user) {
        return {
          session: {
            ...parsed,
            user: ensureUserProfile(parsed.user),
          },
          storage: 'local',
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }

  const sessionRaw = sessionStorage.getItem(AUTH_STORAGE_KEY)
  if (sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw) as AuthSession
      if (parsed?.token && parsed?.user) {
        return {
          session: {
            ...parsed,
            user: ensureUserProfile(parsed.user),
          },
          storage: 'session',
        }
      }
    } catch {
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }

  return null
}

function writeStoredSession(session: AuthSession, rememberMe: boolean) {
  const serialized = JSON.stringify(session)
  if (rememberMe) {
    localStorage.setItem(AUTH_STORAGE_KEY, serialized)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, serialized)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [callsign, setCallsign] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [authView, setAuthView] = useState<'auth' | 'profile-setup' | 'profile' | 'session-tracker'>('auth')
  const [isRegisterExiting, setIsRegisterExiting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authToken, setAuthToken] = useState('')
  const [authStorageType, setAuthStorageType] = useState<SessionStorageType>('session')
  const [setupRole, setSetupRole] = useState(ROLE_CHOICES[0])
  const [setupShip, setSetupShip] = useState('')
  const [setupError, setSetupError] = useState('')
  const [showAddShipOverlay, setShowAddShipOverlay] = useState(false)
  const [addShipName, setAddShipName] = useState('')
  const [addShipCargoCapacity, setAddShipCargoCapacity] = useState(0)
  const [addShipFunction, setAddShipFunction] = useState('')
  const [addShipError, setAddShipError] = useState('')
  const [isCargoCapacityLoading, setIsCargoCapacityLoading] = useState(false)
  const [shipUpdateError, setShipUpdateError] = useState('')
  const [showFinancialOverlay, setShowFinancialOverlay] = useState(false)
  const [financialBalanceInput, setFinancialBalanceInput] = useState(0)
  const [financialEarningsInput, setFinancialEarningsInput] = useState(0)
  const [financialCostsInput, setFinancialCostsInput] = useState(0)
  const [financialError, setFinancialError] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [showStartSessionOverlay, setShowStartSessionOverlay] = useState(false)
  const [sessionTypeInput, setSessionTypeInput] = useState<(typeof SESSION_TYPES)[number]>('Salvage')
  const [sessionNameInput, setSessionNameInput] = useState('')
  const [activeSessionName, setActiveSessionName] = useState('Salvage Session 1')
  const [activeSessionExpenses, setActiveSessionExpenses] = useState<SessionExpense[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showAddExpenseOverlay, setShowAddExpenseOverlay] = useState(false)
  const [expenseTypeInput, setExpenseTypeInput] = useState<(typeof EXPENSE_TYPES)[number]>('Fuel')
  const [expenseCostInput, setExpenseCostInput] = useState(EXPENSE_TYPE_COST_MAP.Fuel)
  const [expenseError, setExpenseError] = useState('')
  const [expenseLocationInput, setExpenseLocationInput] = useState<string>(REFINERY_STATION_OPTIONS[0])
  const [expenseProcessingTypeInput, setExpenseProcessingTypeInput] = useState<(typeof WORK_ORDER_PROCESSING_TYPES)[number]>('Dinyx Solventation')
  const [expenseFunctioningTimeInput, setExpenseFunctioningTimeInput] = useState(WORK_ORDER_PROCESSING_MAP['Dinyx Solventation'].functioningTimeMinutes)
  const [showSoldWorkOrderOverlay, setShowSoldWorkOrderOverlay] = useState(false)
  const [soldWorkOrderId, setSoldWorkOrderId] = useState<string | null>(null)
  const [soldAmountInput, setSoldAmountInput] = useState(0)
  const [soldQuantityScuInput, setSoldQuantityScuInput] = useState(1)
  const [soldWorkOrderError, setSoldWorkOrderError] = useState('')
  const [trackerNow, setTrackerNow] = useState(Date.now())
  const [sessionTableSortKey, setSessionTableSortKey] = useState<SessionTableSortKey>('type')
  const [sessionTableSortDirection, setSessionTableSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showMoreOverlay, setShowMoreOverlay] = useState(false)
  const [detailEmailInput, setDetailEmailInput] = useState('')
  const [detailCreatedAtInput, setDetailCreatedAtInput] = useState('')
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    const restored = readStoredSession()
    if (!restored) {
      return
    }

    setProfile(restored.session.user)
    setAuthToken(restored.session.token)
    setAuthStorageType(restored.storage)
    setAuthView('profile')
  }, [])

  useEffect(() => {
    if (authView !== 'profile' && authView !== 'session-tracker') {
      return undefined
    }

    setTrackerNow(Date.now())
    const intervalId = window.setInterval(() => setTrackerNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [authView])

  function persistProfile(nextUser: UserProfile) {
    if (!authToken) {
      return
    }

    writeStoredSession(
      {
        token: authToken,
        user: nextUser,
      },
      authStorageType === 'local',
    )
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError('')

    if (mode === 'register' && password !== confirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }

    if (mode === 'register') {
      const nextCallsign = callsign.trim() || 'Unnamed Pilot'
      setProfile({
        callsign: nextCallsign,
        email,
        createdAt: new Date().toISOString(),
        role: setupRole,
        ship: '',
        ownedShips: [],
        financial: defaultFinancial(),
        sessions: defaultSessions(),
        activeWorkOrders: [],
      })
      setSetupRole(ROLE_CHOICES[0])
      setSetupShip('')
      setSetupError('')
      setIsRegisterExiting(true)

      window.setTimeout(() => {
        setAuthView('profile-setup')
        setIsRegisterExiting(false)
      }, 420)

      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = (await response.json()) as { error?: string; token?: string; user?: UserProfile }
      if (!response.ok || !data.token || !data.user) {
        setAuthError(data.error ?? 'Login failed.')
        return
      }

      writeStoredSession(
        {
          token: data.token,
          user: data.user,
        },
        rememberMe,
      )

      setAuthToken(data.token)
      setAuthStorageType(rememberMe ? 'local' : 'session')
      setProfile(ensureUserProfile(data.user))
      setAuthView('profile')
      setPassword('')
      setConfirmPassword('')
    } catch {
      setAuthError('Unable to reach auth server. Start backend with npm run server:dev')
    }
  }

  async function viewProfileFromSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!setupShip.trim()) {
      setSetupError('Ship selection is required.')
      return
    }

    const ownedShip = createOwnedShip(setupShip.trim(), 0, 'Primary')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callsign,
          email,
          password,
          role: setupRole,
          ship: setupShip.trim(),
          ownedShips: [ownedShip],
          sessions: defaultSessions(),
          financial: defaultFinancial(),
          activeWorkOrders: [],
        }),
      })

      const data = (await response.json()) as { error?: string; token?: string; user?: UserProfile }
      if (!response.ok || !data.token || !data.user) {
        setSetupError(data.error ?? 'Registration failed.')
        return
      }

      writeStoredSession(
        {
          token: data.token,
          user: data.user,
        },
        false,
      )

      setAuthToken(data.token)
      setAuthStorageType('session')
      setProfile(ensureUserProfile(data.user))
      setSetupError('')
      setAuthView('profile')
      setPassword('')
      setConfirmPassword('')
    } catch {
      setSetupError('Unable to reach auth server. Start backend with npm run server:dev')
    }
  }

  function openAddShipOverlay() {
    setAddShipName('')
    setAddShipCargoCapacity(0)
    setAddShipFunction('')
    setAddShipError('')
    setIsCargoCapacityLoading(false)
    setShowAddShipOverlay(true)
  }

  function closeAddShipOverlay() {
    setShowAddShipOverlay(false)
    setAddShipError('')
    setIsCargoCapacityLoading(false)
  }

  async function autoFillCargoCapacity(shipName: string) {
    const normalized = shipName.trim()
    if (!normalized) {
      setAddShipCargoCapacity(0)
      return
    }

    setIsCargoCapacityLoading(true)

    try {
      const response = await fetch(`/api/ships/cargo-capacity?name=${encodeURIComponent(normalized)}`)

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setAddShipError(data.error ?? 'Could not auto-load cargo capacity. Enter manually.')
        return
      }

      const data = (await response.json()) as { cargoCapacity?: number }
      const nextCapacity = Number(data.cargoCapacity)

      if (Number.isFinite(nextCapacity) && nextCapacity >= 0) {
        setAddShipCargoCapacity(Math.round(nextCapacity))
        setAddShipError('')
      }
    } catch {
      setAddShipError('Could not auto-load cargo capacity. Enter manually.')
    } finally {
      setIsCargoCapacityLoading(false)
    }
  }

  function openFinancialOverlay() {
    if (!profile) {
      return
    }

    setFinancialBalanceInput(profile.financial.currentBalance)
    setFinancialEarningsInput(profile.financial.totalEarnings)
    setFinancialCostsInput(profile.financial.totalCosts)
    setFinancialError('')
    setShowFinancialOverlay(true)
  }

  function closeFinancialOverlay() {
    setShowFinancialOverlay(false)
    setFinancialError('')
  }

  function loadSessionIntoTracker(session: ActiveSession) {
    setCurrentSessionId(session.id)
    setActiveSessionName(session.name)
    setActiveSessionExpenses(session.expenses)
    setAuthView('session-tracker')
  }

  function openActiveSessionView(sessionId: string) {
    const nextSession = activeSessions.find((session) => session.id === sessionId)
    if (!nextSession) {
      setSessionError('That active session could not be found.')
      return
    }

    setSessionError('')
    loadSessionIntoTracker(nextSession)
  }

  function closeActiveSession(sessionId: string) {
    const isCurrentSession = currentSessionId === sessionId
    setActiveSessions((current) => current.filter((session) => session.id !== sessionId))

    if (isCurrentSession) {
      setCurrentSessionId(null)
      setActiveSessionExpenses([])
      setShowAddExpenseOverlay(false)
      setShowSoldWorkOrderOverlay(false)
      setAuthView('profile')
    }

    setSessionError('')
  }

  async function completeActiveWorkOrder(workOrderId: string) {
    if (!profile) {
      return
    }

    const nextUser: UserProfile = {
      ...profile,
      activeWorkOrders: profile.activeWorkOrders.filter((workOrder) => workOrder.id !== workOrderId),
    }

    setProfile(nextUser)
    persistProfile(nextUser)

    try {
      const response = await fetch('/api/profile/update-work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: nextUser.email,
          activeWorkOrders: nextUser.activeWorkOrders,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setSessionError(data.error ?? 'Saved locally, but could not sync work order completion.')
        return
      }
    } catch {
      setSessionError('Saved locally, but could not sync work order completion.')
      return
    }

    setSessionError('')
  }

  function openSoldWorkOrderOverlay(workOrderId: string) {
    setSoldWorkOrderId(workOrderId)
    setSoldAmountInput(0)
    setSoldQuantityScuInput(1)
    setSoldWorkOrderError('')
    setShowSoldWorkOrderOverlay(true)
  }

  function closeSoldWorkOrderOverlay() {
    setShowSoldWorkOrderOverlay(false)
    setSoldWorkOrderId(null)
    setSoldWorkOrderError('')
  }

  async function submitSoldWorkOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!profile || !soldWorkOrderId) {
      setSoldWorkOrderError('Work order is not available.')
      return
    }

    if (soldAmountInput < 0) {
      setSoldWorkOrderError('Sold amount cannot be negative.')
      return
    }

    if (soldQuantityScuInput <= 0) {
      setSoldWorkOrderError('Quantity must be greater than zero SCU.')
      return
    }

    const roundedSoldAmount = Math.round(soldAmountInput)
    const roundedQuantityScu = Math.round(soldQuantityScuInput)
    const nextUser: UserProfile = {
      ...profile,
      financial: {
        ...profile.financial,
        currentBalance: profile.financial.currentBalance + roundedSoldAmount,
        totalEarnings: profile.financial.totalEarnings + roundedSoldAmount,
      },
      activeWorkOrders: profile.activeWorkOrders.filter((workOrder) => workOrder.id !== soldWorkOrderId),
    }

    setProfile(nextUser)
    persistProfile(nextUser)

    try {
      const workOrderResponse = await fetch('/api/profile/update-work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: nextUser.email,
          activeWorkOrders: nextUser.activeWorkOrders,
        }),
      })

      if (!workOrderResponse.ok) {
        const data = (await workOrderResponse.json()) as { error?: string }
        setSoldWorkOrderError(data.error ?? 'Saved locally, but could not sync sold work order.')
        return
      }

      const financialResponse = await fetch('/api/profile/update-financial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: nextUser.email,
          financial: nextUser.financial,
        }),
      })

      if (!financialResponse.ok) {
        const data = (await financialResponse.json()) as { error?: string }
        setSoldWorkOrderError(data.error ?? 'Saved locally, but could not sync sale earnings.')
        return
      }
    } catch {
      setSoldWorkOrderError('Saved locally, but could not sync sold work order.')
      return
    }

    setSessionError(`Recorded sale: ${roundedQuantityScu} SCU for ${toAuec(roundedSoldAmount)}.`)
    closeSoldWorkOrderOverlay()
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)

    setProfile(null)
    setAuthToken('')
    setAuthStorageType('session')
    setAuthView('auth')
    setMode('login')
    setPassword('')
    setConfirmPassword('')
    setAuthError('')
    setSetupError('')
    setShowAddShipOverlay(false)
    setShowFinancialOverlay(false)
    setShowMoreOverlay(false)
    setShowSoldWorkOrderOverlay(false)
    setActiveSessions([])
    setCurrentSessionId(null)
  }

  function openMoreOverlay() {
    if (!profile) {
      return
    }

    setDetailEmailInput(profile.email)
    setDetailCreatedAtInput(toDateTimeLocalValue(profile.createdAt))
    setDetailError('')
    setShowMoreOverlay(true)
  }

  function closeMoreOverlay() {
    setShowMoreOverlay(false)
    setDetailError('')
  }

  async function submitProfileDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!profile) {
      setDetailError('Profile not loaded.')
      return
    }

    const normalizedEmail = detailEmailInput.trim().toLowerCase()
    if (!normalizedEmail) {
      setDetailError('Email is required.')
      return
    }

    if (!detailCreatedAtInput) {
      setDetailError('Account created date is required.')
      return
    }

    const parsedCreatedAt = new Date(detailCreatedAtInput)
    if (Number.isNaN(parsedCreatedAt.getTime())) {
      setDetailError('Account created date is invalid.')
      return
    }

    const nextUser: UserProfile = {
      ...profile,
      email: normalizedEmail,
      createdAt: parsedCreatedAt.toISOString(),
    }

    setProfile(nextUser)
    persistProfile(nextUser)

    try {
      const response = await fetch('/api/profile/update-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentEmail: profile.email,
          email: nextUser.email,
          createdAt: nextUser.createdAt,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setDetailError(data.error ?? 'Saved locally, but could not sync to backend.')
        return
      }
    } catch {
      setDetailError('Saved locally, but could not sync to backend.')
      return
    }

    setShowMoreOverlay(false)
  }

  async function submitFinancialUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!profile) {
      setFinancialError('Profile not loaded.')
      return
    }

    if (financialBalanceInput < 0 || financialEarningsInput < 0 || financialCostsInput < 0) {
      setFinancialError('Financial values cannot be negative.')
      return
    }

    const nextUser: UserProfile = {
      ...profile,
      financial: {
        currentBalance: financialBalanceInput,
        totalEarnings: financialEarningsInput,
        totalCosts: financialCostsInput,
      },
    }

    setProfile(nextUser)
    persistProfile(nextUser)

    try {
      await fetch('/api/profile/update-financial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: nextUser.email,
          financial: nextUser.financial,
        }),
      })
    } catch {
      setFinancialError('Saved locally, but could not sync to backend.')
      return
    }

    setShowFinancialOverlay(false)
  }

  async function submitAddShip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!addShipName.trim()) {
      setAddShipError('Ship name is required.')
      return
    }

    if (addShipCargoCapacity < 0) {
      setAddShipError('Cargo capacity cannot be negative.')
      return
    }

    if (!addShipFunction.trim()) {
      setAddShipError('Ship function is required.')
      return
    }

    const nextShip = createOwnedShip(
      addShipName.trim(),
      Number.isFinite(addShipCargoCapacity) ? addShipCargoCapacity : 0,
      addShipFunction.trim(),
    )

    if (!profile) {
      setAddShipError('Profile not loaded.')
      return
    }

    const nextUser: UserProfile = {
      ...profile,
      ownedShips: [...profile.ownedShips, nextShip],
      ship: profile.ship || nextShip.name,
    }

    setProfile(nextUser)
    persistProfile(nextUser)

    try {
      await fetch('/api/profile/update-owned-ships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: nextUser.email,
          ship: nextUser.ship,
          ownedShips: nextUser.ownedShips,
        }),
      })
    } catch {
      setAddShipError('Saved locally, but could not sync to backend.')
      return
    }

    setShowAddShipOverlay(false)
  }

  async function removeOwnedShip(shipId: string) {
    if (!profile) {
      return
    }

    const remainingShips = profile.ownedShips.filter((ownedShip) => ownedShip.id !== shipId)
    const hasCurrentShip = remainingShips.some((ownedShip) => ownedShip.name === profile.ship)

    const nextUser: UserProfile = {
      ...profile,
      ownedShips: remainingShips,
      ship: hasCurrentShip ? profile.ship : remainingShips[0]?.name ?? '',
    }

    setProfile(nextUser)
    persistProfile(nextUser)

    try {
      const response = await fetch('/api/profile/update-owned-ships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: nextUser.email,
          ship: nextUser.ship,
          ownedShips: nextUser.ownedShips,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setAddShipError(data.error ?? 'Saved locally, but could not sync ship removal.')
      }
    } catch {
      setAddShipError('Saved locally, but could not sync ship removal.')
    }
  }

  async function selectPrimaryShip(nextShipName: string) {
    if (!profile) {
      setShipUpdateError('Profile not loaded.')
      return
    }

    const nextShip = nextShipName.trim()
    const nextUser: UserProfile = {
      ...profile,
      ship: nextShip,
    }

    setShipUpdateError('')
    setProfile(nextUser)
    persistProfile(nextUser)

    try {
      const response = await fetch('/api/profile/update-owned-ships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: nextUser.email,
          ship: nextUser.ship,
          ownedShips: nextUser.ownedShips,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setShipUpdateError(data.error ?? 'Saved locally, but could not sync active ship.')
      }
    } catch {
      setShipUpdateError('Saved locally, but could not sync active ship.')
    }
  }

  async function startNewSession() {
    setSessionTypeInput('Salvage')
    setSessionNameInput(generateSessionName())
    setSessionError('')
    setShowStartSessionOverlay(true)
  }

  function closeStartSessionOverlay() {
    setShowStartSessionOverlay(false)
  }

  function closeSessionTrackerView() {
    setAuthView('profile')
  }

  function openAddExpenseOverlay() {
    setExpenseTypeInput('Fuel')
    setExpenseCostInput(EXPENSE_TYPE_COST_MAP.Fuel)
    setExpenseLocationInput(REFINERY_STATION_OPTIONS[0])
    setExpenseProcessingTypeInput('Dinyx Solventation')
    setExpenseFunctioningTimeInput(WORK_ORDER_PROCESSING_MAP['Dinyx Solventation'].functioningTimeMinutes)
    setExpenseError('')
    setShowAddExpenseOverlay(true)
  }

  function closeAddExpenseOverlay() {
    setShowAddExpenseOverlay(false)
    setExpenseError('')
  }

  function formatRemainingTime(expense: SessionExpense): string {
    if (!expense.startedAt || !expense.functioningTimeMinutes) {
      return '-'
    }

    const elapsedSeconds = Math.floor((trackerNow - expense.startedAt) / 1000)
    const totalSeconds = expense.functioningTimeMinutes * 60
    const remainingSeconds = Math.max(totalSeconds - elapsedSeconds, 0)
    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  function getWorkOrderRemainingSeconds(workOrder: ActiveWorkOrder): number {
    const elapsedSeconds = Math.floor((trackerNow - workOrder.startedAt) / 1000)
    return Math.max(workOrder.functioningTimeMinutes * 60 - elapsedSeconds, 0)
  }

  function formatWorkOrderTimer(workOrder: ActiveWorkOrder): string {
    const remainingSeconds = getWorkOrderRemainingSeconds(workOrder)
    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  function formatSessionTimer(session: ActiveSession): string {
    const elapsedSeconds = Math.max(Math.floor((trackerNow - session.startedAt) / 1000), 0)
    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = elapsedSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  function getSessionExpenseDescription(expense: SessionExpense): string {
    if (expense.type === 'Work Orders' && expense.processingType && expense.location) {
      return `${expense.processingType} at ${expense.location}`
    }

    return `${expense.type} expense entry`
  }

  function getSessionExpenseSortValue(expense: SessionExpense, sortKey: SessionTableSortKey): string | number {
    switch (sortKey) {
      case 'type':
        return expense.type
      case 'description':
        return getSessionExpenseDescription(expense)
      case 'amount':
        return expense.cost
      case 'time':
        return expense.type === 'Work Orders' ? getWorkOrderRemainingSeconds(expense as ActiveWorkOrder) : -1
      default:
        return expense.type
    }
  }

  function handleSessionTableSort(sortKey: SessionTableSortKey) {
    if (sessionTableSortKey === sortKey) {
      setSessionTableSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSessionTableSortKey(sortKey)
    setSessionTableSortDirection('asc')
  }

  async function submitStartSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!profile) {
      setSessionError('Profile not loaded.')
      return
    }

    const normalizedSessionType = sessionTypeInput.toLowerCase()
    const isSalvageSession = normalizedSessionType === 'salvage'
    const isMiningSession = normalizedSessionType === 'mining'
    const nextSessionName = sessionNameInput.trim() || generateSessionName()

    const nextUser: UserProfile = {
      ...profile,
      sessions: {
        totalSessions: (profile.sessions?.totalSessions ?? 0) + 1,
        salvageSessions: (profile.sessions?.salvageSessions ?? 0) + (isSalvageSession ? 1 : 0),
        miningSessions: (profile.sessions?.miningSessions ?? 0) + (isMiningSession ? 1 : 0),
        totalProfit: profile.sessions?.totalProfit ?? 0,
      },
    }

    const nextSession: ActiveSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: nextSessionName,
      type: sessionTypeInput,
      startedAt: Date.now(),
      expenses: [],
    }

    setSessionError('')
    setProfile(nextUser)
    persistProfile(nextUser)
    setActiveSessions((current) => [...current, nextSession])
    loadSessionIntoTracker(nextSession)

    try {
      const response = await fetch('/api/profile/update-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: nextUser.email,
          sessions: nextUser.sessions,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setSessionError(data.error ?? 'Saved locally, but could not sync sessions.')
      }
    } catch {
      setSessionError('Saved locally, but could not sync sessions.')
    }

    setShowStartSessionOverlay(false)
  }

  async function submitAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (expenseCostInput < 0) {
      setExpenseError('Expense cost cannot be negative.')
      return
    }

    let nextExpense: SessionExpense
    let nextWorkOrder: ActiveWorkOrder | null = null

    if (expenseTypeInput === 'Work Orders') {
      const location = expenseLocationInput.trim()
      const processingType = expenseProcessingTypeInput.trim()

      if (!location) {
        setExpenseError('Work order location is required.')
        return
      }

      if (!processingType) {
        setExpenseError('Work order processing type is required.')
        return
      }

      if (expenseFunctioningTimeInput <= 0) {
        setExpenseError('Functioning time must be greater than zero.')
        return
      }

      if (!profile) {
        setExpenseError('Profile not loaded.')
        return
      }

      const normalizedFunctioningTime = Math.round(expenseFunctioningTimeInput)

      nextWorkOrder = createActiveWorkOrder(location, processingType, normalizedFunctioningTime)
      nextExpense = createWorkOrderExpense(
        processingType,
        location,
        Math.round(expenseCostInput),
        normalizedFunctioningTime,
        nextWorkOrder.id,
      )
    } else {
      nextExpense = createSessionExpense(expenseTypeInput, Math.round(expenseCostInput))
    }

    setActiveSessionExpenses((current) => {
      const nextExpenses = [...current, nextExpense]
      setActiveSessions((sessions) =>
        sessions.map((session) =>
          session.id === currentSessionId ? { ...session, expenses: nextExpenses } : session,
        ),
      )
      return nextExpenses
    })

    if (nextWorkOrder && profile) {
      const nextUser: UserProfile = {
        ...profile,
        activeWorkOrders: [...profile.activeWorkOrders, nextWorkOrder],
      }

      setProfile(nextUser)
      persistProfile(nextUser)

      try {
        const response = await fetch('/api/profile/update-work-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: nextUser.email,
            activeWorkOrders: nextUser.activeWorkOrders,
          }),
        })

        if (!response.ok) {
          const data = (await response.json()) as { error?: string }
          setSessionError(data.error ?? 'Saved locally, but could not sync active work orders.')
        } else {
          setSessionError('')
        }
      } catch {
        setSessionError('Saved locally, but could not sync active work orders.')
      }
    }

    setExpenseError('')
    setShowAddExpenseOverlay(false)
  }

  async function removeSessionExpense(expenseId: string) {
    const expenseToRemove = activeSessionExpenses.find((expense) => expense.id === expenseId)
    if (!expenseToRemove) {
      return
    }

    const nextExpenses = activeSessionExpenses.filter((expense) => expense.id !== expenseId)
    setActiveSessionExpenses(nextExpenses)
    setActiveSessions((sessions) =>
      sessions.map((session) =>
        session.id === currentSessionId ? { ...session, expenses: nextExpenses } : session,
      ),
    )

    if (expenseToRemove.type === 'Work Orders' && profile) {
      const workOrderIdToRemove =
        expenseToRemove.linkedWorkOrderId ??
        profile.activeWorkOrders.find(
          (workOrder) =>
            workOrder.location === expenseToRemove.location && workOrder.type === expenseToRemove.processingType,
        )?.id

      if (!workOrderIdToRemove) {
        setSessionError('')
        return
      }

      const nextUser: UserProfile = {
        ...profile,
        activeWorkOrders: profile.activeWorkOrders.filter(
          (workOrder) => workOrder.id !== workOrderIdToRemove,
        ),
      }

      setProfile(nextUser)
      persistProfile(nextUser)

      try {
        const response = await fetch('/api/profile/update-work-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: nextUser.email,
            activeWorkOrders: nextUser.activeWorkOrders,
          }),
        })

        if (!response.ok) {
          const data = (await response.json()) as { error?: string }
          setSessionError(data.error ?? 'Expense removed locally, but could not sync work order removal.')
          return
        }
      } catch {
        setSessionError('Expense removed locally, but could not sync work order removal.')
        return
      }
    }

    setSessionError('')
  }


  const ownedShipNames = Array.from(
    new Set((profile?.ownedShips ?? []).map((ownedShip) => ownedShip.name).filter((name) => name.trim())),
  )
  const totalSessionExpenses = activeSessionExpenses.reduce((total, expense) => total + expense.cost, 0)
  const sessionCost = totalSessionExpenses
  const grossRevenue = 0
  const netProfit = grossRevenue - totalSessionExpenses
  const activeSessionCount = activeSessions.length
  const activeWorkOrders = profile?.activeWorkOrders ?? []
  const canAddExpense = Boolean(currentSessionId && activeSessions.some((session) => session.id === currentSessionId))
  const sortedSessionExpenses = [...activeSessionExpenses].sort((left, right) => {
    const leftValue = getSessionExpenseSortValue(left, sessionTableSortKey)
    const rightValue = getSessionExpenseSortValue(right, sessionTableSortKey)

    let comparison = 0
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      comparison = leftValue - rightValue
    } else {
      comparison = String(leftValue).localeCompare(String(rightValue))
    }

    return sessionTableSortDirection === 'asc' ? comparison : -comparison
  })

  return (
    <div className={`auth-shell ${authView === 'profile' || authView === 'session-tracker' ? 'profile-shell' : ''}`}>
      {authView === 'auth' ? (
        <article className={`auth-paper ${isRegisterExiting ? 'exiting' : ''}`}>
          <p className="auth-kicker">Star Citizen Companion</p>
          <h1>{mode === 'login' ? 'Welcome Back, Pilot' : 'Create Your Account'}</h1>
          <p className="auth-subhead">
            {mode === 'login'
              ? 'Sign in to access your salvage and mining operation tracker.'
              : 'Register a new profile to start tracking sessions and profitability.'}
          </p>

          <div className="auth-switcher" role="tablist" aria-label="Authentication Mode">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => {
                setMode('login')
                setAuthError('')
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => {
                setMode('register')
                setAuthError('')
              }}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={submitAuth}>
            {mode === 'register' ? (
              <label>
                Callsign
                <input
                  required
                  value={callsign}
                  onChange={(event) => setCallsign(event.target.value)}
                  placeholder="Captain_Example"
                />
              </label>
            ) : null}

            {mode === 'login' ? (
              <label className="remember-row">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember me</span>
              </label>
            ) : null}

            <label>
              {mode === 'login' ? 'Email or Callsign' : 'Email'}
              <input
                required
                type={mode === 'login' ? 'text' : 'email'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={mode === 'login' ? 'pilot@example.com or Captain_Example' : 'pilot@example.com'}
              />
            </label>

            <label>
              Password
              <div className="password-wrap">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'View'}
                </button>
              </div>
            </label>

            {mode === 'register' ? (
              <label>
                Confirm Password
                <div className="password-wrap">
                  <input
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? 'Hide' : 'View'}
                  </button>
                </div>
              </label>
            ) : null}

            {authError ? <p className="auth-error">{authError}</p> : null}

            <button type="submit" className="auth-submit" disabled={isRegisterExiting}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </article>
      ) : authView === 'profile-setup' ? (
        <article className="profile-paper">
          <p className="auth-kicker">First-Time Profile Setup</p>
          <h1>Set Up Your Pilot Profile</h1>
          <p className="auth-subhead">
            Choose your role and primary ship before entering your profile.
          </p>

          <form className="profile-setup-form" onSubmit={viewProfileFromSetup}>
            <label>
              Role
              <select
                value={setupRole}
                onChange={(event) => setSetupRole(event.target.value)}
              >
                {ROLE_CHOICES.map((roleChoice) => (
                  <option key={roleChoice} value={roleChoice}>
                    {roleChoice}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ship
              <select
                value={setupShip}
                onChange={(event) => setSetupShip(event.target.value)}
              >
                <option value="">Choose ship</option>
                {SHIP_CHOICES.map((shipChoice) => (
                  <option key={shipChoice} value={shipChoice}>
                    {shipChoice}
                  </option>
                ))}
              </select>
            </label>

            {setupError ? <p className="auth-error">{setupError}</p> : null}

            <button type="submit" className="auth-submit">
              View Profile
            </button>
          </form>
        </article>
      ) : authView === 'session-tracker' ? (
        <article className="profile-paper profile-page">
          <p className="auth-kicker">Session Tracker</p>
            <h1>{activeSessionName}</h1>
          <p className="auth-subhead">Track expenses and profit for the current run.</p>

          <div className="session-tracker-actions">
            {canAddExpense ? (
              <button type="button" className="auth-submit add-ship-button" onClick={openAddExpenseOverlay}>
                Add Expense
              </button>
            ) : (
              <p className="auth-subhead">Session is closed. Add Expense is unavailable.</p>
            )}
          </div>

          <section className="active-work-orders-section">
            <div className="active-work-orders-header">
              <h3>Active Work Orders</h3>
            </div>

            {profile?.activeWorkOrders && profile.activeWorkOrders.length > 0 ? (
              <ul className="active-work-orders-list">
                {profile.activeWorkOrders.map((workOrder) => (
                      <li key={workOrder.id}>
                        <div>
                          <strong>{workOrder.location}</strong>
                          <span>Type: {workOrder.type}</span>
                          <span>Timer: {formatWorkOrderTimer(workOrder)}</span>
                        </div>
                        {getWorkOrderRemainingSeconds(workOrder) === 0 ? (
                          <button
                            type="button"
                            className="sold-work-order-button"
                            onClick={() => {
                              openSoldWorkOrderOverlay(workOrder.id)
                            }}
                          >
                            Sold
                          </button>
                        ) : (
                          <span className="work-order-running-label">Running</span>
                        )}
                      </li>
                ))}
              </ul>
            ) : (
              <p className="auth-subhead">No active work orders.</p>
            )}
          </section>

          <section className="session-tracker-table-wrap">
            <table className="session-tracker-table">
              <thead>
                <tr>
                  <th
                    aria-sort={
                      sessionTableSortKey === 'type'
                        ? sessionTableSortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button type="button" className="table-sort-button" onClick={() => handleSessionTableSort('type')}>
                      Category
                    </button>
                  </th>
                  <th
                    aria-sort={
                      sessionTableSortKey === 'description'
                        ? sessionTableSortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSessionTableSort('description')}
                    >
                      Description
                    </button>
                  </th>
                  <th
                    aria-sort={
                      sessionTableSortKey === 'amount'
                        ? sessionTableSortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button type="button" className="table-sort-button" onClick={() => handleSessionTableSort('amount')}>
                      Amount (aUEC)
                    </button>
                  </th>
                  <th
                    aria-sort={
                      sessionTableSortKey === 'time'
                        ? sessionTableSortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button type="button" className="table-sort-button" onClick={() => handleSessionTableSort('time')}>
                      Functioning Time
                    </button>
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="session-row-title">Expenses</td>
                </tr>
                {sortedSessionExpenses.length > 0 ? (
                  sortedSessionExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.type}</td>
                      <td>{getSessionExpenseDescription(expense)}</td>
                      <td className="session-amount-expense">{expense.cost.toLocaleString()}</td>
                      <td>{expense.type === 'Work Orders' ? formatRemainingTime(expense) : '-'}</td>
                      <td className="expense-action-cell">
                        <button
                          type="button"
                          className="remove-expense-button"
                          onClick={() => {
                            void removeSessionExpense(expense.id)
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No expenses added yet.</td>
                  </tr>
                )}
                <tr>
                  <td>Total Expenses</td>
                  <td>Sum of all session expense entries</td>
                  <td className="session-amount-expense">{totalSessionExpenses.toLocaleString()}</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td colSpan={5} className="session-row-title">Profit</td>
                </tr>
                <tr>
                  <td>Gross Revenue</td>
                  <td>Total sale value from session outputs</td>
                  <td className="session-amount-profit">{grossRevenue.toLocaleString()}</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>Net Profit</td>
                  <td>Gross revenue minus total expenses</td>
                  <td className="session-amount-profit">{netProfit.toLocaleString()}</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </section>

          {showAddExpenseOverlay ? (
            <div className="ship-overlay" role="dialog" aria-modal="true" aria-label="Add Expense">
              <article className="ship-overlay-paper">
                <p className="auth-kicker">Session Tracker</p>
                <h2>Add Expense</h2>
                <form className="profile-setup-form" onSubmit={submitAddExpense}>
                  <label>
                    Expense Type
                    <select
                      value={expenseTypeInput}
                      onChange={(event) => {
                        const nextType = event.target.value as (typeof EXPENSE_TYPES)[number]
                        setExpenseTypeInput(nextType)
                        if (nextType === 'Work Orders') {
                          setExpenseCostInput(WORK_ORDER_PROCESSING_MAP[expenseProcessingTypeInput].cost)
                        } else {
                          setExpenseCostInput(EXPENSE_TYPE_COST_MAP[nextType])
                        }
                      }}
                    >
                      {EXPENSE_TYPES.map((expenseType) => (
                        <option key={expenseType} value={expenseType}>
                          {expenseType}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Cost (aUEC)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={expenseCostInput}
                      onChange={(event) => setExpenseCostInput(Number(event.target.value))}
                    />
                  </label>

                  {expenseTypeInput === 'Work Orders' ? (
                    <>
                      <label>
                        Location
                        <input
                          list="refinery-station-options"
                          value={expenseLocationInput}
                          onChange={(event) => setExpenseLocationInput(event.target.value)}
                          placeholder="Search refinery station"
                        />
                        <datalist id="refinery-station-options">
                          {REFINERY_STATION_OPTIONS.map((station) => (
                            <option key={station} value={station} />
                          ))}
                        </datalist>
                      </label>

                      <label>
                        Processing Type
                        <select
                          value={expenseProcessingTypeInput}
                          onChange={(event) => {
                            const nextProcessingType = event.target.value as (typeof WORK_ORDER_PROCESSING_TYPES)[number]
                            setExpenseProcessingTypeInput(nextProcessingType)
                            setExpenseCostInput(WORK_ORDER_PROCESSING_MAP[nextProcessingType].cost)
                            setExpenseFunctioningTimeInput(WORK_ORDER_PROCESSING_MAP[nextProcessingType].functioningTimeMinutes)
                          }}
                        >
                          {WORK_ORDER_PROCESSING_TYPES.map((processingType) => (
                            <option key={processingType} value={processingType}>
                              {processingType}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Functioning Time (min)
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={expenseFunctioningTimeInput}
                          onChange={(event) => setExpenseFunctioningTimeInput(Number(event.target.value))}
                        />
                      </label>
                    </>
                  ) : null}

                  {expenseError ? <p className="auth-error">{expenseError}</p> : null}

                  <div className="ship-overlay-actions">
                    <button type="button" className="auth-submit ship-cancel" onClick={closeAddExpenseOverlay}>
                      Cancel
                    </button>
                    <button type="submit" className="auth-submit">
                      Save Expense
                    </button>
                  </div>
                </form>
              </article>
            </div>
          ) : null}

          {showSoldWorkOrderOverlay ? (
            <div className="ship-overlay" role="dialog" aria-modal="true" aria-label="Sold Work Order">
              <article className="ship-overlay-paper">
                <p className="auth-kicker">Work Order Completed</p>
                <h2>Record Sale</h2>
                <form className="profile-setup-form" onSubmit={submitSoldWorkOrder}>
                  <label>
                    Sold Amount (aUEC)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={soldAmountInput}
                      onChange={(event) => setSoldAmountInput(Number(event.target.value))}
                    />
                  </label>

                  <label>
                    Quantity (SCU)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={soldQuantityScuInput}
                      onChange={(event) => setSoldQuantityScuInput(Number(event.target.value))}
                    />
                  </label>

                  {soldWorkOrderError ? <p className="auth-error">{soldWorkOrderError}</p> : null}

                  <div className="ship-overlay-actions">
                    <button type="button" className="auth-submit ship-cancel" onClick={closeSoldWorkOrderOverlay}>
                      Cancel
                    </button>
                    <button type="submit" className="auth-submit sold-work-order-button">
                      Save Sale
                    </button>
                  </div>
                </form>
              </article>
            </div>
          ) : null}

          <div className="profile-footer-actions">
            <button type="button" className="auth-submit" onClick={closeSessionTrackerView}>
              Back To Profile
            </button>
          </div>
        </article>
      ) : (
        <article className="profile-paper profile-page">
          <p className="auth-kicker">User Profile</p>
          <h1>{profile?.callsign || 'Pilot'}</h1>
          <button type="button" className="auth-submit profile-more-button" onClick={openMoreOverlay}>
            More
          </button>
          <p className="auth-subhead">
            Personal command profile for your Star Citizen operations.
          </p>
          <div className="profile-grid">
            <div>
              <span>Callsign</span>
              <strong>{profile?.callsign ?? 'Unknown'}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{profile?.role ?? 'Salvage and Mining Operator'}</strong>
            </div>
            <div>
              <span>Ship</span>
              <select
                value={profile?.ship ?? ''}
                onChange={(event) => {
                  void selectPrimaryShip(event.target.value)
                }}
              >
                <option value="">None selected</option>
                {ownedShipNames.map((shipName) => (
                  <option key={shipName} value={shipName}>
                    {shipName}
                  </option>
                ))}
              </select>
              {shipUpdateError ? <p className="auth-error">{shipUpdateError}</p> : null}
            </div>
          </div>

          <div className="overview-grid">
            <section className="financial-section">
              <div className="financial-header">
                <h2>Financial</h2>
                <button type="button" className="auth-submit add-ship-button" onClick={openFinancialOverlay}>
                  Update Financial
                </button>
              </div>
              <div className="financial-grid">
                <div>
                  <span>Current Balance</span>
                  <strong>{toAuec(profile?.financial.currentBalance ?? 0)}</strong>
                </div>
                <div>
                  <span>Total Earnings</span>
                  <strong>{toAuec(profile?.financial.totalEarnings ?? 0)}</strong>
                </div>
                <div>
                  <span>Total Costs</span>
                  <strong>{toAuec(profile?.financial.totalCosts ?? 0)}</strong>
                </div>
                <div>
                  <span>Net Profit</span>
                  <strong>
                    {toAuec((profile?.financial.totalEarnings ?? 0) - (profile?.financial.totalCosts ?? 0))}
                  </strong>
                </div>
                <div>
                  <span>Session Expenses</span>
                  <strong>{toAuec(sessionCost)}</strong>
                </div>
                <div>
                  <span>Session Profit</span>
                  <strong>{toAuec(netProfit)}</strong>
                </div>
              </div>
            </section>

            <section className="sessions-section">
              <div className="sessions-header">
                <h2>Sessions</h2>
                <button
                  type="button"
                  className="auth-submit add-ship-button"
                  onClick={() => {
                    void startNewSession()
                  }}
                >
                  Start New Session
                </button>
              </div>
              <div className="sessions-grid">
                <div>
                  <span>Total Sessions</span>
                  <strong>{profile?.sessions?.totalSessions ?? 0}</strong>
                </div>
                <div>
                  <span>Salvage Sessions</span>
                  <strong>{profile?.sessions?.salvageSessions ?? 0}</strong>
                </div>
                <div>
                  <span>Mining Sessions</span>
                  <strong>{profile?.sessions?.miningSessions ?? 0}</strong>
                </div>
                <div>
                  <span>Session Profit</span>
                  <strong>{toAuec(profile?.sessions?.totalProfit ?? 0)}</strong>
                </div>
                <div>
                  <span>Session Cost</span>
                  <strong>{toAuec(sessionCost)}</strong>
                </div>
              </div>

              <section className="active-sessions-section">
                <div className="active-sessions-header">
                  <h3>Active Sessions</h3>
                  <strong>{activeSessionCount}</strong>
                </div>

                {activeSessions.length > 0 ? (
                  <ul className="active-sessions-list">
                    {activeSessions.map((session) => {
                      const sessionExpenseTotal = session.expenses.reduce((total, expense) => total + expense.cost, 0)
                      return (
                        <li key={session.id}>
                          <div>
                            <strong>{session.name}</strong>
                            <span>Type: {session.type}</span>
                            <span>Started {new Date(session.startedAt).toLocaleString()}</span>
                            <span>Timer: {formatSessionTimer(session)}</span>
                            <span>Expenses: {toAuec(sessionExpenseTotal)}</span>
                            <span className="active-session-work-orders-label">
                              Work Orders Count: {activeWorkOrders.length}
                            </span>
                            {activeWorkOrders.length > 0 ? (
                              <div className="active-session-work-order-timers">
                                {activeWorkOrders.map((workOrder) => (
                                  <span key={workOrder.id}>
                                    {workOrder.location}: {formatWorkOrderTimer(workOrder)}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="active-session-actions">
                            <button
                              type="button"
                              className="auth-submit add-ship-button"
                              onClick={() => openActiveSessionView(session.id)}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className="auth-submit ship-cancel"
                              onClick={() => closeActiveSession(session.id)}
                            >
                              Close Session
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="auth-subhead">No active sessions.</p>
                )}
              </section>

              {sessionError ? <p className="auth-error">{sessionError}</p> : null}
            </section>
          </div>

          {showStartSessionOverlay ? (
            <div className="ship-overlay" role="dialog" aria-modal="true" aria-label="Start New Session">
              <article className="ship-overlay-paper">
                <p className="auth-kicker">Sessions</p>
                <h2>Start New Session</h2>
                <form className="profile-setup-form" onSubmit={submitStartSession}>
                  <label>
                    Session Name
                    <input
                      value={sessionNameInput}
                      onChange={(event) => setSessionNameInput(event.target.value)}
                    />
                  </label>

                  <label>
                    Session Type
                    <select
                      value={sessionTypeInput}
                      onChange={(event) =>
                        setSessionTypeInput(event.target.value as (typeof SESSION_TYPES)[number])
                      }
                    >
                      {SESSION_TYPES.map((sessionType) => (
                        <option key={sessionType} value={sessionType}>
                          {sessionType}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="ship-overlay-actions">
                    <button type="button" className="auth-submit ship-cancel" onClick={closeStartSessionOverlay}>
                      Cancel
                    </button>
                    <button type="submit" className="auth-submit">
                      Start Session
                    </button>
                  </div>
                </form>
              </article>
            </div>
          ) : null}

          <section className="owned-ships-section">
            <div className="owned-ships-header">
              <h2>Owned Ships</h2>
              <button type="button" className="auth-submit add-ship-button" onClick={openAddShipOverlay}>
                Add Ship
              </button>
            </div>
            {profile?.ownedShips && profile.ownedShips.length > 0 ? (
              <ul className="owned-ships-list">
                {profile.ownedShips.map((ownedShip) => (
                  <li key={ownedShip.id}>
                    <strong>{ownedShip.name}</strong>
                    <span>Cargo: {ownedShip.cargoCapacity.toLocaleString()} SCU</span>
                    <span>Function: {ownedShip.functionLabel}</span>
                    <button
                      type="button"
                      className="remove-ship-button"
                      onClick={() => {
                        void removeOwnedShip(ownedShip.id)
                      }}
                      aria-label={`Remove ${ownedShip.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="auth-subhead">No owned ships listed yet.</p>
            )}
          </section>

          <div className="profile-footer-actions">
            <button type="button" className="auth-submit logout-button" onClick={logout}>
              Log Out
            </button>
          </div>

          {showAddShipOverlay ? (
            <div className="ship-overlay" role="dialog" aria-modal="true" aria-label="Add Ship">
              <article className="ship-overlay-paper">
                <p className="auth-kicker">Owned Ships</p>
                <h2>Add Ship</h2>
                <form className="profile-setup-form" onSubmit={submitAddShip}>
                  <label>
                    Ship Name
                    <select
                      value={addShipName}
                      onChange={(event) => {
                        const selectedShip = event.target.value
                        setAddShipName(selectedShip)
                        setAddShipFunction(inferShipFunction(selectedShip))
                        void autoFillCargoCapacity(selectedShip)
                      }}
                    >
                      <option value="">Choose ship</option>
                      {SHIP_CHOICES.map((shipChoice) => (
                        <option key={shipChoice} value={shipChoice}>
                          {shipChoice}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Cargo Capacity (SCU)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={addShipCargoCapacity}
                      onChange={(event) => setAddShipCargoCapacity(Number(event.target.value))}
                    />
                  </label>

                  {isCargoCapacityLoading ? <p className="auth-subhead">Fetching cargo capacity from internet...</p> : null}

                  <label>
                    Function
                    <input
                      value={addShipFunction}
                      onChange={(event) => setAddShipFunction(event.target.value)}
                      placeholder="Salvage, Mining, Cargo, Multirole"
                    />
                  </label>

                  {addShipError ? <p className="auth-error">{addShipError}</p> : null}

                  <div className="ship-overlay-actions">
                    <button type="button" className="auth-submit ship-cancel" onClick={closeAddShipOverlay}>
                      Cancel
                    </button>
                    <button type="submit" className="auth-submit">
                      Save Ship
                    </button>
                  </div>
                </form>
              </article>
            </div>
          ) : null}

          {showFinancialOverlay ? (
            <div className="ship-overlay" role="dialog" aria-modal="true" aria-label="Update Financial">
              <article className="ship-overlay-paper">
                <p className="auth-kicker">Financial</p>
                <h2>Update Financial</h2>
                <form className="profile-setup-form" onSubmit={submitFinancialUpdate}>
                  <label>
                    Current Balance (aUEC)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={financialBalanceInput}
                      onChange={(event) => setFinancialBalanceInput(Number(event.target.value))}
                    />
                  </label>

                  <label>
                    Total Earnings (aUEC)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={financialEarningsInput}
                      onChange={(event) => setFinancialEarningsInput(Number(event.target.value))}
                    />
                  </label>

                  <label>
                    Total Costs (aUEC)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={financialCostsInput}
                      onChange={(event) => setFinancialCostsInput(Number(event.target.value))}
                    />
                  </label>

                  {financialError ? <p className="auth-error">{financialError}</p> : null}

                  <div className="ship-overlay-actions">
                    <button type="button" className="auth-submit ship-cancel" onClick={closeFinancialOverlay}>
                      Cancel
                    </button>
                    <button type="submit" className="auth-submit">
                      Save Financial
                    </button>
                  </div>
                </form>
              </article>
            </div>
          ) : null}

          {showMoreOverlay ? (
            <div className="ship-overlay" role="dialog" aria-modal="true" aria-label="Edit Profile Details">
              <article className="ship-overlay-paper">
                <p className="auth-kicker">Profile Details</p>
                <h2>Edit Details</h2>
                <form className="profile-setup-form" onSubmit={submitProfileDetails}>
                  <label>
                    Email
                    <input
                      type="email"
                      value={detailEmailInput}
                      onChange={(event) => setDetailEmailInput(event.target.value)}
                      placeholder="pilot@example.com"
                    />
                  </label>

                  <label>
                    Account Created
                    <input
                      type="datetime-local"
                      value={detailCreatedAtInput}
                      onChange={(event) => setDetailCreatedAtInput(event.target.value)}
                    />
                  </label>

                  {detailError ? <p className="auth-error">{detailError}</p> : null}

                  <div className="ship-overlay-actions">
                    <button type="button" className="auth-submit ship-cancel" onClick={closeMoreOverlay}>
                      Cancel
                    </button>
                    <button type="submit" className="auth-submit">
                      Save Details
                    </button>
                  </div>
                </form>
              </article>
            </div>
          ) : null}

        </article>
      )}
    </div>
  )
}

export default App
