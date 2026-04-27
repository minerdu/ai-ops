'use client';

import { useState } from 'react';
import {
  OPS_BENCHMARK_BRANDS,
  OPS_JOURNEYS,
  FANWENHUA_OPERATION_SKILLS,
} from '@/lib/operationSkillData';
import styles from '@/app/(dashboard)/settings/page.module.css';

const BRAND_SKILL_MAP = {
  bench_fanwenhua_ops: FANWENHUA_OPERATION_SKILLS,
};

const LINEAR_ICONS = {
  new_ice: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14" /><path d="M12 5v14" /><circle cx="12" cy="12" r="9" /></svg>,
  intent_chat: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  visit: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  convert: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  followup: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  reactivate: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /></svg>,
  order: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2l3 6h10l-3 14H8L5 6H2" /></svg>,
  aftercare: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.8 4.6A5.5 5.5 0 0 0 12 8.9a5.5 5.5 0 0 0-8.8 4.4c0 3.9 3.5 6.4 8.8 9.7 5.3-3.3 8.8-5.8 8.8-9.7a5.4 5.4 0 0 0-.8-2.9" /></svg>,
  upsell: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20V4" /><path d="M6 10l6-6 6 6" /><path d="M6 20h12" /></svg>,
};

const SECTION_ICONS = {
  rules: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h2" /></svg>,
  scripts: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  metrics: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
  objections: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  materials: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>,
};

const METRIC_LABELS = {
  firstTouchTime: '首次承接',
  addWechatRate: '私域承接率',
  guideClaimRate: '权益领取率',
  demandTagRate: '需求标记率',
  planReadRate: '方案阅读率',
  consultToVisit: '沟通转到店',
  bookingRate: '预约率',
  showUpRate: '到店率',
  postVisitFeedback: '体验回收率',
  voucherUseRate: '权益使用率',
  highIntentConvert: '高意向转化率',
  approvalPassRate: '审批通过率',
  followupReplyRate: '跟进回复率',
  remindToVisit: '提醒转到店',
  duplicateTouchControl: '重复触达控制',
  reactivationRate: '唤醒率',
  returnVisitRate: '回流到店率',
  silentPoolControl: '沉默池控制',
  orderConfirmRate: '订单确认率',
  planCompletionRate: '方案完成率',
  postOrderNoShow: '爽约率',
  revisitCoverage: '回访覆盖率',
  satisfactionRate: '满意度',
  issueEscalation: '异常升级',
  repeatPurchaseRate: '复购率',
  memberUpgradeRate: '会员升级率',
  vipPlanPenetration: 'VIP规划渗透率',
};

export default function OperationSkillCenterView() {
  const [selectedBrand, setSelectedBrand] = useState(OPS_BENCHMARK_BRANDS[0].id);
  const [selectedStage, setSelectedStage] = useState(OPS_JOURNEYS[0].key);

  const brand = OPS_BENCHMARK_BRANDS.find((item) => item.id === selectedBrand);
  const skills = BRAND_SKILL_MAP[selectedBrand] || {};
  const stageSkill = skills[selectedStage] || {};
  const stageMeta = OPS_JOURNEYS.find((item) => item.key === selectedStage);

  return (
    <>
      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#f59e0b' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          <span>Skill中心</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: '12px' }}>
          选择标杆企业后，可查看其在 9 大运营旅程中的规则、话术、指标、异议处理和物料清单，再在「运营SOP建模」中完成本地化改造。
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {OPS_BENCHMARK_BRANDS.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedBrand(item.id);
                setSelectedStage(OPS_JOURNEYS[0].key);
              }}
              style={{
                cursor: 'pointer',
                border: selectedBrand === item.id ? `2px solid ${item.color}` : '2px solid transparent',
                background: selectedBrand === item.id ? `${item.color}08` : '#fff',
                padding: '14px',
                borderRadius: '12px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <span style={{ fontSize: '28px' }}>{item.logo}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.name}</span>
                    <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '6px', background: `${item.color}15`, color: item.color, fontWeight: 600 }}>
                      {item.storeCount}门店
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{item.tagline}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {item.highlights.map((highlight) => (
                      <span key={highlight} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b' }}>
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: selectedBrand === item.id ? `${item.color}18` : '#f1f5f9', color: selectedBrand === item.id ? item.color : '#94a3b8', fontWeight: 700 }}>
                {selectedBrand === item.id ? '当前选择' : '查看'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <span style={{ fontSize: 16 }}>{brand?.logo}</span>
          <span>{brand?.name} — 运营旅程拆解</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {OPS_JOURNEYS.map((journey) => {
            const isSelected = selectedStage === journey.key;
            return (
              <div
                key={journey.key}
                onClick={() => setSelectedStage(journey.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px 8px',
                  borderRadius: '12px',
                  background: isSelected ? `${journey.color}10` : '#f8fafc',
                  border: `1px solid ${isSelected ? journey.color : 'transparent'}`,
                  color: isSelected ? journey.color : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? `0 2px 8px ${journey.color}20` : 'none',
                }}
              >
                <div
                  style={{
                    color: isSelected ? journey.color : '#94a3b8',
                    background: isSelected ? '#fff' : 'transparent',
                    padding: isSelected ? '6px' : '0',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? `0 1px 3px ${journey.color}30` : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {LINEAR_ICONS[journey.key]}
                </div>
                <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 500 }}>{journey.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
            <div style={{ width: '4px', height: '18px', background: stageMeta?.color, borderRadius: '2px' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
              {stageMeta?.label}
              <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '13px', marginLeft: '4px' }}>| {brand?.name}执行标准</span>
            </span>
          </div>

          {stageSkill.rules?.length > 0 && (
            <div style={{ background: '#f0f9ff', borderRadius: '16px', border: '1px solid #e0f2fe', padding: '20px', boxShadow: '0 2px 8px rgba(2,132,199,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#0369a1', marginBottom: '16px' }}>
                <span style={{ color: '#0284c7' }}>{SECTION_ICONS.rules}</span> 旅程规则
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {stageSkill.rules.map((rule, index) => (
                  <div key={rule} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f0f9ff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>{index + 1}</span>
                    <span style={{ fontSize: '14.5px', color: '#1e293b', lineHeight: 1.6 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stageSkill.scripts?.length > 0 && (
            <div style={{ background: '#f5f3ff', borderRadius: '16px', border: '1px solid #ede9fe', padding: '20px', boxShadow: '0 2px 8px rgba(124,58,237,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#5b21b6', marginBottom: '20px' }}>
                <span style={{ color: '#7c3aed' }}>{SECTION_ICONS.scripts}</span> 话术模板
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '4px' }}>
                {stageSkill.scripts.map((script, index) => (
                  <div key={script} style={{ position: 'relative', padding: '16px 20px', background: '#ffffff', borderRadius: '0 16px 16px 16px', borderLeft: '4px solid #8b5cf6', fontSize: '14.5px', color: '#1e293b', lineHeight: 1.6, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ position: 'absolute', top: '-14px', left: '12px', background: '#ffffff', padding: '2px 10px', fontSize: '12px', color: '#6d28d9', fontWeight: 700, border: '1px solid #ede9fe', borderRadius: '8px' }}>
                      话术 {index + 1}
                    </div>
                    &ldquo;{script}&rdquo;
                  </div>
                ))}
              </div>
            </div>
          )}

          {stageSkill.metrics && Object.keys(stageSkill.metrics).length > 0 && (
            <div style={{ background: '#f0fdf4', borderRadius: '16px', border: '1px solid #dcfce7', padding: '20px', boxShadow: '0 2px 8px rgba(16,185,129,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#047857', marginBottom: '16px' }}>
                <span style={{ color: '#10b981' }}>{SECTION_ICONS.metrics}</span> 关键指标
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {Object.entries(stageSkill.metrics).map(([key, value]) => (
                  <div key={key} style={{ padding: '16px 8px', background: '#ffffff', borderRadius: '14px', textAlign: 'center', border: '1px solid #ecfdf5', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669' }}>{value}</div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '6px', fontWeight: 600 }}>{METRIC_LABELS[key] || key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stageSkill.objections?.length > 0 && (
            <div style={{ background: '#fff1f2', borderRadius: '16px', border: '1px solid #ffe4e6', padding: '20px', boxShadow: '0 2px 8px rgba(225,29,72,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#be123c', marginBottom: '16px' }}>
                <span style={{ color: '#e11d48' }}>{SECTION_ICONS.objections}</span> 常见异议处理
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {stageSkill.objections.map((item, index) => (
                  <div key={`${item.q}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#ffffff', borderRadius: '14px', border: '1px solid #ffe4e6', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: '14.5px', fontWeight: 700, color: '#e11d48' }}>
                      <span style={{ marginRight: '8px', flexShrink: 0, marginTop: '2px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                      </span>
                      {item.q}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: '14px', color: '#1e293b', lineHeight: 1.6 }}>
                      <span style={{ marginRight: '8px', flexShrink: 0, marginTop: '2px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                      {item.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stageSkill.materials?.length > 0 && (
            <div style={{ background: '#fffbeb', borderRadius: '16px', border: '1px solid #fef3c7', padding: '20px', boxShadow: '0 2px 8px rgba(217,119,6,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#92400e', marginBottom: '16px' }}>
                <span style={{ color: '#d97706' }}>{SECTION_ICONS.materials}</span> 物料清单
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stageSkill.materials.map((material) => (
                  <div key={material} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #fef3c7', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
                      <span style={{ fontSize: '14.5px', fontWeight: 600, color: '#78350f' }}>{material}</span>
                    </div>
                    <span style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '8px', background: '#dcfce7', color: '#059669', fontWeight: 700 }}>可用</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#2563eb' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          <span>使用说明</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
          Skill中心用于查看标杆美业品牌在 9 大运营旅程中的执行标准。这里看到的是底层逻辑与标杆方法，不是让系统直接照搬。下一步应在「运营SOP建模」中完成本品牌规则落地，再在「指标与预警」中设置目标值、阈值与审批边界。
        </div>
      </div>
    </>
  );
}
