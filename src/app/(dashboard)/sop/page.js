'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/common/Toast';
import styles from './page.module.css';
import { apiFetch } from '@/lib/basePath';

export default function SOPPage() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const toast = useToast();

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/sop', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        // Transform API data to match component format
        const formatted = data.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          icon: t.icon || '✨',
          isActive: t.isActive,
          needApproval: t.needApproval,
          trigger: t.triggerConditions || { condition: '未互动天数', operator: '>=', value: 14 },
          action: t.action || { type: 'send_message', delayHours: 0, content: '', requireApproval: true },
          stats: t.stats || { triggered: 0, approved: 0, replied: 0 },
        }));
        setTemplates(formatted);
      }
    } catch (e) {
      console.error('Failed to fetch SOP templates:', e);
      toast.error('加载 SOP 模板失败');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const toggleSop = async (id) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    const newActive = !template.isActive;
    // Optimistic update
    setTemplates(templates.map(t => t.id === id ? { ...t, isActive: newActive } : t));

    try {
      const res = await apiFetch('/api/sop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: newActive })
      });
      if (res.ok) {
        toast.success(newActive ? `「${template.name}」已启用` : `「${template.name}」已停用`);
      } else {
        // Rollback
        setTemplates(templates.map(t => t.id === id ? { ...t, isActive: !newActive } : t));
        toast.error('操作失败，请重试');
      }
    } catch (e) {
      setTemplates(templates.map(t => t.id === id ? { ...t, isActive: !newActive } : t));
      toast.error('网络错误');
    }
  };

  const openEditor = (template) => {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
  };

  const saveEditor = () => {
    setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
    setEditingTemplate(null);
    toast.success('SOP 模板配置已保存');
    // TODO: POST/PUT to persist full template edit when backend supports it
  };

  if (isLoading) {
    return (
      <div className={styles.sopPage}>
        <div className={styles.header}>
          <div className={styles.titleInfo}>
            <h2 className={styles.title}>🔄 SOP 自动化模板</h2>
            <p className={styles.subtitle}>加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sopPage}>
      <div className={styles.header}>
        <div className={styles.titleInfo}>
          <h2 className={styles.title}>🔄 SOP 自动化模板</h2>
          <p className={styles.subtitle}>利用 AI 和规则引擎建立的规模化私域运营动作池，一键激活。</p>
        </div>
        <button className={styles.createBtn} onClick={() => toast('自定义 SOP 功能即将上线')}>+ 自定义 SOP</button>
      </div>

      <div className={styles.listContainer}>
        {templates.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            暂无 SOP 模板
          </div>
        ) : templates.map(t => (
          <div key={t.id} className={styles.sopCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <span className={styles.iconBox}>{t.icon}</span>
                <div className={styles.cardTitleBox}>
                  <h3 className={styles.cardTitle}>{t.name}</h3>
                  <span className={`${styles.statusBadge} ${t.isActive ? styles.statusActive : styles.statusInactive}`}>
                    {t.isActive ? '运行中' : '已停用'}
                  </span>
                </div>
              </div>
              <div className={styles.toggleSwitch}>
                <input 
                  type="checkbox" 
                  id={`toggle-${t.id}`}
                  checked={t.isActive} 
                  onChange={() => toggleSop(t.id)} 
                />
                <label htmlFor={`toggle-${t.id}`}></label>
              </div>
            </div>
            
            <p className={styles.cardDesc}>{t.description}</p>
            
            <div className={styles.logicSummary}>
              <div className={styles.logicRow}>
                <span className={styles.logicLabel}>TRIGGER</span>
                <span className={styles.logicValue}>
                  若 <b>{t.trigger.condition}</b> {t.trigger.operator} {String(t.trigger.value)}
                </span>
              </div>
              <div className={styles.logicRow}>
                <span className={styles.logicLabel}>ACTION</span>
                <span className={styles.logicValue}>
                  {t.action.delayHours > 0 ? `延迟 ${t.action.delayHours} 小时后` : '立即'}执行「发送消息」
                </span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.statInfo}>
                已触达 {t.stats?.triggered || 0} 人次 · 审批通过 {t.stats?.approved || 0}
              </span>
              <button className={styles.editBtn} onClick={() => openEditor(t)}>配置规则 ⚙️</button>
            </div>
          </div>
        ))}
      </div>

      {editingTemplate && (
        <div className={styles.drawerOverlay} onClick={() => setEditingTemplate(null)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3>编辑 SOP: {editingTemplate.name}</h3>
              <button className={styles.drawerClose} onClick={() => setEditingTemplate(null)}>✕</button>
            </div>
            
            <div className={styles.drawerBody}>
              <div className={styles.formSection}>
                <h4>基本信息</h4>
                <div className={styles.formGroup}>
                  <label>SOP 名称</label>
                  <input 
                    type="text" 
                    value={editingTemplate.name} 
                    onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>业务描述</label>
                  <textarea 
                    value={editingTemplate.description} 
                    onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                    className={styles.textarea}
                    rows={2}
                  />
                </div>
              </div>

              <div className={styles.formSection}>
                <h4>⚡ 触发雷达圈定规则</h4>
                <div className={styles.triggerBox}>
                  <select 
                    className={styles.select}
                    value={editingTemplate.trigger.condition}
                    onChange={e => setEditingTemplate({
                      ...editingTemplate, 
                      trigger: {...editingTemplate.trigger, condition: e.target.value}
                    })}
                  >
                    <option>未互动天数</option>
                    <option>意向分</option>
                    <option>生命周期状态</option>
                    <option>拥有标签</option>
                  </select>
                  <select 
                    className={styles.selectSmall}
                    value={editingTemplate.trigger.operator}
                    onChange={e => setEditingTemplate({
                      ...editingTemplate, 
                      trigger: {...editingTemplate.trigger, operator: e.target.value}
                    })}
                  >
                    <option value=">=">&gt;=</option>
                    <option value="==">==</option>
                    <option value="<=">&lt;=</option>
                  </select>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={editingTemplate.trigger.value}
                    onChange={e => setEditingTemplate({
                      ...editingTemplate, 
                      trigger: {...editingTemplate.trigger, value: e.target.value}
                    })}
                  />
                </div>
                <p className={styles.formHint}>系统每天定时扫描所有客户，满足该条件即进入下一步。</p>
              </div>

              <div className={styles.formSection}>
                <h4>🎯 执行动作与话术</h4>
                <div className={styles.formGroupRow}>
                  <label>延迟执行时间</label>
                  <div className={styles.delayInputBox}>
                    <input 
                      type="number" 
                      className={styles.inputSmall} 
                      value={editingTemplate.action.delayHours}
                      onChange={e => setEditingTemplate({
                        ...editingTemplate, 
                        action: {...editingTemplate.action, delayHours: parseInt(e.target.value, 10) || 0}
                      })}
                    /> 小时
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>AI 生成话术底模</label>
                  <div className={styles.aiMessageWrapper}>
                    <textarea 
                      value={editingTemplate.action.content} 
                      onChange={e => setEditingTemplate({
                        ...editingTemplate, 
                        action: {...editingTemplate.action, content: e.target.value}
                      })}
                      className={styles.textareaAi}
                      rows={4}
                    />
                    <div className={styles.aiWandTag}>✨ AI 润色加持中</div>
                  </div>
                </div>
                <div className={styles.formGroupCheckbox}>
                  <input 
                    type="checkbox" 
                    id="requireApproval"
                    checked={editingTemplate.action.requireApproval}
                    onChange={e => setEditingTemplate({
                      ...editingTemplate,
                      action: {...editingTemplate.action, requireApproval: e.target.checked}
                    })}
                  />
                  <label htmlFor="requireApproval">每次生成实际跟进记录前，要求人工进行审批 (推荐开启)</label>
                </div>
              </div>
            </div>

            <div className={styles.drawerActions}>
              <button className={styles.btnCancel} onClick={() => setEditingTemplate(null)}>取消</button>
              <button className={styles.btnSave} onClick={saveEditor}>保存配置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
