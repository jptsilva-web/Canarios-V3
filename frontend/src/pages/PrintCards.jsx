import React, { useState, useEffect } from 'react';
import { 
  Printer,
  Bird,
  Heart,
  Calendar,
  Egg,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { printApi } from '../lib/api';
import { toast } from 'sonner';
import { useLanguage } from '../lib/LanguageContext';

// Printable Card Component
const BreedingCard = ({ card, t }) => (
  <div className="breeding-card bg-white border-2 border-gray-300 rounded-lg p-4 w-[350px] h-[220px] text-black print:break-inside-avoid">
    {/* Header */}
    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-red-500" />
        <span className="font-bold text-lg">{card.pair_name}</span>
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-500">{t('printCards.cage')}</div>
        <div className="font-bold text-xl">{card.cage_label}</div>
      </div>
    </div>

    {/* Parents */}
    <div className="grid grid-cols-2 gap-4 mb-3">
      {/* Male */}
      <div className="bg-teal-50 rounded p-2">
        <div className="flex items-center gap-1 text-xs text-teal-600 font-medium mb-1">
          <Bird className="w-3 h-3" /> {t('printCards.male')}
        </div>
        <div className="font-mono font-bold text-sm">{card.male.band_number}</div>
        <div className="text-xs text-gray-600">STAM: {card.male.stam}</div>
        <div className="text-xs text-gray-500">{t('seasons.year')}: {card.male.year}</div>
      </div>

      {/* Female */}
      <div className="bg-pink-50 rounded p-2">
        <div className="flex items-center gap-1 text-xs text-pink-600 font-medium mb-1">
          <Bird className="w-3 h-3" /> {t('printCards.female')}
        </div>
        <div className="font-mono font-bold text-sm">{card.female.band_number}</div>
        <div className="text-xs text-gray-600">STAM: {card.female.stam}</div>
        <div className="text-xs text-gray-500">{t('seasons.year')}: {card.female.year}</div>
      </div>
    </div>

    {/* Stats */}
    <div className="flex items-center justify-between bg-gray-50 rounded p-2 text-xs">
      <div className="flex items-center gap-1">
        <Calendar className="w-3 h-3 text-gray-500" />
        <span>{t('printCards.paired')}: {card.paired_date || 'N/A'}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Egg className="w-3 h-3 text-yellow-500" />
          {card.total_eggs} {t('printCards.eggs')}
        </span>
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <Bird className="w-3 h-3" />
          {card.hatched} {t('printCards.hatched')}
        </span>
      </div>
    </div>

    {/* Zone */}
    <div className="text-center text-xs text-gray-400 mt-2">
      {card.zone_name}
    </div>
  </div>
);

export const PrintCards = () => {
  const { t } = useLanguage();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await printApi.getBreedingCards();
      setCards(res.data);
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast.error('Failed to load breeding cards');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="print-cards-page">
      {/* Screen Header (hidden when printing) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            {t('printCards.title')}
          </h1>
          <p className="text-slate-400 mt-1">
            {cards.length} {t('printCards.subtitle')}
          </p>
        </div>
        <Button 
          onClick={handlePrint}
          className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90 font-bold"
          data-testid="print-btn"
        >
          <Printer size={20} className="mr-2" /> {t('printCards.printBtn')}
        </Button>
      </div>

      {/* Instructions (hidden when printing) */}
      <Card className="bg-[#202940] border-white/5 print:hidden">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Printer className="w-5 h-5 text-[#FFC300] mt-0.5" />
            <div>
              <p className="text-white font-medium">{t('printCards.instructions')}</p>
              <ul className="text-sm text-slate-400 mt-1 space-y-1">
                <li>• {t('printCards.tip1')}</li>
                <li>• {t('printCards.tip2')}</li>
                <li>• {t('printCards.tip3')}</li>
                <li>• {t('printCards.tip4')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <Card className="bg-[#202940] border-white/5 print:hidden">
          <CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl text-white font-['Barlow_Condensed']">{t('printCards.noCards')}</h3>
            <p className="text-slate-400 mt-2">{t('printCards.noCardsDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center print:justify-start print:gap-2">
          {cards.map((card) => (
            <BreedingCard key={card.pair_id} card={card} t={t} />
          ))}
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .breeding-card {
            page-break-inside: avoid;
            margin: 8px;
          }
        }
      `}</style>
    </div>
  );
};
