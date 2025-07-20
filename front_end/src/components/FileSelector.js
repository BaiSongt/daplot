/**
 * 文件选择器组件
 * 提供文件列表显示、选择、操作等功能
 */
class FileSelector {
    constructor(options = {}) {
        this.options = {
            container: null,
            multiple: false,
            showActions: true,
            showUpload: true,
            showPreview: true,
            allowedTypes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            maxFileSize: 50 * 1024 * 1024, // 50MB
            onSelect: null,
            onDelete: null,
            onUpload: null,
            onRefresh: null,
            ...options
        };

        this.container = null;
        this.fileList = [];
        this.selectedFileId = null;
        this.isLoading = false;

        this.init();
    }

    // 初始化组件
    init() {
        if (typeof this.options.container === 'string') {
            this.container = document.getElementById(this.options.container);
        } else if (this.options.container instanceof HTMLElement) {
            this.container = this.options.container;
        }

        if (!this.container) {
            throw new Error('FileSelector: 容器元素未找到');
        }

        this.render();
        this.bindEvents();
        this.loadFileList();
    }

    // 渲染组件
    render() {
        this.container.innerHTML = `
            <div class="file-selector">
                <div class="file-selector-header">
                    <h3>📁 文件管理</h3>
                    <div class="file-selector-actions">
                        ${this.options.showUpload ? `
                            <input type="file" id="fileInput-${this.generateId()}" 
                                   accept="${this.options.allowedTypes.join(',')}" 
                                   style="display: none;" 
                                   ${this.options.multiple ? 'multiple' : ''}>
                            <button class="btn btn-primary btn-upload">
                                📁 上传文件
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-refresh">
                            🔄 刷新
                        </button>
                    </div>
                </div>
                
                <div class="file-selector-status" style="display: none;">
                    <div class="status-message"></div>
                </div>
                
                <div class="file-selector-content">
                    <div class="file-list">
                        <div class="file-list-loading" style="display: none;">
                            <div class="loading-spinner"></div>
                            <span>正在加载文件列表...</span>
                        </div>
                        <div class="file-list-empty" style="display: none;">
                            <div class="empty-icon">📄</div>
                            <p>暂无文件</p>
                            ${this.options.showUpload ? '<p>点击上传按钮添加文件</p>' : ''}
                        </div>
                        <div class="file-list-items"></div>
                    </div>
                </div>
                
                ${this.options.showPreview ? `
                    <div class="file-preview-container" style="display: none;">
                        <h4>文件预览</h4>
                        <div id="file-preview"></div>
                    </div>
                ` : ''}
            </div>
        `;

        this.addStyles();
    }

    // 添加样式
    addStyles() {
        if (document.getElementById('file-selector-styles')) return;

        const style = document.createElement('style');
        style.id = 'file-selector-styles';
        style.textContent = `
            .file-selector {
                background: white;
                border-radius: 8px;
                border: 1px solid #e9ecef;
                overflow: hidden;
            }
            
            .file-selector-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
            }
            
            .file-selector-header h3 {
                margin: 0;
                font-size: 14px;
                color: #495057;
            }
            
            .file-selector-actions {
                display: flex;
                gap: 8px;
            }
            
            .file-selector .btn {
                padding: 6px 12px;
                font-size: 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .file-selector .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .file-selector .btn-primary:hover {
                background: #0056b3;
            }
            
            .file-selector .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .file-selector .btn-secondary:hover {
                background: #545b62;
            }
            
            .file-selector .btn-danger {
                background: #dc3545;
                color: white;
            }
            
            .file-selector .btn-danger:hover {
                background: #c82333;
            }
            
            .file-selector-status {
                padding: 10px 15px;
                border-bottom: 1px solid #e9ecef;
            }
            
            .status-message {
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .status-message.success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .status-message.error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .status-message.info {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .file-selector-content {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .file-list-loading,
            .file-list-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                color: #6c757d;
                text-align: center;
            }
            
            .loading-spinner {
                width: 24px;
                height: 24px;
                border: 2px solid #e9ecef;
                border-top: 2px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .empty-icon {
                font-size: 48px;
                margin-bottom: 15px;
                opacity: 0.5;
            }
            
            .file-item {
                display: flex;
                align-items: center;
                padding: 12px 15px;
                border-bottom: 1px solid #f8f9fa;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .file-item:hover {
                background: #f8f9fa;
            }
            
            .file-item.selected {
                background: #e3f2fd;
                border-left: 3px solid #007bff;
            }
            
            .file-item:last-child {
                border-bottom: none;
            }
            
            .file-icon {
                font-size: 20px;
                margin-right: 12px;
                color: #007bff;
            }
            
            .file-info {
                flex: 1;
                min-width: 0;
            }
            
            .file-name {
                font-weight: 500;
                color: #333;
                margin-bottom: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 13px;
            }
            
            .file-meta {
                font-size: 11px;
                color: #6c757d;
                display: flex;
                gap: 10px;
            }
            
            .file-actions {
                display: flex;
                gap: 5px;
                opacity: 0;
                transition: opacity 0.2s;
            }
            
            .file-item:hover .file-actions {
                opacity: 1;
            }
            
            .file-actions .btn {
                padding: 4px 8px;
                font-size: 11px;
            }
            
            .file-preview-container {
                padding: 15px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
            }
            
            .file-preview-container h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #495057;
            }
            
            .preview-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }
            
            .preview-table th,
            .preview-table td {
                padding: 8px;
                text-align: left;
                border: 1px solid #dee2e6;
            }
            
            .preview-table th {
                background: #e9ecef;
                font-weight: 500;
            }
            
            .preview-info {
                margin-top: 10px;
                font-size: 11px;
                color: #6c757d;
            }
            
            .loading, .error {
                padding: 20px;
                text-align: center;
                color: #6c757d;
            }
            
            .error {
                color: #dc3545;
            }
        `;
        
        document.head.appendChild(style);
    }

    // 绑定事件
    bindEvents() {
        const uploadBtn = this.container.querySelector('.btn-upload');
        const refreshBtn = this.container.querySelector('.btn-refresh');
        const fileInput = this.container.querySelector('input[type="file"]');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refresh();
            });
        }

        // 拖拽上传
        if (this.options.showUpload) {
            this.container.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.container.classList.add('drag-over');
            });

            this.container.addEventListener('dragleave', (e) => {
                e.preventDefault();
                this.container.classList.remove('drag-over');
            });

            this.container.addEventListener('drop', (e) => {
                e.preventDefault();
                this.container.classList.remove('drag-over');
                this.handleFileUpload(e.dataTransfer.files);
            });
        }
    }

    // 生成唯一ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // 显示状态消息
    showStatus(message, type = 'info') {
        const statusContainer = this.container.querySelector('.file-selector-status');
        const statusMessage = this.container.querySelector('.status-message');

        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusContainer.style.display = 'block';

        // 3秒后自动隐藏
        setTimeout(() => {
            statusContainer.style.display = 'none';
        }, 3000);
    }

    // 设置加载状态
    setLoading(loading) {
        this.isLoading = loading;
        const loadingEl = this.container.querySelector('.file-list-loading');
        const itemsEl = this.container.querySelector('.file-list-items');
        const emptyEl = this.container.querySelector('.file-list-empty');

        if (loading) {
            loadingEl.style.display = 'flex';
            itemsEl.style.display = 'none';
            emptyEl.style.display = 'none';
        } else {
            loadingEl.style.display = 'none';
            if (this.fileList.length === 0) {
                emptyEl.style.display = 'flex';
                itemsEl.style.display = 'none';
            } else {
                emptyEl.style.display = 'none';
                itemsEl.style.display = 'block';
            }
        }
    }

    // 加载文件列表
    async loadFileList() {
        this.setLoading(true);

        try {
            // Try to get file list from dataManager, fallback to mock data for testing
            let fileList;
            if (window.dataManager && typeof window.dataManager.getFileList === 'function') {
                fileList = await window.dataManager.getFileList();
            } else {
                // Mock data for testing
                await new Promise(resolve => setTimeout(resolve, 500));
                fileList = [
                    {
                        file_id: 'file1',
                        filename: 'sales_data.xlsx',
                        rows: 1000,
                        columns: 5
                    },
                    {
                        file_id: 'file2',
                        filename: 'customer_info.csv',
                        rows: 500,
                        columns: 8
                    },
                    {
                        file_id: 'file3',
                        filename: 'product_catalog.xlsx',
                        rows: 2000,
                        columns: 12
                    }
                ];
            }
            
            this.fileList = fileList;
            this.renderFileList();
        } catch (error) {
            console.error('加载文件列表失败:', error);
            this.showStatus('加载文件列表失败: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // 渲染文件列表
    renderFileList() {
        const itemsContainer = this.container.querySelector('.file-list-items');
        
        if (this.fileList.length === 0) {
            itemsContainer.innerHTML = '';
            return;
        }

        itemsContainer.innerHTML = this.fileList.map(file => `
            <div class="file-item ${file.file_id === this.selectedFileId ? 'selected' : ''}" 
                 data-file-id="${file.file_id}">
                <div class="file-icon">📊</div>
                <div class="file-info">
                    <div class="file-name" title="${file.filename}">${file.filename}</div>
                    <div class="file-meta">
                        <span>${file.rows || 0} 行</span>
                        <span>${file.columns || 0} 列</span>
                        ${file.sheet_name ? `<span>${file.sheet_name}</span>` : ''}
                    </div>
                </div>
                ${this.options.showActions ? `
                    <div class="file-actions">
                        ${this.options.showPreview ? `
                            <button class="btn btn-secondary preview-btn" data-file-id="${file.file_id}">
                                👁️
                            </button>
                        ` : ''}
                        <button class="btn btn-danger btn-delete" data-file-id="${file.file_id}">
                            🗑️
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');

        // 绑定文件项事件
        this.bindFileItemEvents();
    }

    // 绑定文件项事件
    bindFileItemEvents() {
        const fileItems = this.container.querySelectorAll('.file-item');
        const deleteButtons = this.container.querySelectorAll('.btn-delete');
        const previewButtons = this.container.querySelectorAll('.preview-btn');

        fileItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.file-actions')) return;
                
                const fileId = item.dataset.fileId;
                this.selectFile(fileId);
            });
        });

        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.fileId;
                this.deleteFile(fileId);
            });
        });

        previewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.fileId;
                this.previewFile(fileId);
            });
        });
    }

    // 选择文件
    selectFile(fileId) {
        const previousSelected = this.container.querySelector('.file-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        const selectedItem = this.container.querySelector(`[data-file-id="${fileId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        this.selectedFileId = fileId;

        // 触发选择事件
        if (this.options.onSelect) {
            const file = this.fileList.find(f => f.file_id === fileId);
            this.options.onSelect(file, fileId);
        }

        // 发送事件
        window.eventBus?.emit('file.selected', { fileId, file: this.fileList.find(f => f.file_id === fileId) });
    }

    // 预览文件
    async previewFile(fileId) {
        if (!this.options.showPreview) return;
        
        const file = this.fileList.find(f => f.file_id === fileId);
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
                    <p>显示前3行数据，共 ${file.rows || 0} 行 × ${file.columns || 0} 列</p>
                </div>
            `;
        } catch (error) {
            previewContent.innerHTML = `<div class="error">预览失败: ${error.message}</div>`;
        }
    }

    // 删除文件
    async deleteFile(fileId) {
        if (!confirm('确定要删除这个文件吗？')) {
            return;
        }

        try {
            // 调用删除API
            await window.apiClient.delete(`/api/file/${fileId}`);
            
            // 从列表中移除
            this.fileList = this.fileList.filter(f => f.file_id !== fileId);
            
            // 如果删除的是当前选中的文件，清除选择
            if (this.selectedFileId === fileId) {
                this.selectedFileId = null;
            }
            
            // 重新渲染
            this.renderFileList();
            this.showStatus('文件删除成功', 'success');

            // 触发删除事件
            if (this.options.onDelete) {
                this.options.onDelete(fileId);
            }

            // 发送事件
            window.eventBus?.emit('file.deleted', { fileId });

        } catch (error) {
            console.error('删除文件失败:', error);
            this.showStatus('删除文件失败: ' + error.message, 'error');
        }
    }

    // 处理文件上传
    async handleFileUpload(files) {
        console.log('🔄 开始处理文件上传:', files);
        
        if (!files || files.length === 0) {
            console.warn('⚠️ 没有选择文件');
            return;
        }

        const file = files[0]; // 目前只支持单文件上传
        console.log('📁 选择的文件:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });

        // 验证文件类型
        if (!this.options.allowedTypes.includes(file.type)) {
            console.error('❌ 不支持的文件类型:', file.type, '允许的类型:', this.options.allowedTypes);
            this.showStatus('不支持的文件类型', 'error');
            return;
        }

        // 验证文件大小
        if (file.size > this.options.maxFileSize) {
            console.error('❌ 文件大小超过限制:', file.size, '最大允许:', this.options.maxFileSize);
            this.showStatus('文件大小超过限制', 'error');
            return;
        }

        try {
            this.showStatus('正在上传文件...', 'info');
            console.log('🚀 开始上传文件到API...');

            // 检查apiClient是否存在
            if (!window.apiClient) {
                throw new Error('ApiClient未初始化');
            }

            console.log('🌐 ApiClient baseURL:', window.apiClient.baseURL);

            // 调用上传API
            const response = await window.apiClient.upload('/api/upload', file);
            console.log('✅ 文件上传响应:', response);
            
            // 处理上传结果
            if (response.data.multiple_sheets) {
                // 多个工作表
                this.fileList.push(...response.data.files);
            } else {
                // 单个工作表
                this.fileList.push(response.data);
            }

            this.renderFileList();
            this.showStatus('文件上传成功', 'success');

            // 触发上传事件
            if (this.options.onUpload) {
                this.options.onUpload(response.data);
            }

            // 发送事件
            window.eventBus?.emit('file.uploaded', response.data);

        } catch (error) {
            console.error('文件上传失败:', error);
            this.showStatus('文件上传失败: ' + error.message, 'error');
        }
    }

    // 刷新文件列表
    async refresh() {
        await this.loadFileList();
        
        if (this.options.onRefresh) {
            this.options.onRefresh();
        }

        // 发送事件
        window.eventBus?.emit('file.refreshed');
    }

    // 获取选中的文件
    getSelectedFile() {
        return this.fileList.find(f => f.file_id === this.selectedFileId);
    }

    // 获取选中的文件ID
    getSelectedFileId() {
        return this.selectedFileId;
    }

    // 获取所有文件
    getAllFiles() {
        return [...this.fileList];
    }

    // 设置选中的文件
    setSelectedFile(fileId) {
        this.selectFile(fileId);
    }

    // 销毁组件
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// 导出组件
window.FileSelector = FileSelector;