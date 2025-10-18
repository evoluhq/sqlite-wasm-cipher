#!/usr/bin/env node
import fs from 'fs';
import fetch from 'node-fetch';
import decompress from 'decompress';

async function getSqliteWasmDownloadLink(version = null) {
  const response = await fetch(
    'https://api.github.com/repos/utelle/SQLite3MultipleCiphers/releases',
  );
  const releases = await response.json();
  if (!releases || releases.length === 0) {
    throw new Error(
      'No releases found for SQLite3MultipleCiphers repository (likely a network error).',
    );
  }

  let tagName;
  let release;

  if (version) {
    release = releases.find(
      (release) =>
        release.tag_name === `v${version}` || release.tag_name === version,
    );
    if (!release) {
      const availableVersions = releases
        .slice(0, 5)
        .map((r) => r.tag_name)
        .join(', ');
      throw new Error(
        `Version ${version} not found. Available versions (latest 5): ${availableVersions}`,
      );
    }
    tagName = release.tag_name.replace('v', '');
    console.log(`Using specified version: ${tagName}`);
  } else {
    release = releases[0];
    tagName = release.tag_name.replace('v', '');
    console.log(`Using latest version: ${tagName}`);
  }

  const asset = release?.assets?.find((asset) =>
    asset.browser_download_url.endsWith('wasm.zip'),
  );

  if (!asset) {
    throw new Error(
      `Unable to find SQLite Wasm download link in release ${tagName}`,
    );
  }

  await updatePackageVersion(tagName);
  return asset.browser_download_url;
}

async function downloadAndUnzipSqliteWasm(wasmLink) {
  if (!wasmLink) {
    throw new Error('Unable to find SQLite Wasm download link');
  }
  console.log('Downloading and unzipping SQLite Wasm...');
  const response = await fetch(wasmLink);
  if (!response.ok || response.status !== 200) {
    throw new Error(`Unable to download SQLite Wasm from ${wasmLink}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync('sqlite-wasm.zip', Buffer.from(buffer));
  const files = await decompress('sqlite-wasm.zip', 'sqlite-wasm', {
    strip: 1,
    filter: (file) =>
      /jswasm/.test(file.path) && /(\.mjs|\.wasm|\.js)$/.test(file.path),
  });
  console.log(
    `Downloaded and unzipped:\n${files
      .map((file) => (/\//.test(file.path) ? '‣ ' + file.path + '\n' : ''))
      .join('')}`,
  );
  fs.rmSync('sqlite-wasm.zip');
}

async function updatePackageVersion(tagName) {
  try {
    const pkgPath = './package.json';
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkgJson.version = tagName;
    fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');
    console.log(`Updated package.json version to: ${tagName}`);
  } catch (err) {
    console.error('Failed to update package.json:', err.message);
    throw err;
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const index = args.indexOf('--version');
    const version =
      index !== -1 && index + 1 < args.length ? args[index + 1] : null;
    const wasmLink = await getSqliteWasmDownloadLink(version);
    await downloadAndUnzipSqliteWasm(wasmLink);
    fs.copyFileSync(
      './node_modules/module-workers-polyfill/module-workers-polyfill.min.js',
      './demo/module-workers-polyfill.min.js',
    );
  } catch (err) {
    console.error(err.name, err.message);
  }
}

main();
