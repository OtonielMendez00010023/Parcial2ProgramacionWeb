# Frontend - Ejercicios de Programación Web

Aplicación web desarrollada con React, Vite y Reactstrap. La pantalla inicial permite elegir entre Food DEI y Adivina el Número.

## Cómo ejecutarlo

1. Abre una terminal y ejecuta `cd frontend`.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev`.
4. Abre la dirección que muestra Vite, normalmente `http://localhost:5173`.
5. Asegúrate de que los dos backends estén ejecutándose:
   - Food DEI en `http://localhost:3000`.
   - Adivina el Número en `http://localhost:4000`.

## Ejercicios incluidos

- Pantalla de inicio para seleccionar un ejercicio y regresar al selector.
- Food DEI: menú, reserva, temporizador y confirmación conectados al backend de puerto `3000`.
- Adivina el Número: intentos, pistas, contador, validación y reinicio conectados al backend de puerto `4000`.
- La URL del backend de Adivina el Número se puede cambiar con `VITE_ADIVINA_API_URL`.

## Funcionalidades

- Panel superior: muestra el saldo disponible y el total de la reserva.
- Menú del día: muestra los platos disponibles con su nombre, categoría, precio y stock.
- Añadir a la reserva: permite agregar una porción de un plato mediante el endpoint del backend.
- Actualización de datos: consulta nuevamente el menú y la reserva después de agregar un plato para actualizar el stock, el saldo y el total.
- Estado de carga: muestra un indicador mientras se cargan los datos del menú.
- Manejo de errores: muestra los mensajes del backend mediante `UncontrolledAlert` de Reactstrap con color `warning`.

## Endpoints utilizados

- `GET /api/menu`: obtiene la lista de platos con sus precios y stock.
- `GET /api/reserva`: obtiene el saldo, los platos reservados y el total.
- `POST /api/reserva/agregar`: agrega un plato a la reserva. Recibe `alimentoId` y `cantidad` en el cuerpo de la petición.

## Tecnologías utilizadas

- React
- Vite
- JavaScript
- Reactstrap
- Bootstrap
- Fetch API
- Hooks de React: `useState` y `useEffect`

## Manejo de errores

Los errores enviados por el backend se capturan mediante `try/catch` y se muestran en una alerta amarilla.

Ejemplos de mensajes:

- `Stock insuficiente`
- `Saldo insuficiente para esta cantidad`
- `Alimento no encontrado`

## Ejecución del proyecto completo

Para utilizar la aplicación, inicia cada proyecto en una terminal independiente:

1. Backend de Food DEI: `cd backend`, `npm install` (la primera vez) y `npm start`.
2. Backend de Adivina el Número: `cd adivina-numero`, `npm install` (la primera vez) y `npm start`.
3. Frontend: `cd frontend`, `npm install` (la primera vez) y `npm run dev`.

Food DEI utiliza el puerto `3000`, Adivina el Número el puerto `4000` y el frontend el puerto que indique Vite.
