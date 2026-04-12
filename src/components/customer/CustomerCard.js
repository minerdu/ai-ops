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

  const scores = {
    '价值度': customer.valueScore,
    '意向度': customer.intentScore,
    '需求度': customer.demandScore,
    '满意度': customer.satisfactionScore,
    '关系度': customer.relationScore,
  };

  const unreadCount = customer.unreadCount || 0;

  const handleClick = (e) => {
    e.preventDefault();
    if (selectable) {
        onSelectToggle && onSelectToggle(customer.id);
    } else {
        selectCustomer(customer.id);
    }
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
        <div className={styles.avatar}>
          {customer.avatar ? (
            <img src={customer.avatar} alt={customer.name} />
          ) : (
            <span className={styles.avatarText}>
              {(customer.name || '未知').slice(-2)}
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
