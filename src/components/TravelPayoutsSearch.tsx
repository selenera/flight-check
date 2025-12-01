'use client';

import { useState } from 'react';
import CalendarGrid from './CalendarGrid';
import FlightList from './FlightList';
import FlightDetailsModal from './FlightDetailsModal';

interface FlightDetails {
    date: string;
    price: number;
    currency: string;
    airline?: string;
    segments?: any[];
    duration?: string;
    numberOfStops?: number;
}

interface RoundTripResponse {
    success: boolean;
    departure?: Record<string, number>;
    return?: Record<string, number>;
    departureFlights?: Record<string, FlightDetails>;
    returnFlights?: Record<string, FlightDetails>;
    error?: string;
    details?: {
        departure?: string;
        return?: string;
    };
    warnings?: string[];
    origin?: string;
    destination?: string;
    departureMonth?: string;
    returnMonth?: string;
}

export default function TravelPayoutsSearch() {
    const [origin, setOrigin] = useState('AUS'); // Default: Austin
    const [destination, setDestination] = useState('YYZ'); // Default: Toronto
    const [searchMode, setSearchMode] = useState<'month' | 'date'>('month'); // Search by month or date
    const [departureMonth, setDepartureMonth] = useState('');
    const [returnMonth, setReturnMonth] = useState('');
    const [departureDate, setDepartureDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [allowMultipleStops, setAllowMultipleStops] = useState(false); // Default: direct flights only
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<RoundTripResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFlight, setSelectedFlight] = useState<FlightDetails | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<{ origin: string; destination: string } | null>(null);

    // Generate month options (current month + next 12 months)
    const generateMonths = () => {
        const months = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        for (let i = 0; i < 13; i++) {
            const date = new Date(currentYear, currentMonth + i, 1);
            const year = date.getFullYear();
            const monthNum = date.getMonth() + 1;
            const monthValue = `${year}-${String(monthNum).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            months.push({ value: monthValue, label: monthLabel });
        }

        return months;
    };

    const months = generateMonths();

    // Helper function to update results incrementally
    const updateResults = (
        departureData: any,
        returnData: any,
        origin: string,
        destination: string,
        departureMonth: string,
        returnMonth: string
    ) => {
        console.log('Updating results:', {
            departureSuccess: departureData.success,
            departureDataKeys: departureData.success ? Object.keys(departureData.data || {}).length : 0,
            returnSuccess: returnData.success,
            returnDataKeys: returnData.success ? Object.keys(returnData.data || {}).length : 0,
        });

        setResults(prev => {
            const newResults = {
                success: true,
                departure: {
                    ...(prev?.departure || {}),
                    ...(departureData.success ? departureData.data : {}),
                },
                return: {
                    ...(prev?.return || {}),
                    ...(returnData.success ? returnData.data : {}),
                },
                departureFlights: {
                    ...(prev?.departureFlights || {}),
                    ...(departureData.success && departureData.flights ? departureData.flights : {}),
                },
                returnFlights: {
                    ...(prev?.returnFlights || {}),
                    ...(returnData.success && returnData.flights ? returnData.flights : {}),
                },
                origin: origin.toUpperCase(),
                destination: destination.toUpperCase(),
                departureMonth,
                returnMonth,
                warnings: [
                    !departureData.success && `No departure prices for ${departureMonth}`,
                    !returnData.success && `No return prices for ${returnMonth}`,
                ].filter(Boolean) as string[],
                apiSource: 'Amadeus',
            };

            console.log('New results state:', {
                departureCount: Object.keys(newResults.departure).length,
                returnCount: Object.keys(newResults.return).length,
            });

            return newResults;
        });
    };


    const handleSearch = async () => {
        // Validate inputs based on search mode
        if (searchMode === 'month') {
            if (!origin || !destination || !departureMonth || !returnMonth) {
                setError('Please fill in all fields: origin, destination, departure month, and return month');
                return;
            }
            // Validate return month is after departure month
            if (returnMonth <= departureMonth) {
                setError('Return month must be after departure month');
                return;
            }
        } else {
            if (!origin || !destination || !departureDate || !returnDate) {
                setError('Please fill in all fields: origin, destination, departure date, and return date');
                return;
            }
            // Validate return date is after departure date
            if (returnDate <= departureDate) {
                setError('Return date must be after departure date');
                return;
            }
        }

        // Validate airport codes (3 letters)
        if (origin.length !== 3 || destination.length !== 3) {
            setError('Airport codes must be exactly 3 letters (e.g., AUS, YYZ)');
            return;
        }

        if (origin === destination) {
            setError('Origin and destination must be different');
            return;
        }

        setLoading(true);
        setError(null);

        // Show calendars immediately with empty data (skeleton loading)
        setResults({
            success: true,
            departure: {},
            return: {},
            departureFlights: {},
            returnFlights: {},
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            departureMonth: searchMode === 'month' ? departureMonth : undefined,
            returnMonth: searchMode === 'month' ? returnMonth : undefined,
        });

        try {
            // Use Amadeus API only
            const apiBase = '/api/flights/amadeus';

            // Fetch Amadeus data (departure and return in parallel)
            const directOnly = !allowMultipleStops; // If allowMultipleStops is false, then directOnly is true
            
            let departureUrl = `${apiBase}/departure?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&directOnly=${directOnly}`;
            let returnUrl = `${apiBase}/return?origin=${encodeURIComponent(destination)}&destination=${encodeURIComponent(origin)}&directOnly=${directOnly}`;
            
            if (searchMode === 'month') {
                departureUrl += `&month=${encodeURIComponent(departureMonth)}`;
                returnUrl += `&month=${encodeURIComponent(returnMonth)}`;
            } else {
                departureUrl += `&date=${encodeURIComponent(departureDate)}`;
                returnUrl += `&date=${encodeURIComponent(returnDate)}`;
            }
            
            const departurePromise = fetch(departureUrl);
            const returnPromise = fetch(returnUrl);

            const [departureResponse, returnResponse] = await Promise.all([departurePromise, returnPromise]);
            const departureData = await departureResponse.json();
            const returnData = await returnResponse.json();

            console.log('API Response received:', {
                departure: {
                    success: departureData.success,
                    dataCount: departureData.success ? Object.keys(departureData.data || {}).length : 0,
                    sampleData: departureData.success ? Object.keys(departureData.data || {}).slice(0, 3) : [],
                },
                return: {
                    success: returnData.success,
                    dataCount: returnData.success ? Object.keys(returnData.data || {}).length : 0,
                    sampleData: returnData.success ? Object.keys(returnData.data || {}).slice(0, 3) : [],
                },
            });

            updateResults(departureData, returnData, origin, destination, departureMonth, returnMonth);

            // Set loading to false after a brief delay to ensure state updates
            setTimeout(() => {
                setLoading(false);
            }, 100);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
        }
    };


    return (
        <div className="w-full max-w-7xl mx-auto p-6">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
                <h1 className="text-3xl font-bold text-center mb-8 text-black dark:text-zinc-50">
                    Round Trip Flight Price Checker
                </h1>
                <p className="text-center text-zinc-600 dark:text-zinc-400 mb-6">
                    Check the latest round trip flight prices using Amadeus API
                </p>
                
                {/* Search Mode Toggle */}
                <div className="flex items-center justify-center gap-4 mb-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            name="searchMode"
                            value="month"
                            checked={searchMode === 'month'}
                            onChange={(e) => setSearchMode('month')}
                            className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
                        />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Search by Month
                        </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            name="searchMode"
                            value="date"
                            checked={searchMode === 'date'}
                            onChange={(e) => setSearchMode('date')}
                            className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
                        />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Search by Date (±7 days)
                        </span>
                    </label>
                </div>

                <label className="flex items-center justify-center space-x-2 cursor-pointer w-full mb-6">
                    <input
                        type="checkbox"
                        checked={allowMultipleStops}
                        onChange={(e) => setAllowMultipleStops(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
                    />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Allow multiple stops (cheaper flights)
                    </span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div>
                        <label htmlFor="origin" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                            Origin Airport Code
                        </label>
                        <input
                            id="origin"
                            type="text"
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                            placeholder="AUS"
                            maxLength={3}
                            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        />
                    </div>

                    <div>
                        <label htmlFor="destination" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                            Destination Airport Code
                        </label>
                        <input
                            id="destination"
                            type="text"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value.toUpperCase())}
                            placeholder="YYZ"
                            maxLength={3}
                            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        />
                    </div>

                    {searchMode === 'month' ? (
                        <>
                            <div>
                                <label htmlFor="departureMonth" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                                    Departure Month
                                </label>
                                <select
                                    id="departureMonth"
                                    value={departureMonth}
                                    onChange={(e) => {
                                        setDepartureMonth(e.target.value);
                                        // Auto-clear return month if it's before or equal to departure month
                                        if (returnMonth && returnMonth <= e.target.value) {
                                            setReturnMonth('');
                                        }
                                    }}
                                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select month...</option>
                                    {months.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="returnMonth" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                                    Return Month
                                </label>
                                <select
                                    id="returnMonth"
                                    value={returnMonth}
                                    onChange={(e) => setReturnMonth(e.target.value)}
                                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select month...</option>
                                    {months.map((m) => (
                                        <option
                                            key={m.value}
                                            value={m.value}
                                            disabled={!!departureMonth && m.value <= departureMonth}
                                        >
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label htmlFor="departureDate" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                                    Departure Date
                                </label>
                                <input
                                    id="departureDate"
                                    type="date"
                                    value={departureDate}
                                    onChange={(e) => {
                                        setDepartureDate(e.target.value);
                                        // Auto-clear return date if it's before or equal to departure date
                                        if (returnDate && returnDate <= e.target.value) {
                                            setReturnDate('');
                                        }
                                    }}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="returnDate" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                                    Return Date
                                </label>
                                <input
                                    id="returnDate"
                                    type="date"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    min={departureDate || new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex items-end">
                        <button
                            onClick={handleSearch}
                            disabled={loading || !origin || !destination || (searchMode === 'month' ? (!departureMonth || !returnMonth) : (!departureDate || !returnDate))}
                            className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                        >
                            {loading ? 'Searching...' : 'Search Prices'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {results && results.success && (
                    <div className="mt-6">
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h2 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-300">
                                Round Trip Results
                            </h2>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                                {results.origin} ↔ {results.destination}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                {searchMode === 'month' 
                                    ? `Departure: ${results.departureMonth} | Return: ${results.returnMonth}`
                                    : `Departure: ${departureDate} | Return: ${returnDate} (±7 days)`
                                }
                            </p>
                            {(results as any).apiSource && (
                                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                    Data Source: {(results as any).apiSource}
                                </p>
                            )}
                            {results.warnings && results.warnings.length > 0 && (
                                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">⚠️ Warnings:</p>
                                    {results.warnings.map((warning: string, idx: number) => (
                                        <p key={idx} className="text-xs text-yellow-700 dark:text-yellow-400">{warning}</p>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Results Display - Calendar for month search, Flight List for date search */}
                        {searchMode === 'month' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {results.departureMonth && (
                                    <CalendarGrid
                                        month={results.departureMonth}
                                        prices={results.departure || {}}
                                        flights={results.departureFlights || {}}
                                        title={`Departure: ${results.origin} → ${results.destination}`}
                                        isLoading={loading}
                                        onDateClick={(date, flight) => {
                                            setSelectedFlight(flight);
                                            setSelectedRoute({ origin: results.origin || '', destination: results.destination || '' });
                                            setIsModalOpen(true);
                                        }}
                                    />
                                )}

                                {results.returnMonth && (
                                    <CalendarGrid
                                        month={results.returnMonth}
                                        prices={results.return || {}}
                                        flights={results.returnFlights || {}}
                                        title={`Return: ${results.destination} → ${results.origin}`}
                                        isLoading={loading}
                                        onDateClick={(date, flight) => {
                                            setSelectedFlight(flight);
                                            setSelectedRoute({ origin: results.destination || '', destination: results.origin || '' });
                                            setIsModalOpen(true);
                                        }}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <FlightList
                                    flights={results.departureFlights || {}}
                                    prices={results.departure || {}}
                                    origin={results.origin || ''}
                                    destination={results.destination || ''}
                                    title={`Departure Flights: ${results.origin} → ${results.destination}`}
                                    isLoading={loading}
                                    onFlightClick={(date, flight) => {
                                        setSelectedFlight(flight);
                                        setSelectedRoute({ origin: results.origin || '', destination: results.destination || '' });
                                        setIsModalOpen(true);
                                    }}
                                />

                                <FlightList
                                    flights={results.returnFlights || {}}
                                    prices={results.return || {}}
                                    origin={results.destination || ''}
                                    destination={results.origin || ''}
                                    title={`Return Flights: ${results.destination} → ${results.origin}`}
                                    isLoading={loading}
                                    onFlightClick={(date, flight) => {
                                        setSelectedFlight(flight);
                                        setSelectedRoute({ origin: results.destination || '', destination: results.origin || '' });
                                        setIsModalOpen(true);
                                    }}
                                />
                            </div>
                        )}

                        {/* Flight Details Modal */}
                        <FlightDetailsModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            flight={selectedFlight}
                            origin={selectedRoute?.origin || ''}
                            destination={selectedRoute?.destination || ''}
                        />

                         {/* JSON Output Section */}
                         <div className="mt-6">
                             <details className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                                 <summary className="cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                     View JSON Output (Full Flight Details)
                                 </summary>
                                 <pre className="mt-2 p-4 bg-zinc-900 dark:bg-zinc-950 rounded text-xs text-green-400 overflow-x-auto max-h-96 overflow-y-auto">
                                     {JSON.stringify(
                                         {
                                             departure: {
                                                 prices: results.departure || {},
                                                 flights: results.departureFlights || {},
                                             },
                                             return: {
                                                 prices: results.return || {},
                                                 flights: results.returnFlights || {},
                                             },
                                             metadata: {
                                                 origin: results.origin,
                                                 destination: results.destination,
                                                 departureMonth: results.departureMonth,
                                                 returnMonth: results.returnMonth,
                                                 searchMode: searchMode,
                                             },
                                         },
                                         null,
                                         2
                                     )}
                                 </pre>
                             </details>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
}

