/**
 * 轻量级单元测试框架
 * 专为DaPlot项目设计的测试工具
 */

class TestFramework {
    constructor() {
        this.tests = [];
        this.suites = new Map();
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0
        };
        this.startTime = null;
        this.endTime = null;
    }

    // 创建测试套件
    describe(suiteName, callback) {
        const suite = {
            name: suiteName,
            tests: [],
            beforeEach: null,
            afterEach: null,
            beforeAll: null,
            afterAll: null
        };

        this.suites.set(suiteName, suite);
        
        // 设置当前套件上下文
        this.currentSuite = suite;
        
        // 执行测试定义
        callback();
        
        // 清除当前套件上下文
        this.currentSuite = null;
    }

    // 定义测试用例
    it(testName, testFunction) {
        const test = {
            name: testName,
            function: testFunction,
            suite: this.currentSuite?.name || 'default',
            status: 'pending',
            error: null,
            duration: 0
        };

        if (this.currentSuite) {
            this.currentSuite.tests.push(test);
        }
        
        this.tests.push(test);
    }

    // 设置前置条件
    beforeEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = callback;
        }
    }

    afterEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = callback;
        }
    }

    beforeAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = callback;
        }
    }

    afterAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = callback;
        }
    }

    // 断言方法
    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${actual} to be ${expected}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected ${actual} to be truthy`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected ${actual} to be falsy`);
                }
            },
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            toThrow: () => {
                let threw = false;
                try {
                    if (typeof actual === 'function') {
                        actual();
                    }
                } catch (error) {
                    threw = true;
                }
                if (!threw) {
                    throw new Error('Expected function to throw an error');
                }
            },
            toBeInstanceOf: (expectedClass) => {
                if (!(actual instanceof expectedClass)) {
                    throw new Error(`Expected ${actual} to be instance of ${expectedClass.name}`);
                }
            },
            toHaveProperty: (property) => {
                if (!(property in actual)) {
                    throw new Error(`Expected object to have property ${property}`);
                }
            }
        };
    }

    // 运行所有测试
    async runAll() {
        console.log('🧪 开始运行测试...');
        this.startTime = performance.now();
        
        // 按套件运行测试
        for (const [suiteName, suite] of this.suites) {
            await this.runSuite(suite);
        }
        
        // 运行没有套件的测试
        const defaultTests = this.tests.filter(test => test.suite === 'default');
        if (defaultTests.length > 0) {
            await this.runTests(defaultTests);
        }
        
        this.endTime = performance.now();
        this.generateReport();
    }

    // 运行测试套件
    async runSuite(suite) {
        console.log(`📋 运行测试套件: ${suite.name}`);
        
        // 执行 beforeAll
        if (suite.beforeAll) {
            try {
                await suite.beforeAll();
            } catch (error) {
                console.error(`❌ ${suite.name} beforeAll 失败:`, error);
            }
        }
        
        // 运行套件中的测试
        await this.runTests(suite.tests, suite);
        
        // 执行 afterAll
        if (suite.afterAll) {
            try {
                await suite.afterAll();
            } catch (error) {
                console.error(`❌ ${suite.name} afterAll 失败:`, error);
            }
        }
    }

    // 运行测试列表
    async runTests(tests, suite = null) {
        for (const test of tests) {
            await this.runTest(test, suite);
        }
    }

    // 运行单个测试
    async runTest(test, suite = null) {
        const startTime = performance.now();
        
        try {
            // 执行 beforeEach
            if (suite?.beforeEach) {
                await suite.beforeEach();
            }
            
            // 执行测试
            await test.function();
            
            // 执行 afterEach
            if (suite?.afterEach) {
                await suite.afterEach();
            }
            
            test.status = 'passed';
            this.results.passed++;
            console.log(`✅ ${test.name}`);
            
        } catch (error) {
            test.status = 'failed';
            test.error = error;
            this.results.failed++;
            console.error(`❌ ${test.name}:`, error.message);
        }
        
        test.duration = performance.now() - startTime;
        this.results.total++;
    }

    // 生成测试报告
    generateReport() {
        const duration = this.endTime - this.startTime;
        const passRate = (this.results.passed / this.results.total * 100).toFixed(1);
        
        console.log('\n📊 测试报告');
        console.log('='.repeat(50));
        console.log(`总测试数: ${this.results.total}`);
        console.log(`通过: ${this.results.passed}`);
        console.log(`失败: ${this.results.failed}`);
        console.log(`跳过: ${this.results.skipped}`);
        console.log(`通过率: ${passRate}%`);
        console.log(`总耗时: ${duration.toFixed(2)}ms`);
        console.log('='.repeat(50));
        
        // 显示失败的测试
        if (this.results.failed > 0) {
            console.log('\n❌ 失败的测试:');
            this.tests
                .filter(test => test.status === 'failed')
                .forEach(test => {
                    console.log(`  • ${test.name}: ${test.error.message}`);
                });
        }
        
        return {
            ...this.results,
            passRate: parseFloat(passRate),
            duration: duration,
            tests: this.tests
        };
    }

    // 创建模拟对象
    mock(object, method) {
        const originalMethod = object[method];
        const calls = [];
        
        const mockFunction = (...args) => {
            calls.push(args);
            return mockFunction.returnValue;
        };
        
        mockFunction.returnValue = undefined;
        mockFunction.calls = calls;
        mockFunction.restore = () => {
            object[method] = originalMethod;
        };
        mockFunction.mockReturnValue = (value) => {
            mockFunction.returnValue = value;
            return mockFunction;
        };
        mockFunction.mockImplementation = (implementation) => {
            object[method] = implementation;
            return mockFunction;
        };
        
        object[method] = mockFunction;
        return mockFunction;
    }

    // 创建间谍函数
    spy(object, method) {
        const originalMethod = object[method];
        const calls = [];
        
        object[method] = (...args) => {
            calls.push(args);
            return originalMethod.apply(object, args);
        };
        
        object[method].calls = calls;
        object[method].restore = () => {
            object[method] = originalMethod;
        };
        
        return object[method];
    }

    // 异步测试辅助
    async waitFor(condition, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error(`Condition not met within ${timeout}ms`);
    }

    // DOM 测试辅助
    createTestElement(tag = 'div', attributes = {}) {
        const element = document.createElement(tag);
        
        for (const [key, value] of Object.entries(attributes)) {
            element.setAttribute(key, value);
        }
        
        document.body.appendChild(element);
        
        // 自动清理
        this.afterEach(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        return element;
    }
}

// 创建全局测试实例
const testFramework = new TestFramework();

// 导出全局函数
window.describe = testFramework.describe.bind(testFramework);
window.it = testFramework.it.bind(testFramework);
window.beforeEach = testFramework.beforeEach.bind(testFramework);
window.afterEach = testFramework.afterEach.bind(testFramework);
window.beforeAll = testFramework.beforeAll.bind(testFramework);
window.afterAll = testFramework.afterAll.bind(testFramework);
window.expect = testFramework.expect.bind(testFramework);
window.runTests = testFramework.runAll.bind(testFramework);
window.mock = testFramework.mock.bind(testFramework);
window.spy = testFramework.spy.bind(testFramework);
window.waitFor = testFramework.waitFor.bind(testFramework);
window.createTestElement = testFramework.createTestElement.bind(testFramework);

console.log('🧪 单元测试框架已加载');