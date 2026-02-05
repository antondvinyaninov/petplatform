export default function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Техподдержка</h1>
          <p className="text-lg text-gray-600">Страница находится в разработке</p>
        </div>
        
        <div className="max-w-md mx-auto text-gray-500">
          <p className="mb-4">
            Мы работаем над системой технической поддержки пользователей.
          </p>
          <p className="mb-4">
            Скоро здесь появится форма обратной связи, FAQ и контакты службы поддержки.
          </p>
          <p className="text-sm text-gray-400">
            По срочным вопросам пишите на anton@dvinyaninov.ru
          </p>
        </div>
      </div>
    </div>
  );
}
