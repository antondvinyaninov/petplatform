interface PetOwnerInfoProps {
  pet: any;
}

export default function PetOwnerInfo({ pet }: PetOwnerInfoProps) {
  const isCurator = pet.relationship === 'curator';
  
  return (
    <div>
      <div className="space-y-3">
        {/* Владелец */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-3xl">👤</div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">Владелец</p>
              <p className="text-lg font-medium text-gray-900">
                {isCurator ? 'Нет' : (pet.owner_name || 'Не указан')}
              </p>
            </div>
          </div>
        </div>

        {/* Куратор (показываем только если есть) */}
        {isCurator && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🤝</div>
              <div className="flex-1">
                <p className="text-sm text-blue-600 mb-1">Куратор (зоопомощник)</p>
                <p className="text-lg font-medium text-gray-900">{pet.owner_name || 'Не указан'}</p>
                {pet.owner_id && (
                  <p className="text-sm text-gray-500 mt-1">ID: {pet.owner_id}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
