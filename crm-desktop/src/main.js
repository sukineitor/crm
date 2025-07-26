const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { run, get, all, inicializarBaseDeDatos } = require('./database/database');

// Inicializar la base de datos al iniciar la aplicación
let dbInitialized = false;

async function initializeApp() {
    try {
        await inicializarBaseDeDatos();
        dbInitialized = true;
        console.log('Aplicación inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        // Mostrar un mensaje de error al usuario
        if (mainWindow) {
            mainWindow.webContents.send('app-error', 'No se pudo inicializar la base de datos. La aplicación podría no funcionar correctamente.');
        }
    }
}

// Inicializar la aplicación
initializeApp();

let mainWindow;

function createWindow() {
  console.log('Creando ventana principal...');
  
  try {
    // Crear la ventana del navegador
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: false, // Solo para desarrollo
        devTools: true      // Habilitar herramientas de desarrollo
      },
      show: false // No mostrar la ventana hasta que esté lista
    });

    // Cargar el archivo HTML principal
    mainWindow.loadFile(path.join(__dirname, 'views/index.html'))
      .then(() => {
        console.log('Archivo index.html cargado correctamente');
        mainWindow.show(); // Mostrar la ventana cuando esté lista
        
        // Solo abrir herramientas de desarrollo en entorno de desarrollo
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
      })
      .catch(err => {
        console.error('Error al cargar el archivo index.html:', err);
      });
      
    // Manejar errores de la ventana
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Error al cargar la ventana:', errorCode, errorDescription);
    });
    
    mainWindow.on('unresponsive', () => {
      console.error('La ventana no responde');
    });
    
    mainWindow.on('crashed', () => {
      console.error('La ventana se ha cerrado inesperadamente');
    });
    
  } catch (error) {
    console.error('Error al crear la ventana:', error);
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Eventos de la aplicación
app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// IPC Handlers
ipcMain.handle('obtener-clientes', async () => {
  if (!dbInitialized) {
    console.error('La base de datos no está inicializada');
    return [];
  }
  try {
    return await all('SELECT * FROM clientes ORDER BY nombre');
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return [];
  }
});

ipcMain.handle('obtener-cliente', async (event, id) => {
  if (!dbInitialized) {
    console.error('La base de datos no está inicializada');
    return null;
  }
  try {
    return await get('SELECT * FROM clientes WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return null;
  }
});

ipcMain.handle('guardar-cliente', async (event, cliente) => {
  if (!dbInitialized) {
    throw new Error('La base de datos no está inicializada');
  }
  
  const ahora = new Date().toISOString();
  
  try {
    // Verificar si el cliente ya existe
    const clienteExistente = await get('SELECT id FROM clientes WHERE id = ?', [cliente.id]);
    
    if (clienteExistente) {
      // Actualizar cliente existente
      await run(
        `UPDATE clientes 
         SET nombre = ?, telefono = ?, email = ?, estado = ?, fecha_modificacion = ?, notas = ?
         WHERE id = ?`,
        [
          cliente.nombre,
          cliente.telefono || null,
          cliente.email || null,
          cliente.estado || 'Nuevo',
          ahora,
          cliente.notas || null,
          cliente.id
        ]
      );
    } else {
      // Insertar nuevo cliente
      await run(
        `INSERT INTO clientes (id, nombre, telefono, email, estado, fecha_creacion, fecha_modificacion, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cliente.id,
          cliente.nombre,
          cliente.telefono || null,
          cliente.email || null,
          cliente.estado || 'Nuevo',
          ahora,
          ahora,
          cliente.notas || null
        ]
      );
    }
    
    // Devolver el cliente actualizado
    return await get('SELECT * FROM clientes WHERE id = ?', [cliente.id]);
  } catch (error) {
    console.error('Error al guardar cliente:', error);
    throw new Error('No se pudo guardar el cliente: ' + error.message);
  }
});

ipcMain.handle('eliminar-cliente', async (event, id) => {
  if (!dbInitialized) {
    throw new Error('La base de datos no está inicializada');
  }
  
  try {
    // Usar transacción para asegurar la integridad referencial
    await run('BEGIN TRANSACTION');
    
    // Eliminar interacciones primero (aunque ON DELETE CASCADE debería funcionar)
    await run('DELETE FROM interacciones WHERE cliente_id = ?', [id]);
    
    // Eliminar recordatorios
    await run('DELETE FROM recordatorios WHERE cliente_id = ?', [id]);
    
    // Finalmente, eliminar el cliente
    await run('DELETE FROM clientes WHERE id = ?', [id]);
    
    await run('COMMIT');
    return true;
  } catch (error) {
    await run('ROLLBACK');
    console.error('Error al eliminar cliente:', error);
    throw new Error('No se pudo eliminar el cliente: ' + error.message);
  }
});

ipcMain.handle('obtener-estados', async () => {
  return ['Nuevo', 'Contactado', 'Interesado', 'Cliente', 'Inactivo'];
});

// Buscar cliente por teléfono
ipcMain.handle('buscar-cliente-por-telefono', async (event, telefono) => {
  if (!dbInitialized) {
    console.error('La base de datos no está inicializada');
    return null;
  }
  
  if (!telefono) {
    return null;
  }
  
  try {
    return await get('SELECT * FROM clientes WHERE telefono = ?', [telefono]);
  } catch (error) {
    console.error('Error al buscar cliente por teléfono:', error);
    return null;
  }
});

// Manejadores para interacciones
ipcMain.handle('obtener-interacciones', async (event, clienteId) => {
  if (!dbInitialized) {
    console.error('La base de datos no está inicializada');
    return [];
  }
  
  try {
    return await all('SELECT * FROM interacciones WHERE cliente_id = ? ORDER BY fecha DESC', [clienteId]);
  } catch (error) {
    console.error('Error al obtener interacciones:', error);
    return [];
  }
});

ipcMain.handle('guardar-interaccion', async (event, interaccion) => {
  if (!dbInitialized) {
    throw new Error('La base de datos no está inicializada');
  }
  
  const ahora = new Date().toISOString();
  
  try {
    if (interaccion.id) {
      // Actualizar interacción existente
      await run(
        `UPDATE interacciones 
         SET tipo = ?, descripcion = ?, fecha = ?
         WHERE id = ?`,
        [
          interaccion.tipo,
          interaccion.descripcion,
          interaccion.fecha || ahora,
          interaccion.id
        ]
      );
    } else {
      // Insertar nueva interacción
      const id = require('crypto').randomUUID();
      await run(
        `INSERT INTO interacciones (id, cliente_id, tipo, descripcion, fecha)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          interaccion.cliente_id,
          interaccion.tipo,
          interaccion.descripcion,
          interaccion.fecha || ahora
        ]
      );
      interaccion.id = id;
    }
    
    // Actualizar la fecha de modificación del cliente
    await run(
      'UPDATE clientes SET fecha_modificacion = ? WHERE id = ?',
      [ahora, interaccion.cliente_id]
    );
    
    return interaccion;
  } catch (error) {
    console.error('Error al guardar interacción:', error);
    throw new Error('No se pudo guardar la interacción: ' + error.message);
  }
});

// Manejadores para recordatorios
ipcMain.handle('obtener-recordatorios', async (event, clienteId) => {
  if (!dbInitialized) {
    console.error('La base de datos no está inicializada');
    return [];
  }
  
  try {
    return await all('SELECT * FROM recordatorios WHERE cliente_id = ? ORDER BY fecha_recordatorio', [clienteId]);
  } catch (error) {
    console.error('Error al obtener recordatorios:', error);
    return [];
  }
});

ipcMain.handle('guardar-recordatorio', async (event, recordatorio) => {
  if (!dbInitialized) {
    throw new Error('La base de datos no está inicializada');
  }
  
  const ahora = new Date().toISOString();
  
  try {
    if (recordatorio.id) {
      // Actualizar recordatorio existente
      await run(
        `UPDATE recordatorios 
         SET titulo = ?, descripcion = ?, fecha_recordatorio = ?, completado = ?
         WHERE id = ?`,
        [
          recordatorio.titulo,
          recordatorio.descripcion || null,
          recordatorio.fecha_recordatorio,
          recordatorio.completado ? 1 : 0,
          recordatorio.id
        ]
      );
    } else {
      // Insertar nuevo recordatorio
      const id = require('crypto').randomUUID();
      await run(
        `INSERT INTO recordatorios (id, cliente_id, titulo, descripcion, fecha_recordatorio, completado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          recordatorio.cliente_id,
          recordatorio.titulo,
          recordatorio.descripcion || null,
          recordatorio.fecha_recordatorio,
          recordatorio.completado ? 1 : 0
        ]
      );
      recordatorio.id = id;
    }
    
    // Actualizar la fecha de modificación del cliente
    await run(
      'UPDATE clientes SET fecha_modificacion = ? WHERE id = ?',
      [ahora, recordatorio.cliente_id]
    );
    
    return recordatorio;
  } catch (error) {
    console.error('Error al guardar recordatorio:', error);
    throw new Error('No se pudo guardar el recordatorio: ' + error.message);
  }
});

ipcMain.handle('eliminar-recordatorio', async (event, id) => {
  if (!dbInitialized) {
    throw new Error('La base de datos no está inicializada');
  }
  
  try {
    // Primero obtener el cliente_id para actualizar su fecha de modificación
    const recordatorio = await get('SELECT cliente_id FROM recordatorios WHERE id = ?', [id]);
    
    if (recordatorio && recordatorio.cliente_id) {
      // Eliminar el recordatorio
      await run('DELETE FROM recordatorios WHERE id = ?', [id]);
      
      // Actualizar la fecha de modificación del cliente
      await run(
        'UPDATE clientes SET fecha_modificacion = ? WHERE id = ?',
        [new Date().toISOString(), recordatorio.cliente_id]
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error al eliminar recordatorio:', error);
    throw new Error('No se pudo eliminar el recordatorio: ' + error.message);
  }
});
