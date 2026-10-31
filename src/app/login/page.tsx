"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Lock, Megaphone, Sparkles, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState<"brand" | "influencer">("brand");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.toLowerCase().trim();
    const selectedNormRole = role === "influencer" ? "influencer" : "brand";

    // Check local registry first
    let localRegisteredRole: string | null = null;
    try {
      const reg = JSON.parse(localStorage.getItem("wovzo_accounts_registry") || "{}");
      if (reg[cleanEmail]?.role) {
        localRegisteredRole = reg[cleanEmail].role;
      }
      if (!localRegisteredRole) {
        localRegisteredRole = localStorage.getItem(`wovzo_user_role_${cleanEmail}`);
      }
    } catch (_) {}

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Fetch registered role from Supabase DB profiles first, then user_metadata, then local
        let registeredRole: string | null = null;

        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profile?.role) {
            registeredRole = profile.role;
          }
        } catch (_) {}

        if (!registeredRole && data.user.user_metadata?.role) {
          registeredRole = data.user.user_metadata.role;
        }

        if (!registeredRole && localRegisteredRole) {
          registeredRole = localRegisteredRole;
        }

        // Normalize registered role
        let normRegistered = "brand";
        if (registeredRole) {
          const lower = registeredRole.toLowerCase();
          normRegistered = (lower === "influencer" || lower === "creator") ? "influencer" : "brand";
        } else {
          // If completely new user with no role record anywhere, assign selected role
          normRegistered = selectedNormRole;
          try {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              name: data.user.user_metadata?.name || (selectedNormRole === "brand" ? "Brand" : "Creator"),
              role: selectedNormRole,
            });
          } catch (_) {}
        }

        // STRICT ROLE CHECK: Creator cannot sign in as Brand, Brand cannot sign in as Creator!
        if (normRegistered !== selectedNormRole) {
          await supabase.auth.signOut();
          const targetName = normRegistered === "influencer" ? "Creator" : "Brand";
          const currentName = selectedNormRole === "influencer" ? "Creator" : "Brand";
          setError(`Access Denied: This account is registered as a ${targetName}. You selected '${currentName}'. Please click '${targetName}' above to sign in.`);
          setLoading(false);
          return;
        }

        // Save matched role locally
        try {
          localStorage.setItem(`wovzo_user_role_${cleanEmail}`, normRegistered);
          const reg = JSON.parse(localStorage.getItem("wovzo_accounts_registry") || "{}");
          reg[cleanEmail] = { role: normRegistered };
          localStorage.setItem("wovzo_accounts_registry", JSON.stringify(reg));
        } catch (_) {}

        if (normRegistered === "influencer") {
          router.push("/dashboard/creator");
        } else {
          router.push("/dashboard/brand");
        }
      }
    } catch (err: any) {
      console.warn("Login auth error:", err);
      const isNetworkOrFetch = 
        err.message?.toLowerCase().includes("fetch") ||
        err.message?.toLowerCase().includes("network") ||
        err.message?.toLowerCase().includes("failed to fetch") ||
        err.name === "TypeError";

      if (isNetworkOrFetch) {
        // Offline / Supabase paused fallback
        // Even offline, STRICTLY check local account role
        if (localRegisteredRole) {
          const normLocal = (localRegisteredRole.toLowerCase() === "influencer" || localRegisteredRole.toLowerCase() === "creator") ? "influencer" : "brand";
          if (normLocal !== selectedNormRole) {
            const targetName = normLocal === "influencer" ? "Creator" : "Brand";
            const currentName = selectedNormRole === "influencer" ? "Creator" : "Brand";
            setError(`Access Denied: This account is registered as a ${targetName}. You selected '${currentName}'. Please click '${targetName}' above to sign in.`);
            setLoading(false);
            return;
          }
        }

        // Save for demo
        try {
          localStorage.setItem(`wovzo_user_role_${cleanEmail}`, selectedNormRole);
          const reg = JSON.parse(localStorage.getItem("wovzo_accounts_registry") || "{}");
          reg[cleanEmail] = { role: selectedNormRole };
          localStorage.setItem("wovzo_accounts_registry", JSON.stringify(reg));
          localStorage.setItem("wovzo_demo_user", JSON.stringify({
            email: cleanEmail,
            role: selectedNormRole
          }));
        } catch (_) {}

        router.push(selectedNormRole === "influencer" ? "/dashboard/creator" : "/dashboard/brand");
        return;
      }
      setError(err.message || "Failed to log in.");
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
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/signup" className="font-semibold text-[#FF6A00] hover:text-[#E55A00] transition">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-orange-500/5 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Sign in as
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setRole("brand"); setError(null); }}
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition cursor-pointer ${
                    role === "brand"
                      ? "border-[#FF6A00] bg-orange-50 text-[#FF6A00] shadow-sm ring-1 ring-[#FF6A00]"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Brand</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole("influencer"); setError(null); }}
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition cursor-pointer ${
                    role === "influencer"
                      ? "border-[#FF6A00] bg-orange-50 text-[#FF6A00] shadow-sm ring-1 ring-[#FF6A00]"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Creator</span>
                </button>
              </div>
            </div>

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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FF6A00] focus:border-[#FF6A00] sm:text-sm transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#FF6A00] focus:ring-[#FF6A00] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-[#FF6A00] hover:text-[#E55A00] transition">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md shadow-orange-500/20 text-sm font-semibold text-white bg-[#FF6A00] hover:bg-[#E55A00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6A00] transition cursor-pointer disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>

            {/* Instant Demo Access Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => router.push(role === "influencer" ? "/dashboard/creator" : "/dashboard/brand")}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-gray-300 hover:border-[#FF6A00] hover:bg-orange-50 text-gray-700 hover:text-[#FF6A00] text-xs font-semibold transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
                Explore {role === "brand" ? "Brand" : "Creator"} Dashboard (Instant Demo)
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <a
                  href="#"
                  className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <span className="sr-only">Sign in with Google</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </a>
              </div>
              <div>
                <a
                  href="#"
                  className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <span className="sr-only">Sign in with Apple</span>
                  <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400 font-semibold tracking-wider">Instant Test Demo</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/brand")}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Megaphone className="w-3.5 h-3.5 text-[#FF6A00]" /> Sign in as Brand
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/creator")}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#FF6A00]" /> Sign in as Creator
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
