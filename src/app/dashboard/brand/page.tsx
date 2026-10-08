"use client";

import { Plus, TrendingUp, Users, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BrandDashboard() {
  const [profileName, setProfileName] = useState("Brand");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Get current logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch their profile name
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
          
        if (profile) setProfileName(profile.name);

        // Fetch their campaigns with applicants count
        const { data: campaignsData } = await supabase
          .from("campaigns")
          .select(`
            *,
            applications(count)
          `)
          .eq("brand_id", user.id)
          .order("created_at", { ascending: false });
          
        if (campaignsData) setCampaigns(campaignsData);
      }
      setLoading(false);
    }
    
    fetchData();
  }, []);

  // Calculate total applicants safely
  const totalApplicants = campaigns.reduce((acc, campaign) => {
    const countData = campaign.applications?.[0]?.count;
    const countNum = typeof countData === 'number' ? countData : 0;
    return acc + countNum;
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {profileName}!</h1>
          <p className="text-gray-500 mt-1">Here is what's happening with your campaigns today.</p>
        </div>
        <Link href="/dashboard/brand/campaigns/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Campaign
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
            <h3 className="text-2xl font-bold text-gray-900">{campaigns.length}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Applicants</p>
            <h3 className="text-2xl font-bold text-gray-900">{loading ? '-' : totalApplicants}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Estimated Reach</p>
            <h3 className="text-2xl font-bold text-gray-900">0</h3>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Recent Campaigns</h2>
          <Link href="/dashboard/brand/campaigns" className="text-blue-600 text-sm font-medium hover:underline">View All</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No campaigns yet. Click "New Campaign" to create one!</div>
          ) : campaigns.map((campaign, i) => {
            const count = campaign.applications?.[0]?.count;
            const applicantsCount = typeof count === 'number' ? count : 0;
            return (
              <div key={i} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition">
                <div>
                  <h3 className="font-semibold text-gray-900">{campaign.title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>{applicantsCount} applicants</span>
                    <span>•</span>
                    <span>₹{campaign.budget}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  campaign.status === "active" ? "bg-green-100 text-green-700" :
                  campaign.status === "completed" ? "bg-gray-100 text-gray-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {campaign.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
