import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const backendDir = path.resolve(projectRoot, '..', '..', 'backend');
const composeFile = path.join(backendDir, 'docker-compose.yml');
const frontendBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const loginUrl = new URL('/login/traveler/', frontendBaseUrl).toString();

function startProcess(command, args, options = {}) {
  return spawn(command, args, {
    cwd: options.cwd ?? projectRoot,
    env: { ...process.env, ...options.env },
    shell: true,
    stdio: options.stdio ?? 'inherit',
  });
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = startProcess(command, args, options);

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(' ')} exited with code ${code ?? 'null'}${signal ? ` signal ${signal}` : ''}`
        )
      );
    });
  });
}

async function waitForUrl(url, timeoutMs = 180000) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(`Timed out waiting for ${url}${lastError ? `: ${lastError.message}` : ''}`);
}

const frontendServer = startProcess(
  'pnpm',
  ['exec', 'next', 'dev', '-H', '127.0.0.1', '-p', '3000'],
  {
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:8080',
    },
  }
);

async function cleanup() {
  if (!frontendServer.killed) {
    frontendServer.kill('SIGTERM');
  }

  try {
    await runProcess('docker', ['compose', '-f', composeFile, 'down'], { cwd: backendDir });
  } catch {
    // Ignore cleanup failures.
  }
}

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(143);
});

try {
  await runProcess('docker', ['compose', '-f', composeFile, 'up', '-d', '--build', '--wait'], {
    cwd: backendDir,
  });

  await waitForUrl(loginUrl);

  await runProcess('pnpm', ['exec', 'playwright', 'test', 'e2e'], {
    env: {
      PLAYWRIGHT_BASE_URL: frontendBaseUrl,
    },
  });
} finally {
  await cleanup();
}
