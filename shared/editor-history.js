// Histórico em memória: desfazer altera rascunhos, nunca grava arquivos automaticamente.
export function createHistory(initial,{limit=100,now=Date.now,delay=750}={}){
  let entries=[structuredClone(initial)],index=0,lastKey=null,lastTime=0;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  return {
    record(value,key=null){
      if(same(entries[index],value))return false;
      const time=now(),coalesce=key!==null&&key===lastKey&&time-lastTime<delay&&index===entries.length-1&&index>0;
      entries=entries.slice(0,index+1);
      if(coalesce)entries[index]=structuredClone(value);
      else{entries.push(structuredClone(value));index++;if(entries.length>limit+1){entries.shift();index--;}}
      lastKey=key;lastTime=time;return true;
    },
    breakGroup(){lastKey=null;},
    undo(){if(!index)return null;lastKey=null;return structuredClone(entries[--index]);},
    redo(){if(index===entries.length-1)return null;lastKey=null;return structuredClone(entries[++index]);},
    get canUndo(){return index>0;},get canRedo(){return index<entries.length-1;}
  };
}
