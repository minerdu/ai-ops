import { NextResponse } from 'next/server';

const mockNotifications = [
  {
    id: 'n1',
    type: 'alert',
    title: 'SOP 执行提醒',
    content: '沉默客户激活SOP刚刚为 14 位客户推入了待审批队列，请及时处理以免错过最佳挽回时机。',
    time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    isRead: false,
    link: '/tasks'
  },
  {
    id: 'n2',
    type: 'message',
    title: '高意向异动',
    content: 'VIP客户【王总】刚才发来长图文消息，疑似意向突增，AI由于处于阻断模式未做回复，请前往查看。',
    time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    isRead: false,
    link: '/leads'
  },
  {
    id: 'n3',
    type: 'system',
    title: '系统播报',
    content: '您的私域AI运营助手底模（基于 DeepSeek-V3）已经完成上周业务语料微调更新。',
    time: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    isRead: true,
  }
];

export async function GET() {
  return NextResponse.json(mockNotifications);
}
