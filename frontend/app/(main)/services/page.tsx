'use client';

import { useAuth } from '@/contexts/AuthContext';

interface Service {
  id: string;
  name: string;
  description: string;
  url: string;
  port: number;
  gradient: string;
  status: 'active' | 'coming_soon';
  features: string[];
  requiresSuperAdmin?: boolean;
  inDevelopment?: string[];
}

export default function ServicesPage() {
  const { user } = useAuth();
  
  // Проверяем, является ли пользователь суперадмином
  // roles приходит из JWT токена, но не определен в типе User
  const isSuperAdmin = (user as any)?.roles?.includes('superadmin') || false;

  const services: Service[] = [
    {
      id: 'owner',
      name: 'Кабинет владельца',
      description: 'Управление своими питомцами, медицинские записи, история событий',
      url: 'http://localhost:6100',
      port: 6100,
      gradient: 'from-blue-500 to-cyan-500',
      status: 'active',
      features: [
        'Список моих питомцев',
        'Медицинская карта',
        'История событий',
        'Создание постов о питомцах'
      ],
      inDevelopment: [
        'Регистрация новых питомцев',
        'Внесение обработок',
        'Напоминания о процедурах'
      ]
    },
    {
      id: 'volunteer',
      name: 'Кабинет зоопомощника',
      description: 'Управление подопечными животными, задачи, кураторство',
      url: 'http://localhost:6200',
      port: 6200,
      gradient: 'from-pink-500 to-rose-500',
      status: 'active',
      features: [
        'Список подопечных',
        'Управление задачами',
        'Изменение статусов',
        'Обработки и уход'
      ],
      inDevelopment: [
        'Организация сборов',
        'Передержки',
        'Репутация и бейджи'
      ]
    },
    {
      id: 'shelter',
      name: 'Кабинет приюта',
      description: 'Реестр животных приюта, пристройство, управление волонтёрами',
      url: 'http://localhost:5100',
      port: 5100,
      gradient: 'from-green-500 to-emerald-500',
      status: 'active',
      features: [
        'Реестр животных приюта',
        'Приём и выбытие',
        'Управление волонтёрами',
        'Статистика пристройств'
      ],
      inDevelopment: [
        'Приём заявок на отлов',
        'Программа ОСВВ',
        'Отчётность в гос. органы'
      ]
    },
    {
      id: 'clinic',
      name: 'Кабинет ветклиники',
      description: 'Регистрация PetID, медицинские события, история визитов',
      url: 'http://localhost:6300',
      port: 6300,
      gradient: 'from-purple-500 to-violet-500',
      status: 'active',
      features: [
        'Регистрация PetID',
        'Медицинские события',
        'Поиск по чипу',
        'История визитов'
      ],
      inDevelopment: [
        'Онлайн-запись на приём',
        'Подтверждение смерти',
        'Выдача чипов',
        'Груминг-услуги'
      ]
    },
    {
      id: 'petbase',
      name: 'ЗооБаза (PetID)',
      description: 'Единый реестр всех животных с полной историей жизни',
      url: 'http://localhost:4100',
      port: 4100,
      gradient: 'from-orange-500 to-amber-500',
      status: 'active',
      requiresSuperAdmin: true,
      features: [
        'Единый реестр животных',
        'История событий',
        'Медицинская карта',
        'Родословная'
      ]
    },
    {
      id: 'admin',
      name: 'Админ-панель',
      description: 'Управление платформой, модерация, статистика',
      url: 'http://localhost:4000',
      port: 4000,
      gradient: 'from-gray-600 to-gray-800',
      status: 'active',
      requiresSuperAdmin: true,
      features: [
        'Управление пользователями',
        'Модерация контента',
        'Статистика платформы',
        'Логирование действий'
      ]
    },
    {
      id: 'petshop',
      name: 'Кабинет зоомагазина',
      description: 'Управление товарами, заказами, программа лояльности',
      url: '#',
      port: 0,
      gradient: 'from-indigo-500 to-blue-500',
      status: 'coming_soon',
      features: [
        'Каталог товаров',
        'Управление заказами',
        'Программа лояльности',
        'Интеграция с доставкой'
      ]
    },
    {
      id: 'foundation',
      name: 'Кабинет фонда/НКО',
      description: 'Управление проектами, сборы средств, волонтёры, отчётность',
      url: '#',
      port: 0,
      gradient: 'from-teal-500 to-cyan-500',
      status: 'coming_soon',
      features: [
        'Управление проектами',
        'Сборы средств',
        'Координация волонтёров',
        'Прозрачная отчётность',
        'Работа с донорами'
      ]
    },
    {
      id: 'marketplace',
      name: 'Зоомаркет',
      description: 'Маркетплейс товаров и услуг для животных',
      url: '#',
      port: 0,
      gradient: 'from-yellow-500 to-orange-500',
      status: 'coming_soon',
      features: [
        'Каталог товаров для животных',
        'Услуги для питомцев',
        'Отзывы и рейтинги',
        'Интеграция с доставкой'
      ]
    },
    {
      id: 'events',
      name: 'Афиша',
      description: 'События, выставки, мероприятия для животных',
      url: '#',
      port: 0,
      gradient: 'from-red-500 to-pink-500',
      status: 'coming_soon',
      features: [
        'Календарь мероприятий',
        'Выставки и конкурсы',
        'Регистрация на события',
        'Фотоотчёты'
      ]
    },
    {
      id: 'education',
      name: 'Учебный центр',
      description: 'Обучение уходу за животными, курсы для владельцев',
      url: '#',
      port: 0,
      gradient: 'from-indigo-500 to-purple-500',
      status: 'coming_soon',
      features: [
        'Онлайн-курсы',
        'Видеоуроки',
        'Сертификация',
        'База знаний'
      ]
    },
    {
      id: 'municipality',
      name: 'Кабинет муниципалитета',
      description: 'Управление программами ОСВВ, контроль приютов, отчётность',
      url: '#',
      port: 0,
      gradient: 'from-blue-600 to-indigo-600',
      status: 'coming_soon',
      features: [
        'Управление программой ОСВВ',
        'Контроль работы приютов',
        'Статистика по городу',
        'Отчётность в гос. органы',
        'Бюджет на зоозащиту'
      ]
    },
    {
      id: 'veterinary_dept',
      name: 'Управление ветеринарии',
      description: 'Контроль ветклиник, эпидемиологический надзор, лицензирование',
      url: '#',
      port: 0,
      gradient: 'from-emerald-600 to-teal-600',
      status: 'coming_soon',
      features: [
        'Контроль ветклиник',
        'Эпидемиологический надзор',
        'Лицензирование клиник',
        'Статистика вакцинации',
        'Контроль бешенства'
      ]
    },
    {
      id: 'petitions',
      name: 'Петиции',
      description: 'Общественные инициативы по защите животных',
      url: '#',
      port: 0,
      gradient: 'from-orange-500 to-red-500',
      status: 'coming_soon',
      features: [
        'Создание петиций',
        'Сбор подписей',
        'Голосование',
        'Отслеживание статуса',
        'Интеграция с властями'
      ]
    },
    {
      id: 'hotline',
      name: 'Горячая линия',
      description: 'Круглосуточная помощь по вопросам животных',
      url: '#',
      port: 0,
      gradient: 'from-red-600 to-pink-600',
      status: 'coming_soon',
      features: [
        'Круглосуточная поддержка',
        'Консультации ветеринаров',
        'Помощь в экстренных случаях',
        'База знаний',
        'История обращений'
      ]
    },
    {
      id: 'chatbot',
      name: 'Чат-бот помощник',
      description: 'AI-ассистент для помощи владельцам и волонтёрам',
      url: '#',
      port: 0,
      gradient: 'from-violet-500 to-purple-600',
      status: 'coming_soon',
      features: [
        'Ответы на вопросы 24/7',
        'Рекомендации по уходу',
        'Юридическая зоопомощь',
        'Поиск ветклиник',
        'Помощь в пристройстве'
      ]
    },
    {
      id: 'breeder',
      name: 'Кабинет заводчика/питомника',
      description: 'Управление племенным разведением, родословные, продажа',
      url: '#',
      port: 0,
      gradient: 'from-amber-500 to-yellow-600',
      status: 'coming_soon',
      features: [
        'Управление племенным разведением',
        'Родословные и документы',
        'Продажа щенков/котят',
        'Репутация и отзывы',
        'Интеграция с РКФ/WCF'
      ]
    },
    {
      id: 'pet_hotel',
      name: 'Кабинет зоогостиницы/передержки',
      description: 'Бронирование, календарь, фото/видео отчёты, передержки',
      url: '#',
      port: 0,
      gradient: 'from-sky-500 to-blue-600',
      status: 'coming_soon',
      features: [
        'Бронирование мест',
        'Календарь занятости',
        'Условия содержания',
        'Фото/видео отчёты владельцам',
        'Управление передержками'
      ]
    },
    {
      id: 'trainer',
      name: 'Кабинет специалиста',
      description: 'Кинологи, зоопсихологи, грумеры и другие специалисты',
      url: '#',
      port: 0,
      gradient: 'from-lime-500 to-green-600',
      status: 'coming_soon',
      features: [
        'Онлайн-консультации',
        'Программы дрессировки',
        'Груминг-услуги',
        'Коррекция поведения',
        'История работы с питомцем'
      ]
    },
    {
      id: 'memorial',
      name: 'Ритуальные услуги',
      description: 'Кремация, захоронение, контроль смертности',
      url: '#',
      port: 0,
      gradient: 'from-gray-500 to-slate-600',
      status: 'coming_soon',
      features: [
        'Кремация',
        'Захоронение',
        'Памятные услуги',
        'Поддержка владельцев',
        'Контроль смертности'
      ]
    },
    {
      id: 'animal_protection',
      name: 'Кабинет зоозащитной инспекции',
      description: 'Борьба с жестокостью, приём жалоб, координация с властями',
      url: '#',
      port: 0,
      gradient: 'from-red-600 to-rose-700',
      status: 'coming_soon',
      features: [
        'Приём жалоб на жестокое обращение',
        'Координация с полицией',
        'База нарушителей',
        'Статистика по городу',
        'Работа с судами'
      ]
    }
  ];

  const handleServiceClick = (service: Service) => {
    if (service.status === 'coming_soon') {
      alert('Этот сервис находится в разработке и будет доступен в следующих версиях');
      return;
    }
    
    // Проверка прав доступа для сервисов, требующих суперадмина
    if (service.requiresSuperAdmin && !isSuperAdmin) {
      alert('Доступ к этому сервису имеют только администраторы платформы');
      return;
    }
    
    window.open(service.url, '_blank');
  };

  // Показываем все активные сервисы (не фильтруем по правам)
  const activeServices = services.filter(s => s.status === 'active');
  const comingSoonServices = services.filter(s => s.status === 'coming_soon');

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 shadow-sm border border-blue-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Сервисы платформы</h1>
        <p className="text-gray-600">Выберите нужный кабинет для работы с платформой</p>
      </div>

      {/* Активные сервисы */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Доступные сервисы</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {activeServices.map((service) => (
            <div
              key={service.id}
              onClick={() => handleServiceClick(service)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer group flex flex-col"
            >
              {/* Градиентный заголовок */}
              <div className={`bg-gradient-to-r ${service.gradient} p-6 text-white relative`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xs font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      :{service.port}
                    </span>
                    {service.requiresSuperAdmin && (
                      <span className="text-xs font-semibold bg-yellow-400 text-gray-900 px-3 py-1 rounded-full">
                        🔒 Админ
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                <p className="text-white/90 text-sm">{service.description}</p>
              </div>

              {/* Функции */}
              <div className="p-5 flex-1 flex flex-col">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Основные функции:</h4>
                <ul className="space-y-2 min-h-[120px]">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Функции в разработке */}
                {service.inDevelopment && service.inDevelopment.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 mt-4">В разработке:</h4>
                    <ul className="space-y-2 min-h-[100px]">
                      {service.inDevelopment.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-500">
                          <span className="text-orange-400 mr-2">🔧</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Кнопка */}
                <button className="w-full mt-auto pt-5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 group-hover:shadow-lg">
                  Открыть кабинет →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Сервисы в разработке */}
      {comingSoonServices.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">В разработке</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {comingSoonServices.map((service) => (
              <div
                key={service.id}
                onClick={() => handleServiceClick(service)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 opacity-75 hover:opacity-100 transition-all duration-300 cursor-pointer group flex flex-col"
              >
                {/* Градиентный заголовок */}
                <div className={`bg-gradient-to-r ${service.gradient} p-6 text-white relative`}>
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-semibold bg-yellow-400 text-gray-900 px-3 py-1 rounded-full">
                      Скоро
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                  <p className="text-white/90 text-sm">{service.description}</p>
                </div>

                {/* Функции */}
                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Планируемые функции:</h4>
                  <ul className="space-y-2 min-h-[120px]">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600">
                        <span className="text-gray-400 mr-2">○</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Кнопка */}
                  <button 
                    disabled
                    className="w-full mt-auto pt-5 px-4 py-2.5 bg-gray-200 text-gray-500 font-medium rounded-xl cursor-not-allowed"
                  >
                    В разработке
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
          <div className="text-3xl font-bold text-green-600 mb-1">{activeServices.length}</div>
          <div className="text-sm text-gray-600">Активных сервисов</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-5 border border-yellow-100">
          <div className="text-3xl font-bold text-orange-600 mb-1">{comingSoonServices.length}</div>
          <div className="text-sm text-gray-600">В разработке</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
          <div className="text-3xl font-bold text-blue-600 mb-1">{services.length}</div>
          <div className="text-sm text-gray-600">Всего планируется</div>
        </div>
      </div>
    </div>
  );
}
