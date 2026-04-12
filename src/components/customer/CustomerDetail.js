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
  value: 'tagValue',
  preference: 'tagPreference',
  behavior: 'tagBehavior',
  demographic: 'tagDemographic',
  source: 'tagSource',
};

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
  const [activeTab, setActiveTab] = useState('detail');
  const [descExpanded, setDescExpanded] = useState(true);
  const [scoreExpanded, setScoreExpanded] = useState(true);
  const [basicInfoExpanded, setBasicInfoExpanded] = useState(true);
  const [crmExpanded, setCrmExpanded] = useState(true);
  const [prefExpanded, setPrefExpanded] = useState(true);
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
      // Handle old format (array of records)
      if (Array.isArray(crm)) {
        crm = { consumptionRecords: crm };
      }
    } catch (e) {
      crm = null;
    }
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

  const memberLevel = crm?.memberLevel || '未分级';
  const levelStyle = levelColors[memberLevel] || { bg: '#f5f5f5', text: '#999', border: '#d9d9d9' };

  // Group tags by category for display
  const tagsByCategory = {};
  if (customer.tags) {
    customer.tags.forEach(tag => {
      const cat = tag.category || 'custom';
      if (!tagsByCategory[cat]) tagsByCategory[cat] = [];
      tagsByCategory[cat].push(tag);
    });
  }

  const categoryLabels = {
    value: '💰 消费维度',
    intent: '🎯 意向维度',
    lifecycle: '🔄 生命周期',
    preference: '💝 偏好维度',
    behavior: '📊 行为维度',
    demographic: '👤 人群属性',
    source: '📍 来源维度',
    risk: '⚠️ 风险维度',
    custom: '🏷️ 自定义',
  };

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

          {/* Member Level Badge + Stats Row */}
          <div className={styles.memberHeader}>
            <div className={styles.memberBadge} style={{ background: levelStyle.bg, color: levelStyle.text, borderColor: levelStyle.border }}>
              <span className={styles.memberLevel}>{memberLevel}</span>
              <span className={styles.memberLabel}>会员</span>
            </div>
            <div className={styles.memberStats}>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>¥{(crm?.totalSpent || 0).toLocaleString()}</span>
                <span className={styles.memberStatLabel}>累计消费</span>
              </div>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{crm?.visitCount || 0}次</span>
                <span className={styles.memberStatLabel}>到店次数</span>
              </div>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{crm?.points || 0}</span>
                <span className={styles.memberStatLabel}>积分</span>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          {crm?.basicInfo && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <button className={styles.sectionHeaderBtn} onClick={() => setBasicInfoExpanded(!basicInfoExpanded)}>
                  <span className={styles.sectionTitle}>{basicInfoExpanded ? '▾' : '▸'} 👤 基本信息</span>
                </button>
              </div>
              {basicInfoExpanded && (
                <div className={styles.sectionBody}>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>年龄</span>
                      <span className={styles.infoValue}>{crm.basicInfo.age}岁</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>职业</span>
                      <span className={styles.infoValue}>{crm.basicInfo.occupation}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>住址</span>
                      <span className={styles.infoValue}>{crm.basicInfo.address}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>肤质</span>
                      <span className={styles.infoValue}>{crm.basicInfo.skinType}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>过敏史</span>
                      <span className={styles.infoValue}>{crm.basicInfo.allergies}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>生日</span>
                      <span className={styles.infoValue}>{crm.basicInfo.birthday}</span>
                    </div>
                    {crm.memberSince && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>入会日期</span>
                        <span className={styles.infoValue}>{crm.memberSince}</span>
                      </div>
                    )}
                    {crm.lastVisitDate && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>最近到店</span>
                        <span className={styles.infoValue}>{crm.lastVisitDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer Preferences */}
          {crm?.preferences && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <button className={styles.sectionHeaderBtn} onClick={() => setPrefExpanded(!prefExpanded)}>
                  <span className={styles.sectionTitle}>{prefExpanded ? '▾' : '▸'} 💝 客户偏好</span>
                </button>
              </div>
              {prefExpanded && (
                <div className={styles.sectionBody}>
                  <div className={styles.prefGrid}>
                    <div className={styles.prefItem}>
                      <span className={styles.prefIcon}>👩‍🔬</span>
                      <div className={styles.prefInfo}>
                        <span className={styles.prefLabel}>指定技师</span>
                        <span className={styles.prefValue}>{crm.preferences.preferredTech}</span>
                      </div>
                    </div>
                    <div className={styles.prefItem}>
                      <span className={styles.prefIcon}>🕐</span>
                      <div className={styles.prefInfo}>
                        <span className={styles.prefLabel}>偏好时段</span>
                        <span className={styles.prefValue}>{crm.preferences.preferredTime}</span>
                      </div>
                    </div>
                    <div className={styles.prefItem}>
                      <span className={styles.prefIcon}>💬</span>
                      <div className={styles.prefInfo}>
                        <span className={styles.prefLabel}>沟通方式</span>
                        <span className={styles.prefValue}>{crm.preferences.communicationStyle}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.prefProjects}>
                    <span className={styles.prefLabel}>偏好项目：</span>
                    <div className={styles.prefTagList}>
                      {crm.preferences.preferredProjects.map((p, i) => (
                        <span key={i} className={styles.prefTag}>{p}</span>
                      ))}
                    </div>
                  </div>
                  {crm.preferences.notes && (
                    <div className={styles.prefNotes}>
                      <span className={styles.prefNotesLabel}>📋 备注：</span>
                      {crm.preferences.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Insight */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <button
                className={styles.sectionHeaderBtn}
                onClick={() => setDescExpanded(!descExpanded)}
              >
                <span className={styles.sectionTitle}>
                  {descExpanded ? '▾' : '▸'} 🤖 AI 核心洞察
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
                  {scoreExpanded ? '▾' : '▸'} 📊 客户评分
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

          {/* Tags — Grouped by Category */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>🏷️ 客户标签 ({customer.tags?.length || 0})</span>
              <button className={styles.iconBtn} onClick={() => setShowTagModal(true)}>➕</button>
            </div>
            <div className={styles.sectionBody}>
              {Object.keys(tagsByCategory).length > 0 ? (
                <div className={styles.tagCategories}>
                  {Object.entries(tagsByCategory).map(([cat, tags]) => (
                    <div key={cat} className={styles.tagCategoryGroup}>
                      <span className={styles.tagCategoryLabel}>{categoryLabels[cat] || cat}</span>
                      <div className={styles.tagList}>
                        {tags.map((tag, i) => (
                          <span
                            key={i}
                            className={styles.tag}
                            style={{ background: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyCrm}>暂无标签</div>
              )}
            </div>
          </div>

          {/* CRM Consumption Records */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <button className={styles.sectionHeaderBtn} onClick={() => setCrmExpanded(!crmExpanded)}>
                <span className={styles.sectionTitle}>{crmExpanded ? '▾' : '▸'} 💰 消费记录</span>
              </button>
            </div>
            {crmExpanded && (
              <div className={styles.sectionBody}>
                {crm?.consumptionRecords && crm.consumptionRecords.length > 0 ? (
                  <div className={styles.crmList}>
                    {crm.consumptionRecords.map((record, index) => (
                      <div key={index} className={styles.crmItem}>
                        <div className={styles.crmItemLeft}>
                          <div className={styles.crmProduct}>{record.product}</div>
                          <div className={styles.crmMeta}>
                            <span>{record.date}</span>
                            {record.technician && <span> · {record.technician}</span>}
                            {record.satisfaction && <span> · {'⭐'.repeat(record.satisfaction)}</span>}
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

          {/* Timeline */}
          <div className={styles.section}>
             <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>⚡ AI 自主执行记录</span>
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
                        <div className={styles.timelineText}>触发 SOP <b>"私密养护潜客激活预案"</b>，AI系统已全自动下发专属图文卡片。</div>
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
                <p>当前并未收集到足够特征证明客户为"高净值"（未谈及资产、无历史高消费记录）。提交此标签可能影响画像准确度，确定要申请添加并进入审核流吗？</p>
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
