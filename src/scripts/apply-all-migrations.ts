import { Pool } from 'pg';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

async function applyAllMigrations() {
  const connectionString = 
    process.env.DATABASE_URL || 
    'postgresql://postgres:postgres@localhost:5432/atom_dbro';

  const pool = new Pool({
    connectionString,
  });

  try {
    // Читаем журнал миграций из файла
    const journalPath = join(process.cwd(), 'drizzle', 'meta', '_journal.json');
    let journal: Journal | null = null;
    const appliedTags = new Set<string>();
    
    if (existsSync(journalPath)) {
      try {
        const journalContent = readFileSync(journalPath, 'utf-8');
        journal = JSON.parse(journalContent);
        if (journal?.entries) {
          journal.entries.forEach(entry => {
            appliedTags.add(entry.tag);
          });
          console.log(`📋 Найдено ${appliedTags.size} миграций в журнале`);
        }
      } catch (error) {
        console.warn('⚠️  Не удалось прочитать журнал миграций:', error);
      }
    }

    // Проверяем, какие миграции уже применены в БД
    const client = await pool.connect();
    
    try {
      // Создаем таблицу для отслеживания миграций в БД (для совместимости)
      await client.query(`
        CREATE TABLE IF NOT EXISTS drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash TEXT NOT NULL,
          created_at BIGINT
        )
      `);

      // Получаем список примененных миграций из БД (как дополнительную проверку)
      const appliedResult = await client.query('SELECT hash FROM drizzle_migrations');
      const appliedHashes = new Set(appliedResult.rows.map(row => row.hash));

      // Получаем список всех миграций из папки drizzle
      const drizzleDir = join(process.cwd(), 'drizzle');
      const files = readdirSync(drizzleDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Важно сортировать по имени для правильного порядка

      console.log(`📁 Найдено ${files.length} SQL файлов миграций`);

      let appliedCount = 0;
      let skippedCount = 0;

      for (const file of files) {
        const migrationPath = join(drizzleDir, file);
        const sql = readFileSync(migrationPath, 'utf-8');
        
        // Извлекаем имя миграции из файла (например, 0016_add_record_status.sql -> 0016_add_record_status)
        const tag = file.replace('.sql', '');
        const hash = file;

        // Проверяем, применена ли миграция (проверяем и по журналу, и по БД)
        if (appliedTags.has(tag) || appliedHashes.has(hash)) {
          console.log(`⏭️  Пропуск ${file} (уже применена)`);
          skippedCount++;
          continue;
        }

        console.log(`\n🔄 Применение миграции: ${file}`);

        try {
          await client.query('BEGIN');
          
          // Удаляем разделители drizzle-kit (PostgreSQL их игнорирует как комментарии)
          let cleanedSql = sql.replace(/--> statement-breakpoint/g, '');
          
          // Разделяем на команды по ';', но сохраняем целостность DO блоков
          const statements: string[] = [];
          let currentStatement = '';
          let inDoBlock = false;
          let dollarTag = '';
          
          const lines = cleanedSql.split('\n');
          
          for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            const trimmed = line.trim();
            
            // Пропускаем пустые строки и комментарии вне DO блоков
            if (!inDoBlock && (!trimmed || trimmed.startsWith('--'))) {
              continue;
            }
            
            // Проверяем начало DO блока (DO $$ или DO $tag$)
            if (!inDoBlock) {
              const doMatch = trimmed.match(/^DO\s+\$([a-zA-Z_]*)\$/i);
              if (doMatch) {
                inDoBlock = true;
                dollarTag = doMatch[1] ? `$${doMatch[1]}$` : '$$';
                currentStatement = line + '\n';
                continue;
              }
            }
            
            // Если в DO блоке
            if (inDoBlock) {
              currentStatement += line + '\n';
              
              // Проверяем конец DO блока: $$; или $tag$;
              if (trimmed.endsWith(`${dollarTag};`)) {
                inDoBlock = false;
                statements.push(currentStatement.trim());
                currentStatement = '';
                dollarTag = '';
              }
              continue;
            }
            
            // Обычная SQL команда
            currentStatement += line + '\n';
            
            // Если строка заканчивается на ';', это конец команды
            if (trimmed.endsWith(';')) {
              const stmt = currentStatement.trim();
              if (stmt && stmt !== ';') {
                statements.push(stmt);
              }
              currentStatement = '';
            }
          }
          
          // Добавляем последнюю команду, если есть
          if (currentStatement.trim()) {
            statements.push(currentStatement.trim());
          }

          // Выполняем команды
          console.log(`   Выполнение ${statements.length} SQL команд...`);
          for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement && statement.trim()) {
              try {
                await client.query(statement);
              } catch (error: any) {
                // Игнорируем некоторые ошибки (например, если колонка уже существует)
                const errorMsg = error.message || '';
                if (errorMsg.includes('already exists') || 
                    errorMsg.includes('duplicate_object') ||
                    (errorMsg.includes('does not exist') && errorMsg.includes('information_schema'))) {
                  // Это нормально для IF NOT EXISTS проверок
                  console.log(`   ⚠️  Предупреждение: ${errorMsg.substring(0, 120)}`);
                } else {
                  console.error(`   ❌ Ошибка в команде ${i + 1}:`, errorMsg);
                  throw error;
                }
              }
            }
          }

          // Сохраняем информацию о примененной миграции в БД
          // Добавляем UNIQUE constraint для hash, если его нет
          try {
            await client.query('ALTER TABLE drizzle_migrations ADD CONSTRAINT drizzle_migrations_hash_unique UNIQUE (hash)');
          } catch (e: any) {
            // Игнорируем, если constraint уже существует
            if (!e.message?.includes('already exists')) {
              // Игнорируем другие ошибки
            }
          }
          
          await client.query(
            'INSERT INTO drizzle_migrations (hash, created_at) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING',
            [hash, Date.now()]
          );

          // Добавляем в журнал примененных миграций (в памяти)
          appliedTags.add(tag);
          appliedHashes.add(hash);

          await client.query('COMMIT');
          console.log(`✅ Миграция ${file} успешно применена!`);
          appliedCount++;
        } catch (error: any) {
          await client.query('ROLLBACK');
          console.error(`❌ Ошибка при применении миграции ${file}:`, error.message);
          throw error;
        }
      }

      console.log(`\n📊 Итого: применено ${appliedCount}, пропущено ${skippedCount}`);
      
      if (appliedCount === 0 && skippedCount === files.length) {
        console.log('✨ Все миграции уже применены!');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Ошибка при применении миграций:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyAllMigrations();

