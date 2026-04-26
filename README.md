# CX Study Assistant 🎓

> 超星学习通自动答题助手，基于 zerror 题库和 AI 智能回复答案，支持作业/考试自动作答、视频倍速播放等功能

## ✨ 功能特性

- 🤖 **AI 智能答题** — 基于 ChatGPT 自动回答作业和考试题目，无需本地题库
- 📚 **zerror 题库支持** — 接入 zerror 题库，匹配题目直接返回答案，更快更准
- 📝 **作业/考试自动作答** — 自动识别题目类型（单选、多选、判断、填空），智能填入答案
- 🎬 **视频倍速播放** — 支持最高16倍速播放视频，节省观看时长
- 🎵 **音频倍速播放** — 音频任务同样支持倍速
- 🔄 **自动切换任务** — 完成当前任务后自动跳转到下一个
- 📖 **复习模式** — 支持补挂视频时长
- 🎯 **答案插入题目** — 可选将答案直接显示在题目后方，方便核对
- ✏️ **答案加粗标记** — 可选对已选答案加粗显示

## 📦 安装

### 前置条件

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
   - [Chrome 应用商店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox 附加组件](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge 扩展](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 安装脚本

1. 点击 [安装链接](https://github.com/bashijiuhou0/cx-study-assistant/raw/main/cx-study-assistant.user.js)，Tampermonkey 会自动弹出安装提示
2. 点击「安装」即可

或手动安装：
1. 打开 Tampermonkey 管理面板
2. 点击「新建脚本」
3. 将 `cx-study-assistant.user.js` 的内容粘贴进去
4. 按 `Ctrl+S` 保存

## 🚀 使用教程

### 基本使用

1. 安装脚本后，打开 [超星学习通](https://mooc1.chaoxing.com/) 并登录
2. 进入课程任务页面，脚本会自动加载
3. 页面左侧会出现脚本控制面板

### 控制面板说明

| 设置项 | 说明 |
|--------|------|
| 📋 自动答题 | 开启后自动获取并填入AI答案 |
| 🔒 强制提交 | 存在无答案题目时仍自动提交（谨慎使用） |
| 🔄 考试轮询 | 考试模式下自动轮询答题 |
| 🎯 答案加粗不选择 | 将答案加粗显示但不自动选择 |
| ✏️ 答案插入题目后 | 将AI答案直接显示在题目文本后方 |

### 视频倍速设置

在脚本顶部配置区修改 `rate` 值：

```javascript
setting: {
    video: 1,    // 1为处理视频，0为关闭
    audio: 1,    // 1为处理音频，0为关闭
    rate: 1,     // 倍速：1为正常速度，2为2倍速，最高16倍速
    review: 0,   // 复习模式：0关闭，1开启可补挂时长
}
```

### API 配置

脚本默认使用自建 API 服务，相关配置位于脚本顶部：

```javascript
var _host = "https://api.bashijiuhou.com";      // API 地址
var _apiKey = "your-api-key";                     // API Key
var _defaultModel = "deepseek-ai/deepseek-v3.2";  // 使用的模型
```

> ⚠️ 如需使用自己的 API，请修改以上配置项

### 使用流程

```
登录超星 → 进入课程 → 打开任务点 → 脚本自动运行
                                    ├── 视频/音频：自动播放 + 倍速
                                    ├── 作业：AI自动答题 + 自动提交
                                    ├── 考试：AI自动答题（需开启考试轮询）
                                    └── PPT：自动滚动浏览
```

## ⚠️ 注意事项

1. **倍速播放风险** — 使用高倍速（>1倍）可能导致进度重置，建议不超过4倍速
2. **API 额度** — 频繁请求可能触发限流，如遇"AI服务器压力过大"提示请稍后重试
3. **答案准确性** — AI 生成答案并非100%正确，建议开启「答案插入题目后」自行核对
4. **考试提交** — 开启「强制提交」前请确认，存在空题也会直接提交
5. **仅供学习** — 本脚本仅供学习交流，请合理使用

## 🔧 常见问题

### 脚本没有反应？
- 确认 Tampermonkey 已启用
- 确认脚本的 `@match` 规则匹配当前页面（`*://*.chaoxing.com/*`）
- 刷新页面重试

### 提示"AI服务器压力过大"？
- API 服务暂时过载，保存当前答案后等待几分钟刷新重试
- 检查 API Key 是否有效

### 视频倍速后进度重置？
- 降低倍速设置（建议不超过4倍）
- 超星服务端会检测异常播放速率

### 答案不准确？
- AI 模型对专业题目准确率有限
- 建议开启「答案插入题目后」自行判断
- 后续版本将接入 zerror 题库提升准确率

## 📋 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-04-26 | 初始版本，AI 智能答题 + 视频音频倍速 + 自动任务切换 |

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 🙏 致谢

- 原作者 [Ne-21](https://github.com/Ne-21) — 脚本基础框架
- [zerror 题库](https://github.com/zerror) — 题库数据支持
