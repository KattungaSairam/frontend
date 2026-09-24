
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [profileFile, setProfileFile] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        setMessage(error.message)
      } else {
        setUser(data.session?.user ?? null)
      }

      setCheckingSession(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        })

        if (error) throw error

        if (data.session) {
          setUser(data.session.user)
          setMessage('Account created successfully!')
        } else {
          setMessage(
            'Account created. Check your email if confirmation is required, then log in.'
          )
          setMode('login')
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })

        if (error) throw error

        setUser(data.user)
        setMessage('')
      }
    } catch (error) {
      setMessage(error.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // Upload a file to the logged-in customer's own folder.
  async function uploadCustomerImage(file, folder) {
    if (!user) throw new Error('Please log in first.')

    if (!file) throw new Error('Please choose an image.')

    if (!file.type.startsWith('image/')) {
      throw new Error('Please select an image file.')
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${user.id}/${folder}/${Date.now()}-${safeName}`

    const { error } = await supabase.storage
      .from('customer-images')
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      })

    if (error) throw error

    const { data } = supabase.storage
      .from('customer-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  async function handleProfileUpload(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const publicUrl = await uploadCustomerImage(profileFile, 'profile')

      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      })

      if (error) throw error

      setUser(data.user)
      setProfileFile(null)
      setMessage('Profile picture updated successfully!')
    } catch (error) {
      setMessage(error.message || 'Profile picture upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleImageUpload(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const publicUrl = await uploadCustomerImage(imageFile, 'uploads')

      setUploadedImageUrl(publicUrl)
      setImageFile(null)
      setMessage('Image uploaded successfully!')
    } catch (error) {
      setMessage(error.message || 'Image upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
      setUser(null)
      setEmail('')
      setPassword('')
      setMode('login')
      setProfileFile(null)
      setImageFile(null)
      setUploadedImageUrl('')
      setMessage('You have been logged out.')
    }

    setLoading(false)
  }

  if (checkingSession) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p>Checking your session...</p>
        </section>
      </main>
    )
  }

  if (user) {
    const customerName =
      user.user_metadata?.full_name || 'Customer'
    const avatarUrl = user.user_metadata?.avatar_url

    return (
      <main className="auth-page">
        <section className="auth-card dashboard-card">
          <div className="brand-icon">C</div>
          <p className="eyebrow">CUSTOMER PORTAL</p>
          <h1>Welcome, {customerName}!</h1>
          <p className="subtitle">
            You are successfully logged in.
          </p>

          <div className="customer-details">
            <h2>Customer Details</h2>
            <p><strong>Name:</strong> {customerName}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>

          <section className="service-section">
            <h2>Profile Picture</h2>

            {avatarUrl ? (
              <img
                className="profile-preview"
                src={avatarUrl}
                alt="Customer profile"
              />
            ) : (
              <div className="profile-placeholder">
                No profile picture yet
              </div>
            )}

            <form onSubmit={handleProfileUpload}>
              <label>
                Choose a new profile picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setProfileFile(event.target.files?.[0] ?? null)
                  }
                  required
                />
              </label>

              <button
                className="submit-button"
                type="submit"
                disabled={loading || !profileFile}
              >
                {loading ? 'Please wait...' : 'Upload Profile Picture'}
              </button>
            </form>
          </section>

          <section className="service-section">
            <h2>Upload an Image</h2>
            <p>Select an image to upload and preview it below.</p>

            <form onSubmit={handleImageUpload}>
              <label>
                Choose image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
                  required
                />
              </label>

              <button
                className="submit-button"
                type="submit"
                disabled={loading || !imageFile}
              >
                {loading ? 'Please wait...' : 'Upload Image'}
              </button>
            </form>

            {uploadedImageUrl && (
              <div className="uploaded-image">
                <h3>Uploaded Image Preview</h3>
                <img
                  src={uploadedImageUrl}
                  alt="Your uploaded image"
                />
                <a
                  href={uploadedImageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open image in a new tab
                </a>
              </div>
            )}
          </section>

          {message && (
            <p className="message" role="status">{message}</p>
          )}

          <button
            className="submit-button"
            type="button"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? 'Please wait...' : 'Log out'}
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-icon">C</div>
        <p className="eyebrow">CUSTOMER PORTAL</p>

        <h1>
          {mode === 'login'
            ? 'Welcome back'
            : 'Create your account'}
        </h1>

        <p className="subtitle">
          {mode === 'login'
            ? 'Log in to access your customer account.'
            : 'Sign up to get started with your customer account.'}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login')
              setMessage('')
            }}
          >
            Log in
          </button>

          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => {
              setMode('signup')
              setMessage('')
            }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete={
                mode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
              minLength={6}
              required
            />
          </label>

          <button
            className="submit-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Log in'
                : 'Create account'}
          </button>
        </form>

        {message && (
          <p className="message" role="status">{message}</p>
        )}

        <p className="security-note">
          Your account is protected by Supabase authentication.
        </p>
      </section>
    </main>
  )
}

export default App