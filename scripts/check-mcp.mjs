import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const binary = resolve(process.argv[2] || 'src-tauri/target/release/klar-mcp.exe');
const requests = [
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'klar-protocol-check', version: '1' } } },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/list' },
];
const processResult = spawnSync(binary, [], { input: requests.map(r => JSON.stringify(r)).join('\n') + '\n', encoding: 'utf8', timeout: 15000, windowsHide: true });
assert.equal(processResult.status, 0, processResult.error?.message || processResult.stderr);
const responses = processResult.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line));
assert.equal(responses.length, 2);
assert.equal(responses[0].result.protocolVersion, '2025-03-26');
assert.deepEqual(responses[1].result.tools.map(t => t.name), ['list_tasks', 'create_task', 'update_task', 'complete_task']);
console.log('MCP-Prozessprüfung bestanden: Handshake, Benachrichtigungen und vier Werkzeuge. Keine Aufgaben gelesen oder geändert.');
