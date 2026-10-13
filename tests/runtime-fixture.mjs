import { syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { apply, plan, verifyRuntime } from '../lib/initialization/engine.ts';

// Use the real initializer and complete immutable runtime, never bless fake
// scripts with fabricated hashes. Omit only the bootstrap task for count tests.
export function installRuntimeFixture(root) {
 const result = apply(plan(root, 'Fixture'));
 if (result.state !== 'ready' || !verifyRuntime(root)) throw Error('Runtime fixture did not verify');
 rmSync(join(root, '.trellis/tasks/00-bootstrap-guidelines'), { recursive: true });
}

// Adversarial CLI replies / spawn failures belong at the host execution
// boundary. Manifest and Python bytes remain genuinely supported throughout.
export function mockPython(t, root, respond) {
 const original = childProcess.execFile;
 t.mock.method(childProcess, 'execFile', (executable, args, options, callback) => {
  const reply = options?.cwd === root ? respond(args, options) : undefined;
  if (reply === undefined) return original(executable, args, options, callback);
  queueMicrotask(() => callback(reply.code ? Object.assign(Error('Fixture execution failure'), { code: reply.code }) : null, reply.stdout ?? '', ''));
 });
 syncBuiltinESMExports();
 t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
}
