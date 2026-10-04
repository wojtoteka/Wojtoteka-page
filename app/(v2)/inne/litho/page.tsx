import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { Gallery, type Shot } from '@/components/Gallery';
import { Icon } from '@/components/Icon';
import { scanLitho, type LithoFile } from '@/lib/litho';
import styles from './litho.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMeta({
    title: 'Litho Studio: pobierz',
    description: 'Litho Studio to program do budowania stron internetowych myszką. Zmiany trafiają od razu do zwykłych plików na dysku. Pobierz wersję na Windows albo Linux.',
    path: '/inne/litho',
    image: 'home',
});

const SHOTS: Shot[] = [
    { src: '/inne/litho/menu.png', alt: 'Ekran startowy Litho Studio', caption: 'Ekran startowy', width: 1542, height: 947 },
    { src: '/inne/litho/AI_Instaler.png', alt: 'Auto-instalator narzędzi AI w Litho Studio', caption: 'Auto-instalator narzędzi AI', width: 1550, height: 951 },
    { src: '/inne/litho/program.png', alt: 'Główny edytor Litho Studio', caption: 'Główny edytor, widok Elementy i panel właściwości', width: 2557, height: 1390, wide: true }
];

const FEATURES = [
    'Elementy przeciągasz myszką, bez pisania kodu',
    'Osobno ustawiasz wygląd na komputerze, tablecie i telefonie',
    'Gotowe elementy do wstawienia: menu, sekcje, przyciski i ikony',
    'Program sam sprawdza stronę pod kątem Google i podpowiada poprawki',
    'Cofanie i ponawianie zmian, tak jak w edytorze tekstu',
    'Podgląd na żywo wygląda dokładnie tak jak strona w przeglądarce',
    'Menu i stopkę edytujesz raz, a zmiana pojawia się na wszystkich podstronach',
    'Wbudowany terminal, w którym jednym kliknięciem zainstalujesz narzędzia AI',
    'Automatyczne kopie zapasowe, więc nic Ci nie zginie',
    'Możesz otworzyć gotową, ręcznie pisaną stronę i edytować ją dalej w Litho Studio'
];

const dateFormat = new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Warsaw'
});

function formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? 'brak danych' : dateFormat.format(date);
}

function Platform({ id, name, version, files }: { id: string; name: string; version: string | null; files: LithoFile[] }) {
    return (
        <section className={styles.platform} aria-labelledby={id}>
            <header className={styles.platformHead}>
                <h3 id={id}>{name}</h3>
                <p className="muted">{version ? `Wersja ${version}` : 'Brak plików'}</p>
            </header>
            {files.length === 0 ? (
                <p className="muted">Brak plików do pobrania.</p>
            ) : (
                <ul role="list" className={styles.files}>
                    {files.map(file => (
                        <li key={file.file}>
                            <a href={file.url} className={styles.file} download>
                                <span className={styles.ext}>.{file.ext}</span>
                                <span className={styles.fileText}>
                                    <span className={styles.fileName}>
                                        {file.product}
                                        {file.variant ? `, ${file.variant}` : ''}
                                    </span>
                                    <span className={styles.fileMeta}>
                                        Wersja {file.version ?? 'nieznana'} · {file.sizeText} · dodano {formatDate(file.created)}
                                    </span>
                                </span>
                                <Icon name="download" size={22} className={styles.fileIcon} />
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default function LithoPage() {
    const releases = scanLitho();

    return (
        <div className="wrap">
            <header className={styles.head}>
                <img src="/inne/litho/logo.svg" alt="" width={96} height={96} className={styles.logo} />
                <div className={styles.headText}>
                    <h1 className="page-title">Litho Studio</h1>
                    <p className="lead">Program do budowania stron internetowych. Wybierz swój system i pobierz najnowszą wersję.</p>
                </div>
            </header>

            <section className={styles.downloads} aria-labelledby="pobierz-tytul">
                <h2 id="pobierz-tytul" className="sr-only">
                    Pobierz
                </h2>
                <Platform id="windows" name="Windows" version={releases.windows.verW} files={releases.windows.files} />
                <Platform id="linux" name="Linux" version={releases.linux.verL} files={releases.linux.files} />
            </section>

            <section className={`${styles.section} ${styles.about}`} aria-labelledby="o-programie">
                <h2 id="o-programie">Strona to od razu zwykłe pliki</h2>
                <div className="prose">
                    <p>
                        Litho Studio to program do budowania stron internetowych. Elementy układasz myszką, przeciągając je po ekranie, tak jak w programie
                        graficznym. Program od razu zapisuje zmiany w zwykłych plikach na Twoim dysku. Nie ma osobnego formatu projektu ani przycisku
                        &bdquo;eksportuj&rdquo;.
                    </p>
                    <p>
                        To ważna różnica względem popularnych kreatorów stron w przeglądarce. Tam strona zamknięta jest w koncie i trzeba ją wyeksportować,
                        żeby z niej skorzystać gdzie indziej. W Litho strona to od razu zwykłe pliki. Możesz je otworzyć na innym komputerze, wysłać koledze
                        albo umieścić na dowolnym hostingu.
                    </p>
                </div>
            </section>

            <section className={styles.section} aria-labelledby="zrzuty">
                <h2 id="zrzuty" className={styles.sectionTitle}>
                    Jak wygląda program
                </h2>
                <Gallery shots={SHOTS} />
            </section>

            <section className={`${styles.section} ${styles.about}`} aria-labelledby="funkcje">
                <h2 id="funkcje">Co potrafi</h2>
                <ul className={styles.features}>
                    {FEATURES.map(feature => (
                        <li key={feature}>{feature}</li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
