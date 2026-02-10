interface Breed {
  id: number;
  name: string;
  species_id: number;
}

interface PetGeneralInfoProps {
  isEditing: boolean;
  pet: any;
  editData: any;
  setEditData: (data: any) => void;
  breeds: Breed[];
  breedSearch: string;
  setBreedSearch: (search: string) => void;
  showBreedDropdown: boolean;
  setShowBreedDropdown: (show: boolean) => void;
  age: { years: number; months: number } | null;
}

export default function PetGeneralInfo({
  isEditing,
  pet,
  editData,
  setEditData,
  breeds,
  breedSearch,
  setBreedSearch,
  showBreedDropdown,
  setShowBreedDropdown,
  age,
}: PetGeneralInfoProps) {
  return (
    <div className="space-y-6">
      {/* Основные данные */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Основные данные</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Имя */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Имя питомца</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900 font-medium">{pet.name}</p>
            )}
          </div>

          {/* Вид животного (категория) */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Вид животного</label>
            {isEditing ? (
              <select
                value={editData.species_id}
                onChange={(e) => {
                  setEditData({ ...editData, species_id: Number(e.target.value), breed_id: null });
                  setBreedSearch('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Собака</option>
                <option value={2}>Кошка</option>
              </select>
            ) : (
              <p className="text-lg text-gray-900">{pet.species_name}</p>
            )}
          </div>

          {/* Пол */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Пол</label>
            {isEditing ? (
              <select
                value={editData.gender}
                onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Самец</option>
                <option value="female">Самка</option>
              </select>
            ) : (
              <p className="text-lg text-gray-900">
                {pet.gender === 'male' ? '♂ Самец' : pet.gender === 'female' ? '♀ Самка' : 'Не указан'}
              </p>
            )}
          </div>

          {/* Порода */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-500 mb-1">Порода</label>
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={breedSearch}
                  onChange={(e) => {
                    setBreedSearch(e.target.value);
                    setShowBreedDropdown(true);
                    if (!e.target.value) {
                      setEditData({ ...editData, breed_id: null });
                    }
                  }}
                  onFocus={() => setShowBreedDropdown(true)}
                  placeholder="Начните вводить название породы..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showBreedDropdown && breedSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {breeds
                      .filter(breed => 
                        breed.species_id === editData.species_id &&
                        breed.name.toLowerCase().includes(breedSearch.toLowerCase())
                      )
                      .map(breed => (
                        <div
                          key={breed.id}
                          onClick={() => {
                            setEditData({ ...editData, breed_id: breed.id });
                            setBreedSearch(breed.name);
                            setShowBreedDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                        >
                          {breed.name}
                        </div>
                      ))}
                    {breeds.filter(breed => 
                      breed.species_id === editData.species_id &&
                      breed.name.toLowerCase().includes(breedSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-gray-500">
                        Породы не найдены
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-lg text-gray-900">{pet.breed_name || <span className="text-gray-400">Не указана</span>}</p>
            )}
          </div>

          {/* Текущий возраст */}
          {!isEditing && age && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">Текущий возраст</label>
              <div className="bg-blue-50 p-3 rounded-lg inline-block">
                <p className="text-xl text-blue-900 font-bold">
                  🎂 {age.years} {age.years === 1 ? 'год' : age.years < 5 ? 'года' : 'лет'} {age.months} {age.months === 1 ? 'месяц' : age.months < 5 ? 'месяца' : 'месяцев'}
                </p>
              </div>
            </div>
          )}

          {/* Редактирование возраста */}
          {isEditing && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-2">Возраст питомца</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="age_type"
                      value="exact"
                      checked={editData.age_type === 'exact'}
                      onChange={(e) => setEditData({ ...editData, age_type: 'exact' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Точная дата рождения</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="age_type"
                      value="approximate"
                      checked={editData.age_type === 'approximate'}
                      onChange={(e) => setEditData({ ...editData, age_type: 'approximate' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Приблизительный возраст</span>
                  </label>
                </div>
              </div>

              {editData.age_type === 'exact' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Дата рождения</label>
                  <input
                    type="date"
                    value={editData.birth_date}
                    onChange={(e) => setEditData({ ...editData, birth_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Приблизительный возраст</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Лет</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={editData.approximate_years}
                        onChange={(e) => {
                          const years = Number(e.target.value);
                          setEditData({ ...editData, approximate_years: years });
                          // Автоматически рассчитываем дату рождения
                          const today = new Date();
                          const birthDate = new Date(today);
                          birthDate.setFullYear(today.getFullYear() - years);
                          birthDate.setMonth(today.getMonth() - editData.approximate_months);
                          setEditData({ 
                            ...editData, 
                            approximate_years: years,
                            birth_date: birthDate.toISOString().split('T')[0]
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Месяцев</label>
                      <input
                        type="number"
                        min="0"
                        max="11"
                        value={editData.approximate_months}
                        onChange={(e) => {
                          const months = Number(e.target.value);
                          setEditData({ ...editData, approximate_months: months });
                          // Автоматически рассчитываем дату рождения
                          const today = new Date();
                          const birthDate = new Date(today);
                          birthDate.setFullYear(today.getFullYear() - editData.approximate_years);
                          birthDate.setMonth(today.getMonth() - months);
                          setEditData({ 
                            ...editData, 
                            approximate_months: months,
                            birth_date: birthDate.toISOString().split('T')[0]
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Примерная дата рождения: {editData.birth_date ? new Date(editData.birth_date).toLocaleDateString('ru-RU') : 'не указана'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Внешний вид */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Внешний вид</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Окрас */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Окрас</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.color || ''}
                onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                placeholder="Например: рыжий, черный, пятнистый"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">{pet.color || <span className="text-gray-400">Не указан</span>}</p>
            )}
          </div>

          {/* Шерсть */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Шерсть</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.fur || ''}
                onChange={(e) => setEditData({ ...editData, fur: e.target.value })}
                placeholder="Например: короткая, длинная, кудрявая"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">{pet.fur || <span className="text-gray-400">Не указана</span>}</p>
            )}
          </div>

          {/* Уши */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Уши</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.ears || ''}
                onChange={(e) => setEditData({ ...editData, ears: e.target.value })}
                placeholder="Например: стоячие, висячие"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">{pet.ears || <span className="text-gray-400">Не указаны</span>}</p>
            )}
          </div>

          {/* Хвост */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Хвост</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.tail || ''}
                onChange={(e) => setEditData({ ...editData, tail: e.target.value })}
                placeholder="Например: длинный, купированный"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">{pet.tail || <span className="text-gray-400">Не указан</span>}</p>
            )}
          </div>

          {/* Размер */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Размер</label>
            {isEditing ? (
              <select
                value={editData.size || ''}
                onChange={(e) => setEditData({ ...editData, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Не указан</option>
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Крупный</option>
              </select>
            ) : (
              <p className="text-lg text-gray-900">
                {pet.size === 'small' && 'Маленький'}
                {pet.size === 'medium' && 'Средний'}
                {pet.size === 'large' && 'Крупный'}
                {!pet.size && <span className="text-gray-400">Не указан</span>}
              </p>
            )}
          </div>

          {/* Особые приметы */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">Особые приметы</label>
            {isEditing ? (
              <textarea
                value={editData.special_marks || ''}
                onChange={(e) => setEditData({ ...editData, special_marks: e.target.value })}
                placeholder="Шрамы, пятна, особенности..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">{pet.special_marks || <span className="text-gray-400">Не указаны</span>}</p>
            )}
          </div>
        </div>
      </div>

      {/* Описание */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Дополнительная информация</h3>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Описание</label>
          {isEditing ? (
            <textarea
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Дополнительная информация о питомце: особенности характера, привычки, медицинские особенности..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg min-h-[100px]">
              {pet.description ? (
                <p className="text-gray-900 whitespace-pre-wrap">{pet.description}</p>
              ) : (
                <p className="text-gray-400 italic">Описание не добавлено</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
