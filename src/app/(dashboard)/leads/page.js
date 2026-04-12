'use client';

import { useEffect, useMemo, useState } from 'react';
import useStore from '@/lib/store';
import { useToast } from '@/components/common/Toast';
import { CardSkeleton } from '@/components/common/Skeleton';
import CustomerCard from '@/components/customer/CustomerCard';
import styles from './page.module.css';

export default function LeadsPage() {
  const searchTerm = useStore(s => s.searchTerm);
  const setSearchTerm = useStore(s => s.setSearchTerm);
  const activeFilter = useStore(s => s.activeFilter);
  const setActiveFilter = useStore(s => s.setActiveFilter);
  const customers = useStore(s => s.customers);
  const fetchCustomers = useStore(s => s.fetchCustomers);
  const isLoadingCustomers = useStore(s => s.isLoadingCustomers);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [chatType, setChatType] = useState('all'); // all, single, group
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const activeWorkspace = useStore(s => s.activeWorkspace);
  const setActiveWorkspace = useStore(s => s.setActiveWorkspace);
  const toast = useToast();

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchWakeup = () => {
    toast.success(`已为 ${selectedIds.size} 位客户批量创建「沉默激活 SOP」审批任务！`);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(term) ||
        (c.tags || []).some(t => t.name.toLowerCase().includes(term)) ||
        (c.aiSummary && c.aiSummary.toLowerCase().includes(term))
      );
    }

    switch (activeFilter) {
      case 'unread':
        result = result.filter(c => c.unreadCount > 0);
        break;
      case 'ai_handling':
        result = result.filter(c => (c.tags || []).some(t => t.name === 'AI接待'));
        break;
      case 'manual':
        result = result.filter(c => !(c.tags || []).some(t => t.name === 'AI接待'));
        break;
      case 'high_intent':
        result = result.filter(c => c.intentScore >= 3.5);
        break;
      case 'silent':
        result = result.filter(c => c.silentDays >= 14);
        break;
    }

    // Filter by chatType (mocking group chat presence)
    if (chatType === 'single') {
      result = result.filter(c => !c.isGroup); // assuming no group flag means single
    } else if (chatType === 'group') {
      result = result.filter(c => c.isGroup);
    }

    // Filter by workspace (mock account isolation based on DB assignedToId)
    if (activeWorkspace !== 'main') {
      result = result.filter(c => c.assignedToId === activeWorkspace);
    }

    return result;
  }, [customers, searchTerm, activeFilter, chatType, activeWorkspace]);

  const basicGroup = [
    { key: 'all', label: '全部消息', icon: '💬', count: customers.length },
    { key: 'unread', label: '未读消息', icon: '📩', count: customers.filter(c => (c.unreadCount || 0) > 0).length },
  ];

  const aiGroup = [
    { key: 'ai_handling', label: 'AI自动回复中', icon: '🤖', count: customers.filter(c => (c.tags || []).some(t => t.name === 'AI接待')).length },
    { key: 'suggest', label: '建议回复', icon: '💡', count: 0 },
    { key: 'manual', label: '需人工介入', icon: '👤', count: customers.filter(c => !(c.tags || []).some(t => t.name === 'AI接待')).length }
  ];

  return (
    <div className={styles.leadsPage}>
      {/* Backdrop for mobile slideout */}
      <div
        className={`${styles.sidebarBackdrop} ${showGroupMenu ? styles.sidebarBackdropOpen : ''}`}
        onClick={() => setShowGroupMenu(false)}
      />

      {/* Side Menu (Groupings) */}
      <div className={`${styles.groupSidebar} ${showGroupMenu ? styles.groupSidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>菜单</span>
          <button className={styles.sidebarCloseBtn} onClick={() => setShowGroupMenu(false)}>✕</button>
        </div>

        {/* Workspace Account Switcher */}
        <div className={styles.sidebarSectionTitle} style={{ marginTop: 0 }}>账号管理</div>
        <div className={styles.sidebarList}>
          <div
            className={`${styles.sidebarItem} ${activeWorkspace === 'main' ? styles.sidebarItemActive : ''}`}
            onClick={() => { setActiveWorkspace('main'); setShowGroupMenu(false); }}
          >
            <span className={styles.sidebarItemIcon}>👥</span>
            <span className={styles.sidebarItemLabel}>总控主账号 (全部)</span>
          </div>
          <div
            className={`${styles.sidebarItem} ${activeWorkspace === 'sub_1' ? styles.sidebarItemActive : ''}`}
            onClick={() => { setActiveWorkspace('sub_1'); setShowGroupMenu(false); }}
          >
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=A" alt="W1" className={styles.workspaceAvatar} />
            <span className={styles.sidebarItemLabel}>AI顾问-门店1</span>
          </div>
          <div
            className={`${styles.sidebarItem} ${activeWorkspace === 'sub_2' ? styles.sidebarItemActive : ''}`}
            onClick={() => { setActiveWorkspace('sub_2'); setShowGroupMenu(false); }}
          >
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=B" alt="W2" className={styles.workspaceAvatar} />
            <span className={styles.sidebarItemLabel}>AI顾问-门店2</span>
          </div>
          <div
            className={`${styles.sidebarItem} ${activeWorkspace === 'sub_3' ? styles.sidebarItemActive : ''}`}
            onClick={() => { setActiveWorkspace('sub_3'); setShowGroupMenu(false); }}
          >
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=C" alt="W3" className={styles.workspaceAvatar} />
            <span className={styles.sidebarItemLabel}>AI顾问-门店3</span>
          </div>
        </div>

        <div className={styles.sidebarSectionTitle}>消息分组</div>

        <div className={styles.sidebarList}>
          {basicGroup.map(item => (
            <div
              key={item.key}
              className={`${styles.sidebarItem} ${activeFilter === item.key ? styles.sidebarItemActive : ''}`}
              onClick={() => { setActiveFilter(item.key); setShowGroupMenu(false); }}
            >
              <span className={styles.sidebarItemIcon}>{item.icon}</span>
              <span className={styles.sidebarItemLabel}>{item.label}</span>
              {item.count > 0 && <span className={styles.sidebarItemCount}>{item.count}</span>}
            </div>
          ))}
        </div>

        <div className={styles.sidebarSectionTitle}>AI分组</div>
        <div className={styles.sidebarList}>
          {aiGroup.map(item => (
            <div
              key={item.key}
              className={`${styles.sidebarItem} ${activeFilter === item.key ? styles.sidebarItemActive : ''}`}
              onClick={() => { setActiveFilter(item.key); setShowGroupMenu(false); }}
            >
              <span className={styles.sidebarItemIcon}>{item.icon}</span>
              <span className={styles.sidebarItemLabel}>{item.label}</span>
              {item.count > 0 && <span className={styles.sidebarItemCount}>{item.count}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main List Area */}
      <div className={styles.mainArea}>
        {/* Top Tabs */}
        <div className={styles.topTabs}>
          <div
            className={`${styles.topTab} ${chatType === 'all' ? styles.topTabActive : ''}`}
            onClick={() => setChatType('all')}
          >全部</div>
          <div
            className={`${styles.topTab} ${chatType === 'single' ? styles.topTabActive : ''}`}
            onClick={() => setChatType('single')}
          >单聊</div>
          <div
            className={`${styles.topTab} ${chatType === 'group' ? styles.topTabActive : ''}`}
            onClick={() => setChatType('group')}
          >群聊</div>
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <button className={styles.menuToggleBtn} onClick={() => setShowGroupMenu(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="查找联系人"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm ? (
              <button className={styles.clearBtn} onClick={() => setSearchTerm('')}>✕</button>
            ) : (
              <svg className={styles.searchIconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            )}
          </div>
        </div>

        {/* Customer List */}
        <div className={styles.customerList}>
          {isLoadingCustomers ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer, index) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                style={{ animationDelay: `${index * 60}ms` }}
                selectable={isSelectionMode}
                selected={selectedIds.has(customer.id)}
                onSelectToggle={handleToggleSelect}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📋</span>
              <p className={styles.emptyText}>没有消息</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className={`${styles.batchActionBar} animate-slideInUp`}>
          <span className={styles.batchCount}>已选择 <strong>{selectedIds.size}</strong> 位客户</span>
          <div className={styles.batchActions}>
            <button className={styles.batchBtnSecondary} onClick={() => toast('批量打标签功能即将上线')}>批量打标签</button>
            <button className={styles.batchBtnPrimary} onClick={handleBatchWakeup}>💫 发送SOP唤醒</button>
          </div>
        </div>
      )}
    </div>
  );
}
