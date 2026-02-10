'use client';

import { useEffect, useState } from 'react';

interface Pet {
  id: number;
  name: string;
  species_id?: number;
  species_name: string;
  breed_id?: number;
  breed_name: string;
  owner_id?: number;
  owner_name: string;
  birth_date: string;
  gender: string;
  description?: string;
  relationship?: string;
  photo_url?: string;
  created_at: string;
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Модальное окно
  const [showModal, setShowModal] = useState(false);
  const [newPet, setNewPet] = useState({
    name: '',
    species_id: 1,
    breed_id: null as number | null,
    birth_date: '',
    age_type: 'exact' as 'exact' | 'approximate',
    approximate_years: 0,
    approximate_months: 0,
    gender: 'male',
    description: '',
    relationship: 'owner' as 'owner' | 'curator',
  });
  const [saving, setSaving] = useState(false);
  const [breeds, setBreeds] = useState<any[]>([]);
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [birthDateType, setBirthDateType] = useState<'exact' | 'approximate'>('exact');
  const [approximateAge, setApproximateAge] = useState({ years: 0, months: 0 });

  useEffect(() => {
    fetchPets();
    fetchBreeds();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [pets, speciesFilter, searchQuery, sortOrder]);

  const fetchPets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/pets', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Загружены питомцы:', data.pets?.length, 'шт.');
        setPets(data.pets || []);
      } else {
        setError('Ошибка загрузки питомцев');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBreeds = async () => {
    try {
      const response = await fetch('/api/admin/breeds', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBreeds(data.breeds || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки пород:', err);
    }
  };

  const handleAddPet = async () => {
    if (!newPet.name.trim()) {
      alert('Введите имя питомца');
      return;
    }

    try {
      setSaving(true);

      // Создание нового питомца
      console.log('Отправляем данные питомца:', newPet);
      
      const response = await fetch('/api/admin/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newPet),
      });

      console.log('Статус ответа:', response.status);

      if (response.ok) {
        setShowModal(false);
        setBreedSearch('');
        setShowBreedDropdown(false);
        setBirthDateType('exact');
        setApproximateAge({ years: 0, months: 0 });
        setNewPet({
          name: '',
          species_id: 1,
          breed_id: null,
          birth_date: '',
          age_type: 'exact',
          approximate_years: 0,
          approximate_months: 0,
          gender: 'male',
          description: '',
          relationship: 'owner',
        });
        setSpeciesFilter('all');
        setSearchQuery('');
        setSortOrder('desc');
        await fetchPets();
        alert('Питомец успешно добавлен!');
      } else {
        const data = await response.json();
        alert('Ошибка: ' + (data.error || 'Не удалось добавить питомца'));
      }
    } catch (err) {
      alert('Ошибка подключения к серверу');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const applyFilters = () => {
    let result = [...pets];

    // Фильтр по виду животного
    if (speciesFilter !== 'all') {
      const speciesName = speciesFilter === 'dog' ? 'Собака' : 'Кошка';
      result = result.filter(pet => pet.species_name === speciesName);
    }

    // Поиск по имени питомца
    if (searchQuery.trim()) {
      result = result.filter(pet =>
        pet.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Сортировка по ID
    result.sort((a, b) => {
      return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
    });

    setFilteredPets(result);
  };

  const calculateBirthDate = (years: number, months: number) => {
    const today = new Date();
    const birthDate = new Date(today);
    birthDate.setFullYear(today.getFullYear() - years);
    birthDate.setMonth(today.getMonth() - months);
    
    // Форматируем в YYYY-MM-DD
    const formattedDate = birthDate.toISOString().split('T')[0];
    setNewPet({ 
      ...newPet, 
      birth_date: formattedDate,
      age_type: 'approximate',
      approximate_years: years,
      approximate_months: months
    });
  };

  // Функция для вычисления возраста из даты рождения
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '-';
    
    const birth = new Date(birthDate);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years === 0 && months === 0) {
      return 'Меньше месяца';
    } else if (years === 0) {
      return `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`;
    } else if (months === 0) {
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    } else {
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'} ${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои питомцы</h1>
          <p className="text-gray-600 mt-2">Управление вашими питомцами</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Добавить питомца
        </button>
      </div>

      {/* Фильтры и поиск */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Фильтр по виду */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Вид животного
            </label>
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все виды</option>
              <option value="dog">Собаки</option>
              <option value="cat">Кошки</option>
            </select>
          </div>

          {/* Поиск */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поиск по имени питомца
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите имя..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Счетчик результатов */}
        <div className="mt-4 text-sm text-gray-600">
          Найдено питомцев: <span className="font-semibold">{filteredPets.length}</span> из {pets.length}
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex items-center gap-2">
                  ID
                  <span className="text-gray-400">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Фото
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Имя питомца
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Вид
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Порода
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Возраст
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Пол
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  {searchQuery || speciesFilter !== 'all' ? 'Ничего не найдено' : 'Нет данных'}
                </td>
              </tr>
            ) : (
              filteredPets.map((pet) => (
                <tr key={pet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pet.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center transition-transform duration-200 hover:scale-150 hover:z-10 relative">
                      {pet.photo_url ? (
                        <img 
                          src={pet.photo_url} 
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">
                          {pet.species_name === 'Собака' ? '🐕' : '🐈'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pet.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pet.species_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pet.breed_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calculateAge(pet.birth_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pet.gender === 'male' ? 'Самец' : pet.gender === 'female' ? 'Самка' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={`/pets/${pet.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Просмотр
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Модальное окно добавления питомца */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Добавить питомца
            </h2>
            
            <div className="space-y-4">
              {/* Имя */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Имя питомца *
                </label>
                <input
                  type="text"
                  value={newPet.name}
                  onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                  placeholder="Например: Барсик"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Вид животного */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Вид животного *
                </label>
                <select
                  value={newPet.species_id}
                  onChange={(e) => {
                    setNewPet({ ...newPet, species_id: Number(e.target.value), breed_id: null });
                    setBreedSearch(''); // Сбрасываем поиск породы при смене вида
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Собака</option>
                  <option value={2}>Кошка</option>
                </select>
              </div>

              {/* Порода */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Порода (необязательно)
                </label>
                <input
                  type="text"
                  value={breedSearch}
                  onChange={(e) => {
                    setBreedSearch(e.target.value);
                    setShowBreedDropdown(true);
                    if (!e.target.value) {
                      setNewPet({ ...newPet, breed_id: null });
                    }
                  }}
                  onFocus={() => setShowBreedDropdown(true)}
                  placeholder="Начните вводить название породы..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Выпадающий список с результатами */}
                {showBreedDropdown && breedSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {breeds
                      .filter(breed => 
                        breed.species_id === newPet.species_id &&
                        breed.name.toLowerCase().includes(breedSearch.toLowerCase())
                      )
                      .map(breed => (
                        <div
                          key={breed.id}
                          onClick={() => {
                            setNewPet({ ...newPet, breed_id: breed.id });
                            setBreedSearch(breed.name);
                            setShowBreedDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                        >
                          {breed.name}
                        </div>
                      ))}
                    {breeds.filter(breed => 
                      breed.species_id === newPet.species_id &&
                      breed.name.toLowerCase().includes(breedSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-gray-500">
                        Породы не найдены
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Дата рождения */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата рождения (необязательно)
                </label>
                
                {/* Переключатель типа даты */}
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={birthDateType === 'exact'}
                      onChange={() => {
                        setBirthDateType('exact');
                        setApproximateAge({ years: 0, months: 0 });
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Точная дата</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={birthDateType === 'approximate'}
                      onChange={() => {
                        setBirthDateType('approximate');
                        setNewPet({ ...newPet, birth_date: '' });
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Примерный возраст</span>
                  </label>
                </div>

                {/* Точная дата */}
                {birthDateType === 'exact' && (
                  <input
                    type="date"
                    value={newPet.birth_date}
                    onChange={(e) => setNewPet({ 
                      ...newPet, 
                      birth_date: e.target.value,
                      age_type: 'exact',
                      approximate_years: 0,
                      approximate_months: 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {/* Примерный возраст */}
                {birthDateType === 'approximate' && (
                  <div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Лет</label>
                        <select
                          value={approximateAge.years}
                          onChange={(e) => {
                            const years = Number(e.target.value);
                            setApproximateAge({ ...approximateAge, years });
                            calculateBirthDate(years, approximateAge.months);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {[...Array(21)].map((_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Месяцев</label>
                        <select
                          value={approximateAge.months}
                          onChange={(e) => {
                            const months = Number(e.target.value);
                            setApproximateAge({ ...approximateAge, months });
                            calculateBirthDate(approximateAge.years, months);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {[...Array(12)].map((_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {(approximateAge.years > 0 || approximateAge.months > 0) && (
                      <div className="mt-2 text-sm text-gray-600">
                        Примерная дата рождения: {newPet.birth_date ? new Date(newPet.birth_date).toLocaleDateString('ru-RU') : '-'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Пол */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пол *
                </label>
                <select
                  value={newPet.gender}
                  onChange={(e) => setNewPet({ ...newPet, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="male">Самец</option>
                  <option value="female">Самка</option>
                </select>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание (необязательно)
                </label>
                <textarea
                  value={newPet.description}
                  onChange={(e) => setNewPet({ ...newPet, description: e.target.value })}
                  placeholder="Дополнительная информация о питомце..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Кнопки */}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setBreedSearch('');
                  setShowBreedDropdown(false);
                  setBirthDateType('exact');
                  setApproximateAge({ years: 0, months: 0 });
                  setNewPet({
                    name: '',
                    species_id: 1,
                    breed_id: null,
                    birth_date: '',
                    age_type: 'exact',
                    approximate_years: 0,
                    approximate_months: 0,
                    gender: 'male',
                    description: '',
                    relationship: 'owner',
                  });
                }}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Отмена
              </button>
              <button
                onClick={handleAddPet}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
