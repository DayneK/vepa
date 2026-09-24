const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/browserAll-Ch918tB9.js","assets/Geometry-DA76qXi9.js","assets/rolldown-runtime-QTnfLwEv.js","assets/init-8V_lD14y.js","assets/canvasUtils-Du1s4gOC.js","assets/init-Cz2nqDkC.js","assets/CanvasPool-CzgUrivN.js","assets/webworkerAll-DtuNUOg3.js","assets/WebGPURenderer-BlajKO59.js","assets/RenderTargetSystem-CNLCc21U.js","assets/getTextureBatchBindGroup-BncH57ql.js","assets/BufferResource-CcZq-hS1.js","assets/WebGLRenderer-CyHLetyU.js","assets/CanvasRenderer-CxrNuX_0.js"])))=>i.map(i=>d[i]);
import{t as e}from"./index-2wEz8DhQ.js";import{A as t,F as n,J as r,Q as i,S as a,T as o,V as s,Y as c,_ as l,a as u,b as d,d as f,et as p,f as m,n as h,nt as g,o as _,r as v,rt as y,s as b,t as x,u as S,v as C,x as w,y as T}from"./Geometry-DA76qXi9.js";import"./init-8V_lD14y.js";import{t as ee}from"./canvasUtils-Du1s4gOC.js";import{D as E,a as D,i as te,l as ne,u as re,w as ie}from"./RenderTargetSystem-CNLCc21U.js";import{A as O,c as k,l as ae,n as oe,o as A,s as j}from"./camera-F998O7lR.js";var se={extension:{type:g.Environment,name:`browser`,priority:-1},test:()=>!0,load:async()=>{await e(()=>import(`./browserAll-Ch918tB9.js`),__vite__mapDeps([0,1,2,3,4,5,6]))}},ce={extension:{type:g.Environment,name:`webworker`,priority:0},test:()=>typeof self<`u`&&self.WorkerGlobalScope!==void 0,load:async()=>{await e(()=>import(`./webworkerAll-DtuNUOg3.js`),__vite__mapDeps([7,3,1,2,4,5,6]))}},M;function le(e){return M===void 0&&(M=(()=>{let t={stencil:!0,failIfMajorPerformanceCaveat:e??D.defaultOptions.failIfMajorPerformanceCaveat};try{if(!l.get().getWebGLRenderingContext())return!1;let e=l.get().createCanvas().getContext(`webgl`,t),n=!!e?.getContextAttributes()?.stencil;if(e){let t=e.getExtension(`WEBGL_lose_context`);t&&t.loseContext()}return e=null,n}catch{return!1}})()),M}var N;async function ue(e={}){return N===void 0&&(N=await(async()=>{let t=l.get().getNavigator().gpu;if(!t)return!1;try{return await(await t.requestAdapter(e)).requestDevice(),!0}catch{return!1}})()),N}var P=[`webgl`,`webgpu`,`canvas`];async function de(t){let n=[];t.preference?Array.isArray(t.preference)?n=t.preference.slice():(n.push(t.preference),P.forEach(e=>{e!==t.preference&&n.push(e)})):n=P.slice();let r,i={};for(let a=0;a<n.length;a++){let o=n[a];if(o===`webgpu`&&await ue()){let{WebGPURenderer:n}=await e(async()=>{let{WebGPURenderer:e}=await import(`./WebGPURenderer-BlajKO59.js`).then(e=>e.t);return{WebGPURenderer:e}},__vite__mapDeps([8,2,1,6,9,10,11]));r=n,i={...t,...t.webgpu};break}else if(o===`webgl`&&le(t.failIfMajorPerformanceCaveat??D.defaultOptions.failIfMajorPerformanceCaveat)){let{WebGLRenderer:n}=await e(async()=>{let{WebGLRenderer:e}=await import(`./WebGLRenderer-CyHLetyU.js`).then(e=>e.t);return{WebGLRenderer:e}},__vite__mapDeps([12,2,1,9,11]));r=n,i={...t,...t.webgl};break}else if(o===`canvas`){let{CanvasRenderer:n}=await e(async()=>{let{CanvasRenderer:e}=await import(`./CanvasRenderer-CxrNuX_0.js`).then(e=>e.t);return{CanvasRenderer:e}},__vite__mapDeps([13,2,1,4,9,10]));r=n,i={...t,...t.canvasOptions};break}}if(delete i.webgpu,delete i.webgl,delete i.canvasOptions,!r)throw Error(`No available renderer for the current environment`);let a=new r;return await a.init(i),a}var F=class{static init(e){Object.defineProperty(this,"resizeTo",{configurable:!0,set(e){globalThis.removeEventListener(`resize`,this.queueResize),this._resizeTo=e,e&&(globalThis.addEventListener(`resize`,this.queueResize),this.resize())},get(){return this._resizeTo}}),this.queueResize=()=>{this._resizeTo&&(this._cancelResize(),this._resizeId=requestAnimationFrame(()=>this.resize()))},this._cancelResize=()=>{this._resizeId&&=(cancelAnimationFrame(this._resizeId),null)},this.resize=()=>{if(!this._resizeTo)return;this._cancelResize();let e,t;if(this._resizeTo===globalThis.window)e=globalThis.innerWidth,t=globalThis.innerHeight;else{let{clientWidth:n,clientHeight:r}=this._resizeTo;e=n,t=r}this.renderer.resize(e,t),this.render()},this._resizeId=null,this._resizeTo=null,this.resizeTo=e.resizeTo||null}static destroy(){globalThis.removeEventListener(`resize`,this.queueResize),this._cancelResize(),this._cancelResize=null,this.queueResize=null,this.resizeTo=null,this.resize=null}};F.extension=g.Application;var I=class{static init(e){e=Object.assign({autoStart:!0,sharedTicker:!1},e),Object.defineProperty(this,"ticker",{configurable:!0,set(e){this._ticker&&this._ticker.remove(this.render,this),this._ticker=e,e&&e.add(this.render,this,d.LOW)},get(){return this._ticker}}),this.stop=()=>{this._ticker.stop()},this.start=()=>{this._ticker.start()},this._ticker=null,this.ticker=e.sharedTicker?T.shared:new T,e.autoStart&&this.start()}static destroy(){if(this._ticker){let e=this._ticker;this.ticker=null,e.destroy()}}};I.extension=g.Application,y.add(F),y.add(I);var L=class e{constructor(...e){this.stage=new w,e[0]!==void 0&&r(c,`Application constructor options are deprecated, please use Application.init() instead.`)}async init(t){t={...t},this.stage||=new w,this.renderer=await de(t),e._plugins.forEach(e=>{e.init.call(this,t)})}render(){this.renderer.render({container:this.stage})}get canvas(){return this.renderer.canvas}get view(){return r(c,`Application.view is deprecated, please use Application.canvas instead.`),this.renderer.canvas}get screen(){return this.renderer.screen}get domContainerRoot(){return this.renderer.renderPipes.dom?._domElement}destroy(t=!1,n=!1){let r=e._plugins.slice(0);r.reverse(),r.forEach(e=>{e.destroy.call(this)}),this.stage.destroy(n),this.stage=null,this.renderer.destroy(t),this.renderer=null}};L._plugins=[];var R=L;y.handleByList(g.Application,R._plugins),y.add(te);var fe=class{execute(e,t){let n=e.renderer,r=n.canvasContext.activeContext,i=t.particleChildren,a=t.texture;r.save(),n.canvasContext.setContextTransform(t.worldTransform,t.roundPixels),n.canvasContext.setBlendMode(t.groupBlendMode);let o=t.groupColorAlpha,s=n.filter?.alphaMultiplier??1,c=(o>>>24&255)/255*s;for(let e=0;e<i.length;e++){let t=i[e],n=t.texture||a;if(!n?.source?.resource)continue;let o=t.color,s=(o>>>24&255)/255*c;if(s<=0)continue;let l=o&16777215,u=((l&255)<<16)+(l&65280)+(l>>16&255),d=n.source.resource;u!==16777215&&(d=ee.getTintedCanvas({texture:n},u));let f=n.frame,p=n.source.resolution,m=f.x*p,h=f.y*p,g=f.width*p,_=f.height*p;r.globalAlpha=s;let v=-t.anchorX*f.width,y=-t.anchorY*f.height;t.rotation!==0||t.scaleX!==1||t.scaleY!==1?(r.save(),r.translate(t.x,t.y),r.rotate(t.rotation),r.scale(t.scaleX,t.scaleY),r.drawImage(d,m,h,g,_,v,y,f.width,f.height),r.restore()):r.drawImage(d,m,h,g,_,t.x+v,t.y+y,f.width,f.height)}r.restore()}};function z(e,t=null){let n=e*6;if(n>65535?t||=new Uint32Array(n):t||=new Uint16Array(n),t.length!==n)throw Error(`Out buffer length is incorrect, got ${t.length} and expected ${n}`);for(let e=0,r=0;e<n;e+=6,r+=4)t[e+0]=r+0,t[e+1]=r+1,t[e+2]=r+2,t[e+3]=r+0,t[e+4]=r+2,t[e+5]=r+3;return t}function pe(e){return{dynamicUpdate:B(e,!0),staticUpdate:B(e,!1)}}function B(e,t){let n=[];n.push(`

        var index = 0;

        for (let i = 0; i < ps.length; ++i)
        {
            const p = ps[i];

            `);let r=0;for(let i in e){let a=e[i];if(t!==a.dynamic)continue;n.push(`offset = index + ${r}`),n.push(a.code);let o=f(a.format);r+=o.stride/4}n.push(`
            index += stride * 4;
        }
    `),n.unshift(`
        var stride = ${r};
    `);let i=n.join(`
`);return Function(`ps`,`f32v`,`u32v`,i)}var me=class{constructor(e){this._size=0,this._generateParticleUpdateCache={};let t=this._size=e.size??1e3,n=e.properties,r=0,i=0;for(let e in n){let t=n[e],a=f(t.format);t.dynamic?i+=a.stride:r+=a.stride}this._dynamicStride=i/4,this._staticStride=r/4,this.staticAttributeBuffer=new E(t*4*r),this.dynamicAttributeBuffer=new E(t*4*i),this.indexBuffer=z(t);let a=new x,o=0,s=0;this._staticBuffer=new h({data:new Float32Array(1),label:`static-particle-buffer`,shrinkToFit:!1,usage:v.VERTEX|v.COPY_DST}),this._dynamicBuffer=new h({data:new Float32Array(1),label:`dynamic-particle-buffer`,shrinkToFit:!1,usage:v.VERTEX|v.COPY_DST});for(let e in n){let t=n[e],r=f(t.format);t.dynamic?(a.addAttribute(t.attributeName,{buffer:this._dynamicBuffer,stride:this._dynamicStride*4,offset:o*4,format:t.format}),o+=r.size):(a.addAttribute(t.attributeName,{buffer:this._staticBuffer,stride:this._staticStride*4,offset:s*4,format:t.format}),s+=r.size)}a.addIndex(this.indexBuffer);let c=this.getParticleUpdate(n);this._dynamicUpload=c.dynamicUpdate,this._staticUpload=c.staticUpdate,this.geometry=a}getParticleUpdate(e){let t=he(e);return this._generateParticleUpdateCache[t]||(this._generateParticleUpdateCache[t]=this.generateParticleUpdate(e)),this._generateParticleUpdateCache[t]}generateParticleUpdate(e){return pe(e)}update(e,t){e.length>this._size&&(t=!0,this._size=Math.max(e.length,this._size*1.5|0),this.staticAttributeBuffer=new E(this._size*this._staticStride*4*4),this.dynamicAttributeBuffer=new E(this._size*this._dynamicStride*4*4),this.indexBuffer=z(this._size),this.geometry.indexBuffer.setDataWithSize(this.indexBuffer,this.indexBuffer.byteLength,!0));let n=this.dynamicAttributeBuffer;if(this._dynamicUpload(e,n.float32View,n.uint32View),this._dynamicBuffer.setDataWithSize(this.dynamicAttributeBuffer.float32View,e.length*this._dynamicStride*4,!0),t){let t=this.staticAttributeBuffer;this._staticUpload(e,t.float32View,t.uint32View),this._staticBuffer.setDataWithSize(t.float32View,e.length*this._staticStride*4,!0)}}destroy(){this._staticBuffer.destroy(),this._dynamicBuffer.destroy(),this.geometry.destroy()}};function he(e){let t=[];for(let n in e){let r=e[n];t.push(n,r.code,r.dynamic?`d`:`s`)}return t.join(`_`)}var ge=`varying vec2 vUV;
varying vec4 vColor;

uniform sampler2D uTexture;

void main(void){
    vec4 color = texture2D(uTexture, vUV) * vColor;
    gl_FragColor = color;
}`,_e=`attribute vec2 aVertex;
attribute vec2 aUV;
attribute vec4 aColor;

attribute vec2 aPosition;
attribute float aRotation;

uniform mat3 uTranslationMatrix;
uniform float uRound;
uniform vec2 uResolution;
uniform vec4 uColor;

varying vec2 vUV;
varying vec4 vColor;

vec2 roundPixels(vec2 position, vec2 targetSize)
{       
    return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
}

void main(void){
    float cosRotation = cos(aRotation);
    float sinRotation = sin(aRotation);
    float x = aVertex.x * cosRotation - aVertex.y * sinRotation;
    float y = aVertex.x * sinRotation + aVertex.y * cosRotation;

    vec2 v = vec2(x, y);
    v = v + aPosition;

    gl_Position = vec4((uTranslationMatrix * vec3(v, 1.0)).xy, 0.0, 1.0);

    if(uRound == 1.0)
    {
        gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
    }

    vUV = aUV;
    vColor = vec4(aColor.rgb * aColor.a, aColor.a) * uColor;
}
`,V=`
struct ParticleUniforms {
  uTranslationMatrix:mat3x3<f32>,
  uColor:vec4<f32>,
  uRound:f32,
  uResolution:vec2<f32>,
};

fn roundPixels(position: vec2<f32>, targetSize: vec2<f32>) -> vec2<f32>
{
  return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
}

@group(0) @binding(0) var<uniform> uniforms: ParticleUniforms;

@group(1) @binding(0) var uTexture: texture_2d<f32>;
@group(1) @binding(1) var uSampler : sampler;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>,
    @location(1) color : vec4<f32>,
  };
@vertex
fn mainVertex(
  @location(0) aVertex: vec2<f32>,
  @location(1) aPosition: vec2<f32>,
  @location(2) aUV: vec2<f32>,
  @location(3) aColor: vec4<f32>,
  @location(4) aRotation: f32,
) -> VSOutput {
  
   let v = vec2(
       aVertex.x * cos(aRotation) - aVertex.y * sin(aRotation),
       aVertex.x * sin(aRotation) + aVertex.y * cos(aRotation)
   ) + aPosition;

   var position = vec4((uniforms.uTranslationMatrix * vec3(v, 1.0)).xy, 0.0, 1.0);

   if(uniforms.uRound == 1.0) {
       position = vec4(roundPixels(position.xy, uniforms.uResolution), position.zw);
   }

    let vColor = vec4(aColor.rgb * aColor.a, aColor.a) * uniforms.uColor;

  return VSOutput(
   position,
   aUV,
   vColor,
  );
}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @builtin(position) position: vec4<f32>,
) -> @location(0) vec4<f32> {

    var sample = textureSample(uTexture, uSampler, uv) * color;
   
    return sample;
}`,ve=class extends _{constructor(){let e=m.from({vertex:_e,fragment:ge}),n=S.from({fragment:{source:V,entryPoint:`mainFragment`},vertex:{source:V,entryPoint:`mainVertex`}});super({glProgram:e,gpuProgram:n,resources:{uTexture:o.WHITE.source,uSampler:new t({}),uniforms:{uTranslationMatrix:{value:new i,type:`mat3x3<f32>`},uColor:{value:new p(16777215),type:`vec4<f32>`},uRound:{value:1,type:`f32`},uResolution:{value:[0,0],type:`vec2<f32>`}}}})}},H=class{constructor(e,t){this.state=u.for2d(),this.localUniforms=new b({uTranslationMatrix:{value:new i,type:`mat3x3<f32>`},uColor:{value:new Float32Array(4),type:`vec4<f32>`},uRound:{value:1,type:`f32`},uResolution:{value:[0,0],type:`vec2<f32>`}}),this.renderer=e,this.adaptor=t,this.defaultShader=new ve,this.state=u.for2d(),this._managedContainers=new re({renderer:e,type:`renderable`,name:`particleContainer`})}validateRenderable(e){return!1}addRenderable(e,t){this.renderer.renderPipes.batch.break(t),t.add(e)}getBuffers(e){return e._gpuData[this.renderer.uid]||this._initBuffer(e)}_initBuffer(e){return e._gpuData[this.renderer.uid]=new me({size:e.particleChildren.length,properties:e._properties}),this._managedContainers.add(e),e._gpuData[this.renderer.uid]}updateRenderable(e){}execute(e){let t=e.particleChildren;if(t.length===0)return;let n=this.renderer,r=this.getBuffers(e);e.texture||=t[0].texture;let i=this.state;r.update(t,e._childrenDirty),e._childrenDirty=!1,i.blendMode=ie(e.groupBlendMode,e.texture._source);let a=this.localUniforms.uniforms,o=a.uTranslationMatrix;e.worldTransform.copyTo(o);let s=n.globalUniforms.globalUniformData;o.tx-=s.offset.x,o.ty-=s.offset.y,o.prepend(s.projectionMatrix),a.uResolution=s.resolution,a.uRound=n._roundPixels|e._roundPixels,ne(e.groupColorAlpha,a.uColor,0),this.adaptor.execute(this,e)}destroy(){this._managedContainers.destroy(),this.renderer=null,this.defaultShader&&=(this.defaultShader.destroy(),null)}};H.extension={type:[g.CanvasPipes],name:`particle`};var U=class extends H{constructor(e){super(e,new fe)}};U.extension={type:[g.CanvasPipes],name:`particle`};var ye=class{execute(e,t){let n=e.state,r=e.renderer,i=t.shader||e.defaultShader;i.resources.uTexture=t.texture._source,i.resources.uniforms=e.localUniforms;let a=r.gl,o=e.getBuffers(t);r.shader.bind(i),r.state.set(n),r.geometry.bind(o.geometry,i.glProgram);let s=o.geometry.indexBuffer.data.BYTES_PER_ELEMENT===2?a.UNSIGNED_SHORT:a.UNSIGNED_INT;a.drawElements(a.TRIANGLES,t.particleChildren.length*6,s,0)}},W=class extends H{constructor(e){super(e,new ye)}};W.extension={type:[g.WebGLPipes],name:`particle`};var be=class{execute(e,t){let n=e.renderer,r=t.shader||e.defaultShader;r.groups[0]=n.renderPipes.uniformBatch.getUniformBindGroup(e.localUniforms,!0),r.groups[1]=n.texture.getTextureBindGroup(t.texture);let i=e.state,a=e.getBuffers(t);n.encoder.draw({geometry:a.geometry,shader:t.shader||e.defaultShader,state:i,size:t.particleChildren.length*6})}},G=class extends H{constructor(e){super(e,new be)}};G.extension={type:[g.WebGPUPipes],name:`particle`};var K=class e{constructor(t){if(t instanceof o)this.texture=t,a(this,e.defaultOptions,{});else{let n={...e.defaultOptions,...t};a(this,n,{})}}get alpha(){return this._alpha}set alpha(e){this._alpha=Math.min(Math.max(e,0),1),this._updateColor()}get tint(){return n(this._tint)}set tint(e){this._tint=p.shared.setValue(e??16777215).toBgrNumber(),this._updateColor()}_updateColor(){this.color=this._tint+((this._alpha*255|0)<<24)}};K.defaultOptions={anchorX:0,anchorY:0,x:0,y:0,scaleX:1,scaleY:1,rotation:0,tint:16777215,alpha:1};var q=K,J={vertex:{attributeName:`aVertex`,format:`float32x2`,code:`
            const texture = p.texture;
            const sx = p.scaleX;
            const sy = p.scaleY;
            const ax = p.anchorX;
            const ay = p.anchorY;
            const trim = texture.trim;
            const orig = texture.orig;

            if (trim)
            {
                w1 = trim.x - (ax * orig.width);
                w0 = w1 + trim.width;

                h1 = trim.y - (ay * orig.height);
                h0 = h1 + trim.height;
            }
            else
            {
                w1 = -ax * (orig.width);
                w0 = w1 + orig.width;

                h1 = -ay * (orig.height);
                h0 = h1 + orig.height;
            }

            f32v[offset] = w1 * sx;
            f32v[offset + 1] = h1 * sy;

            f32v[offset + stride] = w0 * sx;
            f32v[offset + stride + 1] = h1 * sy;

            f32v[offset + (stride * 2)] = w0 * sx;
            f32v[offset + (stride * 2) + 1] = h0 * sy;

            f32v[offset + (stride * 3)] = w1 * sx;
            f32v[offset + (stride * 3) + 1] = h0 * sy;
        `,dynamic:!1},position:{attributeName:`aPosition`,format:`float32x2`,code:`
            var x = p.x;
            var y = p.y;

            f32v[offset] = x;
            f32v[offset + 1] = y;

            f32v[offset + stride] = x;
            f32v[offset + stride + 1] = y;

            f32v[offset + (stride * 2)] = x;
            f32v[offset + (stride * 2) + 1] = y;

            f32v[offset + (stride * 3)] = x;
            f32v[offset + (stride * 3) + 1] = y;
        `,dynamic:!0},rotation:{attributeName:`aRotation`,format:`float32`,code:`
            var rotation = p.rotation;

            f32v[offset] = rotation;
            f32v[offset + stride] = rotation;
            f32v[offset + (stride * 2)] = rotation;
            f32v[offset + (stride * 3)] = rotation;
        `,dynamic:!1},uvs:{attributeName:`aUV`,format:`float32x2`,code:`
            var uvs = p.texture.uvs;

            f32v[offset] = uvs.x0;
            f32v[offset + 1] = uvs.y0;

            f32v[offset + stride] = uvs.x1;
            f32v[offset + stride + 1] = uvs.y1;

            f32v[offset + (stride * 2)] = uvs.x2;
            f32v[offset + (stride * 2) + 1] = uvs.y2;

            f32v[offset + (stride * 3)] = uvs.x3;
            f32v[offset + (stride * 3) + 1] = uvs.y3;
        `,dynamic:!1},color:{attributeName:`aColor`,format:`unorm8x4`,code:`
            const c = p.color;

            u32v[offset] = c;
            u32v[offset + stride] = c;
            u32v[offset + (stride * 2)] = c;
            u32v[offset + (stride * 3)] = c;
        `,dynamic:!1}};y.add(W),y.add(G),y.add(U);var xe=new s(0,0,0,0),Y=class e extends C{constructor(t={}){t={...e.defaultOptions,...t,dynamicProperties:{...e.defaultOptions.dynamicProperties,...t?.dynamicProperties}};let{dynamicProperties:n,shader:r,roundPixels:i,texture:a,particles:o,...s}=t;super({label:`ParticleContainer`,...s}),this.renderPipeId=`particle`,this.batched=!1,this._childrenDirty=!1,this.texture=a||null,this.shader=r,this._properties={};for(let e in J){let t=J[e],r=n[e];this._properties[e]={...t,dynamic:r}}this.allowChildren=!0,this.roundPixels=i??!1,this.particleChildren=o??[]}addParticle(...e){for(let t=0;t<e.length;t++)this.particleChildren.push(e[t]);return this.onViewUpdate(),e[0]}removeParticle(...e){let t=!1;for(let n=0;n<e.length;n++){let r=this.particleChildren.indexOf(e[n]);r>-1&&(this.particleChildren.splice(r,1),t=!0)}return t&&this.onViewUpdate(),e[0]}update(){this._childrenDirty=!0}onViewUpdate(){this._childrenDirty=!0,super.onViewUpdate()}get bounds(){return xe}updateBounds(){}destroy(e=!1){if(super.destroy(e),typeof e==`boolean`?e:e?.texture){let t=typeof e==`boolean`?e:e?.textureSource,n=this.texture??this.particleChildren[0]?.texture;n&&n.destroy(t)}this.texture=null,this.shader?.destroy()}removeParticles(e,t){e??=0,t??=this.particleChildren.length;let n=this.particleChildren.splice(e,t-e);return this.onViewUpdate(),n}removeParticleAt(e){let t=this.particleChildren.splice(e,1);return this.onViewUpdate(),t[0]}addParticleAt(e,t){return this.particleChildren.splice(t,0,e),this.onViewUpdate(),e}addChild(...e){throw Error(`ParticleContainer.addChild() is not available. Please use ParticleContainer.addParticle()`)}removeChild(...e){throw Error(`ParticleContainer.removeChild() is not available. Please use ParticleContainer.removeParticle()`)}removeChildren(e,t){throw Error(`ParticleContainer.removeChildren() is not available. Please use ParticleContainer.removeParticles()`)}removeChildAt(e){throw Error(`ParticleContainer.removeChildAt() is not available. Please use ParticleContainer.removeParticleAt()`)}getChildAt(e){throw Error(`ParticleContainer.getChildAt() is not available. Please use ParticleContainer.getParticleAt()`)}setChildIndex(e,t){throw Error(`ParticleContainer.setChildIndex() is not available. Please use ParticleContainer.setParticleIndex()`)}getChildIndex(e){throw Error(`ParticleContainer.getChildIndex() is not available. Please use ParticleContainer.getParticleIndex()`)}addChildAt(e,t){throw Error(`ParticleContainer.addChildAt() is not available. Please use ParticleContainer.addParticleAt()`)}swapChildren(e,t){throw Error(`ParticleContainer.swapChildren() is not available. Please use ParticleContainer.swapParticles()`)}reparentChild(...e){throw Error(`ParticleContainer.reparentChild() is not available with the particle container`)}reparentChildAt(e,t){throw Error(`ParticleContainer.reparentChildAt() is not available with the particle container`)}};Y.defaultOptions={dynamicProperties:{vertex:!1,position:!0,rotation:!1,uvs:!1,color:!1},roundPixels:!1};var Se=Y;y.add(se,ce);var Ce=6,we=1.5,X=48,Z=32;function Te(e){return Math.max(1,Math.min(2,parseFloat(e)||2))}function Ee(e){return e instanceof Float32Array?e:new Float32Array(e)}function De(){let e=document.createElement(`canvas`);e.width=Z,e.height=Z;let t=e.getContext(`2d`);if(!t)throw Error(`PixiJS renderer: failed to create particle texture`);return t.clearRect(0,0,Z,Z),t.fillStyle=`#ffffff`,t.beginPath(),t.arc(Z/2,Z/2,Z/2,0,Math.PI*2),t.fill(),o.from(e,!0)}function Oe(e,t,n){return(Math.max(0,Math.min(255,e))&255)<<16|(Math.max(0,Math.min(255,t))&255)<<8|Math.max(0,Math.min(255,n))&255}function Q(e,t,n,r){(!e.phenoColor||e.phenoColor.length<n*3)&&(e.phenoColor=new Float32Array(n*3)),(!e.phenoRadius||e.phenoRadius.length<n)&&(e.phenoRadius=new Float32Array(n)),(!e.phenoAlpha||e.phenoAlpha.length<n)&&(e.phenoAlpha=new Float32Array(n));for(let i=0;i<n;i++){let n=i*r;if(t[n+O.DEAD]>=.99)continue;let a=t[n+O.SPECIES_ID],o=j(t,a,i,r);e.phenoColor[i*3]=o.r,e.phenoColor[i*3+1]=o.g,e.phenoColor[i*3+2]=o.b,e.phenoRadius[i]=k(t,a,i,r),e.phenoAlpha[i]=A(t,a,i,r)}}function $(e){return new Se({texture:e,dynamicProperties:{vertex:!0,position:!0,color:!0,rotation:!1,uvs:!1},roundPixels:!1})}function ke(e,t){let n=Math.min(t,e.maxParticles);for(;e.pool.length<n;){let t=new q({texture:e.texture,anchorX:.5,anchorY:.5,alpha:0,tint:16777215,scaleX:0,scaleY:0});if(e.particles.addParticle(t),e.pool.push(t),e.halos){let t=new q({texture:e.texture,anchorX:.5,anchorY:.5,alpha:0,tint:16777215,scaleX:0,scaleY:0});e.halos.addParticle(t),e.haloPool.push(t)}}}async function Ae(e,t,n={}){if(!e)throw Error(`PixiJS renderer: canvas is required`);if(typeof document>`u`)throw Error(`PixiJS renderer requires a browser document`);let r=Te(n.maxDpr),i=e.getBoundingClientRect(),a=Math.max(1,i.width||e.clientWidth||1),o=Math.max(1,i.height||e.clientHeight||1),s=Math.min(typeof window<`u`&&window.devicePixelRatio||1,r),c=new R;await c.init({canvas:e,width:a,height:o,resolution:s,autoDensity:!0,antialias:!1,backgroundAlpha:0,clearBeforeRender:!0,autoStart:!1,preference:n.preference||`webgl`,powerPreference:`high-performance`});let l=De(),u=$(l),d=n.eco===!0?null:$(l);d&&c.stage.addChild(d),c.stage.addChild(u);let f={mode:`pixi`,backend:`pixi`,rendererType:c.renderer.type,canvas:e,ctx:null,app:c,stage:c.stage,particles:u,halos:d,texture:l,sprites:u,pool:[],haloPool:[],maxParticles:Math.max(0,Math.floor(t||0)),width:a,height:o,dpr:s,maxDpr:r,eco:n.eco===!0,phenoFrame:0,phenoView:null,phenoCount:0,phenoColor:null,phenoRadius:null,phenoAlpha:null,resize(){je(this)},destroy(){Me(this)}};return f.particles.boundsArea&&(f.particles.boundsArea=c.screen),f.halos&&f.halos.boundsArea&&(f.halos.boundsArea=c.screen),f}function je(e){if(!e||e.mode!==`pixi`||!e.app)return;let t=e.canvas.getBoundingClientRect(),n=Math.max(1,t.width||e.canvas.clientWidth||e.width||1),r=Math.max(1,t.height||e.canvas.clientHeight||e.height||1),i=Math.min(typeof window<`u`&&window.devicePixelRatio||1,e.maxDpr||2);e.width=n,e.height=r,e.dpr=i,e.app.renderer.resolution=i,e.app.renderer.resize(n,r),e.particles.boundsArea&&(e.particles.boundsArea=e.app.screen),e.halos&&e.halos.boundsArea&&(e.halos.boundsArea=e.app.screen)}function Me(e){!e||e.mode!==`pixi`||(e.app&&e.app.destroy(!1,{children:!0,texture:!0,textureSource:!0}),e.app=null,e.stage=null,e.particles=null,e.halos=null,e.pool.length=0,e.haloPool.length=0,e.ctx=null)}function Ne(e,t,n,r,i,a={}){if(!e||e.mode!==`pixi`||!e.app)return;let o=Ee(t),s=Math.max(0,Math.min(n||0,e.maxParticles)),c=a.eco===!0||e.eco===!0,l=Math.min(e.width,e.height)/i,u=o!==e.phenoView||s!==e.phenoCount,d=!c;ke(e,s),d&&u&&(e.phenoFrame=0),d&&(u||e.phenoFrame%Ce===0)&&(Q(e,o,s,r),e.phenoView=o,e.phenoCount=s),e.phenoFrame++;for(let t=0;t<e.pool.length;t++){let n=e.pool[t],a=e.haloPool[t];if(t>=s){n.alpha=0,a&&(a.alpha=0);continue}let u=t*r;if(o[u+O.DEAD]>=.99){n.alpha=0,a&&(a.alpha=0);continue}let f=o[u+O.POS_X],p=o[u+O.POS_Y],m=o[u+O.POS_Z]||0;if(f!==f||p!==p){n.alpha=0,a&&(a.alpha=0);continue}let{sx:h,sy:g,sr:_}=oe(f,p,m,i,e.width,e.height);if(h<-48||h>e.width+X||g<-48||g>e.height+X){n.alpha=0,a&&(a.alpha=0);continue}let v=o[u+O.SPECIES_ID],y=c?{r:o[u+O.COLOR_R],g:o[u+O.COLOR_G],b:o[u+O.COLOR_B]}:d?{r:e.phenoColor[t*3],g:e.phenoColor[t*3+1],b:e.phenoColor[t*3+2]}:j(o,v,t,r),b=d?e.phenoRadius[t]:k(o,v,t,r),x=d?e.phenoAlpha[t]:A(o,v,t,r);if(x<.001){n.alpha=0,a&&(a.alpha=0);continue}let S=Math.max(b*l*_,we)*2/Z,C=x*(.3+.7*_)*ae.globalAlpha,w=Oe(y.r,y.g,y.b);n.x=h,n.y=g,n.scaleX=S,n.scaleY=S,n.tint=w,n.alpha=C,a&&(a.x=h,a.y=g,a.scaleX=S*2.4,a.scaleY=S*2.4,a.tint=w,a.alpha=C*.3)}e.app.render()}export{Ae as createPixiRenderer,Ne as syncPixiRenderer};