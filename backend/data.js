export const menu = [
  { id: 101, nombre: "Pollo empanizado", precio: 5.5, stock: 12, categoria: "Fuerte" },
  { id: 102, nombre: "Pasta Alfredo", precio: 4.75, stock: 8, categoria: "Fuerte" },
  { id: 103, nombre: "Ensalada César", precio: 3.25, stock: 10, categoria: "Entrada" },
  { id: 104, nombre: "Sopa de gallina", precio: 2.5, stock: 6, categoria: "Entrada" },
  { id: 105, nombre: "Pastel de Manzana", precio: 2.0, stock: 5, categoria: "Postre" },
  { id: 106, nombre: "Limonada", precio: 1.25, stock: 0, categoria: "Bebida" }
];

export const reserva = {
  saldo: 25.0,
  itemsReservados: [],
  fechaExpiracion: null,
  expirada: false
};

export const DURACION_RESERVA_MS = 15 * 60 * 1000;

export function calcularTotal() {
  const total = reserva.itemsReservados.reduce((suma, item) => {
    const alimento = menu.find((a) => a.id === item.id);
    return suma + alimento.precio * item.cantidad;
  }, 0);
  return Math.round(total * 100) / 100;
}

export function iniciarVencimientoReserva(ahora = Date.now()) {
  if (reserva.itemsReservados.length === 0 || reserva.fechaExpiracion !== null) {
    return false;
  }

  reserva.fechaExpiracion = ahora + DURACION_RESERVA_MS;
  reserva.expirada = false;
  return true;
}

export function limpiarVencimientoReserva() {
  reserva.fechaExpiracion = null;
  reserva.expirada = false;
}

export function procesarVencimientoReserva(ahora = Date.now()) {
  if (reserva.fechaExpiracion === null || ahora < reserva.fechaExpiracion) {
    return false;
  }

  for (const item of reserva.itemsReservados) {
    const alimento = menu.find((plato) => plato.id === item.id);
    if (!alimento) {
      throw new Error(`No se encontró el alimento ${item.id} al liberar la reserva`);
    }

    alimento.stock += item.cantidad;
  }

  reserva.itemsReservados = [];
  reserva.fechaExpiracion = null;
  reserva.expirada = true;
  return true;
}
