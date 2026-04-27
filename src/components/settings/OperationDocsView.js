'use client';

import styles from './OperationDocsView.module.css';

const TYPE_CONFIG = {
  playbook: {
    name: '运营总册',
    section: 'core',
    theme: 'iconBoxGreen',
    source: 'sourceLocal',
    sourceLabel: '本地私有',
    description: '统一沉淀门店全年经营节奏、客户分层、活动触达与转化规则。',
  },
  campaign: {
    name: '活动方案',
    section: 'core',
    theme: 'iconBoxOrange',
    source: 'sourceWorkflow',
    sourceLabel: '工作流中心',
    description: '围绕节点大促、储值裂变、会员日与到店转化的标准打法。',
  },
  coupon: {
    name: '权益与优惠券',
    section: 'core',
    theme: 'iconBoxBlue',
    source: 'sourceYouzan',
    sourceLabel: '有赞 CRM',
    description: '用于高意向犹豫客、沉默激活和复购召回的券包与权益模板。',
  },
  private_domain: {
    name: '私域SOP',
    section: 'core',
    theme: 'iconBoxTeal',
    source: 'sourceWorkflow',
    sourceLabel: '工作流中心',
    description: '覆盖加微欢迎、首单转化、复购唤醒和老客关怀的执行SOP。',
  },
  aftercare: {
    name: '术后关怀',
    section: 'support',
    theme: 'iconBoxPink',
    source: 'sourceZhipu',
    sourceLabel: '智谱知识库',
    description: '聚焦术后节点回访、风险提醒、禁忌提示和复诊安排。',
  },
  membership: {
    name: '会员复购',
    section: 'support',
    theme: 'iconBoxPurple',
    source: 'sourceYouzan',
    sourceLabel: '有赞 CRM',
    description: '面向高价值老客和沉默会员的生命周期运营资料与回访脚本。',
  },
  training: {
    name: '客服训练',
    section: 'support',
    theme: 'iconBoxIndigo',
    source: 'sourceLocal',
    sourceLabel: '本地私有',
    description: '用于统一AI客服口径、门店员工标准回复与异常应答规范。',
  },
  dashboard: {
    name: '日报与复盘',
    section: 'support',
    theme: 'iconBoxYellow',
    source: 'sourceLocal',
    sourceLabel: '本地私有',
    description: '沉淀日报模板、周度复盘、异常监控与经营指标定义口径。',
  },
};

const MOCK_FILES = {
  playbook: [
    { id: 'p1', name: '2026美业私域运营总册_v3', format: 'pdf', size: '10.8 MB', date: '2026-04-08' },
    { id: 'p2', name: '门店客户分层与触达节奏表', format: 'xlsx', size: '1.4 MB', date: '2026-04-09' },
    { id: 'p3', name: '年度节日营销与到店经营排期', format: 'xlsx', size: '2.1 MB', date: '2026-04-11' },
    { id: 'p4', name: '私域运营目标拆解与负责人机制', format: 'docx', size: '0.9 MB', date: '2026-04-13' },
  ],
  campaign: [
    { id: 'c1', name: '五一焕肤周活动方案', format: 'pptx', size: '12.2 MB', date: '2026-04-10' },
    { id: 'c2', name: '会员储值裂变海报与文案包', format: 'zip', size: '28.6 MB', date: '2026-04-12' },
    { id: 'c3', name: '新品导入周引流脚本与转化话术', format: 'docx', size: '1.7 MB', date: '2026-04-14' },
    { id: 'c4', name: '周末到店促转化执行清单', format: 'pdf', size: '2.8 MB', date: '2026-04-16' },
  ],
  coupon: [
    { id: 'q1', name: '高意向客户200元体验券规则', format: 'pdf', size: '1.2 MB', date: '2026-04-09' },
    { id: 'q2', name: '沉默会员唤醒券包配置表', format: 'xlsx', size: '0.8 MB', date: '2026-04-15' },
    { id: 'q3', name: '疗程续费权益梯度模板', format: 'docx', size: '1.1 MB', date: '2026-04-17' },
    { id: 'q4', name: '术后复诊福利券发放SOP', format: 'pdf', size: '1.6 MB', date: '2026-04-18' },
  ],
  private_domain: [
    { id: 'd1', name: '新客加微欢迎SOP', format: 'pdf', size: '2.5 MB', date: '2026-04-08' },
    { id: 'd2', name: '高意向犹豫期跟进链路图', format: 'pptx', size: '8.6 MB', date: '2026-04-10' },
    { id: 'd3', name: '沉默激活周节奏脚本', format: 'docx', size: '1.3 MB', date: '2026-04-12' },
    { id: 'd4', name: '老客复购唤醒任务模板', format: 'xlsx', size: '0.9 MB', date: '2026-04-19' },
  ],
  aftercare: [
    { id: 'a1', name: '术后24小时关怀标准口径', format: 'docx', size: '1.0 MB', date: '2026-04-07' },
    { id: 'a2', name: '项目术后禁忌与异常提醒清单', format: 'pdf', size: '3.2 MB', date: '2026-04-09' },
    { id: 'a3', name: '复诊预约节点提醒话术', format: 'xlsx', size: '0.7 MB', date: '2026-04-13' },
    { id: 'a4', name: '敏感投诉升级与人工接管SOP', format: 'docx', size: '1.6 MB', date: '2026-04-15' },
  ],
  membership: [
    { id: 'm1', name: '高价值会员复购经营手册', format: 'pdf', size: '4.6 MB', date: '2026-04-11' },
    { id: 'm2', name: '积分商城权益配置建议', format: 'xlsx', size: '1.2 MB', date: '2026-04-12' },
    { id: 'm3', name: '沉默会员一周两触达脚本', format: 'docx', size: '0.9 MB', date: '2026-04-17' },
    { id: 'm4', name: '疗程续费关怀消息模板', format: 'docx', size: '1.1 MB', date: '2026-04-18' },
  ],
  training: [
    { id: 't1', name: 'AI客服标准回复训练手册', format: 'pdf', size: '5.1 MB', date: '2026-04-08' },
    { id: 't2', name: '门店顾问禁用话术与红线清单', format: 'docx', size: '1.4 MB', date: '2026-04-10' },
    { id: 't3', name: '客户异议处理百问百答', format: 'pdf', size: '3.8 MB', date: '2026-04-16' },
    { id: 't4', name: 'AI转人工触发规则说明', format: 'xlsx', size: '0.6 MB', date: '2026-04-20' },
  ],
  dashboard: [
    { id: 'r1', name: '运营日报指标定义口径', format: 'docx', size: '0.8 MB', date: '2026-04-12' },
    { id: 'r2', name: '周复盘模板与异常排查清单', format: 'xlsx', size: '1.0 MB', date: '2026-04-14' },
    { id: 'r3', name: '60秒响应率监控说明', format: 'pdf', size: '1.5 MB', date: '2026-04-22' },
    { id: 'r4', name: '经营建议生成字段映射表', format: 'xlsx', size: '0.7 MB', date: '2026-04-23' },
  ],
};

function TypeIcon({ type }) {
  const props = {
    width: 32,
    height: 32,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (type) {
    case 'playbook':
      return <svg {...props}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>;
    case 'campaign':
      return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>;
    case 'coupon':
      return <svg {...props}><path d="M3 10V6a2 2 0 0 1 2-2h14v4a2 2 0 0 0 0 4v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 0 0-4Z" /><path d="M12 4v16" /></svg>;
    case 'private_domain':
      return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case 'aftercare':
      return <svg {...props}><path d="M12 21s-6.5-4.35-9-8.5C.67 8.63 3.3 4 8 4c2.48 0 4 1.5 4 1.5S13.52 4 16 4c4.7 0 7.33 4.63 5 8.5-2.5 4.15-9 8.5-9 8.5z" /></svg>;
    case 'membership':
      return <svg {...props}><circle cx="8" cy="8" r="2" /><path d="M8 10v12" /><path d="M16 8h.01" /><path d="M12 16h8" /><path d="M12 20h8" /><path d="M12 12h8" /></svg>;
    case 'training':
      return <svg {...props}><path d="M22 10v6M2 10v6" /><path d="M6 12v8" /><path d="M18 12v8" /><path d="M12 6v14" /><path d="M2 10c2.5-2 5.5-3 10-3s7.5 1 10 3" /><path d="M2 16c2.5 2 5.5 3 10 3s7.5-1 10-3" /></svg>;
    case 'dashboard':
      return <svg {...props}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
    default:
      return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
  }
}

function FileFormatIcon({ format }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { flexShrink: 0 },
  };
  const normalized = String(format || '').toLowerCase();

  if (normalized.includes('pdf')) return <svg {...props} color="#ef4444"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
  if (normalized.includes('doc')) return <svg {...props} color="#2563eb"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
  if (normalized.includes('xls')) return <svg {...props} color="#10b981"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
  if (normalized.includes('ppt')) return <svg {...props} color="#f97316"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
  if (normalized.includes('zip')) return <svg {...props} color="#7c3aed"><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12v5" /><path d="M14 12v5" /></svg>;
  return <svg {...props} color="#6b7280"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
}

export default function OperationDocsView() {
  const coreTypes = ['playbook', 'campaign', 'coupon', 'private_domain'];
  const supportTypes = ['aftercare', 'membership', 'training', 'dashboard'];

  const renderCard = (type) => {
    const config = TYPE_CONFIG[type];
    const files = MOCK_FILES[type] || [];
    if (!config) return null;

    return (
      <div key={type} className={styles.docCard}>
        <div className={styles.cardHeader}>
          <div className={`${styles.iconBox} ${styles[config.theme]}`}>
            <TypeIcon type={type} />
          </div>
          <div className={styles.metaBox}>
            <span className={`${styles.sourceTag} ${styles[config.source]}`}>
              {config.sourceLabel}
            </span>
            <div className={styles.docCount}>{files.length} 个文件</div>
          </div>
        </div>

        <h3 className={styles.cardTitle}>{config.name}</h3>
        <p className={styles.cardDesc}>{config.description}</p>

        <div className={styles.fileList}>
          {files.map((file) => (
            <div key={file.id} className={styles.fileItem}>
              <FileFormatIcon format={file.format} />
              <span className={styles.fileName} title={file.name}>{file.name}</span>
              <span className={styles.fileMeta}>{file.size}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.docsContainer}>
        <div className={styles.docsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.greenPill}></span> 核心运营体系
          </h2>
          <div className={styles.grid}>
            {coreTypes.map(renderCard)}
          </div>
        </div>

        <div className={styles.docsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.bluePill}></span> 执行与支持文档
          </h2>
          <div className={styles.grid}>
            {supportTypes.map(renderCard)}
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
