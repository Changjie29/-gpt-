# 三维模型加载优化

运行时使用 `public/models/tractor-fast-v1.glb`，保留 `tractor.glb` 原始文件与原始预览。模型作者与 CC BY 4.0 许可见 README。

优化文件从 7,371,372 字节缩减至 1,678,472 字节，减少约 77.2%；采用 Meshopt 几何压缩和 1024 像素 WebP 贴图，保留全部 120,357 个三角形，未启用几何简化。贴图分辨率和网格量化会降低极近距离查看的精度，此模型用于结构浏览，不用于尺寸测量。

使用 glTF Transform CLI 4.3.0 可重新生成：

```sh
npx --yes @gltf-transform/cli@4.3.0 optimize public/models/tractor.glb public/models/tractor-fast-v1.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --flatten false --join false --palette false --instance false
```

`tractor-preview-v1.webp` 从原 PNG 缩至最大 1200 像素宽度，WebP 质量 82。模型压缩解码器由 Three.js 本地打包，不依赖外部解码器 CDN。

下载结果保存在当前页面的内存中；每个模型实例仍单独解析并管理 GPU 资源，避免一个实例卸载影响另一个实例。切换主题仅更新网格颜色，保留模型与镜头位置。仅操作、阻尼或自动旋转期间持续绘制；模型离开屏幕、页面进入后台或发生上下文丢失时停止绘制。移动端像素比上限 1.25，桌面端上限 1.5。

自定义域名不改变实际托管平台。Cloudflare 平台拦截发生在应用之前，本站代码无法解除。要面向国内直连用户部署，需要独立的可用托管目标，并在迁移验证完成后再更改 DNS。
