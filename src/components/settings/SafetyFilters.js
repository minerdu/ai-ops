'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/common/Toast';
import styles from './SafetyFilters.module.css';

/**
 * 安全规则/红线配置组件
 * 
 * 管理：
 * - 休止关键字（触发后AI立即停止回复）
 * - 财务敏感词（自动路由人工审批）
 * - 旅程级禁止打扰规则
 * - 每日最大发送量
 */
export default function SafetyFilters() {
  const toast = useToast();
  const [rules, setRules] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState({ stop: '', financial: '' });
  const [dailyLimit, setDailyLimit] = useState('100');

  const [aiBehavior, setAiBehavior] = useState('normal');

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/safety-rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
        if (data.daily_limit?.value) {
          setDailyLimit(data.daily_limit.value > 50 ? '10' : data.daily_limit.value);
        }
      }
    } catch (e) {
      toast.error('加载安全规则失败');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const addRule = async (ruleType, value) => {
    if (!value.trim()) return;
    try {
      const res = await fetch('/api/safety-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleType, value: value.trim() }),
      });
      if (res.ok) {
        toast.success('规则已添加');
        loadRules();
        setNewKeyword(prev => ({ ...prev, [ruleType === 'stop_keyword' ? 'stop' : 'financial']: '' }));
      } else {
        const err = await res.json();
        toast.error(err.error || '添加失败');
      }
    } catch (e) {
      toast.error('网络错误');
    }
  };

  const deleteRule = async (id) => {
    try {
      const res = await fetch(`/api/safety-rules?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('已删除');
        loadRules();
      }
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const toggleRule = async (id, isActive) => {
    try {
      await fetch('/api/safety-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      loadRules();
    } catch (e) {
      toast.error('更新失败');
    }
  };

  const saveDailyLimit = async () => {
    await addRule('daily_limit', dailyLimit);
  };

  const addJourneyBlock = async (value) => {
    await addRule('journey_block', value);
  };

  if (isLoading || !rules) {
    return <div className={styles.container}><p className={styles.loading}>加载中...</p></div>;
  }

  return (
    <div className={styles.container}>
      {/* 行业通用规则与行业业务规则 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader} style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#EF4444' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#DC2626' }}>行业安全红线规则 (系统兜底)</h3>
            <p className={styles.sectionDesc}>内置黄赌毒拦截、诱导欺诈防范、过度承诺等核心拦截规则。</p>
          </div>
        </div>
        <div className={styles.toggleRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-section)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          <div>
            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-text-primary)' }}>启用行业通用安全红线</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginLeft: '8px' }}>强制拦截</span>
          </div>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" id="toggleGeneral" defaultChecked disabled />
            <label htmlFor="toggleGeneral"></label>
          </div>
        </div>

        <div className={styles.sectionHeader} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', marginTop: '24px' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#10B981' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#059669' }}>行业业务规则 (最佳实践)</h3>
            <p className={styles.sectionDesc}>内置行业内常见服务准则与沟通避坑指南，避免低级失误。</p>
          </div>
        </div>
        <div className={styles.toggleRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-section)', padding: '12px 16px', borderRadius: '8px' }}>
          <div>
            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-text-primary)' }}>启用行业最佳业务实践</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginLeft: '8px' }}>辅助 AI 生成话术</span>
          </div>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" id="toggleBizRule" defaultChecked />
            <label htmlFor="toggleBizRule"></label>
          </div>
        </div>
      </div>

      {/* 企业专属部分 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader} style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#F59E0B' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="15" y2="22"></line><line x1="9" y1="6" x2="9.01" y2="6"></line><line x1="15" y1="6" x2="15.01" y2="6"></line><line x1="9" y1="10" x2="9.01" y2="10"></line><line x1="15" y1="10" x2="15.01" y2="10"></line><line x1="9" y1="14" x2="9.01" y2="14"></line><line x1="15" y1="14" x2="15.01" y2="14"></line></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#D97706' }}>企业专属安全红线</h3>
            <p className={styles.sectionDesc}>填入绝对禁止的关键词或绝对禁止的行为规范，越线即被截停。</p>
          </div>
        </div>
        <textarea className={styles.addInput} style={{ width: '100%', height: '80px', resize: 'vertical', padding: '12px' }} placeholder="绝对禁止..." defaultValue="禁止泄露合作医美机构底价" />
        
        <div className={styles.sectionHeader} style={{ marginTop: '24px', padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#3B82F6' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#2563EB' }}>企业专属业务规则</h3>
            <p className={styles.sectionDesc}>填入本店特定的服务流程、客诉处理规范。</p>
          </div>
        </div>
        <textarea className={styles.addInput} style={{ width: '100%', height: '80px', resize: 'vertical', padding: '12px' }} placeholder="本店服务流程规范..." />

        <div className={styles.sectionHeader} style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F5F3FF', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#8B5CF6' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="18" x2="12" y2="14"></line><line x1="12" y1="6" x2="12" y2="10"></line></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#7C3AED' }}>企业专属财务规则</h3>
            <p className={styles.sectionDesc}>填入退换货政策与账款管理规范，AI将自动提取财务红线进行审批控制。</p>
          </div>
        </div>
        <textarea className={styles.addInput} style={{ width: '100%', height: '80px', resize: 'vertical', padding: '12px' }} defaultValue="所有涉及退号、退卡、结转余额的操作，必须由财务确认。严禁员工用个人账户接收客户的充值定金。" />
        
        <div className={styles.addRow} style={{ marginTop: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              上传统合企业规章制度文件 (支持 PDF / Word 一键拆解)
            </span>
        </div>
      </div>

      {/* AI自主跟进选项 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: 'var(--color-primary)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></span>
          <div>
            <h3 className={styles.sectionTitle}>AI自主判断跟进模式</h3>
            <p className={styles.sectionDesc}>决定 AI 在缺乏明确指令时的出击意愿和跟进频率</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button 
            className={aiBehavior === 'conservative' ? styles.activeBehavior : styles.inactiveBehavior}
            onClick={() => setAiBehavior('conservative')}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: aiBehavior === 'conservative' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', background: aiBehavior === 'conservative' ? 'var(--color-primary-bg)' : 'transparent', cursor: 'pointer' }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>保守无感</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>无客户主动咨询时，绝不主动发起话题</div>
          </button>
          <button 
            className={aiBehavior === 'normal' ? styles.activeBehavior : styles.inactiveBehavior}
            onClick={() => setAiBehavior('normal')}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: aiBehavior === 'normal' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', background: aiBehavior === 'normal' ? 'var(--color-primary-bg)' : 'transparent', cursor: 'pointer' }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>常态行进</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>基于标准客户生命周期和重要节假日进行适度关怀推介</div>
          </button>
          <button 
            className={aiBehavior === 'aggressive' ? styles.activeBehavior : styles.inactiveBehavior}
            onClick={() => setAiBehavior('aggressive')}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: aiBehavior === 'aggressive' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', background: aiBehavior === 'aggressive' ? 'var(--color-primary-bg)' : 'transparent', cursor: 'pointer' }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>激进业绩导向</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>紧盯高意向动作，高频发送催单、逼单类话术及限时折扣</div>
          </button>
        </div>
      </div>

      {/* 每日发送上限 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: 'var(--color-primary)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span>
          <div>
            <h3 className={styles.sectionTitle}>每日最大发送量</h3>
            <p className={styles.sectionDesc}>每天自动发送消息的总量上限，超出后新任务需人工审批</p>
          </div>
        </div>
        <div className={styles.limitRow}>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={dailyLimit}
            onChange={e => setDailyLimit(e.target.value)}
            className={styles.limitRange}
          />
          <span className={styles.limitValue}>{dailyLimit} 条/天</span>
          <button className={styles.addBtn} onClick={saveDailyLimit}>保存</button>
        </div>
      </div>
    </div>
  );
}
