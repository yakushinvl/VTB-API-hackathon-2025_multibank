import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { useState } from 'react'
import { format } from 'date-fns'

export default function Transactions() {
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const { data: transactions } = useQuery({
    queryKey: ['transactions', selectedAccount, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedAccount) params.append('account_id', selectedAccount.toString())
      if (selectedCategory) params.append('category', selectedCategory)
      const response = await api.get(`/transactions?${params.toString()}`)
      return response.data
    },
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await api.get('/accounts')
      return response.data
    },
  })

  const categories = Array.from(
    new Set(transactions?.map((t: any) => t.category).filter(Boolean))
  )

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Транзакции</h1>
        <p className="mt-2 text-sm text-gray-600">История всех транзакций</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Счет</label>
            <select
              value={selectedAccount || ''}
              onChange={(e) => setSelectedAccount(e.target.value ? Number(e.target.value) : null)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Все счета</option>
              {accounts?.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.bank_name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Категория</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Все категории</option>
              {categories.map((category: string) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Счет
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions?.map((transaction: any) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(transaction.transaction_date), 'dd MMM yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description || transaction.merchant || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                      {transaction.category || 'Другое'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {transaction.account_name} ({transaction.bank_name})
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.amount >= 0 ? '+' : ''}
                    {transaction.amount.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: transaction.currency || 'RUB',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!transactions || transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет транзакций</p>
          </div>
        )}
      </div>
    </div>
  )
}

