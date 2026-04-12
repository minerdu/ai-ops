'use client';
import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './layout.module.css';
import ChatPanel from '@/components/layout/ChatPanel';
import CustomerDetail from '@/components/customer/CustomerDetail';
import NotificationDropdown from '@/components/layout/NotificationDropdown';
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

  const pendingTaskCount = 2; // from mock

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
    <div className={styles.dashboardLayout}>
      {/* Extremely Thin Multi-Account Switcher Sidebar */}
      <div className={styles.accountsBar}>
        <div className={styles.accountsTop}>
          <div 
            className={`${styles.accountBadge} ${activeWorkspace === 'main' ? styles.accountActive : ''}`} 
            title="总控面板 (全部账号)"
            onClick={() => { setActiveWorkspace('main'); setActiveMainPanel('leads'); }}
            style={{ background: '#3b82f6' }}
          >
            <span className={styles.mainAccountIcon}>👥</span>
            {unreadMain > 0 && <span className={styles.accountUnread}>{unreadMain > 99 ? '99+' : unreadMain}</span>}
          </div>
          <div className={styles.mainAccountDivider} />
          <div 
            className={`${styles.accountBadge} ${activeWorkspace === 'sub_1' ? styles.accountActive : ''}`} 
            title="AI顾问-门店1"
            onClick={() => { setActiveWorkspace('sub_1'); setActiveMainPanel('leads'); }}
          >
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=A" alt="W1" />
            <div className={`${styles.accountStatus} ${styles.statusOnline}`} />
            {unreadSub1 > 0 && <span className={styles.accountUnread}>{unreadSub1}</span>}
          </div>
          <div 
            className={`${styles.accountBadge} ${activeWorkspace === 'sub_2' ? styles.accountActive : ''}`} 
            title="AI顾问-门店2"
            onClick={() => { setActiveWorkspace('sub_2'); setActiveMainPanel('leads'); }}
          >
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=B" alt="W2" />
            <div className={`${styles.accountStatus} ${styles.statusOnline}`} />
            {unreadSub2 > 0 && <span className={styles.accountUnread}>{unreadSub2}</span>}
          </div>
          <div 
            className={`${styles.accountBadge} ${activeWorkspace === 'sub_3' ? styles.accountActive : ''}`} 
            title="AI顾问-门店3"
            onClick={() => { setActiveWorkspace('sub_3'); setActiveMainPanel('leads'); }}
          >
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=C" alt="W3" />
            <div className={`${styles.accountStatus} ${styles.statusOnline}`} />
            {unreadSub3 > 0 && <span className={styles.accountUnread}>{unreadSub3}</span>}
          </div>
          <button className={styles.addAccountBtn} title="添加接管号">+</button>
        </div>
        <div className={styles.accountsBottom}>
          <NotificationDropdown />
          <button onClick={() => setActiveMainPanel('settings')} className={styles.bottomIcon} title="系统配置">⚙</button>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Left Panel */}
        <div className={`${styles.leftPanel} ${selectedCustomerId ? styles.leftPanelHiddenMobile : ''}`}>
          {/* Top Bar */}
          <div className={styles.topBar}>
            <div className={styles.topBarLeft}>
              <div className={styles.topBarAvatar}>悦</div>
              <span className={styles.topBarName}>悦心养生馆</span>
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
              <span className={styles.navIcon}>🔗</span>
              <span className={styles.navLabel}>线索</span>
            </button>
            <button
              onClick={() => { setActiveMainPanel('workflow'); clearSelection(); setShowMobileCommandCenter(false); }}
              className={`${styles.navItem} ${activeMainPanel === 'workflow' && !showMobileCommandCenter ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>📋</span>
              <span className={styles.navLabel}>工作流</span>
            </button>
            <button
              onClick={handleAiCommand}
              className={`${styles.navItem} ${!selectedCustomerId && showMobileCommandCenter ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>🎯</span>
              <span className={styles.navLabel}>AI指挥</span>
            </button>
            <button
              onClick={() => { setActiveMainPanel('tasks'); clearSelection(); setShowMobileCommandCenter(false); }}
              className={`${styles.navItem} ${activeMainPanel === 'tasks' && !showMobileCommandCenter ? styles.active : ''}`}
            >
              <div className={styles.navIconWrapper}>
                <span className={styles.navIcon}>✅</span>
                {pendingTaskCount > 0 && <span className={styles.navBadge}>{pendingTaskCount}</span>}
              </div>
              <span className={styles.navLabel}>审批</span>
            </button>
            <button
              onClick={() => { setActiveMainPanel('settings'); clearSelection(); setShowMobileCommandCenter(false); }}
              className={`${styles.navItem} ${activeMainPanel === 'settings' && !showMobileCommandCenter ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>⚙️</span>
              <span className={styles.navLabel}>我</span>
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
                <span className={styles.rightTopBarTitle}>运营指挥中心</span>
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
            <span className={styles.rightTopBarTitle}>运营指挥中心</span>
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
  );
}
