// Jest测试环境设置
require('@testing-library/jest-dom');

// 模拟全局对象
const fetchMock = require('jest-fetch-mock');
global.fetch = fetchMock;

// 模拟localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// 模拟sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(global, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
});

// 模拟console方法以避免测试输出污染
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// 模拟window对象的一些属性
Object.defineProperty(window, 'location', {
    value: {
        href: 'http://localhost',
        origin: 'http://localhost',
        pathname: '/',
        search: '',
        hash: '',
        reload: jest.fn(),
    },
    writable: true,
});

// 模拟performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
};

// 模拟IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    observe() { }
    unobserve() { }
    disconnect() { }
};

// 模拟ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() { }
    observe() { }
    unobserve() { }
    disconnect() { }
};

// 设置测试超时
jest.setTimeout(10000);

// 在每个测试前清理模拟
beforeEach(() => {
    fetch.resetMocks();
    localStorage.clear();
    sessionStorage.clear();

    // 清理DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // 重置console模拟
    console.log.mockClear();
    console.debug.mockClear();
    console.info.mockClear();
    console.warn.mockClear();
    console.error.mockClear();
});

// 在每个测试后清理
afterEach(() => {
    // 清理任何剩余的定时器
    jest.clearAllTimers();

    // 清理事件监听器
    window.removeAllListeners?.();
});