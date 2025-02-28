const { execSync } = require('child_process');

/**
 * Pre-build script for TypeScript package
 * This handles TypeScript-specific build tasks
 */
function buildPackage() {
  console.log('Building TypeScript package...');

  try {
    // Clean previous build
    console.log('Cleaning previous build...');
    execSync('npm run clean', { stdio: 'inherit' });

    // Run TypeScript build process
    console.log('Compiling TypeScript...');
    execSync('npm run build:cjs', { stdio: 'inherit' });
    execSync('npm run build:esm', { stdio: 'inherit' });
    execSync('npm run build:types', { stdio: 'inherit' });

    console.log('TypeScript build completed successfully!');
    return true;
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    return false;
  }
}

// Run the build if this script is executed directly
if (require.main === module) {
  const success = buildPackage();
  process.exit(success ? 0 : 1);
}

module.exports = { buildPackage };