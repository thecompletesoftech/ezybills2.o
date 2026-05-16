'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Building2, CreditCard, Package, LogOut, Menu, X, ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { FullPageSpinner } from '@/components/ui/spinner';

const adminNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Businesses', href: '/admin/businesses', icon: Building2 },
  { label: 'Plans', href: '/admin/plans', icon: Package },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loadFromStorage, logout, user } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // If already have user in store, mark ready immediately
    if (user) { setReady(true); return; }
    // Otherwise wait for loadFromStorage + /auth/me to resolve
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) { setReady(true); return; }
    loadFromStorage();
    // Poll until user is populated (max ~3s)
    let attempts = 0;
    const interval = setInterval(() => {
      const u = useAuthStore.getState().user;
      if (u || ++attempts > 30) { setReady(true); clearInterval(interval); }
    }, 100);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated && !localStorage.getItem('auth_token')) { router.replace('/login'); return; }
    if (user && user.role !== 'super_admin') { router.replace('/dashboard'); }
  }, [ready, isAuthenticated, user, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!ready || !isAuthenticated || !user) return <FullPageSpinner />;
  if (user.role !== 'super_admin') return <FullPageSpinner />;

  const SidebarContent = () => (
    <nav className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-purple-700/30">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <div>
          <span className="text-white font-bold text-base">EzyBills</span>
          <p className="text-purple-200 text-xs">Admin Panel</p>
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {adminNav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors ${
                  active ? 'bg-white/20 text-white' : 'text-purple-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="px-2 py-4 border-t border-purple-700/30 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-purple-100 hover:text-white hover:bg-white/10 rounded-lg w-full transition-colors"
        >
          <ChevronLeft size={18} /> Back to App
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-purple-100 hover:text-white hover:bg-white/10 rounded-lg w-full transition-colors"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="hidden lg:flex lg:flex-col w-60 bg-[#6B21A8] flex-shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#6B21A8] z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-700/30">
              <span className="text-white font-bold">Admin Panel</span>
              <button onClick={() => setSidebarOpen(false)} className="text-purple-200 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 h-14 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-gray-500 p-1" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <span className="text-gray-800 font-semibold text-sm">
              {adminNav.find((n) => pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href)))?.label ?? 'Admin'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block">{user.name}</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Super Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
