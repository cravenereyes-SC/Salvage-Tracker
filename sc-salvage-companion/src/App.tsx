import { type FormEvent, useState } from 'react'
import './App.css'

type AuthMode = 'login' | 'register'

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [callsign, setCallsign] = useState('')

  function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'register' && password !== confirmPassword) {
      return
    }
  }

  return (
    <div className="auth-shell">
      <article className="auth-paper">
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
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
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

          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="pilot@example.com"
            />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </label>

          {mode === 'register' ? (
            <label>
              Confirm Password
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
              />
            </label>
          ) : null}

          <button type="submit" className="auth-submit">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </article>
    </div>
  )
}

export default App
