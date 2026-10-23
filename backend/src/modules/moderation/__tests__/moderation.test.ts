/**
 * Jest wrapper for TN-021 Admin Content Moderation Tests
 */
import { execSync } from 'child_process';
import path from 'path';

describe('TN-021 Admin Content Moderation Test Suite', () => {
  it('should pass all MOD-001 through MOD-044 specifications', () => {
    const scriptPath = path.join(__dirname, 'run-moderation-tests.ts');
    const output = execSync(`node ./node_modules/ts-node/dist/bin.js "${scriptPath}"`, {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '../../../../'),
    });
    expect(output).toContain('ALL TN-021 MODERATION TESTS PASSED PERFECTLY!');
  }, 120000);
});
