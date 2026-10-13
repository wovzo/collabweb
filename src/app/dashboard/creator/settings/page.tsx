'use client'

import { useState, useEffect } from 'react'
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

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [bio, setBio] = useState('')
  const [niche, setNiche] = useState('Fashion & Lifestyle')
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const meta = user.user_metadata || {}
        setBio(meta.bio || '')
        setNiche(meta.niche || 'Fashion & Lifestyle')
        setInstagram(meta.instagram || '')
        setYoutube(meta.youtube || '')
        setLocation(meta.location || 'India')
        setPhone(meta.phone || '')

        const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()
        if (data) {
          setName(data.name || '')
          setRole(data.role || '')
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
        await supabase.from('profiles').update({ name }).eq('id', user.id)
      }
      
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          name,
          bio,
          niche,
          instagram,
          youtube,
          location,
          phone,
        }
      })
      if (metaError) throw metaError

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
