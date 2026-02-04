'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../contexts/AuthContext';
import { organizationsApi, Organization, OrganizationMember } from '../../../../../lib/organizations-api';
import { BuildingOfficeIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import MembersManager from '../../../../components/organizations/MembersManager';

type Section = 'info' | 'contacts' | 'team';

export default function EditOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('info');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    description: '',
    bio: '',
    email: '',
    phone: '',
    website: '',
    address_full: '',
    address_city: '',
  });

  useEffect(() => {
    if (params.id) {
      loadOrganization();
      loadMembers();
    }
  }, [params.id]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const response = await organizationsApi.getById(Number(params.id));
      if (response.success && response.data) {
        setOrg(response.data);
        setFormData({
          name: response.data.name || '',
          short_name: response.data.short_name || '',
          description: response.data.description || '',
          bio: response.data.bio || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          website: response.data.website || '',
          address_full: response.data.address_full || '',
          address_city: response.data.address_city || '',
        });
        setLogoPreview(response.data.logo ? `http://localhost:8000${response.data.logo}` : null);
        setCoverPreview(response.data.cover_photo ? `http://localhost:8000${response.data.cover_photo}` : null);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
      setError('Ошибка загрузки организации');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await organizationsApi.getMembers(Number(params.id));
      if (response.success && response.data) {
        setMembers(response.data);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой (максимум 10MB)');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setIsUploadingLogo(true);
    try {
      const response = await organizationsApi.uploadLogo(Number(params.id), file);
      if (response.success && response.data) {
        setLogoPreview(`http://localhost:8000${response.data.logo_url}`);
        alert('Логотип успешно обновлен!');
      } else {
        alert(response.error || 'Ошибка загрузки логотипа');
        setLogoPreview(org?.logo ? `http://localhost:8000${org.logo}` : null);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Ошибка загрузки логотипа');
      setLogoPreview(org?.logo ? `http://localhost:8000${org.logo}` : null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой (максимум 10MB)');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setIsUploadingCover(true);
    try {
      const response = await organizationsApi.uploadCover(Number(params.id), file);
      if (response.success && response.data) {
        setCoverPreview(`http://localhost:8000${response.data.cover_url}`);
        alert('Обложка успешно обновлена!');
      } else {
        alert(response.error || 'Ошибка загрузки обложки');
        setCoverPreview(org?.cover_photo ? `http://localhost:8000${org.cover_photo}` : null);
      }
    } catch (error) {
      console.error('Error uploading cover:', error);
      alert('Ошибка загрузки обложки');
      setCoverPreview(org?.cover_photo ? `http://localhost:8000${org.cover_photo}` : null);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await organizationsApi.update(Number(params.id), formData);
      if (response.success) {
        router.push(`/org/${params.id}`);
      } else {
        setError(response.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      setError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Организация не найдена</h2>
          <button onClick={() => router.back()} className="text-blue-500 hover:text-blue-600">
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200 p-6">
            {activeSection === 'info' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Основная информация</h1>
                <p className="text-sm text-gray-600 mt-1">Логотип, обложка, название и описание</p>
              </>
            )}
            {activeSection === 'contacts' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Контакты</h1>
                <p className="text-sm text-gray-600 mt-1">Телефон, email, сайт и адрес</p>
              </>
            )}
            {activeSection === 'team' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Команда</h1>
                <p className="text-sm text-gray-600 mt-1">Управление членами организации</p>
              </>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {activeSection === 'info' && (
              <>
                {coverPreview ? (
                  <div className="relative">
                    <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden">
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                      {isUploadingCover && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    <button type="button" onClick={() => coverInputRef.current?.click()} disabled={isUploadingCover}
                      className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors disabled:opacity-50">
                      <CameraIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    <button type="button" onClick={() => coverInputRef.current?.click()} disabled={isUploadingCover}
                      className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-gray-600">
                      <CameraIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">{isUploadingCover ? 'Загрузка...' : 'Добавить обложку'}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img src={logoPreview} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <BuildingOfficeIcon className="w-12 h-12 text-gray-400" />
                      )}
                      {isUploadingLogo && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    <button type="button" onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo}
                      className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50">
                      <CameraIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{org.name}</h3>
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo}
                        className="text-sm font-medium text-blue-500 hover:text-blue-600 disabled:opacity-50">
                        {isUploadingLogo ? 'Загрузка...' : 'Изменить логотип'}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Полное название <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Короткое название</label>
                  <input type="text" value={formData.short_name} onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Краткое описание</label>
                  <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Краткое описание для карточки организации" />
                  <p className="text-xs text-gray-500 mt-1">{formData.bio.length} / 200 символов</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Полное описание</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={6}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Подробное описание организации" />
                  <p className="text-xs text-gray-500 mt-1">{formData.description.length} / 1000 символов</p>
                </div>
              </>
            )}

            {activeSection === 'contacts' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="info@organization.ru" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+7 (999) 123-45-67" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Веб-сайт</label>
                  <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Полный адрес</label>
                  <input type="text" value={formData.address_full} onChange={(e) => setFormData({ ...formData, address_full: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="г Москва, ул Ленина, д 1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Город</label>
                  <input type="text" value={formData.address_city} onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Москва" />
                </div>
              </>
            )}

            {activeSection === 'team' && user && (
              <div>
                <MembersManager
                  organizationId={Number(params.id)}
                  members={members}
                  currentUserId={Number(user.id)}
                  canManage={members.some(m => m.user_id === Number(user.id) && ['owner', 'admin'].includes(m.role))}
                  onMembersChange={loadMembers}
                />
              </div>
            )}

            {activeSection !== 'team' && (
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => router.back()}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm">
                  Отмена
                </button>
                <button type="submit" disabled={saving || !formData.name.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="lg:col-span-1 space-y-2.5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Разделы</h2>
          </div>
          <div className="p-2">
            <button type="button" onClick={() => setActiveSection('info')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'info' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Основная информация</p>
                  <p className="text-xs text-gray-600 mt-0.5">Логотип, название, описание</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${formData.name && formData.bio ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
            </button>

            <button type="button" onClick={() => setActiveSection('contacts')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors mt-1 ${
                activeSection === 'contacts' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Контакты</p>
                  <p className="text-xs text-gray-600 mt-0.5">Телефон, email, адрес</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${formData.email && formData.phone ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
            </button>

            <button type="button" onClick={() => setActiveSection('team')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors mt-1 ${
                activeSection === 'team' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Команда</p>
                  <p className="text-xs text-gray-600 mt-0.5">Управление членами</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${members.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl shadow-sm p-6 border border-blue-100">
          {activeSection === 'info' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">🏢 Основная информация</h3>
              <p className="text-xs text-blue-800 mb-3">Заполните информацию об организации, добавьте логотип и обложку.</p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Используйте качественное изображение для логотипа</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Обложка помогает выделить вашу организацию</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Краткое описание отображается в карточке</span>
                </li>
              </ul>
            </>
          )}
          {activeSection === 'contacts' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">📞 Контакты</h3>
              <p className="text-xs text-blue-800 mb-3">Укажите контактную информацию для связи с организацией.</p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Телефон и email будут видны посетителям</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Адрес отображается на карте</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Веб-сайт помогает узнать больше о вас</span>
                </li>
              </ul>
            </>
          )}
          {activeSection === 'team' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">👥 Команда</h3>
              <p className="text-xs text-blue-800 mb-3">Управляйте членами организации и их правами доступа.</p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Owner имеет полный доступ ко всем функциям</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Admin может управлять членами и контентом</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Moderator может модерировать контент</span>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
