import { Pool } from 'pg';

async function checkRecordStatus() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/atom_dbro';
  const pool = new Pool({ connectionString });

  try {
    const tables = ['organizations', 'cities', 'organization_types'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'record_status'
      `, [table]);
      
      if (result.rows.length === 0) {
        console.log(`❌ Таблица ${table}: колонка record_status НЕ существует`);
      } else {
        const col = result.rows[0];
        console.log(`✅ Таблица ${table}: колонка record_status существует`);
        console.log(`   Тип: ${col.data_type}, NULL: ${col.is_nullable}, Default: ${col.column_default}`);
        
        // Проверяем NULL значения
        const nullCheck = await pool.query(`
          SELECT COUNT(*) as null_count
          FROM ${table}
          WHERE record_status IS NULL
        `);
        console.log(`   Записей с NULL: ${nullCheck.rows[0].null_count}`);
      }
    }
    
    // Проверяем общее количество записей
    for (const table of tables) {
      const count = await pool.query(`SELECT COUNT(*) as total FROM ${table}`);
      console.log(`\nТаблица ${table}: всего записей ${count.rows[0].total}`);
    }
    
  } catch (error: any) {
    console.error('Ошибка при проверке:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkRecordStatus();

