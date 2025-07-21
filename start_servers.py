#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DaPlot 应用启动脚本
自动启动前后端服务器，支持动态端口分配、依赖检查和健康监控

功能特性:
- 自动端口冲突检测和分配
- 前端依赖文件完整性检查
- 服务器健康状态监控
- 优雅的进程管理和清理
- 详细的启动日志和错误处理
"""

import os
import sys
import time
import socket
import subprocess
import threading
import signal
import logging
from pathlib import Path
from datetime import datetime
import json
import urllib.request
import urllib.error

def setup_logging():
    """设置日志记录"""
    log_dir = Path(__file__).parent / 'logs'
    log_dir.mkdir(exist_ok=True)

    log_file = log_dir / f'daplot_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

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

def check_frontend_dependencies(frontend_dir):
    """检查前端依赖文件是否存在"""
    required_files = [
        'assets/js/lib-loader.js',
        'assets/js/data-persistence.js',
        'assets/js/page-bridge.js'
    ]

    missing_files = []
    for file_name in required_files:
        file_path = frontend_dir / file_name
        print(f"检查文件: {file_path}")
        if not file_path.exists():
            missing_files.append(file_name)

    if missing_files:
        print(f"⚠️  缺少前端依赖文件: {', '.join(missing_files)}")
        return False

    print("✅ 前端依赖文件检查完成")
    return True

def check_server_health(port, endpoint='/', timeout=5):
    """检查服务器健康状态"""
    try:
        url = f'http://localhost:{port}{endpoint}'
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.status == 200
    except (urllib.error.URLError, socket.timeout):
        return False

def create_config_file(frontend_dir, backend_port, frontend_port):
    """创建运行时配置文件"""
    config = {
        'backend_port': backend_port,
        'frontend_port': frontend_port,
        'api_base_url': f'http://localhost:{backend_port}',
        'frontend_url': f'http://localhost:{frontend_port}',
        'startup_time': datetime.now().isoformat(),
        'version': '1.0.0'
    }

    config_file = frontend_dir / 'runtime-config.json'
    try:
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print(f"✅ 运行时配置已保存: {config_file}")
        return True
    except Exception as e:
        print(f"⚠️  保存配置文件失败: {e}")
        return False

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

def signal_handler(signum, frame):
    """信号处理器"""
    print("\n🛑 接收到停止信号，正在优雅关闭...")
    sys.exit(0)

def main():
    """主函数"""
    # 设置信号处理
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # 设置日志
    logger = setup_logging()
    logger.info("DaPlot 应用启动脚本开始执行")

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

    print("[2/5] 检查前端依赖...")
    if not check_frontend_dependencies(frontend_dir):
        print("❌ 前端依赖检查失败，但继续启动...")
        logger.warning("前端依赖文件不完整")

    # 创建运行时配置文件
    create_config_file(frontend_dir, backend_port, frontend_port)
    print()

    print("[3/5] 启动后端服务器...")
    backend_process = start_backend(backend_dir, backend_port)
    if not backend_process:
        logger.error("后端服务器启动失败")
        return 1

    # 等待后端服务器完全启动
    print("🔍 等待后端服务器就绪...")
    for i in range(30):  # 最多等待30秒
        if check_server_health(backend_port, '/docs'):
            print("✅ 后端服务器健康检查通过")
            logger.info(f"后端服务器在端口 {backend_port} 启动成功")
            break
        time.sleep(1)
    else:
        print("⚠️  后端服务器健康检查超时，但继续启动前端")
        logger.warning("后端服务器健康检查超时")
    print()

    print("[4/5] 启动前端服务器...")
    frontend_process = start_frontend(frontend_dir, frontend_port)
    if not frontend_process:
        logger.error("前端服务器启动失败")
        if backend_process:
            backend_process.terminate()
        return 1

    # 检查前端服务器健康状态
    print("🔍 等待前端服务器就绪...")
    for i in range(10):  # 最多等待10秒
        if check_server_health(frontend_port):
            print("✅ 前端服务器健康检查通过")
            logger.info(f"前端服务器在端口 {frontend_port} 启动成功")
            break
        time.sleep(1)
    else:
        print("⚠️  前端服务器健康检查超时")
        logger.warning("前端服务器健康检查超时")
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
    print(f"   - 首页:               http://localhost:{frontend_port}/index.html")
    print(f"   - 数据集成:           http://localhost:{frontend_port}/data_integrated.html")
    print(f"   - 数据可视化:         http://localhost:{frontend_port}/visualization.html")
    print(f"   - 数据预测:           http://localhost:{frontend_port}/prediction.html")
    print(f"   - API文档:            http://localhost:{backend_port}/docs")
    print()
    print("⚠️  按 Ctrl+C 停止所有服务器")
    print()

    try:
        # 定期健康检查
        health_check_interval = 30  # 30秒检查一次
        last_health_check = time.time()

        print("🔄 开始监控服务器状态...")
        logger.info("服务器监控开始")

        # 等待用户中断
        while True:
            time.sleep(1)
            current_time = time.time()

            # 检查进程是否还在运行
            if backend_process.poll() is not None:
                print("❌ 后端服务器意外停止")
                logger.error("后端服务器进程意外终止")
                break
            if frontend_process.poll() is not None:
                print("❌ 前端服务器意外停止")
                logger.error("前端服务器进程意外终止")
                break

            # 定期健康检查
            if current_time - last_health_check >= health_check_interval:
                backend_healthy = check_server_health(backend_port, '/docs')
                frontend_healthy = check_server_health(frontend_port)

                if not backend_healthy:
                    print("⚠️  后端服务器健康检查失败")
                    logger.warning("后端服务器健康检查失败")

                if not frontend_healthy:
                    print("⚠️  前端服务器健康检查失败")
                    logger.warning("前端服务器健康检查失败")

                if backend_healthy and frontend_healthy:
                    logger.info("服务器健康检查正常")

                last_health_check = current_time

    except KeyboardInterrupt:
        print("\n🛑 正在停止服务器...")
        logger.info("接收到用户中断信号")

    finally:
        # 清理进程
        cleanup_success = True

        # 在停止后端服务器之前，先清空文件管理器
        if backend_process and backend_process.poll() is None:
            try:
                print("🗑️ 正在清空文件管理器...")
                import requests
                clear_response = requests.delete(f"http://localhost:{backend_port}/api/files/clear", timeout=5)
                if clear_response.status_code == 200:
                    result = clear_response.json()
                    print(f"✅ 文件管理器已清空，删除了 {result.get('deleted_count', 0)} 个文件")
                    logger.info(f"文件管理器已清空，删除了 {result.get('deleted_count', 0)} 个文件")
                else:
                    print("⚠️  清空文件管理器失败，但继续关闭")
                    logger.warning("清空文件管理器失败")
            except Exception as e:
                print(f"⚠️  清空文件管理器时出错: {e}")
                logger.warning(f"清空文件管理器时出错: {e}")

        if backend_process and backend_process.poll() is None:
            try:
                backend_process.terminate()
                # 等待进程优雅退出
                backend_process.wait(timeout=5)
                print("✅ 后端服务器已停止")
                logger.info("后端服务器已正常停止")
            except subprocess.TimeoutExpired:
                backend_process.kill()
                print("⚠️  强制终止后端服务器")
                logger.warning("后端服务器被强制终止")
                cleanup_success = False
            except Exception as e:
                print(f"❌ 停止后端服务器时出错: {e}")
                logger.error(f"停止后端服务器时出错: {e}")
                cleanup_success = False

        if frontend_process and frontend_process.poll() is None:
            try:
                frontend_process.terminate()
                frontend_process.wait(timeout=5)
                print("✅ 前端服务器已停止")
                logger.info("前端服务器已正常停止")
            except subprocess.TimeoutExpired:
                frontend_process.kill()
                print("⚠️  强制终止前端服务器")
                logger.warning("前端服务器被强制终止")
                cleanup_success = False
            except Exception as e:
                print(f"❌ 停止前端服务器时出错: {e}")
                logger.error(f"停止前端服务器时出错: {e}")
                cleanup_success = False

        # 清理运行时配置文件
        config_file = frontend_dir / 'runtime-config.json'
        if config_file.exists():
            try:
                config_file.unlink()
                print("✅ 运行时配置文件已清理")
            except Exception as e:
                print(f"⚠️  清理配置文件失败: {e}")

        if cleanup_success:
            print("\n🎉 所有服务器已安全停止")
            logger.info("DaPlot 应用已安全关闭")
        else:
            print("\n⚠️  部分服务器停止时遇到问题，请检查日志")
            logger.warning("应用关闭过程中遇到问题")

    return 0 if cleanup_success else 1

if __name__ == '__main__':
    sys.exit(main())
