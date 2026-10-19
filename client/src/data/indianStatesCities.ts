import { Country, State, City } from 'country-state-city';

export interface StateCityData {
  state: string;
  cities: string[];
}

/**
 * Curated Major Business & Exhibition Hubs by State
 * These are pinned at the top of the dropdown for fast 1-click selection,
 * followed by the complete list of all cities from country-state-city.
 */
export const MAJOR_HUBS_BY_STATE: Record<string, string[]> = {
  'Maharashtra': [
    'Mumbai', 'Pune', 'Navi Mumbai', 'Thane', 'Nashik', 'Nagpur',
    'Chhatrapati Sambhajinagar', 'Solapur', 'Kolhapur', 'Pimpri-Chinchwad', 'Kalyan'
  ],
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Dharwad', 'Ballari', 'Kalaburagi', 'Udupi'
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore',
    'Tirunelveli', 'Hosur', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Kanchipuram'
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Vapi', 'Anand', 'Morbi'
  ],
  'Delhi': [
    'New Delhi', 'Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi'
  ],
  'Haryana': [
    'Gurugram', 'Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'
  ],
  'Uttar Pradesh': [
    'Noida', 'Greater Noida', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Ghaziabad', 'Prayagraj', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur'
  ],
  'Telangana': [
    'Hyderabad', 'Secunderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam'
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol', 'Kharagpur', 'Bardhaman', 'Malda'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar'
  ],
  'Kerala': [
    'Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Kannur', 'Kottayam'
  ],
  'Madhya Pradesh': [
    'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam'
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali (SAS Nagar)', 'Hoshiarpur', 'Pathankot'
  ],
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kakinada', 'Rajahmundry', 'Kurnool', 'Anantapur'
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif'
  ],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'
  ],
  'Assam': [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Rishikesh', 'Kashipur'
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Hazaribagh'
  ],
  'Chhattisgarh': [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'
  ],
  'Goa': [
    'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'
  ],
  'Himachal Pradesh': [
    'Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Baddi', 'Kullu', 'Manali'
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'
  ],
  'Chandigarh': [
    'Chandigarh'
  ],
  'Puducherry': [
    'Puducherry', 'Karaikal', 'Oulgaret'
  ],
};

/**
 * Top National Exhibition & Commercial Metro Hubs
 */
export const TOP_NATIONAL_HUBS: string[] = [
  'Mumbai', 'Delhi', 'New Delhi', 'Bengaluru', 'Chennai', 'Hyderabad',
  'Ahmedabad', 'Kolkata', 'Pune', 'Jaipur', 'Surat', 'Lucknow',
  'Chandigarh', 'Kochi', 'Indore', 'Coimbatore', 'Vadodara', 'Noida',
  'Greater Noida', 'Gurugram', 'Gurgaon', 'Bhopal', 'Nagpur', 'Visakhapatnam',
  'Navi Mumbai', 'Thane'
];

/**
 * Normalizes any country representation (e.g. "IN", "in", "IND", "India")
 * to its official full name (e.g. "India").
 */
export function normalizeCountryName(countryName?: string | null): string {
  if (!countryName) return 'India';
  const trimmed = countryName.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'in' || lower === 'ind' || lower === 'india') return 'India';

  try {
    const match = Country.getAllCountries().find(
      (c) => c.isoCode.toLowerCase() === lower || c.name.toLowerCase() === lower
    );
    if (match) return match.name;
  } catch {}

  return trimmed;
}

/**
 * Pre-computed all ~250 countries from country-state-city with India first
 */
export const ALL_COUNTRIES: string[] = (() => {
  try {
    const raw = Country.getAllCountries();
    const names = raw.map((c) => c.name);
    const withoutIndia = names.filter((n) => n !== 'India').sort((a, b) => a.localeCompare(b));
    return ['India', ...withoutIndia];
  } catch {
    return ['India', 'United Arab Emirates', 'United States', 'Germany', 'Singapore', 'United Kingdom'];
  }
})();

export const COMMON_COUNTRIES: string[] = ALL_COUNTRIES;

/**
 * Find country ISO code (e.g. "IN", "US", "AE") from country name or code
 */
export function findCountryCode(countryName?: string): string | null {
  if (!countryName) return 'IN';
  const trimmed = countryName.trim().toLowerCase();
  if (trimmed === 'india' || trimmed === 'in' || trimmed === 'ind') return 'IN';

  try {
    const match = Country.getAllCountries().find(
      (c) => c.name.toLowerCase() === trimmed || c.isoCode.toLowerCase() === trimmed
    );
    return match ? match.isoCode : null;
  } catch {
    return null;
  }
}

/**
 * All 36 States and Union Territories of India from country-state-city
 */
export const ALL_INDIAN_STATES: string[] = (() => {
  try {
    const states = State.getStatesOfCountry('IN') || [];
    return states.map((s) => s.name).sort((a, b) => a.localeCompare(b));
  } catch {
    return [
      'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
      'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
      'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
      'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
      'Uttarakhand', 'West Bengal'
    ];
  }
})();

/**
 * Robust State lookup supporting aliases (e.g. "Delhi (NCT)", "Orissa", "Pondicherry")
 */
export function findStateObject(countryCode: string, stateName: string) {
  try {
    const states = State.getStatesOfCountry(countryCode) || [];
    const clean = stateName.trim().toLowerCase();

    // 1. Exact match by name or isoCode
    let found = states.find(
      (s) => s.name.toLowerCase() === clean || s.isoCode.toLowerCase() === clean
    );
    if (found) return found;

    // 2. India specific alias resolution
    if (countryCode === 'IN') {
      if (clean.includes('delhi')) return states.find((s) => s.isoCode === 'DL') || null;
      if (clean.includes('orissa') || clean.includes('odisha')) return states.find((s) => s.isoCode === 'OR') || null;
      if (clean.includes('uttaranchal') || clean.includes('uttarakhand')) return states.find((s) => s.isoCode === 'UT') || null;
      if (clean.includes('pondicherry') || clean.includes('puducherry')) return states.find((s) => s.isoCode === 'PY') || null;
    }

    // 3. Substring match
    found = states.find(
      (s) => clean.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(clean)
    );
    return found || null;
  } catch {
    return null;
  }
}

/**
 * Get states/provinces for any country dynamically
 */
export function getStatesForCountry(countryName?: string): string[] {
  const norm = normalizeCountryName(countryName);
  if (!countryName || norm.toLowerCase() === 'india') {
    return ALL_INDIAN_STATES;
  }

  const code = findCountryCode(norm);
  if (!code) return ALL_INDIAN_STATES;

  try {
    const states = State.getStatesOfCountry(code) || [];
    if (!states || states.length === 0) {
      // For city-states without subdivisions (e.g. Singapore, Monaco, Vatican City)
      return [norm];
    }
    return states.map((s) => s.name).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * Get complete cities list for any location:
 * - If country + state provided: returns ALL cities in that state (with major hubs at top)
 * - If country provided without state: returns national hubs + all country cities
 */
export function getCitiesForLocation(countryNameOrState?: string, stateNameOrCountry?: string): string[] {
  let countryName = countryNameOrState;
  let stateName = stateNameOrCountry;

  // Smart detect argument swap: e.g. getCitiesForLocation('Maharashtra', 'India') or getCitiesForLocation('Maharashtra')
  if (countryName && !stateName) {
    // If only 1 argument passed and it matches an Indian state, treat it as state in India
    const isState = ALL_INDIAN_STATES.some((s) => s.toLowerCase() === countryName?.trim().toLowerCase());
    if (isState) {
      stateName = countryName;
      countryName = 'India';
    }
  } else if (countryName && stateName) {
    const isFirstArgState = ALL_INDIAN_STATES.some((s) => s.toLowerCase() === countryName?.trim().toLowerCase());
    const isSecondArgCountry = stateName.trim().toLowerCase() === 'india' || stateName.trim().toLowerCase() === 'in';
    if (isFirstArgState && isSecondArgCountry) {
      const temp = stateName;
      stateName = countryName;
      countryName = temp;
    }
  } else if (!countryName && stateName) {
    countryName = 'India';
  }

  const norm = normalizeCountryName(countryName);
  const isIndia = norm.toLowerCase() === 'india';

  if (isIndia) {
    if (stateName && stateName.trim()) {
      const stateObj = findStateObject('IN', stateName);
      if (stateObj) {
        try {
          const rawCities = (City.getCitiesOfState('IN', stateObj.isoCode) || []).map((c) => c.name);
          const stateKey = Object.keys(MAJOR_HUBS_BY_STATE).find(
            (k) => k.toLowerCase() === stateObj.name.toLowerCase() || stateObj.name.toLowerCase().includes(k.toLowerCase())
          );
          const majorHubs = stateKey ? MAJOR_HUBS_BY_STATE[stateKey] : [];

          // Prepend curated major hubs, then add all state cities alphabetically
          return Array.from(new Set([...majorHubs, ...rawCities.sort((a, b) => a.localeCompare(b))]));
        } catch {}
      }
    }

    // Fallback if no state selected: return top national hubs, then all 4,200+ Indian cities
    try {
      const allCities = (City.getCitiesOfCountry('IN') || []).map((c) => c.name);
      return Array.from(new Set([...TOP_NATIONAL_HUBS, ...allCities.sort((a, b) => a.localeCompare(b))]));
    } catch {
      return TOP_NATIONAL_HUBS;
    }
  }

  // International Countries
  const code = findCountryCode(norm);
  if (!code) return [];

  try {
    if (stateName && stateName.trim()) {
      const stateObj = findStateObject(code, stateName);
      if (stateObj) {
        const stateCities = (City.getCitiesOfState(code, stateObj.isoCode) || []).map((c) => c.name);
        if (stateCities && stateCities.length > 0) {
          return Array.from(new Set(stateCities.sort((a, b) => a.localeCompare(b))));
        }
      }
    }

    // Fallback: all cities of the country
    const countryCities = (City.getCitiesOfCountry(code) || []).map((c) => c.name);
    return Array.from(new Set(countryCities.sort((a, b) => a.localeCompare(b))));
  } catch {
    return [];
  }
}

/**
 * Automatically infer state/province name from a selected city
 */
export function getStateForCity(cityName?: string, countryName?: string): string | null {
  if (!cityName) return null;
  const norm = normalizeCountryName(countryName);
  const isIndia = norm.toLowerCase() === 'india';
  const countryCode = isIndia ? 'IN' : findCountryCode(norm);
  if (!countryCode) return null;

  try {
    const cleanCity = cityName.trim().toLowerCase();
    const city = (City.getCitiesOfCountry(countryCode) || []).find(
      (c) => c.name.toLowerCase() === cleanCity
    );
    if (city && city.stateCode) {
      const stateObj = State.getStateByCodeAndCountry(city.stateCode, countryCode);
      return stateObj ? stateObj.name : null;
    }
  } catch {}
  return null;
}

/**
 * Backward compatibility exports
 */
export const INDIAN_STATES_AND_CITIES: StateCityData[] = ALL_INDIAN_STATES.map((state) => ({
  state,
  cities: getCitiesForLocation('India', state),
}));

export const ALL_INDIAN_CITIES: string[] = getCitiesForLocation('India');

export function getCitiesForState(stateName: string): string[] {
  return getCitiesForLocation('India', stateName);
}

/**
 * Title cases a given string (e.g. "MUMBAI" -> "Mumbai", "NEW DELHI" -> "New Delhi")
 */
function toProperTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

/**
 * Intelligently separates and extracts a clean, genuine City name from messy GSTIN address data
 * (which frequently bundles locality, sub-district, pincode, and state into the city field)
 * and safely appends any leftover locality information to the address field so no details are lost.
 */
export function extractCleanCityAndAddress(
  rawCity?: string,
  rawState?: string,
  rawAddress?: string,
  rawCountry?: string
): { cleanCity: string; updatedAddress: string } {
  let address = (rawAddress || '').trim();
  if (!rawCity || !rawCity.trim()) {
    return { cleanCity: '', updatedAddress: address };
  }

  const normCountry = normalizeCountryName(rawCountry || 'India');
  const isIndia = normCountry.toLowerCase() === 'india';
  const cleanState = (rawState || '').trim();

  // 1. Strip 6-digit Indian PIN codes, hyphens before pin, and "India" from rawCity
  let workingCity = rawCity
    .replace(/\b\d{6}\b/g, '')
    .replace(/-\s*\d{6}/g, '')
    .replace(/\bIndia\b/gi, '')
    .trim();

  // 2. If state name is included inside rawCity (e.g. "Mumbai, Maharashtra"), remove state name
  if (cleanState) {
    const escapedState = cleanState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    workingCity = workingCity.replace(new RegExp(`\\b${escapedState}\\b`, 'gi'), '').trim();
  }

  // 3. Clean trailing or leading commas, hyphens, and slashes
  workingCity = workingCity.replace(/^[\s,;/-]+|[\s,;/-]+$/g, '').trim();

  // 4. Split rawCity by common delimiters (comma, semicolon, slash)
  const segments = workingCity
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return { cleanCity: '', updatedAddress: address };
  }

  // 5. Gather known candidate cities from current state and national hubs
  const stateCities = isIndia && cleanState ? getCitiesForLocation('India', cleanState) : [];
  const majorHubs =
    isIndia && cleanState && MAJOR_HUBS_BY_STATE[cleanState]
      ? MAJOR_HUBS_BY_STATE[cleanState]
      : TOP_NATIONAL_HUBS;

  // Function to remove administrative suffixes like Urban, Suburban, Rural, District, Corporation, City
  const stripAdminSuffix = (token: string): string => {
    return token
      .replace(/\b(Urban|Suburban|Rural|District|Dist\.?|City|Corporation|Taluk|Taluka|Mandal)\b/gi, '')
      .replace(/[()]/g, '')
      .trim();
  };

  let matchedCity: string | null = null;
  const leftoverSegments: string[] = [];

  // 6. Check segments in reverse order (Indian addresses almost always place the City at the end)
  // e.g. ["Andheri West", "Mumbai"] -> segments[1] is "Mumbai"
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    const stripped = stripAdminSuffix(segment);

    if (!matchedCity) {
      // Check exact match in major hubs first
      const hubMatch = majorHubs.find(
        (h) => h.toLowerCase() === stripped.toLowerCase() || h.toLowerCase() === segment.toLowerCase()
      );
      if (hubMatch) {
        matchedCity = hubMatch;
        continue;
      }

      // Check match in state cities
      const stateCityMatch = stateCities.find(
        (c) => c.toLowerCase() === stripped.toLowerCase() || c.toLowerCase() === segment.toLowerCase()
      );
      if (stateCityMatch) {
        matchedCity = stateCityMatch;
        continue;
      }

      // Check if any major hub is contained as a word within the segment
      const wordMatch = majorHubs.find((h) =>
        new RegExp(`\\b${h}\\b`, 'i').test(segment)
      );
      if (wordMatch) {
        matchedCity = wordMatch;
        continue;
      }
    }

    // If not chosen as the city, keep as leftover locality
    leftoverSegments.unshift(segment);
  }

  // 7. If still not matched, check if the full working string contains any major hub
  if (!matchedCity) {
    const fullHubMatch = majorHubs.find((h) => new RegExp(`\\b${h}\\b`, 'i').test(workingCity));
    if (fullHubMatch) {
      matchedCity = fullHubMatch;
    }
  }

  // 8. If still no match against database, take the cleanest last token or stripped token
  if (!matchedCity && segments.length > 0) {
    const lastSeg = segments[segments.length - 1];
    matchedCity = toProperTitleCase(stripAdminSuffix(lastSeg) || lastSeg);
    leftoverSegments.pop(); // Remove the segment that was used as city
  }

  // 9. Append any leftover locality/sub-district details to the corporate address if not already present
  if (leftoverSegments.length > 0) {
    for (const extra of leftoverSegments) {
      const cleanExtra = toProperTitleCase(extra);
      if (cleanExtra && !address.toLowerCase().includes(cleanExtra.toLowerCase())) {
        address = address ? `${address}, ${cleanExtra}` : cleanExtra;
      }
    }
  }

  return {
    cleanCity: matchedCity || '',
    updatedAddress: address,
  };
}

