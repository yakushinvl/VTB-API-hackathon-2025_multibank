import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Dashboard() {
  const { data: accountsSummary } = useQuery({
    queryKey: ['accounts', 'summary'],
    queryFn: async () => {
      const response = await api.get('/accounts/summary')
      return response.data
    },
  })

  const { data: transactionsSummary } = useQuery({
    queryKey: ['transactions', 'summary'],
    queryFn: async () => {
      const response = await api.get('/transactions/summary')
      return response.data
    },
  })

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  const expensesData = transactionsSummary?.expenses_by_category
    ? Object.entries(transactionsSummary.expenses_by_category).map(([name, value]) => ({
        name,
        value: Number(value),
      }))
    : []

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Главная</h1>
        <p className="mt-2 text-sm text-gray-600">Обзор ваших финансов</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">💰</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Общий баланс</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {accountsSummary?.total_balance?.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                    }) || '0 ₽'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📊</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Счета</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {accountsSummary?.accounts_count || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📈</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Доходы</dt>
                  <dd className="text-lg font-medium text-green-600">
                    {transactionsSummary?.total_income?.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                    }) || '0 ₽'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📉</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Расходы</dt>
                  <dd className="text-lg font-medium text-red-600">
                    {transactionsSummary?.total_expenses?.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                    }) || '0 ₽'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Расходы по категориям</h2>
          {expensesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">Нет данных о расходах</p>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Топ категории расходов</h2>
          {expensesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expensesData.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">Нет данных о расходах</p>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/accounts"
            className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
          >
            <div className="text-sm font-medium text-gray-900">Управление счетами</div>
            <div className="text-sm text-gray-500 mt-1">Просмотр и управление счетами</div>
          </Link>
          <Link
            to="/transactions"
            className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
          >
            <div className="text-sm font-medium text-gray-900">История транзакций</div>
            <div className="text-sm text-gray-500 mt-1">Просмотр всех транзакций</div>
          </Link>
          <Link
            to="/products"
            className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
          >
            <div className="text-sm font-medium text-gray-900">Рекомендации</div>
            <div className="text-sm text-gray-500 mt-1">Найти лучшие продукты</div>
          </Link>
        </div>
      </div>
    </div>
  )
}

