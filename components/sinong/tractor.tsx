'use client';
import {useEffect,useRef,useState} from 'react';
import {RotateCcw,Play,Pause,Expand,Minus,Plus,Box,LoaderCircle,Info} from 'lucide-react';
import {useSite} from './shell';
type Controls={reset:()=>void;zoom:(n:number)=>void;rotate:(v:boolean)=>void;view:(v:string)=>void};
export function Tractor({large=false}:{large?:boolean}){
 const {t,dark}=useSite();const mount=useRef<HTMLDivElement>(null);const api=useRef<Controls|null>(null);const card=useRef<HTMLDivElement>(null);
 const [state,setState]=useState('loading');const [auto,setAuto]=useState(false);const [retry,setRetry]=useState(0);const [angle,setAngle]=useState('perspective');
 useEffect(()=>{
  let disposed=false;let cleanup=()=>{};setState('loading');
  (async()=>{
   const [T,{GLTFLoader},{OrbitControls},{RoomEnvironment}]=await Promise.all([import('three'),import('three/examples/jsm/loaders/GLTFLoader.js'),import('three/examples/jsm/controls/OrbitControls.js'),import('three/examples/jsm/environments/RoomEnvironment.js')]);
   if(disposed||!mount.current)return;
   const host=mount.current;let renderer:InstanceType<typeof T.WebGLRenderer>;
   try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setState('unsupported');return;}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
   host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','可拖拽旋转和缩放的 David Brown 25D 拖拉机三维模型');renderer.domElement.setAttribute('role','img');
   const scene=new T.Scene();const camera=new T.PerspectiveCamera(35,1,0.01,150);const control=new OrbitControls(camera,renderer.domElement);control.enableDamping=true;control.dampingFactor=0.07;control.minDistance=2.4;control.maxDistance=12;control.maxPolarAngle=Math.PI/2.03;control.enablePan=true;control.autoRotateSpeed=0.65;
   const pmrem=new T.PMREMGenerator(renderer);const room=new RoomEnvironment();const envMap=pmrem.fromScene(room,0.04);scene.environment=envMap.texture;room.dispose();pmrem.dispose();
   scene.add(new T.HemisphereLight(0xffffff,0x78957b,2.3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(4,8,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-5;light.shadow.camera.right=5;light.shadow.camera.top=5;light.shadow.camera.bottom=-5;light.shadow.normalBias=0.04;scene.add(light);
   const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({color:0x233b28,opacity:0.16}));floor.rotation.x=-Math.PI/2;floor.position.y=-0.01;floor.receiveShadow=true;scene.add(floor);
   const grid=new T.GridHelper(18,36,dark?0x33483d:0xd3ddd4,dark?0x263c30:0xe2e9df);grid.position.y=-0.013;scene.add(grid);
   const reset=()=>{camera.position.set(5.4,3.2,5.4);control.target.set(0,0.85,0);control.update();};reset();
   const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}};const observer=new ResizeObserver(resize);observer.observe(host);resize();
   let model:InstanceType<typeof T.Group>|undefined;
   const disposeObject=(object:InstanceType<typeof T.Object3D>)=>object.traverse(o=>{const m=o as InstanceType<typeof T.Mesh>;if(m.isMesh){m.geometry?.dispose();(Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>{for(const value of Object.values(mat))if(value instanceof T.Texture)value.dispose();mat.dispose();});}});
   api.current={reset,zoom:n=>{camera.position.sub(control.target).multiplyScalar(n).add(control.target);control.update();},rotate:v=>{control.autoRotate=v;},view:v=>{const p=v==='side'?[6,1.9,0]:v==='front'?[0,1.9,6]:[5.4,3.2,5.4];camera.position.set(p[0],p[1],p[2]);control.target.set(0,0.85,0);control.update();}};
   const stopRotate=()=>{control.autoRotate=false;setAuto(false);};control.addEventListener('start',stopRotate);
   new GLTFLoader().load('/models/tractor.glb',g=>{
    if(disposed){disposeObject(g.scene);return;}
    model=g.scene;const box=new T.Box3().setFromObject(model);const size=box.getSize(new T.Vector3());const scale=3.4/Math.max(size.x,size.y,size.z);model.scale.multiplyScalar(scale);
    const sized=new T.Box3().setFromObject(model);const center=sized.getCenter(new T.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y-=sized.min.y;
    model.traverse(o=>{const mesh=o as InstanceType<typeof T.Mesh>;if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});scene.add(model);setState('ready');
   },undefined,()=>{if(!disposed)setState('error');});
   renderer.setAnimationLoop(()=>{control.update();renderer.render(scene,camera);});
   const lost=(e:Event)=>{e.preventDefault();setState('error');};renderer.domElement.addEventListener('webglcontextlost',lost);
   cleanup=()=>{api.current=null;observer.disconnect();renderer.setAnimationLoop(null);control.dispose();envMap.dispose();if(model)disposeObject(model);floor.geometry.dispose();(floor.material as InstanceType<typeof T.Material>).dispose();grid.geometry.dispose();(grid.material as InstanceType<typeof T.Material>).dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.dispose();renderer.domElement.remove();};
  })().catch(()=>{if(!disposed)setState('error');});
  return()=>{disposed=true;cleanup();};
 },[retry,dark]);
 return <div ref={card} className={`tractor-stage ${large?'stage-large':''} ${(state==='error'||state==='unsupported')?'preview-static':''}`}>
  {state!=='ready'&&<img className="model-poster" src="/models/tractor-preview.png" alt="David Brown 25D 拖拉机原模型预览"/>}<div ref={mount} className="tractor-canvas"/>
  <div className="stage-heading"><span className="eyebrow">MACHINE EXPLORER</span><span className="stage-tag">{state==='ready'?t('三维模型','3D MODEL'):t('模型预览','MODEL PREVIEW')}</span></div>
  <div className="stage-machine"><span className="machine-index">01 / 01</span><h2>David Brown <span>25D</span></h2><p>{t('经典轮式拖拉机','Classic wheeled tractor')}</p></div>
  {state==='loading'&&<div className="model-loading"><LoaderCircle className="spinning" size={15}/>{t('正在开启三维交互…','Loading interactive model…')}</div>}
  {(state==='error'||state==='unsupported')&&<div className="model-notice"><Info size={14}/><span>{t('三维交互不可用，已显示原模型预览','3D unavailable. Showing a preview of the original model.')}</span><button onClick={()=>setRetry(x=>x+1)}>{t('重试','Retry')}</button></div>}
  <div className="stage-caption"><span className="tiny-cross">+</span>{state==='ready'?t('拖拽旋转 · 滚轮缩放','Drag to orbit · Scroll to zoom'):t('真实模型 · 结构预览','Original model · Structure preview')}</div>
  <div className="stage-tools"><button disabled={state!=='ready'} title={t('放大','Zoom in')} aria-label={t('放大','Zoom in')} onClick={()=>api.current?.zoom(.83)}><Plus size={17}/></button><button disabled={state!=='ready'} title={t('缩小','Zoom out')} aria-label={t('缩小','Zoom out')} onClick={()=>api.current?.zoom(1.2)}><Minus size={17}/></button><span/><button disabled={state!=='ready'} title={t('恢复视角','Reset view')} aria-label={t('恢复视角','Reset view')} onClick={()=>{api.current?.reset();setAngle('perspective')}}><RotateCcw size={16}/></button><button disabled={state!=='ready'} className={auto?'is-active':''} title={t('自动旋转','Auto rotate')} aria-label={t('自动旋转','Auto rotate')} aria-pressed={auto} onClick={()=>{api.current?.rotate(!auto);setAuto(!auto)}}>{auto?<Pause size={16}/>:<Play size={16}/>}</button>{large&&<button aria-label={t('全屏','Fullscreen')} onClick={()=>{if(document.fullscreenElement)document.exitFullscreen?.();else card.current?.requestFullscreen?.().catch(()=>{});}}><Expand size={16}/></button>}</div>
  {large&&<div className="camera-presets">{[['perspective','透视','Perspective'],['side','侧视','Side'],['front','正视','Front']].map(([id,zh,en])=><button disabled={state!=='ready'} key={id} className={angle===id?'selected':''} onClick={()=>{api.current?.view(id);setAngle(id);setAuto(false);api.current?.rotate(false)}}>{t(zh,en)}</button>)}</div>}
 </div>
}
