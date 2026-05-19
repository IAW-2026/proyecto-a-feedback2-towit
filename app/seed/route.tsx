import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_POSTGRES_URL!, { ssl: 'require' });

async function seedData() {
    // Agrega aquí inserts de datos de prueba cuando existan.
}

export async function POST() {
    try {
        await seedData();

        return Response.json({ message: 'Seed data endpoint is ready' });
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}

export async function GET() {
    return Response.json({ error: 'Use POST to seed the database' }, { status: 405 });
}