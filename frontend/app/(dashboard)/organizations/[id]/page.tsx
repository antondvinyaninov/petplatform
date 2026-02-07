'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BuildingOfficeIcon,
  ArrowLeftIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CalendarIcon,
  UserGroupIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface Organization {
  id: number;
  name: string;
  type: string;
  city: string;
  region: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  logo: string;
  created_at: string;
  owner_id: number;
}

interface Member {
  user_id: number;
  user_name: string;
  role: string;
  position: string;
  joined_at: string;
}

interface OrgStats {
  total_members: number;
  total_pets: number;
  total_posts: number;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<OrgStats>({
    total_members: 0,
    total_pets: 0,
    total_posts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizationData();
  }, [orgId]);

  const loadOrganizationData = async () => {
    try {
      // Загружаем данные организации
      const orgRes = await fetch(`/api/gateway/organizations/${orgId}`, {
        credentials: 'include',
      });

      if (orgRes.ok) {
        const orgResult = await orgRes.json();
        const orgData = orgResult.data || orgResult;
        setOrganization(orgData);
      }

      // Загружаем участников
      const membersRes = await fetch(`/api/gateway/organizations/${orgId}/members`, {
        credentials: 'include',
      });

      let membersData: any[] = [];
      if (membersRes.ok) {
        const membersResult = await membersRes.json();
        membersData = Array.isArray(membersResult.data) ? membersResult.data : (Array.isArray(membersResult) ? membersResult : []);
        setMembers(membersData);
      }

      // Загружаем статистику
      const [petsRes, postsRes] = await Promise.all([
        fetch(`/api/gateway/admin/pets?organization_id=${orgId}`, { credentials: 'include' }),
        fetch(`/api/gateway/admin/posts?organization_id=${orgId}`, { credentials: 'include' }),
      ]);

      let petsCount = 0;
      let postsCount = 0;

      if (petsRes.ok) {
        const petsResult = await petsRes.json();
        const petsData = petsResult.data || petsResult;
        petsCount = Array.isArray(petsData) ? petsData.length : 0;
      }

      if (postsRes.ok) {
        const postsResult = await postsRes.json();
        const postsData = postsResult.data || postsResult;
        postsCount = Array.isArray(postsData) ? postsData.length : 0;
      }

      setStats({
        total_members: membersData.length,
        total_pets: petsCount,
        total_posts: postsCount,
      });
    } catch (error) {
      console.error('Error loading organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      shelter: 'Приют',
      clinic: 'Ветклиника',
      fund: 'Фонд',
      volunteer: 'Волонтёрская организация',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      shelter: 'bg-green-100 text-green-800',
      clinic: 'bg-purple-100 text-purple-800',
      fund: 'bg-blue-100 text-blue-800',
      volunteer: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Владелец',
      admin: 'Администратор',
      moderator: 'Модератор',
      member: 'Участник',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      moderator: 'bg-green-100 text-green-800',
      member: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Организация не найдена</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/organizations')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Назад к списку организаций
        </button>

        {/* Organization Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-bold">
                {organization.name[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(organization.type)}`}>
                    {getTypeLabel(organization.type)}
                  </span>
                </div>
                <p className="text-gray-600">ID: {organization.id}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`http://localhost:3000/org/${organization.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Открыть на сайте
              </a>
              <a
                href={`http://localhost:3000/org/${organization.id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <PencilIcon className="w-4 h-4" />
                Редактировать
              </a>
            </div>
          </div>

          {/* Organization Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPinIcon className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">Адрес</p>
                <p className="text-sm">{organization.city}, {organization.region}</p>
                {organization.address && <p className="text-sm">{organization.address}</p>}
              </div>
            </div>
            {organization.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <PhoneIcon className="w-5 h-5" />
                <div>
                  <p className="text-sm font-medium">Телефон</p>
                  <p className="text-sm">{organization.phone}</p>
                </div>
              </div>
            )}
            {organization.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <EnvelopeIcon className="w-5 h-5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm">{organization.email}</p>
                </div>
              </div>
            )}
            {organization.website && (
              <div className="flex items-center gap-2 text-gray-600">
                <GlobeAltIcon className="w-5 h-5" />
                <div>
                  <p className="text-sm font-medium">Сайт</p>
                  <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {organization.website}
                  </a>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">Дата создания</p>
                <p className="text-sm">{formatDate(organization.created_at)}</p>
              </div>
            </div>
          </div>

          {organization.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Описание</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{organization.description}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Участников</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_members}</p>
              </div>
              <UserGroupIcon className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Питомцев</p>
                <p className="text-2xl font-bold text-green-600">{stats.total_pets}</p>
              </div>
              <span className="text-4xl">🐾</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Постов</p>
                <p className="text-2xl font-bold text-purple-600">{stats.total_posts}</p>
              </div>
              <span className="text-4xl">📝</span>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Участники команды</h2>
          
          {members.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Нет участников</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {member.user_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{member.user_name}</p>
                      <p className="text-sm text-gray-500">ID: {member.user_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(member.role)}`}>
                      {getRoleLabel(member.role)}
                    </span>
                    {member.position && (
                      <span className="text-xs text-gray-600">{member.position}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Присоединился: {formatDate(member.joined_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
