import Link from "next/link";
import { ArrowRight, CheckCircle2, Megaphone, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)]">
      {/* Navigation */}
      <nav className="w-full bg-white border-b border-gray-100 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Wovzo Collab</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href="#how-it-works" className="hover:text-blue-600 transition">How it Works</Link>
          <Link href="#for-brands" className="hover:text-blue-600 transition">For Brands</Link>
          <Link href="#for-influencers" className="hover:text-blue-600 transition">For Influencers</Link>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login" className="text-gray-600 hover:text-blue-600 transition">Login</Link>
          <Link href="/signup" className="bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition shadow-sm">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="w-full px-6 md:px-12 py-20 max-w-7xl mx-auto flex flex-col-reverse md:flex-row items-center gap-12">
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            The Ultimate Marketplace for Creators
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Where Brands meet <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Top Influencers
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto md:mx-0">
            Wovzo Collab is the fastest way to discover, connect, and collaborate. Whether you are a brand looking for reach or a creator looking for sponsors.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
            <Link href="/signup?role=brand" className="w-full sm:w-auto bg-gray-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2 shadow-lg">
              <Megaphone className="w-5 h-5" />
              I'm a Brand
            </Link>
            <Link href="/signup?role=influencer" className="w-full sm:w-auto bg-white border-2 border-gray-200 text-gray-900 px-8 py-4 rounded-full font-semibold hover:border-gray-300 hover:bg-gray-50 transition flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              I'm an Influencer
            </Link>
          </div>
        </div>
        
        <div className="flex-1 relative">
          {/* Decorative abstract shape */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-100 to-purple-50 rounded-full blur-3xl -z-10"></div>
          
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 relative z-10 transform md:rotate-2">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold">👟</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">SneakerX Launch Campaign</h3>
                <p className="text-sm text-green-600 font-medium">₹50,000 Budget</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-blue-600 w-5 h-5" />
                <span className="text-sm text-gray-600">Looking for Fashion creators</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-blue-600 w-5 h-5" />
                <span className="text-sm text-gray-600">Min. 10k followers required</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-blue-600 w-5 h-5" />
                <span className="text-sm text-gray-600">1 Reel + 2 Stories</span>
              </div>
            </div>
            <button className="w-full mt-6 bg-blue-50 text-blue-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 transition">
              Apply Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
