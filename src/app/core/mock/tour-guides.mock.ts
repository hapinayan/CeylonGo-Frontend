import {
  TourCategory,
  TourGuide,
  TourGuideReview,
  TourPackage,
} from '../models/tour-guide.models';

/**
 * Approved CeylonGo Tour Guide Activity Categories
 */
export const TOUR_GUIDE_CATEGORIES: TourCategory[] = [
  {
    id: 'all',
    name: 'All Guides',
    slug: 'all-guides',
    icon: 'grid',
    description: 'Browse all verified local tour guides across Sri Lanka',
  },
  {
    id: 'nature-hiking',
    name: 'Nature & Hiking',
    slug: 'nature-hiking',
    icon: 'mountain',
    description: 'Mountain trails, Knuckles, Horton Plains & waterfall hikes',
  },
  {
    id: 'culture-heritage',
    name: 'Culture & Heritage',
    slug: 'culture-heritage',
    icon: 'temple',
    description: 'Ancient kingdoms, Sigiriya, Polonnaruwa, sacred temples',
  },
  {
    id: 'sightseeing',
    name: 'Sightseeing',
    slug: 'sightseeing',
    icon: 'camera',
    description: 'Iconic landmarks, scenic viewpoints & tea plantations',
  },
  {
    id: 'eco-tourism',
    name: 'Eco-Tourism',
    slug: 'eco-tourism',
    icon: 'leaf',
    description: 'Rainforest treks, wildlife conservation & sustainable excursions',
  },
  {
    id: 'beach-coastal',
    name: 'Beach & Coastal',
    slug: 'beach-coastal',
    icon: 'wave',
    description: 'Southern surf coasts, whale watching & marine adventures',
  },
  {
    id: 'adventure-tours',
    name: 'Adventure Tours',
    slug: 'adventure-tours',
    icon: 'route',
    description: 'Rock climbing, white water rafting & off-road safaris',
  },
  {
    id: 'city-tours',
    name: 'City Tours',
    slug: 'city-tours',
    icon: 'car',
    description: 'Colombo street food walks, Galle Fort history & Kandy culture',
  },
];

export const POPULAR_LOCATIONS: string[] = [
  'All Locations',
  'Kandy',
  'Ella',
  'Galle',
  'Sigiriya',
  'Nuwara Eliya',
  'Colombo',
  'Mirissa',
  'Yala & Tissamaharama',
  'Anuradhapura',
  'Trincomalee',
  'Jaffna',
];

export const AVAILABLE_LANGUAGES: string[] = [
  'English',
  'Sinhala',
  'Tamil',
  'German',
  'French',
  'Russian',
  'Italian',
  'Japanese',
  'Chinese',
];

const LOCATION_COORDS: Record<string, { lat: number; lng: number; meetingPoint: string }> = {
  Kandy: {
    lat: 7.2906,
    lng: 80.6337,
    meetingPoint: 'Kandy Lake Queen’s Hotel Main Entrance Arch',
  },
  Ella: {
    lat: 6.8667,
    lng: 81.0466,
    meetingPoint: 'Ella Railway Station Main Ticket Hall',
  },
  Yala: {
    lat: 6.3728,
    lng: 81.5169,
    meetingPoint: 'Tissamaharama Lake Clock Tower Safari Hub',
  },
  Galle: {
    lat: 6.026,
    lng: 80.217,
    meetingPoint: 'Galle Fort Main Clock Tower Rampart Gate',
  },
  Knuckles: {
    lat: 7.4512,
    lng: 80.7811,
    meetingPoint: 'Bambarella Trailhead Conservation Gate',
  },
  'Nuwara Eliya': {
    lat: 6.9497,
    lng: 80.7891,
    meetingPoint: 'Grand Hotel Road Central Post Office Junction',
  },
  Sigiriya: {
    lat: 7.957,
    lng: 80.7603,
    meetingPoint: 'Sigiriya Lion Rock South Ticket Counter Plaza',
  },
  Mirissa: {
    lat: 5.9483,
    lng: 80.4716,
    meetingPoint: 'Mirissa Fisheries Harbour Jetty Gate 1',
  },
};

function resolveCoordsForLocation(loc: string): { lat: number; lng: number; meetingPoint: string } {
  for (const [key, value] of Object.entries(LOCATION_COORDS)) {
    if (loc.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return {
    lat: 7.2906,
    lng: 80.6337,
    meetingPoint: `${loc} City Central Meeting Plaza`,
  };
}

function buildDefaultPackages(guide: TourGuide): TourPackage[] {
  const baseLoc = guide.location.split('&')[0].trim();
  const basePrice = guide.pricePerDay;

  return [
    {
      id: `${guide.id}-pkg-full`,
      name: `${baseLoc} Full-Day Private Guided Tour`,
      tourType: 'Private Day Tour',
      shortDescription: `Comprehensive full-day guided itinerary tailored to your pace across ${guide.location}.`,
      imageUrl: guide.coverImageUrl,
      durationLabel: 'Full Day (8 hours)',
      durationDays: 1,
      maxGroupSize: 8,
      destinations: guide.specialties?.slice(0, 3) || [`${baseLoc} Cultural Landmarks`, `${baseLoc} Viewpoints`],
      price: basePrice,
      pricingUnit: 'per_day',
      currency: guide.currency,
      availableTimes: ['07:30 AM', '09:00 AM'],
      highlights: guide.specialties || [`Authentic ${baseLoc} guided walk`, 'Hidden local spots'],
      included: [
        'Licensed private local tour guide',
        'Custom route & timing flexibility',
        'Ceylon tea & bottled water break',
      ],
      excluded: [
        'Site entrance tickets & camera permits',
        'Meals & personal transfers outside city limit',
      ],
    },
    {
      id: `${guide.id}-pkg-half`,
      name: `${baseLoc} Express Heritage & Sunrise Walk`,
      tourType: 'Half-Day Small Group',
      shortDescription: `Focused 4-hour morning or sunset exploration led by ${guide.name}.`,
      imageUrl: '/images/sigiriya.jpg',
      durationLabel: '4 Hours',
      durationDays: 1,
      maxGroupSize: 10,
      destinations: guide.specialties?.slice(0, 2) || [`${baseLoc} Core Trail`],
      price: Math.round(basePrice * 0.45),
      pricingUnit: 'per_person',
      currency: guide.currency,
      availableTimes: ['06:00 AM', '03:30 PM'],
      highlights: ['Ideal half-day itinerary', 'Curated photography stops'],
      included: ['Guided commentary in preferred language', 'Local market tasting stop'],
      excluded: ['Monument entry passes', 'Hotel pickup'],
    },
    {
      id: `${guide.id}-pkg-group`,
      name: `${baseLoc} Family & Private Group Excursion`,
      tourType: 'Private Group Package',
      shortDescription: `All-inclusive private guide charter for families and small groups up to 6 travelers.`,
      imageUrl: guide.coverImageUrl,
      durationLabel: '6 Hours',
      durationDays: 1,
      maxGroupSize: 6,
      destinations: guide.specialties || [`${baseLoc} Scenic Route`],
      price: Math.round(basePrice * 1.35),
      pricingUnit: 'per_group',
      currency: guide.currency,
      availableTimes: ['08:30 AM', '01:30 PM'],
      highlights: ['Fixed flat group pricing', 'Family-friendly relaxed pacing'],
      included: ['Dedicated private guide for entire group', 'Route storytelling & safety briefing'],
      excluded: ['Lunches and entrance tickets'],
    },
  ];
}

function buildSampleReviews(guide: TourGuide): TourGuideReview[] {
  if (Number(guide.id.replace('guide-', '')) % 9 === 0) {
    return [];
  }
  return [
    {
      id: `${guide.id}-rev-1`,
      authorName: 'Elena M. (Sample Review)',
      rating: guide.rating,
      date: 'Nov 2026',
      comment: `${guide.name} planned an unforgettable day around ${guide.location}. Clear communication, deep local insight, and punctual meeting.`,
    },
    {
      id: `${guide.id}-rev-2`,
      authorName: 'Daniel K. (Sample Review)',
      rating: Number(Math.max(4.5, guide.rating - 0.1).toFixed(1)),
      date: 'Oct 2026',
      comment: `Highly knowledgeable and attentive to safety throughout the itinerary. Great recommendations for local food stops.`,
    },
  ];
}

function enrichGuide(base: TourGuide): TourGuide {
  const geo = resolveCoordsForLocation(base.location);
  const rawGallery = base.galleryImages?.length
    ? base.galleryImages
    : [base.coverImageUrl, '/images/sigiriya.jpg'];
  const distinctGallery = Array.from(new Set(rawGallery.filter(Boolean)));

  return {
    ...base,
    pricingUnit: base.pricingUnit || 'per_day',
    galleryImages: distinctGallery,
    licenseStatus: base.verified
      ? 'SLTDA & CeylonGo Credential Verified (Preview)'
      : 'Standard Profile (Verification Pending)',
    qualifications: base.qualifications || [
      base.verified ? 'Sri Lanka Tourism Licensed Guide' : 'Registered Local Excursion Host',
      'First Aid & Emergency Trail Response Certified',
      `Fluent in ${base.languages.join(', ')}`,
    ],
    localKnowledge:
      base.localKnowledge ||
      `Specialist in ${base.location} routes, seasonal weather windows, and community-led heritage experiences.`,
    meetingPoint: base.meetingPoint || geo.meetingPoint,
    meetingCoords: base.meetingCoords || { lat: geo.lat, lng: geo.lng },
    safetyRequirements:
      base.safetyRequirements ||
      'Wear comfortable walking shoes, carry sun protection and drinking water, and follow guide briefings at viewpoints and temples.',
    cancellationPolicy:
      base.cancellationPolicy ||
      'Free cancellation up to 24 hours before scheduled departure. Weather-related safety adjustments are coordinated directly with your guide.',
    packages: base.packages || buildDefaultPackages(base),
    reviews: base.reviews ?? buildSampleReviews(base),
    isPreviewSample: true,
  };
}

/**
 * Featured guides from the approved reference design (Ranked 1 to 8)
 */
const BASE_FEATURED_GUIDES: TourGuide[] = [
  {
    id: 'guide-1',
    name: 'Chaminda Perera',
    featuredRank: 1,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1546708973-b339540b5162?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1546708973-b339540b5162?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&auto=format&fit=crop&q=80',
      '/images/sigiriya.jpg',
    ],
    verified: true,
    rating: 4.9,
    reviewsCount: 214,
    experienceYears: 7,
    languages: ['English', 'Sinhala'],
    pricePerDay: 8000,
    currency: 'LKR',
    location: 'Kandy & Central Highlands',
    categoryIds: ['nature-hiking', 'culture-heritage', 'sightseeing'],
    headline: 'Certified National Tourist Guide & Tea Country Specialist',
    about: 'Passionate Sri Lankan guide with 7+ years of leading travelers through hidden waterfalls, spice gardens, and sacred Buddhist heritage sites around Kandy and Nuwara Eliya.',
    specialties: ['Kandy Cultural Walk', 'Hanthana Mountain Trekking', 'Spice Garden Discovery'],
    phone: '+94 77 123 4567',
    email: 'chaminda.p@ceylongo.lk',
  },
  {
    id: 'guide-2',
    name: 'Nadee Fernando',
    featuredRank: 2,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
    ],
    verified: true,
    rating: 4.8,
    reviewsCount: 176,
    experienceYears: 5,
    languages: ['English', 'Sinhala', 'Tamil'],
    pricePerDay: 7500,
    currency: 'LKR',
    location: 'Ella & Badulla Highlands',
    categoryIds: ['nature-hiking', 'sightseeing', 'eco-tourism'],
    headline: 'Ella Rock & Nine Arch Bridge Eco-Guide',
    about: 'Local mountaineer and photography enthusiast who knows every secret sunrise spot, tea estate trail, and viewpoint in Ella and the southern hills.',
    specialties: ['Ella Rock Sunrise Trek', 'Nine Arch Photography Walk', 'Diyaluma Waterfall Excursion'],
    phone: '+94 71 234 5678',
    email: 'nadee.f@ceylongo.lk',
  },
  {
    id: 'guide-3',
    name: 'Saman Wijesinghe',
    featuredRank: 3,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80',
    ],
    verified: true,
    rating: 4.9,
    reviewsCount: 342,
    experienceYears: 10,
    languages: ['English', 'German'],
    pricePerDay: 12000,
    currency: 'LKR',
    location: 'Yala & Udawalawe Wildlife Zone',
    categoryIds: ['eco-tourism', 'adventure-tours', 'sightseeing'],
    headline: 'Senior Wildlife Safari Tracker & Leopard Specialist',
    about: 'Former Department of Wildlife naturalist with a decade of safari leadership in Yala Block 1, Lunugamvehera, and Udawalawe National Park.',
    specialties: ['Yala Leopard Safari', 'Bird Watching Excursions', 'Udawalawe Elephant Sanctuary Tour'],
    phone: '+94 77 345 6789',
    email: 'saman.w@ceylongo.lk',
  },
  {
    id: 'guide-4',
    name: 'Tharushi Silva',
    featuredRank: 4,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&auto=format&fit=crop&q=80',
    verified: true,
    rating: 4.8,
    reviewsCount: 139,
    experienceYears: 6,
    languages: ['English', 'French'],
    pricePerDay: 9000,
    currency: 'LKR',
    location: 'Galle Fort & Southern Coast',
    categoryIds: ['culture-heritage', 'beach-coastal', 'city-tours'],
    headline: 'UNESCO Galle Fort Historian & Coastal Storyteller',
    about: 'Archaeology graduate and licensed guide specializing in Portuguese, Dutch, and British colonial history, paired with Galle artisan workshops.',
    specialties: ['Historic Fort Ramparts Tour', 'Southern Secret Beaches', 'Ceylon Gem & Mask Craft Walk'],
    phone: '+94 76 456 7890',
    email: 'tharushi.s@ceylongo.lk',
  },
  {
    id: 'guide-5',
    name: 'Kasun Bandara',
    featuredRank: 5,
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&auto=format&fit=crop&q=80',
    verified: true,
    rating: 4.9,
    reviewsCount: 287,
    experienceYears: 8,
    languages: ['English', 'Sinhala'],
    pricePerDay: 10000,
    currency: 'LKR',
    location: 'Knuckles Mountain Range & Matale',
    categoryIds: ['nature-hiking', 'adventure-tours', 'eco-tourism'],
    headline: 'Knuckles Wilderness Survival & Trekking Guide',
    about: 'Certified outdoor guide leading remote multi-day expeditions through cloud forests, village homestays, and untouched river cascades.',
    specialties: ['High Knuckles 5-Peaks Trek', 'Wilderness Camping', 'Traditional Meemure Village Experience'],
    phone: '+94 77 567 8901',
    email: 'kasun.b@ceylongo.lk',
  },
  {
    id: 'guide-6',
    name: 'Ishara Jayasinghe',
    featuredRank: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
    verified: true,
    rating: 4.7,
    reviewsCount: 98,
    experienceYears: 4,
    languages: ['English', 'Tamil'],
    pricePerDay: 6500,
    currency: 'LKR',
    location: 'Nuwara Eliya & Horton Plains',
    categoryIds: ['eco-tourism', 'sightseeing', 'nature-hiking'],
    headline: 'Little England Botanical & High-Altitude Trek Guide',
    about: 'Friendly hill-country native sharing the wonders of Horton Plains National Park, Worlds End precipice, and historic Ceylon tea estates.',
    specialties: ['Worlds End Early Dawn Trek', 'Pedro Tea Estate Walking Tour', 'Lake Gregory & Victoria Park Stroll'],
    phone: '+94 70 678 9012',
    email: 'ishara.j@ceylongo.lk',
  },
  {
    id: 'guide-7',
    name: 'Ruwan Dissanayake',
    featuredRank: 7,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    coverImageUrl: '/images/sigiriya.jpg',
    galleryImages: ['/images/sigiriya.jpg'],
    verified: true,
    rating: 4.9,
    reviewsCount: 411,
    experienceYears: 12,
    languages: ['English', 'German', 'French'],
    pricePerDay: 15000,
    currency: 'LKR',
    location: 'Sigiriya & Cultural Triangle',
    categoryIds: ['culture-heritage', 'sightseeing', 'adventure-tours'],
    headline: 'Senior Cultural Triangle Historian & Sigiriya Specialist',
    about: 'Expert lecturer with 12 years of guiding archaeological visits to Sigiriya Lion Rock, Dambulla Cave Temple, and ancient Polonnaruwa ruins.',
    specialties: ['Sigiriya Lion Rock VIP Sunrise', 'Dambulla Golden Cave Tour', 'Pidurangala Rock Sunset Hike'],
    phone: '+94 77 789 0123',
    email: 'ruwan.d@ceylongo.lk',
  },
  {
    id: 'guide-8',
    name: 'Malitha Fernando',
    featuredRank: 8,
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    verified: true,
    rating: 4.8,
    reviewsCount: 167,
    experienceYears: 5,
    languages: ['English', 'Sinhala', 'French'],
    pricePerDay: 7000,
    currency: 'LKR',
    location: 'Mirissa, Weligama & Matara',
    categoryIds: ['beach-coastal', 'sightseeing', 'adventure-tours'],
    headline: 'Blue Ocean Safari & Surf Coast Adventure Guide',
    about: 'Local marine enthusiast offering blue whale watching excursions, Weligama beginner surfing sessions, and secret sunset cove discovery.',
    specialties: ['Whale & Dolphin Watching', 'Surf Coaching & Board Rental Tour', 'Coconut Tree Hill Sunset'],
    phone: '+94 71 890 1234',
    email: 'malitha.f@ceylongo.lk',
  },
];

function generate128MockGuides(): TourGuide[] {
  const locations = [
    'Kandy', 'Ella', 'Galle', 'Sigiriya', 'Nuwara Eliya',
    'Colombo', 'Mirissa', 'Yala', 'Trincomalee', 'Jaffna',
    'Bentota', 'Anuradhapura', 'Polonnaruwa', 'Arugam Bay', 'Hiriketiya',
  ];

  const categoryPool = [
    'nature-hiking', 'culture-heritage', 'sightseeing',
    'eco-tourism', 'beach-coastal', 'adventure-tours', 'city-tours',
  ];

  const firstNames = [
    'Chathura', 'Sunil', 'Dhammika', 'Priyantha', 'Sanduni',
    'Anura', 'Kavinda', 'Lakmal', 'Shenali', 'Rohan',
    'Nimal', 'Asanka', 'Suranga', 'Kushani', 'Indika',
    'Thilina', 'Geeth', 'Prasanna', 'Dilshan', 'Madusha',
  ];

  const lastNames = [
    'Jayawardena', 'Gunasekara', 'Wickramasinghe', 'Rajapaksha', 'Cooray',
    'Abeysekera', 'Ranasinghe', 'Senanayake', 'Alwis', 'Karunaratne',
    'Mendis', 'Peiris', 'Fonseka', 'Herath', 'Pathirana',
  ];

  const languagesCombinations = [
    ['English', 'Sinhala'],
    ['English', 'Tamil'],
    ['English', 'German'],
    ['English', 'French'],
    ['English', 'Sinhala', 'Tamil'],
    ['English', 'Sinhala', 'German'],
    ['English', 'French', 'Italian'],
    ['English', 'Japanese'],
    ['English', 'Chinese', 'Sinhala'],
    ['English', 'Russian'],
  ];

  const coverImages = [
    'https://images.unsplash.com/photo-1546708973-b339540b5162?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
    '/images/sigiriya.jpg',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
  ];

  const avatars = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  ];

  const fullList: TourGuide[] = BASE_FEATURED_GUIDES.map(enrichGuide);

  for (let i = 9; i <= 128; i++) {
    const fn = firstNames[(i * 3) % firstNames.length];
    const ln = lastNames[(i * 7) % lastNames.length];
    const loc = locations[i % locations.length];
    const cats = [
      categoryPool[i % categoryPool.length],
      categoryPool[(i + 2) % categoryPool.length],
    ];
    const rating = Number((4.5 + ((i * 13) % 4) / 10).toFixed(1));
    const exp = 3 + (i % 11);
    const reviews = i % 9 === 0 ? 0 : 30 + ((i * 19) % 280);
    const price = 5000 + ((i * 500) % 10000);

    fullList.push(
      enrichGuide({
        id: `guide-${i}`,
        name: `${fn} ${ln}`,
        avatarUrl: avatars[i % avatars.length],
        coverImageUrl: coverImages[i % coverImages.length],
        verified: i % 7 !== 0,
        rating: Math.min(5.0, rating),
        reviewsCount: reviews,
        experienceYears: exp,
        languages: languagesCombinations[i % languagesCombinations.length],
        pricePerDay: price,
        currency: 'LKR',
        location: loc,
        categoryIds: cats,
        headline: `Experienced ${loc} Guide & Local Insider`,
        about: `Dedicated to giving travelers authentic Ceylon experiences across ${loc}. Highly knowledgeable in local history, trails, wildlife, and gastronomy.`,
        specialties: [`${loc} Highlights Tour`, 'Scenic Secret Spots', 'Local Culinary Experience'],
        phone: `+94 77 ${100 + (i % 899)} ${(i * 41) % 9999}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@ceylongo.lk`,
      })
    );
  }

  return fullList;
}

/**
 * 128-record sample preview dataset matching the CeylonGo reference design
 */
export const MOCK_TOUR_GUIDES: TourGuide[] = generate128MockGuides();
