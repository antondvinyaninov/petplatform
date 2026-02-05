export default function StatisticsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Статистика</h1>
          <p className="text-lg text-gray-600">Страница находится в разработке</p>
        </div>
        
        <div className="max-w-md mx-auto text-gray-500">
          <p className="mb-4">
            Мы работаем над системой аналитики и статистики платформы.
          </p>
          <p>
            Скоро здесь появятся графики активности, статистика по питомцам и другие интересные данные.
          </p>
        </div>
      </div>
    </div>
  );
}
