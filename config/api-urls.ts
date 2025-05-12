/**
 * API URL configuration
 * Allows easy switching between development and production environments
 */

type Environment = 'development' | 'production';

// Current environment - set to 'development' by default
// Change this to 'production' when deploying to production
const CURRENT_ENV: Environment = 'production';

// API base URLs
const API_URLS = {
  development: {
    BOND_API: 'http://localhost:8000',
    MARKET_DATA_API: 'http://51.250.96.12:34915'
  },
  production: {
    BOND_API: 'https://api.ofz.moscow', // Replace with your production URL
    MARKET_DATA_API: 'https://api.ofz.moscow' // Replace with your production URL
  }
};

// API endpoints
export const API_ENDPOINTS = {
  // Bond related endpoints
  BOND: {
    MINT_TOKENS: `${API_URLS[CURRENT_ENV].BOND_API}/api/bond/mint-tokens`,
    ISSUE: `${API_URLS[CURRENT_ENV].BOND_API}/api/bond/issue`
  },
  
  // Market data endpoints
  MARKET_DATA: {
    BONDS: `${API_URLS[CURRENT_ENV].MARKET_DATA_API}/api/bonds`
  }
};

// Helper function to construct URLs with query parameters
export function buildUrl(baseUrl: string, params: Record<string, string | number>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value.toString());
  });
  return url.toString();
}

// Example usage:
// import { API_ENDPOINTS, buildUrl } from '@/config/api-urls';
//
// // For mint tokens:
// const mintUrl = buildUrl(API_ENDPOINTS.BOND.MINT_TOKENS, {
//   bond_address: bondAddress,
//   to_address: address,
//   amount: amount
// });
//
// // For issue:
// const issueUrl = buildUrl(API_ENDPOINTS.BOND.ISSUE, {
//   name: selectedBond.name,
//   initial_price: initialPrice,
//   maturity_price: maturityPrice,
//   maturity_at: maturityTimestamp
// }); 