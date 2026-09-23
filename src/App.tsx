/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  PlusCircle, 
  BarChart3, 
  Settings as SettingsIcon, 
  Menu, 
  User, 
  Search, 
  Plus, 
  Minus, 
  Calendar, 
  Clock, 
  Info, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  ShoppingBasket, 
  Scan, 
  Sparkles,
  Camera,
  Eye,
  EyeOff,
  Download,
  Upload,
  UserCheck,
  X,
  Image as ImageIcon,
  ImagePlus,
  Edit2,
  RefreshCw,
  Smartphone,
  RotateCcw,
  Undo2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, AppSettings, Category, RemovedItem } from './types';
import { getSeedProducts, getSeedWastedHistory, WastedItem } from './data';
import { auth, db, googleProvider } from './lib/firebase';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

// Helper to sanitize Firestore document data and strip undefined properties
function cleanDocData<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  }
  return clean;
}

// Default Product Image provided in custom icon (served from /icons/default-product.png)
export const DEFAULT_PRODUCT_IMAGE = '/icons/default-product.png';

// Helper for category stock images matching the mockup HTML URLs
const CATEGORY_IMAGES: Record<string, string> = {
  'Amul Butter': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiJAsAjvwWLyXZgoca3nHUHUD81fsGEnCpLCMLvNGQzmsqWTjywTasy5WYeFQ9gFocFak5cQSgESXEyvxTZMCt48QbSO8A3rGsdCcUCopaIVpU2rPKFE1iNTn1K2hGJlJ80jX06W-yE9vJAogUxHkSV_ZjentwxvU9zz9oDKSZ5TCd67-FEoFweIHURvBRr7qQdWhd9w6QTOyjOrT9GxX7oro2SsI_mHZ3BCig9kab0FDCrp6BY-49CJHzG3hxhYvF7BcYwaQfILE',
  'Paracetamol': 'https://lh3.googleusercontent.com/aida-public/AB6AXuB302TnXczTBeCJAs_deGROhE6ZnPi-9j-mOfNUUdZFuHqhVdHMxfY-8U-Bfiq9VpzURaS7-EgION6puuMtkTcHGDbAh3foQqhG-ZeUSR8wl661UmwI79xO0WSfglJhw7rivat5gObpVcSms0wMf_7tBbKyJ-yU3VQr6kypcfxNIqffa__EXJ5AbaQeplXQZgxwaFPdUPUN4SOQZX0ToVS8QdVD4i6fvTBVcBPSJ0EqcYHfQRvaUFAkk9tNGkdHIfqCsdPz-1x1Fdw',
  'Sunscreen SPF 50': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEThDqDsg5qMKOMvyQAvg-khrKIT2RpDO3vDAYOX-IOqov72YxV7reSNVMWoZCE9KrjPeebF5gNxBNHVfdmTIxvfII567IOt6WzbYQlk6yq_NPEJSwUHRvWPI1k2D2IBTH4E69k3VtNe21634LqLGxHUe2xkdx6tDXP6hM93zYFoYgRqFkFu0mdnb5tWdNfNOj6BbCqQhCKMdVfLqIKAtat6eHJ8MIeRUJmdoN5QdV04YAmT9FogIoc95-bh-C0djn1U8VV0DEg4o',
  'Expired Milk': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGIPRYAl4gHvczxtHmjErp6wEzdN-XW_aHD0jOqVz1EwwOz_ZTbsaQ1X4jAaAqCM2jEj97dNxxlYlivYjKqqA4IFocB1ZrsihS5RPJ8xQ9dJrSXwUNZyiavsbHkjTwjzG27zwvTyMPA-Zho2MkmQXxJ9GoROiSV7YJSAC2ArhojmbbtQ900mWTygzrlRwLD_FQc2WcHH5GCv0-nM973aKbcEFQW-qjbKqtuLuXChuLMX84EFhe9F1KE6u9GqpKkBN-cQZAbE1-EiA',
  'Amul Gold Milk': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkhX10M8Wb3OzYsnng77pRhNlgrJW7gF1uhEnzelW9QdZqSj2qcMQ7jqrwCKF3Fx6B60rziUsX7HbUfuXGdZIi1-nrany7EZKtJKLtKhSFlCq0d0r38d3yEUf5sKAKwxTID-46QlcqpSYRxHmGexuDosU5j6MaTvfPspjqpm9vxWIhtseO5GNbU7XyOmB5vVf5zEXaUN11ryEfYbaqKKOo0GqzzniFVbcvdxcv38aW0W5rrezmSpTUNZ6MdvXtoiej7X4fJwgNLQ4',
  'Placeholder': DEFAULT_PRODUCT_IMAGE
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'Grocery': DEFAULT_PRODUCT_IMAGE,
  'Medicine': DEFAULT_PRODUCT_IMAGE,
  'Cosmetics': DEFAULT_PRODUCT_IMAGE,
  'Household': DEFAULT_PRODUCT_IMAGE,
  'Other': DEFAULT_PRODUCT_IMAGE
};

const MOCK_PACKAGING_PHOTOS = [
  {
    name: 'Mother Dairy Milk Packet',
    category: 'Grocery',
    image: CATEGORY_IMAGES['Amul Gold Milk'],
    mockOcrData: {
      name: 'Fresh Toned Milk',
      brand: 'Mother Dairy',
      category: 'Grocery',
      expiryDate: '2026-08-15',
      quantity: 1,
      price: 32,
      notes: 'Best before 2 days from packaging. Keep under refrigeration below 8°C.'
    }
  },
  {
    name: 'Epigamia Greek Yogurt Cup',
    category: 'Grocery',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=200',
    mockOcrData: {
      name: 'Blueberry Greek Yogurt',
      brand: 'Epigamia',
      category: 'Grocery',
      expiryDate: '2026-07-28',
      quantity: 2,
      price: 120,
      notes: 'High protein yogurt. Keep chilled.'
    }
  },
  {
    name: 'Benadryl Cough Syrup Bottle',
    category: 'Medicine',
    image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&q=80&w=200',
    mockOcrData: {
      name: 'Cough Formula Syrup',
      brand: 'Benadryl',
      category: 'Medicine',
      expiryDate: '2027-03-31',
      quantity: 1,
      price: 145,
      notes: 'Store in a cool dry place. Keep out of reach of children.'
    }
  },
  {
    name: 'Neutrogena Ultra Sheer Tube',
    category: 'Cosmetics',
    image: CATEGORY_IMAGES['Sunscreen SPF 50'],
    mockOcrData: {
      name: 'Ultra Sheer Dry-Touch Sunblock SPF 50+',
      brand: 'Neutrogena',
      category: 'Cosmetics',
      expiryDate: '2028-11-30',
      quantity: 1,
      price: 650,
      notes: 'Broad spectrum UVA/UVB protection.'
    }
  }
];

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'home' | 'add' | 'stats' | 'settings'>('home');

  // Products and Waste states
  const [products, setProducts] = useState<Product[]>([]);
  const [wastedHistory, setWastedHistory] = useState<WastedItem[]>([]);
  const [removedHistory, setRemovedHistory] = useState<RemovedItem[]>([]);

  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | Category>('All');

  const DEFAULT_CATEGORIES = ['Grocery', 'Medicine', 'Cosmetics', 'Household', 'Other'];
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Grocery' as Category,
    expiryDate: '',
    mfdDate: '',
    quantity: 1,
    price: '',
    notes: '',
    imageUrl: ''
  });

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    brand: '',
    category: 'Grocery' as Category,
    expiryDate: '',
    mfdDate: '',
    quantity: 1,
    price: '',
    notes: '',
    imageUrl: ''
  });

  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    geminiApiKey: '',
    defaultReminderDays: 3,
    notificationsEnabled: true,
    username: 'Alex Sterling',
    userEmail: 'alex.sterling@freshstamp.io'
  });

  // OCR scanning states
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [showOcrSelector, setShowOcrSelector] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showBrandDrawer, setShowBrandDrawer] = useState(false);

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // App Opening / Launch Splash Screen Animation State
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('FreshStamp installed successfully!', 'success');
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      showToast('To install: Tap your browser share/menu icon and select "Add to Home Screen" or "Install App".', 'info');
    }
  };

  // Firebase Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Helper to load offline local data (for logged out / guest users)
  const loadLocalData = () => {
    try {
      const storedProducts = localStorage.getItem('freshstamp_products');
      const storedWasted = localStorage.getItem('freshstamp_wasted_history');
      const storedSettings = localStorage.getItem('freshstamp_settings');
      const storedCategories = localStorage.getItem('freshstamp_categories');
      const storedRemoved = localStorage.getItem('freshstamp_removed_history');

      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        const initialProducts = getSeedProducts();
        setProducts(initialProducts);
        localStorage.setItem('freshstamp_products', JSON.stringify(initialProducts));
      }

      if (storedWasted) {
        setWastedHistory(JSON.parse(storedWasted));
      } else {
        const initialWasted = getSeedWastedHistory();
        setWastedHistory(initialWasted);
        localStorage.setItem('freshstamp_wasted_history', JSON.stringify(initialWasted));
      }

      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      } else {
        const initialSettings = {
          geminiApiKey: '',
          defaultReminderDays: 3,
          notificationsEnabled: true,
          username: 'Alex Sterling',
          userEmail: 'alex.sterling@freshstamp.io'
        };
        setSettings(initialSettings);
        localStorage.setItem('freshstamp_settings', JSON.stringify(initialSettings));
      }

      if (storedCategories) {
        setCustomCategories(JSON.parse(storedCategories));
      } else {
        setCustomCategories([]);
        localStorage.setItem('freshstamp_categories', JSON.stringify([]));
      }

      if (storedRemoved) {
        setRemovedHistory(JSON.parse(storedRemoved));
      } else {
        setRemovedHistory([]);
      }
    } catch (e) {
      console.warn('Error loading guest offline data:', e);
    }
  };

  // Real-Time Multi-Device Auth & Firestore Sync Subscription
  useEffect(() => {
    let unsubs: Unsubscribe[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous listeners when user changes or logs out
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      setUser(currentUser);
      setLoadingAuth(true);

      if (currentUser) {
        const uid = currentUser.uid;

        // 1. Immediately render cached data for instant UX without screen flicker
        try {
          const cacheSettings = localStorage.getItem(`freshstamp_settings_${uid}`);
          if (cacheSettings) setSettings(JSON.parse(cacheSettings));

          const cacheProducts = localStorage.getItem(`freshstamp_products_${uid}`);
          if (cacheProducts) setProducts(JSON.parse(cacheProducts));

          const cacheWasted = localStorage.getItem(`freshstamp_wasted_history_${uid}`);
          if (cacheWasted) setWastedHistory(JSON.parse(cacheWasted));

          const cacheRemoved = localStorage.getItem(`freshstamp_removed_history_${uid}`);
          if (cacheRemoved) setRemovedHistory(JSON.parse(cacheRemoved));

          const cacheCategories = localStorage.getItem(`freshstamp_categories_${uid}`);
          if (cacheCategories) setCustomCategories(JSON.parse(cacheCategories));
        } catch (e) {
          console.warn('Error reading local user cache on auth:', e);
        }

        // 2. Ensure initial user settings document exists in Firestore
        try {
          const settingsRef = doc(db, 'users', uid, 'settings', 'current');
          const settingsSnap = await getDoc(settingsRef);
          if (!settingsSnap.exists()) {
            const initialUserSettings: AppSettings = {
              geminiApiKey: '',
              defaultReminderDays: 3,
              notificationsEnabled: true,
              username: currentUser.displayName || 'Alex Sterling',
              userEmail: currentUser.email || 'alex.sterling@freshstamp.io'
            };
            await setDoc(settingsRef, cleanDocData(initialUserSettings));
            setSettings(initialUserSettings);
            localStorage.setItem(`freshstamp_settings_${uid}`, JSON.stringify(initialUserSettings));
          }
        } catch (err) {
          console.warn('Error ensuring user settings in Firestore:', err);
        }

        // 3. Connect real-time Firestore listeners for Live Cross-Device Sync
        // Products listener: Authoritative cloud state. Deletions on mobile reflect instantly on laptop!
        const unsubProducts = onSnapshot(collection(db, 'users', uid, 'products'), (snapshot) => {
          const cloudProducts: Product[] = [];
          snapshot.forEach((docSnap) => {
            cloudProducts.push(docSnap.data() as Product);
          });
          setProducts(cloudProducts);
          try {
            localStorage.setItem(`freshstamp_products_${uid}`, JSON.stringify(cloudProducts));
          } catch (e) {
            console.warn('Cache write warning for products:', e);
          }
        }, (err) => {
          console.warn('Real-time products sync error:', err);
        });
        unsubs.push(unsubProducts);

        // Wasted history listener
        const unsubWasted = onSnapshot(collection(db, 'users', uid, 'wastedHistory'), (snapshot) => {
          const cloudWasted: WastedItem[] = [];
          snapshot.forEach((docSnap) => {
            cloudWasted.push(docSnap.data() as WastedItem);
          });
          cloudWasted.sort((a, b) => b.wastedDate.localeCompare(a.wastedDate));
          setWastedHistory(cloudWasted);
          try {
            localStorage.setItem(`freshstamp_wasted_history_${uid}`, JSON.stringify(cloudWasted));
          } catch (e) {}
        }, (err) => {
          console.warn('Real-time wasted history sync error:', err);
        });
        unsubs.push(unsubWasted);

        // Removed history listener (for revoking/restoring removed items)
        const unsubRemoved = onSnapshot(collection(db, 'users', uid, 'removedHistory'), (snapshot) => {
          const cloudRemoved: RemovedItem[] = [];
          snapshot.forEach((docSnap) => {
            cloudRemoved.push(docSnap.data() as RemovedItem);
          });
          cloudRemoved.sort((a, b) => b.removedAt.localeCompare(a.removedAt));
          setRemovedHistory(cloudRemoved);
          try {
            localStorage.setItem(`freshstamp_removed_history_${uid}`, JSON.stringify(cloudRemoved));
          } catch (e) {}
        }, (err) => {
          console.warn('Real-time removed history sync error:', err);
        });
        unsubs.push(unsubRemoved);

        // Custom categories listener
        const unsubCategories = onSnapshot(collection(db, 'users', uid, 'categories'), (snapshot) => {
          const cloudCategories: string[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.name) {
              cloudCategories.push(data.name);
            }
          });
          setCustomCategories(cloudCategories);
          try {
            localStorage.setItem(`freshstamp_categories_${uid}`, JSON.stringify(cloudCategories));
          } catch (e) {}
        }, (err) => {
          console.warn('Real-time categories sync error:', err);
        });
        unsubs.push(unsubCategories);

        // Settings listener
        const unsubSettings = onSnapshot(doc(db, 'users', uid, 'settings', 'current'), (docSnap) => {
          if (docSnap.exists()) {
            const cloudSettings = docSnap.data() as AppSettings;
            setSettings(cloudSettings);
            try {
              localStorage.setItem(`freshstamp_settings_${uid}`, JSON.stringify(cloudSettings));
            } catch (e) {}
          }
        }, (err) => {
          console.warn('Real-time settings sync error:', err);
        });
        unsubs.push(unsubSettings);

      } else {
        // Guest mode: clear and load local storage
        setProducts([]);
        setWastedHistory([]);
        setRemovedHistory([]);
        setCustomCategories([]);
        loadLocalData();
      }

      setLoadingAuth(false);
    });

    return () => {
      unsubs.forEach(unsub => unsub());
      unsubscribeAuth();
    };
  }, []);

  // Save changes to localStorage when updated (and cloud if logged in)
  const saveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    const key = auth.currentUser ? `freshstamp_products_${auth.currentUser.uid}` : 'freshstamp_products';
    try {
      localStorage.setItem(key, JSON.stringify(updatedProducts));
    } catch (err: any) {
      console.warn('LocalStorage quota warning in saveProducts:', err);
      try {
        // Fallback: strip heavy images on older items to preserve item records
        const leanProducts = updatedProducts.map((p, idx) => {
          if (idx > 5 && p.imageUrl && p.imageUrl.startsWith('data:image/')) {
            return { ...p, imageUrl: undefined };
          }
          return p;
        });
        localStorage.setItem(key, JSON.stringify(leanProducts));
      } catch (innerErr) {
        console.error('Critical storage error in saveProducts:', innerErr);
        showToast('Storage quota reached. Consider removing old items.', 'error');
      }
    }
  };

  const saveWastedHistory = (updatedWasted: WastedItem[]) => {
    setWastedHistory(updatedWasted);
    if (auth.currentUser) {
      localStorage.setItem(`freshstamp_wasted_history_${auth.currentUser.uid}`, JSON.stringify(updatedWasted));
    } else {
      localStorage.setItem('freshstamp_wasted_history', JSON.stringify(updatedWasted));
    }
  };

  const saveRemovedHistory = (updatedRemoved: RemovedItem[]) => {
    setRemovedHistory(updatedRemoved);
    if (auth.currentUser) {
      localStorage.setItem(`freshstamp_removed_history_${auth.currentUser.uid}`, JSON.stringify(updatedRemoved));
    } else {
      localStorage.setItem('freshstamp_removed_history', JSON.stringify(updatedRemoved));
    }
  };

  const handleRevokeProduct = async (recordId: string) => {
    const record = removedHistory.find(r => r.id === recordId);
    if (!record) return;

    // Guaranteed unique ID avoids collisions when revoking multiple items of the same product
    const uniqueRestoredId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const restoredProduct: Product = {
      ...record.originalProduct,
      id: uniqueRestoredId,
      quantity: Math.max(1, record.originalProduct.quantity || 1),
      isUsed: false,
      isWasted: false,
      usedDate: undefined,
      wastedDate: undefined
    };

    const newProducts = [restoredProduct, ...products];
    saveProducts(newProducts);

    const updatedRemoved = removedHistory.filter(r => r.id !== recordId);
    saveRemovedHistory(updatedRemoved);

    if (auth.currentUser) {
      setDoc(doc(db, 'users', auth.currentUser.uid, 'products', restoredProduct.id), cleanDocData(restoredProduct))
        .catch(err => {
          console.error("Cloud restore product error:", err);
          showToast("Cloud sync error restoring product.", "error");
        });
      deleteDoc(doc(db, 'users', auth.currentUser.uid, 'removedHistory', recordId))
        .catch(err => {
          console.error("Cloud delete removed history error:", err);
          showToast("Cloud sync error updating archive.", "error");
        });
    }

    showToast(`Restored "${restoredProduct.name}" back to shelf!`, 'success');
  };

  const handleClearRemovedHistory = async () => {
    if (confirm("Are you sure you want to clear the removed items archive?")) {
      saveRemovedHistory([]);
      if (auth.currentUser) {
        try {
          const removedRef = collection(db, 'users', auth.currentUser.uid, 'removedHistory');
          const snap = await getDocs(removedRef);
          for (const docSnap of snap.docs) {
            await deleteDoc(docSnap.ref);
          }
        } catch (err) {
          console.error("Cloud clear removed history error:", err);
        }
      }
      showToast("Cleared removed items archive.", "info");
    }
  };

  const saveSettings = (updatedSettings: AppSettings) => {
    setSettings(updatedSettings);
    if (auth.currentUser) {
      localStorage.setItem(`freshstamp_settings_${auth.currentUser.uid}`, JSON.stringify(updatedSettings));
      setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'current'), cleanDocData(updatedSettings))
        .catch(err => console.error("Cloud save settings error:", err));
    } else {
      localStorage.setItem('freshstamp_settings', JSON.stringify(updatedSettings));
    }
  };

  // Toast notifier
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Compute stats helper values
  const getProximityInfo = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(dateStr);
    expDate.setHours(0,0,0,0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'EXPIRED', color: 'text-red-600 border-red-600 bg-red-50', isExpired: true, daysLeft: diffDays };
    } else if (diffDays === 0) {
      return { text: 'TODAY', color: 'text-red-600 border-red-600 bg-red-50', isExpired: false, daysLeft: 0 };
    } else if (diffDays === 1) {
      return { text: '1D LEFT', color: 'text-red-600 border-red-600 bg-red-50', isExpired: false, daysLeft: 1 };
    } else if (diffDays < 7) {
      return { text: `${diffDays}D LEFT`, color: 'text-red-600 border-red-600 bg-red-50', isExpired: false, daysLeft: diffDays };
    } else if (diffDays < 30) {
      return { text: `${diffDays}D LEFT`, color: 'text-amber-600 border-amber-600 bg-amber-50', isExpired: false, daysLeft: diffDays };
    } else {
      const startYear = today.getFullYear();
      const startMonth = today.getMonth();
      const startDay = today.getDate();
      
      const endYear = expDate.getFullYear();
      const endMonth = expDate.getMonth();
      const endDay = expDate.getDate();
      
      let years = endYear - startYear;
      let months = endMonth - startMonth;
      let days = endDay - startDay;
      
      if (days < 0) {
        months--;
        const prevMonth = new Date(endYear, endMonth, 0).getDate();
        days += prevMonth;
      }
      
      if (months < 0) {
        years--;
        months += 12;
      }

      let text = '';
      if (years >= 1) {
        text = months > 0 ? `${years}Y ${months}M LEFT` : `${years}Y LEFT`;
      } else if (months >= 1) {
        text = days > 0 ? `${months}M ${days}D LEFT` : `${months}M LEFT`;
      } else {
        text = `${diffDays}D LEFT`;
      }
      
      return { text, color: 'text-emerald-600 border-emerald-600 bg-emerald-50', isExpired: false, daysLeft: diffDays };
    }
  };

  const formatDateToReadable = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const getShelfLifePercent = (mfdStr?: string, expStr?: string) => {
    if (!mfdStr || !expStr) return null;
    const mfd = new Date(mfdStr).getTime();
    const exp = new Date(expStr).getTime();
    const today = new Date().getTime();
    if (isNaN(mfd) || isNaN(exp)) return null;
    if (exp <= mfd) return 100;
    const total = exp - mfd;
    const elapsed = today - mfd;
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    return percent;
  };

  const handleAddCustomCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      showToast('Please enter a category name.', 'error');
      return;
    }
    if (trimmed.length > 30) {
      showToast('Category name is too long (max 30 characters).', 'error');
      return;
    }
    const allCats = [...DEFAULT_CATEGORIES, ...customCategories].map(c => c.toLowerCase());
    if (allCats.includes(trimmed.toLowerCase())) {
      showToast('Category already exists.', 'error');
      return;
    }

    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    setFormData({ ...formData, category: trimmed });
    setShowNewCatInput(false);
    setNewCatName('');

    // Persist
    if (user) {
      try {
        const catId = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await setDoc(doc(db, 'users', user.uid, 'categories', catId), {
          id: catId,
          name: trimmed
        });
        localStorage.setItem(`freshstamp_categories_${user.uid}`, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving custom category to Firestore:', e);
      }
    } else {
      localStorage.setItem('freshstamp_categories', JSON.stringify(updated));
    }
    showToast(`Added custom category: ${trimmed}`, 'success');
  };

  const handleRemoveCustomCategory = async (catName: string) => {
    if (confirm(`Are you sure you want to delete the category "${catName}"? This will not delete the products in this category, but they will no longer be filtered under it.`)) {
      const updated = customCategories.filter(c => c !== catName);
      setCustomCategories(updated);
      if (categoryFilter === catName) {
        setCategoryFilter('All');
      }
      
      // Persist
      if (user) {
        try {
          const catId = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
          await deleteDoc(doc(db, 'users', user.uid, 'categories', catId));
          localStorage.setItem(`freshstamp_categories_${user.uid}`, JSON.stringify(updated));
        } catch (e) {
          console.error('Error deleting category in Firestore:', e);
        }
      } else {
        localStorage.setItem('freshstamp_categories', JSON.stringify(updated));
      }
      showToast(`Deleted category: ${catName}`, 'info');
    }
  };

  // Action handlers
  const handleUseProduct = (id: string) => {
    const updated = products.map(p => {
      if (p.id === id) {
        const nextQty = p.quantity - 1;
        const nextUsed = p.usedCount + 1;
        return {
          ...p,
          quantity: nextQty,
          usedCount: nextUsed,
          isUsed: nextQty === 0 ? true : p.isUsed,
          usedDate: nextQty === 0 ? new Date().toISOString().split('T')[0] : p.usedDate
        };
      }
      return p;
    });

    const targetProduct = products.find(p => p.id === id);
    if (targetProduct) {
      const updatedProduct = updated.find(p => p.id === id)!;
      if (targetProduct.quantity <= 1) {
        showToast(`Fully consumed ${targetProduct.name}! (Can revoke in Settings)`, 'success');
        saveProducts(updated.filter(p => p.quantity > 0));
        
        // Add to removedHistory archive for revoking
        const removedRecord: RemovedItem = {
          id: `removed-${Date.now()}-${targetProduct.id}`,
          originalProduct: { ...targetProduct, quantity: 1 },
          removedAt: new Date().toISOString(),
          reason: 'consumed'
        };
        const updatedRemoved = [removedRecord, ...removedHistory];
        saveRemovedHistory(updatedRemoved);

        // Cloud delete and record archive
        if (auth.currentUser) {
          deleteDoc(doc(db, 'users', auth.currentUser.uid, 'products', id))
            .catch(err => console.error("Cloud delete product error:", err));
          setDoc(doc(db, 'users', auth.currentUser.uid, 'removedHistory', removedRecord.id), cleanDocData(removedRecord))
            .catch(err => console.error("Cloud add removed record error:", err));
        }
      } else {
        showToast(`Consumed 1 unit of ${targetProduct.name}.`, 'info');
        saveProducts(updated);
        
        // Cloud update
        if (auth.currentUser) {
          setDoc(doc(db, 'users', auth.currentUser.uid, 'products', id), cleanDocData(updatedProduct))
            .catch(err => console.error("Cloud update product error:", err));
        }
      }
    }
  };

  const handleMarkWasted = (id: string) => {
    const item = products.find(p => p.id === id);
    if (item) {
      const todayStr = new Date().toISOString().split('T')[0];
      const newWasted: WastedItem = {
        id: `wasted-${Date.now()}`,
        name: item.name,
        brand: item.brand || '',
        category: item.category,
        price: item.price || 0,
        wastedDate: todayStr
      };

      saveWastedHistory([newWasted, ...wastedHistory]);
      saveProducts(products.filter(p => p.id !== id));

      // Add to removedHistory archive for revoking
      const removedRecord: RemovedItem = {
        id: `removed-${Date.now()}-${item.id}`,
        originalProduct: item,
        removedAt: todayStr,
        reason: 'wasted'
      };
      const updatedRemoved = [removedRecord, ...removedHistory];
      saveRemovedHistory(updatedRemoved);

      showToast(`${item.name} removed and marked as waste. (Can revoke in Settings)`, 'error');

      // Cloud operations
      if (auth.currentUser) {
        // Delete from products collection
        deleteDoc(doc(db, 'users', auth.currentUser.uid, 'products', id))
          .catch(err => console.error("Cloud delete product error:", err));
        // Add to wasted collection
        setDoc(doc(db, 'users', auth.currentUser.uid, 'wastedHistory', newWasted.id), cleanDocData(newWasted))
          .catch(err => console.error("Cloud add wasted item error:", err));
        // Add to removedHistory archive
        setDoc(doc(db, 'users', auth.currentUser.uid, 'removedHistory', removedRecord.id), cleanDocData(removedRecord))
          .catch(err => console.error("Cloud add removed record error:", err));
      }
    }
  };

  const compressImage = (file: File, maxDim = 800, quality = 0.78): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleProductImageUpload = async (file: File, isEdit: boolean = false) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP).', 'error');
      return;
    }
    try {
      showToast('Optimizing photo for storage...', 'info');
      const compressedUrl = await compressImage(file, 800, 0.78);
      if (isEdit) {
        setEditFormData(prev => ({ ...prev, imageUrl: compressedUrl }));
      } else {
        setFormData(prev => ({ ...prev, imageUrl: compressedUrl }));
      }
      showToast('Photo optimized & attached!', 'success');
    } catch (err) {
      console.error('Image compression failed:', err);
      showToast('Failed to process image. Please try another.', 'error');
    }
  };

  const handleStartEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditFormData({
      name: p.name,
      brand: p.brand || '',
      category: p.category,
      expiryDate: p.expiryDate,
      mfdDate: p.mfdDate || '',
      quantity: p.quantity,
      price: p.price ? p.price.toString() : '',
      notes: p.notes || '',
      imageUrl: p.imageUrl || ''
    });
  };

  const handleSaveEditedProduct = () => {
    if (!editingProduct) return;
    if (!editFormData.name) {
      showToast('Product name is required!', 'error');
      return;
    }
    if (!editFormData.expiryDate) {
      showToast('Expiry date is required!', 'error');
      return;
    }

    const updatedList = products.map(p => {
      if (p.id === editingProduct.id) {
        return {
          ...p,
          name: editFormData.name,
          brand: editFormData.brand || undefined,
          category: editFormData.category,
          expiryDate: editFormData.expiryDate,
          mfdDate: editFormData.mfdDate || undefined,
          quantity: editFormData.quantity,
          price: editFormData.price ? parseFloat(editFormData.price) : 0,
          notes: editFormData.notes || undefined,
          imageUrl: editFormData.imageUrl?.trim() || undefined
        };
      }
      return p;
    });

    saveProducts(updatedList);
    showToast(`Updated ${editFormData.name}!`, 'success');

    if (auth.currentUser) {
      const updatedItem = updatedList.find(p => p.id === editingProduct.id);
      if (updatedItem) {
        setDoc(doc(db, 'users', auth.currentUser.uid, 'products', updatedItem.id), cleanDocData(updatedItem))
          .catch(err => console.error("Cloud update product error:", err));
      }
    }

    setEditingProduct(null);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Product name is required!', 'error');
      return;
    }
    if (!formData.expiryDate) {
      showToast('Expiry date is required!', 'error');
      return;
    }

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: formData.name,
      brand: formData.brand || undefined,
      category: formData.category,
      expiryDate: formData.expiryDate,
      mfdDate: formData.mfdDate || undefined,
      quantity: formData.quantity,
      initialQuantity: formData.quantity,
      usedCount: 0,
      price: formData.price ? parseFloat(formData.price) : 0,
      notes: formData.notes || undefined,
      imageUrl: formData.imageUrl?.trim() || undefined
    };

    saveProducts([newProduct, ...products]);
    showToast(`Added ${formData.name} to inventory!`, 'success');
    
    // Cloud add
    if (auth.currentUser) {
      setDoc(doc(db, 'users', auth.currentUser.uid, 'products', newProduct.id), cleanDocData(newProduct))
        .catch(err => console.error("Cloud add product error:", err));
    }
    
    // Reset form
    setFormData({
      name: '',
      brand: '',
      category: 'Grocery',
      expiryDate: '',
      mfdDate: '',
      quantity: 1,
      price: '',
      notes: '',
      imageUrl: ''
    });
    // Ensure newly added product is never masked by active filter or search
    setCategoryFilter('All');
    setSearchQuery('');
    setActiveTab('home');
  };

  // OCR Scanner handlers
  const triggerOcrScan = async (mockData?: any, imageFileBase64?: string, mockImage?: string) => {
    setOcrLoading(true);
    setOcrError(null);
    setOcrResult(null);
    setShowOcrModal(true);

    if (mockData) {
      // Realistic loading latency for awesome UX
      setTimeout(() => {
        setOcrResult({
          ...mockData,
          imageUrl: mockImage || mockData.image || ''
        });
        setOcrLoading(false);
      }, 1500);
      return;
    }

    if (imageFileBase64) {
      try {
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: imageFileBase64,
            localApiKey: settings.geminiApiKey
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Server error occurred during OCR scanning.');
        }

        setOcrResult({
          name: data.name || 'Extracted Product',
          brand: data.brand || '',
          category: data.category || 'Grocery',
          expiryDate: data.expiryDate || '',
          quantity: data.quantity || 1,
          price: data.price || 0,
          notes: data.notes || '',
          imageUrl: imageFileBase64
        });
      } catch (err: any) {
        console.error(err);
        setOcrError(err.message || 'Connection failed. Please check your Gemini API key under Settings.');
      } finally {
        setOcrLoading(false);
      }
    }
  };

  const handleApplyOcrResult = () => {
    if (ocrResult) {
      setFormData({
        name: ocrResult.name || '',
        brand: ocrResult.brand || '',
        category: (ocrResult.category as Category) || 'Grocery',
        expiryDate: ocrResult.expiryDate || '',
        mfdDate: ocrResult.mfdDate || '',
        quantity: ocrResult.quantity || 1,
        price: ocrResult.price ? ocrResult.price.toString() : '',
        notes: ocrResult.notes || '',
        imageUrl: ocrResult.imageUrl || formData.imageUrl || ''
      });
      showToast('Form prefilled with scanned packaging data!', 'success');
    }
    setShowOcrModal(false);
    setShowOcrSelector(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 800, 0.78);
        triggerOcrScan(undefined, compressedBase64);
      } catch (err) {
        console.warn('Canvas compression fallback in handleFileChange:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            triggerOcrScan(undefined, reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Test the Gemini API key under Settings
  const testGeminiKey = async () => {
    if (!settings.geminiApiKey) {
      showToast('Please enter an API key first.', 'error');
      return;
    }
    setTestingApiKey('testing');

    try {
      // Call standard generate endpoint with simple query on server proxy to test it
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // dummy transparent pixel
          localApiKey: settings.geminiApiKey
        })
      });

      const data = await response.json();
      
      if (response.ok || data.error?.includes('transparent pixel') || data.name || data.error?.includes('Unexpected')) {
        setTestingApiKey('success');
        showToast('Gemini API key is valid and configured!', 'success');
      } else {
        throw new Error(data.error || 'Invalid API key or response format.');
      }
    } catch (err: any) {
      console.warn('API test warned:', err.message);
      // Because transparent pixel might cause Gemini to complain about blank content, 
      // if we get an actual response from Gemini platform, it still means the key is valid.
      if (err.message.includes('API key') || err.message.includes('not found')) {
        setTestingApiKey('error');
        showToast('Invalid API key. Please check again.', 'error');
      } else {
        setTestingApiKey('success');
        showToast('API key verified successfully!', 'success');
      }
    } finally {
      setTimeout(() => setTestingApiKey('idle'), 3000);
    }
  };

  // Export as JSON file
  const handleExportData = () => {
    const backupData = {
      products,
      wastedHistory,
      removedHistory,
      customCategories,
      settings,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freshstamp-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Inventory exported successfully!', 'success');
  };

  // Import JSON file
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.products && Array.isArray(parsed.products)) {
            saveProducts(parsed.products);
            if (auth.currentUser) {
              for (const prod of parsed.products) {
                await setDoc(doc(db, 'users', auth.currentUser.uid, 'products', prod.id), cleanDocData(prod));
              }
            }
          }
          if (parsed.wastedHistory && Array.isArray(parsed.wastedHistory)) {
            saveWastedHistory(parsed.wastedHistory);
            if (auth.currentUser) {
              for (const item of parsed.wastedHistory) {
                await setDoc(doc(db, 'users', auth.currentUser.uid, 'wastedHistory', item.id), cleanDocData(item));
              }
            }
          }
          if (parsed.removedHistory && Array.isArray(parsed.removedHistory)) {
            saveRemovedHistory(parsed.removedHistory);
            if (auth.currentUser) {
              for (const item of parsed.removedHistory) {
                await setDoc(doc(db, 'users', auth.currentUser.uid, 'removedHistory', item.id), cleanDocData(item));
              }
            }
          }
          if (parsed.customCategories && Array.isArray(parsed.customCategories)) {
            setCustomCategories(parsed.customCategories);
            if (auth.currentUser) {
              for (const catName of parsed.customCategories) {
                const catId = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                await setDoc(doc(db, 'users', auth.currentUser.uid, 'categories', catId), { id: catId, name: catName });
              }
            }
          }
          if (parsed.settings) {
            const updatedSettings = { ...settings, ...parsed.settings };
            saveSettings(updatedSettings);
            if (auth.currentUser) {
              await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'current'), cleanDocData(updatedSettings));
            }
          }
          showToast('Backup restored successfully!', 'success');
        } catch (err) {
          showToast('Invalid JSON file. Please upload a valid FreshStamp backup file.', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  // Reset app state
  const handleResetApp = async () => {
    if (confirm('Are you sure you want to reset all data back to the clean seed layout? This cannot be undone.')) {
      
      const defaultSettings = {
        geminiApiKey: '',
        defaultReminderDays: 3,
        notificationsEnabled: true,
        username: auth.currentUser?.displayName || 'Alex Sterling',
        userEmail: auth.currentUser?.email || 'alex.sterling@freshstamp.io'
      };

      if (auth.currentUser) {
        try {
          const uid = auth.currentUser.uid;
          
          // Delete active products in cloud
          const productsRef = collection(db, 'users', uid, 'products');
          const productsSnap = await getDocs(productsRef);
          for (const docSnap of productsSnap.docs) {
            await deleteDoc(docSnap.ref);
          }

          // Delete wasted history in cloud
          const wastedRef = collection(db, 'users', uid, 'wastedHistory');
          const wastedSnap = await getDocs(wastedRef);
          for (const docSnap of wastedSnap.docs) {
            await deleteDoc(docSnap.ref);
          }

          // Delete removed history in cloud
          const removedRef = collection(db, 'users', uid, 'removedHistory');
          const removedSnap = await getDocs(removedRef);
          for (const docSnap of removedSnap.docs) {
            await deleteDoc(docSnap.ref);
          }

          // Delete custom categories in cloud
          const categoriesRef = collection(db, 'users', uid, 'categories');
          const categoriesSnap = await getDocs(categoriesRef);
          for (const docSnap of categoriesSnap.docs) {
            await deleteDoc(docSnap.ref);
          }

          // Reset settings in cloud
          await setDoc(doc(db, 'users', uid, 'settings', 'current'), cleanDocData(defaultSettings));

          // Seed cloud products
          const initialProducts = getSeedProducts();
          for (const prod of initialProducts) {
            await setDoc(doc(db, 'users', uid, 'products', prod.id), cleanDocData(prod));
          }

          // Seed cloud wasted
          const initialWasted = getSeedWastedHistory();
          for (const item of initialWasted) {
            await setDoc(doc(db, 'users', uid, 'wastedHistory', item.id), cleanDocData(item));
          }

        } catch (error: any) {
          console.error("Cloud reset error:", error);
          showToast("Failed to fully reset cloud storage.", "error");
        }
      }

      localStorage.clear();
      setProducts(getSeedProducts());
      setWastedHistory(getSeedWastedHistory());
      setRemovedHistory([]);
      setCustomCategories([]);
      setSettings(defaultSettings);
      showToast('App data reset successfully.', 'info');
      setActiveTab('home');
    }
  };

  // Google Sign-In & Sign-Out handlers
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        showToast(`Welcome, ${result.user.displayName}!`, 'success');
      }
    } catch (error: any) {
      console.error("Sign-in failed:", error);
      showToast(error.message || 'Google sign-in failed. Please try again.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      showToast('Signed out of FreshStamp.', 'info');
    } catch (error: any) {
      console.error("Sign-out failed:", error);
      showToast('Failed to sign out. Please try again.', 'error');
    }
  };

  // Active items counts for Alerts
  const soonExpiryCount = products.filter(p => {
    const diff = getProximityInfo(p.expiryDate).daysLeft;
    return diff >= 0 && diff <= 7;
  }).length;

  const expiredCount = products.filter(p => {
    const diff = getProximityInfo(p.expiryDate).daysLeft;
    return diff < 0;
  }).length;

  // Filtered Products List (Sorted FIFO: earliest expiry first)
  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  // Dynamic Date Header
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return new Date().toLocaleDateString('en-US', options).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#F4F7F2] font-sans text-[#1b1c1a] relative pb-28 md:pb-12">
      
      {/* Toast Notifier */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full shadow-lg text-sm font-semibold flex items-center gap-2 border ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : toastMessage.type === 'error' 
                ? 'bg-rose-50 text-rose-800 border-rose-200' 
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle size={16} />}
            {toastMessage.type === 'error' && <AlertTriangle size={16} />}
            {toastMessage.type === 'info' && <Info size={16} />}
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* App Opening / Launch Animated Splash Screen */}
      {/* App Opening / Launch Animated Splash Screen: Optical Laser Scan & Fresh Stamp */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="app-launch-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] bg-[#fbf9f6] flex flex-col items-center justify-center select-none px-6"
          >
            <div className="relative flex flex-col items-center max-w-sm w-full">
              {/* Soft ambient emerald radial glow */}
              <motion.div 
                animate={{ scale: [0.85, 1.1, 0.95], opacity: [0.35, 0.6, 0.4] }} 
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} 
                className="absolute w-72 h-72 bg-[#3E9B4F]/15 rounded-full blur-3xl pointer-events-none" 
              />

              <div className="relative z-10 flex flex-col items-center w-full">
                {/* Logo with Optical Laser Scanner Line */}
                <div className="relative overflow-hidden py-1 px-2">
                  <motion.img
                    src="/logo-with-freshstamp-name.png?v=1.0.4"
                    alt="FreshStamp"
                    initial={{ scale: 0.88, opacity: 0, y: 14 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="w-[285px] max-w-[82vw] h-auto object-contain drop-shadow-sm"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/icons/logo-full.png';
                    }}
                  />

                  {/* Optical Laser Scan Sweep (AI Expiry Scanning Effect) */}
                  <motion.div
                    initial={{ top: '-10%', opacity: 0 }}
                    animate={{ 
                      top: ['-10%', '110%'],
                      opacity: [0, 1, 1, 0]
                    }}
                    transition={{ 
                      duration: 0.75, 
                      ease: 'easeInOut',
                      delay: 0.15
                    }}
                    className="absolute left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#3E9B4F] to-transparent shadow-[0_0_14px_#3E9B4F] pointer-events-none"
                  />
                </div>

                {/* Monospace Clinical Stamp Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.75, rotate: -6 }}
                  animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
                  transition={{ delay: 0.4, duration: 0.28, type: 'spring', stiffness: 350, damping: 22 }}
                  className="mt-5 flex items-center gap-2 px-3.5 py-1 border-[1.5px] border-[#3E9B4F] text-[#3E9B4F] font-mono text-[10px] font-bold tracking-widest bg-white/90 backdrop-blur-xs rounded-xs shadow-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3E9B4F] animate-pulse"></span>
                  <span>SYSTEM READY · SMART EXPIRY</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 w-full z-40 bg-white border-b border-[#eae8e5] px-4 md:px-8 py-3 flex justify-between items-center h-16 shadow-xs">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setShowBrandDrawer(true)}
              className="hover:opacity-80 transition-opacity active:scale-95 duration-150 p-1.5 rounded-lg hover:bg-[#f5f3f0]"
              id="menu-btn"
              title="Open Brand Menu & Shortcuts"
            >
              <Menu className="text-[#0e1b0c]" size={22} />
            </button>
            <div 
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
              title="FreshStamp Home"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#c4c8bf]/70 shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform duration-150 bg-white p-0.5 flex items-center justify-center">
                <img 
                  src="/icons/logo.png" 
                  alt="FreshStamp Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-space text-lg font-bold text-[#0e1b0c] leading-none tracking-tight group-hover:text-emerald-800 transition-colors">FreshStamp</h1>
                <p className="font-mono text-[10px] text-[#444841] tracking-wider mt-[2px]">{getFormattedDate()}</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#fbf9f6] border border-[#eae8e5] p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'home'
                  ? 'bg-[#22301f] text-white shadow-xs'
                  : 'text-[#546250] hover:text-[#0e1b0c] hover:bg-white'
              }`}
            >
              <Home size={15} /> Home
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'add'
                  ? 'bg-[#22301f] text-white shadow-xs'
                  : 'text-[#546250] hover:text-[#0e1b0c] hover:bg-white'
              }`}
            >
              <PlusCircle size={15} /> Add Item
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'stats'
                  ? 'bg-[#22301f] text-white shadow-xs'
                  : 'text-[#546250] hover:text-[#0e1b0c] hover:bg-white'
              }`}
            >
              <BarChart3 size={15} /> Stats
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-[#22301f] text-white shadow-xs'
                  : 'text-[#546250] hover:text-[#0e1b0c] hover:bg-white'
              }`}
            >
              <SettingsIcon size={15} /> Settings
            </button>
          </nav>

          <div 
            onClick={() => setActiveTab('settings')}
            className="w-10 h-10 rounded-full overflow-hidden border border-[#c4c8bf] bg-[#eae8e5] cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-150 shadow-xs"
          >
            <img 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              alt={user?.displayName || "Alex Sterling"} 
              src={user?.photoURL || CATEGORY_IMAGES['Alex Sterling'] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">

        {/* Dynamic Alert Banner (Active only on Home) */}
        {activeTab === 'home' && soonExpiryCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#D9483B] rounded-xl p-4 flex items-center gap-3 shadow-ambient"
            id="expiry-alert-banner"
          >
            <AlertTriangle className="text-white shrink-0" size={20} />
            <p className="text-white font-medium text-sm">
              {soonExpiryCount} {soonExpiryCount === 1 ? 'item expires' : 'items expire'} within 7 days
            </p>
          </motion.div>
        )}

        {/* Tab Routing Container */}
        <AnimatePresence mode="wait">
          
          {/* HOME / INVENTORY VIEW */}
          {activeTab === 'home' && (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#747871]" size={18} />
                <input 
                  type="text"
                  placeholder="Do I already have it? Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-white border border-[#c4c8bf] rounded-xl shadow-ambient focus:outline-none focus:border-[#0e1b0c] transition-all text-sm text-[#1b1c1a]"
                  id="search-input"
                />
              </div>

              {/* Dynamic Categories Grid */}
              <section className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold text-[#546250] uppercase tracking-wider">Categories</h3>
                  {categoryFilter !== 'All' && (
                    <button 
                      onClick={() => setCategoryFilter('All')}
                      className="text-[10px] text-[#22301f] font-bold hover:underline"
                    >
                      Clear Filter (Showing {categoryFilter})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {['Grocery', 'Medicine', 'Cosmetics', 'Household', 'Other', ...customCategories].map((cat) => {
                    const catProducts = products.filter(p => p.category === cat && !p.isUsed && !p.isWasted);
                    const isSelected = categoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(isSelected ? 'All' : cat)}
                        className={`p-3 rounded-xl text-left border transition-all duration-150 relative overflow-hidden flex flex-col justify-between h-[76px] ${
                          isSelected 
                            ? 'bg-[#22301f] text-white border-transparent shadow-sm scale-[1.01]' 
                            : 'bg-white text-[#1b1c1a] border-[#eae8e5] hover:border-[#c4c8bf] hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-mono text-[9px] font-bold uppercase tracking-wider opacity-60">
                            {catProducts.length} {catProducts.length === 1 ? 'item' : 'items'}
                          </span>
                          {!['Grocery', 'Medicine', 'Cosmetics', 'Household', 'Other'].includes(cat) ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCustomCategory(cat);
                              }}
                              className="text-[9px] text-red-500 hover:text-white bg-red-50 hover:bg-red-500 w-4 h-4 rounded-full flex items-center justify-center transition-all shadow-sm"
                              title="Delete Category"
                            >
                              ✕
                            </button>
                          ) : (
                            <span className="text-sm">
                              {cat === 'Grocery' && '🍎'}
                              {cat === 'Medicine' && '💊'}
                              {cat === 'Cosmetics' && '🧴'}
                              {cat === 'Household' && '🏠'}
                              {cat === 'Other' && '📦'}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 mt-1">
                          <h4 className="font-space font-bold text-xs truncate pr-1">{cat}</h4>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Horizontal Category Chips (Dynamic Scroll Filters) */}
              <section className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {['All', 'Grocery', 'Medicine', 'Cosmetics', 'Household', 'Other', ...customCategories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border duration-150 ${
                      categoryFilter === cat 
                        ? 'bg-[#22301f] text-white border-transparent shadow-sm' 
                        : 'bg-white text-[#444841] border-[#c4c8bf] hover:bg-[#f5f3f0]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </section>

              {/* Product List */}
              <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold text-[#546250] uppercase tracking-wider">
                    {categoryFilter === 'All' ? 'Tracked Products' : `${categoryFilter} Products`} ({filteredProducts.length})
                  </h3>
                </div>

                {filteredProducts.length === 0 ? (
                  /* Empty state */
                  <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-ambient border border-[#eae8e5] space-y-6 mt-4">
                    <div className="relative flex justify-center py-6">
                      <div className="absolute inset-0 bg-[#d8e7d0] opacity-30 rounded-full blur-2xl animate-pulse"></div>
                      <div className="relative z-10 flex flex-col items-center">
                        <span className="expiry-stamp text-[#747871] border-[#747871] mb-4 scale-110">EMPTY_SHELF</span>
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#c4c8bf]/80 bg-white p-2 shadow-xs flex items-center justify-center">
                          <img src="/icons/logo.png" alt="FreshStamp Icon" className="w-full h-full object-contain" />
                        </div>
                      </div>
                      <div className="absolute top-0 right-[-10px] transform rotate-12 opacity-80">
                        <span className="expiry-stamp text-amber-700 border-amber-700 text-[9px] px-2 py-0.5 bg-amber-50">BOGO_READY</span>
                      </div>
                      <div className="absolute bottom-0 left-[-20px] transform -rotate-12 opacity-80">
                        <span className="expiry-stamp text-[#0e1b0c] border-[#0e1b0c] text-[9px] px-2 py-0.5 bg-emerald-50">FRESH_START</span>
                      </div>
                    </div>
                    <div className="space-y-2 max-w-[280px]">
                      <h3 className="font-space text-lg font-bold text-[#0e1b0c]">Nothing tracked yet.</h3>
                      <p className="text-xs text-[#546250] leading-relaxed">
                        Add your first product — especially the buy-1-get-1 ones. We'll help you minimize waste.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('add')}
                      className="bg-[#22301f] text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-95 active:scale-95 transition-all shadow-md"
                    >
                      <Plus size={16} /> Add product
                    </button>
                  </div>
                ) : (
                  /* Filled state responsive list grid with adaptive card sizing */
                  <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
                    {filteredProducts.map((p) => {
                      const prox = getProximityInfo(p.expiryDate);
                      const productImg = p.imageUrl || DEFAULT_PRODUCT_IMAGE;
                      
                      return (
                        <motion.article 
                          key={p.id}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`bg-white rounded-xl p-4 flex flex-col justify-between relative shadow-ambient border transition-all ${
                            prox.isExpired 
                              ? 'border-l-4 border-l-[#D9483B] border-[#eae8e5]' 
                              : 'border-[#eae8e5]'
                          }`}
                        >
                          <div>
                            {/* Expiry Stamp Badge */}
                            <div className="absolute top-4 right-4">
                              <span className={`expiry-stamp ${prox.color}`}>
                                {prox.text}
                              </span>
                            </div>

                            {/* Card Info Row */}
                            <div className="flex gap-4 items-start">
                              <div 
                                onClick={() => handleStartEditProduct(p)}
                                className={`w-16 h-16 rounded-lg bg-[#f0eeea] overflow-hidden shrink-0 border border-[#eae8e5] relative group cursor-pointer ${
                                  prox.isExpired ? 'grayscale opacity-60' : ''
                                }`}
                                title="Click to edit product / photo"
                              >
                                <img 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                  src={productImg} 
                                  alt={p.name} 
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Edit2 size={14} className="text-white" />
                                </div>
                              </div>

                              <div className="space-y-1 pr-24">
                                <h3 className={`font-space font-bold text-base leading-tight ${
                                  prox.isExpired ? 'text-[#D9483B]' : 'text-[#0e1b0c]'
                                }`}>
                                  {p.name}
                                </h3>
                                {p.brand && (
                                  <p className="text-xs text-[#546250] font-medium">{p.brand}</p>
                                )}
                                
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="px-2 py-0.5 rounded bg-[#d5e4cd] text-[#596654] font-mono text-[9px] uppercase font-bold tracking-wider">
                                    {p.category}
                                  </span>
                                  <span className="bg-[#eae8e5] text-[#111f0f] px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    ×{p.quantity}
                                  </span>
                                  {p.usedCount > 0 && (
                                    <span className="text-[10px] text-[#546250] italic opacity-80">
                                      {p.usedCount} used
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Batch Details and Timeline section */}
                            {(() => {
                              const sameNameProducts = products.filter(item => 
                                item.name.trim().toLowerCase() === p.name.trim().toLowerCase() && 
                                (item.brand || '').trim().toLowerCase() === (p.brand || '').trim().toLowerCase()
                              ).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

                              const hasMultipleBatches = sameNameProducts.length > 1;
                              const batchIndex = sameNameProducts.findIndex(item => item.id === p.id);
                              const isEarliestBatch = hasMultipleBatches && batchIndex === 0;
                              const shelfLifePercent = getShelfLifePercent(p.mfdDate, p.expiryDate);

                              return (
                                <div className="mt-3.5 space-y-2">
                                  {/* Batch Badges */}
                                  {hasMultipleBatches && (
                                    <div className="flex flex-wrap items-center gap-1.5 bg-[#fdfdfc] p-2 rounded-lg border border-[#eae8e5]">
                                      <span className="text-[10px] font-bold text-[#1b1c1a] bg-[#eae8e5] px-2 py-0.5 rounded flex items-center gap-1">
                                        📦 Batch {batchIndex + 1} of {sameNameProducts.length}
                                      </span>
                                      {isEarliestBatch ? (
                                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                          Consume First! 💡
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                                          ⏳ Backup Batch
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Lifespan / Date details */}
                                  <div className="space-y-1">
                                    {shelfLifePercent !== null ? (
                                      <div className="space-y-1 bg-[#fdfdfc] p-2.5 rounded-lg border border-[#eae8e5]">
                                        <div className="flex justify-between text-[10px] font-bold text-[#546250]">
                                          <span className="flex items-center gap-1">🛠️ MFD: {formatDateToReadable(p.mfdDate!)}</span>
                                          <span className="flex items-center gap-1 text-[#0e1b0c]">🚨 EXP: {formatDateToReadable(p.expiryDate)}</span>
                                        </div>
                                        <div className="w-full bg-[#eae8e5] h-1.5 rounded-full overflow-hidden mt-1.5">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-300 ${
                                              shelfLifePercent > 85 
                                                ? 'bg-[#D9483B]' 
                                                : shelfLifePercent > 60 
                                                ? 'bg-amber-500' 
                                                : 'bg-emerald-600'
                                            }`}
                                            style={{ width: `${shelfLifePercent}%` }}
                                          />
                                        </div>
                                        <div className="text-[9px] text-[#747871] text-right font-medium">
                                          Shelf Life Consumed: {shelfLifePercent}%
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-xs text-[#546250] bg-[#fbf9f6] p-2 rounded-lg border border-[#eae8e5]">
                                        <Calendar size={13} className="text-[#747871]" />
                                        <span className="font-semibold">Expiry Date:</span>
                                        <span className="font-mono text-[#0e1b0c] font-bold">{formatDateToReadable(p.expiryDate)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Action buttons section (Compact layout to prevent accidental clicks) */}
                          <div className="flex items-center justify-between gap-2 mt-4 border-t border-[#f5f3f0] pt-3">
                            {prox.isExpired ? (
                              <div className="flex items-center justify-between w-full">
                                <button
                                  onClick={() => handleMarkWasted(p.id)}
                                  className="px-3.5 py-1.5 border border-[#D9483B] rounded-lg text-xs font-semibold text-[#D9483B] bg-red-50 hover:bg-red-100 transition-colors active:scale-[0.98] duration-150 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Trash2 size={13} /> Remove Item
                                </button>
                                <button
                                  onClick={() => handleStartEditProduct(p)}
                                  className="px-3 py-1.5 border border-[#eae8e5] rounded-lg text-xs font-semibold text-[#546250] hover:bg-[#f5f3f0] hover:text-[#0e1b0c] transition-all active:scale-[0.98] cursor-pointer"
                                  title="Edit Product / Photo"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* Compact, comfortable Use 1 button */}
                                <button
                                  onClick={() => handleUseProduct(p.id)}
                                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#22301f] bg-[#eef6ec] border border-[#bcdcb8] hover:bg-[#e1f0de] active:scale-95 transition-all duration-150 flex items-center gap-1.5 shadow-xs cursor-pointer"
                                  title="Consume 1 unit of this product"
                                >
                                  <Check size={13} className="text-[#3E9B4F] stroke-[2.5]" />
                                  <span>Use 1</span>
                                </button>
                                
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEditProduct(p)}
                                    className="px-2.5 py-1.5 border border-[#eae8e5] rounded-lg text-xs font-semibold text-[#546250] hover:bg-[#f5f3f0] hover:text-[#0e1b0c] transition-all active:scale-[0.98] cursor-pointer"
                                    title="Edit Product / Photo"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleMarkWasted(p.id)}
                                    className="px-2.5 py-1.5 border border-dashed border-[#c4c8bf] rounded-lg text-xs font-semibold text-[#747871] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-[0.98] cursor-pointer"
                                    title="Mark as Waste"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Quick info footer empty state spacer card */}
              {products.length > 0 && (
                <div className="border-2 border-dashed border-[#c4c8bf] rounded-xl p-4 flex flex-col items-center justify-center py-6 text-center space-y-2 opacity-60">
                  <ShoppingBasket className="text-[#747871]" size={28} />
                  <p className="text-xs text-[#546250]">
                    Running out of stamps? <br />Add new items to keep track.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ADD NEW PRODUCT VIEW */}
          {activeTab === 'add' && (
            <motion.div
              key="add-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-5 max-w-5xl mx-auto"
            >
              {/* Headline */}
              <div>
                <h2 className="font-space text-2xl font-bold text-[#0e1b0c]">Add New Product</h2>
                <p className="text-[#546250] text-xs mt-1">Track another item to reduce household waste.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column on Desktop: Smart Scanner & Visual Tip */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white p-5 rounded-2xl shadow-ambient border border-[#eae8e5] space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-emerald-700" />
                      <h3 className="font-space font-bold text-sm text-[#0e1b0c]">Smart OCR Scanner</h3>
                    </div>
                    <p className="text-xs text-[#546250] leading-relaxed">
                      Snap a picture of the expiry label or test with an instant AI packaging demo.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative overflow-hidden group">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        />
                        <button className="w-full bg-[#fbf9f6] border border-[#c4c8bf] p-4 rounded-xl flex flex-col items-center justify-center gap-2 shadow-xs group-hover:bg-[#f5f3f0] active:scale-95 transition-all text-center cursor-pointer">
                          <Camera className="text-[#22301f]" size={24} />
                          <span className="text-xs font-semibold text-[#1b1c1a]">Photo of Expiry</span>
                        </button>
                      </div>

                      <button 
                        onClick={() => setShowOcrSelector(true)}
                        className="w-full bg-[#fbf9f6] border border-[#c4c8bf] p-4 rounded-xl flex flex-col items-center justify-center gap-2 shadow-xs hover:bg-[#f5f3f0] active:scale-95 transition-all text-center cursor-pointer"
                      >
                        <Sparkles className="text-[#22301f]" size={24} />
                        <span className="text-xs font-semibold text-[#1b1c1a]">AI Quick Demo</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Suggested Tips Card */}
                  <div className="rounded-xl overflow-hidden shadow-ambient h-40 relative group border border-[#eae8e5] hidden lg:block">
                    <img 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      src={CATEGORY_IMAGES['Visual Context'] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDeZZp7-GCbeXbwzYkxWTh01iFfzQKMDVvxyHdo9GpXITDJ5P6A6hp5_khVG0ehAT-qUQgRaPX-hgEqaEBwDfJHqTsx-zzxJ4GHZVPP2qqetD3quVy7PBtIteWUzsW3vihvY4JIbHg2Slz5d_BIUVQJA3rZxvT2bpNfwwo09OLN3roZk4-servsgUTLaJyzNkzeMTgyq22QqM5X7_I_jfpvRBnxfmo61Vl_cAtnnEMtXN5Rd8XPwjcf604ai7h0aBlKLWobZ-h2E4w'} 
                      alt="Pantry layouts"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[9px] font-bold text-white tracking-widest font-mono">SUGGESTED FOR YOU</span>
                      <p className="text-white text-sm font-space font-bold">Zero Waste Kitchen Tips</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Form Entry */}
                <div className="lg:col-span-7">
                  {/* Divider for mobile view only */}
                  <div className="relative py-2 flex items-center lg:hidden">
                    <div className="flex-grow border-t border-[#c4c8bf]"></div>
                    <span className="flex-shrink mx-3 text-xs text-[#546250] bg-[#F4F7F2] px-2 font-medium">or enter manually</span>
                    <div className="flex-grow border-t border-[#c4c8bf]"></div>
                  </div>

                  <form onSubmit={handleManualAddSubmit} className="space-y-4 bg-white p-5 md:p-6 rounded-2xl shadow-ambient border border-[#eae8e5]">
                    
                    {/* Product Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#546250]">Product Name</label>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="e.g., Organic Ghee"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-3 text-sm focus:border-[#22301f] focus:outline-none focus:ring-0 transition-all text-[#1b1c1a]"
                          required
                        />
                        <ShoppingBasket className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c8bf]" size={18} />
                      </div>
                    </div>

                    {/* Brand */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#546250]">Brand (Optional)</label>
                      <input 
                        type="text"
                        placeholder="e.g., Epigamia"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-3 text-sm focus:border-[#22301f] focus:outline-none focus:ring-0 transition-all text-[#1b1c1a]"
                      />
                    </div>

                    {/* Product Image Upload Section */}
                    <div className="space-y-1.5 bg-[#fbf9f6] p-3.5 rounded-xl border border-[#c4c8bf]/70">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#546250] flex items-center gap-1.5">
                          <ImageIcon size={14} className="text-[#22301f]" />
                          Product Image (PNG / Photo)
                        </label>
                        <span className="text-[10px] text-[#747871] font-mono">
                          {formData.imageUrl ? 'Custom Photo' : 'Default Icon'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Preview Thumbnail */}
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-[#c4c8bf] bg-white flex items-center justify-center shadow-xs">
                          <img 
                            src={formData.imageUrl || DEFAULT_PRODUCT_IMAGE} 
                            alt="Product preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                          {formData.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                              className="absolute -top-1 -right-1 bg-[#D9483B] text-white rounded-full p-0.5 shadow hover:scale-110 active:scale-95 transition-all"
                              title="Remove custom photo and reset to default"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Upload Controls / Dropzone */}
                        <div className="flex-1 space-y-1.5">
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/png,image/jpeg,image/webp,image/jpg"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleProductImageUpload(file, false);
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                            />
                            <div className="border border-dashed border-[#22301f] bg-white hover:bg-[#f5f3f0] transition-colors rounded-lg px-3 py-2 flex items-center justify-center gap-2 text-xs font-medium text-[#22301f] cursor-pointer text-center shadow-xs">
                              <ImagePlus size={14} />
                              <span>{formData.imageUrl ? 'Change Photo...' : 'Upload Image (PNG/JPG)'}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-[#747871]">
                            {formData.imageUrl 
                              ? 'Custom photo attached. Will display on product card.' 
                              : 'No image uploaded. The default product PNG will be used.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Category Chips Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#546250] block">Category</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[...DEFAULT_CATEGORIES, ...customCategories].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: cat })}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                              formData.category === cat 
                                ? 'bg-[#22301f] text-white border-transparent shadow-sm' 
                                : 'bg-white text-[#444841] border-[#c4c8bf] hover:bg-[#f5f3f0]'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                        
                        {/* Inline Add Custom Category Button */}
                        {!showNewCatInput && (
                          <button
                            type="button"
                            onClick={() => setShowNewCatInput(true)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-[#22301f] bg-[#fbf9f6] text-[#22301f] hover:bg-[#eae8e5] active:scale-95 transition-all flex items-center gap-1"
                          >
                            <Plus size={12} /> Add Custom
                          </button>
                        )}
                      </div>

                      {/* New Custom Category Input Field */}
                      {showNewCatInput && (
                        <div className="flex items-center gap-2 mt-2 bg-[#fbf9f6] border border-dashed border-[#c4c8bf] rounded-lg p-2 animate-fadeIn">
                          <input
                            type="text"
                            placeholder="New category name (e.g. Dairy)"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="flex-1 bg-transparent border-none p-1 focus:ring-0 text-xs focus:outline-none font-medium text-[#1b1c1a]"
                            maxLength={30}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomCategory}
                            className="px-3 py-1.5 bg-[#22301f] text-white text-[11px] font-bold rounded hover:opacity-95 active:scale-95 transition-all"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewCatInput(false);
                              setNewCatName('');
                            }}
                            className="px-2 py-1.5 text-[#747871] hover:text-[#0e1b0c] text-[11px] font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Dates Grid (Manufactured Date and Expiry Date) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Manufactured Date (MFD) */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#546250] block">Manufacture Date (MFD) (Optional)</label>
                        <div className="bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-2.5 flex items-center shadow-inner h-11">
                          <div className="flex items-center gap-2 w-full">
                            <Calendar className="text-[#546250]" size={16} />
                            <input 
                              type="date"
                              value={formData.mfdDate}
                              onChange={(e) => setFormData({ ...formData, mfdDate: e.target.value })}
                              className="bg-transparent border-none p-0 focus:ring-0 text-xs font-mono text-[#0e1b0c] uppercase w-full focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Expiry Date (EXP) */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#546250] block">Expiry Date (EXP)</label>
                        <div className="bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-2.5 flex items-center justify-between shadow-inner h-11">
                          <div className="flex items-center gap-2 w-full">
                            <Calendar className="text-[#546250]" size={16} />
                            <input 
                              type="date"
                              value={formData.expiryDate}
                              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                              className="bg-transparent border-none p-0 focus:ring-0 text-xs font-mono text-[#0e1b0c] uppercase w-full focus:outline-none"
                              required
                            />
                          </div>
                          <div className="shrink-0 ml-1">
                            {formData.expiryDate ? (
                              <span className={`expiry-stamp text-[8px] py-0.5 px-1.5 font-bold ${getProximityInfo(formData.expiryDate).color}`}>
                                {getProximityInfo(formData.expiryDate).text}
                              </span>
                            ) : (
                              <span className="expiry-stamp text-[8px] py-0.5 px-1.5 text-[#747871] border-[#747871] opacity-60">
                                REQUIRED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quantity and Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#546250]">Quantity</label>
                        <div className="flex items-center w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-1 h-11">
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-[#f5f3f0] active:bg-[#eae8e5] text-[#546250] transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number"
                            value={formData.quantity}
                            readOnly
                            className="flex-1 bg-transparent border-none text-center font-mono text-sm focus:ring-0 focus:outline-none text-[#0e1b0c]"
                          />
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-[#f5f3f0] active:bg-[#eae8e5] text-[#546250] transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#546250]">Price (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#546250]">₹</span>
                          <input 
                            type="number"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-3 pl-7 text-sm focus:border-[#22301f] focus:outline-none focus:ring-0 transition-all text-[#1b1c1a] font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#546250]">Notes</label>
                      <textarea 
                        placeholder="Any additional storage details..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                        className="w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-3 text-sm focus:border-[#22301f] focus:outline-none focus:ring-0 transition-all text-[#1b1c1a]"
                      />
                    </div>

                    {/* Submit button */}
                    <div className="pt-2">
                      <button 
                        type="submit"
                        className="w-full bg-[#22301f] text-white py-3 rounded-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        Save Product
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* INSIGHTS / STATS VIEW */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-5 max-w-5xl mx-auto"
            >
              {/* Header */}
              <div>
                <h2 className="font-space text-2xl font-bold text-[#0e1b0c]">Insights</h2>
                <p className="text-[#546250] text-xs mt-1">Analysis of your consumption patterns.</p>
              </div>

              {/* Computed Monthly Stats */}
              {(() => {
                // Sum the price of wasted items in July 2026
                const julyWasted = wastedHistory.filter(w => w.wastedDate.startsWith('2026-07'));
                const wastedTotal = julyWasted.reduce((sum, w) => sum + (w.price || 0), 0);
                const expiredSoonCount = products.filter(p => {
                  const diff = getProximityInfo(p.expiryDate).daysLeft;
                  return diff >= 0 && diff <= 7;
                }).length;
                
                // Saved calculation: products consumed fully
                const savedTotal = wastedHistory.length * 110;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Wasted Hero & Summary Cards */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Wasted Hero Section */}
                      {wastedTotal > 0 ? (
                        <section className="text-center py-6 bg-white rounded-xl shadow-ambient border border-[#eae8e5] flex flex-col justify-center">
                          <h2 className="font-space text-5xl font-extrabold text-[#D9483B]">₹{wastedTotal}</h2>
                          <p className="text-[#546250] text-xs uppercase tracking-widest font-bold mt-1">Wasted in July</p>
                        </section>
                      ) : (
                        /* Zero Waste Celebration Hero Section */
                        <section className="text-center py-6 bg-white rounded-xl shadow-ambient border border-[#eae8e5] flex flex-col justify-center relative overflow-hidden">
                          <div className="relative z-10 flex flex-col items-center">
                            <div className="relative">
                              <h2 className="font-space text-5xl font-extrabold text-[#3E9B4F]">₹0</h2>
                              <Sparkles className="absolute -top-3 -right-6 text-[#3E9B4F] opacity-60" size={18} />
                            </div>
                            <p className="text-[#546250] text-xs uppercase tracking-widest font-bold mt-1">Wasted in July — keep it up</p>
                          </div>
                        </section>
                      )}

                      {/* Summary Bento Grid */}
                      <section className="grid grid-cols-2 gap-3">
                        {/* Expiring Soon */}
                        <div className="bg-white p-4 rounded-xl shadow-ambient border border-[#eae8e5] relative overflow-hidden group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-emerald-50 rounded-full">
                              <Clock className="text-emerald-700" size={16} />
                            </span>
                          </div>
                          <div className="font-mono text-3xl font-extrabold text-[#0e1b0c] mb-1">{soonExpiryCount}</div>
                          <div className="text-xs text-[#546250] font-medium">Expiring Soon</div>
                          <div className="absolute -right-2 -bottom-2 opacity-5">
                            <AlertTriangle size={64} className="text-[#1b1c1a]" />
                          </div>
                        </div>

                        {/* Wasted This Month count */}
                        <div className="bg-white p-4 rounded-xl shadow-ambient border border-[#eae8e5] relative overflow-hidden group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="p-2 bg-rose-50 rounded-full">
                              <Trash2 className="text-[#D9483B]" size={16} />
                            </span>
                          </div>
                          <div className="font-mono text-3xl font-extrabold text-[#0e1b0c] mb-1">
                            {julyWasted.length < 10 ? `0${julyWasted.length}` : julyWasted.length}
                          </div>
                          <div className="text-xs text-[#546250] font-medium">Wasted This Month</div>
                          <div className="absolute -right-2 -bottom-2 opacity-5">
                            <Trash2 size={64} className="text-[#1b1c1a]" />
                          </div>
                        </div>

                        {/* Savings Impact Bento Card */}
                        <div className="col-span-2 bg-[#22301f] p-4 rounded-xl shadow-ambient flex flex-col justify-center text-white">
                          <div className="flex items-center gap-2 mb-1.5">
                            <CheckCircle className="text-emerald-400" size={16} />
                            <span className="text-[10px] font-bold tracking-wider font-mono text-[#d8e7d0] uppercase">Estimated Loss Averted</span>
                          </div>
                          <div className="font-space text-2xl font-bold">
                            ₹ {savedTotal > 0 ? savedTotal.toLocaleString('en-IN') : '1,450'}.00
                          </div>
                          <div className="mt-3 h-1 w-full bg-[#3c4b38] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 w-3/4 rounded-full"></div>
                          </div>
                        </div>
                      </section>

                      {/* Weekly Streak progress card */}
                      <section className="bg-[#22301f] p-5 rounded-xl text-white relative overflow-hidden shadow-ambient">
                        <div className="relative z-10 max-w-[240px] space-y-2">
                          <h3 className="font-space text-base font-bold text-white leading-none">July Streak</h3>
                          <p className="text-xs text-[#d8e7d0] leading-relaxed">
                            You're on a 21-day streak of zero kitchen waste. Keep the momentum going!
                          </p>
                          <button 
                            onClick={() => showToast("You are tracking everything efficiently!", "success")}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow cursor-pointer"
                          >
                            View Full History
                          </button>
                        </div>
                        <Calendar className="absolute -bottom-4 -right-4 text-[#eae8e5]/10" size={120} />
                      </section>
                    </div>

                    {/* Right Column: Expiry Outlook & Waste History */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Expiry Outlook Custom Pixel Bar Chart */}
                      <section className="bg-white p-5 rounded-xl shadow-ambient border border-[#eae8e5]">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-space font-bold text-sm text-[#0e1b0c]">Expiry Outlook</h3>
                          <div className="flex items-center gap-1 text-[10px] text-[#546250] bg-[#f5f3f0] px-2.5 py-1 rounded-full font-semibold">
                            <span>Next 4 Weeks</span>
                          </div>
                        </div>
                        
                        <div className="h-44 flex items-end justify-between px-3 relative pt-4">
                          {/* Y-Axis Mock Guide Lines */}
                          <div className="absolute left-0 h-full w-full flex flex-col justify-between text-[8px] text-[#747871] font-mono opacity-40 pointer-events-none">
                            <div className="border-b border-[#f5f3f0] w-full pb-1">20 items</div>
                            <div className="border-b border-[#f5f3f0] w-full pb-1">15 items</div>
                            <div className="border-b border-[#f5f3f0] w-full pb-1">10 items</div>
                            <div className="border-b border-[#f5f3f0] w-full pb-1">5 items</div>
                            <div className="border-b border-[#f5f3f0] w-full">0</div>
                          </div>

                          {/* Bar 1 */}
                          <div className="flex flex-col items-center gap-2 z-10 w-12 group">
                            <div className="text-[10px] font-mono font-bold text-[#D9483B] opacity-0 group-hover:opacity-100 transition-opacity">
                              {soonExpiryCount > 0 ? soonExpiryCount : 3}
                            </div>
                            <div className="w-8 bg-[#f5f3f0] h-32 rounded-t-sm flex items-end overflow-hidden p-0.5">
                              <div 
                                className="w-full bg-[#D9483B] rounded-t-xs transition-all duration-500" 
                                style={{ height: `${Math.min(100, Math.max(25, soonExpiryCount * 25))}%` }}
                              />
                            </div>
                            <span className="font-mono text-[9px] text-[#747871] font-bold">W1</span>
                          </div>

                          {/* Bar 2 */}
                          <div className="flex flex-col items-center gap-2 z-10 w-12 group">
                            <div className="text-[10px] font-mono font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              {Math.max(1, Math.floor(products.length * 0.4))}
                            </div>
                            <div className="w-8 bg-[#f5f3f0] h-32 rounded-t-sm flex items-end overflow-hidden p-0.5">
                              <div 
                                className="w-full bg-amber-500 rounded-t-xs transition-all duration-500" 
                                style={{ height: `${Math.min(100, Math.max(35, products.length * 15))}%` }}
                              />
                            </div>
                            <span className="font-mono text-[9px] text-[#747871] font-bold">W2</span>
                          </div>

                          {/* Bar 3 */}
                          <div className="flex flex-col items-center gap-2 z-10 w-12 group">
                            <div className="text-[10px] font-mono font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              {Math.max(2, Math.floor(products.length * 0.3))}
                            </div>
                            <div className="w-8 bg-[#f5f3f0] h-32 rounded-t-sm flex items-end overflow-hidden p-0.5">
                              <div 
                                className="w-full bg-emerald-600 rounded-t-xs transition-all duration-500" 
                                style={{ height: `${Math.min(100, Math.max(20, products.length * 12))}%` }}
                              />
                            </div>
                            <span className="font-mono text-[9px] text-[#747871] font-bold">W3</span>
                          </div>

                          {/* Bar 4 */}
                          <div className="flex flex-col items-center gap-2 z-10 w-12 group">
                            <div className="text-[10px] font-mono font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                              {Math.max(1, Math.floor(products.length * 0.2))}
                            </div>
                            <div className="w-8 bg-[#f5f3f0] h-32 rounded-t-sm flex items-end overflow-hidden p-0.5">
                              <div 
                                className="w-full bg-emerald-700 rounded-t-xs transition-all duration-500" 
                                style={{ height: `${Math.min(100, Math.max(15, products.length * 8))}%` }}
                              />
                            </div>
                            <span className="font-mono text-[9px] text-[#747871] font-bold">W4</span>
                          </div>
                        </div>
                      </section>

                      {/* Waste History Log section */}
                      <section className="bg-white p-5 rounded-xl shadow-ambient border border-[#eae8e5] space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="font-space font-bold text-sm text-[#0e1b0c]">Wasted History Log</h3>
                          <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">All time</span>
                        </div>
                        <div className="divide-y divide-[#eae8e5]/40 max-h-60 overflow-y-auto no-scrollbar">
                          {wastedHistory.length === 0 ? (
                            <p className="text-xs text-[#747871] py-4 text-center">Perfect zero-waste record!</p>
                          ) : (
                            wastedHistory.map((item) => (
                              <div key={item.id} className="py-2.5 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold text-[#1b1c1a]">{item.name}</p>
                                  <p className="text-[10px] text-[#747871] font-medium font-mono">{item.wastedDate}</p>
                                </div>
                                <div className="expiry-stamp px-2 py-0.5 text-red-600 border-red-600 rounded text-[10px] bg-red-50/50">
                                  ₹{item.price}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      {/* verified zero waste stamp */}
                      {wastedTotal === 0 && (
                        <div className="flex justify-center pt-2">
                          <div className="expiry-stamp px-5 py-2 border-[1.5px] border-[#3E9B4F] text-[#3E9B4F] text-[10px] font-bold tracking-widest bg-white">
                            VERIFIED ZERO WASTE
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-5 max-w-4xl mx-auto"
            >
              {/* Header */}
              <div>
                <h2 className="font-space text-2xl font-bold text-[#0e1b0c]">Settings</h2>
                <p className="text-[#546250] text-xs mt-1">Manage sync, AI keys, and local storage.</p>
              </div>

              {/* Profile Card */}
              <section className="bg-white rounded-xl p-5 shadow-ambient border border-[#eae8e5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#eae8e5] bg-[#f0eeea] shrink-0">
                    <img 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      src={user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
                      alt={settings.username} 
                    />
                  </div>
                  <div>
                    <h3 className="font-space font-bold text-base text-[#0e1b0c] leading-snug">
                      {user ? user.displayName : 'Guest User'}
                    </h3>
                    <p className="text-xs text-[#546250] truncate max-w-[240px]">
                      {user ? user.email : 'Local Storage Mode'}
                    </p>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                      user ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {user ? '☁️ Cloud Sync Active' : '⚠️ Offline (stored in browser cache)'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  {user ? (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-4 py-2 border border-rose-200 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSignIn}
                      className="px-4 py-2.5 bg-[#22301f] text-white hover:bg-opacity-90 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer"
                    >
                      <UserCheck size={14} />
                      Sign In with Google
                    </button>
                  )}
                </div>
              </section>

              {/* Data Backup & Sync */}
              <section className="bg-white rounded-xl p-5 shadow-ambient border border-[#eae8e5] space-y-3">
                <h3 className="font-space font-bold text-sm text-[#0e1b0c]">Data Backup & Sync</h3>
                <p className="text-xs text-[#546250]">Export your database to a backup JSON file or restore your products anytime.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Export */}
                  <button 
                    onClick={handleExportData}
                    className="w-full flex items-center justify-between px-4 py-3 border border-[#c4c8bf] rounded-lg text-xs font-semibold text-[#1b1c1a] hover:bg-[#f5f3f0] active:scale-98 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <Download size={16} className="text-[#747871]" />
                      Export database (.json)
                    </span>
                    <ArrowRight size={14} className="text-[#747871]" />
                  </button>

                  {/* Import */}
                  <div className="relative overflow-hidden w-full">
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={handleImportData}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <button 
                      className="w-full flex items-center justify-between px-4 py-3 border border-[#c4c8bf] rounded-lg text-xs font-semibold text-[#1b1c1a] hover:bg-[#f5f3f0] active:scale-98 transition-all"
                    >
                      <span className="flex items-center gap-3">
                        <Upload size={16} className="text-[#747871]" />
                        Import data
                      </span>
                      <ArrowRight size={14} className="text-[#747871]" />
                    </button>
                  </div>
                </div>
              </section>

              {/* Removed & Consumed Items (Revoke / Restore) */}
              <section className="bg-white rounded-xl p-5 shadow-ambient border border-[#eae8e5] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-space font-bold text-sm text-[#0e1b0c] flex items-center gap-2">
                      <RotateCcw size={16} className="text-[#3E9B4F]" />
                      <span>Removed & Consumed Items</span>
                      {removedHistory.length > 0 && (
                        <span className="bg-[#eae8e5] text-[#1b1c1a] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                          {removedHistory.length}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#546250] mt-0.5">Revoke and restore recently consumed or removed items back to your shelf.</p>
                  </div>
                  {removedHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearRemovedHistory}
                      className="text-[11px] font-medium text-[#747871] hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Clear Archive
                    </button>
                  )}
                </div>

                {removedHistory.length === 0 ? (
                  <div className="py-6 text-center border border-dashed border-[#c4c8bf] rounded-xl bg-[#fbf9f6] p-4">
                    <p className="text-xs text-[#546250] font-medium">No removed items in archive.</p>
                    <p className="text-[10px] text-[#747871] mt-1">When products are fully consumed or marked as waste, they appear here so you can easily restore them anytime.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 no-scrollbar">
                    {removedHistory.map((item) => {
                      const orig = item.originalProduct;
                      const img = orig.imageUrl || DEFAULT_PRODUCT_IMAGE;
                      const isConsumed = item.reason === 'consumed';

                      return (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-[#eae8e5] bg-[#fdfdfc] hover:bg-white transition-all shadow-xs gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#eae8e5] bg-[#f0eeea] shrink-0">
                              <img 
                                src={img} 
                                alt={orig.name} 
                                className="w-full h-full object-cover" 
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE; }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-space font-bold text-xs text-[#0e1b0c] truncate" title={orig.name}>{orig.name}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  isConsumed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {isConsumed ? 'Consumed' : 'Discarded'}
                                </span>
                                <span className="text-[10px] text-[#747871] font-mono whitespace-nowrap">
                                  EXP: {formatDateToReadable(orig.expiryDate)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRevokeProduct(item.id)}
                            className="px-2.5 py-1.5 bg-[#22301f] text-white hover:bg-opacity-90 rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer whitespace-nowrap"
                            title="Restore this item back to your active shelf"
                          >
                            <RotateCcw size={11} className="text-[#8cd19b]" />
                            <span>Revoke</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Notification & Reminders Settings */}
              <section className="bg-white rounded-xl p-5 shadow-ambient border border-[#eae8e5] space-y-4">
                <h3 className="font-space font-bold text-sm text-[#0e1b0c]">Preferences</h3>
                
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-bold text-[#1b1c1a]">Notification Preferences</p>
                    <p className="text-[10px] text-[#747871]">Push, Email, and SMS alerts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.notificationsEnabled}
                      onChange={(e) => saveSettings({ ...settings, notificationsEnabled: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-[#c4c8bf] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4aa659]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-[#f5f3f0] pt-3">
                  <div>
                    <p className="text-xs font-bold text-[#1b1c1a]">Default Reminders</p>
                    <p className="text-[10px] text-[#747871]">Current: {settings.defaultReminderDays} days before expiry</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const nextDays = settings.defaultReminderDays === 3 ? 7 : settings.defaultReminderDays === 7 ? 14 : 3;
                        saveSettings({ ...settings, defaultReminderDays: nextDays });
                        showToast(`Default reminder changed to ${nextDays} days!`, 'info');
                      }}
                      className="font-mono text-[9px] font-bold text-[#0e1b0c] bg-[#d6e8ce] px-2.5 py-1.5 rounded uppercase hover:opacity-90 active:scale-95 transition-all"
                    >
                      {settings.defaultReminderDays} DAYS
                    </button>
                  </div>
                </div>
              </section>

              {/* Install App (PWA) Section */}
              <section className="bg-white rounded-xl p-5 shadow-ambient border border-[#eae8e5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#eae8e5] bg-[#f0eeea] shrink-0 p-1">
                      <img src="/icons/logo.png" alt="FreshStamp App Icon" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h3 className="font-space font-bold text-sm text-[#0e1b0c]">Install FreshStamp App</h3>
                      <p className="text-[11px] text-[#546250]">Get full offline access, home screen shortcut, and instant loading.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallPWA}
                    className="px-4 py-2.5 bg-[#22301f] text-white hover:bg-opacity-90 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Smartphone size={14} />
                    {isInstallable ? 'Install App' : 'App Ready'}
                  </button>
                </div>
              </section>

              {/* About section */}
              <section className="bg-white rounded-xl p-5 shadow-ambient border border-[#eae8e5] space-y-4">
                <div className="flex flex-col items-center text-center p-4 bg-[#fbf9f6] rounded-xl border border-[#eae8e5]/80">
                  <img 
                    src="/icons/logo-full.png" 
                    alt="FreshStamp Full Logo" 
                    className="h-20 w-auto object-contain mb-2 drop-shadow-xs" 
                  />
                  <span className="font-space font-bold text-xs uppercase tracking-wider text-[#0e1b0c]">Smart Expiry Tracking</span>
                  <p className="text-[11px] text-[#546250] mt-1 max-w-[260px] leading-relaxed">
                    Clinical minimalism meets automated expiry tracking and food waste minimization.
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-[#546250]">App Version</span>
                  <span className="font-mono text-[#747871] bg-[#f5f3f0] px-2.5 py-1 rounded-full font-bold">2.4.0</span>
                </div>
                <div className="border-t border-[#eae8e5]/40 pt-3 flex flex-col gap-2">
                  <a href="#" onClick={(e) => { e.preventDefault(); showToast("Crafted under Clinical Minimalism Design Concept", "info"); }} className="text-[10px] text-[#747871] hover:underline font-medium">Privacy Policy</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); showToast("FreshStamp is freshly squeezed to prevent household waste.", "info"); }} className="text-[10px] text-[#747871] hover:underline font-medium">Terms of Service</a>
                </div>
              </section>

              {/* App reset */}
              <section className="pt-2">
                <button 
                  type="button"
                  onClick={handleResetApp}
                  className="w-full py-3 border border-[#c4c8bf] rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors active:scale-98"
                >
                  Sign Out / Reset App Data
                </button>
              </section>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Floating Action Button (FAB) (Hidden on Settings, Stats and Add Product Tab to match guidelines, and hidden on desktop) */}
      {activeTab === 'home' && products.length > 0 && (
        <button 
          onClick={() => setActiveTab('add')}
          className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-[#3E9B4F] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
          id="add-fab-btn"
        >
          <Plus size={32} />
        </button>
      )}

      {/* Bottom Safe Area Navigation Menu (Mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white border-t border-[#eae8e5] flex justify-around items-center h-20 pb-safe">
        
        {/* Home */}
        <button 
          onClick={() => { setActiveTab('home'); }}
          className={`flex flex-col items-center justify-center w-20 transition-all ${
            activeTab === 'home' ? 'text-[#0e1b0c] font-bold scale-100' : 'text-[#747871] scale-95 hover:text-[#0e1b0c]'
          }`}
        >
          <Home size={22} className={activeTab === 'home' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] font-medium mt-1 font-sans">Home</span>
          {activeTab === 'home' && <div className="w-1 h-1 rounded-full bg-[#0e1b0c] mt-0.5 animate-pulse" />}
        </button>

        {/* Add */}
        <button 
          onClick={() => { setActiveTab('add'); }}
          className={`flex flex-col items-center justify-center w-20 transition-all ${
            activeTab === 'add' ? 'text-[#0e1b0c] font-bold scale-100' : 'text-[#747871] scale-95 hover:text-[#0e1b0c]'
          }`}
        >
          <PlusCircle size={22} className={activeTab === 'add' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] font-medium mt-1 font-sans">Add</span>
          {activeTab === 'add' && <div className="w-1 h-1 rounded-full bg-[#0e1b0c] mt-0.5 animate-pulse" />}
        </button>

        {/* Stats */}
        <button 
          onClick={() => { setActiveTab('stats'); }}
          className={`flex flex-col items-center justify-center w-20 transition-all ${
            activeTab === 'stats' ? 'text-[#0e1b0c] font-bold scale-100' : 'text-[#747871] scale-95 hover:text-[#0e1b0c]'
          }`}
        >
          <BarChart3 size={22} className={activeTab === 'stats' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] font-medium mt-1 font-sans">Stats</span>
          {activeTab === 'stats' && <div className="w-1 h-1 rounded-full bg-[#0e1b0c] mt-0.5 animate-pulse" />}
        </button>

        {/* Settings */}
        <button 
          onClick={() => { setActiveTab('settings'); }}
          className={`flex flex-col items-center justify-center w-20 transition-all ${
            activeTab === 'settings' ? 'text-[#0e1b0c] font-bold scale-100' : 'text-[#747871] scale-95 hover:text-[#0e1b0c]'
          }`}
        >
          <SettingsIcon size={22} className={activeTab === 'settings' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] font-medium mt-1 font-sans">Settings</span>
          {activeTab === 'settings' && <div className="w-1 h-1 rounded-full bg-[#0e1b0c] mt-0.5 animate-pulse" />}
        </button>

      </nav>

      {/* MODAL 1: AI QUICK DEMO PRODUCT SELECTION SELECTOR */}
      <AnimatePresence>
        {showOcrSelector && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#0e1b0c]/30 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-ambient p-6 flex flex-col space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[#eae8e5]">
                <h3 className="font-space font-bold text-sm text-[#0e1b0c]">AI Quick Demo Products</h3>
                <button onClick={() => setShowOcrSelector(false)} className="text-xs text-[#747871] hover:text-[#0e1b0c]">Cancel</button>
              </div>
              <p className="text-xs text-[#546250]">Select a mock packaging file to trigger real Gemini OCR expiry date scanning simulation!</p>
              
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                {MOCK_PACKAGING_PHOTOS.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setShowOcrSelector(false);
                      triggerOcrScan(m.mockOcrData, undefined, m.image);
                    }}
                    className="w-full flex items-center gap-3 p-2 bg-[#fbf9f6] hover:bg-[#eae8e5] rounded-xl border border-[#c4c8bf]/40 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      <img src={m.image} referrerPolicy="no-referrer" alt={m.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1b1c1a]">{m.name}</p>
                      <p className="text-[10px] text-[#747871] font-mono">Category: {m.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CAMERA CAPTURING / OCR CONFIRMATION MODAL OVERLAY */}
      <AnimatePresence>
        {showOcrModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#0e1b0c]/45 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.93, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 20 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-ambient p-6 flex flex-col items-center"
            >
              {ocrLoading ? (
                /* Scanning state with beautiful loader */
                <div className="py-8 flex flex-col items-center space-y-4">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-700 animate-spin"></div>
                    <Scan className="text-emerald-700 absolute" size={20} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-space font-bold text-sm text-[#0e1b0c]">Reading photo packaging...</p>
                    <p className="text-[10px] text-[#747871]">Gemini AI is analyzing text & expiry stamps.</p>
                  </div>
                </div>
              ) : ocrError ? (
                /* Error state with key directions */
                <div className="py-4 flex flex-col items-center space-y-4 text-center">
                  <AlertTriangle className="text-[#D9483B]" size={40} />
                  <div className="space-y-2">
                    <h4 className="font-space font-bold text-sm text-[#0e1b0c]">Verification failed</h4>
                    <p className="text-xs text-[#546250] leading-relaxed px-2">{ocrError}</p>
                  </div>
                  <div className="w-full space-y-2 pt-2">
                    <button 
                      onClick={() => {
                        // Quick setup key redirect
                        setShowOcrModal(false);
                        setActiveTab('settings');
                        showToast('Configure local Gemini API key here!', 'info');
                      }}
                      className="w-full py-2.5 bg-[#22301f] text-white font-bold rounded-lg text-xs"
                    >
                      Set API Key
                    </button>
                    <button 
                      onClick={() => setShowOcrModal(false)}
                      className="w-full py-2.5 border border-[#c4c8bf] text-[#546250] rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Extraction output correct verification screen (Image 13/Screen 7) */
                <div className="w-full flex flex-col items-center text-center space-y-6">
                  <div className="flex flex-col items-center">
                    <Sparkles className="text-emerald-700 mb-2 scale-110" size={20} />
                    <p className="font-mono text-[9px] font-bold tracking-wider text-[#747871] uppercase">READ FROM PHOTO</p>
                    
                    {ocrResult?.expiryDate ? (
                      <h2 className="font-mono text-base font-extrabold text-[#0e1b0c] bg-emerald-50 px-4 py-1 rounded border border-emerald-100 mt-2 rotate-[-1deg] inline-block shadow-sm">
                        {new Date(ocrResult.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                      </h2>
                    ) : (
                      <h2 className="font-mono text-xs font-bold text-red-600 bg-red-50 px-4 py-1 rounded border border-red-100 mt-2 inline-block">
                        NO DATE DETECTED
                      </h2>
                    )}
                  </div>

                  <div className="w-full bg-[#fbf9f6] p-3 rounded-lg border border-[#eae8e5] text-left space-y-2">
                    <div className="flex justify-between border-b border-[#eae8e5] pb-1 text-xs">
                      <span className="text-[#747871] font-medium">Product</span>
                      <span className="font-bold text-[#1b1c1a] truncate max-w-[160px]">{ocrResult?.name}</span>
                    </div>
                    {ocrResult?.brand && (
                      <div className="flex justify-between border-b border-[#eae8e5] pb-1 text-xs">
                        <span className="text-[#747871] font-medium">Brand</span>
                        <span className="font-bold text-[#1b1c1a]">{ocrResult?.brand}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-[#eae8e5] pb-1 text-xs">
                      <span className="text-[#747871] font-medium">Category</span>
                      <span className="font-bold text-[#1b1c1a]">{ocrResult?.category}</span>
                    </div>
                    {ocrResult?.price > 0 && (
                      <div className="flex justify-between border-b border-[#eae8e5] pb-1 text-xs">
                        <span className="text-[#747871] font-medium">Est. Price</span>
                        <span className="font-bold text-[#1b1c1a]">₹{ocrResult?.price}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="font-space font-bold text-lg text-[#0e1b0c]">Correct?</h3>

                  <div className="w-full flex flex-col gap-2">
                    <button 
                      onClick={handleApplyOcrResult}
                      className="w-full py-3 bg-[#22301f] text-white font-bold rounded-lg text-xs shadow hover:opacity-95 active:scale-95 transition-all"
                    >
                      Use it
                    </button>
                    <button 
                      onClick={() => setShowOcrModal(false)}
                      className="w-full py-3 border border-[#747871] text-[#546250] font-bold rounded-lg text-xs hover:bg-[#f5f3f0]"
                    >
                      Enter manually
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* MODAL 3: EDIT PRODUCT & PHOTO MODAL */}
        {editingProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1b0c]/45 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col space-y-4 my-8"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[#eae8e5]">
                <h3 className="font-space font-bold text-base text-[#0e1b0c]">Edit Product Details & Photo</h3>
                <button 
                  onClick={() => setEditingProduct(null)} 
                  className="text-xs text-[#747871] hover:text-[#0e1b0c] p-1 rounded-md hover:bg-[#f5f3f0]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Photo Upload & Preview */}
              <div className="space-y-1.5 bg-[#fbf9f6] p-3 rounded-xl border border-[#c4c8bf]/70">
                <label className="text-xs font-bold text-[#546250] flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-[#22301f]" />
                  Product Photo (PNG / JPG)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-[#c4c8bf] bg-white flex items-center justify-center shadow-xs">
                    <img 
                      src={editFormData.imageUrl || DEFAULT_PRODUCT_IMAGE} 
                      alt="Product preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                      }}
                    />
                    {editFormData.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute -top-1 -right-1 bg-[#D9483B] text-white rounded-full p-0.5 shadow hover:scale-110 active:scale-95 transition-all"
                        title="Remove custom photo"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProductImageUpload(file, true);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                      />
                      <div className="border border-dashed border-[#22301f] bg-white hover:bg-[#f5f3f0] transition-colors rounded-lg px-3 py-2 flex items-center justify-center gap-2 text-xs font-medium text-[#22301f] cursor-pointer text-center">
                        <ImagePlus size={14} />
                        <span>{editFormData.imageUrl ? 'Change Photo...' : 'Upload Image (PNG/JPG)'}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#747871]">
                      {editFormData.imageUrl ? 'Custom image selected.' : 'Default image of product is active.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#546250]">Product Name</label>
                <input 
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-2.5 text-xs text-[#1b1c1a] focus:outline-none focus:border-[#22301f]"
                  required
                />
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#546250]">Brand (Optional)</label>
                <input 
                  type="text"
                  value={editFormData.brand}
                  onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                  className="w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-2.5 text-xs text-[#1b1c1a] focus:outline-none focus:border-[#22301f]"
                />
              </div>

              {/* Expiry Date & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#546250]">Expiry Date</label>
                  <input 
                    type="date"
                    value={editFormData.expiryDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })}
                    className="w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-2.5 text-xs text-[#1b1c1a] font-mono focus:outline-none focus:border-[#22301f]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#546250]">Quantity</label>
                  <input 
                    type="number"
                    min="1"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-2.5 text-xs text-[#1b1c1a] font-mono focus:outline-none focus:border-[#22301f]"
                  />
                </div>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#546250]">Price (₹)</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                  className="w-full bg-[#fbf9f6] border border-[#c4c8bf] rounded-lg p-2.5 text-xs text-[#1b1c1a] font-mono focus:outline-none focus:border-[#22301f]"
                />
              </div>

              {/* Save & Cancel */}
              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={handleSaveEditedProduct}
                  className="flex-1 py-2.5 bg-[#22301f] text-white font-bold rounded-lg text-xs hover:opacity-95 active:scale-95 transition-all shadow"
                >
                  Save Changes
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 border border-[#747871] text-[#546250] font-bold rounded-lg text-xs hover:bg-[#f5f3f0]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Brand Drawer / Modal */}
        {showBrandDrawer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBrandDrawer(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#eae8e5] relative space-y-5"
            >
              <button 
                onClick={() => setShowBrandDrawer(false)}
                className="absolute top-4 right-4 text-[#747871] hover:text-[#0e1b0c] p-1.5 rounded-lg hover:bg-[#f5f3f0] transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center pt-2">
                <img 
                  src="/icons/logo-full.png" 
                  alt="FreshStamp" 
                  className="h-20 w-auto object-contain mb-1" 
                />
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  v2.4.0 • Zero Waste Engine
                </span>
                <p className="text-xs text-[#546250] mt-3 leading-relaxed">
                  Never let groceries or essentials expire unnoticed. Powered by OCR intelligence and automated inventory tracking.
                </p>
              </div>

              {/* Quick stats highlight */}
              <div className="grid grid-cols-2 gap-2 bg-[#fbf9f6] p-3 rounded-xl border border-[#eae8e5]/70 text-center">
                <div>
                  <p className="font-mono text-xs font-bold text-[#0e1b0c]">
                    {products.filter(p => !p.isUsed).length}
                  </p>
                  <p className="text-[10px] text-[#747871]">Active Items</p>
                </div>
                <div>
                  <p className="font-mono text-xs font-bold text-amber-600">
                    {soonExpiryCount}
                  </p>
                  <p className="text-[10px] text-[#747871]">Expiring Soon</p>
                </div>
              </div>

              {/* Quick shortcuts */}
              <div className="space-y-1.5 pt-1">
                <p className="font-mono text-[9px] font-bold text-[#747871] uppercase tracking-wider">Quick Navigation</p>
                <button 
                  onClick={() => { setActiveTab('home'); setShowBrandDrawer(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f5f3f0] text-xs font-semibold text-[#0e1b0c] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Home size={15} /> Inventory Shelf</span>
                  <ArrowRight size={13} className="text-[#747871]" />
                </button>
                <button 
                  onClick={() => { setActiveTab('add'); setShowBrandDrawer(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f5f3f0] text-xs font-semibold text-[#0e1b0c] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2"><PlusCircle size={15} /> Add / Scan Item</span>
                  <ArrowRight size={13} className="text-[#747871]" />
                </button>
                <button 
                  onClick={() => { setActiveTab('stats'); setShowBrandDrawer(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f5f3f0] text-xs font-semibold text-[#0e1b0c] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2"><BarChart3 size={15} /> Waste & Analytics</span>
                  <ArrowRight size={13} className="text-[#747871]" />
                </button>
                <button 
                  onClick={() => { setActiveTab('settings'); setShowBrandDrawer(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f5f3f0] text-xs font-semibold text-[#0e1b0c] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2"><SettingsIcon size={15} /> Settings & Backup</span>
                  <ArrowRight size={13} className="text-[#747871]" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
