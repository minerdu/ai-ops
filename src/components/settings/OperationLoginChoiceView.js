'use client';

import styles from '@/app/(dashboard)/settings/page.module.css';

export default function OperationLoginChoiceView() {
  return (
    <>
      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <span>当前登录</span>
        </div>
        <div className={styles.subAccountCard}>
          <div className={styles.subAccountInfo}>
            <span className={styles.subAccountName}>氧颜轻医美运营中心</span>
            <span className={styles.subAccountPerm}>ops@yangyanbeauty.com · 运营管理员</span>
          </div>
          <span className={`${styles.subAccountStatus} ${styles.statusOnline}`}>已验证</span>
        </div>
      </div>

      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <span>登录方式</span>
        </div>
        <div className={styles.radioGroup}>
          <button className={`${styles.radioBtn} ${styles.activeFull}`}>账号密码</button>
          <button className={styles.radioBtn}>短信验证</button>
          <button className={styles.radioBtn}>企业微信扫码</button>
        </div>
      </div>

      <div className={styles.agentFormContainer}>
        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>双重验证</div>
            <div className={styles.miniLabel}>建议运营总控和店长账号强制开启</div>
          </div>
          <div className={styles.toggleSwitch}>
            <input id="ops-two-factor-auth" type="checkbox" defaultChecked />
            <label htmlFor="ops-two-factor-auth"></label>
          </div>
        </div>
      </div>

      <button className={styles.agentSaveBtn} style={{ background: '#f5f5f5', color: 'var(--color-text-primary)' }}>切换账号</button>
      <button className={styles.agentSaveBtn} style={{ background: '#fff1f0', color: '#cf1322' }}>退出登录</button>
    </>
  );
}
