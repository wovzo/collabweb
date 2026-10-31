'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/lib/supabase"
import { Send, Image as ImageIcon, X, User } from 'lucide-react'

export default function BrandMessagesPage() {
  const [influencers, setInfluencers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [fullViewImage, setFullViewImage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUser(user)

      // For brand, fetch all influencers
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'influencer')
      
      if (profiles) setInfluencers(profiles)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedUser || !currentUser) return

    // Fetch messages between currentUser and selectedUser
    async function fetchMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })
      
      if (data) setMessages(data)
    }
    
    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel('messages_brand_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        const msg = payload.new
        if (
          (msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id) ||
          (msg.sender_id === selectedUser.id && msg.receiver_id === currentUser.id)
        ) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedUser, currentUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedImage])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 800
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
        setSelectedImage(compressedDataUrl)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedImage) || !selectedUser || !currentUser) return

    setIsSending(true)
    const msgText = newMessage.trim()
    const imgToSend = selectedImage

    setNewMessage('')
    setSelectedImage(null)

    try {
      const content = imgToSend ? `[image]${imgToSend}` : msgText

      const { data, error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        content: content
      }).select().single()

      if (!error && data) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev
          return [...prev, data]
        })
      }

      if (imgToSend && msgText) {
        await supabase.from('messages').insert({
          sender_id: currentUser.id,
          receiver_id: selectedUser.id,
          content: msgText
        })
      }

      // Trigger notification for creator
      try {
        await supabase.from('notifications').insert({
          user_id: selectedUser.id,
          title: `New message from ${currentUser.user_metadata?.name || 'Brand'}`,
          message: imgToSend ? 'Sent an image attachment' : msgText.slice(0, 80),
          type: 'message',
          link: '/dashboard/creator/messages',
          read: false
        })
      } catch (_) {}
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      {/* Sidebar - Influencers List */}
      <div className="w-1/3 border-r border-gray-100 overflow-y-auto">
        <div className="p-4 border-b border-gray-100 bg-gray-50/70">
          <h2 className="font-bold text-gray-800 text-sm">Creators & Influencers</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {influencers.map(inf => (
            <div 
              key={inf.id}
              onClick={() => setSelectedUser(inf)}
              className={`p-4 cursor-pointer hover:bg-orange-50/60 transition ${selectedUser?.id === inf.id ? 'bg-[#FFF2EB] border-l-4 border-[#FF6A00]' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-[#FF6A00] rounded-full flex items-center justify-center font-bold shrink-0">
                  {inf.name?.[0]?.toUpperCase() || 'C'}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{inf.name || 'Creator'}</h3>
                  <p className="text-xs text-gray-400 truncate">{inf.niche || 'Tap to chat'}</p>
                </div>
              </div>
            </div>
          ))}
          {influencers.length === 0 && (
            <div className="p-8 text-gray-400 text-center text-xs">No creators found.</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-gray-50/50">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-[#FF6A00] rounded-full flex items-center justify-center font-bold">
                  {selectedUser.name?.[0]?.toUpperCase() || 'C'}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">{selectedUser.name || 'Creator'}</h2>
                  <span className="text-[11px] text-green-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Direct Collab Channel
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 text-xs mt-16 space-y-2">
                  <p className="font-semibold text-gray-700">No messages yet.</p>
                  <p>Message {selectedUser.name} to discuss campaign guidelines or deliverables!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === currentUser?.id
                  const isImage = msg.content?.startsWith('[image]')
                  const imageUrl = isImage ? msg.content.replace('[image]', '') : null

                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[72%] rounded-2xl p-3 shadow-xs ${
                        isMe 
                          ? 'bg-[#FF6A00] text-white rounded-br-xs' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-xs'
                      }`}>
                        {isImage && imageUrl ? (
                          <div className="space-y-1">
                            <img 
                              src={imageUrl} 
                              alt="Attachment" 
                              onClick={() => setFullViewImage(imageUrl)}
                              className="rounded-xl max-h-60 w-auto object-cover cursor-pointer hover:opacity-95 transition"
                            />
                            <span className="text-[10px] opacity-75 block text-right">Click to zoom</span>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <span className={`text-[10px] mt-1 block text-right ${isMe ? 'text-white/80' : 'text-gray-400'}`}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Thumbnail */}
            {selectedImage && (
              <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-3">
                <div className="relative">
                  <img src={selectedImage} alt="Selected preview" className="w-14 h-14 object-cover rounded-xl border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-1.5 -right-1.5 bg-black text-white p-0.5 rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs text-gray-500 font-medium">Image attached • Click Send</span>
              </div>
            )}

            {/* Message Input Bar */}
            <div className="p-3 bg-white border-t border-gray-100">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleImageSelect} 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-[#FF6A00] hover:bg-orange-50 rounded-full transition"
                  title="Attach image or creative asset"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message or attach creative assets..."
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00]"
                />

                <button 
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedImage) || isSending}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white rounded-xl p-2.5 px-4 font-semibold text-sm disabled:opacity-40 transition flex items-center gap-1.5 shadow-sm shadow-orange-500/20"
                >
                  <span>Send</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
              <User className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Select a creator to start chatting</p>
            <p className="text-xs text-gray-400">Share briefs, give feedback, and coordinate campaign delivery.</p>
          </div>
        )}
      </div>

      {/* Full Size Image Modal */}
      {fullViewImage && (
        <div 
          onClick={() => setFullViewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={fullViewImage} alt="Full view" className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
            <button 
              onClick={() => setFullViewImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
