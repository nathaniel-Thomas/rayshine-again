import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const bookingSchema = z.object({
  serviceId: z.string().min(1, 'Please select a service'),
  date: z.string().min(1, 'Please select a date'),
  time: z.string().min(1, 'Please select a time'),
  address: z.string().min(5, 'Please enter a valid address'),
  notes: z.string().optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

export function BookingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedService, setSelectedService] = useState<string>('')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  })

  const services = [
    { id: '1', name: 'House Cleaning', price: 80, duration: '2-3 hours' },
    { id: '2', name: 'Lawn Care', price: 60, duration: '1-2 hours' },
    { id: '3', name: 'Handyman Services', price: 100, duration: '2-4 hours' },
    { id: '4', name: 'Pet Care', price: 40, duration: '1 hour' },
  ]

  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
  ]

  const onSubmit = async (data: BookingFormData) => {
    setIsLoading(true)
    // TODO: Implement booking logic
    console.log('Booking:', data)
    setIsLoading(false)
  }

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    setValue('serviceId', serviceId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Calendar className="w-6 h-6" />
              Book a Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Select Service</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedService === service.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Clock className="w-4 h-4" />
                            {service.duration}
                          </p>
                        </div>
                        <Badge variant="secondary">${service.price}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.serviceId && (
                  <p className="text-sm text-red-500 mt-1">{errors.serviceId.message}</p>
                )}
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Date</label>
                <Input
                  {...register('date')}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.date && (
                  <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
                )}
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Select Time</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setValue('time', time)}
                      className="p-2 text-sm border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      {time}
                    </button>
                  ))}
                </div>
                {errors.time && (
                  <p className="text-sm text-red-500 mt-1">{errors.time.message}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Service Address
                </label>
                <Input
                  {...register('address')}
                  placeholder="Enter your address"
                />
                {errors.address && (
                  <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Special Instructions (Optional)</label>
                <textarea
                  {...register('notes')}
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={3}
                  placeholder="Any special instructions or requirements..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Booking Service...' : 'Book Service'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
