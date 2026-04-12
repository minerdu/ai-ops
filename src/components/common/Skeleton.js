import styles from './Skeleton.module.css';

export default function Skeleton({ width, height, radius, style, className }) {
  return (
    <div
      className={`${styles.skeleton} ${className || ''}`}
      style={{
        width: width || '100%',
        height: height || '16px',
        borderRadius: radius || '6px',
        ...style,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <div className={styles.cardSkeletonRow}>
        <Skeleton width="44px" height="44px" radius="50%" />
        <div className={styles.cardSkeletonText}>
          <Skeleton width="60%" height="14px" />
          <Skeleton width="90%" height="12px" />
          <div className={styles.cardSkeletonTags}>
            <Skeleton width="50px" height="18px" radius="10px" />
            <Skeleton width="40px" height="18px" radius="10px" />
            <Skeleton width="55px" height="18px" radius="10px" />
          </div>
        </div>
        <Skeleton width="56px" height="56px" radius="6px" />
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className={styles.taskCardSkeleton}>
      <div className={styles.taskSkeletonHeader}>
        <Skeleton width="36px" height="36px" radius="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton width="50%" height="14px" />
          <Skeleton width="30%" height="11px" style={{ marginTop: '6px' }} />
        </div>
        <Skeleton width="52px" height="22px" radius="12px" />
      </div>
      <Skeleton width="100%" height="12px" style={{ marginTop: '12px' }} />
      <Skeleton width="85%" height="12px" style={{ marginTop: '6px' }} />
      <Skeleton width="60%" height="36px" radius="8px" style={{ marginTop: '12px' }} />
    </div>
  );
}
