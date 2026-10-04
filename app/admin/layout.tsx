import { V2Shell } from '@/components/v2/V2Shell';

// Logowanie i panel w tej samej oprawie co strona: kolory, kroje, siatka w tle.
export default function Layout({ children }: { children: React.ReactNode }) {
    return <V2Shell>{children}</V2Shell>;
}
