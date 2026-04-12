'use client';

import { useState } from 'react';
import useStore from '@/lib/store';
import { useToast } from '@/components/common/Toast';
import RadarChart from '@/components/customer/RadarChart';
import styles from './CustomerDetail.module.css';

const EMPTY_ARRAY = [];

// Helper: Member level color mapping
const levelColors = {
  V1: { bg: '#f0f5ff', text: '#1677FF', border: '#91caff' },
  V2: { bg: '#e6fffb', text: '#13C2C2', border: '#87e8de' },
  V3: { bg: '#fff7e6', text: '#FA8C16', border: '#ffd591' },
  V4: { bg: '#fff1f0', text: '#FF4D4F', border: '#ffa39e' },
  V5: { bg: '#f9f0ff', text: '#722ED1', border: '#d3adf7' },
  V6: { bg: '#fff0f6', text: '#EB2F96', border: '#ffadd2' },
};

export default function CustomerDetail({ customerId, onClose }) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [scoreExpanded, setScoreExpanded] = useState(false);
  const [crmExpanded, setCrmExpanded] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [isRefreshingInsight, setIsRefreshingInsight] = useState(false);
  const toast = useToast();

  const customer = useStore(s => s.customers.find(c => c.id === customerId));
  const messages = useStore(s => s.allMessages[customerId] || EMPTY_ARRAY);

  if (!customer) {
    return (
      <div className={styles.notFound}>
        <span>😕</span>
        <p>未找到客户信息</p>
      </div>
    );
  }

  // Parse CRM JSON
  let crm = null;
  if (customer.crmHistory) {
    try {
      crm = typeof customer.crmHistory === 'string' ? JSON.parse(customer.crmHistory) : customer.crmHistory;
      if (Array.isArray(crm)) crm = { consumptionRecords: crm };
    } catch (e) { crm = null; }
  }

  const scores = [
    { label: '价值', value: customer.valueScore || 0, color: '#FF4D4F' },
    { label: '跟进', value: customer.intentScore || 0, color: '#1677FF' },
    { label: '需求', value: customer.demandScore || 3.5, color: '#52C41A' },
    { label: '满意', value: customer.satisfactionScore || 0, color: '#FF8C00' },
    { label: '关系', value: customer.relationScore || 3.0, color: '#7C3AED' },
  ];

  const radarScores = {
    '价值': customer.valueScore || 0,
    '意向': customer.intentScore || 0,
    '需求': customer.demandScore || 3.5,
    '满意': customer.satisfactionScore || 0,
    '关系': customer.relationScore || 3.0,
  };

  const memberLevel = crm?.memberLevel || '未分级';
  const levelStyle = levelColors[memberLevel] || { bg: '#f5f5f5', text: '#999', border: '#d9d9d9' };

  return (
    <div className={styles.detailPanel}>
      {/* Header */}
      <div className={styles.header}>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        )}
        <div className={styles.headerTitle}>客户画像</div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.detailContent}>

          {/* === Row 1: Level + Stats (compact horizontal) === */}
          <div className={styles.memberHeader}>
            <div className={styles.memberBadge} style={{ background: levelStyle.bg, color: levelStyle.text, borderColor: levelStyle.border }}>
              <span className={styles.memberLevel}>{memberLevel}</span>
            </div>
            <div className={styles.memberStats}>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>¥{(crm?.totalSpent || 0).toLocaleString()}</span>
                <span className={styles.memberStatLabel}>消费</span>
              </div>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{crm?.visitCount || 0}</span>
                <span className={styles.memberStatLabel}>到店</span>
              </div>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{crm?.points || 0}</span>
                <span className={styles.memberStatLabel}>积分</span>
              </div>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{messages.length}</span>
                <span className={styles.memberStatLabel}>对话</span>
              </div>
            </div>
          </div>

          {/* === Row 2: Key Info (inline, no card wrapper) === */}
          {crm?.basicInfo && (
            <div className={styles.infoRow}>
              <span className={styles.infoChip}>📅 {crm.basicInfo.birthday}</span>
              <span className={styles.infoChip}>👤 {crm.basicInfo.age}岁</span>
              <span className={styles.infoChip}>💼 {crm.basicInfo.occupation}</span>
              <span className={styles.infoChip}>📍 {crm.basicInfo.address}</span>
              <span className={styles.infoChip}>🧴 {crm.basicInfo.skinType}</span>
              {crm.basicInfo.allergies !== '无' && <span className={styles.infoChipWarn}>⚠️ {crm.basicInfo.allergies}</span>}
              {crm.memberSince && <span className={styles.infoChip}>🎫 入会 {crm.memberSince}</span>}
              {crm.lastVisitDate && <span className={styles.infoChip}>🕐 最近 {crm.lastVisitDate}</span>}
            </div>
          )}

          {/* === Row 3: Preferences (compact horizontal) === */}
          {crm?.preferences && (
            <div className={styles.prefRow}>
              <span className={styles.prefChip}>👩‍🔬 {crm.preferences.preferredTech}</span>
              <span className={styles.prefChip}>🕐 {crm.preferences.preferredTime}</span>
              <span className={styles.prefChip}>💬 {crm.preferences.communicationStyle}</span>
              {crm.preferences.preferredProjects.map((p, i) => (
                <span key={i} className={styles.prefChipPrimary}>{p}</span>
              ))}
            </div>
          )}
          {crm?.preferences?.notes && (
            <div className={styles.noteBar}>📋 {crm.preferences.notes}</div>
          )}

          {/* === Row 4: Tags — flat, compact, inline flow === */}
          <div className={styles.tagSection}>
            <div className={styles.tagHeader}>
              <span className={styles.tagTitle}>🏷️ 标签 ({customer.tags?.length || 0})</span>
              <button className={styles.iconBtn} onClick={() => setShowTagModal(true)}>➕</button>
            </div>
            <div className={styles.tagFlow}>
              {customer.tags && customer.tags.map((tag, i) => (
                <span
                  key={i}
                  className={styles.tagChip}
                  style={{ background: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>

          {/* === Row 5: AI Insight (collapsed by default) === */}
          <div className={styles.collapseSection}>
            <button className={styles.collapseBtn} onClick={() => setDescExpanded(!descExpanded)}>
              <span>{descExpanded ? '▾' : '▸'} 🤖 AI 洞察</span>
              <button 
                className={styles.iconBtn} 
                title="重新生成"
                onClick={(e) => { e.stopPropagation(); setIsRefreshingInsight(true); setTimeout(() => setIsRefreshingInsight(false), 1500); }}
              >
                <span className={`${isRefreshingInsight ? styles.spin : ''}`}>🔄</span>
              </button>
            </button>
            {descExpanded && (
              <div className={styles.collapseBody}>
                {isRefreshingInsight ? '分析中...' : (customer.aiSummary || '暂无')}
              </div>
            )}
          </div>

          {/* === Row 6: Scores (collapsed by default) === */}
          <div className={styles.collapseSection}>
            <button className={styles.collapseBtn} onClick={() => setScoreExpanded(!scoreExpanded)}>
              <span>{scoreExpanded ? '▾' : '▸'} 📊 评分</span>
            </button>
            {scoreExpanded && (
              <div className={styles.collapseBody}>
                <div className={styles.scoreRow}>
                  {scores.map((s) => (
                    <span key={s.label} className={styles.scoreBadge} style={{ background: `${s.color}12`, color: s.color }}>
                      {s.label} {s.value.toFixed(1)}
                    </span>
                  ))}
                </div>
                <div className={styles.radarCenter}>
                  <RadarChart scores={radarScores} size={120} />
                </div>
              </div>
            )}
          </div>

          {/* === Row 7: Consumption Records (collapsed by default) === */}
          <div className={styles.collapseSection}>
            <button className={styles.collapseBtn} onClick={() => setCrmExpanded(!crmExpanded)}>
              <span>{crmExpanded ? '▾' : '▸'} 💰 消费记录 ({crm?.consumptionRecords?.length || 0})</span>
            </button>
            {crmExpanded && (
              <div className={styles.collapseBody}>
                {crm?.consumptionRecords && crm.consumptionRecords.length > 0 ? (
                  <div className={styles.crmList}>
                    {crm.consumptionRecords.map((record, index) => (
                      <div key={index} className={styles.crmItem}>
                        <div className={styles.crmItemLeft}>
                          <div className={styles.crmProduct}>{record.product}</div>
                          <div className={styles.crmMeta}>
                            {record.date}
                            {record.technician && ` · ${record.technician}`}
                            {record.satisfaction && ` · ${'⭐'.repeat(record.satisfaction)}`}
                          </div>
                        </div>
                        <div className={styles.crmAmount}>¥{record.amount.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyCrm}>暂无消费记录</div>
                )}
              </div>
            )}
          </div>

          {/* === Row 8: AI Timeline (collapsed) === */}
          <div className={styles.collapseSection}>
            <button className={styles.collapseBtn} onClick={() => {}}>
              <span>⚡ AI 执行记录</span>
            </button>
            <div className={styles.collapseBody}>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTime}>今天 10:30</span>
                    <span className={styles.timelineText}>AI 自动赋予 <b>[高意向]</b> 标签</span>
                  </div>
                </div>
                {customer.intentScore >= 4.0 && (
                  <div className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${styles.timelineDotWarn}`}></div>
                    <div className={styles.timelineContent}>
                      <span className={styles.timelineTime}>昨天 18:20</span>
                      <span className={styles.timelineText}>触发 SOP <b>"潜客激活"</b> 自动下发图文</span>
                    </div>
                  </div>
                )}
                <div className={styles.timelineItem}>
                  <div className={`${styles.timelineDot} ${styles.timelineDotGray}`}></div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTime}>昨天 16:45</span>
                    <span className={styles.timelineText}>AI 自动接入并建立初始档案</span>
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
                <input type="text" placeholder="输入标签名称（如：高净值）" className={styles.tagInput} />
              </div>
              <div className={styles.aiAnalysisBox}>
                <h4>🤖 AI 分析评估</h4>
                <p>当前未收集到足够特征，确定要申请添加并进入审核流吗？</p>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowTagModal(false)}>取消</button>
                <button className={styles.submitBtn} onClick={() => { toast.success('已提交审批'); setShowTagModal(false); }}>提交</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
