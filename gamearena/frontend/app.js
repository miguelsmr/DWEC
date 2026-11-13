// GameArena — conexión de la página con el servidor (Spring Boot)
// Cada comentario <!-- VERBO /ruta --> del index.html tiene aquí su fetch().

// Dirección del servidor
const API_URL = "http://localhost:8080";

// Si estamos modificando un torneo o un jugador, aquí se guarda su id.
// Si vale null, el formulario crea uno nuevo.
let torneoEditando = null;
let jugadorEditando = null;

// Última lista de torneos y jugadores recibida (para sacar nombres por id)
let listaTorneos = [];
let listaJugadores = [];


// ===================== AVISOS Y CONEXIÓN =====================

let temporizadorAviso;

// tipo: "success" (verde), "warning" (amarillo) o "danger" (rojo)
function mostrarAviso(texto, tipo) {
    const aviso = document.getElementById("aviso");
    aviso.className = "alert alert-" + tipo;
    aviso.textContent = texto;

    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.add("d-none"), 4000);
}

// Cambia la etiqueta de arriba a la derecha
function marcarConexion(conectado) {
    const etiqueta = document.getElementById("conexion");
    if (conectado) {
        etiqueta.className = "badge bg-success";
        etiqueta.textContent = "Conectado";
    } else {
        etiqueta.className = "badge bg-danger";
        etiqueta.textContent = "Sin conexión";
    }
}

// Mensaje según el código que devuelve el servidor
function textoError(codigo) {
    if (codigo === 400) return "Error 400: los datos enviados no son válidos.";
    if (codigo === 404) return "Error 404: no existe lo que has pedido.";
    if (codigo === 500) return "Error 500: ha fallado algo en el servidor.";
    return "Error " + codigo + " en la petición.";
}


// ===================== FUNCIÓN COMÚN PARA LAS PETICIONES =====================

// Hace el fetch a la API y comprueba la respuesta.
// Devuelve los datos (JSON), true si no hay cuerpo (204) o null si algo ha ido mal.
async function peticion(ruta, metodo = "GET", datos = null) {
    const opciones = { method: metodo };

    if (datos !== null) {
        opciones.headers = { "Content-Type": "application/json" };
        opciones.body = JSON.stringify(datos);
    }

    let respuesta;
    try {
        respuesta = await fetch(API_URL + ruta, opciones);
    } catch (error) {
        // El servidor no contesta: no está arrancado o se ha caído
        marcarConexion(false);
        mostrarAviso("No se puede conectar con el servidor. ¿Está arrancado Spring Boot?", "danger");
        return null;
    }

    marcarConexion(true);

    if (!respuesta.ok) {
        mostrarAviso(textoError(respuesta.status), "danger");
        return null;
    }

    if (respuesta.status === 204) {
        return true;
    }

    return await respuesta.json();
}


// ===================== VIDEOJUEGOS =====================

// GET /videojuegos: rellena la tabla y los desplegables de videojuegos
async function cargarVideojuegos() {
    const videojuegos = await peticion("/videojuegos");
    if (videojuegos === null) return;

    let filas = "";
    for (const v of videojuegos) {
        filas += `<tr><td>${v.id}</td><td>${v.nombre}</td><td>${v.genero}</td></tr>`;
    }
    if (videojuegos.length === 0) {
        filas = `<tr><td colspan="3" class="text-muted">No hay videojuegos todavía.</td></tr>`;
    }
    document.getElementById("cuerpoVideojuegos").innerHTML = filas;

    // Opciones para el formulario de torneo y para el filtro
    let opciones = "";
    for (const v of videojuegos) {
        opciones += `<option value="${v.id}">${v.nombre}</option>`;
    }

    const selectTorneo = document.getElementById("tVideojuego");
    const elegido = selectTorneo.value;
    selectTorneo.innerHTML = `<option value="" disabled>-- elige un videojuego --</option>` + opciones;
    selectTorneo.value = elegido;

    const selectFiltro = document.getElementById("filtroVideojuegoTorneo");
    const filtrado = selectFiltro.value;
    selectFiltro.innerHTML = `<option value="">Todos</option>` + opciones;
    selectFiltro.value = filtrado;
}

// GET /videojuegos/{id}
async function buscarVideojuego() {
    const id = document.getElementById("buscarVideojuegoId").value;
    const resultado = document.getElementById("resVideojuego");

    if (id === "") {
        mostrarAviso("Escribe el ID del videojuego que quieres buscar.", "warning");
        return;
    }

    const v = await peticion("/videojuegos/" + id);
    if (v === null) {
        resultado.textContent = "";
        return;
    }
    resultado.textContent = `#${v.id} · ${v.nombre} (${v.genero})`;
}

// POST /videojuegos
async function crearVideojuego() {
    const nombre = document.getElementById("vjNombre").value.trim();
    const genero = document.getElementById("vjGenero").value.trim();

    if (nombre === "" || genero === "") {
        mostrarAviso("Rellena el nombre y el género del videojuego.", "warning");
        return;
    }

    const creado = await peticion("/videojuegos", "POST", { nombre: nombre, genero: genero });
    if (creado === null) return;

    mostrarAviso(`Videojuego "${creado.nombre}" creado con el ID ${creado.id}.`, "success");
    document.getElementById("vjNombre").value = "";
    document.getElementById("vjGenero").value = "";
    cargarVideojuegos();
}


// ===================== TORNEOS =====================

// Pinta una lista de torneos en la tabla (la usan cargar y filtrar)
function pintarTorneos(torneos) {
    let filas = "";
    for (const t of torneos) {
        filas += `<tr>
            <td>${t.id}</td>
            <td>${t.nombre}</td>
            <td>${t.fecha}</td>
            <td>${t.premio} €</td>
            <td>${t.estado}</td>
            <td>${t.videojuego.nombre}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary" onclick="verParticipantes(${t.id})">Participantes</button>
                <button class="btn btn-sm btn-warning" onclick="editarTorneo(${t.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarTorneo(${t.id})">Eliminar</button>
            </td>
        </tr>`;
    }
    if (torneos.length === 0) {
        filas = `<tr><td colspan="7" class="text-muted">No hay torneos.</td></tr>`;
    }
    document.getElementById("cuerpoTorneos").innerHTML = filas;
}

// GET /torneos: tabla y desplegable de la inscripción
async function cargarTorneos() {
    const torneos = await peticion("/torneos");
    if (torneos === null) return;

    listaTorneos = torneos;
    pintarTorneos(torneos);

    let opciones = `<option value="" disabled>-- elige un torneo --</option>`;
    for (const t of torneos) {
        opciones += `<option value="${t.id}">${t.nombre}</option>`;
    }
    const select = document.getElementById("iTorneo");
    const elegido = select.value;
    select.innerHTML = opciones;
    select.value = elegido;
}

// GET /torneos/{id}
async function buscarTorneo() {
    const id = document.getElementById("buscarTorneoId").value;
    const resultado = document.getElementById("resTorneo");

    if (id === "") {
        mostrarAviso("Escribe el ID del torneo que quieres buscar.", "warning");
        return;
    }

    const t = await peticion("/torneos/" + id);
    if (t === null) {
        resultado.textContent = "";
        return;
    }
    resultado.textContent = `#${t.id} · ${t.nombre} · ${t.videojuego.nombre} · ${t.estado} · ${t.premio} €`;
}

// Filtrar: elige la ruta según los filtros marcados
// GET /torneos/estado/{estado}
// GET /torneos/videojuego/{videojuegoId}
// GET /torneos/videojuego/{videojuegoId}/estado/{estado}
async function filtrarTorneos() {
    const estado = document.getElementById("filtroEstadoTorneo").value;
    const videojuegoId = document.getElementById("filtroVideojuegoTorneo").value;

    let ruta;
    if (estado !== "" && videojuegoId !== "") {
        ruta = "/torneos/videojuego/" + videojuegoId + "/estado/" + estado;
    } else if (estado !== "") {
        ruta = "/torneos/estado/" + estado;
    } else if (videojuegoId !== "") {
        ruta = "/torneos/videojuego/" + videojuegoId;
    } else {
        ruta = "/torneos";
    }

    const torneos = await peticion(ruta);
    if (torneos === null) return;

    pintarTorneos(torneos);
    mostrarAviso(`${torneos.length} torneo(s) encontrado(s).`, "success");
}

// Crear (POST /torneos?videojuegoId={id}) o modificar (PUT /torneos/{id})
async function guardarTorneo() {
    const nombre = document.getElementById("tNombre").value.trim();
    const fecha = document.getElementById("tFecha").value;
    const premio = document.getElementById("tPremio").value;
    const estado = document.getElementById("tEstado").value;
    const videojuegoId = document.getElementById("tVideojuego").value;

    if (nombre === "" || fecha === "" || premio === "") {
        mostrarAviso("Rellena el nombre, la fecha y el premio del torneo.", "warning");
        return;
    }
    // Un torneo siempre lleva videojuego
    if (torneoEditando === null && videojuegoId === "") {
        mostrarAviso("Elige el videojuego del torneo.", "warning");
        return;
    }

    const torneo = {
        nombre: nombre,
        fecha: fecha,
        premio: parseFloat(premio),
        estado: estado
    };

    let guardado;
    if (torneoEditando === null) {
        guardado = await peticion("/torneos?videojuegoId=" + videojuegoId, "POST", torneo);
        if (guardado === null) return;
        mostrarAviso(`Torneo "${guardado.nombre}" creado con el ID ${guardado.id}.`, "success");
    } else {
        guardado = await peticion("/torneos/" + torneoEditando, "PUT", torneo);
        if (guardado === null) return;
        mostrarAviso(`Torneo "${guardado.nombre}" modificado.`, "success");
    }

    limpiarFormTorneo();
    cargarTorneos();
}

// Al pulsar Editar: GET /torneos/{id} y rellena el formulario
async function editarTorneo(id) {
    const t = await peticion("/torneos/" + id);
    if (t === null) return;

    torneoEditando = t.id;
    document.getElementById("tNombre").value = t.nombre;
    document.getElementById("tFecha").value = t.fecha;
    document.getElementById("tPremio").value = t.premio;
    document.getElementById("tEstado").value = t.estado;
    document.getElementById("tVideojuego").value = t.videojuego.id;
    // El servidor no cambia el videojuego de un torneo al modificarlo
    document.getElementById("tVideojuego").disabled = true;
    document.getElementById("btnTorneo").textContent = "Guardar cambios";
    document.getElementById("tNombre").focus();
}

function limpiarFormTorneo() {
    torneoEditando = null;
    document.getElementById("tNombre").value = "";
    document.getElementById("tFecha").value = "";
    document.getElementById("tPremio").value = "";
    document.getElementById("tEstado").value = "ABIERTO";
    document.getElementById("tVideojuego").value = "";
    document.getElementById("tVideojuego").disabled = false;
    document.getElementById("btnTorneo").textContent = "Crear torneo";
}

// DELETE /torneos/{id}
async function eliminarTorneo(id) {
    if (!confirm("¿Eliminar el torneo " + id + "? También se borrarán sus inscripciones.")) return;

    const borrado = await peticion("/torneos/" + id, "DELETE");
    if (borrado === null) return;

    mostrarAviso("Torneo " + id + " eliminado.", "success");
    if (torneoEditando === id) limpiarFormTorneo();
    document.getElementById("panelParticipantesTorneo").hidden = true;
    document.getElementById("panelTorneosJugador").hidden = true;
    cargarTorneos();
}

// GET /torneos/{id}/participantes
async function verParticipantes(id) {
    const participaciones = await peticion("/torneos/" + id + "/participantes");
    if (participaciones === null) return;

    const torneo = listaTorneos.find(t => t.id === id);
    const nombre = torneo ? torneo.nombre : "torneo " + id;
    document.getElementById("tituloParticipantesTorneo").textContent = "Participantes de " + nombre;

    let lineas = "";
    for (const p of participaciones) {
        lineas += `<div>${p.posicion}.º · ${p.jugador.nick} · ${p.puntos} puntos</div>`;
    }
    if (participaciones.length === 0) {
        lineas = `<div class="text-muted">Este torneo todavía no tiene participantes.</div>`;
    }

    document.getElementById("listaParticipantesTorneo").innerHTML = lineas;
    document.getElementById("panelParticipantesTorneo").hidden = false;
    document.getElementById("panelParticipantesTorneo").dataset.torneo = id;
}


// ===================== JUGADORES =====================

// GET /jugadores: tabla y desplegable de la inscripción
async function cargarJugadores() {
    const jugadores = await peticion("/jugadores");
    if (jugadores === null) return;

    listaJugadores = jugadores;

    let filas = "";
    for (const j of jugadores) {
        filas += `<tr>
            <td>${j.id}</td>
            <td>${j.nick}</td>
            <td>${j.email}</td>
            <td>${j.nivel}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary" onclick="verTorneosJugador(${j.id})">Torneos</button>
                <button class="btn btn-sm btn-warning" onclick="editarJugador(${j.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarJugador(${j.id})">Eliminar</button>
            </td>
        </tr>`;
    }
    if (jugadores.length === 0) {
        filas = `<tr><td colspan="5" class="text-muted">No hay jugadores.</td></tr>`;
    }
    document.getElementById("cuerpoJugadores").innerHTML = filas;

    let opciones = `<option value="" disabled>-- elige un jugador --</option>`;
    for (const j of jugadores) {
        opciones += `<option value="${j.id}">${j.nick}</option>`;
    }
    const select = document.getElementById("iJugador");
    const elegido = select.value;
    select.innerHTML = opciones;
    select.value = elegido;
}

// GET /jugadores/{id}
async function buscarJugador() {
    const id = document.getElementById("buscarJugadorId").value;
    const resultado = document.getElementById("resJugador");

    if (id === "") {
        mostrarAviso("Escribe el ID del jugador que quieres buscar.", "warning");
        return;
    }

    const j = await peticion("/jugadores/" + id);
    if (j === null) {
        resultado.textContent = "";
        return;
    }
    resultado.textContent = `#${j.id} · ${j.nick} · ${j.email} · nivel ${j.nivel}`;
}

// Crear (POST /jugadores) o modificar (PUT /jugadores/{id})
async function guardarJugador() {
    const nick = document.getElementById("jNick").value.trim();
    const email = document.getElementById("jEmail").value.trim();
    const nivel = document.getElementById("jNivel").value;

    if (nick === "" || email === "" || nivel === "") {
        mostrarAviso("Rellena el nick, el email y el nivel del jugador.", "warning");
        return;
    }

    const jugador = { nick: nick, email: email, nivel: parseInt(nivel) };

    let guardado;
    if (jugadorEditando === null) {
        guardado = await peticion("/jugadores", "POST", jugador);
        if (guardado === null) return;
        mostrarAviso(`Jugador "${guardado.nick}" creado con el ID ${guardado.id}.`, "success");
    } else {
        guardado = await peticion("/jugadores/" + jugadorEditando, "PUT", jugador);
        if (guardado === null) return;
        mostrarAviso(`Jugador "${guardado.nick}" modificado.`, "success");
    }

    limpiarFormJugador();
    cargarJugadores();
}

// Al pulsar Editar: GET /jugadores/{id} y rellena el formulario
async function editarJugador(id) {
    const j = await peticion("/jugadores/" + id);
    if (j === null) return;

    jugadorEditando = j.id;
    document.getElementById("jNick").value = j.nick;
    document.getElementById("jEmail").value = j.email;
    document.getElementById("jNivel").value = j.nivel;
    document.getElementById("btnJugador").textContent = "Guardar cambios";
    document.getElementById("jNick").focus();
}

function limpiarFormJugador() {
    jugadorEditando = null;
    document.getElementById("jNick").value = "";
    document.getElementById("jEmail").value = "";
    document.getElementById("jNivel").value = "";
    document.getElementById("btnJugador").textContent = "Crear jugador";
}

// DELETE /jugadores/{id}
async function eliminarJugador(id) {
    if (!confirm("¿Eliminar el jugador " + id + "? También se borrarán sus inscripciones.")) return;

    const borrado = await peticion("/jugadores/" + id, "DELETE");
    if (borrado === null) return;

    mostrarAviso("Jugador " + id + " eliminado.", "success");
    if (jugadorEditando === id) limpiarFormJugador();
    document.getElementById("panelTorneosJugador").hidden = true;
    document.getElementById("panelParticipantesTorneo").hidden = true;
    cargarJugadores();
}

// GET /jugadores/{id}/participaciones
async function verTorneosJugador(id) {
    const participaciones = await peticion("/jugadores/" + id + "/participaciones");
    if (participaciones === null) return;

    const jugador = listaJugadores.find(j => j.id === id);
    const nick = jugador ? jugador.nick : "jugador " + id;
    document.getElementById("tituloTorneosJugador").textContent = "Torneos de " + nick;

    let lineas = "";
    for (const p of participaciones) {
        lineas += `<div>${p.torneo.nombre} (${p.torneo.videojuego.nombre}) · ${p.posicion}.º · ${p.puntos} puntos</div>`;
    }
    if (participaciones.length === 0) {
        lineas = `<div class="text-muted">Este jugador no está inscrito en ningún torneo.</div>`;
    }

    document.getElementById("listaTorneosJugador").innerHTML = lineas;
    document.getElementById("panelTorneosJugador").hidden = false;
    document.getElementById("panelTorneosJugador").dataset.jugador = id;
}


// ===================== INSCRIPCIÓN =====================

// POST /participaciones?jugadorId={id}&torneoId={id}
async function inscribir() {
    const jugadorId = document.getElementById("iJugador").value;
    const torneoId = document.getElementById("iTorneo").value;
    const puntos = document.getElementById("iPuntos").value;
    const posicion = document.getElementById("iPosicion").value;

    if (jugadorId === "" || torneoId === "") {
        mostrarAviso("Elige un jugador y un torneo.", "warning");
        return;
    }
    if (puntos === "" || posicion === "") {
        mostrarAviso("Rellena los puntos y la posición.", "warning");
        return;
    }

    const participacion = { puntos: parseInt(puntos), posicion: parseInt(posicion) };
    const creada = await peticion(
        "/participaciones?jugadorId=" + jugadorId + "&torneoId=" + torneoId, "POST", participacion);
    if (creada === null) return;

    mostrarAviso(`${creada.jugador.nick} inscrito en "${creada.torneo.nombre}".`, "success");
    document.getElementById("iJugador").value = "";
    document.getElementById("iTorneo").value = "";
    document.getElementById("iPuntos").value = "";
    document.getElementById("iPosicion").value = "";

    // Si los paneles de participaciones están abiertos, se actualizan
    const panelTorneo = document.getElementById("panelParticipantesTorneo");
    if (!panelTorneo.hidden && panelTorneo.dataset.torneo === torneoId) {
        verParticipantes(parseInt(torneoId));
    }
    const panelJugador = document.getElementById("panelTorneosJugador");
    if (!panelJugador.hidden && panelJugador.dataset.jugador === jugadorId) {
        verTorneosJugador(parseInt(jugadorId));
    }
}


// ===================== AL ABRIR LA PÁGINA =====================

// Botones
document.getElementById("btnBuscarVideojuego").addEventListener("click", buscarVideojuego);
document.getElementById("btnJuego").addEventListener("click", crearVideojuego);

document.getElementById("btnBuscarTorneo").addEventListener("click", buscarTorneo);
document.getElementById("btnFiltrarTorneos").addEventListener("click", filtrarTorneos);
document.getElementById("btnTorneo").addEventListener("click", guardarTorneo);

document.getElementById("btnBuscarJugador").addEventListener("click", buscarJugador);
document.getElementById("btnJugador").addEventListener("click", guardarJugador);

document.getElementById("btnInscribir").addEventListener("click", inscribir);

// Cada vez que se abre una pestaña, su lista se vuelve a cargar sola (sin botón «Ver»)
document.getElementById("btnTabTorneos").addEventListener("shown.bs.tab", cargarTorneos);
document.getElementById("btnTabJugadores").addEventListener("shown.bs.tab", cargarJugadores);
document.getElementById("btnTabVideojuegos").addEventListener("shown.bs.tab", cargarVideojuegos);

// Primera carga de todas las listas (también rellena los desplegables)
cargarVideojuegos();
cargarTorneos();
cargarJugadores();
