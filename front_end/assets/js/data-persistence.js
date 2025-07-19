/**
 * 简单的数据持久化解决方案
 * 使用localStorage和sessionStorage
 */
class DataPersistence {
    constructor() {
        this.prefix = 'daplot_';
        this.maxSize = 5 * 1024 * 1024; // 5MB限制
    }

    // 保存文件数据
    saveFileData(fileId, data) {
        try {
            const key = this.prefix + 'file_' + fileId;
            const dataStr = JSON.stringify({
                data: data,
                timestamp: Date.now(),
                version: '1.0'
            });
            
            // 检查大小限制
            if (dataStr.length > this.maxSize) {
                console.warn('数据过大，无法保存到本地存储');
                return false;
            }
            
            localStorage.setItem(key, dataStr);
            
            // 更新文件列表
            this.updateFileList(fileId, {
                id: fileId,
                timestamp: Date.now(),
                size: dataStr.length
            });
            
            return true;
        } catch (error) {
            console.error('保存文件数据失败:', error);
            return false;
        }
    }

    // 获取文件数据
    getFileData(fileId) {
        try {
            const key = this.prefix + 'file_' + fileId;
            const dataStr = localStorage.getItem(key);
            
            if (!dataStr) {
                return null;
            }
            
            const parsed = JSON.parse(dataStr);
            return parsed.data;
        } catch (error) {
            console.error('获取文件数据失败:', error);
            return null;
        }
    }

    // 删除文件数据
    deleteFileData(fileId) {
        try {
            const key = this.prefix + 'file_' + fileId;
            localStorage.removeItem(key);
            
            // 更新文件列表
            const fileList = this.getFileList();
            const updatedList = fileList.filter(f => f.id !== fileId);
            localStorage.setItem(this.prefix + 'file_list', JSON.stringify(updatedList));
            
            return true;
        } catch (error) {
            console.error('删除文件数据失败:', error);
            return false;
        }
    }

    // 获取文件列表
    getFileList() {
        try {
            const listStr = localStorage.getItem(this.prefix + 'file_list');
            return listStr ? JSON.parse(listStr) : [];
        } catch (error) {
            console.error('获取文件列表失败:', error);
            return [];
        }
    }

    // 更新文件列表
    updateFileList(fileId, fileInfo) {
        try {
            const fileList = this.getFileList();
            const existingIndex = fileList.findIndex(f => f.id === fileId);
            
            if (existingIndex >= 0) {
                fileList[existingIndex] = fileInfo;
            } else {
                fileList.push(fileInfo);
            }
            
            localStorage.setItem(this.prefix + 'file_list', JSON.stringify(fileList));
        } catch (error) {
            console.error('更新文件列表失败:', error);
        }
    }

    // 清理过期数据
    cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 默认7天
        try {
            const fileList = this.getFileList();
            const now = Date.now();
            const validFiles = [];
            
            fileList.forEach(file => {
                if (now - file.timestamp < maxAge) {
                    validFiles.push(file);
                } else {
                    this.deleteFileData(file.id);
                }
            });
            
            localStorage.setItem(this.prefix + 'file_list', JSON.stringify(validFiles));
        } catch (error) {
            console.error('清理数据失败:', error);
        }
    }

    // 获取存储使用情况
    getStorageInfo() {
        try {
            let totalSize = 0;
            const fileList = this.getFileList();
            
            fileList.forEach(file => {
                totalSize += file.size || 0;
            });
            
            return {
                fileCount: fileList.length,
                totalSize: totalSize,
                maxSize: this.maxSize,
                usage: (totalSize / this.maxSize * 100).toFixed(2) + '%'
            };
        } catch (error) {
            console.error('获取存储信息失败:', error);
            return null;
        }
    }
}

// 全局实例
window.dataPersistence = new DataPersistence();

// 页面卸载时清理过期数据
window.addEventListener('beforeunload', () => {
    window.dataPersistence.cleanup();
});