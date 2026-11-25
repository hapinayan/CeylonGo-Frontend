import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TourGuideService } from './tour-guide.service';

describe('TourGuideService', () => {
  let service: TourGuideService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(TourGuideService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with 128 verified local guides matching the approved design', () => {
    expect(service.allGuides().length).toBe(128);
    expect(service.totalCount()).toBe(128);
  });

  it('should include the personas from the design screenshot', () => {
    const chaminda = service.allGuides().find(g => g.name === 'Chaminda Perera');
    const nadee = service.allGuides().find(g => g.name === 'Nadee Fernando');
    const saman = service.allGuides().find(g => g.name === 'Saman Wijesinghe');
    const tharushi = service.allGuides().find(g => g.name === 'Tharushi Silva');

    expect(chaminda).toBeDefined();
    expect(chaminda?.rating).toBe(4.9);
    expect(chaminda?.pricePerDay).toBe(8000);

    expect(nadee).toBeDefined();
    expect(nadee?.rating).toBe(4.8);
    expect(nadee?.pricePerDay).toBe(7500);

    expect(saman).toBeDefined();
    expect(saman?.pricePerDay).toBe(12000);

    expect(tharushi).toBeDefined();
    expect(tharushi?.pricePerDay).toBe(9000);
  });

  it('should filter guides by category correctly', () => {
    service.setCategory('nature-hiking');
    const filtered = service.filteredGuides();

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(g => g.categoryIds.includes('nature-hiking'))).toBe(true);
  });

  it('should filter guides by location query', () => {
    service.setLocation('Kandy');
    const filtered = service.filteredGuides();

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(g => g.location.toLowerCase().includes('kandy'))).toBe(true);
  });

  it('should sort guides by price ascending and descending', () => {
    service.setSortBy('price_asc');
    const asc = service.filteredGuides();
    expect(asc[0].pricePerDay).toBeLessThanOrEqual(asc[1].pricePerDay);

    service.setSortBy('price_desc');
    const desc = service.filteredGuides();
    expect(desc[0].pricePerDay).toBeGreaterThanOrEqual(desc[1].pricePerDay);
  });

  it('should paginate 8 guides per page matching the UI card layout', () => {
    service.resetFilters();
    expect(service.pageSize()).toBe(8);
    expect(service.paginatedGuides().length).toBe(8);
    expect(service.totalPages()).toBe(16); // 128 / 8 = 16 pages
  });

  it('should toggle and persist guide favorites', () => {
    const guideId = 'guide-2';
    const initialFav = service.isFavorite(guideId);

    service.toggleFavorite(guideId);
    expect(service.isFavorite(guideId)).toBe(!initialFav);

    service.toggleFavorite(guideId);
    expect(service.isFavorite(guideId)).toBe(initialFav);
  });

  it('should identify demo mode correctly and load guides without errors', () => {
    expect(service.isDemoMode()).toBe(true);
    service.loadGuides();
    expect(service.isLoading()).toBe(false);
    expect(service.errorMessage()).toBeNull();
    expect(service.allGuides().length).toBe(128);
  });
});
