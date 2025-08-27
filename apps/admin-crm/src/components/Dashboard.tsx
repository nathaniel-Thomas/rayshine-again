import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import Sidebar from './Sidebar';
import DashboardOverview from './DashboardOverview';
import CustomerManagement from './CustomerManagement';
import FinancialManagement from './FinancialManagement';
import AdvancedScheduling from './AdvancedScheduling';
import CommunicationCenter from './CommunicationCenter';
import AnalyticsReporting from './AnalyticsReporting';
import ServiceInventoryManagement from './ServiceInventoryManagement';
import MarketingGrowthTools from './MarketingGrowthTools';
import PeopleCommand from './PeopleCommand';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview />;
      case "customers":
        return <CustomerManagement />;
      case "payments":
        return <FinancialManagement />;
      case "bookings":
        return <AdvancedScheduling />;
      case "support":
        return <CommunicationCenter />;
      case "reports":
        return <AnalyticsReporting />;
      case "providers":
        return <ServiceInventoryManagement />;
      case "marketing":
        return <MarketingGrowthTools />;
      case "people":
        return <PeopleCommand />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 p-8">{renderContent()}</div>
      </div>
    </div>
  );
}