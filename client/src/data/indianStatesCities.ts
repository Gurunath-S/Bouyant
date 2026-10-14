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
  if (trimmed === 'india' || trimmed === 'in') return 'IN';

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
  if (!countryName || countryName.trim().toLowerCase() === 'india') {
    return ALL_INDIAN_STATES;
  }

  const code = findCountryCode(countryName);
  if (!code) return ALL_INDIAN_STATES;

  try {
    const states = State.getStatesOfCountry(code) || [];
    if (!states || states.length === 0) {
      // For city-states without subdivisions (e.g. Singapore, Monaco, Vatican City)
      return [countryName];
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
export function getCitiesForLocation(countryName?: string, stateName?: string): string[] {
  const isIndia = !countryName || countryName.trim().toLowerCase() === 'india';

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
  const code = findCountryCode(countryName);
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
  const isIndia = !countryName || countryName.trim().toLowerCase() === 'india';
  const countryCode = isIndia ? 'IN' : findCountryCode(countryName);
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
