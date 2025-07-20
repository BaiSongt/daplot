# DaPlot 测试指南

## 概述

DaPlot 项目现在支持完整的测试基础设施，包括单元测试、集成测试和端到端测试。本指南将帮助你了解如何运行和管理测试。

## 快速开始

### 1. 验证测试设置

在运行测试之前，首先验证测试环境是否正确配置：

```bash
python start_servers.py --verify-setup
```

### 2. 安装测试依赖

如果需要安装或更新测试依赖：

```bash
python start_servers.py --install-deps
```

### 3. 运行测试

#### 运行所有测试
```bash
python start_servers.py --test all
```

#### 运行特定类型的测试
```bash
# 单元测试
python start_servers.py --test unit

# 集成测试
python start_servers.py --test integration

# 端到端测试
python start_servers.py --test e2e

# 生成覆盖率报告
python start_servers.py --test coverage
```

#### 监视模式运行测试
```bash
# 在监视模式下运行单元测试（文件变化时自动重新运行）
python start_servers.py --test unit --watch
```

## 服务器启动选项

### 基本启动
```bash
# 启动前后端服务器
python start_servers.py

# 仅启动后端
python start_servers.py --backend-only

# 仅启动前端
python start_servers.py --frontend-only

# 不自动打开浏览器
python start_servers.py --no-open
```

### 指定端口
```bash
# 指定后端端口
python start_servers.py --backend-port 8080

# 指定前端端口
python start_servers.py --frontend-port 3001

# 同时指定两个端口
python start_servers.py --backend-port 8080 --frontend-port 3001
```

## 测试结构

### 目录结构
```
front_end/tests/
├── unit/                    # 单元测试
│   ├── core/               # 核心模块测试
│   └── components/         # 组件测试
├── integration/            # 集成测试
├── e2e/                    # 端到端测试
├── fixtures/               # 测试数据
├── jest-setup.js          # Jest 设置
└── setup.js               # 通用测试设置
```

### 测试配置文件
- `jest.config.js` - Jest 配置
- `cypress.config.js` - Cypress 配置
- `scripts/verify-tests.js` - 测试验证脚本
- `scripts/run-tests.js` - 测试运行脚本

## 测试类型说明

### 单元测试 (Unit Tests)
- 测试单个函数或组件的功能
- 使用 Jest 测试框架
- 快速执行，提供即时反馈

### 集成测试 (Integration Tests)
- 测试多个组件之间的交互
- 验证数据流和组件协作
- 模拟真实的使用场景

### 端到端测试 (E2E Tests)
- 测试完整的用户工作流程
- 使用 Cypress 在真实浏览器中运行
- 验证整个应用的功能

## 测试覆盖率

### 生成覆盖率报告
```bash
python start_servers.py --test coverage
```

覆盖率报告将生成在 `front_end/coverage/` 目录中，包括：
- HTML 报告：在浏览器中查看详细覆盖率
- 控制台摘要：快速查看覆盖率统计

### 覆盖率目标
- 整体覆盖率：≥ 80%
- 核心模块：≥ 90%
- 组件测试：≥ 85%

## 持续集成

项目配置了 GitHub Actions 工作流程，在每次推送和拉取请求时自动运行测试：

- 运行所有测试套件
- 生成覆盖率报告
- 检查代码质量
- 验证构建过程

## 故障排除

### 常见问题

1. **测试依赖缺失**
   ```bash
   python start_servers.py --install-deps
   ```

2. **端口冲突**
   ```bash
   python start_servers.py --backend-port 8080 --frontend-port 3001
   ```

3. **测试设置问题**
   ```bash
   python start_servers.py --verify-setup
   ```

### 调试测试

1. **查看详细输出**
   - 测试运行时会显示实时输出
   - 检查控制台中的错误信息

2. **检查日志文件**
   - 启动日志保存在 `logs/` 目录
   - 包含详细的错误信息和调试信息

3. **使用监视模式**
   ```bash
   python start_servers.py --test unit --watch
   ```

## 最佳实践

### 编写测试
1. 遵循 AAA 模式（Arrange, Act, Assert）
2. 使用描述性的测试名称
3. 保持测试简单和专注
4. 使用适当的模拟和存根

### 运行测试
1. 在提交代码前运行所有测试
2. 使用监视模式进行开发
3. 定期检查覆盖率报告
4. 修复失败的测试

### 维护测试
1. 保持测试代码的整洁
2. 更新过时的测试
3. 添加新功能的测试
4. 重构时更新相关测试

## 帮助和支持

如果遇到问题或需要帮助：

1. 查看本指南的故障排除部分
2. 检查项目的 GitHub Issues
3. 运行 `python start_servers.py --help` 查看所有选项
4. 查看测试文档和配置文件

---

*最后更新：2025年7月20日*