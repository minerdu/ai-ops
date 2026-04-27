'use client';

import styles from './OperationAccountManagementView.module.css';

export default function OperationAccountManagementView() {
  const accountMatrix = [
    { name: '氧颜总控中心', role: '全店客户运营与审批协调', id: 'ops_hq_01', count: '5,611', status: '在线', latency: '18ms' },
    { name: '术后关怀-门店1', role: '术后回访与复诊安排', id: 'aftercare_sz_01', count: '1,286', status: '在线', latency: '26ms' },
    { name: '会员运营-门店2', role: '会员复购与储值转化', id: 'vip_hz_02', count: '1,942', status: '在线', latency: '31ms' },
    { name: '活动触达-门店3', role: '节日活动与沉默激活', id: 'campaign_sh_03', count: '988', status: '离线', latency: '-' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.mainHeader}>
          <div className={styles.avatar}>氧</div>
          <div>
            <h3 className={styles.mainTitle}>氧颜轻医美运营中心</h3>
            <div className={styles.tags}>
              <span className={styles.tagId}>ID: OPS-204811</span>
              <span className={styles.tagVerify}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                医美品牌认证
              </span>
            </div>
          </div>
        </div>

        <div className={styles.infoList}>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>注册时间</label>
            <div className={styles.infoContent}>
              <input type="text" value="2024-03-18 09:30:00" readOnly className={`${styles.infoBox} ${styles.infoBoxReadOnly}`} />
              <div style={{ width: 34 }}></div>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>登录名</label>
            <div className={styles.infoContent}>
              <input type="text" value="ops_admin_beauty" readOnly className={styles.infoBox} />
              <button className={styles.editBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>所属行业</label>
            <div className={styles.infoContent}>
              <input type="text" value="美容美业运营" readOnly className={styles.infoBox} />
              <div style={{ width: 34 }}></div>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>联系手机号</label>
            <div className={styles.infoContent}>
              <input type="text" value="139****2266" readOnly className={styles.infoBox} />
              <button className={styles.editBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>登录邮箱</label>
            <div className={styles.infoContent}>
              <input type="text" value="ops@yangyanbeauty.com" readOnly className={styles.infoBox} />
              <button className={styles.editBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>登录状态</label>
            <div className={styles.infoContent}>
              <span className={styles.badgeGreen}>正常</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className={styles.sectionTitle}>子账号管理</h2>
        <div className={styles.subSectionTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          运营账号矩阵 (4)
        </div>
        <div className={styles.wechatGrid}>
          {accountMatrix.map((item) => (
            <div key={item.id} className={styles.wechatCard}>
              <div className={styles.wcHeader}>
                <div className={styles.wcIconQw}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                </div>
                <div>
                  <div className={styles.wcName}>{item.name}</div>
                  <div className={styles.wcRole}>{item.role}</div>
                </div>
              </div>
              <div className={styles.wcDetails}>
                <div className={styles.wcDetailRow}>
                  <span>账号ID:</span>
                  <span className={styles.wcId}>{item.id}</span>
                </div>
                <div className={styles.wcDetailRow}>
                  <span>客户数:</span>
                  <span className={styles.wcCount}>{item.count}</span>
                </div>
                <div className={styles.wcDetailRow}>
                  <span>状态:</span>
                  <div className={styles.wcStatusBox}>
                    <span className={styles.wcStatusText} style={{ color: item.status === '在线' ? '#16A34A' : '#9CA3AF' }}>● {item.status}</span>
                    <div className={styles.wcLatency}>{item.latency}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

