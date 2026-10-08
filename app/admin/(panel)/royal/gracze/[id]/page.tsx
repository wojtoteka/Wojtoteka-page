import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlayerView } from '@/components/admin/royal/PlayerView';

export const metadata: Metadata = { title: 'RoyalCasino: karta gracza' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^\d{15,21}$/.test(id)) notFound();
    return <PlayerView userId={id} />;
}
