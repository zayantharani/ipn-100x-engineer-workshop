const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const restaurants = [];

// Approximate geocoding for Houston addresses based on zip codes and neighborhoods
function geocodeAddress(address) {
  const zipCodeMap = {
    '77081': { latitude: 29.7019, longitude: -95.5416 },
    '77099': { latitude: 29.6722, longitude: -95.6333 },
    '77098': { latitude: 29.7418, longitude: -95.4019 },
    '77057': { latitude: 29.7499, longitude: -95.4719 },
    '77006': { latitude: 29.7485, longitude: -95.3877 },
    '77002': { latitude: 29.7589, longitude: -95.3677 },
    '77027': { latitude: 29.7410, longitude: -95.4227 },
    '77036': { latitude: 29.6908, longitude: -95.5416 },
    '77063': { latitude: 29.7383, longitude: -95.5183 },
    '77074': { latitude: 29.6858, longitude: -95.5144 },
  };

  // Extract zip code from address
  const zipMatch = address.match(/\d{5}/);
  if (zipMatch) {
    const zip = zipMatch[0];
    if (zipCodeMap[zip]) {
      return zipCodeMap[zip];
    }
  }

  // Default to Houston center
  return { latitude: 29.7604, longitude: -95.3698 };
}

// Parse operating hours to get opening and closing times
function parseOperatingHours(hours) {
  // Extract first time range (e.g., "11:30AM-2:30PM" from "Mon-Thu: 11:30AM-2:30PM & 6:00PM-10:00PM")
  const timeMatch = hours.match(/(\d{1,2}):(\d{2})(AM|PM)-(\d{1,2}):(\d{2})(AM|PM)/);

  if (timeMatch) {
    let openHour = parseInt(timeMatch[1]);
    const openMin = timeMatch[2];
    const openPeriod = timeMatch[3];

    let closeHour = parseInt(timeMatch[4]);
    const closeMin = timeMatch[5];
    const closePeriod = timeMatch[6];

    // Convert to 24-hour format
    if (openPeriod === 'PM' && openHour !== 12) openHour += 12;
    if (openPeriod === 'AM' && openHour === 12) openHour = 0;
    if (closePeriod === 'PM' && closeHour !== 12) closeHour += 12;
    if (closePeriod === 'AM' && closeHour === 12) closeHour = 0;

    return {
      opening: `${String(openHour).padStart(2, '0')}:${openMin}`,
      closing: `${String(closeHour).padStart(2, '0')}:${closeMin}`
    };
  }

  return { opening: '11:00', closing: '22:00' }; // Default
}

// Convert price range to standard format
function normalizePriceRange(priceRange) {
  const match = priceRange.match(/\$(\d+)-(\d+)/);
  if (match) {
    const low = parseInt(match[1]);
    const high = parseInt(match[2]);
    const avg = (low + high) / 2;

    if (avg < 15) return '$';
    if (avg < 25) return '$$';
    if (avg < 35) return '$$$';
    return '$$$$';
  }
  return '$$';
}

const csvPath = path.join(__dirname, '../data/restaurants.csv');
const outputPath = path.join(__dirname, '../data/restaurants.json');

fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', (row) => {
    const coords = geocodeAddress(row['Address']);
    const hours = parseOperatingHours(row['Operating Hours']);

    const restaurant = {
      id: String(restaurants.length + 1),
      name: row['Restaurant Name'],
      address: row['Address'],
      cuisine: row['Regional Cuisine'],
      rating: parseFloat(row['Rating']) || 4.0,
      priceRange: normalizePriceRange(row['Price Range']),
      openingHours: hours.opening,
      closingHours: hours.closing,
      latitude: coords.latitude,
      longitude: coords.longitude,
      phone: row['Phone Number'],
      description: `${row['Special Features']} - Specializing in ${row['Signature Dishes']}`
    };

    restaurants.push(restaurant);
  })
  .on('end', () => {
    const output = {
      restaurants: restaurants
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`✅ Successfully converted ${restaurants.length} restaurants from CSV to JSON`);
    console.log(`📍 Output saved to: ${outputPath}`);
  });
