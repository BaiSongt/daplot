/**
 * 错误边界组件
 * 捕获和处理JavaScript错误，提供友好的错误界面
 */
class ErrorBoundary {
    constructor(options = {}) {
        this.options = {
            container: null,
            fallbackUI: null,
            onError: null,
            showDetails: false,
            allowRetry: true,
            logErrors: true,
            ...options
        };

        this.container = null;
        this.hasError = false;
        this.errorInfo = null;
        this.originalContent = '';

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
            throw new Error('ErrorBoundary: 容器元素未找到');
        }

        // 保存原始内容
        this.originalContent = this.container.innerHTML;

        // 设置错误处理
        this.setupErrorHandling();
        this.addStyles();
    }

    // 设置错误处理
    setupErrorHandling() {
        // 捕获同步错误
        const originalConsoleError = console.error;
        console.error = (...args) => {
            this.handleError(new Error(args.join(' ')), { type: 'console' });
            originalConsoleError.apply(console, args);
        };

        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, { 
                type: 'promise',
                event: event
            });
        });

        // 捕获全局错误
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message), {
                type: 'global',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                event: event
            });
        });
    }

    // 处理错误
    handleError(error, errorInfo = {}) {
        this.hasError = true;
        this.errorInfo = {
            error,
            errorInfo,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // 记录错误
        if (this.options.logErrors) {
            this.logError(this.errorInfo);
        }

        // 触发错误回调
        if (this.options.onError) {
            try {
                this.options.onError(error, errorInfo);
            } catch (callbackError) {
                console.error('ErrorBoundary callback error:', callbackError);
            }
        }

        // 显示错误界面
        this.renderErrorUI();

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('errorBoundary.error', this.errorInfo);
        }
    }

    // 渲染错误界面
    renderErrorUI() {
        if (this.options.fallbackUI && typeof this.options.fallbackUI === 'function') {
            try {
                this.container.innerHTML = this.options.fallbackUI(this.errorInfo);
            } catch (fallbackError) {
                console.error('Fallback UI error:', fallbackError);
                this.renderDefaultErrorUI();
            }
        } else {
            this.renderDefaultErrorUI();
        }

        // 绑定重试按钮事件
        this.bindRetryEvents();
    }

    // 渲染默认错误界面
    renderDefaultErrorUI() {
        const { error, errorInfo } = this.errorInfo;
        
        this.container.innerHTML = `
            <div class="error-boundary">
                <div class="error-content">
                    <div class="error-icon">⚠️</div>
                    <h3 class="error-title">出现了一个错误</h3>
                    <p class="error-message">
                        很抱歉，应用遇到了一个意外错误。请尝试刷新页面或联系技术支持。
                    </p>
                    
                    ${this.options.showDetails ? `
                        <details class="error-details">
                            <summary>错误详情</summary>
                            <div class="error-info">
                                <div class="error-section">
                                    <strong>错误信息:</strong>
                                    <pre>${error.message || '未知错误'}</pre>
                                </div>
                                
                                ${error.stack ? `
                                    <div class="error-section">
                                        <strong>错误堆栈:</strong>
                                        <pre>${error.stack}</pre>
                                    </div>
                                ` : ''}
                                
                                <div class="error-section">
                                    <strong>错误类型:</strong>
                                    <span>${errorInfo.type || 'unknown'}</span>
                                </div>
                                
                                <div class="error-section">
                                    <strong>发生时间:</strong>
                                    <span>${new Date(this.errorInfo.timestamp).toLocaleString()}</span>
                                </div>
                                
                                ${errorInfo.filename ? `
                                    <div class="error-section">
                                        <strong>文件位置:</strong>
                                        <span>${errorInfo.filename}:${errorInfo.lineno}:${errorInfo.colno}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </details>
                    ` : ''}
                    
                    <div class="error-actions">
                        ${this.options.allowRetry ? `
                            <button class="btn btn-primary btn-retry">重试</button>
                        ` : ''}
                        <button class="btn btn-secondary btn-reload">刷新页面</button>
                        <button class="btn btn-secondary btn-report">报告问题</button>
                    </div>
                </div>
            </div>
        `;
    }

    // 绑定重试事件
    bindRetryEvents() {
        const retryBtn = this.container.querySelector('.btn-retry');
        const reloadBtn = this.container.querySelector('.btn-reload');
        const reportBtn = this.container.querySelector('.btn-report');

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.retry();
            });
        }

        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }

        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                this.reportError();
            });
        }
    }

    // 重试操作
    retry() {
        try {
            // 重置错误状态
            this.hasError = false;
            this.errorInfo = null;

            // 恢复原始内容
            this.container.innerHTML = this.originalContent;

            // 发送重试事件
            if (window.eventBus) {
                window.eventBus.emit('errorBoundary.retry');
            }

            console.log('✅ ErrorBoundary: 重试成功');

        } catch (error) {
            console.error('ErrorBoundary: 重试失败', error);
            this.handleError(error, { type: 'retry' });
        }
    }

    // 报告错误
    reportError() {
        try {
            const errorReport = {
                ...this.errorInfo,
                reportedAt: new Date().toISOString()
            };

            // 这里可以发送错误报告到服务器
            console.log('错误报告:', errorReport);

            // 显示报告成功消息
            this.showMessage('错误报告已发送，感谢您的反馈！', 'success');

            // 发送报告事件
            if (window.eventBus) {
                window.eventBus.emit('errorBoundary.reported', errorReport);
            }

        } catch (error) {
            console.error('发送错误报告失败:', error);
            this.showMessage('发送报告失败，请稍后重试', 'error');
        }
    }

    // 显示消息
    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `error-message-toast ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        // 设置背景色
        switch (type) {
            case 'success':
                messageEl.style.backgroundColor = '#28a745';
                break;
            case 'error':
                messageEl.style.backgroundColor = '#dc3545';
                break;
            default:
                messageEl.style.backgroundColor = '#007bff';
        }

        document.body.appendChild(messageEl);

        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // 记录错误
    logError(errorInfo) {
        const logEntry = {
            level: 'error',
            message: errorInfo.error.message,
            stack: errorInfo.error.stack,
            timestamp: errorInfo.timestamp,
            url: errorInfo.url,
            userAgent: errorInfo.userAgent,
            type: errorInfo.errorInfo.type
        };

        // 发送到控制台
        console.group('🚨 ErrorBoundary 错误日志');
        console.error('错误信息:', errorInfo.error);
        console.log('错误详情:', errorInfo.errorInfo);
        console.log('发生时间:', errorInfo.timestamp);
        console.log('页面URL:', errorInfo.url);
        console.groupEnd();

        // 这里可以发送到日志服务
        // await this.sendToLogService(logEntry);
    }

    // 添加样式
    addStyles() {
        if (document.getElementById('error-boundary-styles')) return;

        const style = document.createElement('style');
        style.id = 'error-boundary-styles';
        style.textContent = `
            .error-boundary {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 300px;
                padding: 20px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                font-family: 'Segoe UI', sans-serif;
            }
            
            .error-content {
                text-align: center;
                max-width: 600px;
                width: 100%;
            }
            
            .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .error-title {
                color: #dc3545;
                margin-bottom: 12px;
                font-size: 24px;
                font-weight: 600;
            }
            
            .error-message {
                color: #6c757d;
                margin-bottom: 20px;
                line-height: 1.5;
                font-size: 16px;
            }
            
            .error-details {
                text-align: left;
                margin: 20px 0;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                background: white;
            }
            
            .error-details summary {
                padding: 12px;
                cursor: pointer;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                font-weight: 500;
            }
            
            .error-details summary:hover {
                background: #e9ecef;
            }
            
            .error-info {
                padding: 16px;
            }
            
            .error-section {
                margin-bottom: 12px;
            }
            
            .error-section strong {
                display: block;
                margin-bottom: 4px;
                color: #495057;
                font-size: 14px;
            }
            
            .error-section pre {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                padding: 8px;
                font-size: 12px;
                overflow-x: auto;
                white-space: pre-wrap;
                word-break: break-word;
            }
            
            .error-section span {
                color: #6c757d;
                font-size: 14px;
            }
            
            .error-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
                flex-wrap: wrap;
                margin-top: 24px;
            }
            
            .error-boundary .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                text-decoration: none;
                display: inline-block;
            }
            
            .error-boundary .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .error-boundary .btn-primary:hover {
                background: #0056b3;
            }
            
            .error-boundary .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .error-boundary .btn-secondary:hover {
                background: #545b62;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // 检查是否有错误
    hasErrorState() {
        return this.hasError;
    }

    // 获取错误信息
    getErrorInfo() {
        return this.errorInfo;
    }

    // 清除错误状态
    clearError() {
        this.hasError = false;
        this.errorInfo = null;
        this.container.innerHTML = this.originalContent;
    }

    // 设置原始内容
    setOriginalContent(content) {
        this.originalContent = content;
    }

    // 销毁组件
    destroy() {
        this.clearError();
        // 这里可以移除事件监听器，但要小心不要影响全局错误处理
    }

    // 静态方法：包装函数以捕获错误
    static wrap(fn, errorHandler = null) {
        return function(...args) {
            try {
                const result = fn.apply(this, args);
                
                // 如果返回Promise，捕获异步错误
                if (result && typeof result.catch === 'function') {
                    return result.catch(error => {
                        if (errorHandler) {
                            errorHandler(error);
                        } else {
                            console.error('Wrapped function error:', error);
                        }
                        throw error;
                    });
                }
                
                return result;
            } catch (error) {
                if (errorHandler) {
                    errorHandler(error);
                } else {
                    console.error('Wrapped function error:', error);
                }
                throw error;
            }
        };
    }

    // 静态方法：创建全局错误边界
    static createGlobal(options = {}) {
        const globalContainer = document.createElement('div');
        globalContainer.id = 'global-error-boundary';
        globalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9998;
            display: none;
        `;
        document.body.appendChild(globalContainer);

        return new ErrorBoundary({
            container: globalContainer,
            showDetails: true,
            ...options
        });
    }
}

// 导出组件
window.ErrorBoundary = ErrorBoundary;