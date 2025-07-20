/**
 * API客户端模块
 * 统一的HTTP请求封装，支持重试、超时、拦截器等功能
 */
class ApiClient {
    constructor(baseURL = '', options = {}) {
        this.baseURL = baseURL;
        this.defaultOptions = {
            timeout: 10000,
            retries: 3,
            retryDelay: 1000,
            headers: {
                'Content-Type': 'application/json'
            },
            ...options
        };
        this.interceptors = {
            request: [],
            response: []
        };
    }

    // 添加请求拦截器
    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
    }

    // 添加响应拦截器
    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
    }

    // 应用请求拦截器
    async applyRequestInterceptors(config) {
        let finalConfig = { ...config };
        for (const interceptor of this.interceptors.request) {
            finalConfig = await interceptor(finalConfig);
        }
        return finalConfig;
    }

    // 应用响应拦截器
    async applyResponseInterceptors(response) {
        let finalResponse = response;
        for (const interceptor of this.interceptors.response) {
            finalResponse = await interceptor(finalResponse);
        }
        return finalResponse;
    }

    // 设置基础URL
    setBaseURL(baseURL) {
        this.baseURL = baseURL;
    }

    // 构建完整URL
    buildURL(url) {
        if (url.startsWith('http')) {
            return url;
        }
        // 如果没有设置baseURL，使用默认值
        const base = this.baseURL || 'http://localhost:8001';
        return `${base}${url.startsWith('/') ? url : '/' + url}`;
    }

    // 创建AbortController用于取消请求
    createAbortController(timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);
        
        return { controller, timeoutId };
    }

    // 核心请求方法
    async request(url, options = {}) {
        // 特殊处理FormData请求，不设置默认的Content-Type
        const isFormData = options.body instanceof FormData;
        
        const config = {
            ...this.defaultOptions,
            ...options,
            headers: isFormData ? 
                { ...options.headers } : // FormData请求不使用默认headers
                {
                    ...this.defaultOptions.headers,
                    ...options.headers
                }
        };

        // 应用请求拦截器
        const finalConfig = await this.applyRequestInterceptors(config);
        
        const fullURL = this.buildURL(url);
        const { controller, timeoutId } = this.createAbortController(finalConfig.timeout);

        let lastError;
        
        // 重试机制
        for (let attempt = 0; attempt <= finalConfig.retries; attempt++) {
            try {
                const response = await fetch(fullURL, {
                    ...finalConfig,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // 检查HTTP状态
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // 应用响应拦截器
                const finalResponse = await this.applyResponseInterceptors(response);
                
                // 解析响应数据
                const contentType = finalResponse.headers.get('content-type');
                let data;
                
                if (contentType && contentType.includes('application/json')) {
                    data = await finalResponse.json();
                } else if (contentType && contentType.includes('text/')) {
                    data = await finalResponse.text();
                } else {
                    data = await finalResponse.blob();
                }

                return {
                    data,
                    status: finalResponse.status,
                    statusText: finalResponse.statusText,
                    headers: finalResponse.headers
                };

            } catch (error) {
                lastError = error;
                clearTimeout(timeoutId);

                // 如果是最后一次尝试，抛出错误
                if (attempt === finalConfig.retries) {
                    break;
                }

                // 等待重试延迟
                if (finalConfig.retryDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay));
                }

                console.warn(`请求失败，正在重试 (${attempt + 1}/${finalConfig.retries}):`, error.message);
            }
        }

        // 抛出最后的错误
        throw new Error(`请求失败: ${lastError.message}`);
    }

    // GET请求
    async get(url, options = {}) {
        return this.request(url, {
            ...options,
            method: 'GET'
        });
    }

    // POST请求
    async post(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data)
        });
    }

    // PUT请求
    async put(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE请求
    async delete(url, options = {}) {
        return this.request(url, {
            ...options,
            method: 'DELETE'
        });
    }

    // 文件上传
    async upload(url, file, options = {}) {
        console.log('🔄 ApiClient.upload 开始');
        console.log('📁 文件信息:', {
            name: file?.name,
            size: file?.size,
            type: file?.type,
            lastModified: file?.lastModified
        });
        
        if (!file) {
            throw new Error('文件对象为空');
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('📦 FormData 内容:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value);
        }

        // 添加额外的表单字段
        if (options.fields) {
            Object.entries(options.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        // 创建新的headers对象，排除Content-Type
        const headers = { ...options.headers };
        delete headers['Content-Type']; // 让浏览器自动设置multipart/form-data
        delete headers['content-type']; // 确保删除小写版本

        console.log('🌐 请求头:', headers);
        console.log('🚀 发送上传请求到:', this.buildURL(url));

        return this.request(url, {
            ...options,
            method: 'POST',
            body: formData,
            headers: headers
        });
    }

    // 下载文件
    async download(url, filename, options = {}) {
        try {
            const response = await this.request(url, {
                ...options,
                method: 'GET'
            });

            // 创建下载链接
            const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL对象
            window.URL.revokeObjectURL(downloadUrl);
            
            return true;
        } catch (error) {
            console.error('文件下载失败:', error);
            throw error;
        }
    }
}

// 创建默认实例
const apiClient = new ApiClient('http://localhost:8001');

// 添加默认的请求拦截器
apiClient.addRequestInterceptor(async (config) => {
    // 添加时间戳防止缓存
    if (config.method === 'GET') {
        const url = new URL(config.url || '', window.location.origin);
        url.searchParams.set('_t', Date.now().toString());
        config.url = url.toString();
    }
    
    console.log(`🌐 发起请求: ${config.method} ${config.url}`);
    return config;
});

// 添加默认的响应拦截器
apiClient.addResponseInterceptor(async (response) => {
    console.log(`✅ 请求完成: ${response.status} ${response.statusText}`);
    return response;
});

// 导出类和全局实例
window.ApiClient = ApiClient;
window.apiClient = apiClient;