export interface GstVerificationResponse {
  success: boolean;
  gstin: string;
  data: {
    gstin: string;
    legal_name: string;
    trade_name: string;
    status: string;
    pincode: string;
    block_status: string;
    city:string,
    address:string
  };
}