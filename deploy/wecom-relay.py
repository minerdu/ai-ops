#!/usr/bin/env python3
import json
import urllib.request
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

# ==========================================
# OPENAPI 转发生服务 (纯代理版)
# 作用: 替代原有的复杂 Bridge, 纯粹接收企微 webhook 并抛给 AI-Sales 云端
# ==========================================

# 在这里配置你们的 AI-Sales 服务器地址
TARGET_WEBHOOK_URL = os.environ.get("TARGET_WEBHOOK_URL", "http://101.33.199.203/api/wecom/callback")
LISTEN_PORT = 19081

class WecomRelay(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            # 原封不动地通过 POST 转发给云端 VPS
            req = urllib.request.Request(
                TARGET_WEBHOOK_URL, 
                data=post_data, 
                headers={'Content-Type': 'application/json'}
            )
            
            # 由于可能带有鉴权信息，把 auth 头也带上 (可选)
            auth = self.headers.get('Authorization') or self.headers.get('x-api-key')
            if auth:
                req.add_header('Authorization', auth)

            with urllib.request.urlopen(req, timeout=10) as response:
                pass # Fire and forget

            print(f"[Relay] Successfully forwarded {content_length} bytes to {TARGET_WEBHOOK_URL}")

            # 立刻告诉供应商 "收到且处理成功"，避免供应商超时重试
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"code":0,"message":"success"}')

        except Exception as e:
            print(f"[Relay Error] Failed to forward payload: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b'{"code":500,"message":"relay failed"}')

if __name__ == '__main__':
    print("=============================================")
    print("  WeCom Webhook Relay to AI-Sales is running ")
    print(f"  Target: {TARGET_WEBHOOK_URL}")
    print(f"  Listening on port: {LISTEN_PORT}")
    print("  (Please ensure your Hermes reverse proxy routes /oa/in to 19081)")
    print("=============================================")
    HTTPServer(('0.0.0.0', LISTEN_PORT), WecomRelay).serve_forever()
