import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const folder=new URL('../src/shared-assessment/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',folder),'utf8'));
for(const [name,expected] of Object.entries(manifest)){
 const actual=createHash('sha256').update(readFileSync(new URL(name,folder))).digest('hex');
 if(actual!==expected)throw new Error(`Shared assessment UI changed: ${name}. Sync both portals and update the shared manifest together.`);
}
console.log('Shared ATS Fit and Scorecard source checks passed.');
