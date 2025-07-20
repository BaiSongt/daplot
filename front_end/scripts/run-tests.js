#!/usr/bin/env node

// 测试运行脚本
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const options = {
  watch: args.includes('--watch'),
  coverage: args.includes('--coverage'),
  ci: args.includes('--ci'),
  verbose: args.includes('--verbose'),
  bail: args.includes('--bail')
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(50)}`, 'cyan');
  log(`${title}`, 'cyan');
  log(`${'='.repeat(50)}`, 'cyan');
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`, 'blue');
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runUnitTests() {
  logSection('运行单元测试');
  
  const jestArgs = ['--testPathPattern=tests/unit'];
  
  if (options.watch) {
    jestArgs.push('--watch');
  }
  
  if (options.coverage) {
    jestArgs.push('--coverage');
  }
  
  if (options.ci) {
    jestArgs.push('--ci', '--watchAll=false');
  }
  
  if (options.verbose) {
    jestArgs.push('--verbose');
  }
  
  if (options.bail) {
    jestArgs.push('--bail');
  }

  try {
    await runCommand('npx', ['jest', ...jestArgs]);
    log('✅ 单元测试通过', 'green');
  } catch (error) {
    log('❌ 单元测试失败', 'red');
    throw error;
  }
}

async function runIntegrationTests() {
  logSection('运行集成测试');
  
  const jestArgs = ['--testPathPattern=tests/integration'];
  
  if (options.coverage) {
    jestArgs.push('--coverage');
  }
  
  if (options.ci) {
    jestArgs.push('--ci', '--watchAll=false');
  }

  try {
    await runCommand('npx', ['jest', ...jestArgs]);
    log('✅ 集成测试通过', 'green');
  } catch (error) {
    log('❌ 集成测试失败', 'red');
    throw error;
  }
}

async function runE2ETests() {
  logSection('运行端到端测试');
  
  // 检查是否需要启动开发服务器
  const needsServer = !process.env.CYPRESS_BASE_URL;
  let serverProcess;
  
  if (needsServer) {
    log('启动开发服务器...', 'yellow');
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true
    });
    
    // 等待服务器启动
    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });
  }

  try {
    const cypressArgs = options.ci ? ['run'] : ['open'];
    
    if (options.ci) {
      cypressArgs.push('--browser', 'chrome', '--headless');
    }

    await runCommand('npx', ['cypress', ...cypressArgs]);
    log('✅ 端到端测试通过', 'green');
  } catch (error) {
    log('❌ 端到端测试失败', 'red');
    throw error;
  } finally {
    if (serverProcess) {
      log('关闭开发服务器...', 'yellow');
      serverProcess.kill();
    }
  }
}

async function runLinting() {
  logSection('运行代码检查');
  
  try {
    await runCommand('npx', ['eslint', 'src/', 'tests/', '--ext', '.js']);
    log('✅ 代码检查通过', 'green');
  } catch (error) {
    log('❌ 代码检查失败', 'red');
    throw error;
  }
}

async function generateCoverageReport() {
  logSection('生成覆盖率报告');
  
  try {
    await runCommand('npx', ['jest', '--coverage', '--coverageReporters=html', '--coverageReporters=lcov']);
    
    const coveragePath = path.join(__dirname, '../coverage/lcov-report/index.html');
    if (fs.existsSync(coveragePath)) {
      log(`📊 覆盖率报告已生成: ${coveragePath}`, 'green');
    }
  } catch (error) {
    log('❌ 覆盖率报告生成失败', 'red');
    throw error;
  }
}

async function runPerformanceTests() {
  logSection('运行性能测试');
  
  try {
    // 使用Lighthouse进行性能测试
    await runCommand('npx', [
      'lighthouse',
      'http://localhost:8080/visualization-new.html',
      '--output=json',
      '--output-path=./performance-report.json',
      '--chrome-flags="--headless"'
    ]);
    
    log('✅ 性能测试完成', 'green');
    
    // 分析性能报告
    const reportPath = path.join(__dirname, '../performance-report.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      const metrics = report.lhr.audits;
      
      log('\n性能指标:', 'cyan');
      log(`首次内容绘制: ${metrics['first-contentful-paint'].displayValue}`, 'blue');
      log(`最大内容绘制: ${metrics['largest-contentful-paint'].displayValue}`, 'blue');
      log(`交互时间: ${metrics['interactive'].displayValue}`, 'blue');
      log(`累积布局偏移: ${metrics['cumulative-layout-shift'].displayValue}`, 'blue');
    }
  } catch (error) {
    log('❌ 性能测试失败', 'red');
    throw error;
  }
}

async function runAccessibilityTests() {
  logSection('运行可访问性测试');
  
  try {
    // 使用axe-core进行可访问性测试
    await runCommand('npx', [
      'cypress',
      'run',
      '--spec',
      'tests/e2e/accessibility.cy.js',
      '--browser',
      'chrome',
      '--headless'
    ]);
    
    log('✅ 可访问性测试通过', 'green');
  } catch (error) {
    log('❌ 可访问性测试失败', 'red');
    throw error;
  }
}

async function main() {
  const startTime = Date.now();
  
  try {
    log(`开始运行测试套件: ${testType}`, 'bright');
    log(`选项: ${JSON.stringify(options)}`, 'blue');
    
    switch (testType) {
      case 'unit':
        await runUnitTests();
        break;
        
      case 'integration':
        await runIntegrationTests();
        break;
        
      case 'e2e':
        await runE2ETests();
        break;
        
      case 'lint':
        await runLinting();
        break;
        
      case 'coverage':
        await generateCoverageReport();
        break;
        
      case 'performance':
        await runPerformanceTests();
        break;
        
      case 'accessibility':
        await runAccessibilityTests();
        break;
        
      case 'all':
        await runLinting();
        await runUnitTests();
        await runIntegrationTests();
        
        if (!options.watch) {
          await runE2ETests();
          await generateCoverageReport();
        }
        break;
        
      case 'ci':
        await runLinting();
        await runUnitTests();
        await runIntegrationTests();
        await runE2ETests();
        await generateCoverageReport();
        await runPerformanceTests();
        await runAccessibilityTests();
        break;
        
      default:
        log(`未知的测试类型: ${testType}`, 'red');
        log('可用的测试类型: unit, integration, e2e, lint, coverage, performance, accessibility, all, ci', 'yellow');
        process.exit(1);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n🎉 所有测试完成! 耗时: ${duration}秒`, 'green');
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n💥 测试失败! 耗时: ${duration}秒`, 'red');
    log(`错误: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  log('未处理的Promise拒绝:', 'red');
  log(reason, 'red');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('未捕获的异常:', 'red');
  log(error.message, 'red');
  process.exit(1);
});

// 运行主函数
main();