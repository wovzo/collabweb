"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ExternalLink, 
  BadgeCheck, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ShieldCheck 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  createSocialVerificationChallenge, 
  verifySocialOwnership, 
  validateRegistrationChallenge,
  getStoredActiveChallenge,
  persistActiveChallenge,
  clearActiveChallenge,
  VerificationChallenge 
} from "@/lib/verifyBio";

export default function Signup() {
  const router = useRouter();

  // Wizard Step: 1 = Choose Platform & Handle, 2 = Verify Ownership in Bio, 3 = Account Details
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [role, setRole] = useState<"influencer" | "brand">("influencer");
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "youtube">("instagram");
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Verification State
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedHandle, setVerifiedHandle] = useState("");
  const [verifiedPlatformAccountId, setVerifiedPlatformAccountId] = useState("");
  const [copied, setCopied] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    'waiting' | 'checking' | 'verified' | 'code_not_found' | 'api_unavailable' | 'expired'
  >('waiting');
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds

  // Final Submit State
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // PERSISTENCE ON PAGE REFRESH: Restore active challenge from localStorage
  useEffect(() => {
    const stored = getStoredActiveChallenge();
    if (stored) {
      setChallenge(stored);
      setHandle(stored.handle);
      setSelectedPlatform(stored.platform);
      if (stored.accountType) setRole(stored.accountType === 'brand' ? 'brand' : 'influencer');
      setTimeLeft(stored.expiresInSeconds);
      if (stored.status === 'verified') {
        setIsVerified(true);
        setVerifiedHandle(stored.handle);
        setStep(3);
      } else {
        setStep(2);
      }
    }
  }, []);

  // Timer countdown for challenge
  useEffect(() => {
    if (step === 2 && timeLeft > 0 && !isVerified) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setVerificationStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft, isVerified]);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Step 1 -> Step 2: Generate or retrieve active verification challenge
  const handleStartVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    const cleanHandle = handle.trim().replace(/^@+/, '');

    if (!cleanHandle) {
      setVerifyError(`Please enter your valid ${selectedPlatform === 'instagram' ? 'Instagram username' : 'YouTube channel handle'}.`);
      return;
    }

    setVerifying(true);
    // Reuse existing challenge if active; do not mutate code!
    const res = await createSocialVerificationChallenge(
      selectedPlatform,
      cleanHandle,
      role === 'brand' ? 'brand' : 'creator',
      false
    );
    setVerifying(false);

    if (res.success && res.challenge) {
      setChallenge(res.challenge);
      setTimeLeft(res.challenge.expiresInSeconds || 1800);
      setVerificationStatus('waiting');
      setStep(2);
    } else {
      setVerifyError(res.error || 'Failed to initialize verification challenge. Please try again.');
    }
  };

  // Explicitly regenerate a new code only on request
  const handleRegenerateCode = async () => {
    if (!challenge) return;
    setVerifying(true);
    setVerifyError(null);
    const res = await createSocialVerificationChallenge(
      challenge.platform,
      challenge.handle,
      role === 'brand' ? 'brand' : 'creator',
      true // force new code
    );
    setVerifying(false);
    if (res.success && res.challenge) {
      setChallenge(res.challenge);
      setTimeLeft(1800);
      setVerificationStatus('waiting');
    } else {
      setVerifyError(res.error || 'Could not regenerate code. Please try again.');
    }
  };

  // Step 2: Check Bio Verification with exact error state classification
  const handleVerifyNow = async () => {
    if (!challenge) return;
    setVerifying(true);
    setVerificationStatus('checking');
    setVerifyError(null);

    const res = await verifySocialOwnership(
      challenge.challengeId,
      challenge.platform,
      challenge.handle,
      challenge.verificationCode
    );
    setVerifying(false);

    if (res.verified) {
      setIsVerified(true);
      setVerificationStatus('verified');
      setVerifiedHandle(challenge.handle);
      setVerifiedPlatformAccountId(res.platformAccountId || `${challenge.platform}_${challenge.handle}`);
      setStep(3);
    } else {
      if (res.status === 'api_unavailable') {
        setVerificationStatus('api_unavailable');
      } else if (res.status === 'expired') {
        setVerificationStatus('expired');
      } else {
        setVerificationStatus('code_not_found');
      }
      setVerifyError(
        res.message || 
        `Verification code ${challenge.verificationCode} was not found in your ${challenge.platform === 'instagram' ? 'Instagram Bio' : 'YouTube Channel Description'}. Please make sure you saved your profile and try again.`
      );
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!challenge) return;
    navigator.clipboard.writeText(challenge.verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Step 3: Final Account Registration (MANDATORY SERVER CHECK)
  const handleFinalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // CRITICAL SECURITY ENFORCEMENT: Block if not verified
    if (!isVerified || !challenge) {
      setSubmitError("Mandatory social media ownership verification required. Please verify your Instagram or YouTube account first.");
      setStep(1);
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      const normRole = role === "brand" ? "brand" : "influencer";
      const cleanIg = selectedPlatform === "instagram" ? verifiedHandle : "";
      const cleanYt = selectedPlatform === "youtube" ? verifiedHandle : "";
      const displayName = normRole === "brand" ? (brandName.trim() || name.trim() || "Brand") : (name.trim() || "Creator");

      // 1. Server-side challenge validation check
      const validation = await validateRegistrationChallenge(
        challenge.challengeId,
        challenge.platform,
        verifiedHandle,
        normRole === 'brand' ? 'brand' : 'creator'
      );

      if (!validation.allowed) {
        setSubmitError(validation.error || "Verification challenge invalid or expired. Please re-verify your social profile.");
        setLoading(false);
        return;
      }

      // 2. Prevent duplicate social account linking locally
      const reg = JSON.parse(localStorage.getItem("wovzo_accounts_registry") || "{}");
      if (reg[cleanEmail]) {
        setSubmitError("An account with this email address already exists. Please Sign In instead.");
        setLoading(false);
        return;
      }

      const duplicateHandle = Object.values(reg).find((acc: any) => 
        (selectedPlatform === 'instagram' && acc.instagram && acc.instagram.toLowerCase().replace('@', '') === verifiedHandle.toLowerCase()) ||
        (selectedPlatform === 'youtube' && acc.youtube && acc.youtube.toLowerCase() === verifiedHandle.toLowerCase())
      );
      if (duplicateHandle) {
        setSubmitError(`The ${selectedPlatform} account (@${verifiedHandle}) is already linked to another Wovzo account.`);
        setLoading(false);
        return;
      }

      // 3. Register user with Supabase Auth
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
            is_verified: true,
            verified_handle: verifiedHandle,
            verified_platform: selectedPlatform,
            platform_account_id: verifiedPlatformAccountId,
            verification_challenge_id: challenge.challengeId,
            verification_code: challenge.verificationCode,
            instagram_verified: selectedPlatform === "instagram",
            youtube_verified: selectedPlatform === "youtube",
          }
        }
      });

      if (authError) throw authError;

      // Duplicate email identity check
      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        setSubmitError("An account with this email address already exists. Please Sign In instead.");
        setLoading(false);
        return;
      }

      // 4. Save to local verified accounts registry
      reg[cleanEmail] = {
        role: normRole,
        password: password,
        name: displayName,
        brand_name: normRole === "brand" ? brandName.trim() : "",
        contact_name: name.trim(),
        instagram: cleanIg ? `@${cleanIg}` : "",
        youtube: cleanYt,
        is_verified: true,
        verified_handle: verifiedHandle,
        verified_platform: selectedPlatform,
        platform_account_id: verifiedPlatformAccountId,
        verification_code: challenge.verificationCode,
      };
      localStorage.setItem("wovzo_accounts_registry", JSON.stringify(reg));
      localStorage.setItem("wovzo_demo_user", JSON.stringify({
        email: cleanEmail,
        ...reg[cleanEmail]
      }));

      // 5. Ensure profile row exists with verified flags
      if (authData.user) {
        try {
          await supabase.from("profiles").upsert({
            id: authData.user.id,
            name: displayName,
            role: normRole,
            instagram: cleanIg ? `@${cleanIg}` : "",
            youtube: cleanYt,
            is_verified: true,
            verified_handle: verifiedHandle,
            verified_platform: selectedPlatform,
            verification_code: challenge.verificationCode,
            instagram_verified: selectedPlatform === "instagram",
            youtube_verified: selectedPlatform === "youtube",
          });
        } catch (_) {}
      }

      // Redirect to respective dashboard
      if (normRole === "influencer") {
        router.push("/dashboard/creator");
      } else {
        router.push("/dashboard/brand");
      }
    } catch (err: any) {
      console.warn("Registration error:", err);
      setSubmitError(err.message || "Failed to create account. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand App Icon & Header */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0F172A] p-2 flex items-center justify-center shadow-lg shadow-orange-500/20 border border-orange-500/30">
            <img 
              src="/collab/logo.png" 
              alt="Wovzo Collab" 
              className="w-12 h-12 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }} 
            />
          </div>
          <h2 className="mt-4 text-center text-2xl font-black tracking-wider text-gray-900">
            WOVZO <span className="text-[#FF6A00]">COLLAB</span>
          </h2>
          <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#FF6A00] text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Mandatory Social Media Verification</span>
          </div>
        </div>

        {/* 3-Step Progress Indicators */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition ${
            step === 1 ? 'bg-[#FF6A00] text-white shadow-sm' : isVerified || step > 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
          }`}>
            <span>1. Platform</span>
          </div>
          <div className="w-4 h-0.5 bg-gray-200"></div>
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition ${
            step === 2 ? 'bg-[#FF6A00] text-white shadow-sm' : isVerified || step > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
          }`}>
            <span>2. Bio Verify</span>
          </div>
          <div className="w-4 h-0.5 bg-gray-200"></div>
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition ${
            step === 3 ? 'bg-[#FF6A00] text-white shadow-sm' : 'bg-gray-100 text-gray-400'
          }`}>
            <span>3. Account</span>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10">

          {/* ================= STEP 1: SELECT PLATFORM & HANDLE ================= */}
          {step === 1 && (
            <form onSubmit={handleStartVerification} className="space-y-5 animate-in fade-in">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("influencer")}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                      role === "influencer"
                        ? "bg-orange-50 border-[#FF6A00] text-[#FF6A00] shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Creator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("brand")}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                      role === "brand"
                        ? "bg-blue-50 border-blue-600 text-blue-600 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Brand</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Verify Ownership With
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform("instagram")}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedPlatform === "instagram"
                        ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-transparent shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>Instagram</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlatform("youtube")}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedPlatform === "youtube"
                        ? "bg-red-600 text-white border-transparent shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>YouTube</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {selectedPlatform === "instagram" ? "Instagram Username" : "YouTube Channel Handle"}
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    type="text"
                    required
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder={selectedPlatform === "instagram" ? "@username" : "@channel"}
                    className="block w-full rounded-xl border border-gray-300 py-3 px-4 text-sm focus:border-[#FF6A00] focus:ring-[#FF6A00] bg-[#F8FAFC]"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {role === 'brand' 
                    ? "Enter your official company Instagram or YouTube channel handle." 
                    : "Enter your public creator Instagram or YouTube channel handle."}
                </p>
              </div>

              {verifyError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#FF6A00] hover:bg-[#E55A00] shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Verification Code...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= STEP 2: VERIFICATION CHALLENGE IN BIO ================= */}
          {step === 2 && challenge && (
            <div className="space-y-5 animate-in fade-in">
              <div className="text-center">
                {/* 6 Formal Verification States Indicator */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  {verifying ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking {challenge.platform === 'instagram' ? 'Instagram' : 'YouTube'} Profile...</span>
                    </span>
                  ) : timeLeft <= 0 || verificationStatus === 'expired' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Verification Code Expired</span>
                    </span>
                  ) : verificationStatus === 'api_unavailable' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Instagram API Unavailable</span>
                    </span>
                  ) : verificationStatus === 'code_not_found' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Verification Code Not Found</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-900">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Waiting for Bio Update ({formatTime(timeLeft)} remaining)</span>
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900">
                  Add Code to Your {challenge.platform === 'instagram' ? 'Instagram Bio' : 'YouTube Description'}
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  Verifying account ownership for <strong>@{challenge.handle}</strong>
                </p>
              </div>

              {/* Code Box */}
              <div className="p-4 bg-orange-50/70 border-2 border-dashed border-[#FF6A00]/40 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-orange-800">
                    Your Persistent Verification Code
                  </span>
                  <span className="text-lg font-mono font-black text-[#FF6A00] tracking-wider select-all">
                    {challenge.verificationCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 bg-[#FF6A00] hover:bg-[#E55A00] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Action Buttons: Open Platform */}
              <div className="flex gap-2">
                <a
                  href={
                    challenge.platform === 'instagram'
                      ? `https://instagram.com/${challenge.handle}`
                      : `https://youtube.com/@${challenge.handle}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open {challenge.platform === 'instagram' ? 'Instagram' : 'YouTube'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <span>Change Handle</span>
                </button>
              </div>

              {/* Clear Instructions */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1.5 text-gray-700">
                <p className="font-bold text-gray-900">How to verify:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600">
                  <li>Click <strong>Copy Code</strong> above.</li>
                  <li>Paste the code into your {challenge.platform === 'instagram' ? 'Instagram Bio' : 'YouTube Channel Description'}.</li>
                  <li>Save your profile changes in {challenge.platform === 'instagram' ? 'Instagram' : 'YouTube'}.</li>
                  <li>Tap <strong>Verify Account</strong> below. The code stays identical throughout your session.</li>
                </ol>
              </div>

              {/* Distinct Error Banner */}
              {verifyError && (
                <div className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                  verificationStatus === 'api_unavailable'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                      verificationStatus === 'api_unavailable' ? 'text-amber-600' : 'text-rose-600'
                    }`} />
                    <div className="space-y-1">
                      <p className="font-bold">
                        {verificationStatus === 'api_unavailable' 
                          ? 'Instagram API Connection Notice' 
                          : verificationStatus === 'expired' 
                          ? 'Verification Expired' 
                          : 'Verification Challenge Notice'}
                      </p>
                      <p className="text-[11.5px] leading-relaxed">{verifyError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons: Verify / Retry Verification */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleVerifyNow}
                  disabled={verifying || timeLeft <= 0}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#FF6A00] hover:bg-[#E55A00] shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {verifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Checking {challenge.platform === 'instagram' ? 'Instagram Profile' : 'YouTube Channel'}...</span>
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-4 h-4" />
                      <span>{verifyError ? 'Retry Verification' : 'Verify Account'}</span>
                    </>
                  )}
                </button>

                {/* Regenerate Code Button (Available if expired or on retry) */}
                {(timeLeft <= 0 || verificationStatus === 'expired' || verifyError) && (
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    disabled={verifying}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate New Verification Code</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 3: ACCOUNT REGISTRATION ================= */}
          {step === 3 && isVerified && (
            <form onSubmit={handleFinalSignup} className="space-y-4 animate-in fade-in">
              {/* Verified Badge Banner */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                  <div>
                    <span className="block text-xs font-bold text-emerald-900">
                      Ownership Verified!
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      @{verifiedHandle} on {selectedPlatform}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full uppercase">
                  Verified
                </span>
              </div>

              {role === "brand" ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Brand / Company Name</label>
                    <input
                      type="text"
                      required
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. boAt Lifestyle"
                      className="block w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm bg-[#F8FAFC]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Your Full Name (Manager / Founder)</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aman Gupta"
                      className="block w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm bg-[#F8FAFC]"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Asraf Ali"
                    className="block w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm bg-[#F8FAFC]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm bg-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-sm bg-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#FF6A00] hover:bg-[#E55A00] shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Verified Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Verified Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer switch to login */}
          <div className="mt-6 text-center text-xs text-gray-500 border-t border-gray-100 pt-4">
            <span>Already have an account? </span>
            <Link href="/login" className="font-bold text-[#FF6A00] hover:underline">
              Sign In
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
