#!/usr/bin/env node
import fs from 'fs';
import fetch from 'node-fetch';
import decompress from 'decompress';

async function getSqliteWasmDownloadLink() {
  const response = await fetch(
    'https://api.github.com/repos/utelle/SQLite3MultipleCiphers/releases',
  );
  const releases = await response.json();

  // Fail if no releases are found
  if (!releases || releases.length === 0) {
    throw new Error('No releases found for SQLite3MultipleCiphers repository');
  }

  // Get the latest release (first in the array)
  const tagName = releases[0]?.tag_name?.replace('v', '');
  if (!tagName) {
    throw new Error('Unable to find tag name in latest release');
  }

  // Update package.json with the new version
  await updatePackageJsonVersion(tagName);

  // Construct the download URL
  const wasmLink = `https://github.com/utelle/SQLite3MultipleCiphers/releases/download/v${tagName}/sqlite3mc-${tagName}-sqlite-3.50.4-wasm.zip`;
  console.log(`Found SQLite Wasm download link: ${wasmLink}`);
  return wasmLink;
}

async function updatePackageJsonVersion(tagName) {
  try {
    const packageJsonPath = './package.json';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Update the version with the tag name
    packageJson.version = tagName;

    // Write the updated package.json back to file
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n',
    );
    console.log(`Updated package.json version to: ${tagName}`);
  } catch (err) {
    console.error('Failed to update package.json:', err.message);
    throw err;
  }
}

async function downloadAndUnzipSqliteWasm(sqliteWasmDownloadLink) {
  if (!sqliteWasmDownloadLink) {
    throw new Error('Unable to find SQLite Wasm download link');
  }
  console.log('Downloading and unzipping SQLite Wasm...');
  const response = await fetch(sqliteWasmDownloadLink);
  if (!response.ok || response.status !== 200) {
    throw new Error(
      `Unable to download SQLite Wasm from ${sqliteWasmDownloadLink}`,
    );
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

async function main() {
  try {
    const sqliteWasmLink = await getSqliteWasmDownloadLink();
    await downloadAndUnzipSqliteWasm(sqliteWasmLink);
    fs.copyFileSync(
      './node_modules/module-workers-polyfill/module-workers-polyfill.min.js',
      './demo/module-workers-polyfill.min.js',
    );
  } catch (err) {
    console.error(err.name, err.message);
  }
}

main();
