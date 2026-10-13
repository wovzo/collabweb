'use client'

import { useState, useEffect } from 'react'
import { supabase } from "@/lib/supabase"

export default function MessagesPage() {
  const [influencers, setBrands] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUser(user)

      // For brand, fetch all influencers
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'brand')
      
      if (profiles) setBrands(profiles)
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
      .channel('messages_channel')
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
          setMessages(prev => [...prev, msg])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedUser, currentUser])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser || !currentUser) return

    const msgText = newMessage.trim()
    setNewMessage('') // clear input immediately for snappy feel

    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: msgText
    })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      {/* Sidebar - Users List */}
      <div className="w-1/3 border-r border-gray-100 overflow-y-auto">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-700">Brands</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {influencers.map(inf => (
            <div 
              key={inf.id}
              onClick={() => setSelectedUser(inf)}
              className={`p-4 cursor-pointer hover:bg-orange-50 transition ${selectedUser?.id === inf.id ? 'bg-[#FFF2EB] border-l-4 border-[#FF6A00]' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFF2EB] text-[#FF6A00] rounded-full flex items-center justify-center font-bold">
                  {inf.name?.[0]?.toUpperCase() || 'I'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{inf.name || 'Unknown'}</h3>
                </div>
              </div>
            </div>
          ))}
          {influencers.length === 0 && (
            <div className="p-4 text-gray-500 text-center">No influencers found.</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-gray-50">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFF2EB] text-[#FF6A00] rounded-full flex items-center justify-center font-bold">
                {selectedUser.name?.[0]?.toUpperCase() || 'I'}
              </div>
              <h2 className="font-bold text-gray-900">{selectedUser.name || 'Unknown'}</h2>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">
                  No messages yet. Say hello to {selectedUser.name}!
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === currentUser?.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isMe ? 'bg-[#FF6A00] text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00]"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-[#FF6A00] text-white rounded-full p-2 px-4 hover:bg-[#E55A00] disabled:opacity-50 transition"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            Select an influencer to start chatting
          </div>
        )}
      </div>
    </div>
  )
}
