/**
 * 事件总线模块
 * 实现发布订阅模式，支持组件间解耦通信
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Set();
        this.namespaces = new Map();
        this.debugMode = false;
    }

    // 启用调试模式
    enableDebug(enabled = true) {
        this.debugMode = enabled;
    }

    // 调试日志
    debug(message, ...args) {
        if (this.debugMode) {
            console.log(`[EventBus] ${message}`, ...args);
        }
    }

    // 解析事件名称（支持命名空间）
    parseEventName(eventName) {
        const parts = eventName.split('.');
        return {
            namespace: parts.length > 1 ? parts[0] : null,
            event: parts.length > 1 ? parts.slice(1).join('.') : eventName,
            fullName: eventName
        };
    }

    // 订阅事件
    on(eventName, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('回调函数必须是一个函数');
        }

        const { namespace, event, fullName } = this.parseEventName(eventName);
        
        if (!this.events.has(fullName)) {
            this.events.set(fullName, []);
        }

        const listener = {
            callback,
            context,
            namespace,
            event,
            id: Symbol('listener')
        };

        this.events.get(fullName).push(listener);

        // 如果有命名空间，也要记录
        if (namespace) {
            if (!this.namespaces.has(namespace)) {
                this.namespaces.set(namespace, new Set());
            }
            this.namespaces.get(namespace).add(fullName);
        }

        this.debug(`订阅事件: ${fullName}`, { callback: callback.name, context });

        // 返回取消订阅函数
        return () => this.off(eventName, callback);
    }

    // 一次性订阅
    once(eventName, callback, context = null) {
        const { fullName } = this.parseEventName(eventName);
        
        const onceCallback = (...args) => {
            this.off(eventName, onceCallback);
            this.onceEvents.delete(fullName);
            return callback.apply(context, args);
        };

        this.onceEvents.add(fullName);
        return this.on(eventName, onceCallback, context);
    }

    // 取消订阅
    off(eventName, callback = null) {
        const { fullName } = this.parseEventName(eventName);

        if (!this.events.has(fullName)) {
            return false;
        }

        const listeners = this.events.get(fullName);

        if (callback) {
            // 移除特定回调
            const index = listeners.findIndex(listener => listener.callback === callback);
            if (index !== -1) {
                listeners.splice(index, 1);
                this.debug(`取消订阅: ${fullName}`, { callback: callback.name });
                
                // 如果没有监听器了，删除事件
                if (listeners.length === 0) {
                    this.events.delete(fullName);
                }
                return true;
            }
        } else {
            // 移除所有回调
            this.events.delete(fullName);
            this.debug(`取消所有订阅: ${fullName}`);
            return true;
        }

        return false;
    }

    // 取消命名空间下的所有订阅
    offNamespace(namespace) {
        if (!this.namespaces.has(namespace)) {
            return false;
        }

        const eventNames = this.namespaces.get(namespace);
        let count = 0;

        for (const eventName of eventNames) {
            if (this.events.has(eventName)) {
                this.events.delete(eventName);
                count++;
            }
        }

        this.namespaces.delete(namespace);
        this.debug(`取消命名空间订阅: ${namespace}`, { count });
        
        return count > 0;
    }

    // 发送事件
    emit(eventName, data = null) {
        const { fullName } = this.parseEventName(eventName);
        
        if (!this.events.has(fullName)) {
            this.debug(`没有监听器: ${fullName}`);
            return false;
        }

        const listeners = [...this.events.get(fullName)]; // 复制数组避免在回调中修改
        let successCount = 0;

        this.debug(`发送事件: ${fullName}`, { data, listenerCount: listeners.length });

        for (const listener of listeners) {
            try {
                const result = listener.callback.call(listener.context, data, eventName);
                
                // 支持异步回调
                if (result instanceof Promise) {
                    result.catch(error => {
                        console.error(`事件回调异步错误 [${fullName}]:`, error);
                    });
                }
                
                successCount++;
            } catch (error) {
                console.error(`事件回调错误 [${fullName}]:`, error);
                // 继续执行其他回调，不因一个错误而中断
            }
        }

        return successCount > 0;
    }

    // 异步发送事件
    async emitAsync(eventName, data = null) {
        const { fullName } = this.parseEventName(eventName);
        
        if (!this.events.has(fullName)) {
            this.debug(`没有监听器: ${fullName}`);
            return [];
        }

        const listeners = [...this.events.get(fullName)];
        const results = [];

        this.debug(`异步发送事件: ${fullName}`, { data, listenerCount: listeners.length });

        for (const listener of listeners) {
            try {
                const result = await listener.callback.call(listener.context, data, eventName);
                results.push({ success: true, result });
            } catch (error) {
                console.error(`异步事件回调错误 [${fullName}]:`, error);
                results.push({ success: false, error });
            }
        }

        return results;
    }

    // 发送通配符事件
    emitPattern(pattern, data = null) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        let count = 0;

        for (const eventName of this.events.keys()) {
            if (regex.test(eventName)) {
                if (this.emit(eventName, data)) {
                    count++;
                }
            }
        }

        this.debug(`通配符事件发送: ${pattern}`, { matchCount: count });
        return count;
    }

    // 获取事件统计信息
    getStats() {
        const stats = {
            totalEvents: this.events.size,
            totalListeners: 0,
            namespaces: this.namespaces.size,
            onceEvents: this.onceEvents.size,
            events: {}
        };

        for (const [eventName, listeners] of this.events) {
            stats.totalListeners += listeners.length;
            stats.events[eventName] = {
                listenerCount: listeners.length,
                hasOnce: this.onceEvents.has(eventName)
            };
        }

        return stats;
    }

    // 清除所有事件
    clear() {
        const stats = this.getStats();
        this.events.clear();
        this.onceEvents.clear();
        this.namespaces.clear();
        
        this.debug('清除所有事件', stats);
        return stats;
    }

    // 检查是否有监听器
    hasListeners(eventName) {
        const { fullName } = this.parseEventName(eventName);
        return this.events.has(fullName) && this.events.get(fullName).length > 0;
    }

    // 获取监听器数量
    getListenerCount(eventName) {
        const { fullName } = this.parseEventName(eventName);
        return this.events.has(fullName) ? this.events.get(fullName).length : 0;
    }

    // 列出所有事件名称
    getEventNames() {
        return Array.from(this.events.keys());
    }

    // 创建子事件总线（命名空间隔离）
    createNamespace(namespace) {
        return {
            on: (event, callback, context) => this.on(`${namespace}.${event}`, callback, context),
            once: (event, callback, context) => this.once(`${namespace}.${event}`, callback, context),
            off: (event, callback) => this.off(`${namespace}.${event}`, callback),
            emit: (event, data) => this.emit(`${namespace}.${event}`, data),
            emitAsync: (event, data) => this.emitAsync(`${namespace}.${event}`, data),
            clear: () => this.offNamespace(namespace)
        };
    }
}

// 导出类和全局实例
window.EventBus = EventBus;
window.eventBus = new EventBus();

// 开发环境启用调试
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.eventBus.enableDebug(true);
}