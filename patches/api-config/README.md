# API Config Patch

## 概述
这是一个为 Aice PS 项目添加的用户 API 配置功能补丁。允许用户配置自己的 Gemini API 密钥和自定义 Base URL（如代理服务器）。

## 功能特性
- ✅ 支持用户自定义 API Key
- ✅ 支持自定义 Base URL（代理端点）
- ✅ 配置保存在浏览器 localStorage
- ✅ 浮动配置按钮界面
- ✅ API 连接测试功能
- ✅ 键盘快捷键支持（Ctrl+Shift+K）

## 文件结构
```
patches/api-config/
├── index.ts                 # 统一导出文件
├── apiKeyManager.ts         # GoogleGenAI 代理类，拦截并注入用户配置
├── useApiConfig.ts          # React Hook，管理配置状态
├── ApiConfigPanel.tsx       # 配置面板组件
├── FloatingConfigButton.tsx # 浮动按钮组件
└── README.md               # 本文档
```

## 集成方式

### 最小侵入性设计
本补丁采用最小侵入性设计，仅需修改主项目的 2 个文件：

1. **services/geminiService.ts** - 修改导入路径
```typescript
// 原始导入
import { GoogleGenAI } from "@google/genai";
// 修改为
import { GoogleGenAI } from "../patches/api-config";
```

2. **App.tsx** - 添加浮动按钮
```typescript
import { FloatingConfigButton } from './patches/api-config';
// 在组件中添加
<FloatingConfigButton />
```

## 工作原理

### 代理模式
`apiKeyManager.ts` 导出一个代理的 `GoogleGenAI` 类，它：
1. 继承原始的 `GoogleGenAI` 类
2. 在构造函数中拦截配置
3. 优先使用用户配置（localStorage）
4. 回退到系统默认配置（process.env.API_KEY）

### 配置优先级
1. 用户配置的 API Key（最高优先级）
2. 系统环境变量 API Key（默认）
3. 无配置时抛出错误

## 使用方法

### 用户端
1. 点击右下角浮动按钮或按 `Ctrl+Shift+K`
2. 输入 Gemini API Key
3. （可选）输入自定义 Base URL
4. 点击"测试连接"验证配置
5. 保存配置

### 开发端
```typescript
// 导入已经包含代理功能的 GoogleGenAI
import { GoogleGenAI } from './patches/api-config';

// 使用方式与原始 SDK 完全相同
const ai = new GoogleGenAI({ apiKey: 'default-key' });
// 如果用户配置了 API Key，将自动使用用户的配置
```

## 配置存储
配置保存在 localStorage 中：
- `gemini_api_key` - API 密钥
- `gemini_base_url` - 自定义端点 URL

## 注意事项
1. 配置仅保存在浏览器本地，不会上传到服务器
2. 清除浏览器数据会丢失配置
3. Base URL 功能需要代理服务器支持 CORS

## 维护说明
合并上游代码时，此 patches 目录可以完整保留，只需确保：
1. `services/geminiService.ts` 的导入路径正确
2. `App.tsx` 中包含浮动按钮组件

## License
Apache-2.0