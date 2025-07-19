/**
 * 辅助函数工具库
 * 提供常用的辅助函数和工具方法
 */

// 防抖函数
export const debounce = (func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
};

// 节流函数
export const throttle = (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// 深拷贝
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
};

// 深度合并对象
export const deepMerge = (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                deepMerge(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return deepMerge(target, ...sources);
};

// 判断是否为对象
export const isObject = (item) => {
    return item && typeof item === 'object' && !Array.isArray(item);
};

// 获取嵌套对象属性
export const getNestedProperty = (obj, path, defaultValue = undefined) => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result === null || result === undefined || !result.hasOwnProperty(key)) {
            return defaultValue;
        }
        result = result[key];
    }
    
    return result;
};

// 设置嵌套对象属性
export const setNestedProperty = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
    return obj;
};

// 数组去重
export const uniqueArray = (arr, key = null) => {
    if (!Array.isArray(arr)) return arr;
    
    if (key) {
        const seen = new Set();
        return arr.filter(item => {
            const value = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }
    
    return [...new Set(arr)];
};

// 数组分组
export const groupBy = (arr, key) => {
    if (!Array.isArray(arr)) return {};
    
    return arr.reduce((groups, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
    }, {});
};

// 数组排序
export const sortBy = (arr, key, order = 'asc') => {
    if (!Array.isArray(arr)) return arr;
    
    return [...arr].sort((a, b) => {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });
};

// 数组分页
export const paginate = (arr, page, pageSize) => {
    if (!Array.isArray(arr)) return { data: [], total: 0, page, pageSize };
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
        data: arr.slice(startIndex, endIndex),
        total: arr.length,
        page,
        pageSize,
        totalPages: Math.ceil(arr.length / pageSize)
    };
};

// 随机数生成
export const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomFloat = (min, max, decimals = 2) => {
    const random = Math.random() * (max - min) + min;
    return parseFloat(random.toFixed(decimals));
};

export const randomString = (length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const randomId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// UUID生成
export const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// 颜色工具
export const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

export const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const getContrastColor = (hexColor) => {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return '#000000';
    
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
};

// 数学工具
export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};

export const lerp = (start, end, factor) => {
    return start + (end - start) * factor;
};

export const roundTo = (value, decimals) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
};

export const average = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

export const sum = (arr) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((sum, val) => sum + val, 0);
};

export const median = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// 字符串工具
export const slugify = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

export const capitalize = (str) => {
    if (typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const removeAccents = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// 日期工具
export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const diffDays = (date1, date2) => {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

export const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

export const isYesterday = (date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
};

// URL工具
export const getUrlParams = (url = window.location.href) => {
    const urlObj = new URL(url);
    const params = {};
    for (const [key, value] of urlObj.searchParams) {
        params[key] = value;
    }
    return params;
};

export const buildUrl = (baseUrl, params = {}) => {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            url.searchParams.set(key, value);
        }
    });
    return url.toString();
};

// 存储工具
export const storage = {
    set: (key, value, expiry = null) => {
        const item = {
            value,
            expiry: expiry ? Date.now() + expiry : null
        };
        localStorage.setItem(key, JSON.stringify(item));
    },
    
    get: (key, defaultValue = null) => {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return defaultValue;
            
            const item = JSON.parse(itemStr);
            
            if (item.expiry && Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return defaultValue;
            }
            
            return item.value;
        } catch (error) {
            return defaultValue;
        }
    },
    
    remove: (key) => {
        localStorage.removeItem(key);
    },
    
    clear: () => {
        localStorage.clear();
    }
};

// 性能工具
export const measureTime = (fn, label = 'Operation') => {
    return async (...args) => {
        const start = performance.now();
        const result = await fn(...args);
        const end = performance.now();
        console.log(`${label} took ${(end - start).toFixed(2)} milliseconds`);
        return result;
    };
};

export const memoize = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
    const cache = new Map();
    
    return (...args) => {
        const key = keyGenerator(...args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

// 异步工具
export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts) {
                throw lastError;
            }
            
            await sleep(delay * attempt);
        }
    }
};

export const timeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timed out')), ms)
        )
    ]);
};

// 事件工具
export const once = (fn) => {
    let called = false;
    return (...args) => {
        if (!called) {
            called = true;
            return fn(...args);
        }
    };
};

export const createEventEmitter = () => {
    const events = {};
    
    return {
        on: (event, callback) => {
            if (!events[event]) events[event] = [];
            events[event].push(callback);
        },
        
        off: (event, callback) => {
            if (!events[event]) return;
            events[event] = events[event].filter(cb => cb !== callback);
        },
        
        emit: (event, ...args) => {
            if (!events[event]) return;
            events[event].forEach(callback => callback(...args));
        }
    };
};

// 类型检查工具
export const getType = (value) => {
    return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
};

export const isPromise = (value) => {
    return value && typeof value.then === 'function';
};

export const isElement = (value) => {
    return value instanceof Element || value instanceof HTMLDocument;
};

// 默认导出
export default {
    // 函数工具
    debounce, throttle, once, memoize,
    
    // 对象工具
    deepClone, deepMerge, isObject, getNestedProperty, setNestedProperty,
    
    // 数组工具
    uniqueArray, groupBy, sortBy, paginate,
    
    // 随机工具
    randomInt, randomFloat, randomString, randomId, generateUUID,
    
    // 颜色工具
    hexToRgb, rgbToHex, getContrastColor,
    
    // 数学工具
    clamp, lerp, roundTo, average, sum, median,
    
    // 字符串工具
    slugify, capitalize, removeAccents,
    
    // 日期工具
    addDays, diffDays, isToday, isYesterday,
    
    // URL工具
    getUrlParams, buildUrl,
    
    // 存储工具
    storage,
    
    // 性能工具
    measureTime,
    
    // 异步工具
    sleep, retry, timeout,
    
    // 事件工具
    createEventEmitter,
    
    // 类型检查
    getType, isPromise, isElement
};