// AppState模块单元测试
const { createMockAppState } = require('../../fixtures/test-data.js');

// 模拟AppState类（需要根据实际实现调整）
class AppState {
  constructor() {
    this.state = {};
    this.subscribers = new Map();
    this.batchMode = false;
    this.pendingUpdates = {};
  }

  getState(key) {
    return key ? this.state[key] : { ...this.state };
  }

  setState(newState) {
    if (this.batchMode) {
      Object.assign(this.pendingUpdates, newState);
      return;
    }

    const oldState = { ...this.state };
    Object.assign(this.state, newState);

    // 通知订阅者
    Object.keys(newState).forEach(key => {
      if (this.subscribers.has(key)) {
        this.subscribers.get(key).forEach(callback => {
          callback(newState[key], oldState[key]);
        });
      }
    });
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(callback);

    // 返回取消订阅函数
    return () => this.unsubscribe(key, callback);
  }

  unsubscribe(key, callback) {
    if (this.subscribers.has(key)) {
      const callbacks = this.subscribers.get(key);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  batch(fn) {
    this.batchMode = true;
    this.pendingUpdates = {};
    
    try {
      fn();
    } finally {
      this.batchMode = false;
      
      if (Object.keys(this.pendingUpdates).length > 0) {
        this.setState(this.pendingUpdates);
      }
    }
  }

  clear() {
    this.state = {};
    this.subscribers.clear();
  }

  // 持久化相关方法
  persist(key) {
    try {
      localStorage.setItem(`appState_${key}`, JSON.stringify(this.state[key]));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  restore(key) {
    try {
      const stored = localStorage.getItem(`appState_${key}`);
      if (stored) {
        this.setState({ [key]: JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }
}

describe('AppState', () => {
  let appState;

  beforeEach(() => {
    appState = new AppState();
  });

  afterEach(() => {
    appState.clear();
  });

  describe('基本状态管理', () => {
    test('应该初始化为空状态', () => {
      expect(appState.getState()).toEqual({});
    });

    test('应该能够设置和获取状态', () => {
      appState.setState({ testKey: 'testValue' });
      expect(appState.getState('testKey')).toBe('testValue');
    });

    test('应该能够获取完整状态', () => {
      appState.setState({ key1: 'value1', key2: 'value2' });
      expect(appState.getState()).toEqual({ key1: 'value1', key2: 'value2' });
    });

    test('应该能够更新现有状态', () => {
      appState.setState({ key1: 'value1', key2: 'value2' });
      appState.setState({ key1: 'newValue1' });
      
      expect(appState.getState()).toEqual({ key1: 'newValue1', key2: 'value2' });
    });

    test('应该能够清空状态', () => {
      appState.setState({ key1: 'value1', key2: 'value2' });
      appState.clear();
      
      expect(appState.getState()).toEqual({});
    });
  });

  describe('订阅机制', () => {
    test('应该能够订阅状态变化', () => {
      const mockCallback = jest.fn();
      appState.subscribe('testKey', mockCallback);
      
      appState.setState({ testKey: 'testValue' });
      
      expect(mockCallback).toHaveBeenCalledWith('testValue', undefined);
    });

    test('应该能够订阅多个回调', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      appState.subscribe('testKey', mockCallback1);
      appState.subscribe('testKey', mockCallback2);
      
      appState.setState({ testKey: 'testValue' });
      
      expect(mockCallback1).toHaveBeenCalledWith('testValue', undefined);
      expect(mockCallback2).toHaveBeenCalledWith('testValue', undefined);
    });

    test('应该能够取消订阅', () => {
      const mockCallback = jest.fn();
      const unsubscribe = appState.subscribe('testKey', mockCallback);
      
      unsubscribe();
      appState.setState({ testKey: 'testValue' });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('应该只通知相关键的订阅者', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      appState.subscribe('key1', mockCallback1);
      appState.subscribe('key2', mockCallback2);
      
      appState.setState({ key1: 'value1' });
      
      expect(mockCallback1).toHaveBeenCalledWith('value1', undefined);
      expect(mockCallback2).not.toHaveBeenCalled();
    });

    test('应该传递新值和旧值给回调', () => {
      const mockCallback = jest.fn();
      
      appState.setState({ testKey: 'oldValue' });
      appState.subscribe('testKey', mockCallback);
      appState.setState({ testKey: 'newValue' });
      
      expect(mockCallback).toHaveBeenCalledWith('newValue', 'oldValue');
    });
  });

  describe('批量更新', () => {
    test('应该能够批量更新状态', () => {
      const mockCallback = jest.fn();
      appState.subscribe('testKey', mockCallback);
      
      appState.batch(() => {
        appState.setState({ testKey: 'value1' });
        appState.setState({ testKey: 'value2' });
        appState.setState({ testKey: 'value3' });
      });
      
      // 应该只触发一次回调，使用最终值
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('value3', undefined);
    });

    test('批量更新应该合并多个键', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      appState.subscribe('key1', mockCallback1);
      appState.subscribe('key2', mockCallback2);
      
      appState.batch(() => {
        appState.setState({ key1: 'value1' });
        appState.setState({ key2: 'value2' });
      });
      
      expect(mockCallback1).toHaveBeenCalledWith('value1', undefined);
      expect(mockCallback2).toHaveBeenCalledWith('value2', undefined);
    });

    test('批量更新中的异常不应该影响状态', () => {
      const mockCallback = jest.fn();
      appState.subscribe('testKey', mockCallback);
      
      expect(() => {
        appState.batch(() => {
          appState.setState({ testKey: 'value1' });
          throw new Error('Test error');
        });
      }).toThrow('Test error');
      
      // 状态应该已经更新
      expect(appState.getState('testKey')).toBe('value1');
      expect(mockCallback).toHaveBeenCalledWith('value1', undefined);
    });
  });

  describe('状态持久化', () => {
    test('应该能够持久化状态到localStorage', () => {
      appState.setState({ persistKey: 'persistValue' });
      appState.persist('persistKey');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'appState_persistKey',
        JSON.stringify('persistValue')
      );
    });

    test('应该能够从localStorage恢复状态', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify('restoredValue'));
      
      appState.restore('restoreKey');
      
      expect(appState.getState('restoreKey')).toBe('restoredValue');
    });

    test('恢复不存在的键应该不影响状态', () => {
      localStorage.getItem.mockReturnValue(null);
      
      appState.setState({ existingKey: 'existingValue' });
      appState.restore('nonExistentKey');
      
      expect(appState.getState()).toEqual({ existingKey: 'existingValue' });
    });

    test('持久化失败应该不抛出异常', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      appState.setState({ testKey: 'testValue' });
      
      expect(() => {
        appState.persist('testKey');
      }).not.toThrow();
    });

    test('恢复失败应该不抛出异常', () => {
      localStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });
      
      expect(() => {
        appState.restore('testKey');
      }).not.toThrow();
    });
  });

  describe('边界情况', () => {
    test('应该处理undefined值', () => {
      appState.setState({ testKey: undefined });
      expect(appState.getState('testKey')).toBeUndefined();
    });

    test('应该处理null值', () => {
      appState.setState({ testKey: null });
      expect(appState.getState('testKey')).toBeNull();
    });

    test('应该处理复杂对象', () => {
      const complexObject = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
        date: new Date('2023-01-01')
      };
      
      appState.setState({ complexKey: complexObject });
      expect(appState.getState('complexKey')).toEqual(complexObject);
    });

    test('应该处理空字符串键', () => {
      const mockCallback = jest.fn();
      appState.subscribe('', mockCallback);
      
      appState.setState({ '': 'emptyKeyValue' });
      
      expect(mockCallback).toHaveBeenCalledWith('emptyKeyValue', undefined);
    });

    test('应该处理大量订阅者', () => {
      const callbacks = Array.from({ length: 1000 }, () => jest.fn());
      
      callbacks.forEach(callback => {
        appState.subscribe('testKey', callback);
      });
      
      appState.setState({ testKey: 'testValue' });
      
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledWith('testValue', undefined);
      });
    });
  });

  describe('性能测试', () => {
    test('大量状态更新应该在合理时间内完成', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        appState.setState({ [`key${i}`]: `value${i}` });
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // 应该在500ms内完成
    });

    test('大量订阅者通知应该在合理时间内完成', () => {
      const callbacks = Array.from({ length: 100 }, () => jest.fn());
      
      callbacks.forEach(callback => {
        appState.subscribe('testKey', callback);
      });
      
      const startTime = performance.now();
      appState.setState({ testKey: 'testValue' });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
    });
  });
});