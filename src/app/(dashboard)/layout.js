'use client';
import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './layout.module.css';
import ChatPanel from '@/components/layout/ChatPanel';
import CustomerDetail from '@/components/customer/CustomerDetail';
import NotificationDropdown from '@/components/layout/NotificationDropdown';
import AppSwitcher from '@/components/layout/AppSwitcher';
import useStore, { selectSelectedCustomer, selectSelectedMessages } from '@/lib/store';

// Import sub-pages directly for SPA rendering
import LeadsPanel from '@/app/(dashboard)/leads/page';
import TasksPanel from '@/app/(dashboard)/tasks/page';
import ReportsPanel from '@/app/(dashboard)/reports/page';
import SopPanel from '@/app/(dashboard)/sop/page';
import WorkflowPanel from '@/app/(dashboard)/workflow/page';
import SettingsPanel from '@/app/(dashboard)/settings/page';
import MaterialsPanel from '@/app/(dashboard)/materials/page';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [showDetailPanel, setShowDetailPanel] = useState(false); // Default OFF on mobile
  const [showMobileCommandCenter, setShowMobileCommandCenter] = useState(false);

  // Use individual selectors to avoid creating new refs
  const selectedCustomerId = useStore(s => s.selectedCustomerId);
  const customers = useStore(s => s.customers);
  const allMessages = useStore(s => s.allMessages);
  const clearSelection = useStore(s => s.clearSelection);
  const activeMainPanel = useStore(s => s.activeMainPanel);
  const setActiveMainPanel = useStore(s => s.setActiveMainPanel);
  const activeWorkspace = useStore(s => s.activeWorkspace);
  const setActiveWorkspace = useStore(s => s.setActiveWorkspace);

  // Derive data with useMemo to keep stable references
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const selectedMessages = useMemo(() => {
    if (!selectedCustomerId) return [];
    return allMessages[selectedCustomerId] || [];
  }, [selectedCustomerId, allMessages]);

  const pendingTaskCount = 0; // removed badge per request

  // Calculate unread dynamic badges based on assignment
  const unreadMain = (customers || []).reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadSub1 = customers.filter(c => c.assignedToId === 'sub_1').reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadSub2 = customers.filter(c => c.assignedToId === 'sub_2').reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadSub3 = customers.filter(c => c.assignedToId === 'sub_3').reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // AI指挥 click handler: on desktop, just clear selection to show command center in right panel
  // on mobile, trigger the overlay
  const handleAiCommand = () => {
    clearSelection();
    setShowMobileCommandCenter(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <AppSwitcher />
      <div className={styles.dashboardLayout} style={{ flex: 1, minHeight: 0 }}>
      {/* Extremely Thin Multi-Account Switcher Sidebar */}
      <div className={styles.accountsBar}>
        <div className={styles.accountsTop}>
          <div 
            className={`${styles.accountBadge} ${activeWorkspace === 'main' ? styles.accountActive : ''}`} 
            title="总控面板 (全部账号)"
            onClick={() => { setActiveWorkspace('main'); setActiveMainPanel('leads'); }}
            style={{ background: '#3b82f6' }}
          >
            <span className={styles.mainAccountIcon} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </span>
            {unreadMain > 0 && <span className={styles.accountUnread}>{unreadMain > 99 ? '99+' : unreadMain}</span>}
          </div>
          <div className={styles.mainAccountDivider} />
          <div 
            className={`${styles.accountBadge} ${activeWorkspace === 'sub_1' ? styles.accountActive : ''}`} 
            title="AI顾问-门店1"
            onClick={() => { setActiveWorkspace('sub_1'); setActiveMainPanel('leads'); }}
            style={{ background: '#722ED1' }}
          >
            <span className={styles.mainAccountIcon} style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>门店1</span>
            <div className={`${styles.accountStatus} ${styles.statusOnline}`} />
            {unreadSub1 > 0 && <span className={styles.accountUnread}>{unreadSub1}</span>}
          </div>
          <div 
            className={`${styles.accountBadge} ${activeWorkspace === 'sub_2' ? styles.accountActive : ''}`} 
            title="AI顾问-门店2"
            onClick={() => { setActiveWorkspace('sub_2'); setActiveMainPanel('leads'); }}
            style={{ background: '#FA8C16' }}
          >
            <span className={styles.mainAccountIcon} style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>门店2</span>
            <div className={`${styles.accountStatus} ${styles.statusOnline}`} />
            {unreadSub2 > 0 && <span className={styles.accountUnread}>{unreadSub2}</span>}
          </div>
          <div 
            className={`${styles.accountBadge} ${activeWorkspace === 'sub_3' ? styles.accountActive : ''}`} 
            title="AI顾问-门店3"
            onClick={() => { setActiveWorkspace('sub_3'); setActiveMainPanel('leads'); }}
            style={{ background: '#13C2C2' }}
          >
            <span className={styles.mainAccountIcon} style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>门店3</span>
            <div className={`${styles.accountStatus} ${styles.statusOnline}`} />
            {unreadSub3 > 0 && <span className={styles.accountUnread}>{unreadSub3}</span>}
          </div>
          <button className={styles.addAccountBtn} title="添加接管号">+</button>
        </div>
        <div className={styles.accountsBottom}>
          <NotificationDropdown />
          <button onClick={() => setActiveMainPanel('settings')} className={styles.bottomIcon} title="系统配置" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Left Panel */}
        <div className={`${styles.leftPanel} ${selectedCustomerId ? styles.leftPanelHiddenMobile : ''}`}>
          {/* Top Bar */}
          <div className={styles.topBar}>
            <div className={styles.topBarLeft}>
              <div className={styles.topBarAvatar}>氧</div>
              <span className={styles.topBarName}>氧颜轻医美</span>
              <span className={styles.topBarSource}>@企微</span>
            </div>
          </div>

          {/* Page Content / SPA Panels */}
          <div className={styles.leftPanelContent}>
            {activeMainPanel === 'leads' && <LeadsPanel />}
            {activeMainPanel === 'workflow' && <WorkflowPanel />}
            {activeMainPanel === 'tasks' && <TasksPanel />}
            {activeMainPanel === 'reports' && <ReportsPanel />}
            {activeMainPanel === 'settings' && <SettingsPanel />}
            {activeMainPanel === 'materials' && <MaterialsPanel />}
          </div>

          {/* Bottom Navigation — INSIDE leftPanel, always at bottom */}
          <nav className={styles.bottomNav}>
            <button
              onClick={() => { setActiveMainPanel('leads'); clearSelection(); setShowMobileCommandCenter(false); }}
              className={`${styles.navItem} ${activeMainPanel === 'leads' && !showMobileCommandCenter ? styles.active : ''}`}
            >
              <span className={styles.navIcon} style={{color: '#3b82f6'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
              <span className={styles.navLabel}>线索</span>
            </button>
            <button
              onClick={() => { setActiveMainPanel('workflow'); clearSelection(); setShowMobileCommandCenter(false); }}
              className={`${styles.navItem} ${activeMainPanel === 'workflow' && !showMobileCommandCenter ? styles.active : ''}`}
            >
              <span className={styles.navIcon} style={{color: '#8b5cf6'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
              </span>
              <span className={styles.navLabel}>工作流</span>
            </button>
            <button
              onClick={handleAiCommand}
              className={`${styles.navItem} ${!selectedCustomerId && showMobileCommandCenter ? styles.active : ''}`}
            >
              <span className={styles.navIcon} style={{color: '#10b981'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
              </span>
              <span className={styles.navLabel}>AI运营</span>
            </button>
            <button
              onClick={() => { setActiveMainPanel('tasks'); clearSelection(); setShowMobileCommandCenter(false); }}
              className={`${styles.navItem} ${activeMainPanel === 'tasks' && !showMobileCommandCenter ? styles.active : ''}`}
            >
              <div className={styles.navIconWrapper}>
                <span className={styles.navIcon} style={{color: '#f59e0b'}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
                </span>
                {pendingTaskCount > 0 && <span className={styles.navBadge}>{pendingTaskCount}</span>}
              </div>
              <span className={styles.navLabel}>审批</span>
            </button>
            <button
              onClick={() => { setActiveMainPanel('settings'); clearSelection(); setShowMobileCommandCenter(false); }}
              className={`${styles.navItem} ${activeMainPanel === 'settings' && !showMobileCommandCenter ? styles.active : ''}`}
            >
              <span className={styles.navIcon} style={{color: '#ec4899'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </span>
              <span className={styles.navLabel}>我的</span>
            </button>
          </nav>
        </div>

        {/* Right Panel - AI Chat / Command Center */}
        <div className={`${styles.rightPanel} ${selectedCustomerId ? styles.rightPanelVisibleMobile : ''} ${showMobileCommandCenter ? styles.rightPanelCommandMobileVisible : ''}`}>
          <div className={styles.rightTopBar}>
            {selectedCustomer ? (
              <>
                <button className={styles.backBtnIOS} onClick={() => { clearSelection(); setShowDetailPanel(false); setShowMobileCommandCenter(false); }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  <span className={styles.backBtnText}>返回</span>
                </button>
                <div className={styles.rightTopBarCustomer}>
                  <span className={styles.rightTopBarTitle}>{selectedCustomer.name}</span>
                  <span className={styles.rightTopBarSub}>
                    {(selectedCustomer.tags || []).slice(0, 2).map(t => t.name).join(' · ')}
                  </span>
                </div>
                <button 
                  className={styles.profileBtn} 
                  title="客户画像"
                  onClick={() => setShowDetailPanel(!showDetailPanel)}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span className={styles.profileBtnText}>客户画像</span>
                </button>
              </>
            ) : (
              <>
                <div style={{ width: 44 }} />
                <span className={styles.rightTopBarTitle}>AI智能运营中心</span>
                <div style={{ width: 44 }} />
              </>
            )}
          </div>
          <ChatPanel
            key={selectedCustomerId}
            customerName={selectedCustomer?.name}
            customerId={selectedCustomerId}
            initialMessages={selectedMessages}
          />
        </div>

        {/* Detail Panel Overlay Backdrop (mobile) */}
        {showDetailPanel && selectedCustomer && (
          <div className={styles.detailBackdrop} onClick={() => setShowDetailPanel(false)} />
        )}

        {/* Third Panel - Customer Detail */}
        {selectedCustomer && showDetailPanel && (
          <div className={styles.detailPanelWrapper}>
             <CustomerDetail customerId={selectedCustomerId} onClose={() => setShowDetailPanel(false)} />
          </div>
        )}
      </div>

      {/* Mobile Command Center Overlay — top level, not inside mainContent */}
      {showMobileCommandCenter && !selectedCustomerId && (
        <div className={styles.mobileCommandOverlay}>
          <div className={styles.rightTopBar}>
            <div style={{ width: 44 }} />
            <span className={styles.rightTopBarTitle}>AI智能运营中心</span>
            <div style={{ width: 44 }} />
          </div>
          <ChatPanel
            key="command-center"
            customerName={null}
            customerId={null}
            initialMessages={[]}
          />
        </div>
      )}
      </div>
    </div>
  );
}
