import type { Metadata } from 'next';
import { RadioPlayer } from '@/components/radio/RadioPlayer';

export const metadata: Metadata = {
    title: 'Non-Stop Pop Radio',
    description: 'Radio Non-Stop Pop FM z GTA V: 38 utworów w jednym nagraniu. Odtwarzacz pamięta, gdzie skończyłeś słuchać.',
    alternates: { canonical: '/nonStopPop' }
};

export default function NonStopPopPage() {
    return (
        <div className="wrap">
            <header className="page-head">
                <h1 className="page-title">Non-Stop Pop</h1>
                <p className="lead">Stacja radiowa z GTA V w jednym nagraniu. Kliknij utwór na liście, żeby przeskoczyć prosto do niego.</p>
            </header>
            <RadioPlayer />
        </div>
    );
}
