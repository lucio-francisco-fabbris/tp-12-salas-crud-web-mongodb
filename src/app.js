
const express = require("express");
const path = require("node:path");
const expressLayout = require("express-ejs-layouts");
const morgan = require("morgan");

const crearControladorApiReservas = require("./controladores/api-reservas");
const crearRouterApiReservas = require("./rutas/api-reservas");

function crearApp(
  reservasRouter,
  servicioReservas,
  identificarSolicitud,
  medirDuracion,
) {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));
  app.use(expressLayout);
  app.set("layout", "layouts/main");

  app.use(morgan("dev"));
  app.use(express.static(path.join(__dirname, "../public")));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  if (identificarSolicitud) app.use(identificarSolicitud);
  if (medirDuracion) app.use(medirDuracion);

  app.get("/estado", async (req, res, next) => {
    try {
      const cantidad = await servicioReservas.contar();
      res.json({
        estado: "OK",
        servicio: "Reserva de salas de estudio",
        totalReservas: cantidad,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/", (req, res) => {
    res.render("inicio", {
      title: "Inicio",
    });
  });

  if (
    typeof reservasRouter === "function" ||
    typeof reservasRouter?.use === "function"
  ) {
    app.use("/reservas", reservasRouter);
  }

  const controladorApi = crearControladorApiReservas(servicioReservas);
  const apiReservasRouter = crearRouterApiReservas(controladorApi);
  app.use("/api/reservas", apiReservasRouter);

  app.use((req, res) => {
    if (req.originalUrl.startsWith("/api")) {
      return res.status(404).json({ error: "Endpoint no encontrado." });
    }
    res.status(404).render("no-encontrado", {
      title: "Página no encontrada",
      titulo: "Página no encontrada",
      mensaje: "La ruta solicitada no existe.",
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("Error no controlado:", err.message);

    if (req.originalUrl.startsWith("/api")) {
      if (err.name === "ValidationError" || err.name === "CastError") {
        return res.status(400).json({
          error: "Error de validación",
          detalles: err.message,
        });
      }
      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }

    if (err.name === "ValidationError" || err.name === "CastError") {
      if (res.locals.contextoEstado) {
        return res.status(400).render("reservas/estado", {
          title: "Cambiar Estado",
          titulo: "Cambiar Estado",
          id: res.locals.contextoEstado.id,
          valores: res.locals.contextoEstado.valores,
          error: "Error de validación al guardar el estado de la reserva.",
        });
      }

      if (res.locals.contextoEdicion) {
        return res.status(400).render("reservas/editar", {
          title: "Editar reserva",
          titulo: "Editar reserva",
          id: res.locals.contextoEdicion.id,
          valores: res.locals.contextoEdicion.valores,
          error: "Error de validación al guardar los cambios de la reserva.",
        });
      }

      return res.status(400).render("reservas/nueva", {
        title: "Nueva Reserva",
        titulo: "Nueva Reserva",
        reserva: req.body || {},
        valores: req.body || {},
        error: "Por favor corrija los errores en el formulario.",
      });
    }

    res.status(500).render("no-encontrado", {
      title: "Error interno del servidor",
      titulo: "Error interno del servidor",
      mensaje: "Ocurrió un error inesperado. Intentá nuevamente más tarde.",
    });
  });

  return app;
}

module.exports = crearApp;