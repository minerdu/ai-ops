'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/common/Toast';
import useStore from '@/lib/store';
import SystemStatusPanel from '@/components/settings/SystemStatusPanel';
import SafetyFilters from '@/components/settings/SafetyFilters';
import YouzanConfigPanel from '@/components/settings/YouzanConfigPanel';
import styles from './page.module.css';

// ==============================
// Mock data for QA
// ==============================
const mockQA = [
  { id: 1, question: '你们做什么的？', answer: '我们是专业美业连锁品牌，提供面部护理、皮肤管理、抗衰老等一站式美容服务。', score: '★★★★★' },
  { id: 2, question: '价格怎么算？', answer: '我们有多种套餐选择，基础护理从199元起，建议到店根据您的肤质做个免费检测后再推荐最适合的方案。', score: '★★★★' },
  { id: 3, question: '可以退款吗？', answer: '如对服务不满意，7天内可申请退款。已使用的项目按单次价格结算后退还差额。', score: '★★★★★' },
];

export default function SettingsPage() {
  const [viewState, setViewState] = useState('list');
  const setActiveMainPanel = useStore(s => s.setActiveMainPanel);
  const [persona, setPersona] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState({});
  const toast = useToast();

  // ==============================
  // AI Employee Settings State (截图1复刻)
  // ==============================
  const [employeeForm, setEmployeeForm] = useState({
    personaSource: 'custom', // custom, bestPractice
    quickImportText: '',
    industry: '美容美业',
    position: '首席抗衰顾问',
    introduction: '你好～我是悦心抗衰中心的首席顾问小悦，专注于面部抗衰与健康理疗。我将竭诚为您定制私人逆龄方案，守护您的每一寸肌肤。',
    promptText: `# 蔚为智能体-0109：美业服务标准框架\n\n## 1. 角色设定\n- **角色名**：小悦 (首席抗衰顾问)\n- **性格标签**：温柔体贴、极致专业、不卑不亢、高情商。\n- **核心目标**：提供情绪价值，诊断客户浅层与深层需求，以专业知识为支撑，顺其自然地完成从【种草】到【锁单到店】的转化。\n\n## 2. 沟通原则与语气\n- **拉近距离**：自然使用“小仙女”“姐妹”“宝子”等亲切称呼；\n- **专业克制**：每次回复不超过3句话，用词精练，严禁说教和长篇大论；\n- **情绪同频**：客户抱怨时先共情（如“确实呢，很多姐妹都有这个困扰”）；客户犹豫时懂退让（“没关系，你可以多比较”）；\n- **视觉辅助**：每段适当添加1-2个Emoji 🌿✨💆‍♀️ 水灵灵、高贵一点的图标。\n\n## 3. 标准应答SOP\n### 3.1 询价处理\n- 绝不直接报光秃秃的底价，必须附加价值（如：“体验价599，这不仅是一次护理，更是包含深层肌底检测+定制方案的全案服务哦”）。\n- 永远抛出一个互动反问（如：“平时你有重点关注抗衰吗？”）。\n\n### 3.2 异议处理（觉得贵/考虑一下）\n- 价值重塑：“理解的亲爱的，确实市面上产品很多。但咱们用的是全进口院线设备，一次效果抵得上普通护理十次呢。”\n- 下拉梯队诱饵：“如果感觉有压力，也可以先试试咱们的基础补水卡，一样能感受到我们的手法人效～”\n\n## 4. 严禁行为（红线）\n- 严禁对客户身材/皮肤容貌进行贬低（容貌焦虑营销一律禁止）。\n- 严禁强制要求客户马上转账。\n- 严禁泄露同行比价时的贬低话语。`,
    selectedMembers: ['悦心顾问-小悦'],
  });

  // ==============================
  // AI Model + Knowledge Base State (截图2复刻)
  // ==============================
  const [aiModelForm, setAiModelForm] = useState({
    provider: 'openai',
    apiBaseUrl: '',
    apiKey: '',
    apiKeyMasked: '',
    modelName: '',
    enabled: false,
    // New: Knowledge base fields
    kbSource: 'none', // none, only_kb, agent_kb
    kbId: '',
    contextRounds: 10,
    maxReplyLength: 500,
    allowImages: true,
    allowFiles: true,
    segmentEnabled: true,
    segmentCount: 3,
    segmentTriggerChars: 80,
    segmentModel: 'auto',
    sendInterval: 3,
    stopKeywords: '不用了,算了,停,别发了',
    smartSkipMode: true,
    imageAnalysis: true,
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // ==============================
  // Moments Agent Form
  // ==============================
  const [momentsForm, setMomentsForm] = useState({
    publishEnabled: true,
    publishFrequency: 3,          // per day
    contentMix: { life: 30, professional: 40, product: 30 },
    activeTimeSlots: ['08:00-09:00', '12:00-13:00', '20:00-22:00'],
    aiGenerateContent: true,
    useKnowledgeBase: true,
    autoSelectImages: true,
    avoidRepeat: true,
    // Like & Comment
    likeEnabled: true,
    commentEnabled: true,
    workTimeType: '24小时',
    analyzeScope: '全部',
    commentStyle: 'natural',      // natural, professional, warm
    maxCommentsPerDay: 30,
    // Follow
    followEnabled: false,
    followAccounts: [],
    followContentAdapt: true,
  });

  // ==============================
  // Report view mode
  // ==============================
  const [reportViewMode, setReportViewMode] = useState('day'); // day, week, month

  // ==============================
  // API Loaders
  // ==============================
  const loadAiModelConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings/ai-model');
      if (res.ok) {
        const data = await res.json();
        setAiModelForm(prev => ({
          ...prev,
          provider: data.provider || 'openai',
          apiBaseUrl: data.apiBaseUrl || '',
          apiKey: '',
          apiKeyMasked: data.apiKeyMasked || '',
          modelName: data.modelName || '',
          enabled: data.enabled ?? false,
        }));
      }
    } catch (e) {
      toast.error('加载 AI 模型配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const saveAiModelConfig = async () => {
    setIsSaving(true);
    try {
      const payload = {
        provider: aiModelForm.provider,
        apiBaseUrl: aiModelForm.apiBaseUrl,
        modelName: aiModelForm.modelName,
        enabled: aiModelForm.enabled,
      };
      if (aiModelForm.apiKey) payload.apiKey = aiModelForm.apiKey;
      const res = await fetch('/api/settings/ai-model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('AI 模型配置已保存');
        setViewState('list');
      } else toast.error('保存失败');
    } catch (e) {
      toast.error('网络错误');
    } finally {
      setIsSaving(false);
    }
  };

  const testAiConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const payload = { provider: aiModelForm.provider, apiBaseUrl: aiModelForm.apiBaseUrl, modelName: aiModelForm.modelName, enabled: aiModelForm.enabled };
      if (aiModelForm.apiKey) payload.apiKey = aiModelForm.apiKey;
      await fetch('/api/settings/ai-model', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const res = await fetch('/api/settings/ai-model', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
      data.success ? toast.success(data.message) : toast.error(data.message);
    } catch (e) {
      setTestResult({ success: false, message: e.message });
      toast.error('测试失败: ' + e.message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const loadPersona = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings/persona');
      if (res.ok) setPersona(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleChange = (field, val) => setPersona(p => ({ ...p, [field]: val }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/persona', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona),
      });
      res.ok ? toast.success('已保存') : toast.error('保存失败');
    } catch (e) { toast.error('网络错误'); }
    finally { setIsSaving(false); }
  };

  const handleAIGenerate = async (field) => {
    setIsGenerating(prev => ({ ...prev, [field]: true }));
    setTimeout(() => {
      setIsGenerating(prev => ({ ...prev, [field]: false }));
      toast.success('AI 补全完成');
    }, 2000);
  };

  // ==============================
  // View Title Map
  // ==============================
  const viewTitles = {
    persona: 'AI 员工设置',
    aiModel: 'AI 大模型与知识库',
    safetyRules: '红线与安全规则',
    crmConfig: 'CRM 系统接入',
    momentsAgent: '朋友圈智能体',
    momentsPublish: '朋友圈发布设置',
    momentsLikeComment: '点赞评论设置',
    momentsFollow: '朋友圈跟随',
    accountManagement: '账号管理',
    operationReport: '运营报告',
    loginChoice: '登录选择',
  };

  // ==============================
  // Back navigation
  // ==============================
  const getBackTarget = (v) => {
    if (['momentsPublish', 'momentsLikeComment', 'momentsFollow'].includes(v)) return 'momentsAgent';
    return 'list';
  };

  // ====================================================================
  // DETAIL VIEWS
  // ====================================================================
  if (viewState !== 'list') {
    return (
      <div className={styles.settingsPage}>
        <div className={styles.header}>
          <button className={styles.backBtnIOS} onClick={() => setViewState(getBackTarget(viewState))}>
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span className={styles.backBtnText}>返回</span>
          </button>
          <h2 className={styles.title}>{viewTitles[viewState] || '设置'}</h2>
        </div>

        {/* =================== AI 员工设置 (截图1复刻) =================== */}
        {viewState === 'persona' ? (
          <div className={styles.content}>
            <div className={styles.agentFormContainer}>
              {/* 员工人设来源 */}
              <div className={styles.agentFormSection}>
                <span className={styles.agentFormLabel}>员工人设来源</span>
                <div className={styles.radioGroup}>
                  <button
                    className={`${styles.radioBtn} ${employeeForm.personaSource === 'custom' ? styles.activeFull : ''}`}
                    onClick={() => setEmployeeForm(p => ({ ...p, personaSource: 'custom' }))}
                  >自行配置</button>
                  <button
                    className={`${styles.radioBtn} ${employeeForm.personaSource === 'bestPractice' ? styles.activeFull : ''}`}
                    onClick={() => {
                      setEmployeeForm(p => ({
                        ...p,
                        personaSource: 'bestPractice',
                        industry: '美容美业',
                        position: '首席抗衰顾问',
                        introduction: '你好～我是悦心抗衰中心的首席顾问小悦，专注于面部抗衰与健康理疗。我将竭诚为您定制私人逆龄方案，守护您的每一寸肌肤。',
                        promptText: `# 蔚为智能体-0109：美业服务标准框架\n\n## 1. 角色设定\n- **角色名**：小悦 (首席抗衰顾问)\n- **性格标签**：温柔体贴、极致专业、不卑不亢、高情商。\n- **核心目标**：提供情绪价值，诊断客户浅层与深层需求，以专业知识为支撑，顺其自然地完成从【种草】到【锁单到店】的转化。\n\n## 2. 沟通原则与语气\n- **拉近距离**：自然使用“小仙女”“姐妹”“宝子”等亲切称呼；\n- **专业克制**：每次回复不超过3句话，用词精练，严禁说教和长篇大论；\n- **情绪同频**：客户抱怨时先共情（如“确实呢，很多姐妹都有这个困扰”）；客户犹豫时懂退让（“没关系，你可以多比较”）；\n- **视觉辅助**：每段适当添加1-2个Emoji 🌿✨💆‍♀️ 水灵灵、高贵一点的图标。\n\n## 3. 标准应答SOP\n### 3.1 询价处理\n- 绝不直接报光秃秃的底价，必须附加价值（如：“体验价599，这不仅是一次护理，更是包含深层肌底检测+定制方案的全案服务哦”）。\n- 永远抛出一个互动反问（如：“平时你有重点关注抗衰吗？”）。\n\n### 3.2 异议处理（觉得贵/考虑一下）\n- 价值重塑：“理解的亲爱的，确实市面上产品很多。但咱们用的是全进口院线设备，一次效果抵得上普通护理十次呢。”\n- 下拉梯队诱饵：“如果感觉有压力，也可以先试试咱们的基础补水卡，一样能感受到我们的手法人效～”\n\n## 4. 严禁行为（红线）\n- 严禁对客户身材/皮肤容貌进行贬低（容貌焦虑营销一律禁止）。\n- 严禁强制要求客户马上转账。\n- 严禁泄露同行比价时的贬低话语。`,
                      }));
                      toast.success('已应用「蔚为智能体提示词-0109」配置！');
                    }}
                  >最佳实践配置</button>
                </div>
              </div>

              {/* 快速导入 */}
              <div className={styles.agentFormSection}>
                <div className={styles.labelRow}>
                  <span className={styles.agentFormLabel}>快速导入（粘贴内容一键生成）</span>
                  <button className={styles.aiBtn} onClick={() => handleAIGenerate('quickImport')} disabled={isGenerating.quickImport}>
                    <span>🤖</span>
                    <span>{isGenerating.quickImport ? '生成中...' : 'AI一键生成'}</span>
                  </button>
                </div>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={employeeForm.quickImportText}
                  onChange={(e) => setEmployeeForm(p => ({ ...p, quickImportText: e.target.value }))}
                  placeholder="粘贴公司介绍、产品资料等文本，AI 将自动提取关键信息并生成员工人设..."
                />
              </div>

              <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '4px 0' }}></div>

              {/* 基础信息 */}
              <div className={styles.agentFormSection}>
                <span className={styles.agentFormLabel}>基础信息</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label className={styles.miniLabel}>行业</label>
                    <select
                      className={styles.agentFormInput}
                      value={employeeForm.industry}
                      onChange={(e) => setEmployeeForm(p => ({ ...p, industry: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      <option value="">请选择行业</option>
                      <option value="教育培训">教育培训</option>
                      <option value="电商直播">电商直播</option>
                      <option value="美容美业">美容美业</option>
                      <option value="美妆品牌">美妆品牌</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className={styles.miniLabel}>岗位</label>
                    <select
                      className={styles.agentFormInput}
                      value={employeeForm.position}
                      onChange={(e) => setEmployeeForm(p => ({ ...p, position: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      <option value="">请选择岗位</option>
                      <option value="客户顾问">客户顾问</option>
                      <option value="客户服务">客户服务</option>
                      <option value="销售冠军">销售冠军</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 员工介绍 */}
              <div className={styles.agentFormSection}>
                <div className={styles.labelRow}>
                  <span className={styles.agentFormLabel}>员工介绍</span>
                  <button className={styles.aiBtn} onClick={() => handleAIGenerate('introduction')} disabled={isGenerating.introduction}>
                    <span>🤖</span>
                    <span>{isGenerating.introduction ? '生成中...' : 'AI补全'}</span>
                  </button>
                </div>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={employeeForm.introduction}
                  onChange={(e) => setEmployeeForm(p => ({ ...p, introduction: e.target.value }))}
                  placeholder="例如：你好，我是...，我们专注于...，我拥有X年行业经验..."
                />
              </div>

              {/* 员工提示词 */}
              <div className={styles.agentFormSection}>
                <div className={styles.labelRow}>
                  <span className={styles.agentFormLabel}>员工提示词</span>
                  <button className={styles.aiBtn} onClick={() => handleAIGenerate('promptText')} disabled={isGenerating.promptText}>
                    <span>🤖</span>
                    <span>{isGenerating.promptText ? '生成中...' : 'AI一键生成'}</span>
                  </button>
                </div>
                <textarea
                  className={styles.textarea}
                  rows={10}
                  value={employeeForm.promptText}
                  onChange={(e) => setEmployeeForm(p => ({ ...p, promptText: e.target.value }))}
                  placeholder="使用 Markdown 格式编写详细的人设提示词..."
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                  支持 Markdown 格式 · AI 将根据此提示词理解角色定位并生成对话
                </span>
              </div>

              {/* 成员选择 */}
              <div className={styles.agentFormSection}>
                <span className={styles.agentFormLabel}>成员选择</span>
                <div className={styles.memberList}>
                  {['悦心顾问-小悦', '悦心顾问-小美', '悦心主管-黄经理'].map(m => (
                    <label key={m} className={styles.memberItem}>
                      <input
                        type="checkbox"
                        checked={employeeForm.selectedMembers.includes(m)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEmployeeForm(p => ({ ...p, selectedMembers: [...p.selectedMembers, m] }));
                          } else {
                            setEmployeeForm(p => ({ ...p, selectedMembers: p.selectedMembers.filter(x => x !== m) }));
                          }
                        }}
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button className={styles.agentSaveBtn} onClick={() => { toast.success('AI 员工设置已保存'); setViewState('list'); }}>
                💾 保存设置
              </button>
            </div>
          </div>

        /* =================== AI 大模型与知识库 (截图2复刻) =================== */
        ) : viewState === 'aiModel' ? (
          <div className={styles.content}>
            {isLoading ? (
              <p style={{ color: 'var(--color-text-secondary)', padding: '24px 0' }}>加载中...</p>
            ) : (
              <div className={styles.agentFormContainer}>
                {/* 基础能力配置 */}
                <div className={styles.sectionBanner}>
                  <span>⚡</span><span>基础能力配置</span>
                </div>

                {/* 启用开关 */}
                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel} style={{ fontWeight: '600' }}>🟢 启用真实 AI 大模型</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                      关闭则使用内置 Mock 回复
                    </div>
                  </div>
                  <div className={styles.toggleSwitch}>
                    <input type="checkbox" id="toggleAiEnabled" checked={aiModelForm.enabled}
                      onChange={e => setAiModelForm(prev => ({ ...prev, enabled: e.target.checked }))} />
                    <label htmlFor="toggleAiEnabled"></label>
                  </div>
                </div>

                {/* 指定模型 */}
                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>指定模型</span>
                  <div className={styles.radioGroup} style={{ flexWrap: 'wrap' }}>
                    {[
                      { key: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o' },
                      { key: 'gemini', name: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-pro' },
                      { key: 'kimi', name: 'Kimi', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-128k' },
                      { key: 'deepseek', name: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
                      { key: 'custom', name: '自定义', url: '', model: '' },
                    ].map(p => (
                      <button key={p.key}
                        className={`${styles.radioBtn} ${aiModelForm.provider === p.key ? styles.activeFull : ''}`}
                        onClick={() => setAiModelForm(prev => ({
                          ...prev, provider: p.key,
                          apiBaseUrl: p.url || prev.apiBaseUrl,
                          modelName: p.model || prev.modelName,
                        }))}
                      >{p.name}</button>
                    ))}
                  </div>
                </div>

                {/* API URL */}
                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>API 接入点</span>
                  <input type="text" className={styles.agentFormInput}
                    value={aiModelForm.apiBaseUrl}
                    onChange={e => setAiModelForm(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
                    placeholder="https://api.openai.com/v1" />
                </div>

                {/* API Key */}
                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>API Key</span>
                  <input type="password" className={styles.agentFormInput}
                    value={aiModelForm.apiKey}
                    onChange={e => setAiModelForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={aiModelForm.apiKeyMasked || 'sk-...'} />
                  {aiModelForm.apiKeyMasked && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                      已存储: {aiModelForm.apiKeyMasked}（留空保留原密钥）
                    </span>
                  )}
                </div>

                {/* Model Name */}
                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>模型名称</span>
                  <input type="text" className={styles.agentFormInput}
                    value={aiModelForm.modelName}
                    onChange={e => setAiModelForm(prev => ({ ...prev, modelName: e.target.value }))}
                    placeholder="gpt-4o / gemini-2.5-pro / deepseek-chat" />
                </div>

                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>上下文记忆轮次: {aiModelForm.contextRounds}</span>
                  <input type="range" min="1" max="30" step="1" className={styles.kbRange}
                    value={aiModelForm.contextRounds}
                    onChange={e => setAiModelForm(p => ({ ...p, contextRounds: parseInt(e.target.value) }))} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>记忆最近几轮对话作为上下文，此项仅针对大模型。</span>
                </div>

                <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

                {/* 知识库来源 */}
                <div className={styles.sectionBanner}>
                  <span>📚</span><span>知识库配置</span>
                </div>

                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>知识库来源</span>
                  <div className={styles.radioGroup}>
                    <button className={`${styles.radioBtn} ${aiModelForm.kbSource === 'none' ? styles.activeFull : ''}`}
                      onClick={() => setAiModelForm(p => ({ ...p, kbSource: 'none' }))}>不使用</button>
                    <button className={`${styles.radioBtn} ${aiModelForm.kbSource === 'zhipu' ? styles.activeFull : ''}`}
                      onClick={() => setAiModelForm(p => ({ ...p, kbSource: 'zhipu' }))}>智谱知识库</button>
                    <button className={`${styles.radioBtn} ${aiModelForm.kbSource === 'dify' ? styles.activeFull : ''}`}
                      onClick={() => setAiModelForm(p => ({ ...p, kbSource: 'dify' }))}>Dify知识库</button>
                    <button className={`${styles.radioBtn} ${aiModelForm.kbSource === 'custom' ? styles.activeFull : ''}`}
                      onClick={() => setAiModelForm(p => ({ ...p, kbSource: 'custom' }))}>指定知识库</button>
                  </div>
                </div>

                {aiModelForm.kbSource !== 'none' && (
                  <>
                    <div className={styles.agentFormSection}>
                      <span className={styles.agentFormLabel}>指定知识库 ID / API Key</span>
                      <input type="text" className={styles.agentFormInput}
                        value={aiModelForm.kbId}
                        onChange={e => setAiModelForm(p => ({ ...p, kbId: e.target.value }))}
                        placeholder="请输入对应的库 ID 或秘钥..." />
                    </div>
                  </>
                )}

                <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

                {/* 回复内容设置 */}
                <div className={styles.sectionBanner}>
                  <span>💬</span><span>回复内容设置</span>
                </div>

                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>最大回复长度: {aiModelForm.maxReplyLength} 字</span>
                  <input type="range" min="50" max="2000" step="50" className={styles.kbRange}
                    value={aiModelForm.maxReplyLength}
                    onChange={e => setAiModelForm(p => ({ ...p, maxReplyLength: parseInt(e.target.value) }))} />
                </div>

                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>允许发送图片</span>
                  <div className={styles.toggleSwitch}>
                    <input type="checkbox" id="toggleImg" checked={aiModelForm.allowImages}
                      onChange={e => setAiModelForm(p => ({ ...p, allowImages: e.target.checked }))} />
                    <label htmlFor="toggleImg"></label>
                  </div>
                </div>

                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>允许发送文件</span>
                  <div className={styles.toggleSwitch}>
                    <input type="checkbox" id="toggleFile" checked={aiModelForm.allowFiles}
                      onChange={e => setAiModelForm(p => ({ ...p, allowFiles: e.target.checked }))} />
                    <label htmlFor="toggleFile"></label>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

                {/* 内容分段设置 */}
                <div className={styles.sectionBanner}>
                  <span>✂️</span><span>内容分段设置</span>
                </div>

                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>启用内容分段发送</span>
                  <div className={styles.toggleSwitch}>
                    <input type="checkbox" id="toggleSeg" checked={aiModelForm.segmentEnabled}
                      onChange={e => setAiModelForm(p => ({ ...p, segmentEnabled: e.target.checked }))} />
                    <label htmlFor="toggleSeg"></label>
                  </div>
                </div>

                {aiModelForm.segmentEnabled && (
                  <>
                    <div className={styles.agentFormSection}>
                      <span className={styles.agentFormLabel}>分段数量: {aiModelForm.segmentCount}</span>
                      <input type="range" min="2" max="8" step="1" className={styles.kbRange}
                        value={aiModelForm.segmentCount}
                        onChange={e => setAiModelForm(p => ({ ...p, segmentCount: parseInt(e.target.value) }))} />
                    </div>
                    <div className={styles.agentFormSection}>
                      <span className={styles.agentFormLabel}>分段触发字数: {aiModelForm.segmentTriggerChars}</span>
                      <input type="range" min="30" max="500" step="10" className={styles.kbRange}
                        value={aiModelForm.segmentTriggerChars}
                        onChange={e => setAiModelForm(p => ({ ...p, segmentTriggerChars: parseInt(e.target.value) }))} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>超过此字数自动分段发送</span>
                    </div>
                  </>
                )}

                <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

                {/* 高级设置 */}
                <div className={styles.sectionBanner}>
                  <span>🔧</span><span>高级设置</span>
                </div>

                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>发送间隔 (秒): {aiModelForm.sendInterval}</span>
                  <input type="range" min="1" max="10" step="0.5" className={styles.kbRange}
                    value={aiModelForm.sendInterval}
                    onChange={e => setAiModelForm(p => ({ ...p, sendInterval: parseFloat(e.target.value) }))} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>模拟真人打字间隔</span>
                </div>

                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>休止关键字</span>
                  <input type="text" className={styles.agentFormInput}
                    value={aiModelForm.stopKeywords}
                    onChange={e => setAiModelForm(p => ({ ...p, stopKeywords: e.target.value }))}
                    placeholder="用逗号分隔关键字" />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>检测到这些关键字时立即停止 AI 回复</span>
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>智能纠错模式</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>新消息进入时中断当前回复，重新组织回答</div>
                  </div>
                  <div className={styles.toggleSwitch}>
                    <input type="checkbox" id="toggleSkip" checked={aiModelForm.smartSkipMode}
                      onChange={e => setAiModelForm(p => ({ ...p, smartSkipMode: e.target.checked }))} />
                    <label htmlFor="toggleSkip"></label>
                  </div>
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>图片分析</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>开启后可处理客户发来的图片</div>
                  </div>
                  <div className={styles.toggleSwitch}>
                    <input type="checkbox" id="toggleImgA" checked={aiModelForm.imageAnalysis}
                      onChange={e => setAiModelForm(p => ({ ...p, imageAnalysis: e.target.checked }))} />
                    <label htmlFor="toggleImgA"></label>
                  </div>
                </div>

                {/* Test + Save */}
                <button className={styles.agentSaveBtn} onClick={testAiConnection} disabled={isTestingConnection}
                  style={{ background: '#faad14', marginBottom: '12px' }}>
                  {isTestingConnection ? '⏳ 测试中...' : '🔌 测试 API 连接'}
                </button>
                {testResult && (
                  <div style={{
                    padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px',
                    background: testResult.success ? '#E6F7EF' : '#FFF1F0',
                    color: testResult.success ? '#07C160' : '#FF4D4F',
                  }}>
                    {testResult.success ? '✅' : '❌'} {testResult.message}
                  </div>
                )}

                <button className={styles.agentSaveBtn} onClick={saveAiModelConfig} disabled={isSaving}>
                  {isSaving ? '⏳ 保存中...' : '💾 保存配置'}
                </button>
              </div>
            )}
          </div>

        /* =================== 红线与安全规则 =================== */
        ) : viewState === 'safetyRules' ? (
          <div className={styles.content}>
            <SafetyFilters />
          </div>

        /* =================== CRM 系统接入 =================== */
        ) : viewState === 'crmConfig' ? (
          <div className={styles.content}>
            <YouzanConfigPanel />
          </div>

        /* =================== 朋友圈智能体主菜单 =================== */
        ) : viewState === 'momentsAgent' ? (
          <div className={styles.content}>
            <div className={styles.agentSettingsContainer}>
              <div className={styles.agentSection}>
                <div className={styles.agentSectionTitle}>朋友圈自动化</div>
                <div className={styles.agentMenuItem} onClick={() => setViewState('momentsPublish')}>
                  <span className={styles.agentMenuIcon}>📝</span>
                  <span className={styles.agentMenuText}>朋友圈发布设置</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }}>›</span>
                </div>
                <div className={styles.agentMenuItem} onClick={() => setViewState('momentsLikeComment')}>
                  <span className={styles.agentMenuIcon}>💬</span>
                  <span className={styles.agentMenuText}>点赞评论设置</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }}>›</span>
                </div>
                <div className={styles.agentMenuItem} onClick={() => setViewState('momentsFollow')}>
                  <span className={styles.agentMenuIcon}>👥</span>
                  <span className={styles.agentMenuText}>朋友圈跟随</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }}>›</span>
                </div>
              </div>
            </div>
          </div>

        /* =================== 朋友圈发布设置 =================== */
        ) : viewState === 'momentsPublish' ? (
          <div className={styles.content}>
            <div className={styles.agentFormContainer}>
              {/* 启用 */}
              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.toggleLabel} style={{ fontWeight: '600' }}>启用朋友圈自动发布</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>AI 将根据设置自动发布朋友圈内容</div>
                </div>
                <div className={styles.toggleSwitch}>
                  <input type="checkbox" id="toggleMPub" checked={momentsForm.publishEnabled}
                    onChange={e => setMomentsForm(p => ({ ...p, publishEnabled: e.target.checked }))} />
                  <label htmlFor="toggleMPub"></label>
                </div>
              </div>

              {momentsForm.publishEnabled && (
                <>
                  {/* 发布频率 */}
                  <div className={styles.agentFormSection}>
                    <span className={styles.agentFormLabel}>每日发布条数: {momentsForm.publishFrequency}</span>
                    <input type="range" min="1" max="6" step="1" className={styles.kbRange}
                      value={momentsForm.publishFrequency}
                      onChange={e => setMomentsForm(p => ({ ...p, publishFrequency: parseInt(e.target.value) }))} />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>建议 2-3 条/日，避免刷屏引起客户反感</span>
                  </div>

                  {/* 内容比例 */}
                  <div className={styles.agentFormSection}>
                    <span className={styles.agentFormLabel}>内容比例分配</span>
                    <div className={styles.mixSliders}>
                      <div className={styles.mixRow}>
                        <span className={styles.mixLabel}>🌿 生活共鸣</span>
                        <span className={styles.mixValue}>{momentsForm.contentMix.life}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="10" className={styles.kbRange}
                        value={momentsForm.contentMix.life}
                        onChange={e => setMomentsForm(p => ({ ...p, contentMix: { ...p.contentMix, life: parseInt(e.target.value) } }))} />
                      <div className={styles.mixRow}>
                        <span className={styles.mixLabel}>📖 专业科普</span>
                        <span className={styles.mixValue}>{momentsForm.contentMix.professional}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="10" className={styles.kbRange}
                        value={momentsForm.contentMix.professional}
                        onChange={e => setMomentsForm(p => ({ ...p, contentMix: { ...p.contentMix, professional: parseInt(e.target.value) } }))} />
                      <div className={styles.mixRow}>
                        <span className={styles.mixLabel}>🛍️ 产品转化</span>
                        <span className={styles.mixValue}>{momentsForm.contentMix.product}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="10" className={styles.kbRange}
                        value={momentsForm.contentMix.product}
                        onChange={e => setMomentsForm(p => ({ ...p, contentMix: { ...p.contentMix, product: parseInt(e.target.value) } }))} />
                    </div>
                  </div>

                  {/* 活跃时段 */}
                  <div className={styles.agentFormSection}>
                    <span className={styles.agentFormLabel}>发布时段</span>
                    <div className={styles.timeSlots}>
                      {['07:00-08:30', '11:30-13:00', '17:30-19:00', '20:00-22:00'].map(slot => (
                        <label key={slot} className={styles.memberItem}>
                          <input type="checkbox"
                            checked={momentsForm.activeTimeSlots.includes(slot)}
                            onChange={e => {
                              if (e.target.checked) setMomentsForm(p => ({ ...p, activeTimeSlots: [...p.activeTimeSlots, slot] }));
                              else setMomentsForm(p => ({ ...p, activeTimeSlots: p.activeTimeSlots.filter(t => t !== slot) }));
                            }} />
                          <span>{slot}</span>
                        </label>
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>AI 将在选中的时段内随机选择发布时间</span>
                  </div>

                  {/* AI 能力 */}
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>AI 自动生成内容</span>
                    <div className={styles.toggleSwitch}>
                      <input type="checkbox" id="toggleMGen" checked={momentsForm.aiGenerateContent}
                        onChange={e => setMomentsForm(p => ({ ...p, aiGenerateContent: e.target.checked }))} />
                      <label htmlFor="toggleMGen"></label>
                    </div>
                  </div>

                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>使用知识库素材</span>
                    <div className={styles.toggleSwitch}>
                      <input type="checkbox" id="toggleMKb" checked={momentsForm.useKnowledgeBase}
                        onChange={e => setMomentsForm(p => ({ ...p, useKnowledgeBase: e.target.checked }))} />
                      <label htmlFor="toggleMKb"></label>
                    </div>
                  </div>

                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>AI 自动选图配图</span>
                    <div className={styles.toggleSwitch}>
                      <input type="checkbox" id="toggleAutoImg" checked={momentsForm.autoSelectImages}
                        onChange={e => setMomentsForm(p => ({ ...p, autoSelectImages: e.target.checked }))} />
                      <label htmlFor="toggleAutoImg"></label>
                    </div>
                  </div>

                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>避免重复发布相似内容</span>
                    <div className={styles.toggleSwitch}>
                      <input type="checkbox" id="toggleRepeat" checked={momentsForm.avoidRepeat}
                        onChange={e => setMomentsForm(p => ({ ...p, avoidRepeat: e.target.checked }))} />
                      <label htmlFor="toggleRepeat"></label>
                    </div>
                  </div>
                </>
              )}

              <button className={styles.agentSaveBtn} onClick={() => { toast.success('朋友圈发布设置已保存'); setViewState('momentsAgent'); }}>
                保存配置
              </button>
            </div>
          </div>

        /* =================== 点赞评论设置 =================== */
        ) : viewState === 'momentsLikeComment' ? (
          <div className={styles.content}>
            <div className={styles.agentFormContainer}>
              {/* 工作时间 */}
              <div className={styles.agentFormSection}>
                <span className={styles.agentFormLabel}>工作时间</span>
                <div className={styles.radioGroup}>
                  <button className={`${styles.radioBtn} ${momentsForm.workTimeType === '24小时' ? styles.activeFull : ''}`}
                    onClick={() => setMomentsForm(p => ({ ...p, workTimeType: '24小时' }))}>24小时</button>
                  <button className={`${styles.radioBtn} ${momentsForm.workTimeType === '时间段' ? styles.activeFull : ''}`}
                    onClick={() => setMomentsForm(p => ({ ...p, workTimeType: '时间段' }))}>时间段</button>
                </div>
              </div>

              {/* 分析范围 */}
              <div className={styles.agentFormSection}>
                <span className={styles.agentFormLabel}>分析范围</span>
                <div className={styles.radioGroup}>
                  <button className={`${styles.radioBtn} ${momentsForm.analyzeScope === '全部' ? styles.activeFull : ''}`}
                    onClick={() => setMomentsForm(p => ({ ...p, analyzeScope: '全部' }))}>全部</button>
                  <button className={`${styles.radioBtn} ${momentsForm.analyzeScope === '分析范围' ? styles.activeFull : ''}`}
                    onClick={() => setMomentsForm(p => ({ ...p, analyzeScope: '分析范围' }))}>分析范围</button>
                  <button className={`${styles.radioBtn} ${momentsForm.analyzeScope === '不分析范围' ? styles.activeFull : ''}`}
                    onClick={() => setMomentsForm(p => ({ ...p, analyzeScope: '不分析范围' }))}>不分析范围</button>
                </div>
              </div>

              {/* 点赞 */}
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>点赞</span>
                <div className={styles.toggleSwitch}>
                  <input type="checkbox" id="toggleLike" checked={momentsForm.likeEnabled}
                    onChange={e => setMomentsForm(p => ({ ...p, likeEnabled: e.target.checked }))} />
                  <label htmlFor="toggleLike"></label>
                </div>
              </div>

              {/* 评论 */}
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>评论</span>
                <div className={styles.toggleSwitch}>
                  <input type="checkbox" id="toggleComment" checked={momentsForm.commentEnabled}
                    onChange={e => setMomentsForm(p => ({ ...p, commentEnabled: e.target.checked }))} />
                  <label htmlFor="toggleComment"></label>
                </div>
              </div>

              {momentsForm.commentEnabled && (
                <>
                  <div className={styles.agentFormSection}>
                    <span className={styles.agentFormLabel}>评论风格</span>
                    <div className={styles.radioGroup}>
                      <button className={`${styles.radioBtn} ${momentsForm.commentStyle === 'natural' ? styles.activeFull : ''}`}
                        onClick={() => setMomentsForm(p => ({ ...p, commentStyle: 'natural' }))}>自然亲切</button>
                      <button className={`${styles.radioBtn} ${momentsForm.commentStyle === 'professional' ? styles.activeFull : ''}`}
                        onClick={() => setMomentsForm(p => ({ ...p, commentStyle: 'professional' }))}>专业含蓄</button>
                      <button className={`${styles.radioBtn} ${momentsForm.commentStyle === 'warm' ? styles.activeFull : ''}`}
                        onClick={() => setMomentsForm(p => ({ ...p, commentStyle: 'warm' }))}>热情洋溢</button>
                    </div>
                  </div>
                  <div className={styles.agentFormSection}>
                    <span className={styles.agentFormLabel}>每日最大评论数: {momentsForm.maxCommentsPerDay}</span>
                    <input type="range" min="5" max="100" step="5" className={styles.kbRange}
                      value={momentsForm.maxCommentsPerDay}
                      onChange={e => setMomentsForm(p => ({ ...p, maxCommentsPerDay: parseInt(e.target.value) }))} />
                  </div>
                </>
              )}

              <button className={styles.agentSaveBtn} onClick={() => { toast.success('点赞评论设置已保存'); setViewState('momentsAgent'); }}>
                保存配置
              </button>
            </div>
          </div>

        /* =================== 朋友圈跟随 =================== */
        ) : viewState === 'momentsFollow' ? (
          <div className={styles.content}>
            <div className={styles.agentFormContainer}>
              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.toggleLabel} style={{ fontWeight: '600' }}>启用朋友圈跟随</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>AI 跟随指定账号发布相似内容的朋友圈</div>
                </div>
                <div className={styles.toggleSwitch}>
                  <input type="checkbox" id="toggleFollow" checked={momentsForm.followEnabled}
                    onChange={e => setMomentsForm(p => ({ ...p, followEnabled: e.target.checked }))} />
                  <label htmlFor="toggleFollow"></label>
                </div>
              </div>

              {momentsForm.followEnabled && (
                <>
                  <div className={styles.agentFormSection}>
                    <span className={styles.agentFormLabel}>跟随账号（每行一个）</span>
                    <textarea className={styles.textarea} rows={4}
                      value={momentsForm.followAccounts.join('\n')}
                      onChange={e => setMomentsForm(p => ({ ...p, followAccounts: e.target.value.split('\n').filter(Boolean) }))}
                      placeholder="输入要跟随的账号昵称或微信号..." />
                  </div>

                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>内容自适应调整</span>
                    <div className={styles.toggleSwitch}>
                      <input type="checkbox" id="toggleAdapt" checked={momentsForm.followContentAdapt}
                        onChange={e => setMomentsForm(p => ({ ...p, followContentAdapt: e.target.checked }))} />
                      <label htmlFor="toggleAdapt"></label>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '-12px' }}>
                    开启后 AI 会将跟随内容调整为符合本账号人设的表达方式
                  </span>
                </>
              )}

              <button className={styles.agentSaveBtn} onClick={() => { toast.success('朋友圈跟随已保存'); setViewState('momentsAgent'); }}>
                保存配置
              </button>
            </div>
          </div>

        /* =================== 账号管理 =================== */
        ) : viewState === 'accountManagement' ? (
          <div className={styles.content}>
            <div className={styles.agentFormContainer}>
              <div className={styles.sectionBanner}><span>👤</span><span>主账号信息</span></div>
              <div className={styles.agentFormSection}>
                <span className={styles.agentFormLabel}>账号名称</span>
                <input type="text" className={styles.agentFormInput} defaultValue="悦心养生馆" />
              </div>
              <div className={styles.agentFormSection}>
                <span className={styles.agentFormLabel}>登录邮箱</span>
                <input type="text" className={styles.agentFormInput} defaultValue="admin@yuexin.com" readOnly />
              </div>
              <div className={styles.agentFormSection}>
                <span className={styles.agentFormLabel}>角色</span>
                <input type="text" className={styles.agentFormInput} defaultValue="管理员（主账号）" readOnly />
              </div>
            </div>

            <div className={styles.agentFormContainer}>
              <div className={styles.sectionBanner}><span>👥</span><span>子账号管理</span></div>
              {[
                { name: '小悦 (客户顾问)', perm: '线索管理、消息回复', status: '在线' },
                { name: '小美 (运营助理)', perm: '素材管理、工作流', status: '离线' },
              ].map((acc, i) => (
                <div key={i} className={styles.subAccountCard}>
                  <div className={styles.subAccountInfo}>
                    <span className={styles.subAccountName}>{acc.name}</span>
                    <span className={styles.subAccountPerm}>{acc.perm}</span>
                  </div>
                  <span className={`${styles.subAccountStatus} ${acc.status === '在线' ? styles.statusOnline : ''}`}>
                    {acc.status}
                  </span>
                </div>
              ))}
              <button className={styles.agentSaveBtn} style={{ background: 'var(--color-bg-section)', color: 'var(--color-primary)', border: '1px dashed var(--color-primary)' }}
                onClick={() => toast('添加子账号功能即将上线')}>
                ＋ 添加子账号
              </button>
            </div>
          </div>

        /* =================== 运营报告 =================== */
        ) : viewState === 'operationReport' ? (
          <div className={styles.content}>
            <div className={styles.viewTabs}>
              {['day', 'week', 'month'].map(v => (
                <button key={v}
                  className={`${styles.viewTab} ${reportViewMode === v ? styles.viewTabActive : ''}`}
                  onClick={() => setReportViewMode(v)}>
                  {v === 'day' ? '今日' : v === 'week' ? '本周' : '本月'}
                </button>
              ))}
            </div>
            <div className={styles.agentFormContainer}>
              <div className={styles.reportGrid}>
                <div className={styles.reportCard}>
                  <span className={styles.reportNum}>47</span>
                  <span className={styles.reportLabel}>新增线索</span>
                </div>
                <div className={styles.reportCard}>
                  <span className={styles.reportNum}>324</span>
                  <span className={styles.reportLabel}>AI 回复</span>
                </div>
                <div className={styles.reportCard}>
                  <span className={styles.reportNum}>12</span>
                  <span className={styles.reportLabel}>待审核任务</span>
                </div>
                <div className={styles.reportCard}>
                  <span className={styles.reportNum}>89%</span>
                  <span className={styles.reportLabel}>AI 处理率</span>
                </div>
              </div>
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
                📊 详细报告图表功能开发中...
              </div>
            </div>
          </div>

        /* =================== 登录选择 =================== */
        ) : viewState === 'loginChoice' ? (
          <div className={styles.content}>
            <div className={styles.agentFormContainer}>
              <div className={styles.agentFormSection}>
                <span className={styles.agentFormLabel}>当前账号</span>
                <div style={{ padding: '12px', background: 'var(--color-bg-section)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>👤</span>
                  <div>
                    <div style={{ fontWeight: '600' }}>悦心养生馆</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>admin@yuexin.com · 管理员</div>
                  </div>
                </div>
              </div>

              <button className={styles.agentSaveBtn} style={{ background: '#f5f5f5', color: 'var(--color-text-primary)' }}
                onClick={() => toast('切换账号功能即将上线')}>
                🔄 切换账号
              </button>
              <button className={styles.agentSaveBtn} style={{ background: '#fff1f0', color: '#cf1322' }}
                onClick={() => toast('确认退出？')}>
                🚪 退出登录
              </button>
            </div>
          </div>

        /* =================== 通用 fallback =================== */
        ) : (
          <div className={styles.content}>
            <p style={{ color: 'var(--color-text-secondary)', padding: '24px 0' }}>此项功能正在开发中...</p>
          </div>
        )}
      </div>
    );
  }

  // ====================================================================
  // LIST VIEW (Main Settings Menu)
  // ====================================================================
  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <h2 className={styles.title}>设置</h2>
      </div>

      <div className={styles.listContent}>
        {/* ① 系统状态面板 */}
        <div className={styles.listGroup}>
          <SystemStatusPanel />
        </div>

        {/* ② AI 智能体配置 */}
        <div className={styles.listGroup}>
          <div className={styles.groupHead}>AI 智能体配置</div>
          <div className={styles.groupItems}>
            <div className={styles.listItem} onClick={() => { setViewState('persona'); }}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon}>👤</span>
                <span className={styles.itemName}>AI 员工设置</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => { setViewState('aiModel'); loadAiModelConfig(); }}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon}>🧠</span>
                <span className={styles.itemName}>AI 大模型与知识库</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setViewState('safetyRules')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon}>🛡️</span>
                <span className={styles.itemName}>红线与安全规则</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setViewState('crmConfig')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon}>🔗</span>
                <span className={styles.itemName}>CRM 系统接入</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
          </div>
        </div>

        {/* ③ 朋友圈智能体设置 */}
        <div className={styles.listGroup}>
          <div className={styles.groupHead}>朋友圈智能体</div>
          <div className={styles.groupItems}>
            <div className={styles.listItem} onClick={() => setViewState('momentsAgent')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon}>🌅</span>
                <span className={styles.itemName}>朋友圈智能体设置</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setActiveMainPanel('materials')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon}>🖼️</span>
                <span className={styles.itemName}>运营素材</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
          </div>
        </div>

        {/* ④ 通用 */}
        <div className={styles.listGroup}>
          <div className={styles.groupHead}>通用</div>
          <div className={styles.groupItems}>
            <div className={styles.listItem} onClick={() => setViewState('accountManagement')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon}>👥</span>
                <span className={styles.itemName}>账号管理</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setActiveMainPanel('reports')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon}>📊</span>
                <span className={styles.itemName}>运营报告</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setViewState('loginChoice')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon}>🔑</span>
                <span className={styles.itemName}>登录选择</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
