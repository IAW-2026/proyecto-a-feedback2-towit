import postgres from 'postgres';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = resolve(projectRoot, 'migrations');

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

const sql = postgres(databaseUrl, { ssl: 'require' });

async function ensureMigrationsTable() {
    await sql`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
}

async function getAppliedMigrations() {
    const rows = await sql`
        SELECT name
        FROM schema_migrations
        ORDER BY name;
    `;

    return new Set(rows.map((row) => row.name));
}

async function getMigrationFiles() {
    const files = await readdir(migrationsDir);

    return files
        .filter((file) => file.endsWith('.sql'))
        .sort((left, right) => left.localeCompare(right));
}

async function runMigration(fileName) {
    const filePath = resolve(migrationsDir, fileName);
    const migrationSql = await readFile(filePath, 'utf8');

    await sql.begin(async (transaction) => {
        await transaction.unsafe(migrationSql);
        await transaction`
            INSERT INTO schema_migrations (name)
            VALUES (${fileName});
        `;
    });

    console.log(`Applied ${fileName}`);
}

async function main() {
    await ensureMigrationsTable();

    const appliedMigrations = await getAppliedMigrations();
    const migrationFiles = await getMigrationFiles();
    const pendingMigrations = migrationFiles.filter((file) => !appliedMigrations.has(file));

    if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
    }

    for (const fileName of pendingMigrations) {
        await runMigration(fileName);
    }

    console.log('Migrations completed successfully');
}

main().catch((error) => {
    console.error('Migration failed');
    console.error(error);
    process.exitCode = 1;
}).finally(async () => {
    await sql.end({ timeout: 5 });
});