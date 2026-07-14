/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from './types';

export const getSeedProducts = (): Product[] => {
  const today = new Date();
  
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const d1 = new Date(today);
  d1.setDate(today.getDate() + 3); // 3 days left
  
  const d2 = new Date(today);
  d2.setDate(today.getDate() + 18); // 18 days left
  
  const d3 = new Date(today);
  d3.setDate(today.getDate() + 94); // 94 days left
  
  const d4 = new Date(today);
  d4.setDate(today.getDate() - 2); // 2 days ago (expired)

  return [
    {
      id: 'prod-1',
      name: 'Amul Butter',
      brand: 'Amul',
      category: 'Grocery',
      expiryDate: formatDate(d1),
      quantity: 1,
      initialQuantity: 2,
      usedCount: 1,
      price: 65,
      notes: 'Keep refrigerated. Great with toasted sourdough bread.'
    },
    {
      id: 'prod-2',
      name: 'Paracetamol',
      brand: 'Crocen',
      category: 'Medicine',
      expiryDate: formatDate(d2),
      quantity: 1,
      initialQuantity: 1,
      usedCount: 0,
      price: 185,
      notes: 'For emergency pain relief and fever.'
    },
    {
      id: 'prod-3',
      name: 'Sunscreen SPF 50',
      brand: 'Neutrogena',
      category: 'Cosmetics',
      expiryDate: formatDate(d3),
      quantity: 1,
      initialQuantity: 1,
      usedCount: 0,
      price: 450,
      notes: 'Non-comedogenic, dry touch formulation.'
    },
    {
      id: 'prod-4',
      name: 'Expired Milk',
      brand: 'Mother Dairy',
      category: 'Grocery',
      expiryDate: formatDate(d4),
      quantity: 1,
      initialQuantity: 1,
      usedCount: 0,
      price: 45,
      notes: 'Smell test failed.'
    }
  ];
};

export interface WastedItem {
  id: string;
  name: string;
  brand?: string;
  category: string;
  price: number;
  wastedDate: string; // YYYY-MM-DD
}

export const getSeedWastedHistory = (): WastedItem[] => {
  return [
    { id: 'wasted-1', name: 'Greek Yogurt', brand: 'Epigamia', category: 'Grocery', price: 65, wastedDate: '2026-07-12' },
    { id: 'wasted-2', name: 'Artisan Cheese', brand: 'Flanders', category: 'Grocery', price: 210, wastedDate: '2026-07-08' },
    { id: 'wasted-3', name: 'Cough Syrup', brand: 'Benadryl', category: 'Medicine', price: 185, wastedDate: '2026-07-02' },
    { id: 'wasted-4', name: 'Spinach Pack', brand: 'Organic', category: 'Grocery', price: 45, wastedDate: '2026-06-30' }
  ];
};
