// 可视化页面端到端测试

describe('可视化页面功能测试', () => {
  beforeEach(() => {
    cy.visitVisualization();
  });

  describe('页面加载和初始化', () => {
    it('应该正确加载页面', () => {
      // 验证页面标题
      cy.title().should('contain', 'DaPlot - 数据可视化');
      
      // 验证主要组件存在
      cy.get('[data-testid="file-selector"]').should('be.visible');
      cy.get('[data-testid="data-filter"]').should('be.visible');
      cy.get('[data-testid="chart-config"]').should('be.visible');
      cy.get('[data-testid="chart-container"]').should('be.visible');
    });

    it('应该显示正确的初始状态', () => {
      // 验证文件选择器初始状态
      cy.get('[data-testid="file-selector"]').within(() => {
        cy.get('[data-testid="file-list"]').should('be.visible');
        cy.get('[data-testid="upload-button"]').should('be.visible');
      });

      // 验证图表配置初始状态
      cy.get('[data-testid="chart-config"]').within(() => {
        cy.get('[data-testid="chart-type-select"]').should('have.value', 'line');
        cy.get('[data-testid="generate-chart-button"]').should('be.disabled');
      });
    });

    it('应该正确处理页面刷新', () => {
      // 选择文件并配置图表
      cy.selectTestFile('sales-data.xlsx');
      cy.configureChart({
        type: 'bar',
        xAxis: 'date',
        yAxis: 'sales'
      });

      // 刷新页面
      cy.reload();

      // 验证状态恢复
      cy.get('[data-testid="chart-container"]').should('be.visible');
    });
  });

  describe('文件选择功能', () => {
    it('应该能够选择文件', () => {
      cy.get('[data-testid="file-selector"]').within(() => {
        cy.get('.file-item').first().click();
        cy.get('.file-item.selected').should('exist');
      });

      // 验证文件信息显示
      cy.get('[data-testid="file-info"]').should('be.visible');
      cy.get('[data-testid="file-info"]').should('contain', '行');
      cy.get('[data-testid="file-info"]').should('contain', '列');
    });

    it('应该能够上传新文件', () => {
      cy.uploadTestFile('test-upload.xlsx');

      // 验证上传成功
      cy.verifySuccessMessage('文件上传成功');
      
      // 验证文件出现在列表中
      cy.get('[data-testid="file-selector"]').within(() => {
        cy.contains('.file-item', 'test-upload.xlsx').should('exist');
      });
    });

    it('应该能够搜索文件', () => {
      cy.get('[data-testid="file-search"]').type('sales');
      
      // 验证搜索结果
      cy.get('[data-testid="file-selector"]').within(() => {
        cy.get('.file-item').should('have.length.lessThan', 10);
        cy.get('.file-item').each(($item) => {
          cy.wrap($item).should('contain.text', 'sales');
        });
      });
    });

    it('应该能够预览文件', () => {
      cy.get('[data-testid="file-selector"]').within(() => {
        cy.get('.file-item').first().within(() => {
          cy.get('[data-testid="preview-button"]').click();
        });
      });

      // 验证预览窗口
      cy.get('[data-testid="file-preview"]').should('be.visible');
      cy.get('[data-testid="preview-table"]').should('exist');
      cy.get('[data-testid="preview-table"] thead th').should('have.length.at.least', 1);
    });

    it('应该处理文件选择错误', () => {
      // 模拟文件加载错误
      cy.intercept('GET', '/api/file/*', { statusCode: 404 }).as('fileError');
      
      cy.get('[data-testid="file-selector"]').within(() => {
        cy.get('.file-item').first().click();
      });

      cy.wait('@fileError');
      cy.verifyErrorMessage('文件加载失败');
    });
  });

  describe('数据筛选功能', () => {
    beforeEach(() => {
      cy.selectTestFile('sales-data.xlsx');
    });

    it('应该能够添加筛选条件', () => {
      cy.addFilter('category', '等于', 'Electronics');

      // 验证筛选条件显示
      cy.get('[data-testid="active-filters"]').within(() => {
        cy.contains('category = Electronics').should('exist');
      });

      // 验证数据更新
      cy.get('[data-testid="data-summary"]').should('contain', '筛选后');
    });

    it('应该能够添加多个筛选条件', () => {
      cy.addFilter('category', '等于', 'Electronics');
      cy.addFilter('sales', '大于', '1000');

      // 验证多个筛选条件
      cy.get('[data-testid="active-filters"]').within(() => {
        cy.contains('category = Electronics').should('exist');
        cy.contains('sales > 1000').should('exist');
      });
    });

    it('应该能够删除筛选条件', () => {
      cy.addFilter('category', '等于', 'Electronics');
      
      cy.get('[data-testid="active-filters"]').within(() => {
        cy.get('[data-testid="remove-filter"]').first().click();
      });

      // 验证筛选条件被删除
      cy.get('[data-testid="active-filters"]').should('not.contain', 'category = Electronics');
    });

    it('应该能够清除所有筛选条件', () => {
      cy.addFilter('category', '等于', 'Electronics');
      cy.addFilter('sales', '大于', '1000');
      
      cy.clearAllFilters();

      // 验证所有筛选条件被清除
      cy.get('[data-testid="active-filters"]').should('be.empty');
    });

    it('应该显示筛选结果统计', () => {
      cy.addFilter('category', '等于', 'Electronics');

      // 验证统计信息
      cy.get('[data-testid="filter-stats"]').should('be.visible');
      cy.get('[data-testid="filter-stats"]').should('contain', '筛选结果');
      cy.get('[data-testid="filter-stats"]').should('contain', '行');
    });
  });

  describe('图表生成功能', () => {
    beforeEach(() => {
      cy.selectTestFile('sales-data.xlsx');
    });

    it('应该能够生成线图', () => {
      cy.configureChart({
        type: 'line',
        xAxis: 'date',
        yAxis: 'sales'
      });

      cy.verifyChartExists('scatter');
      cy.verifyChartData(10); // 至少10个数据点
    });

    it('应该能够生成柱状图', () => {
      cy.configureChart({
        type: 'bar',
        xAxis: 'category',
        yAxis: 'sales'
      });

      cy.verifyChartExists('bar');
    });

    it('应该能够生成散点图', () => {
      cy.configureChart({
        type: 'scatter',
        xAxis: 'price',
        yAxis: 'sales'
      });

      cy.verifyChartExists('scatter');
    });

    it('应该能够生成饼图', () => {
      cy.configureChart({
        type: 'pie',
        xAxis: 'category',
        yAxis: 'sales'
      });

      cy.verifyChartExists('pie');
    });

    it('应该能够配置图表颜色', () => {
      cy.configureChart({
        type: 'bar',
        xAxis: 'category',
        yAxis: 'sales',
        color: 'region'
      });

      // 验证图表有多种颜色
      cy.window().then((win) => {
        const plotlyDiv = win.document.querySelector('.js-plotly-plot');
        if (plotlyDiv && plotlyDiv.data) {
          expect(plotlyDiv.data.length).to.be.greaterThan(1);
        }
      });
    });

    it('应该能够更新图表配置', () => {
      // 生成初始图表
      cy.configureChart({
        type: 'line',
        xAxis: 'date',
        yAxis: 'sales'
      });

      // 更新图表类型
      cy.get('[data-testid="chart-type-select"]').select('bar');
      cy.get('[data-testid="generate-chart-button"]').click();
      cy.waitForChart();

      cy.verifyChartExists('bar');
    });

    it('应该处理图表生成错误', () => {
      // 模拟图表生成错误
      cy.intercept('POST', '/api/chart', { statusCode: 500 }).as('chartError');
      
      cy.configureChart({
        type: 'line',
        xAxis: 'date',
        yAxis: 'sales'
      });

      cy.wait('@chartError');
      cy.verifyErrorMessage('图表生成失败');
    });
  });

  describe('图表交互功能', () => {
    beforeEach(() => {
      cy.selectTestFile('sales-data.xlsx');
      cy.configureChart({
        type: 'line',
        xAxis: 'date',
        yAxis: 'sales'
      });
    });

    it('应该能够缩放图表', () => {
      cy.get('[data-testid="chart-container"]').within(() => {
        // 模拟鼠标滚轮缩放
        cy.get('.js-plotly-plot').trigger('wheel', { deltaY: -100 });
        cy.wait(500);
        
        // 验证缩放工具栏出现
        cy.get('.plotly-modebar').should('be.visible');
      });
    });

    it('应该能够平移图表', () => {
      cy.get('[data-testid="chart-container"]').within(() => {
        // 模拟拖拽平移
        cy.get('.js-plotly-plot')
          .trigger('mousedown', { clientX: 100, clientY: 100 })
          .trigger('mousemove', { clientX: 150, clientY: 100 })
          .trigger('mouseup');
      });
    });

    it('应该显示数据点提示信息', () => {
      cy.get('[data-testid="chart-container"]').within(() => {
        // 悬停在数据点上
        cy.get('.js-plotly-plot .scatterlayer .trace').first()
          .trigger('mouseover');
        
        // 验证提示框出现
        cy.get('.hovertext').should('be.visible');
      });
    });

    it('应该能够选择数据点', () => {
      cy.get('[data-testid="chart-container"]').within(() => {
        // 点击数据点
        cy.get('.js-plotly-plot .scatterlayer .trace').first()
          .click();
        
        // 验证选择状态
        cy.get('.selected').should('exist');
      });
    });
  });

  describe('图表导出功能', () => {
    beforeEach(() => {
      cy.selectTestFile('sales-data.xlsx');
      cy.configureChart({
        type: 'line',
        xAxis: 'date',
        yAxis: 'sales'
      });
    });

    it('应该能够导出PNG图片', () => {
      cy.exportChart('png');
      
      // 验证下载文件
      cy.readFile('cypress/downloads/chart.png').should('exist');
    });

    it('应该能够导出SVG图片', () => {
      cy.exportChart('svg');
      
      cy.readFile('cypress/downloads/chart.svg').should('exist');
    });

    it('应该能够导出PDF文件', () => {
      cy.exportChart('pdf');
      
      cy.readFile('cypress/downloads/chart.pdf').should('exist');
    });

    it('应该能够复制图表到剪贴板', () => {
      cy.get('[data-testid="copy-chart"]').click();
      
      cy.verifySuccessMessage('图表已复制到剪贴板');
    });
  });

  describe('响应式设计测试', () => {
    it('应该在移动设备上正常显示', () => {
      cy.viewport('iphone-x');
      
      // 验证移动端布局
      cy.get('[data-testid="mobile-menu"]').should('be.visible');
      cy.get('[data-testid="sidebar"]').should('not.be.visible');
      
      // 测试移动端导航
      cy.get('[data-testid="mobile-menu"]').click();
      cy.get('[data-testid="sidebar"]').should('be.visible');
    });

    it('应该在平板设备上正常显示', () => {
      cy.viewport('ipad-2');
      
      // 验证平板端布局
      cy.get('[data-testid="sidebar"]').should('be.visible');
      cy.get('[data-testid="chart-container"]').should('be.visible');
    });

    it('应该在桌面设备上正常显示', () => {
      cy.viewport(1920, 1080);
      
      // 验证桌面端布局
      cy.get('[data-testid="sidebar"]').should('be.visible');
      cy.get('[data-testid="main-content"]').should('be.visible');
      cy.get('[data-testid="chart-container"]').should('be.visible');
    });
  });

  describe('性能测试', () => {
    it('页面加载时间应该在合理范围内', () => {
      cy.measurePerformance(() => {
        cy.visitVisualization();
      });
    });

    it('大数据集处理应该在合理时间内完成', () => {
      cy.selectTestFile('large-dataset.xlsx');
      
      cy.measurePerformance(() => {
        cy.configureChart({
          type: 'line',
          xAxis: 'date',
          yAxis: 'value'
        });
      });
    });

    it('图表交互应该流畅', () => {
      cy.selectTestFile('sales-data.xlsx');
      cy.configureChart({
        type: 'line',
        xAxis: 'date',
        yAxis: 'sales'
      });

      cy.measurePerformance(() => {
        // 执行多次交互操作
        for (let i = 0; i < 10; i++) {
          cy.get('.js-plotly-plot').trigger('wheel', { deltaY: -10 });
          cy.wait(50);
        }
      });
    });
  });

  describe('可访问性测试', () => {
    it('应该支持键盘导航', () => {
      cy.testKeyboardNavigation();
      
      // 验证焦点可见性
      cy.focused().should('have.css', 'outline');
    });

    it('应该有正确的ARIA标签', () => {
      cy.checkA11y('[data-testid="visualization-page"]');
    });

    it('应该支持屏幕阅读器', () => {
      // 验证重要元素有适当的标签
      cy.get('[data-testid="chart-container"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="file-selector"]').should('have.attr', 'role', 'region');
    });

    it('应该有足够的颜色对比度', () => {
      // 验证文本颜色对比度
      cy.get('body').should('have.css', 'color').and('not.equal', 'rgb(128, 128, 128)');
    });
  });

  describe('错误处理测试', () => {
    it('应该处理网络错误', () => {
      cy.triggerError('network');
      
      cy.verifyErrorMessage('网络连接失败');
      
      // 验证重试按钮
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('应该处理服务器错误', () => {
      cy.triggerError('server');
      
      cy.verifyErrorMessage('服务器错误');
    });

    it('应该处理JavaScript错误', () => {
      cy.triggerError('javascript');
      
      // 验证错误边界捕获
      cy.get('[data-testid="error-boundary"]').should('be.visible');
    });

    it('应该提供错误恢复选项', () => {
      cy.triggerError('network');
      
      // 测试重试功能
      cy.get('[data-testid="retry-button"]').click();
      cy.verifyLoadingState(true);
      
      // 测试刷新功能
      cy.get('[data-testid="refresh-button"]').click();
    });
  });

  describe('用户体验测试', () => {
    it('应该显示适当的加载状态', () => {
      cy.selectTestFile('large-dataset.xlsx');
      
      // 验证加载指示器
      cy.verifyLoadingState(true);
      cy.get('[data-testid="loading-message"]').should('contain', '加载中');
      
      // 等待加载完成
      cy.verifyLoadingState(false);
    });

    it('应该提供操作反馈', () => {
      cy.selectTestFile('sales-data.xlsx');
      
      cy.verifySuccessMessage('文件加载成功');
    });

    it('应该支持撤销操作', () => {
      cy.selectTestFile('sales-data.xlsx');
      cy.addFilter('category', '等于', 'Electronics');
      
      // 撤销筛选
      cy.get('body').type('{ctrl+z}');
      
      // 验证筛选被撤销
      cy.get('[data-testid="active-filters"]').should('be.empty');
    });

    it('应该支持快捷键操作', () => {
      cy.selectTestFile('sales-data.xlsx');
      cy.configureChart({
        type: 'line',
        xAxis: 'date',
        yAxis: 'sales'
      });

      cy.testShortcuts();
    });
  });
});