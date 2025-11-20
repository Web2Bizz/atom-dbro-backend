import { Pool } from 'pg';

/**
 * Скрипт для исправления quest_id в таблице users
 * Преобразует все значения в массивы:
 * - NULL -> []
 * - integer -> [integer]
 * - integer[] -> оставляет как есть
 */
async function fixQuestIdArray() {
  const connectionString = 
    process.env.DATABASE_URL || 
    'postgresql://postgres:postgres@localhost:5432/atom_dbro';

  const pool = new Pool({
    connectionString,
  });

  const client = await pool.connect();

  try {
    console.log('🔍 Проверяю текущее состояние колонки quest_id...');

    // Проверяем тип колонки
    const typeCheck = await client.query(`
      SELECT data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'quest_id';
    `);

    if (typeCheck.rows.length === 0) {
      console.log('⚠️  Колонка quest_id не найдена в таблице users');
      return;
    }

    const currentType = typeCheck.rows[0].data_type;
    console.log(`📊 Текущий тип колонки: ${currentType}`);
    console.log(`📊 Значение по умолчанию: ${typeCheck.rows[0].column_default || 'не установлено'}`);

    // Проверяем, есть ли записи с проблемными значениями
    const problemCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE quest_id IS NULL;
    `);
    console.log(`📊 Записей с NULL: ${problemCheck.rows[0].count}`);

    // Если колонка еще integer, преобразуем её
    if (currentType === 'integer') {
      console.log('🔄 Преобразую колонку из integer в integer[]...');
      
      // Удаляем внешний ключ, если есть
      await client.query(`
        ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_quest_id_quests_id_fk";
      `);

      // Преобразуем данные: integer -> массив, NULL -> пустой массив
      const updateResult = await client.query(`
        UPDATE "users" 
        SET "quest_id" = CASE 
          WHEN "quest_id" IS NOT NULL THEN ARRAY["quest_id"]::integer
          ELSE ARRAY[]::integer[]
        END;
      `);
      console.log(`✅ Обновлено записей: ${updateResult.rowCount}`);

      // Изменяем тип колонки
      await client.query(`
        ALTER TABLE "users" ALTER COLUMN "quest_id" TYPE integer[] USING 
          CASE 
            WHEN "quest_id" IS NOT NULL THEN ARRAY["quest_id"]::integer
            ELSE ARRAY[]::integer[]
          END;
      `);
      console.log('✅ Тип колонки изменен на integer[]');

      // Устанавливаем значение по умолчанию
      await client.query(`
        ALTER TABLE "users" ALTER COLUMN "quest_id" SET DEFAULT ARRAY[]::integer[];
      `);
      console.log('✅ Значение по умолчанию установлено');
    } else if (currentType === 'ARRAY') {
      console.log('🔄 Колонка уже имеет тип integer[], обновляю NULL значения...');
      
      // Обновляем все NULL значения на пустой массив
      const updateResult = await client.query(`
        UPDATE "users" 
        SET "quest_id" = ARRAY[]::integer[]
        WHERE "quest_id" IS NULL;
      `);
      console.log(`✅ Обновлено NULL значений: ${updateResult.rowCount}`);

      // Устанавливаем значение по умолчанию, если его нет
      if (!typeCheck.rows[0].column_default) {
        await client.query(`
          ALTER TABLE "users" ALTER COLUMN "quest_id" SET DEFAULT ARRAY[]::integer[];
        `);
        console.log('✅ Значение по умолчанию установлено');
      }
    } else {
      console.log(`⚠️  Неожиданный тип колонки: ${currentType}`);
      console.log('💡 Попробуйте применить миграцию 0017_rainy_thunderball.sql');
      return;
    }

    // Проверяем результат
    const finalCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN quest_id IS NULL THEN 1 END) as null_count,
        COUNT(CASE WHEN quest_id = ARRAY[]::integer[] THEN 1 END) as empty_array_count,
        COUNT(CASE WHEN array_length(quest_id, 1) > 0 THEN 1 END) as non_empty_count
      FROM users;
    `);
    
    const stats = finalCheck.rows[0];
    console.log('\n📊 Итоговая статистика:');
    console.log(`   Всего записей: ${stats.total}`);
    console.log(`   NULL значений: ${stats.null_count}`);
    console.log(`   Пустых массивов: ${stats.empty_array_count}`);
    console.log(`   Непустых массивов: ${stats.non_empty_count}`);

    if (parseInt(stats.null_count) > 0) {
      console.log('\n⚠️  ВНИМАНИЕ: Все еще есть NULL значения!');
      console.log('💡 Возможно, нужно проверить ограничения или триггеры в БД');
    } else {
      console.log('\n✅ Все значения успешно преобразованы в массивы!');
    }

  } catch (error) {
    console.error('❌ Ошибка при обновлении quest_id:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Запускаем скрипт
fixQuestIdArray()
  .then(() => {
    console.log('\n✨ Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });

