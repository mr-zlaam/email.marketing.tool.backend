import { parentPort, workerData } from "worker_threads";

interface WorkerData {
  cells: string[]; // generic array of strings
}

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

if (!parentPort) throw new Error("Worker must have a parentPort");

const { cells } = workerData as WorkerData;

const extracted: string[] = [];

for (const cell of cells) {
  const matches = cell.match(emailRegex);
  if (matches) extracted.push(...matches);
}

parentPort.postMessage(extracted);
