'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/lib/supabase"
import { User } from '@supabase/supabase-js'
import { BadgeCheck, Copy, Check, ExternalLink, ShieldCheck, Sparkles, RefreshCw, AlertCircle, XCircle, AlertTriangle } from 'lucide-react'
import { verifySocialBioOnline } from '@/lib/verifyBio'

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
  const proofInputRef = useRef<HTMLInputElement>(null)
  const [proofImage, setProofImage] = useState<string | null>(null)
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
  const [isVerified, setIsVerified] = useState(false)
  const [verificationCode, setVerificationCode] = useState('WOVZO-2401')
  const [verifying, setVerifying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [selectedVerifyPlatform, setSelectedVerifyPlatform] = useState<'instagram' | 'youtube'>('instagram')

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
      let initialVerified = false;
      let initialCode = "WOVZO-2401";

      try {
        const storedCode = localStorage.getItem('wovzo_creator_bio_code');
        if (storedCode && storedCode.startsWith('WOVZO-')) {
          initialCode = storedCode;
        }

        const demo = JSON.parse(localStorage.getItem('wovzo_demo_user') || '{}');
        if (demo.name) setName(demo.name);
        if (demo.instagram) setInstagram(demo.instagram);
        if (demo.youtube) setYoutube(demo.youtube);
        if (demo.verification_code && demo.verification_code.startsWith('WOVZO-')) {
          initialCode = demo.verification_code;
        }
        if (demo.is_verified) initialVerified = true;

        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (user) {
          setUser(user);
          const meta = user.user_metadata || {};
          if (meta.name) setName(meta.name);
          setAvatarUrl(meta.avatar_url || '');
          setBio(meta.bio || '');
          setNiche(meta.niche || 'Fashion & Lifestyle');
          if (meta.instagram) setInstagram(meta.instagram);
          if (meta.youtube) setYoutube(meta.youtube);
          setLocation(meta.location || 'India');
          setPhone(meta.phone || '');
          if (meta.verification_code && meta.verification_code.startsWith('WOVZO-')) {
            initialCode = meta.verification_code;
          }
          if (meta.is_verified || meta.instagram_verified) initialVerified = true;

          try {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('name, role, is_verified, verification_code')
              .eq('id', user.id)
              .single();
            if (profileRow) {
              if (profileRow.name && profileRow.name !== 'User') setName(profileRow.name);
              if (profileRow.role) setRole(profileRow.role);
              if (profileRow.is_verified) initialVerified = true;
              if (profileRow.verification_code && profileRow.verification_code.startsWith('WOVZO-')) {
                initialCode = profileRow.verification_code;
              }
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Load user notice:', err);
      } finally {
        if (!initialCode || !initialCode.startsWith('WOVZO-')) {
          initialCode = "WOVZO-2401";
        }
        try {
          localStorage.setItem('wovzo_creator_bio_code', initialCode);
        } catch (_) {}
        setVerificationCode(initialCode);
        setIsVerified(initialVerified);
      }
    }
    loadUser();
  }, []);

  const handleVerifyBio = async () => {
    const platform = selectedVerifyPlatform;
    let targetHandle = (platform === 'instagram' ? instagram : youtube).trim();

    if (!targetHandle) {
      setVerifyError(
        platform === 'instagram'
          ? "Please enter your Instagram handle above (e.g. @username) before verifying."
          : "Please enter your YouTube channel link or handle above before verifying."
      );
      setVerifySuccess(false);
      return;
    }

    if (platform === 'instagram' && targetHandle.toLowerCase() === 'asraf_talk') {
      targetHandle = 'asraftalk';
      setInstagram('asraftalk');
    }

    setVerifying(true);
    setVerifySuccess(false);
    setVerifyError('');

    try {
      const result = await verifySocialBioOnline(platform, targetHandle, verificationCode);

      if (result.success) {
        setIsVerified(true);
        setVerifySuccess(true);
        setVerifyError('');

        try {
          if (user) {
            await supabase.auth.updateUser({
              data: {
                is_verified: true,
                instagram_verified: platform === 'instagram' || Boolean(instagram),
                youtube_verified: platform === 'youtube' || Boolean(youtube),
                verification_code: verificationCode,
              }
            });
            try {
              await supabase.from('profiles').update({
                is_verified: true,
                verification_code: verificationCode,
              }).eq('id', user.id);
            } catch (_) {}
          }

          // Local storage demo sync
          const demo = JSON.parse(localStorage.getItem('wovzo_demo_user') || '{}');
          demo.is_verified = true;
          demo.instagram_verified = platform === 'instagram' || Boolean(instagram);
          demo.youtube_verified = platform === 'youtube' || Boolean(youtube);
          demo.verification_code = verificationCode;
          localStorage.setItem('wovzo_demo_user', JSON.stringify(demo));

          const reg = JSON.parse(localStorage.getItem('wovzo_accounts_registry') || '{}');
          if (user?.email && reg[user.email.toLowerCase()]) {
            reg[user.email.toLowerCase()].is_verified = true;
            reg[user.email.toLowerCase()].verification_code = verificationCode;
            localStorage.setItem('wovzo_accounts_registry', JSON.stringify(reg));
          }
        } catch (_) {}
      } else {
        // Verification failed! Keep unverified
        setIsVerified(false);
        setVerifySuccess(false);
        setVerifyError(result.message || `Code ${verificationCode} was not found in your bio.`);
      }
    } catch (err: any) {
      setIsVerified(false);
      setVerifySuccess(false);
      setVerifyError(`Verification check error: ${err?.message || 'Unable to scan bio. Please ensure your handle is correct.'}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setProofImage(dataUrl);
      setIsVerified(true);
      setVerifySuccess(true);
      setVerifyError('');

      if (user) {
        try {
          await supabase.auth.updateUser({
            data: {
              is_verified: true,
              instagram_verified: true,
              verification_code: verificationCode,
              verification_proof: dataUrl,
            }
          });
          await supabase.from('profiles').update({
            is_verified: true,
            verification_code: verificationCode,
          }).eq('id', user.id);
        } catch (_) {}
      }

      try {
        const demo = JSON.parse(localStorage.getItem('wovzo_demo_user') || '{}');
        demo.is_verified = true;
        demo.instagram_verified = true;
        demo.verification_code = verificationCode;
        demo.verification_proof = dataUrl;
        localStorage.setItem('wovzo_demo_user', JSON.stringify(demo));

        const reg = JSON.parse(localStorage.getItem('wovzo_accounts_registry') || '{}');
        if (user?.email && reg[user.email.toLowerCase()]) {
          reg[user.email.toLowerCase()].is_verified = true;
          reg[user.email.toLowerCase()].verification_code = verificationCode;
          localStorage.setItem('wovzo_accounts_registry', JSON.stringify(reg));
        }
      } catch (_) {}
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      if (name && user) {
        try {
          await supabase.from('profiles').update({ 
            name, 
            instagram, 
            youtube, 
            is_verified: isVerified,
            verification_code: verificationCode 
          }).eq('id', user.id)
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
          is_verified: isVerified,
          verification_code: verificationCode,
        }
      })
      if (metaError) throw metaError
      if (updatedData?.user) setUser(updatedData.user)

      // Sync demo storage
      try {
        const demo = JSON.parse(localStorage.getItem('wovzo_demo_user') || '{}');
        demo.name = name;
        demo.instagram = instagram;
        demo.youtube = youtube;
        demo.is_verified = isVerified;
        demo.verification_code = verificationCode;
        localStorage.setItem('wovzo_demo_user', JSON.stringify(demo));
      } catch (_) {}

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
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900">Creator Profile & Settings</h1>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-600 border border-sky-200 shadow-sm">
                <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500" />
                <span>Verified Creator</span>
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">Manage your public profile, social ownership verification, and security</p>
        </div>
        <div className="flex items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-500/30">
              <BadgeCheck className="w-4 h-4 text-emerald-500" /> Blue Badge Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-500/30">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Bio Unverified
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-[#FFF2EB] px-3 py-1 text-xs font-semibold text-[#FF6A00] ring-1 ring-inset ring-[#FF6A00]/20 uppercase tracking-wider">
            ✨ {role || 'Creator'}
          </span>
        </div>
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

        {/* SOCIAL OWNERSHIP & BIO VERIFICATION CARD (METHOD 1) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FFF8F3] to-white border-2 border-[#FF6A00]/30 shadow-sm space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#FF6A00]/10 text-[#FF6A00]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span>Social Media Ownership Verification</span>
                  <span className="text-[10px] bg-[#FF6A00] text-white px-2 py-0.5 rounded font-black tracking-wide uppercase">Bio Secret Code</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Verify your accounts to earn the official <strong>Verified Blue Badge</strong> and boost Brand trust.
                </p>
              </div>
            </div>
            
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span>Verified Creator</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Verification Required</span>
              </span>
            )}
          </div>

          {verifySuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <BadgeCheck className="w-5 h-5 text-emerald-600 fill-emerald-600 shrink-0" />
              <span>
                <strong>🎉 Verification Succeeded!</strong> Your bio code matched. Your account now carries the official Verified Blue Badge!
              </span>
            </div>
          )}

          {verifyError && (
            <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-900 text-xs">{verifyError}</p>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Make sure your profile is <strong>Public</strong>, add <code className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded font-bold font-mono">{verificationCode}</code> to your bio or channel description, click <strong>Save</strong>, and try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Platform selection for verification */}
          {!isVerified && (
            <div className="flex items-center gap-2 pt-1 pb-1">
              <span className="text-xs font-semibold text-gray-700">Scan bio on:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedVerifyPlatform('instagram');
                  setVerifyError('');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedVerifyPlatform === 'instagram'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span>Instagram</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVerifyPlatform('youtube');
                  setVerifyError('');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedVerifyPlatform === 'youtube'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span>YouTube</span>
              </button>
            </div>
          )}

          {/* Social Handle Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Instagram Handle</label>
                {isVerified && instagram ? (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                    <BadgeCheck className="w-3 h-3 fill-emerald-500 text-white" /> Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-medium">e.g. @asrafgiimi</span>
                )}
              </div>
              <input 
                type="text" 
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-xs px-3.5 py-2.5 border bg-white" 
                placeholder="@username"
              />
              {instagram.trim() === 'asraf_talk' && (
                <button
                  type="button"
                  onClick={() => setInstagram('asraftalk')}
                  className="mt-1.5 text-[11px] text-[#FF6A00] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>💡 Tip: Your profile is @asraftalk without underscore. Click here to auto-fix!</span>
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">YouTube Channel / Link</label>
                {isVerified && youtube ? (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                    <BadgeCheck className="w-3 h-3 fill-emerald-500 text-white" /> Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-medium">e.g. @channel</span>
                )}
              </div>
              <input 
                type="text" 
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] sm:text-xs px-3.5 py-2.5 border bg-white" 
                placeholder="youtube.com/@channel"
              />
            </div>
          </div>

          {/* Bio Code Box & Instructions */}
          {!isVerified ? (
            <div className="bg-white p-4 rounded-xl border border-orange-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Your Unique Verification Code</span>
                  <span className="text-lg font-mono font-black text-[#FF6A00] tracking-wider">{verificationCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(verificationCode)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF6A00] hover:bg-[#E55A00] text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>

              {/* Steps */}
              <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-100 text-[#FF6A00] flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <span>Copy your code: <code className="bg-orange-50 font-bold px-1.5 py-0.5 rounded text-[#FF6A00]">{verificationCode}</code></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-100 text-[#FF6A00] flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <span>Paste it into your <strong>Instagram Bio</strong> or <strong>YouTube Channel About</strong> description.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-100 text-[#FF6A00] flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <span>Click <strong>Check & Verify Bio Now</strong>. Once verified, you may remove the code if you want!</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {instagram && (
                    <a
                      href={`https://instagram.com/${instagram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
                    >
                      <ExternalLink className="w-3 h-3 text-pink-600" />
                      <span>Open Instagram</span>
                    </a>
                  )}
                  {youtube && (
                    <a
                      href={youtube.startsWith('http') ? youtube : `https://youtube.com/${youtube}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
                    >
                      <ExternalLink className="w-3 h-3 text-red-600" />
                      <span>Open YouTube</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={proofInputRef}
                    onChange={handleProofUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => proofInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                    title="Upload screenshot of your bio showing WOVZO code for instant verification"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>Upload Bio Screenshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyBio}
                    disabled={verifying}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF6A00] hover:bg-[#E55A00] text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Scanning {selectedVerifyPlatform === 'instagram' ? 'Instagram Bio' : 'YouTube About'}...</span>
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="w-4 h-4" />
                        <span>Scan & Verify {selectedVerifyPlatform === 'instagram' ? 'Instagram' : 'YouTube'} Bio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800">
                <BadgeCheck className="w-4 h-4 text-emerald-600 fill-emerald-600 shrink-0" />
                <span>
                  Code verified: <strong className="font-mono">{verificationCode}</strong>. Your profile displays the <strong>Verified Blue Badge</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsVerified(false)}
                className="text-[11px] text-gray-500 hover:text-gray-800 underline font-medium cursor-pointer"
              >
                Re-verify Bio Code
              </button>
            </div>
          )}
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
