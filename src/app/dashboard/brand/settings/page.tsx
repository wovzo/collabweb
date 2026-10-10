'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/lib/supabase"
import { User } from '@supabase/supabase-js'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
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
      // Update Name
      if (name && user) {
        await supabase.from('profiles').update({ name }).eq('id', user.id)
      }
      // Update Password
      if (password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      }
      setMessage('Settings updated successfully!')
      setPassword('') // Clear password field
    } catch (error: any) {
      setMessage(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>
      
      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700">Account Role</label>
          <div className="mt-1">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase tracking-wide">
              {role || 'Loading...'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <input 
            type="email" 
            disabled 
            value={user?.email || ''} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 text-gray-500 px-3 py-2 border" 
          />
          <p className="mt-1 text-xs text-gray-500">Email address cannot be changed.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Brand / Profile Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">New Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" 
          />
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
