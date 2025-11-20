import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

function splitSQL(sql: string): string[] {
  // Удаляем комментарии-разделители drizzle-kit
  let cleanedSql = sql.replace(/--> statement-breakpoint/g, '');
  
  // Разделяем SQL на отдельные команды по точке с запятой
  // Но нужно быть осторожным с DO $$ блоками
  const statements: string[] = [];
  let currentStatement = '';
  let inDoBlock = false;
  let dollarQuote = '';
  
  const lines = cleanedSql.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Проверяем начало DO блока
    if (/^DO\s+\$\$/.test(trimmed) || /^DO\s+\$[a-zA-Z_]*\$$/.test(trimmed)) {
      inDoBlock = true;
      // Извлекаем кавычку доллара ($$ или $tag$)
      const match = trimmed.match(/\$([a-zA-Z_]*)\$/);
      if (match) {
        dollarQuote = '$' + (match[1] || '') + '$';
      } else {
        dollarQuote = '$$';
      }
      currentStatement += line + '\n';
      continue;
    }
    
    // Проверяем конец DO блока
    if (inDoBlock && trimmed.endsWith(dollarQuote + ';')) {
      inDoBlock = false;
      currentStatement += line;
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      currentStatement = '';
      dollarQuote = '';
      continue;
    }
    
    // Если мы в DO блоке, просто добавляем строку
    if (inDoBlock) {
      currentStatement += line + '\n';
      continue;
    }
    
    // Обычная команда SQL
    currentStatement += line + '\n';
    
    // Если строка заканчивается на ; и не пустая, это конец команды
    if (trimmed.endsWith(';') && currentStatement.trim().length > 1) {
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      currentStatement = '';
    }
  }
  
  // Добавляем последнюю команду, если она есть
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  // Фильтруем пустые команды и однострочные комментарии
  return statements.filter(stmt => {
    const trimmed = stmt.trim();
    return trimmed.length > 0 && 
           !trimmed.startsWith('--') && 
           trimmed !== ';';
  });
}

async function applyMigration(migrationFile: string) {
  const connectionString = 
    process.env.DATABASE_URL || 
    'postgresql://postgres:postgres@localhost:5432/atom_dbro';

  const pool = new Pool({
    connectionString,
  });

  try {
    console.log(`Применение миграции: ${migrationFile}`);
    
    // Используем process.cwd() для получения корня проекта
    // Это работает как при запуске через ts-node, так и в скомпилированном виде
    const migrationPath = join(process.cwd(), 'drizzle', migrationFile);
    console.log(`Путь к миграции: ${migrationPath}`);
    const sqlContent = readFileSync(migrationPath, 'utf-8');
    
    // Разделяем SQL на отдельные команды
    const statements = splitSQL(sqlContent);
    console.log(`Найдено SQL команд: ${statements.length}`);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          console.log(`Выполнение команды ${i + 1}/${statements.length}...`);
          try {
            await client.query(statement);
          } catch (error: any) {
            console.error(`Ошибка в команде ${i + 1}:`, error.message);
            console.error(`SQL команда:`, statement.substring(0, 200) + '...');
            throw error;
          }
        }
      }
      
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

