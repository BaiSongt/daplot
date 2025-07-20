# DaPlot 前端项目结构

## 📁 目录结构

```
front_end/
├── 📄 主要页面文件
│   ├── index.html              # 🏠 主页
│   ├── data_integrated.html    # 📊 数据操作页面
│   ├── visualization.html      # 📈 可视化绘图页面
│   ├── prediction.html         # 🔮 数据预测页面
│   └── donate.html            # ❤️ 捐赠支持页面
│
├── 📦 src/ - 模块化源代码
│   ├── utils/                 # 工具函数
│   │   ├── constants.js       # 常量定义
│   │   ├── helpers.js         # 辅助函数
│   │   ├── validators.js      # 数据验证
│   │   └── formatters.js      # 数据格式化
│   │
│   ├── core/                  # 核心模块
│   │   ├── ConfigManager.js   # 配置管理
│   │   ├── EventBus.js        # 事件总线
│   │   ├── ApiClient.js       # API客户端
│   │   ├── AppState.js        # 状态管理
│   │   ├── DataManager.js     # 数据管理
│   │   ├── ChartEngine.js     # 图表引擎
│   │   └── ModuleLoader.js    # 模块加载器
│   │
│   ├── components/            # UI组件
│   │   ├── LoadingSpinner.js  # 加载动画
│   │   ├── StatusMessage.js   # 状态消息
│   │   ├── ErrorBoundary.js   # 错误边界
│   │   ├── Modal.js           # 模态框
│   │   ├── Tooltip.js         # 提示框
│   │   ├── FileSelector.js    # 文件选择器
│   │   ├── DataFilter.js      # 数据筛选器
│   │   └── ChartConfig.js     # 图表配置
│   │
│   └── daplot.js              # 🚀 主入口文件
│
├── 🧪 tests/ - 测试文件
│   ├── test-all-refactored-pages.html    # 综合页面测试
│   ├── test-visualization-refactor.html  # 可视化页面测试
│   ├── test-components.html              # 组件测试
│   ├── test-modules.html                 # 模块测试
│   ├── test-all-pages.html               # 所有页面测试
│   ├── test-visualization.html           # 可视化功能测试
│   ├── test_debug.html                   # 调试测试
│   └── test_fixes.html                   # 修复测试
│
├── 📚 docs/ - 文档文件
│   ├── REFACTOR_SUMMARY.md               # 重构总结
│   └── PHASE4_COMPLETION_REPORT.md       # 第四阶段完成报告
│
├── 📦 archive/ - 归档文件
│   ├── index-new.html                    # 主页新版本参考
│   ├── data_integrated-new.html          # 数据操作页面参考
│   ├── visualization-new.html            # 可视化页面参考
│   ├── prediction-new.html               # 预测页面参考
│   └── data_integrated_offline.html      # 离线版本
│
├── 🖼️ images/ - 图片资源
│   ├── ali.jpg                           # 支付宝二维码
│   └── wx.jpg                            # 微信二维码
│
├── 🔧 assets/ - 静态资源
│   ├── js/                               # JavaScript库
│   └── libs/                             # 第三方库
│
├── 💾 backup/ - 备份文件
│
├── ⚙️ runtime-config.json - 运行时配置
└── 📖 README.md - 项目说明文档
```

## 🚀 快速开始

### 1. 打开主要页面
- **主页**: 打开 `index.html`
- **数据操作**: 打开 `data_integrated.html`
- **可视化**: 打开 `visualization.html`
- **数据预测**: 打开 `prediction.html`

### 2. 访问管理中心
- **测试中心**: 打开 `tests/index.html` - 统一的测试管理界面
- **文档中心**: 打开 `docs/index.html` - 完整的文档访问入口

### 3. 运行测试
- **综合测试**: 打开 `tests/test-all-refactored-pages.html`
- **组件测试**: 打开 `tests/test-components.html`
- **模块测试**: 打开 `tests/test-modules.html`

### 4. 查看文档
- **重构总结**: 查看 `docs/REFACTOR_SUMMARY.md`
- **完成报告**: 查看 `docs/PHASE4_COMPLETION_REPORT.md`
- **整理报告**: 查看 `docs/FILE_ORGANIZATION_REPORT.md`

## 🏗️ 架构说明

### 模块化架构
项目采用现代化的模块化架构，包含：
- **19个模块和组件**: 7个核心模块 + 8个UI组件 + 4个工具模块
- **统一状态管理**: 通过AppState管理全局状态
- **事件驱动**: 使用EventBus实现组件间通信
- **错误边界**: 全局错误处理和用户友好提示

### 技术特性
- ✅ **模块化设计**: 可复用组件，易于维护
- ✅ **响应式布局**: 适配不同屏幕尺寸
- ✅ **现代化UI**: 美观的用户界面
- ✅ **性能优化**: 智能缓存和懒加载
- ✅ **错误处理**: 完善的错误捕获和提示

## 🧪 测试指南

### 自动化测试
```bash
# 1. 打开综合测试页面
open tests/test-all-refactored-pages.html

# 2. 点击"运行所有测试"按钮
# 3. 查看测试结果和详细报告
```

### 手动测试
1. **功能测试**: 验证各页面功能正常
2. **兼容性测试**: 测试不同浏览器兼容性
3. **响应式测试**: 测试不同屏幕尺寸适配
4. **性能测试**: 检查页面加载和响应速度

## 📈 项目状态

### 重构进度
```
DaPlot 模块化重构项目
├── ✅ 第一阶段：核心基础设施 (100%)
├── ✅ 第二阶段：图表引擎和组件库 (100%)
├── ✅ 第三阶段：可复用UI组件 (100%)
├── ✅ 第四阶段：页面重构和集成 (100%)
├── ⏳ 第五阶段：性能优化和测试 (待开始)
└── ⏳ 第六阶段：文档和部署 (待开始)
```

**当前进度**: 4/6 阶段完成 (67%)

## 🔧 开发指南

### 添加新组件
1. 在 `src/components/` 目录创建新组件文件
2. 在相应页面中引用组件脚本
3. 在 `tests/` 目录添加组件测试

### 修改现有功能
1. 找到对应的模块文件进行修改
2. 更新相关测试文件
3. 运行测试验证功能正常

### 调试问题
1. 打开浏览器开发者工具
2. 查看控制台错误信息
3. 使用测试页面进行问题定位

## 📞 支持

如有问题或建议，请查看：
- 📚 文档目录中的详细说明
- 🧪 测试页面中的功能验证
- 📦 源代码中的注释说明

---

*最后更新: ${new Date().toLocaleString('zh-CN')}*