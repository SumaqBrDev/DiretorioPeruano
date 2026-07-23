# ConectaPeru — Kit basado en el símbolo maestro

Todos los recursos de este paquete derivan directamente de `conectaperu-symbol-original.png`. La silueta, las proporciones, los degradados, el redondeo y el escalón dorado permanecen sin reinterpretación ni redibujo.

## Archivos principales

- `conectaperu-symbol-original.png`: imagen original recibida, sin alteraciones.
- `conectaperu-symbol-master.png`: mismo símbolo, únicamente recortado y con margen transparente uniforme.
- `conectaperu-logo.png`: logo horizontal para fondos claros.
- `conectaperu-logo-dark-bg.png`: logo horizontal para fondos oscuros.
- `favicon.ico`: favicon multirresolución de 16 a 256 px.
- `favicon-16x16.png` y `favicon-32x32.png`: favicons PNG.
- `apple-touch-icon.png`: icono de 180 × 180 px.
- `conectaperu-icon-192x192.png` y `conectaperu-icon-512x512.png`: iconos PWA.
- `conectaperu-social-avatar.png`: avatar cuadrado sobre fondo Creme Andino.
- `site.webmanifest`: manifiesto PWA básico.

## Integración recomendada

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

No se incluye una falsa versión vectorial: vectorizar automáticamente el original modificaría precisamente las curvas y el acabado que se decidió conservar.
