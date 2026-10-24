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
  itemsReservados: []
};

export function calcularTotal() {
  const total = reserva.itemsReservados.reduce((suma, item) => {
    const alimento = menu.find((a) => a.id === item.id);
    return suma + alimento.precio * item.cantidad;
  }, 0);
  return Math.round(total * 100) / 100;
}