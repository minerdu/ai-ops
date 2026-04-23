'use client';

import { usePathname } from 'next/navigation';
import styles from './AppSwitcher.module.css';

const APPS = [
  { key: 'ops', code: 'OPS', label: 'AI 运营', href: '/ops', color: '#F59E0B' },
  { key: 'fran', code: 'FRAN', label: 'AI 招商', href: '/fran', color: '#2563EB' },
  { key: 'train', code: 'TRAIN', label: 'AI 培训', href: '/train', color: '#10B981' },
  { key: 'growth', code: 'GROWTH', label: 'AI 引流', href: '/growth', color: '#F97316' },
];

function AppIcon({ appKey }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  switch (appKey) {
    case 'ops':
      return (
        <svg {...commonProps}>
          <path d="M4 19h16" />
          <path d="M7 16V9" />
          <path d="M12 16V5" />
          <path d="M17 16v-3" />
        </svg>
      );
    case 'fran':
      return (
        <svg {...commonProps}>
          <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M16 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M3.5 19a4.5 4.5 0 0 1 9 0" />
          <path d="M13 19a3.5 3.5 0 0 1 7 0" />
        </svg>
      );
    case 'train':
      return (
        <svg {...commonProps}>
          <path d="m3 8.5 9-4 9 4-9 4-3-1.33" />
          <path d="M7 10.5V14c0 1.8 2.2 3.5 5 3.5s5-1.7 5-3.5v-3.5" />
          <path d="M21 9v6" />
        </svg>
      );
    case 'growth':
      return (
        <svg {...commonProps}>
          <path d="M5 17 17 5" />
          <path d="M10 5h7v7" />
          <path d="M5 11v6h6" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AppSwitcher() {
  const pathname = usePathname();
  const currentSegment = pathname.split('/').filter(Boolean)[0];
  const configuredApp = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\//g, '');
  const currentApp = APPS.some((app) => app.key === currentSegment)
    ? currentSegment
    : (APPS.some((app) => app.key === configuredApp) ? configuredApp : 'fran');

  return (
    <div className={styles.shell}>
      <div className={styles.bar}>
      {APPS.map((app) => {
        const isActive = currentApp === app.key;
        return (
          <a
            key={app.key}
            href={app.href}
            className={`${styles.item} ${isActive ? styles.active : ''}`}
            style={{ '--app-color': app.color }}
            title={app.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.iconWrap}>
              <span className={styles.icon}>
                <AppIcon appKey={app.key} />
              </span>
            </span>
            <span className={styles.meta}>
              <span className={styles.kicker}>{app.code}</span>
              <span className={styles.label}>{app.label}</span>
            </span>
          </a>
        );
      })}
      </div>
    </div>
  );
}
