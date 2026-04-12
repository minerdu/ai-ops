'use client';

import { useState } from 'react';
import useStore from '@/lib/store';
import { useToast } from '@/components/common/Toast';
import RadarChart from '@/components/customer/RadarChart';
import styles from './CustomerDetail.module.css';

const tagClassMap = {
  lifecycle: 'tagLifecycle',
  intent: 'tagIntent',
  risk: 'tagRisk',
  status: 'tagStatus',
  custom: 'tagCustom',
};

const EMPTY_ARRAY = [];

export default function CustomerDetail({ customerId, onClose }) {
  const [activeTab, setActiveTab] = useState('detail');
  const [taskTab, setTaskTab] = useState('tasks');
  const [descExpanded, setDescExpanded] = useState(true);
  const [scoreExpanded, setScoreExpanded] = useState(true);
  const [showTagModal, setShowTagModal] = useState(false);
  const [isRefreshingInsight, setIsRefreshingInsight] = useState(false);
  const toast = useToast();

  const customer = useStore(s => s.customers.find(c => c.id === customerId));
  const messages = useStore(s => s.allMessages[customerId] || EMPTY_ARRAY);
  
  // TODO: Fetch real tasks from backend when ready, or use mock if not in store yet
  const tasks = []; // For now empty to prevent crash, since tasks are not in Zustand right now

  if (!customer) {
    return (
      <div className={styles.notFound}>
        <span>😕</span>
        <p>未找到客户信息</p>
      </div>
    );
  }

  const scores = [
    { label: '价值度', value: customer.valueScore || 0, color: '#FF4D4F' },
    { label: '跟进度', value: customer.intentScore || 0, color: '#1677FF' },
    { label: '需求度', value: customer.demandScore || 3.5, color: '#52C41A' },
    { label: '满意度', value: customer.satisfactionScore || 0, color: '#FF8C00' },
    { label: '关系程度', value: customer.relationScore || 3.0, color: '#7C3AED' },
  ];

  const radarScores = {
    '价值度': customer.valueScore || 0,
    '意向度': customer.intentScore || 0,
    '需求度': customer.demandScore || 3.5,
    '满意度': customer.satisfactionScore || 0,
    '关系度': customer.relationScore || 3.0,
  };

  const lastInteraction = customer.lastInteractionAt
    ? new Date(customer.lastInteractionAt).toLocaleString('zh-CN')
    : '暂无';

  return (
    <div className={styles.detailPanel}>
      {/* Header */}
      <div className={styles.header}>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        )}
        <div className={styles.headerTitle}>客户画像</div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.detailContent}>
          {/* Stats Row */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>对话总数</span>
              <span className={styles.statValue}>{messages.length}条</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>最后对话</span>
              <span className={styles.statValue}>{lastInteraction}</span>
            </div>
          </div>

          {/* Description */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <button
                className={styles.sectionHeaderBtn}
                onClick={() => setDescExpanded(!descExpanded)}
              >
                <span className={styles.sectionTitle}>
                  {descExpanded ? '▾' : '▸'} AI 核心洞察
                </span>
              </button>
              <button 
                className={styles.iconBtn} 
                title="重新生成分析"
                onClick={() => {
                  setIsRefreshingInsight(true);
                  setTimeout(() => setIsRefreshingInsight(false), 1500);
                }}
              >
                <span className={`${isRefreshingInsight ? styles.spin : ''}`}>🔄</span>
              </button>
            </div>
            {descExpanded && (
              <div className={styles.sectionBody}>
                {isRefreshingInsight ? (
                  <p className={styles.descText}>重新分析中...</p>
                ) : (
                  <p className={styles.descText}>{customer.aiSummary || '暂无AI洞察分析'}</p>
                )}
              </div>
            )}
          </div>

          {/* Scores */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <button
                className={styles.sectionHeaderBtn}
                onClick={() => setScoreExpanded(!scoreExpanded)}
              >
                <span className={styles.sectionTitle}>
                  {scoreExpanded ? '▾' : '▸'} 客户评分
                </span>
              </button>
            </div>
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
              <button className={styles.iconBtn} onClick={() => setShowTagModal(true)}>➕</button>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.tagList}>
                {customer.tags && customer.tags.map((tag, i) => (
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


          {/* CRM Records */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>💰 门店 CRM 消费记录</span>
            </div>
            <div className={styles.sectionBody}>
              {customer.crmHistory && customer.crmHistory.length > 0 ? (
                <div className={styles.crmList}>
                  {customer.crmHistory.map((record, index) => (
                    <div key={index} className={styles.crmItem}>
                      <div className={styles.crmDate}>{record.date}</div>
                      <div className={styles.crmInfo}>
                        <div className={styles.crmProduct}>{record.product}</div>
                        <div className={styles.crmAmount}>¥{record.amount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyCrm}>暂无门店消费记录</div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.section}>
             <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>⚡ AI 自主执行记录 (Timeline)</span>
            </div>
             <div className={styles.sectionBody}>
                <div className={styles.timeline}>
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDot}></div>
                    <div className={styles.timelineLine}></div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTime}>今天 10:30</div>
                      <div className={styles.timelineText}>AI系统自主研判该客户具备高消费潜力，已<b>自动赋予[高意向人群]标签</b>。</div>
                    </div>
                  </div>
                  {customer.intentScore >= 4.0 && (
                    <div className={styles.timelineItem}>
                      <div className={`${styles.timelineDot} ${styles.timelineDotPrimary}`}></div>
                      <div className={styles.timelineLine}></div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTime}>昨天 18:20</div>
                        <div className={styles.timelineText}>触发 SOP <b>“私密养护潜客激活预案”</b>，AI系统已全自动下发专属图文卡片。</div>
                      </div>
                    </div>
                  )}
                  <div className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${styles.timelineDotGray}`}></div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTime}>昨天 16:45</div>
                      <div className={styles.timelineText}>在企微公海资源池中，被 AI 助理全自动接入并建立初始档案。</div>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {showTagModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTagModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>打标签申请</h3>
              <button className={styles.iconBtn} onClick={() => setShowTagModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.tagInputRow}>
                <input type="text" placeholder="输入你想打的标签（如：高净值）" className={styles.tagInput} />
              </div>
              <div className={styles.aiAnalysisBox}>
                <h4>🤖 AI 标签准入分析评估</h4>
                <p>当前并未收集到足够特征证明客户为“高净值”（未谈及资产、无历史高消费记录）。提交此标签可能影响画像准确度，确定要申请添加并进入审核流吗？</p>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowTagModal(false)}>取消</button>
                <button className={styles.submitBtn} onClick={() => { toast.success('已提交申请给管理员'); setShowTagModal(false); }}>提交审批</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
