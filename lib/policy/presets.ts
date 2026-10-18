import { Policy } from './types';

/**
 * Student Policy Preset:
 * - Balanced mode
 * - Personal contact (email, phone, upi, ifsc) masked
 * - Names tokenized
 * - High-risk credentials, IDs, and financial secrets blocked
 * - Injection threshold: 60
 * - Human review required
 */
export const Student: Policy = {
  name: 'Student',
  mode: 'balanced',
  rules: {
    email: 'mask',
    phone: 'mask',
    person: 'tokenize',
    aadhaar: 'block',
    pan: 'block',
    credit_card: 'block',
    api_key: 'block',
    jwt: 'block',
    private_key: 'block',
    high_entropy_secret: 'block',
    upi: 'mask',
    ifsc: 'mask',
  },
  injectionThreshold: 60,
  reviewRequired: true,
};

/**
 * Developer Policy Preset:
 * - Balanced mode
 * - Secrets, credentials, credit cards, and government IDs blocked
 * - Contact info (email, phone) tokenized
 * - Person names allowed
 * - Injection threshold: 60
 * - Automated processing (reviewRequired: false)
 */
export const Developer: Policy = {
  name: 'Developer',
  mode: 'balanced',
  rules: {
    api_key: 'block',
    jwt: 'block',
    private_key: 'block',
    high_entropy_secret: 'block',
    email: 'tokenize',
    phone: 'tokenize',
    person: 'allow',
    aadhaar: 'block',
    pan: 'block',
    credit_card: 'block',
    upi: 'tokenize',
    ifsc: 'allow',
  },
  injectionThreshold: 60,
  reviewRequired: false,
};

/**
 * Enterprise Policy Preset:
 * - Strict mode
 * - Maximum security: all sensitive entities blocked except person and email which tokenize
 * - Lower injection tolerance (threshold: 40)
 * - Human review required
 */
export const Enterprise: Policy = {
  name: 'Enterprise',
  mode: 'strict',
  rules: {
    person: 'tokenize',
    email: 'tokenize',
    aadhaar: 'block',
    credit_card: 'block',
    api_key: 'block',
    jwt: 'block',
    private_key: 'block',
    high_entropy_secret: 'block',
    pan: 'block',
    upi: 'block',
    ifsc: 'block',
    phone: 'block',
    keyword: 'block',
  },
  injectionThreshold: 40,
  reviewRequired: true,
};

export const PRESETS = {
  Student,
  Developer,
  Enterprise,
  student: Student,
  developer: Developer,
  enterprise: Enterprise,
} as const;

export default PRESETS;
