import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function itsToEmail(its) {
  const clean = String(its || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
  return `${clean}@its.local`
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const [fullName, setFullName] = useState('')
  const [its, setIts] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [adminLogs, setAdminLogs] = useState([])

  const [juz, setJuz] = useState(1)
  const [surah, setSurah] = useState('')
  const [readAt, setReadAt] = useState(new Date().toISOString().slice(0, 16))
  const [location, setLocation] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
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
    const cleanIts = String(its).trim().toLowerCase()
    if (!cleanIts || !password || !fullName.trim()) {
      setStatus('Please enter full name, ITS, and password.')
      return
    }

    const email = itsToEmail(cleanIts)

    setLoading(true)
    setStatus('Creating account...')

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          its: cleanIts,
        },
      },
    })

    if (signUpError) {
      setLoading(false)
      setStatus(signUpError.message)
      return
    }

    // Try immediate sign-in (works when email confirmation is disabled)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setLoading(false)
      setStatus('Account created. If email confirmation is enabled, confirm then sign in.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.id) {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName.trim(),
        its: cleanIts,
      })
    }

    setLoading(false)
    setStatus('Account created and signed in ✅')
  }

  async function signIn() {
    const cleanIts = String(its).trim().toLowerCase()
    const email = itsToEmail(cleanIts)
    setLoading(true)
    setStatus('Signing in...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    setStatus(error ? error.message : 'Signed in successfully.')
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

  const countsByJuz = useMemo(() => {
    const map = new Map()
    for (const row of logs) {
      map.set(row.juz_number, (map.get(row.juz_number) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [logs])

  if (!session) {
    return (
      <main className="container">
        <h1>Quran Read Tracker</h1>
        <p>Sign up using Full Name + ITS + Password.</p>
        <section className="card">
          <h2>Sign in / Sign up</h2>
          <label>Full Name (for signup)</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" />

          <label>ITS</label>
          <input value={its} onChange={(e) => setIts(e.target.value)} type="text" placeholder="e.g. 12345678" />

          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />

          <div className="row">
            <button disabled={loading} onClick={signIn}>Sign In</button>
            <button disabled={loading} onClick={signUp} className="secondary">Sign Up</button>
          </div>

          <small>ITS login is implemented via internal mapped email (ITS@its.local).</small>
          <small>{status}</small>
        </section>
      </main>
    )
  }

  return (
    <main className="container">
      <div className="header-row">
        <h1>Quran Read Tracker</h1>
        <button onClick={signOut} className="secondary">Sign out</button>
      </div>
      <p className="muted">
        Logged in as: <strong>{profile?.full_name || session.user.email}</strong>
        {profile?.its ? ` (ITS: ${profile.its})` : ''}
        {profile?.is_admin ? ' • Admin' : ''}
      </p>

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
          <small>To make a user admin: set profiles.is_admin = true in Supabase for that user.</small>
        </section>
      )}
    </main>
  )
}

export default App
