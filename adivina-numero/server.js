import express from "express";
import cors from "cors";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const generarNumero = () => Math.floor(Math.random() * 100) + 1;

let numeroSecreto = generarNumero();

app.post("/guess", (req, res) => {
  const { numero } = req.body ?? {};

  if (!Number.isInteger(numero) || numero < 1 || numero > 100) {
    return res.status(400).json({ mensaje: "Ingresa un número entero entre 1 y 100" });
  }

  let resultado;
  if (numeroSecreto > numero) {
    resultado = "mayor";
  } else if (numeroSecreto < numero) {
    resultado = "menor";
  } else {
    resultado = "correcto";
  }

  res.json({ resultado });
});

app.post("/reset", (req, res) => {
  numeroSecreto = generarNumero();
  res.json({ mensaje: "Nuevo número generado" });
});

app.listen(PORT, () => {
  console.log(`Adivina el Número corriendo en http://localhost:${PORT}`);
});
