'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './page.module.css';

const DAYS_OF_WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getWeekDays(baseDate) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const days = [];

  // Pad with previous month's days
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }
  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  // Pad to fill last week
  const remainder = days.length % 7;
  if (remainder > 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
  }
  return days;
}

export default function WorkflowPage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // day, week, month
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthDays(selectedDate.getFullYear(), selectedDate.getMonth()), [selectedDate]);

  // Count tasks per date for indicators
  const taskCountByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.scheduledAt) return;
      const d = new Date(t.scheduledAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [tasks]);

  const getTaskCount = (date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return taskCountByDate[key] || 0;
  };

  // Tasks for selected date
  const selectedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.scheduledAt) return false;
      return isSameDay(new Date(t.scheduledAt), selectedDate);
    }).map(t => ({
      id: t.id,
      time: new Date(t.scheduledAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      icon: t.triggerSource === 'journey' ? '🤖' : t.triggerSource === 'manual_command' ? '📋' : t.taskType === 'image' ? '🖼️' : '📝',
      target: t.customerName || '未知用户',
      description: t.title,
      status: t.approvalStatus,
      executeStatus: t.executeStatus,
      triggerSource: t.triggerSource,
      color: t.triggerSource === 'journey' 
        ? '#f0fff4' 
        : t.triggerSource === 'manual_command' 
          ? (t.approvalStatus === 'pending' ? '#fffbe6' : '#e6f4ff')
          : '#f5f5f5',
    })).sort((a, b) => a.time.localeCompare(b.time));
  }, [tasks, selectedDate]);

  // Tasks for selected week
  const weekTasks = useMemo(() => {
    return weekDays.map(date => ({
      date,
      tasks: tasks.filter(t => t.scheduledAt && isSameDay(new Date(t.scheduledAt), date))
    }));
  }, [tasks, weekDays]);

  const navigatePrev = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };

  const navigateNext = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const goToday = () => setSelectedDate(new Date());

  const dateLabel = viewMode === 'day'
    ? `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`
    : `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月`;

  return (
    <div className={styles.workflowPage}>
      {/* Calendar Header */}
      <div className={styles.calendarHeader}>
        <div className={styles.monthTitle}>
          <span className={styles.monthText}>{dateLabel}</span>
          <span className={styles.calIcon}>📅</span>
        </div>
        <div className={styles.navBtns}>
          <button className={styles.navBtn} onClick={navigatePrev}>‹</button>
          <button className={styles.todayBtn} onClick={goToday}>今天</button>
          <button className={styles.navBtn} onClick={navigateNext}>›</button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className={styles.viewTabs}>
        {[
          { key: 'day', label: '日' },
          { key: 'week', label: '周' },
          { key: 'month', label: '月' },
        ].map(v => (
          <button
            key={v.key}
            className={`${styles.viewTab} ${viewMode === v.key ? styles.viewTabActive : ''}`}
            onClick={() => setViewMode(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* === DAY VIEW === */}
      {viewMode === 'day' && (
        <>
          {/* Week strip for day view */}
          <div className={styles.weekDays}>
            {weekDays.map((date, i) => (
              <div
                key={i}
                className={`${styles.dayCell} ${isSameDay(date, selectedDate) ? styles.dayCellSelected : ''} ${isSameDay(date, today) ? styles.dayCellToday : ''}`}
                onClick={() => setSelectedDate(new Date(date))}
              >
                <span className={styles.dayLabel}>{DAYS_OF_WEEK[date.getDay()]}</span>
                <span className={styles.dayNumber}>{date.getDate()}</span>
                {getTaskCount(date) > 0 && (
                  <span className={styles.dayDot}></span>
                )}
              </div>
            ))}
          </div>

          {/* Tasks Section */}
          <div className={styles.tasksSection}>
            <div className={styles.tasksHeader}>
              <h3 className={styles.tasksTitle}>
                {isSameDay(selectedDate, today) ? '今天' : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`}
              </h3>
              <span className={styles.tasksCount}>共 {selectedTasks.length} 条任务</span>
            </div>

            <div className={styles.tasksList}>
              {isLoading ? (
                <div className={styles.emptyState}>加载中...</div>
              ) : selectedTasks.length === 0 ? (
                <div className={styles.emptyState}>
                  <span style={{ fontSize: 36 }}>📋</span>
                  <p>暂无工作流任务</p>
                </div>
              ) : selectedTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`${styles.taskItem} animate-fadeInUp`}
                  style={{ animationDelay: `${index * 80}ms`, background: task.color }}
                >
                  <div className={styles.taskTime}>{task.time}</div>
                  <div className={styles.taskContent}>
                    <div className={styles.taskIcon}>{task.icon}</div>
                    <div className={styles.taskInfo}>
                      <span className={styles.taskTarget}>
                        发送给 <strong>{task.target}</strong>
                      </span>
                      <span className={styles.taskDesc}>{task.description}</span>
                    </div>
                    <span className={`${styles.taskStatus} ${styles[`status_${task.status}`]}`}>
                      {task.status === 'pending' ? '待审批' : task.status === 'approved' ? '已通过' : '已驳回'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* === WEEK VIEW === */}
      {viewMode === 'week' && (
        <div className={styles.weekView}>
          {weekTasks.map(({ date, tasks: dayTasks }, i) => (
            <div key={i} className={styles.weekDayColumn}>
              <div
                className={`${styles.weekDayHeader} ${isSameDay(date, today) ? styles.weekDayHeaderToday : ''}`}
                onClick={() => { setSelectedDate(new Date(date)); setViewMode('day'); }}
              >
                <span>{DAYS_OF_WEEK[date.getDay()]}</span>
                <span className={styles.weekDayNum}>{date.getDate()}</span>
              </div>
              <div className={styles.weekDayTasks}>
                {dayTasks.length === 0 ? (
                  <span className={styles.weekNoTask}>—</span>
                ) : dayTasks.map(t => (
                  <div key={t.id} className={styles.weekTaskChip}>
                    <span className={styles.weekTaskTime}>
                      {new Date(t.scheduledAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={styles.weekTaskTitle}>{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === MONTH VIEW === */}
      {viewMode === 'month' && (
        <div className={styles.monthView}>
          <div className={styles.monthWeekHeader}>
            {DAYS_OF_WEEK.map(d => (
              <span key={d} className={styles.monthWeekLabel}>{d}</span>
            ))}
          </div>
          <div className={styles.monthGrid}>
            {monthDays.map(({ date, isCurrentMonth }, i) => {
              const count = getTaskCount(date);
              return (
                <div
                  key={i}
                  className={`${styles.monthCell} ${!isCurrentMonth ? styles.monthCellMuted : ''} ${isSameDay(date, today) ? styles.monthCellToday : ''} ${isSameDay(date, selectedDate) ? styles.monthCellSelected : ''}`}
                  onClick={() => { setSelectedDate(new Date(date)); setViewMode('day'); }}
                >
                  <span className={styles.monthCellNum}>{date.getDate()}</span>
                  {count > 0 && (
                    <span className={styles.monthCellBadge}>{count}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Input */}
      <div className={styles.workflowInput}>
        <span className={styles.workflowInputIcon}>🤖</span>
        <span className={styles.workflowInputText}>编排工作流...</span>
      </div>
    </div>
  );
}
