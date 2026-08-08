# Plan y casos de pruebas funcionales — ConectaPeru

**Fuente:** `PRODUCT.md`  
**Tipo de prueba:** funcional manual end-to-end  
**Objetivo:** validar el MVP en un ambiente desplegado antes de liberar F8.2  
**Idioma de ejecución:** los textos esperados se indican en portugués cuando así aparecen en la interfaz actual  
**Fecha de elaboración:** 07/08/2026

---

## 0. Cuentas de prueba (ambiente QA)

**Password común:** `ConectaQA!2026` (todas las cuentas QA, creadas por email; verificación desactivada en Clerk test).  
**Superadmin:** cuenta personal `jarhkof.apps@gmail.com` ("José Roca Apps") — panel `/admin/super` (dashboard, aprobar/rechazar, beta mode, eliminar).

| Email (`jose.rocah.pe+conectaqua.<cuenta>@gmail.com`) | Rol | Empresa | Estado | Sub |
|---|---|---|---|---|
| `consumidor01` | consumer | — | — | — |
| `consumidor02` | consumer | — | — | — |
| `negocionuevo01` | business | Chicheria Qhapaq QA v2 | approved | active |
| `owneraprobado01` | business | Cantina Don José | approved | active (trial) |
| `ownerb01` | business | Serviços Técnicos Andino | approved | active |
| `ownerdisabled01` | business | Restaurante Wiracocha | disabled | past_due |
| `ownerpending01` | business | Mercado Andino Gourmet | approved | active |
| `ownerrejected01` | business | Hostal Miraflores | rejected | — |

**Notas:**
- El nombre de la cuenta refleja el estado original del seed; el estado real puede haber cambiado durante el QA (ej. Mercado Andino quedó `approved` tras aprobación manual en el panel).
- **Regla de modelo de pago:** las cuentas `consumer` NO pueden registrar negocios (403 en `POST /api/businesses`) — los ingresos provienen de las empresas que pagan por los recursos internos; un consumidor solo actúa como consumidor. El registro de negocio es exclusivo de cuentas `business`.

---

## 1. Instrucciones para el ejecutor

Ejecutar primero todos los casos P0, luego P1 y finalmente P2. No ejecutar casos de pagos, webhooks, eliminación o migración en producción sin autorización explícita. Para cada caso:

1. Abrir una ventana privada nueva o limpiar cookies, almacenamiento local y caché cuando la precondición lo solicite.
2. Registrar navegador, versión, sistema operativo, resolución y URL del ambiente.
3. Usar exactamente los datos indicados o reemplazarlos por los equivalentes preparados por el responsable del ambiente.
4. Marcar cada paso como aprobado o fallido; no marcar el caso completo si se omitió un paso.
5. Capturar evidencia de los pasos con resultado visual y de cualquier error. Para integraciones, adjuntar también el registro externo correspondiente.
6. Si falla una precondición, marcar el caso como **Bloqueado**, no como Fallido.
7. Después de un fallo, registrar URL, hora local, usuario, datos usados, resultado observado, resultado esperado, captura y errores de consola/red.

### Estados permitidos

- **Aprobado:** todos los resultados esperados se cumplieron.
- **Fallido:** al menos un resultado esperado no se cumplió.
- **Bloqueado:** no fue posible ejecutar por datos, permisos, ambiente o dependencia externa.
- **No ejecutado:** todavía no se inició.

### Prioridades

- **P0:** bloquea la liberación; seguridad, registro, búsqueda principal, moderación o cobro.
- **P1:** función central con alternativa temporal.
- **P2:** comportamiento secundario, presentación o compatibilidad.

---

## 2. Ambiente y accesos requeridos

Solicitar antes de empezar:

- URL del sitio desplegado y confirmación de que corresponde a la versión candidata.
- Navegadores: Chrome actual en escritorio y Chrome/Safari en un móvil real o emulado.
- Acceso de solo lectura a logs de Netlify y Neon, cuando esté autorizado.
- Panel de Clerk para comprobar roles y usuarios.
- Stripe en modo test, con acceso a Customers, Subscriptions, Events e Invoices.
- Resend en ambiente de prueba o buzones controlados para cuatro plantillas.
- Cuentas separadas: visitante, consumidor nuevo, consumidor con review previa, negocio nuevo, negocio aprobado, negocio deshabilitado y superadmin.
- Al menos tres negocios aprobados en dos ciudades y dos categorías; uno debe tener 10 fotos y otro reviews con diferentes ratings.

> Nunca usar tarjetas reales. Para pagos se deben usar exclusivamente tarjetas de prueba de Stripe.

---

## 3. Datos de prueba base

| Alias | Datos / condición |
|---|---|
| `CONSUMIDOR_NUEVO` | Role Clerk/BD `consumer`, sin reviews en `NEGOCIO_A` |
| `CONSUMIDOR_CON_REVIEW` | Role `consumer`, ya evaluó `NEGOCIO_A` |
| `NEGOCIO_NUEVO_USER` | Usuario autenticado sin BusinessProfile |
| `OWNER_APROBADO` | Role `business`, propietario de `NEGOCIO_A`, status `approved` |
| `OWNER_DISABLED` | Role `business`, propietario de negocio status `disabled`, subscription `past_due` |
| `SUPERADMIN` | Role y metadata `superadmin` sincronizados en Clerk y PostgreSQL |
| `NEGOCIO_A` | Aprobado, ciudad São Paulo, categoría restaurante, rating >= 4, con contacto y 3+ fotos |
| `NEGOCIO_B` | Aprobado, ciudad Rio de Janeiro, categoría servicios, acepta mensajes |
| `NEGOCIO_PENDING` | Status `pending`, CNPJ único y válido |
| `NEGOCIO_REJECTED` | Status `rejected`, con motivo conocido |
| CNPJ válido A | `11.222.333/0001-81` o un CNPJ válido y reservado para QA |
| CNPJ inválido | `11.111.111/1111-11` |
| Review válida | Rating 5; `Atendimento excelente e muito acolhedor.` |
| Review corta | `Muy bueno` (9 caracteres) |
| Imagen válida | JPG de 500 KB, PNG de 1 MB y WebP de 2 MB |
| Imagen grande | JPG mayor a 5 MB |
| Archivo inválido | PDF o TXT menor a 5 MB |

Los nombres y CNPJ de altas repetibles deben llevar un sufijo único, por ejemplo `QA-20260807-001`. Registrar los IDs creados para limpieza.

---

## 4. Casos funcionales

## A. Acceso, navegación e idioma

### CP-001 — Carga de la landing pública

**Prioridad:** P0  
**Trazabilidad:** Landing Page Pública  
**Precondiciones:** sesión cerrada; existen datos públicos aprobados.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir `/` en una ventana privada. | La página responde sin solicitar autenticación y no muestra una pantalla de error. |
| 2 | Esperar a que desaparezcan los skeletons. | Se muestran Hero, Como Funciona, Categorías, Destacados, Números, Depoimentos, CTA y Footer. |
| 3 | Revisar consola y pestaña Network. | No existen errores JS no controlados; los endpoints públicos principales responden 2xx. |
| 4 | Pulsar el logo o enlace de inicio desde otra ruta pública. | Se vuelve a `/` sin recarga rota. |
| 5 | Reducir el ancho a 375 px. | No hay scroll horizontal, contenido superpuesto ni controles inaccesibles. |

### CP-002 — Estados loading, error, vacío y reintento en Home

**Prioridad:** P1  
**Trazabilidad:** Funcionalidad 7  
**Precondiciones:** DevTools permite simular red lenta y bloquear solicitudes.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Activar red Slow 3G y recargar `/`. | Cada sección dinámica presenta skeleton o indicador de carga sin desplazar de forma abrupta toda la página. |
| 2 | Bloquear uno de `/api/categories`, `/api/featured`, `/api/stats`, `/api/testimonials` o `/api/community-reviews`; recargar. | La sección afectada muestra estado de error y opción de reintento; las demás siguen utilizables. |
| 3 | Desbloquear la solicitud y pulsar reintentar. | La sección carga datos sin recargar toda la página. |
| 4 | Repetir con una respuesta válida vacía en ambiente controlado. | Se muestra un estado vacío comprensible, no un error ni elementos rotos. |

### CP-003 — Cambio y persistencia PT-BR ↔ ES-PE

**Prioridad:** P1  
**Trazabilidad:** Funcionalidad 14  
**Precondiciones:** ejecutar una vez como visitante y otra como usuario autenticado.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | En `/`, seleccionar ES-PE. | Los textos traducibles de navegación, Hero y secciones cambian a español sin recargar. |
| 2 | Navegar a `/busca` y a un detalle. | El idioma continúa en ES-PE en todas las zonas traducibles. |
| 3 | Recargar el navegador. | Como visitante, ES-PE persiste mediante `localStorage`. |
| 4 | Cambiar a PT-BR, cerrar sesión/navegador, volver a entrar con usuario autenticado. | La preferencia guardada en el perfil se restaura según la implementación configurada. |
| 5 | Revisar etiquetas y botones. | No aparecen claves como `search.title`, traducciones vacías ni mezcla injustificada de idiomas. |

### CP-004 — Restricción de páginas por sesión y rol

**Prioridad:** P0  
**Trazabilidad:** Roles; Autenticación Backend  
**Precondiciones:** disponer de los roles de la matriz.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Sin sesión, abrir `/onboarding`, `/meu-negocio`, `/inbox` y `/admin/super`. | No se exponen datos protegidos; se muestra acceso denegado o redirección al login según la ruta. |
| 2 | Como `CONSUMIDOR_NUEVO`, abrir `/admin/super`. | Acceso rechazado; ninguna llamada administrativa devuelve datos. |
| 3 | Como `OWNER_APROBADO`, abrir `/admin/super`. | Acceso rechazado. |
| 4 | Como `SUPERADMIN`, abrir `/admin/super`. | Dashboard visible y endpoints administrativos responden correctamente. |
| 5 | Copiar un request administrativo y repetirlo sin token, con token inválido y con token business. | Backend responde 401/403; nunca 2xx ni datos parciales. |

## B. Home, búsqueda y detalle público

### CP-005 — Reviews de comunidad en Home

**Prioridad:** P1  
**Trazabilidad:** AC1  
**Precondiciones:** hay al menos 6 reviews aprobadas de 5 estrellas pertenecientes a negocios diferentes.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir `/` y localizar “O que a comunidade diz”. | Se muestran exactamente 6 reviews. |
| 2 | Anotar negocio, autor, rating y comentario de cada tarjeta. | Todas tienen 5 estrellas, datos completos y seis negocios distintos. |
| 3 | Recargar varias veces y registrar los conjuntos. | Cuando hay más de seis candidatos, el conjunto puede variar entre cargas; no se duplica un negocio dentro de una carga. |
| 4 | Abrir el negocio desde una tarjeta, si existe enlace. | El detalle corresponde al negocio mencionado. |

### CP-006 — Búsqueda textual y debounce

**Prioridad:** P0  
**Trazabilidad:** AC2; reglas de búsqueda  
**Precondiciones:** `NEGOCIO_A` posee términos únicos en nombre, dirección y tags.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir `/busca`; limpiar filtros. | Se listan únicamente negocios aprobados. |
| 2 | Escribir lentamente parte única del nombre sin enviar. | La consulta no se dispara por cada tecla; se ejecuta aproximadamente 300 ms después de dejar de escribir. |
| 3 | Pulsar Buscar. | La URL contiene `q=<texto>` codificado y el resultado incluye `NEGOCIO_A`. |
| 4 | Buscar un término único de la dirección. | Se incluye `NEGOCIO_A`. |
| 5 | Buscar una tag única con mayúsculas/minúsculas diferentes. | El resultado esperado aparece según búsqueda textual sin sensibilidad indebida a mayúsculas. |
| 6 | Buscar una cadena inexistente. | Se presenta estado sin resultados y no quedan tarjetas anteriores. |

### CP-007 — Filtros combinados y URL

**Prioridad:** P0  
**Trazabilidad:** AC2  
**Precondiciones:** datos de dos ciudades, categorías y ratings.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Seleccionar categoría de `NEGOCIO_A`. | URL y resultados se actualizan; todas las tarjetas pertenecen a esa categoría. |
| 2 | Seleccionar la ciudad de `NEGOCIO_A`. | URL conserva categoría y añade `city`; todos los resultados cumplen ambos filtros. |
| 3 | Seleccionar rating mínimo 4. | URL conserva los filtros y representa el rating; ningún resultado tiene rating inferior a 4. |
| 4 | Añadir texto que coincide con `NEGOCIO_A`. | Solo aparecen registros que cumplen simultáneamente los cuatro criterios. |
| 5 | Copiar la URL, abrirla en otra ventana. | Se restauran los cuatro controles y los mismos resultados. |
| 6 | Usar Atrás y Adelante del navegador tras cambiar filtros. | Controles, URL y resultados quedan sincronizados en cada estado. |
| 7 | Limpiar filtros. | Se eliminan los parámetros y vuelve el listado general. |

> **Observación a comprobar:** `PRODUCT.md` define `minRating`, mientras la UI inspeccionada usa el parámetro `rating`. Si la URL no cumple el contrato, registrar defecto de contrato AC2 aunque el filtrado visual funcione.

### CP-008 — Solo negocios aprobados son públicos

**Prioridad:** P0  
**Trazabilidad:** Status; AC14  
**Precondiciones:** conocer IDs de negocios approved, pending, rejected, disabled y soft-deleted.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Buscar cada negocio por nombre único. | Solo el approved aparece. |
| 2 | Abrir `/negocio/<id>` para pending, rejected, disabled y eliminado. | No se exponen datos; se devuelve/no se encuentra el negocio de forma controlada. |
| 3 | Consultar `/api/business-detail?id=<id>` para cada estado no público. | Respuesta 404/403 controlada, nunca el perfil completo. |
| 4 | Consultar la lista pública con filtros que coincidan con esos negocios. | Ningún estado no aprobado aparece. |

### CP-009 — Detalle completo y enlaces de contacto

**Prioridad:** P1  
**Trazabilidad:** Funcionalidad 3  
**Precondiciones:** `NEGOCIO_A` tiene descripción, tags, horario, dirección, teléfono, WhatsApp, Instagram y web válidos.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir su tarjeta desde búsqueda. | URL `/negocio/:id`; nombre e imagen corresponden a la tarjeta. |
| 2 | Comparar descripción, categoría, tags, dirección y horario con datos fuente. | Todos coinciden y no aparecen valores `undefined`, `null` ni JSON sin formatear. |
| 3 | Pulsar teléfono. | Se genera destino `tel:` con número correcto. |
| 4 | Pulsar WhatsApp. | Se abre URL segura de WhatsApp con el número correcto. |
| 5 | Pulsar Instagram y website. | Se abren destinos correctos; enlaces externos no alteran la app de forma inesperada. |
| 6 | Abrir el mapa, si está disponible. | Ubicación corresponde a la dirección y una falta de API key se maneja sin romper el resto. |

### CP-010 — Galería fullscreen pública

**Prioridad:** P1  
**Trazabilidad:** AC4  
**Precondiciones:** negocio con al menos 3 fotos; ejecutar en escritorio y móvil.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Pulsar una foto que no sea la primera. | Se abre modal fullscreen en la foto seleccionada. |
| 2 | Usar flechas visibles derecha/izquierda. | Avanza y retrocede una foto sin cerrar el modal. |
| 3 | Usar teclas →, ← y Escape. | Navega con flechas y Escape cierra el modal. |
| 4 | Reabrir y navegar desde última a primera. | El límite o ciclo se comporta de manera estable, sin imagen rota. |
| 5 | En móvil, deslizar horizontalmente. | Swipe cambia la imagen y no desplaza accidentalmente el fondo. |
| 6 | Cerrar y comprobar foco/scroll. | Se recupera el scroll y el usuario vuelve al punto anterior. |

## C. Reviews

### CP-011 — Crear review válida como consumidor

**Prioridad:** P0  
**Trazabilidad:** AC3; Reviews  
**Precondiciones:** sesión `CONSUMIDOR_NUEVO`; sin review en `NEGOCIO_A`.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir detalle de `NEGOCIO_A`. | Se muestra formulario “Deixe sua avaliação”. |
| 2 | Seleccionar 5 estrellas e ingresar la Review válida. | Rating seleccionado y contador refleja longitud, máximo 500. |
| 3 | Pulsar “Enviar Avaliação” una vez. | Botón pasa a “Enviando...”, queda deshabilitado y no duplica requests. |
| 4 | Esperar respuesta. | Se muestra confirmación; la review aparece inmediatamente en la lista como aprobada. |
| 5 | Recargar. | Review persiste, promedio/conteo se actualizan y aparece aviso de que ya evaluó. |
| 6 | Verificar BD/API. | Status `approved`, consumerId deriva del token y businessId es correcto. |

### CP-012 — Validaciones de review

**Prioridad:** P1  
**Trazabilidad:** Reglas Reviews  
**Precondiciones:** consumidor sin review.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Enviar sin estrellas y sin comentario. | Se muestran errores de rating y comentario; no hay POST exitoso. |
| 2 | Seleccionar rating 1 y escribir la Review corta. | Se rechaza por menos de 10 caracteres. |
| 3 | Escribir exactamente 10 caracteres no vacíos y enviar. | Se acepta si se cumplen las demás reglas. |
| 4 | Intentar escribir 501 caracteres. | El control limita a 500 o backend rechaza de forma clara; nunca almacena más de 500. |
| 5 | En ambiente/API controlado, enviar rating 0 y 6. | Backend rechaza ambos con 4xx. |
| 6 | Enviar comentario de espacios. | Backend/UI lo trata como vacío y rechaza. |

### CP-013 — Un consumidor solo puede evaluar una vez

**Prioridad:** P0  
**Trazabilidad:** AC3; Hard Rule Reviews  
**Precondiciones:** `CONSUMIDOR_CON_REVIEW`.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir el detalle ya evaluado. | No aparece formulario; aparece “Você já avaliou este negócio”. |
| 2 | Repetir manualmente el POST con otro rating/comentario y mismo token/businessId. | Backend responde 409/4xx y no crea un segundo registro. |
| 3 | Recargar y listar reviews. | Solo existe una review de ese consumidor para ese negocio. |

### CP-014 — Un business no puede publicar reviews

**Prioridad:** P0  
**Trazabilidad:** Roles; Hard Rule Reviews  
**Precondiciones:** sesión `OWNER_APROBADO`; abrir negocio ajeno.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir detalle de `NEGOCIO_B`. | La UI no permite enviar una review o informa la restricción. |
| 2 | Repetir POST `/api/reviews` con token business, rating y comentario válidos. | Backend responde 403. |
| 3 | Consultar reviews del destino. | No se creó review. |

## D. Onboarding y ciclo de estado

### CP-015 — Validación paso 1 de onboarding

**Prioridad:** P0  
**Trazabilidad:** Funcionalidad 4; AC13  
**Precondiciones:** `NEGOCIO_NUEVO_USER` autenticado.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir `/onboarding` y pulsar Próximo vacío. | Permanece en paso 1 y muestra requeridos para nombre, descripción, propietario y ciudad de origen. |
| 2 | Ingresar descripción de 9 caracteres. | Muestra “A descrição deve ter pelo menos 10 caracteres”. |
| 3 | Escribir CNPJ con letras y números. | El campo aplica máscara `XX.XXX.XXX/XXXX-XX` y limita a 18 caracteres. |
| 4 | Usar CNPJ inválido y completar lo demás; avanzar/finalizar. | El alta debe rechazarse con mensaje claro de CNPJ inválido. |
| 5 | Usar CNPJ válido ya registrado. | Backend rechaza duplicado sin crear un segundo negocio. |
| 6 | Completar con nombre, descripción >=10, CNPJ válido único, propietario, ciudad peruana y categoría. | Se habilita el avance al paso 2. |

> **Riesgo dirigido:** el código UI inspeccionado no incluye CNPJ en `validateStep1`; esta prueba debe confirmar que la validación backend evita alta vacía/inválida y que el error llega al usuario.

### CP-016 — Validación paso 2 de onboarding

**Prioridad:** P1  
**Trazabilidad:** Funcionalidad 4  
**Precondiciones:** paso 1 válido.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Pulsar Próximo sin dirección, ciudad ni estado. | Permanece en paso 2 con mensajes para los tres campos. |
| 2 | Ingresar ciudad de 2 caracteres. | Muestra “A cidade deve ter pelo menos 3 caracteres”. |
| 3 | Ingresar CEP `1234` y avanzar. | Muestra formato inválido `XXXXX-XXX`. |
| 4 | Dejar CEP vacío con los otros obligatorios válidos. | Permite avanzar, porque CEP figura como opcional. |
| 5 | Volver al paso 1 y regresar. | Los valores ingresados se conservan. |
| 6 | Completar calle, ciudad >=3, estado y CEP válido. | Avanza al paso 3. |

### CP-017 — Tags, fotos y alta pending

**Prioridad:** P0  
**Trazabilidad:** Funcionalidad 4; Status  
**Precondiciones:** pasos 1 y 2 válidos con CNPJ único.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Sin tags, pulsar Finalizar Cadastro. | No crea negocio; informa “Adicione pelo menos uma tag”. |
| 2 | Escribir una tag y pulsar Enter; añadir otra. | Ambas aparecen como chips y el campo queda vacío. |
| 3 | Eliminar una tag con ×. | Solo se elimina la seleccionada. |
| 4 | Elegir varias imágenes y quitar una miniatura. | Se ven previews y solo se retira la seleccionada. |
| 5 | Finalizar y evitar doble clic durante “Salvando...”. | Se realiza una sola creación, aparece toast de éxito y redirige tras ~1,5 s. |
| 6 | Verificar API/BD y búsqueda pública. | Existe un solo BusinessProfile status `pending`; no aparece públicamente. |

### CP-018 — Rechazo, motivo y reenvío corregido

**Prioridad:** P1  
**Trazabilidad:** Status rejected; AC8  
**Precondiciones:** negocio rechazado y owner autenticado.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Entrar al panel del negocio rechazado. | Se muestra status rechazado y motivo guardado, sin exponer información interna adicional. |
| 2 | Corregir el campo relacionado con el motivo. | Edición permitida. |
| 3 | Reenviar para revisión. | Status vuelve a `pending` y se confirma el envío. |
| 4 | Buscarlo públicamente antes de aprobación. | No aparece. |

## E. Panel “Meu Negócio” y galería

### CP-019 — Consultar y editar negocio propio

**Prioridad:** P0  
**Trazabilidad:** Funcionalidad 5  
**Precondiciones:** `OWNER_APROBADO`.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir `/meu-negocio`. | Se cargan solo los datos del negocio ligado al token. |
| 2 | Modificar nombre, descripción, categoría, dirección, contacto y tags con valores válidos. | Los controles aceptan los cambios y validan formato/requeridos. |
| 3 | Guardar una vez. | Aparece toast exitoso; botón evita envíos duplicados. |
| 4 | Recargar y abrir detalle público. | Datos persistieron y los campos públicos actualizados aparecen correctamente. |
| 5 | Manipular request con businessId de `NEGOCIO_B`. | Backend ignora/rechaza el ID ajeno; no modifica otro negocio. |

### CP-020 — Upload válido y máximo de 10 fotos

**Prioridad:** P0  
**Trazabilidad:** AC5; reglas Galería  
**Precondiciones:** owner de negocio con 8 fotos y tres imágenes válidas.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Arrastrar un JPG válido al área de upload. | Se muestra progreso/estado y la foto se agrega, total 9. |
| 2 | Añadir un WebP válido con selector. | Se agrega, total 10. |
| 3 | Intentar añadir una imagen adicional. | UI/backend rechaza claramente; el total permanece en 10. |
| 4 | Recargar el panel. | Las 10 fotos persisten y ninguna URL está rota. |
| 5 | Abrir la nueva foto en modal. | Se visualiza completa. |

### CP-021 — Rechazo de tipo y tamaño de archivo

**Prioridad:** P0  
**Trazabilidad:** AC5; reglas Galería  
**Precondiciones:** owner editable; PDF/TXT y JPG >5 MB.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Intentar subir JPG mayor a 5 MB. | Se rechaza con mensaje de máximo 5 MB; no se crea blob ni referencia. |
| 2 | Intentar subir PDF renombrado a `.jpg`. | La validación por MIME/contenido lo rechaza. |
| 3 | Intentar subir GIF/SVG. | Se rechaza; solo JPEG, PNG y WebP son válidos. |
| 4 | Subir PNG exactamente en el límite permitido. | Se acepta si su tamaño es <=5 MB. |
| 5 | Revisar galería tras recarga. | Solo la imagen válida fue añadida. |

### CP-022 — Cover, reordenamiento y eliminación

**Prioridad:** P1  
**Trazabilidad:** AC5  
**Precondiciones:** negocio con al menos 4 fotos.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Registrar orden y cover actuales. | Hay una identificación inequívoca de cover/primera foto. |
| 2 | Marcar la tercera como cover. | Indicador cambia y la nueva cover aparece en la tarjeta/detalle público. |
| 3 | Reordenar fotos mediante los controles disponibles. | El nuevo orden queda reflejado inmediatamente. |
| 4 | Recargar. | Cover y orden persisten. |
| 5 | Eliminar una foto no cover y confirmar. | Desaparece del panel, detalle y almacenamiento/referencia; las demás no cambian. |
| 6 | Cancelar una segunda eliminación. | No se elimina nada. |

### CP-023 — Panel disabled es solo lectura y ofrece portal

**Prioridad:** P0  
**Trazabilidad:** AC14  
**Precondiciones:** `OWNER_DISABLED`.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir `/meu-negocio`. | Banner “Atualize seu pagamento” visible. |
| 2 | Intentar editar campos, tags, subir/reordenar/eliminar fotos y guardar. | Todas las mutaciones están deshabilitadas o el backend las rechaza; no cambia ningún dato. |
| 3 | Pulsar enlace de actualización de pago. | Se crea sesión autenticada de Stripe Customer Portal y se redirige al customer correcto. |
| 4 | Buscar el negocio en sesión pública. | No aparece; el detalle directo no expone el perfil. |

## F. Inbox B2B

### CP-024 — Enviar y recibir mensaje entre negocios

**Prioridad:** P0  
**Trazabilidad:** Funcionalidad 8  
**Precondiciones:** dos owners business aprobados, A y B.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Como owner A abrir `/inbox` y crear conversación. | Autocomplete busca hasta 50 negocios y permite seleccionar B, no un ID arbitrario. |
| 2 | Enviar `Mensagem QA única 001`. | Mensaje aparece una sola vez con emisor A y hora coherente. |
| 3 | Entrar como owner B. | Resumen muestra conversación con A y estado no leído. |
| 4 | Abrir el hilo. | Mensajes aparecen en orden ascendente y el nuevo se marca leído. |
| 5 | Responder desde B. | A recibe/visualiza la respuesta en el mismo hilo, no en uno duplicado. |

### CP-025 — Validación y autorización de mensajes

**Prioridad:** P0  
**Trazabilidad:** Roles; API messages  
**Precondiciones:** business A, business B y consumidor.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Intentar enviar sin destino o con cuerpo vacío/espacios. | UI/backend rechaza y no crea mensaje. |
| 2 | Como consumidor abrir `/inbox` e intentar POST manual. | Se aplica la regla definida para consumer; no obtiene acceso B2B no autorizado ni suplanta un negocio. |
| 3 | Como A, manipular `businessId` para consultar conversaciones de B. | Backend responde 403/404; no devuelve mensajes de B. |
| 4 | Como A, manipular `fromBusinessId` para enviar como B. | Backend deriva emisor del token o rechaza; nunca suplanta. |
| 5 | Enviar caracteres Unicode y saltos de línea válidos. | Se conservan de forma segura, sin ejecutar HTML/script. |

### CP-026 — Archivar, desarchivar y soft-delete

**Prioridad:** P1  
**Trazabilidad:** Funcionalidad 8  
**Precondiciones:** conversación A-B existente.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Archivar conversación. | Sale de bandeja activa y aparece al consultar archivadas/all. |
| 2 | Desarchivarla. | Vuelve a bandeja activa con historial intacto. |
| 3 | Eliminar conversación y confirmar. | Se oculta para el actor mediante soft-delete; no se borra físicamente de inmediato. |
| 4 | Verificar datos/log autorizado. | `deletedAt` existe y respeta retención recuperable de 30 días. |
| 5 | Confirmar comportamiento para el otro participante. | No se elimina indebidamente su copia/historial según contrato. |

## G. Superadmin

### CP-027 — Dashboard, estadísticas, filtros y paginación

**Prioridad:** P0  
**Trazabilidad:** AC6  
**Precondiciones:** `SUPERADMIN`; datos de todos los estados y más de una página.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir `/admin/super`. | Banner beta refleja configuración; se muestran Total, Pendentes, Aprovados, Rejeitados, Desabilitados y Em Trial. |
| 2 | Comparar cantidades con respuesta API/consulta autorizada. | Cada tarjeta coincide con los datos y Total no cuenta soft-deleted indebidamente. |
| 3 | Filtrar por cada status. | Solo aparecen filas del status elegido. |
| 4 | Buscar por nombre, CNPJ y owner, uno por vez. | Cada criterio devuelve el registro correcto. |
| 5 | Buscar texto inexistente. | Estado vacío; no conserva filas previas. |
| 6 | Navegar páginas. | No hay duplicados/omisiones; orden `createdAt desc` se mantiene. |
| 7 | Abrir detalle de una fila. | Modal/detalle corresponde exactamente a esa fila. |

### CP-028 — Aprobar negocio con Beta Mode ON

**Prioridad:** P0  
**Trazabilidad:** AC7; AC10  
**Precondiciones:** beta ON; `NEGOCIO_PENDING`; Stripe/Resend test accesibles.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir acción Aprovar y confirmar una sola vez. | Hay indicador de proceso y se evita doble aprobación. |
| 2 | Revisar tabla/detalle. | Status cambia a `approved`, approvedAt se registra. |
| 3 | Revisar Stripe. | En beta no se crea cobro ni suscripción facturable. |
| 4 | Revisar email y logs. | Se aplica la política beta documentada: no salen emails de trial; registrar si welcome se envía según configuración efectiva. |
| 5 | Buscar públicamente. | El negocio ahora aparece. |

### CP-029 — Aprobar negocio con Beta Mode OFF

**Prioridad:** P0  
**Trazabilidad:** AC7; Billing  
**Precondiciones:** Stripe test; beta OFF; pending con CNPJ/email únicos.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Aprobar el negocio. | UI confirma una sola aprobación. |
| 2 | Verificar BD. | status `approved`, subscriptionStatus `trial`, stripeCustomerId y subscriptionId guardados; trialEndsAt ~30 días. |
| 3 | Verificar Stripe Customer. | Customer corresponde al owner/business y no está duplicado. |
| 4 | Verificar Subscription. | Precio mensual configurado R$59, trial de 30 días, método `default_incomplete`/guardado según contrato. |
| 5 | Verificar Resend/buzón. | Se envía exactamente un email Welcome al destinatario correcto. |
| 6 | Repetir request de aprobación. | Operación es idempotente o rechaza el estado; no crea segundo customer/sub/email. |

### CP-030 — Rechazar exige motivo y envía email

**Prioridad:** P0  
**Trazabilidad:** AC8; AC15  
**Precondiciones:** pending; Resend test.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Pulsar Rejeitar y confirmar con motivo vacío/espacios. | No permite continuar; indica motivo obligatorio. |
| 2 | Ingresar `Documentos incompletos — QA 001` y confirmar. | Status cambia a `rejected` y motivo se guarda completo. |
| 3 | Revisar Resend/buzón. | Se envía un email Rejected al owner con motivo correcto. |
| 4 | Buscar públicamente. | Negocio no aparece. |

### CP-031 — Eliminar cancela suscripción y aplica soft-delete

**Prioridad:** P0  
**Trazabilidad:** AC9  
**Precondiciones:** negocio QA aprobado con suscripción Stripe test; autorización explícita.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Pulsar Excluir y cancelar el diálogo. | No cambia status, BD ni Stripe. |
| 2 | Repetir y confirmar. | UI muestra éxito y la fila deja de estar activa. |
| 3 | Verificar Stripe. | Suscripción correcta queda cancelada; ninguna otra se modifica. |
| 4 | Verificar BD. | Se aplica soft-delete/status cancelado según implementación; relaciones no quedan accesibles públicamente. |
| 5 | Buscar y abrir URL directa. | Negocio no aparece ni expone datos. |
| 6 | Repetir request. | No genera error destructivo ni cancela recursos ajenos. |

### CP-032 — Toggle Beta Mode y transición a producción

**Prioridad:** P0  
**Trazabilidad:** AC10  
**Precondiciones:** superadmin; copia de valores actuales; negocios beta existentes sin trialEndsAt; ambiente de prueba.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Registrar modo actual y pulsar toggle una vez. | Confirmación visible; GET posterior devuelve nuevo valor y banner coincide. |
| 2 | Recargar y entrar desde otra sesión admin. | Estado persiste globalmente. |
| 3 | Cambiar de ON a OFF. | Cada negocio beta elegible recibe `trialEndsAt = fecha de transición + 30 días`, sin duplicación. |
| 4 | Repetir POST con el mismo valor OFF. | No reinicia/extiende indebidamente trials existentes. |
| 5 | Volver a ON solo si el plan de prueba lo autoriza. | No se produce cobro; configuración persiste. |

### CP-033 — Migración localStorage no destructiva e idempotente

**Prioridad:** P1  
**Trazabilidad:** Funcionalidad 1; F4.1  
**Precondiciones:** superadmin; dataset local QA con 2 negocios, 2 reviews y 1 conversación; backup del localStorage.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Pulsar Migrar Datos. | Confirmación indica conteos exactos antes de enviar. |
| 2 | Cancelar. | No hay cambios en API ni localStorage. |
| 3 | Confirmar la migración. | Reporte final muestra creados/omitidos/errores por entidad. |
| 4 | Inspeccionar localStorage. | Los datos siguen presentes; migración es no destructiva. |
| 5 | Ejecutar segunda vez con el mismo dataset. | No duplica entidades; reporte indica omitidos/idempotencia. |
| 6 | Aceptar borrar local solo después de verificar API. | Se borra únicamente el dataset objetivo, no preferencias/idioma ajenos. |
| 7 | Repetir endpoint sin token/con business. | Responde 401/403 y no migra nada. |

## H. Stripe, webhooks y emails

### CP-034 — Checkout mensual

**Prioridad:** P0  
**Trazabilidad:** Funcionalidad 5/10  
**Precondiciones:** beta OFF; owner elegible; Stripe test.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Como owner pulsar “Assinar / Ativar”. | Se crea sesión Stripe autenticada para su businessId y plan `monthly`. |
| 2 | Revisar Checkout. | Moneda BRL y precio R$59/mes; customer/metadata corresponden al negocio. |
| 3 | Cancelar en Stripe. | Regresa a URL de cancelación segura y el negocio no pasa a active. |
| 4 | Repetir y completar con tarjeta test exitosa. | Regresa a success; webhook actualiza subscription sin duplicarla. |
| 5 | Intentar crear checkout para businessId ajeno. | Backend responde 403/404. |

### CP-035 — Customer Portal

**Prioridad:** P0  
**Trazabilidad:** AC12  
**Precondiciones:** owner con stripeCustomerId test.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Pulsar “Gerenciar Assinatura”. | Se abre portal del customer correcto. |
| 2 | Actualizar tarjeta con una tarjeta test. | Stripe confirma cambio; no altera otro customer. |
| 3 | Consultar/descargar una factura test disponible. | Factura corresponde al negocio y es accesible. |
| 4 | Cancelar suscripción según configuración. | Evento se procesa y estado local se sincroniza. |
| 5 | Intentar portal sin customer o para ID ajeno. | Error controlado, sin filtrar URL de otro customer. |

### CP-036 — Webhook payment_failed y recuperación

**Prioridad:** P0  
**Trazabilidad:** AC11; AC14; AC15  
**Precondiciones:** Stripe CLI/dashboard test; negocio con suscripción; Resend test.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Emitir `invoice.payment_failed` firmado para la suscripción QA. | Webhook valida firma y responde 2xx. |
| 2 | Verificar BD. | subscriptionStatus pasa a `past_due`; no afecta otro negocio. |
| 3 | Verificar Resend. | Se envía exactamente un Payment failed al owner correcto. |
| 4 | Aplicar condición documentada de 7 días/disabled mediante evento o reloj de prueba autorizado. | status pasa a `disabled`, disabledAt se registra. |
| 5 | Confirmar búsqueda/panel. | Oculto públicamente y panel read-only con portal. |
| 6 | Emitir `invoice.payment_succeeded`/subscription active. | subscriptionStatus vuelve a `active`; comportamiento de reactivación del status coincide con regla implementada y se documenta. |

### CP-037 — Webhooks subscription_updated y deleted

**Prioridad:** P0  
**Trazabilidad:** AC11  
**Precondiciones:** Stripe test y suscripción QA.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Emitir update `trialing`. | Estado local `trial`. |
| 2 | Emitir update `active`. | Estado local `active`. |
| 3 | Emitir update `past_due`. | Estado local `past_due`. |
| 4 | Emitir update `incomplete` y `incomplete_expired` en registros controlados. | Mapean a `none`. |
| 5 | Emitir `customer.subscription.deleted`. | Estado local `canceled`; acceso/visibilidad obedecen política. |
| 6 | Reenviar el mismo evento con el mismo event ID. | Procesamiento idempotente, sin efectos/emails duplicados. |
| 7 | Enviar payload con firma ausente o incorrecta. | 4xx; no modifica BD. |

### CP-038 — Trial ending y política de emails en beta

**Prioridad:** P1  
**Trazabilidad:** AC15; Trial & Billing  
**Precondiciones:** suscripción test con owner email.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Con beta OFF, emitir `customer.subscription.trial_will_end` a 3 días. | Se envía un email Trial ending al owner con fecha/contexto correctos. |
| 2 | Repetir evento idéntico. | No se envía duplicado si existe control de idempotencia; cualquier diferencia se registra. |
| 3 | Activar beta ON en ambiente controlado y emitir evento equivalente. | No se envía email de trial ni se inicia cobro. |
| 4 | Revisar los cuatro templates en móvil/escritorio. | Welcome, Trial ending, Payment failed y Rejected tienen asunto/remitente/destinatario correctos, enlaces válidos y diseño legible. |

## I. Seguridad funcional y resiliencia

### CP-039 — Expiración de sesión durante una mutación

**Prioridad:** P0  
**Trazabilidad:** Autenticación; `ApiError`  
**Precondiciones:** usuario autenticado; posibilidad de invalidar token.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Abrir formulario editable y completar cambios sin guardar. | Datos quedan preparados. |
| 2 | Invalidar/cerrar la sesión en otra pestaña. | Token deja de ser válido. |
| 3 | Guardar/enviar desde la primera pestaña. | API rechaza 401; UI informa sesión expirada o solicita reingreso. |
| 4 | Revisar BD. | No se aplicó mutación parcial. |
| 5 | Reautenticarse y repetir conscientemente. | Operación válida puede completarse una sola vez. |

### CP-040 — Manejo de errores de API y prevención de doble envío

**Prioridad:** P1  
**Trazabilidad:** Capa API y estados UI  
**Precondiciones:** DevTools para bloquear/redireccionar una request.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Forzar timeout/500 al guardar perfil. | UI deja de cargar, muestra error comprensible y conserva datos del formulario. |
| 2 | Restablecer red y reintentar. | Guarda una sola vez sin recarga total. |
| 3 | Con red lenta, pulsar repetidamente submit en review/onboarding/aprobación. | Botón deshabilitado durante proceso; una sola entidad/acción creada. |
| 4 | Forzar 400 de validación. | Se presenta error útil, no mensaje genérico si el backend proporciona detalle seguro. |

### CP-041 — Inyección y renderizado seguro de contenido de usuario

**Prioridad:** P0  
**Trazabilidad:** campos libres de negocio, reviews y mensajes  
**Precondiciones:** datos QA eliminables.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | En descripción, review y mensaje ingresar `<img src=x onerror=alert(1)>`. | Se guarda/rechaza como texto seguro; jamás ejecuta script. |
| 2 | Ingresar comillas, ampersand, emoji y caracteres PT/ES (`á, ã, ç, ñ`). | Se visualizan correctamente sin mojibake ni truncamiento indebido. |
| 3 | Recargar lista, detalle e inbox. | El contenido sigue escapado y estable. |
| 4 | Revisar URLs de website/Instagram manipuladas con `javascript:`. | UI/backend rechaza o neutraliza esquemas inseguros. |

### CP-042 — Compatibilidad responsive y navegación por teclado

**Prioridad:** P2  
**Trazabilidad:** UI/UX  
**Precondiciones:** Chrome escritorio; viewport 375×667 y 1440×900.

| Paso | Acción | Resultado esperado |
|---:|---|---|
| 1 | Recorrer Home, Busca, Detalle, Onboarding e Inbox a 375 px. | Sin solapamientos, scroll horizontal ni botones fuera de pantalla. |
| 2 | Abrir filtros móviles y cerrarlos. | Panel visible, utilizable y con botón accesible “Fechar filtros”. |
| 3 | Recorrer controles con Tab y Shift+Tab. | Orden de foco lógico y foco visible. |
| 4 | Activar botones/enlaces con Enter/Espacio. | Ejecutan la misma acción que clic. |
| 5 | Abrir/cerrar modales con teclado. | Foco queda contenido mientras están abiertos y regresa al disparador al cerrar. |

---

## 5. Matriz de trazabilidad AC1–AC15

| Criterio | Casos principales |
|---|---|
| AC1 Community Reviews | CP-005 |
| AC2 Search Filters | CP-006, CP-007, CP-008 |
| AC3 Business Detail Review | CP-011, CP-012, CP-013, CP-014 |
| AC4 Business Detail Gallery | CP-010 |
| AC5 Meu Negócio Gallery | CP-020, CP-021, CP-022 |
| AC6 Superadmin Dashboard | CP-027 |
| AC7 Superadmin Approve | CP-028, CP-029 |
| AC8 Superadmin Reject | CP-018, CP-030 |
| AC9 Superadmin Delete | CP-031 |
| AC10 Beta Mode | CP-028, CP-032, CP-038 |
| AC11 Stripe Webhook | CP-036, CP-037 |
| AC12 Customer Portal | CP-023, CP-035 |
| AC13 CNPJ Validation | CP-015 |
| AC14 Disabled State | CP-008, CP-023, CP-036 |
| AC15 Emails | CP-029, CP-030, CP-036, CP-038 |

---

## 6. Orden recomendado de ejecución

1. **Smoke P0:** CP-001, CP-004, CP-006, CP-007, CP-008, CP-011, CP-013, CP-014, CP-015, CP-017, CP-019, CP-020, CP-021, CP-023, CP-024, CP-025 y CP-027.
2. **Administración e integraciones P0:** CP-028 a CP-032 y CP-034 a CP-037, únicamente en ambiente test autorizado.
3. **Regresión P1:** CP-002, CP-003, CP-005, CP-009, CP-010, CP-012, CP-016, CP-018, CP-022, CP-026, CP-033, CP-038 y CP-040.
4. **No funcional complementario:** CP-041 y CP-042.

---

## 7. Criterios de entrada y salida

### Entrada

- Build candidato desplegado y URL confirmada.
- APIs, Neon, Clerk, Stripe test y Resend test operativos.
- Dataset y cuentas de la sección 3 disponibles.
- Backup o mecanismo de limpieza para datos creados.
- Beta Mode inicial documentado.

### Salida aprobada

- 100% de casos P0 ejecutados y aprobados.
- 100% de AC1–AC15 cubiertos al menos una vez.
- Ningún defecto abierto de severidad Bloqueante o Crítica.
- Defectos Altos aceptados explícitamente por Product Owner si no se corrigen.
- Evidencias y IDs externos adjuntos para Stripe, Resend, Clerk y operaciones destructivas.
- Datos QA limpiados o identificados para limpieza posterior.

---

## 8. Plantilla de reporte de defecto

```text
ID: BUG-XXX
Título: [Módulo] Resultado breve y observable
Severidad: Bloqueante / Crítica / Alta / Media / Baja
Ambiente y build:
Navegador/dispositivo:
Usuario/rol:
Precondiciones:
Datos usados:
Pasos para reproducir:
1.
2.
3.
Resultado observado:
Resultado esperado:
Frecuencia: X de Y intentos
Evidencias: capturas, video, request/response sanitizado, logs, event ID
Impacto:
```

---

## 9. Ambigüedades y riesgos que QA debe elevar

1. El contrato especifica `minRating`, pero la UI inspeccionada sincroniza `rating`; debe definirse un único parámetro oficial.
2. `PRODUCT.md` dice que las ciudades vienen de `SELECT DISTINCT` en BD, pero la UI debe confirmarse contra esa fuente y no contra una lista estática.
3. La tabla de roles menciona “consumer usa inbound de inbox”, mientras la función se describe como canal exclusivo B2B; Product debe aclarar el alcance exacto del consumidor.
4. La regla indica disabled después de 7 días `past_due`, pero no se documenta el job/reloj que realiza la transición; se requiere mecanismo reproducible de prueba.
5. Se afirma “API lookup” en AC13, pero la sección técnica solo detalla validación local mod 11; confirmar proveedor, fallback y mensaje al usuario.
6. La política beta desactiva emails de trial, pero no indica inequívocamente si Welcome se envía al aprobar en beta.
7. El onboarding acepta `image/*` y convierte imágenes a base64, mientras la galería posterior limita tipo/tamaño y usa Netlify Blobs; confirmar límites exigidos durante onboarding.
8. No se define claramente si una suscripción recuperada desde `past_due` reactiva automáticamente un BusinessProfile `disabled`.
9. No se documenta una restricción única de review a nivel Prisma; la protección debe probarse bajo concurrencia además de la UI.

