<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 中国象棋趣味玩法 🎮

一个基于中国象棋棋子的创新策略游戏平台，包含半盘炸弹棋和经典象棋两种游戏模式。

[![React](https://img.shields.io/badge/React-19.2.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF.svg)](https://vitejs.dev/)

[在线体验](https://1) | [报告问题](https://github.com/yourusername/chinesechess-funplay/issues)

</div>

## 📖 目录

- [游戏介绍](#游戏介绍)
- [游戏模式](#游戏模式)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [部署](#部署)

## 🎯 游戏介绍

本项目是一个创新的中国象棋变体游戏平台，提供两种独特的游戏体验：

### 半盘炸弹棋 (Bombing Chess)
一种基于中国象棋棋子和半尺寸棋盘的独特策略游戏。通过形成四连珠来"炸毁"对手的棋子，目标是将对手的棋子数量减少到 4 枚以下获胜。

### 经典象棋 (Classic Xiangqi)
传统的中国象棋游戏，支持双人对战和人机对弈模式，集成了 ChessDB API 提供 AI 对手和走法提示。

## 🎮 游戏模式

### 半盘炸弹棋规则

**棋盘设置**
- 使用 5×10 的半尺寸棋盘
- 每方各有 16 枚中国象棋棋子

**游戏流程**
1. **落子阶段**：红方先手，双方轮流从手牌中放置棋子到空格
2. **移动阶段**：手牌用完后，移动棋盘上的棋子（仅可移动到相邻空格）
3. **炸弹阶段**：形成四连珠（横、竖、斜）后触发
   - 回收四连珠的棋子到手牌
   - 选择对手一枚棋子"炸毁"（吃掉）
   - 如果炸毁后再次形成四连珠，可连环炸

**胜利条件**
- 将对手的棋子总数（棋盘+手牌）减少到 4 枚以下
- 对手无法移动时

### 经典象棋规则

**游戏模式**
- **双人对战**：本地双人对弈
- **人机对弈**：与 AI 对战，支持三种难度
  - 大师：最强难度，选择最优走法
  - 高手：稳健难度，从前三优走法中随机选择
  - 入门：轻松难度，选择中等评分走法

**特色功能**
- **AI 提示**：获取当前局面的最佳走法建议
- **悔棋功能**：支持撤销上一步操作
- **实时评分**：基于 ChessDB 的局面评估

**胜利条件**
- 吃掉对方的帅/将

## 🛠 技术栈

### 前端框架
- **React 19.2.3** - 用户界面构建
- **TypeScript 5.8.2** - 类型安全的 JavaScript
- **Vite 6.2.0** - 快速的构建工具和开发服务器

### UI 组件
- **Lucide React** - 现代化的图标库
- **Tailwind CSS** - 实用优先的 CSS 框架（通过内联样式实现）

### 游戏逻辑
- 自定义游戏引擎（`logic/gameLogic.ts`, `logic/classicLogic.ts`）
- FEN 格式支持（用于象棋局面表示）
- ChessDB API 集成（用于 AI 对弈）

### 构建工具
- **@vitejs/plugin-react** - React 快速刷新支持
- **Terser** - JavaScript 代码压缩优化

## 🚀 快速开始

### 环境要求

- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/yourusername/chinesechess-funplay.git
cd chinesechess-funplay
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问应用**
打开浏览器访问 `http://localhost:3001`

### 可用命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 📁 项目结构

```
chinesechess-funplay/
├── components/           # React 组件
│   ├── ClassicGame.tsx  # 经典象棋游戏组件
│   ├── GameBoard.tsx    # 半盘炸弹棋棋盘组件
│   └── XiangqiPiece.tsx # 棋子渲染组件
├── logic/               # 游戏逻辑
│   ├── classicLogic.ts  # 经典象棋规则
│   └── gameLogic.ts     # 半盘炸弹棋规则
├── App.tsx              # 主应用组件
├── constants.ts         # 游戏常量配置
├── types.ts             # TypeScript 类型定义
├── index.tsx            # 应用入口
├── index.html           # HTML 模板
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 项目依赖
```

## 💻 开发指南

### 添加新游戏模式

1. 在 `types.ts` 中定义新的游戏模式类型
2. 在 `logic/` 目录下创建游戏逻辑文件
3. 在 `components/` 中创建对应的游戏组件
4. 在 `App.tsx` 中集成新模式

### 修改游戏规则

- 半盘炸弹棋规则：编辑 `logic/gameLogic.ts` 和 `constants.ts`
- 经典象棋规则：编辑 `logic/classicLogic.ts`

### 样式定制

项目使用 Tailwind CSS 风格的内联样式，可以在组件中直接修改 `className` 属性。

## 🌐 部署

### Netlify 部署

项目已配置好 Netlify 部署支持：

1. 连接 GitHub 仓库到 Netlify
2. 构建命令：`npm run build`
3. 发布目录：`dist`
4. 自动部署：推送到主分支时自动触发

### 其他平台

项目可以部署到任何支持静态网站的平台：
- Vercel
- GitHub Pages
- Cloudflare Pages

## 📝 许可证

本项目采用 MIT 许可证。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues: [提交问题](https://github.com/yourusername/chinesechess-funplay/issues)
