/**
 * 数据管理器
 * 负责数据的获取、缓存、筛选和持久化
 */
class DataManager {
    constructor() {
        // 使用新的智能缓存系统
        this.cache = window.cacheManager?.getCache('data') || new Map();
        this.apiCache = window.cacheManager?.getCache('api') || new Map();
        this.apiClient = window.apiClient;
        this.storage = window.dataPersistence;
        this.isOnline = navigator.onLine;
        
        // 性能优化配置
        this.performanceConfig = {
            enablePreload: true,
            batchSize: 50,
            maxConcurrentRequests: 3,
            requestTimeout: 30000
        };
        
        this.initEventListeners();
        this.initPerformanceOptimizations();
    }

    // 初始化事件监听
    initEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 网络连接已恢复');
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 网络连接已断开，切换到离线模式');
        });
    }

    // 初始化性能优化
    initPerformanceOptimizations() {
        // 预加载常用数据
        if (this.performanceConfig.enablePreload) {
            this.preloadCommonData();
        }

        // 设置请求队列管理
        this.requestQueue = [];
        this.activeRequests = 0;
        
        // 启动后台数据同步
        this.startBackgroundSync();
    }

    // 预加载常用数据
    async preloadCommonData() {
        try {
            console.log('🔄 开始预加载常用数据...');
            
            // 预加载文件列表
            this.getFileList(false).catch(error => {
                console.warn('预加载文件列表失败:', error);
            });
            
            // 预加载最近使用的文件数据
            const recentFiles = this.getRecentFiles();
            for (const fileId of recentFiles.slice(0, 3)) {
                this.getFileData(fileId, false).catch(error => {
                    console.warn(`预加载文件 ${fileId} 失败:`, error);
                });
            }
            
            console.log('✅ 常用数据预加载完成');
        } catch (error) {
            console.warn('预加载过程中出错:', error);
        }
    }

    // 获取最近使用的文件
    getRecentFiles() {
        try {
            const recent = localStorage.getItem('daplot_recent_files');
            return recent ? JSON.parse(recent) : [];
        } catch {
            return [];
        }
    }

    // 记录文件使用
    recordFileUsage(fileId) {
        try {
            const recent = this.getRecentFiles();
            const filtered = recent.filter(id => id !== fileId);
            filtered.unshift(fileId);
            
            // 保持最近10个文件
            const updated = filtered.slice(0, 10);
            localStorage.setItem('daplot_recent_files', JSON.stringify(updated));
        } catch (error) {
            console.warn('记录文件使用失败:', error);
        }
    }

    // 启动后台同步
    startBackgroundSync() {
        setInterval(() => {
            if (this.isOnline && this.requestQueue.length === 0) {
                this.syncCacheWithServer();
            }
        }, 300000); // 每5分钟同步一次
    }

    // 同步缓存与服务器
    async syncCacheWithServer() {
        try {
            console.log('🔄 开始后台数据同步...');
            
            // 检查文件列表是否需要更新
            const cachedFileList = this.cache.get ? this.cache.get('fileList') : this.cache.get('fileList');
            if (cachedFileList) {
                const freshFileList = await this.getFileList(false);
                if (JSON.stringify(cachedFileList) !== JSON.stringify(freshFileList)) {
                    console.log('📄 文件列表已更新');
                    window.eventBus?.emit('fileList.updated', freshFileList);
                }
            }
            
            console.log('✅ 后台数据同步完成');
        } catch (error) {
            console.warn('后台同步失败:', error);
        }
    }

    // 同步离线数据
    async syncOfflineData() {
        try {
            console.log('🔄 开始同步离线数据...');
            
            // 获取离线期间的操作记录
            const offlineOperations = this.getOfflineOperations();
            
            for (const operation of offlineOperations) {
                try {
                    await this.executeOperation(operation);
                    this.removeOfflineOperation(operation.id);
                } catch (error) {
                    console.warn('同步离线操作失败:', operation, error);
                }
            }
            
            console.log('✅ 离线数据同步完成');
        } catch (error) {
            console.warn('离线数据同步失败:', error);
        }
    }

    // 智能请求管理
    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const request = {
                url,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            };

            // 如果当前活跃请求数超过限制，加入队列
            if (this.activeRequests >= this.performanceConfig.maxConcurrentRequests) {
                this.requestQueue.push(request);
                return;
            }

            this.executeRequest(request);
        });
    }

    // 执行请求
    async executeRequest(request) {
        this.activeRequests++;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, request.options.timeout || this.performanceConfig.requestTimeout);

            const response = await fetch(request.url, {
                ...request.options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            request.resolve(response);
        } catch (error) {
            request.reject(error);
        } finally {
            this.activeRequests--;
            this.processRequestQueue();
        }
    }

    // 处理请求队列
    processRequestQueue() {
        while (this.requestQueue.length > 0 && this.activeRequests < this.performanceConfig.maxConcurrentRequests) {
            const request = this.requestQueue.shift();
            this.executeRequest(request);
        }
    }

    // 批量数据处理
    async processBatchData(data, processor, batchSize = this.performanceConfig.batchSize) {
        const results = [];
        
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(item => processor(item))
            );
            results.push(...batchResults);
            
            // 让出控制权，避免阻塞UI
            if (i + batchSize < data.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        return results;
    }

    // 获取离线操作记录
    getOfflineOperations() {
        try {
            const operations = localStorage.getItem('daplot_offline_operations');
            return operations ? JSON.parse(operations) : [];
        } catch {
            return [];
        }
    }

    // 移除离线操作记录
    removeOfflineOperation(operationId) {
        try {
            const operations = this.getOfflineOperations();
            const filtered = operations.filter(op => op.id !== operationId);
            localStorage.setItem('daplot_offline_operations', JSON.stringify(filtered));
        } catch (error) {
            console.warn('移除离线操作记录失败:', error);
        }
    }

    // 执行操作
    async executeOperation(operation) {
        switch (operation.type) {
            case 'upload':
                return await this.uploadFile(operation.data);
            case 'delete':
                return await this.deleteFile(operation.data.fileId);
            case 'update':
                return await this.updateFileData(operation.data.fileId, operation.data.data);
            default:
                throw new Error(`未知操作类型: ${operation.type}`);
        }
    }

    // 获取文件列表
    async getFileList(useCache = true) {
        const startTime = performance.now();
        
        try {
            // 使用智能缓存系统
            const cacheKey = 'fileList';
            
            if (useCache) {
                const cached = this.cache.get ? this.cache.get(cacheKey) : this.cache.get(cacheKey);
                if (cached) {
                    console.log(`📋 文件列表缓存命中 (${(performance.now() - startTime).toFixed(2)}ms)`);
                    return cached;
                }
            }

            let fileList = [];
            
            if (this.isOnline) {
                try {
                    const apiUrl = `${window.appState?.getState('settings')?.apiBaseUrl || 'http://localhost:8001'}/api/files`;
                    const response = await this.makeRequest(apiUrl, {
                        timeout: this.performanceConfig.requestTimeout
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        fileList = data.files || [];
                        
                        // 使用智能缓存存储
                        if (this.cache.set) {
                            this.cache.set(cacheKey, fileList, 300000); // 5分钟TTL
                        } else {
                            this.cache.set(cacheKey, fileList);
                        }
                        
                        // 同时保存到本地存储作为备份
                        this.storage?.saveFileList?.(fileList);
                    }
                } catch (error) {
                    console.warn('在线获取文件列表失败:', error);
                }
            }
            
            // 如果在线获取失败或离线，尝试从本地存储获取
            if (fileList.length === 0) {
                const localFiles = this.storage?.getFileList() || [];
                fileList = localFiles.map(file => ({
                    file_id: file.id,
                    filename: file.filename || `文件 ${file.id.substring(0, 8)}`,
                    rows: file.rows || 0,
                    columns: file.columns || 0
                }));
            }

            return fileList;
        } catch (error) {
            console.error('获取文件列表失败:', error);
            return [];
        }
    }

    // 获取文件数据
    async getFileData(fileId, useCache = true) {
        if (!fileId) {
            throw new Error('文件ID不能为空');
        }

        try {
            // 优先从缓存获取
            if (useCache && this.cache.has(fileId)) {
                return this.cache.get(fileId);
            }

            let fileData = null;

            // 在线模式：从API获取
            if (this.isOnline) {
                const response = await fetch(`${window.appState.getState('settings').apiBaseUrl}/api/file/${fileId}`);
                if (response.ok) {
                    fileData = await response.json();
                    this.cache.set(fileId, fileData);
                    // 同时保存到本地存储
                    if (this.storage) {
                        this.storage.saveFileData(fileId, fileData);
                    }
                }
            }
            
            // 如果在线获取失败或离线，从本地存储获取
            if (!fileData && this.storage) {
                fileData = this.storage.getFileData(fileId);
                if (fileData) {
                    this.cache.set(fileId, fileData);
                }
            }

            if (!fileData) {
                throw new Error('文件数据不存在或已过期');
            }

            return fileData;
        } catch (error) {
            console.error('获取文件数据失败:', error);
            throw error;
        }
    }

    // 获取列的唯一值（用于筛选）
    async getUniqueValues(fileId, columnName) {
        try {
            const cacheKey = `${fileId}_${columnName}_unique`;
            
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            if (this.isOnline) {
                const response = await fetch(
                    `${window.appState.getState('settings').apiBaseUrl}/api/unique_values/${fileId}/${columnName}`
                );
                if (response.ok) {
                    const data = await response.json();
                    this.cache.set(cacheKey, data.values);
                    return data.values;
                }
            }

            // 离线模式：从本地数据计算
            const fileData = await this.getFileData(fileId);
            if (fileData && fileData.preview_data) {
                const uniqueValues = [...new Set(
                    fileData.preview_data
                        .map(row => row[columnName])
                        .filter(val => val !== null && val !== undefined && val !== '')
                )];
                this.cache.set(cacheKey, uniqueValues);
                return uniqueValues;
            }

            return [];
        } catch (error) {
            console.error('获取唯一值失败:', error);
            return [];
        }
    }

    // 应用筛选条件获取数据
    async getFilteredData(fileId, filters = {}) {
        try {
            const cacheKey = `${fileId}_filtered_${JSON.stringify(filters)}`;
            
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            if (this.isOnline && Object.keys(filters).length > 0) {
                const response = await fetch(`${window.appState.getState('settings').apiBaseUrl}/api/filter`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        file_id: fileId,
                        filters: filters
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.cache.set(cacheKey, data);
                    return data;
                }
            }

            // 离线模式或无筛选条件：返回原始数据
            const fileData = await this.getFileData(fileId);
            let data = fileData.preview_data || [];

            // 在前端应用筛选
            if (Object.keys(filters).length > 0) {
                data = this.applyFiltersLocally(data, filters);
            }

            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('获取筛选数据失败:', error);
            throw error;
        }
    }

    // 本地应用筛选条件
    applyFiltersLocally(data, filters) {
        return data.filter(row => {
            return Object.entries(filters).every(([column, values]) => {
                if (!values || values.length === 0) return true;
                const cellValue = row[column];
                return values.some(filterValue => {
                    // 支持多种数据类型的匹配
                    return String(cellValue) === String(filterValue) ||
                           Number(cellValue) === Number(filterValue) ||
                           cellValue === filterValue;
                });
            });
        });
    }

    // 获取绘图数据
    async getPlotData(fileId, filters, xAxis, yAxis) {
        try {
            if (this.isOnline) {
                const response = await fetch(`${window.appState.getState('settings').apiBaseUrl}/api/plot_data`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        file_id: fileId,
                        filters: filters,
                        x_axis: xAxis,
                        y_axis: yAxis
                    })
                });

                if (response.ok) {
                    return await response.json();
                }
            }

            // 离线模式：从本地数据提取
            const filteredData = await this.getFilteredData(fileId, filters);
            const xValues = filteredData.map(row => row[xAxis]).filter(val => val !== null && val !== undefined);
            const yValues = filteredData.map(row => row[yAxis]).filter(val => val !== null && val !== undefined);

            // 确保数据长度一致
            const minLength = Math.min(xValues.length, yValues.length);
            
            return {
                x_values: xValues.slice(0, minLength),
                y_values: yValues.slice(0, minLength),
                x_label: xAxis,
                y_label: yAxis
            };
        } catch (error) {
            console.error('获取绘图数据失败:', error);
            throw error;
        }
    }

    // 清除缓存
    clearCache(key = null) {
        if (key) {
            // 清除特定缓存
            if (key.includes('*')) {
                // 支持通配符
                const pattern = key.replace('*', '');
                for (const cacheKey of this.cache.keys()) {
                    if (cacheKey.includes(pattern)) {
                        this.cache.delete(cacheKey);
                    }
                }
            } else {
                this.cache.delete(key);
            }
        } else {
            // 清除所有缓存
            this.cache.clear();
        }
    }

    // 预加载数据
    async preloadData(fileId) {
        try {
            await this.getFileData(fileId, false); // 强制从服务器获取最新数据
            console.log(`✅ 文件 ${fileId} 数据预加载完成`);
        } catch (error) {
            console.warn(`⚠️ 文件 ${fileId} 数据预加载失败:`, error);
        }
    }
}

// 导出类和全局实例
window.DataManager = DataManager;
window.dataManager = new DataManager();