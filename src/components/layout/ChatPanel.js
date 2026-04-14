'use client';

import { useState, useRef, useEffect } from 'react';
import useStore from '@/lib/store';
import { useToast } from '@/components/common/Toast';
import styles from './ChatPanel.module.css';
import MaterialSelector from '@/components/common/MaterialSelector';

export default function ChatPanel({ customerName, customerId, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showTaskCreator, setShowTaskCreator] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ taskType: 'text', content: '', scheduledAt: '', needApproval: true });
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  // Command center mode (when no customer selected)
  const [commandMessages, setCommandMessages] = useState([]);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const messagesEndRef = useRef(null);
  const prevCustomerIdRef = useRef(customerId);
  const toast = useToast();
  
  const customer = useStore(s => s.customers.find(c => c.id === customerId));
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);

  const handleLoadFullHistory = async () => {
    setIsLoadingAll(true);
    try {
      const res = await fetch(`/api/messages?customerId=${customerId}&all=true`);
      const data = await res.json();
      setMessages(data);
      setIsAllLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAll(false);
    }
  };

  useEffect(() => {
    if (prevCustomerIdRef.current !== customerId) {
      setMessages(initialMessages || []);
      prevCustomerIdRef.current = customerId;
      setShowToolbar(false);
      setShowMaterialPicker(false);
      setShowTaskCreator(false);
      setShowTransferModal(false);
    } else if (initialMessages && initialMessages.length > 0) {
      // Messages arrived async after customer was already selected
      setMessages(initialMessages);
    }
  }, [customerId, initialMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Action to send message
  const sendMessageAction = useStore(s => s.sendMessage);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const content = inputValue;
    const userMsg = {
      id: `msg-optimistic-${Date.now()}`,
      direction: 'outbound',
      senderType: 'human',
      contentType: 'text',
      content: content,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    if (customerId) {
        await sendMessageAction(customerId, content, 'human');
    }
  };

  // 运营指挥中心模式：自然语言指令发送
  const handleCommandSend = async () => {
    if (!inputValue.trim()) return;
    const command = inputValue;
    setCommandMessages(prev => [...prev, {
      id: `cmd-${Date.now()}`,
      role: 'user',
      content: command,
      time: new Date().toISOString(),
    }]);
    setInputValue('');
    setIsProcessingCommand(true);

    try {
      const res = await fetch('/api/ai-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();

      if (data.success && (data.type === 'workflow' || data.type === 'sop_workflow')) {
        setCommandMessages(prev => [...prev, {
          id: `result-${Date.now()}`,
          role: 'system',
          type: data.type === 'sop_workflow' ? 'sop_workflow' : 'workflow',
          data: data,
          time: new Date().toISOString(),
        }]);
        toast.success(data.summary);
      } else if (data.success && data.type === 'text') {
        setCommandMessages(prev => [...prev, {
          id: `text-${Date.now()}`,
          role: 'system',
          type: 'text',
          content: data.message,
          time: new Date().toISOString(),
        }]);
      } else {
        setCommandMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'system',
          type: 'error',
          content: data.message || '执行失败',
          time: new Date().toISOString(),
        }]);
      }
    } catch (e) {
      setCommandMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'system',
        type: 'error',
        content: `网络错误: ${e.message}`,
        time: new Date().toISOString(),
      }]);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      customerId ? handleSend() : handleCommandSend();
    }
  };

  const handleInsertMaterial = async (material) => {
    const finalContent = material.type === 'text' ? material.content : `[${material.type === 'image' ? '图片' : material.type === 'video' ? '视频' : '链接'}] ${material.title}`;
    const materialMsg = {
      id: `msg-optimistic-${Date.now()}`,
      direction: 'outbound',
      senderType: 'human',
      contentType: material.type,
      content: finalContent,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, materialMsg]);
    setShowMaterialPicker(false);

    if (customerId) {
        await sendMessageAction(customerId, finalContent, 'human');
    }
    toast.success('素材已发送');
  };

  const handleCreateTask = async () => {
    if (!taskForm.content.trim()) {
      toast.warning('请输入消息内容');
      return;
    }
    setIsCreatingTask(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          title: `跟进任务 - ${customerName || '客户'}`,
          taskType: taskForm.taskType,
          content: taskForm.content,
          scheduledAt: taskForm.scheduledAt || null,
          triggerSource: 'manual',
          triggerReason: '手动创建跟进任务',
          needApproval: taskForm.needApproval,
        })
      });
      if (res.ok) {
        toast.success('跟进任务已创建，等待审批');
        setShowTaskCreator(false);
        setTaskForm({ taskType: 'text', content: '', scheduledAt: '', needApproval: true });
      } else {
        toast.error('创建任务失败');
      }
    } catch (e) {
      console.error('Failed to create task:', e);
      toast.error('网络错误，请重试');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleAddToKnowledge = (content) => {
    toast.success('已将此回复存入全局素材库，帮助AI学习！');
  };

  const handleTransferToHuman = () => {
    setShowTransferModal(false);
    toast.success('已转接人工，AI 已暂停回复');
  };

  const [journeyExpanded, setJourneyExpanded] = useState(false);
  const [journeyStats, setJourneyStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setIsLoadingStats(true);
      fetch('/api/tasks')
        .then(r => r.json())
        .then(data => {
          const tasks = Array.isArray(data) ? data : [];
          const today = new Date();
          today.setHours(0,0,0,0);
          const todayTasks = tasks.filter(t => new Date(t.scheduledAt || t.createdAt) >= today);
          const journeyTasks = tasks.filter(t => t.triggerSource === 'journey');
          
          const stages = [
            { key: 'new_ice', label: '新客破冰', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1890ff" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, count: 0 },
            { key: 'intent_chat', label: '需求沟通', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52c41a" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, count: 0 },
            { key: 'convert', label: '客户转化', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fa8c16" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, count: 0 },
            { key: 'order', label: '下单购买', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5222d" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>, count: 0 },
            { key: 'visit', label: '到店体验', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#722ed1" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, count: 0 },
            { key: 'aftercare', label: '客户关怀', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eb2f96" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, count: 0 },
            { key: 'upsell', label: '升单复购', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#faad14" strokeWidth="2"><path d="M12 20V10"/><path d="m18 14-6-6-6 6"/></svg>, count: 0 },
            { key: 'followup', label: '跟进提醒', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#13c2c2" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>, count: 0 },
            { key: 'reactivate', label: '沉默激活', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0d911" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, count: 0 },
          ];
          journeyTasks.forEach(t => {
            const reason = t.triggerReason || '';
            if (reason.includes('新客破冰')) stages[0].count++;
            else if (reason.includes('需求沟通')) stages[1].count++;
            else if (reason.includes('转化')) stages[2].count++;
            else if (reason.includes('下单') || reason.includes('购买')) stages[3].count++;
            else if (reason.includes('到店') || reason.includes('体验')) stages[4].count++;
            else if (reason.includes('关怀')) stages[5].count++;
            else if (reason.includes('升单') || reason.includes('复购')) stages[6].count++;
            else if (reason.includes('跟进')) stages[7].count++;
            else if (reason.includes('激活') || reason.includes('沉默')) stages[8].count++;
            else stages[1].count++;
          });
          
          setJourneyStats({
            totalJourney: journeyTasks.length,
            todayCount: todayTasks.filter(t => t.triggerSource === 'journey').length,
            stages,
            executedRate: journeyTasks.length > 0 ? Math.round(journeyTasks.filter(t => t.executeStatus === 'success').length / journeyTasks.length * 100) : 0,
          });
        })
        .catch(console.error)
        .finally(() => setIsLoadingStats(false));
    }
  }, [customerId]);

  // ==========================================
  // 运营指挥中心模式（未选择客户时）— 统一布局
  // ==========================================
  if (!customerId) {
    return (
      <div className={styles.chatPanel}>
        {/* ===== TOP: Collapsible Journey Status Bar ===== */}
        <div
          onClick={() => setJourneyExpanded(!journeyExpanded)}
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #E6F7EF, #F0FFF4)',
            borderBottom: '1px solid #B7EB8F',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#07C160', display: 'inline-block', boxShadow: '0 0 6px #07C160' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#07C160' }}>
              AI 自主运营引擎运行中
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {journeyStats && (
              <span style={{ fontSize: '12px', color: '#52c41a' }}>
                今日 {journeyStats.todayCount} 条 · 总计 {journeyStats.totalJourney}
              </span>
            )}
            <span style={{ fontSize: '16px', color: '#52c41a', transition: 'transform 0.3s', transform: journeyExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
          </div>
        </div>

        {/* Expanded Journey Details */}
        {journeyExpanded && journeyStats && (
          <div style={{ padding: '12px 16px', background: 'var(--color-bg-section)', borderBottom: '1px solid var(--color-border-light)', flexShrink: 0 }}>
            {/* Mini Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              <div style={{ padding: '10px', background: 'linear-gradient(135deg, #E6F7EF, #D4EFDF)', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#07C160' }}>{journeyStats.totalJourney}</div>
                <div style={{ fontSize: '10px', color: '#52c41a' }}>旅程任务</div>
              </div>
              <div style={{ padding: '10px', background: 'linear-gradient(135deg, #E6F4FF, #D6E4FF)', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1890ff' }}>{journeyStats.todayCount}</div>
                <div style={{ fontSize: '10px', color: '#597ef7' }}>今日执行</div>
              </div>
              <div style={{ padding: '10px', background: 'linear-gradient(135deg, #FFF7E6, #FFE7BA)', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#FA8C16' }}>{journeyStats.executedRate}%</div>
                <div style={{ fontSize: '10px', color: '#d48806' }}>完成率</div>
              </div>
            </div>
            {/* Journey Stages - Horizontal Scroll */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {journeyStats.stages.map((stage, i) => (
                <div key={i} style={{
                  minWidth: '72px', padding: '8px 6px', background: 'var(--color-bg-card)',
                  borderRadius: '10px', textAlign: 'center', border: '1px solid var(--color-border-light)',
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: '18px' }}>{stage.icon}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px', whiteSpace: 'nowrap' }}>{stage.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: stage.count > 0 ? '#07C160' : 'var(--color-text-tertiary)', marginTop: '2px' }}>{stage.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== MIDDLE: Command Messages Area ===== */}
        <div className={styles.messagesArea}>
          {commandMessages.length === 0 ? (
            <div className={styles.emptyChat}>
              <div className={styles.emptyChatIcon}>📋</div>
              <h3 className={styles.emptyChatTitle}>AI智能运营中心</h3>
              <p className={styles.emptyChatDesc}>用自然语言下达运营指令，AI 将自动解析并执行</p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
                {[
                  '🎁 对高意向客户发送200元体验优惠券',
                  '📣 五一活动通知全部VIP客户',
                  '💎 给V6客户发送年度专属礼遇',
                  '🔄 为沉默客户做3次破冰SOP',
                ].map((hint, i) => (
                  <button
                    key={i}
                    onClick={() => { setInputValue(hint.substring(2).trim()); }}
                    style={{
                      padding: '10px 14px', background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)', borderRadius: '10px',
                      fontSize: '13px', color: 'var(--color-text-secondary)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.color = 'var(--color-primary)'; }}
                    onMouseLeave={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.color = 'var(--color-text-secondary)'; }}
                  >{hint}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.messagesList}>
              {commandMessages.map((msg) => (
                <div key={msg.id} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.outbound : styles.inbound} animate-fadeInUp`}>
                  {msg.role === 'system' && (
                    <div className={styles.msgAvatar} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>🤖</div>
                  )}
                  <div className={styles.messageBubble}>
                    {msg.role === 'system' && (msg.type === 'workflow' || msg.type === 'sop_workflow') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className={styles.aiLabel}>
                          <span className={styles.aiIcon}>{msg.type === 'sop_workflow' ? '📋' : '⚡'}</span>
                          <span>{msg.type === 'sop_workflow' ? 'SOP 工作流已编排' : '工作流已生成'}</span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                          🎯 {msg.data.plan?.intent}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                          <div>🔍 筛选条件：{msg.data.plan?.filterDesc}</div>
                          <div>📌 命中客户：{msg.data.execution?.targetCount} 位</div>
                          {msg.type === 'sop_workflow' && <div>📊 编排步数：{msg.data.plan?.steps} 步</div>}
                          {msg.type !== 'sop_workflow' && <div>📝 任务名：{msg.data.plan?.actionTitle}</div>}
                        </div>
                        {msg.data.execution?.targetNames?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {msg.data.execution.targetNames.map((name, i) => (
                              <span key={i} style={{ padding: '2px 8px', background: '#E6F7EF', color: '#07C160', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>{name}</span>
                            ))}
                          </div>
                        )}
                        {msg.type === 'sop_workflow' && msg.data.execution?.tasks?.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Group tasks by step */}
                            {(() => {
                              const steps = {};
                              msg.data.execution.tasks.forEach(t => {
                                const key = `第${t.step}步`;
                                if (!steps[key]) steps[key] = { ...t, count: 0 };
                                steps[key].count++;
                              });
                              return Object.entries(steps).map(([stepName, info], idx) => (
                                <div key={idx} style={{ padding: '8px 12px', background: idx % 2 === 0 ? '#F0F9FF' : '#FFFBEB', borderRadius: '8px', fontSize: '12px', borderLeft: `3px solid ${idx % 2 === 0 ? '#3B82F6' : '#F59E0B'}` }}>
                                  <div style={{ fontWeight: '600', color: idx % 2 === 0 ? '#1D4ED8' : '#D97706' }}>{stepName}：{msg.data.execution.tasks.find(t => t.step === (idx + 1))?.customerName && `${info.count} 条任务`}</div>
                                  <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                    排期：{new Date(info.scheduledAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    {' · '}{info.status}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                        {msg.type !== 'sop_workflow' && (
                          <div style={{ padding: '10px', background: 'var(--color-bg-page)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5', borderLeft: '3px solid var(--color-primary)' }}>
                            📨 发送内容：{msg.data.plan?.actionContent}
                          </div>
                        )}
                        <div style={{ padding: '8px 12px', background: msg.data.plan?.needApproval ? '#FFF7E6' : '#E6F7EF', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: msg.data.plan?.needApproval ? '#FA8C16' : '#07C160' }}>
                          {msg.data.plan?.needApproval
                            ? `⚠️ 涉及财务，已提交审批中心等待确认 (${msg.data.execution?.tasksCreated} 条)`
                            : `✅ 已自动排期执行 ${msg.data.execution?.tasksCreated} 条任务`}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                          💬 {msg.data.summary}
                        </div>
                      </div>
                    ) : msg.role === 'system' && msg.type === 'error' ? (
                      <div style={{ color: '#FF4D4F', fontSize: '13px' }}>❌ {msg.content}</div>
                    ) : msg.role === 'system' ? (
                      <div className={styles.messageContent}>
                        <div className={styles.aiLabel}>
                          <span className={styles.aiIcon}>🤖</span>
                          <span>AI 回复</span>
                        </div>
                        {msg.content}
                      </div>
                    ) : (
                      <div className={styles.messageContent}>{msg.content}</div>
                    )}
                    <div className={styles.messageTime}>
                      {(() => {
                        const d = new Date(msg.time);
                        const now = new Date();
                        const isToday = d.toDateString() === now.toDateString();
                        const yesterday = new Date(now);
                        yesterday.setDate(yesterday.getDate() - 1);
                        const isYesterday = d.toDateString() === yesterday.toDateString();
                        const isSameYear = d.getFullYear() === now.getFullYear();
                        const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                        if (isToday) return `今天 ${time}`;
                        if (isYesterday) return `昨天 ${time}`;
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        if (isSameYear) return `${month}/${day} ${time}`;
                        return `${d.getFullYear()}/${month}/${day} ${time}`;
                      })()}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className={`${styles.msgAvatar} ${styles.myAvatar}`}>悦</div>
                  )}
                </div>
              ))}
              {isProcessingCommand && (
                <div className={`${styles.messageWrapper} ${styles.inbound} animate-fadeIn`}>
                  <div className={styles.msgAvatar} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>🤖</div>
                  <div className={styles.messageBubble}>
                    <div className={styles.aiLabel}>
                      <span className={styles.aiIcon}>⚡</span>
                      <span>AI 正在解析指令并生成工作流...</span>
                    </div>
                    <div className={styles.typingDots}>
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ===== BOTTOM: Command Input (always visible) ===== */}
        <div className={styles.inputAreaWrapper}>
          <div className={styles.inputArea}>
            <div className={styles.inputWrapper}>
              <input
                className={styles.chatInput}
                type="text"
                placeholder="输入运营指令，如：对高意向客户发送优惠券..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessingCommand}
              />
              <button
                className={styles.sendBtn}
                onClick={handleCommandSend}
                disabled={!inputValue.trim() || isProcessingCommand}
                title="执行指令"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 客户对话监控模式（已选择客户时）
  // ==========================================
  return (
    <div className={styles.chatPanel}>
      {/* Messages Area */}
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyChat}>
            <div className={styles.emptyChatIcon}>⚙️</div>
            <h3 className={styles.emptyChatTitle}>
              AI 美业顾问 正在自动接洽 {customerName}
            </h3>
            <p className={styles.emptyChatDesc}>
              对话系统自动运转中，暂无更新消息
            </p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {!isAllLoaded && messages.length >= 40 && (
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <button 
                  onClick={handleLoadFullHistory}
                  disabled={isLoadingAll}
                  style={{ padding: '6px 16px', fontSize: '12px', background: '#e6f7ff', color: '#1890ff', border: '1px solid #91d5ff', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  {isLoadingAll ? '加载中...' : '↑ 点击查看完整沟通记录'}
                </button>
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`${styles.messageWrapper} ${
                  msg.direction === 'inbound' ? styles.inbound : styles.outbound
                } animate-fadeInUp`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {msg.direction === 'inbound' && (
                  <div className={styles.msgAvatar} style={{ background: customer?.assignedToId === 'sub_1' ? '#722ED1' : customer?.assignedToId === 'sub_2' ? '#FA8C16' : customer?.assignedToId === 'sub_3' ? '#13C2C2' : '#3b82f6', color: '#fff' }}>
                    {customer?.isGroup ? (customerName || '群聊').substring(0, 2) : (customerName ? customerName.slice(-2) : '客')}
                  </div>
                )}
                <div className={styles.messageBubble}>
                  {msg.senderType === 'ai' && (
                    <div className={styles.aiLabel}>
                      <span className={styles.aiIcon}>🤖</span>
                      <span>专家AI自动回复</span>
                    </div>
                  )}
                  <div className={styles.messageContent}>
                    {((typeof msg.content === 'string' ? msg.content : (msg.content ? JSON.stringify(msg.content) : ''))).split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < ((typeof msg.content === 'string' ? msg.content : (msg.content ? JSON.stringify(msg.content) : ''))).split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  <div className={styles.messageTime}>
                    {(() => {
                      const d = new Date(msg.createdAt);
                      const now = new Date();
                      const isToday = d.toDateString() === now.toDateString();
                      const yesterday = new Date(now);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const isYesterday = d.toDateString() === yesterday.toDateString();
                      const isSameYear = d.getFullYear() === now.getFullYear();
                      const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                      if (isToday) return `今天 ${time}`;
                      if (isYesterday) return `昨天 ${time}`;
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      if (isSameYear) return `${month}/${day} ${time}`;
                      return `${d.getFullYear()}/${month}/${day} ${time}`;
                    })()}
                  </div>
                </div>
                {msg.direction === 'outbound' && (
                  <div className={`${styles.msgAvatar} ${styles.myAvatar}`}>
                    {msg.senderType === 'ai' ? '🤖' : '悦'}
                  </div>
                )}
                {/* 加入知识库 Hover Button for Human Messages */}
                {msg.direction === 'outbound' && msg.senderType === 'human' && msg.contentType === 'text' && (
                  <button 
                    className={styles.addKnowledgeBtn}
                    title="沉淀为优质话术资产"
                    onClick={() => handleAddToKnowledge(msg.content)}
                  >
                    ⭐
                  </button>
                )}
              </div>
            ))}
            {isTyping && (
              <div className={`${styles.messageWrapper} ${styles.outbound} animate-fadeIn`}>
                <div className={styles.messageBubble}>
                  <div className={styles.aiLabel}>
                    <span className={styles.aiIcon}>🤖</span>
                    <span>AI自主编撰中</span>
                  </div>
                  <div className={styles.typingDots}>
                    <span></span><span></span><span></span>
                  </div>
                </div>
                <div className={`${styles.msgAvatar} ${styles.myAvatar}`}>🤖</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Material Picker Modal */}
      {showMaterialPicker && (
        <MaterialSelector 
          onClose={() => setShowMaterialPicker(false)} 
          onSelect={(m) => {
             handleInsertMaterial(m);
             setShowMaterialPicker(false);
          }}
        />
      )}

      {/* Create Task Modal */}
      {showTaskCreator && customerId && (
        <div className={styles.modalOverlay} onClick={() => setShowTaskCreator(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>📋 创建跟进任务</h3>
              <button className={styles.modalClose} onClick={() => setShowTaskCreator(false)}>✕</button>
            </div>
            <div className={styles.taskForm}>
              <div className={styles.formGroup}>
                <label>客户</label>
                <div className={styles.formValue}>{customerName || '未选择'}</div>
              </div>
              <div className={styles.formGroup}>
                <label>任务类型</label>
                <select 
                  className={styles.formSelect}
                  value={taskForm.taskType}
                  onChange={e => setTaskForm(prev => ({ ...prev, taskType: e.target.value }))}
                >
                  <option value="text">文本消息</option>
                  <option value="image">图片消息</option>
                  <option value="video">视频消息</option>
                  <option value="combo">组合消息</option>
                  <option value="call">人工跟进提醒</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>消息内容</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="输入跟进消息内容..."
                  rows={3}
                  value={taskForm.content}
                  onChange={e => setTaskForm(prev => ({ ...prev, content: e.target.value }))}
                ></textarea>
              </div>
              <div className={styles.formGroup}>
                <label>发送时间</label>
                <input 
                  className={styles.formInput} 
                  type="datetime-local" 
                  value={taskForm.scheduledAt}
                  onChange={e => setTaskForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>需要审批</label>
                <div className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={taskForm.needApproval} 
                    onChange={e => setTaskForm(prev => ({ ...prev, needApproval: e.target.checked }))}
                    id="needApproval" 
                  />
                  <label htmlFor="needApproval"></label>
                </div>
              </div>
              <button
                className={styles.formSubmit}
                onClick={handleCreateTask}
                disabled={isCreatingTask}
              >
                {isCreatingTask ? '创建中...' : '创建任务'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer to Human Modal */}
      {showTransferModal && customerId && (
        <div className={styles.modalOverlay} onClick={() => setShowTransferModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>👤 转接人工</h3>
              <button className={styles.modalClose} onClick={() => setShowTransferModal(false)}>✕</button>
            </div>
            <div style={{ padding: '0 0 16px 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              确定暂停 AI 的自动回复并由人工接管此对话吗？
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                style={{ padding: '6px 16px', background: 'var(--color-bg-section)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => setShowTransferModal(false)}
              >
                取消
              </button>
              <button 
                style={{ padding: '6px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={handleTransferToHuman}
              >
                立即转接
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Toolbar */}
      {showToolbar && customerId && (
        <div className={styles.toolbar}>
          <button className={styles.toolbarItem} onClick={() => { setShowMaterialPicker(true); setShowToolbar(false); }}>
            <span>🖼️</span> 素材库
          </button>
          <button className={styles.toolbarItem} onClick={() => { setShowTaskCreator(true); setShowToolbar(false); }}>
            <span>📋</span> 跟进任务
          </button>
          <button className={styles.toolbarItem} onClick={() => { setShowTransferModal(true); setShowToolbar(false); }}>
            <span>👤</span> 转人工
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className={styles.inputAreaWrapper}>
        <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <button
            className={styles.inputIcon}
            title="更多功能"
            onClick={() => setShowToolbar(!showToolbar)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </button>
          <input
            className={styles.chatInput}
            type="text"
            placeholder="强制人工介入回复..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {inputValue.trim() ? (
            <button className={styles.sendBtn} onClick={handleSend} title="发送">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          ) : (
            <button className={styles.inputIcon} title="语音">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

