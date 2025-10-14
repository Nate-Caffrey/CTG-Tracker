import { db } from '../../utils/db';
import { defineEventHandler, createError } from 'h3';

function run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export default defineEventHandler(async (event) => {
    try {
        const sql = 'UPDATE Resources SET "group" = 0';
        
        await run(sql, []);

        return {
            statusCode: 200,
            message: 'Zurücksetzen erfolgreich.'
        };

    } catch (error) {
        console.error('Database reset failed:', error); 
        
        throw createError({
            statusCode: 500,
            statusMessage: 'Fehler beim Zurücksetzen.',
        });
    }
});
