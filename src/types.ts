/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = string;

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: Category;
  expiryDate: string; // YYYY-MM-DD
  mfdDate?: string; // YYYY-MM-DD (Manufactured Date)
  quantity: number;
  initialQuantity: number;
  usedCount: number; // to track how many were used
  price: number; // in Rupees
  notes?: string;
  isWasted?: boolean; // if it was marked as wasted / discarded
  wastedDate?: string; // YYYY-MM-DD if wasted
  isUsed?: boolean; // if it was fully consumed
  usedDate?: string; // YYYY-MM-DD if consumed
}

export interface AppSettings {
  geminiApiKey: string;
  defaultReminderDays: number;
  notificationsEnabled: boolean;
  username: string;
  userEmail: string;
}
