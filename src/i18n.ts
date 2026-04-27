import type { ActivityTag } from './data/cities';

export type Lang = 'en' | 'fr';

export interface Translations {
  // Header
  appTitle: string;
  appSubtitle: string;

  // FilterPanel
  startingFrom: string;
  radius: string;
  radiusTip: string;
  activity: string;
  anyActivity: string;
  clearActivity: string;
  searching: string;
  errorStatus: string;
  places: (n: number) => string;
  placesWord: (n: number) => string;
  tagLabels: Record<ActivityTag, string>;

  // OriginSearch
  fromLabel: string;
  changeLabel: string;
  cityPlaceholder: string;
  searchAriaLabel: string;
  changeOriginAriaLabel: string;

  // SpinButton
  spinLabel: string;
  spinSub: string;
  spinningLabel: string;
  spinningSpub: string;

  // SlotMachine
  yourDestination: string;

  // ResultCard
  kmAway: (n: number) => string;
  distanceBadge: string;
  elevationBadge: string;
  wikiBadge: string;
  infoAvailableBadge: string;
  aboutSection: string;
  loadingDetails: string;
  onTheMap: string;
  spinAgain: string;
  notThisOne: string;
  imGoing: string;

  // Spin / load errors
  errSetCity: string;
  errStillLoading: string;
  errCouldNotLoad: string;
  errNoPlaces: string;
  errConnection: string;
}

export const en: Translations = {
  appTitle: 'Roulette Trip',
  appSubtitle: 'Set your city, spin the wheel, and discover your next day trip.',

  startingFrom: 'Starting from',
  radius: 'Radius',
  radiusTip:
    'Crow-flies distance from your chosen city. Actual travel time depends on terrain and transport options.',
  activity: 'Activity',
  anyActivity: 'Any',
  clearActivity: 'Clear',
  searching: 'searching…',
  errorStatus: 'error',
  places: (n) => `${n} places`,
  placesWord: () => 'places',
  tagLabels: {
    historic: 'Historic',
    nature: 'Nature',
    museum: 'Museum',
    beach: 'Beach',
    mountain: 'Mountain',
    cultural: 'Cultural',
    viewpoint: 'Viewpoint',
  },

  fromLabel: 'From',
  changeLabel: 'Change',
  cityPlaceholder: 'Enter your city — Paris, Tokyo, São Paulo…',
  searchAriaLabel: 'Search for your city',
  changeOriginAriaLabel: 'Change origin city',

  spinLabel: 'SPIN',
  spinSub: 'GO',
  spinningLabel: '···',
  spinningSpub: 'ROLLING',

  yourDestination: 'Your destination',

  kmAway: (n) => `${n} km away`,
  distanceBadge: 'Distance',
  elevationBadge: 'Elevation',
  wikiBadge: 'Wiki',
  infoAvailableBadge: 'Info available',
  aboutSection: 'About',
  loadingDetails: 'Loading details…',
  onTheMap: 'On the map',
  spinAgain: 'Spin again',
  notThisOne: 'Not this one →',
  imGoing: "I'm going! →",

  errSetCity: 'Set your starting city first',
  errStillLoading: 'Still loading places — wait a moment',
  errCouldNotLoad: 'Could not load places',
  errNoPlaces: 'No places found — try widening your radius or changing filters',
  errConnection: 'Could not load places — check your connection and try again.',
};

export const fr: Translations = {
  appTitle: 'Roulette Trip',
  appSubtitle: 'Choisissez votre ville, tournez la roue, et découvrez votre prochaine excursion.',

  startingFrom: 'Départ depuis',
  radius: 'Rayon',
  radiusTip:
    "Distance à vol d'oiseau depuis votre ville. Le temps de trajet réel dépend du terrain et des transports disponibles.",
  activity: 'Activité',
  anyActivity: 'Toutes',
  clearActivity: 'Effacer',
  searching: 'recherche…',
  errorStatus: 'erreur',
  places: (n) => `${n} lieu${n > 1 ? 'x' : ''}`,
  placesWord: (n) => `lieu${n > 1 ? 'x' : ''}`,
  tagLabels: {
    historic: 'Historique',
    nature: 'Nature',
    museum: 'Musée',
    beach: 'Plage',
    mountain: 'Montagne',
    cultural: 'Culturel',
    viewpoint: 'Panorama',
  },

  fromLabel: 'De',
  changeLabel: 'Changer',
  cityPlaceholder: 'Votre ville — Paris, Tokyo, São Paulo…',
  searchAriaLabel: 'Rechercher votre ville',
  changeOriginAriaLabel: 'Changer la ville de départ',

  spinLabel: 'LANCER',
  spinSub: 'GO',
  spinningLabel: '···',
  spinningSpub: 'EN COURS',

  yourDestination: 'Votre destination',

  kmAway: (n) => `à ${n} km`,
  distanceBadge: 'Distance',
  elevationBadge: 'Altitude',
  wikiBadge: 'Wiki',
  infoAvailableBadge: 'Infos disponibles',
  aboutSection: 'À propos',
  loadingDetails: 'Chargement…',
  onTheMap: 'Sur la carte',
  spinAgain: 'Relancer',
  notThisOne: 'Pas celui-là →',
  imGoing: "J'y vais ! →",

  errSetCity: 'Choisissez d\'abord votre ville de départ',
  errStillLoading: 'Chargement en cours — patientez un instant',
  errCouldNotLoad: 'Impossible de charger les lieux',
  errNoPlaces: 'Aucun lieu trouvé — essayez un rayon plus large ou d\'autres filtres',
  errConnection: 'Impossible de charger les lieux — vérifiez votre connexion.',
};

export const translations: Record<Lang, Translations> = { en, fr };
