# Oneiric - 梦境日志 (Dream Journal)

> "我们捕捉潜意识的碎片，将其铸成数字永恒。"

**Oneiric** 是一个基于 React 19 和 Google Gemini API 构建的超现实主义梦境记录应用。它突破了传统文本日记的限制，利用多模态 AI 技术，将抽象、模糊的梦境转化为具象的视觉艺术（图像与电影级视频）和深度的心理学洞察。

整体 UI 风格致敬了 Cyberpunk 和 Dreamcore 美学，采用全黑背景、像素粒子、模糊版式和流体动画，旨在为用户创造一个沉浸式的、仿佛置身于潜意识深处的交互体验。

---

## 📚 目录

1.  [技术架构 (Tech Stack)](#-技术架构-tech-stack)
2.  [核心功能与实现逻辑 (Core Features)](#-核心功能与实现逻辑-core-features)
    *   [1. 梦境捕获与多模态分析](#1-梦境捕获与多模态分析-dream-capture)
    *   [2. 视觉显化 (Flux & Veo)](#2-视觉显化-visual-manifestation)
    *   [3. 梦境图鉴 (Codex System)](#3-梦境图鉴-codex-system)
    *   [4. 共鸣星海 (Galaxy View)](#4-共鸣星海-galaxy-view)
3.  [UI/UX 组件深度解析 (Component Deep Dive)](#-uiux-组件深度解析-component-deep-dive)
4.  [数据模型设计 (Data Models)](#-数据模型设计-data-models)
5.  [提示词工程策略 (Prompt Engineering)](#-提示词工程策略-prompt-engineering)
6.  [性能优化 (Performance)](#-性能优化-performance)

---

## 🛠 技术架构 (Tech Stack)

本项目采用现代前端技术栈，强调轻量化和高性能动画表现。

*   **核心框架**: React 19 (利用最新的 Hooks 和并发特性)
*   **构建环境**: ESModules (基于浏览器的原生模块导入，无需繁重的 Webpack 配置)
*   **样式系统**: Tailwind CSS (原子化 CSS，快速构建响应式布局)
*   **AI 引擎**: `@google/genai` SDK
    *   **文本/音频理解**: `gemini-2.5-flash` (低延迟，长上下文窗口)
    *   **图像生成**: `gemini-2.5-flash-image` (快速生成高质量插图)
    *   **视频生成**: `veo-3.1-fast-generate-preview` (Google 最新的视频生成模型)
*   **图标库**: Lucide React
*   **数据持久化**: LocalStorage (浏览器本地存储，保障隐私)

---

## 🧠 核心功能与实现逻辑 (Core Features)

### 1. 梦境捕获与多模态分析 (Dream Capture)

这是应用的核心入口，位于 `services/geminiService.ts` 的 `processAudioDream` 函数。

*   **流程**:
    1.  **录音**: 使用浏览器 `navigator.mediaDevices.getUserMedia` 获取音频流，并通过 `MediaRecorder` 录制为 `audio/webm` 格式的 Blob。
    2.  **转码**: 将 Blob 转换为 Base64 字符串。
    3.  **一次性推理**: 将 Base64 音频直接发送给 `gemini-2.5-flash`。我们**不**先转文字再分析，而是利用 Gemini 的原生多模态能力直接“听”懂音频中的情绪和语调。
    4.  **结构化输出**: 要求模型返回严格的 JSON 格式，包含标题、情绪、颜色代码、解析以及用于后续生成的英文提示词。

### 2. 视觉显化 (Visual Manifestation)

Oneiric 的核心亮点是将文字转化为视觉。

*   **静态图像**:
    *   在分析阶段，Gemini 会根据梦境内容生成一个专门优化的英文 `imagePrompt`（例如强调“超现实主义”、“达利风格”）。
    *   调用 `gemini-2.5-flash-image` 生成封面图。
*   **动态视频 (Veo Integration)**:
    *   **按需触发**: 这是一个高成本操作，仅当用户点击“生成视频”时触发。
    *   **API Key 鉴权**: 集成了 `window.aistudio.openSelectKey()` 流程，确保用户使用自己的付费 Key 调用昂贵的 Video 模型。
    *   **异步轮询**: 视频生成通常需要 10-30 秒。前端实现了一个 `while(!operation.done)` 循环，每 5 秒轮询一次 API 状态，直到视频生成完毕。
    *   **资源获取**: 生成完成后，通过带签名的 URI 获取视频二进制流，并在本地创建 ObjectURL 用于播放。

### 3. 梦境图鉴 (Codex System)

这是一个基于“收集”机制的游戏化系统，位于 `App.tsx` 的 `renderCodex`。

*   **逻辑**:
    *   每次 AI 分析梦境时，会提取 3-6 个“元素标签”（如：牙齿、坠落、猫）。
    *   前端会遍历所有历史梦境，聚合统计每个元素的出现频率。
    *   **解锁机制**: 预设了四大类（生灵、自然、情绪、场景）共 40 个核心意象。只有当用户真正梦到这些元素时，图鉴中的图标才会从“锁定”状态变为“点亮”状态，并显示关联的梦境图片。
    *   **深度解读**: 点击已收集的元素，会再次调用 Gemini，分析该符号在用户特定语境下的潜意识含义（例如：“你梦中的‘海’总是伴随着焦虑，可能代表被吞没的恐惧”）。

### 4. 共鸣星海 (Galaxy View)

这是一个社交化的（模拟）视图，用于展示“他人的梦”，位于 `App.tsx` 的 `renderGalaxy`。

*   **实现细节**:
    *   使用 CSS 3D Transforms (`perspective: 1000px`) 创建景深感。
    *   中心是当前用户的最新梦境（恒星）。
    *   周围漂浮的星球（行星）是 Mock 数据，它们拥有随机的轨道动画 (`keyframes float`)。
    *   **交互**: 点击行星会弹出一个半透明的“信号接收器”模态框，展示模糊的梦境关键词。点击“发送共鸣”会触发粒子爆炸动效，给予用户情感上的慰藉。

---

## 🎨 UI/UX 组件深度解析 (Component Deep Dive)

### 1. `InfiniteMenu` (物理感滚动菜单)
*   **设计目标**: 模仿 iOS 的 Cover Flow 或扑克牌堆叠效果，创造“翻阅记忆”的感觉。
*   **数学逻辑**:
    *   监听父容器的 `scrollTop`。
    *   计算每个卡片中心点距离视口中心点的 `distance`。
    *   **高斯分布**: 使用距离作为变量，动态计算 CSS 属性：
        *   `scale`: 距离越远，缩放越小 (从 1.0 到 0.85)。
        *   `opacity`: 距离越远，越透明。
        *   `blur`: 距离越远，模糊度越高 (backdrop-filter)。
        *   `zIndex`: 距离中心越近，层级越高。

### 2. `PixelCard` (动态像素卡片)
*   **技术**: HTML5 Canvas 2D API。
*   **粒子系统**:
    *   **生命周期**: 每个像素点都有 `age` (当前帧数) 和 `life` (总寿命)。
    *   **生成策略**: 默认低概率生成，鼠标 `hover` 时高概率生成，模拟“数据激活”。
    *   **渲染循环**: 使用 `requestAnimationFrame` 每一帧清空画布并重绘所有存活像素。像素的透明度遵循正弦波 (`Math.sin`)，实现呼吸般的淡入淡出效果。

### 3. `FuzzyText` (噪点模糊文字)
*   **技术**: Canvas 像素操作 (Pixel Manipulation)。
*   **算法**:
    1.  在 Canvas 上绘制标准文字。
    2.  调用 `ctx.getImageData` 获取像素矩阵。
    3.  遍历矩阵中的 Alpha 通道 (每 4 个字节的第 4 个)。
    4.  **随机侵蚀**: 根据 `intensity` 参数，随机将部分像素的 Alpha 值降低，制造出类似旧 CRT 显示器或信号干扰的“破碎感”和“模糊感”。

---

## 📊 数据模型设计 (Data Models)

### `Dream` 接口
这是应用的核心数据结构，存储在 `localStorage` 中。

```typescript
export interface Dream {
  id: string;              // UUID
  title: string;           // AI 生成的诗意标题
  date: string;            // ISO 日期
  
  // 媒体资源
  audioUrl: string;        // 原始录音 Blob URL
  imageUrl?: string;       // AI 生成的图片 Base64
  videoUrl?: string;       // Veo 生成的视频 Blob URL
  
  // 视频生成状态机
  videoStatus: 'pending' | 'processing' | 'completed' | 'failed';
  videoPrompt: string;     // 专门为 Veo 优化的英文 Prompt
  
  // 分析数据
  keyPoints: string[];     // 关键情节
  interpretation: string;  // 短评
  detailedAnalysis?: string; // 深度长文解析（按需生成）
  mood?: string;           // 情绪关键词
  color: string;           // 梦境代表色 Hex
  elements?: string[];     // 图鉴系统使用的标签
}
```

---

## 🗣️ 提示词工程策略 (Prompt Engineering)

为了获得最佳的 AI 输出，我们在 `geminiService.ts` 中精心设计了 System Instructions。

### 策略 1：角色设定 (Persona)
> "你是一位超现实主义梦境导演..."
这设定了 AI 的语气基调，使其输出不再是冷冰冰的分析，而是带有艺术感的解读。

### 策略 2：思维链与多任务处理 (CoT)
我们在一个请求中要求模型完成 8 项任务：
1.  **标题**: 中文，诗意。
2.  **关键点**: 简练。
3.  **解读**: 心理学视角。
4.  **情绪**: 情感标记。
5.  **颜色**: 十六进制代码（用于 UI 适配）。
6.  **Image Prompt**: 英文，强调构图和艺术风格。
7.  **Video Prompt**: 英文，强调**镜头语言**（如 "Cinematic shot", "Slow motion"），这对 Veo 模型至关重要。
8.  **图鉴元素**: 名词提取。

### 策略 3：强制 JSON 输出
通过配置 `responseMimeType: "application/json"` 和严格的 `responseSchema`，确保 AI 返回的数据可以直接被前端代码解析，无需各种 Regex 匹配，极大地提高了稳定性。

---

## ⚡ 性能优化 (Performance)

1.  **Canvas 离屏渲染**: `FuzzyText` 和 `PixelCard` 的计算相对昂贵，我们通过 React `useEffect` 清理机制确保组件卸载时 `cancelAnimationFrame` 被调用，防止内存泄漏。
2.  **虚拟列表思想**: 虽然 `InfiniteMenu` 没有使用完整的虚拟化库，但它通过 CSS transform 将不在视野中心的卡片缩小并模糊，减少了浏览器的合成层压力。
3.  **资源懒加载**: 视频生成是异步的，且只有在用户明确请求时才加载，避免了初次加载时的带宽浪费。
4.  **状态分离**: 将 `processingStage` 独立管理，确保录音和 AI 分析时的 UI 响应流畅，不会阻塞主线程。

---

## 📝 法律声明

本应用生成的梦境解读仅供娱乐和自我探索，**不构成**任何专业的心理咨询或医疗诊断建议。所有数据默认存储于用户本地浏览器中。
