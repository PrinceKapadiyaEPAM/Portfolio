'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

const NAV = [
  { href: '/dashboard',    label: 'Dashboard' },
  { href: '/trades',       label: 'Strategies' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/watchlist',    label: 'Watchlist' },
  { href: '/portfolio',    label: 'Portfolio' },
  { href: '/screener',     label: 'Screener' },
  { href: '/settings',     label: 'Settings' },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, accessToken, _hasHydrated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && !accessToken && !user) router.replace('/login');
  }, [_hasHydrated, user, accessToken, router]);

  if (!_hasHydrated) return null;
  if (!accessToken && !user) return null;

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearAuth();
    router.replace('/login');
  }

  const nav = user?.role === 'superadmin'
    ? [...NAV, { href: '/admin/organizations', label: 'Admin' }]
    : NAV;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-0 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900 py-3"><span className="text-blue-600 mr-1">◆</span>FinTech Platform</span>
          <div className="flex">
            {nav.map(({ href, label }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-3 text-sm font-medium border-b-[3px] transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{user?.orgName}</span>
          <span className="text-xs text-gray-600">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-600 py-3"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
