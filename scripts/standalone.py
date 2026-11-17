"""Generate the single-file editor from the current browser sources and statistics."""
from pathlib import Path
import re

public = Path(__file__).resolve().parents[1] / "public"
template = (public / "index.html").read_text()

def inline_script(match):
    source = (public / match[1]).read_text()
    return "<script>" + source.replace("</script", "<\\/script") + "</script>"

html = re.sub(r'<script src="([^"]+)"></script>', inline_script, template)
(public / "standalone.html").write_text(html)
