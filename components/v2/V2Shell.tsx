import { fontVars } from './fonts';
import { V2Effects } from './V2Effects';
import './v2.css';

/** Wspólna oprawa stron w nowym stylu: kroje, kolory, siatka i poświata w tle. */
export function V2Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className={`v2 ${fontVars}`}>
            <div className="v2-glow" aria-hidden="true" />
            <V2Effects />
            {children}
        </div>
    );
}
