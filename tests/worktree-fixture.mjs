// Test adapter only: all lifecycle assertions exercise the native CLI subprocess.
import { execFile } from 'node:child_process';
const cli = new URL('../python/worktree.py', import.meta.url).pathname;
export async function manageWorktree(request) {
  request.signal?.throwIfAborted();
  const args = [cli, request.action === 'bind' ? 'adopt' : request.action, '--cwd', request.cwd, '--task', request.task, '--json'];
  for (const [key, flag] of [['path', '--path'], ['base', '--base'], ['branch', '--branch'], ['integratedInto', '--integrated-into']]) {
    if (request[key] !== undefined) args.push(flag, request[key]);
  }
  if (request.confirm && request.action !== 'status') args.push('--confirm');
  return new Promise((done, reject) => execFile(process.env.TRELLIS_PYTHON || 'python3', args, {
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, signal: request.signal, timeout: 30000,
  }, (error, stdout, stderr) => {
    if (error) { reject(new Error(stderr.trim() || error.message)); return; }
    try { done(JSON.parse(stdout)); } catch (failure) { reject(failure); }
  }));
}
