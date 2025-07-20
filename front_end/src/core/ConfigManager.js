/**
 * 配置管理模块
 * 负责应用配置的加载、验证、更新和持久化
 */
class ConfigManager {
    constructor() {
        this.config = {};
        this.defaultConfig = {
            api: {
                baseUrl: 'http://localhost:8001',
                timeout: 10000,
                retries: 3
            },
            ui: {
                theme: 'light',
                language: 'zh-CN',
                pageSize: 20,
                autoSave: true,
                autoSaveInterval: 30000
            },
            chart: {
                defaultType: 'scatter',
                colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
                animation: true,
                responsive: true
            },
            data: {
                maxFileSize: 50 * 1024 * 1024, // 50MB
                maxCacheSize: 100 * 1024 * 1024, // 100MB
                cacheExpiry: 7 * 24 * 60 * 60 * 1000 // 7天
            },
            debug: {
                enabled: false,
                logLevel: 'info',
                showPerformance: false
            }
        };
        
        this.validators = new Map();
        this.watchers = new Map();
        this.storageKey = 'daplot_config';
        
        this.initValidators();
        this.loadConfig();
    }

    // 初始化配置验证器
    initValidators() {
        // API配置验证
        this.validators.set('api.baseUrl', (value) => {
            if (typeof value !== 'string') return false;
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        });

        this.validators.set('api.timeout', (value) => {
            return typeof value === 'number' && value > 0 && value <= 60000;
        });

        this.validators.set('api.retries', (value) => {
            return typeof value === 'number' && value >= 0 && value <= 10;
        });

        // UI配置验证
        this.validators.set('ui.theme', (value) => {
            return ['light', 'dark', 'auto'].includes(value);
        });

        this.validators.set('ui.language', (value) => {
            return ['zh-CN', 'en-US'].includes(value);
        });

        this.validators.set('ui.pageSize', (value) => {
            return typeof value === 'number' && value > 0 && value <= 1000;
        });

        // 数据配置验证
        this.validators.set('data.maxFileSize', (value) => {
            return typeof value === 'number' && value > 0;
        });

        this.validators.set('data.maxCacheSize', (value) => {
            return typeof value === 'number' && value > 0;
        });
    }

    // 深度合并对象
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    // 获取嵌套属性值
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    // 设置嵌套属性值
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }

    // 加载配置
    loadConfig() {
        try {
            // 1. 从默认配置开始
            this.config = { ...this.defaultConfig };

            // 2. 加载运行时配置文件
            this.loadRuntimeConfig();

            // 3. 加载本地存储的用户配置
            this.loadUserConfig();

            // 4. 加载环境变量配置
            this.loadEnvironmentConfig();

            // 5. 验证最终配置
            this.validateConfig();

            console.log('✅ 配置加载完成', this.config);
        } catch (error) {
            console.error('❌ 配置加载失败:', error);
            this.config = { ...this.defaultConfig };
        }
    }

    // 加载运行时配置文件
    loadRuntimeConfig() {
        try {
            const runtimeConfigElement = document.getElementById('runtime-config');
            if (runtimeConfigElement) {
                const runtimeConfig = JSON.parse(runtimeConfigElement.textContent);
                this.config = this.deepMerge(this.config, runtimeConfig);
            }
        } catch (error) {
            console.warn('运行时配置加载失败:', error);
        }
    }

    // 加载用户配置
    loadUserConfig() {
        try {
            const userConfigStr = localStorage.getItem(this.storageKey);
            if (userConfigStr) {
                const userConfig = JSON.parse(userConfigStr);
                this.config = this.deepMerge(this.config, userConfig);
            }
        } catch (error) {
            console.warn('用户配置加载失败:', error);
        }
    }

    // 加载环境变量配置
    loadEnvironmentConfig() {
        // 从URL参数中读取配置
        const urlParams = new URLSearchParams(window.location.search);
        
        const envConfig = {};
        
        // API配置
        if (urlParams.has('api_url')) {
            envConfig.api = { baseUrl: urlParams.get('api_url') };
        }
        
        // 调试配置
        if (urlParams.has('debug')) {
            envConfig.debug = { enabled: urlParams.get('debug') === 'true' };
        }
        
        // 主题配置
        if (urlParams.has('theme')) {
            envConfig.ui = { theme: urlParams.get('theme') };
        }

        if (Object.keys(envConfig).length > 0) {
            this.config = this.deepMerge(this.config, envConfig);
        }
    }

    // 验证配置
    validateConfig() {
        for (const [path, validator] of this.validators) {
            const value = this.getNestedValue(this.config, path);
            if (value !== undefined && !validator(value)) {
                console.warn(`配置验证失败: ${path} = ${value}, 使用默认值`);
                const defaultValue = this.getNestedValue(this.defaultConfig, path);
                this.setNestedValue(this.config, path, defaultValue);
            }
        }
    }

    // 获取配置值
    get(path, defaultValue = undefined) {
        const value = this.getNestedValue(this.config, path);
        return value !== undefined ? value : defaultValue;
    }

    // 设置配置值
    set(path, value, persist = true) {
        // 验证配置值
        const validator = this.validators.get(path);
        if (validator && !validator(value)) {
            throw new Error(`配置值验证失败: ${path} = ${value}`);
        }

        const oldValue = this.getNestedValue(this.config, path);
        this.setNestedValue(this.config, path, value);

        // 触发监听器
        this.notifyWatchers(path, value, oldValue);

        // 持久化到本地存储
        if (persist) {
            this.saveUserConfig();
        }

        console.log(`配置更新: ${path} = ${value}`);
    }

    // 批量设置配置
    setMultiple(updates, persist = true) {
        const oldValues = {};
        
        // 验证所有配置
        for (const [path, value] of Object.entries(updates)) {
            const validator = this.validators.get(path);
            if (validator && !validator(value)) {
                throw new Error(`配置值验证失败: ${path} = ${value}`);
            }
            oldValues[path] = this.getNestedValue(this.config, path);
        }

        // 应用所有配置
        for (const [path, value] of Object.entries(updates)) {
            this.setNestedValue(this.config, path, value);
        }

        // 触发监听器
        for (const [path, value] of Object.entries(updates)) {
            this.notifyWatchers(path, value, oldValues[path]);
        }

        // 持久化
        if (persist) {
            this.saveUserConfig();
        }

        console.log('批量配置更新:', updates);
    }

    // 监听配置变更
    watch(path, callback) {
        if (!this.watchers.has(path)) {
            this.watchers.set(path, new Set());
        }
        
        this.watchers.get(path).add(callback);
        
        // 返回取消监听函数
        return () => {
            this.watchers.get(path)?.delete(callback);
        };
    }

    // 通知监听器
    notifyWatchers(path, newValue, oldValue) {
        // 精确匹配的监听器
        if (this.watchers.has(path)) {
            this.watchers.get(path).forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error('配置监听器错误:', error);
                }
            });
        }

        // 父路径的监听器
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.watchers.has(parentPath)) {
                this.watchers.get(parentPath).forEach(callback => {
                    try {
                        callback(this.getNestedValue(this.config, parentPath), undefined, parentPath);
                    } catch (error) {
                        console.error('配置监听器错误:', error);
                    }
                });
            }
        }
    }

    // 保存用户配置
    saveUserConfig() {
        try {
            // 只保存用户自定义的配置，不保存默认配置
            const userConfig = this.extractUserConfig();
            localStorage.setItem(this.storageKey, JSON.stringify(userConfig));
        } catch (error) {
            console.error('保存用户配置失败:', error);
        }
    }

    // 提取用户自定义配置
    extractUserConfig() {
        const userConfig = {};
        
        // 这里可以实现更智能的逻辑来区分用户配置和默认配置
        // 目前简单地保存所有非默认值
        const compareAndExtract = (current, defaults, path = '') => {
            for (const key in current) {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof current[key] === 'object' && !Array.isArray(current[key])) {
                    if (defaults[key]) {
                        compareAndExtract(current[key], defaults[key], currentPath);
                    } else {
                        this.setNestedValue(userConfig, currentPath, current[key]);
                    }
                } else if (current[key] !== defaults[key]) {
                    this.setNestedValue(userConfig, currentPath, current[key]);
                }
            }
        };

        compareAndExtract(this.config, this.defaultConfig);
        return userConfig;
    }

    // 重置配置
    reset(path = null) {
        if (path) {
            // 重置特定配置
            const defaultValue = this.getNestedValue(this.defaultConfig, path);
            this.set(path, defaultValue);
        } else {
            // 重置所有配置
            this.config = { ...this.defaultConfig };
            localStorage.removeItem(this.storageKey);
            console.log('配置已重置为默认值');
        }
    }

    // 导出配置
    export() {
        return {
            config: this.config,
            userConfig: this.extractUserConfig(),
            timestamp: new Date().toISOString()
        };
    }

    // 导入配置
    import(configData) {
        try {
            if (configData.config) {
                this.config = this.deepMerge(this.defaultConfig, configData.config);
                this.validateConfig();
                this.saveUserConfig();
                console.log('配置导入成功');
                return true;
            }
        } catch (error) {
            console.error('配置导入失败:', error);
        }
        return false;
    }

    // 获取配置摘要
    getSummary() {
        return {
            api: {
                baseUrl: this.get('api.baseUrl'),
                timeout: this.get('api.timeout')
            },
            ui: {
                theme: this.get('ui.theme'),
                language: this.get('ui.language')
            },
            debug: {
                enabled: this.get('debug.enabled')
            }
        };
    }
}

// 导出类和全局实例
window.ConfigManager = ConfigManager;
window.configManager = new ConfigManager();