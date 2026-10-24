"""Compila e instala o aplicativo local do STAR HILL no macOS, sem dependências Python."""
import argparse
from datetime import datetime
import hashlib
import os
from pathlib import Path
import plistlib
import subprocess
import tempfile


def run(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)


def install(update=False):
    project = Path(__file__).resolve().parents[2]
    applications = Path.home() / "Applications"
    applications.mkdir(exist_ok=True)
    destination = applications / "STAR HILL.app"
    if destination.exists() and not update:
        raise SystemExit("STAR HILL.app já existe. A instalação foi preservada; remova ou renomeie o aplicativo antes de reinstalar.")
    if destination.exists():
        with (destination / 'Contents/Info.plist').open('rb') as file:
            previous = plistlib.load(file)
        if previous.get('CFBundleIdentifier') != 'com.saintseiyatcg.starhill' or previous.get('StarHillProjectRoot') != str(project):
            raise SystemExit('O aplicativo existente pertence a outra instalação. Ele foi preservado.')
        if subprocess.run(['/usr/bin/pgrep', '-x', 'STAR HILL'], stdout=subprocess.DEVNULL).returncode == 0:
            raise SystemExit('Feche o STAR HILL antes de atualizar. Seus arquivos de projeto serão preservados.')
    with tempfile.TemporaryDirectory(prefix=".star-hill-install-", dir=applications) as temporary:
        build = Path(temporary)
        app = build / "STAR HILL.app"
        executable = app / "Contents/MacOS/STAR HILL"
        resources = app / "Contents/Resources"
        executable.parent.mkdir(parents=True)
        resources.mkdir(parents=True)
        run("/usr/bin/xcrun", "swiftc", "-swift-version", "5", "-O", "-target", "arm64-apple-macos13.0",
            "-framework", "AppKit", "-framework", "WebKit", str(project / "star-hill/macos/StarHill.swift"), "-o", str(executable))
        iconset = build / "AppIcon.iconset"
        iconset.mkdir()
        source_icon = build / "StarHill.png"
        icon_generator = build / "RenderIcon"
        run("/usr/bin/xcrun", "swiftc", "-O", "-framework", "AppKit",
            str(project / "star-hill/macos/RenderIcon.swift"), "-o", str(icon_generator))
        run(str(icon_generator), str(source_icon))
        for size in [16, 32, 128, 256, 512]:
            for scale in [1, 2]:
                suffix = "@2x" if scale == 2 else ""
                run("/usr/bin/sips", "-z", str(size * scale), str(size * scale), str(source_icon),
                    "--out", str(iconset / f"icon_{size}x{size}{suffix}.png"))
        run("/usr/bin/iconutil", "-c", "icns", str(iconset), "-o", str(resources / "AppIcon.icns"))
        info = {
            "CFBundleName": "STAR HILL",
            "CFBundleDisplayName": "STAR HILL",
            "CFBundleIdentifier": "com.saintseiyatcg.starhill",
            "CFBundleExecutable": "STAR HILL",
            "CFBundlePackageType": "APPL",
            "CFBundleShortVersionString": "1.0",
            "CFBundleVersion": "1",
            "CFBundleIconFile": "AppIcon",
            "LSMinimumSystemVersion": "13.0",
            "LSApplicationCategoryType": "public.app-category.developer-tools",
            "LSMultipleInstancesProhibited": True,
            "NSHighResolutionCapable": True,
            "NSPrincipalClass": "NSApplication",
            "NSAppTransportSecurity": {"NSAllowsLocalNetworking": True, "NSAllowsArbitraryLoadsInWebContent": True},
            "StarHillProjectRoot": str(project),
        }
        with (app / "Contents/Info.plist").open("wb") as file:
            plistlib.dump(info, file)
        run("/usr/bin/codesign", "--force", "--sign", "-", "--timestamp=none", str(app))
        run("/usr/bin/codesign", "--verify", "--strict", str(app))
        backup = None
        if destination.exists():
            backups = applications / '.star-hill-backups'
            backups.mkdir(exist_ok=True)
            backup = backups / ('STAR HILL-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f') + '.app')
            os.replace(destination, backup)
        try:
            os.replace(app, destination)
        except Exception:
            if backup:
                os.replace(backup, destination)
            raise
    register = Path("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister")
    run(str(register), "-f", str(destination))
    print(f"Instalado: {destination}")
    print(f"Executável SHA-256: {hashlib.sha256((destination / 'Contents/MacOS/STAR HILL').read_bytes()).hexdigest()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--update', action='store_true', help='Atualizar esta instalação, preservando o aplicativo anterior em backup.')
    install(parser.parse_args().update)
