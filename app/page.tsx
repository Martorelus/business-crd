'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

// Forces Next.js to bypass build-time caching and evaluate the page dynamically
export const dynamic = 'force-dynamic';

interface Category {
  name: string;
  color: string;
}

interface Card {
  id: number;
  name: string;
  title: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  categories: Category | null;
}

// Safely maps database color strings to full Tailwind CSS color systems
const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', border: 'border-emerald-500' },
  purple:  { bg: 'bg-purple-50 text-purple-700 border-purple-200',   text: 'text-purple-700',  border: 'border-purple-500' },
  blue:    { bg: 'bg-blue-50 text-blue-700 border-blue-200',       text: 'text-blue-700',    border: 'border-blue-500' },
  rose:    { bg: 'bg-rose-50 text-rose-700 border-rose-200',       text: 'text-rose-700',    border: 'border-rose-500' },
  amber:   { bg: 'bg-amber-50 text-amber-700 border-amber-200',     text: 'text-amber-700',   border: 'border-amber-500' },
  indigo:  { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',   text: 'text-indigo-700',  border: 'border-indigo-500' },
  orange:  { bg: 'bg-orange-50 text-orange-700 border-orange-200',   text: 'text-orange-700',  border: 'border-orange-500' },
  cyan:    { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',       text: 'text-cyan-700',    border: 'border-cyan-500' },
};

export default function HomePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to pull the freshest sorted data from Supabase
  const fetchFreshData = async () => {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        id, name, title, company, phone, email, website,
        categories ( name, color )
      `)
      .order('name', { ascending: true }); // Alphabetical sorting

    if (!error && data) {
      setCards(data as unknown as Card[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Initial data load when the component mounts
    fetchFreshData();

    // Establish WebSocket real-time subscription
    const dbChangesChannel = supabase
      .channel('realtime-cards-directory')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          console.log('Change detected in Supabase:', payload.eventType);
          // Automatically trigger clean state update without a hard browser reload
          fetchFreshData();
        }
      )
      .subscribe();

    // Clean up the WebSocket link when the user leaves the page
    return () => {
      supabase.removeChannel(dbChangesChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500 font-medium">
        Loading live directory...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Business Directory</h1>
          <p className="text-sm text-gray-500 mt-1">Live updates active • Sorted alphabetically</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const currentTheme = colorMap[card.categories?.color || ''] || colorMap.blue;
            
            // Uses Dicebear's Dylan style with a deterministic seed (email or name)
            const seedString = encodeURIComponent(card.email || card.name);
            const avatarUrl = `https://api.dicebear.com/7.x/dylan/svg?seed=${seedString}`;

            return (
              <div
                key={card.id}
                className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm 
                           transition-all duration-300 ease-out transform 
                           hover:-translate-y-2 hover:shadow-xl hover:border-gray-200 border-t-4 ${currentTheme.border}`}
              >
                <div className="flex items-center justify-between mb-5">
                  <img 
                    src={avatarUrl} 
                    alt={card.name} 
                    className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100"
                  />
                  {card.categories && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${currentTheme.bg}`}>
                      {card.categories.name}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-gray-800 tracking-tight truncate">{card.name}</h2>
                <p className="text-sm text-gray-500 font-medium mb-4 truncate">
                  {card.title}{card.company ? ` at ${card.company}` : ''}
                </p>

                <div className="pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
                  {card.phone && <div className="truncate">📞 {card.phone}</div>}
                  {card.email && (
                    <div className="truncate">
                      ✉️ <a href={`mailto:${card.email}`} className="hover:underline text-gray-700">{card.email}</a>
                    </div>
                  )}
                  {card.website && (
                    <div className="truncate">
                      🌐 <a href={card.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {card.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// End of page component. Any additional Supabase client setup should live in /utils/supabase