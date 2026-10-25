import { useState } from 'react'
import './NumberGame.css'

const API_URL = import.meta.env.VITE_ADIVINA_API_URL || 'http://localhost:4000'

async function consultarJuego(endpoint, body) {
  const respuesta = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  const texto = await respuesta.text()
  let datos = {}

  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      if (respuesta.ok) {
        throw new Error('El backend del juego devolvió una respuesta no válida.')
      }
    }
  }

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje || datos.message || `Error del servidor: ${respuesta.status}`
    )
  }

  return datos
}

function NumberGame({ onBack }) {
  const [numero, setNumero] = useState('')
  const [intentos, setIntentos] = useState(0)
  const [resultado, setResultado] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [terminado, setTerminado] = useState(false)

  async function enviarIntento(event) {
    event.preventDefault()
    const valor = Number(numero)

    if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
      setError('Ingresa un número entero entre 1 y 100.')
      setResultado('')
      return
    }

    setCargando(true)
    setError('')
    setResultado('')

    try {
      const datos = await consultarJuego('/guess', { numero: valor })
      if (!['mayor', 'menor', 'correcto'].includes(datos.resultado)) {
        throw new Error('El backend devolvió un resultado no válido.')
      }

      setIntentos((actuales) => actuales + 1)
      setResultado(datos.resultado)
      setTerminado(datos.resultado === 'correcto')
    } catch (err) {
      setError(err.message || 'No se pudo enviar el intento al backend.')
    } finally {
      setCargando(false)
    }
  }

  async function iniciarDeNuevo() {
    setCargando(true)
    setError('')

    try {
      const datos = await consultarJuego('/reset')
      if (typeof datos.mensaje !== 'string' || datos.mensaje.length === 0) {
        throw new Error('El backend no confirmó el inicio de una nueva partida.')
      }

      setNumero('')
      setIntentos(0)
      setResultado('')
      setTerminado(false)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar una nueva partida.')
    } finally {
      setCargando(false)
    }
  }

  const mensajeResultado = {
    mayor: 'El número secreto es mayor. ¡Prueba otra vez!',
    menor: 'El número secreto es menor. ¡Prueba otra vez!',
    correcto: '¡Correcto! Adivinaste el número.',
  }[resultado]

  return (
    <main className="number-game-page">
      <div className="number-game-topbar">
        <button className="game-back-button" onClick={onBack}>
          ← Cambiar ejercicio
        </button>
        <span>Ejercicio 1</span>
      </div>

      <section className="number-game-card" aria-labelledby="game-title">
        <p className="game-eyebrow">Desafío</p>
        <h1 id="game-title">Adivina el Número</h1>
        <p className="game-description">
          Estoy pensando en un número del 1 al 100. ¿Puedes descubrirlo?
        </p>

        <div className="game-attempt-counter" aria-live="polite">
          Intentos <strong>{intentos}</strong>
        </div>

        <form className="game-form" onSubmit={enviarIntento}>
          <label htmlFor="guess-number">Tu número</label>
          <div className="game-input-row">
            <input
              id="guess-number"
              type="number"
              min="1"
              max="100"
              step="1"
              value={numero}
              onChange={(event) => setNumero(event.target.value)}
              placeholder="1 - 100"
              disabled={cargando || terminado}
              required
            />
            <button type="submit" disabled={cargando || terminado}>
              {cargando ? 'Enviando...' : 'Intentar'}
            </button>
          </div>
        </form>

        {error && <p className="game-message game-message-error" role="alert">{error}</p>}
        {mensajeResultado && (
          <p
            className={`game-message ${terminado ? 'game-message-success' : 'game-message-hint'}`}
            role="status"
            aria-live="polite"
          >
            {mensajeResultado}
          </p>
        )}

        {terminado && (
          <button
            className="game-reset-button"
            onClick={iniciarDeNuevo}
            disabled={cargando}
          >
            {cargando ? 'Iniciando...' : 'Jugar de nuevo'}
          </button>
        )}
      </section>
    </main>
  )
}

export default NumberGame
