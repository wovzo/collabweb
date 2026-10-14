'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/lib/supabase"
import { User } from '@supabase/supabase-js'

const NICHES = [
  'Fashion & Lifestyle',
  'Tech & Gadgets',
  'Fitness & Health',
  'Beauty & Cosmetics',
  'Food & Dining',
  'Travel & Adventure',
  'Gaming & Entertainment',
  'Education & Business',
]

const AVATAR_PRESETS = [
  { name: 'Avatar 1', url: 'https://api.dicebear.com/7.x/adventurer/png?seed=Felix' },
  { name: 'Avatar 2', url: 'https://api.dicebear.com/7.x/adventurer/png?seed=Aneka' },
  { name: 'Avatar 3', url: 'https://api.dicebear.com/7.x/adventurer/png?seed=Milo' },
  { name: 'Avatar 4', url: 'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe' },
  { name: 'Bot 1', url: 'https://api.dicebear.com/7.x/bottts/png?seed=Wovzo1' },
  { name: 'Bot 2', url: 'https://api.dicebear.com/7.x/bottts/png?seed=Wovzo2' },
  { name: 'Creator Boy', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { name: 'Creator Girl', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { name: 'Fashion Stylist', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { name: 'Tech Reviewer', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
]

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [niche, setNiche] = useState('Fashion & Lifestyle')
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 400
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width)
            width = MAX_DIM
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height)
            height = MAX_DIM
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75)
        setAvatarUrl(compressedDataUrl)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const meta = user.user_metadata || {}
        if (meta.name) setName(meta.name)
        setAvatarUrl(meta.avatar_url || '')
        setBio(meta.bio || '')
        setNiche(meta.niche || 'Fashion & Lifestyle')
        setInstagram(meta.instagram || '')
        setYoutube(meta.youtube || '')
        setLocation(meta.location || 'India')
        setPhone(meta.phone || '')

        try {
          const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()
          if (data) {
            if (data.name && data.name !== 'User') setName(data.name)
            if (data.role) setRole(data.role)
          }
        } catch (e) {
          console.error('Error fetching profile row:', e)
        }
      }
    }
    loadUser()
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      if (name && user) {
        try {
          await supabase.from('profiles').update({ name }).eq('id', user.id)
        } catch (e) {
          console.error('Profiles table update error:', e)
        }
      }
      
      const { data: updatedData, error: metaError } = await supabase.auth.updateUser({
        data: {
          name,
          avatar_url: avatarUrl,
          bio,
          niche,
          instagram,
          youtube,
          location,
          phone,
        }
      })
      if (metaError) throw metaError
      if (updatedData?.user) setUser(updatedData.user)

      if (password) {
        const { error: passError } = await supabase.auth.updateUser({ password })
        if (passError) throw passError
        setPassword('')
      }

      setMessage('Profile settings updated successfully!')
    } catch (error: any) {
      setMessage(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Creator Profile & Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your public profile, social links, and account security</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#FFF2EB] px-3 py-1 text-xs font-semibold text-[#FF6A00] ring-1 ring-inset ring-[#FF6A00]/20 uppercase tracking-wider">
          ✨ {role || 'Creator'}
        </span>
      </div>
      
      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        {/* Profile Picture Card */}
        <div className="p-5 rounded-xl border border-orange-100 bg-[#FFF9F5]">
          <label className="block text-sm font-semibold text-gray-900 mb-3">Profile Picture</label>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-20 h-20 rounded-full border-2 border-[#FF6A00] shadow-sm overflow-hidden bg-[#121212] flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    // Fallback to initial
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-2xl font-bold text-[#FF6A00]">
                  {name ? name[0].toUpperCase() : 'U'}
                </span>
              )}
            </div>
            
            <div className="flex-1 w-full space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6A00] hover:bg-[#E55A00] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload from Device / Gallery
                </button>
                <span className="text-xs text-gray-400">or paste image URL below</span>
              </div>

              <div>
                <input
                  type="text"
                  value={avatarUrl.startsWith('data:image/') ? '[Custom Image Uploaded]' : avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Paste image URL (https://...)"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] text-xs px-3.5 py-2 border bg-white"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Or choose a preset avatar:</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(p.url)}
                      className={`relative w-8 h-8 rounded-full border-2 overflow-hidden hover:scale-110 transition ${
                        avatarUrl === p.url ? 'border-[#FF6A00] ring-2 ring-[#FF6A00]/40' : 'border-gray-200'
                      }`}
                      title={p.name}
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="text-xs text-red-500 hover:text-red-700 font-medium self-center ml-2"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input 
              type="email" 
              disabled 
              value={user?.email || ''} 
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm bg-gray-50 text-gray-500 px-3.5 py-2.5 border" 
            />
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Creator / Display Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
              placeholder="e.g. Asraf Ali"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Bio / Tagline</label>
          <textarea 
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
            placeholder="Tell brands what content you create..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary Niche</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border bg-white"
            >
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">City / Location</label>
            <input 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
              placeholder="e.g. Chennai, India"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Instagram Handle</label>
            <input 
              type="text" 
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
              placeholder="@username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">YouTube Channel / Link</label>
            <input 
              type="text" 
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
              placeholder="youtube.com/@channel"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
            />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="flex justify-center py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#FF6A00] hover:bg-[#E55A00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6A00] disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
