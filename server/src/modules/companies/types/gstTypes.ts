export interface GstVerificationResponse {
  success: boolean;
  gstin: string;
  data: {
    gstin: string;
    legal_name: string;
    trade_name?: string;
    status: string;
    pincode: string;
    block_status?: string;
    city: string;
    state?: string;
    state_code?: string;
    address: string;
    pan?: string;
    taxpayer_type?: string;
    address_details?: {
      building_number?: string | null;
      building_name?: string | null;
      floor?: string | null;
      street?: string | null;
      locality?: string | null;
      district?: string | null;
      city?: string | null;
      state?: string | null;
      landmark?: string | null;
      pincode?: string | null;
    };
  };
}

export interface EnrichedGstDetails {
  gstin: string;
  legalName: string;
  tradeName: string;
  status: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  pan: string;
  blockStatus: string;
  taxpayerType?: string;
}