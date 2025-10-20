const container = document.querySelector('.worker');

const logHtml = (cssClass, ...args) => {
  const div = document.createElement('div');
  if (cssClass) div.classList.add(cssClass);
  div.append(document.createTextNode(args.join(' ')));
  container.append(div);
};

const downloadFile = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

(async () => {
  // Module Worker polyfill from https://stackoverflow.com/a/62963963/6255000.
  const supportsWorkerType = () => {
    let supports = false;
    const tester = {
      get type() {
        supports = true;
      },
    };
    try {
      new Worker('data:,""', tester);
    } finally {
      return supports;
    }
  };
  if (!supportsWorkerType()) {
    await import('./module-workers-polyfill.min.js');
  }

  const worker = new Worker('/demo/worker.js', {
    type: 'module',
  });

  worker.addEventListener('message', ({ data }) => {
    switch (data.type) {
      case 'download':
        downloadFile(data.payload.filename, data.payload.blob);
        break;
      case 'log':
        logHtml(data.payload.cssClass, ...data.payload.args);
        break;
      default:
        logHtml('error', 'Unhandled message:', data.type);
    }
  });
})();
