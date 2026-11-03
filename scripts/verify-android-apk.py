"""Validate the installable Android artifact without exposing credentials."""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('apk')
parser.add_argument('--aapt')
parser.add_argument('--output')
args = parser.parse_args()
apk = pathlib.Path(args.apk)
with zipfile.ZipFile(apk) as archive:
    config = json.loads(archive.read('assets/capacitor.config.json'))
    assert config['appId'] == 'com.dimsumwaled.app', 'Incorrect Android application ID'
    assert config['appName'] == 'Dimsum Mentai Waled Premium', 'Incorrect application brand'
    assert config['server']['url'] == 'https://dimsumwaled.azzamcodex.dev/portal-karyawan', 'Incorrect production URL'
    assert config['server']['cleartext'] is False, 'HTTPS must be required'
    assert config['server']['errorPath'] == 'offline.html', 'Missing branded connection page'
    assert 'assets/public/offline.html' in archive.namelist(), 'Missing connection fallback asset'
    assert 'assets/public/logo.svg' in archive.namelist(), 'Missing local brand logo'
    assert not any(name.lower().endswith('.apk') for name in archive.namelist()), 'APK must not contain another APK'
    for name in archive.namelist():
        if name.startswith('assets/') and name.endswith(('.html', '.json', '.svg')):
            assert b'frozenmart.azzamcodex' not in archive.read(name), 'Legacy domain still embedded'

info = {
    'appName': config['appName'], 'applicationId': config['appId'],
    'serverUrl': config['server']['url'], 'bytes': apk.stat().st_size,
    'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
}
if args.aapt:
    badging = subprocess.check_output([args.aapt, 'dump', 'badging', str(apk)], text=True)
    package = re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging)
    label = re.search(r"application-label:'([^']+)'", badging)
    sdk = re.search(r"sdkVersion:'([^']+)'", badging)
    assert package and package.group(1) == 'com.dimsumwaled.app'
    assert package.group(2) == '2' and package.group(3) == '2.0.0', 'Incorrect APK version'
    assert label and label.group(1) == 'Dimsum Waled', 'Old Android launcher label'
    assert sdk and sdk.group(1) == '24', 'Unexpected minimum Android version'
    info.update({'launcherLabel': label.group(1), 'versionCode': int(package.group(2)),
                 'versionName': package.group(3), 'minSdk': int(sdk.group(1))})
if args.output:
    pathlib.Path(args.output).write_text(json.dumps(info, indent=2) + '\n', encoding='utf-8')
print(json.dumps(info))
