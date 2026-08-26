// Shared SI unit reference data — used by the Chapter 1 "units" archetypes
// and by the equation sheet. Kept separate so both can cite the same facts.

export const SI_BASE_UNITS = [
  { quantity: 'length', unit: 'meter', symbol: 'm' },
  { quantity: 'mass', unit: 'kilogram', symbol: 'kg' },
  { quantity: 'time', unit: 'second', symbol: 's' },
  { quantity: 'temperature', unit: 'kelvin', symbol: 'K' },
  { quantity: 'electric current', unit: 'ampere', symbol: 'A' },
  { quantity: 'amount of substance', unit: 'mole', symbol: 'mol' },
  { quantity: 'luminous intensity', unit: 'candela', symbol: 'cd' },
];

// Each derived quantity: how it's built from base/derived units, in a form
// suitable for "what's the SI unit of X" multiple-choice questions.
export const DERIVED_UNITS = [
  { quantity: 'speed', definition: 'distance / time', unit: 'm/s' },
  { quantity: 'acceleration', definition: 'change in velocity / time', unit: 'm/s²' },
  { quantity: 'force', definition: 'mass × acceleration', unit: 'kg·m/s² (N)' },
  { quantity: 'pressure', definition: 'force / area', unit: 'N/m² (Pa)' },
  { quantity: 'energy (work)', definition: 'force × distance', unit: 'N·m (J)' },
  { quantity: 'power', definition: 'energy / time', unit: 'J/s (W)' },
  { quantity: 'momentum', definition: 'mass × velocity', unit: 'kg·m/s' },
  { quantity: 'density', definition: 'mass / volume', unit: 'kg/m³' },
];
