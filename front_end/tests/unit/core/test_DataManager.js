// DataManager模块单元测试
const { mockFileData, mockApiResponses, createMockApiClient, waitFor } = require('../../fixtures/test-data.js');

// 模拟DataManager类
class DataManager {
  constructor(options = {}) {
    this.apiClient = options.apiClient;
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 5 * 60 * 1000; // 5分钟
    this.maxCacheSize = options.maxCacheSize || 50;
    this.offlineMode = false;
    this.pendingRequests = new Map();
  }

  async getFileData(fileId, useCache = true) {
    // 检查缓存
    if (useCache && this.cache.has(fileId)) {
      const cached = this.cache.get(fileId);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      } else {
        this.cache.delete(fileId);
      }
    }

    // 检查是否有正在进行的请求
    if (this.pendingRequests.has(fileId)) {
      return this.pendingRequests.get(fileId);
    }

    // 创建新请求
    const requestPromise = this._fetchFileData(fileId);
    this.pendingRequests.set(fileId, requestPromise);

    try {
      const data = await requestPromise;
      
      // 缓存数据
      this._cacheData(fileId, data);
      
      return data;
    } finally {
      this.pendingRequests.delete(fileId);
    }
  }

  async _fetchFileData(fileId) {
    if (this.offlineMode) {
      throw new Error('Offline mode: Cannot fetch data');
    }

    const response = await this.apiClient.get(`/api/file/${fileId}`);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch file data');
    }

    return response.data;
  }

  _cacheData(fileId, data) {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(fileId, {
      data,
      timestamp: Date.now()
    });
  }

  async filterData(fileId, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return this.getFileData(fileId);
    }

    const cacheKey = `${fileId}_${JSON.stringify(filters)}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // 发送筛选请求
    const response = await this.apiClient.post('/api/filter', {
      file_id: fileId,
      filters
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to filter data');
    }

    // 缓存筛选结果
    this._cacheData(cacheKey, response.data);

    return response.data;
  }

  async uploadFile(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.apiClient.upload('/api/upload', formData, {
      onProgress
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to upload file');
    }

    // 预加载文件数据到缓存
    if (response.data.file_id) {
      this._cacheData(response.data.file_id, {
        headers: response.data.headers,
        rows: response.data.rows,
        columns: response.data.columns
      });
    }

    return response.data;
  }

  async deleteFile(fileId) {
    const response = await this.apiClient.delete(`/api/file/${fileId}`);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete file');
    }

    // 清除相关缓存
    this.clearFileCache(fileId);

    return response.data;
  }

  clearFileCache(fileId) {
    // 删除文件相关的所有缓存项
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key === fileId || key.startsWith(`${fileId}_`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clearAllCache() {
    this.cache.clear();
  }

  getCacheInfo() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys()),
      totalMemory: this._calculateCacheMemory()
    };
  }

  _calculateCacheMemory() {
    let totalSize = 0;
    for (const cached of this.cache.values()) {
      totalSize += JSON.stringify(cached.data).length;
    }
    return totalSize;
  }

  setOfflineMode(offline) {
    this.offlineMode = offline;
  }

  isOffline() {
    return this.offlineMode;
  }

  // 预加载数据
  async preloadData(fileIds) {
    const promises = fileIds.map(fileId => 
      this.getFileData(fileId).catch(error => {
        console.warn(`Failed to preload ${fileId}:`, error);
        return { error: error.message };
      })
    );

    const results = await Promise.all(promises);
    return results.map((result, index) => ({
      fileId: fileIds[index],
      success: !result.error,
      data: result.error ? null : result,
      error: result.error || null
    }));
  }

  // 数据同步
  async syncData(fileId, localData) {
    const response = await this.apiClient.post(`/api/sync/${fileId}`, {
      data: localData,
      timestamp: Date.now()
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to sync data');
    }

    // 更新缓存
    this._cacheData(fileId, response.data);

    return response.data;
  }
}

describe('DataManager', () => {
  let dataManager;
  let mockApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    dataManager = new DataManager({
      apiClient: mockApiClient,
      cacheTimeout: 1000, // 1秒用于测试
      maxCacheSize: 5
    });
  });

  afterEach(() => {
    dataManager.clearAllCache();
  });

  describe('文件数据获取', () => {
    test('应该能够获取文件数据', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockFileData.small
      });

      const result = await dataManager.getFileData('test-file-id');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/file/test-file-id');
      expect(result).toEqual(mockFileData.small);
    });

    test('应该缓存文件数据', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockFileData.small
      });

      // 第一次请求
      await dataManager.getFileData('test-file-id');
      
      // 第二次请求应该使用缓存
      await dataManager.getFileData('test-file-id');

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    test('应该在缓存过期后重新请求', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockFileData.small
      });

      // 第一次请求
      await dataManager.getFileData('test-file-id');
      
      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // 第二次请求应该重新获取数据
      await dataManager.getFileData('test-file-id');

      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });

    test('应该处理API错误', async () => {
      mockApiClient.get.mockResolvedValue({
        success: false,
        error: { message: 'File not found' }
      });

      await expect(dataManager.getFileData('invalid-file-id'))
        .rejects.toThrow('File not found');
    });

    test('应该防止重复请求', async () => {
      mockApiClient.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: mockFileData.small
        }), 100))
      );

      // 同时发起多个请求
      const promises = [
        dataManager.getFileData('test-file-id'),
        dataManager.getFileData('test-file-id'),
        dataManager.getFileData('test-file-id')
      ];

      const results = await Promise.all(promises);

      // 应该只发起一次API请求
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      
      // 所有请求应该返回相同结果
      results.forEach(result => {
        expect(result).toEqual(mockFileData.small);
      });
    });
  });

  describe('数据筛选', () => {
    test('应该能够筛选数据', async () => {
      const filters = { category: ['A', 'B'] };
      mockApiClient.post.mockResolvedValue(mockApiResponses.filterSuccess);

      const result = await dataManager.filterData('test-file-id', filters);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/filter', {
        file_id: 'test-file-id',
        filters
      });
      expect(result).toEqual(mockApiResponses.filterSuccess.data);
    });

    test('空筛选条件应该返回原始数据', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockFileData.small
      });

      const result = await dataManager.filterData('test-file-id', {});

      expect(mockApiClient.post).not.toHaveBeenCalled();
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/file/test-file-id');
      expect(result).toEqual(mockFileData.small);
    });

    test('应该缓存筛选结果', async () => {
      const filters = { category: ['A'] };
      mockApiClient.post.mockResolvedValue(mockApiResponses.filterSuccess);

      // 第一次筛选
      await dataManager.filterData('test-file-id', filters);
      
      // 第二次相同筛选应该使用缓存
      await dataManager.filterData('test-file-id', filters);

      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('文件上传', () => {
    test('应该能够上传文件', async () => {
      const mockFile = new File(['test'], 'test.xlsx');
      const mockProgress = jest.fn();
      
      mockApiClient.upload.mockResolvedValue(mockApiResponses.uploadSuccess);

      const result = await dataManager.uploadFile(mockFile, mockProgress);

      expect(mockApiClient.upload).toHaveBeenCalledWith(
        '/api/upload',
        expect.any(FormData),
        { onProgress: mockProgress }
      );
      expect(result).toEqual(mockApiResponses.uploadSuccess.data);
    });

    test('上传成功后应该预加载数据到缓存', async () => {
      const mockFile = new File(['test'], 'test.xlsx');
      mockApiClient.upload.mockResolvedValue(mockApiResponses.uploadSuccess);

      await dataManager.uploadFile(mockFile);

      // 检查缓存中是否有预加载的数据
      const cacheInfo = dataManager.getCacheInfo();
      expect(cacheInfo.keys).toContain('uploaded-file-123');
    });

    test('应该处理上传错误', async () => {
      const mockFile = new File(['test'], 'test.xlsx');
      mockApiClient.upload.mockResolvedValue(mockApiResponses.uploadError);

      await expect(dataManager.uploadFile(mockFile))
        .rejects.toThrow('不支持的文件格式');
    });
  });

  describe('文件删除', () => {
    test('应该能够删除文件', async () => {
      mockApiClient.delete.mockResolvedValue({
        success: true,
        data: { message: 'File deleted successfully' }
      });

      const result = await dataManager.deleteFile('test-file-id');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/file/test-file-id');
      expect(result).toEqual({ message: 'File deleted successfully' });
    });

    test('删除文件应该清除相关缓存', async () => {
      // 先添加一些缓存数据
      dataManager._cacheData('test-file-id', mockFileData.small);
      dataManager._cacheData('test-file-id_filter1', { filtered: true });
      dataManager._cacheData('other-file-id', mockFileData.medium);

      mockApiClient.delete.mockResolvedValue({
        success: true,
        data: { message: 'File deleted successfully' }
      });

      await dataManager.deleteFile('test-file-id');

      const cacheInfo = dataManager.getCacheInfo();
      expect(cacheInfo.keys).not.toContain('test-file-id');
      expect(cacheInfo.keys).not.toContain('test-file-id_filter1');
      expect(cacheInfo.keys).toContain('other-file-id');
    });
  });

  describe('缓存管理', () => {
    test('应该限制缓存大小', async () => {
      mockApiClient.get.mockImplementation((url) => {
        const fileId = url.split('/').pop();
        return Promise.resolve({
          success: true,
          data: { ...mockFileData.small, file_id: fileId }
        });
      });

      // 添加超过最大缓存大小的数据
      for (let i = 0; i < 7; i++) {
        await dataManager.getFileData(`file-${i}`);
      }

      const cacheInfo = dataManager.getCacheInfo();
      expect(cacheInfo.size).toBe(5); // 应该等于maxCacheSize
    });

    test('应该能够清除特定文件的缓存', () => {
      dataManager._cacheData('file1', mockFileData.small);
      dataManager._cacheData('file1_filter', { filtered: true });
      dataManager._cacheData('file2', mockFileData.medium);

      dataManager.clearFileCache('file1');

      const cacheInfo = dataManager.getCacheInfo();
      expect(cacheInfo.keys).not.toContain('file1');
      expect(cacheInfo.keys).not.toContain('file1_filter');
      expect(cacheInfo.keys).toContain('file2');
    });

    test('应该能够清除所有缓存', () => {
      dataManager._cacheData('file1', mockFileData.small);
      dataManager._cacheData('file2', mockFileData.medium);

      dataManager.clearAllCache();

      const cacheInfo = dataManager.getCacheInfo();
      expect(cacheInfo.size).toBe(0);
    });

    test('应该提供缓存信息', () => {
      dataManager._cacheData('file1', mockFileData.small);
      dataManager._cacheData('file2', mockFileData.medium);

      const cacheInfo = dataManager.getCacheInfo();
      
      expect(cacheInfo.size).toBe(2);
      expect(cacheInfo.maxSize).toBe(5);
      expect(cacheInfo.keys).toEqual(['file1', 'file2']);
      expect(cacheInfo.totalMemory).toBeGreaterThan(0);
    });
  });

  describe('离线模式', () => {
    test('应该能够设置离线模式', () => {
      dataManager.setOfflineMode(true);
      expect(dataManager.isOffline()).toBe(true);

      dataManager.setOfflineMode(false);
      expect(dataManager.isOffline()).toBe(false);
    });

    test('离线模式下应该拒绝网络请求', async () => {
      dataManager.setOfflineMode(true);

      await expect(dataManager.getFileData('test-file-id', false))
        .rejects.toThrow('Offline mode: Cannot fetch data');
    });

    test('离线模式下应该能够使用缓存数据', async () => {
      // 先在在线模式下缓存数据
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockFileData.small
      });
      
      await dataManager.getFileData('test-file-id');

      // 切换到离线模式
      dataManager.setOfflineMode(true);

      // 应该能够从缓存获取数据
      const result = await dataManager.getFileData('test-file-id');
      expect(result).toEqual(mockFileData.small);
    });
  });

  describe('数据预加载', () => {
    test('应该能够预加载多个文件', async () => {
      mockApiClient.get.mockImplementation((url) => {
        const fileId = url.split('/').pop();
        return Promise.resolve({
          success: true,
          data: { ...mockFileData.small, file_id: fileId }
        });
      });

      const fileIds = ['file1', 'file2', 'file3'];
      const results = await dataManager.preloadData(fileIds);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.fileId).toBe(fileIds[index]);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });

    test('预加载失败不应该影响其他文件', async () => {
      mockApiClient.get.mockImplementation((url) => {
        const fileId = url.split('/').pop();
        if (fileId === 'invalid-file') {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.resolve({
          success: true,
          data: { ...mockFileData.small, file_id: fileId }
        });
      });

      const fileIds = ['file1', 'invalid-file', 'file3'];
      const results = await dataManager.preloadData(fileIds);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('数据同步', () => {
    test('应该能够同步数据', async () => {
      const localData = { modified: true, data: mockFileData.small };
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: { ...localData, synced: true }
      });

      const result = await dataManager.syncData('test-file-id', localData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/sync/test-file-id', {
        data: localData,
        timestamp: expect.any(Number)
      });
      expect(result).toEqual({ ...localData, synced: true });
    });

    test('同步成功后应该更新缓存', async () => {
      const localData = { modified: true };
      const syncedData = { ...localData, synced: true };
      
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: syncedData
      });

      await dataManager.syncData('test-file-id', localData);

      // 检查缓存是否更新
      const cacheInfo = dataManager.getCacheInfo();
      expect(cacheInfo.keys).toContain('test-file-id');
    });
  });

  describe('性能测试', () => {
    test('大量缓存操作应该在合理时间内完成', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        dataManager._cacheData(`file-${i}`, mockFileData.small);
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    test('缓存查找应该高效', () => {
      // 添加大量缓存数据
      for (let i = 0; i < 50; i++) {
        dataManager._cacheData(`file-${i}`, mockFileData.small);
      }

      const startTime = performance.now();
      
      // 查找缓存
      for (let i = 0; i < 100; i++) {
        dataManager.cache.has(`file-${i % 50}`);
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
    });
  });
});