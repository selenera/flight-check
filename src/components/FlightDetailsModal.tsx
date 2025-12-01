'use client';

interface FlightSegment {
  departure: {
    iataCode: string;
    at: string;
    terminal?: string;
  };
  arrival: {
    iataCode: string;
    at: string;
    terminal?: string;
  };
  carrierCode: string;
  number: string;
  aircraft?: {
    code: string;
  };
  duration?: string;
  numberOfStops?: number;
}

interface FlightDetails {
  date: string;
  price: number;
  currency: string;
  airline?: string;
  segments?: FlightSegment[];
  duration?: string;
  numberOfStops?: number;
  itineraries?: any[];
  priceBreakdown?: {
    base?: number;
    total?: number;
    taxes?: number;
    fees?: number;
  };
  validatingAirlineCodes?: string[];
  travelerPricings?: any[];
  source?: string;
}

interface FlightDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: FlightDetails | null;
  origin: string;
  destination: string;
}

export default function FlightDetailsModal({ isOpen, onClose, flight, origin, destination }: FlightDetailsModalProps) {
  if (!isOpen || !flight) return null;

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDuration = (duration: string) => {
    // Parse ISO 8601 duration (e.g., "PT3H16M")
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = match[1] || '0';
      const minutes = match[2] || '0';
      return `${hours}h ${minutes}m`;
    }
    return duration;
  };

  const calculateLayover = (arrivalTime: string, nextDepartureTime: string): string => {
    const arrival = new Date(arrivalTime);
    const departure = new Date(nextDepartureTime);
    const diffMs = departure.getTime() - arrival.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
              Flight Details
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Date and Route */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                {formatDate(flight.date)}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {origin} → {destination}
              </p>
            </div>

            {/* Price */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">Price</p>
              <p className="text-3xl font-bold text-green-800 dark:text-green-300">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: flight.currency || 'USD',
                }).format(flight.price)}
              </p>
            </div>

            {/* Price Breakdown */}
            {flight.priceBreakdown && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-3">Price Breakdown</h3>
                <div className="space-y-2">
                  {flight.priceBreakdown.base && (
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Base Fare</span>
                      <span className="text-sm font-medium text-black dark:text-zinc-50">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: flight.currency || 'USD',
                        }).format(flight.priceBreakdown.base)}
                      </span>
                    </div>
                  )}
                  {flight.priceBreakdown.taxes && (
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Taxes & Fees</span>
                      <span className="text-sm font-medium text-black dark:text-zinc-50">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: flight.currency || 'USD',
                        }).format(flight.priceBreakdown.taxes)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-zinc-300 dark:border-zinc-600">
                    <span className="text-sm font-semibold text-black dark:text-zinc-50">Total</span>
                    <span className="text-sm font-bold text-black dark:text-zinc-50">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: flight.currency || 'USD',
                      }).format(flight.price)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Flight Segments */}
            {flight.segments && flight.segments.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50">Flight Information</h3>
                {flight.segments.map((segment, index) => {
                  const isLastSegment = index === flight.segments!.length - 1;
                  const nextSegment = !isLastSegment ? flight.segments![index + 1] : null;
                  const layoverTime = nextSegment ? calculateLayover(segment.arrival.at, nextSegment.departure.at) : null;

                  return (
                    <div key={index}>
                      <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Flight</p>
                            <p className="text-lg font-semibold text-black dark:text-zinc-50">
                              {segment.carrierCode} {segment.number}
                            </p>
                          </div>
                          {segment.aircraft && (
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-500">Aircraft</p>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300">{segment.aircraft.code}</p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">Departure</p>
                            <p className="text-lg font-semibold text-black dark:text-zinc-50">
                              {formatTime(segment.departure.at)}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {segment.departure.iataCode}
                              {segment.departure.terminal && ` (Terminal ${segment.departure.terminal})`}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                              {new Date(segment.departure.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">Arrival</p>
                            <p className="text-lg font-semibold text-black dark:text-zinc-50">
                              {formatTime(segment.arrival.at)}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {segment.arrival.iataCode}
                              {segment.arrival.terminal && ` (Terminal ${segment.arrival.terminal})`}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                              {new Date(segment.arrival.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {segment.duration && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                            Duration: {formatDuration(segment.duration)}
                          </p>
                        )}
                      </div>
                      
                      {/* Layover Information */}
                      {layoverTime && nextSegment && (
                        <div className="my-3 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">Layover at {segment.arrival.iataCode}</p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-400">Duration: {layoverTime}</p>
                            </div>
                            {segment.arrival.terminal && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                                Terminal {segment.arrival.terminal}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Airline */}
            {flight.airline && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Airline</p>
                <p className="text-lg font-semibold text-black dark:text-zinc-50">{flight.airline}</p>
              </div>
            )}

            {/* Additional Information */}
            <div className="grid grid-cols-2 gap-4">
              {flight.duration && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Duration</p>
                  <p className="text-lg font-semibold text-black dark:text-zinc-50">
                    {formatDuration(flight.duration)}
                  </p>
                </div>
              )}
              {flight.numberOfStops !== undefined && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Stops</p>
                  <p className="text-lg font-semibold text-black dark:text-zinc-50">
                    {flight.numberOfStops === 0 ? 'Direct' : `${flight.numberOfStops} stop${flight.numberOfStops > 1 ? 's' : ''}`}
                  </p>
                </div>
              )}
            </div>

            {/* Validating Airlines */}
            {flight.validatingAirlineCodes && flight.validatingAirlineCodes.length > 0 && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Validating Airlines</p>
                <p className="text-lg font-semibold text-black dark:text-zinc-50">
                  {flight.validatingAirlineCodes.join(', ')}
                </p>
              </div>
            )}

            {/* Source */}
            {flight.source && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Data Source</p>
                <p className="text-lg font-semibold text-black dark:text-zinc-50">{flight.source}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

