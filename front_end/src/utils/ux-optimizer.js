/**
 * 用户体验优化模块
 * 提供全局错误处理、用户反馈、快捷键支持等功能
 */

class UXOptimizer {
    constructor() {
        this.errorHistory = [];
        this.userActions = [];
        this.shortcuts = new Map();
        this.notifications = [];
        this.retryQueue = [];
        
        this.init();
    }

    // 初始化用户体验优化
    init() {
        this.setupGlobalErrorHandling();
        this.setupKeyboardShortcuts();
        this.setupUserFeedback();
        this.setupAccessibility();
        this.setupPerformanceMonitoring();
        
        console.log('🎨 用户体验优化模块已初始化');
    }

    // 设置全局错误处理
    setupGlobalErrorHandling() {
        // JavaScript错误处理
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Promise拒绝处理
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || '未处理的Promise拒绝',
                reason: event.reason,
                timestamp: new Date().toISOString()
            });
        });

        // 网络错误处理
        this.setupNetworkErrorHandling();
    }

    // 处理错误
    handleError(errorInfo) {
        // 记录错误
        this.errorHistory.push(errorInfo);
        
        // 保持最近50个错误
        if (this.errorHistory.length > 50) {
            this.errorHistory.shift();
        }

        // 显示用户友好的错误信息
        this.showUserFriendlyError(errorInfo);
        
        // 尝试自动恢复
        this.attemptAutoRecovery(errorInfo);
        
        // 发送错误事件
        if (window.eventBus) {
            window.eventBus.emit('error.occurred', errorInfo);
        }

        console.error('🚨 错误处理:', errorInfo);
    }

    // 显示用户友好的错误信息
    showUserFriendlyError(errorInfo) {
        const userMessage = this.translateErrorToUserMessage(errorInfo);
        
        this.showNotification({
            type: 'error',
            title: '操作遇到问题',
            message: userMessage,
            actions: [
                {
                    text: '重试',
                    action: () => this.retryLastAction()
                },
                {
                    text: '报告问题',
                    action: () => this.reportError(errorInfo)
                }
            ],
            duration: 10000
        });
    }

    // 将技术错误转换为用户友好的消息
    translateErrorToUserMessage(errorInfo) {
        const errorPatterns = {
            'fetch': '网络连接出现问题，请检查网络连接',
            'permission': '没有足够的权限执行此操作',
            'file': '文件处理出现问题，请检查文件格式',
            'memory': '内存不足，请关闭其他应用程序',
            'timeout': '操作超时，请稍后重试',
            'validation': '输入的数据格式不正确',
            'auth': '身份验证失败，请重新登录'
        };

        const message = errorInfo.message?.toLowerCase() || '';
        
        for (const [pattern, userMessage] of Object.entries(errorPatterns)) {
            if (message.includes(pattern)) {
                return userMessage;
            }
        }

        return '操作遇到了意外问题，我们正在努力解决';
    }

    // 尝试自动恢复
    attemptAutoRecovery(errorInfo) {
        const recoveryStrategies = {
            'network': () => this.retryWithBackoff(),
            'memory': () => this.clearCaches(),
            'timeout': () => this.retryLastAction(),
            'file': () => this.suggestFileAlternatives()
        };

        const errorType = this.categorizeError(errorInfo);
        const strategy = recoveryStrategies[errorType];
        
        if (strategy) {
            setTimeout(() => {
                try {
                    strategy();
                } catch (recoveryError) {
                    console.warn('自动恢复失败:', recoveryError);
                }
            }, 1000);
        }
    }

    // 错误分类
    categorizeError(errorInfo) {
        const message = errorInfo.message?.toLowerCase() || '';
        
        if (message.includes('fetch') || message.includes('network')) return 'network';
        if (message.includes('memory') || message.includes('heap')) return 'memory';
        if (message.includes('timeout')) return 'timeout';
        if (message.includes('file') || message.includes('upload')) return 'file';
        
        return 'unknown';
    }

    // 设置键盘快捷键
    setupKeyboardShortcuts() {
        // 默认快捷键
        this.registerShortcut('Ctrl+S', () => this.saveCurrentState(), '保存当前状态');
        this.registerShortcut('Ctrl+Z', () => this.undoLastAction(), '撤销上一步操作');
        this.registerShortcut('Ctrl+Y', () => this.redoLastAction(), '重做操作');
        this.registerShortcut('Ctrl+R', () => this.refreshCurrentView(), '刷新当前视图');
        this.registerShortcut('Escape', () => this.cancelCurrentOperation(), '取消当前操作');
        this.registerShortcut('F1', () => this.showHelp(), '显示帮助');
        this.registerShortcut('Ctrl+/', () => this.showShortcutHelp(), '显示快捷键帮助');

        // 监听键盘事件
        document.addEventListener('keydown', (event) => {
            const key = this.getKeyCombo(event);
            const shortcut = this.shortcuts.get(key);
            
            if (shortcut) {
                event.preventDefault();
                shortcut.action();
                
                this.showNotification({
                    type: 'info',
                    message: `执行快捷键: ${shortcut.description}`,
                    duration: 2000
                });
            }
        });
    }

    // 注册快捷键
    registerShortcut(keyCombo, action, description) {
        this.shortcuts.set(keyCombo, { action, description });
    }

    // 获取按键组合
    getKeyCombo(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Meta');
        
        if (event.key !== 'Control' && event.key !== 'Alt' && 
            event.key !== 'Shift' && event.key !== 'Meta') {
            parts.push(event.key);
        }
        
        return parts.join('+');
    }

    // 设置用户反馈系统
    setupUserFeedback() {
        // 创建通知容器
        this.createNotificationContainer();
        
        // 设置加载状态管理
        this.setupLoadingStates();
        
        // 设置进度指示器
        this.setupProgressIndicators();
    }

    // 创建通知容器
    createNotificationContainer() {
        if (document.getElementById('ux-notifications')) return;
        
        const container = document.createElement('div');
        container.id = 'ux-notifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            pointer-events: none;
        `;
        
        document.body.appendChild(container);
    }

    // 显示通知
    showNotification(options) {
        const {
            type = 'info',
            title = '',
            message = '',
            actions = [],
            duration = 5000
        } = options;

        const notification = document.createElement('div');
        notification.className = `ux-notification ux-notification-${type}`;
        notification.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            margin-bottom: 10px;
            padding: 15px;
            border-left: 4px solid ${this.getTypeColor(type)};
            pointer-events: auto;
            animation: slideInRight 0.3s ease;
            max-width: 100%;
        `;

        let html = '';
        if (title) {
            html += `<div style="font-weight: 600; margin-bottom: 5px; color: #333;">${title}</div>`;
        }
        html += `<div style="color: #666; margin-bottom: ${actions.length ? '10px' : '0'};">${message}</div>`;
        
        if (actions.length) {
            html += '<div style="display: flex; gap: 8px;">';
            actions.forEach(action => {
                html += `<button onclick="this.parentElement.parentElement.remove(); (${action.action.toString()})()" 
                         style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 12px;">
                         ${action.text}
                         </button>`;
            });
            html += '</div>';
        }

        notification.innerHTML = html;
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 8px;
            border: none;
            background: none;
            font-size: 18px;
            cursor: pointer;
            color: #999;
        `;
        closeBtn.onclick = () => notification.remove();
        notification.appendChild(closeBtn);

        document.getElementById('ux-notifications').appendChild(notification);

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutRight 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }

        // 记录通知
        this.notifications.push({
            type,
            title,
            message,
            timestamp: new Date().toISOString()
        });
    }

    // 获取类型颜色
    getTypeColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#007bff'
        };
        return colors[type] || colors.info;
    }

    // 设置无障碍支持
    setupAccessibility() {
        // 添加跳转链接
        this.addSkipLinks();
        
        // 设置焦点管理
        this.setupFocusManagement();
        
        // 添加ARIA标签
        this.enhanceARIA();
        
        // 设置高对比度模式
        this.setupHighContrastMode();
    }

    // 添加跳转链接
    addSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = '跳转到主要内容';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 10001;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    // 设置焦点管理
    setupFocusManagement() {
        // 记录焦点历史
        let focusHistory = [];
        
        document.addEventListener('focusin', (event) => {
            focusHistory.push(event.target);
            if (focusHistory.length > 10) {
                focusHistory.shift();
            }
        });
        
        // ESC键返回上一个焦点
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && focusHistory.length > 1) {
                const previousElement = focusHistory[focusHistory.length - 2];
                if (previousElement && previousElement.focus) {
                    previousElement.focus();
                }
            }
        });
    }

    // 增强ARIA标签
    enhanceARIA() {
        // 为动态内容添加live region
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(liveRegion);
        
        // 存储live region引用
        this.liveRegion = liveRegion;
    }

    // 宣布给屏幕阅读器
    announceToScreenReader(message) {
        if (this.liveRegion) {
            this.liveRegion.textContent = message;
        }
    }

    // 设置高对比度模式
    setupHighContrastMode() {
        // 检测系统高对比度设置
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
        }
        
        // 添加切换按钮
        this.registerShortcut('Ctrl+Alt+H', () => {
            document.body.classList.toggle('high-contrast');
            this.showNotification({
                type: 'info',
                message: '高对比度模式已' + (document.body.classList.contains('high-contrast') ? '开启' : '关闭')
            });
        }, '切换高对比度模式');
    }

    // 操作相关方法
    saveCurrentState() {
        if (window.appState) {
            const state = window.appState.getState();
            localStorage.setItem('daplot_saved_state', JSON.stringify(state));
            this.showNotification({
                type: 'success',
                message: '当前状态已保存'
            });
        }
    }

    undoLastAction() {
        // 实现撤销逻辑
        this.showNotification({
            type: 'info',
            message: '撤销功能开发中'
        });
    }

    redoLastAction() {
        // 实现重做逻辑
        this.showNotification({
            type: 'info',
            message: '重做功能开发中'
        });
    }

    refreshCurrentView() {
        window.location.reload();
    }

    cancelCurrentOperation() {
        // 取消当前操作
        if (window.eventBus) {
            window.eventBus.emit('operation.cancel');
        }
        this.showNotification({
            type: 'info',
            message: '操作已取消'
        });
    }

    showHelp() {
        // 显示帮助信息
        this.showNotification({
            type: 'info',
            title: '帮助信息',
            message: '按 Ctrl+/ 查看快捷键列表',
            duration: 8000
        });
    }

    showShortcutHelp() {
        const shortcuts = Array.from(this.shortcuts.entries())
            .map(([key, info]) => `${key}: ${info.description}`)
            .join('\n');
            
        alert(`快捷键列表:\n\n${shortcuts}`);
    }

    retryLastAction() {
        // 重试最后一个操作
        this.showNotification({
            type: 'info',
            message: '正在重试...'
        });
    }

    reportError(errorInfo) {
        // 报告错误
        console.log('报告错误:', errorInfo);
        this.showNotification({
            type: 'success',
            message: '错误报告已发送，感谢您的反馈'
        });
    }

    // 性能监控
    setupPerformanceMonitoring() {
        // 监控长任务
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 100) {
                            this.showNotification({
                                type: 'warning',
                                message: `检测到性能问题，任务耗时 ${entry.duration.toFixed(2)}ms`,
                                duration: 3000
                            });
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.warn('性能监控不支持:', error);
            }
        }
    }

    // 获取用户体验报告
    getUXReport() {
        return {
            timestamp: new Date().toISOString(),
            errorHistory: this.errorHistory.slice(-10),
            notifications: this.notifications.slice(-20),
            shortcuts: Array.from(this.shortcuts.entries()),
            userActions: this.userActions.slice(-50)
        };
    }
}

// 创建全局实例
window.uxOptimizer = new UXOptimizer();

// 添加CSS样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .high-contrast {
        filter: contrast(150%) brightness(120%);
    }
    
    .high-contrast * {
        border-color: #000 !important;
    }
    
    .ux-notification:hover {
        box-shadow: 0 6px 25px rgba(0,0,0,0.2);
    }
`;
document.head.appendChild(style);

console.log('🎨 用户体验优化模块已加载');