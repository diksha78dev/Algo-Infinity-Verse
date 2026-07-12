import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';

if (!isMainThread) {
  (async () => {
    try {
      const { buffer, mimetype } = workerData;
      // The buffer passed through workerData needs to be reconstructed
      const buf = Buffer.from(buffer);

      if (mimetype.includes('pdf')) {
        const pdf = (await import('pdf-parse')).default;
        const data = await pdf(buf);
        parentPort.postMessage({ result: data.text });
      } else if (mimetype.includes('word')) {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ buffer: buf });
        parentPort.postMessage({ result: result.value });
      } else {
        parentPort.postMessage({ error: 'Unsupported file' });
      }
    } catch (err) {
      parentPort.postMessage({ error: err.message });
    }
  })();
}

export async function extractResumeText(file) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: {
        buffer: file.buffer,
        mimetype: file.mimetype,
      },
    });

    worker.on('message', (msg) => {
      if (msg.error) reject(new Error(msg.error));
      else resolve(msg.result);
    });

    worker.on('error', reject);

    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}
