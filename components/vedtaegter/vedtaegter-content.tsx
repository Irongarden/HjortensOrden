'use client'

import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'

const STATUTES = [
  {
    paragraph: '§ 1',
    title: 'Navn og hjemsted',
    text: `Ordenens navn er Hjortens Orden. Ordenen er en privat sammenslutning af ligesindede brødre, og dens hjemsted er der, hvor formanden til enhver tid er bosat.`,
  },
  {
    paragraph: '§ 2',
    title: 'Formål',
    text: `Ordenens formål er at fremme broderskab, fællesskab og værdighed blandt ordenens medlemmer. Ordenen tilstræber at bevare og overlevere ordenens traditioner, ritualer og ånd til kommende generationer.`,
  },
  {
    paragraph: '§ 3',
    title: 'Medlemskab',
    text: `Optagelse i ordenen sker ved invitation fra et aktivt medlem. Kandidaten skal godkendes af bestyrelsen ved simpelt flertal. Ethvert nyt medlem forpligter sig til at overholde nærværende vedtægter samt ordenens interne skikke og traditioner.\n\nMedlemskab er personligt og kan ikke overdrages. Ordenen fører en fortegnelse over alle nuværende og tidligere medlemmer.`,
  },
  {
    paragraph: '§ 4',
    title: 'Ledelse og embeder',
    text: `Ordenen ledes af en bestyrelse bestående af:\n\n• Formanden, der er ordenens øverste repræsentant\n• Næstformanden, der bistår formanden og varetager dennes opgaver i dennes fravær\n• Kassereren, der forvalter ordenens midler\n• Bibliotekaren, der varetager ordenens arkiv og skrifter\n\nBestyrelsesmedlemmer vælges for et år ad gangen på ordenens generalforsamling.`,
  },
  {
    paragraph: '§ 5',
    title: 'Økonomi og kontingent',
    text: `Hvert aktivt medlem bidrager med et årligt kontingent, hvis størrelse fastsættes på generalforsamlingen. Kontingentet forfalder til betaling den 1. januar hvert år.\n\nOrdenens midler forvaltes af kassereren og anvendes alene til ordenens formål. Regnskabet følger kalenderåret og fremlægges på generalforsamlingen.`,
  },
  {
    paragraph: '§ 6',
    title: 'Møder og arrangementer',
    text: `Ordenen afholder arrangementer i overensstemmelse med ordenens traditioner. Aktive medlemmer forventes at deltage i ordenens begivenheder med den seriøsitet og respekt, der er arrangementet værdigt.\n\nGeneralforsamlingen afholdes hvert år inden udgangen af første kvartal.`,
  },
  {
    paragraph: '§ 7',
    title: 'Orden og disciplin',
    text: `Ethvert medlem er forpligtet til at opføre sig værdigt som repræsentant for ordenen. Handlinger, der skader ordenens omdømme eller bryder med broderskabets ånd, kan medføre suspension eller eksklusion.\n\nBestyrelsen træffer afgørelse i disciplinærsager ved simpelt flertal. Det pågældende medlem har ret til at udtale sig, inden afgørelsen træffes.`,
  },
  {
    paragraph: '§ 8',
    title: 'Vedtægtsændringer',
    text: `Ændringer af nærværende vedtægter kan alene foretages på en generalforsamling og kræver, at mindst to tredjedele af de fremmødte aktive medlemmer stemmer for ændringen.`,
  },
  {
    paragraph: '§ 9',
    title: 'Opløsning',
    text: `Ordenen kan opløses, såfremt mindst tre fjerdedele af alle aktive medlemmer på en ekstraordinær generalforsamling stemmer herfor. Ved opløsning tilfalder ordenens aktiver og arkiver et formål, som generalforsamlingen bestemmer.`,
  },
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
        {/* Inner */}
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
              Vedtægter og Grundlov
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 text-parchment-text/40">
              <span className="h-px w-24 bg-parchment-text/30 block" />
              <span className="font-serif text-sm">✦</span>
              <span className="h-px w-24 bg-parchment-text/30 block" />
            </div>
            <p className="text-xs text-parchment-text/50 mt-3 font-serif italic">
              Vedtaget og stadfæstet af ordenens brødre
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
                <div className="pl-8 border-l-2 border-parchment-text/20">
                  {section.text.split('\n').map((line, j) => (
                    <p key={j} className={`font-serif text-parchment-text/85 leading-loose text-sm ${line === '' ? 'h-2' : ''}`}>
                      {line}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

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
