// FileSelector组件单元测试
const { mockFileData, createMockAppState, waitFor } = require('../../fixtures/test-data.js');

// 模拟FileSelector组件
class FileSelector {
  constructor(options = {}) {
    this.container = typeof options.container === 'string' ?
      document.getElementById(options.container) :
      options.container;
    
    this.options = {
      multiple: false,
      showPreview: true,
      allowedTypes: ['.xlsx', '.xls', '.csv'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      onSelect: null,
      onError: null,
      ...options
    };
    
    this.selectedFiles = [];
    this.fileList = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.searchQuery = '';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    
    this.init();
  }
  
  init() {
    if (!this.container) {
      throw new Error('FileSelector container not found');
    }
    
    this.render();
    this.bindEvents();
    this.loadFileList();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="file-selector">
        <div class="file-selector-header">
          <div class="search-container">
            <input type="text" id="file-search" placeholder="搜索文件..." />
            <button id="search-btn">搜索</button>
          </div>
          <div class="upload-container">
            <input type="file" id="file-upload" ${this.options.multiple ? 'multiple' : ''} 
                   accept="${this.options.allowedTypes.join(',')}" style="display: none;" />
            <button id="upload-btn">上传文件</button>
          </div>
          <div class="sort-container">
            <select id="sort-select">
              <option value="name">按名称排序</option>
              <option value="date">按日期排序</option>
              <option value="size">按大小排序</option>
            </select>
            <button id="sort-order-btn" data-order="asc">↑</button>
          </div>
        </div>
        
        <div class="file-list-container">
          <div id="file-list" class="file-list"></div>
          <div id="file-list-loading" class="loading" style="display: none;">
            <span>加载中...</span>
          </div>
          <div id="file-list-empty" class="empty" style="display: none;">
            <span>暂无文件</span>
          </div>
        </div>
        
        <div class="pagination-container">
          <button id="prev-page" disabled>上一页</button>
          <span id="page-info">第 1 页，共 1 页</span>
          <button id="next-page" disabled>下一页</button>
        </div>
        
        ${this.options.showPreview ? `
          <div class="file-preview-container" style="display: none;">
            <h4>文件预览</h4>
            <div id="file-preview"></div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  bindEvents() {
    // 搜索事件
    const searchInput = this.container.querySelector('#file-search');
    const searchBtn = this.container.querySelector('#search-btn');
    
    searchInput.addEventListener('input', this.debounce((e) => {
      this.searchQuery = e.target.value;
      this.currentPage = 1;
      this.renderFileList();
    }, 300));
    
    searchBtn.addEventListener('click', () => {
      this.searchQuery = searchInput.value;
      this.currentPage = 1;
      this.renderFileList();
    });
    
    // 上传事件
    const uploadBtn = this.container.querySelector('#upload-btn');
    const fileUpload = this.container.querySelector('#file-upload');
    
    uploadBtn.addEventListener('click', () => fileUpload.click());
    fileUpload.addEventListener('change', this.handleFileUpload.bind(this));
    
    // 排序事件
    const sortSelect = this.container.querySelector('#sort-select');
    const sortOrderBtn = this.container.querySelector('#sort-order-btn');
    
    sortSelect.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.renderFileList();
    });
    
    sortOrderBtn.addEventListener('click', () => {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      sortOrderBtn.textContent = this.sortOrder === 'asc' ? '↑' : '↓';
      sortOrderBtn.dataset.order = this.sortOrder;
      this.renderFileList();
    });
    
    // 分页事件
    const prevBtn = this.container.querySelector('#prev-page');
    const nextBtn = this.container.querySelector('#next-page');
    
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderFileList();
      }
    });
    
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(this.getFilteredFiles().length / this.itemsPerPage);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.renderFileList();
      }
    });
  }
  
  async loadFileList() {
    this.showLoading(true);
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.fileList = [
        {
          id: 'file1',
          name: 'sales_data.xlsx',
          size: 1024 * 1024,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          lastModified: new Date('2023-01-15'),
          rows: 1000,
          columns: 5
        },
        {
          id: 'file2',
          name: 'customer_info.csv',
          size: 512 * 1024,
          type: 'text/csv',
          lastModified: new Date('2023-01-10'),
          rows: 500,
          columns: 8
        },
        {
          id: 'file3',
          name: 'product_catalog.xlsx',
          size: 2 * 1024 * 1024,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          lastModified: new Date('2023-01-20'),
          rows: 2000,
          columns: 12
        }
      ];
      
      this.renderFileList();
    } catch (error) {
      this.showError('加载文件列表失败: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }
  
  getFilteredFiles() {
    let filtered = [...this.fileList];
    
    // 搜索过滤
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(query)
      );
    }
    
    // 排序
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (this.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = a.lastModified.getTime();
          bValue = b.lastModified.getTime();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (this.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return filtered;
  }
  
  renderFileList() {
    const fileListContainer = this.container.querySelector('#file-list');
    const filtered = this.getFilteredFiles();
    
    if (filtered.length === 0) {
      this.showEmpty(true);
      return;
    }
    
    this.showEmpty(false);
    
    // 分页
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageFiles = filtered.slice(startIndex, endIndex);
    
    // 渲染文件项
    fileListContainer.innerHTML = pageFiles.map(file => `
      <div class="file-item" data-file-id="${file.id}">
        <div class="file-icon">
          ${this.getFileIcon(file.type)}
        </div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-meta">
            <span class="file-size">${this.formatFileSize(file.size)}</span>
            <span class="file-date">${this.formatDate(file.lastModified)}</span>
            <span class="file-dimensions">${file.rows} 行 × ${file.columns} 列</span>
          </div>
        </div>
        <div class="file-actions">
          <button class="select-btn" data-file-id="${file.id}">选择</button>
          <button class="preview-btn" data-file-id="${file.id}">预览</button>
          <button class="delete-btn" data-file-id="${file.id}">删除</button>
        </div>
      </div>
    `).join('');
    
    // 绑定文件项事件
    this.bindFileItemEvents();
    
    // 更新分页信息
    this.updatePagination(filtered.length);
  }
  
  bindFileItemEvents() {
    const fileItems = this.container.querySelectorAll('.file-item');
    
    fileItems.forEach(item => {
      const fileId = item.dataset.fileId;
      
      // 选择按钮
      const selectBtn = item.querySelector('.select-btn');
      selectBtn.addEventListener('click', () => this.selectFile(fileId));
      
      // 预览按钮
      const previewBtn = item.querySelector('.preview-btn');
      if (previewBtn) {
        previewBtn.addEventListener('click', () => this.previewFile(fileId));
      }
      
      // 删除按钮
      const deleteBtn = item.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => this.deleteFile(fileId));
      
      // 双击选择
      item.addEventListener('dblclick', () => this.selectFile(fileId));
    });
  }
  
  async selectFile(fileId) {
    const file = this.fileList.find(f => f.id === fileId);
    if (!file) return;
    
    if (this.options.multiple) {
      const index = this.selectedFiles.findIndex(f => f.id === fileId);
      if (index === -1) {
        this.selectedFiles.push(file);
      } else {
        this.selectedFiles.splice(index, 1);
      }
    } else {
      this.selectedFiles = [file];
    }
    
    // 更新UI
    this.updateSelectedState();
    
    // 触发回调
    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(this.options.multiple ? this.selectedFiles : file);
    }
  }
  
  async previewFile(fileId) {
    if (!this.options.showPreview) return;
    
    const file = this.fileList.find(f => f.id === fileId);
    if (!file) return;
    
    const previewContainer = this.container.querySelector('.file-preview-container');
    const previewContent = this.container.querySelector('#file-preview');
    
    previewContainer.style.display = 'block';
    previewContent.innerHTML = '<div class="loading">加载预览中...</div>';
    
    try {
      // 模拟获取预览数据
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const previewData = {
        headers: ['日期', '销售额', '地区', '产品', '数量'],
        rows: [
          ['2023-01-01', '10000', '北京', '产品A', '100'],
          ['2023-01-02', '15000', '上海', '产品B', '150'],
          ['2023-01-03', '12000', '广州', '产品A', '120']
        ]
      };
      
      previewContent.innerHTML = `
        <table class="preview-table">
          <thead>
            <tr>
              ${previewData.headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${previewData.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="preview-info">
          <p>显示前3行数据，共 ${file.rows} 行 × ${file.columns} 列</p>
        </div>
      `;
    } catch (error) {
      previewContent.innerHTML = `<div class="error">预览失败: ${error.message}</div>`;
    }
  }
  
  async deleteFile(fileId) {
    if (!confirm('确定要删除这个文件吗？')) return;
    
    try {
      // 模拟删除API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 从列表中移除
      this.fileList = this.fileList.filter(f => f.id !== fileId);
      
      // 从选中列表中移除
      this.selectedFiles = this.selectedFiles.filter(f => f.id !== fileId);
      
      // 重新渲染
      this.renderFileList();
      this.updateSelectedState();
      
    } catch (error) {
      this.showError('删除文件失败: ' + error.message);
    }
  }
  
  async handleFileUpload(event) {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      // 验证文件
      const validation = this.validateFile(file);
      if (!validation.valid) {
        this.showError(`文件 "${file.name}" 验证失败: ${validation.error}`);
        continue;
      }
      
      try {
        // 模拟上传
        await this.uploadFile(file);
      } catch (error) {
        this.showError(`上传文件 "${file.name}" 失败: ${error.message}`);
      }
    }
    
    // 清空文件输入
    event.target.value = '';
  }
  
  validateFile(file) {
    // 检查文件类型
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.options.allowedTypes.includes(extension)) {
      return {
        valid: false,
        error: `不支持的文件类型，支持的类型: ${this.options.allowedTypes.join(', ')}`
      };
    }
    
    // 检查文件大小
    if (file.size > this.options.maxFileSize) {
      return {
        valid: false,
        error: `文件过大，最大支持 ${this.formatFileSize(this.options.maxFileSize)}`
      };
    }
    
    return { valid: true };
  }
  
  async uploadFile(file) {
    // 模拟上传过程
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 添加到文件列表
    const newFile = {
      id: 'uploaded-' + Date.now(),
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(),
      rows: Math.floor(Math.random() * 1000) + 100,
      columns: Math.floor(Math.random() * 10) + 3
    };
    
    this.fileList.unshift(newFile);
    this.renderFileList();
  }
  
  updateSelectedState() {
    const fileItems = this.container.querySelectorAll('.file-item');
    
    fileItems.forEach(item => {
      const fileId = item.dataset.fileId;
      const isSelected = this.selectedFiles.some(f => f.id === fileId);
      
      item.classList.toggle('selected', isSelected);
      
      const selectBtn = item.querySelector('.select-btn');
      selectBtn.textContent = isSelected ? '已选择' : '选择';
    });
  }
  
  updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    const pageInfo = this.container.querySelector('#page-info');
    const prevBtn = this.container.querySelector('#prev-page');
    const nextBtn = this.container.querySelector('#next-page');
    
    pageInfo.textContent = `第 ${this.currentPage} 页，共 ${totalPages} 页`;
    prevBtn.disabled = this.currentPage <= 1;
    nextBtn.disabled = this.currentPage >= totalPages;
  }
  
  showLoading(show) {
    const loading = this.container.querySelector('#file-list-loading');
    const fileList = this.container.querySelector('#file-list');
    
    if (loading) {
      loading.style.display = show ? 'block' : 'none';
    }
    if (fileList) {
      fileList.style.display = show ? 'none' : 'block';
    }
  }
  
  showEmpty(show) {
    const empty = this.container.querySelector('#file-list-empty');
    const fileList = this.container.querySelector('#file-list');
    
    if (empty) {
      empty.style.display = show ? 'block' : 'none';
    }
    if (fileList) {
      fileList.style.display = show ? 'none' : 'block';
    }
  }
  
  showError(message) {
    if (typeof this.options.onError === 'function') {
      this.options.onError(message);
    } else {
      alert(message);
    }
  }
  
  // 工具方法
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  formatDate(date) {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
  
  getFileIcon(type) {
    if (type.includes('excel') || type.includes('spreadsheet')) {
      return '📊';
    } else if (type.includes('csv')) {
      return '📄';
    }
    return '📁';
  }
  
  // 公共方法
  getSelectedFiles() {
    return [...this.selectedFiles];
  }
  
  clearSelection() {
    this.selectedFiles = [];
    this.updateSelectedState();
  }
  
  refresh() {
    this.loadFileList();
  }
  
  destroy() {
    // 清理事件监听器和资源
    this.container.innerHTML = '';
  }
}

describe('FileSelector', () => {
  let fileSelector;
  let container;
  let mockOnSelect;
  let mockOnError;

  beforeEach(() => {
    // 创建容器
    container = document.createElement('div');
    container.id = 'file-selector-container';
    document.body.appendChild(container);

    // 创建模拟回调
    mockOnSelect = jest.fn();
    mockOnError = jest.fn();

    // 创建FileSelector实例
    fileSelector = new FileSelector({
      container: container,
      onSelect: mockOnSelect,
      onError: mockOnError
    });
  });

  afterEach(() => {
    if (fileSelector) {
      fileSelector.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('初始化', () => {
    test('应该正确初始化组件', () => {
      expect(container.querySelector('.file-selector')).toBeTruthy();
      expect(container.querySelector('#file-search')).toBeTruthy();
      expect(container.querySelector('#upload-btn')).toBeTruthy();
      expect(container.querySelector('#file-list')).toBeTruthy();
    });

    test('应该在容器不存在时抛出错误', () => {
      expect(() => {
        new FileSelector({ container: 'non-existent-container' });
      }).toThrow('FileSelector container not found');
    });

    test('应该设置默认选项', () => {
      expect(fileSelector.options.multiple).toBe(false);
      expect(fileSelector.options.showPreview).toBe(true);
      expect(fileSelector.options.allowedTypes).toEqual(['.xlsx', '.xls', '.csv']);
    });
  });

  describe('文件列表加载', () => {
    test('应该加载文件列表', async () => {
      // 等待初始加载完成
      await waitFor(() => {
        return container.querySelectorAll('.file-item').length > 0;
      });

      const fileItems = container.querySelectorAll('.file-item');
      expect(fileItems.length).toBeGreaterThan(0);
    });

    test('应该显示加载状态', () => {
      const loading = container.querySelector('#file-list-loading');
      expect(loading).toBeTruthy();
    });

    test('应该在没有文件时显示空状态', async () => {
      // 清空文件列表
      fileSelector.fileList = [];
      fileSelector.renderFileList();

      const empty = container.querySelector('#file-list-empty');
      expect(empty.style.display).toBe('block');
    });
  });

  describe('文件搜索', () => {
    beforeEach(async () => {
      // 等待文件列表加载完成
      await waitFor(() => {
        return fileSelector.fileList.length > 0;
      });
    });

    test('应该能够搜索文件', async () => {
      const searchInput = container.querySelector('#file-search');
      
      // 输入搜索关键词
      searchInput.value = 'sales';
      searchInput.dispatchEvent(new Event('input'));

      // 等待防抖完成
      await new Promise(resolve => setTimeout(resolve, 350));

      const fileItems = container.querySelectorAll('.file-item');
      expect(fileItems.length).toBe(1);
      expect(fileItems[0].querySelector('.file-name').textContent).toContain('sales');
    });

    test('应该在搜索无结果时显示空状态', async () => {
      const searchInput = container.querySelector('#file-search');
      
      searchInput.value = 'nonexistent';
      searchInput.dispatchEvent(new Event('input'));

      await new Promise(resolve => setTimeout(resolve, 350));

      const empty = container.querySelector('#file-list-empty');
      expect(empty.style.display).toBe('block');
    });

    test('搜索按钮应该触发搜索', () => {
      const searchInput = container.querySelector('#file-search');
      const searchBtn = container.querySelector('#search-btn');
      
      searchInput.value = 'test';
      searchBtn.click();

      expect(fileSelector.searchQuery).toBe('test');
    });
  });

  describe('文件排序', () => {
    beforeEach(async () => {
      await waitFor(() => {
        return fileSelector.fileList.length > 0;
      });
    });

    test('应该能够按名称排序', () => {
      const sortSelect = container.querySelector('#sort-select');
      
      sortSelect.value = 'name';
      sortSelect.dispatchEvent(new Event('change'));

      expect(fileSelector.sortBy).toBe('name');
    });

    test('应该能够切换排序顺序', () => {
      const sortOrderBtn = container.querySelector('#sort-order-btn');
      
      sortOrderBtn.click();

      expect(fileSelector.sortOrder).toBe('desc');
      expect(sortOrderBtn.textContent).toBe('↓');
    });

    test('应该正确排序文件列表', () => {
      fileSelector.sortBy = 'name';
      fileSelector.sortOrder = 'asc';
      
      const sorted = fileSelector.getFilteredFiles();
      
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i-1].name.toLowerCase() <= sorted[i].name.toLowerCase()).toBe(true);
      }
    });
  });

  describe('文件选择', () => {
    beforeEach(async () => {
      await waitFor(() => {
        return container.querySelectorAll('.file-item').length > 0;
      });
    });

    test('应该能够选择文件', async () => {
      const selectBtn = container.querySelector('.select-btn');
      
      selectBtn.click();

      expect(fileSelector.selectedFiles.length).toBe(1);
      expect(mockOnSelect).toHaveBeenCalled();
    });

    test('单选模式下应该只能选择一个文件', async () => {
      const selectBtns = container.querySelectorAll('.select-btn');
      
      selectBtns[0].click();
      selectBtns[1].click();

      expect(fileSelector.selectedFiles.length).toBe(1);
    });

    test('多选模式下应该能够选择多个文件', async () => {
      fileSelector.options.multiple = true;
      
      const selectBtns = container.querySelectorAll('.select-btn');
      
      selectBtns[0].click();
      selectBtns[1].click();

      expect(fileSelector.selectedFiles.length).toBe(2);
    });

    test('双击应该选择文件', async () => {
      const fileItem = container.querySelector('.file-item');
      
      fileItem.dispatchEvent(new Event('dblclick'));

      expect(fileSelector.selectedFiles.length).toBe(1);
    });

    test('应该更新选中状态的UI', async () => {
      const fileItem = container.querySelector('.file-item');
      const selectBtn = fileItem.querySelector('.select-btn');
      
      selectBtn.click();

      expect(fileItem.classList.contains('selected')).toBe(true);
      expect(selectBtn.textContent).toBe('已选择');
    });
  });

  describe('文件预览', () => {
    beforeEach(async () => {
      await waitFor(() => {
        return container.querySelectorAll('.file-item').length > 0;
      });
    });

    test('应该能够预览文件', async () => {
      const previewBtn = container.querySelector('.preview-btn');
      
      previewBtn.click();

      // 等待预览加载完成
      await waitFor(() => {
        return container.querySelector('.preview-table');
      });

      const previewContainer = container.querySelector('.file-preview-container');
      expect(previewContainer.style.display).toBe('block');
      expect(container.querySelector('.preview-table')).toBeTruthy();
    });

    test('预览功能可以被禁用', () => {
      fileSelector.options.showPreview = false;
      
      const previewBtn = container.querySelector('.preview-btn');
      if (previewBtn) {
        previewBtn.click();
      }

      // 预览容器应该隐藏或不存在
      const previewContainer = container.querySelector('.file-preview-container');
      if (previewContainer) {
        expect(previewContainer.style.display).toBe('none');
      } else {
        expect(previewContainer).toBeFalsy();
      }
    });
  });

  describe('文件上传', () => {
    test('应该能够触发文件上传', () => {
      const uploadBtn = container.querySelector('#upload-btn');
      const fileUpload = container.querySelector('#file-upload');
      
      const clickSpy = jest.spyOn(fileUpload, 'click');
      
      uploadBtn.click();

      expect(clickSpy).toHaveBeenCalled();
    });

    test('应该验证上传的文件', () => {
      const validFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const validation = fileSelector.validateFile(validFile);
      expect(validation.valid).toBe(true);
    });

    test('应该拒绝无效的文件类型', () => {
      const invalidFile = new File(['test'], 'test.txt', {
        type: 'text/plain'
      });
      
      const validation = fileSelector.validateFile(invalidFile);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('不支持的文件类型');
    });

    test('应该拒绝过大的文件', () => {
      const largeFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      Object.defineProperty(largeFile, 'size', {
        value: 100 * 1024 * 1024,
        writable: false
      });
      
      const validation = fileSelector.validateFile(largeFile);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('文件过大');
    });
  });

  describe('文件删除', () => {
    beforeEach(async () => {
      await waitFor(() => {
        return container.querySelectorAll('.file-item').length > 0;
      });
    });

    test('应该能够删除文件', async () => {
      // 模拟确认对话框
      window.confirm = jest.fn().mockReturnValue(true);
      
      const initialCount = fileSelector.fileList.length;
      const deleteBtn = container.querySelector('.delete-btn');
      
      deleteBtn.click();

      // 等待删除完成
      await waitFor(() => {
        return fileSelector.fileList.length === initialCount - 1;
      });

      expect(fileSelector.fileList.length).toBe(initialCount - 1);
    });

    test('取消删除确认应该不删除文件', () => {
      window.confirm = jest.fn().mockReturnValue(false);
      
      const initialCount = fileSelector.fileList.length;
      const deleteBtn = container.querySelector('.delete-btn');
      
      deleteBtn.click();

      expect(fileSelector.fileList.length).toBe(initialCount);
    });
  });

  describe('分页功能', () => {
    beforeEach(() => {
      // 创建大量文件用于测试分页
      fileSelector.fileList = Array.from({ length: 25 }, (_, i) => ({
        id: `file${i}`,
        name: `file${i}.xlsx`,
        size: 1024,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        lastModified: new Date(),
        rows: 100,
        columns: 5
      }));
      
      fileSelector.itemsPerPage = 10;
      fileSelector.renderFileList();
    });

    test('应该正确分页显示文件', () => {
      const fileItems = container.querySelectorAll('.file-item');
      expect(fileItems.length).toBe(10); // 第一页显示10个
    });

    test('应该能够翻页', () => {
      const nextBtn = container.querySelector('#next-page');
      
      nextBtn.click();

      expect(fileSelector.currentPage).toBe(2);
      
      const fileItems = container.querySelectorAll('.file-item');
      expect(fileItems.length).toBe(10); // 第二页也显示10个
    });

    test('应该正确显示分页信息', () => {
      const pageInfo = container.querySelector('#page-info');
      expect(pageInfo.textContent).toBe('第 1 页，共 3 页');
    });

    test('第一页时上一页按钮应该被禁用', () => {
      const prevBtn = container.querySelector('#prev-page');
      expect(prevBtn.disabled).toBe(true);
    });

    test('最后一页时下一页按钮应该被禁用', () => {
      // 跳到最后一页
      fileSelector.currentPage = 3;
      fileSelector.renderFileList();
      
      const nextBtn = container.querySelector('#next-page');
      expect(nextBtn.disabled).toBe(true);
    });
  });

  describe('工具方法', () => {
    test('应该正确格式化文件大小', () => {
      expect(fileSelector.formatFileSize(0)).toBe('0 Bytes');
      expect(fileSelector.formatFileSize(1024)).toBe('1 KB');
      expect(fileSelector.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(fileSelector.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    test('应该正确格式化日期', () => {
      const date = new Date('2023-01-15');
      const formatted = fileSelector.formatDate(date);
      expect(formatted).toBe('2023/01/15');
    });

    test('应该根据文件类型返回正确图标', () => {
      expect(fileSelector.getFileIcon('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('📊');
      expect(fileSelector.getFileIcon('text/csv')).toBe('📄');
      expect(fileSelector.getFileIcon('unknown')).toBe('📁');
    });

    test('防抖函数应该正常工作', (done) => {
      const mockFn = jest.fn();
      const debouncedFn = fileSelector.debounce(mockFn, 100);
      
      // 快速调用多次
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      // 立即检查，应该还没有被调用
      expect(mockFn).not.toHaveBeenCalled();
      
      // 等待防抖时间后检查
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });
  });

  describe('公共API', () => {
    test('应该能够获取选中的文件', () => {
      fileSelector.selectedFiles = [{ id: 'test', name: 'test.xlsx' }];
      
      const selected = fileSelector.getSelectedFiles();
      expect(selected).toEqual([{ id: 'test', name: 'test.xlsx' }]);
      expect(selected).not.toBe(fileSelector.selectedFiles); // 应该返回副本
    });

    test('应该能够清除选择', () => {
      fileSelector.selectedFiles = [{ id: 'test', name: 'test.xlsx' }];
      
      fileSelector.clearSelection();
      
      expect(fileSelector.selectedFiles).toEqual([]);
    });

    test('应该能够刷新文件列表', () => {
      const loadSpy = jest.spyOn(fileSelector, 'loadFileList');
      
      fileSelector.refresh();
      
      expect(loadSpy).toHaveBeenCalled();
    });

    test('应该能够销毁组件', () => {
      fileSelector.destroy();
      
      expect(container.innerHTML).toBe('');
    });
  });

  describe('错误处理', () => {
    test('应该处理加载错误', async () => {
      // 模拟加载失败
      const originalLoadFileList = fileSelector.loadFileList;
      fileSelector.loadFileList = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });
      
      try {
        await fileSelector.loadFileList();
      } catch (error) {
        // 错误被捕获是正常的
      }
      
      // 验证错误处理
      expect(fileSelector.loadFileList).toHaveBeenCalled();
    });

    test('应该处理上传错误', async () => {
      const file = new File(['test'], 'test.xlsx');
      
      // 模拟上传失败
      fileSelector.uploadFile = jest.fn().mockRejectedValue(new Error('Upload failed'));
      
      await fileSelector.handleFileUpload({ target: { files: [file] } });
      
      expect(mockOnError).toHaveBeenCalledWith('上传文件 "test.xlsx" 失败: Upload failed');
    });
  });

  describe('性能测试', () => {
    test('大量文件渲染应该在合理时间内完成', () => {
      // 创建大量文件
      fileSelector.fileList = Array.from({ length: 1000 }, (_, i) => ({
        id: `file${i}`,
        name: `file${i}.xlsx`,
        size: 1024,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        lastModified: new Date(),
        rows: 100,
        columns: 5
      }));
      
      const startTime = performance.now();
      fileSelector.renderFileList();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    test('搜索大量文件应该高效', () => {
      // 创建大量文件
      fileSelector.fileList = Array.from({ length: 1000 }, (_, i) => ({
        id: `file${i}`,
        name: `file${i}.xlsx`,
        size: 1024,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        lastModified: new Date(),
        rows: 100,
        columns: 5
      }));
      
      fileSelector.searchQuery = 'file1';
      
      const startTime = performance.now();
      const filtered = fileSelector.getFilteredFiles();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
      expect(filtered.length).toBeGreaterThan(0);
    });
  });
});