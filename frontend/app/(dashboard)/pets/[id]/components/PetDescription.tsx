interface PetDescriptionProps {
  isEditing: boolean;
  pet: any;
  editData: any;
  setEditData: (data: any) => void;
}

export default function PetDescription({
  isEditing,
  pet,
  editData,
  setEditData,
}: PetDescriptionProps) {
  return (
    <div>
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Описание</label>
        {isEditing ? (
          <textarea
            value={editData.description}
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
  );
}
