'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/lib/supabase"
import { User } from '@supabase/supabase-js'
import { Eye, EyeOff, Crop, ZoomIn, ZoomOut, CheckCircle2, X } from 'lucide-react'

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

const AVATAR_PRESETS = [
  { name: 'Logo 1', url: 'https://api.dicebear.com/7.x/identicon/png?seed=Brand1' },
  { name: 'Logo 2', url: 'https://api.dicebear.com/7.x/identicon/png?seed=Brand2' },
  { name: 'Logo 3', url: 'https://api.dicebear.com/7.x/identicon/png?seed=Brand3' },
  { name: 'Bot 1', url: 'https://api.dicebear.com/7.x/bottts/png?seed=Wovzo1' },
  { name: 'Bot 2', url: 'https://api.dicebear.com/7.x/bottts/png?seed=Wovzo2' },
  { name: 'Creator Boy', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { name: 'Creator Girl', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { name: 'Modern Style', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
]

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [niche, setNiche] = useState('Fashion & Apparel')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Image Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setRawImageSrc(event.target?.result as string)
      setZoomLevel(1)
      setPanOffset({ x: 0, y: 0 })
      setCropModalOpen(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const applyCroppedImage = () => {
    if (!rawImageSrc) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const CROP_SIZE = 400
      canvas.width = CROP_SIZE
      canvas.height = CROP_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE)

      const baseScale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height)
      const currentScale = baseScale * zoomLevel
      const renderW = img.width * currentScale
      const renderH = img.height * currentScale
      
      const drawX = (CROP_SIZE - renderW) / 2 + panOffset.x
      const drawY = (CROP_SIZE - renderH) / 2 + panOffset.y

      ctx.drawImage(img, drawX, drawY, renderW, renderH)
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.82)
      setAvatarUrl(croppedDataUrl)
      setCropModalOpen(false)
      setRawImageSrc(null)
    }
    img.src = rawImageSrc
  }

  useEffect(() => {
    async function loadUser() {
      // 1. Instant hydration from localStorage
      try {
        const demo = JSON.parse(localStorage.getItem('wovzo_demo_user') || '{}');
        const reg = JSON.parse(localStorage.getItem('wovzo_accounts_registry') || '{}');
        const cleanEmail = (demo.email || '').toLowerCase().trim();
        const regAccount = reg[cleanEmail] || {};

        if (cleanEmail) setEmail(cleanEmail);

        const currentName = demo.name || demo.brand_name || regAccount.brand_name || regAccount.name || '';
        if (currentName) setName(currentName);

        const currentAvatar = demo.avatar_url || regAccount.avatar_url || '';
        if (currentAvatar) setAvatarUrl(currentAvatar);

        const currentBio = demo.bio !== undefined ? demo.bio : (regAccount.bio !== undefined ? regAccount.bio : '');
        if (currentBio) setBio(currentBio);

        const currentNiche = demo.niche || regAccount.niche || 'Fashion & Apparel';
        if (currentNiche) setNiche(currentNiche);

        const currentWebsite = demo.website || regAccount.website || '';
        if (currentWebsite) setWebsite(currentWebsite);

        const currentLoc = demo.location || regAccount.location || 'India';
        if (currentLoc) setLocation(currentLoc);

        const currentPhone = demo.phone || regAccount.phone || '';
        if (currentPhone) setPhone(currentPhone);

        const currentRole = demo.role || regAccount.role || 'Brand';
        if (currentRole) setRole(currentRole);
      } catch (e) {
        console.warn('Brand local storage load notice:', e);
      }

      // 2. Query Supabase (if online)
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 1500));
        const userRes: any = await Promise.race([supabase.auth.getUser(), timeoutPromise]).catch(() => null);
        const user = userRes?.data?.user;
        if (user) {
          setUser(user);
          if (user.email) setEmail(user.email);
          const meta = user.user_metadata || {};
          if (meta.name) setName(meta.name);
          if (meta.avatar_url) setAvatarUrl(meta.avatar_url);
          if (meta.bio) setBio(meta.bio);
          if (meta.niche) setNiche(meta.niche);
          if (meta.website) setWebsite(meta.website);
          if (meta.location) setLocation(meta.location);
          if (meta.phone) setPhone(meta.phone);

          try {
            const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
            if (data) {
              if (data.name && data.name !== 'User') setName(data.name);
              if (data.role) setRole(data.role);
            }
          } catch (e) {
            console.error('Error fetching brand profile:', e);
          }
        }
      } catch (_) {}
    }
    loadUser();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const cleanEmail = (email || user?.email || '').toLowerCase().trim();

    // 1. Immediately save to localStorage
    try {
      const demo = JSON.parse(localStorage.getItem('wovzo_demo_user') || '{}');
      const updatedDemo = {
        ...demo,
        email: cleanEmail,
        name: name.trim(),
        brand_name: name.trim(),
        avatar_url: avatarUrl,
        bio: bio.trim(),
        niche,
        website: website.trim(),
        location: location.trim(),
        phone: phone.trim(),
      };
      localStorage.setItem('wovzo_demo_user', JSON.stringify(updatedDemo));

      if (cleanEmail) {
        const reg = JSON.parse(localStorage.getItem('wovzo_accounts_registry') || '{}');
        reg[cleanEmail] = {
          ...(reg[cleanEmail] || {}),
          name: name.trim(),
          brand_name: name.trim(),
          avatar_url: avatarUrl,
          bio: bio.trim(),
          niche,
          website: website.trim(),
          location: location.trim(),
          phone: phone.trim(),
          ...(password ? { password } : {})
        };
        localStorage.setItem('wovzo_accounts_registry', JSON.stringify(reg));
      }
    } catch (saveErr) {
      console.warn('Brand local save notice:', saveErr);
    }

    // 2. Sync to Supabase in background (if reachable)
    try {
      if (name && user) {
        try {
          await supabase.from('profiles').update({ name: name.trim() }).eq('id', user.id);
        } catch (e) {
          console.error('Profiles table update notice:', e);
        }
      }
      
      if (user) {
        const { data: updatedData } = await supabase.auth.updateUser({
          data: {
            name: name.trim(),
            avatar_url: avatarUrl,
            bio: bio.trim(),
            niche,
            website: website.trim(),
            location: location.trim(),
            phone: phone.trim(),
          }
        });
        if (updatedData?.user) setUser(updatedData.user);
      }

      if (password && user) {
        try {
          await supabase.auth.updateUser({ password });
          setPassword('');
        } catch (_) {}
      }
    } catch (error: any) {
      console.warn('Supabase remote sync notice:', error);
    } finally {
      setLoading(false);
      setMessage('Brand profile settings updated successfully!');
      setTimeout(() => setMessage(''), 4000);
    }
  };

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
        {/* Brand Logo / Avatar Card */}
        <div className="p-5 rounded-xl border border-orange-100 bg-[#FFF9F5]">
          <label className="block text-sm font-semibold text-gray-900 mb-3">Brand Logo / Profile Picture</label>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-20 h-20 rounded-full border-2 border-[#FF6A00] shadow-sm overflow-hidden bg-[#121212] flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Brand Logo" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-2xl font-bold text-[#FF6A00]">
                  {name ? name[0].toUpperCase() : 'B'}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Logo from Device / Gallery
                </button>
                <span className="text-xs text-gray-400">or paste logo URL below</span>
              </div>

              <div>
                <input
                  type="text"
                  value={avatarUrl.startsWith('data:image/') ? '[Custom Logo Uploaded]' : avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Paste brand logo URL (https://...)"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] text-xs px-3.5 py-2 border bg-white"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Or choose a logo/avatar preset:</p>
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
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Work Email</label>
            <input 
              type="email" 
              disabled 
              value={email || user?.email || ''} 
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
          <div className="mt-1 relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-sm px-3.5 pr-10 py-2.5 border" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="flex justify-center py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#FF6A00] hover:bg-[#E55A00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6A00] disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Interactive Brand Logo / Photo Cropper Modal */}
      {cropModalOpen && rawImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-[#FF6A00]" />
                <h3 className="font-bold text-gray-900 text-base">Crop Logo / Profile Picture</h3>
              </div>
              <button 
                type="button" 
                onClick={() => { setCropModalOpen(false); setRawImageSrc(null); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {/* Cropper Viewport */}
              <div 
                className="relative w-64 h-64 bg-slate-900 rounded-2xl overflow-hidden cursor-move border-2 border-[#FF6A00]/40 shadow-inner select-none"
                onMouseDown={(e) => {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                }}
                onMouseMove={(e) => {
                  if (!isDragging) return;
                  setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    setIsDragging(true);
                    setDragStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
                  }
                }}
                onTouchMove={(e) => {
                  if (!isDragging || e.touches.length !== 1) return;
                  setPanOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
                }}
                onTouchEnd={() => setIsDragging(false)}
              >
                {/* Image being cropped */}
                <div 
                  className="w-full h-full flex items-center justify-center transition-transform duration-75"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  }}
                >
                  <img 
                    src={rawImageSrc} 
                    alt="Crop preview" 
                    className="max-w-none pointer-events-none"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>

                {/* Circular Profile Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-52 rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"></div>
                </div>
              </div>

              {/* Controls */}
              <div className="w-full mt-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1 font-medium"><ZoomOut className="w-3.5 h-3.5" /> Zoom Out</span>
                  <span className="font-mono font-bold text-gray-700">{Math.round(zoomLevel * 100)}%</span>
                  <span className="flex items-center gap-1 font-medium"><ZoomIn className="w-3.5 h-3.5" /> Zoom In</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                  className="w-full accent-[#FF6A00] cursor-pointer"
                />
                <p className="text-[11px] text-gray-400 text-center">
                  Drag the logo/image to adjust position inside the frame.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={() => { setCropModalOpen(false); setRawImageSrc(null); }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 transition text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCroppedImage}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#FF6A00] hover:bg-[#E55A00] font-semibold text-white transition text-sm flex items-center justify-center gap-2 shadow-sm shadow-orange-200 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Crop & Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
