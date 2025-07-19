/**
 * 数据格式化工具库
 * 提供常用的数据格式化函数
 */

// 数字格式化
export const formatNumber = (value, options = {}) => {
    const {
        decimals = 2,
        thousandsSeparator = ',',
        decimalSeparator = '.',
        prefix = '',
        suffix = ''
    } = options;

    if (typeof value !== 'number' || isNaN(value)) {
        return value;
    }

    let formatted = value.toFixed(decimals);
    
    // 分离整数和小数部分
    const parts = formatted.split('.');
    
    // 添加千位分隔符
    if (thousandsSeparator) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    }
    
    // 重新组合
    formatted = parts.join(decimalSeparator);
    
    return prefix + formatted + suffix;
};

export const formatCurrency = (value, currency = 'CNY', locale = 'zh-CN') => {
    if (typeof value !== 'number' || isNaN(value)) {
        return value;
    }

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(value);
    } catch (error) {
        return formatNumber(value, { prefix: '¥', decimals: 2 });
    }
};

export const formatPercentage = (value, decimals = 1) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return value;
    }

    return formatNumber(value * 100, { decimals, suffix: '%' });
};

export const formatFileSize = (bytes, decimals = 2) => {
    if (typeof bytes !== 'number' || bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return formatNumber(bytes / Math.pow(k, i), { decimals }) + ' ' + sizes[i];
};

// 日期时间格式化
export const formatDate = (date, format = 'YYYY-MM-DD') => {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    const formatMap = {
        'YYYY': year,
        'MM': month,
        'DD': day,
        'HH': hours,
        'mm': minutes,
        'ss': seconds
    };

    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => formatMap[match]);
};

export const formatDateTime = (date) => {
    return formatDate(date, 'YYYY-MM-DD HH:mm:ss');
};

export const formatTime = (date) => {
    return formatDate(date, 'HH:mm:ss');
};

export const formatRelativeTime = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const target = new Date(date);
    const diffMs = now - target;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return formatDate(date);
};

// 字符串格式化
export const formatString = (template, values) => {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return values.hasOwnProperty(key) ? values[key] : match;
    });
};

export const truncateString = (str, maxLength, suffix = '...') => {
    if (typeof str !== 'string') return str;
    if (str.length <= maxLength) return str;
    
    return str.substring(0, maxLength - suffix.length) + suffix;
};

export const capitalizeFirst = (str) => {
    if (typeof str !== 'string' || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const capitalizeWords = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/\b\w/g, char => char.toUpperCase());
};

export const camelCase = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
};

export const kebabCase = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/([a-z])([A-Z])/g, '$1-$2')
              .replace(/[\s_]+/g, '-')
              .toLowerCase();
};

export const snakeCase = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/([a-z])([A-Z])/g, '$1_$2')
              .replace(/[\s-]+/g, '_')
              .toLowerCase();
};

// 数组格式化
export const formatArray = (arr, options = {}) => {
    if (!Array.isArray(arr)) return arr;
    
    const {
        separator = ', ',
        lastSeparator = ' 和 ',
        maxItems = null,
        moreText = '等'
    } = options;

    let items = [...arr];
    let hasMore = false;

    if (maxItems && items.length > maxItems) {
        items = items.slice(0, maxItems);
        hasMore = true;
    }

    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(lastSeparator);

    const lastItem = items.pop();
    let result = items.join(separator) + lastSeparator + lastItem;
    
    if (hasMore) {
        result += separator + moreText;
    }

    return result;
};

export const formatList = (arr, formatter = null) => {
    if (!Array.isArray(arr)) return arr;
    
    if (formatter && typeof formatter === 'function') {
        return arr.map(formatter);
    }
    
    return arr;
};

// 对象格式化
export const formatObject = (obj, options = {}) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const {
        keyFormatter = (key) => key,
        valueFormatter = (value) => value,
        separator = ': ',
        entrySeparator = ', '
    } = options;

    return Object.entries(obj)
        .map(([key, value]) => `${keyFormatter(key)}${separator}${valueFormatter(value)}`)
        .join(entrySeparator);
};

// 颜色格式化
export const formatColor = (color, format = 'hex') => {
    if (typeof color !== 'string') return color;

    // 简单的颜色格式转换
    if (format === 'hex' && color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
            const [r, g, b] = matches.map(Number);
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
    }
    
    return color;
};

// 数据表格格式化
export const formatTableData = (data, columns) => {
    if (!Array.isArray(data)) return data;
    
    return data.map(row => {
        const formattedRow = {};
        
        columns.forEach(column => {
            const { key, formatter } = column;
            const value = row[key];
            
            if (formatter && typeof formatter === 'function') {
                formattedRow[key] = formatter(value, row);
            } else {
                formattedRow[key] = value;
            }
        });
        
        return formattedRow;
    });
};

// URL格式化
export const formatUrl = (url, params = {}) => {
    if (typeof url !== 'string') return url;
    
    try {
        const urlObj = new URL(url);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                urlObj.searchParams.set(key, value);
            }
        });
        
        return urlObj.toString();
    } catch (error) {
        return url;
    }
};

// 电话号码格式化
export const formatPhoneNumber = (phone, format = 'xxx-xxxx-xxxx') => {
    if (typeof phone !== 'string') return phone;
    
    const cleaned = phone.replace(/\D/g, '');
    
    if (format === 'xxx-xxxx-xxxx' && cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    
    return phone;
};

// 身份证号格式化
export const formatIdCard = (idCard) => {
    if (typeof idCard !== 'string') return idCard;
    
    const cleaned = idCard.replace(/\s/g, '');
    
    if (cleaned.length === 18) {
        return `${cleaned.slice(0, 6)} ${cleaned.slice(6, 14)} ${cleaned.slice(14)}`;
    }
    
    return idCard;
};

// 银行卡号格式化
export const formatBankCard = (cardNumber) => {
    if (typeof cardNumber !== 'string') return cardNumber;
    
    const cleaned = cardNumber.replace(/\s/g, '');
    
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
};

// HTML转义
export const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    
    return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
};

export const unescapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    
    const htmlUnescapes = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'"
    };
    
    return str.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => htmlUnescapes[entity]);
};

// 创建自定义格式化器
export const createFormatter = (formatFn, defaultOptions = {}) => {
    return (value, options = {}) => {
        const finalOptions = { ...defaultOptions, ...options };
        return formatFn(value, finalOptions);
    };
};

// 格式化器组合
export const composeFormatters = (...formatters) => {
    return (value) => {
        return formatters.reduce((result, formatter) => {
            return typeof formatter === 'function' ? formatter(result) : result;
        }, value);
    };
};

// 默认导出
export default {
    // 数字格式化
    formatNumber, formatCurrency, formatPercentage, formatFileSize,
    
    // 日期时间格式化
    formatDate, formatDateTime, formatTime, formatRelativeTime,
    
    // 字符串格式化
    formatString, truncateString, capitalizeFirst, capitalizeWords,
    camelCase, kebabCase, snakeCase,
    
    // 数组和对象格式化
    formatArray, formatList, formatObject,
    
    // 其他格式化
    formatColor, formatTableData, formatUrl,
    formatPhoneNumber, formatIdCard, formatBankCard,
    
    // HTML处理
    escapeHtml, unescapeHtml,
    
    // 工具函数
    createFormatter, composeFormatters
};