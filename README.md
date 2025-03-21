# 蝉宝宝

<div align="center">
    <img src="images/banner.png" alt="蝉宝宝 Banner" width="100%">
</div>

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/your-extension-id)](https://chrome.google.com/webstore/detail/your-extension-id)
[![License](https://img.shields.io/github/license/your-username/excel2chanjing)](LICENSE)

蝉宝宝是一款Chrome浏览器插件，专为提升蝉镜视频创作效率而设计。它能够自动化地将Excel/CSV文件中的脚本内容批量导入到蝉镜编辑器中，显著提高视频批量创作的效率。

> ⚠️ **重要提示**
> - 使用前请确保已登录[蝉镜](https://www.chanjing.cc/)
> - 请确保账户中有充足的蝉豆（每次生成视频都会消耗蝉豆）
> - 本插件完全由AI辅助生成，仅供学习和参考使用

## ✨ 特性

- 🚀 支持Excel和CSV文件导入
- 📝 自定义单元格区间选择
- 🔄 批量自动化处理
- 🎯 智能随机人像选择
- 📊 实时进度显示

## 🎬 使用演示

https://github.com/user-attachments/assets/82529244-b3d6-4ca6-b5d6-0efe9c49da4a

## 🚀 快速开始

### 安装

1. 下载本仓库代码
2. 打开Chrome浏览器，访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目目录即可完成安装

### 使用前提条件

1. 确保已登录[蝉镜](https://www.chanjing.cc/)网站
2. 确认账户中有足够的蝉豆余额
3. 建议在使用插件前先手动完成一次视频生成流程，以熟悉整个过程

### 使用方法

1. 准备包含脚本内容的Excel/CSV文件
   > 💡 提示：项目中提供了`example.csv`测试文件，包含多个场景的示例文本，可用于快速测试插件功能
2. 点击插件图标打开配置界面
3. 上传文件并设置：
   - 选择Excel/CSV文件
   - 指定脚本内容的单元格区间（例如：A1:A10）
   - 设置自动化执行次数
4. 点击"跑起来，奥利给"开始自动化处理

> ⚠️ **注意**：插件运行期间请勿关闭或刷新页面，当前版本不支持中途暂停操作

## 🛠️ 技术实现

- 基于Chrome Extension Manifest V3
- 使用原生JavaScript开发
- 集成SheetJS库处理Excel/CSV文件
- 采用Chrome API实现跨页面通信

## 📋 功能列表

- [x] Excel/CSV文件解析
- [x] 自定义单元格区间
- [x] 批量自动化处理
- [x] 进度实时显示
- [x] 智能错误处理
- [x] 随机人像选择

## 🔒 隐私说明

- 所有文件处理均在本地完成
- 不收集任何用户数据
- 不需要任何网络权限（除访问蝉镜网站外）

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 开源协议

本项目基于 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解更多细节

## 👥 致谢

- [SheetJS](https://sheetjs.com/) - Excel文件处理库
- [蝉镜](https://www.chanjing.cc/) - 提供优秀的视频创作平台
- [Claude](https://www.anthropic.com/claude) - AI助手，本项目的主要开发者

## 📞 反馈与建议

如有问题或建议，欢迎通过以下方式反馈：

- 提交 [Issue](https://github.com/l1987i/chanbaby/issues)

---

<div align="center">
    Made with ❤️ for 蝉镜创作者
</div> 
