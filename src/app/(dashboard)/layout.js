'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './layout.module.css';
import ChatPanel from '@/components/layout/ChatPanel';
import CustomerDetail from '@/components/customer/CustomerDetail';
import NotificationDropdown from '@/components/layout/NotificationDropdown';
import AppSwitcher from '@/components/layout/AppSwitcher';
import useStore from '@/lib/store';

const TAB_META = {
  leads: {
    title: '线索',
    subtitle: '客户沟通与线索管理',
    route: '/leads',
    iconColor: '#f43f5e',
  },
  workflow: {
    title: '工作流',
    subtitle: '自动化运营与执行中枢',
    route: '/workflow',
    iconColor: '#0ea5e9',
  },
  ai: {
    title: 'AI运营',
    subtitle: '自然语言指挥与执行中枢',
    route: '/ai',
    iconColor: '#2563eb',
  },
  tasks: {
    title: '审批',
    subtitle: '关键节点人工确认',
    route: '/tasks',
    iconColor: '#84cc16',
  },
  settings: {
    title: '我的',
    subtitle: '模型、SOP、CRM 与系统配置',
    route: '/settings',
    iconColor: '#8b5cf6',
  },
};

function resolveCurrentTab(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0] || 'leads';

  if (segment === 'leads') return 'leads';
  if (segment === 'workflow') return 'workflow';
  if (segment === 'ai' || segment === 'reports') return 'ai';
  if (segment === 'tasks') return 'tasks';
  if (segment === 'settings' || segment === 'materials' || segment === 'sop') return 'settings';

  return 'leads';
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showAIPanelMobile, setShowAIPanelMobile] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobileViewport(media.matches);
    sync();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
      return () => media.removeEventListener('change', sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  const baseTab = useMemo(() => resolveCurrentTab(pathname), [pathname]);
  const currentTab = showAIPanelMobile ? 'ai' : baseTab;
  const currentMeta = TAB_META[currentTab];

  const selectedCustomerId = useStore((s) => s.selectedCustomerId);
  const customers = useStore((s) => s.customers);
  const allMessages = useStore((s) => s.allMessages);
  const clearSelection = useStore((s) => s.clearSelection);
  const activeWorkspace = useStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useStore((s) => s.setActiveWorkspace);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((item) => item.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const selectedMessages = useMemo(() => {
    if (!selectedCustomerId) return [];
    return allMessages[selectedCustomerId] || [];
  }, [selectedCustomerId, allMessages]);

  const selectedCustomerSub = useMemo(() => {
    if (!selectedCustomer) return '';

    const tagText = Array.isArray(selectedCustomer.tags)
      ? selectedCustomer.tags
          .map((tag) => tag?.tag?.name || tag?.name)
          .filter(Boolean)
          .slice(0, 2)
          .join(' · ')
      : '';

    return tagText || selectedCustomer.memberLevel || selectedCustomer.phone || '客户画像';
  }, [selectedCustomer]);

  const showRightPanelMobile = Boolean(selectedCustomerId) || currentTab === 'ai';
  const hideMobileAiTopBar = isMobileViewport && currentTab === 'ai' && !selectedCustomer;

  const handleNavigate = (route) => {
    clearSelection();
    setShowDetailPanel(false);
    setShowAIPanelMobile(false);
    router.push(route);
  };

  const handleWorkspaceSwitch = (workspace) => {
    setActiveWorkspace(workspace);
    handleNavigate('/leads');
  };

  const renderBottomNav = (extraClassName = '') => (
    <nav className={`${styles.bottomNav} ${extraClassName}`.trim()}>
      <button
        onClick={() => handleNavigate('/leads')}
        className={`${styles.navItem} ${currentTab === 'leads' ? styles.active : ''}`}
      >
        <span className={styles.navIcon} style={{ color: '#f43f5e', opacity: currentTab === 'leads' ? 1 : 0.6 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </span>
        <span className={styles.navLabel} style={{ color: '#f43f5e', opacity: currentTab === 'leads' ? 1 : 0.6 }}>线索</span>
      </button>
      <button
        onClick={() => handleNavigate('/workflow')}
        className={`${styles.navItem} ${currentTab === 'workflow' ? styles.active : ''}`}
      >
        <span className={styles.navIcon} style={{ color: '#0ea5e9', opacity: currentTab === 'workflow' ? 1 : 0.6 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <path d="M6.5 10v4h7" />
          </svg>
        </span>
        <span className={styles.navLabel} style={{ color: '#0ea5e9', opacity: currentTab === 'workflow' ? 1 : 0.6 }}>工作流</span>
      </button>
      <button
        onClick={() => {
          if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            setShowAIPanelMobile(true);
            clearSelection();
          } else {
            handleNavigate('/ai');
          }
        }}
        className={`${styles.navItem} ${currentTab === 'ai' ? styles.active : ''}`}
      >
        <span className={styles.navIcon} style={{ color: '#2563eb', opacity: currentTab === 'ai' ? 1 : 0.6 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </span>
        <span className={styles.navLabel} style={{ color: '#2563eb', opacity: currentTab === 'ai' ? 1 : 0.6 }}>AI运营</span>
      </button>
      <button
        onClick={() => handleNavigate('/tasks')}
        className={`${styles.navItem} ${currentTab === 'tasks' ? styles.active : ''}`}
      >
        <span className={styles.navIcon} style={{ color: '#84cc16', opacity: currentTab === 'tasks' ? 1 : 0.6 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <polyline points="9 15 11 17 15 13" />
          </svg>
        </span>
        <span className={styles.navLabel} style={{ color: '#84cc16', opacity: currentTab === 'tasks' ? 1 : 0.6 }}>审批</span>
      </button>
      <button
        onClick={() => handleNavigate('/settings')}
        className={`${styles.navItem} ${currentTab === 'settings' ? styles.active : ''}`}
      >
        <span className={styles.navIcon} style={{ color: '#8b5cf6', opacity: currentTab === 'settings' ? 1 : 0.6 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className={styles.navLabel} style={{ color: '#8b5cf6', opacity: currentTab === 'settings' ? 1 : 0.6 }}>我的</span>
      </button>
    </nav>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <AppSwitcher />
      <div className={styles.dashboardLayout} style={{ flex: 1, minHeight: 0 }}>
        <div className={styles.accountsBar}>
          <div className={styles.accountsTop}>
            <div
              className={`${styles.accountBadge} ${activeWorkspace === 'main' ? styles.accountActive : ''}`}
              title="总控面板"
              onClick={() => handleWorkspaceSwitch('main')}
              style={{ background: '#2563eb' }}
            >
              <span className={styles.mainAccountIcon} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
            </div>
            <div className={styles.mainAccountDivider} />
            <div
              className={`${styles.accountBadge} ${activeWorkspace === 'sub_1' ? styles.accountActive : ''}`}
              title="AI顾问-门店1"
              onClick={() => handleWorkspaceSwitch('sub_1')}
              style={{ background: '#722ED1' }}
            >
              <span className={styles.mainAccountIcon} style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>门店1</span>
              <div className={`${styles.accountStatus} ${styles.statusOnline}`} />
            </div>
            <div
              className={`${styles.accountBadge} ${activeWorkspace === 'sub_2' ? styles.accountActive : ''}`}
              title="AI顾问-门店2"
              onClick={() => handleWorkspaceSwitch('sub_2')}
              style={{ background: '#FA8C16' }}
            >
              <span className={styles.mainAccountIcon} style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>门店2</span>
              <div className={`${styles.accountStatus} ${styles.statusOnline}`} />
            </div>
            <div
              className={`${styles.accountBadge} ${activeWorkspace === 'sub_3' ? styles.accountActive : ''}`}
              title="AI顾问-门店3"
              onClick={() => handleWorkspaceSwitch('sub_3')}
              style={{ background: '#13C2C2' }}
            >
              <span className={styles.mainAccountIcon} style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>门店3</span>
              <div className={`${styles.accountStatus} ${styles.statusOnline}`} />
            </div>
            <button className={styles.addAccountBtn} title="添加运营账号">+</button>
          </div>
          <div className={styles.accountsBottom}>
            <NotificationDropdown />
            <button onClick={() => handleNavigate('/settings')} className={styles.bottomIcon} title="我的">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.mainContent}>
          <div className={`${styles.leftPanel} ${showRightPanelMobile ? styles.leftPanelHiddenMobile : ''}`}>
            <div className={styles.topBar}>
              <div className={styles.topBarLeft}>
                <div className={styles.topBarAvatar} style={{ background: `linear-gradient(135deg, ${currentMeta.iconColor}, #0f172a)` }}>
                  {currentMeta.title.slice(0, 2)}
                </div>
                <span className={styles.topBarName}>{currentMeta.title}</span>
                <span className={styles.topBarSource}>{currentMeta.subtitle}</span>
              </div>
            </div>

            <div className={styles.leftPanelContent}>{children}</div>

            {!isMobileViewport ? renderBottomNav(styles.panelBottomNav) : null}
          </div>

          <div className={`${styles.rightPanel} ${showRightPanelMobile ? styles.rightPanelVisibleMobile : ''}`}>
            {!hideMobileAiTopBar ? (
              <div className={styles.rightTopBar}>
                {selectedCustomer ? (
                  <>
                    <button className={styles.backBtnIOS} onClick={() => { clearSelection(); setShowDetailPanel(false); }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                      <span className={styles.backBtnText}>返回</span>
                    </button>
                    <div className={styles.rightTopBarCustomer}>
                      <span className={styles.rightTopBarTitle}>{selectedCustomer.name}</span>
                      <span className={styles.rightTopBarSub}>{selectedCustomerSub}</span>
                    </div>
                    <button className={styles.profileBtn} title="客户画像" onClick={() => setShowDetailPanel(!showDetailPanel)}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span className={styles.profileBtnText}>客户画像</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ width: 44 }}>
                      {(showAIPanelMobile || currentTab === 'ai') && (
                        <button
                          className={`${styles.backBtnIOS} ${styles.backBtnMobileOnly}`}
                          onClick={() => {
                            setShowAIPanelMobile(false);
                            if (pathname === '/ai') router.push('/leads');
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                            <polyline points="15 18 9 12 15 6" />
                          </svg>
                          <span className={styles.backBtnText}>返回</span>
                        </button>
                      )}
                    </div>
                    <span className={styles.rightTopBarTitle}>AI智能运营中心</span>
                    <div style={{ width: 44 }} />
                  </>
                )}
              </div>
            ) : null}
            <ChatPanel
              key={selectedCustomerId || `command-${currentTab}`}
              customerName={selectedCustomer?.name}
              customerId={selectedCustomerId}
              initialMessages={selectedMessages}
            />
          </div>

          {showDetailPanel && selectedCustomer ? (
            <div className={styles.detailBackdrop} onClick={() => setShowDetailPanel(false)} />
          ) : null}

          {selectedCustomer && showDetailPanel ? (
            <div className={styles.detailPanelWrapper}>
              <CustomerDetail customerId={selectedCustomerId} onClose={() => setShowDetailPanel(false)} />
            </div>
          ) : null}
        </div>
        {isMobileViewport ? renderBottomNav(styles.mobileBottomNav) : null}
      </div>
    </div>
  );
}
