'use client';

import { useState, useMemo } from 'react';

interface FlightDetails {
  date: string;
  price: number;
  currency: string;
  airline?: string;
  segments?: any[];
  duration?: string;
  numberOfStops?: number;
  priceBreakdown?: {
    base?: number;
    total?: number;
    taxes?: number;
    fees?: number;
  };
  validatingAirlineCodes?: string[];
}

interface FlightListProps {
  flights: Record<string, FlightDetails>;
  prices: Record<string, number>;
  origin: string;
  destination: string;
  title: string;
  isLoading?: boolean;
  onFlightClick?: (date: string, flight: FlightDetails) => void;
}

type SortOption = 'price' | 'duration' | 'departure' | 'stops';

export default function FlightList({ 
  flights, 
  prices, 
  origin, 
  destination, 
  title, 
  isLoading = false,
  onFlightClick 
}: FlightListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('departure');
  const [filterStops, setFilterStops] = useState<'all' | 'direct' | '1stop' | '2+stops'>('all');

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = match[1] || '0';
      const minutes = match[2] || '0';
      return `${hours}h ${minutes}m`;
    }
    return duration;
  };

  const getStopsText = (flight: FlightDetails): string => {
    const stops = flight.numberOfStops ?? (flight.segments ? flight.segments.length - 1 : 0);
    if (stops === 0) return 'Direct';
    if (stops === 1) return '1 stop';
    return `${stops} stops`;
  };

  const getDurationInMinutes = (duration: string): number => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = parseInt(match[1] || '0');
      const minutes = parseInt(match[2] || '0');
      return hours * 60 + minutes;
    }
    return 0;
  };

  // Convert flights object to sorted array
  const sortedFlights = useMemo(() => {
    const flightArray = Object.entries(flights)
      .map(([date, flight]) => {
        const { date: _, ...flightWithoutDate } = flight;
        return {
          date,
          ...flightWithoutDate,
        };
      })
      .filter(flight => {
        // Filter by stops
        const stops = flight.numberOfStops ?? (flight.segments ? flight.segments.length - 1 : 0);
        if (filterStops === 'direct') return stops === 0;
        if (filterStops === '1stop') return stops === 1;
        if (filterStops === '2+stops') return stops >= 2;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price':
            return a.price - b.price;
          case 'duration':
            const aDuration = a.duration ? getDurationInMinutes(a.duration) : Infinity;
            const bDuration = b.duration ? getDurationInMinutes(b.duration) : Infinity;
            return aDuration - bDuration;
          case 'stops':
            const aStops = a.numberOfStops ?? (a.segments ? a.segments.length - 1 : 0);
            const bStops = b.numberOfStops ?? (b.segments ? b.segments.length - 1 : 0);
            return aStops - bStops;
          case 'departure':
          default:
            return a.date.localeCompare(b.date);
        }
      });

    return flightArray;
  }, [flights, sortBy, filterStops]);

  const handleFlightClick = (date: string, flight: FlightDetails) => {
    if (onFlightClick) {
      onFlightClick(date, flight);
    }
  };

  if (isLoading && sortedFlights.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-black dark:text-zinc-50">{title}</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4"></div>
                  <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3"></div>
                </div>
                <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedFlights.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-black dark:text-zinc-50">{title}</h3>
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          <p className="text-lg">No flights available</p>
          <p className="text-sm mt-2">Try adjusting your search criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h3 className="text-2xl font-bold text-black dark:text-zinc-50">{title}</h3>
        
        <div className="flex flex-wrap gap-3">
          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="departure">Departure Time</option>
              <option value="price">Price (Low to High)</option>
              <option value="duration">Duration</option>
              <option value="stops">Stops</option>
            </select>
          </div>

          {/* Filter by Stops */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">Filter:</label>
            <select
              value={filterStops}
              onChange={(e) => setFilterStops(e.target.value as any)}
              className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Flights</option>
              <option value="direct">Direct Only</option>
              <option value="1stop">1 Stop</option>
              <option value="2+stops">2+ Stops</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedFlights.map((flight) => {
          const firstSegment = flight.segments?.[0];
          const lastSegment = flight.segments?.[flight.segments?.length - 1];
          const stops = flight.numberOfStops ?? (flight.segments ? flight.segments.length - 1 : 0);
          const isDirect = stops === 0;

          return (
            <div
              key={flight.date}
              onClick={() => handleFlightClick(flight.date, flight)}
              className="border-2 border-zinc-200 dark:border-zinc-700 rounded-xl p-5 hover:border-blue-500 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white dark:bg-zinc-800"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left: Flight Info */}
                <div className="flex-1">
                  {/* Date Header */}
                  <div className="mb-4 pb-3 border-b-2 border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                        {formatDate(flight.date)}
                      </p>
                    </div>
                  </div>

                  {/* Flight Times and Route */}
                  <div className="flex items-center gap-6">
                    {/* Departure */}
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-2">
                        <p className="text-3xl font-bold text-black dark:text-zinc-50">
                          {firstSegment ? formatTime(firstSegment.departure?.at) : '--:--'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                          {origin}
                        </p>
                        {firstSegment?.departure?.terminal && (
                          <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">
                            T{firstSegment.departure.terminal}
                          </span>
                        )}
                      </div>
                      {firstSegment?.departure?.at && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(firstSegment.departure.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>

                    {/* Duration and Stops */}
                    <div className="flex flex-col items-center min-w-[140px] px-2">
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                        {flight.duration ? formatDuration(flight.duration) : '--'}
                      </p>
                      <div className="flex items-center w-full relative">
                        <div className="flex-1 h-0.5 bg-zinc-300 dark:bg-zinc-600"></div>
                        {isDirect ? (
                          <div className="mx-2 relative">
                            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-zinc-800 shadow-sm"></div>
                          </div>
                        ) : (
                          <div className="mx-2 flex items-center gap-1 relative">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          </div>
                        )}
                        <div className="flex-1 h-0.5 bg-zinc-300 dark:bg-zinc-600"></div>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isDirect 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {getStopsText(flight)}
                        </span>
                      </div>
                    </div>

                    {/* Arrival */}
                    <div className="flex-1 text-right">
                      <div className="flex items-baseline justify-end gap-2 mb-2">
                        <p className="text-3xl font-bold text-black dark:text-zinc-50">
                          {lastSegment ? formatTime(lastSegment.arrival?.at) : '--:--'}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 mb-1">
                        {lastSegment?.arrival?.terminal && (
                          <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">
                            T{lastSegment.arrival.terminal}
                          </span>
                        )}
                        <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                          {destination}
                        </p>
                      </div>
                      {lastSegment?.arrival?.at && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(lastSegment.arrival.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Airline and Flight Number */}
                  {flight.airline && firstSegment && (
                    <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            {flight.airline}
                          </span>
                        </div>
                        {firstSegment.carrierCode && firstSegment.number && (
                          <span className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded font-mono">
                            {firstSegment.carrierCode} {firstSegment.number}
                          </span>
                        )}
                        {flight.validatingAirlineCodes && flight.validatingAirlineCodes.length > 0 && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-500 italic">
                            Operated by {flight.validatingAirlineCodes.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Price */}
                <div className="lg:border-l-2 lg:border-zinc-200 dark:lg:border-zinc-700 lg:pl-6 lg:min-w-[160px]">
                  <div className="text-center lg:text-right">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">Total Price</p>
                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: flight.currency || 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(flight.price)}
                    </p>
                    {flight.priceBreakdown?.taxes && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                        Taxes & fees included
                      </p>
                    )}
                    <button className="w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                      Select Flight
                    </button>
                    {flight.priceBreakdown?.base && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                        Base: {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: flight.currency || 'USD',
                        }).format(flight.priceBreakdown.base)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Results Count */}
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Showing {sortedFlights.length} flight{sortedFlights.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

