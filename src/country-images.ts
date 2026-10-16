// Curated, fixed Unsplash stock photos. Every trip to a supported country uses the
// same image. Unknown countries deliberately have no photo rather than a misleading fallback.
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=82`;

const covers: Record<string, string> = {
  thailand: image('photo-1528181304800-259b08848526'), indonesia: image('photo-1537996194471-e657df975ab4'), japan: image('photo-1493976040374-85c8e12f0c0e'), usa: image('photo-1485871981521-5b1fd3805eee'),
  spania: image('photo-1543783207-ec64e4d95325'), spain: image('photo-1543783207-ec64e4d95325'), frankrike: image('photo-1502602898657-3e91760cbb34'), france: image('photo-1502602898657-3e91760cbb34'),
  italia: image('photo-1529260830199-42c24126f198'), italy: image('photo-1529260830199-42c24126f198'), portugal: image('photo-1555881400-74d7b7fd1a1f'),
  storbritannia: image('photo-1513635269975-59663e0ac1ad'), 'united kingdom': image('photo-1513635269975-59663e0ac1ad'), nederland: image('photo-1534351590666-13e3e96b5017'), netherlands: image('photo-1534351590666-13e3e96b5017'),
  danmark: image('photo-1513622470522-26c3c8a854bc'), denmark: image('photo-1513622470522-26c3c8a854bc'), sverige: image('photo-1509356843151-3e7d96241e11'), sweden: image('photo-1509356843151-3e7d96241e11'), island: image('photo-1504829857797-ddff29c27927'), iceland: image('photo-1504829857797-ddff29c27927'),
  'de forente arabiske emirater': image('photo-1512453979798-5ea266f8880c'), 'united arab emirates': image('photo-1512453979798-5ea266f8880c'), 'sør-afrika': image('photo-1580060839134-75a5edca2e99'), 'south africa': image('photo-1580060839134-75a5edca2e99'), australia: image('photo-1506973035872-a4ec16b8e8d9'),
  kroatia: image('photo-1555990538-1e6c8a05636d'), croatia: image('photo-1555990538-1e6c8a05636d'), hellas: image('photo-1530841377377-3ff06c0ca713'), greece: image('photo-1530841377377-3ff06c0ca713'), tyskland: image('photo-1467269204594-9661b134dd2b'), germany: image('photo-1467269204594-9661b134dd2b'), marokko: image('photo-1548013146-72479768bada'), morocco: image('photo-1548013146-72479768bada'),
};

const aliases: Record<string, string> = {
  'united states': 'usa', 'united states of america': 'usa', us: 'usa',
  'great britain': 'united kingdom', britain: 'united kingdom', uk: 'united kingdom',
  holland: 'netherlands', 'the netherlands': 'netherlands', uae: 'united arab emirates',
};
const normalise = (country: string) => country.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US');
export const stockCoverForCountry = (country: string): string | undefined => {
  const key = normalise(country);
  return covers[aliases[key] ?? key];
};
