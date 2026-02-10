'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PetHeroSection from './components/PetHeroSection';
import PetTabs from './components/PetTabs';

interface Pet {
  id: number;
  name: string;
  species_id?: number;
  species_name: string;
  breed_id?: number;
  breed_name: string;
  owner_id?: number;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  owner_avatar?: string;
  owner_bio?: string;
  owner_role?: string;
  birth_date: string;
  age_type?: string;
  approximate_years?: number;
  approximate_months?: number;
  gender: string;
  description?: string;
  relationship?: string;
  created_at: string;
  // Внешний вид
  color?: string;
  fur?: string;
  ears?: string;
  tail?: string;
  size?: string;
  special_marks?: string;
  // Идентификация
  marking_date?: string;
  tag_number?: string;
  brand_number?: string;
  chip_number?: string;
  // Место содержания
  location_type?: string;
  location_address?: string;
  location_cage?: string;
  location_contact?: string;
  location_phone?: string;
  location_notes?: string;
  // Здоровье
  weight?: number;
  sterilization_date?: string;
  health_notes?: string;
}

interface Breed {
  id: number;
  name: string;
  species_id: number;
}

export default function PetViewPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;
  
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Данные для редактирования
  const [editData, setEditData] = useState({
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
    // Внешний вид
    color: '',
    fur: '',
    ears: '',
    tail: '',
    size: '',
    special_marks: '',
    // Идентификация
    marking_date: '',
    tag_number: '',
    brand_number: '',
    chip_number: '',
    // Место содержания
    location_type: 'home',
    location_address: '',
    location_cage: '',
    location_contact: '',
    location_phone: '',
    location_notes: '',
    // Здоровье
    weight: undefined,
    sterilization_date: '',
    health_notes: '',
    is_sterilized: false,
  });
  
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [birthDateType, setBirthDateType] = useState<'exact' | 'approximate'>('exact');

  useEffect(() => {
    fetchPet();
    fetchBreeds();
  }, [petId]);

  const fetchPet = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pets/${petId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPet(data.pet);
        // Инициализируем данные для редактирования
        setEditData({
          name: data.pet.name,
          species_id: data.pet.species_id || 1,
          breed_id: data.pet.breed_id || null,
          birth_date: data.pet.birth_date ? data.pet.birth_date.split('T')[0] : '',
          age_type: (data.pet.age_type as 'exact' | 'approximate') || 'exact',
          approximate_years: data.pet.approximate_years || 0,
          approximate_months: data.pet.approximate_months || 0,
          gender: data.pet.gender || 'male',
          description: data.pet.description || '',
          relationship: (data.pet.relationship as 'owner' | 'curator') || 'owner',
          // Внешний вид
          color: data.pet.color || '',
          fur: data.pet.fur || '',
          ears: data.pet.ears || '',
          tail: data.pet.tail || '',
          size: data.pet.size || '',
          special_marks: data.pet.special_marks || '',
          // Идентификация
          marking_date: data.pet.marking_date ? data.pet.marking_date.split('T')[0] : '',
          tag_number: data.pet.tag_number || '',
          brand_number: data.pet.brand_number || '',
          chip_number: data.pet.chip_number || '',
          // Место содержания
          location_type: data.pet.location_type || 'home',
          location_address: data.pet.location_address || '',
          location_cage: data.pet.location_cage || '',
          location_contact: data.pet.location_contact || '',
          location_phone: data.pet.location_phone || '',
          location_notes: data.pet.location_notes || '',
          // Здоровье
          weight: data.pet.weight || undefined,
          sterilization_date: data.pet.sterilization_date ? data.pet.sterilization_date.split('T')[0] : '',
          health_notes: data.pet.health_notes || '',
          is_sterilized: !!data.pet.sterilization_date,
        });
        setBreedSearch(data.pet.breed_name || '');
        setBirthDateType(data.pet.age_type || 'exact');
      } else {
        setError('Питомец не найден');
      }
    } catch (err) {
      setError('Ошибка загрузки данных');
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

  const handleSave = async () => {
    if (!editData.name.trim()) {
      alert('Введите имя питомца');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/pets/${petId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        await fetchPet();
        setIsEditing(false);
        alert('Изменения сохранены!');
      } else {
        const data = await response.json();
        alert('Ошибка: ' + (data.error || 'Не удалось сохранить изменения'));
      }
    } catch (err) {
      alert('Ошибка подключения к серверу');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!pet) return;
    
    setIsEditing(false);
    setEditData({
      name: pet.name,
      species_id: pet.species_id || 1,
      breed_id: pet.breed_id || null,
      birth_date: pet.birth_date ? pet.birth_date.split('T')[0] : '',
      age_type: (pet.age_type as 'exact' | 'approximate') || 'exact',
      approximate_years: pet.approximate_years || 0,
      approximate_months: pet.approximate_months || 0,
      gender: pet.gender || 'male',
      description: pet.description || '',
      relationship: (pet.relationship as 'owner' | 'curator') || 'owner',
      // Внешний вид
      color: pet.color || '',
      fur: pet.fur || '',
      ears: pet.ears || '',
      tail: pet.tail || '',
      size: pet.size || '',
      special_marks: pet.special_marks || '',
      // Идентификация
      marking_date: pet.marking_date ? pet.marking_date.split('T')[0] : '',
      tag_number: pet.tag_number || '',
      brand_number: pet.brand_number || '',
      chip_number: pet.chip_number || '',
      // Место содержания
      location_type: pet.location_type || 'home',
      location_address: pet.location_address || '',
      location_cage: pet.location_cage || '',
      location_contact: pet.location_contact || '',
      location_phone: pet.location_phone || '',
      location_notes: pet.location_notes || '',
      // Здоровье
      weight: pet.weight ?? '',
      sterilization_date: pet.sterilization_date ? pet.sterilization_date.split('T')[0] : '',
      health_notes: pet.health_notes || '',
      is_sterilized: !!pet.sterilization_date,
    });
    setBreedSearch(pet.breed_name || '');
    setBirthDateType((pet.age_type as 'exact' | 'approximate') || 'exact');
  };

  const calculateBirthDate = (years: number, months: number) => {
    const today = new Date();
    const birthDate = new Date(today);
    birthDate.setFullYear(today.getFullYear() - years);
    birthDate.setMonth(today.getMonth() - months);
    
    const formattedDate = birthDate.toISOString().split('T')[0];
    setEditData({ 
      ...editData, 
      birth_date: formattedDate,
      age_type: 'approximate',
      approximate_years: years,
      approximate_months: months
    });
  };

  const calculateAge = () => {
    if (!pet?.birth_date) return null;
    
    const birthDate = new Date(pet.birth_date);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return { years, months };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="p-6">
        <div className="text-red-500">{error || 'Питомец не найден'}</div>
        <button
          onClick={() => router.push('/pets')}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Вернуться к списку
        </button>
      </div>
    );
  }

  const age = calculateAge();

  return (
    <div className="p-6">
      {/* Шапка с кнопками */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => router.push('/pets')}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Назад к списку
        </button>
        
        <div className="flex gap-3">
          {!isEditing ? (
            <button
              onClick={() => {
                // Заполняем editData текущими значениями питомца
                setEditData({
                  name: pet.name,
                  species_id: pet.species_id || 1,
                  breed_id: pet.breed_id || null,
                  birth_date: pet.birth_date ? pet.birth_date.split('T')[0] : '',
                  age_type: (pet.age_type as 'exact' | 'approximate') || 'exact',
                  approximate_years: pet.approximate_years || 0,
                  approximate_months: pet.approximate_months || 0,
                  gender: pet.gender || 'male',
                  description: pet.description || '',
                  relationship: (pet.relationship as 'owner' | 'curator') || 'owner',
                  color: pet.color || '',
                  fur: pet.fur || '',
                  ears: pet.ears || '',
                  tail: pet.tail || '',
                  size: pet.size || '',
                  special_marks: pet.special_marks || '',
                  marking_date: pet.marking_date ? pet.marking_date.split('T')[0] : '',
                  tag_number: pet.tag_number || '',
                  brand_number: pet.brand_number || '',
                  chip_number: pet.chip_number || '',
                  location_type: pet.location_type || 'home',
                  location_address: pet.location_address || '',
                  location_cage: pet.location_cage || '',
                  location_contact: pet.location_contact || '',
                  location_phone: pet.location_phone || '',
                  location_notes: pet.location_notes || '',
                  weight: pet.weight || undefined,
                  sterilization_date: pet.sterilization_date ? pet.sterilization_date.split('T')[0] : '',
                  health_notes: pet.health_notes || '',
                  is_sterilized: !!pet.sterilization_date,
                });
                setBreedSearch(pet.breed_name || '');
                setIsEditing(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              ✏️ Редактировать
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero секция */}
      <div className="mb-6">
        <PetHeroSection pet={pet} age={age} />
      </div>

      {/* Табы с контентом */}
      <PetTabs
        isEditing={isEditing}
        pet={pet}
        editData={editData}
        setEditData={setEditData}
        breeds={breeds}
        breedSearch={breedSearch}
        setBreedSearch={setBreedSearch}
        showBreedDropdown={showBreedDropdown}
        setShowBreedDropdown={setShowBreedDropdown}
        birthDateType={birthDateType}
        setBirthDateType={setBirthDateType}
        calculateBirthDate={calculateBirthDate}
        age={age}
      />
    </div>
  );
}
