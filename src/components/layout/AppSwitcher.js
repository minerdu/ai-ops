'use client';

import { usePathname } from 'next/navigation';
import styles from './AppSwitcher.module.css';

const APPS = [
  { key: 'ops',    label: 'AI 运营', href: '/ops',    color: '#F59E0B', icon: '📊' },
  { key: 'fran',   label: 'AI 招商', href: '/fran',   color: '#2563EB', icon: '🤝' },
  { key: 'train',  label: 'AI 培训', href: '/train',  color: '#10B981', icon: '🎓' },
  { key: 'growth', label: 'AI 引流', href: '/growth', color: '#8B5CF6', icon: '🚀' },
];

export default function AppSwitcher() {
  const pathname = usePathname();
  const currentSegment = pathname.split('/').filter(Boolean)[0];
  const configuredApp = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\//g, '');
  const currentApp = APPS.some((app) => app.key === currentSegment)
    ? currentSegment
    : (APPS.some((app) => app.key === configuredApp) ? configuredApp : 'fran');

  return (
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
          >
            <span className={styles.icon}>{app.icon}</span>
            <span className={styles.label}>{app.label}</span>
          </a>
        );
      })}
    </div>
  );
}
