interface PetOwnerInfoProps {
  pet: any;
}

export default function PetOwnerInfo({ pet }: PetOwnerInfoProps) {
  return (
    <div>
      <div className="space-y-3">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-4xl mb-2">👤</div>
          <p className="text-lg font-medium text-gray-900">{pet.owner_name || 'Не указан'}</p>
          {pet.owner_id && (
            <p className="text-sm text-gray-500 mt-1">ID: {pet.owner_id}</p>
          )}
        </div>
      </div>
    </div>
  );
}
