'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

const tabs = ['全部', '朋友圈', '文本', '图片', '视频', '链接', '文件'];

const typeIcons = {
  text: '📝',
  image: '🖼️',
  video: '🎬',
  link: '🔗',
  file: '📁',
  moments: '📱',
};

const typeLabels = {
  text: '文本',
  image: '图片',
  video: '视频',
  link: '链接',
  file: '文件',
  moments: '朋友圈',
};

export default function MaterialsPage() {
  const [activeTab, setActiveTab] = useState('全部');
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  
  // Use store to navigate back to settings
  const setActiveMainPanel = require('@/lib/store').default(s => s.setActiveMainPanel);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/materials');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = activeTab === '全部'
    ? materials
    : materials.filter(m => {
        const map = { '文本': 'text', '图片': 'image', '视频': 'video', '链接': 'link', '文件': 'file', '朋友圈': 'moments' };
        return m.type === map[activeTab];
      });

  return (
    <div className={styles.materialsPage}>
      <div className={styles.header}>
        <button className={styles.backBtnIOS} onClick={() => setActiveMainPanel('settings')}>
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span className={styles.backBtnText}>返回</span>
        </button>
        <h2 className={styles.title}>运营素材</h2>
      </div>

      {/* Tabs */}
      <div className={styles.tabsRow} style={{ marginTop: '10px' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.empty}>
            <p>加载素材中...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((item, index) => (
              <div
                key={item.id}
                className={`${styles.materialCard} animate-fadeInUp`}
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => setSelectedMaterial(item)}
              >
                <div className={styles.cardIcon}>
                  {typeIcons[item.type] || '📄'}
                </div>
                <div className={styles.cardInfo}>
                  <h4 className={styles.cardTitle}>{item.title}</h4>
                  <span className={styles.cardType}>{typeLabels[item.type] || item.type}</span>
                  {item.tags && (
                    <div className={styles.cardTags}>
                      {item.tags.split(',').map((tag, i) => (
                        <span key={i} className={styles.miniTag}>{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.cardArrow}>›</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📂</span>
            <p>暂无素材</p>
          </div>
        )}

        {/* Upload Button */}
        <button className={styles.uploadBtn}>
          <span>＋</span>
          <span>上传素材</span>
        </button>
      </div>

      {/* Material Preview Modal */}
      {selectedMaterial && (
        <>
          <div className={styles.modalBackdrop} onClick={() => setSelectedMaterial(null)} />
          <div className={styles.previewModal}>
            <div className={styles.previewHeader}>
              <div className={styles.previewHeaderLeft}>
                <span className={styles.previewIcon}>{typeIcons[selectedMaterial.type] || '📄'}</span>
                <span className={styles.previewType}>{typeLabels[selectedMaterial.type] || selectedMaterial.type}</span>
              </div>
              <button className={styles.previewClose} onClick={() => setSelectedMaterial(null)}>✕</button>
            </div>

            <h3 className={styles.previewTitle}>{selectedMaterial.title}</h3>

            {selectedMaterial.tags && (
              <div className={styles.previewTags}>
                {selectedMaterial.tags.split(',').map((tag, i) => (
                  <span key={i} className={styles.previewTag}>{tag.trim()}</span>
                ))}
              </div>
            )}

            <div className={styles.previewContent}>
              {selectedMaterial.content}
            </div>

            <div className={styles.previewActions}>
              <button className={styles.previewActionBtn}>
                <span>📋</span> 复制内容
              </button>
              <button className={styles.previewActionPrimary}>
                <span>📱</span> 发送给客户
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
