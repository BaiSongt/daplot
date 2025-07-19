/**
 * 数据验证工具库
 * 提供常用的数据验证函数
 */

// 基础类型验证
export const isString = (value) => typeof value === 'string';
export const isNumber = (value) => typeof value === 'number' && !isNaN(value);
export const isBoolean = (value) => typeof value === 'boolean';
export const isArray = (value) => Array.isArray(value);
export const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isFunction = (value) => typeof value === 'function';
export const isNull = (value) => value === null;
export const isUndefined = (value) => value === undefined;
export const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

// 数值验证
export const isInteger = (value) => Number.isInteger(value);
export const isPositive = (value) => isNumber(value) && value > 0;
export const isNegative = (value) => isNumber(value) && value < 0;
export const isInRange = (value, min, max) => isNumber(value) && value >= min && value <= max;

// 字符串验证
export const isEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return isString(value) && emailRegex.test(value);
};

export const isUrl = (value) => {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

export const isPhoneNumber = (value) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return isString(value) && phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
};

export const hasMinLength = (value, minLength) => {
    return isString(value) && value.length >= minLength;
};

export const hasMaxLength = (value, maxLength) => {
    return isString(value) && value.length <= maxLength;
};

export const matchesPattern = (value, pattern) => {
    const regex = new RegExp(pattern);
    return isString(value) && regex.test(value);
};

// 数组验证
export const hasMinItems = (value, minItems) => {
    return isArray(value) && value.length >= minItems;
};

export const hasMaxItems = (value, maxItems) => {
    return isArray(value) && value.length <= maxItems;
};

export const allItemsMatch = (value, validator) => {
    return isArray(value) && value.every(validator);
};

// 对象验证
export const hasProperty = (obj, property) => {
    return isObject(obj) && obj.hasOwnProperty(property);
};

export const hasProperties = (obj, properties) => {
    return isObject(obj) && properties.every(prop => obj.hasOwnProperty(prop));
};

// 文件验证
export const isValidFileType = (file, allowedTypes) => {
    if (!file || !file.type) return false;
    return allowedTypes.includes(file.type);
};

export const isValidFileSize = (file, maxSize) => {
    if (!file || !file.size) return false;
    return file.size <= maxSize;
};

export const isExcelFile = (file) => {
    const excelTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    return isValidFileType(file, excelTypes);
};

// 数据格式验证
export const isValidJSON = (value) => {
    try {
        JSON.parse(value);
        return true;
    } catch {
        return false;
    }
};

export const isValidDate = (value) => {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date);
};

export const isValidColor = (value) => {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return isString(value) && (colorRegex.test(value) || CSS.supports('color', value));
};

// 复合验证器
export const createValidator = (rules) => {
    return (value) => {
        for (const rule of rules) {
            if (typeof rule === 'function') {
                if (!rule(value)) return false;
            } else if (typeof rule === 'object') {
                const { validator, message } = rule;
                if (!validator(value)) {
                    throw new Error(message || 'Validation failed');
                }
            }
        }
        return true;
    };
};

export const createObjectValidator = (schema) => {
    return (obj) => {
        if (!isObject(obj)) return false;
        
        for (const [key, validator] of Object.entries(schema)) {
            const value = obj[key];
            
            if (typeof validator === 'function') {
                if (!validator(value)) return false;
            } else if (typeof validator === 'object') {
                const { required = false, validator: validatorFn, message } = validator;
                
                if (required && (value === undefined || value === null)) {
                    throw new Error(message || `${key} is required`);
                }
                
                if (value !== undefined && value !== null && validatorFn && !validatorFn(value)) {
                    throw new Error(message || `${key} validation failed`);
                }
            }
        }
        
        return true;
    };
};

// 异步验证器
export const createAsyncValidator = (asyncValidatorFn) => {
    return async (value) => {
        try {
            return await asyncValidatorFn(value);
        } catch (error) {
            console.error('Async validation error:', error);
            return false;
        }
    };
};

// 验证结果类
export class ValidationResult {
    constructor(isValid = true, errors = []) {
        this.isValid = isValid;
        this.errors = errors;
    }

    addError(error) {
        this.errors.push(error);
        this.isValid = false;
    }

    hasErrors() {
        return this.errors.length > 0;
    }

    getFirstError() {
        return this.errors[0] || null;
    }

    getAllErrors() {
        return [...this.errors];
    }
}

// 表单验证器
export class FormValidator {
    constructor(schema) {
        this.schema = schema;
    }

    validate(data) {
        const result = new ValidationResult();

        for (const [field, rules] of Object.entries(this.schema)) {
            const value = data[field];
            
            try {
                if (Array.isArray(rules)) {
                    for (const rule of rules) {
                        if (typeof rule === 'function' && !rule(value)) {
                            result.addError(`${field} validation failed`);
                            break;
                        }
                    }
                } else if (typeof rules === 'function') {
                    if (!rules(value)) {
                        result.addError(`${field} validation failed`);
                    }
                } else if (typeof rules === 'object') {
                    const { required, validator, message } = rules;
                    
                    if (required && isEmpty(value)) {
                        result.addError(message || `${field} is required`);
                        continue;
                    }
                    
                    if (!isEmpty(value) && validator && !validator(value)) {
                        result.addError(message || `${field} validation failed`);
                    }
                }
            } catch (error) {
                result.addError(error.message);
            }
        }

        return result;
    }

    async validateAsync(data) {
        const result = new ValidationResult();

        for (const [field, rules] of Object.entries(this.schema)) {
            const value = data[field];
            
            try {
                if (Array.isArray(rules)) {
                    for (const rule of rules) {
                        if (typeof rule === 'function') {
                            const isValid = await Promise.resolve(rule(value));
                            if (!isValid) {
                                result.addError(`${field} validation failed`);
                                break;
                            }
                        }
                    }
                } else if (typeof rules === 'function') {
                    const isValid = await Promise.resolve(rules(value));
                    if (!isValid) {
                        result.addError(`${field} validation failed`);
                    }
                }
            } catch (error) {
                result.addError(error.message);
            }
        }

        return result;
    }
}

// 常用验证规则预设
export const commonRules = {
    required: (value) => !isEmpty(value),
    email: isEmail,
    url: isUrl,
    phone: isPhoneNumber,
    positiveNumber: isPositive,
    integer: isInteger,
    minLength: (min) => (value) => hasMinLength(value, min),
    maxLength: (max) => (value) => hasMaxLength(value, max),
    range: (min, max) => (value) => isInRange(value, min, max),
    pattern: (regex) => (value) => matchesPattern(value, regex),
    fileType: (types) => (file) => isValidFileType(file, types),
    fileSize: (maxSize) => (file) => isValidFileSize(file, maxSize)
};

// 默认导出
export default {
    // 基础验证
    isString, isNumber, isBoolean, isArray, isObject, isFunction,
    isNull, isUndefined, isEmpty,
    
    // 数值验证
    isInteger, isPositive, isNegative, isInRange,
    
    // 字符串验证
    isEmail, isUrl, isPhoneNumber, hasMinLength, hasMaxLength, matchesPattern,
    
    // 数组验证
    hasMinItems, hasMaxItems, allItemsMatch,
    
    // 对象验证
    hasProperty, hasProperties,
    
    // 文件验证
    isValidFileType, isValidFileSize, isExcelFile,
    
    // 数据格式验证
    isValidJSON, isValidDate, isValidColor,
    
    // 复合验证器
    createValidator, createObjectValidator, createAsyncValidator,
    
    // 验证结果和表单验证器
    ValidationResult, FormValidator,
    
    // 常用规则
    commonRules
};