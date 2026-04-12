'use client';

import { useState, useEffect, useRef } from 'react';
import useStore from '@/lib/store';
import styles from './NotificationDropdown.module.css';
import Link from 'next/link';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const notifications = useStore(s => s.notifications);
  const fetchNotifications = useStore(s => s.fetchNotifications);
  const markNotificationAsRead = useStore(s => s.markNotificationAsRead);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.bellBtn} 
        onClick={() => setIsOpen(!isOpen)}
        title="消息通知"
      >
        <span>🔔</span>
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={`${styles.dropdown} animate-fadeInUp`}>
          <div className={styles.header}>
            <h3>通知中心</h3>
            {unreadCount > 0 && (
              <button 
                className={styles.markAllBtn}
                onClick={() => notifications.forEach(n => markNotificationAsRead(n.id))}
              >
                全部标为已读
              </button>
            )}
          </div>
          
          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>暂无新通知</div>
            ) : (
              notifications.map(note => (
                <div 
                  key={note.id} 
                  className={`${styles.item} ${!note.isRead ? styles.unread : ''}`}
                  onClick={() => markNotificationAsRead(note.id)}
                >
                  <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{note.title}</span>
                    <span className={styles.itemTime}>
                      {`${new Date(note.time).getHours().toString().padStart(2, '0')}:${new Date(note.time).getMinutes().toString().padStart(2, '0')}`}
                    </span>
                  </div>
                  <p className={styles.itemContent}>{note.content}</p>
                  {note.link && (
                    <Link href={note.link} className={styles.itemLink} onClick={() => setIsOpen(false)}>
                      前往处理 ➔
                    </Link>
                  )}
                  {!note.isRead && <span className={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
