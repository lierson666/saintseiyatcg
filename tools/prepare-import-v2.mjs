// Gera somente arquivos de revisão. O catálogo é gravado apenas após aprovação do diff.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compilePlaytest} from '../shared/import-playtest.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=new URL('../docs/importacao-300-cartas/',import.meta.url);
const source=JSON.parse(await fs.readFile(new URL('fonte.json',dir),'utf8'));
const cards=await compilePlaytest(source);
await fs.writeFile(new URL('cartas-candidatas.json',dir),JSON.stringify(cards,null,2)+'\n');
const result=spawnSync('python3',[fileURLToPath(new URL('./preview-card-import.py',import.meta.url))],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
