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
  const [descExpanded, setDescExpanded] = useState(true);
  const [scoreExpanded, setScoreExpanded] = useState(true);
  const [tagExpanded, setTagExpanded] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [prefExpanded, setPrefExpanded] = useState(true);
  const [crmExpanded, setCrmExpanded] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
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

  // Conditionally generate scores arrays based on isGroup
  const isGroup = customer.isGroup;
  const uiScores = customer.uiScores || {};
  
  let scores = [];
  let radarScores = {};

  if (isGroup) {
    scores = [
      { label: '活跃度', value: uiScores.activityScore || 0, color: '#1677FF' },
      { label: '消费力', value: uiScores.spendingScore || 0, color: '#FF4D4F' },
      { label: '互动质量', value: uiScores.interactionScore || 0, color: '#52C41A' },
      { label: '品牌粘性', value: uiScores.loyaltyScore || 0, color: '#7C3AED' },
      { label: '转介绍', value: uiScores.referralScore || 0, color: '#FA8C16' },
      { label: '转化潜力', value: uiScores.conversionScore || 0, color: '#EB2F96' },
    ];
    radarScores = {
      '活跃度': uiScores.activityScore || 0,
      '消费力': uiScores.spendingScore || 0,
      '互动质量': uiScores.interactionScore || 0,
      '品牌粘性': uiScores.loyaltyScore || 0,
      '转介绍': uiScores.referralScore || 0,
      '转化潜力': uiScores.conversionScore || 0,
    };
  } else {
    scores = [
      { label: '客单价值', value: uiScores.valueScore || 0, color: '#FF4D4F' },
      { label: '跟进意向', value: uiScores.intentScore || 0, color: '#1677FF' },
      { label: '强烈需求', value: uiScores.demandScore || 0, color: '#52C41A' },
      { label: '满意度', value: uiScores.satisfactionScore || 0, color: '#FF8C00' },
      { label: '客情关系', value: uiScores.relationScore || 0, color: '#13C2C2' },
      { label: '忠诚度', value: uiScores.loyaltyScore || 0, color: '#7C3AED' },
    ];
    radarScores = {
      '客单价值': uiScores.valueScore || 0,
      '跟进意向': uiScores.intentScore || 0,
      '强烈需求': uiScores.demandScore || 0,
      '满意度': uiScores.satisfactionScore || 0,
      '客情关系': uiScores.relationScore || 0,
      '忠诚度': uiScores.loyaltyScore || 0,
    };
  }

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

          {/* === 0. Member Header === */}
          <div className={styles.memberHeader}>
            <div className={styles.memberBadge} style={{ background: levelStyle.bg, color: levelStyle.text, borderColor: levelStyle.border }}>
              <span className={styles.memberLevel}>{memberLevel}</span>
            </div>
            <div className={styles.memberStats}>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>¥{(crm?.totalSpent || 0).toLocaleString()}</span>
                <span className={styles.memberStatLabel}>总消费</span>
              </div>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{crm?.visitCount || 0}</span>
                <span className={styles.memberStatLabel}>到店</span>
              </div>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{crm?.points || 0}</span>
                <span className={styles.memberStatLabel}>积分</span>
              </div>
            </div>
          </div>

          {/* === 1. AI Insight === */}
          <div className={`${styles.sectionBlock} ${styles.themeAi}`}>
            <div className={styles.sectionHeader} onClick={() => setDescExpanded(!descExpanded)}>
              <span className={styles.sectionTitle}>🤖 AI 核心洞察</span>
              <div className={styles.headerActions}>
                <button 
                  className={styles.iconBtn} 
                  title="重新生成"
                  onClick={(e) => { e.stopPropagation(); setIsRefreshingInsight(true); setTimeout(() => setIsRefreshingInsight(false), 1500); }}
                >
                  <span className={`${isRefreshingInsight ? styles.spin : ''}`}>🔄</span>
                </button>
                <span className={styles.expandIcon}>{descExpanded ? '▾' : '▸'}</span>
              </div>
            </div>
            {descExpanded && (
              <div className={styles.sectionBody}>
                <div className={styles.aiText}>
                  {isRefreshingInsight ? '正在重新生成 AI 洞察...' : (customer.aiSummary || '系统尚未生成AI洞察报告。')}
                </div>
              </div>
            )}
          </div>

          {/* === 2. Scores === */}
          <div className={`${styles.sectionBlock} ${styles.themeScore}`}>
            <div className={styles.sectionHeader} onClick={() => setScoreExpanded(!scoreExpanded)}>
              <span className={styles.sectionTitle}>📊 客户评分分析</span>
              <span className={styles.expandIcon}>{scoreExpanded ? '▾' : '▸'}</span>
            </div>
            {scoreExpanded && (
              <div className={styles.sectionBody}>
                <div className={styles.scoreRow}>
                  {scores.map((s) => (
                    <span key={s.label} className={styles.scoreBadge} style={{ background: `${s.color}15`, color: s.color }}>
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

          {/* === 3. Tags === */}
          <div className={`${styles.sectionBlock} ${styles.themeTag}`}>
            <div className={styles.sectionHeader} onClick={() => setTagExpanded(!tagExpanded)}>
              <span className={styles.sectionTitle}>🏷️ 客户多维标签 ({customer.tags?.length || 0})</span>
              <div className={styles.headerActions}>
                <button className={styles.iconBtn} onClick={(e) => { e.stopPropagation(); setShowTagModal(true); }}>➕ 管理</button>
                <span className={styles.expandIcon}>{tagExpanded ? '▾' : '▸'}</span>
              </div>
            </div>
            {tagExpanded && (
              <div className={styles.sectionBody}>
                <div className={styles.tagFlow}>
                  {customer.tags && customer.tags.map((tag, i) => (
                    <span
                      key={i}
                      className={styles.tag}
                      style={{ background: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {(!customer.tags || customer.tags.length === 0) && (
                    <span className={styles.emptyText}>暂无标签</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* === 4. Basic Info === */}
          {crm?.basicInfo && (
            <div className={`${styles.sectionBlock} ${styles.themeInfo}`}>
              <div className={styles.sectionHeader} onClick={() => setInfoExpanded(!infoExpanded)}>
                <span className={styles.sectionTitle}>👤 基本资料</span>
                <span className={styles.expandIcon}>{infoExpanded ? '▾' : '▸'}</span>
              </div>
              {infoExpanded && (
                <div className={styles.sectionBody}>
                  <div className={styles.infoFlow}>
                    <div className={styles.infoPair}><span className={styles.lbl}>🎂 生日</span><span className={styles.val}>{crm.basicInfo.birthday}</span></div>
                    <div className={styles.infoPair}><span className={styles.lbl}>👤 年龄</span><span className={styles.val}>{crm.basicInfo.age}岁</span></div>
                    <div className={styles.infoPair}><span className={styles.lbl}>💼 职业</span><span className={styles.val}>{crm.basicInfo.occupation}</span></div>
                    <div className={styles.infoPair}><span className={styles.lbl}>📍 住址</span><span className={styles.val}>{crm.basicInfo.address}</span></div>
                    <div className={styles.infoPair}><span className={styles.lbl}>🧴 肤质</span><span className={styles.val}>{crm.basicInfo.skinType}</span></div>
                    {crm.basicInfo.allergies !== '无' && (
                      <div className={styles.infoPairWarn}><span className={styles.lbl}>⚠️ 过敏史</span><span className={styles.val}>{crm.basicInfo.allergies}</span></div>
                    )}
                    {crm.memberSince && <div className={styles.infoPair}><span className={styles.lbl}>🎫 入会日期</span><span className={styles.val}>{crm.memberSince}</span></div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === 5. Preferences === */}
          {crm?.preferences && (
            <div className={`${styles.sectionBlock} ${styles.themePref}`}>
              <div className={styles.sectionHeader} onClick={() => setPrefExpanded(!prefExpanded)}>
                <span className={styles.sectionTitle}>💝 个性化偏好</span>
                <span className={styles.expandIcon}>{prefExpanded ? '▾' : '▸'}</span>
              </div>
              {prefExpanded && (
                <div className={styles.sectionBody}>
                  <div className={styles.infoFlow}>
                    <div className={styles.infoPair}><span className={styles.lbl}>👩‍🔬 首选技师</span><span className={styles.val}>{crm.preferences.preferredTech}</span></div>
                    <div className={styles.infoPair}><span className={styles.lbl}>🕐 习惯时段</span><span className={styles.val}>{crm.preferences.preferredTime}</span></div>
                    <div className={styles.infoPair}><span className={styles.lbl}>💬 沟通风格</span><span className={styles.val}>{crm.preferences.communicationStyle}</span></div>
                  </div>
                  <div className={styles.prefProjects}>
                    <span className={styles.lbl}>重点高频项目：</span>
                    <div className={styles.tagFlow}>
                      {crm.preferences.preferredProjects && crm.preferences.preferredProjects.map((p, i) => (
                        <span key={i} className={styles.prefChipPrimary}>{p}</span>
                      ))}
                    </div>
                  </div>
                  {crm.preferences.notes && (
                    <div className={styles.noteBar}>
                      <span className={styles.lbl}>📋 客户特别注意：</span>
                      {crm.preferences.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* === 6. Consumption Records === */}
          <div className={`${styles.sectionBlock} ${styles.themeCrm}`}>
            <div className={styles.sectionHeader} onClick={() => setCrmExpanded(!crmExpanded)}>
              <span className={styles.sectionTitle}>💰 历次消费记录 ({crm?.consumptionRecords?.length || 0})</span>
              <span className={styles.expandIcon}>{crmExpanded ? '▾' : '▸'}</span>
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
                            <span className={styles.crmDate}>{record.date}</span>
                            {record.technician && <span className={styles.crmTech}>服务: {record.technician}</span>}
                            {record.satisfaction && <span className={styles.crmStar}>{'⭐'.repeat(record.satisfaction)}</span>}
                          </div>
                        </div>
                        <div className={styles.crmAmount}>¥{record.amount.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyText}>暂无详细消费记录</div>
                )}
              </div>
            )}
          </div>

          {/* === 7. AI Timeline === */}
          <div className={`${styles.sectionBlock} ${styles.themeTimeline}`}>
            <div className={styles.sectionHeader} onClick={() => setTimelineExpanded(!timelineExpanded)}>
              <span className={styles.sectionTitle}>⚡ AI 自动化执行记录</span>
              <span className={styles.expandIcon}>{timelineExpanded ? '▾' : '▸'}</span>
            </div>
            {timelineExpanded && (
              <div className={styles.sectionBody}>
                <div className={styles.timeline}>
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDot}></div>
                    <div className={styles.timelineLine}></div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTime}>今天 10:30</div>
                      <div className={styles.timelineText}>AI系统自主研判赋能 <b>[高意向人群]</b> 阶段标签。</div>
                    </div>
                  </div>
                  {customer.intentScore >= 4.0 && (
                    <div className={styles.timelineItem}>
                      <div className={`${styles.timelineDot} ${styles.timelineDotWarn}`}></div>
                      <div className={styles.timelineLine}></div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTime}>昨天 18:20</div>
                        <div className={styles.timelineText}>SOP命中：<b>&ldquo;高转化潜客激活&rdquo;</b>预案，AI助理已自动发送朋友圈唤醒话术。</div>
                      </div>
                    </div>
                  )}
                  <div className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${styles.timelineDotGray}`}></div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTime}>昨天 16:45</div>
                      <div className={styles.timelineText}>进入企业微信公海资源池，AI助理自动首次建档处理。</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {showTagModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTagModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>审批流配置</h3>
              <button className={styles.iconBtn} onClick={() => setShowTagModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.tagInputRow}>
                <input type="text" placeholder="输入期望附带的标签名称（如：高净值）" className={styles.tagInput} />
              </div>
              <div className={styles.aiAnalysisBox}>
                <h4>🤖 AI 自动化评估结果被驳回</h4>
                <p>当前记录中并未收集到足够特征（未谈及资产、未见高单价历史行为），不足以支撑进入&ldquo;高净值&rdquo;自动营销闭环。继续提交需要管理层特批。是否提交特批？</p>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowTagModal(false)}>取消</button>
                <button className={styles.submitBtn} onClick={() => { toast.success('已提线索管理层特批池'); setShowTagModal(false); }}>请求特批</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
