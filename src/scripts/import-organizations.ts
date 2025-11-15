/**
 * Одноразовый скрипт для импорта организаций
 * 
 * Использование:
 *   npm run import:organizations [BASE_URL] [EMAIL] [PASSWORD]
 * 
 * Пример:
 *   npm run import:organizations http://82.202.140.37:3000 admin@example.com password123
 */

// Проверка наличия fetch (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('Ошибка: требуется Node.js 18+ для поддержки fetch');
  process.exit(1);
}

interface OrganizationData {
  id: string;
  name: string;
  city: string;
  type: string;
  assistance: string[];
  summary: string;
  description: string;
  mission: string;
  goals: string[];
  needs: string[];
  coordinates: [number, number];
  address: string;
  contacts: {
    phone?: string;
    email?: string;
  };
  website?: string;
  socials?: Array<{ name: string; url: string }>;
  gallery?: string[];
}

interface City {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  regionId: number;
  region?: {
    id: number;
    name: string;
  };
}

interface HelpType {
  id: number;
  name: string;
}

interface ContactDto {
  name: string;
  value: string;
}

interface CreateOrganizationDto {
  name: string;
  cityId: number;
  latitude?: number;
  longitude?: number;
  summary?: string;
  mission?: string;
  description?: string;
  goals?: string[];
  needs?: string[];
  address?: string;
  contacts?: ContactDto[];
}

class OrganizationImporter {
  private baseUrl: string;
  private token: string | null = null;
  private cities: City[] = [];
  private helpTypes: HelpType[] = [];
  private cityMap: Map<string, City> = new Map();
  private helpTypeMap: Map<string, number> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Авторизация через API
   */
  async login(email: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ошибка авторизации: ${response.status} - ${error}`);
      }

      const data = await response.json();
      this.token = data.access_token;
      console.log('✓ Успешная авторизация');
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      throw error;
    }
  }

  /**
   * Получить заголовки с авторизацией
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Загрузить список городов
   */
  async loadCities(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/cities`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки городов: ${response.status}`);
      }

      this.cities = await response.json();
      
      // Создаем карту городов по названию (учитываем, что могут быть города с одинаковыми названиями)
      this.cityMap.clear();
      for (const city of this.cities) {
        const key = city.name.toLowerCase().trim();
        // Если город с таким названием уже есть, берем первый найденный
        if (!this.cityMap.has(key)) {
          this.cityMap.set(key, city);
        }
      }

      console.log(`✓ Загружено ${this.cities.length} городов`);
    } catch (error) {
      console.error('Ошибка при загрузке городов:', error);
      throw error;
    }
  }

  /**
   * Найти город по названию
   */
  findCity(cityName: string): City | null {
    const key = cityName.toLowerCase().trim();
    return this.cityMap.get(key) || null;
  }

  /**
   * Загрузить список типов помощи
   */
  async loadHelpTypes(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/help-types`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки типов помощи: ${response.status}`);
      }

      this.helpTypes = await response.json();
      
      // Создаем карту типов помощи
      this.helpTypeMap.clear();
      for (const helpType of this.helpTypes) {
        this.helpTypeMap.set(helpType.name.toLowerCase().trim(), helpType.id);
      }

      console.log(`✓ Загружено ${this.helpTypes.length} типов помощи`);
    } catch (error) {
      console.error('Ошибка при загрузке типов помощи:', error);
      throw error;
    }
  }

  /**
   * Найти или создать тип помощи
   */
  async findOrCreateHelpType(name: string): Promise<number> {
    const key = name.toLowerCase().trim();
    
    // Ищем существующий тип помощи
    if (this.helpTypeMap.has(key)) {
      return this.helpTypeMap.get(key)!;
    }

    // Создаем новый тип помощи
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/help-types`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ошибка создания типа помощи: ${response.status} - ${error}`);
      }

      const newHelpType = await response.json();
      this.helpTypes.push(newHelpType);
      this.helpTypeMap.set(key, newHelpType.id);
      console.log(`  ✓ Создан тип помощи: ${name}`);
      return newHelpType.id;
    } catch (error) {
      console.error(`Ошибка при создании типа помощи "${name}":`, error);
      throw error;
    }
  }

  /**
   * Преобразовать контакты из формата данных в формат API
   */
  private transformContacts(orgData: OrganizationData): ContactDto[] {
    const contacts: ContactDto[] = [];

    // Телефон
    if (orgData.contacts?.phone) {
      contacts.push({
        name: 'Телефон',
        value: orgData.contacts.phone,
      });
    }

    // Email
    if (orgData.contacts?.email) {
      contacts.push({
        name: 'Email',
        value: orgData.contacts.email,
      });
    }

    // Сайт
    if (orgData.website) {
      contacts.push({
        name: 'Сайт',
        value: orgData.website,
      });
    }

    // Социальные сети
    if (orgData.socials && orgData.socials.length > 0) {
      for (const social of orgData.socials) {
        contacts.push({
          name: social.name,
          value: social.url,
        });
      }
    }

    return contacts;
  }

  /**
   * Преобразовать данные организации в формат API
   */
  private transformOrganization(orgData: OrganizationData, cityId: number): CreateOrganizationDto {
    return {
      name: orgData.name,
      cityId: cityId,
      latitude: orgData.coordinates?.[0],
      longitude: orgData.coordinates?.[1],
      summary: orgData.summary,
      mission: orgData.mission,
      description: orgData.description,
      goals: orgData.goals,
      needs: orgData.needs,
      address: orgData.address,
      contacts: this.transformContacts(orgData),
    };
  }

  /**
   * Создать организацию
   */
  async createOrganization(orgData: OrganizationData): Promise<number> {
    // Находим город
    const city = this.findCity(orgData.city);
    if (!city) {
      throw new Error(`Город "${orgData.city}" не найден в базе данных`);
    }

    // Преобразуем данные
    const createDto = this.transformOrganization(orgData, city.id);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/organizations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(createDto),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ошибка создания организации: ${response.status} - ${error}`);
      }

      const organization = await response.json();
      return organization.id;
    } catch (error) {
      console.error(`Ошибка при создании организации "${orgData.name}":`, error);
      throw error;
    }
  }

  /**
   * Добавить тип помощи к организации
   */
  async addHelpTypeToOrganization(organizationId: number, helpTypeId: number): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/organizations/${organizationId}/help-types`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ helpTypeId }),
        }
      );

      if (!response.ok) {
        // Игнорируем ошибку, если тип помощи уже добавлен
        if (response.status === 409) {
          return;
        }
        const error = await response.text();
        throw new Error(`Ошибка добавления типа помощи: ${response.status} - ${error}`);
      }
    } catch (error) {
      console.error(`Ошибка при добавлении типа помощи к организации ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Импортировать организации
   */
  async importOrganizations(organizations: OrganizationData[]): Promise<void> {
    console.log(`\nНачинаем импорт ${organizations.length} организаций...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ name: string; error: string }> = [];

    for (let i = 0; i < organizations.length; i++) {
      const orgData = organizations[i];
      console.log(`[${i + 1}/${organizations.length}] Обработка: ${orgData.name}`);

      try {
        // Создаем организацию
        const organizationId = await this.createOrganization(orgData);

        // Добавляем основной тип помощи (из поля type)
        if (orgData.type) {
          const helpTypeId = await this.findOrCreateHelpType(orgData.type);
          await this.addHelpTypeToOrganization(organizationId, helpTypeId);
        }

        // Добавляем типы помощи из массива assistance
        if (orgData.assistance && orgData.assistance.length > 0) {
          for (const assistanceType of orgData.assistance) {
            // Преобразуем английские названия в русские
            const russianName = this.translateAssistanceType(assistanceType);
            const helpTypeId = await this.findOrCreateHelpType(russianName);
            await this.addHelpTypeToOrganization(organizationId, helpTypeId);
          }
        }

        successCount++;
        console.log(`  ✓ Организация создана (ID: ${organizationId})\n`);
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ name: orgData.name, error: errorMessage });
        console.error(`  ✗ Ошибка: ${errorMessage}\n`);
      }
    }

    // Выводим итоги
    console.log('\n=== Итоги импорта ===');
    console.log(`Успешно: ${successCount}`);
    console.log(`Ошибок: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\nОшибки:');
      for (const err of errors) {
        console.log(`  - ${err.name}: ${err.error}`);
      }
    }
  }

  /**
   * Преобразовать английское название типа помощи в русское
   */
  private translateAssistanceType(englishName: string): string {
    const translations: Record<string, string> = {
      volunteers: 'Волонтеры',
      donations: 'Пожертвования',
      things: 'Вещи',
      experts: 'Эксперты',
      mentors: 'Наставники',
      blood: 'Донорство крови',
    };

    return translations[englishName.toLowerCase()] || englishName;
  }
}

// Данные организаций
const organizationsData: OrganizationData[] = [
  {
    id: 'lapki-dobra',
    name: 'Приют «Лапки добра»',
    city: 'Саров',
    type: 'Помощь животным',
    assistance: ['volunteers', 'things', 'donations'],
    summary: 'Помогаем бездомным животным найти дом и получить лечение.',
    description: '«Лапки добра» принимает пострадавших животных, обеспечивает медицинскую помощь и ищет для них новые семьи.',
    mission: 'Создать безопасную среду для животных, популяризировать ответственный подход к питомцам и вовлекать жителей Сарова в волонтерство.',
    goals: [
      'Расширить сеть кураторов животных',
      'Запустить образовательные лекции для школьников',
      'Сократить количество бездомных животных на улицах города',
    ],
    needs: [
      'Корм и лекарства для животных',
      'Волонтеры для выгула собак и ухода за кошками',
      'Финансовая поддержка для стерилизации',
    ],
    coordinates: [54.9136, 43.3411],
    address: 'Саров, ул. Зоозащитная, 12',
    contacts: {
      phone: '+7 (900) 000-11-22',
      email: 'help@lapki-dobra.ru',
    },
    website: 'https://lapki-dobra.ru',
    socials: [
      { name: 'VK', url: 'https://vk.com/lapki_dobra' },
      { name: 'Telegram', url: 'https://t.me/lapki_dobra' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'zeleny-ozersk',
    name: 'Зеленый Озёрск',
    city: 'Озёрск',
    type: 'Экология',
    assistance: ['volunteers', 'donations', 'experts'],
    summary: 'Организуем эко-мероприятия и образовательные программы для жителей Озёрска.',
    description: 'Команда «Зеленый Озёрск» проводит субботники, эко-фестивали, образовательные марафоны и занимается озеленением города.',
    mission: 'Сделать Озёрск зеленым и чистым, объединяя жителей города вокруг экологичных привычек и проектов.',
    goals: [
      'Посадить 1000 деревьев в 2025 году',
      'Создать интерактивный эко-маршрут по городу',
      'Провести цикл лекций для школьников и студентов',
    ],
    needs: [
      'Волонтеры для субботников и высадки деревьев',
      'Финансовая помощь на закупку саженцев и инвентаря',
      'Эксперты по экологическому просвещению',
    ],
    coordinates: [55.7558, 60.7029],
    address: 'Озёрск, пр-т Победы, 5',
    contacts: {
      phone: '+7 (900) 123-45-67',
      email: 'info@green-ozersk.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/green_ozersk' },
      { name: 'Telegram', url: 'https://t.me/green_ozersk' },
      { name: 'Website', url: 'https://green-ozersk.ru' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1484910292437-025e5d13ce87?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1523978591478-c753949ff840?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'atom-serdce',
    name: 'Атом Сердце',
    city: 'Нововоронеж',
    type: 'Помощь пожилым',
    assistance: ['volunteers', 'donations', 'mentors'],
    summary: 'Поддерживаем одиноких пожилых людей: помощь по дому, общение, доставка продуктов.',
    description: 'Проект организует регулярные визиты волонтеров, мастер-классы и психологическую поддержку для пожилых жителей.',
    mission: 'Сделать так, чтобы каждый пожилой человек чувствовал заботу, внимание и поддержку общества.',
    goals: [
      'Создать мобильную службу помощи на дому',
      'Запустить онлайн-платформу для волонтеров-наставников',
      'Организовать клубы интересов в каждом районе города',
    ],
    needs: [
      'Волонтеры для адресной помощи',
      'Финансовая поддержка для закупки продуктовых наборов',
      'Наставники для дистанционного общения',
    ],
    coordinates: [51.3167, 39.2167],
    address: 'Нововоронеж, ул. Дружбы, 8',
    contacts: {
      phone: '+7 (950) 555-77-88',
      email: 'support@atom-heart.ru',
    },
    website: 'https://atom-heart.ru',
    socials: [{ name: 'VK', url: 'https://vk.com/atom_serdce' }],
    gallery: [
      'https://images.unsplash.com/photo-1530023367847-a683933f4177?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1492795472186-9985022f45b3?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'future-atom',
    name: 'Будущее Атома',
    city: 'Десногорск',
    type: 'Образование',
    assistance: ['volunteers', 'donations', 'experts'],
    summary: 'Образовательные STEM-программы для школьников и студентов Десногорска.',
    description: 'Проект объединяет наставников из атомной отрасли и университетов для проведения кружков, хакатонов и профориентации.',
    mission: 'Подготовить новое поколение инженеров и исследователей, заинтересованных в науке и атомной энергетике.',
    goals: [
      'Запустить круглогодичный STEM-центр',
      'Обеспечить доступ к лабораториям и оборудованию',
      'Организовать стажировки на предприятиях отрасли',
    ],
    needs: [
      'Эксперты-наставники для кружков',
      'Волонтеры для организации событий',
      'Стипендии для талантливых школьников',
    ],
    coordinates: [54.1515, 33.2833],
    address: 'Десногорск, ул. Энергетиков, 4',
    contacts: {
      phone: '+7 (910) 123-45-67',
      email: 'hello@futureatom.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/future_atom' },
      { name: 'Telegram', url: 'https://t.me/future_atom' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'dobry-sport',
    name: 'Добрый Спорт',
    city: 'Заречный',
    type: 'Спорт',
    assistance: ['volunteers', 'donations', 'things'],
    summary: 'Инклюзивные спортивные программы для детей и подростков.',
    description: 'Команда запускает адаптивные секции, спортивные праздники и программы для детей с ОВЗ.',
    mission: 'Создать равные условия для занятия спортом и развития командного духа среди всех детей города.',
    goals: [
      'Открыть инклюзивный спортивный центр',
      'Обучить тренеров адаптивным методикам',
      'Организовать турнир «Спорт объединяет»',
    ],
    needs: [
      'Спортивный инвентарь и экипировка',
      'Волонтеры для сопровождения детей',
      'Средства на аренду залов',
    ],
    coordinates: [53.1965, 45.1709],
    address: 'Заречный, ул. Спортивная, 22',
    contacts: {
      phone: '+7 (902) 222-33-44',
      email: 'team@kind-sport.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/kind_sport' },
      { name: 'Telegram', url: 'https://t.me/kind_sport' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1472653431158-6364773b2a56?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'atom-care',
    name: 'Атом Забота',
    city: 'Снежинск',
    type: 'Поддержка людей с ОВЗ',
    assistance: ['volunteers', 'donations', 'mentors', 'things'],
    summary: 'Помогаем семьям с детьми с особенностями развития: реабилитация, занятия и поддержка специалистов.',
    description: 'Проводим развивающие программы, арт-терапию, консультации логопедов и психологов, обеспечиваем техническими средствами.',
    mission: 'Обеспечить доступную комплексную поддержку для людей с ОВЗ и их семей в Снежинске.',
    goals: [
      'Расширить число реабилитационных программ',
      'Создать базу волонтеров-наставников',
      'Оснастить центр современным оборудованием',
    ],
    needs: [
      'Финансирование реабилитационных курсов',
      'Волонтеры для сопровождения занятий',
      'Наставники для подростков',
      'Специализированные средства ухода',
    ],
    coordinates: [56.0851, 60.7314],
    address: 'Снежинск, ул. Надежды, 10',
    contacts: {
      phone: '+7 (951) 999-55-44',
      email: 'care@atom-zabota.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/atom_care' },
      { name: 'Telegram', url: 'https://t.me/atom_care' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'krov-dobro',
    name: 'Кровь Добра',
    city: 'Саров',
    type: 'Донорство крови',
    assistance: ['blood', 'volunteers'],
    summary: 'Организуем донорские акции и помогаем людям, нуждающимся в переливании крови.',
    description: 'Центр «Кровь Добра» проводит регулярные донорские акции, информирует о важности донорства и координирует помощь больницам.',
    mission: 'Создать активное сообщество доноров крови и обеспечить доступность донорской крови для всех нуждающихся.',
    goals: [
      'Провести 50 донорских акций в 2025 году',
      'Привлечь 500 новых доноров',
      'Организовать мобильные пункты забора крови',
    ],
    needs: [
      'Доноры крови всех групп',
      'Волонтеры для организации акций',
      'Информационная поддержка',
    ],
    coordinates: [54.9200, 43.3500],
    address: 'Саров, ул. Медицинская, 8',
    contacts: {
      phone: '+7 (900) 111-22-33',
      email: 'donor@krov-dobro.ru',
    },
    website: 'https://krov-dobro.ru',
    socials: [
      { name: 'VK', url: 'https://vk.com/krov_dobro' },
      { name: 'Telegram', url: 'https://t.me/krov_dobro' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'atom-deti',
    name: 'Атом Детям',
    city: 'Озёрск',
    type: 'Помощь детям',
    assistance: ['volunteers', 'donations', 'things', 'mentors'],
    summary: 'Поддерживаем детей из многодетных и малообеспеченных семей: игрушки, одежда, образование.',
    description: 'Проект помогает детям получить все необходимое для развития: от школьных принадлежностей до участия в кружках и секциях.',
    mission: 'Обеспечить равные возможности для всех детей, независимо от финансового положения семьи.',
    goals: [
      'Организовать сбор школьных принадлежностей',
      'Запустить программу наставничества',
      'Провести новогодние праздники для 200 детей',
    ],
    needs: [
      'Школьные принадлежности и одежда',
      'Волонтеры для организации мероприятий',
      'Наставники для детей',
      'Финансовая поддержка',
    ],
    coordinates: [55.7600, 60.7100],
    address: 'Озёрск, ул. Детская, 15',
    contacts: {
      phone: '+7 (900) 222-33-44',
      email: 'info@atom-deti.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/atom_deti' },
      { name: 'Telegram', url: 'https://t.me/atom_deti' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'kultura-atom',
    name: 'Культура Атома',
    city: 'Нововоронеж',
    type: 'Культура',
    assistance: ['volunteers', 'donations', 'experts'],
    summary: 'Развиваем культурную жизнь города: театр, музыка, литература, народное творчество.',
    description: 'Организуем концерты, спектакли, выставки, литературные вечера и мастер-классы для всех жителей города.',
    mission: 'Сделать культуру доступной для всех и создать творческое сообщество в атомных городах.',
    goals: [
      'Провести 30 культурных мероприятий в год',
      'Создать молодежный театр',
      'Организовать фестиваль искусств',
    ],
    needs: [
      'Волонтеры для организации мероприятий',
      'Финансовая поддержка проектов',
      'Эксперты в области культуры',
    ],
    coordinates: [51.3200, 39.2200],
    address: 'Нововоронеж, ул. Культурная, 3',
    contacts: {
      phone: '+7 (950) 666-77-88',
      email: 'culture@atom-kultura.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/kultura_atom' },
      { name: 'Website', url: 'https://kultura-atom.ru' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'med-pomosh',
    name: 'Медицинская Помощь',
    city: 'Десногорск',
    type: 'Медицинская помощь',
    assistance: ['volunteers', 'donations', 'experts'],
    summary: 'Оказываем медицинскую помощь и поддержку людям, нуждающимся в лечении.',
    description: 'Организуем медицинские консультации, помощь в получении лечения, поддержку семей с тяжелобольными.',
    mission: 'Обеспечить доступную медицинскую помощь и поддержку для всех жителей города.',
    goals: [
      'Организовать бесплатные медицинские консультации',
      'Помочь 100 семьям с лечением',
      'Создать базу медицинских волонтеров',
    ],
    needs: [
      'Врачи-волонтеры',
      'Финансовая поддержка для лечения',
      'Медицинское оборудование',
    ],
    coordinates: [54.1550, 33.2850],
    address: 'Десногорск, ул. Медицинская, 7',
    contacts: {
      phone: '+7 (910) 234-56-78',
      email: 'help@med-pomosh.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/med_pomosh' },
      { name: 'Telegram', url: 'https://t.me/med_pomosh' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1576091160550-2173dba999e8?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'sotsialnaya-podderzhka',
    name: 'Социальная Поддержка',
    city: 'Заречный',
    type: 'Социальная поддержка',
    assistance: ['volunteers', 'donations', 'things', 'mentors'],
    summary: 'Помогаем людям в трудной жизненной ситуации: бездомным, безработным, семьям в кризисе.',
    description: 'Оказываем комплексную помощь: временное жилье, питание, помощь в трудоустройстве, психологическая поддержка.',
    mission: 'Вернуть людям веру в себя и помочь им встать на ноги в трудной ситуации.',
    goals: [
      'Помочь 50 людям найти работу',
      'Организовать временное жилье для 20 семей',
      'Создать центр социальной адаптации',
    ],
    needs: [
      'Волонтеры для работы с людьми',
      'Одежда и предметы первой необходимости',
      'Финансовая поддержка',
      'Наставники для социальной адаптации',
    ],
    coordinates: [53.2000, 45.1750],
    address: 'Заречный, ул. Социальная, 5',
    contacts: {
      phone: '+7 (902) 333-44-55',
      email: 'support@sotsialnaya-podderzhka.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/sotsialnaya_podderzhka' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'ekstrennaya-pomosh',
    name: 'Экстренная Помощь',
    city: 'Снежинск',
    type: 'Экстренная помощь',
    assistance: ['volunteers', 'donations'],
    summary: 'Оказываем экстренную помощь в кризисных ситуациях: пожары, наводнения, другие ЧС.',
    description: 'Быстро реагируем на кризисные ситуации, организуем сбор помощи, координируем волонтеров.',
    mission: 'Быть готовыми помочь в любой момент и минимизировать последствия кризисных ситуаций.',
    goals: [
      'Создать сеть быстрого реагирования',
      'Обучить 100 волонтеров первой помощи',
      'Организовать склад экстренной помощи',
    ],
    needs: [
      'Волонтеры для экстренного реагирования',
      'Финансовая поддержка',
      'Оборудование для помощи',
    ],
    coordinates: [56.0900, 60.7350],
    address: 'Снежинск, ул. Экстренная, 1',
    contacts: {
      phone: '+7 (951) 888-99-00',
      email: 'emergency@ekstrennaya-pomosh.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/ekstrennaya_pomosh' },
      { name: 'Telegram', url: 'https://t.me/ekstrennaya_pomosh' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'zashchita-prirody',
    name: 'Защита Природы',
    city: 'Саров',
    type: 'Экология',
    assistance: ['volunteers', 'donations', 'experts'],
    summary: 'Защищаем природу и окружающую среду: очистка лесов, защита редких видов, экологическое просвещение.',
    description: 'Проводим экологические акции, мониторинг состояния природы, образовательные программы.',
    mission: 'Сохранить природу для будущих поколений и воспитать экологическое сознание.',
    goals: [
      'Очистить 10 гектаров леса',
      'Провести 20 экологических акций',
      'Обучить 500 школьников экологии',
    ],
    needs: [
      'Волонтеры для экологических акций',
      'Эксперты-экологи',
      'Инвентарь для уборки',
    ],
    coordinates: [54.9150, 43.3450],
    address: 'Саров, ул. Лесная, 20',
    contacts: {
      phone: '+7 (900) 444-55-66',
      email: 'info@zashchita-prirody.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/zashchita_prirody' },
      { name: 'Website', url: 'https://zashchita-prirody.ru' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'molodezhnyy-tsentr',
    name: 'Молодежный Центр',
    city: 'Озёрск',
    type: 'Молодежная работа',
    assistance: ['volunteers', 'donations', 'mentors'],
    summary: 'Развиваем молодежное сообщество: досуг, образование, карьера, волонтерство.',
    description: 'Организуем мероприятия для молодежи, помогаем в профориентации, развиваем лидерские качества.',
    mission: 'Создать активное молодежное сообщество и помочь молодым людям реализовать свой потенциал.',
    goals: [
      'Провести 40 молодежных мероприятий',
      'Обучить 200 молодых лидеров',
      'Создать молодежный совет',
    ],
    needs: [
      'Волонтеры для организации мероприятий',
      'Наставники для молодежи',
      'Финансовая поддержка проектов',
    ],
    coordinates: [55.7650, 60.7150],
    address: 'Озёрск, ул. Молодежная, 12',
    contacts: {
      phone: '+7 (900) 555-66-77',
      email: 'info@molodezhnyy-tsentr.ru',
    },
    socials: [
      { name: 'VK', url: 'https://vk.com/molodezhnyy_tsentr' },
      { name: 'Telegram', url: 'https://t.me/molodezhnyy_tsentr' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
    ],
  },
];

// Главная функция
async function main() {
  // Получаем параметры из переменных окружения или аргументов командной строки
  const apiBaseUrl = process.env.API_BASE_URL || process.argv[2] || 'http://82.202.140.37:3000';
  const apiEmail = process.env.API_EMAIL || process.argv[3];
  const apiPassword = process.env.API_PASSWORD || process.argv[4];

  if (!apiEmail || !apiPassword) {
    console.error('Ошибка: необходимо указать email и password для авторизации');
    console.error('Использование:');
    console.error('  npm run import:organizations [BASE_URL] [EMAIL] [PASSWORD]');
    console.error('Или установите переменные окружения:');
    console.error('  API_BASE_URL=http://82.202.140.37:3000');
    console.error('  API_EMAIL=your@email.com');
    console.error('  API_PASSWORD=yourpassword');
    process.exit(1);
  }

  const importer = new OrganizationImporter(apiBaseUrl);

  try {
    // Авторизация
    await importer.login(apiEmail, apiPassword);

    // Загружаем справочники
    await importer.loadCities();
    await importer.loadHelpTypes();

    // Импортируем организации
    await importer.importOrganizations(organizationsData);

    console.log('\n✓ Импорт завершен успешно');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Критическая ошибка при импорте:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

export { OrganizationImporter, organizationsData };

