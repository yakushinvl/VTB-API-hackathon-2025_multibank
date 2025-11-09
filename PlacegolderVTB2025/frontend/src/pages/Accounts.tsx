import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useState } from 'react'

export default function Accounts() {
  const [selectedBank, setSelectedBank] = useState('')
  const [userClientId, setUserClientId] = useState('')
  const [showConnectForm, setShowConnectForm] = useState(false)

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await api.get('/accounts')
      return response.data
    },
  })

  const { data: banks } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const response = await api.get('/banks')
      return response.data
    },
  })

  const { data: connections } = useQuery({
    queryKey: ['banks', 'connections'],
    queryFn: async () => {
      const response = await api.get('/banks/connections')
      return response.data
    },
  })

  const queryClient = useQueryClient()

  const connectMutation = useMutation({
    mutationFn: async (data: { bank_name: string; user_client_id: string }) => {
      const response = await api.post('/banks/connect', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['banks', 'connections'] })
      setShowConnectForm(false)
      setSelectedBank('')
      setUserClientId('')
    },
  })

  const syncMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await api.post(`/banks/${connectionId}/sync`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedBank && userClientId) {
      connectMutation.mutate({
        bank_name: selectedBank,
        user_client_id: userClientId,
      })
    }
  }

  const getAccountTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      debit: 'Дебетовая',
      savings: 'Накопительная',
      deposit: 'Вклад',
      credit: 'Кредитная',
    }
    return types[type] || type
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Счета</h1>
          <p className="mt-2 text-sm text-gray-600">Управление банковскими счетами</p>
        </div>
        <button
          onClick={() => setShowConnectForm(!showConnectForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          {showConnectForm ? 'Отмена' : 'Подключить банк'}
        </button>
      </div>

      {showConnectForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Подключение банка</h2>
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Банк</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              >
                <option value="">Выберите банк</option>
                {banks?.map((bank: any) => (
                  <option key={bank.id} value={bank.name}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Client ID</label>
              <input
                type="text"
                value={userClientId}
                onChange={(e) => setUserClientId(e.target.value)}
                placeholder="team200-1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={connectMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {connectMutation.isPending ? 'Подключение...' : 'Подключить'}
            </button>
          </form>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Подключенные банки</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connections?.map((connection: any) => (
            <div key={connection.id} className="bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{connection.bank_name}</h3>
                  <p className="text-sm text-gray-500">Client ID: {connection.client_id}</p>
                </div>
                <button
                  onClick={() => syncMutation.mutate(connection.id)}
                  disabled={syncMutation.isPending}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {syncMutation.isPending ? 'Синхронизация...' : 'Синхронизировать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Все счета</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts?.map((account: any) => (
            <div key={account.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{account.name || 'Счет'}</h3>
                  <p className="text-sm text-gray-500">{account.bank_name}</p>
                </div>
                <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                  {getAccountTypeLabel(account.account_type)}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Баланс</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {account.balance.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: account.currency || 'RUB',
                    })}
                  </p>
                </div>
                {account.available_balance !== account.balance && (
                  <div>
                    <p className="text-sm text-gray-500">Доступно</p>
                    <p className="text-lg font-medium text-gray-700">
                      {account.available_balance.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: account.currency || 'RUB',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {!accounts || accounts.length === 0 && (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <p className="text-gray-500">Нет подключенных счетов</p>
            <p className="text-sm text-gray-400 mt-2">Подключите банк, чтобы начать</p>
          </div>
        )}
      </div>
    </div>
  )
}

