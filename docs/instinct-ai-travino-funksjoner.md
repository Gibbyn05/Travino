# Travino funksjonsbeskrivelse for Instinct AI

**Dato:** 21. oktober 2026  
**Tidspunkt:** 11:10 CEST  
**Mottaker:** Instinct AI  
**Omfang:** Funksjonene som er synlige eller implementert i Travino-koden på dette tidspunktet

## Formål og lesemåte

Dette dokumentet beskriver Travino slik appen faktisk er bygget nå. Det er skrevet som en arbeidsbeskrivelse til Instinct AI, slik at videre analyse, testing og utvikling kan gjøres mot samme funksjonsforståelse.

Beskrivelsen skiller mellom tre situasjoner:

- **Implementert:** Funksjonen finnes i appen og har en aktiv brukerflyt.
- **Betinget:** Funksjonen finnes, men avhenger av innlogging, Supabase, nettverk, enhetstillatelse eller at data finnes.
- **Begrensning:** Funksjonen har en kjent avgrensning eller en plattformforskjell som må tas med i vurderingen.

Travino er en personlig reiseapp. Hovedideen er at hver reise får ett samlet sted for planlegging, praktisk informasjon, samarbeid og minner. Appen har en rolig, varm visuell stil med blå aksenter, avrundede flater, Nunito-typografi og capybara-illustrasjoner.

## Appstruktur

På iPhone og Android er hovednavigasjonen en flytende tab-bar med disse seks områdene:

1. **Home**
2. **Trip**
3. **Map**
4. **Days**, som er nedtellingsområdet
5. **Friends**
6. **Profile**

Web bruker en egen, enklere navigasjonsvariant. Onboarding, ny reise, premiumområdet og aktivitetsbrowseren ligger som egne ruter utenfor tab-baren.

## Første oppstart og onboarding

Onboarding består av sju steg i denne rekkefølgen:

1. Introduksjon til planlegging
2. Introduksjon til kart, kompass og billetter
3. Introduksjon til minner og reise
4. Navn
5. Alder
6. Hvor brukeren kommer fra
7. Velkomst og oppsummering

Intro-stegene viser en stor capybara-illustrasjon og kort tekst. Spørsmålsstegene viser ett spørsmål per side. Navn, alder og sted lagres midlertidig mens onboarding pågår, men skrives først til profilen når hele flyten fullføres. Hvis appen lukkes før siste steg, skal de midlertidige svarene ikke markere onboarding som fullført.

Det finnes Back og Next. Skip kan brukes på intro-stegene, men ikke på spørsmålene. Navnefeltet går videre ved retur. Aldersvalget går videre når en alder velges. Stedssøket bruker Apple MapKit local search completion og viser forslag etter minst to bokstaver. Søket håndterer norske bokstaver og ignorerer forskjeller i store og små bokstaver og aksenter. Hvis søket ikke gir forslag, kan brukeren fortsette med teksten som ble skrevet inn.

Onboarding har én sentral illustrasjonsmapping slik at illustrasjonene kan byttes senere uten at hver side må bygges om. De transparente capybara-bildene brukes uten bakgrunnsboks, ramme, skygge eller bildebakgrunn. Overgangene har en myk slide og fade. Reduce Motion bruker enkel crossfade. Preview onboarding finnes bare fra Settings eller debugmodus og skal ikke lagre profildata.

## Home

Home er startpunktet etter onboarding.

Funksjoner:

- Personlig hilsen med profilbilde eller initialer.
- Kortet **Your next adventure** med neste kommende reise.
- Destinasjon, reisenavn, datoer og nedtelling.
- Hurtiglenke til å fortsette en reise.
- Kort som viser neste praktiske steg, for eksempel planlegging eller pakking.
- Horisontal liste med reisekort for flere reiser.
- Status, reisemål, datoer og fremdrift i pakkelisten per reise.
- Knapp for å lage en ny reise.

Hvis det ikke finnes en datert kommende reise, vises en rolig tomtilstand. En aktiv reise eller en reise uten dato kan åpnes direkte, eller brukeren kan legge inn datoer senere.

## Opprette en ny reise

Ny reise er en egen flyt. Brukeren oppgir reisens navn, reisemål, land, datoer og stil eller farge. Destinasjonen kan velges fra stedssøk. Når stedet er valgt, lagres by og land separat, og en IANA-tidssone brukes når den er tilgjengelig.

Reisen får automatisk:

- Unik intern ID.
- Opprettelsesdato.
- Standard coverbilde basert på land når det ikke er valgt et eget bilde.
- Coverfarge og ikon.
- Tomme samlinger for aktiviteter, pakkeliste, ønskeliste og minner.
- Tidssone for destinasjonen.
- Eier og eventuelle reisedeltakere.

Reisen kan senere endres eller slettes av eieren.

## Trip arbeidsområde

Trip-skjermen er arbeidsområdet for den valgte reisen. Den viser en kompakt reiseheader med destinasjon, navn, datoer og antall reisende. Eieren kan invitere andre og åpne en dialog for å legge til en venn.

Hovedfanene er:

- **Overview**
- **Plan**
- **Packing**
- **More**, som åpner flere innholdsområder
- **Activities**
- **Wishlist**
- **Memories**

### Overview

Overview samler status og neste handling.

- Reiseinformasjon med navn, sted og dato.
- Status for reisen, inkludert planlagt, aktiv eller fullført når dette er relevant.
- Reisefølge og invitasjon.
- Neste aktivitet eller neste anbefalte steg.
- Sammenleggbar detaljseksjon.
- Vær, valuta, tidssone, strømplugger og påminnelser.

### Plan og aktiviteter

Plan viser aktiviteter gruppert etter dato. En aktivitet kan ha:

- Tittel.
- Dato.
- Starttid og sluttid.
- Sted.
- Notat.
- Deltakere.

Brukeren kan legge til, redigere, slette og gjenopprette aktiviteter etter en nylig sletting. Det finnes forslag basert på destinasjonen. En ønskelistepost kan flyttes inn i planen som en aktivitet.

### Aktivitetsbrowser

Aktivitetsbrowseren åpnes fra trip-området og viser ideer for ting å gjøre i valgt by og land. Den bruker destinasjonen for å gi forslag og sender valgt aktivitet tilbake til planleggingen.

### Packing

Packing er en delt pakkeliste for reisen.

- Legg til egne ting.
- Velg kategori.
- Knytt en ting til en reisende.
- Kryss av eller fjern avkrysning.
- Fjern eller gjenopprett nylig slettede ting.
- Kopier valgte kategorier fra en annen reise.
- Vis fremdrift med antall pakket og prosent.
- Få værbaserte forslag når værdata finnes.

For gruppereiser kan en pakketing tildeles en bestemt person. Relevante endringer kan sende pushvarsel når varsel er tilgjengelig.

### Wishlist

Wishlist er en liste over steder eller ting brukeren ønsker å gjøre.

- Legg til navn, kategori, sted, notat og eventuell lenke.
- Stem på eller marker en ønskelistepost.
- Legg til eller fjern reaksjon som deltaker.
- Flytt en post til plan som aktivitet.
- Fjern eller gjenopprett en nylig slettet post.

Reaksjoner og stemmer er knyttet til reisens medlemmer når delt data er tilgjengelig.

### Memories

Memories viser bilder og minner for reisen.

- Velg ett eller flere bilder fra bildebiblioteket.
- Bildet vises optimistisk lokalt straks det er valgt.
- Originalen skaleres til maksimalt 1600 piksler på langsiden og komprimeres som JPEG med omtrent 0,8 kvalitet.
- Det lages samtidig en thumbnail på maksimalt 400 piksler.
- Fullt bilde og thumbnail lastes opp parallelt i bakgrunnen.
- Hvert bilde har Saving, Saved eller Retry-status.
- Opplastinger legges i kø og fortsetter selv om minneboken lukkes.
- Feil forsøkes på nytt med backoff.
- Nedlastede bilder caches i minne og på disk.
- Boken lagres ikke på nytt som en hel enhet for hvert bilde. Bare det nye bildet og den endrede siden oppdateres.

## Vær

Værkortet viser ikke dagens vær som om det var reisens vær.

- For reiser innenfor værleverandørens prognosevindu vises én celle per reisedag fra ankomst til avreise, med ikon, maksimum og minimum.
- For reiser som ligger lenger frem enn prognosevinduet vises en forklaring om at prognosen for datoene blir tilgjengelig nærmere avreise.
- Kortet oppdateres når datoene kommer innenfor prognosevinduet.
- Når reisen pågår vises dagens vær øverst, etterfulgt av resten av reisens dager.
- Når det er relevant vises et kort råd, for eksempel om regn eller varme netter.
- Pakkeforslag kan bruke tilgjengelige prognosedata.

Værdata hentes fra WeatherKit eller den aktuelle væradapteren i appen. Nettverk og tilgjengelighet kan påvirke om kortet viser data.

## Valuta, tidssone og strømplugger

### Valuta

Trip-detaljene viser lokal valuta og navn. Når kursdata er tilgjengelig, vises et eksempel på hva 100 NOK tilsvarer i lokal valuta. NOK behandles som 1:1 i appens visning. Kursdata hentes fra en ekstern valutakilde og kan derfor være midlertidig utilgjengelig.

### Tidssone

Destinasjonen lagrer en IANA-tidssone når den kan hentes fra valgt sted. Hjemmets tidssone kommer fra enheten eller brukerens hjemland i profilen. Differansen beregnes med den faktiske startdatoen for reisen, slik at norsk sommertid og vintertid håndteres korrekt.

Kortet viser:

- Hvor mange timer destinasjonen ligger foran eller bak hjemmet.
- **Same time as home** bare når offsetene på reisens startdato faktisk er like.
- Lokal klokkeslettlinje i destinasjonen akkurat nå.

Hvis destinasjonens tidssone ikke kan fastslås, skal kortet skjules i stedet for å gjette.

### Strømplugger

Plug-kortet viser ikoner og type for destinasjonens plugger, ikke bare bokstaver. Det finnes ikoner for type A til O. Kortet viser opptil tre ikoner i forhåndsvisningen og en større detaljside med alle typer, beskrivelse, spenning og frekvens.

Kortet sammenligner med brukerens hjemland:

- **Your plugs work here** hvis minst én hjemmetype finnes i destinasjonen.
- **You need an adapter** hvis ingen typer matcher, med forslag til adapter.
- Spenningsvarsel hvis forskjellen er mer enn omtrent 20 volt.

For Thailand er tabellen A, B, C, F og O, 230 V og 50 Hz. For Norge brukes C og F. Dataene er ment å følge en verifisert country plug and voltage guide.

## Days nedtelling

Days-skjermen viser neste reise i en stor, visuell nedtelling.

- Dager til avreise.
- Destinasjon, reisenavn og avreiseinformasjon.
- Dato for hjemreise.
- Om brukeren reiser alene eller sammen med andre.
- Pakkefremdrift.
- Hurtigåpning av reisen.
- Tomtilstand hvis det ikke finnes en kommende reise.
- Aktiv reise prioriteres når brukeren er borte nå.

Hvis reisen ikke har datoer, kan Days tilby å legge inn datoer.

## Map

Map er brukerens personlige reisekart.

På iOS brukes Apple-kart gjennom MapKit-kompatibel kartvisning. Appen skal ikke be om Google Maps-nøkkel. Kartet er lyst og rolig, uten satellitt, trafikk og unødvendig POI-støy. Landgrenser og besøkte land vises med dempet blå tint.

Funksjoner:

- Besøkte land hentes fra brukerens reiser.
- Landpolygoner kommer fra lokale grensedata.
- Landnavn vises når zoomnivået gjør dem lesbare.
- Hver reise får en liten destinasjonsmarkør.
- Markøren bruker reisens ikon og coverfarge.
- Kommende reiser har fylt markør.
- Tidligere reiser har en mer åpen eller omrisset stil.
- Trykk på markør eller land for å se reisene der.
- Kortet viser navn, datoer, status og knapp for å åpne reisen.
- Minnebokknapp vises når reisen har minner.
- En bunnseksjon kan vise **Your upcoming adventure**.

Hvis kartet ikke kan lastes, vises capybara, vennlig forklaring og retry-knapp. Utviklerfeil skal ikke vises til brukeren.

På web brukes en egen, avhengighetsfri illustrert kartoversikt. Den er ikke et interaktivt Apple-kart og skal behandles som en plattformbegrensning.

## Memory books

Memory books er en egen bokhylle og leser.

### Bokhylle

- Én minnebok per reise.
- Cover med land, by, coverfarge og coverillustrasjon.
- Bok kan åpnes fra bokhyllen.
- Boken kan settes til public eller private.
- Global standard kan settes i profilen til all public eller all private.
- En per-bok-overstyring vinner over global standard.
- Låseikon vises for private bøker.
- Globeikon vises for offentlige bøker.

### Lesing

- Boken åpnes med en spread-leser.
- Venstre og høyre side er forskjellige minner.
- En eldre minnemodell med flere bilder per side blir utvidet til én memory per side uten å slette data.
- Hver side har én foto-frame og én smal caption strip.
- Bildet bruker aspect fit, slik at hele bildet er synlig.
- Siden klippes til en avrundet papirflate slik at foto, tape, etiketter og stickers ikke krysser kanten eller midtfalsen.
- Caption ligger utenfor bildet i en slank strip og kan redigeres ved trykk.
- Move-handle og delete-knapp vises bare i eksplisitt edit mode.
- Offentlige venners bøker åpnes read only.
- Horisontal sidesveip fungerer begge veier, med terskel og velocity.
- Piltaster eller tappbare sidekanter fungerer som fallback.
- Under sideanimasjon fryses utreisende spread som snapshot. Bare snapshot animeres, og snapshot fjernes etter fullført eller avbrutt animasjon.
- Bakgrunnen ved åpen bok bruker samme coverfarge som boken.

## Friends

Friends ligger i tab-baren og har tre hoveddeler.

### Venneliste og forespørsler

- Opprett eller sikre en profil med username og friend code.
- Del personlig invitasjonslenke.
- Legg til venn med username eller friend code.
- Forespørsel må aksepteres før innhold deles.
- Innkommende forespørsler kan aksepteres eller avslås.
- Utgående forespørsler vises som pending.
- Godkjente venner vises med bilde, navn og username.
- Legend of the Road-badge kan vises ved nivå 10.
- Venn kan fjernes.

### Chat

- Én til én chat per vennskap.
- Tekstmeldinger i bobler.
- Nyeste melding nederst.
- Tekstfelt og send-knapp.
- Tomtilstand for ny chat.
- Melding vises optimistisk lokalt.
- Outbox holder meldinger som ikke fikk nettverk.
- Outbox forsøkes sendt ved appstart eller når appen blir aktiv, og med intervall.
- Supabase realtime kan oppdatere meldinger når forbindelsen er tilgjengelig.
- Ingen gruppechat i denne versjonen.

### Venners minnebøker

- Fra en venn kan brukeren åpne offentlige minnebøker.
- Bare `book_public = true` og godkjent vennskap gir tilgang.
- Bøkene åpnes i samme leser som egne bøker, men read only.
- Private bøker listes ikke og skal ikke kunne åpnes via en direkte rute.

## Profile

Profile samler identitet, nivå, statistikk, reiser og innstillinger.

### Profilblokk

- Profilbilde eller initialer.
- Nivåramme rundt bildet når den er tilgjengelig.
- Nivåtittel som liten etikett under bildet.
- Navn og kort undertekst.
- Trykk på bilde eller nivåetikett åpner nivåarket.
- Profilbildet kan endres fra Edit profile.

Profilbildet kan tas med kamera eller velges fra bibliotek. Etter valg kan brukeren beskjære og zoome. Bildet skaleres til maksimalt 800 piksler, komprimeres som JPEG og vises lokalt straks. Opplasting skjer i bakgrunnen. Ved suksess lagres URL-en i profilen og cache-nøkkelen endres. Ved feil beholdes forrige serverbilde, lokal kopi beholdes og Retry vises. Kamera- og bibliotekstillatelser spørres først når de trengs.

Hvis brukeren ikke har bilde, vises initialer sentrert i sirkelen. Profilen skal fungere i mørk modus, med VoiceOver-etiketter og Dynamic Type.

### Nivåer og perks

Alle starter på nivå 1. Nivå beregnes fra reiser som oppfyller de gjeldende kvalifiseringsreglene. En reise teller bare når alle relevante krav er oppfylt, blant annet passert eller manuelt fullført slutt, minst to dager, destinasjon, plan eller innhold, minst ett minne i reisedatoene, ingen overlapp med en eldre tellende reise, og ekstra regler for reiser opprettet etter sluttdato. Avlyste og fortsatt planlagte reiser teller ikke.

Nivåtabellen er:

| Nivå | Tittel | Terskel |
|---:|---|---:|
| 1 | Rookie Traveler | 0 |
| 2 | Weekend Wanderer | 3 |
| 3 | Trail Finder | 5 |
| 4 | Road Tripper | 8 |
| 5 | Globe Trotter | 12 |
| 6 | Passport Collector | 17 |
| 7 | Horizon Chaser | 23 |
| 8 | Seasoned Explorer | 30 |
| 9 | World Wanderer | 40 |
| 10 | Legend of the Road | 50 |

Nivåarket viser alle nivåer, gjeldende nivå, neste tittel og antall reiser som mangler. På nivå 10 vises **Max level reached**. Nivåarket forklarer også kort at reiser teller når de har en plan og minst ett minne.

Kosmetiske perks:

- Nivå 2: valg av profilrammefarge.
- Nivå 3: nytt stamp pack i passport.
- Nivå 4: flere papir-stiler i minnebok.
- Nivå 5: valg av hatt eller tilbehør til profilmennesket.
- Nivå 6: nytt stamp pack.
- Nivå 7: flere coverstiler for minnebøker.
- Nivå 8: animert profilramme.
- Nivå 9: gullaksenter.
- Nivå 10: Legend of the Road-badge som også kan vises til venner.

Låste perks vises dimmet med teksten **Unlocks at Level X**. Reduce Motion brukes på animert ramme og nivåopp-feiring.

### Profilstatistikk og innhold

Profile kan vise antall besøkte land og dager borte. Den har også snarveier til:

- Egne minnebøker.
- Friends.
- Dine reiser.
- Markering av valgt reise som fullført.
- Sletting av valgt reise.

### Settings

Settings ligger nederst i profilen som en enkel liste. Funksjoner inkluderer:

- Global synlighet for minnebøker: all public eller all private.
- Preview onboarding, tilgjengelig fra Settings og ikke som normal førstegangsmodus.
- En rolig appinformasjonstekst om at Travino utvikles gradvis.

## Deling, invitasjoner og medlemskap

En reise kan ha eier og flere medlemmer. Eieren kan invitere med friend-flyt eller medlemsinvitasjon. Invitasjoner bruker egne join-ruter. Tilgang til reisedata, aktiviteter, pakking, ønskeliste og minner styres av medlemskap og Supabase Row Level Security.

## Varsler

Brukeren kan aktivere trip-påminnelser. Appen kan planlegge varsler for avreise, aktiviteter og relevante reisedetaljer når dato og innhold finnes. Push-enhet registreres i backend når tillatelse og plattform støtter det. Hvis tillatelse mangler, får brukeren en rolig forklaring og kan aktivere dette senere i iPhone-innstillinger.

## Lagring, synkronisering og offline-adferd

Travino bruker lokal persistent state som første forsvar mot nettverksfeil. Ved oppstart leses lokal state, og Supabase remote state brukes når den er tilgjengelig. Den lokale staten forblir brukbar hvis nettverket eller backend feiler.

Synkronisering omfatter blant annet:

- Profil og profilbilde.
- Reiser og reisemedlemskap.
- Aktiviteter.
- Pakkelister.
- Ønskelister og reaksjoner.
- Minner og captions.
- Vennskap og chat.
- Minnebok-entryer og synlighet.

Endringer skrives lokalt først og legges i kø for remote sync. Profilbilder og minnebilder har egne opplastingskøer med status og retry. Chat har egen outbox. Dette betyr at nettverkstilkobling må testes separat fra den lokale brukeropplevelsen.

## Backend og datasikkerhet

Supabase-migrasjonene oppretter eller utvider blant annet:

- `profiles`
- `trips`
- `trip_members`
- `activities`
- `packing_items`
- `wishlist_items`
- `wishlist_votes`
- `memories`
- `travel_states`
- `friendships`
- `memory_book_entries`
- `push_devices`
- `travel_trip_memberships`
- `travel_wishlist_reactions`
- `direct_messages`
- `waitlist_entries`

Storage-buckets brukes for memory book-bilder og profilavatarer. Row Level Security begrenser tilgang til egne data, reisedeltakere og godkjente venner. Offentlige minnebøker krever både offentlig bokstatus og godkjent vennskap. Private bøker skal ikke være lesbare for venner.

## Premium og venteliste

Appen har egne ruter for premium og venteliste. Premiumområdet er separat fra grunnfunksjonene som er beskrevet over. Dette dokumentet bekrefter ikke at betaling, produktkatalog eller produksjonsabonnement er ferdig koblet til en betalingsleverandør. Ventelistefunksjonen finnes som egen backend-tabell og kan brukes av gjester eller innloggede brukere etter gjeldende policy.

## Tilgjengelighet og visuell oppførsel

Felles mønstre i appen:

- Safe areas håndteres i hovedlayouten.
- VoiceOver-labels brukes på viktige knapper, faner, inputfelt, markører og progress-områder.
- Dark mode støttes i tekst og komponenter der skjermen er bygget for det.
- Reduce Motion reduserer onboarding-, bok- og profilrammeanimasjoner til fade eller statisk visning.
- Trykk gir en liten pressed-state.
- Tomtilstander bruker capybara og en konkret neste handling i stedet for utviklermeldinger.

## Plattformforskjeller og avgrensninger

- Native kart bruker Apple-kart-kompatibel visning. Web har en illustrert oversikt.
- Kamera, bildebibliotek, push og bakgrunnsopplasting er enhets- og tillatelsesavhengig.
- Vær, valutakurs, signerte bilde-URL-er og realtime-chat krever nettverk.
- Supabase må ha migrasjonene kjørt i riktig miljø for at venner, chat, avatarer og offentlige bøker skal virke.
- Lokal state kan fortsatt vise innhold ved midlertidig nettverksfeil, men remote sync må verifiseres separat.

## Hva Instinct AI bør bruke som sannhetskilde

Når Instinct AI analyserer eller foreslår endringer, skal denne dokumentasjonen leses sammen med den aktuelle koden. Følgende er sentrale implementasjonskilder:

- `app/(tabs)/_layout.tsx` for tab-bar og hovednavigasjon.
- `app/(tabs)/index.tsx` for Home.
- `app/(tabs)/trip.tsx` for Trip-arbeidsområdet.
- `app/(tabs)/today.tsx` for Days-nedtellingen.
- `app/(tabs)/map.tsx` og `app/(tabs)/map.web.tsx` for kartplattformene.
- `app/(tabs)/friends.tsx`, `app/friends/chat/[userId].tsx` og `app/friends/[userId].tsx` for venner, chat og offentlige bøker.
- `app/(tabs)/profile.tsx` for profil, nivå, avatar og innstillinger.
- `app/memory-book/index.tsx` og `src/memory-journal.tsx` for minnebøker.
- `src/store.tsx` for datamodell, lokal state, remote sync og køer.
- `src/trip-weather.ts`, `src/weather.ts` og `src/travel-info.ts` for reisedata.
- `src/onboarding-illustrations.ts` og `app/onboarding.tsx` for onboarding.
- `supabase/migrations/` for database, storage-policyer og tilgangsregler.

Hvis en funksjon ikke kan spores til UI, store, backend eller en eksplisitt plattformadapter, skal den behandles som en mulig idé eller uverifisert funksjon, ikke som en bekreftet del av appen.

## Kort oppsummering

Travino dekker hele reisen fra første plan til delt minnebok: onboarding, reiseoppretting, plan, aktiviteter, pakking, ønskeliste, vær, valuta, tidssoner, plugger, påminnelser, kart, venner, chat, offentlige minnebøker, profil, nivåer og offline-tolerant synkronisering. Tilgang til delte data er bygget rundt vennskap, reisemedlemskap og public/private-regler. Instinct AI bør derfor behandle Travino som en personlig reiseplattform med fire sentrale datakjerner: reiser, planlegging, sosial deling og minner.
