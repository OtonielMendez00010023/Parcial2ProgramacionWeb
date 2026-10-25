import express from "express";
import cors from "cors";
import {
  menu,
  reserva,
  calcularTotal,
  iniciarVencimientoReserva,
  limpiarVencimientoReserva,
  procesarVencimientoReserva
} from "./data.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

let temporizadorReserva = null;

function detenerTemporizadorReserva() {
  if (temporizadorReserva !== null) {
    clearTimeout(temporizadorReserva);
    temporizadorReserva = null;
  }
}

function programarVencimientoReserva() {
  detenerTemporizadorReserva();

  if (reserva.fechaExpiracion === null) return;

  const tiempoRestante = Math.max(0, reserva.fechaExpiracion - Date.now());
  temporizadorReserva = setTimeout(() => {
    try {
      procesarVencimientoReserva();
    } catch (error) {
      console.error("No se pudo liberar el stock al vencer la reserva:", error);
    } finally {
      temporizadorReserva = null;
    }
  }, tiempoRestante);
}

app.use("/api", (req, res, next) => {
  if (procesarVencimientoReserva()) {
    detenerTemporizadorReserva();
  }
  next();
});

function obtenerReserva() {
  return {
    saldo: reserva.saldo,
    itemsReservados: reserva.itemsReservados,
    total: calcularTotal(),
    fechaExpiracion: reserva.fechaExpiracion === null
      ? null
      : new Date(reserva.fechaExpiracion).toISOString(),
    expirada: reserva.expirada
  };
}

// Endpoint 1: lista del menú
app.get("/api/menu", (req, res) => {
  res.json(menu);
});

// Endpoint 2: reserva activa y saldo
app.get("/api/reserva", (req, res) => {
  res.json(obtenerReserva());
});

// Endpoint 3: agregar un plato a la reserva
app.post("/api/reserva/agregar", (req, res) => {
  const { alimentoId, cantidad } = req.body ?? {};

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ mensaje: "La cantidad debe ser un número entero mayor a 0" });
  }

  const alimento = menu.find((a) => a.id === alimentoId);
  if (!alimento) {
    return res.status(404).json({ mensaje: "Alimento no encontrado" });
  }

  if (alimento.stock < cantidad) {
    return res.status(400).json({ mensaje: "Stock insuficiente" });
  }

  if (calcularTotal() + alimento.precio * cantidad > reserva.saldo) {
    return res.status(400).json({ mensaje: "Saldo insuficiente para esta cantidad" });
  }

  alimento.stock -= cantidad;

  const item = reserva.itemsReservados.find((i) => i.id === alimentoId);
  if (item) {
    item.cantidad += cantidad;
  } else {
    reserva.itemsReservados.push({ id: alimentoId, cantidad });
  }

  if (iniciarVencimientoReserva()) {
    programarVencimientoReserva();
  }

  res.status(201).json(obtenerReserva());
});

//Endpoint 4: Actualizar porciones
app.put("/api/reserva/actualizar-porciones/:id", (req, res) => {
  const alimentoId = Number(req.params.id);
  const { cantidad } = req.body ?? {};

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({
      mensaje: "La cantidad debe ser un número entero mayor a 0"
    });
  }

  const alimento = menu.find((a) => a.id === alimentoId);
  if (!alimento) {
    return res.status(404).json({ mensaje: "Alimento no encontrado" });
  }

  const item = reserva.itemsReservados.find((i) => i.id === alimentoId);
  if (!item) {
    return res.status(404).json({ mensaje: "El alimento no está en la reserva" });
  }

  const diferencia = cantidad - item.cantidad;

  if (diferencia > 0 && alimento.stock < diferencia) {
    return res.status(400).json({ mensaje: "Stock insuficiente" });
  }

  const nuevoTotal = calcularTotal() + diferencia * alimento.precio;
  if (nuevoTotal > reserva.saldo) {
    return res.status(400).json({
      mensaje: "Saldo insuficiente para esta cantidad"
    });
  }

  alimento.stock -= diferencia;
  item.cantidad = cantidad;

  res.json(obtenerReserva());
});

// Endpoint 5: eliminar un plato y devolver unidades al stock
app.delete("/api/reserva/eliminar/:id", (req, res) => {
  const alimentoId = Number(req.params.id);

  const indice = reserva.itemsReservados.findIndex((i) => i.id === alimentoId);
  if (indice === -1) {
    return res.status(404).json({ mensaje: "El alimento no está en la reserva" });
  }

  const itemEliminado = reserva.itemsReservados[indice];
  const alimento = menu.find((a) => a.id === alimentoId);

  if (!alimento) {
    return res.status(404).json({ mensaje: "Alimento no encontrado" });
  }

  alimento.stock += itemEliminado.cantidad;
  reserva.itemsReservados.splice(indice, 1);

  if (reserva.itemsReservados.length === 0) {
    limpiarVencimientoReserva();
    detenerTemporizadorReserva();
  }

  res.json(obtenerReserva());
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});