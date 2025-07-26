// Referencias a elementos del DOM
let contenedorCliente, sinSeleccion, formCliente, nuevoClienteBtn, buscarCliente, listaClientes;
let estadosContainer, nombreCliente, eliminarClienteBtn, listaInteracciones, listaRecordatorios;
let nuevaInteraccionBtn, interaccionModal, formInteraccion, guardarInteraccionBtn;

// Variables globales
let clientes = [];
let estados = ['Nuevo', 'Contactado', 'Interesado', 'Cliente', 'Inactivo'];
let clienteActual = null;
let draggedItem = null;

// Inicializar la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== INICIALIZACIÓN DE LA APLICACIÓN ===');
    console.log('Hora de inicio:', new Date().toISOString());
    
    try {
        // 1. Verificar que el DOM esté completamente cargado
        console.log('1. Verificando carga del DOM...');
        console.log('Documento listo, elementos principales del DOM cargados');
        
        // 2. Inicializar referencias a elementos del DOM
        console.log('2. Inicializando referencias a elementos del DOM...');
        await inicializarElementosDOM();
        
        // Verificar que los elementos principales se hayan inicializado correctamente
        console.log('Elementos principales inicializados:');
        console.log('- listaClientes:', listaClientes ? 'OK' : 'NO ENCONTRADO');
        console.log('- contenedorCliente:', contenedorCliente ? 'OK' : 'NO ENCONTRADO');
        console.log('- formCliente:', formCliente ? 'OK' : 'NO ENCONTRADO');
        
        // 3. Configurar manejadores de eventos
        console.log('3. Configurando manejadores de eventos...');
        configurarEventos();
        
        // 4. Cargar datos iniciales
        console.log('4. Cargando datos iniciales...');
        await cargarDatos(true);
        
        // 5. Inicializar el tablero Kanban
        console.log('5. Inicializando tablero Kanban...');
        if (typeof inicializarKanban === 'function') {
            inicializarKanban();
            console.log('Tablero Kanban inicializado correctamente');
        } else {
            console.error('Error: La función inicializarKanban no está definida');
        }
        
        console.log('=== APLICACIÓN INICIALIZADA CORRECTAMENTE ===');
        
    } catch (error) {
        console.error('Error durante la inicialización de la aplicación:', error);
        mostrarError('Ocurrió un error al iniciar la aplicación. Por favor, recarga la página.');
    }
});

// Inicializar referencias a elementos del DOM
async function inicializarElementosDOM() {
    console.log('=== INICIALIZANDO ELEMENTOS DEL DOM ===');
    
    // Función auxiliar para obtener elementos con validación mejorada
    const getElement = (id, required = true) => {
        try {
            const element = document.getElementById(id);
            if (!element && required) {
                const errorMsg = `❌ No se encontró el elemento con ID: ${id}`;
                console.error(errorMsg);
                mostrarError(`Error de configuración: ${errorMsg}`);
            } else if (element) {
                console.log(`✅ Elemento encontrado: ${id}`);
            }
            return element;
        } catch (error) {
            console.error(`Error al buscar el elemento ${id}:`, error);
            return null;
        }
    };
    
    try {
        console.log('Buscando elementos principales...');
        // Elementos principales
        contenedorCliente = getElement('contenedorCliente');
        sinSeleccion = getElement('sinSeleccion');
        formCliente = getElement('formCliente');
        
        // Verificar elementos críticos
        if (!contenedorCliente || !formCliente) {
            throw new Error('No se encontraron elementos críticos del formulario de cliente');
        }
        
        console.log('Buscando botones y controles...');
        // Botones y controles
        nuevoClienteBtn = getElement('nuevoClienteBtn');
        buscarCliente = getElement('buscarCliente');
        eliminarClienteBtn = getElement('eliminarCliente');
        nuevaInteraccionBtn = getElement('nuevaInteraccionBtn');
        guardarInteraccionBtn = getElement('guardarInteraccion');
        
        console.log('Buscando contenedores de datos...');
        // Contenedores de datos - asegurarse de que listaClientes existe
        listaClientes = getElement('listaClientes');
        if (!listaClientes) {
            console.error('❌ No se pudo encontrar el contenedor de la lista de clientes');
            // Intentar crear el contenedor si no existe
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                console.log('Intentando crear el contenedor de lista de clientes...');
                const newListContainer = document.createElement('div');
                newListContainer.id = 'listaClientes';
                newListContainer.className = 'list-group list-group-flush';
                sidebar.appendChild(newListContainer);
                listaClientes = newListContainer;
                console.log('✅ Contenedor de lista de clientes creado dinámicamente');
            }
        }
        
        estadosContainer = getElement('estadosContainer');
        nombreCliente = getElement('nombreCliente');
        listaInteracciones = getElement('listaInteracciones');
        listaRecordatorios = getElement('listaRecordatorios');
        
        console.log('Buscando formularios...');
        // Formularios
        formInteraccion = getElement('formInteraccion');
        
        console.log('Buscando modales...');
        // Inicializar modales
        const interaccionModalElement = getElement('interaccionModal', false);
        if (interaccionModalElement) {
            interaccionModal = new bootstrap.Modal(interaccionModalElement);
            console.log('✅ Modal de interacciones inicializado correctamente');
        } else {
            console.error('❌ No se encontró el elemento del modal de interacciones');
        }
        
        console.log('=== ELEMENTOS DEL DOM INICIALIZADOS CORRECTAMENTE ===');
        console.log('Resumen de elementos críticos:');
        console.log('- Lista de clientes:', listaClientes ? 'OK' : 'FALLO');
        console.log('- Formulario de cliente:', formCliente ? 'OK' : 'FALLO');
        console.log('- Contenedor de cliente:', contenedorCliente ? 'OK' : 'FALLO');
        
        return {
            listaClientes: !!listaClientes,
            formCliente: !!formCliente,
            contenedorCliente: !!contenedorCliente
        };
        
    } catch (error) {
        console.error('❌ Error crítico al inicializar los elementos del DOM:', error);
        mostrarError('Error crítico al cargar la interfaz. Por favor, recarga la página.');
        throw error;
    }
}

// Cargar datos iniciales
let ultimaCargaClientes = 0;
const TIEMPO_MINIMO_ENTRE_CARGAS = 1000; // 1 segundo

async function cargarDatos(forzarRecarga = false) {
    console.log('=== INICIANDO CARGA DE DATOS ===');
    console.log('Hora actual:', new Date().toISOString());
    
    const ahora = Date.now();
    const tiempoDesdeUltimaCarga = ahora - ultimaCargaClientes;
    
    // Evitar múltiples cargas en un corto período de tiempo
    if (!forzarRecarga && tiempoDesdeUltimaCarga < TIEMPO_MINIMO_ENTRE_CARGAS) {
        const tiempoRestante = TIEMPO_MINIMO_ENTRE_CARGAS - tiempoDesdeUltimaCarga;
        console.log(`Esperando antes de la próxima carga (${tiempoRestante}ms restantes)...`);
        return;
    }
    
    // Mostrar indicador de carga
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #0d6efd;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 9999;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    loadingIndicator.textContent = 'Cargando clientes...';
    document.body.appendChild(loadingIndicator);
    
    ultimaCargaClientes = ahora;
    
    try {
        console.log('Iniciando carga de datos...');
        
        // Verificar si el IPC está disponible
        if (!window.electron || typeof window.electron.invoke !== 'function') {
            throw new Error('No se pudo acceder a la API de Electron');
        }
        
        // Cargar estados si no existen (solo una vez)
        if (estados.length === 0) {
            console.log('Cargando estados...');
            try {
                loadingIndicator.textContent = 'Cargando estados...';
                const estadosCargados = await window.electron.invoke('obtener-estados');
                estados = Array.isArray(estadosCargados) ? estadosCargados : ['Nuevo', 'Contactado', 'Interesado', 'Cliente', 'Inactivo'];
                console.log('Estados cargados:', estados);
                
                // Inicializar el tablero Kanban con los estados cargados
                if (typeof inicializarKanban === 'function') {
                    console.log('Inicializando tablero Kanban...');
                    await new Promise(resolve => setTimeout(resolve, 100)); // Pequeña pausa
                    inicializarKanban();
                } else {
                    console.error('Error: La función inicializarKanban no está definida');
                }
            } catch (error) {
                console.error('Error al cargar los estados:', error);
                estados = ['Nuevo', 'Contactado', 'Interesado', 'Cliente', 'Inactivo'];
            }
        }
        
        // Cargar clientes
        console.log('Solicitando clientes al backend...');
        loadingIndicator.textContent = 'Cargando lista de clientes...';
        
        let nuevosClientes = [];
        try {
            const resultado = await window.electron.invoke('obtener-clientes');
            nuevosClientes = Array.isArray(resultado) ? resultado : [];
            console.log(`Se recibieron ${nuevosClientes.length} clientes del backend`);
            
            if (nuevosClientes.length > 0) {
                console.log('Muestra de clientes recibidos:', 
                    nuevosClientes.slice(0, 3).map(c => ({
                        id: c.id,
                        nombre: c.nombre?.substring(0, 20) || 'Sin nombre',
                        telefono: c.telefono || 'Sin teléfono',
                        estado: c.estado || 'Sin estado'
                    }))
                );
            } else {
                console.log('No se encontraron clientes en la base de datos');
            }
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            mostrarError('No se pudieron cargar los clientes. Por favor, inténtalo de nuevo.');
            return;
        }
        
        // Actualizar la lista de clientes
        clientes = nuevosClientes;
        console.log(`Total de clientes en memoria: ${clientes.length}`);
        
        // Verificar si el elemento de la lista de clientes existe
        if (!listaClientes) {
            console.warn('El contenedor de la lista de clientes no está disponible, intentando recuperar...');
            listaClientes = document.getElementById('listaClientes');
            if (!listaClientes) {
                console.error('No se pudo encontrar el contenedor de la lista de clientes');
                mostrarError('Error al cargar la lista de clientes. Por favor, recarga la página.');
                return;
            }
        }
        
        // Renderizar la lista de clientes
        if (typeof renderizarListaClientes === 'function') {
            console.log('Llamando a renderizarListaClientes...');
            try {
                await new Promise(resolve => setTimeout(resolve, 50)); // Pequeña pausa
                renderizarListaClientes(clientes);
                console.log('Lista de clientes renderizada correctamente');
            } catch (error) {
                console.error('Error al renderizar la lista de clientes:', error);
                mostrarError('Error al mostrar la lista de clientes.');
            }
        } else {
            console.error('Error: La función renderizarListaClientes no está definida');
            mostrarError('Error en la configuración de la aplicación.');
        }
        
        // Actualizar el tablero Kanban
        if (typeof actualizarTableroKanban === 'function') {
            console.log('Actualizando tablero Kanban...');
            try {
                await new Promise(resolve => setTimeout(resolve, 50)); // Pequeña pausa
                actualizarTableroKanban();
                console.log('Tablero Kanban actualizado correctamente');
            } catch (error) {
                console.error('Error al actualizar el tablero Kanban:', error);
            }
        }
        
    } catch (error) {
        console.error('Error al cargar los datos:', error);
        // No mostrar error al usuario si es una carga en segundo plano
        if (forzarRecarga) {
            mostrarError('Error al cargar los datos. Intenta recargar la página.');
        }
    }
}

cargarDatos().then(() => {
    // Inicializar el tablero Kanban después de cargar los datos
    inicializarKanban();
});

// Inicializar el tablero Kanban
function inicializarKanban() {
    console.log('Inicializando tablero Kanban...');
    const kanbanBoard = document.getElementById('kanbanBoard');
    
    if (!kanbanBoard) {
        console.error('No se encontró el elemento kanbanBoard');
        return;
    }
    
    // Limpiar el tablero
    kanbanBoard.innerHTML = '';
    
    // Crear columnas para cada estado
    estados.forEach(estado => {
        const estadoId = estado.toLowerCase().replace(/\s+/g, '-');
        const column = document.createElement('div');
        column.className = 'kanban-column';
        column.id = `col-${estadoId}`;
        column.setAttribute('data-estado', estado);
        
        // Contenido de la columna
        column.innerHTML = `
            <div class="kanban-column-header">
                <span>${estado}</span>
                <span class="kanban-column-count badge bg-secondary">0</span>
            </div>
            <div class="kanban-cards" id="cards-${estadoId}"></div>
        `;
        
        // Configurar eventos de arrastre
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drop-zone');
        });
        
        column.addEventListener('dragleave', () => {
            column.classList.remove('drop-zone');
        });
        
        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drop-zone');
            
            if (draggedItem) {
                const clienteId = draggedItem.getAttribute('data-cliente-id');
                const nuevoEstado = column.getAttribute('data-estado');
                actualizarEstadoCliente(clienteId, nuevoEstado);
            }
        });
        
        kanbanBoard.appendChild(column);
    });
    
    actualizarTableroKanban();
}

// Actualizar el tablero Kanban con los clientes
function actualizarTableroKanban() {
    console.log('Actualizando tablero Kanban...');
    
    // Limpiar todas las tarjetas
    document.querySelectorAll('.kanban-cards').forEach(container => {
        container.innerHTML = '';
    });
    
    // Agregar clientes a sus respectivas columnas
    clientes.forEach(cliente => {
        const estadoId = (cliente.estado || 'Nuevo').toLowerCase().replace(/\s+/g, '-');
        const container = document.getElementById(`cards-${estadoId}`);
        
        if (container) {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.setAttribute('draggable', 'true');
            card.setAttribute('data-cliente-id', cliente.id);
            
            card.innerHTML = `
                <h6>${cliente.nombre || 'Sin nombre'}</h6>
                <p><i class="bi bi-telephone"></i> ${cliente.telefono || 'Sin teléfono'}</p>
                ${cliente.email ? `<p><i class="bi bi-envelope"></i> ${cliente.email}</p>` : ''}
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${formatearFecha(cliente.fechaCreacion)}</small>
                    <span class="badge bg-primary">${cliente.interacciones?.length || 0} <i class="bi bi-chat-dots"></i></span>
                </div>
            `;
            
            // Configurar eventos de arrastre
            card.addEventListener('dragstart', (e) => {
                draggedItem = card;
                setTimeout(() => {
                    card.classList.add('dragging');
                }, 0);
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedItem = null;
            });
            
            // Hacer clic para ver detalles
            card.addEventListener('click', () => {
                document.getElementById('detalle-tab').click();
                cargarCliente(cliente.id);
            });
            
            container.appendChild(card);
        }
    });
    
    // Actualizar contadores
    estados.forEach(estado => {
        const estadoId = estado.toLowerCase().replace(/\s+/g, '-');
        const container = document.getElementById(`cards-${estadoId}`);
        const countElement = document.querySelector(`#col-${estadoId} .kanban-column-count`);
        
        if (container && countElement) {
            const count = container.children.length;
            countElement.textContent = count;
            countElement.className = `kanban-column-count badge ${count > 0 ? 'bg-primary' : 'bg-secondary'}`;
        }
    });
}

// Actualizar el estado de un cliente
async function actualizarEstadoCliente(clienteId, nuevoEstado) {
    try {
        const cliente = clientes.find(c => c.id === clienteId);
        if (!cliente) {
            console.error('Cliente no encontrado:', clienteId);
            return;
        }
        
        // Actualizar el estado
        cliente.estado = nuevoEstado;
        cliente.fechaModificacion = new Date().toISOString();
        
        // Guardar cambios
        await window.electron.invoke('guardar-cliente', cliente);
        
        // Actualizar la interfaz
        actualizarTableroKanban();
        
        // Si el cliente actual es el que se está moviendo, actualizar su vista de detalle
        if (clienteActual && clienteActual.id === clienteId) {
            cargarCliente(clienteId);
        }
        
        console.log(`Cliente ${cliente.nombre} movido a ${nuevoEstado}`);
    } catch (error) {
        console.error('Error al actualizar el estado del cliente:', error);
        mostrarError('No se pudo actualizar el estado del cliente');
    }
}

// Función auxiliar para formatear fechas
function formatearFecha(fechaString) {
    if (!fechaString) return '';
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Configurar eventos
function configurarEventos() {
    console.log('Configurando eventos...');
    
    // Verificar que los elementos necesarios existan
    if (!nuevoClienteBtn) {
        console.error('Error: No se encontró el botón de nuevo cliente');
        return;
    }
    
    // Configurar evento para nuevo cliente
    console.log('Configurando evento para nuevo cliente...');
    nuevoClienteBtn.onclick = function(e) {
        console.log('Botón de nuevo cliente clickeado');
        e.preventDefault();
        try {
            mostrarFormularioCliente();
        } catch (error) {
            console.error('Error al mostrar el formulario de cliente:', error);
            alert('Error al intentar crear un nuevo cliente. Por favor, inténtalo de nuevo.');
        }
        return false;
    };
    
    // Configurar otros eventos
    if (formCliente) {
        formCliente.onsubmit = async function(e) {
            e.preventDefault();
            try {
                await guardarCliente();
            } catch (error) {
                console.error('Error al guardar el cliente:', error);
                alert('Error al guardar el cliente. Por favor, verifica los datos e inténtalo de nuevo.');
            }
            return false;
        };
    }
    
    // Buscar cliente
    buscarCliente.addEventListener('input', (e) => {
        const termino = e.target.value.trim().toLowerCase();
        
        if (!termino) {
            // Si el término de búsqueda está vacío, mostrar todos los clientes
            renderizarListaClientes(clientes);
            return;
        }
        
        console.log(`Buscando cliente con término: ${termino}`);
        console.log('Clientes disponibles:', clientes);
        
        const clientesFiltrados = clientes.filter(cliente => {
            // Verificar si el cliente tiene los campos necesarios
            if (!cliente) return false;
            
            const nombre = (cliente.nombre || '').toLowerCase();
            const telefono = (cliente.telefono || '').toLowerCase();
            const email = (cliente.email || '').toLowerCase();
            
            return nombre.includes(termino) || 
                   telefono.includes(termino) || 
                   email.includes(termino);
        });
        
        console.log('Clientes encontrados:', clientesFiltrados);
        renderizarListaClientes(clientesFiltrados);
    });
    
    // Guardar cliente
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarCliente();
    });
    
    // Eliminar cliente
    eliminarClienteBtn.addEventListener('click', async () => {
        if (clienteActual && confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
            await eliminarCliente(clienteActual.id);
        }
    });
    
    // Nueva interacción
    nuevaInteraccionBtn.addEventListener('click', () => {
        mostrarFormularioInteraccion();
    });
    
    // Guardar interacción
    guardarInteraccionBtn.addEventListener('click', async () => {
        await guardarInteraccion();
        // Actualizar la lista de clientes y el tablero Kanban
        renderizarListaClientes(clientes);
        if (document.getElementById('kanbanBoard')) {
            actualizarTableroKanban();
        }
    });
}

// Renderizar lista de clientes
function renderizarListaClientes(clientesARenderizar) {
    console.log('=== INICIANDO RENDERIZADO DE LISTA DE CLIENTES ===');
    console.log('Hora actual:', new Date().toISOString());
    
    try {
        // Debug: Verificar si el contenedor existe
        listaClientes = document.getElementById('listaClientes');
        
        if (!listaClientes) {
            console.error('Error: No se encontró el contenedor de la lista de clientes');
            console.error('Se buscó un elemento con ID "listaClientes" pero no se encontró');
            
            // Intentar crear el contenedor si no existe
            const sidebar = document.querySelector('.sidebar') || document.body;
            console.log('Intentando crear el contenedor de lista de clientes...');
            const newListContainer = document.createElement('div');
            newListContainer.id = 'listaClientes';
            newListContainer.className = 'list-group list-group-flush';
            sidebar.appendChild(newListContainer);
            listaClientes = newListContainer;
            console.log('✅ Contenedor de lista de clientes creado dinámicamente');
        }
        
        console.log('Contenedor de lista de clientes listo:', listaClientes);
        
        if (!Array.isArray(clientesARenderizar)) {
            const errorMsg = `Error: Se esperaba un array de clientes, se recibió: ${typeof clientesARenderizar}`;
            console.error(errorMsg);
            mostrarError('Error al cargar la lista de clientes. Por favor, recarga la página.');
            return;
        }
        
        console.log(`Recibidos ${clientesARenderizar.length} clientes para renderizar`);
        
        // Limpiar la lista de manera segura
        try {
            while (listaClientes.firstChild) {
                listaClientes.removeChild(listaClientes.firstChild);
            }
        } catch (error) {
            console.error('Error al limpiar la lista de clientes:', error);
            // Continuar a pesar del error, para intentar renderizar de todos modos
        }
        
        // Mostrar mensaje si no hay clientes
        if (clientesARenderizar.length === 0) {
            console.log('No hay clientes para mostrar');
            const emptyItem = document.createElement('div');
            emptyItem.className = 'list-group-item text-muted py-3';
            emptyItem.innerHTML = `
                <div class="d-flex flex-column align-items-center text-center p-3">
                    <i class="bi bi-people fs-1 text-muted mb-2"></i>
                    <h5 class="mb-1">No hay clientes</h5>
                    <p class="small mb-0">Comienza agregando tu primer cliente</p>
                    <button id="btnAgregarPrimerCliente" class="btn btn-primary btn-sm mt-2">
                        <i class="bi bi-plus-lg me-1"></i> Agregar Cliente
                    </button>
                </div>
            `;
            
            // Agregar evento al botón de agregar primer cliente
            listaClientes.appendChild(emptyItem);
            
            // Usar setTimeout para asegurar que el DOM esté listo
            setTimeout(() => {
                const btnAgregar = document.getElementById('btnAgregarPrimerCliente');
                if (btnAgregar) {
                    btnAgregar.addEventListener('click', () => {
                        mostrarFormularioCliente();
                    });
                }
            }, 100);
            
            return;
        }
        
        // Ordenar clientes por nombre
        const clientesOrdenados = [...clientesARenderizar].sort((a, b) => {
            try {
                return (a.nombre || '').toString().localeCompare((b.nombre || '').toString());
            } catch (error) {
                console.error('Error al ordenar clientes:', error);
                return 0;
            }
        });
        
        // Contador para clientes válidos
        let clientesValidos = 0;
        
        // Crear fragmento de documento para mejor rendimiento
        const fragment = document.createDocumentFragment();
        
        clientesOrdenados.forEach((cliente, index) => {
            try {
                if (!cliente || !cliente.id) {
                    console.warn('Cliente inválido encontrado en la posición', index, ':', cliente);
                    return;
                }
                
                // Validar datos mínimos
                const nombre = (cliente.nombre || 'Sin nombre').toString().trim();
                const telefono = (cliente.telefono || '').toString().trim();
                const estado = (cliente.estado || 'Sin estado').toString().trim();
                
                const item = document.createElement('a');
                item.href = '#';
                item.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2`;
                item.dataset.clienteId = cliente.id;
                
                // Resaltar el cliente actual
                if (clienteActual?.id === cliente.id) {
                    item.classList.add('active');
                    item.classList.add('fw-semibold');
                }
                
                // Crear contenedor para el nombre y teléfono
                const textContainer = document.createElement('div');
                textContainer.className = 'd-flex flex-column';
                
                // Nombre del cliente
                const nombreElement = document.createElement('span');
                nombreElement.className = 'fw-bold text-truncate';
                nombreElement.style.maxWidth = '200px';
                nombreElement.textContent = nombre;
                nombreElement.title = nombre; // Tooltip para nombres largos
                
                // Teléfono del cliente
                const telefonoElement = document.createElement('small');
                telefonoElement.className = 'text-muted text-truncate';
                telefonoElement.style.maxWidth = '180px';
                telefonoElement.textContent = telefono || 'Sin teléfono';
                if (telefono) telefonoElement.title = telefono; // Tooltip para teléfonos largos
                
                // Estado del cliente (badge)
                const estadoBadge = document.createElement('span');
                estadoBadge.className = `badge rounded-pill ms-2 ${getEstadoBadgeClass(estado)}`;
                estadoBadge.textContent = estado;
                
                // Construir la estructura
                textContainer.appendChild(nombreElement);
                textContainer.appendChild(telefonoElement);
                
                const container = document.createElement('div');
                container.className = 'd-flex justify-content-between align-items-center w-100';
                container.appendChild(textContainer);
                container.appendChild(estadoBadge);
                
                item.appendChild(container);
                
                // Agregar evento de clic
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Cargando cliente:', cliente.id);
                    cargarCliente(cliente.id);
                });
                
                fragment.appendChild(item);
                clientesValidos++;
                
            } catch (error) {
                console.error(`Error al renderizar el cliente en la posición ${index}:`, error);
                console.error('Datos del cliente problemático:', cliente);
            }
        });
        
        // Agregar todos los elementos al DOM de una sola vez
        listaClientes.appendChild(fragment);
        
        console.log(`Se renderizaron ${clientesValidos} de ${clientesOrdenados.length} clientes correctamente`);
        
        // Si hay clientes pero ninguno es válido, mostrar mensaje
        if (clientesValidos === 0 && clientesOrdenados.length > 0) {
            const errorItem = document.createElement('div');
            errorItem.className = 'list-group-item text-danger';
            errorItem.textContent = 'No se pudieron cargar los clientes. Por favor, recarga la página.';
            listaClientes.appendChild(errorItem);
        }
        
    } catch (error) {
        console.error('Error crítico en renderizarListaClientes:', error);
        mostrarError('Ocurrió un error al cargar la lista de clientes. Por favor, recarga la página.');
        
        // Intentar mostrar un mensaje de error en la interfaz
        if (listaClientes) {
            try {
                const errorItem = document.createElement('div');
                errorItem.className = 'alert alert-danger m-3';
                errorItem.innerHTML = `
                    <h5 class="alert-heading">Error al cargar los clientes</h5>
                    <p>${error.message || 'Error desconocido'}</p>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.location.reload()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Recargar Página
                    </button>
                `;
                listaClientes.appendChild(errorItem);
            } catch (e) {
                console.error('No se pudo mostrar el mensaje de error en la interfaz:', e);
            }
        }
    }
}

// Función auxiliar para obtener la clase CSS del badge según el estado
function getEstadoBadgeClass(estado) {
    if (!estado) return 'bg-secondary';
    
    const estadoLower = estado.toLowerCase();
    
    // Mapeo de estados a clases de Bootstrap
    const estadoClasses = {
        'nuevo': 'bg-primary',
        'contactado': 'bg-info text-dark',
        'interesado': 'bg-warning text-dark',
        'cliente': 'bg-success',
        'inactivo': 'bg-secondary',
        'prospecto': 'bg-purple',
        'cotización': 'bg-indigo',
        'venta': 'bg-success',
        'perdido': 'bg-danger',
        'pospuesto': 'bg-secondary',
        'en proceso': 'bg-info',
        'pendiente': 'bg-warning text-dark',
        'completado': 'bg-success',
        'cancelado': 'bg-danger'
    };
    
    // Buscar coincidencia exacta o parcial
    const estadoKey = Object.keys(estadoClasses).find(key => 
        estadoLower.includes(key.toLowerCase())
    );
    
    return estadoKey ? estadoClasses[estadoKey] : 'bg-secondary';
}

// Renderizar estados
function renderizarEstados() {
    estadosContainer.innerHTML = '';
    
    estados.forEach(estado => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn btn-outline-primary estado-badge me-2 ${clienteActual && clienteActual.estado === estado ? 'active' : ''}`;
        btn.textContent = estado;
        
        btn.addEventListener('click', async () => {
            if (clienteActual) {
                clienteActual.estado = estado;
                await guardarCliente();
                renderizarEstados();
            }
        });
        
        estadosContainer.appendChild(btn);
    });
}

// Mostrar formulario de cliente
function mostrarFormularioCliente(cliente = null) {
    console.log('Mostrando formulario de cliente');
    
    // Si no se proporciona un cliente, crear uno nuevo
    if (!cliente) {
        console.log('Creando nuevo cliente');
        clienteActual = {
            id: null,
            nombre: '',
            telefono: '',
            email: '',
            estado: estados.length > 0 ? estados[0] : 'Nuevo',
            interacciones: [],
            recordatorios: [],
            fechaCreacion: new Date().toISOString()
        };
    } else {
        console.log('Editando cliente existente');
        clienteActual = { ...cliente };
    }
    
    try {
        // Actualizar formulario
        console.log('Actualizando campos del formulario');
        document.getElementById('clienteId').value = clienteActual.id || '';
        document.getElementById('nombre').value = clienteActual.nombre || '';
        document.getElementById('telefono').value = clienteActual.telefono || '';
        document.getElementById('email').value = clienteActual.email || '';
        
        // Mostrar contenedor de cliente y ocultar mensaje de selección
        contenedorCliente.classList.remove('d-none');
        if (sinSeleccion) {
            sinSeleccion.classList.add('d-none');
        }
        
        // Actualizar título
        if (nombreCliente) {
            nombreCliente.textContent = clienteActual.nombre || 'Nuevo Cliente';
        }
        
        // Renderizar interacciones, estados y recordatorios
        if (typeof renderizarInteracciones === 'function') {
            renderizarInteracciones();
        }
        
        if (typeof renderizarEstados === 'function') {
            renderizarEstados();
        }
        
        if (typeof renderizarRecordatorios === 'function') {
            renderizarRecordatorios();
        }
        
        // Hacer scroll hacia arriba
        window.scrollTo(0, 0);
        
        console.log('Formulario de cliente mostrado correctamente');
    } catch (error) {
        console.error('Error al mostrar el formulario del cliente:', error);
        mostrarError('Error al cargar el formulario del cliente: ' + error.message);
    }
}

// Cargar datos de un cliente
async function cargarCliente(id) {
    console.log('=== INICIANDO CARGA DE CLIENTE ===');
    console.log(`ID del cliente a cargar: ${id}`);
    
    // Mostrar indicador de carga
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'position-fixed top-0 end-0 p-3';
    loadingIndicator.style.zIndex = '1060';
    loadingIndicator.innerHTML = `
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <strong class="me-auto">Cargando cliente</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Cerrar"></button>
            </div>
            <div class="toast-body">
                Obteniendo información del cliente...
            </div>
        </div>
    `;
    document.body.appendChild(loadingIndicator);
    
    try {
        const cliente = clientes.find(c => c.id === id);
        if (cliente) {
            clienteActual = { ...cliente };
            mostrarFormularioCliente(clienteActual);
        }
    } catch (error) {
        console.error('Error al cargar el cliente:', error);
        mostrarError('Error al cargar los datos del cliente');
    }
}

// Guardar cliente
async function guardarCliente() {
    // Obtener referencias a los elementos una sola vez
    const nombreInput = document.getElementById('nombre');
    const telefonoInput = document.getElementById('telefono');
    const emailInput = document.getElementById('email');
    
    try {
        // Validación rápida de campos obligatorios
        const nombre = nombreInput.value.trim();
        const telefono = telefonoInput.value.trim();
        const email = emailInput ? emailInput.value.trim() : ''; // Email opcional
        
        if (!nombre || !telefono) {
            mostrarError('Por favor completa los campos obligatorios (nombre y teléfono)');
            return;
        }
        
        // Validar que el teléfono no esté en uso por otro cliente
        const clienteExistente = await window.electron.invoke('buscar-cliente-por-telefono', telefono);
        if (clienteExistente && clienteExistente.id !== (clienteActual?.id || '')) {
            mostrarError('Ya existe un cliente con este número de teléfono');
            return;
        }
        
        // Usar operador de asignación lógica para actualizar solo si es necesario
        if (clienteActual.nombre !== nombre || 
            clienteActual.telefono !== telefono || 
            clienteActual.email !== email) {
                
            // Actualizar solo los campos modificados
            clienteActual.nombre = nombre;
            clienteActual.telefono = telefono;
            clienteActual.email = email; // Email opcional
            
            // Si es un cliente nuevo, generar ID
            if (!clienteActual.id) {
                clienteActual.id = Date.now().toString();
                clienteActual.fechaCreacion = new Date().toISOString();
            }
            
            // Actualizar fecha de modificación
            clienteActual.fechaModificacion = new Date().toISOString();
            
            // Usar requestIdleCallback para operaciones no críticas
            if (window.requestIdleCallback) {
                requestIdleCallback(async () => {
                    await window.electron.invoke('guardar-cliente', clienteActual);
                    await cargarDatos();
                });
            } else {
                // Fallback para navegadores sin soporte para requestIdleCallback
                await window.electron.invoke('guardar-cliente', clienteActual);
                await cargarDatos();
            }
            
            mostrarExito('Cliente guardado correctamente');
        }
        
    } catch (error) {
        console.error('Error al guardar el cliente:', error);
        mostrarError('Error al guardar el cliente. Por favor, inténtalo de nuevo.');
        throw error; // Relanzar el error para manejarlo en el llamador
    }
}

// Eliminar cliente
async function eliminarCliente(id) {
    try {
        await window.electron.invoke('eliminar-cliente', id);
        
        // Actualizar lista de clientes
        await cargarDatos();
        
        // Limpiar formulario
        contenedorCliente.classList.add('d-none');
        sinSeleccion.classList.remove('d-none');
        
        // Mostrar mensaje de éxito
        mostrarExito('Cliente eliminado correctamente');
        
    } catch (error) {
        console.error('Error al eliminar el cliente:', error);
        mostrarError('Error al eliminar el cliente');
    }
}

// Mostrar formulario de interacción
function mostrarFormularioInteraccion(interaccion = null) {
    const form = document.getElementById('formInteraccion');
    const ahora = new Date();
    const fechaHoraActual = ahora.toISOString().slice(0, 16);
    
    // Resetear formulario
    form.reset();
    
    // Establecer valores por defecto
    document.getElementById('interaccionId').value = interaccion?.id || '';
    document.getElementById('tipoInteraccion').value = interaccion?.tipo || 'llamada';
    document.getElementById('fechaInteraccion').value = interaccion?.fecha || fechaHoraActual;
    document.getElementById('notaInteraccion').value = interaccion?.nota || '';
    
    // Mostrar modal
    interaccionModal.show();
}

// Guardar interacción
async function guardarInteraccion() {
    try {
        const form = document.getElementById('formInteraccion');
        const interaccionId = document.getElementById('interaccionId').value;
        
        const interaccion = {
            id: interaccionId || Date.now().toString(),
            tipo: document.getElementById('tipoInteraccion').value,
            fecha: document.getElementById('fechaInteraccion').value,
            nota: document.getElementById('notaInteraccion').value,
            fechaCreacion: interaccionId 
                ? (clienteActual.interacciones.find(i => i.id === interaccionId)?.fechaCreacion || new Date().toISOString())
                : new Date().toISOString()
        };
        
        // Validar datos
        if (!interaccion.nota) {
            mostrarError('La nota es obligatoria');
            return;
        }
        
        // Actualizar o agregar interacción
        if (clienteActual) {
            if (interaccionId) {
                // Actualizar interacción existente
                const index = clienteActual.interacciones.findIndex(i => i.id === interaccionId);
                if (index !== -1) {
                    clienteActual.interacciones[index] = interaccion;
                }
            } else {
                // Agregar nueva interacción
                clienteActual.interacciones.unshift(interaccion);
            }
            
            // Guardar cambios
            await window.electron.invoke('guardar-cliente', clienteActual);
            
            // Actualizar interfaz
            renderizarInteracciones();
            
            // Cerrar modal
            interaccionModal.hide();
            
            // Mostrar mensaje de éxito
            mostrarExito('Interacción guardada correctamente');
        }
        
    } catch (error) {
        console.error('Error al guardar la interacción:', error);
        mostrarError('Error al guardar la interacción');
    }
}

// Renderizar interacciones
function renderizarInteracciones() {
    if (!clienteActual) return;
    
    const interacciones = clienteActual.interacciones || [];
    
    if (interacciones.length === 0) {
        listaInteracciones.innerHTML = '<div class="text-muted">No hay interacciones registradas</div>';
        return;
    }
    
    listaInteracciones.innerHTML = '';
    
    interacciones.forEach(interaccion => {
        const fecha = new Date(interaccion.fecha);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const item = document.createElement('div');
        item.className = `interaccion-item ${interaccion.tipo} mb-2`;
        item.innerHTML = `
            <div class="d-flex justify-content-between">
                <strong class="text-capitalize">${interaccion.tipo}</strong>
                <small class="text-muted">${fechaFormateada}</small>
            </div>
            <div class="mt-1">${interaccion.nota}</div>
            <div class="mt-1 text-end">
                <button class="btn btn-sm btn-outline-secondary btn-editar-interaccion" data-id="${interaccion.id}">
                    <i class="bi bi-pencil"></i>
                </button>
            </div>
        `;
        
        // Agregar evento de edición
        const btnEditar = item.querySelector('.btn-editar-interaccion');
        if (btnEditar) {
            btnEditar.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btnEditar.getAttribute('data-id');
                const interaccion = clienteActual.interacciones.find(i => i.id === id);
                if (interaccion) {
                    mostrarFormularioInteraccion(interaccion);
                }
            });
        }
        
        listaInteracciones.appendChild(item);
    });
}

// Renderizar recordatorios
function renderizarRecordatorios() {
    if (!clienteActual) return;
    
    const recordatorios = clienteActual.recordatorios || [];
    const ahora = new Date();
    
    if (recordatorios.length === 0) {
        listaRecordatorios.innerHTML = '<div class="text-muted">No hay recordatorios programados</div>';
        return;
    }
    
    listaRecordatorios.innerHTML = '';
    
    recordatorios.forEach(recordatorio => {
        const fecha = new Date(recordatorio.fecha);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const esPasado = fecha < ahora;
        
        const item = document.createElement('div');
        item.className = `recordatorio-item fade-in ${esPasado ? 'pasado' : ''}`;
        item.innerHTML = `
            <div class="d-flex justify-content-between">
                <strong>${recordatorio.titulo}</strong>
                <small class="text-muted">${fechaFormateada}</small>
            </div>
            <div class="mt-1">${recordatorio.descripcion}</div>
        `;
        
        listaRecordatorios.appendChild(item);
    });
}

// Mostrar mensaje de error
function mostrarError(mensaje) {
    // Implementar lógica para mostrar mensajes de error
    console.error(mensaje);
    // Aquí podrías usar un toast o alerta bonita
    alert(`Error: ${mensaje}`);
}

// Mostrar mensaje de éxito
function mostrarExito(mensaje) {
    // Implementar lógica para mostrar mensajes de éxito
    console.log(mensaje);
    // Aquí podrías usar un toast o alerta bonita
    alert(`Éxito: ${mensaje}`);
}

// Exponer funciones al contexto global (necesario para algunos casos en Electron)
window.mostrarFormularioInteraccion = mostrarFormularioInteraccion;
