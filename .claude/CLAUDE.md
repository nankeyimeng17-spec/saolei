# first-cc 项目规范

## 项目概览
- 丰川祥子（Oblivionis）主题扫雷游戏
- 部署地址：https://nankeyimeng17-spec.github.io/saolei/

## 项目结构
```
D:\first-cc\
├── index.html              ← 扫雷游戏本体（单文件 HTML/CSS/JS）
├── README.md               ← 项目说明文档
├── chair-collection/       ← 椅子采集项目
└── .claude/
    ├── CLAUDE.md            ← 本文件（项目级配置）
    └── settings.local.json  ← 本地权限白名单
```

## 扫雷核心参数
- 难度：8×8（初月）/ 14×14（半月）/ 20×20（满月）
- 地雷比例：15.7%，自动计算（easy=10, medium=31, hard=63）
- 文件：单文件 `minesweeper/index.html`，无构建工具

## 手机端触屏
- 长按 400ms 插旗（`touchstart` → `setTimeout`）
- 移动容差 12px，超容差取消长按
- 振动反馈 `navigator.vibrate(20)`
- 所有触摸事件为被动监听器（默认 passive: true）

## 部署
```bash
git add .
git commit -m "信息"
git push origin main
# GitHub Pages 自动构建（约 1-2 分钟）
```

## 注意事项
- 全局 CLAUDE.md 已要求回复带喵、中文优先
- 本项目的 `settings.local.json` 已 gitignore，权限白名单写那里
