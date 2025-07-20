// FileSelector组件简化测试
const { mockFileData, createMockAppState, waitFor } = require('../../fixtures/test-data.js');

// 简化的FileSelector类
class SimpleFileSelector {
  constructor(options = {}) {
    this.options = {
      multiple: false,
      showPreview: true,
      allowedTypes: ['.xlsx', '.xls', '.csv'],
      maxFileSize: 50 * 1024 * 1024,
      onSelect: null,
      onError: null,
      ...options
    };
    
    this.selectedFiles = [];
    this.fileList = [];
  }
  
  selectFile(fileId) {
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
    
    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(this.options.multiple ? this.selectedFiles : file);
    }
  }
  
  validateFile(file) {
    // 检查文件对象是否有效
    if (!file || !file.name || typeof file.name !== 'string') {
      return {
        valid: false,
        error: '无效的文件对象'
      };
    }
    
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.options.allowedTypes.includes(extension)) {
      return {
        valid: false,
        error: `不支持的文件类型，支持的类型: ${this.options.allowedTypes.join(', ')}`
      };
    }
    
    if (typeof file.size === 'number' && file.size > this.options.maxFileSize) {
      return {
        valid: false,
        error: `文件过大，最大支持 ${this.formatFileSize(this.options.maxFileSize)}`
      };
    }
    
    return { valid: true };
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  getSelectedFiles() {
    return [...this.selectedFiles];
  }
  
  clearSelection() {
    this.selectedFiles = [];
  }
}

describe('SimpleFileSelector', () => {
  let fileSelector;
  let mockOnSelect;
  let mockOnError;

  beforeEach(() => {
    mockOnSelect = jest.fn();
    mockOnError = jest.fn();
    
    fileSelector = new SimpleFileSelector({
      onSelect: mockOnSelect,
      onError: mockOnError
    });
    
    // 设置测试文件列表
    fileSelector.fileList = [
      { id: 'file1', name: 'test1.xlsx', size: 1024 },
      { id: 'file2', name: 'test2.csv', size: 2048 },
      { id: 'file3', name: 'test3.xlsx', size: 4096 }
    ];
  });

  describe('基本功能', () => {
    test('应该正确初始化', () => {
      expect(fileSelector.options.multiple).toBe(false);
      expect(fileSelector.options.showPreview).toBe(true);
      expect(fileSelector.selectedFiles).toEqual([]);
    });

    test('应该能够选择文件', () => {
      fileSelector.selectFile('file1');
      
      expect(fileSelector.selectedFiles).toHaveLength(1);
      expect(fileSelector.selectedFiles[0].id).toBe('file1');
      expect(mockOnSelect).toHaveBeenCalled();
    });

    test('单选模式下应该只能选择一个文件', () => {
      fileSelector.selectFile('file1');
      fileSelector.selectFile('file2');
      
      expect(fileSelector.selectedFiles).toHaveLength(1);
      expect(fileSelector.selectedFiles[0].id).toBe('file2');
    });

    test('多选模式下应该能够选择多个文件', () => {
      fileSelector.options.multiple = true;
      
      fileSelector.selectFile('file1');
      fileSelector.selectFile('file2');
      
      expect(fileSelector.selectedFiles).toHaveLength(2);
    });

    test('应该能够取消选择', () => {
      fileSelector.options.multiple = true;
      
      fileSelector.selectFile('file1');
      fileSelector.selectFile('file1'); // 再次选择应该取消
      
      expect(fileSelector.selectedFiles).toHaveLength(0);
    });
  });

  describe('文件验证', () => {
    test('应该验证有效文件', () => {
      const validFile = { name: 'test.xlsx', size: 1024 };
      const result = fileSelector.validateFile(validFile);
      
      expect(result.valid).toBe(true);
    });

    test('应该拒绝无效文件类型', () => {
      const invalidFile = { name: 'test.txt', size: 1024 };
      const result = fileSelector.validateFile(invalidFile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不支持的文件类型');
    });

    test('应该拒绝过大文件', () => {
      const largeFile = { 
        name: 'test.xlsx', 
        size: 100 * 1024 * 1024 // 100MB
      };
      const result = fileSelector.validateFile(largeFile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('文件过大');
    });
  });

  describe('工具方法', () => {
    test('应该正确格式化文件大小', () => {
      expect(fileSelector.formatFileSize(0)).toBe('0 Bytes');
      expect(fileSelector.formatFileSize(1024)).toBe('1 KB');
      expect(fileSelector.formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    test('应该能够获取选中文件', () => {
      fileSelector.selectFile('file1');
      const selected = fileSelector.getSelectedFiles();
      
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('file1');
      // 应该返回副本
      expect(selected).not.toBe(fileSelector.selectedFiles);
    });

    test('应该能够清除选择', () => {
      fileSelector.selectFile('file1');
      fileSelector.clearSelection();
      
      expect(fileSelector.selectedFiles).toHaveLength(0);
    });
  });

  describe('回调函数', () => {
    test('选择文件应该触发回调', () => {
      fileSelector.selectFile('file1');
      
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'file1' })
      );
    });

    test('多选模式应该传递文件数组', () => {
      fileSelector.options.multiple = true;
      
      fileSelector.selectFile('file1');
      fileSelector.selectFile('file2');
      
      expect(mockOnSelect).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'file1' }),
          expect.objectContaining({ id: 'file2' })
        ])
      );
    });
  });

  describe('边界情况', () => {
    test('选择不存在的文件应该不产生错误', () => {
      fileSelector.selectFile('nonexistent');
      
      expect(fileSelector.selectedFiles).toHaveLength(0);
      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    test('应该处理空文件列表', () => {
      fileSelector.fileList = [];
      fileSelector.selectFile('file1');
      
      expect(fileSelector.selectedFiles).toHaveLength(0);
    });

    test('应该处理无效的文件对象', () => {
      const invalidFile = { name: null, size: 'invalid' };
      
      expect(() => {
        fileSelector.validateFile(invalidFile);
      }).not.toThrow();
    });
  });
});