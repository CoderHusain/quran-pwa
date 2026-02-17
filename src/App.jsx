import { useEffect, useMemo, useState } from 'react'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { supabase } from './supabase'
import './App.css'

function PasswordField({ label, value, onChange, shown, onToggle, placeholder = '' }) {
  return (
    <TextField
      fullWidth
      label={label}
      value={value}
      onChange={onChange}
      type={shown ? 'text' : 'password'}
      placeholder={placeholder}
      margin="normal"
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={onToggle} edge="end" aria-label={shown ? 'Hide password' : 'Show password'}>
              {shown ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authView, setAuthView] = useState('signin')

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

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: lookup, password })

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
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
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
    for (const row of logs) map.set(row.juz_number, (map.get(row.juz_number) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [logs])

  if (!session) {
    return (
      <main className="container auth-shell">
        <Box className="card auth-card">
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Quran Read Tracker
          </Typography>

          {authView === 'signin' && (
            <>
              <Typography variant="h5" fontWeight={700}>Sign in</Typography>
              <TextField
                fullWidth
                label="ITS"
                value={its}
                onChange={(e) => setIts(e.target.value)}
                placeholder="Ex: 40239713"
                margin="normal"
              />
              <PasswordField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                shown={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />

              <Stack spacing={1.2} mt={1.5}>
                <Button variant="contained" onClick={signIn} disabled={loading}>Sign In</Button>
                <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  <Button variant="text" onClick={() => { setAuthView('signup'); setAuthError(''); setAuthInfo('') }}>
                    Create account
                  </Button>
                  <Button variant="text" onClick={() => { setAuthView('forgot'); setAuthError(''); setAuthInfo('') }}>
                    Forgot password?
                  </Button>
                </Stack>
              </Stack>
            </>
          )}

          {authView === 'signup' && (
            <>
              <Typography variant="h5" fontWeight={700}>Sign up</Typography>
              <TextField fullWidth label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} margin="normal" />
              <TextField fullWidth label="ITS" value={its} onChange={(e) => setIts(e.target.value)} placeholder="Ex: 40239713" margin="normal" />
              <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" margin="normal" />
              <PasswordField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                shown={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />
              <Stack spacing={1.2} mt={1.5}>
                <Button variant="contained" onClick={signUp} disabled={loading}>Create account</Button>
                <Button variant="text" onClick={() => { setAuthView('signin'); setAuthError(''); setAuthInfo('') }}>
                  Back to Sign in
                </Button>
              </Stack>
            </>
          )}

          {authView === 'forgot' && (
            <>
              <Typography variant="h5" fontWeight={700}>Forgot password</Typography>
              <TextField
                fullWidth
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                margin="normal"
              />
              <Stack spacing={1.2} mt={1.5}>
                <Button variant="contained" onClick={requestPasswordReset} disabled={loading}>Send reset link</Button>
                <Button variant="text" onClick={() => { setAuthView('signin'); setAuthError(''); setAuthInfo('') }}>
                  Back to Sign in
                </Button>
              </Stack>
            </>
          )}

          {authView === 'reset' && (
            <>
              <Typography variant="h5" fontWeight={700}>Reset password</Typography>
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
              <Box mt={1.5}>
                <Button variant="contained" fullWidth onClick={resetPasswordNow} disabled={loading}>Update password</Button>
              </Box>
            </>
          )}

          {authError ? <Alert severity="error" sx={{ mt: 2 }}>{authError}</Alert> : null}
          {authInfo ? <Alert severity="success" sx={{ mt: 2 }}>{authInfo}</Alert> : null}
        </Box>
      </main>
    )
  }

  return (
    <main className="container app-shell">
      <div className="header-row">
        <Typography variant="h4" fontWeight={700}>Quran Read Tracker</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {installPrompt ? <Button variant="contained" onClick={installApp}>Install App</Button> : null}
          <Button variant="outlined" onClick={signOut}>Sign out</Button>
        </Stack>
      </div>

      <Typography className="muted" sx={{ mt: 1 }}>
        Logged in as: <strong>{profile?.full_name || session.user.email}</strong>
        {profile?.its ? ` (ITS: ${profile.its})` : ''}
        {profile?.is_admin ? ' • Admin' : ''}
      </Typography>

      {!installPrompt ? (
        <Typography className="muted" sx={{ mt: 1 }}>
          If Install button is not shown: on iPhone use Share → Add to Home Screen. On desktop/Android, browser may show install icon in address bar.
        </Typography>
      ) : null}

      <Box className="card">
        <Typography variant="h5" fontWeight={700}>Log a reading</Typography>
        <Box component="form" onSubmit={submitLog}>
          <TextField fullWidth label="Juz (1-30)" type="number" inputProps={{ min: 1, max: 30 }} value={juz} onChange={(e) => setJuz(e.target.value)} margin="normal" required />
          <TextField fullWidth label="Surah (optional, 1-114)" type="number" inputProps={{ min: 1, max: 114 }} value={surah} onChange={(e) => setSurah(e.target.value)} margin="normal" />
          <TextField fullWidth label="Read at" type="datetime-local" value={readAt} onChange={(e) => setReadAt(e.target.value)} margin="normal" InputLabelProps={{ shrink: true }} required />

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mt={2}>
            <Button variant="outlined" type="button" onClick={useMyLocation}>Use my location</Button>
            <Button variant="contained" type="submit" disabled={loading}>Save log</Button>
          </Stack>

          {location ? (
            <Typography sx={{ mt: 1.2 }}>
              Location: {location.lat.toFixed(5)}, {location.lng.toFixed(5)} (±{Math.round(location.accuracy)}m)
            </Typography>
          ) : null}
          {status ? <Typography sx={{ mt: 1.2 }}>{status}</Typography> : null}
        </Box>
      </Box>

      <Box className="card">
        <Typography variant="h5" fontWeight={700}>Counts by Juz (you)</Typography>
        {countsByJuz.length === 0 ? (
          <Typography className="muted">No logs yet.</Typography>
        ) : (
          <ul>
            {countsByJuz.map(([juzNumber, count]) => (
              <li key={juzNumber}>Juz {juzNumber}: {count}</li>
            ))}
          </ul>
        )}
      </Box>

      <Box className="card">
        <Typography variant="h5" fontWeight={700}>Recent logs (you)</Typography>
        {logs.length === 0 ? (
          <Typography className="muted">No logs yet.</Typography>
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
      </Box>

      {profile?.is_admin && (
        <Box className="card">
          <Typography variant="h5" fontWeight={700}>Admin dashboard — all users</Typography>
          {adminLogs.length === 0 ? (
            <Typography className="muted">No logs yet.</Typography>
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
          <Typography className="muted" sx={{ mt: 1.2 }}>Superadmin access is controlled by profiles.is_admin = true.</Typography>
        </Box>
      )}
    </main>
  )
}

export default App
