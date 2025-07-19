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
            currentFileData: null,      // 当前文件数据
            loading: false,             // 全局加载状态
            error: null,                // 错误信息
            filters: {},                // 当前筛选条件
            chartConfig: {              // 图表配置
                title: '',
                xAxis: '',
                yAxis: '',
                chartType: 'scatter',
                style: {}
            },
            settings: {                 // 应用设置
                theme: 'light',
                language: 'zh-CN',
                autoSave: true,
                apiBaseUrl: 'http://localhost:8001'
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
        
        // 深度合并对象
        Object.keys(updates).forEach(key => {
            if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
                this.state[key] = { ...this.state[key], ...updates[key] };
            } else {
                this.state[key] = updates[key];
            }
        });
        
        // 通知订阅者
        Object.keys(updates).forEach(key => {
            this.listeners.get(key)?.forEach(callback => {
                callback(this.state[key], oldState[key]);
            });
        });
        
        // 通知全局状态变更
        this.listeners.get('*')?.forEach(callback => {
            callback(this.state, oldState);
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
            const saved = localStorage.getItem('daplot_app_state');
            if (saved) {
                const parsedState = JSON.parse(saved);
                // 只恢复可持久化的状态
                const persistableState = {
                    currentFileId: parsedState.currentFileId,
                    filters: parsedState.filters || {},
                    chartConfig: parsedState.chartConfig || this.state.chartConfig,
                    settings: { ...this.state.settings, ...parsedState.settings }
                };
                this.state = { ...this.state, ...persistableState };
            }
        } catch (error) {
            console.warn('Failed to load state from storage:', error);
        }
    }

    // 保存到本地存储
    saveToStorage() {
        try {
            const stateToSave = {
                currentFileId: this.state.currentFileId,
                filters: this.state.filters,
                chartConfig: this.state.chartConfig,
                settings: this.state.settings
            };
            localStorage.setItem('daplot_app_state', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to save state to storage:', error);
        }
    }

    // 清除状态
    clearState(keys = null) {
        if (keys) {
            const updates = {};
            keys.forEach(key => {
                if (key === 'filters') {
                    updates[key] = {};
                } else if (key === 'chartConfig') {
                    updates[key] = {
                        title: '',
                        xAxis: '',
                        yAxis: '',
                        chartType: 'scatter',
                        style: {}
                    };
                } else {
                    updates[key] = null;
                }
            });
            this.setState(updates);
        } else {
            localStorage.removeItem('daplot_app_state');
            location.reload();
        }
    }
}

// 全局实例
window.appState = new AppState();