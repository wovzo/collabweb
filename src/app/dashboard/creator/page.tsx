"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CreatorDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedCampaigns, setAppliedCampaigns] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setProfile(profileData);

      // Fetch active campaigns with brand details
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*, profiles(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setCampaigns(campaignsData || []);

      // Fetch already applied campaigns
      const { data: applicationsData } = await supabase
        .from("applications")
        .select("campaign_id")
        .eq("influencer_id", user.id);
        
      if (applicationsData) {
        setAppliedCampaigns(applicationsData.map(a => a.campaign_id));
      }

    } catch (error) {
      console.error("Error fetching creator data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (campaignId: string) => {
    if (!profile) return;
    
    setApplying(campaignId);
    try {
      const { error } = await supabase.from("applications").insert({
        campaign_id: campaignId,
        influencer_id: profile.id,
      });

      if (error) {
        if (error.code === '23505') {
          alert("You have already applied to this campaign!");
        } else {
          throw error;
        }
      } else {
        setAppliedCampaigns([...appliedCampaigns, campaignId]);
        alert("Successfully applied!");
      }
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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome back, {profile?.name || "Creator"}!
      </h1>
      <p className="text-gray-600 mb-8">Discover and apply for your next brand collaboration.</p>

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
              <div key={campaign.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-[#FF6A00] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full uppercase">
                      {campaign.platform}
                    </span>
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
                    className={`w-full py-2.5 rounded-lg font-medium transition ${
                      hasApplied 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-[#FF6A00] text-white hover:bg-[#E55A00] shadow-sm shadow-orange-500/20'
                    } disabled:opacity-70`}
                  >
                    {applying === campaign.id 
                      ? "Applying..." 
                      : hasApplied 
                        ? "Applied ✓" 
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
