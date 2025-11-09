import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function Subscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await api.get('/subscription')
      return response.data
    },
  })

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/subscription/upgrade', { payment_method: 'card' })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      window.location.reload()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/subscription/cancel')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })

  const isPremium = user?.subscription_tier === 'premium'

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Подписка</h1>
        <p className="mt-2 text-sm text-gray-600">Управление подпиской</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Бесплатный план</h2>
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-gray-900">0 ₽</p>
              <p className="text-sm text-gray-500">в месяц</p>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-600">Агрегация счетов</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-600">История трат</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-600">Базовая аналитика</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          className={`bg-white shadow rounded-lg p-6 border-2 ${
            isPremium ? 'border-primary-500' : 'border-gray-200'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-medium text-gray-900">Premium план</h2>
            {isPremium && (
              <span className="px-2 py-1 text-xs font-semibold text-primary-800 bg-primary-100 rounded-full">
                Активна
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-gray-900">999 ₽</p>
              <p className="text-sm text-gray-500">в месяц</p>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-600">Всё из бесплатного плана</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-600">ИИ ассистент для анализа трат</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-600">Персонализированные рекомендации</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-600">Помощник по выбору кэшбэка</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-600">Продвинутая аналитика</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm text-gray-600">Экспорт данных</span>
              </li>
            </ul>
            {isPremium ? (
              <div className="mt-4">
                {subscription?.expires_at && (
                  <p className="text-sm text-gray-500 mb-2">
                    Подписка действительна до:{' '}
                    {new Date(subscription.expires_at).toLocaleDateString('ru-RU')}
                  </p>
                )}
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Отмена...' : 'Отменить подписку'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => upgradeMutation.mutate()}
                disabled={upgradeMutation.isPending}
                className="w-full mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {upgradeMutation.isPending ? 'Обработка...' : 'Перейти на Premium'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

