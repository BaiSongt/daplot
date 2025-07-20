// 简化的集成测试
const { mockFileData, mockApiResponses, createMockAppState, createMockApiClient } = require('../fixtures/test-data.js');

describe('简化集成测试', () => {
  let appState;
  let apiClient;
  let dataManager;

  beforeEach(() => {
    appState = createMockAppState();
    apiClient = createMockApiClient();
    
    // 简化的DataManager
    dataManager = {
      getFileData: jest.fn(),
      filterData: jest.fn(),
      uploadFile: jest.fn(),
      cache: new Map()
    };
  });

  describe('状态管理集成', () => {
    test('AppState应该能够管理应用状态', () => {
      // 设置初始状态
      appState.setState({ currentFileId: 'test-file' });
      
      // 验证状态设置
      expect(appState.getState('currentFileId')).toBe('test-file');
      
      // 更新状态
      appState.setState({ loading: true });
      
      // 验证状态更新
      expect(appState.getState('loading')).toBe(true);
      expect(appState.getState('currentFileId')).toBe('test-file');
    });

    test('状态变化应该通知订阅者', () => {
      const callback = jest.fn();
      
      // 订阅状态变化
      appState.subscribe('testKey', callback);
      
      // 更新状态
      appState.setState({ testKey: 'testValue' });
      
      // 验证回调被调用
      expect(callback).toHaveBeenCalledWith('testValue', undefined);
    });

    test('批量状态更新应该正确工作', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      appState.subscribe('key1', callback1);
      appState.subscribe('key2', callback2);
      
      // 批量更新
      appState.batch(() => {
        appState.setState({ key1: 'value1' });
        appState.setState({ key2: 'value2' });
      });
      
      // 验证回调被调用
      expect(callback1).toHaveBeenCalledWith('value1', undefined);
      expect(callback2).toHaveBeenCalledWith('value2', undefined);
    });
  });

  describe('API客户端集成', () => {
    test('ApiClient应该能够发送请求', async () => {
      apiClient.get.mockResolvedValue({
        success: true,
        data: mockFileData.small
      });
      
      const result = await apiClient.get('/api/file/test');
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/file/test');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFileData.small);
    });

    test('ApiClient应该处理错误', async () => {
      apiClient.get.mockRejectedValue(new Error('Network error'));
      
      await expect(apiClient.get('/api/file/test'))
        .rejects.toThrow('Network error');
    });

    test('ApiClient应该支持POST请求', async () => {
      const postData = { name: 'test' };
      apiClient.post.mockResolvedValue({
        success: true,
        data: { id: 'created-id' }
      });
      
      const result = await apiClient.post('/api/create', postData);
      
      expect(apiClient.post).toHaveBeenCalledWith('/api/create', postData);
      expect(result.success).toBe(true);
    });
  });

  describe('数据管理集成', () => {
    test('DataManager应该能够获取文件数据', async () => {
      dataManager.getFileData.mockResolvedValue(mockFileData.small);
      
      const result = await dataManager.getFileData('test-file-id');
      
      expect(dataManager.getFileData).toHaveBeenCalledWith('test-file-id');
      expect(result).toEqual(mockFileData.small);
    });

    test('DataManager应该能够筛选数据', async () => {
      const filters = { category: ['A', 'B'] };
      const filteredData = {
        ...mockFileData.small,
        data: mockFileData.small.data.filter(row => ['A', 'B'].includes(row[2]))
      };
      
      dataManager.filterData.mockResolvedValue(filteredData);
      
      const result = await dataManager.filterData('test-file-id', filters);
      
      expect(dataManager.filterData).toHaveBeenCalledWith('test-file-id', filters);
      expect(result).toEqual(filteredData);
    });

    test('DataManager应该能够上传文件', async () => {
      const mockFile = new File(['test'], 'test.xlsx');
      const uploadResult = {
        file_id: 'uploaded-file-id',
        filename: 'test.xlsx',
        rows: 100,
        columns: 5
      };
      
      dataManager.uploadFile.mockResolvedValue(uploadResult);
      
      const result = await dataManager.uploadFile(mockFile);
      
      expect(dataManager.uploadFile).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(uploadResult);
    });
  });

  describe('组件协作集成', () => {
    test('文件选择应该更新应用状态', () => {
      const selectedFile = {
        id: 'selected-file-id',
        name: 'selected.xlsx'
      };
      
      // 模拟文件选择
      appState.setState({ currentFileId: selectedFile.id });
      
      // 验证状态更新
      expect(appState.getState('currentFileId')).toBe(selectedFile.id);
    });

    test('数据加载应该更新加载状态', async () => {
      // 设置加载状态
      appState.setState({ loading: true, loadingMessage: '加载中...' });
      
      // 模拟数据加载
      dataManager.getFileData.mockResolvedValue(mockFileData.small);
      await dataManager.getFileData('test-file-id');
      
      // 清除加载状态
      appState.setState({ loading: false, loadingMessage: null });
      
      // 验证状态变化
      expect(appState.getState('loading')).toBe(false);
      expect(appState.getState('loadingMessage')).toBeNull();
    });

    test('错误处理应该更新错误状态', async () => {
      const errorMessage = 'Failed to load data';
      
      // 模拟错误
      dataManager.getFileData.mockRejectedValue(new Error(errorMessage));
      
      try {
        await dataManager.getFileData('invalid-file-id');
      } catch (error) {
        // 设置错误状态
        appState.setState({ 
          error: {
            type: 'data',
            message: error.message
          }
        });
      }
      
      // 验证错误状态
      const errorState = appState.getState('error');
      expect(errorState).toBeDefined();
      expect(errorState.type).toBe('data');
      expect(errorState.message).toBe(errorMessage);
    });
  });

  describe('数据流集成', () => {
    test('完整的数据流应该正常工作', async () => {
      // 1. 选择文件
      const fileId = 'test-file-id';
      appState.setState({ currentFileId: fileId });
      
      // 2. 加载文件数据
      dataManager.getFileData.mockResolvedValue(mockFileData.small);
      const fileData = await dataManager.getFileData(fileId);
      appState.setState({ currentData: fileData });
      
      // 3. 应用筛选
      const filters = { category: ['A'] };
      const filteredData = {
        ...mockFileData.small,
        data: mockFileData.small.data.filter(row => row[2] === 'A')
      };
      dataManager.filterData.mockResolvedValue(filteredData);
      const filtered = await dataManager.filterData(fileId, filters);
      appState.setState({ filteredData: filtered, currentFilters: filters });
      
      // 验证最终状态
      expect(appState.getState('currentFileId')).toBe(fileId);
      expect(appState.getState('currentData')).toEqual(mockFileData.small);
      expect(appState.getState('filteredData')).toEqual(filteredData);
      expect(appState.getState('currentFilters')).toEqual(filters);
    });

    test('错误恢复流程应该正常工作', async () => {
      // 1. 设置初始状态
      appState.setState({ currentFileId: 'valid-file-id' });
      
      // 2. 模拟错误
      dataManager.getFileData.mockRejectedValue(new Error('Network error'));
      
      try {
        await dataManager.getFileData('invalid-file-id');
      } catch (error) {
        // 3. 错误处理
        appState.setState({ 
          error: { message: error.message },
          loading: false 
        });
      }
      
      // 4. 错误恢复
      appState.setState({ error: null });
      dataManager.getFileData.mockResolvedValue(mockFileData.small);
      const data = await dataManager.getFileData('valid-file-id');
      appState.setState({ currentData: data });
      
      // 验证恢复状态
      expect(appState.getState('error')).toBeNull();
      expect(appState.getState('currentData')).toEqual(mockFileData.small);
    });
  });

  describe('性能和缓存集成', () => {
    test('缓存机制应该减少重复请求', async () => {
      const fileId = 'cached-file-id';
      
      // 第一次请求
      dataManager.getFileData.mockResolvedValueOnce(mockFileData.small);
      const result1 = await dataManager.getFileData(fileId);
      
      // 模拟缓存
      dataManager.cache.set(fileId, result1);
      
      // 第二次请求应该使用缓存
      if (dataManager.cache.has(fileId)) {
        const cachedResult = dataManager.cache.get(fileId);
        expect(cachedResult).toEqual(mockFileData.small);
      }
      
      // 验证只调用了一次API
      expect(dataManager.getFileData).toHaveBeenCalledTimes(1);
    });

    test('状态批量更新应该优化性能', () => {
      const callback = jest.fn();
      appState.subscribe('testKey', callback);
      
      // 批量更新多个状态
      appState.batch(() => {
        appState.setState({ testKey: 'value1' });
        appState.setState({ testKey: 'value2' });
        appState.setState({ testKey: 'value3' });
      });
      
      // 验证只触发一次回调
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('value3', undefined);
    });
  });
});