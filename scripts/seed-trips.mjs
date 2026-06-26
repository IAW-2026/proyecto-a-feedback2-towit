import postgres from 'postgres';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const idsFilePath = resolve(projectRoot, 'scripts', 'seed', 'trips.ids.json');

// Carga variables desde un archivo .env* en process.env sin pisar las que ya están
// definidas en el entorno. Soporta comentarios, líneas vacías y valores entre comillas.
function loadEnvFile(filePath) {
    if (!existsSync(filePath)) {
        return;
    }

    const content = readFileSync(filePath, 'utf8');

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line || line.startsWith('#')) {
            continue;
        }

        const eqIdx = line.indexOf('=');

        if (eqIdx === -1) {
            continue;
        }

        const key = line.slice(0, eqIdx).trim();

        if (!key) {
            continue;
        }

        let value = line.slice(eqIdx + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

loadEnvFile(resolve(projectRoot, '.env.local'));
loadEnvFile(resolve(projectRoot, '.env'));

const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
    throw new Error('POSTGRES_URL is not defined');
}

const TRIP_COUNT = 30;
const RECENT_DAYS = 30;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;

function loadClerkIds() {
    if (!existsSync(idsFilePath)) {
        throw new Error(`IDs file not found: ${idsFilePath}`);
    }

    const raw = readFileSync(idsFilePath, 'utf8');
    const parsed = JSON.parse(raw);

    const customers = Array.isArray(parsed.customers) ? parsed.customers : [];
    const towers = Array.isArray(parsed.towers) ? parsed.towers : [];

    return { customers, towers };
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function randomDateWithinLastDays(days) {
    const now = Date.now();
    const ms = days * 24 * 60 * 60 * 1000;
    const offset = Math.floor(Math.random() * ms);
    return new Date(now - offset);
}

function formatDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(date) {
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const second = String(date.getUTCSeconds()).padStart(2, '0');
    return `${hour}:${minute}:${second}`;
}

function randomTimeBetween(startHour, endHour) {
    const startMs = startHour * 60 * 60 * 1000;
    const endMs = endHour * 60 * 60 * 1000;
    const offset = Math.floor(Math.random() * (endMs - startMs));
    return new Date(offset + startMs);
}

function buildTrips(customers, towers) {
    const trips = [];

    for (let i = 0; i < TRIP_COUNT; i += 1) {
        const dayStamp = randomDateWithinLastDays(RECENT_DAYS);
        const timeStamp = randomTimeBetween(DAY_START_HOUR, DAY_END_HOUR);

        trips.push({
            customer_id: pickRandom(customers),
            tower_id: pickRandom(towers),
            vehicle: `Vehicle ${i + 1}`,
            date: formatDate(dayStamp),
            time: formatTime(timeStamp),
        });
    }

    return trips;
}

async function main() {
    const { customers, towers } = loadClerkIds();

    if (customers.length === 0 || towers.length === 0) {
        console.warn(
            `[seed-trips] No hay IDs de customers o towers en ${idsFilePath}. ` +
                'Completa el archivo y vuelve a ejecutar.',
        );
        return;
    }

    const sql = postgres(databaseUrl, { ssl: 'require' });

    try {
        const trips = buildTrips(customers, towers);

        const inserted = await sql.begin(async (transaction) => {
            return transaction`
                INSERT INTO trips ${transaction(
                    trips,
                    'customer_id',
                    'tower_id',
                    'vehicle',
                    'date',
                    'time',
                )}
                RETURNING trip_id
            `;
        });

        console.log(`[seed-trips] Inserted ${inserted.length} trips`);

        const sample = inserted.slice(0, 3).map((row) => row.trip_id);
        console.log(`[seed-trips] Sample trip_ids: ${sample.join(', ')}`);
    } finally {
        await sql.end({ timeout: 5 });
    }
}

main().catch((error) => {
    console.error('[seed-trips] Seeding failed');
    console.error(error);
    process.exitCode = 1;
});
