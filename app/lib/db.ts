import postgres from 'postgres'

const databaseUrl = process.env.POSTGRES_URL

if (!databaseUrl) {
  throw new Error('POSTGRES_URL is not defined')
}

export const sql = postgres(databaseUrl, { ssl: 'require' , prepare: false})
