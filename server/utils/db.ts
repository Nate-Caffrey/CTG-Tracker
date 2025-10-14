import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Not connected to SQLite at:', dbPath);
        console.error('Error details:', err.message);

    } else {
        console.log('Connected to SQLite at:', dbPath);
    }
});

// Helper-Funktion, um SQLite-Aufrufe in Promises zu verpacken (unverändert)
function all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export { db, all };