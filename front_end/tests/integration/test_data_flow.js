// 数据流集成测试
const { mockFileData, mockApiResponses, createMockAppState, createMockApiClient, waitFor } = require('../fixtures/test-data.js');

// 模拟完整的数据流程
describe('数据流集成测试', () => {
  let appState;
  let apiClient;
  let dataManager;
  let fileSelector;
  let dataFilter;
  let chartEngine;
  let container;

  beforeEach(() => {
    // 创建测试容器
    container = document.createElement('div');
    container.innerHTML = `
      <div id="file-selector-container"></div>
      <div id="data-filter-container"></div>
      <div id="chart-container"></div>
      <div id="status-container"></div>
    `;
    document.body.appendChild(container);

    // 初始化核心组件
    appState = createMockAppState();
    apiClient = createMockApiClient();
    
    // 模拟DataManager
    dataManager = {
      getFileData: jest.fn(),
      filterData: jest.fn(),
      uploadFile: jest.fn(),
      clearCache: jest.fn()
    };

    // 模拟FileSelector
    fileSelector = {
      selectedFiles: [],
      selectFile: jest.fn(),
      refresh: jest.fn(),
      on: jest.fn()
    };

    // 模拟DataFilter
    dataFilter = {
      filters: {},
      applyFilters: jest.fn(),
      clearFilters: jest.fn(),
      getAvailableColumns: jest.fn(),
      on: jest.fn()
    };

    // 模拟ChartEngine
    chartEngine = {
      currentChart: null,
      generateChart: jest.fn(),
      updateChart: jest.fn(),
      clearChart: jest.fn(),
      exportChart: jest.fn()
    };

    // 设置全局对象
    window.appState = appState;
    window.apiClient = apiClient;
    window.dataManager = dataManager;
    window.fileSelector = fileSelector;
    window.dataFilter = dataFilter;
    window.chartEngine = chartEngine;
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // 清理全局对象
    delete window.appState;
    delete window.apiClient;
    delete window.dataManager;
    delete window.fileSelector;
    delete window.dataFilter;
    delete window.chartEngine;
  });

  describe('文件选择到数据加载流程', () => {
    test('选择文件应该触发数据加载和状态更新', async () => {
      // 设置模拟数据
      dataManager.getFileData.mockResolvedValue(mockFileData.small);
      
      // 模拟文件选择
      const selectedFile = {
        id: 'test-file-id',
        name: 'test.xlsx',
        rows: 100,
        columns: 5
      };

      // 触发文件选择事件
      appState.setState({ currentFileId: selectedFile.id });

      // 验证状态更新
      expect(appState.getState('currentFileId')).toBe(selectedFile.id);

      // 模拟数据加载完成
      await waitFor(() => {
        return dataManager.getFileData.mock.calls.length > 0;
      });

      expect(dataManager.getFileData).toHaveBeenCalledWith(selectedFile.id);
    });

    test('文件选择失败应该显示错误信息', async () => {
      // 设置模拟错误
      dataManager.getFileData.mockRejectedValue(new Error('File not found'));
      
      const selectedFile = { id: 'invalid-file-id' };
      
      // 触发文件选择
      appState.setState({ currentFileId: selectedFile.id });

      // 等待错误处理
      await waitFor(() => {
        return appState.getState('error') !== undefined;
      });

      expect(appState.getState('error')).toBeTruthy();
    });

    test('大文件加载应该显示进度状态', async () => {
      // 模拟大文件加载
      dataManager.getFileData.mockImplementation(() => {
        appState.setState({ loading: true, loadingMessage: '加载大文件中...' });
        return new Promise(resolve => {
          setTimeout(() => {
            appState.setState({ loading: false, loadingMessage: null });
            resolve(mockFileData.large);
          }, 100);
        });
      });

      const selectedFile = { id: 'large-file-id' };
      appState.setState({ currentFileId: selectedFile.id });

      // 验证加载状态
      expect(appState.getState('loading')).toBe(true);
      expect(appState.getState('loadingMessage')).toBe('加载大文件中...');

      // 等待加载完成
      await waitFor(() => {
        return appState.getState('loading') === false;
      });

      expect(appState.getState('loading')).toBe(false);
    });
  });

  describe('数据筛选到图表更新流程', () => {
    beforeEach(() => {
      // 设置初始状态
      appState.setState({
        currentFileId: 'test-file-id',
        currentData: mockFileData.small
      });
    });

    test('应用筛选条件应该更新图表', async () => {
      const filters = { category: ['A', 'B'] };
      const filteredData = {
        ...mockFileData.small,
        data: mockFileData.small.data.filter(row => ['A', 'B'].includes(row[2]))
      };

      dataManager.filterData.mockResolvedValue(filteredData);
      chartEngine.updateChart.mockResolvedValue(true);

      // 应用筛选条件
      dataFilter.filters = filters;
      await dataFilter.applyFilters(filters);

      // 验证数据筛选调用
      expect(dataManager.filterData).toHaveBeenCalledWith('test-file-id', filters);

      // 验证图表更新
      expect(chartEngine.updateChart).toHaveBeenCalledWith(filteredData);

      // 验证状态更新
      expect(appState.getState('currentFilters')).toEqual(filters);
    });

    test('清除筛选条件应该恢复原始数据', async () => {
      // 先设置筛选状态
      appState.setState({
        currentFilters: { category: ['A'] },
        filteredData: { rows: 2 }
      });

      dataManager.getFileData.mockResolvedValue(mockFileData.small);
      chartEngine.updateChart.mockResolvedValue(true);

      // 清除筛选条件
      await dataFilter.clearFilters();

      // 验证获取原始数据
      expect(dataManager.getFileData).toHaveBeenCalledWith('test-file-id');

      // 验证图表更新为原始数据
      expect(chartEngine.updateChart).toHaveBeenCalledWith(mockFileData.small);

      // 验证状态清除
      expect(appState.getState('currentFilters')).toEqual({});
    });

    test('筛选条件变化应该实时更新图表', async () => {
      const initialFilters = { category: ['A'] };
      const updatedFilters = { category: ['A', 'B'] };

      dataManager.filterData
        .mockResolvedValueOnce({ rows: 2 })
        .mockResolvedValueOnce({ rows: 3 });

      chartEngine.updateChart.mockResolvedValue(true);

      // 应用初始筛选
      await dataFilter.applyFilters(initialFilters);
      expect(chartEngine.updateChart).toHaveBeenCalledTimes(1);

      // 更新筛选条件
      await dataFilter.applyFilters(updatedFilters);
      expect(chartEngine.updateChart).toHaveBeenCalledTimes(2);

      // 验证最终状态
      expect(appState.getState('currentFilters')).toEqual(updatedFilters);
    });
  });

  describe('图表生成和交互流程', () => {
    beforeEach(() => {
      appState.setState({
        currentFileId: 'test-file-id',
        currentData: mockFileData.small
      });
    });

    test('生成图表应该更新状态和UI', async () => {
      const chartConfig = {
        type: 'line',
        xAxis: 'date',
        yAxis: 'value'
      };

      const chartData = {
        x: ['2023-01-01', '2023-01-02', '2023-01-03'],
        y: [100, 150, 200],
        type: 'scatter',
        mode: 'lines+markers'
      };

      chartEngine.generateChart.mockResolvedValue({
        success: true,
        chartData,
        config: chartConfig
      });

      // 生成图表
      const result = await chartEngine.generateChart(mockFileData.small, chartConfig);

      // 验证图表生成
      expect(result.success).toBe(true);
      expect(result.chartData).toEqual(chartData);

      // 验证状态更新
      expect(appState.getState('currentChart')).toBeDefined();
      expect(appState.getState('chartConfig')).toEqual(chartConfig);
    });

    test('图表配置变化应该重新生成图表', async () => {
      const initialConfig = { type: 'line', xAxis: 'date', yAxis: 'value' };
      const updatedConfig = { type: 'bar', xAxis: 'category', yAxis: 'value' };

      chartEngine.generateChart.mockResolvedValue({ success: true });

      // 生成初始图表
      await chartEngine.generateChart(mockFileData.small, initialConfig);
      expect(chartEngine.generateChart).toHaveBeenCalledWith(mockFileData.small, initialConfig);

      // 更新配置
      appState.setState({ chartConfig: updatedConfig });
      await chartEngine.generateChart(mockFileData.small, updatedConfig);

      // 验证重新生成
      expect(chartEngine.generateChart).toHaveBeenCalledWith(mockFileData.small, updatedConfig);
      expect(chartEngine.generateChart).toHaveBeenCalledTimes(2);
    });

    test('图表导出应该生成下载链接', async () => {
      const exportOptions = {
        format: 'png',
        width: 800,
        height: 600
      };

      chartEngine.exportChart.mockResolvedValue({
        success: true,
        dataUrl: 'data:image/png;base64,mock-image-data',
        filename: 'chart.png'
      });

      // 导出图表
      const result = await chartEngine.exportChart(exportOptions);

      // 验证导出结果
      expect(result.success).toBe(true);
      expect(result.dataUrl).toContain('data:image/png');
      expect(result.filename).toBe('chart.png');
    });
  });

  describe('错误处理和恢复流程', () => {
    test('网络错误应该触发重试机制', async () => {
      let attemptCount = 0;
      dataManager.getFileData.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockFileData.small);
      });

      // 模拟网络错误和重试
      const fileId = 'test-file-id';
      
      try {
        await dataManager.getFileData(fileId);
      } catch (error) {
        // 第一次失败，触发重试
        await dataManager.getFileData(fileId);
      }

      // 验证重试成功
      expect(attemptCount).toBe(2);
    });

    test('数据损坏应该显示友好错误信息', async () => {
      dataManager.getFileData.mockResolvedValue({
        ...mockFileData.small,
        data: null // 模拟数据损坏
      });

      const fileId = 'corrupted-file-id';
      appState.setState({ currentFileId: fileId });

      // 等待错误处理
      await waitFor(() => {
        return appState.getState('error') !== undefined;
      });

      const error = appState.getState('error');
      expect(error).toBeTruthy();
      expect(error.type).toBe('data');
      expect(error.message).toContain('数据格式错误');
    });

    test('组件崩溃应该被错误边界捕获', () => {
      const mockError = new Error('Component crashed');
      
      // 模拟组件错误
      chartEngine.generateChart.mockRejectedValue(mockError);

      // 触发错误边界
      window.dispatchEvent(new ErrorEvent('error', {
        error: mockError,
        message: mockError.message
      }));

      // 验证错误被捕获
      expect(appState.getState('globalError')).toBeTruthy();
    });
  });

  describe('性能优化流程', () => {
    test('大数据集应该触发虚拟化渲染', async () => {
      const largeDataset = {
        ...mockFileData.large,
        data: Array.from({ length: 10000 }, (_, i) => [
          `2023-01-${String(i % 30 + 1).padStart(2, '0')}`,
          Math.random() * 1000,
          ['A', 'B', 'C'][i % 3]
        ])
      };

      dataManager.getFileData.mockResolvedValue(largeDataset);

      // 加载大数据集
      appState.setState({ currentFileId: 'large-file-id' });

      await waitFor(() => {
        return appState.getState('useVirtualization') === true;
      });

      // 验证虚拟化启用
      expect(appState.getState('useVirtualization')).toBe(true);
      expect(appState.getState('virtualPageSize')).toBeDefined();
    });

    test('频繁操作应该触发防抖机制', async () => {
      let filterCallCount = 0;
      dataManager.filterData.mockImplementation(() => {
        filterCallCount++;
        return Promise.resolve(mockFileData.small);
      });

      // 快速连续应用筛选条件
      const filters1 = { category: ['A'] };
      const filters2 = { category: ['B'] };
      const filters3 = { category: ['C'] };

      dataFilter.applyFilters(filters1);
      dataFilter.applyFilters(filters2);
      dataFilter.applyFilters(filters3);

      // 等待防抖完成
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证只执行了最后一次筛选
      expect(filterCallCount).toBe(1);
    });

    test('缓存机制应该减少重复请求', async () => {
      let requestCount = 0;
      dataManager.getFileData.mockImplementation(() => {
        requestCount++;
        return Promise.resolve(mockFileData.small);
      });

      const fileId = 'cached-file-id';

      // 多次请求相同文件
      await dataManager.getFileData(fileId);
      await dataManager.getFileData(fileId);
      await dataManager.getFileData(fileId);

      // 验证缓存生效，只请求一次
      expect(requestCount).toBe(1);
    });
  });

  describe('用户交互流程', () => {
    test('完整的用户操作流程应该正常工作', async () => {
      // 设置模拟数据
      dataManager.getFileData.mockResolvedValue(mockFileData.small);
      dataManager.filterData.mockResolvedValue({
        ...mockFileData.small,
        data: mockFileData.small.data.slice(0, 2)
      });
      chartEngine.generateChart.mockResolvedValue({ success: true });

      // 1. 用户选择文件
      const selectedFile = { id: 'user-file-id', name: 'user-data.xlsx' };
      appState.setState({ currentFileId: selectedFile.id });

      // 等待文件加载
      await waitFor(() => {
        return dataManager.getFileData.mock.calls.length > 0;
      });

      // 2. 用户应用筛选条件
      const userFilters = { category: ['A'] };
      await dataFilter.applyFilters(userFilters);

      // 3. 用户生成图表
      const chartConfig = { type: 'line', xAxis: 'date', yAxis: 'value' };
      await chartEngine.generateChart(appState.getState('filteredData'), chartConfig);

      // 验证完整流程
      expect(dataManager.getFileData).toHaveBeenCalledWith(selectedFile.id);
      expect(dataManager.filterData).toHaveBeenCalledWith(selectedFile.id, userFilters);
      expect(chartEngine.generateChart).toHaveBeenCalled();

      // 验证最终状态
      expect(appState.getState('currentFileId')).toBe(selectedFile.id);
      expect(appState.getState('currentFilters')).toEqual(userFilters);
    });

    test('用户撤销操作应该恢复之前状态', async () => {
      // 设置初始状态
      const initialState = {
        currentFileId: 'file1',
        currentFilters: {},
        chartConfig: { type: 'line' }
      };
      appState.setState(initialState);

      // 用户进行操作
      const newFilters = { category: ['A'] };
      const newChartConfig = { type: 'bar' };
      
      appState.setState({
        currentFilters: newFilters,
        chartConfig: newChartConfig
      });

      // 用户撤销操作
      appState.setState(initialState);

      // 验证状态恢复
      expect(appState.getState('currentFilters')).toEqual({});
      expect(appState.getState('chartConfig')).toEqual({ type: 'line' });
    });
  });

  describe('状态同步测试', () => {
    test('多个组件应该保持状态同步', () => {
      const testData = { test: 'value' };
      
      // 模拟组件订阅状态变化
      const component1Callback = jest.fn();
      const component2Callback = jest.fn();
      
      appState.subscribe('testKey', component1Callback);
      appState.subscribe('testKey', component2Callback);

      // 更新状态
      appState.setState({ testKey: testData });

      // 验证所有组件都收到更新
      expect(component1Callback).toHaveBeenCalledWith(testData, undefined);
      expect(component2Callback).toHaveBeenCalledWith(testData, undefined);
    });

    test('批量状态更新应该只触发一次通知', () => {
      const callback = jest.fn();
      appState.subscribe('batchKey', callback);

      // 批量更新
      appState.batch(() => {
        appState.setState({ batchKey: 'value1' });
        appState.setState({ batchKey: 'value2' });
        appState.setState({ batchKey: 'value3' });
      });

      // 验证只触发一次回调
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('value3', undefined);
    });
  });
});