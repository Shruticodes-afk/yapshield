/**
 * Types for YapShield Detection Engine
 * 
 * This file defines the core data types and structures used
 * to detect sensitive data (PII, secrets, keys, etc.) in text.
 */

// Supported categories of sensitive information
export type DetectionType =
  | 'email'
  | 'phone'
  | 'aadhaar'
  | 'pan'
  | 'upi'
  | 'ifsc'
  | 'credit_card'
  | 'api_key'
  | 'jwt'
  | 'private_key'
  | 'high_entropy_secret'
  | 'person'
  | 'keyword';

/**
 * Represents a detected entity found within a piece of text.
 * 
 * - type: Which category was found (e.g., 'email', 'phone')
 * - value: The exact matching string extracted from the text
 * - start: Character index where the match starts (0-indexed)
 * - end: Character index where the match ends (exclusive)
 * - confidence: Value between 0 and 1 indicating how confident we are
 */
export interface Detection {
  type: DetectionType;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

/**
 * A detector function takes raw input text and returns
 * a list of all detected entities it found.
 */
export type Detector = (text: string) => Detection[];
