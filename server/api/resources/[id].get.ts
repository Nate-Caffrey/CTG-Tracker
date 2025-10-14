import { all } from '../../utils/db';
import { defineEventHandler, getRouterParam, createError } from 'h3';

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id');

    if (!id || isNaN(Number(id))) {
        console.error('Invalid ID provided:', id);
        throw createError({
            statusCode: 400,
            statusMessage: 'Ungültige Ressourcen ID.',
        });
    }

    try {
        const sql = 'SELECT id, location, "group" FROM Resources WHERE id = ?';
        const resource = await all(sql, [id]);

        if (resource.length === 0) {
            console.error(`Resource with ID ${id} not found.`);
            throw createError({
                statusCode: 404,
                statusMessage: `Ressource nicht gefunden`,
            });
        }

        return {
            statusCode: 200,
            data: resource[0]
        };
        
    } catch (error) {
        console.error(`Database fetch for resource ID ${id} failed:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Fehler beim Abrufen der Ressource',
            data: error,
        });
    }
});