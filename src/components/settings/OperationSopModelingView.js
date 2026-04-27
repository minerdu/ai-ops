'use client';

import { useState } from 'react';
import { OPS_SOP_COMPLETION, OPS_SOP_SECTIONS } from '@/lib/operationSkillData';
import styles from '@/app/(dashboard)/settings/page.module.css';

const SECTION_COLORS = {
  segmentation: { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe', activeBg: '#3b82f6' },
  service: { bg: '#f0fdfa', text: '#0f766e', border: '#ccfbf1', activeBg: '#14b8a6' },
  retention: { bg: '#f0fdf4', text: '#15803d', border: '#dcfce7', activeBg: '#22c55e' },
  campaign: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', activeBg: '#f97316' },
  training: { bg: '#f5f3ff', text: '#6d28d9', border: '#ede9fe', activeBg: '#8b5cf6' },
  guardrails: { bg: '#fef2f2', text: '#dc2626', border: '#fee2e2', activeBg: '#ef4444' },
};

export default function OperationSopModelingView() {
  const [activeSection, setActiveSection] = useState(OPS_SOP_SECTIONS[0].key);
  const section = OPS_SOP_SECTIONS.find((item) => item.key === activeSection);
  const overallCompletion = Math.round(OPS_SOP_COMPLETION.reduce((sum, item) => sum + item.percent, 0) / OPS_SOP_COMPLETION.length);

  return (
    <>
      <div className={styles.agentFormContainer} style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>运营SOP建模完成度</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: overallCompletion >= 80 ? '#059669' : '#d97706', lineHeight: 1 }}>{overallCompletion}</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', paddingBottom: '2px' }}>%</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {OPS_SOP_COMPLETION.map((item) => (
            <div key={item.section} style={{ background: '#fff', borderRadius: '12px', padding: '12px 16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{item.section}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: item.percent >= 90 ? '#059669' : item.percent >= 70 ? '#d97706' : '#ef4444' }}>{item.percent}%</span>
              </div>
              <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${item.percent}%`, height: '100%', borderRadius: '3px', background: item.percent >= 90 ? '#10b981' : item.percent >= 70 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.agentFormContainer} style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
          <div style={{ width: '4px', height: '18px', background: '#14b8a6', borderRadius: '2px' }} />
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>运营策略建模中心</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {OPS_SOP_SECTIONS.map((item) => {
            const colors = SECTION_COLORS[item.key];
            const isSelected = activeSection === item.key;
            return (
              <div
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                style={{
                  background: isSelected ? colors.activeBg : '#fff',
                  color: isSelected ? '#fff' : colors.text,
                  borderRadius: '16px',
                  padding: '16px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  border: isSelected ? `1px solid ${colors.activeBg}` : `1px solid ${colors.border}`,
                  boxShadow: isSelected ? `0 4px 16px ${colors.activeBg}40` : '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.3s',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                <div style={{ fontSize: '24px' }}>{item.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 600 }}>{item.title}</div>
              </div>
            );
          })}
        </div>

        {section ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: `1px solid ${SECTION_COLORS[section.key].border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: SECTION_COLORS[section.key].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                  {section.icon}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{section.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>基于樊文花运营模块做本地化改造</div>
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.8 }}>{section.summary}</div>
            </div>

            {section.blocks.map((block) => (
              <div key={block.title} style={{ background: '#fff', borderRadius: '16px', padding: '18px', border: `1px solid ${SECTION_COLORS[section.key].border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: SECTION_COLORS[section.key].text, marginBottom: '14px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SECTION_COLORS[section.key].activeBg, display: 'inline-block' }} />
                  {block.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {block.items.map((item) => (
                    <div key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', background: SECTION_COLORS[section.key].bg, borderRadius: '12px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#fff', color: SECTION_COLORS[section.key].text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: '14px', color: '#1e293b', lineHeight: 1.65 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#2563eb' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          <span>建模说明</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
          这页不是展示标杆案例，而是把标杆 Skill 变成你自己的运营规则。后续 AI 自主运营引擎、审批规则、日报指标都可以从这里读取本品牌的执行标准。
        </div>
      </div>
    </>
  );
}
