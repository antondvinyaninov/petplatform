'use client';

import { useRouter } from 'next/navigation';
import { getMediaUrl } from '@/lib/utils';

interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birth_date?: string;
  color?: string;
  size?: string;
  photo?: string;
  status?: string;
  city?: string;
  region?: string;
  urgent?: boolean;
  story?: string;
  organization_name?: string;
  organization_type?: string;
}

interface PetCardProps {
  pet: Pet;
}

export default function PetCard({ pet }: PetCardProps) {
  const router = useRouter();

  const getAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    
    if (years === 0) {
      return `${months} мес.`;
    } else if (months < 0) {
      return `${years - 1} ${getYearWord(years - 1)}`;
    }
    return `${years} ${getYearWord(years)}`;
  };

  const getYearWord = (years: number) => {
    if (years === 1) return 'год';
    if (years >= 2 && years <= 4) return 'года';
    return 'лет';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'looking_for_home':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'lost':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'found':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'needs_help':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'home':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'looking_for_home':
        return 'Ищет дом';
      case 'lost':
        return 'Потерялся';
      case 'found':
        return 'Найден';
      case 'needs_help':
        return 'Нужна помощь';
      case 'home':
        return 'Дома';
      default:
        return status;
    }
  };

  const getGenderIcon = (gender?: string) => {
    if (gender === 'male') return '♂';
    if (gender === 'female') return '♀';
    return '';
  };

  const handleClick = () => {
    router.push(`/pets/${pet.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Pet Photo */}
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-md group-hover:scale-105 transition-transform">
          {pet.photo ? (
            <img 
              src={getMediaUrl(pet.photo) || pet.photo} 
              alt={pet.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            pet.name[0]?.toUpperCase()
          )}
        </div>
        
        {/* Urgent Badge */}
        {pet.urgent && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-pulse">
            SOS
          </div>
        )}
      </div>

      {/* Pet Info */}
      <div className="flex-1 min-w-0">
        {/* Name and Status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {pet.name}
              {pet.gender && (
                <span className={`ml-2 ${pet.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>
                  {getGenderIcon(pet.gender)}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              {pet.breed || pet.species}
              {getAge(pet.birth_date) && ` • ${getAge(pet.birth_date)}`}
            </p>
          </div>
          
          {/* Status Badge */}
          {pet.status && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(pet.status)}`}>
              {getStatusText(pet.status)}
            </span>
          )}
        </div>

        {/* Additional Info */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
          {pet.color && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: pet.color.toLowerCase() }}></span>
              {pet.color}
            </span>
          )}
          {pet.size && (
            <span>Размер: {pet.size}</span>
          )}
          {(pet.city || pet.region) && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {pet.city || pet.region}
            </span>
          )}
        </div>

        {/* Organization Badge */}
        {pet.organization_name && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit mb-2">
            <span>🏢</span>
            <span className="font-medium">{pet.organization_name}</span>
          </div>
        )}

        {/* Story Preview */}
        {pet.story && (
          <p className="text-sm text-gray-700 line-clamp-2 italic">
            "{pet.story}"
          </p>
        )}

        {/* View Details Link */}
        <div className="flex items-center gap-2 text-blue-600 font-medium text-sm mt-3 group-hover:gap-3 transition-all">
          <span>Подробнее о питомце</span>
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
