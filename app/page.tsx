import TravelPayoutsSearch from '@/components/TravelPayoutsSearch';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
      <main className="container mx-auto py-8 px-4">
        <TravelPayoutsSearch />
      </main>
    </div>
  );
}
