"""Split a SQL file into single statements (handles quotes, $tag$ bodies and comments).
Usage: split_sql.py in.sql out_prefix [max_chars]  -> out_prefix0.json, out_prefix1.json, ..."""
import json, re, sys

def split(t):
    out, buf, i, n = [], [], 0, len(t)
    dq, sq, dqi = None, False, False
    while i < n:
        c = t[i]
        if dq:
            if t.startswith(dq, i):
                buf.append(dq); i += len(dq); dq = None; continue
            buf.append(c); i += 1; continue
        if sq:
            buf.append(c)
            if c == "'":
                if i + 1 < n and t[i + 1] == "'": buf.append("'"); i += 2; continue
                sq = False
            i += 1; continue
        if dqi:
            buf.append(c)
            if c == '"': dqi = False
            i += 1; continue
        if c == '-' and t.startswith('--', i):
            j = t.find('\n', i); i = n if j < 0 else j; continue
        if c == '/' and t.startswith('/*', i):
            j = t.find('*/', i); i = n if j < 0 else j + 2; continue
        if c == "'": sq = True; buf.append(c); i += 1; continue
        if c == '"': dqi = True; buf.append(c); i += 1; continue
        if c == '$':
            m = re.match(r'\$[A-Za-z_][A-Za-z_0-9]*\$|\$\$', t[i:i + 64])
            if m: dq = m.group(0); buf.append(dq); i += len(dq); continue
        if c == ';':
            s = ''.join(buf).strip()
            if s: out.append(s)
            buf = []; i += 1; continue
        if c == '\\' and (i == 0 or t[i - 1] == '\n'):   # psql meta-command line
            j = t.find('\n', i); i = n if j < 0 else j; continue
        buf.append(c); i += 1
    s = ''.join(buf).strip()
    if s: out.append(s)
    return out

if __name__ == '__main__':
    src, prefix = sys.argv[1], sys.argv[2]
    cap = int(sys.argv[3]) if len(sys.argv) > 3 else 34000
    stmts = [re.sub(r'\n[ \t]+', '\n ', s) for s in split(open(src).read())]
    stmts = [s for s in stmts if not re.match(r"^(SET |SELECT pg_catalog\.set_config)", s)]
    chunks, cur, size = [], [], 0
    for s in stmts:
        if size + len(s) > cap and cur: chunks.append(cur); cur, size = [], 0
        cur.append(s); size += len(s)
    if cur: chunks.append(cur)
    for k, c in enumerate(chunks):
        json.dump(["set local check_function_bodies = off"] + c, open(f'{prefix}{k}.json', 'w'), ensure_ascii=False)
    print(len(stmts), [len(c) for c in chunks], [sum(map(len, c)) for c in chunks])
