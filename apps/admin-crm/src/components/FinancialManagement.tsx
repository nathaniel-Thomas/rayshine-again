import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DollarSign,
  TrendingUp,
  FileText,
  CreditCard,
  Percent,
  Plus,
  Download,
  Eye,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export default function FinancialManagement() {
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const invoices = [
    {
      id: "INV-001",
      number: "INV-2024-001",
      customer: "Sarah Johnson",
      customerEmail: "sarah.j@email.com",
      date: "2024-01-15",
      dueDate: "2024-02-14",
      amount: 240,
      status: "Paid",
      services: ["House Cleaning", "Deep Cleaning"],
      paymentMethod: "Credit Card",
    },
    {
      id: "INV-002",
      number: "INV-2024-002",
      customer: "Mike Chen",
      customerEmail: "m.chen@business.com",
      date: "2024-01-10",
      dueDate: "2024-02-09",
      amount: 450,
      status: "Pending",
      services: ["Lawn Care", "Landscaping"],
      paymentMethod: "Bank Transfer",
    },
    {
      id: "INV-003",
      number: "INV-2024-003",
      customer: "Emily Rodriguez",
      customerEmail: "emily.r@home.net",
      date: "2024-01-05",
      dueDate: "2024-01-25",
      amount: 180,
      status: "Overdue",
      services: ["Window Cleaning"],
      paymentMethod: "Credit Card",
    },
    {
      id: "INV-004",
      number: "INV-2024-004",
      customer: "David Wilson",
      customerEmail: "david.w@email.com",
      date: "2024-01-20",
      dueDate: "2024-02-19",
      amount: 320,
      status: "Paid",
      services: ["Carpet Cleaning", "Upholstery"],
      paymentMethod: "PayPal",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Overdue':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (selectedInvoice) {
    const invoice = invoices.find(inv => inv.id === selectedInvoice);
    
    return (
      <div className="space-y-6">
        {/* Invoice Detail Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setSelectedInvoice(null)}
            variant="outline"
            className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
          >
            ← Back to Invoices
          </Button>
          <div className="flex gap-2">
            <Button className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button className="bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30">
              <FileText className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Invoice {invoice.number}</span>
                  <Badge className={`border ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer & Date Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-300 mb-3">Bill To</h4>
                    <div className="space-y-1">
                      <p className="font-medium text-white">{invoice.customer}</p>
                      <p className="text-gray-400">{invoice.customerEmail}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-300 mb-3">Invoice Details</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Issue Date:</span>
                        <span className="text-gray-300">{invoice.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Due Date:</span>
                        <span className="text-gray-300">{invoice.dueDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Payment Method:</span>
                        <span className="text-gray-300">{invoice.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="border-t border-gray-700/50 pt-6">
                  <h4 className="font-medium text-gray-300 mb-4">Services Provided</h4>
                  <div className="space-y-3">
                    {invoice.services.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                        <span className="text-gray-300">{service}</span>
                        <span className="text-teal-400 font-medium">${(invoice.amount / invoice.services.length).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-gray-700/50 pt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-semibold text-gray-300">Total Amount</span>
                    <span className="text-2xl font-bold text-teal-400">${invoice.amount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Payment Status</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-4">
                  <Badge className={`border text-lg px-4 py-2 ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </Badge>
                </div>
                {invoice.status === 'Overdue' && (
                  <div className="text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Payment overdue
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  Mark as Paid
                </Button>
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  Send Payment Link
                </Button>
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  Schedule Reminder
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Financial Management</h1>
          <p className="text-gray-400 mt-1">Track revenue, invoices, and financial performance</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Monthly Revenue</p>
                <p className="text-2xl font-bold text-white">$127,450</p>
                <p className="text-green-400 text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12.5% from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Outstanding Invoices</p>
                <p className="text-2xl font-bold text-white">$23,890</p>
                <p className="text-yellow-400 text-sm">47 pending payments</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Profit Margin</p>
                <p className="text-2xl font-bold text-white">34.2%</p>
                <p className="text-green-400 text-sm">+2.1% improvement</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Percent className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Payment Success Rate</p>
                <p className="text-2xl font-bold text-white">97.8%</p>
                <p className="text-green-400 text-sm">Excellent performance</p>
              </div>
              <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => setSelectedInvoice(invoice.id)}
                  className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-purple-500/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">#{invoice.number.split('-')[2]}</h3>
                      <p className="text-gray-400 text-sm">{invoice.customer}</p>
                      <p className="text-gray-500 text-xs">{invoice.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${invoice.amount}</p>
                    <Badge className={`border ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Analytics */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              Payment Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Payment Method Breakdown */}
              <div>
                <h4 className="font-medium text-gray-300 mb-3">Payment Methods</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300">Credit Card</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-medium">65%</span>
                      <div className="w-20 h-2 bg-gray-700 rounded-full mt-1">
                        <div className="w-16 h-2 bg-purple-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-teal-400" />
                      <span className="text-gray-300">Bank Transfer</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-medium">25%</span>
                      <div className="w-20 h-2 bg-gray-700 rounded-full mt-1">
                        <div className="w-5 h-2 bg-teal-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-300">PayPal</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-medium">10%</span>
                      <div className="w-20 h-2 bg-gray-700 rounded-full mt-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collection Statistics */}
              <div className="border-t border-gray-700/50 pt-6">
                <h4 className="font-medium text-gray-300 mb-3">Collection Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                    <p className="text-green-400 font-bold text-lg">94.2%</p>
                    <p className="text-gray-400 text-xs">On-time payments</p>
                  </div>
                  <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                    <p className="text-yellow-400 font-bold text-lg">18.5 days</p>
                    <p className="text-gray-400 text-xs">Avg. collection time</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Revenue Trends & Forecasting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">Revenue trend visualization would appear here</p>
              <p className="text-sm text-gray-600 mt-2">Showing consistent growth with 12.5% MoM increase</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}