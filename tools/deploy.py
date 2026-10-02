#!/usr/bin/env python3
"""
Laedt die App per FTP in das Verzeichnis auf dem Hostinger-Webspace — genau
das, was man sonst von Hand in FileZilla macht: Versionsstempel frisch
schreiben, Regeln pruefen, auf dem Server alles Alte loeschen, was nicht mehr
dazugehoert, und alle Dateien der App hochladen.

    python3 tools/deploy.py            # hochladen, was sich geaendert hat
    python3 tools/deploy.py --all      # alles neu hochladen
    python3 tools/deploy.py --dry-run  # nur zeigen, was passieren wuerde

Die Zugangsdaten stehen NICHT im Projekt, sondern in einer eigenen Datei
ausserhalb des Repositories (siehe CONFIG_PATH), Zeile fuer Zeile als
NAME=WERT:

    HOST=ftp.deine-domain.de         FTP-Server aus dem Hostinger-Panel
    USER=u123456789.deine-domain.de  FTP-Benutzer
    PASSWORD=...                     FTP-Passwort
    REMOTE_DIR=/public_html/paralist-android   Zielordner auf dem Server
    URL=https://deine-domain.de/paralist-android/   Adresse der App (nur fuer die Meldung)
    PORT=21                          optional, Vorgabe 21
    TLS=1                            optional, 1 = verschluesselt (FTPS), 0 = einfaches FTP

Welche Dateien zur App gehoeren, weiss tools/version.py (SERVED); dazu kommt
.htaccess (EXTRA). Der Server merkt sich in .paralist-deploy.json, welche
Fassung jeder Datei dort liegt — so laedt der naechste Lauf nur, was sich
geaendert hat. Das Skript braucht nur Python 3.

ANPASSBARE WERTE IN DIESER DATEI
-----------------------------------
CONFIG_PATH -> wo die Zugangsdaten liegen (die Umgebungsvariable
               PARALIST_DEPLOY_CONFIG zeigt fuer einen Test woandershin)
EXTRA       -> Dateien, die zusaetzlich zu SERVED (tools/version.py) hochgeladen werden
MANIFEST    -> Name der Merkdatei auf dem Server
"""

import ftplib
import hashlib
import io
import json
import os
import pathlib
import subprocess
import sys

sys.dont_write_bytecode = True
import version  # noqa: E402  tools/version.py liegt daneben

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG_PATH = pathlib.Path(os.environ.get("PARALIST_DEPLOY_CONFIG") or pathlib.Path.home() / ".config" / "paralist-android" / "deploy.env")
EXTRA = (".htaccess",)
MANIFEST = ".paralist-deploy.json"


def read_config():
    """Zugangsdaten aus der Datei lesen; fehlt etwas, sagt das Skript, was."""
    if not CONFIG_PATH.exists():
        sys.exit(f"Keine Zugangsdaten: lege {CONFIG_PATH} an (Aufbau siehe oben in tools/deploy.py).")
    config = {}
    for line in CONFIG_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            config[key.strip()] = value.strip()
    missing = [key for key in ("HOST", "USER", "PASSWORD", "REMOTE_DIR") if not config.get(key)]
    if missing:
        sys.exit(f"In {CONFIG_PATH} fehlt: {', '.join(missing)}")
    config.setdefault("PORT", "21")
    config.setdefault("TLS", "1")
    config.setdefault("URL", "")
    return config


def run_checks():
    """Erst der frische Versionsstempel, dann die Regeln — ohne 'alles in Ordnung' wird nichts hochgeladen."""
    subprocess.run([sys.executable, str(ROOT / "tools" / "version.py")], check=True)
    result = subprocess.run([sys.executable, str(ROOT / "tools" / "check.py")])
    if result.returncode:
        sys.exit("tools/check.py meldet Funde — erst beheben, dann hochladen.")


def local_files():
    """Alle Dateien der App mit ihrem Pruefwert, Pfad -> sha256."""
    names = ["src/data/version.js"] + version.served_files() + [name for name in EXTRA if (ROOT / name).is_file()]
    return {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in sorted(set(names))}


def connect(config):
    port = int(config["PORT"])
    if config["TLS"] == "1":
        ftp = ftplib.FTP_TLS()
        ftp.connect(config["HOST"], port, timeout=30)
        ftp.login(config["USER"], config["PASSWORD"])
        ftp.prot_p()
    else:
        ftp = ftplib.FTP()
        ftp.connect(config["HOST"], port, timeout=30)
        ftp.login(config["USER"], config["PASSWORD"])
    ftp.set_pasv(True)
    return ftp


def ensure_dir(ftp, path):
    """In den Zielordner wechseln und ihn vorher anlegen, falls er fehlt."""
    try:
        ftp.cwd(path)
        return
    except ftplib.error_perm:
        pass
    parts = [part for part in path.split("/") if part]
    ftp.cwd("/" if path.startswith("/") else ".")
    for part in parts:
        try:
            ftp.cwd(part)
        except ftplib.error_perm:
            ftp.mkd(part)
            ftp.cwd(part)


def remote_manifest(ftp):
    """Was laut Merkdatei schon auf dem Server liegt, Pfad -> sha256 (leer beim ersten Mal)."""
    buffer = io.BytesIO()
    try:
        ftp.retrbinary(f"RETR {MANIFEST}", buffer.write)
        return json.loads(buffer.getvalue().decode("utf-8"))
    except (ftplib.error_perm, ValueError):
        return {}


def remote_files(ftp, prefix=""):
    """Alle Dateien unterhalb des Zielordners, rekursiv — um Altes zu finden."""
    found = []
    try:
        entries = list(ftp.mlsd(prefix or ".", ["type"]))
    except ftplib.error_perm:
        # Server ohne MLSD: nur die flache Liste, Unterordner werden erkundet
        entries = []
        for name in ftp.nlst(prefix or "."):
            short = name.rsplit("/", 1)[-1]
            try:
                ftp.cwd(f"{prefix}/{short}" if prefix else short)
                ftp.cwd("/" + (ftp.pwd().rsplit("/", 1)[0] if prefix else ""))
                entries.append((short, {"type": "dir"}))
            except ftplib.error_perm:
                entries.append((short, {"type": "file"}))
    for name, facts in entries:
        if name in (".", ".."):
            continue
        path = f"{prefix}/{name}" if prefix else name
        if facts.get("type") == "dir":
            found.extend(remote_files(ftp, path))
        elif facts.get("type") == "file":
            found.append(path)
    return found


def upload(ftp, name):
    """Eine Datei hochladen; fehlende Unterordner entstehen dabei."""
    parts = name.split("/")
    folder = ""
    for part in parts[:-1]:
        folder = f"{folder}/{part}" if folder else part
        try:
            ftp.mkd(folder)
        except ftplib.error_perm:
            pass
    with (ROOT / name).open("rb") as handle:
        ftp.storbinary(f"STOR {name}", handle)


def remove_empty_dirs(ftp, removed):
    """Ordner, die nach dem Loeschen leer sind, mit wegnehmen (tiefste zuerst)."""
    folders = sorted({name.rsplit("/", 1)[0] for name in removed if "/" in name}, key=len, reverse=True)
    for folder in folders:
        try:
            ftp.rmd(folder)
        except ftplib.error_perm:
            pass


def main():
    dry = "--dry-run" in sys.argv
    everything = "--all" in sys.argv
    config = read_config()
    run_checks()
    wanted = local_files()

    ftp = connect(config)
    ensure_dir(ftp, config["REMOTE_DIR"])
    known = {} if everything else remote_manifest(ftp)
    present = set(remote_files(ftp))

    stale = sorted(name for name in present if name not in wanted and name != MANIFEST)
    changed = [name for name, digest in wanted.items() if known.get(name) != digest or name not in present]
    # version.js zuletzt: erst wenn alles andere liegt, sieht eine offene App die neue Fassung
    changed.sort(key=lambda name: (name == "src/data/version.js", name))

    print(f"Server: {config['HOST']}{config['REMOTE_DIR']}")
    print(f"{len(stale)} Datei(en) loeschen, {len(changed)} hochladen, {len(wanted) - len(changed)} unveraendert")
    for name in stale:
        print(f"  loeschen  {name}")
    for name in changed:
        print(f"  hochladen {name}")
    if dry:
        ftp.quit()
        print("Probelauf — nichts geaendert.")
        return 0

    for name in stale:
        ftp.delete(name)
    remove_empty_dirs(ftp, stale)
    for name in changed:
        upload(ftp, name)
    ftp.storbinary(f"STOR {MANIFEST}", io.BytesIO(json.dumps(wanted, indent=1).encode("utf-8")))
    ftp.quit()
    print(f"Fertig. Version {version.stamp(version.served_files())}" + (f" unter {config['URL']}" if config["URL"] else ""))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ftplib.all_errors as error:
        sys.exit(f"FTP-Fehler: {error}")
