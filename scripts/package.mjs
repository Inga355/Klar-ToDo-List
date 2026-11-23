import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const env = { ...process.env, PATH: `${join(process.env.USERPROFILE || process.env.HOME || '', '.cargo', 'bin')}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}` };
function run(program, args) {
  const result = spawnSync(program, args, { env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run('cargo', ['build', '--release', '--manifest-path', 'src-tauri/Cargo.toml', '--bin', 'klar-mcp', '-j', '2']);
run(process.execPath, ['node_modules/@tauri-apps/cli/tauri.js', 'build', '--bundles', 'nsis', '--config', JSON.stringify({ bundle: { resources: { 'target/release/klar-mcp.exe': 'klar-mcp.exe' } } })]);
