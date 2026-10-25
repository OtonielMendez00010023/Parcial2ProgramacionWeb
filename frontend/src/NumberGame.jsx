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
          <span aria-hidden="true">←</span> Cambiar ejercicio
        </button>
        <span className="game-brand"><span aria-hidden="true">♠</span> SALÓN DE LOS NÚMEROS</span>
      </div>

      <section className="number-game-card" aria-labelledby="game-title">
        <div className="game-card-heading">
          <span className="game-chip" aria-hidden="true">?</span>
          <div>
            <p className="game-eyebrow">Ejercicio 01 · Reto lógico</p>
            <h1 id="game-title">Adivina el Número</h1>
          </div>
          <span className="game-card-suit" aria-hidden="true">♦</span>
        </div>
        <p className="game-description">
          La mesa está lista. Encuentra el número secreto entre <strong>1 y 100</strong>.
        </p>

        <div className="game-table">
          <div className="game-table-stats" aria-live="polite">
            <span className="game-stat-label">Intentos realizados</span>
            <strong className="game-attempt-counter">{String(intentos).padStart(2, '0')}</strong>
            <span className="game-stat-note">Sigue las pistas para encontrarlo</span>
          </div>
          <div className="game-range" aria-label="Rango del número: 1 a 100">
            <div className="game-range-line" aria-hidden="true"><span /></div>
            <div className="game-range-labels" aria-hidden="true">
              <span>01</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>
        </div>

        <form className="game-form" onSubmit={enviarIntento}>
          <label htmlFor="guess-number">Haz tu intento</label>
          <div className="game-input-row">
            <input
              id="guess-number"
              type="number"
              min="1"
              max="100"
              step="1"
              value={numero}
              onChange={(event) => setNumero(event.target.value)}
              placeholder="Escribe un número"
              disabled={cargando || terminado}
              required
            />
            <button type="submit" disabled={cargando || terminado}>
              {cargando ? 'Consultando...' : 'Probar número'}
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
