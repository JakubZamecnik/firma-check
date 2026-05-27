import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const ico = searchParams.get('ico')?.trim();

    // Validace IČO
    if (!ico || !/^\d{8}$/.test(ico)) {
        return NextResponse.json(
            { error: 'Neplatný formát IČO. Musí mít přesně 8 číslic.' },
            { status: 400 }
        );
    }

    try {
        const targetUrl = `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`;

        const res = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'User-Agent': 'FirmaCheck-App/1.0',
            },
            cache: 'no-store',
        });

        if (res.status === 404) {
            return NextResponse.json(
                { error: 'Firma s tímto IČO nebyla nalezena.' },
                { status: 404 }
            );
        }

        if (!res.ok) {
            return NextResponse.json(
                { error: `ARES vrátil chybu ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();

        // -------------------------
        // ZÁKLADNÍ DATA
        // -------------------------

        const obchodniNazev =
            data.obchodniJmeno || 'Nedostupné';

        const datumVzniku =
            data.datumVzniku || 'Nedostupné';

        const dic =
            data.dic || 'Není plátce DPH';

        // -------------------------
        // PRÁVNÍ FORMA
        // -------------------------

        const pravniFormy: Record<string, string> = {
            '100': 'Fyzická osoba podnikající',
            '112': 'Společnost s ručením omezeným',
            '121': 'Akciová společnost',
            '141': 'Obecně prospěšná společnost',
            '205': 'Družstvo',
            '301': 'Státní podnik',
        };

        const pravniForma =
            pravniFormy[data.pravniForma] ||
            data.pravniForma ||
            'Nedostupné';

        // -------------------------
        // STAV SUBJEKTU (FIX)
        // -------------------------

        const registrace = data.seznamRegistraci || {};

        const stavSubjektu =
            registrace.stavZdrojeRos === 'AKTIVNI'
                ? 'Aktivní'
                : 'Neaktivní';

        // -------------------------
        // ADRESA
        // -------------------------

        let adresaSidla = 'Adresa nenalezena';

        if (data.sidlo) {
            adresaSidla =
                data.sidlo.textovaAdresa ||
                [
                    data.sidlo.nazevUlice,
                    data.sidlo.cisloDomovni,
                    data.sidlo.nazevObce,
                    data.sidlo.psc,
                ]
                    .filter(Boolean)
                    .join(' ');
        }

        // -------------------------
        // GEOLOCATION
        // -------------------------

        let souradnice = '50.0755,14.4378'; // fallback Praha

        if (adresaSidla && adresaSidla !== 'Adresa nenalezena') {
            try {
                const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                    adresaSidla
                )}&format=json&limit=1`;

                const geoRes = await fetch(geoUrl, {
                    headers: {
                        'User-Agent': 'FirmaCheck-App/1.0',
                    },
                });

                if (geoRes.ok) {
                    const geoData = await geoRes.json();

                    if (geoData?.length > 0) {
                        souradnice = `${geoData[0].lat},${geoData[0].lon}`;
                    }
                }
            } catch (err) {
                console.error('Geocoding error:', err);
            }
        }

        // -------------------------
        // RESPONSE
        // -------------------------

        return NextResponse.json({
            ico,
            obchodniNazev,
            pravniForma,
            datumVzniku,
            stavSubjektu,
            dic,
            adresaSidla,
            souradnice,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error:
                    'Selhalo spojení s registrem ARES: ' +
                    error.message,
            },
            { status: 500 }
        );
    }
}