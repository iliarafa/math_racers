import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEMVER, rewriteCapacitorConfig, rewriteJsonVersion, rewritePbxproj } from './bumpVersion.ts';

test('SEMVER accepts x.y.z only', () => {
  assert.ok(SEMVER.test('1.4.0'));
  assert.ok(!SEMVER.test('1.4'));
  assert.ok(!SEMVER.test('v1.4.0'));
  assert.ok(!SEMVER.test('1.4.0-beta'));
});

test('rewriteJsonVersion sets the root version and the lockfile root package', () => {
  const pkg = '{\n  "name": "rest-express",\n  "version": "1.3.15",\n  "dependencies": {\n    "x": "1.3.15"\n  }\n}\n';
  const out = JSON.parse(rewriteJsonVersion(pkg, '1.4.0'));
  assert.equal(out.version, '1.4.0');
  assert.equal(out.dependencies.x, '1.3.15', 'only the root version changes');
  assert.ok(rewriteJsonVersion(pkg, '1.4.0').endsWith('}\n'), 'keeps the trailing newline');

  const lock = JSON.stringify({ name: 'rest-express', version: '1.3.15', packages: { '': { name: 'rest-express', version: '1.3.15' }, 'node_modules/x': { version: '1.3.15' } } }, null, 2) + '\n';
  const lockOut = JSON.parse(rewriteJsonVersion(lock, '1.4.0'));
  assert.equal(lockOut.version, '1.4.0');
  assert.equal(lockOut.packages[''].version, '1.4.0');
  assert.equal(lockOut.packages['node_modules/x'].version, '1.3.15');
});

test('rewriteCapacitorConfig replaces the version field only', () => {
  const src = "const config = {\n  appId: 'live.mathracer.app',\n  version: '1.3.15',\n  webDir: 'dist/public',\n};\n";
  assert.equal(rewriteCapacitorConfig(src, '1.4.0'), src.replace("version: '1.3.15'", "version: '1.4.0'"));
  assert.throws(() => rewriteCapacitorConfig('const config = {};', '1.4.0'), /version/);
});

test('rewritePbxproj sets both marketing versions and raises both build numbers', () => {
  const src = [
    '\t\t\t\tCURRENT_PROJECT_VERSION = 1;',
    '\t\t\t\tMARKETING_VERSION = 1.3.15;',
    '\t\t\t\tCURRENT_PROJECT_VERSION = 1;',
    '\t\t\t\tMARKETING_VERSION = 1.3.15;',
  ].join('\n');
  const { text, build } = rewritePbxproj(src, '1.4.0');
  assert.equal(build, 2);
  assert.equal((text.match(/MARKETING_VERSION = 1\.4\.0;/g) ?? []).length, 2);
  assert.equal((text.match(/CURRENT_PROJECT_VERSION = 2;/g) ?? []).length, 2);
  assert.throws(() => rewritePbxproj('MARKETING_VERSION = 1.3.15;', '1.4.0'), /two/i, 'refuses when Debug and Release are not both present');
});
