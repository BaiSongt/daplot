/**
 * 模块加载器
 * 统一管理和初始化所有核心模块
 */
class ModuleLoader {
    constructor() {
        this.modules = new Map();
        this.loadOrder = [
            'ConfigManager',
            'EventBus', 
            'ApiClient',
            'AppState',
            'DataManager',
            'ChartEngine'
        ];
        this.isInitialized = false;
    }

    // 注册模块
    register(name, moduleClass, dependencies = []) {
        this.modules.set(name, {
            class: moduleClass,
            dependencies,
            instance: null,
            initialized: false
        });
    }

    // 初始化所有模块
    async initialize() {
        if (this.isInitialized) {
            console.warn('ModuleLoader: 模块已经初始化');
            return;
        }

        console.log('🚀 开始初始化DaPlot模块...');

        try {
            // 按顺序初始化模块
            for (const moduleName of this.loadOrder) {
                await this.initializeModule(moduleName);
            }

            this.isInitialized = true;
            console.log('✅ 所有模块初始化完成');

            // 发送初始化完成事件
            if (window.eventBus) {
                window.eventBus.emit('app.ready');
            }

        } catch (error) {
            console.error('❌ 模块初始化失败:', error);
            throw error;
        }
    }

    // 初始化单个模块
    async initializeModule(name) {
        const moduleInfo = this.modules.get(name);
        
        if (!moduleInfo) {
            // 如果模块未注册，尝试从全局对象获取
            if (window[name]) {
                console.log(`📦 使用全局模块: ${name}`);
                return window[name];
            }
            throw new Error(`模块未找到: ${name}`);
        }

        if (moduleInfo.initialized) {
            return moduleInfo.instance;
        }

        console.log(`📦 初始化模块: ${name}`);

        // 检查依赖
        for (const dep of moduleInfo.dependencies) {
            if (!this.modules.get(dep)?.initialized && !window[dep]) {
                await this.initializeModule(dep);
            }
        }

        // 创建模块实例
        try {
            if (typeof moduleInfo.class === 'function') {
                moduleInfo.instance = new moduleInfo.class();
            } else {
                moduleInfo.instance = moduleInfo.class;
            }

            moduleInfo.initialized = true;
            
            // 将实例挂载到全局对象
            const globalName = name.charAt(0).toLowerCase() + name.slice(1);
            window[globalName] = moduleInfo.instance;

            console.log(`✅ 模块 ${name} 初始化完成`);
            return moduleInfo.instance;

        } catch (error) {
            console.error(`❌ 模块 ${name} 初始化失败:`, error);
            throw error;
        }
    }

    // 获取模块实例
    getModule(name) {
        const moduleInfo = this.modules.get(name);
        if (moduleInfo && moduleInfo.initialized) {
            return moduleInfo.instance;
        }
        
        // 尝试从全局对象获取
        const globalName = name.charAt(0).toLowerCase() + name.slice(1);
        return window[globalName] || null;
    }

    // 检查模块是否已初始化
    isModuleInitialized(name) {
        const moduleInfo = this.modules.get(name);
        return moduleInfo ? moduleInfo.initialized : !!window[name.charAt(0).toLowerCase() + name.slice(1)];
    }

    // 获取初始化状态
    getInitializationStatus() {
        const status = {};
        
        for (const [name, info] of this.modules) {
            status[name] = info.initialized;
        }

        return {
            isInitialized: this.isInitialized,
            modules: status
        };
    }

    // 重新初始化模块
    async reinitialize(moduleName = null) {
        if (moduleName) {
            const moduleInfo = this.modules.get(moduleName);
            if (moduleInfo) {
                moduleInfo.initialized = false;
                moduleInfo.instance = null;
                await this.initializeModule(moduleName);
            }
        } else {
            this.isInitialized = false;
            for (const [name, info] of this.modules) {
                info.initialized = false;
                info.instance = null;
            }
            await this.initialize();
        }
    }
}

// 创建全局模块加载器实例
window.moduleLoader = new ModuleLoader();

// 自动初始化函数
window.initializeDaPlot = async function() {
    try {
        // 显示加载提示
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'daplot-loading';
        loadingOverlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(248, 249, 250, 0.95);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Segoe UI', sans-serif;
            ">
                <div style="
                    text-align: center;
                    padding: 40px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #e9ecef;
                        border-top: 4px solid #007bff;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <div style="color: #6c757d; font-size: 16px; margin-bottom: 10px;">
                        正在初始化 DaPlot...
                    </div>
                    <div style="color: #868e96; font-size: 12px;">
                        请稍候，正在加载核心模块
                    </div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(loadingOverlay);

        // 初始化模块
        await window.moduleLoader.initialize();

        // 隐藏加载提示
        setTimeout(() => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
            }
        }, 500);

        console.log('🎉 DaPlot 初始化完成！');
        return true;

    } catch (error) {
        console.error('❌ DaPlot 初始化失败:', error);
        
        // 显示错误信息
        const errorOverlay = document.getElementById('daplot-loading');
        if (errorOverlay) {
            errorOverlay.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(248, 249, 250, 0.95);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    font-family: 'Segoe UI', sans-serif;
                ">
                    <div style="
                        text-align: center;
                        padding: 40px;
                        background: white;
                        border-radius: 10px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                        border-left: 4px solid #dc3545;
                    ">
                        <div style="color: #dc3545; font-size: 24px; margin-bottom: 15px;">⚠️</div>
                        <div style="color: #dc3545; font-size: 16px; margin-bottom: 10px;">
                            DaPlot 初始化失败
                        </div>
                        <div style="color: #6c757d; font-size: 12px; margin-bottom: 20px;">
                            ${error.message}
                        </div>
                        <button onclick="location.reload()" style="
                            padding: 8px 16px;
                            background: #007bff;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">刷新页面</button>
                    </div>
                </div>
            `;
        }
        
        return false;
    }
};

// 页面加载完成后自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeDaPlot);
} else {
    // 如果页面已经加载完成，延迟一点时间再初始化，确保其他脚本加载完成
    setTimeout(window.initializeDaPlot, 100);
}