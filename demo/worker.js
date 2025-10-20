import sqlite3InitModule from '../index.mjs';

const logHtml = function (cssClass, ...args) {
  postMessage({
    type: 'log',
    payload: { cssClass, args },
  });
};

const log = (...args) => logHtml('', ...args);
const error = (...args) => logHtml('error', ...args);

const start = function (sqlite3, pool) {
  const ret = sqlite3.capi.sqlite3mc_vfs_create('opfs-sahpool', 1);
  console.info(">> opfs vfs create:", ret);
  const list = sqlite3.capi.sqlite3_js_vfs_list();
  console.info(">> vfs list:", list);
  log('Running SQLite3 version', sqlite3.version.libVersion);
  let db;
  if ('opfs' in sqlite3) {
    //db = new sqlite3.oo1.DB("/mydb.sqlite3",'ct', 'multipleciphers-opfs');
    db = new pool.OpfsSAHPoolDb('file:mydb.sqlite3?vfs=multipleciphers-opfs-sahpool');
    log('OPFS is available, created persisted database at', db.filename);
  } else {
    db = new sqlite3.oo1.DB('/mydb.sqlite3', 'ct');
    log('OPFS is not available, created transient database', db.filename);
  }
  try {
    db.exec(`
      PRAGMA cipher = 'sqlcipher';
      PRAGMA legacy = 4;
      PRAGMA key = 'hunter2';
    `);
    log('Creating a table...');
    db.exec('CREATE TABLE IF NOT EXISTS t(a,b)');
    log('Insert some data using exec()...');
    for (let i = 20; i <= 25; ++i) {
      db.exec({
        sql: 'INSERT INTO t(a,b) VALUES (?,?)',
        bind: [i, i * 2],
      });
    }
    log('Query data with exec()...');
    db.exec({
      sql: 'SELECT a FROM t ORDER BY a LIMIT 3',
      callback: (row) => {
        log(row);
      },
    });
  } finally {
    db.close();
  }
};

log('Loading and initializing SQLite3 module...');
sqlite3InitModule({
  print: log,
  printErr: error,
}).then((sqlite3) => {
  sqlite3.installOpfsSAHPoolVfs({}).then((pool) => {
    log('Installed OPFS SAH Pool VFS');
    try {
      start(sqlite3, pool);
    } catch (err) {
      error(err.name, err.message);
    }
    // Register download
    globalThis.DOWNLOAD_FILE = (filename) => {
      filename = filename || '/mydb.sqlite3';
      const data = pool.exportFile(filename);
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      postMessage({
        type: 'download',
        payload: {
          filename,
          blob,
        },
      });
    };
  });
});
