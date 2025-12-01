# TravelPayouts Flight Price Checker

A web application that checks the latest flight prices using the free TravelPayouts Flight API. The app uses the "month-matrix" endpoint to fetch prices for every day in a given month.

## Features

- ✈️ Search flight prices by origin, destination, and month
- 📅 Get prices for every day in the selected month
- 📊 Clean table display with date → price mapping
- 📋 JSON output view for programmatic use
- ⚠️ Comprehensive error handling
- 🎨 Modern, responsive UI with dark mode support

## Requirements

- Node.js 18+ 
- TravelPayouts API key (free tier available)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Create a `.env.local` file in the project root:

```env
TRAVELPAYOUTS_API_KEY=YOUR_API_KEY_HERE
```

**To get a TravelPayouts API key:**
1. Visit [TravelPayouts Partner Portal](https://www.travelpayouts.com/developers/api)
2. Sign up for a free account
3. Navigate to your dashboard and get your API token
4. Add it to `.env.local`

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Web Interface

1. Enter origin airport code (e.g., `YYZ`)
2. Enter destination airport code (e.g., `BKK`)
3. Select departure month (YYYY-MM format)
4. Click "Search Prices"
5. View results in the table or JSON format

### Programmatic Usage

You can also use the `getMonthlyPrices` function directly:

```typescript
import { getMonthlyPrices } from './src/lib/travelpayouts';

// Example: Get prices for YYZ to BKK in May 2025
const result = await getMonthlyPrices("YYZ", "BKK", "2025-05");

if (result.success && result.data) {
  console.log(result.data);
  // Output: { "2025-05-01": 500, "2025-05-02": 450, ... }
} else {
  console.error(result.error);
}
```

See `example-usage.ts` for a complete example.

## API Endpoint

The app uses the TravelPayouts month-matrix endpoint:

```
GET https://api.travelpayouts.com/v2/prices/month-matrix
```

**Parameters:**
- `origin` - Origin airport code (3-letter IATA code)
- `destination` - Destination airport code (3-letter IATA code)
- `month` - Departure month in YYYY-MM format
- `token` - Your TravelPayouts API token

## Error Handling

The application handles the following error cases:

- ✅ Missing parameters (origin, destination, month)
- ✅ Invalid month format (must be YYYY-MM)
- ✅ Invalid airport codes (must be 3-letter IATA codes)
- ✅ No prices available for the route/month
- ✅ Invalid or missing API key
- ✅ API request failures

## Project Structure

```
flight-check/
├── app/
│   ├── api/
│   │   └── flights/
│   │       └── month-matrix/
│   │           └── route.ts          # API route handler
│   ├── page.tsx                       # Main page
│   └── layout.tsx                     # Root layout
├── src/
│   ├── components/
│   │   └── TravelPayoutsSearch.tsx    # Main search component
│   └── lib/
│       └── travelpayouts.ts          # API client function
├── example-usage.ts                   # Example usage script
└── README.md                          # This file
```

## Example Run

```typescript
getMonthlyPrices("YYZ", "BKK", "2025-05")
```

Returns:
```json
{
  "success": true,
  "data": {
    "2025-05-01": 850,
    "2025-05-02": 820,
    "2025-05-03": 790,
    ...
  }
}
```

## Technologies Used

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **TravelPayouts API** - Flight price data

## Learn More

- [TravelPayouts API Documentation](https://www.travelpayouts.com/developers/api)
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)

## License

MIT
# flight-check
