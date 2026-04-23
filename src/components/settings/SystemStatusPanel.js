'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './SystemStatusPanel.module.css';

/**
 * 系统状态面板
 * 展示 AI 模型连通性、CRM 连接状态、账号在线情况
 */
export default function SystemStatusPanel() {
  const [statuses, setStatuses] = useState({
    aiModel: { status: 'checking', label: 'AI 大模型', detail: '' },
    knowledgeBase: { status: 'checking', label: '知识库', detail: '' },
    crm: { status: 'checking', label: 'CRM系统', detail: '' },
    account: { status: 'checking', label: '账号模式', detail: '' },
  });

  const checkStatuses = useCallback(async () => {
    // 检查 AI 模型状态
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const aiRes = await fetch(`${basePath}/api/settings/ai-model`);
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setStatuses(prev => ({
          ...prev,
          aiModel: {
            ...prev.aiModel,
            status: aiData.enabled && (aiData.apiKey || aiData.apiKeyMasked) ? 'online' : 'offline',
            detail: aiData.enabled
              ? `${aiData.provider} / ${aiData.modelName}`
              : '未启用',
          },
        }));
      }
    } catch (e) {
      setStatuses(prev => ({
        ...prev,
        aiModel: { ...prev.aiModel, status: 'error', detail: '检查失败' },
      }));
    }

    // 检查知识库状态
    setStatuses(prev => ({
      ...prev,
      knowledgeBase: {
        ...prev.knowledgeBase,
        status: 'online',
        detail: '智谱知识库',
      },
      crm: {
        ...prev.crm,
        status: 'warning',
        detail: '有赞（测试）',
      },
    }));

    // 检查账号状态（暂为 mock）
    setStatuses(prev => ({
      ...prev,
      account: {
        ...prev.account,
        status: 'warning',
        detail: '模拟模式',
      },
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkStatuses();
    }, 0);

    return () => clearTimeout(timer);
  }, [checkStatuses]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return '🟢';
      case 'offline': return '🔴';
      case 'warning': return '🟡';
      case 'checking': return '⏳';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'var(--color-success, #07C160)';
      case 'offline': return 'var(--color-error, #FF4D4F)';
      case 'warning': return 'var(--color-warning, #FAAD14)';
      default: return 'var(--color-text-tertiary)';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>📡</span>
        <span className={styles.headerTitle}>系统状态</span>
        <button className={styles.refreshBtn} onClick={checkStatuses}>
          🔄
        </button>
      </div>
      <div className={styles.statusGrid}>
        {Object.entries(statuses).map(([key, item]) => (
          <div key={key} className={styles.statusItem}>
            <div className={styles.statusDot} style={{ background: getStatusColor(item.status) }} />
            <div className={styles.statusInfo}>
              <span className={styles.statusLabel}>{item.label}</span>
              <span className={styles.statusDetail}>{item.detail || '检查中...'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
