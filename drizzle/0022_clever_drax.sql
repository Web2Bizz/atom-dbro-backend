-- Добавление поля is_approved в таблицу organizations
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'is_approved') THEN
		-- Добавляем колонку с значением по умолчанию false и NOT NULL
		ALTER TABLE "organizations" ADD COLUMN "is_approved" boolean DEFAULT false NOT NULL;
		RAISE NOTICE 'Колонка is_approved добавлена в таблицу organizations со значением по умолчанию false';
	ELSE
		RAISE NOTICE 'Колонка is_approved уже существует в таблице organizations';
	END IF;
END $$;
--> statement-breakpoint

-- Установка значения false для существующих записей, если значение NULL
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'is_approved') THEN
		UPDATE "organizations" SET "is_approved" = false WHERE "is_approved" IS NULL;
		RAISE NOTICE 'Значения NULL обновлены на false';
	END IF;
END $$;
--> statement-breakpoint

-- Установка значения по умолчанию false для новых записей (всегда применяем, если колонка существует)
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'is_approved') THEN
		ALTER TABLE "organizations" ALTER COLUMN "is_approved" SET DEFAULT false;
		RAISE NOTICE 'Значение по умолчанию false установлено для колонки is_approved';
	END IF;
END $$;
--> statement-breakpoint

-- Установка NOT NULL ограничения для is_approved, если его еще нет
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'is_approved' AND is_nullable = 'YES') THEN
		-- Сначала устанавливаем false для всех NULL значений
		UPDATE "organizations" SET "is_approved" = false WHERE "is_approved" IS NULL;
		-- Затем устанавливаем NOT NULL
		ALTER TABLE "organizations" ALTER COLUMN "is_approved" SET NOT NULL;
		RAISE NOTICE 'Ограничение NOT NULL установлено для колонки is_approved';
	END IF;
END $$;