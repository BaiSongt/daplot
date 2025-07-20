// Cypress自定义命令

// 登录命令（如果需要）
Cypress.Commands.add('login', (username = 'testuser', password = 'testpass') => {
  cy.session([username, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="username"]').type(username);
    cy.get('[data-testid="password"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('not.include', '/login');
  });
});

// 页面导航命令
Cypress.Commands.add('visitVisualization', () => {
  cy.visit('/visualization-new.html');
  cy.get('[data-testid="visualization-page"]', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('visitDataIntegrated', () => {
  cy.visit('/data_integrated-new.html');
  cy.get('[data-testid="data-page"]', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('visitPrediction', () => {
  cy.visit('/prediction-new.html');
  cy.get('[data-testid="prediction-page"]', { timeout: 10000 }).should('be.visible');
});

// 文件操作命令
Cypress.Commands.add('selectTestFile', (fileName = 'test-data.xlsx') => {
  cy.get('[data-testid="file-selector"]').within(() => {
    cy.contains('.file-item', fileName).click();
  });
  
  // 等待文件加载完成
  cy.get('[data-testid="loading-indicator"]', { timeout: 10000 }).should('not.exist');
});

Cypress.Commands.add('uploadTestFile', (fixturePath = 'test-data.xlsx') => {
  cy.get('[data-testid="file-upload-input"]').selectFile(`tests/e2e/fixtures/${fixturePath}`, {
    force: true
  });
  
  // 等待上传完成
  cy.get('[data-testid="upload-progress"]', { timeout: 15000 }).should('not.exist');
  cy.get('[data-testid="upload-success"]').should('be.visible');
});

// 数据筛选命令
Cypress.Commands.add('addFilter', (column, operator, value) => {
  cy.get('[data-testid="add-filter-button"]').click();
  
  cy.get('[data-testid="filter-column-select"]').last().select(column);
  cy.get('[data-testid="filter-operator-select"]').last().select(operator);
  cy.get('[data-testid="filter-value-input"]').last().type(value);
  
  cy.get('[data-testid="apply-filters-button"]').click();
  
  // 等待筛选完成
  cy.get('[data-testid="filter-loading"]', { timeout: 10000 }).should('not.exist');
});

Cypress.Commands.add('clearAllFilters', () => {
  cy.get('[data-testid="clear-filters-button"]').click();
  
  // 确认清除
  cy.get('[data-testid="confirm-clear-filters"]').click();
  
  // 等待清除完成
  cy.get('[data-testid="filter-loading"]', { timeout: 10000 }).should('not.exist');
});

// 图表操作命令
Cypress.Commands.add('configureChart', (config) => {
  const { type, xAxis, yAxis, color } = config;
  
  if (type) {
    cy.get('[data-testid="chart-type-select"]').select(type);
  }
  
  if (xAxis) {
    cy.get('[data-testid="x-axis-select"]').select(xAxis);
  }
  
  if (yAxis) {
    cy.get('[data-testid="y-axis-select"]').select(yAxis);
  }
  
  if (color) {
    cy.get('[data-testid="color-column-select"]').select(color);
  }
  
  cy.get('[data-testid="generate-chart-button"]').click();
  
  // 等待图表生成
  cy.waitForChart();
});

Cypress.Commands.add('exportChart', (format = 'png') => {
  cy.get('[data-testid="export-dropdown"]').click();
  cy.get(`[data-testid="export-${format}"]`).click();
  
  // 等待导出完成
  cy.get('[data-testid="export-success"]', { timeout: 10000 }).should('be.visible');
});

// 预测功能命令
Cypress.Commands.add('configurePrediction', (config) => {
  const { algorithm, steps, targetColumn, features } = config;
  
  if (algorithm) {
    cy.get('[data-testid="prediction-algorithm-select"]').select(algorithm);
  }
  
  if (steps) {
    cy.get('[data-testid="prediction-steps-input"]').clear().type(steps.toString());
  }
  
  if (targetColumn) {
    cy.get('[data-testid="target-column-select"]').select(targetColumn);
  }
  
  if (features && features.length > 0) {
    features.forEach(feature => {
      cy.get('[data-testid="feature-columns-select"]').select(feature, { force: true });
    });
  }
  
  cy.get('[data-testid="generate-prediction-button"]').click();
  
  // 等待预测完成
  cy.get('[data-testid="prediction-loading"]', { timeout: 30000 }).should('not.exist');
  cy.get('[data-testid="prediction-results"]').should('be.visible');
});

// 数据验证命令
Cypress.Commands.add('verifyDataTable', (expectedRows, expectedColumns) => {
  cy.get('[data-testid="data-table"]').within(() => {
    if (expectedRows) {
      cy.get('tbody tr').should('have.length.at.least', expectedRows);
    }
    
    if (expectedColumns) {
      cy.get('thead th').should('have.length', expectedColumns);
    }
    
    // 验证数据不为空
    cy.get('tbody tr').first().within(() => {
      cy.get('td').each(($cell) => {
        cy.wrap($cell).should('not.be.empty');
      });
    });
  });
});

Cypress.Commands.add('verifyChartExists', (chartType = null) => {
  cy.get('[data-testid="chart-container"]').within(() => {
    cy.get('.js-plotly-plot').should('exist');
    
    if (chartType) {
      cy.window().then((win) => {
        const plotlyDiv = win.document.querySelector('.js-plotly-plot');
        if (plotlyDiv && plotlyDiv.data && plotlyDiv.data[0]) {
          expect(plotlyDiv.data[0].type).to.include(chartType);
        }
      });
    }
  });
});

// 错误处理验证命令
Cypress.Commands.add('verifyErrorMessage', (expectedMessage) => {
  cy.get('[data-testid="error-message"]').should('be.visible');
  
  if (expectedMessage) {
    cy.get('[data-testid="error-message"]').should('contain.text', expectedMessage);
  }
});

Cypress.Commands.add('dismissError', () => {
  cy.get('[data-testid="error-dismiss"]').click();
  cy.get('[data-testid="error-message"]').should('not.exist');
});

// 加载状态验证命令
Cypress.Commands.add('verifyLoadingState', (shouldBeLoading = true) => {
  if (shouldBeLoading) {
    cy.get('[data-testid="loading-indicator"]').should('be.visible');
  } else {
    cy.get('[data-testid="loading-indicator"]').should('not.exist');
  }
});

// 成功状态验证命令
Cypress.Commands.add('verifySuccessMessage', (expectedMessage) => {
  cy.get('[data-testid="success-message"]').should('be.visible');
  
  if (expectedMessage) {
    cy.get('[data-testid="success-message"]').should('contain.text', expectedMessage);
  }
});

// 表单验证命令
Cypress.Commands.add('verifyFormValidation', (fieldSelector, expectedError) => {
  cy.get(fieldSelector).should('have.class', 'error');
  
  if (expectedError) {
    cy.get(`${fieldSelector}-error`).should('contain.text', expectedError);
  }
});

// 键盘导航测试命令
Cypress.Commands.add('testKeyboardNavigation', () => {
  // 测试Tab键导航
  cy.get('body').tab();
  cy.focused().should('be.visible');
  
  // 测试Enter键激活
  cy.focused().type('{enter}');
  
  // 测试Escape键取消
  cy.get('body').type('{esc}');
});

// 快捷键测试命令
Cypress.Commands.add('testShortcuts', () => {
  // 测试Ctrl+S保存
  cy.get('body').type('{ctrl+s}');
  cy.verifySuccessMessage('图表已保存');
  
  // 测试Ctrl+Z撤销
  cy.get('body').type('{ctrl+z}');
  
  // 测试Ctrl+Y重做
  cy.get('body').type('{ctrl+y}');
});

// 拖拽测试命令
Cypress.Commands.add('testDragAndDrop', (sourceSelector, targetSelector) => {
  cy.get(sourceSelector)
    .trigger('mousedown', { button: 0 })
    .wait(100);
    
  cy.get(targetSelector)
    .trigger('mousemove')
    .trigger('mouseup');
    
  cy.wait(500); // 等待拖拽完成
});

// 滚动测试命令
Cypress.Commands.add('testInfiniteScroll', (containerSelector) => {
  let previousItemCount = 0;
  
  cy.get(`${containerSelector} .item`).then(($items) => {
    previousItemCount = $items.length;
  });
  
  // 滚动到底部
  cy.get(containerSelector).scrollTo('bottom');
  
  // 等待新内容加载
  cy.wait(2000);
  
  // 验证新内容已加载
  cy.get(`${containerSelector} .item`).should('have.length.greaterThan', previousItemCount);
});

// 搜索功能测试命令
Cypress.Commands.add('testSearch', (searchTerm, expectedResults) => {
  cy.get('[data-testid="search-input"]').type(searchTerm);
  cy.get('[data-testid="search-button"]').click();
  
  // 等待搜索完成
  cy.get('[data-testid="search-loading"]', { timeout: 10000 }).should('not.exist');
  
  if (expectedResults) {
    cy.get('[data-testid="search-results"] .result-item').should('have.length', expectedResults);
  }
});

// 分页测试命令
Cypress.Commands.add('testPagination', () => {
  // 测试下一页
  cy.get('[data-testid="next-page"]').click();
  cy.get('[data-testid="current-page"]').should('contain', '2');
  
  // 测试上一页
  cy.get('[data-testid="prev-page"]').click();
  cy.get('[data-testid="current-page"]').should('contain', '1');
  
  // 测试跳转到指定页
  cy.get('[data-testid="page-input"]').clear().type('3{enter}');
  cy.get('[data-testid="current-page"]').should('contain', '3');
});

// 模态框测试命令
Cypress.Commands.add('openModal', (triggerSelector) => {
  cy.get(triggerSelector).click();
  cy.get('[data-testid="modal"]').should('be.visible');
  cy.get('[data-testid="modal-backdrop"]').should('exist');
});

Cypress.Commands.add('closeModal', () => {
  cy.get('[data-testid="modal-close"]').click();
  cy.get('[data-testid="modal"]').should('not.exist');
});

// 工具提示测试命令
Cypress.Commands.add('verifyTooltip', (triggerSelector, expectedText) => {
  cy.get(triggerSelector).trigger('mouseover');
  cy.get('[data-testid="tooltip"]').should('be.visible');
  
  if (expectedText) {
    cy.get('[data-testid="tooltip"]').should('contain.text', expectedText);
  }
  
  cy.get(triggerSelector).trigger('mouseout');
  cy.get('[data-testid="tooltip"]').should('not.exist');
});

// 下拉菜单测试命令
Cypress.Commands.add('selectFromDropdown', (dropdownSelector, optionText) => {
  cy.get(dropdownSelector).click();
  cy.get('[data-testid="dropdown-menu"]').should('be.visible');
  cy.get('[data-testid="dropdown-menu"]').contains(optionText).click();
  cy.get('[data-testid="dropdown-menu"]').should('not.exist');
});

// 多选框测试命令
Cypress.Commands.add('selectMultipleOptions', (selectorPrefix, options) => {
  options.forEach(option => {
    cy.get(`[data-testid="${selectorPrefix}-${option}"]`).check();
  });
});

// 日期选择器测试命令
Cypress.Commands.add('selectDate', (datePickerSelector, date) => {
  cy.get(datePickerSelector).click();
  cy.get('[data-testid="date-picker"]').should('be.visible');
  
  // 简化的日期选择逻辑
  cy.get('[data-testid="date-picker"]').contains(date).click();
  cy.get('[data-testid="date-picker"]').should('not.exist');
});

// 颜色选择器测试命令
Cypress.Commands.add('selectColor', (colorPickerSelector, color) => {
  cy.get(colorPickerSelector).click();
  cy.get('[data-testid="color-picker"]').should('be.visible');
  cy.get(`[data-testid="color-option-${color}"]`).click();
  cy.get('[data-testid="color-picker"]').should('not.exist');
});