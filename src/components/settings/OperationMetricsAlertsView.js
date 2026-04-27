'use client';

import { OPS_ALERT_RULES, OPS_METRIC_GROUPS, OPS_METRIC_OVERVIEW } from '@/lib/operationSkillData';
import styles from '@/app/(dashboard)/settings/page.module.css';

export default function OperationMetricsAlertsView() {
  return (
    <>
      <div className={styles.agentFormContainer} style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-6" /></svg>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>指标与预警总览</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>替代招商财务模型，专注 AI 运营健康度和风控阈值</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {OPS_METRIC_OVERVIEW.map((item) => (
            <div key={item.label} style={{ background: '#fff', borderRadius: '14px', padding: '14px 12px', border: '1px solid #eef2ff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#4f46e5' }}>{item.value}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>{item.label}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: 1.5 }}>{item.hint}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#0ea5e9' }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          <span>指标模型</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {OPS_METRIC_GROUPS.map((group) => (
            <div key={group.key} style={{ background: '#fff', borderRadius: '16px', border: `1px solid ${group.color}22`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ padding: '14px 16px', background: `${group.color}10`, color: group.color, fontSize: '15px', fontWeight: 700 }}>
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {group.metrics.map((metric, index) => (
                  <div key={metric.name} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr 1fr', gap: '12px', padding: '14px 16px', borderTop: index === 0 ? 'none' : '1px solid #f1f5f9', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{metric.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{metric.source}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>目标值</div>
                      <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>{metric.target}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>预警线</div>
                      <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px', background: '#fff7ed', color: '#c2410c', fontWeight: 700 }}>{metric.warn}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                      用于日报、旅程巡检和 AI 自主引擎生成前校验。
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#ef4444' }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <span>关键预警规则</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {OPS_ALERT_RULES.map((rule, index) => (
            <div key={rule} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px 16px', background: index % 2 === 0 ? '#fef2f2' : '#fff7ed', borderRadius: '14px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '8px', background: '#fff', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{index + 1}</span>
              <span style={{ fontSize: '14px', color: '#1f2937', lineHeight: 1.7 }}>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#2563eb' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          <span>使用方式</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
          指标与预警不是报表展示页，而是 AI 运营系统的目标与阈值配置层。后续它可以同时为运营日报、自主运营引擎、审批中心和活动复盘提供统一口径。
        </div>
      </div>
    </>
  );
}
