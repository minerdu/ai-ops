'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/common/Toast';
import styles from './YouzanConfigPanel.module.css';
import { apiFetch } from '@/lib/basePath';

const INTEGRATIONS = [
  { id: 'youzan', name: '有赞', desc: '社交电商零售平台', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>, color: '#EF4444', endpoint: 'https://open.youzan.com/api/' },
  { id: 'fxiaoke', name: '纷享销客', desc: '连接型CRM，赋能企业业务增长', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>, color: '#F97316', endpoint: 'https://api.fxiaoke.com/cgi/' },
  { id: 'custom', name: '通用 CRM', desc: '支持 Webhook 与标准 API 对接', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M8 11V7a4 4 0 1 1 8 0v4"></path><rect x="4" y="11" width="16" height="10" rx="2"></rect></svg>, color: '#6B7280', endpoint: 'https://api.yourdomain.com/' }
];

export default function YouzanConfigPanel() {
  const toast = useToast();
  const [crmProvider, setCrmProvider] = useState('youzan');
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

  useEffect(() => {
    void loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await apiFetch('/api/youzan', { cache: 'no-store' });
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
      void e;
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const payload = { ...config };
      if (!payload.appSecret && config.hasSecret) {
        payload.appSecret = '••••••••';
      }
      const res = await apiFetch('/api/youzan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('CRM 配置已保存');
        await loadConfig();
      } else {
        const data = await res.json();
        toast.error(data.error || '保存失败');
      }
    } catch (e) {
      void e;
      toast.error('网络错误');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    if (config.appId && (config.appSecret || config.hasSecret)) {
      try {
        const savePayload = { ...config };
        if (!savePayload.appSecret && config.hasSecret) {
          savePayload.appSecret = '••••••••';
        }
        await apiFetch('/api/youzan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayload),
        });

        const res = await apiFetch('/api/youzan', { method: 'POST' });
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon} style={{ display: 'flex', color: 'var(--color-primary)', alignItems: 'center' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></span>
        <div>
          <h3 className={styles.headerTitle}>CRM / 渠道接入</h3>
          <p className={styles.headerDesc}>连接企微、表单、活动系统或第三方 CRM，同步客户与订单数据</p>
        </div>
      </div>

      <div className={styles.integrationList}>
        {INTEGRATIONS.map((crm) => (
          <div
            key={crm.id}
            className={`${styles.crmCard} ${crmProvider === crm.id ? styles.crmCardActive : ''}`}
            style={{
              borderColor: crmProvider === crm.id ? crm.color : 'var(--color-border-light, rgba(0,0,0,0.08))',
              backgroundColor: `${crm.color}05`,
            }}
          >
            <div
              className={styles.crmHeader}
              onClick={() => setCrmProvider(crm.id)}
              style={{ backgroundColor: `${crm.color}08` }}
            >
              <div className={styles.crmIcon} style={{ color: crm.color, backgroundColor: `${crm.color}20`, borderColor: `${crm.color}40` }}>
                {crm.svg}
              </div>
              <div className={styles.crmInfo}>
                <h4 className={styles.crmName} style={{ color: crm.color }}>{crm.name}</h4>
                <p className={styles.crmDesc}>{crm.desc}</p>
              </div>
              <div className={styles.crmRadio}>
                <input
                  type="radio"
                  checked={crmProvider === crm.id}
                  readOnly
                  style={{ accentColor: crm.color }}
                />
              </div>
            </div>

            {crmProvider === crm.id && (
              <div className={styles.crmConfigArea} style={{ borderTopColor: `${crm.color}20`, backgroundColor: `${crm.color}03` }}>
                <div className={styles.configNotice} style={{ color: crm.color, backgroundColor: `${crm.color}10`, borderColor: `${crm.color}30` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  请参考对应平台的开发者文档获取 API 信息，配置保存后系统将尝试连接验证。
                </div>

                <div className={styles.fieldGroup} style={{ padding: '0', marginBottom: '16px' }}>
                  <div className={styles.field}>
                    <label className={styles.label}>API Endpoint (服务器地址)</label>
                    <input type="text" className={styles.inputReadOnly} value={crm.endpoint} readOnly />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>App ID / Client ID <span style={{ color: '#EF4444' }}>*</span></label>
                    <input
                      type="text"
                      className={styles.input}
                      value={config.appId}
                      onChange={(e) => setConfig((prev) => ({ ...prev, appId: e.target.value }))}
                      placeholder="请输入应用 ID 或标识"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>App Secret / Client Secret <span style={{ color: '#EF4444' }}>*</span></label>
                    <input
                      type="password"
                      className={styles.input}
                      value={config.appSecret}
                      onChange={(e) => setConfig((prev) => ({ ...prev, appSecret: e.target.value }))}
                      placeholder={config.hasSecret ? '已配置，输入新密钥可更改' : '请输入密钥'}
                    />
                  </div>
                  {(crm.id === 'youzan' || crm.id === 'custom') && (
                    <div className={styles.field}>
                      <label className={styles.label}>租户 / 店铺 ID</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={config.shopId}
                        onChange={(e) => setConfig((prev) => ({ ...prev, shopId: e.target.value }))}
                        placeholder="请输入企业、店铺或租户标识"
                      />
                    </div>
                  )}
                  <div className={styles.field}>
                    <label className={styles.label}>Webhook 回调地址 (用于接收数据)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className={styles.inputReadOnly} value="https://api.agent.ai/v1/webhook/crm/callback" readOnly style={{ flex: 1 }} />
                      <button className={styles.copyBtn} type="button">复制</button>
                    </div>
                  </div>
                </div>

                <div className={styles.actionRow} style={{ padding: '0 0 16px 0' }}>
                  <button
                    className={styles.testBtn}
                    onClick={testConnection}
                    disabled={isTesting}
                    style={{ borderColor: crm.color, color: crm.color }}
                  >
                    {isTesting ? '连接测试中...' : '测试连接'}
                  </button>
                  {testResult && (
                    <span className={`${styles.testResult} ${testResult.success ? styles.resultSuccess : styles.resultError}`}>
                      {testResult.success ? '已连接' : '连接失败'} · {testResult.message}
                    </span>
                  )}
                </div>

                <div className={styles.divider} style={{ margin: '0 0 16px 0' }} />

                <button
                  className={styles.saveBtn}
                  style={{ margin: '0', width: '100%', backgroundColor: crm.color }}
                  onClick={saveConfig}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : '保存接入配置'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
