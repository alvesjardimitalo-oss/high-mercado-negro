#!/usr/bin/env python3
"""
Mercado Negro • High — aviso de reajuste no Discord.

Lê data/catalogo.json, pega a última entrada do histórico (gerada pela planilha ao
publicar) e monta uma imagem com as mudanças. Com --enviar, posta a imagem no
webhook do Discord (variável de ambiente DISCORD_WEBHOOK).

Uso:
  python tools/discord/aviso.py                       # só gera reajuste.png (teste local)
  python tools/discord/aviso.py --enviar              # gera e posta, se esta publicação teve mudanças
  python tools/discord/aviso.py --enviar --forcar     # reposta o último reajuste do histórico
"""
import argparse
import io
import json
import os
import sys
import time
import uuid
import urllib.error
import urllib.request
from datetime import datetime

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
FONTES = os.path.join(AQUI, 'fonts')

# Paleta do site
BG = (9, 7, 13)
PANEL = (15, 12, 21)
PANEL2 = (20, 16, 27)
LINE = (38, 28, 52)
PURPLE = (141, 53, 255)
PURPLE2 = (184, 120, 255)
CAT_BG = (53, 20, 72)
YELLOW = (244, 236, 37)
TEXT = (247, 244, 251)
MUTED = (152, 145, 163)
DIM = (110, 102, 120)
RED = (255, 91, 118)
GREEN = (80, 245, 160)
WARN = (255, 191, 75)


def fonte(peso, tamanho):
    arq = {'black': 'Inter-Black.otf', 'bold': 'Inter-Bold.otf', 'medium': 'Inter-Medium.otf'}[peso]
    return ImageFont.truetype(os.path.join(FONTES, arq), tamanho)


def moeda(v):
    return 'R$ ' + f'{int(round(float(v or 0))):,}'.replace(',', '.')


def subiu(m):
    d = (m.get('pista', 0) - m.get('pista_antes', 0)) or (m.get('parceria', 0) - m.get('parceria_antes', 0))
    return d > 0


def resumo(mudancas):
    alt = [m for m in mudancas if m['tipo'] == 'alterado']
    s = sum(1 for m in alt if subiu(m))
    cont = lambda t: sum(1 for m in mudancas if m['tipo'] == t)
    return {'subiu': s, 'caiu': len(alt) - s, 'novo': cont('novo'), 'removido': cont('removido'),
            'status': cont('status'), 'renomeado': cont('renomeado')}


def data_br(iso):
    try:
        d = datetime.fromisoformat(iso)
        return d.strftime('%d/%m/%Y • %H:%M')
    except Exception:
        return iso or ''


# ─────────────────────────── desenho ───────────────────────────

def texto_cabe(draw, txt, f, largura):
    if draw.textlength(txt, font=f) <= largura:
        return txt
    while txt and draw.textlength(txt + '…', font=f) > largura:
        txt = txt[:-1]
    return txt.rstrip() + '…'


def triangulo(draw, x, y, tam, para_cima, cor):
    if para_cima:
        draw.polygon([(x, y + tam), (x + tam, y + tam), (x + tam / 2, y)], fill=cor)
    else:
        draw.polygon([(x, y), (x + tam, y), (x + tam / 2, y + tam)], fill=cor)


def selo(draw, x, y, txt, cor, f):
    w = draw.textlength(txt, font=f) + 16
    draw.rounded_rectangle([x, y, x + w, y + 20], radius=5, fill=tuple(int(c * 0.16) for c in cor), outline=cor)
    draw.text((x + 8, y + 10), txt, font=f, fill=cor, anchor='lm')
    return w


ROW_H = 52
CAT_H = 40
HEAD_H = 26
CAT_GAP = 14
COL_W = 780
PRICE_W = 185


def altura_categoria(n):
    return CAT_H + HEAD_H + n * ROW_H + CAT_GAP


def dividir_colunas(grupos, ncols):
    """Divide as categorias (em ordem) entre colunas, equilibrando a altura."""
    if ncols == 1:
        return [grupos]
    alturas = [altura_categoria(len(g[1])) for g in grupos]
    total = sum(alturas)
    melhor, idx, acc = None, 1, 0
    for i in range(1, len(grupos)):
        acc += alturas[i - 1]
        pior = max(acc, total - acc)
        if melhor is None or pior < melhor:
            melhor, idx = pior, i
    return [grupos[:idx], grupos[idx:]]


def desenhar_preco(draw, xd, y, antes, depois, cor_nova, mudou):
    """Valor alinhado à direita em xd. Se mudou: antigo riscado em cima, novo embaixo."""
    if mudou and antes is not None:
        fa, fn = fonte('medium', 13), fonte('black', 18)
        ta = moeda(antes)
        wa = draw.textlength(ta, font=fa)
        draw.text((xd, y + 15), ta, font=fa, fill=DIM, anchor='rm')
        draw.line([(xd - wa, y + 15), (xd, y + 15)], fill=DIM, width=1)
        draw.text((xd, y + 35), moeda(depois), font=fn, fill=cor_nova, anchor='rm')
    else:
        draw.text((xd, y + ROW_H / 2), moeda(depois), font=fonte('bold', 16), fill=MUTED, anchor='rm')


def desenhar_linha(draw, x, y, m, zebra):
    draw.rectangle([x, y, x + COL_W, y + ROW_H - 1], fill=PANEL if zebra else PANEL2)
    draw.line([(x, y + ROW_H - 1), (x + COL_W, y + ROW_H - 1)], fill=LINE)
    tipo = m['tipo']
    fx = x + 16
    f_nome = fonte('bold', 17)
    f_selo = fonte('black', 10)
    nome_max = COL_W - 2 * PRICE_W - 70

    # ícone / selo à esquerda
    if tipo == 'alterado':
        up = subiu(m)
        triangulo(draw, fx, y + 19, 14, up, RED if up else GREEN)
        nx = fx + 26
    else:
        rotulo, cor = {
            'novo': ('NOVO', PURPLE2), 'removido': ('SAIU', RED), 'renomeado': ('NOME', PURPLE2),
        }.get(tipo, (None, None))
        if tipo == 'status':
            rotulo, cor = {'indisponivel': ('INDISP.', RED), 'revisar': ('REVISÃO', WARN)}.get(m.get('status'), ('VOLTOU', GREEN))
        w = selo(draw, fx, y + 16, rotulo, cor, f_selo)
        nx = fx + w + 10
        nome_max -= int(w) - 16

    nome = texto_cabe(draw, m['item'], f_nome, nome_max)
    cor_nome = DIM if tipo == 'removido' else TEXT
    if m.get('renomeado_de'):
        draw.text((nx, y + 18), nome, font=f_nome, fill=cor_nome, anchor='lm')
        draw.text((nx, y + 37), texto_cabe(draw, 'antes: ' + m['renomeado_de'], fonte('medium', 12), nome_max), font=fonte('medium', 12), fill=MUTED, anchor='lm')
    else:
        draw.text((nx, y + ROW_H / 2), nome, font=f_nome, fill=cor_nome, anchor='lm')
        if tipo == 'removido':
            wn = draw.textlength(nome, font=f_nome)
            draw.line([(nx, y + ROW_H / 2), (nx + wn, y + ROW_H / 2)], fill=DIM, width=2)

    xp = x + COL_W - 16          # borda direita da coluna pista
    xc = xp - PRICE_W            # borda direita da coluna parceria
    if tipo == 'removido':
        draw.text((xc, y + ROW_H / 2), moeda(m.get('parceria_antes')), font=fonte('bold', 16), fill=DIM, anchor='rm')
        draw.text((xp, y + ROW_H / 2), moeda(m.get('pista_antes')), font=fonte('bold', 16), fill=DIM, anchor='rm')
        return
    mud_c = tipo == 'alterado' and m.get('parceria') != m.get('parceria_antes')
    mud_p = tipo == 'alterado' and m.get('pista') != m.get('pista_antes')
    desenhar_preco(draw, xc, y, m.get('parceria_antes'), m.get('parceria'), TEXT, mud_c)
    desenhar_preco(draw, xp, y, m.get('pista_antes'), m.get('pista'), YELLOW, mud_p)


def desenhar_categoria(draw, x, y, nome, itens):
    draw.rounded_rectangle([x, y, x + COL_W, y + CAT_H], radius=6, fill=CAT_BG)
    draw.rectangle([x, y, x + 6, y + CAT_H], fill=PURPLE)
    draw.text((x + 18, y + CAT_H / 2), nome.upper(), font=fonte('black', 18), fill=YELLOW, anchor='lm')
    draw.text((x + COL_W - 14, y + CAT_H / 2), f'{len(itens)} {"ITEM" if len(itens) == 1 else "ITENS"}', font=fonte('bold', 12), fill=(210, 199, 215), anchor='rm')
    y += CAT_H
    draw.rectangle([x, y, x + COL_W, y + HEAD_H], fill=(23, 17, 29))
    fh = fonte('bold', 11)
    draw.text((x + 16, y + HEAD_H / 2), 'ITEM', font=fh, fill=MUTED, anchor='lm')
    xp = x + COL_W - 16
    draw.text((xp - PRICE_W, y + HEAD_H / 2), 'PARCERIA', font=fh, fill=MUTED, anchor='rm')
    draw.text((xp, y + HEAD_H / 2), 'PISTA', font=fh, fill=MUTED, anchor='rm')
    y += HEAD_H
    for i, m in enumerate(itens):
        desenhar_linha(draw, x, y, m, i % 2 == 0)
        y += ROW_H
    return y + CAT_GAP


def gerar_imagem(entrada, site):
    mudancas = entrada['mudancas']
    grupos, pos = [], {}
    for m in mudancas:
        if m['categoria'] not in pos:
            pos[m['categoria']] = len(grupos)
            grupos.append((m['categoria'], []))
        grupos[pos[m['categoria']]][1].append(m)

    ncols = 1 if len(mudancas) <= 12 else 2
    colunas = dividir_colunas(grupos, ncols)
    M, GAP, TOP, FOOT = 32, 20, 196, 64
    W = M * 2 + COL_W * ncols + GAP * (ncols - 1)
    alt_cols = [sum(altura_categoria(len(g[1])) for g in col) for col in colunas]

    # Medidas para decidir o layout do cabeçalho/rodapé conforme a largura
    medidor = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    r = resumo(mudancas)
    fchip = fonte('black', 14)
    chips = []
    if r['subiu']: chips.append(('up', f"{r['subiu']} SUBIU" if r['subiu'] == 1 else f"{r['subiu']} SUBIRAM", RED))
    if r['caiu']: chips.append(('down', f"{r['caiu']} CAIU" if r['caiu'] == 1 else f"{r['caiu']} CAÍRAM", GREEN))
    if r['novo']: chips.append((None, f"{r['novo']} NOVO{'S' if r['novo'] > 1 else ''}", PURPLE2))
    if r['removido']: chips.append((None, f"{r['removido']} REMOVIDO{'S' if r['removido'] > 1 else ''}", RED))
    if r['status']: chips.append((None, f"{r['status']} STATUS", WARN))
    if r['renomeado']: chips.append((None, f"{r['renomeado']} RENOMEADO{'S' if r['renomeado'] > 1 else ''}", PURPLE2))
    largura_chips = sum(medidor.textlength(t, font=fchip) + (40 if i else 24) + 10 for i, t, _ in chips)
    f_por = fonte('medium', 14)
    txt_por = ('Publicado por ' + entrada['por']) if entrada.get('por') else ''
    x_titulo_est = M + 172
    por_embaixo = bool(txt_por) and (x_titulo_est + largura_chips + 24 + medidor.textlength(txt_por, font=f_por) > W - M)
    if por_embaixo:
        TOP += 30
    link = (site.rstrip('/') + '/tabela.html').replace('https://', '') if site else ''
    f_link, f_aviso = fonte('bold', 14), fonte('bold', 12)
    txt_link = 'TABELA COMPLETA:  ' + link if link else ''
    txt_aviso = 'VALORES DA ECONOMIA FICTÍCIA DO SERVIDOR • FIVEM'
    rodape_duplo = medidor.textlength(txt_link, font=f_link) + medidor.textlength(txt_aviso, font=f_aviso) + 40 > W - 2 * M
    if rodape_duplo:
        FOOT = 84
    H = TOP + max(alt_cols) + FOOT

    img = Image.new('RGB', (W, H), BG)
    brilho = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(brilho)
    bd.ellipse([W - 620, -300, W + 200, 420], fill=(114, 21, 185, 110))
    bd.ellipse([-260, H - 380, 360, H + 240], fill=(93, 44, 255, 50))
    img.paste(brilho.filter(ImageFilter.GaussianBlur(110)), (0, 0), brilho.filter(ImageFilter.GaussianBlur(110)))
    draw = ImageDraw.Draw(img)

    # Cabeçalho
    x_titulo = M
    try:
        logo = Image.open(os.path.join(RAIZ, 'assets', 'high_logo.png')).convert('RGBA')
        logo.thumbnail((150, 112), Image.LANCZOS)
        img.paste(logo, (M, 26), logo)
        x_titulo = M + logo.width + 22
    except Exception:
        pass
    draw.text((x_titulo, 46), 'MERCADO NEGRO • HIGH ROLEPLAY', font=fonte('black', 15), fill=PURPLE2, anchor='lm')
    draw.text((x_titulo, 88), 'REAJUSTE DA TABELA', font=fonte('black', 44), fill=TEXT, anchor='lm')

    cx, cy = x_titulo, 124
    for icone, txt, cor in chips:
        w = draw.textlength(txt, font=fchip) + (40 if icone else 24)
        draw.rounded_rectangle([cx, cy, cx + w, cy + 32], radius=8, fill=tuple(int(c * 0.14) for c in cor), outline=cor, width=1)
        tx = cx + 12
        if icone:
            triangulo(draw, tx, cy + 10, 12, icone == 'up', cor)
            tx += 20
        draw.text((tx, cy + 16), txt, font=fchip, fill=cor, anchor='lm')
        cx += w + 10

    draw.text((W - M, 46), data_br(entrada.get('em')), font=fonte('black', 18), fill=TEXT, anchor='rm')
    if txt_por:
        if por_embaixo:
            draw.text((x_titulo, 174), txt_por, font=f_por, fill=MUTED, anchor='lm')
        else:
            draw.text((W - M, cy + 16), txt_por, font=f_por, fill=MUTED, anchor='rm')
    draw.line([(M, TOP - 18), (W - M, TOP - 18)], fill=(58, 40, 80), width=1)

    # Colunas
    for ci, col in enumerate(colunas):
        x = M + ci * (COL_W + GAP)
        y = TOP
        for nome, itens in col:
            y = desenhar_categoria(draw, x, y, nome, itens)

    # Rodapé
    draw.rectangle([0, H - FOOT, W, H], fill=(12, 9, 16))
    draw.rectangle([0, H - FOOT, W, H - FOOT + 3], fill=PURPLE)
    if rodape_duplo:
        if txt_link:
            draw.text((M, H - FOOT + 30), txt_link, font=f_link, fill=YELLOW, anchor='lm')
        draw.text((M, H - FOOT + 58), txt_aviso, font=f_aviso, fill=DIM, anchor='lm')
    else:
        if txt_link:
            draw.text((M, H - FOOT / 2 + 1), txt_link, font=f_link, fill=YELLOW, anchor='lm')
        draw.text((W - M, H - FOOT / 2 + 1), txt_aviso, font=f_aviso, fill=DIM, anchor='rm')

    buf = io.BytesIO()
    img.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


# ─────────────────────────── Discord ───────────────────────────

def texto_mensagem(entrada, site):
    r = resumo(entrada['mudancas'])
    partes = []
    if r['subiu']: partes.append(f"🔺 {r['subiu']} subiu")
    if r['caiu']: partes.append(f"🔻 {r['caiu']} caiu")
    if r['novo']: partes.append(f"🆕 {r['novo']} novo(s)")
    if r['removido']: partes.append(f"🗑️ {r['removido']} removido(s)")
    if r['status']: partes.append(f"⚠️ {r['status']} mudança(s) de status")
    if r['renomeado']: partes.append(f"✏️ {r['renomeado']} renomeado(s)")
    linhas = ['📢 **Tabela do Mercado Negro atualizada** — ' + ' • '.join(partes)]
    rodape = []
    if site:
        rodape.append(f"🔗 Tabela completa: <{site.rstrip('/')}/tabela.html>")
    if entrada.get('por'):
        rodape.append(f"Publicado por **{entrada['por']}**")
    if rodape:
        linhas.append('  •  '.join(rodape))
    return '\n'.join(linhas)


def postar(webhook, conteudo, png, nome='reajuste.png'):
    limite = '----hmn' + uuid.uuid4().hex
    payload = {
        'username': 'Mercado Negro • High',
        'content': conteudo,
        'allowed_mentions': {'parse': []},
        'attachments': [{'id': 0, 'filename': nome, 'description': 'Reajuste da tabela do Mercado Negro'}],
    }
    corpo = io.BytesIO()
    def parte(cab, dados):
        corpo.write(f'--{limite}\r\n'.encode())
        corpo.write(cab.encode() + b'\r\n\r\n')
        corpo.write(dados)
        corpo.write(b'\r\n')
    parte('Content-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json', json.dumps(payload).encode())
    parte(f'Content-Disposition: form-data; name="files[0]"; filename="{nome}"\r\nContent-Type: image/png', png)
    corpo.write(f'--{limite}--\r\n'.encode())
    dados = corpo.getvalue()

    for tentativa in range(5):
        req = urllib.request.Request(webhook, data=dados, method='POST', headers={
            'Content-Type': f'multipart/form-data; boundary={limite}',
            'User-Agent': 'high-mercado-negro (github actions)',
        })
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                print(f'Discord: enviado (HTTP {resp.status}).')
                return
        except urllib.error.HTTPError as e:
            txt = e.read().decode('utf-8', 'replace')
            if e.code == 429 or e.code >= 500:
                espera = [3, 8, 20, 45, 60][tentativa]
                try:
                    espera = max(espera, float(json.loads(txt).get('retry_after', 0)))
                except Exception:
                    pass
                print(f'Discord {e.code}: aguardando {espera:.0f}s e tentando de novo…')
                time.sleep(min(espera, 60))
                continue
            raise SystemExit(f'Discord recusou a mensagem: HTTP {e.code} {txt[:300]}')
        except urllib.error.URLError as e:
            espera = [3, 8, 20, 45, 60][tentativa]
            print(f'Falha de rede ({e.reason}): aguardando {espera}s e tentando de novo…')
            time.sleep(espera)
    raise SystemExit('Não foi possível enviar ao Discord após 5 tentativas.')


def site_padrao():
    if os.environ.get('SITE_URL'):
        return os.environ['SITE_URL']
    repo = os.environ.get('GITHUB_REPOSITORY', 'alvesjardimitalo-oss/high-mercado-negro')
    dono, nome = repo.split('/', 1)
    return f'https://{dono.lower()}.github.io/{nome}/'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--catalogo', default=os.path.join(RAIZ, 'data', 'catalogo.json'))
    ap.add_argument('--saida', default='reajuste.png')
    ap.add_argument('--enviar', action='store_true', help='posta no Discord (usa DISCORD_WEBHOOK)')
    ap.add_argument('--forcar', action='store_true', help='usa o último reajuste do histórico mesmo que não seja desta publicação')
    a = ap.parse_args()

    cat = json.load(open(a.catalogo, encoding='utf-8'))
    hist = cat.get('historico') or []
    if not hist or not hist[0].get('mudancas'):
        print('Nenhum reajuste no histórico. Nada a enviar.')
        return
    entrada = hist[0]
    if not a.forcar and entrada.get('em') != (cat.get('meta') or {}).get('atualizado_em'):
        print('Esta publicação não teve mudanças de preço. Nada a enviar.')
        return

    site = site_padrao()
    png = gerar_imagem(entrada, site)
    with open(a.saida, 'wb') as f:
        f.write(png)
    texto = texto_mensagem(entrada, site)
    print(f'Imagem gerada: {a.saida} ({len(png) // 1024} KB, {len(entrada["mudancas"])} mudanças)')
    print('Mensagem:\n' + texto)

    if a.enviar:
        hook = os.environ.get('DISCORD_WEBHOOK', '').strip()
        if not hook:
            print('::warning::Segredo DISCORD_WEBHOOK não configurado no repositório — aviso não enviado.')
            return
        postar(hook, texto, png)


if __name__ == '__main__':
    main()
