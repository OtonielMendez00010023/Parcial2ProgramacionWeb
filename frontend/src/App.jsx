import { useState } from 'react'
import FoodDEI from './FoodDEI.jsx'
import NumberGame from './NumberGame.jsx'
import './AppShell.css'

function App() {
  const [ejercicio, setEjercicio] = useState(null)

  if (ejercicio === 'food') {
    return <FoodDEI onBack={() => setEjercicio(null)} />
  }

  if (ejercicio === 'number') {
    return <NumberGame onBack={() => setEjercicio(null)} />
  }

  return (
    <main className="exercise-home">
      <div className="exercise-home-content">
        <p className="exercise-eyebrow">Parcial de Programación Web</p>
        <h1>Selecciona un ejercicio</h1>
        <p className="exercise-intro">
          Elige qué aplicación quieres abrir.
        </p>
        <div className="exercise-options">
          <button
            className="exercise-card exercise-card-food"
            onClick={() => setEjercicio('food')}
          >
            <span className="exercise-card-icon" aria-hidden="true">F</span>
            <span className="exercise-card-copy">
              <strong>Food DEI</strong>
              <span>Explora el menú y administra tu reserva.</span>
            </span>
            <span className="exercise-card-arrow" aria-hidden="true">→</span>
          </button>
          <button
            className="exercise-card exercise-card-number"
            onClick={() => setEjercicio('number')}
          >
            <span className="exercise-card-icon" aria-hidden="true">?</span>
            <span className="exercise-card-copy">
              <strong>Adivina el Número</strong>
              <span>Intenta descubrir el número secreto del 1 al 100.</span>
            </span>
            <span className="exercise-card-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </main>
  )
}

export default App
