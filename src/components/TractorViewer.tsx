import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { ErrorBoundary } from 'react-error-boundary';
import { Loader2, MonitorPlay } from 'lucide-react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import TractorModel from './TractorModel';

// 相机初始配置（常量避免重渲染触发重置）
const CAMERA_CONFIG = { position: [6.5, 4, 6.5] as [number, number, number], fov: 40 };

// OrbitControls 内置自动旋转配置常量
const AUTO_ROTATE_SPEED = 0.8;

// Canvas 配置常量：避免每次渲染创建新对象字面量导致 R3F 重建 WebGL context（滚动闪屏主因之一）
const GL_CONFIG = { antialias: true, alpha: true } as const;
const DPR_CONFIG: [number, number] = [1, 2];
const LIGHT_COLORS = {
  dark: { background: '#1a2420', fog: '#1a2420', cell: '#2e3a34', section: '#4a5a50' },
  light: { background: '#F5F1E8', fog: '#F5F1E8', cell: '#D4CFC4', section: '#B8B1A3' },
} as const;

interface ModelFallbackProps {
  error: unknown;
  resetErrorBoundary?: () => void;
}

function ModelFallback({ error }: ModelFallbackProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-gradient-to-br from-muted/30 to-transparent text-muted-foreground">
      <MonitorPlay className="size-12 opacity-50" />
      <div className="text-sm">3D 模型加载失败</div>
      <div className="max-w-[80%] truncate text-xs opacity-60">{message.slice(0, 60)}</div>
    </div>
  );
}

// R3F Canvas 内部的 loading 占位：必须用 three.js 对象，不能用 HTML div
function CanvasLoadingPlaceholder() {
  return (
    <mesh>
      <sphereGeometry args={[0.001, 8, 8]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

// 程序化环境光照组件：使用 three.js 内置 RoomEnvironment
// 零网络请求，不依赖外部 HDR 贴图，避免跨域/CDN 不可达问题
function ProgrammaticEnvironment() {
  const { scene, gl } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new RoomEnvironment();
    const environment = pmremGenerator.fromScene(envScene, 0.04).texture;
    scene.environment = environment;

    return () => {
      scene.environment = null;
      environment.dispose();
      pmremGenerator.dispose();
    };
  }, [scene, gl]);

  return null;
}

/**
 * 3D 拖拉机查看器
 * - 使用 GLB 模型（David Brown 25D 拖拉机）
 * - 模型通过 import 引入，由 Vite 打包
 * - 环境光照使用 three.js 内置 RoomEnvironment 程序化生成，零网络依赖
 * - 自动旋转：初始自动旋转，用户交互后停止，松手 3 秒后恢复自转
 * - 支持鼠标/触屏拖拽旋转、滚轮缩放
 * - WebGL 不可用时降级为占位提示
 */
export default function TractorViewer() {
  const [webglSupported, setWebglSupported] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const autoRotateTimerRef = useRef<number | null>(null);
  // OrbitControls 尚未挂载时暂存待 fit 的模型，挂载后补做一次相机 fit
  const pendingFitRef = useRef<THREE.Object3D | null>(null);

  // 跟随暗色模式：监听 html 上的 theme-dark/theme-light class
  const [isDark, setIsDark] = useState(
    () =>
      document.documentElement.classList.contains('theme-dark') ||
      (!document.documentElement.classList.contains('theme-light') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches),
  );
  useEffect(() => {
    const update = () => {
      const next =
        document.documentElement.classList.contains('theme-dark') ||
        (!document.documentElement.classList.contains('theme-light') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      // 先比较再 setState，避免 MutationObserver 触发无意义重渲染
      setIsDark((prev) => (prev === next ? prev : next));
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', update);
    return () => observer.disconnect();
  }, []);

  // 通过 ref 直接启停 OrbitControls 内置自动旋转
  // 不用 React state 驱动 prop，避免 prop 变化触发组件重渲染导致相机重置
  const setAutoRotateByRef = useCallback((enabled: boolean) => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = enabled;
    }
  }, []);

  // 用户停止交互后延迟 3 秒恢复自动旋转
  const handleInteractionEnd = useCallback(() => {
    if (autoRotateTimerRef.current) {
      window.clearTimeout(autoRotateTimerRef.current);
    }
    autoRotateTimerRef.current = window.setTimeout(() => {
      setAutoRotateByRef(true);
    }, 3000);
  }, [setAutoRotateByRef]);

  // 用户开始交互时停止自动旋转
  const handleInteractionStart = useCallback(() => {
    if (autoRotateTimerRef.current) {
      window.clearTimeout(autoRotateTimerRef.current);
      autoRotateTimerRef.current = null;
    }
    setAutoRotateByRef(false);
  }, [setAutoRotateByRef]);

  // 模型加载后自动 fit：按实际包围盒对准中心 + 按模型大小定相机距离（只计算一次）
  const fitCameraToModel = useCallback((object: THREE.Object3D) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    // 目标点：模型几何中心略偏上（视觉重心）
    const target = new THREE.Vector3(center.x, center.y + size.y * 0.05, center.z);
    controls.target.copy(target);

    // 按 fov 计算刚好装下模型的距离，并留 40% 留白
    const fitDistance = maxDim / 2 / Math.tan((CAMERA_CONFIG.fov * Math.PI) / 360);
    const distance = fitDistance * 1.5;

    // 45° 俯视角
    const dir = new THREE.Vector3(1, 0.6, 1).normalize();
    const cameraPos = target.clone().add(dir.multiplyScalar(distance));
    controls.object.position.copy(cameraPos);

    // 根据模型大小动态设置缩放范围
    controls.minDistance = maxDim * 0.6;
    controls.maxDistance = maxDim * 4;

    controls.update();
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoRotateTimerRef.current) {
        window.clearTimeout(autoRotateTimerRef.current);
      }
    };
  }, []);

  // OrbitControls 挂载完成后开启初始自动旋转；若模型已加载但此前 fit 未执行，补做一次
  const handleControlsRef = useCallback(
    (node: OrbitControlsImpl | null) => {
      controlsRef.current = node;
      if (node) {
        node.autoRotate = true;
        node.autoRotateSpeed = AUTO_ROTATE_SPEED;
        if (pendingFitRef.current) {
          fitCameraToModel(pendingFitRef.current);
          pendingFitRef.current = null;
        }
      }
    },
    [fitCameraToModel],
  );

  const handleModelLoaded = useCallback(
    (object: THREE.Object3D) => {
      setModelLoaded(true);

      // 模型加载后自动 fit：OrbitControls 已就绪则立即执行，否则暂存待挂载后补做
      if (controlsRef.current) {
        fitCameraToModel(object);
      } else {
        pendingFitRef.current = object;
      }
    },
    [fitCameraToModel],
  );

  useEffect(() => {
    // 检测 WebGL 支持
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-gradient-to-br from-muted/30 to-transparent text-muted-foreground">
        <MonitorPlay className="size-16 opacity-40" />
        <div className="text-sm font-medium">3D 模型预览</div>
        <div className="text-xs opacity-60">当前浏览器环境不支持 WebGL</div>
        <div className="text-xs opacity-60">支持的设备上可查看可交互 3D 拖拉机模型</div>
      </div>
    );
  }

  if (modelError) {
    return <ModelFallback error={modelError} />;
  }

  const palette = isDark ? LIGHT_COLORS.dark : LIGHT_COLORS.light;

  return (
    <div className="relative h-full w-full">
      <ErrorBoundary
        FallbackComponent={ModelFallback}
        onError={(e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          setModelError(msg);
        }}
      >
        <Canvas
          shadows
          camera={CAMERA_CONFIG}
          gl={GL_CONFIG}
          dpr={DPR_CONFIG}
        >
          <fog attach="fog" args={[palette.fog, 8, 20]} />

          {/* 程序化环境光照（零网络依赖，替代 drei Environment preset 的 HDR 贴图） */}
          <ProgrammaticEnvironment />

          {/* 光照 */}
          <ambientLight intensity={0.5} />
          <hemisphereLight args={['#FFF8E7', '#C8B89A', 0.6]} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-3, 4, -3]} intensity={0.3} color="#E8D5B7" />

          {/* 地面网格 */}
          <Grid
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.5}
            cellColor={palette.cell}
            sectionSize={5}
            sectionThickness={1}
            sectionColor={palette.section}
            fadeDistance={15}
            fadeStrength={1}
            position={[0, -0.4, 0]}
          />

          {/* 地面接影 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.401, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <shadowMaterial transparent opacity={0.25} />
          </mesh>

          {/* Suspense fallback 必须是 three.js 对象，不能放 HTML 元素 */}
          <Suspense fallback={<CanvasLoadingPlaceholder />}>
            <TractorModel onLoaded={handleModelLoaded} />
          </Suspense>

          <OrbitControls
            ref={handleControlsRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={18}
            maxPolarAngle={Math.PI / 2.2}
            minPolarAngle={0.2}
            autoRotateSpeed={AUTO_ROTATE_SPEED}
            onStart={handleInteractionStart}
            onEnd={handleInteractionEnd}
          />
        </Canvas>
      </ErrorBoundary>

      {/* HTML loading 提示放在 Canvas 外部（DOM 层），避免 R3F 校验 HTML 元素 */}
      {!modelLoaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-card/80 px-4 py-2 text-xs text-muted-foreground backdrop-blur-sm shadow-sm">
            <Loader2 className="size-4 animate-spin" />
            模型加载中...
          </div>
        </div>
      )}

      {/* 操作提示 */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/70">
        拖动旋转 · 滚轮缩放
      </div>
    </div>
  );
}
