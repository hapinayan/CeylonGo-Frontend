/**
 * API Capability Mapping for CeylonGo Admin Modules.
 * Distinguishes supported live operations, unsupported live operations,
 * development preview operations, and backend deployment dependencies.
 */

export type OperationSupportLevel =
  | 'SUPPORTED_LIVE'
  | 'UNSUPPORTED_LIVE'
  | 'PREVIEW_ONLY'
  | 'BACKEND_DEPENDENT'
  | 'READ_ONLY';

export interface AdminEndpointCapability {
  moduleId: string;
  moduleName: string;
  operationName: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpointPath: string;
  supportLevel: OperationSupportLevel;
  requiredRole: 'super_admin' | 'operations_admin' | 'finance_admin' | 'any_admin';
  notes: string;
}

export const ADMIN_MODULE_CAPABILITIES: readonly AdminEndpointCapability[] = [
  // Module 06: Homestays
  {
    moduleId: 'M06',
    moduleName: 'Homestay Management',
    operationName: 'List Pending Homestays',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/homestays/pending',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Supported in backend router; returns pending approval queue.',
  },
  {
    moduleId: 'M06',
    moduleName: 'Homestay Management',
    operationName: 'Homestay Admin Dashboard Summary',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/homestays/dashboard',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Supported in backend router; provides listing, booking, and payment metrics.',
  },
  {
    moduleId: 'M06',
    moduleName: 'Homestay Management',
    operationName: 'Get Homestay Review Details',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/homestays/{homestay_id}',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Supported in backend router; returns full property specifications and amenities.',
  },
  {
    moduleId: 'M06',
    moduleName: 'Homestay Management',
    operationName: 'Review Homestay (Approve/Reject/Suspend)',
    httpMethod: 'POST',
    endpointPath: '/api/v1/admin/homestays/{homestay_id}/review',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Supported in backend router; records admin audit log and updates listing reference.',
  },
  {
    moduleId: 'M06',
    moduleName: 'Homestay Management',
    operationName: 'Verify Homestay Status',
    httpMethod: 'POST',
    endpointPath: '/api/v1/admin/homestays/{homestay_id}/verify',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Supported in backend router; updates verification status.',
  },
  {
    moduleId: 'M06',
    moduleName: 'Homestay Management',
    operationName: 'Multi-Status Homestay Directory with Search',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/homestays',
    supportLevel: 'UNSUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Missing in backend admin router; simulated in development preview mode.',
  },

  // Module 07: Adventures
  {
    moduleId: 'M07',
    moduleName: 'Adventure Management',
    operationName: 'List Pending Activities',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/activities',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Supported in backend router; lists pending activities up to limit.',
  },
  {
    moduleId: 'M07',
    moduleName: 'Adventure Management',
    operationName: 'Get Activity Review Details',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/activities/{activity_id}',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Supported in backend router; returns full activity specs.',
  },
  {
    moduleId: 'M07',
    moduleName: 'Adventure Management',
    operationName: 'Approve Activity',
    httpMethod: 'POST',
    endpointPath: '/api/v1/admin/activities/{activity_id}/approve',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Supported in backend router; approves activity and logs audit.',
  },
  {
    moduleId: 'M07',
    moduleName: 'Adventure Management',
    operationName: 'Reject Activity',
    httpMethod: 'POST',
    endpointPath: '/api/v1/admin/activities/{activity_id}/reject',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Supported in backend router; rejects activity with required reason.',
  },
  {
    moduleId: 'M07',
    moduleName: 'Adventure Management',
    operationName: 'Multi-Status Activity Directory with Search',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/activities/all',
    supportLevel: 'UNSUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Missing in backend admin router; simulated in development preview mode.',
  },

  // Module 08: Rentals
  {
    moduleId: 'M08',
    moduleName: 'Rental Management',
    operationName: 'List Rental Vehicles (Directory & Filters)',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/rentals/vehicles',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Fully supported with multi-status, vehicle type, search, and pagination.',
  },
  {
    moduleId: 'M08',
    moduleName: 'Rental Management',
    operationName: 'List Pending Rental Vehicles',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/rentals/vehicles/pending',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Fully supported convenience queue in backend router.',
  },
  {
    moduleId: 'M08',
    moduleName: 'Rental Management',
    operationName: 'Get Rental Vehicle Details',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/rentals/vehicles/{vehicle_id}',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Fully supported; includes specs, counts, and primary image.',
  },
  {
    moduleId: 'M08',
    moduleName: 'Rental Management',
    operationName: 'Review Rental Vehicle',
    httpMethod: 'POST',
    endpointPath: '/api/v1/admin/rentals/vehicles/{vehicle_id}/review',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Fully supported; enforces motorized vehicle doc requirements while exempting bicycles.',
  },
  {
    moduleId: 'M08',
    moduleName: 'Rental Management',
    operationName: 'List Vehicle Documents',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/rentals/vehicles/{vehicle_id}/documents',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Fully supported; lists documents for administrative inspection.',
  },
  {
    moduleId: 'M08',
    moduleName: 'Rental Management',
    operationName: 'Verify Vehicle Status',
    httpMethod: 'POST',
    endpointPath: '/api/v1/admin/rentals/vehicles/{vehicle_id}/verify',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'operations_admin',
    notes: 'Fully supported; updates vehicle verification status.',
  },
  {
    moduleId: 'M08',
    moduleName: 'Rental Management',
    operationName: 'Stream Vehicle Document File',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/rentals/documents/{document_id}/file',
    supportLevel: 'BACKEND_DEPENDENT',
    requiredRole: 'operations_admin',
    notes: 'Fully implemented in router; requires physical files in server uploads folder.',
  },
  {
    moduleId: 'M08',
    moduleName: 'Rental Management',
    operationName: 'Fleet Analytics Summary',
    httpMethod: 'GET',
    endpointPath: '/api/v1/admin/rentals/analytics/fleet-summary',
    supportLevel: 'SUPPORTED_LIVE',
    requiredRole: 'finance_admin',
    notes: 'Supported for operations_admin and finance_admin.',
  },
];
