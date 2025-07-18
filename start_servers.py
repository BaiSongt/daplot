#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DaPlot 应用启动脚本
自动启动前后端服务器，并处理端口冲突和API地址更新
"""

import os
import sys
import time
import socket
import subprocess
import threading
from pathlib import Path
import re

def check_port_available(port):
    """检查端口是否可用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return True
        except OSError:
            return False

def find_available_port(start_port, max_attempts=10):
    """找到可用端口"""
    for i in range(max_attempts):
        port = start_port + i
        if check_port_available(port):
            return port
    return None

def update_frontend_api_urls(frontend_dir, backend_port):
    """更新前端代码中的API地址"""
    api_base_url = f'http://localhost:{backend_port}'

    # 需要更新的文件
    files_to_update = [
        # frontend_dir / 'data.html',
        frontend_dir / 'data_integrated.html',
        frontend_dir / 'visualization.html'
    ]

    for file_path in files_to_update:
        if not file_path.exists():
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 替换API URL
            # 匹配 http://localhost:数字/api/ 的模式
            pattern = r'http://localhost:\d+/api/'
            replacement = f'{api_base_url}/api/'
            updated_content = re.sub(pattern, replacement, content)

            if content != updated_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                print(f"✅ 已更新 {file_path.name} 中的API地址")

        except Exception as e:
            print(f"⚠️  更新 {file_path.name} 时出错: {e}")

def monitor_backend_output(process, port):
    """监控后端服务器输出的线程函数"""
    try:
        for line in process.stdout:
            line = line.strip()
            if line:
                # 添加前缀标识这是后端输出
                print(f"[后端] {line}")
    except Exception as e:
        print(f"[后端] 输出监控错误: {e}")

def start_backend(backend_dir, port):
    """启动后端服务器"""
    try:
        os.chdir(backend_dir)
        cmd = ['uv', 'run', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', str(port)]

        print(f"🔧 启动后端服务器: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )

        # 等待服务器启动的初始检查
        startup_timeout = 10  # 10秒超时
        start_time = time.time()
        server_started = False

        while time.time() - start_time < startup_timeout:
            if process.poll() is not None:
                print("❌ 后端服务器启动失败")
                return None

            # 检查是否有输出可读
            try:
                line = process.stdout.readline()
                if line:
                    line = line.strip()
                    print(f"[后端] {line}")
                    if 'Uvicorn running on' in line:
                        print(f"✅ 后端服务器已启动: http://localhost:{port}")
                        server_started = True
                        break
                    elif 'ERROR' in line or 'error' in line.lower():
                        print(f"❌ 后端启动错误: {line}")
                        return None
            except:
                pass

            time.sleep(0.1)

        if not server_started:
            print("❌ 后端服务器启动超时")
            process.terminate()
            return None

        # 启动输出监控线程
        output_thread = threading.Thread(
            target=monitor_backend_output,
            args=(process, port),
            daemon=True
        )
        output_thread.start()

        return process

    except FileNotFoundError:
        print("❌ 错误: 未找到 uv 命令，请确保已安装 uv 包管理器")
        return None
    except Exception as e:
        print(f"❌ 启动后端服务器时出错: {e}")
        return None

def start_frontend(frontend_dir, port):
    """启动前端服务器"""
    try:
        os.chdir(frontend_dir)
        cmd = [sys.executable, '-m', 'http.server', str(port)]

        print(f"🌐 启动前端服务器: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )

        # 等待服务器启动
        time.sleep(2)
        if process.poll() is None:  # 进程仍在运行
            print(f"✅ 前端服务器已启动: http://localhost:{port}")
            return process
        else:
            print("❌ 前端服务器启动失败")
            return None

    except Exception as e:
        print(f"❌ 启动前端服务器时出错: {e}")
        return None

def main():
    """主函数"""
    print("========================================")
    print("           DaPlot 应用启动脚本")
    print("========================================")
    print()

    # 获取项目根目录
    script_dir = Path(__file__).parent
    backend_dir = script_dir / 'back_end'
    frontend_dir = script_dir / 'front_end'

    # 检查目录是否存在
    if not backend_dir.exists():
        print(f"❌ 错误: 后端目录不存在 {backend_dir}")
        return 1

    if not frontend_dir.exists():
        print(f"❌ 错误: 前端目录不存在 {frontend_dir}")
        return 1

    print("[1/5] 检查端口可用性...")

    # 查找可用端口
    backend_port = find_available_port(8001)
    if not backend_port:
        print("❌ 错误: 无法找到可用的后端端口")
        return 1

    frontend_port = find_available_port(3000)
    if not frontend_port:
        print("❌ 错误: 无法找到可用的前端端口")
        return 1

    print(f"✅ 后端端口: {backend_port}")
    print(f"✅ 前端端口: {frontend_port}")
    print()

    print("[2/5] 更新前端API地址...")
    update_frontend_api_urls(frontend_dir, backend_port)
    print()

    print("[3/5] 启动后端服务器...")
    backend_process = start_backend(backend_dir, backend_port)
    if not backend_process:
        return 1
    print()

    print("[4/5] 启动前端服务器...")
    frontend_process = start_frontend(frontend_dir, frontend_port)
    if not frontend_process:
        if backend_process:
            backend_process.terminate()
        return 1
    print()

    print("[5/5] 启动完成!")
    print("========================================")
    print("           🎉 启动完成!")
    print("========================================")
    print()
    print(f"📊 前端访问地址: http://localhost:{frontend_port}")
    print(f"🔧 后端API地址:  http://localhost:{backend_port}")
    print()
    print("💡 快速访问:")
    print(f"   - 数据操作页面(原版): http://localhost:{frontend_port}/data.html")
    print(f"   - 数据操作页面(集成): http://localhost:{frontend_port}/data_integrated.html")
    print(f"   - 可视化页面:        http://localhost:{frontend_port}/visualization.html")
    print(f"   - API文档:           http://localhost:{backend_port}/docs")
    print()
    print("⚠️  按 Ctrl+C 停止所有服务器")
    print()

    try:
        # 等待用户中断
        while True:
            time.sleep(1)
            # 检查进程是否还在运行
            if backend_process.poll() is not None:
                print("❌ 后端服务器已停止")
                break
            if frontend_process.poll() is not None:
                print("❌ 前端服务器已停止")
                break

    except KeyboardInterrupt:
        print("\n🛑 正在停止服务器...")

    finally:
        # 清理进程
        if backend_process and backend_process.poll() is None:
            backend_process.terminate()
            print("✅ 后端服务器已停止")

        if frontend_process and frontend_process.poll() is None:
            frontend_process.terminate()
            print("✅ 前端服务器已停止")

    return 0

if __name__ == '__main__':
    sys.exit(main())
