/**
 * Jest wrapper for TN-022 Admin Approval Tests
 */
import { execSync } from 'child_process';
import path from 'path';

describe('TN-022 Admin Business Approval Test Suite', () => {
  it('should pass all ADM-001 through ADM-023 specifications', () => {
    const scriptPath = path.join(__dirname, 'run-admin-tests.ts');
    const output = execSync(`npx ts-node "${scriptPath}"`, {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '../../../../'),
    });
    expect(output).toContain('🎉 PASS — TN-022 Admin Approval is fully verified');
  });
});
