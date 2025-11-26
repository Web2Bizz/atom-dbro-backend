-- Миграция для добавления поля type в каждый этап steps квестов
-- Допустимые значения: no_required, finance, contributers, material
-- По умолчанию устанавливаем no_required, если поле отсутствует

DO $$
DECLARE
    quest_record RECORD;
    updated_steps JSONB;
    step_item JSONB;
    step_index INT;
BEGIN
    -- Проходим по всем квестам, у которых есть steps как JSON-массив
    FOR quest_record IN 
        SELECT id, steps 
        FROM quests 
        WHERE steps IS NOT NULL AND jsonb_typeof(steps) = 'array'
    LOOP
        updated_steps := quest_record.steps;
        
        -- Проходим по каждому этапу в steps
        FOR step_index IN 0..jsonb_array_length(updated_steps) - 1 LOOP
            step_item := updated_steps->step_index;
            
            -- Если у этапа нет поля type, добавляем его со значением no_required
            IF NOT (step_item ? 'type') OR step_item->'type' IS NULL THEN
                step_item := jsonb_set(
                    step_item,
                    '{type}',
                    to_jsonb('no_required'::text),
                    true
                );
                
                -- Обновляем этап в массиве steps
                updated_steps := jsonb_set(
                    updated_steps,
                    ARRAY[step_index::text],
                    step_item
                );
            END IF;
        END LOOP;
        
        -- Обновляем квест с новыми steps
        UPDATE quests 
        SET steps = updated_steps, updated_at = NOW()
        WHERE id = quest_record.id;
    END LOOP;
    
    RAISE NOTICE 'Миграция добавления поля type в steps квестов завершена';
END $$;
--> statement-breakpoint


