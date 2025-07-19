/**
 * 图表配置组件
 * 提供图表样式的可视化配置界面，支持实时预览和配置管理
 */
class ChartConfig {
    constructor(options = {}) {
        this.options = {
            container: null,
            chartType: 'scatter',
            config: {},
            showPreview: true,
            showPresets: true,
            onChange: null,
            onApply: null,
            onReset: null,
            ...options
        };

        this.container = null;
        this.config = {
            title: '',
            xAxis: '',
            yAxis: '',
            chartType: 'scatter',
            colors: window.CHART?.COLORS?.DEFAULT || ['#1f77b4', '#ff7f0e', '#2ca02c'],
            markers: 'circle',
            lineWidth: 2,
            markerSize: 6,
            showLegend: true,
            legendPosition: 'outside-right',
            gridLines: true,
            animations: true,
            style: {},
            ...this.options.config
        };

        this.presets = new Map();
        this.isPreviewMode = false;

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
            throw new Error('ChartConfig: 容器元素未找到');
        }

        this.initPresets();
        this.render();
        this.bindEvents();
    }

    // 初始化预设配置
    initPresets() {
        this.presets.set('default', {
            name: '默认样式',
            config: {
                colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
                markers: 'circle',
                lineWidth: 2,
                markerSize: 6,
                showLegend: true,
                legendPosition: 'outside-right',
                gridLines: true,
                animations: true
            }
        });

        this.presets.set('minimal', {
            name: '简洁风格',
            config: {
                colors: ['#3366CC', '#DC3912', '#FF9900', '#109618'],
                markers: 'circle',
                lineWidth: 1,
                markerSize: 4,
                showLegend: false,
                gridLines: false,
                animations: false
            }
        });

        this.presets.set('colorful', {
            name: '彩色主题',
            config: {
                colors: ['#ff6b6b', '#ffa726', '#ffcc02', '#66bb6a', '#42a5f5'],
                markers: 'square',
                lineWidth: 3,
                markerSize: 8,
                showLegend: true,
                legendPosition: 'top',
                gridLines: true,
                animations: true
            }
        });

        this.presets.set('professional', {
            name: '专业风格',
            config: {
                colors: ['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', '#bdc3c7'],
                markers: 'diamond',
                lineWidth: 2,
                markerSize: 5,
                showLegend: true,
                legendPosition: 'inside-topright',
                gridLines: true,
                animations: false
            }
        });
    }

    // 渲染组件
    render() {
        this.container.innerHTML = `
            <div class="chart-config">
                <div class="chart-config-header">
                    <h4>📊 图表配置</h4>
                    <div class="chart-config-actions">
                        ${this.options.showPresets ? `
                            <button class="btn btn-sm btn-preset">预设</button>
                        ` : ''}
                        <button class="btn btn-sm btn-reset">重置</button>
                        <button class="btn btn-sm btn-apply">应用</button>
                    </div>
                </div>
                
                <div class="chart-config-content">
                    <div class="config-tabs">
                        <button class="tab-btn active" data-tab="basic">基础设置</button>
                        <button class="tab-btn" data-tab="style">样式设置</button>
                        <button class="tab-btn" data-tab="advanced">高级设置</button>
                    </div>
                    
                    <div class="config-panels">
                        <!-- 基础设置面板 -->
                        <div class="config-panel active" data-panel="basic">
                            <div class="config-group">
                                <label>图表标题</label>
                                <input type="text" class="form-control" id="chart-title" 
                                       value="${this.config.title}" placeholder="输入图表标题">
                            </div>
                            
                            <div class="config-group">
                                <label>图表类型</label>
                                <select class="form-control" id="chart-type">
                                    ${this.renderChartTypeOptions()}
                                </select>
                            </div>
                            
                            <div class="config-row">
                                <div class="config-group">
                                    <label>X轴标题</label>
                                    <input type="text" class="form-control" id="x-axis-title" 
                                           value="${this.config.xAxis}" placeholder="X轴标题">
                                </div>
                                <div class="config-group">
                                    <label>Y轴标题</label>
                                    <input type="text" class="form-control" id="y-axis-title" 
                                           value="${this.config.yAxis}" placeholder="Y轴标题">
                                </div>
                            </div>
                        </div>
                        
                        <!-- 样式设置面板 -->
                        <div class="config-panel" data-panel="style">
                            <div class="config-group">
                                <label>颜色方案</label>
                                <div class="color-scheme-selector">
                                    ${this.renderColorSchemes()}
                                </div>
                            </div>
                            
                            <div class="config-group">
                                <label>标记样式</label>
                                <select class="form-control" id="marker-style">
                                    ${this.renderMarkerOptions()}
                                </select>
                            </div>
                            
                            <div class="config-row">
                                <div class="config-group">
                                    <label>线条宽度</label>
                                    <input type="range" class="form-range" id="line-width" 
                                           min="1" max="10" value="${this.config.lineWidth}">
                                    <span class="range-value">${this.config.lineWidth}px</span>
                                </div>
                                <div class="config-group">
                                    <label>标记大小</label>
                                    <input type="range" class="form-range" id="marker-size" 
                                           min="2" max="20" value="${this.config.markerSize}">
                                    <span class="range-value">${this.config.markerSize}px</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 高级设置面板 -->
                        <div class="config-panel" data-panel="advanced">
                            <div class="config-group">
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="show-legend" 
                                               ${this.config.showLegend ? 'checked' : ''}>
                                        显示图例
                                    </label>
                                </div>
                            </div>
                            
                            <div class="config-group" id="legend-position-group" 
                                 style="${this.config.showLegend ? '' : 'display: none;'}">
                                <label>图例位置</label>
                                <select class="form-control" id="legend-position">
                                    ${this.renderLegendPositionOptions()}
                                </select>
                            </div>
                            
                            <div class="config-group">
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="show-grid" 
                                               ${this.config.gridLines ? 'checked' : ''}>
                                        显示网格线
                                    </label>
                                </div>
                            </div>
                            
                            <div class="config-group">
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="enable-animations" 
                                               ${this.config.animations ? 'checked' : ''}>
                                        启用动画效果
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${this.options.showPreview ? `
                    <div class="chart-config-preview">
                        <div class="preview-header">
                            <span>实时预览</span>
                            <button class="btn btn-sm btn-toggle-preview">
                                ${this.isPreviewMode ? '关闭预览' : '开启预览'}
                            </button>
                        </div>
                        <div class="preview-content" id="chart-preview" 
                             style="${this.isPreviewMode ? '' : 'display: none;'}">
                            <div class="preview-placeholder">
                                <div class="placeholder-icon">📊</div>
                                <p>点击"开启预览"查看图表效果</p>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- 预设选择模态框 -->
                <div class="preset-modal" id="preset-modal" style="display: none;">
                    <div class="preset-modal-content">
                        <div class="preset-modal-header">
                            <h5>选择预设配置</h5>
                            <button class="btn-close" id="close-preset-modal">×</button>
                        </div>
                        <div class="preset-modal-body">
                            ${this.renderPresetOptions()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
    }

    // 渲染图表类型选项
    renderChartTypeOptions() {
        const chartTypes = window.CHART?.TYPES || {
            SCATTER: 'scatter',
            LINE: 'line',
            BAR: 'bar',
            HISTOGRAM: 'histogram',
            BOX: 'box',
            HEATMAP: 'heatmap',
            PIE: 'pie',
            AREA: 'area'
        };

        const typeNames = {
            scatter: '散点图',
            line: '折线图',
            bar: '柱状图',
            histogram: '直方图',
            box: '箱线图',
            heatmap: '热力图',
            pie: '饼图',
            area: '面积图'
        };

        return Object.entries(chartTypes).map(([key, value]) => `
            <option value="${value}" ${value === this.config.chartType ? 'selected' : ''}>
                ${typeNames[value] || value}
            </option>
        `).join('');
    }

    // 渲染颜色方案
    renderColorSchemes() {
        const colorSchemes = window.CHART?.COLORS || {
            DEFAULT: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
            WARM: ['#ff6b6b', '#ffa726', '#ffcc02', '#ff8a65', '#f06292'],
            COOL: ['#42a5f5', '#26c6da', '#66bb6a', '#5c6bc0', '#ab47bc'],
            PASTEL: ['#ffcdd2', '#f8bbd9', '#e1bee7', '#d1c4e9', '#c5cae9'],
            BRIGHT: ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5']
        };

        const schemeNames = {
            DEFAULT: '默认配色',
            WARM: '暖色调',
            COOL: '冷色调',
            PASTEL: '柔和色',
            BRIGHT: '鲜艳色'
        };

        return Object.entries(colorSchemes).map(([key, colors]) => `
            <div class="color-scheme-item" data-scheme="${key}">
                <div class="color-preview">
                    ${colors.slice(0, 5).map(color => `
                        <div class="color-dot" style="background-color: ${color}"></div>
                    `).join('')}
                </div>
                <span class="scheme-name">${schemeNames[key] || key}</span>
            </div>
        `).join('');
    }

    // 渲染标记选项
    renderMarkerOptions() {
        const markers = window.CHART?.MARKERS || {
            CIRCLE: 'circle',
            SQUARE: 'square',
            DIAMOND: 'diamond',
            TRIANGLE_UP: 'triangle-up',
            TRIANGLE_DOWN: 'triangle-down',
            CROSS: 'cross',
            X: 'x'
        };

        const markerNames = {
            circle: '圆形',
            square: '方形',
            diamond: '菱形',
            'triangle-up': '上三角',
            'triangle-down': '下三角',
            cross: '十字',
            x: 'X形'
        };

        return Object.entries(markers).map(([key, value]) => `
            <option value="${value}" ${value === this.config.markers ? 'selected' : ''}>
                ${markerNames[value] || value}
            </option>
        `).join('');
    }

    // 渲染图例位置选项
    renderLegendPositionOptions() {
        const positions = window.CHART?.LEGEND_POSITIONS || {
            OUTSIDE_RIGHT: 'outside-right',
            INSIDE_TOPRIGHT: 'inside-topright',
            INSIDE_TOPLEFT: 'inside-topleft',
            INSIDE_BOTTOMRIGHT: 'inside-bottomright',
            INSIDE_BOTTOMLEFT: 'inside-bottomleft',
            TOP: 'top',
            BOTTOM: 'bottom'
        };

        const positionNames = {
            'outside-right': '右侧外部',
            'inside-topright': '右上角内部',
            'inside-topleft': '左上角内部',
            'inside-bottomright': '右下角内部',
            'inside-bottomleft': '左下角内部',
            'top': '顶部',
            'bottom': '底部'
        };

        return Object.entries(positions).map(([key, value]) => `
            <option value="${value}" ${value === this.config.legendPosition ? 'selected' : ''}>
                ${positionNames[value] || value}
            </option>
        `).join('');
    }

    // 渲染预设选项
    renderPresetOptions() {
        return Array.from(this.presets.entries()).map(([key, preset]) => `
            <div class="preset-item" data-preset="${key}">
                <div class="preset-preview">
                    <div class="preset-colors">
                        ${preset.config.colors.slice(0, 4).map(color => `
                            <div class="preset-color" style="background-color: ${color}"></div>
                        `).join('')}
                    </div>
                </div>
                <div class="preset-info">
                    <h6>${preset.name}</h6>
                    <p>标记: ${preset.config.markers} | 线宽: ${preset.config.lineWidth}px</p>
                </div>
            </div>
        `).join('');
    }

    // 添加样式
    addStyles() {
        if (document.getElementById('chart-config-styles')) return;

        const style = document.createElement('style');
        style.id = 'chart-config-styles';
        style.textContent = `
            .chart-config {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                overflow: hidden;
                font-family: 'Segoe UI', sans-serif;
            }
            
            .chart-config-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
            }
            
            .chart-config-header h4 {
                margin: 0;
                font-size: 14px;
                color: #495057;
            }
            
            .chart-config-actions {
                display: flex;
                gap: 8px;
            }
            
            .chart-config .btn {
                padding: 6px 12px;
                font-size: 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .chart-config .btn-sm {
                padding: 4px 8px;
                font-size: 11px;
            }
            
            .chart-config .btn-preset {
                background: #17a2b8;
                color: white;
            }
            
            .chart-config .btn-preset:hover {
                background: #138496;
            }
            
            .chart-config .btn-reset {
                background: #6c757d;
                color: white;
            }
            
            .chart-config .btn-reset:hover {
                background: #545b62;
            }
            
            .chart-config .btn-apply {
                background: #28a745;
                color: white;
            }
            
            .chart-config .btn-apply:hover {
                background: #218838;
            }
            
            .chart-config-content {
                padding: 15px;
            }
            
            .config-tabs {
                display: flex;
                border-bottom: 1px solid #e9ecef;
                margin-bottom: 15px;
            }
            
            .tab-btn {
                padding: 8px 16px;
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                cursor: pointer;
                font-size: 12px;
                color: #6c757d;
                transition: all 0.2s;
            }
            
            .tab-btn.active {
                color: #007bff;
                border-bottom-color: #007bff;
            }
            
            .tab-btn:hover {
                color: #007bff;
            }
            
            .config-panels {
                min-height: 300px;
            }
            
            .config-panel {
                display: none;
            }
            
            .config-panel.active {
                display: block;
            }
            
            .config-group {
                margin-bottom: 15px;
            }
            
            .config-row {
                display: flex;
                gap: 15px;
            }
            
            .config-row .config-group {
                flex: 1;
            }
            
            .config-group label {
                display: block;
                margin-bottom: 5px;
                font-size: 12px;
                font-weight: 500;
                color: #495057;
            }
            
            .form-control {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                transition: border-color 0.2s;
            }
            
            .form-control:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            
            .form-range {
                width: 100%;
                margin: 5px 0;
            }
            
            .range-value {
                font-size: 11px;
                color: #6c757d;
                margin-left: 8px;
            }
            
            .checkbox-group {
                display: flex;
                align-items: center;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                cursor: pointer;
                font-size: 12px;
                margin: 0;
            }
            
            .checkbox-label input[type="checkbox"] {
                margin-right: 8px;
            }
            
            .color-scheme-selector {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .color-scheme-item {
                display: flex;
                align-items: center;
                padding: 8px;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .color-scheme-item:hover {
                border-color: #007bff;
                background: #f8f9fa;
            }
            
            .color-scheme-item.selected {
                border-color: #007bff;
                background: #e3f2fd;
            }
            
            .color-preview {
                display: flex;
                gap: 2px;
                margin-right: 10px;
            }
            
            .color-dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 1px solid #fff;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
            }
            
            .scheme-name {
                font-size: 12px;
                color: #495057;
            }
            
            .chart-config-preview {
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
            
            .btn-toggle-preview {
                background: #007bff;
                color: white;
            }
            
            .btn-toggle-preview:hover {
                background: #0056b3;
            }
            
            .preview-content {
                padding: 15px;
                min-height: 200px;
                background: white;
                margin: 0 15px 15px;
                border-radius: 4px;
                border: 1px solid #e9ecef;
            }
            
            .preview-placeholder {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 170px;
                color: #6c757d;
                text-align: center;
            }
            
            .placeholder-icon {
                font-size: 48px;
                margin-bottom: 10px;
                opacity: 0.5;
            }
            
            .preset-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .preset-modal-content {
                background: white;
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                overflow: hidden;
            }
            
            .preset-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid #e9ecef;
            }
            
            .preset-modal-header h5 {
                margin: 0;
                font-size: 16px;
            }
            
            .btn-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #6c757d;
            }
            
            .btn-close:hover {
                color: #495057;
            }
            
            .preset-modal-body {
                padding: 15px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .preset-item {
                display: flex;
                align-items: center;
                padding: 12px;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .preset-item:hover {
                border-color: #007bff;
                background: #f8f9fa;
            }
            
            .preset-preview {
                margin-right: 15px;
            }
            
            .preset-colors {
                display: flex;
                gap: 2px;
            }
            
            .preset-color {
                width: 12px;
                height: 12px;
                border-radius: 2px;
                border: 1px solid #fff;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
            }
            
            .preset-info h6 {
                margin: 0 0 4px 0;
                font-size: 13px;
                color: #333;
            }
            
            .preset-info p {
                margin: 0;
                font-size: 11px;
                color: #6c757d;
            }
        `;
        
        document.head.appendChild(style);
    }    
// 绑定事件
    bindEvents() {
        // 标签页切换
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // 预设按钮
        const presetBtn = this.container.querySelector('.btn-preset');
        if (presetBtn) {
            presetBtn.addEventListener('click', () => {
                this.showPresetModal();
            });
        }

        // 重置按钮
        const resetBtn = this.container.querySelector('.btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetConfig();
            });
        }

        // 应用按钮
        const applyBtn = this.container.querySelector('.btn-apply');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyConfig();
            });
        }

        // 预览切换按钮
        const togglePreviewBtn = this.container.querySelector('.btn-toggle-preview');
        if (togglePreviewBtn) {
            togglePreviewBtn.addEventListener('click', () => {
                this.togglePreview();
            });
        }

        // 配置项变更事件
        this.bindConfigEvents();

        // 预设模态框事件
        this.bindPresetModalEvents();
    }

    // 绑定配置项事件
    bindConfigEvents() {
        // 基础配置
        const titleInput = this.container.querySelector('#chart-title');
        if (titleInput) {
            titleInput.addEventListener('input', (e) => {
                this.updateConfig('title', e.target.value);
            });
        }

        const chartTypeSelect = this.container.querySelector('#chart-type');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', (e) => {
                this.updateConfig('chartType', e.target.value);
            });
        }

        const xAxisInput = this.container.querySelector('#x-axis-title');
        if (xAxisInput) {
            xAxisInput.addEventListener('input', (e) => {
                this.updateConfig('xAxis', e.target.value);
            });
        }

        const yAxisInput = this.container.querySelector('#y-axis-title');
        if (yAxisInput) {
            yAxisInput.addEventListener('input', (e) => {
                this.updateConfig('yAxis', e.target.value);
            });
        }

        // 样式配置
        const markerSelect = this.container.querySelector('#marker-style');
        if (markerSelect) {
            markerSelect.addEventListener('change', (e) => {
                this.updateConfig('markers', e.target.value);
            });
        }

        const lineWidthRange = this.container.querySelector('#line-width');
        if (lineWidthRange) {
            lineWidthRange.addEventListener('input', (e) => {
                this.updateConfig('lineWidth', parseInt(e.target.value));
                this.updateRangeValue(e.target, e.target.value + 'px');
            });
        }

        const markerSizeRange = this.container.querySelector('#marker-size');
        if (markerSizeRange) {
            markerSizeRange.addEventListener('input', (e) => {
                this.updateConfig('markerSize', parseInt(e.target.value));
                this.updateRangeValue(e.target, e.target.value + 'px');
            });
        }

        // 高级配置
        const showLegendCheck = this.container.querySelector('#show-legend');
        if (showLegendCheck) {
            showLegendCheck.addEventListener('change', (e) => {
                this.updateConfig('showLegend', e.target.checked);
                this.toggleLegendPositionGroup(e.target.checked);
            });
        }

 lector
('#marker-style');
        if (markerSelect) {
            markerSelect.addEventListener('change', (e) => {
                this.updateConfig('markers', e.target.value);
            });
        }

        const lineWidthRange = this.container.querySelector('#line-width');
        if (lineWidthRange) {
            lineWidthRange.addEventListener('input', (e) => {
                this.updateConfig('lineWidth', parseInt(e.target.value));
                this.updateRangeValue(e.target, e.target.value + 'px');
            });
        }

        const markerSizeRange = this.container.querySelector('#marker-size');
        if (markerSizeRange) {
            markerSizeRange.addEventListener('input', (e) => {
                this.updateConfig('markerSize', parseInt(e.target.value));
                this.updateRangeValue(e.target, e.target.value + 'px');
            });
        }

        // 高级配置
        const showLegendCheckbox = this.container.querySelector('#show-legend');
        if (showLegendCheckbox) {
            showLegendCheckbox.addEventListener('change', (e) => {
                this.updateConfig('showLegend', e.target.checked);
                this.toggleLegendPositionGroup(e.target.checked);
            });
        }

        const legendPositionSelect = this.container.querySelector('#legend-position');
        if (legendPositionSelect) {
            legendPositionSelect.addEventListener('change', (e) => {
                this.updateConfig('legendPosition', e.target.value);
            });
        }

        const showGridCheckbox = this.container.querySelector('#show-grid');
        if (showGridCheckbox) {
            showGridCheckbox.addEventListener('change', (e) => {
                this.updateConfig('gridLines', e.target.checked);
            });
        }

        const animationsCheckbox = this.container.querySelector('#enable-animations');
        if (animationsCheckbox) {
            animationsCheckbox.addEventListener('change', (e) => {
                this.updateConfig('animations', e.target.checked);
            });
        }

        // 颜色方案选择
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.color-scheme-item')) {
                this.selectColorScheme(e.target.closest('.color-scheme-item'));
            }
        });
    }

    // 绑定预设模态框事件
    bindPresetModalEvents() {
        const modal = this.container.querySelector('#preset-modal');
        const closeBtn = this.container.querySelector('#close-preset-modal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePresetModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hidePresetModal();
                }
            });

            // 预设项点击
            modal.addEventListener('click', (e) => {
                if (e.target.closest('.preset-item')) {
                    this.applyPreset(e.target.closest('.preset-item').dataset.preset);
                }
            });
        }
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新标签按钮状态
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.container.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新面板显示
        this.container.querySelectorAll('.config-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        this.container.querySelector(`[data-panel="${tabName}"]`).classList.add('active');
    }

    // 更新配置
    updateConfig(key, value) {
        this.config[key] = value;
        
        // 触发变更事件
        if (this.options.onChange) {
            this.options.onChange(this.config, key, value);
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('chartConfig.changed', {
                config: this.config,
                key,
                value
            });
        }

        // 如果预览模式开启，更新预览
        if (this.isPreviewMode) {
            this.updatePreview();
        }
    }

    // 更新范围输入显示值
    updateRangeValue(rangeElement, value) {
        const valueSpan = rangeElement.parentNode.querySelector('.range-value');
        if (valueSpan) {
            valueSpan.textContent = value;
        }
    }

    // 切换图例位置组显示
    toggleLegendPositionGroup(show) {
        const group = this.container.querySelector('#legend-position-group');
        if (group) {
            group.style.display = show ? '' : 'none';
        }
    }

    // 选择颜色方案
    selectColorScheme(schemeElement) {
        // 更新选中状态
        this.container.querySelectorAll('.color-scheme-item').forEach(item => {
            item.classList.remove('selected');
        });
        schemeElement.classList.add('selected');

        // 获取颜色方案
        const schemeName = schemeElement.dataset.scheme;
        const colorSchemes = window.CHART?.COLORS || {};
        const colors = colorSchemes[schemeName];

        if (colors) {
            this.updateConfig('colors', colors);
        }
    }

    // 显示预设模态框
    showPresetModal() {
        const modal = this.container.querySelector('#preset-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    // 隐藏预设模态框
    hidePresetModal() {
        const modal = this.container.querySelector('#preset-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 应用预设
    applyPreset(presetKey) {
        const preset = this.presets.get(presetKey);
        if (!preset) return;

        // 合并预设配置
        Object.assign(this.config, preset.config);

        // 重新渲染界面
        this.render();
        this.bindEvents();

        // 触发变更事件
        if (this.options.onChange) {
            this.options.onChange(this.config, 'preset', presetKey);
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('chartConfig.presetApplied', {
                config: this.config,
                preset: presetKey
            });
        }

        // 隐藏模态框
        this.hidePresetModal();

        console.log(`✅ 应用预设配置: ${preset.name}`);
    }

    // 重置配置
    resetConfig() {
        if (!confirm('确定要重置所有配置吗？')) {
            return;
        }

        // 重置为默认配置
        this.config = {
            title: '',
            xAxis: '',
            yAxis: '',
            chartType: 'scatter',
            colors: window.CHART?.COLORS?.DEFAULT || ['#1f77b4', '#ff7f0e', '#2ca02c'],
            markers: 'circle',
            lineWidth: 2,
            markerSize: 6,
            showLegend: true,
            legendPosition: 'outside-right',
            gridLines: true,
            animations: true,
            style: {}
        };

        // 重新渲染界面
        this.render();
        this.bindEvents();

        // 触发重置事件
        if (this.options.onReset) {
            this.options.onReset(this.config);
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('chartConfig.reset', {
                config: this.config
            });
        }

        console.log('✅ 配置已重置为默认值');
    }

    // 应用配置
    applyConfig() {
        // 触发应用事件
        if (this.options.onApply) {
            this.options.onApply(this.config);
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('chartConfig.applied', {
                config: this.config
            });
        }

        // 更新应用状态
        if (window.appState) {
            window.appState.setState({
                chartConfig: this.config
            });
        }

        console.log('✅ 图表配置已应用', this.config);
    }

    // 切换预览模式
    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        
        const previewContent = this.container.querySelector('.preview-content');
        const toggleBtn = this.container.querySelector('.btn-toggle-preview');

        if (previewContent && toggleBtn) {
            if (this.isPreviewMode) {
                previewContent.style.display = 'block';
                toggleBtn.textContent = '关闭预览';
                this.updatePreview();
            } else {
                previewContent.style.display = 'none';
                toggleBtn.textContent = '开启预览';
            }
        }
    }

    // 更新预览
    async updatePreview() {
        if (!this.isPreviewMode) return;

        const previewContainer = this.container.querySelector('#chart-preview');
        if (!previewContainer) return;

        try {
            // 显示加载状态
            previewContainer.innerHTML = `
                <div class="preview-loading">
                    <div class="loading-spinner"></div>
                    <span>正在生成预览...</span>
                </div>
            `;

            // 生成示例数据
            const sampleData = this.generateSampleData();

            // 创建预览图表
            if (window.chartEngine) {
                await window.chartEngine.createChart(previewContainer, sampleData, this.getPlotlyLayout(), {
                    displayModeBar: false,
                    responsive: true
                });
            } else {
                throw new Error('ChartEngine 未加载');
            }

        } catch (error) {
            console.error('预览更新失败:', error);
            previewContainer.innerHTML = `
                <div class="preview-error">
                    <div class="error-icon">⚠️</div>
                    <p>预览生成失败</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    // 生成示例数据
    generateSampleData() {
        const dataCount = 20;
        const data = [];

        switch (this.config.chartType) {
            case 'scatter':
                data.push({
                    x: Array.from({length: dataCount}, () => Math.random() * 100),
                    y: Array.from({length: dataCount}, () => Math.random() * 100),
                    mode: 'markers',
                    type: 'scatter',
                    marker: {
                        color: this.config.colors[0],
                        size: this.config.markerSize,
                        symbol: this.config.markers
                    },
                    name: '示例数据'
                });
                break;

            case 'line':
                data.push({
                    x: Array.from({length: dataCount}, (_, i) => i),
                    y: Array.from({length: dataCount}, () => Math.random() * 100),
                    mode: 'lines+markers',
                    type: 'scatter',
                    line: {
                        color: this.config.colors[0],
                        width: this.config.lineWidth
                    },
                    marker: {
                        size: this.config.markerSize,
                        symbol: this.config.markers
                    },
                    name: '示例数据'
                });
                break;

            case 'bar':
                data.push({
                    x: ['A', 'B', 'C', 'D', 'E'],
                    y: [20, 14, 23, 25, 22],
                    type: 'bar',
                    marker: {
                        color: this.config.colors[0]
                    },
                    name: '示例数据'
                });
                break;

            default:
                // 默认散点图
                data.push({
                    x: Array.from({length: dataCount}, () => Math.random() * 100),
                    y: Array.from({length: dataCount}, () => Math.random() * 100),
                    mode: 'markers',
                    type: 'scatter',
                    marker: {
                        color: this.config.colors[0],
                        size: this.config.markerSize
                    },
                    name: '示例数据'
                });
        }

        return data;
    }

    // 获取Plotly布局配置
    getPlotlyLayout() {
        return {
            title: {
                text: this.config.title || '预览图表',
                font: { size: 14 }
            },
            xaxis: {
                title: this.config.xAxis || 'X轴',
                showgrid: this.config.gridLines
            },
            yaxis: {
                title: this.config.yAxis || 'Y轴',
                showgrid: this.config.gridLines
            },
            showlegend: this.config.showLegend,
            legend: {
                orientation: this.config.legendPosition.includes('top') || this.config.legendPosition.includes('bottom') ? 'h' : 'v',
                x: this.getLegendX(),
                y: this.getLegendY()
            },
            margin: { t: 40, r: 40, b: 40, l: 40 },
            height: 170,
            font: { size: 10 }
        };
    }

    // 获取图例X位置
    getLegendX() {
        switch (this.config.legendPosition) {
            case 'inside-topleft':
            case 'inside-bottomleft':
                return 0;
            case 'inside-topright':
            case 'inside-bottomright':
                return 1;
            case 'outside-right':
                return 1.02;
            default:
                return 0.5;
        }
    }

    // 获取图例Y位置
    getLegendY() {
        switch (this.config.legendPosition) {
            case 'inside-topleft':
            case 'inside-topright':
                return 1;
            case 'inside-bottomleft':
            case 'inside-bottomright':
                return 0;
            case 'top':
                return 1.02;
            case 'bottom':
                return -0.1;
            default:
                return 0.5;
        }
    }

    // 导出配置
    exportConfig() {
        const configData = {
            config: this.config,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(configData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chart-config-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('✅ 配置已导出');
    }

    // 导入配置
    importConfig(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const configData = JSON.parse(e.target.result);
                    
                    if (configData.config) {
                        this.config = { ...this.config, ...configData.config };
                        this.render();
                        this.bindEvents();
                        
                        console.log('✅ 配置已导入');
                        resolve(this.config);
                    } else {
                        throw new Error('无效的配置文件格式');
                    }
                } catch (error) {
                    console.error('配置导入失败:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsText(file);
        });
    }

    // 添加自定义预设
    addPreset(key, name, config) {
        this.presets.set(key, {
            name,
            config: { ...config }
        });

        console.log(`✅ 添加预设: ${name}`);
    }

    // 删除预设
    removePreset(key) {
        if (this.presets.has(key)) {
            this.presets.delete(key);
            console.log(`✅ 删除预设: ${key}`);
            return true;
        }
        return false;
    }

    // 获取当前配置
    getConfig() {
        return { ...this.config };
    }

    // 设置配置
    setConfig(config) {
        this.config = { ...this.config, ...config };
        this.render();
        this.bindEvents();
    }

    // 获取所有预设
    getPresets() {
        return Array.from(this.presets.entries()).map(([key, preset]) => ({
            key,
            name: preset.name,
            config: preset.config
        }));
    }

    // 销毁组件
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }

        // 清理事件监听器
        this.presets.clear();
        
        console.log('✅ ChartConfig 组件已销毁');
    }
}

// 导出组件
window.ChartConfig = ChartConfig;