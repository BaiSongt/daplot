/**
 * 智能缓存管理模块
 * 提供多级缓存、LRU算法、过期管理等功能
 */

class CacheManager {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 100;
        this.defaultTTL = options.defaultTTL || 300000; // 5分钟
        this.storage = new Map();
        this.accessOrder = new Map(); // LRU跟踪
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            sets: 0
        };
        
        // 启动清理定时器
        this.startCleanupTimer();
    }

    // 设置缓存项
    set(key, value, ttl = this.defaultTTL) {
        // 如果缓存已满，执行LRU清理
        if (this.storage.size >= this.maxSize && !this.storage.has(key)) {
            this.evictLRU();
        }

        const item = {
            value,
            timestamp: Date.now(),
            ttl,
            accessCount: 0,
            lastAccess: Date.now()
        };

        this.storage.set(key, item);
        this.accessOrder.set(key, Date.now());
        this.stats.sets++;

        console.log(`💾 缓存设置: ${key} (TTL: ${ttl}ms)`);
    }

    // 获取缓存项
    get(key) {
        const item = this.storage.get(key);
        
        if (!item) {
            this.stats.misses++;
            return null;
        }

        // 检查是否过期
        if (this.isExpired(item)) {
            this.storage.delete(key);
            this.accessOrder.delete(key);
            this.stats.misses++;
            return null;
        }

        // 更新访问信息
        item.accessCount++;
        item.lastAccess = Date.now();
        this.accessOrder.set(key, Date.now());
        this.stats.hits++;

        return item.value;
    }

    // 检查是否过期
    isExpired(item) {
        return Date.now() - item.timestamp > item.ttl;
    }

    // LRU清理
    evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, time] of this.accessOrder) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.storage.delete(oldestKey);
            this.accessOrder.delete(oldestKey);
            this.stats.evictions++;
            console.log(`🗑️ LRU清理: ${oldestKey}`);
        }
    }

    // 删除缓存项
    delete(key) {
        const deleted = this.storage.delete(key);
        this.accessOrder.delete(key);
        return deleted;
    }

    // 清空缓存
    clear() {
        this.storage.clear();
        this.accessOrder.clear();
        console.log('🧹 缓存已清空');
    }

    // 批量设置
    setMultiple(items, ttl = this.defaultTTL) {
        for (const [key, value] of Object.entries(items)) {
            this.set(key, value, ttl);
        }
    }

    // 批量获取
    getMultiple(keys) {
        const result = {};
        for (const key of keys) {
            const value = this.get(key);
            if (value !== null) {
                result[key] = value;
            }
        }
        return result;
    }

    // 检查键是否存在
    has(key) {
        const item = this.storage.get(key);
        return item && !this.isExpired(item);
    }

    // 获取缓存大小
    size() {
        return this.storage.size;
    }

    // 获取所有键
    keys() {
        return Array.from(this.storage.keys());
    }

    // 清理过期项
    cleanup() {
        let cleanedCount = 0;
        const now = Date.now();

        for (const [key, item] of this.storage) {
            if (this.isExpired(item)) {
                this.storage.delete(key);
                this.accessOrder.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 清理过期缓存: ${cleanedCount} 项`);
        }

        return cleanedCount;
    }

    // 启动清理定时器
    startCleanupTimer() {
        setInterval(() => {
            this.cleanup();
        }, 60000); // 每分钟清理一次
    }

    // 获取缓存统计
    getStats() {
        const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) * 100;
        
        return {
            ...this.stats,
            hitRate: isNaN(hitRate) ? 0 : hitRate.toFixed(2),
            size: this.storage.size,
            maxSize: this.maxSize,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    // 估算内存使用
    estimateMemoryUsage() {
        let totalSize = 0;
        
        for (const [key, item] of this.storage) {
            totalSize += key.length * 2; // 字符串按2字节计算
            totalSize += JSON.stringify(item.value).length * 2;
            totalSize += 64; // 元数据开销估算
        }

        return {
            bytes: totalSize,
            kb: (totalSize / 1024).toFixed(2),
            mb: (totalSize / 1024 / 1024).toFixed(2)
        };
    }

    // 导出缓存数据
    export() {
        const data = {};
        for (const [key, item] of this.storage) {
            if (!this.isExpired(item)) {
                data[key] = {
                    value: item.value,
                    timestamp: item.timestamp,
                    ttl: item.ttl
                };
            }
        }
        return data;
    }

    // 导入缓存数据
    import(data) {
        let importedCount = 0;
        const now = Date.now();

        for (const [key, item] of Object.entries(data)) {
            // 检查导入的数据是否过期
            if (now - item.timestamp < item.ttl) {
                this.set(key, item.value, item.ttl - (now - item.timestamp));
                importedCount++;
            }
        }

        console.log(`📥 导入缓存: ${importedCount} 项`);
        return importedCount;
    }

    // 获取热点数据
    getHotData(limit = 10) {
        const items = Array.from(this.storage.entries())
            .map(([key, item]) => ({
                key,
                accessCount: item.accessCount,
                lastAccess: item.lastAccess
            }))
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, limit);

        return items;
    }

    // 预热缓存
    async warmup(dataLoader) {
        console.log('🔥 开始缓存预热...');
        
        try {
            const data = await dataLoader();
            let warmedCount = 0;

            for (const [key, value] of Object.entries(data)) {
                this.set(key, value);
                warmedCount++;
            }

            console.log(`🔥 缓存预热完成: ${warmedCount} 项`);
            return warmedCount;
        } catch (error) {
            console.error('❌ 缓存预热失败:', error);
            return 0;
        }
    }
}

// 创建不同类型的缓存实例
const cacheInstances = {
    // 数据缓存 - 大容量，长TTL
    data: new CacheManager({
        maxSize: 200,
        defaultTTL: 600000 // 10分钟
    }),
    
    // API响应缓存 - 中等容量，中等TTL
    api: new CacheManager({
        maxSize: 100,
        defaultTTL: 300000 // 5分钟
    }),
    
    // UI状态缓存 - 小容量，短TTL
    ui: new CacheManager({
        maxSize: 50,
        defaultTTL: 60000 // 1分钟
    }),
    
    // 图片缓存 - 大容量，长TTL
    image: new CacheManager({
        maxSize: 500,
        defaultTTL: 1800000 // 30分钟
    })
};

// 全局缓存管理器
class GlobalCacheManager {
    constructor() {
        this.caches = cacheInstances;
    }

    // 获取指定类型的缓存
    getCache(type = 'data') {
        return this.caches[type] || this.caches.data;
    }

    // 获取所有缓存统计
    getAllStats() {
        const stats = {};
        for (const [type, cache] of Object.entries(this.caches)) {
            stats[type] = cache.getStats();
        }
        return stats;
    }

    // 清空所有缓存
    clearAll() {
        for (const cache of Object.values(this.caches)) {
            cache.clear();
        }
        console.log('🧹 所有缓存已清空');
    }

    // 清理所有过期项
    cleanupAll() {
        let totalCleaned = 0;
        for (const cache of Object.values(this.caches)) {
            totalCleaned += cache.cleanup();
        }
        return totalCleaned;
    }

    // 导出所有缓存
    exportAll() {
        const data = {};
        for (const [type, cache] of Object.entries(this.caches)) {
            data[type] = cache.export();
        }
        return data;
    }

    // 导入所有缓存
    importAll(data) {
        let totalImported = 0;
        for (const [type, cacheData] of Object.entries(data)) {
            if (this.caches[type]) {
                totalImported += this.caches[type].import(cacheData);
            }
        }
        return totalImported;
    }
}

// 创建全局实例
window.cacheManager = new GlobalCacheManager();

// 便捷方法
window.cache = {
    set: (key, value, ttl, type = 'data') => window.cacheManager.getCache(type).set(key, value, ttl),
    get: (key, type = 'data') => window.cacheManager.getCache(type).get(key),
    delete: (key, type = 'data') => window.cacheManager.getCache(type).delete(key),
    clear: (type) => type ? window.cacheManager.getCache(type).clear() : window.cacheManager.clearAll(),
    stats: () => window.cacheManager.getAllStats()
};

console.log('💾 智能缓存管理模块已加载');