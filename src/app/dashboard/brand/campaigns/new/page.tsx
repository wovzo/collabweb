"use client";

import { ArrowLeft, Save, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewCampaign() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    niche: "Fashion & Lifestyle",
    minFollowers: "Any",
    budget: "",
    deadline: "",
  });

  const [deliverables, setDeliverables] = useState<string[]>([]);

  const handleCheckboxChange = (item: string) => {
    setDeliverables(prev => 
      prev.includes(item) 
        ? prev.filter(d => d !== item)
        : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent, status: "active" | "draft" = "active") => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to create a campaign.");

      const requirementsString = [
        `Niche: ${formData.niche}`,
        `Min Followers: ${formData.minFollowers}`,
        `Deliverables: ${deliverables.length > 0 ? deliverables.join(", ") : "None specified"}`
      ].join(" • ");

      const { error: insertError } = await supabase
        .from("campaigns")
        .insert([{
          brand_id: user.id,
          title: formData.title,
          description: formData.description,
          budget: formData.budget.toString(),
          requirements: requirementsString,
          status: status
        }]);

      if (insertError) throw insertError;

      router.push("/dashboard/brand");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/brand" className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
          <p className="text-gray-500 text-sm mt-1">Fill in the details to find the perfect influencers.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <form className="p-6 md:p-8 space-y-8" onSubmit={(e) => handleSubmit(e, "active")}>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Section 1: Basic Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">1. Basic Details</h2>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Campaign Title <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Summer Sneaker Launch 2026" 
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Product / Service Description</label>
              <textarea 
                rows={4} 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Describe what you are promoting..." 
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
              ></textarea>
            </div>
          </div>

          {/* Section 2: Requirements */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">2. Influencer Requirements</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Category / Niche</label>
                <select 
                  value={formData.niche}
                  onChange={e => setFormData({...formData, niche: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                >
                  <option>Fashion & Lifestyle</option>
                  <option>Tech & Gadgets</option>
                  <option>Food & Beverage</option>
                  <option>Gaming</option>
                  <option>Fitness</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Minimum Followers</label>
                <select 
                  value={formData.minFollowers}
                  onChange={e => setFormData({...formData, minFollowers: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                >
                  <option>Any (Nano influencers)</option>
                  <option>10k+ (Micro influencers)</option>
                  <option>50k+ (Mid-tier influencers)</option>
                  <option>100k+ (Macro influencers)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Deliverables</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {['1 Reel', '2 Stories', '1 YouTube Post', '1 Tweet'].map(item => (
                  <label key={item} className="flex items-center gap-2 border border-gray-200 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input 
                      type="checkbox" 
                      checked={deliverables.includes(item)}
                      onChange={() => handleCheckboxChange(item)}
                      className="rounded text-blue-600 focus:ring-blue-500" 
                    />
                    <span className="text-sm text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Budget & Timeline */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">3. Budget & Timeline</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Budget (₹)</label>
                <input 
                  type="number" 
                  required
                  value={formData.budget}
                  onChange={e => setFormData({...formData, budget: e.target.value})}
                  placeholder="50000" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Deadline to Apply</label>
                <input 
                  type="date" 
                  value={formData.deadline}
                  onChange={e => setFormData({...formData, deadline: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition" 
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end items-center gap-4">
            <button 
              type="button" 
              onClick={(e) => handleSubmit(e, "draft")}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save as Draft
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> 
              {loading ? "Publishing..." : "Publish Campaign"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
