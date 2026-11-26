/**
 * Sri Lankan Provinces and Districts Geographical Reference
 *
 * Centralized, strongly typed, and reusable reference containing all 9 official
 * Sri Lankan provinces and their 25 districts.
 * Single source of truth across Homestay, Adventure, Rental, Tour Guide, and Artisan modules.
 */

export const SRI_LANKA_PROVINCES = [
  'Central',
  'Eastern',
  'North Central',
  'Northern',
  'North Western',
  'Sabaragamuwa',
  'Southern',
  'Uva',
  'Western',
] as const;

export type SriLankaProvince = typeof SRI_LANKA_PROVINCES[number];

export interface SriLankaDistrict {
  readonly id: string;
  readonly name: string;
  readonly province: SriLankaProvince;
}

/**
 * Authoritative alphabetical list of all 25 Sri Lankan districts across 9 provinces.
 */
export const SRI_LANKA_DISTRICTS: readonly SriLankaDistrict[] = [
  { id: 'Ampara', name: 'Ampara', province: 'Eastern' },
  { id: 'Anuradhapura', name: 'Anuradhapura', province: 'North Central' },
  { id: 'Badulla', name: 'Badulla', province: 'Uva' },
  { id: 'Batticaloa', name: 'Batticaloa', province: 'Eastern' },
  { id: 'Colombo', name: 'Colombo', province: 'Western' },
  { id: 'Galle', name: 'Galle', province: 'Southern' },
  { id: 'Gampaha', name: 'Gampaha', province: 'Western' },
  { id: 'Hambantota', name: 'Hambantota', province: 'Southern' },
  { id: 'Jaffna', name: 'Jaffna', province: 'Northern' },
  { id: 'Kalutara', name: 'Kalutara', province: 'Western' },
  { id: 'Kandy', name: 'Kandy', province: 'Central' },
  { id: 'Kegalle', name: 'Kegalle', province: 'Sabaragamuwa' },
  { id: 'Kilinochchi', name: 'Kilinochchi', province: 'Northern' },
  { id: 'Kurunegala', name: 'Kurunegala', province: 'North Western' },
  { id: 'Mannar', name: 'Mannar', province: 'Northern' },
  { id: 'Matale', name: 'Matale', province: 'Central' },
  { id: 'Matara', name: 'Matara', province: 'Southern' },
  { id: 'Monaragala', name: 'Monaragala', province: 'Uva' },
  { id: 'Mullaitivu', name: 'Mullaitivu', province: 'Northern' },
  { id: 'Nuwara Eliya', name: 'Nuwara Eliya', province: 'Central' },
  { id: 'Polonnaruwa', name: 'Polonnaruwa', province: 'North Central' },
  { id: 'Puttalam', name: 'Puttalam', province: 'North Western' },
  { id: 'Ratnapura', name: 'Ratnapura', province: 'Sabaragamuwa' },
  { id: 'Trincomalee', name: 'Trincomalee', province: 'Eastern' },
  { id: 'Vavuniya', name: 'Vavuniya', province: 'Northern' },
] as const;

export type SriLankaDistrictName = typeof SRI_LANKA_DISTRICTS[number]['name'];

/**
 * Standard dropdown options for filtering by province.
 */
export const ADMIN_PROVINCE_FILTER_OPTIONS: readonly { key: string; label: string }[] = [
  { key: 'all', label: 'All Provinces' },
  ...SRI_LANKA_PROVINCES.map((p) => ({ key: p, label: `${p} Province` })),
];

/**
 * Standard dropdown options for filtering by district (all 25 districts).
 */
export const ADMIN_DISTRICT_FILTER_OPTIONS: readonly { key: string; label: string }[] = [
  { key: 'all', label: 'All Districts' },
  ...SRI_LANKA_DISTRICTS.map((d) => ({ key: d.name, label: d.name })),
];

/**
 * Retrieves all districts belonging to the specified province.
 * If 'all' or empty is passed, returns all 25 districts.
 */
export function getDistrictsByProvince(province: string): readonly SriLankaDistrict[] {
  if (!province || province === 'all') {
    return SRI_LANKA_DISTRICTS;
  }
  const normalized = province.trim().toLowerCase();
  return SRI_LANKA_DISTRICTS.filter(
    (d) => d.province.toLowerCase() === normalized
  );
}

/**
 * Generates dependent district dropdown options based on the chosen province.
 * Prefixed with 'All Districts'.
 */
export function getDistrictFilterOptionsByProvince(province: string): readonly { key: string; label: string }[] {
  if (!province || province === 'all') {
    return [{ key: 'all', label: 'All Districts' }];
  }
  const districts = getDistrictsByProvince(province);
  return [
    { key: 'all', label: 'All Districts' },
    ...districts.map((d) => ({ key: d.name, label: d.name })),
  ];
}

/**
 * Mapping of each province to its district names.
 */
export const PROVINCE_DISTRICT_MAP: Record<SriLankaProvince, readonly SriLankaDistrictName[]> = {
  Northern: ['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'],
  Eastern: ['Ampara', 'Batticaloa', 'Trincomalee'],
  Western: ['Colombo', 'Gampaha', 'Kalutara'],
  Central: ['Kandy', 'Matale', 'Nuwara Eliya'],
  Southern: ['Galle', 'Hambantota', 'Matara'],
  'North Western': ['Kurunegala', 'Puttalam'],
  'North Central': ['Anuradhapura', 'Polonnaruwa'],
  Uva: ['Badulla', 'Monaragala'],
  Sabaragamuwa: ['Kegalle', 'Ratnapura'],
};

/**
 * Returns the province name for a given district, or undefined if unknown.
 */
export function getProvinceByDistrict(districtName: string): SriLankaProvince | undefined {
  if (!districtName) return undefined;
  const match = SRI_LANKA_DISTRICTS.find(
    (d) => d.name.toLowerCase() === districtName.trim().toLowerCase()
  );
  return match?.province;
}
