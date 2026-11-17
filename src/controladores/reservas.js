const mongoose = require("mongoose");

function crearControladorReservas(servicioReserva) {
  async function listar(req, res, next) {
    try {
      const reservas = await servicioReserva.listar();
      res.render("reservas/lista", {
        title: "Listado de Reservas",
        titulo: "Listado de Reservas",
        reservas,
      });
    } catch (error) {
      next(error);
    }
  }

  async function mostrarDetalle(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).render("no-encontrado", {
          title: "Reserva no encontrada",
          titulo: "Reservas no encontradas",
          mensaje: "La reserva solicitada no existe.",
        });
      }

      const reserva = await servicioReserva.obtenerPorId(id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          title: "Reserva no encontrada",
          titulo: "Reserva no encontrada",
          mensaje: "No se encontró ninguna reserva con ese identificador.",
        });
      }

      res.render("reservas/detalle", {
        title: "Detalle de Reserva",
        titulo: "Detalle de Reserva",
        reserva,
      });
    } catch (error) {
      next(error);
    }
  }

  function mostrarNueva(req, res) {
    res.render("reservas/nueva", {
      title: "Nueva Reserva",
      titulo: "Nueva Reserva",
      reserva: {},
      valores: {},
      error: null,
    });
  }

  async function crear(req, res, next) {
    try {
      await servicioReserva.crear(req.body);
      res.redirect("/reservas");
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).render("reservas/nueva", {
          title: "Nueva Reserva",
          titulo: "Nueva Reserva",
          reserva: req.body,
          valores: req.body,
          error: "Por favor corrija los errores en el formulario.",
        });
      }
      next(error);
    }
  }

  async function mostrarEditar(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          title: "ID inválido",
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const reserva = await servicioReserva.obtenerPorId(id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          title: "Reserva no encontrada",
          titulo: "Reserva no encontrada",
          mensaje: "No existe ninguna reserva con el identificador indicado.",
        });
      }

      res.render("reservas/editar", {
        title: "Editar reserva",
        titulo: "Editar reserva",
        id: reserva.id,
        valores: {
          estudiante: reserva.estudiante,
          email: reserva.email,
          sala: reserva.sala,
          fecha: reserva.fecha,
          turno: reserva.turno,
          personas: reserva.personas,
          estado: reserva.estado,
        },
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async function editar(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          title: "ID inválido",
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const renderError = (mensajeError) =>
        res.status(400).render("reservas/editar", {
          title: "Editar reserva",
          titulo: "Editar reserva",
          id,
          valores: req.body && typeof req.body === "object" ? req.body : {},
          error: mensajeError,
        });

      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        return renderError(
          "Los datos enviados en el formulario no son válidos.",
        );
      }

      const camposPermitidos = [
        "estudiante",
        "email",
        "sala",
        "fecha",
        "turno",
        "personas",
        "estado",
      ];
      const clavesRecibidas = Object.keys(req.body);
      const extras = clavesRecibidas.filter(
        (clave) => !camposPermitidos.includes(clave),
      );
      const faltantes = camposPermitidos.filter(
        (clave) => !clavesRecibidas.includes(clave),
      );

      if (extras.length > 0 || faltantes.length > 0) {
        return renderError(
          "El formulario debe incluir exactamente los siete campos editables, sin campos extra ni identificadores.",
        );
      }

      const hayNoTexto = camposPermitidos.some(
        (campo) => typeof req.body[campo] !== "string",
      );
      if (hayNoTexto) {
        return renderError(
          "Todos los campos deben enviarse como texto simple.",
        );
      }

      const estudiante = req.body.estudiante.trim();
      if (!estudiante) {
        return renderError("El nombre del estudiante es obligatorio.");
      }

      const email = req.body.email.trim();
      if (!email || !email.includes("@")) {
        return renderError("El email es obligatorio y debe contener @.");
      }

      const sala = req.body.sala.trim();
      const salasValidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
      if (!salasValidas.includes(sala)) {
        return renderError("La sala seleccionada no es válida.");
      }

      const fecha = req.body.fecha.trim();
      if (!fecha) {
        return renderError("La fecha es obligatoria.");
      }

      const turno = req.body.turno.trim();
      const turnosValidos = ["Mañana", "Tarde", "Noche"];
      if (!turnosValidos.includes(turno)) {
        return renderError("El turno seleccionado no es válido.");
      }

      const personasTexto = req.body.personas.trim();
      if (personasTexto === "") {
        return renderError("La cantidad de personas es obligatoria.");
      }

      const personas = Number(personasTexto);
      if (
        !Number.isFinite(personas) ||
        !Number.isInteger(personas) ||
        personas < 1 ||
        personas > 6
      ) {
        return renderError(
          "La cantidad de personas debe ser un número entero entre 1 y 6.",
        );
      }

      const estado = req.body.estado.trim();
      const estadosValidos = ["pendiente", "confirmada"];
      if (!estadosValidos.includes(estado)) {
        return renderError("El estado debe ser pendiente o confirmada.");
      }

      res.locals.contextoEdicion = {
        id,
        valores: req.body,
      };

      const datosReemplazo = {
        estudiante,
        email,
        sala,
        fecha,
        turno,
        personas,
        estado,
      };

      const reservaActualizada = await servicioReserva.reemplazar(
        id,
        datosReemplazo,
      );

      if (!reservaActualizada) {
        return res.status(404).render("no-encontrado", {
          title: "Reserva no encontrada",
          titulo: "Reserva no encontrada",
          mensaje: "No existe ninguna reserva con el identificador indicado.",
        });
      }

      return res.redirect(303, `/reservas/${id}`);
    } catch (error) {
      next(error);
    }
  }

  async function mostrarEstado(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          title: "ID inválido",
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const reserva = await servicioReserva.obtenerPorId(id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          title: "Reserva no encontrada",
          titulo: "Reserva no encontrada",
          mensaje: "No existe ninguna reserva con el identificador indicado.",
        });
      }

      res.render("reservas/estado", {
        title: "Cambiar estado",
        titulo: "Cambiar estado",
        id: reserva.id,
        reserva,
        valores: { estado: reserva.estado },
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async function cambiarEstado(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          title: "ID inválido",
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const renderError = (mensajeError) =>
        res.status(400).render("reservas/estado", {
          title: "Cambiar estado",
          titulo: "Cambiar estado",
          id,
          valores: req.body && typeof req.body === "object" ? req.body : {},
          error: mensajeError,
        });

      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        return renderError(
          "Los datos enviados en el formulario no son válidos.",
        );
      }

      const claves = Object.keys(req.body);
      if (claves.length !== 1 || claves[0] !== "estado") {
        return renderError(
          "El formulario debe incluir únicamente el campo estado, sin campos extra ni vacíos.",
        );
      }

      if (typeof req.body.estado !== "string") {
        return renderError(
          "El campo estado debe enviarse como un único valor de texto.",
        );
      }

      const estado = req.body.estado.trim();
      if (estado !== "pendiente" && estado !== "confirmada") {
        return renderError(
          "El estado seleccionado debe ser pendiente o confirmada.",
        );
      }

      res.locals.contextoEstado = {
        id,
        valores: req.body,
      };

      const reservaActualizada = await servicioReserva.modificar(id, {
        estado,
      });

      if (!reservaActualizada) {
        return res.status(404).render("no-encontrado", {
          title: "Reserva no encontrada",
          titulo: "Reserva no encontrada",
          mensaje: "No existe ninguna reserva con el identificador indicado.",
        });
      }

      return res.redirect(303, `/reservas/${id}`);
    } catch (error) {
      next(error);
    }
  }

  async function mostrarEliminar(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          title: "ID inválido",
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const reserva = await servicioReserva.obtenerPorId(id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          title: "Reserva no encontrada",
          titulo: "Reserva no encontrada",
          mensaje: "No existe ninguna reserva con el identificador indicado.",
        });
      }

      res.render("reservas/eliminar", {
        title: "Eliminar reserva",
        titulo: "Eliminar reserva",
        id: reserva.id,
        reserva,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async function eliminar(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          title: "ID inválido",
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const renderError = async (mensajeError) => {
        const reserva = await servicioReserva.obtenerPorId(id);
        return res.status(400).render("reservas/eliminar", {
          title: "Eliminar reserva",
          titulo: "Eliminar reserva",
          id,
          reserva: reserva || null,
          error: mensajeError,
        });
      };

      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        return await renderError(
          "Los datos enviados para confirmar la eliminación no son válidos.",
        );
      }

      const claves = Object.keys(req.body);
      if (claves.length !== 1 || claves[0] !== "confirmar") {
        return await renderError(
          "Debe enviarse únicamente el campo confirmar=si, sin campos extra.",
        );
      }

      if (req.body.confirmar !== "si") {
        return await renderError(
          "La confirmacion no es válida o se envió repetida.",
        );
      }

      const reservaELiminada = await servicioReserva.eliminar(id);
      if (!reservaELiminada) {
        return res.status(404).render("no-encontrado", {
          title: "Reserva no encontrada",
          titulo: "Reserva no encontrada",
          mensaje:
            "La reserva indicada no existe o ya fue eliminada previamente.",
        });
      }

      return res.redirect(303, "/reservas");
    } catch (error) {
      next(error);
    }
  }

  return {
    listar,
    mostrarDetalle,
    mostrarNueva,
    mostrarEliminar,
    crear,
    mostrarEditar,
    editar,
    mostrarEstado,
    cambiarEstado,
    eliminar,
  };
}

module.exports = crearControladorReservas;
