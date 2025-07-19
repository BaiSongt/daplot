/**
 * 页面状态管理器
 * 用于保存和恢复页面状态，实现页面切换时的状态持久化
 */
class PageStateManager {
    constructor() {
        this.prefix = 'daplot_page_state_';
        this.currentPage = null;
        this.stateData = {};
        
        // 监听页面卸载事件
        window.addEventListener('beforeunload', () => {
            this.saveCurrentPageState();
        });
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveCurrentPageState();
            }
        });
    }

    /**
     * 设置当前页面
     * @param {string} pageName - 页面名称
     */
    setCurrentPage(pageName) {
        if (this.currentPage && this.currentPage !== pageName) {
            this.saveCurrentPageState();
        }
        this.currentPage = pageName;
        this.loadPageState(pageName);
    }

    /**
     * 保存当前页面状态
     */
    saveCurrentPageState() {
        if (!this.currentPage) return;

        try {
            const state = this.collectPageState();
            const key = this.prefix + this.currentPage;
            
            const stateData = {
                timestamp: Date.now(),
                page: this.currentPage,
                state: state,
                version: '1.0'
            };

            localStorage.setItem(key, JSON.stringify(stateData));
            console.log(`✅ 页面状态已保存: ${this.currentPage}`);
            
        } catch (error) {
            console.error('保存页面状态失败:', error);
        }
    }

    /**
     * 加载页面状态
     * @param {string} pageName - 页面名称
     */
    loadPageState(pageName) {
        try {
            const key = this.prefix + pageName;
            const savedData = localStorage.getItem(key);
            
            if (savedData) {
                const stateData = JSON.parse(savedData);
                
                // 检查状态是否过期（24小时）
                const maxAge = 24 * 60 * 60 * 1000;
                if (Date.now() - stateData.timestamp > maxAge) {
                    localStorage.removeItem(key);
                    console.log(`⏰ 页面状态已过期，已清理: ${pageName}`);
                    return;
                }
                
                // 延迟恢复状态，确保页面元素已加载
                setTimeout(() => {
                    this.restorePageState(stateData.state);
                    console.log(`✅ 页面状态已恢复: ${pageName}`);
                }, 100);
            }
            
        } catch (error) {
            console.error('加载页面状态失败:', error);
        }
    }

    /**
     * 收集当前页面状态
     * @returns {Object} 页面状态对象
     */
    collectPageState() {
        const state = {};

        // 收集文件选择器状态
        const fileSelector = document.getElementById('fileSelector');
        if (fileSelector) {
            state.selectedFile = fileSelector.value;
        }

        // 收集坐标轴选择状态
        const xAxis = document.getElementById('xAxis');
        const yAxis = document.getElementById('yAxis');
        if (xAxis) state.xAxis = xAxis.value;
        if (yAxis) state.yAxis = yAxis.value;

        // 收集图表样式设置
        const chartTitle = document.getElementById('chartTitle');
        const xAxisTitle = document.getElementById('xAxisTitle');
        const yAxisTitle = document.getElementById('yAxisTitle');
        const colorScheme = document.getElementById('colorScheme');
        const markerStyle = document.getElementById('markerStyle');
        const lineWidth = document.getElementById('lineWidth');
        const markerSize = document.getElementById('markerSize');

        if (chartTitle) state.chartTitle = chartTitle.value;
        if (xAxisTitle) state.xAxisTitle = xAxisTitle.value;
        if (yAxisTitle) state.yAxisTitle = yAxisTitle.value;
        if (colorScheme) state.colorScheme = colorScheme.value;
        if (markerStyle) state.markerStyle = markerStyle.value;
        if (lineWidth) state.lineWidth = lineWidth.value;
        if (markerSize) state.markerSize = markerSize.value;

        // 收集灵活表头筛选器状态
        if (typeof flexibleHeaderSelectors !== 'undefined') {
            state.flexibleHeaderSelectors = flexibleHeaderSelectors.map(selector => ({
                id: selector.id,
                column: selector.column,
                values: selector.values || []
            }));
        }

        // 收集预测设置状态（如果存在）
        const predictionSteps = document.getElementById('predictionSteps');
        const predictionMethod = document.getElementById('predictionMethod');
        if (predictionSteps) state.predictionSteps = predictionSteps.value;
        if (predictionMethod) state.predictionMethod = predictionMethod.value;

        // 收集当前图表数据（如果存在）
        if (typeof currentPlot !== 'undefined' && currentPlot) {
            state.hasPlot = true;
            state.plotTraceCount = currentPlot.traces ? currentPlot.traces.length : 0;
        }

        // 收集当前标签页状态
        const activeTab = document.querySelector('.chart-tab.active');
        if (activeTab) {
            state.activeTab = activeTab.textContent.trim();
        }

        return state;
    }

    /**
     * 恢复页面状态
     * @param {Object} state - 页面状态对象
     */
    restorePageState(state) {
        try {
            // 恢复文件选择器
            if (state.selectedFile) {
                const fileSelector = document.getElementById('fileSelector');
                if (fileSelector) {
                    fileSelector.value = state.selectedFile;
                    // 触发文件切换事件
                    if (typeof switchFile === 'function') {
                        switchFile();
                    }
                }
            }

            // 恢复坐标轴选择
            if (state.xAxis) {
                const xAxis = document.getElementById('xAxis');
                if (xAxis) xAxis.value = state.xAxis;
            }
            if (state.yAxis) {
                const yAxis = document.getElementById('yAxis');
                if (yAxis) yAxis.value = state.yAxis;
            }

            // 恢复图表样式设置
            if (state.chartTitle) {
                const chartTitle = document.getElementById('chartTitle');
                if (chartTitle) chartTitle.value = state.chartTitle;
            }
            if (state.xAxisTitle) {
                const xAxisTitle = document.getElementById('xAxisTitle');
                if (xAxisTitle) xAxisTitle.value = state.xAxisTitle;
            }
            if (state.yAxisTitle) {
                const yAxisTitle = document.getElementById('yAxisTitle');
                if (yAxisTitle) yAxisTitle.value = state.yAxisTitle;
            }
            if (state.colorScheme) {
                const colorScheme = document.getElementById('colorScheme');
                if (colorScheme) colorScheme.value = state.colorScheme;
            }
            if (state.markerStyle) {
                const markerStyle = document.getElementById('markerStyle');
                if (markerStyle) markerStyle.value = state.markerStyle;
            }
            if (state.lineWidth) {
                const lineWidth = document.getElementById('lineWidth');
                if (lineWidth) lineWidth.value = state.lineWidth;
            }
            if (state.markerSize) {
                const markerSize = document.getElementById('markerSize');
                if (markerSize) markerSize.value = state.markerSize;
            }

            // 恢复预测设置
            if (state.predictionSteps) {
                const predictionSteps = document.getElementById('predictionSteps');
                if (predictionSteps) predictionSteps.value = state.predictionSteps;
            }
            if (state.predictionMethod) {
                const predictionMethod = document.getElementById('predictionMethod');
                if (predictionMethod) predictionMethod.value = state.predictionMethod;
            }

            // 恢复灵活表头筛选器状态
            if (state.flexibleHeaderSelectors && typeof flexibleHeaderSelectors !== 'undefined') {
                // 清空现有选择器
                flexibleHeaderSelectors.length = 0;
                
                // 恢复选择器
                state.flexibleHeaderSelectors.forEach(selectorState => {
                    const selector = {
                        id: selectorState.id,
                        column: selectorState.column,
                        values: selectorState.values || []
                    };
                    flexibleHeaderSelectors.push(selector);
                });

                // 重新渲染选择器界面
                if (typeof renderFlexibleHeaderSelectors === 'function') {
                    renderFlexibleHeaderSelectors();
                }
            }

            // 恢复标签页状态
            if (state.activeTab && typeof switchTab === 'function') {
                // 延迟切换标签页，确保其他状态已恢复
                setTimeout(() => {
                    if (state.activeTab.includes('预测') || state.activeTab.includes('Prediction')) {
                        switchTab('prediction');
                    } else {
                        switchTab('original');
                    }
                }, 200);
            }

        } catch (error) {
            console.error('恢复页面状态失败:', error);
        }
    }

    /**
     * 清理过期的页面状态
     */
    cleanupExpiredStates() {
        try {
            const maxAge = 24 * 60 * 60 * 1000; // 24小时
            const keysToRemove = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (Date.now() - data.timestamp > maxAge) {
                            keysToRemove.push(key);
                        }
                    } catch (e) {
                        keysToRemove.push(key);
                    }
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            if (keysToRemove.length > 0) {
                console.log(`🧹 已清理 ${keysToRemove.length} 个过期的页面状态`);
            }

        } catch (error) {
            console.error('清理过期状态失败:', error);
        }
    }

    /**
     * 手动保存状态
     */
    saveState() {
        this.saveCurrentPageState();
    }

    /**
     * 清空所有页面状态
     */
    clearAllStates() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            console.log(`🧹 已清空所有页面状态，共 ${keysToRemove.length} 个`);

        } catch (error) {
            console.error('清空页面状态失败:', error);
        }
    }
}

// 创建全局实例
window.pageStateManager = new PageStateManager();

// 页面加载完成后清理过期状态
document.addEventListener('DOMContentLoaded', () => {
    window.pageStateManager.cleanupExpiredStates();
});
