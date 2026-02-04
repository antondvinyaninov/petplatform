'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PostsFeed from '../components/posts/PostsFeed';
import FeedFilters from '../components/posts/FeedFilters';
import RightPanel from '../components/layout/RightPanel';

type FilterType = 'for-you' | 'following' | 'city';

type Props = {
  searchParams: { metka?: string };
};

export default function HomeClient({ searchParams }: Props) {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>('for-you');

  return (
    <div className="flex gap-4">
      {/* Main Feed - оптимальная ширина */}
      <div className="w-full xl:w-[600px] xl:flex-shrink-0">
        <PostsFeed activeFilter={activeFilter} />
      </div>

      {/* Right Panel - только для авторизованных */}
      {isAuthenticated && (
        <aside className="hidden xl:block w-[320px]">
          <div className="sticky top-[58px] space-y-2.5 pb-4">
            <FeedFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            <RightPanel />
          </div>
        </aside>
      )}
    </div>
  );
}
