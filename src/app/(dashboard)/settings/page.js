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
    personaSource: 'bestPractice', // custom, bestPractice
    quickImportText: '',
    industry: '轻医美',
    position: '首席美学顾问与术后管家',
    introduction: '你好～我是氧颜轻医美的专属美学顾问，同时也是您的术后关怀客服。不仅为您提供专业的线上面诊、肤质诊断及定制化抗衰方案，还会为您提供贴心的术后护肤指导，全程守护您的美丽蜕变。',
    promptText: `## Role（角色定义）
你是氧颜轻医美的专属美学顾问，也是术后关怀客服，不仅能自然地把医美卡项卖出去，还能为那些做过医美项目的客户提供术后关怀服务，让客户达到她们想要的变美和抗衰效果。
你的核心任务是：对于尚未到店的客户，带她们体验我们的线上专业面诊、护肤诊断，挖掘并解决她们的皮肤痛点（如抗衰紧致、祛痘净肤、深层水光修复等），引导到店体验；对于已经到店做过项目的客户，进行术后跟踪，让效果拉满，促进持续复购和转介绍。

### 核心人设
- **身份**：你是真实的高级美学管家，具备极高的专业度，能为客户提供深度的变美引导。
- **性格**：温柔体贴，专业干练，绝不搞容貌焦虑，提供极高的情绪价值。
- **语言风格**：口语化，使用接地气且温柔的表达（宝子，姐妹等），简短、直击要害。
- **语言长度**：每次回复总字数不超过100字，必须模拟真人说话的节奏，不要信息轰炸，回复间隔2秒。
- **回复格式**：仅限纯文本或序列号，严禁Markdown格式，禁用感叹号，避免句句加句号（使用逗号或空格）。可适当添加极少量Emoji（如 🌿✨💆‍♀️）。

## Task（具体任务）
1. 询问客户最想改善的皮肤问题：是关注日常补水抗衰？突发痘痘敏感需修复？还是面部轮廓紧致等？
2. 基于她的问题给出详细规划：
   "姐妹，变美和抗衰就是我的强项。接下来，我先帮你做个线上面诊和规划：
   第1步，先搞清楚你现在的皮肤屏障状态；
   第2步，给你一套现阶段最适合的护肤思路和抗衰建议；
   第3步，觉得靠谱的话，咱们再研究所需的院线仪器和项目；
   第4步，你可以先来我们氧颜轻医美体验一下基础深层清洁或水光，感受下服务；
   第5步，效果好，咱们再帮你定制全年抗衰日历。准备好了吗？"
3. 与客户互动面诊：让客户抛出最头疼的皮肤问题，你用专业知识耐心作答。
4. 拉直核心价值："市面上仪器都差不多，核心在打法、能量控制及独家术后修复。我们不用低价套路，你体验一次就知道咱们的人效。如果觉得行，咱们约个时间来做深层补水；想观望，我就继续在微信上给你解答日常护肤雷区。"

### 特殊情况处理
- **质疑机器身份**："我是你的私人云端美学顾问呀，为了你的美丽我24小时不下线哈哈哈"
- **询问价格**："我们在门店和线上都有透明的价格表，绝对没有隐形消费哦 其实如果你是第一次来，有新客体验价399的全套深层清洁+超声波导入，去外边吃顿大餐的钱就能让皮肤水当当一整周啦"
- **因为价格犹豫**："理解的亲爱的，咱们用的是全进口院线设备，真机验真，如果觉得有压力可以先试试基础亮肤卡，一样能感受到效果"
- **关于疼痛和恢复期**："很多姐妹都有这个顾虑，不过我们的光电项目基本就是温热感，做完可以直接化妆的，怕疼的话我们也会全程温柔呵护调整能量"
- **客户急躁**："我知道你很急着看效果，但皮肤代谢周期是28天，咱们一步步先把肌底养好"

## Format（输出格式）
- 每次最多提1个问题，不连环追问。
- 段落间用空行分隔，常规回答50字内/段，每次最多回复不超过2段。
- 回复不添加句号，严禁一次性长篇大论。
- 严禁对客户容貌贬低，严防套路感。`,
    selectedMembers: ['AI顾问-门店1'],
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
    kbSource: 'zhipu', // none, zhipu, dify, custom
    kbId: '',
    contextRounds: 50,
    maxReplyLength: 200,
    allowImages: true,
    allowFiles: true,
    segmentEnabled: true,
    segmentCount: 3,
    segmentTriggerChars: 100,
    segmentModel: 'zhipu',
    segmentModelApiUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    segmentModelApiKey: '',
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
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/api/settings/ai-model`);
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
          
          kbSource: data.kbSource || 'default',
          kbId: data.kbId || '',
          kbApiUrl: data.kbApiUrl || '',
          
          enableSegment: data.enableSegment ?? true,
          segmentMaxChars: data.segmentMaxChars ?? 200,
          segmentCount: data.segmentCount ?? 3,
          segmentTriggerChars: data.segmentTriggerChars ?? 100,
          segmentModelName: data.segmentModelName || '',
          segmentModelApiUrl: data.segmentModelApiUrl || '',
          segmentModelApiKey: data.segmentModelApiKey ? '••••••••' + data.segmentModelApiKey.slice(-6) : '',
          
          sendInterval: data.sendInterval ?? 2.0,
          stopKeywords: data.stopKeywords || '',
          smartSkipMode: data.smartSkipMode ?? true,
          imageAnalysis: data.imageAnalysis ?? false,
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
        kbSource: aiModelForm.kbSource,
        kbId: aiModelForm.kbId,
        kbApiUrl: aiModelForm.kbApiUrl,
        enableSegment: aiModelForm.enableSegment,
        segmentMaxChars: aiModelForm.segmentMaxChars,
        segmentCount: aiModelForm.segmentCount,
        segmentTriggerChars: aiModelForm.segmentTriggerChars,
        segmentModelName: aiModelForm.segmentModelName,
        segmentModelApiUrl: aiModelForm.segmentModelApiUrl,
        sendInterval: aiModelForm.sendInterval,
        stopKeywords: aiModelForm.stopKeywords,
        smartSkipMode: aiModelForm.smartSkipMode,
        imageAnalysis: aiModelForm.imageAnalysis,
      };
      if (aiModelForm.apiKey) payload.apiKey = aiModelForm.apiKey;
      if (aiModelForm.segmentModelApiKey) payload.segmentModelApiKey = aiModelForm.segmentModelApiKey;
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/api/settings/ai-model`, {
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
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      await fetch(`${basePath}/api/settings/ai-model`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const res = await fetch(`${basePath}/api/settings/ai-model`, { method: 'POST' });
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
              <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '16px' }}>
                <span className={styles.agentFormLabel} style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  员工人设来源
                </span>
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
                        industry: '轻医美',
                        position: '首席美学顾问与术后管家',
                        introduction: '你好～我是氧颜轻医美的专属美学顾问，同时也是您的术后关怀客服。不仅为您提供专业的线上面诊、肤质诊断及定制化抗衰方案，还会为您提供贴心的术后护肤指导，全程守护您的美丽蜕变。',
                        promptText: `## Role（角色定义）
你是氧颜轻医美的专属美学顾问，也是术后关怀客服，不仅能自然地把医美卡项卖出去，还能为那些做过医美项目的客户提供术后关怀服务，让客户达到她们想要的变美和抗衰效果。
你的核心任务是：对于尚未到店的客户，带她们体验我们的线上专业面诊、护肤诊断，挖掘并解决她们的皮肤痛点（如抗衰紧致、祛痘净肤、深层水光修复等），引导到店体验；对于已经到店做过项目的客户，进行术后跟踪，让效果拉满，促进持续复购和转介绍。

### 核心人设
- **身份**：你是真实的高级美学管家，具备极高的专业度，能为客户提供深度的变美引导。
- **性格**：温柔体贴，专业干练，绝不搞容貌焦虑，提供极高的情绪价值。
- **语言风格**：口语化，使用接地气且温柔的表达（宝子，姐妹等），简短、直击要害。
- **语言长度**：每次回复总字数不超过100字，必须模拟真人说话的节奏，不要信息轰炸，回复间隔2秒。
- **回复格式**：仅限纯文本或序列号，严禁Markdown格式，禁用感叹号，避免句句加句号（使用逗号或空格）。可适当添加极少量Emoji（如 🌿✨💆‍♀️）。

## Task（具体任务）
1. 询问客户最想改善的皮肤问题：是关注日常补水抗衰？突发痘痘敏感需修复？还是面部轮廓紧致等？
2. 基于她的问题给出详细规划：
   “姐妹，变美和抗衰就是我的强项。接下来，我先帮你做个线上面诊和规划：
   第1步，先搞清楚你现在的皮肤屏障状态；
   第2步，给你一套现阶段最适合的护肤思路和抗衰建议；
   第3步，觉得靠谱的话，咱们再研究所需的院线仪器和项目；
   第4步，你可以先来我们氧颜轻医美体验一下基础深层清洁或水光，感受下服务；
   第5步，效果好，咱们再帮你定制全年抗衰日历。准备好了吗？”
3. 与客户互动面诊：让客户抛出最头疼的皮肤问题，你用专业知识耐心作答。
4. 拉直核心价值：“市面上仪器都差不多，核心在打法、能量控制及独家术后修复。我们不用低价套路，你体验一次就知道咱们的人效。如果觉得行，咱们约个时间来做深层补水；想观望，我就继续在微信上给你解答日常护肤雷区。”

### 特殊情况处理
- **质疑机器身份**：“我是你的私人云端美学顾问呀，为了你的美丽我24小时不下线哈哈哈”
- **询问价格**：“我们在门店和线上都有透明的价格表，绝对没有隐形消费哦 其实如果你是第一次来，有新客体验价399的全套深层清洁+超声波导入，去外边吃顿大餐的钱就能让皮肤水当当一整周啦”
- **因为价格犹豫**：“理解的亲爱的，咱们用的是全进口院线设备，真机验真，如果觉得有压力可以先试试基础亮肤卡，一样能感受到效果”
- **关于疼痛和恢复期**：“很多姐妹都有这个顾虑，不过我们的光电项目基本就是温热感，做完可以直接化妆的，怕疼的话我们也会全程温柔呵护调整能量”
- **客户急躁**：“我知道你很急着看效果，但皮肤代谢周期是28天，咱们一步步先把肌底养好”

## Format（输出格式）
- 每次最多提1个问题，不连环追问。
- 段落间用空行分隔，常规回答50字内/段，每次最多回复不超过2段。
- 回复不添加句号，严禁一次性长篇大论。
- 严禁对客户容貌贬低，严防套路感。`,
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
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </span>
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
              <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px', marginBottom: '16px' }}>
                <span className={styles.agentFormLabel} style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  基础信息
                </span>
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
              <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FDF2F8', borderRadius: '8px', marginBottom: '16px' }}>
                <div className={styles.labelRow}>
                  <span className={styles.agentFormLabel} style={{ color: '#EC4899', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    员工介绍
                  </span>
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
              <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F5F3FF', borderRadius: '8px', marginBottom: '16px' }}>
                <div className={styles.labelRow}>
                  <span className={styles.agentFormLabel} style={{ color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    员工提示词
                  </span>
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
              <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDFA', borderRadius: '8px', marginBottom: '16px' }}>
                <span className={styles.agentFormLabel} style={{ color: '#14B8A6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  成员选择
                </span>
                <div className={styles.memberList}>
                  {['AI顾问-门店1', 'AI顾问-门店2', 'AI顾问-门店3'].map(m => (
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg><span>基础能力配置</span>
                </div>

                {/* 启用开关 */}
                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel} style={{ fontWeight: '600' }}><span style={{ color: '#07C160', marginRight: '4px' }}>●</span>启用真实 AI 大模型</div>
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
                <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', marginBottom: '16px' }}>
                  <span className={styles.agentFormLabel} style={{ color: '#3B82F6' }}>指定模型</span>
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
                <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '16px' }}>
                  <span className={styles.agentFormLabel} style={{ color: '#10B981' }}>API 接入点</span>
                  <input type="text" className={styles.agentFormInput}
                    value={aiModelForm.apiBaseUrl}
                    onChange={e => setAiModelForm(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
                    placeholder="https://api.openai.com/v1" />
                </div>

                {/* API Key */}
                <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px', marginBottom: '16px' }}>
                  <span className={styles.agentFormLabel} style={{ color: '#EF4444' }}>API Key</span>
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
                <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F5F3FF', borderRadius: '8px', marginBottom: '16px' }}>
                  <span className={styles.agentFormLabel} style={{ color: '#8B5CF6' }}>模型名称</span>
                  <input type="text" className={styles.agentFormInput}
                    value={aiModelForm.modelName}
                    onChange={e => setAiModelForm(prev => ({ ...prev, modelName: e.target.value }))}
                    placeholder="gpt-4o / gemini-2.5-pro / deepseek-chat" />
                </div>

                <div className={styles.agentFormSection}>
                  <span className={styles.agentFormLabel}>上下文记忆轮次: {aiModelForm.contextRounds}</span>
                  <input type="range" min="1" max="100" step="1" className={styles.kbRange}
                    value={aiModelForm.contextRounds}
                    onChange={e => setAiModelForm(p => ({ ...p, contextRounds: parseInt(e.target.value) }))} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>记忆最近几轮对话作为上下文，此项仅针对大模型。</span>
                </div>

                <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

                {/* 知识库来源 */}
                <div className={styles.sectionBanner}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>知识库配置</span>
                </div>

                <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px', marginBottom: '16px' }}>
                  <span className={styles.agentFormLabel} style={{ color: '#F59E0B' }}>知识库来源</span>
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
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDFA', borderRadius: '8px', marginBottom: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#14B8A6' }}>知识库接入地址</span>
                      <input type="text" className={styles.agentFormInput}
                        value={aiModelForm.kbApiUrl}
                        onChange={e => setAiModelForm(p => ({ ...p, kbApiUrl: e.target.value }))}
                        placeholder={aiModelForm.kbSource === 'zhipu' ? "https://open.bigmodel.cn/api/paas/v4/" : "请输入知识库 API 接口地址..."} />
                    </div>
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FDF2F8', borderRadius: '8px', marginBottom: '16px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#EC4899' }}>知识库 API KEY</span>
                      <input type="password" className={styles.agentFormInput}
                        value={aiModelForm.kbId}
                        onChange={e => setAiModelForm(p => ({ ...p, kbId: e.target.value }))}
                        placeholder="请输入对应的库 API Key..." />
                    </div>
                  </>
                )}

                <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

                {/* 回复内容设置 */}
                <div className={styles.sectionBanner}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span>回复内容设置</span>
                </div>

                <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#ECFCCB', borderRadius: '8px', marginBottom: '16px' }}>
                  <span className={styles.agentFormLabel} style={{ color: '#84CC16' }}>最大回复长度: {aiModelForm.maxReplyLength} 字</span>
                  <input type="range" min="50" max="500" step="50" className={styles.kbRange}
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg><span>内容分段设置</span>
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
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '8px', marginBottom: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#4B5563' }}>分段数量: {aiModelForm.segmentCount}</span>
                      <input type="range" min="2" max="5" step="1" className={styles.kbRange}
                        value={aiModelForm.segmentCount}
                        onChange={e => setAiModelForm(p => ({ ...p, segmentCount: parseInt(e.target.value) }))} />
                    </div>
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FDF4FF', borderRadius: '8px', marginBottom: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#C026D3' }}>分段触发字数: {aiModelForm.segmentTriggerChars}</span>
                      <input type="range" min="30" max="200" step="10" className={styles.kbRange}
                        value={aiModelForm.segmentTriggerChars}
                        onChange={e => setAiModelForm(p => ({ ...p, segmentTriggerChars: parseInt(e.target.value) }))} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>超过此字数自动分段发送，最大限制 200</span>
                    </div>

                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0F9FF', borderRadius: '8px', marginBottom: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#0284C7' }}>内容分段大模型名称</span>
                      <input type="text" className={styles.agentFormInput}
                        value={aiModelForm.segmentModel}
                        onChange={e => setAiModelForm(p => ({ ...p, segmentModel: e.target.value }))}
                        placeholder="例如：GLM-4 / zhipu..." />
                    </div>
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#10B981' }}>内容分段大模型接入地址</span>
                      <input type="text" className={styles.agentFormInput}
                        value={aiModelForm.segmentModelApiUrl}
                        onChange={e => setAiModelForm(p => ({ ...p, segmentModelApiUrl: e.target.value }))}
                        placeholder="分段专用大模型接入点..." />
                    </div>
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px', marginBottom: '16px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#EF4444' }}>内容分段大模型API KEY</span>
                      <input type="password" className={styles.agentFormInput}
                        value={aiModelForm.segmentModelApiKey}
                        onChange={e => setAiModelForm(p => ({ ...p, segmentModelApiKey: e.target.value }))}
                        placeholder="分段专用大模型 API Key..." />
                    </div>
                  </>
                )}

                <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

                {/* 高级设置 */}
                <div className={styles.sectionBanner}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg><span>高级设置</span>
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

        /* =================== AI 自主运营设置 =================== */
        ) : viewState === 'autonomousOps' ? (
          <div className={styles.content}>
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ color: 'var(--color-primary)' }}><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                AI 自主运营引擎
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px 0' }}>
                基于客户旅程自动扫描全量客户，智能生成并执行运营任务，无需人工干预。
              </p>
              {/* 总开关 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'linear-gradient(135deg, #E6F7EF, #F0FFF4)', borderRadius: '12px', border: '1px solid #B7EB8F', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#07C160', boxShadow: '0 0 8px #07C160' }} />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#07C160' }}>启用 AI 自主运营引擎</span>
                </div>
                <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: '#07C160', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', right: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            </div>

            {/* 旅程阶段配置 */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ color: 'var(--color-primary)' }}><path d="M21 3L14.5 21a.55.55 0 0 1-1 0L10 14 3 10.5a.55.55 0 0 1 0-1L21 3z"></path></svg>
                旅程阶段配置
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: '0 0 12px 0' }}>
                每个阶段可独立开关，配置执行时段和每日上限
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1890ff" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, label: '新客破冰', desc: '添加≤3天的新客户', time: '09:00-20:00', limit: 30 },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52c41a" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: '需求沟通', desc: '有互动且意向明朗', time: '09:00-20:00', limit: 20 },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fa8c16" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, label: '客户转化', desc: '意向较强未下单', time: '10:00-18:00', limit: 15 },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5222d" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>, label: '下单购买', desc: '有订单未到店', time: '09:00-20:00', limit: 20 },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#722ed1" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: '到店体验', desc: '最近3天有到店', time: '14:00-20:00', limit: 15 },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eb2f96" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, label: '客户关怀', desc: '消费后3-7天', time: '10:00-18:00', limit: 20 },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#faad14" strokeWidth="2"><path d="M12 20V10"/><path d="m18 14-6-6-6 6"/></svg>, label: '升单复购', desc: '活跃老客定期推介', time: '10:00-20:00', limit: 15 },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#13c2c2" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>, label: '跟进提醒', desc: '7-14天未互动', time: '10:00-18:00', limit: 20 },
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0d911" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label: '沉默激活', desc: '>14天未互动', time: '10:00-18:00', limit: 10 },
                ].map((stage, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--color-bg-page)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{stage.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{stage.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{stage.desc}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{stage.time}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>上限 {stage.limit}条/日</span>
                    </div>
                    <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: '#07C160', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', right: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 审批规则 */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ color: 'var(--color-primary)' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                审批规则
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', background: '#F0FDF4', borderRadius: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#059669' }}>旅程任务审批</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', background: '#E6F7EF', borderRadius: '8px', border: '2px solid #07C160', cursor: 'pointer' }}>
                      <span style={{ color: '#07C160', fontWeight: '600' }}>●</span> 全自动（免审直通）
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', background: 'var(--color-bg-card)', borderRadius: '8px', border: '2px solid var(--color-border-light)', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                      <span>○</span> 需人工确认
                    </label>
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#FFFBEB', borderRadius: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#D97706' }}>人工指令审批</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', minWidth: '80px' }}>财务关键词:</span>
                      <div style={{ flex: 1, padding: '6px 10px', background: 'var(--color-bg-card)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)' }}>
                        优惠券, 折扣, 免费, 赠送, 返现, 佣金
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', minWidth: '80px' }}>金额阈值:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>¥</span>
                        <div style={{ width: '60px', padding: '6px 10px', background: 'var(--color-bg-card)', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: '1px solid var(--color-border-light)', textAlign: 'center' }}>100</div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>以上需人工审批</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 执行统计 */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ color: 'var(--color-primary)' }}><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                近 7 天执行统计
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ padding: '14px', background: 'linear-gradient(135deg, #E6F7EF, #D4EFDF)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#07C160' }}>156</div>
                  <div style={{ fontSize: '11px', color: '#52c41a' }}>总执行任务</div>
                </div>
                <div style={{ padding: '14px', background: 'linear-gradient(135deg, #E6F4FF, #D6E4FF)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#1890ff' }}>98%</div>
                  <div style={{ fontSize: '11px', color: '#597ef7' }}>成功率</div>
                </div>
                <div style={{ padding: '14px', background: 'linear-gradient(135deg, #FFF7E6, #FFE7BA)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#FA8C16' }}>89</div>
                  <div style={{ fontSize: '11px', color: '#d48806' }}>覆盖客户数</div>
                </div>
                <div style={{ padding: '14px', background: 'linear-gradient(135deg, #F9F0FF, #EFDBFF)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#722ED1' }}>9</div>
                  <div style={{ fontSize: '11px', color: '#9254de' }}>活跃旅程阶段</div>
                </div>
              </div>
            </div>

            <button
              style={{ width: '100%', padding: '14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}
              onClick={() => toast.success('设置已保存')}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                保存设置
              </span>
            </button>
          </div>

        /* =================== 朋友圈智能体设置 (已打平显示三块内容) =================== */
        ) : viewState === 'momentsAgent' ? (
          <div className={styles.content}>
            <div className={styles.agentSettingsContainer}>
              {/* 模块1: 朋友圈发布设置 */}
              <div className={styles.sectionCard} style={{ marginBottom: '20px', padding: '16px', background: 'var(--color-bg-page)', borderRadius: '12px' }}>
                <div className={styles.sectionTitle} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px', display: 'flex', color: 'var(--color-primary)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></span> <span>朋友圈发布设置</span>
                </div>
                <div className={styles.toggleRow} style={{ background: 'var(--color-bg-card)', padding: '12px', borderRadius: '8px' }}>
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
                  <div style={{ marginTop: '16px' }}>
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', marginBottom: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#3B82F6' }}>每日发布条数: {momentsForm.publishFrequency}</span>
                      <input type="range" min="1" max="6" step="1" className={styles.kbRange}
                        value={momentsForm.publishFrequency}
                        onChange={e => setMomentsForm(p => ({ ...p, publishFrequency: parseInt(e.target.value) }))} />
                    </div>
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#10B981' }}>内容比例分配</span>
                      <div className={styles.mixSliders}>
                        <div className={styles.mixRow}><span className={styles.mixLabel} style={{display:'flex', gap:'4px'}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1.5 2 2 4.18 1 5.82-1 1.64-3.53 2.1-5.71 1.91A7 7 0 0 1 11 20z"></path></svg>生活共鸣</span><span className={styles.mixValue}>{momentsForm.contentMix.life}%</span></div>
                        <input type="range" min="0" max="100" step="10" className={styles.kbRange} value={momentsForm.contentMix.life} onChange={e => setMomentsForm(p => ({ ...p, contentMix: { ...p.contentMix, life: parseInt(e.target.value) } }))} />
                        <div className={styles.mixRow}><span className={styles.mixLabel} style={{display:'flex', gap:'4px'}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>专业科普</span><span className={styles.mixValue}>{momentsForm.contentMix.professional}%</span></div>
                        <input type="range" min="0" max="100" step="10" className={styles.kbRange} value={momentsForm.contentMix.professional} onChange={e => setMomentsForm(p => ({ ...p, contentMix: { ...p.contentMix, professional: parseInt(e.target.value) } }))} />
                        <div className={styles.mixRow}><span className={styles.mixLabel} style={{display:'flex', gap:'4px'}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>产品转化</span><span className={styles.mixValue}>{momentsForm.contentMix.product}%</span></div>
                        <input type="range" min="0" max="100" step="10" className={styles.kbRange} value={momentsForm.contentMix.product} onChange={e => setMomentsForm(p => ({ ...p, contentMix: { ...p.contentMix, product: parseInt(e.target.value) } }))} />
                      </div>
                    </div>
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#F59E0B' }}>发布时段</span>
                      <div className={styles.timeSlots}>
                        {['07:00-08:30', '11:30-13:00', '17:30-19:00', '20:00-22:00'].map(slot => (
                          <label key={slot} className={styles.memberItem}>
                            <input type="checkbox" checked={momentsForm.activeTimeSlots.includes(slot)}
                              onChange={e => {
                                if (e.target.checked) setMomentsForm(p => ({ ...p, activeTimeSlots: [...p.activeTimeSlots, slot] }));
                                else setMomentsForm(p => ({ ...p, activeTimeSlots: p.activeTimeSlots.filter(t => t !== slot) }));
                              }} />
                            <span>{slot}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 模块2: 点赞评论设置 */}
              <div className={styles.sectionCard} style={{ marginBottom: '20px', padding: '16px', background: 'var(--color-bg-page)', borderRadius: '12px' }}>
                <div className={styles.sectionTitle} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px', display: 'flex', color: 'var(--color-primary)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span> <span>点赞评论设置</span>
                </div>
                <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FDF4FF', borderRadius: '8px', marginBottom: '8px' }}>
                  <span className={styles.agentFormLabel} style={{ color: '#C026D3' }}>工作时间</span>
                  <div className={styles.radioGroup}>
                    <button className={`${styles.radioBtn} ${momentsForm.workTimeType === '24小时' ? styles.activeFull : ''}`} onClick={() => setMomentsForm(p => ({ ...p, workTimeType: '24小时' }))}>24小时</button>
                    <button className={`${styles.radioBtn} ${momentsForm.workTimeType === '时间段' ? styles.activeFull : ''}`} onClick={() => setMomentsForm(p => ({ ...p, workTimeType: '时间段' }))}>时间段</button>
                  </div>
                </div>
                <div className={styles.toggleRow} style={{ background: 'var(--color-bg-card)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <span className={styles.toggleLabel}>自动点赞</span>
                  <div className={styles.toggleSwitch}>
                    <input type="checkbox" id="toggleLike" checked={momentsForm.likeEnabled} onChange={e => setMomentsForm(p => ({ ...p, likeEnabled: e.target.checked }))} />
                    <label htmlFor="toggleLike"></label>
                  </div>
                </div>
                <div className={styles.toggleRow} style={{ background: 'var(--color-bg-card)', padding: '12px', borderRadius: '8px' }}>
                  <span className={styles.toggleLabel}>自动评论</span>
                  <div className={styles.toggleSwitch}>
                    <input type="checkbox" id="toggleComment" checked={momentsForm.commentEnabled} onChange={e => setMomentsForm(p => ({ ...p, commentEnabled: e.target.checked }))} />
                    <label htmlFor="toggleComment"></label>
                  </div>
                </div>
                {momentsForm.commentEnabled && (
                  <div style={{ marginTop: '16px' }}>
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F5F3FF', borderRadius: '8px', marginBottom: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#8B5CF6' }}>评论风格</span>
                      <div className={styles.radioGroup}>
                        <button className={`${styles.radioBtn} ${momentsForm.commentStyle === 'natural' ? styles.activeFull : ''}`} onClick={() => setMomentsForm(p => ({ ...p, commentStyle: 'natural' }))}>自然亲切</button>
                        <button className={`${styles.radioBtn} ${momentsForm.commentStyle === 'professional' ? styles.activeFull : ''}`} onClick={() => setMomentsForm(p => ({ ...p, commentStyle: 'professional' }))}>专业含蓄</button>
                        <button className={`${styles.radioBtn} ${momentsForm.commentStyle === 'warm' ? styles.activeFull : ''}`} onClick={() => setMomentsForm(p => ({ ...p, commentStyle: 'warm' }))}>热情洋溢</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 模块3: 朋友圈跟随 */}
              <div className={styles.sectionCard} style={{ marginBottom: '20px', padding: '16px', background: 'var(--color-bg-page)', borderRadius: '12px' }}>
                <div className={styles.sectionTitle} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px', display: 'flex', color: 'var(--color-primary)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span> <span>朋友圈跟随</span>
                </div>
                <div className={styles.toggleRow} style={{ background: 'var(--color-bg-card)', padding: '12px', borderRadius: '8px' }}>
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
                  <div style={{ marginTop: '16px' }}>
                    <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px', marginBottom: '8px' }}>
                      <span className={styles.agentFormLabel} style={{ color: '#EF4444' }}>跟随账号（每行一个）</span>
                      <textarea className={styles.textarea} rows={3}
                        value={momentsForm.followAccounts.join('\n')}
                        onChange={e => setMomentsForm(p => ({ ...p, followAccounts: e.target.value.split('\n').filter(Boolean) }))}
                        placeholder="输入要跟随的账号昵称或微信号..." />
                    </div>
                  </div>
                )}
              </div>

              <button className={styles.agentSaveBtn} onClick={() => { toast.success('朋友圈智能体设置已统一保存'); setViewState('list'); }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                保存全集配置
              </span>
              </button>
            </div>
          </div>

        /* =================== 账号管理 =================== */
        ) : viewState === 'accountManagement' ? (
          <div className={styles.content}>
            <div className={styles.agentFormContainer}>
              <div className={styles.sectionBanner}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{color: 'var(--color-primary)'}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span>主账号信息</span></div>
              <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '8px' }}>
                <span className={styles.agentFormLabel} style={{ color: '#10B981' }}>账号名称</span>
                <input type="text" className={styles.agentFormInput} defaultValue="氧颜轻医美" />
              </div>
              <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', marginBottom: '8px' }}>
                <span className={styles.agentFormLabel} style={{ color: '#3B82F6' }}>联系手机号</span>
                <input type="tel" className={styles.agentFormInput} defaultValue="13800138000" />
              </div>
              <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px', marginBottom: '8px' }}>
                <span className={styles.agentFormLabel} style={{ color: '#EF4444' }}>登录邮箱</span>
                <input type="text" className={styles.agentFormInput} defaultValue="admin@yuexin.com" readOnly />
              </div>
              <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '8px', marginBottom: '8px' }}>
                <span className={styles.agentFormLabel} style={{ color: '#4B5563' }}>角色</span>
                <input type="text" className={styles.agentFormInput} defaultValue="管理员（主账号）" readOnly />
              </div>
            </div>

            <div className={styles.agentFormContainer}>
              <div className={styles.sectionBanner}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{color: 'var(--color-primary)'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><span>子账号管理</span></div>
              {[
                { name: 'AI顾问-门店1', perm: '线索管理、消息回复', status: '在线', tag: '企微' },
                { name: 'AI顾问-门店2', perm: '线索管理、消息回复', status: '在线', tag: '个微' },
                { name: 'AI顾问-门店3', perm: '素材管理、工作流', status: '离线', tag: '企微' },
              ].map((acc, i) => (
                <div key={i} className={styles.subAccountCard}>
                  <div className={styles.subAccountInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={styles.subAccountName}>{acc.name}</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', borderRadius: '4px', fontWeight: '500' }}>
                        {acc.tag}
                      </span>
                    </div>
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
                <div className={styles.reportCard} style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284C7', marginBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 20V10"/><path d="m18 14-6-6-6 6"/></svg>
                    <span className={styles.reportLabel} style={{ marginTop: 0, color: '#0284C7', fontWeight: 600 }}>新增线索</span>
                  </span>
                  <span className={styles.reportNum} style={{ color: '#0369A1' }}>47</span>
                </div>
                <div className={styles.reportCard} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', marginBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span className={styles.reportLabel} style={{ marginTop: 0, color: '#059669', fontWeight: 600 }}>AI 回复</span>
                  </span>
                  <span className={styles.reportNum} style={{ color: '#047857' }}>324</span>
                </div>
                <div className={styles.reportCard} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#D97706', marginBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span className={styles.reportLabel} style={{ marginTop: 0, color: '#D97706', fontWeight: 600 }}>待审核任务</span>
                  </span>
                  <span className={styles.reportNum} style={{ color: '#B45309' }}>12</span>
                </div>
                <div className={styles.reportCard} style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7C3AED', marginBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className={styles.reportLabel} style={{ marginTop: 0, color: '#7C3AED', fontWeight: 600 }}>AI 处理率</span>
                  </span>
                  <span className={styles.reportNum} style={{ color: '#6D28D9' }}>89%</span>
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
                    <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>氧颜轻医美</div>
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
                <span className={styles.itemIcon} style={{color: '#8b5cf6'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <span className={styles.itemName}>AI 员工设置</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => { setViewState('aiModel'); loadAiModelConfig(); }}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon} style={{color: '#3b82f6'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></span>
                <span className={styles.itemName}>AI 大模型与知识库</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setViewState('safetyRules')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon} style={{color: '#ef4444'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
                <span className={styles.itemName}>红线与安全规则</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>

            <div className={styles.listItem} onClick={() => setViewState('momentsAgent')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon} style={{color: '#10b981'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></span>
                <span className={styles.itemName}>朋友圈智能体</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
          </div>
        </div>

        {/* ③ AI 运营配置 */}
        <div className={styles.listGroup}>
          <div className={styles.groupHead}>AI 运营配置</div>
          <div className={styles.groupItems}>
            <div className={styles.listItem} onClick={() => setViewState('autonomousOps')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon} style={{color: '#14b8a6'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
                <span className={styles.itemName}>AI 自主运营引擎</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setActiveMainPanel('reports')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon} style={{color: '#f59e0b'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
                <span className={styles.itemName}>运营日报</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setActiveMainPanel('materials')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon} style={{color: '#ec4899'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span>
                <span className={styles.itemName}>运营素材</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
          </div>
        </div>

        {/* ④ 运营管理 */}
        <div className={styles.listGroup}>
          <div className={styles.groupHead}>运营管理</div>
          <div className={styles.groupItems}>
            <div className={styles.listItem} onClick={() => setViewState('accountManagement')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon} style={{color: '#f43f5e'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                <span className={styles.itemName}>账号管理</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setViewState('crmConfig')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon} style={{color: '#06b6d4'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
                <span className={styles.itemName}>CRM 系统接入</span>
              </div>
              <span className={styles.itemArrow}>›</span>
            </div>
            <div className={styles.listItem} onClick={() => setViewState('loginChoice')}>
              <div className={styles.itemLeft}>
                <span className={styles.itemIcon} style={{color: '#6b7280'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></span>
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
