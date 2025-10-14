import { db } from '../../utils/db';
import { defineEventHandler, getRouterParam, readBody, createError } from 'h3';

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
    const id = getRouterParam(event, 'id');
    const body = await readBody(event);
    const newGroup = body.group;

    if (!id || isNaN(Number(id))) {
        console.error('Invalid ID provided:', id);
        throw createError({ statusCode: 400, statusMessage: 'Ungültige Ressourcen ID.' });
    }
    
    if (newGroup === undefined || typeof newGroup !== 'number' || newGroup < 0 || !Number.isInteger(newGroup)) {
        console.error('Invalid group value provided:', newGroup);
        throw createError({ statusCode: 400, statusMessage: 'Ungültiger oder fehlender Gruppenwert.' });
    }
    
    const resourceId = Number(id);

    try {
        const sql = 'UPDATE Resources SET "group" = ? WHERE id = ?';
        await run(sql, [newGroup, resourceId]);

        return {
            statusCode: 200,
            message: `Aktualisierung erfolgreich.`
        };

    } catch (error) {
        console.error(`Database update for resource ID ${resourceId} failed:`, error); 
        throw createError({
            statusCode: 500,
            statusMessage: 'Fehler beim Aktualisieren.',
        });
    }
});
