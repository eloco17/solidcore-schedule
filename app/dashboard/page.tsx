'use client';

import { useRouter } from 'next/navigation';

const gyms = [
  {
    id: 'lifetime',
    name: 'LifeTime Pickleball',
    description: 'Book your pickleball court at LifeTime Fitness',
    image: '/lifetime-logo.png',
  },
  {
    id: 'Solidcore',
    name: 'Solidcore',
    description: 'Book your Solidcore class',
    image: '/Solidcore-logo.png',
  },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Select a Gym</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gyms.map((gym) => (
            <div
              key={gym.id}
              onClick={() => router.push(`/gyms/${gym.id}`)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition duration-200 hover:scale-105 hover:shadow-lg"
            >
              <div className="p-6">
                <div className="h-32 flex items-center justify-center mb-4">
                  <img
                    src={gym.image}
                    alt={gym.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {gym.name}
                </h2>
                <p className="text-gray-600">{gym.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 