import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import Sidebar from './Sidebar';
import { RealTimeNotifications } from './RealTimeNotifications';
import DashboardOverview from './DashboardOverview';
import CustomerManagement from './CustomerManagement';
import FinancialManagement from './FinancialManagement';
import AdvancedScheduling from './AdvancedScheduling';
import CommunicationCenter from './CommunicationCenter';
import AnalyticsReporting from './AnalyticsReporting';
import ProvidersManagement from './ProvidersManagement';
import SettingsManagement from './SettingsManagement';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview />;
      case "customers":
        return <CustomerManagement />;
      case "providers":
        return <ProvidersManagement />;
      case "bookings":
        return <AdvancedScheduling />;
      case "payments":
        return <FinancialManagement />;
      case "support":
        return <CommunicationCenter />;
      case "reports":
        return <AnalyticsReporting />;
      case "settings":
        return <SettingsManagement />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 p-8">
          <div className="flex justify-end mb-4">
            <RealTimeNotifications />
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}