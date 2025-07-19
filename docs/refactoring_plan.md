# DaPlot 模块化重构实施方案

## 新架构目录结构

```
daplot/
├── front_end/
│   ├── src/
│   │   ├── core/                    # 核心模块
│   │   │   ├── AppState.js          # 全局状态管理
│   │   │   ├── DataManager.js       # 数据管理器
│   │   │   ├── ChartEngine.js       # 图表引擎
│   │   │   ├── ApiClient.js         # API客户端
│   │   │   └── EventBus.js          # 事件总线
│   │   ├── components/              # 共享组件
│   │   │   ├── FileUploader.js      # 文件上传组件
│   │   │   ├── DataFilter.js        # 数据筛选组件
│   │   │   ├── ChartConfig.js       # 图表配置组件
│   │   │   ├── LoadingSpinner.js    # 加载状态组件
│   │   │   └── ErrorBoundary.js     # 错误边界组件
│   │   ├── pages/                   # 页面组件
│   │   │   ├── HomePage.js          # 主页组件
│   │   │   ├── VisualizationPage.js # 可视化页面
│   │   │   ├── PredictionPage.js    # 预测页面
│   │   │   └── DataEditPage.js      # 数据编辑页面
│   │   ├── utils/                   # 工具函数
│   │   │   ├── storage.js           # 本地存储工具
│   │   │   ├── validation.js        # 数据验证
│   │   │   ├── formatters.js        # 数据格式化
│   │   │   └── constants.js         # 常量定义
│   │   └── assets/                  # 静态资源
│   │       ├── libs/                # 本地库文件
│   │       │   ├── plotly.min.js    # 本地Plotly
│   │       │   └── luckysheet/      # 本地Luckysheet
│   │       ├── css/                 # 样式文件
│   │       └── images/              # 图片资源
│   ├── index.html                   # 主入口
│   ├── visualization.html           # 可视化页面
│   ├── prediction.html              # 预测页面
│   ├── data_edit.html              # 数据编辑页面
│   └── sw.js                       # Service Worker
├── back_end/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI应用入口
│   │   ├── api/                     # API路由
│   │   │   ├── __init__.py
│   │   │   ├── files.py             # 文件管理API
│   │   │   ├── data.py              # 数据处理API
│   │   │   ├── visualization.py     # 可视化API
│   │   │   └── prediction.py        # 预测API
│   │   ├── services/                # 业务逻辑层
│   │   │   ├── __init__.py
│   │   │   ├── file_service.py      # 文件服务
│   │   │   ├── data_service.py      # 数据服务
│   │   │   ├── prediction_service.py # 预测服务
│   │   │   └── cache_service.py     # 缓存服务
│   │   ├── models/                  # 数据模型
│   │   │   ├── __init__.py
│   │   │   ├── database.py          # 数据库配置
│   │   │   ├── file_model.py        # 文件模型
│   │   │   └── data_model.py        # 数据模型
│   │   ├── utils/                   # 工具函数
│   │   │   ├── __init__.py
│   │   │   ├── validators.py        # 数据验证
│   │   │   ├── formatters.py        # 数据格式化
│   │   │   └── ml_utils.py          # 机器学习工具
│   │   └── config/                  # 配置文件
│   │       ├── __init__.py
│   │       ├── settings.py          # 应用配置
│   │       └── database.py          # 数据库配置
│   └── requirements.txt
├── data/                            # 数据存储目录
│   ├── uploads/                     # 上传文件
│   ├── cache/                       # 缓存文件
│   └── database/                    # 数据库文件
├── docker-compose.yml               # Docker配置
├── nginx.conf                       # Nginx配置
└── README.md
```

## 核心模块设计

### 1. 全局状态管理 (AppState.js)

```javascript
/**
 * 全局应用状态管理
 * 使用观察者模式实现状态变更通知
 */
class AppState {
    constructor() {
        this.state = {
            currentPage: 'home',
            files: new Map(),           // 文件列表
            currentFileId: null,        // 当前选中文件
            loading: false,             // 全局加载状态
            error: null,                // 错误信息
            user: null,                 // 用户信息
            settings: {                 // 应用设置
                theme: 'light',
                language: 'zh-CN',
                autoSave: true
            }
        };
        this.listeners = new Map();
        this.loadFromStorage();
    }

    // 状态订阅
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // 返回取消订阅函数
        return () => {
            this.listeners.get(key)?.delete(callback);
        };
    }

    // 状态更新
    setState(updates) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        // 通知订阅者
        Object.keys(updates).forEach(key => {
            this.listeners.get(key)?.forEach(callback => {
                callback(this.state[key], oldState[key]);
            });
        });
        
        // 持久化到本地存储
        this.saveToStorage();
    }

    // 获取状态
    getState(key) {
        return key ? this.state[key] : this.state;
    }

    // 从本地存储加载
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('daplot_state');
            if (saved) {
                const parsedState = JSON.parse(saved);
                this.state = { ...this.state, ...parsedState };
            }
        } catch (error) {
            console.warn('Failed to load state from storage:', error);
        }
    }

    // 保存到本地存储
    saveToStorage() {
        try {
            const stateToSave = {
                settings: this.state.settings,
                currentFileId: this.state.currentFileId
            };
            localStorage.setItem('daplot_state', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to save state to storage:', error);
        }
    }
}

// 全局实例
window.appState = new AppState();
```

### 2. 数据管理器 (DataManager.js)

```javascript
/**
 * 数据管理器
 * 负责数据的缓存、同步和持久化
 */
class DataManager {
    constructor() {
        this.cache = new Map();
        this.apiClient = new ApiClient();
        this.storage = new LocalStorage();
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
        
        this.initEventListeners();
    }

    // 初始化事件监听
    initEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processSyncQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // 获取文件数据
    async getFileData(fileId, useCache = true) {
        // 优先从缓存获取
        if (useCache && this.cache.has(fileId)) {
            return this.cache.get(fileId);
        }

        try {
            // 在线模式：从API获取
            if (this.isOnline) {
                const data = await this.apiClient.getFileData(fileId);
                this.cache.set(fileId, data);
                await this.storage.saveFileData(fileId, data);
                return data;
            }
            // 离线模式：从本地存储获取
            else {
                const data = await this.storage.getFileData(fileId);
                if (data) {
                    this.cache.set(fileId, data);
                    return data;
                }
                throw new Error('数据不可用（离线模式）');
            }
        } catch (error) {
            console.error('获取文件数据失败:', error);
            throw error;
        }
    }

    // 保存文件数据
    async saveFileData(fileId, data) {
        try {
            // 更新缓存
            this.cache.set(fileId, data);
            
            // 在线模式：同步到服务器
            if (this.isOnline) {
                await this.apiClient.saveFileData(fileId, data);
                await this.storage.saveFileData(fileId, data);
            }
            // 离线模式：加入同步队列
            else {
                await this.storage.saveFileData(fileId, data);
                this.syncQueue.push({ action: 'save', fileId, data });
            }
            
            return true;
        } catch (error) {
            console.error('保存文件数据失败:', error);
            throw error;
        }
    }

    // 处理同步队列
    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) {
            return;
        }

        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const item of queue) {
            try {
                switch (item.action) {
                    case 'save':
                        await this.apiClient.saveFileData(item.fileId, item.data);
                        break;
                    case 'delete':
                        await this.apiClient.deleteFile(item.fileId);
                        break;
                }
            } catch (error) {
                console.error('同步失败:', error);
                // 重新加入队列
                this.syncQueue.push(item);
            }
        }
    }

    // 清除缓存
    clearCache(fileId) {
        if (fileId) {
            this.cache.delete(fileId);
        } else {
            this.cache.clear();
        }
    }
}

// 全局实例
window.dataManager = new DataManager();
```

### 3. 图表引擎 (ChartEngine.js)

```javascript
/**
 * 图表引擎
 * 统一管理图表的创建、更新和销毁
 */
class ChartEngine {
    constructor() {
        this.charts = new Map();
        this.plotlyLoaded = false;
        this.loadingPromise = null;
        this.defaultConfig = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d']
        };
    }

    // 确保Plotly已加载
    async ensurePlotlyLoaded() {
        if (this.plotlyLoaded) {
            return true;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this.loadPlotly();
        return this.loadingPromise;
    }

    // 加载Plotly库
    async loadPlotly() {
        try {
            // 优先使用本地版本
            if (await this.loadLocalPlotly()) {
                this.plotlyLoaded = true;
                return true;
            }

            // 回退到CDN
            if (await this.loadCDNPlotly()) {
                this.plotlyLoaded = true;
                return true;
            }

            throw new Error('无法加载Plotly库');
        } catch (error) {
            console.error('Plotly加载失败:', error);
            throw error;
        }
    }

    // 加载本地Plotly
    async loadLocalPlotly() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = '/assets/libs/plotly.min.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    }

    // 加载CDN Plotly
    async loadCDNPlotly() {
        const cdnUrls = [
            'https://cdn.plot.ly/plotly-3.1.0.min.js',
            'https://unpkg.com/plotly.js@2.26.0/dist/plotly.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.26.0/plotly.min.js'
        ];

        for (const url of cdnUrls) {
            try {
                const loaded = await new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = url;
                    script.onload = () => resolve(true);
                    script.onerror = () => resolve(false);
                    document.head.appendChild(script);
                });

                if (loaded) {
                    return true;
                }
            } catch (error) {
                console.warn(`CDN加载失败: ${url}`);
            }
        }

        return false;
    }

    // 创建图表
    async createChart(containerId, data, layout = {}, config = {}) {
        await this.ensurePlotlyLoaded();

        const finalLayout = { ...layout };
        const finalConfig = { ...this.defaultConfig, ...config };

        try {
            await Plotly.newPlot(containerId, data, finalLayout, finalConfig);
            this.charts.set(containerId, { data, layout: finalLayout, config: finalConfig });
            return true;
        } catch (error) {
            console.error('图表创建失败:', error);
            throw error;
        }
    }

    // 更新图表
    async updateChart(containerId, data, layout = {}) {
        if (!this.charts.has(containerId)) {
            throw new Error(`图表不存在: ${containerId}`);
        }

        try {
            await Plotly.react(containerId, data, layout);
            const chart = this.charts.get(containerId);
            chart.data = data;
            chart.layout = { ...chart.layout, ...layout };
            return true;
        } catch (error) {
            console.error('图表更新失败:', error);
            throw error;
        }
    }

    // 销毁图表
    destroyChart(containerId) {
        if (this.charts.has(containerId)) {
            try {
                Plotly.purge(containerId);
                this.charts.delete(containerId);
            } catch (error) {
                console.error('图表销毁失败:', error);
            }
        }
    }

    // 销毁所有图表
    destroyAllCharts() {
        for (const containerId of this.charts.keys()) {
            this.destroyChart(containerId);
        }
    }
}

// 全局实例
window.chartEngine = new ChartEngine();
```

## 实施步骤

### 第一阶段：基础设施准备 (3-5天)

1. **创建新的目录结构**
2. **下载并集成本地Plotly库**
3. **实现基础的状态管理系统**
4. **创建API客户端封装**

### 第二阶段：核心模块开发 (5-7天)

1. **开发数据管理器**
2. **实现图表引擎**
3. **创建共享组件库**
4. **实现本地存储系统**

### 第三阶段：页面重构 (7-10天)

1. **重构可视化页面**
2. **重构预测页面**
3. **重构数据编辑页面**
4. **实现页面间导航**

### 第四阶段：后端优化 (5-7天)

1. **实现数据库持久化**
2. **添加缓存层**
3. **优化API性能**
4. **实现文件管理服务**

### 第五阶段：测试和优化 (3-5天)

1. **功能测试**
2. **性能测试**
3. **兼容性测试**
4. **用户体验优化**

## 迁移策略

### 渐进式迁移

1. **保持现有页面可用**
2. **逐个页面迁移到新架构**
3. **提供新旧版本切换选项**
4. **完成迁移后移除旧代码**

### 数据兼容性

1. **实现数据格式转换器**
2. **提供数据导入导出工具**
3. **保证向后兼容性**
4. **提供数据迁移指南**

### 用户体验保障

1. **保持界面一致性**
2. **提供迁移进度提示**
3. **实现平滑的功能过渡**
4. **提供帮助文档**

---

*此方案将根据实际开发进展进行调整和优化*