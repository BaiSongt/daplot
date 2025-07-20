// ApiClient模块单元测试
const { mockApiResponses, delay } = require('../../fixtures/test-data.js');

// 模拟ApiClient类
class ApiClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.timeout = options.timeout || 5000;
    this.headers = options.headers || {};
    this.interceptors = {
      request: [],
      response: []
    };
    this.retryConfig = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      retryCondition: options.retryCondition || this.defaultRetryCondition
    };
  }

  setBaseURL(baseURL) {
    this.baseURL = baseURL;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }

  setHeaders(headers) {
    this.headers = { ...this.headers, ...headers };
  }

  interceptRequest(interceptor) {
    this.interceptors.request.push(interceptor);
  }

  interceptResponse(interceptor) {
    this.interceptors.response.push(interceptor);
  }

  async request(method, url, data = null, options = {}) {
    const config = {
      method: method.toUpperCase(),
      url: this.baseURL + url,
      headers: { ...this.headers, ...options.headers },
      timeout: options.timeout || this.timeout,
      ...options
    };

    // 应用请求拦截器
    let finalConfig = config;
    for (const interceptor of this.interceptors.request) {
      finalConfig = await interceptor(finalConfig);
    }

    // 执行请求（带重试机制）
    return this.executeWithRetry(finalConfig, data);
  }

  async executeWithRetry(config, data, attempt = 1) {
    try {
      const response = await this.executeRequest(config, data);
      
      // 应用响应拦截器
      let finalResponse = response;
      for (const interceptor of this.interceptors.response) {
        finalResponse = await interceptor(finalResponse);
      }

      return finalResponse;
    } catch (error) {
      // 检查是否需要重试
      if (attempt < this.retryConfig.maxRetries && 
          this.retryConfig.retryCondition(error)) {
        
        console.warn(`Request failed, retrying (${attempt}/${this.retryConfig.maxRetries}):`, error.message);
        
        // 等待重试延迟
        await delay(this.retryConfig.retryDelay * attempt);
        
        return this.executeWithRetry(config, data, attempt + 1);
      }

      throw error;
    }
  }

  async executeRequest(config, data) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const fetchOptions = {
        method: config.method,
        headers: config.headers,
        signal: controller.signal
      };

      if (data) {
        if (data instanceof FormData) {
          fetchOptions.body = data;
          // 删除Content-Type让浏览器自动设置
          delete fetchOptions.headers['Content-Type'];
        } else {
          fetchOptions.body = JSON.stringify(data);
          fetchOptions.headers['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(config.url, fetchOptions);
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(response.status, await response.json());
      }

      const result = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new ApiError(408, { message: 'Request timeout' });
      }
      
      throw error;
    }
  }

  defaultRetryCondition(error) {
    // 重试网络错误和5xx服务器错误
    return error.name === 'TypeError' || // 网络错误
           (error.status >= 500 && error.status < 600) || // 服务器错误
           error.status === 408; // 超时
  }

  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }

  async post(url, data, options = {}) {
    return this.request('POST', url, data, options);
  }

  async put(url, data, options = {}) {
    return this.request('PUT', url, data, options);
  }

  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  }

  async upload(url, formData, options = {}) {
    const uploadOptions = { ...options };
    
    // 处理上传进度
    if (options.onProgress) {
      // 模拟上传进度（在实际实现中会使用XMLHttpRequest）
      const progressInterval = setInterval(() => {
        const progress = Math.min(100, Math.random() * 100);
        options.onProgress({ loaded: progress, total: 100 });
      }, 100);

      uploadOptions.onUploadComplete = () => {
        clearInterval(progressInterval);
        options.onProgress({ loaded: 100, total: 100 });
      };
    }

    try {
      const result = await this.request('POST', url, formData, uploadOptions);
      uploadOptions.onUploadComplete?.();
      return result;
    } catch (error) {
      uploadOptions.onUploadComplete?.();
      throw error;
    }
  }

  async download(url, options = {}) {
    const config = {
      method: 'GET',
      url: this.baseURL + url,
      headers: { ...this.headers, ...options.headers },
      timeout: options.timeout || this.timeout
    };

    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }

    return response.blob();
  }

  // 取消请求（简化实现）
  createCancelToken() {
    const controller = new AbortController();
    return {
      token: controller.signal,
      cancel: (reason) => controller.abort(reason)
    };
  }
}

// API错误类
class ApiError extends Error {
  constructor(status, data) {
    super(data.message || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

describe('ApiClient', () => {
  let apiClient;
  let originalFetch;

  beforeEach(() => {
    apiClient = new ApiClient({
      baseURL: 'http://localhost:8000',
      timeout: 5000,
      maxRetries: 2
    });

    // 模拟fetch
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('基本配置', () => {
    test('应该能够设置基础URL', () => {
      apiClient.setBaseURL('https://api.example.com');
      expect(apiClient.baseURL).toBe('https://api.example.com');
    });

    test('应该能够设置超时时间', () => {
      apiClient.setTimeout(10000);
      expect(apiClient.timeout).toBe(10000);
    });

    test('应该能够设置请求头', () => {
      apiClient.setHeaders({ 'Authorization': 'Bearer token' });
      expect(apiClient.headers).toEqual({ 'Authorization': 'Bearer token' });
    });

    test('应该能够合并请求头', () => {
      apiClient.setHeaders({ 'Authorization': 'Bearer token' });
      apiClient.setHeaders({ 'Content-Type': 'application/json' });
      
      expect(apiClient.headers).toEqual({
        'Authorization': 'Bearer token',
        'Content-Type': 'application/json'
      });
    });
  });

  describe('GET请求', () => {
    test('应该能够发送GET请求', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponses.uploadSuccess)
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/api/files');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/files',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
          signal: expect.any(AbortSignal)
        })
      );
      expect(result).toEqual(mockApiResponses.uploadSuccess);
    });

    test('应该处理GET请求错误', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ message: 'Not found' })
      };
      global.fetch.mockResolvedValue(mockResponse);

      await expect(apiClient.get('/api/nonexistent'))
        .rejects.toThrow('Not found');
    });
  });

  describe('POST请求', () => {
    test('应该能够发送POST请求', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponses.uploadSuccess)
      };
      global.fetch.mockResolvedValue(mockResponse);

      const data = { name: 'test' };
      const result = await apiClient.post('/api/data', data);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/data',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(data),
          signal: expect.any(AbortSignal)
        })
      );
      expect(result).toEqual(mockApiResponses.uploadSuccess);
    });

    test('应该能够发送FormData', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponses.uploadSuccess)
      };
      global.fetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', 'test');

      await apiClient.post('/api/upload', formData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          // Content-Type应该被删除让浏览器自动设置
          headers: expect.not.objectContaining({
            'Content-Type': expect.any(String)
          })
        })
      );
    });
  });

  describe('PUT和DELETE请求', () => {
    test('应该能够发送PUT请求', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const data = { id: 1, name: 'updated' };
      await apiClient.put('/api/data/1', data);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/data/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );
    });

    test('应该能够发送DELETE请求', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      global.fetch.mockResolvedValue(mockResponse);

      await apiClient.delete('/api/data/1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/data/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('文件上传', () => {
    test('应该能够上传文件', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponses.uploadSuccess)
      };
      global.fetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.txt'));

      const result = await apiClient.upload('/api/upload', formData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData
        })
      );
      expect(result).toEqual(mockApiResponses.uploadSuccess);
    });

    test('应该支持上传进度回调', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponses.uploadSuccess)
      };
      global.fetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      const onProgress = jest.fn();

      await apiClient.upload('/api/upload', formData, { onProgress });

      // 验证进度回调被调用
      expect(onProgress).toHaveBeenCalled();
      
      // 验证最终进度为100%
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
      expect(lastCall[0]).toEqual({ loaded: 100, total: 100 });
    });
  });

  describe('文件下载', () => {
    test('应该能够下载文件', async () => {
      const mockBlob = new Blob(['file content'], { type: 'text/plain' });
      const mockResponse = {
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob)
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiClient.download('/api/download/file.txt');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/download/file.txt',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toBe(mockBlob);
    });

    test('应该处理下载错误', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ message: 'File not found' })
      };
      global.fetch.mockResolvedValue(mockResponse);

      await expect(apiClient.download('/api/download/nonexistent.txt'))
        .rejects.toThrow('File not found');
    });
  });

  describe('请求拦截器', () => {
    test('应该能够添加请求拦截器', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const requestInterceptor = jest.fn((config) => {
        config.headers['X-Custom-Header'] = 'test-value';
        return config;
      });

      apiClient.interceptRequest(requestInterceptor);
      await apiClient.get('/api/test');

      expect(requestInterceptor).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value'
          })
        })
      );
    });

    test('应该能够添加响应拦截器', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'original' })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const responseInterceptor = jest.fn((response) => {
        return { ...response, intercepted: true };
      });

      apiClient.interceptResponse(responseInterceptor);
      const result = await apiClient.get('/api/test');

      expect(responseInterceptor).toHaveBeenCalled();
      expect(result).toEqual({ data: 'original', intercepted: true });
    });
  });

  describe('重试机制', () => {
    test('应该处理网络错误', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.get('/api/test'))
        .rejects.toThrow('Network error');

      expect(global.fetch).toHaveBeenCalled();
    });

    test('应该在服务器错误时重试', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue({ message: 'Server error' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true })
        });

      const result = await apiClient.get('/api/test');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    test('应该处理重试失败', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.get('/api/test'))
        .rejects.toThrow();

      expect(global.fetch).toHaveBeenCalled();
    });

    test('不应该重试客户端错误', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ message: 'Bad request' })
      });

      await expect(apiClient.get('/api/test'))
        .rejects.toThrow('Bad request');

      expect(global.fetch).toHaveBeenCalledTimes(1); // 不应该重试
    });
  });

  describe('超时处理', () => {
    test('应该在超时时取消请求', async () => {
      // 模拟长时间运行的请求
      global.fetch.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 200);
        })
      );

      const shortTimeoutClient = new ApiClient({ timeout: 100 });

      await expect(shortTimeoutClient.get('/api/slow'))
        .rejects.toThrow();
    }, 15000);

    test('应该能够为单个请求设置超时', async () => {
      global.fetch.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 200);
        })
      );

      await expect(apiClient.get('/api/test', { timeout: 100 }))
        .rejects.toThrow();
    });
  });

  describe('取消请求', () => {
    test('应该能够创建取消令牌', () => {
      const cancelToken = apiClient.createCancelToken();
      
      expect(cancelToken).toHaveProperty('token');
      expect(cancelToken).toHaveProperty('cancel');
      expect(typeof cancelToken.cancel).toBe('function');
    });

    test('取消令牌应该是AbortSignal实例', () => {
      const cancelToken = apiClient.createCancelToken();
      expect(cancelToken.token).toBeInstanceOf(AbortSignal);
    });
  });

  describe('错误处理', () => {
    test('应该抛出ApiError实例', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ message: 'Not found' })
      });

      try {
        await apiClient.get('/api/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(404);
        expect(error.message).toBe('Not found');
      }
    });

    test('应该处理JSON解析错误', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(apiClient.get('/api/test'))
        .rejects.toThrow('Invalid JSON');
    });
  });

  describe('性能测试', () => {
    test('并发请求应该高效处理', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });

      const startTime = performance.now();
      
      const promises = Array.from({ length: 10 }, (_, i) => 
        apiClient.get(`/api/test${i}`)
      );
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    test('大量请求头应该高效处理', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });

      // 设置大量请求头
      const headers = {};
      for (let i = 0; i < 100; i++) {
        headers[`X-Header-${i}`] = `value-${i}`;
      }

      const startTime = performance.now();
      await apiClient.get('/api/test', { headers });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
    });
  });
});