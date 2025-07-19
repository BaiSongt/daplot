/**
 * 加载动画组件
 * 提供多种样式的加载动画效果
 */
class LoadingSpinner {
    constructor(options = {}) {
        this.options = {
            container: null,
            type: 'spinner', // spinner, dots, bars, pulse, ring
            size: 'medium', // small, medium, large
            color: '#007bff',
            text: '加载中...',
            showText: true,
            overlay: false,
            ...options
        };

        this.container = null;
        this.isVisible = false;

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
            throw new Error('LoadingSpinner: 容器元素未找到');
        }

        this.addStyles();
        this.render();
    }

    // 渲染组件
    render() {
        const spinnerHtml = this.getSpinnerHtml();
        
        this.container.innerHTML = `
            <div class="loading-spinner-wrapper ${this.options.overlay ? 'overlay' : ''}" 
                 style="display: none;">
                <div class="loading-spinner-content">
                    ${spinnerHtml}
                    ${this.options.showText ? `
                        <div class="loading-text">${this.options.text}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // 获取加载动画HTML
    getSpinnerHtml() {
        const sizeClass = `size-${this.options.size}`;
        const colorStyle = `color: ${this.options.color}`;

        switch (this.options.type) {
            case 'spinner':
                return `
                    <div class="spinner ${sizeClass}" style="${colorStyle}">
                        <div class="spinner-border"></div>
                    </div>
                `;

            case 'dots':
                return `
                    <div class="dots ${sizeClass}" style="${colorStyle}">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                `;

            case 'bars':
                return `
                    <div class="bars ${sizeClass}" style="${colorStyle}">
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                    </div>
                `;

            case 'pulse':
                return `
                    <div class="pulse ${sizeClass}" style="${colorStyle}">
                        <div class="pulse-ring"></div>
                    </div>
                `;

            case 'ring':
                return `
                    <div class="ring ${sizeClass}" style="${colorStyle}">
                        <div class="ring-spinner"></div>
                    </div>
                `;

            default:
                return this.getSpinnerHtml({ ...this.options, type: 'spinner' });
        }
    }

    // 添加样式
    addStyles() {
        if (document.getElementById('loading-spinner-styles')) return;

        const style = document.createElement('style');
        style.id = 'loading-spinner-styles';
        style.textContent = `
            .loading-spinner-wrapper {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 60px;
            }
            
            .loading-spinner-wrapper.overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.8);
                z-index: 1000;
            }
            
            .loading-spinner-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }
            
            .loading-text {
                font-size: 14px;
                color: #6c757d;
                text-align: center;
            }
            
            /* Spinner 样式 */
            .spinner {
                display: inline-block;
            }
            
            .spinner-border {
                border: 2px solid transparent;
                border-top: 2px solid currentColor;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .spinner.size-small .spinner-border {
                width: 16px;
                height: 16px;
            }
            
            .spinner.size-medium .spinner-border {
                width: 24px;
                height: 24px;
            }
            
            .spinner.size-large .spinner-border {
                width: 32px;
                height: 32px;
            }
            
            /* Dots 样式 */
            .dots {
                display: flex;
                gap: 4px;
            }
            
            .dots .dot {
                background: currentColor;
                border-radius: 50%;
                animation: dots 1.4s ease-in-out infinite both;
            }
            
            .dots .dot:nth-child(1) { animation-delay: -0.32s; }
            .dots .dot:nth-child(2) { animation-delay: -0.16s; }
            .dots .dot:nth-child(3) { animation-delay: 0s; }
            
            .dots.size-small .dot {
                width: 4px;
                height: 4px;
            }
            
            .dots.size-medium .dot {
                width: 6px;
                height: 6px;
            }
            
            .dots.size-large .dot {
                width: 8px;
                height: 8px;
            }
            
            /* Bars 样式 */
            .bars {
                display: flex;
                gap: 2px;
                align-items: end;
            }
            
            .bars .bar {
                background: currentColor;
                animation: bars 1.2s ease-in-out infinite;
            }
            
            .bars .bar:nth-child(1) { animation-delay: -0.24s; }
            .bars .bar:nth-child(2) { animation-delay: -0.12s; }
            .bars .bar:nth-child(3) { animation-delay: 0s; }
            .bars .bar:nth-child(4) { animation-delay: 0.12s; }
            
            .bars.size-small .bar {
                width: 2px;
                height: 12px;
            }
            
            .bars.size-medium .bar {
                width: 3px;
                height: 18px;
            }
            
            .bars.size-large .bar {
                width: 4px;
                height: 24px;
            }
            
            /* Pulse 样式 */
            .pulse {
                position: relative;
                display: inline-block;
            }
            
            .pulse-ring {
                border: 2px solid currentColor;
                border-radius: 50%;
                animation: pulse 2s ease-in-out infinite;
            }
            
            .pulse.size-small .pulse-ring {
                width: 16px;
                height: 16px;
            }
            
            .pulse.size-medium .pulse-ring {
                width: 24px;
                height: 24px;
            }
            
            .pulse.size-large .pulse-ring {
                width: 32px;
                height: 32px;
            }
            
            /* Ring 样式 */
            .ring {
                display: inline-block;
            }
            
            .ring-spinner {
                border: 2px solid rgba(0, 0, 0, 0.1);
                border-left: 2px solid currentColor;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .ring.size-small .ring-spinner {
                width: 16px;
                height: 16px;
            }
            
            .ring.size-medium .ring-spinner {
                width: 24px;
                height: 24px;
            }
            
            .ring.size-large .ring-spinner {
                width: 32px;
                height: 32px;
            }
            
            /* 动画定义 */
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes dots {
                0%, 80%, 100% {
                    transform: scale(0);
                    opacity: 0.5;
                }
                40% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes bars {
                0%, 40%, 100% {
                    transform: scaleY(0.4);
                }
                20% {
                    transform: scaleY(1);
                }
            }
            
            @keyframes pulse {
                0% {
                    transform: scale(0);
                    opacity: 1;
                }
                100% {
                    transform: scale(1);
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // 显示加载动画
    show(text = null) {
        if (text) {
            this.setText(text);
        }

        const wrapper = this.container.querySelector('.loading-spinner-wrapper');
        if (wrapper) {
            wrapper.style.display = 'flex';
            this.isVisible = true;
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('loadingSpinner.shown', {
                container: this.container,
                text: this.options.text
            });
        }
    }

    // 隐藏加载动画
    hide() {
        const wrapper = this.container.querySelector('.loading-spinner-wrapper');
        if (wrapper) {
            wrapper.style.display = 'none';
            this.isVisible = false;
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('loadingSpinner.hidden', {
                container: this.container
            });
        }
    }

    // 切换显示状态
    toggle(text = null) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(text);
        }
    }

    // 设置加载文本
    setText(text) {
        this.options.text = text;
        const textElement = this.container.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = text;
        }
    }

    // 设置颜色
    setColor(color) {
        this.options.color = color;
        const spinnerElement = this.container.querySelector('.loading-spinner-content > div');
        if (spinnerElement) {
            spinnerElement.style.color = color;
        }
    }

    // 设置大小
    setSize(size) {
        this.options.size = size;
        this.render();
    }

    // 设置类型
    setType(type) {
        this.options.type = type;
        this.render();
    }

    // 检查是否可见
    isShown() {
        return this.isVisible;
    }

    // 销毁组件
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.isVisible = false;
    }

    // 静态方法：创建全局加载器
    static createGlobal(options = {}) {
        const globalContainer = document.createElement('div');
        globalContainer.id = 'global-loading-spinner';
        globalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(globalContainer);

        return new LoadingSpinner({
            container: globalContainer,
            overlay: true,
            ...options
        });
    }

    // 静态方法：显示全局加载器
    static showGlobal(text = '加载中...', options = {}) {
        if (!window.globalLoadingSpinner) {
            window.globalLoadingSpinner = LoadingSpinner.createGlobal(options);
        }
        window.globalLoadingSpinner.show(text);
        return window.globalLoadingSpinner;
    }

    // 静态方法：隐藏全局加载器
    static hideGlobal() {
        if (window.globalLoadingSpinner) {
            window.globalLoadingSpinner.hide();
        }
    }
}

// 导出组件
window.LoadingSpinner = LoadingSpinner;