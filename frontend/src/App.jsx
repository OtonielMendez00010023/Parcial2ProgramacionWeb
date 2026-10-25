
import { useState, useEffect } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  Col,
  Container,
  Row,
  Spinner,
  UncontrolledAlert,
} from 'reactstrap'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [menu, setMenu] = useState([])
  const [reserva, setReserva] = useState({
    saldo: 25,
    total: 0,
  })
  const [cargando, setCargando] = useState(true)
  const [agregando, setAgregando] = useState(null)
  const [error, setError] = useState('')

  // Solicitar datos al backend
  async function consultarAPI(endpoint, options = {}) {
    const respuesta = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const datos = await respuesta.json().catch(() => ({}))

    if (!respuesta.ok) {
      throw new Error(
        datos.message || datos.mensaje || datos.error ||
        `Error del servidor: ${respuesta.status}`
      )
    }

    return datos
  }

  // Cargar menú y reserva
  async function cargarDatos() {
    setCargando(true)
    setError('')

    try {
      const [datosMenu, datosReserva] = await Promise.all([
        consultarAPI('/api/menu'),
        consultarAPI('/api/reserva'),
      ])

      setMenu(
        Array.isArray(datosMenu)
          ? datosMenu
          : datosMenu.menu || datosMenu.alimentos || []
      )

      setReserva(datosReserva)
    } catch (err) {
      setError(err.message || 'No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Añadir una porción a la reserva
  async function agregarReserva(alimentoId) {
    setAgregando(alimentoId)
    setError('')

    try {
      await consultarAPI('/api/reserva/agregar', {
        method: 'POST',
        body: JSON.stringify({
          alimentoId,
          cantidad: 1,
        }),
      })

      await cargarDatos()
    } catch (err) {
      setError(err.message || 'No se pudo añadir el plato.')
    } finally {
      setAgregando(null)
    }
  }

  return (
    <Container className="food-app py-4">
      {/* Panel superior */}
      <Alert color="success" className="panel-superior">
        <div>
          <h1 className="h3 mb-1">Food DEI</h1>
          <p className="mb-3">Tu menú del día</p>
        </div>

        <Row className="align-items-center">
          <Col xs="6">
            <div>Saldo disponible</div>
        <h3>
  ${Math.max(
    0,
    Number(reserva.saldo ?? 0) - Number(reserva.total ?? 0)
  ).toFixed(2)}
</h3>
          </Col>

          <Col xs="6" className="text-end">
            <div>Total de tu reserva</div>
            <h3>
              <Badge color="dark" pill>
                ${Number(reserva.total ?? 0).toFixed(2)}
              </Badge>
            </h3>
          </Col>
        </Row>
      </Alert>

      {/* Mensajes del backend */}
      {error && (
        <UncontrolledAlert
          key={error}
          color="warning"
        >
          {error}
        </UncontrolledAlert>
      )}

      {/* Menú del día */}
      <div className="mb-4">
        <h2 className="h4">Menú del día</h2>
        <p className="text-muted">
          Selecciona los platos que deseas reservar.
        </p>
      </div>

      {cargando ? (
        <div className="text-center py-5">
          <Spinner color="success" />
          <p className="mt-2">Cargando menú...</p>
        </div>
      ) : menu.length === 0 ? (
        <Alert color="info">
          No hay platos disponibles para mostrar.
        </Alert>
      ) : (
        <Row>
          {menu.map((plato) => {
            const sinStock = Number(plato.stock) <= 0

            return (
              <Col xs="12" md="6" lg="4" key={plato.id}>
                <Card className="mb-4 plato-card h-100">
                  <CardBody className="d-flex flex-column">
                    <CardTitle tag="h3" className="h5">
                      {plato.nombre}
                    </CardTitle>

                    <p className="text-muted mb-2">
                      Categoría: {plato.categoria}
                    </p>

                    <div className="mb-3">
                      <Badge color="success">
                        ${Number(plato.precio).toFixed(2)}
                      </Badge>
                    </div>

                    <p>
                      Stock disponible:{' '}
                      <strong>{plato.stock}</strong>
                    </p>

                    <div className="mt-auto">
                      <Button
                        color={sinStock ? 'secondary' : 'success'}
                        block
                        disabled={sinStock || agregando !== null}
                        onClick={() => agregarReserva(plato.id)}
                      >
                        {agregando === plato.id ? (
                          <>
                            <Spinner size="sm" /> Añadiendo...
                          </>
                        ) : sinStock ? (
                          'Agotado'
                        ) : (
                          'Añadir a la Reserva'
                        )}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </Container>
  )
}

export default App
