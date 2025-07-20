/**
 * 应用常量定义
 * 集中管理应用中使用的常量值
 */

// 应用信息
const APP_INFO = {
    NAME: 'DaPlot',
    VERSION: '1.0.0',
    DESCRIPTION: '数据可视化平台',
    AUTHOR: 'DaPlot Team'
};

// API相关常量
const API = {
    BASE_URL: 'http://localhost:8001',
    ENDPOINTS: {
        UPLOAD: '/api/upload',
        FILES: '/api/files',
        FILE: '/api/file',
        FILTER: '/api/filter',
        PLOT_DATA: '/api/plot_data',
        PREDICT: '/api/predict',
        PREDICT_DIRECT: '/api/predict_direct',
        UNIQUE_VALUES: '/api/unique_values',
        SAVE: '/api/save',
        CLEAR: '/api/files/clear'
    },
    TIMEOUT: {
        DEFAULT: 10000,
        UPLOAD: 60000,
        DOWNLOAD: 30000
    },
    RETRY: {
        COUNT: 3,
        DELAY: 1000
    }
};

// 文件相关常量
const FILE = {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ],
    EXTENSIONS: {
        EXCEL: ['.xlsx', '.xls'],
        CSV: ['.csv']
    }
};

// 图表相关常量
const CHART = {
    TYPES: {
        SCATTER: 'scatter',
        LINE: 'line',
        BAR: 'bar',
        HISTOGRAM: 'histogram',
        BOX: 'box',
        HEATMAP: 'heatmap',
        PIE: 'pie'
    },
    COLORS: {
        PRIMARY: '#007bff',
        SUCCESS: '#28a745',
        WARNING: '#ffc107',
        DANGER: '#dc3545',
        INFO: '#17a2b8'
    },
    THEMES: {
        DEFAULT: 'plotly_white',
        DARK: 'plotly_dark'
    }
};

// 预测算法常量
const PREDICTION = {
    METHODS: {
        LINEAR: 'linear',
        POLYNOMIAL: 'polynomial',
        SVR: 'svr',
        RANDOM_FOREST: 'randomforest',
        NEURAL_NETWORK: 'neuralnetwork'
    },
    DEFAULT_STEPS: 10,
    MAX_STEPS: 100,
    MIN_DATA_POINTS: 3
};

// UI相关常量
const UI = {
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark',
        AUTO: 'auto'
    },
    BREAKPOINTS: {
        MOBILE: 768,
        TABLET: 1024,
        DESKTOP: 1200
    },
    ANIMATION: {
        DURATION: 300,
        EASING: 'ease-in-out'
    }
};

// 存储相关常量
const STORAGE = {
    KEYS: {
        APP_STATE: 'daplot_app_state',
        USER_PREFERENCES: 'daplot_user_preferences',
        CACHE: 'daplot_cache',
        TEMP_DATA: 'daplot_temp_data'
    },
    TTL: {
        DEFAULT: 24 * 60 * 60 * 1000, // 24小时
        SHORT: 5 * 60 * 1000, // 5分钟
        LONG: 7 * 24 * 60 * 60 * 1000 // 7天
    }
};

// 事件名称常量
const EVENTS = {
    // 应用级事件
    APP_READY: 'app.ready',
    APP_ERROR: 'app.error',
    
    // 文件事件
    FILE_UPLOADED: 'file.uploaded',
    FILE_SELECTED: 'file.selected',
    FILE_DELETED: 'file.deleted',
    
    // 数据事件
    DATA_LOADED: 'data.loaded',
    DATA_FILTERED: 'data.filtered',
    DATA_UPDATED: 'data.updated',
    
    // 图表事件
    CHART_CREATED: 'chart.created',
    CHART_UPDATED: 'chart.updated',
    CHART_EXPORTED: 'chart.exported',
    
    // 预测事件
    PREDICTION_STARTED: 'prediction.started',
    PREDICTION_COMPLETED: 'prediction.completed',
    PREDICTION_FAILED: 'prediction.failed'
};

// 错误类型常量
const ERROR_TYPES = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    FILE: 'file',
    CHART: 'chart',
    PREDICTION: 'prediction'
};

// 状态常量
const STATUS = {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error',
    PENDING: 'pending'
};

// 数据类型常量
const DATA_TYPES = {
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    DATE: 'date',
    OBJECT: 'object',
    ARRAY: 'array'
};

// 操作类型常量
const OPERATIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    UPLOAD: 'upload',
    DOWNLOAD: 'download'
};

// 权限常量
const PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete'
};

// 日志级别常量
const LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

// 正则表达式常量
const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    PHONE: /^[\+]?[1-9][\d]{0,15}$/,
    NUMBER: /^-?\d*\.?\d+$/,
    INTEGER: /^-?\d+$/,
    POSITIVE_NUMBER: /^\d*\.?\d+$/,
    POSITIVE_INTEGER: /^\d+$/
};

// 默认配置常量
const DEFAULTS = {
    PAGE_SIZE: 20,
    TIMEOUT: 10000,
    RETRY_COUNT: 3,
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100
};

// 键盘快捷键常量
const KEYBOARD = {
    ENTER: 'Enter',
    ESCAPE: 'Escape',
    SPACE: ' ',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight'
};

// 环境常量
const ENVIRONMENT = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test'
};

// 获取当前环境
const getCurrentEnvironment = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return ENVIRONMENT.DEVELOPMENT;
    }
    return ENVIRONMENT.PRODUCTION;
};

// 检查是否为开发环境
const isDevelopment = () => getCurrentEnvironment() === ENVIRONMENT.DEVELOPMENT;

// 检查是否为生产环境
const isProduction = () => getCurrentEnvironment() === ENVIRONMENT.PRODUCTION;

// 全局导出
const CONSTANTS = {
    APP_INFO,
    API,
    FILE,
    CHART,
    PREDICTION,
    UI,
    STORAGE,
    EVENTS,
    ERROR_TYPES,
    STATUS,
    DATA_TYPES,
    OPERATIONS,
    PERMISSIONS,
    LOG_LEVELS,
    REGEX,
    DEFAULTS,
    KEYBOARD,
    ENVIRONMENT,
    getCurrentEnvironment,
    isDevelopment,
    isProduction
};

// 导出到全局
window.CONSTANTS = CONSTANTS;

// 为了向后兼容，也导出各个常量
Object.assign(window, CONSTANTS);

console.log('📋 常量模块已加载');