"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Lock, User, Megaphone, Users, ShieldCheck, Camera, Video, Building2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Signup() {
  const router = useRouter();
  const [role, setRole] = useState("influencer");
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanEmail = email.toLowerCase().trim();
      const normRole = role === "influencer" ? "influencer" : "brand";
      const cleanIg = instagram.trim().replace(/^@/, '').toLowerCase();
      const cleanYt = youtube.trim();
      const cleanBrand = brandName.trim().toLowerCase();
      const verificationCode = `WOVZO-${Math.floor(1000 + Math.random() * 9000)}`;
      const displayName = normRole === "brand" ? (brandName.trim() || name.trim() || "Brand") : (name.trim() || "Creator");

      // 1. Check if email already registered locally
      const reg = JSON.parse(localStorage.getItem("wovzo_accounts_registry") || "{}");
      if (reg[cleanEmail]) {
        setError("An account with this email address already exists. Please Sign In instead.");
        setLoading(false);
        return;
      }

      // 2. Prevent same creator from creating multiple accounts with same Instagram handle
      if (normRole === "influencer" && cleanIg) {
        const duplicateIg = Object.values(reg).find((acc: any) => 
          acc.instagram && acc.instagram.toLowerCase().replace('@', '') === cleanIg
        );
        if (duplicateIg) {
          setError(`This Instagram handle (@${cleanIg}) is already registered with an existing account. Multiple accounts are not allowed.`);
          setLoading(false);
          return;
        }

        try {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 1500));
          const { data: existingProfiles }: any = await Promise.race([
            supabase.from('profiles').select('id, name').ilike('instagram', `%${cleanIg}%`).limit(1),
            timeoutPromise
          ]).catch(() => ({ data: null }));

          if (existingProfiles && existingProfiles.length > 0) {
            setError(`This Instagram handle (@${cleanIg}) is already registered with an existing account. Multiple accounts are not allowed.`);
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      // 3. Prevent duplicate brand accounts
      if (normRole === "brand" && cleanBrand.length >= 3) {
        const duplicateBrand = Object.values(reg).find((acc: any) => 
          acc.brand_name && acc.brand_name.toLowerCase() === cleanBrand
        );
        if (duplicateBrand) {
          setError(`A brand named "${brandName.trim()}" is already registered. Duplicate brand accounts are not allowed.`);
          setLoading(false);
          return;
        }

        try {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 1500));
          const { data: existingBrands }: any = await Promise.race([
            supabase.from('profiles').select('id, name').eq('role', 'brand').ilike('name', cleanBrand).limit(1),
            timeoutPromise
          ]).catch(() => ({ data: null }));

          if (existingBrands && existingBrands.length > 0) {
            setError(`A brand named "${brandName.trim()}" is already registered. Duplicate brand accounts are not allowed.`);
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      // 4. Sign up the user in Supabase Auth and pass custom data
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: displayName,
            brand_name: normRole === "brand" ? brandName.trim() : "",
            contact_name: name.trim(),
            role: normRole,
            instagram: cleanIg ? `@${cleanIg}` : "",
            youtube: cleanYt,
            verification_code: verificationCode,
            is_verified: false,
            instagram_verified: false,
            youtube_verified: false,
          }
        }
      });

      if (authError) throw authError;

      // Supabase returns empty identities when user already exists with this email!
      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        setError("An account with this email address already exists. Please Sign In instead.");
        setLoading(false);
        return;
      }

      // Save to local accounts registry only on verified success
      try {
        localStorage.setItem(`wovzo_user_role_${cleanEmail}`, normRole);
        reg[cleanEmail] = {
          role: normRole,
          name: displayName,
          brand_name: normRole === "brand" ? brandName.trim() : "",
          contact_name: name.trim(),
          instagram: cleanIg ? `@${cleanIg}` : "",
          youtube: cleanYt,
          verification_code: verificationCode,
          is_verified: false,
        };
        localStorage.setItem("wovzo_accounts_registry", JSON.stringify(reg));
        localStorage.setItem("wovzo_demo_user", JSON.stringify({
          name: displayName,
          brand_name: normRole === "brand" ? brandName.trim() : "",
          contact_name: name.trim(),
          email: cleanEmail,
          role: normRole,
          instagram: cleanIg ? `@${cleanIg}` : "",
          youtube: cleanYt,
          verification_code: verificationCode,
          is_verified: false,
        }));
        localStorage.removeItem("wovzo_applied_campaigns");
        localStorage.removeItem("wovzo_submitted_applications");
      } catch (_) {}

      // Ensure profile row exists
      if (authData.user) {
        try {
          await supabase.from("profiles").upsert({
            id: authData.user.id,
            name: displayName,
            role: normRole,
            instagram: cleanIg ? `@${cleanIg}` : "",
            youtube: cleanYt,
            verification_code: verificationCode,
            is_verified: false,
          });
        } catch (_) {}
      }

      // Redirect to appropriate dashboard based on role
      if (normRole === "influencer") {
        router.push("/dashboard/creator");
      } else {
        router.push("/dashboard/brand");
      }
    } catch (err: any) {
      console.warn("Signup error, checking fallback:", err);
      const errLower = (err.message || "").toLowerCase();

      // Check if error is about already registered / duplicate account
      if (errLower.includes("already registered") || 
          errLower.includes("already exists") || 
          errLower.includes("user_already_exists") ||
          errLower.includes("unique constraint")) {
        setError("An account with this email address already exists. Please Sign In instead.");
        setLoading(false);
        return;
      }

      const isNetworkOrFetch = 
        err.message?.toLowerCase().includes("fetch") ||
        err.message?.toLowerCase().includes("network") ||
        err.message?.toLowerCase().includes("failed to fetch") ||
        err.name === "TypeError";

      if (isNetworkOrFetch) {
        const cleanEmail = email.toLowerCase().trim();
        const normRole = role === "influencer" ? "influencer" : "brand";
        const cleanIg = instagram.trim().replace(/^@/, '').toLowerCase();
        const cleanYt = youtube.trim();
        const verificationCode = `WOVZO-${Math.floor(1000 + Math.random() * 9000)}`;
        const displayName = normRole === "brand" ? (brandName.trim() || name.trim() || "Brand") : (name.trim() || "Creator");
        
        const reg = JSON.parse(localStorage.getItem("wovzo_accounts_registry") || "{}");
        if (reg[cleanEmail]) {
          setError("An account with this email address already exists. Please Sign In instead.");
          setLoading(false);
          return;
        }

        try {
          localStorage.setItem(`wovzo_user_role_${cleanEmail}`, normRole);
          reg[cleanEmail] = {
            role: normRole,
            name: displayName,
            brand_name: normRole === "brand" ? brandName.trim() : "",
            contact_name: name.trim(),
            instagram: cleanIg ? `@${cleanIg}` : "",
            youtube: cleanYt,
            verification_code: verificationCode,
            is_verified: false,
          };
          localStorage.setItem("wovzo_accounts_registry", JSON.stringify(reg));
          localStorage.setItem("wovzo_demo_user", JSON.stringify({
            name: displayName,
            brand_name: normRole === "brand" ? brandName.trim() : "",
            contact_name: name.trim(),
            email: cleanEmail,
            role: normRole,
            instagram: cleanIg ? `@${cleanIg}` : "",
            youtube: cleanYt,
            verification_code: verificationCode,
            is_verified: false,
          }));
          localStorage.removeItem("wovzo_applied_campaigns");
          localStorage.removeItem("wovzo_submitted_applications");
        } catch (_) {}
        router.push(normRole === "influencer" ? "/dashboard/creator" : "/dashboard/brand");
        return;
      }
      setError(err.message || "An error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-[family-name:var(--font-geist-sans)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center items-center mb-2">
          <img src="/collab/logo.png" alt="Wovzo" className="h-10 object-contain" />
        </Link>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#FF6A00] hover:text-[#E55A00] transition">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-orange-500/5 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSignup}>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-4">
                <label className="relative cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-3 shadow-sm flex items-center gap-3 hover:bg-gray-50 has-[:checked]:border-[#FF6A00] has-[:checked]:bg-orange-50 has-[:checked]:ring-1 has-[:checked]:ring-[#FF6A00] transition">
                  <input type="radio" name="role" value="influencer" checked={role === "influencer"} onChange={() => setRole("influencer")} className="sr-only" />
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Creator</span>
                </label>
                <label className="relative cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-3 shadow-sm flex items-center gap-3 hover:bg-gray-50 has-[:checked]:border-[#FF6A00] has-[:checked]:bg-orange-50 has-[:checked]:ring-1 has-[:checked]:ring-[#FF6A00] transition">
                  <input type="radio" name="role" value="brand" checked={role === "brand"} onChange={() => setRole("brand")} className="sr-only" />
                  <Megaphone className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Brand</span>
                </label>
              </div>
            </div>

            {role === "influencer" ? (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FF6A00] focus:border-[#FF6A00] sm:text-sm transition"
                    placeholder="e.g. Asraf Ali"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="brandName" className="block text-sm font-medium text-gray-700">
                    Brand / Company Name
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="brandName"
                      type="text"
                      required
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="appearance-none block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FF6A00] focus:border-[#FF6A00] sm:text-sm transition"
                      placeholder="e.g. FabIndia, boAt Lifestyle"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                    Your Full Name (Brand Manager / Founder)
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="contactName"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="appearance-none block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FF6A00] focus:border-[#FF6A00] sm:text-sm transition"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FF6A00] focus:border-[#FF6A00] sm:text-sm transition"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FF6A00] focus:border-[#FF6A00] sm:text-sm transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {role === "influencer" && (
              <div className="p-4 bg-orange-50/70 border border-orange-200/80 rounded-2xl space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#FF6A00] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-[#FF6A00]" />
                  <span>Creator Social Channels (For Verified Badge)</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Enter your handles to link your profile. You will receive a unique <span className="font-semibold text-gray-800">Bio Verification Code</span> (WOVZO-XXXX) to instantly verify ownership and earn the <strong>Verified Blue Badge</strong>!
                </p>

                <div>
                  <label htmlFor="instagram" className="block text-xs font-semibold text-gray-700 mb-1">
                    Instagram Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Camera className="h-4 w-4 text-pink-500" />
                    </div>
                    <input
                      id="instagram"
                      type="text"
                      required
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="appearance-none block w-full pl-9 px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FF6A00] focus:border-[#FF6A00] text-xs transition bg-white"
                      placeholder="@yourhandle (e.g. @asrafgiimi)"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="youtube" className="block text-xs font-semibold text-gray-700 mb-1">
                    YouTube Channel / Handle (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Video className="h-4 w-4 text-red-500" />
                    </div>
                    <input
                      id="youtube"
                      type="text"
                      value={youtube}
                      onChange={(e) => setYoutube(e.target.value)}
                      className="appearance-none block w-full pl-9 px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FF6A00] focus:border-[#FF6A00] text-xs transition bg-white"
                      placeholder="@channel or youtube.com/@channel"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md shadow-orange-500/20 text-sm font-semibold text-white bg-[#FF6A00] hover:bg-[#E55A00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6A00] transition disabled:opacity-50"
              >
                {loading ? "Creating Account..." : "Create Account"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
