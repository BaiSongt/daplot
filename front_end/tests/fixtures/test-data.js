// 测试数据和模拟对象

// 模拟文件数据
const mockFileData = {
  small: {
    file_id: 'test-file-small',
    filename: 'small-data.xlsx',
    headers: ['date', 'value', 'category'],
    data: [
      ['2023-01-01', 100, 'A'],
      ['2023-01-02', 150, 'B'],
      ['2023-01-03', 200, 'A'],
      ['2023-01-04', 120, 'C'],
      ['2023-01-05', 180, 'B']
    ],
    rows: 5,
    columns: 3
  },
  
  medium: {
    file_id: 'test-file-medium',
    filename: 'medium-data.xlsx',
    headers: ['date', 'value', 'category', 'region'],
    data: Array.from({ length: 1000 }, (_, i) => [
      `2023-01-${String(i % 30 + 1).padStart(2, '0')}`,
      Math.floor(Math.random() * 1000),
      ['A', 'B', 'C'][i % 3],
      ['North', 'South', 'East', 'West'][i % 4]
    ]),
    rows: 1000,
    columns: 4
  },
  
  large: {
    file_id: 'test-file-large',
    filename: 'large-data.xlsx',
    headers: ['timestamp', 'value', 'category', 'subcategory', 'region'],
    data: Array.from({ length: 10000 }, (_, i) => [
      new Date(2023, 0, 1 + i % 365).toISOString(),
      Math.floor(Math.random() * 10000),
      ['A', 'B', 'C', 'D'][i % 4],
      ['X', 'Y', 'Z'][i % 3],
      ['North', 'South', 'East', 'West', 'Central'][i % 5]
    ]),
    rows: 10000,
    columns: 5
  }
};

// 模拟API响应
const mockApiResponses = {
  uploadSuccess: {
    success: true,
    data: {
      file_id: 'uploaded-file-123',
      filename: 'test-upload.xlsx',
      rows: 100,
      columns: 5,
      headers: ['date', 'value', 'category', 'region', 'amount']
    },
    message: '文件上传成功'
  },
  
  uploadError: {
    success: false,
    error: {
      code: 'INVALID_FILE_FORMAT',
      message: '不支持的文件格式',
      details: {
        field: 'file',
        reason: '只支持Excel文件(.xlsx, .xls)'
      }
    }
  },
  
  filterSuccess: {
    success: true,
    data: {
      filtered_data: mockFileData.small.data.slice(0, 3),
      total_rows: 3,
      applied_filters: {
        category: ['A', 'B']
      }
    }
  },
  
  predictionSuccess: {
    success: true,
    data: {
      predictions: [
        { x: '2023-01-06', y: 190 },
        { x: '2023-01-07', y: 195 },
        { x: '2023-01-08', y: 200 }
      ],
      model_info: {
        algorithm: 'linear',
        accuracy: 0.85,
        r_squared: 0.72
      }
    }
  }
};

// 模拟配置对象
const mockConfigs = {
  default: {
    api: {
      baseURL: 'http://localhost:8000',
      timeout: 5000
    },
    chart: {
      defaultType: 'line',
      colors: ['#1f77b4', '#ff7f0e', '#2ca02c'],
      animation: true
    },
    data: {
      maxFileSize: 50 * 1024 * 1024,
      supportedFormats: ['.xlsx', '.xls', '.csv'],
      cacheTimeout: 5 * 60 * 1000
    }
  }
};

// 模拟DOM元素
const createMockElement = (tag = 'div', attributes = {}) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
};

// 模拟事件
const createMockEvent = (type, properties = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, properties);
  return event;
};

// 模拟文件对象
const createMockFile = (name = 'test.xlsx', size = 1024, type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') => {
  const file = new File(['test content'], name, { type, lastModified: Date.now() });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// 模拟Plotly对象
const mockPlotly = {
  newPlot: jest.fn().mockResolvedValue(undefined),
  react: jest.fn().mockResolvedValue(undefined),
  restyle: jest.fn().mockResolvedValue(undefined),
  relayout: jest.fn().mockResolvedValue(undefined),
  purge: jest.fn(),
  downloadImage: jest.fn().mockResolvedValue(undefined),
  toImage: jest.fn().mockResolvedValue('data:image/png;base64,mock-image-data'),
  Plots: {
    resize: jest.fn()
  }
};

// 模拟Chart.js对象
const mockChartJS = {
  Chart: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    destroy: jest.fn(),
    resize: jest.fn(),
    toBase64Image: jest.fn().mockReturnValue('data:image/png;base64,mock-image-data')
  }))
};

// 工具函数：等待异步操作完成
const waitFor = (condition, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
};

// 工具函数：模拟延迟
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 工具函数：创建模拟的AppState
const createMockAppState = (initialState = {}) => {
  const state = { ...initialState };
  const subscribers = new Map();
  let batchMode = false;
  let pendingUpdates = {};
  
  return {
    getState: jest.fn((key) => key ? state[key] : state),
    setState: jest.fn((newState) => {
      if (batchMode) {
        Object.assign(pendingUpdates, newState);
        return;
      }
      
      const oldState = { ...state };
      Object.assign(state, newState);
      
      // 通知订阅者
      Object.keys(newState).forEach(key => {
        if (subscribers.has(key)) {
          subscribers.get(key).forEach(callback => {
            callback(newState[key], oldState[key]);
          });
        }
      });
    }),
    subscribe: jest.fn((key, callback) => {
      if (!subscribers.has(key)) {
        subscribers.set(key, []);
      }
      subscribers.get(key).push(callback);
    }),
    unsubscribe: jest.fn((key, callback) => {
      if (subscribers.has(key)) {
        const callbacks = subscribers.get(key);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    }),
    batch: jest.fn((fn) => {
      batchMode = true;
      pendingUpdates = {};
      
      try {
        fn();
      } finally {
        batchMode = false;
        
        if (Object.keys(pendingUpdates).length > 0) {
          const oldState = { ...state };
          Object.assign(state, pendingUpdates);
          
          // 通知订阅者
          Object.keys(pendingUpdates).forEach(key => {
            if (subscribers.has(key)) {
              subscribers.get(key).forEach(callback => {
                callback(pendingUpdates[key], oldState[key]);
              });
            }
          });
        }
      }
    }),
    clear: jest.fn(() => {
      Object.keys(state).forEach(key => delete state[key]);
    })
  };
};

// 工具函数：创建模拟的ApiClient
const createMockApiClient = () => {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
    download: jest.fn(),
    setBaseURL: jest.fn(),
    setTimeout: jest.fn(),
    setHeaders: jest.fn(),
    interceptRequest: jest.fn(),
    interceptResponse: jest.fn()
  };
};

// CommonJS导出
module.exports = {
  mockFileData,
  mockApiResponses,
  mockConfigs,
  createMockElement,
  createMockEvent,
  createMockFile,
  mockPlotly,
  mockChartJS,
  waitFor,
  delay,
  createMockAppState,
  createMockApiClient
};