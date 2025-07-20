/**
 * 工具函数集合
 * 提供常用的工具函数，提高开发效率
 */

// 防抖函数
const debounce = (func, wait, immediate = false) => {
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
const throttle = (func, limit) => {
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
const deepClone = (obj) => {
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
const deepMerge = (target, ...sources) => {
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
const isObject = (item) => {
    return item && typeof item === 'object' && !Array.isArray(item);
};

// 获取嵌套对象属性
const getNestedProperty = (obj, path, defaultValue = undefined) => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result === null || result === undefined || !(key in result)) {
            return defaultValue;
        }
        result = result[key];
    }
    return result;
};

// 设置嵌套对象属性
const setNestedProperty = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
        if (!(key in current) || !isObject(current[key])) {
            current[key] = {};
        }
        current = current[key];
    }
    current[lastKey] = value;
};

// 数组去重
const uniqueArray = (arr, key = null) => {
    if (!Array.isArray(arr)) return arr;
    
    if (key) {
        const seen = new Set();
        return arr.filter(item => {
            const keyValue = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(keyValue)) {
                return false;
            }
            seen.add(keyValue);
            return true;
        });
    }
    return [...new Set(arr)];
};

// 数组分组
const groupBy = (arr, key) => {
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
const sortBy = (arr, key, order = 'asc') => {
    if (!Array.isArray(arr)) return arr;
    
    return [...arr].sort((a, b) => {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        
        if (order === 'desc') {
            return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
};

// 数组分页
const paginate = (arr, page, pageSize) => {
    if (!Array.isArray(arr)) return { data: [], total: 0, page, pageSize };
    
    const total = arr.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const data = arr.slice(startIndex, endIndex);
    
    return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    };
};

// 随机数生成
const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomFloat = (min, max, decimals = 2) => {
    const random = Math.random() * (max - min) + min;
    return parseFloat(random.toFixed(decimals));
};

const randomString = (length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const randomId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// UUID生成
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// 颜色工具
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const getContrastColor = (hexColor) => {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return '#000000';
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
};

// 数学工具
const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};

const lerp = (start, end, factor) => {
    return start + (end - start) * factor;
};

const roundTo = (value, decimals) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
};

const average = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

const sum = (arr) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((sum, val) => sum + val, 0);
};

const median = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// 字符串工具
const slugify = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const capitalize = (str) => {
    if (typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const removeAccents = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// 日期工具
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const diffDays = (date1, date2) => {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

const isYesterday = (date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
};

// URL工具
const getUrlParams = (url = window.location.href) => {
    const urlObj = new URL(url);
    const params = {};
    urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return params;
};

const buildUrl = (baseUrl, params = {}) => {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            url.searchParams.set(key, value);
        }
    });
    return url.toString();
};

// 存储工具
const storage = {
    set: (key, value, expiry = null) => {
        const item = {
            value,
            expiry: expiry ? Date.now() + expiry : null
        };
        localStorage.setItem(key, JSON.stringify(item));
    },
    
    get: (key) => {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        
        try {
            const item = JSON.parse(itemStr);
            if (item.expiry && Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            return item.value;
        } catch (e) {
            return null;
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
const measureTime = (fn, label = 'Operation') => {
    return async (...args) => {
        const start = performance.now();
        const result = await fn(...args);
        const end = performance.now();
        console.log(`${label} took ${end - start} milliseconds`);
        return result;
    };
};

const memoize = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
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
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const retry = async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt === maxAttempts) break;
            await sleep(delay);
        }
    }
    
    throw lastError;
};

const timeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timed out')), ms)
        )
    ]);
};

// 事件工具
const once = (fn) => {
    let called = false;
    return (...args) => {
        if (!called) {
            called = true;
            return fn(...args);
        }
    };
};

const createEventEmitter = () => {
    const events = {};
    
    return {
        on: (event, callback) => {
            if (!events[event]) events[event] = [];
            events[event].push(callback);
        },
        off: (event, callback) => {
            if (events[event]) {
                events[event] = events[event].filter(cb => cb !== callback);
            }
        },
        emit: (event, ...args) => {
            if (events[event]) {
                events[event].forEach(callback => callback(...args));
            }
        }
    };
};

// 类型检查工具
const getType = (value) => {
    return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
};

const isPromise = (value) => {
    return value && typeof value.then === 'function';
};

const isElement = (value) => {
    return value instanceof Element || value instanceof HTMLDocument;
};

// 全局导出
const helpers = {
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
    
    // 类型检查工具
    getType, isPromise, isElement
};

// 导出到全局
window.helpers = helpers;

// 为了向后兼容，也导出各个函数
Object.assign(window, helpers);

console.log('🔧 工具函数模块已加载');