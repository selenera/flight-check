import { NextRequest, NextResponse } from 'next/server';

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;
const AMADEUS_USE_TEST = process.env.AMADEUS_USE_TEST === 'true';
const AMADEUS_BASE_URL = AMADEUS_USE_TEST 
  ? 'https://test.api.amadeus.com' 
  : 'https://api.amadeus.com';

// Get Amadeus access token
async function getAmadeusToken(): Promise<string | null> {
  try {
    const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AMADEUS_API_KEY || '',
        client_secret: AMADEUS_API_SECRET || '',
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Amadeus token:', error);
    return null;
  }
}

// Fetch prices for a month or date range using Flight Inspiration Search
async function fetchMonthPrices(
  origin: string,
  destination: string,
  month: string | null,
  directOnly: boolean = true,
  date: string | null = null // YYYY-MM-DD format
): Promise<{ prices: Record<string, number>; flights: Record<string, any>; error?: string }> {
  try {
    const token = await getAmadeusToken();
    if (!token) {
      return { prices: {}, flights: {}, error: 'Failed to get Amadeus access token' };
    }

    const priceMap: Record<string, number> = {};
    const flightsMap: Record<string, any> = {};
    const dateStrings: string[] = [];

    // If date is provided, generate ±7 days around that date
    if (date) {
      const [year, monthNum, day] = date.split('-').map(Number);
      const centerDate = new Date(year, monthNum - 1, day);
      
      // Generate dates from -7 to +7 days
      for (let offset = -7; offset <= 7; offset++) {
        const currentDate = new Date(centerDate);
        currentDate.setDate(currentDate.getDate() + offset);
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        dateStrings.push(dateStr);
      }
    } else if (month) {
      // Parse month to get year and month
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();

      // Generate all dates in the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dateStrings.push(dateStr);
      }
    } else {
      return { prices: {}, flights: {}, error: 'Either month or date must be provided' };
    }

    // Fetch prices for each date (batch requests to avoid rate limits)
    for (const dateStr of dateStrings) {
      try {
        const response = await fetch(
          `${AMADEUS_BASE_URL}/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${dateStr}&adults=1&currencyCode=CAD&max=1`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.data && data.data.length > 0) {
            // Filter flights based on directOnly preference
            let flightOffer = null;
            
            if (directOnly) {
              // Find the first direct flight (0 stops)
              flightOffer = data.data.find((offer: any) => {
                const itinerary = offer.itineraries?.[0];
                const stops = itinerary?.segments ? itinerary.segments.length - 1 : -1;
                return stops === 0;
              });
            } else {
              // Use the first flight (cheapest)
              flightOffer = data.data[0];
            }
            
            if (flightOffer) {
              // Amadeus returns price as string (e.g., "476.30"), need to parse it
              const price = flightOffer.price?.total || flightOffer.price?.grandTotal;
              if (price) {
                const priceNum = typeof price === 'string' ? parseFloat(price) : Number(price);
                if (!isNaN(priceNum) && priceNum > 0) {
                  priceMap[dateStr] = priceNum;
                  
                  // Store full flight details
                  const itinerary = flightOffer.itineraries?.[0];
                  flightsMap[dateStr] = {
                    date: dateStr,
                    price: priceNum,
                    currency: flightOffer.price?.currency || 'CAD',
                    segments: itinerary?.segments || [],
                    duration: itinerary?.duration,
                    numberOfStops: itinerary?.segments ? itinerary.segments.length - 1 : 0,
                    airline: itinerary?.segments?.[0]?.carrierCode || 'Unknown',
                    priceBreakdown: {
                      base: flightOffer.price?.base ? parseFloat(flightOffer.price.base) : undefined,
                      total: priceNum,
                      taxes: flightOffer.price?.totalTaxes ? parseFloat(flightOffer.price.totalTaxes) : undefined,
                      fees: flightOffer.price?.fees ? flightOffer.price.fees.reduce((sum: number, fee: any) => sum + parseFloat(fee.amount || 0), 0) : undefined,
                    },
                    validatingAirlineCodes: flightOffer.validatingAirlineCodes || [],
                    travelerPricings: flightOffer.travelerPricings || [],
                    source: 'Amadeus',
                    // Store full flight offer for JSON output
                    fullOffer: flightOffer,
                  };
                }
              }
            }
          }
        } else if (response.status === 429) {
          console.warn(`Rate limit hit for ${dateStr}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Error fetching price for ${dateStr}:`, error);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { prices: priceMap, flights: flightsMap };
  } catch (error) {
    const searchParam = date || month || 'unknown';
    console.error(`Error fetching Amadeus prices for ${origin}→${destination} ${searchParam}:`, error);
    return { prices: {}, flights: {}, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const month = searchParams.get('month');
    const date = searchParams.get('date'); // YYYY-MM-DD format for date-based search
    const directOnly = searchParams.get('directOnly') === 'true';

    // Validate required parameters
    if (!origin || !destination || (!month && !date)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: origin, destination, and either month or date are required',
        },
        { status: 400 }
      );
    }

    // Validate month format (YYYY-MM) if provided
    if (month) {
      const monthRegex = /^\d{4}-\d{2}$/;
      if (!monthRegex.test(month)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid month format. Expected YYYY-MM (e.g., 2025-05)',
          },
          { status: 400 }
        );
      }
    }

    // Validate date format (YYYY-MM-DD) if provided
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid date format. Expected YYYY-MM-DD (e.g., 2025-05-15)',
          },
          { status: 400 }
        );
      }
    }

    // Validate airport codes (3 letters)
    const airportCodeRegex = /^[A-Z]{3}$/;
    if (!airportCodeRegex.test(origin.toUpperCase()) || !airportCodeRegex.test(destination.toUpperCase())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid airport code format. Expected 3-letter IATA code (e.g., YYZ, BKK)',
        },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amadeus API credentials not configured. Please set AMADEUS_API_KEY and AMADEUS_API_SECRET in your environment variables.',
        },
        { status: 500 }
      );
    }

    // Fetch departure prices: origin → destination
    const result = await fetchMonthPrices(origin.toUpperCase(), destination.toUpperCase(), month, directOnly, date);

    // Return success even with empty data - let frontend handle empty calendars
    return NextResponse.json({
      success: true,
      data: result.prices || {},
      flights: result.flights || {},
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      month: month || null,
      date: date || null,
      ...(result.error && Object.keys(result.prices).length === 0 ? { warning: result.error } : {}),
    });

  } catch (error) {
    console.error('Error fetching Amadeus departure prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

