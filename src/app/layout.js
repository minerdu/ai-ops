import "./globals.css";
import { ToastProvider } from "@/components/common/Toast";

export const metadata = {
  title: "AI智能体运营平台 - 智能客户经营系统",
  description: "基于企业微信的AI驱动私域客户经营平台，聚合聊天、智能标签、自动跟进、预约管理",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
