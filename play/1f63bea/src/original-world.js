// Retained Wilderlight world, actors and camera choreography. Scoped to one Canvas.
export function sourceWorld(THREE){
const __THREE__=THREE;
var originalWorld = (function(exports, three) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	three = __toESM(three, 1);
	// source: oilpaint/common.js
	var SUN = new three.Vector3(-.44, .5, -.75).normalize();
	var WIND = new three.Vector2(.8, .6).normalize();
	var blank = (r, g, b, a) => {
		const t = new three.DataTexture(new Uint8Array([
			r,
			g,
			b,
			a
		]), 1, 1);
		t.needsUpdate = true;
		return t;
	};
	/** A tiling noise sheet: four unrelated smooth noises in the four channels, with mipmaps. */
	function noiseSheet(size = 256, seed = 7) {
		let s = seed >>> 0;
		const rnd = () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296;
		const data = new Uint8Array(size * size * 4);
		for (let ch = 0; ch < 4; ch++) {
			const field = new Float32Array(size * size);
			for (const [cells, amp] of [
				[8, 1],
				[16, .5],
				[32, .25],
				[64, .125]
			]) {
				const lat = new Float32Array(cells * cells);
				for (let i = 0; i < lat.length; i++) lat[i] = rnd();
				for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
					const fx = x / size * cells, fy = y / size * cells;
					const x0 = Math.floor(fx), y0 = Math.floor(fy);
					let tx = fx - x0, ty = fy - y0;
					tx = tx * tx * (3 - 2 * tx);
					ty = ty * ty * (3 - 2 * ty);
					const a = lat[x0 % cells + y0 % cells * cells], b = lat[(x0 + 1) % cells + y0 % cells * cells];
					const c = lat[x0 % cells + (y0 + 1) % cells * cells], d = lat[(x0 + 1) % cells + (y0 + 1) % cells * cells];
					field[x + y * size] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
				}
			}
			let lo = Infinity, hi = -Infinity;
			for (const v of field) {
				lo = Math.min(lo, v);
				hi = Math.max(hi, v);
			}
			for (let i = 0; i < field.length; i++) data[i * 4 + ch] = Math.round((field[i] - lo) / (hi - lo) * 255);
		}
		const t = new three.DataTexture(data, size, size);
		t.wrapS = t.wrapT = three.RepeatWrapping;
		t.minFilter = three.LinearMipmapLinearFilter;
		t.magFilter = three.LinearFilter;
		t.generateMipmaps = true;
		t.needsUpdate = true;
		return t;
	}
	function createShared() {
		return {
			uTime: { value: 0 },
			uPixel: { value: .001 },
			uSunDir: { value: SUN.clone() },
			uWind: { value: new three.Vector3(WIND.x, WIND.y, 1) },
			uExtent: { value: 96 },
			tHeight: { value: blank(0, 0, 0, 0) },
			tLand: { value: blank(0, 0, 128, 0) },
			tNoise: { value: noiseSheet() },
			tBrush: { value: blank(255, 255, 128, 255) },
			tTreeShade: { value: null },
			uTreeShadeMat: { value: new three.Matrix4() },
			tFigShade: { value: null },
			uFigShadeMat: { value: new three.Matrix4() },
			uHaze: { value: new three.Color(.6, .6, .67) },
			uHazeSun: { value: new three.Color(1, .89, .62) },
			uHazeDensity: { value: .0105 },
			uHazeGlow: { value: new three.Color(.1, .08, .02) },
			uShadeBias: { value: 9e-4 },
			uBounce: { value: new three.Color(.1, .045, 0) },
			uLamp: { value: new three.Vector4(0, 0, 0, 0) },
			uLampCol: { value: new three.Color(1, .62, .25) },
			uGlazeMul: { value: new three.Color(.5, .38, .46) },
			uGlazeAdd: { value: new three.Color(.03, .02, .06) },
			uImpasto: { value: 1 },
			uFocus: { value: new three.Vector3() }
		};
	}
	var COMMON = `
precision highp float;
precision highp sampler2DShadow;
#define TAU 6.28318530718
uniform float uTime;
uniform float uPixel;
uniform vec3 uSunDir;
uniform vec3 uWind;
uniform float uExtent;
uniform sampler2D tHeight;
uniform sampler2D tLand;
uniform sampler2D tNoise;
uniform sampler2D tBrush;
uniform sampler2DShadow tTreeShade;
uniform mat4 uTreeShadeMat;
uniform sampler2DShadow tFigShade;
uniform mat4 uFigShadeMat;
uniform vec3 uHaze;
uniform vec3 uHazeSun;
uniform float uHazeDensity;
uniform vec3 uHazeGlow;
uniform float uShadeBias;
uniform vec3 uBounce;
uniform vec4 uLamp;
uniform vec3 uLampCol;
uniform vec3 uGlazeMul;
uniform vec3 uGlazeAdd;
uniform float uImpasto;
uniform vec3 uFocus;

vec4 hash4(vec2 p, float salt) {
  vec4 q = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099) + salt * 0.0713);
  q += dot(q, q.wzxy + 33.33);
  return fract((q.xxyz + q.yzzw) * q.zywx);
}
vec4 hash4(float n) {
  vec4 q = fract(vec4(n) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  q += dot(q, q.wzxy + 33.33);
  return fract((q.xxyz + q.yzzw) * q.zywx);
}

vec2 landUv(vec2 xz) { return (xz + uExtent) / (2.0 * uExtent) * (256.0 / 257.0) + 0.5 / 257.0; }
float heightAt(vec2 xz) { return texture(tHeight, landUv(xz)).r; }
vec3 normalAt(vec2 xz) {
  const float e = 0.75;
  float hx = heightAt(xz + vec2(e, 0.0)) - heightAt(xz - vec2(e, 0.0));
  float hz = heightAt(xz + vec2(0.0, e)) - heightAt(xz - vec2(0.0, e));
  return normalize(vec3(-hx, 2.0 * e, -hz));
}

// Wind: bands crossing the wood with the wind, stretched along their fronts, with finer squalls inside.
float gustAt(vec2 xz) {
  vec2 w = uWind.xy;
  vec2 q = vec2(dot(xz, w), dot(xz, vec2(-w.y, w.x)));
  float a = texture(tNoise, vec2(q.x - uTime * 4.0, q.y * 0.45) / 95.0).r;
  float b = texture(tNoise, vec2(q.x - uTime * 6.5, q.y * 0.6) / 23.0 + 0.37).g;
  return clamp(smoothstep(0.36, 0.74, a) * 0.8 + (b - 0.5) * 0.6, 0.0, 1.0) * uWind.z;
}

// 1 in the sun, 0 in the wood's shade. That shade never moves, so a dab can take it whole.
float woodSunAt(vec3 world) {
  vec4 t = uTreeShadeMat * vec4(world, 1.0);
  float lit = smoothstep(0.56, 0.62, texture(tNoise, world.xz / 29.0).r); // beyond the picture of the shade: patches
  if (t.x > 0.0 && t.x < 1.0 && t.y > 0.0 && t.y < 1.0 && t.z < 1.0) lit = texture(tTreeShade, vec3(t.xy, t.z - uShadeBias));
  return lit;
}
// The wanderer's own shadow moves all the time (he breathes, his cloak blows), so it is read soft: a few looks
// round the spot, which turns its edge into a gradual thing instead of a line that dabs flick across.
float figSunSoft(vec3 f) {
  if (f.x <= 0.0 || f.x >= 1.0 || f.y <= 0.0 || f.y >= 1.0 || f.z >= 1.0) return 1.0;
  float z = f.z - 0.004;
  const float e = 0.013;
  float s = texture(tFigShade, vec3(f.xy, z)) * 0.28;
  s += texture(tFigShade, vec3(f.xy + vec2(e, e * 0.4), z)) * 0.18;
  s += texture(tFigShade, vec3(f.xy + vec2(-e * 0.4, e), z)) * 0.18;
  s += texture(tFigShade, vec3(f.xy + vec2(-e, -e * 0.4), z)) * 0.18;
  s += texture(tFigShade, vec3(f.xy + vec2(e * 0.4, -e), z)) * 0.18;
  return s;
}
float figSunAt(vec3 world) { return figSunSoft((uFigShadeMat * vec4(world, 1.0)).xyz); }
float sunAt(vec3 world) { return min(woodSunAt(world), figSunAt(world)); }

// The painter's three mixes. x is how lit the spot is; r moves the edges about so that one zone breaks into
// the next dab by dab.
vec3 paint3(vec3 cl, vec3 cm, vec3 cs, float x, float r) {
  x += (r - 0.5) * 0.2;
  vec3 c = mix(cs, cm, smoothstep(0.24, 0.36, x));
  return mix(c, cl, smoothstep(0.56, 0.7, x));
}

// Broken colour: every dab is mixed a little differently on the palette (value, hue, strength).
vec3 jitter(vec3 c, vec3 r, float amount) {
  float a = (r.y - 0.5) * 0.9 * amount;
  vec3 k = vec3(0.57735);
  c = c * cos(a) + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - cos(a));
  float g = dot(c, vec3(0.3, 0.59, 0.11));
  c = mix(vec3(g), c, 1.0 + (r.z - 0.5) * 0.7 * amount);
  return max(c * (1.0 + (r.x - 0.5) * 0.5 * amount), 0.0);
}

// Mist: it lies low among the trunks, takes the sun's colour toward the sun and a grey violet away from it, and
// is what puts distance between one row of trees and the next.
vec3 airColour(vec3 v) {
  float sunward = max(dot(v, uSunDir), 0.0);
  vec3 air = mix(uHaze, uHazeSun, sunward * sunward);
  return air + uHazeGlow * pow(sunward, 12.0);
}

// A light carried through the picture, a lantern: how much of it falls on a spot that faces n. Add
// (the thing's own colour) * uLampCol * lampAt. It is nothing while uLamp.w is 0.
float lampAt(vec3 world, vec3 n) {
  vec3 to = uLamp.xyz - world;
  float d2 = dot(to, to);
  float face = clamp(dot(n, to) * inversesqrt(d2 + 1e-4) * 0.7 + 0.4, 0.0, 1.0);
  return uLamp.w * face / (1.0 + d2 * 0.2);
}
float mistBetween(vec3 world) {
  vec3 d = world - cameraPosition;
  float dist = length(d);
  float sunward = max(dot(d / dist, uSunDir), 0.0);
  float up = clamp((0.5 * (world.y + cameraPosition.y) - uFocus.y - 2.0) / 22.0, 0.0, 1.0);
  return 1.0 - exp(-dist * uHazeDensity * mix(1.2, 0.4, up) * (1.0 + 0.7 * sunward * sunward));
}
vec3 hazed(vec3 c, vec3 world) {
  return mix(c, airColour(normalize(world - cameraPosition)), mistBetween(world));
}
`;
	var CW = 128;
	var CH = 256;
	var hash = (n) => {
		const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
		return s - Math.floor(s);
	};
	var smooth$1 = (t) => t * t * (3 - 2 * t);
	var n1 = (x, seed) => {
		const i = Math.floor(x), f = smooth$1(x - i);
		return hash(i + seed * 57.3) * (1 - f) + hash(i + 1 + seed * 57.3) * f;
	};
	var n2 = (x, y, seed) => {
		const i = Math.floor(x), j = Math.floor(y), fx = smooth$1(x - i), fy = smooth$1(y - j);
		const h = (a, b) => hash(a * 1.31 + b * 91.7 + seed * 13.9);
		return (h(i, j) * (1 - fx) + h(i + 1, j) * fx) * (1 - fy) + (h(i, j + 1) * (1 - fx) + h(i + 1, j + 1) * fx) * fy;
	};
	var sstep = (a, b, x) => smooth$1(Math.min(1, Math.max(0, (x - a) / (b - a))));
	function mark(u, v, seed, kind) {
		const ub = u - (kind === 2 ? seed % 2 ? .34 : -.34 : (hash(seed * 3.1) - .5) * .12) * (4 * (v - .5) * (v - .5) - .5);
		const wob = (n1(v * 5, seed + 3) - .5) * .1;
		const a = Math.abs(ub + wob);
		let half, start, end;
		if (kind === 1) {
			const r = Math.hypot(ub / .66, (v - .5) / .44);
			const edge = 1 + (n1(Math.atan2(v - .5, ub) * 2.2 + 9, seed) - .5) * .34;
			half = .66;
			start = 0;
			end = 1;
			const alpha = (1 - sstep(edge - .16, edge, r)) * (n1(ub * 11, seed + 11) > sstep(.55, 1, r) * .9 * .8 ? 1 : .25);
			return [
				alpha * (.4 + .22 * n1(ub * 13 + n1(v * 3, seed) * 1.5, seed + 31) * n1(ub * 9, seed + 5) + .3 * sstep(.45, .95, r) + .12 * n2(ub * 4, v * 6, seed)),
				alpha,
				n2(ub * 3.2, v * 1.3, seed + 20)
			];
		}
		half = .6 * (.8 + .2 * Math.sin(Math.PI * Math.min(1, v * 1.15))) * (1 + (n1(v * 7, seed + 1) - .5) * .1);
		start = .05 + .05 * n1(ub * 5, seed + 2);
		end = .95 - .3 * n1(ub * 4.5 + 2, seed + 4) - .06 * n1(ub * 19, seed + 6);
		const side = 1 - sstep(half - .07, half, a);
		const head = sstep(start, start + .035, v);
		const tail = 1 - sstep(end - .02, end + .015, v);
		const dryness = sstep(end - .2, end, v);
		const bristle = n1(ub * 13, seed + 8) * .7 + n1(ub * 31, seed + 9) * .3;
		const gap = 1 - sstep(dryness * .55 - .08, dryness * .55, bristle) < .5 ? 1 : 0;
		const alpha = side * head * tail * gap;
		const furrow = n1(ub * 12 + n1(v * 2.5, seed + 12) * 1.2, seed + 33) * .7 + n1(ub * 29, seed + 34) * .3;
		const load = 1 - .55 * sstep(.1, .9, v);
		const squeezed = sstep(half - .3, half - .06, a);
		const height = alpha * (.3 + .22 * furrow * (.5 + .5 * n1(ub * 11, seed + 13)) + .3 * squeezed + .25 * load * (1 - sstep(start, start + .25, v)) + .1 * n2(ub * 3, v * 7, seed + 14));
		return [
			Math.min(1, height),
			alpha,
			n2(ub * 3.4, v * 1.1, seed + 20)
		];
	}
	function createBrushSheet() {
		const W = 512, H = CH * 2;
		const data = new Uint8Array(W * H * 4);
		const kinds = [
			0,
			0,
			0,
			2,
			1,
			1,
			0,
			2
		];
		for (let cell = 0; cell < 8; cell++) {
			const cx = cell % 4, cy = Math.floor(cell / 4);
			for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
				const u = (x + .5) / CW * 2 - 1, v = (y + .5) / CH;
				const m = .9;
				const [h, a, s] = Math.abs(u) > m || v < .04 || v > .96 ? [
					0,
					0,
					.5
				] : mark(u / m, (v - .04) / .92, cell * 7 + 1, kinds[cell]);
				const i = (cx * CW + x + (cy * CH + y) * W) * 4;
				data[i] = Math.round(h * 255);
				data[i + 1] = Math.round(a * 255);
				data[i + 2] = Math.round(s * 255);
				data[i + 3] = 255;
			}
		}
		const t = new three.DataTexture(data, W, H);
		t.minFilter = three.LinearMipmapLinearFilter;
		t.magFilter = three.LinearFilter;
		t.generateMipmaps = true;
		t.anisotropy = 4;
		t.needsUpdate = true;
		return t;
	}
	// source: oilpaint/shade.js
	var BIAS = new three.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
	function depthTarget(w, h) {
		const target = new three.WebGLRenderTarget(w, h, {
			depthBuffer: true,
			generateMipmaps: false
		});
		target.depthTexture = new three.DepthTexture(w, h, three.UnsignedIntType);
		target.depthTexture.compareFunction = three.LessEqualCompare;
		target.depthTexture.minFilter = target.depthTexture.magFilter = three.LinearFilter;
		return target;
	}
	/**
	* still: a scene of the things that never move. The rest says where the sun is and how much of the world the
	* picture of its shade has to hold: `box` is half its width and half its height as the sun sees it, round `centre`.
	* The defaults are the autumn wood's.
	*/
	function createShade(renderer, shared, still, { sun = SUN, size = [4096, 2560], box = [165, 104], centre: at = [
		0,
		11,
		-8
	], back = 400, near = 10, far = 800 } = {}) {
		const wood = depthTarget(size[0], size[1]);
		const sunCam = new three.OrthographicCamera(-box[0], box[0], box[1], -box[1], near, far);
		const centre = new three.Vector3(...at);
		sunCam.position.copy(centre).addScaledVector(sun, back);
		sunCam.lookAt(centre);
		sunCam.updateMatrixWorld(true);
		sunCam.updateProjectionMatrix();
		renderer.setRenderTarget(wood);
		renderer.clear();
		renderer.render(still, sunCam);
		renderer.setRenderTarget(null);
		shared.tTreeShade.value = wood.depthTexture;
		shared.uTreeShadeMat.value.copy(BIAS).multiply(sunCam.projectionMatrix).multiply(sunCam.matrixWorldInverse);
		const fig = depthTarget(768, 768);
		const figCam = new three.OrthographicCamera(-22, 22, 22, -22, 1, 90);
		figCam.layers.set(1);
		shared.tFigShade.value = fig.depthTexture;
		const depthOnly = new three.MeshBasicMaterial({ side: three.DoubleSide });
		return {
			dispose() {
				wood.dispose();
				fig.dispose();
				depthOnly.dispose();
			},
			update(scene, at) {
				figCam.position.set(at.x, at.y + 1, at.z).addScaledVector(sun, 30);
				figCam.lookAt(at.x, at.y + 1, at.z);
				figCam.updateMatrixWorld(true);
				shared.uFigShadeMat.value.copy(BIAS).multiply(figCam.projectionMatrix).multiply(figCam.matrixWorldInverse);
				const before = scene.overrideMaterial;
				scene.overrideMaterial = depthOnly;
				renderer.setRenderTarget(fig);
				renderer.clear();
				renderer.render(scene, figCam);
				renderer.setRenderTarget(null);
				scene.overrideMaterial = before;
			}
		};
	}
	// source: oilpaint/finish.js
	function createFrame(renderer, shared, { samples = 4 } = {}) {
		const size = renderer.getDrawingBufferSize(new three.Vector2());
		const target = new three.WebGLRenderTarget(size.x, size.y, {
			samples,
			depthBuffer: true,
			generateMipmaps: false
		});
		target.depthTexture = new three.DepthTexture(size.x, size.y, three.UnsignedIntType);
		target.texture.minFilter = target.texture.magFilter = three.LinearFilter;
		const uniforms = {
			...shared,
			tColor: { value: target.texture },
			tDepth: { value: target.depthTexture },
			uInvViewProj: { value: new three.Matrix4() },
			uEye: { value: new three.Vector3() },
			uShafts: { value: 1 },
			uSteps: { value: 22 },
			uCanvas: { value: 1 },
			uSize: { value: size.clone() }
		};
		const material = new three.ShaderMaterial({
			glslVersion: three.GLSL3,
			uniforms,
			depthTest: false,
			depthWrite: false,
			vertexShader: `
      out vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
			fragmentShader: `
      ${COMMON}
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform mat4 uInvViewProj;
      uniform vec3 uEye;
      uniform float uShafts;
      uniform float uSteps;
      uniform float uCanvas;
      uniform vec2 uSize;
      in vec2 vUv;
      layout(location = 0) out vec4 outC;

      float weave(vec2 p) {
        // warp and weft of a medium linen, each thread a little uneven
        vec2 q = p / 2.6;
        float n = texture(tNoise, p / 310.0).r;
        float a = sin(q.x * 3.14159) * sin(q.y * 3.14159 + floor(q.x) * 3.14159);
        return a * (0.3 + 1.4 * n * n);
      }

      void main() {
        vec3 col = texture(tColor, vUv).rgb;
        float depth = texture(tDepth, vUv).r;
        vec4 h = uInvViewProj * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        vec3 world = h.xyz / h.w;
        vec3 ray = world - uEye;
        float far = length(ray);
        ray /= far;

        // sun in the mist: walk the line of sight and count how much of the air along it stands in the light
        if (uShafts > 0.0) {
          float reach = min(far, 85.0);
          float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          float lit = 0.0, weight = 0.0;
          for (float i = 0.0; i < uSteps; i++) {
            float t = (i + jit) / uSteps;
            float w = exp(-t * reach * 0.022);
            lit += sunAt(uEye + ray * (t * reach)) * w;
            weight += w;
          }
          lit /= max(weight, 1e-3);
          float sunward = max(dot(ray, uSunDir), 0.0);
          float thick = 1.0 - exp(-reach * 0.03);
          // lit air glows toward the sun; shaded air is a touch darker and cooler than the plain mist
          float streak = 0.75 + 0.5 * texture(tNoise, vec2(dot(world.xz, vec2(uSunDir.z, -uSunDir.x)) * 0.11, world.y * 0.02)).g;
          vec3 glow = vec3(1.0, 0.86, 0.56) * (0.16 + 0.95 * pow(sunward, 2.5));
          col += glow * (lit - 0.34) * thick * streak * uShafts * 0.8;
        }

        if (uCanvas > 0.0) {
          vec2 px = vUv * uSize;
          float w = weave(px);
          float dx = weave(px + vec2(1.0, 0.0)) - w, dy = weave(px + vec2(0.0, 1.0)) - w;
          col *= 1.0 + (0.6 * dx - 0.8 * dy) * 0.022 * uCanvas + w * 0.006 * uCanvas;
        }
        // the brightest passages roll off toward the white of the paint and never past it
        vec3 over = max(col - 0.8, 0.0);
        col = min(col, 0.8) + over / (1.0 + over * 5.0);
        // varnish: a little more depth in the darks, the lights left alone
        col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);
        outC = vec4(col, 1.0);
      }`
		});
		const quad = new three.Mesh(new three.PlaneGeometry(2, 2), material);
		quad.frustumCulled = false;
		const scene = new three.Scene();
		scene.add(quad);
		const flat = new three.Camera();
		const viewProj = new three.Matrix4();
		return {
			dispose() {
				target.dispose();
				quad.geometry.dispose();
				material.dispose();
			},
			target,
			uniforms,
			resize() {
				renderer.getDrawingBufferSize(size);
				target.setSize(size.x, size.y);
				uniforms.uSize.value.copy(size);
			},
			render(world, camera) {
				renderer.setRenderTarget(target);
				renderer.clear();
				renderer.render(world, camera);
				renderer.setRenderTarget(null);
				viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
				uniforms.uInvViewProj.value.copy(viewProj).invert();
				uniforms.uEye.value.copy(camera.position);
				renderer.render(scene, flat);
			}
		};
	}
	// source: oilpaint/dabs.js
	var VERT = (head, body) => `
${COMMON}
uniform vec2 uMinPx;
uniform vec2 uMaxPx;
uniform vec2 uCells; // first cell of the brush sheet and how many to choose from
out vec2 vUv;
out vec3 vC1;
out vec3 vC2;
out vec4 vAxis;
out vec4 vGlaze;
struct Dab {
  vec3 pos;    // where it is pinned
  vec3 dir;    // the way the stroke runs, in the world
  vec2 size;   // across and along, metres
  vec3 c1;     // its colour
  vec3 c2;     // the colour streaked into it
  float seed;
  float alive; // 0 gone .. 1 whole (it grows in)
  float lift;  // how far it stands off its surface toward the eye, in its own sizes
  float base;  // 1: pinned by its foot instead of its middle
  float spin;  // a turn on the canvas, radians
  float turnabout; // 1: laid with either end first
  float cell;  // which mark of the brush sheet, or -1 to let it choose
  float lie;   // 1: lies flat on its surface (nrm) instead of facing the eye
  vec3 nrm;    // the surface it lies on
  float height; // how far above the surface it is laid, metres: higher is on top
  float glaze; // 1: the wanderer's shadow passes over it as a glaze, pixel by pixel
};
${head}
void makeDab(inout Dab d);
${body}
void main() {
  Dab d;
  d.pos = vec3(0.0); d.dir = vec3(0.0, 1.0, 0.0); d.size = vec2(0.1, 0.2);
  d.c1 = vec3(0.5); d.c2 = vec3(0.5); d.seed = float(gl_InstanceID); d.alive = 1.0; d.lift = 0.6; d.base = 0.0; d.spin = 0.0; d.turnabout = 0.0; d.cell = -1.0;
  d.lie = 0.0; d.nrm = vec3(0.0, 1.0, 0.0); d.height = 0.0; d.glaze = 0.0;
  makeDab(d);
  vec4 r = hash4(d.seed * 1.37 + 5.1);
  vec2 across, along;
  vec4 vc;
  vGlaze = vec4(0.0);
  if (d.lie > 0.5) {
    vec3 Nn = normalize(d.nrm);
    vec3 A = d.dir - Nn * dot(d.dir, Nn);
    A = dot(A, A) > 1e-8 ? normalize(A) : normalize(cross(Nn, vec3(1.0, 0.0, 0.0)));
    vec3 B = cross(Nn, A);
    vec3 P = d.pos + Nn * d.height;
    vc = viewMatrix * vec4(P, 1.0);
    float dist = -vc.z;
    if (d.alive < 0.004 || dist < 0.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec2 half_ = d.size * 0.5 * d.alive;
    vec3 world = P + A * position.y * half_.y + B * position.x * half_.x;
    if (d.glaze > 0.5) vGlaze = vec4((uFigShadeMat * vec4(world, 1.0)).xyz, 1.0);
    vec3 a = mat3(viewMatrix) * A * half_.y;
    vec3 b = mat3(viewMatrix) * B * half_.x;
    // on the canvas the patch is a slanted box; if its thin way is under the least size, stand it up to that
    float la = length(a.xy), lb = length(b.xy);
    float thin = abs(a.x * b.y - a.y * b.x) / max(max(la, lb), 1e-6);
    float need = uMinPx.x * 0.5 * dist * uPixel * d.alive;
    if (thin < need) {
      if (la > lb) {
        vec2 perp = vec2(-a.y, a.x) / max(la, 1e-6);
        b.xy += perp * (dot(b.xy, perp) < 0.0 ? -1.0 : 1.0) * (need - thin);
      } else {
        vec2 perp = vec2(-b.y, b.x) / max(lb, 1e-6);
        a.xy += perp * (dot(a.xy, perp) < 0.0 ? -1.0 : 1.0) * (need - thin);
      }
    }
    vc.xyz += a * position.y + b * position.x;
    along = normalize(a.xy + 1e-6);
    across = normalize(b.xy + 1e-6);
  } else {
    vc = viewMatrix * vec4(d.pos, 1.0);
    float dist = -vc.z;
    if (d.alive < 0.004 || dist < 0.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec3 vd = mat3(viewMatrix) * normalize(d.dir);
    float flatness = length(vd.xy);
    float a0 = r.x * TAU;
    along = flatness > 1e-4 ? vd.xy / flatness : vec2(0.0, 1.0);
    // a stroke that points at the eye has no direction on the canvas: give it its own
    along = normalize(mix(vec2(cos(a0), sin(a0)), along, smoothstep(0.08, 0.4, flatness)));
    float cs = cos(d.spin), sn = sin(d.spin);
    along = vec2(along.x * cs - along.y * sn, along.x * sn + along.y * cs);
    across = vec2(along.y, -along.x);
    float px = dist * uPixel;
    vec2 half_ = clamp(d.size, uMinPx * px, uMaxPx * px) * 0.5 * d.alive;
    float lift = d.lift * max(half_.x, half_.y) * (0.6 + 0.8 * r.y);
    vc.xyz *= 1.0 - min(lift / dist, 0.3);
    float t = mix(position.y, position.y + 1.0, d.base);
    vc.xy += across * position.x * half_.x + along * t * half_.y;
  }
  gl_Position = projectionMatrix * vc;
  float cell = d.cell >= 0.0 ? d.cell : uCells.x + floor(r.z * uCells.y * 0.999);
  float flip = r.w > 0.5 ? -1.0 : 1.0;
  float end_ = d.turnabout > 0.5 && fract(r.x * 7.13) > 0.5 ? -1.0 : 1.0;
  vec2 q = vec2(position.x * flip, position.y * end_) * 0.5 + 0.5;
  vUv = (vec2(mod(cell, 4.0), floor(cell / 4.0)) + q) / vec2(4.0, 2.0);
  vC1 = d.c1;
  vC2 = d.c2;
  vAxis = vec4(across * flip, along * end_);
}
`;
	var FRAG = `
${COMMON}
in vec2 vUv;
in vec3 vC1;
in vec3 vC2;
in vec4 vAxis;
in vec4 vGlaze;
layout(location = 0) out vec4 outC;
void main() {
  vec4 t = texture(tBrush, vUv);
  if (t.g < 0.3) discard;
  vec2 e = vec2(1.5 / 512.0, 0.0);
  float hu = texture(tBrush, vUv + e.xy).r - texture(tBrush, vUv - e.xy).r;
  float hv = texture(tBrush, vUv + e.yx).r - texture(tBrush, vUv - e.yx).r;
  // the paint stands up off the canvas and the room's light, from the upper left, rakes across it
  vec2 g = vAxis.xy * hu + vAxis.zw * hv;
  float rake = 0.5 * g.x - 0.7 * g.y;
  vec3 col = mix(vC1, vC2, smoothstep(0.52, 0.78, t.b));
  if (vGlaze.w > 0.5) {
    // the wanderer's shadow: a soft plum glaze that slides over the paint and follows its streaks a little
    float lit = figSunSoft(vGlaze.xyz + vec3((t.b - 0.5) * 0.012, (t.r - 0.5) * 0.012, 0.0));
    col = mix(col * uGlazeMul + uGlazeAdd, col, lit);
  }
  col *= mix(0.95, 1.04, t.r);
  col *= 1.0 + rake * 1.25 * uImpasto;
  col += vec3(1.0, 0.97, 0.9) * pow(max(rake, 0.0), 2.0) * 1.2 * uImpasto;
  outC = vec4(col, smoothstep(0.3, 0.62, t.g));
}
`;
	function dabMaterial(shared, { head = "", body, uniforms = {}, minPx = [5, 9], maxPx = [400, 700], cells = [0, 8], depthTest = true, depthWrite = true } = {}) {
		return new three.ShaderMaterial({
			glslVersion: three.GLSL3,
			vertexShader: VERT(head, body),
			fragmentShader: FRAG,
			uniforms: {
				...shared,
				uMinPx: { value: new three.Vector2(...minPx) },
				uMaxPx: { value: new three.Vector2(...maxPx) },
				uCells: { value: new three.Vector2(...cells) },
				...uniforms
			},
			side: three.DoubleSide,
			alphaToCoverage: true,
			depthTest,
			depthWrite
		});
	}
	/** The card every dab is drawn with, `count` times; `attributes` are per dab: { name: [Float32Array, itemSize] }. */
	function dabGeometry(count, attributes = {}, dynamic = false) {
		const g = new three.InstancedBufferGeometry();
		g.setAttribute("position", new three.Float32BufferAttribute([
			-1,
			-1,
			0,
			1,
			-1,
			0,
			1,
			1,
			0,
			-1,
			1,
			0
		], 3));
		g.setIndex([
			0,
			1,
			2,
			0,
			2,
			3
		]);
		for (const [name, [array, size]] of Object.entries(attributes)) {
			const a = new three.InstancedBufferAttribute(array, size);
			if (dynamic) a.setUsage(three.DynamicDrawUsage);
			g.setAttribute(name, a);
		}
		g.instanceCount = count;
		g.boundingSphere = new three.Sphere(new three.Vector3(), 1e6);
		return g;
	}
	function dabMesh(geometry, material, order = 0) {
		const m = new three.Mesh(geometry, material);
		m.frustumCulled = false;
		m.matrixAutoUpdate = false;
		m.renderOrder = order;
		return m;
	}
	// source: noise.js
	var perm = /* @__PURE__ */ new Uint8Array(512);
	{
		let s = 20261110;
		const p = Array.from({ length: 256 }, (_, i) => i);
		for (let i = 255; i > 0; i--) {
			s = Math.imul(s, 1664525) + 1013904223 >>> 0;
			const j = s % (i + 1);
			[p[i], p[j]] = [p[j], p[i]];
		}
		for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
	}
	var fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
	var grad = (h, x, y) => (h & 1 ? -x : x) + (h & 2 ? -y : y);
	/** Perlin noise, about -1..1. */
	function noise(x, y) {
		const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
		x -= Math.floor(x);
		y -= Math.floor(y);
		const u = fade(x), v = fade(y);
		const a = perm[X] + Y, b = perm[X + 1] + Y;
		const l = (p, q, t) => p + (q - p) * t;
		return l(l(grad(perm[a], x, y), grad(perm[b], x - 1, y), u), l(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v) * 1.4;
	}
	function rng(seed) {
		let s = seed >>> 0;
		return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296;
	}
	// source: world/land.js
	var wayDist = (x, z) => Math.min(Math.abs(x - Math.sin(z * .08) * 3), Math.abs(z + 3) * .9);
	var clearingAt = (x, z) => 1 - three.MathUtils.smoothstep(Math.hypot(x, z), 19, 30);
	var heightAt = (x, z) => .17 * Math.sin(x * .17) * Math.cos(z * .13) + .08 * Math.sin(z * .39 + x * .2) + Math.max(0, Math.hypot(x, z) - 23) * .055;
	function createLand(shared) {
		const N = 257, heights = new Float32Array(N * N), land = new Uint8Array(N * N * 4);
		for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
			const x = (i / 256 * 2 - 1) * 96, z = (j / 256 * 2 - 1) * 96, k = i + j * N;
			heights[k] = heightAt(x, z);
			const r = Math.hypot(x, z), wd = wayDist(x, z);
			land[k * 4] = Math.round(255 * Math.max(1 - three.MathUtils.smoothstep(wd, 1.6, 4.5), 1 - three.MathUtils.smoothstep(r, 14, 24)));
			land[k * 4 + 1] = Math.round(100 * clearingAt(x, z));
			land[k * 4 + 2] = Math.round(125 + 95 * noise(x * .05, z * .05));
			land[k * 4 + 3] = 255;
		}
		const ht = new three.DataTexture(heights, N, N, three.RedFormat, three.FloatType);
		ht.minFilter = ht.magFilter = three.LinearFilter;
		ht.needsUpdate = true;
		const lt = new three.DataTexture(land, N, N);
		lt.minFilter = lt.magFilter = three.LinearFilter;
		lt.needsUpdate = true;
		shared.tHeight.value = ht;
		shared.tLand.value = lt;
		const geo = new three.PlaneGeometry(192, 192, 128, 128);
		geo.rotateX(-Math.PI / 2);
		const a = geo.attributes.position;
		for (let i = 0; i < a.count; i++) a.setY(i, heightAt(a.getX(i), a.getZ(i)) - .055);
		geo.computeVertexNormals();
		const mat = new three.ShaderMaterial({
			glslVersion: three.GLSL3,
			uniforms: shared,
			vertexShader: `${COMMON}\nout vec3 vWorld;void main(){vWorld=position;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.);}`,
			fragmentShader: `${COMMON}\nin vec3 vWorld;layout(location=0)out vec4 outC;void main(){vec4 m=texture(tLand,landUv(vWorld.xz));float sun=woodSunAt(vWorld+vec3(0.,.2,0.));vec3 c=mix(vec3(.23,.20,.24),vec3(.52,.40,.24),sun);c=mix(c,mix(vec3(.29,.26,.28),vec3(.68,.56,.37),sun),m.r);c*=.88+.2*texture(tNoise,vWorld.xz/11.).r;outC=vec4(hazed(c,vWorld),1.);}`
		});
		return new three.Mesh(geo, mat);
	}
	// source: world/forest.js
	var BEECH = 0;
	var BIRCH = 1;
	var OAK = 2;
	var MAPLE = 3;
	var VISIBILITY = `
float treeVisibility(vec3 P) {
 vec3 axis=cameraPosition-(uFocus+vec3(0.,1.,0.));
 float t=dot(P-uFocus,axis)/dot(axis,axis);
 if(t<.12||t>1.2||P.y<1.8) return 1.;
 float separation=length(P-(uFocus+axis*t));
 return smoothstep(5.0,9.0,separation);
}
`;
	var BARK = `${VISIBILITY}
const vec3 BARK_L[4] = vec3[4](vec3(0.88, 0.6, 0.33), vec3(1.0, 0.94, 0.74), vec3(0.84, 0.6, 0.34), vec3(0.86, 0.62, 0.4));
const vec3 BARK_M[4] = vec3[4](vec3(0.37, 0.3, 0.31), vec3(0.76, 0.71, 0.68), vec3(0.3, 0.22, 0.2), vec3(0.33, 0.25, 0.25));
const vec3 BARK_S[4] = vec3[4](vec3(0.15, 0.12, 0.19), vec3(0.4, 0.4, 0.53), vec3(0.12, 0.09, 0.14), vec3(0.14, 0.1, 0.16));
vec3 bark(int k, vec3 P, vec3 Nn, float r, float foot) {
  // a trunk is lit as a round thing by a low sun, and from below by the bright leaves on the ground
  float lit = sunAt(P + Nn * 0.35) * clamp(dot(Nn, uSunDir) * 1.2 + 0.25, 0.0, 1.0);
  vec3 c = paint3(BARK_L[k], BARK_M[k], BARK_S[k], lit, r);
  c += vec3(0.1, 0.045, 0.0) * (1.0 - lit) * exp(-foot * 0.45);
  return c;
}
`;
	var LEAF = `${VISIBILITY}
const vec3 LEAF_L[5] = vec3[5](vec3(1.0, 0.8, 0.2), vec3(1.0, 0.57, 0.12), vec3(0.94, 0.26, 0.09), vec3(0.86, 0.82, 0.24), vec3(1.0, 0.9, 0.36));
const vec3 LEAF_M[5] = vec3[5](vec3(0.76, 0.49, 0.11), vec3(0.72, 0.33, 0.09), vec3(0.61, 0.15, 0.08), vec3(0.52, 0.52, 0.14), vec3(0.82, 0.62, 0.17));
const vec3 LEAF_S[5] = vec3[5](vec3(0.46, 0.25, 0.1), vec3(0.42, 0.17, 0.09), vec3(0.34, 0.09, 0.11), vec3(0.24, 0.29, 0.13), vec3(0.5, 0.33, 0.13));
`;
	function tube(out, pts, radii, sides, kind, seed) {
		const base = out.position.length / 3;
		const t = new three.Vector3(), n = new three.Vector3(), b = new three.Vector3(), p = new three.Vector3();
		let ref = new three.Vector3(1, 0, .3).normalize();
		for (let i = 0; i < pts.length; i++) {
			t.copy(pts[Math.min(i + 1, pts.length - 1)]).sub(pts[Math.max(i - 1, 0)]).normalize();
			n.copy(ref).addScaledVector(t, -ref.dot(t)).normalize();
			ref = n.clone();
			b.crossVectors(t, n);
			for (let s = 0; s < sides; s++) {
				const a = s / sides * Math.PI * 2;
				const dx = Math.cos(a), dy = Math.sin(a);
				p.copy(pts[i]).addScaledVector(n, dx * radii[i]).addScaledVector(b, dy * radii[i]);
				out.position.push(p.x, p.y, p.z);
				out.normal.push(n.x * dx + b.x * dy, n.y * dx + b.y * dy, n.z * dx + b.z * dy);
				out.data.push(kind, seed, pts[i].y - pts[0].y);
			}
		}
		for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < sides; s++) {
			const a = base + i * sides + s, c = base + i * sides + (s + 1) % sides;
			out.index.push(a, c, a + sides, c, c + sides, a + sides);
		}
	}
	function plant() {
		const rand = rng(4471), trees = [];
		for (let z = -70; z <= 72; z += 6) for (let x = -65; x <= 65; x += 6) {
			const px = x + (rand() - .5) * 4, pz = z + (rand() - .5) * 4, radius = Math.hypot(px, pz);
			if (radius < 27 || radius > 78 || rand() > .8) continue;
			if (pz > 15 && pz < 38 && Math.abs(px) < 30) continue;
			const type = rand() < .27 ? BIRCH : rand() < .2 ? MAPLE : BEECH;
			const h = (pz > 38 ? 18 : pz > 10 ? 10 : 15) + rand() * 6;
			trees.push({
				x: px,
				z: pz,
				y: heightAt(px, pz),
				type,
				tier: radius < 44 ? 0 : 1,
				r: .22 + rand() * .36,
				h,
				family: type === BIRCH ? 4 : rand() < .2 ? 2 : 0,
				seed: rand() * 1e3,
				lean: [(rand() - .5) * .05, (rand() - .5) * .05]
			});
		}
		return trees;
	}
	function createForest(shared) {
		const trees = plant();
		const rand = rng(99173);
		const wood = {
			position: [],
			normal: [],
			data: [],
			index: []
		};
		const barkDabs = [];
		const leafDabs = [];
		const lobes = [];
		const colliders = [];
		const v = new three.Vector3();
		for (const t of trees) {
			const full = t.tier === 0, some = t.tier === 1;
			const top = t.h * (t.type === BIRCH ? .95 : .8);
			const rings = full ? 9 : some ? 5 : 3;
			const pts = [], radii = [];
			for (let i = 0; i < rings; i++) {
				const u = i / (rings - 1), y = u * u * .4 + u * .6;
				const bend = Math.sin(u * 2.4 + t.seed) * .25 * (t.type === BIRCH ? 1.6 : 1);
				pts.push(new three.Vector3(t.x + t.lean[0] * y * top + bend * t.lean[1] * 8, t.y - .3 + y * (top + .3), t.z + t.lean[1] * y * top - bend * t.lean[0] * 8));
				radii.push(t.r * (1 - .6 * y) * (1 + .5 * Math.exp(-(y * top) / (.35 + t.r * .6))));
			}
			tube(wood, pts, radii, full ? 9 : some ? 7 : 5, t.type, t.seed);
			const trunkAt = (y, outP) => {
				let i = 0;
				while (i < rings - 2 && pts[i + 1].y - t.y < y) i++;
				const k = three.MathUtils.clamp((y - (pts[i].y - t.y)) / (pts[i + 1].y - pts[i].y), 0, 1);
				outP.lerpVectors(pts[i], pts[i + 1], k);
				return radii[i] + (radii[i + 1] - radii[i]) * k;
			};
			if (full && wayDist(t.x, t.z) < 60) colliders.push({
				x: t.x,
				z: t.z,
				y: t.y,
				r: t.r * 1.15
			});
			const crown = new three.Vector3(t.x + t.lean[0] * top, t.y + t.h * (t.hero ? .66 : .8), t.z + t.lean[1] * top);
			const spread = t.hero ? 11.5 : t.type === OAK ? 7.5 : t.type === BIRCH ? 2.6 + rand() : 4 + rand() * 1.8 + t.r * 2;
			const treeLobes = [];
			if (full) {
				const limbs = t.hero ? 9 : t.type === BIRCH ? 4 : 5 + Math.floor(rand() * 3);
				for (let i = 0; i < limbs; i++) {
					const a = i / limbs * Math.PI * 2 + rand() * 1.2;
					const from = top * (t.hero ? .2 + .5 * (i / limbs) : .48 + .45 * (i / limbs));
					const p0 = new three.Vector3();
					const r0 = trunkAt(from, p0);
					const tilt = t.hero ? .9 + rand() * .5 : t.type === BIRCH ? .35 : .45 + rand() * .45;
					const len = spread / Math.sin(tilt) * (.7 + rand() * .4) * (1 - .35 * (i / limbs));
					const out = new three.Vector3(Math.cos(a), 0, Math.sin(a));
					const p2 = p0.clone().addScaledVector(out, len * Math.sin(tilt)).add(new three.Vector3(0, len * Math.cos(tilt), 0));
					const p1 = p0.clone().lerp(p2, .45).add(new three.Vector3(0, -len * .1, 0)).addScaledVector(out, len * .12);
					const lp = [], lr = [];
					for (let k = 0; k <= 5; k++) {
						const u = k / 5, w = 1 - u;
						lp.push(new three.Vector3().addScaledVector(p0, w * w).addScaledVector(p1, 2 * w * u).addScaledVector(p2, u * u));
						lr.push(Math.max(.035, r0 * (t.hero ? .62 : .5) * (1 - .82 * u)));
					}
					tube(wood, lp, lr, 6, t.type, t.seed + i);
					for (let k = 0; k < (t.hero ? 12 : 6); k++) {
						const u = .15 + rand() * .8, seg = Math.min(4, Math.floor(u * 5));
						const dir = lp[seg + 1].clone().sub(lp[seg]).normalize();
						const at = lp[seg].clone().lerp(lp[seg + 1], u * 5 - seg);
						const twig = rand() < .55;
						if (twig) {
							dir.add(v.set(rand() - .5, rand() * .6, rand() - .5).multiplyScalar(1.5)).normalize();
							at.addScaledVector(dir, .8);
						}
						barkDabs.push(at.x, at.y, at.z, dir.x, dir.y, dir.z, -dir.z, .3, dir.x, rand() * 1e3, twig ? .09 : lr[seg] * 2.4, t.type, twig ? 1.7 + rand() * 1.5 : 1.6);
					}
					for (const u of t.hero ? [
						.5,
						.68,
						.86,
						1.02
					] : [.7, 1]) {
						const w = 1 - u;
						const c = new three.Vector3().addScaledVector(p0, w * w).addScaledVector(p1, 2 * w * u).addScaledVector(p2, u * u);
						c.add(v.set(rand() - .5, rand() * .9, rand() - .5).multiplyScalar(1.6));
						treeLobes.push([
							c.x,
							c.y,
							c.z,
							(t.hero ? 2.3 : 1.25) + rand() * 1 + t.r * .6
						]);
					}
				}
				for (let i = 0; i < (t.hero ? 8 : 3); i++) treeLobes.push([
					crown.x + (rand() - .5) * spread * .9,
					t.y + t.h * (t.hero ? .92 : .96) + (rand() - .5) * 3,
					crown.z + (rand() - .5) * spread * .9,
					1.5 + rand() * (t.hero ? 1.6 : .9)
				]);
			} else {
				const n = some ? 7 : 4;
				for (let i = 0; i < n; i++) {
					const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * spread;
					treeLobes.push([
						crown.x + Math.cos(a) * d,
						crown.y + (rand() - .45) * t.h * .3,
						crown.z + Math.sin(a) * d,
						(some ? 2.3 : 3.4) + rand() * 1.2
					]);
				}
			}
			const perLobe = full ? t.hero ? 150 : 54 : some ? 20 : 11;
			const touch = full ? t.hero ? .2 : .27 : .4;
			for (const [lx, ly, lz, lr] of treeLobes) {
				lobes.push(lx, ly, lz, lr);
				const away = v.set(lx - crown.x, ly - crown.y, lz - crown.z).normalize().clone();
				for (let k = 0; k < perLobe; k++) {
					const d = new three.Vector3(rand() - .5, rand() - .5, rand() - .5).normalize().addScaledVector(away, .5).add(new three.Vector3(0, .15, 0)).normalize();
					const reach = lr * (.72 + rand() * .4);
					const px = lx + d.x * reach, py = ly + d.y * reach, pz = lz + d.z * reach;
					const n = d.multiplyScalar(.6).addScaledVector(v.set(px - crown.x, py - crown.y, pz - crown.z).normalize(), .55).normalize();
					const family = rand() < .14 ? Math.floor(rand() * 4) : t.family;
					leafDabs.push(px, py, pz, n.x, n.y, n.z, rand() * 1e3, lr * touch * (1 + rand() * .6), family, 0);
				}
				for (let k = 0; k < 2; k++) leafDabs.push(lx + (rand() - .5) * lr * .5, ly - lr * .15 * k, lz + (rand() - .5) * lr * .5, 0, -1, 0, rand() * 1e3, lr * 1.25, t.family, 1);
			}
			const marks = full ? Math.round(110 + t.r * 150) : some ? 36 : 0;
			const barkTop = Math.min(top, full ? 14 : 18);
			for (let k = 0; k < marks; k++) {
				const y = Math.pow(rand(), 1.3) * barkTop, a = rand() * Math.PI * 2;
				const p = new three.Vector3();
				const r = trunkAt(y, p);
				const nx = Math.cos(a), nz = Math.sin(a);
				const across = Math.min(.5, r * (t.type === BIRCH ? 1.5 : .75)) * (some ? 1.5 : 1);
				barkDabs.push(p.x + nx * r, p.y, p.z + nz * r, t.lean[0], 1, t.lean[1], nx, 0, nz, rand() * 1e3, across, t.type, (t.type === BIRCH ? Math.min(.5, r * 2.3) : 1 + rand() * 1.5) * (some ? 1.6 : 1));
			}
		}
		for (let i = 0; i < 190; i++) {
			const x = (rand() - .5) * 100, z = -48 + rand() * 90;
			const wd = wayDist(x, z);
			if (Math.hypot(x, z) < 23 || wd < 2.3 || wd > 62) continue;
			const y = heightAt(x, z), tall = 1.1 + rand() * rand() * 3.4;
			const family = rand() < .4 ? 3 : rand() < .6 ? 0 : rand() < .5 ? 1 : 2;
			const n = 3 + Math.floor(rand() * 4);
			for (let k = 0; k < n; k++) {
				const lx = x + (rand() - .5) * tall * .9, ly = y + tall * (.45 + rand() * .6), lz = z + (rand() - .5) * tall * .9, lr = .38 + rand() * .5;
				for (let j = 0; j < 12; j++) {
					const d = new three.Vector3(rand() - .5, rand() - .3, rand() - .5).normalize();
					leafDabs.push(lx + d.x * lr, ly + d.y * lr, lz + d.z * lr, d.x, d.y, d.z, rand() * 1e3, .22 + rand() * .2, rand() < .2 ? Math.floor(rand() * 4) : family, 0);
				}
				const dir = v.set(lx - x, ly - y, lz - z).normalize();
				barkDabs.push(x + dir.x * tall * .3, y + tall * .3, z + dir.z * tall * .3, dir.x, dir.y, dir.z, dir.z, 0, -dir.x, rand() * 1e3, .05, MAPLE, tall * .75);
			}
		}
		const woodGeometry = new three.BufferGeometry();
		woodGeometry.setAttribute("position", new three.Float32BufferAttribute(wood.position, 3));
		woodGeometry.setAttribute("normal", new three.Float32BufferAttribute(wood.normal, 3));
		woodGeometry.setAttribute("aData", new three.Float32BufferAttribute(wood.data, 3));
		woodGeometry.setIndex(wood.index);
		const woodMaterial = new three.ShaderMaterial({
			glslVersion: three.GLSL3,
			uniforms: shared,
			vertexShader: `
      ${COMMON}
      in vec3 aData;
      out vec3 vWorld; out vec3 vN; out vec3 vData;
      void main() { vWorld = position; vN = normal; vData = aData; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
			fragmentShader: `
      ${COMMON}
      ${BARK}
      in vec3 vWorld; in vec3 vN; in vec3 vData;
      layout(location = 0) out vec4 outC;
      void main() {
        vec3 Nn = normalize(vN);
        float grain = texture(tNoise, vec2(atan(Nn.z, Nn.x) * 1.3 + vData.y, vWorld.y * 0.07)).r;
        if (treeVisibility(vWorld) < fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)) discard;
        vec3 c = bark(int(vData.x + 0.5), vWorld, Nn, grain, vData.z) * (0.72 + 0.3 * grain);
        outC = vec4(hazed(c, vWorld), 1.0);
      }`
		});
		const woodMesh = new three.Mesh(woodGeometry, woodMaterial);
		woodMesh.frustumCulled = false;
		const nb = barkDabs.length / 13;
		const bp = new Float32Array(nb * 3), bd = new Float32Array(nb * 3), bn = new Float32Array(nb * 3), bx = new Float32Array(nb * 4);
		for (let i = 0; i < nb; i++) {
			for (let k = 0; k < 3; k++) {
				bp[i * 3 + k] = barkDabs[i * 13 + k];
				bd[i * 3 + k] = barkDabs[i * 13 + 3 + k];
				bn[i * 3 + k] = barkDabs[i * 13 + 6 + k];
			}
			for (let k = 0; k < 4; k++) bx[i * 4 + k] = barkDabs[i * 13 + 9 + k];
		}
		const barkMesh = dabMesh(dabGeometry(nb, {
			aPos: [bp, 3],
			aDir: [bd, 3],
			aNrm: [bn, 3],
			aData: [bx, 4]
		}), dabMaterial(shared, {
			head: BARK + `in vec3 aPos; in vec3 aDir; in vec3 aNrm; in vec4 aData;`,
			body: `
      void makeDab(inout Dab d) {
        vec4 r = hash4(aData.x);
        int k = int(aData.z + 0.5);
        vec3 Nn = normalize(aNrm);
        float foot = aPos.y - heightAt(aPos.xz);
        d.alive *= treeVisibility(aPos);
        vec3 c = bark(k, aPos, Nn, r.x, foot);
        d.dir = aDir;
        // a birch is banded across; here and there one of its black scars
        if (k == 1) { d.dir = cross(aDir, Nn); if (r.y < 0.16) c = vec3(0.13, 0.11, 0.15); }
        // moss on the cold side, low down
        if (k != 1 && foot < 2.2 && r.z < 0.3 * (1.0 - foot / 2.2) + 0.1 * max(-dot(Nn, uSunDir), 0.0)) c = mix(c, vec3(0.34, 0.4, 0.14) * (0.5 + 0.9 * sunAt(aPos + Nn * 0.3)), 0.8);
        // lichen, and the cold light of the sky on the shaded side
        if (r.w < 0.1) c = mix(c, vec3(0.56, 0.58, 0.4) * (0.45 + 0.6 * dot(c, vec3(0.6))), 0.7);
        else if (r.w > 0.9 && dot(Nn, uSunDir) < 0.0) c = mix(c, vec3(0.3, 0.33, 0.48), 0.6);
        c = jitter(c, r.yzw, 0.7);
        d.turnabout = 1.0;
        d.pos = aPos;
        d.size = vec2(aData.y, aData.w);
        d.c1 = hazed(c, aPos);
        d.c2 = hazed(jitter(c * 1.2 + vec3(0.02, 0.02, 0.05), r.wxy, 0.6), aPos);
        d.seed = aData.x;
        d.lift = 0.5;
      }`,
			minPx: [3, 10],
			maxPx: [120, 500],
			cells: [0, 4]
		}), 3);
		const nl = leafDabs.length / 10;
		const lp = new Float32Array(nl * 3), ln = new Float32Array(nl * 3), lx = new Float32Array(nl * 4);
		for (let i = 0; i < nl; i++) {
			for (let k = 0; k < 3; k++) {
				lp[i * 3 + k] = leafDabs[i * 10 + k];
				ln[i * 3 + k] = leafDabs[i * 10 + 3 + k];
			}
			for (let k = 0; k < 4; k++) lx[i * 4 + k] = leafDabs[i * 10 + 6 + k];
		}
		const leafMesh = dabMesh(dabGeometry(nl, {
			aPos: [lp, 3],
			aNrm: [ln, 3],
			aData: [lx, 4]
		}), dabMaterial(shared, {
			head: LEAF + `in vec3 aPos; in vec3 aNrm; in vec4 aData;`,
			body: `
      void makeDab(inout Dab d) {
        vec4 r = hash4(aData.x);
        vec4 q = hash4(aData.x + 271.3);
        vec3 toEye = cameraPosition - aPos;
        float dist = length(toEye);
        // far crowns are fewer, larger touches
        float keep = mix(1.0, 0.3, smoothstep(35.0, 130.0, dist));
        // (they leave and come back by growing, never at a stroke)
        d.alive = aData.w > 0.5 ? 1.0 : smoothstep(0.0, 1.0, (keep - q.w) / 0.12);
        if (d.alive <= 0.0) return;
        float gust = gustAt(aPos.xz);
        vec3 P = aPos;
        float high = clamp((P.y - heightAt(P.xz)) / 20.0, 0.1, 1.0);
        P.xz += uWind.xy * (gust * 0.5 + sin(uTime * (1.1 + r.x) + r.y * 30.0) * (0.05 + 0.16 * gust)) * high;
        P.y += sin(uTime * (1.7 + r.z) + r.w * 30.0) * (0.03 + 0.1 * gust) * high;
        vec3 Nn = aNrm;
        vec3 view = -toEye / dist;
        int k = int(aData.z + 0.5);
        vec3 c;
        if (aData.w > 0.5) {
          c = mix(LEAF_S[k] * 0.6, vec3(0.12, 0.1, 0.17), 0.3);
        } else {
          // a crown is never wholly dark: light comes down through all the leaves above it
          float sun = mix(0.5, 1.0, sunAt(P + Nn * 0.9));
          // a leaf with the sun behind it is a lamp: the light comes through it
          float through = pow(max(dot(view, uSunDir), 0.0), 2.0);
          float x = sun * clamp(0.55 + 0.45 * dot(Nn, uSunDir) + 0.6 * through, 0.0, 1.0);
          x *= mix(0.6, 1.0, smoothstep(-0.7, 0.1, Nn.y));
          c = paint3(LEAF_L[k], LEAF_M[k], LEAF_S[k], x, r.x);
          c = mix(c, vec3(0.2, 0.16, 0.25), (1.0 - smoothstep(0.1, 0.4, x)) * 0.14);
          // turned in a gust, the pale back of the leaf
          if (q.x < gust * 0.3) c = mix(c, vec3(1.0, 0.92, 0.6), 0.4 * sun);
        }
        c = jitter(c, r.yzw, aData.w > 0.5 ? 0.3 : 0.55);
        float turn = (q.y - 0.5) * 2.0 + sin(uTime * 3.0 + r.w * 50.0) * 0.5 * gust;
        vec3 round_ = cross(Nn, view);
        d.dir = dot(round_, round_) > 1e-4 ? normalize(round_) : vec3(0.0, 1.0, 0.0);
        d.spin = turn;
        d.pos = P;
        float s = aData.y / sqrt(aData.w > 0.5 ? 1.0 : keep);
        d.size = vec2(s, s * (aData.w > 0.5 ? 1.2 : 1.5 + 0.5 * q.z));
        d.c1 = hazed(c, P);
        d.c2 = hazed(jitter(c * 1.16, q.zxy, 0.7), P);
        d.alive *= treeVisibility(P);
        d.seed = aData.x;
        d.lift = aData.w > 0.5 ? -0.2 : 0.5;
        d.turnabout = 1.0;
      }`,
			minPx: [5, 8],
			maxPx: [64, 100],
			cells: [4, 2]
		}), 4);
		const shade = new three.Scene();
		const black = new three.MeshBasicMaterial({ side: three.DoubleSide });
		shade.add(new three.Mesh(woodGeometry, black));
		const balls = new three.InstancedMesh(new three.IcosahedronGeometry(1, 1), black, lobes.length / 4);
		const m4 = new three.Matrix4();
		for (let i = 0; i < lobes.length / 4; i++) {
			const r = lobes[i * 4 + 3] * .36;
			m4.makeScale(r, r * .8, r).setPosition(lobes[i * 4], lobes[i * 4 + 1], lobes[i * 4 + 2]);
			balls.setMatrixAt(i, m4);
		}
		balls.frustumCulled = false;
		shade.add(balls);
		const group = new three.Group();
		group.add(woodMesh, barkMesh, leafMesh);
		return {
			group,
			shade,
			colliders,
			trees,
			counts: {
				trees: trees.length,
				bark: nb,
				leaves: nl
			}
		};
	}
	// source: oilpaint/ground.js
	var RING = (n) => `
uniform float uCell;   // this level's square of ground
uniform float uCell0;  // the finest square
uniform vec2 uOrigin;
uniform float uLevel;
uniform float uTop;
uniform float uNear;   // within this, everything is drawn at its true size
const float RN = ${n}.0;
// each: every dab of a square has its own descent (a carpet); otherwise they share it (the fronds of one clump)
bool ringCell(float salt, bool each, out vec2 cell, out float sub) {
  float id = float(gl_InstanceID);
  sub = floor(id / (RN * RN));
  float k = id - sub * RN * RN;
  vec2 block = uOrigin + vec2(mod(k, RN), floor(k / RN)) - RN * 0.5;
  float s = salt + (each ? sub * 17.0 : 0.0);
  if (uLevel < uTop - 0.5) {
    vec2 parent = floor(block * 0.5);
    vec2 pick = parent * 2.0 + step(0.5, hash4(parent, s + (uLevel + 1.0) * 3.3).xy);
    if (pick == block) return false;
  }
  cell = block;
  for (float i = uLevel; i > 0.5; i -= 1.0) cell = cell * 2.0 + step(0.5, hash4(cell, s + i * 3.3).xy);
  return true;
}
// How whole a dab of this level is at this distance, and (lod) how many times its true size things there are drawn.
float ringGrow(float dist, out float lod) {
  lod = max(dist / uNear, 1.0);
  if (uLevel > uTop - 0.5) return 1.0 - smoothstep(0.86, 1.0, dist / (RN * 0.5 * uCell));
  return smoothstep(0.0, 1.0, uLevel + 1.0 - log2(lod));
}
`;
	function groundRings(shared, { head = "", body, per, n, cell0, levels, minPx, maxPx, cells }) {
		const group = new three.Group();
		const geometry = dabGeometry(n * n * per);
		const list = [];
		for (let k = 0; k < levels; k++) {
			const cell = cell0 * 2 ** k;
			const material = dabMaterial(shared, {
				head: head + RING(n),
				body,
				minPx,
				maxPx,
				cells,
				uniforms: {
					uCell: { value: cell },
					uCell0: { value: cell0 },
					uOrigin: { value: new three.Vector2() },
					uLevel: { value: k },
					uTop: { value: levels - 1 },
					uNear: { value: n * cell0 / 4 * .92 }
				}
			});
			const mesh = dabMesh(geometry, material, 2);
			group.add(mesh);
			list.push({
				cell,
				material
			});
		}
		return {
			group,
			follow(x, z) {
				for (const l of list) l.material.uniforms.uOrigin.value.set(Math.floor(x / l.cell), Math.floor(z / l.cell));
			}
		};
	}
	// source: world/floor.js
	var LITTER = `
const vec3 LIT_L[6] = vec3[6](vec3(0.97, 0.71, 0.2), vec3(0.94, 0.5, 0.13), vec3(0.8, 0.25, 0.11), vec3(0.64, 0.45, 0.28), vec3(0.56, 0.62, 0.2), vec3(0.74, 0.58, 0.42));
const vec3 LIT_M[6] = vec3[6](vec3(0.74, 0.47, 0.15), vec3(0.7, 0.33, 0.11), vec3(0.58, 0.18, 0.11), vec3(0.45, 0.3, 0.21), vec3(0.34, 0.42, 0.15), vec3(0.5, 0.38, 0.3));
const vec3 LIT_S[6] = vec3[6](vec3(0.43, 0.25, 0.2), vec3(0.4, 0.19, 0.18), vec3(0.33, 0.12, 0.17), vec3(0.25, 0.18, 0.22), vec3(0.16, 0.25, 0.2), vec3(0.27, 0.22, 0.27));
// r is this dab's own chance; v drifts slowly over the ground, so leaves of a kind lie together
int litterKind(float r, float v, float moss, float way) {
  if (r < way * 0.62) return 5;
  if (fract(r * 7.31) < moss * 0.1) return 4;
  return v < 0.42 ? 0 : v < 0.7 ? 1 : v < 0.84 ? 2 : 3;
}
vec3 litter(int k, float lit, float r) { return paint3(LIT_L[k], LIT_M[k], LIT_S[k], lit, r); }
`;
	var carpet = `
void makeDab(inout Dab d) {
  vec2 cell; float sub;
  if (!ringCell(0.0, true, cell, sub)) { d.alive = 0.0; return; }
  vec4 r = hash4(cell, sub * 3.0 + 1.0);
  vec4 q = hash4(cell + 31.7, sub + 11.0);
  vec2 xz = (cell + r.xy) * uCell0;
  float lod;
  d.alive = ringGrow(distance(xz, uFocus.xz), lod);
  if (d.alive <= 0.0) return;
  vec3 P = vec3(xz.x, heightAt(xz), xz.y);
  vec3 Nn = normalAt(xz);
  vec4 m = texture(tLand, landUv(xz));
  float lit = woodSunAt(P + vec3(0.0, 0.2, 0.0)) * clamp(dot(Nn, uSunDir) * 2.4, 0.0, 1.0);
  float patch_ = texture(tNoise, xz / 13.0).r * 1.9 + texture(tNoise, xz / 3.7).g * 0.5;
  int kind = litterKind(q.x, fract(patch_ + (q.z - 0.5) * 0.3), m.b, m.r);
  vec3 c1 = litter(kind, lit, q.y);
  int other = litterKind(q.z, fract(patch_ + 0.2 + (q.w - 0.5) * 0.5), m.b, m.r * 0.5);
  vec3 c2 = litter(other, lit, q.w);
  // the open ground of the clearing is grass gone to gold
  vec3 gl = paint3(vec3(0.95, 0.8, 0.36), vec3(0.62, 0.52, 0.2), vec3(0.2, 0.2, 0.2), lit, q.y);
  float grassy = step(r.z, m.g * 0.8);
  c1 = mix(c1, gl, grassy);
  // here and there a wet leaf in the shade gives back the sky
  if (lit < 0.2 && q.w > 0.93) c1 = mix(vec3(0.34, 0.36, 0.52), vec3(0.2, 0.17, 0.26), q.z);
  c1 = jitter(c1, r.wzy, 0.5);
  c2 = jitter(c2, q.wzy, 0.3);
  // Broad, quiet path pigments let characters and enemy telegraphs carry contrast.
  vec3 pathPaint=paint3(vec3(.78,.66,.44),vec3(.51,.45,.34),vec3(.37,.38,.36),lit,q.y);
  c1=mix(c1,pathPaint*(.94+.10*q.z),m.r*.95);
  c2=mix(c2,pathPaint*1.035,m.r*.95);
  // leaves lie any way round, though those that fell together lie much alike
  float a = (texture(tNoise, xz / 6.3).a * 1.2 + q.y * 0.8) * TAU;
  d.dir = vec3(cos(a), 0.0, sin(a));
  d.pos = P;
  d.size = uCell0 * vec2(1.05 + 0.5 * r.z, 1.7 + 0.9 * r.w) * lod;
  d.c1 = hazed(c1, P);
  d.c2 = hazed(c2, P);
  d.seed = dot(cell, vec2(1.0, 57.0)) + sub * 0.37;
  d.turnabout = 1.0;
  d.lie = 1.0;
  d.nrm = Nn;
  d.height = (0.03 + 0.07 * q.z) * pow(lod, 0.35);
  d.glaze = 1.0;
}
`;
	var growth = `
void makeDab(inout Dab d) {
  vec2 cell; float sub;
  if (!ringCell(40.0, false, cell, sub)) { d.alive = 0.0; return; }
  vec4 r = hash4(cell, 40.0);
  vec4 q = hash4(cell + 17.3, 51.0);
  vec4 f = hash4(cell + sub * 7.7 + 3.1, sub * 13.0 + 3.0);
  vec2 foot = (cell + r.xy) * uCell0;
  float lod;
  d.alive = ringGrow(distance(foot, uFocus.xz), lod);
  if (d.alive <= 0.0) return;
  vec4 m = texture(tLand, landUv(foot));
  // it grows in drifts, keeps off the way, and fills the clearing
  float drift = smoothstep(0.46, 0.7, texture(tNoise, foot / 37.0).a);
  float chance = max(0.04 + 0.7 * drift, m.g) * (1.0 - m.r) * smoothstep(9.0, 20.0, length(foot));
  if (q.x > chance) { d.alive = 0.0; return; }
  float grass = step(q.z, max(m.g * 1.1, 0.22));           // a tuft of grass rather than a fern
  float kind = fract(q.y * 3.7 + floor(texture(tNoise, foot / 14.0).r * 3.0) * 0.33);
  float big = min(pow(lod, 0.6), 2.2);
  float a = (sub + f.x) / 6.0 * TAU + r.z * TAU;
  vec2 fan = vec2(cos(a), sin(a));
  vec2 xz = foot + fan * mix(0.1, 0.03, grass) * big;
  vec3 P = vec3(xz.x, heightAt(xz), xz.y);
  float gust = gustAt(xz);
  float lit = sunAt(P + vec3(0.0, 0.3, 0.0));
  vec3 c;
  if (grass > 0.5) c = paint3(vec3(1.0, 0.88, 0.46), vec3(0.76, 0.6, 0.24), vec3(0.3, 0.27, 0.2), lit, f.w);
  else if (kind < 0.45) c = paint3(vec3(0.98, 0.58, 0.16), vec3(0.68, 0.36, 0.13), vec3(0.34, 0.18, 0.16), lit, f.w);   // bracken turned rust
  else if (kind < 0.75) c = paint3(vec3(1.0, 0.82, 0.26), vec3(0.72, 0.54, 0.15), vec3(0.34, 0.26, 0.16), lit, f.w);    // fern gone yellow
  else c = paint3(vec3(0.66, 0.74, 0.25), vec3(0.34, 0.45, 0.16), vec3(0.13, 0.23, 0.17), lit, f.w);                     // still green
  c = jitter(c, f.zwx, 0.55);
  float sway = sin(uTime * (1.6 + f.z) + f.w * 40.0) * (0.04 + 0.1 * gust);
  vec2 lean = fan * mix(0.9 + 1.3 * f.y, 0.12 + 0.4 * f.y, grass) + uWind.xy * (0.08 + 0.6 * gust + sway);
  d.dir = normalize(vec3(lean.x, 1.0, lean.y));
  d.pos = P - vec3(0.0, 0.02, 0.0);
  float tall = mix(0.45, 0.85, f.z) * mix(1.0, 1.3, m.g) * mix(0.72, 1.0, grass);
  // a frond is a broad curved stroke that arches over; a blade of grass a thin straight one
  d.size = vec2(mix(0.17, 0.04, grass) * big * (0.8 + 0.5 * f.x), tall);
  d.cell = grass > 0.5 ? floor(f.y * 2.99) : (f.x > 0.5 ? 3.0 : 7.0);
  d.c1 = hazed(c, P);
  d.c2 = hazed(jitter(c * 1.2, f.xzy, 0.8), P);
  d.seed = dot(cell, vec2(1.0, 57.0)) + sub * 0.37 + 0.5;
  d.base = 1.0;
  d.lift = 0.25;
}
`;
	function createFloor(shared) {
		const carpetRings = groundRings(shared, {
			head: LITTER,
			body: carpet,
			per: 2,
			n: 56,
			cell0: .44,
			levels: 5,
			minPx: [5, 9],
			maxPx: [4e3, 4e3],
			cells: [0, 8]
		});
		const growthRings = groundRings(shared, {
			head: LITTER,
			body: growth,
			per: 4,
			n: 32,
			cell0: 1.1,
			levels: 3,
			minPx: [2.5, 12],
			maxPx: [60, 420],
			cells: [0, 4]
		});
		const group = new three.Group();
		group.add(carpetRings.group, growthRings.group);
		return {
			group,
			follow(x, z) {
				carpetRings.follow(x, z);
				growthRings.follow(x, z);
			}
		};
	}
	// source: world/leaves.js
	function createLeaves(shared, count = 2400) {
		return { mesh: dabMesh(dabGeometry(count), dabMaterial(shared, {
			body: `
      const vec3 BOX = vec3(64.0, 26.0, 64.0);
      void makeDab(inout Dab d) {
        float id = float(gl_InstanceID);
        vec4 r = hash4(id * 1.13 + 3.0);
        vec4 q = hash4(id * 2.71 + 19.0);
        float fall = 0.9 + 1.3 * r.w;
        vec3 p = r.xyz * BOX;
        p.y -= uTime * fall;
        p.xz += uWind.xy * uTime * (0.6 + 1.6 * q.x) + vec2(sin(uTime * (0.7 + q.y) + q.z * 20.0), cos(uTime * (0.9 + q.w) + q.x * 20.0)) * 0.6;
        vec3 origin = vec3(cameraPosition.x, uFocus.y + 11.0, cameraPosition.z);
        p = mod(p - origin + BOX * 0.5, BOX) - BOX * 0.5 + origin;
        float ground = heightAt(p.xz);
        float gust = gustAt(p.xz);
        // most hang on until a gust; all vanish into the carpet
        d.alive = smoothstep(q.z * 0.75 - 0.08, q.z * 0.75 + 0.05, gust + 0.2) * smoothstep(ground, ground + 0.5, p.y) * (1.0 - smoothstep(BOX.x * 0.38, BOX.x * 0.5, distance(p.xz, cameraPosition.xz)));
        if (d.alive <= 0.0) return;
        float sun = sunAt(p);
        float turnOver = sin(uTime * (2.0 + 3.0 * q.y) + q.w * 30.0);
        vec3 c = q.x < 0.5 ? vec3(1.0, 0.76, 0.2) : q.x < 0.8 ? vec3(0.98, 0.5, 0.12) : vec3(0.86, 0.22, 0.1);
        c = mix(c * vec3(0.36, 0.3, 0.36), c, sun * (0.72 + 0.28 * turnOver));
        d.pos = p;
        d.dir = normalize(vec3(sin(uTime * 1.3 + q.z * 9.0), turnOver, cos(uTime * 1.7 + q.x * 9.0)));
        d.size = vec2(0.085, 0.13) * (0.7 + 0.7 * r.x) * (0.55 + 0.45 * abs(turnOver));
        d.c1 = hazed(jitter(c, r.zxy, 0.4), p);
        d.c2 = d.c1 * 1.12;
        d.seed = id;
        d.lift = 0.0;
      }`,
			minPx: [2.5, 3.5],
			maxPx: [24, 36],
			cells: [4, 2]
		}), 6) };
	}
	// ../../../../../private/tmp/wilderlight-opening/clone.js
	function clone(source) {
		const root = source.clone(true), orig = [], copy = [];
		source.traverse((n) => orig.push(n));
		root.traverse((n) => copy.push(n));
		const pairs = new Map(orig.map((n, i) => [n, copy[i]]));
		for (const n of orig) if (n.isSkinnedMesh) {
			const m = pairs.get(n), sk = n.skeleton.clone();
			sk.bones = n.skeleton.bones.map((b) => pairs.get(b));
			m.bind(sk, n.bindMatrix);
		}
		return root;
	}
	// source: cel-material.js
	function celMaterial(source, { displaySpace = false, shadeBothSides = false } = {}) {
		const material = new three.MeshBasicMaterial({
			color: source.color,
			vertexColors: !!source.vertexColors,
			map: source.map || null,
			side: source.side,
			alphaTest: source.alphaTest || 0
		});
		material.onBeforeCompile = (shader) => {
			shader.uniforms.uCelFlash = { value: 0 };
			shader.uniforms.uCelRage = { value: 0 };
			material.userData.shader = shader;
			shader.vertexShader = shader.vertexShader.replace("#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )", "#if 1").replace("#include <common>", "#include <common>\nvarying vec3 vCelNormal;varying vec3 vCelView;").replace("#include <project_vertex>", "#include <project_vertex>\nvCelNormal=normalize(transformedNormal);vCelView=-mvPosition.xyz;");
			shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vCelNormal;varying vec3 vCelView;uniform float uCelFlash;uniform float uCelRage;").replace("#include <color_fragment>", `#include <color_fragment>
    vec3 celN=normalize(vCelNormal);
    ${shadeBothSides ? "if (!gl_FrontFacing) celN = -celN;" : ""}
    float celL=dot(celN,normalize(vec3(-.55,.72,.65)));
    float celAA=max(fwidth(celL)*.8,.008);
    float celMid=smoothstep(-.08-celAA,-.08+celAA,celL);
    float celHi=smoothstep(.54-celAA,.54+celAA,celL);
    vec3 celBase=${displaySpace ? "pow(max(diffuseColor.rgb,vec3(.0001)),vec3(.454545))" : "diffuseColor.rgb"};
    vec3 celShade=celBase*vec3(.43,.49,.62)+vec3(.014,.018,.024);
    vec3 celColor=mix(celShade,celBase*.82,celMid);
    celColor=mix(celColor,celBase*1.05+vec3(.022,.014,.004),celHi);
    float celEdge=1.-smoothstep(.03,.13,abs(dot(celN,normalize(vCelView))));
    diffuseColor.rgb=mix(celColor,celColor*.55,celEdge*.55);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.5,.27,.18)+vec3(.17,.015,.005),uCelRage*.68);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.93,.74),uCelFlash*.7);
   `);
		};
		material.customProgramCacheKey = () => `brushbound-cel-v3-${displaySpace}-${shadeBothSides}`;
		return material;
	}
	// source: actors.js
	function paintedMaterial(source, shared) {
		const mat = new three.MeshBasicMaterial({
			map: source.map,
			color: source.color,
			side: source.side,
			transparent: false,
			alphaTest: source.alphaTest || 0
		});
		mat.onBeforeCompile = (shader) => {
			Object.assign(shader.uniforms, shared);
			shader.uniforms.uActorFlash = { value: 0 };
			mat.userData.shader = shader;
			shader.vertexShader = shader.vertexShader.replace("#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )", "#if 1").replace("#include <common>", "#include <common>\nvarying vec3 vPaintP;varying vec3 vPaintN;").replace("#include <project_vertex>", "#include <project_vertex>\nvPaintP=(modelMatrix*vec4(transformed,1.)).xyz;vPaintN=inverseTransformDirection(transformedNormal,viewMatrix);");
			shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${COMMON}\nvarying vec3 vPaintP;varying vec3 vPaintN;uniform float uActorFlash;`).replace("#include <color_fragment>", `#include <color_fragment>
   vec3 Np=normalize(vPaintN);float lit=sunAt(vPaintP+Np*.06)*clamp(dot(Np,uSunDir)*.7+.55,0.,1.);
   vec3 pigment=pow(max(diffuseColor.rgb,vec3(.001)),vec3(.4545));
   float grain=texture(tNoise,vPaintP.xy*vec2(3.5,1.3)+vPaintP.z*.13).r;
   vec3 hi=mix(pigment,pigment*vec3(1.11,1.04,.86)+vec3(.08,.055,.01),.6);
   vec3 mid=pigment*.77+vec3(.02,.025,.05);vec3 lo=pigment*vec3(.36,.42,.58)+vec3(.045,.036,.06);
   diffuseColor.rgb=paint3(hi,mid,lo,lit,grain)*(.94+.12*grain);
   diffuseColor.rgb=hazed(diffuseColor.rgb+pigment*uLampCol*lampAt(vPaintP,Np)*.25,vPaintP);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.9,.7),uActorFlash*.6);`);
		};
		mat.customProgramCacheKey = () => "brushbound-painted-actor-3";
		return mat;
	}
	const actorClipCache = new WeakMap();
	function actorClips(gltf) {
		// Remove a binding only when every clip leaves this bone property at its
		// rest value (within GLB float precision). Crossfades, one-shots and return-to-idle stay equivalent.
		const unchanged = new Map();
		for (const clip of gltf.animations) for (const track of clip.tracks) {
			const path = three.PropertyBinding.parseTrackName(track.name);
			const node = gltf.scene.getObjectByName(path.nodeName);
			const property = node?.[path.propertyName];
			let same = !!node?.isBone && !path.propertyIndex && !!property?.toArray;
			if (same) {
				const rest = property.toArray();
				for (let i = 0; i < track.values.length; i++) if (Math.abs(track.values[i] - rest[i % rest.length]) > 1e-6) { same = false; break; }
			}
			unchanged.set(track.name, (unchanged.get(track.name) ?? true) && same);
		}
		return gltf.animations.map(clip => new three.AnimationClip(clip.name, clip.duration, clip.tracks.filter(track => !unchanged.get(track.name)), clip.blendMode));
	}
	var ActorView = class {
		constructor(data, assets, shared, scene, { hero = false } = {}) {
			this.hero = hero;
			this.data = data;
			const goblin = !hero && data.faction === "goblin" && !!assets["goblin-small"];
			const goblinKinds = {minion:"small",warrior:"armored",mage:"archer",boss:"officer"};
			const gltf = assets[hero ? data.kind : goblin ? `goblin-${goblinKinds[data.kind]}` : data.kind === "boss" ? "skeleton-warrior" : `skeleton-${data.kind}`];
			this.object = new three.Group();
			this.model = clone(gltf.scene);
			this.object.add(this.model);
			scene.add(this.object);
			const scale = goblin ? ({minion:.77,warrior:.88,mage:.83,boss:1.55}[data.kind]) : data.kind === "boss" ? 1.8 : hero ? 1 : .93;
			this.model.scale.setScalar(scale);
			this.ownedGeometry = [];
			if (!hero && !goblin) {
				const bone = this.model.getObjectByName("handslotr");
				const item = clone(assets[data.kind === "mage" ? "skeleton-staff" : "skeleton-blade"].scene);
				if (bone) bone.add(item);
			}
			if (data.kind === "boss" && !goblin) {
				const head = this.model.getObjectByName("head"), crown = new three.Group();
				crown.position.y = .2;
				const gold = new three.MeshBasicMaterial({ color: 10914125 }), bandGeo = new three.TorusGeometry(.34, .055, 5, 12), thornGeo = new three.ConeGeometry(.055, .55, 4);
				this.ownedGeometry.push(bandGeo, thornGeo);
				const band = new three.Mesh(bandGeo, gold);
				band.rotation.x = Math.PI / 2;
				crown.add(band);
				for (let i = 0; i < 7; i++) {
					const a = i / 7 * Math.PI * 2, m = new three.Mesh(thornGeo, gold);
					m.position.set(Math.cos(a) * .33, .18 + Math.sin(i * 4) * .07, Math.sin(a) * .33);
					m.rotation.z = -Math.cos(a) * .4;
					m.rotation.x = Math.sin(a) * .4;
					crown.add(m);
				}
				head?.add(crown);
			}
			this.materials = [];
			this.skeletons = /* @__PURE__ */ new Set();
			const skeletonCache = /* @__PURE__ */ new Map();
			this.model.updateMatrixWorld(true);
			this.model.traverse((m) => {
				if (!m.isMesh) return;
				if (m.isSkinnedMesh) {
					const key = m.skeleton.bones.map((b) => b.uuid).join("|");
					if (skeletonCache.has(key)) m.skeleton = skeletonCache.get(key);
					else skeletonCache.set(key, m.skeleton);
					this.skeletons.add(m.skeleton);
				}
				m.frustumCulled = !hero;
				// Conservative authored-animation envelope: keeps all limbs in view
				// while allowing independent camera and shadow-pass culling.
				if (!hero && m.isSkinnedMesh) m.boundingSphere = new three.Sphere(new three.Vector3(0, 1, 0), 6);
				m.layers.enable(1);
				const original = m.material;
				// Some goblin armour is an inward-wound, double-sided shell.
				// Light the visible surface after applying the animated bone normals.
				const paint = source => celMaterial(source, {displaySpace: true, shadeBothSides: goblin && source.side === three.DoubleSide});
				m.material = Array.isArray(original) ? original.map(paint) : paint(original);
				this.materials.push(...Array.isArray(m.material) ? m.material : [m.material]);
			});
			this.mixer = new three.AnimationMixer(this.model);
			let cachedClips = actorClipCache.get(gltf);
			if (!cachedClips) {
				const clips = actorClips(gltf);
				cachedClips = new Map(clips.map((c) => [c.name, c]));
				if (hero) {
					const isLeg = (t) => /upperleg|lowerleg|foot|toes|knee|heel|toe.roll/i.test(t.name);
					for (const clip of clips) {
						if (/Attack|Shoot|Punch/.test(clip.name)) cachedClips.set(clip.name + "_Upper", new three.AnimationClip(clip.name + "_Upper", clip.duration, clip.tracks.filter(t => !isLeg(t))));
						if (["Running_A", "Idle"].includes(clip.name)) cachedClips.set(clip.name + "_Lower", new three.AnimationClip(clip.name + "_Lower", clip.duration, clip.tracks.filter(isLeg)));
					}
				}
				actorClipCache.set(gltf, cachedClips);
			}
			// Static attachment transforms never change; retain world propagation from
			// their animated parents, but skip recomposing their local TRS every frame.
			const animatedNames = new Set();
			for (const clip of cachedClips.values()) for (const track of clip.tracks) animatedNames.add(three.PropertyBinding.parseTrackName(track.name).nodeName);
			this.model.traverse(n => { if (!animatedNames.has(n.name)) { n.updateMatrix(); n.matrixAutoUpdate = false; } });
			this.clips = cachedClips;
			this.actions = /* @__PURE__ */ new Map();
			this.current = null;
			this.lower = null;
			this.attackSeq = -1;
			this.lock = 0;
			this.dead = false;
			this.strideTime = 0;
			this.moveSpeed = Math.max(0, data.moving || 0);
			this.running = this.moveSpeed > .4;
			this.stopFor = 0;
			this.setAction("Idle", .01);
			this.object.position.set(data.x, heightAt(data.x, data.z), data.z);
			this.yaw = data.face || 0;
			this.object.rotation.y = this.yaw;
			this.ring = new three.Group();
			if (hero) {
				const ringGeo = new three.RingGeometry(.5, .56, 48);
				ringGeo.rotateX(-Math.PI / 2);
				this.ring = new three.Mesh(ringGeo, new three.MeshBasicMaterial({color:data.color, transparent:true, opacity:.55, depthWrite:false}));
				scene.add(this.ring);
			}
		}
		prewarm() {
			if(this.hero){
				for(const name of ["Idle","Running_A","Death_A","Cheer","Idle_Lower","Running_A_Lower","1H_Melee_Attack_Slice_Horizontal_Upper","2H_Ranged_Shoot_Upper","Spellcast_Shoot_Upper"])if(this.clips.has(name))this.action(name);
				return;
			}
			const attack = this.data.kind === "mage" ? (this.data.faction === "goblin" ? "2H_Ranged_Shoot" : "Spellcast_Shoot") : "1H_Melee_Attack_Chop";
			for (const name of ["Idle", "Running_A", "Death_A", attack, "Unarmed_Melee_Attack_Punch_A", ...(this.data.kind === "boss" ? ["2H_Melee_Attack_Spin", "2H_Melee_Attack_Chop", "1H_Melee_Attack_Slice_Horizontal"] : [])]) this.action(name);
		}
		reset(data) {
			this.mixer.stopAllAction();
			this.data=data;this.current=null;this.lower=null;this.attackSeq=-1;this.lock=0;this.dead=false;
			this.strideTime=0;this.moveSpeed=Math.max(0,data.moving||0);this.running=this.moveSpeed>.4;this.stopFor=0;this.yaw=data.face||0;
			this.object.visible=true;this.object.scale.setScalar(1);this.object.rotation.set(0,this.yaw,0);
			this.setAction("Idle",0);this.update(data,0,"playing");
		}

		action(name) {
			if (!this.clips.has(name)) name = "Idle";
			if (!this.actions.has(name)) this.actions.set(name, this.mixer.clipAction(this.clips.get(name)));
			return this.actions.get(name);
		}
		setAction(name, fade = .12, { once = false, speed = 1 } = {}) {
			const a = this.action(name);
			if (a === this.current && !once) {
				a.setEffectiveTimeScale(speed);
				return;
			}
			a.reset().setEffectiveTimeScale(speed).setEffectiveWeight(1);
			a.setLoop(once ? three.LoopOnce : three.LoopRepeat, once ? 1 : Infinity);
			a.clampWhenFinished = once;
			a.play();
			if (this.current && this.current !== a) this.current.crossFadeTo(a, fade, false);
			this.current = a;
		}
		update(data, dt, phase) {
			this.data = data;
			// A brief formation correction must not restart the authored running cycle.
			this.moveSpeed += ((data.moving || 0) - this.moveSpeed) * (1 - Math.exp(-14 * dt));
			if (data.moving > .4) { this.running = true; this.stopFor = 0; }
			else { this.stopFor += dt; if (this.stopFor > .12) this.running = false; }
			const runRate = Math.max(.75, this.moveSpeed / 5);
			if (data.hp <= 0 && !this.dead) {
				this.dead = true;
				this.setAction("Death_A", .1, { once: true });
				this.lock = 10;
			}
			if (data.hp > 0 && this.dead) {
				this.dead = false;
				this.lock = 0;
				this.setAction("Idle", .1);
			}
			this.lock = Math.max(0, this.lock - dt);
			const special = data.hp > 0 && (data.spinLeft > 0 || data.action);
			if (data.hp > 0 && !special && data.attackSeq !== this.attackSeq) {
				if (this.attackSeq >= 0 && data.attackSeq > this.attackSeq) {
					let n = data.kind === "knight" ? "1H_Melee_Attack_Slice_Horizontal" : data.kind === "ranger" ? "2H_Ranged_Shoot" : data.kind === "mage" ? (data.faction === "goblin" ? "2H_Ranged_Shoot" : "Spellcast_Shoot") : data.kind === "boss" ? "2H_Melee_Attack_Spin" : "1H_Melee_Attack_Chop";
					if (!this.clips.has(n)) n = ["1H_Melee_Attack_Chop", "1H_Melee_Attack_Slice_Horizontal", "2H_Ranged_Shoot", "Spellcast_Shoot", "Idle"].find(name => this.clips.has(name)) || "Idle";
					const duration = this.hero ? .58 : (data.attack?.left || .6) + .2;
					this.setAction(this.hero ? n + "_Upper" : n, .08, {
						once: true,
						speed: this.hero ? 1.7 : (this.clips.get(n)?.duration || duration) / duration
					});
					this.lock = duration;
				}
				this.attackSeq = data.attackSeq;
			}
			if (special) {
                this.attackSeq = data.attackSeq;
                const kind = data.spinLeft > 0 ? 'hero-spin' : data.action.kind;
                const name = kind === 'hero-spin' ? '1H_Melee_Attack_Slice_Horizontal_Upper' : kind === 'spin' ? '2H_Melee_Attack_Spin' : kind === 'leap' ? '2H_Melee_Attack_Chop' : ['sweep','execute'].includes(kind) ? '1H_Melee_Attack_Slice_Horizontal' : 'Running_A';
                this.setAction(name, .1, { speed: kind === 'dash' ? 1.6 : kind === 'leap' ? 1.15 : 1.8 });
                this.lock = .12;
            }
			if (this.hero && data.hp > 0 && this.lock > 0) {
				const a = this.action(this.running ? "Running_A_Lower" : "Idle_Lower");
				if (a !== this.lower) {
					a.reset().setLoop(three.LoopRepeat, Infinity).setEffectiveWeight(1).play().fadeIn(.08);
					this.lower?.fadeOut(.08);
					this.lower = a;
				}
				a.setEffectiveTimeScale(this.running ? runRate : 1);
			} else if (this.lower) {
				this.lower.fadeOut(.12);
				this.lower = null;
			}
			if (data.hp > 0 && this.lock === 0) {
				const n = phase === "victory" ? "Cheer" : this.running ? "Running_A" : "Idle";
				this.setAction(n, .15, { speed: n === "Running_A" ? runRate : 1 });
			}
			// Full-body and masked attack locomotion share one uninterrupted stride clock.
			for (const name of ["Running_A", "Running_A_Lower"]) {
				const action = this.actions.get(name);
				if (action) { action.time = this.strideTime; action.setEffectiveTimeScale(runRate); }
			}
			this.mixer.update(dt);
			const strideDuration = this.clips.get("Running_A")?.duration;
			if (this.running && strideDuration) this.strideTime = (this.strideTime + dt * runRate) % strideDuration;
			this.object.position.set(data.x, heightAt(data.x, data.z) + (data.spawn > 0 ? -data.spawn * .4 : 0) + (data.jumpY || 0), data.z);
			let delta = Math.atan2(Math.sin(data.face - this.yaw), Math.cos(data.face - this.yaw));
			this.yaw += delta * (1 - Math.exp(-12 * dt));
			this.object.rotation.y = this.yaw + (data.spinLeft > 0 ? data.spinAngle : data.action?.kind==='execute' ? (1-data.action.left/data.action.duration)*Math.PI*2 : 0);
			this.object.scale.setScalar(data.spawn > 0 ? Math.max(.2, 1 - data.spawn * .5) : 1);
			// The renderer updates world matrices and each shared skeleton before drawing.
			this.ring.position.set(data.x, heightAt(data.x, data.z) + .07, data.z);
			this.ring.visible = this.hero && data.hp > 0;
			for (const m of this.materials) if (m.userData.shader) {m.userData.shader.uniforms.uCelFlash.value = Math.min(1, (data.hitFlash || 0) * 5);m.userData.shader.uniforms.uCelRage.value = data.enraged&&data.hp>0?1:0;}
		}
		dispose(scene) {
			scene.remove(this.object, this.ring);
			this.mixer.stopAllAction();
			this.mixer.uncacheRoot(this.model);
			for (const skeleton of this.skeletons) skeleton.dispose();
			for (const geo of this.ownedGeometry) geo.dispose();
			this.ring.geometry?.dispose();
			this.ring.material?.dispose();
			for (const m of this.materials) m.dispose();
		}
	};
	// source: oilpaint/pins.js
	/**
	* palettes: [[light, half-tone, shade, (its own colour, for a lamp's light)], ...]. parts: [{ mesh, count, accept(p), style(p, n) -> { pal, size: [across, along], dir } }],
	* where p and n are a point of the mesh and its normal in the pose it was made in.
	*/
	function pinDabs(shared, palettes, parts) {
		let seed = 9151;
		const rand = () => (seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296;
		const pins = [];
		const a = new three.Vector3(), b = new three.Vector3(), c = new three.Vector3();
		for (const part of parts) {
			const g = part.mesh.geometry, pos = g.attributes.position, nrm = g.attributes.normal, index = g.index;
			const tris = index ? index.count / 3 : pos.count / 3;
			const at = (t, k) => index ? index.getX(t * 3 + k) : t * 3 + k;
			const sums = new Float32Array(tris);
			let total = 0;
			for (let t = 0; t < tris; t++) {
				a.fromBufferAttribute(pos, at(t, 0));
				b.fromBufferAttribute(pos, at(t, 1));
				c.fromBufferAttribute(pos, at(t, 2));
				total += b.sub(a).cross(c.sub(a)).length();
				sums[t] = total;
			}
			for (let made = 0, tries = 0; made < part.count && tries < part.count * 40; tries++) {
				const want = rand() * total;
				let lo = 0, hi = tris - 1;
				while (lo < hi) {
					const mid = lo + hi >> 1;
					if (sums[mid] < want) lo = mid + 1;
					else hi = mid;
				}
				const v = at(lo, Math.floor(rand() * 3));
				const p = new three.Vector3().fromBufferAttribute(pos, v), n = new three.Vector3().fromBufferAttribute(nrm, v);
				if (part.accept && !part.accept(p)) continue;
				const s = part.style(p, n);
				pins.push({
					mesh: part.mesh,
					v,
					p,
					n,
					d: s.dir.clone().normalize(),
					pal: s.pal,
					size: s.size,
					seed: rand() * 1e3
				});
				made++;
			}
		}
		const count = pins.length;
		const aPos = new Float32Array(count * 3), aDir = new Float32Array(count * 3), aNrm = new Float32Array(count * 3), aData = new Float32Array(count * 4);
		pins.forEach((pin, i) => aData.set([
			pin.seed,
			pin.size[0],
			pin.size[1],
			pin.pal
		], i * 4));
		const geometry = dabGeometry(count, {
			aPos: [aPos, 3],
			aDir: [aDir, 3],
			aNrm: [aNrm, 3]
		}, true);
		geometry.setAttribute("aData", new three.InstancedBufferAttribute(aData, 4));
		const list = (k) => palettes.map((p) => `vec3(${p[k].map((x) => x.toFixed(3))})`).join(", ");
		const n = palettes.length;
		return {
			mesh: dabMesh(geometry, dabMaterial(shared, {
				head: `
      in vec3 aPos; in vec3 aDir; in vec3 aNrm; in vec4 aData;
      const vec3 FIG_L[${n}] = vec3[${n}](${list(0)});
      const vec3 FIG_M[${n}] = vec3[${n}](${list(1)});
      const vec3 FIG_S[${n}] = vec3[${n}](${list(2)});
      const vec3 FIG_A[${n}] = vec3[${n}](${palettes.map((p) => `vec3(${(p[3] ?? p[0]).map((x) => x.toFixed(3))})`).join(", ")});`,
				body: `
      void makeDab(inout Dab d) {
        vec3 Nn = normalize(aNrm);
        // on the far side of him: not ours to paint
        if (dot(Nn, normalize(cameraPosition - aPos)) < -0.05) { d.alive = 0.0; return; }
        vec4 r = hash4(aData.x);
        int k = int(aData.w + 0.5);
        float lit = sunAt(aPos + Nn * 0.08) * clamp(dot(Nn, uSunDir) * 0.85 + 0.42, 0.0, 1.0);
        vec3 c = paint3(FIG_L[k], FIG_M[k], FIG_S[k], lit, r.x);
        // warm light thrown up by the leaves on the ground, cool light from the sky into the shade
        c += uBounce * max(-Nn.y, 0.0) * (1.0 - lit);
        c = mix(c, c * vec3(0.86, 0.92, 1.18), (1.0 - lit) * max(Nn.y, 0.0) * 0.6);
        c = jitter(c, r.yzw, 0.45);
        c += FIG_A[k] * uLampCol * lampAt(aPos, Nn);
        d.pos = aPos;
        d.dir = aDir;
        d.size = aData.yz * (0.8 + 0.45 * r.y);
        d.c1 = hazed(c, aPos);
        d.c2 = hazed(jitter(c * 1.22, r.wxy, 0.5), aPos);
        d.seed = aData.x;
        d.lift = 0.3;
        d.turnabout = 1.0;
      }`,
				minPx: [2.5, 4],
				maxPx: [200, 400],
				cells: [0, 6]
			}), 5),
			count,
			update() {
				for (let i = 0; i < count; i++) {
					const pin = pins[i], m = pin.mesh, k = i * 3;
					a.copy(pin.p);
					if (m.isSkinnedMesh) m.applyBoneTransform(pin.v, a);
					a.applyMatrix4(m.matrixWorld);
					b.copy(pin.p).addScaledVector(pin.n, .03);
					if (m.isSkinnedMesh) m.applyBoneTransform(pin.v, b);
					b.applyMatrix4(m.matrixWorld);
					c.copy(pin.p).addScaledVector(pin.d, .03);
					if (m.isSkinnedMesh) m.applyBoneTransform(pin.v, c);
					c.applyMatrix4(m.matrixWorld);
					aPos[k] = a.x;
					aPos[k + 1] = a.y;
					aPos[k + 2] = a.z;
					aNrm[k] = b.x - a.x;
					aNrm[k + 1] = b.y - a.y;
					aNrm[k + 2] = b.z - a.z;
					aDir[k] = c.x - a.x;
					aDir[k + 1] = c.y - a.y;
					aDir[k + 2] = c.z - a.z;
				}
				for (const name of [
					"aPos",
					"aDir",
					"aNrm"
				]) geometry.attributes[name].needsUpdate = true;
			}
		};
	}
	// source: render-foundation/core.mjs
	function seededRandom(seed, namespace = "world") {
		const key = JSON.stringify([String(seed), String(namespace)]);
		let state = 2166136261;
		for (const char of key) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
		return () => {
			state = state + 1831565813 >>> 0;
			let n = Math.imul(state ^ state >>> 15, state | 1);
			n ^= n + Math.imul(n ^ n >>> 7, n | 61);
			return ((n ^ n >>> 14) >>> 0) / 4294967296;
		};
	}
	// source: world.js
	var OBSTACLES = [
		{
			x: -11,
			z: -4,
			r: 1.5
		},
		{
			x: 10,
			z: 5,
			r: 1.5
		},
		{
			x: -17,
			z: -13,
			r: 1.4
		},
		{
			x: 16,
			z: -16,
			r: 1.6
		},
		{
			x: -6,
			z: 17,
			r: 1.1
		}
	];
	function makeWorld(renderer, assets) {
		const scene = new three.Scene();
		scene.background = new three.Color(.58, .56, .51);
		const shared = createShared();
		shared.tBrush.value = createBrushSheet();
		shared.uHaze.value.setRGB(.39, .45, .44);
		shared.uHazeSun.value.setRGB(.94, .83, .61);
		shared.uHazeDensity.value = .0038;
		shared.uImpasto.value = 1.18;
		shared.uBounce.value.setRGB(.1, .065, .015);
		shared.uWind.value.z = .55;
		const land = createLand(shared);
		scene.add(land);
		const forest = createForest(shared);
		scene.add(forest.group);
		const floor = createFloor(shared);
		scene.add(floor.group);
		const leaves = createLeaves(shared, 300);
		scene.add(leaves.mesh);
		const props = new three.Group();
		scene.add(props);
		const rockObjects = [];
		const rnd = seededRandom("brushbound-world", "rocks");
		for (let i = 0; i < OBSTACLES.length; i++) {
			const o = OBSTACLES[i], root = assets[i % 2 ? "rock-a" : "rock-b"].scene.clone(true);
			root.position.set(o.x, heightAt(o.x, o.z), o.z);
			root.rotation.y = rnd() * 6.28;
			const sz = new three.Box3().setFromObject(root).getSize(new three.Vector3()), s = o.r * 1.8 / Math.max(sz.x, sz.z);
			root.scale.setScalar(s);
			root.updateMatrixWorld(true);
			root.traverse((m) => {
				if (m.isMesh) m.material = paintedMaterial(m.material, shared);
			});
			props.add(root);
			rockObjects.push(root);
		}
		const stone = paintedMaterial(new three.MeshBasicMaterial({ color: 10263430 }), shared);
		const dark = paintedMaterial(new three.MeshBasicMaterial({ color: 6712416 }), shared);
		const add = (geo, mat, x, y, z, rot = 0) => {
			const m = new three.Mesh(geo, mat);
			m.position.set(x, y + heightAt(x, z), z);
			m.rotation.y = rot;
			props.add(m);
			return m;
		};
		for (const x of [-4.7, 4.7]) {
			for (let k = 0; k < 5; k++) add(new three.CylinderGeometry(.52 + (k === 0 ? .18 : 0), .59, .72, 8), stone, x, k * .74 + .36, -21, k * .17);
			add(new three.BoxGeometry(1.5, .3, 1.35), dark, x, 3.8, -21, .08);
			add(new three.BoxGeometry(1.75, .35, 1.55), stone, x, .13, -21, .1);
		}
		for (let i = 0; i < 13; i++) {
			const a = i / 12 * Math.PI, x = Math.cos(a) * 4.7, y = 3.85 + Math.sin(a) * 2.7;
			const m = add(new three.BoxGeometry(.83, .65, 1.2), stone, x, y, -21);
			m.rotation.z = a - Math.PI / 2;
		}
		for (let i = 0; i < 20; i++) {
			const a = i / 20 * Math.PI * 2, x = Math.cos(a) * 5, z = -4 + Math.sin(a) * 5;
			const m = add(new three.BoxGeometry(1.1, .13, .65), i % 3 ? stone : dark, x, .04, z, -a);
			m.rotation.y = -a;
		}
		for (let i = 0; i < 7; i++) {
			const x = 5.5 + rnd() * 5, z = -21 + rnd() * 2;
			add(new three.BoxGeometry(.8 + rnd() * .5, .45 + rnd() * .4, 1), stone, x, .1, z, rnd() * 4);
		}
		const shrines = [];
		for (const s of [{
			x: -13,
			z: 8
		}, {
			x: 14,
			z: -8
		}]) {
			const g = new three.Group();
			g.position.set(s.x, heightAt(s.x, s.z), s.z);
			props.add(g);
			const base = new three.Mesh(new three.CylinderGeometry(1, 1.25, .35, 8), stone);
			base.position.y = .18;
			g.add(base);
			const bowl = new three.Mesh(new three.TorusGeometry(.53, .14, 8, 24), stone);
			bowl.rotation.x = Math.PI / 2;
			bowl.position.y = 1.1;
			g.add(bowl);
			const shaft = new three.Mesh(new three.CylinderGeometry(.23, .34, .8, 7), stone);
			shaft.position.y = .65;
			g.add(shaft);
			const orb = new three.Mesh(new three.IcosahedronGeometry(.23, 1), new three.MeshBasicMaterial({ color: 16111255 }));
			orb.position.y = 1.42;
			g.add(orb);
			const ring = new three.Mesh(new three.RingGeometry(1.5, 1.55, 64), new three.MeshBasicMaterial({
				color: 14662779,
				transparent: true,
				opacity: .7,
				depthWrite: false
			}));
			ring.rotation.x = -Math.PI / 2;
			ring.position.y = .05;
			g.add(ring);
			shrines.push({
				group: g,
				orb,
				ring
			});
		}
		props.updateMatrixWorld(true);
		for (const o of props.children) {
			const copy = o.clone(true);
			copy.traverse((m) => {
				if (m.isMesh) m.material = new three.MeshBasicMaterial({ side: three.DoubleSide });
			});
			forest.shade.add(copy);
		}
		const stoneParts = [];
		props.traverse((m) => {
			if (m.isMesh && (m.material === stone || m.material === dark)) stoneParts.push({
				mesh: m,
				count: 90,
				style: (p, n) => ({
					pal: n.y > .3 ? 0 : 1,
					size: [.085, .21],
					dir: Math.abs(n.y) > .8 ? new three.Vector3(1, 0, .4) : new three.Vector3(.2, 1, 0)
				})
			});
		});
		const stonePaint = pinDabs(shared, [[
			[
				.71,
				.68,
				.5
			],
			[
				.48,
				.49,
				.38
			],
			[
				.24,
				.31,
				.32
			]
		], [
			[
				.63,
				.62,
				.46
			],
			[
				.38,
				.43,
				.36
			],
			[
				.21,
				.27,
				.3
			]
		]], stoneParts);
		stonePaint.update();
		scene.add(stonePaint.mesh);
		const shade = createShade(renderer, shared, forest.shade, {
			size: [1536, 1536],
			box: [70, 65],
			centre: [
				0,
				5,
				-7
			],
			back: 150,
			near: 1,
			far: 350
		});
		const frame = createFrame(renderer, shared, { samples: 4 });
		frame.uniforms.uShafts.value = .25;
		frame.uniforms.uSteps.value = 12;
		frame.uniforms.uCanvas.value = .75;
		const flowerCount = 1800, positions = new Float32Array(flowerCount * 3);
		for (let i = 0; i < flowerCount; i++) {
			const a = rnd() * 6.28, r = 17 + rnd() * 18;
			const x = Math.cos(a) * r, z = Math.sin(a) * r;
			positions.set([
				x,
				heightAt(x, z),
				z
			], i * 3);
		}
		const flowers = dabMesh(dabGeometry(flowerCount, { aPos: [positions, 3] }), dabMaterial(shared, {
			head: "in vec3 aPos;",
			body: `void makeDab(inout Dab d){vec4 r=hash4(float(gl_InstanceID));d.pos=aPos+vec3(0.,.18+r.x*.3,0.);d.dir=vec3(.2,1.,.1);d.size=vec2(.065,.13)*(1.+r.z);float lit=sunAt(d.pos);vec3 c=r.y>.55?vec3(.91,.82,.57):vec3(.61,.57,.73);d.c1=hazed(c*(.55+.45*lit),d.pos);d.c2=d.c1*1.14;d.seed=float(gl_InstanceID);d.lift=.05;}`,
			minPx: [2, 3],
			maxPx: [15, 30]
		}), 4);
		scene.add(flowers);
		return {
			scene,
			shared,
			frame,
			shade,
			floor,
			forest,
			shrines,
			update(dt, time, focus, wave) {
				shared.uTime.value = time;
				shared.uFocus.value.set(focus.x, heightAt(focus.x, focus.z), focus.z);
				shared.uLamp.value.set(focus.x, 1.4, focus.z, .62);
				floor.follow(focus.x, focus.z);
				const danger = Math.max(0, wave - 3) / 3;
				shared.uHazeDensity.value = .0038 + danger * .0012;
				for (let i = 0; i < shrines.length; i++) {
					shrines[i].orb.position.y = 1.42 + Math.sin(time * 1.8 + i) * .07;
					shrines[i].orb.rotation.y = time * .6;
				}
			},
			setQuality(low, edgeSamples = 0) {
				const samples = low ? edgeSamples : 4;
				if (frame.target.samples !== samples) { frame.target.samples = samples; frame.target.dispose(); }
				frame.uniforms.uShafts.value = low ? 0 : .25;
				frame.uniforms.uSteps.value = low ? 6 : 12;
				leaves.mesh.geometry.instanceCount = low ? 100 : 300;
			}
		};
	}
	// source: simulation.js
	var PARTY_RUN_SPEED = 5.1;
	// source: opening.js
	var GAME_CAMERA_OFFSET = new three.Vector3(10, 13.5, 19);
	var OPENING_DURATION = 3.8;
	var SPEED = PARTY_RUN_SPEED;
	var smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
	var mix = three.MathUtils.lerp;
	function trailPoint(angle) {
		const difference = (target) => Math.atan2(Math.sin(angle - target), Math.cos(angle - target));
		const bend = 4 * Math.exp(-(difference(-.58) ** 2) / .11) + 4.6 * Math.exp(-(difference(2.55) ** 2) / .11);
		return new three.Vector3((16 - bend) * Math.cos(angle), 0, (14 - bend) * Math.sin(angle));
	}
	var TRAIL_STEPS = 2048;
	var TRAIL_ARCS = [0];
	var trailPrevious = trailPoint(-.58);
	for (let i = 1; i <= TRAIL_STEPS; i++) {
		const p = trailPoint(-.58 - i / TRAIL_STEPS * Math.PI * 2);
		TRAIL_ARCS.push(TRAIL_ARCS[i - 1] + p.distanceTo(trailPrevious));
		trailPrevious = p;
	}
	function trailAngle(distance) {
		const d = distance % TRAIL_ARCS[TRAIL_STEPS];
		let lo = 0, hi = TRAIL_STEPS;
		while (hi - lo > 1) {
			const mid = lo + hi >> 1;
			if (TRAIL_ARCS[mid] < d) lo = mid;
			else hi = mid;
		}
		const f = (d - TRAIL_ARCS[lo]) / (TRAIL_ARCS[hi] - TRAIL_ARCS[lo]);
		return -.58 - (lo + f) / TRAIL_STEPS * Math.PI * 2;
	}
	function shotAt(time) {
		const t = time % 44;
		let orbit;
		if (t < 3) orbit = 0;
		else if (t < 11) orbit = 1.18 * smooth((t - 3) / 8);
		else if (t < 20) orbit = mix(1.18, 1.3, smooth((t - 11) / 9));
		else if (t < 25) orbit = 1.3;
		else if (t < 40) orbit = mix(1.3, 0, smooth((t - 25) / 15));
		else orbit = 0;
		return {
			orbit,
			name: t < 7 || t >= 37 ? "front" : t < 27 ? "side" : "return"
		};
	}
	var Opening = class {
		constructor() {
			this.reset();
		}
		reset() {
			this.mode = "menu";
			this.distance = 0;
			this.time = 0;
			this.elapsed = 0;
			this.pose = this.sample();
		}
		begin() {
			if (this.mode !== "menu") return false;
			this.mode = "departing";
			this.elapsed = 0;
			this.departDistance = this.distance;
			this.departTime = this.time;
			this.departCamera = new three.Spherical().setFromVector3(this.pose.position.clone().sub(this.pose.center));
			this.departTheta = this.departCamera.theta;
			this.departLook = this.pose.look.clone().sub(this.pose.center);
			this.departFov = this.pose.fov;
			this.departFormation = this.pose.formation.map((p) => [...p]);
			const endTheta = Math.atan2(GAME_CAMERA_OFFSET.x, GAME_CAMERA_OFFSET.z - 1.6);
			this.endTheta = this.departTheta + Math.atan2(Math.sin(endTheta - this.departTheta), Math.cos(endTheta - this.departTheta));
			return true;
		}
		update(dt) {
			if (this.mode === "menu") {
				this.time += dt;
				this.distance += SPEED * dt;
			} else if (this.mode === "departing") {
				this.elapsed = Math.min(OPENING_DURATION, this.elapsed + dt);
				this.time = this.departTime + this.elapsed;
				this.distance = this.departDistance + SPEED * this.elapsed;
			}
			this.pose = this.sample();
			return this.mode === "departing" && this.elapsed >= 3.8;
		}
		sample() {
			const blend = smooth(this.mode === "departing" ? this.elapsed / OPENING_DURATION : 0);
			const angle = trailAngle(this.distance);
			const { x, z } = trailPoint(angle);
			const forward = trailPoint(angle - .001).sub(trailPoint(angle + .001)).normalize();
			const right = new three.Vector3(forward.z, 0, -forward.x);
			const center = new three.Vector3(x, heightAt(x, z), z);
			const speed = SPEED;
			const shot = shotAt(this.time), side = Math.sin(shot.orbit), back = (1 - Math.cos(shot.orbit)) / 2;
			const stagger = side * side;
			const combatFormation = [
				[0, 1.3],
				[-1.5, -.8],
				[1.5, -.8]
			];
			const cinemaFormation = [
				[-1.7, 1.3 + .9 * stagger],
				[0, -.4],
				[1.7, -1.9]
			];
			const formation = (this.mode === "departing" ? this.departFormation : cinemaFormation).map((p, i) => p.map((v, j) => mix(v, combatFormation[i][j], blend)));
			const actors = formation.map(([side, along], i) => {
				const p = center.clone().addScaledVector(right, side).addScaledVector(forward, along);
				return {
					x: p.x,
					z: p.z,
					face: Math.atan2(forward.x, forward.z),
					moving: speed,
					stride: i * .19
				};
			});
			const distance = mix(7.1, 8.7, back) + 2.3 * side * side;
			const eye = center.clone().addScaledVector(forward, Math.cos(shot.orbit) * distance).addScaledVector(right, side * distance);
			eye.y = center.y + mix(2.65, 2.85, back) + Math.sin(this.time * .31) * .06;
			const look = center.clone().addScaledVector(forward, mix(.25, 1.7, back));
			look.y = center.y + mix(2.05, 1.95, back);
			const playFocus = new three.Vector3(x, .25, z - 1.6);
			const endEye = playFocus.clone().add(GAME_CAMERA_OFFSET);
			const startOffset = eye.clone().sub(center);
			const endOffset = endEye.clone().sub(center);
			const a = this.mode === "departing" ? this.departCamera : new three.Spherical().setFromVector3(startOffset);
			const b = new three.Spherical().setFromVector3(endOffset);
			const startTheta = a.theta;
			const endTheta = this.mode === "departing" ? this.endTheta : b.theta;
			const offset = new three.Vector3().setFromSpherical(new three.Spherical(mix(a.radius, b.radius, blend), mix(a.phi, b.phi, blend), mix(startTheta, endTheta, blend)));
			const position = center.clone().add(offset);
			if (this.mode === "departing") look.copy(center).add(this.departLook);
			look.lerp(playFocus, blend);
			return {
				actors,
				formation,
				center,
				position,
				look,
				playFocus,
				blend,
				speed,
				shot: shot.name,
				heading: Math.atan2(forward.x, forward.z),
				fov: mix(this.mode === "departing" ? this.departFov : mix(47, 52, back), 47, blend)
			};
		}
		apply(game) {
			const p = this.pose;
			Object.assign(game.centroid, {
				x: p.center.x,
				z: p.center.z,
				moving: p.speed
			});
			game.destination = game.phase === "playing" ? {
				x: p.center.x + Math.sin(p.heading) * 6,
				z: p.center.z + Math.cos(p.heading) * 6
			} : {
				x: p.center.x,
				z: p.center.z
			};
			game.heading = p.heading;
			game.heroes.forEach((hero, i) => {
				Object.assign(hero, p.actors[i]);
				hero.px = hero.x;
				hero.pz = hero.z;
			});
		}
	};
	exports.ActorView = ActorView;
	exports.GAME_CAMERA_OFFSET = GAME_CAMERA_OFFSET;
	exports.OBSTACLES = OBSTACLES;
	exports.Opening = Opening;
	exports.heightAt = heightAt;
	exports.makeWorld = makeWorld;
	return exports;
})({}, __THREE__);

return originalWorld;
}
