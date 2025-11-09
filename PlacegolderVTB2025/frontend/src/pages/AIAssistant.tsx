import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AIAssistant() {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([])

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['ai', 'analyze-spending'],
    queryFn: async () => {
      const response = await api.post('/ai/analyze-spending')
      return response.data
    },
    enabled: user?.subscription_tier === 'premium',
    retry: false,
  })

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.post('/ai/chat', { message })
      return response.data
    },
    onSuccess: (data) => {
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: data.response },
      ])
      setMessage('')
    },
  })

  const { data: cashbackRecommendation } = useQuery({
    queryKey: ['ai', 'cashback-recommendation'],
    queryFn: async () => {
      const response = await api.get('/ai/cashback-recommendation')
      return response.data
    },
    enabled: user?.subscription_tier === 'premium',
    retry: false,
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && user?.subscription_tier === 'premium') {
      chatMutation.mutate(message)
    }
  }

  if (user?.subscription_tier !== 'premium') {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-yellow-800 mb-2">Требуется Premium подписка</h2>
          <p className="text-yellow-700 mb-4">
            ИИ ассистент доступен только для пользователей с Premium подпиской.
          </p>
          <a
            href="/subscription"
            className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Перейти к подписке
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ИИ Ассистент</h1>
        <p className="mt-2 text-sm text-gray-600">Анализ трат и персональные рекомендации</p>
      </div>

      {analysisLoading ? (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <p className="text-gray-500">Анализ трат...</p>
        </div>
      ) : analysis ? (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Анализ трат</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Резюме</h3>
              <p className="text-sm text-gray-600 mt-1">{analysis.summary}</p>
            </div>
            {analysis.top_categories && analysis.top_categories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Топ категории</h3>
                <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                  {analysis.top_categories.map((category: string, index: number) => (
                    <li key={index}>{category}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Рекомендации</h3>
                <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                  {analysis.recommendations.map((rec: string, index: number) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.savings_opportunities && analysis.savings_opportunities.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Возможности экономии</h3>
                <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                  {analysis.savings_opportunities.map((opp: string, index: number) => (
                    <li key={index}>{opp}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.cashback_suggestions && analysis.cashback_suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Предложения по кэшбэку</h3>
                <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                  {analysis.cashback_suggestions.map((suggestion: string, index: number) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {cashbackRecommendation && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Рекомендация по кэшбэку</h2>
          {cashbackRecommendation.recommended_product ? (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900">
                {cashbackRecommendation.recommended_product.product_name}
              </h3>
              <p className="text-sm text-gray-500">{cashbackRecommendation.recommended_product.bank}</p>
              <p className="text-2xl font-bold text-primary-600 mt-2">
                {((cashbackRecommendation.recommended_product.cashback_rate || 0) * 100).toFixed(1)}%
                кэшбэк
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {cashbackRecommendation.recommended_product.reason}
              </p>
              {cashbackRecommendation.estimated_savings && (
                <p className="text-sm font-medium text-gray-900 mt-2">
                  Примерная экономия: {cashbackRecommendation.estimated_savings.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                  })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Нет рекомендаций</p>
          )}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Чат с ассистентом</h2>
        <div className="space-y-4">
          <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <p className="text-gray-500 text-center">Начните разговор с ассистентом</p>
            ) : (
              chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Задайте вопрос ассистенту..."
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              disabled={chatMutation.isPending}
            />
            <button
              type="submit"
              disabled={chatMutation.isPending || !message.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {chatMutation.isPending ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

