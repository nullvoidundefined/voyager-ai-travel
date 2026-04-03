'use client';

import { useAuth } from '@/context/AuthContext';
import { get } from '@/lib/api';
import { APP_NAME } from '@/lib/constants';
import { type UserPreferences } from '@/lib/preferenceOptions';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './Header.module.scss';

const publicLinks = [
  { href: '/explore', label: 'Explore' },
  { href: '/faq', label: 'FAQ' },
];

const authedLinks = [
  { href: '/explore', label: 'Explore' },
  { href: '/trips', label: 'My Trips' },
  { href: '/account', label: 'Account' },
  { href: '/faq', label: 'FAQ' },
];

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navLinks = user ? authedLinks : publicLinks;

  const { data: preferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: () =>
      get<{ preferences: UserPreferences | null }>('/user-preferences').then(
        (r) => r.preferences,
      ),
    enabled: !!user,
  });

  const prefsIncomplete =
    !!user && (preferences?.completed_steps?.length ?? 0) < 6;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href='/' className={styles.logo}>
          {APP_NAME}
          <svg
            className={styles.logoIcon}
            width='24'
            height='24'
            viewBox='0 0 28 28'
            aria-hidden='true'
          >
            <circle
              cx='14'
              cy='14'
              r='12'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
            />
            <line
              x1='14'
              y1='2'
              x2='14'
              y2='5'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            />
            <line
              x1='14'
              y1='23'
              x2='14'
              y2='26'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            />
            <line
              x1='2'
              y1='14'
              x2='5'
              y2='14'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            />
            <line
              x1='23'
              y1='14'
              x2='26'
              y2='14'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            />
            <polygon points='14,5 16,14 14,13 12,14' fill='currentColor' />
            <polygon
              points='14,23 16,14 14,15 12,14'
              fill='currentColor'
              opacity='0.35'
            />
            <circle cx='14' cy='14' r='1.5' fill='currentColor' />
          </svg>
        </Link>
        <nav className={styles.nav} aria-label='Main navigation'>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
            >
              {link.label}
              {link.href === '/account' && prefsIncomplete && (
                <span
                  className={styles.incompleteBadge}
                  aria-label='Preferences incomplete'
                />
              )}
            </Link>
          ))}
        </nav>
        {user ? (
          <button className={styles.signIn} onClick={logout}>
            Sign Out
          </button>
        ) : (
          <Link href='/login' className={styles.signIn}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
