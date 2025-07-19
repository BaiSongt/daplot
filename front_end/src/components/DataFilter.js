/**
 * 数据筛选器组件
 * 提供动态筛选条件、多条件组合、实时预览等功能
 */
class DataFilter {
    constructor(options = {}) {
        this.options = {
            container: null,
            fileId: null,
            columns: [],
            filters: {},
            maxFilters: 10,
            showPreview: true,
            showClear: true,
            onChange: null,
            onApply: null,
            onClear: null,
            ...options
        };

        this.container = null;
        this.filters = { ...this.options.filters };
        this.availableColumns = [...this.options.columns];
        this.uniqueValues = new Map();
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
            throw new Error('DataFilter: 容器元素未找到');
        }

        this.render();
        this.bindEvents();
        
        if (this.options.fileId) {
            this.loadColumns();
        }
    }

    // 渲染组件
    render() {
        this.container.innerHTML = `
            <div class="data-filter">
                <div class="data-filter-header">
                    <h4>🎯 数据筛选</h4>
                    <div class="data-filter-actions">
                        ${this.options.showClear ? `
                            <button class="btn btn-sm btn-clear">清除全部</button>
                        ` : ''}
                        <button class="btn btn-sm btn-add">+ 添加筛选</button>
                    </div>
                </div>
                
                <div class="data-filter-content">
                    <div class="filter-list" id="filter-list">
                        <!-- 筛选条件列表 -->
                    </div>
                    
                    <div class="filter-empty" style="display: none;">
                        <div class="empty-icon">🔍</div>
                        <p>暂无筛选条件</p>
                        <p>点击"添加筛选"按钮开始筛选数据</p>
                    </div>
                </div>
                
                ${this.options.showPreview ? `
                    <div class="data-filter-preview">
                        <div class="preview-header">
                            <span>筛选预览</span>
                            <span class="preview-count" id="preview-count">-</span>
                        </div>
                        <div class="preview-content" id="preview-content">
                            <div class="preview-loading" style="display: none;">
                                <div class="loading-spinner"></div>
                                <span>正在计算...</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        this.addStyles();
        this.renderFilters();
    }

    // 添加样式
    addStyles() {
        if (document.getElementById('data-filter-styles')) return;

        const style = document.createElement('style');
        style.id = 'data-filter-styles';
        style.textContent = `
            .data-filter {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .data-filter-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
            }
            
            .data-filter-header h4 {
                margin: 0;
                font-size: 14px;
                color: #495057;
            }
            
            .data-filter-actions {
                display: flex;
                gap: 8px;
            }
            
            .data-filter .btn {
                padding: 6px 12px;
                font-size: 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .data-filter .btn-sm {
                padding: 4px 8px;
                font-size: 11px;
            }
            
            .data-filter .btn-add {
                background: #28a745;
                color: white;
            }
            
            .data-filter .btn-add:hover {
                background: #218838;
            }
            
            .data-filter .btn-clear {
                background: #6c757d;
                color: white;
            }
            
            .data-filter .btn-clear:hover {
                background: #545b62;
            }
            
            .data-filter .btn-remove {
                background: #dc3545;
                color: white;
            }
            
            .data-filter .btn-remove:hover {
                background: #c82333;
            }
            
            .data-filter-content {
                padding: 15px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .filter-empty {
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
            }
            
            .empty-icon {
                font-size: 48px;
                margin-bottom: 15px;
                opacity: 0.5;
            }
            
            .filter-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                margin-bottom: 10px;
            }
            
            .filter-item:last-child {
                margin-bottom: 0;
            }
            
            .filter-column {
                min-width: 120px;
            }
            
            .filter-operator {
                min-width: 80px;
            }
            
            .filter-values {
                flex: 1;
                min-width: 150px;
            }
            
            .filter-item select,
            .filter-item input {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .filter-item select:focus,
            .filter-item input:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            
            .filter-values-multi {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                min-height: 32px;
                padding: 4px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                background: white;
                cursor: text;
            }
            
            .filter-values-multi:focus-within {
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            
            .value-tag {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 6px;
                background: #007bff;
                color: white;
                border-radius: 3px;
                font-size: 11px;
            }
            
            .value-tag-remove {
                cursor: pointer;
                font-weight: bold;
            }
            
            .value-tag-remove:hover {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
            }
            
            .values-dropdown {
                position: relative;
            }
            
            .values-dropdown-list {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #ced4da;
                border-top: none;
                border-radius: 0 0 4px 4px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
            }
            
            .values-dropdown-item {
                padding: 8px 12px;
                cursor: pointer;
                font-size: 12px;
                border-bottom: 1px solid #f8f9fa;
            }
            
            .values-dropdown-item:hover {
                background: #f8f9fa;
            }
            
            .values-dropdown-item:last-child {
                border-bottom: none;
            }
            
            .data-filter-preview {
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
            }
            
            .preview-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                font-size: 12px;
                font-weight: 500;
                color: #495057;
            }
            
            .preview-count {
                color: #007bff;
                font-weight: 600;
            }
            
            .preview-content {
                padding: 0 15px 15px;
                font-size: 11px;
                color: #6c757d;
            }
            
            .preview-loading {
                display: flex;
                align-items: center;
                gap: 8px;
                justify-content: center;
                padding: 10px;
            }
            
            .loading-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #e9ecef;
                border-top: 2px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
    }

    // 绑定事件
    bindEvents() {
        const addBtn = this.container.querySelector('.btn-add');
        const clearBtn = this.container.querySelector('.btn-clear');

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addFilter();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    // 加载列信息
    async loadColumns() {
        if (!this.options.fileId || !window.dataManager) {
            return;
        }

        try {
            const fileData = await window.dataManager.getFileData(this.options.fileId);
            if (fileData && fileData.headers) {
                this.availableColumns = fileData.headers;
                this.renderFilters();
            }
        } catch (error) {
            console.error('加载列信息失败:', error);
        }
    }

    // 渲染筛选条件
    renderFilters() {
        const filterList = this.container.querySelector('#filter-list');
        const filterEmpty = this.container.querySelector('.filter-empty');

        if (!filterList) return;

        const filterEntries = Object.entries(this.filters);

        if (filterEntries.length === 0) {
            filterList.innerHTML = '';
            if (filterEmpty) filterEmpty.style.display = 'block';
            return;
        }

        if (filterEmpty) filterEmpty.style.display = 'none';

        filterList.innerHTML = filterEntries.map(([column, values], index) => `
            <div class="filter-item" data-column="${column}">
                <div class="filter-column">
                    <select class="filter-column-select">
                        <option value="">选择列</option>
                        ${this.availableColumns.map(col => `
                            <option value="${col}" ${col === column ? 'selected' : ''}>${col}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="filter-operator">
                    <select class="filter-operator-select">
                        <option value="in">包含</option>
                        <option value="not_in">不包含</option>
                    </select>
                </div>
                <div class="filter-values">
                    <div class="filter-values-multi" data-column="${column}">
                        ${Array.isArray(values) ? values.map(value => `
                            <span class="value-tag">
                                ${value}
                                <span class="value-tag-remove" data-value="${value}">×</span>
                            </span>
                        `).join('') : ''}
                        <input type="text" placeholder="输入值或点击选择..." class="value-input" style="border: none; outline: none; flex: 1; min-width: 100px;">
                    </div>
                    <div class="values-dropdown">
                        <div class="values-dropdown-list"></div>
                    </div>
                </div>
                <div class="filter-actions">
                    <button class="btn btn-sm btn-remove" data-column="${column}">×</button>
                </div>
            </div>
        `).join('');

        this.bindFilterEvents();
        this.updatePreview();
    }

    // 绑定筛选条件事件
    bindFilterEvents() {
        const filterList = this.container.querySelector('#filter-list');

        // 列选择变化
        filterList.addEventListener('change', (e) => {
            if (e.target.classList.contains('filter-column-select')) {
                const filterItem = e.target.closest('.filter-item');
                const oldColumn = filterItem.dataset.column;
                const newColumn = e.target.value;

                if (newColumn && newColumn !== oldColumn) {
                    // 更新筛选条件
                    if (oldColumn && this.filters[oldColumn]) {
                        delete this.filters[oldColumn];
                    }
                    if (newColumn) {
                        this.filters[newColumn] = [];
                        filterItem.dataset.column = newColumn;
                    }
                    this.renderFilters();
                }
            }
        });

        // 删除筛选条件
        filterList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove')) {
                const column = e.target.dataset.column;
                this.removeFilter(column);
            }

            if (e.target.classList.contains('value-tag-remove')) {
                const value = e.target.dataset.value;
                const filterItem = e.target.closest('.filter-item');
                const column = filterItem.dataset.column;
                this.removeFilterValue(column, value);
            }
        });

        // 值输入
        filterList.addEventListener('input', (e) => {
            if (e.target.classList.contains('value-input')) {
                const filterItem = e.target.closest('.filter-item');
                const column = filterItem.dataset.column;
                this.handleValueInput(e.target, column);
            }
        });

        // 值输入键盘事件
        filterList.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('value-input')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const filterItem = e.target.closest('.filter-item');
                    const column = filterItem.dataset.column;
                    const value = e.target.value.trim();
                    if (value) {
                        this.addFilterValue(column, value);
                        e.target.value = '';
                    }
                }
            }
        });

        // 点击值下拉选项
        filterList.addEventListener('click', (e) => {
            if (e.target.classList.contains('values-dropdown-item')) {
                const value = e.target.textContent;
                const dropdown = e.target.closest('.values-dropdown');
                const filterItem = dropdown.closest('.filter-item');
                const column = filterItem.dataset.column;
                
                this.addFilterValue(column, value);
                this.hideValueDropdown(dropdown);
            }
        });
    }

    // 处理值输入
    async handleValueInput(input, column) {
        const value = input.value.trim();
        
        if (value.length >= 1) {
            await this.showValueSuggestions(input, column, value);
        } else {
            this.hideValueDropdown(input.closest('.filter-values').querySelector('.values-dropdown'));
        }
    }

    // 显示值建议
    async showValueSuggestions(input, column, searchValue) {
        if (!this.options.fileId || !window.dataManager) {
            return;
        }

        try {
            // 获取列的唯一值
            let uniqueValues = this.uniqueValues.get(column);
            if (!uniqueValues) {
                uniqueValues = await window.dataManager.getUniqueValues(this.options.fileId, column);
                this.uniqueValues.set(column, uniqueValues);
            }

            // 过滤建议值
            const suggestions = uniqueValues
                .filter(value => 
                    value.toString().toLowerCase().includes(searchValue.toLowerCase())
                )
                .slice(0, 10);

            // 显示下拉列表
            const dropdown = input.closest('.filter-values').querySelector('.values-dropdown');
            const dropdownList = dropdown.querySelector('.values-dropdown-list');

            if (suggestions.length > 0) {
                dropdownList.innerHTML = suggestions.map(value => `
                    <div class="values-dropdown-item">${value}</div>
                `).join('');
                dropdownList.style.display = 'block';
            } else {
                this.hideValueDropdown(dropdown);
            }

        } catch (error) {
            console.error('获取值建议失败:', error);
        }
    }

    // 隐藏值下拉列表
    hideValueDropdown(dropdown) {
        const dropdownList = dropdown.querySelector('.values-dropdown-list');
        dropdownList.style.display = 'none';
    }

    // 添加筛选条件
    addFilter(column = '', values = []) {
        if (Object.keys(this.filters).length >= this.options.maxFilters) {
            alert(`最多只能添加 ${this.options.maxFilters} 个筛选条件`);
            return;
        }

        if (!column) {
            // 找到第一个未使用的列
            column = this.availableColumns.find(col => !this.filters[col]);
            if (!column) {
                alert('没有可用的列进行筛选');
                return;
            }
        }

        this.filters[column] = Array.isArray(values) ? values : [];
        this.renderFilters();
        this.triggerChange();
    }

    // 删除筛选条件
    removeFilter(column) {
        if (this.filters[column]) {
            delete this.filters[column];
            this.renderFilters();
            this.triggerChange();
        }
    }

    // 添加筛选值
    addFilterValue(column, value) {
        if (!this.filters[column]) {
            this.filters[column] = [];
        }

        if (!this.filters[column].includes(value)) {
            this.filters[column].push(value);
            this.renderFilters();
            this.triggerChange();
        }
    }

    // 删除筛选值
    removeFilterValue(column, value) {
        if (this.filters[column]) {
            this.filters[column] = this.filters[column].filter(v => v !== value);
            this.renderFilters();
            this.triggerChange();
        }
    }

    // 清除所有筛选条件
    clearAllFilters() {
        this.filters = {};
        this.renderFilters();
        this.triggerChange();
        
        if (this.options.onClear) {
            this.options.onClear();
        }
    }

    // 更新预览
    async updatePreview() {
        if (!this.options.showPreview || !this.options.fileId || !window.dataManager) {
            return;
        }

        const previewCount = this.container.querySelector('#preview-count');
        const previewContent = this.container.querySelector('#preview-content');
        const previewLoading = this.container.querySelector('.preview-loading');

        if (!previewCount || !previewContent) return;

        try {
            previewLoading.style.display = 'flex';
            
            const filteredData = await window.dataManager.getFilteredData(this.options.fileId, this.filters);
            const count = filteredData.length;

            previewCount.textContent = `${count} 行`;
            previewContent.innerHTML = count > 0 
                ? `筛选后将显示 ${count} 行数据`
                : '没有数据符合筛选条件';

        } catch (error) {
            console.error('更新预览失败:', error);
            previewContent.innerHTML = '预览更新失败';
        } finally {
            previewLoading.style.display = 'none';
        }
    }

    // 触发变化事件
    triggerChange() {
        if (this.options.onChange) {
            this.options.onChange(this.filters);
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('dataFilter.changed', {
                filters: this.filters,
                fileId: this.options.fileId
            });
        }

        // 延迟更新预览，避免频繁请求
        clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => {
            this.updatePreview();
        }, 500);
    }

    // 设置文件ID
    setFileId(fileId) {
        this.options.fileId = fileId;
        this.uniqueValues.clear();
        this.loadColumns();
    }

    // 设置筛选条件
    setFilters(filters) {
        this.filters = { ...filters };
        this.renderFilters();
    }

    // 获取筛选条件
    getFilters() {
        return { ...this.filters };
    }

    // 获取有效的筛选条件（排除空值）
    getValidFilters() {
        const validFilters = {};
        
        Object.entries(this.filters).forEach(([column, values]) => {
            if (Array.isArray(values) && values.length > 0) {
                validFilters[column] = values;
            }
        });

        return validFilters;
    }

    // 检查是否有筛选条件
    hasFilters() {
        return Object.keys(this.getValidFilters()).length > 0;
    }

    // 销毁组件
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
        }
    }
}

// 导出组件
window.DataFilter = DataFilter;