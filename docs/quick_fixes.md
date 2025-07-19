# DaPlot 快速修复方案

## 立即可实施的优化措施

### 1. Plotly加载优化 (1-2小时实施)

#### 方案A：本地Plotly库部署

```bash
# 1. 下载Plotly到本地
cd front_end/assets
mkdir libs
cd libs

# 下载Plotly.js
curl -o plotly.min.js https://cdn.plot.ly/plotly-3.1.0.min.js

# 或者使用wget
wget https://cdn.plot.ly/plotly-3.1.0.min.js -O plotly.min.js
```

#### 修改HTML文件加载策略

**创建统一的库加载器 (front_end/assets/js/lib-loader.js)**

```javascript
/**
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
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            
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
});
```

### 2. 数据传输优化 (30分钟实施)

#### 创建简单的数据持久化 (front_end/assets/js/data-persistence.js)

```javascript
/**
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
});
```

### 3. 页面间数据共享优化 (20分钟实施)

#### 创建简单的页面通信机制 (front_end/assets/js/page-bridge.js)

```javascript
/**
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
};
```

## 快速部署步骤

### 步骤1：下载本地库文件 (5分钟)

```bash
# 进入前端目录
cd front_end

# 创建资源目录
mkdir -p assets/libs
mkdir -p assets/js

# 下载Plotly
curl -o assets/libs/plotly.min.js https://cdn.plot.ly/plotly-3.1.0.min.js

# 如果curl不可用，可以手动下载后放入assets/libs/目录
```

### 步骤2：创建工具脚本 (10分钟)

将上述三个JavaScript文件保存到 `front_end/assets/js/` 目录：
- `lib-loader.js`
- `data-persistence.js`
- `page-bridge.js`

### 步骤3：修改现有HTML文件 (15分钟)

在每个HTML文件的 `<head>` 部分添加：

```html
<!-- 在现有的Plotly script标签之前添加 -->
<script src="/assets/js/lib-loader.js"></script>
<script src="/assets/js/data-persistence.js"></script>
<script src="/assets/js/page-bridge.js"></script>

<!-- 移除或注释掉原有的Plotly CDN加载 -->
<!-- <script src="https://cdn.plot.ly/plotly-3.1.0.min.js"></script> -->
```

### 步骤4：更新页面逻辑 (20分钟)

在每个页面的JavaScript代码中：

```javascript
// 替换原有的Plotly使用方式
// 原来：直接使用Plotly
// 现在：确保Plotly已加载
async function createChart() {
    await window.libLoader.loadPlotly();
    // 然后使用Plotly
    Plotly.newPlot(...);
}

// 数据保存时同时保存到本地
function saveData(fileId, data) {
    // 原有的API调用
    fetch('/api/save', ...);
    
    // 新增：本地保存
    window.dataPersistence.saveFileData(fileId, data);
}

// 页面导航时传递数据
function goToVisualization(fileId) {
    window.navigateToVisualization(fileId);
}
```

## 预期效果

### 立即改善
1. **Plotly加载时间减少70-90%**（本地加载）
2. **页面切换等待时间几乎为0**
3. **数据不再因页面刷新丢失**
4. **离线环境下基本功能可用**

### 用户体验提升
1. **加载状态可视化**
2. **错误处理更友好**
3. **数据持久化保障**
4. **页面间导航流畅**

## 后续优化建议

1. **监控加载性能**：添加性能监控代码
2. **用户反馈收集**：了解实际使用效果
3. **逐步迁移**：向完整的模块化架构迁移
4. **功能扩展**：基于用户需求添加新功能

---

*这些快速修复可以立即实施，无需大规模重构，能够显著改善当前的用户体验问题。*