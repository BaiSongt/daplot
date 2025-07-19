/**
 * 应用常量定义
 * 集中管理应用中使用的常量值
 */

// 应用信息
export const APP_INFO = {
    NAME: 'DaPlot',
    VERSION: '1.0.0',
    DESCRIPTION: '数据可视化平台',
    AUTHOR: 'DaPlot Team'
};

// API相关常量
export const API = {
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
export const FILE = {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ],
    EXTENSIONS: {
        EXCEL: ['.xlsx', '.xls'],
        CSV: ['.csv'],
        JSON: ['.json']
    }
};

// 图表相关常量
export const CHART = {
    TYPES: {
        SCATTER: 'scatter',
        LINE: 'line',
        BAR: 'bar',
        HISTOGRAM: 'histogram',
        BOX: 'box',
        HEATMAP: 'heatmap',
        PIE: 'pie',
        AREA: 'area'
    },
    COLORS: {
        DEFAULT: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
        WARM: ['#ff6b6b', '#ffa726', '#ffcc02', '#ff8a65', '#f06292'],
        COOL: ['#42a5f5', '#26c6da', '#66bb6a', '#5c6bc0', '#ab47bc'],
        PASTEL: ['#ffcdd2', '#f8bbd9', '#e1bee7', '#d1c4e9', '#c5cae9'],
        BRIGHT: ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'],
        MONOCHROME: ['#212121', '#424242', '#616161', '#757575', '#9e9e9e']
    },
    MARKERS: {
        CIRCLE: 'circle',
        SQUARE: 'square',
        DIAMOND: 'diamond',
        TRIANGLE_UP: 'triangle-up',
        TRIANGLE_DOWN: 'triangle-down',
        CROSS: 'cross',
        X: 'x'
    },
    LEGEND_POSITIONS: {
        OUTSIDE_RIGHT: 'outside-right',
        INSIDE_TOPRIGHT: 'inside-topright',
        INSIDE_TOPLEFT: 'inside-topleft',
        INSIDE_BOTTOMRIGHT: 'inside-bottomright',
        INSIDE_BOTTOMLEFT: 'inside-bottomleft',
        TOP: 'top',
        BOTTOM: 'bottom'
    }
};

// 预测算法常量
export const PREDICTION = {
    METHODS: {
        LINEAR: 'linear',
        POLYNOMIAL: 'polynomial',
        EXPONENTIAL: 'exponential',
        SVR: 'svr',
        RANDOM_FOREST: 'randomforest',
        NEURAL_NETWORK: 'neuralnetwork',
        XGBOOST: 'xgboost',
        LSTM: 'lstm'
    },
    CATEGORIES: {
        TRADITIONAL: 'traditional',
        MACHINE_LEARNING: 'machine_learning'
    },
    DEFAULT_STEPS: 10,
    MAX_STEPS: 50,
    MIN_DATA_POINTS: 3
};

// UI相关常量
export const UI = {
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark',
        AUTO: 'auto'
    },
    LANGUAGES: {
        ZH_CN: 'zh-CN',
        EN_US: 'en-US'
    },
    BREAKPOINTS: {
        MOBILE: 768,
        TABLET: 1024,
        DESKTOP: 1200
    },
    ANIMATION: {
        DURATION: {
            FAST: 150,
            NORMAL: 300,
            SLOW: 500
        },
        EASING: {
            EASE: 'ease',
            EASE_IN: 'ease-in',
            EASE_OUT: 'ease-out',
            EASE_IN_OUT: 'ease-in-out'
        }
    }
};

// 存储相关常量
export const STORAGE = {
    KEYS: {
        APP_STATE: 'daplot_app_state',
        CONFIG: 'daplot_config',
        FILE_LIST: 'daplot_file_list',
        CACHE: 'daplot_cache',
        USER_PREFERENCES: 'daplot_user_preferences'
    },
    CACHE: {
        MAX_SIZE: 100 * 1024 * 1024, // 100MB
        EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7天
        CLEANUP_INTERVAL: 24 * 60 * 60 * 1000 // 24小时
    }
};

// 事件名称常量
export const EVENTS = {
    // 应用级事件
    APP_READY: 'app.ready',
    APP_ERROR: 'app.error',
    
    // 文件相关事件
    FILE_UPLOADED: 'file.uploaded',
    FILE_SELECTED: 'file.selected',
    FILE_DELETED: 'file.deleted',
    FILE_LOADING: 'file.loading',
    FILE_LOADED: 'file.loaded',
    
    // 数据相关事件
    DATA_FILTERED: 'data.filtered',
    DATA_UPDATED: 'data.updated',
    DATA_CACHED: 'data.cached',
    
    // 图表相关事件
    CHART_CREATED: 'chart.created',
    CHART_UPDATED: 'chart.updated',
    CHART_DESTROYED: 'chart.destroyed',
    CHART_EXPORTED: 'chart.exported',
    
    // 预测相关事件
    PREDICTION_STARTED: 'prediction.started',
    PREDICTION_COMPLETED: 'prediction.completed',
    PREDICTION_FAILED: 'prediction.failed',
    
    // UI相关事件
    THEME_CHANGED: 'ui.theme_changed',
    LANGUAGE_CHANGED: 'ui.language_changed',
    LOADING_STARTED: 'ui.loading_started',
    LOADING_FINISHED: 'ui.loading_finished',
    
    // 网络相关事件
    NETWORK_ONLINE: 'network.online',
    NETWORK_OFFLINE: 'network.offline',
    API_REQUEST: 'api.request',
    API_RESPONSE: 'api.response',
    API_ERROR: 'api.error'
};

// 错误类型常量
export const ERROR_TYPES = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    FILE: 'file',
    CHART: 'chart',
    PREDICTION: 'prediction',
    STORAGE: 'storage',
    UNKNOWN: 'unknown'
};

// 状态常量
export const STATUS = {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error',
    PENDING: 'pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

// 数据类型常量
export const DATA_TYPES = {
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    DATE: 'date',
    ARRAY: 'array',
    OBJECT: 'object',
    NULL: 'null',
    UNDEFINED: 'undefined'
};

// 操作类型常量
export const OPERATIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    UPLOAD: 'upload',
    DOWNLOAD: 'download',
    EXPORT: 'export',
    IMPORT: 'import'
};

// 权限常量
export const PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin'
};

// 日志级别常量
export const LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'fatal'
};

// 正则表达式常量
export const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    PHONE: /^[\+]?[1-9][\d]{0,15}$/,
    COLOR_HEX: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    NUMBER: /^-?\d+(\.\d+)?$/,
    INTEGER: /^-?\d+$/,
    POSITIVE_NUMBER: /^\d+(\.\d+)?$/,
    CHINESE: /[\u4e00-\u9fa5]/,
    ENGLISH: /^[a-zA-Z\s]+$/
};

// 默认配置常量
export const DEFAULTS = {
    PAGE_SIZE: 20,
    TIMEOUT: 10000,
    RETRY_COUNT: 3,
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    ANIMATION_DURATION: 300,
    CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24小时
    MAX_HISTORY: 50
};

// 键盘快捷键常量
export const KEYBOARD = {
    ENTER: 'Enter',
    ESCAPE: 'Escape',
    SPACE: ' ',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    CTRL_S: 'ctrl+s',
    CTRL_Z: 'ctrl+z',
    CTRL_Y: 'ctrl+y',
    CTRL_C: 'ctrl+c',
    CTRL_V: 'ctrl+v'
};

// 环境常量
export const ENVIRONMENT = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test'
};

// 获取当前环境
export const getCurrentEnvironment = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return ENVIRONMENT.DEVELOPMENT;
    }
    return ENVIRONMENT.PRODUCTION;
};

// 检查是否为开发环境
export const isDevelopment = () => getCurrentEnvironment() === ENVIRONMENT.DEVELOPMENT;

// 检查是否为生产环境
export const isProduction = () => getCurrentEnvironment() === ENVIRONMENT.PRODUCTION;

// 默认导出
export default {
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