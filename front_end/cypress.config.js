const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // 基础配置
    baseUrl: 'http://localhost:8080',
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // 测试文件配置
    specPattern: 'tests/e2e/**/*.cy.js',
    supportFile: 'tests/e2e/support/e2e.js',
    fixturesFolder: 'tests/e2e/fixtures',
    screenshotsFolder: 'tests/e2e/screenshots',
    videosFolder: 'tests/e2e/videos',
    
    // 超时配置
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    // 重试配置
    retries: {
      runMode: 2,
      openMode: 0
    },
    
    // 视频和截图配置
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    
    // 浏览器配置
    chromeWebSecurity: false,
    
    // 环境变量
    env: {
      apiUrl: 'http://localhost:8000',
      testDataPath: 'tests/e2e/fixtures'
    },
    
    setupNodeEvents(on, config) {
      // 任务配置
      on('task', {
        // 清理测试数据
        clearTestData() {
          // 实现清理逻辑
          return null;
        },
        
        // 生成测试文件
        generateTestFile(options) {
          const fs = require('fs');
          const path = require('path');
          
          const filePath = path.join(__dirname, 'tests/e2e/fixtures', options.filename);
          fs.writeFileSync(filePath, options.content);
          
          return filePath;
        },
        
        // 检查文件是否存在
        fileExists(filePath) {
          const fs = require('fs');
          return fs.existsSync(filePath);
        }
      });
      
      // 浏览器启动配置
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.name === 'chrome') {
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--disable-gpu');
        }
        
        return launchOptions;
      });
      
      return config;
    }
  },
  
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
    specPattern: 'tests/component/**/*.cy.js'
  }
});