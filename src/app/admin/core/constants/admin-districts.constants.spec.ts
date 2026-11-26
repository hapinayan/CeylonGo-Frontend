import { describe, expect, it } from 'vitest';
import {
  ADMIN_DISTRICT_FILTER_OPTIONS,
  ADMIN_PROVINCE_FILTER_OPTIONS,
  PROVINCE_DISTRICT_MAP,
  SRI_LANKA_DISTRICTS,
  SRI_LANKA_PROVINCES,
  getDistrictFilterOptionsByProvince,
  getDistrictsByProvince,
} from './admin-districts.constants';

describe('Sri Lankan Provinces and Districts Constants', () => {
  it('should contain exactly 9 official Sri Lankan provinces', () => {
    expect(SRI_LANKA_PROVINCES.length).toBe(9);
    expect(SRI_LANKA_PROVINCES).toEqual([
      'Central',
      'Eastern',
      'North Central',
      'Northern',
      'North Western',
      'Sabaragamuwa',
      'Southern',
      'Uva',
      'Western',
    ]);
  });

  it('should contain exactly 25 official Sri Lankan districts', () => {
    expect(SRI_LANKA_DISTRICTS.length).toBe(25);
  });

  it('should be sorted in alphabetical order', () => {
    const names = SRI_LANKA_DISTRICTS.map((d) => d.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('should normalize Badulla without location suffix', () => {
    const badulla = SRI_LANKA_DISTRICTS.find((d) => d.id === 'Badulla');
    expect(badulla).toBeDefined();
    expect(badulla?.name).toBe('Badulla');
    expect(badulla?.province).toBe('Uva');
  });

  it('should correctly map districts for all 9 provinces in PROVINCE_DISTRICT_MAP', () => {
    expect(PROVINCE_DISTRICT_MAP.Northern).toEqual([
      'Jaffna',
      'Kilinochchi',
      'Mannar',
      'Mullaitivu',
      'Vavuniya',
    ]);
    expect(PROVINCE_DISTRICT_MAP.Eastern).toEqual(['Ampara', 'Batticaloa', 'Trincomalee']);
    expect(PROVINCE_DISTRICT_MAP.Western).toEqual(['Colombo', 'Gampaha', 'Kalutara']);
    expect(PROVINCE_DISTRICT_MAP.Central).toEqual(['Kandy', 'Matale', 'Nuwara Eliya']);
    expect(PROVINCE_DISTRICT_MAP.Southern).toEqual(['Galle', 'Hambantota', 'Matara']);
    expect(PROVINCE_DISTRICT_MAP['North Western']).toEqual(['Kurunegala', 'Puttalam']);
    expect(PROVINCE_DISTRICT_MAP['North Central']).toEqual(['Anuradhapura', 'Polonnaruwa']);
    expect(PROVINCE_DISTRICT_MAP.Uva).toEqual(['Badulla', 'Monaragala']);
    expect(PROVINCE_DISTRICT_MAP.Sabaragamuwa).toEqual(['Kegalle', 'Ratnapura']);
  });

  it('should filter districts by province using getDistrictsByProvince', () => {
    const northern = getDistrictsByProvince('Northern');
    expect(northern.length).toBe(5);
    expect(northern.every((d) => d.province === 'Northern')).toBe(true);

    const western = getDistrictsByProvince('Western');
    expect(western.length).toBe(3);
    expect(western.map((d) => d.name)).toEqual(['Colombo', 'Gampaha', 'Kalutara']);

    const all = getDistrictsByProvince('all');
    expect(all.length).toBe(25);
  });

  it('should generate dependent district filter options using getDistrictFilterOptionsByProvince', () => {
    const westernOptions = getDistrictFilterOptionsByProvince('Western');
    expect(westernOptions.length).toBe(4); // 'All Districts' + 3 districts
    expect(westernOptions[0]).toEqual({ key: 'all', label: 'All Districts' });
    expect(westernOptions.map((o) => o.key)).toEqual(['all', 'Colombo', 'Gampaha', 'Kalutara']);

    const allOptions = getDistrictFilterOptionsByProvince('all');
    expect(allOptions.length).toBe(1);
    expect(allOptions[0]).toEqual({ key: 'all', label: 'All Districts' });
  });

  it('should provide standard province filter options prefixed with All Provinces', () => {
    expect(ADMIN_PROVINCE_FILTER_OPTIONS.length).toBe(10);
    expect(ADMIN_PROVINCE_FILTER_OPTIONS[0]).toEqual({ key: 'all', label: 'All Provinces' });
    expect(ADMIN_PROVINCE_FILTER_OPTIONS[1]).toEqual({ key: 'Central', label: 'Central Province' });
  });
});
