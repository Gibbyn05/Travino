import { destinationTimeZoneFor } from './travel-info';

export type Suggestion = { label: string; value: string; detail?: string; timeZone?: string };

export const destinationSuggestions: Suggestion[] = [
  ['Phuket', 'Thailand'], ['Bangkok', 'Thailand'], ['Koh Samui', 'Thailand'], ['Bali', 'Indonesia'], ['Tokyo', 'Japan'], ['New York', 'USA'], ['Miami', 'USA'], ['Alicante', 'Spain'], ['Barcelona', 'Spain'], ['Madrid', 'Spain'], ['Mallorca', 'Spain'], ['Malaga', 'Spain'], ['Paris', 'France'], ['Nice', 'France'], ['Rome', 'Italy'], ['Amalfi', 'Italy'], ['Milan', 'Italy'], ['Lisbon', 'Portugal'], ['Madeira', 'Portugal'], ['London', 'United Kingdom'], ['Amsterdam', 'Netherlands'], ['Copenhagen', 'Denmark'], ['Stockholm', 'Sweden'], ['Reykjavik', 'Iceland'], ['Dubai', 'United Arab Emirates'], ['Cape Town', 'South Africa'], ['Sydney', 'Australia'], ['Split', 'Croatia'], ['Santorini', 'Greece'], ['Crete', 'Greece'], ['Berlin', 'Germany'], ['Marrakech', 'Morocco'],
].map(([city, country]) => ({ label: `${city}, ${country}`, value: city, detail: country, timeZone: destinationTimeZoneFor(city, country) }));

const packingItems: [string, string][] = [['Sunglasses', 'Beach & sun'], ['Sunscreen', 'Toiletries'], ['Sun hat', 'Beach & sun'], ['Sunshade', 'Beach & sun'], ['Face sunscreen', 'Toiletries'], ['Passport', 'Documents'], ['Charger', 'Electronics'], ['Charging cable', 'Electronics'], ['Power bank', 'Electronics'], ['Swimwear', 'Clothing'], ['Towel', 'Beach & sun'], ['Toiletry bag', 'Toiletries'], ['Toothbrush', 'Toiletries'], ['Toothpaste', 'Toiletries'], ['Medication', 'Health'], ['Travel insurance', 'Documents'], ['Bank card', 'Documents'], ['Cash', 'Documents'], ['Headphones', 'Electronics'], ['Adapter', 'Electronics'], ['Water bottle', 'Other'], ['Jacket', 'Clothing'], ['Rain jacket', 'Clothing'], ['Sneakers', 'Shoes'], ['Sandals', 'Shoes'], ['Underwear', 'Clothing']];
packingItems.push(['Hiking boots', 'Shoes'], ['First aid kit', 'Health']);
export const packingSuggestions: Suggestion[] = packingItems.map(([value, detail]) => ({ label: value, value, detail }));
export const packingCategorySuggestions: Suggestion[] = ['Clothing', 'Shoes', 'Toiletries', 'Beach & sun', 'Electronics', 'Documents', 'Health', 'Other'].map((value) => ({ label: value, value }));
export const suggestedPackingCategory = (title: string) => { const match = packingItems.find(([value]) => value.toLocaleLowerCase('en-US') === title.trim().toLocaleLowerCase('en-US')); return match?.[1]; };
export const activitySuggestions: Suggestion[] = ['Breakfast', 'Lunch', 'Dinner', 'Diving', 'Beach day', 'City walk', 'Museum', 'Wine tasting', 'Hike', 'Boat trip', 'Spa', 'Shopping', 'Sunset'].map((value) => ({ label: value, value }));

const activityIdeasByCountry: Record<string, string[]> = {
  thailand: ['Visit a night market', 'Take a Thai cooking class', 'Try a Thai massage', 'Explore a local temple', 'Join a street food tour', 'Watch a sunset by the beach', 'Go island hopping', 'Take a long-tail boat ride'],
  japan: ['Visit a shrine or temple', 'Explore a food market', 'Try a sushi-making class', 'Take a scenic train ride', 'Visit an onsen', 'Join a local food tour', 'Explore a traditional neighbourhood'],
  indonesia: ['Visit a local temple', 'Take a Balinese cooking class', 'Watch a sunset by the sea', 'Explore a rice terrace', 'Go snorkelling', 'Take a boat trip to a nearby island', 'Visit a local market'],
  spain: ['Join a tapas tour', 'Visit a local market', 'Take a paella cooking class', 'Explore the old town', 'Watch the sunset by the sea', 'Visit a nearby village', 'Take a coastal boat trip'],
  norway: ['Take a fjord cruise', 'Hike to a viewpoint', 'Visit a local sauna', 'Explore the harbour', 'See the northern lights', 'Take a scenic train ride', 'Visit a local museum'],
  italy: ['Take a pasta-making class', 'Join a local food tour', 'Explore the historic centre', 'Visit a local market', 'Take a coastal boat trip', 'Watch the sunset from a viewpoint'],
  france: ['Visit a local food market', 'Join a wine tasting', 'Explore the old town', 'Take a pastry-making class', 'Visit a nearby village', 'Watch the sunset by the river'],
  portugal: ['Take a coastal boat trip', 'Join a local food tour', 'Visit a food market', 'Listen to live Fado', 'Explore the old town', 'Watch the sunset by the sea'],
  morocco: ['Visit a souk', 'Join a Moroccan cooking class', 'Explore the medina', 'Take a desert day trip', 'Visit a traditional garden', 'Join a local food tour'],
  greece: ['Take a boat trip to a nearby island', 'Visit an ancient site', 'Join a Greek cooking class', 'Explore a hilltop village', 'Watch the sunset by the sea', 'Go snorkelling'],
  australia: ['Go snorkelling', 'Take a coastal walk', 'Visit a local market', 'Join a wildlife tour', 'Take a harbour cruise', 'Watch the sunset at the beach'],
  'united states': ['Join a local food tour', 'Visit a farmers market', 'Explore a nearby national park', 'Take a harbour or river cruise', 'See a live show', 'Explore a historic neighbourhood'],
  turkey: ['Explore a local bazaar', 'Join a Turkish food tour', 'Take a traditional cooking class', 'Visit a historic site', 'Take a boat trip along the coast', 'Watch the sunset from a viewpoint'],
  vietnam: ['Join a street food tour', 'Take a Vietnamese cooking class', 'Explore a local market', 'Take a boat trip on the river', 'Visit a historic temple', 'Cycle through the countryside'],
  mexico: ['Join a taco or street food tour', 'Visit an archaeological site', 'Take a Mexican cooking class', 'Explore a local market', 'Go snorkelling', 'Watch the sunset by the sea'],
  egypt: ['Visit an ancient temple', 'Take a boat trip on the Nile', 'Explore a local bazaar', 'Join a guided history tour', 'Take a desert day trip'],
  canada: ['Explore a national park', 'Take a scenic lake cruise', 'Go on a wildlife tour', 'Hike to a viewpoint', 'Visit a local food market'],
  switzerland: ['Take a scenic mountain train', 'Ride a cable car to a viewpoint', 'Hike an alpine trail', 'Visit a lakeside village', 'Take a boat across the lake'],
  germany: ['Explore the old town', 'Visit a local food market', 'Take a river cruise', 'Join a local history tour', 'Visit a nearby castle'],
  netherlands: ['Take a canal cruise', 'Cycle through the city', 'Visit a local market', 'Explore a historic neighbourhood', 'Take a day trip to a nearby village'],
  'south korea': ['Explore a traditional market', 'Try a Korean cooking class', 'Visit a palace or temple', 'Join a street food tour', 'Sing karaoke at a local bar'],
  india: ['Join a local food tour', 'Visit a historic fort or palace', 'Explore a colourful market', 'Take a cooking class', 'Watch the sunset from a viewpoint'],
  'united arab emirates': ['Take a desert safari', 'Explore a traditional souk', 'Join a local food tour', 'Take a dhow cruise', 'Watch the sunset from a viewpoint'],
  'south africa': ['Join a wildlife safari', 'Visit a local food market', 'Take a coastal walk', 'Explore a nearby wine region', 'Watch the sunset by the sea'],
  'united kingdom': ['Join a local food tour', 'Explore a historic neighbourhood', 'Visit a local market', 'Take a countryside day trip', 'See a live show'],
  iceland: ['Take a geothermal hot spring dip', 'Join a northern lights tour', 'Visit a waterfall', 'Explore a lava cave', 'Take a scenic coastal drive'],
};

const activityIdeasByCity: Record<string, string[]> = {
  phuket: ['Take a boat trip to Phang Nga Bay', 'Go island hopping to Phi Phi', 'Explore Old Phuket Town', 'Visit Wat Chalong', 'Watch sunset at Promthep Cape', 'Go snorkelling at Coral Island'],
  bangkok: ['Visit the Grand Palace and Wat Pho', 'Take a boat along the Chao Phraya River', 'Explore Chinatown after dark', 'Visit a floating market', 'Take a canal long-tail boat tour', 'See the city from a rooftop at sunset'],
  'koh samui': ['Take a boat trip to Ang Thong Marine Park', 'Visit Fisherman’s Village night market', 'Explore the Big Buddha temple', 'Go snorkelling at Koh Tao', 'Watch sunset at a beach bar'],
  'chiang mai': ['Visit Doi Suthep temple', 'Take a Thai cooking class', 'Explore the Sunday Walking Street market', 'Visit an ethical elephant sanctuary', 'Take a day trip to Doi Inthanon'],
  krabi: ['Take a long-tail boat to Railay Beach', 'Go island hopping to the Hong Islands', 'Go snorkelling in the Andaman Sea', 'Watch sunset at Ao Nang', 'Kayak through the mangroves'],
  tokyo: ['Explore Asakusa and Sensō-ji', 'Visit Shibuya Crossing', 'Try a sushi-making class', 'Explore teamLab Planets', 'Visit an izakaya in Shinjuku'],
  kyoto: ['Walk through Fushimi Inari shrine', 'Explore Arashiyama bamboo grove', 'Take part in a tea ceremony', 'Visit Nishiki food market', 'Walk the Philosopher’s Path'],
  bali: ['Visit Ubud rice terraces', 'Take a Balinese cooking class', 'Visit a water temple', 'Watch sunset at Uluwatu', 'Go snorkelling in Nusa Penida'],
  alicante: ['Explore Santa Bárbara Castle', 'Visit the Central Market', 'Take a boat to Tabarca Island', 'Walk along the Explanada promenade'],
  barcelona: ['Visit Sagrada Família', 'Explore the Gothic Quarter', 'Walk through Park Güell', 'Join a tapas and market tour'],
  oslo: ['Walk on the roof of the Opera House', 'Visit the MUNCH museum', 'Take a fjord island ferry', 'Explore the harbour at Aker Brygge'],
  molde: ['Drive the Atlantic Ocean Road', 'Visit the Molde panoramic viewpoint', 'Hike in the Romsdal mountains', 'Take a fjord cruise'],
  hanoi: ['Join a street food tour in the Old Quarter', 'Take a Vietnamese cooking class', 'Visit the Temple of Literature', 'Take a day trip to Ninh Binh'],
  istanbul: ['Take a Bosphorus boat cruise', 'Explore the Grand Bazaar', 'Visit Hagia Sophia', 'Join a Turkish food tour'],
  marrakech: ['Explore the souks of the medina', 'Visit Jardin Majorelle', 'Take a Moroccan cooking class', 'Join a guided medina walk'],
  lisbon: ['Ride the historic tram through Alfama', 'Join a pastel de nata baking class', 'Listen to live Fado', 'Take a day trip to Sintra'],
  reykjavik: ['Visit a geothermal lagoon', 'Join a northern lights tour', 'Take a Golden Circle day trip', 'Explore the harbour and old town'],
  dubai: ['Take a desert safari', 'Visit the old souks by abra boat', 'Watch sunset from a rooftop', 'Explore Al Fahidi historic district'],
  'cape town': ['Ride the cable car up Table Mountain', 'Visit the V&A Waterfront', 'Take a Cape Peninsula day trip', 'Explore the Bo-Kaap neighbourhood'],
  'new york': ['Walk through Central Park', 'Visit a neighbourhood food market', 'See a Broadway show', 'Take a harbour ferry past the Statue of Liberty'],
};

const normalisePlace = (value: string) => value.trim().toLocaleLowerCase('en-US').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Destination ideas first, followed by broader local and general activities. */
export function activitySuggestionsForDestination(city: string, country: string): Suggestion[] {
  const cityIdeas = activityIdeasByCity[normalisePlace(city)] ?? [];
  const countryIdeas = activityIdeasByCountry[normalisePlace(country)] ?? [];
  const ideas = [...cityIdeas, ...countryIdeas, ...activitySuggestions.map((item) => item.value)];
  return ideas.filter((value, index) => ideas.indexOf(value) === index).map((value) => ({
    label: value,
    value,
    detail: cityIdeas.includes(value) ? city : country,
  }));
}
export const wishSuggestions: Suggestion[] = ['Local restaurant', 'Beach', 'Viewpoint', 'Food market', 'Diving', 'Boat trip', 'Museum', 'Hike', 'Café', 'Sunset'].map((value) => ({ label: value, value }));
