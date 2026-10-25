
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardTitle,
  Col,
  Container,
  ListGroup,
  ListGroupItem,
  Row,
  Spinner,
  UncontrolledAlert,
} from 'reactstrap'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const DURACION_RESERVA_MS = 15 * 60 * 1000
const CLAVE_VENCIMIENTO_RESERVA = 'food-dei-reserva-vencimiento'

function obtenerVencimientoGuardado() {
  const valorGuardado = localStorage.getItem(CLAVE_VENCIMIENTO_RESERVA)
  if (!valorGuardado) return null

  const vencimiento = Number(valorGuardado)
  if (!Number.isFinite(vencimiento)) {
    localStorage.removeItem(CLAVE_VENCIMIENTO_RESERVA)
    return null
  }

  return vencimiento
}

function App() {
  const [menu, setMenu] = useState([])
  const [reserva, setReserva] = useState({
    saldo: 25,
    itemsReservados: [],
    total: 0,
  })
  const [cargando, setCargando] = useState(true)
  const [operacionPendiente, setOperacionPendiente] = useState(null)
  const [error, setError] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState(obtenerVencimientoGuardado)
  const [reservaExpirada, setReservaExpirada] = useState(() => {
    const vencimiento = obtenerVencimientoGuardado()
    return vencimiento !== null && vencimiento <= Date.now()
  })
  const intentoExpiracionAutomatico = useRef(false)
  const [segundosRestantes, setSegundosRestantes] = useState(() => {
    const vencimiento = obtenerVencimientoGuardado()
    return vencimiento === null
      ? 0
      : Math.max(0, Math.ceil((vencimiento - Date.now()) / 1000))
  })

  // Solicitar datos al backend
  const consultarAPI = useCallback(async (endpoint, options = {}) => {
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
  }, [])

  // Cargar menú y reserva
  const cargarDatos = useCallback(async () => {
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

      const vencimientoGuardado = obtenerVencimientoGuardado()
      if (datosReserva.itemsReservados?.length && vencimientoGuardado === null) {
        const nuevoVencimiento = Date.now() + DURACION_RESERVA_MS
        localStorage.setItem(CLAVE_VENCIMIENTO_RESERVA, String(nuevoVencimiento))
        setFechaVencimiento(nuevoVencimiento)
        setSegundosRestantes(DURACION_RESERVA_MS / 1000)
      } else if (
        !datosReserva.itemsReservados?.length &&
        vencimientoGuardado !== null &&
        vencimientoGuardado > Date.now()
      ) {
        localStorage.removeItem(CLAVE_VENCIMIENTO_RESERVA)
        setFechaVencimiento(null)
        setSegundosRestantes(0)
      }
    } catch (err) {
      setError(err.message || 'No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }, [consultarAPI])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  useEffect(() => {
    if (fechaVencimiento === null || reservaExpirada) return undefined

    const actualizarTiempoRestante = () => {
      const segundos = Math.max(
        0,
        Math.ceil((fechaVencimiento - Date.now()) / 1000)
      )
      setSegundosRestantes(segundos)

      if (segundos === 0) {
        setReservaExpirada(true)
      }
    }

    const intervalo = window.setInterval(actualizarTiempoRestante, 1000)

    return () => window.clearInterval(intervalo)
  }, [fechaVencimiento, reservaExpirada])

  // Añadir una porción a la reserva
  async function agregarReserva(alimentoId) {
    if (operacionPendiente) return

    setOperacionPendiente({ tipo: 'agregar', alimentoId })
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
      setOperacionPendiente(null)
    }
  }

  async function actualizarPorciones(alimentoId, cantidad) {
    if (operacionPendiente) return

    setOperacionPendiente({ tipo: 'actualizar', alimentoId })
    setError('')

    try {
      await consultarAPI(`/api/reserva/actualizar-porciones/${alimentoId}`, {
        method: 'PUT',
        body: JSON.stringify({ cantidad }),
      })

      await cargarDatos()
    } catch (err) {
      setError(err.message || 'No se pudieron actualizar las porciones.')
    } finally {
      setOperacionPendiente(null)
    }
  }

  async function eliminarReserva(alimentoId) {
    if (operacionPendiente) return

    setOperacionPendiente({ tipo: 'eliminar', alimentoId })
    setError('')

    try {
      await consultarAPI(`/api/reserva/eliminar/${alimentoId}`, {
        method: 'DELETE',
      })

      await cargarDatos()
    } catch (err) {
      setError(err.message || 'No se pudo quitar el plato de la reserva.')
    } finally {
      setOperacionPendiente(null)
    }
  }

  const vaciarReservaVencida = useCallback(async () => {
    if (operacionPendiente) return

    setOperacionPendiente({ tipo: 'vencimiento' })
    setError('')

    try {
      const datosReserva = await consultarAPI('/api/reserva')
      await Promise.all(
        (datosReserva.itemsReservados ?? []).map((item) =>
          consultarAPI(`/api/reserva/eliminar/${item.id}`, {
            method: 'DELETE',
          })
        )
      )

      const [datosMenu, reservaActualizada] = await Promise.all([
        consultarAPI('/api/menu'),
        consultarAPI('/api/reserva'),
      ])

      setMenu(
        Array.isArray(datosMenu)
          ? datosMenu
          : datosMenu.menu || datosMenu.alimentos || []
      )
      setReserva(reservaActualizada)
    } catch (err) {
      setError(
        `La reserva venció, pero no se pudo liberar todo el stock. ${err.message || ''}`.trim()
      )
    } finally {
      setOperacionPendiente(null)
    }
  }, [consultarAPI, operacionPendiente])

  useEffect(() => {
    if (
      reservaExpirada &&
      !cargando &&
      reserva.itemsReservados?.length > 0 &&
      operacionPendiente === null &&
      !intentoExpiracionAutomatico.current
    ) {
      intentoExpiracionAutomatico.current = true
      const reintento = window.setTimeout(vaciarReservaVencida, 0)
      return () => window.clearTimeout(reintento)
    }
    return undefined
  }, [
    reservaExpirada,
    cargando,
    reserva.itemsReservados,
    operacionPendiente,
    vaciarReservaVencida,
  ])

  function iniciarNuevaReserva() {
    localStorage.removeItem(CLAVE_VENCIMIENTO_RESERVA)
    setFechaVencimiento(null)
    setSegundosRestantes(0)
    setReservaExpirada(false)
    intentoExpiracionAutomatico.current = false
    setError('')
  }

  const hayOperacionPendiente = operacionPendiente !== null
  const hayPlatosReservados = reserva.itemsReservados?.length > 0
  const tiempoFormateado = `${String(Math.floor(segundosRestantes / 60)).padStart(2, '0')}:${String(segundosRestantes % 60).padStart(2, '0')}`

  return (
    <Container className="food-app py-4">
      <Alert color="success" className="panel-superior mb-4">
        <div className="marca-food">
          <span className="marca-icono" aria-hidden="true">F</span>
          <div>
            <p className="marca-etiqueta">Food DEI · Comedor</p>
            <h1 className="marca-titulo">Tu menú del día</h1>
            <p className="marca-subtitulo">Elige tus platos y arma tu reserva.</p>
          </div>
        </div>

        <Row className="resumen-usuario">
          <Col xs="6">
            <div className="resumen-metrica">
              <span className="resumen-etiqueta">Saldo disponible</span>
              <strong className="resumen-valor">
                ${Math.max(
                  0,
                  Number(reserva.saldo ?? 0) - Number(reserva.total ?? 0)
                ).toFixed(2)}
              </strong>
            </div>
          </Col>

          <Col xs="6">
            <div className="resumen-metrica resumen-metrica-total">
              <span className="resumen-etiqueta">Total de tu reserva</span>
              <strong className="resumen-valor">
                ${Number(reserva.total ?? 0).toFixed(2)}
              </strong>
            </div>
          </Col>
        </Row>
        {fechaVencimiento !== null && !reservaExpirada && hayPlatosReservados && (
          <div className="reserva-temporizador mt-3" role="timer" aria-live="off">
            <span>Tiempo para completar la reserva</span>
            <strong className="temporizador-valor">{tiempoFormateado}</strong>
          </div>
        )}
      </Alert>

      {reservaExpirada && (
        <Alert color="warning" className="aviso-vencimiento">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
            <span>
              {hayPlatosReservados
                ? operacionPendiente?.tipo === 'vencimiento'
                  ? 'La reserva venció. Liberando el stock...'
                  : 'La reserva venció. Se liberará el stock de los platos pendientes.'
                : 'El tiempo de tu reserva terminó.'}
            </span>
            {hayPlatosReservados ? (
              <Button
                color="warning"
                outline
                disabled={hayOperacionPendiente}
                onClick={vaciarReservaVencida}
              >
                {operacionPendiente?.tipo === 'vencimiento' ? (
                  <>
                    <Spinner size="sm" /> Liberando...
                  </>
                ) : (
                  'Reintentar liberar reserva'
                )}
              </Button>
            ) : (
              <Button color="warning" onClick={iniciarNuevaReserva}>
                Iniciar nueva reserva
              </Button>
            )}
          </div>
        </Alert>
      )}

      {/* Mensajes del backend */}
      {error && (
        <UncontrolledAlert
          key={error}
          color="warning"
          className="mensaje-error"
        >
          {error}
        </UncontrolledAlert>
      )}

      <Row className="contenido-principal">
        <Col xs="12" lg="8">
          <div className="encabezado-menu">
            <p className="seccion-etiqueta">Hecho para hoy</p>
            <h2>Explora el menú</h2>
            <p className="text-muted">
              Selecciona los platos que quieres disfrutar.
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
                  <Col xs="12" md="6" key={plato.id}>
                    <Card className="mb-4 plato-card h-100">
                      <CardBody className="d-flex flex-column">
                        <span className="plato-categoria">{plato.categoria}</span>
                        <CardTitle tag="h3" className="plato-titulo">
                          {plato.nombre}
                        </CardTitle>

                        <div className="plato-detalles">
                          <strong className="plato-precio">
                            ${Number(plato.precio).toFixed(2)}
                          </strong>
                          <span className="plato-stock">
                            Stock <strong>{plato.stock}</strong>
                          </span>
                        </div>

                        <div className="mt-auto">
                          <Button
                            color={sinStock ? 'secondary' : 'success'}
                            block
                            disabled={sinStock || hayOperacionPendiente || reservaExpirada}
                            onClick={() => agregarReserva(plato.id)}
                          >
                            {operacionPendiente?.tipo === 'agregar' &&
                            operacionPendiente.alimentoId === plato.id ? (
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
        </Col>

        <Col xs="12" lg="4">
          <Card className="reserva-card">
            <CardBody>
              <div className="reserva-encabezado">
                <CardTitle tag="h2" className="reserva-titulo">
                  Tu reserva
                </CardTitle>
                <span className="reserva-contador">
                  {reserva.itemsReservados?.length ?? 0}
                </span>
              </div>

              {reserva.itemsReservados?.length ? (
                <ListGroup flush className="reserva-lista">
                  {reserva.itemsReservados.map((item) => {
                    const plato = menu.find((alimento) => alimento.id === item.id)
                    const subtotal = plato
                      ? Number(plato.precio) * Number(item.cantidad)
                      : null
                    const sinStock = !plato || Number(plato.stock) <= 0
                    const estaActualizando =
                      operacionPendiente?.tipo === 'actualizar' &&
                      operacionPendiente.alimentoId === item.id
                    const estaEliminando =
                      operacionPendiente?.tipo === 'eliminar' &&
                      operacionPendiente.alimentoId === item.id

                    return (
                      <ListGroupItem
                        key={item.id}
                        className="px-0 d-flex justify-content-between align-items-center gap-3"
                        aria-busy={estaActualizando || estaEliminando}
                      >
                        <div>
                          <strong className="reserva-item-nombre">
                            {plato?.nombre ?? `Plato #${item.id}`}
                          </strong>
                          <div className="reserva-item-detalle">
                            {estaEliminando ? (
                              <span role="status" aria-live="polite">
                                <Spinner size="sm" /> Quitando...
                              </span>
                            ) : estaActualizando ? (
                              <span role="status" aria-live="polite">
                                <Spinner size="sm" /> Actualizando...
                              </span>
                            ) : (
                              `Cantidad: ${item.cantidad}`
                            )}
                          </div>
                        </div>
                        <div className="reserva-item-acciones d-flex align-items-center gap-2">
                          <ButtonGroup size="sm" aria-label={`Porciones de ${plato?.nombre ?? `plato ${item.id}`}`}>
                            <Button
                              color="secondary"
                              outline
                              aria-label={`Reducir porciones de ${plato?.nombre ?? `plato ${item.id}`}`}
                              disabled={item.cantidad <= 1 || hayOperacionPendiente || reservaExpirada}
                              onClick={() => actualizarPorciones(item.id, item.cantidad - 1)}
                            >
                              −
                            </Button>
                            <Button
                              color="secondary"
                              outline
                              aria-label={`Aumentar porciones de ${plato?.nombre ?? `plato ${item.id}`}`}
                              disabled={sinStock || hayOperacionPendiente || reservaExpirada}
                              onClick={() => actualizarPorciones(item.id, item.cantidad + 1)}
                            >
                              +
                            </Button>
                          </ButtonGroup>
                          <Button
                            color="danger"
                            outline
                            size="sm"
                            disabled={hayOperacionPendiente || reservaExpirada}
                            onClick={() => eliminarReserva(item.id)}
                          >
                            {estaEliminando ? (
                              <>
                                <Spinner size="sm" /> Quitando...
                              </>
                            ) : (
                              'Quitar'
                            )}
                          </Button>
                          {subtotal !== null && (
                            <span className="reserva-item-subtotal text-nowrap">
                              ${subtotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </ListGroupItem>
                    )
                  })}
                </ListGroup>
              ) : (
                <div className="reserva-vacia">
                  <span className="reserva-vacia-icono" aria-hidden="true">+</span>
                  <p>Aún no has agregado platos.</p>
                  <small>Elige algo del menú para empezar.</small>
                </div>
              )}

              <div className="reserva-total d-flex justify-content-between">
                <strong>Total</strong>
                <strong>${Number(reserva.total ?? 0).toFixed(2)}</strong>
              </div>
              {hayPlatosReservados && !reservaExpirada && (
                <div className="reserva-confirmacion mt-3">
                  <Button color="success" block disabled>
                    Confirmar mi reserva (Pendiente de conexion con backend)
                  </Button>
                  <small className="text-muted d-block mt-2">
                    La reserva aún no se confirma; falta el endpoint de confirmación.
                  </small>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default App
