#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DaPlot 快速修复部署脚本
自动下载依赖、创建文件、修改配置
"""

import os
import sys
import urllib.request
import shutil
from pathlib import Path
import re

class QuickFixDeployer:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.front_end = self.project_root / "front_end"
        self.assets_dir = self.front_end / "assets"
        self.js_dir = self.assets_dir / "js"
        self.libs_dir = self.assets_dir / "libs"
        
    def create_directories(self):
        """创建必要的目录结构"""
        print("📁 创建目录结构...")
        
        directories = [self.assets_dir, self.js_dir, self.libs_dir]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            print(f"   ✅ {directory.relative_to(self.project_root)}")
    
    def download_plotly(self):
        """下载Plotly库到本地"""
        print("📥 下载Plotly库...")
        
        plotly_url = "https://cdn.plot.ly/plotly-3.1.0.min.js"
        plotly_path = self.libs_dir / "plotly.min.js"
        
        try:
            print(f"   正在下载: {plotly_url}")
            urllib.request.urlretrieve(plotly_url, plotly_path)
            print(f"   ✅ 下载完成: {plotly_path.relative_to(self.project_root)}")
            
            # 验证文件大小
            size = plotly_path.stat().st_size
            if size > 100000:  # 至少100KB
                print(f"   📊 文件大小: {size // 1024}KB")
            else:
                print(f"   ⚠️  文件可能不完整，大小仅: {size}字节")
                
        except Exception as e:
            print(f"   ❌ 下载失败: {e}")
            print("   💡 请手动下载Plotly并放入 assets/libs/ 目录")
    
    def create_lib_loader(self):
        """创建库加载器"""
        print("🔧 创建库加载器...")
        
        lib_loader_content = '''/**
 * 统一的库加载器
 * 优先本地，回退CDN
 */
class LibLoader {
    constructor() {
        this.loadedLibs = new Set();
        this.loadingPromises = new Map();
    }

    async loadPlotly() {
        if (this.loadedLibs.has('plotly')) {
            return Promise.resolve();
        }

        if (this.loadingPromises.has('plotly')) {
            return this.loadingPromises.get('plotly');
        }

        const promise = this._loadPlotlyInternal();
        this.loadingPromises.set('plotly', promise);
        return promise;
    }

    async _loadPlotlyInternal() {
        // 显示加载提示
        this.showLoadingMessage('正在加载图表库...');

        try {
            // 1. 尝试本地版本
            if (await this._loadScript('/assets/libs/plotly.min.js')) {
                this.loadedLibs.add('plotly');
                this.hideLoadingMessage();
                console.log('✅ Plotly本地版本加载成功');
                return;
            }

            // 2. 回退到CDN
            const cdnUrls = [
                'https://cdn.plot.ly/plotly-3.1.0.min.js',
                'https://unpkg.com/plotly.js@2.26.0/dist/plotly.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.26.0/plotly.min.js',
                'https://cdn.jsdelivr.net/npm/plotly.js@2.26.0/dist/plotly.min.js'
            ];

            for (let i = 0; i < cdnUrls.length; i++) {
                this.updateLoadingMessage(`尝试CDN ${i + 1}/${cdnUrls.length}...`);
                
                if (await this._loadScript(cdnUrls[i])) {
                    this.loadedLibs.add('plotly');
                    this.hideLoadingMessage();
                    console.log(`✅ Plotly CDN加载成功: ${cdnUrls[i]}`);
                    return;
                }
                
                // 等待1秒后尝试下一个CDN
                if (i < cdnUrls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            throw new Error('所有Plotly源都加载失败');

        } catch (error) {
            this.showErrorMessage('图表库加载失败，请检查网络连接后刷新页面');
            console.error('❌ Plotly加载失败:', error);
            throw error;
        }
    }

    _loadScript(src) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            
            // 设置超时
            const timeout = setTimeout(() => {
                script.remove();
                resolve(false);
            }, 10000); // 10秒超时
            
            script.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                resolve(false);
            };
            
            document.head.appendChild(script);
        });
    }

    showLoadingMessage(message) {
        let overlay = document.getElementById('lib-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'lib-loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${message}</div>
                </div>
            `;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(248, 249, 250, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                font-family: 'Segoe UI', sans-serif;
            `;
            
            const style = document.createElement('style');
            style.textContent = `
                .loading-content {
                    text-align: center;
                    padding: 40px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e9ecef;
                    border-top: 4px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                .loading-text {
                    color: #6c757d;
                    font-size: 14px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.loading-text').textContent = message;
        }
    }

    updateLoadingMessage(message) {
        const textEl = document.querySelector('#lib-loading-overlay .loading-text');
        if (textEl) {
            textEl.textContent = message;
        }
    }

    hideLoadingMessage() {
        const overlay = document.getElementById('lib-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showErrorMessage(message) {
        const overlay = document.getElementById('lib-loading-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div class="loading-content">
                    <div style="color: #dc3545; font-size: 24px; margin-bottom: 15px;">⚠️</div>
                    <div class="loading-text" style="color: #dc3545;">${message}</div>
                    <button onclick="location.reload()" style="
                        margin-top: 15px;
                        padding: 8px 16px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">刷新页面</button>
                </div>
            `;
        }
    }
}

// 全局实例
window.libLoader = new LibLoader();

// 页面加载完成后自动加载Plotly
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('visualization') || 
        window.location.pathname.includes('prediction')) {
        window.libLoader.loadPlotly();
    }
});'''
        
        lib_loader_path = self.js_dir / "lib-loader.js"
        lib_loader_path.write_text(lib_loader_content, encoding='utf-8')
        print(f"   ✅ {lib_loader_path.relative_to(self.project_root)}")
    
    def create_data_persistence(self):
        """创建数据持久化模块"""
        print("💾 创建数据持久化模块...")
        
        data_persistence_content = '''/**
 * 简单的数据持久化解决方案
 * 使用localStorage和sessionStorage
 */
class DataPersistence {
    constructor() {
        this.prefix = 'daplot_';
        this.maxSize = 5 * 1024 * 1024; // 5MB限制
    }

    // 保存文件数据
    saveFileData(fileId, data) {
        try {
            const key = this.prefix + 'file_' + fileId;
            const dataStr = JSON.stringify({
                data: data,
                timestamp: Date.now(),
                version: '1.0'
            });
            
            // 检查大小限制
            if (dataStr.length > this.maxSize) {
                console.warn('数据过大，无法保存到本地存储');
                return false;
            }
            
            localStorage.setItem(key, dataStr);
            
            // 更新文件列表
            this.updateFileList(fileId, {
                id: fileId,
                timestamp: Date.now(),
                size: dataStr.length
            });
            
            return true;
        } catch (error) {
            console.error('保存文件数据失败:', error);
            return false;
        }
    }

    // 获取文件数据
    getFileData(fileId) {
        try {
            const key = this.prefix + 'file_' + fileId;
            const dataStr = localStorage.getItem(key);
            
            if (!dataStr) {
                return null;
            }
            
            const parsed = JSON.parse(dataStr);
            return parsed.data;
        } catch (error) {
            console.error('获取文件数据失败:', error);
            return null;
        }
    }

    // 删除文件数据
    deleteFileData(fileId) {
        try {
            const key = this.prefix + 'file_' + fileId;
            localStorage.removeItem(key);
            
            // 更新文件列表
            const fileList = this.getFileList();
            const updatedList = fileList.filter(f => f.id !== fileId);
            localStorage.setItem(this.prefix + 'file_list', JSON.stringify(updatedList));
            
            return true;
        } catch (error) {
            console.error('删除文件数据失败:', error);
            return false;
        }
    }

    // 获取文件列表
    getFileList() {
        try {
            const listStr = localStorage.getItem(this.prefix + 'file_list');
            return listStr ? JSON.parse(listStr) : [];
        } catch (error) {
            console.error('获取文件列表失败:', error);
            return [];
        }
    }

    // 更新文件列表
    updateFileList(fileId, fileInfo) {
        try {
            const fileList = this.getFileList();
            const existingIndex = fileList.findIndex(f => f.id === fileId);
            
            if (existingIndex >= 0) {
                fileList[existingIndex] = fileInfo;
            } else {
                fileList.push(fileInfo);
            }
            
            localStorage.setItem(this.prefix + 'file_list', JSON.stringify(fileList));
        } catch (error) {
            console.error('更新文件列表失败:', error);
        }
    }

    // 清理过期数据
    cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 默认7天
        try {
            const fileList = this.getFileList();
            const now = Date.now();
            const validFiles = [];
            
            fileList.forEach(file => {
                if (now - file.timestamp < maxAge) {
                    validFiles.push(file);
                } else {
                    this.deleteFileData(file.id);
                }
            });
            
            localStorage.setItem(this.prefix + 'file_list', JSON.stringify(validFiles));
        } catch (error) {
            console.error('清理数据失败:', error);
        }
    }

    // 获取存储使用情况
    getStorageInfo() {
        try {
            let totalSize = 0;
            const fileList = this.getFileList();
            
            fileList.forEach(file => {
                totalSize += file.size || 0;
            });
            
            return {
                fileCount: fileList.length,
                totalSize: totalSize,
                maxSize: this.maxSize,
                usage: (totalSize / this.maxSize * 100).toFixed(2) + '%'
            };
        } catch (error) {
            console.error('获取存储信息失败:', error);
            return null;
        }
    }
}

// 全局实例
window.dataPersistence = new DataPersistence();

// 页面卸载时清理过期数据
window.addEventListener('beforeunload', () => {
    window.dataPersistence.cleanup();
});'''
        
        data_persistence_path = self.js_dir / "data-persistence.js"
        data_persistence_path.write_text(data_persistence_content, encoding='utf-8')
        print(f"   ✅ {data_persistence_path.relative_to(self.project_root)}")
    
    def create_page_bridge(self):
        """创建页面桥接器"""
        print("🌉 创建页面桥接器...")
        
        page_bridge_content = '''/**
 * 页面间数据共享桥接器
 * 使用URL参数和sessionStorage
 */
class PageBridge {
    constructor() {
        this.storageKey = 'daplot_page_data';
        this.init();
    }

    init() {
        // 从URL参数恢复数据
        this.restoreFromURL();
        
        // 监听存储变化
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                this.handleDataChange(e.newValue);
            }
        });
    }

    // 设置共享数据
    setSharedData(key, value) {
        try {
            const currentData = this.getSharedData();
            currentData[key] = value;
            
            sessionStorage.setItem(this.storageKey, JSON.stringify(currentData));
            
            // 触发自定义事件
            window.dispatchEvent(new CustomEvent('sharedDataChanged', {
                detail: { key, value }
            }));
            
            return true;
        } catch (error) {
            console.error('设置共享数据失败:', error);
            return false;
        }
    }

    // 获取共享数据
    getSharedData(key) {
        try {
            const dataStr = sessionStorage.getItem(this.storageKey);
            const data = dataStr ? JSON.parse(dataStr) : {};
            
            return key ? data[key] : data;
        } catch (error) {
            console.error('获取共享数据失败:', error);
            return key ? null : {};
        }
    }

    // 导航到页面并传递数据
    navigateWithData(url, data = {}) {
        // 保存数据到sessionStorage
        Object.keys(data).forEach(key => {
            this.setSharedData(key, data[key]);
        });
        
        // 构建URL参数
        const urlObj = new URL(url, window.location.origin);
        Object.keys(data).forEach(key => {
            if (typeof data[key] === 'string' || typeof data[key] === 'number') {
                urlObj.searchParams.set(key, data[key]);
            }
        });
        
        // 导航
        window.location.href = urlObj.toString();
    }

    // 从URL恢复数据
    restoreFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = this.getSharedData();
        
        urlParams.forEach((value, key) => {
            sharedData[key] = value;
        });
        
        if (Object.keys(sharedData).length > 0) {
            sessionStorage.setItem(this.storageKey, JSON.stringify(sharedData));
        }
    }

    // 处理数据变化
    handleDataChange(newDataStr) {
        try {
            const newData = newDataStr ? JSON.parse(newDataStr) : {};
            
            // 触发页面更新
            window.dispatchEvent(new CustomEvent('pageDataUpdated', {
                detail: newData
            }));
        } catch (error) {
            console.error('处理数据变化失败:', error);
        }
    }

    // 清除共享数据
    clearSharedData(key) {
        if (key) {
            const data = this.getSharedData();
            delete data[key];
            sessionStorage.setItem(this.storageKey, JSON.stringify(data));
        } else {
            sessionStorage.removeItem(this.storageKey);
        }
    }
}

// 全局实例
window.pageBridge = new PageBridge();

// 便捷的导航函数
window.navigateToVisualization = (fileId) => {
    window.pageBridge.navigateWithData('/visualization.html', {
        currentFileId: fileId,
        source: 'navigation'
    });
};

window.navigateToPrediction = (fileId) => {
    window.pageBridge.navigateWithData('/prediction.html', {
        currentFileId: fileId,
        source: 'navigation'
    });
};

window.navigateToDataEdit = (fileId) => {
    window.pageBridge.navigateWithData('/data_integrated.html', {
        currentFileId: fileId,
        source: 'navigation'
    });
};'''
        
        page_bridge_path = self.js_dir / "page-bridge.js"
        page_bridge_path.write_text(page_bridge_content, encoding='utf-8')
        print(f"   ✅ {page_bridge_path.relative_to(self.project_root)}")
    
    def backup_html_files(self):
        """备份原始HTML文件"""
        print("💾 备份原始HTML文件...")
        
        html_files = ['index.html', 'visualization.html', 'prediction.html', 'data_integrated.html']
        backup_dir = self.front_end / "backup"
        backup_dir.mkdir(exist_ok=True)
        
        for html_file in html_files:
            source = self.front_end / html_file
            if source.exists():
                backup = backup_dir / f"{html_file}.backup"
                shutil.copy2(source, backup)
                print(f"   ✅ {html_file} -> backup/{html_file}.backup")
    
    def update_html_files(self):
        """更新HTML文件以使用新的脚本"""
        print("🔄 更新HTML文件...")
        
        html_files = ['visualization.html', 'prediction.html', 'data_integrated.html']
        
        for html_file in html_files:
            file_path = self.front_end / html_file
            if not file_path.exists():
                print(f"   ⚠️  文件不存在: {html_file}")
                continue
                
            try:
                content = file_path.read_text(encoding='utf-8')
                
                # 在head标签中添加新的脚本
                head_scripts = '''    <!-- DaPlot 快速修复脚本 -->
    <script src="/assets/js/lib-loader.js"></script>
    <script src="/assets/js/data-persistence.js"></script>
    <script src="/assets/js/page-bridge.js"></script>
'''
                
                # 查找head结束标签并插入脚本
                if '</head>' in content:
                    content = content.replace('</head>', head_scripts + '</head>')
                    
                    # 注释掉原有的Plotly CDN加载
                    plotly_patterns = [
                        r'<script[^>]*src=["\']https://cdn\.plot\.ly/[^>]*></script>',
                        r'<script[^>]*src=["\']https://unpkg\.com/plotly[^>]*></script>',
                        r'<script[^>]*src=["\']https://cdnjs\.cloudflare\.com/ajax/libs/plotly[^>]*></script>'
                    ]
                    
                    for pattern in plotly_patterns:
                        content = re.sub(pattern, lambda m: f'<!-- {m.group(0)} -->', content, flags=re.IGNORECASE)
                    
                    file_path.write_text(content, encoding='utf-8')
                    print(f"   ✅ {html_file}")
                else:
                    print(f"   ⚠️  未找到</head>标签: {html_file}")
                    
            except Exception as e:
                print(f"   ❌ 更新失败 {html_file}: {e}")
    
    def create_test_page(self):
        """创建测试页面"""
        print("🧪 创建测试页面...")
        
        test_content = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DaPlot 快速修复测试</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .test-section {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #dee2e6;
            border-radius: 5px;
        }
        .test-section h3 {
            margin-top: 0;
            color: #495057;
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .status.success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .status.info {
            background-color: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background-color: #0056b3;
        }
        #chart {
            width: 100%;
            height: 400px;
            border: 1px solid #dee2e6;
            margin: 10px 0;
        }
    </style>
    
    <!-- 加载快速修复脚本 -->
    <script src="/assets/js/lib-loader.js"></script>
    <script src="/assets/js/data-persistence.js"></script>
    <script src="/assets/js/page-bridge.js"></script>
</head>
<body>
    <div class="container">
        <h1>🚀 DaPlot 快速修复测试</h1>
        
        <div class="test-section">
            <h3>1. Plotly 加载测试</h3>
            <div id="plotly-status" class="status info">等待测试...</div>
            <button onclick="testPlotlyLoading()">测试 Plotly 加载</button>
            <div id="chart"></div>
        </div>
        
        <div class="test-section">
            <h3>2. 数据持久化测试</h3>
            <div id="persistence-status" class="status info">等待测试...</div>
            <button onclick="testDataPersistence()">测试数据保存</button>
            <button onclick="testDataRetrieval()">测试数据读取</button>
            <button onclick="clearTestData()">清除测试数据</button>
        </div>
        
        <div class="test-section">
            <h3>3. 页面桥接测试</h3>
            <div id="bridge-status" class="status info">等待测试...</div>
            <button onclick="testPageBridge()">测试页面数据共享</button>
            <button onclick="testNavigation()">测试页面导航</button>
        </div>
        
        <div class="test-section">
            <h3>4. 存储信息</h3>
            <div id="storage-info" class="status info">点击刷新查看存储信息</div>
            <button onclick="showStorageInfo()">刷新存储信息</button>
        </div>
    </div>
    
    <script>
        // Plotly 加载测试
        async function testPlotlyLoading() {
            const statusEl = document.getElementById('plotly-status');
            statusEl.className = 'status info';
            statusEl.textContent = '正在测试 Plotly 加载...';
            
            try {
                const startTime = Date.now();
                await window.libLoader.loadPlotly();
                const loadTime = Date.now() - startTime;
                
                // 创建测试图表
                const data = [{
                    x: [1, 2, 3, 4, 5],
                    y: [2, 4, 3, 5, 6],
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: '测试数据'
                }];
                
                const layout = {
                    title: 'Plotly 加载成功测试图表',
                    xaxis: { title: 'X 轴' },
                    yaxis: { title: 'Y 轴' }
                };
                
                Plotly.newPlot('chart', data, layout);
                
                statusEl.className = 'status success';
                statusEl.textContent = `✅ Plotly 加载成功！耗时: ${loadTime}ms`;
                
            } catch (error) {
                statusEl.className = 'status error';
                statusEl.textContent = `❌ Plotly 加载失败: ${error.message}`;
            }
        }
        
        // 数据持久化测试
        function testDataPersistence() {
            const statusEl = document.getElementById('persistence-status');
            
            try {
                const testData = {
                    id: 'test_file_' + Date.now(),
                    name: '测试文件',
                    data: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
                    timestamp: new Date().toISOString()
                };
                
                const success = window.dataPersistence.saveFileData(testData.id, testData);
                
                if (success) {
                    statusEl.className = 'status success';
                    statusEl.textContent = `✅ 数据保存成功！文件ID: ${testData.id}`;
                } else {
                    statusEl.className = 'status error';
                    statusEl.textContent = '❌ 数据保存失败';
                }
                
            } catch (error) {
                statusEl.className = 'status error';
                statusEl.textContent = `❌ 数据保存异常: ${error.message}`;
            }
        }
        
        function testDataRetrieval() {
            const statusEl = document.getElementById('persistence-status');
            
            try {
                const fileList = window.dataPersistence.getFileList();
                
                if (fileList.length > 0) {
                    const latestFile = fileList[fileList.length - 1];
                    const data = window.dataPersistence.getFileData(latestFile.id);
                    
                    if (data) {
                        statusEl.className = 'status success';
                        statusEl.textContent = `✅ 数据读取成功！找到 ${fileList.length} 个文件，最新文件: ${data.name}`;
                    } else {
                        statusEl.className = 'status error';
                        statusEl.textContent = '❌ 数据读取失败';
                    }
                } else {
                    statusEl.className = 'status info';
                    statusEl.textContent = '📝 没有找到保存的数据，请先测试数据保存';
                }
                
            } catch (error) {
                statusEl.className = 'status error';
                statusEl.textContent = `❌ 数据读取异常: ${error.message}`;
            }
        }
        
        function clearTestData() {
            const statusEl = document.getElementById('persistence-status');
            
            try {
                const fileList = window.dataPersistence.getFileList();
                let deletedCount = 0;
                
                fileList.forEach(file => {
                    if (file.id.startsWith('test_file_')) {
                        window.dataPersistence.deleteFileData(file.id);
                        deletedCount++;
                    }
                });
                
                statusEl.className = 'status success';
                statusEl.textContent = `✅ 清除完成！删除了 ${deletedCount} 个测试文件`;
                
            } catch (error) {
                statusEl.className = 'status error';
                statusEl.textContent = `❌ 清除失败: ${error.message}`;
            }
        }
        
        // 页面桥接测试
        function testPageBridge() {
            const statusEl = document.getElementById('bridge-status');
            
            try {
                const testData = {
                    testKey: 'test_value_' + Date.now(),
                    currentPage: 'test_page',
                    timestamp: new Date().toISOString()
                };
                
                window.pageBridge.setSharedData('testData', testData);
                const retrieved = window.pageBridge.getSharedData('testData');
                
                if (retrieved && retrieved.testKey === testData.testKey) {
                    statusEl.className = 'status success';
                    statusEl.textContent = `✅ 页面数据共享测试成功！数据: ${retrieved.testKey}`;
                } else {
                    statusEl.className = 'status error';
                    statusEl.textContent = '❌ 页面数据共享测试失败';
                }
                
            } catch (error) {
                statusEl.className = 'status error';
                statusEl.textContent = `❌ 页面桥接异常: ${error.message}`;
            }
        }
        
        function testNavigation() {
            const statusEl = document.getElementById('bridge-status');
            
            try {
                // 模拟导航（不实际跳转）
                const testFileId = 'test_file_123';
                window.pageBridge.setSharedData('currentFileId', testFileId);
                window.pageBridge.setSharedData('source', 'test_navigation');
                
                statusEl.className = 'status success';
                statusEl.textContent = `✅ 导航数据设置成功！文件ID: ${testFileId}`;
                
            } catch (error) {
                statusEl.className = 'status error';
                statusEl.textContent = `❌ 导航测试异常: ${error.message}`;
            }
        }
        
        // 显示存储信息
        function showStorageInfo() {
            const statusEl = document.getElementById('storage-info');
            
            try {
                const storageInfo = window.dataPersistence.getStorageInfo();
                const sharedData = window.pageBridge.getSharedData();
                
                statusEl.className = 'status info';
                statusEl.innerHTML = `
                    <strong>本地存储信息:</strong><br>
                    • 文件数量: ${storageInfo.fileCount}<br>
                    • 存储大小: ${(storageInfo.totalSize / 1024).toFixed(2)} KB<br>
                    • 使用率: ${storageInfo.usage}<br>
                    <strong>共享数据:</strong><br>
                    • 数据项: ${Object.keys(sharedData).length}<br>
                    • 内容: ${JSON.stringify(sharedData, null, 2).substring(0, 100)}...
                `;
                
            } catch (error) {
                statusEl.className = 'status error';
                statusEl.textContent = `❌ 获取存储信息失败: ${error.message}`;
            }
        }
        
        // 页面加载完成后自动运行基础测试
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🧪 DaPlot 快速修复测试页面已加载');
            
            // 检查脚本是否正确加载
            if (window.libLoader && window.dataPersistence && window.pageBridge) {
                console.log('✅ 所有快速修复脚本已正确加载');
            } else {
                console.error('❌ 部分快速修复脚本加载失败');
            }
        });
    </script>
</body>
</html>'''
        
        test_path = self.front_end / "test_fixes.html"
        test_path.write_text(test_content, encoding='utf-8')
        print(f"   ✅ {test_path.relative_to(self.project_root)}")
    
    def deploy(self):
        """执行完整部署"""
        print("🚀 开始部署 DaPlot 快速修复方案...\n")
        
        try:
            self.create_directories()
            self.download_plotly()
            self.create_lib_loader()
            self.create_data_persistence()
            self.create_page_bridge()
            self.backup_html_files()
            self.update_html_files()
            self.create_test_page()
            
            print("\n🎉 部署完成！")
            print("\n📋 后续步骤:")
            print("   1. 启动服务器: python start_servers.py")
            print("   2. 访问测试页面: http://localhost:端口/test_fixes.html")
            print("   3. 运行所有测试确保功能正常")
            print("   4. 如有问题，可从 backup/ 目录恢复原始文件")
            
        except Exception as e:
            print(f"\n❌ 部署失败: {e}")
            print("请检查错误信息并重试")
            return False
            
        return True

def main():
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.getcwd()
    
    print(f"项目根目录: {project_root}")
    
    deployer = QuickFixDeployer(project_root)
    success = deployer.deploy()
    
    if success:
        print("\n✨ 快速修复方案部署成功！")
        sys.exit(0)
    else:
        print("\n💥 部署失败，请检查错误信息")
        sys.exit(1)

if __name__ == "__main__":
    main()