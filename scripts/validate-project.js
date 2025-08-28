#!/usr/bin/env node

/**
 * DayWatch Project Validation Script
 *
 * This script validates the project health and can be run by AI assistants
 * to ensure the project is in a good state before and after changes.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 DayWatch Project Validation\n');

let hasErrors = false;

function checkExists(filePath, description) {
  const fullPath = join(projectRoot, filePath);
  if (existsSync(fullPath)) {
    console.log(`✅ ${description}`);
    return true;
  } else {
    console.log(`❌ ${description} - Missing: ${filePath}`);
    hasErrors = true;
    return false;
  }
}

function runCommand(command, description) {
  try {
    console.log(`🔄 ${description}...`);
    const output = execSync(command, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(`✅ ${description}`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} - Failed:`);
    console.log(error.stdout || error.message);
    hasErrors = true;
    return false;
  }
}

function validateFileContent(filePath, checks, description) {
  const fullPath = join(projectRoot, filePath);
  if (!existsSync(fullPath)) {
    console.log(`❌ ${description} - File missing: ${filePath}`);
    hasErrors = true;
    return false;
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    let allPassed = true;

    for (const check of checks) {
      if (check.type === 'contains') {
        if (!content.includes(check.value)) {
          console.log(`❌ ${description} - Missing: ${check.value}`);
          allPassed = false;
          hasErrors = true;
        }
      } else if (check.type === 'not_contains') {
        if (content.includes(check.value)) {
          console.log(`❌ ${description} - Should not contain: ${check.value}`);
          allPassed = false;
          hasErrors = true;
        }
      }
    }

    if (allPassed) {
      console.log(`✅ ${description}`);
    }
    return allPassed;
  } catch (error) {
    console.log(`❌ ${description} - Error reading file: ${error.message}`);
    hasErrors = true;
    return false;
  }
}

// 1. Check essential files exist
console.log('📁 Checking essential files...');
checkExists('package.json', 'Package.json exists');
checkExists('index.html', 'Main HTML file exists');
checkExists('style.css', 'Main CSS file exists');
checkExists('modules/timerManager.js', 'TimerManager module exists');
checkExists('modules/uiManager.js', 'UIManager module exists');
checkExists('modules/modalManager.js', 'ModalManager module exists');
checkExists('modules/settingsManager.js', 'SettingsManager module exists');

// 2. Check test files exist
console.log('\n🧪 Checking test files...');
checkExists('tests/timerManager.test.js', 'TimerManager tests exist');
checkExists('tests/uiManager.test.js', 'UIManager tests exist');
checkExists('tests/modalManager.test.js', 'ModalManager tests exist');
checkExists('tests/elementFactory.test.js', 'ElementFactory tests exist');

// 3. Validate package.json
console.log('\n📦 Validating package.json...');
validateFileContent('package.json', [
  { type: 'contains', value: '"test"' },
  { type: 'contains', value: '"test:run"' },
  { type: 'contains', value: 'vitest' }
], 'Package.json has test scripts');

// 4. Check for critical HTML elements
console.log('\n🌐 Validating HTML structure...');
validateFileContent('index.html', [
  { type: 'contains', value: 'id="import-timers-btn"' },
  { type: 'contains', value: 'id="download-timers-btn"' },
  { type: 'contains', value: 'id="import-modal"' },
  { type: 'contains', value: 'id="timer-modal"' },
  { type: 'contains', value: 'id="settings-modal"' }
], 'HTML has required elements');

// 5. Check for import functionality
console.log('\n📥 Validating import functionality...');
validateFileContent('modules/timerManager.js', [
  { type: 'contains', value: 'importTimers' },
  { type: 'contains', value: 'detectImportFormat' },
  { type: 'contains', value: 'parseCsvImport' },
  { type: 'contains', value: 'parseJsonImport' }
], 'TimerManager has import methods');

validateFileContent('modules/uiManager.js', [
  { type: 'contains', value: 'showImportModal' },
  { type: 'contains', value: 'previewImport' },
  { type: 'contains', value: 'confirmImport' }
], 'UIManager has import UI methods');

// 6. Run tests
console.log('\n🧪 Running tests...');
const testsPass = runCommand('npm run test:run', 'All tests pass');

// 7. Check for common issues
console.log('\n🔍 Checking for common issues...');
validateFileContent('modules/timerManager.js', [
  { type: 'not_contains', value: 'console.log' },
  { type: 'not_contains', value: 'alert(' }
], 'TimerManager has no debug code');

validateFileContent('modules/uiManager.js', [
  { type: 'not_contains', value: 'console.log' },
  { type: 'not_contains', value: 'alert("Import button clicked!")' }, // Only check for debug alerts
  { type: 'not_contains', value: 'alert("Debug")' }
], 'UIManager has no debug code');

// 8. Final validation
console.log('\n📊 Validation Summary:');
if (hasErrors) {
  console.log('❌ Project validation FAILED');
  console.log('\n🔧 Please fix the issues above before proceeding.');
  process.exit(1);
} else {
  console.log('✅ Project validation PASSED');
  console.log('\n🎉 Project is in good health!');
  process.exit(0);
}
