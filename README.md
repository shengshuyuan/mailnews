# CyberMail Nexus | 邮箱情报枢纽

![Status](https://img.shields.io/badge/Status-Online-brightgreen) ![Tech](https://img.shields.io/badge/Tech-Node.js%20%7C%20WebWorker%20%7C%20PWA-blue)

CyberMail Nexus 是一个赛博朋克风格的邮箱行业情报聚合平台。它通过模拟未来感的终端界面，展示最新的邮箱安全漏洞、行业更新和技术趋势。

## 🚀 核心特性

- **赛博朋克 UI**: 沉浸式终端风格，带有 Glitch 效果和扫描线背景。
- **高性能架构**: 
  - **Node.js 后端**: 提供 RESTful API (`/api/news`) 数据服务。
  - **Web Worker**: 独立线程处理数据生成与格式化，确保 UI 零卡顿。
  - **Service Worker**: 资源缓存与离线支持 (PWA)。
- **实时监控**: 侧边栏实时显示 FPS、内存占用和网络延迟。
- **历史归档**: 基于 LocalStorage 的周报历史记录管理。

## 🛠️ 技术栈

- **Backend**: Node.js (Native `http` module, Zero-dependency)
- **Frontend**: HTML5, CSS3 (CSS Variables, Animations), Vanilla JavaScript (ES6+)
- **Storage**: LocalStorage

## 📦 快速开始

1. **环境要求**: Node.js v14+
2. **启动服务**:
   ```bash
   node server.js
   ```
3. **访问**: 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 📂 项目结构

```
mailnews/
├── server.js        # Node.js 后端服务 (API + Static File Server)
├── app.js           # 前端核心逻辑 (UI, API Calls, Worker Mgmt)
├── worker.js        # Web Worker (数据处理)
├── sw.js            # Service Worker (离线缓存)
├── style.css        # 赛博朋克样式定义
├── index.html       # 页面入口
├── news_report.md   # 生成的 Markdown 周报
└── prd.md           # 产品需求文档
```

## 📝 变更日志

查看 [operateLog.md](operateLog.md) 了解详细变更历史。
