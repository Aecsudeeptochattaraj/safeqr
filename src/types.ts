export type UserRole = 'user' | 'partner' | 'admin' | 'super-admin' | 'viewer';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  address?: string;
  role: UserRole;
  accountStatus?: 'active' | 'blocked';
  isDeleted?: boolean;
  lastActivityAt?: any;
  createdAt: any;
}

export interface QRInventory {
  id: string; // The secret key or serial number
  status: 'available' | 'assigned' | 'mapped' | 'expired';
  partnerUid?: string; // If assigned to a partner's physical stock
  mappedVehicleId?: string; // If mapped to a customer vehicle
  batchId?: string; // Links to a specific creation/shipment batch
  expiryDate?: any; // Lifecycle tracking
  history?: {
    action: string;
    timestamp: any;
    performerUid: string;
    note?: string;
  }[];
  createdAt: any;
}

export interface Vehicle {
  id: string;
  ownerUid: string;
  partnerUid?: string;
  qrId: string; // Links to QRInventory
  vehicleNumber: string;
  model: string;
  color: string;
  type: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  emergencyContact: string;
  planId: '1yr' | '2yr' | '5yr';
  subscriptionExpiry: any; // Timestamp
  status: 'active' | 'expired' | 'pending';
  isDeleted: boolean;
  imageUrl?: string;
  createdAt: any;
}

export interface Partner {
  uid: string;
  name: string;
  email: string;
  location: string;
  qrAllocated: number;
  qrUsed: number;
  status: 'active' | 'inactive';
  createdAt: any;
}

export interface LogEntry {
  id?: string;
  vehicleId?: string;
  adminUid?: string; // Performer of the action
  adminName?: string; // Cache name for logs
  targetUid?: string; // The partner or user the action affected
  action: 'scan' | 'call' | 'whatsapp' | 'emergency' | 'transfer' | 'creation' | 'deletion' | 'download' | 'login' | 'edit_user' | 'block_user' | 'unlink_qr';
  status: 'success' | 'failure';
  timestamp: any;
  ip?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  device?: {
    browser?: string;
    os?: string;
    type?: 'mobile' | 'tablet' | 'desktop';
  };
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
