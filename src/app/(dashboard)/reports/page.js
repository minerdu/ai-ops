'use client';

import { useState, useEffect } from 'react';
import useStore from '@/lib/store';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import styles from './page.module.css';
import { apiFetch } from '@/lib/basePath';

function formatRate(rate) {
  if (!Number.isFinite(rate) || rate <= 0) return '0%';
  if (rate >= 100) return '100%';
  return `${rate}%`;
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isLoading, setIsLoading] = useState(true);
  const setActiveMainPanel = useStore(s => s.setActiveMainPanel);

  const [reportViewMode, setReportViewMode] = useState('day');

  useEffect(() => {
    apiFetch(`/api/reports/daily?date=${selectedDate}&viewMode=${reportViewMode}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setReportData(data);
        setIsLoading(false);
      })
      .catch(e => {
        console.error(e);
        setIsLoading(false);
      });
  }, [selectedDate, reportViewMode]);

  if (!reportData) {
    return <div className={styles.reportsPage}>加载中...</div>;
  }

  const r = reportData;

  return (
    <div className={styles.reportsPage}>
      <div className={styles.header} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className={styles.backBtnIOS} onClick={() => setActiveMainPanel('settings')}>
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <span className={styles.backBtnText}>返回</span>
            </button>
            <h2 className={styles.title} style={{ margin: 0 }}>📊 运营报告</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={styles.date}>{r.reportDate}</span>
            <input 
              type="date" 
              className={styles.datePicker} 
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setIsLoading(true);
                setSelectedDate(e.target.value);
              }}
            />
          </div>
        </div>
        
        {/* View mode tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-section)', padding: '4px', borderRadius: '8px' }}>
          {['day', 'week', 'month'].map(v => (
            <button key={v}
              style={{
                flex: 1, padding: '8px 0', fontSize: '13px', borderRadius: '6px',
                background: reportViewMode === v ? '#fff' : 'transparent',
                fontWeight: reportViewMode === v ? '600' : '400',
                color: reportViewMode === v ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                boxShadow: reportViewMode === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onClick={() => {
                setIsLoading(true);
                setReportViewMode(v);
              }}>
              {v === 'day' ? '按日视图' : v === 'week' ? '按周视图' : '按月视图'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {/* Summary Stats */}
        <div className={`${styles.card} animate-fadeInUp`}>
          <h3 className={styles.cardTitle}>过去24小时运营概览</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statNum}>{r.totalCustomers}</span>
              <span className={styles.statLabel}>客户总数</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNum}>{r.newCustomers}</span>
              <span className={styles.statLabel}>新增客户</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNum}>{r.totalMessages}</span>
              <span className={styles.statLabel}>收到消息</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNum}>{r.sentMessages}</span>
              <span className={styles.statLabel}>发送消息</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNum}>{r.aiReplies}</span>
              <span className={styles.statLabel}>AI回复</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNum}>{formatRate(r.responseWithin60Rate)}</span>
              <span className={styles.statLabel}>60秒内响应率</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className={styles.chartsGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
          
          <div className={`${styles.card} animate-fadeInUp delay-100`}>
            <h3 className={styles.cardTitle}>📈 会话趋势分析</h3>
            <div style={{ width: '100%', height: 260, marginTop: '24px' }}>
              <ResponsiveContainer>
                <AreaChart data={r.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: '13px' }}
                    labelStyle={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="messages" name="总消息" stroke="var(--color-primary)" fill="var(--color-primary-bg)" strokeWidth={3} />
                  <Area type="monotone" dataKey="aiReplies" name="AI回复" stroke="#10b981" fill="#ecfdf5" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`${styles.card} animate-fadeInUp delay-100`}>
            <h3 className={styles.cardTitle}>🔻 转化漏斗分析</h3>
            <div style={{ width: '100%', height: 260, marginTop: '24px' }}>
              <ResponsiveContainer>
                <BarChart data={r.funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 500, fill: 'var(--color-text-primary)' }} width={60} />
                  <Tooltip 
                    cursor={{ fill: 'var(--color-bg-section)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" name="客户数量" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* High Frequency Keywords */}
        <div className={`${styles.card} animate-fadeInUp delay-100`}>
          <h3 className={styles.cardTitle}>🔑 对话高频关键词</h3>
          <div className={styles.keywords}>
            {r.highFreqKeywords.map((kw, i) => (
              <span
                key={kw}
                className={styles.keyword}
                style={{ fontSize: `${Math.max(14, 20 - i * 2)}px`, opacity: 1 - i * 0.08 }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Key Customers */}
        <div className={`${styles.card} animate-fadeInUp delay-200`}>
          <h3 className={styles.cardTitle}>⚡ 建议重点关注客户</h3>
          <div className={styles.keyCustomers}>
            {r.keyCustomers.map((c, i) => (
              <div key={i} className={styles.keyCustomerItem}>
                <div className={styles.kcInfo}>
                  <span className={styles.kcName}>{c.name}</span>
                  <span className={styles.kcReason}>{c.reason}</span>
                </div>
                <button className={styles.kcAction}>{c.action}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className={`${styles.card} animate-fadeInUp delay-300`}>
          <h3 className={styles.cardTitle}>📋 待审批</h3>
          <div className={styles.approvalList}>
            <div className={styles.approvalItem}>
              <span className={styles.approvalLabel}>自动打标签审批</span>
              <span className={styles.approvalCount}>{r.pendingTagApprovals}个</span>
            </div>
            <div className={styles.approvalItem}>
              <span className={styles.approvalLabel}>跟进任务审批</span>
              <span className={styles.approvalCount}>{r.pendingTaskApprovals}个</span>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className={`${styles.card} ${styles.aiCard} animate-fadeInUp delay-300`}>
          <h3 className={styles.cardTitle}>🤖 AI经营总结</h3>
          <p className={styles.aiSummary}>{r.aiSummary}</p>
        </div>

        {/* AI Suggestions */}
        <div className={`${styles.card} animate-fadeInUp delay-300`}>
          <h3 className={styles.cardTitle}>💡 AI经营建议</h3>
          <div className={styles.suggestions}>
            {(r.aiSuggestions || []).map((s, i) => (
              <div key={i} className={styles.suggestionItem}>
                <div className={styles.sugInfo}>
                  <span className={styles.sugTitle}>{s.title}</span>
                  <span className={styles.sugDesc}>{s.desc}</span>
                </div>
                <button className={styles.sugAction}>{s.link}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Go to Approval CTA */}
        <div 
          className={`${styles.approvalCta} animate-fadeInUp delay-300`}
          onClick={() => setActiveMainPanel('tasks')}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.ctaLeft}>
            <span className={styles.ctaIcon}>✅</span>
            <div className={styles.ctaInfo}>
              <span className={styles.ctaTitle}>立即审批今日任务</span>
              <span className={styles.ctaDesc}>
                {r.pendingTagApprovals}个自动打标签审批 · {r.pendingTaskApprovals}个跟进任务审批
              </span>
            </div>
          </div>
          <span className={styles.ctaArrow}>→</span>
        </div>
      </div>
    </div>
  );
}
