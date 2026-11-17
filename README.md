# TP 11 - Reemplazo Completo de Reservas desde la Web (MongoDB + Express + EJS)

Aplicación web con vistas EJS y API REST para la gestión de reservas de salas de estudio, incorporando la edición por reemplazo completo desde formulario HTML (`GET` y `POST /reservas/:id/editar`) reutilizando la lógica de servicio compartida con `PUT /api/reservas/:id`.

## 1. Instalación y Ejecución

1. Clonar el repositorio e instalar las dependencias exactas desde el lockfile:
   ```bash
   npm ci
   ```
2. Copiar `.env.example` a `.env` y completar la cadena de conexión a MongoDB Atlas apuntando a la base `reservas_salas_u11`.
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

El proyecto requiere las siguientes variables en `.env` (sin incluir credenciales reales en el repositorio):

```env
PORT=3000
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/reservas_salas_u11?retryWrites=true&w=majority
```

## 3. Modelo de Campos Editables

El reemplazo completo (`POST /reservas/:id/editar` y `PUT /api/reservas/:id`) exige enviar exactamente **7 campos editables**. El identificador (`id`) se toma únicamente desde el parámetro `:id` de la URL y no se admite dentro del cuerpo de la solicitud.

* **`estudiante`** *(input `text` / `String`)*: Obligatorio; no puede quedar vacío luego de aplicar `.trim()`.
* **`email`** *(input `email` / `String`)*: Obligatorio; texto limpio que debe incluir `@`.
* **`sala`** *(select / `String`)*: Obligatoria; solo admite `Sala Norte`, `Sala Sur` o `Sala Multimedia`.
* **`fecha`** *(input `date` / `String`)*: Obligatoria; texto no vacío en formato de fecha (`YYYY-MM-DD`).
* **`turno`** *(select / `String`)*: Obligatorio; solo admite `Mañana`, `Tarde` o `Noche`.
* **`personas`** *(input `number` / `Number`)*: Obligatorio; se comprueba que el texto no llegue vacío antes de convertirlo con `Number`, y debe ser un entero finito entre `1` y `6`.
* **`estado`** *(select / `String`)*: Obligatorio; solo admite `pendiente` o `confirmada` (al crear una reserva nueva se asigna `pendiente` por defecto).

**Restricciones de integridad del cuerpo:** Se rechaza con estado `400` cualquier envío al que le falte alguno de los 7 campos, que incluya propiedades extra (`id`, `_id`, campos inventados) o que envíe estructuras no textuales u operadores en el formulario.

**Ejemplo de los 7 campos editables:**
```json
{
  "estudiante": "Ana Ejemplo",
  "email": "ana@example.com",
  "sala": "Sala Norte",
  "fecha": "2026-11-04",
  "turno": "Mañana",
  "personas": 3,
  "estado": "pendiente"
}
```

## 4. Rutas de Edición Web, API y Destino de Redirección `303`

### Rutas Web de Edición
* **`GET /reservas/:id/editar`**: Busca la reserva por `:id` y renderiza `views/reservas/editar.ejs` con los 7 campos precargados.
  * Si `:id` no cumple el formato de `ObjectId` de MongoDB, responde **HTML `400`**.
  * Si `:id` tiene formato válido pero no existe en la colección, responde **HTML `404`**.
* **`POST /reservas/:id/editar`**: Valida los 7 campos recibidos, guarda el contexto en `res.locals` antes de invocar `servicio.reemplazar(id, datosReemplazo)` y persiste el reemplazo completo en MongoDB sin llamar por HTTP a la propia API.
  * **Destino del `303`:** Ante un guardado exitoso, responde **`303 See Other`** con cabecera `Location: /reservas/:id`, redirigiendo al detalle actualizado de la reserva.
  * **Conservación ante errores:** Si falla la validación en el controlador o Mongoose rechaza el documento, responde **HTML `400`** renderizando nuevamente `views/reservas/editar.ejs` con el mensaje explicativo, el `id` y todos los valores ingresados por el usuario intactos.

### Endpoints de API y Rutas Heredadas (TP 10)
* **`PUT /api/reservas/:id`**: Reemplazo completo vía JSON reutilizando `servicio.reemplazar` (`200 OK` con el documento formateado, `400` si faltan o sobran campos, `404` si el ID no existe).
* **Resto de la API:** `GET /api/reservas` (con filtrado, ordenamiento, paginación y proyección), `GET /api/reservas/:id`, `POST /api/reservas`, `PATCH /api/reservas/:id` y `DELETE /api/reservas/:id`.
* **Vistas HTML y Monitoreo:** `GET /reservas`, `GET /reservas/nueva`, `POST /reservas`, `GET /reservas/:id` y `GET /estado`.

## 5. Pruebas Reproducibles y Evidencia de Resultados

### Datos Iniciales (`reservas_salas_u11`, colección `reservas`)
1. **Ana Ejemplo** (`ana@example.com` | `Sala Norte` | `2026-11-04` | `Mañana` | 2 personas | `pendiente`) — ID: `6af686a526082caba9ac6388`
2. **Bruno Ejemplo** (`bruno@example.com` | `Sala Sur` | `2026-11-04` | `Tarde` | 3 personas | `pendiente`) — ID: `6af686d726082caba9ac6389`

### Matriz de Verificación (Navegador y Postman)
* **Precarga de edición (`GET /reservas/6af686a526082caba9ac6388/editar`):** Renderiza el formulario con los 7 campos precargados con los valores actuales de Ana Ejemplo.
* **Guardar desde web y comprobar por API:** Al cambiar `personas` a `4` y `estado` a `confirmada` y enviar el formulario, el servidor responde **`303 See Other`** hacia `/reservas/6af686a526082caba9ac6388`. Al consultar `GET http://localhost:3000/api/reservas/6af686a526082caba9ac6388`, devuelve `200 OK` conservando el mismo ID con `personas: 4` y `estado: "confirmada"`.
* **Cancelar edición:** Al modificar campos en pantalla dentro de `/reservas/6af686a526082caba9ac6388/editar` y pulsar **Cancelar**, vuelve a `/reservas/6af686a526082caba9ac6388` sin efectuar escrituras.
* **Guardar desde API (`PUT` completo) y comprobar en web:** Enviando `PUT http://localhost:3000/api/reservas/6af686a526082caba9ac6388` con body JSON completo (`personas: 3`, `estado: "pendiente"`), responde `200 OK` con el mismo ID; al reabrir `/reservas/6af686a526082caba9ac6388/editar`, los 7 campos precargados coinciden con el `PUT`.
* **`PUT` incompleto (`PUT /api/reservas/6af686a526082caba9ac6388` omitiendo `estado`):** Responde `400 Bad Request` y `GET /api/reservas/6af686a526082caba9ac6388` confirma que el documento permanece intacto.
* **Formulario inválido (`POST /reservas/6af686a526082caba9ac6388/editar` en `x-www-form-urlencoded`):** Enviando las 7 filas con `estudiante="Ana Prueba Error"` y `personas=0`, responde **HTML `400`** mostrando `editar.ejs` con los valores recibidos conservados y sin alterar el documento en Atlas. Al corregir `personas=2` y reenviar (con *Automatically follow redirects* desactivado en Postman), se observa **`303 See Other`** y cabecera `Location: /reservas/6af686a526082caba9ac6388`.
* **ID inválido vs. ID válido ausente:** `GET /reservas/123/editar` devuelve **HTML `400`** (*ID inválido*); `GET /reservas/6af686a526082caba9ac6380/editar` devuelve **HTML `404`** (*Reserva no encontrada*).
* **Persistencia tras reinicio:** Tras detener el servidor (`Ctrl + C`) y volver a iniciarlo contra `reservas_salas_u11`, `GET /api/reservas/6af686a526082caba9ac6388` mantiene el último reemplazo válido guardado y `/estado` conserva `totalReservas: 2` sin duplicados.