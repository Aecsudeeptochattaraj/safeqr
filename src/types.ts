export type UserRole = 'user' | 'partner' | 'admin';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: any;
}

export interface QRInventory {
  id: string; // The secret key or serial number
  status: 'available' | 'assigned';
  partnerUid?: string; // If assigned to a partner's physical stock
  mappedVehicleId?: string; // If mapped to a customer vehicle
  createdAt: any;
}

export interface Vehicle {
  id: string;
  ownerUid: string;
  partnerUid?: string;
  qrId: string; // Links to QRInventory
  vehicleNumber: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  emergencyContact: string;
  planId: '1yr' | '2yr' | '5yr';
  subscriptionExpiry: any; // Timestamp
  status: 'active' | 'expired' | 'pending';
  imageUrl?: string;
  createdAt: any;
}

export interface LogEntry {
  id?: string;
  vehicleId: string;
  action: 'scan' | 'call' | 'whatsapp' | 'emergency';
  timestamp: any;
  ip?: string;
  metadata?: any;
}

export interface Commission {
  id: string;
  partnerUid: string;
  vehicleId: string;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: any;
}
