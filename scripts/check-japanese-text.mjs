#!/usr/bin/env node

import { execSync } from 'node:child_process';

const includeRoots = (process.env.I18N_GUARD_INCLUDE_DIRS || 'web/src').split(',').map((dir) => dir.trim()).filter(Boolean);
const ignorePatterns = [
  /^web\/src\/locales\//,
  /^@spec\//,
  /^docs\//
];
const allowedExtensions = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.mdx',
  '.md',
  '.css',
  '.scss'
];

function resolveCommit(candidates) {
  for (const ref of candidates) {
    if (!ref) continue;
    try {
      const sha = execSync(`git rev-parse ${ref}`, { encoding: 'utf8' }).trim();
      if (sha) return sha;
    } catch (error) {
      // ignore missing commit
    }
  }
  return null;
}

function runGit(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf8' });
  } catch (error) {
    const stdout = error?.stdout?.toString() ?? '';
    const stderr = error?.stderr?.toString() ?? '';
    console.error(stdout + stderr);
    throw error;
  }
}

const head = resolveCommit([
  process.env.I18N_GUARD_HEAD_SHA,
  process.env.GITHUB_SHA,
  'HEAD'
]);
const baseRefName = (process.env.I18N_GUARD_BASE_REF || process.env.GITHUB_BASE_REF || '').replace(/^refs\/heads\//, '');
const defaultBaseRefName = (process.env.I18N_GUARD_DEFAULT_BASE || '').replace(/^refs\/heads\//, '');
const base = resolveCommit([
  process.env.I18N_GUARD_BASE_SHA,
  process.env.GITHUB_BASE_SHA,
  process.env.GITHUB_EVENT_BEFORE,
  baseRefName && `origin/${baseRefName}`,
  defaultBaseRefName && `origin/${defaultBaseRefName}`,
  `${head}^`
]);

if (!head || !base) {
  console.error('基準コミットまたは比較コミットを特定できませんでした');
  process.exit(1);
}

function isTargetFile(filePath) {
  if (!allowedExtensions.some((ext) => filePath.endsWith(ext))) {
    return false;
  }
  if (!includeRoots.some((root) => filePath.startsWith(`${root}/`) || filePath === root)) {
    return false;
  }
  if (ignorePatterns.some((regex) => regex.test(filePath))) {
    return false;
  }
  return true;
}

const diffNames = runGit(`diff --name-only ${base}...${head}`).split('\n').filter(Boolean).filter(isTargetFile);

if (diffNames.length === 0) {
  console.log('日本語検知対象の差分ファイルはありませんでした');
  process.exit(0);
}

const japaneseRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

function escapeAnnotation(text) {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

const findings = [];

diffNames.forEach((filePath) => {
  const diff = runGit(`diff -U0 ${base}...${head} -- ${filePath}`);
  const lines = diff.split('\n');
  let currentLine = 0;

  lines.forEach((line) => {
    if (line.startsWith('@@')) {
      const match = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      currentLine = match ? Number(match[1]) : 0;
      return;
    }

    if (line.startsWith('+++') || line.startsWith('---')) {
      return;
    }

    if (line.startsWith('+')) {
      const content = line.slice(1);
      if (japaneseRegex.test(content)) {
        findings.push({
          filePath,
          line: currentLine,
          snippet: content.trim()
        });
      }
      currentLine += 1;
      return;
    }

    if (line.startsWith(' ')) {
      currentLine += 1;
    }
  });
});

if (findings.length === 0) {
  console.log('差分内で日本語テキストは検出されませんでした');
  process.exit(0);
}

findings.forEach(({ filePath, line, snippet }) => {
  const truncated = snippet.length > 80 ? `${snippet.slice(0, 77)}...` : snippet;
  console.log(`::warning file=${filePath},line=${line}::${escapeAnnotation(`日本語テキストを検出: ${truncated}`)}`);
});

console.log(`日本語テキストを ${findings.length} 件検知しました。翻訳ファイル (locales) に移し、英語訳を追加してください。`);
process.exit(0);
