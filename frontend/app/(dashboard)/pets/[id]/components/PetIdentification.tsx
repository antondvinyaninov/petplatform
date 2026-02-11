interface PetIdentificationProps {
  isEditing: boolean;
  pet: any;
  editData: any;
  setEditData: (data: any) => void;
}

export default function PetIdentification({
  isEditing,
  pet,
  editData,
  setEditData,
}: PetIdentificationProps) {
  return (
    <div className="space-y-6">
      {/* Маркирование */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Маркирование</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Дата маркирования */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Дата маркирования</label>
            {isEditing ? (
              <input
                type="date"
                value={editData.marking_date || ''}
                onChange={(e) => setEditData({ ...editData, marking_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">
                {pet.marking_date ? new Date(pet.marking_date).toLocaleDateString('ru-RU') : <span className="text-gray-400">Не указана</span>}
              </p>
            )}
          </div>

          {/* Номер бирки */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">№ бирки</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.tag_number || ''}
                onChange={(e) => setEditData({ ...editData, tag_number: e.target.value })}
                placeholder="Номер бирки"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900 font-mono">{pet.tag_number || <span className="text-gray-400">Не указан</span>}</p>
            )}
          </div>

          {/* Клеймо */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Клеймо</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.brand_number || ''}
                onChange={(e) => setEditData({ ...editData, brand_number: e.target.value })}
                placeholder="Номер клейма"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900 font-mono">{pet.brand_number || <span className="text-gray-400">Не указано</span>}</p>
            )}
          </div>

          {/* Номер чипа */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">№ чипа</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.chip_number || ''}
                onChange={(e) => setEditData({ ...editData, chip_number: e.target.value })}
                placeholder="Номер микрочипа"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900 font-mono">{pet.chip_number || <span className="text-gray-400">Не указан</span>}</p>
            )}
          </div>
        </div>
      </div>

      {/* Владелец или Куратор */}
      <div>
        {pet.relationship === 'curator' ? (
          // Если куратор - показываем "Владелец: Нет" и "Куратор: Антон"
          <div className="space-y-4">
            {/* Владелец */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Владелец</h3>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">👤</div>
                  <p className="text-gray-600 font-medium">Владелец не указан</p>
                  <p className="text-sm text-gray-500 mt-1">Питомец находится под опекой куратора</p>
                </div>
              </div>
            </div>

            {/* Куратор */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Куратор (зоопомощник)</h3>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {/* Аватар */}
                    {pet.owner_avatar ? (
                      <img 
                        src={pet.owner_avatar} 
                        alt={pet.owner_name}
                        className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-white"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-3xl text-white shadow-lg">
                        🤝
                      </div>
                    )}
                    
                    {/* Информация */}
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-1">
                        {pet.owner_name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        ID пользователя: <span className="font-mono font-semibold">#{pet.owner_id}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Дополнительная информация о кураторе */}
                {pet.owner_bio && (
                  <div className="mb-3 p-3 bg-white/50 rounded-md">
                    <p className="text-gray-700 text-sm italic">"{pet.owner_bio}"</p>
                  </div>
                )}

                <div className="space-y-2">
                  {pet.owner_email && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-lg">📧</span>
                      <a href={`mailto:${pet.owner_email}`} className="hover:text-blue-600 transition-colors">
                        {pet.owner_email}
                      </a>
                    </div>
                  )}
                  
                  {pet.owner_phone && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-lg">📱</span>
                      <a href={`tel:${pet.owner_phone}`} className="hover:text-blue-600 transition-colors">
                        {pet.owner_phone}
                      </a>
                    </div>
                  )}

                  {pet.owner_role && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-lg">🎭</span>
                      <span className="text-sm">
                        {pet.owner_role === 'superadmin' && 'Суперадминистратор'}
                        {pet.owner_role === 'admin' && 'Администратор'}
                        {pet.owner_role === 'user' && 'Пользователь'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Кнопки перехода в профиль */}
                <div className="mt-4 pt-4 border-t border-blue-200 flex gap-3">
                  <a
                    href={`https://zooplatforma.ru/id${pet.owner_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
                  >
                    <span>🌐</span>
                    <span>Публичный профиль</span>
                    <span>↗</span>
                  </a>
                  <a
                    href={`/users/${pet.owner_id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <span>⚙️</span>
                    <span>Управление</span>
                    <span>→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Если владелец - показываем только владельца
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Владелец</h3>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  {/* Аватар */}
                  {pet.owner_avatar ? (
                    <img 
                      src={pet.owner_avatar} 
                      alt={pet.owner_name}
                      className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-white"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-3xl text-white shadow-lg">
                      👤
                    </div>
                  )}
                  
                  {/* Информация */}
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">
                      {pet.owner_name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      ID пользователя: <span className="font-mono font-semibold">#{pet.owner_id}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Дополнительная информация о владельце */}
              {pet.owner_bio && (
                <div className="mb-3 p-3 bg-white/50 rounded-md">
                  <p className="text-gray-700 text-sm italic">"{pet.owner_bio}"</p>
                </div>
              )}

              <div className="space-y-2">
                {pet.owner_email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">📧</span>
                    <a href={`mailto:${pet.owner_email}`} className="hover:text-blue-600 transition-colors">
                      {pet.owner_email}
                    </a>
                  </div>
                )}
                
                {pet.owner_phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">📱</span>
                    <a href={`tel:${pet.owner_phone}`} className="hover:text-blue-600 transition-colors">
                      {pet.owner_phone}
                    </a>
                  </div>
                )}

                {pet.owner_role && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">🎭</span>
                    <span className="text-sm">
                      {pet.owner_role === 'superadmin' && 'Суперадминистратор'}
                      {pet.owner_role === 'admin' && 'Администратор'}
                      {pet.owner_role === 'user' && 'Пользователь'}
                    </span>
                  </div>
                )}
              </div>

              {/* Кнопки перехода в профиль */}
              <div className="mt-4 pt-4 border-t border-blue-200 flex gap-3">
                <a
                  href={`https://zooplatforma.ru/id${pet.owner_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
                >
                  <span>🌐</span>
                  <span>Публичный профиль</span>
                  <span>↗</span>
                </a>
                <a
                  href={`/users/${pet.owner_id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                >
                  <span>⚙️</span>
                  <span>Управление</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Место содержания */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Место содержания</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Тип места содержания */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">Тип места</label>
            {isEditing ? (
              <select
                value={editData.location_type || 'home'}
                onChange={(e) => setEditData({ ...editData, location_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="home">🏠 Дом владельца</option>
                <option value="shelter">🏢 Приют</option>
                <option value="foster">🤝 Передержка</option>
                <option value="clinic">🏥 Ветеринарная клиника</option>
                <option value="hotel">🏨 Гостиница для животных</option>
                <option value="other">📍 Другое</option>
              </select>
            ) : (
              <p className="text-lg text-gray-900">
                {pet.location_type === 'home' && '🏠 Дом владельца'}
                {pet.location_type === 'shelter' && '🏢 Приют'}
                {pet.location_type === 'foster' && '🤝 Передержка'}
                {pet.location_type === 'clinic' && '🏥 Ветеринарная клиника'}
                {pet.location_type === 'hotel' && '🏨 Гостиница для животных'}
                {pet.location_type === 'other' && '📍 Другое'}
                {!pet.location_type && <span className="text-gray-400">Не указано</span>}
              </p>
            )}
          </div>

          {/* Адрес */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">Адрес</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.location_address || ''}
                onChange={(e) => setEditData({ ...editData, location_address: e.target.value })}
                placeholder="Город, улица, дом"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">{pet.location_address || <span className="text-gray-400">Не указан</span>}</p>
            )}
          </div>

          {/* Вольер/Комната */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Вольер/Комната</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.location_cage || ''}
                onChange={(e) => setEditData({ ...editData, location_cage: e.target.value })}
                placeholder="Например: Вольер №81"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">{pet.location_cage || <span className="text-gray-400">Не указан</span>}</p>
            )}
          </div>

          {/* Контактное лицо на месте */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Контактное лицо</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.location_contact || ''}
                onChange={(e) => setEditData({ ...editData, location_contact: e.target.value })}
                placeholder="ФИО ответственного"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">{pet.location_contact || <span className="text-gray-400">Не указан</span>}</p>
            )}
          </div>

          {/* Телефон контактного лица */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Телефон</label>
            {isEditing ? (
              <input
                type="tel"
                value={editData.location_phone || ''}
                onChange={(e) => setEditData({ ...editData, location_phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">
                {pet.location_phone ? (
                  <a href={`tel:${pet.location_phone}`} className="hover:text-blue-600 transition-colors">
                    {pet.location_phone}
                  </a>
                ) : (
                  <span className="text-gray-400">Не указан</span>
                )}
              </p>
            )}
          </div>

          {/* Примечания о месте */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">Примечания</label>
            {isEditing ? (
              <textarea
                value={editData.location_notes || ''}
                onChange={(e) => setEditData({ ...editData, location_notes: e.target.value })}
                placeholder="Дополнительная информация о месте содержания..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="bg-gray-50 p-3 rounded-lg min-h-[60px]">
                {pet.location_notes ? (
                  <p className="text-gray-900 whitespace-pre-wrap">{pet.location_notes}</p>
                ) : (
                  <p className="text-gray-400 italic">Примечаний нет</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
