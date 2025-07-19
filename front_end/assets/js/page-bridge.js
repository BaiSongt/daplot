/**
 * 页面间数据共享桥接器
 * 使用URL参数和sessionStorage
 */
class PageBridge {
    constructor() {
        this.storageKey = 'daplot_page_data';
        this.apiBaseUrl = this.detectApiBaseUrl();
        this.init();
    }

    // 检测API基础地址
    detectApiBaseUrl() {
        // 从页面中查找API地址配置
        const scripts = document.querySelectorAll('script');
        for (let script of scripts) {
            const content = script.textContent || script.innerText;
            const match = content.match(/http:\/\/localhost:(\d+)\/api\//g);
            if (match && match.length > 0) {
                const url = match[0];
                return url.replace('/api/', '');
            }
        }
        
        // 默认地址
        return 'http://localhost:8001';
    }

    // 获取API地址
    getApiUrl(endpoint = '') {
        const baseUrl = this.apiBaseUrl.endsWith('/') ? this.apiBaseUrl.slice(0, -1) : this.apiBaseUrl;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
        return baseUrl + '/api' + cleanEndpoint;
    }

    // 设置API基础地址
    setApiBaseUrl(url) {
        this.apiBaseUrl = url;
        this.setSharedData('apiBaseUrl', url);
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