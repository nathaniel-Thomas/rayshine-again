import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Expense, ExpenseCategory } from '@/types';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface ExpenseStore {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  getMonthlyTotal: (month: number, year: number) => number;
  getExpensesByCategory: (category: ExpenseCategory) => Expense[];
}

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set, get) => ({
      expenses: [
        {
          id: '1',
          date: new Date(2024, 0, 15),
          amount: 45.50,
          category: 'gas',
          description: 'Gas for work trips',
        },
        {
          id: '2',
          date: new Date(2024, 0, 10),
          amount: 25.99,
          category: 'supplies',
          description: 'Cleaning supplies',
        },
        {
          id: '3',
          date: new Date(2024, 0, 8),
          amount: 12.50,
          category: 'other',
          description: 'Parking fees',
        },
      ],
      addExpense: (expense) => {
        const newExpense: Expense = {
          ...expense,
          id: Date.now().toString(),
        };
        set((state) => ({
          expenses: [newExpense, ...state.expenses],
        }));
      },
      getMonthlyTotal: (month, year) => {
        const { expenses } = get();
        const monthStart = startOfMonth(new Date(year, month));
        const monthEnd = endOfMonth(new Date(year, month));
        
        return expenses
          .filter((expense) =>
            isWithinInterval(expense.date, { start: monthStart, end: monthEnd })
          )
          .reduce((total, expense) => total + expense.amount, 0);
      },
      getExpensesByCategory: (category) => {
        const { expenses } = get();
        return expenses.filter((expense) => expense.category === category);
      },
    }),
    {
      name: 'expenses-storage',
    }
  )
);