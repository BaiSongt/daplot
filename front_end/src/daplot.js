/**
 * DaPlot 主入口文件
 * 统一加载和初始化所有模块
 */

// 版本信息
window.DAPLOT_VERSION = '1.0.0';
window.DAPLOT_BUILD = Date.now();

console.log(`🚀 DaPlot v${window.DAPLOT_VERSION} 正在启动...`);

// 检查必要的浏览器特性
function checkBrowserSupport() {
    const requiredFeatures = [
        'Promise',
        'fetch',
        'Map',
        'Set',
        'Symbol',
        'Proxy'
    ];

    const missingFeatures = requiredFeatures.filter(feature => !window[feature]);
    
    if (missingFeatures.length > 0) {
        console.error('❌ 浏览器不支持以下特性:', missingFeatures);
        return false;
    }
    
    return true;
}

// 加载模块的辅助函数
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 主初始化函数
async function initializeDaPlot() {
    try {
        // 1. 检查浏览器支持
        if (!checkBrowserSupport()) {
            throw new Error('浏览器版本过低，请升级到现代浏览器');
        }

        console.log('✅ 浏览器兼容性检查通过');

        // 2. 优先加载性能优化模块
        await loadScript('/src/utils/performance.js').catch(error => {
            console.warn('⚠️ 性能优化模块加载失败:', error);
        });

        // 3. 分阶段加载核心模块
        const essentialModules = [
            '/src/utils/constants.js',
            '/src/utils/helpers.js',
            '/src/core/EventBus.js',
            '/src/core/AppState.js'
        ];

        const secondaryModules = [
            '/src/utils/validators.js', 
            '/src/utils/formatters.js',
            '/src/core/ConfigManager.js',
            '/src/core/ApiClient.js',
            '/src/core/DataManager.js'
        ];

        const advancedModules = [
            '/src/core/ChartEngine.js',
            '/src/core/ModuleLoader.js'
        ];

        console.log('📦 开始分阶段加载核心模块...');
        
        // 第一阶段：加载必需模块
        console.log('🔄 阶段1: 加载必需模块...');
        await Promise.all(essentialModules.map(module => {
            const scriptExists = document.querySelector(`script[src="${module}"]`);
            if (scriptExists) {
                return Promise.resolve();
            }
            return loadScript(module).catch(error => {
                console.warn(`⚠️ 必需模块加载失败: ${module}`, error);
                return Promise.resolve();
            });
        }));

        // 第二阶段：延迟加载次要模块
        setTimeout(async () => {
            console.log('🔄 阶段2: 加载次要模块...');
            await Promise.all(secondaryModules.map(module => {
                const scriptExists = document.querySelector(`script[src="${module}"]`);
                if (scriptExists) {
                    return Promise.resolve();
                }
                return loadScript(module).catch(error => {
                    console.warn(`⚠️ 次要模块加载失败: ${module}`, error);
                    return Promise.resolve();
                });
            }));
        }, 100);

        // 第三阶段：按需加载高级模块
        setTimeout(async () => {
            console.log('🔄 阶段3: 加载高级模块...');
            await Promise.all(advancedModules.map(module => {
                const scriptExists = document.querySelector(`script[src="${module}"]`);
                if (scriptExists) {
                    return Promise.resolve();
                }
                return loadScript(module).catch(error => {
                    console.warn(`⚠️ 高级模块加载失败: ${module}`, error);
                    return Promise.resolve();
                });
            }));
        }, 500);

        console.log('✅ 核心模块加载完成');

        // 3. 等待一小段时间确保所有模块都已执行
        await new Promise(resolve => setTimeout(resolve, 100));

        // 4. 初始化模块加载器
        if (window.moduleLoader) {
            await window.moduleLoader.initialize();
        } else {
            console.warn('⚠️ ModuleLoader 未找到，使用备用初始化方式');
            await fallbackInitialization();
        }

        // 5. 设置全局错误处理
        setupGlobalErrorHandling();

        // 6. 设置性能监控
        setupPerformanceMonitoring();

        console.log('🎉 DaPlot 初始化完成！');
        
        // 发送初始化完成事件
        if (window.eventBus) {
            window.eventBus.emit('daplot.initialized', {
                version: window.DAPLOT_VERSION,
                build: window.DAPLOT_BUILD,
                timestamp: new Date().toISOString()
            });
        }

        return true;

    } catch (error) {
        console.error('❌ DaPlot 初始化失败:', error);
        
        // 显示用户友好的错误信息
        showInitializationError(error);
        
        return false;
    }
}

// 备用初始化方式
async function fallbackInitialization() {
    console.log('🔄 使用备用初始化方式...');
    
    // 手动初始化核心组件
    if (typeof ConfigManager !== 'undefined' && !window.configManager) {
        window.configManager = new ConfigManager();
    }
    
    if (typeof EventBus !== 'undefined' && !window.eventBus) {
        window.eventBus = new EventBus();
    }
    
    if (typeof ApiClient !== 'undefined' && !window.apiClient) {
        const baseURL = window.configManager?.get('api.baseUrl') || 'http://localhost:8001';
        window.apiClient = new ApiClient(baseURL);
    }
    
    if (typeof AppState !== 'undefined' && !window.appState) {
        window.appState = new AppState();
    }
    
    if (typeof DataManager !== 'undefined' && !window.dataManager) {
        window.dataManager = new DataManager();
    }
    
    if (typeof ChartEngine !== 'undefined' && !window.chartEngine) {
        window.chartEngine = new ChartEngine();
    }
}

// 设置全局错误处理
function setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('全局错误:', event.error);
        
        if (window.eventBus) {
            window.eventBus.emit('app.error', {
                type: 'javascript',
                message: event.error?.message || '未知错误',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('未处理的Promise拒绝:', event.reason);
        
        if (window.eventBus) {
            window.eventBus.emit('app.error', {
                type: 'promise',
                message: event.reason?.message || '未知Promise错误',
                reason: event.reason
            });
        }
    });
}

// 设置性能监控
function setupPerformanceMonitoring() {
    if (!window.performance || !window.performance.mark) {
        return;
    }

    // 标记初始化完成时间
    window.performance.mark('daplot-initialized');

    // 如果支持，测量从页面开始到初始化完成的时间
    try {
        window.performance.measure('daplot-startup', 'navigationStart', 'daplot-initialized');
        const measure = window.performance.getEntriesByName('daplot-startup')[0];
        console.log(`⏱️ DaPlot 启动耗时: ${measure.duration.toFixed(2)}ms`);
    } catch (error) {
        // 忽略性能测量错误
    }
}

// 显示初始化错误
function showInitializationError(error) {
    const errorOverlay = document.createElement('div');
    errorOverlay.id = 'daplot-error-overlay';
    errorOverlay.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(248, 249, 250, 0.95);
            display: flex;
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
                max-width: 500px;
            ">
                <div style="color: #dc3545; font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h2 style="color: #dc3545; margin-bottom: 15px;">DaPlot 初始化失败</h2>
                <p style="color: #6c757d; margin-bottom: 20px; line-height: 1.5;">
                    ${error.message}
                </p>
                <div style="margin-bottom: 20px;">
                    <button onclick="location.reload()" style="
                        padding: 10px 20px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        margin-right: 10px;
                    ">刷新页面</button>
                    <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" style="
                        padding: 10px 20px;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    ">关闭</button>
                </div>
                <details style="text-align: left; margin-top: 20px;">
                    <summary style="cursor: pointer; color: #007bff;">技术详情</summary>
                    <pre style="
                        background: #f8f9fa;
                        padding: 10px;
                        border-radius: 4px;
                        font-size: 12px;
                        overflow: auto;
                        margin-top: 10px;
                        color: #495057;
                    ">${error.stack || error.message}</pre>
                </details>
            </div>
        </div>
    `;
    
    document.body.appendChild(errorOverlay);
}

// 提供给外部使用的API
window.DaPlot = {
    version: window.DAPLOT_VERSION,
    build: window.DAPLOT_BUILD,
    initialize: initializeDaPlot,
    
    // 获取模块实例
    getModule: (name) => {
        return window.moduleLoader?.getModule(name) || window[name.charAt(0).toLowerCase() + name.slice(1)];
    },
    
    // 检查初始化状态
    isReady: () => {
        return window.moduleLoader?.isInitialized || false;
    },
    
    // 获取状态信息
    getStatus: () => {
        return {
            version: window.DAPLOT_VERSION,
            build: window.DAPLOT_BUILD,
            ready: window.DaPlot.isReady(),
            modules: window.moduleLoader?.getInitializationStatus() || {}
        };
    }
};

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDaPlot);
} else {
    // 延迟一点时间确保其他脚本加载完成
    setTimeout(initializeDaPlot, 50);
}

// 导出到全局
window.initializeDaPlot = initializeDaPlot;