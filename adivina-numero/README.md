# Ejercicio 1 - Adivina el numero

Backend en Express. El servidor genera un número secreto entre 1 y 100 al iniciar y guarda el estado en memoria.

## Cómo ejecutarlo
1. Abre una terminal y ejecuta `cd adivina-numero`
2. Ejecuta `npm install`
3. Ejecuta `npm start`
4. El servidor queda en `http://localhost:4000`

## Endpoints
- `POST /guess` recibe { "numero": 50 } y responde { "resultado": "mayor" | "menor" | "correcto" }.
  - `mayor`: el número oculto es mayor que el intento.
  - `menor`: el número oculto es menor que el intento.
- `POST /reset` genera un nuevo número secreto. Responde { "mensaje": "Nuevo número generado" }.

## Errores
- `400` { "mensaje": "Ingresa un número entero entre 1 y 100" }
