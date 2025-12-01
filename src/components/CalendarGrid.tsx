'use client';

interface FlightDetails {
  date: string;
  price: number;
  currency: string;
  airline?: string;
  segments?: any[];
  duration?: string;
  numberOfStops?: number;
}

interface CalendarGridProps {
  month: string; // YYYY-MM format
  prices: Record<string, number>;
  flights?: Record<string, FlightDetails>; // Full flight details per date
  title: string;
  isLoading?: boolean; // Whether data is still being fetched
  onDateClick?: (date: string, flight: FlightDetails | null) => void;
}

export default function CalendarGrid({ month, prices, flights = {}, title, isLoading = false, onDateClick }: CalendarGridProps) {
  // Parse the month
  const [year, monthNum] = month.split('-').map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday

  // Generate calendar days
  const days: (number | null)[] = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getDateString = (day: number) => {
    return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getPriceForDay = (day: number): number | null => {
    const dateString = getDateString(day);
    return prices[dateString] || null;
  };

  const getFlightForDay = (day: number): FlightDetails | null => {
    const dateString = getDateString(day);
    return flights[dateString] || null;
  };

  const getStopsText = (flight: FlightDetails | null): string | null => {
    if (!flight) return null;
    const stops = flight.numberOfStops ?? (flight.segments ? flight.segments.length - 1 : 0);
    if (stops === 0) return 'Direct';
    if (stops === 1) return '1 stop';
    return `${stops} stops`;
  };

  const handleDateClick = (day: number) => {
    if (!onDateClick) return;
    const dateString = getDateString(day);
    const flight = getFlightForDay(day);
    const price = getPriceForDay(day);
    
    if (price !== null || flight) {
      onDateClick(dateString, flight || (price ? { date: dateString, price, currency: 'USD' } : null));
    }
  };

  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4 text-center text-black dark:text-zinc-50">
        {title}
      </h3>
      <p className="text-sm text-center text-zinc-600 dark:text-zinc-400 mb-4">
        {monthName}
      </p>
      
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold py-2 text-zinc-600 dark:text-zinc-400"
          >
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const price = getPriceForDay(day);
          const flight = getFlightForDay(day);
          const dateString = getDateString(day);
          const isToday = dateString === new Date().toISOString().split('T')[0];
          const stopsText = getStopsText(flight);

          const hasPrice = price !== null;
          const showLoading = isLoading && !hasPrice;

          return (
            <div
              key={day}
              onClick={() => hasPrice && handleDateClick(day)}
              className={`
                aspect-square border border-zinc-200 dark:border-zinc-700 rounded-lg p-1
                flex flex-col items-center justify-center relative
                ${hasPrice 
                  ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer' 
                  : showLoading
                  ? 'bg-zinc-100 dark:bg-zinc-800 animate-pulse'
                  : 'bg-zinc-50 dark:bg-zinc-800'
                }
                ${isToday ? 'ring-2 ring-blue-500' : ''}
                transition-all duration-200
              `}
              title={hasPrice ? `Click to view details: ${formatPrice(price)}` : showLoading ? `${dateString}: Loading...` : `${dateString}: No price available`}
            >
              <span className={`text-xs font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {day}
              </span>
              {hasPrice ? (
                <div className="mt-0.5 flex flex-col items-center animate-fade-in">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-tight">
                    ${price.toLocaleString()}
                  </span>
                  {stopsText && (
                    <span className="text-[8px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {stopsText}
                    </span>
                  )}
                </div>
              ) : showLoading ? (
                <div className="mt-1 space-y-1 w-full px-1">
                  <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded animate-pulse"></div>
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-600 rounded animate-pulse w-3/4 mx-auto"></div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/20 border border-zinc-200 dark:border-zinc-700 rounded"></div>
          <span>Price available</span>
        </div>
        {isLoading && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-50 dark:bg-yellow-900/10 border border-zinc-200 dark:border-zinc-700 rounded flex items-center justify-center">
              <div className="w-2 h-2 border border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span>Loading...</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"></div>
          <span>No price</span>
        </div>
      </div>
    </div>
  );
}

