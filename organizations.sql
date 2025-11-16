-- SQL запросы для вставки организаций
-- Сгенерировано автоматически из JSON файла

BEGIN;

-- Организация 1: ОО ТОС АГО "12а микрорайон"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'ОО ТОС АГО "12а микрорайон"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Ангарск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    2,
    52.5444,
    103.8883,
    'Повышение качества жизни жителей 12а микрорайона г.Ангарска Иркутской области',
    'Благоустройство и содержании территории, организация культурных, спортивных и социально значимых мероприятий',
    'Повышение качества жизни жителей 12а микрорайона г.Ангарска Иркутской области ( Благоустройство и содержании территории, организация культурных, спортивных и социально значимых мероприятий, взаимодействие с органами власти для учёта мнения жителей, , экологии и социальной помощи.',
    '["Физическая зарядка для пенсионеров каждый четверг","Каждую пятницу тренировки по скандинавской ходьбе для всех возрастов","До 30.10.2025 установка детской эко-площадки и открытие площадки","Раз в месяц встречи с жителями по обсуждению проблем на территории и пути решения"]'::jsonb,
    '["Жители микрорайона 12А (социально незащищенные группы: пенсионеры, инвалиды, многодетные семьи, малоимущие и д.р. дети и молодежь, собственники жилья.)"]'::jsonb,
    'г. Ангарск',
    '[{"name":"ВКонтакте","value":"https://vk.com/id746471055"}]'::jsonb,
    '["https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800","https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 8, 10, 13, 16, 19, 21])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 2: Благотворительный общественно полезный фонд помощи социально незащищенным слоям населения "Платформа добрых дел"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'Благотворительный общественно полезный фонд помощи социально незащищенным слоям населения "Платформа добрых дел"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Волгодонск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    4,
    47.5167,
    42.15,
    'Благотворительный общественно полезный фонд помощи социально незащищенным слоям населения «Платформа добрых дел»',
    'Помощь социально незащищенным слоям населения',
    'Благотворительный общественно полезный фонд помощи социально незащищенным слоям населения «Платформа добрых дел». Основной вид деятельности (ОКВЭД) 64.99',
    NULL,
    '["молодые люди с инвалидностью старше 18 лет, граждане старшего возраста (пенсионного)"]'::jsonb,
    'г. Волгодонск',
    NULL,
    '["https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800","https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[7, 14, 19, 20])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 3: МБУ "Молодежный центр"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'МБУ "Молодежный центр"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Глазов')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    2,
    58.1333,
    52.6667,
    'Консультирование и регистрация на площадке «Добро.РФ», проведение "Школы волонтеров"',
    'Развитие добровольчества, благотворительности и гражданских инициатив',
    'Консультирование и регистрация на площадке «Добро.РФ». Проведение "Школы волонтеров". Формирование и сопровождение волонтерских корпусов (например, на общегородских мероприятиях, федеральных проектах (Формирование комфортной городской среды). Информирование граждан и организаторов о развитии добровольчества, благотворительности и гражданских инициатив (индивидуально)',
    NULL,
    '["Молодежь в возрасте от 14 до 35 лет"]'::jsonb,
    'г. Глазов',
    '[{"name":"ВКонтакте","value":"https://vk.com/mcglazov"}]'::jsonb,
    '["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800","https://images.unsplash.com/photo-1552664730-d307ca884978?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 9, 21])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 4: Культурная база "Короленко 8" (МБУ "ЦМиТО УКСиМП")
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'Культурная база "Короленко 8" (МБУ "ЦМиТО УКСиМП")',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Глазов')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    9,
    58.1333,
    52.6667,
    'Ресурсный центр помощи НКО и сообществам, учреждениям культуры, образования',
    'Ресурсный центр помощи НКО и сообществам',
    'Ресурсный центр помощи НКО и сообществам, учреждениям культуры, образования',
    NULL,
    '["Инициативные жители, сообщества, НКО, учреждения города"]'::jsonb,
    'г. Глазов',
    '[{"name":"ВКонтакте","value":"https://m.vk.com/korolenko8?from=groups"}]'::jsonb,
    '["https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800","https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[9, 12, 17])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 5: КРОМО "Экологический союз"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'КРОМО "Экологический союз"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Железногорск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    5,
    56.25,
    93.5333,
    'Организация и проведение различных экскурсий, конкурсов, выставок, акций, конференций, фестивалей, семинаров, олимпиад, походов, круглых столов, курсов, связанных с миром природы',
    'Разработка и реализация просветительных программ эколого-биологической, естественно-научной, природоохранной, туристско-краеведческой направленности',
    'Организация и проведение различных экскурсий, конкурсов, выставок, акций, конференций, фестивалей, семинаров, олимпиад, походов, круглых столов, курсов, связанных с миром природы. Разработка и реализация просветительных программ эколого -биологической, естественно-научной, природоохранной, туристско - краеведческой направленности для детей и взрослых вместе с детьми. Оказание практической помощи другим организациям и привлечение молодежи к участию в экологической работе на территории ЗАТО Железногорск.',
    '["«Нескучная инженерия» при поддержке АНО «Энергия развития» ГК Росатом","«Ни грамма скуки» - при поддержке фонда президентских грантов","«Меняй себя, а не климат» поддержанный фондом «Соработничество» (с 1 августа)","Проект «Система ЗАТО Железногорск» (с 1 декабря)"]'::jsonb,
    '["Активная молодежь, заинтересовнная в решении экологических проблем и природоохранной деятельности, экоактивисты"]'::jsonb,
    'г. Железногорск',
    '[{"name":"ВКонтакте","value":"https://vk.com/ecosoyuz24"}]'::jsonb,
    '["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800","https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800","https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 8, 12, 16, 21])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 6: Федерация картинга
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'Федерация картинга',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Зеленогорск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    6,
    56.1167,
    94.5833,
    'Федерация картинга',
    'Развитие картинга',
    'Федерация картинга',
    NULL,
    NULL,
    'г. Зеленогорск',
    '[{"name":"ВКонтакте","value":"https://vk.com/publik177651782"}]'::jsonb,
    '["https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 13])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 7: НКО "Резервный фонд поддержки гражданских инициатив города Зеленогорска"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'НКО "Резервный фонд поддержки гражданских инициатив города Зеленогорска"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Зеленогорск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    2,
    56.1167,
    94.5833,
    'Сбор пожертвований и помощь людям в тяжелых ситуациях (пожары, болезни и т.п.)',
    'Помощь людям в тяжелых ситуациях',
    'Три года назад Фонд планировали закрывать. Потом он стал площадкой по сбору средст в поддержку волонтеров СВО, т.к. других фондов в городе нет. На сегодня принято решение оставить Фонд после окончания СВО. Он будет заниматься сбором пожертвований и помощью людям в тяжелых ситуациях (пожары, болезни и т.п.).',
    NULL,
    '["люди в сложной жизненой ситуации"]'::jsonb,
    'г. Зеленогорск',
    '[{"name":"ВКонтакте","value":"https://vk.com/club206489451?from=groups"}]'::jsonb,
    '["https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800","https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[7, 19, 20])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 8: АНО "Клуб компьютерного спорта и фиджитал-спорта "Кибер-атом"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'АНО "Клуб компьютерного спорта и фиджитал-спорта "Кибер-атом"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Зеленогорск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    6,
    56.1167,
    94.5833,
    'Развитие компьютерного спорта и фиджитал-спорта в городе, проведение мероприятий, турниров и просветительской работы',
    'Развитие компьютерного спорта и фиджитал-спорта',
    'ОКВЭД 93.12 - Деятельность спортивных клубов. А если по факту, то занимаюсь развитием компьютерного спорта и фиджитал-спорта в нашем городе, проведением мероприятий, турниров и просветительской работой в этой области',
    '["Открыть детский клуб на 10 компьютеров, две приставки и 1 VR-шлем"]'::jsonb,
    '["подростки 12-17 лет, а также их родители"]'::jsonb,
    'г. Зеленогорск',
    '[{"name":"ВКонтакте","value":"https://vk.com/cyberatom_zlk24"},{"name":"Telegram","value":"https://t.me/cyberatom_zlk24"}]'::jsonb,
    '["https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800","https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 13, 21])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 9: АНО РАЗВИВАЮЩИЙ ЦЕНТР "СОЛНЕЧНЫЙ ГОРОД"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'АНО РАЗВИВАЮЩИЙ ЦЕНТР "СОЛНЕЧНЫЙ ГОРОД"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Зеленогорск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    4,
    56.1167,
    94.5833,
    'Оказание психолого-педагогической помощи семьям с детьми, в том числе с инвалидностью и ОВЗ',
    'Помощь семьям с детьми с инвалидностью и ОВЗ',
    'Оказание психолого-педагогической помощи семьям с детьми, в том числе с инвалидностью и ОВЗ',
    '["Проект \\"Передышка\\" (поддержан КЦПРОИ)"]'::jsonb,
    '["Семьи с детьми от рождения до 18 лет"]'::jsonb,
    'г. Зеленогорск',
    '[{"name":"ВКонтакте","value":"https://vk.com/sunny_gorod"}]'::jsonb,
    '["https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[9, 14, 16])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 10: АНО КРЦРМСИГ ЕЛЕНЫ ЖИВАЕВОЙ
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'АНО КРЦРМСИГ ЕЛЕНЫ ЖИВАЕВОЙ',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Зеленогорск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    2,
    56.1167,
    94.5833,
    'АНО КРЦРМСИГ Елены Живаевой',
    'Развитие местного сообщества',
    'Информация об организации АНО КРЦРМСИГ Елены Живаевой',
    NULL,
    NULL,
    'г. Зеленогорск',
    '[{"name":"ВКонтакте","value":"https://vk.com/elenazivaeva"}]'::jsonb,
    '["https://images.unsplash.com/photo-1552664730-d307ca884978?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 19])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 11: АНО Ресурсный центр
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'АНО Ресурсный центр',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Зеленогорск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    2,
    56.1167,
    94.5833,
    'АНО Ресурсный центр',
    'Ресурсный центр',
    'АНО Ресурсный центр',
    NULL,
    NULL,
    'г. Зеленогорск',
    '[{"name":"ВКонтакте","value":"https://m.vk.com/resyrs.center?from=groups"}]'::jsonb,
    '["https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800","https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800","https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 9, 19])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 12: АНО СС "Линия жизни"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'АНО СС "Линия жизни"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Зеленогорск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    4,
    56.1167,
    94.5833,
    'Предоставление социальных услуг на дому',
    'Социальная поддержка пенсионеров, инвалидов, семей с детьми',
    'Предоставление социальных услуг на дому',
    '["Ежемесячно поздравление юбиляров на дому","Август - Сентябрь (Акция корзина добра сбор продуктов питания для малообеспечненых)","Октябрь-День пожилого человека (поздравление презентами пожилых людей на дому)","Ноябрь - Международный день инвалида (посещение на дому молодых инвалидов с презентами)","День матери - поздравление многодетных матерей","Декабрь - Новогодний экспресс (поздравление получателей социальных услуг)"]'::jsonb,
    '["Пенсионеры, инвалиды, семьи с детьми инвалидами, люди оказавшись в трудной жизненной ситуации"]'::jsonb,
    'г. Зеленогорск',
    '[{"name":"ВКонтакте","value":"https://m.vk.com/liniya_zhizni_zel"},{"name":"Сайт","value":"http://liniyazhiznizel.ru"},{"name":"Одноклассники","value":"https://ok.ru/group/61396158775366"}]'::jsonb,
    '["https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800","https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[6, 10, 14, 16, 19])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 13: АНО Центр досуга и развития детей
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'АНО Центр досуга и развития детей',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Зеленогорск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    7,
    56.1167,
    94.5833,
    'АНО Центр досуга и развития детей',
    'Развитие и досуг детей',
    'АНО Центр досуга и развития детей',
    NULL,
    NULL,
    'г. Зеленогорск',
    '[{"name":"ВКонтакте","value":"https://vk.com/anocdrdzelenogorsk?from=groups"}]'::jsonb,
    '["https://images.unsplash.com/photo-1514888286974-6c03e890800b?w=800","https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800","https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[12, 16, 17])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 14: БФ «Планета кошек»
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'БФ «Планета кошек»',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Нижний Новгород')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    8,
    56.2965,
    43.9361,
    'Проект помощи бездомным животным в Нижнем Новгороде',
    'Спасение животных, оказавшихся в сложных жизненных ситуация, брошенных на улице, нуждающихся в ветеринарной помощи',
    'Благотворительный Фонд "Планета Кошек" — это проект помощи бездомным животным в Нижнем Новгороде! Благотворительный Фонд "Планета Кошек" входит в состав многофункционального Центра помощи и реабилитации животных. Деятельность Фонда направлена на спасение животных, оказавшихся в сложных жизненных ситуация, брошенных на улице, нуждающихся в ветеринарной помощи!',
    NULL,
    NULL,
    'г. Нижний Новгород',
    '[{"name":"ВКонтакте","value":"https://vk.com/planetakosheknn"}]'::jsonb,
    '["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800","https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[4, 7])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 15: АНО ДПО "Техническая академия Росатома"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'АНО ДПО "Техническая академия Росатома"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Обнинск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    9,
    55.1,
    36.6,
    'Находится на стадии формирования концепции и формализации идеи',
    'Техническая академия Росатома',
    'На данный момент НКО нет. Находится на стадии формирования концепции и формализации идеи.',
    NULL,
    NULL,
    'г. Обнинск',
    '[{"name":"ВКонтакте","value":"https://vk.com/rosatomtech"}]'::jsonb,
    '["https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800","https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800","https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[9, 12])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 16: АНО СЦСА НАШИ ДЕТИ
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'АНО СЦСА НАШИ ДЕТИ',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Омск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    4,
    54.9885,
    73.3242,
    'Помощь семьям воспитывающих детей с инвалидностью. Обучение неговорящих детей общаться при помощи альтернативной коммуникации',
    'Ранняя помощь детям до 3х лет, имеющим трудности в развитии',
    'Помощь семьям воспитывающих детей с инвалидностью. Обучение неговорящих детей общаться при помощи альтернативной коммуникации. Открываем новое направление ранняя помощь детям до 3х лет, имеющим трудности в развитии.',
    '["31.07.25 Встреча с зам министра образования Груздевой - обсуждение дорожной карты развития альтернативной коммуникации в адаптивных школах Омской области","31.08.25 Завершение мероприятий проекта - встреч детей с инвалидностью по проекту \\"Вокруг света\\" поддержанного Министерством труда и социального развития Омской области","1.08.2025 Старт волонтерского проекта совместно с Омским филиалом ПАО \\"Ростелеком\\" «Чтение без границ»","19.12.2025 Проведение двух новогодних мероприятий для детей с инвалидностью, поддержка Администрации города Омска","Проект \\"Музыка для всех\\", в рамках которого заложено сотрудничество с музыкальными школами региона для расширения компетенций педагогов в работе с особенными детьми","В рамках субсидии Министерства труда и социального развития проводим занятия на безвозмездной основе для 30 ребят, учим общаться при помощи альтернативной коммуникации","С 15 сентября стартуют занятия в рамках ранней помощи для детей с трудностями в развитии до 3х лет"]'::jsonb,
    '["Семьи воспитывающие детей до 3х лет, имеющие трудности в развитии, проживающие в Омском регионе","Семьи воспитывающие неговорящих детей, нуждающихся в альтернативных способах общения, проживающие в городе Омске"]'::jsonb,
    'г. Омск',
    '[{"name":"ВКонтакте","value":"https://vk.com/ndetiomsk"}]'::jsonb,
    '["https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 9, 12, 14, 16, 17])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 17: ТРОО "ВПЦ" МИРНЫЙ ВОИН"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'ТРОО "ВПЦ" МИРНЫЙ ВОИН"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Северск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    4,
    56.6,
    84.8833,
    'ТРОО "ВПЦ" МИРНЫЙ ВОИН"',
    'Социальная поддержка',
    'ТРОО "ВПЦ" МИРНЫЙ ВОИН"',
    NULL,
    NULL,
    'г. Северск',
    '[{"name":"Одноклассники","value":"https://ok.ru/profile/566417452251/statuses/156787104735451"}]'::jsonb,
    '["https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800","https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 19])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 18: СГОО БУМЕРАНГ ДОБРА
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'СГОО БУМЕРАНГ ДОБРА',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Снежинск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    4,
    56.0851,
    60.7314,
    'СГОО БУМЕРАНГ ДОБРА',
    'Социальная поддержка',
    'СГОО БУМЕРАНГ ДОБРА',
    NULL,
    NULL,
    'г. Снежинск',
    '[{"name":"ВКонтакте","value":"https://vk.com/bdsnz"}]'::jsonb,
    '["https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 7, 19])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 19: ДоброЦентр при СО НКО Бумеранг добра
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'ДоброЦентр при СО НКО Бумеранг добра',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Снежинск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    4,
    56.0851,
    60.7314,
    'ДоброЦентр при СО НКО Бумеранг добра',
    'Социальная поддержка',
    'ДоброЦентр при СО НКО Бумеранг добра',
    NULL,
    NULL,
    'г. Снежинск',
    '[{"name":"ВКонтакте","value":"https://vk.com/snzzhensovet"}]'::jsonb,
    '["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800","https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800","https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 7, 19])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 20: Снежинская городская общественная организация "Союз женщин Снежинска"
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'Снежинская городская общественная организация "Союз женщин Снежинска"',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Снежинск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    2,
    56.0851,
    60.7314,
    'Поддержка семей с детьми: многодетных, приемных семей, семей в городских общежитиях через Семейный клуб',
    'Поддержка семей с детьми и повышение качества жизни старшего поколения',
    'Поддержка семей с детьми: многодетных, приемных семей, семей в городских общежитиях через Семейный клуб, развитие социального предпринимательства. Содействие повышению качества жизни старшего поколения через Клуб общения старшего поколения. Поддержка общественного движения по сохранению и развитию национальных культур в Снежинске. Защита прав женщин.',
    '["Открыть Семейный клуб и Центр долголетия"]'::jsonb,
    '["Женщины, семьи с детьми, пенсионеры"]'::jsonb,
    'г. Снежинск',
    '[{"name":"ВКонтакте","value":"https://vk.com/sovetgensnz?from=groups"}]'::jsonb,
    '["https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800","https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 10, 16, 17, 19])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 21: БФМС Новое Усолье
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'БФМС Новое Усолье',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Усолье-Сибирское')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    2,
    52.75,
    103.6333,
    'Активизация/развитие местного сообщества для улучшения жизни в городе',
    'Развитие местного сообщества',
    'Активизация/развитие местного сообщества для улучшения жизни в городе',
    NULL,
    '["Неравнодушные жители, женщины 40+, семьи с детьми"]'::jsonb,
    'г. Усолье-Сибирское',
    '[{"name":"ВКонтакте","value":"https://vk.com/club166583301"}]'::jsonb,
    '["https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800","https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[5, 19])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 22: УГМО ИОРОООО ВОИ
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'УГМО ИОРОООО ВОИ',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Усолье-Сибирское')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    9,
    52.75,
    103.6333,
    'Организация работает по поддержке людей с инвалидностью и развитию адаптивной физической культуры и спорта в городе',
    'Поддержка людей с инвалидностью и развитие адаптивной физической культуры и спорта',
    'Организация работает по поддержке людей с инвалидностью и развитию адаптивной физической культуры и спорта в городе. Группа изучает более 25 человек различных нозологических групп.',
    NULL,
    '["Люди с инвалидностью всех возрастов"]'::jsonb,
    'г. Усолье-Сибирское',
    NULL,
    '["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800","https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[13, 14])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Организация 23: АНО «Твердыми шагами»
WITH inserted_org AS (
  INSERT INTO organizations (
    name,
    city_id,
    organization_type_id,
    latitude,
    longitude,
    summary,
    mission,
    description,
    goals,
    needs,
    address,
    contacts,
    gallery,
    created_at,
    updated_at
  ) VALUES (
    'АНО «Твердыми шагами»',
    COALESCE(
        (SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(TRIM('Озерск')) LIMIT 1),
        (SELECT id FROM cities ORDER BY id LIMIT 1)
      ),
    9,
    55.7558,
    60.7029,
    'Автономная некоммерческая организация помощи детям с ограниченными возможностями здоровья, инвалидностью и их семьям',
    'Помощь детям с ОВЗ, инвалидностью и их семьям',
    'Автономная некоммерческая организация помощи детям с ограниченными возможностями здоровья, инвалидностью и их семьям',
    NULL,
    NULL,
    'г. Озерск',
    '[{"name":"ВКонтакте","value":"https://vk.com/club207076122"}]'::jsonb,
    '["https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800","https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800"]'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO organization_help_types (organization_id, help_type_id)
SELECT id, unnest(ARRAY[9, 14, 16])
FROM inserted_org
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
