# Backend - Food DEI

API en Express con el menú y la reserva guardados en memoria.

## Cómo ejecutarlo
1. Abre una terminal y ejecuta `cd backend`
2. Ejecuta `npm install`
3. Ejecuta `npm start`
4. El servidor queda en `http://localhost:3000`

## Endpoints
- `GET /api/menu` lista de platos con precio y stock.
- `GET /api/reserva` saldo, platos reservados, total, fecha de expiración (`fechaExpiracion`), tiempo restante en milisegundos (`tiempoRestanteMs`) y estado (`expirada`).
- `POST /api/reserva/agregar` agrega un plato. Body: { "alimentoId": 101, "cantidad": 1 }
- `PUT /api/reserva/actualizar-porciones/101` actualiza la cantidad de prociones. Body { "cantidad": 3}
- `DELETE /api/reserva/eliminar/101` elimina el plato reservado segun el Id. 

La reserva vence 15 minutos después de agregar el primer plato. Agregar más platos o cambiar porciones no reinicia el tiempo. El backend libera automáticamente el stock cuando vence y expone `expirada: true` en `GET /api/reserva`. Si se quitan manualmente todos los platos antes del vencimiento, se cancela el contador.

## Errores
Los errores llegan como { "mensaje": "..." }:
- `400` Stock insuficiente
- `400` Saldo insuficiente para esta cantidad
- `400` La cantidad debe ser un número entero mayor a 0
- `404` Alimento no encontrado