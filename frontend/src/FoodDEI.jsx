
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

function FoodDEI({ onBack }) {
  const [menu, setMenu] = useState([])
  const [reserva, setReserva] = useState({
    saldo: 25,
    itemsReservados: [],
    total: 0,
    confirmada: false,
  })
  const [cargando, setCargando] = useState(true)
  const [operacionPendiente, setOperacionPendiente] = useState(null)
  const [error, setError] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState(null)
  const [reservaExpirada, setReservaExpirada] = useState(false)
  const [segundosRestantes, setSegundosRestantes] = useState(0)
  const expiracionConsultada = useRef(false)
  const operacionEnCurso = useRef(false)

  const consultarAPI = useCallback(async (endpoint, options = {}) => {
    const respuesta = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const textoRespuesta = await respuesta.text()
    let datos = {}

    if (textoRespuesta) {
      try {
        datos = JSON.parse(textoRespuesta)
      } catch {
        if (respuesta.ok) {
          throw new Error('El backend devolvió una respuesta no válida.')
        }
      }
    }

    if (!respuesta.ok) {
      throw new Error(
        datos.message || datos.mensaje || datos.error ||
        `Error del servidor: ${respuesta.status}`
      )
    }

    return datos
  }, [])

  const cargarDatos = useCallback(async (mostrarCarga = false) => {
    if (mostrarCarga) {
      setCargando(true)
    }
    setError('')

    try {
      const [datosMenu, datosReserva] = await Promise.all([
        consultarAPI('/api/menu'),
        consultarAPI('/api/reserva'),
      ])

      const menuRecibido = Array.isArray(datosMenu)
        ? datosMenu
        : datosMenu && typeof datosMenu === 'object'
          ? datosMenu.menu || datosMenu.alimentos
          : null
      if (!Array.isArray(menuRecibido)) {
        throw new Error('El backend devolvió el menú con formato no válido.')
      }
      if (
        !datosReserva ||
        typeof datosReserva !== 'object' ||
        !Array.isArray(datosReserva.itemsReservados)
      ) {
        throw new Error('El backend devolvió una reserva con formato no válido.')
      }

      setMenu(menuRecibido)
      setReserva(datosReserva)
      const tiempoRestanteMs = Number(datosReserva.tiempoRestanteMs)
      const expiracionServidor = Date.parse(datosReserva.fechaExpiracion)
      const tieneDatosTemporizador =
        Object.hasOwn(datosReserva, 'fechaExpiracion') &&
        Object.hasOwn(datosReserva, 'tiempoRestanteMs') &&
        Object.hasOwn(datosReserva, 'expirada')
      const restanteMs = datosReserva.fechaExpiracion
        ? Number.isFinite(tiempoRestanteMs)
          ? Math.max(0, tiempoRestanteMs)
          : Number.isFinite(expiracionServidor)
            ? Math.max(0, expiracionServidor - Date.now())
            : null
        : null
      setFechaVencimiento(
        restanteMs === null ? null : Date.now() + restanteMs
      )
      setReservaExpirada(Boolean(datosReserva.expirada))
      const reservaActiva =
        datosReserva.itemsReservados.length > 0 &&
        !datosReserva.confirmada &&
        !datosReserva.expirada

      if (reservaActiva && !tieneDatosTemporizador) {
        setError(
          'El backend activo no envía los datos del temporizador. Reinicia el servidor backend para sincronizar la reserva.'
        )
      } else if (
        reservaActiva &&
        restanteMs === null
      ) {
        setError('El backend no devolvió una fecha de vencimiento válida.')
      }
    } catch (err) {
      setError(err.message || 'No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }, [consultarAPI])

  useEffect(() => {
    cargarDatos(true)
  }, [cargarDatos])

  useEffect(() => {
    if (fechaVencimiento === null || reservaExpirada) return undefined

    expiracionConsultada.current = false

    const actualizarTiempoRestante = () => {
      const segundos = Math.max(
        0,
        Math.ceil((fechaVencimiento - Date.now()) / 1000)
      )
      setSegundosRestantes(segundos)

      if (segundos === 0 && !expiracionConsultada.current) {
        expiracionConsultada.current = true
        cargarDatos()
      }
    }

    actualizarTiempoRestante()
    const intervalo = window.setInterval(actualizarTiempoRestante, 1000)

    return () => window.clearInterval(intervalo)
  }, [fechaVencimiento, reservaExpirada, cargarDatos])

  async function agregarReserva(alimentoId) {
    if (
      operacionEnCurso.current ||
      reservaExpirada ||
      (fechaVencimiento !== null && segundosRestantes === 0)
    ) return

    operacionEnCurso.current = true
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
      operacionEnCurso.current = false
      setOperacionPendiente(null)
    }
  }

  async function actualizarPorciones(alimentoId, cantidad) {
    if (
      operacionEnCurso.current ||
      reservaExpirada ||
      (fechaVencimiento !== null && segundosRestantes === 0)
    ) return

    operacionEnCurso.current = true
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
      operacionEnCurso.current = false
      setOperacionPendiente(null)
    }
  }

  async function eliminarReserva(alimentoId) {
    if (
      operacionEnCurso.current ||
      reservaExpirada ||
      (fechaVencimiento !== null && segundosRestantes === 0)
    ) return

    operacionEnCurso.current = true
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
      operacionEnCurso.current = false
      setOperacionPendiente(null)
    }
  }

  async function confirmarReserva() {
    if (
      operacionEnCurso.current ||
      !hayPlatosReservados ||
      reservaExpirada ||
      vencimientoEnVerificacion ||
      reserva.confirmada
    ) return

    operacionEnCurso.current = true
    setOperacionPendiente({ tipo: 'confirmar' })
    setError('')

    try {
      await consultarAPI('/api/reserva/confirmar', { method: 'POST' })
      await cargarDatos()
    } catch (err) {
      setError(err.message || 'No se pudo confirmar la reserva.')
    } finally {
      operacionEnCurso.current = false
      setOperacionPendiente(null)
    }
  }

  function iniciarNuevaReserva() {
    setReservaExpirada(false)
    setError('')
  }

  const hayOperacionPendiente = operacionPendiente !== null
  const hayPlatosReservados = reserva.itemsReservados?.length > 0
  const vencimientoEnVerificacion =
    fechaVencimiento !== null && segundosRestantes === 0 && !reservaExpirada
  const tiempoFormateado = `${String(Math.floor(segundosRestantes / 60)).padStart(2, '0')}:${String(segundosRestantes % 60).padStart(2, '0')}`

  return (
    <Container className="food-app py-4">
      <div className="d-flex justify-content-end mb-3">
        <Button color="success" outline onClick={onBack}>
          Cambiar ejercicio
        </Button>
      </div>
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
                  Number(reserva.saldo ?? 0) -
                    (reserva.confirmada ? 0 : Number(reserva.total ?? 0))
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
            <span>
              {segundosRestantes === 0
                ? 'Verificando el estado de la reserva'
                : 'Tiempo para completar la reserva'}
            </span>
            <strong className="temporizador-valor">{tiempoFormateado}</strong>
            {segundosRestantes === 0 && (
              <Button
                color="light"
                size="sm"
                disabled={cargando}
                onClick={cargarDatos}
              >
                {cargando ? <Spinner size="sm" /> : 'Reintentar'}
              </Button>
            )}
          </div>
        )}
      </Alert>

      {reservaExpirada && (
        <Alert color="warning" className="aviso-vencimiento">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
            <span>La reserva venció y el backend liberó el stock.</span>
            <Button color="warning" onClick={iniciarNuevaReserva}>
              Iniciar nueva reserva
            </Button>
          </div>
        </Alert>
      )}

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
            <Alert color={error ? 'warning' : 'info'}>
              {error
                ? 'No se pudo cargar el menú desde el servidor.'
                : 'No hay platos disponibles para mostrar.'}
              {error && (
                <div className="mt-3">
                  <Button
                    color="warning"
                    outline
                    disabled={cargando}
                    onClick={() => cargarDatos(true)}
                  >
                    {cargando ? <Spinner size="sm" /> : 'Reintentar carga'}
                  </Button>
                </div>
              )}
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
                            disabled={sinStock || hayOperacionPendiente || reservaExpirada || reserva.confirmada || vencimientoEnVerificacion}
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
                              disabled={item.cantidad <= 1 || hayOperacionPendiente || reservaExpirada || reserva.confirmada || vencimientoEnVerificacion}
                              onClick={() => actualizarPorciones(item.id, item.cantidad - 1)}
                            >
                              −
                            </Button>
                            <Button
                              color="secondary"
                              outline
                              aria-label={`Aumentar porciones de ${plato?.nombre ?? `plato ${item.id}`}`}
                              disabled={sinStock || hayOperacionPendiente || reservaExpirada || reserva.confirmada || vencimientoEnVerificacion}
                              onClick={() => actualizarPorciones(item.id, item.cantidad + 1)}
                            >
                              +
                            </Button>
                          </ButtonGroup>
                          <Button
                            color="danger"
                            outline
                            size="sm"
                            disabled={hayOperacionPendiente || reservaExpirada || reserva.confirmada || vencimientoEnVerificacion}
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
              {reserva.confirmada ? (
                <Alert color="success" className="mt-3 mb-0">
                  Reserva confirmada correctamente.
                </Alert>
              ) : hayPlatosReservados && !reservaExpirada && (
                <div className="reserva-confirmacion mt-3">
                  <Button
                    color="success"
                    block
                    disabled={hayOperacionPendiente || vencimientoEnVerificacion}
                    onClick={confirmarReserva}
                  >
                    {operacionPendiente?.tipo === 'confirmar' ? (
                      <>
                        <Spinner size="sm" /> Confirmando...
                      </>
                    ) : (
                      'Confirmar mi reserva'
                    )}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default FoodDEI
