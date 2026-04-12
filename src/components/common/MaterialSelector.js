import { useState, useEffect } from 'react';
import styles from './MaterialSelector.module.css';

const fallbackMaterials = [
  {
    id: 'm1',
    title: '新人专属8折券',
    type: 'image',
    content: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=300&q=80',
    tags: '优惠券, 新客',
  },
  {
    id: 'm2',
    title: '冬日养生套餐介绍',
    type: 'text',
    content: '⛄ 冬季是养藏的季节，我们特别推出了「冬日暖阳」温阳通络套餐：\n1. 艾灸温补 40分钟\n2. 姜疗驱寒 20分钟\n原价398，现体验价仅198元，名额有限，回复【报名】锁定！',
    tags: '项目套餐, 冬季',
  },
  {
    id: 'm3',
    title: '门店环境视频',
    type: 'video',
    content: '门店环境宣传片.mp4 (占位)',
    tags: '品牌宣传',
  },
  {
    id: 'm4',
    title: '售后回访万能模板',
    type: 'text',
    content: '您好呀！几天前您刚体验过我们项目，身体感觉恢复得怎么样呢？有没有哪里酸痛或者不舒服的？',
    tags: 'SOP话术, 售后',
  }
];

export default function MaterialSelector({ onClose, onSelect }) {
  const [materials, setMaterials] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/materials')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setMaterials(data);
        } else {
          setMaterials(fallbackMaterials);
        }
        setIsLoading(false);
      })
      .catch(e => {
        console.error('Failed to fetch materials:', e);
        setMaterials(fallbackMaterials);
        setIsLoading(false);
      });
  }, []);

  const filteredMaterials = materials.filter(m => {
    const matchesType = filterType === 'all' || m.type === filterType;
    const matchesSearch = m.title.includes(searchTerm) || m.content.includes(searchTerm) || (m.tags && m.tags.includes(searchTerm));
    return matchesType && matchesSearch;
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} animate-slideInUp`} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>选择素材库内容</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="搜索素材标题或标签..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filters}>
            <button 
              className={`${styles.filterBtn} ${filterType === 'all' ? styles.active : ''}`}
              onClick={() => setFilterType('all')}
            >全部</button>
            <button 
              className={`${styles.filterBtn} ${filterType === 'text' ? styles.active : ''}`}
              onClick={() => setFilterType('text')}
            >话术文本</button>
            <button 
              className={`${styles.filterBtn} ${filterType === 'image' ? styles.active : ''}`}
              onClick={() => setFilterType('image')}
            >图片/海报</button>
            <button 
              className={`${styles.filterBtn} ${filterType === 'video' ? styles.active : ''}`}
              onClick={() => setFilterType('video')}
            >视频</button>
          </div>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.centerMsg}>加载素材中...</div>
          ) : filteredMaterials.length === 0 ? (
            <div className={styles.centerMsg}>未找到符合条件的素材</div>
          ) : (
            <div className={styles.grid}>
              {filteredMaterials.map(m => (
                <div key={m.id} className={styles.materialCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.typeBadge}>
                      {m.type === 'text' ? '📝 文本' : m.type === 'image' ? '🖼️ 图片' : '🎥 视频'}
                    </span>
                    <span className={styles.tags}>{m.tags}</span>
                  </div>
                  
                  <h4 className={styles.cardTitle}>{m.title}</h4>
                  
                  <div className={styles.cardContentPreview}>
                    {m.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.content} alt={m.title} className={styles.imagePreview} />
                    ) : (
                      <p className={styles.textPreview}>{m.content}</p>
                    )}
                  </div>
                  
                  <div className={styles.cardFooter}>
                    <button 
                      className={styles.useBtn} 
                      onClick={() => onSelect(m)}
                    >
                      {m.type === 'text' ? '引用话术' : '发送附件'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
