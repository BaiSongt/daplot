@echo off
chcp 65001 >nul
echo ========================================
echo           DaPlot 应用启动脚本
echo ========================================
echo.

echo [1/4] 检查依赖环境...
where uv >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 uv 包管理器
    echo 请先安装 uv: https://docs.astral.sh/uv/getting-started/installation/
    pause
    exit /b 1
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Python
    echo 请先安装 Python 3.8+
    pause
    exit /b 1
)

echo ✅ 环境检查完成
echo.

echo [2/4] 检查端口占用情况...
netstat -ano | findstr :8001 >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  警告: 端口 8001 已被占用，将尝试使用端口 8002
    set BACKEND_PORT=8002
) else (
    echo ✅ 端口 8001 可用
    set BACKEND_PORT=8001
)

netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  警告: 端口 3000 已被占用，将尝试使用端口 3001
    set FRONTEND_PORT=3001
) else (
    echo ✅ 端口 3000 可用
    set FRONTEND_PORT=3000
)
echo.

echo [3/4] 启动后端服务器...
echo 后端服务器将在端口 %BACKEND_PORT% 启动
cd /d "%~dp0back_end"
start "DaPlot Backend" cmd /k "echo 后端服务器启动中... && uv run uvicorn main:app --host 0.0.0.0 --port %BACKEND_PORT%"
echo ✅ 后端服务器启动命令已执行
echo.

echo [4/4] 启动前端服务器...
echo 前端服务器将在端口 %FRONTEND_PORT% 启动
cd /d "%~dp0front_end"
start "DaPlot Frontend" cmd /k "echo 前端服务器启动中... && python -m http.server %FRONTEND_PORT%"
echo ✅ 前端服务器启动命令已执行
echo.

echo ========================================
echo           🎉 启动完成!
echo ========================================
echo.
echo 📊 前端访问地址: http://localhost:%FRONTEND_PORT%
echo 🔧 后端API地址:  http://localhost:%BACKEND_PORT%
echo.
echo 💡 提示:
echo   - 数据操作页面: http://localhost:%FRONTEND_PORT%/data.html
echo   - 可视化页面:   http://localhost:%FRONTEND_PORT%/visualization.html
echo   - API文档:      http://localhost:%BACKEND_PORT%/docs
echo.
echo ⚠️  注意: 如果使用了非默认端口，请手动更新前端代码中的API地址
echo.
echo 按任意键退出...
pause >nul