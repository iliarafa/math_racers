/**
 * Bump the app version everywhere it lives: package.json, package-lock.json,
 * capacitor.config.ts and both MARKETING_VERSION entries (Debug + Release) in
 * the Xcode project, whose CURRENT_PROJECT_VERSION build numbers go up by one.
 * The client reads package.json's version through `__APP_VERSION__`.
 *
 * Usage: npm run version:bump 1.4.0
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const SEMVER = /^\d+\.\d+\.\d+$/;

/** package.json and package-lock.json: the root version, plus the lockfile's root package entry. */
export function rewriteJsonVersion(text: string, version: string): string {
  const json = JSON.parse(text);
  json.version = version;
  if (json.packages && json.packages['']) json.packages[''].version = version;
  return JSON.stringify(json, null, 2) + '\n';
}

export function rewriteCapacitorConfig(text: string, version: string): string {
  const field = /version: '\d+\.\d+\.\d+'/;
  if (!field.test(text)) throw new Error("capacitor.config.ts has no version: '<x.y.z>' field");
  return text.replace(field, `version: '${version}'`);
}

/** Both build configurations must be present; the build number becomes max + 1 on both. */
export function rewritePbxproj(text: string, version: string): { text: string; build: number } {
  const marketing = text.match(/MARKETING_VERSION = [^;]+;/g) ?? [];
  const builds = Array.from(text.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g), (m) => Number(m[1]));
  if (marketing.length !== 2 || builds.length !== 2) {
    throw new Error(`expected two MARKETING_VERSION and two CURRENT_PROJECT_VERSION entries (Debug + Release), found ${marketing.length} and ${builds.length}`);
  }
  const build = Math.max(...builds) + 1;
  const out = text
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${build};`);
  return { text: out, build };
}

function main() {
  const version = process.argv[2];
  if (!version || !SEMVER.test(version)) {
    console.error('Usage: npm run version:bump <x.y.z>');
    process.exit(1);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const edit = (rel: string, fn: (text: string) => string) => {
    const file = path.join(root, rel);
    writeFileSync(file, fn(readFileSync(file, 'utf8')));
    console.log(`  ${rel}`);
  };
  console.log(`Bumping to ${version}:`);
  edit('package.json', (t) => rewriteJsonVersion(t, version));
  edit('package-lock.json', (t) => rewriteJsonVersion(t, version));
  edit('capacitor.config.ts', (t) => rewriteCapacitorConfig(t, version));
  let build = 0;
  edit('ios/App/App.xcodeproj/project.pbxproj', (t) => {
    const result = rewritePbxproj(t, version);
    build = result.build;
    return result.text;
  });
  console.log(`  Xcode build number → ${build}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
