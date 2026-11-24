import { Experience } from '../models/catalog';

export const demoExperiences: readonly Experience[] = [
  { id: 'safari', title: 'Wildlife Safari', location: 'Yala National Park', category: 'wildlife', rating: 4.9, reviews: 156, price: 18000, unit: 'person' },
  { id: 'tea', title: 'Tea Plantation Experience', location: 'Nuwara Eliya', category: 'eco', rating: 4.8, reviews: 112, price: 7500, unit: 'person' },
  { id: 'village', title: 'Cultural Village Tour', location: 'Habarana', category: 'culture', rating: 4.9, reviews: 98, price: 6000, unit: 'person' },
  { id: 'snorkel', title: 'Snorkeling in Trincomalee', location: 'Trincomalee', category: 'water', rating: 4.8, reviews: 124, price: 9500, unit: 'person' },
  { id: 'rafting', title: 'White Water Rafting', location: 'Kitulgala', category: 'adventure', rating: 4.8, reviews: 87, price: 12000, unit: 'person' },
  { id: 'hike', title: "Little Adam's Peak Hike", location: 'Ella', category: 'hiking', rating: 4.9, reviews: 201, price: 4000, unit: 'person' },
  { id: 'cooking', title: 'Sri Lankan Cooking Class', location: 'Galle', category: 'food', rating: 4.8, reviews: 112, price: 5500, unit: 'person' },
  { id: 'mangrove', title: 'Mangrove Exploration', location: 'Bentota', category: 'eco', rating: 4.9, reviews: 63, price: 6500, unit: 'person' },
  { id: 'sigiriya', title: 'Sigiriya Rock Walk', location: 'Sigiriya', category: 'culture', rating: 4.9, reviews: 55, price: 7000, unit: 'person', image: 'images/sigiriya.jpg', imageAlt: 'Sigiriya rock rising above the surrounding forest' },
  { id: 'birdwalk', title: 'Wetland Bird Walk', location: 'Colombo', category: 'eco', rating: 4.7, reviews: 41, price: 3500, unit: 'person' },
];
