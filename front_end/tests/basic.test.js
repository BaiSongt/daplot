// 基础测试验证
describe('基础测试环境', () => {
  test('Jest环境正常工作', () => {
    expect(1 + 1).toBe(2);
  });

  test('可以使用模拟函数', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  test('可以访问DOM', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello World';
    expect(div.textContent).toBe('Hello World');
  });

  test('可以使用异步测试', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });

  test('localStorage模拟正常工作', () => {
    // 清除之前的调用记录
    localStorage.setItem.mockClear();
    localStorage.getItem.mockClear();
    
    // 设置模拟返回值
    localStorage.getItem.mockReturnValue('value');
    
    localStorage.setItem('test', 'value');
    const result = localStorage.getItem('test');
    
    expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value');
    expect(result).toBe('value');
  });
});