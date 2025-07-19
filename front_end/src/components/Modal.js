/**
 * 模态框组件
 * 提供可定制的模态对话框功能
 */
class Modal {
    constructor(options = {}) {
        this.options = {
            title: '',
            content: '',
            size: 'medium', // small, medium, large, fullscreen
            closable: true,
            backdrop: true,
            keyboard: true,
            animation: true,
            centered: false,
            scrollable: false,
            showHeader: true,
            showFooter: false,
            buttons: [],
            onShow: null,
            onHide: null,
            onConfirm: null,
            onCancel: null,
            ...options
        };

        this.isVisible = false;
        this.modalElement = null;
        this.backdropElement = null;
        this.originalFocus = null;

        this.init();
    }

    // 初始化组件
    init() {
        this.createModal();
        this.addStyles();
        this.bindEvents();
    }

    // 创建模态框
    createModal() {
        // 创建背景遮罩
        this.backdropElement = document.createElement('div');
        this.backdropElement.className = 'modal-backdrop';
        this.backdropElement.style.display = 'none';

        // 创建模态框
        this.modalElement = document.createElement('div');
        this.modalElement.className = `modal ${this.options.size} ${this.options.animation ? 'fade' : ''}`;
        this.modalElement.style.display = 'none';
        this.modalElement.setAttribute('tabindex', '-1');
        this.modalElement.setAttribute('role', 'dialog');
        this.modalElement.setAttribute('aria-modal', 'true');

        if (this.options.title) {
            this.modalElement.setAttribute('aria-labelledby', 'modal-title');
        }

        this.render();

        // 添加到页面
        document.body.appendChild(this.backdropElement);
        document.body.appendChild(this.modalElement);
    }

    // 渲染模态框内容
    render() {
        const headerHtml = this.options.showHeader ? this.renderHeader() : '';
        const footerHtml = this.options.showFooter || this.options.buttons.length > 0 ? this.renderFooter() : '';

        this.modalElement.innerHTML = `
            <div class="modal-dialog ${this.options.centered ? 'modal-dialog-centered' : ''} ${this.options.scrollable ? 'modal-dialog-scrollable' : ''}">
                <div class="modal-content">
                    ${headerHtml}
                    <div class="modal-body">
                        ${this.options.content}
                    </div>
                    ${footerHtml}
                </div>
            </div>
        `;
    }

    // 渲染头部
    renderHeader() {
        return `
            <div class="modal-header">
                <h5 class="modal-title" id="modal-title">${this.options.title}</h5>
                ${this.options.closable ? `
                    <button type="button" class="modal-close" aria-label="关闭">
                        <span aria-hidden="true">×</span>
                    </button>
                ` : ''}
            </div>
        `;
    }

    // 渲染底部
    renderFooter() {
        let buttonsHtml = '';

        if (this.options.buttons.length > 0) {
            buttonsHtml = this.options.buttons.map(button => `
                <button type="button" 
                        class="btn ${button.className || 'btn-secondary'}" 
                        data-action="${button.action || 'custom'}"
                        ${button.disabled ? 'disabled' : ''}>
                    ${button.text}
                </button>
            `).join('');
        } else {
            // 默认按钮
            buttonsHtml = `
                <button type="button" class="btn btn-secondary" data-action="cancel">取消</button>
                <button type="button" class="btn btn-primary" data-action="confirm">确定</button>
            `;
        }

        return `
            <div class="modal-footer">
                ${buttonsHtml}
            </div>
        `;
    }

    // 绑定事件
    bindEvents() {
        // 关闭按钮事件
        this.modalElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close')) {
                this.hide();
            }
        });

        // 按钮事件
        this.modalElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn')) {
                const action = e.target.dataset.action;
                this.handleButtonClick(action, e.target);
            }
        });

        // 背景点击事件
        if (this.options.backdrop) {
            this.backdropElement.addEventListener('click', () => {
                this.hide();
            });

            this.modalElement.addEventListener('click', (e) => {
                if (e.target === this.modalElement) {
                    this.hide();
                }
            });
        }

        // 键盘事件
        if (this.options.keyboard) {
            document.addEventListener('keydown', (e) => {
                if (this.isVisible && e.key === 'Escape') {
                    this.hide();
                }
            });
        }

        // 焦点管理
        this.modalElement.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.handleTabKey(e);
            }
        });
    }

    // 处理按钮点击
    handleButtonClick(action, buttonElement) {
        switch (action) {
            case 'confirm':
                if (this.options.onConfirm) {
                    const result = this.options.onConfirm(this);
                    if (result !== false) {
                        this.hide();
                    }
                } else {
                    this.hide();
                }
                break;

            case 'cancel':
                if (this.options.onCancel) {
                    const result = this.options.onCancel(this);
                    if (result !== false) {
                        this.hide();
                    }
                } else {
                    this.hide();
                }
                break;

            default:
                // 自定义按钮
                const button = this.options.buttons.find(btn => btn.action === action);
                if (button && button.onClick) {
                    const result = button.onClick(this, buttonElement);
                    if (result !== false && button.closeModal !== false) {
                        this.hide();
                    }
                }
                break;
        }
    }

    // 处理Tab键焦点循环
    handleTabKey(e) {
        const focusableElements = this.modalElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    // 显示模态框
    show() {
        if (this.isVisible) return;

        // 保存当前焦点
        this.originalFocus = document.activeElement;

        // 显示背景和模态框
        this.backdropElement.style.display = 'block';
        this.modalElement.style.display = 'block';

        // 添加动画类
        if (this.options.animation) {
            setTimeout(() => {
                this.backdropElement.classList.add('show');
                this.modalElement.classList.add('show');
            }, 10);
        }

        // 设置焦点
        setTimeout(() => {
            const firstFocusable = this.modalElement.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);

        // 防止页面滚动
        document.body.style.overflow = 'hidden';

        this.isVisible = true;

        // 触发显示回调
        if (this.options.onShow) {
            this.options.onShow(this);
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('modal.shown', {
                modal: this,
                title: this.options.title
            });
        }
    }

    // 隐藏模态框
    hide() {
        if (!this.isVisible) return;

        // 移除动画类
        if (this.options.animation) {
            this.backdropElement.classList.remove('show');
            this.modalElement.classList.remove('show');

            setTimeout(() => {
                this.backdropElement.style.display = 'none';
                this.modalElement.style.display = 'none';
            }, 300);
        } else {
            this.backdropElement.style.display = 'none';
            this.modalElement.style.display = 'none';
        }

        // 恢复页面滚动
        document.body.style.overflow = '';

        // 恢复焦点
        if (this.originalFocus) {
            this.originalFocus.focus();
        }

        this.isVisible = false;

        // 触发隐藏回调
        if (this.options.onHide) {
            this.options.onHide(this);
        }

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('modal.hidden', {
                modal: this,
                title: this.options.title
            });
        }
    }

    // 切换显示状态
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // 设置标题
    setTitle(title) {
        this.options.title = title;
        const titleElement = this.modalElement.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    // 设置内容
    setContent(content) {
        this.options.content = content;
        const bodyElement = this.modalElement.querySelector('.modal-body');
        if (bodyElement) {
            bodyElement.innerHTML = content;
        }
    }

    // 设置大小
    setSize(size) {
        this.options.size = size;
        this.modalElement.className = this.modalElement.className.replace(
            /\b(small|medium|large|fullscreen)\b/g, 
            size
        );
    }

    // 添加样式
    addStyles() {
        if (document.getElementById('modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 1040;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .modal-backdrop.show {
                opacity: 1;
            }
            
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1050;
                overflow-x: hidden;
                overflow-y: auto;
                outline: 0;
            }
            
            .modal.fade {
                opacity: 0;
                transition: opacity 0.3s ease, transform 0.3s ease;
                transform: translate(0, -50px);
            }
            
            .modal.fade.show {
                opacity: 1;
                transform: translate(0, 0);
            }
            
            .modal-dialog {
                position: relative;
                width: auto;
                margin: 1.75rem auto;
                max-width: 500px;
                pointer-events: none;
            }
            
            .modal-dialog-centered {
                display: flex;
                align-items: center;
                min-height: calc(100% - 3.5rem);
            }
            
            .modal-dialog-scrollable {
                max-height: calc(100% - 3.5rem);
            }
            
            .modal-dialog-scrollable .modal-content {
                max-height: 100%;
                overflow: hidden;
            }
            
            .modal-dialog-scrollable .modal-body {
                overflow-y: auto;
            }
            
            .modal-content {
                position: relative;
                display: flex;
                flex-direction: column;
                width: 100%;
                pointer-events: auto;
                background-color: #fff;
                background-clip: padding-box;
                border: 1px solid rgba(0, 0, 0, 0.2);
                border-radius: 0.5rem;
                box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
                outline: 0;
            }
            
            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem 1rem 0.5rem;
                border-bottom: 1px solid #e9ecef;
            }
            
            .modal-title {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 500;
                line-height: 1.2;
                color: #333;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                font-weight: 700;
                line-height: 1;
                color: #000;
                opacity: 0.5;
                cursor: pointer;
                padding: 0;
                margin: 0;
                width: 1.5rem;
                height: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-close:hover {
                opacity: 0.75;
            }
            
            .modal-body {
                position: relative;
                flex: 1 1 auto;
                padding: 1rem;
            }
            
            .modal-footer {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 0.5rem;
                padding: 0.75rem 1rem 1rem;
                border-top: 1px solid #e9ecef;
            }
            
            .modal .btn {
                padding: 0.375rem 0.75rem;
                font-size: 0.875rem;
                border-radius: 0.25rem;
                border: 1px solid transparent;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                display: inline-block;
                text-align: center;
                vertical-align: middle;
                user-select: none;
            }
            
            .modal .btn:disabled {
                opacity: 0.65;
                cursor: not-allowed;
            }
            
            .modal .btn-primary {
                color: #fff;
                background-color: #007bff;
                border-color: #007bff;
            }
            
            .modal .btn-primary:hover:not(:disabled) {
                background-color: #0056b3;
                border-color: #004085;
            }
            
            .modal .btn-secondary {
                color: #fff;
                background-color: #6c757d;
                border-color: #6c757d;
            }
            
            .modal .btn-secondary:hover:not(:disabled) {
                background-color: #545b62;
                border-color: #4e555b;
            }
            
            .modal .btn-success {
                color: #fff;
                background-color: #28a745;
                border-color: #28a745;
            }
            
            .modal .btn-success:hover:not(:disabled) {
                background-color: #218838;
                border-color: #1e7e34;
            }
            
            .modal .btn-danger {
                color: #fff;
                background-color: #dc3545;
                border-color: #dc3545;
            }
            
            .modal .btn-danger:hover:not(:disabled) {
                background-color: #c82333;
                border-color: #bd2130;
            }
            
            /* 尺寸变体 */
            .modal.small .modal-dialog {
                max-width: 300px;
            }
            
            .modal.medium .modal-dialog {
                max-width: 500px;
            }
            
            .modal.large .modal-dialog {
                max-width: 800px;
            }
            
            .modal.fullscreen .modal-dialog {
                width: 100%;
                max-width: none;
                margin: 0;
                height: 100%;
            }
            
            .modal.fullscreen .modal-content {
                height: 100%;
                border: 0;
                border-radius: 0;
            }
            
            /* 响应式 */
            @media (max-width: 576px) {
                .modal-dialog {
                    margin: 1rem;
                    max-width: calc(100% - 2rem);
                }
                
                .modal.fullscreen .modal-dialog {
                    margin: 0;
                    max-width: 100%;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // 销毁模态框
    destroy() {
        this.hide();
        
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
        
        if (this.backdropElement && this.backdropElement.parentNode) {
            this.backdropElement.parentNode.removeChild(this.backdropElement);
        }
        
        this.modalElement = null;
        this.backdropElement = null;
    }

    // 静态方法：显示确认对话框
    static confirm(message, options = {}) {
        return new Promise((resolve) => {
            const modal = new Modal({
                title: options.title || '确认',
                content: message,
                size: options.size || 'small',
                showFooter: true,
                buttons: [
                    {
                        text: options.cancelText || '取消',
                        className: 'btn-secondary',
                        action: 'cancel'
                    },
                    {
                        text: options.confirmText || '确定',
                        className: 'btn-primary',
                        action: 'confirm'
                    }
                ],
                onConfirm: () => {
                    resolve(true);
                    modal.destroy();
                },
                onCancel: () => {
                    resolve(false);
                    modal.destroy();
                },
                ...options
            });
            
            modal.show();
        });
    }

    // 静态方法：显示警告对话框
    static alert(message, options = {}) {
        return new Promise((resolve) => {
            const modal = new Modal({
                title: options.title || '提示',
                content: message,
                size: options.size || 'small',
                showFooter: true,
                buttons: [
                    {
                        text: options.buttonText || '确定',
                        className: 'btn-primary',
                        action: 'confirm'
                    }
                ],
                onConfirm: () => {
                    resolve();
                    modal.destroy();
                },
                ...options
            });
            
            modal.show();
        });
    }

    // 静态方法：显示输入对话框
    static prompt(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            const inputId = 'modal-prompt-input';
            const modal = new Modal({
                title: options.title || '输入',
                content: `
                    <p>${message}</p>
                    <input type="text" id="${inputId}" class="form-control" value="${defaultValue}" style="
                        width: 100%;
                        padding: 0.375rem 0.75rem;
                        border: 1px solid #ced4da;
                        border-radius: 0.25rem;
                        margin-top: 0.5rem;
                    ">
                `,
                size: options.size || 'small',
                showFooter: true,
                buttons: [
                    {
                        text: options.cancelText || '取消',
                        className: 'btn-secondary',
                        action: 'cancel'
                    },
                    {
                        text: options.confirmText || '确定',
                        className: 'btn-primary',
                        action: 'confirm'
                    }
                ],
                onShow: () => {
                    const input = modal.modalElement.querySelector(`#${inputId}`);
                    if (input) {
                        input.focus();
                        input.select();
                    }
                },
                onConfirm: () => {
                    const input = modal.modalElement.querySelector(`#${inputId}`);
                    const value = input ? input.value : '';
                    resolve(value);
                    modal.destroy();
                },
                onCancel: () => {
                    resolve(null);
                    modal.destroy();
                },
                ...options
            });
            
            modal.show();
        });
    }
}

// 导出组件
window.Modal = Modal;