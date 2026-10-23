// Preferências de aparência. Não são enviadas ao motor nem concedem vantagens mecânicas.
import {escapeText as escape} from '../shared/card-text.js';
export const TOKENS=[{id:'constellation',name:'Star Hill',glyph:'✧'},{id:'solar',name:'Solar seal',glyph:'☉'},{id:'lunar',name:'Lunar crystal',glyph:'◇'}];
export const SLEEVES=[{id:'sanctuary',name:'Sanctuary gold'},{id:'ocean',name:'Ocean depths'},{id:'underworld',name:'Underworld'}];
export const EMOTES=[{id:'greeting',text:'May the stars guide you.'},{id:'respect',text:'A worthy opponent.'},{id:'cosmo',text:'Let your Cosmo burn!'},{id:'thinking',text:'The stars are still speaking…'},{id:'played',text:'A remarkable move.'},{id:'farewell',text:'Until our paths cross again.'}];
export function renderAdvantage(state,skin){
  const token=TOKENS.find(t=>t.id===skin)||TOKENS[0];
  return `<div class="advantage-token advantage-token--${token.id}" data-owner="${state.initiative}" role="img" aria-label="Advantage token: Player ${state.initiative} has initiative this round"><span class="advantage-token__orbit" aria-hidden="true"></span><span class="advantage-token__seal" aria-hidden="true">${token.glyph}</span><span class="advantage-token__copy"><b>ADVANTAGE · ${state.initiative}</b><small>Round ${state.round} initiative</small></span></div>`;
}
export function sleeve(id){const skin=SLEEVES.find(s=>s.id===id)||SLEEVES[0];return `<span class="card-sleeve card-sleeve--${skin.id}" aria-hidden="true"><i>✧</i></span>`;}
export function cosmeticSettings(settings){
  return `<section class="cosmetic-settings"><h2>Cosmetics</h2><p class="settings-note">Personalize your advantage token, card backs and God emotes.</p><label class="setting-row"><span><strong>Advantage token</strong><small>Shows initiative; its appearance never changes rules.</small></span><select data-setting="tokenSkin">${TOKENS.map(t=>`<option value="${t.id}" ${settings.tokenSkin===t.id?'selected':''}>${t.name}</option>`).join('')}</select></label><label class="setting-row"><span><strong>Card sleeves</strong></span><select data-setting="sleeveSkin">${SLEEVES.map(t=>`<option value="${t.id}" ${settings.sleeveSkin===t.id?'selected':''}>${t.name}</option>`).join('')}</select></label><label class="setting-row"><span><strong>Show God emotes</strong><small>Short messages spoken by the God’s portrait.</small></span><input type="checkbox" data-setting="emotes" ${settings.emotes?'checked':''}></label></section>`;
}
export function renderEmotePicker(){return `<div class="emote-picker" aria-label="God emotes">${EMOTES.map(e=>`<button data-action="emote" data-emote="${e.id}">${escape(e.text)}</button>`).join('')}</div>`;}
