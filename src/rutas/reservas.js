const express = require("express");

function crearRouterReservas(controladorReservas, validarReserva) {
  const router = express.Router();

  router.use((req, res, next) => {
    res.locals.seccion = "Reservas de salas";
    next();
  });

  router.get("/", controladorReservas.listar);

  router.get("/nueva", controladorReservas.mostrarNueva);

  router.get("/:id/editar", controladorReservas.mostrarEditar);

  router.get("/:id/estado", controladorReservas.mostrarEstado);

  router.get("/:id/eliminar", controladorReservas.mostrarEliminar);

  router.get("/:id", controladorReservas.mostrarDetalle);

  router.post("/", validarReserva, controladorReservas.crear);

  router.post("/:id/editar", controladorReservas.editar);

  router.post("/:id/estado", controladorReservas.cambiarEstado);

  router.post("/:id/eliminar", controladorReservas.eliminar);

  return router;
}

module.exports = crearRouterReservas;
