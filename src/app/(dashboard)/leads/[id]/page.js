'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mockCustomers, mockMessages, mockTasks } from '@/lib/mockData';
import RadarChart from '@/components/customer/RadarChart';
import styles from './page.module.css';

const tagClassMap = {
  lifecycle: 'tagLifecycle',
  intent: 'tagIntent',
  risk: 'tagRisk',
  status: 'tagStatus',
  custom: 'tagCustom',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('detail');
  const [taskTab, setTaskTab] = useState('tasks');
  const [descExpanded, setDescExpanded] = useState(true);
  const [scoreExpanded, setScoreExpanded] = useState(true);

  const customer = mockCustomers.find(c => c.id === params.id);
  const messages = mockMessages[params.id] || [];
  const tasks = mockTasks.filter(t => t.customerId === params.id);

  if (!customer) {
    return (
      <div className={styles.notFound}>
        <span>😕</span>
        <p>客户不存在</p>
        <button onClick={() => router.back()} className="btn-secondary">返回</button>
      </div>
    );
  }

  const scores = [
    { label: '价值度', value: customer.valueScore, color: '#FF4D4F' },
    { label: '跟进度', value: customer.intentScore, color: '#1677FF' },
    { label: '需求度', value: customer.demandScore, color: '#52C41A' },
    { label: '满意度', value: customer.satisfactionScore, color: '#FF8C00' },
    { label: '关系程度', value: customer.relationScore, color: '#7C3AED' },
  ];

  const radarScores = {
    '价值度': customer.valueScore,
    '意向度': customer.intentScore,
    '需求度': customer.demandScore,
    '满意度': customer.satisfactionScore,
    '关系度': customer.relationScore,
  };

  const lastInteraction = customer.lastInteractionAt
    ? new Date(customer.lastInteractionAt).toLocaleString('zh-CN')
    : '暂无';

  return (
    <div className={styles.detailPage}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          ← 
        </button>
        <div className={styles.headerAvatar}>
          <span>{customer.name.slice(-2)}</span>
        </div>
        <h2 className={styles.headerName}>{customer.name}</h2>
      </div>

      {/* Tab Switch */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'detail' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('detail')}
        >
          客户详情
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          AI对话
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeTab === 'detail' ? (
          <div className={styles.detailContent}>
            {/* Stats Row */}
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>对话总数</span>
                <span className={styles.statValue}>{messages.length}条</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>平均响应时间</span>
                <span className={styles.statValue}>28秒</span>
              </div>
              <div className={styles.refreshBtn}>
                <span>🔄</span>
                <span>更新</span>
              </div>
            </div>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>最后对话时间</span>
                <span className={styles.statValue}>{lastInteraction}</span>
              </div>
            </div>

            {/* Description */}
            <div className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => setDescExpanded(!descExpanded)}
              >
                <span className={styles.sectionTitle}>
                  {descExpanded ? '▾' : '▸'} 客户描述
                </span>
              </button>
              {descExpanded && (
                <div className={styles.sectionBody}>
                  <p className={styles.descText}>{customer.aiSummary}</p>
                </div>
              )}
            </div>

            {/* Scores */}
            <div className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => setScoreExpanded(!scoreExpanded)}
              >
                <span className={styles.sectionTitle}>
                  {scoreExpanded ? '▾' : '▸'} 客户评分
                </span>
              </button>
              {scoreExpanded && (
                <div className={styles.sectionBody}>
                  <div className={styles.scoreGrid}>
                    {scores.map((s) => (
                      <span
                        key={s.label}
                        className={styles.scoreBadge}
                        style={{
                          background: `${s.color}12`,
                          color: s.color,
                          borderColor: `${s.color}30`,
                        }}
                      >
                        {s.label} {s.value.toFixed(1)}
                      </span>
                    ))}
                  </div>
                  <div className={styles.radarCenter}>
                    <RadarChart scores={radarScores} size={140} />
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>客户标签</span>
                <span className={styles.autoTagLabel}>自动打标签</span>
                <button className={styles.editIcon}>✏️</button>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.tagList}>
                  {customer.tags.map((tag, i) => (
                    <span
                      key={i}
                      className={`${styles.tag} ${styles[tagClassMap[tag.category]] || styles.tagCustom}`}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className={styles.section}>
              <div className={styles.taskTabBar}>
                <button
                  className={`${styles.taskTabBtn} ${taskTab === 'tasks' ? styles.taskTabActive : ''}`}
                  onClick={() => setTaskTab('tasks')}
                >
                  跟进任务
                </button>
                <button
                  className={`${styles.taskTabBtn} ${taskTab === 'approval' ? styles.taskTabActive : ''}`}
                  onClick={() => setTaskTab('approval')}
                >
                  任务审批
                  {tasks.filter(t => t.approvalStatus === 'pending').length > 0 && (
                    <span className={styles.taskBadge}>
                      {tasks.filter(t => t.approvalStatus === 'pending').length}
                    </span>
                  )}
                </button>
              </div>
              <div className={styles.sectionBody}>
                <button className={styles.addTaskBtn}>＋ 新建任务</button>
                {tasks.length > 0 ? (
                  <div className={styles.taskList}>
                    {tasks.map((task) => (
                      <div key={task.id} className={styles.taskItem}>
                        <div className={styles.taskTime}>
                          {new Date(task.scheduledAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className={styles.taskInfo}>
                          <span className={styles.taskTitle}>{task.title}</span>
                          <span className={styles.taskDesc}>{task.content?.slice(0, 50)}...</span>
                        </div>
                        <span className={`${styles.taskStatus} ${
                          task.approvalStatus === 'pending' ? styles.statusPending :
                          task.approvalStatus === 'approved' ? styles.statusApproved : ''
                        }`}>
                          {task.approvalStatus === 'pending' ? '待审批' : '已通过'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyTask}>暂无跟进任务</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.chatContent}>
            {messages.length > 0 ? (
              <div className={styles.chatList}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`${styles.chatMsg} ${msg.direction === 'inbound' ? styles.chatInbound : styles.chatOutbound}`}>
                    <div className={styles.chatBubble}>
                      {msg.senderType === 'ai' && <span className={styles.chatAiTag}>🤖 AI</span>}
                      <p>{msg.content}</p>
                      <span className={styles.chatTime}>
                        {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyChat}>
                <p>暂无对话记录</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
