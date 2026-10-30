# Formación de Monitores · Pastoral Juvenil Ágape

Aula virtual para la formación de dirigentes: curso de 5 módulos y 21 unidades que cada dirigente avanza a su ritmo, con lecturas, Palabra de Dios, documentos de la Iglesia, cuaderno personal de reflexión, evaluaciones por módulo y constancia con QR. Incluye además la guía de servicio, materiales y oraciones. Se instala en el celular como app y funciona sin internet.

## Estructura

| Ruta | Qué contiene |
| --- | --- |
| `index.html` | La página (estructura básica) |
| `data/contenido.json` | **Todo el contenido**: cursos, módulos, unidades, evaluaciones, materiales, oraciones y guía de comunidad |
| `css/app.css` | Diseño |
| `js/app.js` | Vistas públicas y navegación |
| `js/admin.js` | Panel de Gestión |
| `js/store.js` | Guardado de datos (aquí se conectará la base de datos) |
| `js/config.js` | Ajustes: planilla de Google, porcentaje de aprobación |
| `sw.js`, `manifest.webmanifest`, `icons/` | App instalable y uso sin conexión |

## Respaldo: revista y familias

Nuestra Revista (Camino Ágape), Mi Camino, Nuestras familias, la asistencia, el pasaporte y el cuadro de honor se sacaron de la app el 27 de octubre de 2026. El código completo quedó en la rama [`respaldo/revista-y-familias`](https://github.com/PJ-Agape/pj-agape.github.io/tree/respaldo/revista-y-familias), para publicarlo más adelante como una app propia. Los datos guardados en Firebase (familias, asistencia, sellos) no se borraron.

## Editar contenido

1. Entra a la página y abre **Gestión** (pie de página). Contraseña inicial: `agape2026` — cámbiala en Gestión → Ajustes.
2. Edita cursos, módulos, unidades, evaluaciones, materiales, oraciones o la guía de comunidad.
3. Revisa con **Vista previa**.
4. En **Publicar**, descarga `contenido.json` y súbelo a la carpeta `data/` de este repositorio.

## Cambios en el código

Si modificas archivos de `css/` o `js/`, sube el número de `VERSION` en `sw.js` para que los celulares con la app instalada reciban la actualización.

## Licencia

Los contenidos (curso, revista, presentaciones, dinámicas, juegos) se comparten con licencia **CC BY-NC-SA 4.0**: puedes usarlos citando a la Pastoral Juvenil Ágape, sin fines comerciales y compartiendo igual. El código, con licencia **MIT**. El nombre, el logo y las fotos no se licencian. Detalles en [LICENSE.md](LICENSE.md).
