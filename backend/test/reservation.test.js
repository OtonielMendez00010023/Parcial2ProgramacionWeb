import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { app } from "../server.js";
import { DURACION_RESERVA_MS, menu, reserva } from "../data.js";

test("reservation API supports menu, cart operations, validation, and expiry", async () => {
  const initialStocks = new Map(menu.map((item) => [item.id, item.stock]));
  const server = app.listen(0);

  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(path, method = "GET", body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    return {
      status: response.status,
      body: await response.json()
    };
  }

  try {
    reserva.itemsReservados = [];
    reserva.fechaExpiracion = null;
    reserva.expirada = false;
    for (const item of menu) {
      item.stock = initialStocks.get(item.id);
    }

    const menuResponse = await request("/api/menu");
    assert.equal(menuResponse.status, 200);
    assert.deepEqual(menuResponse.body, menu);

    const initialReservation = await request("/api/reserva");
    assert.equal(initialReservation.status, 200);
    assert.equal(initialReservation.body.saldo, 25);
    assert.deepEqual(initialReservation.body.itemsReservados, []);
    assert.equal(initialReservation.body.total, 0);
    assert.equal(initialReservation.body.fechaExpiracion, null);
    assert.equal(initialReservation.body.tiempoRestanteMs, 0);
    assert.equal(initialReservation.body.expirada, false);

    const invalidQuantity = await request("/api/reserva/agregar", "POST", {
      alimentoId: 101,
      cantidad: 0
    });
    assert.equal(invalidQuantity.status, 400);

    const unavailableDish = await request("/api/reserva/agregar", "POST", {
      alimentoId: 106,
      cantidad: 1
    });
    assert.equal(unavailableDish.status, 400);
    assert.equal(unavailableDish.body.mensaje, "Stock insuficiente");

    const unknownDish = await request("/api/reserva/agregar", "POST", {
      alimentoId: 999,
      cantidad: 1
    });
    assert.equal(unknownDish.status, 404);
    assert.equal(unknownDish.body.mensaje, "Alimento no encontrado");

    const firstAddition = await request("/api/reserva/agregar", "POST", {
      alimentoId: 101,
      cantidad: 1
    });
    assert.equal(firstAddition.status, 201);
    assert.equal(firstAddition.body.total, 5.5);
    assert.equal(firstAddition.body.itemsReservados[0].cantidad, 1);
    assert.ok(firstAddition.body.fechaExpiracion);
    assert.ok(firstAddition.body.tiempoRestanteMs > DURACION_RESERVA_MS - 1000);

    const expiration = firstAddition.body.fechaExpiracion;
    const secondAddition = await request("/api/reserva/agregar", "POST", {
      alimentoId: 102,
      cantidad: 1
    });
    assert.equal(secondAddition.status, 201);
    assert.equal(secondAddition.body.total, 10.25);
    assert.equal(secondAddition.body.fechaExpiracion, expiration);

    const tooExpensive = await request(
      "/api/reserva/actualizar-porciones/101",
      "PUT",
      { cantidad: 5 }
    );
    assert.equal(tooExpensive.status, 400);
    assert.equal(
      tooExpensive.body.mensaje,
      "Saldo insuficiente para esta cantidad"
    );
    assert.equal(
      (await request("/api/menu")).body.find((item) => item.id === 101).stock,
      initialStocks.get(101) - 1
    );

    const updatedPortions = await request(
      "/api/reserva/actualizar-porciones/101",
      "PUT",
      { cantidad: 2 }
    );
    assert.equal(updatedPortions.status, 200);
    assert.equal(updatedPortions.body.total, 15.75);
    assert.equal(updatedPortions.body.fechaExpiracion, expiration);
    assert.equal(
      (await request("/api/menu")).body.find((item) => item.id === 101).stock,
      initialStocks.get(101) - 2
    );

    const reducedPortions = await request(
      "/api/reserva/actualizar-porciones/101",
      "PUT",
      { cantidad: 1 }
    );
    assert.equal(reducedPortions.status, 200);
    assert.equal(reducedPortions.body.total, 10.25);
    assert.equal(
      (await request("/api/menu")).body.find((item) => item.id === 101).stock,
      initialStocks.get(101) - 1
    );

    const removedDish = await request("/api/reserva/eliminar/102", "DELETE");
    assert.equal(removedDish.status, 200);
    assert.equal(removedDish.body.total, 5.5);
    assert.equal(
      (await request("/api/menu")).body.find((item) => item.id === 102).stock,
      initialStocks.get(102)
    );

    reserva.fechaExpiracion = Date.now() - 1;
    const expiredReservation = await request("/api/reserva");
    assert.equal(expiredReservation.status, 200);
    assert.deepEqual(expiredReservation.body.itemsReservados, []);
    assert.equal(expiredReservation.body.total, 0);
    assert.equal(expiredReservation.body.fechaExpiracion, null);
    assert.equal(expiredReservation.body.tiempoRestanteMs, 0);
    assert.equal(expiredReservation.body.expirada, true);
    assert.equal(
      (await request("/api/menu")).body.find((item) => item.id === 101).stock,
      initialStocks.get(101)
    );

    const nextReservation = await request("/api/reserva/agregar", "POST", {
      alimentoId: 101,
      cantidad: 1
    });
    assert.equal(nextReservation.status, 201);
    assert.equal(nextReservation.body.expirada, false);

    const clearedReservation = await request(
      "/api/reserva/eliminar/101",
      "DELETE"
    );
    assert.equal(clearedReservation.status, 200);
    assert.equal(clearedReservation.body.fechaExpiracion, null);
    assert.equal(clearedReservation.body.expirada, false);
  } finally {
    reserva.itemsReservados = [];
    reserva.fechaExpiracion = null;
    reserva.expirada = false;
    for (const item of menu) {
      item.stock = initialStocks.get(item.id);
    }
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
