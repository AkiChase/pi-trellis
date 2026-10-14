import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceBlock } from '../lib/initialization/engine.ts';
const start='<!-- TRELLIS:START -->', end='<!-- TRELLIS:END -->', block=Buffer.from(`${start}\nnew\n${end}\n`);
test('replacement preserves non-UTF8 and Unicode bytes outside the sole owned block',()=>{
 const prefix=Buffer.from([255,0,195,169]),suffix=Buffer.from('\r\n# User instructions\r\n');
 assert.deepEqual(replaceBlock(Buffer.concat([prefix,Buffer.from(`${start}old${end}`),suffix]),block,start,end),Buffer.concat([prefix,Buffer.from(block.toString().trimEnd()),suffix]));
 assert.deepEqual(replaceBlock(undefined,block,start,end),block);
 assert.equal(replaceBlock(Buffer.from('outside'),block,start,end).toString(),`outside\n${block}`);
});
for(const input of [start,end,`${end}${start}`,`${start}${start}${end}`,`${start}${end}${end}`,'<!-- TRELLIS:STAR -->'])test(`malformed block refused: ${input}`,()=>assert.throws(()=>replaceBlock(Buffer.from(input),block,start,end)));
