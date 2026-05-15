'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Truck,
  Receipt,
  FileText,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { FullPageSpinner } from '@/components/ui/spinner';
import toast from 'react-hot-toast';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'POS / New Sale', href: '/pos', icon: ShoppingCart },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Inventory', href: '/inventory', icon: Warehouse },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Suppliers', href: '/suppliers', icon: Truck },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'Reports', href: '/reports', icon: BarChart2 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loadFromStorage, logout, user, business } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    loadFromStorage();
    setReady(true);
  }, [loadFromStorage]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace('/login');
    }
  }, [ready, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.replace('/login');
  };

  if (!ready || !isAuthenticated) {
    return <FullPageSpinner />;
  }

  const SidebarContent = () => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-blue-700/30">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">EzyBills</span>
      </div>

      {/* Business name */}
      {business && (
        <div className="px-5 py-3 border-b border-blue-700/30">
          <p className="text-blue-200 text-xs truncate">{business.name}</p>
        </div>
      )}

      {/* Nav links */}
      <ul className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Logout at bottom */}
      <div className="px-2 py-4 border-t border-blue-700/30">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-lg w-full transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-[#0066CC] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#0066CC] z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-blue-700/30">
              <span className="text-white font-bold text-lg">EzyBills</span>
              <button onClick={() => setSidebarOpen(false)} className="text-blue-200 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 h-14 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h1 className="text-gray-800 font-semibold text-sm lg:text-base capitalize">
              {navItems.find((n) => pathname.startsWith(n.href))?.label ?? 'EzyBills'}
            </h1>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#0066CC] flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <span className="hidden sm:block max-w-[120px] truncate">{user?.name ?? 'User'}</span>
              <ChevronDown size={14} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-800 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Settings size={14} /> Settings
                </Link>
                <button
                  onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
