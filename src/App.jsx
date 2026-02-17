import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function EyeToggle({ shown, onToggle }) {
  return (
    <button type="button" className="eye-btn" onClick={onToggle} aria-label={shown ? 'Hide password' : 'Show password'}>
      {shown ? '🙈' : '👁️'}
    </button>
  )
}

function PasswordField({ label, value, onChange, shown, onToggle, placeholder = '' }) {
  return (
    <>
      <label>{label}</label>
      <div className="password-wrap">
        <input
          value={value}
          onChange={onChange}
          type={shown ? 'text' : 'password'}
          placeholder={placeholder}
        />
        <EyeToggle shown={shown} onToggle={onToggle} />
      </div>
    </>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authView, setAuthView] = useState('signin') // signin | signup | forgot | reset

  const [fullName, setFullName] = useState('')
  const [its, setIts] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authInfo, setAuthInfo] = useState('')

  const [logs, setLogs] = useState([])
  const [adminLogs, setAdminLogs] = useState([])

  const [juz, setJuz] = useState(1)
  const [surah, setSurah] = useState('')
  const [readAt, setReadAt] = useState(new Date().toISOString().slice(0, 16))
  const [location, setLocation] = useState(null)
  const [status, setStatus] = useState('')

  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset')
        setAuthInfo('Set your new password below.')
        setAuthError('')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    if (session?.user) {
      loadProfile()
      loadLogs()
    } else {
      setProfile(null)
      setLogs([])
      setAdminLogs([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  useEffect(() => {
    if (profile?.is_admin) loadAdminLogs()
    else setAdminLogs([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.is_admin])

  async function loadProfile() {
    const userId = session?.user?.id
    if (!userId) return

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      setStatus(error.message)
      return
    }
    setProfile(data)
  }

  async function signUp() {
    setAuthError('')
    setAuthInfo('')

    const cleanIts = String(its).trim()
    if (!fullName.trim() || !cleanIts || !email.trim() || !password) {
      setAuthError('Please enter Full Name, ITS, email, and password.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}`,
        data: {
          full_name: fullName.trim(),
          its: cleanIts,
        },
      },
    })
    setLoading(false)

    if (error) {
      setAuthError(error.message)
      return
    }

    setAuthInfo('A confirmation email has been sent to you. Please confirm your email, then sign in using ITS and password.')
    setAuthView('signin')
    setPassword('')
    setConfirmPassword('')
  }

  async function signIn() {
    setAuthError('')
    setAuthInfo('')

    const cleanIts = String(its).trim()
    if (!cleanIts || !password) {
      setAuthError('Please enter ITS and password.')
      return
    }

    setLoading(true)

    const { data: lookup, error: lookupError } = await supabase.rpc('get_email_by_its', {
      p_its: cleanIts,
    })

    if (lookupError || !lookup) {
      setLoading(false)
      setAuthError('Invalid ITS or password.')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: lookup,
      password,
    })

    if (signInError) {
      setLoading(false)
      setAuthError(
        signInError.message.toLowerCase().includes('email not confirmed')
          ? 'Please confirm your email first, then sign in.'
          : 'Invalid ITS or password.',
      )
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email_confirmed_at) {
      await supabase.auth.signOut()
      setLoading(false)
      setAuthError('Please confirm your email first, then sign in.')
      return
    }

    setLoading(false)
  }

  async function requestPasswordReset() {
    setAuthError('')
    setAuthInfo('')

    if (!email.trim()) {
      setAuthError('Please enter your email.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}`,
    })
    setLoading(false)

    if (error) {
      setAuthError(error.message)
      return
    }

    setAuthInfo('Password reset link has been sent to your email. Open the link, then set a new password.')
  }

  async function resetPasswordNow() {
    setAuthError('')
    setAuthInfo('')

    if (!password || !confirmPassword) {
      setAuthError('Please enter new password and confirm it.')
      return
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setAuthError(error.message)
      return
    }

    setAuthInfo('Password updated successfully. Please sign in now.')
    setPassword('')
    setConfirmPassword('')
    setAuthView('signin')
  }

  async function signOut() {
    await supabase.auth.signOut()
    setStatus('Signed out.')
  }

  async function loadLogs() {
    const { data, error } = await supabase
      .from('read_logs')
      .select('*')
      .order('read_at', { ascending: false })
      .limit(200)

    if (error) {
      setStatus(error.message)
      return
    }
    setLogs(data ?? [])
  }

  async function loadAdminLogs() {
    const { data, error } = await supabase.rpc('get_all_read_logs_admin')
    if (error) {
      setStatus(error.message)
      return
    }
    setAdminLogs(data ?? [])
  }

  async function useMyLocation() {
    setStatus('Getting location...')
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setStatus('Location captured.')
      },
      (err) => setStatus(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  async function submitLog(e) {
    e.preventDefault()
    if (!session?.user?.id) {
      setStatus('Please sign in first.')
      return
    }

    setLoading(true)
    setStatus('Saving log...')

    const { error } = await supabase.from('read_logs').insert({
      user_id: session.user.id,
      juz_number: Number(juz),
      surah_number: surah ? Number(surah) : null,
      read_at: new Date(readAt).toISOString(),
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      location_accuracy_m: location?.accuracy ?? null,
    })

    setLoading(false)
    if (error) {
      setStatus(error.message)
      return
    }

    setStatus('Read log saved ✅')
    setSurah('')
    await loadLogs()
    if (profile?.is_admin) await loadAdminLogs()
  }

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const countsByJuz = useMemo(() => {
    const map = new Map()
    for (const row of logs) {
      map.set(row.juz_number, (map.get(row.juz_number) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [logs])

  if (!session) {
    return (
      <main className="container auth-shell">
        <section className="card auth-card">
          <h1>Quran Read Tracker</h1>

          {authView === 'signin' && (
            <>
              <h2>Sign in</h2>
              <label>ITS</label>
              <input value={its} onChange={(e) => setIts(e.target.value)} type="text" placeholder="Ex: 40239713" />

              <PasswordField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                shown={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />

              <div className="row">
                <button disabled={loading} onClick={signIn}>Sign In</button>
              </div>

              <div className="row row-links">
                <button className="link-btn" type="button" onClick={() => { setAuthView('signup'); setAuthError(''); setAuthInfo('') }}>
                  Create account
                </button>
                <button className="link-btn" type="button" onClick={() => { setAuthView('forgot'); setAuthError(''); setAuthInfo('') }}>
                  Forgot password?
                </button>
              </div>
            </>
          )}

          {authView === 'signup' && (
            <>
              <h2>Sign up</h2>
              <label>Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" />

              <label>ITS</label>
              <input value={its} onChange={(e) => setIts(e.target.value)} type="text" placeholder="Ex: 40239713" />

              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />

              <PasswordField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                shown={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />

              <div className="row">
                <button disabled={loading} onClick={signUp}>Create account</button>
              </div>

              <div className="row row-links">
                <button className="link-btn" type="button" onClick={() => { setAuthView('signin'); setAuthError(''); setAuthInfo('') }}>
                  Back to Sign in
                </button>
              </div>
            </>
          )}

          {authView === 'forgot' && (
            <>
              <h2>Forgot password</h2>
              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />

              <div className="row">
                <button disabled={loading} onClick={requestPasswordReset}>Send reset link</button>
              </div>

              <div className="row row-links">
                <button className="link-btn" type="button" onClick={() => { setAuthView('signin'); setAuthError(''); setAuthInfo('') }}>
                  Back to Sign in
                </button>
              </div>
            </>
          )}

          {authView === 'reset' && (
            <>
              <h2>Reset password</h2>
              <PasswordField
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                shown={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />

              <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                shown={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
              />

              <div className="row">
                <button disabled={loading} onClick={resetPasswordNow}>Update password</button>
              </div>
            </>
          )}

          {authError ? <p className="error-text">{authError}</p> : null}
          {authInfo ? <p className="success-text">{authInfo}</p> : null}
        </section>
      </main>
    )
  }

  return (
    <main className="container app-shell">
      <div className="header-row">
        <h1>Quran Read Tracker</h1>
        <div className="row">
          {installPrompt ? <button onClick={installApp}>Install App</button> : null}
          <button onClick={signOut} className="secondary">Sign out</button>
        </div>
      </div>
      <p className="muted">
        Logged in as: <strong>{profile?.full_name || session.user.email}</strong>
        {profile?.its ? ` (ITS: ${profile.its})` : ''}
        {profile?.is_admin ? ' • Admin' : ''}
      </p>
      {!installPrompt ? (
        <small className="muted">
          If Install button is not shown: on iPhone use Share → Add to Home Screen. On desktop/Android, browser may show install icon in address bar.
        </small>
      ) : null}

      <section className="card">
        <h2>Log a reading</h2>
        <form onSubmit={submitLog}>
          <label>Juz (1-30)</label>
          <input type="number" min="1" max="30" value={juz} onChange={(e) => setJuz(e.target.value)} required />

          <label>Surah (optional, 1-114)</label>
          <input type="number" min="1" max="114" value={surah} onChange={(e) => setSurah(e.target.value)} />

          <label>Read at</label>
          <input type="datetime-local" value={readAt} onChange={(e) => setReadAt(e.target.value)} required />

          <div className="row">
            <button type="button" onClick={useMyLocation} className="secondary">Use my location</button>
            <button type="submit" disabled={loading}>Save log</button>
          </div>

          {location && (
            <small>
              Location: {location.lat.toFixed(5)}, {location.lng.toFixed(5)} (±{Math.round(location.accuracy)}m)
            </small>
          )}
          <small>{status}</small>
        </form>
      </section>

      <section className="card">
        <h2>Counts by Juz (you)</h2>
        {countsByJuz.length === 0 ? (
          <p className="muted">No logs yet.</p>
        ) : (
          <ul>
            {countsByJuz.map(([juzNumber, count]) => (
              <li key={juzNumber}>Juz {juzNumber}: {count}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Recent logs (you)</h2>
        {logs.length === 0 ? (
          <p className="muted">No logs yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Juz</th>
                  <th>Surah</th>
                  <th>Lat</th>
                  <th>Lng</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.read_at).toLocaleString()}</td>
                    <td>{log.juz_number}</td>
                    <td>{log.surah_number ?? '-'}</td>
                    <td>{log.lat ? Number(log.lat).toFixed(4) : '-'}</td>
                    <td>{log.lng ? Number(log.lng).toFixed(4) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {profile?.is_admin && (
        <section className="card">
          <h2>Admin dashboard — all users</h2>
          {adminLogs.length === 0 ? (
            <p className="muted">No logs yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Full Name</th>
                    <th>ITS</th>
                    <th>Email</th>
                    <th>Juz</th>
                    <th>Surah</th>
                    <th>Lat</th>
                    <th>Lng</th>
                  </tr>
                </thead>
                <tbody>
                  {adminLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.read_at).toLocaleString()}</td>
                      <td>{log.full_name ?? '-'}</td>
                      <td>{log.its ?? '-'}</td>
                      <td>{log.email ?? '-'}</td>
                      <td>{log.juz_number}</td>
                      <td>{log.surah_number ?? '-'}</td>
                      <td>{log.lat ? Number(log.lat).toFixed(4) : '-'}</td>
                      <td>{log.lng ? Number(log.lng).toFixed(4) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <small>Superadmin access is controlled by profiles.is_admin = true.</small>
        </section>
      )}
    </main>
  )
}

export default App
