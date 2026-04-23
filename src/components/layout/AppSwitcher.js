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
  const currentApp = pathname.split('/')[1] || 'fran';

  return (
    <div className={styles.bar}>
      {APPS.map((app) => {
        const isActive = currentApp === app.key;
        const isComingSoon = app.key === 'train' || app.key === 'growth';
        return (
          <a
            key={app.key}
            href={app.href}
            className={`${styles.item} ${isActive ? styles.active : ''} ${isComingSoon ? styles.disabled : ''}`}
            style={{ '--app-color': app.color }}
            onClick={isComingSoon ? (e) => e.preventDefault() : undefined}
            title={isComingSoon ? '即将上线' : app.label}
          >
            <span className={styles.icon}>{app.icon}</span>
            <span className={styles.label}>{app.label}</span>
            {isComingSoon && <span className={styles.badge}>Soon</span>}
          </a>
        );
      })}
    </div>
  );
}
