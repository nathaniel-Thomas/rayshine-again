import React from 'react';
import { Button } from './ui/button';
import {
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  MessageSquare,
  FileText,
  Settings,
  Target,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'payments', label: 'Financials', icon: DollarSign },
    { id: 'bookings', label: 'Scheduling', icon: Calendar },
    { id: 'support', label: 'Communication', icon: MessageSquare },
    { id: 'reports', label: 'Analytics', icon: FileText },
    { id: 'providers', label: 'Services', icon: Settings },
    { id: 'marketing', label: 'Marketing', icon: Target },
    { id: 'people', label: 'People Command', icon: Shield },
  ];

  return (
    <div className="w-64 min-h-screen bg-gray-900/50 backdrop-blur-xl border-r border-gray-800/50 py-4">
      <div className="px-4 mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
          RayShine
        </h1>
        <p className="text-gray-500 text-sm">Admin Dashboard</p>
      </div>
      <nav>
        <ul className="space-y-2 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-gray-300 hover:bg-gray-800/50 transition-all ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-teal-500/20 text-white border border-purple-500/30'
                      : ''
                  }`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}