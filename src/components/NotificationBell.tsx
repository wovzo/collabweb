'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Bell, 
  CheckCheck, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Wallet,
  Clock,
  X
} from 'lucide-react'
import Link from 'next/link'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'application' | 'submission' | 'approval' | 'revision' | 'message' | 'wallet' | 'info'
  link?: string
  read: boolean
  created_at: string
}

export default function NotificationBell({ role }: { role: 'creator' | 'brand' }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotifications()

    // Close dropdown on outside click
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let items: AppNotification[] = []

      // 1. Try fetching from notifications table
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15)

        if (data && data.length > 0) {
          items = data as AppNotification[]
        }
      } catch (err) {
        console.warn('notifications table not yet created, using derived notifications:', err)
      }

      // 2. Also derive dynamic notifications from applications so user immediately has live notifications
      if (role === 'creator') {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, status, revision_notes, created_at, campaigns(title, budget, profiles:brand_id(name))')
          .eq('influencer_id', user.id)
          .order('created_at', { ascending: false })

        if (apps) {
          apps.forEach((app: any) => {
            const campTitle = app.campaigns?.title || 'Campaign'
            const brandName = app.campaigns?.profiles?.name || 'Brand'
            const budget = app.campaigns?.budget

            if (app.status === 'accepted') {
              items.push({
                id: `derived_${app.id}_accepted`,
                title: 'Application Accepted! 🎉',
                message: `${brandName} accepted your pitch for "${campTitle}". You can now create content and submit proof.`,
                type: 'approval',
                link: '/dashboard/creator/applications',
                read: false,
                created_at: app.created_at
              })
            } else if (app.status === 'revision_requested') {
              items.push({
                id: `derived_${app.id}_revision`,
                title: 'Revision Requested ⚠️',
                message: `${brandName} requested changes for "${campTitle}": ${app.revision_notes || 'Please review notes and resubmit.'}`,
                type: 'revision',
                link: '/dashboard/creator/applications',
                read: false,
                created_at: app.created_at
              })
            } else if (app.status === 'completed') {
              items.push({
                id: `derived_${app.id}_completed`,
                title: 'Deliverable Approved & Paid! 💰',
                message: `Your live content for "${campTitle}" was approved. ₹${budget} has been credited to your wallet.`,
                type: 'wallet',
                link: '/dashboard/creator/wallet',
                read: false,
                created_at: app.created_at
              })
            }
          })
        }
      } else {
        // Brand notifications derived from campaigns & applicants
        const { data: myCamps } = await supabase
          .from('campaigns')
          .select('id, title')
          .eq('brand_id', user.id)

        if (myCamps && myCamps.length > 0) {
          const campIds = myCamps.map(c => c.id)
          const { data: apps } = await supabase
            .from('applications')
            .select('id, status, created_at, campaigns:campaign_id(title), profiles:influencer_id(name)')
            .order('created_at', { ascending: false })

          if (apps) {
            apps.forEach((app: any) => {
              const c = Array.isArray(app.campaigns) ? app.campaigns[0] : app.campaigns
              const p = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles

              if (app.status === 'pending') {
                items.push({
                  id: `derived_${app.id}_new_app`,
                  title: 'New Influencer Application 📩',
                  message: `${p?.name || 'A creator'} applied to your campaign "${c?.title}". Review their proposal.`,
                  type: 'application',
                  link: '/dashboard/brand/influencers',
                  read: false,
                  created_at: app.created_at
                })
              } else if (app.status === 'submitted') {
                items.push({
                  id: `derived_${app.id}_submitted`,
                  title: 'Deliverable Submitted for Review ✨',
                  message: `${p?.name || 'Creator'} submitted live post proof for "${c?.title}". Review and approve.`,
                  type: 'submission',
                  link: '/dashboard/brand/influencers',
                  read: false,
                  created_at: app.created_at
                })
              }
            })
          }
        }
      }

      // Remove duplicate IDs and sort by newest
      const unique = Array.from(new Map(items.map(item => [item.id, item])).values())
      unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setNotifications(unique)
      setUnreadCount(unique.filter(n => !n.read).length)
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false)
      }
    } catch (_) {}
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'approval':
      case 'wallet':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      case 'revision':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'submission':
        return <Sparkles className="w-4 h-4 text-[#FF6A00]" />
      case 'application':
        return <FileText className="w-4 h-4 text-blue-600" />
      case 'message':
        return <MessageSquare className="w-4 h-4 text-purple-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full hover:bg-gray-100 text-gray-700 transition focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#FF6A00] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in duration-150">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-orange-100 text-[#FF6A00] rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#FF6A00] hover:text-[#E55A00] font-semibold flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-xs font-medium">No notifications yet.</p>
                <p className="text-[11px] text-gray-400">Activity updates will appear here.</p>
              </div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  href={n.link || '#'}
                  onClick={() => setIsOpen(false)}
                  className={`p-4 flex gap-3 hover:bg-gray-50 transition block ${
                    !n.read ? 'bg-orange-50/20' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900">{n.title}</p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#FF6A00]"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
