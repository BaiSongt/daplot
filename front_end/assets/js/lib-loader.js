/**
 * 统一的库加载器
 * 优先本地，回退CDN
 */
class LibLoader {
    constructor() {
        this.loadedLibs = new Set();
        this.loadingPromises = new Map();
    }

    async loadPlotly() {
        if (this.loadedLibs.has('plotly')) {
            return Promise.resolve();
        }

        if (this.loadingPromises.has('plotly')) {
            return this.loadingPromises.get('plotly');
        }

        const promise = this._loadPlotlyInternal();
        this.loadingPromises.set('plotly', promise);
        return promise;
    }

    async _loadPlotlyInternal() {
        // 显示加载提示
        this.showLoadingMessage('正在加载图表库...');

        try {
            // 1. 尝试本地版本
            if (await this._loadScript('/assets/libs/plotly.min.js')) {
                this.loadedLibs.add('plotly');
                this.hideLoadingMessage();
                console.log('✅ Plotly本地版本加载成功');
                return;
            }

            // 2. 回退到CDN
            const cdnUrls = [
                'https://cdn.plot.ly/plotly-3.1.0.min.js',
                'https://unpkg.com/plotly.js@2.26.0/dist/plotly.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.26.0/plotly.min.js',
                'https://cdn.jsdelivr.net/npm/plotly.js@2.26.0/dist/plotly.min.js'
            ];

            for (let i = 0; i < cdnUrls.length; i++) {
                this.updateLoadingMessage(`尝试CDN ${i + 1}/${cdnUrls.length}...`);
                
                if (await this._loadScript(cdnUrls[i])) {
                    this.loadedLibs.add('plotly');
                    this.hideLoadingMessage();
                    console.log(`✅ Plotly CDN加载成功: ${cdnUrls[i]}`);
                    return;
                }
                
                // 等待1秒后尝试下一个CDN
                if (i < cdnUrls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            throw new Error('所有Plotly源都加载失败');

        } catch (error) {
            this.showErrorMessage('图表库加载失败，请检查网络连接后刷新页面');
            console.error('❌ Plotly加载失败:', error);
            throw error;
        }
    }

    _loadScript(src) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            
            // 设置超时
            const timeout = setTimeout(() => {
                script.remove();
                resolve(false);
            }, 10000); // 10秒超时
            
            script.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                resolve(false);
            };
            
            document.head.appendChild(script);
        });
    }

    showLoadingMessage(message) {
        let overlay = document.getElementById('lib-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'lib-loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${message}</div>
                </div>
            `;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(248, 249, 250, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                font-family: 'Segoe UI', sans-serif;
            `;
            
            const style = document.createElement('style');
            style.textContent = `
                .loading-content {
                    text-align: center;
                    padding: 40px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e9ecef;
                    border-top: 4px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                .loading-text {
                    color: #6c757d;
                    font-size: 14px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.loading-text').textContent = message;
        }
    }

    updateLoadingMessage(message) {
        const textEl = document.querySelector('#lib-loading-overlay .loading-text');
        if (textEl) {
            textEl.textContent = message;
        }
    }

    hideLoadingMessage() {
        const overlay = document.getElementById('lib-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showErrorMessage(message) {
        const overlay = document.getElementById('lib-loading-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div class="loading-content">
                    <div style="color: #dc3545; font-size: 24px; margin-bottom: 15px;">⚠️</div>
                    <div class="loading-text" style="color: #dc3545;">${message}</div>
                    <button onclick="location.reload()" style="
                        margin-top: 15px;
                        padding: 8px 16px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">刷新页面</button>
                </div>
            `;
        }
    }
}

// 全局实例
window.libLoader = new LibLoader();

// 页面加载完成后自动加载Plotly
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('visualization') || 
        window.location.pathname.includes('prediction')) {
        window.libLoader.loadPlotly();
    }
});