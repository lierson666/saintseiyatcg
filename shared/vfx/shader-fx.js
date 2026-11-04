// VFX Forge V3: um único renderer Pixi (WebGL) desenha todos os efeitos e copia o quadro para o canvas 2D de cada carta.
// Assim dezenas de cartas não gastam dezenas de contextos WebGL. O Pixi só é baixado quando algum efeito aparece.
import {shaderOf} from './presets.js';

let lib = null, app = null, starting = null;
const textures = new Map(); // url → {texture, users}: cache pequeno; a mais antiga sem uso sai da GPU
const MAX_TEXTURES = 12;

// Um shader para tudo: mais barato que encadear filtros e igual em todos os perfis.
const FRAGMENT = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform highp vec4 uInputSize;
uniform highp vec4 uOutputFrame;
uniform float uTime;
uniform float uStrength;
uniform float uHasArt;
uniform int uMode;
uniform vec2 uPointer;
uniform vec3 uColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
float fall(float a,float x){return 1.-smoothstep(0.,a,x);} // smoothstep com limites invertidos é indefinido em GLSL
vec3 rainbow(float t){return .5+.5*cos(6.2831*(t+vec3(0.,.33,.67)));}
void main(){
  vec2 k=uInputSize.xy/uOutputFrame.zw, uv=vTextureCoord*k, off=vec2(0.);
  float s=uStrength,t=uTime;
  if(uMode==3)off=vec2(sin(uv.y*24.+t*2.)+sin(uv.y*9.-t),cos(uv.x*20.+t*1.6))*.006*s;
  if(uMode==4)off=vec2(noise(vec2(uv.x*14.,uv.y*10.+t*2.2))-.5,noise(vec2(uv.x*9.,uv.y*12.+t*3.))-.5)*.035*s*(1.-uv.y*.6);
  if(uMode==12)off=(vec2(fbm(uv*7.+t*.25),fbm(uv*7.-t*.2+4.))-.5)*.05*s;
  if(uMode==11)off=(vec2(fbm(uv*5.+t*.2),fbm(uv*5.+7.))-.5)*.02*s;
  vec4 art=texture(uTexture,clamp(uv+off,0.,1.)/k);
  if(uMode==7){float a=.012*s*(.7+.3*sin(t*2.));art.r=texture(uTexture,clamp(uv+vec2(a,0.),0.,1.)/k).r;art.b=texture(uTexture,clamp(uv-vec2(a,0.),0.,1.)/k).b;}
  vec3 col=art.rgb;float lum=dot(col,vec3(.299,.587,.114)),add=0.,alpha=art.a;
  vec3 tint=uColor;
  if(uMode==0){add=(pow(lum,2.)*.9+smoothstep(.45,.95,distance(uv,vec2(.5)))*.35)*(.75+.25*sin(t*1.6))*s;}
  else if(uMode==1||uMode==2){float a=uv.x*1.2+uv.y*.8+uPointer.x*.6-uPointer.y*.4+t*.07;float bands=uMode==1?.5+.5*sin(a*18.):1.;tint=mix(uColor,rainbow(a*(uMode==1?1.5:2.5)),.85);add=bands*(.25+.75*pow(lum,1.4))*s*(uMode==1?.55:.42);}
  else if(uMode==3){add=pow(fbm(uv*vec2(9.,13.)+vec2(t*.2,t*.35)),3.)*1.1*s;}
  else if(uMode==4){add=pow(1.-uv.y,3.)*fbm(uv*6.-vec2(0.,t*1.3))*.9*s;}
  else if(uMode==5){float e=smoothstep(.22,.62,distance(uv,vec2(.5)));add=e*(fbm(uv*5.+vec2(t*.3,-t*.2))+.2)*1.15*s;}
  else if(uMode==6){float d=distance(uv,vec2(.5));float r=fract(t*.45);add=fall(.05,abs(d-r*.75))*(1.-r)*1.6*s;}
  else if(uMode==8){float n=fbm(uv*8.),c=.5+.5*sin(t*.7);float cut=c*s;if(n<cut)alpha=0.;add=fall(.06,abs(n-cut))*1.8*step(.001,cut);if(uHasArt>.5&&alpha==0.)col=vec3(0.);}
  else if(uMode==9){float flash=step(.8,noise(vec2(t*5.,1.)));float x=.5+(noise(vec2(uv.y*7.,floor(t*7.)))-.5)*.65;add=(fall(.016,abs(uv.x-x))*1.8+fall(.18,abs(uv.x-x))*.25)*flash*s;}
  else if(uMode==10){vec2 p=uv-vec2(.5,-.1);float rays=.5+.5*sin(atan(p.x,p.y)*22.+t*.7);add=rays*pow(max(0.,1.-length(p)*.85),1.6)*1.05*s;}
  else if(uMode==11){col*=1.-.65*s*(1.-smoothstep(.25,.55,fbm(uv*6.+t*.12)));add=pow(fbm(uv*9.-vec2(0.,t*.35)),3.)*1.5*s;}
  else if(uMode==12){add=pow(fbm(uv*14.+t*.3),4.)*2.*s;}
  else if(uMode==13){add=(noise(uv*vec2(170.,240.)+t*40.)-.35)*.3*s;}
  else if(uMode==14){vec2 g=uv*vec2(26.,36.);vec2 c=floor(g);float st=step(.93,hash(c));add=st*fall(.2,distance(fract(g),vec2(.5)))*(.45+.55*sin(t*2.+hash(c)*6.28))*1.5*s;}
  vec3 result=col+tint*max(add,-1.);
  float fxA=clamp(max(add,0.),0.,1.);
  finalColor=uHasArt>.5?vec4(result*(alpha>0.?1.:0.)+tint*fxA*(1.-alpha),max(alpha,fxA)):vec4(tint*fxA,fxA);
}`;

const hex = color => { const n = parseInt(String(color || '#ffffff').slice(1), 16) || 0xffffff; return new Float32Array([(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]); };

async function ready() {
  if (app) return;
  starting ??= (async () => {
    lib = await import(new URL('../vendor/pixi-fx.js', import.meta.url).href);
    const a = new lib.Application();
    await a.init({preference: 'webgl', backgroundAlpha: 0, width: 16, height: 16, antialias: false, autoStart: false, sharedTicker: false, preserveDrawingBuffer: true, powerPreference: 'low-power'});
    app = a;
  })();
  await starting;
}
export const available = () => { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2') || !!c.getContext('webgl'); } catch { return false; } };

function uberFilter(modo, cor) {
  return lib.Filter.from({
    gl: {vertex: lib.defaultFilterVert, fragment: FRAGMENT, name: 'sstcg-card-fx'},
    resources: {fx: {uTime: {value: 0, type: 'f32'}, uStrength: {value: 1, type: 'f32'}, uHasArt: {value: 1, type: 'f32'}, uMode: {value: modo, type: 'i32'}, uPointer: {value: new Float32Array([0, 0]), type: 'vec2<f32>'}, uColor: {value: hex(cor), type: 'vec3<f32>'}}},
  });
}
function matrix(name) { const f = new lib.ColorMatrixFilter(); f[name](name === 'greyscale' ? .6 : name === 'night' ? .6 : true, true); return f; }
const READY_MADE = {
  sepia: () => matrix('sepia'), vintage: () => matrix('vintage'), kodachrome: () => matrix('kodachrome'), night: () => matrix('night'), greyscale: () => matrix('greyscale'),
  blur: s => new lib.BlurFilter({strength: 2 + 8 * s, quality: 2}), noise: s => new lib.NoiseFilter({noise: .1 + .4 * s}),
  bloom: s => new lib.AdvancedBloomFilter({threshold: .55, bloomScale: .6 + 1.2 * s, brightness: 1, blur: 4, quality: 3}),
  godray: s => new lib.GodrayFilter({gain: .25 + .4 * s, lacunarity: 2.4, alpha: .7 + .3 * s, parallel: true, angle: 30}),
  glitch: s => new lib.GlitchFilter({slices: 6, offset: 12 * s, seed: .3}), oldfilm: s => new lib.OldFilmFilter({sepia: .3 * s, noise: .2 * s, scratch: .4 * s}),
  crt: s => new lib.CRTFilter({curvature: 1, lineWidth: 2, lineContrast: .25 * s, noise: .12 * s, vignetting: .3}),
  reflection: () => new lib.ReflectionFilter({mirror: false, boundary: .55, amplitude: [0, 10], waveLength: [30, 90]}),
  shockwave: (s, w, h) => new lib.ShockwaveFilter({center: {x: w / 2, y: h / 2}, amplitude: 18 * s, wavelength: 90, speed: 240, radius: -1}),
};

function evict() {
  for (const [url, item] of textures) {
    if (textures.size <= MAX_TEXTURES) return;
    if (!item.users) { textures.delete(url); item.texture.destroy(true); } // em uso nunca sai: o cache pode passar do teto até a carta sair da tela
  }
}
async function artTexture(url) {
  if (textures.has(url)) { const hit = textures.get(url); textures.delete(url); textures.set(url, hit); hit.users++; return hit.texture; } // o último usado fica no fim
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error(`Arte não abriu: ${url}`)); image.src = url; }); // decode() para em aba oculta
  const texture = new lib.Texture({source: new lib.ImageSource({resource: image})});
  if (textures.has(url)) { texture.destroy(true); textures.get(url).users++; return textures.get(url).texture; } // duas cartas pediram ao mesmo tempo
  textures.set(url, {texture, users: 1});
  evict();
  return texture;
}

// Um efeito pronto para desenhar. `art` ausente: efeito sobre fundo transparente (camada do Composer sobre a mesa).
// Falha (sem WebGL, shader recusado, arte que não abre) sobe como erro: quem chama fica com a arte original.
export async function createShaderLayer({shader, art = null, width, height, forca = .6, velocidade = 1, cor = null, profile}) {
  await ready();
  const def = shaderOf(shader);
  if (!def) throw Error(`Shader desconhecido: ${shader}`);
  const sprite = new lib.Sprite(art ? await artTexture(art) : lib.Texture.WHITE); // sem arte o shader ignora o branco (uHasArt)
  sprite.width = width; sprite.height = height;
  const useReady = def.pixi && (profile?.pixi || def.modo == null); // só-Pixi em qualquer perfil; os com modo só em HIGH
  const uber = def.modo != null && !useReady ? uberFilter(def.modo, cor || def.cor) : null;
  if (uber) uber.resources.fx.uniforms.uHasArt = art ? 1 : 0;
  const filter = uber || READY_MADE[def.pixi](forca, width, height);
  sprite.filters = [filter];
  const output = document.createElement('canvas');
  output.width = width; output.height = height;
  output.className = 'vfx-layer';
  const ctx = output.getContext('2d');
  const started = performance.now();
  return {
    canvas: output,
    animated: !!uber || !['sepia', 'vintage', 'kodachrome', 'night', 'greyscale', 'blur'].includes(def.pixi),
    draw(pointer = null) {
      const t = (performance.now() - started) / 1000 * velocidade;
      if (uber) {
        const u = uber.resources.fx.uniforms;
        u.uTime = t; u.uStrength = forca;
        if (pointer) u.uPointer = new Float32Array([pointer.x, pointer.y]);
      } else {
        if ('time' in filter) filter.time = t;
        if ('seed' in filter) filter.seed = t % 1;
      }
      app.renderer.resize(width, height);
      app.renderer.render({container: sprite, clear: true});
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(app.canvas, 0, 0, width, height);
    },
    dispose() { sprite.filters = []; filter.destroy?.(); sprite.destroy(); const item = art && textures.get(art); if (item) { item.users--; evict(); } },
  };
}
export function shaderStats() { return {texturas: textures.size, carregado: !!app}; }
