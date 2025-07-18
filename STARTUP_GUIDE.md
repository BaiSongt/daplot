# DaPlot 启动指南

## 快速启动

### 方法一：使用Python脚本（推荐）
```bash
python start_servers.py
```

### 方法二：使用批处理脚本（Windows）
```bash
start_servers.bat
```

### 方法三：手动启动
```bash
# 启动后端（在 back_end 目录）
cd back_end
uv run uvicorn main:app --host 0.0.0.0 --port 8001

# 启动前端（在 front_end 目录，新终端）
cd front_end
python -m http.server 3000
```

## 功能特性

### 自动化启动脚本功能
- ✅ **端口冲突检测**：自动检测端口占用，使用备用端口
- ✅ **API地址更新**：自动更新前端代码中的后端API地址
- ✅ **环境检查**：验证必要的依赖是否已安装
- ✅ **进程管理**：统一管理前后端进程，Ctrl+C 一键停止
- ✅ **状态监控**：实时监控服务器启动状态

### 默认访问地址
- **前端主页**：http://localhost:3000/index.html
- **数据操作**：http://localhost:3000/data_integrated.html
- **可视化绘图**：http://localhost:3000/visualization.html
- **后端API文档**：http://localhost:8001/docs

## 环境要求

### 必需依赖
- **Python 3.8+**
- **uv 包管理器**：[安装指南](https://docs.astral.sh/uv/getting-started/installation/)

### 安装uv（如果未安装）
```bash
# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# 使用pip安装
pip install uv
```

## 故障排除

### 常见问题

#### 1. 端口被占用
**现象**：启动时提示端口已被占用
**解决**：
- 脚本会自动使用备用端口
- 手动释放端口：`netstat -ano | findstr :8001` 查找进程ID，然后 `taskkill /PID <进程ID> /F`

#### 2. uv 命令未找到
**现象**：`'uv' is not recognized as an internal or external command`
**解决**：
1. 安装uv包管理器（见上方安装指南）
2. 重启终端
3. 验证安装：`uv --version`

#### 3. 文件上传失败
**现象**：前端显示文件上传失败
**解决**：
1. 确认后端服务器正在运行
2. 检查前端代码中的API地址是否正确
3. 查看浏览器开发者工具的网络选项卡，确认请求地址

#### 4. CORS 跨域错误
**现象**：浏览器控制台显示CORS错误
**解决**：
- 确保前端和后端在不同端口运行
- 后端已配置CORS中间件
- 使用启动脚本会自动处理API地址

#### 5. Excel文件解析失败
**现象**：上传Excel文件后显示解析错误
**解决**：
1. 确认文件格式为 .xlsx 或 .xls
2. 检查文件是否损坏
3. 确认文件包含数据且格式正确

### 调试模式

#### 查看详细日志
```bash
# 后端调试模式
cd back_end
uv run uvicorn main:app --host 0.0.0.0 --port 8001 --reload --log-level debug

# 前端查看请求
# 打开浏览器开发者工具 -> Network 选项卡
```

#### 测试API连接
```bash
# 测试后端健康状态
curl http://localhost:8001/

# 测试文件上传端点
curl -X POST http://localhost:8001/api/upload
```

## 开发模式

### 热重载开发
```bash
# 后端热重载
cd back_end
uv run uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# 前端文件修改后刷新浏览器即可
```

### 运行测试
```bash
# 运行后端测试
cd back_end
uv run pytest tests/ -v

# 运行特定测试
uv run pytest tests/test_api.py::test_upload_file -v
```

## 项目结构
```
daplot/
├── start_servers.py      # Python启动脚本（推荐）
├── start_servers.bat     # Windows批处理启动脚本
├── STARTUP_GUIDE.md      # 本文件
├── back_end/             # 后端代码
│   ├── main.py          # FastAPI应用
│   └── tests/           # 测试文件
├── front_end/            # 前端代码
│   ├── index.html       # 主页
│   ├── data.html        # 数据操作页面
│   └── visualization.html # 可视化页面
└── test_data/            # 测试数据
```

## 技术支持

如果遇到其他问题，请检查：
1. Python版本是否为3.8+
2. 网络连接是否正常
3. 防火墙是否阻止了端口访问
4. 项目文件是否完整

---

**提示**：首次使用建议使用 `python start_servers.py` 启动，该脚本提供了最完整的错误检查和自动修复功能。
