# 🌙 Oblivionis 扫雷

> 「忘却的月光下，你能否避开所有暗礁？」

以 **BanG Dream! Ave Mujica** 角色 **丰川祥子（Oblivionis）** 为主题的二次元扫雷游戏。

## 🎮 玩法

- 🖱️ **左键点击**：翻开格子
- 🖱️ **右键点击**：插旗标记
- 📱 **长按**：移动端插旗
- ⌨️ **快捷键**：`1` `2` `3` 切换难度，`R` 重新开始

## 📐 难度

| 难度 | 尺寸 | 地雷 |
|------|------|------|
| 🌙 初月 | 8×8 | 10 |
| ⭐ 半月 | 14×14 | 31 |
| 🔥 满月 | 20×20 | 63 |

## 🚀 部署到 GitHub Pages

1. 安装 [Git](https://git-scm.com/download/win)
2. 在 GitHub 创建新仓库
3. 运行以下命令：

```bash
cd D:\first-cc
git init
git add .
git commit -m "🌙 Oblivionis 扫雷"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

4. 在 GitHub 仓库 → Settings → Pages → Source 选择 `Deploy from a branch`，分支选 `main`，文件夹选 `/ (root)`
5. 等待 1-2 分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`

## 🎨 主题定制

在 `minesweeper/index.html` 中找到 `.bg-character` 样式，取消注释并替换 `background-image` URL 为你的丰川祥子图片即可。
