import { spawn } from "node:child_process";

const children = [
  spawn("node", ["server/index.mjs"], {
    cwd: process.cwd(),
    stdio: "inherit",
  }),
  spawn(process.platform === "win32" ? "vite.cmd" : "vite", ["--host", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  }),
];

function stopAll(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      stopAll("SIGTERM");
      process.exit(code);
    }
  });
}

process.on("SIGINT", () => {
  stopAll("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAll("SIGTERM");
  process.exit(0);
});
