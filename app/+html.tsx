import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return <html lang="en"><head>
    <meta charSet="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Travino: plan trips together and keep the memories</title>
    <meta name="description" content="Travino keeps shared packing, day plans, today’s details and travel memories together."/>
    <meta property="og:title" content="Travino: plan trips together and keep the memories"/>
    <meta property="og:description" content="A calmer shared home for every plan, packing list and travel memory."/>
    <meta property="og:image" content="https://travino.vercel.app/travino-share.jpg"/>
    <meta property="og:type" content="website"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="Travino: plan trips together and keep the memories"/>
    <meta name="twitter:description" content="A calmer shared home for every plan, packing list and travel memory."/>
    <meta name="twitter:image" content="https://travino.vercel.app/travino-share.jpg"/>
    <link rel="icon" href="/favicon.png"/>
    <ScrollViewStyleReset />
  </head><body>{children}</body></html>;
}
