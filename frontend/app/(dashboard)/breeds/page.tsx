'use client';

import { useEffect, useState } from 'react';

interface Breed {
  id: number;
  name: string;
  species_name: string; // Изменено с species на species_name
  species_id: number;
  description?: string;
  created_at: string;
}

export default function BreedsPage() {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [filteredBreeds, setFilteredBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [speciesFilter, setSpeciesFilter] = useState<string>('all'); // all, dog, cat
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Модальное окно
  const [showModal, setShowModal] = useState(false);
  const [editingBreed, setEditingBreed] = useState<Breed | null>(null);
  const [newBreed, setNewBreed] = useState({
    name: '',
    species_id: 1, // 1 = Собака, 2 = Кошка
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBreeds();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [breeds, speciesFilter, searchQuery, sortOrder]);

  const fetchBreeds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/breeds', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Загружены породы:', data.breeds?.length, 'шт.');
        console.log('Первая порода (полная):', JSON.stringify(data.breeds?.[0], null, 2));
        setBreeds(data.breeds || []);
      } else {
        setError('Ошибка загрузки пород');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...breeds];

    // Фильтр по виду животного
    if (speciesFilter !== 'all') {
      const speciesName = speciesFilter === 'dog' ? 'Собака' : 'Кошка';
      result = result.filter(breed => breed.species_name === speciesName);
    }

    // Поиск по названию породы
    if (searchQuery.trim()) {
      result = result.filter(breed =>
        breed.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Сортировка по ID
    result.sort((a, b) => {
      return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
    });

    setFilteredBreeds(result);
  };

  const handleAddBreed = async () => {
    if (!newBreed.name.trim()) {
      alert('Введите название породы');
      return;
    }

    console.log('Отправляем данные:', newBreed);

    try {
      setSaving(true);
      
      if (editingBreed) {
        // Редактирование существующей породы
        const response = await fetch(`/api/admin/breeds/${editingBreed.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(newBreed),
        });

        if (response.ok) {
          setShowModal(false);
          setEditingBreed(null);
          setNewBreed({ name: '', species_id: 1, description: '' });
          await fetchBreeds();
          alert('Порода успешно обновлена!');
        } else {
          const data = await response.json();
          alert('Ошибка: ' + (data.error || 'Не удалось обновить породу'));
        }
      } else {
        // Создание новой породы
        const response = await fetch('/api/admin/breeds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(newBreed),
        });

        console.log('Статус ответа:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Создана порода - полный ответ:', JSON.stringify(data, null, 2));
          
          setShowModal(false);
          setNewBreed({ name: '', species_id: 1, description: '' });
          setSpeciesFilter('all');
          setSearchQuery('');
          setSortOrder('desc');
          await fetchBreeds();
          alert('Порода успешно добавлена!');
        } else {
          const data = await response.json();
          alert('Ошибка: ' + (data.error || 'Не удалось добавить породу'));
        }
      }
    } catch (err) {
      alert('Ошибка подключения к серверу');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditBreed = (breed: Breed) => {
    setEditingBreed(breed);
    setNewBreed({
      name: breed.name,
      species_id: breed.species_id,
      description: breed.description || '',
    });
    setShowModal(true);
  };

  const handleDeleteBreed = async (breed: Breed) => {
    if (!confirm(`Удалить породу "${breed.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/breeds/${breed.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchBreeds();
        alert('Порода успешно удалена!');
      } else {
        const data = await response.json();
        alert('Ошибка: ' + (data.error || 'Не удалось удалить породу'));
      }
    } catch (err) {
      alert('Ошибка подключения к серверу');
      console.error(err);
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
          <h1 className="text-2xl font-bold text-gray-900">Породы животных</h1>
          <p className="text-gray-600 mt-2">Справочник пород</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Добавить породу
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
              Поиск по породе
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите название породы..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Счетчик результатов */}
        <div className="mt-4 text-sm text-gray-600">
          Найдено пород: <span className="font-semibold">{filteredBreeds.length}</span> из {breeds.length}
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
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Вид животного
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Описание
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата создания
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBreeds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {searchQuery || speciesFilter !== 'all' ? 'Ничего не найдено' : 'Нет данных'}
                </td>
              </tr>
            ) : (
              filteredBreeds.map((breed) => (
                <tr key={breed.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {breed.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {breed.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {breed.species_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {breed.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(breed.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditBreed(breed)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteBreed(breed)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Модальное окно добавления породы */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingBreed ? 'Редактировать породу' : 'Добавить породу'}
            </h2>
            
            <div className="space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название породы *
                </label>
                <input
                  type="text"
                  value={newBreed.name}
                  onChange={(e) => setNewBreed({ ...newBreed, name: e.target.value })}
                  placeholder="Например: Лабрадор"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Вид животного */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Вид животного *
                </label>
                <select
                  value={newBreed.species_id}
                  onChange={(e) => setNewBreed({ ...newBreed, species_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Собака</option>
                  <option value={2}>Кошка</option>
                </select>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание (необязательно)
                </label>
                <textarea
                  value={newBreed.description}
                  onChange={(e) => setNewBreed({ ...newBreed, description: e.target.value })}
                  placeholder="Краткое описание породы..."
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
                  setEditingBreed(null);
                  setNewBreed({ name: '', species_id: 1, description: '' });
                }}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Отмена
              </button>
              <button
                onClick={handleAddBreed}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : (editingBreed ? 'Сохранить' : 'Добавить')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
