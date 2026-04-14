'use client';

import useStore from '@/lib/store';
import RadarChart from './RadarChart';
import styles from './CustomerCard.module.css';

const tagClassMap = {
  lifecycle: 'tagLifecycle',
  intent: 'tagIntent',
  risk: 'tagRisk',
  status: 'tagStatus',
  custom: 'tagCustom',
};

export default function CustomerCard({ customer, style, selectable, selected, onSelectToggle }) {
  const selectCustomer = useStore(s => s.selectCustomer);
  const selectedCustomerId = useStore(s => s.selectedCustomerId);
  const isSelected = selectedCustomerId === customer.id;

  const uiScores = customer.uiScores || {};
  let scores = {};
  if (customer.isGroup) {
    scores = {
      '活跃度': uiScores.activityScore || 0,
      '消费力': uiScores.spendingScore || 0,
      '互动质量': uiScores.interactionScore || 0,
      '品牌粘性': uiScores.loyaltyScore || 0,
      '转介绍': uiScores.referralScore || 0,
      '转化潜力': uiScores.conversionScore || 0,
    };
  } else {
    scores = {
      '客单价值': uiScores.valueScore || 0,
      '跟进意向': uiScores.intentScore || 0,
      '强烈需求': uiScores.demandScore || 0,
      '满意度': uiScores.satisfactionScore || 0,
      '客情关系': uiScores.relationScore || 0,
      '忠诚度': uiScores.loyaltyScore || 0,
    };
  }

  const unreadCount = customer.unreadCount || 0;

  const handleClick = (e) => {
    e.preventDefault();
    if (selectable) {
        onSelectToggle && onSelectToggle(customer.id);
    } else {
        selectCustomer(customer.id);
    }
  };

  const avatarText = customer.isGroup 
    ? (customer.name || '群聊').substring(0, 2) 
    : (customer.name || '未知').slice(-2);

  const getAvatarColor = () => {
    if (customer.assignedToId === 'sub_1') return '#722ED1';
    if (customer.assignedToId === 'sub_2') return '#FA8C16';
    if (customer.assignedToId === 'sub_3') return '#13C2C2';
    return '#3b82f6';
  };

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''} animate-fadeInUp`}
      style={style}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className={styles.cardMain}>
        {/* Checkbox for Selectable Mode */}
        {selectable && (
          <div className={styles.checkboxWrapper} onClick={e => e.stopPropagation()}>
            <input 
              type="checkbox" 
              className={styles.checkbox}
              checked={selected || false} 
              onChange={() => onSelectToggle && onSelectToggle(customer.id)}
            />
          </div>
        )}

        {/* Avatar */}
        <div className={styles.avatar} style={{ background: customer.avatar ? 'transparent' : getAvatarColor() }}>
          {customer.avatar ? (
            <img src={customer.avatar} alt={customer.name} />
          ) : (
            <span className={styles.avatarText} style={{ color: '#fff' }}>
              {avatarText}
            </span>
          )}
          {customer.silentDays === 0 && (
            <span className={styles.onlineDot}></span>
          )}
          {(customer.tags || []).some(t => t.name === 'AI接待') && (
            <span className={styles.aiBadge}>AI</span>
          )}
        </div>

        {/* Info */}
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <h3 className={styles.name}>{customer.name}</h3>
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
            {customer.silentDays > 0 && (
              <span className={styles.silentBadge}>
                {customer.silentDays}天未联系
              </span>
            )}
          </div>
          <p className={styles.summary}>{customer.aiSummary}</p>
          <div className={styles.tags}>
            {(customer.tags || []).slice(0, 4).map((tag, i) => (
              <span
                key={i}
                className={`${styles.tag} ${styles[tagClassMap[tag.category]] || styles.tagCustom}`}
              >
                {tag.name}
              </span>
            ))}
            {(customer.tags || []).length > 4 && (
              <span className={styles.tagMore}>+{(customer.tags || []).length - 4}</span>
            )}
          </div>
        </div>

        {/* Radar Chart */}
        <div className={styles.radarWrapper}>
          <RadarChart scores={scores} size={72} />
        </div>
      </div>
    </div>
  );
}
