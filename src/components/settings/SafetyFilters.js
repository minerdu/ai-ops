'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
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
  };

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
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>🤖</span>
          <div>
            <h3 className={styles.sectionTitle}>1. 行业安全红线规则 (系统兜底)</h3>
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

        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>💼</span>
          <div>
            <h3 className={styles.sectionTitle}>2. 行业业务规则 (最佳实践)</h3>
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
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>🏢</span>
          <div>
            <h3 className={styles.sectionTitle}>3. 企业专属安全红线</h3>
            <p className={styles.sectionDesc}>填入绝对禁止的关键词或绝对禁止的行为规范，越线即被截停。</p>
          </div>
        </div>
        <textarea className={styles.addInput} style={{ width: '100%', height: '80px', resize: 'vertical', padding: '12px' }} placeholder="绝对禁止..." defaultValue="禁止泄露合作医美机构底价" />
        
        <div className={styles.sectionHeader} style={{ marginTop: '24px' }}>
          <span className={styles.sectionIcon}>📄</span>
          <div>
            <h3 className={styles.sectionTitle}>4. 企业专属业务规则</h3>
            <p className={styles.sectionDesc}>填入本店特定的服务流程、客诉处理规范。</p>
          </div>
        </div>
        <textarea className={styles.addInput} style={{ width: '100%', height: '80px', resize: 'vertical', padding: '12px' }} placeholder="本店服务流程规范..." />

        <div className={styles.sectionHeader} style={{ marginTop: '24px' }}>
          <span className={styles.sectionIcon}>💰</span>
          <div>
            <h3 className={styles.sectionTitle}>5. 企业专属财务规则</h3>
            <p className={styles.sectionDesc}>填入退换货政策与账款管理规范，AI将自动提取财务红线进行审批控制。</p>
          </div>
        </div>
        <textarea className={styles.addInput} style={{ width: '100%', height: '80px', resize: 'vertical', padding: '12px' }} defaultValue="所有涉及退号、退卡、结转余额的操作，必须由财务确认。严禁员工用个人账户接收客户的充值定金。" />
        
        <div className={styles.addRow} style={{ marginTop: '16px' }}>
          <button className={styles.addBtn} style={{ background: 'var(--color-bg-section)', color: 'var(--color-primary)', border: '1px dashed var(--color-primary)', width: '100%' }}>
            📎 上传统合企业规章制度文件 (支持 PDF / Word 一键拆解)
          </button>
        </div>
      </div>

      {/* AI自主跟进选项 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>🎯</span>
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
          <span className={styles.sectionIcon}>📊</span>
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
