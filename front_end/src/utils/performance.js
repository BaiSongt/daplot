/**
 * 性能优化工具模块
 * 提供懒加载、缓存、防抖节流等性能优化功能
 */

// 性能监控和优化工具
class PerformanceOptimizer {
    constructor() {
        this.loadTimes = new Map();
        this.cacheStorage = new Map();
        this.observers = new Map();
        this.metrics = {
            moduleLoadTime: new Map(),
            componentRenderTime: new Map(),
            apiResponseTime: new Map(),
            memoryUsage: []
        };
        
        this.initPerformanceMonitoring();
    }

    // 初始化性能监控
    initPerformanceMonitoring() {
        // 监控页面加载性能
        if (window.performance && window.performance.mark) {
            window.performance.mark('daplot-performance-start');
        }

        // 监控内存使用
        if (window.performance && window.performance.memory) {
            this.startMemoryMonitoring();
        }

        // 监控长任务
        if ('PerformanceObserver' in window) {
            this.observeLongTasks();
        }
    }

    // 内存监控
    startMemoryMonitoring() {
        const recordMemory = () => {
            if (window.performance.memory) {
                this.metrics.memoryUsage.push({
                    timestamp: Date.now(),
                    used: window.performance.memory.usedJSHeapSize,
                    total: window.performance.memory.totalJSHeapSize,
                    limit: window.performance.memory.jsHeapSizeLimit
                });

                // 保持最近100条记录
                if (this.metrics.memoryUsage.length > 100) {
                    this.metrics.memoryUsage.shift();
                }
            }
        };

        recordMemory();
        setInterval(recordMemory, 30000); // 每30秒记录一次
    }

    // 监控长任务
    observeLongTasks() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) { // 超过50ms的任务
                        console.warn(`长任务检测: ${entry.name} 耗时 ${entry.duration.toFixed(2)}ms`);
                    }
                }
            });
            observer.observe({ entryTypes: ['longtask'] });
        } catch (error) {
            console.warn('长任务监控不支持:', error);
        }
    }

    // 模块懒加载
    async lazyLoadModule(modulePath, cacheable = true) {
        const startTime = performance.now();
        
        try {
            // 检查缓存
            if (cacheable && this.cacheStorage.has(modulePath)) {
                return this.cacheStorage.get(modulePath);
            }

            // 动态加载模块
            const module = await this.loadScript(modulePath);
            
            // 记录加载时间
            const loadTime = performance.now() - startTime;
            this.metrics.moduleLoadTime.set(modulePath, loadTime);
            
            // 缓存模块
            if (cacheable) {
                this.cacheStorage.set(modulePath, module);
            }

            console.log(`📦 模块加载完成: ${modulePath} (${loadTime.toFixed(2)}ms)`);
            return module;

        } catch (error) {
            console.error(`❌ 模块加载失败: ${modulePath}`, error);
            throw error;
        }
    }

    // 加载脚本
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            
            document.head.appendChild(script);
        });
    }

    // 图片懒加载
    lazyLoadImages(container = document) {
        const images = container.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // 降级处理
            images.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
    }

    // 虚拟滚动实现
    createVirtualScroll(container, items, itemHeight, renderItem) {
        const containerHeight = container.clientHeight;
        const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // 缓冲区
        let scrollTop = 0;
        let startIndex = 0;

        const viewport = document.createElement('div');
        viewport.style.height = `${items.length * itemHeight}px`;
        viewport.style.position = 'relative';
        container.appendChild(viewport);

        const renderVisibleItems = () => {
            startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.min(startIndex + visibleCount, items.length);

            // 清除现有项目
            viewport.innerHTML = '';

            // 渲染可见项目
            for (let i = startIndex; i < endIndex; i++) {
                const item = renderItem(items[i], i);
                item.style.position = 'absolute';
                item.style.top = `${i * itemHeight}px`;
                item.style.height = `${itemHeight}px`;
                viewport.appendChild(item);
            }
        };

        container.addEventListener('scroll', () => {
            scrollTop = container.scrollTop;
            renderVisibleItems();
        });

        renderVisibleItems();
        return { update: renderVisibleItems };
    }

    // 防抖函数
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 资源预加载
    preloadResources(resources) {
        const promises = resources.map(resource => {
            return new Promise((resolve, reject) => {
                if (resource.type === 'script') {
                    this.loadScript(resource.url).then(resolve).catch(reject);
                } else if (resource.type === 'image') {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = resource.url;
                } else if (resource.type === 'fetch') {
                    fetch(resource.url)
                        .then(response => response.ok ? resolve() : reject())
                        .catch(reject);
                }
            });
        });

        return Promise.allSettled(promises);
    }

    // 缓存管理
    setCache(key, value, ttl = 300000) { // 默认5分钟TTL
        const item = {
            value,
            timestamp: Date.now(),
            ttl
        };
        this.cacheStorage.set(key, item);
    }

    getCache(key) {
        const item = this.cacheStorage.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > item.ttl) {
            this.cacheStorage.delete(key);
            return null;
        }

        return item.value;
    }

    clearCache(pattern) {
        if (pattern) {
            for (const [key] of this.cacheStorage) {
                if (key.includes(pattern)) {
                    this.cacheStorage.delete(key);
                }
            }
        } else {
            this.cacheStorage.clear();
        }
    }

    // 性能基准测试
    benchmark(name, fn, iterations = 1000) {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fn();
            const end = performance.now();
            times.push(end - start);
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        const result = {
            name,
            iterations,
            average: avg,
            min,
            max,
            total: times.reduce((a, b) => a + b, 0)
        };

        console.log(`📊 性能基准测试 - ${name}:`, result);
        return result;
    }

    // 获取性能报告
    getPerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            moduleLoadTimes: Object.fromEntries(this.metrics.moduleLoadTime),
            componentRenderTimes: Object.fromEntries(this.metrics.componentRenderTime),
            apiResponseTimes: Object.fromEntries(this.metrics.apiResponseTime),
            memoryUsage: this.metrics.memoryUsage.slice(-10), // 最近10条记录
            cacheStats: {
                size: this.cacheStorage.size,
                keys: Array.from(this.cacheStorage.keys())
            }
        };

        // 添加页面性能指标
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            report.pagePerformance = {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                loadComplete: timing.loadEventEnd - timing.navigationStart,
                domReady: timing.domComplete - timing.navigationStart
            };
        }

        return report;
    }

    // 优化建议
    getOptimizationSuggestions() {
        const suggestions = [];
        const report = this.getPerformanceReport();

        // 检查模块加载时间
        for (const [module, time] of Object.entries(report.moduleLoadTimes)) {
            if (time > 1000) { // 超过1秒
                suggestions.push({
                    type: 'module_load',
                    severity: 'high',
                    message: `模块 ${module} 加载时间过长 (${time.toFixed(2)}ms)`,
                    suggestion: '考虑拆分模块或使用懒加载'
                });
            }
        }

        // 检查内存使用
        if (report.memoryUsage.length > 0) {
            const latestMemory = report.memoryUsage[report.memoryUsage.length - 1];
            const memoryUsagePercent = (latestMemory.used / latestMemory.limit) * 100;
            
            if (memoryUsagePercent > 80) {
                suggestions.push({
                    type: 'memory',
                    severity: 'high',
                    message: `内存使用率过高 (${memoryUsagePercent.toFixed(1)}%)`,
                    suggestion: '检查内存泄漏，清理不必要的缓存'
                });
            }
        }

        // 检查缓存大小
        if (report.cacheStats.size > 100) {
            suggestions.push({
                type: 'cache',
                severity: 'medium',
                message: `缓存项目过多 (${report.cacheStats.size} 项)`,
                suggestion: '定期清理过期缓存'
            });
        }

        return suggestions;
    }
}

// 创建全局性能优化器实例
window.performanceOptimizer = new PerformanceOptimizer();

// 导出工具函数
window.debounce = window.performanceOptimizer.debounce.bind(window.performanceOptimizer);
window.throttle = window.performanceOptimizer.throttle.bind(window.performanceOptimizer);

console.log('⚡ 性能优化模块已加载');