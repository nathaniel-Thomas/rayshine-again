import { useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, Clock, Star, Home, Building, Trash2, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function HomePage() {
  const navigate = useNavigate()

  const serviceCategories = [
    {
      id: 'home',
      name: 'Home Services',
      description: 'Professional cleaning for your home',
      icon: Home,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'business',
      name: 'Business Services', 
      description: 'Commercial cleaning solutions',
      icon: Building,
      color: 'from-orange-500 to-orange-600',
    },
    {
      id: 'bins',
      name: 'Bin Cleaning',
      description: 'Sanitize your trash bins',
      icon: Trash2,
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'vehicles',
      name: 'Vehicle Services',
      description: 'Car washing and detailing',
      icon: Car,
      color: 'from-amber-500 to-amber-600',
    },
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      rating: 5,
      comment: 'Excellent service! Alex was thorough, professional, and left my house spotless.',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
    },
    {
      name: 'Michael Chen',
      rating: 5,
      comment: 'Great experience with office cleaning. Very reliable and professional team.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      name: 'Emma Davis',
      rating: 5,
      comment: 'Love the convenience and quality. Will definitely book again!',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
  ]

  const trustFeatures = [
    {
      icon: Shield,
      title: 'Insured & Bonded',
      description: 'All providers are fully insured and background checked',
    },
    {
      icon: Clock,
      title: 'On-Time Guarantee',
      description: 'We guarantee punctual service or your money back',
    },
    {
      icon: Star,
      title: '100% Satisfaction',
      description: 'Not happy? We\'ll make it right or refund your payment',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Professional Cleaning
            <span className="block text-primary">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Book trusted, verified cleaning professionals in minutes. 
            Quality service guaranteed for your home, office, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/book')}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg rounded-2xl"
            >
              Book Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="clay"
              size="lg"
              onClick={() => navigate('/how-it-works')}
              className="px-8 py-4 text-lg"
            >
              How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Service
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From homes to businesses, we've got all your cleaning needs covered
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {serviceCategories.map((category) => {
              const IconComponent = category.icon
              return (
                <Card
                  key={category.id}
                  className="group cursor-pointer hover:scale-105 transition-all duration-300 border-0 p-0"
                  onClick={() => navigate(`/services/${category.id}`)}
                >
                  <CardContent className="p-8 text-center">
                    <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {category.name}
                    </h3>
                    <p className="text-gray-600">
                      {category.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get professional cleaning in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Book Online',
                description: 'Choose your service, date, and time in just a few clicks',
              },
              {
                step: '2',
                title: 'Get Matched',
                description: 'We connect you with verified, local cleaning professionals',
              },
              {
                step: '3',
                title: 'Relax & Enjoy',
                description: 'Sit back while we take care of the cleaning for you',
              },
            ].map((step, index) => (
              <Card key={index} className="text-center border-0">
                <CardContent className="p-8">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose RayShine?
            </h2>
            <p className="text-xl text-gray-600">
              Your peace of mind is our priority
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustFeatures.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <Card key={index} className="text-center border-0">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-100 flex items-center justify-center">
                      <IconComponent className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of satisfied customers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {testimonial.name}
                      </h4>
                      <div className="flex">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 italic">
                    "{testimonial.comment}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of happy customers and experience the convenience of professional cleaning
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/book')}
            className="bg-white text-primary hover:bg-gray-100 px-8 py-4 text-lg rounded-2xl"
          >
            Book Your First Service
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  )
}
