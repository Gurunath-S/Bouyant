export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

export interface StateGeoInfo {
  state: string;
  city: string;
  pincode: string;
  address: string;
}

export const STATE_GEO_REGISTRY: Record<string, StateGeoInfo> = {
  '01': { state: 'Jammu and Kashmir', city: 'Srinagar', pincode: '190001', address: 'Commercial Centre, Residency Road' },
  '02': { state: 'Himachal Pradesh', city: 'Shimla', pincode: '171001', address: 'Mall Road Commercial Complex' },
  '03': { state: 'Punjab', city: 'Ludhiana', pincode: '141001', address: 'Ferozepur Road Industrial Area' },
  '04': { state: 'Chandigarh', city: 'Chandigarh', pincode: '160017', address: 'Sector 17 Commercial Complex' },
  '05': { state: 'Uttarakhand', city: 'Dehradun', pincode: '248001', address: 'Rajpur Road Business Arcade' },
  '06': { state: 'Haryana', city: 'Gurugram', pincode: '122002', address: 'Cyber City, Phase II' },
  '07': { state: 'Delhi', city: 'New Delhi', pincode: '110001', address: 'Barakhamba Road, Connaught Place' },
  '08': { state: 'Rajasthan', city: 'Jaipur', pincode: '302001', address: 'MI Road, C-Scheme' },
  '09': { state: 'Uttar Pradesh', city: 'Noida', pincode: '201301', address: 'Sector 62, Electronic City' },
  '10': { state: 'Bihar', city: 'Patna', pincode: '800001', address: 'Frazer Road, Dak Bungalow' },
  '11': { state: 'Sikkim', city: 'Gangtok', pincode: '737101', address: 'MG Marg Commercial Plaza' },
  '12': { state: 'Arunachal Pradesh', city: 'Itanagar', pincode: '791111', address: 'Bank Tinali Commercial Hub' },
  '13': { state: 'Nagaland', city: 'Kohima', pincode: '797001', address: 'Main Town Commercial Complex' },
  '14': { state: 'Manipur', city: 'Imphal', pincode: '795001', address: 'Thangal Bazar Market Center' },
  '15': { state: 'Mizoram', city: 'Aizawl', pincode: '796001', address: 'Zarkawt Main Commercial Road' },
  '16': { state: 'Tripura', city: 'Agartala', pincode: '799001', address: 'Hari Ganga Basak Road' },
  '17': { state: 'Meghalaya', city: 'Shillong', pincode: '793001', address: 'Police Bazar Commercial Centre' },
  '18': { state: 'Assam', city: 'Guwahati', pincode: '781005', address: 'GS Road, Dispur' },
  '19': { state: 'West Bengal', city: 'Kolkata', pincode: '700001', address: 'Park Street, Dalhousie Square' },
  '20': { state: 'Jharkhand', city: 'Ranchi', pincode: '834001', address: 'Main Road Commercial Plaza' },
  '21': { state: 'Odisha', city: 'Bhubaneswar', pincode: '751001', address: 'Janpath, Saheed Nagar' },
  '22': { state: 'Chhattisgarh', city: 'Raipur', pincode: '492001', address: 'Jail Road Business Park' },
  '23': { state: 'Madhya Pradesh', city: 'Indore', pincode: '452001', address: 'AB Road, Vijay Nagar' },
  '24': { state: 'Gujarat', city: 'Ahmedabad', pincode: '380009', address: 'Ashram Road, Navrangpura' },
  '26': { state: 'Dadra and Nagar Haveli and Daman and Diu', city: 'Daman', pincode: '396210', address: 'Nani Daman Industrial Area' },
  '27': { state: 'Maharashtra', city: 'Mumbai', pincode: '400051', address: 'Bandra Kurla Complex (BKC)' },
  '29': { state: 'Karnataka', city: 'Bengaluru', pincode: '560001', address: 'MG Road, Central Business District' },
  '30': { state: 'Goa', city: 'Panaji', pincode: '403001', address: 'Patto Plaza Commercial Complex' },
  '31': { state: 'Lakshadweep', city: 'Kavaratti', pincode: '682555', address: 'Main Island Administrative Road' },
  '32': { state: 'Kerala', city: 'Kochi', pincode: '682016', address: 'MG Road, Ernakulam' },
  '33': { state: 'Tamil Nadu', city: 'Chennai', pincode: '600002', address: 'Anna Salai, Mount Road' },
  '34': { state: 'Puducherry', city: 'Puducherry', pincode: '605001', address: 'Jawaharlal Nehru Street' },
  '35': { state: 'Andaman and Nicobar Islands', city: 'Port Blair', pincode: '744101', address: 'Aberdeen Bazar Commercial Complex' },
  '36': { state: 'Telangana', city: 'Hyderabad', pincode: '500081', address: 'HITEC City, Madhapur' },
  '37': { state: 'Andhra Pradesh', city: 'Visakhapatnam', pincode: '530002', address: 'Dwaraka Nagar Commercial Hub' },
  '38': { state: 'Ladakh', city: 'Leh', pincode: '194101', address: 'Main Bazaar Business Centre' },
  '97': { state: 'Other Territory', city: 'Special Economic Zone', pincode: '400001', address: 'Export Processing Zone' },
  '99': { state: 'Centre Jurisdiction', city: 'New Delhi', pincode: '110001', address: 'Central Revenue Building, IP Estate' },
};

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export interface GstinValidationResult {
  isValid: boolean;
  error?: string;
  stateCode?: string;
  stateName?: string;
  pan?: string;
}

/**
 * Validates the GSTIN structure, verifies the state code and extracts the embedded PAN.
 */
export function validateGstinStructure(gstin: string): GstinValidationResult {
  if (!gstin) {
    return { isValid: false, error: 'GSTIN is required' };
  }

  const cleanGst = gstin.trim().toUpperCase();

  // Allow sandbox test GSTIN
  if (cleanGst === '00AAAAA0000A1ZT') {
    return {
      isValid: true,
      stateCode: '00',
      stateName: 'National Sandbox Test',
      pan: 'AAAAA0000A',
    };
  }

  if (cleanGst.length !== 15) {
    return { isValid: false, error: `GSTIN must be exactly 15 alphanumeric characters (received ${cleanGst.length})` };
  }

  if (!GSTIN_REGEX.test(cleanGst)) {
    return {
      isValid: false,
      error: 'Invalid GSTIN format. Expected 2 digits (State), 10 chars (PAN), 1 entity code, "Z", and 1 check digit (e.g. 27AAACT1029F1Z5)',
    };
  }

  const stateCode = cleanGst.substring(0, 2);
  const stateName = GST_STATE_CODES[stateCode];
  if (!stateName) {
    return { isValid: false, error: `Invalid GST state code "${stateCode}". Must be a recognized Indian state code (01-38, 97, 99).` };
  }

  const pan = cleanGst.substring(2, 12);
  if (!PAN_REGEX.test(pan)) {
    return { isValid: false, error: `Embedded PAN "${pan}" inside GSTIN is structurally invalid.` };
  }

  return {
    isValid: true,
    stateCode,
    stateName,
    pan,
  };
}

// Known enterprise & demo GSTIN catalog for authentic testing
export const KNOWN_GSTIN_CATALOG: Record<string, {
  legalName: string;
  tradeName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}> = {
  '27AAACT1029F1Z5': {
    legalName: 'TechCorp Global Solutions Private Limited',
    tradeName: 'TechCorp Global',
    address: '100 Innovation Way, Bandra Kurla Complex (BKC)',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400051',
  },
  '07BBBCA8891G2Z8': {
    legalName: 'Apex BioDynamics India Private Limited',
    tradeName: 'Apex BioDynamics',
    address: '450 BioTech Parkway, Barakhamba Road, Connaught Place',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
  },
  '33AAACA9810J1Z4': {
    legalName: 'Verified Business Enterprise Private Limited',
    tradeName: 'Verified Business Enterprise',
    address: 'Commercial Complex, Cross Cut Road, Gandhipuram',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641012',
  },
  '29AAACI4747B1ZP': {
    legalName: 'Infosys Limited',
    tradeName: 'Infosys',
    address: 'Electronics City, Hosur Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560100',
  },
  '27AAACT2879P1ZU': {
    legalName: 'Tata Consultancy Services Limited',
    tradeName: 'TCS',
    address: 'TCS House, Raveline Street, Fort',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  },
  '27AAACR0219M1ZS': {
    legalName: 'Reliance Industries Limited',
    tradeName: 'Reliance Industries',
    address: 'Maker Chambers IV, 222 Nariman Point',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400021',
  },
  '33AABCT1332L1ZV': {
    legalName: 'Titan Company Limited',
    tradeName: 'Titan',
    address: 'Integrity, No. 193, Veerasandra, Electronics City P.O.',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600034',
  },
  '29AAACW0134Q1Z8': {
    legalName: 'Wipro Limited',
    tradeName: 'Wipro Technologies',
    address: 'Doddakannelli, Sarjapur Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560035',
  },
  '24AAACL1968H1ZU': {
    legalName: 'Larsen & Toubro Limited',
    tradeName: 'L&T Heavy Engineering',
    address: 'L&T House, Navrangpura',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380009',
  },
  '07AAACG0532N1Z4': {
    legalName: 'Google India Digital Services Private Limited',
    tradeName: 'Google India',
    address: 'Signature Towers, Sector 15, Part II',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
  },
  '00AAAAA0000A1ZT': {
    legalName: 'GSTINAPI Test Private Limited',
    tradeName: 'GSTINAPI Sandbox',
    address: '1, Test Building, Test Street, Test Locality',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395010',
  },
};

const NAME_PREFIX_BY_CHAR: Record<string, string> = {
  A: 'Apex',
  B: 'Bharat',
  C: 'Crest',
  D: 'Dynamic',
  E: 'Everest',
  F: 'Frontier',
  G: 'Global',
  H: 'Horizon',
  I: 'Imperial',
  J: 'Jupiter',
  K: 'Krystal',
  L: 'Lumina',
  M: 'Matrix',
  N: 'Nexus',
  O: 'Optimum',
  P: 'Prime',
  Q: 'Quantum',
  R: 'Radiant',
  S: 'Synergy',
  T: 'Trident',
  U: 'Universal',
  V: 'Vertex',
  W: 'Western',
  X: 'Xeno',
  Y: 'Zenith',
  Z: 'Zenith',
};

/**
 * Dynamically generates realistic, state-aligned, and PAN-structured GST details
 * for any valid 15-character Indian GSTIN when live external provider is held or in development.
 */
export function generateRealisticGstDetails(gstin: string) {
  const cleanGst = gstin.trim().toUpperCase();

  // 1. Check known catalog
  if (KNOWN_GSTIN_CATALOG[cleanGst]) {
    const known = KNOWN_GSTIN_CATALOG[cleanGst];
    const pan = cleanGst.length === 15 ? cleanGst.substring(2, 12) : 'AAACT1029F';
    const stateCode = cleanGst.substring(0, 2);
    return {
      gstin: cleanGst,
      legalName: known.legalName,
      tradeName: known.tradeName,
      status: 'Active',
      address: known.address,
      city: known.city,
      state: known.state,
      stateCode: stateCode === '00' ? '24' : stateCode,
      pincode: known.pincode,
      pan: pan,
      blockStatus: 'Unblocked',
      taxpayerType: 'Regular',
    };
  }

  const stateCode = cleanGst.substring(0, 2);
  const geoInfo = STATE_GEO_REGISTRY[stateCode] || {
    state: GST_STATE_CODES[stateCode] || 'India',
    city: 'Central Commercial Hub',
    pincode: `${stateCode}1001`.padEnd(6, '0'),
    address: 'Commercial Business District',
  };

  const pan = cleanGst.length === 15 ? cleanGst.substring(2, 12) : 'AAACT1029F';
  const entityChar = pan.charAt(3) || 'C';
  const initialChar = pan.charAt(4) || 'T';
  const brandWord = NAME_PREFIX_BY_CHAR[initialChar] || 'National';

  let legalSuffix = 'Private Limited';
  let tradeSuffix = 'Technologies';

  if (entityChar === 'P') {
    legalSuffix = 'Enterprises';
    tradeSuffix = 'Trading Co.';
  } else if (entityChar === 'F') {
    legalSuffix = 'LLP';
    tradeSuffix = '& Associates';
  } else if (entityChar === 'T') {
    legalSuffix = 'Foundation';
    tradeSuffix = 'Trust';
  } else if (entityChar === 'H') {
    legalSuffix = 'HUF';
    tradeSuffix = 'Family Estate';
  }

  const legalName = `${brandWord} ${geoInfo.state.replace(/\s+/g, '')} ${legalSuffix}`;
  const tradeName = `${brandWord} ${tradeSuffix}`;

  return {
    gstin: cleanGst,
    legalName,
    tradeName,
    status: 'Active',
    address: `${brandWord} Tower, ${geoInfo.address}`,
    city: geoInfo.city,
    state: geoInfo.state,
    stateCode: stateCode,
    pincode: geoInfo.pincode,
    pan: pan,
    blockStatus: 'Unblocked',
    taxpayerType: 'Regular',
  };
}
