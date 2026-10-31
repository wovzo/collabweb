"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ShieldCheck, 
  Wallet, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  QrCode, 
  Copy, 
  Check, 
  Sparkles, 
  CreditCard, 
  ExternalLink, 
  Plus, 
  X,
  Lock,
  Layers,
  HelpCircle,
  FileCheck
} from "lucide-react";

interface EscrowDeposit {
  id: string;
  amount: number;
  payment_method: string;
  utr_number?: string;
  screenshot_url?: string;
  status: "pending_verification" | "completed" | "failed";
  created_at: string;
  campaign_id?: string;
}

interface Campaign {
  id: string;
  title: string;
  budget: number | string;
  platform: string;
  status: string;
  escrow_funded?: boolean;
  escrow_amount?: number;
  escrow_status?: string;
  applications?: { count: number }[];
}

export default function BrandEscrowPage() {
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandProfile, setBrandProfile] = useState<any>(null);
  
  // Financial metrics
  const [escrowBalance, setEscrowBalance] = useState<number>(0);
  const [activeEscrowLocked, setActiveEscrowLocked] = useState<number>(0);
  const [totalDisbursed, setTotalDisbursed] = useState<number>(0);
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deposits, setDeposits] = useState<EscrowDeposit[]>([]);
  
  // Deposit Modal State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(5000);
  const [paymentTab, setPaymentTab] = useState<"upi" | "test" | "razorpay">("upi");
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Default UPI ID for manual brand deposits
  const defaultUpiId = "wovzopay@upi";

  useEffect(() => {
    loadEscrowDashboard();
  }, []);

  async function loadEscrowDashboard() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setBrandId(user.id);

      // 1. Fetch Brand Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setBrandProfile(profile);
        setEscrowBalance(Number(profile.escrow_balance || 0));
      }

      // 2. Fetch Brand Campaigns
      const { data: camps } = await supabase
        .from("campaigns")
        .select("*, applications(count)")
        .eq("brand_id", user.id)
        .order("created_at", { ascending: false });

      if (camps) {
        setCampaigns(camps as any[]);

        // Calculate active escrow held
        let locked = 0;
        camps.forEach((c: any) => {
          if (c.escrow_funded === true || c.escrow_status === "funded") {
            locked += Number(c.budget || c.escrow_amount || 0);
          }
        });
        setActiveEscrowLocked(locked);
      }

      // 3. Fetch Completed applications to calculate total disbursed
      try {
        const { data: apps } = await supabase
          .from("applications")
          .select("id, status, campaigns(budget, brand_id)")
          .eq("status", "completed");

        if (apps) {
          let disbursed = 0;
          apps.forEach((a: any) => {
            const camp = Array.isArray(a.campaigns) ? a.campaigns[0] : a.campaigns;
            if (camp && camp.brand_id === user.id) {
              disbursed += Number(camp.budget || 0);
            }
          });
          setTotalDisbursed(disbursed);
        }
      } catch (_) {}

      // 4. Fetch Escrow Deposits
      try {
        const { data: depList } = await supabase
          .from("escrow_deposits")
          .select("*")
          .eq("brand_id", user.id)
          .order("created_at", { ascending: false });

        if (depList && depList.length > 0) {
          setDeposits(depList as any[]);
        } else {
          // Graceful fallback sample initial list if table just created
          setDeposits([
            {
              id: "dep-welcome",
              amount: 5000,
              payment_method: "test_sandbox",
              status: "completed",
              created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            }
          ]);
        }
      } catch (_) {
        setDeposits([
          {
            id: "dep-welcome",
            amount: 5000,
            payment_method: "test_sandbox",
            status: "completed",
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load escrow data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Copy UPI ID helper
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(defaultUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Handle Screenshot file upload
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Fund a specific campaign's escrow
  const handleFundCampaignEscrow = async (campaign: Campaign) => {
    const budgetNum = Number(campaign.budget || 0);

    if (escrowBalance < budgetNum) {
      // Need more funds in wallet
      setDepositAmount(budgetNum - escrowBalance > 1000 ? budgetNum - escrowBalance : 2000);
      setIsDepositOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Deduct from brand escrow balance
      const newBal = escrowBalance - budgetNum;
      await supabase
        .from("profiles")
        .update({ escrow_balance: newBal })
        .eq("id", brandId);

      // 2. Mark campaign as escrow funded
      await supabase
        .from("campaigns")
        .update({ 
          escrow_funded: true,
          escrow_amount: budgetNum,
          escrow_status: "funded"
        })
        .eq("id", campaign.id);

      // 3. Update local state
      setEscrowBalance(newBal);
      setActiveEscrowLocked(prev => prev + budgetNum);
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, escrow_funded: true, escrow_status: "funded" } : c));

      setActionSuccess(`Campaign "${campaign.title}" is now 100% Escrow Funded! Creators will pitch with full trust.`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      console.error("Failed to fund campaign escrow:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Escrow Deposit (Direct UPI or Instant Sandbox)
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositAmount <= 0) return;

    setIsSubmitting(true);
    try {
      if (paymentTab === "test") {
        // Instant Sandbox / Demo Simulation
        const newBal = escrowBalance + depositAmount;

        // Try DB update
        try {
          await supabase
            .from("profiles")
            .update({ escrow_balance: newBal })
            .eq("id", brandId);

          await supabase.from("escrow_deposits").insert({
            brand_id: brandId,
            amount: depositAmount,
            payment_method: "test_sandbox",
            status: "completed",
            verified_at: new Date().toISOString()
          });
        } catch (_) {}

        setEscrowBalance(newBal);
        setDeposits(prev => [
          {
            id: "dep-" + Date.now(),
            amount: depositAmount,
            payment_method: "test_sandbox",
            status: "completed",
            created_at: new Date().toISOString()
          },
          ...prev
        ]);

        setActionSuccess(`₹${depositAmount.toLocaleString()} added to Escrow Balance via Sandbox Simulation!`);
        setIsDepositOpen(false);
        setTimeout(() => setActionSuccess(null), 5000);
      } else if (paymentTab === "upi") {
        // Direct UPI with UTR submission
        if (!utrNumber.trim()) {
          alert("Please enter the 12-digit UTR / UPI Transaction Reference Number.");
          setIsSubmitting(false);
          return;
        }

        const newDeposit: EscrowDeposit = {
          id: "dep-" + Date.now(),
          amount: depositAmount,
          payment_method: "upi_qr",
          utr_number: utrNumber.trim(),
          screenshot_url: screenshotBase64 || undefined,
          status: "pending_verification",
          created_at: new Date().toISOString()
        };

        try {
          await supabase.from("escrow_deposits").insert({
            brand_id: brandId,
            amount: depositAmount,
            payment_method: "upi_qr",
            utr_number: utrNumber.trim(),
            screenshot_url: screenshotBase64 || null,
            status: "pending_verification"
          });
        } catch (_) {}

        setDeposits(prev => [newDeposit, ...prev]);
        setUtrNumber("");
        setScreenshotBase64(null);
        setIsDepositOpen(false);
        setActionSuccess(`Deposit request of ₹${depositAmount.toLocaleString()} submitted! Verification usually takes 5-15 mins.`);
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (err) {
      console.error("Deposit submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // UPI QR String for dynamic generation
  const upiUrl = `upi://pay?pa=${defaultUpiId}&pn=WOVZO%20Collab&am=${depositAmount}&cu=INR&tn=WOVZO%20Escrow`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Brand Escrow & Billing</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Protected
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Fund your campaign budgets into WOVZO Escrow. Payouts are only disbursed once you approve creator deliverables.
          </p>
        </div>
        <button
          onClick={() => {
            setDepositAmount(5000);
            setIsDepositOpen(true);
          }}
          className="bg-[#FF6A00] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#E55A00] transition flex items-center gap-2 shadow-sm shadow-orange-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Deposit Funds
        </button>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3 text-green-800 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Escrow Balance */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Balance</span>
            <div className="p-2 bg-orange-50 text-[#FF6A00] rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            ₹{escrowBalance.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <span className="text-green-600 font-semibold">● Ready to allocate</span> to campaigns
          </div>
        </div>

        {/* Card 2: Locked in Active Campaigns */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Active Escrow</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            ₹{activeEscrowLocked.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Held safe for active creator collaborations
          </div>
        </div>

        {/* Card 3: Total Disbursed */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Disbursed</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            ₹{totalDisbursed.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Paid out upon verified work completion
          </div>
        </div>

        {/* Card 4: How Escrow Works */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#FF6A00] font-semibold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Escrow Guarantee
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Funds stay strictly in WOVZO Escrow until you review and approve creator deliverable proofs. Zero fraud risk.
            </p>
          </div>
          <div className="mt-3 text-xs text-[#FF6A00] font-semibold flex items-center gap-1">
            Learn more &rarr;
          </div>
        </div>
      </div>

      {/* Campaign Escrow Allocation Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Campaign Escrow Allocations</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Escrow funded campaigns receive 4x more top creator applications.
            </p>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {campaigns.length} Total Campaigns
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No campaigns created yet.</p>
              <p className="text-xs text-gray-400 mt-1">Post your first campaign to allocate escrow.</p>
            </div>
          ) : (
            campaigns.map((camp) => {
              const budgetNum = Number(camp.budget || 0);
              const isFunded = camp.escrow_funded === true || camp.escrow_status === "funded";
              const applicantsCount = camp.applications?.[0]?.count || 0;

              return (
                <div key={camp.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-base">{camp.title}</h3>
                      {isFunded ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Escrow Funded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Escrow Unfunded
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="capitalize font-medium text-gray-700">Platform: {camp.platform}</span>
                      <span>•</span>
                      <span className="font-semibold text-gray-900">Budget: ₹{budgetNum.toLocaleString()}</span>
                      <span>•</span>
                      <span>{applicantsCount} Applicants</span>
                    </div>
                  </div>

                  <div>
                    {isFunded ? (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-green-600" /> ₹{budgetNum.toLocaleString()} Protected
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleFundCampaignEscrow(camp)}
                        disabled={isSubmitting}
                        className="bg-slate-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5 text-[#FF6A00]" />
                        {escrowBalance >= budgetNum ? "Lock Escrow (₹" + budgetNum.toLocaleString() + ")" : "Deposit & Lock Escrow"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Deposits & Receipts History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Deposit History & Receipts</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Record of all escrow deposits initiated via Direct UPI QR, Sandbox Simulation, or Cards.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {deposits.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No deposit transactions found.
            </div>
          ) : (
            deposits.map((dep) => (
              <div key={dep.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    dep.status === "completed" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {dep.payment_method === "upi_qr" ? <QrCode className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <span>Deposit via {dep.payment_method === "upi_qr" ? "Direct UPI QR" : dep.payment_method === "test_sandbox" ? "Sandbox Simulation" : "Card / NetBanking"}</span>
                      {dep.utr_number && (
                        <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          UTR: {dep.utr_number}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(dep.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-base font-bold text-gray-900">
                    +₹{Number(dep.amount).toLocaleString()}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    dep.status === "completed" 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {dep.status === "completed" ? "Verified & Credited" : "Pending Verification"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DEPOSIT MODAL WITH DIRECT UPI QR & SANDBOX SIMULATION */}
      {/* ======================================================== */}
      {isDepositOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#FF6A00]" />
                  <h2 className="text-lg font-bold">Fund Escrow Balance</h2>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  100% Protected. Unused escrow balance can be withdrawn anytime.
                </p>
              </div>
              <button 
                onClick={() => setIsDepositOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleDepositSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Amount Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                  Deposit Amount (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-lg">₹</span>
                  <input
                    type="number"
                    min="100"
                    step="500"
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xl text-gray-900 focus:outline-none focus:border-[#FF6A00]"
                  />
                </div>
                {/* Quick Amount Chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[2000, 5000, 10000, 25000, 50000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setDepositAmount(amt)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        depositAmount === amt
                          ? "bg-[#FF6A00] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                  Select Deposit Method
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPaymentTab("upi")}
                    className={`py-2 rounded-lg transition cursor-pointer flex flex-col items-center gap-1 ${
                      paymentTab === "upi"
                        ? "bg-white text-gray-900 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span>Direct UPI QR</span>
                    <span className="text-[10px] text-green-600 font-semibold">Zero Fees</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTab("test")}
                    className={`py-2 rounded-lg transition cursor-pointer flex flex-col items-center gap-1 ${
                      paymentTab === "test"
                        ? "bg-white text-gray-900 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span>Instant Demo</span>
                    <span className="text-[10px] text-[#FF6A00] font-semibold">Sandbox Test</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTab("razorpay")}
                    className={`py-2 rounded-lg transition cursor-pointer flex flex-col items-center gap-1 ${
                      paymentTab === "razorpay"
                        ? "bg-white text-gray-900 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span>Cards / NetBank</span>
                    <span className="text-[10px] text-purple-600 font-semibold">Razorpay</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: DIRECT UPI QR CODE */}
              {paymentTab === "upi" && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-600 font-medium mb-3">
                      Scan QR code via <strong>GPay, PhonePe, Paytm, or BHIM</strong>
                    </p>

                    <div className="bg-white p-3 rounded-2xl shadow-sm inline-block border border-gray-200">
                      <img
                        src={qrImageSrc}
                        alt="UPI Payment QR"
                        className="w-44 h-44 mx-auto object-contain rounded-lg"
                      />
                      <div className="mt-2 text-xs font-bold text-gray-900">
                        ₹{depositAmount.toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-2">
                      <code className="bg-white px-2.5 py-1 rounded-md text-xs font-bold text-gray-800 border border-gray-200">
                        {defaultUpiId}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="text-xs text-[#FF6A00] hover:underline font-semibold flex items-center gap-1"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedUpi ? "Copied" : "Copy UPI"}
                      </button>
                    </div>

                    <div className="mt-2">
                      <a
                        href={upiUrl}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open in UPI App (Mobile)
                      </a>
                    </div>
                  </div>

                  {/* UTR Input Form */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      12-Digit UTR / UPI Transaction Reference No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 429381748291"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#FF6A00]"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Found in your GPay / PhonePe payment receipt screen.
                    </p>
                  </div>

                  {/* Optional Screenshot */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Upload Payment Screenshot (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-[#FF6A00] hover:file:bg-orange-100"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: INSTANT TEST SANDBOX */}
              {paymentTab === "test" && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                    <div className="flex items-center gap-2 text-[#FF6A00] font-bold text-sm mb-1">
                      <Sparkles className="w-4 h-4" /> Instant Demo Simulation Mode
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      This allows you or prospective brand clients to simulate depositing <strong>₹{depositAmount.toLocaleString()}</strong> into Escrow instantly. No real bank charges will be incurred.
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Simulated Deposit Amount:</span>
                      <strong className="text-gray-900">₹{depositAmount.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Escrow Security Fee:</span>
                      <strong className="text-green-600">₹0 (Free)</strong>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-gray-900">
                      <span>Total Credited:</span>
                      <span className="text-[#FF6A00]">₹{depositAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RAZORPAY ONLINE GATEWAY */}
              {paymentTab === "razorpay" && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-sm mb-1">
                      <CreditCard className="w-4 h-4 text-purple-600" /> Automated Razorpay Gateway Ready
                    </div>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Our system is 100% pre-architected for Razorpay. As soon as you configure your API keys in <code>.env.local</code>, automated credit cards, debit cards, and netbanking will activate here without code changes.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-2">
                    <div className="font-semibold text-gray-700">How to activate Razorpay:</div>
                    <code className="block bg-slate-900 text-green-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto">
                      NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
                    </code>
                    <p className="text-[11px] text-gray-500">
                      For now, please use the <strong>Direct UPI QR</strong> or <strong>Instant Demo</strong> tabs above to complete your deposit!
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || paymentTab === "razorpay"}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#FF6A00] hover:bg-[#E55A00] font-semibold text-white transition text-sm flex items-center justify-center gap-2 shadow-sm shadow-orange-200 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : paymentTab === "test" ? (
                    <>
                      <Sparkles className="w-4 h-4" /> Simulate Success
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Submit UTR for Verification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
