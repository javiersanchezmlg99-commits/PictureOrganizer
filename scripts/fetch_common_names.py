"""
Fetch common names (EN + ES) for Animalia-only iNat21 species from GBIF API.
Skips Plantae/Fungi. Caches progress to resume on interruption.
"""

import json
import urllib.request
import urllib.parse
import time
import os

LABELS_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'inat21_labels.json')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'common_names.json')
CACHE_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', '_common_names_cache.json')

SKIP_KINGDOMS = {'Plantae', 'Fungi', 'Chromista', 'Bacteria', 'Protozoa'}


def gbif_match(scientific_name):
    """Match species and return (usage_key, kingdom)."""
    url = f'https://api.gbif.org/v1/species/match?name={urllib.parse.quote(scientific_name)}'
    try:
        resp = urllib.request.urlopen(url, timeout=10)
        data = json.loads(resp.read())
        return data.get('usageKey'), data.get('kingdom', '')
    except:
        return None, ''


def get_vernacular(usage_key):
    """Fetch EN + ES vernacular names for a GBIF usage key."""
    vurl = f'https://api.gbif.org/v1/species/{usage_key}/vernacularNames?limit=100'
    try:
        vresp = urllib.request.urlopen(vurl, timeout=10)
        vdata = json.loads(vresp.read())
        en_name = es_name = None
        for v in vdata.get('results', []):
            lang = v.get('language', '').lower()
            name = v.get('vernacularName', '')
            if lang == 'eng' and not en_name:
                en_name = name
            elif lang == 'spa' and not es_name:
                es_name = name
            if en_name and es_name:
                break
        return en_name, es_name
    except:
        return None, None


def main():
    labels = json.load(open(LABELS_PATH, encoding='utf-8'))

    # Load existing cache
    if os.path.exists(CACHE_PATH):
        cache = json.load(open(CACHE_PATH, encoding='utf-8'))
        print(f"Resuming from cache ({len(cache)} species already processed)")
    else:
        cache = {}

    total = len(labels)
    skipped = 0
    fetched = 0
    found_en = 0
    found_es = 0

    for i, species in enumerate(labels):
        if species in cache:
            entry = cache[species]
            if entry.get('en'):
                found_en += 1
            if entry.get('es'):
                found_es += 1
            if entry.get('skipped'):
                skipped += 1
            continue

        # Check kingdom first
        usage_key, kingdom = gbif_match(species)

        if kingdom in SKIP_KINGDOMS:
            cache[species] = {'skipped': True, 'kingdom': kingdom}
            skipped += 1
            if (i + 1) % 100 == 0:
                print(f"[{i+1}/{total}] SKIP {kingdom}: {species} | skipped={skipped}")
            time.sleep(0.1)
            continue

        # Animalia — fetch vernacular names
        en, es = None, None
        if usage_key:
            en, es = get_vernacular(usage_key)

        cache[species] = {'en': en, 'es': es, 'kingdom': kingdom}
        fetched += 1
        if en:
            found_en += 1
        if es:
            found_es += 1

        if (i + 1) % 50 == 0:
            print(f"[{i+1}/{total}] EN:{found_en} ES:{found_es} skipped:{skipped} | {species} -> en={en}, es={es}")
            json.dump(cache, open(CACHE_PATH, 'w', encoding='utf-8'), ensure_ascii=False)

        time.sleep(0.15)

    # Final save — only Animalia with at least one name
    result = {}
    for species, entry in cache.items():
        if entry.get('skipped'):
            continue
        en = entry.get('en')
        es = entry.get('es')
        if en or es:
            result[species] = {
                'en': en or species,
                'es': es or en or species,
            }

    json.dump(result, open(OUTPUT_PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f"\nDone! {len(result)} Animalia species with common names -> {OUTPUT_PATH}")
    print(f"EN: {found_en}, ES: {found_es}, skipped non-animal: {skipped}")


if __name__ == '__main__':
    main()
