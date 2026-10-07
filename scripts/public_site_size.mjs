import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '_site');
if (path.basename(root) !== '_site') throw Error('Only the prepared _site artifact may be measured');
const groups = new Map();
let files=0,bytes=0;
async function walk(dir) {
  for (const entry of await fs.readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.isFile()) {
      const stat=await fs.stat(file),relative=path.relative(root,file);
      const group=relative.includes(path.sep)?relative.split(path.sep)[0]:'(root files)';
      const value=groups.get(group)||{directory:group,files:0,bytes:0};
      value.files++;value.bytes+=stat.size;groups.set(group,value);files++;bytes+=stat.size;
    } else throw Error('Unexpected non-file artifact entry');
  }
}
await walk(root);
console.log(JSON.stringify({artifact:'_site',files,bytes,largest_directories:[...groups.values()].sort((a,b)=>b.bytes-a.bytes).slice(0,5)}));
