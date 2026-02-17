import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])

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
    if (session?.user) loadLogs()
    else setLogs([])
  }, [session?.user?.id])

  async function signUp() {
    setLoading(true)
    setStatus('Creating account...')
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    setStatus(error ? error.message : 'Account created. You can now sign in.')
  }

  async function signIn() {
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
        <p>Track which Juz/Surah was read, by whom, and where.</p>
        <section className="card">
          <h2>Sign in</h2>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          <div className="row">
            <button disabled={loading} onClick={signIn}>Sign In</button>
            <button disabled={loading} onClick={signUp} className="secondary">Sign Up</button>
          </div>
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
      <p className="muted">Logged in as: <strong>{session.user.email}</strong></p>

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
        <h2>Counts by Juz</h2>
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
    </main>
  )
}

export default App
