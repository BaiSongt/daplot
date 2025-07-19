/**
 * 提示框组件
 * 为元素提供悬停提示功能
 */
class Tooltip {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            content: '',
            placement: 'top', // top, bottom, left, right, auto
            trigger: 'hover', // hover, click, focus, manual
            delay: { show: 500, hide: 100 },
            animation: true,
            html: false,
            template: null,
            container: 'body',
            offset: 10,
            arrow: true,
            theme: 'dark', // dark, light, custom
            maxWidth: 200,
            ...options
        };

        this.tooltipElement = null;
        this.isVisible = false;
        this.showTimer = null;
        this.hideTimer = null;
        this.isHovered = false;

        this.init();
    }

    // 初始化组件
    init() {
        if (!this.element) {
            throw new Error('Tooltip: 目标元素未找到');
        }

        // 从元素属性获取内容
        if (!this.options.content) {
            this.options.content = this.element.getAttribute('title') || 
                                   this.element.getAttribute('data-tooltip') || '';
        }

        // 移除原生title属性避免冲突
        if (this.element.hasAttribute('title')) {
            this.element.setAttribute('data-original-title', this.element.getAttribute('title'));
            this.element.removeAttribute('title');
        }

        this.addStyles();
        this.bindEvents();
    }

    // 绑定事件
    bindEvents() {
        switch (this.options.trigger) {
            case 'hover':
                this.element.addEventListener('mouseenter', () => this.handleMouseEnter());
                this.element.addEventListener('mouseleave', () => this.handleMouseLeave());
                break;

            case 'click':
                this.element.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggle();
                });
                // 点击其他地方隐藏
                document.addEventListener('click', (e) => {
                    if (!this.element.contains(e.target) && !this.tooltipElement?.contains(e.target)) {
                        this.hide();
                    }
                });
                break;

            case 'focus':
                this.element.addEventListener('focus', () => this.show());
                this.element.addEventListener('blur', () => this.hide());
                break;

            case 'manual':
                // 手动控制，不绑定事件
                break;
        }
    }

    // 处理鼠标进入
    handleMouseEnter() {
        this.isHovered = true;
        this.clearHideTimer();
        
        if (this.options.delay.show > 0) {
            this.showTimer = setTimeout(() => {
                if (this.isHovered) {
                    this.show();
                }
            }, this.options.delay.show);
        } else {
            this.show();
        }
    }

    // 处理鼠标离开
    handleMouseLeave() {
        this.isHovered = false;
        this.clearShowTimer();
        
        if (this.options.delay.hide > 0) {
            this.hideTimer = setTimeout(() => {
                if (!this.isHovered) {
                    this.hide();
                }
            }, this.options.delay.hide);
        } else {
            this.hide();
        }
    }

    // 清除显示定时器
    clearShowTimer() {
        if (this.showTimer) {
            clearTimeout(this.showTimer);
            this.showTimer = null;
        }
    }

    // 清除隐藏定时器
    clearHideTimer() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }

    // 创建提示框元素
    createTooltip() {
        if (this.tooltipElement) {
            return;
        }

        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = `tooltip ${this.options.theme} ${this.options.placement}`;
        this.tooltipElement.setAttribute('role', 'tooltip');
        
        if (this.options.animation) {
            this.tooltipElement.classList.add('fade');
        }

        // 设置最大宽度
        this.tooltipElement.style.maxWidth = `${this.options.maxWidth}px`;

        const arrowHtml = this.options.arrow ? '<div class="tooltip-arrow"></div>' : '';
        
        if (this.options.template) {
            this.tooltipElement.innerHTML = this.options.template;
        } else {
            this.tooltipElement.innerHTML = `
                ${arrowHtml}
                <div class="tooltip-inner">
                    ${this.options.html ? this.options.content : this.escapeHtml(this.options.content)}
                </div>
            `;
        }

        // 添加到容器
        const container = this.options.container === 'body' 
            ? document.body 
            : document.querySelector(this.options.container);
        
        if (container) {
            container.appendChild(this.tooltipElement);
        }

        // 绑定提示框事件（用于hover触发时保持显示）
        if (this.options.trigger === 'hover') {
            this.tooltipElement.addEventListener('mouseenter', () => {
                this.isHovered = true;
                this.clearHideTimer();
            });
            
            this.tooltipElement.addEventListener('mouseleave', () => {
                this.isHovered = false;
                this.handleMouseLeave();
            });
        }
    }

    // 显示提示框
    show() {
        if (this.isVisible || !this.options.content) {
            return;
        }

        this.createTooltip();
        this.updatePosition();

        // 显示提示框
        this.tooltipElement.style.display = 'block';
        
        if (this.options.animation) {
            // 强制重排以确保动画效果
            this.tooltipElement.offsetHeight;
            this.tooltipElement.classList.add('show');
        }

        this.isVisible = true;

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('tooltip.shown', {
                element: this.element,
                tooltip: this.tooltipElement,
                content: this.options.content
            });
        }
    }

    // 隐藏提示框
    hide() {
        if (!this.isVisible || !this.tooltipElement) {
            return;
        }

        if (this.options.animation) {
            this.tooltipElement.classList.remove('show');
            
            setTimeout(() => {
                if (this.tooltipElement) {
                    this.tooltipElement.style.display = 'none';
                }
            }, 150);
        } else {
            this.tooltipElement.style.display = 'none';
        }

        this.isVisible = false;

        // 发送事件
        if (window.eventBus) {
            window.eventBus.emit('tooltip.hidden', {
                element: this.element,
                tooltip: this.tooltipElement,
                content: this.options.content
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

    // 更新位置
    updatePosition() {
        if (!this.tooltipElement || !this.isVisible) {
            return;
        }

        const elementRect = this.element.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollTop = window.pageYOffset;
        const scrollLeft = window.pageXOffset;

        let placement = this.options.placement;

        // 自动调整位置
        if (placement === 'auto') {
            placement = this.getOptimalPlacement(elementRect, tooltipRect, viewportWidth, viewportHeight);
        }

        const position = this.calculatePosition(elementRect, tooltipRect, placement);

        // 应用位置
        this.tooltipElement.style.position = 'absolute';
        this.tooltipElement.style.top = `${position.top + scrollTop}px`;
        this.tooltipElement.style.left = `${position.left + scrollLeft}px`;

        // 更新箭头位置
        this.updateArrowPosition(placement, elementRect, tooltipRect, position);

        // 更新类名
        this.tooltipElement.className = this.tooltipElement.className.replace(
            /\b(top|bottom|left|right)\b/g, 
            placement
        );
    }

    // 获取最佳位置
    getOptimalPlacement(elementRect, tooltipRect, viewportWidth, viewportHeight) {
        const spaceTop = elementRect.top;
        const spaceBottom = viewportHeight - elementRect.bottom;
        const spaceLeft = elementRect.left;
        const spaceRight = viewportWidth - elementRect.right;

        // 优先级：top > bottom > right > left
        if (spaceTop >= tooltipRect.height + this.options.offset) {
            return 'top';
        } else if (spaceBottom >= tooltipRect.height + this.options.offset) {
            return 'bottom';
        } else if (spaceRight >= tooltipRect.width + this.options.offset) {
            return 'right';
        } else if (spaceLeft >= tooltipRect.width + this.options.offset) {
            return 'left';
        } else {
            return 'top'; // 默认
        }
    }

    // 计算位置
    calculatePosition(elementRect, tooltipRect, placement) {
        const offset = this.options.offset;
        let top, left;

        switch (placement) {
            case 'top':
                top = elementRect.top - tooltipRect.height - offset;
                left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
                break;

            case 'bottom':
                top = elementRect.bottom + offset;
                left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
                break;

            case 'left':
                top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
                left = elementRect.left - tooltipRect.width - offset;
                break;

            case 'right':
                top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
                left = elementRect.right + offset;
                break;

            default:
                top = elementRect.top - tooltipRect.height - offset;
                left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
        }

        // 边界检查
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (left < 0) {
            left = 5;
        } else if (left + tooltipRect.width > viewportWidth) {
            left = viewportWidth - tooltipRect.width - 5;
        }

        if (top < 0) {
            top = 5;
        } else if (top + tooltipRect.height > viewportHeight) {
            top = viewportHeight - tooltipRect.height - 5;
        }

        return { top, left };
    }

    // 更新箭头位置
    updateArrowPosition(placement, elementRect, tooltipRect, position) {
        const arrow = this.tooltipElement.querySelector('.tooltip-arrow');
        if (!arrow) return;

        // 重置箭头样式
        arrow.style.top = '';
        arrow.style.left = '';
        arrow.style.right = '';
        arrow.style.bottom = '';

        const arrowSize = 5; // 箭头大小

        switch (placement) {
            case 'top':
            case 'bottom':
                const elementCenterX = elementRect.left + elementRect.width / 2;
                const tooltipLeft = position.left;
                const arrowLeft = elementCenterX - tooltipLeft - arrowSize;
                arrow.style.left = `${Math.max(arrowSize, Math.min(arrowLeft, tooltipRect.width - arrowSize * 2))}px`;
                break;

            case 'left':
            case 'right':
                const elementCenterY = elementRect.top + elementRect.height / 2;
                const tooltipTop = position.top;
                const arrowTop = elementCenterY - tooltipTop - arrowSize;
                arrow.style.top = `${Math.max(arrowSize, Math.min(arrowTop, tooltipRect.height - arrowSize * 2))}px`;
                break;
        }
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 设置内容
    setContent(content) {
        this.options.content = content;
        
        if (this.tooltipElement) {
            const inner = this.tooltipElement.querySelector('.tooltip-inner');
            if (inner) {
                inner.innerHTML = this.options.html ? content : this.escapeHtml(content);
            }
        }
    }

    // 添加样式
    addStyles() {
        if (document.getElementById('tooltip-styles')) return;

        const style = document.createElement('style');
        style.id = 'tooltip-styles';
        style.textContent = `
            .tooltip {
                position: absolute;
                z-index: 1070;
                display: block;
                font-family: 'Segoe UI', sans-serif;
                font-size: 0.875rem;
                font-weight: 400;
                line-height: 1.5;
                text-align: left;
                text-decoration: none;
                text-shadow: none;
                text-transform: none;
                letter-spacing: normal;
                word-break: normal;
                word-spacing: normal;
                white-space: normal;
                line-break: auto;
                opacity: 0;
                pointer-events: none;
            }
            
            .tooltip.fade {
                transition: opacity 0.15s linear;
            }
            
            .tooltip.show {
                opacity: 1;
                pointer-events: auto;
            }
            
            .tooltip-inner {
                max-width: 200px;
                padding: 0.5rem 0.75rem;
                text-align: center;
                border-radius: 0.375rem;
                word-wrap: break-word;
            }
            
            .tooltip-arrow {
                position: absolute;
                display: block;
                width: 0;
                height: 0;
            }
            
            /* 暗色主题 */
            .tooltip.dark .tooltip-inner {
                color: #fff;
                background-color: #000;
                background-color: rgba(0, 0, 0, 0.9);
            }
            
            .tooltip.dark.top .tooltip-arrow {
                bottom: -5px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 5px solid rgba(0, 0, 0, 0.9);
            }
            
            .tooltip.dark.bottom .tooltip-arrow {
                top: -5px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-bottom: 5px solid rgba(0, 0, 0, 0.9);
            }
            
            .tooltip.dark.left .tooltip-arrow {
                right: -5px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-left: 5px solid rgba(0, 0, 0, 0.9);
            }
            
            .tooltip.dark.right .tooltip-arrow {
                left: -5px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-right: 5px solid rgba(0, 0, 0, 0.9);
            }
            
            /* 亮色主题 */
            .tooltip.light .tooltip-inner {
                color: #333;
                background-color: #fff;
                border: 1px solid #ccc;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            
            .tooltip.light.top .tooltip-arrow {
                bottom: -6px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 5px solid #ccc;
            }
            
            .tooltip.light.top .tooltip-arrow::after {
                content: '';
                position: absolute;
                top: -6px;
                left: -5px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 5px solid #fff;
            }
            
            .tooltip.light.bottom .tooltip-arrow {
                top: -6px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-bottom: 5px solid #ccc;
            }
            
            .tooltip.light.bottom .tooltip-arrow::after {
                content: '';
                position: absolute;
                bottom: -6px;
                left: -5px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-bottom: 5px solid #fff;
            }
            
            .tooltip.light.left .tooltip-arrow {
                right: -6px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-left: 5px solid #ccc;
            }
            
            .tooltip.light.left .tooltip-arrow::after {
                content: '';
                position: absolute;
                left: -6px;
                top: -5px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-left: 5px solid #fff;
            }
            
            .tooltip.light.right .tooltip-arrow {
                left: -6px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-right: 5px solid #ccc;
            }
            
            .tooltip.light.right .tooltip-arrow::after {
                content: '';
                position: absolute;
                right: -6px;
                top: -5px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-right: 5px solid #fff;
            }
        `;
        
        document.head.appendChild(style);
    }

    // 销毁提示框
    destroy() {
        this.clearShowTimer();
        this.clearHideTimer();
        
        if (this.tooltipElement && this.tooltipElement.parentNode) {
            this.tooltipElement.parentNode.removeChild(this.tooltipElement);
        }
        
        // 恢复原始title属性
        const originalTitle = this.element.getAttribute('data-original-title');
        if (originalTitle) {
            this.element.setAttribute('title', originalTitle);
            this.element.removeAttribute('data-original-title');
        }
        
        this.tooltipElement = null;
        this.isVisible = false;
    }

    // 静态方法：为元素添加提示框
    static init(selector, options = {}) {
        const elements = typeof selector === 'string' 
            ? document.querySelectorAll(selector)
            : [selector];
        
        const tooltips = [];
        
        elements.forEach(element => {
            if (element && !element._tooltip) {
                const tooltip = new Tooltip(element, options);
                element._tooltip = tooltip;
                tooltips.push(tooltip);
            }
        });
        
        return tooltips.length === 1 ? tooltips[0] : tooltips;
    }

    // 静态方法：销毁元素的提示框
    static destroy(selector) {
        const elements = typeof selector === 'string' 
            ? document.querySelectorAll(selector)
            : [selector];
        
        elements.forEach(element => {
            if (element && element._tooltip) {
                element._tooltip.destroy();
                delete element._tooltip;
            }
        });
    }

    // 静态方法：更新所有提示框位置
    static updateAll() {
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            if (element._tooltip) {
                element._tooltip.updatePosition();
            }
        });
    }
}

// 自动初始化带有data-tooltip属性的元素
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('[data-tooltip]');
    elements.forEach(element => {
        if (!element._tooltip) {
            const options = {
                content: element.getAttribute('data-tooltip'),
                placement: element.getAttribute('data-placement') || 'top',
                trigger: element.getAttribute('data-trigger') || 'hover',
                theme: element.getAttribute('data-theme') || 'dark'
            };
            
            element._tooltip = new Tooltip(element, options);
        }
    });
});

// 窗口大小变化时更新位置
window.addEventListener('resize', () => {
    Tooltip.updateAll();
});

// 导出组件
window.Tooltip = Tooltip;