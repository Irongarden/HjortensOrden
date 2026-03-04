'use client'

import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'

interface StatuteItem {
  stk: string
  text: string
  list?: string[]
  footnote?: string
}

interface StatuteSection {
  paragraph: string
  title: string
  preamble?: string
  items: StatuteItem[]
}

const STATUTES: StatuteSection[] = [
  {
    paragraph: '§ 1',
    title: 'Navn og hjemsted',
    items: [
      { stk: 'Stk. 1.', text: 'Logens navn er: "Hjortens Orden"' },
    ],
  },
  {
    paragraph: '§ 2',
    title: 'Formål',
    items: [
      { stk: 'Stk. 1.', text: 'Logens formål er at fastholde sociale relationer og skabe et fast samlingspunkt for medlemmerne i en travl hverdag.' },
    ],
  },
  {
    paragraph: '§ 3',
    title: 'Medlemskreds',
    items: [
      { stk: 'Stk. 1.', text: 'Kun mænd kan optages i Hjortens Orden.' },
      { stk: 'Stk. 2.', text: 'Som Broder optages de, som blandt Logens Brødre synes at være egnede og have vilje til at tjene Logens formål.' },
      { stk: 'Stk. 3.', text: 'Formel indmeldelse sker ved Logens indskrivning i Bogen. Det nye Broderskab er desuden først gyldigt, når broderen har indbetalt kontingent.' },
      { stk: 'Stk. 4.', text: 'Inden en fuldmægtig indvilgelse i logen, skal et nyt medlem igennem en optagelses­proces som kaldes "Période enfant". Denne forklares under § 11.' },
      { stk: 'Stk. 5.', text: 'Udmeldelse kan ske ved begrundet, personlig forespørgsel ved Formanden.' },
      { stk: 'Stk. 6.', text: 'Brødre betaler et, af Generalforsamlingen fastsat, kontingent. Nye Brødre betaler desuden et "Montant de l\'entrée" på yderligere 2 måneders kontingent.' },
    ],
  },
  {
    paragraph: '§ 4',
    title: 'Generalforsamling',
    items: [
      { stk: 'Stk. 1.', text: 'Generalforsamlingen er Logens højeste myndighed.' },
      { stk: 'Stk. 2.', text: 'Ordinær Generalforsamling afholdes årligt. Indkaldelse sker elektronisk. Ordinær Generalforsamling finder sted ved årets sidste arrangement.' },
      { stk: 'Stk. 3.', text: 'Møde- og stemmeberettigede på Generalforsamlingen er alle Brødre, der rettidigt har indbetalt kontingent – medmindre der foreligger en bestyrelsesgodkendt årsag til misligholdelse. Der kan ikke stemmes ved fuldmagt.' },
      { stk: 'Stk. 4.', text: 'En generalforsamling er først officielt startet efter "Aiguillage" ved oplæsning fra Logebogen – udført af Bibliotekaren.' },
      {
        stk: 'Stk. 5.',
        text: 'Dagsordenen for den Ordinære Generalforsamling skal mindst indeholde disse punkter i følgende rækkefølge:',
        list: [
          'Formandens Horn (velkomsttale) samt eventuel indvilgelse af nye Brødre eller Kid',
          'Regnskabsaflæggelse v. Kasserer',
          'Fastsættelse af kontingent',
          'Godkendelse af budget for kommende år',
          'Fordeling af arrangement-grupper ved MIMS modellen – udføres af Kassereren',
          'Valg af 4 primus motor roller til styring af MIMS grupperne',
          'Eventuelt',
          'Opstilling af nye eventuelle Kid',
          'Valg af Formand og Næstformand, eller Bibliotekar og Kasserer (sker på turnus)',
        ],
      },
      { stk: 'Stk. 6.', text: 'Forslag om vedtægtsændringer der ønskes behandlet, skal være Bestyrelsen i hænde senest 90 dage før den Ordinære Generalforsamling.' },
      { stk: 'Stk. 7.', text: 'Forslag på Generalforsamlingen afgøres ved tilstedeværende Brødres mundtlige stemmeafgivelse. Hvert medlem kan maksimalt afgive én stemme pr. forslag.' },
    ],
  },
  {
    paragraph: '§ 5',
    title: 'Ekstraordinær Generalforsamling',
    items: [
      { stk: 'Stk. 1.', text: 'Ekstraordinær Generalforsamling kan afholdes, når Bestyrelsen finder det nødvendigt. Derudover skal en Ekstraordinær Generalforsamling afholdes, hvis mindst 1/3 af Brødrene fremsætter skriftlig/mundtlig begrundet anmodning om det overfor Formanden.' },
      { stk: 'Stk. 2.', text: 'Indkaldelsesfristen for en ekstraordinær Generalforsamling er 90 dage.' },
    ],
  },
  {
    paragraph: '§ 6',
    title: 'Logens daglige ledelse',
    items: [
      {
        stk: 'Stk. 1.',
        text: 'Logens daglige ledelse udgøres af Bestyrelsen, der foruden Formanden består af:',
        list: ['Næstformanden', 'Kassereren', 'Bibliotekaren'],
        footnote: 'Da det anses som uhensigtsmæssigt at muliggøre en total udskiftning i Bestyrelsen på én gang, vil halvdelen af bestyrelsen være på valg ved Generalforsamlingen. Dette sker i en turnus, hvor Formand og Næstformand er på valg det ene år, hvorefter Bibliotekar og Kasserer er det året efter.',
      },
      { stk: 'Stk. 2.', text: 'Bestyrelsen leder Logen i overensstemmelse med vedtægterne og Generalforsamlingens beslutninger. Det er til enhver tid Bestyrelsens ansvar at lede efter logens velbefindende og i dennes interesse.' },
      { stk: 'Stk. 3.', text: 'Der skal afholdes et konstituerende møde for bestyrelsen inden for 90 dage efter en Generalforsamling. Her skal eventuelle vedtægtsændringer eller relevante punkter fra Generalforsamlingen gennemarbejdes, og et budget for det kommende år skal fastlægges.' },
      { stk: 'Stk. 4.', text: 'Bestyrelsen fastsætter i øvrigt selv sin forretningsorden. Den kan nedsætte underudvalg og arbejdsgrupper til varetagelse af klart afgrænsede opgaver, såfremt dette synes at være i logens interesse. Nedsatte udvalg og grupper skal handle og agere i fuld overensstemmelse med Logens vedtægter og med transparens for Logens brødre.' },
      { stk: 'Stk. 5.', text: 'Formanden indkalder og leder bestyrelsesmøder. Indkaldelse sker skriftligt med angivelse af dagsorden, når Formanden skønner det nødvendigt, eller mindst 2 af Bestyrelsens medlemmer fremsætter ønske om det. I sådanne tilfælde afholdes mødet senest 90 dage efter anmodningen er kommet til Formandens kendskab.' },
      { stk: 'Stk. 6.', text: 'Det er for Formanden muligt at nedlægge veto, såfremt det er hans overbevisning at der handles i Logens interesse. Vetoretten skal ses som et sjældent, om end vigtigt redskab til løsning af potentielle konfliktoptrapninger.' },
    ],
  },
  {
    paragraph: '§ 7',
    title: 'Økonomi, regnskab og revision',
    items: [
      { stk: 'Stk. 1.', text: 'Logens regnskabsår følger kalenderåret.' },
      { stk: 'Stk. 2.', text: 'Bestyrelsen er ansvarlig for at lave et budget for de årlige arrangementer, som præsenteres og godkendes ved den næstkommende Generalforsamling, se § 4 – stk. 5 og § 6 – stk. 3.' },
      { stk: 'Stk. 3.', text: 'Logens regnskab føres af Kassereren, der tillige fører Logens Broderoversigt.' },
      { stk: 'Stk. 4.', text: 'Omkostninger vedr. indkøb af materiel/ydelser til Logen, der pålægges en Broder til udlæg, skal kunne refunderes igennem Kassereren, hvis denne modtager gyldig kvittering.' },
      { stk: 'Stk. 5.', text: 'Hvis et medlem af Logen ikke indbetaler sit kontingent rettidigt – som er inden d. 14 i måneden – vil der blive pålagt et gebyr på 1 måneds ekstra kontingent. Kassereren vil ikke varsle et medlem om forsinket betaling, da han blot opgør indbetalinger efter d. 14 i måneden.' },
    ],
  },
  {
    paragraph: '§ 8',
    title: 'Tegningsregler og hæftelse',
    items: [
      { stk: 'Stk. 1.', text: 'Ved optagelse af lån og ved salg/pantsætning af materiel eller fast ejendom, tegnes Logen af den samlede bestyrelse med det samlede antal Brødres fulde opbakning og viden herom.' },
      { stk: 'Stk. 2.', text: 'Kassereren står for varetagelse af Logens formue, herunder indkassering af kontingent samt betaling af regninger. Kassereren kan råde over Logens konti, herunder betalingskort og netbank til Logens konti, hvis sådanne stiftes.' },
      { stk: 'Stk. 3.', text: 'Der påhviler ikke Logens Brødre nogen personlig hæftelse for de økonomiske forpligtelser, der er påhvilet Logen.' },
    ],
  },
  {
    paragraph: '§ 9',
    title: 'Vedtægtsændringer',
    items: [
      { stk: 'Stk. 1.', text: 'Disse vedtægter kan kun ændres med 2/3 flertal på en Generalforsamling, hvor ændringsforslaget fremgår af dagsordenen. For retningslinjer vedr. vedtægtsændringer, se § 4 – stk. 6.' },
      { stk: 'Stk. 2.', text: 'Fremtidige vedtægtsændringer træder i kraft med virkning fra den Generalforsamling, hvorpå de vedtages.' },
    ],
  },
  {
    paragraph: '§ 10',
    title: 'Opløsning',
    items: [
      { stk: 'Stk. 1.', text: 'Opløsning af Logen kan kun finde sted med 2/3 flertal på 2 hinanden følgende Generalforsamlinger, hvoraf den ene skal være af Ordinær karakter.' },
    ],
  },
  {
    paragraph: '§ 11',
    title: 'Nye medlemmer',
    preamble: 'I forlængelse af tidligere medlemsafsnit uddybes her optagelse af nye Brødre og Kid.',
    items: [
      { stk: 'Stk. 1.', text: 'Nye prøvemedlemmer (Kid) skal foreslås enstemmigt mellem Logens medlemmer. Dette skal gøres på den årlige Generalforsamling, når punkt 8 af agendaen diskuteres, se § 4 – stk. 6.' },
      { stk: 'Stk. 2.', text: 'Inden en udefrakommende kan påtage sig titlen som Kid, vil de fortrinsvist blive inviteret til det næste 2-dags arrangement der afholdes i kalenderåret. Hvis personen ikke kan deltage, vil de blive inviteret til det efterfølgende 1-dags arrangement, om end det ikke anbefales.' },
      { stk: 'Stk. 3.', text: 'Der vil efterfølgende afholdes en afstemning, enten fysisk eller på FaceTime, hvor Logens stemmeberettigede brødre vil afgøre om den udefrakommende skal indlemmes i Logen som prøvemedlem – også kaldet Kid. Et Kid er ikke stemmeberettiget.' },
      { stk: 'Stk. 4.', text: 'Ved Generalforsamlinger hvor et Kid starter sin prøveperiode, vil der blive lavet et ritual udført af Kassereren og Bibliotekaren.' },
      { stk: 'Stk. 5.', text: 'Et Kid skal gennemgå et års prøvemedlemskab, hvorefter Logens stemmeberettigede Brødre enten accepterer eller fravælger prøvemedlemmet. Et Kid kan kun transformeres til en Hjort og dermed blive stemt ind i logen ved enstemmighed. Dette sker til den årlige Generalforsamling.' },
      { stk: 'Stk. 6.', text: 'Ved Generalforsamlinger hvor et Kid overgår til Hjort vil der blive udført et ritual af Formanden og Næstformanden.' },
    ],
  },
  {
    paragraph: '§ 12',
    title: 'Datering',
    items: [
      { stk: '', text: 'Disse vedtægter kan kun sættes i kraft ved samtlige Hjortes skriftlige godkendelse.' },
    ],
  },
]

const FOUNDING_MEMBERS = [
  'Søren Sebastian Voigt',
  'Mikkel Sam Suksamran Kyndesen',
  'Christian Lenz',
  'Simon Lenz',
  'Patrick Bech Potempa',
  'Per Holmberg',
  'Mads Folsted Kejlberg',
  'Senaudin Smajovic',
  'Mathias Skovsbøl Bruno Pedersen',
]

const NEW_MEMBERS = [
  'Johan Ravn',
  'Mathias Have Hansen',
  'Andreas Malmkjær',
]

export function VedtaegterContent() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Page header */}
      <div>
        <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
        <h1 className="font-serif text-display-sm text-parchment flex items-center gap-3">
          <ScrollText className="text-gold/70" size={28} />
          Vedtægter
        </h1>
      </div>

      {/* Parchment document */}
      <div className="parchment-document max-w-3xl mx-auto">
        <div className="parchment-inner">
          {/* Ornamental header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-4">
              <img src="/HOLogoTransparent.png" alt="Hjortens Orden" className="w-20 h-20 object-contain opacity-80" />
            </div>
            <p className="font-serif text-[10px] uppercase tracking-[0.4em] text-parchment-text/60 mb-2">✦ ✦ ✦</p>
            <h2 className="font-serif text-3xl font-bold text-parchment-text" style={{ fontStyle: 'italic' }}>
              Hjortens Orden
            </h2>
            <p className="font-serif text-sm tracking-[0.2em] uppercase text-parchment-text/70 mt-1">
              Vedtægter for Logen
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 text-parchment-text/40">
              <span className="h-px w-24 bg-parchment-text/30 block" />
              <span className="font-serif text-sm">✦</span>
              <span className="h-px w-24 bg-parchment-text/30 block" />
            </div>
            <p className="text-xs text-parchment-text/50 mt-3 font-serif italic">
              Cervum Fraternitatis Conveniunt · Ry d. 22.02.2025
            </p>
          </div>

          {/* Statutes */}
          <div className="space-y-8">
            {STATUTES.map((section, i) => (
              <motion.div
                key={section.paragraph}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="statute-section"
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-serif font-bold text-parchment-text text-lg">{section.paragraph}</span>
                  <h3 className="font-serif font-semibold text-parchment-text text-lg" style={{ fontStyle: 'italic' }}>
                    {section.title}
                  </h3>
                </div>
                <div className="pl-8 border-l-2 border-parchment-text/20 space-y-3">
                  {section.preamble && (
                    <p className="font-serif text-parchment-text/75 leading-loose text-sm italic mb-1">
                      {section.preamble}
                    </p>
                  )}
                  {section.items.map((item: StatuteItem, j) => (
                    <div key={j}>
                      <p className="font-serif text-parchment-text/85 leading-loose text-sm">
                        {item.stk && (
                          <span className="font-semibold text-parchment-text mr-1">{item.stk}</span>
                        )}
                        {item.text}
                      </p>
                      {item.list && (
                        <ol className="mt-1.5 ml-4 space-y-1">
                          {item.list.map((li, k) => (
                            <li key={k} className="font-serif text-parchment-text/80 text-sm leading-relaxed flex gap-2">
                              <span className="text-parchment-text/50 flex-shrink-0">{k + 1}.</span>
                              <span>{li}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                      {item.footnote && (
                        <p className="font-serif text-parchment-text/70 text-sm leading-loose mt-1.5 italic">
                          {item.footnote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-10 flex items-center justify-center gap-3 text-parchment-text/30">
            <span className="h-px flex-1 bg-parchment-text/20 block" />
            <span className="font-serif text-base">✦</span>
            <span className="h-px flex-1 bg-parchment-text/20 block" />
          </div>

          {/* Founding members */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <h3 className="font-serif font-semibold text-parchment-text text-lg uppercase tracking-widest text-center">
              Logens Stiftende Medlemmer
            </h3>
            <ul className="space-y-1.5 pl-4">
              {FOUNDING_MEMBERS.map((name) => (
                <li key={name} className="font-serif text-parchment-text/85 text-sm leading-relaxed flex gap-2">
                  <span className="text-gold/60">•</span>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Divider */}
          <div className="my-8 flex items-center justify-center gap-3 text-parchment-text/30">
            <span className="h-px flex-1 bg-parchment-text/20 block" />
            <span className="font-serif text-base">✦</span>
            <span className="h-px flex-1 bg-parchment-text/20 block" />
          </div>

          {/* New members */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="space-y-3"
          >
            <h3 className="font-serif font-semibold text-parchment-text text-lg uppercase tracking-widest text-center">
              Logens Tilkomne Medlemmer
            </h3>
            <ul className="space-y-1.5 pl-4">
              {NEW_MEMBERS.map((name) => (
                <li key={name} className="font-serif text-parchment-text/85 text-sm leading-relaxed flex gap-2">
                  <span className="text-gold/60">•</span>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-parchment-text/25 text-center">
            <div className="flex items-center justify-center gap-3 mb-4 text-parchment-text/40">
              <span className="h-px w-20 bg-parchment-text/30 block" />
              <span className="font-serif text-sm">✦</span>
              <span className="h-px w-20 bg-parchment-text/30 block" />
            </div>
            <p className="font-serif text-xs italic text-parchment-text/50">
              Således vedtaget og beseglet i Hjortens Ordenens navn.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
