/**
 * 数据管理器
 * 负责数据的获取、缓存、筛选和持久化
 */
class DataManager {
    constructor() {
        this.cache = new Map();
        this.apiClient = window.apiClient;
        this.storage = window.dataPersistence;
        this.isOnline = navigator.onLine;
        
        this.initEventListeners();
    }

    // 初始化事件监听
    initEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 网络连接已恢复');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 网络连接已断开，切换到离线模式');
        });
    }

    // 获取文件列表
    async getFileList(useCache = true) {
        try {
            if (useCache && this.cache.has('fileList')) {
                return this.cache.get('fileList');
            }

            let fileList = [];
            
            if (this.isOnline) {
                const response = await fetch(`${window.appState.getState('settings').apiBaseUrl}/api/files`);
                if (response.ok) {
                    const data = await response.json();
                    fileList = data.files || [];
                    this.cache.set('fileList', fileList);
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

// 全局实例
window.dataManager = new DataManager();