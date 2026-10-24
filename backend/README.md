# Backend - Food DEI

API en Express con el menú y la reserva guardados en memoria.

## Cómo ejecutarlo
1. cd backend
2. npm install
3. npm start

El servidor queda en http://localhost:3000

## Endpoints
- GET /api/menu: lista de platos con precio y stock.
- GET /api/reserva: saldo, platos reservados y total.
- POST /api/reserva/agregar: agrega un plato. Body: { "alimentoId": 101, "cantidad": 1 }

## Errores
Los errores llegan como { "mensaje": "..." }:
- 400 "Stock insuficiente"
- 400 "Saldo insuficiente para esta cantidad"
- 400 "La cantidad debe ser un número entero mayor a 0"
- 404 "Alimento no encontrado"