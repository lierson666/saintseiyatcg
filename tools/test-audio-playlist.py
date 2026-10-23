"""Verifica áudio real, fim de faixa, ciclos aleatórios e troca de tela no Chrome."""
import argparse
import json
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:8765')
args = parser.parse_args()
expected = {p.name for p in (ROOT / 'MUSIC').iterdir() if p.is_file() and p.suffix.lower() == '.mp3'}
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='chrome')
    page = browser.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    # Instrumenta os elementos reais, sem substituir reprodução ou decodificação.
    page.add_init_script("""
      const OriginalAudio=window.Audio;
      window.Audio=function(...args){
        const audio=new OriginalAudio(...args);
        (window.__qaAudio??=[]).push(audio);
        return audio;
      };
      localStorage.setItem('ssTcgSanctuary',JSON.stringify({music:.28,sfx:.58,autoPass:false,hotseatPrivacy:false}));
    """)
    page.goto(args.url + '/playtest/')
    page.get_by_role('button', name='Press to begin').click()
    page.wait_for_function('__qaAudio?.at(-1)?.currentTime>0')
    assert page.evaluate('__qaAudio[0].loop && __qaAudio[0].src.endsWith("PEGASUS%20TYU%20SEI%20KEN.mp3")')
    page.get_by_role('button', name='Local battle').click()
    page.select_option('#setup-first', 'A')
    page.get_by_role('button', name='Begin duel').click()
    page.wait_for_function('__qaAudio.length===2 && __qaAudio[1].currentTime>0')
    assert page.evaluate('__qaAudio[1].src.endsWith("/MUSIC/battle") && !__qaAudio[1].loop')
    assert page.evaluate('__qaAudio[0].paused && !__qaAudio[0].hasAttribute("src")')
    # A abertura termina pelo evento nativo; os demais fins são antecipados.
    page.evaluate('__qaAudio[1].playbackRate=16')
    page.wait_for_function('!__qaAudio[1].src.endsWith("/battle") && __qaAudio[1].currentTime>0')
    page.evaluate('__qaAudio[1].playbackRate=1')
    played = []
    for index in range(len(expected) * 2):
        src = page.evaluate('__qaAudio[1].src')
        played.append(Path(unquote(urlparse(src).path)).name)
        assert page.evaluate('__qaAudio[1].duration>0 && !__qaAudio[1].error && !__qaAudio[1].loop')
        if index < len(expected) * 2 - 1:
            page.evaluate('__qaAudio[1].dispatchEvent(new Event("ended"))')
            page.wait_for_function('(previous)=>__qaAudio[1].src!==previous && __qaAudio[1].currentTime>0', arg=src)
    for start in range(0, len(played), len(expected)):
        assert set(played[start:start + len(expected)]) == expected, played
    assert all(a != b for a, b in zip(played, played[1:])), played
    page.evaluate("async()=>{const a=await import('./audio.js');a.setVolume('music',0)}")
    assert page.evaluate('__qaAudio[1].volume') == 0
    page.evaluate("async()=>{const a=await import('./audio.js');a.setVolume('music',.22);a.playMusic('battle')}")
    assert page.evaluate('__qaAudio.length===2 && __qaAudio[1].volume===.22')
    page.get_by_role('button', name='Keep hand', exact=True).click()
    page.get_by_role('button', name='Keep hand', exact=True).click()
    page.get_by_role('button', name='Duel options', exact=True).click()
    page.get_by_role('button', name='Concede', exact=True).click()
    page.get_by_role('button', name='Duel again', exact=True).click()
    page.wait_for_function('__qaAudio.length===3 && __qaAudio[2].currentTime>0')
    assert page.evaluate('__qaAudio[2].src.endsWith("/MUSIC/battle") && __qaAudio[2].volume===.22')
    assert page.evaluate('__qaAudio[1].paused && !__qaAudio[1].hasAttribute("src")')
    page.evaluate('__qaAudio[1].dispatchEvent(new Event("ended"))')
    assert page.evaluate('__qaAudio[2].src.endsWith("/MUSIC/battle")')
    page.get_by_role('button', name='Keep hand', exact=True).click()
    page.get_by_role('button', name='Keep hand', exact=True).click()
    page.get_by_role('button', name='Duel options', exact=True).click()
    page.get_by_role('button', name='Main menu', exact=True).click()
    page.wait_for_function('__qaAudio.length===4 && __qaAudio[3].currentTime>0')
    assert page.evaluate('__qaAudio[3].loop && __qaAudio[3].src.endsWith("PEGASUS%20TYU%20SEI%20KEN.mp3")')
    assert page.evaluate('__qaAudio[2].paused && !__qaAudio[2].hasAttribute("src")')
    assert errors == [], errors
    browser.close()
print(json.dumps({'ok': True, 'ciclos_testados': 2, 'faixas': sorted(expected), 'erros_js': errors}, ensure_ascii=False))
