export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">О платформе</h1>
          <p className="text-lg text-gray-600">Страница находится в разработке</p>
        </div>
        
        <div className="max-w-md mx-auto text-gray-500">
          <p className="mb-4">
            Мы работаем над созданием подробной информации о нашей платформе.
          </p>
          <p>
            Скоро здесь появится информация о миссии, целях и возможностях ZooPlatforma.
          </p>
        </div>
      </div>
    </div>
  );
}
