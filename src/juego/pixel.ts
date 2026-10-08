// Pintado pixel-art: se renderiza a un tercio de resolución y un shader dibuja contornos y aristas.
// Sacado del motor de maquetas de La Hemeroteca Perdida.
import * as THREE from 'three';
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const FRAG = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tNormal;
  uniform sampler2D tDepth;
  uniform vec2 resolucion;
  uniform float fuerzaContorno;
  uniform float fuerzaArista;
  varying vec2 vUv;

  float prof(vec2 uv) { return texture2D(tDepth, uv).r; }
  vec3 normal(vec2 uv) { return texture2D(tNormal, uv).rgb * 2.0 - 1.0; }

  void main() {
    vec2 t = 1.0 / resolucion;
    vec4 color = texture2D(tColor, vUv);
    float d = prof(vUv);
    vec3 n = normal(vUv);
    vec2 vecinos[4];
    vecinos[0] = vec2(0.0, t.y); vecinos[1] = vec2(0.0, -t.y); vecinos[2] = vec2(t.x, 0.0); vecinos[3] = vec2(-t.x, 0.0);

    // Contorno: algún vecino está claramente más lejos que este píxel
    float diffProf = 0.0;
    for (int i = 0; i < 4; i++) diffProf += clamp(prof(vUv + vecinos[i]) - d, 0.0, 1.0);
    float contorno = step(0.0025, diffProf);

    // Arista: cambio de orientación de la cara, solo si el vecino no está delante
    float arista = 0.0;
    vec3 sesgo = normalize(vec3(1.0, 1.0, 1.0));
    for (int i = 0; i < 4; i++) {
      vec3 nv = normal(vUv + vecinos[i]);
      float dv = prof(vUv + vecinos[i]);
      float cambio = clamp(1.0 - dot(n, nv), 0.0, 1.0);
      float lado = step(0.0, dot(n - nv, sesgo));
      arista += cambio * lado * step(d - 0.0015, dv);
    }
    arista = step(0.2, arista);

    vec3 c = color.rgb;
    c = mix(c, c * (1.0 + fuerzaArista), arista * (1.0 - contorno));
    c = mix(c, c * (1.0 - fuerzaContorno), contorno);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Canal de pintado pixel-art: render a baja resolución + pasada de contornos y aristas. Lo comparten maquetas y juegos. */
export function crearPixelado(renderer: THREE.WebGLRenderer) {
  let rtColor: THREE.WebGLRenderTarget | undefined, rtNormal: THREE.WebGLRenderTarget | undefined;
  const materialNormal = new THREE.MeshNormalMaterial();
  const post = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, tNormal: { value: null }, tDepth: { value: null }, resolucion: { value: new THREE.Vector2() }, fuerzaContorno: { value: 0.55 }, fuerzaArista: { value: 0.28 } },
    vertexShader: VERT, fragmentShader: FRAG,
  });
  const escenaPost = new THREE.Scene();
  escenaPost.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const camaraPost = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    ajustar(ancho: number, alto: number, tamPixel: number, pixel = true) {
      const lw = Math.max(1, Math.floor(ancho / tamPixel)), lh = Math.max(1, Math.floor(alto / tamPixel));
      renderer.setSize(pixel ? lw : ancho, pixel ? lh : alto, false);
      rtColor?.dispose(); rtNormal?.dispose();
      const opc = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false };
      const prof = new THREE.DepthTexture(lw, lh, THREE.UnsignedInt248Type); prof.format = THREE.DepthStencilFormat; // con stencil: para las siluetas de la gente
      rtColor = new THREE.WebGLRenderTarget(lw, lh, { ...opc, depthTexture: prof, stencilBuffer: true });
      rtColor.texture.colorSpace = THREE.SRGBColorSpace;
      rtNormal = new THREE.WebGLRenderTarget(lw, lh, opc);
      post.uniforms.resolucion.value.set(lw, lh);
    },
    /** `encima`: se llama con la pasada de color aún activa (para pintar siluetas sobre lo ya dibujado). */
    dibujar(escena: THREE.Scene, camara: THREE.Camera, pixel = true, encima?: () => void) {
      if (!pixel || !rtColor || !rtNormal) { renderer.setRenderTarget(null); renderer.render(escena, camara); return; }
      renderer.setRenderTarget(rtColor); renderer.render(escena, camara); encima?.();
      escena.overrideMaterial = materialNormal;
      renderer.setRenderTarget(rtNormal); renderer.render(escena, camara);
      escena.overrideMaterial = null;
      post.uniforms.tColor.value = rtColor.texture; post.uniforms.tNormal.value = rtNormal.texture; post.uniforms.tDepth.value = rtColor.depthTexture;
      renderer.setRenderTarget(null); renderer.render(escenaPost, camaraPost);
    },
    destruir() { rtColor?.dispose(); rtNormal?.dispose(); },
  };
}

// ---------- Utilidades para construir escenas ----------
export const mat = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

/** Bloque con las caras inclinadas (talud): la tapa superior es más pequeña que la base. */
export function talud(ancho: number, fondo: number, altoBloque: number, inclinacion: number, material: THREE.Material) {
  const g = new THREE.BoxGeometry(ancho, altoBloque, fondo);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) { pos.setX(i, pos.getX(i) * (1 - inclinacion)); pos.setZ(i, pos.getZ(i) * (1 - inclinacion * ancho / fondo)); }
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function caja(ancho: number, alto: number, fondo: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), material);
  m.position.set(x, y + alto / 2, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
/** Generador pseudoaleatorio con semilla, para que la maqueta salga siempre igual. */
export function azar(semilla: number) { let s = semilla >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
