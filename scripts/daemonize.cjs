// Daemonizer: double-fork so the grandchild is reparented to init (PPID 1)
// with its own session — the same escape pattern the agent-browser daemon uses.
//
// Usage: DAEMON_MIDDLE=1 node daemonize.cjs <cmd> [args...]
// Step 1 (parent): spawn a detached middle process that runs this same file
//                  with DAEMON_MIDDLE=1, then exits.
// Step 2 (middle): closes stdio, spawns the target detached with a log file,
//                  exits immediately -> target reparents to init.
const { spawn } = require("child_process");
const fs = require("fs");

if (process.env.DAEMON_MIDDLE === "1") {
  const LOG = "/home/z/my-project/.zscripts/daemon.log";
  try {
    fs.closeSync(0);
    fs.closeSync(1);
    fs.closeSync(2);
  } catch {}
  const out = fs.openSync(LOG, "a");
  const CMD = process.argv[2];
  const ARGS = process.argv.slice(3);
  const child = spawn(CMD, ARGS, {
    cwd: "/home/z/my-project",
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.unref();
  process.exit(0);
} else {
  const middle = spawn(process.execPath, [__filename, ...process.argv.slice(2)], {
    detached: true,
    stdio: "ignore",
    cwd: "/home/z/my-project",
    env: { ...process.env, DAEMON_MIDDLE: "1" },
  });
  middle.unref();
  console.log("daemon spawned");
}
