"""Compila e instala o aplicativo local do Card Forge no macOS, sem dependências Python."""
import hashlib
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import tempfile


def run(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)


def install():
    project = Path(__file__).resolve().parents[2]
    applications = Path.home() / "Applications"
    applications.mkdir(exist_ok=True)
    destination = applications / "Card Forge.app"
    if destination.exists():
        raise SystemExit("Card Forge.app já existe. A instalação foi preservada; remova ou renomeie o aplicativo antes de reinstalar.")
    with tempfile.TemporaryDirectory(prefix=".card-forge-install-", dir=applications) as temporary:
        build = Path(temporary)
        app = build / "Card Forge.app"
        executable = app / "Contents/MacOS/Card Forge"
        resources = app / "Contents/Resources"
        executable.parent.mkdir(parents=True)
        resources.mkdir(parents=True)
        run("/usr/bin/xcrun", "swiftc", "-swift-version", "5", "-O", "-target", "arm64-apple-macos13.0",
            "-framework", "AppKit", "-framework", "WebKit", str(project / "card-forge/macos/CardForge.swift"), "-o", str(executable))
        iconset = build / "AppIcon.iconset"
        iconset.mkdir()
        source_icon = project / "LOGO/app-icon-512.png"
        for size in [16, 32, 128, 256, 512]:
            for scale in [1, 2]:
                suffix = "@2x" if scale == 2 else ""
                run("/usr/bin/sips", "-z", str(size * scale), str(size * scale), str(source_icon),
                    "--out", str(iconset / f"icon_{size}x{size}{suffix}.png"))
        run("/usr/bin/iconutil", "-c", "icns", str(iconset), "-o", str(resources / "AppIcon.icns"))
        info = {
            "CFBundleName": "Card Forge",
            "CFBundleDisplayName": "Card Forge",
            "CFBundleIdentifier": "com.saintseiyatcg.cardforge",
            "CFBundleExecutable": "Card Forge",
            "CFBundlePackageType": "APPL",
            "CFBundleShortVersionString": "1.0",
            "CFBundleVersion": "1",
            "CFBundleIconFile": "AppIcon",
            "LSMinimumSystemVersion": "13.0",
            "LSApplicationCategoryType": "public.app-category.graphics-design",
            "LSMultipleInstancesProhibited": True,
            "NSHighResolutionCapable": True,
            "NSPrincipalClass": "NSApplication",
            "NSAppTransportSecurity": {"NSAllowsLocalNetworking": True, "NSAllowsArbitraryLoadsInWebContent": True},
            "CardForgeProjectRoot": str(project),
        }
        with (app / "Contents/Info.plist").open("wb") as file:
            plistlib.dump(info, file)
        run("/usr/bin/codesign", "--force", "--sign", "-", "--timestamp=none", str(app))
        run("/usr/bin/codesign", "--verify", "--strict", str(app))
        os.replace(app, destination)
    register = Path("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister")
    run(str(register), "-f", str(destination))
    print(f"Instalado: {destination}")
    print(f"Executável SHA-256: {hashlib.sha256((destination / 'Contents/MacOS/Card Forge').read_bytes()).hexdigest()}")


if __name__ == "__main__":
    install()
