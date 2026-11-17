# TP 12 - Cambio Parcial y Eliminación de Reservas (MongoDB + Express + EJS)

Aplicación web con vistas EJS y API REST para la gestión de reservas de salas de estudio, incorporando pantallas específicas para el **cambio parcial de estado** (`GET` y `POST /reservas/:id/estado`) y la **eliminación con confirmación** (`GET` y `POST /reservas/:id/eliminar`), reutilizando los servicios compartidos con `PATCH` y `DELETE` de la API y conservando intacta la edición completa de 7 campos del TP 11.

## 1. Instalación y Ejecución

1. Clonar el repositorio e instalar las dependencias exactas desde el lockfile:
   ```bash
   npm ci
   ```
2. Copiar `.env.example` a `.env` y completar la URI de MongoDB Atlas apuntando a la base `reservas_salas_u12` (colección `reservas`).
3. Verificar formato, linting y conexión a la base antes de iniciar:
   ```bash
   npm run check
   node --env-file=.env scripts/comprobar-conexion.js
   ```
4. Iniciar el servidor:
   ```bash
   node --env-file=.env src/index.js
   ```

## 2. Variables de Entorno (`.env.example`)

```env
PORT=3000
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/reservas_salas_u12?retryWrites=true&w=majority
```

## 3. Campos Admitidos por Operación

* **Cambio parcial web (`POST /reservas/:id/estado`):** Admite únicamente el campo `estado` con valor `"pendiente"` o `"confirmada"`. Rechaza con **HTML `400`** cualquier envío vacío, valor fuera de catálogo, campo extra o campo repetido. Los otros 6 campos (`estudiante`, `email`, `sala`, `fecha`, `turno`, `personas`) y el ID permanecen intactos.
* **Eliminación web (`POST /reservas/:id/eliminar`):** Admite únicamente `confirmar=si` tras leer la pantalla previa de confirmación (`GET /reservas/:id/eliminar`). Rechaza con **HTML `400`** envíos sin confirmar, `confirmar=no`, valores repetidos o campos extra sin alterar el documento.
* **Edición completa heredada (`POST /reservas/:id/editar` y `PUT /api/reservas/:id`):** Exige los 7 campos editables (`estudiante`, `email`, `sala`, `fecha`, `turno`, `personas` entero entre `1` y `6`, y `estado`).
* **Diferencia entre `POST` web y `PATCH`/`DELETE` de la API:**
  * Los formularios HTML (`POST /reservas/:id/estado` y `POST /reservas/:id/eliminar`) reciben `application/x-www-form-urlencoded`, validan el cuerpo en el controlador web, invocan el servicio compartido (`servicio.modificar` / `servicio.eliminar`) sin realizar llamadas HTTP internas y responden con redirección **`303 See Other`** (o renderizan vistas HTML con estado `400`/`404`).
  * Los endpoints de API (`PATCH /api/reservas/:id` y `DELETE /api/reservas/:id`) operan con JSON y códigos REST (`200 OK` en `PATCH` admitiendo `estado` y `personas`; `204 No Content` sin cuerpo en `DELETE` exitoso; `400`/`404` en JSON ante error).

## 4. Rutas y Respuestas

### Cambio Parcial de Estado (Web)
* **`GET /reservas/:id/estado`**
  * Busca la reserva por `:id` y renderiza `views/reservas/estado.ejs` (`200 OK`) con el estado actual precargado en un `<select>` y un enlace para cancelar hacia `/reservas/:id` sin modificar datos.
  * Devuelve **HTML `400`** si el `:id` no cumple el formato `ObjectId` y **HTML `404`** si tiene formato válido pero no existe.
* **`POST /reservas/:id/estado`**
  * Valida que llegue exclusivamente `estado` (`pendiente` o `confirmada`), guarda el contexto en `res.locals` y ejecuta `servicio.modificar(id, { estado })`.
  * **Éxito:** Responde **`303 See Other`** con `Location: /reservas/:id`, conservando intactos los 6 campos restantes y el ID.
  * **Error:** Responde **HTML `400`** volviendo a renderizar `views/reservas/estado.ejs` con explicación, `id` y valores recibidos, o **HTML `404`** si el registro fue eliminado previamente.

## 5. Pruebas Reproducibles y Evidencia de Resultados

### Datos Iniciales (`reservas_salas_u12`, colección `reservas`)
1. **Ana Ejemplo** (`ana@example.com` | `Sala Norte` | `2026-11-11` | `Mañana` | 2 personas | `pendiente`) — ID: `6afc6f4636a97a3b8bca255f`
2. **Bruno Ejemplo** (`bruno@example.com` | `Sala Sur` | `2026-11-11` | `Tarde` | 3 personas | `pendiente`) — ID: `6afcacf56daaad8648e725d7`
3. **Lucio Temporal** (registro descartable para `DELETE` API) — ID: `6afcad0e6daaad8648e725d8`

### Matriz de Verificación (Navegador y Postman)
* **Cambio parcial API (`PATCH /api/reservas/6afc6f4636a97a3b8bca255f`):**
  * Con `{"estado": "confirmada"}` devuelve **`200 OK`** manteniendo el mismo ID y los otros 6 campos intactos.
  * Con `{}` o `{"estado": "inventado"}` devuelve **`400 Bad Request`** sin modificar el documento.
* **Cambio parcial web (`POST /reservas/6afc6f4636a97a3b8bca255f/estado`):**
  * Enviando `estado=pendiente` (`x-www-form-urlencoded`, *Automatically follow redirects* desactivado) responde **`303 See Other`** con cabecera `Location: /reservas/6afc6f4636a97a3b8bca255f`; `GET /api/reservas/6afc6f4636a97a3b8bca255f` confirma el cambio y la conservación de los 6 campos restantes.
  * Enviando `estado=inventado`, cuerpo vacío, `estado=pendiente` + `personas=5` o `estado` duplicado responde **HTML `400`** conservando el contexto y el documento intacto.
  * Cancelar en el navegador vuelve al detalle sin guardar cambios.
* **Confirmación y eliminación web (`Bruno Ejemplo` — `6afcacf56daaad8648e725d7`):**
  * `GET /reservas/6afcacf56daaad8648e725d7/eliminar` muestra la advertencia y datos de Bruno sin borrarlo (`GET` API sigue devolviendo `200`).
  * `POST /reservas/6afcacf56daaad8648e725d7/eliminar` con cuerpo vacío, `confirmar=no` o `confirmar=si` + campo extra devuelve **HTML `400`** y mantiene el documento intacto.
  * `POST /reservas/6afcacf56daaad8648e725d7/eliminar` con únicamente `confirmar=si` responde **`303 See Other`** con `Location: /reservas`. Un `GET` posterior a Bruno devuelve **`404`**, repetir el `POST` de eliminación devuelve **`404`** y Ana sigue existiendo.
* **Eliminación por API (`Lucio Temporal` — `6afcad0e6daaad8648e725d8`):**
  * `DELETE http://localhost:3000/api/reservas/6afcad0e6daaad8648e725d8` responde **`204 No Content`** sin cuerpo; repetir la solicitud devuelve **`404 Not Found`**.
* **IDs inválidos, ausencia concurrente y reinicio:**
  * `GET /reservas/abc/estado` devuelve **HTML `400`**; un ID válido ausente devuelve **HTML `404`**. Al abrir una pantalla de edición/estado y borrar el registro desde `DELETE /api/...` antes de enviar el formulario, el envío responde **HTML `404`** sin recrear el documento.
  * Tras reiniciar el servidor (`Ctrl + C` y nuevo arranque contra `reservas_salas_u12`), el estado de Ana persiste, los registros eliminados siguen ausentes y las funciones del TP 11 (edición completa de 7 campos, alta, listado y `PUT`) siguen operativas.