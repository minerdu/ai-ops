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

  useEffect(() => {
    if (prevCustomerIdRef.current !== customerId) {
      setMessages(initialMessages || []);
      prevCustomerIdRef.current = customerId;
      setShowToolbar(false);
      setShowMaterialPicker(false);
      setShowTaskCreator(false);
      setShowTransferModal(false);
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

      if (data.success && data.type === 'workflow') {
        setCommandMessages(prev => [...prev, {
          id: `result-${Date.now()}`,
          role: 'system',
          type: 'workflow',
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

  // ==========================================
  // 运营指挥中心模式（未选择客户时）
  // ==========================================
  if (!customerId) {
    return (
      <div className={styles.chatPanel}>
        <div className={styles.messagesArea}>
          {commandMessages.length === 0 ? (
            <div className={styles.emptyChat}>
              <div className={styles.emptyChatIcon}>🎯</div>
              <h3 className={styles.emptyChatTitle}>运营指挥中心</h3>
              <p className={styles.emptyChatDesc}>用自然语言下达运营指令，AI 将自动解析并执行</p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
                {[
                  '🎁 对高意向客户发送体验优惠券',
                  '🔔 激活所有沉默客户',
                  '💎 给VIP客户发送专属福利通知',
                  '📣 向未消费客户推荐新人套餐',
                ].map((hint, i) => (
                  <button
                    key={i}
                    onClick={() => { setInputValue(hint.substring(2).trim()); }}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
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
                    {msg.role === 'system' && msg.type === 'workflow' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className={styles.aiLabel}>
                          <span className={styles.aiIcon}>⚡</span>
                          <span>工作流已生成</span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                          🎯 {msg.data.plan?.intent}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                          <div>🔍 筛选条件：{msg.data.plan?.filterDesc}</div>
                          <div>📌 命中客户：{msg.data.execution?.targetCount} 位</div>
                          <div>📝 任务名：{msg.data.plan?.actionTitle}</div>
                        </div>
                        {msg.data.execution?.targetNames?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {msg.data.execution.targetNames.map((name, i) => (
                              <span key={i} style={{
                                padding: '2px 8px',
                                background: '#E6F7EF',
                                color: '#07C160',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: '500',
                              }}>{name}</span>
                            ))}
                          </div>
                        )}
                        <div style={{
                          padding: '10px',
                          background: 'var(--color-bg-page)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          lineHeight: '1.5',
                          borderLeft: '3px solid var(--color-primary)',
                        }}>
                          📨 发送内容：{msg.data.plan?.actionContent}
                        </div>
                        <div style={{
                          padding: '8px 12px',
                          background: msg.data.plan?.needApproval ? '#FFF7E6' : '#E6F7EF',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: msg.data.plan?.needApproval ? '#FA8C16' : '#07C160',
                        }}>
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
                      {new Date(msg.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
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
        {/* Command Input */}
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
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`${styles.messageWrapper} ${
                  msg.direction === 'inbound' ? styles.inbound : styles.outbound
                } animate-fadeInUp`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {msg.direction === 'inbound' && (
                  <div className={styles.msgAvatar}>
                    {customerName ? customerName.slice(-1) : '客'}
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
                    {(msg.content || '').split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < (msg.content || '').split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  <div className={styles.messageTime}>
                    {new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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

