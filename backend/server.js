import express from "express";
import cors from "cors";
import { menu, reserva, calcularTotal } from "./data.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function obtenerReserva() {
  return {
    saldo: reserva.saldo,
    itemsReservados: reserva.itemsReservados,
    total: calcularTotal()
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

  res.status(201).json(obtenerReserva());
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});