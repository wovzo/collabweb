"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CreatorDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedCampaigns, setAppliedCampaigns] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      let initialVerified = false;
      let initialCode = "";
      try {
        const demo = JSON.parse(localStorage.getItem('wovzo_demo_user') || '{}');
        if (demo.is_verified) initialVerified = true;
        if (demo.verification_code) initialCode = demo.verification_code;
      } catch (_) {}

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsVerified(initialVerified);
        setVerificationCode(initialCode);
        return;
      }

      if (user.user_metadata?.is_verified || user.user_metadata?.instagram_verified) {
        initialVerified = true;
      }
      if (user.user_metadata?.verification_code) {
        initialCode = user.user_metadata.verification_code;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        if (profileData.is_verified) initialVerified = true;
        if (profileData.verification_code) initialCode = profileData.verification_code;
      } else {
        setProfile({ name: user.user_metadata?.name || "Creator" });
      }

      setIsVerified(initialVerified);
      setVerificationCode(initialCode || "WOVZO-4921");

      // Fetch active campaigns with brand details
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*, profiles(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setCampaigns(campaignsData || []);

      // Load cached applied campaigns (resilient offline/demo)
      let initialApplied: string[] = [];
      try {
        const cached = JSON.parse(localStorage.getItem('wovzo_applied_campaigns') || '[]');
        if (Array.isArray(cached) && cached.length > 0) {
          initialApplied = cached;
          setAppliedCampaigns(cached);
        }
      } catch (_) {}

      // Fetch already applied campaigns from Supabase
      if (user) {
        const { data: applicationsData } = await supabase
          .from("applications")
          .select("campaign_id")
          .eq("influencer_id", user.id);
          
        if (applicationsData) {
          const dbIds = applicationsData.map(a => a.campaign_id);
          const merged = Array.from(new Set([...initialApplied, ...dbIds]));
          setAppliedCampaigns(merged);
          try { localStorage.setItem('wovzo_applied_campaigns', JSON.stringify(merged)); } catch (_) {}
        }
      }

    } catch (error) {
      console.error("Error fetching creator data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (campaignId: string) => {
    if (appliedCampaigns.includes(campaignId)) {
      alert("You have already applied to this campaign!");
      return;
    }
    
    setApplying(campaignId);
    try {
      if (profile?.id) {
        const { error } = await supabase.from("applications").insert({
          campaign_id: campaignId,
          influencer_id: profile.id,
        });

        if (error && error.code !== '23505') {
          console.warn("Error inserting application:", error);
        }
      }

      const updated = Array.from(new Set([...appliedCampaigns, campaignId]));
      setAppliedCampaigns(updated);
      try { localStorage.setItem('wovzo_applied_campaigns', JSON.stringify(updated)); } catch (_) {}
      alert("Successfully applied to campaign!");
    } catch (error: any) {
      alert(error.message || "Failed to apply.");
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {profile?.name || "Creator"}!
            </h1>
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-600 border border-sky-200 shadow-sm">
                <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500" />
                <span>Verified Creator</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <span>Bio Code Pending</span>
              </span>
            )}
          </div>
          <p className="text-gray-600 text-sm mt-1">Discover and apply for your next high-paying brand collaboration.</p>
        </div>

        <Link
          href="/dashboard/creator/settings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-xs transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
          <span>Manage Profile & Bio Code</span>
        </Link>
      </div>

      {/* Bio Verification Callout if not verified */}
      {!isVerified && (
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50/50 to-orange-50/30 border border-orange-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#FF6A00] text-white shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">Get Your Official Creator Verified Badge</h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-[#FF6A00] text-white rounded">2 Min Quick Bio Check</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Paste your secret code <code className="font-mono font-bold text-[#FF6A00] bg-white px-1.5 py-0.5 rounded border border-orange-200">{verificationCode}</code> into your Instagram bio to verify ownership and stand out to Brands!
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/creator/settings"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF6A00] hover:bg-[#E55A00] text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <span>Verify Bio Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-900 mb-4">Trending Campaigns</h2>
      
      {campaigns.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
          <p className="text-gray-500">No active campaigns available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => {
            const hasApplied = appliedCampaigns.includes(campaign.id);
            
            return (
              <div 
                key={campaign.id} 
                className={`bg-white p-6 rounded-2xl border shadow-xs flex flex-col justify-between transition duration-200 ${
                  hasApplied ? 'border-emerald-200/80 bg-emerald-50/10' : 'border-gray-200 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[#FF6A00] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full uppercase">
                          {campaign.platform}
                        </span>
                        {hasApplied && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                            ✓ Already Applied
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mt-2">{campaign.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">By {campaign.profiles?.name || "Unknown Brand"}</p>
                    </div>
                    <div className="w-10 h-10 bg-black text-[#FF6A00] rounded-full flex items-center justify-center font-bold">
                      {(campaign.profiles?.name || "B")[0].toUpperCase()}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {campaign.description}
                  </p>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="font-bold text-gray-900">₹{campaign.budget}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleApply(campaign.id)}
                    disabled={hasApplied || applying === campaign.id}
                    className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                      hasApplied 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed shadow-none' 
                        : 'bg-[#FF6A00] text-white hover:bg-[#E55A00] shadow-sm shadow-orange-500/20 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    {applying === campaign.id 
                      ? "Applying..." 
                      : hasApplied 
                        ? "✓ Already Applied" 
                        : "Apply Now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
