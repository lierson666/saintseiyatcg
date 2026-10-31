// Entrada do Three.js enxuto do duelo (playtest/divine/vendor/three-0.160.0-slim.js). Recriar, numa pasta com three@0.160.0 e esbuild instalados:
//   npx esbuild three-slim.entry.js --bundle --format=esm --minify --legal-comments=eof --outfile=three-0.160.0-slim.js
export {Mesh, ShaderMaterial, BufferAttribute, AdditiveBlending, InstancedMesh, DynamicDrawUsage, WebGLRenderer, Vector3, Scene, Points,
  MeshStandardMaterial, MeshBasicMaterial, DoubleSide, CircleGeometry, BufferGeometry, BoxGeometry, SphereGeometry, RingGeometry, PlaneGeometry,
  PerspectiveCamera, OrthographicCamera, Matrix4, HemisphereLight, Fog, DirectionalLight, CylinderGeometry, ConeGeometry, Color, CanvasTexture, BackSide} from 'three';
