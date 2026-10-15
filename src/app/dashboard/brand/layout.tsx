"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut 
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function BrandDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-[family-name:var(--font-geist-sans)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex">
        <Link href="/dashboard/brand" className="p-6 flex items-center gap-2">
          <img src="/logo.png" alt="Wovzo" className="h-7 object-contain" />
          <span className="text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 bg-orange-50 rounded border border-orange-200 text-[#FF6A00]">Brand</span>
        </Link>
        
        <nav className="flex-1 px-4 space-y-1 mt-2">
          <Link href="/dashboard/brand" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${pathname === '/dashboard/brand' ? 'bg-orange-50 text-[#FF6A00] font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/dashboard/brand/campaigns" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${pathname.includes('/campaigns') ? 'bg-orange-50 text-[#FF6A00] font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Megaphone className="w-5 h-5" />
            My Campaigns
          </Link>
          <Link href="/dashboard/brand/influencers" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${pathname.includes('/influencers') ? 'bg-orange-50 text-[#FF6A00] font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Users className="w-5 h-5" />
            Applications
          </Link>
          <Link href="/dashboard/brand/messages" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${pathname.includes('/messages') ? 'bg-orange-50 text-[#FF6A00] font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <MessageSquare className="w-5 h-5" />
            Messages
          </Link>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <Link href="/dashboard/brand/settings" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition ${pathname.includes('/settings') ? 'bg-orange-50 text-[#FF6A00] font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition mt-1">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Wovzo" className="h-6 object-contain" />
            <span className="text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 bg-orange-50 rounded border border-orange-200 text-[#FF6A00]">Brand</span>
          </div>
          <button className="p-2 bg-gray-100 rounded-md">
            <LayoutDashboard className="w-5 h-5" />
          </button>
        </header>
        
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
