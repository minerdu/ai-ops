'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/common/Toast';
import styles from './YouzanConfigPanel.module.css';

/**
 * CRM 系统接入面板
 * 
 * 管理有赞 CRM 系统的授权凭证、连接测试与数据同步
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
    hasSecret: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

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
          hasSecret: data.hasSecret || false,
        });
      }
    } catch (e) {
      // 首次使用，API 可能不存在
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const payload = { ...config };
      // 如果 appSecret 未输入新值，且已有旧密钥，发送脱敏占位符让后端跳过更新
      if (!payload.appSecret && config.hasSecret) {
        payload.appSecret = '••••••••';
      }
      const res = await fetch('/api/youzan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('CRM 配置已保存');
        // 重新加载以获取最新状态
        await loadConfig();
      } else {
        const data = await res.json();
        toast.error(data.error || '保存失败');
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

    // 先确保配置已保存
    if (config.appId && (config.appSecret || config.hasSecret)) {
      try {
        // 先保存最新配置
        const savePayload = { ...config };
        if (!savePayload.appSecret && config.hasSecret) {
          savePayload.appSecret = '••••••••';
        }
        await fetch('/api/youzan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayload),
        });

        // 然后测试连接
        const res = await fetch('/api/youzan', { method: 'POST' });
        const data = await res.json();
        
        setTestResult({
          success: data.success,
          message: data.message,
        });
        
        if (data.success) {
          toast.success(data.message || 'CRM API 连接成功！');
        } else {
          toast.error(data.message || '连接失败');
        }
      } catch (e) {
        setTestResult({ success: false, message: `网络错误: ${e.message}` });
        toast.error('网络请求失败');
      }
    } else {
      setTestResult({ success: false, message: '请先填写 App ID 和 App Secret' });
      toast.error('请先填写必要配置');
    }

    setIsTesting(false);
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/youzan/sync', { method: 'POST' });
      const data = await res.json();

      setSyncResult(data);

      if (data.success) {
        toast.success(data.message || '同步完成！');
        // 刷新配置获取最新同步时间
        await loadConfig();
      } else {
        toast.error(data.message || '同步失败');
      }
    } catch (e) {
      setSyncResult({ success: false, message: `网络错误: ${e.message}` });
      toast.error('同步请求失败');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon} style={{ display: 'flex', color: 'var(--color-primary)', alignItems: 'center' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></span>
        <div>
          <h3 className={styles.headerTitle}>CRM 系统接入</h3>
          <p className={styles.headerDesc}>连接有赞 CRM 系统，实时同步客户与订单数据</p>
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
        <div className={styles.field} style={{ padding: '16px', backgroundColor: '#F0F9FF', borderRadius: '8px', marginBottom: '8px' }}>
          <label className={styles.label} style={{ color: '#0284C7' }}>{crmProvider === 'custom' ? 'API 接入点 / Base URL' : 'App ID（应用标识）'}</label>
          <input
            type="text"
            className={styles.input}
            value={config.appId}
            onChange={e => setConfig(prev => ({ ...prev, appId: e.target.value }))}
            placeholder={crmProvider === 'custom' ? "https://api.yourcrm.com" : "请输入 App ID..."}
          />
        </div>

        <div className={styles.field} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '8px' }}>
          <label className={styles.label} style={{ color: '#059669' }}>
            App Secret
            {config.hasSecret && !config.appSecret && (
              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#888' }}>（已配置，留空则保持不变）</span>
            )}
          </label>
          <input
            type="password"
            className={styles.input}
            value={config.appSecret}
            onChange={e => setConfig(prev => ({ ...prev, appSecret: e.target.value }))}
            placeholder={config.hasSecret ? "已配置，输入新密钥可更改" : "请输入 App Secret..."}
          />
        </div>

        <div className={styles.field} style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px', marginBottom: '8px' }}>
          <label className={styles.label} style={{ color: '#D97706' }}>店铺 ID</label>
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
          {isTesting ? '⏳ 连接测试中...' : '🔌 测试连接'}
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
            <span className={styles.toggleDesc}>定期从有赞 CRM 拉取最新客户和订单数据</span>
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

        <div className={styles.actionRow} style={{ padding: '12px 0' }}>
          <button
            className={styles.syncBtn}
            onClick={triggerSync}
            disabled={isSyncing}
          >
            {isSyncing ? '⏳ 同步中，请稍候...' : '🔄 立即同步'}
          </button>
        </div>

        {/* 同步结果展示 */}
        {syncResult && (
          <div className={styles.syncResultBox} style={{
            marginTop: '8px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: syncResult.success ? 'rgba(7, 193, 96, 0.08)' : 'rgba(255, 77, 79, 0.08)',
            border: `1px solid ${syncResult.success ? 'rgba(7, 193, 96, 0.2)' : 'rgba(255, 77, 79, 0.2)'}`,
            fontSize: '13px',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '6px', color: syncResult.success ? '#07C160' : '#FF4D4F' }}>
              {syncResult.success ? '✅ 同步成功' : '⚠️ 同步完成（有错误）'}
            </div>
            {syncResult.totalFetched !== undefined && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '12px', color: 'var(--color-text-secondary, #aaa)' }}>
                <span>📥 获取客户: {syncResult.totalFetched}</span>
                <span>➕ 新增: {syncResult.totalCreated}</span>
                <span>🔄 更新: {syncResult.totalUpdated}</span>
                <span>⏭️ 跳过: {syncResult.totalSkipped}</span>
                <span>⏱️ 耗时: {syncResult.duration}</span>
              </div>
            )}
            {syncResult.errors && syncResult.errors.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#FF4D4F' }}>
                {syncResult.errors.slice(0, 3).map((err, i) => (
                  <div key={i}>❌ {err.customer || `第${err.page}页`}: {err.error}</div>
                ))}
                {syncResult.errors.length > 3 && <div>...还有 {syncResult.errors.length - 3} 个错误</div>}
              </div>
            )}
          </div>
        )}
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
