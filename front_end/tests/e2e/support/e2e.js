// Cypress端到端测试支持文件

// 导入Cypress命令
import './commands';

// 全局配置
Cypress.on('uncaught:exception', (err, runnable) => {
  // 忽略某些已知的无害错误
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  
  // 让其他错误正常抛出
  return true;
});

// 测试前的全局设置
beforeEach(() => {
  // 清理localStorage
  cy.clearLocalStorage();
  
  // 清理sessionStorage
  cy.clearAllSessionStorage();
  
  // 设置视口
  cy.viewport(1280, 720);
  
  // 拦截API请求（可选）
  cy.intercept('GET', '/api/**', { fixture: 'api-responses.json' }).as('apiRequest');
});

// 测试后的清理
afterEach(() => {
  // 清理下载的文件
  cy.task('clearTestData');
});

// 自定义断言
chai.use((chai, utils) => {
  // 检查元素是否可见且可交互
  chai.Assertion.addMethod('beInteractable', function() {
    const obj = this._obj;
    
    new chai.Assertion(obj).to.be.visible;
    new chai.Assertion(obj).to.not.be.disabled;
    new chai.Assertion(obj).to.not.have.css('pointer-events', 'none');
  });
  
  // 检查图表是否已渲染
  chai.Assertion.addMethod('haveChart', function() {
    const obj = this._obj;
    
    // 检查Plotly图表
    cy.get(obj).within(() => {
      cy.get('.js-plotly-plot, .plotly-graph-div').should('exist');
    });
  });
  
  // 检查加载状态
  chai.Assertion.addMethod('beLoading', function() {
    const obj = this._obj;
    
    cy.get(obj).should('have.class', 'loading')
      .or('contain.text', '加载中')
      .or('contain.text', 'Loading');
  });
});

// 全局工具函数
Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add('getByRole', (role, options = {}) => {
  return cy.get(`[role="${role}"]`, options);
});

// 等待网络请求完成
Cypress.Commands.add('waitForNetworkIdle', (timeout = 2000) => {
  let requestCount = 0;
  
  cy.intercept('**', (req) => {
    requestCount++;
    req.continue((res) => {
      requestCount--;
    });
  });
  
  cy.waitUntil(() => requestCount === 0, {
    timeout,
    interval: 100
  });
});

// 模拟文件上传
Cypress.Commands.add('uploadFile', (selector, filePath, fileName = 'test.xlsx') => {
  cy.fixture(filePath, 'base64').then(fileContent => {
    const blob = Cypress.Blob.base64StringToBlob(fileContent);
    const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    cy.get(selector).then(input => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input[0].files = dataTransfer.files;
      
      cy.wrap(input).trigger('change', { force: true });
    });
  });
});

// 等待图表渲染完成
Cypress.Commands.add('waitForChart', (selector = '#chart-container') => {
  cy.get(selector).within(() => {
    cy.get('.js-plotly-plot, .plotly-graph-div', { timeout: 10000 }).should('exist');
    
    // 等待图表动画完成
    cy.wait(1000);
  });
});

// 检查图表数据
Cypress.Commands.add('verifyChartData', (expectedDataPoints) => {
  cy.window().then((win) => {
    const plotlyDiv = win.document.querySelector('.js-plotly-plot');
    if (plotlyDiv && plotlyDiv.data) {
      expect(plotlyDiv.data[0].x).to.have.length.at.least(expectedDataPoints);
      expect(plotlyDiv.data[0].y).to.have.length.at.least(expectedDataPoints);
    }
  });
});

// 模拟拖拽操作
Cypress.Commands.add('dragAndDrop', (sourceSelector, targetSelector) => {
  cy.get(sourceSelector).trigger('mousedown', { button: 0 });
  cy.get(targetSelector).trigger('mousemove').trigger('mouseup');
});

// 检查响应式布局
Cypress.Commands.add('checkResponsive', () => {
  const viewports = [
    { width: 320, height: 568 },   // Mobile
    { width: 768, height: 1024 },  // Tablet
    { width: 1024, height: 768 },  // Desktop Small
    { width: 1280, height: 720 },  // Desktop Medium
    { width: 1920, height: 1080 }  // Desktop Large
  ];
  
  viewports.forEach(viewport => {
    cy.viewport(viewport.width, viewport.height);
    cy.wait(500); // 等待布局调整
    
    // 检查关键元素是否可见
    cy.get('[data-testid="main-container"]').should('be.visible');
    cy.get('[data-testid="navigation"]').should('be.visible');
  });
});

// 性能测试辅助函数
Cypress.Commands.add('measurePerformance', (actionCallback) => {
  cy.window().then((win) => {
    // 清除之前的性能标记
    win.performance.clearMarks();
    win.performance.clearMeasures();
    
    // 开始性能测量
    win.performance.mark('action-start');
    
    // 执行操作
    actionCallback();
    
    // 结束性能测量
    cy.then(() => {
      win.performance.mark('action-end');
      win.performance.measure('action-duration', 'action-start', 'action-end');
      
      const measures = win.performance.getEntriesByType('measure');
      const actionMeasure = measures.find(m => m.name === 'action-duration');
      
      if (actionMeasure) {
        cy.log(`Action took ${actionMeasure.duration.toFixed(2)}ms`);
        
        // 断言性能要求（可根据需要调整）
        expect(actionMeasure.duration).to.be.lessThan(5000); // 5秒内完成
      }
    });
  });
});

// 可访问性检查
Cypress.Commands.add('checkA11y', (selector = null) => {
  const target = selector || 'body';
  
  cy.get(target).within(() => {
    // 检查基本的可访问性要求
    cy.get('img').each(($img) => {
      cy.wrap($img).should('have.attr', 'alt');
    });
    
    cy.get('input').each(($input) => {
      const id = $input.attr('id');
      const ariaLabel = $input.attr('aria-label');
      const ariaLabelledby = $input.attr('aria-labelledby');
      
      expect(id || ariaLabel || ariaLabelledby).to.exist;
    });
    
    cy.get('button').each(($button) => {
      const text = $button.text().trim();
      const ariaLabel = $button.attr('aria-label');
      
      expect(text || ariaLabel).to.exist;
    });
  });
});

// 错误处理测试
Cypress.Commands.add('triggerError', (errorType) => {
  cy.window().then((win) => {
    switch (errorType) {
      case 'network':
        // 模拟网络错误
        cy.intercept('GET', '/api/**', { forceNetworkError: true });
        break;
      case 'server':
        // 模拟服务器错误
        cy.intercept('GET', '/api/**', { statusCode: 500, body: { error: 'Server error' } });
        break;
      case 'javascript':
        // 触发JavaScript错误
        win.eval('throw new Error("Test error")');
        break;
      default:
        throw new Error(`Unknown error type: ${errorType}`);
    }
  });
});

// 数据验证辅助函数
Cypress.Commands.add('validateTableData', (selector, expectedRows) => {
  cy.get(selector).within(() => {
    cy.get('tbody tr').should('have.length', expectedRows);
    
    // 验证每行都有数据
    cy.get('tbody tr').each(($row) => {
      cy.wrap($row).find('td').should('not.be.empty');
    });
  });
});

// 导出功能测试
Cypress.Commands.add('testExport', (format) => {
  const downloadsFolder = Cypress.config('downloadsFolder');
  
  cy.get(`[data-testid="export-${format}"]`).click();
  
  // 验证文件下载
  cy.readFile(`${downloadsFolder}/chart.${format}`, { timeout: 10000 })
    .should('exist');
});

// 本地化测试
Cypress.Commands.add('switchLanguage', (language) => {
  cy.get('[data-testid="language-selector"]').select(language);
  cy.wait(500); // 等待语言切换完成
});

// 主题切换测试
Cypress.Commands.add('switchTheme', (theme) => {
  cy.get('[data-testid="theme-selector"]').select(theme);
  cy.wait(500); // 等待主题切换完成
  
  // 验证主题应用
  cy.get('body').should('have.class', `theme-${theme}`);
});