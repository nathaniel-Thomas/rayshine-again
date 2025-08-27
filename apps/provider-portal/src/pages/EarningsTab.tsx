import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useExpenseStore } from '@/store/expenses';
import { formatCurrency } from '@/lib/utils';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Plus,
  Receipt,
  PieChart,
  Download,
  CreditCard
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, startOfWeek, addDays } from 'date-fns';

// Mock earnings data
const weeklyEarnings = [
  { day: 'Mon', amount: 85 },
  { day: 'Tue', amount: 120 },
  { day: 'Wed', amount: 95 },
  { day: 'Thu', amount: 140 },
  { day: 'Fri', amount: 165 },
  { day: 'Sat', amount: 200 },
  { day: 'Sun', amount: 110 },
];

const monthlyTrend = [
  { month: 'Aug', amount: 2340 },
  { month: 'Sep', amount: 2580 },
  { month: 'Oct', amount: 2890 },
  { month: 'Nov', amount: 3120 },
  { month: 'Dec', amount: 3450 },
  { month: 'Jan', amount: 3680 },
];

const payoutBreakdown = [
  { id: '1', jobId: 'j1', basePay: 85, tips: 15, bonuses: 5, platformFees: -8, total: 97, date: new Date() },
  { id: '2', jobId: 'j2', basePay: 120, tips: 25, bonuses: 10, platformFees: -12, total: 143, date: new Date() },
];

export function EarningsTab() {
  const { expenses, addExpense, getMonthlyTotal } = useExpenseStore();
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'gas' as const,
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const totalWeeklyEarnings = weeklyEarnings.reduce((sum, day) => sum + day.amount, 0);
  const currentMonthExpenses = getMonthlyTotal(new Date().getMonth(), new Date().getFullYear());

  const handleAddExpense = () => {
    if (expenseForm.amount && expenseForm.description) {
      addExpense({
        date: new Date(expenseForm.date),
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description,
      });
      setExpenseForm({
        amount: '',
        category: 'gas',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setShowAddExpense(false);
    }
  };

  return (
    <div className="pb-24 px-4 pt-6 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={24} />
            Earnings
          </h1>
          <p className="text-gray-600">Track your income and expenses</p>
        </div>
        <Button size="sm" variant="outline">
          <Download size={16} className="mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">This Week</span>
            </div>
            <p className="text-2xl font-bold text-green-800">{formatCurrency(totalWeeklyEarnings)}</p>
            <p className="text-sm text-green-600">+12% from last week</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Next Payout</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(450.75)}</p>
            <p className="text-sm text-blue-600">Tomorrow, 3:00 PM</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Earnings Overview</CardTitle>
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setChartView('weekly')}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  chartView === 'weekly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setChartView('monthly')}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  chartView === 'monthly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'weekly' ? (
                <BarChart data={weeklyEarnings}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={monthlyTrend}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Payout Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={18} />
            Recent Payouts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payoutBreakdown.map((payout) => (
            <div key={payout.id} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Job #{payout.jobId}</span>
                <span className="font-bold text-green-600">{formatCurrency(payout.total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Pay:</span>
                  <span>{formatCurrency(payout.basePay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tips:</span>
                  <span className="text-green-600">+{formatCurrency(payout.tips)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bonus:</span>
                  <span className="text-green-600">+{formatCurrency(payout.bonuses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fees:</span>
                  <span className="text-red-600">{formatCurrency(payout.platformFees)}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Expense Tracker */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt size={18} />
              Expense Tracker
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Monthly Summary */}
          <div className="p-3 bg-orange-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-700">This Month's Expenses</span>
              <span className="font-bold text-orange-800">{formatCurrency(currentMonthExpenses)}</span>
            </div>
          </div>

          {/* Add Expense Form */}
          {showAddExpense && (
            <div className="p-4 border rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <Input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select 
                  className="w-full mt-1 p-2 border rounded-xl text-sm"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value as any }))}
                >
                  <option value="gas">Gas</option>
                  <option value="supplies">Supplies</option>
                  <option value="equipment">Equipment</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Input
                  placeholder="Enter description..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddExpense} className="flex-1">
                  Add Expense
                </Button>
                <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Recent Expenses */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Recent Expenses</h4>
            {expenses.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No expenses logged yet</p>
              </div>
            ) : (
              expenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {expense.category}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {format(expense.date, 'MMM d')}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">{formatCurrency(expense.amount)}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}