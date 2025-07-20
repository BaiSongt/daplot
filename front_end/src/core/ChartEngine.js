/**
 * 图表引擎模块
 * 统一管理图表的创建、更新、销毁和导出
 */
class ChartEngine {
    constructor() {
        this.charts = new Map();
        this.plotlyLoaded = false;
        this.loadingPromise = null;
        this.themes = new Map();
        this.defaultConfig = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
            displaylogo: false,
            toImageButtonOptions: {
                format: 'png',
                filename: 'chart',
                height: 600,
                width: 800,
                scale: 2
            }
        };
        
        this.initThemes();
        this.setupEventListeners();
    }

    // 初始化主题
    initThemes() {
        // 默认主题
        this.themes.set('default', {
            layout: {
                paper_bgcolor: 'white',
                plot_bgcolor: 'white',
                font: { family: 'Arial, sans-serif', size: 12, color: '#333' },
                colorway: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
            }
        });

        // 暗色主题
        this.themes.set('dark', {
            layout: {
                paper_bgcolor: '#2f3349',
                plot_bgcolor: '#2f3349',
                font: { family: 'Arial, sans-serif', size: 12, color: '#ffffff' },
                colorway: ['#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A', '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52'],
                xaxis: { gridcolor: '#506784', zerolinecolor: '#506784' },
                yaxis: { gridcolor: '#506784', zerolinecolor: '#506784' }
            }
        });

        // 简洁主题
        this.themes.set('minimal', {
            layout: {
                paper_bgcolor: 'white',
                plot_bgcolor: 'white',
                font: { family: 'Helvetica, Arial, sans-serif', size: 11, color: '#444' },
                colorway: ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395'],
                xaxis: { showgrid: false, zeroline: false },
                yaxis: { showgrid: true, gridcolor: '#f0f0f0', zeroline: false }
            }
        });
    }

    // 设置事件监听
    setupEventListeners() {
        // 监听窗口大小变化，自动调整图表大小
        window.addEventListener('resize', this.debounce(() => {
            this.resizeAllCharts();
        }, 300));

        // 监听主题变化
        if (window.eventBus) {
            window.eventBus.on('theme.changed', (theme) => {
                this.applyThemeToAllCharts(theme);
            });
        }
    }

    // 防抖函数
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

    // 确保Plotly已加载
    async ensurePlotlyLoaded() {
        if (this.plotlyLoaded) {
            return true;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this.loadPlotly();
        return this.loadingPromise;
    }

    // 加载Plotly库
    async loadPlotly() {
        try {
            console.log('🔄 开始加载Plotly库...');

            // 优先使用本地版本
            if (await this.loadLocalPlotly()) {
                this.plotlyLoaded = true;
                console.log('✅ Plotly本地版本加载成功');
                return true;
            }

            // 回退到CDN
            if (await this.loadCDNPlotly()) {
                this.plotlyLoaded = true;
                console.log('✅ Plotly CDN版本加载成功');
                return true;
            }

            throw new Error('无法加载Plotly库');
        } catch (error) {
            console.error('❌ Plotly加载失败:', error);
            throw error;
        }
    }

    // 加载本地Plotly
    async loadLocalPlotly() {
        // 如果Plotly已经通过script标签加载，直接返回true
        if (window.Plotly) {
            return true;
        }
        
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'assets/libs/plotly.min.js';
            
            // 设置超时
            const timeout = setTimeout(() => {
                script.remove();
                resolve(false);
            }, 5000);
            
            script.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            
            document.head.appendChild(script);
        });
    }

    // 加载CDN Plotly
    async loadCDNPlotly() {
        const cdnUrls = [
            'https://cdn.plot.ly/plotly-3.1.0.min.js',
            'https://unpkg.com/plotly.js@2.26.0/dist/plotly.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.26.0/plotly.min.js',
            'https://cdn.jsdelivr.net/npm/plotly.js@2.26.0/dist/plotly.min.js'
        ];

        for (const url of cdnUrls) {
            try {
                console.log(`🔄 尝试CDN: ${url}`);
                const loaded = await new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = url;
                    script.onload = () => resolve(true);
                    script.onerror = () => resolve(false);
                    
                    const timeout = setTimeout(() => {
                        script.remove();
                        resolve(false);
                    }, 10000);
                    
                    script.onload = () => {
                        clearTimeout(timeout);
                        resolve(true);
                    };
                    
                    document.head.appendChild(script);
                });

                if (loaded) {
                    return true;
                }
            } catch (error) {
                console.warn(`⚠️ CDN加载失败: ${url}`);
            }
        }

        return false;
    }

    // 创建图表
    async createChart(containerId, data, layout = {}, config = {}) {
        await this.ensurePlotlyLoaded();

        if (!window.Plotly) {
            throw new Error('Plotly库未加载');
        }

        const container = typeof containerId === 'string' 
            ? document.getElementById(containerId) 
            : containerId;

        if (!container) {
            throw new Error(`容器未找到: ${containerId}`);
        }

        // 应用默认配置和主题
        const finalLayout = this.applyTheme({ ...layout });
        const finalConfig = { ...this.defaultConfig, ...config };

        try {
            await window.Plotly.newPlot(container, data, finalLayout, finalConfig);
            
            // 保存图表信息
            const chartInfo = {
                container: container,
                data: data,
                layout: finalLayout,
                config: finalConfig,
                created: new Date(),
                updated: new Date()
            };
            
            this.charts.set(containerId, chartInfo);

            // 绑定事件
            this.bindChartEvents(container, containerId);

            console.log(`✅ 图表创建成功: ${containerId}`);
            
            // 发送事件
            if (window.eventBus) {
                window.eventBus.emit('chart.created', { containerId, chartInfo });
            }

            return true;
        } catch (error) {
            console.error('❌ 图表创建失败:', error);
            throw error;
        }
    }

    // 绑定图表事件
    bindChartEvents(container, containerId) {
        // 点击事件
        container.on('plotly_click', (data) => {
            if (window.eventBus) {
                window.eventBus.emit('chart.click', { containerId, data });
            }
        });

        // 悬停事件
        container.on('plotly_hover', (data) => {
            if (window.eventBus) {
                window.eventBus.emit('chart.hover', { containerId, data });
            }
        });

        // 选择事件
        container.on('plotly_selected', (data) => {
            if (window.eventBus) {
                window.eventBus.emit('chart.selected', { containerId, data });
            }
        });

        // 缩放事件
        container.on('plotly_relayout', (data) => {
            if (window.eventBus) {
                window.eventBus.emit('chart.relayout', { containerId, data });
            }
        });
    }

    // 更新图表
    async updateChart(containerId, data, layout = {}) {
        const chartInfo = this.charts.get(containerId);
        if (!chartInfo) {
            throw new Error(`图表不存在: ${containerId}`);
        }

        await this.ensurePlotlyLoaded();

        try {
            const finalLayout = this.applyTheme({ ...chartInfo.layout, ...layout });
            
            await window.Plotly.react(chartInfo.container, data, finalLayout, chartInfo.config);
            
            // 更新图表信息
            chartInfo.data = data;
            chartInfo.layout = finalLayout;
            chartInfo.updated = new Date();

            console.log(`✅ 图表更新成功: ${containerId}`);
            
            // 发送事件
            if (window.eventBus) {
                window.eventBus.emit('chart.updated', { containerId, chartInfo });
            }

            return true;
        } catch (error) {
            console.error('❌ 图表更新失败:', error);
            throw error;
        }
    }

    // 调整图表大小
    async resizeChart(containerId) {
        const chartInfo = this.charts.get(containerId);
        if (!chartInfo) {
            return false;
        }

        try {
            await window.Plotly.Plots.resize(chartInfo.container);
            return true;
        } catch (error) {
            console.error('❌ 图表大小调整失败:', error);
            return false;
        }
    }

    // 调整所有图表大小
    async resizeAllCharts() {
        const promises = Array.from(this.charts.keys()).map(containerId => 
            this.resizeChart(containerId)
        );
        
        await Promise.all(promises);
    }

    // 应用主题
    applyTheme(layout, themeName = 'default') {
        const theme = this.themes.get(themeName);
        if (!theme) {
            return layout;
        }

        return this.deepMerge(theme.layout, layout);
    }

    // 应用主题到所有图表
    async applyThemeToAllCharts(themeName) {
        for (const [containerId, chartInfo] of this.charts) {
            try {
                const themedLayout = this.applyTheme(chartInfo.layout, themeName);
                await this.updateChart(containerId, chartInfo.data, themedLayout);
            } catch (error) {
                console.error(`❌ 应用主题失败: ${containerId}`, error);
            }
        }
    }

    // 深度合并对象
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    // 导出图表
    async exportChart(containerId, options = {}) {
        const chartInfo = this.charts.get(containerId);
        if (!chartInfo) {
            throw new Error(`图表不存在: ${containerId}`);
        }

        await this.ensurePlotlyLoaded();

        const defaultOptions = {
            format: 'png',
            width: 800,
            height: 600,
            filename: 'chart',
            scale: 2
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            if (finalOptions.format === 'html') {
                return this.exportToHTML(chartInfo, finalOptions);
            } else {
                return await window.Plotly.toImage(chartInfo.container, finalOptions);
            }
        } catch (error) {
            console.error('❌ 图表导出失败:', error);
            throw error;
        }
    }

    // 导出为HTML
    exportToHTML(chartInfo, options) {
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${options.filename || 'Chart'}</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
    <div id="chart" style="width:100%;height:100vh;"></div>
    <script>
        Plotly.newPlot('chart', ${JSON.stringify(chartInfo.data)}, ${JSON.stringify(chartInfo.layout)}, ${JSON.stringify(chartInfo.config)});
    </script>
</body>
</html>`;
        
        return htmlContent;
    }

    // 下载图表
    async downloadChart(containerId, options = {}) {
        try {
            const imageData = await this.exportChart(containerId, options);
            
            if (options.format === 'html') {
                this.downloadFile(imageData, `${options.filename || 'chart'}.html`, 'text/html');
            } else {
                // 对于图片格式，imageData是base64字符串
                const link = document.createElement('a');
                link.download = `${options.filename || 'chart'}.${options.format || 'png'}`;
                link.href = imageData;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            console.log(`✅ 图表下载成功: ${containerId}`);
            
            // 发送事件
            if (window.eventBus) {
                window.eventBus.emit('chart.downloaded', { containerId, options });
            }

            return true;
        } catch (error) {
            console.error('❌ 图表下载失败:', error);
            throw error;
        }
    }

    // 下载文件辅助函数
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
    }

    // 销毁图表
    destroyChart(containerId) {
        const chartInfo = this.charts.get(containerId);
        if (!chartInfo) {
            return false;
        }

        try {
            if (window.Plotly) {
                window.Plotly.purge(chartInfo.container);
            }
            
            this.charts.delete(containerId);
            
            console.log(`✅ 图表销毁成功: ${containerId}`);
            
            // 发送事件
            if (window.eventBus) {
                window.eventBus.emit('chart.destroyed', { containerId });
            }

            return true;
        } catch (error) {
            console.error('❌ 图表销毁失败:', error);
            return false;
        }
    }

    // 销毁所有图表
    destroyAllCharts() {
        const containerIds = Array.from(this.charts.keys());
        let successCount = 0;

        for (const containerId of containerIds) {
            if (this.destroyChart(containerId)) {
                successCount++;
            }
        }

        console.log(`✅ 销毁了 ${successCount}/${containerIds.length} 个图表`);
        return successCount;
    }

    // 获取图表信息
    getChartInfo(containerId) {
        return this.charts.get(containerId);
    }

    // 获取所有图表信息
    getAllCharts() {
        return Array.from(this.charts.entries()).map(([id, info]) => ({
            id,
            ...info
        }));
    }

    // 检查图表是否存在
    hasChart(containerId) {
        return this.charts.has(containerId);
    }

    // 获取图表数量
    getChartCount() {
        return this.charts.size;
    }

    // 添加自定义主题
    addTheme(name, theme) {
        this.themes.set(name, theme);
        console.log(`✅ 主题添加成功: ${name}`);
    }

    // 获取可用主题列表
    getAvailableThemes() {
        return Array.from(this.themes.keys());
    }

    // 创建图表快照
    async createSnapshot(containerId) {
        const chartInfo = this.charts.get(containerId);
        if (!chartInfo) {
            throw new Error(`图表不存在: ${containerId}`);
        }

        return {
            containerId,
            data: JSON.parse(JSON.stringify(chartInfo.data)),
            layout: JSON.parse(JSON.stringify(chartInfo.layout)),
            config: JSON.parse(JSON.stringify(chartInfo.config)),
            timestamp: new Date().toISOString()
        };
    }

    // 从快照恢复图表
    async restoreFromSnapshot(snapshot) {
        return this.createChart(
            snapshot.containerId,
            snapshot.data,
            snapshot.layout,
            snapshot.config
        );
    }

    // 获取统计信息
    getStats() {
        return {
            totalCharts: this.charts.size,
            plotlyLoaded: this.plotlyLoaded,
            availableThemes: this.themes.size,
            charts: Array.from(this.charts.keys())
        };
    }
}

// 导出类和全局实例
window.ChartEngine = ChartEngine;
window.chartEngine = new ChartEngine();