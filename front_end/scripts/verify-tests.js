#!/usr/bin/env node

// 测试验证脚本
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${filePath}`, 'red');
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, '..', dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  
  if (exists) {
    const files = fs.readdirSync(fullPath);
    log(`✅ ${description}: ${dirPath} (${files.length} files)`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${dirPath}`, 'red');
    return false;
  }
}

function verifyTestSetup() {
  log('\n🔍 验证测试设置...', 'cyan');
  
  let allGood = true;
  
  // 检查配置文件
  log('\n📋 配置文件检查:', 'blue');
  allGood &= checkFile('package.json', 'Package配置');
  allGood &= checkFile('jest.config.js', 'Jest配置');
  allGood &= checkFile('cypress.config.js', 'Cypress配置');
  
  // 检查测试目录结构
  log('\n📁 测试目录结构检查:', 'blue');
  allGood &= checkDirectory('tests', '测试根目录');
  allGood &= checkDirectory('tests/unit', '单元测试目录');
  allGood &= checkDirectory('tests/integration', '集成测试目录');
  allGood &= checkDirectory('tests/e2e', '端到端测试目录');
  allGood &= checkDirectory('tests/fixtures', '测试数据目录');
  
  // 检查测试文件
  log('\n🧪 测试文件检查:', 'blue');
  allGood &= checkFile('tests/setup.js', '测试设置文件');
  allGood &= checkFile('tests/jest-setup.js', 'Jest设置文件');
  allGood &= checkFile('tests/fixtures/test-data.js', '测试数据文件');
  
  // 检查单元测试文件
  log('\n🔬 单元测试文件检查:', 'blue');
  allGood &= checkFile('tests/unit/core/test_AppState.js', 'AppState测试');
  allGood &= checkFile('tests/unit/core/test_DataManager.js', 'DataManager测试');
  allGood &= checkFile('tests/unit/core/test_ApiClient.js', 'ApiClient测试');
  allGood &= checkFile('tests/unit/components/test_FileSelector.js', 'FileSelector测试');
  
  // 检查集成测试文件
  log('\n🔗 集成测试文件检查:', 'blue');
  allGood &= checkFile('tests/integration/test_data_flow.js', '数据流集成测试');
  
  // 检查端到端测试文件
  log('\n🌐 端到端测试文件检查:', 'blue');
  allGood &= checkFile('tests/e2e/visualization.cy.js', '可视化页面E2E测试');
  allGood &= checkFile('tests/e2e/support/e2e.js', 'E2E支持文件');
  allGood &= checkFile('tests/e2e/support/commands.js', 'E2E命令文件');
  
  // 检查脚本文件
  log('\n📜 脚本文件检查:', 'blue');
  allGood &= checkFile('scripts/run-tests.js', '测试运行脚本');
  
  // 检查CI配置
  log('\n🚀 CI配置检查:', 'blue');
  allGood &= checkFile('../.github/workflows/test.yml', 'GitHub Actions配置');
  
  // 验证package.json中的脚本
  log('\n📦 Package.json脚本检查:', 'blue');
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
      'test', 'test:unit', 'test:integration', 'test:e2e', 
      'test:coverage', 'test:ci', 'lint'
    ];
    
    requiredScripts.forEach(script => {
      if (scripts[script]) {
        log(`✅ 脚本存在: ${script}`, 'green');
      } else {
        log(`❌ 脚本缺失: ${script}`, 'red');
        allGood = false;
      }
    });
  } catch (error) {
    log(`❌ 无法读取package.json: ${error.message}`, 'red');
    allGood = false;
  }
  
  // 验证依赖
  log('\n📚 依赖检查:', 'blue');
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const devDeps = packageJson.devDependencies || {};
    
    const requiredDeps = [
      'jest', 'cypress', '@testing-library/jest-dom', 
      'babel-jest', 'jest-environment-jsdom'
    ];
    
    requiredDeps.forEach(dep => {
      if (devDeps[dep]) {
        log(`✅ 依赖存在: ${dep}`, 'green');
      } else {
        log(`❌ 依赖缺失: ${dep}`, 'red');
        allGood = false;
      }
    });
  } catch (error) {
    log(`❌ 无法检查依赖: ${error.message}`, 'red');
    allGood = false;
  }
  
  // 总结
  log('\n📊 验证结果:', 'cyan');
  if (allGood) {
    log('🎉 所有测试设置验证通过！', 'green');
    log('✨ 测试环境已准备就绪，可以开始运行测试。', 'green');
  } else {
    log('⚠️  测试设置存在问题，请检查上述错误。', 'yellow');
  }
  
  return allGood;
}

function generateTestSummary() {
  log('\n📈 测试覆盖范围总结:', 'cyan');
  
  const testCategories = [
    {
      name: '单元测试',
      files: [
        'tests/unit/core/test_AppState.js',
        'tests/unit/core/test_DataManager.js',
        'tests/unit/core/test_ApiClient.js',
        'tests/unit/components/test_FileSelector.js'
      ]
    },
    {
      name: '集成测试',
      files: [
        'tests/integration/test_data_flow.js'
      ]
    },
    {
      name: '端到端测试',
      files: [
        'tests/e2e/visualization.cy.js'
      ]
    }
  ];
  
  testCategories.forEach(category => {
    log(`\n${category.name}:`, 'blue');
    category.files.forEach(file => {
      const exists = fs.existsSync(path.join(__dirname, '..', file));
      const status = exists ? '✅' : '❌';
      log(`  ${status} ${path.basename(file)}`, exists ? 'green' : 'red');
    });
  });
  
  // 统计测试文件数量
  const testDirs = ['tests/unit', 'tests/integration', 'tests/e2e'];
  let totalTestFiles = 0;
  
  testDirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullPath)) {
      const files = getAllTestFiles(fullPath);
      totalTestFiles += files.length;
    }
  });
  
  log(`\n📊 测试文件统计:`, 'cyan');
  log(`总计测试文件: ${totalTestFiles}`, 'blue');
}

function getAllTestFiles(dir) {
  let files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files = files.concat(getAllTestFiles(fullPath));
      } else if (item.endsWith('.js') && (item.includes('test') || item.includes('spec'))) {
        files.push(fullPath);
      }
    });
  } catch (error) {
    // 忽略读取错误
  }
  
  return files;
}

function main() {
  log('🧪 DaPlot 测试设置验证工具', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const isValid = verifyTestSetup();
  generateTestSummary();
  
  log('\n💡 下一步操作建议:', 'cyan');
  if (isValid) {
    log('1. 运行单元测试: npm run test:unit', 'blue');
    log('2. 运行集成测试: npm run test:integration', 'blue');
    log('3. 运行所有测试: npm test', 'blue');
    log('4. 生成覆盖率报告: npm run test:coverage', 'blue');
  } else {
    log('1. 检查并修复上述问题', 'yellow');
    log('2. 安装缺失的依赖: npm install', 'yellow');
    log('3. 重新运行验证: node scripts/verify-tests.js', 'yellow');
  }
  
  process.exit(isValid ? 0 : 1);
}

// 运行主函数
main();