import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Zap, Bell, Calendar } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-2xl font-bold text-white">NeedaFourth</h1>
          <div className="space-x-4">
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/20">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-white text-emerald-700 hover:bg-gray-100">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Stop texting around.
            <br />
            <span className="text-emerald-200">Find your fourth in seconds.</span>
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Platform tennis requires exactly 4 players. NeedaFourth helps you find
            that last player (or players) on short notice with fast, targeted
            requests and instant notifications.
          </p>
          <div className="space-x-4">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-gray-100 text-lg px-8 py-6">
                Start Finding Players
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h3>
          <div className="grid md:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Calendar className="w-10 h-10 text-emerald-600" />}
              title="Post a Request"
              description="Need 1, 2, or 3 players? Create a quick request with date, time, and club."
            />
            <FeatureCard
              icon={<Users className="w-10 h-10 text-emerald-600" />}
              title="Target Your Crew"
              description="Send to your crews, your club, or go regional to find players fast."
            />
            <FeatureCard
              icon={<Bell className="w-10 h-10 text-emerald-600" />}
              title="Instant Notifications"
              description="Players get notified instantly via push, email, or SMS."
            />
            <FeatureCard
              icon={<Zap className="w-10 h-10 text-emerald-600" />}
              title="Quick Fill"
              description="First come, first served. Or pick your players - your choice."
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to find your fourth?
          </h3>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join thousands of platform tennis players who never worry about filling
            their matches.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8">
              Create Free Account
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-950 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>&copy; 2024 NeedaFourth. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="text-center p-6">
    <div className="flex justify-center mb-4">{icon}</div>
    <h4 className="text-xl font-semibold text-gray-900 mb-2">{title}</h4>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default Landing;
