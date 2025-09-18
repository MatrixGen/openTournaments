import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Header from '../../components/layout/Header';
import { paymentService } from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';

const depositSchema = z.object({
  amount: z.number().min(1, 'Minimum deposit is $1').max(1000, 'Maximum deposit is $1000'),
  payment_method_id: z.string().min(1, 'Please select a payment method'),
});

export default function Deposit() {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { user, updateUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(depositSchema),
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err) {
      console.error('Failed to load payment methods:', err);
      setError('Failed to load payment methods. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the onSubmit function:
    const onSubmit = async (data) => {
    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
        const response = await paymentService.createDeposit(data.amount, data.payment_method_id);
        
        if (response.payment_url) {
        // Redirect to payment gateway
        window.location.href = response.payment_url;
        } else if (response.success) {
        setSuccess('Deposit successful! Your balance has been updated.');
        
        // Update user balance in context
        const walletResponse = await paymentService.getWalletBalance();
        updateUser({ wallet_balance: walletResponse.balance });
        }
    } catch (err) {
        console.error('Deposit error:', err);
        setError(err.response?.data?.message || 'Failed to process deposit. Please try again.');
    } finally {
        setIsProcessing(false);
    }
    };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <main className="mx-auto max-w-md py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Deposit Funds</h1>
          <p className="mt-2 text-gray-400">Add funds to your wallet to join tournaments</p>
          <div className="mt-4 p-4 bg-neutral-800 rounded-lg">
            <p className="text-gray-400">Current Balance</p>
            <p className="text-2xl font-bold text-white">${user?.wallet_balance || '0.00'}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-800/50 py-3 px-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-green-800/50 py-3 px-4 text-sm text-green-200">
            {success}
          </div>
        )}

        <div className="bg-neutral-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-white">
                Deposit Amount ($)
              </label>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="1"
                max="1000"
                {...register('amount', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                placeholder="10.00"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-400">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="payment_method_id" className="block text-sm font-medium text-white">
                Payment Method
              </label>
              <select
                id="payment_method_id"
                {...register('payment_method_id')}
                className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Select a payment method</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
              {errors.payment_method_id && (
                <p className="mt-1 text-sm text-red-400">{errors.payment_method_id.message}</p>
              )}
            </div>

            <div className="bg-neutral-700/50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-white mb-2">Popular Amounts</h3>
              <div className="grid grid-cols-3 gap-2">
                {[10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      const amountInput = document.getElementById('amount');
                      if (amountInput) {
                        amountInput.value = amount;
                      }
                    }}
                    className="py-2 px-3 text-sm font-medium text-white bg-neutral-600 hover:bg-neutral-500 rounded-md transition-colors"
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex w-full justify-center rounded-md border border-transparent bg-primary-500 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Deposit Funds'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            All transactions are secure and encrypted. By depositing, you agree to our Terms of Service.
          </p>
        </div>
      </main>
    </div>
  );
}