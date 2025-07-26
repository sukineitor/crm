const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');
const { promisify } = require('util');

// Configurar la ruta de la base de datos en la carpeta de datos de la aplicación
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'crm-database.db');

// Crear una nueva conexión a la base de datos
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

// Convertir los métodos de callback a promesas
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Inicializar la base de datos con las tablas necesarias
async function inicializarBaseDeDatos() {
    console.log('Inicializando base de datos en:', dbPath);
    
    try {
        // Usar transacciones para asegurar la integridad de la base de datos
        await dbRun('BEGIN TRANSACTION');
        
        // Crear tabla de clientes si no existe
        await dbRun(`
            CREATE TABLE IF NOT EXISTS clientes (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                telefono TEXT,
                email TEXT,
                estado TEXT DEFAULT 'Nuevo',
                fecha_creacion TEXT DEFAULT (datetime('now')),
                fecha_modificacion TEXT DEFAULT (datetime('now')),
                notas TEXT
            )
        `);

        // Crear tabla de interacciones si no existe
        await dbRun(`
            CREATE TABLE IF NOT EXISTS interacciones (
                id TEXT PRIMARY KEY,
                cliente_id TEXT NOT NULL,
                tipo TEXT NOT NULL,
                descripcion TEXT,
                fecha TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
            )
        `);

        // Crear tabla de recordatorios si no existe
        await dbRun(`
            CREATE TABLE IF NOT EXISTS recordatorios (
                id TEXT PRIMARY KEY,
                cliente_id TEXT NOT NULL,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                fecha_recordatorio TEXT NOT NULL,
                completado INTEGER DEFAULT 0,
                FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
            )
        `);

        // Crear índices para mejorar el rendimiento de búsquedas
        await dbRun('CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado)');
        await dbRun('CREATE INDEX IF NOT EXISTS idx_interacciones_cliente ON interacciones(cliente_id)');
        await dbRun('CREATE INDEX IF NOT EXISTS idx_recordatorios_cliente ON recordatorios(cliente_id)');
        
        await dbRun('COMMIT');
        console.log('Base de datos inicializada correctamente');
    } catch (error) {
        await dbRun('ROLLBACK');
        console.error('Error al inicializar la base de datos:', error);
        throw error;
    }
}

// Función para ejecutar consultas con parámetros
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// Función para obtener un solo registro
function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

// Función para obtener múltiples registros
function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// Exportar las funciones de la base de datos
module.exports = {
    db,
    run: runQuery,
    get: getQuery,
    all: allQuery,
    inicializarBaseDeDatos
};
