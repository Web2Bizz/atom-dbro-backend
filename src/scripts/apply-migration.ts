import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration(migrationFile: string) {
  const connectionString = 
    process.env.DATABASE_URL || 
    'postgresql://postgres:postgres@localhost:5432/atom_dbro';

  const pool = new Pool({
    connectionString,
  });

  try {
    console.log(`Применение миграции: ${migrationFile}`);
    
    const migrationPath = join(__dirname, '../../drizzle', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Миграция успешно применена!');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Ошибка при применении миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Использование: ts-node src/scripts/apply-migration.ts <имя_файла_миграции>');
  console.error('Пример: ts-node src/scripts/apply-migration.ts 0006_fix_quest_types.sql');
  process.exit(1);
}

applyMigration(migrationFile);

