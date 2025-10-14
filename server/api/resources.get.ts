import { all } from '../utils/db';
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
    try {
        const sql = 'SELECT id, location, "group" FROM Resources';
        const resources = await all(sql);

        return {
            statusCode: 200,
            data: resources
        };
    } catch (error) {
        console.error('Database fetch for all resources failed:', error);

        throw createError({
            statusCode: 500,
            statusMessage: 'Fehler beim Abrufen der Ressourcen',
        });
    }
});