# ![Preview image of app icon](bbapp.webp) BeastieBuddy

BeastieBuddy is a Final Fantasy XIV companion application for searching creatures and displaying their locations on an in-game-style map.

![Preview image of overlay](bb%20app%20overlay.PNG)
<br>
![Preview image of overlay](bestiarysampleimage.PNG)
## Download

[**Download BeastieBuddy for Windows**](https://github.com/rail2025/BeastieBuddy-APP/releases/latest/download/beastiebuddy-app.exe)

No installer. Download the `.exe` and run it.

### Windows Security Warning

BeastieBuddy is distributed without a commercial code-signing certificate, so Windows may display an **"Unknown publisher"** warning when you first run it.

This warning appears because the application is not digitally signed with a certificate recognized by Windows. It does **not** mean that the app has malware.

BeastieBuddy's code is available in this repository for inspection, and you can build the application yourself if you prefer.

If you downloaded BeastieBuddy from this official GitHub repository/release:

1. Click **More info** on the Windows warning.
2. Verify that you downloaded the file from this repository.
3. Click **Run anyway** to launch BeastieBuddy.

### Download Verification

The official Windows executable can be verified using its SHA-256 checksum.

**Current Windows EXE SHA-256:**

`0fbc6344c987c22760c27b914ac9ad21b726d9d79729ab4c480adc047829a548`

To calculate the SHA-256 checksum of a downloaded file in Windows PowerShell:

Get-FileHash .\beastiebuddy-app.exe -Algorithm SHA256



## Features

* Beast/Mob search
* Creature location information
* Zone map display
* Location marker
* Always-on-top map window
* Adjustable map opacity
* Map window roll-up
* FFXIV zone and map resolution through XIVAPI

## Requirements

For normal use, download an official BeastieBuddy release.

Building from source requires:

* Node.js
* npm
* Rust
* Tauri 2
* A Windows development environment for Windows builds

## Building

Install the JavaScript dependencies
Build the frontend and the Windows application without creating an installer
The resulting executable is produced under:
```text
src-tauri/target/release/
```

## Source Availability

The complete source code is provided publicly for inspection, security review, educational purposes, and personal non-commercial builds.
Public availability of this repository does not mean that the project is licensed under an open-source license.

## License

BeastieBuddy is proprietary software.
The source code is provided under the accompanying `LICENSE` file.
You may inspect the source and build BeastieBuddy for personal, non-commercial use. Redistribution, commercial use, sublicensing, and distribution of modified versions require prior written permission.

## Third-Party Services

BeastieBuddy may communicate with external services required for functionality, including the BeastieBuddy API and XIVAPI.
Those services are independent of this repository and may have their own terms, availability, and limitations.

## Final Fantasy XIV

BeastieBuddy is a third-party fan-made application and is not affiliated with or endorsed by Square Enix.
FINAL FANTASY XIV and related names and assets are trademarks and/or property of Square Enix Holdings Co., Ltd. and/or its affiliates.

## Disclaimer

BeastieBuddy is provided without warranty. Use it at your own risk.

The copyright holder is not responsible for problems resulting from the use, modification, or compilation of the software.
