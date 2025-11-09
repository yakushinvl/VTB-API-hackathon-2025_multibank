import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { useState } from 'react'

export default function Products() {
  const [selectedType, setSelectedType] = useState<string>('')

  const { data: products } = useQuery({
    queryKey: ['products', 'recommendations', selectedType],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedType) params.append('product_type', selectedType)
      const response = await api.get(`/products/recommendations?${params.toString()}`)
      return response.data
    },
  })

  const { data: cashbackSuggestions } = useQuery({
    queryKey: ['products', 'cashback-suggestions'],
    queryFn: async () => {
      const response = await api.get('/products/cashback-suggestions')
      return response.data
    },
  })

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Рекомендации продуктов</h1>
        <p className="mt-2 text-sm text-gray-600">Найдите лучшие банковские продукты</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Тип продукта</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          <option value="">Все типы</option>
          <option value="debit">Дебетовые карты</option>
          <option value="savings">Накопительные счета</option>
          <option value="deposit">Вклады</option>
          <option value="credit">Кредитные карты</option>
        </select>
      </div>

      {cashbackSuggestions && cashbackSuggestions.suggestions.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Рекомендации по кэшбэку</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cashbackSuggestions.suggestions.map((product: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900">{product.product_name}</h3>
                <p className="text-sm text-gray-500">{product.bank_name}</p>
                <p className="text-2xl font-bold text-primary-600 mt-2">
                  {((product.cashback_rate || 0) * 100).toFixed(1)}% кэшбэк
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((product: any) => (
          <div
            key={product.id || `${product.bank_name}-${product.product_name}`}
            className={`bg-white shadow rounded-lg p-6 ${
              product.is_user_has ? 'border-2 border-gray-300' : 'border-2 border-primary-500'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{product.product_name}</h3>
                <p className="text-sm text-gray-500">{product.bank_name}</p>
              </div>
              {product.is_user_has && (
                <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                  У вас есть
                </span>
              )}
            </div>
            {product.description && (
              <p className="text-sm text-gray-600 mb-4">{product.description}</p>
            )}
            <div className="space-y-2">
              {product.interest_rate && (
                <div>
                  <span className="text-sm text-gray-500">Процентная ставка: </span>
                  <span className="text-sm font-medium text-gray-900">
                    {(product.interest_rate * 100).toFixed(2)}%
                  </span>
                </div>
              )}
              {product.cashback_rate && (
                <div>
                  <span className="text-sm text-gray-500">Кэшбэк: </span>
                  <span className="text-sm font-medium text-primary-600">
                    {(product.cashback_rate * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            {product.conditions && Object.keys(product.conditions).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">Условия:</p>
                <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                  {Object.entries(product.conditions).map(([key, value]) => (
                    <li key={key}>
                      {key}: {String(value)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      {!products || products.length === 0 && (
        <div className="text-center py-12 bg-white shadow rounded-lg">
          <p className="text-gray-500">Нет доступных продуктов</p>
        </div>
      )}
    </div>
  )
}

