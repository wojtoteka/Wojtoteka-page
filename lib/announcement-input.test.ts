import assert from 'node:assert/strict';
import test from 'node:test';
import { announcementInput } from './announcement-input';

const base = { title: '', message: 'Prace techniczne\nMożliwe krótkie przerwy.', type: 'info', display_type: 'status', is_active: true };

test('ogłoszenie serwerów może nie mieć tytułu i zawsze trafia tylko na status', () => {
    for (const type of ['info', 'warning', 'important']) {
        const input = announcementInput({ ...base, type, pages: ['all', 'index'] });
        assert.equal(input.ok, true);
        if (!input.ok) return;
        assert.deepEqual(input.params, ['', base.message, type, 'status', '["status"]', 1, 0, null, null]);
    }
});

test('harmonogram zachowuje podane godziny lokalne i pozwala na otwarte granice', () => {
    const starts_at = '2026-09-28T10:30';
    const ends_at = '2026-09-28T11:45';
    for (const range of [{ starts_at }, { ends_at }, { starts_at, ends_at }]) {
        const input = announcementInput({ ...base, ...range });
        assert.equal(input.ok, true);
        if (!input.ok) return;
        assert.equal(input.params[7], 'starts_at' in range ? '2026-09-28 10:30:00' : null);
        assert.equal(input.params[8], 'ends_at' in range ? '2026-09-28 11:45:00' : null);
    }
});

test('nie przyjmuje odwróconego ani pustego przedziału', () => {
    for (const ends_at of ['2026-09-28T10:00', '2026-09-28T11:00']) {
        assert.equal(announcementInput({ ...base, starts_at: '2026-09-28T11:00', ends_at }).ok, false);
    }
});

test('błędne i nieistniejące daty nie zmieniają się w publikację bez terminu', () => {
    for (const value of ['jutro', '2026-02-30T10:00', '2026-13-01T10:00', '2026-09-28T25:00', '2026-09-28T10:00Z']) {
        assert.equal(announcementInput({ ...base, starts_at: value }).ok, false);
        assert.equal(announcementInput({ ...base, ends_at: value }).ok, false);
    }
    assert.equal(announcementInput({ ...base, starts_at: '2028-02-29T10:00' }).ok, true);
});

test('treść i prawidłowy typ są wymagane; zwykłe ogłoszenia nadal wymagają tytułu i strony', () => {
    for (const change of [{ message: '  ' }, { type: 'other' }, { display_type: 'other' }, { display_type: 'banner', pages: ['status'] }]) {
        assert.equal(announcementInput({ ...base, ...change }).ok, false);
    }
    assert.equal(announcementInput({ ...base, title: 'Tytuł', display_type: 'banner', pages: [] }).ok, false);
    assert.equal(announcementInput({ ...base, title: 'Tytuł', display_type: 'popup', pages: ['index'] }).ok, true);
});
