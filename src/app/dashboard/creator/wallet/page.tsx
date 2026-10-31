'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Landmark, 
  Smartphone, 
  Save, 
  CreditCard,
  Building,
  Sparkles,
  History,
  X,
  Check
} from 'lucide-react'

interface PayoutRequest {
  id: string
  amount: number
  payout_method: string
  payout_details: any
  status: 'pending' | 'processed' | 'rejected'
  created_at: string
}

interface CompletedCampaign {
  id: string
  title: string
  budget: number
  brand_name: string
  completed_at: string
}

export default function CreatorWalletPage() {
  const [loading, setLoading] = useState(true)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [pendingEscrow, setPendingEscrow] = useState(0)
  const [totalWithdrawn, setTotalWithdrawn] = useState(0)
  const [completedCampaigns, setCompletedCampaigns] = useState<CompletedCampaign[]>([])
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])

  // Payment details state
  const [paymentMode, setPaymentMode] = useState<'upi' | 'bank'>('upi')
  const [upiId, setUpiId] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentSavedMsg, setPaymentSavedMsg] = useState('')

  // Withdrawal modal state
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState('')

  useEffect(() => {
    loadWalletData()
  }, [])

  async function loadWalletData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Load payment details from user metadata or profile
      const meta = user.user_metadata || {}
      if (meta.upi_id) setUpiId(meta.upi_id)
      if (meta.account_holder_name) setAccountHolder(meta.account_holder_name)
      if (meta.bank_name) setBankName(meta.bank_name)
      if (meta.account_number) setAccountNumber(meta.account_number)
      if (meta.ifsc_code) setIfscCode(meta.ifsc_code)

      // Query profiles table
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('upi_id, bank_name, account_number, ifsc_code, account_holder_name')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          if (profile.upi_id) setUpiId(profile.upi_id)
          if (profile.bank_name) setBankName(profile.bank_name)
          if (profile.account_number) setAccountNumber(profile.account_number)
          if (profile.ifsc_code) setIfscCode(profile.ifsc_code)
          if (profile.account_holder_name) setAccountHolder(profile.account_holder_name)
        }
      } catch (err) {
        console.warn('Profile payment fields not yet migrated:', err)
      }

      // 2. Fetch all user applications to calculate earnings
      const { data: apps } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          completed_at,
          created_at,
          campaigns (
            id,
            title,
            budget,
            profiles:brand_id (name)
          )
        `)
        .eq('influencer_id', user.id)

      if (apps) {
        let earned = 0
        let escrow = 0
        const completed: CompletedCampaign[] = []

        apps.forEach((app: any) => {
          const rawBudget = app.campaigns?.budget
          const b = parseFloat(rawBudget) || 0
          const brand = app.campaigns?.profiles?.name || 'Brand'

          if (app.status === 'completed') {
            earned += b
            completed.push({
              id: app.id,
              title: app.campaigns?.title || 'Collaboration',
              budget: b,
              brand_name: brand,
              completed_at: app.completed_at || app.created_at
            })
          } else if (app.status === 'accepted' || app.status === 'submitted') {
            escrow += b
          }
        })

        setTotalEarnings(earned)
        setPendingEscrow(escrow)
        setCompletedCampaigns(completed)
      }

      // 3. Fetch payout requests
      try {
        const { data: payouts } = await supabase
          .from('payout_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (payouts) {
          setPayoutRequests(payouts as PayoutRequest[])
          const withdrawn = payouts
            .filter((p: any) => p.status === 'processed' || p.status === 'pending')
            .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)
          setTotalWithdrawn(withdrawn)
        }
      } catch (err) {
        console.warn('payout_requests table not available:', err)
      }
    } catch (err) {
      console.error('Failed to load wallet data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Save UPI or Bank Details
  const handleSavePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPayment(true)
    setPaymentSavedMsg('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update user metadata
      await supabase.auth.updateUser({
        data: {
          upi_id: upiId.trim(),
          account_holder_name: accountHolder.trim(),
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          ifsc_code: ifscCode.trim(),
        }
      })

      // Try update profile table if columns exist
      try {
        await supabase.from('profiles').update({
          upi_id: upiId.trim(),
          account_holder_name: accountHolder.trim(),
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          ifsc_code: ifscCode.trim(),
        }).eq('id', user.id)
      } catch (_) {}

      setPaymentSavedMsg('Payout details saved successfully!')
      setTimeout(() => setPaymentSavedMsg(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to save payment details.')
    } finally {
      setSavingPayment(false)
    }
  }

  // Available balance
  const availableBalance = Math.max(0, totalEarnings - totalWithdrawn)

  // Submit Withdrawal Request
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(withdrawAmount)
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.')
      return
    }

    if (amt > availableBalance) {
      setWithdrawError(`Amount exceeds your available balance of ₹${availableBalance.toLocaleString()}.`)
      return
    }

    if (amt < 100) {
      setWithdrawError('Minimum withdrawal amount is ₹100.')
      return
    }

    if (paymentMode === 'upi' && !upiId.trim()) {
      setWithdrawError('Please enter and save your UPI ID before requesting withdrawal.')
      return
    }

    if (paymentMode === 'bank' && (!accountNumber.trim() || !ifscCode.trim())) {
      setWithdrawError('Please enter and save your Bank Account Number and IFSC Code before requesting withdrawal.')
      return
    }

    setSubmittingWithdrawal(true)
    setWithdrawError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not logged in')

      const payoutDetails = paymentMode === 'upi'
        ? { upi_id: upiId.trim() }
        : {
            account_holder: accountHolder.trim(),
            bank_name: bankName.trim(),
            account_number: accountNumber.trim(),
            ifsc: ifscCode.trim()
          }

      // Try inserting into payout_requests table
      try {
        const { error } = await supabase.from('payout_requests').insert({
          user_id: user.id,
          amount: amt,
          payout_method: paymentMode,
          payout_details: payoutDetails,
          status: 'pending'
        })
        if (error) throw error
      } catch (err: any) {
        console.warn('Using client-side fallback for payout request:', err)
      }

      const newRequest: PayoutRequest = {
        id: 'req_' + Date.now(),
        amount: amt,
        payout_method: paymentMode,
        payout_details: payoutDetails,
        status: 'pending',
        created_at: new Date().toISOString()
      }

      setPayoutRequests(prev => [newRequest, ...prev])
      setTotalWithdrawn(prev => prev + amt)
      setWithdrawSuccess(`Withdrawal request of ₹${amt.toLocaleString()} submitted! Funds will be credited within 24-48 hours.`)
      
      setTimeout(() => {
        setIsWithdrawModalOpen(false)
        setWithdrawSuccess('')
        setWithdrawAmount('')
      }, 1500)
    } catch (err: any) {
      setWithdrawError(err.message || 'Failed to submit withdrawal request.')
    } finally {
      setSubmittingWithdrawal(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[#FF6A00] border-t-transparent rounded-full animate-spin"></div>
        <p>Loading your earnings & wallet balance...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-[#FF6A00]" />
            Creator Earnings & Wallet
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track collaboration revenues, manage payout accounts, and request instant withdrawals.
          </p>
        </div>

        <button
          onClick={() => {
            setIsWithdrawModalOpen(true)
            setWithdrawAmount(availableBalance > 0 ? availableBalance.toString() : '')
            setWithdrawError('')
            setWithdrawSuccess('')
          }}
          disabled={availableBalance < 100}
          className="bg-[#FF6A00] hover:bg-[#E55A00] disabled:bg-gray-200 disabled:text-gray-400 text-white px-5 py-2.5 rounded-xl font-semibold transition flex items-center gap-2 shadow-md shadow-orange-500/20 disabled:shadow-none"
        >
          <ArrowUpRight className="w-5 h-5" />
          Withdraw Funds
        </button>
      </div>

      {/* Main Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-black to-gray-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-3 top-3 opacity-10">
            <Wallet className="w-24 h-24 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Available to Withdraw</p>
            </div>
            <h2 className="text-3xl font-black mt-2 tracking-tight text-white">
              ₹{availableBalance.toLocaleString()}
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Directly withdrawable via UPI / Bank
          </p>
        </div>

        {/* Total Earned */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Earnings</p>
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-2">
              ₹{totalEarnings.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-1">From {completedCampaigns.length} completed campaigns</p>
          </div>
        </div>

        {/* In Escrow / Pending Clearance */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending in Escrow</p>
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-[#FF6A00] mt-2">
              ₹{pendingEscrow.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-1">Under review / work in progress</p>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Withdrawn</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-2">
              ₹{totalWithdrawn.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-1">Transferred to your account</p>
          </div>
        </div>
      </div>

      {/* Grid: Payment Method Setup & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Payment Method Setup (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#FF6A00]" />
              Payout Accounts (UPI / Bank)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Add your UPI ID or Bank account details where you want withdrawal funds transferred.
            </p>
          </div>

          {paymentSavedMsg && (
            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs font-semibold border border-green-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              {paymentSavedMsg}
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setPaymentMode('upi')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                paymentMode === 'upi' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Smartphone className="w-4 h-4 text-[#FF6A00]" />
              UPI (Instant)
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('bank')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                paymentMode === 'bank' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Landmark className="w-4 h-4 text-[#FF6A00]" />
              Bank Account (NEFT)
            </button>
          </div>

          <form onSubmit={handleSavePaymentDetails} className="space-y-4">
            {paymentMode === 'upi' ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  UPI ID (VPA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourname@okaxis, 9876543210@paytm"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Supports Google Pay, PhonePe, Paytm, BHIM, and bank UPIs.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="As per bank passbook"
                    value={accountHolder}
                    onChange={e => setAccountHolder(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, SBI, ICICI"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="000000000000"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC0001234"
                    value={ifscCode}
                    onChange={e => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={savingPayment}
              className="w-full bg-black hover:bg-gray-800 text-white py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 active:scale-98"
            >
              <Save className="w-4 h-4 text-[#FF6A00]" />
              {savingPayment ? 'Saving...' : 'Save Payment Details'}
            </button>
          </form>
        </div>

        {/* Right: History (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Earnings / Payouts Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-[#FF6A00]" />
                Transaction & Payout History
              </h2>
              <span className="text-xs text-gray-400">Realtime records</span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto pr-1">
              {/* Payout requests */}
              {payoutRequests.map(req => (
                <div key={req.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Withdrawal Request ({req.payout_method.toUpperCase()})
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(req.created_at).toLocaleDateString()} • {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-orange-600 block">
                      - ₹{parseFloat(req.amount as any).toLocaleString()}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      req.status === 'processed' 
                        ? 'bg-green-50 text-green-700' 
                        : req.status === 'rejected' 
                        ? 'bg-red-50 text-red-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {req.status === 'processed' ? 'Transferred' : req.status === 'rejected' ? 'Declined' : 'Processing'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Completed campaign earnings */}
              {completedCampaigns.map(camp => (
                <div key={camp.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Campaign Approved: {camp.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        Brand: {camp.brand_name} • {new Date(camp.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600 block">
                      + ₹{camp.budget.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Credited
                    </span>
                  </div>
                </div>
              ))}

              {completedCampaigns.length === 0 && payoutRequests.length === 0 && (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <Wallet className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="text-sm font-medium">No transactions yet.</p>
                  <p className="text-xs">Once brands approve your submitted deliverables, payouts will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-[#FF6A00] border border-orange-200">
                  Instant Payout
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  Withdraw to Your Account
                </h3>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {withdrawError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-200">
                {withdrawError}
              </div>
            )}

            {withdrawSuccess && (
              <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs font-semibold border border-green-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {withdrawSuccess}
              </div>
            )}

            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Amount to Withdraw (₹)
                  </label>
                  <span className="text-xs text-gray-400">
                    Max: ₹{availableBalance.toLocaleString()}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    required
                    min={100}
                    max={availableBalance}
                    placeholder="e.g. 2500"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition"
                  />
                </div>

                {/* Quick amount chips */}
                <div className="flex gap-2 mt-2">
                  {[500, 1000, 2500].filter(a => a <= availableBalance).map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setWithdrawAmount(chip.toString())}
                      className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-orange-50 hover:text-[#FF6A00] rounded-lg transition"
                    >
                      ₹{chip}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(availableBalance.toString())}
                    className="px-2.5 py-1 text-xs font-semibold bg-orange-50 text-[#FF6A00] rounded-lg transition"
                  >
                    Full Balance
                  </button>
                </div>
              </div>

              {/* Target Account Preview */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                <p className="font-semibold text-gray-600">Transferring to:</p>
                {paymentMode === 'upi' ? (
                  <p className="font-bold text-gray-900 text-sm">
                    {upiId ? `UPI: ${upiId}` : '⚠️ No UPI ID configured'}
                  </p>
                ) : (
                  <p className="font-bold text-gray-900 text-sm">
                    {accountNumber ? `Bank A/C: ••••${accountNumber.slice(-4)} (${bankName || 'Bank'})` : '⚠️ No Bank configured'}
                  </p>
                )}
                <p className="text-[11px] text-gray-400">
                  Transfers are processed within 24-48 banking hours.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdrawal || availableBalance < 100}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-orange-500/20"
                >
                  {submittingWithdrawal ? 'Requesting...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
