import json, glob
for fn in sorted(glob.glob('content/*.json')):
    d = json.load(open(fn))
    def walk(o, path=''):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, f'{path}.{k}')
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, f'{path}[{i}]')
        else:
            s = str(o)
            if 'NICE' in s or 'centyl' in s.lower() or 'kanał' in s.lower() or 'kanal' in s.lower():
                print(fn, path, '=>', s[:500])
                print()
    walk(d)
