import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Settings,
  Percent,
  Clock,
  MapPin,
  Mail,
  Shield,
  Database,
  Zap,
  Save,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export default function SettingsManagement() {
  const [settings, setSettings] = useState({
    platform_fee_percentage: '15',
    max_quote_duration_hours: '72',
    min_booking_advance_hours: '2',
    max_service_radius_miles: '50',
    support_email: 'support@rayshine.com',
    maintenance_mode: false,
    auto_assignment_enabled: true,
    pps_recalculation_frequency: 'hourly',
    notification_cleanup_days: '30',
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    // Show success message
  };

  const handleReset = () => {
    setSettings({
      platform_fee_percentage: '15',
      max_quote_duration_hours: '72',
      min_booking_advance_hours: '2',
      max_service_radius_miles: '50',
      support_email: 'support@rayshine.com',
      maintenance_mode: false,
      auto_assignment_enabled: true,
      pps_recalculation_frequency: 'hourly',
      notification_cleanup_days: '30',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings Management</h1>
          <p className="text-gray-400">Configure system-wide settings and parameters</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleReset} className="border-gray-600 text-gray-300">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
          >
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Settings */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Percent className="mr-2 h-5 w-5 text-green-400" />
              Financial Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform Fee Percentage
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={settings.platform_fee_percentage}
                  onChange={(e) => setSettings({...settings, platform_fee_percentage: e.target.value})}
                  className="bg-gray-800/50 border-gray-700 text-white pr-8"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Fee charged on each completed booking
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Booking Settings */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Clock className="mr-2 h-5 w-5 text-blue-400" />
              Booking Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Quote Duration (Hours)
              </label>
              <Input
                type="number"
                value={settings.max_quote_duration_hours}
                onChange={(e) => setSettings({...settings, max_quote_duration_hours: e.target.value})}
                className="bg-gray-800/50 border-gray-700 text-white"
                min="1"
                max="168"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long quotes remain valid
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Booking Advance (Hours)
              </label>
              <Input
                type="number"
                value={settings.min_booking_advance_hours}
                onChange={(e) => setSettings({...settings, min_booking_advance_hours: e.target.value})}
                className="bg-gray-800/50 border-gray-700 text-white"
                min="0"
                max="48"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum notice required for bookings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Geographic Settings */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-teal-400" />
              Geographic Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Service Radius (Miles)
              </label>
              <Input
                type="number"
                value={settings.max_service_radius_miles}
                onChange={(e) => setSettings({...settings, max_service_radius_miles: e.target.value})}
                className="bg-gray-800/50 border-gray-700 text-white"
                min="1"
                max="200"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum distance providers can travel
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Communication Settings */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Mail className="mr-2 h-5 w-5 text-purple-400" />
              Communication Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Support Email
              </label>
              <Input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({...settings, support_email: e.target.value})}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Primary contact for customer support
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="mr-2 h-5 w-5 text-orange-400" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Maintenance Mode
                </label>
                <p className="text-xs text-gray-500">
                  Temporarily disable public access
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {settings.maintenance_mode && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                )}
                <Button
                  variant={settings.maintenance_mode ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setSettings({...settings, maintenance_mode: !settings.maintenance_mode})}
                  className={settings.maintenance_mode ? "" : "border-gray-600 text-gray-300"}
                >
                  {settings.maintenance_mode ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Auto Job Assignment
                </label>
                <p className="text-xs text-gray-500">
                  Automatically assign jobs to providers
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {settings.auto_assignment_enabled && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Zap className="mr-1 h-3 w-3" />
                    Enabled
                  </Badge>
                )}
                <Button
                  variant={settings.auto_assignment_enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings({...settings, auto_assignment_enabled: !settings.auto_assignment_enabled})}
                  className={settings.auto_assignment_enabled ? "bg-green-600 hover:bg-green-700" : "border-gray-600 text-gray-300"}
                >
                  {settings.auto_assignment_enabled ? 'Enabled' : 'Enable'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PPS Settings */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Database className="mr-2 h-5 w-5 text-cyan-400" />
              PPS System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                PPS Recalculation Frequency
              </label>
              <select
                value={settings.pps_recalculation_frequency}
                onChange={(e) => setSettings({...settings, pps_recalculation_frequency: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How often to recalculate provider scores
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notification Cleanup (Days)
              </label>
              <Input
                type="number"
                value={settings.notification_cleanup_days}
                onChange={(e) => setSettings({...settings, notification_cleanup_days: e.target.value})}
                className="bg-gray-800/50 border-gray-700 text-white"
                min="1"
                max="365"
              />
              <p className="text-xs text-gray-500 mt-1">
                Delete old notifications after this many days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Zap className="mr-2 h-5 w-5 text-yellow-400" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-400">API Server</p>
              <p className="text-xs text-green-400">Online</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-400">Database</p>
              <p className="text-xs text-green-400">Connected</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-400">WebSocket</p>
              <p className="text-xs text-green-400">Active</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-400">Cron Jobs</p>
              <p className="text-xs text-green-400">Running</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}