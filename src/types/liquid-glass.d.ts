// @sohumsuthar/liquid-glass 类型声明（包为纯 JSX，无自带类型）
declare module '@sohumsuthar/liquid-glass' {
  import type { CSSProperties, ReactNode } from 'react';

  export interface LiquidGlassProps {
    /** 大表面使用更厚重的玻璃（更深阴影/更强边缘折射） */
    macro?: boolean;
    /** 'clear'（默认，高透）| 'regular'（雾面，适合文字密集区） */
    variant?: 'clear' | 'regular';
    /** 为 clear 玻璃叠加 Apple 规定的 35% 压暗层 */
    dimmed?: boolean;
    /** 按压弹簧反馈 + 自发光（Apple .interactive()） */
    interactive?: boolean;
    /** 逐元素光线追踪折射（恒定像素宽边带 + 色散） */
    lens?: boolean;
    lensOptions?: { bezel?: number; refraction?: number; dispersion?: number; radius?: number };
    /** 移动端（≤639px）剥离玻璃容器 */
    mobileFlat?: boolean;
    className?: string;
    style?: CSSProperties;
    contentClassName?: string;
    contentStyle?: CSSProperties;
    children?: ReactNode;
  }

  export function LiquidGlass(props: LiquidGlassProps): JSX.Element;

  export interface LiquidGlassFilterProps {
    /** 位移贴图 base64 data URL（必须） */
    displacementMap: string;
    /** objectBoundingBox 位移比例，默认 0.1（物理精确） */
    scale?: number;
    smScale?: number;
    /** 宏过滤器色散强度（默认 0=关） */
    dispersion?: number;
    /** 内层卡片过滤器色散强度（默认 0） */
    smDispersion?: number;
  }

  export function LiquidGlassFilter(props: LiquidGlassFilterProps): JSX.Element | null;

  export function useLiquidLens(ref: React.RefObject<HTMLElement | null>, options?: {
    bezel?: number; refraction?: number; dispersion?: number;
  }): { filter: string; svg: JSX.Element | null };
}
