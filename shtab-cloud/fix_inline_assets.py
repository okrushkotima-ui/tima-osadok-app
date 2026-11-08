"""Build-time CSP compatibility patch for Shtab v0.4 cloud trial.
Run after extracting the verified 0.4 source archive.
No agent, editor, upload, or database logic is changed.
"""
from pathlib import Path
import re, sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path("/app")
hp=root/"static"/"shtab04.html"
ap=root/"server"/"app_v04.py"
html=hp.read_text(encoding="utf-8")
css=re.search(r"<style>\s*(.*?)\s*</style>",html,re.S)
js=re.search(r"<script>\s*(.*?)\s*</script>",html,re.S)
if not css or not js or len(css.group(1))<500 or len(js.group(1))<500:
    raise RuntimeError("Unexpected original HTML: refusing unsafe patch")
css_text=css.group(1)+"\n.gate-panel{background:#0b1428;padding:12px}.gate-list{white-space:pre-wrap;line-height:1.7;margin-top:9px}.file-lines{white-space:pre-wrap}\n"
js_text=js.group(1).replace("$('assets').style.whiteSpace='pre-wrap';","$('assets').classList.add('file-lines');")
html=html.replace(css.group(0),'<link rel="stylesheet" href="/assets/shtab04.css">',1)
html=html.replace(js.group(0),'<script src="/assets/shtab04.js" defer></script>',1)
html=html.replace('class="panel" style="background:#0b1428;padding:12px"','class="panel gate-panel"',1)
html=html.replace('id="gates" class="tiny" style="white-space:pre-wrap;line-height:1.7;margin-top:9px"','id="gates" class="tiny gate-list"',1)
html=html.replace("MVP 0.4 · LOCAL","MVP 0.4 · CLOUD TRIAL",1)
html=html.replace("Ключ локального сервера","Ключ доступа Render",1)
html=html.replace("5 лайфхаков для рэпера","Лайфхак №1 — тест команды",1)
html=html.replace("Сделать пять самостоятельных вертикальных роликов с понятными хуками и естественной речью.","Проверить на одном ролике полный цикл согласования: Тима → Джон → Семён → QC → Рик → Тима.",1)
if "style=" in html or re.search(r"<script>(.*?)</script>",html,re.S) or "<style>" in html:
    raise RuntimeError("CSP unsafe inline content remains")
hp.write_text(html,encoding="utf-8")
(root/"static"/"shtab04.css").write_text(css_text,encoding="utf-8")
(root/"static"/"shtab04.js").write_text(js_text,encoding="utf-8")
app=ap.read_text(encoding="utf-8")
needle="from fastapi.responses import FileResponse"
route=" @app.get('/')\n def home():return FileResponse(ROOT/'static'/'shtab04.html')"
if app.count(needle)!=1 or app.count(route)!=1:
    raise RuntimeError("Unexpected application structure: refusing unsafe patch")
app=app.replace(needle,needle+"\nfrom fastapi.staticfiles import StaticFiles",1)
app=app.replace(route," app.mount('/assets',StaticFiles(directory=ROOT/'static'),name='assets')\n"+route,1)
ap.write_text(app,encoding="utf-8")
print("CSP assets split, static mount added; auth & API logic unchanged")
