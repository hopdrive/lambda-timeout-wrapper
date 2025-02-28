const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * A modified version of the deploy script that creates an empty commit first
 * to ensure there are always changes to commit
 */
function deploy() {
  // Get version from command line arguments
  const args = process.argv.slice(2);
  const version = args[0];

  if (!version) {
    console.error('\n❌ Error: Please provide a version number: npm run deploy-force 1.0.0\n');
    process.exit(1);
  }

  try {
    // Read current version from package.json
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;

    // Check if trying to deploy the same version
    if (version === currentVersion) {
      console.error(`\n❌ Error: Version ${version} is already set in package.json.`);
      console.error(`Please use a different version number or update package.json first.\n`);
      process.exit(1);
    }

    // Update version in package.json
    packageJson.version = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Updated package.json version to ${version}`);

    // Run the build process
    console.log(`Building package before deployment...`);
    execSync('npm run build', { stdio: 'inherit' });

    // Create an empty commit to ensure we have changes
    try {
      execSync('git commit --allow-empty -m "chore: force new deployment"', { stdio: 'inherit' });
    } catch (error) {
      console.warn('Empty commit failed, continuing with deployment...');
    }

    // Commit changes
    console.log(`Committing version update...`);
    execSync(`git add package.json`, { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });

    // Create git tag
    console.log(`Creating git tag v${version}...`);
    execSync(`git tag -a v${version} -m "Version ${version}"`, { stdio: 'inherit' });

    // Push changes and tags
    console.log(`Pushing changes and tags...`);
    execSync(`git push`, { stdio: 'inherit' });
    execSync(`git push --tags`, { stdio: 'inherit' });

    // Publish to npm
    console.log(`Publishing package to registry...`);
    execSync(`npm publish`, { stdio: 'inherit' });

    console.log(`\n✅ Successfully deployed version ${version}!`);
  } catch (error) {
    console.error(`\n❌ Deployment failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  deploy();
}

module.exports = { deploy };