// 简化的测试运行器
const { execSync } = require('child_process');

function runCommand(command) {
  try {
    console.log(`Running: ${command}`);
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: __dirname
    });
    return true;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Running DaPlot Tests...\n');
  
  // 运行Jest测试
  console.log('📋 Running Jest Tests...');
  const jestSuccess = runCommand('npx jest --passWithNoTests --verbose');
  
  if (jestSuccess) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

main().catch(console.error);