// Guia de apresentação: lê comandos legais e estado público; não decide regras.
export function battleGuide(game,viewer,selected=null){
  const state=game.state,actor=game.actingPlayer,own=actor===viewer,choice=game.choice,stack=game.stack;
  const result={step:'actions',phase:'Alternating actions',title:own?'Your action':'Opponent’s action',instruction:own?'Select a card to inspect it and choose an available action.':'Your opponent is choosing an action. You can inspect cards on the battlefield.',reminder:'One ACTION, then the other player acts. Two consecutive passes end the round.'};
  if(state.victory)return{...result,step:'end',phase:'Duel complete',title:state.victory.draw?'The duel is a draw':`Player ${state.victory.winnerKey} wins`,instruction:'Review the history or start another duel.',reminder:'The complete history remains available until you leave this duel.'};
  if(state.phase==='mulligan')return{...result,step:'opening',phase:'Opening',title:own?'Choose your opening':'Opponent is choosing',instruction:own?(choice?.prompt||'Keep your hand or exchange selected cards once.'):"Wait for the opponent’s opening choice.",reminder:'Start with 7 cards. One partial mulligan is free.'};
  if(choice)return{...result,step:state.phase==='end'?'end':state.priority?'response':'actions',phase:'Choice required',title:own?'Your choice':'Opponent is choosing',instruction:own?choice.prompt:'Wait for the opponent to finish choosing.',reminder:own?'Choose one of the highlighted options to continue.':'Inspect public cards while you wait.'};
  if(state.priority){
    const strike=stack.some(item=>item.command?.type==='strike');
    return{...result,step:'response',phase:strike?'Strike · response window':'Response window',title:own?'You have priority':'Opponent has priority',instruction:own?'Play a legal Technique or response ability, or pass priority.':'Wait for the opponent’s response. The top item resolves first.',reminder:'Two priority passes resolve one stack item. They do not end the round.'};
  }
  if(state.phase==='end')return{...result,step:'end',phase:'Round end',title:'Resolving round end',instruction:'Finish end-of-round effects and required choices.',reminder:'Initiative alternates next round. Marked damage remains until healed.'};
  if(game.resolving)return{...result,phase:'Resolution',title:'Resolving an effect',instruction:'Wait for this effect and any required choices to finish.'};
  if(!own)return result;
  const location=selected?game.locate(selected):null;
  if(location?.playerKey===viewer){
    const actions=game.actions(viewer,selected),types=actions.map(a=>a.type),c=location.cardData;
    if(location.zone==='hand'){
      result.title=c.nome_exibicao_en;
      result.instruction=types.includes('play')?'Play this card, or use another available action in its enlarged view.':types.includes('base')?'This Cosmoble card can become a Base before your ACTION.':'This card has no available action now. Check your resources and choose another card or pass.';
    }else if(c.tipo==='Devotee'){
      result.title=types.includes('strike')?'Ready to Strike':types.includes('engage')?'Choose a confrontation':'Reposition or inspect';
      result.instruction=types.includes('strike')?'Strike an engaged target. The attacker becomes Unprepared; the defender can still retaliate.':types.includes('engage')?'Engage a legal enemy. An Unprepared enemy engaged with your God can receive one additional Devotee Engage. Engage deals no damage.':game.stats(selected).keywords.includes('Sealed')?'Sealed prevents new Strikes and activated abilities. Other legal actions remain available.':'An Unprepared Devotee still retaliates. Use the available actions to reposition it or pass.';
    }else if(types.includes('evolve')){result.title='Owner evolution available';result.instruction='Evolve from the enlarged equipment view. Evolve uses an ACTION and its printed cost.';}
    else if(types.includes('equip')){result.title='Choose a bearer';result.instruction='Equip uses an ACTION and its EQUIP cost. One armor may be attached to each Devotee.';}
    else if(types.includes('ability')){result.title='Ability available';result.instruction='Open this card and activate an available ability. Its costs and limits still apply.';}
  }else if(!state.players[viewer].basePlaced){
    result.instruction='You may first place one Cosmoble card as a Base for free. Then choose your ACTION.';
  }
  if(state.passes===1)result.reminder='One player has passed. If you also pass now, this round ends.';
  return result;
}
export function journalEntries(lines){
  let round=0;
  return lines.map((message,index)=>{
    const start=message.match(/^Round (\d+)\./);if(start)round=Number(start[1]);
    const kind=start?'round':/takes \d+ damage/.test(message)?'damage':/is destroyed|wins|draw\./.test(message)?'result':/resolves\./.test(message)?'resolution':/^Player /.test(message)?'action':'effect';
    return{index,round,message,kind};
  });
}
