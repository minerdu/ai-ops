'use client';

import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/components/common/Toast';
import { TaskCardSkeleton } from '@/components/common/Skeleton';
import styles from './page.module.css';
import MaterialSelector from '@/components/common/MaterialSelector';

const tabs = [
  { key: 'pending', label: '待审批' },
  { key: 'approved', label: '待执行' },
  { key: 'executed', label: '已执行' },
  { key: 'rejected', label: '已驳回' },
];

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  const [selectedTask, setSelectedTask] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editTime, setEditTime] = useState('');
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);

  useEffect(() => {
    fetchTasks();
    setIsBatchMode(false);
    setSelectedTaskIds(new Set());
  }, [activeTab]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
      toast.error('加载任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  const syncTaskUpdate = async (id, action, updateData = null) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, updateData })
      });
      if (res.ok) {
        fetchTasks();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Update failed:', e);
      toast.error('操作失败，请重试');
      return false;
    }
  };

  // Stats computed from tasks
  const stats = useMemo(() => ({
    pending: tasks.filter(t => t.approvalStatus === 'pending').length,
    toExecute: tasks.filter(t => t.approvalStatus === 'approved' && t.executeStatus === 'scheduled').length,
    completed: tasks.filter(t => t.executeStatus === 'success').length,
    rejected: tasks.filter(t => t.approvalStatus === 'rejected').length,
    rejectRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.approvalStatus === 'rejected').length / tasks.length) * 100) : 0,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return tasks.filter(t => t.approvalStatus === 'pending');
      case 'approved':
        return tasks.filter(t => t.approvalStatus === 'approved' && t.executeStatus !== 'success');
      case 'executed':
        return tasks.filter(t => t.executeStatus === 'success');
      case 'rejected':
        return tasks.filter(t => t.approvalStatus === 'rejected');
      default:
        return tasks;
    }
  }, [activeTab, tasks]);

  const handleApprove = async (taskId) => {
    const ok = await syncTaskUpdate(taskId, 'approve');
    if (ok) toast.success('任务已通过审批');
  };

  const handleReject = async (taskId) => {
    const reason = prompt('请输入驳回原因：');
    if (reason) {
      const ok = await syncTaskUpdate(taskId, 'reject', { rejectReason: reason });
      if (ok) {
        toast('任务已驳回');
        setSelectedTask(null);
      }
    }
  };

  const handleEditApprove = async (taskId) => {
    const ok = await syncTaskUpdate(taskId, 'approve', {
        content: editContent,
        scheduledAt: editTime ? new Date(editTime).toISOString() : undefined,
    });
    if (ok) {
      toast.success('编辑后通过，任务已安排执行');
      setSelectedTask(null);
    }
  };

  const handleExecuteNow = async (taskId) => {
    if (confirm('确认立即执行此任务？执行后不可撤回。')) {
      const ok = await syncTaskUpdate(taskId, 'execute');
      if (ok) toast.success('任务已执行');
    }
  };

  const handleCancel = async (taskId) => {
    const ok = await syncTaskUpdate(taskId, 'cancel');
    if (ok) toast('任务已取消');
  };

  const handleToggleSelectId = (id) => {
    setSelectedTaskIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleBatchApprove = async () => {
    if (selectedTaskIds.size === 0) return;
    if (confirm(`确认批量通过 ${selectedTaskIds.size} 个工单？`)) {
        const promises = Array.from(selectedTaskIds).map(id => syncTaskUpdate(id, 'approve'));
        await Promise.all(promises);
        toast.success(`已批量通过 ${selectedTaskIds.size} 个任务`);
        setIsBatchMode(false);
        setSelectedTaskIds(new Set());
    }
  };

  const openDetail = (task) => {
    setSelectedTask(task);
    setEditContent(task.content);
    setEditTime(task.scheduledAt ? new Date(task.scheduledAt).toISOString().slice(0, 16) : '');
  };

  const typeLabels = { text: '文本消息', combo: '组合消息', image: '图片消息', video: '视频消息' };
  const sourceLabels = { sop: 'SOP触发', ai: 'AI生成', manual: '手动创建' };

  return (
    <div className={styles.tasksPage}>
      {/* Stats Cards */}
      <div className={styles.statsRow}>
        <div className={`${styles.statCard} ${styles.statPending}`}>
          <span className={styles.statValue}>{stats.pending}</span>
          <span className={styles.statLabel}>待审批</span>
        </div>
        <div className={`${styles.statCard} ${styles.statExecute}`}>
          <span className={styles.statValue}>{stats.toExecute}</span>
          <span className={styles.statLabel}>待执行</span>
        </div>
        <div className={`${styles.statCard} ${styles.statDone}`}>
          <span className={styles.statValue}>{stats.completed}</span>
          <span className={styles.statLabel}>已完成</span>
        </div>
        <div className={`${styles.statCard} ${styles.statReject}`}>
          <span className={styles.statValue}>{stats.rejectRate}%</span>
          <span className={styles.statLabel}>驳回率</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
            disabled={isBatchMode}
          >
            {tab.label}
            {tab.key === 'pending' && stats.pending > 0 && (
              <span className={styles.tabBadge}>{stats.pending}</span>
            )}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {activeTab === 'pending' && (
            <button 
                className={styles.tab}
                style={{ marginLeft: '16px', background: isBatchMode ? 'var(--color-bg-page)' : 'transparent' }}
                onClick={() => {
                    setIsBatchMode(!isBatchMode);
                    if (!isBatchMode) {
                        setSelectedTaskIds(new Set());
                    }
                }}
            >
                {isBatchMode ? '退出批量' : '批量审批'}
            </button>
        )}
      </div>

      {/* Task List */}
      <div className={styles.taskList}>
        {isLoading ? (
            <>
              <TaskCardSkeleton />
              <TaskCardSkeleton />
              <TaskCardSkeleton />
            </>
        ) : filteredTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>
              {activeTab === 'pending' ? '✅' : activeTab === 'rejected' ? '🚫' : '📋'}
            </span>
            <p>暂无{tabs.find(t => t.key === activeTab)?.label}任务</p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <div
              key={task.id}
              className={`${styles.taskCard} animate-fadeInUp ${selectedTaskIds.has(task.id) ? styles.selectedTask : ''}`}
              style={{ animationDelay: `${index * 60}ms` }}
              onClick={() => {
                  if (isBatchMode) {
                      handleToggleSelectId(task.id);
                  } else {
                      openDetail(task);
                  }
              }}
            >
              <div className={styles.taskHeader}>
                <div className={styles.taskTitleRow}>
                  {isBatchMode && (
                      <input 
                          type="checkbox" 
                          checked={selectedTaskIds.has(task.id)}
                          readOnly
                          style={{ marginRight: '12px', transform: 'scale(1.2)' }}
                      />
                  )}
                  <span className={styles.taskAvatar}>
                    {task.customerName ? task.customerName.slice(-2) : 'A'}
                  </span>
                  <div className={styles.taskTitleInfo}>
                    <h3 className={styles.taskTitle}>{task.title}</h3>
                    <span className={styles.taskMeta}>
                      {sourceLabels[task.triggerSource] || '未知'} · {typeLabels[task.taskType] || task.taskType}
                    </span>
                  </div>
                </div>
                {task.approvalStatus === 'pending' && (
                  <span className={styles.statusBadgePending}>待审批</span>
                )}
                {task.approvalStatus === 'approved' && task.executeStatus === 'scheduled' && (
                  <span className={styles.statusBadgeScheduled}>待执行</span>
                )}
                {task.executeStatus === 'success' && (
                  <span className={styles.statusBadgeSuccess}>已完成</span>
                )}
                {task.approvalStatus === 'rejected' && (
                  <span className={styles.statusBadgeRejected}>已驳回</span>
                )}
              </div>

              <div className={styles.aiReason}>
                <span className={styles.aiReasonIcon}>🤖</span>
                <p className={styles.aiReasonText}>{task.triggerReason || '无分析说明'}</p>
              </div>

              <div className={styles.messagePreview}>
                <p>{task.content}</p>
              </div>

              <div className={styles.taskFooter}>
                <span className={styles.taskTime}>
                  ⏰ {task.scheduledAt ? new Date(task.scheduledAt).toLocaleString('zh-CN', {
                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '未定'}
                </span>
                <span className={styles.taskCustomer}>
                  📤 发送给 {task.customerName || '未知'}
                </span>
              </div>

              {task.rejectReason && (
                <div className={styles.rejectReason}>
                  <span>⚠️ 驳回原因：</span> {task.rejectReason}
                </div>
              )}

              {task.approvalStatus === 'pending' && (
                <div className={styles.taskActions} onClick={e => e.stopPropagation()}>
                  <button className={styles.btnApprove} onClick={() => handleApprove(task.id)}>
                    ✅ 通过
                  </button>
                  <button className={styles.btnEditApprove} onClick={() => openDetail(task)}>
                    ✏️ 编辑后通过
                  </button>
                  <button className={styles.btnReject} onClick={() => handleReject(task.id)}>
                    ❌ 驳回
                  </button>
                </div>
              )}
              {task.approvalStatus === 'approved' && task.executeStatus === 'scheduled' && (
                <div className={styles.taskActions} onClick={e => e.stopPropagation()}>
                  <button className={styles.btnApprove} onClick={() => handleExecuteNow(task.id)}>
                    🚀 立即执行
                  </button>
                  <button className={styles.btnEditApprove}>
                    ⏰ 调整时间
                  </button>
                  <button className={styles.btnReject} onClick={() => handleCancel(task.id)}>
                    ❌ 取消任务
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isBatchMode && activeTab === 'pending' && selectedTaskIds.size > 0 && (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-bg-card)',
            padding: '12px 24px',
            borderRadius: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 1000,
            border: '1px solid var(--color-border)',
        }}>
           <span style={{ fontSize: '14px' }}>已选 <strong>{selectedTaskIds.size}</strong> 项</span>
           <button 
             style={{ 
                 background: 'var(--color-primary)', border: 'none', color: 'white', 
                 padding: '6px 16px', borderRadius: '20px', cursor: 'pointer' 
             }}
             onClick={handleBatchApprove}
           >
               ✅ 批量通过
           </button>
        </div>
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedTask(null)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3>编辑消息任务</h3>
              <button className={styles.drawerClose} onClick={() => setSelectedTask(null)}>✕</button>
            </div>
            <div className={styles.drawerBody}>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel}>客户</label>
                <div className={styles.drawerCustomer}>
                  <span className={styles.drawerAvatar}>{selectedTask.customerName ? selectedTask.customerName.slice(-2) : 'A'}</span>
                  <span>{selectedTask.customerName}</span>
                </div>
              </div>

              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel}>🤖 AI分析说明</label>
                <div className={styles.drawerAiBox}>
                  <p>{selectedTask.triggerReason}</p>
                  <span className={styles.drawerAiMeta}>
                    {sourceLabels[selectedTask.triggerSource] || '未知'} · 
                    {selectedTask.scheduledAt && new Date(selectedTask.scheduledAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>

              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel}>消息内容</label>
                <textarea
                  className={styles.drawerTextarea}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={5}
                />
                <div className={styles.drawerContentActions}>
                  <button className={styles.drawerSmallBtn} onClick={() => setShowMaterialSelector(true)}>📎 素材库</button>
                  <button className={styles.drawerSmallBtn}>✏️ 输入消息</button>
                </div>
              </div>

              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel}>发送时间</label>
                <input
                  type="datetime-local"
                  className={styles.drawerTimeInput}
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                />
              </div>
            </div>

            {selectedTask.approvalStatus === 'pending' && (
              <div className={styles.drawerActions}>
                <button
                  className={styles.drawerBtnPrimary}
                  onClick={() => handleEditApprove(selectedTask.id)}
                >
                  ✅ 编辑后通过
                </button>
                <button
                  className={styles.drawerBtnDanger}
                  onClick={() => handleReject(selectedTask.id)}
                >
                  ❌ 驳回
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showMaterialSelector && (
        <MaterialSelector 
          onClose={() => setShowMaterialSelector(false)} 
          onSelect={(m) => {
             const addition = m.type === 'text' ? m.content : `[插入附件：${m.title}]`;
             setEditContent(prev => prev ? prev + '\n' + addition : addition);
             setShowMaterialSelector(false);
             toast.success('素材已插入');
          }}
        />
      )}
    </div>
  );
}
