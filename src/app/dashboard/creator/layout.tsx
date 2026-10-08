"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Search, 
  Briefcase, 
  MessageSquare, 
  Settings, 
  LogOut 
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CreatorDashboardLayout({
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
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">W</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Wovzo Creator</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <Link href="/dashboard/creator" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${pathname === '/dashboard/creator' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/dashboard/creator/explore" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${pathname.includes('/explore') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Search className="w-5 h-5" />
            Find Campaigns
          </Link>
          <Link href="/dashboard/creator/applications" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${pathname.includes('/applications') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Briefcase className="w-5 h-5" />
            My Applications
          </Link>
          <Link href="/dashboard/creator/messages" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${pathname.includes('/messages') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <MessageSquare className="w-5 h-5" />
            Messages
          </Link>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <Link href="/dashboard/creator/settings" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition ${pathname.includes('/settings') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}>
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
          <span className="font-bold text-lg">Wovzo Creator</span>
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
