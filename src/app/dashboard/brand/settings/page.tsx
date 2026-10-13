'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/lib/supabase"
import { User } from '@supabase/supabase-js'

const INDUSTRIES = [
  'Fashion & Apparel',
  'Electronics & Technology',
  'Beauty & Cosmetics',
  'Health & Wellness',
  'Food & Beverage',
  'Travel & Hospitality',
  'Entertainment & Media',
  'Retail & E-commerce',
]

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [bio, setBio] = useState('')
  const [niche, setNiche] = useState('Fashion & Apparel')
  const [website, setWebsite] = useState('')
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
        if (meta.name) setName(meta.name)
        setBio(meta.bio || '')
        setNiche(meta.niche || 'Fashion & Apparel')
        setWebsite(meta.website || '')
        setLocation(meta.location || 'India')
        setPhone(meta.phone || '')

        try {
          const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()
          if (data) {
            if (data.name && data.name !== 'User') setName(data.name)
            if (data.role) setRole(data.role)
          }
        } catch (e) {
          console.error('Error fetching brand profile:', e)
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
          bio,
          niche,
          website,
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

      setMessage('Brand profile settings updated successfully!')
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
          <h1 className="text-2xl font-bold text-gray-900">Brand Profile & Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage company details, public brand page, and security</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#FFF2EB] px-3 py-1 text-xs font-semibold text-[#FF6A00] ring-1 ring-inset ring-[#FF6A00]/20 uppercase tracking-wider">
          🏢 {role || 'Brand'}
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
            <label className="block text-sm font-medium text-gray-700">Work Email</label>
            <input 
              type="email" 
              disabled 
              value={user?.email || ''} 
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm bg-gray-50 text-gray-500 px-3.5 py-2.5 border" 
            />
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Company / Brand Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
              placeholder="e.g. Wovzo Apparels"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">About Company / Bio</label>
          <textarea 
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
            placeholder="Describe your brand and collaboration goals..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Industry</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border bg-white"
            >
              {INDUSTRIES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Headquarters / Location</label>
            <input 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
              placeholder="e.g. Bangalore, India"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Official Website URL</label>
            <input 
              type="url" 
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
              placeholder="https://brand.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Phone (Optional)</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">New Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 py-2.5 border" 
          />
        </div>

        <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="flex justify-center py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#FF6A00] hover:bg-[#E55A00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6A00] disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
