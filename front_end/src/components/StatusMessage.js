/**
 * 状态消息组件
 * 显示各种类型的状态消息（成功、错误、警告、信息）
 */
class StatusMessage {
    constructor(options = {}) {
        this.options = {
            container: null,
            type: 'info', // success, error, warning, info
            message: '',
            title: null,
            closable: true,
            autoClose: false,
            autoCloseDelay: 5000,
            showIcon: true,
            position: 'static', // static, fixed-top, fixed-bottom, fixed-center
            animation: true,
            onClose: null,
            ...options
        };

        this.container = null;
        this.isVisible = false;
        this.autoCloseTimer = null;

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
            throw new Error('StatusMessage: 容器元素未找到');
        }

        this.addStyles();
        this.render();
    }

    // 渲染组件
    render() {
        const iconHtml = this.options.showIcon ? this.getIconHtml() : '';
        const titleHtml = this.options.title ? `<div class="status-title">${this.options.title}</div>` : '';
        const closeButtonHtml = this.options.closable ? '<button class="status-close" aria-label="关闭">×</button>' : '';

        this.container.innerHTML = `
            <div class="status-message ${this.options.type} ${this.options.position} ${this.options.animation ? 'animated' : ''}" 
                 style="display: none;">
                <div class="status-content">
                    ${iconHtml}
                    <div class="status-text">
                        ${titleHtml}
                        <div class="status-body">${this.options.message}</div>
                    </div>
                    ${closeButtonHtml}
                </div>
            </div>
        `;

        this.bindEvents();
    }

    // 获取图标HTML
    getIconHtml() {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        return `<div class="status-icon">${icons[this.options.type] || icons.info}</div>`;
    }

    // 绑定事件
    bindEvents() {
        const closeButton = this.container.querySelector('.status-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide();
            });
        }

        // 点击消息区域也可以关闭（如果允许）
        if (this.options.closable) {
            const messageElement = this.container.querySelector('.status-message');
            if (messageElement) {
                messageElement.addEventListener('click', (e) => {
                    // 只有点击消息本身才关闭，不包括关闭按钮
                    if (e.target !== closeButton) {
                        this.hide();
                    }
                });
            }
        }
    }

    // 显示消息
    show(message = null, type = null) {
        if (message) {
            this.setMessage(message);
        }
        
        if (type) {
            this.setType(type);
        }

        const messageElement = this.container.querySelector('.status-message');
        if (messageElement) {
            messageElement.style.display = 'flex';
            
            if (this.options.animation) {
                messageElement.classList.add('show');
            }
            
            this.isVisible = true;
        }

        // 设置自动关闭
        if (this.options.autoClose) {
            this.setAutoClose();
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('statusMessage.shown', {
                type: this.options.type,
                message: this.options.message,
                container: this.container
            });
        }
    }

    // 隐藏消息
    hide() {
        const messageElement = this.container.querySelector('.status-message');
        if (messageElement) {
            if (this.options.animation) {
                messageElement.classList.add('hide');
                
                setTimeout(() => {
                    messageElement.style.display = 'none';
                    messageElement.classList.remove('show', 'hide');
                }, 300);
            } else {
                messageElement.style.display = 'none';
            }
            
            this.isVisible = false;
        }

        // 清除自动关闭定时器
        this.clearAutoClose();

        // 触发关闭回调
        if (this.options.onClose) {
            this.options.onClose();
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('statusMessage.hidden', {
                type: this.options.type,
                message: this.options.message,
                container: this.container
            });
        }
    }

    // 切换显示状态
    toggle(message = null, type = null) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(message, type);
        }
    }

    // 设置消息内容
    setMessage(message) {
        this.options.message = message;
        const bodyElement = this.container.querySelector('.status-body');
        if (bodyElement) {
            bodyElement.innerHTML = message;
        }
    }

    // 设置标题
    setTitle(title) {
        this.options.title = title;
        let titleElement = this.container.querySelector('.status-title');
        
        if (title) {
            if (!titleElement) {
                const textContainer = this.container.querySelector('.status-text');
                if (textContainer) {
                    titleElement = document.createElement('div');
                    titleElement.className = 'status-title';
                    textContainer.insertBefore(titleElement, textContainer.firstChild);
                }
            }
            if (titleElement) {
                titleElement.textContent = title;
            }
        } else if (titleElement) {
            titleElement.remove();
        }
    }

    // 设置消息类型
    setType(type) {
        const messageElement = this.container.querySelector('.status-message');
        if (messageElement) {
            // 移除旧的类型类
            messageElement.classList.remove('success', 'error', 'warning', 'info');
            // 添加新的类型类
            messageElement.classList.add(type);
        }

        this.options.type = type;

        // 更新图标
        if (this.options.showIcon) {
            const iconElement = this.container.querySelector('.status-icon');
            if (iconElement) {
                const icons = {
                    success: '✅',
                    error: '❌',
                    warning: '⚠️',
                    info: 'ℹ️'
                };
                iconElement.textContent = icons[type] || icons.info;
            }
        }
    }

    // 设置自动关闭
    setAutoClose(delay = null) {
        this.clearAutoClose();
        
        const closeDelay = delay || this.options.autoCloseDelay;
        this.autoCloseTimer = setTimeout(() => {
            this.hide();
        }, closeDelay);
    }

    // 清除自动关闭
    clearAutoClose() {
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
    }

    // 添加样式
    addStyles() {
        if (document.getElementById('status-message-styles')) return;

        const style = document.createElement('style');
        style.id = 'status-message-styles';
        style.textContent = `
            .status-message {
                display: flex;
                align-items: flex-start;
                padding: 12px 16px;
                border-radius: 6px;
                border: 1px solid;
                font-family: 'Segoe UI', sans-serif;
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 12px;
                position: relative;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .status-message.animated {
                opacity: 0;
                transform: translateY(-10px);
            }
            
            .status-message.animated.show {
                opacity: 1;
                transform: translateY(0);
            }
            
            .status-message.animated.hide {
                opacity: 0;
                transform: translateY(-10px);
            }
            
            .status-message.fixed-top {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1050;
                min-width: 300px;
                max-width: 500px;
            }
            
            .status-message.fixed-bottom {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1050;
                min-width: 300px;
                max-width: 500px;
            }
            
            .status-message.fixed-center {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1050;
                min-width: 300px;
                max-width: 500px;
            }
            
            .status-content {
                display: flex;
                align-items: flex-start;
                width: 100%;
                gap: 10px;
            }
            
            .status-icon {
                font-size: 16px;
                flex-shrink: 0;
                margin-top: 1px;
            }
            
            .status-text {
                flex: 1;
                min-width: 0;
            }
            
            .status-title {
                font-weight: 600;
                margin-bottom: 4px;
                color: inherit;
            }
            
            .status-body {
                word-wrap: break-word;
            }
            
            .status-close {
                background: none;
                border: none;
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                padding: 0;
                margin-left: 10px;
                color: inherit;
                opacity: 0.7;
                transition: opacity 0.2s;
                flex-shrink: 0;
            }
            
            .status-close:hover {
                opacity: 1;
            }
            
            /* 成功消息样式 */
            .status-message.success {
                background-color: #d4edda;
                border-color: #c3e6cb;
                color: #155724;
            }
            
            .status-message.success .status-close {
                color: #155724;
            }
            
            /* 错误消息样式 */
            .status-message.error {
                background-color: #f8d7da;
                border-color: #f5c6cb;
                color: #721c24;
            }
            
            .status-message.error .status-close {
                color: #721c24;
            }
            
            /* 警告消息样式 */
            .status-message.warning {
                background-color: #fff3cd;
                border-color: #ffeaa7;
                color: #856404;
            }
            
            .status-message.warning .status-close {
                color: #856404;
            }
            
            /* 信息消息样式 */
            .status-message.info {
                background-color: #d1ecf1;
                border-color: #bee5eb;
                color: #0c5460;
            }
            
            .status-message.info .status-close {
                color: #0c5460;
            }
            
            /* 悬停效果 */
            .status-message:hover {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                transform: translateY(-1px);
            }
            
            .status-message.fixed-top:hover,
            .status-message.fixed-bottom:hover,
            .status-message.fixed-center:hover {
                transform: translateX(-50%) translateY(-1px);
            }
            
            .status-message.fixed-center:hover {
                transform: translate(-50%, -50%) translateY(-1px);
            }
        `;
        
        document.head.appendChild(style);
    }

    // 检查是否可见
    isShown() {
        return this.isVisible;
    }

    // 销毁组件
    destroy() {
        this.clearAutoClose();
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.isVisible = false;
    }

    // 静态方法：显示成功消息
    static success(message, options = {}) {
        return StatusMessage.show(message, 'success', options);
    }

    // 静态方法：显示错误消息
    static error(message, options = {}) {
        return StatusMessage.show(message, 'error', options);
    }

    // 静态方法：显示警告消息
    static warning(message, options = {}) {
        return StatusMessage.show(message, 'warning', options);
    }

    // 静态方法：显示信息消息
    static info(message, options = {}) {
        return StatusMessage.show(message, 'info', options);
    }

    // 静态方法：显示消息
    static show(message, type = 'info', options = {}) {
        // 创建临时容器
        const container = document.createElement('div');
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1050;';
        document.body.appendChild(container);

        const statusMessage = new StatusMessage({
            container: container,
            message: message,
            type: type,
            position: 'static',
            autoClose: true,
            autoCloseDelay: options.autoCloseDelay || 5000,
            onClose: () => {
                // 移除容器
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            },
            ...options
        });

        statusMessage.show();
        return statusMessage;
    }

    // 静态方法：创建通知容器
    static createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1050;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    // 静态方法：显示通知
    static notify(message, type = 'info', options = {}) {
        const container = StatusMessage.createNotificationContainer();
        
        const notificationElement = document.createElement('div');
        notificationElement.style.cssText = 'pointer-events: auto; margin-bottom: 10px;';
        container.appendChild(notificationElement);

        const statusMessage = new StatusMessage({
            container: notificationElement,
            message: message,
            type: type,
            position: 'static',
            autoClose: true,
            autoCloseDelay: options.autoCloseDelay || 4000,
            onClose: () => {
                // 移除通知元素
                if (notificationElement.parentNode) {
                    notificationElement.parentNode.removeChild(notificationElement);
                }
            },
            ...options
        });

        statusMessage.show();
        return statusMessage;
    }
}

// 导出组件
window.StatusMessage = StatusMessage;