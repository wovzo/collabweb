"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  X, 
  RotateCcw, 
  Check, 
  Eye, 
  MessageSquare, 
  Sparkles,
  FileText
} from "lucide-react";

interface Application {
  id: string;
  status: "pending" | "accepted" | "rejected" | "submitted" | "revision_requested" | "completed";
  pitch?: string;
  submission_url?: string;
  submission_notes?: string;
  revision_notes?: string;
  submitted_at?: string;
  completed_at?: string;
  created_at: string;
  profiles?: {
    id: string;
    name: string;
    avatar_url?: string;
    instagram?: string;
    youtube?: string;
    niche?: string;
  };
  campaigns?: {
    id: string;
    title: string;
    budget?: string | number;
    requirements?: string;
  };
}

export default function InfluencersPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "deliverables" | "pending" | "completed">("all");

  // Revision modal state
  const [revisionApp, setRevisionApp] = useState<Application | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicants();
  }, []);

  async function fetchApplicants() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch campaigns owned by this brand
      const { data: myCampaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("brand_id", user.id);

      if (!myCampaigns || myCampaigns.length === 0) {
        setLoading(false);
        return;
      }

      const myCampaignIds = myCampaigns.map(c => c.id);

      // 2. Fetch applications
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          pitch,
          submission_url,
          submission_notes,
          revision_notes,
          submitted_at,
          completed_at,
          created_at,
          profiles:influencer_id (id, name, avatar_url, instagram, youtube, niche),
          campaigns:campaign_id (id, title, budget, requirements)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback in case new columns are not yet in Supabase
        console.warn("Full fetch failed, attempting fallback query:", error);
        const { data: fallbackData } = await supabase
          .from("applications")
          .select(`
            id,
            status,
            created_at,
            profiles:influencer_id (name, id),
            campaigns:campaign_id (title, id)
          `)
          .order("created_at", { ascending: false });

        if (fallbackData) {
          const filtered = (fallbackData as any[]).filter(app => {
            const cId = Array.isArray(app.campaigns) ? app.campaigns[0]?.id : app.campaigns?.id;
            return myCampaignIds.includes(cId);
          });
          setApplications(filtered);
        }
      } else if (data) {
        const filtered = (data as any[]).filter(app => {
          const cId = Array.isArray(app.campaigns) ? app.campaigns[0]?.id : app.campaigns?.id;
          return myCampaignIds.includes(cId);
        });
        setApplications(filtered);
      }
    } catch (err) {
      console.error("Error fetching applicants:", err);
    } finally {
      setLoading(false);
    }
  }

  // Update status (e.g. accept / reject initial application)
  const updateStatus = async (appId: string, newStatus: string) => {
    setProcessingId(appId);
    try {
      await supabase.from("applications").update({ status: newStatus }).eq("id", appId);
      setApplications(apps =>
        apps.map(app => (app.id === appId ? { ...app, status: newStatus as any } : app))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setProcessingId(null);
    }
  };

  // Approve deliverable proof
  const handleApproveDeliverable = async (appId: string) => {
    setProcessingId(appId);
    try {
      const payload: any = {
        status: "completed",
        completed_at: new Date().toISOString()
      };
      const { error } = await supabase.from("applications").update(payload).eq("id", appId);
      if (error) {
        await supabase.from("applications").update({ status: "completed" }).eq("id", appId);
      }

      setApplications(apps =>
        apps.map(app =>
          app.id === appId
            ? { ...app, status: "completed", completed_at: new Date().toISOString() }
            : app
        )
      );
    } catch (err) {
      console.error("Failed to approve deliverable:", err);
    } finally {
      setProcessingId(null);
    }
  };

  // Request revision
  const handleRequestRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionApp) return;

    setProcessingId(revisionApp.id);
    try {
      const payload: any = {
        status: "revision_requested",
        revision_notes: revisionFeedback.trim()
      };

      const { error } = await supabase.from("applications").update(payload).eq("id", revisionApp.id);
      if (error) {
        await supabase.from("applications").update({ status: "revision_requested" }).eq("id", revisionApp.id);
      }

      setApplications(apps =>
        apps.map(app =>
          app.id === revisionApp.id
            ? { ...app, status: "revision_requested", revision_notes: revisionFeedback.trim() }
            : app
        )
      );
      setRevisionApp(null);
    } catch (err) {
      console.error("Failed to request revision:", err);
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered views
  const filteredApps = applications.filter(app => {
    if (activeTab === "deliverables") return app.status === "submitted";
    if (activeTab === "pending") return app.status === "pending";
    if (activeTab === "completed") return app.status === "completed";
    return true;
  });

  const deliverablesCount = applications.filter(a => a.status === "submitted").length;
  const pendingCount = applications.filter(a => a.status === "pending").length;

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[#FF6A00] border-t-transparent rounded-full animate-spin"></div>
        <p>Loading influencer applications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Influencer Applications & Deliverables</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review creator pitches, manage approvals, and inspect submitted live campaign proofs.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-sm font-medium">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "all"
                ? "bg-white text-gray-900 shadow-sm font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab("deliverables")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "deliverables"
                ? "bg-[#FF6A00] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Review Proofs
            {deliverablesCount > 0 && (
              <span className={`px-1.5 py-0.2 text-xs rounded-full ${activeTab === "deliverables" ? "bg-white text-[#FF6A00]" : "bg-[#FF6A00] text-white"}`}>
                {deliverablesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-white text-gray-900 shadow-sm font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Pending
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 text-xs rounded-full bg-amber-100 text-amber-800">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "completed"
                ? "bg-white text-gray-900 shadow-sm font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApps.map(app => {
          const profile = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles;
          const campaign = Array.isArray(app.campaigns) ? app.campaigns[0] : app.campaigns;
          const influencerName = profile?.name || "Creator";
          const isSubmitted = app.status === "submitted";

          return (
            <div
              key={app.id}
              className={`bg-white rounded-2xl border p-6 shadow-sm transition ${
                isSubmitted ? "border-orange-300 ring-2 ring-orange-400/20 shadow-md" : "border-gray-100 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                {/* Influencer & Campaign info */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-[#FF6A00] border border-orange-200 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                    {influencerName[0]?.toUpperCase() || "C"}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">{influencerName}</h3>
                      {profile?.niche && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                          {profile.niche}
                        </span>
                      )}
                      {profile?.instagram && (
                        <a
                          href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-pink-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          📷 {profile.instagram}
                        </a>
                      )}
                    </div>

                    <p className="text-sm text-gray-600">
                      Applied for: <span className="font-semibold text-gray-900">{campaign?.title || "Campaign"}</span>
                      {campaign?.budget && (
                        <span className="text-green-600 font-semibold ml-2">
                          (₹{campaign.budget})
                        </span>
                      )}
                    </p>

                    <p className="text-xs text-gray-400">
                      Applied on {new Date(app.created_at).toLocaleDateString()}
                    </p>

                    {/* Pitch Snippet */}
                    {app.pitch && (
                      <div className="mt-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700 max-w-2xl">
                        💬 <strong className="text-gray-900">Creator's Pitch:</strong> "{app.pitch}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {/* Status Badges */}
                  {app.status === "pending" && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Approval
                    </span>
                  )}

                  {app.status === "accepted" && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Accepted • Waiting for Creator Post
                    </span>
                  )}

                  {app.status === "submitted" && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FF6A00] text-white flex items-center gap-1.5 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      Deliverable Needs Review
                    </span>
                  )}

                  {app.status === "revision_requested" && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Revision Requested
                    </span>
                  )}

                  {app.status === "completed" && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed & Approved 🎉
                    </span>
                  )}

                  {app.status === "rejected" && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                      Rejected
                    </span>
                  )}

                  {/* Actions for Pending */}
                  {app.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStatus(app.id, "accepted")}
                        disabled={processingId === app.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => updateStatus(app.id, "rejected")}
                        disabled={processingId === app.id}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-semibold transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Actions for Deliverable Submitted */}
                  {app.status === "submitted" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveDeliverable(app.id)}
                        disabled={processingId === app.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Deliverable
                      </button>
                      <button
                        onClick={() => {
                          setRevisionApp(app);
                          setRevisionFeedback("");
                        }}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Request Revision
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submitted Deliverable Card (When status is submitted or completed) */}
              {(app.submission_url || app.submission_notes) && (
                <div className="mt-4 p-4 bg-orange-50/60 rounded-xl border border-orange-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#FF6A00]">
                        Submitted Content Proof
                      </span>
                      {app.submitted_at && (
                        <span className="text-xs text-gray-500">
                          • {new Date(app.submitted_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {app.submission_notes && (
                      <p className="text-xs text-gray-700">
                        <strong className="text-gray-900">Creator Note:</strong> {app.submission_notes}
                      </p>
                    )}
                  </div>

                  {app.submission_url && (
                    <a
                      href={app.submission_url.startsWith("http") ? app.submission_url : `https://${app.submission_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white hover:bg-gray-50 text-[#FF6A00] border border-[#FF6A00]/30 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Open Live Post <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Revision note history if requested */}
              {app.status === "revision_requested" && app.revision_notes && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-red-900">Your Revision Feedback:</strong> {app.revision_notes}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredApps.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 space-y-3">
            <div className="w-12 h-12 bg-orange-50 text-[#FF6A00] rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">No applications in this view</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {activeTab === "deliverables"
                ? "No creators have submitted content proofs awaiting your review right now."
                : activeTab === "pending"
                ? "All applications have been reviewed! New applicants will show up here."
                : "No applications found."}
            </p>
          </div>
        )}
      </div>

      {/* Revision Request Dialog */}
      {revisionApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Request Content Changes
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  Revision for {Array.isArray(revisionApp.profiles) ? revisionApp.profiles[0]?.name : revisionApp.profiles?.name}
                </h3>
              </div>
              <button
                onClick={() => setRevisionApp(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestRevisionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Feedback / Revision Instructions <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Explain clearly what needs to be changed before you can approve (e.g. tag correct handle, fix caption, re-shoot video).
                </p>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Please tag @wovzocollab in the first 3 seconds of the reel and include the 20% discount coupon in your caption."
                  value={revisionFeedback}
                  onChange={e => setRevisionFeedback(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevisionApp(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === revisionApp.id}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-orange-500/20"
                >
                  Send Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
