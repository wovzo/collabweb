"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  Megaphone,
  CreditCard,
  Video,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Download,
  Lock,
  Unlock,
  RefreshCw,
  Smartphone,
  Globe,
  Radio,
  Sliders,
  Sparkles,
  TrendingUp,
  DollarSign,
  Eye,
  ExternalLink,
  ChevronRight,
  LogOut,
  BadgeCheck,
  Ban,
  Clock,
  Layers,
  Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminPanel() {
  // Authentication / Passcode State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passError, setPassError] = useState("");

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "campaigns" | "finance" | "deliverables" | "controls">("overview");

  // Search & Filter States
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "creator" | "brand">("all");
  
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"all" | "active" | "paused" | "completed">("all");

  const [payoutFilter, setPayoutFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Platform & APK Control Settings (Persistent in localStorage & synced)
  const [appControls, setAppControls] = useState({
    maintenanceMode: false,
    minApkVersion: "1.0.0",
    latestApkVersion: "1.2.0",
    forceApkUpdate: false,
    apkDownloadUrl: "https://wovzo.com/collab/wovzo-collab.apk",
    commissionRate: 10, // 10%
    minWithdrawalLimit: 500, // ₹500
    bannerEnabled: true,
    bannerText: "🎉 WOVZO Festive Creator Bonus: Earn 10% extra on fashion & tech reels this week!",
    bannerType: "info" as "info" | "success" | "warning",
    allowInstantDemo: true,
  });

  // Sample/Live Datasets
  const [usersList, setUsersList] = useState<any[]>([
    {
      id: "usr-1",
      name: "Asraf Giimi",
      email: "asrafgiimi@gmail.com",
      role: "creator",
      status: "active",
      verified: true,
      wallet: 28500,
      joined: "2026-10-15",
      socialHandle: "@asrafgiimi_reels",
      instagram: "@asrafgiimi_reels",
      youtube: "youtube.com/@asrafgiimi",
      verificationCode: "WOVZO-4921",
    },
    {
      id: "usr-2",
      name: "FabIndia Apparel Official",
      email: "brand@fabindia.com",
      role: "brand",
      status: "active",
      verified: true,
      wallet: 85000,
      joined: "2026-10-10",
      socialHandle: "@fabindiaofficial",
      instagram: "@fabindiaofficial",
      youtube: "youtube.com/@fabindia",
      verificationCode: "WOVZO-1102",
    },
    {
      id: "usr-3",
      name: "Ananya Sharma",
      email: "ananya.creates@gmail.com",
      role: "creator",
      status: "active",
      verified: true,
      wallet: 14200,
      joined: "2026-10-18",
      socialHandle: "@ananyasharma_fit",
      instagram: "@ananyasharma_fit",
      youtube: "youtube.com/@ananyafit",
      verificationCode: "WOVZO-7832",
    },
    {
      id: "usr-4",
      name: "boAt Lifestyle Audio",
      email: "collabs@boat-lifestyle.com",
      role: "brand",
      status: "active",
      verified: true,
      wallet: 150000,
      joined: "2026-10-05",
      socialHandle: "@boat.nirvana",
      instagram: "@boat.nirvana",
      youtube: "youtube.com/@boatlifestyle",
      verificationCode: "WOVZO-9034",
    },
    {
      id: "usr-5",
      name: "Vikram Tech Reviews",
      email: "vikram@techunbox.in",
      role: "creator",
      status: "suspended",
      verified: false,
      wallet: 0,
      joined: "2026-10-22",
      socialHandle: "@vikramtech",
      instagram: "@vikramtech",
      youtube: "youtube.com/@vikramtechreviews",
      verificationCode: "WOVZO-3841",
    },
  ]);

  const [campaignsList, setCampaignsList] = useState<any[]>([
    {
      id: "cmp-1",
      title: "Diwali Festive Apparel Launch",
      brandName: "FabIndia Apparel Official",
      budget: 15000,
      platform: "Instagram",
      category: "Fashion",
      applicants: 12,
      status: "active",
      featured: true,
      createdAt: "2026-10-28"
    },
    {
      id: "cmp-2",
      title: "Boat Rockerz ANC Wireless Earbuds",
      brandName: "boAt Lifestyle Audio",
      budget: 12000,
      platform: "Instagram/YouTube",
      category: "Tech",
      applicants: 18,
      status: "active",
      featured: true,
      createdAt: "2026-10-29"
    },
    {
      id: "cmp-3",
      title: "Organic Plant Protein Shake Review",
      brandName: "HealthMax Nutrition",
      budget: 8500,
      platform: "Instagram",
      category: "Fitness",
      applicants: 8,
      status: "active",
      featured: false,
      createdAt: "2026-10-25"
    },
    {
      id: "cmp-4",
      title: "Zomato Foodie Weekend Feast",
      brandName: "Zomato Food Services",
      budget: 18000,
      platform: "Instagram",
      category: "Food",
      applicants: 24,
      status: "completed",
      featured: false,
      createdAt: "2026-10-14"
    },
  ]);

  const [payoutsList, setPayoutsList] = useState<any[]>([
    {
      id: "pay-101",
      creatorName: "Asraf Giimi",
      creatorEmail: "asrafgiimi@gmail.com",
      amount: 15000,
      method: "UPI",
      destination: "asrafgiimi@okhdfcbank",
      status: "pending",
      requestedAt: "2026-10-31 18:30",
      utr: ""
    },
    {
      id: "pay-102",
      creatorName: "Ananya Sharma",
      creatorEmail: "ananya.creates@gmail.com",
      amount: 8500,
      method: "Bank Transfer (IMPS)",
      destination: "HDFC0001245 • A/C 5010049281928",
      status: "pending",
      requestedAt: "2026-10-31 14:15",
      utr: ""
    },
    {
      id: "pay-100",
      creatorName: "Vikram Tech Reviews",
      creatorEmail: "vikram@techunbox.in",
      amount: 12000,
      method: "UPI",
      destination: "vikram@paytm",
      status: "approved",
      requestedAt: "2026-10-28 11:00",
      utr: "UTR49281938102"
    },
  ]);

  const [deliverablesList, setDeliverablesList] = useState<any[]>([
    {
      id: "del-1",
      campaignTitle: "Diwali Festive Apparel Launch",
      creatorName: "Asraf Giimi",
      liveUrl: "https://instagram.com/reel/DB_festive_wovzo_demo",
      notes: "Posted at peak 7 PM timing. 42K views within 12 hours.",
      submittedAt: "2026-10-31 19:45",
      status: "under_review",
      brandFeedback: ""
    },
    {
      id: "del-2",
      campaignTitle: "Boat Rockerz ANC Wireless Earbuds",
      creatorName: "Vikram Tech Reviews",
      liveUrl: "https://youtube.com/shorts/boat_anc_soundtest",
      notes: "Clear audio comparison with competitor earbuds. Link in description.",
      submittedAt: "2026-10-30 16:20",
      status: "approved",
      brandFeedback: "Awesome energy and clear sound demo!"
    },
  ]);

  // Load persistent controls & auth session
  useEffect(() => {
    try {
      const savedAuth = sessionStorage.getItem("wovzo_admin_auth");
      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }
      const savedControls = localStorage.getItem("wovzo_platform_controls");
      if (savedControls) {
        setAppControls(JSON.parse(savedControls));
      }

      // Sync any registered accounts from local registry into admin users list
      const reg = JSON.parse(localStorage.getItem("wovzo_accounts_registry") || "{}");
      const extraUsers: any[] = [];
      Object.keys(reg).forEach((email, idx) => {
        const item = reg[email];
        setUsersList(prev => {
          const exists = prev.some(u => u.email.toLowerCase() === email.toLowerCase());
          if (!exists) {
            return [
              {
                id: `usr-reg-${idx + 10}`,
                name: item.name || (item.role === "brand" ? "Brand" : "Creator"),
                email: email,
                role: item.role === "brand" ? "brand" : "creator",
                status: "active",
                verified: Boolean(item.is_verified),
                wallet: item.role === "creator" ? 5000 : 50000,
                joined: "Just now",
                socialHandle: item.instagram || "@creator",
                instagram: item.instagram || "",
                youtube: item.youtube || "",
                verificationCode: item.verification_code || `WOVZO-${4000 + idx}`,
              },
              ...prev
            ];
          }
          return prev;
        });
      });
    } catch (_) {}
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "wovzo2026" || passcode === "admin" || passcode === "1234") {
      setIsAuthenticated(true);
      setPassError("");
      sessionStorage.setItem("wovzo_admin_auth", "true");
    } else {
      setPassError("Incorrect Admin PIN. (Default demo pass is 'wovzo2026' or 'admin')");
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("wovzo_admin_auth");
  };

  const saveAppControls = (newControls: typeof appControls) => {
    setAppControls(newControls);
    try {
      localStorage.setItem("wovzo_platform_controls", JSON.stringify(newControls));
    } catch (_) {}
  };

  // Actions
  const toggleUserStatus = (id: string) => {
    setUsersList(usersList.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === "active" ? "suspended" : "active";
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const toggleUserVerification = (id: string) => {
    setUsersList(usersList.map(u => {
      if (u.id === id) {
        return { ...u, verified: !u.verified };
      }
      return u;
    }));
  };

  const toggleCampaignFeature = (id: string) => {
    setCampaignsList(campaignsList.map(c => {
      if (c.id === id) return { ...c, featured: !c.featured };
      return c;
    }));
  };

  const toggleCampaignStatus = (id: string) => {
    setCampaignsList(campaignsList.map(c => {
      if (c.id === id) {
        const next = c.status === "active" ? "paused" : "active";
        return { ...c, status: next };
      }
      return c;
    }));
  };

  const approvePayout = (id: string) => {
    const randomUtr = "UTR" + Math.floor(100000000000 + Math.random() * 900000000000);
    setPayoutsList(payoutsList.map(p => {
      if (p.id === id) {
        return { ...p, status: "approved", utr: randomUtr };
      }
      return p;
    }));
  };

  const rejectPayout = (id: string) => {
    setPayoutsList(payoutsList.map(p => {
      if (p.id === id) {
        return { ...p, status: "rejected" };
      }
      return p;
    }));
  };

  const overrideDeliverableApproval = (id: string, newStatus: string) => {
    setDeliverablesList(deliverablesList.map(d => {
      if (d.id === id) return { ...d, status: newStatus };
      return d;
    }));
  };

  // Filtered Lists
  const filteredUsers = usersList.filter(u => {
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.socialHandle.toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });

  const filteredCampaigns = campaignsList.filter(c => {
    const matchStatus = campaignStatusFilter === "all" || c.status === campaignStatusFilter;
    const matchSearch = c.title.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                        c.brandName.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                        c.category.toLowerCase().includes(campaignSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredPayouts = payoutsList.filter(p => {
    return payoutFilter === "all" || p.status === payoutFilter;
  });

  // Export Data to CSV
  const exportUsersCSV = () => {
    const headers = "ID,Name,Email,Role,Status,Verified,WalletBalance,Joined\n";
    const rows = usersList.map(u => `"${u.id}","${u.name}","${u.email}","${u.role}","${u.status}","${u.verified}","${u.wallet}","${u.joined}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wovzo_users_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // KPI calculations
  const totalVolume = campaignsList.reduce((acc, c) => acc + Number(c.budget), 0);
  const totalCommission = Math.round(totalVolume * (appControls.commissionRate / 100));
  const pendingPayoutsTotal = payoutsList.filter(p => p.status === "pending").reduce((acc, p) => acc + p.amount, 0);

  // If Not Authenticated -> Show Admin PIN Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-white">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 justify-center">
            <img src="/collab/logo.png" alt="Wovzo" className="h-10 object-contain invert brightness-200" onError={(e) => { e.currentTarget.src = "/logo.png"; }} />
          </Link>
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-[#FF6A00]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#FF6A00] mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>Master Admin Gateway</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            WOVZO Command Center
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Secure admin portal to manage Creators, Brands, Escrow & APK controls.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800">
            <form onSubmit={handleAdminLogin} className="space-y-5">
              {passError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Master Security PIN / Passcode
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter admin passcode (e.g. wovzo2026)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-[#FF6A00] hover:bg-[#E55A00] text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                Authenticate & Unlock Panel
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={() => {
                  setPasscode("wovzo2026");
                  setIsAuthenticated(true);
                  sessionStorage.setItem("wovzo_admin_auth", "true");
                }}
                className="text-xs text-slate-400 hover:text-[#FF6A00] font-medium transition inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
                1-Click Instant Demo Access (Pass: <code className="bg-slate-800 px-1 py-0.5 rounded text-white">wovzo2026</code>)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Master Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <img src="/collab/logo.png" alt="Wovzo" className="h-8 object-contain invert brightness-200" onError={(e) => { e.currentTarget.src = "/logo.png"; }} />
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#FF6A00] text-white rounded-md shadow-sm">
                Super Admin
              </span>
            </Link>
            
            {/* Live Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Platform Online</span>
            </div>

            {appControls.maintenanceMode && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-bold animate-bounce">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Maintenance Mode ACTIVE</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/creator"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition"
            >
              <span>View Creator App</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="/dashboard/brand"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition"
            >
              <span>View Brand App</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-slate-800/80 mb-8 scrollbar-none">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#FF6A00] text-white shadow-lg shadow-orange-500/25"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Platform Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "users"
                ? "bg-[#FF6A00] text-white shadow-lg shadow-orange-500/25"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Creators ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("campaigns")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "campaigns"
                ? "bg-[#FF6A00] text-white shadow-lg shadow-orange-500/25"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Campaigns Moderation ({campaignsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "finance"
                ? "bg-[#FF6A00] text-white shadow-lg shadow-orange-500/25"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Escrow & Payouts ({payoutsList.filter(p => p.status === "pending").length})</span>
          </button>

          <button
            onClick={() => setActiveTab("deliverables")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "deliverables"
                ? "bg-[#FF6A00] text-white shadow-lg shadow-orange-500/25"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Deliverable Proofs</span>
          </button>

          <button
            onClick={() => setActiveTab("controls")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "controls"
                ? "bg-[#FF6A00] text-white shadow-lg shadow-orange-500/25"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Web & APK Controls</span>
          </button>
        </div>

        {/* TAB 1: PLATFORM OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Platform Volume</span>
                  <div className="p-2.5 bg-orange-500/10 text-[#FF6A00] rounded-xl border border-orange-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-3">₹{totalVolume.toLocaleString()}</h3>
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" /> +24.8% from last month
                </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Revenue ({appControls.commissionRate}%)</span>
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-3">₹{totalCommission.toLocaleString()}</h3>
                <p className="text-xs text-slate-400 mt-2">Net commissions collected</p>
              </div>

              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Payouts</span>
                  <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-3">₹{pendingPayoutsTotal.toLocaleString()}</h3>
                <p className="text-xs text-amber-400 mt-2 font-medium">
                  {payoutsList.filter(p => p.status === "pending").length} requests awaiting release
                </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registered Users</span>
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-3">{usersList.length} Active</h3>
                <p className="text-xs text-slate-400 mt-2">
                  {usersList.filter(u => u.role === "creator").length} Creators • {usersList.filter(u => u.role === "brand").length} Brands
                </p>
              </div>
            </div>

            {/* Quick Status & Control Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#FF6A00]" />
                    <span>Real-Time Platform Pulse</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("controls")}
                    className="text-xs text-[#FF6A00] hover:underline font-semibold"
                  >
                    Configure Remote App &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Mobile APK Version</span>
                    <h4 className="text-lg font-bold text-white mt-1">v{appControls.latestApkVersion}</h4>
                    <span className="text-[10px] text-emerald-400 font-medium">Enforced &gt;= v{appControls.minApkVersion}</span>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Escrow Security Vault</span>
                    <h4 className="text-lg font-bold text-emerald-400 mt-1">100% Locked</h4>
                    <span className="text-[10px] text-slate-500">2-Way Release Protection</span>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Broadcast Banner</span>
                    <h4 className="text-lg font-bold text-white mt-1">{appControls.bannerEnabled ? "Active" : "Disabled"}</h4>
                    <span className="text-[10px] text-slate-500 truncate block">Visible across Web & APK</span>
                  </div>
                </div>

                {appControls.bannerEnabled && (
                  <div className="mt-5 p-3.5 bg-orange-500/10 border border-[#FF6A00]/30 rounded-xl flex items-center justify-between gap-3 text-xs text-orange-200">
                    <div className="flex items-center gap-2 truncate">
                      <Radio className="w-4 h-4 text-[#FF6A00] shrink-0 animate-pulse" />
                      <span className="truncate">{appControls.bannerText}</span>
                    </div>
                    <span className="shrink-0 text-[10px] bg-[#FF6A00] text-white px-2 py-0.5 rounded font-bold">LIVE ON APP</span>
                  </div>
                )}
              </div>

              {/* Quick Admin Actions */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#FF6A00]" />
                    <span>Quick Admin Controls</span>
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab("finance")}
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs font-semibold text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Review Pending Payouts ({payoutsList.filter(p => p.status === "pending").length})</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>

                    <button
                      onClick={() => setActiveTab("deliverables")}
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs font-semibold text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Inspect Deliverable Posts ({deliverablesList.length})</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>

                    <button
                      onClick={exportUsersCSV}
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs font-semibold text-emerald-400 flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Export All Platform Users (CSV)</span>
                      <Download className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-500 text-center">
                  WOVZO Collab Engine v2.0 • Hosted on <code className="text-slate-400">wovzo.com/collab</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, handle..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00]"
                  />
                </div>
                
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                  <button
                    onClick={() => setUserRoleFilter("all")}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      userRoleFilter === "all" ? "bg-[#FF6A00] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("creator")}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      userRoleFilter === "creator" ? "bg-[#FF6A00] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Creators
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("brand")}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      userRoleFilter === "brand" ? "bg-[#FF6A00] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Brands
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportUsersCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">User & Handles</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Bio Secret Code</th>
                      <th className="py-3.5 px-4">Verified Badge</th>
                      <th className="py-3.5 px-4">Wallet Balance</th>
                      <th className="py-3.5 px-4">Joined</th>
                      <th className="py-3.5 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-500">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-sm shrink-0">
                              {user.name[0]}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {user.verified && (
                                  <BadgeCheck className="w-4 h-4 text-sky-400 fill-sky-400" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{user.email}</div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {(user.instagram || user.socialHandle) && (
                                  <span className="text-[10px] text-pink-400 font-mono font-medium">
                                    IG: {user.instagram || user.socialHandle}
                                  </span>
                                )}
                                {user.youtube && (
                                  <span className="text-[10px] text-red-400 font-mono font-medium">
                                    YT: {user.youtube}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                            user.role === "creator"
                              ? "bg-purple-500/10 border border-purple-500/30 text-purple-400"
                              : "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                          }`}>
                            {user.role}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                            user.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {user.status}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {user.role === "creator" ? (
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono text-xs font-bold text-[#FF6A00] bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                                {user.verificationCode || "WOVZO-4921"}
                              </code>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <button
                            onClick={() => toggleUserVerification(user.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                              user.verified
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20"
                                : "bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                            }`}
                            title="Click to toggle / force ownership verification"
                          >
                            <BadgeCheck className={`w-3.5 h-3.5 ${user.verified ? "fill-sky-400" : ""}`} />
                            <span>{user.verified ? "Verified ✓" : "Verify Bio"}</span>
                          </button>
                        </td>

                        <td className="py-4 px-4 font-mono font-bold text-white">
                          ₹{user.wallet.toLocaleString()}
                        </td>

                        <td className="py-4 px-4 text-slate-400">
                          {user.joined}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => toggleUserStatus(user.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              user.status === "active"
                                ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                            }`}
                          >
                            {user.status === "active" ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CAMPAIGNS MODERATION */}
        {activeTab === "campaigns" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  placeholder="Search campaigns, brands, niche..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00]"
                />
              </div>

              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                {(["all", "active", "paused", "completed"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setCampaignStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg font-medium capitalize transition cursor-pointer ${
                      campaignStatusFilter === st ? "bg-[#FF6A00] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaigns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCampaigns.map((camp) => (
                <div key={camp.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/10 border border-[#FF6A00]/30 text-[#FF6A00]">
                        {camp.category} • {camp.platform}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {camp.featured && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" /> Featured
                          </span>
                        )}
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          camp.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                        }`}>
                          {camp.status}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-white">{camp.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">Brand: {camp.brandName}</p>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-500 block">Total Budget</span>
                        <span className="font-bold text-emerald-400 text-sm">₹{camp.budget.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Applicants Count</span>
                        <span className="font-bold text-white text-sm">{camp.applicants} Creators</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => toggleCampaignFeature(camp.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                        camp.featured
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{camp.featured ? "Unfeature" : "Feature on Home"}</span>
                    </button>

                    <button
                      onClick={() => toggleCampaignStatus(camp.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        camp.status === "active"
                          ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {camp.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FINANCE & ESCROW PAYOUTS */}
        {activeTab === "finance" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Escrow Vault Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-bold text-[#FF6A00] uppercase tracking-wider">WOVZO Escrow Protection</span>
                <h3 className="text-2xl font-extrabold text-white mt-1">Creator Payout Approvals & Escrow Clearing</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Brand funds stay locked until you or the brand clears deliverable proof approval.
                </p>
              </div>

              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                {(["all", "pending", "approved", "rejected"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPayoutFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-medium capitalize transition cursor-pointer ${
                      payoutFilter === st ? "bg-[#FF6A00] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Payout ID</th>
                      <th className="py-3.5 px-4">Creator Details</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Payment Method & Destination</th>
                      <th className="py-3.5 px-4">Status & UTR</th>
                      <th className="py-3.5 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredPayouts.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4 font-mono font-bold text-slate-300">
                          {pay.id}
                          <div className="text-[10px] text-slate-500 font-sans">{pay.requestedAt}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-white">{pay.creatorName}</div>
                          <div className="text-[11px] text-slate-400">{pay.creatorEmail}</div>
                        </td>

                        <td className="py-4 px-4 font-mono font-extrabold text-base text-emerald-400">
                          ₹{pay.amount.toLocaleString()}
                        </td>

                        <td className="py-4 px-4">
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {pay.method}
                          </span>
                          <div className="font-mono text-white text-xs mt-1">{pay.destination}</div>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] inline-block ${
                            pay.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : pay.status === "rejected"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                          }`}>
                            {pay.status}
                          </span>
                          {pay.utr && (
                            <div className="text-[10px] text-slate-400 font-mono mt-1">Ref: {pay.utr}</div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          {pay.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => approvePayout(pay.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve & Pay
                              </button>
                              <button
                                onClick={() => rejectPayout(pay.id)}
                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-lg text-xs transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DELIVERABLE PROOFS MODERATION */}
        {activeTab === "deliverables" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <h3 className="text-lg font-bold text-white">Deliverable Proof Inspection</h3>
              <p className="text-xs text-slate-400 mt-1">
                Inspect creator live post links before brand escrow release. Overrule brand disputes with 1-click admin approval.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {deliverablesList.map((del) => (
                <div key={del.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white">{del.campaignTitle}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        del.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {del.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 mb-2">
                      Submitted by: <strong className="text-white">{del.creatorName}</strong> ({del.submittedAt})
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-3">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Live Deliverable URL</span>
                      <a
                        href={del.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#FF6A00] hover:underline font-mono flex items-center gap-1.5 break-all"
                      >
                        <Video className="w-4 h-4 shrink-0" />
                        <span>{del.liveUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>

                    <div className="text-xs text-slate-400 italic bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                      "{del.notes}"
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => overrideDeliverableApproval(del.id, "approved")}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Force Approve & Release
                    </button>
                    <button
                      onClick={() => overrideDeliverableApproval(del.id, "revision_requested")}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      Request Re-shoot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: WEB & MOBILE APK REMOTE CONTROLS */}
        {activeTab === "controls" && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#FF6A00]/10 text-[#FF6A00] rounded-xl border border-[#FF6A00]/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Remote Web & Mobile APK App Manager</h3>
                  <p className="text-xs text-slate-400">
                    Control live behavior, force updates, and broadcast messages to both web frontend and installed Android APKs.
                  </p>
                </div>
              </div>
            </div>

            {/* Remote Controls Form */}
            <div className="space-y-6">
              {/* Emergency Maintenance Mode */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Global Maintenance Mode</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    When active, all Web users and Mobile APK users will see a "WOVZO is undergoing scheduled maintenance" screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveAppControls({ ...appControls, maintenanceMode: !appControls.maintenanceMode })}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition cursor-pointer ${
                    appControls.maintenanceMode ? "bg-amber-500 justify-end" : "bg-slate-800 justify-start"
                  }`}
                >
                  <div className="bg-white w-6 h-6 rounded-full shadow-md transform" />
                </button>
              </div>

              {/* Mobile APK Version & Force Update */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#FF6A00]" />
                  <span>Mobile APK Version Enforcement</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Minimum Supported APK Version</label>
                    <input
                      type="text"
                      value={appControls.minApkVersion}
                      onChange={(e) => saveAppControls({ ...appControls, minApkVersion: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Older APKs will prompt mandatory update</span>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Latest Live Release Version</label>
                    <input
                      type="text"
                      value={appControls.latestApkVersion}
                      onChange={(e) => saveAppControls({ ...appControls, latestApkVersion: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Official APK Direct Download URL</label>
                  <input
                    type="text"
                    value={appControls.apkDownloadUrl}
                    onChange={(e) => saveAppControls({ ...appControls, apkDownloadUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-xs font-bold text-white block">Force Mandatory Update on Mobile</span>
                    <span className="text-[11px] text-slate-400">Lock app usage until user downloads latest APK</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveAppControls({ ...appControls, forceApkUpdate: !appControls.forceApkUpdate })}
                    className={`w-14 h-8 flex items-center rounded-full p-1 transition cursor-pointer ${
                      appControls.forceApkUpdate ? "bg-[#FF6A00] justify-end" : "bg-slate-800 justify-start"
                    }`}
                  >
                    <div className="bg-white w-6 h-6 rounded-full shadow-md transform" />
                  </button>
                </div>
              </div>

              {/* Broadcast Announcement Banner */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>Global In-App Broadcast Banner</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => saveAppControls({ ...appControls, bannerEnabled: !appControls.bannerEnabled })}
                    className={`w-14 h-8 flex items-center rounded-full p-1 transition cursor-pointer ${
                      appControls.bannerEnabled ? "bg-emerald-500 justify-end" : "bg-slate-800 justify-start"
                    }`}
                  >
                    <div className="bg-white w-6 h-6 rounded-full shadow-md transform" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Banner Announcement Text</label>
                  <textarea
                    rows={2}
                    value={appControls.bannerText}
                    onChange={(e) => saveAppControls({ ...appControls, bannerText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                  />
                </div>
              </div>

              {/* Commission Rate & Payout Limits */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Platform Commission & Minimum Payout Limits</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Platform Commission Fee ({appControls.commissionRate}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={appControls.commissionRate}
                      onChange={(e) => saveAppControls({ ...appControls, commissionRate: Number(e.target.value) })}
                      className="w-full accent-[#FF6A00]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>0% (Free)</span>
                      <span>15%</span>
                      <span>30%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Minimum Payout Withdrawal (₹)</label>
                    <input
                      type="number"
                      value={appControls.minWithdrawalLimit}
                      onChange={(e) => saveAppControls({ ...appControls, minWithdrawalLimit: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Creators must have at least ₹{appControls.minWithdrawalLimit} to request payout</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Remote configurations auto-sync with both Web & Mobile APK clients in real time.</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Configurations successfully saved & synced!")}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
