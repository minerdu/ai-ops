'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/common/Toast';
import styles from './YouzanConfigPanel.module.css';

/**
 * CRM 系统接入面板
 * 
 * 管理不同前端商城/CRM系统的授权凭证与同步等
 */
export default function YouzanConfigPanel() {
  const toast = useToast();
  const [crmProvider, setCrmProvider] = useState('youzan'); // youzan, jst, custom
  const [config, setConfig] = useState({
    appId: '',
    appSecret: '',
    shopId: '',
    syncEnabled: false,
    syncInterval: 'daily',
    lastSyncAt: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/youzan');
      if (res.ok) {
        const data = await res.json();
        setConfig({
          appId: data.appId || '',
          appSecret: '',
          shopId: data.shopId || '',
          syncEnabled: data.syncEnabled ?? false,
          syncInterval: data.syncInterval || 'daily',
          lastSyncAt: data.lastSyncAt,
        });
      }
    } catch (e) {
      // 首次使用，API 可能不存在
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/youzan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success('CRM 配置已保存');
      } else {
        toast.error('保存失败');
      }
    } catch (e) {
      toast.error('网络错误');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // 模拟连接测试
      await new Promise(r => setTimeout(r, 1500));
      if (config.appId && config.shopId) {
        setTestResult({ success: true, message: `连接 ${crmProvider} 成功（模拟模式）` });
        toast.success('CRM API 连接测试成功（模拟）');
      } else {
        setTestResult({ success: false, message: '请先填写 App ID 和店铺 ID' });
        toast.error('请先填写必要配置');
      }
    } catch (e) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      toast.success('同步完成（模拟模式）');
    } catch (e) {
      toast.error('同步失败');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>🔗</span>
        <div>
          <h3 className={styles.headerTitle}>CRM 系统接入</h3>
          <p className={styles.headerDesc}>连接您现有的客户管理系统，进行数据同步</p>
        </div>
      </div>

      {/* 选择服务商 */}
      <div className={styles.fieldGroup} style={{ marginBottom: '16px' }}>
         <label className={styles.label}>选择 CRM 平台</label>
         <div className={styles.radioGroup}>
            <button 
               className={`${styles.radioBtn} ${crmProvider === 'youzan' ? styles.radioActive : ''}`}
               onClick={() => setCrmProvider('youzan')}
            >有赞 CRM</button>
            <button 
               className={`${styles.radioBtn} ${crmProvider === 'jst' ? styles.radioActive : ''}`}
               onClick={() => setCrmProvider('jst')}
            >聚水潭</button>
            <button 
               className={`${styles.radioBtn} ${crmProvider === 'wangdian' ? styles.radioActive : ''}`}
               onClick={() => setCrmProvider('wangdian')}
            >旺店通</button>
            <button 
               className={`${styles.radioBtn} ${crmProvider === 'custom' ? styles.radioActive : ''}`}
               onClick={() => setCrmProvider('custom')}
            >自定义 API</button>
         </div>
      </div>

      {/* 凭证配置 */}
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.label}>{crmProvider === 'custom' ? 'API 接入点 / Base URL' : 'App ID（应用标识）'}</label>
          <input
            type="text"
            className={styles.input}
            value={config.appId}
            onChange={e => setConfig(prev => ({ ...prev, appId: e.target.value }))}
            placeholder={crmProvider === 'custom' ? "https://api.yourcrm.com" : "请输入 App ID..."}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>App Secret</label>
          <input
            type="password"
            className={styles.input}
            value={config.appSecret}
            onChange={e => setConfig(prev => ({ ...prev, appSecret: e.target.value }))}
            placeholder="********"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>店铺 ID</label>
          <input
            type="text"
            className={styles.input}
            value={config.shopId}
            onChange={e => setConfig(prev => ({ ...prev, shopId: e.target.value }))}
            placeholder="请输入店铺标识..."
          />
        </div>
      </div>

      {/* 连接测试 */}
      <div className={styles.actionRow}>
        <button
          className={styles.testBtn}
          onClick={testConnection}
          disabled={isTesting}
        >
          {isTesting ? '⏳ 测试中...' : '🔌 测试连接'}
        </button>
        {testResult && (
          <span className={`${styles.testResult} ${testResult.success ? styles.resultSuccess : styles.resultError}`}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </span>
        )}
      </div>

      <div className={styles.divider} />

      {/* 同步设置 */}
      <div className={styles.syncSection}>
        <div className={styles.toggleRow}>
          <div>
            <span className={styles.toggleLabel}>启用自动同步</span>
            <span className={styles.toggleDesc}>定期从 CRM 拉取最新客户和订单数据</span>
          </div>
          <div className={styles.toggleSwitch}>
            <input
              type="checkbox"
              id="toggleYzSync"
              checked={config.syncEnabled}
              onChange={e => setConfig(prev => ({ ...prev, syncEnabled: e.target.checked }))}
            />
            <label htmlFor="toggleYzSync"></label>
          </div>
        </div>

        {config.syncEnabled && (
          <div className={styles.syncOptions}>
            <label className={styles.label}>同步频率</label>
            <div className={styles.radioGroup}>
              {[
                { key: 'hourly', label: '每小时' },
                { key: 'daily', label: '每天' },
                { key: 'manual', label: '仅手动' },
              ].map(opt => (
                <button
                  key={opt.key}
                  className={`${styles.radioBtn} ${config.syncInterval === opt.key ? styles.radioActive : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, syncInterval: opt.key }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {config.lastSyncAt && (
          <div className={styles.lastSync}>
            最近同步: {new Date(config.lastSyncAt).toLocaleString('zh-CN')}
          </div>
        )}

        <div className={styles.actionRow}>
          <button
            className={styles.syncBtn}
            onClick={triggerSync}
            disabled={isSyncing}
          >
            {isSyncing ? '⏳ 同步中...' : '🔄 立即同步'}
          </button>
        </div>
      </div>

      <div className={styles.divider} />

      {/* 保存 */}
      <button
        className={styles.saveBtn}
        onClick={saveConfig}
        disabled={isSaving}
      >
        {isSaving ? '⏳ 保存中...' : '💾 保存 CRM 配置'}
      </button>
    </div>
  );
}
