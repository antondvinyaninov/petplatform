interface PetSystemInfoProps {
  pet: any;
}

export default function PetSystemInfo({ pet }: PetSystemInfoProps) {
  return (
    <div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">ID питомца</label>
          <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">#{pet.id}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Дата регистрации</label>
          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
            {new Date(pet.created_at).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {pet.species_id && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ID вида</label>
            <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{pet.species_id}</p>
          </div>
        )}

        {pet.breed_id && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ID породы</label>
            <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{pet.breed_id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
