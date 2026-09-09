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
