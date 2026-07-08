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

type UserProfile = {
  callsign: string
  email: string
  createdAt: string
  nickname: string
  role: string
  ship: string
  ownedShips: OwnedShip[]
  financial: FinancialProfile
  sessions: SessionMetrics
}

type AuthSession = {
  token: string
  user: UserProfile
}

const AUTH_STORAGE_KEY = 'sc-auth-session-v1'

const SHIP_CHOICES = [
  'Vulture',
  'Reclaimer',
  'Prospector',
  'Mole',
  'Constellation Taurus',
  'Freelancer MAX',
]

const ROLE_CHOICES = ['Salvager', 'Miner', 'Hybrid Operator', 'Fleet Lead']

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

function createOwnedShip(name: string, cargoCapacity: number, functionLabel: string): OwnedShip {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    cargoCapacity,
    functionLabel,
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
  const [authView, setAuthView] = useState<'auth' | 'profile-setup' | 'profile'>('auth')
  const [isRegisterExiting, setIsRegisterExiting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authToken, setAuthToken] = useState('')
  const [authStorageType, setAuthStorageType] = useState<SessionStorageType>('session')
  const [setupNickname, setSetupNickname] = useState('')
  const [setupRole, setSetupRole] = useState(ROLE_CHOICES[0])
  const [setupShip, setSetupShip] = useState('')
  const [setupError, setSetupError] = useState('')
  const [showAddShipOverlay, setShowAddShipOverlay] = useState(false)
  const [addShipName, setAddShipName] = useState('')
  const [addShipCargoCapacity, setAddShipCargoCapacity] = useState(0)
  const [addShipFunction, setAddShipFunction] = useState('')
  const [addShipError, setAddShipError] = useState('')
  const [showFinancialOverlay, setShowFinancialOverlay] = useState(false)
  const [financialBalanceInput, setFinancialBalanceInput] = useState(0)
  const [financialEarningsInput, setFinancialEarningsInput] = useState(0)
  const [financialCostsInput, setFinancialCostsInput] = useState(0)
  const [financialError, setFinancialError] = useState('')
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
        nickname: nextCallsign,
        role: setupRole,
        ship: '',
        ownedShips: [],
        financial: defaultFinancial(),
        sessions: defaultSessions(),
      })
      setSetupNickname(nextCallsign)
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

    if (!setupNickname.trim()) {
      setSetupError('Nickname is required.')
      return
    }

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
          nickname: setupNickname.trim(),
          role: setupRole,
          ship: setupShip.trim(),
          ownedShips: [ownedShip],
          sessions: defaultSessions(),
          financial: defaultFinancial(),
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
    setShowAddShipOverlay(true)
  }

  function closeAddShipOverlay() {
    setShowAddShipOverlay(false)
    setAddShipError('')
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

  return (
    <div className={`auth-shell ${authView === 'profile' ? 'profile-shell' : ''}`}>
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
            Choose your nickname, role, and primary ship before entering your profile.
          </p>

          <form className="profile-setup-form" onSubmit={viewProfileFromSetup}>
            <label>
              Nickname
              <input
                required
                value={setupNickname}
                onChange={(event) => setSetupNickname(event.target.value)}
                placeholder="ScrapHawk"
              />
            </label>

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
      ) : (
        <article className="profile-paper profile-page">
          <p className="auth-kicker">User Profile</p>
          <h1>{profile?.nickname || profile?.callsign || 'Pilot'}</h1>
          <button type="button" className="auth-submit profile-more-button" onClick={openMoreOverlay}>
            More
          </button>
          <p className="auth-subhead">
            Personal command profile for your Star Citizen operations.
          </p>
          <div className="profile-grid">
            <div>
              <span>Nickname</span>
              <strong>{profile?.nickname ?? 'Pilot'}</strong>
            </div>
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
              <strong>{profile?.ship ?? 'None selected'}</strong>
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
              </div>
            </section>

            <section className="sessions-section">
              <h2>Sessions</h2>
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
              </div>
            </section>
          </div>

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
                      onChange={(event) => setAddShipName(event.target.value)}
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
