import React from 'react';

interface PetHealthProps {
  isEditing: boolean;
  pet: any;
  editData: any;
  setEditData: (data: any) => void;
}

interface Vaccination {
  id?: number;
  date: string;
  vaccine_name: string;
  vaccine_type: string;
  next_date?: string;
  veterinarian?: string;
  clinic?: string;
  notes?: string;
}

interface MedicalRecord {
  id?: number;
  date: string;
  record_type: string;
  title: string;
  description?: string;
  veterinarian?: string;
  clinic?: string;
  diagnosis?: string;
  treatment?: string;
  medications?: string;
  cost?: number;
}

interface Treatment {
  id?: number;
  date: string;
  treatment_type: string;
  product_name: string;
  next_date?: string;
  dosage?: string;
  notes?: string;
}

export default function PetHealth({
  isEditing,
  pet,
  editData,
  setEditData,
}: PetHealthProps) {
  const [vaccinations, setVaccinations] = React.useState<Vaccination[]>([]);
  const [showAddVaccination, setShowAddVaccination] = React.useState(false);
  const [editingVaccination, setEditingVaccination] = React.useState<Vaccination | null>(null);
  const [newVaccination, setNewVaccination] = React.useState<Vaccination>({
    date: '',
    vaccine_name: '',
    vaccine_type: 'rabies',
    next_date: '',
    veterinarian: '',
    clinic: '',
    notes: '',
  });

  const [medicalRecords, setMedicalRecords] = React.useState<MedicalRecord[]>([]);
  const [showAddMedicalRecord, setShowAddMedicalRecord] = React.useState(false);
  const [editingMedicalRecord, setEditingMedicalRecord] = React.useState<MedicalRecord | null>(null);
  const [newMedicalRecord, setNewMedicalRecord] = React.useState<MedicalRecord>({
    date: '',
    record_type: 'examination',
    title: '',
    description: '',
    veterinarian: '',
    clinic: '',
    diagnosis: '',
    treatment: '',
    medications: '',
    cost: undefined,
  });

  const [treatments, setTreatments] = React.useState<Treatment[]>([]);
  const [showAddTreatment, setShowAddTreatment] = React.useState(false);
  const [editingTreatment, setEditingTreatment] = React.useState<Treatment | null>(null);
  const [newTreatment, setNewTreatment] = React.useState<Treatment>({
    date: '',
    treatment_type: 'deworming',
    product_name: '',
    next_date: '',
    dosage: '',
    notes: '',
  });

  // Загрузка данных при монтировании
  React.useEffect(() => {
    fetchVaccinations();
    fetchTreatments();
    fetchMedicalRecords();
  }, [pet.id]);

  // Загрузка прививок
  const fetchVaccinations = async () => {
    try {
      const response = await fetch(`/api/admin/pets/${pet.id}/vaccinations`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setVaccinations(data.vaccinations || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки прививок:', error);
    }
  };

  // Загрузка обработок
  const fetchTreatments = async () => {
    try {
      const response = await fetch(`/api/admin/pets/${pet.id}/treatments`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTreatments(data.treatments || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки обработок:', error);
    }
  };

  // Загрузка медицинских записей
  const fetchMedicalRecords = async () => {
    try {
      const response = await fetch(`/api/admin/pets/${pet.id}/medical-records`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMedicalRecords(data.medical_records || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки медицинских записей:', error);
    }
  };

  const handleAddVaccination = async () => {
    if (!newVaccination.date || !newVaccination.vaccine_name) {
      alert('Заполните дату и название вакцины');
      return;
    }

    try {
      const response = await fetch(`/api/admin/pets/${pet.id}/vaccinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newVaccination),
      });

      if (response.ok) {
        await fetchVaccinations();
        setNewVaccination({
          date: '',
          vaccine_name: '',
          vaccine_type: 'rabies',
          next_date: '',
          veterinarian: '',
          clinic: '',
          notes: '',
        });
        setShowAddVaccination(false);
        alert('Прививка добавлена!');
      } else {
        const data = await response.json();
        alert('Ошибка: ' + (data.error || 'Не удалось добавить прививку'));
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    }
  };

  const handleDeleteVaccination = async (id: number) => {
    if (!confirm('Удалить запись о прививке?')) return;

    try {
      const response = await fetch(`/api/admin/vaccinations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchVaccinations();
        alert('Прививка удалена');
      } else {
        alert('Ошибка при удалении');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    }
  };

  const handleEditVaccination = (vaccination: Vaccination) => {
    setEditingVaccination(vaccination);
    setNewVaccination(vaccination);
    setShowAddVaccination(true);
  };

  const handleUpdateVaccination = async () => {
    if (!editingVaccination) return;
    
    try {
      const response = await fetch(`/api/admin/vaccinations/${editingVaccination.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newVaccination),
      });

      if (response.ok) {
        await fetchVaccinations();
        setEditingVaccination(null);
        setNewVaccination({
          date: '',
          vaccine_name: '',
          vaccine_type: 'rabies',
          next_date: '',
          veterinarian: '',
          clinic: '',
          notes: '',
        });
        setShowAddVaccination(false);
        alert('Прививка обновлена!');
      } else {
        alert('Ошибка при обновлении');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    }
  };

  const getVaccineTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      rabies: '🦠 Бешенство',
      distemper: '🦠 Чума',
      parvovirus: '🦠 Парвовирус',
      hepatitis: '🦠 Гепатит',
      leptospirosis: '🦠 Лептоспироз',
      complex: '💉 Комплексная',
      other: '💊 Другое',
    };
    return types[type] || type;
  };

  // Медицинские записи
  const handleAddMedicalRecord = async () => {
    if (!newMedicalRecord.date || !newMedicalRecord.title) {
      alert('Заполните дату и название записи');
      return;
    }

    try {
      const response = await fetch(`/api/admin/pets/${pet.id}/medical-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newMedicalRecord),
      });

      if (response.ok) {
        await fetchMedicalRecords();
        setNewMedicalRecord({
          date: '',
          record_type: 'examination',
          title: '',
          description: '',
          veterinarian: '',
          clinic: '',
          diagnosis: '',
          treatment: '',
          medications: '',
          cost: undefined,
        });
        setShowAddMedicalRecord(false);
        alert('Медицинская запись добавлена!');
      } else {
        const data = await response.json();
        alert('Ошибка: ' + (data.error || 'Не удалось добавить запись'));
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    }
  };

  const handleDeleteMedicalRecord = async (id: number) => {
    if (!confirm('Удалить медицинскую запись?')) return;

    try {
      const response = await fetch(`/api/admin/medical-records/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchMedicalRecords();
        alert('Запись удалена');
      } else {
        alert('Ошибка при удалении');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    }
  };

  const handleEditMedicalRecord = (record: MedicalRecord) => {
    setEditingMedicalRecord(record);
    setNewMedicalRecord(record);
    setShowAddMedicalRecord(true);
  };

  const handleUpdateMedicalRecord = async () => {
    if (!editingMedicalRecord) return;
    
    try {
      const response = await fetch(`/api/admin/medical-records/${editingMedicalRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newMedicalRecord),
      });

      if (response.ok) {
        await fetchMedicalRecords();
        setEditingMedicalRecord(null);
        setNewMedicalRecord({
          date: '',
          record_type: 'examination',
          title: '',
          description: '',
          veterinarian: '',
          clinic: '',
          diagnosis: '',
          treatment: '',
          medications: '',
          cost: undefined,
        });
        setShowAddMedicalRecord(false);
        alert('Запись обновлена!');
      } else {
        alert('Ошибка при обновлении');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    }
  };

  const getMedicalRecordTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      examination: 'Осмотр',
      surgery: 'Операция',
      analysis: 'Анализы',
      treatment: 'Лечение',
      injury: 'Травма',
      other: 'Другое',
    };
    return types[type] || type;
  };

  const getMedicalRecordIcon = (type: string) => {
    const icons: Record<string, string> = {
      examination: '🔍',
      surgery: '🏥',
      analysis: '🧪',
      treatment: '💊',
      injury: '🩹',
      other: '📋',
    };
    return icons[type] || '📋';
  };

  // Обработки
  const handleAddTreatment = async () => {
    if (!newTreatment.date || !newTreatment.product_name) {
      alert('Заполните дату и название препарата');
      return;
    }

    try {
      const response = await fetch(`/api/admin/pets/${pet.id}/treatments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newTreatment),
      });

      if (response.ok) {
        await fetchTreatments();
        setNewTreatment({
          date: '',
          treatment_type: 'deworming',
          product_name: '',
          next_date: '',
          dosage: '',
          notes: '',
        });
        setShowAddTreatment(false);
        alert('Обработка добавлена!');
      } else {
        const data = await response.json();
        alert('Ошибка: ' + (data.error || 'Не удалось добавить обработку'));
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    }
  };

  const handleDeleteTreatment = async (id: number) => {
    if (!confirm('Удалить запись об обработке?')) return;

    try {
      const response = await fetch(`/api/admin/treatments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchTreatments();
        alert('Обработка удалена');
      } else {
        alert('Ошибка при удалении');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    }
  };

  const handleEditTreatment = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setNewTreatment(treatment);
    setShowAddTreatment(true);
  };

  const handleUpdateTreatment = async () => {
    if (!editingTreatment) return;
    
    try {
      const response = await fetch(`/api/admin/treatments/${editingTreatment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newTreatment),
      });

      if (response.ok) {
        await fetchTreatments();
        setEditingTreatment(null);
        setNewTreatment({
          date: '',
          treatment_type: 'deworming',
          product_name: '',
          next_date: '',
          dosage: '',
          notes: '',
        });
        setShowAddTreatment(false);
        alert('Обработка обновлена!');
      } else {
        alert('Ошибка при обновлении');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка подключения к серверу');
    }
  };

  const getTreatmentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      deworming: '🪱 Дегельминтизация',
      flea_tick: '🦟 От блох и клещей',
      ear_cleaning: '👂 Чистка ушей',
      teeth_cleaning: '🦷 Чистка зубов',
      grooming: '✂️ Груминг',
      other: '🧴 Другое',
    };
    return types[type] || type;
  };
  return (
    <div className="space-y-6">
      {/* Стерилизация */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Стерилизация</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Статус стерилизации */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Статус</label>
            {isEditing ? (
              <select
                value={editData.is_sterilized ? 'yes' : 'no'}
                onChange={(e) => setEditData({ 
                  ...editData, 
                  is_sterilized: e.target.value === 'yes',
                  sterilization_date: e.target.value === 'no' ? '' : editData.sterilization_date
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="no">Не стерилизован(а)</option>
                <option value="yes">Стерилизован(а)</option>
              </select>
            ) : (
              <p className="text-lg text-gray-900">
                {pet.sterilization_date ? (
                  <span className="text-green-600 font-medium">✓ Стерилизован(а)</span>
                ) : (
                  <span className="text-gray-500">Не стерилизован(а)</span>
                )}
              </p>
            )}
          </div>

          {/* Дата стерилизации */}
          {(isEditing ? editData.is_sterilized : pet.sterilization_date) && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Дата стерилизации</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editData.sterilization_date || ''}
                  onChange={(e) => setEditData({ ...editData, sterilization_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-lg text-gray-900">
                  {pet.sterilization_date ? new Date(pet.sterilization_date).toLocaleDateString('ru-RU') : <span className="text-gray-400">Не указана</span>}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Вес */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Физические параметры</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Вес (кг)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                min="0"
                value={editData.weight || ''}
                onChange={(e) => setEditData({ ...editData, weight: e.target.value })}
                placeholder="Например: 15.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg text-gray-900">
                {pet.weight ? (
                  <span className="font-medium">{pet.weight} кг</span>
                ) : (
                  <span className="text-gray-400">Не указан</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Прививки */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center justify-between">
          <span>💉 Прививки</span>
          <button
            onClick={() => {
              setEditingVaccination(null);
              setNewVaccination({
                date: '',
                vaccine_name: '',
                vaccine_type: 'rabies',
                next_date: '',
                veterinarian: '',
                clinic: '',
                notes: '',
              });
              setShowAddVaccination(!showAddVaccination);
            }}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
          >
            {showAddVaccination ? '✕ Отмена' : '+ Добавить прививку'}
          </button>
        </h3>

        {/* Форма добавления/редактирования прививки */}
        {showAddVaccination && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">
              {editingVaccination ? 'Редактировать прививку' : 'Новая прививка'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Дата прививки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата прививки <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newVaccination.date}
                  onChange={(e) => setNewVaccination({ ...newVaccination, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Тип вакцины */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип вакцины</label>
                <select
                  value={newVaccination.vaccine_type}
                  onChange={(e) => setNewVaccination({ ...newVaccination, vaccine_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rabies">Бешенство</option>
                  <option value="distemper">Чума</option>
                  <option value="parvovirus">Парвовирус</option>
                  <option value="hepatitis">Гепатит</option>
                  <option value="leptospirosis">Лептоспироз</option>
                  <option value="complex">Комплексная</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              {/* Название вакцины */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название вакцины <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVaccination.vaccine_name}
                  onChange={(e) => setNewVaccination({ ...newVaccination, vaccine_name: e.target.value })}
                  placeholder="Например: Нобивак Rabies"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Следующая прививка */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Следующая прививка</label>
                <input
                  type="date"
                  value={newVaccination.next_date || ''}
                  onChange={(e) => setNewVaccination({ ...newVaccination, next_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ветеринар */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ветеринар</label>
                <input
                  type="text"
                  value={newVaccination.veterinarian || ''}
                  onChange={(e) => setNewVaccination({ ...newVaccination, veterinarian: e.target.value })}
                  placeholder="ФИО ветеринара"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Клиника */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Клиника</label>
                <input
                  type="text"
                  value={newVaccination.clinic || ''}
                  onChange={(e) => setNewVaccination({ ...newVaccination, clinic: e.target.value })}
                  placeholder="Название клиники"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Примечания */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                <textarea
                  value={newVaccination.notes || ''}
                  onChange={(e) => setNewVaccination({ ...newVaccination, notes: e.target.value })}
                  placeholder="Дополнительная информация..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={editingVaccination ? handleUpdateVaccination : handleAddVaccination}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingVaccination ? 'Сохранить изменения' : 'Добавить прививку'}
              </button>
              <button
                onClick={() => {
                  setShowAddVaccination(false);
                  setEditingVaccination(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Таблица прививок */}
        {vaccinations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Дата</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Тип</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Вакцина</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Следующая</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ветеринар</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Клиника</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {vaccinations.map((vaccination) => (
                  <tr key={vaccination.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(vaccination.date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {getVaccineTypeLabel(vaccination.vaccine_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {vaccination.vaccine_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {vaccination.next_date ? (
                        <span className={
                          new Date(vaccination.next_date) < new Date() 
                            ? 'text-red-600 font-medium' 
                            : 'text-gray-900'
                        }>
                          {new Date(vaccination.next_date).toLocaleDateString('ru-RU')}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {vaccination.veterinarian || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {vaccination.clinic || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditVaccination(vaccination)}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => vaccination.id && handleDeleteVaccination(vaccination.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            <p className="text-lg mb-1">💉 Записей о прививках пока нет</p>
            <p className="text-sm">Нажмите "Добавить прививку" чтобы создать первую запись</p>
          </div>
        )}
      </div>

      {/* Медицинские записи */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center justify-between">
          <span>📋 Медицинские записи</span>
          <button
            onClick={() => {
              setEditingMedicalRecord(null);
              setNewMedicalRecord({
                date: '',
                record_type: 'examination',
                title: '',
                description: '',
                veterinarian: '',
                clinic: '',
                diagnosis: '',
                treatment: '',
                medications: '',
                cost: undefined,
              });
              setShowAddMedicalRecord(!showAddMedicalRecord);
            }}
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
          >
            {showAddMedicalRecord ? '✕ Отмена' : '+ Добавить запись'}
          </button>
        </h3>

        {/* Форма добавления медицинской записи */}
        {showAddMedicalRecord && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">
              {editingMedicalRecord ? 'Редактировать запись' : 'Новая медицинская запись'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newMedicalRecord.date}
                  onChange={(e) => setNewMedicalRecord({ ...newMedicalRecord, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип записи</label>
                <select
                  value={newMedicalRecord.record_type}
                  onChange={(e) => setNewMedicalRecord({ ...newMedicalRecord, record_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="examination">Осмотр</option>
                  <option value="surgery">Операция</option>
                  <option value="analysis">Анализы</option>
                  <option value="treatment">Лечение</option>
                  <option value="injury">Травма</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMedicalRecord.title}
                  onChange={(e) => setNewMedicalRecord({ ...newMedicalRecord, title: e.target.value })}
                  placeholder="Например: Плановый осмотр"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ветеринар</label>
                <input
                  type="text"
                  value={newMedicalRecord.veterinarian || ''}
                  onChange={(e) => setNewMedicalRecord({ ...newMedicalRecord, veterinarian: e.target.value })}
                  placeholder="ФИО ветеринара"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Клиника</label>
                <input
                  type="text"
                  value={newMedicalRecord.clinic || ''}
                  onChange={(e) => setNewMedicalRecord({ ...newMedicalRecord, clinic: e.target.value })}
                  placeholder="Название клиники"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={newMedicalRecord.description || ''}
                  onChange={(e) => setNewMedicalRecord({ ...newMedicalRecord, description: e.target.value })}
                  placeholder="Дополнительная информация..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={editingMedicalRecord ? handleUpdateMedicalRecord : handleAddMedicalRecord}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                {editingMedicalRecord ? 'Сохранить изменения' : 'Добавить запись'}
              </button>
              <button
                onClick={() => {
                  setShowAddMedicalRecord(false);
                  setEditingMedicalRecord(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Список медицинских записей */}
        {medicalRecords.length > 0 ? (
          <div className="space-y-3">
            {medicalRecords.map((record) => (
              <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-xl">
                      {getMedicalRecordIcon(record.record_type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{record.title}</h4>
                      <p className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      {getMedicalRecordTypeLabel(record.record_type)}
                    </span>
                    <button
                      onClick={() => handleEditMedicalRecord(record)}
                      className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => record.id && handleDeleteMedicalRecord(record.id)}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {record.description && (
                  <p className="text-gray-700 text-sm mb-2">{record.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {record.clinic && <span>🏥 {record.clinic}</span>}
                  {record.veterinarian && <span>👨‍⚕️ {record.veterinarian}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            <p className="text-lg mb-1">📋 Медицинских записей пока нет</p>
            <p className="text-sm">Нажмите "Добавить запись" для создания первой записи</p>
          </div>
        )}
      </div>

      {/* Обработки */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center justify-between">
          <span>🧴 Обработки</span>
          <button
            onClick={() => {
              setEditingTreatment(null);
              setNewTreatment({
                date: '',
                treatment_type: 'deworming',
                product_name: '',
                next_date: '',
                dosage: '',
                notes: '',
              });
              setShowAddTreatment(!showAddTreatment);
            }}
            className="px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
          >
            {showAddTreatment ? '✕ Отмена' : '+ Добавить обработку'}
          </button>
        </h3>

        {/* Форма добавления/редактирования обработки */}
        {showAddTreatment && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">
              {editingTreatment ? 'Редактировать обработку' : 'Новая обработка'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Дата обработки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата обработки <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newTreatment.date}
                  onChange={(e) => setNewTreatment({ ...newTreatment, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Тип обработки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип обработки</label>
                <select
                  value={newTreatment.treatment_type}
                  onChange={(e) => setNewTreatment({ ...newTreatment, treatment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="deworming">Дегельминтизация</option>
                  <option value="flea_tick">От блох и клещей</option>
                  <option value="ear_cleaning">Чистка ушей</option>
                  <option value="teeth_cleaning">Чистка зубов</option>
                  <option value="grooming">Груминг</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              {/* Название препарата */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название препарата/средства <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTreatment.product_name}
                  onChange={(e) => setNewTreatment({ ...newTreatment, product_name: e.target.value })}
                  placeholder="Например: Мильбемакс, Фронтлайн"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Следующая обработка */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Следующая обработка</label>
                <input
                  type="date"
                  value={newTreatment.next_date || ''}
                  onChange={(e) => setNewTreatment({ ...newTreatment, next_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Дозировка */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дозировка</label>
                <input
                  type="text"
                  value={newTreatment.dosage || ''}
                  onChange={(e) => setNewTreatment({ ...newTreatment, dosage: e.target.value })}
                  placeholder="Например: 1 таблетка, 2 мл"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Примечания */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                <textarea
                  value={newTreatment.notes || ''}
                  onChange={(e) => setNewTreatment({ ...newTreatment, notes: e.target.value })}
                  placeholder="Дополнительная информация..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={editingTreatment ? handleUpdateTreatment : handleAddTreatment}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                {editingTreatment ? 'Сохранить изменения' : 'Добавить обработку'}
              </button>
              <button
                onClick={() => {
                  setShowAddTreatment(false);
                  setEditingTreatment(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Таблица обработок */}
        {treatments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Дата</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Тип</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Препарат</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Дозировка</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Следующая</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map((treatment) => (
                  <tr key={treatment.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(treatment.date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                        {getTreatmentTypeLabel(treatment.treatment_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {treatment.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {treatment.dosage || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {treatment.next_date ? (
                        <span className={
                          new Date(treatment.next_date) < new Date() 
                            ? 'text-red-600 font-medium' 
                            : 'text-gray-900'
                        }>
                          {new Date(treatment.next_date).toLocaleDateString('ru-RU')}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditTreatment(treatment)}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => treatment.id && handleDeleteTreatment(treatment.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            <p className="text-lg mb-1">🧴 Записей об обработках пока нет</p>
            <p className="text-sm">Нажмите "Добавить обработку" чтобы создать первую запись</p>
          </div>
        )}
      </div>

      {/* Заметки о здоровье */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Заметки о здоровье</h3>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">
            Хронические заболевания, аллергии, особенности
          </label>
          {isEditing ? (
            <textarea
              value={editData.health_notes || ''}
              onChange={(e) => setEditData({ ...editData, health_notes: e.target.value })}
              placeholder="Например: аллергия на курицу, хронический отит, принимает препарат X..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg min-h-[100px]">
              {pet.health_notes ? (
                <p className="text-gray-900 whitespace-pre-wrap">{pet.health_notes}</p>
              ) : (
                <p className="text-gray-400 italic">Заметки о здоровье не добавлены</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Добавить перед закрывающим }
